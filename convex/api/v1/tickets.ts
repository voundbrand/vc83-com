/**
 * API V1: TICKETS ENDPOINT
 *
 * External API for downloading ticket PDFs.
 * Used by external websites to provide downloadable confirmation tickets.
 *
 * Endpoint: GET /api/v1/tickets/{ticketId}/pdf
 *
 * Security: API key required in Authorization header
 */

import { httpAction } from "../../_generated/server";
import { internal } from "../../_generated/api";
import { Id } from "../../_generated/dataModel";

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
