# Store Pricing Transparency Task Queue

**Last updated:** 2026-02-19  
**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/store-pricing-transparency`  
**Source request:** Rebuild `/store` into a transparent pricing + documentation experience (PostHog-style section navigation) with desktop window/full-screen/mobile parity, built-in calculator, and licensing/checkout truth alignment.

---

## Queue rules

1. Allowed statuses are only: `READY`, `IN_PROGRESS`, `PENDING`, `BLOCKED`, `DONE`.
2. Only one task may be `IN_PROGRESS` globally unless concurrency rules explicitly allow one per lane.
3. Promote a task from `PENDING` to `READY` only when all dependencies are `DONE`.
4. Selection order is deterministic: highest priority (`P0` -> `P1` -> `P2`) then lowest task ID.
5. If a task is `BLOCKED`, capture blocker details in row `Notes` and continue with the next `READY` task.
6. Every task must include explicit verification commands before moving to `DONE`.
7. Keep lane boundaries strict to reduce merge conflicts.
8. Sync `INDEX.md`, `MASTER_PLAN.md`, and `TASK_QUEUE.md` after each completed task.
9. External plan naming is `Scale`; internal plan slug remains `agency` until migration contract says otherwise.
10. Store pricing presentation must be VAT-inclusive everywhere in user-facing copy.
11. `/store` remains the single public pricing surface (no separate `/pricing` route).

---

## Verification profiles

| Profile | Command |
|---|---|
| `V-TYPE` | `npm run typecheck` |
| `V-LINT` | `npm run lint` |
| `V-UNIT` | `npm run test:unit` |
| `V-DOCS` | `npm run docs:guard` |
| `V-I18N` | `npm run i18n:audit` |
| `V-SHELL-UNIT` | `npx vitest run tests/unit/shell/url-state.test.ts` |
| `V-STORE-LINT` | `npx eslint src/components/window-content/store-window.tsx src/components/window-content/store src/app/store/page.tsx src/lib/shell/url-state.ts src/hooks/window-registry.tsx src/components/credit-wall.tsx src/components/ui/upgrade-prompt.tsx` |
| `V-LICENSING-LINT` | `npx eslint convex/licensing/helpers.ts convex/licensing/superAdmin.ts convex/licensing/tierConfigs.ts convex/organizations.ts` |
| `V-STRIPE-LINT` | `npx eslint convex/stripe/platformCheckout.ts convex/stripe/platformWebhooks.ts convex/stripe/stripePrices.ts convex/stripe/trialCheckout.ts convex/stripe/trialHelpers.ts convex/stripe/trialCron.ts` |
| `V-TRANSLATIONS-LINT` | `npx eslint convex/translations/seedStore.ts src/components/window-content/store/store-plan-cards.tsx` |

---

## Execution lanes

| Lane | Purpose | Primary ownership | Merge-overlap policy |
|---|---|---|---|
| `A` | Pricing contract freeze + source-of-truth hierarchy | `docs/reference_docs/topic_collections/implementation/store-pricing-transparency/*`; pricing spec contract files | No UI/backend implementation before lane `A` contract rows are `DONE` |
| `B` | Store shell/navigation architecture across desktop/full-screen/mobile | `src/components/window-content/store-window.tsx`; `src/components/window-content/store/*`; `src/lib/shell/url-state.ts`; `src/hooks/window-registry.tsx`; `src/app/store/page.tsx` | Avoid billing/licensing logic changes in lane `B` |
| `C` | Transparent content system + calculator | `src/components/window-content/store/*`; `src/lib/credit-pricing.ts`; new store pricing spec adapters; unit tests | No Stripe checkout behavior changes in lane `C` |
| `D` | Licensing/checkout consistency and trial alignment | `convex/licensing/*`; `convex/organizations.ts`; `convex/stripe/*`; `convex/translations/seedStore.ts` | Avoid large store shell layout rewrites in lane `D` |
| `E` | Public parity hardening, regression coverage, and closeout | cross-cutting tests + docs + release checklist | Starts only after all `P0` rows are `DONE` or `BLOCKED` |

---

## Dependency-based status flow

1. Start with lane `A` through `SPT-003`.
2. After `SPT-003`, lanes `B` and `D` may run in parallel (max one `IN_PROGRESS` per lane).
3. Lane `C` starts after `SPT-004` and `SPT-003` are `DONE`.
4. `SPT-008` starts after `SPT-007` and tax/pricing contract rules from lane `A` are complete.
5. Lane `E` starts only after all `P0` rows are `DONE` or explicitly `BLOCKED`.

---

## Task queue

| ID | Lane | Plan | Priority | Status | Depends On | Task | Primary files | Verify | Notes |
|---|---|---:|---|---|---|---|---|---|---|
| `SPT-001` | `A` | 1 | `P0` | `DONE` | - | Baseline audit of current store UX, deep-link behavior, tier naming/copy drift, and billing/trial consistency | `src/components/window-content/store-window.tsx`; `src/components/window-content/store/store-plan-cards.tsx`; `src/components/window-content/store/store-credit-section.tsx`; `src/hooks/window-registry.tsx`; `src/lib/shell/url-state.ts`; `convex/licensing/helpers.ts`; `convex/licensing/superAdmin.ts`; `convex/organizations.ts`; `convex/stripe/platformCheckout.ts`; `convex/stripe/trialCheckout.ts`; `convex/stripe/platformWebhooks.ts`; `convex/stripe/stripePrices.ts`; `convex/translations/seedStore.ts` | `V-DOCS` | Done 2026-02-19: identified deep-link prop drop for store, legacy tier drift, VAT copy mismatch, and Scale-trial backend misalignment. |
| `SPT-002` | `A` | 1 | `P0` | `DONE` | `SPT-001` | Freeze product decisions for store transparency v1 | `docs/reference_docs/topic_collections/implementation/store-pricing-transparency/MASTER_PLAN.md`; `docs/reference_docs/topic_collections/implementation/store-pricing-transparency/TASK_QUEUE.md` | `V-DOCS` | Done 2026-02-19: locked sticky mobile Jump sheet, right rail default-expanded (no persistence), `/store` public single pricing surface, calculator input set, external `Scale` naming, VAT-included presentation, and real Scale trial alignment requirement. |
| `SPT-003` | `A` | 1 | `P0` | `DONE` | `SPT-002` | Build canonical store pricing source-of-truth contract and mapping hierarchy (Stripe prices, licensing limits/features, credits math, tax/trial policy) | `docs/reference_docs/topic_collections/implementation/store-pricing-transparency/MASTER_PLAN.md`; `src/lib/credit-pricing.ts`; `convex/licensing/tierConfigs.ts`; `convex/stripe/stripePrices.ts`; `convex/stripe/platformCheckout.ts`; `convex/stripe/trialCheckout.ts`; `docs/reference_docs/billing/tax-system.md` | `V-DOCS`; `V-TYPE` | Done 2026-02-19: froze canonical source hierarchy exports and explicit `agency` (runtime) <-> `Scale` (customer-facing) mapping across store pricing, licensing, Stripe pricing/checkout/trial contract files; added store VAT contract anchor in tax docs. Verify passed: `npm run docs:guard`; `npm run typecheck`. |
| `SPT-004` | `B` | 2 | `P0` | `DONE` | `SPT-003` | Implement sectioned store shell with right-side section rail (default expanded) and mobile sticky Jump button + section sheet | `src/components/window-content/store-window.tsx`; `src/components/window-content/store/*`; `src/app/store/page.tsx`; `src/app/globals.css` | `V-TYPE`; `V-LINT`; `V-STORE-LINT` | Done 2026-02-19: converted store to sectioned scroll layout with desktop/full-screen right rail default-expanded (session-local toggle) and mobile sticky Jump-to sheet navigation. Verify passed: `npm run typecheck`; `npm run lint`; `npx eslint src/components/window-content/store-window.tsx src/components/window-content/store src/app/store/page.tsx src/lib/shell/url-state.ts src/hooks/window-registry.tsx src/components/credit-wall.tsx src/components/ui/upgrade-prompt.tsx`. |
| `SPT-005` | `B` | 2 | `P0` | `DONE` | `SPT-004` | Fix store deep-link/state parity for desktop window + full-screen store (`panel`/`section`) and prop wiring through window registry | `src/hooks/window-registry.tsx`; `src/lib/shell/url-state.ts`; `src/components/window-content/store-window.tsx`; `tests/unit/shell/url-state.test.ts` | `V-TYPE`; `V-LINT`; `V-STORE-LINT`; `V-SHELL-UNIT` | Done 2026-02-19: wired store `initialSection` through window registry with deep-link remount nonce, added `section` alias parsing/cleanup for store shell state, normalized full-screen `panel`/`section` URL parity, and expanded shell URL-state tests. Verify passed: `npm run typecheck`; `npm run lint`; `npx eslint src/components/window-content/store-window.tsx src/components/window-content/store src/app/store/page.tsx src/lib/shell/url-state.ts src/hooks/window-registry.tsx src/components/credit-wall.tsx src/components/ui/upgrade-prompt.tsx`; `npx vitest run tests/unit/shell/url-state.test.ts`. |
| `SPT-006` | `B` | 2 | `P1` | `DONE` | `SPT-004` | Responsive readability and accessibility hardening for desktop window mode, full-screen mode, and mobile mode | `src/components/window-content/store-window.tsx`; `src/components/window-content/store/*`; `src/app/store/page.tsx` | `V-TYPE`; `V-LINT`; `V-STORE-LINT` | Done 2026-02-19: improved mobile readability (responsive credit grids), added accessibility semantics (`type` on interactive buttons, billing toggle `aria-pressed`, polite live regions, labeled numeric input), and aligned full-screen store surface with shell theme tokens. Verify passed: `npm run typecheck`; `npm run lint`; `npx eslint src/components/window-content/store-window.tsx src/components/window-content/store src/app/store/page.tsx src/lib/shell/url-state.ts src/hooks/window-registry.tsx src/components/credit-wall.tsx src/components/ui/upgrade-prompt.tsx`. |
| `SPT-007` | `C` | 3 | `P0` | `DONE` | `SPT-003`, `SPT-004` | Build transparent pricing/documentation sections (plans, limits matrix, add-ons, trial policy, billing semantics, FAQ) sourced from contract | `src/components/window-content/store-window.tsx`; `src/components/window-content/store/store-plan-cards.tsx`; `convex/licensing/tierConfigs.ts`; `convex/licensing/helpers.ts` | `V-TYPE`; `V-LINT`; `V-STORE-LINT`; `V-LICENSING-LINT` | Done 2026-02-19: added contract-backed sections (`plans`, `limits`, `add-ons`, `billing`, `trial`, `faq`) plus source hierarchy rendering and active-tier-only content; updated plan footer to VAT-inclusive copy. Verify run: `npm run typecheck`; `npm run lint`; `npx eslint src/components/window-content/store-window.tsx src/components/window-content/store src/app/store/page.tsx src/lib/shell/url-state.ts src/hooks/window-registry.tsx src/components/credit-wall.tsx src/components/ui/upgrade-prompt.tsx`; `npx eslint convex/licensing/helpers.ts convex/licensing/superAdmin.ts convex/licensing/tierConfigs.ts convex/organizations.ts`. |
| `SPT-008` | `C` | 3 | `P0` | `DONE` | `SPT-007` | Ship pricing calculator v1 (plan, billing cycle, credits, Scale sub-org count, seat/user count, tax mode) with VAT-included output | `src/components/window-content/store/*`; `src/lib/credit-pricing.ts`; `convex/stripe/stripePrices.ts`; `tests/unit/store/*` | `V-TYPE`; `V-LINT`; `V-STORE-LINT`; `V-UNIT` | Done 2026-02-19: shipped calculator v1 UI + deterministic pricing engine with required inputs and VAT-inclusive source-attributed outputs; added Stripe fallback constants. Verify run: `npm run typecheck`; `npm run lint`; `npx eslint src/components/window-content/store-window.tsx src/components/window-content/store src/app/store/page.tsx src/lib/shell/url-state.ts src/hooks/window-registry.tsx src/components/credit-wall.tsx src/components/ui/upgrade-prompt.tsx`; `npm run test:unit`. |
| `SPT-009` | `C` | 3 | `P1` | `DONE` | `SPT-008` | Add deterministic calculator and pricing-parity unit coverage (credits tier math, monthly/annual math, sub-org math, VAT-inclusive totals) | `tests/unit/store/*`; `src/lib/credit-pricing.ts`; `convex/stripe/creditCheckout.ts`; calculator modules | `V-TYPE`; `V-LINT`; `V-UNIT` | Done 2026-02-19: added store calculator deterministic coverage and frontend/backend credit tier parity tests, including large-input clamps and missing-price fallback paths. Verify run: `npm run typecheck`; `npm run lint`; `npm run test:unit`. |
| `SPT-010` | `D` | 4 | `P0` | `DONE` | `SPT-003` | Remove legacy tier copy/typing drift and unify upgrade messaging to active tiers/prices | `convex/licensing/helpers.ts`; `convex/organizations.ts`; `convex/licensing/superAdmin.ts`; `convex/licensing/tierConfigs.ts` | `V-TYPE`; `V-LINT`; `V-LICENSING-LINT` | Done 2026-02-19: standardized upgrade messaging to active tiers (`Pro`, `Scale`, `Enterprise`), added `pro` support in super-admin tier unions, and normalized legacy-tier progression for prompts while preserving legacy runtime compatibility. Verify run: `npm run typecheck`; `npm run lint`; `npx eslint convex/licensing/helpers.ts convex/licensing/superAdmin.ts convex/licensing/tierConfigs.ts convex/organizations.ts`. |
| `SPT-011` | `D` | 4 | `P0` | `DONE` | `SPT-003` | Align Scale trial backend with live checkout path (real trial creation, one-trial guard, webhook/license sync, store CTA parity) | `convex/stripe/platformCheckout.ts`; `convex/stripe/trialCheckout.ts`; `convex/stripe/trialHelpers.ts`; `convex/stripe/platformWebhooks.ts`; `src/components/window-content/store-window.tsx`; `src/components/window-content/store/store-plan-cards.tsx` | `V-TYPE`; `V-LINT`; `V-STRIPE-LINT`; `V-UNIT` | Done 2026-02-19: wired one-trial Scale eligibility into `createPlatformCheckoutSession`, mapped Stripe `trialing` to license `trial` with trial dates, recorded one-time trial audit events, and made Scale CTA/trial badge backend-state driven. Verify run: `npm run typecheck`; `npm run lint`; `npx eslint convex/stripe/platformCheckout.ts convex/stripe/platformWebhooks.ts convex/stripe/stripePrices.ts convex/stripe/trialCheckout.ts convex/stripe/trialHelpers.ts convex/stripe/trialCron.ts`; `npm run test:unit`. |
| `SPT-012` | `D` | 4 | `P0` | `DONE` | `SPT-003` | Standardize VAT-included pricing copy and tax semantics across translations/store UI | `convex/translations/seedStore.ts`; `src/components/window-content/store/store-plan-cards.tsx`; `src/components/window-content/store/store-credit-section.tsx`; `docs/reference_docs/billing/tax-system.md` | `V-LINT`; `V-TRANSLATIONS-LINT`; `V-I18N` | Done 2026-02-19: replaced fixed Germany-19%-VAT subtitle copy with VAT-inclusive store wording, aligned plan/credit section copy, and updated tax contract docs with translation/footer policy. Verify run: `npm run lint`; `npx eslint convex/translations/seedStore.ts src/components/window-content/store/store-plan-cards.tsx`; `npm run i18n:audit` (fails on pre-existing cross-workstream untranslated baseline drift unrelated to lane D files). |
| `SPT-013` | `D` | 4 | `P1` | `DONE` | `SPT-010`, `SPT-011`, `SPT-012` | Normalize public naming and metadata in price resolver and store payload adapters (`Scale` display, `agency` runtime key) | `convex/stripe/stripePrices.ts`; `src/components/window-content/store/*`; pricing adapter modules | `V-TYPE`; `V-LINT`; `V-STRIPE-LINT`; `V-STORE-LINT` | Done 2026-02-19: normalized store checkout/deep-link tier input to public `scale`, kept runtime metadata tier as `agency` for backward compatibility, added `publicTier` metadata aliases, and added additive `public` aliases in Stripe price payloads. Verify run: `npm run typecheck` (fails on pre-existing unrelated type errors in `convex/ai/*` and `convex/integrations/openclawBridge.ts`); `npm run lint`; `npx eslint convex/stripe/platformCheckout.ts convex/stripe/platformWebhooks.ts convex/stripe/stripePrices.ts convex/stripe/trialCheckout.ts convex/stripe/trialHelpers.ts convex/stripe/trialCron.ts`; `npx eslint src/components/window-content/store-window.tsx src/components/window-content/store src/app/store/page.tsx src/lib/shell/url-state.ts src/hooks/window-registry.tsx src/components/credit-wall.tsx src/components/ui/upgrade-prompt.tsx`. |
| `SPT-014` | `E` | 5 | `P0` | `DONE` | `SPT-005`, `SPT-008`, `SPT-011`, `SPT-012` | End-to-end parity hardening for public `/store` in desktop window/full-screen/mobile + login-return flows | `src/app/store/page.tsx`; `src/components/window-content/store-window.tsx`; `src/components/credit-wall.tsx`; `src/components/ui/upgrade-prompt.tsx`; `src/hooks/window-registry.tsx`; `tests/unit/shell/url-state.test.ts` | `V-TYPE`; `V-LINT`; `V-UNIT`; `V-SHELL-UNIT`; `V-STORE-LINT` | Done 2026-02-19: centralized store auth-return URL generation in shell URL-state helpers, added deterministic login-return/deep-link unit coverage, extended desktop/mobile e2e parity checks for public full-screen `/store`, and hardened section-sync logic so deep-linked sections remain canonical during initial mobile/full-screen hydration. Verify run: `npm run typecheck`; `npm run lint`; `npm run test:unit`; `npx vitest run tests/unit/shell/url-state.test.ts`; `npx eslint src/components/window-content/store-window.tsx src/components/window-content/store src/app/store/page.tsx src/lib/shell/url-state.ts src/hooks/window-registry.tsx src/components/credit-wall.tsx src/components/ui/upgrade-prompt.tsx`; parity checks: `npm run test:e2e:desktop`; `npm run test:e2e:mobile`. |
| `SPT-015` | `E` | 5 | `P1` | `DONE` | `SPT-014` | Final closeout: docs sync, rollout checklist, and queue reconciliation | `docs/reference_docs/topic_collections/implementation/store-pricing-transparency/*` | `V-DOCS` | Done 2026-02-19: synced queue/master/index closeout and documented deployment + rollback notes for Scale trial enforcement and naming/VAT copy contracts. Verify run: `npm run docs:guard`. |

---

## Current kickoff

- Active task: none.
- Next task to execute: none (lane `E` complete).
- Immediate objective: workstream closeout complete; monitor post-release parity and guardrails.
