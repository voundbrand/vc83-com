/**
 * AI BILLING MANAGEMENT v3.1
 *
 * Handles Stripe subscription management for AI features.
 * Supports three privacy tiers (all prices include 19% German VAT):
 * - Standard (€49/month) - All models, global routing
 * - Privacy-Enhanced (€49/month) - GDPR-optimized, EU providers, ZDR
 * - Private LLM (€2,999-€14,999/month) - Self-hosted infrastructure
 *
 * Related Files:
 * - convex/schemas/aiBillingSchemas.ts - Database schemas
 * - .kiro/ai_integration_platform/STRIPE_SETUP_CHEAT_SHEET_v3.md - Stripe configuration
 */

import { ConvexError, v } from "convex/values";
import { mutation, query, internalMutation, internalQuery } from "../_generated/server";
import type { AiBillingSource } from "../channels/types";
import {
  resolveAiCreditBillingPolicy,
  resolveAiLegacyTokenLedgerPolicy,
  type AiBillingLedgerMode,
  type AiCreditBillingPolicyDecision,
  type AiCreditRequestSource,
  type AiLegacyTokenLedgerPolicyDecision,
} from "../credits/index";

const aiBillingSourceArgValidator = v.union(
  v.literal("platform"),
  v.literal("byok"),
  v.literal("private")
);

const aiCreditRequestSourceArgValidator = v.union(
  v.literal("llm"),
  v.literal("platform_action")
);

const aiBillingLedgerModeArgValidator = v.union(
  v.literal("credits_ledger"),
  v.literal("legacy_tokens")
);

function normalizeCreditLedgerAction(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export interface AiUsageBillingGuardrailDecision {
  billingPolicy: AiCreditBillingPolicyDecision;
  ledgerPolicy: AiLegacyTokenLedgerPolicyDecision;
  requiresCreditLedgerAction: boolean;
}

export function resolveAiUsageBillingGuardrail(args: {
  billingSource?: AiBillingSource | unknown;
  requestSource?: AiCreditRequestSource | unknown;
  ledgerMode?: AiBillingLedgerMode | unknown;
}): AiUsageBillingGuardrailDecision {
  const billingPolicy = resolveAiCreditBillingPolicy({
    billingSource: args.billingSource,
    requestSource: args.requestSource ?? "llm",
  });
  const ledgerPolicy = resolveAiLegacyTokenLedgerPolicy({
    ledgerMode: args.ledgerMode,
  });
  return {
    billingPolicy,
    ledgerPolicy,
    requiresCreditLedgerAction: billingPolicy.enforceCredits,
  };
}

/**
 * GET SUBSCRIPTION STATUS
 *
 * Returns the current AI subscription status for an organization.
 * Used to display subscription banners and enable/disable AI features.
 */
export const getSubscriptionStatus = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const subscription = await ctx.db
      .query("aiSubscriptions")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .first();

    if (!subscription) {
      return {
        hasSubscription: false,
        status: null,
        tier: null,
        legacyTokenAccountingMode: "deprecated_disabled",
        currentPeriodEnd: null,
        includedTokensTotal: 0,
        includedTokensUsed: 0,
        includedTokensRemaining: 0,
      };
    }

    // Calculate remaining tokens
    const includedTokensRemaining = Math.max(
      0,
      subscription.includedTokensTotal - subscription.includedTokensUsed
    );

    return {
      hasSubscription: true,
      status: subscription.status,
      tier: subscription.tier,
      privateLLMTier: subscription.privateLLMTier,
      legacyTokenAccountingMode:
        subscription.legacyTokenAccountingMode ?? "deprecated_disabled",
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
      includedTokensTotal: subscription.includedTokensTotal,
      includedTokensUsed: subscription.includedTokensUsed,
      includedTokensRemaining,
      priceInCents: subscription.priceInCents,
      currency: subscription.currency,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    };
  },
});

/**
 * GET TOKEN BALANCE
 *
 * Returns purchased token balance (separate from monthly included tokens).
 */
export const getTokenBalance = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const balance = await ctx.db
      .query("aiTokenBalance")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .first();

    if (!balance) {
      return {
        purchasedTokens: 0,
        gracePeriodStart: null,
        gracePeriodEnd: null,
        usageDebitMode: "manual_only",
      };
    }

    return {
      purchasedTokens: balance.purchasedTokens,
      gracePeriodStart: balance.gracePeriodStart || null,
      gracePeriodEnd: balance.gracePeriodEnd || null,
      usageDebitMode: "manual_only",
    };
  },
});

/**
 * GET USAGE SUMMARY
 *
 * Returns token usage summary for current billing period.
 */
export const getUsageSummary = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    // Get current subscription to determine billing period
    const subscription = await ctx.db
      .query("aiSubscriptions")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .first();

    if (!subscription) {
      return {
        periodStart: null,
        periodEnd: null,
        totalTokens: 0,
        totalRequests: 0,
        costInCents: 0,
        byModel: {},
        byRequestType: {},
      };
    }

    // Query usage records for current period
    const usageRecords = await ctx.db
      .query("aiUsage")
      .withIndex("by_period", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("periodStart", subscription.currentPeriodStart)
          .eq("periodEnd", subscription.currentPeriodEnd)
      )
      .collect();

    // Aggregate usage
    let totalTokens = 0;
    let totalRequests = 0;
    let costInCents = 0;
    const byModel: Record<string, { tokens: number; requests: number; cost: number }> = {};
    const byRequestType: Record<string, { tokens: number; requests: number; cost: number }> = {};

    for (const record of usageRecords) {
      totalTokens += record.totalTokens;
      totalRequests += record.requestCount;
      costInCents += record.costInCents;

      // Group by model
      if (!byModel[record.model]) {
        byModel[record.model] = { tokens: 0, requests: 0, cost: 0 };
      }
      byModel[record.model].tokens += record.totalTokens;
      byModel[record.model].requests += record.requestCount;
      byModel[record.model].cost += record.costInCents;

      // Group by request type
      if (!byRequestType[record.requestType]) {
        byRequestType[record.requestType] = { tokens: 0, requests: 0, cost: 0 };
      }
      byRequestType[record.requestType].tokens += record.totalTokens;
      byRequestType[record.requestType].requests += record.requestCount;
      byRequestType[record.requestType].cost += record.costInCents;
    }

    return {
      periodStart: subscription.currentPeriodStart,
      periodEnd: subscription.currentPeriodEnd,
      totalTokens,
      totalRequests,
      costInCents,
      byModel,
      byRequestType,
    };
  },
});

/**
 * UPSERT SUBSCRIPTION FROM STRIPE
 *
 * Creates or updates subscription record from Stripe webhook data.
 * Called by webhook handler when subscription is created/updated.
 */
export const upsertSubscriptionFromStripe = mutation({
  args: {
    organizationId: v.id("organizations"),
    stripeSubscriptionId: v.string(),
    stripeCustomerId: v.string(),
    stripePriceId: v.string(),
    status: v.union(
      v.literal("active"),
      v.literal("past_due"),
      v.literal("canceled"),
      v.literal("incomplete"),
      v.literal("incomplete_expired"),
      v.literal("trialing"),
      v.literal("unpaid"),
      v.literal("paused")
    ),
    tier: v.union(
      v.literal("standard"),
      v.literal("privacy-enhanced"),
      v.literal("private-llm")
    ),
    privateLLMTier: v.optional(
      v.union(v.literal("starter"), v.literal("professional"), v.literal("enterprise"))
    ),
    currentPeriodStart: v.number(),
    currentPeriodEnd: v.number(),
    cancelAtPeriodEnd: v.boolean(),
    canceledAt: v.optional(v.number()),
    priceInCents: v.number(),
    currency: v.string(),
    includedTokensTotal: v.number(),
  },
  handler: async (ctx, args) => {
    // Check if subscription already exists
    const existingSubscription = await ctx.db
      .query("aiSubscriptions")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .first();

    if (existingSubscription) {
      // Update existing subscription
      await ctx.db.patch(existingSubscription._id, {
        stripeSubscriptionId: args.stripeSubscriptionId,
        stripeCustomerId: args.stripeCustomerId,
        stripePriceId: args.stripePriceId,
        status: args.status,
        tier: args.tier,
        privateLLMTier: args.privateLLMTier,
        currentPeriodStart: args.currentPeriodStart,
        currentPeriodEnd: args.currentPeriodEnd,
        cancelAtPeriodEnd: args.cancelAtPeriodEnd,
        canceledAt: args.canceledAt,
        priceInCents: args.priceInCents,
        currency: args.currency,
        includedTokensTotal: args.includedTokensTotal,
        legacyTokenAccountingMode: "deprecated_disabled",
        updatedAt: Date.now(),
      });
      return existingSubscription._id;
    } else {
      // Create new subscription
      return await ctx.db.insert("aiSubscriptions", {
        organizationId: args.organizationId,
        stripeSubscriptionId: args.stripeSubscriptionId,
        stripeCustomerId: args.stripeCustomerId,
        stripePriceId: args.stripePriceId,
        status: args.status,
        tier: args.tier,
        privateLLMTier: args.privateLLMTier,
        currentPeriodStart: args.currentPeriodStart,
        currentPeriodEnd: args.currentPeriodEnd,
        cancelAtPeriodEnd: args.cancelAtPeriodEnd,
        canceledAt: args.canceledAt,
        priceInCents: args.priceInCents,
        currency: args.currency,
        includedTokensTotal: args.includedTokensTotal,
        includedTokensUsed: 0,
        legacyTokenAccountingMode: "deprecated_disabled",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
  },
});

/**
 * UPDATE SUBSCRIPTION STATUS
 *
 * Updates just the status of an existing subscription.
 * Used by webhook handlers for status-only updates.
 */
export const updateSubscriptionStatus = mutation({
  args: {
    organizationId: v.id("organizations"),
    status: v.union(
      v.literal("active"),
      v.literal("past_due"),
      v.literal("canceled"),
      v.literal("incomplete"),
      v.literal("incomplete_expired"),
      v.literal("trialing"),
      v.literal("unpaid"),
      v.literal("paused")
    ),
  },
  handler: async (ctx, args) => {
    const subscription = await ctx.db
      .query("aiSubscriptions")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .first();

    if (!subscription) {
      throw new Error("No subscription found");
    }

    await ctx.db.patch(subscription._id, {
      status: args.status,
      updatedAt: Date.now(),
    });
  },
});

/**
 * RESET MONTHLY TOKEN USAGE
 *
 * Resets the monthly included token usage at the start of a new billing period.
 * Called by webhook handler when invoice.paid event with subscription_cycle reason.
 */
export const resetMonthlyTokenUsage = mutation({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    void ctx;
    void args.organizationId;
    return {
      success: true,
      skipped: true,
      message:
        "Legacy token reset skipped: credits ledger is authoritative for AI runtime charging.",
    };
  },
});

/**
 * CANCEL SUBSCRIPTION
 *
 * Cancels the AI subscription at the end of the current billing period.
 */
export const cancelSubscription = mutation({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const subscription = await ctx.db
      .query("aiSubscriptions")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .first();

    if (!subscription) {
      throw new Error("No active subscription found");
    }

    // TODO: Call Stripe API to cancel subscription at period end
    // For now, just update the database

    await ctx.db.patch(subscription._id, {
      cancelAtPeriodEnd: true,
      canceledAt: Date.now(),
      updatedAt: Date.now(),
    });

    return {
      success: true,
      message: "Subscription will be canceled at the end of the current billing period",
    };
  },
});

/**
 * REACTIVATE SUBSCRIPTION
 *
 * Reactivates a subscription that was set to cancel at period end.
 */
export const reactivateSubscription = mutation({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const subscription = await ctx.db
      .query("aiSubscriptions")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .first();

    if (!subscription) {
      throw new Error("No subscription found");
    }

    if (!subscription.cancelAtPeriodEnd) {
      throw new Error("Subscription is not scheduled for cancellation");
    }

    // TODO: Call Stripe API to reactivate subscription

    await ctx.db.patch(subscription._id, {
      cancelAtPeriodEnd: false,
      canceledAt: undefined,
      updatedAt: Date.now(),
    });

    return {
      success: true,
      message: "Subscription reactivated successfully",
    };
  },
});

/**
 * RECORD AI USAGE
 *
 * Internal function to record AI API usage for billing and monitoring.
 * Called after each AI request (chat, embedding, completion).
 */
export const recordUsage = mutation({
  args: {
    organizationId: v.id("organizations"),
    userId: v.optional(v.id("users")),
    requestType: v.union(
      v.literal("chat"),
      v.literal("embedding"),
      v.literal("completion"),
      v.literal("tool_call")
    ),
    provider: v.string(),
    model: v.string(),
    inputTokens: v.number(),
    outputTokens: v.number(),
    costInCents: v.number(),
    success: v.boolean(),
    errorMessage: v.optional(v.string()),
    requestDurationMs: v.optional(v.number()),
    billingSource: v.optional(aiBillingSourceArgValidator),
    requestSource: v.optional(aiCreditRequestSourceArgValidator),
    ledgerMode: v.optional(aiBillingLedgerModeArgValidator),
    creditLedgerAction: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const usageGuardrail = resolveAiUsageBillingGuardrail({
      billingSource: args.billingSource,
      requestSource: args.requestSource,
      ledgerMode: args.ledgerMode,
    });

    if (usageGuardrail.ledgerPolicy.requestedLedgerMode === "legacy_tokens") {
      throw new ConvexError({
        code: "LEGACY_TOKEN_LEDGER_DISABLED",
        message:
          "Legacy token ledger mutations are disabled. Chargeable AI requests must use the credits ledger.",
      });
    }

    const creditLedgerAction = normalizeCreditLedgerAction(args.creditLedgerAction);
    if (usageGuardrail.requiresCreditLedgerAction && !creditLedgerAction) {
      throw new ConvexError({
        code: "CREDIT_LEDGER_ACTION_REQUIRED",
        message:
          "recordUsage requires creditLedgerAction for credit-metered requests to keep accounting deterministic.",
      });
    }

    // Get current subscription for billing period and tier
    const subscription = await ctx.db
      .query("aiSubscriptions")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .first();

    if (!subscription) {
      throw new Error("No active subscription found");
    }

    // Calculate total tokens
    const totalTokens = args.inputTokens + args.outputTokens;

    // Create usage record
    const usageId = await ctx.db.insert("aiUsage", {
      organizationId: args.organizationId,
      userId: args.userId,
      periodStart: subscription.currentPeriodStart,
      periodEnd: subscription.currentPeriodEnd,
      requestCount: 1,
      inputTokens: args.inputTokens,
      outputTokens: args.outputTokens,
      totalTokens,
      costInCents: args.costInCents,
      requestType: args.requestType,
      provider: args.provider,
      model: args.model,
      tier: subscription.tier,
      billingSource: usageGuardrail.billingPolicy.effectiveBillingSource,
      requestSource: usageGuardrail.billingPolicy.requestSource,
      billingPolicyReason: usageGuardrail.billingPolicy.reason,
      billingLedger: usageGuardrail.ledgerPolicy.effectiveLedgerMode,
      billingLedgerReason: usageGuardrail.ledgerPolicy.reason,
      creditLedgerAction: creditLedgerAction ?? undefined,
      legacyTokenAccountingStatus: "skipped",
      success: args.success,
      errorMessage: args.errorMessage,
      requestDurationMs: args.requestDurationMs,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return {
      usageId,
      tokensUsed: totalTokens,
      remainingIncludedTokens: Math.max(
        0,
        subscription.includedTokensTotal - subscription.includedTokensUsed
      ),
      billingPolicy: usageGuardrail.billingPolicy,
      ledgerPolicy: usageGuardrail.ledgerPolicy,
      legacyTokenAccountingSkipped: true,
    };
  },
});

/**
 * INTERNAL MUTATION WRAPPERS
 *
 * These wrappers allow webhook handlers to call billing functions
 * without authentication (webhooks come from Stripe, not users).
 */

export const upsertSubscriptionFromStripeInternal = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    stripeSubscriptionId: v.string(),
    stripeCustomerId: v.string(),
    stripePriceId: v.string(),
    status: v.union(
      v.literal("active"),
      v.literal("past_due"),
      v.literal("canceled"),
      v.literal("incomplete"),
      v.literal("incomplete_expired"),
      v.literal("trialing"),
      v.literal("unpaid"),
      v.literal("paused")
    ),
    tier: v.union(
      v.literal("standard"),
      v.literal("privacy-enhanced"),
      v.literal("private-llm")
    ),
    privateLLMTier: v.optional(
      v.union(v.literal("starter"), v.literal("professional"), v.literal("enterprise"))
    ),
    currentPeriodStart: v.number(),
    currentPeriodEnd: v.number(),
    cancelAtPeriodEnd: v.boolean(),
    canceledAt: v.optional(v.number()),
    priceInCents: v.number(),
    currency: v.string(),
    includedTokensTotal: v.number(),
  },
  handler: async (ctx, args) => {
    const existingSubscription = await ctx.db
      .query("aiSubscriptions")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .first();

    if (existingSubscription) {
      await ctx.db.patch(existingSubscription._id, {
        stripeSubscriptionId: args.stripeSubscriptionId,
        stripeCustomerId: args.stripeCustomerId,
        stripePriceId: args.stripePriceId,
        status: args.status,
        tier: args.tier,
        privateLLMTier: args.privateLLMTier,
        currentPeriodStart: args.currentPeriodStart,
        currentPeriodEnd: args.currentPeriodEnd,
        cancelAtPeriodEnd: args.cancelAtPeriodEnd,
        canceledAt: args.canceledAt,
        priceInCents: args.priceInCents,
        currency: args.currency,
        includedTokensTotal: args.includedTokensTotal,
        legacyTokenAccountingMode: "deprecated_disabled",
        updatedAt: Date.now(),
      });
      return existingSubscription._id;
    } else {
      return await ctx.db.insert("aiSubscriptions", {
        organizationId: args.organizationId,
        stripeSubscriptionId: args.stripeSubscriptionId,
        stripeCustomerId: args.stripeCustomerId,
        stripePriceId: args.stripePriceId,
        status: args.status,
        tier: args.tier,
        privateLLMTier: args.privateLLMTier,
        currentPeriodStart: args.currentPeriodStart,
        currentPeriodEnd: args.currentPeriodEnd,
        cancelAtPeriodEnd: args.cancelAtPeriodEnd,
        canceledAt: args.canceledAt,
        priceInCents: args.priceInCents,
        currency: args.currency,
        includedTokensTotal: args.includedTokensTotal,
        includedTokensUsed: 0,
        legacyTokenAccountingMode: "deprecated_disabled",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
  },
});

export const updateSubscriptionStatusInternal = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    status: v.union(
      v.literal("active"),
      v.literal("past_due"),
      v.literal("canceled"),
      v.literal("incomplete"),
      v.literal("incomplete_expired"),
      v.literal("trialing"),
      v.literal("unpaid"),
      v.literal("paused")
    ),
  },
  handler: async (ctx, args) => {
    const subscription = await ctx.db
      .query("aiSubscriptions")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .first();

    if (!subscription) {
      throw new Error("No subscription found");
    }

    await ctx.db.patch(subscription._id, {
      status: args.status,
      updatedAt: Date.now(),
    });
  },
});

/**
 * SYNC BILLING DETAILS FROM STRIPE
 *
 * Syncs billing information from Stripe Checkout to organization_legal object.
 * Called by AI subscription webhooks after checkout completion.
 */
export const syncBillingDetailsInternal = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    isB2B: v.boolean(),
    billingEmail: v.optional(v.string()),
    billingName: v.optional(v.string()),
    billingAddress: v.optional(v.object({
      line1: v.string(),
      line2: v.optional(v.string()),
      city: v.string(),
      state: v.optional(v.string()),
      postalCode: v.string(),
      country: v.string(),
    })),
    taxIds: v.optional(v.array(v.object({
      type: v.string(),
      value: v.string(),
    }))),
  },
  handler: async (ctx, args) => {
    // Find or create organization_legal object
    const orgLegal = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "organization_legal")
      )
      .first();

    const now = Date.now();

    // Prepare billing data
    const billingData = {
      isB2B: args.isB2B,
      billingEmail: args.billingEmail,
      billingName: args.billingName,
      billingAddress: args.billingAddress,
      taxIds: args.taxIds,
      lastSyncedFromStripe: now,
    };

    if (orgLegal) {
      // Update existing organization_legal object
      await ctx.db.patch(orgLegal._id, {
        customProperties: {
          ...orgLegal.customProperties,
          ...billingData,
        },
        updatedAt: now,
      });

      console.log(`[AI Billing] Updated organization_legal for ${args.organizationId}`);
    } else {
      // Create new organization_legal object
      // Get organization to set createdBy
      const org = await ctx.db.get(args.organizationId);
      if (!org) {
        throw new Error(`Organization not found: ${args.organizationId}`);
      }

      // Find a member to set as createdBy
      const member = await ctx.db
        .query("organizationMembers")
        .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
        .first();

      // Prepare insert data
      const insertData = {
        organizationId: args.organizationId,
        type: "organization_legal" as const,
        subtype: "billing_entity" as const,
        name: `${org.name} Billing`,
        description: "Billing and legal information",
        status: "active" as const,
        createdAt: now,
        updatedAt: now,
        customProperties: {
          legalName: args.billingName || org.businessName,
          ...billingData,
        },
        ...(member?.userId && { createdBy: member.userId }),
      };

      await ctx.db.insert("objects", insertData);

      console.log(`[AI Billing] Created organization_legal for ${args.organizationId}`);
    }

    return { success: true };
  },
});

/**
 * GET ORGANIZATION INTERNAL
 *
 * Internal query to get organization details for webhook processing.
 * Returns organization name and language preference for emails.
 */
export const getOrganizationInternal = internalQuery({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.organizationId);

    if (!org) {
      return null;
    }

    // Default to English for now
    // TODO: Add language preference to organization or user model
    const language = "en";

    return {
      name: org.name,
      businessName: org.businessName,
      language,
    };
  },
});
