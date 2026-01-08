/**
 * API V1: TICKETS ENDPOINTS
 *
 * External API for managing event tickets.
 * Used by CLI apps and external integrations for ticket management.
 *
 * Endpoints:
 * - GET /api/v1/tickets - List tickets
 * - GET /api/v1/tickets/:ticketId - Get ticket details
 * - GET /api/v1/tickets/:ticketId/pdf - Download ticket PDF
 * - POST /api/v1/tickets/:ticketId/redeem - Redeem ticket (check-in)
 * - POST /api/v1/tickets/:ticketId/void - Void ticket
 * - POST /api/v1/tickets/validate - Validate ticket by QR code
 *
 * Security: Triple authentication support
 * - API keys (full access or scoped permissions)
 * - OAuth tokens (scope-based access control)
 * - CLI sessions (full organization access via MCP tools)
 * Scope: tickets:read, tickets:write
 */

import { httpAction } from "../../_generated/server";
import { internal } from "../../_generated/api";
import { Id } from "../../_generated/dataModel";
import { authenticateRequest, requireScopes } from "../../middleware/auth";

/**
 * GET TICKET PDF
 * Returns ticket as PDF file
 *
 * Response: PDF file (application/pdf)
 */
export const getTicketPdf = httpAction(async (ctx, request) => {
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

    // 2. Extract ticket ID from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const ticketId = pathParts[pathParts.length - 2] as Id<"objects">; // /tickets/{id}/pdf

    if (!ticketId) {
      return new Response(
        JSON.stringify({ error: "Ticket ID required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 3. Generate ticket PDF
    const pdfBlob = await ctx.runAction(
      internal.api.v1.ticketsInternal.generateTicketPdfInternal,
      {
        ticketId,
        organizationId,
      }
    );

    if (!pdfBlob) {
      return new Response(
        JSON.stringify({ error: "Ticket not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // 4. Return PDF
    return new Response(pdfBlob, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="ticket-${ticketId}.pdf"`,
        "X-Organization-Id": organizationId,
      },
    });
  } catch (error) {
    console.error("API /tickets/pdf error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

/**
 * LIST TICKETS
 * Lists all tickets for an organization with optional filters
 *
 * GET /api/v1/tickets
 *
 * Query Parameters:
 * - eventId: Filter by event
 * - productId: Filter by product
 * - status: Filter by status (issued, redeemed, cancelled, transferred)
 * - subtype: Filter by ticket type (standard, vip, early-bird, student)
 * - holderEmail: Filter by holder email
 * - limit: Number of results (default: 50, max: 200)
 * - offset: Pagination offset (default: 0)
 *
 * Response:
 * {
 *   tickets: Array<{...}>,
 *   total: number,
 *   limit: number,
 *   offset: number
 * }
 */
export const listTickets = httpAction(async (ctx, request) => {
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

    // 2. Require tickets:read scope
    const scopeCheck = requireScopes(authContext, ["tickets:read"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json" } }
      );
    }

    // 3. Parse query parameters
    const url = new URL(request.url);
    const eventIdParam = url.searchParams.get("eventId");
    const eventId = eventIdParam ? eventIdParam as Id<"objects"> : undefined;
    const productIdParam = url.searchParams.get("productId");
    const productId = productIdParam ? productIdParam as Id<"objects"> : undefined;
    const status = url.searchParams.get("status") || undefined;
    const subtype = url.searchParams.get("subtype") || undefined;
    const holderEmail = url.searchParams.get("holderEmail") || undefined;
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 200);
    const offset = parseInt(url.searchParams.get("offset") || "0");

    // 4. Query tickets
    const result = await ctx.runQuery(
      internal.api.v1.ticketsInternal.listTicketsInternal,
      {
        organizationId: authContext.organizationId,
        eventId,
        productId,
        status,
        subtype,
        holderEmail,
        limit,
        offset,
      }
    );

    // 5. Return response
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
    console.error("API /tickets (list) error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

/**
 * GET TICKET
 * Gets a specific ticket by ID
 *
 * GET /api/v1/tickets/:ticketId
 *
 * Response: Full ticket object
 */
export const getTicket = httpAction(async (ctx, request) => {
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

    // 2. Require tickets:read scope
    const scopeCheck = requireScopes(authContext, ["tickets:read"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json" } }
      );
    }

    // 3. Extract ticket ID from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const ticketId = pathParts[pathParts.length - 1];

    if (!ticketId) {
      return new Response(
        JSON.stringify({ error: "Ticket ID required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 4. Get ticket
    const ticket = await ctx.runQuery(
      internal.ticketOntology.getTicketInternal,
      { ticketId: ticketId as Id<"objects"> }
    );

    if (!ticket) {
      return new Response(
        JSON.stringify({ error: "Ticket not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // 5. Verify organization access
    if (ticket.organizationId !== authContext.organizationId) {
      return new Response(
        JSON.stringify({ error: "Ticket not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // 6. Return response
    return new Response(
      JSON.stringify(ticket),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Organization-Id": authContext.organizationId,
        },
      }
    );
  } catch (error) {
    console.error("API /tickets/:id error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

/**
 * REDEEM TICKET
 * Marks a ticket as redeemed (checked in)
 *
 * POST /api/v1/tickets/:ticketId/redeem
 *
 * Request Body:
 * {
 *   metadata?: object  // Optional check-in metadata
 * }
 *
 * Response:
 * {
 *   success: true
 * }
 */
export const redeemTicket = httpAction(async (ctx, request) => {
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

    // 2. Require tickets:write scope
    const scopeCheck = requireScopes(authContext, ["tickets:write"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json" } }
      );
    }

    // 3. Extract ticket ID from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    // URL format: /api/v1/tickets/:ticketId/redeem
    const ticketId = pathParts[pathParts.length - 2];

    if (!ticketId || ticketId === "tickets") {
      return new Response(
        JSON.stringify({ error: "Ticket ID required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 4. Parse request body (optional metadata)
    let metadata: Record<string, unknown> | undefined;
    try {
      const body = await request.json();
      metadata = body.metadata;
    } catch {
      // Body is optional
    }

    // 5. Redeem ticket
    await ctx.runMutation(
      internal.api.v1.ticketsInternal.redeemTicketInternal,
      {
        organizationId: authContext.organizationId,
        ticketId,
        performedBy: authContext.userId,
        metadata,
      }
    );

    // 6. Return success
    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Organization-Id": authContext.organizationId,
        },
      }
    );
  } catch (error) {
    console.error("API /tickets/:id/redeem error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message === "Ticket not found" ? 404 :
                   message.includes("cancelled") || message.includes("redeemed") ? 400 : 500;
    return new Response(
      JSON.stringify({ error: message }),
      { status, headers: { "Content-Type": "application/json" } }
    );
  }
});

/**
 * VOID TICKET
 * Cancels a ticket
 *
 * POST /api/v1/tickets/:ticketId/void
 *
 * Request Body:
 * {
 *   reason?: string  // Optional cancellation reason
 * }
 *
 * Response:
 * {
 *   success: true
 * }
 */
export const voidTicket = httpAction(async (ctx, request) => {
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

    // 2. Require tickets:write scope
    const scopeCheck = requireScopes(authContext, ["tickets:write"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json" } }
      );
    }

    // 3. Extract ticket ID from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    // URL format: /api/v1/tickets/:ticketId/void
    const ticketId = pathParts[pathParts.length - 2];

    if (!ticketId || ticketId === "tickets") {
      return new Response(
        JSON.stringify({ error: "Ticket ID required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 4. Parse request body (optional reason)
    let reason: string | undefined;
    try {
      const body = await request.json();
      reason = body.reason;
    } catch {
      // Body is optional
    }

    // 5. Void ticket
    await ctx.runMutation(
      internal.api.v1.ticketsInternal.voidTicketInternal,
      {
        organizationId: authContext.organizationId,
        ticketId,
        reason,
        performedBy: authContext.userId,
      }
    );

    // 6. Return success
    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Organization-Id": authContext.organizationId,
        },
      }
    );
  } catch (error) {
    console.error("API /tickets/:id/void error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message === "Ticket not found" ? 404 :
                   message.includes("already cancelled") ? 400 : 500;
    return new Response(
      JSON.stringify({ error: message }),
      { status, headers: { "Content-Type": "application/json" } }
    );
  }
});

/**
 * VALIDATE TICKET
 * Validates a ticket by QR code or ticket ID
 *
 * POST /api/v1/tickets/validate
 *
 * Request Body:
 * {
 *   ticketId?: string,
 *   qrCode?: string,
 *   eventId?: string
 * }
 *
 * Response:
 * {
 *   valid: boolean,
 *   reason?: string,  // If not valid
 *   ticket?: {...}    // If valid
 * }
 */
export const validateTicket = httpAction(async (ctx, request) => {
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

    // 2. Require tickets:read scope
    const scopeCheck = requireScopes(authContext, ["tickets:read"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json" } }
      );
    }

    // 3. Parse request body
    const body = await request.json();
    const { ticketId, qrCode, eventId } = body;

    if (!ticketId && !qrCode) {
      return new Response(
        JSON.stringify({ error: "Either ticketId or qrCode is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 4. Validate ticket
    const result = await ctx.runQuery(
      internal.api.v1.ticketsInternal.validateTicketInternal,
      {
        organizationId: authContext.organizationId,
        ticketId,
        qrCode,
        eventId: eventId ? eventId as Id<"objects"> : undefined,
      }
    );

    // 5. Return response
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
    console.error("API /tickets/validate error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

/**
 * COMBINED GET HANDLER for /api/v1/tickets/:id and /pdf
 * Routes GET requests to the appropriate handler based on URL path
 */
export const handleTicketsGet = httpAction(async (ctx, request) => {
  const url = new URL(request.url);

  if (url.pathname.endsWith("/pdf")) {
    // ---- GET TICKET PDF ----
    try {
      // 1. Verify API key (legacy auth - getTicketPdf doesn't use new auth)
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

      // 2. Extract ticket ID from URL
      const pathParts = url.pathname.split("/");
      const ticketId = pathParts[pathParts.length - 2] as Id<"objects">; // /tickets/{id}/pdf

      if (!ticketId) {
        return new Response(
          JSON.stringify({ error: "Ticket ID required" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // 3. Generate ticket PDF
      const pdfBlob = await ctx.runAction(
        internal.api.v1.ticketsInternal.generateTicketPdfInternal,
        {
          ticketId,
          organizationId,
        }
      );

      if (!pdfBlob) {
        return new Response(
          JSON.stringify({ error: "Ticket not found" }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        );
      }

      // 4. Return PDF
      return new Response(pdfBlob, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="ticket-${ticketId}.pdf"`,
          "X-Organization-Id": organizationId,
        },
      });
    } catch (error) {
      console.error("API /tickets/:id/pdf error:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  } else {
    // ---- GET TICKET DETAILS ----
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

      // 2. Require tickets:read scope
      const scopeCheck = requireScopes(authContext, ["tickets:read"]);
      if (!scopeCheck.success) {
        return new Response(
          JSON.stringify({ error: scopeCheck.error }),
          { status: scopeCheck.status, headers: { "Content-Type": "application/json" } }
        );
      }

      // 3. Extract ticket ID from URL
      const pathParts = url.pathname.split("/");
      const ticketId = pathParts[pathParts.length - 1];

      if (!ticketId) {
        return new Response(
          JSON.stringify({ error: "Ticket ID required" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // 4. Get ticket
      const ticket = await ctx.runQuery(
        internal.ticketOntology.getTicketInternal,
        { ticketId: ticketId as Id<"objects"> }
      );

      if (!ticket) {
        return new Response(
          JSON.stringify({ error: "Ticket not found" }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        );
      }

      // 5. Verify organization access
      if (ticket.organizationId !== authContext.organizationId) {
        return new Response(
          JSON.stringify({ error: "Ticket not found" }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        );
      }

      // 6. Return response
      return new Response(
        JSON.stringify(ticket),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "X-Organization-Id": authContext.organizationId,
          },
        }
      );
    } catch (error) {
      console.error("API /tickets/:id error:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }
});

/**
 * COMBINED POST HANDLER for /api/v1/tickets/:id/redeem, /void, and /validate
 * Routes POST requests to the appropriate handler based on URL path
 */
export const handleTicketsPost = httpAction(async (ctx, request) => {
  const url = new URL(request.url);

  if (url.pathname.endsWith("/redeem")) {
    // ---- REDEEM TICKET ----
    try {
      const authResult = await authenticateRequest(ctx, request);
      if (!authResult.success) {
        return new Response(
          JSON.stringify({ error: authResult.error }),
          { status: authResult.status, headers: { "Content-Type": "application/json" } }
        );
      }

      const authContext = authResult.context;

      const scopeCheck = requireScopes(authContext, ["tickets:write"]);
      if (!scopeCheck.success) {
        return new Response(
          JSON.stringify({ error: scopeCheck.error }),
          { status: scopeCheck.status, headers: { "Content-Type": "application/json" } }
        );
      }

      const pathParts = url.pathname.split("/");
      const ticketId = pathParts[pathParts.length - 2];

      if (!ticketId || ticketId === "tickets") {
        return new Response(
          JSON.stringify({ error: "Ticket ID required" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      let metadata: Record<string, unknown> | undefined;
      try {
        const body = await request.json();
        metadata = body.metadata;
      } catch {
        // Body is optional
      }

      await ctx.runMutation(
        internal.api.v1.ticketsInternal.redeemTicketInternal,
        {
          organizationId: authContext.organizationId,
          ticketId,
          performedBy: authContext.userId,
          metadata,
        }
      );

      return new Response(
        JSON.stringify({ success: true }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "X-Organization-Id": authContext.organizationId,
          },
        }
      );
    } catch (error) {
      console.error("API /tickets/:id/redeem error:", error);
      const message = error instanceof Error ? error.message : "Internal server error";
      const status = message === "Ticket not found" ? 404 :
                     message.includes("cancelled") || message.includes("redeemed") ? 400 : 500;
      return new Response(
        JSON.stringify({ error: message }),
        { status, headers: { "Content-Type": "application/json" } }
      );
    }
  } else if (url.pathname.endsWith("/void")) {
    // ---- VOID TICKET ----
    try {
      const authResult = await authenticateRequest(ctx, request);
      if (!authResult.success) {
        return new Response(
          JSON.stringify({ error: authResult.error }),
          { status: authResult.status, headers: { "Content-Type": "application/json" } }
        );
      }

      const authContext = authResult.context;

      const scopeCheck = requireScopes(authContext, ["tickets:write"]);
      if (!scopeCheck.success) {
        return new Response(
          JSON.stringify({ error: scopeCheck.error }),
          { status: scopeCheck.status, headers: { "Content-Type": "application/json" } }
        );
      }

      const pathParts = url.pathname.split("/");
      const ticketId = pathParts[pathParts.length - 2];

      if (!ticketId || ticketId === "tickets") {
        return new Response(
          JSON.stringify({ error: "Ticket ID required" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      let reason: string | undefined;
      try {
        const body = await request.json();
        reason = body.reason;
      } catch {
        // Body is optional
      }

      await ctx.runMutation(
        internal.api.v1.ticketsInternal.voidTicketInternal,
        {
          organizationId: authContext.organizationId,
          ticketId,
          reason,
          performedBy: authContext.userId,
        }
      );

      return new Response(
        JSON.stringify({ success: true }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "X-Organization-Id": authContext.organizationId,
          },
        }
      );
    } catch (error) {
      console.error("API /tickets/:id/void error:", error);
      const message = error instanceof Error ? error.message : "Internal server error";
      const status = message === "Ticket not found" ? 404 :
                     message.includes("already cancelled") ? 400 : 500;
      return new Response(
        JSON.stringify({ error: message }),
        { status, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  // Path not matched
  return new Response(
    JSON.stringify({ error: "Not found" }),
    { status: 404, headers: { "Content-Type": "application/json" } }
  );
});

/**
 * CORS OPTIONS handler for tickets endpoints
 */
export const handleOptions = httpAction(async (ctx, request) => {
  const origin = request.headers.get("origin");
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": origin || "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Organization-Id",
      "Access-Control-Max-Age": "86400",
    },
  });
});
