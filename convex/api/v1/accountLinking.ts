/**
 * Account Linking HTTP API
 *
 * Handles the account linking flow when a user signs in with a new OAuth provider
 * but their email matches an existing account.
 *
 * Flow:
 * 1. User signs in with Apple -> email matches existing Google account
 * 2. Mobile OAuth returns { requiresLinking: true, linkingState: "..." }
 * 3. Mobile app shows confirmation prompt
 * 4. User confirms -> POST /api/v1/auth/link-account/confirm
 * 5. Backend links identity and returns session
 */

import { httpAction } from "../../_generated/server";
import type { Id } from "../../_generated/dataModel";
import { getCorsHeaders, handleOptionsRequest } from "./corsHeaders";

// Work around Convex type inference depth issues (TS2589) with large schemas
// eslint-disable-next-line @typescript-eslint/no-require-imports
const internal = require("../../_generated/api").internal;

// Helper to create JSON response
function jsonResponse(
  data: Record<string, unknown>,
  status: number,
  origin: string | null
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...getCorsHeaders(origin),
    },
  });
}

/**
 * POST /api/v1/auth/link-account/confirm
 *
 * Confirms account linking and completes the login.
 * Called when user approves linking their new OAuth provider to an existing account.
 */
export const confirmLinking = httpAction(async (ctx, request) => {
  const origin = request.headers.get("origin");

  try {
    const body = await request.json();
    const { linkingState, identityClaimToken } = body;

    if (!linkingState || typeof linkingState !== "string") {
      return jsonResponse(
        { success: false, error: "Missing linkingState" },
        400,
        origin
      );
    }

    // Get and validate linking state
    const state = await ctx.runQuery(
      internal.auth.identity.getLinkingState,
      { state: linkingState }
    );

    if (!state) {
      return jsonResponse(
        { success: false, error: "Invalid or expired linking state" },
        400,
        origin
      );
    }

    if (state.status === "expired") {
      return jsonResponse(
        { success: false, error: "Linking request has expired. Please try signing in again." },
        400,
        origin
      );
    }

    if (state.status !== "pending") {
      return jsonResponse(
        { success: false, error: `Linking already ${state.status}` },
        400,
        origin
      );
    }

    // Confirm the linking
    await ctx.runMutation(
      internal.auth.identity.confirmLinking,
      { state: linkingState }
    );

    // Link the new identity to the existing user
    await ctx.runMutation(internal.auth.identity.linkIdentity, {
      userId: state.targetUserId,
      provider: state.sourceProvider,
      providerUserId: state.sourceProviderUserId,
      providerEmail: state.sourceEmail,
      isApplePrivateRelay: state.sourceEmail.includes("privaterelay.appleid.com"),
      metadata: { name: state.sourceName },
    });

    const defaultOrganizationId = await ctx.runQuery(
      internal.api.v1.accountLinkingInternal.getUserDefaultOrg,
      { userId: state.targetUserId }
    );

    if (!defaultOrganizationId) {
      return jsonResponse(
        { success: false, error: "Linked account has no default organization" },
        400,
        origin
      );
    }

    // Create a session for the user
    const sessionId: Id<"sessions"> = await ctx.runMutation(
      internal.api.v1.oauthSignup.createPlatformSession,
      {
        userId: state.targetUserId,
        email: state.targetEmail,
        organizationId: defaultOrganizationId,
      }
    );

    let identityClaim:
      | {
          success: boolean;
          alreadyClaimed?: boolean;
          tokenType?: "guest_session_claim" | "telegram_org_claim";
          linkedOrganizationId?: Id<"organizations">;
          linkedSessionToken?: string;
          errorCode?: string;
        }
      | undefined;

    if (typeof identityClaimToken === "string" && identityClaimToken.length > 0) {
      identityClaim = await ctx.runMutation(
        internal.onboarding.identityClaims.consumeIdentityClaimToken,
        {
          signedToken: identityClaimToken,
          userId: state.targetUserId,
          organizationId: defaultOrganizationId,
          claimSource: "account_linking_confirm",
        }
      );
    }

    // Get user profile for response
    const user = await ctx.runQuery(
      internal.api.v1.mobileOAuthInternal.getUserProfileForMobile,
      {
        userId: state.targetUserId,
        organizationId: defaultOrganizationId,
      }
    );

    return jsonResponse(
      {
        success: true,
        sessionId,
        userId: state.targetUserId,
        email: state.targetEmail,
        linkedProvider: state.sourceProvider,
        user,
        identityClaim,
      },
      200,
      origin
    );
  } catch (error) {
    console.error("[Account Linking] Confirm error:", error);
    return jsonResponse(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to link accounts",
      },
      500,
      origin
    );
  }
});

/**
 * POST /api/v1/auth/link-account/reject
 *
 * Rejects account linking - user chose not to link accounts.
 * They can create a new account with a different email instead.
 */
export const rejectLinking = httpAction(async (ctx, request) => {
  const origin = request.headers.get("origin");

  try {
    const body = await request.json();
    const { linkingState } = body;

    if (!linkingState || typeof linkingState !== "string") {
      return jsonResponse(
        { success: false, error: "Missing linkingState" },
        400,
        origin
      );
    }

    // Reject the linking
    await ctx.runMutation(
      internal.auth.identity.rejectLinking,
      { state: linkingState }
    );

    return jsonResponse(
      {
        success: true,
        message: "Linking rejected. You can create a new account with a different email.",
      },
      200,
      origin
    );
  } catch (error) {
    console.error("[Account Linking] Reject error:", error);
    return jsonResponse(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to reject linking",
      },
      500,
      origin
    );
  }
});

/**
 * GET /api/v1/auth/link-account/status
 *
 * Check the status of a linking request.
 * Useful for polling if the mobile app needs to check state.
 */
export const getLinkingStatus = httpAction(async (ctx, request) => {
  const origin = request.headers.get("origin");

  try {
    const url = new URL(request.url);
    const linkingState = url.searchParams.get("state");

    if (!linkingState) {
      return jsonResponse(
        { success: false, error: "Missing state parameter" },
        400,
        origin
      );
    }

    const state = await ctx.runQuery(
      internal.auth.identity.getLinkingState,
      { state: linkingState }
    );

    if (!state) {
      return jsonResponse(
        { success: false, error: "Linking state not found" },
        404,
        origin
      );
    }

    return jsonResponse(
      {
        success: true,
        status: state.status,
        sourceProvider: state.sourceProvider,
        sourceEmail: state.sourceEmail,
        targetEmail: state.targetEmail,
        expiresAt: state.expiresAt,
        isExpired: state.expiresAt < Date.now(),
      },
      200,
      origin
    );
  } catch (error) {
    console.error("[Account Linking] Status error:", error);
    return jsonResponse(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get linking status",
      },
      500,
      origin
    );
  }
});

/**
 * POST /api/v1/auth/link-account/claim
 *
 * Claims an anonymous identity token for an already-authenticated platform session.
 * This allows idempotent "claim after login/signup" without replaying auth flows.
 */
export const claimIdentity = httpAction(async (ctx, request) => {
  const origin = request.headers.get("origin");

  try {
    const body = await request.json();
    const { sessionId, identityClaimToken } = body;

    if (!sessionId || typeof sessionId !== "string") {
      return jsonResponse(
        { success: false, error: "Missing sessionId" },
        400,
        origin
      );
    }

    if (!identityClaimToken || typeof identityClaimToken !== "string") {
      return jsonResponse(
        { success: false, error: "Missing identityClaimToken" },
        400,
        origin
      );
    }

    const sessionLookup = await ctx.runQuery(
      internal.api.v1.accountLinkingInternal.getPlatformSession,
      { sessionId }
    ) as
      | { status: "invalid_session_id" }
      | { status: "invalid_or_expired" }
      | {
          status: "active";
          session: {
            userId: Id<"users">;
            organizationId: Id<"organizations">;
          };
        };

    if (sessionLookup.status === "invalid_session_id") {
      return jsonResponse(
        { success: false, error: "Invalid sessionId" },
        400,
        origin
      );
    }

    if (sessionLookup.status !== "active") {
      return jsonResponse(
        { success: false, error: "Invalid or expired session" },
        401,
        origin
      );
    }

    const session = sessionLookup.session;

    const claimResult = await ctx.runMutation(
      internal.onboarding.identityClaims.consumeIdentityClaimToken,
      {
        signedToken: identityClaimToken,
        userId: session.userId,
        organizationId: session.organizationId,
        claimSource: "account_linking_claim_endpoint",
      }
    );

    if (!claimResult.success) {
      return jsonResponse(
        {
          success: false,
          error: "Unable to claim identity token",
          errorCode: claimResult.errorCode,
        },
        400,
        origin
      );
    }

    return jsonResponse(
      {
        success: true,
        claim: claimResult,
      },
      200,
      origin
    );
  } catch (error) {
    console.error("[Account Linking] Claim error:", error);
    return jsonResponse(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to claim identity token",
      },
      500,
      origin
    );
  }
});

/**
 * OPTIONS handler for CORS preflight
 */
export const handleOptions = httpAction(async (ctx, request) => {
  const origin = request.headers.get("origin");
  return handleOptionsRequest(origin);
});
