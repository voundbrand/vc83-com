/**
 * Domain Lookup HTTP Endpoint
 *
 * Public HTTP endpoint called by Next.js middleware to route custom domains.
 * No authentication required - just returns project routing info.
 */

import { httpAction } from "../../_generated/server";
import { internal } from "../../_generated/api";

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
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore - Convex internal types deep instantiation issue
    const result = await ctx.runQuery(
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      internal.api.v1.domainLookupInternal.lookupByHostname,
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
