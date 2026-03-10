/**
 * Unified Login Initiation
 *
 * GET /api/auth/login/init
 *
 * Initiates OAuth login for multiple client types through one endpoint.
 *
 * Query params:
 * - client: "cli" | "macos_companion" | "operator_mobile" | "platform_web" (default: "platform_web")
 * - provider: "apple" | "microsoft" | "google" | "github" (optional; required for direct provider redirect)
 * - callback: Required for "cli", "macos_companion", and "operator_mobile" clients
 * - state: Optional client-side CSRF state echoed back in callback for external clients
 *
 * Additional oauth-signup passthrough params are supported:
 * - organizationName, betaCode/beta_code, identityClaimToken, onboardingChannel,
 *   utm_source/utm_medium/utm_campaign/utm_content/utm_term, referrer, landingPath,
 *   deviceType/device_type
 */

import { NextRequest, NextResponse } from "next/server";

type LoginClient = "cli" | "macos_companion" | "operator_mobile" | "platform_web";
type OAuthProvider = "apple" | "microsoft" | "google" | "github";

function normalizeClient(raw: string | null): LoginClient | null {
  switch ((raw || "platform_web").trim().toLowerCase()) {
    case "cli":
      return "cli";
    case "macos":
    case "desktop":
    case "macos_companion":
      return "macos_companion";
    case "mobile":
    case "operator_mobile":
      return "operator_mobile";
    case "web":
    case "platform":
    case "platform_web":
      return "platform_web";
    default:
      return null;
  }
}

function normalizeProvider(raw: string | null): OAuthProvider | null {
  if (!raw) {
    return null;
  }

  switch (raw.trim().toLowerCase()) {
    case "apple":
    case "microsoft":
    case "google":
    case "github":
      return raw.trim().toLowerCase() as OAuthProvider;
    default:
      return null;
  }
}

function copyIfPresent(searchParams: URLSearchParams, destination: URLSearchParams, sourceKey: string, targetKey = sourceKey) {
  const value = searchParams.get(sourceKey);
  if (value && value.trim().length > 0) {
    destination.set(targetKey, value);
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const client = normalizeClient(searchParams.get("client"));

  if (!client) {
    return NextResponse.json(
      { error: "Invalid client. Must be one of: cli, macos_companion, operator_mobile, platform_web" },
      { status: 400 }
    );
  }

  const providerParam = searchParams.get("provider");
  const provider = normalizeProvider(providerParam);
  if (providerParam && !provider) {
    return NextResponse.json(
      { error: "Invalid provider. Must be one of: apple, microsoft, google, github" },
      { status: 400 }
    );
  }

  const callback = searchParams.get("callback");
  const state = searchParams.get("state");
  const requiresExternalCallback =
    client === "cli" || client === "macos_companion" || client === "operator_mobile";

  if (requiresExternalCallback && (!callback || callback.trim().length === 0)) {
    return NextResponse.json(
      { error: "Callback URL required for cli, macos_companion, and operator_mobile clients" },
      { status: 400 }
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
  const sessionType =
    client === "operator_mobile" || client === "platform_web"
      ? "platform"
      : "cli";

  if (provider) {
    const oauthSignupURL = new URL("/api/auth/oauth-signup", appUrl);
    oauthSignupURL.searchParams.set("provider", provider);
    oauthSignupURL.searchParams.set("sessionType", sessionType);

    if (callback && callback.trim().length > 0) {
      oauthSignupURL.searchParams.set("callback", callback);
    }
    if (state && state.trim().length > 0) {
      oauthSignupURL.searchParams.set("cliState", state);
    }

    copyIfPresent(searchParams, oauthSignupURL.searchParams, "organizationName");
    copyIfPresent(searchParams, oauthSignupURL.searchParams, "identityClaimToken");
    copyIfPresent(searchParams, oauthSignupURL.searchParams, "onboardingChannel");
    copyIfPresent(searchParams, oauthSignupURL.searchParams, "betaCode");
    copyIfPresent(searchParams, oauthSignupURL.searchParams, "beta_code");
    copyIfPresent(searchParams, oauthSignupURL.searchParams, "utm_source");
    copyIfPresent(searchParams, oauthSignupURL.searchParams, "utm_medium");
    copyIfPresent(searchParams, oauthSignupURL.searchParams, "utm_campaign");
    copyIfPresent(searchParams, oauthSignupURL.searchParams, "utm_content");
    copyIfPresent(searchParams, oauthSignupURL.searchParams, "utm_term");
    copyIfPresent(searchParams, oauthSignupURL.searchParams, "referrer");
    copyIfPresent(searchParams, oauthSignupURL.searchParams, "landingPath");
    copyIfPresent(searchParams, oauthSignupURL.searchParams, "deviceType");
    copyIfPresent(searchParams, oauthSignupURL.searchParams, "device_type");

    return NextResponse.redirect(oauthSignupURL);
  }

  if (requiresExternalCallback) {
    const chooserURL = new URL("/auth/cli-login", appUrl);
    chooserURL.searchParams.set("callback", callback!);
    chooserURL.searchParams.set("client", client);
    if (state && state.trim().length > 0) {
      chooserURL.searchParams.set("state", state);
    }
    return NextResponse.redirect(chooserURL);
  }

  return NextResponse.json(
    {
      error: "Provider required for platform_web login init requests",
    },
    { status: 400 }
  );
}
