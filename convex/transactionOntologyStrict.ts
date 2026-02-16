import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * STRICT TRANSACTION TABLE MUTATIONS (Phase 3)
 * These run alongside legacy ontology transactions (double-write during migration).
 */
export const createTransactionStrict = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    legacyTransactionId: v.id("objects"),
    checkoutSessionId: v.optional(v.id("objects")),
    lineItems: v.array(v.object({
      productId: v.id("objects"),
      productName: v.string(),
      quantity: v.number(),
      unitPriceInCents: v.number(),
      totalPriceInCents: v.number(),
      taxAmountInCents: v.number(),
      taxRatePercent: v.number(),
      ticketId: v.optional(v.id("objects")),
      eventId: v.optional(v.id("objects")),
      eventName: v.optional(v.string()),
    })),
    subtotalInCents: v.number(),
    taxAmountInCents: v.number(),
    totalInCents: v.number(),
    currency: v.string(),
    paymentMethod: v.string(),
    paymentStatus: v.string(),
    payerType: v.union(v.literal("individual"), v.literal("organization")),
    payerId: v.optional(v.id("objects")),
    customerName: v.string(),
    customerEmail: v.string(),
    customerPhone: v.optional(v.string()),
    language: v.optional(v.string()),
    domainConfigId: v.optional(v.id("objects")),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("transactionsStrict", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

export const createTicketStrict = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    legacyTicketId: v.id("objects"),
    transactionId: v.id("objects"),
    strictTransactionId: v.optional(v.id("transactionsStrict")),
    productId: v.id("objects"),
    attendeeName: v.optional(v.string()),
    attendeeEmail: v.optional(v.string()),
    ticketNumber: v.optional(v.string()),
    eventId: v.optional(v.id("objects")),
    eventName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("ticketsStrict", {
      ...args,
      createdAt: Date.now(),
    });
  },
});
