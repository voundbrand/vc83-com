/**
 * Microsoft OAuth Integration
 *
 * Handles OAuth flow for Microsoft accounts (Entra ID / Azure AD)
 * Supports both personal Microsoft accounts and work/school accounts
 */

import { action, mutation, query, internalMutation, internalQuery, internalAction } from "../_generated/server";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";
import { api, internal } from "../_generated/api";

// Microsoft OAuth endpoints
const MICROSOFT_AUTH_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/authorize";
const MICROSOFT_TOKEN_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/token";
const MICROSOFT_GRAPH_URL = "https://graph.microsoft.com/v1.0";

// Phase 1 scopes (basic profile + offline access)
const INITIAL_SCOPES = [
  "openid",
  "profile",
  "email",
  "offline_access",
  "User.Read",
  "Mail.Read", // Added for email sync
];

// Future scopes for Phase 3+
// const EXTENDED_SCOPES = [
//   "Calendars.Read",
//   "Files.Read.All",
//   "Sites.Read.All"
// ];

/**
 * Generate Microsoft OAuth authorization URL
 * User will be redirected to this URL to grant permissions
 */
export const initiateMicrosoftOAuth = mutation({
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
      provider: "microsoft",
      createdAt: Date.now(),
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
    });

    // Get redirect URI from environment
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/microsoft/callback`;

    // DEBUG: Log environment variables (will appear in Convex logs)
    console.log("OAuth Environment Check:", {
      hasClientId: !!process.env.MICROSOFT_CLIENT_ID,
      clientIdLength: process.env.MICROSOFT_CLIENT_ID?.length || 0,
      hasAppUrl: !!process.env.NEXT_PUBLIC_APP_URL,
      appUrl: process.env.NEXT_PUBLIC_APP_URL,
      redirectUri,
    });

    // Build OAuth URL
    const params = new URLSearchParams({
      client_id: process.env.MICROSOFT_CLIENT_ID || "",
      response_type: "code",
      redirect_uri: redirectUri,
      response_mode: "query",
      scope: INITIAL_SCOPES.join(" "),
      state,
    });

    const authUrl = `${MICROSOFT_AUTH_URL}?${params.toString()}`;

    // DEBUG: Log generated URL
    console.log("Generated OAuth URL:", authUrl);

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
export const handleMicrosoftCallback = action({
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
    } | null = await ctx.runQuery(internal.oauth.microsoft.verifyState, {
      state: args.state,
    });

    if (!stateRecord) {
      throw new Error("Invalid state token - possible CSRF attack");
    }

    // Exchange authorization code for tokens
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/microsoft/callback`;

    const tokenResponse = await fetch(MICROSOFT_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: process.env.MICROSOFT_CLIENT_ID || "",
        client_secret: process.env.MICROSOFT_CLIENT_SECRET || "",
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

    // Fetch user profile from Microsoft Graph
    const profileResponse = await fetch(`${MICROSOFT_GRAPH_URL}/me`, {
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
      plaintext: tokenData.refresh_token,
    });

    // Calculate token expiration
    const tokenExpiresAt = Date.now() + (tokenData.expires_in * 1000);

    // Store connection in database
    const connectionId: Id<"oauthConnections"> = await ctx.runMutation(internal.oauth.microsoft.storeConnection, {
      userId: stateRecord.connectionType === "personal" ? stateRecord.userId : undefined,
      organizationId: stateRecord.organizationId,
      provider: "microsoft",
      providerAccountId: profile.id,
      providerEmail: profile.userPrincipalName || profile.mail,
      connectionType: stateRecord.connectionType,
      accessToken: encryptedAccessToken,
      refreshToken: encryptedRefreshToken,
      tokenExpiresAt,
      scopes: INITIAL_SCOPES,
    });

    // Delete used state token
    await ctx.runMutation(internal.oauth.microsoft.deleteState, {
      state: args.state,
    });

    // Log audit event (only if organization exists)
    if (stateRecord.organizationId) {
      await ctx.runMutation(internal.rbac.logAudit, {
        userId: stateRecord.userId,
        organizationId: stateRecord.organizationId,
        action: "connect_oauth",
        resource: "oauth_connections",
        success: true,
        metadata: {
          provider: "microsoft",
          connectionType: stateRecord.connectionType,
          providerEmail: profile.userPrincipalName || profile.mail,
        },
      });
    }

    return {
      success: true,
      connectionId,
      providerEmail: profile.userPrincipalName || profile.mail,
    };
  },
});

/**
 * Disconnect Microsoft OAuth connection
 */
export const disconnectMicrosoft = mutation({
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

    // Get connection
    const connection = await ctx.db.get(args.connectionId);
    if (!connection) {
      throw new Error("Connection not found");
    }

    // Verify ownership
    if (connection.connectionType === "personal") {
      // Personal connections: user must own it
      if (connection.userId !== user._id) {
        throw new Error("Permission denied: not your connection");
      }
    } else {
      // Organizational connections: user must have manage_integrations permission
      const canManage = await ctx.runQuery(api.auth.canUserPerform, {
        sessionId: args.sessionId,
        permission: "manage_integrations",
        resource: "oauth",
        organizationId: connection.organizationId,
      });

      if (!canManage) {
        throw new Error("Permission denied: manage_integrations required");
      }
    }

    // Update connection status to revoked
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
        provider: connection.provider,
        connectionType: connection.connectionType,
      },
    });

    // TODO: Revoke token with Microsoft (requires separate API call)

    return {
      success: true,
      message: "Microsoft connection disconnected",
    };
  },
});

/**
 * Get user's Microsoft OAuth connection status
 */
export const getUserMicrosoftConnection = query({
  args: {
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!args.sessionId) {
      return null;
    }

    const session = await ctx.db.get(args.sessionId as Id<"sessions">);
    if (!session || session.expiresAt < Date.now()) {
      return null;
    }

    const user = await ctx.db.get(session.userId);
    if (!user || !user.defaultOrgId) {
      return null;
    }

    // Find user's personal Microsoft connection
    const connection = await ctx.db
      .query("oauthConnections")
      .withIndex("by_user_and_org", (q) =>
        q.eq("userId", user._id).eq("organizationId", user.defaultOrgId as Id<"organizations">)
      )
      .filter((q) => q.eq(q.field("provider"), "microsoft"))
      .filter((q) => q.neq(q.field("status"), "revoked"))
      .first();

    if (!connection) {
      return null;
    }

    return {
      id: connection._id,
      provider: connection.provider,
      providerEmail: connection.providerEmail,
      connectionType: connection.connectionType,
      status: connection.status,
      scopes: connection.scopes,
      syncSettings: connection.syncSettings,
      connectedAt: connection.connectedAt,
      lastSyncAt: connection.lastSyncAt,
      lastSyncError: connection.lastSyncError,
    };
  },
});

/**
 * Refresh expired Microsoft token
 */
export const refreshMicrosoftToken = internalAction({
  args: {
    connectionId: v.id("oauthConnections"),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    message: string;
  }> => {
    // Get connection
    const connection = await ctx.runQuery(internal.oauth.microsoft.getConnection, {
      connectionId: args.connectionId,
    });

    if (!connection) {
      throw new Error("Connection not found");
    }

    // Decrypt refresh token
    const refreshToken = await ctx.runAction(internal.oauth.encryption.decryptToken, {
      encrypted: connection.refreshToken,
    });

    // Exchange refresh token for new access token
    const tokenResponse = await fetch(MICROSOFT_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: process.env.MICROSOFT_CLIENT_ID || "",
        client_secret: process.env.MICROSOFT_CLIENT_SECRET || "",
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      let errorDetails;

      try {
        errorDetails = JSON.parse(errorText);
      } catch {
        errorDetails = { error_description: errorText };
      }

      // Common refresh token errors
      const errorCode = errorDetails.error;
      let userMessage = "Token refresh failed. Please reconnect your Microsoft account.";

      if (errorCode === "invalid_grant") {
        userMessage = "Your Microsoft account authorization has expired or been revoked. Please reconnect your account.";
      } else if (errorCode === "interaction_required") {
        userMessage = "Additional authentication is required. Please reconnect your Microsoft account.";
      } else if (errorCode === "consent_required") {
        userMessage = "Permission consent is required. Please reconnect your Microsoft account.";
      }

      // Update connection status to error
      await ctx.runMutation(internal.oauth.microsoft.updateConnectionStatus, {
        connectionId: args.connectionId,
        status: "error",
        error: userMessage,
      });

      throw new Error(userMessage);
    }

    const tokenData = await tokenResponse.json();

    // Encrypt new tokens
    const encryptedAccessToken = await ctx.runAction(internal.oauth.encryption.encryptToken, {
      plaintext: tokenData.access_token,
    });

    const encryptedRefreshToken = await ctx.runAction(internal.oauth.encryption.encryptToken, {
      plaintext: tokenData.refresh_token,
    });

    const tokenExpiresAt = Date.now() + (tokenData.expires_in * 1000);

    // Update connection with new tokens
    await ctx.runMutation(internal.oauth.microsoft.updateTokens, {
      connectionId: args.connectionId,
      accessToken: encryptedAccessToken,
      refreshToken: encryptedRefreshToken,
      tokenExpiresAt,
    });

    return {
      success: true,
      message: "Token refreshed successfully",
    };
  },
});

// ==================== INTERNAL HELPERS ====================

/**
 * Verify OAuth state token (internal query)
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
      .filter((q) => q.eq(q.field("state"), args.state))
      .first();

    if (!stateRecord) {
      return null;
    }

    if (stateRecord.expiresAt < Date.now()) {
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
 * Store OAuth connection (internal mutation)
 */
export const storeConnection = internalMutation({
  args: {
    userId: v.optional(v.id("users")),
    organizationId: v.id("organizations"),
    provider: v.string(),
    providerAccountId: v.string(),
    providerEmail: v.string(),
    connectionType: v.union(v.literal("personal"), v.literal("organizational")),
    accessToken: v.string(),
    refreshToken: v.string(),
    tokenExpiresAt: v.number(),
    scopes: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const connectionId = await ctx.db.insert("oauthConnections", {
      userId: args.userId,
      organizationId: args.organizationId,
      provider: args.provider as "microsoft",
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
    });

    return connectionId;
  },
});

/**
 * Delete OAuth state token (internal mutation)
 */
export const deleteState = internalMutation({
  args: {
    state: v.string(),
  },
  handler: async (ctx, args) => {
    const stateRecord = await ctx.db
      .query("oauthStates")
      .filter((q) => q.eq(q.field("state"), args.state))
      .first();

    if (stateRecord) {
      await ctx.db.delete(stateRecord._id);
    }
  },
});

/**
 * Get OAuth connection (internal query)
 */
export const getConnection = internalQuery({
  args: {
    connectionId: v.id("oauthConnections"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.connectionId);
  },
});

/**
 * Update connection tokens (internal mutation)
 */
export const updateTokens = internalMutation({
  args: {
    connectionId: v.id("oauthConnections"),
    accessToken: v.string(),
    refreshToken: v.string(),
    tokenExpiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.connectionId, {
      accessToken: args.accessToken,
      refreshToken: args.refreshToken,
      tokenExpiresAt: args.tokenExpiresAt,
      status: "active",
      updatedAt: Date.now(),
    });
  },
});

/**
 * Update connection status (internal mutation)
 */
export const updateConnectionStatus = internalMutation({
  args: {
    connectionId: v.id("oauthConnections"),
    status: v.union(v.literal("active"), v.literal("expired"), v.literal("revoked"), v.literal("error")),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.connectionId, {
      status: args.status,
      lastSyncError: args.error,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Update last sync timestamp (internal mutation)
 */
export const updateLastSync = internalMutation({
  args: {
    connectionId: v.id("oauthConnections"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.connectionId, {
      lastSyncAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});
