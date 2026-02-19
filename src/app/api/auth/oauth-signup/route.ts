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
import { fetchAction } from "convex/nextjs";
import {
  isMissingOAuthSignupStoreStateFunctionError,
  OAUTH_SIGNUP_STORE_STATE_MISSING_MESSAGE,
} from "@/lib/auth/oauth-signup-runtime";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const generatedApi: any = require("@convex/_generated/api");

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const provider = searchParams.get("provider") as "microsoft" | "google" | "github" | null;
  const sessionType = (searchParams.get("sessionType") as "platform" | "cli") || "platform";
  const callback = searchParams.get("callback");
  const organizationName = searchParams.get("organizationName");
  const cliState = searchParams.get("cliState"); // CLI's original state for CSRF protection
  const identityClaimToken = searchParams.get("identityClaimToken");
  const onboardingChannel = searchParams.get("onboardingChannel");

  const onboardingCampaign = {
    source: searchParams.get("utm_source") || searchParams.get("utmSource") || undefined,
    medium: searchParams.get("utm_medium") || searchParams.get("utmMedium") || undefined,
    campaign: searchParams.get("utm_campaign") || searchParams.get("utmCampaign") || undefined,
    content: searchParams.get("utm_content") || searchParams.get("utmContent") || undefined,
    term: searchParams.get("utm_term") || searchParams.get("utmTerm") || undefined,
    referrer: searchParams.get("referrer") || undefined,
    landingPath: searchParams.get("landingPath") || undefined,
  };
  const hasOnboardingCampaign = Object.values(onboardingCampaign).some((value) => typeof value === "string" && value.length > 0);

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
    const runAction = fetchAction as any;

    // Generate OAuth state and get provider auth URL
    const state = crypto.randomUUID();
    const cliToken = sessionType === "cli" ? `cli_session_${crypto.randomUUID().replace(/-/g, '')}` : undefined;

    // Debug: Log the token being stored
    if (cliToken) {
      console.log(`[OAuth Signup] Storing CLI token: ${cliToken.substring(0, 30)}... (length: ${cliToken.length})`);
    }

    // Store state
    await runAction(generatedApi.api.api.v1.oauthSignup.storeOAuthSignupState, {
      state,
      sessionType,
      callbackUrl,
      provider,
      organizationName: organizationName || undefined,
      identityClaimToken: identityClaimToken || undefined,
      onboardingChannel: onboardingChannel || undefined,
      onboardingCampaign: hasOnboardingCampaign ? onboardingCampaign : undefined,
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
  } catch (error: unknown) {
    console.error("OAuth signup initiation error:", error);
    if (isMissingOAuthSignupStoreStateFunctionError(error)) {
      return NextResponse.json(
        {
          error: OAUTH_SIGNUP_STORE_STATE_MISSING_MESSAGE,
          error_description: "Run `npx convex deploy` so storeOAuthSignupState is available at runtime.",
        },
        { status: 503 }
      );
    }

    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to initiate OAuth signup", error_description: errorMessage },
      { status: 500 }
    );
  }
}
