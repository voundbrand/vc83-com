/**
 * Refresh CLI Session Route
 * 
 * POST /api/v1/auth/cli/refresh
 * 
 * Refreshes an expired or soon-to-expire CLI session.
 */

import { NextRequest, NextResponse } from "next/server";
import { api } from "@convex/_generated/api";
import { fetchMutation } from "convex/nextjs";

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("Authorization");
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Missing or invalid Authorization header" },
      { status: 401 }
    );
  }

  const token = authHeader.substring(7);

  try {
    const result = await fetchMutation(api.api.v1.cliAuth.refreshCliSession, {
      token,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("CLI session refresh error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to refresh session", error_description: errorMessage },
      { status: 500 }
    );
  }
}

