/**
 * CLI API Keys Route - DEPRECATED
 *
 * This endpoint has been migrated to Convex HTTP.
 * CLI should use: https://aromatic-akita-723.convex.site/api/v1/auth/cli/api-keys
 *
 * This route exists only to provide a helpful error message for CLI clients
 * that haven't updated their base URL yet.
 */

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    {
      error: "Endpoint moved",
      message: "This endpoint has been migrated to Convex. Please update your CLI to use the new base URL.",
      newBaseUrl: "https://aromatic-akita-723.convex.site",
      newEndpoint: "https://aromatic-akita-723.convex.site/api/v1/auth/cli/api-keys",
      code: "ENDPOINT_MOVED"
    },
    { status: 410 } // 410 Gone - indicates resource has been intentionally removed
  );
}

export async function POST() {
  return NextResponse.json(
    {
      error: "Endpoint moved",
      message: "This endpoint has been migrated to Convex. Please update your CLI to use the new base URL.",
      newBaseUrl: "https://aromatic-akita-723.convex.site",
      newEndpoint: "https://aromatic-akita-723.convex.site/api/v1/auth/cli/api-keys",
      code: "ENDPOINT_MOVED"
    },
    { status: 410 }
  );
}
