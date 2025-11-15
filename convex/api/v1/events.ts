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
import { getCorsHeaders } from "./corsHeaders";

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
    const origin = request.headers.get("origin");
    const corsHeaders = getCorsHeaders(origin);

    // 1. Verify API key
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid Authorization header" }),
        {
          status: 401,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          }
        }
      );
    }

    const apiKey = authHeader.substring(7); // Remove "Bearer "
    const authContext = await ctx.runQuery(internal.api.auth.verifyApiKey, {
      apiKey,
    });

    if (!authContext) {
      return new Response(
        JSON.stringify({ error: "Invalid API key" }),
        {
          status: 401,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          }
        }
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
          ...corsHeaders,
        },
      }
    );
  } catch (error) {
    console.error("API /events error:", error);
    const origin = request.headers.get("origin");
    const corsHeaders = getCorsHeaders(origin);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        }
      }
    );
  }
});

/**
 * GET EVENT BY SLUG
 * Returns detailed information about a specific event by its slug
 *
 * Path Parameters:
 * - slug: Event slug (e.g., "haffsymposium-2024")
 *
 * Response:
 * {
 *   success: true,
 *   event: {
 *     _id: string,
 *     type: string,
 *     name: string,
 *     slug: string,
 *     description: string,
 *     eventDetails: {
 *       startDate: string,
 *       endDate: string,
 *       location: string,
 *       venue: string,
 *       address: object
 *     },
 *     registration: {
 *       enabled: boolean,
 *       formId: string,
 *       registrationOpenDate: string,
 *       registrationCloseDate: string,
 *       maxAttendees: number,
 *       currentRegistrations: number,
 *       categories: array,
 *       addons: array
 *     }
 *   }
 * }
 */
export const getEventBySlug = httpAction(async (ctx, request) => {
  try {
    const origin = request.headers.get("origin");
    const corsHeaders = getCorsHeaders(origin);

    // 1. Verify API key
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid Authorization header" }),
        {
          status: 401,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          }
        }
      );
    }

    const apiKey = authHeader.substring(7);
    const authContext = await ctx.runQuery(internal.api.auth.verifyApiKey, {
      apiKey,
    });

    if (!authContext) {
      return new Response(
        JSON.stringify({ error: "Invalid API key" }),
        {
          status: 401,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          }
        }
      );
    }

    const { organizationId } = authContext;

    // 2. Extract slug from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const slug = pathParts[pathParts.length - 1];

    if (!slug) {
      return new Response(
        JSON.stringify({ error: "Event slug required" }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          }
        }
      );
    }

    // 3. Get event by slug
    const event = await ctx.runQuery(
      internal.api.v1.eventsInternal.getEventBySlugInternal,
      {
        slug,
        organizationId,
      }
    );

    if (!event) {
      return new Response(
        JSON.stringify({ error: "Event not found" }),
        {
          status: 404,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          }
        }
      );
    }

    // 4. Return response
    return new Response(
      JSON.stringify({
        success: true,
        event,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Organization-Id": organizationId,
          ...corsHeaders,
        },
      }
    );
  } catch (error) {
    console.error("API /events/:slug error:", error);
    const origin = request.headers.get("origin");
    const corsHeaders = getCorsHeaders(origin);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        }
      }
    );
  }
});

/**
 * GET EVENT BY ID
 * Returns detailed information about a specific event by its ID
 *
 * Path Parameters:
 * - eventId: Event ID (Convex ID)
 *
 * Response: Same as getEventBySlug
 */
export const getEventById = httpAction(async (ctx, request) => {
  try {
    // 1. Verify API key
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid Authorization header" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const apiKey = authHeader.substring(7);
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

    // 2. Extract eventId from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const eventId = pathParts[pathParts.length - 1];

    if (!eventId) {
      return new Response(
        JSON.stringify({ error: "Event ID required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 3. Get event by ID
    const event = await ctx.runQuery(
      internal.api.v1.eventsInternal.getEventByIdInternal,
      {
        eventId: eventId as any,
        organizationId,
      }
    );

    if (!event) {
      return new Response(
        JSON.stringify({ error: "Event not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // 4. Return response
    return new Response(
      JSON.stringify({
        success: true,
        event,
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
    console.error("API /events/:eventId error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

/**
 * GET EVENT PRODUCTS
 * Returns all products associated with a specific event
 *
 * Path Parameters:
 * - eventId: Event ID (Convex ID)
 *
 * Response:
 * {
 *   success: true,
 *   products: Array<{
 *     id: string,
 *     name: string,
 *     description: string,
 *     price: number,
 *     currency: string,
 *     ...
 *   }>
 * }
 */
export const getEventProducts = httpAction(async (ctx, request) => {
  try {
    // 1. Verify API key
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid Authorization header" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const apiKey = authHeader.substring(7);
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

    // 2. Extract eventId from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const eventId = pathParts[pathParts.length - 2]; // /api/v1/events/:eventId/products

    if (!eventId) {
      return new Response(
        JSON.stringify({ error: "Event ID required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 3. Get products for event
    const products = await ctx.runQuery(
      internal.api.v1.eventsInternal.getEventProductsInternal,
      {
        eventId: eventId as any,
        organizationId,
      }
    );

    // 4. Return response
    return new Response(
      JSON.stringify({
        success: true,
        products,
        total: products.length,
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
    console.error("API /events/:eventId/products error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
