/**
 * STRIPE INVOICE WEBHOOK HANDLER
 *
 * Processes Stripe Invoice events from webhook callbacks.
 * Handles invoice lifecycle events:
 * - invoice.created
 * - invoice.finalized
 * - invoice.paid
 * - invoice.payment_failed
 * - invoice.payment_action_required
 * - invoice.voided
 * - invoice.marked_uncollectible
 *
 * Security: Webhook signature verification via Stripe SDK
 */

import { internalAction, internalMutation } from "../../_generated/server";
import { internal } from "../../_generated/api";
import { v } from "convex/values";

/**
 * PROCESS STRIPE INVOICE WEBHOOK
 *
 * Main webhook processor called from HTTP endpoint.
 * Updates local invoice status based on Stripe events.
 */
export const processStripeInvoiceWebhook = internalAction({
  args: {
    eventType: v.string(),
    eventId: v.string(),
    invoiceData: v.any(), // Stripe invoice object
    created: v.number(),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    message: string;
    invoiceId?: string;
  }> => {
    console.log(
      `[Stripe Invoice Webhook] Processing: ${args.eventType} (${args.eventId})`
    );

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const invoice = args.invoiceData as any;
      const stripeInvoiceId = invoice.id as string;

      // Find our invoice by Stripe ID
      const ourInvoice = await ctx.runQuery(
        internal.api.v1.invoicesInternal.findInvoiceByStripeId,
        { stripeInvoiceId }
      );

      if (!ourInvoice) {
        console.log(
          `⚠️ Invoice ${stripeInvoiceId} not found in database - may be external`
        );
        return { success: true, message: "Invoice not in system" };
      }

      // Process event based on type
      switch (args.eventType) {
        case "invoice.created":
          await handleInvoiceCreated(ctx, ourInvoice._id, invoice);
          break;

        case "invoice.finalized":
          await handleInvoiceFinalized(ctx, ourInvoice._id, invoice);
          break;

        case "invoice.paid":
          await handleInvoicePaid(ctx, ourInvoice._id, invoice);
          break;

        case "invoice.payment_failed":
          await handleInvoicePaymentFailed(ctx, ourInvoice._id, invoice);
          break;

        case "invoice.payment_action_required":
          await handleInvoiceActionRequired(ctx, ourInvoice._id, invoice);
          break;

        case "invoice.voided":
          await handleInvoiceVoided(ctx, ourInvoice._id, invoice);
          break;

        case "invoice.marked_uncollectible":
          await handleInvoiceUncollectible(ctx, ourInvoice._id, invoice);
          break;

        default:
          console.log(`ℹ️ Unhandled invoice event: ${args.eventType}`);
      }

      // Log successful processing
      await ctx.runMutation(internal.api.v1.stripeInvoiceWebhooks.logWebhookEvent, {
        eventId: args.eventId,
        eventType: args.eventType,
        invoiceId: ourInvoice._id,
        stripeInvoiceId,
        processedAt: Date.now(),
        success: true,
      });

      const invoiceNumber = (ourInvoice.customProperties as any)?.invoiceNumber || ourInvoice._id;
      console.log(
        `✅ Successfully processed ${args.eventType} for invoice ${invoiceNumber}`
      );

      return {
        success: true,
        message: `Processed ${args.eventType}`,
        invoiceId: ourInvoice._id,
      };
    } catch (error) {
      console.error(
        `❌ Error processing invoice webhook ${args.eventId}:`,
        error
      );

      // Log the failure
      await ctx.runMutation(internal.api.v1.stripeInvoiceWebhooks.logWebhookEvent, {
        eventId: args.eventId,
        eventType: args.eventType,
        invoiceId: null,
        stripeInvoiceId: args.invoiceData.id,
        processedAt: Date.now(),
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });

      throw error;
    }
  },
});

/**
 * EVENT HANDLERS
 */

async function handleInvoiceCreated(ctx: any, invoiceId: any, stripeInvoice: any) {
  console.log(`📝 Invoice created in Stripe: ${stripeInvoice.id}`);

  // Update our invoice with Stripe URLs
  await ctx.runMutation(internal.api.v1.invoicesInternal.updateInvoiceStripeStatus, {
    invoiceId,
    stripeStatus: "draft",
    stripeHostedUrl: stripeInvoice.hosted_invoice_url,
    stripePdfUrl: stripeInvoice.invoice_pdf,
    stripeInvoiceId: stripeInvoice.id,
  });
}

async function handleInvoiceFinalized(ctx: any, invoiceId: any, stripeInvoice: any) {
  console.log(`✅ Invoice finalized in Stripe: ${stripeInvoice.id}`);

  // Update status to sealed and add URLs
  await ctx.runMutation(internal.api.v1.invoicesInternal.updateInvoiceStripeStatus, {
    invoiceId,
    status: "sealed",
    stripeStatus: "open",
    stripeHostedUrl: stripeInvoice.hosted_invoice_url,
    stripePdfUrl: stripeInvoice.invoice_pdf,
  });
}

async function handleInvoicePaid(ctx: any, invoiceId: any, stripeInvoice: any) {
  console.log(
    `💰 Invoice paid in Stripe: ${stripeInvoice.id} - Amount: ${stripeInvoice.amount_paid / 100} ${stripeInvoice.currency}`
  );

  // Update status to paid
  await ctx.runMutation(internal.api.v1.invoicesInternal.updateInvoiceStripeStatus, {
    invoiceId,
    status: "paid",
    stripeStatus: "paid",
    paidAt: stripeInvoice.status_transitions?.paid_at
      ? stripeInvoice.status_transitions.paid_at * 1000
      : Date.now(),
    amountPaidInCents: stripeInvoice.amount_paid,
  });

  // TODO: Trigger payment received email/notification
}

async function handleInvoicePaymentFailed(ctx: any, invoiceId: any, stripeInvoice: any) {
  console.log(`❌ Invoice payment failed: ${stripeInvoice.id}`);

  // Update status to indicate payment failure
  await ctx.runMutation(internal.api.v1.invoicesInternal.updateInvoiceStripeStatus, {
    invoiceId,
    stripeStatus: "open",
    paymentFailureReason: stripeInvoice.last_finalization_error?.message || "Payment failed",
  });

  // TODO: Trigger payment failed notification
}

async function handleInvoiceActionRequired(ctx: any, invoiceId: any, stripeInvoice: any) {
  console.log(`⚠️ Invoice requires action: ${stripeInvoice.id}`);

  // Update status to indicate action required
  await ctx.runMutation(internal.api.v1.invoicesInternal.updateInvoiceStripeStatus, {
    invoiceId,
    stripeStatus: "open",
    actionRequired: true,
  });

  // TODO: Trigger action required notification
}

async function handleInvoiceVoided(ctx: any, invoiceId: any, stripeInvoice: any) {
  console.log(`🚫 Invoice voided: ${stripeInvoice.id}`);

  // Update status to voided
  await ctx.runMutation(internal.api.v1.invoicesInternal.updateInvoiceStripeStatus, {
    invoiceId,
    status: "void",
    stripeStatus: "void",
    voidedAt: Date.now(),
  });
}

async function handleInvoiceUncollectible(ctx: any, invoiceId: any, stripeInvoice: any) {
  console.log(`💸 Invoice marked uncollectible: ${stripeInvoice.id}`);

  // Update status
  await ctx.runMutation(internal.api.v1.invoicesInternal.updateInvoiceStripeStatus, {
    invoiceId,
    stripeStatus: "uncollectible",
  });
}

/**
 * LOG WEBHOOK EVENT
 *
 * Track webhook processing for audit and debugging
 */
export const logWebhookEvent = internalMutation({
  args: {
    eventId: v.string(),
    eventType: v.string(),
    invoiceId: v.union(v.id("objects"), v.null()),
    stripeInvoiceId: v.string(),
    processedAt: v.number(),
    success: v.boolean(),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Log to console for now
    if (args.success) {
      console.log(`✓ Webhook logged: ${args.eventType} (${args.eventId})`, {
        invoiceId: args.invoiceId,
        stripeInvoiceId: args.stripeInvoiceId,
      });
    } else {
      console.error(
        `✗ Webhook failed: ${args.eventType} (${args.eventId})`,
        args.error
      );
    }

    // Future: Store in webhookLogs table
    // await ctx.db.insert("webhookLogs", {
    //   provider: "stripe",
    //   eventId: args.eventId,
    //   eventType: args.eventType,
    //   invoiceId: args.invoiceId,
    //   stripeInvoiceId: args.stripeInvoiceId,
    //   processedAt: args.processedAt,
    //   success: args.success,
    //   error: args.error,
    // });
  },
});
