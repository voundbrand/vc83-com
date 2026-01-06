/**
 * Sync User Route for NextAuth Integration
 *
 * POST /api/v1/auth/sync-user
 *
 * Called by customer's NextAuth integration to sync users to L4YERCAK3 backend.
 * This allows customers to use their own NextAuth configuration while syncing
 * authenticated users to the platform.
 *
 * Authentication: API Key (Bearer token in Authorization header)
 *
 * Request body:
 * {
 *   "email": "user@example.com",
 *   "name": "John Doe",
 *   "image": "https://...",
 *   "provider": "google",
 *   "providerAccountId": "123456789",
 *   "accessToken": "...",
 *   "refreshToken": "...",
 *   "expiresAt": 1704567890
 * }
 *
 * Response (success):
 * {
 *   "userId": "user_abc123",
 *   "organizationId": "org_xyz789",
 *   "isNewUser": true,
 *   "email": "user@example.com"
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { api } from "@convex/_generated/api";
import { fetchAction } from "convex/nextjs";

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Missing or invalid Authorization header" },
      { status: 401 }
    );
  }

  const apiKey = authHeader.substring(7);

  // Validate API key format
  if (!apiKey.startsWith("sk_live_") && !apiKey.startsWith("sk_test_")) {
    return NextResponse.json(
      { error: "Invalid API key format" },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const {
      email,
      name,
      image,
      provider,
      providerAccountId,
      accessToken,
      refreshToken,
      expiresAt,
    } = body;

    // Validate required fields
    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "email is required" },
        { status: 400 }
      );
    }

    if (!provider || typeof provider !== "string") {
      return NextResponse.json(
        { error: "provider is required" },
        { status: 400 }
      );
    }

    if (!providerAccountId || typeof providerAccountId !== "string") {
      return NextResponse.json(
        { error: "providerAccountId is required" },
        { status: 400 }
      );
    }

    // Sync the user (action handles API key verification internally)
    const result = await fetchAction(api.api.v1.cliAuth.syncExternalUser, {
      apiKey,
      email,
      name: name || undefined,
      image: image || undefined,
      provider,
      providerAccountId,
      accessToken: accessToken || undefined,
      refreshToken: refreshToken || undefined,
      expiresAt: expiresAt || undefined,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("Sync user error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    if (errorMessage.includes("Invalid") || errorMessage.includes("expired")) {
      return NextResponse.json(
        { error: errorMessage },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: "Failed to sync user", error_description: errorMessage },
      { status: 500 }
    );
  }
}
