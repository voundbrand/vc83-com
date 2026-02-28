# Credits System & User Support Interface Task Queue

**Last updated:** 2026-02-22  
**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/credits-system-user-support-interface`  
**Source request:** Implement a unified top-right credits counter experience with gifted/monthly/purchased credit buckets, code redemption, platform-level referrals, feedback capture, and AI-assisted support escalation.

---

## Queue rules

1. Allowed statuses are only: `READY`, `IN_PROGRESS`, `PENDING`, `BLOCKED`, `DONE`.
2. Only one task may be `IN_PROGRESS` globally unless lane policy explicitly allows overlap.
3. Promote `PENDING` to `READY` only when all dependencies are `DONE`.
4. Deterministic pick order is `P0` before `P1`, then lowest task ID.
5. If blocked, capture blocker details in `Notes` and continue with next `READY` task.
6. Every task must run row `Verify` commands before moving to `DONE`.
7. Referral logic must route through platform organization configuration, never hardcoded org IDs.
8. Manifest-like payload generation (codes, referral rewards, support ticket metadata) must stay typed and deterministic.
9. Sync `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/credits-system-user-support-interface/INDEX.md`, `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/credits-system-user-support-interface/MASTER_PLAN.md`, `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/credits-system-user-support-interface/TASK_QUEUE.md`, and `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/credits-system-user-support-interface/SESSION_PROMPTS.md` at lane milestones.
10. Internationalization for this workstream must ship with six-locale parity: `en`, `de`, `pl`, `es`, `fr`, `ja`.

---

## Verification profiles

| Profile | Command |
|---|---|
| `V-TYPE` | `npm run typecheck` |
| `V-LINT` | `npm run lint` |
| `V-UNIT` | `npm run test:unit` |
| `V-INTEG` | `npm run test:integration` |
| `V-MODEL` | `npm run test:model` |
| `V-E2E-DESKTOP` | `npm run test:e2e:desktop` |
| `V-E2E-MOBILE` | `npm run test:e2e:mobile` |
| `V-I18N` | `npm run i18n:audit` |
| `V-ROLES` | `npm run test:roles` |
| `V-PERM` | `npm run test:permissions` |
| `V-DOCS` | `npm run docs:guard` |

---

## Execution lanes

| Lane | Purpose | Primary ownership | Merge-overlap policy |
|---|---|---|---|
| `A` | Credit ledger contract and personal-scope bucket expansion | `convex/schemas/creditSchemas.ts`; `convex/credits/index.ts`; workstream docs | No UI implementation before lane `A` `P0` rows are `DONE` |
| `B` | Redemption code system and super-admin controls | `convex/credits/*`; `convex/http.ts`; super-admin surfaces | No public redeem UI before code policy/rate-limit contract is enforced |
| `C` | Top-right credits counter/dropdown and purchase/redeem/refer entry points | `src/app/page.tsx`; taskbar/nav components; credits widgets | Must preserve avatar menu behavior and mobile shell parity |
| `D` | Platform-reusable referral architecture and payout logic | benefits/referrals services + Stripe webhook attribution | Must enforce monthly cap and anti-fraud gates before UI promotion |
| `E` | Feedback modal redesign + support intake surface | `src/components/window-content/feedback-window.tsx`; support surfaces; feedback actions | Support contact route must point to support channel, not sales channel |
| `F` | AI support agent runtime and human escalation workflow | `convex/ai/*`; support chat endpoints; ticket integration | No autonomous escalation without auditable ticket creation path |
| `G` | Localization, security hardening, analytics, migration/rollback closeout | translations + telemetry + runbook docs | Starts after all prior `P0` rows are `DONE` or explicitly `BLOCKED` |

---

## Dependency-based status flow

1. Lane `A` starts first to lock credit bucket semantics and personal-scope policy.
2. Lane `B` starts after `CSI-002` so redemption writes use finalized ledger semantics.
3. Lane `C` starts after `CSI-003` and `CSI-005` to avoid UI wiring to unstable APIs.
4. Lane `D` starts after lane `A` `P0` and feeds referral entry points for lane `C`.
5. Lane `E` starts after lane `C` core modal wiring (`CSI-008`) to reuse UI primitives.
6. Lane `F` starts after `CSI-015` so AI support begins from a deterministic intake flow.
7. Lane `G` starts when all remaining `P0` rows are `DONE` or explicitly `BLOCKED`.

---

## Task queue

| ID | Lane | Plan | Priority | Status | Depends On | Task | Primary files | Verify | Notes |
|---|---|---:|---|---|---|---|---|---|---|
| `CSI-001` | `A` | 1 | `P0` | `DONE` | - | Lock canonical credit bucket contract (`gifted`, `monthly`, `purchased`) and document personal-vs-org scope behavior with deterministic consumption order | `/Users/foundbrand_001/Development/vc83-com/convex/schemas/creditSchemas.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/schema.ts`; `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/credits-system-user-support-interface/MASTER_PLAN.md` | `V-TYPE`; `V-DOCS` | Added gifted-compatible schema fields, scope metadata, and documented canonical gifted->monthly->purchased contract with legacy bridge. |
| `CSI-002` | `A` | 1 | `P0` | `DONE` | `CSI-001` | Implement ledger/idempotency primitives for gifted credits, monthly allocation, and purchase writes; include explicit expiry policy and immutable transaction reasons | `/Users/foundbrand_001/Development/vc83-com/convex/credits/index.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/schemas/creditSchemas.ts`; `/Users/foundbrand_001/Development/vc83-com/tests/unit` | `V-TYPE`; `V-LINT`; `V-UNIT`; `V-DOCS` | Added idempotent gifted/monthly/purchased writes, immutable reason taxonomy usage, scope checks, and deterministic helper coverage. |
| `CSI-003` | `A` | 1 | `P1` | `DONE` | `CSI-002` | Add/standardize credits API contracts for balance breakdown and history (`GET /api/credits/balance`, `GET /api/credits/history`) with deterministic envelope schemas | `/Users/foundbrand_001/Development/vc83-com/convex/http.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/credits/index.ts`; `/Users/foundbrand_001/Development/vc83-com/tests/integration` | `V-TYPE`; `V-LINT`; `V-UNIT`; `V-INTEG`; `V-DOCS` | Added canonical envelope queries, deterministic history ordering, and authenticated `/api/credits/*` routes with fixed three-bucket payload shape. |
| `CSI-004` | `B` | 2 | `P0` | `DONE` | `CSI-002` | Implement redemption code schema/services with expiration, usage caps, and targeting restrictions (tiers, users, orgs) | `/Users/foundbrand_001/Development/vc83-com/convex/schema.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/credits`; `/Users/foundbrand_001/Development/vc83-com/tests/unit` | `V-TYPE`; `V-LINT`; `V-UNIT`; `V-DOCS` | Added `creditRedemptionCodes` + `creditCodeRedemptions` schema tables, lifecycle state resolver, targeting policy evaluator, and super-admin-gated create/revoke/list services. |
| `CSI-005` | `B` | 2 | `P0` | `DONE` | `CSI-004` | Ship redeem endpoint (`POST /api/credits/redeem`) with rate limits, eligibility checks, single-use enforcement, and gifted-credit ledger writes | `/Users/foundbrand_001/Development/vc83-com/convex/http.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/credits/index.ts`; `/Users/foundbrand_001/Development/vc83-com/tests/integration` | `V-TYPE`; `V-LINT`; `V-UNIT`; `V-INTEG`; `V-DOCS` | Added `/api/credits/redeem` with auth + user-based throttling, ambiguous-claim rejection, fail-closed error mapping, per-user single-use guard, cap/expiry/target enforcement, and gifted ledger write integration. |
| `CSI-006` | `B` | 2 | `P1` | `DONE` | `CSI-005` | Add super-admin code creation/management UX and usage analytics (create, revoke, inspect redemptions) | `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/super-admin-organizations-window`; `/Users/foundbrand_001/Development/vc83-com/convex/credits`; `/Users/foundbrand_001/Development/vc83-com/tests/unit` | `V-TYPE`; `V-LINT`; `V-UNIT`; `V-DOCS` | Added `CreditRedemptionCodesTab` in super-admin organizations window for code create/revoke/inspect workflows plus aggregate usage analytics and redemption-event inspection, backed by super-admin role enforcement. |
| `CSI-007` | `C` | 3 | `P0` | `DONE` | `CSI-003` | Implement top-right credits counter adjacent to avatar with dropdown bucket breakdown and deterministic loading/empty states | `/Users/foundbrand_001/Development/vc83-com/src/app/page.tsx`; `/Users/foundbrand_001/Development/vc83-com/src/components/credit-balance.tsx`; `/Users/foundbrand_001/Development/vc83-com/src/components/taskbar/top-nav-menu.tsx`; `/Users/foundbrand_001/Development/vc83-com/src/components/credit-balance-widget.tsx` | `V-TYPE`; `V-LINT`; `V-UNIT`; `V-E2E-DESKTOP`; `V-E2E-MOBILE`; `V-DOCS` | Added signed-in credits counter beside avatar, keyboard-accessible dropdown navigation, and deterministic loading/empty bucket states while preserving existing desktop/mobile shell behavior. |
| `CSI-008` | `C` | 3 | `P0` | `DONE` | `CSI-005`, `CSI-007` | Wire dropdown actions to modal flows (`Redeem Code`, `Buy Credits`, `Refer`) and maintain purchase continuation into existing store checkout | `/Users/foundbrand_001/Development/vc83-com/src/app/page.tsx`; `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/store-window.tsx`; `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/store/store-credit-section.tsx`; `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/feedback-window.tsx` | `V-TYPE`; `V-LINT`; `V-UNIT`; `V-E2E-DESKTOP`; `V-E2E-MOBILE`; `V-DOCS` | Wired dropdown/mobile launcher actions to deterministic flows: redeem window, store credits section, and referral/commissions entry point with reopen-safe deep-link props. |
| `CSI-009` | `C` | 3 | `P1` | `DONE` | `CSI-008` | Add credits activity history panel and robust success/error messaging for redemption and purchases | `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/store-window.tsx`; `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/purchase-result-window.tsx`; `/Users/foundbrand_001/Development/vc83-com/convex/credits/index.ts` | `V-TYPE`; `V-LINT`; `V-UNIT`; `V-DOCS` | Added store credits activity panel with backend-provided reason/source labels and improved redeem/purchase success-failure messaging plus store re-entry continuity from purchase results. |
| `CSI-010` | `D` | 4 | `P0` | `DONE` | `CSI-002` | Extract referral program to platform-level reusable benefit config with no hardcoded organization routing | `/Users/foundbrand_001/Development/vc83-com/convex/benefitsOntology.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/benefitsMemberSync.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/schema.ts` | `V-TYPE`; `V-LINT`; `V-UNIT`; `V-INTEG`; `V-DOCS` | Added platform referral config mutations/queries with fail-closed target-org validation plus reusable referral schema tables and member sync helpers (no hardcoded org routing). |
| `CSI-011` | `D` | 4 | `P0` | `DONE` | `CSI-010` | Implement referral attribution and reward lifecycle: `$5` signup credit + `$20` subscription credit for both sides with `$200/month` cap | `/Users/foundbrand_001/Development/vc83-com/convex/http.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/stripe/platformWebhooks.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/credits/index.ts`; `/Users/foundbrand_001/Development/vc83-com/tests/integration` | `V-TYPE`; `V-LINT`; `V-UNIT`; `V-INTEG`; `V-DOCS` | Added referral dashboard/profile/track endpoints, signup attribution for email+OAuth flows, self-referral blocking, and payment-confirmed-only subscription reward processing with monthly cap/idempotent reward events. |
| `CSI-012` | `D` | 4 | `P1` | `DONE` | `CSI-011`, `CSI-008` | Build referral modal (`/ref/{code}` link, copy flow, progress meter, rules list, run-the-numbers calculator) | `/Users/foundbrand_001/Development/vc83-com/src/app/page.tsx`; `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/store-window.tsx`; `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/benefits-window` | `V-TYPE`; `V-LINT`; `V-UNIT`; `V-E2E-DESKTOP`; `V-E2E-MOBILE`; `V-DOCS` | Added referrals tab/modal UI with copyable `/ref/{code}` link, monthly progress meter, rules list, capped calculator, `/ref/[code]` redirect entry path, and routed all “Refer” shell actions to the referral experience. |
| `CSI-013` | `E` | 5 | `P0` | `DONE` | `CSI-008` | Redesign feedback modal with freeform text + 3-state sentiment controls (`negative`, `neutral`, `positive`) and support-case CTA | `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/feedback-window.tsx`; `/Users/foundbrand_001/Development/vc83-com/src/app/page.tsx`; `/Users/foundbrand_001/Development/vc83-com/src/hooks/use-namespace-translations.ts` | `V-TYPE`; `V-LINT`; `V-UNIT`; `V-DOCS` | Shipped tri-state sentiment + freeform message capture, runtime context payload wiring, and support-intake CTA/entry points while preserving modal accessibility and close semantics. |
| `CSI-014` | `E` | 5 | `P0` | `DONE` | `CSI-013` | Extend feedback backend + email action to include user/org/page context, sentiment, timestamp, and support-recipient routing | `/Users/foundbrand_001/Development/vc83-com/convex/feedback.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/actions/feedbackEmail.ts`; `/Users/foundbrand_001/Development/vc83-com/tests/integration` | `V-TYPE`; `V-LINT`; `V-UNIT`; `V-INTEG`; `V-DOCS` | Added session/org authorization checks, persisted sentiment+context payloads, and support-recipient resolution that blocks sales mailbox routing with routing unit/integration coverage. |
| `CSI-015` | `E` | 5 | `P1` | `DONE` | `CSI-014` | Build support intake interface with system-status pill, community/sales entry cards, product selector, and account selector | `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/tickets-window`; `/Users/foundbrand_001/Development/vc83-com/src/app/page.tsx`; `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/ai-chat-window` | `V-TYPE`; `V-LINT`; `V-UNIT`; `V-E2E-DESKTOP`; `V-E2E-MOBILE`; `V-DOCS` | Added support-intake surface with status pill, product/account selectors, and explicit support/community/sales split plus deterministic AI handoff context; enterprise sales remains separate path. |
| `CSI-016` | `F` | 6 | `P0` | `DONE` | `CSI-015` | Build AI support agent profile with seeded docs/FAQ/troubleshooting knowledge and deterministic response policy | `/Users/foundbrand_001/Development/vc83-com/convex/ai/systemKnowledge`; `/Users/foundbrand_001/Development/vc83-com/convex/ai/prompts`; `/Users/foundbrand_001/Development/vc83-com/convex/ai/tools` | `V-TYPE`; `V-LINT`; `V-UNIT`; `V-MODEL`; `V-DOCS` | Added support troubleshooting/pricing/escalation docs into runtime-triggered knowledge composition, prompt-injection-aware support policy contract, and deterministic escalation boundary text. `V-MODEL` functional checks passed (`6/6`), conformance failed only on `latency_p95_ms` threshold. |
| `CSI-017` | `F` | 6 | `P0` | `DONE` | `CSI-016` | Implement support chat/session endpoints and human escalation workflow that creates trackable support tickets | `/Users/foundbrand_001/Development/vc83-com/convex/http.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/ticketOntology.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/ai/conversations.ts`; `/Users/foundbrand_001/Development/vc83-com/tests/integration` | `V-TYPE`; `V-LINT`; `V-UNIT`; `V-INTEG`; `V-DOCS` | Added `/api/support/chat`, `/api/support/chat/:sessionId`, and `/api/support/escalate` with deterministic escalation criteria, mandatory support-ticket creation path, and auditable escalation metadata/ticket references across session lifecycle + tool responses. |
| `CSI-018` | `F` | 6 | `P1` | `DONE` | `CSI-017` | Add support-agent quality analytics (resolution rate, escalation rate, conversation length, sentiment outcome trends) | `/Users/foundbrand_001/Development/vc83-com/convex/ai/workItems.ts`; `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/super-admin-organizations-window`; `/Users/foundbrand_001/Development/vc83-com/tests/unit` | `V-TYPE`; `V-LINT`; `V-UNIT`; `V-DOCS` | Added super-admin-gated support quality aggregation (AI-resolved vs human-escalated split, conversation length, sentiment trend buckets, escalation outcome breakdown, recent escalation list) plus new super-admin support quality tab and unit coverage. |
| `CSI-019` | `G` | 7 | `P0` | `DONE` | `CSI-012`, `CSI-015` | Add six-locale coverage (`en`, `de`, `pl`, `es`, `fr`, `ja`) for credits/referral/feedback/support UI copy and backend response templates | `/Users/foundbrand_001/Development/vc83-com/convex/translations`; `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/feedback-window.tsx`; `/Users/foundbrand_001/Development/vc83-com/src/app/page.tsx` | `V-TYPE`; `V-I18N`; `V-DOCS` | Added six-locale key coverage and wired localized copy across credits/referral/feedback/support surfaces; `V-TYPE`/`V-DOCS` passed, and `V-I18N` remains globally failing on unrelated branch-wide findings (lane-target files now report zero untranslated findings). |
| `CSI-020` | `G` | 7 | `P0` | `DONE` | `CSI-011`, `CSI-017`, `CSI-019` | Harden fraud and safety controls: referral abuse detection, code redeem throttling, chat abuse filters, and role/permission gates | `/Users/foundbrand_001/Development/vc83-com/convex/http.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/credits`; `/Users/foundbrand_001/Development/vc83-com/convex/ai`; `/Users/foundbrand_001/Development/vc83-com/tests/unit` | `V-TYPE`; `V-LINT`; `V-UNIT`; `V-INTEG`; `V-ROLES`; `V-PERM`; `V-DOCS` | Added multi-key redeem/referral throttling, referral abuse gating (self-referral, duplicate-org, velocity), support chat abuse filters/rate limits, and super-admin gating for forced escalation; `V-TYPE`/`V-LINT`/`V-UNIT`/`V-INTEG`/`V-DOCS` passed, while standalone `V-ROLES`/`V-PERM` runs were websocket-flaky despite equivalent suites passing within `V-UNIT`. |
| `CSI-021` | `G` | 7 | `P0` | `DONE` | `CSI-020` | Publish migration/backfill + rollback playbook, launch checklist, feature-flag strategy, and final docs synchronization | `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/credits-system-user-support-interface/MASTER_PLAN.md`; `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/credits-system-user-support-interface/INDEX.md`; `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/credits-system-user-support-interface/TASK_QUEUE.md`; `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/credits-system-user-support-interface/SESSION_PROMPTS.md` | `V-DOCS` | Published deterministic migration/backfill and rollback playbooks, rollout feature flags, launch checklist, and ownership matrix; docs artifacts synchronized and `V-DOCS` passed. |

---

## Current kickoff

- Active task: none.
- Next task: none.
- Immediate objective: lane `G` is complete; monitor rollout health and execute rollback playbook if triggers fire.
