/**
 * Google OAuth Integration
 *
 * Handles OAuth flow for Google accounts
 * Supports both personal Google accounts and Google Workspace accounts
 */

import { action, mutation, query, internalMutation, internalQuery } from "../_generated/server";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";
import { api, internal } from "../_generated/api";

// Google OAuth endpoints
const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_API_URL = "https://www.googleapis.com/oauth2/v2";

// Google OAuth scopes for platform integration
const GOOGLE_REQUIRED_SCOPES = [
  "openid",
  "profile",
  "email",
];

/**
 * Generate Google OAuth authorization URL
 * User will be redirected to this URL to grant permissions
 */
export const initiateGoogleOAuth = mutation({
  args: {
    sessionId: v.string(),
    connectionType: v.union(v.literal("personal"), v.literal("organizational")),
    requestedScopes: v.optional(v.array(v.string())), // User-selected scopes
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
      provider: "google",
      createdAt: Date.now(),
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
    });

    // Get redirect URI from environment
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/google/callback`;

    // DEBUG: Log environment variables (will appear in Convex logs)
    console.log("Google OAuth Environment Check:", {
      hasClientId: !!process.env.GOOGLE_OAUTH_CLIENT_ID,
      clientIdLength: process.env.GOOGLE_OAUTH_CLIENT_ID?.length || 0,
      hasAppUrl: !!process.env.NEXT_PUBLIC_APP_URL,
      appUrl: process.env.NEXT_PUBLIC_APP_URL,
      redirectUri,
    });

    // Build scope string from required + requested scopes
    const requestedScopes = args.requestedScopes || [];
    const allScopes = [...new Set([...GOOGLE_REQUIRED_SCOPES, ...requestedScopes])];
    const scopeString = allScopes.join(" ");

    console.log("Google OAuth Scopes:", { requiredScopes: GOOGLE_REQUIRED_SCOPES, requestedScopes, allScopes });

    // Build OAuth URL
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_OAUTH_CLIENT_ID || "",
      response_type: "code",
      redirect_uri: redirectUri,
      scope: scopeString,
      state,
      access_type: "offline", // Request refresh token
      prompt: "consent", // Force consent screen to get refresh token
    });

    const authUrl = `${GOOGLE_AUTH_URL}?${params.toString()}`;

    // DEBUG: Log generated URL
    console.log("Generated Google OAuth URL:", authUrl);

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
export const handleGoogleCallback = action({
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
    } | null = await ctx.runQuery(internal.oauth.google.verifyState, {
      state: args.state,
    });

    if (!stateRecord) {
      throw new Error("Invalid state token - possible CSRF attack");
    }

    // Exchange authorization code for tokens
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/google/callback`;

    const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_OAUTH_CLIENT_ID || "",
        client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET || "",
        code: args.code,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      throw new Error(`Token exchange failed: ${errorText}`);
    }

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      throw new Error(`Google OAuth error: ${tokenData.error_description || tokenData.error}`);
    }

    // Fetch user profile from Google API
    const profileResponse = await fetch(`${GOOGLE_API_URL}/userinfo`, {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    if (!profileResponse.ok) {
      const errorText = await profileResponse.text();
      throw new Error(`Failed to fetch user profile: ${errorText}`);
    }

    const profile = await profileResponse.json();

    // Encrypt tokens before storage
    const encryptedAccessToken: string = await ctx.runAction(internal.oauth.encryption.encryptToken, {
      plaintext: tokenData.access_token,
    });

    const encryptedRefreshToken: string = await ctx.runAction(internal.oauth.encryption.encryptToken, {
      plaintext: tokenData.refresh_token || tokenData.access_token, // Use access token if no refresh token
    });

    // Calculate token expiration
    const tokenExpiresAt = Date.now() + (tokenData.expires_in * 1000);

    // Store connection in database
    const connectionId: Id<"oauthConnections"> = await ctx.runMutation(internal.oauth.google.storeConnection, {
      userId: stateRecord.connectionType === "personal" ? stateRecord.userId : undefined,
      organizationId: stateRecord.organizationId,
      provider: "google",
      providerAccountId: profile.id,
      providerEmail: profile.email,
      connectionType: stateRecord.connectionType,
      accessToken: encryptedAccessToken,
      refreshToken: encryptedRefreshToken,
      tokenExpiresAt,
      scopes: tokenData.scope ? tokenData.scope.split(" ") : GOOGLE_REQUIRED_SCOPES,
      metadata: {
        name: profile.name,
        picture: profile.picture,
        verified_email: profile.verified_email,
      },
    });

    // Delete used state token
    await ctx.runMutation(internal.oauth.google.deleteState, {
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
          provider: "google",
          connectionType: stateRecord.connectionType,
          providerEmail: profile.email,
        },
      });
    }

    return {
      success: true,
      connectionId,
      providerEmail: profile.email,
    };
  },
});

/**
 * Verify State (Internal Query)
 */
export const verifyState = internalQuery({
  args: {
    state: v.string(),
  },
  handler: async (ctx, args) => {
    const stateRecord = await ctx.db
      .query("oauthStates")
      .withIndex("by_state", (q) => q.eq("state", args.state))
      .first();

    if (!stateRecord) {
      return null;
    }

    // Check expiration
    if (stateRecord.expiresAt < Date.now()) {
      return null;
    }

    // Check provider
    if (stateRecord.provider !== "google") {
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
 * Store Connection (Internal Mutation)
 */
export const storeConnection = internalMutation({
  args: {
    userId: v.optional(v.id("users")),
    organizationId: v.id("organizations"),
    provider: v.literal("google"),
    providerAccountId: v.string(),
    providerEmail: v.string(),
    connectionType: v.union(v.literal("personal"), v.literal("organizational")),
    accessToken: v.string(),
    refreshToken: v.string(),
    tokenExpiresAt: v.number(),
    scopes: v.array(v.string()),
    metadata: v.any(),
  },
  handler: async (ctx, args) => {
    // Check if connection already exists
    const existing = await ctx.db
      .query("oauthConnections")
      .withIndex("by_org_and_provider", (q) =>
        q.eq("organizationId", args.organizationId).eq("provider", args.provider)
      )
      .filter((q) => {
        if (args.connectionType === "personal") {
          return q.eq(q.field("userId"), args.userId);
        } else {
          return q.eq(q.field("connectionType"), "organizational");
        }
      })
      .first();

    if (existing) {
      // Update existing connection
      await ctx.db.patch(existing._id, {
        providerAccountId: args.providerAccountId,
        providerEmail: args.providerEmail,
        accessToken: args.accessToken,
        refreshToken: args.refreshToken,
        tokenExpiresAt: args.tokenExpiresAt,
        scopes: args.scopes,
        customProperties: args.metadata, // Store metadata in customProperties
        status: "active",
        updatedAt: Date.now(),
      });
      return existing._id;
    }

    // Create new connection
    return await ctx.db.insert("oauthConnections", {
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
      customProperties: args.metadata, // Store metadata in customProperties
      status: "active",
      connectedAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

/**
 * Delete State (Internal Mutation)
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
 * Disconnect Google OAuth connection
 */
export const disconnectGoogle = mutation({
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
        provider: "google",
        connectionType: connection.connectionType,
        providerEmail: connection.providerEmail,
      },
    });

    return { success: true };
  },
});

/**
 * Get Google connection status for current user
 */
export const getGoogleConnectionStatus = query({
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

    if (!user.defaultOrgId) {
      return {
        personal: null,
        organizational: null,
      };
    }

    // Get personal connection
    const personalConnection = await ctx.db
      .query("oauthConnections")
      .withIndex("by_org_and_provider", (q) =>
        q.eq("organizationId", user.defaultOrgId!).eq("provider", "google")
      )
      .filter((q) => q.eq(q.field("userId"), user._id))
      .first();

    // Get organizational connection
    const orgConnection = await ctx.db
      .query("oauthConnections")
      .withIndex("by_org_and_provider", (q) =>
        q.eq("organizationId", user.defaultOrgId!).eq("provider", "google")
      )
      .filter((q) => q.eq(q.field("connectionType"), "organizational"))
      .first();

    return {
      personal: personalConnection
        ? {
            id: personalConnection._id,
            email: personalConnection.providerEmail,
            status: personalConnection.status,
            connectedAt: personalConnection.connectedAt,
          }
        : null,
      organizational: orgConnection
        ? {
            id: orgConnection._id,
            email: orgConnection.providerEmail,
            status: orgConnection.status,
            connectedAt: orgConnection.connectedAt,
          }
        : null,
    };
  },
});

