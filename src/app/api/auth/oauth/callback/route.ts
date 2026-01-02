/**
 * Unified OAuth Callback Route
 * 
 * GET /api/auth/oauth/callback
 * 
 * Handles OAuth callback for BOTH Platform UI and CLI.
 * Determines session type from state and routes accordingly.
 * 
 * This single callback URL can be used for all OAuth providers (GitHub, Microsoft, Google).
 */
import { NextRequest, NextResponse } from "next/server";
import { api } from "@convex/_generated/api";
import { fetchAction } from "convex/nextjs";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const state = searchParams.get("state");
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");
  const provider = searchParams.get("provider") as "microsoft" | "google" | "github" | null;

  // Handle OAuth errors
  if (error) {
    console.error("OAuth callback error:", error, errorDescription);
    
    // Try to get state to determine if this is CLI or platform
    try {
      if (state) {
        const stateRecord = await fetchAction(api.api.v1.oauthSignup.getOAuthSignupState, {
          state,
        });
        
        if (stateRecord && stateRecord.sessionType === "cli") {
          // CLI error - return JSON
          return NextResponse.json(
            { error: "OAuth authentication failed", error_description: errorDescription || error },
            { status: 400 }
          );
        }
      }
    } catch {
      // Fall through to platform error handling
    }
    
    // Platform error - redirect to home with error
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    return NextResponse.redirect(
      new URL(`/?error=${encodeURIComponent(errorDescription || error)}`, appUrl)
    );
  }

  // Validate required parameters
  if (!state || !code) {
    return NextResponse.json(
      { error: "Missing required parameters: state and code" },
      { status: 400 }
    );
  }

  try {
    // Get state record to determine session type and provider
    const stateRecord = await fetchAction(api.api.v1.oauthSignup.getOAuthSignupState, {
      state,
    });

    if (!stateRecord) {
      return NextResponse.json(
        { error: "Invalid or expired state token" },
        { status: 400 }
      );
    }

    // Determine provider from state or query param
    const oauthProvider = stateRecord.provider || provider;
    if (!oauthProvider || !["microsoft", "google", "github"].includes(oauthProvider)) {
      return NextResponse.json(
        { error: "Invalid OAuth provider" },
        { status: 400 }
      );
    }

    // Complete OAuth signup (handles both platform and CLI sessions)
    const result = await fetchAction(api.api.v1.oauthSignup.completeOAuthSignup, {
      sessionType: stateRecord.sessionType,
      provider: oauthProvider as "microsoft" | "google" | "github",
      code,
      state,
    });

    // Route based on session type
    if (stateRecord.sessionType === "cli") {
      // CLI: Redirect to CLI callback URL with token
      const redirectUrl = new URL(stateRecord.callbackUrl);
      redirectUrl.searchParams.set("token", result.token);
      return NextResponse.redirect(redirectUrl.toString());
    } else {
      // Platform: Redirect to platform home with session
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
      const redirectUrl = new URL("/", appUrl);
      redirectUrl.searchParams.set("session", result.token);
      redirectUrl.searchParams.set("isNewUser", result.isNewUser ? "true" : "false");
      redirectUrl.searchParams.set("oauthProvider", oauthProvider); // Store provider for "last used" tracking
      return NextResponse.redirect(redirectUrl.toString());
    }
  } catch (error: any) {
    console.error("OAuth callback error:", error);
    
    // Try to determine if this is CLI or platform from error context
    // For now, return JSON error (CLI-friendly) - platform can handle it
    return NextResponse.json(
      { error: "Failed to complete OAuth signup", error_description: error.message },
      { status: 500 }
    );
  }
}

