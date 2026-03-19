/**
 * Unified OAuth Account Creation
 * 
 * Handles OAuth-based account creation and login for both Platform UI and CLI.
 * Supports Apple, Microsoft, Google, and GitHub OAuth providers.
 * 
 * This is separate from the OAuth connection flow (which connects external accounts
 * to existing platform accounts). This flow creates NEW accounts or logs into
 * existing accounts via OAuth.
 */

import { ConvexError, v } from "convex/values";
import { action, internalAction, internalMutation, internalQuery } from "../../_generated/server";
import { Id } from "../../_generated/dataModel";
import { buildUserSortFields } from "../../userSortKeys";
import { SignJWT, importPKCS8 } from "jose";
const generatedApi: any = require("../../_generated/api");

async function ensureOrgOwnerRoleId(ctx: any): Promise<Id<"roles">> {
  let ownerRole = await ctx.db
    .query("roles")
    .filter((q: any) => q.eq(q.field("name"), "org_owner"))
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

  return ownerRole._id;
}

async function ensureOrganizationMember(
  ctx: any,
  args: { userId: Id<"users">; organizationId: Id<"organizations">; roleId: Id<"roles"> }
) {
  const existingMembership = await ctx.db
    .query("organizationMembers")
    .withIndex("by_user_and_org", (q: any) =>
      q.eq("userId", args.userId).eq("organizationId", args.organizationId)
    )
    .first();

  if (!existingMembership) {
    await ctx.db.insert("organizationMembers", {
      userId: args.userId,
      organizationId: args.organizationId,
      role: args.roleId,
      isActive: true,
      joinedAt: Date.now(),
      acceptedAt: Date.now(),
      invitedBy: args.userId,
    });
    return;
  }

  if (!existingMembership.isActive) {
    await ctx.db.patch(existingMembership._id, {
      isActive: true,
      acceptedAt: existingMembership.acceptedAt || Date.now(),
    });
  }
}

async function ensureOrganizationBootstrapRecords(
  ctx: any,
  args: {
    userId: Id<"users">;
    organizationId: Id<"organizations">;
    email: string;
  }
) {
  const existingOrgStorage = await ctx.db
    .query("organizationStorage")
    .withIndex("by_organization", (q: any) => q.eq("organizationId", args.organizationId))
    .first();
  if (!existingOrgStorage) {
    await ctx.db.insert("organizationStorage", {
      organizationId: args.organizationId,
      totalSizeBytes: 0,
      totalSizeGB: 0,
      fileCount: 0,
      byCategoryBytes: {},
      lastCalculated: Date.now(),
      updatedAt: Date.now(),
    });
  }

  const existingUserQuota = await ctx.db
    .query("userStorageQuotas")
    .withIndex("by_org_and_user", (q: any) =>
      q.eq("organizationId", args.organizationId).eq("userId", args.userId)
    )
    .first();
  if (!existingUserQuota) {
    await ctx.db.insert("userStorageQuotas", {
      organizationId: args.organizationId,
      userId: args.userId,
      storageUsedBytes: 0,
      fileCount: 0,
      isEnforced: true,
      storageLimitBytes: 250 * 1024 * 1024,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  }

  const existingApiSettings = await ctx.db
    .query("objects")
    .withIndex("by_org_type", (q: any) =>
      q.eq("organizationId", args.organizationId).eq("type", "organization_settings")
    )
    .filter((q: any) => q.eq(q.field("subtype"), "api"))
    .first();

  if (!existingApiSettings) {
    await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "organization_settings",
      subtype: "api",
      name: "API Settings",
      status: "active",
      customProperties: {
        apiKeysEnabled: true,
      },
      createdBy: args.userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  }

  const orgDoc = await ctx.db.get(args.organizationId);
  if (orgDoc && !orgDoc.email) {
    await ctx.db.patch(args.organizationId, {
      email: args.email,
      updatedAt: Date.now(),
    });
  }
}

type OAuthBetaAccessStatus = "approved" | "pending" | "rejected" | "none";
type OAuthSignupProvider = "apple" | "microsoft" | "google" | "github";

const oauthSignupProviderValidator = v.union(
  v.literal("apple"),
  v.literal("microsoft"),
  v.literal("google"),
  v.literal("github")
);

function normalizeOptionalText(value?: string | null): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function throwBetaCodeValidationError(reason?: string): never {
  const resolvedReason = reason || "not_found";
  throw new ConvexError({
    code:
      resolvedReason === "expired"
        ? "BETA_CODE_EXPIRED"
        : resolvedReason === "exhausted"
          ? "BETA_CODE_EXHAUSTED"
          : resolvedReason === "deactivated"
            ? "BETA_CODE_DEACTIVATED"
            : "INVALID_BETA_CODE",
    message: `Beta code cannot be used (${resolvedReason}).`,
  });
}

function decodeJwtPayload(token: string): Record<string, unknown> {
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid JWT payload format");
  }

  const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
  const padded = payload + "=".repeat((4 - (payload.length % 4)) % 4);
  return JSON.parse(atob(padded)) as Record<string, unknown>;
}

function normalizeApplePrivateKey(privateKey: string | undefined): string | null {
  if (typeof privateKey !== "string") return null;
  const normalized = privateKey.replace(/\\n/g, "\n").trim();
  return normalized.length > 0 ? normalized : null;
}

async function buildAppleClientSecret(clientId: string): Promise<string> {
  const staticSecret = process.env.APPLE_OAUTH_CLIENT_SECRET?.trim();
  if (staticSecret) {
    return staticSecret;
  }

  const teamId = process.env.APPLE_OAUTH_TEAM_ID?.trim();
  const keyId = process.env.APPLE_OAUTH_KEY_ID?.trim();
  const privateKey = normalizeApplePrivateKey(process.env.APPLE_OAUTH_PRIVATE_KEY);

  if (!teamId || !keyId || !privateKey) {
    throw new Error(
      "Apple OAuth not configured: set APPLE_OAUTH_CLIENT_SECRET or APPLE_OAUTH_TEAM_ID, APPLE_OAUTH_KEY_ID, and APPLE_OAUTH_PRIVATE_KEY"
    );
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  const cryptoKey = await importPKCS8(privateKey, "ES256");

  return await new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: keyId })
    .setIssuer(teamId)
    .setAudience("https://appleid.apple.com")
    .setSubject(clientId)
    .setIssuedAt(nowSeconds)
    .setExpirationTime(nowSeconds + 5 * 60)
    .sign(cryptoKey);
}

/**
 * Exchange OAuth Code for User Info (Internal)
 * 
 * Handles provider-specific OAuth code exchange and returns user info.
 */
export const exchangeOAuthCode = internalAction({
  args: {
    provider: oauthSignupProviderValidator,
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

    if (args.provider === "apple") {
      const clientId = process.env.APPLE_OAUTH_CLIENT_ID?.trim();
      if (!clientId) {
        throw new Error("Apple OAuth not configured: APPLE_OAUTH_CLIENT_ID environment variable is not set");
      }

      const clientSecret = await buildAppleClientSecret(clientId);
      const tokenResponse = await fetch("https://appleid.apple.com/auth/token", {
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
        throw new Error(`Apple token exchange failed: ${await tokenResponse.text()}`);
      }

      const tokenData = await tokenResponse.json();
      if (tokenData.error) {
        throw new Error(`Apple OAuth error: ${tokenData.error_description || tokenData.error}`);
      }

      if (typeof tokenData.id_token !== "string" || tokenData.id_token.length === 0) {
        throw new Error("Apple OAuth token exchange did not return id_token");
      }

      const claims = decodeJwtPayload(tokenData.id_token);
      const providerAccountId = typeof claims.sub === "string" ? claims.sub : undefined;
      if (!providerAccountId) {
        throw new Error("Apple OAuth token did not include a stable user identifier");
      }

      const claimEmail = typeof claims.email === "string" ? claims.email.toLowerCase().trim() : "";
      const email = claimEmail || `apple_${providerAccountId}@privaterelay.appleid.com`;
      const firstName = email.split("@")[0] || "Apple";

      return {
        email,
        name: { firstName, lastName: "" },
        providerAccountId,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        tokenExpiresAt: tokenData.expires_in ? Date.now() + (tokenData.expires_in * 1000) : undefined,
        scopes: tokenData.scope ? String(tokenData.scope).split(" ") : ["name", "email"],
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
    claimedOrganizationId: v.optional(v.id("organizations")),
    betaCode: v.optional(v.string()),
    redemptionChannel: v.optional(v.string()),
    redemptionSource: v.optional(v.string()),
    redemptionDeviceType: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{
    userId: Id<"users">;
    organizationId: Id<"organizations">;
    isNewUser: boolean;
    betaAccessStatus: OAuthBetaAccessStatus;
    betaCodeApplied: boolean;
  }> => {
    // Normalize email
    const email = args.email.toLowerCase().trim();

    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", email))
      .first();

    const ownerRoleId = await ensureOrgOwnerRoleId(ctx);

    if (existingUser) {
      let organizationId = existingUser.defaultOrgId;

      if (args.claimedOrganizationId) {
        const claimedOrg = await ctx.db.get(args.claimedOrganizationId);
        if (!claimedOrg) {
          throw new Error("Claimed organization not found");
        }

        await ensureOrganizationMember(ctx, {
          userId: existingUser._id,
          organizationId: args.claimedOrganizationId,
          roleId: ownerRoleId,
        });

        await ensureOrganizationBootstrapRecords(ctx, {
          userId: existingUser._id,
          organizationId: args.claimedOrganizationId,
          email,
        });

        if (!existingUser.defaultOrgId) {
          await ctx.db.patch(existingUser._id, {
            defaultOrgId: args.claimedOrganizationId,
            updatedAt: Date.now(),
          });
        }

        organizationId = args.claimedOrganizationId;
      }

      if (!organizationId) {
        throw new Error("User exists but has no default organization");
      }

      return {
        userId: existingUser._id,
        organizationId,
        isNewUser: false,
        betaAccessStatus: (existingUser.betaAccessStatus as OAuthBetaAccessStatus | undefined) || "none",
        betaCodeApplied: false,
      };
    }

    const normalizedBetaCode = normalizeOptionalText(args.betaCode);
    const rolloutDecision: {
      resolvedStatus: "pending" | "approved";
      supportsBetaCodeAutoApprove: boolean;
    } = await (ctx as any).runQuery(
      generatedApi.internal.betaAccess.resolveSignupBetaAccessDecision,
      {
        hasValidBetaCode: false,
      }
    );
    const shouldValidateBetaCode = rolloutDecision.supportsBetaCodeAutoApprove;
    const betaCodeValidation =
      shouldValidateBetaCode && normalizedBetaCode
        ? await (ctx as any).runQuery(
            generatedApi.internal.betaCodes.validateBetaCodeInternal,
            {
              code: normalizedBetaCode,
            }
          )
        : null;

    if (
      shouldValidateBetaCode &&
      normalizedBetaCode &&
      (!betaCodeValidation || !betaCodeValidation.isValid || !betaCodeValidation.codeId)
    ) {
      throwBetaCodeValidationError(betaCodeValidation?.reason);
    }

    const betaAccessDecision: {
      resolvedStatus: "pending" | "approved";
    } =
      shouldValidateBetaCode && Boolean(betaCodeValidation?.isValid)
        ? await (ctx as any).runQuery(
            generatedApi.internal.betaAccess.resolveSignupBetaAccessDecision,
            {
              hasValidBetaCode: true,
            }
          )
        : rolloutDecision;
    const betaAccessStatus: "pending" | "approved" =
      betaAccessDecision.resolvedStatus;
    const now = Date.now();

    // Create new user (reuse onboarding logic)
    const userId = await ctx.db.insert("users", {
      email,
      firstName: args.firstName,
      lastName: args.lastName,
      isPasswordSet: false, // OAuth users don't have passwords
      isActive: true,
      betaAccessStatus,
      betaAccessRequestedAt: betaAccessStatus === "pending" ? now : undefined,
      betaAccessApprovedAt: betaAccessStatus === "approved" ? now : undefined,
      createdAt: now,
      updatedAt: now,
      ...buildUserSortFields({
        email,
        firstName: args.firstName,
        lastName: args.lastName,
        createdAt: now,
      }),
    });

    let organizationId: Id<"organizations">;
    let orgName = args.organizationName || `${args.firstName}${args.lastName ? ` ${args.lastName}` : ""}'s Organization`;
    const claimedSignup = !!args.claimedOrganizationId;

    if (args.claimedOrganizationId) {
      const claimedOrg = await ctx.db.get(args.claimedOrganizationId);
      if (!claimedOrg) {
        throw new Error("Claimed organization not found");
      }
      organizationId = args.claimedOrganizationId;
      orgName = claimedOrg.name || orgName;
    } else {
      // Create default organization
      let baseSlug = orgName
        .toLowerCase()
        .replace(/'/g, "")
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

      organizationId = await ctx.db.insert("organizations", {
        name: orgName,
        slug,
        businessName: orgName,
        isPersonalWorkspace: true,
        isActive: true,
        email,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    // Set as default organization
    await ctx.db.patch(userId, {
      defaultOrgId: organizationId,
      updatedAt: Date.now(),
    });

    // Add user as organization owner
    await ensureOrganizationMember(ctx, {
      userId,
      organizationId,
      roleId: ownerRoleId,
    });

    await ensureOrganizationBootstrapRecords(ctx, {
      userId,
      organizationId,
      email,
    });

    // Log audit event (same as web onboarding)
    await ctx.db.insert("auditLogs", {
      organizationId,
      userId,
      action: "user.signup",
      resource: "users",
      resourceId: userId,
      metadata: {
        signupMethod: "oauth",
        planTier: "free",
        organizationName: orgName,
        claimedSignup,
      },
      success: true,
      createdAt: Date.now(),
    });

    // Schedule async tasks (same as web onboarding)
    // Record signup event for growth tracking
    await (ctx.scheduler as any).runAfter(0, generatedApi.internal.growthTracking.recordSignupEvent, {
      userId,
      organizationId,
      email,
      planTier: "free",
    });

    // Assign all apps to the new organization (teaser model)
    await (ctx.scheduler as any).runAfter(0, generatedApi.internal.onboarding.assignAllAppsToOrg, {
      organizationId,
      userId,
    });

    if (betaCodeValidation?.isValid && betaCodeValidation.codeId) {
      await (ctx as any).runMutation(generatedApi.internal.betaCodes.redeemBetaCodeForSignupInternal, {
        code: betaCodeValidation.code,
        userId,
        organizationId,
        channel: normalizeOptionalText(args.redemptionChannel) || "platform_oauth_signup",
        source: normalizeOptionalText(args.redemptionSource) || "oauth_signup",
        deviceType: normalizeOptionalText(args.redemptionDeviceType),
      });
    }

    return {
      userId,
      organizationId,
      isNewUser: true,
      betaAccessStatus,
      betaCodeApplied: Boolean(betaCodeValidation?.isValid),
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
 * @param provider - OAuth provider (apple, microsoft, google, github)
 * @param code - OAuth authorization code
 * @param state - CSRF state token (from oauthSignupStates table)
 */
export const completeOAuthSignup = action({
  args: {
    sessionType: v.union(v.literal("platform"), v.literal("cli")),
    provider: oauthSignupProviderValidator,
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
    provider: OAuthSignupProvider;
    identityClaim?: {
      success: boolean;
      alreadyClaimed?: boolean;
      tokenType?: "guest_session_claim" | "telegram_org_claim";
      linkedOrganizationId?: Id<"organizations">;
      linkedSessionToken?: string;
      errorCode?: string;
    };
  }> => {
    // Get state record (contains callback URL and other metadata)
    const stateRecord = await (ctx as any).runQuery(generatedApi.internal.api.v1.oauthSignup.getOAuthSignupStateInternal, {
      state: args.state,
    }) as {
      sessionType: "platform" | "cli";
      callbackUrl: string;
      provider: OAuthSignupProvider;
      organizationName?: string;
      betaCode?: string;
      identityClaimToken?: string;
      onboardingChannel?: string;
      onboardingDeviceType?: string;
      onboardingCampaign?: {
        source?: string;
        medium?: string;
        campaign?: string;
        content?: string;
        term?: string;
        referrer?: string;
        landingPath?: string;
      };
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
    const userInfo = await (ctx as any).runAction(generatedApi.internal.api.v1.oauthSignup.exchangeOAuthCode, {
      provider: args.provider,
      code: args.code,
      redirectUri,
    });

    let inspectedClaim:
      | {
          valid: boolean;
          tokenType?: "guest_session_claim" | "telegram_org_claim";
          channel?: "webchat" | "native_guest" | "telegram";
          organizationId?: Id<"organizations">;
          reason?: string;
        }
      | null = null;

    if (stateRecord.identityClaimToken) {
      inspectedClaim = await (ctx as any).runAction(
        generatedApi.internal.onboarding.identityClaims.inspectIdentityClaimToken,
        {
          signedToken: stateRecord.identityClaimToken,
        }
      );
    }

    const candidateChannel =
      stateRecord.onboardingChannel ||
      (inspectedClaim?.valid ? inspectedClaim.channel : undefined) ||
      "platform_web";
    const signupChannel =
      candidateChannel === "webchat" ||
      candidateChannel === "native_guest" ||
      candidateChannel === "telegram"
        ? candidateChannel
        : "platform_web";
    const signupDeviceType =
      normalizeOptionalText(stateRecord.onboardingDeviceType) ||
      (args.sessionType === "cli" ? "cli" : "web");
    const signupCampaign =
      stateRecord.onboardingCampaign && typeof stateRecord.onboardingCampaign === "object"
        ? stateRecord.onboardingCampaign
        : undefined;
    const signupSource =
      normalizeOptionalText(signupCampaign?.source) ||
      normalizeOptionalText(signupCampaign?.referrer) ||
      `oauth_signup_${args.provider}`;

    type ExistingIdentityLookup = {
      identity: { _id: Id<"userIdentities"> };
      user: {
        _id: Id<"users">;
        defaultOrgId: Id<"organizations"> | null;
        email: string;
        betaAccessStatus?: string;
      };
    } | null;

    let existingIdentity: ExistingIdentityLookup = null;
    if (userInfo.providerAccountId) {
      existingIdentity = await (ctx as any).runQuery(generatedApi.internal.auth.identity.findByProviderUser, {
        provider: args.provider,
        providerUserId: userInfo.providerAccountId,
      });

      if (existingIdentity?.identity?._id) {
        await (ctx as any).runMutation(generatedApi.internal.auth.identity.updateLastUsed, {
          identityId: existingIdentity.identity._id,
        });
      }
    }

    let userResult: {
      userId: Id<"users">;
      organizationId: Id<"organizations">;
      isNewUser: boolean;
      betaAccessStatus: OAuthBetaAccessStatus;
      betaCodeApplied: boolean;
    };

    if (existingIdentity) {
      if (!existingIdentity.user.defaultOrgId) {
        throw new Error("Identity exists but user has no default organization");
      }

      userResult = {
        userId: existingIdentity.user._id,
        organizationId: existingIdentity.user.defaultOrgId,
        isNewUser: false,
        betaAccessStatus:
          (existingIdentity.user.betaAccessStatus as OAuthBetaAccessStatus | undefined) || "none",
        betaCodeApplied: false,
      };
    } else {
      // Find or create user by email.
      userResult = await (ctx as any).runMutation(generatedApi.internal.api.v1.oauthSignup.findOrCreateUserFromOAuth, {
        email: userInfo.email,
        firstName: userInfo.name.firstName,
        lastName: userInfo.name.lastName,
        organizationName: stateRecord.organizationName,
        betaCode: stateRecord.betaCode,
        redemptionChannel: signupChannel,
        redemptionSource: signupSource,
        redemptionDeviceType: signupDeviceType,
        claimedOrganizationId:
          inspectedClaim?.valid && inspectedClaim.tokenType === "telegram_org_claim"
            ? inspectedClaim.organizationId
            : undefined,
      });
    }

    const resolvedUserEmail =
      normalizeOptionalText(existingIdentity?.user.email) ||
      normalizeOptionalText(userInfo.email);
    if (!resolvedUserEmail) {
      throw new Error("OAuth provider did not return a usable email");
    }

    // Keep userIdentities in sync for OAuth sign-ins so future logins can match by provider user ID.
    if (!existingIdentity && userInfo.providerAccountId) {
      try {
        const linkedIdentities = await (ctx as any).runQuery(
          generatedApi.internal.auth.identity.getLinkedIdentities,
          { userId: userResult.userId }
        ) as Array<{ _id: Id<"userIdentities"> }>;

        if (linkedIdentities.length === 0) {
          await (ctx as any).runMutation(generatedApi.internal.auth.identity.createIdentity, {
            userId: userResult.userId,
            provider: args.provider,
            providerUserId: userInfo.providerAccountId,
            providerEmail: resolvedUserEmail,
            isPrimary: true,
            isApplePrivateRelay: resolvedUserEmail.includes("privaterelay.appleid.com"),
            metadata: { source: "oauth_signup", provider: args.provider },
          });
        } else {
          await (ctx as any).runMutation(generatedApi.internal.auth.identity.linkIdentity, {
            userId: userResult.userId,
            provider: args.provider,
            providerUserId: userInfo.providerAccountId,
            providerEmail: resolvedUserEmail,
            isApplePrivateRelay: resolvedUserEmail.includes("privaterelay.appleid.com"),
            metadata: { source: "oauth_signup", provider: args.provider },
          });
        }
      } catch (identityError) {
        console.error("[OAuth Signup] Failed to upsert user identity (non-blocking):", identityError);
      }
    }

    // For new users, trigger additional onboarding tasks (async, don't block login)
    if (userResult.isNewUser) {
      // Get organization name for async tasks
      const orgName = stateRecord.organizationName || `${userInfo.name.firstName}${userInfo.name.lastName ? ` ${userInfo.name.lastName}` : ''}'s Organization`;

      if (userResult.betaAccessStatus === "pending") {
        // Send beta access request notifications (async)
        await Promise.all([
          // Notify sales team about beta request
          (ctx.scheduler as any).runAfter(0, generatedApi.internal.actions.betaAccessEmails.notifySalesOfBetaRequest, {
            userId: userResult.userId,
            email: resolvedUserEmail,
            firstName: userInfo.name.firstName,
            lastName: userInfo.name.lastName,
            requestReason: "New signup during beta period",
            useCase: undefined,
            referralSource: "OAuth signup",
          }),
          // Send confirmation to requester
          (ctx.scheduler as any).runAfter(0, generatedApi.internal.actions.betaAccessEmails.sendBetaRequestConfirmation, {
            email: resolvedUserEmail,
            firstName: userInfo.name.firstName,
          }),
        ]);
      } else {
        // Beta gating disabled - send normal welcome email
        // Send welcome email (async)
        await (ctx.scheduler as any).runAfter(0, generatedApi.internal.actions.welcomeEmail.sendWelcomeEmail, {
          email: resolvedUserEmail,
          firstName: userInfo.name.firstName,
          organizationName: orgName,
          apiKeyPrefix: "n/a", // OAuth users don't get API key on signup
        });

        // Send sales notification (async)
        await (ctx.scheduler as any).runAfter(0, generatedApi.internal.actions.salesNotificationEmail.sendSalesNotification, {
          eventType: "free_signup",
          user: {
            email: resolvedUserEmail,
            firstName: userInfo.name.firstName,
            lastName: userInfo.name.lastName,
          },
          organization: {
            name: orgName,
            planTier: "free",
          },
        });
      }

      // Create Stripe customer (async) - enables upgrade path
      try {
        await (ctx as any).runAction(generatedApi.internal.onboarding.createStripeCustomerForFreeUser, {
          organizationId: userResult.organizationId,
          organizationName: orgName,
          email: resolvedUserEmail,
        });
      } catch (error) {
        // Log but don't fail signup if Stripe customer creation fails
        console.error("[OAuth Signup] Failed to create Stripe customer:", error);
      }

      try {
        await (ctx as any).runMutation(generatedApi.internal.onboarding.funnelEvents.emitFunnelEvent, {
          eventName: "onboarding.funnel.signup",
          channel: signupChannel,
          organizationId: userResult.organizationId,
          userId: userResult.userId,
          eventKey: `onboarding.funnel.signup:${userResult.userId}`,
          campaign: signupCampaign,
          metadata: {
            provider: args.provider,
            sessionType: args.sessionType,
            usedIdentityClaim: Boolean(stateRecord.identityClaimToken),
            betaCodeApplied: userResult.betaCodeApplied,
          },
        });
      } catch (funnelError) {
        console.error("[OAuth Signup] Funnel signup event failed (non-blocking):", funnelError);
      }

      try {
        await (ctx as any).runMutation(
          generatedApi.internal.onboarding.nurtureScheduler.startNurtureJourney,
          {
            organizationId: userResult.organizationId,
            userId: userResult.userId,
            sourceChannel: signupChannel,
            preferredChannel: signupChannel,
            firstWinSeededAt:
              userResult.betaAccessStatus === "approved" ? Date.now() : undefined,
            metadata: {
              signupMethod: "oauth_signup",
              provider: args.provider,
              sessionType: args.sessionType,
              betaAccessStatus: userResult.betaAccessStatus,
            },
            startReason: "oauth_signup_complete",
          }
        );
      } catch (nurtureError) {
        console.error(
          "[OAuth Signup] Failed to initialize Day 0-3 nurture journey (non-blocking):",
          nurtureError
        );
      }

      const referralCode =
        typeof signupCampaign?.referrer === "string"
          ? signupCampaign.referrer.trim()
          : "";
      if (referralCode.length > 0) {
        try {
          await (ctx as any).runMutation(
            generatedApi.internal.credits.index.trackReferralSignupConversionInternal,
            {
              referralCode,
              referredUserId: userResult.userId,
              referredOrganizationId: userResult.organizationId,
              source: "oauth_signup",
            }
          );
        } catch (referralError) {
          console.error(
            "[OAuth Signup] Referral attribution failed (non-blocking):",
            referralError
          );
        }
      }
    }

    const consumeIdentityClaimIfPresent = async (organizationId: Id<"organizations">) => {
      if (!stateRecord.identityClaimToken) {
        return undefined;
      }

      try {
        const result = await (ctx as any).runMutation(
          generatedApi.internal.onboarding.identityClaims.consumeIdentityClaimToken,
          {
            signedToken: stateRecord.identityClaimToken,
            userId: userResult.userId,
            organizationId,
            claimSource: "oauth_signup_complete",
          }
        );
        return result;
      } catch (claimError) {
        console.error("[OAuth Signup] Failed to consume identity claim token:", claimError);
        return {
          success: false,
          errorCode: "claim_consume_failed",
        };
      }
    };

    await (ctx as any).runMutation(
      generatedApi.internal.ai.settings.ensureOrganizationModelDefaultsInternal,
      {
        organizationId: userResult.organizationId,
      }
    );
    await (ctx as any).runMutation(
      generatedApi.internal.agentOntology.ensureActiveAgentForOrgInternal,
      {
        organizationId: userResult.organizationId,
        channel: "desktop",
      }
    );

    // Create session based on sessionType
    if (args.sessionType === "cli") {
      // Create CLI session
      const cliToken = stateRecord.cliToken || `cli_session_${crypto.randomUUID().replace(/-/g, '')}`;
      console.log(`[completeOAuthSignup] CLI session - stateRecord.cliToken: ${stateRecord.cliToken?.substring(0, 20) || 'undefined'}, using cliToken: ${cliToken.substring(0, 20)}...`);
      // createCliSession is now an Action (uses bcrypt for hashing)
      const sessionId = await (ctx as any).runAction(generatedApi.internal.api.v1.cliAuth.createCliSession, {
        userId: userResult.userId,
        email: resolvedUserEmail,
        organizationId: userResult.organizationId,
        cliToken,
        createdAt: Date.now(),
        expiresAt: Date.now() + (30 * 24 * 60 * 60 * 1000), // 30 days
      });

      // Clean up state
      await (ctx as any).runMutation(generatedApi.internal.api.v1.oauthSignup.deleteOAuthSignupState, {
        state: args.state,
      });

      const identityClaim = await consumeIdentityClaimIfPresent(userResult.organizationId);

      return {
        token: cliToken,
        sessionId,
        userId: userResult.userId,
        email: resolvedUserEmail,
        organizationId: userResult.organizationId,
        expiresAt: Date.now() + (30 * 24 * 60 * 60 * 1000),
        isNewUser: userResult.isNewUser,
        provider: args.provider, // Return provider for "last used" tracking
        identityClaim,
      };
    } else {
      // Create platform session
      const sessionId = await (ctx as any).runMutation(generatedApi.internal.api.v1.oauthSignup.createPlatformSession, {
        userId: userResult.userId,
        email: resolvedUserEmail,
        organizationId: userResult.organizationId,
      });

      // Store OAuth connection for platform users (so they can use it for integrations)
      // Only store if we have token information
      if (userInfo.accessToken && userInfo.providerAccountId) {
        try {
          // Encrypt tokens before storage
          const encryptedAccessToken = await (ctx as any).runAction(generatedApi.internal.oauth.encryption.encryptToken, {
            plaintext: userInfo.accessToken,
          });
          
          const encryptedRefreshToken = userInfo.refreshToken
            ? await (ctx as any).runAction(generatedApi.internal.oauth.encryption.encryptToken, {
                plaintext: userInfo.refreshToken,
              })
            : encryptedAccessToken; // Use access token if no refresh token

          const tokenExpiresAt = userInfo.tokenExpiresAt || Date.now() + (3600 * 1000); // Default 1 hour
          const scopes =
            userInfo.scopes ||
            (args.provider === "github"
              ? ["read:user", "user:email"]
              : args.provider === "apple"
                ? ["name", "email"]
                : ["openid", "profile", "email"]);

          // Store connection using provider-specific mutation
          if (args.provider === "google") {
            await (ctx as any).runMutation(generatedApi.internal.oauth.google.storeConnection, {
              userId: userResult.userId,
              organizationId: userResult.organizationId,
              provider: "google",
              providerAccountId: userInfo.providerAccountId || "",
              providerEmail: resolvedUserEmail,
              connectionType: "personal",
              accessToken: encryptedAccessToken,
              refreshToken: encryptedRefreshToken,
              tokenExpiresAt,
              scopes,
              metadata: {}, // Store empty metadata for now
            });
          } else if (args.provider === "microsoft") {
            await (ctx as any).runMutation(generatedApi.internal.oauth.microsoft.storeConnection, {
              userId: userResult.userId,
              organizationId: userResult.organizationId,
              provider: "microsoft",
              providerAccountId: userInfo.providerAccountId || "",
              providerEmail: resolvedUserEmail,
              connectionType: "personal",
              accessToken: encryptedAccessToken,
              refreshToken: encryptedRefreshToken,
              tokenExpiresAt,
              scopes,
            });
          } else if (args.provider === "github") {
            await (ctx as any).runMutation(generatedApi.internal.oauth.github.storeConnection, {
              userId: userResult.userId,
              organizationId: userResult.organizationId,
              provider: "github",
              providerAccountId: userInfo.providerAccountId || "",
              providerEmail: resolvedUserEmail,
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
      await (ctx as any).runMutation(generatedApi.internal.api.v1.oauthSignup.deleteOAuthSignupState, {
        state: args.state,
      });

      const identityClaim = await consumeIdentityClaimIfPresent(userResult.organizationId);

      return {
        token: sessionId, // Platform sessions use session ID as token
        sessionId,
        userId: userResult.userId,
        email: resolvedUserEmail,
        organizationId: userResult.organizationId,
        expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
        isNewUser: userResult.isNewUser,
        provider: args.provider, // Return provider for "last used" tracking
        identityClaim,
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
    // Auto-approve beta access for existing users who pre-date the beta gate
    const user = await ctx.db.get(args.userId);
    if (user && (!user.betaAccessStatus || user.betaAccessStatus === "none")) {
      await ctx.db.patch(args.userId, {
        betaAccessStatus: "approved",
        betaAccessApprovedAt: Date.now(),
      });
    }

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
    provider: oauthSignupProviderValidator,
    organizationName: v.optional(v.string()),
    betaCode: v.optional(v.string()),
    identityClaimToken: v.optional(v.string()),
    onboardingChannel: v.optional(v.string()),
    onboardingDeviceType: v.optional(v.string()),
    onboardingCampaign: v.optional(v.any()),
    cliToken: v.optional(v.string()), // Only for CLI sessions
    cliState: v.optional(v.string()), // CLI's original state for CSRF protection
    createdAt: v.number(),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    await (ctx as any).runMutation(generatedApi.internal.api.v1.oauthSignup.storeOAuthSignupStateInternal, {
      state: args.state,
      sessionType: args.sessionType,
      callbackUrl: args.callbackUrl,
      provider: args.provider,
      organizationName: args.organizationName,
      betaCode: args.betaCode,
      identityClaimToken: args.identityClaimToken,
      onboardingChannel: args.onboardingChannel,
      onboardingDeviceType: args.onboardingDeviceType,
      onboardingCampaign: args.onboardingCampaign,
      cliToken: args.cliToken,
      cliState: args.cliState,
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
    provider: oauthSignupProviderValidator,
    organizationName: v.optional(v.string()),
    betaCode: v.optional(v.string()),
    identityClaimToken: v.optional(v.string()),
    onboardingChannel: v.optional(v.string()),
    onboardingDeviceType: v.optional(v.string()),
    onboardingCampaign: v.optional(v.any()),
    cliToken: v.optional(v.string()), // Only for CLI sessions
    cliState: v.optional(v.string()), // CLI's original state for CSRF protection
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
      betaCode: args.betaCode,
      identityClaimToken: args.identityClaimToken,
      onboardingChannel: args.onboardingChannel,
      onboardingDeviceType: args.onboardingDeviceType,
      onboardingCampaign: args.onboardingCampaign,
      cliToken: args.cliToken,
      cliState: args.cliState,
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
    provider: OAuthSignupProvider;
    organizationName?: string;
    betaCode?: string;
    identityClaimToken?: string;
    onboardingChannel?: string;
    onboardingDeviceType?: string;
    onboardingCampaign?: {
      source?: string;
      medium?: string;
      campaign?: string;
      content?: string;
      term?: string;
      referrer?: string;
      landingPath?: string;
    };
    cliToken?: string;
    cliState?: string;
    expiresAt: number;
  } | null> => {
    return await (ctx as any).runQuery(generatedApi.internal.api.v1.oauthSignup.getOAuthSignupStateInternal, {
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
      betaCode: stateRecord.betaCode,
      identityClaimToken: stateRecord.identityClaimToken,
      onboardingChannel: stateRecord.onboardingChannel,
      onboardingDeviceType: stateRecord.onboardingDeviceType,
      onboardingCampaign: stateRecord.onboardingCampaign,
      cliToken: stateRecord.cliToken,
      cliState: stateRecord.cliState,
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
