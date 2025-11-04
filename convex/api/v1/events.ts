/**
 * API V1: EVENTS ENDPOINT
 *
 * External API for listing events.
 * Used by external websites to display available CME courses.
 *
 * Endpoint: GET /api/v1/events?organizationId=xxx
 *
 * Security: API key required in Authorization header
 * Scope: Returns only events for the authenticated organization
 */

import { httpAction } from "../../_generated/server";
import { internal } from "../../_generated/api";

/**
 * GET EVENTS
 * Returns all published events for an organization
 *
 * Query Parameters:
 * - organizationId: Organization ID (optional if inferred from API key)
 * - subtype: Filter by event type (conference, workshop, etc.)
 * - status: Filter by status (default: published)
 * - startDate: Filter events after this date (Unix timestamp)
 * - endDate: Filter events before this date (Unix timestamp)
 *
 * Response:
 * {
 *   events: Array<{
 *     id: string,
 *     name: string,
 *     description: string,
 *     subtype: string,
 *     startDate: number,
 *     endDate: number,
 *     location: object,
 *     status: string,
 *     customProperties: object
 *   }>,
 *   total: number
 * }
 */
export const getEvents = httpAction(async (ctx, request) => {
  try {
    // 1. Verify API key
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid Authorization header" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const apiKey = authHeader.substring(7); // Remove "Bearer "
    const authContext = await ctx.runQuery(internal.api.auth.verifyApiKey, {
      apiKey,
    });

    if (!authContext) {
      return new Response(
        JSON.stringify({ error: "Invalid API key" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const { organizationId } = authContext;

    // 2. Parse query parameters
    const url = new URL(request.url);
    const subtype = url.searchParams.get("subtype") || undefined;
    const status = url.searchParams.get("status") || "published";
    const startDate = url.searchParams.get("startDate")
      ? parseInt(url.searchParams.get("startDate")!)
      : undefined;
    const endDate = url.searchParams.get("endDate")
      ? parseInt(url.searchParams.get("endDate")!)
      : undefined;

    // 3. Query events using internal query
    const events = await ctx.runQuery(internal.api.v1.eventsInternal.getEventsInternal, {
      organizationId,
      subtype,
      status,
      startDate,
      endDate,
    });

    // 4. Return response
    return new Response(
      JSON.stringify({
        events,
        total: events.length,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Organization-Id": organizationId,
        },
      }
    );
  } catch (error) {
    console.error("API /events error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
