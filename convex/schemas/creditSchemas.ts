/**
 * CREDIT SYSTEM SCHEMAS v1.0
 *
 * Database tables for the unified credit system.
 * Credits are the single currency for all AI/agent/automation usage.
 *
 * Credit Sources:
 * - Gifted: Referral/redeem/admin grants (may include legacy daily grants)
 * - Monthly: Granted at billing cycle start, expire at end of cycle (no rollover)
 * - Purchased: Never expire while subscription is active (30-day grace if lapsed)
 *
 * Canonical Consumption Order: Gifted -> Monthly -> Purchased
 * Legacy compatibility: historical `daily` bucket can co-exist and is treated
 * as gifted-equivalent balance during transitional reads/consumption.
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

  // Legacy daily credits (kept for backward compatibility)
  dailyCredits: v.number(),
  dailyCreditsLastReset: v.number(), // Timestamp of last daily reset

  // Canonical gifted bucket (referrals/redeem/admin/manual grants)
  giftedCredits: v.optional(v.number()),

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

  // Auto-replenish configuration (off-session Stripe payment when balance drops)
  autoReplenish: v.optional(v.object({
    enabled: v.boolean(),
    thresholdCredits: v.number(),         // Trigger when total drops below this
    amountEur: v.number(),                // EUR amount to charge (30, 60, 100, 250, 500)
    stripeCustomerId: v.string(),         // Org's Stripe customer ID
    stripePaymentMethodId: v.string(),    // Saved card (pm_...)
    lastTriggeredAt: v.optional(v.number()),
    consecutiveFailures: v.number(),
    lastFailureReason: v.optional(v.string()),
    cooldownUntil: v.optional(v.number()),
  })),

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
    v.literal("gift_grant"),       // Gifted/referral/redeem/admin grant
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
    v.literal("gifted"),
    v.literal("daily"),
    v.literal("monthly"),
    v.literal("purchased")
  ),

  // Running balance after this transaction
  balanceAfter: v.object({
    gifted: v.optional(v.number()),
    daily: v.number(),
    monthly: v.number(),
    purchased: v.number(),
    total: v.number(),
  }),

  // Immutable reason taxonomy for deterministic ledger semantics
  reason: v.optional(v.union(
    v.literal("legacy_daily_grant"),
    v.literal("gifted_referral_reward"),
    v.literal("gifted_redeem_code"),
    v.literal("gifted_admin_grant"),
    v.literal("gifted_migration_adjustment"),
    v.literal("monthly_plan_allocation"),
    v.literal("monthly_manual_adjustment"),
    v.literal("purchased_checkout_pack"),
    v.literal("purchased_manual_adjustment"),
    v.literal("purchased_auto_replenish"),
    v.literal("consumption_runtime_action"),
    v.literal("consumption_parent_fallback"),
    v.literal("legacy_migration")
  )),

  // Optional idempotency for grant/write workflows
  idempotencyKey: v.optional(v.string()),

  // Optional expiry metadata for gifted/monthly semantics
  expiresAt: v.optional(v.number()),
  expiryPolicy: v.optional(
    v.union(
      v.literal("none"),
      v.literal("fixed_timestamp"),
      v.literal("billing_period_end")
    )
  ),

  // Scope attribution for personal-vs-org credit semantics
  scopeType: v.optional(v.union(v.literal("organization"), v.literal("personal"))),
  scopeOrganizationId: v.optional(v.id("organizations")),
  scopeUserId: v.optional(v.id("users")),

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
  .index("by_organization_idempotency", ["organizationId", "idempotencyKey"])
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

/**
 * CREDIT REDEMPTION CODES
 *
 * Super-admin managed code grants for gifted credits.
 * Policies are enforced at redemption time and fail closed by default.
 */
export const creditRedemptionCodes = defineTable({
  // Normalized code format (uppercase, trimmed)
  code: v.string(),

  // Lifecycle state
  status: v.union(
    v.literal("active"),
    v.literal("revoked"),
    v.literal("expired"),
    v.literal("exhausted")
  ),

  // Gifted credit grant on successful redemption
  creditsAmount: v.number(),

  // Usage policy
  maxRedemptions: v.number(),
  redemptionCount: v.number(),
  expiresAt: v.optional(v.number()),

  // Targeting restrictions (optional, fail closed when set and not matched)
  allowedTierNames: v.optional(v.array(v.string())),
  allowedOrganizationIds: v.optional(v.array(v.id("organizations"))),
  allowedUserIds: v.optional(v.array(v.id("users"))),

  // Admin metadata
  description: v.optional(v.string()),
  createdByUserId: v.id("users"),
  revokedByUserId: v.optional(v.id("users")),
  revokeReason: v.optional(v.string()),

  // Timestamps
  createdAt: v.number(),
  updatedAt: v.number(),
  revokedAt: v.optional(v.number()),
  lastRedeemedAt: v.optional(v.number()),
})
  .index("by_code", ["code"])
  .index("by_status", ["status"])
  .index("by_created_at", ["createdAt"])
  .index("by_expires_at", ["expiresAt"]);

/**
 * CREDIT CODE REDEMPTIONS
 *
 * Auditable per-redeem events linked to credit transactions.
 */
export const creditCodeRedemptions = defineTable({
  codeId: v.id("creditRedemptionCodes"),
  code: v.string(),
  redeemedByUserId: v.id("users"),
  redeemedByOrganizationId: v.id("organizations"),
  creditsGranted: v.number(),
  creditTransactionId: v.id("creditTransactions"),
  idempotencyKey: v.string(),
  redeemedAt: v.number(),
})
  .index("by_code_id", ["codeId"])
  .index("by_code_id_user", ["codeId", "redeemedByUserId"])
  .index("by_redeemed_by_org", ["redeemedByOrganizationId"])
  .index("by_redeemed_by_user", ["redeemedByUserId"])
  .index("by_redeemed_at", ["redeemedAt"]);
