import { defineTable } from "convex/server";
import { v } from "convex/values";

// Strict tables for decoupled transactions and tickets (Phase 3)
export const transactionsStrict = defineTable({
  organizationId: v.id("organizations"),
  legacyTransactionId: v.id("objects"),
  legacySubtype: v.optional(v.string()),
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
  originalTransactionId: v.optional(v.id("objects")),
  refundId: v.optional(v.string()),
  refundAmount: v.optional(v.number()),
  refundDate: v.optional(v.number()),
  refundReason: v.optional(v.string()),
  customerName: v.string(),
  customerEmail: v.string(),
  customerPhone: v.optional(v.string()),
  language: v.optional(v.string()),
  domainConfigId: v.optional(v.id("objects")),
  createdAt: v.number(),
})
  .index("by_org", ["organizationId"])
  .index("by_org_payment_status", ["organizationId", "paymentStatus"])
  .index("by_org_checkout", ["organizationId", "checkoutSessionId"])
  .index("by_legacy", ["legacyTransactionId"]);

export const ticketsStrict = defineTable({
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
  createdAt: v.number(),
})
  .index("by_org", ["organizationId"])
  .index("by_transaction", ["transactionId"])
  .index("by_strict_transaction", ["strictTransactionId"])
  .index("by_event", ["eventId"]);
