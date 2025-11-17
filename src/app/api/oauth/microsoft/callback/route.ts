/**
 * Microsoft OAuth Callback Route
 *
 * Handles the OAuth redirect from Microsoft after user authorizes the app.
 * Exchanges authorization code for access tokens and redirects back to Settings.
 */

import { NextRequest, NextResponse } from "next/server";
import { api } from "@convex/_generated/api";
import { fetchAction } from "convex/nextjs";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  // Handle OAuth errors (user denied, etc.)
  if (error) {
    console.error("OAuth error:", error, errorDescription);
    return NextResponse.redirect(
      new URL(
        `/?tab=integrations&error=${encodeURIComponent(
          errorDescription || error
        )}`,
        request.url
      )
    );
  }

  // Validate required parameters
  if (!code || !state) {
    console.error("Missing OAuth parameters:", { code: !!code, state: !!state });
    return NextResponse.redirect(
      new URL("/?tab=integrations&error=missing_oauth_params", request.url)
    );
  }

  try {
    // Call Convex backend to exchange code for tokens
    const result = await fetchAction(api.oauth.microsoft.handleMicrosoftCallback, {
      code,
      state,
    });

    // Redirect to Settings with success message
    return NextResponse.redirect(
      new URL(
        `/?tab=integrations&success=microsoft_connected&email=${encodeURIComponent(
          result.providerEmail
        )}`,
        request.url
      )
    );
  } catch (error) {
    console.error("OAuth callback error:", error);

    // Extract error message
    const errorMessage = error instanceof Error
      ? error.message
      : "connection_failed";

    return NextResponse.redirect(
      new URL(
        `/?tab=integrations&error=${encodeURIComponent(errorMessage)}`,
        request.url
      )
    );
  }
}
