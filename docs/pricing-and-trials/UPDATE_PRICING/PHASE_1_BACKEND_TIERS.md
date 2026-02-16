# Phase 1: Backend Tier System Update

> **Priority:** CRITICAL — Foundation for all other phases
> **Dependencies:** None
> **Files touched:** 5

## Goal

Update all backend tier types, configurations, and Convex schema to recognize the 4-tier model: **Free, Pro, Agency, Enterprise**.

---

## 1A. Schema — `convex/schemas/coreSchemas.ts`

**Action:** MODIFY (line ~78-84)

Add `v.literal("pro")` to the `plan` union. Keep `starter` and `professional` temporarily for backward compatibility with any existing data in the database.

**Before:**
```typescript
plan: v.optional(v.union(
  v.literal("free"),
  v.literal("starter"),
  v.literal("professional"),
  v.literal("agency"),
  v.literal("enterprise")
))
```

**After:**
```typescript
plan: v.optional(v.union(
  v.literal("free"),
  v.literal("pro"),         // NEW — primary tier
  v.literal("starter"),     // LEGACY — keep for existing data
  v.literal("professional"),// LEGACY — keep for existing data
  v.literal("agency"),
  v.literal("enterprise")
))
```

---

## 1B. Tier Configs — `convex/licensing/tierConfigs.ts`

**Action:** MODIFY (major — add PRO_TIER, update AGENCY pricing)

### Add PRO_TIER

New tier config based on `NEW_PRICING_PLAN.md`:

| Limit | Value |
|-------|-------|
| Price | €29/mo, €290/yr |
| Monthly Credits | 200 + 5/day |
| Users | 3 |
| Contacts | 2,000 |
| Projects | 20 |
| Checkout Instances | 5 |
| Builder Apps | 10 |
| Forms | 20 |
| Storage | 5 GB |
| Emails/mo | 500 |
| Sequences | 10 |
| Workflows | 10 |
| API Keys | 1 |
| Webhooks | 5 |
| Support | email_48h |

### Update AGENCY_TIER

Change pricing from €599/mo to **€299/mo** (€2,990/yr). Limits stay per `NEW_PRICING_PLAN.md`:

| Limit | Value |
|-------|-------|
| Monthly Credits | 2,000 + 5/day |
| Users | 15 |
| Contacts | 10,000 |
| Sub-orgs | 2 included, +€79/each, max 20 |
| Storage | 50 GB |
| Emails/mo | 10,000 |
| Custom Domains | 5 |

### Update exports

```typescript
export type TierName = "free" | "pro" | "agency" | "enterprise";

export const TIER_ORDER: TierName[] = ["free", "pro", "agency", "enterprise"];

export const TIER_CONFIGS: Record<TierName, TierConfig> = {
  free: FREE_TIER,
  pro: PRO_TIER,
  agency: AGENCY_TIER,
  enterprise: ENTERPRISE_TIER,
};

// LEGACY — keep temporarily, map to new tiers
/** @deprecated Use PRO_TIER */
export const STARTER_TIER = PRO_TIER;
/** @deprecated Use PRO_TIER */
export const PROFESSIONAL_TIER = PRO_TIER;
```

---

## 1C. Platform Checkout — `convex/stripe/platformCheckout.ts`

**Action:** MODIFY (~100 lines changed)

### Update TIER_PRICE_IDS

**Before:**
```typescript
const TIER_PRICE_IDS = {
  monthly: {
    community: process.env.STRIPE_COMMUNITY_MO_PRICE_ID,
    starter: process.env.STRIPE_STARTER_MO_PRICE_ID,
    professional: process.env.STRIPE_PROFESSIONAL_MO_PRICE_ID,
    agency: process.env.STRIPE_AGENCY_MO_PRICE_ID,
    enterprise: process.env.STRIPE_ENTERPRISE_MO_PRICE_ID,
  },
  annual: { ... }
};
```

**After:**
```typescript
const TIER_PRICE_IDS = {
  monthly: {
    pro: process.env.STRIPE_PRO_MO_PRICE_ID,
    agency: process.env.STRIPE_AGENCY_MO_PRICE_ID,
  },
  annual: {
    pro: process.env.STRIPE_PRO_YR_PRICE_ID,
    agency: process.env.STRIPE_AGENCY_YR_PRICE_ID,
  },
};
```

### Update tier unions

- `createPlatformCheckoutSession` tier arg: `"pro" | "agency"` (enterprise = contact sales, free = no checkout)
- `managePlatformSubscription` newTier arg: `"free" | "pro" | "agency" | "enterprise"`

### Update TIER_ORDER

```typescript
const TIER_ORDER: Record<string, number> = {
  free: 0,
  pro: 1,
  agency: 2,
  enterprise: 3,
};
```

### Remove token pack checkout

Delete `createTokenPackCheckoutSession` function entirely — replaced by dynamic credit checkout in Phase 2.

---

## 1D. Webhooks — `convex/stripe/platformWebhooks.ts`

**Action:** MODIFY (~50 lines)

### Update TIER_MAP

```typescript
const TIER_MAP: Record<string, string> = {
  pro: "pro",
  agency: "agency",
  enterprise: "enterprise",
  // LEGACY mappings for existing Stripe metadata
  starter: "pro",
  professional: "pro",
  community: "free",
};
```

### Update mutations

- `updateOrganizationPlan` union: add `v.literal("pro")`
- `upsertOrganizationLicense` union: add `v.literal("pro")`

### Remove Zapier community logic

Delete the Zapier community subscription trigger (~lines 299-333):
```typescript
// DELETE THIS BLOCK
if (tier === "community") {
  await ctx.runAction(internal.zapier.triggers.triggerCommunitySubscriptionCreated, ...)
}
```

---

## 1E. Strip Prices — `convex/stripe/stripePrices.ts`

**Action:** MODIFY (~150 lines changed)

Simplify to only platform tier prices:

```typescript
const PRICE_IDS = {
  platform: {
    pro: {
      monthly: process.env.STRIPE_PRO_MO_PRICE_ID,
      annual: process.env.STRIPE_PRO_YR_PRICE_ID,
    },
    agency: {
      monthly: process.env.STRIPE_AGENCY_MO_PRICE_ID,
      annual: process.env.STRIPE_AGENCY_YR_PRICE_ID,
    },
  },
  addons: {
    subOrg: {
      monthly: process.env.STRIPE_SUB_ORG_MO_PRICE_ID,
      annual: process.env.STRIPE_SUB_ORG_YR_PRICE_ID,
    },
  },
};
```

Remove sections: AI prices, token pack prices, Private LLM prices, `getAIAndAddonPrices` action.

---

## Verification

```bash
npx tsc --noEmit --pretty -- \
  convex/schemas/coreSchemas.ts \
  convex/licensing/tierConfigs.ts \
  convex/stripe/platformCheckout.ts \
  convex/stripe/platformWebhooks.ts \
  convex/stripe/stripePrices.ts
```

Check for any remaining old tier references:
```bash
grep -rn '"community"\|"starter"\|"professional"' convex/stripe/ convex/licensing/
```
