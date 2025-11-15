/**
 * BEHAVIOR: GENERATE INVOICE (Behavior 9 - CONDITIONAL!)
 *
 * Generates invoice for employer billing.
 * CONDITIONAL: Only executes if billingMethod === "employer_invoice"
 *
 * Priority: 40
 *
 * Condition: billingMethod === 'employer_invoice'
 *
 * Returns:
 * - invoiceId: ID of created invoice
 * - invoiceNumber: Human-readable invoice number
 * - skipped: true if condition not met
 */

import { action } from "../../_generated/server";
import { v } from "convex/values";
import { api } from "../../_generated/api";
import { Id } from "../../_generated/dataModel";

export const executeGenerateInvoice = action({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    config: v.any(),
    context: v.any(),
  },
  handler: async (ctx, args) => {
    console.log("✓ [Behavior 9/12] Generate Invoice (CONDITIONAL)");

    const context = args.context as {
      billingMethod?: string;
      crmOrganizationId?: string;
      transactionId?: string;
      employerName?: string;
    };

    // Check condition: Only run if employer billing
    if (context.billingMethod !== "employer_invoice") {
      console.log("⏭️ Skipping invoice generation - not employer billing");
      return {
        success: true,
        message: "Skipped - not employer billing",
        data: {
          skipped: true,
          reason: "billingMethod !== 'employer_invoice'",
        },
      };
    }

    if (!context.crmOrganizationId) {
      return {
        success: false,
        error: "CRM Organization ID is required for employer billing",
      };
    }

    if (!context.transactionId) {
      return {
        success: false,
        error: "Transaction ID is required to create invoice",
      };
    }

    console.log(`Creating invoice for employer: ${context.employerName || context.crmOrganizationId}`);

    // Create draft invoice from transaction
    const invoiceResult: any = await ctx.runMutation(api.invoicingOntology.createDraftInvoiceFromTransactions, {
      sessionId: args.sessionId,
      organizationId: args.organizationId,
      crmOrganizationId: context.crmOrganizationId as Id<"objects">,
      transactionIds: [context.transactionId as Id<"objects">],
      paymentTerms: "net30",
      notes: `Event registration invoice for ${context.employerName || "organization"}`,
    });

    if (!invoiceResult.success) {
      return {
        success: false,
        error: invoiceResult.error || "Failed to create invoice",
      };
    }

    console.log(`✅ Invoice created: ${invoiceResult.invoiceNumber}`);

    return {
      success: true,
      message: `Invoice created: ${invoiceResult.invoiceNumber}`,
      data: {
        invoiceId: invoiceResult.invoiceId,
        invoiceNumber: invoiceResult.invoiceNumber,
        isDraft: true,
        totalInCents: invoiceResult.totalInCents,
      },
    };
  },
});
