/**
 * BOOKINGS API (PUBLIC)
 *
 * Public HTTP endpoint for creating event bookings.
 * Called by frontend after user completes registration form.
 *
 * Authentication: Bearer token (API key) via Authorization header
 * Organization ID is derived from the verified API key (not sent in plain text)
 */

import { httpAction } from "../../_generated/server";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";

/**
 * CORS Helper - Add CORS headers to API responses
 * Allows requests from pluseins.gg and all subdomains
 */
function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigins = [
    "https://pluseins.gg",
    "https://www.pluseins.gg",
    "http://localhost:3000",
    "http://localhost:5173",
  ];

  // Allow all subdomains of pluseins.gg
  const isAllowedOrigin = origin && (
    allowedOrigins.includes(origin) ||
    origin.match(/^https:\/\/[\w-]+\.pluseins\.gg$/)
  );

  if (isAllowedOrigin) {
    return {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400", // 24 hours
    };
  }

  return {};
}

/**
 * POST /api/v1/bookings/create
 *
 * Create a complete event booking with tickets and CRM records.
 *
 * Request Body:
 * {
 *   eventId: string,              // Backend event object ID
 *   productId: string,            // Backend product ID
 *   primaryAttendee: {
 *     firstName: string,
 *     lastName: string,
 *     email: string,
 *     phone: string
 *   },
 *   guests?: [{                   // Optional additional attendees
 *     firstName: string,
 *     lastName: string,
 *     email?: string,
 *     phone: string
 *   }],
 *   source: string,               // "web" or "mobile"
 *   frontendRsvpId?: string       // Optional frontend tracking ID
 * }
 *
 * Response:
 * {
 *   success: true,
 *   bookingId: string,
 *   transactionId: string,
 *   tickets: [{
 *     ticketId: string,
 *     attendeeName: string,
 *     attendeeEmail?: string,
 *     attendeePhone: string,
 *     isPrimary: boolean,
 *     qrCode: string
 *   }],
 *   purchaseItemIds: string[],
 *   crmContacts: [{
 *     contactId: string,
 *     email: string,
 *     isPrimary: boolean
 *   }],
 *   totalAttendees: number,
 *   createdAt: number
 * }
 */
export const createBooking = httpAction(async (ctx, request) => {
  const origin = request.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  try {
    // 1. Verify API key (REQUIRED - matches existing /api/v1/events pattern)
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing or invalid Authorization header",
        }),
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
        JSON.stringify({
          success: false,
          error: "Invalid API key",
        }),
        {
          status: 401,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          }
        }
      );
    }

    // Organization ID is securely derived from the API key!
    const { organizationId } = authContext;

    // 2. Parse request body
    const body = await request.json();

    // 3. Validate required fields
    const requiredFields = [
      'eventId',        // Backend event ID
      'productId',      // Backend product ID
      'primaryAttendee', // Attendee details
      'source'          // Tracking ("web" or "mobile")
    ];

    for (const field of requiredFields) {
      if (!body[field]) {
        return new Response(
          JSON.stringify({
            success: false,
            error: `Missing required field: ${field}`,
          }),
          {
            status: 400,
            headers: {
              "Content-Type": "application/json",
              ...corsHeaders,
            },
          }
        );
      }
    }

    // 4. Validate primary attendee
    if (!body.primaryAttendee.firstName ||
        !body.primaryAttendee.lastName ||
        !body.primaryAttendee.email ||
        !body.primaryAttendee.phone) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Primary attendee must have firstName, lastName, email, and phone",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        }
      );
    }

    // 5. Create complete booking
    const result = await ctx.runMutation(
      internal.api.v1.bookingsInternal.createCompleteBookingInternal,
      {
        organizationId,
        eventId: body.eventId as Id<"objects">,
        productId: body.productId as Id<"objects">,
        primaryAttendee: body.primaryAttendee,
        guests: body.guests || [],
        source: body.source,
        frontendRsvpId: body.frontendRsvpId,
      }
    );

    // 6. Return success response
    return new Response(
      JSON.stringify(result),
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
    console.error("Booking creation failed:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        details: {
          code: "BOOKING_FAILED",
          message: "Failed to create booking",
        },
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  }
});
