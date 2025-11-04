/**
 * INTERNAL TICKETS ACTIONS
 */

import { internalAction } from "../../_generated/server";
import { v } from "convex/values";
import { Id } from "../../_generated/dataModel";
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
    const ticket: any = await ctx.runQuery(internal.ticketOntology.getTicketInternal, {
      ticketId: args.ticketId,
    });

    if (!ticket || ticket.organizationId !== args.organizationId) {
      return null;
    }

    // Generate PDF using existing PDF generation system
    // For now, return a placeholder
    // In production, call your actual PDF generation service
    const registrationData = (ticket.customProperties as any)?.registrationData || {};
    const qrCode = (ticket.customProperties as any)?.qrCode || "N/A";

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
export const getTicketForPdf: any = internalAction({
  args: {
    ticketId: v.id("objects"),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args): Promise<{
    id: string;
    status: string;
    qrCode: string;
    registrationData: any;
  } | null> => {
    const ticket: any = await ctx.runQuery(internal.ticketOntology.getTicketInternal, {
      ticketId: args.ticketId,
    });

    if (!ticket || ticket.organizationId !== args.organizationId) {
      return null;
    }

    return {
      id: ticket._id,
      status: ticket.status,
      qrCode: (ticket.customProperties as any).qrCode,
      registrationData: (ticket.customProperties as any).registrationData,
    };
  },
});
