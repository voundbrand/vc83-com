# Store Window Update - Community Tier Integration

**File:** `src/components/window-content/store-window.tsx`
**Priority:** HIGH
**Related:** Phase 5 of IMPLEMENTATION-PLAN.md

---

## Overview

The Store Window displays platform plans and AI add-ons. Currently shows:
- **Platform Plans Tab:** Free, Starter, Professional, Agency, Enterprise
- **AI & Add-ons Tab:** AI subscriptions, Token Packs, Private LLM, Custom Frontend

**What needs updating:** Add Community tier (€9/mo) to Platform Plans tab with 14-day trial badge.

---

## Current State

### TIER_ORDER Hierarchy
```typescript
const TIER_ORDER: Record<string, number> = {
  free: 0,
  starter: 1,      // ❌ Community should be between free and starter
  professional: 2,
  agency: 3,
  enterprise: 4,
};
```

### Current Plans Array (lines 414-511)
```typescript
const plans = [
  { id: "free", ... },
  { id: "starter", monthlyPrice: 19900, annualPrice: 199000, ... },
  { id: "professional", ... },
  { id: "agency", ... },
  { id: "enterprise", ... },
];
```

**Missing:** Community tier (€9/mo with trial)

---

## Required Changes

### 1. Update TIER_ORDER ✅ CRITICAL

**Location:** Line 37-44

**Change from:**
```typescript
const TIER_ORDER: Record<string, number> = {
  free: 0,
  starter: 1,
  professional: 2,
  agency: 3,
  enterprise: 4,
};
```

**Change to:**
```typescript
const TIER_ORDER: Record<string, number> = {
  free: 0,
  community: 1,      // NEW - between free and starter
  starter: 2,         // Increment all following
  professional: 3,
  agency: 4,
  enterprise: 5,
};
```

**Why:** Determines upgrade/downgrade logic in subscription management.

---

### 2. Add Community Plan to Plans Array

**Location:** Insert after Free plan (around line 432)

**Add this plan object:**
```typescript
{
  id: "community",
  name: "Community",
  monthlyPrice: 900,      // €9/mo
  annualPrice: 9000,      // €90/yr (≈€7.50/mo - save ~17%)
  description: "Course + Templates + Calls",
  icon: <Users className="w-5 h-5" />,
  features: [
    "All Free tier features",
    "Foundations Course",
    "Templates Library",
    "Weekly Live Calls",
    "Private Skool Group",
    "Early Access Features",
  ],
  cta: "Start 14-Day Trial",
  highlight: false,
  badge: "🎓 With Community",
  trialBadge: "14-DAY FREE TRIAL",
  savingsPercent: 17,
},
```

**Import needed:**
Add `Users` to lucide-react imports at top of file (line 32):
```typescript
import {
  // ... existing imports
  Users,  // ADD THIS
} from "lucide-react";
```

---

### 3. Add Trial Badge Display

**Location:** Inside plan card rendering (around line 638-648)

**After the "Current Plan" badge, add:**
```typescript
{/* Trial Badge for Community/Paid Tiers */}
{plan.trialBadge && plan.id !== currentPlan && (
  <div
    className="absolute top-0 left-0 px-2 py-1 text-[10px] font-bold text-white rounded-br"
    style={{
      background: "var(--success)",
    }}
  >
    {plan.trialBadge}
  </div>
)}
```

**Why:** Visually highlights the 14-day trial for new signups.

---

### 4. Update Plan Order in Grid

**Current order (line 612):**
```
Free → Starter → Professional → Agency → Enterprise
```

**New order:**
```
Free → Community → Starter → Professional → Agency → Enterprise
```

**No code change needed** - Plans array order automatically determines grid order.

---

### 5. Handle Community in Subscription Management

**Location:** Lines 742-912 (CTA Button logic)

**Current logic handles:**
- Free plan (cancel subscription)
- Enterprise plan (contact sales)
- Paid plans (upgrade/downgrade via subscription management)

**Community tier will work automatically** because:
1. It's in TIER_ORDER (between free and starter)
2. It has prices defined (monthlyPrice: 900, annualPrice: 9000)
3. It's not marked as `isEnterprise: true`
4. Upgrade/downgrade logic uses TIER_ORDER comparison

**Verification needed:**
- Free → Community = Upgrade (opens checkout)
- Community → Free = Downgrade (cancel subscription)
- Community → Starter = Upgrade (immediate with proration)
- Starter → Community = Downgrade (scheduled at period end)

---

### 6. Update Backend Integration

**File:** `convex/stripe/platformCheckout.ts` ✅ ALREADY UPDATED

The backend already supports Community tier:
- `TIER_PRICE_IDS` includes community prices ✅
- `createPlatformCheckoutSession` accepts `v.literal("community")` ✅
- `managePlatformSubscription` accepts community tier ✅
- `TIER_ORDER` includes `community: 1` ✅

**Environment variables needed:**
```bash
STRIPE_COMMUNITY_MO_PRICE_ID=price_1SfJQeEEbynvhkixAaECDaeA
STRIPE_COMMUNITY_YR_PRICE_ID=price_1SfJQfEEbynvhkixmZiVq8eo
```

---

## Visual Design

### Community Plan Card Appearance

```
┌─────────────────────────────────────┐
│ 14-DAY FREE TRIAL    🎓 With Community│  ← Badges
├─────────────────────────────────────┤
│  👥 Community                        │  ← Icon + Name
│     Course + Templates + Calls       │  ← Description
│                                      │
│     €9/mo                            │  ← Price
│     Save 17% • Billed €90/yr         │  ← Annual info
│                                      │
│  ✓ All Free tier features           │  ← Features
│  ✓ Foundations Course                │
│  ✓ Templates Library                 │
│  ✓ Weekly Live Calls                 │
│  ✓ Private Skool Group               │
│  ✓ Early Access Features             │
│                                      │
│  [ Start 14-Day Trial ]              │  ← CTA Button
└─────────────────────────────────────┘
```

**Styling notes:**
- Use `Users` icon (group of people)
- Same card structure as other plans
- Badge shows "🎓 With Community" (like "Most Popular" for Professional)
- Trial badge in top-left corner (green background)
- CTA: "Start 14-Day Trial" (not "Subscribe")

---

## Testing Checklist

After making changes:

### Visual Testing
- [ ] Community card appears between Free and Starter
- [ ] "14-DAY FREE TRIAL" badge shows in top-left (green)
- [ ] "🎓 With Community" badge shows in top-right
- [ ] Price shows €9/mo (monthly) or €7.50/mo (annual)
- [ ] Annual toggle shows "Save 17%" and "Billed €90/yr"
- [ ] All 6 features display correctly
- [ ] Card has same styling as other plans

### Functional Testing
- [ ] Click "Start 14-Day Trial" on Community card
- [ ] Verify it adds to cart with correct price
- [ ] Verify cart shows "Community Plan" with €9.00 or €90.00
- [ ] Complete checkout flow
- [ ] Verify Stripe Checkout shows 14-day trial
- [ ] After payment, verify subscription is created
- [ ] Verify "Current Plan" badge appears on Community card

### Upgrade/Downgrade Testing
- [ ] Free → Community: Should open checkout (upgrade)
- [ ] Community → Starter: Should use subscription management (upgrade)
- [ ] Starter → Community: Should schedule downgrade at period end
- [ ] Community → Free: Should cancel at period end

---

## Code Changes Summary

**Files to modify:**
1. `src/components/window-content/store-window.tsx`

**Changes:**
1. Update `TIER_ORDER` constant (add community: 1, increment others)
2. Add Community plan object to `plans` array
3. Add `Users` to lucide-react imports
4. Add trial badge rendering in plan card
5. Verify CTA button logic handles Community correctly

**Lines affected:** ~50-100 lines
**Estimated time:** 30-45 minutes
**Testing time:** 15-30 minutes

---

## Backend Requirements ✅ COMPLETE

**Already implemented:**
- ✅ `convex/stripe/platformCheckout.ts` supports Community
- ✅ `convex/stripe/stripePrices.ts` fetches Community prices
- ✅ Stripe products created with 14-day trials
- ✅ Environment variables configured

**No backend changes needed for store window update.**

---

## Related Documentation

- **Implementation Plan:** `docs/pricing-and-trials/IMPLEMENTATION-PLAN.md` (Phase 5)
- **Stripe Configuration:** `docs/pricing-and-trials/STRIPE-CONFIGURATION.md`
- **Price IDs:** `stripe-price-ids-clean.env`
- **Skool Integration:** `.kiro/skool_integration_platform_level_v2/OVERVIEW.md`

---

## Rollback Plan

If issues occur:

1. **Quick fix:** Remove Community from `plans` array (hide the card)
2. **Revert TIER_ORDER:** Change back to original numbering
3. **Deploy:** Push updated code without Community tier
4. **Investigation:** Check console errors, Stripe integration, subscription flow

**Safe fallback:** Free users can still upgrade directly to Starter (€199/mo) without Community option.

---

## Next Steps After Store Window Update

Once Store Window is updated and tested:

1. **Update Pricing Page** (`src/app/pricing/page.tsx`) - Show Community tier
2. **Update Dashboard** - Show "Community Member" badge for subscribers
3. **Test Full Flow** - Free → Community signup → Skool invite
4. **Monitor** - Watch for subscription creations, cancellations, upgrades

---

*Document Version 1.0 — December 17, 2025*
