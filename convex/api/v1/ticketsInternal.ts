/**
 * INTERNAL TICKETS ACTIONS
 */

import { internalAction } from "../../_generated/server";
import { v } from "convex/values";
import { internal } from "../../_generated/api";

/**
 * GENERATE TICKET PDF INTERNAL
 * Creates a PDF for the ticket
 */
export const generateTicketPdfInternal = internalAction({
  args: {
    ticketId: v.id("objects"),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args): Promise<ArrayBuffer | null> => {
    // Get ticket data
    const ticket = await ctx.runQuery(internal.ticketOntology.getTicketInternal, {
      ticketId: args.ticketId,
    }) as { _id: string; organizationId: string; customProperties?: Record<string, unknown> } | null;

    if (!ticket || ticket.organizationId !== args.organizationId) {
      return null;
    }

    // Generate PDF using existing PDF generation system
    // For now, return a placeholder
    // In production, call your actual PDF generation service
    const customProps = ticket.customProperties as Record<string, unknown> | undefined;
    const registrationData = (customProps?.registrationData as Record<string, unknown>) || {};
    const qrCode = (customProps?.qrCode as string) || "N/A";

    const pdfContent = `
      Ticket Confirmation
      -------------------
      Ticket ID: ${ticket._id}
      Name: ${registrationData.fullName || "Guest"}
      QR Code: ${qrCode}

      Please present this ticket at the event.
    `;

    // Convert to buffer (in production, use actual PDF library)
    const encoder = new TextEncoder();
    return encoder.encode(pdfContent).buffer;
  },
});

/**
 * GET TICKET FOR PDF
 * Internal query to get ticket data for PDF generation
 */
export const getTicketForPdf = internalAction({
  args: {
    ticketId: v.id("objects"),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args): Promise<{
    id: string;
    status: string;
    qrCode: string;
    registrationData: Record<string, unknown>;
  } | null> => {
    const ticket = await ctx.runQuery(internal.ticketOntology.getTicketInternal, {
      ticketId: args.ticketId,
    }) as { _id: string; organizationId: string; status: string; customProperties?: Record<string, unknown> } | null;

    if (!ticket || ticket.organizationId !== args.organizationId) {
      return null;
    }

    const customProps = ticket.customProperties as Record<string, unknown> | undefined;
    return {
      id: ticket._id,
      status: ticket.status,
      qrCode: (customProps?.qrCode as string) || "",
      registrationData: (customProps?.registrationData as Record<string, unknown>) || {},
    };
  },
});
