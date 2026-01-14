/**
 * API V1: AVAILABILITY ENDPOINTS
 *
 * External API for managing resource availability.
 * Used by CLI apps and external integrations for availability management.
 *
 * Endpoints:
 * - GET /api/v1/resources/:id/availability - Get resource schedule + exceptions + blocks
 * - POST /api/v1/resources/:id/availability/schedule - Set weekly schedule
 * - POST /api/v1/resources/:id/availability/exception - Add date exception
 * - POST /api/v1/resources/:id/availability/block - Add date range block
 * - DELETE /api/v1/resources/:id/availability/:availId - Remove availability item
 * - GET /api/v1/resources/:id/slots - Get available time slots
 *
 * Security: Triple authentication support
 * - API keys (full access or scoped permissions)
 * - OAuth tokens (scope-based access control)
 * - CLI sessions (full organization access via MCP tools)
 * Scope: availability:read, availability:write
 */

import { httpAction } from "../../_generated/server";
import { internal } from "../../_generated/api";
import { Id } from "../../_generated/dataModel";
import { authenticateRequest, requireScopes } from "../../middleware/auth";

/**
 * GET RESOURCE AVAILABILITY
 * Returns all availability records for a resource (schedules, exceptions, blocks)
 *
 * GET /api/v1/resources/:resourceId/availability
 *
 * Response:
 * {
 *   schedules: Array<{...}>,
 *   exceptions: Array<{...}>,
 *   blocks: Array<{...}>
 * }
 */
export const getResourceAvailability = httpAction(async (ctx, request) => {
  try {
    // 1. Universal authentication
    const authResult = await authenticateRequest(ctx, request);
    if (!authResult.success) {
      return new Response(
        JSON.stringify({ error: authResult.error }),
        { status: authResult.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const authContext = authResult.context;

    // 2. Require availability:read scope
    const scopeCheck = requireScopes(authContext, ["availability:read"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json" } }
      );
    }

    // 3. Extract resource ID from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    // Path: /api/v1/resources/:resourceId/availability
    const resourcesIndex = pathParts.indexOf("resources");
    const resourceId = pathParts[resourcesIndex + 1] as Id<"objects">;

    if (!resourceId) {
      return new Response(
        JSON.stringify({ error: "Resource ID required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 4. Verify resource exists and belongs to organization
    const resource = await ctx.runQuery(internal.productOntology.getProductInternal, {
      productId: resourceId,
    });

    if (!resource || resource.organizationId !== authContext.organizationId) {
      return new Response(
        JSON.stringify({ error: "Resource not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // 5. Get availability data
    const result = await ctx.runQuery(internal.availabilityOntology.getResourceAvailabilityInternal, {
      resourceId,
      organizationId: authContext.organizationId,
    });

    return new Response(
      JSON.stringify(result),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Organization-Id": authContext.organizationId,
        },
      }
    );
  } catch (error) {
    console.error("API GET /resources/:id/availability error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

/**
 * SET WEEKLY SCHEDULE
 * Set the weekly recurring schedule for a resource
 *
 * POST /api/v1/resources/:resourceId/availability/schedule
 *
 * Request Body:
 * {
 *   schedules: Array<{
 *     dayOfWeek: number,    // 0=Sunday, 6=Saturday
 *     startTime: string,    // "09:00"
 *     endTime: string,      // "17:00"
 *     isAvailable: boolean
 *   }>,
 *   timezone: string        // "America/New_York"
 * }
 *
 * Response:
 * { scheduleIds: string[], count: number }
 */
export const setWeeklySchedule = httpAction(async (ctx, request) => {
  try {
    // 1. Universal authentication
    const authResult = await authenticateRequest(ctx, request);
    if (!authResult.success) {
      return new Response(
        JSON.stringify({ error: authResult.error }),
        { status: authResult.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const authContext = authResult.context;

    // 2. Require availability:write scope
    const scopeCheck = requireScopes(authContext, ["availability:write"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json" } }
      );
    }

    // 3. Extract resource ID from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const resourcesIndex = pathParts.indexOf("resources");
    const resourceId = pathParts[resourcesIndex + 1] as Id<"objects">;

    if (!resourceId) {
      return new Response(
        JSON.stringify({ error: "Resource ID required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 4. Parse request body
    const body = await request.json();

    // 5. Validate required fields
    if (!body.schedules || !Array.isArray(body.schedules)) {
      return new Response(
        JSON.stringify({ error: "schedules array is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!body.timezone) {
      return new Response(
        JSON.stringify({ error: "timezone is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 6. Validate schedule entries
    for (const schedule of body.schedules) {
      if (typeof schedule.dayOfWeek !== "number" || schedule.dayOfWeek < 0 || schedule.dayOfWeek > 6) {
        return new Response(
          JSON.stringify({ error: "dayOfWeek must be 0-6 (Sunday-Saturday)" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
      if (!schedule.startTime || !schedule.endTime) {
        return new Response(
          JSON.stringify({ error: "startTime and endTime are required for each schedule" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    // 7. Set schedule
    const result = await ctx.runMutation(internal.availabilityOntology.setWeeklyScheduleInternal, {
      resourceId,
      organizationId: authContext.organizationId,
      userId: authContext.userId,
      schedules: body.schedules,
      timezone: body.timezone,
    });

    return new Response(
      JSON.stringify({
        scheduleIds: result.scheduleIds,
        count: result.scheduleIds.length,
      }),
      {
        status: 201,
        headers: {
          "Content-Type": "application/json",
          "X-Organization-Id": authContext.organizationId,
        },
      }
    );
  } catch (error) {
    console.error("API POST /resources/:id/availability/schedule error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    if (errorMessage.includes("not found")) {
      return new Response(
        JSON.stringify({ error: "Resource not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

/**
 * CREATE EXCEPTION
 * Add a single-date exception to the schedule
 *
 * POST /api/v1/resources/:resourceId/availability/exception
 *
 * Request Body:
 * {
 *   date: number,           // Unix timestamp (day)
 *   isAvailable: boolean,
 *   customHours?: { startTime: string, endTime: string },
 *   reason?: string
 * }
 *
 * Response:
 * { exceptionId: string }
 */
export const createException = httpAction(async (ctx, request) => {
  try {
    // 1. Universal authentication
    const authResult = await authenticateRequest(ctx, request);
    if (!authResult.success) {
      return new Response(
        JSON.stringify({ error: authResult.error }),
        { status: authResult.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const authContext = authResult.context;

    // 2. Require availability:write scope
    const scopeCheck = requireScopes(authContext, ["availability:write"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json" } }
      );
    }

    // 3. Extract resource ID from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const resourcesIndex = pathParts.indexOf("resources");
    const resourceId = pathParts[resourcesIndex + 1] as Id<"objects">;

    if (!resourceId) {
      return new Response(
        JSON.stringify({ error: "Resource ID required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 4. Parse request body
    const body = await request.json();

    // 5. Validate required fields
    if (typeof body.date !== "number") {
      return new Response(
        JSON.stringify({ error: "date (Unix timestamp) is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (typeof body.isAvailable !== "boolean") {
      return new Response(
        JSON.stringify({ error: "isAvailable (boolean) is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 6. Create exception
    const result = await ctx.runMutation(internal.availabilityOntology.createExceptionInternal, {
      resourceId,
      organizationId: authContext.organizationId,
      userId: authContext.userId,
      date: body.date,
      isAvailable: body.isAvailable,
      customHours: body.customHours,
      reason: body.reason,
    });

    return new Response(
      JSON.stringify({
        exceptionId: result.exceptionId,
      }),
      {
        status: 201,
        headers: {
          "Content-Type": "application/json",
          "X-Organization-Id": authContext.organizationId,
        },
      }
    );
  } catch (error) {
    console.error("API POST /resources/:id/availability/exception error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    if (errorMessage.includes("not found")) {
      return new Response(
        JSON.stringify({ error: "Resource not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

/**
 * CREATE BLOCK
 * Add a date range block (unavailable period)
 *
 * POST /api/v1/resources/:resourceId/availability/block
 *
 * Request Body:
 * {
 *   startDate: number,      // Unix timestamp (start)
 *   endDate: number,        // Unix timestamp (end)
 *   reason: string
 * }
 *
 * Response:
 * { blockId: string }
 */
export const createBlock = httpAction(async (ctx, request) => {
  try {
    // 1. Universal authentication
    const authResult = await authenticateRequest(ctx, request);
    if (!authResult.success) {
      return new Response(
        JSON.stringify({ error: authResult.error }),
        { status: authResult.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const authContext = authResult.context;

    // 2. Require availability:write scope
    const scopeCheck = requireScopes(authContext, ["availability:write"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json" } }
      );
    }

    // 3. Extract resource ID from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const resourcesIndex = pathParts.indexOf("resources");
    const resourceId = pathParts[resourcesIndex + 1] as Id<"objects">;

    if (!resourceId) {
      return new Response(
        JSON.stringify({ error: "Resource ID required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 4. Parse request body
    const body = await request.json();

    // 5. Validate required fields
    if (typeof body.startDate !== "number" || typeof body.endDate !== "number") {
      return new Response(
        JSON.stringify({ error: "startDate and endDate (Unix timestamps) are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!body.reason) {
      return new Response(
        JSON.stringify({ error: "reason is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (body.endDate <= body.startDate) {
      return new Response(
        JSON.stringify({ error: "endDate must be after startDate" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 6. Create block
    const result = await ctx.runMutation(internal.availabilityOntology.createBlockInternal, {
      resourceId,
      organizationId: authContext.organizationId,
      userId: authContext.userId,
      startDate: body.startDate,
      endDate: body.endDate,
      reason: body.reason,
    });

    return new Response(
      JSON.stringify({
        blockId: result.blockId,
      }),
      {
        status: 201,
        headers: {
          "Content-Type": "application/json",
          "X-Organization-Id": authContext.organizationId,
        },
      }
    );
  } catch (error) {
    console.error("API POST /resources/:id/availability/block error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    if (errorMessage.includes("not found")) {
      return new Response(
        JSON.stringify({ error: "Resource not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

/**
 * DELETE AVAILABILITY ITEM
 * Remove a schedule, exception, or block
 *
 * DELETE /api/v1/resources/:resourceId/availability/:availId
 *
 * Response:
 * { deleted: true }
 */
export const deleteAvailability = httpAction(async (ctx, request) => {
  try {
    // 1. Universal authentication
    const authResult = await authenticateRequest(ctx, request);
    if (!authResult.success) {
      return new Response(
        JSON.stringify({ error: authResult.error }),
        { status: authResult.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const authContext = authResult.context;

    // 2. Require availability:write scope
    const scopeCheck = requireScopes(authContext, ["availability:write"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json" } }
      );
    }

    // 3. Extract resource ID and availability ID from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const resourcesIndex = pathParts.indexOf("resources");
    const resourceId = pathParts[resourcesIndex + 1] as Id<"objects">;
    const availId = pathParts[pathParts.length - 1] as Id<"objects">;

    if (!resourceId || !availId) {
      return new Response(
        JSON.stringify({ error: "Resource ID and Availability ID required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 4. Delete the availability item
    await ctx.runMutation(internal.availabilityOntology.deleteAvailabilityInternal, {
      availabilityId: availId,
      organizationId: authContext.organizationId,
    });

    return new Response(
      JSON.stringify({
        deleted: true,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Organization-Id": authContext.organizationId,
        },
      }
    );
  } catch (error) {
    console.error("API DELETE /resources/:id/availability/:availId error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    if (errorMessage.includes("not found")) {
      return new Response(
        JSON.stringify({ error: "Availability item not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

/**
 * GET AVAILABLE SLOTS
 * Returns available time slots for a resource within a date range
 *
 * GET /api/v1/resources/:resourceId/slots
 *
 * Query Parameters:
 * - startDate: Unix timestamp (required)
 * - endDate: Unix timestamp (required)
 * - duration: Override slot duration in minutes (optional)
 * - timezone: Override timezone (optional)
 *
 * Response:
 * {
 *   slots: Array<{
 *     resourceId: string,
 *     date: string,
 *     startTime: string,
 *     endTime: string,
 *     startDateTime: number,
 *     endDateTime: number,
 *     isAvailable: boolean
 *   }>
 * }
 */
export const getAvailableSlots = httpAction(async (ctx, request) => {
  try {
    // 1. Universal authentication
    const authResult = await authenticateRequest(ctx, request);
    if (!authResult.success) {
      return new Response(
        JSON.stringify({ error: authResult.error }),
        { status: authResult.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const authContext = authResult.context;

    // 2. Require availability:read scope
    const scopeCheck = requireScopes(authContext, ["availability:read"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json" } }
      );
    }

    // 3. Extract resource ID from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const resourcesIndex = pathParts.indexOf("resources");
    const resourceId = pathParts[resourcesIndex + 1] as Id<"objects">;

    if (!resourceId) {
      return new Response(
        JSON.stringify({ error: "Resource ID required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 4. Parse query parameters
    const startDateStr = url.searchParams.get("startDate");
    const endDateStr = url.searchParams.get("endDate");
    const durationStr = url.searchParams.get("duration");
    const timezone = url.searchParams.get("timezone") || undefined;

    if (!startDateStr || !endDateStr) {
      return new Response(
        JSON.stringify({ error: "startDate and endDate query parameters are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const startDate = parseInt(startDateStr);
    const endDate = parseInt(endDateStr);

    if (isNaN(startDate) || isNaN(endDate)) {
      return new Response(
        JSON.stringify({ error: "startDate and endDate must be valid Unix timestamps" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const duration = durationStr ? parseInt(durationStr) : undefined;

    // 5. Get available slots
    const slots = await ctx.runQuery(internal.availabilityOntology.getAvailableSlotsInternal, {
      resourceId,
      organizationId: authContext.organizationId,
      startDate,
      endDate,
      duration,
      timezone,
    });

    return new Response(
      JSON.stringify({
        slots,
        count: slots.length,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Organization-Id": authContext.organizationId,
        },
      }
    );
  } catch (error) {
    console.error("API GET /resources/:id/slots error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    if (errorMessage.includes("not found")) {
      return new Response(
        JSON.stringify({ error: "Resource not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
