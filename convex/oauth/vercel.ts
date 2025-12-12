/**
 * Vercel OAuth Integration
 *
 * Handles OAuth flow for Vercel accounts
 * Used for deployment integrations (deploying to Vercel, managing projects)
 */

import { action, mutation, query, internalMutation, internalQuery } from "../_generated/server";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";
import { api, internal } from "../_generated/api";

// Vercel OAuth endpoints
const VERCEL_AUTH_URL = "https://vercel.com/oauth/authorize";
const VERCEL_TOKEN_URL = "https://api.vercel.com/v2/oauth/access_token";
const VERCEL_API_URL = "https://api.vercel.com";

// Vercel OAuth scopes for deployment
// See: https://vercel.com/docs/integrations/vercel-api-integrations#scopes
// Note: Vercel uses singular scope names (deployment, project, user, team)
const VERCEL_DEPLOYMENT_SCOPES = [
  "deployment",  // Read and write deployments
  "project",     // Read and write projects
  "user",        // Read user profile information
  "team",        // Read team information (for organization deployments)
];

/**
 * Generate Vercel OAuth authorization URL
 * User will be redirected to this URL to grant permissions
 */
export const initiateVercelOAuth = mutation({
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
      provider: "vercel",
      createdAt: Date.now(),
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
    });

    // Get redirect URI from environment
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/vercel/callback`;

    // DEBUG: Log environment variables (will appear in Convex logs)
    console.log("Vercel OAuth Environment Check:", {
      hasClientId: !!process.env.VERCEL_OAUTH_CLIENT_ID,
      clientIdLength: process.env.VERCEL_OAUTH_CLIENT_ID?.length || 0,
      hasAppUrl: !!process.env.NEXT_PUBLIC_APP_URL,
      appUrl: process.env.NEXT_PUBLIC_APP_URL,
      redirectUri,
    });

    // Build scope string
    const scopeString = VERCEL_DEPLOYMENT_SCOPES.join(" ");

    console.log("Vercel OAuth Scopes:", { scopes: VERCEL_DEPLOYMENT_SCOPES });

    // Build OAuth URL
    const params = new URLSearchParams({
      client_id: process.env.VERCEL_OAUTH_CLIENT_ID || "",
      redirect_uri: redirectUri,
      state: state,
      scope: scopeString,
    });

    const authUrl = `${VERCEL_AUTH_URL}?${params.toString()}`;

    console.log("Vercel OAuth URL generated:", {
      hasState: !!state,
      hasRedirect: !!redirectUri,
      urlLength: authUrl.length,
    });

    return {
      authUrl,
      state, // Return for client-side verification if needed
    };
  },
});

/**
 * Exchange authorization code for access token
 * Called by the callback endpoint after user authorizes
 */
export const exchangeVercelCode = action({
  args: {
    code: v.string(),
    state: v.string(),
    redirectUri: v.string(),
  },
  handler: async (ctx, args): Promise<{
    connectionId: Id<"oauthConnections">;
  }> => {
    console.log("Exchanging Vercel authorization code...");

    // Verify state token
    const stateRecord = await ctx.runQuery(internal.oauth.vercel.verifyState, {
      state: args.state,
    });

    if (!stateRecord) {
      throw new Error("Invalid or expired state token");
    }

    // Exchange code for access token
    const tokenResponse = await fetch(VERCEL_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: process.env.VERCEL_OAUTH_CLIENT_ID || "",
        client_secret: process.env.VERCEL_OAUTH_CLIENT_SECRET || "",
        code: args.code,
        redirect_uri: args.redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("Vercel token exchange failed:", {
        status: tokenResponse.status,
        error: errorText,
      });
      throw new Error(`Failed to exchange code for token: ${tokenResponse.status}`);
    }

    const tokenData = await tokenResponse.json();

    console.log("Vercel token exchange successful:", {
      hasAccessToken: !!tokenData.access_token,
      tokenType: tokenData.token_type,
      hasTeamId: !!tokenData.team_id,
    });

    // Get user info from Vercel API
    const userResponse = await fetch(`${VERCEL_API_URL}/v2/user`, {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    if (!userResponse.ok) {
      console.error("Failed to fetch Vercel user info:", {
        status: userResponse.status,
      });
      throw new Error("Failed to fetch user information from Vercel");
    }

    const userData = await userResponse.json();
    const vercelUser = userData.user;

    console.log("Vercel user info fetched:", {
      vercelId: vercelUser.id,
      username: vercelUser.username,
      email: vercelUser.email,
    });

    // Store connection in database
    const connectionId: Id<"oauthConnections"> = await ctx.runMutation(internal.oauth.vercel.storeConnection, {
      userId: stateRecord.userId,
      organizationId: stateRecord.organizationId,
      connectionType: stateRecord.connectionType,
      providerAccountId: vercelUser.id,
      providerEmail: vercelUser.email || vercelUser.username,
      accessToken: tokenData.access_token,
      // Vercel tokens don't expire, but we set a far future date
      tokenExpiresAt: Date.now() + (365 * 24 * 60 * 60 * 1000), // 1 year
      scopes: VERCEL_DEPLOYMENT_SCOPES,
      teamId: tokenData.team_id || null,
    });

    // Delete used state token
    await ctx.runMutation(internal.oauth.vercel.deleteState, {
      state: args.state,
    });

    console.log("Vercel connection stored successfully:", { connectionId });

    return { connectionId };
  },
});

/**
 * Internal: Verify state token
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

    // Check if expired
    if (stateRecord.expiresAt < Date.now()) {
      return null;
    }

    // Verify it's for Vercel
    if (stateRecord.provider !== "vercel") {
      return null;
    }

    return stateRecord;
  },
});

/**
 * Internal: Store OAuth connection
 */
export const storeConnection = internalMutation({
  args: {
    userId: v.id("users"),
    organizationId: v.id("organizations"),
    connectionType: v.union(v.literal("personal"), v.literal("organizational")),
    providerAccountId: v.string(),
    providerEmail: v.string(),
    accessToken: v.string(),
    tokenExpiresAt: v.number(),
    scopes: v.array(v.string()),
    teamId: v.union(v.string(), v.null()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Check for existing connection
    const existing = await ctx.db
      .query("oauthConnections")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .filter((q) => {
        const provider = q.field("provider");
        const providerAccountId = q.field("providerAccountId");
        return q.and(
          q.eq(provider, "vercel"),
          q.eq(providerAccountId, args.providerAccountId)
        );
      })
      .first();

    if (existing) {
      // Update existing connection
      await ctx.db.patch(existing._id, {
        accessToken: args.accessToken,
        refreshToken: "", // Vercel doesn't use refresh tokens
        tokenExpiresAt: args.tokenExpiresAt,
        scopes: args.scopes,
        status: "active",
        updatedAt: now,
        customProperties: {
          ...existing.customProperties,
          teamId: args.teamId,
        },
      });
      return existing._id;
    }

    // Create new connection
    const connectionId = await ctx.db.insert("oauthConnections", {
      userId: args.connectionType === "personal" ? args.userId : undefined,
      organizationId: args.organizationId,
      provider: "vercel",
      providerAccountId: args.providerAccountId,
      providerEmail: args.providerEmail,
      connectionType: args.connectionType,
      accessToken: args.accessToken,
      refreshToken: "", // Vercel doesn't use refresh tokens
      tokenExpiresAt: args.tokenExpiresAt,
      scopes: args.scopes,
      status: "active",
      connectedAt: now,
      lastSyncAt: now,
      updatedAt: now,
      customProperties: {
        teamId: args.teamId,
      },
      syncSettings: {
        email: false,
        calendar: false,
        oneDrive: false,
        sharePoint: false,
      },
    });

    return connectionId;
  },
});

/**
 * Internal: Delete state token after use
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
 * Disconnect Vercel OAuth connection
 */
export const disconnectVercel = mutation({
  args: {
    sessionId: v.string(),
    connectionId: v.id("oauthConnections"),
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

    // Get connection
    const connection = await ctx.db.get(args.connectionId);
    if (!connection) {
      throw new Error("Connection not found");
    }

    // Verify ownership
    if (connection.connectionType === "personal") {
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

    // Mark as revoked instead of deleting (for audit trail)
    await ctx.db.patch(args.connectionId, {
      status: "revoked",
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Get active Vercel connections for organization
 */
export const getVercelConnections = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    // Get current user from session
    const session = await ctx.db.get(args.sessionId as Id<"sessions">);
    if (!session || session.expiresAt < Date.now()) {
      throw new Error("Invalid or expired session");
    }

    const connections = await ctx.db
      .query("oauthConnections")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .filter((q) => {
        const provider = q.field("provider");
        const status = q.field("status");
        return q.and(
          q.eq(provider, "vercel"),
          q.eq(status, "active")
        );
      })
      .collect();

    return connections.map((conn) => ({
      _id: conn._id,
      providerEmail: conn.providerEmail,
      connectionType: conn.connectionType,
      createdAt: conn._creationTime,
      teamId: (conn.customProperties as any)?.teamId || null,
    }));
  },
});
