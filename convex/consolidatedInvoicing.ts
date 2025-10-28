/**
 * CONSOLIDATED INVOICE GENERATOR
 *
 * Generates consolidated B2B invoices using the template system.
 * Implements the AMEOS use case: Multiple employee tickets → Single employer invoice.
 *
 * Flow:
 * 1. Find eligible tickets (linked to employer CRM org)
 * 2. Apply invoice rule configuration
 * 3. Generate consolidated PDF using b2b_consolidated template
 * 4. Send via email (optional)
 * 5. Update tickets with invoice reference
 */

import { action } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";

// ============================================================================
// ACTIONS
// ============================================================================

/**
 * GENERATE CONSOLIDATED INVOICE FROM RULE
 *
 * Executes an invoice rule to create a consolidated invoice.
 * Uses template-based PDF generation.
 */
export const generateConsolidatedInvoiceFromRule = action({
  args: {
    sessionId: v.string(),
    ruleId: v.id("objects"),
    sendEmail: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    invoiceId: string;
    invoiceNumber: string;
    ticketCount: number;
    totalInCents: number;
    pdfUrl: string | null;
  }> => {
    // 1. Execute rule to find eligible tickets
    const ruleResult = await ctx.runMutation(api.invoicingOntology.executeInvoiceRule, {
      sessionId: args.sessionId,
      ruleId: args.ruleId,
    }) as {
      success: boolean;
      eligibleTicketCount: number;
      crmOrganizationId: Id<"objects">;
      eligibleTicketIds: Id<"objects">[];
      paymentTerms: "due_on_receipt" | "net7" | "net15" | "net30" | "net60" | "net90";
    };

    if (!ruleResult.success || ruleResult.eligibleTicketCount === 0) {
      throw new Error("No eligible tickets found for consolidation");
    }

    // 2. Create consolidated invoice record
    const invoiceResult = await ctx.runMutation(api.invoicingOntology.createConsolidatedInvoice, {
      sessionId: args.sessionId,
      organizationId: ruleResult.crmOrganizationId as unknown as Id<"organizations">, // Get from eligible tickets
      crmOrganizationId: ruleResult.crmOrganizationId,
      ticketIds: ruleResult.eligibleTicketIds,
      paymentTerms: ruleResult.paymentTerms,
    }) as {
      success: boolean;
      invoiceId: Id<"objects">;
      invoiceNumber: string;
      ticketCount: number;
      totalInCents: number;
    };

    if (!invoiceResult.success) {
      throw new Error("Failed to create consolidated invoice");
    }

    // 3. Get full invoice details for PDF generation
    const invoice = await ctx.runQuery(
      internal.invoicingOntology.getInvoiceByIdInternal,
      { invoiceId: invoiceResult.invoiceId }
    ) as Doc<"objects"> | null;

    if (!invoice) {
      throw new Error("Invoice not found after creation");
    }

    // 4. Prepare template data
    const templateData = await prepareConsolidatedTemplateData(ctx, invoice);

    // 5. Generate PDF using b2b_consolidated template
    const pdfResult = await ctx.runAction(api.pdfGenerationTemplated.generatePdfFromTemplate, {
      templateId: "b2b_consolidated",
      data: templateData,
      organizationId: invoice.organizationId,
    });

    if (!pdfResult) {
      throw new Error("Failed to generate PDF");
    }

    // 6. Store PDF in Convex storage
    const pdfBlob = Buffer.from(pdfResult.content, "base64");
    const storageId = await ctx.storage.store(
      new Blob([pdfBlob], { type: "application/pdf" })
    );

    // 7. Update invoice with PDF URL
    const pdfUrl = await ctx.storage.getUrl(storageId);
    await ctx.runMutation(internal.invoicingOntology.updateInvoicePdfUrl, {
      invoiceId: invoiceResult.invoiceId,
      pdfUrl: pdfUrl || "",
    });

    // 8. Send email if requested
    if (args.sendEmail) {
      const billTo = invoice.customProperties?.billTo as { billingEmail?: string };
      if (billTo?.billingEmail) {
        await ctx.runMutation(api.invoicingOntology.markInvoiceAsSent, {
          sessionId: args.sessionId,
          invoiceId: invoiceResult.invoiceId,
          sentTo: [billTo.billingEmail],
          pdfUrl: pdfUrl || undefined,
        });
      }
    }

    return {
      success: true,
      invoiceId: invoiceResult.invoiceId,
      invoiceNumber: invoiceResult.invoiceNumber,
      ticketCount: invoiceResult.ticketCount,
      totalInCents: invoiceResult.totalInCents,
      pdfUrl,
    };
  },
});

/**
 * GENERATE CONSOLIDATED INVOICE (Manual)
 *
 * Manually create a consolidated invoice without a rule.
 */
export const generateConsolidatedInvoice = action({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    crmOrganizationId: v.id("objects"),
    ticketIds: v.array(v.id("objects")),
    templateId: v.optional(v.union(
      v.literal("b2b_consolidated"),
      v.literal("b2b_consolidated_detailed")
    )),
    sendEmail: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    invoiceId: string;
    invoiceNumber: string;
    ticketCount: number;
    totalInCents: number;
    pdfUrl: string | null;
  }> => {
    // 1. Create consolidated invoice
    const invoiceResult = await ctx.runMutation(api.invoicingOntology.createConsolidatedInvoice, {
      sessionId: args.sessionId,
      organizationId: args.organizationId,
      crmOrganizationId: args.crmOrganizationId,
      ticketIds: args.ticketIds,
    }) as {
      success: boolean;
      invoiceId: Id<"objects">;
      invoiceNumber: string;
      ticketCount: number;
      totalInCents: number;
    };

    if (!invoiceResult.success) {
      throw new Error("Failed to create consolidated invoice");
    }

    // 2. Get invoice details
    const invoice = await ctx.runQuery(
      internal.invoicingOntology.getInvoiceByIdInternal,
      { invoiceId: invoiceResult.invoiceId }
    ) as Doc<"objects"> | null;

    if (!invoice) {
      throw new Error("Invoice not found after creation");
    }

    // 3. Prepare template data
    const templateData = await prepareConsolidatedTemplateData(ctx, invoice);

    // 4. Generate PDF using selected template
    const templateId: "b2b_consolidated" | "b2b_consolidated_detailed" | "b2c_receipt" =
      args.templateId || "b2b_consolidated";
    const pdfResult = await ctx.runAction(api.pdfGenerationTemplated.generatePdfFromTemplate, {
      templateId,
      data: templateData,
      organizationId: invoice.organizationId,
    });

    if (!pdfResult) {
      throw new Error("Failed to generate PDF");
    }

    // 5. Store PDF
    const pdfBlob = Buffer.from(pdfResult.content, "base64");
    const storageId = await ctx.storage.store(
      new Blob([pdfBlob], { type: "application/pdf" })
    );

    // 6. Update invoice with PDF URL
    const pdfUrl = await ctx.storage.getUrl(storageId);
    await ctx.runMutation(internal.invoicingOntology.updateInvoicePdfUrl, {
      invoiceId: invoiceResult.invoiceId,
      pdfUrl: pdfUrl || "",
    });

    // 7. Send email if requested
    if (args.sendEmail) {
      const billTo = invoice.customProperties?.billTo as { billingEmail?: string };
      if (billTo?.billingEmail) {
        await ctx.runMutation(api.invoicingOntology.markInvoiceAsSent, {
          sessionId: args.sessionId,
          invoiceId: invoiceResult.invoiceId,
          sentTo: [billTo.billingEmail],
          pdfUrl: pdfUrl || undefined,
        });
      }
    }

    return {
      success: true,
      invoiceId: invoiceResult.invoiceId,
      invoiceNumber: invoiceResult.invoiceNumber,
      ticketCount: invoiceResult.ticketCount,
      totalInCents: invoiceResult.totalInCents,
      pdfUrl,
    };
  },
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Prepare template data for consolidated invoice
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function prepareConsolidatedTemplateData(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _ctx: any,
  invoice: Doc<"objects">
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<Record<string, any>> {
  const props = invoice.customProperties || {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const billTo = props.billTo as any;

  // Get line items with employee details
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lineItems = (props.lineItems as any[]) || [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const employeeLineItems = lineItems.map((item: any) => ({
    employeeName: item.contactName || "Unknown",
    employeeId: item.contactId,
    description: item.description,
    quantity: 1,
    unitPrice: (item.unitPriceInCents || 0) / 100,
    totalPrice: (item.totalPriceInCents || 0) / 100,
    subItems: item.subItems || [],
  }));

  return {
    // Invoice details
    invoiceNumber: props.invoiceNumber || invoice._id.substring(0, 12),
    invoiceDate: props.invoiceDate || invoice.createdAt,
    dueDate: props.dueDate || invoice.createdAt + 30 * 24 * 60 * 60 * 1000,

    // Employer (Bill To)
    companyName: billTo?.name || "Unknown Company",
    companyVatNumber: billTo?.vatNumber,
    companyAddress: {
      line1: billTo?.billingAddress?.line1,
      city: billTo?.billingAddress?.city,
      postalCode: billTo?.billingAddress?.postalCode,
      country: billTo?.billingAddress?.country,
    },
    billingEmail: billTo?.billingEmail,
    billingContact: billTo?.billingContact,

    // Employee line items
    employees: employeeLineItems,

    // Totals
    subtotal: (props.subtotalInCents as number || 0) / 100,
    taxAmount: (props.taxInCents as number || 0) / 100,
    total: (props.totalInCents as number || 0) / 100,
    currency: (props.currency as string) || "EUR",

    // Payment info
    paymentTerms: props.paymentTerms || "NET30",
    notes: props.notes,
  };
}
