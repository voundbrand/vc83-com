/**
 * CLI Authentication
 *
 * Handles CLI-specific authentication via browser OAuth flow.
 * Uses the SAME OAuth providers as platform login (Microsoft, Google, GitHub).
 * Creates the same account type - just with a CLI session instead of platform session.
 *
 * SECURITY MODEL (as of 2025-01):
 * - CLI session tokens are now bcrypt hashed (same security as API keys)
 * - Lookup by prefix (first 20 chars) for performance
 * - Full hash verification with bcrypt.compare()
 * - Full tokens are NEVER stored in database
 * - Backward compatibility: old plaintext tokens still work during migration
 */

import { v } from "convex/values";
import { action, query, mutation, internalMutation, internalQuery, internalAction } from "../../_generated/server";
import { Id } from "../../_generated/dataModel";
import { api, internal } from "../../_generated/api";
import { getLicenseInternal } from "../../licensing/helpers";

// Token prefix length for indexed lookup
const CLI_TOKEN_PREFIX_LENGTH = 20; // "cli_session_" (12) + 8 random chars

/**
 * Generate CLI session token
 * Format: cli_session_{32_random_bytes} (76 chars total)
 */
function generateCliSessionToken(): string {
  const randomBytes = new Uint8Array(32);
  crypto.getRandomValues(randomBytes);
  const randomString = Array.from(randomBytes, byte =>
    byte.toString(16).padStart(2, '0')
  ).join('');
  return `cli_session_${randomString}`;
}

/**
 * Get token prefix for indexed lookup
 */
function getTokenPrefix(token: string): string {
  return token.substring(0, CLI_TOKEN_PREFIX_LENGTH);
}

/**
 * CLI PERMISSION MAPPING BY ROLE
 *
 * Maps organization roles to granular permissions for MCP tool filtering.
 * The CLI uses these permissions to determine which tools to expose to AI assistants.
 *
 * Permission types:
 * - view_crm / manage_crm: CRM contacts and organizations
 * - view_events / manage_events: Events and attendees
 * - view_forms / manage_forms: Forms and responses
 * - view_products / manage_products: Products catalog
 * - view_tickets / manage_tickets: Support tickets
 * - view_applications / manage_applications: Connected apps (CLI apps, integrations)
 */
function getPermissionsForRole(roleName: string): string[] {
  const rolePermissions: Record<string, string[]> = {
    // Owner: Full access to everything including app management
    org_owner: [
      "view_crm", "manage_crm",
      "view_events", "manage_events",
      "view_forms", "manage_forms",
      "view_products", "manage_products",
      "view_tickets", "manage_tickets",
      "view_applications", "manage_applications",
    ],
    // Admin: Full access to data, can view but not manage applications
    admin: [
      "view_crm", "manage_crm",
      "view_events", "manage_events",
      "view_forms", "manage_forms",
      "view_products", "manage_products",
      "view_tickets", "manage_tickets",
      "view_applications",
    ],
    // Manager: Can manage most data
    manager: [
      "view_crm", "manage_crm",
      "view_events", "manage_events",
      "view_forms", "manage_forms",
      "view_products", "manage_products",
      "view_tickets", "manage_tickets",
    ],
    // Editor: Can manage most data (same as manager)
    editor: [
      "view_crm", "manage_crm",
      "view_events", "manage_events",
      "view_forms", "manage_forms",
      "view_products", "manage_products",
      "view_tickets", "manage_tickets",
    ],
    // Member: View-only access
    member: [
      "view_crm",
      "view_events",
      "view_forms",
      "view_products",
      "view_tickets",
    ],
    // Viewer: View-only access (same as member)
    viewer: [
      "view_crm",
      "view_events",
      "view_forms",
      "view_products",
      "view_tickets",
    ],
  };

  return rolePermissions[roleName] || rolePermissions.member;
}

/**
 * VERIFY CLI SESSION TOKEN (Internal Action)
 *
 * Verifies a CLI session token using bcrypt comparison.
 * Called by auth middleware for CLI session authentication.
 *
 * Security:
 * - Prefix lookup is fast (indexed)
 * - bcrypt.compare() takes ~50ms (acceptable for auth)
 * - Falls back to plaintext matching for backward compatibility
 *
 * @returns Session info or null if invalid
 */
export const verifyCliSessionToken = internalAction({
  args: {
    sessionToken: v.string(),
  },
  handler: async (ctx, args): Promise<{
    sessionId: Id<"cliSessions">;
    userId: Id<"users">;
    email: string;
    organizationId: Id<"organizations">;
    expiresAt: number;
  } | null> => {
    // Validate token format
    if (!args.sessionToken.startsWith("cli_session_")) {
      return null;
    }

    const tokenPrefix = getTokenPrefix(args.sessionToken);

    // First try: Look up by tokenPrefix (new bcrypt-hashed sessions)
    const hashedSessions = await ctx.runQuery(
      internal.api.v1.cliAuth.findCliSessionsByPrefix,
      { tokenPrefix }
    );

    if (hashedSessions && hashedSessions.length > 0) {
      // Import bcrypt for hash verification
      const bcrypt = await import("bcryptjs");

      for (const session of hashedSessions) {
        // Skip expired sessions
        if (session.expiresAt < Date.now()) {
          continue;
        }

        // Skip sessions without tokenHash (shouldn't happen due to query filter)
        if (!session.tokenHash) {
          continue;
        }

        // Verify hash with bcrypt (~50ms)
        const isValid = await bcrypt.default.compare(args.sessionToken, session.tokenHash);

        if (isValid) {
          // Update last used timestamp (async, don't block response)
          ctx.scheduler.runAfter(0, internal.api.v1.cliAuth.updateCliSessionLastUsed, {
            sessionId: session._id,
          });

          return {
            sessionId: session._id,
            userId: session.userId,
            email: session.email,
            organizationId: session.organizationId,
            expiresAt: session.expiresAt,
          };
        }
      }
    }

    // Fallback: Try plaintext lookup (backward compatibility for old sessions)
    const legacySession = await ctx.runQuery(
      internal.api.v1.cliAuth.findCliSessionByPlainToken,
      { cliToken: args.sessionToken }
    );

    if (legacySession && legacySession.expiresAt >= Date.now()) {
      // Update last used timestamp
      ctx.scheduler.runAfter(0, internal.api.v1.cliAuth.updateCliSessionLastUsed, {
        sessionId: legacySession._id,
      });

      return {
        sessionId: legacySession._id,
        userId: legacySession.userId,
        email: legacySession.email,
        organizationId: legacySession.organizationId,
        expiresAt: legacySession.expiresAt,
      };
    }

    return null;
  },
});

/**
 * Find CLI sessions by token prefix (Internal Query)
 */
export const findCliSessionsByPrefix = internalQuery({
  args: {
    tokenPrefix: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("cliSessions")
      .withIndex("by_token_prefix", (q) => q.eq("tokenPrefix", args.tokenPrefix))
      .filter((q) => q.neq(q.field("tokenHash"), undefined)) // Only hashed sessions
      .collect();
  },
});

/**
 * Find CLI session by plaintext token (Internal Query - backward compat)
 */
export const findCliSessionByPlainToken = internalQuery({
  args: {
    cliToken: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("cliSessions")
      .withIndex("by_token", (q) => q.eq("cliToken", args.cliToken))
      .first();
  },
});

/**
 * Update CLI session last used timestamp (Internal Mutation)
 */
export const updateCliSessionLastUsed = internalMutation({
  args: {
    sessionId: v.id("cliSessions"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, {
      lastUsedAt: Date.now(),
    });
  },
});

/**
 * Get Provider OAuth URL (Internal)
 * Returns OAuth authorization URL for the specified provider
 */
export const getProviderAuthUrl = internalAction({
  args: {
    provider: v.union(v.literal("microsoft"), v.literal("google"), v.literal("github")),
    state: v.string(),
    callbackUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/cli/callback`;

    if (args.provider === "github") {
      const githubAuthUrl = "https://github.com/login/oauth/authorize";
      const params = new URLSearchParams({
        client_id: process.env.GITHUB_OAUTH_CLIENT_ID || "",
        redirect_uri: redirectUri,
        scope: "read:user user:email",
        state: args.state,
        allow_signup: "false",
      });
      return `${githubAuthUrl}?${params.toString()}`;
    }

    if (args.provider === "microsoft") {
      // Use existing Microsoft OAuth flow
      const microsoftAuthUrl = "https://login.microsoftonline.com/common/oauth2/v2.0/authorize";
      const params = new URLSearchParams({
        client_id: process.env.MICROSOFT_CLIENT_ID || "",
        response_type: "code",
        redirect_uri: redirectUri,
        response_mode: "query",
        scope: "openid profile email",
        state: args.state,
      });
      return `${microsoftAuthUrl}?${params.toString()}`;
    }

    if (args.provider === "google") {
      // Use Google OAuth flow
      const googleAuthUrl = "https://accounts.google.com/o/oauth2/v2/auth";
      const params = new URLSearchParams({
        client_id: process.env.GOOGLE_OAUTH_CLIENT_ID || "",
        response_type: "code",
        redirect_uri: redirectUri,
        scope: "openid profile email",
        state: args.state,
      });
      return `${googleAuthUrl}?${params.toString()}`;
    }

    throw new Error(`Unsupported provider: ${args.provider}`);
  },
});

/**
 * Initiate CLI Login
 * 
 * Creates OAuth state and returns OAuth provider selection page or direct OAuth URL.
 * User will authenticate via browser with their preferred provider (Microsoft, Google, GitHub),
 * then callback will create CLI session (same account as platform login).
 */
export const initiateCliLogin = action({
  args: {
    callbackUrl: v.string(), // Where to redirect after OAuth (e.g., http://localhost:3001/callback)
    provider: v.optional(v.union(v.literal("microsoft"), v.literal("google"), v.literal("github"))), // Optional: specific provider
  },
  handler: async (ctx, args): Promise<{
    authUrl: string;
    state: string;
    provider: "microsoft" | "google" | "github" | null;
  }> => {
    // Generate CSRF state token
    const state = crypto.randomUUID();
    
    // Generate CLI session token (will be stored after OAuth completes)
    const cliToken = generateCliSessionToken();

    // Store state in database (expires in 10 minutes)
    await ctx.runMutation(internal.api.v1.cliAuth.storeCliLoginState, {
      state,
      cliToken,
      callbackUrl: args.callbackUrl,
      provider: args.provider, // undefined if not provided (matches schema)
      createdAt: Date.now(),
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
    });

    // If provider specified, return direct OAuth URL
    if (args.provider) {
      const authUrl: string = await ctx.runAction(internal.api.v1.cliAuth.getProviderAuthUrl, {
        provider: args.provider,
        state,
        callbackUrl: args.callbackUrl,
      });
      return { authUrl, state, provider: args.provider };
    }

    // Otherwise, return provider selection page URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const selectionUrl = `${appUrl}/auth/cli-login?state=${state}&callback=${encodeURIComponent(args.callbackUrl)}`;

    return {
      authUrl: selectionUrl,
      state,
      provider: null, // User will select
    };
  },
});

/**
 * Complete CLI Login
 * 
 * Called after user completes OAuth flow.
 * Exchanges code for user info, finds/creates user, and creates CLI session.
 * Uses the same account creation logic as platform signup.
 */
export const completeCliLogin = action({
  args: {
    state: v.string(),
    code: v.string(), // OAuth authorization code
    provider: v.union(v.literal("microsoft"), v.literal("google"), v.literal("github")),
  },
  handler: async (ctx, args): Promise<{
    token: string;
    sessionId: Id<"cliSessions">;
    userId: Id<"users">;
    email: string;
    organizationId: Id<"organizations">;
    expiresAt: number;
  }> => {
    // Verify state exists and is valid
    const stateRecord: {
      cliToken: string;
      callbackUrl: string;
      expiresAt: number;
      provider: string | null;
    } | null = await ctx.runQuery(internal.api.v1.cliAuth.getCliLoginStateInternal, {
      state: args.state,
    });

    if (!stateRecord) {
      throw new Error("Invalid or expired state token");
    }

    if (stateRecord.expiresAt < Date.now()) {
      throw new Error("State token expired");
    }

    // Exchange OAuth code for user info based on provider
    let userEmail: string;
    let userName: { firstName: string; lastName: string };

    if (args.provider === "github") {
      const userInfo = await ctx.runAction(internal.api.v1.cliAuth.exchangeGitHubCode, {
        code: args.code,
      });
      userEmail = userInfo.email;
      userName = userInfo.name;
    } else if (args.provider === "microsoft") {
      const userInfo = await ctx.runAction(internal.api.v1.cliAuth.exchangeMicrosoftCode, {
        code: args.code,
      });
      userEmail = userInfo.email;
      userName = userInfo.name;
    } else if (args.provider === "google") {
      const userInfo = await ctx.runAction(internal.api.v1.cliAuth.exchangeGoogleCode, {
        code: args.code,
      });
      userEmail = userInfo.email;
      userName = userInfo.name;
    } else {
      throw new Error(`Unsupported provider: ${args.provider}`);
    }

    // Find or create user by email (same logic as platform signup)
    const user = await ctx.runMutation(internal.api.v1.cliAuth.findOrCreateUser, {
      email: userEmail,
      firstName: userName.firstName,
      lastName: userName.lastName,
    });

    if (!user) {
      throw new Error("Failed to find or create user");
    }

    // Use organization from user or create default
    let organizationId: Id<"organizations">;
    if (user.defaultOrgId) {
      organizationId = user.defaultOrgId;
    } else {
      // Create default organization for user (same as platform signup)
      organizationId = await ctx.runMutation(internal.api.v1.cliAuth.createDefaultOrganization, {
        userId: user.userId,
        organizationName: `${userName.firstName}${userName.lastName ? ` ${userName.lastName}` : ''}'s Organization`,
      });
    }

    // Create CLI session (30 days expiration)
    // Note: createCliSession is now an Action (uses bcrypt for hashing)
    const cliToken = stateRecord.cliToken;
    const sessionId: Id<"cliSessions"> = await ctx.runAction(internal.api.v1.cliAuth.createCliSession, {
      userId: user.userId,
      email: userEmail,
      organizationId,
      cliToken,
      createdAt: Date.now(),
      expiresAt: Date.now() + (30 * 24 * 60 * 60 * 1000), // 30 days
    });

    // Clean up state record
    await ctx.runMutation(internal.api.v1.cliAuth.deleteCliLoginStateInternal, {
      state: args.state,
    });

    return {
      token: cliToken,
      sessionId,
      userId: user.userId,
      email: userEmail,
      organizationId,
      expiresAt: Date.now() + (30 * 24 * 60 * 60 * 1000),
    };
  },
});

/**
 * Exchange GitHub OAuth Code (Internal)
 */
export const exchangeGitHubCode = internalAction({
  args: {
    code: v.string(),
  },
  handler: async (ctx, args): Promise<{ email: string; name: { firstName: string; lastName: string } }> => {
    const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_OAUTH_CLIENT_ID || "",
        client_secret: process.env.GITHUB_OAUTH_CLIENT_SECRET || "",
        code: args.code,
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error(`GitHub token exchange failed: ${await tokenResponse.text()}`);
    }

    const tokenData = await tokenResponse.json();
    if (tokenData.error) {
      throw new Error(`GitHub OAuth error: ${tokenData.error_description || tokenData.error}`);
    }

    // Get user profile
    const profileResponse = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (!profileResponse.ok) {
      throw new Error(`Failed to fetch GitHub user profile: ${await profileResponse.text()}`);
    }

    const profile = await profileResponse.json();

    // Get email
    let email = profile.email;
    if (!email) {
      const emailsResponse = await fetch("https://api.github.com/user/emails", {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          Accept: "application/vnd.github.v3+json",
        },
      });

      if (emailsResponse.ok) {
        const emails = await emailsResponse.json() as Array<{ email: string; primary?: boolean; verified?: boolean }>;
        const primaryEmail = emails.find((e) => e.primary);
        email = primaryEmail?.email || emails[0]?.email || `${profile.login}@github.com`;
      } else {
        email = `${profile.login}@github.com`;
      }
    }

    // Parse name
    const nameParts = (profile.name || profile.login).split(' ');
    const firstName = nameParts[0] || profile.login;
    const lastName = nameParts.slice(1).join(' ') || '';

    return { email, name: { firstName, lastName } };
  },
});

/**
 * Exchange Microsoft OAuth Code (Internal)
 */
export const exchangeMicrosoftCode = internalAction({
  args: {
    code: v.string(),
  },
  handler: async (ctx, args): Promise<{ email: string; name: { firstName: string; lastName: string } }> => {
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/cli/callback`;
    const tokenResponse = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
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
      throw new Error(`Microsoft token exchange failed: ${await tokenResponse.text()}`);
    }

    const tokenData = await tokenResponse.json();

    // Get user profile from Microsoft Graph
    const profileResponse = await fetch("https://graph.microsoft.com/v1.0/me", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    if (!profileResponse.ok) {
      throw new Error(`Failed to fetch Microsoft user profile: ${await profileResponse.text()}`);
    }

    const profile = await profileResponse.json();

    // Parse name
    const nameParts = (profile.displayName || profile.userPrincipalName).split(' ');
    const firstName = nameParts[0] || profile.givenName || '';
    const lastName = nameParts.slice(1).join(' ') || profile.surname || '';

    return {
      email: profile.mail || profile.userPrincipalName,
      name: { firstName, lastName },
    };
  },
});

/**
 * Exchange Google OAuth Code (Internal)
 */
export const exchangeGoogleCode = internalAction({
  args: {
    code: v.string(),
  },
  handler: async (ctx, args): Promise<{ email: string; name: { firstName: string; lastName: string } }> => {
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/cli/callback`;
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
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
      throw new Error(`Google token exchange failed: ${await tokenResponse.text()}`);
    }

    const tokenData = await tokenResponse.json();

    // Get user profile from Google
    const profileResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    if (!profileResponse.ok) {
      throw new Error(`Failed to fetch Google user profile: ${await profileResponse.text()}`);
    }

    const profile = await profileResponse.json();

    // Parse name
    const nameParts = (profile.name || profile.email).split(' ');
    const firstName = nameParts[0] || profile.given_name || '';
    const lastName = nameParts.slice(1).join(' ') || profile.family_name || '';

    return {
      email: profile.email,
      name: { firstName, lastName },
    };
  },
});

/**
 * Validate CLI Session (Action)
 *
 * Validates a CLI session token and returns user info.
 * Enhanced to return organizationId and permissions for MCP tools.
 *
 * SECURITY: This is now an Action to support bcrypt hash verification.
 * Supports both new hashed tokens and legacy plaintext tokens for backward compat.
 */
export const validateCliSession = action({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args): Promise<{
    userId: Id<"users">;
    email: string;
    organizationId: Id<"organizations">;
    organizationName: string;
    permissions: string[];
    organizations: Array<{ id: Id<"organizations">; name: string; slug: string; role: string }>;
    expiresAt: number;
  } | null> => {
    // Use the internal verification action to validate the token
    const sessionInfo = await ctx.runAction(internal.api.v1.cliAuth.verifyCliSessionToken, {
      sessionToken: args.token,
    });

    if (!sessionInfo) {
      console.log(`[validateCliSession] Token verification failed`);
      return null;
    }

    // Get full user and organization info using internal query
    const fullInfo = await ctx.runQuery(internal.api.v1.cliAuth.getCliSessionFullInfo, {
      sessionId: sessionInfo.sessionId,
      userId: sessionInfo.userId,
      organizationId: sessionInfo.organizationId,
    });

    if (!fullInfo) {
      return null;
    }

    return {
      userId: sessionInfo.userId,
      email: sessionInfo.email,
      organizationId: fullInfo.organizationId,
      organizationName: fullInfo.organizationName,
      permissions: fullInfo.permissions,
      organizations: fullInfo.organizations,
      expiresAt: sessionInfo.expiresAt,
    };
  },
});

/**
 * Get CLI Session Full Info (Internal Query)
 * Gets organizations and permissions for a validated session
 */
export const getCliSessionFullInfo = internalQuery({
  args: {
    sessionId: v.id("cliSessions"),
    userId: v.id("users"),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args): Promise<{
    organizationId: Id<"organizations">;
    organizationName: string;
    permissions: string[];
    organizations: Array<{ id: Id<"organizations">; name: string; slug: string; role: string }>;
  } | null> => {
    // Get user info
    const user = await ctx.db.get(args.userId);
    if (!user) {
      return null;
    }

    // Get organizations with roles
    const memberships = await ctx.db
      .query("organizationMembers")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    const orgsWithRoles = await Promise.all(
      memberships.map(async (membership) => {
        const org = await ctx.db.get(membership.organizationId);
        const role = await ctx.db.get(membership.role);
        if (!org || !org.isActive) return null;
        return {
          id: org._id,
          name: org.name,
          slug: org.slug,
          role: role?.name || "member",
          isDefault: org._id === args.organizationId,
        };
      })
    );

    const validOrgs = orgsWithRoles.filter((org): org is NonNullable<typeof org> => org !== null);

    // Get the default/active organization
    const defaultOrg = validOrgs.find(o => o.isDefault) || validOrgs[0];

    if (!defaultOrg) {
      console.log(`[getCliSessionFullInfo] User ${args.userId} has no active organizations`);
      return null;
    }

    // Get permissions based on role
    const defaultOrgMembership = memberships.find(m => m.organizationId === defaultOrg.id);
    const role = defaultOrgMembership ? await ctx.db.get(defaultOrgMembership.role) : null;
    const roleName = role?.name || "member";

    // Define permissions based on role
    // These permissions are used by CLI MCP tools to filter which tools are exposed
    const permissions = getPermissionsForRole(roleName);

    return {
      organizationId: defaultOrg.id,
      organizationName: defaultOrg.name,
      permissions,
      organizations: validOrgs.map(org => ({
        id: org.id,
        name: org.name,
        slug: org.slug,
        role: org.role,
      })),
    };
  },
});

/**
 * Validate CLI Session (Internal Action)
 *
 * Internal version of validateCliSession for use in middleware.
 * Supports both hashed and legacy plaintext tokens.
 */
export const validateCliSessionInternal = internalAction({
  args: {
    sessionToken: v.string(),
  },
  handler: async (ctx, args): Promise<{
    userId: Id<"users">;
    email: string;
    organizationId: Id<"organizations">;
    organizationName: string;
    permissions: string[];
    organizations: Array<{ id: Id<"organizations">; name: string; slug: string; role: string }>;
    expiresAt: number;
  } | null> => {
    // Use the internal verification action to validate the token
    const sessionInfo = await ctx.runAction(internal.api.v1.cliAuth.verifyCliSessionToken, {
      sessionToken: args.sessionToken,
    });

    if (!sessionInfo) {
      return null;
    }

    // Get full user and organization info
    const fullInfo = await ctx.runQuery(internal.api.v1.cliAuth.getCliSessionFullInfo, {
      sessionId: sessionInfo.sessionId,
      userId: sessionInfo.userId,
      organizationId: sessionInfo.organizationId,
    });

    if (!fullInfo) {
      return null;
    }

    return {
      userId: sessionInfo.userId,
      email: sessionInfo.email,
      organizationId: fullInfo.organizationId,
      organizationName: fullInfo.organizationName,
      permissions: fullInfo.permissions,
      organizations: fullInfo.organizations,
      expiresAt: sessionInfo.expiresAt,
    };
  },
});

/**
 * Refresh CLI Session (Action)
 *
 * Refreshes an expired or soon-to-expire CLI session.
 * Now uses bcrypt hashing for the new token.
 */
export const refreshCliSession = action({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args): Promise<{
    token: string;
    expiresAt: number;
  }> => {
    // Verify current token using the internal action
    const sessionInfo = await ctx.runAction(internal.api.v1.cliAuth.verifyCliSessionToken, {
      sessionToken: args.token,
    });

    if (!sessionInfo) {
      throw new Error("Invalid session token");
    }

    // Generate new token
    const newToken = generateCliSessionToken();
    const newTokenPrefix = getTokenPrefix(newToken);
    const expiresAt = Date.now() + (30 * 24 * 60 * 60 * 1000); // 30 days

    // Hash with bcrypt
    const bcrypt = await import("bcryptjs");
    const newTokenHash = await bcrypt.default.hash(newToken, 12);

    // Update session with new hashed token
    await ctx.runMutation(internal.api.v1.cliAuth.updateCliSessionToken, {
      sessionId: sessionInfo.sessionId,
      tokenHash: newTokenHash,
      tokenPrefix: newTokenPrefix,
      expiresAt,
    });

    return {
      token: newToken,
      expiresAt,
    };
  },
});

/**
 * Update CLI Session Token (Internal Mutation)
 */
export const updateCliSessionToken = internalMutation({
  args: {
    sessionId: v.id("cliSessions"),
    tokenHash: v.string(),
    tokenPrefix: v.string(),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, {
      tokenHash: args.tokenHash,
      tokenPrefix: args.tokenPrefix,
      cliToken: undefined, // Clear legacy plaintext token
      expiresAt: args.expiresAt,
      lastUsedAt: Date.now(),
    });
  },
});

/**
 * Revoke CLI Session (Action)
 *
 * Revokes/deletes a CLI session. Used during logout.
 * Now uses bcrypt verification to find the session.
 */
export const revokeCliSession = action({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args): Promise<{ success: boolean }> => {
    const tokenPrefix = getTokenPrefix(args.token);
    console.log(`[revokeCliSession] Revoking session with token prefix: ${tokenPrefix}...`);

    // Verify token using the internal action to get session ID
    const sessionInfo = await ctx.runAction(internal.api.v1.cliAuth.verifyCliSessionToken, {
      sessionToken: args.token,
    });

    if (!sessionInfo) {
      console.log(`[revokeCliSession] No session found for token prefix: ${tokenPrefix}...`);
      // Return success even if not found - idempotent operation
      return { success: true };
    }

    console.log(`[revokeCliSession] Deleting session for user: ${sessionInfo.userId}`);
    await ctx.runMutation(internal.api.v1.cliAuth.deleteCliSession, {
      sessionId: sessionInfo.sessionId,
    });

    return { success: true };
  },
});

/**
 * Delete CLI Session (Internal Mutation)
 */
export const deleteCliSession = internalMutation({
  args: {
    sessionId: v.id("cliSessions"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.sessionId);
  },
});

/**
 * Store CLI Login State (Internal)
 */
export const storeCliLoginState = internalMutation({
  args: {
    state: v.string(),
    cliToken: v.string(),
    callbackUrl: v.string(),
    provider: v.optional(v.string()), // Optional string (undefined, not null)
    createdAt: v.number(),
    expiresAt: v.number(),
  },
  handler: async (ctx, args): Promise<void> => {
    await ctx.db.insert("cliLoginStates", {
      state: args.state,
      cliToken: args.cliToken,
      callbackUrl: args.callbackUrl,
      provider: args.provider, // undefined if not provided
      createdAt: args.createdAt,
      expiresAt: args.expiresAt,
    });
  },
});

/**
 * Get CLI Login State (Public - for email signup route)
 */
export const getCliLoginState = query({
  args: {
    state: v.string(),
  },
  handler: async (ctx, args): Promise<{
    _id: Id<"cliLoginStates">;
    state: string;
    cliToken: string;
    callbackUrl: string;
    createdAt: number;
    expiresAt: number;
    provider: string | null;
  } | null> => {
    const stateRecord = await ctx.db
      .query("cliLoginStates")
      .withIndex("by_state", (q) => q.eq("state", args.state))
      .first();
    
    if (!stateRecord) {
      return null;
    }

    // Check expiration
    if (stateRecord.expiresAt < Date.now()) {
      return null;
    }

    return {
      _id: stateRecord._id,
      state: stateRecord.state,
      cliToken: stateRecord.cliToken,
      callbackUrl: stateRecord.callbackUrl,
      createdAt: stateRecord.createdAt,
      expiresAt: stateRecord.expiresAt,
      provider: stateRecord.provider || null, // Convert undefined to null for return type
    };
  },
});

/**
 * Delete CLI Login State (Public - for email signup route)
 */
export const deleteCliLoginState = mutation({
  args: {
    state: v.string(),
  },
  handler: async (ctx, args): Promise<void> => {
    const stateRecord = await ctx.db
      .query("cliLoginStates")
      .withIndex("by_state", (q) => q.eq("state", args.state))
      .first();

    if (stateRecord) {
      await ctx.db.delete(stateRecord._id);
    }
  },
});

/**
 * Get CLI Login State (Internal - for use in actions)
 */
export const getCliLoginStateInternal = internalQuery({
  args: {
    state: v.string(),
  },
  handler: async (ctx, args): Promise<{
    _id: Id<"cliLoginStates">;
    state: string;
    cliToken: string;
    callbackUrl: string;
    createdAt: number;
    expiresAt: number;
    provider: string | null;
  } | null> => {
    const stateRecord = await ctx.db
      .query("cliLoginStates")
      .withIndex("by_state", (q) => q.eq("state", args.state))
      .first();
    
    if (!stateRecord) {
      return null;
    }

    return {
      _id: stateRecord._id,
      state: stateRecord.state,
      cliToken: stateRecord.cliToken,
      callbackUrl: stateRecord.callbackUrl,
      createdAt: stateRecord.createdAt,
      expiresAt: stateRecord.expiresAt,
      provider: stateRecord.provider || null, // Convert undefined to null for return type
    };
  },
});

/**
 * Delete CLI Login State (Internal - for use in actions)
 */
export const deleteCliLoginStateInternal = internalMutation({
  args: {
    state: v.string(),
  },
  handler: async (ctx, args): Promise<void> => {
    const stateRecord = await ctx.db
      .query("cliLoginStates")
      .withIndex("by_state", (q) => q.eq("state", args.state))
      .first();

    if (stateRecord) {
      await ctx.db.delete(stateRecord._id);
    }
  },
});

/**
 * Create CLI Session (Internal Action - hashes token with bcrypt)
 *
 * This is an Action (not Mutation) because bcrypt.hash() requires Node.js runtime.
 * Generates bcrypt hash of the token, then stores hash + prefix in database.
 */
export const createCliSession = internalAction({
  args: {
    userId: v.id("users"),
    email: v.string(),
    organizationId: v.id("organizations"),
    cliToken: v.string(),
    createdAt: v.number(),
    expiresAt: v.number(),
  },
  handler: async (ctx, args): Promise<Id<"cliSessions">> => {
    const tokenPrefix = getTokenPrefix(args.cliToken);
    console.log(`[createCliSession] Creating hashed session with token prefix: ${tokenPrefix}... for user: ${args.userId}`);

    // Hash with bcrypt (12 rounds = ~250ms, secure against brute force)
    const bcrypt = await import("bcryptjs");
    const tokenHash = await bcrypt.default.hash(args.cliToken, 12);

    // Store in database (via internal mutation)
    const sessionId = await ctx.runMutation(internal.api.v1.cliAuth.storeCliSession, {
      userId: args.userId,
      email: args.email,
      organizationId: args.organizationId,
      tokenHash,
      tokenPrefix,
      createdAt: args.createdAt,
      expiresAt: args.expiresAt,
    });

    console.log(`[createCliSession] Hashed session created with ID: ${sessionId}`);

    return sessionId;
  },
});

/**
 * Store CLI Session (Internal Mutation - stores hashed token)
 */
export const storeCliSession = internalMutation({
  args: {
    userId: v.id("users"),
    email: v.string(),
    organizationId: v.id("organizations"),
    tokenHash: v.string(),
    tokenPrefix: v.string(),
    createdAt: v.number(),
    expiresAt: v.number(),
  },
  handler: async (ctx, args): Promise<Id<"cliSessions">> => {
    // Note: We don't clean up existing sessions here anymore.
    // The CLI handles session management (logout/revoke) on its side.
    // This avoids race conditions where cleanup deletes newly created sessions.

    const sessionId = await ctx.db.insert("cliSessions", {
      userId: args.userId,
      email: args.email,
      organizationId: args.organizationId,
      // New hashed token storage
      tokenHash: args.tokenHash,
      tokenPrefix: args.tokenPrefix,
      // Keep cliToken undefined for new sessions (backward compat field)
      cliToken: undefined,
      createdAt: args.createdAt,
      expiresAt: args.expiresAt,
      lastUsedAt: args.createdAt,
    });

    return sessionId;
  },
});

/**
 * Get User By ID (Internal)
 */
export const getUserById = internalQuery({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args): Promise<{
    _id: Id<"users">;
    email: string;
    defaultOrgId?: Id<"organizations">;
  } | null> => {
    return await ctx.db.get(args.userId);
  },
});

/**
 * Find or Create User (Internal)
 * Finds user by email, or creates new user if not found
 * Uses same logic as platform signup
 */
export const findOrCreateUser = internalMutation({
  args: {
    email: v.string(),
    firstName: v.string(),
    lastName: v.string(),
  },
  handler: async (ctx, args): Promise<{
    userId: Id<"users">;
    defaultOrgId: Id<"organizations"> | undefined;
  }> => {
    // Normalize email
    const email = args.email.toLowerCase().trim();

    // Try to find existing user by email
    const existingUser = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", email))
      .first();

    if (existingUser) {
      return {
        userId: existingUser._id,
        defaultOrgId: existingUser.defaultOrgId,
      };
    }

    // Create new user (same as platform signup)
    const userId = await ctx.db.insert("users", {
      email,
      firstName: args.firstName,
      lastName: args.lastName,
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return {
      userId,
      defaultOrgId: undefined,
    };
  },
});

/**
 * Create CLI Session from Signup (Action)
 * Creates CLI session after email/password signup
 */
export const createCliSessionFromSignup = action({
  args: {
    userId: v.id("users"),
    email: v.string(),
    organizationId: v.id("organizations"),
    cliToken: v.string(),
  },
  handler: async (ctx, args): Promise<{
    sessionId: Id<"cliSessions">;
  }> => {
    // Note: createCliSession is now an Action (uses bcrypt for hashing)
    const sessionId = await ctx.runAction(internal.api.v1.cliAuth.createCliSession, {
      userId: args.userId,
      email: args.email,
      organizationId: args.organizationId,
      cliToken: args.cliToken,
      createdAt: Date.now(),
      expiresAt: Date.now() + (30 * 24 * 60 * 60 * 1000), // 30 days
    });

    return { sessionId };
  },
});

/**
 * Create Default Organization (Internal)
 * Creates a default organization for a user
 * Uses same logic as platform signup
 */
export const createDefaultOrganization = internalMutation({
  args: {
    userId: v.id("users"),
    organizationName: v.string(),
  },
  handler: async (ctx, args): Promise<Id<"organizations">> => {
    // Generate unique slug
    const baseSlug = args.organizationName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 50);

    let slug = baseSlug;
    let counter = 2;
    while (true) {
      const existing = await ctx.db
        .query("organizations")
        .withIndex("by_slug", (q) => q.eq("slug", slug))
        .first();

      if (!existing) {
        break;
      }

      slug = `${baseSlug}-${counter}`;
      counter++;

      if (counter > 1000) {
        slug = `${baseSlug}-${Math.floor(Math.random() * 100000)}`;
        break;
      }
    }

    // Create organization
    const organizationId = await ctx.db.insert("organizations", {
      name: args.organizationName,
      slug,
      businessName: args.organizationName,
      isPersonalWorkspace: true,
      isActive: true,
      email: (await ctx.db.get(args.userId))?.email || "",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Get or create org_owner role
    let ownerRole = await ctx.db
      .query("roles")
      .withIndex("by_name", (q) => q.eq("name", "org_owner"))
      .first();

    if (!ownerRole) {
      const ownerRoleId = await ctx.db.insert("roles", {
        name: "org_owner",
        description: "Organization owner with full permissions",
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      ownerRole = await ctx.db.get(ownerRoleId);
    }

    // Add user as organization owner
    await ctx.db.insert("organizationMembers", {
      userId: args.userId,
      organizationId,
      role: ownerRole!._id,
      isActive: true,
      joinedAt: Date.now(),
      acceptedAt: Date.now(),
      invitedBy: args.userId,
    });

    // Set as default organization
    await ctx.db.patch(args.userId, {
      defaultOrgId: organizationId,
      updatedAt: Date.now(),
    });

    return organizationId;
  },
});

// ============================================================================
// CLI ORGANIZATION FUNCTIONS
// ============================================================================

/**
 * Get Organizations for CLI User (Action)
 *
 * Returns all organizations the authenticated CLI user belongs to.
 * Uses CLI session token for authentication via bcrypt verification.
 */
export const getCliUserOrganizations = action({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args): Promise<{
    organizations: Array<{
      id: Id<"organizations">;
      name: string;
      slug: string;
      role: string;
    }>;
  } | null> => {
    // Verify token using bcrypt
    const sessionInfo = await ctx.runAction(internal.api.v1.cliAuth.verifyCliSessionToken, {
      sessionToken: args.token,
    });

    if (!sessionInfo) {
      console.log(`[getCliUserOrganizations] Token verification failed`);
      return null;
    }

    // Get organizations using internal query
    const orgsInfo = await ctx.runQuery(internal.api.v1.cliAuth.getUserOrganizationsInternal, {
      userId: sessionInfo.userId,
    });

    return orgsInfo;
  },
});

/**
 * Get User Organizations (Internal Query)
 */
export const getUserOrganizationsInternal = internalQuery({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args): Promise<{
    organizations: Array<{
      id: Id<"organizations">;
      name: string;
      slug: string;
      role: string;
    }>;
  }> => {
    // Get all organization memberships for this user
    const memberships = await ctx.db
      .query("organizationMembers")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    const organizations = await Promise.all(
      memberships.map(async (membership) => {
        const org = await ctx.db.get(membership.organizationId);
        const role = await ctx.db.get(membership.role);
        if (!org || !org.isActive) return null;
        return {
          id: org._id,
          name: org.name,
          slug: org.slug,
          role: role?.name || "member",
        };
      })
    );

    return {
      organizations: organizations.filter((org): org is NonNullable<typeof org> => org !== null),
    };
  },
});

/**
 * Create Organization for CLI User
 *
 * Creates a new organization for the authenticated CLI user.
 * Uses CLI session token for authentication.
 */
export const createCliOrganization = action({
  args: {
    token: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args): Promise<{
    id: Id<"organizations">;
    organizationId: Id<"organizations">;
    name: string;
    slug: string;
  }> => {
    // Validate session using bcrypt verification
    const sessionInfo = await ctx.runAction(internal.api.v1.cliAuth.verifyCliSessionToken, {
      sessionToken: args.token,
    });

    if (!sessionInfo) {
      throw new Error("Invalid or expired CLI session");
    }

    // Create the organization using internal mutation
    const organizationId = await ctx.runMutation(internal.api.v1.cliAuth.createCliOrganizationInternal, {
      userId: sessionInfo.userId,
      organizationName: args.name,
    });

    // Get the created organization to return slug
    const org = await ctx.runQuery(internal.api.v1.cliAuth.getOrganizationById, {
      organizationId,
    });

    if (!org) {
      throw new Error("Failed to create organization");
    }

    return {
      id: organizationId,
      organizationId, // For CLI compatibility
      name: org.name,
      slug: org.slug,
    };
  },
});

/**
 * Get Organization By ID (Internal)
 */
export const getOrganizationById = internalQuery({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.organizationId);
  },
});

/**
 * Create CLI Organization (Internal)
 *
 * Creates organization and adds user as owner.
 */
export const createCliOrganizationInternal = internalMutation({
  args: {
    userId: v.id("users"),
    organizationName: v.string(),
  },
  handler: async (ctx, args): Promise<Id<"organizations">> => {
    // Generate unique slug
    const baseSlug = args.organizationName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 50);

    let slug = baseSlug;
    let counter = 2;
    while (true) {
      const existing = await ctx.db
        .query("organizations")
        .withIndex("by_slug", (q) => q.eq("slug", slug))
        .first();

      if (!existing) {
        break;
      }

      slug = `${baseSlug}-${counter}`;
      counter++;

      if (counter > 1000) {
        slug = `${baseSlug}-${Math.floor(Math.random() * 100000)}`;
        break;
      }
    }

    // Get user email for organization
    const user = await ctx.db.get(args.userId);

    // Create organization
    const organizationId = await ctx.db.insert("organizations", {
      name: args.organizationName,
      slug,
      businessName: args.organizationName,
      isPersonalWorkspace: false,
      isActive: true,
      email: user?.email || "",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Get or create org_owner role
    let ownerRole = await ctx.db
      .query("roles")
      .withIndex("by_name", (q) => q.eq("name", "org_owner"))
      .first();

    if (!ownerRole) {
      const ownerRoleId = await ctx.db.insert("roles", {
        name: "org_owner",
        description: "Organization owner with full permissions",
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      ownerRole = await ctx.db.get(ownerRoleId);
    }

    // Add user as organization owner
    await ctx.db.insert("organizationMembers", {
      userId: args.userId,
      organizationId,
      role: ownerRole!._id,
      isActive: true,
      joinedAt: Date.now(),
      acceptedAt: Date.now(),
      invitedBy: args.userId,
    });

    return organizationId;
  },
});

// ============================================================================
// CLI API KEY FUNCTIONS
// ============================================================================

/**
 * Generate API Key for CLI User
 *
 * Creates an API key for the specified organization.
 * Uses CLI session token for authentication.
 */
export const generateCliApiKey = action({
  args: {
    token: v.string(),
    organizationId: v.id("organizations"),
    name: v.string(),
    scopes: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args): Promise<{
    key: string;
    apiKey: string; // For CLI compatibility
    id: Id<"apiKeys">;
    name: string;
    scopes: string[];
    createdAt: number;
  }> => {
    // Validate session using bcrypt verification
    const sessionInfo = await ctx.runAction(internal.api.v1.cliAuth.validateCliSessionInternal, {
      sessionToken: args.token,
    });

    if (!sessionInfo) {
      throw new Error("Invalid or expired CLI session");
    }

    // Verify user has access to the organization
    const hasAccess = sessionInfo.organizations.some((org: { id: Id<"organizations"> }) => org.id === args.organizationId);
    if (!hasAccess) {
      throw new Error("Not authorized: You don't have access to this organization");
    }

    // Check license limits
    const licenseCheck = await ctx.runQuery(internal.apiKeysInternal.checkApiKeyLimit, {
      organizationId: args.organizationId,
    });

    if (!licenseCheck.allowed) {
      throw new Error(licenseCheck.error || "API key limit reached");
    }

    // Use internal action to generate and hash the key (requires Node.js runtime)
    const result = await ctx.runAction(internal.api.v1.cliAuth.generateCliApiKeyInternal, {
      organizationId: args.organizationId,
      userId: sessionInfo.userId,
      name: args.name,
      scopes: args.scopes || ["*"],
    });

    return result;
  },
});

/**
 * Generate CLI API Key (Internal - Node.js runtime for bcrypt)
 */
export const generateCliApiKeyInternal = internalAction({
  args: {
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    name: v.string(),
    scopes: v.array(v.string()),
  },
  handler: async (ctx, args): Promise<{
    key: string;
    apiKey: string;
    id: Id<"apiKeys">;
    name: string;
    scopes: string[];
    createdAt: number;
  }> => {
    // Generate cryptographically secure API key
    const randomBytes = crypto.getRandomValues(new Uint8Array(32));
    const randomString = Array.from(randomBytes, byte =>
      byte.toString(16).padStart(2, '0')
    ).join('');
    const fullKey = `sk_live_${randomString}`;
    const keyPrefix = fullKey.substring(0, 12);

    // Hash with bcrypt - use dynamic import for Node.js runtime
    const bcrypt = await import("bcryptjs");
    const keyHash = await bcrypt.default.hash(fullKey, 12);

    // Store in database
    const apiKeyId = await ctx.runMutation(internal.apiKeysInternal.storeApiKey, {
      keyHash,
      keyPrefix,
      name: args.name,
      organizationId: args.organizationId,
      createdBy: args.userId,
      scopes: args.scopes,
      type: "simple",
    });

    return {
      key: fullKey,
      apiKey: fullKey, // For CLI compatibility
      id: apiKeyId,
      name: args.name,
      scopes: args.scopes,
      createdAt: Date.now(),
    };
  },
});

/**
 * List API Keys for CLI User
 *
 * Lists all API keys for the specified organization.
 * Uses CLI session token for authentication.
 * Returns keys without full key values (only preview).
 */
export const listCliApiKeys = query({
  args: {
    token: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args): Promise<{
    keys: Array<{
      id: Id<"apiKeys">;
      name: string;
      keyPreview: string;
      scopes: string[];
      status: string;
      createdAt: number;
      lastUsed?: number;
    }>;
    limit: number;
    currentCount: number;
  } | null> => {
    // Validate session
    const session = await ctx.db
      .query("cliSessions")
      .withIndex("by_token", (q) => q.eq("cliToken", args.token))
      .first();

    if (!session) {
      return null;
    }

    if (session.expiresAt < Date.now()) {
      return null;
    }

    // Verify user has access to the organization
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_user_and_org", (q) =>
        q.eq("userId", session.userId).eq("organizationId", args.organizationId)
      )
      .first();

    if (!membership || !membership.isActive) {
      return null;
    }

    // Get all API keys for organization
    const keys = await ctx.db
      .query("apiKeys")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .collect();

    // Get license limit
    const license = await getLicenseInternal(ctx, args.organizationId);
    const limit = license.limits.maxApiKeys;

    // Count active keys
    const activeKeys = keys.filter(k => k.status === "active");

    return {
      keys: keys.map(key => ({
        id: key._id,
        name: key.name,
        keyPreview: `${key.keyPrefix}...`,
        scopes: key.scopes,
        status: key.status,
        createdAt: key.createdAt,
        lastUsed: key.lastUsed,
      })),
      limit: limit === -1 ? -1 : limit, // -1 means unlimited
      currentCount: activeKeys.length,
    };
  },
});

// ============================================================================
// SYNC USER FUNCTIONS (for NextAuth integration)
// ============================================================================

/**
 * Sync External User (with API Key authentication)
 *
 * Called by customer's NextAuth integration to sync users to L4YERCAK3 backend.
 * This allows customer apps to authenticate via their own NextAuth and sync
 * those users to the platform.
 *
 * Note: This does NOT create full OAuth connections (those are for Microsoft 365
 * sync, etc.) - it just creates/updates the user record and ensures they're
 * a member of the organization.
 *
 * Authentication: API Key (Bearer token)
 */
export const syncExternalUser = action({
  args: {
    // API Key for authentication
    apiKey: v.string(),
    // User info from NextAuth
    email: v.string(),
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    // OAuth provider info (for tracking, not for creating oauthConnections)
    provider: v.string(),
    providerAccountId: v.string(),
    // These are passed but we don't store them (customer's app manages OAuth)
    accessToken: v.optional(v.string()),
    refreshToken: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<{
    userId: Id<"users">;
    organizationId: Id<"organizations">;
    isNewUser: boolean;
    email: string;
  }> => {
    // Verify API key using internal action
    const authContext = await ctx.runAction(internal.actions.apiKeys.verifyApiKey, {
      apiKey: args.apiKey,
    });

    if (!authContext) {
      throw new Error("Invalid or expired API key");
    }

    const organizationId = authContext.organizationId;

    // Check if user exists by email
    const existingUser = await ctx.runQuery(internal.api.v1.cliAuth.getUserByEmailInternal, {
      email: args.email,
    });

    let userId: Id<"users">;
    let isNewUser = false;

    if (existingUser) {
      userId = existingUser._id;

      // Ensure user is member of this organization
      const membership = await ctx.runQuery(internal.api.v1.cliAuth.checkOrgMembership, {
        userId,
        organizationId,
      });

      if (!membership) {
        // Add user to organization as viewer (lowest privilege for external sync)
        await ctx.runMutation(internal.api.v1.cliAuth.addUserToOrgAsViewer, {
          userId,
          organizationId,
        });
      }
    } else {
      // Create new user
      userId = await ctx.runMutation(internal.api.v1.cliAuth.createSyncedUser, {
        email: args.email,
        name: args.name,
        organizationId,
      });
      isNewUser = true;
    }

    return {
      userId,
      organizationId,
      isNewUser,
      email: args.email,
    };
  },
});

/**
 * Get User By Email (Internal)
 */
export const getUserByEmailInternal = internalQuery({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .first();
  },
});

/**
 * Check Organization Membership (Internal)
 */
export const checkOrgMembership = internalQuery({
  args: {
    userId: v.id("users"),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("organizationMembers")
      .withIndex("by_user_and_org", (q) =>
        q.eq("userId", args.userId).eq("organizationId", args.organizationId)
      )
      .first();
  },
});

/**
 * Add User to Organization as Viewer (Internal)
 */
export const addUserToOrgAsViewer = internalMutation({
  args: {
    userId: v.id("users"),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    // Get viewer role
    let viewerRole = await ctx.db
      .query("roles")
      .withIndex("by_name", (q) => q.eq("name", "viewer"))
      .first();

    if (!viewerRole) {
      // Create viewer role if it doesn't exist
      const roleId = await ctx.db.insert("roles", {
        name: "viewer",
        description: "Read-only access",
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      viewerRole = await ctx.db.get(roleId);
    }

    // Add membership
    await ctx.db.insert("organizationMembers", {
      userId: args.userId,
      organizationId: args.organizationId,
      role: viewerRole!._id,
      isActive: true,
      joinedAt: Date.now(),
      acceptedAt: Date.now(),
      invitedBy: args.userId, // Self-joined via sync
    });
  },
});

/**
 * Create Synced User (Internal)
 *
 * Creates a new user from external sync (NextAuth).
 * Does NOT create oauthConnections - customer's app manages OAuth tokens.
 */
export const createSyncedUser = internalMutation({
  args: {
    email: v.string(),
    name: v.optional(v.string()),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args): Promise<Id<"users">> => {
    // Parse name into first/last
    let firstName: string | undefined;
    let lastName: string | undefined;
    if (args.name) {
      const parts = args.name.split(" ");
      firstName = parts[0];
      lastName = parts.slice(1).join(" ") || undefined;
    }

    // Create user
    const userId = await ctx.db.insert("users", {
      email: args.email,
      firstName,
      lastName,
      defaultOrgId: args.organizationId,
      isPasswordSet: false, // Synced user, no password
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Get viewer role
    let viewerRole = await ctx.db
      .query("roles")
      .withIndex("by_name", (q) => q.eq("name", "viewer"))
      .first();

    if (!viewerRole) {
      const roleId = await ctx.db.insert("roles", {
        name: "viewer",
        description: "Read-only access",
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      viewerRole = await ctx.db.get(roleId);
    }

    // Add user to organization as viewer
    await ctx.db.insert("organizationMembers", {
      userId,
      organizationId: args.organizationId,
      role: viewerRole!._id,
      isActive: true,
      joinedAt: Date.now(),
      acceptedAt: Date.now(),
      invitedBy: userId, // Self-joined via sync
    });

    return userId;
  },
});
