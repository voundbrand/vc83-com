/**
 * API V1: EVENTS ENDPOINT
 *
 * External API for listing and managing events.
 * Used by external websites and MCP tools to display and manage events.
 *
 * Security: Triple authentication support
 * - API keys (full access or scoped permissions)
 * - OAuth tokens (scope-based access control)
 * - CLI sessions (full organization access via MCP tools)
 */

import { httpAction } from "../../_generated/server";
import { internal } from "../../_generated/api";
import { Id } from "../../_generated/dataModel";
import { getCorsHeaders } from "./corsHeaders";
import { authenticateRequest, requireScopes } from "../../middleware/auth";

/**
 * LIST EVENTS
 * Returns events for an organization with filtering and pagination
 *
 * GET /api/v1/events
 *
 * Query Parameters:
 * - subtype: Filter by event type (conference, workshop, etc.)
 * - status: Filter by status (default: published)
 * - startDateAfter: Filter events after this date (Unix timestamp)
 * - startDateBefore: Filter events before this date (Unix timestamp)
 * - limit: Number of results (default: 50, max: 200)
 * - offset: Pagination offset (default: 0)
 */
export const listEvents = httpAction(async (ctx, request) => {
  try {
    const origin = request.headers.get("origin");
    const corsHeaders = getCorsHeaders(origin);

    // 1. Universal authentication (API key, OAuth, or CLI session)
    const authResult = await authenticateRequest(ctx, request);
    if (!authResult.success) {
      return new Response(
        JSON.stringify({ error: authResult.error }),
        { status: authResult.status, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const authContext = authResult.context;

    // 2. Require events:read scope
    const scopeCheck = requireScopes(authContext, ["events:read"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // 3. Parse query parameters
    const url = new URL(request.url);
    const subtype = url.searchParams.get("subtype") || undefined;
    const status = url.searchParams.get("status") || undefined;
    const startDateAfter = url.searchParams.get("startDateAfter")
      ? parseInt(url.searchParams.get("startDateAfter")!)
      : undefined;
    const startDateBefore = url.searchParams.get("startDateBefore")
      ? parseInt(url.searchParams.get("startDateBefore")!)
      : undefined;
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 200);
    const offset = parseInt(url.searchParams.get("offset") || "0");

    // 4. Query events using internal query
    const result = await ctx.runQuery(internal.api.v1.eventsInternal.listEventsInternal, {
      organizationId: authContext.organizationId,
      subtype,
      status,
      startDateAfter,
      startDateBefore,
      limit,
      offset,
    });

    // 5. Return response
    return new Response(
      JSON.stringify(result),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Organization-Id": authContext.organizationId,
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
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});

// BACKWARD COMPATIBLE: Keep old getEvents function that wraps listEvents
export const getEvents = listEvents;

/**
 * CREATE EVENT
 * Creates a new event
 *
 * POST /api/v1/events
 *
 * Request Body:
 * {
 *   subtype: "conference" | "workshop" | "concert" | "meetup" | "seminar",
 *   name: string,
 *   description?: string,
 *   startDate: number (Unix timestamp),
 *   endDate: number (Unix timestamp),
 *   location: string,
 *   timezone?: string,
 *   maxCapacity?: number,
 *   customProperties?: object
 * }
 */
export const createEvent = httpAction(async (ctx, request) => {
  try {
    const origin = request.headers.get("origin");
    const corsHeaders = getCorsHeaders(origin);

    // 1. Universal authentication
    const authResult = await authenticateRequest(ctx, request);
    if (!authResult.success) {
      return new Response(
        JSON.stringify({ error: authResult.error }),
        { status: authResult.status, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const authContext = authResult.context;

    // 2. Require events:write scope
    const scopeCheck = requireScopes(authContext, ["events:write"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // 3. Parse request body
    const body = await request.json();
    const { subtype, name, description, startDate, endDate, location, timezone, maxCapacity, customProperties } = body;

    // Validate required fields
    if (!subtype || !name || !startDate || !endDate || !location) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: subtype, name, startDate, endDate, location" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // 4. Create event
    const result = await ctx.runMutation(internal.api.v1.eventsInternal.createEventInternal, {
      organizationId: authContext.organizationId,
      subtype,
      name,
      description,
      startDate,
      endDate,
      location,
      timezone,
      maxCapacity,
      customProperties,
      performedBy: authContext.userId,
    });

    // 5. Return response
    return new Response(
      JSON.stringify({
        success: true,
        eventId: result.eventId,
        slug: result.slug,
      }),
      {
        status: 201,
        headers: {
          "Content-Type": "application/json",
          "X-Organization-Id": authContext.organizationId,
          ...corsHeaders,
        },
      }
    );
  } catch (error) {
    console.error("API /events (POST) error:", error);
    const origin = request.headers.get("origin");
    const corsHeaders = getCorsHeaders(origin);
    const message = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});

/**
 * GET EVENT
 * Gets a specific event by ID
 *
 * GET /api/v1/events/:eventId
 */
export const getEvent = httpAction(async (ctx, request) => {
  try {
    const origin = request.headers.get("origin");
    const corsHeaders = getCorsHeaders(origin);

    // 1. Universal authentication
    const authResult = await authenticateRequest(ctx, request);
    if (!authResult.success) {
      return new Response(
        JSON.stringify({ error: authResult.error }),
        { status: authResult.status, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const authContext = authResult.context;

    // 2. Require events:read scope
    const scopeCheck = requireScopes(authContext, ["events:read"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // 3. Extract event ID from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const eventId = pathParts[pathParts.length - 1];

    if (!eventId) {
      return new Response(
        JSON.stringify({ error: "Event ID required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // 4. Get event by ID
    const event = await ctx.runQuery(internal.api.v1.eventsInternal.getEventByIdInternal, {
      eventId: eventId as Id<"objects">,
      organizationId: authContext.organizationId,
    });

    if (!event) {
      return new Response(
        JSON.stringify({ error: "Event not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // 5. Return response
    return new Response(
      JSON.stringify(event),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Organization-Id": authContext.organizationId,
          ...corsHeaders,
        },
      }
    );
  } catch (error) {
    console.error("API /events/:id error:", error);
    const origin = request.headers.get("origin");
    const corsHeaders = getCorsHeaders(origin);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});

/**
 * UPDATE EVENT
 * Updates an existing event
 *
 * PATCH /api/v1/events/:eventId
 */
export const updateEvent = httpAction(async (ctx, request) => {
  try {
    const origin = request.headers.get("origin");
    const corsHeaders = getCorsHeaders(origin);

    // 1. Universal authentication
    const authResult = await authenticateRequest(ctx, request);
    if (!authResult.success) {
      return new Response(
        JSON.stringify({ error: authResult.error }),
        { status: authResult.status, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const authContext = authResult.context;

    // 2. Require events:write scope
    const scopeCheck = requireScopes(authContext, ["events:write"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // 3. Extract event ID from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const eventId = pathParts[pathParts.length - 1];

    if (!eventId) {
      return new Response(
        JSON.stringify({ error: "Event ID required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // 4. Parse request body
    const body = await request.json();
    const { name, description, subtype, status, startDate, endDate, location, timezone, maxCapacity, customProperties } = body;

    // 5. Update event
    await ctx.runMutation(internal.api.v1.eventsInternal.updateEventInternal, {
      organizationId: authContext.organizationId,
      eventId,
      updates: {
        name,
        description,
        subtype,
        status,
        startDate,
        endDate,
        location,
        timezone,
        maxCapacity,
        customProperties,
      },
      performedBy: authContext.userId,
    });

    // 6. Return response
    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Organization-Id": authContext.organizationId,
          ...corsHeaders,
        },
      }
    );
  } catch (error) {
    console.error("API /events/:id (PATCH) error:", error);
    const origin = request.headers.get("origin");
    const corsHeaders = getCorsHeaders(origin);
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message === "Event not found" ? 404 : 500;
    return new Response(
      JSON.stringify({ error: message }),
      { status, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});

/**
 * GET EVENT ATTENDEES
 * Gets all attendees registered for an event
 *
 * GET /api/v1/events/:eventId/attendees
 */
export const getEventAttendees = httpAction(async (ctx, request) => {
  try {
    const origin = request.headers.get("origin");
    const corsHeaders = getCorsHeaders(origin);

    // 1. Universal authentication
    const authResult = await authenticateRequest(ctx, request);
    if (!authResult.success) {
      return new Response(
        JSON.stringify({ error: authResult.error }),
        { status: authResult.status, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const authContext = authResult.context;

    // 2. Require events:read scope
    const scopeCheck = requireScopes(authContext, ["events:read"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // 3. Extract event ID from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const eventId = pathParts[pathParts.length - 2]; // /api/v1/events/:eventId/attendees
    const ticketType = url.searchParams.get("ticketType") || undefined;

    if (!eventId) {
      return new Response(
        JSON.stringify({ error: "Event ID required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // 4. Get event attendees
    const result = await ctx.runQuery(internal.api.v1.eventsInternal.getEventAttendeesInternal, {
      organizationId: authContext.organizationId,
      eventId,
      ticketType,
    });

    // 5. Return response
    return new Response(
      JSON.stringify(result),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Organization-Id": authContext.organizationId,
          ...corsHeaders,
        },
      }
    );
  } catch (error) {
    console.error("API /events/:id/attendees error:", error);
    const origin = request.headers.get("origin");
    const corsHeaders = getCorsHeaders(origin);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
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
        eventId: eventId as Id<"objects">,
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
 * CANCEL EVENT
 * Cancels an existing event (soft delete - sets status to "cancelled")
 *
 * POST /api/v1/events/:eventId/cancel
 */
export const cancelEvent = httpAction(async (ctx, request) => {
  try {
    const origin = request.headers.get("origin");
    const corsHeaders = getCorsHeaders(origin);

    // 0. Verify path ends with /cancel (since we use pathPrefix routing)
    const url = new URL(request.url);
    if (!url.pathname.endsWith("/cancel")) {
      return new Response(
        JSON.stringify({ error: "Not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // 1. Universal authentication
    const authResult = await authenticateRequest(ctx, request);
    if (!authResult.success) {
      return new Response(
        JSON.stringify({ error: authResult.error }),
        { status: authResult.status, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const authContext = authResult.context;

    // 2. Require events:write scope
    const scopeCheck = requireScopes(authContext, ["events:write"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // 3. Extract event ID from URL (path is /api/v1/events/:eventId/cancel)
    const pathParts = url.pathname.split("/");
    const eventId = pathParts[pathParts.length - 2]; // Second to last part

    if (!eventId) {
      return new Response(
        JSON.stringify({ error: "Event ID required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // 4. Cancel event
    await ctx.runMutation(internal.api.v1.eventsInternal.cancelEventInternal, {
      organizationId: authContext.organizationId,
      eventId,
      performedBy: authContext.userId,
    });

    // 5. Return response
    return new Response(
      JSON.stringify({ success: true, message: "Event cancelled successfully" }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Organization-Id": authContext.organizationId,
          ...corsHeaders,
        },
      }
    );
  } catch (error) {
    console.error("API /events/:id/cancel (POST) error:", error);
    const origin = request.headers.get("origin");
    const corsHeaders = getCorsHeaders(origin);
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message === "Event not found" ? 404 : 500;
    return new Response(
      JSON.stringify({ error: message }),
      { status, headers: { "Content-Type": "application/json", ...corsHeaders } }
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
        eventId: eventId as Id<"objects">,
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
