/**
 * WhatsApp OAuth Callback Route
 *
 * Handles the OAuth redirect from Meta after user authorizes WhatsApp Business access.
 * Exchanges authorization code for access tokens and stores connection in database.
 */

import { NextRequest, NextResponse } from "next/server";
import { api } from "@convex/_generated/api";
import { fetchAction } from "convex/nextjs";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const errorReason = searchParams.get("error_reason");
  const errorDescription = searchParams.get("error_description");

  // Handle OAuth errors (user denied, etc.)
  if (error) {
    console.error("WhatsApp OAuth error:", {
      error,
      errorReason,
      errorDescription,
    });

    const errorMsg = errorDescription || errorReason || error;
    return NextResponse.redirect(
      new URL(
        `/?window=integrations&tab=messaging&error=${encodeURIComponent(errorMsg)}`,
        request.url
      )
    );
  }

  // Validate required parameters
  if (!code || !state) {
    console.error("Missing OAuth parameters:", { code: !!code, state: !!state });
    return NextResponse.redirect(
      new URL(
        "/?window=integrations&tab=messaging&error=missing_oauth_params",
        request.url
      )
    );
  }

  try {
    // Call Convex backend to exchange code for tokens
    const result = await fetchAction(api.oauth.whatsapp.handleWhatsAppCallback, {
      code,
      state,
    });

    // Build success URL with connection details
    const successParams = new URLSearchParams({
      window: "integrations",
      tab: "messaging",
      success: "whatsapp_connected",
    });

    if (result.businessName) {
      successParams.set("business", result.businessName);
    }
    if (result.phoneNumber) {
      successParams.set("phone", result.phoneNumber);
    }

    return NextResponse.redirect(
      new URL(`/?${successParams.toString()}`, request.url)
    );
  } catch (error) {
    console.error("WhatsApp OAuth callback error:", error);

    const errorMessage =
      error instanceof Error ? error.message : "connection_failed";

    return NextResponse.redirect(
      new URL(
        `/?window=integrations&tab=messaging&error=${encodeURIComponent(errorMessage)}`,
        request.url
      )
    );
  }
}
