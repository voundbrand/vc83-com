/**
 * Validate CLI Session Route
 * 
 * GET /api/v1/auth/cli/validate
 * 
 * Validates a CLI session token and returns user info.
 */

import { NextRequest, NextResponse } from "next/server";
import { api } from "@convex/_generated/api";
import { fetchQuery } from "convex/nextjs";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("Authorization");
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Missing or invalid Authorization header" },
      { status: 401 }
    );
  }

  const token = authHeader.substring(7);

  try {
    const userInfo = await fetchQuery(api.api.v1.cliAuth.validateCliSession, {
      token,
    });

    if (!userInfo) {
      return NextResponse.json(
        { error: "Invalid or expired session" },
        { status: 401 }
      );
    }

    return NextResponse.json(userInfo);
  } catch (error: any) {
    console.error("CLI session validation error:", error);
    return NextResponse.json(
      { error: "Failed to validate session", error_description: error.message },
      { status: 500 }
    );
  }
}

