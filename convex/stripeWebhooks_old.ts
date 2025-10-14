/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * STRIPE WEBHOOK PROCESSORS
 * Handles async processing of Stripe webhook events
 *
 * This file contains the business logic for each webhook event type.
 * The HTTP endpoint (http.ts) receives webhooks and schedules these handlers.
 */

import { internalAction, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import Stripe from "stripe";

// Type for the internal action context
type ActionCtx = {
  runQuery: (func: any, args: any) => Promise<any>;
  runMutation: (func: any, args: any) => Promise<any>;
};

/**
 * PROCESS WEBHOOK EVENT
 * Main router for handling different Stripe event types
 */
export const processWebhook = internalAction({
  args: {
    eventType: v.string(),
    eventId: v.string(),
    eventData: v.string(), // JSON-stringified Stripe object
    created: v.number(),
  },
  handler: async (ctx, args) => {
    console.log(`Processing webhook: ${args.eventType} (${args.eventId})`);

    try {
      // Parse event data
      const data = JSON.parse(args.eventData);

      // Route to appropriate handler based on event type
      switch (args.eventType) {
        // CONNECT ACCOUNT EVENTS
        case "account.updated":
          await handleAccountUpdated(ctx, data);
          break;

        case "account.external_account.created":
          await handleExternalAccountCreated(ctx, data);
          break;

        case "account.application.deauthorized":
          await handleAccountDeauthorized(ctx, data);
          break;

        // PAYMENT EVENTS (Phase 3)
        case "payment_intent.succeeded":
          await handlePaymentSucceeded(ctx, data);
          break;

        case "payment_intent.payment_failed":
          await handlePaymentFailed(ctx, data);
          break;

        case "charge.refunded":
          await handleChargeRefunded(ctx, data);
          break;

        // BILLING/INVOICE EVENTS (Future - B2B Invoicing)
        case "invoice.payment_succeeded":
          await handleInvoicePaymentSucceeded(ctx, data);
          break;

        case "invoice.payment_failed":
          await handleInvoicePaymentFailed(ctx, data);
          break;

        default:
          console.log(`Unhandled webhook event type: ${args.eventType}`);
      }

      // Log that we successfully processed this webhook
      await ctx.runMutation(internal.stripeWebhooks.logWebhookEvent, {
        eventId: args.eventId,
        eventType: args.eventType,
        processedAt: Date.now(),
        success: true,
      });

      console.log(`✓ Successfully processed: ${args.eventType} (${args.eventId})`);
    } catch (error) {
      console.error(`Error processing webhook ${args.eventId}:`, error);

      // Log the failure
      await ctx.runMutation(internal.stripeWebhooks.logWebhookEvent, {
        eventId: args.eventId,
        eventType: args.eventType,
        processedAt: Date.now(),
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });

      throw error; // Re-throw so Stripe knows it failed
    }
  },
});

/**
 * HANDLE ACCOUNT UPDATED
 * Updates organization when Stripe Connect account status changes
 *
 * This is the CRITICAL webhook for Phase 2 - it auto-syncs account status!
 */
async function handleAccountUpdated(ctx: ActionCtx, account: Stripe.Account) {
  console.log(`Handling account.updated for ${account.id}`, {
    charges_enabled: account.charges_enabled,
    payouts_enabled: account.payouts_enabled,
    details_submitted: account.details_submitted,
  });

  // Find organization by Stripe account ID
  const org = await ctx.runQuery(internal.stripeConnect.findOrgByStripeAccount, {
    stripeAccountId: account.id,
  });

  if (!org) {
    console.warn(`No organization found for Stripe account: ${account.id}`);
    return;
  }

  // Determine account status based on Stripe data
  let accountStatus: "pending" | "active" | "restricted" | "disabled";

  if (account.charges_enabled && account.payouts_enabled) {
    accountStatus = "active";
  } else if (account.requirements?.disabled_reason) {
    accountStatus = "disabled";
  } else if (account.details_submitted) {
    accountStatus = "pending";
  } else {
    accountStatus = "restricted";
  }

  // Update organization in database
  await ctx.runMutation(internal.stripeConnect.updateStripeConnectAccountInternal, {
    organizationId: org._id,
    stripeAccountId: account.id,
    accountStatus,
    chargesEnabled: account.charges_enabled || false,
    payoutsEnabled: account.payouts_enabled || false,
    onboardingCompleted: account.details_submitted || false,
  });

  console.log(`✓ Updated organization ${org._id} status to: ${accountStatus}`);
}

/**
 * HANDLE EXTERNAL ACCOUNT CREATED
 * Logs when user adds a bank account or card to their Connect account
 */
async function handleExternalAccountCreated(ctx: ActionCtx, externalAccount: Stripe.BankAccount | Stripe.Card) {
  console.log(`External account created: ${externalAccount.id}`, {
    type: externalAccount.object, // "bank_account" or "card"
    last4: externalAccount.last4,
  });

  // TODO: Could create audit log entry here
  // For now, just log it
}

/**
 * HANDLE ACCOUNT DEAUTHORIZED
 * User disconnected their Stripe Connect account from your platform
 */
async function handleAccountDeauthorized(ctx: ActionCtx, account: Stripe.Account) {
  console.log(`Account deauthorized: ${account.id}`);

  // Find organization
  const org = await ctx.runQuery(internal.stripeConnect.findOrgByStripeAccount, {
    stripeAccountId: account.id,
  });

  if (!org) {
    console.warn(`No organization found for deauthorized account: ${account.id}`);
    return;
  }

  // Clear Stripe connection from organization
  await ctx.runMutation(internal.stripeConnect.clearStripeConnection, {
    organizationId: org._id,
  });

  console.log(`✓ Cleared Stripe connection for organization: ${org._id}`);
}

/**
 * HANDLE PAYMENT SUCCEEDED (Phase 3)
 * Customer successfully completed a payment
 */
async function handlePaymentSucceeded(ctx: ActionCtx, paymentIntent: Stripe.PaymentIntent) {
  console.log(`Payment succeeded: ${paymentIntent.id}`, {
    amount: paymentIntent.amount,
    currency: paymentIntent.currency,
  });

  // TODO Phase 3: Create transaction record, send confirmation email
  console.log("TODO: Create transaction record and send confirmation");
}

/**
 * HANDLE PAYMENT FAILED (Phase 3)
 * Payment attempt failed
 */
async function handlePaymentFailed(ctx: ActionCtx, paymentIntent: Stripe.PaymentIntent) {
  console.log(`Payment failed: ${paymentIntent.id}`, {
    amount: paymentIntent.amount,
    last_payment_error: paymentIntent.last_payment_error,
  });

  // TODO Phase 3: Notify customer, create failed transaction record
  console.log("TODO: Handle payment failure");
}

/**
 * HANDLE CHARGE REFUNDED (Phase 3)
 * Refund was processed
 */
async function handleChargeRefunded(ctx: ActionCtx, charge: Stripe.Charge) {
  console.log(`Charge refunded: ${charge.id}`, {
    amount_refunded: charge.amount_refunded,
  });

  // TODO Phase 3: Update transaction status, notify customer
  console.log("TODO: Handle refund");
}

/**
 * HANDLE INVOICE PAYMENT SUCCEEDED (Future - B2B Invoicing)
 * B2B invoice was paid
 */
async function handleInvoicePaymentSucceeded(ctx: ActionCtx, invoice: Stripe.Invoice) {
  console.log(`Invoice paid: ${invoice.id}`, {
    amount_paid: invoice.amount_paid,
    customer: invoice.customer,
  });

  // TODO Future: Mark invoice as paid, send receipt
  console.log("TODO: Handle B2B invoice payment");
}

/**
 * HANDLE INVOICE PAYMENT FAILED (Future - B2B Invoicing)
 * B2B invoice payment failed
 */
async function handleInvoicePaymentFailed(ctx: ActionCtx, invoice: Stripe.Invoice) {
  console.log(`Invoice payment failed: ${invoice.id}`, {
    customer: invoice.customer,
  });

  // TODO Future: Notify customer, retry payment
  console.log("TODO: Handle B2B invoice failure");
}

/**
 * LOG WEBHOOK EVENT
 * Track processed webhooks for debugging and audit
 */
export const logWebhookEvent = internalMutation({
  args: {
    eventId: v.string(),
    eventType: v.string(),
    processedAt: v.number(),
    success: v.boolean(),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // For now, just log to console
    // TODO: Could store in webhookLogs table for audit trail
    if (args.success) {
      console.log(`✓ Webhook logged: ${args.eventType} (${args.eventId})`);
    } else {
      console.error(`✗ Webhook failed: ${args.eventType} (${args.eventId})`, args.error);
    }
  },
});
