# Builder Pro Free-to-Paid Funnel — Implementation Plan v3

## Summary

**Builder Pro ($20/mo)** — token-based credit system matching v0.dev's pricing model exactly.

Credits = real dollars. $1 credit = $1 in actual token costs. Users consume credits based on input/output tokens per generation. Free tier gets $5/mo + 7 messages/day cap. When credits deplete mid-project, momentum creates urgency to upgrade.

**Three conversion triggers:**
1. **Credits depleted** mid-build (momentum-based — "you're mid-project, keep going")
2. **Daily message cap** hit (7/day on free — "come back tomorrow or upgrade now")
3. **Deploy limit** hit on 2nd project (resource wall)

---

## v0.dev Reference Model (What We're Matching)

Source: [v0.app/pricing](https://v0.app/pricing)

| | v0 Free | v0 Premium | **Our Free** | **Our Pro** |
|---|---|---|---|---|
| **Price** | $0 | $20/mo | $0 | $20/mo |
| **Monthly credits** | $5/mo | $20/mo | $5/mo | $20/mo |
| **Daily login bonus** | No | +$2/day | No | +$2/day |
| **Daily message limit** | 7 messages/day | Unlimited | 7 generations/day | Unlimited |
| **On-demand top-ups** | Not available | Yes | Not available | Yes |
| **Credit rollover** | No | No (monthly resets) | No | No (monthly resets) |
| **Top-up expiry** | N/A | 1 year | N/A | 1 year |
| **Deploy to Vercel** | Yes | Yes | Yes | Yes |
| **Design mode** | Yes | Yes | Yes (build) | Yes (build) |
| **GitHub sync** | Yes | Yes | Yes | Yes |
| **Figma imports** | No | Yes | No | Yes (later) |
| **Attachment size** | Standard | 5x | Standard | 5x |

### Additional L4YERCAK3-specific features (not in v0)

| | Our Free | Our Pro |
|---|---|---|
| **Deployed projects** | 1 | Unlimited |
| **Branding** | L4YERCAK3 badge | Removed |
| **Custom domain** | No | Yes |
| **CRM contacts** | 100 | 5,000 |
| **Email sending** | 0/mo | 100/mo |

---

## Token-Based Credit Consumption

Credits are denominated in **dollars** and consumed based on actual input/output tokens. This matches v0's model where $1 credit = $1 in token costs.

### Our Model Pricing (via OpenRouter)

| Model | Input (per 1M tokens) | Output (per 1M tokens) |
|-------|----------------------|------------------------|
| claude-3.5-sonnet | $3.00 | $15.00 |
| gpt-4o | $2.50 | $10.00 |
| gpt-3.5-turbo | $0.50 | $1.50 |
| gemini-pro | $0.125 | $0.50 |

Already implemented in `convex/ai/openrouter.ts:164` — `calculateCost()`.

### v0 API Calls (Platform API)

v0 doesn't expose per-token costs through the Platform API. We treat each v0 generation as a fixed credit cost:

| Action | Estimated Cost | Notes |
|--------|---------------|-------|
| v0 generation (initial) | ~$0.30 | First prompt in conversation costs more (more context) |
| v0 follow-up edit | ~$0.10 | Shorter prompts, cached context |
| OpenRouter chat | Actual token cost | Calculated from `calculateCost()` |

These estimates will be refined with Phase 0 measurement data. v0.dev's own docs say "~10 credits per generation, ~30 for first prompt" which at their token rates works out to roughly $0.10-0.30 per generation.

### What This Means for Users

On the **Free tier ($5/mo, 7 messages/day)**:
- ~15-50 v0 generations per month (depending on complexity)
- ~7 generations per day max (hard cap)
- Enough to build ONE complete funnel, hit the wall, feel the value

On **Pro ($20/mo + $2 daily login bonus)**:
- ~$80/mo effective credits if logging in daily ($20 base + $2 x 30 days)
- ~250-800 generations per month
- No daily cap — build as much as you want

---

## Current State (What Already Exists)

| Component | Status | Location |
|-----------|--------|----------|
| AI billing schema (6 tables) | Schema complete, NOT wired up | `convex/schemas/aiBillingSchemas.ts` |
| `recordUsage()` mutation | Exists but NEVER called | `convex/ai/billing.ts:417` |
| `updateMonthlySpend()` | Called from chat.ts but tracks USD only | `convex/ai/settings.ts` |
| Token balance / purchases | Schema complete, no implementation | `convex/ai/billing.ts` |
| v0 API integration | Working, NO cost tracking | `convex/integrations/v0.ts` |
| OpenRouter + cost calc | Working, cost calculated but not deducted | `convex/ai/openrouter.ts:164` |
| Stripe SDK + webhooks | Working | `convex/http.ts`, org schema has `stripeCustomerId` |
| License enforcement | Working | `convex/licensing/helpers.ts` |
| PostHog analytics | Working | `posthog-js` + `posthog-node` |

**Critical gap**: AI calls happen but costs are never tracked or enforced. v0 calls are completely unmetered. The billing infrastructure is 80% built but the last 20% (enforcement) is missing.

---

## Phase 0: Wire Up Cost Tracking (Foundation)

**Fix the broken plumbing. No new features — make what exists actually work.**

### 0a. Call `recordUsage()` from chat handler

**File**: `convex/ai/chat.ts` (~line 870)

Currently only calls `updateMonthlySpend`. Add call to `recordUsage()`:

```
// After existing updateMonthlySpend call (line 875):
await ctx.runMutation(api.ai.billing.recordUsage, {
  organizationId: args.organizationId,
  userId: args.userId,
  requestType: "chat",
  provider: "openrouter",
  model: model,
  inputTokens: response.usage?.prompt_tokens || 0,
  outputTokens: response.usage?.completion_tokens || 0,
  costInCents: Math.round(cost * 100),
  success: true,
});
```

### 0b. Track v0 generation costs

**File**: `convex/integrations/v0.ts` (in `builderChat` function, after successful generation ~line 984)

```
// After successful v0 generation, record usage:
await ctx.runMutation(internal.ai.billing.recordUsage, {
  organizationId,
  requestType: "completion",
  provider: "v0",
  model: "v0-platform",
  inputTokens: 0,  // v0 doesn't expose token counts
  outputTokens: 0,
  costInCents: 20,  // $0.20 estimate — tune with real data
  success: true,
});
```

### 0c. Measure actual v0 costs

**File**: `convex/integrations/v0.ts`

Log v0 response metadata to determine actual costs. Run this for 1-2 weeks to gather data before setting final credit prices. If v0 Platform API returns usage info in the response, capture it.

---

## Phase 1: Credit Balance System (Backend)

### 1a. Create credit balance helpers

**New file**: `convex/billing/credits.ts` (~250 lines)

Store credit state in the license object's `customProperties.credits`:

```
customProperties.credits: {
  balanceCents: number,           // Current balance in USD cents
  monthlyAllocationCents: number, // 500 (free) or 2000 (pro)
  dailyBonusCents: number,        // 0 (free) or 200 (pro)
  lastDailyBonusAt: number,       // Timestamp — one bonus per calendar day
  periodStart: number,            // Billing period start
  periodEnd: number,              // Billing period end
  generationsToday: number,       // Counter for daily message limit
  lastGenerationDate: string,     // "2026-01-31" — resets daily counter
  topUpBalanceCents: number,      // Purchased credits (separate, don't reset monthly)
  topUpExpiresAt: number,         // 1 year from purchase
}
```

Key functions:

| Function | Purpose |
|----------|---------|
| `getCredits(ctx, orgId)` | Returns full credit state (balance, limits, usage today) |
| `checkCredits(ctx, orgId)` | Throws `CREDITS_DEPLETED` if balance <= 0 |
| `checkDailyLimit(ctx, orgId)` | Throws `DAILY_LIMIT_HIT` if free tier and >= 7 generations today |
| `deductCredits(ctx, orgId, amountCents)` | Deducts from monthly balance first, then top-up balance |
| `applyDailyBonus(ctx, orgId)` | Adds $2.00 (200 cents) if Pro and not already claimed today |
| `resetMonthlyCredits(ctx, orgId)` | Resets balance to monthly allocation on period start |
| `addTopUpCredits(ctx, orgId, amountCents)` | Adds purchased credits (1-year expiry) |

**Credit consumption order** (matching v0):
1. Monthly included credits first
2. Then top-up purchased credits
3. When both depleted → hard stop

### 1b. Add credit check to AI generation flow

**File**: `convex/ai/chat.ts`

Before the OpenRouter call:

```
// 1. Check daily limit (free tier only)
await checkDailyLimit(ctx, args.organizationId);

// 2. Check credit balance
await checkCredits(ctx, args.organizationId);

// ... existing OpenRouter call ...

// 3. After successful response, deduct actual cost
const costCents = Math.round(cost * 100);
await deductCredits(ctx, args.organizationId, costCents);

// 4. Increment daily generation counter
await incrementDailyCounter(ctx, args.organizationId);
```

### 1c. Add credit check to v0 generation flow

**File**: `convex/integrations/v0.ts`

Same pattern — check before, deduct after:

```
// Before v0 API call:
await checkDailyLimit(ctx, organizationId);
await checkCredits(ctx, organizationId);

// After successful generation:
const V0_GENERATION_COST_CENTS = 20; // $0.20 — refine with Phase 0 data
await deductCredits(ctx, organizationId, V0_GENERATION_COST_CENTS);
await incrementDailyCounter(ctx, organizationId);
```

### 1d. Initialize credits on org creation

**File**: wherever new organizations are created

```
customProperties.credits = {
  balanceCents: 500,             // $5.00 starting credits
  monthlyAllocationCents: 500,   // $5.00/mo free tier
  dailyBonusCents: 0,            // No daily bonus on free
  lastDailyBonusAt: 0,
  periodStart: Date.now(),
  periodEnd: Date.now() + 30 * 24 * 60 * 60 * 1000,
  generationsToday: 0,
  lastGenerationDate: "",
  topUpBalanceCents: 0,
  topUpExpiresAt: 0,
}
```

---

## Phase 2: Stripe Checkout + Webhooks

### 2a. Create Builder Pro checkout action

**New file**: `convex/stripe/builderProCheckout.ts` (~150 lines)

```
createBuilderProCheckoutSession:
  - Reuse org's stripeCustomerId (or create new Stripe customer)
  - Create Checkout Session:
    - price: STRIPE_BUILDER_PRO_PRICE_ID ($20/mo recurring)
    - mode: "subscription"
    - metadata: { organizationId, type: "builder_pro" }
  - Return checkoutUrl
```

### 2b. Credit top-up checkout (Pro users only)

**Same file**: `convex/stripe/builderProCheckout.ts`

```
createCreditTopUpSession:
  - Verify org has active Builder Pro subscription
  - One-time payment for credit packs:
    - $10 → 1000 credits
    - $25 → 2500 credits
    - $50 → 5000 credits
    - $100 → 10000 credits
  - metadata: { organizationId, type: "credit_topup", amountCents }
```

Free users **cannot** buy top-ups (matching v0 — forces upgrade first).

### 2c. Route webhook events

**File**: `convex/http.ts` (existing Stripe webhook handler) or `convex/stripe/platformWebhooks.ts`

**`subscription.created` / `subscription.updated`** with `metadata.type === "builder_pro"`:
- Set `customProperties.builderPro.active = true`
- Update credits:
  - `monthlyAllocationCents = 2000` ($20/mo)
  - `dailyBonusCents = 200` ($2/day)
  - `balanceCents = 2000` (top up to $20)
- Store `stripeSubscriptionId`, `currentPeriodEnd`

**`subscription.deleted`**:
- Set `builderPro.active = false`
- Reset to free: `monthlyAllocationCents = 500`, `dailyBonusCents = 0`
- Don't zero balance (let remaining credits drain naturally)
- Don't delete deployed apps — just re-apply limits on next deploy

**`payment_intent.succeeded`** with `metadata.type === "credit_topup"`:
- Add `amountCents` to `topUpBalanceCents`
- Set `topUpExpiresAt` to 1 year from now

**`invoice.payment_failed`**:
- 3-day grace period (`gracePeriodEnd = now + 3 days`)
- After grace: downgrade to free credits, re-apply limits
- Don't delete deployed apps

---

## Phase 3: Frontend — Credit Display + Upgrade Modal

### 3a. Credit balance display in builder header

**File**: `src/components/builder/builder-header.tsx`

- Show: **"$4.80 credits"** with color coding:
  - Green: > 50% of monthly allocation remaining
  - Yellow: 25-50% remaining
  - Red: < 25% remaining
  - Pulsing red: < $1.00 remaining
- On click: expand to show breakdown (monthly + top-up + daily bonus status)
- Free tier: also show **"3/7 generations today"** counter

### 3b. UpgradeGate context + modal

**New file**: `src/components/builder/upgrade-gate.tsx` (~300 lines)

Catches three error types from Convex:

| Error Code | Trigger | Modal Title | CTA |
|------------|---------|-------------|-----|
| `CREDITS_DEPLETED` | $0 balance mid-build | "Out of credits — keep building?" | "Upgrade to Pro — $20/mo with $20 credits" |
| `DAILY_LIMIT_HIT` | 7th generation on free | "You've hit your daily limit" | "Upgrade to Pro for unlimited generations" |
| `LIMIT_EXCEEDED` | 2nd deploy attempt | "Deploy more projects" | "Upgrade to Pro — $20/mo" |
| `FEATURE_LOCKED` | Remove branding / custom domain | "Unlock [feature] with Pro" | "Upgrade to Pro — $20/mo" |

**For Pro users** hitting $0 credits:
- Different modal: "Buy more credits" with pack buttons:
  - $10 | $25 | $50 | $100
- One-click → Stripe Checkout for top-up
- Show: "Your $2 daily login bonus will arrive tomorrow"

**All modals include:**
- "Maybe later" dismiss (non-aggressive)
- PostHog tracking: `upgrade_modal_shown`, `upgrade_modal_clicked`, `upgrade_modal_dismissed`

### 3c. Daily login bonus (Pro)

**File**: `src/app/builder/layout.tsx`

On mount for Pro users:
- Call `applyDailyBonus` mutation
- If bonus applied → toast: **"+$2.00 daily bonus added!"**
- If already claimed → no-op
- Track in PostHog: `daily_bonus_applied`

**Retention mechanic**: Pro users get $20 base + up to $60 bonus/mo if they log in daily. This incentivizes daily engagement and makes the effective value feel much higher than $20/mo.

### 3d. Wire UpgradeGate into builder

**File**: `src/app/builder/layout.tsx`
- Wrap with `<UpgradeGateProvider organizationId={orgId}>`

**File**: `src/contexts/builder-context.tsx`
- In `generatePage` / `sendMessage`, catch errors and call `handleConvexError()`

**File**: `src/components/builder/publish-dropdown.tsx`
- In `handlePublish`, catch `LIMIT_EXCEEDED` for deploy wall

---

## Phase 4: Deploy Enforcement + Branding

### 4a. Deploy limit check

**File**: `convex/licensing/helpers.ts`

- New `checkBuilderDeployLimit(ctx, orgId)`
- Free = 1 deployed project, Pro = unlimited
- Throws `ConvexError` with `code: "LIMIT_EXCEEDED"`, `upgradeType: "builder_pro"`

### 4b. Enforce at deploy time

**File**: `convex/integrations/vercel.ts` or `convex/integrations/github.ts`

- Call `checkBuilderDeployLimit()` at START of deploy action (before any GitHub/Vercel API calls)

### 4c. Badge injection for free deploys

**File**: `convex/publishingHelpers.ts`

- Check `license.features.badgeRequired`
- If true, inject "Built with L4YERCAK3" fixed-position badge into generated HTML layout
- Badge links to l4yercak3.app (free marketing)

---

## Phase 5: Landing + First-Run Optimization

### 5a. Builder landing CTA

**File**: `src/app/builder/page.tsx`

- Primary CTA: **"Start building for free"**
- Subline: **"$5 in credits included — no card required"**
- Secondary: "Build and publish your first funnel in 5 minutes"

### 5b. Credit balance on landing (logged-in users)

**File**: `src/app/builder/page.tsx`

- Show current credit balance prominently
- If credits < $2: show "Running low — Upgrade to Pro" CTA
- If credits = $0: show "Credits depleted — Upgrade to continue building"

### 5c. First-run starter template

**File**: `src/contexts/builder-context.tsx`

- On first project creation (check `localStorage.builder_onboarded`)
- Offer starter funnel template to reduce time-to-first-publish
- Goal: first published page in under 10 minutes

---

## Phase 6: Post-Upgrade + Welcome

### 6a. Upgrade confirmation

**File**: `src/app/builder/page.tsx`

- `?upgraded=true` query param (Stripe success redirect) → Show confirmation:
  - **"You're on Builder Pro!"**
  - $20 credits loaded
  - +$2 daily login bonus
  - Unlimited deploys
  - No L4YERCAK3 branding
  - Custom domain support
- Track `builder_pro_converted` in PostHog

### 6b. Welcome email

**File**: `convex/stripe/platformWebhooks.ts`

- On Builder Pro activation, trigger Resend welcome email
- Template: "You're on Builder Pro — here's what to do next"
- Quick wins: deploy another project, connect custom domain, remove branding, claim your daily bonus

---

## Phase 7: Observability + Analytics

### 7a. Credit usage dashboard

**File**: `src/components/builder/builder-header.tsx` (expandable panel)

- Credit balance with usage chart (last 30 days)
- Breakdown: v0 generations vs OpenRouter chat costs
- Top-up purchase history
- Daily bonus claim streak

### 7b. PostHog event tracking

| Event | Properties |
|-------|-----------|
| `credits_depleted` | `balance_at_depletion`, `plan`, `generations_today` |
| `daily_limit_hit` | `generations_used`, `credits_remaining` |
| `upgrade_modal_shown` | `trigger`, `credits_remaining`, `plan` |
| `upgrade_modal_clicked` | `trigger`, `plan_selected` |
| `upgrade_modal_dismissed` | `trigger` |
| `builder_pro_converted` | `trigger`, `time_since_signup`, `credits_at_conversion` |
| `credit_topup_purchased` | `amount_cents`, `pack_size`, `balance_before` |
| `daily_bonus_applied` | `bonus_cents`, `new_balance`, `streak_days` |
| `generation_completed` | `provider` (v0/openrouter), `cost_cents`, `credits_remaining` |

### 7c. Admin visibility

**File**: `convex/licensing/helpers.ts`

- Extend `getAllUsageStats` with:
  - Total credits consumed this month
  - v0 vs OpenRouter cost split
  - Average cost per generation
  - Conversion funnel metrics

---

## Future Tiers (Not in v1, Match When Ready)

| | v0 Team | Our Team (future) |
|---|---|---|
| **Price** | $30/user/mo | $30/user/mo |
| **Credits** | $30/user/mo + $2 daily bonus per user | $30/user/mo + $2 daily bonus per user |
| **Features** | Shared credits, centralized billing, team collab | Shared credits, centralized billing, team collab |

| | v0 Business | Our Business (future) |
|---|---|---|
| **Price** | $100/user/mo | TBD |
| **Credits** | $30/user/mo + $2 daily bonus per user | TBD |
| **Features** | Training opt-out, shared credits | Training opt-out, shared credits |

---

## File Summary

### New Files (3)

| File | Purpose | ~Lines |
|------|---------|--------|
| `convex/billing/credits.ts` | Credit balance CRUD, check, deduct, daily bonus, monthly reset, top-ups | ~250 |
| `convex/stripe/builderProCheckout.ts` | Stripe checkout for subscription + credit top-ups | ~150 |
| `src/components/builder/upgrade-gate.tsx` | UpgradeGate context, modal, credit balance display | ~300 |

### Modified Files (10)

| File | Change |
|------|--------|
| `convex/ai/chat.ts` | Add credit check + daily limit before generation, call `recordUsage()`, deduct credits after |
| `convex/integrations/v0.ts` | Add credit check/deduct around v0 calls, record usage costs |
| `convex/licensing/tierConfigs.ts` | Add `BUILDER_PRO_OVERRIDES` constant |
| `convex/licensing/helpers.ts` | Apply Builder Pro overrides, add `checkBuilderDeployLimit`, extend stats |
| `convex/http.ts` or `convex/stripe/platformWebhooks.ts` | Route `builder_pro` + `credit_topup` webhook events |
| `src/components/builder/publish-dropdown.tsx` | Catch deploy limit error, wire UpgradeGate |
| `src/app/builder/layout.tsx` | Wrap with `UpgradeGateProvider`, daily bonus on mount |
| `src/app/builder/page.tsx` | CTA copy, credit display, `?upgraded=true` confirmation |
| `src/contexts/builder-context.tsx` | Catch credit/limit errors in generation flow, first-run template |
| `convex/publishingHelpers.ts` | Badge injection for free-tier deploys |

---

## Environment Variables

```
STRIPE_BUILDER_PRO_PRICE_ID=price_xxx          # $20/mo recurring subscription
STRIPE_CREDIT_TOPUP_10_PRICE_ID=price_xxx      # $10 one-time
STRIPE_CREDIT_TOPUP_25_PRICE_ID=price_xxx      # $25 one-time
STRIPE_CREDIT_TOPUP_50_PRICE_ID=price_xxx      # $50 one-time
STRIPE_CREDIT_TOPUP_100_PRICE_ID=price_xxx     # $100 one-time
```

---

## Implementation Order

```
Phase 0 → Phase 1 → Phase 2 → Phase 4 → Phase 3 → Phase 5 → Phase 6 → Phase 7
  ↓          ↓          ↓          ↓          ↓          ↓          ↓          ↓
 Fix       Credits    Stripe    Deploy     UX/Modal  Landing   Confirm   Analytics
tracking   system     billing   wall       + display  CTA       + email
```

1. **Phase 0** — Wire up cost tracking (fix broken plumbing, measure v0 costs)
2. **Phase 1** — Credit balance system (the currency of the upgrade)
3. **Phase 2** — Stripe checkout + webhooks (the payment path)
4. **Phase 4** — Deploy enforcement + branding (the hard wall)
5. **Phase 3** — UpgradeGate + credit display (the user experience)
6. **Phase 5** — Landing + first-run (acquisition)
7. **Phase 6** — Confirmation + email (delight)
8. **Phase 7** — Analytics + admin dashboard (optimization)

---

## Verification Checklist

- [ ] **Cost tracking**: Every v0 and OpenRouter call records to `aiUsage` table with correct cost
- [ ] **Credit deduction**: Generate a page → credit balance decreases by actual token cost
- [ ] **Daily limit**: Free user hits 7 generations/day → `DAILY_LIMIT_HIT` modal
- [ ] **Credit depletion**: Free user burns $5 credits → `CREDITS_DEPLETED` modal mid-build
- [ ] **Deploy wall**: Deploy 1st project (works) → try 2nd → `LIMIT_EXCEEDED` modal
- [ ] **Upgrade flow**: Click upgrade → Stripe Checkout ($20/mo) → webhook → credits = $20 → redirect to builder
- [ ] **Daily bonus**: Pro user opens builder → +$2.00 toast → balance reflects bonus → no double-claim same day
- [ ] **Top-up**: Pro user buys $25 pack → balance increases immediately → expires in 1 year
- [ ] **Top-up blocked for free**: Free user cannot access top-up purchase (must upgrade first)
- [ ] **Credit order**: Monthly credits consumed first, then top-up credits
- [ ] **Downgrade**: Cancel Pro → end of period → reset to $5/mo free, daily bonus removed, deploy limit re-applied
- [ ] **Failed payment**: 3-day grace → then downgrade to free
- [ ] **Analytics**: All PostHog events firing with correct properties
- [ ] **No regression**: Existing 5-tier platform licensing unchanged

---

## Risks + Mitigations

| Risk | Mitigation |
|------|-----------|
| Don't know actual v0 cost per generation | Phase 0 measures real costs for 1-2 weeks. Start with $0.20 estimate, adjust before launching credits |
| Credit deduction fails but generation succeeds | Post-generation deduction (not pre). If fails, log error, don't break UX. Async reconciliation job |
| Users game daily limit with multiple orgs | Track by `userId` not just `organizationId` for daily generation count |
| Existing $49/mo AI subscribers | Migrate to Builder Pro. Email communication. Honor remaining subscription period |
| v0 API rate limits hit before our credit limit | v0 polling already has 2-min timeout. Our credits are the limit, not v0's rate limits |
| Currency mismatch ($ credits, € display) | Credits stored and consumed in USD cents internally. Display converts at fixed rate or shows $ directly. v0 uses $ globally — we should too |
| Daily bonus gaming (logout/login repeatedly) | `lastDailyBonusAt` timestamp check — one claim per calendar day, server-side enforced |
| Top-up credits never expire in practice | Enforce 1-year expiry with cron job. Match v0's policy exactly |
