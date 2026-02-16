/**
 * Domain Lookup HTTP Endpoint
 *
 * Public HTTP endpoint called by Next.js middleware to route custom domains.
 * No authentication required - just returns project routing info.
 */

import { httpAction } from "../../_generated/server";

const generatedApi: any = require("../../_generated/api");

/**
 * POST /api/v1/domain-lookup
 *
 * Look up which project a custom domain should route to.
 * Called by middleware on every request from custom domains.
 *
 * Request: { hostname: "client-domain.com" }
 * Response: { found: true, projectSlug: "gerrit", organizationId: "...", domainConfigId: "..." }
 */
export const domainLookupHandler = httpAction(async (ctx, request) => {
  try {
    const body = await request.json();
    const { hostname } = body;

    if (!hostname) {
      return new Response(
        JSON.stringify({ found: false, error: "Missing hostname" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Look up domain configuration
    const result = await (ctx as any).runQuery(
      generatedApi.internal.api.v1.domainLookupInternal.lookupByHostname,
      { hostname }
    );

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        // Cache for 60 seconds at edge to reduce Convex calls
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    });
  } catch (error) {
    console.error("[Domain Lookup] Error:", error);
    return new Response(
      JSON.stringify({ found: false, error: "Internal error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});

/**
 * OPTIONS handler for CORS preflight
 */
export const domainLookupOptionsHandler = httpAction(async () => {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
});
