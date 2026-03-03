# Commercial Pricing Motion Unification Task Queue

**Last updated:** 2026-03-02  
**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/commercial-pricing-motion-unification`  
**Source request:** Corrected commercial motion alignment and codebase-reality audit across Store, Landing, Chat, Samantha, and Stripe coexistence paths.

---

## Queue rules

1. Allowed statuses are only: `READY`, `IN_PROGRESS`, `PENDING`, `BLOCKED`, `DONE`.
2. Only one task may be `IN_PROGRESS` globally unless lane policy explicitly allows overlap.
3. Promote a task from `PENDING` to `READY` only when all dependencies are `DONE`.
4. Deterministic pick order is `P0` before `P1`, then lowest task ID.
5. If blocked, capture blocker in `Notes`, set status `BLOCKED`, and continue with next `READY` row.
6. Every task must execute listed `Verify` commands before moving to `DONE`.
7. `€3,500` is consulting-only strategy/scope; no production implementation may be implied.
8. First implementation motion starts at `€7,000+` (`layer1_foundation` and above).
9. "Free" is lead-gen diagnostic only; no durable paid entitlements may be implied by Free messaging.
10. Remove/hide legacy `Pro/Scale` from public-facing sales surfaces while preserving backend coexistence/rollback compatibility.
11. CTA payload contract must preserve `offer_code`, `intent_code`, `surface`, `routing_hint`, `source`, `medium`, `campaign`, `content`, `term`, `referrer`, `landingPath`.
12. Sync `INDEX.md`, `MASTER_PLAN.md`, `TASK_QUEUE.md`, and `SESSION_PROMPTS.md` at lane milestones.

---

## Verification profiles

| Profile | Command |
|---|---|
| `V-DOCS` | `npm run docs:guard` |
| `V-TYPE` | `npm run typecheck` |
| `V-LINT` | `npm run lint` |
| `V-UNIT` | `npm run test:unit` |
| `V-STORE-LINT` | `npx eslint src/components/window-content/store-window.tsx src/components/window-content/store/store-plan-cards.tsx src/components/window-content/store/store-pricing-reference.tsx src/lib/store-pricing-contract.ts src/lib/credit-pricing.ts` |
| `V-LANDING-LINT` | `npx eslint apps/one-of-one-landing/app/page.tsx apps/one-of-one-landing/components/handoff-cta.tsx apps/one-of-one-landing/components/audit-chat-surface.tsx apps/one-of-one-landing/lib/handoff.ts apps/one-of-one-landing/lib/audit-chat-client.ts` |
| `V-STRIPE-LINT` | `npx eslint convex/stripe/platformCheckout.ts convex/stripe/stripePrices.ts convex/stripe/platformWebhooks.ts convex/stripe/creditCheckout.ts` |
| `V-ONBOARDING-LINT` | `npx eslint convex/onboarding/seedPlatformAgents.ts convex/ai/tools/interviewTools.ts src/components/window-content/ai-chat-window/index.tsx src/app/chat/page.tsx src/app/page.tsx` |

---

## Execution lanes

| Lane | Purpose | Primary ownership | Merge-overlap policy |
|---|---|---|---|
| `A` | Canonical commercial contract freeze + corrections | Workstream docs; `src/lib/*`; `convex/stripe/*` contracts | No Store/Landing/Chat implementation before lane `A` `P0` rows are `DONE` |
| `B` | Stripe packaging + coexistence compatibility | `convex/stripe/*`; checkout/webhook metadata paths | Avoid Store/Landing copy edits in lane `B` |
| `C` | Platform Store commercialization surface correction | `src/components/window-content/store*`; `convex/translations/seedStore.ts` | Preserve legacy checkout/entitlements while hiding legacy public sales positioning |
| `D` | One-of-one landing commercialization correction | `apps/one-of-one-landing/*` | No Stripe schema changes in lane `D` |
| `E` | Samantha routing + intent contract alignment | onboarding/chat routing surfaces | Starts after lane `C` and lane `D` `P0` rows are `DONE` |
| `F` | Migration gates, rollback rehearsal, cutover closeout | cross-cutting docs + smoke validations | Starts after all prior `P0` rows are `DONE` or `BLOCKED` |

---

## Dependency-based status flow

1. Execute lane `A` first (`CPMU-001`..`CPMU-003`, `CPMU-005`).
2. Lane `B` starts after `CPMU-003`.
3. Lane `C` starts after `CPMU-003` and `CPMU-005`.
4. Lane `D` starts after `CPMU-006` to keep public parity with corrected Store motion.
5. Lane `E` starts after `CPMU-007` and `CPMU-009` are `DONE`.
6. Lane `F` starts after all earlier `P0` rows are `DONE` or `BLOCKED`.

---

## Task queue

| ID | Lane | Plan | Priority | Status | Depends On | Task | Primary files | Verify | Notes |
|---|---|---:|---|---|---|---|---|---|---|
| `CPMU-001` | `A` | 1 | `P0` | `DONE` | - | Audit strategy vs runtime commercialization reality and publish mismatch matrix | `docs/strategy/cash-is-king/01_PRICING_LADDER.md`; `src/components/window-content/store-window.tsx`; `apps/one-of-one-landing/app/page.tsx`; `convex/stripe/stripePrices.ts`; `convex/stripe/platformCheckout.ts` | `V-DOCS` | Completed 2026-02-28 baseline audit. |
| `CPMU-002` | `A` | 1 | `P0` | `DONE` | `CPMU-001` | Freeze canonical commercial contract v1 and metadata dictionary | `docs/reference_docs/topic_collections/implementation/commercial-pricing-motion-unification/MASTER_PLAN.md`; `docs/reference_docs/topic_collections/implementation/commercial-pricing-motion-unification/TASK_QUEUE.md` | `V-DOCS` | Completed 2026-02-28. Superseded by 2026-03-01 correction constraints in this queue/plan. |
| `CPMU-003` | `A` | 1 | `P0` | `DONE` | `CPMU-002` | Freeze coexistence migration + rollback invariants for legacy Pro/Scale and credits | `src/lib/store-pricing-contract.ts`; `src/lib/credit-pricing.ts`; `convex/stripe/stripePrices.ts`; workstream docs | `V-DOCS`; `V-TYPE` | Completed 2026-02-28. Preserve invariants during all new changes. |
| `CPMU-004` | `B` | 2 | `P0` | `DONE` | `CPMU-003` | Additive Stripe catalog + checkout path for layer/consult motions with coexistence-safe behavior | `convex/stripe/stripePrices.ts`; `convex/stripe/platformCheckout.ts`; `convex/stripe/platformWebhooks.ts`; `convex/stripe/creditCheckout.ts` | `V-TYPE`; `V-LINT`; `V-STRIPE-LINT` | Completed 2026-02-28. |
| `CPMU-005` | `A` | 1 | `P0` | `DONE` | `CPMU-004` | Preserve attribution + intent metadata continuity across checkout, webhooks, and homepage ingestion | `convex/stripe/platformCheckout.ts`; `convex/stripe/platformWebhooks.ts`; `src/app/page.tsx` | `V-TYPE`; `V-LINT`; `V-STRIPE-LINT` | Completed 2026-02-28 and remains mandatory compatibility contract. |
| `CPMU-006` | `C` | 3 | `P0` | `DONE` | `CPMU-003`, `CPMU-005` | Rescope Store public sales motion: reposition Free as Diagnostic lead-gen only; split `€3,500` consulting-only scope from `€7,000+` implementation start; de-emphasize/hide legacy Pro/Scale sales cards while preserving existing subscriber management and checkout compatibility | `src/components/window-content/store-window.tsx`; `src/components/window-content/store/store-plan-cards.tsx`; `src/components/window-content/store/store-pricing-reference.tsx`; `src/lib/store-pricing-contract.ts`; `convex/translations/seedStore.ts` | `V-TYPE`; `V-LINT`; `V-STORE-LINT`; `V-UNIT` | Completed 2026-03-02. Store motion/legacy visibility changes already present in workspace; this pass added missing `ui.store.commercial_architecture.*_v2` seed keys and verified required checks. |
| `CPMU-007` | `C` | 3 | `P0` | `DONE` | `CPMU-006` | Implement deterministic Store CTA routing contract for Diagnostic/Consulting/Implementation (`offer_code`, `intent_code`, `surface=store`, `routing_hint`) and preserve campaign attribution through handoff | `src/components/window-content/store-window.tsx`; `src/components/window-content/store/store-pricing-reference.tsx`; `src/app/page.tsx`; `convex/stripe/platformCheckout.ts` | `V-TYPE`; `V-LINT`; `V-STORE-LINT`; `V-STRIPE-LINT` | Completed 2026-03-02. Wired Store commercial offer CTAs to deterministic chat/checkout routing, added canonical campaign keys (`source`/`medium`/`campaign`/`content`/`term`) plus existing UTM aliases, and preserved `offer_code`/`intent_code`/`surface=store`/`routing_hint` through handoff + checkout metadata. |
| `CPMU-008` | `D` | 4 | `P0` | `DONE` | `CPMU-006` | Update one-of-one landing messaging to corrected three-motion contract: Free Diagnostic lead-gen, Consulting Sprint `€3,500` scope-only, Implementation Start `€7,000+` | `apps/one-of-one-landing/app/page.tsx`; `apps/one-of-one-landing/components/handoff-cta.tsx`; `apps/one-of-one-landing/app/globals.css` | `V-TYPE`; `V-LINT`; `V-LANDING-LINT` | Completed 2026-03-02. Updated landing motion labels/prices/guards (`Free Diagnostic`, `Consulting Sprint €3,500 scope-only`, `Implementation Start €7,000+`) in page + handoff CTA + landing locale content and added explicit scope-only/implementation contract note styling; verified `npm run typecheck`, `npm run lint`, and landing eslint command. |
| `CPMU-009` | `D` | 4 | `P0` | `DONE` | `CPMU-008` | Replace legacy `handoff`/`intent` URL shape with canonical contract (`offer_code`, `intent_code`, `surface`, `routing_hint`) while preserving UTM/referrer/landingPath continuity into `/chat` and stored onboarding attribution | `apps/one-of-one-landing/lib/handoff.ts`; `apps/one-of-one-landing/components/handoff-cta.tsx`; `src/app/chat/page.tsx`; `src/app/page.tsx` | `V-TYPE`; `V-LINT`; `V-LANDING-LINT`; `V-ONBOARDING-LINT` | Completed 2026-03-02. Landing handoff links now emit canonical `offer_code`/`intent_code`/`surface=one_of_one_landing`/`routing_hint` plus coexistence bridge `handoff`/`intent` + camelCase aliases; `/chat` now persists onboarding attribution/commercial intent for direct handoffs; homepage ingestion now maps legacy handoff intents to canonical commercial intent. Verified `npm run typecheck`, `npm run lint`, landing lint command, and onboarding lint command. |
| `CPMU-010` | `E` | 5 | `P0` | `DONE` | `CPMU-007`, `CPMU-009` | Extend Samantha/intake playbooks for new motion contract: diagnostic qualification, consulting scope-only discovery, implementation readiness at `€7,000+` with explicit non-implementation guard for consulting sprint | `convex/onboarding/seedPlatformAgents.ts`; `convex/ai/tools/interviewTools.ts`; `src/components/window-content/ai-chat-window/index.tsx` | `V-TYPE`; `V-LINT`; `V-ONBOARDING-LINT`; `V-UNIT` | Completed 2026-03-02. Added explicit three-motion contract + intent-code routing guardrails to Samantha lead-capture seed prompt, added `/chat` landing-commercial-intent kickoff routing in AI chat bootstrap, and updated deliverable/handoff tool copy to enforce `€3,500` consulting scope-only vs `€7,000+` implementation start. Verified `npm run typecheck`, `npm run lint`, `npm run test:unit`, and onboarding lint command. |
| `CPMU-011` | `E` | 5 | `P1` | `DONE` | `CPMU-010` | Align CRM/lead payload tags and Samantha handoff summaries to canonical commercial intent fields and campaign envelope | `convex/onboarding/*`; chat/lead capture backend files | `V-TYPE`; `V-LINT`; `V-UNIT` | Completed 2026-03-02. Added additive lead payload tag normalization in `convex/ai/tools/interviewTools.ts` with canonical + compatibility aliases for commercial intent and campaign envelope; enriched Samantha commercial kickoff summary in `src/components/window-content/ai-chat-window/index.tsx` to include canonical + compatibility keys; reinforced Samantha seed prompt tagging contract in `convex/onboarding/seedPlatformAgents.ts`. Verified `npm run typecheck`, `npm run lint` (warnings-only baseline), and `npm run test:unit`. |
| `CPMU-012` | `F` | 6 | `P0` | `DONE` | `CPMU-007`, `CPMU-009`, `CPMU-010` | Define and validate measurable migration/rollback gates (public-surface parity, metadata completeness, checkout health, credits/backoffice continuity); execute rollback rehearsal | `docs/reference_docs/topic_collections/implementation/commercial-pricing-motion-unification/MASTER_PLAN.md`; `convex/stripe/platformCheckout.ts`; `convex/stripe/platformWebhooks.ts`; `src/app/page.tsx` | `V-TYPE`; `V-LINT`; `V-UNIT`; `V-DOCS` | Completed 2026-03-02 with additive gate/rehearsal checks in `src/lib/commercial-migration-gates.ts`, metadata continuity extraction helper in `convex/stripe/platformWebhooks.ts`, and continuity tests in `tests/unit/store/commercial-migration-gates.test.ts` + `tests/unit/stripe/commercialMetadataEnvelope.test.ts`. Verified `npm run docs:guard`, `npm run typecheck`, `npm run lint` (warnings-only baseline), and `npm run test:unit`. Rollout risks tracked: metadata envelope drops, checkout regression, credits/subscriber/backoffice continuity regressions. |
| `CPMU-013` | `F` | 6 | `P0` | `DONE` | `CPMU-012` | Controlled cutover of public legacy Pro/Scale visibility toggles with documented rollback trigger thresholds and operator runbook | `src/components/window-content/store-window.tsx`; `src/components/window-content/store/store-plan-cards.tsx`; `apps/one-of-one-landing/app/page.tsx`; workstream docs | `V-TYPE`; `V-LINT`; `V-DOCS` | Completed 2026-03-02. Added deterministic cutover mode contract (`compatibility`, `cutover_hide_legacy`, `rollback_show_legacy_public`) in `src/lib/commercial-cutover.ts`, wired Store/landing visibility handling in `src/components/window-content/store-window.tsx`, `src/components/window-content/store/store-plan-cards.tsx`, and `apps/one-of-one-landing/app/page.tsx`, and documented operator thresholds/runbook in `CPMU_013_CUTOVER_RUNBOOK.md`. Verified `npm run typecheck`, `npm run lint` (warnings-only baseline), and `npm run docs:guard`. |

---

## Current kickoff

- Active task: none (`IN_PROGRESS` not set).
- Next promotable task: none (all CPMU rows complete).
- Immediate objective: monitor CPMU gate metrics and keep rollback toggle ready if continuity thresholds are breached.
