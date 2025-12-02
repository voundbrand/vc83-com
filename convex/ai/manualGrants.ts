/**
 * AI MANUAL GRANTS
 *
 * Super admin tools for manually granting AI subscriptions and issuing token packs.
 * Tracks all manual grants for invoicing and audit purposes.
 *
 * Phase 1 Priority Functions:
 * 1. Grant AI subscriptions manually (any tier, custom pricing)
 * 2. Issue token packs manually (for free, track retail value)
 * 3. List all manual grants (for invoicing dashboard)
 * 4. Mark grants as invoiced (for tracking)
 *
 * Storage: Manual grants stored in ontology (objects table) as type="organization_manual_grant"
 */

import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { requireAuthenticatedUser, getUserContext } from "../rbacHelpers";
import type { Id } from "../_generated/dataModel";

// ============================================================================
// 1. GRANT MANUAL SUBSCRIPTION
// ============================================================================

/**
 * GRANT MANUAL SUBSCRIPTION
 *
 * Super admin can manually grant AI subscriptions for any tier at any price.
 *
 * Use Cases:
 * - Beta testers (free access)
 * - Enterprise customers (offline contracts)
 * - Strategic partners (complimentary access)
 * - Internal testing
 *
 * What it does:
 * 1. Creates/updates aiSubscriptions record
 * 2. Stores grant in ontology for tracking
 * 3. Records in billing events for audit
 */
export const grantManualSubscription = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    tier: v.union(
      v.literal("standard"),
      v.literal("privacy-enhanced"),
      v.literal("private-llm-starter"),
      v.literal("private-llm-professional"),
      v.literal("private-llm-enterprise")
    ),
    priceInCents: v.number(), // 0 for free
    startDate: v.number(),
    endDate: v.number(),
    internalNotes: v.string(),
  },
  handler: async (ctx, args) => {
    // 1. Check super admin
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);
    const userContext = await getUserContext(ctx, userId);
    if (!userContext.isGlobal || userContext.roleName !== "super_admin") {
      throw new Error("Super admin only");
    }

    // 2. Calculate token limit based on tier
    const tierTokens: Record<string, number> = {
      "standard": 500_000,
      "privacy-enhanced": 500_000,
      "private-llm-starter": 5_000_000,
      "private-llm-professional": 10_000_000,
      "private-llm-enterprise": 999_999_999,
    };

    // 3. Parse tier for Private LLM
    const isPrivateLLM = args.tier.startsWith("private-llm");
    const mainTier = isPrivateLLM ? "private-llm" : args.tier;
    const privateLLMTier = isPrivateLLM
      ? (args.tier.replace("private-llm-", "") as "starter" | "professional" | "enterprise")
      : undefined;

    // 4. Create/update subscription in aiSubscriptions
    const existing = await ctx.db
      .query("aiSubscriptions")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .first();

    const subscriptionData = {
      organizationId: args.organizationId,
      stripeSubscriptionId: `manual_${Date.now()}`,
      stripeCustomerId: "manual_override",
      stripePriceId: "manual_override",
      status: "active" as const,
      tier: mainTier as "standard" | "privacy-enhanced" | "private-llm",
      privateLLMTier,
      currentPeriodStart: args.startDate,
      currentPeriodEnd: args.endDate,
      cancelAtPeriodEnd: false,
      priceInCents: args.priceInCents,
      currency: "eur",
      includedTokensTotal: tierTokens[args.tier],
      includedTokensUsed: 0,
      updatedAt: Date.now(),
    };

    if (existing) {
      await ctx.db.patch(existing._id, subscriptionData);
    } else {
      await ctx.db.insert("aiSubscriptions", {
        ...subscriptionData,
        createdAt: Date.now(),
      });
    }

    // 5. Calculate retail value
    const retailValues: Record<string, number> = {
      "standard": 4_900,
      "privacy-enhanced": 4_900,
      "private-llm-starter": 250_000,
      "private-llm-professional": 600_000,
      "private-llm-enterprise": 1_200_000,
    };

    // 6. Store grant in ontology (for tracking)
    await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "organization_manual_grant",
      subtype: "subscription",
      name: `Manual Subscription Grant - ${args.tier}`,
      status: "active",
      customProperties: {
        grantType: "subscription",
        tier: args.tier,
        priceInCents: args.priceInCents,
        startDate: args.startDate,
        endDate: args.endDate,
        retailValueInCents: retailValues[args.tier],
        actualChargeInCents: args.priceInCents,
        grantedBy: userId,
        internalNotes: args.internalNotes,
        invoiced: false,
      },
      createdBy: userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // 7. Log in billing events
    await ctx.db.insert("aiBillingEvents", {
      organizationId: args.organizationId,
      eventType: "ai_enabled",
      eventData: {
        tier: args.tier,
        priceInCents: args.priceInCents,
        manualGrant: true,
        grantedBy: userId,
        internalNotes: args.internalNotes,
      },
      success: true,
      triggeredBy: "user",
      userId: userId,
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

// ============================================================================
// 2. ISSUE MANUAL TOKENS
// ============================================================================

/**
 * ISSUE MANUAL TOKENS
 *
 * Super admin can issue token packs for free while tracking retail value.
 *
 * Use Cases:
 * - Customer service compensation
 * - Beta tester rewards
 * - Enterprise contract add-ons
 * - Promotional giveaways
 *
 * What it does:
 * 1. Adds tokens to aiTokenBalance
 * 2. Records purchase in aiTokenPurchases (at €0)
 * 3. Stores grant in ontology for tracking
 */
export const issueManualTokens = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    tokensAmount: v.number(),
    valueInCents: v.number(), // Retail value for tracking
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    // 1. Check super admin
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);
    const userContext = await getUserContext(ctx, userId);
    if (!userContext.isGlobal || userContext.roleName !== "super_admin") {
      throw new Error("Super admin only");
    }

    // 2. Update token balance
    const balance = await ctx.db
      .query("aiTokenBalance")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .first();

    let newBalance = args.tokensAmount;

    if (balance) {
      newBalance = balance.purchasedTokens + args.tokensAmount;
      await ctx.db.patch(balance._id, {
        purchasedTokens: newBalance,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("aiTokenBalance", {
        organizationId: args.organizationId,
        purchasedTokens: args.tokensAmount,
        updatedAt: Date.now(),
      });
    }

    // 3. Record in aiTokenPurchases (at €0 but tracking value)
    await ctx.db.insert("aiTokenPurchases", {
      organizationId: args.organizationId,
      subscriptionId: null as any, // Manual grant, not linked to subscription
      packId: "manual",
      packName: "Manual Grant",
      tokensAmount: args.tokensAmount,
      priceInCents: 0, // Free
      currency: "eur",
      vatRate: 19,
      netAmountInCents: 0,
      vatAmountInCents: 0,
      stripePaymentIntentId: `manual_${Date.now()}`,
      paymentStatus: "succeeded",
      purchasedAt: Date.now(),
      completedAt: Date.now(),
    });

    // 4. Store grant in ontology
    await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "organization_manual_grant",
      subtype: "token_pack",
      name: `Manual Token Grant - ${(args.tokensAmount / 1_000_000).toFixed(1)}M tokens`,
      status: "active",
      customProperties: {
        grantType: "token_pack",
        tokensAmount: args.tokensAmount,
        retailValueInCents: args.valueInCents,
        actualChargeInCents: 0, // Free
        grantedBy: userId,
        reason: args.reason,
        invoiced: false,
      },
      createdBy: userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // 5. Log in billing events
    await ctx.db.insert("aiBillingEvents", {
      organizationId: args.organizationId,
      eventType: "payment_succeeded",
      eventData: {
        tokensAmount: args.tokensAmount,
        valueInCents: args.valueInCents,
        manualGrant: true,
        grantedBy: userId,
        reason: args.reason,
      },
      success: true,
      triggeredBy: "user",
      userId: userId,
      createdAt: Date.now(),
    });

    return { success: true, newBalance };
  },
});

// ============================================================================
// 3. LIST MANUAL GRANTS
// ============================================================================

/**
 * LIST MANUAL GRANTS
 *
 * Returns all manual grants for an organization (for invoicing dashboard).
 *
 * Returns:
 * - All grants (subscriptions + token packs)
 * - Retail values and actual charges
 * - Invoicing status
 * - Granter details
 */
export const listManualGrants = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    // Check super admin
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);
    const userContext = await getUserContext(ctx, userId);
    if (!userContext.isGlobal || userContext.roleName !== "super_admin") {
      throw new Error("Super admin only");
    }

    // Query grants from ontology
    const grants = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "organization_manual_grant")
      )
      .order("desc")
      .collect();

    // Get granter details
    const grantsWithDetails = await Promise.all(
      grants.map(async (grant) => {
        const granter = grant.createdBy ? await ctx.db.get(grant.createdBy as Id<"users">) : null;
        return {
          ...grant,
          granterName: granter ? `${granter.firstName} ${granter.lastName}` : "Unknown",
          granterEmail: granter?.email,
        };
      })
    );

    return grantsWithDetails;
  },
});

// ============================================================================
// 4. MARK GRANTS AS INVOICED
// ============================================================================

/**
 * MARK GRANTS AS INVOICED
 *
 * Mark multiple grants as invoiced with invoice ID.
 *
 * Use Case:
 * - Month-end invoicing workflow
 * - Select uninvoiced grants
 * - Generate manual invoice
 * - Mark as invoiced with invoice reference
 */
export const markGrantsAsInvoiced = mutation({
  args: {
    sessionId: v.string(),
    grantIds: v.array(v.id("objects")),
    invoiceId: v.string(),
  },
  handler: async (ctx, args) => {
    // Check super admin
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);
    const userContext = await getUserContext(ctx, userId);
    if (!userContext.isGlobal || userContext.roleName !== "super_admin") {
      throw new Error("Super admin only");
    }

    // Update grants
    for (const grantId of args.grantIds) {
      const grant = await ctx.db.get(grantId);
      if (grant && grant.type === "organization_manual_grant") {
        await ctx.db.patch(grantId, {
          customProperties: {
            ...grant.customProperties,
            invoiced: true,
            invoiceId: args.invoiceId,
            invoiceDate: Date.now(),
          },
          updatedAt: Date.now(),
        });
      }
    }

    return { success: true, count: args.grantIds.length };
  },
});
