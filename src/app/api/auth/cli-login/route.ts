/**
 * CLI Login Initiation Route
 * 
 * GET /api/auth/cli-login
 * 
 * Initiates CLI authentication flow.
 * If provider specified, redirects directly to OAuth.
 * Otherwise, shows provider selection page.
 * Uses the same OAuth providers as platform login (Microsoft, Google, GitHub).
 */

import { NextRequest, NextResponse } from "next/server";
import { api } from "@convex/_generated/api";
import { fetchAction } from "convex/nextjs";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const callbackUrl = searchParams.get("callback") || "http://localhost:3001/callback";
  const provider = searchParams.get("provider") as "microsoft" | "google" | "github" | null;

  try {
    // Initiate CLI login (creates state and returns OAuth URL or selection page)
    // @ts-expect-error - Deep type instantiation in Convex generated types
    const result = await fetchAction(api.api.v1.cliAuth.initiateCliLogin, {
      callbackUrl,
      provider: provider || undefined,
    });

    // If provider was specified, redirect directly to OAuth
    // Otherwise, redirect to provider selection page
    return NextResponse.redirect(result.authUrl);
  } catch (error: unknown) {
    console.error("CLI login initiation error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to initiate CLI login", error_description: errorMessage },
      { status: 500 }
    );
  }
}

