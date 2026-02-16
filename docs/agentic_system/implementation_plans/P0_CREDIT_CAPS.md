# P0: Credit Caps Implementation Plan

> Priority: CRITICAL | Estimated complexity: Low-Medium | Files touched: 2-3

---

## Problem Statement

Sub-org credit fallback to parent pool has no cap. A rogue or chatty sub-org agent can drain the parent org's entire purchased credit balance. No per-child tracking, no notification threshold, no hard stop.

---

## Deliverables

1. **`creditSharing` config** on parent organizations with safe defaults
2. **Per-child daily cap** enforced in `deductCreditsInternal`
3. **Total shared pool cap** across all children
4. **Credit sharing ledger** for per-child daily tracking
5. **Notification alerts** at configurable thresholds
6. **Per-child overrides** for agencies with unequal child needs
7. **Daily ledger reset** via scheduled job

---

## Files to Modify

| File | Changes |
|------|---------|
| `convex/credits/index.ts` | Add cap checks to `deductCreditsInternal`, add ledger recording |
| `convex/ai/platformAlerts.ts` | Add `child_credit_cap_approaching` and `shared_pool_approaching` alerts |
| `convex/crons.ts` | Add daily ledger cleanup cron |

## New Files

| File | Purpose |
|------|---------|
| `convex/credits/sharing.ts` | Credit sharing config types, defaults, ledger CRUD, cap checking |

---

## Implementation Steps

### Step 1: Define credit sharing types (`convex/credits/sharing.ts`)

```typescript
export interface CreditSharingConfig {
  enabled: boolean;
  maxPerChild: number;           // max credits per child org per day
  maxTotalShared: number;        // max credits across ALL children per day
  notifyAt: number;              // fraction (0.8 = 80%) at which to alert
  blockAt: number;               // fraction (1.0 = 100%) at which to hard stop
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
```

### Step 2: Add ledger tracking functions

```typescript
// Get today's date key
function todayKey(): string {
  return new Date().toISOString().split("T")[0]; // "2026-02-15"
}

// Get child org's credit usage from parent today
export async function getChildCreditUsageToday(
  ctx: MutationCtx, parentOrgId: Id<"organizations">, childOrgId: Id<"organizations">
): Promise<number> {
  const ledgerEntry = await ctx.db.query("objects")
    .withIndex("by_org_type", q =>
      q.eq("organizationId", parentOrgId).eq("type", "credit_sharing_ledger")
    )
    .filter(q => q.and(
      q.eq(q.field("customProperties.childOrganizationId"), childOrgId),
      q.eq(q.field("customProperties.date"), todayKey()),
    ))
    .first();

  return ledgerEntry?.customProperties?.creditsConsumed ?? 0;
}

// Get total shared usage across all children today
export async function getTotalSharedUsageToday(
  ctx: MutationCtx, parentOrgId: Id<"organizations">
): Promise<number> {
  const ledgerEntries = await ctx.db.query("objects")
    .withIndex("by_org_type", q =>
      q.eq("organizationId", parentOrgId).eq("type", "credit_sharing_ledger")
    )
    .filter(q => q.eq(q.field("customProperties.date"), todayKey()))
    .collect();

  return ledgerEntries.reduce((sum, e) => sum + (e.customProperties?.creditsConsumed ?? 0), 0);
}

// Record a credit sharing transaction
export async function recordCreditSharingTransaction(
  ctx: MutationCtx, parentOrgId: Id<"organizations">, childOrgId: Id<"organizations">,
  amount: number, action: string
) {
  const existing = await ctx.db.query("objects")
    .withIndex("by_org_type", q =>
      q.eq("organizationId", parentOrgId).eq("type", "credit_sharing_ledger")
    )
    .filter(q => q.and(
      q.eq(q.field("customProperties.childOrganizationId"), childOrgId),
      q.eq(q.field("customProperties.date"), todayKey()),
    ))
    .first();

  if (existing) {
    await ctx.db.patch(existing._id, {
      customProperties: {
        ...existing.customProperties,
        creditsConsumed: (existing.customProperties.creditsConsumed ?? 0) + amount,
        lastTransactionAt: Date.now(),
      },
    });
  } else {
    await ctx.db.insert("objects", {
      organizationId: parentOrgId,
      type: "credit_sharing_ledger",
      customProperties: {
        childOrganizationId: childOrgId,
        date: todayKey(),
        creditsConsumed: amount,
        lastTransactionAt: Date.now(),
      },
    });
  }
}
```

### Step 3: Modify `deductCreditsInternal` (`convex/credits/index.ts`)

Insert cap validation before the existing parent fallback:

```typescript
// EXISTING: parent fallback code
if (totalAvailable < amount) {
  const org = await ctx.db.get(organizationId);
  const parentId = org?.parentOrganizationId;

  if (parentId) {
    // === NEW CODE START ===
    const parentOrg = await ctx.db.get(parentId);
    const sharingConfig = parentOrg?.creditSharing ?? DEFAULT_CREDIT_SHARING;

    if (!sharingConfig.enabled) {
      throw new ConvexError({ code: "CREDIT_SHARING_DISABLED" });
    }

    // Resolve per-child cap (check overrides)
    const childCap = sharingConfig.perChildOverrides?.[organizationId]?.maxPerChild
      ?? sharingConfig.maxPerChild;

    // Check per-child daily cap
    const childUsageToday = await getChildCreditUsageToday(ctx, parentId, organizationId);
    const effectiveBlockAt = childCap * sharingConfig.blockAt;

    if (childUsageToday + amount > effectiveBlockAt) {
      throw new ConvexError({
        code: "CHILD_CREDIT_CAP_REACHED",
        childOrgId: organizationId,
        usage: childUsageToday,
        cap: childCap,
      });
    }

    // Notify if approaching cap
    const effectiveNotifyAt = childCap * sharingConfig.notifyAt;
    if (childUsageToday + amount > effectiveNotifyAt) {
      await notifyOwnerIfNotRecent(parentId, "child_credit_cap_approaching", {
        childOrgId: organizationId,
        usage: childUsageToday + amount,
        cap: childCap,
      });
    }

    // Check total shared pool cap
    const totalSharedToday = await getTotalSharedUsageToday(ctx, parentId);
    const totalEffectiveBlock = sharingConfig.maxTotalShared * sharingConfig.blockAt;

    if (totalSharedToday + amount > totalEffectiveBlock) {
      throw new ConvexError({
        code: "SHARED_POOL_EXHAUSTED",
        totalShared: totalSharedToday,
        cap: sharingConfig.maxTotalShared,
      });
    }

    if (totalSharedToday + amount > sharingConfig.maxTotalShared * sharingConfig.notifyAt) {
      await notifyOwnerIfNotRecent(parentId, "shared_pool_approaching", {
        totalShared: totalSharedToday + amount,
        cap: sharingConfig.maxTotalShared,
      });
    }
    // === NEW CODE END ===

    // Existing parent deduction logic
    const parentResult = await deductCreditsInternal(ctx, {
      organizationId: parentId,
      amount,
      action: args.action,
      childOrganizationId: organizationId,
    });

    // Record in sharing ledger
    await recordCreditSharingTransaction(ctx, parentId, organizationId, amount, args.action);

    return { ...parentResult, deductedFromParent: true, parentOrganizationId: parentId };
  }

  throw new ConvexError({ code: "CREDITS_EXHAUSTED" });
}
```

### Step 4: Add ledger cleanup cron

```typescript
// convex/crons.ts
crons.daily("cleanup-credit-ledger", { hourUTC: 3, minuteUTC: 0 },
  internal.credits.sharing.cleanupOldLedgerEntries
);

// convex/credits/sharing.ts
export const cleanupOldLedgerEntries = internalMutation({
  handler: async (ctx) => {
    const ninetyDaysAgo = Date.now() - (90 * 24 * 60 * 60 * 1000);

    const oldEntries = await ctx.db.query("objects")
      .filter(q => q.and(
        q.eq(q.field("type"), "credit_sharing_ledger"),
        q.lt(q.field("customProperties.lastTransactionAt"), ninetyDaysAgo),
      ))
      .take(500);

    for (const entry of oldEntries) {
      await ctx.db.delete(entry._id);
    }

    if (oldEntries.length > 0) {
      console.log(`[CreditCleanup] Removed ${oldEntries.length} old ledger entries`);
    }
  },
});
```

### Step 5: Add credit sharing to org settings schema

For the parent org's configuration, add `creditSharing` to the organization's settings:

```typescript
// When parent org is created or updated, ensure creditSharing exists
if (org.parentOrganizationId === undefined) {
  // This is a potential parent org — ensure sharing config exists
  org.creditSharing = org.creditSharing ?? DEFAULT_CREDIT_SHARING;
}
```

---

## Migration

### Existing Parent Orgs

Run a one-time migration to add `DEFAULT_CREDIT_SHARING` to all organizations that have child orgs:

```typescript
const orgs = await ctx.db.query("organizations").collect();
const parentOrgIds = new Set(orgs.filter(o => o.parentOrganizationId).map(o => o.parentOrganizationId));

for (const parentId of parentOrgIds) {
  const parent = await ctx.db.get(parentId);
  if (parent && !parent.creditSharing) {
    await ctx.db.patch(parentId, { creditSharing: DEFAULT_CREDIT_SHARING });
  }
}
```

### No Breaking Changes

The defaults are generous (100 credits/child/day, 500 total). Existing sub-orgs that consume less than this will see no behavior change.

---

## Testing Strategy

1. **Unit test**: cap enforcement blocks deduction when limit reached
2. **Unit test**: per-child overrides take precedence over default
3. **Unit test**: notification fires at 80% threshold
4. **Unit test**: total shared pool cap enforced correctly
5. **Integration test**: child org deduction falls back to parent, recorded in ledger
6. **Integration test**: second child's deduction blocked when total pool exhausted
7. **Edge case**: concurrent deductions don't exceed cap (Convex handles this via mutations)

---

## Success Criteria

- [ ] Parent orgs have `creditSharing` config with safe defaults
- [ ] Per-child daily cap enforced — child gets error when cap reached
- [ ] Total shared pool cap enforced — all children blocked when pool exhausted
- [ ] Owner notified at configurable threshold (default 80%)
- [ ] Per-child overrides allow agencies to give specific children more/less
- [ ] Credit sharing ledger tracks per-child daily consumption
- [ ] Ledger entries cleaned up after 90 days
