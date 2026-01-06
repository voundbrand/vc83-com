/**
 * API Key Generation Route for CLI
 *
 * POST /api/v1/api-keys/generate - Generate an API key for an organization
 */

import { NextRequest, NextResponse } from "next/server";
import { api } from "@convex/_generated/api";
import { fetchAction } from "convex/nextjs";
import { Id } from "@convex/_generated/dataModel";

/**
 * POST /api/v1/api-keys/generate
 *
 * Generates an API key for the specified organization.
 * Requires CLI session token in Authorization header.
 *
 * Request body:
 * {
 *   "organizationId": "org_abc123",
 *   "name": "CLI Generated Key",
 *   "scopes": ["*"]  // Optional, defaults to ["*"]
 * }
 */
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
    const body = await request.json();
    const { organizationId, name, scopes } = body;

    // Validate required fields
    if (!organizationId) {
      return NextResponse.json(
        { error: "organizationId is required" },
        { status: 400 }
      );
    }

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "API key name is required" },
        { status: 400 }
      );
    }

    // Validate scopes if provided
    if (scopes !== undefined && !Array.isArray(scopes)) {
      return NextResponse.json(
        { error: "scopes must be an array of strings" },
        { status: 400 }
      );
    }

    const result = await fetchAction(api.api.v1.cliAuth.generateCliApiKey, {
      token,
      organizationId: organizationId as Id<"organizations">,
      name: name.trim(),
      scopes: scopes || ["*"],
    });

    // Return in CLI-compatible format (includes both key and apiKey)
    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("CLI API key generation error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    // Check for specific error types
    if (errorMessage.includes("Invalid or expired")) {
      return NextResponse.json(
        { error: "Invalid or expired session" },
        { status: 401 }
      );
    }

    if (errorMessage.includes("Not authorized")) {
      return NextResponse.json(
        { error: errorMessage },
        { status: 403 }
      );
    }

    if (errorMessage.includes("limit")) {
      return NextResponse.json(
        { error: errorMessage },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: "Failed to generate API key", error_description: errorMessage },
      { status: 500 }
    );
  }
}
