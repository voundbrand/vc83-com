/**
 * OAuth Authorization Flow
 *
 * Handles the authorization endpoint where users grant consent to third-party apps.
 * Implements OAuth 2.0 Authorization Code flow with PKCE support.
 *
 * Flow:
 * 1. App redirects user to /oauth/authorize with parameters
 * 2. User sees consent screen and approves/denies
 * 3. User is redirected back to app with authorization code
 * 4. App exchanges code for access token (Phase 4)
 */

import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { ConvexError } from "convex/values";
import {
  generateAuthorizationCode,
  validateRedirectUri,
  validateScopes,
} from "./helpers";
import { OAUTH_SCOPES } from "./scopes";

/**
 * Authorization Request Parameters
 * These come from the OAuth client's redirect to /oauth/authorize
 */
export interface AuthorizationRequest {
  client_id: string;              // OAuth application client ID
  redirect_uri: string;           // Where to send user after approval
  response_type: "code";          // Only "code" supported (Authorization Code flow)
  scope: string;                  // Space-separated list of scopes
  state?: string;                 // CSRF protection token (recommended)
  code_challenge?: string;        // PKCE challenge (S256 hash of verifier)
  code_challenge_method?: "S256"; // Only S256 supported
}

/**
 * Validate OAuth authorization request parameters
 *
 * Checks that the request is well-formed and the client is authorized.
 * This is called at the start of the authorization flow.
 *
 * @throws ConvexError if validation fails
 * @returns Validated application and organization context
 */
export const validateAuthorizationRequest = query({
  args: {
    clientId: v.string(),
    redirectUri: v.string(),
    responseType: v.string(),
    scope: v.string(),
    state: v.optional(v.string()),
    codeChallenge: v.optional(v.string()),
    codeChallengeMethod: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Must be authenticated to authorize apps
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Must be authenticated to authorize applications",
      });
    }

    // Validate response_type (only "code" supported)
    if (args.responseType !== "code") {
      throw new ConvexError({
        code: "UNSUPPORTED_RESPONSE_TYPE",
        message: 'Only response_type="code" is supported',
      });
    }

    // Lookup OAuth application
    const application = await ctx.db
      .query("oauthApplications")
      .withIndex("by_client_id", (q) => q.eq("clientId", args.clientId))
      .first();

    if (!application) {
      throw new ConvexError({
        code: "INVALID_CLIENT",
        message: "Invalid client_id",
      });
    }

    // Check if application is active
    if (!application.isActive) {
      throw new ConvexError({
        code: "CLIENT_DISABLED",
        message: "This application has been disabled",
      });
    }

    // Validate redirect URI matches registered URIs
    if (!application.redirectUris.includes(args.redirectUri)) {
      throw new ConvexError({
        code: "INVALID_REDIRECT_URI",
        message: "redirect_uri does not match registered URIs for this application",
      });
    }

    // Validate redirect URI format
    validateRedirectUri(args.redirectUri);

    // Validate scopes
    validateScopes(args.scope);

    // Check that requested scopes are allowed for this app
    const requestedScopes = args.scope.split(" ");
    const allowedScopes = application.scopes.split(" ");

    for (const scope of requestedScopes) {
      if (!allowedScopes.includes(scope)) {
        throw new ConvexError({
          code: "INVALID_SCOPE",
          message: `Scope "${scope}" is not allowed for this application`,
        });
      }
    }

    // Validate PKCE if present
    if (args.codeChallenge) {
      if (args.codeChallengeMethod !== "S256") {
        throw new ConvexError({
          code: "INVALID_REQUEST",
          message: "Only code_challenge_method=S256 is supported",
        });
      }

      // PKCE challenge must be 43-128 characters
      if (args.codeChallenge.length < 43 || args.codeChallenge.length > 128) {
        throw new ConvexError({
          code: "INVALID_REQUEST",
          message: "code_challenge must be 43-128 characters",
        });
      }
    }

    // For public clients, PKCE is required
    if (application.type === "public" && !args.codeChallenge) {
      throw new ConvexError({
        code: "INVALID_REQUEST",
        message: "PKCE is required for public clients (mobile/SPA apps)",
      });
    }

    // Check user is member of the application's organization
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_user_and_org", (q) =>
        q.eq("userId", identity.subject as any).eq("organizationId", application.organizationId)
      )
      .first();

    if (!membership) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "You are not a member of the organization that owns this application",
      });
    }

    // Get organization details for consent screen
    const organization = await ctx.db.get(application.organizationId);
    if (!organization) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Organization not found",
      });
    }

    // Parse scope details for consent screen
    const scopeDetails = requestedScopes.map((scopeId) => {
      const scope = OAUTH_SCOPES[scopeId];
      return scope || {
        id: scopeId,
        name: scopeId,
        description: `Access to ${scopeId}`,
        category: "Other",
      };
    });

    // Return validated request context
    return {
      valid: true,
      application: {
        id: application._id,
        name: application.name,
        description: application.description,
        clientId: application.clientId,
        type: application.type,
      },
      organization: {
        id: organization._id,
        name: organization.name,
      },
      requestedScopes: scopeDetails,
      redirectUri: args.redirectUri,
      state: args.state,
      codeChallenge: args.codeChallenge,
      codeChallengeMethod: args.codeChallengeMethod,
    };
  },
});

/**
 * User approves authorization request
 *
 * Creates an authorization code and redirects user back to the application.
 * This is called when user clicks "Allow" on the consent screen.
 */
export const approveAuthorization = mutation({
  args: {
    clientId: v.string(),
    redirectUri: v.string(),
    scope: v.string(),
    state: v.optional(v.string()),
    codeChallenge: v.optional(v.string()),
    codeChallengeMethod: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Must be authenticated
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Must be authenticated to approve authorization",
      });
    }

    // Re-validate request (security: don't trust client-side state)
    const application = await ctx.db
      .query("oauthApplications")
      .withIndex("by_client_id", (q) => q.eq("clientId", args.clientId))
      .first();

    if (!application || !application.isActive) {
      throw new ConvexError({
        code: "INVALID_CLIENT",
        message: "Invalid or disabled client",
      });
    }

    if (!application.redirectUris.includes(args.redirectUri)) {
      throw new ConvexError({
        code: "INVALID_REDIRECT_URI",
        message: "Invalid redirect_uri",
      });
    }

    // Verify user is member of the organization
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_user_and_org", (q) =>
        q.eq("userId", identity.subject as any).eq("organizationId", application.organizationId)
      )
      .first();

    if (!membership) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "Not authorized for this organization",
      });
    }

    // Generate authorization code
    const code = generateAuthorizationCode();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Store authorization code
    await ctx.db.insert("oauthAuthorizationCodes", {
      code,
      clientId: args.clientId,
      userId: identity.subject,
      organizationId: application.organizationId,
      redirectUri: args.redirectUri,
      scope: args.scope,
      codeChallenge: args.codeChallenge,
      codeChallengeMethod: args.codeChallengeMethod,
      expiresAt,
      used: false,
      createdAt: Date.now(),
    });

    // Build redirect URL with authorization code
    const redirectUrl = new URL(args.redirectUri);
    redirectUrl.searchParams.set("code", code);
    if (args.state) {
      redirectUrl.searchParams.set("state", args.state);
    }

    return {
      redirectUrl: redirectUrl.toString(),
      code, // For testing/debugging only - real flow uses redirectUrl
    };
  },
});

/**
 * User denies authorization request
 *
 * Redirects user back to application with error.
 * This is called when user clicks "Deny" on the consent screen.
 */
export const denyAuthorization = mutation({
  args: {
    redirectUri: v.string(),
    state: v.optional(v.string()),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Must be authenticated
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Must be authenticated",
      });
    }

    // Build redirect URL with error
    const redirectUrl = new URL(args.redirectUri);
    redirectUrl.searchParams.set("error", "access_denied");
    redirectUrl.searchParams.set(
      "error_description",
      args.reason || "User denied authorization"
    );
    if (args.state) {
      redirectUrl.searchParams.set("state", args.state);
    }

    return {
      redirectUrl: redirectUrl.toString(),
    };
  },
});

/**
 * Get authorization code details (internal use)
 *
 * Used by token endpoint to exchange code for access token.
 * Validates that code exists, hasn't been used, and hasn't expired.
 */
export const getAuthorizationCode = query({
  args: {
    code: v.string(),
  },
  handler: async (ctx, args) => {
    const authCode = await ctx.db
      .query("oauthAuthorizationCodes")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .first();

    if (!authCode) {
      throw new ConvexError({
        code: "INVALID_GRANT",
        message: "Invalid authorization code",
      });
    }

    // Check if already used (prevent code reuse)
    if (authCode.used) {
      throw new ConvexError({
        code: "INVALID_GRANT",
        message: "Authorization code has already been used",
      });
    }

    // Check if expired (10 minutes)
    if (Date.now() > authCode.expiresAt) {
      throw new ConvexError({
        code: "INVALID_GRANT",
        message: "Authorization code has expired",
      });
    }

    return authCode;
  },
});

/**
 * Mark authorization code as used
 *
 * Called by token endpoint after successful token issuance.
 * Prevents authorization code from being used multiple times.
 */
export const markAuthorizationCodeAsUsed = mutation({
  args: {
    code: v.string(),
  },
  handler: async (ctx, args) => {
    const authCode = await ctx.db
      .query("oauthAuthorizationCodes")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .first();

    if (!authCode) {
      throw new ConvexError({
        code: "INVALID_GRANT",
        message: "Invalid authorization code",
      });
    }

    await ctx.db.patch(authCode._id, {
      used: true,
      usedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Cleanup expired authorization codes (scheduled job)
 *
 * Run this periodically (e.g., every hour) to remove expired codes.
 * Helps keep the database clean and prevents unbounded growth.
 */
export const cleanupExpiredAuthorizationCodes = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Find all expired codes
    const expiredCodes = await ctx.db
      .query("oauthAuthorizationCodes")
      .withIndex("by_expiry")
      .filter((q) => q.lt(q.field("expiresAt"), now))
      .collect();

    // Delete expired codes
    for (const code of expiredCodes) {
      await ctx.db.delete(code._id);
    }

    return {
      deletedCount: expiredCodes.length,
      message: `Cleaned up ${expiredCodes.length} expired authorization codes`,
    };
  },
});
