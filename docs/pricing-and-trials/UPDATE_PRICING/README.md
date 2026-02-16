# Store Rebuild: Match Actual Stripe Plans

> **Status:** Ready for Implementation
> **Date:** 2026-02-15

## Problem

The current `store-window.tsx` (1,902 lines) shows **old pricing** that does NOT match Stripe:

| Current Store (WRONG) | Actual Stripe (.env.local) |
|----------------------|---------------------------|
| Free | Free |
| Community €9/mo | **DELETED** |
| Starter €199/mo | **DELETED** |
| Professional €399/mo | **DELETED** |
| Agency €599/mo | **Agency €299/mo** |
| Enterprise | Enterprise (contact sales) |
| AI Standard €49/mo | **DELETED** (GDPR default) |
| AI Privacy €49/mo | **DELETED** (GDPR default) |
| Token Packs (4 fixed) | **Credits (dynamic pricing)** |
| — | **Pro €29/mo** (NEW) |

## What We're Building

1. **Simplified Store** — 4 plan cards (Free, Pro, Agency, Enterprise) + v0-style credit purchasing
2. **Dynamic Credit Checkout** — User picks EUR amount, credits calculated at tiered rate
3. **Contextual Emails** — Event-specific emails for upgrades, downgrades, credit purchases
4. **Purchase Result Windows** — Already built (`purchase-result-window.tsx`), needs wiring

## Phases

| Phase | Doc | Summary |
|-------|-----|---------|
| 1 | [PHASE_1_BACKEND_TIERS.md](./PHASE_1_BACKEND_TIERS.md) | Update backend to 4-tier model |
| 2 | [PHASE_2_CREDIT_CHECKOUT.md](./PHASE_2_CREDIT_CHECKOUT.md) | Dynamic credit purchasing |
| 3 | [PHASE_3_STORE_FRONTEND.md](./PHASE_3_STORE_FRONTEND.md) | Rewrite store-window.tsx |
| 4 | [PHASE_4_RESULT_WINDOWS.md](./PHASE_4_RESULT_WINDOWS.md) | Wire purchase result windows |
| 5 | [PHASE_5_EMAILS.md](./PHASE_5_EMAILS.md) | Contextual subscription emails |
| 6 | [PHASE_6_CLEANUP.md](./PHASE_6_CLEANUP.md) | Remove old tier references |

## Stripe Price IDs (Source of Truth)

From `.env.local`:
```
STRIPE_PRO_MO_PRICE_ID=price_1T10h5EEbynvhkixGqYfKhuJ      # Pro €29/mo
STRIPE_PRO_YR_PRICE_ID=price_1T10jjEEbynvhkixduIkzeE6       # Pro €290/yr
STRIPE_AGENCY_MO_PRICE_ID=price_1T10mUEEbynvhkix8KTWCDEo    # Agency €299/mo (14-day trial)
STRIPE_AGENCY_YR_PRICE_ID=price_1T10nlEEbynvhkixvMyIyoBX     # Agency €2,990/yr
STRIPE_SUB_ORG_MO_PRICE_ID=price_1SfJQpEEbynvhkixlVSGv8oj   # Sub-Org €79/mo
STRIPE_SUB_ORG_YR_PRICE_ID=price_1SfJQpEEbynvhkix3sNohHev   # Sub-Org annual
# Credits: Dynamic pricing (no fixed Stripe Price IDs)
```

## File Summary

| Action | File | Phase |
|--------|------|-------|
| MODIFY | `convex/schemas/coreSchemas.ts` | 1 |
| MODIFY | `convex/licensing/tierConfigs.ts` | 1 |
| MODIFY | `convex/stripe/platformCheckout.ts` | 1 |
| MODIFY | `convex/stripe/platformWebhooks.ts` | 1, 2, 5 |
| MODIFY | `convex/stripe/stripePrices.ts` | 1 |
| **CREATE** | `convex/stripe/creditCheckout.ts` | 2 |
| **CREATE** | `src/components/window-content/store/store-plan-cards.tsx` | 3 |
| **CREATE** | `src/components/window-content/store/store-credit-section.tsx` | 3 |
| REWRITE | `src/components/window-content/store-window.tsx` (1,902 → ~300 lines) | 3 |
| MODIFY | `src/app/page.tsx` | 4 |
| MODIFY | `src/hooks/window-registry.tsx` | 4 |
| **DELETE** | `src/components/window-content/checkout-success-window.tsx` | 4 |
| **DELETE** | `src/components/window-content/checkout-failed-window.tsx` | 4 |
| **CREATE** | `convex/actions/subscriptionEmails.ts` | 5 |

**Reused (no changes needed):**
- `purchase-result-window.tsx` (614 lines, already built)
- `convex/credits/index.ts` (891 lines, `addPurchasedCredits` ready)
- `convex/credits/notifications.ts` (360 lines, Pushover alerts ready)
- `convex/emailService.ts` (Resend infrastructure)
