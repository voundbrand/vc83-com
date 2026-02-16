import { action } from "../_generated/server";
import { internal } from "../_generated/api";

/**
 * Backfill legacy ontology transactions into strict tables.
 * Not executed automatically; run manually when ready.
 */
export const backfillTransactions = action({
  args: {},
  handler: async (ctx) => {
    // Stream transactions in batches to avoid large memory usage
    const batchSize = 50;
    let cursor: string | null = null;
    let migrated = 0;

    while (true) {
      // Query legacy transactions via index
      const page = await ctx.db
        .query("objects")
        .withIndex("by_type", (q) => q.eq("type", "transaction"))
        .paginate({ cursor, numItems: batchSize });

      for (const doc of page.page) {
        // Minimal shape for strict table
        const lineItems = (doc.customProperties?.lineItems as Array<any>) || [];
        const subtotalInCents = doc.customProperties?.subtotalInCents as number | undefined;
        const taxAmountInCents = doc.customProperties?.taxAmountInCents as number | undefined;
        const totalInCents = doc.customProperties?.totalInCents as number | undefined;
        const currency = doc.customProperties?.currency as string | undefined;
        const paymentMethod = doc.customProperties?.paymentMethod as string | undefined;
        const paymentStatus = doc.customProperties?.paymentStatus as string | undefined;
        const payerType = doc.customProperties?.payerType as "individual" | "organization" | undefined;

        if (!payerType || !currency || lineItems.length === 0 || !totalInCents) {
          continue; // skip incomplete records
        }

        await ctx.runMutation(internal.transactionOntologyStrict.createTransactionStrict, {
          organizationId: doc.organizationId,
          legacyTransactionId: doc._id,
          checkoutSessionId: doc.customProperties?.checkoutSessionId,
          lineItems: lineItems.map((item) => ({
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            unitPriceInCents: item.unitPriceInCents,
            totalPriceInCents: item.totalPriceInCents,
            taxAmountInCents: item.taxAmountInCents,
            taxRatePercent: item.taxRatePercent,
            ticketId: item.ticketId,
            eventId: item.eventId,
            eventName: item.eventName,
          })),
          subtotalInCents: subtotalInCents ?? 0,
          taxAmountInCents: taxAmountInCents ?? 0,
          totalInCents,
          currency,
          paymentMethod: paymentMethod || "unknown",
          paymentStatus: paymentStatus || "pending",
          payerType,
          payerId: doc.customProperties?.payerId,
          customerName: (doc.customProperties?.customerName as string) || "",
          customerEmail: (doc.customProperties?.customerEmail as string) || "",
          customerPhone: doc.customProperties?.customerPhone as string | undefined,
          language: doc.customProperties?.language as string | undefined,
          domainConfigId: doc.customProperties?.domainConfigId,
        });

        migrated += 1;
      }

      if (!page.pageInfo.hasNextPage) break;
      cursor = page.pageInfo.nextCursor;
    }

    return { migrated };
  },
});
