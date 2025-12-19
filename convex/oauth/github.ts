/**
 * GitHub OAuth Integration
 *
 * Handles OAuth flow for GitHub accounts
 * Used for deployment integrations (accessing repositories, managing deployments)
 */

import { action, mutation, query, internalMutation, internalQuery, internalAction } from "../_generated/server";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";
import { api, internal } from "../_generated/api";

// GitHub OAuth endpoints
const GITHUB_AUTH_URL = "https://github.com/login/oauth/authorize";
const GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token";
const GITHUB_API_URL = "https://api.github.com";

// GitHub OAuth scopes for deployment
// See: https://docs.github.com/apps/oauth-apps/building-oauth-apps/scopes-for-oauth-apps
const GITHUB_DEPLOYMENT_SCOPES = [
  "repo",        // Full control of private repositories (needed for deployment)
  "read:user",   // Read user profile data
  "user:email",  // Read user email addresses
];

/**
 * Generate GitHub OAuth authorization URL
 * User will be redirected to this URL to grant permissions
 */
export const initiateGitHubOAuth = mutation({
  args: {
    sessionId: v.string(),
    connectionType: v.union(v.literal("personal"), v.literal("organizational")),
  },
  handler: async (ctx, args) => {
    // Get current user from session
    const session = await ctx.db.get(args.sessionId as Id<"sessions">);
    if (!session || session.expiresAt < Date.now()) {
      throw new Error("Invalid or expired session");
    }

    const user = await ctx.db.get(session.userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Verify user has an organization
    if (!user.defaultOrgId) {
      throw new Error("User must belong to an organization");
    }

    // For organizational connections, verify user has manage_integrations permission
    if (args.connectionType === "organizational") {
      const canManage = await ctx.runQuery(api.auth.canUserPerform, {
        sessionId: args.sessionId,
        permission: "manage_integrations",
        resource: "oauth",
        organizationId: user.defaultOrgId,
      });

      if (!canManage) {
        throw new Error("Permission denied: manage_integrations required for organizational connections");
      }
    }

    // Generate CSRF state token
    const state = crypto.randomUUID();

    // Store state in database for verification (expires in 10 minutes)
    await ctx.db.insert("oauthStates", {
      state,
      userId: user._id,
      organizationId: user.defaultOrgId,
      connectionType: args.connectionType,
      provider: "github",
      createdAt: Date.now(),
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
    });

    // Get redirect URI from environment
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/github/callback`;

    // DEBUG: Log environment variables (will appear in Convex logs)
    console.log("GitHub OAuth Environment Check:", {
      hasClientId: !!process.env.GITHUB_INTEGRATION_CLIENT_ID,
      clientIdLength: process.env.GITHUB_INTEGRATION_CLIENT_ID?.length || 0,
      hasAppUrl: !!process.env.NEXT_PUBLIC_APP_URL,
      appUrl: process.env.NEXT_PUBLIC_APP_URL,
      redirectUri,
    });

    // Build scope string
    const scopeString = GITHUB_DEPLOYMENT_SCOPES.join(" ");

    console.log("GitHub OAuth Scopes:", { scopes: GITHUB_DEPLOYMENT_SCOPES });

    // Build OAuth URL
    const params = new URLSearchParams({
      client_id: process.env.GITHUB_INTEGRATION_CLIENT_ID || "",
      redirect_uri: redirectUri,
      scope: scopeString,
      state,
      allow_signup: "false", // Don't allow new GitHub account creation during OAuth
    });

    const authUrl = `${GITHUB_AUTH_URL}?${params.toString()}`;

    // DEBUG: Log generated URL
    console.log("Generated GitHub OAuth URL:", authUrl);

    return {
      authUrl,
      state,
      message: "Redirect user to authUrl to begin OAuth flow",
    };
  },
});

/**
 * Handle OAuth callback after user grants permission
 * Exchanges authorization code for tokens and stores them encrypted
 */
export const handleGitHubCallback = action({
  args: {
    code: v.string(),
    state: v.string(),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    connectionId: Id<"oauthConnections">;
    providerEmail: string;
  }> => {
    // Verify state token (CSRF protection)
    const stateRecord: {
      userId: Id<"users">;
      organizationId: Id<"organizations">;
      connectionType: "personal" | "organizational";
    } | null = await ctx.runQuery(internal.oauth.github.verifyState, {
      state: args.state,
    });

    if (!stateRecord) {
      throw new Error("Invalid state token - possible CSRF attack");
    }

    // Exchange authorization code for tokens
    const tokenResponse = await fetch(GITHUB_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json", // GitHub returns JSON when this header is present
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_INTEGRATION_CLIENT_ID || "",
        client_secret: process.env.GITHUB_INTEGRATION_CLIENT_SECRET || "",
        code: args.code,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      throw new Error(`Token exchange failed: ${errorText}`);
    }

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      throw new Error(`GitHub OAuth error: ${tokenData.error_description || tokenData.error}`);
    }

    // Fetch user profile from GitHub API
    const profileResponse = await fetch(`${GITHUB_API_URL}/user`, {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (!profileResponse.ok) {
      const errorText = await profileResponse.text();
      throw new Error(`Failed to fetch user profile: ${errorText}`);
    }

    const profile = await profileResponse.json();

    // Fetch user email if not public
    let userEmail = profile.email;
    if (!userEmail) {
      const emailsResponse = await fetch(`${GITHUB_API_URL}/user/emails`, {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          Accept: "application/vnd.github.v3+json",
        },
      });

      if (emailsResponse.ok) {
        const emails = await emailsResponse.json();
        const primaryEmail = emails.find((e: any) => e.primary);
        userEmail = primaryEmail?.email || emails[0]?.email || `${profile.login}@github.com`;
      } else {
        userEmail = `${profile.login}@github.com`;
      }
    }

    // Encrypt tokens before storage
    const encryptedAccessToken: string = await ctx.runAction(internal.oauth.encryption.encryptToken, {
      plaintext: tokenData.access_token,
    });

    // GitHub OAuth apps don't use refresh tokens - access tokens don't expire
    // We'll store the same token as "refresh" for schema compatibility
    const encryptedRefreshToken: string = encryptedAccessToken;

    // GitHub tokens don't expire, but we'll set a far future date for schema compatibility
    const tokenExpiresAt = Date.now() + (365 * 24 * 60 * 60 * 1000); // 1 year

    // Store connection in database
    const connectionId: Id<"oauthConnections"> = await ctx.runMutation(internal.oauth.github.storeConnection, {
      userId: stateRecord.connectionType === "personal" ? stateRecord.userId : undefined,
      organizationId: stateRecord.organizationId,
      provider: "github",
      providerAccountId: profile.id.toString(),
      providerEmail: userEmail,
      connectionType: stateRecord.connectionType,
      accessToken: encryptedAccessToken,
      refreshToken: encryptedRefreshToken,
      tokenExpiresAt,
      scopes: tokenData.scope ? tokenData.scope.split(",") : GITHUB_DEPLOYMENT_SCOPES,
      metadata: {
        login: profile.login,
        name: profile.name,
        avatarUrl: profile.avatar_url,
        htmlUrl: profile.html_url,
      },
    });

    // Delete used state token
    await ctx.runMutation(internal.oauth.github.deleteState, {
      state: args.state,
    });

    // Log audit event
    if (stateRecord.organizationId) {
      await ctx.runMutation(internal.rbac.logAudit, {
        userId: stateRecord.userId,
        organizationId: stateRecord.organizationId,
        action: "connect_oauth",
        resource: "oauth_connections",
        success: true,
        metadata: {
          provider: "github",
          connectionType: stateRecord.connectionType,
          providerEmail: userEmail,
          githubLogin: profile.login,
        },
      });
    }

    return {
      success: true,
      connectionId,
      providerEmail: userEmail,
    };
  },
});

/**
 * Disconnect GitHub OAuth connection
 */
export const disconnectGitHub = mutation({
  args: {
    sessionId: v.string(),
    connectionId: v.id("oauthConnections"),
  },
  handler: async (ctx, args) => {
    // Get current user
    const session = await ctx.db.get(args.sessionId as Id<"sessions">);
    if (!session || session.expiresAt < Date.now()) {
      throw new Error("Invalid or expired session");
    }

    const user = await ctx.db.get(session.userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Get connection to verify ownership
    const connection = await ctx.db.get(args.connectionId);
    if (!connection) {
      throw new Error("Connection not found");
    }

    // Verify user has permission to disconnect
    if (connection.connectionType === "personal") {
      // Personal connection: must be the owner
      if (connection.userId !== user._id) {
        throw new Error("Permission denied: can only disconnect your own personal connections");
      }
    } else {
      // Organizational connection: need manage_integrations permission
      const canManage = await ctx.runQuery(api.auth.canUserPerform, {
        sessionId: args.sessionId,
        permission: "manage_integrations",
        resource: "oauth",
        organizationId: connection.organizationId,
      });

      if (!canManage) {
        throw new Error("Permission denied: manage_integrations required to disconnect organizational connections");
      }
    }

    // Mark connection as revoked
    await ctx.db.patch(args.connectionId, {
      status: "revoked",
      updatedAt: Date.now(),
    });

    // Log audit event
    await ctx.runMutation(internal.rbac.logAudit, {
      userId: user._id,
      organizationId: connection.organizationId,
      action: "disconnect_oauth",
      resource: "oauth_connections",
      success: true,
      metadata: {
        provider: "github",
        connectionType: connection.connectionType,
        providerEmail: connection.providerEmail,
      },
    });

    return { success: true };
  },
});

/**
 * Get GitHub connection status for current user
 */
export const getGitHubConnectionStatus = query({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId as Id<"sessions">);
    if (!session || session.expiresAt < Date.now()) {
      return null;
    }

    const user = await ctx.db.get(session.userId);
    if (!user || !user.defaultOrgId) {
      return null;
    }

    // Check for active GitHub connection (personal or organizational)
    const connection = await ctx.db
      .query("oauthConnections")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", user.defaultOrgId as Id<"organizations">)
      )
      .filter((q) => q.eq(q.field("provider"), "github"))
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (!connection) {
      return {
        connected: false,
        connection: null,
      };
    }

    return {
      connected: true,
      connection: {
        id: connection._id,
        connectionType: connection.connectionType,
        providerEmail: connection.providerEmail,
        providerAccountId: connection.providerAccountId,
        scopes: connection.scopes,
        connectedAt: connection.connectedAt,
        metadata: connection.customProperties,
      },
    };
  },
});

/**
 * Get active GitHub access token (decrypted)
 * Internal use only - for making API calls to GitHub
 */
export const getGitHubAccessToken = internalAction({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args): Promise<string | null> => {
    // Find active GitHub connection for organization
    const connection = await ctx.runQuery(internal.oauth.github.getConnection, {
      organizationId: args.organizationId,
    });

    if (!connection) {
      return null;
    }

    // Decrypt access token
    const decryptedToken = await ctx.runAction(internal.oauth.encryption.decryptToken, {
      encrypted: connection.accessToken,
    });

    return decryptedToken;
  },
});

// ============================================================================
// INTERNAL HELPERS
// ============================================================================

/**
 * Verify OAuth state token (internal)
 */
export const verifyState = internalQuery({
  args: {
    state: v.string(),
  },
  handler: async (ctx, args): Promise<{
    userId: Id<"users">;
    organizationId: Id<"organizations">;
    connectionType: "personal" | "organizational";
  } | null> => {
    const stateRecord = await ctx.db
      .query("oauthStates")
      .withIndex("by_state", (q) => q.eq("state", args.state))
      .first();

    if (!stateRecord) {
      console.error("State token not found in database:", args.state);
      return null;
    }

    if (stateRecord.expiresAt < Date.now()) {
      console.error("State token expired:", {
        state: args.state,
        expiresAt: new Date(stateRecord.expiresAt),
        now: new Date(),
      });
      return null;
    }

    if (stateRecord.provider !== "github") {
      console.error("State token is for different provider:", stateRecord.provider);
      return null;
    }

    return {
      userId: stateRecord.userId,
      organizationId: stateRecord.organizationId,
      connectionType: stateRecord.connectionType,
    };
  },
});

/**
 * Store OAuth connection (internal)
 */
export const storeConnection = internalMutation({
  args: {
    userId: v.optional(v.id("users")),
    organizationId: v.id("organizations"),
    provider: v.literal("github"),
    providerAccountId: v.string(),
    providerEmail: v.string(),
    connectionType: v.union(v.literal("personal"), v.literal("organizational")),
    accessToken: v.string(),
    refreshToken: v.string(),
    tokenExpiresAt: v.number(),
    scopes: v.array(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    // Check if connection already exists for this user/org/provider
    let existingConnection = null;

    if (args.userId) {
      // Personal connection - check by user
      existingConnection = await ctx.db
        .query("oauthConnections")
        .withIndex("by_user_and_org", (q) =>
          q.eq("userId", args.userId).eq("organizationId", args.organizationId)
        )
        .filter((q) => q.eq(q.field("provider"), "github"))
        .first();
    } else {
      // Organizational connection - check by org
      existingConnection = await ctx.db
        .query("oauthConnections")
        .withIndex("by_organization", (q) =>
          q.eq("organizationId", args.organizationId)
        )
        .filter((q) => q.eq(q.field("provider"), "github"))
        .filter((q) => q.eq(q.field("connectionType"), "organizational"))
        .first();
    }

    // If connection exists, update it
    if (existingConnection) {
      await ctx.db.patch(existingConnection._id, {
        providerAccountId: args.providerAccountId,
        providerEmail: args.providerEmail,
        accessToken: args.accessToken,
        refreshToken: args.refreshToken,
        tokenExpiresAt: args.tokenExpiresAt,
        scopes: args.scopes,
        status: "active",
        customProperties: args.metadata,
        lastSyncAt: Date.now(),
        updatedAt: Date.now(),
      });

      return existingConnection._id;
    }

    // Create new connection
    const connectionId = await ctx.db.insert("oauthConnections", {
      userId: args.userId,
      organizationId: args.organizationId,
      provider: args.provider,
      providerAccountId: args.providerAccountId,
      providerEmail: args.providerEmail,
      connectionType: args.connectionType,
      accessToken: args.accessToken,
      refreshToken: args.refreshToken,
      tokenExpiresAt: args.tokenExpiresAt,
      scopes: args.scopes,
      syncSettings: {
        email: false,
        calendar: false,
        oneDrive: false,
        sharePoint: false,
      },
      status: "active",
      connectedAt: Date.now(),
      updatedAt: Date.now(),
      lastSyncAt: Date.now(),
      customProperties: args.metadata,
    });

    return connectionId;
  },
});

/**
 * Delete OAuth state token (internal)
 */
export const deleteState = internalMutation({
  args: {
    state: v.string(),
  },
  handler: async (ctx, args) => {
    const stateRecord = await ctx.db
      .query("oauthStates")
      .withIndex("by_state", (q) => q.eq("state", args.state))
      .first();

    if (stateRecord) {
      await ctx.db.delete(stateRecord._id);
    }
  },
});

/**
 * Get OAuth connection (internal)
 */
export const getConnection = internalQuery({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("oauthConnections")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .filter((q) => q.eq(q.field("provider"), "github"))
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();
  },
});
