/**
 * Validate CLI Session Route
 *
 * GET /api/v1/auth/cli/validate
 *
 * Validates a CLI session token and returns user info.
 *
 * Response (success):
 * {
 *   "valid": true,
 *   "user": { "id": "...", "email": "..." },
 *   "expiresAt": 1704567890000
 * }
 *
 * Response (invalid):
 * {
 *   "valid": false,
 *   "error": "Token expired"
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { api } from "@convex/_generated/api";
import { fetchQuery } from "convex/nextjs";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json(
      {
        valid: false,
        error: "Missing or invalid Authorization header",
      },
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
        {
          valid: false,
          error: "Invalid or expired session",
        },
        { status: 401 }
      );
    }

    // Return CLI-compatible format with valid field
    // Include userId and email at root level for CLI compatibility
    return NextResponse.json({
      valid: true,
      // Root-level fields for CLI compatibility
      userId: userInfo.userId,
      email: userInfo.email,
      // Nested user object for richer info
      user: {
        id: userInfo.userId,
        email: userInfo.email,
        name: userInfo.email.split("@")[0], // Fallback name from email
      },
      organizations: userInfo.organizations,
      expiresAt: userInfo.expiresAt,
    });
  } catch (error: unknown) {
    console.error("CLI session validation error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        valid: false,
        error: "Failed to validate session",
        error_description: errorMessage,
      },
      { status: 500 }
    );
  }
}

