/**
 * INTERNAL INVOICES ACTIONS
 */

import { internalAction } from "../../_generated/server";
import { v } from "convex/values";
import { Id } from "../../_generated/dataModel";
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
    const invoice: any = await ctx.runQuery(internal.invoicingOntology.getInvoiceByIdInternal, {
      invoiceId: args.invoiceId,
    });

    if (!invoice || invoice.organizationId !== args.organizationId) {
      return null;
    }

    // Generate PDF using existing PDF generation system
    // For now, return a placeholder
    // In production, call your actual PDF generation service
    const dueDate = (invoice.customProperties as any)?.dueDate || Date.now();
    const amount = (invoice.customProperties as any)?.amount || "TBD";
    const paymentTerms = (invoice.customProperties as any)?.paymentTerms || "Net 30";

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
export const getInvoiceForPdf: any = internalAction({
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
    const invoice: any = await ctx.runQuery(internal.invoicingOntology.getInvoiceByIdInternal, {
      invoiceId: args.invoiceId,
    });

    if (!invoice || invoice.organizationId !== args.organizationId) {
      return null;
    }

    return {
      id: invoice._id,
      status: invoice.status,
      dueDate: (invoice.customProperties as any).dueDate,
      amount: (invoice.customProperties as any).amount,
      paymentTerms: (invoice.customProperties as any).paymentTerms,
    };
  },
});
