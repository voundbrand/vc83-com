/**
 * INTERNAL INVOICES ACTIONS
 */

import { internalAction } from "../../_generated/server";
import { v } from "convex/values";
import { internal } from "../../_generated/api";

/**
 * GENERATE INVOICE PDF INTERNAL
 * Creates a PDF for the invoice
 */
export const generateInvoicePdfInternal = internalAction({
  args: {
    invoiceId: v.id("objects"),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args): Promise<ArrayBuffer | null> => {
    // Get invoice data
    const invoice = await ctx.runQuery(internal.invoicingOntology.getInvoiceByIdInternal, {
      invoiceId: args.invoiceId,
    }) as { _id: string; organizationId: string; status: string; customProperties?: Record<string, unknown> } | null;

    if (!invoice || invoice.organizationId !== args.organizationId) {
      return null;
    }

    // Generate PDF using existing PDF generation system
    // For now, return a placeholder
    // In production, call your actual PDF generation service
    const customProps = invoice.customProperties as Record<string, unknown> | undefined;
    const dueDate = (customProps?.dueDate as number) || Date.now();
    const amount = (customProps?.amount as string | number) || "TBD";
    const paymentTerms = (customProps?.paymentTerms as string) || "Net 30";

    const pdfContent = `
      INVOICE
      -------
      Invoice ID: ${invoice._id}
      Status: ${invoice.status}
      Due Date: ${new Date(dueDate).toLocaleDateString()}

      Amount Due: ${amount}

      Payment Terms: ${paymentTerms}
    `;

    // Convert to buffer (in production, use actual PDF library)
    const encoder = new TextEncoder();
    return encoder.encode(pdfContent).buffer;
  },
});

/**
 * GET INVOICE FOR PDF
 * Internal query to get invoice data for PDF generation
 */
export const getInvoiceForPdf = internalAction({
  args: {
    invoiceId: v.id("objects"),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args): Promise<{
    id: string;
    status: string;
    dueDate: number;
    amount: number;
    paymentTerms: string;
  } | null> => {
    const invoice = await ctx.runQuery(internal.invoicingOntology.getInvoiceByIdInternal, {
      invoiceId: args.invoiceId,
    }) as { _id: string; organizationId: string; status: string; customProperties?: Record<string, unknown> } | null;

    if (!invoice || invoice.organizationId !== args.organizationId) {
      return null;
    }

    const customProps = invoice.customProperties as Record<string, unknown> | undefined;
    return {
      id: invoice._id,
      status: invoice.status,
      dueDate: (customProps?.dueDate as number) || Date.now(),
      amount: (customProps?.amount as number) || 0,
      paymentTerms: (customProps?.paymentTerms as string) || "Net 30",
    };
  },
});
