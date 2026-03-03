# Stripe Readiness Checklist (Store + Commercial Offers)

Last updated: 2026-03-02
Owner: Revenue Engineering
Status: Use this as go/no-go before enabling Stripe-first purchase paths.

## 1. Scope

This checklist covers Stripe readiness for:

- Platform subscriptions from Store (`createPlatformCheckoutSession`)
- Credit purchases from Store (`createCreditCheckoutSession`)
- Commercial offer cards in Store (`createCommercialOfferCheckoutSession`)
- Webhook processing for Stripe endpoints in Convex HTTP handlers

Out of scope:

- AI billing checkout and AI webhook paths
- SMS checkout paths

## 2. Code Paths (Source of Truth)

- Store window orchestration:
  - `src/components/window-content/store-window.tsx`
- Commercial offer cards and CTA mapping:
  - `src/components/window-content/store/store-pricing-reference.tsx`
- Commercial offer catalog and Stripe checkout actions:
  - `convex/stripe/platformCheckout.ts`
  - `convex/stripe/stripePrices.ts`
- Credit checkout:
  - `convex/stripe/creditCheckout.ts`
- Stripe webhook handlers:
  - `convex/http.ts`

## 3. Required Environment Variables

Minimum required for Store checkout flows:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRO_MO_PRICE_ID`
- `STRIPE_PRO_YR_PRICE_ID`
- `STRIPE_AGENCY_MO_PRICE_ID`
- `STRIPE_AGENCY_YR_PRICE_ID`
- `NEXT_PUBLIC_APP_URL` or `APP_URL`

Required for commercial "checkout_now" offers to actually open Stripe:

- `STRIPE_LAYER1_FOUNDATION_SETUP_PRICE_ID`
- `STRIPE_CONSULT_DONE_WITH_YOU_PRICE_ID`

Optional commercial policy variables:

- `STRIPE_BYOK_FLAT_PLATFORM_FEE_CENTS`
- `STRIPE_BYOK_ENTERPRISE_SURCHARGE_BPS`

## 4. Commercial Offer Motion Gate

Commercial offer checkout behavior is controlled by both catalog motion and Stripe price availability:

- If `offer.motion !== "checkout_now"` or `offer.stripePriceId` is missing, backend returns `mode: "inquiry_first"` and UI routes to chat.
- If `mode === "checkout_now"` with `checkoutUrl`, UI redirects to Stripe Checkout.

## 5. Known Routing Rules (Important)

These are current intentional code behaviors and must be acknowledged during readiness:

1. Any `chat_handoff` selection in Store routes to `/chat?...`.
2. In `store-pricing-reference.tsx`, consulting offers (`offerCode` starts with `consult`) are hardcoded to `action: "chat_handoff"`.
3. CTA text can show `"Buy now"` based on frontend selection logic, but checkout still falls back to chat if backend returns `inquiry_first`.

Go/no-go implication:

- Do not assume a `"Buy now"` button means Stripe is configured.
- Confirm backend response mode for each offer.

## 6. Pre-Launch Validation Steps

1. Validate env vars are present in the target Convex deployment (staging/prod).
2. Verify commercial catalog response includes expected `motion` and `checkoutConfigured` values.
3. Confirm Store CTA behavior per offer:
   - `layer1_foundation`: should go Stripe when configured.
   - `consult_done_with_you`: currently routes to chat by frontend mapping unless code is changed.
4. Complete E2E click-through from Store:
   - Pro monthly plan
   - Scale monthly plan
   - Credit purchase preset (`€30`)
   - Commercial layer offer
5. Confirm webhook ingestion:
   - Stripe sends `checkout.session.completed`
   - Convex endpoint responds 200
   - expected post-payment state changes occur
6. Confirm success/cancel return URLs resolve correctly to app shell.

## 7. Smoke Test Matrix

| Flow | User State | Expected Result |
|---|---|---|
| Pro plan checkout | Signed in + org loaded | Redirect to Stripe checkout URL |
| Scale plan checkout | Signed in + org loaded | Redirect to Stripe checkout URL |
| Credit checkout | Signed in + org loaded | Redirect to Stripe checkout URL |
| Layer 1 commercial offer (configured) | Signed in + org loaded | Redirect to Stripe checkout URL |
| Layer 1 commercial offer (missing price id) | Signed in + org loaded | Redirect to `/chat` with offer/intent params |
| Consulting offer card | Any | Redirect to `/chat` (current frontend mapping) |

## 8. Quick Verification Commands

Run against the target deployment:

```bash
npx convex env list
npx convex run stripe/platformCheckout:getCommercialOfferCatalog
```

What to check:

- `getCommercialOfferCatalog.offers[].checkoutConfigured` is `true` for offers that should open Stripe.
- `motion` values match business intent (`checkout_now`, `inquiry_first`, `invoice_only`).

## 9. Go/No-Go Criteria

Go only if all are true:

- Required Stripe env vars are set in target deployment.
- Subscription and credit checkouts redirect to Stripe successfully.
- Commercial offers behave as explicitly intended per motion.
- Webhook endpoint validates signature and processes checkout completion.
- Return URLs and success states are verified in UI.

No-go triggers:

- Missing `STRIPE_SECRET_KEY` or required price IDs.
- Commercial offer marked for checkout but backend returns `inquiry_first`.
- Any checkout route loops to chat unexpectedly.
- Webhook signature verification failures in target environment.

## 10. Optional Hardening Before Launch

- Align CTA labeling with backend checkout availability (`checkoutConfigured`) to avoid "Buy now" mismatch.
- Add a UI badge/state for "Talk to sales" when offer is inquiry-only.
- Add automated test that asserts each commercial offer’s CTA action matches backend motion and config.

## 11. Fix Plan (Prioritized)

### FP-1: Fix CTA/action mismatch for commercial offers

Problem:

- Store card action/label is currently derived from frontend motion mapping only.
- Consulting offers are forced to `chat_handoff`.
- "Buy now" can appear even when backend will return `inquiry_first`.

Files:

- `src/components/window-content/store/store-pricing-reference.tsx`

Changes:

1. Update `buildSelection` to use `offer.checkoutConfigured` in addition to `offer.motion`.
2. Remove unconditional consult `chat_handoff` override or gate it behind explicit business flag.
3. Set CTA label from final action path:
   - checkout path: `Buy now`
   - inquiry/chat path: `Get started` or `Talk to sales`

Acceptance criteria:

- No card displays `Buy now` unless click path will open Stripe.
- `consult_done_with_you` behavior matches decided business intent (Stripe checkout or chat) consistently.

---

### FP-2: Enforce backend/frontend parity for offer behavior

Problem:

- Frontend computes action independently from backend fallback rules.

Files:

- `src/components/window-content/store/store-pricing-reference.tsx`
- `src/components/window-content/store-window.tsx`
- `convex/stripe/platformCheckout.ts`

Changes:

1. Treat backend as source of truth for checkout availability.
2. Keep frontend action as a hint only; final route decision comes from action result mode.
3. Add structured telemetry when fallback to chat happens after checkout intent.

Acceptance criteria:

- For every commercial offer click, logs include `offerCode`, intended action, backend `mode`, and final route.
- No silent fallback without observability.

---

### FP-3: Add deployment readiness guard for missing Stripe IDs

Problem:

- Missing env price IDs silently downgrade checkout offers to inquiry mode.

Files:

- `convex/stripe/platformCheckout.ts`
- `convex/stripe/stripePrices.ts`

Changes:

1. Add internal guard/report query that returns offers with `motion=checkout_now` but missing `stripePriceId`.
2. Optionally surface a warning banner in Store for super admins when such mismatches exist.

Acceptance criteria:

- Readiness command clearly lists all broken offers before release.
- Admin can detect misconfiguration from UI or ops output without debugging code.

---

### FP-4: Add tests for CTA-to-routing contract

Problem:

- No automated protection against regressions in offer motion/CTA routing.

Suggested test files:

- `tests/unit/store/commercial-offer-routing.test.ts` (new)
- `tests/unit/agents/agentStorePanel.test.ts` (extend if needed)

Test cases:

1. `checkout_now + checkoutConfigured=true` => CTA indicates buy flow and routes to Stripe mode.
2. `checkout_now + checkoutConfigured=false` => CTA indicates inquiry flow and routes to chat.
3. `inquiry_first` => inquiry CTA + chat route.
4. Consulting offers follow chosen business rule, not hardcoded accidental override.

Acceptance criteria:

- Test suite fails on any future "Buy now but chat fallback" regression.

---

### FP-5: Update operator docs and release checklist

Problem:

- Runtime behavior changed by config is not obvious to release operators.

Files:

- `docs/pricing-and-trials/STRIPE-SETUP-GUIDE.md`
- `docs/pricing-and-trials/STORE-WINDOW-UPDATE.md`
- This file (`STRIPE-READINESS.md`)

Changes:

1. Add one checklist line per commercial offer requiring Stripe price ID.
2. Add explicit note that missing IDs trigger inquiry/chat fallback.
3. Add expected behavior table for each offer code.

Acceptance criteria:

- Ops can validate behavior without opening code.

---

### Recommended execution order

1. FP-1
2. FP-3
3. FP-4
4. FP-2
5. FP-5

This order removes user-facing mismatch first, then adds guardrails and tests.
