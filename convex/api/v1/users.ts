/**
 * API V1: USER ENDPOINTS
 *
 * Public API for user profile management.
 * Used by frontend applications to display and update user data.
 *
 * Endpoints:
 * - GET /api/v1/users/me - Get current user profile
 * - GET /api/v1/users/me/profile-complete - Get complete user profile
 * - GET /api/v1/users/me/transactions - Get user's transactions
 * - GET /api/v1/users/me/tickets - Get user's event tickets
 * - GET /api/v1/users/me/events - Get user's registered events
 * - PATCH /api/v1/users/me - Update user profile
 *
 * Security: Session-based authentication (NOT API key)
 * Scope: Returns only data for the authenticated user
 */

import { httpAction } from "../../_generated/server";
const generatedApi: any = require("../../_generated/api");

/**
 * HELPER: Extract session ID from Authorization header
 */
function extractSessionId(request: Request): string {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("Missing or invalid Authorization header");
  }
  return authHeader.substring(7);
}

/**
 * GET CURRENT USER
 * Returns basic user profile with CRM contact and organization info
 *
 * GET /api/v1/users/me
 *
 * Headers:
 * - Authorization: Bearer <session_id>
 *
 * Response:
 * {
 *   userId: string,
 *   email: string,
 *   displayName: string,
 *   accountStatus: string,
 *   crmContact: { id, firstName, lastName, company, phone } | null,
 *   crmOrganization: { id, name, billingAddress } | null,
 *   createdAt: number,
 *   lastLogin: number
 * }
 */
export const getCurrentUser = httpAction(async (ctx, request) => {
  try {
    // 1. Extract and validate session
    const sessionId = extractSessionId(request);

    // 2. Get user profile
    const profile = await (ctx as any).runQuery(generatedApi.internal.frontendUserQueries.getCurrentUserInternal, {
      sessionId,
    });

    if (!profile) {
      return new Response(JSON.stringify({ error: "User not found or session expired" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 3. Return profile
    return new Response(JSON.stringify(profile), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "X-User-Id": profile.userId,
      },
    });
  } catch (error) {
    console.error("API /users/me error:", error);

    if (error instanceof Error && error.message.includes("Authorization")) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

/**
 * GET COMPLETE PROFILE
 * Returns full user profile with all activity (transactions, tickets, events, certificates)
 *
 * GET /api/v1/users/me/profile-complete
 *
 * Headers:
 * - Authorization: Bearer <session_id>
 *
 * Response:
 * {
 *   user: { id, email, displayName, accountStatus, createdAt, lastLogin },
 *   contact: { id, firstName, lastName, company, phone, email } | null,
 *   organization: { id, name, billingAddress, taxId } | null,
 *   activity: {
 *     recentTransactions: [...],  // Last 10
 *     upcomingEvents: [...],      // Next 5
 *     activeTickets: [...],
 *     certificates: [...]
 *   }
 * }
 */
export const getCompleteProfile = httpAction(async (ctx, request) => {
  try {
    const sessionId = extractSessionId(request);

    const profile = await (ctx as any).runQuery(generatedApi.internal.frontendUserQueries.getCompleteProfileInternal, {
      sessionId,
    });

    if (!profile) {
      return new Response(JSON.stringify({ error: "User not found or session expired" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(profile), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "X-User-Id": profile.user.id,
      },
    });
  } catch (error) {
    console.error("API /users/me/profile-complete error:", error);

    if (error instanceof Error && error.message.includes("Authorization")) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

/**
 * GET TRANSACTIONS
 * Returns user's transaction history with pagination
 *
 * GET /api/v1/users/me/transactions?limit=20&offset=0
 *
 * Headers:
 * - Authorization: Bearer <session_id>
 *
 * Query Parameters:
 * - limit: Number of results (default: 20, max: 100)
 * - offset: Pagination offset (default: 0)
 *
 * Response:
 * {
 *   transactions: [{
 *     id: string,
 *     amount: number,
 *     currency: string,
 *     status: string,
 *     items: [...],
 *     createdAt: number
 *   }],
 *   total: number,
 *   limit: number,
 *   offset: number
 * }
 */
export const getTransactions = httpAction(async (ctx, request) => {
  try {
    const sessionId = extractSessionId(request);

    // Parse query parameters
    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "20"), 100);
    const offset = parseInt(url.searchParams.get("offset") || "0");

    const result = await (ctx as any).runQuery(generatedApi.internal.frontendUserQueries.getTransactionsInternal, {
      sessionId,
      limit,
      offset,
    });

    if (!result) {
      return new Response(JSON.stringify({ error: "User not found or session expired" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("API /users/me/transactions error:", error);

    if (error instanceof Error && error.message.includes("Authorization")) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

/**
 * GET TICKETS
 * Returns user's event tickets
 *
 * GET /api/v1/users/me/tickets
 *
 * Headers:
 * - Authorization: Bearer <session_id>
 *
 * Response:
 * {
 *   tickets: [{
 *     id: string,
 *     ticketType: string,
 *     status: string,
 *     qrCode: string,
 *     event: { id, name, startDate, location },
 *     createdAt: number
 *   }],
 *   total: number
 * }
 */
export const getTickets = httpAction(async (ctx, request) => {
  try {
    const sessionId = extractSessionId(request);

    const result = await (ctx as any).runQuery(generatedApi.internal.frontendUserQueries.getTicketsInternal, {
      sessionId,
    });

    if (!result) {
      return new Response(JSON.stringify({ error: "User not found or session expired" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("API /users/me/tickets error:", error);

    if (error instanceof Error && error.message.includes("Authorization")) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

/**
 * GET EVENTS
 * Returns user's registered events (upcoming and past)
 *
 * GET /api/v1/users/me/events?upcoming=true&past=false
 *
 * Headers:
 * - Authorization: Bearer <session_id>
 *
 * Query Parameters:
 * - upcoming: Include upcoming events (default: true)
 * - past: Include past events (default: true)
 *
 * Response:
 * {
 *   upcomingEvents: [{
 *     id: string,
 *     name: string,
 *     startDate: number,
 *     endDate: number,
 *     location: string,
 *     status: string
 *   }],
 *   pastEvents: [...],
 *   totalAttended: number
 * }
 */
export const getEvents = httpAction(async (ctx, request) => {
  try {
    const sessionId = extractSessionId(request);

    // Parse query parameters
    const url = new URL(request.url);
    const upcoming = url.searchParams.get("upcoming") !== "false";
    const past = url.searchParams.get("past") !== "false";

    const result = await (ctx as any).runQuery(generatedApi.internal.frontendUserQueries.getEventsInternal, {
      sessionId,
      upcoming,
      past,
    });

    if (!result) {
      return new Response(JSON.stringify({ error: "User not found or session expired" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("API /users/me/events error:", error);

    if (error instanceof Error && error.message.includes("Authorization")) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

/**
 * UPDATE CURRENT USER
 * Updates user profile preferences
 *
 * PATCH /api/v1/users/me
 *
 * Headers:
 * - Authorization: Bearer <session_id>
 * - Content-Type: application/json
 *
 * Request Body:
 * {
 *   displayName?: string,
 *   preferredLanguage?: string,  // "en", "de", "es", "fr", "ja", "pl"
 *   timezone?: string              // "America/New_York", etc.
 * }
 *
 * Response:
 * {
 *   success: true
 * }
 */
export const updateCurrentUser = httpAction(async (ctx, request) => {
  try {
    const sessionId = extractSessionId(request);

    // Parse request body
    const body = await request.json();
    const { displayName, preferredLanguage, timezone } = body;

    // Validate allowed fields
    const updates: {
      displayName?: string;
      preferredLanguage?: string;
      timezone?: string;
    } = {};

    if (displayName !== undefined) updates.displayName = displayName;
    if (preferredLanguage !== undefined) updates.preferredLanguage = preferredLanguage;
    if (timezone !== undefined) updates.timezone = timezone;

    // Update user
    await (ctx as any).runMutation(generatedApi.internal.frontendUserQueries.updateCurrentUserInternal, {
      sessionId,
      updates,
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("API PATCH /users/me error:", error);

    if (error instanceof Error && error.message.includes("Authorization")) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (error instanceof Error && error.message.includes("Invalid session")) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
