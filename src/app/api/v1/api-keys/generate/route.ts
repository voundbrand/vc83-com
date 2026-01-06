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

    // Check for specific error types and return helpful messages
    if (errorMessage.includes("Invalid or expired")) {
      return NextResponse.json(
        {
          error: "Invalid or expired session",
          code: "SESSION_EXPIRED",
          suggestion: "Please run 'l4yercak3 login' to authenticate again."
        },
        { status: 401 }
      );
    }

    if (errorMessage.includes("Not authorized")) {
      return NextResponse.json(
        {
          error: errorMessage,
          code: "NOT_AUTHORIZED",
          suggestion: "You don't have access to this organization. Check your organization selection."
        },
        { status: 403 }
      );
    }

    // API key limit reached - provide helpful upgrade info with upgrade URL
    if (errorMessage.includes("limit") || errorMessage.includes("maxApiKeys")) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.l4yercak3.com";
      const upgradeUrl = `${appUrl}/upgrade?token=${encodeURIComponent(token)}&reason=api_keys&resource=API%20Keys`;

      return NextResponse.json(
        {
          error: errorMessage,
          code: "API_KEY_LIMIT_REACHED",
          suggestion: "You have reached your API key limit. Use 'l4yercak3 api-keys list' to see existing keys, or upgrade your plan for more capacity.",
          upgradeUrl,
          upgradeCommand: "l4yercak3 upgrade"
        },
        { status: 429 }
      );
    }

    return NextResponse.json(
      {
        error: "Failed to generate API key",
        error_description: errorMessage,
        code: "UNKNOWN_ERROR",
        suggestion: "Please try again or contact support if the issue persists."
      },
      { status: 500 }
    );
  }
}
