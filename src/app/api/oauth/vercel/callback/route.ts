import { NextRequest, NextResponse } from "next/server";
import { api } from "@convex/_generated/api";
import { fetchAction } from "convex/nextjs";

/**
 * Vercel OAuth Callback Handler
 *
 * Receives the authorization code from Vercel after the user grants permission.
 * Exchanges the code for an access token and redirects back to the app.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  console.log("[Vercel OAuth Callback] Received:", {
    hasCode: !!code,
    hasState: !!state,
    hasError: !!error,
  });

  // Handle OAuth errors (user denied, etc.)
  if (error) {
    console.error("[Vercel OAuth Callback] Error from Vercel:", {
      error,
      errorDescription,
    });
    return NextResponse.redirect(
      new URL(
        `/?window=integrations&error=${encodeURIComponent(
          errorDescription || error
        )}`,
        request.url
      )
    );
  }

  // Validate required parameters
  if (!code || !state) {
    console.error("[Vercel OAuth Callback] Missing code or state");
    return NextResponse.redirect(
      new URL("/?window=integrations&error=missing_oauth_params", request.url)
    );
  }

  try {
    // Build redirect URI for token exchange (must match the one used in authorization)
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/vercel/callback`;

    console.log("[Vercel OAuth Callback] Exchanging code for token...");

    // Exchange code for token via Convex action
    const result = await fetchAction(api.oauth.vercel.exchangeVercelCode, {
      code,
      state,
      redirectUri,
    });

    console.log("[Vercel OAuth Callback] Connection successful:", {
      connectionId: result.connectionId,
      returnUrl: result.returnUrl,
    });

    // If a returnUrl was provided (e.g. from builder), redirect back there
    if (result.returnUrl) {
      const returnUrl = new URL(result.returnUrl, request.url);
      returnUrl.searchParams.set("success", "vercel_connected");
      return NextResponse.redirect(returnUrl);
    }

    // Default: redirect back to integrations window
    return NextResponse.redirect(
      new URL(
        `/?window=integrations&success=vercel_connected&connection_id=${result.connectionId}`,
        request.url
      )
    );
  } catch (err) {
    console.error("[Vercel OAuth Callback] Error during token exchange:", err);

    const errorMessage = err instanceof Error ? err.message : "connection_failed";

    return NextResponse.redirect(
      new URL(
        `/?window=integrations&error=${encodeURIComponent(errorMessage)}`,
        request.url
      )
    );
  }
}
