/**
 * BEHAVIOR EXECUTION ACTIONS
 *
 * Convex actions for executing workflow behaviors.
 * Each behavior that requires server-side execution (database queries, external APIs)
 * needs an action implementation here.
 *
 * Architecture:
 * - Frontend behaviors (validation, UI logic) run in client
 * - Backend behaviors (data mutations, API calls) run as Convex actions
 * - This file provides the action implementations
 *
 * PHASE 3B: TRANSACTION-BASED INVOICING
 * - Queries TRANSACTIONS instead of tickets (universal for any product type)
 * - Creates DRAFT invoices (editable before sealing)
 * - PDF generation on-demand (not automatic)
 */

import { action } from "../../_generated/server";
import { v } from "convex/values";
import { api } from "../../_generated/api";
import { Doc, Id } from "../../_generated/dataModel";

/**
 * CONSOLIDATED INVOICE GENERATION ACTION (PHASE 3B)
 *
 * Updated to use transaction-based invoicing:
 * 1. Queries transactions (not tickets)
 * 2. Creates draft invoices (editable)
 * 3. No automatic PDF generation
 */
export const executeConsolidatedInvoiceGeneration = action({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    config: v.object({
      // Selection criteria
      eventId: v.optional(v.string()),
      crmOrganizationId: v.optional(v.string()),
      productIds: v.optional(v.array(v.string())),
      dateRange: v.optional(
        v.object({
          startDate: v.optional(v.number()),
          endDate: v.optional(v.number()),
        })
      ),
      paymentStatus: v.optional(v.string()),
      excludeInvoiced: v.optional(v.boolean()),
      minimumTicketCount: v.optional(v.number()),

      // Invoice config
      paymentTerms: v.optional(v.string()),
      invoicePrefix: v.optional(v.string()),
      templateId: v.optional(v.string()),

      // Notifications
      sendEmail: v.optional(v.boolean()),
      ccEmails: v.optional(v.array(v.string())),
      emailSubject: v.optional(v.string()),
      emailMessage: v.optional(v.string()),

      // Notes
      notes: v.optional(v.string()),
      includeTicketHolderDetails: v.optional(v.boolean()),
      groupByTicketHolder: v.optional(v.boolean()),
    }),
  },
  handler: async (ctx, args) => {
    console.log("🧾 [Step 1/5] Starting consolidated invoice generation (PHASE 3B - Transaction-based)", {
      eventId: args.config.eventId,
      crmOrganizationId: args.config.crmOrganizationId,
    });

    // Validation: Must have CRM organization ID
    if (!args.config.crmOrganizationId) {
      return {
        success: false,
        error: "crmOrganizationId is required - must specify which organization to bill",
        steps: [
          { step: "validation", status: "failed", message: "CRM Organization ID is required" }
        ],
      };
    }

    const steps: Array<{ step: string; status: string; message: string; data?: Record<string, unknown> }> = [];

    try {
      // =========================================================================
      // STEP 1: QUERY ELIGIBLE TRANSACTIONS (PHASE 3B: Transaction-based)
      // =========================================================================
      console.log("🧾 [Step 2/5] Finding eligible transactions...");
      steps.push({
        step: "transaction_query",
        status: "started",
        message: "Searching for pending transactions linked to this organization..."
      });

      let allTransactions: Doc<"objects">[] = [];

      try {
        // Query transactions for this CRM organization
        const result = await ctx.runQuery(api.transactionOntology.listTransactions, {
          sessionId: args.sessionId,
          organizationId: args.organizationId,
          crmOrganizationId: args.config.crmOrganizationId as Id<"objects">,
          invoicingStatus: "pending" as const, // Only pending transactions
        });

        const transactions = result.transactions;
        console.log(`🧾 Total pending transactions for CRM org: ${transactions.length}`);

        // Debug: Show sample transaction structure
        if (transactions.length > 0) {
          const sampleTx = transactions[0];
          console.log(`🧾 Sample transaction customProperties keys:`, Object.keys(sampleTx.customProperties || {}));
          console.log(`🧾 Sample transaction data:`, {
            id: sampleTx._id,
            name: sampleTx.name,
            crmOrgId: sampleTx.customProperties?.crmOrganizationId,
            eventId: sampleTx.customProperties?.eventId,
            productId: sampleTx.customProperties?.productId,
            invoicingStatus: sampleTx.customProperties?.invoicingStatus,
            paymentStatus: sampleTx.customProperties?.paymentStatus,
          });
        }

        allTransactions = transactions;

        if (allTransactions.length === 0) {
          console.log(`⚠️ No pending transactions for CRM org ${args.config.crmOrganizationId}`);
          console.log(`⚠️ Transactions may not have been created yet, or they may already be invoiced`);
        }
      } catch (queryError) {
        console.error("❌ Failed to query transactions:", queryError);
        steps.push({
          step: "transaction_query",
          status: "failed",
          message: `Failed to query transactions: ${queryError instanceof Error ? queryError.message : 'Unknown error'}`,
          data: { error: String(queryError) }
        });
        return {
          success: false,
          error: `Failed to query transactions: ${queryError instanceof Error ? queryError.message : 'Unknown error'}`,
          steps,
        };
      }

      // Apply additional filters
      console.log("🧾 Filtering transactions with config:", {
        eventId: args.config.eventId,
        productIds: args.config.productIds,
        paymentStatus: args.config.paymentStatus,
      });

      const eligibleTransactions = allTransactions.filter((tx) => {
        const customProps = tx.customProperties || {};

        // Filter by event if specified
        if (args.config.eventId && customProps.eventId !== args.config.eventId) {
          console.log(`❌ Transaction ${tx._id} excluded: eventId mismatch (has: ${customProps.eventId}, need: ${args.config.eventId})`);
          return false;
        }

        // Filter by product if specified
        if (args.config.productIds && !args.config.productIds.includes(customProps.productId)) {
          console.log(`❌ Transaction ${tx._id} excluded: productId not in list`);
          return false;
        }

        // Filter by payment status if specified
        if (args.config.paymentStatus && customProps.paymentStatus !== args.config.paymentStatus) {
          console.log(`❌ Transaction ${tx._id} excluded: paymentStatus mismatch (has: ${customProps.paymentStatus}, need: ${args.config.paymentStatus})`);
          return false;
        }

        console.log(`✅ Transaction ${tx._id} is eligible`);
        return true;
      });

      console.log(`🧾 After filtering: ${eligibleTransactions.length} eligible transactions`);
      const transactionIds = eligibleTransactions.map((t) => t._id);

      if (transactionIds.length === 0) {
        steps.push({
          step: "transaction_query",
          status: "completed",
          message: "No eligible transactions found for invoicing",
          data: { transactionCount: 0 }
        });
        return {
          success: false,
          error: "No eligible transactions found",
          steps,
        };
      }

      // Check minimum transaction count
      if (args.config.minimumTicketCount && transactionIds.length < args.config.minimumTicketCount) {
        steps.push({
          step: "transaction_query",
          status: "completed",
          message: `Found ${transactionIds.length} transactions, but minimum is ${args.config.minimumTicketCount}`,
          data: { transactionCount: transactionIds.length, minimum: args.config.minimumTicketCount }
        });
        return {
          success: false,
          error: `Insufficient transactions: found ${transactionIds.length}, minimum required is ${args.config.minimumTicketCount}`,
          steps,
        };
      }

      steps.push({
        step: "transaction_query",
        status: "completed",
        message: `Found ${transactionIds.length} eligible transactions`,
        data: { transactionCount: transactionIds.length, transactionIds }
      });

      // =========================================================================
      // STEP 2: CREATE DRAFT INVOICE (PHASE 3B: Editable draft)
      // =========================================================================
      console.log("🧾 [Step 3/5] Creating DRAFT invoice...");
      console.log("🧾 Draft invoice creation params:", {
        sessionId: args.sessionId,
        organizationId: args.organizationId,
        crmOrganizationId: args.config.crmOrganizationId,
        transactionCount: transactionIds.length,
        transactionIds: transactionIds.slice(0, 3), // Show first 3
        paymentTerms: args.config.paymentTerms || "net30",
      });

      steps.push({
        step: "draft_invoice_creation",
        status: "started",
        message: "Creating DRAFT invoice record (editable)..."
      });

      let invoiceResult: { invoiceId: Id<"objects">; [key: string]: unknown };
      try {
        invoiceResult = await ctx.runMutation(api.invoicingOntology.createDraftInvoiceFromTransactions, {
          sessionId: args.sessionId,
          organizationId: args.organizationId,
          crmOrganizationId: args.config.crmOrganizationId as Id<"objects">,
          transactionIds: transactionIds as Id<"objects">[],
          paymentTerms: (args.config.paymentTerms as "due_on_receipt" | "net30" | "net60" | "net90") || "net30",
          notes: args.config.notes,
        }) as { invoiceId: Id<"objects">; [key: string]: unknown };
      } catch (invoiceError) {
        console.error("❌ Failed to create draft invoice:", invoiceError);
        steps.push({
          step: "draft_invoice_creation",
          status: "failed",
          message: `Draft invoice creation failed: ${invoiceError instanceof Error ? invoiceError.message : String(invoiceError)}`,
          data: { error: String(invoiceError) }
        });
        throw new Error(`Draft invoice creation failed: ${invoiceError instanceof Error ? invoiceError.message : 'Unknown error'}`);
      }

      if (!invoiceResult.success) {
        console.error("❌ Draft invoice creation returned success=false:", invoiceResult);
        steps.push({
          step: "draft_invoice_creation",
          status: "failed",
          message: `Draft invoice creation failed: ${invoiceResult.error || 'Unknown reason'}`,
          data: invoiceResult
        });
        throw new Error((invoiceResult.error as string) || "Failed to create draft invoice");
      }

      steps.push({
        step: "draft_invoice_creation",
        status: "completed",
        message: `Draft invoice created: ${invoiceResult.invoiceNumber}`,
        data: {
          invoiceId: invoiceResult.invoiceId,
          invoiceNumber: invoiceResult.invoiceNumber,
          transactionCount: invoiceResult.transactionCount,
          totalInCents: invoiceResult.totalInCents,
          totalAmount: `€${((invoiceResult.totalInCents as number) / 100).toFixed(2)}`,
          isDraft: invoiceResult.isDraft,
        }
      });

      // =========================================================================
      // STEP 3: NO AUTOMATIC PDF GENERATION (PHASE 3B: On-demand only)
      // =========================================================================
      console.log("🧾 [Step 4/5] PDF generation skipped (on-demand only)");
      steps.push({
        step: "pdf_generation",
        status: "skipped",
        message: "PDF will be generated on-demand when user requests it",
        data: { isDraft: true }
      });

      // =========================================================================
      // STEP 4: UPDATE TRANSACTIONS (Already done by createDraftInvoiceFromTransactions)
      // =========================================================================
      console.log("🧾 [Step 5/5] Transactions linked to draft invoice");
      steps.push({
        step: "transaction_update",
        status: "completed",
        message: `Linked ${transactionIds.length} transactions to draft invoice ${invoiceResult.invoiceNumber}`,
        data: { updatedTransactions: transactionIds.length }
      });

      return {
        success: true,
        message: `Successfully created DRAFT invoice ${invoiceResult.invoiceNumber} for ${transactionIds.length} transactions`,
        invoiceId: invoiceResult.invoiceId,
        invoiceNumber: invoiceResult.invoiceNumber,
        transactionCount: invoiceResult.transactionCount,
        totalInCents: invoiceResult.totalInCents,
        isDraft: true,
        requiresSealing: true,
        pdfUrl: null, // No PDF yet - generated on-demand
        steps,
      };
    } catch (error) {
      console.error("❌ Consolidated invoice generation failed:", error);
      steps.push({
        step: "error",
        status: "failed",
        message: error instanceof Error ? error.message : "Unknown error"
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        steps,
      };
    }
  },
});
