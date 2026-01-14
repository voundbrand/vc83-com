/**
 * API Key List Route for CLI
 *
 * GET /api/v1/api-keys/list?organizationId=xxx - List API keys for an organization
 */

import { NextRequest, NextResponse } from "next/server";
import { api } from "@convex/_generated/api";
import { fetchQuery } from "convex/nextjs";
import { Id } from "@convex/_generated/dataModel";

/**
 * GET /api/v1/api-keys/list
 *
 * Lists all API keys for the specified organization.
 * Requires CLI session token in Authorization header.
 *
 * Query params:
 *   organizationId: string (required)
 *
 * Response:
 * {
 *   "keys": [...],
 *   "limit": 1,
 *   "currentCount": 1,
 *   "canCreateMore": false
 * }
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json(
      {
        error: "Missing or invalid Authorization header",
        code: "UNAUTHORIZED",
      },
      { status: 401 }
    );
  }

  const token = authHeader.substring(7);
  const organizationId = request.nextUrl.searchParams.get("organizationId");

  if (!organizationId) {
    return NextResponse.json(
      {
        error: "organizationId query parameter is required",
        code: "MISSING_PARAM",
      },
      { status: 400 }
    );
  }

  try {
    const result = await fetchQuery(api.api.v1.cliAuth.listCliApiKeys, {
      token,
      organizationId: organizationId as Id<"organizations">,
    });

    if (!result) {
      return NextResponse.json(
        {
          error: "Invalid or expired session, or no access to organization",
          code: "SESSION_INVALID",
          suggestion: "Please run 'l4yercak3 login' to authenticate again.",
        },
        { status: 401 }
      );
    }

    // Add computed field for whether more keys can be created
    const canCreateMore = result.limit === -1 || result.currentCount < result.limit;

    // Build upgrade URL if at limit
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.l4yercak3.com";
    const upgradeUrl = !canCreateMore
      ? `${appUrl}/upgrade?token=${encodeURIComponent(token)}&reason=api_keys&resource=API%20Keys`
      : undefined;

    return NextResponse.json({
      ...result,
      canCreateMore,
      limitDescription: result.limit === -1 ? "Unlimited" : `${result.currentCount}/${result.limit}`,
      ...(upgradeUrl && { upgradeUrl, upgradeMessage: "Upgrade your plan to create more API keys." }),
    });
  } catch (error: unknown) {
    console.error("CLI API key list error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        error: "Failed to list API keys",
        error_description: errorMessage,
        code: "UNKNOWN_ERROR",
      },
      { status: 500 }
    );
  }
}
