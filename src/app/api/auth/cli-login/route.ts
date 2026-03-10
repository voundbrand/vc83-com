import { NextRequest, NextResponse } from "next/server";

/**
 * Legacy CLI login route.
 *
 * Backward-compatible shim that forwards to the unified login init endpoint.
 */

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const loginInitURL = new URL("/api/auth/login/init", request.nextUrl.origin);
  loginInitURL.searchParams.set("client", "cli");

  const callback = searchParams.get("callback");
  if (callback && callback.trim().length > 0) {
    loginInitURL.searchParams.set("callback", callback);
  }

  const provider = searchParams.get("provider");
  if (provider && provider.trim().length > 0) {
    loginInitURL.searchParams.set("provider", provider);
  }

  const state = searchParams.get("state");
  if (state && state.trim().length > 0) {
    loginInitURL.searchParams.set("state", state);
  }

  return NextResponse.redirect(loginInitURL);
}
