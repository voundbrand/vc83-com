/**
 * API V1: RESOURCE BOOKINGS ENDPOINTS
 *
 * External API for managing resource bookings (appointments, reservations, rentals).
 * Different from event bookings - this is for the booking system.
 *
 * Endpoints:
 * - GET /api/v1/resource-bookings - List bookings
 * - POST /api/v1/resource-bookings - Create booking
 * - GET /api/v1/resource-bookings/:id - Get booking details
 * - PATCH /api/v1/resource-bookings/:id - Update booking
 * - POST /api/v1/resource-bookings/:id/confirm - Confirm booking
 * - POST /api/v1/resource-bookings/:id/check-in - Check in booking
 * - POST /api/v1/resource-bookings/:id/complete - Complete booking
 * - POST /api/v1/resource-bookings/:id/cancel - Cancel booking
 *
 * Security: Triple authentication support
 * - API keys (full access or scoped permissions)
 * - OAuth tokens (scope-based access control)
 * - CLI sessions (full organization access via MCP tools)
 * Scope: bookings:read, bookings:write
 */

import { httpAction } from "../../_generated/server";
import { internal } from "../../_generated/api";
import { Id } from "../../_generated/dataModel";
import { authenticateRequest, requireScopes } from "../../middleware/auth";

/**
 * LIST RESOURCE BOOKINGS
 * Lists all resource bookings for an organization with optional filters
 *
 * GET /api/v1/resource-bookings
 *
 * Query Parameters:
 * - status: Filter by status
 * - subtype: Filter by booking type (appointment, reservation, rental, class_enrollment)
 * - resourceId: Filter by resource
 * - startDate: Filter by start date (Unix timestamp)
 * - endDate: Filter by end date (Unix timestamp)
 * - limit: Number of results (default: 50, max: 200)
 * - offset: Pagination offset (default: 0)
 *
 * Response:
 * {
 *   bookings: Array<{...}>,
 *   total: number,
 *   limit: number,
 *   offset: number
 * }
 */
export const listResourceBookings = httpAction(async (ctx, request) => {
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

    // 2. Require bookings:read scope
    const scopeCheck = requireScopes(authContext, ["bookings:read"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json" } }
      );
    }

    // 3. Parse query parameters
    const url = new URL(request.url);
    const status = url.searchParams.get("status") || undefined;
    const subtype = url.searchParams.get("subtype") || undefined;
    const resourceId = url.searchParams.get("resourceId") as Id<"objects"> | undefined;
    const startDateStr = url.searchParams.get("startDate");
    const endDateStr = url.searchParams.get("endDate");
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 200);
    const offset = parseInt(url.searchParams.get("offset") || "0");

    const startDate = startDateStr ? parseInt(startDateStr) : undefined;
    const endDate = endDateStr ? parseInt(endDateStr) : undefined;

    // 4. Query bookings
    const result = await ctx.runQuery(internal.bookingOntology.listBookingsInternal, {
      organizationId: authContext.organizationId,
      status,
      subtype,
      resourceId,
      startDate,
      endDate,
      limit,
      offset,
    });

    // Transform bookings for API response
    const bookings = result.bookings.map((booking: (typeof result.bookings)[number]) => {
      const props = booking.customProperties as Record<string, unknown>;
      return {
        id: booking._id,
        subtype: booking.subtype,
        status: booking.status,
        startDateTime: props.startDateTime,
        endDateTime: props.endDateTime,
        duration: props.duration,
        timezone: props.timezone,
        customerName: props.customerName,
        customerEmail: props.customerEmail,
        customerPhone: props.customerPhone,
        participants: props.participants,
        paymentType: props.paymentType,
        totalAmountCents: props.totalAmountCents,
        paidAmountCents: props.paidAmountCents,
        confirmationRequired: props.confirmationRequired,
        isRecurring: props.isRecurring,
        createdAt: booking.createdAt,
        updatedAt: booking.updatedAt,
      };
    });

    return new Response(
      JSON.stringify({
        bookings,
        total: result.total,
        limit,
        offset,
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
    console.error("API /resource-bookings error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

/**
 * CREATE RESOURCE BOOKING
 * Creates a new resource booking
 *
 * POST /api/v1/resource-bookings
 *
 * Request Body:
 * {
 *   subtype: "appointment" | "reservation" | "rental" | "class_enrollment",
 *   startDateTime: number,
 *   endDateTime: number,
 *   timezone?: string,
 *   resourceIds: string[],
 *   customerName: string,
 *   customerEmail: string,
 *   customerPhone?: string,
 *   participants?: number,
 *   customerId?: string,
 *   locationId?: string,
 *   paymentType?: "none" | "deposit" | "full",
 *   totalAmountCents?: number,
 *   depositAmountCents?: number,
 *   confirmationRequired?: boolean,
 *   notes?: string
 * }
 *
 * Response:
 * { bookingId: string, status: string }
 */
export const createResourceBooking = httpAction(async (ctx, request) => {
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

    // 2. Require bookings:write scope
    const scopeCheck = requireScopes(authContext, ["bookings:write"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json" } }
      );
    }

    // 3. Parse request body
    const body = await request.json();

    // 4. Validate required fields
    const validSubtypes = ["appointment", "reservation", "rental", "class_enrollment"];
    if (!body.subtype || !validSubtypes.includes(body.subtype)) {
      return new Response(
        JSON.stringify({ error: `subtype must be one of: ${validSubtypes.join(", ")}` }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (typeof body.startDateTime !== "number" || typeof body.endDateTime !== "number") {
      return new Response(
        JSON.stringify({ error: "startDateTime and endDateTime are required (Unix timestamps)" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!body.resourceIds || !Array.isArray(body.resourceIds) || body.resourceIds.length === 0) {
      return new Response(
        JSON.stringify({ error: "resourceIds array is required with at least one resource" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!body.customerName || !body.customerEmail) {
      return new Response(
        JSON.stringify({ error: "customerName and customerEmail are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (body.endDateTime <= body.startDateTime) {
      return new Response(
        JSON.stringify({ error: "endDateTime must be after startDateTime" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 5. Create booking
    const result = await ctx.runMutation(internal.bookingOntology.createBookingInternal, {
      organizationId: authContext.organizationId,
      userId: authContext.userId,
      subtype: body.subtype,
      startDateTime: body.startDateTime,
      endDateTime: body.endDateTime,
      timezone: body.timezone,
      resourceIds: body.resourceIds,
      customerId: body.customerId,
      customerName: body.customerName,
      customerEmail: body.customerEmail,
      customerPhone: body.customerPhone,
      participants: body.participants,
      guestDetails: body.guestDetails,
      locationId: body.locationId,
      paymentType: body.paymentType,
      totalAmountCents: body.totalAmountCents,
      depositAmountCents: body.depositAmountCents,
      confirmationRequired: body.confirmationRequired,
      notes: body.notes,
      internalNotes: body.internalNotes,
      isAdminBooking: true,
    });

    return new Response(
      JSON.stringify({
        bookingId: result.bookingId,
        status: result.status,
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
    console.error("API POST /resource-bookings error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    if (errorMessage.includes("Conflict detected")) {
      return new Response(
        JSON.stringify({ error: errorMessage }),
        { status: 409, headers: { "Content-Type": "application/json" } }
      );
    }
    if (errorMessage.includes("not found")) {
      return new Response(
        JSON.stringify({ error: errorMessage }),
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
 * GET RESOURCE BOOKING
 * Gets a single resource booking by ID
 *
 * GET /api/v1/resource-bookings/:id
 */
export const getResourceBooking = httpAction(async (ctx, request) => {
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

    // 2. Require bookings:read scope
    const scopeCheck = requireScopes(authContext, ["bookings:read"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json" } }
      );
    }

    // 3. Extract booking ID from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const bookingId = pathParts[pathParts.length - 1] as Id<"objects">;

    if (!bookingId) {
      return new Response(
        JSON.stringify({ error: "Booking ID required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 4. Get booking
    const booking = await ctx.runQuery(internal.bookingOntology.getBookingInternal, {
      bookingId,
      organizationId: authContext.organizationId,
    });

    if (!booking) {
      return new Response(
        JSON.stringify({ error: "Booking not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Format response
    const props = booking.customProperties as Record<string, unknown>;
    return new Response(
      JSON.stringify({
        id: booking._id,
        subtype: booking.subtype,
        status: booking.status,
        startDateTime: props.startDateTime,
        endDateTime: props.endDateTime,
        duration: props.duration,
        timezone: props.timezone,
        customerId: props.customerId,
        customerName: props.customerName,
        customerEmail: props.customerEmail,
        customerPhone: props.customerPhone,
        participants: props.participants,
        guestDetails: props.guestDetails,
        locationId: props.locationId,
        confirmationRequired: props.confirmationRequired,
        confirmedAt: props.confirmedAt,
        confirmedBy: props.confirmedBy,
        paymentType: props.paymentType,
        totalAmountCents: props.totalAmountCents,
        depositAmountCents: props.depositAmountCents,
        paidAmountCents: props.paidAmountCents,
        transactionId: props.transactionId,
        isRecurring: props.isRecurring,
        recurrenceSeriesId: props.recurrenceSeriesId,
        recurrenceIndex: props.recurrenceIndex,
        checkedInAt: props.checkedInAt,
        checkedInBy: props.checkedInBy,
        cancelledAt: props.cancelledAt,
        cancelledBy: props.cancelledBy,
        cancellationReason: props.cancellationReason,
        refundAmountCents: props.refundAmountCents,
        notes: props.notes,
        internalNotes: props.internalNotes,
        isAdminBooking: props.isAdminBooking,
        createdAt: booking.createdAt,
        updatedAt: booking.updatedAt,
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
    console.error("API GET /resource-bookings/:id error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

/**
 * CONFIRM RESOURCE BOOKING
 * Confirm a pending booking
 *
 * POST /api/v1/resource-bookings/:id/confirm
 */
export const confirmResourceBooking = httpAction(async (ctx, request) => {
  try {
    const authResult = await authenticateRequest(ctx, request);
    if (!authResult.success) {
      return new Response(
        JSON.stringify({ error: authResult.error }),
        { status: authResult.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const authContext = authResult.context;

    const scopeCheck = requireScopes(authContext, ["bookings:write"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const confirmIndex = pathParts.indexOf("confirm");
    const bookingId = pathParts[confirmIndex - 1] as Id<"objects">;

    if (!bookingId) {
      return new Response(
        JSON.stringify({ error: "Booking ID required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const result = await ctx.runMutation(internal.bookingOntology.updateBookingStatusInternal, {
      bookingId,
      organizationId: authContext.organizationId,
      userId: authContext.userId,
      status: "confirmed",
    });

    return new Response(
      JSON.stringify({ bookingId: result.bookingId, status: result.status }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Organization-Id": authContext.organizationId,
        },
      }
    );
  } catch (error) {
    console.error("API POST /resource-bookings/:id/confirm error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    if (errorMessage.includes("not found")) {
      return new Response(
        JSON.stringify({ error: "Booking not found" }),
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
 * CHECK IN RESOURCE BOOKING
 * Mark booking as checked in
 *
 * POST /api/v1/resource-bookings/:id/check-in
 */
export const checkInResourceBooking = httpAction(async (ctx, request) => {
  try {
    const authResult = await authenticateRequest(ctx, request);
    if (!authResult.success) {
      return new Response(
        JSON.stringify({ error: authResult.error }),
        { status: authResult.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const authContext = authResult.context;

    const scopeCheck = requireScopes(authContext, ["bookings:write"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const checkInIndex = pathParts.indexOf("check-in");
    const bookingId = pathParts[checkInIndex - 1] as Id<"objects">;

    if (!bookingId) {
      return new Response(
        JSON.stringify({ error: "Booking ID required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const result = await ctx.runMutation(internal.bookingOntology.updateBookingStatusInternal, {
      bookingId,
      organizationId: authContext.organizationId,
      userId: authContext.userId,
      status: "checked_in",
    });

    return new Response(
      JSON.stringify({ bookingId: result.bookingId, status: result.status }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Organization-Id": authContext.organizationId,
        },
      }
    );
  } catch (error) {
    console.error("API POST /resource-bookings/:id/check-in error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    if (errorMessage.includes("not found")) {
      return new Response(
        JSON.stringify({ error: "Booking not found" }),
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
 * COMPLETE RESOURCE BOOKING
 * Mark booking as completed
 *
 * POST /api/v1/resource-bookings/:id/complete
 */
export const completeResourceBooking = httpAction(async (ctx, request) => {
  try {
    const authResult = await authenticateRequest(ctx, request);
    if (!authResult.success) {
      return new Response(
        JSON.stringify({ error: authResult.error }),
        { status: authResult.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const authContext = authResult.context;

    const scopeCheck = requireScopes(authContext, ["bookings:write"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const completeIndex = pathParts.indexOf("complete");
    const bookingId = pathParts[completeIndex - 1] as Id<"objects">;

    if (!bookingId) {
      return new Response(
        JSON.stringify({ error: "Booking ID required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const result = await ctx.runMutation(internal.bookingOntology.updateBookingStatusInternal, {
      bookingId,
      organizationId: authContext.organizationId,
      userId: authContext.userId,
      status: "completed",
    });

    return new Response(
      JSON.stringify({ bookingId: result.bookingId, status: result.status }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Organization-Id": authContext.organizationId,
        },
      }
    );
  } catch (error) {
    console.error("API POST /resource-bookings/:id/complete error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    if (errorMessage.includes("not found")) {
      return new Response(
        JSON.stringify({ error: "Booking not found" }),
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
 * CANCEL RESOURCE BOOKING
 * Cancel a booking with optional refund
 *
 * POST /api/v1/resource-bookings/:id/cancel
 */
export const cancelResourceBooking = httpAction(async (ctx, request) => {
  try {
    const authResult = await authenticateRequest(ctx, request);
    if (!authResult.success) {
      return new Response(
        JSON.stringify({ error: authResult.error }),
        { status: authResult.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const authContext = authResult.context;

    const scopeCheck = requireScopes(authContext, ["bookings:write"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const cancelIndex = pathParts.indexOf("cancel");
    const bookingId = pathParts[cancelIndex - 1] as Id<"objects">;

    if (!bookingId) {
      return new Response(
        JSON.stringify({ error: "Booking ID required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    let body: { reason?: string; refundAmountCents?: number } = {};
    try {
      body = await request.json();
    } catch {
      // Body is optional
    }

    const result = await ctx.runMutation(internal.bookingOntology.updateBookingStatusInternal, {
      bookingId,
      organizationId: authContext.organizationId,
      userId: authContext.userId,
      status: "cancelled",
      reason: body.reason,
      refundAmountCents: body.refundAmountCents,
    });

    return new Response(
      JSON.stringify({ bookingId: result.bookingId, status: result.status }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Organization-Id": authContext.organizationId,
        },
      }
    );
  } catch (error) {
    console.error("API POST /resource-bookings/:id/cancel error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    if (errorMessage.includes("not found")) {
      return new Response(
        JSON.stringify({ error: "Booking not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
