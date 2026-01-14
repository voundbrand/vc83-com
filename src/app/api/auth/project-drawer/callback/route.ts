/**
 * PROJECT DRAWER MAGIC LINK CALLBACK
 *
 * GET /api/auth/project-drawer/callback
 *
 * Validates magic link token and creates frontend session.
 * Redirects user to the original page with session data in URL params.
 */

import { NextRequest, NextResponse } from "next/server";
import { fetchMutation } from "convex/nextjs";
import { api } from "../../../../../../convex/_generated/api";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const token = searchParams.get("token");
  const redirect = searchParams.get("redirect") || "/";

  // Validate token presence
  if (!token) {
    return createErrorRedirect(redirect, "missing_token", "No token provided");
  }

  try {
    // Get user agent and IP for security tracking
    const userAgent = request.headers.get("user-agent") || undefined;
    const forwardedFor = request.headers.get("x-forwarded-for");
    const ipAddress = forwardedFor?.split(",")[0]?.trim() || undefined;

    // Validate the magic link and create session
    const result = await fetchMutation(api.projectDrawerAuth.validateMagicLink, {
      token,
      userAgent,
      ipAddress,
    });

    if (!result.success) {
      return createErrorRedirect(redirect, "validation_failed", "Token validation failed");
    }

    // Build redirect URL with session data
    // The frontend will read these params and store the session
    const redirectUrl = new URL(redirect, request.nextUrl.origin);

    // Add session data as URL params (will be consumed and removed by frontend)
    redirectUrl.searchParams.set("drawer_session", result.sessionId);
    redirectUrl.searchParams.set("drawer_email", result.contactEmail);
    redirectUrl.searchParams.set("drawer_expires", result.expiresAt.toString());
    redirectUrl.searchParams.set("drawer_auth_success", "true");

    // Redirect to the original page
    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error("Magic link callback error:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Token validation failed";

    return createErrorRedirect(redirect, "error", errorMessage);
  }
}

/**
 * Create a redirect response with error params
 */
function createErrorRedirect(
  redirectPath: string,
  errorCode: string,
  errorMessage: string
): NextResponse {
  // For errors, redirect to the page with error params
  const errorUrl = new URL(redirectPath, process.env.NEXT_PUBLIC_APP_URL || "https://l4yercak3.com");
  errorUrl.searchParams.set("drawer_auth_error", errorCode);
  errorUrl.searchParams.set("drawer_auth_message", errorMessage);

  return NextResponse.redirect(errorUrl);
}
