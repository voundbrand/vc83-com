/**
 * STRIPE WEBHOOK PROCESSORS (REFACTORED)
 *
 * This is the refactored version using the payment provider abstraction.
 * Once tested, this will replace stripeWebhooks.ts
 *
 * Key Changes:
 * - Uses StripeConnectProvider for webhook handling
 * - Provider handles all webhook logic
 * - Cleaner separation of concerns
 */

import { internalAction, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { getProviderByCode } from "./paymentProviders";
import type { ProviderWebhookEvent } from "./paymentProviders/types";

/**
 * PROCESS WEBHOOK EVENT (REFACTORED)
 *
 * Main router for handling different Stripe event types.
 * Now delegates to the payment provider for processing.
 */
export const processWebhook = internalAction({
  args: {
    eventType: v.string(),
    eventId: v.string(),
    eventData: v.string(), // JSON-stringified Stripe object
    created: v.number(),
    signature: v.optional(v.string()), // Webhook signature for verification
  },
  handler: async (ctx, args) => {
    console.log(`Processing webhook: ${args.eventType} (${args.eventId})`);

    try {
      // Get Stripe provider
      const provider = getProviderByCode("stripe-connect");

      // Create provider webhook event
      const webhookEvent: ProviderWebhookEvent = {
        provider: "stripe-connect",
        eventType: args.eventType,
        eventId: args.eventId,
        data: JSON.parse(args.eventData),
        signature: args.signature || "",
        rawPayload: args.eventData,
        createdAt: args.created * 1000, // Convert to milliseconds
      };

      // Let provider handle the webhook
      const result = await provider.handleWebhook(webhookEvent);

      // Handle specific actions based on webhook result
      if (result.actionTaken === "account_updated" && result.metadata) {
        // Update organization in database
        const accountId = result.metadata.accountId;
        const status = result.metadata.status;

        // Find organization by account ID
        const org = await ctx.runQuery(
          internal.stripeConnect.findOrgByStripeAccount,
          {
            stripeAccountId: accountId,
          }
        );

        if (org) {
          // Get existing config to preserve isTestMode setting
          const existingProvider = org.paymentProviders?.find(p => p.providerCode === "stripe-connect");
          const isTestMode = existingProvider?.isTestMode ?? false;

          await ctx.runMutation(
            internal.stripeConnect.updateStripeConnectAccountInternal,
            {
              organizationId: org._id,
              stripeAccountId: accountId,
              accountStatus: status as "pending" | "active" | "restricted" | "disabled",
              chargesEnabled: status === "active",
              payoutsEnabled: status === "active",
              onboardingCompleted: status === "active",
              isTestMode, // Preserve organization's mode preference
            }
          );
        }
      }

      if (result.actionTaken === "account_disabled" && result.metadata) {
        // Clear Stripe connection
        const accountId = result.metadata.accountId;

        const org = await ctx.runQuery(
          internal.stripeConnect.findOrgByStripeAccount,
          {
            stripeAccountId: accountId,
          }
        );

        if (org) {
          await ctx.runMutation(
            internal.stripeConnect.clearStripeConnection,
            {
              organizationId: org._id,
            }
          );
        }
      }

      if (result.actionTaken === "checkout_completed" && result.metadata) {
        // Store checkout completion data
        console.log("Checkout completed:", {
          sessionId: result.metadata.sessionId,
          paymentIntentId: result.metadata.paymentIntentId,
          paymentStatus: result.metadata.paymentStatus,
          amountTotal: result.metadata.amountTotal,
          taxAmount: result.metadata.taxAmount,
          currency: result.metadata.currency,
          customerEmail: result.metadata.customerEmail,
          isB2B: result.metadata.isB2B,
          customerTaxIds: result.metadata.customerTaxIds,
        });

        // Future: Store in transactions table with full checkout details
        // await ctx.runMutation(internal.transactions.createTransaction, {
        //   type: "checkout",
        //   providerCode: "stripe",
        //   providerTransactionId: result.metadata.sessionId,
        //   paymentIntentId: result.metadata.paymentIntentId,
        //   organizationId: result.metadata.organizationId,
        //   productId: result.metadata.productId,
        //   amountTotal: result.metadata.amountTotal,
        //   amountSubtotal: result.metadata.amountSubtotal,
        //   taxAmount: result.metadata.taxAmount,
        //   currency: result.metadata.currency,
        //   customerEmail: result.metadata.customerEmail,
        //   customerTaxIds: result.metadata.customerTaxIds,
        //   isB2B: result.metadata.isB2B,
        //   status: result.metadata.paymentStatus,
        // });
      }

      if (result.actionTaken === "payment_succeeded" && result.metadata) {
        // TODO: Create transaction record in database
        console.log("Payment succeeded:", {
          paymentIntentId: result.metadata.paymentIntentId,
          amount: result.metadata.amount,
          currency: result.metadata.currency,
          organizationId: result.metadata.organizationId,
          productId: result.metadata.productId,
        });

        // Future: Store in transactions table
        // await ctx.runMutation(internal.transactions.createTransaction, {
        //   type: "payment",
        //   providerCode: "stripe-connect",
        //   providerTransactionId: result.metadata.paymentIntentId,
        //   organizationId: result.metadata.organizationId,
        //   productId: result.metadata.productId,
        //   amount: result.metadata.amount,
        //   currency: result.metadata.currency,
        //   status: "completed",
        // });
      }

      if (result.actionTaken === "payment_failed" && result.metadata) {
        // TODO: Handle failed payment
        console.log("Payment failed:", {
          paymentIntentId: result.metadata.paymentIntentId,
          error: result.metadata.error,
        });

        // Future: Store failed payment record
      }

      // Log successful processing
      await ctx.runMutation(internal.stripeWebhooks.logWebhookEvent, {
        eventId: args.eventId,
        eventType: args.eventType,
        processedAt: Date.now(),
        success: result.success,
        actionTaken: result.actionTaken,
        message: result.message,
      });

      console.log(`✓ Successfully processed: ${args.eventType} (${args.eventId})`);

      return result;
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
 * LOG WEBHOOK EVENT
 *
 * Track processed webhooks for debugging and audit.
 * TODO: Store in webhookLogs table for persistent audit trail.
 */
export const logWebhookEvent = internalMutation({
  args: {
    eventId: v.string(),
    eventType: v.string(),
    processedAt: v.number(),
    success: v.boolean(),
    actionTaken: v.optional(v.string()),
    message: v.optional(v.string()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // For now, just log to console
    // TODO: Store in webhookLogs table
    if (args.success) {
      console.log(`✓ Webhook logged: ${args.eventType} (${args.eventId})`, {
        actionTaken: args.actionTaken,
        message: args.message,
      });
    } else {
      console.error(
        `✗ Webhook failed: ${args.eventType} (${args.eventId})`,
        args.error
      );
    }

    // Future: Store in database
    // await ctx.db.insert("webhookLogs", {
    //   provider: "stripe-connect",
    //   eventId: args.eventId,
    //   eventType: args.eventType,
    //   processedAt: args.processedAt,
    //   success: args.success,
    //   actionTaken: args.actionTaken,
    //   message: args.message,
    //   error: args.error,
    // });
  },
});

/**
 * VERIFY WEBHOOK SIGNATURE
 *
 * Verify that a webhook came from Stripe and wasn't tampered with.
 * This should be called by the HTTP endpoint before processing.
 */
export const verifyWebhookSignature = internalAction({
  args: {
    payload: v.string(),
    signature: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      // Get Stripe provider
      const provider = getProviderByCode("stripe-connect");

      // Verify signature using provider
      const isValid = provider.verifyWebhookSignature(args.payload, args.signature);

      return { valid: isValid };
    } catch (error) {
      console.error("Webhook signature verification failed:", error);
      return { valid: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  },
});
