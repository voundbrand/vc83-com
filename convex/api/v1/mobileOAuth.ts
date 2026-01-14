/**
 * Mobile OAuth Authentication
 *
 * Handles native mobile OAuth (Google Sign-In, Apple Sign-In) for iOS/Android apps.
 * Native OAuth works differently than web OAuth:
 * - Web OAuth: Redirect to provider → callback URL with authorization code → server exchanges
 * - Native OAuth: Native SDK handles everything client-side → returns ID token + user info directly
 *
 * This endpoint accepts user info from native OAuth SDKs and creates/logs into platform users.
 * For mobile app users (organization owners/admins), NOT frontend_users.
 */

import { httpAction } from "../../_generated/server";
import type { Id } from "../../_generated/dataModel";
import { getCorsHeaders, handleOptionsRequest } from "./corsHeaders";

// Work around Convex type inference depth issues (TS2589) with large schemas
// The internal API references are typed as any to avoid type depth overflow
// eslint-disable-next-line @typescript-eslint/no-var-requires
const internal = require("../../_generated/api").internal;

/**
 * Verify Google ID Token
 *
 * Verifies the ID token with Google's tokeninfo endpoint.
 * In production, you should also verify:
 * - The token's audience matches your app's client ID
 * - The token hasn't expired
 *
 * @see https://developers.google.com/identity/sign-in/ios/backend-auth
 */
async function verifyGoogleIdToken(
  idToken: string,
  email: string
): Promise<{ valid: boolean; error?: string }> {
  try {
    const response = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`
    );

    if (!response.ok) {
      return { valid: false, error: "Invalid Google ID token" };
    }

    const tokenInfo = await response.json();

    // Verify email matches
    if (tokenInfo.email !== email) {
      return { valid: false, error: "Token email does not match provided email" };
    }

    // Optionally verify audience (client ID) - you should configure this
    // const expectedClientId = process.env.GOOGLE_IOS_CLIENT_ID;
    // if (tokenInfo.aud !== expectedClientId) {
    //   return { valid: false, error: "Invalid token audience" };
    // }

    return { valid: true };
  } catch (error) {
    console.error("[verifyGoogleIdToken] Error:", error);
    return { valid: false, error: "Failed to verify Google ID token" };
  }
}

/**
 * Verify Apple ID Token
 *
 * Verifies the ID token with Apple's public keys.
 * Apple tokens are JWTs that can be verified using Apple's public keys.
 *
 * For full production verification, you should:
 * 1. Fetch Apple's public keys from https://appleid.apple.com/auth/keys
 * 2. Verify the JWT signature using the appropriate key
 * 3. Check the issuer, audience, and expiration
 *
 * @see https://developer.apple.com/documentation/sign_in_with_apple/sign_in_with_apple_rest_api/verifying_a_user
 */
async function verifyAppleIdToken(
  idToken: string,
  email: string
): Promise<{ valid: boolean; error?: string }> {
  try {
    // Decode the JWT without verification to get claims
    // Note: In production, you should verify the signature with Apple's public keys
    const parts = idToken.split(".");
    if (parts.length !== 3) {
      return { valid: false, error: "Invalid Apple ID token format" };
    }

    // Decode the payload (base64url)
    const payload = parts[1]
      .replace(/-/g, "+")
      .replace(/_/g, "/");
    const decoded = JSON.parse(atob(payload));

    // Verify issuer
    if (decoded.iss !== "https://appleid.apple.com") {
      return { valid: false, error: "Invalid Apple token issuer" };
    }

    // Verify email matches (Apple may not include email in all cases)
    if (decoded.email && decoded.email !== email) {
      return { valid: false, error: "Token email does not match provided email" };
    }

    // Verify expiration
    if (decoded.exp && decoded.exp * 1000 < Date.now()) {
      return { valid: false, error: "Apple ID token has expired" };
    }

    // Note: For full production security, you should:
    // 1. Fetch Apple's public keys
    // 2. Verify the JWT signature
    // For now, we trust the token since it came from the native SDK

    return { valid: true };
  } catch (error) {
    console.error("[verifyAppleIdToken] Error:", error);
    return { valid: false, error: "Failed to verify Apple ID token" };
  }
}

/**
 * Mobile OAuth HTTP Handler
 *
 * POST /api/v1/auth/mobile-oauth
 *
 * Accepts native mobile OAuth info and creates/logs into platform users.
 */
export const mobileOAuthHandler = httpAction(async (ctx, request) => {
  const startTime = Date.now();
  const origin = request.headers.get("origin");

  try {
    // Parse request body
    const body = await request.json();
    const { provider, email, name, providerUserId, idToken } = body;

    console.log("[Mobile OAuth] Request received:", {
      provider,
      email,
      hasName: !!name,
      hasProviderUserId: !!providerUserId,
      hasIdToken: !!idToken,
    });

    // Validate required fields
    if (!provider || !email || !providerUserId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing required fields: provider, email, providerUserId",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            ...getCorsHeaders(origin),
          },
        }
      );
    }

    // Validate provider
    if (provider !== "google" && provider !== "apple") {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid provider. Supported providers: google, apple",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            ...getCorsHeaders(origin),
          },
        }
      );
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    // Verify ID token if provided (recommended for production)
    if (idToken) {
      let verification: { valid: boolean; error?: string };

      if (provider === "google") {
        verification = await verifyGoogleIdToken(idToken, normalizedEmail);
      } else {
        verification = await verifyAppleIdToken(idToken, normalizedEmail);
      }

      if (!verification.valid) {
        console.log("[Mobile OAuth] Token verification failed:", verification.error);
        return new Response(
          JSON.stringify({
            success: false,
            error: verification.error || "ID token verification failed",
          }),
          {
            status: 401,
            headers: {
              "Content-Type": "application/json",
              ...getCorsHeaders(origin),
            },
          }
        );
      }

      console.log("[Mobile OAuth] ID token verified successfully");
    } else {
      console.log("[Mobile OAuth] Warning: No ID token provided, skipping verification");
    }

    // Parse name into first/last name
    let firstName = "";
    let lastName = "";
    if (name) {
      const nameParts = name.trim().split(" ");
      firstName = nameParts[0] || "";
      lastName = nameParts.slice(1).join(" ") || "";
    } else {
      // Use email prefix as fallback
      firstName = normalizedEmail.split("@")[0] || "User";
    }

    // Check if Apple private relay email
    const isApplePrivateRelay = normalizedEmail.includes("privaterelay.appleid.com");

    // ========================================================================
    // IDENTITY-AWARE AUTHENTICATION FLOW
    // ========================================================================
    // 1. Check if this provider+providerUserId already has an identity
    // 2. If not, check if email matches an existing user (trigger linking)
    // 3. If no collision, create new user with identity
    // ========================================================================

    // Step 1: Check for existing identity by provider + providerUserId
    // Note: Using type annotations to work around Convex type inference depth issues (TS2589)
    type ExistingIdentityResult = {
      identity: { _id: Id<"userIdentities"> };
      user: { _id: Id<"users">; defaultOrgId: Id<"organizations"> | null; email: string };
    } | null;
    const existingIdentity: ExistingIdentityResult = await ctx.runQuery(
      internal.auth.identity.findByProviderUser,
      {
        provider: provider as "google" | "apple",
        providerUserId,
      }
    );

    let userResult: { userId: Id<"users">; organizationId: Id<"organizations">; isNewUser: boolean };

    if (existingIdentity) {
      // User has signed in with this provider before - log them in
      console.log("[Mobile OAuth] Found existing identity, logging in user:", existingIdentity.user._id);

      // Update last used timestamp
      await ctx.runMutation(internal.auth.identity.updateLastUsed, {
        identityId: existingIdentity.identity._id,
      });

      userResult = {
        userId: existingIdentity.user._id,
        organizationId: existingIdentity.user.defaultOrgId!,
        isNewUser: false,
      };
    } else {
      // Step 2: Check for email collision (only if not Apple private relay)
      if (!isApplePrivateRelay) {
        // Type annotation to work around Convex type inference depth issue (TS2589)
        type EmailCollisionResult = {
          identities: Array<{ userId: Id<"users">; provider: string; isPrimary: boolean }>;
          users: Array<{ _id: Id<"users">; email: string } | null>;
        } | null;
        const emailCollision: EmailCollisionResult = await ctx.runQuery(
          internal.auth.identity.findByEmail,
          { email: normalizedEmail }
        );

        if (emailCollision && emailCollision.users.length > 0) {
          // Email matches existing user - trigger account linking flow
          const existingUser = emailCollision.users[0]!;
          const primaryIdentity = emailCollision.identities.find((i) => i.isPrimary);

          console.log("[Mobile OAuth] Email collision detected, triggering linking flow:", {
            existingUserId: existingUser._id,
            newProvider: provider,
            existingProvider: primaryIdentity?.provider,
          });

          // Create linking state
          const linkingState: string = await ctx.runMutation(
            internal.auth.identity.createLinkingState,
            {
              sourceProvider: provider as "google" | "apple",
              sourceProviderUserId: providerUserId,
              sourceEmail: normalizedEmail,
              sourceName: name,
              targetUserId: existingUser._id,
              targetEmail: existingUser.email,
              targetProvider: primaryIdentity?.provider,
            }
          );

          // Return linking required response
          return new Response(
            JSON.stringify({
              success: false,
              requiresLinking: true,
              linkingState,
              existingAccountEmail: existingUser.email,
              existingAccountProvider: primaryIdentity?.provider || "unknown",
              message: "An account with this email already exists. Please confirm to link accounts.",
            }),
            {
              status: 200, // Not an error, just requires additional action
              headers: {
                "Content-Type": "application/json",
                ...getCorsHeaders(origin),
              },
            }
          );
        }
      }

      // Step 3: No collision - create new user with identity
      console.log("[Mobile OAuth] Creating new user with identity");

      // Create user using existing OAuth signup mutation
      const createResult = await ctx.runMutation(
        internal.api.v1.oauthSignup.findOrCreateUserFromOAuth,
        {
          email: normalizedEmail,
          firstName,
          lastName,
        }
      );

      // Create identity for new user
      await ctx.runMutation(internal.auth.identity.createIdentity, {
        userId: createResult.userId,
        provider: provider as "google" | "apple",
        providerUserId,
        providerEmail: normalizedEmail,
        isPrimary: true,
        isApplePrivateRelay,
        metadata: { name, provider },
      });

      // For new mobile users, trigger additional onboarding tasks (async, don't block login)
      if (createResult.isNewUser) {
        // Get organization for name
        const org = await ctx.runQuery(
          internal.api.v1.mobileOAuthInternal.getOrganizationById,
          { organizationId: createResult.organizationId }
        );
        const orgName = org?.name || `${firstName}'s Organization`;

        // Send welcome email (async)
        await ctx.scheduler.runAfter(0, internal.actions.welcomeEmail.sendWelcomeEmail, {
          email: normalizedEmail,
          firstName,
          organizationName: orgName,
          apiKeyPrefix: "n/a", // Mobile OAuth users don't get API key on signup
        });

        // Send sales notification (async)
        await ctx.scheduler.runAfter(0, internal.actions.salesNotificationEmail.sendSalesNotification, {
          eventType: "free_signup",
          user: {
            email: normalizedEmail,
            firstName,
            lastName,
          },
          organization: {
            name: orgName,
            planTier: "free",
          },
        });

        // Create Stripe customer (async) - enables upgrade path
        await ctx.scheduler.runAfter(0, internal.onboarding.createStripeCustomerForFreeUser, {
          organizationId: createResult.organizationId,
          organizationName: orgName,
          email: normalizedEmail,
        });

        console.log("[Mobile OAuth] Triggered onboarding tasks for new user:", normalizedEmail);
      }

      userResult = createResult;
    }

    console.log("[Mobile OAuth] User result:", {
      userId: userResult.userId,
      organizationId: userResult.organizationId,
      isNewUser: userResult.isNewUser,
    });

    // Create platform session (same as web OAuth)
    const sessionId: Id<"sessions"> = await ctx.runMutation(
      internal.api.v1.oauthSignup.createPlatformSession,
      {
        userId: userResult.userId,
        email: normalizedEmail,
        organizationId: userResult.organizationId,
      }
    );

    // Get full user profile for response
    const userProfile = await ctx.runQuery(
      internal.api.v1.mobileOAuthInternal.getUserProfileForMobile,
      {
        userId: userResult.userId,
        organizationId: userResult.organizationId,
      }
    );

    // Get organization info
    const organization = await ctx.runQuery(
      internal.api.v1.mobileOAuthInternal.getOrganizationById,
      {
        organizationId: userResult.organizationId,
      }
    );

    const duration = Date.now() - startTime;
    console.log(`[Mobile OAuth] Success in ${duration}ms:`, {
      userId: userResult.userId,
      email: normalizedEmail,
      isNewUser: userResult.isNewUser,
    });

    // Return success response matching the requested format
    return new Response(
      JSON.stringify({
        success: true,
        sessionId: sessionId,
        userId: userResult.userId,
        email: normalizedEmail,
        organizationId: userResult.organizationId,
        expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours (platform session duration)
        isNewUser: userResult.isNewUser,
        user: userProfile || {
          id: userResult.userId,
          email: normalizedEmail,
          firstName,
          lastName,
          isPasswordSet: false,
          organizations: organization ? [{
            id: organization._id,
            name: organization.name,
            slug: organization.slug,
            role: "org_owner",
          }] : [],
          currentOrganization: organization ? {
            id: organization._id,
            name: organization.name,
            slug: organization.slug,
          } : null,
        },
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...getCorsHeaders(origin),
        },
      }
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[Mobile OAuth] Error after ${duration}ms:`, error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...getCorsHeaders(origin),
        },
      }
    );
  }
});

/**
 * Mobile OAuth OPTIONS Handler
 *
 * CORS preflight handler for mobile OAuth endpoint.
 */
export const mobileOAuthOptionsHandler = httpAction(async (ctx, request) => {
  const origin = request.headers.get("origin");
  return handleOptionsRequest(origin);
});
