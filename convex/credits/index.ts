/**
 * CREDIT SYSTEM v1.0
 *
 * Unified credit management for the platform.
 * All AI/agent/automation usage is metered through credits.
 *
 * Exports:
 * - getCreditBalance: Get current credit balance for an org
 * - checkCredits: Check if org has enough credits (throws if not)
 * - deductCredits: Deduct credits for an action
 * - grantDailyCredits: Grant daily login credits
 * - grantMonthlyCredits: Grant monthly billing cycle credits
 * - addPurchasedCredits: Add credits from a purchase
 *
 * See: docs/pricing-and-trials/NEW_PRICING_PLAN.md
 */

import { v, ConvexError } from "convex/values";
import { query, mutation, internalMutation, internalQuery } from "../_generated/server";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { internal } from "../_generated/api";
import { getLicenseInternal } from "../licensing/helpers";
import { getNextTierName, type TierName } from "../licensing/tierConfigs";
import {
  getCreditSharingConfig,
  getChildCreditUsageToday,
  getTotalSharedUsageToday,
  recordCreditSharingTransaction,
  resolveChildCap,
} from "./sharing";

// ============================================================================
// QUERIES
// ============================================================================

/**
 * GET CREDIT BALANCE (Public Query)
 *
 * Returns the current credit balance for an organization.
 * Used by the frontend to display credits remaining.
 */
export const getCreditBalance = query({
  args: {
    organizationId: v.id("organizations"),
    includeParent: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    return await getCreditBalanceInternal(ctx, args.organizationId, {
      includeParent: args.includeParent,
    });
  },
});

/**
 * INTERNAL: Get Credit Balance
 *
 * Returns resolved credit balance, creating a default if none exists.
 */
type CreditBalance = {
  exists: boolean;
  dailyCredits: number;
  monthlyCredits: number;
  monthlyCreditsTotal: number;
  purchasedCredits: number;
  totalCredits: number;
  dailyCreditsLastReset: number;
  monthlyPeriodStart: number;
  monthlyPeriodEnd: number;
  parentOrganizationId?: Id<"organizations">;
  parentBalance?: {
    totalCredits: number;
    monthlyCreditsTotal: number;
    isUnlimited: boolean;
  };
  effectiveCredits?: number;
};

export async function getCreditBalanceInternal(
  ctx: QueryCtx,
  organizationId: Id<"organizations">,
  options?: { includeParent?: boolean }
): Promise<CreditBalance> {
  const balance = await ctx.db
    .query("creditBalances")
    .withIndex("by_organization", (q) => q.eq("organizationId", organizationId))
    .first();

  const ownBalance = balance
    ? {
        exists: true,
        dailyCredits: balance.dailyCredits,
        monthlyCredits: balance.monthlyCredits,
        monthlyCreditsTotal: balance.monthlyCreditsTotal,
        purchasedCredits: balance.purchasedCredits,
        totalCredits: balance.dailyCredits + balance.monthlyCredits + balance.purchasedCredits,
        dailyCreditsLastReset: balance.dailyCreditsLastReset,
        monthlyPeriodStart: balance.monthlyPeriodStart,
        monthlyPeriodEnd: balance.monthlyPeriodEnd,
      }
    : {
        exists: false,
        dailyCredits: 0,
        monthlyCredits: 0,
        monthlyCreditsTotal: 0,
        purchasedCredits: 0,
        totalCredits: 0,
        dailyCreditsLastReset: 0,
        monthlyPeriodStart: 0,
        monthlyPeriodEnd: 0,
      };

  // Optionally include parent org balance for sub-orgs
  if (options?.includeParent) {
    const org = await ctx.db.get(organizationId);
    if (org?.parentOrganizationId) {
      const parentBalance = await getCreditBalanceInternal(ctx, org.parentOrganizationId);
      return {
        ...ownBalance,
        parentOrganizationId: org.parentOrganizationId,
        parentBalance: {
          totalCredits: parentBalance.totalCredits,
          monthlyCreditsTotal: parentBalance.monthlyCreditsTotal,
          isUnlimited: parentBalance.monthlyCreditsTotal === -1,
        },
        effectiveCredits: parentBalance.monthlyCreditsTotal === -1
          ? -1
          : ownBalance.totalCredits + parentBalance.totalCredits,
      };
    }
  }

  return ownBalance;
}

/**
 * GET CREDIT BALANCE (Internal Query)
 */
export const getCreditBalanceInternalQuery = internalQuery({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    return await getCreditBalanceInternal(ctx, args.organizationId);
  },
});

/**
 * GET CREDIT HISTORY (Public Query)
 *
 * Returns recent credit transactions for an organization.
 */
export const getCreditHistory = query({
  args: {
    organizationId: v.id("organizations"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;

    const transactions = await ctx.db
      .query("creditTransactions")
      .withIndex("by_organization_created", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .order("desc")
      .take(limit);

    return transactions;
  },
});

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * CHECK AND DEDUCT CREDITS
 *
 * Checks if org has enough credits, deducts them, and records the transaction.
 * Consumption order: Daily -> Monthly -> Purchased
 *
 * Throws CREDITS_EXHAUSTED error if insufficient credits.
 */
export const deductCredits = mutation({
  args: {
    organizationId: v.id("organizations"),
    userId: v.optional(v.id("users")),
    amount: v.number(),
    action: v.string(),
    relatedEntityType: v.optional(v.string()),
    relatedEntityId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await deductCreditsInternal(ctx, args);
  },
});

/**
 * INTERNAL: Deduct Credits
 *
 * Core credit deduction logic. Used by agent execution pipeline.
 */
type DeductCreditsResult = {
  success: boolean;
  creditsRemaining: number;
  isUnlimited: boolean;
  monthlyTotal?: number;
  breakdown?: { dailyUsed: number; monthlyUsed: number; purchasedUsed: number };
  deductedFromParent?: boolean;
  parentOrganizationId?: Id<"organizations">;
};

export async function deductCreditsInternal(
  ctx: MutationCtx,
  args: {
    organizationId: Id<"organizations">;
    userId?: Id<"users">;
    amount: number;
    action: string;
    relatedEntityType?: string;
    relatedEntityId?: string;
    /** When deducting from parent on behalf of a child sub-org */
    childOrganizationId?: Id<"organizations">;
  }
): Promise<DeductCreditsResult> {
  const { organizationId, amount, action } = args;

  // Get current license to check for unlimited credits
  const license = await getLicenseInternal(ctx, organizationId);
  const tierName = license.planTier as TierName;

  // Enterprise with unlimited credits - skip deduction
  if (license.limits.monthlyCredits === -1) {
    // Still record the transaction for auditing
    await ctx.db.insert("creditTransactions", {
      organizationId,
      userId: args.userId,
      type: "consumption",
      amount: -amount,
      creditSource: "monthly",
      balanceAfter: { daily: -1, monthly: -1, purchased: 0, total: -1 },
      action,
      actionCredits: amount,
      relatedEntityType: args.relatedEntityType,
      relatedEntityId: args.relatedEntityId,
      createdAt: Date.now(),
    });
    return { success: true, creditsRemaining: -1, isUnlimited: true };
  }

  // Get or create balance record
  let balance = await ctx.db
    .query("creditBalances")
    .withIndex("by_organization", (q) => q.eq("organizationId", organizationId))
    .first();

  if (!balance) {
    // Create initial balance
    const balanceId = await ctx.db.insert("creditBalances", {
      organizationId,
      dailyCredits: 0,
      dailyCreditsLastReset: 0,
      monthlyCredits: 0,
      monthlyCreditsTotal: 0,
      monthlyPeriodStart: 0,
      monthlyPeriodEnd: 0,
      purchasedCredits: 0,
      lastUpdated: Date.now(),
    });
    balance = await ctx.db.get(balanceId);
    if (!balance) throw new Error("Failed to create credit balance");
  }

  const totalAvailable = balance.dailyCredits + balance.monthlyCredits + balance.purchasedCredits;

  // Check if enough credits — if not, try parent org's pool
  if (totalAvailable < amount) {
    // Look up parent organization for credit pool sharing
    const org = await ctx.db.get(organizationId);
    const parentId = org?.parentOrganizationId;

    if (parentId) {
      // Get parent's sharing config
      const parentOrg = await ctx.db.get(parentId);
      const sharingConfig = getCreditSharingConfig(
        parentOrg as { customProperties?: Record<string, unknown> } | null
      );

      if (!sharingConfig.enabled) {
        throw new ConvexError({
          code: "CREDIT_SHARING_DISABLED",
          message: "Credit sharing is disabled for this organization.",
        });
      }

      // Resolve per-child cap (check overrides)
      const childCap = resolveChildCap(sharingConfig, organizationId);
      const effectiveBlockAt = childCap * sharingConfig.blockAt;

      // Check per-child daily cap
      const childUsageToday = await getChildCreditUsageToday(ctx, parentId, organizationId);

      if (childUsageToday + amount > effectiveBlockAt) {
        throw new ConvexError({
          code: "CHILD_CREDIT_CAP_REACHED",
          message: `Child org has reached daily credit sharing limit (${childCap})`,
          childOrgId: organizationId,
          usage: childUsageToday,
          cap: childCap,
        });
      }

      // Notify if approaching per-child cap
      const effectiveNotifyAt = childCap * sharingConfig.notifyAt;
      if (childUsageToday + amount > effectiveNotifyAt) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (ctx as any).scheduler.runAfter(0, internal.credits.notifications.notifyChildCreditCapApproaching, {
            parentOrgId: parentId,
            childOrgId: organizationId,
            usage: childUsageToday + amount,
            cap: childCap,
          });
        } catch (e) {
          console.warn("[Credits] Failed to schedule child cap notification:", e);
        }
      }

      // Check total shared pool cap
      const totalSharedToday = await getTotalSharedUsageToday(ctx, parentId);
      const totalEffectiveBlock = sharingConfig.maxTotalShared * sharingConfig.blockAt;

      if (totalSharedToday + amount > totalEffectiveBlock) {
        throw new ConvexError({
          code: "SHARED_POOL_EXHAUSTED",
          message: "Total shared credit pool exhausted for today",
          totalShared: totalSharedToday,
          cap: sharingConfig.maxTotalShared,
        });
      }

      // Notify if approaching total shared cap
      if (totalSharedToday + amount > sharingConfig.maxTotalShared * sharingConfig.notifyAt) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (ctx as any).scheduler.runAfter(0, internal.credits.notifications.notifySharedPoolApproaching, {
            parentOrgId: parentId,
            totalShared: totalSharedToday + amount,
            cap: sharingConfig.maxTotalShared,
          });
        } catch (e) {
          console.warn("[Credits] Failed to schedule shared pool notification:", e);
        }
      }

      // Sub-org has insufficient credits — deduct from parent pool
      console.log(`[Credits] Sub-org ${organizationId} has ${totalAvailable} credits, need ${amount}. Falling back to parent ${parentId}`);

      const parentResult = await deductCreditsInternal(ctx, {
        organizationId: parentId,
        userId: args.userId,
        amount,
        action: args.action,
        relatedEntityType: args.relatedEntityType,
        relatedEntityId: args.relatedEntityId,
        childOrganizationId: organizationId,
      });

      // Record sharing ledger entry
      await recordCreditSharingTransaction(ctx, parentId, organizationId, amount, action);

      // Record a tracking transaction on the child org (zero-cost, audit only)
      await ctx.db.insert("creditTransactions", {
        organizationId,
        userId: args.userId,
        type: "consumption",
        amount: -amount,
        creditSource: "monthly",
        balanceAfter: {
          daily: balance.dailyCredits,
          monthly: balance.monthlyCredits,
          purchased: balance.purchasedCredits,
          total: totalAvailable,
        },
        action,
        actionCredits: amount,
        relatedEntityType: args.relatedEntityType,
        relatedEntityId: args.relatedEntityId,
        deductedFromParentId: parentId,
        createdAt: Date.now(),
      });

      return {
        ...parentResult,
        deductedFromParent: true,
        parentOrganizationId: parentId,
      };
    }

    throw new ConvexError({
      code: "CREDITS_EXHAUSTED",
      message: `Not enough credits. Need ${amount}, have ${totalAvailable}. Upgrade to ${getNextTierName(tierName)} or purchase a credit pack.`,
      creditsRequired: amount,
      creditsAvailable: totalAvailable,
      currentTier: tierName,
      nextTier: getNextTierName(tierName),
    });
  }

  // Deduct in order: Daily -> Monthly -> Purchased
  let remaining = amount;
  let dailyUsed = 0;
  let monthlyUsed = 0;
  let purchasedUsed = 0;

  // 1. Daily credits first
  if (remaining > 0 && balance.dailyCredits > 0) {
    dailyUsed = Math.min(remaining, balance.dailyCredits);
    remaining -= dailyUsed;
  }

  // 2. Monthly credits second
  if (remaining > 0 && balance.monthlyCredits > 0) {
    monthlyUsed = Math.min(remaining, balance.monthlyCredits);
    remaining -= monthlyUsed;
  }

  // 3. Purchased credits last
  if (remaining > 0 && balance.purchasedCredits > 0) {
    purchasedUsed = Math.min(remaining, balance.purchasedCredits);
    remaining -= purchasedUsed;
  }

  // Update balance
  const newDaily = balance.dailyCredits - dailyUsed;
  const newMonthly = balance.monthlyCredits - monthlyUsed;
  const newPurchased = balance.purchasedCredits - purchasedUsed;

  await ctx.db.patch(balance._id, {
    dailyCredits: newDaily,
    monthlyCredits: newMonthly,
    purchasedCredits: newPurchased,
    lastUpdated: Date.now(),
  });

  // Determine primary credit source for the transaction record
  let creditSource: "daily" | "monthly" | "purchased" = "daily";
  if (monthlyUsed > dailyUsed && monthlyUsed >= purchasedUsed) creditSource = "monthly";
  if (purchasedUsed > dailyUsed && purchasedUsed > monthlyUsed) creditSource = "purchased";

  // Record transaction
  await ctx.db.insert("creditTransactions", {
    organizationId,
    userId: args.userId,
    type: "consumption",
    amount: -amount,
    creditSource,
    balanceAfter: {
      daily: newDaily,
      monthly: newMonthly,
      purchased: newPurchased,
      total: newDaily + newMonthly + newPurchased,
    },
    action,
    actionCredits: amount,
    relatedEntityType: args.relatedEntityType,
    relatedEntityId: args.relatedEntityId,
    childOrganizationId: args.childOrganizationId,
    createdAt: Date.now(),
  });

  // Schedule threshold check (fire-and-forget)
  if (typeof ctx.scheduler?.runAfter === "function") {
    const totalRemaining = newDaily + newMonthly + newPurchased;
    const monthlyTotal = balance.monthlyCreditsTotal || 0;
    if (monthlyTotal > 0) {
      ctx.scheduler.runAfter(0, internal.credits.notifications.checkThresholds, {
        organizationId,
        currentBalance: totalRemaining,
        monthlyTotal,
      });
    }
  }

  return {
    success: true,
    creditsRemaining: newDaily + newMonthly + newPurchased,
    isUnlimited: false,
    monthlyTotal: balance.monthlyCreditsTotal || 0,
    breakdown: { dailyUsed, monthlyUsed, purchasedUsed },
  };
}

/**
 * GRANT DAILY CREDITS
 *
 * Called on user login. Resets daily credits to tier maximum.
 * Only resets if last reset was on a different calendar day.
 */
export const grantDailyCredits = mutation({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    return await grantDailyCreditsInternal(ctx, args.organizationId);
  },
});

export const grantDailyCreditsInternalMutation = internalMutation({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    return await grantDailyCreditsInternal(ctx, args.organizationId);
  },
});

async function grantDailyCreditsInternal(
  ctx: MutationCtx,
  organizationId: Id<"organizations">
) {
  const license = await getLicenseInternal(ctx, organizationId);
  const dailyAllocation = license.limits.dailyCreditsOnLogin;

  if (dailyAllocation === 0 || dailyAllocation === -1) {
    return { granted: false, reason: "no_daily_credits" };
  }

  // Get or create balance
  let balance = await ctx.db
    .query("creditBalances")
    .withIndex("by_organization", (q) => q.eq("organizationId", organizationId))
    .first();

  const now = Date.now();
  const today = new Date(now).toDateString();
  const lastReset = balance ? new Date(balance.dailyCreditsLastReset).toDateString() : "";

  // Already granted today
  if (today === lastReset) {
    return { granted: false, reason: "already_granted_today" };
  }

  if (!balance) {
    // Create initial balance with daily credits
    await ctx.db.insert("creditBalances", {
      organizationId,
      dailyCredits: dailyAllocation,
      dailyCreditsLastReset: now,
      monthlyCredits: 0,
      monthlyCreditsTotal: 0,
      monthlyPeriodStart: 0,
      monthlyPeriodEnd: 0,
      purchasedCredits: 0,
      lastUpdated: now,
    });
  } else {
    // Reset daily credits
    await ctx.db.patch(balance._id, {
      dailyCredits: dailyAllocation,
      dailyCreditsLastReset: now,
      lastUpdated: now,
    });
  }

  // Record transaction
  await ctx.db.insert("creditTransactions", {
    organizationId,
    type: "daily_grant",
    amount: dailyAllocation,
    creditSource: "daily",
    balanceAfter: {
      daily: dailyAllocation,
      monthly: balance?.monthlyCredits || 0,
      purchased: balance?.purchasedCredits || 0,
      total: dailyAllocation + (balance?.monthlyCredits || 0) + (balance?.purchasedCredits || 0),
    },
    createdAt: now,
  });

  return { granted: true, amount: dailyAllocation };
}

/**
 * GRANT MONTHLY CREDITS
 *
 * Called when a new billing cycle starts (via Stripe webhook or subscription creation).
 * Resets monthly credits to tier allocation.
 */
export const grantMonthlyCredits = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    monthlyCredits: v.number(),
    periodStart: v.number(),
    periodEnd: v.number(),
  },
  handler: async (ctx, args) => {
    const { organizationId, monthlyCredits, periodStart, periodEnd } = args;

    let balance = await ctx.db
      .query("creditBalances")
      .withIndex("by_organization", (q) => q.eq("organizationId", organizationId))
      .first();

    const now = Date.now();

    if (!balance) {
      await ctx.db.insert("creditBalances", {
        organizationId,
        dailyCredits: 0,
        dailyCreditsLastReset: 0,
        monthlyCredits,
        monthlyCreditsTotal: monthlyCredits,
        monthlyPeriodStart: periodStart,
        monthlyPeriodEnd: periodEnd,
        purchasedCredits: 0,
        lastUpdated: now,
      });
    } else {
      await ctx.db.patch(balance._id, {
        monthlyCredits,
        monthlyCreditsTotal: monthlyCredits,
        monthlyPeriodStart: periodStart,
        monthlyPeriodEnd: periodEnd,
        lastUpdated: now,
      });
    }

    // Record transaction
    balance = await ctx.db
      .query("creditBalances")
      .withIndex("by_organization", (q) => q.eq("organizationId", organizationId))
      .first();

    await ctx.db.insert("creditTransactions", {
      organizationId,
      type: "monthly_grant",
      amount: monthlyCredits,
      creditSource: "monthly",
      balanceAfter: {
        daily: balance?.dailyCredits || 0,
        monthly: monthlyCredits,
        purchased: balance?.purchasedCredits || 0,
        total: (balance?.dailyCredits || 0) + monthlyCredits + (balance?.purchasedCredits || 0),
      },
      createdAt: now,
    });

    return { success: true, monthlyCredits };
  },
});

/**
 * ADD PURCHASED CREDITS
 *
 * Called after a successful credit pack purchase (via Stripe webhook).
 * Adds credits to the purchased pool.
 */
// ============================================================================
// CREDIT COSTS REGISTRY
// ============================================================================

/**
 * Credit costs for different agent/automation actions.
 * Used by the execution pipeline to determine deduction amounts.
 */
export const CREDIT_COSTS: Record<string, number> = {
  // Agent messages
  agent_message_simple: 1,     // Small model call (Llama/Mistral)
  agent_message_complex: 3,    // Large model call (Claude/GPT-4o)
  agent_message_default: 2,    // Default for unknown model complexity

  // Tool executions
  tool_query_org_data: 0,      // Read-only queries are free
  tool_search_contacts: 0,     // Read-only
  tool_create_contact: 1,      // CRM write
  tool_update_contact: 1,      // CRM write
  tool_send_email: 1,          // Send + track
  tool_send_ai_email: 2,       // AI writes + sends
  tool_create_workflow: 1,     // Automation setup
  tool_trigger_workflow: 1,    // Automation step
  tool_create_checkout: 1,     // Commerce setup
  tool_create_booking: 1,      // Booking action
  tool_default: 1,             // Default tool cost

  // Layers composition tools
  tool_create_layers_workflow: 2, // Visual workflow creation (nodes/edges)
  tool_link_objects: 0,           // Free — structural linking, not creation

  // Workflow/sequence steps
  workflow_trigger: 1,         // Automation step
  sequence_step_email: 1,      // Send + track
  sequence_step_ai: 2,         // AI writes + sends

  // SMS (platform-owned Infobip)
  sms_outbound: 2,             // Outbound SMS via platform account
  sms_inbound_processing: 1,   // Inbound SMS agent processing

  // Free actions
  form_submission: 0,          // Platform compute, no AI
  builder_generation: 0,       // BYOK - user's V0 credits
};

/**
 * Get the credit cost for an action.
 * Falls back to default costs for unknown actions.
 */
export function getCreditCost(action: string): number {
  return CREDIT_COSTS[action] ?? CREDIT_COSTS.tool_default ?? 1;
}

/**
 * Estimate credit cost for an agent message based on model.
 * Complex models (Claude, GPT-4o) cost more than simple ones.
 */
export function getAgentMessageCost(model: string): number {
  const complexModels = [
    "anthropic/claude-sonnet-4-20250514",
    "anthropic/claude-3-5-sonnet",
    "openai/gpt-4o",
    "google/gemini-pro-1.5",
  ];
  const simpleModels = [
    "openai/gpt-4o-mini",
    "meta-llama/llama-3.1-70b-instruct",
    "mistralai/mistral-large-latest",
  ];

  if (complexModels.some((m) => model.includes(m))) {
    return CREDIT_COSTS.agent_message_complex;
  }
  if (simpleModels.some((m) => model.includes(m))) {
    return CREDIT_COSTS.agent_message_simple;
  }
  return CREDIT_COSTS.agent_message_default;
}

/**
 * Get the credit cost for a tool execution.
 */
export function getToolCreditCost(toolName: string): number {
  const key = `tool_${toolName}`;
  return CREDIT_COSTS[key] ?? CREDIT_COSTS.tool_default ?? 1;
}

// ============================================================================
// INTERNAL MUTATIONS (for use by actions like agent execution)
// ============================================================================

/**
 * INTERNAL: Deduct Credits (for actions/internal pipeline)
 *
 * Same as deductCredits but accessible from internal actions.
 */
export const deductCreditsInternalMutation = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    userId: v.optional(v.id("users")),
    amount: v.number(),
    action: v.string(),
    relatedEntityType: v.optional(v.string()),
    relatedEntityId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await deductCreditsInternal(ctx, args);
  },
});

/**
 * INTERNAL: Check credit balance (for pre-flight checks in actions)
 */
export const checkCreditsInternalQuery = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    requiredAmount: v.number(),
  },
  handler: async (ctx, args) => {
    const balance = await getCreditBalanceInternal(ctx, args.organizationId);

    // Check for unlimited (enterprise)
    if (balance.monthlyCreditsTotal === -1) {
      return { hasCredits: true, isUnlimited: true, totalCredits: -1 };
    }

    // Child org has enough credits on its own
    if (balance.totalCredits >= args.requiredAmount) {
      return {
        hasCredits: true,
        isUnlimited: false,
        totalCredits: balance.totalCredits,
        shortfall: 0,
      };
    }

    // Check parent org's pool as fallback (sub-org credit sharing)
    const org = await ctx.db.get(args.organizationId);
    if (org?.parentOrganizationId) {
      const parentBalance = await getCreditBalanceInternal(ctx, org.parentOrganizationId);

      // Parent has unlimited credits
      if (parentBalance.monthlyCreditsTotal === -1) {
        return { hasCredits: true, isUnlimited: true, totalCredits: -1, fromParent: true };
      }

      // Parent has enough credits
      if (parentBalance.totalCredits >= args.requiredAmount) {
        return {
          hasCredits: true,
          isUnlimited: false,
          totalCredits: parentBalance.totalCredits,
          shortfall: 0,
          fromParent: true,
        };
      }
    }

    return {
      hasCredits: false,
      isUnlimited: false,
      totalCredits: balance.totalCredits,
      shortfall: Math.max(0, args.requiredAmount - balance.totalCredits),
    };
  },
});

export const addPurchasedCredits = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    userId: v.optional(v.id("users")),
    credits: v.number(),
    packId: v.string(),
    stripePaymentIntentId: v.string(),
  },
  handler: async (ctx, args) => {
    const { organizationId, credits, packId, stripePaymentIntentId } = args;

    let balance = await ctx.db
      .query("creditBalances")
      .withIndex("by_organization", (q) => q.eq("organizationId", organizationId))
      .first();

    const now = Date.now();
    const newPurchased = (balance?.purchasedCredits || 0) + credits;

    if (!balance) {
      await ctx.db.insert("creditBalances", {
        organizationId,
        dailyCredits: 0,
        dailyCreditsLastReset: 0,
        monthlyCredits: 0,
        monthlyCreditsTotal: 0,
        monthlyPeriodStart: 0,
        monthlyPeriodEnd: 0,
        purchasedCredits: newPurchased,
        lastUpdated: now,
      });
    } else {
      await ctx.db.patch(balance._id, {
        purchasedCredits: newPurchased,
        lastUpdated: now,
      });
    }

    // Record transaction
    balance = await ctx.db
      .query("creditBalances")
      .withIndex("by_organization", (q) => q.eq("organizationId", organizationId))
      .first();

    await ctx.db.insert("creditTransactions", {
      organizationId,
      userId: args.userId,
      type: "purchase",
      amount: credits,
      creditSource: "purchased",
      balanceAfter: {
        daily: balance?.dailyCredits || 0,
        monthly: balance?.monthlyCredits || 0,
        purchased: newPurchased,
        total: (balance?.dailyCredits || 0) + (balance?.monthlyCredits || 0) + newPurchased,
      },
      packId,
      stripePaymentIntentId,
      createdAt: now,
    });

    return { success: true, newBalance: newPurchased };
  },
});
