import { NextRequest, NextResponse } from "next/server";
import { api } from "../../../../../../convex/_generated/api";
import { fetchAction } from "convex/nextjs";

/**
 * Vercel OAuth Callback Handler
 *
 * This endpoint receives the authorization code from Vercel after the user grants permission.
 * It exchanges the code for an access token and stores the connection.
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

  // Handle OAuth errors
  if (error) {
    console.error("[Vercel OAuth Callback] Error from Vercel:", {
      error,
      errorDescription,
    });

    return NextResponse.redirect(
      new URL(
        `/oauth/error?provider=vercel&error=${encodeURIComponent(error)}&description=${encodeURIComponent(errorDescription || "")}`,
        process.env.NEXT_PUBLIC_APP_URL
      )
    );
  }

  // Validate required parameters
  if (!code || !state) {
    console.error("[Vercel OAuth Callback] Missing code or state");
    return NextResponse.redirect(
      new URL(
        "/oauth/error?provider=vercel&error=missing_params&description=Missing authorization code or state",
        process.env.NEXT_PUBLIC_APP_URL
      )
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
    });

    // Redirect to success page
    return NextResponse.redirect(
      new URL(
        `/?vercel_connected=true&connection_id=${result.connectionId}`,
        process.env.NEXT_PUBLIC_APP_URL
      )
    );
  } catch (error) {
    console.error("[Vercel OAuth Callback] Error during token exchange:", error);

    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    return NextResponse.redirect(
      new URL(
        `/oauth/error?provider=vercel&error=exchange_failed&description=${encodeURIComponent(errorMessage)}`,
        process.env.NEXT_PUBLIC_APP_URL
      )
    );
  }
}
