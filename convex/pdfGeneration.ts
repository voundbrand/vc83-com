/**
 * PDF GENERATION FOR TICKETS AND INVOICES
 *
 * Refactored to delegate to specialized files in convex/pdf/
 * - convex/pdf/ticketPdf.ts
 * - convex/pdf/invoicePdf.ts
 */

import { action } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

const generatedApi: any = require("./_generated/api");

type PDFAttachment = {
  filename: string;
  content: string; // base64
  contentType: string;
  downloadUrl?: string;
};

/**
 * GENERATE TICKET PDF (API Template.io)
 */
export const generateTicketPDF = action({
  args: {
    ticketId: v.id("objects"),
    checkoutSessionId: v.id("objects"),
    templateCode: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<PDFAttachment | null> => {
    return await (ctx as any).runAction(generatedApi.api.pdf.ticketPdf.generateTicketPDF, args);
  },
});

/**
 * GENERATE TICKET PDF FROM TICKET (NO CHECKOUT REQUIRED)
 */
export const generateTicketPDFFromTicket = action({
  args: {
    ticketId: v.id("objects"),
    templateCode: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<string | null> => {
    return await (ctx as any).runAction(generatedApi.api.pdf.ticketPdf.generateTicketPDFFromTicket, args);
  },
});

/**
 * REGENERATE TICKET PDF (Public - for UI button)
 */
export const regenerateTicketPDF = action({
  args: {
    sessionId: v.string(),
    ticketId: v.id("objects"),
    templateCode: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<PDFAttachment | null> => {
    return await (ctx as any).runAction(generatedApi.api.pdf.ticketPdf.regenerateTicketPDF, args);
  },
});

/**
 * GENERATE RECEIPT PDF (Public - for B2C customers)
 */
export const generateReceiptPDF = action({
  args: {
    checkoutSessionId: v.id("objects"),
  },
  handler: async (ctx, args): Promise<PDFAttachment | null> => {
    return await (ctx as any).runAction(generatedApi.api.pdf.invoicePdf.generateReceiptPDF, args);
  },
});

/**
 * GENERATE INVOICE/RECEIPT PDF (API Template.io)
 */
export const generateInvoicePDF = action({
  args: {
    checkoutSessionId: v.id("objects"),
    crmOrganizationId: v.optional(v.id("objects")),
    crmContactId: v.optional(v.id("objects")),
    templateCode: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<PDFAttachment | null> => {
    return await (ctx as any).runAction(generatedApi.api.pdf.invoicePdf.generateInvoicePDF, args);
  },
});

/**
 * GET TICKET IDS FROM CHECKOUT SESSION
 */
export const getTicketIdsFromCheckout = action({
  args: {
    checkoutSessionId: v.id("objects"),
  },
  handler: async (ctx, args): Promise<Id<"objects">[]> => {
    return await (ctx as any).runAction(generatedApi.api.pdf.ticketPdf.getTicketIdsFromCheckout, args);
  },
});

/**
 * GENERATE EVENT ATTENDEE LIST PDF
 */
export const generateEventAttendeeListPDF = action({
  args: {
    eventId: v.id("objects"),
  },
  handler: async (ctx, args): Promise<PDFAttachment | null> => {
    return await (ctx as any).runAction(generatedApi.api.pdf.ticketPdf.generateEventAttendeeListPDF, args);
  },
});

/**
 * GENERATE EVENT ATTENDEE LIST CSV
 */
export const generateEventAttendeeListCSV = action({
  args: {
    eventId: v.id("objects"),
  },
  handler: async (ctx, args): Promise<PDFAttachment | null> => {
    return await (ctx as any).runAction(generatedApi.api.pdf.ticketPdf.generateEventAttendeeListCSV, args);
  },
});
