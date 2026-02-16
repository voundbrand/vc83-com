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
import type { Doc, Id } from "./_generated/dataModel";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const generatedApi: any = require("./_generated/api");

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
    const ruleResult = await (ctx as any).runMutation(generatedApi.api.invoicingOntology.executeInvoiceRule, {
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
    const invoiceResult = await (ctx as any).runMutation(generatedApi.api.invoicingOntology.createConsolidatedInvoice, {
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
    const invoice = await (ctx as any).runQuery(
      generatedApi.internal.invoicingOntology.getInvoiceByIdInternal,
      { invoiceId: invoiceResult.invoiceId }
    ) as Doc<"objects"> | null;

    if (!invoice) {
      throw new Error("Invoice not found after creation");
    }

    // 4. Prepare template data and generate PDF using API Template.io
    const pdfUrl = await generateConsolidatedPdfWithApiTemplate(ctx, invoice);
    await (ctx as any).runMutation(generatedApi.internal.invoicingOntology.updateInvoicePdfUrl, {
      invoiceId: invoiceResult.invoiceId,
      pdfUrl: pdfUrl || "",
    });

    // 8. Send email if requested
    if (args.sendEmail) {
      const billTo = invoice.customProperties?.billTo as { billingEmail?: string };
      if (billTo?.billingEmail) {
        await (ctx as any).runMutation(generatedApi.api.invoicingOntology.markInvoiceAsSent, {
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
    console.log("📄 [generateConsolidatedInvoice] Starting...", {
      ticketCount: args.ticketIds.length,
      crmOrganizationId: args.crmOrganizationId,
    });

    // 1. Create consolidated invoice
    console.log("📄 [Step 1/7] Creating invoice record...");
    const invoiceResult = await (ctx as any).runMutation(generatedApi.api.invoicingOntology.createConsolidatedInvoice, {
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
      console.error("❌ [Step 1/7] Invoice creation failed");
      throw new Error("Failed to create consolidated invoice");
    }
    console.log("✅ [Step 1/7] Invoice created:", invoiceResult.invoiceNumber);

    // 2. Get invoice details
    console.log("📄 [Step 2/7] Fetching invoice details...");
    const invoice = await (ctx as any).runQuery(
      generatedApi.internal.invoicingOntology.getInvoiceByIdInternal,
      { invoiceId: invoiceResult.invoiceId }
    ) as Doc<"objects"> | null;

    if (!invoice) {
      console.error("❌ [Step 2/7] Invoice not found after creation");
      throw new Error("Invoice not found after creation");
    }
    console.log("✅ [Step 2/7] Invoice fetched");

    // 3-5. Generate PDF using API Template.io
    console.log("📄 [Step 3/5] Generating PDF with API Template.io...");
    const templateCode = args.templateId === "b2b_consolidated_detailed" ? "detailed-breakdown" : "b2b-professional";
    const pdfUrl = await generateConsolidatedPdfWithApiTemplate(ctx, invoice, templateCode);
    console.log("✅ [Step 3/5] PDF generated and stored");

    // 4. Update invoice with PDF URL
    console.log("📄 [Step 4/5] Updating invoice with PDF URL...");
    await (ctx as any).runMutation(generatedApi.internal.invoicingOntology.updateInvoicePdfUrl, {
      invoiceId: invoiceResult.invoiceId,
      pdfUrl: pdfUrl || "",
    });
    console.log("✅ [Step 4/5] Invoice updated with PDF");

    // 5. Send email if requested
    console.log("📄 [Step 5/5] Email notification...");
    if (args.sendEmail) {
      const billTo = invoice.customProperties?.billTo as { billingEmail?: string };
      if (billTo?.billingEmail) {
        await (ctx as any).runMutation(generatedApi.api.invoicingOntology.markInvoiceAsSent, {
          sessionId: args.sessionId,
          invoiceId: invoiceResult.invoiceId,
          sentTo: [billTo.billingEmail],
          pdfUrl: pdfUrl || undefined,
        });
        console.log("✅ [Step 5/5] Email sent");
      } else {
        console.log("⏭️ [Step 5/5] Email skipped (no billing email)");
      }
    } else {
      console.log("⏭️ [Step 5/5] Email skipped (sendEmail=false)");
    }

    console.log("🎉 [generateConsolidatedInvoice] Complete!", {
      invoiceNumber: invoiceResult.invoiceNumber,
      ticketCount: invoiceResult.ticketCount,
      totalInCents: invoiceResult.totalInCents,
    });

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

async function prepareConsolidatedTemplateData(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _ctx: any,
  invoice: Doc<"objects">
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<Record<string, any>> {
  const props = invoice.customProperties || {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const billToData = props.billTo as any;

  // Get line items with employee details
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lineItems = (props.lineItems as any[]) || [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const employeeLineItems = lineItems.map((item: any) => ({
    employeeName: item.contactName || "Unknown",
    employeeId: item.contactId,
    description: item.description || `${item.contactName || "Unknown"} - ${item.productName || "Ticket"}`,
    quantity: 1,
    unitPrice: item.unitPriceInCents || 0, // Keep in cents for template
    totalPrice: item.totalPriceInCents || 0, // Keep in cents for template
    subItems: item.subItems || [],
  }));

  return {
    // Invoice details
    invoiceNumber: props.invoiceNumber || invoice._id.substring(0, 12),
    invoiceDate: props.invoiceDate || invoice.createdAt,
    dueDate: props.dueDate || invoice.createdAt + 30 * 24 * 60 * 60 * 1000,

    // Event name (get from first line item or use "Event Registration")
    eventName: lineItems[0]?.eventName || props.eventName || "Event Registration",

    // Employer (Bill To) - nested object as template expects
    billTo: {
      name: billToData?.name || "Unknown Company",
      vatNumber: billToData?.vatNumber,
      billingAddress: billToData?.billingAddress || {},
      billingEmail: billToData?.billingEmail,
      billingContact: billToData?.billingContact,
    },

    // Employee line items - template expects "lineItems" not "employees"
    lineItems: employeeLineItems,
    employeeCount: employeeLineItems.length,

    // Totals (keep in cents for template - it does the conversion)
    subtotal: props.subtotalInCents as number || 0,
    taxAmount: props.taxInCents as number || 0,
    total: props.totalInCents as number || 0,
    currency: (props.currency as string) || "EUR",

    // Payment info
    paymentTerms: props.paymentTerms || "NET30",
    notes: props.notes,
  };
}

/**
 * Generate consolidated invoice PDF using API Template.io
 *
 * Replaces jsPDF-based PDF generation with API Template.io HTML/CSS templates.
 */
async function generateConsolidatedPdfWithApiTemplate(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any,
  invoice: Doc<"objects">,
  templateCode: string = "b2b-professional"
): Promise<string | null> {
  try {
    // 1. Check for API key
    const apiKey = process.env.API_TEMPLATE_IO_KEY;
    if (!apiKey) {
      console.error("❌ API_TEMPLATE_IO_KEY not configured");
      throw new Error("API_TEMPLATE_IO_KEY not configured in environment");
    }

    // 2. Get existing template data
    const templateData = await prepareConsolidatedTemplateData(ctx, invoice);

    // 3. Get seller organization info
    const organization = await (ctx as any).runQuery(
      generatedApi.internal.checkoutSessions.getOrganizationInternal,
      { organizationId: invoice.organizationId }
    );

    // 3b. Get organization contact info (email, phone)
    const orgContact = await (ctx as any).runQuery(
      generatedApi.api.organizationOntology.getOrganizationContact,
      { organizationId: invoice.organizationId }
    );

    // 3c. Get organization billing address
    const billingAddresses = await (ctx as any).runQuery(
      generatedApi.api.organizationOntology.getOrganizationAddresses,
      { organizationId: invoice.organizationId, subtype: "billing" }
    );
    const billingAddress = Array.isArray(billingAddresses) ? billingAddresses[0] : billingAddresses;

    // 4. Format dates for API Template.io
    const formatDate = (timestamp: number) => {
      return new Date(timestamp).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    };

    // 5. Build organization address string from billing address
    const addressParts = [
      billingAddress?.customProperties?.addressLine1,
      billingAddress?.customProperties?.addressLine2,
      [billingAddress?.customProperties?.city, billingAddress?.customProperties?.state, billingAddress?.customProperties?.postalCode].filter(Boolean).join(", "),
      billingAddress?.customProperties?.country,
    ].filter(Boolean);

    // 6. Transform data for API Template.io format
    const invoiceData = {
      // Seller organization (fetched from org settings)
      organization_name: organization?.businessName || organization?.name || "Unknown Organization",
      organization_address: addressParts.join(", ") || undefined,
      organization_phone: orgContact?.customProperties?.contactPhone || undefined,
      organization_email: orgContact?.customProperties?.billingEmail || orgContact?.customProperties?.contactEmail || undefined,
      logo_url: organization?.customProperties?.logoUrl || undefined,
      highlight_color: "#6B46C1",

      // Invoice metadata
      invoice_number: templateData.invoiceNumber,
      invoice_date: formatDate(templateData.invoiceDate),
      due_date: formatDate(templateData.dueDate),

      // Bill to (customer)
      bill_to: {
        company_name: templateData.billTo.name,
        contact_name: templateData.billTo.billingContact,
        address: templateData.billTo.billingAddress?.street || templateData.billTo.billingAddress?.line1,
        city: templateData.billTo.billingAddress?.city,
        state: templateData.billTo.billingAddress?.state,
        zip_code: templateData.billTo.billingAddress?.postalCode,
        country: templateData.billTo.billingAddress?.country,
        vat_number: templateData.billTo.vatNumber,
      },

      // Line items (convert from cents to dollars)
      items: templateData.lineItems.map((item: { description: string; quantity: number; unitPrice: number; totalPrice: number }) => ({
        description: item.description,
        quantity: item.quantity,
        rate: item.unitPrice / 100,
        amount: item.totalPrice / 100,
      })),

      // Totals (convert to dollars)
      subtotal: templateData.subtotal / 100,
      tax_rate: templateData.subtotal > 0 ? (templateData.taxAmount / templateData.subtotal) * 100 : 0,
      tax: templateData.taxAmount / 100,
      total: templateData.total / 100,

      // Payment info
      payment_terms: templateData.paymentTerms,
      notes: templateData.notes,
    };

    // 6. Import and call API Template.io generator
    const { generateInvoicePdfFromTemplate } = await import("./lib/generateInvoicePdf");

    const result = await generateInvoicePdfFromTemplate({
      apiKey,
      templateCode,
      invoiceData,
    });

    if (result.status === "error") {
      console.error("❌ API Template.io error:", result.error, result.message);
      throw new Error(result.message || result.error);
    }

    // 7. Download PDF from API Template.io and store in Convex
    const pdfResponse = await fetch(result.download_url!);
    if (!pdfResponse.ok) {
      throw new Error("Failed to download PDF from API Template.io");
    }

    const pdfBlob = await pdfResponse.blob();
    const storageId = await ctx.storage.store(pdfBlob);
    const pdfUrl = await ctx.storage.getUrl(storageId);

    console.log("✅ PDF generated via API Template.io:", result.transaction_ref);

    return pdfUrl;
  } catch (error) {
    console.error("❌ Failed to generate consolidated PDF with API Template.io:", error);
    throw error;
  }
}
