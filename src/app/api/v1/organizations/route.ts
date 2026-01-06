/**
 * Organizations API Routes for CLI
 *
 * GET /api/v1/organizations - List organizations for authenticated CLI user
 * POST /api/v1/organizations - Create a new organization
 */

import { NextRequest, NextResponse } from "next/server";
import { api } from "@convex/_generated/api";
import { fetchQuery, fetchAction } from "convex/nextjs";

/**
 * GET /api/v1/organizations
 *
 * Lists all organizations the authenticated CLI user belongs to.
 * Requires CLI session token in Authorization header.
 */
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
    const result = await fetchQuery(api.api.v1.cliAuth.getCliUserOrganizations, {
      token,
    });

    if (!result) {
      return NextResponse.json(
        { error: "Invalid or expired session" },
        { status: 401 }
      );
    }

    // Return in CLI-compatible format
    return NextResponse.json(result.organizations);
  } catch (error: unknown) {
    console.error("CLI organizations list error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to list organizations", error_description: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * POST /api/v1/organizations
 *
 * Creates a new organization for the authenticated CLI user.
 * Requires CLI session token in Authorization header.
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
    const { name } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Organization name is required" },
        { status: 400 }
      );
    }

    const result = await fetchAction(api.api.v1.cliAuth.createCliOrganization, {
      token,
      name: name.trim(),
    });

    // Return in CLI-compatible format (includes both id and organizationId)
    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("CLI organization creation error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    // Check for specific error types
    if (errorMessage.includes("Invalid or expired")) {
      return NextResponse.json(
        { error: "Invalid or expired session" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create organization", error_description: errorMessage },
      { status: 500 }
    );
  }
}
