# Store Pricing Transparency Master Plan

**Date:** 2026-02-19  
**Scope:** Build a transparent, documentation-grade pricing experience directly in `/store` with desktop window/full-screen/mobile parity, a built-in calculator, and aligned licensing/checkout truth.

---

## Mission

Deliver one public pricing surface (`/store`) where users can:

1. understand plan value and limits without hidden details,
2. navigate long-form pricing sections quickly with a right-side section rail,
3. estimate costs with a built-in calculator,
4. trust that UI pricing semantics match runtime licensing, Stripe checkout, and tax/trial behavior.

---

## Locked product decisions

1. Keep pricing inside `/store`; no separate `/pricing` page.
2. `/store` must be public.
3. Ship parity across:
   - desktop window mode (`StoreWindow`),
   - full-screen page (`/store`),
   - mobile readable mode.
4. Desktop/full-screen default: right section rail expanded.
5. Right rail can be toggled but does not persist.
6. Mobile navigation pattern: sticky top `Jump to` button that opens a section sheet.
7. Calculator v1 inputs:
   - plan,
   - billing cycle,
   - credits,
   - Scale sub-organization count,
   - seat/user count,
   - tax mode.
8. Tier visibility: show active tiers only (`Free`, `Pro`, `Scale`, `Enterprise`), no legacy section.
9. Naming policy: externally display `Scale`; internal contracts may remain `agency`.
10. Tax presentation policy: VAT included everywhere in store-facing copy.
11. Trial policy: Scale trial must be real and backend-enforced on the store checkout path.
12. Include consistency fixes in this workstream:
   - legacy tier drift in `convex/licensing/helpers.ts`,
   - legacy pricing copy in `convex/organizations.ts`,
   - legacy tier union drift in `convex/licensing/superAdmin.ts`,
   - VAT copy mismatch in `convex/translations/seedStore.ts` and `src/components/window-content/store/store-plan-cards.tsx`,
   - store deep-link prop wiring in `src/hooks/window-registry.tsx`.

---

## Current state summary

1. Store UI is currently tab-based (`Plans`/`Credits`) and lacks section-based long-form navigation (`src/components/window-content/store-window.tsx`).
2. Full-screen `/store` already reuses `StoreWindow` (`src/app/store/page.tsx`) and is effectively public under current middleware behavior (`src/middleware.ts`).
3. Shell URL parser maps store `panel -> initialSection`, but the window registry store factory drops incoming props (`src/lib/shell/url-state.ts`, `src/hooks/window-registry.tsx`).
4. Plan UI already exposes `Scale` label while using internal `agency` IDs (`src/components/window-content/store/store-plan-cards.tsx`).
5. Multiple backend/copy paths still reference legacy tiers/prices (`starter`, `professional`) (`convex/licensing/helpers.ts`, `convex/organizations.ts`, `convex/licensing/superAdmin.ts`).
6. VAT messaging is inconsistent (`convex/translations/seedStore.ts` says VAT included; store plan footer says VAT excluded).
7. Trial behavior is split: store checkout path uses `createPlatformCheckoutSession`, while trial logic lives in a separate action path (`convex/stripe/platformCheckout.ts`, `convex/stripe/trialCheckout.ts`).

---

## Source-of-truth hierarchy (pricing and policy)

This hierarchy is the canonical contract for implementation and audits:

1. **Runtime entitlement truth:** `convex/licensing/tierConfigs.ts` + resolved license in `convex/licensing/helpers.ts`.
2. **Checkout billing truth:** `convex/stripe/platformCheckout.ts` + webhook state sync in `convex/stripe/platformWebhooks.ts`.
3. **Plan price truth:** Stripe price fetch adapters in `convex/stripe/stripePrices.ts` (with migration-safe fallback rules).
4. **Credits math truth:** `src/lib/credit-pricing.ts` and parity with `convex/stripe/creditCheckout.ts`.
5. **Trial enforcement truth:** `convex/stripe/trialCheckout.ts` + `convex/stripe/trialHelpers.ts` + whichever checkout path `/store` executes.
6. **Tax semantics truth:** VAT-inclusive store contract and broader tax model in `docs/reference_docs/billing/tax-system.md`.
7. **UI rendering truth:** store pricing spec adapter consumed by store UI sections/calculator (defined in lane `A`).

### SPT-003 freeze details (2026-02-19)

1. **Naming contract (frozen):**
   - Public store tier key: `scale`
   - Runtime/backend tier key: `agency`
   - Mapping authority exports:
     - `src/lib/credit-pricing.ts` (`STORE_PUBLIC_TO_RUNTIME_TIER`, `STORE_RUNTIME_TO_PUBLIC_TIER`)
     - `convex/licensing/tierConfigs.ts` (`STORE_PUBLIC_TO_RUNTIME_TIER_NAME`, `STORE_RUNTIME_TO_PUBLIC_TIER_NAME`)
     - `convex/stripe/stripePrices.ts` (`STORE_PUBLIC_TO_RUNTIME_STRIPE_TIER`, `STORE_RUNTIME_TO_PUBLIC_STRIPE_TIER`)
     - `convex/stripe/platformCheckout.ts` (`STORE_PUBLIC_TO_RUNTIME_CHECKOUT_TIER`, `STORE_RUNTIME_TO_PUBLIC_CHECKOUT_TIER`)

2. **Tax policy anchor (frozen):**
   - Store-facing pricing/totals use VAT-inclusive display semantics.
   - Store tax policy anchor is `docs/reference_docs/billing/tax-system.md` under the Store Pricing Transparency contract section.

3. **Trial policy anchor (frozen):**
   - Store trial target is customer-facing `Scale`.
   - Runtime compatibility key remains `agency`.
   - Trial contract is anchored in `convex/stripe/trialCheckout.ts` via `STORE_SCALE_TRIAL_POLICY` (14 days).

4. **Source hierarchy export anchor (frozen):**
   - `src/lib/credit-pricing.ts` publishes `STORE_PRICING_SOURCE_HIERARCHY` for UI/store adapter attribution.

---

## Experience blueprint

### 1) Layout architecture

For desktop window and full-screen:

1. Left/main column: long-form pricing documentation sections.
2. Right column: section rail (`Jump to`) with active-section highlighting.
3. Rail state defaults expanded; user can collapse during session.

For mobile:

1. Sticky top `Jump to` button.
2. Button opens a section sheet with all anchors.
3. Section sheet closes on selection and scrolls to anchor.

### 2) Section model (v1)

1. Overview / pricing principles.
2. Plan cards (`Free`, `Pro`, `Scale`, `Enterprise`).
3. Plan comparison matrix (limits + key features).
4. Billing behavior (monthly/annual, proration, cancellation).
5. Scale add-ons (sub-org pricing details).
6. Credits economics (tiers and examples).
7. Pricing calculator.
8. Trial and onboarding policy.
9. FAQ + policy references.

### 3) URL and deep-link contract

1. Desktop shell deep-link stays canonical via `app=store&panel=<section>`.
2. Full-screen can continue section query mapping, but contracts must normalize to one section identity model.
3. Window registry must pass store props through to `StoreWindow`.
4. Legacy shell aliases remain read-compatible.

---

## Calculator v1 contract

Inputs:

1. `plan`: `free | pro | scale | enterprise` (internal mapping supports `agency`).
2. `billing_cycle`: monthly or annual.
3. `credits_purchase_eur`: one-time credits amount.
4. `scale_sub_org_count`: integer, only relevant for Scale.
5. `seat_user_count`: integer.
6. `tax_mode`: VAT-included display mode.

Outputs:

1. Estimated recurring monthly equivalent.
2. Estimated annual total.
3. Add-on subtotal (sub-org and seats when applicable).
4. Credits subtotal.
5. VAT-included totals with line-item transparency.
6. Source attribution labels (which numbers come from Stripe, licensing config, or credit math).

---

## Option set

| Option | Description | Pros | Cons |
|---|---|---|---|
| `A` (recommended) | Keep current store route/component but refactor into sectioned documentation + calculator + backend consistency fixes | Fastest path, preserves existing entrypoints, minimizes migration risk | Requires coordinated frontend/backend consistency cleanup |
| `B` | Build a separate new pricing app/page and later replace store | Clean slate | Duplicate behavior during transition; higher integration risk |
| `C` | Cosmetic-only UI update and postpone backend consistency | Lower short-term effort | Preserves trust gaps and trial/copy drift |

### Recommendation

Adopt **Option A** and execute queue lanes with strict source-of-truth contracts before UI rollout.

---

## Strategy pillars

1. **Transparency first:** expose pricing mechanics and limits in plain language.
2. **Navigation clarity:** fast section jumps in long-form pricing content.
3. **Contract fidelity:** UI numbers and labels match runtime/licensing/billing behavior.
4. **Public parity:** same experience for anonymous users and signed-in users across all modes.
5. **Naming discipline:** external `Scale`, internal compatibility `agency`.
6. **Trial correctness:** trial CTA must map to enforced backend behavior.

---

## Phase-to-lane mapping

| Phase | Objective | Queue lanes | Queue tasks |
|---|---|---|---|
| Phase 1 | Contract freeze + source hierarchy | `A` | `SPT-001`..`SPT-003` |
| Phase 2 | Store shell/nav architecture parity | `B` | `SPT-004`..`SPT-006` |
| Phase 3 | Transparent content + calculator | `C` | `SPT-007`..`SPT-009` |
| Phase 4 | Licensing/checkout/trial/tax consistency | `D` | `SPT-010`..`SPT-013` |
| Phase 5 | Hardening + docs closeout | `E` | `SPT-014`..`SPT-015` |

---

## Acceptance criteria

1. `/store` is public and serves as the single pricing URL.
2. Desktop window and full-screen `/store` both provide right-side section nav, default-expanded with optional collapse.
3. Mobile uses sticky `Jump to` button and section sheet navigation.
4. Pricing calculator v1 ships with locked input set and VAT-inclusive totals.
5. Store shows active tiers only and uses external `Scale` naming.
6. Trial CTA for Scale maps to real backend-enforced trial behavior.
7. Legacy tier copy/union drift is removed from targeted licensing/organization files.
8. VAT copy is consistent across store UI/translations.
9. Store deep-link props work in window mode and full-screen.
10. Verification stack for completed rows is recorded in queue notes.

---

## Risks and mitigations

1. **UI/contract drift (display vs backend reality)**  
Mitigation: lane `A` source hierarchy freeze + lane `D` consistency tasks before closeout.

2. **Navigation regression across desktop/full-screen/mobile**  
Mitigation: lane `B` dedicated parity tasks + shell URL unit checks.

3. **Trial billing behavior mismatch**  
Mitigation: unify store CTA path with enforced trial checks and webhook sync in lane `D`.

4. **Naming migration breakage (`agency` vs `scale`)**  
Mitigation: explicit adapter/mapping layer, avoid hard data migrations in first pass.

5. **Tax copy inconsistency across translated surfaces**  
Mitigation: pair translation seed + component copy + i18n audit in one lane.

---

## Deployment and rollback notes

1. **Scale trial enforcement (lane D -> E handoff)**
   - Deploy validation: confirm store CTA creates checkout/trial sessions through the live platform checkout path, verify one-trial guard behavior, and verify webhook trial-state sync before rollout completion.
   - Rollback: revert trial-path checkout/webhook/store-CTA coupling changes together (single rollback unit), then re-run `npm run test:unit` and Stripe lint profiles before reopening rollout.

2. **Public naming + VAT-inclusive copy contract**
   - Deploy validation: verify customer-facing `Scale` naming and VAT-inclusive copy are consistent across `/store`, translation seeds, and pricing payload adapters.
   - Rollback: revert naming/copy surfaces as one bundle (store UI + translations + resolver aliases), keeping runtime `agency` compatibility keys intact; re-run store lint + i18n audit before re-release.

---

## Status snapshot

1. `SPT-001` is `DONE`: baseline implementation gaps and drift captured.
2. `SPT-002` is `DONE`: product decisions frozen from user confirmations.
3. `SPT-003` is `DONE`: canonical pricing hierarchy, Scale<->agency mapping exports, VAT/trial policy anchors frozen.
4. `SPT-004` is `DONE`: sectioned store shell shipped with right rail and sticky mobile Jump sheet navigation architecture.
5. `SPT-005` is `DONE`: store deep-link/state parity fixed for desktop/full-screen and store prop wiring through registry restored.
6. `SPT-006` is `DONE`: responsive readability and accessibility hardening shipped for all store surfaces.
7. `SPT-007` is `DONE`: transparent pricing documentation sections now render from contract-backed store data (plans, limits matrix, add-ons, billing semantics, trial policy, FAQ) with source attribution and active-tier-only presentation.
8. `SPT-008` is `DONE`: pricing calculator v1 is shipped with required input set (plan, billing cycle, credits, Scale sub-org count, seat/user count, tax mode) and VAT-inclusive explainable outputs.
9. `SPT-009` is `DONE`: deterministic calculator/parity unit tests added for credits math boundaries, monthly/annual + sub-org totals, VAT-inclusive totals, and missing-price fallback behavior.
10. `SPT-010` is `DONE`: legacy tier copy/typing drift removed from lane-D licensing/org/admin surfaces with active-tier upgrade messaging (`Pro` -> `Scale` -> `Enterprise`).
11. `SPT-011` is `DONE`: Scale trial path now runs on the live store checkout action with backend one-trial eligibility enforcement, trial status/date webhook sync, and CTA parity via backend trial eligibility state.
12. `SPT-012` is `DONE`: VAT copy is standardized across store subtitle/footer/credit copy and tax-policy docs; `i18n:audit` still reports unrelated pre-existing baseline drift outside this lane scope.
13. `SPT-013` is `DONE`: public `scale` naming is normalized for store checkout/deep-link inputs while runtime metadata contracts keep `agency`; Stripe resolver payloads gained additive public aliases for backward compatibility.
14. `SPT-014` is `DONE`: lane-E parity hardening completed for public `/store` with centralized login-return URL construction, deep-link regression coverage, and hydration-safe section-sync behavior across desktop/full-screen/mobile flows.
15. `SPT-015` is `DONE`: queue/master/index closeout complete with deployment/rollback notes for trial enforcement and naming/tax copy contracts; docs guard passes.
