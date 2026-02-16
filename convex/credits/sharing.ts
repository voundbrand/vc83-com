/**
 * CREDIT SHARING
 *
 * Manages sub-org credit sharing with caps and per-child tracking.
 *
 * Features:
 * - Per-child daily cap (prevents a single child from draining parent)
 * - Total shared pool cap (limits aggregate sharing across all children)
 * - Credit sharing ledger (tracks per-child daily consumption from parent)
 * - Notification thresholds (alert owner before caps are hit)
 * - Per-child overrides (agencies can allocate differently)
 * - Daily ledger cleanup cron (90-day retention)
 *
 * Uses the `objects` table with type="credit_sharing_ledger" for tracking.
 */

import { internalMutation, internalQuery } from "../_generated/server";
import { v } from "convex/values";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

// ============================================================================
// TYPES & DEFAULTS
// ============================================================================

export interface CreditSharingConfig {
  enabled: boolean;
  /** Max credits per child org per day */
  maxPerChild: number;
  /** Max credits across ALL children per day */
  maxTotalShared: number;
  /** Fraction (0.0-1.0) at which to alert owner */
  notifyAt: number;
  /** Fraction (0.0-1.0) at which to hard stop */
  blockAt: number;
  /** Per-child overrides for maxPerChild */
  perChildOverrides?: Record<string, { maxPerChild: number }>;
}

export const DEFAULT_CREDIT_SHARING: CreditSharingConfig = {
  enabled: true,
  maxPerChild: 100,
  maxTotalShared: 500,
  notifyAt: 0.8,
  blockAt: 1.0,
  perChildOverrides: {},
};

// ============================================================================
// LEDGER QUERIES
// ============================================================================

/**
 * Get today's date string in ISO format (YYYY-MM-DD) for ledger partitioning.
 */
function getTodayDateString(): string {
  return new Date().toISOString().split("T")[0];
}

/**
 * Get a child org's credit usage from the parent pool for today.
 */
export async function getChildCreditUsageToday(
  ctx: QueryCtx,
  parentOrgId: Id<"organizations">,
  childOrgId: Id<"organizations">
): Promise<number> {
  const today = getTodayDateString();

  const entries = await ctx.db
    .query("objects")
    .withIndex("by_org_type", (q) =>
      q.eq("organizationId", parentOrgId).eq("type", "credit_sharing_ledger")
    )
    .collect();

  const todayEntry = entries.find((e) => {
    const props = e.customProperties as Record<string, unknown>;
    return (
      props?.childOrganizationId === childOrgId &&
      props?.date === today
    );
  });

  if (!todayEntry) return 0;
  return ((todayEntry.customProperties as Record<string, unknown>)?.creditsConsumed as number) || 0;
}

/**
 * Get total shared credit usage across all children for today.
 */
export async function getTotalSharedUsageToday(
  ctx: QueryCtx,
  parentOrgId: Id<"organizations">
): Promise<number> {
  const today = getTodayDateString();

  const entries = await ctx.db
    .query("objects")
    .withIndex("by_org_type", (q) =>
      q.eq("organizationId", parentOrgId).eq("type", "credit_sharing_ledger")
    )
    .collect();

  let total = 0;
  for (const entry of entries) {
    const props = entry.customProperties as Record<string, unknown>;
    if (props?.date === today) {
      total += (props?.creditsConsumed as number) || 0;
    }
  }

  return total;
}

// ============================================================================
// LEDGER MUTATIONS
// ============================================================================

/**
 * Record a credit sharing transaction in the daily ledger.
 * Creates or updates the ledger entry for (parentOrg, childOrg, today).
 */
export async function recordCreditSharingTransaction(
  ctx: MutationCtx,
  parentOrgId: Id<"organizations">,
  childOrgId: Id<"organizations">,
  amount: number,
  action: string
): Promise<void> {
  const today = getTodayDateString();

  // Find existing entry for this child + today
  const entries = await ctx.db
    .query("objects")
    .withIndex("by_org_type", (q) =>
      q.eq("organizationId", parentOrgId).eq("type", "credit_sharing_ledger")
    )
    .collect();

  const existingEntry = entries.find((e) => {
    const props = e.customProperties as Record<string, unknown>;
    return (
      props?.childOrganizationId === childOrgId &&
      props?.date === today
    );
  });

  if (existingEntry) {
    // Update existing entry
    const props = existingEntry.customProperties as Record<string, unknown>;
    const currentConsumed = (props?.creditsConsumed as number) || 0;
    const transactions = (props?.transactions as Array<Record<string, unknown>>) || [];

    await ctx.db.patch(existingEntry._id, {
      customProperties: {
        ...props,
        creditsConsumed: currentConsumed + amount,
        lastTransactionAt: Date.now(),
        transactions: [
          ...transactions.slice(-49), // Keep last 50 transactions
          { amount, action, timestamp: Date.now() },
        ],
      },
      updatedAt: Date.now(),
    });
  } else {
    // Create new entry
    await ctx.db.insert("objects", {
      type: "credit_sharing_ledger",
      name: `Credit Sharing Ledger — ${today}`,
      organizationId: parentOrgId,
      status: "active",
      customProperties: {
        childOrganizationId: childOrgId,
        date: today,
        creditsConsumed: amount,
        lastTransactionAt: Date.now(),
        transactions: [{ amount, action, timestamp: Date.now() }],
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  }
}

// ============================================================================
// CAP CHECKING
// ============================================================================

/**
 * Resolve the effective per-child cap, accounting for per-child overrides.
 */
export function resolveChildCap(
  config: CreditSharingConfig,
  childOrgId: string
): number {
  return config.perChildOverrides?.[childOrgId]?.maxPerChild ?? config.maxPerChild;
}

/**
 * Extract credit sharing config from an organization record.
 * Falls back to DEFAULT_CREDIT_SHARING if not configured.
 */
export function getCreditSharingConfig(
  org: { customProperties?: Record<string, unknown> } | null
): CreditSharingConfig {
  if (!org) return DEFAULT_CREDIT_SHARING;
  const configured = org.customProperties?.creditSharing as Partial<CreditSharingConfig> | undefined;
  if (!configured) return DEFAULT_CREDIT_SHARING;

  return {
    enabled: configured.enabled ?? DEFAULT_CREDIT_SHARING.enabled,
    maxPerChild: configured.maxPerChild ?? DEFAULT_CREDIT_SHARING.maxPerChild,
    maxTotalShared: configured.maxTotalShared ?? DEFAULT_CREDIT_SHARING.maxTotalShared,
    notifyAt: configured.notifyAt ?? DEFAULT_CREDIT_SHARING.notifyAt,
    blockAt: configured.blockAt ?? DEFAULT_CREDIT_SHARING.blockAt,
    perChildOverrides: configured.perChildOverrides ?? DEFAULT_CREDIT_SHARING.perChildOverrides,
  };
}

// ============================================================================
// EXPOSED QUERIES / MUTATIONS (for Convex scheduler + crons)
// ============================================================================

/**
 * Internal query: get child credit usage today (for use in actions).
 */
export const getChildUsageTodayQuery = internalQuery({
  args: {
    parentOrgId: v.id("organizations"),
    childOrgId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    return await getChildCreditUsageToday(ctx, args.parentOrgId, args.childOrgId);
  },
});

/**
 * Internal query: get total shared usage today (for use in actions).
 */
export const getTotalSharedUsageTodayQuery = internalQuery({
  args: {
    parentOrgId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    return await getTotalSharedUsageToday(ctx, args.parentOrgId);
  },
});

/**
 * Cleanup old ledger entries (>90 days).
 * Called daily by cron.
 */
export const cleanupOldLedgerEntries = internalMutation({
  handler: async (ctx) => {
    const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;

    const oldEntries = await ctx.db
      .query("objects")
      .withIndex("by_type", (q) => q.eq("type", "credit_sharing_ledger"))
      .filter((q) => q.lt(q.field("updatedAt"), ninetyDaysAgo))
      .take(500);

    for (const entry of oldEntries) {
      await ctx.db.delete(entry._id);
    }

    if (oldEntries.length > 0) {
      console.log(`[CreditCleanup] Removed ${oldEntries.length} old ledger entries`);
    }
  },
});
