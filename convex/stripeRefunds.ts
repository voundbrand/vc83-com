/**
 * Stripe Refund Actions
 *
 * Handles Stripe payment refunds for transactions
 */

import { v } from "convex/values";
import { action, ActionCtx, mutation, MutationCtx } from "./_generated/server";
import { api } from "./_generated/api";
import { parseTransaction } from "./lib/ontologyHelpers";

/**
 * Internal mutation to update transaction with refund information
 */
export const updateTransactionRefundInfo = mutation({
  args: {
    sessionId: v.string(),
    transactionId: v.id("objects"),
    refundId: v.string(),
    refundAmount: v.number(),
    refundDate: v.number(),
    refundReason: v.string(),
    isFullRefund: v.boolean(),
  },
  handler: async (ctx: MutationCtx, args) => {
    // Get the transaction
    const transaction = await ctx.db.get(args.transactionId);

    if (!transaction || transaction.type !== "transaction") {
      throw new Error("Transaction not found");
    }

    // Update with refund information
    await ctx.db.patch(args.transactionId, {
      customProperties: {
        ...transaction.customProperties,
        paymentStatus: args.isFullRefund ? "refunded" : "partially_refunded",
        refundId: args.refundId,
        refundAmount: args.refundAmount,
        refundDate: args.refundDate,
        refundReason: args.refundReason,
      },
      updatedAt: Date.now(),
    });

    console.log(`✅ [updateTransactionRefundInfo] Updated transaction ${args.transactionId} with refund info`);

    return args.transactionId;
  },
});

/**
 * Process a full or partial refund for a transaction via Stripe
 */
export const processStripeRefund = action({
  args: {
    sessionId: v.string(),
    transactionId: v.id("objects"),
    refundAmount: v.optional(v.number()), // Amount in cents (optional - defaults to full refund)
    reason: v.optional(v.string()),
  },
  handler: async (ctx: ActionCtx, args): Promise<{
    success: boolean;
    refund?: {
      id: string;
      amount: number;
      status: string;
      created: number;
      paymentIntent: string | null;
    };
    message: string;
  }> => {
    console.log(`Starting refund for transaction: ${args.transactionId}`);

    // Get transaction details
    const transactionDoc = await ctx.runQuery(api.transactionOntology.getTransaction, {
      sessionId: args.sessionId,
      transactionId: args.transactionId,
    });

    const transaction = parseTransaction(transactionDoc);

    if (!transaction) {
      throw new Error(`Transaction not found: ${args.transactionId}`);
    }

    // Extract payment data from customProperties
    const stripePaymentIntentId = transaction.stripePaymentIntentId;
    const totalAmount: number = transaction.totalPriceInCents || 0;
    const paymentStatus = transaction.paymentStatus || "paid";

    // Validate payment can be refunded
    if (!stripePaymentIntentId) {
      throw new Error("No Stripe payment intent ID found for this transaction");
    }

    if (paymentStatus !== "paid") {
      throw new Error(`Cannot refund transaction with status: ${paymentStatus}`);
    }

    // Determine refund amount (full or partial)
    const refundAmountInCents: number = args.refundAmount || totalAmount;

    if (refundAmountInCents > totalAmount) {
      throw new Error(`Refund amount (${refundAmountInCents}) cannot exceed transaction total (${totalAmount})`);
    }

    if (refundAmountInCents <= 0) {
      throw new Error("Refund amount must be greater than 0");
    }

    try {
      // Initialize Stripe (using environment variable)
      const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

      if (!stripeSecretKey) {
        throw new Error("Stripe secret key not configured");
      }

      // Import Stripe dynamically (since we're in an action)
      const Stripe = (await import("stripe")).default;
      const stripe = new Stripe(stripeSecretKey, {
        apiVersion: "2025-10-29.clover",
      });

      console.log(`Processing Stripe refund for payment intent: ${stripePaymentIntentId}`);
      console.log(`Refund amount: ${refundAmountInCents} cents (${refundAmountInCents === totalAmount ? 'full' : 'partial'} refund)`);

      // Create the refund in Stripe
      const refund: any = await stripe.refunds.create({
        payment_intent: stripePaymentIntentId,
        amount: refundAmountInCents,
        reason: (args.reason || "requested_by_customer") as "duplicate" | "fraudulent" | "requested_by_customer",
      });

      console.log(`Stripe refund created successfully: ${refund.id}`);

      // Update transaction with refund information
      await ctx.runMutation(api.stripeRefunds.updateTransactionRefundInfo, {
        sessionId: args.sessionId,
        transactionId: args.transactionId,
        refundId: refund.id,
        refundAmount: refundAmountInCents,
        refundDate: Date.now(),
        refundReason: args.reason || "requested_by_customer",
        isFullRefund: refundAmountInCents === totalAmount,
      });

      console.log(`Transaction updated with refund information`);

      // Return refund details
      return {
        success: true,
        refund: {
          id: refund.id,
          amount: refund.amount,
          status: refund.status,
          created: refund.created,
          paymentIntent: refund.payment_intent,
        },
        message: refundAmountInCents === totalAmount
          ? `Full refund of ${refundAmountInCents / 100} processed successfully`
          : `Partial refund of ${refundAmountInCents / 100} processed successfully (${totalAmount / 100} total)`,
      };

    } catch (stripeError: unknown) {
      console.error(`Stripe refund error:`, stripeError);

      // Extract error message
      const errorMessage = stripeError instanceof Error
        ? stripeError.message
        : "Unknown Stripe error occurred";

      throw new Error(`Failed to process refund: ${errorMessage}`);
    }
  },
});

/**
 * Check if a transaction can be refunded
 */
export const canRefundTransaction = action({
  args: {
    sessionId: v.string(),
    transactionId: v.id("objects"),
  },
  handler: async (ctx: ActionCtx, args): Promise<{
    canRefund: boolean;
    reason?: string;
    remainingAmount?: number;
  }> => {
    const transactionDoc = await ctx.runQuery(api.transactionOntology.getTransaction, {
      sessionId: args.sessionId,
      transactionId: args.transactionId,
    });

    const transaction = parseTransaction(transactionDoc);

    if (!transaction) {
      return {
        canRefund: false,
        reason: "Transaction not found",
      };
    }

    const stripePaymentIntentId = transaction.stripePaymentIntentId;
    const paymentStatus = transaction.paymentStatus || "paid";
    const refundAmount = transaction.refundAmount;
    const totalAmount: number = transaction.totalPriceInCents || 0;

    // Check if already fully refunded
    if (refundAmount && refundAmount >= totalAmount) {
      return {
        canRefund: false,
        reason: "Transaction already fully refunded",
      };
    }

    // Check payment status
    if (paymentStatus !== "paid" && paymentStatus !== "partially_refunded") {
      return {
        canRefund: false,
        reason: `Cannot refund transaction with status: ${paymentStatus}`,
      };
    }

    // Check for Stripe payment intent
    if (!stripePaymentIntentId) {
      return {
        canRefund: false,
        reason: "No Stripe payment found for this transaction",
      };
    }

    return {
      canRefund: true,
      remainingAmount: totalAmount - (refundAmount || 0),
    };
  },
});
