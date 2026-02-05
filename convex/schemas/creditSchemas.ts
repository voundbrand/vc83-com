/**
 * CREDIT SYSTEM SCHEMAS v1.0
 *
 * Database tables for the unified credit system.
 * Credits are the single currency for all AI/agent/automation usage.
 *
 * Credit Sources:
 * - Daily: 5 credits granted on login, expire at end of day (no rollover)
 * - Monthly: Granted at billing cycle start, expire at end of cycle (no rollover)
 * - Purchased: Never expire while subscription is active (30-day grace if lapsed)
 *
 * Consumption Order: Daily -> Monthly -> Purchased
 *
 * See: docs/pricing-and-trials/NEW_PRICING_PLAN.md
 */

import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * CREDIT BALANCES
 *
 * Tracks current credit balance for each organization.
 * One row per organization, updated on every grant/deduction.
 */
export const creditBalances = defineTable({
  organizationId: v.id("organizations"),

  // Daily credits (reset on login, max from tier config)
  dailyCredits: v.number(),
  dailyCreditsLastReset: v.number(), // Timestamp of last daily reset

  // Monthly credits (from subscription tier)
  monthlyCredits: v.number(),        // Remaining monthly credits
  monthlyCreditsTotal: v.number(),   // Total monthly allocation (from tier)
  monthlyPeriodStart: v.number(),    // Billing cycle start
  monthlyPeriodEnd: v.number(),      // Billing cycle end

  // Purchased credits (from credit pack purchases, never expire)
  purchasedCredits: v.number(),

  // Grace period (if subscription lapses, 30 days before purchased credits forfeit)
  gracePeriodStart: v.optional(v.number()),
  gracePeriodEnd: v.optional(v.number()),

  // Metadata
  lastUpdated: v.number(),
})
  .index("by_organization", ["organizationId"]);

/**
 * CREDIT TRANSACTIONS
 *
 * Audit trail of all credit movements.
 * Every grant, deduction, purchase, and expiry is recorded.
 */
export const creditTransactions = defineTable({
  organizationId: v.id("organizations"),
  userId: v.optional(v.id("users")),

  // Transaction type
  type: v.union(
    v.literal("daily_grant"),      // Daily login credit grant
    v.literal("monthly_grant"),    // Monthly billing cycle grant
    v.literal("purchase"),         // Credit pack purchase
    v.literal("consumption"),      // Credit used for an action
    v.literal("daily_expiry"),     // Daily credits expired (end of day)
    v.literal("monthly_expiry"),   // Monthly credits expired (end of cycle)
    v.literal("grace_forfeit"),    // Purchased credits forfeited (subscription lapsed)
    v.literal("admin_adjustment")  // Manual adjustment by super admin
  ),

  // Amount (positive for grants, negative for consumption)
  amount: v.number(),

  // Which credit pool was affected
  creditSource: v.union(
    v.literal("daily"),
    v.literal("monthly"),
    v.literal("purchased")
  ),

  // Running balance after this transaction
  balanceAfter: v.object({
    daily: v.number(),
    monthly: v.number(),
    purchased: v.number(),
    total: v.number(),
  }),

  // Action details (for consumption transactions)
  action: v.optional(v.string()), // "agent_message", "workflow_trigger", "sequence_step", etc.
  actionCredits: v.optional(v.number()), // How many credits this action cost

  // Related entity (for tracing what used the credits)
  relatedEntityType: v.optional(v.string()), // "agent_task", "workflow", "sequence", etc.
  relatedEntityId: v.optional(v.string()),   // ID of the related entity

  // Parent org credit pool sharing (when sub-org credits are deducted from parent)
  deductedFromParentId: v.optional(v.id("organizations")), // Parent org that actually paid
  childOrganizationId: v.optional(v.id("organizations")),  // Child org that triggered the usage

  // Purchase details (for purchase transactions)
  packId: v.optional(v.string()),            // Credit pack ID
  stripePaymentIntentId: v.optional(v.string()),

  // Timestamps
  createdAt: v.number(),
})
  .index("by_organization", ["organizationId"])
  .index("by_organization_type", ["organizationId", "type"])
  .index("by_organization_created", ["organizationId", "createdAt"])
  .index("by_user", ["userId"])
  .index("by_stripe_payment", ["stripePaymentIntentId"]);

/**
 * CREDIT PURCHASES
 *
 * Records of credit pack purchases.
 * Linked to Stripe payment intents for reconciliation.
 */
export const creditPurchases = defineTable({
  organizationId: v.id("organizations"),
  userId: v.optional(v.id("users")),

  // Pack details
  packId: v.string(),       // "credits_100", "credits_500", etc.
  packName: v.string(),     // "Starter", "Standard", etc.
  creditsAmount: v.number(), // Number of credits purchased

  // Pricing (VAT inclusive, EUR)
  priceInCents: v.number(),
  currency: v.string(),
  vatRate: v.number(),           // 19 (percent)
  netAmountInCents: v.number(),  // Price / 1.19
  vatAmountInCents: v.number(),  // Price - Net

  // Stripe payment
  stripePaymentIntentId: v.string(),
  stripeInvoiceId: v.optional(v.string()),
  paymentStatus: v.union(
    v.literal("succeeded"),
    v.literal("processing"),
    v.literal("failed"),
    v.literal("canceled")
  ),

  // Timestamps
  purchasedAt: v.number(),
  completedAt: v.optional(v.number()),
})
  .index("by_organization", ["organizationId"])
  .index("by_payment_intent", ["stripePaymentIntentId"])
  .index("by_purchased_at", ["organizationId", "purchasedAt"]);
