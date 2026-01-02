/**
 * Unified OAuth Account Creation
 * 
 * Handles OAuth-based account creation and login for both Platform UI and CLI.
 * Supports Microsoft, Google, and GitHub OAuth providers.
 * 
 * This is separate from the OAuth connection flow (which connects external accounts
 * to existing platform accounts). This flow creates NEW accounts or logs into
 * existing accounts via OAuth.
 */

import { v } from "convex/values";
import { action, internalAction, internalMutation, internalQuery } from "../../_generated/server";
import { Id } from "../../_generated/dataModel";
import { internal } from "../../_generated/api";

/**
 * Exchange OAuth Code for User Info (Internal)
 * 
 * Handles provider-specific OAuth code exchange and returns user info.
 */
export const exchangeOAuthCode = internalAction({
  args: {
    provider: v.union(v.literal("microsoft"), v.literal("google"), v.literal("github")),
    code: v.string(),
    redirectUri: v.string(), // Different for platform vs CLI
  },
  handler: async (ctx, args): Promise<{ 
    email: string; 
    name: { firstName: string; lastName: string };
    providerAccountId?: string;
    accessToken?: string;
    refreshToken?: string;
    tokenExpiresAt?: number;
    scopes?: string[];
  }> => {
    if (args.provider === "github") {
      const clientId = process.env.GITHUB_OAUTH_CLIENT_ID;
      const clientSecret = process.env.GITHUB_OAUTH_CLIENT_SECRET;

      if (!clientId || !clientSecret) {
        throw new Error("GitHub OAuth not configured: GITHUB_OAUTH_CLIENT_ID or GITHUB_OAUTH_CLIENT_SECRET environment variables are not set");
      }

      const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
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

      return { 
        email, 
        name: { firstName, lastName },
        providerAccountId: profile.id?.toString(),
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        tokenExpiresAt: tokenData.expires_in ? Date.now() + (tokenData.expires_in * 1000) : undefined,
        scopes: tokenData.scope ? tokenData.scope.split(' ') : undefined,
      };
    }

    if (args.provider === "microsoft") {
      const clientId = process.env.MICROSOFT_CLIENT_ID;
      const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;

      if (!clientId || !clientSecret) {
        throw new Error("Microsoft OAuth not configured: MICROSOFT_CLIENT_ID or MICROSOFT_CLIENT_SECRET environment variables are not set");
      }

      const tokenResponse = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code: args.code,
          redirect_uri: args.redirectUri,
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
        providerAccountId: profile.id,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        tokenExpiresAt: tokenData.expires_in ? Date.now() + (tokenData.expires_in * 1000) : undefined,
        scopes: tokenData.scope ? tokenData.scope.split(' ') : undefined,
      };
    }

    if (args.provider === "google") {
      const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;

      if (!clientId || !clientSecret) {
        throw new Error("Google OAuth not configured: GOOGLE_OAUTH_CLIENT_ID or GOOGLE_OAUTH_CLIENT_SECRET environment variables are not set");
      }

      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code: args.code,
          redirect_uri: args.redirectUri,
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
        providerAccountId: profile.id,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        tokenExpiresAt: tokenData.expires_in ? Date.now() + (tokenData.expires_in * 1000) : undefined,
        scopes: tokenData.scope ? tokenData.scope.split(' ') : undefined,
      };
    }

    throw new Error(`Unsupported provider: ${args.provider}`);
  },
});

/**
 * Find or Create User from OAuth (Internal)
 * 
 * Finds existing user by email or creates a new user account.
 * Returns user ID and default organization ID.
 */
export const findOrCreateUserFromOAuth = internalMutation({
  args: {
    email: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    organizationName: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{
    userId: Id<"users">;
    organizationId: Id<"organizations">;
    isNewUser: boolean;
  }> => {
    // Normalize email
    const email = args.email.toLowerCase().trim();

    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", email))
      .first();

    if (existingUser) {
      // User exists - return their info
      if (!existingUser.defaultOrgId) {
        throw new Error("User exists but has no default organization");
      }
      return {
        userId: existingUser._id,
        organizationId: existingUser.defaultOrgId,
        isNewUser: false,
      };
    }

    // Create new user (reuse onboarding logic)
    const userId = await ctx.db.insert("users", {
      email,
      firstName: args.firstName,
      lastName: args.lastName,
      isPasswordSet: false, // OAuth users don't have passwords
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Create default organization
    const orgName = args.organizationName || `${args.firstName}${args.lastName ? ` ${args.lastName}` : ''}'s Organization`;
    
    // Generate unique slug
    let baseSlug = orgName
      .toLowerCase()
      .replace(/'/g, '')
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 50);
    
    if (!baseSlug) {
      baseSlug = "organization";
    }

    let slug = baseSlug;
    let counter = 2;
    while (true) {
      const existing = await ctx.db
        .query("organizations")
        .withIndex("by_slug", (q) => q.eq("slug", slug))
        .first();
      
      if (!existing) break;
      slug = `${baseSlug}-${counter}`;
      counter++;
      if (counter > 1000) {
        const randomSuffix = Math.floor(Math.random() * 100000);
        slug = `${baseSlug}-${randomSuffix}`;
        break;
      }
    }

    const organizationId = await ctx.db.insert("organizations", {
      name: orgName,
      slug,
      businessName: orgName,
      isPersonalWorkspace: true,
      isActive: true,
      email,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Set as default organization
    await ctx.db.patch(userId, {
      defaultOrgId: organizationId,
      updatedAt: Date.now(),
    });

    // Get or create org_owner role
    let ownerRole = await ctx.db
      .query("roles")
      .filter((q) => q.eq(q.field("name"), "org_owner"))
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
      userId,
      organizationId,
      role: ownerRole!._id,
      isActive: true,
      joinedAt: Date.now(),
      acceptedAt: Date.now(),
      invitedBy: userId,
    });

    // Initialize organization storage
    await ctx.db.insert("organizationStorage", {
      organizationId,
      totalSizeBytes: 0,
      totalSizeGB: 0,
      fileCount: 0,
      byCategoryBytes: {},
      lastCalculated: Date.now(),
      updatedAt: Date.now(),
    });

    // Initialize user storage quota
    await ctx.db.insert("userStorageQuotas", {
      organizationId,
      userId,
      storageUsedBytes: 0,
      fileCount: 0,
      isEnforced: true,
      storageLimitBytes: 250 * 1024 * 1024, // 250 MB for Free tier
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Initialize API settings
    await ctx.db.insert("objects", {
      organizationId,
      type: "organization_settings",
      subtype: "api",
      name: "API Settings",
      status: "active",
      customProperties: {
        apiKeysEnabled: true,
      },
      createdBy: userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // TODO: Create API key, assign apps, provision templates (reuse onboarding logic)
    // For now, we'll skip these to keep this focused on OAuth signup

    return {
      userId,
      organizationId,
      isNewUser: true,
    };
  },
});

/**
 * Complete OAuth Signup
 * 
 * Unified endpoint for OAuth-based account creation/login.
 * Works for both Platform UI and CLI (determined by sessionType).
 * 
 * @param sessionType - "platform" creates platform session, "cli" creates CLI session
 * @param provider - OAuth provider (microsoft, google, github)
 * @param code - OAuth authorization code
 * @param state - CSRF state token (from oauthSignupStates table)
 */
export const completeOAuthSignup = action({
  args: {
    sessionType: v.union(v.literal("platform"), v.literal("cli")),
    provider: v.union(v.literal("microsoft"), v.literal("google"), v.literal("github")),
    code: v.string(),
    state: v.string(),
  },
  handler: async (ctx, args): Promise<{
    token: string;
    sessionId: Id<"sessions"> | Id<"cliSessions">;
    userId: Id<"users">;
    email: string;
    organizationId: Id<"organizations">;
    expiresAt: number;
    isNewUser: boolean;
    provider: "microsoft" | "google" | "github";
  }> => {
    // Get state record (contains callback URL and other metadata)
    const stateRecord = await ctx.runQuery(internal.api.v1.oauthSignup.getOAuthSignupStateInternal, {
      state: args.state,
    }) as {
      sessionType: "platform" | "cli";
      callbackUrl: string;
      provider: "microsoft" | "google" | "github";
      organizationName?: string;
      cliToken?: string;
      expiresAt: number;
    } | null;

    if (!stateRecord) {
      throw new Error("Invalid or expired state token");
    }

    if (stateRecord.expiresAt < Date.now()) {
      throw new Error("State token expired");
    }

    // Use unified callback URL for all OAuth providers
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/oauth/callback`;

    // Exchange OAuth code for user info
    const userInfo = await ctx.runAction(internal.api.v1.oauthSignup.exchangeOAuthCode, {
      provider: args.provider,
      code: args.code,
      redirectUri,
    });

    // Find or create user
    const userResult = await ctx.runMutation(internal.api.v1.oauthSignup.findOrCreateUserFromOAuth, {
      email: userInfo.email,
      firstName: userInfo.name.firstName,
      lastName: userInfo.name.lastName,
      organizationName: stateRecord.organizationName,
    });

    // Create session based on sessionType
    if (args.sessionType === "cli") {
      // Create CLI session
      const cliToken = stateRecord.cliToken || `cli_session_${crypto.randomUUID().replace(/-/g, '')}`;
      const sessionId = await ctx.runMutation(internal.api.v1.cliAuth.createCliSession, {
        userId: userResult.userId,
        email: userInfo.email,
        organizationId: userResult.organizationId,
        cliToken,
        createdAt: Date.now(),
        expiresAt: Date.now() + (30 * 24 * 60 * 60 * 1000), // 30 days
      });

      // Clean up state
      await ctx.runMutation(internal.api.v1.oauthSignup.deleteOAuthSignupState, {
        state: args.state,
      });

      return {
        token: cliToken,
        sessionId,
        userId: userResult.userId,
        email: userInfo.email,
        organizationId: userResult.organizationId,
        expiresAt: Date.now() + (30 * 24 * 60 * 60 * 1000),
        isNewUser: userResult.isNewUser,
        provider: args.provider, // Return provider for "last used" tracking
      };
    } else {
      // Create platform session
      const sessionId = await ctx.runMutation(internal.api.v1.oauthSignup.createPlatformSession, {
        userId: userResult.userId,
        email: userInfo.email,
        organizationId: userResult.organizationId,
      });

      // Store OAuth connection for platform users (so they can use it for integrations)
      // Only store if we have token information
      if (userInfo.accessToken && userInfo.providerAccountId) {
        try {
          // Encrypt tokens before storage
          const encryptedAccessToken = await ctx.runAction(internal.oauth.encryption.encryptToken, {
            plaintext: userInfo.accessToken,
          });
          
          const encryptedRefreshToken = userInfo.refreshToken
            ? await ctx.runAction(internal.oauth.encryption.encryptToken, {
                plaintext: userInfo.refreshToken,
              })
            : encryptedAccessToken; // Use access token if no refresh token

          const tokenExpiresAt = userInfo.tokenExpiresAt || Date.now() + (3600 * 1000); // Default 1 hour
          const scopes = userInfo.scopes || (args.provider === "github" ? ["read:user", "user:email"] : ["openid", "profile", "email"]);

          // Store connection using provider-specific mutation
          if (args.provider === "google") {
            await ctx.runMutation(internal.oauth.google.storeConnection, {
              userId: userResult.userId,
              organizationId: userResult.organizationId,
              provider: "google",
              providerAccountId: userInfo.providerAccountId || "",
              providerEmail: userInfo.email,
              connectionType: "personal",
              accessToken: encryptedAccessToken,
              refreshToken: encryptedRefreshToken,
              tokenExpiresAt,
              scopes,
              metadata: {}, // Store empty metadata for now
            });
          } else if (args.provider === "microsoft") {
            await ctx.runMutation(internal.oauth.microsoft.storeConnection, {
              userId: userResult.userId,
              organizationId: userResult.organizationId,
              provider: "microsoft",
              providerAccountId: userInfo.providerAccountId || "",
              providerEmail: userInfo.email,
              connectionType: "personal",
              accessToken: encryptedAccessToken,
              refreshToken: encryptedRefreshToken,
              tokenExpiresAt,
              scopes,
            });
          } else if (args.provider === "github") {
            await ctx.runMutation(internal.oauth.github.storeConnection, {
              userId: userResult.userId,
              organizationId: userResult.organizationId,
              provider: "github",
              providerAccountId: userInfo.providerAccountId || "",
              providerEmail: userInfo.email,
              connectionType: "personal",
              accessToken: encryptedAccessToken,
              refreshToken: encryptedRefreshToken,
              tokenExpiresAt,
              scopes,
              metadata: {}, // Store empty metadata for now
            });
          }
        } catch (error) {
          // Log error but don't fail the signup/login flow
          console.error(`Failed to store OAuth connection for ${args.provider}:`, error);
          // Continue with session creation even if connection storage fails
        }
      }

      // Clean up state
      await ctx.runMutation(internal.api.v1.oauthSignup.deleteOAuthSignupState, {
        state: args.state,
      });

      return {
        token: sessionId, // Platform sessions use session ID as token
        sessionId,
        userId: userResult.userId,
        email: userInfo.email,
        organizationId: userResult.organizationId,
        expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
        isNewUser: userResult.isNewUser,
        provider: args.provider, // Return provider for "last used" tracking
      };
    }
  },
});

/**
 * Create Platform Session (Internal)
 */
export const createPlatformSession = internalMutation({
  args: {
    userId: v.id("users"),
    email: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args): Promise<Id<"sessions">> => {
    const sessionId = await ctx.db.insert("sessions", {
      userId: args.userId,
      email: args.email,
      organizationId: args.organizationId,
      createdAt: Date.now(),
      expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
    });
    return sessionId;
  },
});

/**
 * Store OAuth Signup State (Public Action)
 * 
 * Public action wrapper for storing OAuth signup state.
 * Called from Next.js API routes.
 */
export const storeOAuthSignupState = action({
  args: {
    state: v.string(),
    sessionType: v.union(v.literal("platform"), v.literal("cli")),
    callbackUrl: v.string(),
    provider: v.union(v.literal("microsoft"), v.literal("google"), v.literal("github")),
    organizationName: v.optional(v.string()),
    cliToken: v.optional(v.string()), // Only for CLI sessions
    createdAt: v.number(),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.runMutation(internal.api.v1.oauthSignup.storeOAuthSignupStateInternal, {
      state: args.state,
      sessionType: args.sessionType,
      callbackUrl: args.callbackUrl,
      provider: args.provider,
      organizationName: args.organizationName,
      cliToken: args.cliToken,
      createdAt: args.createdAt,
      expiresAt: args.expiresAt,
    });
  },
});

/**
 * Store OAuth Signup State (Internal)
 * 
 * Stores temporary state for OAuth signup flow (CSRF protection).
 */
export const storeOAuthSignupStateInternal = internalMutation({
  args: {
    state: v.string(),
    sessionType: v.union(v.literal("platform"), v.literal("cli")),
    callbackUrl: v.string(),
    provider: v.union(v.literal("microsoft"), v.literal("google"), v.literal("github")),
    organizationName: v.optional(v.string()),
    cliToken: v.optional(v.string()), // Only for CLI sessions
    createdAt: v.number(),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("oauthSignupStates", {
      state: args.state,
      sessionType: args.sessionType,
      callbackUrl: args.callbackUrl,
      provider: args.provider,
      organizationName: args.organizationName,
      cliToken: args.cliToken,
      createdAt: args.createdAt,
      expiresAt: args.expiresAt,
    });
  },
});

/**
 * Get OAuth Signup State (Public Action)
 * 
 * Public action wrapper for retrieving OAuth signup state.
 * Called from Next.js API routes.
 */
export const getOAuthSignupState = action({
  args: {
    state: v.string(),
  },
  handler: async (ctx, args): Promise<{
    sessionType: "platform" | "cli";
    callbackUrl: string;
    provider: "microsoft" | "google" | "github";
    organizationName?: string;
    cliToken?: string;
    expiresAt: number;
  } | null> => {
    return await ctx.runQuery(internal.api.v1.oauthSignup.getOAuthSignupStateInternal, {
      state: args.state,
    });
  },
});

/**
 * Get OAuth Signup State (Internal)
 */
export const getOAuthSignupStateInternal = internalQuery({
  args: {
    state: v.string(),
  },
  handler: async (ctx, args) => {
    const stateRecord = await ctx.db
      .query("oauthSignupStates")
      .withIndex("by_state", (q) => q.eq("state", args.state))
      .first();
    
    if (!stateRecord) {
      return null;
    }

    return {
      sessionType: stateRecord.sessionType,
      callbackUrl: stateRecord.callbackUrl,
      provider: stateRecord.provider,
      organizationName: stateRecord.organizationName,
      cliToken: stateRecord.cliToken,
      expiresAt: stateRecord.expiresAt,
    };
  },
});

/**
 * Delete OAuth Signup State (Internal)
 */
export const deleteOAuthSignupState = internalMutation({
  args: {
    state: v.string(),
  },
  handler: async (ctx, args) => {
    const stateRecord = await ctx.db
      .query("oauthSignupStates")
      .withIndex("by_state", (q) => q.eq("state", args.state))
      .first();
    
    if (stateRecord) {
      await ctx.db.delete(stateRecord._id);
    }
  },
});

