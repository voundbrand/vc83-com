/**
 * Transaction Corrections - READ ONLY INVESTIGATION
 *
 * Helper queries to identify transactions with incorrect tax calculations
 * DO NOT include any mutations - manual approval required
 */

import { v } from "convex/values";
import { query } from "./_generated/server";

/**
 * Find transactions that may have incorrect VAT calculations
 *
 * This finds transactions where the totalPrice was calculated by adding VAT
 * instead of extracting it from the gross price.
 *
 * READ ONLY - Just returns data for review
 */
export const findSuspectTransactions = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    startDate: v.optional(v.number()), // Filter by date range
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Get all transactions for this organization
    const transactions = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "transaction")
      )
      .filter((q) => {
        let filter = q.eq(q.field("organizationId"), args.organizationId);

        if (args.startDate) {
          filter = q.and(filter, q.gte(q.field("_creationTime"), args.startDate));
        }
        if (args.endDate) {
          filter = q.and(filter, q.lte(q.field("_creationTime"), args.endDate));
        }

        return filter;
      })
      .collect();

    // Analyze each transaction
    const analysis = transactions.map((t) => {
      const totalPriceInCents = (t.customProperties?.totalPriceInCents as number) || 0;
      const unitPriceInCents = (t.customProperties?.unitPriceInCents as number) || 0;
      const taxAmountInCents = (t.customProperties?.taxAmountInCents as number) || 0;
      const quantity = (t.customProperties?.quantity as number) || 1;
      const taxRate = (t.customProperties?.taxRatePercent as number) || 19;
      const paymentIntentId = t.customProperties?.stripePaymentIntentId as string | undefined;

      // Calculate what the amounts SHOULD be if price is inclusive
      const correctNetPerUnit = Math.round(totalPriceInCents / quantity / (1 + taxRate / 100));
      const correctTaxAmount = totalPriceInCents - (correctNetPerUnit * quantity);

      // Calculate what it IS (exclusive calculation)
      const currentNetTotal = unitPriceInCents * quantity;
      const calculatedTotal = currentNetTotal + taxAmountInCents;

      const isLikelySuspect =
        // Check if total = net + tax (exclusive calculation was used)
        Math.abs(calculatedTotal - totalPriceInCents) < 10 && // Allow 10 cent rounding
        taxAmountInCents > 0;

      return {
        transactionId: t._id,
        createdAt: t._creationTime,
        productName: t.customProperties?.productName as string,
        paymentIntentId,

        // Current (possibly wrong) values
        current: {
          totalPriceInCents,
          unitPriceInCents,
          taxAmountInCents,
          quantity,
        },

        // Corrected values (if inclusive)
        corrected: {
          totalPriceInCents, // Same (this is what Stripe charged)
          unitPriceInCents: correctNetPerUnit,
          taxAmountInCents: correctTaxAmount,
          quantity,
        },

        // Analysis
        isLikelySuspect,
        difference: {
          unitPrice: unitPriceInCents - correctNetPerUnit,
          taxAmount: taxAmountInCents - correctTaxAmount,
        },
      };
    });

    // Filter to only suspect transactions
    const suspectTransactions = analysis.filter(a => a.isLikelySuspect);

    return {
      totalTransactions: transactions.length,
      suspectCount: suspectTransactions.length,
      suspectTransactions,
      summary: {
        message: `Found ${suspectTransactions.length} transactions that may need correction`,
        warning: "⚠️ REVIEW MANUALLY before making any changes!",
      },
    };
  },
});

/**
 * Get detailed transaction info for manual review
 *
 * Use this to inspect individual transactions before correcting
 */
export const getTransactionDetail = query({
  args: {
    sessionId: v.string(),
    transactionId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const transaction = await ctx.db.get(args.transactionId);

    if (!transaction || transaction.type !== "transaction") {
      throw new Error("Transaction not found");
    }

    return {
      transactionId: transaction._id,
      createdAt: transaction._creationTime,
      customProperties: transaction.customProperties,

      // Extract key fields
      totalPriceInCents: transaction.customProperties?.totalPriceInCents as number,
      unitPriceInCents: transaction.customProperties?.unitPriceInCents as number,
      taxAmountInCents: transaction.customProperties?.taxAmountInCents as number,
      quantity: transaction.customProperties?.quantity as number,
      taxRatePercent: transaction.customProperties?.taxRatePercent as number,
      paymentIntentId: transaction.customProperties?.stripePaymentIntentId as string,
      productName: transaction.customProperties?.productName as string,
    };
  },
});
