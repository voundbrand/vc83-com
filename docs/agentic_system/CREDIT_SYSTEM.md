# Credit System

> Credit tiers, consumption order, sub-org sharing with caps, safe defaults, and monitoring.

---

## Current State

### What Works

- Three credit tiers: daily, monthly, purchased
- Consumption order: daily → monthly → purchased
- Sub-org fallback to parent credit pool
- Enterprise tier with unlimited credits (`monthlyCreditsTotal === -1`)
- Per-message cost model (1-3 credits based on complexity)
- Read-only tools are free (0 credits)

### What's Missing

- **No cap on sub-org credit sharing** — child org can drain parent's entire purchased balance
- **No per-child tracking** — no visibility into how much each child has consumed from parent
- **No notification threshold** — owner isn't warned before credits run out
- **No per-session budget** — a single chatty session can consume the full daily allowance
- **Credit deduction failures are swallowed** — revenue leak

---

## Credit Sharing Architecture

### Organization Hierarchy

```
Parent Org (Agency)
  ├── creditBalances: { daily: 100, monthly: 5000, purchased: 10000 }
  ├── creditSharing: {
  │     enabled: true,
  │     maxPerChild: 100,           // max 100 credits/day per child
  │     maxTotalShared: 500,        // max 500 credits/day across ALL children
  │     notifyAt: 0.8,             // alert at 80% of cap
  │     blockAt: 1.0,             // hard stop at 100% of cap
  │   }
  │
  ├── Child Org A
  │   ├── creditBalances: { daily: 10, monthly: 50, purchased: 0 }
  │   └── Daily parent consumption: tracked in creditSharingLedger
  │
  └── Child Org B
      ├── creditBalances: { daily: 10, monthly: 50, purchased: 0 }
      └── Daily parent consumption: tracked in creditSharingLedger
```

### Credit Sharing Ledger

New tracking table for sub-org credit consumption from parent pools.

```typescript
// objects table, type="credit_sharing_ledger"
{
  type: "credit_sharing_ledger",
  organizationId: parentOrgId,
  customProperties: {
    childOrganizationId: Id<"organizations">,
    date: string,                    // "2026-02-15" — daily partition
    creditsConsumed: number,         // total consumed from parent today
    transactions: [{
      amount: number,
      action: string,                // "agent_message", "tool_execution", etc.
      timestamp: number,
      sessionId?: string,
    }],
  }
}
```

### Deduction Flow (Enhanced)

```typescript
async function deductCreditsInternal(ctx, args) {
  const { organizationId, amount, action, childOrganizationId } = args;

  // 1. Try own credits first (daily → monthly → purchased)
  const balance = await getCreditBalance(ctx, organizationId);
  const totalAvailable = balance.daily + balance.monthly + balance.purchased;

  if (totalAvailable >= amount) {
    // Deduct in order: daily → monthly → purchased
    return await deductFromOwnCredits(ctx, organizationId, amount, action);
  }

  // 2. Try parent fallback
  const org = await ctx.db.get(organizationId);
  const parentId = org?.parentOrganizationId;

  if (!parentId) {
    throw new ConvexError({ code: "CREDITS_EXHAUSTED" });
  }

  // 3. Check parent's sharing config
  const parentOrg = await ctx.db.get(parentId);
  const sharingConfig = parentOrg?.creditSharing ?? DEFAULT_CREDIT_SHARING;

  if (!sharingConfig.enabled) {
    throw new ConvexError({ code: "CREDIT_SHARING_DISABLED" });
  }

  // 4. Check per-child daily cap
  const childUsageToday = await getChildCreditUsageToday(ctx, parentId, organizationId);

  if (childUsageToday + amount > sharingConfig.maxPerChild) {
    // Notify if at threshold
    if (childUsageToday / sharingConfig.maxPerChild >= sharingConfig.notifyAt) {
      await notifyOwner(parentId, "child_credit_cap_approaching", {
        childOrgId: organizationId,
        usage: childUsageToday,
        cap: sharingConfig.maxPerChild,
      });
    }
    throw new ConvexError({
      code: "CHILD_CREDIT_CAP_REACHED",
      message: `Child org has reached daily credit sharing limit (${sharingConfig.maxPerChild})`,
    });
  }

  // 5. Check total shared daily cap
  const totalSharedToday = await getTotalSharedUsageToday(ctx, parentId);

  if (totalSharedToday + amount > sharingConfig.maxTotalShared) {
    throw new ConvexError({
      code: "SHARED_POOL_EXHAUSTED",
      message: `Total shared credit pool exhausted for today`,
    });
  }

  // 6. Deduct from parent
  const result = await deductFromOwnCredits(ctx, parentId, amount, action);

  // 7. Record in sharing ledger
  await recordCreditSharingTransaction(ctx, parentId, organizationId, amount, action);

  return { ...result, deductedFromParent: true, parentOrganizationId: parentId };
}
```

---

## Safe Defaults

```typescript
const DEFAULT_CREDIT_SHARING = {
  enabled: true,                   // sharing on by default for sub-orgs
  maxPerChild: 100,                // 100 credits/day per child
  maxTotalShared: 500,             // 500 credits/day total across children
  notifyAt: 0.8,                   // alert at 80%
  blockAt: 1.0,                    // hard stop at 100%
};

const DEFAULT_CREDIT_COSTS = {
  agent_message_simple: 1,         // short response, no tools
  agent_message_complex: 3,        // long response or multiple tool calls
  tool_read_only: 0,               // query_org_data, list_*, search_*
  tool_standard: 1,                // most create/update tools
  tool_premium: 2,                 // AI generation (email, certificate)
  tool_external: 3,                // tools that hit external APIs (send_email, etc.)
};

const DEFAULT_SESSION_BUDGET = {
  maxCreditsPerSession: 50,        // hard cap per session (prevents runaway)
  warnAt: 40,                      // warn user at 80%
};
```

---

## Per-Session Budget

New concept: each session has a credit budget that limits spending within a single conversation.

```typescript
// On session creation
const sessionBudget = agentConfig.sessionPolicy?.maxCreditsPerSession
  ?? DEFAULT_SESSION_BUDGET.maxCreditsPerSession;

// Before each LLM call
if (session.costUsd >= sessionBudgetToUsd(sessionBudget)) {
  // Option A: Close session, user starts fresh
  // Option B: Notify user, continue with read-only tools only
  await sendToUser("I'm approaching my thinking limit for this conversation. "
    + "I can still answer questions but won't be able to take actions. "
    + "Start a new conversation for full capabilities.");
  session.isDegradedMode = true;
}
```

---

## Credit Monitoring & Alerts

### Owner Dashboard Metrics

```
Credit Overview:
  Daily:     ████████░░ 80/100 (resets in 4h)
  Monthly:   ████░░░░░░ 2,100/5,000
  Purchased: ██████████ 8,500/10,000

Sub-Org Usage (today):
  ├── Acme Corp:    45/100 credits   ███░░
  ├── Beta Inc:     12/100 credits   █░░░░
  └── Total shared: 57/500           █░░░░

Top Consumers (this month):
  1. Agent "Maya" — 1,200 credits (340 sessions)
  2. Agent "Atlas" — 890 credits (210 sessions)
```

### Alert Thresholds

```typescript
const CREDIT_ALERT_THRESHOLDS = {
  // Org-level alerts
  daily_80_percent: {
    condition: (balance) => balance.daily / balance.dailyTotal <= 0.2,
    message: "Your agent's daily credits are running low ({remaining} remaining)",
    channel: "telegram",
  },
  monthly_50_percent: {
    condition: (balance) => balance.monthly / balance.monthlyTotal <= 0.5,
    message: "You've used 50% of your monthly credits",
    channel: "email",
  },
  purchased_low: {
    condition: (balance) => balance.purchased < 100,
    message: "Low purchased credit balance ({remaining} remaining)",
    channel: "telegram+email",
  },

  // Sub-org alerts
  child_cap_approaching: {
    condition: (childUsage, cap) => childUsage / cap >= 0.8,
    message: "{childOrg} is approaching their daily credit limit",
    channel: "telegram",
  },
  shared_pool_approaching: {
    condition: (totalShared, cap) => totalShared / cap >= 0.8,
    message: "Shared credit pool is running low across sub-orgs",
    channel: "telegram",
  },
};
```

---

## Credit Sharing Configuration UI

Parent org owners configure sharing via the dashboard:

```
Credit Sharing Settings
  ┌──────────────────────────────────────┐
  │ ☑ Enable credit sharing for sub-orgs │
  │                                      │
  │ Per-child daily limit:  [100]        │
  │ Total shared daily:     [500]        │
  │ Alert threshold:        [80%]        │
  │                                      │
  │ Per-child overrides:                 │
  │ ┌──────────────────────────────────┐ │
  │ │ Acme Corp    [200] credits/day  │ │
  │ │ Beta Inc     [50]  credits/day  │ │
  │ │ + Add override                  │ │
  │ └──────────────────────────────────┘ │
  └──────────────────────────────────────┘
```

### Per-Child Overrides

```typescript
creditSharing: {
  enabled: true,
  maxPerChild: 100,              // default
  maxTotalShared: 500,
  perChildOverrides: {
    [childOrgId]: {
      maxPerChild: 200,          // Acme gets more
    },
    [childOrgId2]: {
      maxPerChild: 50,           // Beta gets less
    },
  },
}
```

---

## Migration Plan

### Phase 1: Add creditSharing config to organizations

```typescript
// Default for existing parent orgs
creditSharing: {
  enabled: true,
  maxPerChild: 100,
  maxTotalShared: 500,
  notifyAt: 0.8,
  blockAt: 1.0,
}
```

### Phase 2: Add cap checks to deductCreditsInternal

Insert cap validation before parent fallback (see deduction flow above).

### Phase 3: Add creditSharingLedger tracking

Record every parent-pool deduction with child org ID and daily partition.

### Phase 4: Add scheduled cleanup

Daily cron to reset ledger entries older than 90 days.
