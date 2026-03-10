/**
 * Unified OAuth Callback Route
 *
 * GET/POST /api/auth/oauth/callback
 *
 * Handles OAuth callback for BOTH Platform UI and CLI.
 * Determines session type from state and routes accordingly.
 *
 * Apple uses `response_mode=form_post`, so this route supports POST in addition to GET.
 * This single callback URL can be used for Apple, GitHub, Microsoft, and Google.
 */
import { NextRequest, NextResponse } from "next/server";
import { fetchAction } from "convex/nextjs";
const generatedApi: any = require("@convex/_generated/api");

type OAuthProvider = "apple" | "microsoft" | "google" | "github";

type CallbackParams = {
  state: string | null;
  code: string | null;
  error: string | null;
  errorDescription: string | null;
  provider: OAuthProvider | null;
};

function shouldUseExternalPlatformCallback(callbackUrl: string, appUrl: string): boolean {
  try {
    const callback = new URL(callbackUrl);
    const appBase = new URL(appUrl);

    const isHttp = callback.protocol === "http:" || callback.protocol === "https:";
    if (!isHttp) {
      return true;
    }

    return callback.origin !== appBase.origin;
  } catch {
    // Fail closed: if URL cannot be parsed, do not attempt external redirect.
    return false;
  }
}

function toStringValue(value: FormDataEntryValue | null): string | null {
  return typeof value === "string" ? value : null;
}

async function getCallbackParams(request: NextRequest): Promise<CallbackParams> {
  if (request.method === "POST") {
    const formData = await request.formData();
    return {
      state: toStringValue(formData.get("state")),
      code: toStringValue(formData.get("code")),
      error: toStringValue(formData.get("error")),
      errorDescription: toStringValue(formData.get("error_description")),
      provider: toStringValue(formData.get("provider")) as OAuthProvider | null,
    };
  }

  const searchParams = request.nextUrl.searchParams;
  return {
    state: searchParams.get("state"),
    code: searchParams.get("code"),
    error: searchParams.get("error"),
    errorDescription: searchParams.get("error_description"),
    provider: searchParams.get("provider") as OAuthProvider | null,
  };
}

// Helper to wait for session to be readable (handles Convex eventual consistency)
// validateCliSession is now an Action (uses bcrypt verification)
async function waitForSession(token: string, maxAttempts = 5, delayMs = 100): Promise<boolean> {
  const runAction = fetchAction as any;
  for (let i = 0; i < maxAttempts; i++) {
    const session = await runAction(generatedApi.api.api.v1.cliAuth.validateCliSession, { token });
    if (session) {
      console.log(`[OAuth Callback] Session verified after ${i + 1} attempt(s)`);
      return true;
    }
    if (i < maxAttempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  console.error(`[OAuth Callback] Session not found after ${maxAttempts} attempts`);
  return false;
}

async function handleOAuthCallback(request: NextRequest) {
  const runAction = fetchAction as any;
  const { state, code, error, errorDescription, provider } = await getCallbackParams(request);

  // Handle OAuth errors
  if (error) {
    console.error("OAuth callback error:", error, errorDescription);

    // Try to get state to determine if this is CLI or platform
    try {
      if (state) {
        const stateRecord = await runAction(generatedApi.api.api.v1.oauthSignup.getOAuthSignupState, {
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
    const stateRecord = await runAction(generatedApi.api.api.v1.oauthSignup.getOAuthSignupState, {
      state,
    });

    if (!stateRecord) {
      return NextResponse.json(
        { error: "Invalid or expired state token" },
        { status: 400 }
      );
    }

    // Determine provider from state or callback param.
    const oauthProvider = (stateRecord.provider || provider) as OAuthProvider | null;
    if (!oauthProvider || !["apple", "microsoft", "google", "github"].includes(oauthProvider)) {
      return NextResponse.json(
        { error: "Invalid OAuth provider" },
        { status: 400 }
      );
    }

    // Complete OAuth signup (handles both platform and CLI sessions)
    const result = await runAction(generatedApi.api.api.v1.oauthSignup.completeOAuthSignup, {
      sessionType: stateRecord.sessionType,
      provider: oauthProvider,
      code,
      state,
    });

    // Route based on session type
    if (stateRecord.sessionType === "cli") {
      // Debug: Log token details
      console.log(
        `[OAuth Callback] CLI result.token: ${result.token.substring(0, 30)}... (length: ${result.token.length})`
      );

      // Wait for session to be readable before redirecting (handles Convex eventual consistency)
      const sessionReady = await waitForSession(result.token);
      if (!sessionReady) {
        console.error("[OAuth Callback] CLI session creation may have failed - session not readable");
        // Still redirect, but log the issue - CLI will get 401 and can retry
      }

      // CLI: Redirect to CLI callback URL with token and original state
      const redirectUrl = new URL(stateRecord.callbackUrl);
      redirectUrl.searchParams.set("token", result.token);
      // Include CLI's original state for CSRF validation on the CLI side
      if (stateRecord.cliState) {
        redirectUrl.searchParams.set("state", stateRecord.cliState);
      }

      // Debug: Log the full redirect URL
      console.log(`[OAuth Callback] Redirect URL: ${redirectUrl.toString()}`);
      console.log(
        `[OAuth Callback] Token in URL: ${redirectUrl.searchParams.get("token")?.substring(0, 30)}...`
      );

      return NextResponse.redirect(redirectUrl.toString());
    }

    // Platform: either redirect back to an external callback (mobile app), or to web home.
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    if (shouldUseExternalPlatformCallback(stateRecord.callbackUrl, appUrl)) {
      const externalRedirectUrl = new URL(stateRecord.callbackUrl);
      externalRedirectUrl.searchParams.set("session", result.token);
      externalRedirectUrl.searchParams.set("isNewUser", result.isNewUser ? "true" : "false");
      externalRedirectUrl.searchParams.set("oauthProvider", oauthProvider);
      if (stateRecord.cliState) {
        externalRedirectUrl.searchParams.set("state", stateRecord.cliState);
      }
      return NextResponse.redirect(externalRedirectUrl.toString());
    }

    const redirectUrl = new URL("/", appUrl);
    redirectUrl.searchParams.set("session", result.token);
    redirectUrl.searchParams.set("isNewUser", result.isNewUser ? "true" : "false");
    redirectUrl.searchParams.set("oauthProvider", oauthProvider); // Store provider for "last used" tracking
    return NextResponse.redirect(redirectUrl.toString());
  } catch (callbackError: unknown) {
    console.error("OAuth callback error:", callbackError);
    const errorMessage = callbackError instanceof Error ? callbackError.message : "Unknown error";

    return NextResponse.json(
      { error: "Failed to complete OAuth signup", error_description: errorMessage },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return handleOAuthCallback(request);
}

export async function POST(request: NextRequest) {
  return handleOAuthCallback(request);
}
