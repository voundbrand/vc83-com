/**
 * Unified OAuth Signup Initiation
 * 
 * GET /api/auth/oauth-signup
 * 
 * Initiates OAuth signup flow for both Platform UI and CLI.
 * 
 * Query params:
 * - provider: "microsoft" | "google" | "github"
 * - sessionType: "platform" | "cli" (defaults to "platform")
 * - callback: Callback URL (required for CLI, optional for platform - defaults to platform home)
 * - organizationName: Optional organization name for new accounts
 */
import { NextRequest, NextResponse } from "next/server";
import { api } from "@convex/_generated/api";
import { fetchAction } from "convex/nextjs";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const provider = searchParams.get("provider") as "microsoft" | "google" | "github" | null;
  const sessionType = (searchParams.get("sessionType") as "platform" | "cli") || "platform";
  const callback = searchParams.get("callback");
  const organizationName = searchParams.get("organizationName");
  const cliState = searchParams.get("cliState"); // CLI's original state for CSRF protection

  if (!provider || !["microsoft", "google", "github"].includes(provider)) {
    return NextResponse.json(
      { error: "Invalid or missing provider. Must be 'microsoft', 'google', or 'github'" },
      { status: 400 }
    );
  }

  // CLI requires callback URL
  if (sessionType === "cli" && !callback) {
    return NextResponse.json(
      { error: "Callback URL required for CLI sessions" },
      { status: 400 }
    );
  }

  // Determine callback URL (CLI callback is where to redirect after OAuth, not the OAuth callback)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
  const callbackUrl = callback || `${appUrl}/`; // Platform defaults to home, CLI requires explicit callback

  try {
    // Generate OAuth state and get provider auth URL
    const state = crypto.randomUUID();
    const cliToken = sessionType === "cli" ? `cli_session_${crypto.randomUUID().replace(/-/g, '')}` : undefined;

    // Store state
    await fetchAction(api.api.v1.oauthSignup.storeOAuthSignupState, {
      state,
      sessionType,
      callbackUrl,
      provider,
      organizationName: organizationName || undefined,
      cliToken,
      cliState: cliState || undefined, // CLI's original state for CSRF protection
      createdAt: Date.now(),
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
    });

    // Use unified callback URL for all OAuth providers
    const redirectUri = `${appUrl}/api/auth/oauth/callback`;

    let authUrl = '';
    
    if (provider === "github") {
      const clientId = process.env.GITHUB_OAUTH_CLIENT_ID;
      if (!clientId) {
        return NextResponse.json(
          { 
            error: "GitHub OAuth not configured", 
            error_description: "GITHUB_OAUTH_CLIENT_ID environment variable is not set. Please configure GitHub OAuth credentials."
          },
          { status: 500 }
        );
      }
      const githubAuthUrl = "https://github.com/login/oauth/authorize";
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        scope: "read:user user:email",
        state,
        allow_signup: "false",
      });
      authUrl = `${githubAuthUrl}?${params.toString()}`;
    } else if (provider === "microsoft") {
      const clientId = process.env.MICROSOFT_CLIENT_ID;
      if (!clientId) {
        return NextResponse.json(
          { 
            error: "Microsoft OAuth not configured", 
            error_description: "MICROSOFT_CLIENT_ID environment variable is not set. Please configure Microsoft OAuth credentials."
          },
          { status: 500 }
        );
      }
      const microsoftAuthUrl = "https://login.microsoftonline.com/common/oauth2/v2.0/authorize";
      const params = new URLSearchParams({
        client_id: clientId,
        response_type: "code",
        redirect_uri: redirectUri,
        response_mode: "query",
        scope: "openid profile email",
        state,
      });
      authUrl = `${microsoftAuthUrl}?${params.toString()}`;
    } else if (provider === "google") {
      const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
      if (!clientId) {
        return NextResponse.json(
          { 
            error: "Google OAuth not configured", 
            error_description: "GOOGLE_OAUTH_CLIENT_ID environment variable is not set. Please configure Google OAuth credentials. See docs/OAUTH_PROVIDER_SETUP.md for setup instructions."
          },
          { status: 500 }
        );
      }
      const googleAuthUrl = "https://accounts.google.com/o/oauth2/v2/auth";
      const params = new URLSearchParams({
        client_id: clientId,
        response_type: "code",
        redirect_uri: redirectUri,
        scope: "openid profile email",
        state,
      });
      authUrl = `${googleAuthUrl}?${params.toString()}`;
    }

    return NextResponse.redirect(authUrl);
  } catch (error: any) {
    console.error("OAuth signup initiation error:", error);
    return NextResponse.json(
      { error: "Failed to initiate OAuth signup", error_description: error.message },
      { status: 500 }
    );
  }
}

