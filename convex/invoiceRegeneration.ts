/**
 * Invoice PDF Regeneration
 *
 * Allows regenerating invoice PDFs with corrected data
 */

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

/**
 * Regenerate invoice PDF from existing invoice data
 *
 * This reads the current invoice record and generates a new PDF with the current values.
 * Useful after manually correcting invoice amounts in the database.
 */
export const regenerateInvoicePDF = action({
  args: {
    sessionId: v.string(),
    invoiceId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    console.log(`🔄 [regenerateInvoicePDF] Starting regeneration for invoice: ${args.invoiceId}`);

    // Get the invoice
    const invoice = await ctx.runQuery(api.invoicingOntology.getInvoiceById, {
      sessionId: args.sessionId,
      invoiceId: args.invoiceId,
    });

    if (!invoice) {
      throw new Error(`Invoice not found: ${args.invoiceId}`);
    }

    // Get the checkout session ID from the invoice
    const checkoutSessionId = invoice.customProperties?.checkoutSessionId as Id<"objects"> | undefined;
    const crmOrganizationId = invoice.customProperties?.crmOrganizationId as Id<"objects"> | undefined;

    if (!checkoutSessionId) {
      throw new Error("Invoice does not have a checkout session ID");
    }

    console.log(`📄 [regenerateInvoicePDF] Generating PDF for checkout session: ${checkoutSessionId}`);

    // Generate new PDF using existing invoice generation logic
    const pdfAttachment = await ctx.runAction(api.pdfGeneration.generateInvoicePDF, {
      checkoutSessionId,
      crmOrganizationId,
    });

    if (!pdfAttachment) {
      throw new Error("Failed to generate PDF");
    }

    console.log(`✅ [regenerateInvoicePDF] PDF generated, now storing...`);

    // Store the PDF in Convex storage
    // Convert base64 to Blob (no Buffer in Convex runtime)
    const byteCharacters = atob(pdfAttachment.content);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const pdfBlob = new Blob([byteArray], { type: pdfAttachment.contentType });

    const storageId = await ctx.storage.store(pdfBlob);

    // Get the storage URL
    const pdfUrl = await ctx.storage.getUrl(storageId);

    if (!pdfUrl) {
      throw new Error("Failed to get PDF URL from storage");
    }

    console.log(`✅ [regenerateInvoicePDF] PDF stored, URL: ${pdfUrl}`);

    // Update the invoice with new PDF URL
    await ctx.runMutation(internal.invoicingOntology.updateInvoicePdfUrl, {
      invoiceId: args.invoiceId,
      pdfUrl,
    });

    console.log(`✅ [regenerateInvoicePDF] Invoice updated with new PDF URL`);

    return {
      success: true,
      pdfUrl,
      storageId,
      message: "Invoice PDF regenerated successfully",
    };
  },
});
