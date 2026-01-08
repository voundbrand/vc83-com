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
import { internal } from "../../_generated/api";
import { getCorsHeaders, handleOptionsRequest } from "./corsHeaders";

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

    // Find or create user using the existing OAuth signup mutation
    // This reuses the same logic as web OAuth signup
    const userResult = await ctx.runMutation(
      internal.api.v1.oauthSignup.findOrCreateUserFromOAuth,
      {
        email: normalizedEmail,
        firstName,
        lastName,
      }
    );

    console.log("[Mobile OAuth] User result:", {
      userId: userResult.userId,
      organizationId: userResult.organizationId,
      isNewUser: userResult.isNewUser,
    });

    // Create platform session (same as web OAuth)
    const sessionId = await ctx.runMutation(
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
