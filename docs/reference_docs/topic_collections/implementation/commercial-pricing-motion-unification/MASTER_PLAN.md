# Commercial Pricing Motion Unification Master Plan

**Date:** 2026-03-01  
**Scope:** Align Store, Landing, Chat, Samantha, and Stripe execution with corrected commercial motion while preserving coexistence-safe checkout/credits/backoffice behavior.

---

## Canonical business corrections (locked)

1. Implementation starts at `€7,000+`.
2. `€3,500` is consulting-only strategy/scope and includes no production implementation.
3. Free is a lead-gen/qualification diagnostic motion, not a permanent paid-product tier.
4. Legacy `Pro/Scale` must be removed or hidden from public-facing sales surfaces while backend compatibility is preserved during coexistence and rollback windows.

---

## Canonical motion contract (v2)

| Motion | Offer intent | Price anchor | Delivery contract |
|---|---|---:|---|
| `A` | Free Diagnostic | `€0` | Lead-gen qualification only; no durable paid entitlements implied. |
| `B` | Consulting Sprint | `€3,500` | Strategy/scope-only; no implementation included. |
| `C` | Implementation Start | `€7,000+` | First implementation motion (`layer1_foundation` and above). |

Enforcement rules:

1. No public copy can frame `€3,500` as implementation start.
2. Any implementation CTA below `€7,000` is invalid.
3. Free-language must point to diagnostic/intake qualification.

---

## Metadata + telemetry contract (must preserve)

All funnel and checkout paths must preserve and/or emit:

1. `offer_code`
2. `intent_code`
3. `surface`
4. `routing_hint`
5. campaign attribution keys: `source`, `medium`, `campaign`, `content`, `term`, `referrer`, `landingPath`

Compatibility note:

- Existing camelCase aliases remain additive compatibility fields during coexistence (`offerCode`, `intentCode`, `routingHint`, `utmSource`, `utmMedium`, `utmCampaign`, `utmContent`, `utmTerm`, `funnelReferrer`, `funnelLandingPath`).

---

## Codebase reality audit (2026-03-01)

### Gap matrix (file-grounded)

| Domain | Evidence | Current reality | Gap | Queue mapping |
|---|---|---|---|---|
| Store shell copy | `src/components/window-content/store-window.tsx:59`, `src/components/window-content/store-window.tsx:269`, `src/components/window-content/store-window.tsx:279`, `src/components/window-content/store-window.tsx:294`, `src/components/window-content/store-window.tsx:1150` | Store still describes Free/Pro/Scale/Enterprise plans and Pro/Scale trial policy in section-level copy. | Public motion not yet aligned to Diagnostic/Consulting/Implementation framing. | `CPMU-006` |
| Store plan cards | `src/components/window-content/store/store-plan-cards.tsx:57`, `src/components/window-content/store/store-plan-cards.tsx:77`, `src/components/window-content/store/store-plan-cards.tsx:101`, `src/components/window-content/store/store-plan-cards.tsx:206` | Legacy Free/Pro/Scale cards are still first-class UI with trial/subscription CTAs. | Legacy plans still public-facing on Store sales surface; hide/de-emphasize required. | `CPMU-006`, `CPMU-013` |
| Store transparency/trial references | `src/components/window-content/store/store-pricing-reference.tsx:344`, `src/components/window-content/store/store-pricing-reference.tsx:500`, `src/components/window-content/store/store-pricing-reference.tsx:533` | Trial and feature matrix still centers Pro/Scale semantics. | Public transparency view still anchored on legacy tiers instead of corrected three-motion narrative. | `CPMU-006` |
| Store pricing contract snapshot | `src/lib/store-pricing-contract.ts:104`, `src/lib/store-pricing-contract.ts:114`, `src/lib/store-pricing-contract.ts:152`, `src/lib/store-pricing-contract.ts:190`, `src/lib/store-pricing-contract.ts:317` | Canonical snapshot still defines active public tiers as `free/pro/scale/enterprise`. | Needs motion-aware presentation layer and coexistence-safe visibility policy (backend remains intact). | `CPMU-006`, `CPMU-013` |
| Shared migration contract | `src/lib/credit-pricing.ts:40` | Coexistence/rollback constants are present and preserve legacy offers. | No explicit diagnostic offer in shared migration constants; acceptable for now but requires front-end contract enforcement. | `CPMU-006`, `CPMU-012` |
| Commercial offer catalog pricing | `convex/stripe/stripePrices.ts:142`, `convex/stripe/stripePrices.ts:145`, `convex/stripe/stripePrices.ts:150`, `convex/stripe/stripePrices.ts:153`, `convex/stripe/stripePrices.ts:158` | Catalog already supports `consult_done_with_you=€3,500` and `layer1_foundation=€7,000`; legacy subscription offers still included for coexistence. | Labeling and motion semantics must explicitly enforce consulting-only vs implementation start in surfaces and Samantha behavior. | `CPMU-006`, `CPMU-008`, `CPMU-010` |
| Checkout metadata continuity | `convex/stripe/platformCheckout.ts:126`, `convex/stripe/platformCheckout.ts:129`, `convex/stripe/platformCheckout.ts:131`, `convex/stripe/platformCheckout.ts:132`, `convex/stripe/platformCheckout.ts:134`, `convex/stripe/platformCheckout.ts:136` | Checkout builder emits canonical + compatibility metadata and campaign fields. | Core metadata contract is implemented; must be preserved while front-end handoffs are corrected. | Preserve via `CPMU-007`, `CPMU-009`, `CPMU-012` |
| Webhook metadata extraction | `convex/stripe/platformWebhooks.ts:116`, `convex/stripe/platformWebhooks.ts:122`, `convex/stripe/platformWebhooks.ts:222`, `convex/stripe/platformWebhooks.ts:225`, `convex/stripe/platformWebhooks.ts:353`, `convex/stripe/platformWebhooks.ts:357` | Webhooks read canonical + compatibility metadata and emit funnel telemetry fields. | Contract is present; regression risk is upstream handoff using non-canonical landing params. | Preserve via `CPMU-009`, `CPMU-012` |
| Credit checkout tagging | `convex/stripe/creditCheckout.ts:281`, `convex/stripe/creditCheckout.ts:283`, `convex/stripe/creditCheckout.ts:284`, `convex/stripe/creditCheckout.ts:285`, `convex/stripe/creditCheckout.ts:292`, `convex/stripe/creditCheckout.ts:298` | Credit checkout already tags `offer_code`, `intent_code`, `surface`, `routing_hint` and campaign aliases. | No immediate metadata gap; must remain untouched during motion-copy updates. | Preserve via `CPMU-012` |
| Store translation source | `convex/translations/seedStore.ts:801`, `convex/translations/seedStore.ts:812` | Copy acknowledges coexistence and active legacy subscriptions. | Needs corrected diagnostic/consulting/implementation wording and public legacy de-emphasis language. | `CPMU-006` |
| Landing public pricing copy | `apps/one-of-one-landing/app/page.tsx:52`, `apps/one-of-one-landing/app/page.tsx:55`, `apps/one-of-one-landing/app/page.tsx:58`, `apps/one-of-one-landing/app/page.tsx:114`, `apps/one-of-one-landing/app/page.tsx:117`, `apps/one-of-one-landing/app/page.tsx:120` | Landing says "Start Free", "€3,500 to start", and "Projects from €7,000". | `€3,500 to start` implies implementation entry and conflicts with corrected contract. | `CPMU-008` |
| Landing handoff URL contract | `apps/one-of-one-landing/lib/handoff.ts:183`, `apps/one-of-one-landing/lib/handoff.ts:190`, `apps/one-of-one-landing/lib/handoff.ts:197` | Handoff links use `handoff=one-of-one&intent=resume|done-with-you|full-build`. | Missing canonical `offer_code`, `intent_code`, `surface`, `routing_hint` envelope. | `CPMU-009` |
| Chat entry ingestion | `src/app/chat/page.tsx:12`, `src/app/chat/page.tsx:15` | `/chat` route is a thin wrapper that does not parse handoff params. | Deterministic landing-intent bridge into chat is missing at route level. | `CPMU-009` |
| Homepage attribution capture | `src/app/page.tsx:975`, `src/app/page.tsx:979`, `src/app/page.tsx:982`, `src/app/page.tsx:988`, `src/app/page.tsx:997`, `src/app/page.tsx:1086` | Home page persists canonical commercial intent + campaign attribution and cleans URL keys after capture. | Contract exists; landing must emit canonical keys so this ingestion path receives useful values. | `CPMU-009`, `CPMU-012` |

---

## Migration and rollback gates (measurable)

`CPMU-012` defines and validates these gates before `CPMU-013` cutover:

1. **Metadata completeness gate:** `offer_code`, `intent_code`, `surface`, `routing_hint`, and campaign envelope present on `>=99.5%` of commercial CTA->checkout->webhook events in validation sample.
2. **Checkout health gate:** no statistically significant increase in checkout failures vs coexistence baseline (same event cohorts, same time window).
3. **Credits continuity gate:** zero unintended credit balance drift in sampled organizations during rehearsal rollback.
4. **Subscriber continuity gate:** existing Pro/Scale subscribers retain renewal and plan-management capability with no entitlement loss.
5. **Rollback rehearsal gate:** one complete simulated rollback from hidden-legacy public surface to coexistence baseline executed and documented with deterministic steps and timings.

Rollback trigger examples:

1. Metadata completeness below threshold for two consecutive validation windows.
2. Any confirmed entitlement regression for active legacy subscribers.
3. Any blocked backoffice path for billing/credits operations in rehearsal cohort.

### CPMU-012 validation snapshot (2026-03-02)

1. Added deterministic gate evaluator with locked thresholds in `src/lib/commercial-migration-gates.ts`:
   - metadata completeness `>=0.995`,
   - checkout failure-rate delta `<=0`,
   - credit drift/backoffice incidents/subscriber incidents all `0`.
2. Added rehearsal-safe rollback checker in `src/lib/commercial-migration-gates.ts` requiring:
   - coexistence preserved,
   - rollback completed inside bounded window,
   - all deterministic rollback steps completed.
3. Preserved metadata continuity by exposing additive extraction helpers in `convex/stripe/platformWebhooks.ts` and keeping checkout metadata writer contract in `convex/stripe/platformCheckout.ts`.
4. Validated with new unit evidence:
   - `tests/unit/store/commercial-migration-gates.test.ts`,
   - `tests/unit/stripe/commercialMetadataEnvelope.test.ts`.
5. Required verify commands completed for row closeout:
   - `npm run docs:guard`,
   - `npm run typecheck`,
   - `npm run lint` (warnings-only baseline, no errors),
   - `npm run test:unit`.

### CPMU-013 cutover snapshot (2026-03-02)

1. Added controlled public legacy visibility toggle contract in `src/lib/commercial-cutover.ts`:
   - `compatibility`,
   - `cutover_hide_legacy`,
   - `rollback_show_legacy_public`.
2. Wired Store cutover rendering to deterministic mode resolution in:
   - `src/components/window-content/store-window.tsx`,
   - `src/components/window-content/store/store-plan-cards.tsx`.
3. Added landing telemetry parity via `data-legacy-cutover-mode` in `apps/one-of-one-landing/app/page.tsx`.
4. Published operator runbook and rollback trigger thresholds in:
   - `docs/reference_docs/topic_collections/implementation/commercial-pricing-motion-unification/CPMU_013_CUTOVER_RUNBOOK.md`.
5. Required verify commands completed for row closeout:
   - `npm run typecheck`,
   - `npm run lint` (warnings-only baseline, no errors),
   - `npm run docs:guard`.

---

## Lane/phase map

| Phase | Objective | Queue lanes | Queue tasks |
|---|---|---|---|
| Phase 1 | Baseline + corrected contract freeze | `A` | `CPMU-001`..`CPMU-005` |
| Phase 2 | Store correction and CTA contract | `C` | `CPMU-006`..`CPMU-007` |
| Phase 3 | Landing correction and handoff normalization | `D` | `CPMU-008`..`CPMU-009` |
| Phase 4 | Samantha + intake behavior alignment | `E` | `CPMU-010`..`CPMU-011` |
| Phase 5 | Measured gates, rollback rehearsal, cutover control | `F` | `CPMU-012`..`CPMU-013` |

---

## Acceptance criteria

1. Public surfaces consistently express Free Diagnostic, `€3,500` consulting-only, and `€7,000+` implementation start.
2. No public sales path presents legacy Pro/Scale as primary offer during cutover-ready state.
3. Legacy backend checkout/subscription/credits/backoffice paths remain functional throughout coexistence.
4. CTA intent/attribution contract remains continuous from funnel to checkout to webhook telemetry.
5. Migration and rollback decisions are gate-based and measurable, not ad-hoc.

---

## Immediate next step

Queue execution complete through `CPMU-013`. Continue monitoring gate windows and keep rollback mode (`rollback_show_legacy_public`) ready for any threshold breach.
