# Operator Collaboration Routing Cutover Task Queue

**Last updated:** 2026-02-24  
**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/operator-collaboration-routing-cutover`  
**Source request:** Split operator collaboration product-surface changes out of TCG runtime convergence, while keeping typed collaboration kernel semantics in TCG. Deliver orchestrator-first operator routing, group+DM chat UX, DM-to-group summary sync, legacy AI chat deprecation, and explicit operator channel binding UX.

---

## Queue rules

1. Allowed statuses are only: `READY`, `IN_PROGRESS`, `PENDING`, `BLOCKED`, `DONE`.
2. Only one task may be `IN_PROGRESS` globally unless lane policy explicitly allows overlap.
3. Promote `PENDING` to `READY` only when dependencies are `DONE`.
4. Deterministic pick order is `P0` before `P1`, then lowest task ID.
5. If blocked, capture blocker details in `Notes` and continue with next `READY` task.
6. Every task must run row `Verify` commands before moving to `DONE`.
7. Preserve fail-closed routing resolution; no fallback to legacy/default chat routing when metadata is missing.
8. Keep collaboration UI deterministic and role-scoped (orchestrator vs specialist authority).
9. Sync `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/operator-collaboration-routing-cutover/INDEX.md`, `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/operator-collaboration-routing-cutover/MASTER_PLAN.md`, `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/operator-collaboration-routing-cutover/TASK_QUEUE.md`, and `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/operator-collaboration-routing-cutover/SESSION_PROMPTS.md` at lane milestones.
10. Cross-workstream contract: tasks that consume collaboration lineage/thread/correlation/wait-resume metadata remain blocked until upstream TCG tasks are `DONE`.

---

## Verification profiles

| Profile | Command |
|---|---|
| `V-TYPE` | `npm run typecheck` |
| `V-LINT` | `npm run lint` |
| `V-UNIT` | `npm run test:unit` |
| `V-INTEG` | `npm run test:integration` |
| `V-DOCS` | `npm run docs:guard` |

---

## Execution lanes

| Lane | Purpose | Primary ownership | Merge-overlap policy |
|---|---|---|---|
| `A` | Scope split + baseline audit + UX contract freeze | workstream docs + routing inventory | No implementation lanes before lane `A` `P0` rows are `DONE` |
| `B` | Orchestrator-first routing and channel/session contract wiring | `convex/chat.ts`; `convex/agentOntology.ts`; `convex/ai/*`; schemas | Starts only after lane `A` `P0` rows are `DONE` and upstream TCG contract rows are ready |
| `C` | Operator collaboration surfaces (group + DM + sync flow) | `src/components/window-content/ai-chat-window/*`; trust timeline surfaces | Starts only after lane `B` `P0` rows are `DONE` |
| `D` | Legacy chat cutover + operator channel binding UX | routing defaults; shell entry points; operator settings UX | Starts only after lane `C` `P0` rows are `DONE` |
| `E` | Rollout, rollback, and closeout | playbooks + docs + final verification | Starts only when prior lane `P0` rows are `DONE` or `BLOCKED` |

---

## Dependency-based status flow

1. Start with lane `A` (`OCC-001`..`OCC-003`).
2. Lane `B` starts after `OCC-002` and upstream `TCG-014` are `DONE`.
3. Lane `C` starts after lane `B` `P0` rows are `DONE` and upstream `TCG-016` is `DONE`.
4. Lane `D` starts after `OCC-007` and upstream `TCG-017` are `DONE`.
5. Lane `E` starts after all prior `P0` rows are `DONE` or `BLOCKED`.
6. If any upstream TCG dependency is not `DONE`, mark downstream rows `BLOCKED` with explicit dependency note.

---

## Task queue

| ID | Lane | Plan | Priority | Status | Depends On | Task | Primary files | Verify | Notes |
|---|---|---:|---|---|---|---|---|---|---|
| `OCC-001` | `A` | 1 | `P0` | `DONE` | - | Publish split execution model and queue-first workstream with explicit upstream TCG dependency rules | `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/operator-collaboration-routing-cutover/INDEX.md`; `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/operator-collaboration-routing-cutover/MASTER_PLAN.md`; `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/operator-collaboration-routing-cutover/TASK_QUEUE.md`; `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/operator-collaboration-routing-cutover/SESSION_PROMPTS.md` | `V-DOCS` | Done 2026-02-21: created split workstream artifacts and linked dependencies to `TCG-014`..`TCG-017`. |
| `OCC-002` | `A` | 1 | `P0` | `DONE` | `OCC-001` | Baseline audit: document current operator channel routing, legacy chat fallback paths, and team-handoff thread limits in code reality matrix | `/Users/foundbrand_001/Development/vc83-com/convex/agentOntology.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/ai/chat.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/ai/teamHarness.ts`; `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/operator-collaboration-routing-cutover/MASTER_PLAN.md` | `V-DOCS` | Done 2026-02-21: published code-anchored routing/fallback/thread-limit matrix, captured legacy promotion/fail-open paths, corrected stale chat anchor path, and passed `npm run docs:guard`. |
| `OCC-003` | `A` | 1 | `P1` | `DONE` | `OCC-002` | Freeze operator UX contract for `group_thread` + specialist `dm_thread` + DM summary sync back to group, including authority and visibility rules | `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/operator-collaboration-routing-cutover/MASTER_PLAN.md`; `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/operator-collaboration-routing-cutover/SESSION_PROMPTS.md` | `V-DOCS` | Done 2026-02-21: published frozen UX contract rules `OCC-UX-01`..`OCC-UX-08`, reinforced split boundary (TCG runtime semantics vs OCC product surfaces), and passed `npm run docs:guard`. |
| `OCC-004` | `B` | 2 | `P0` | `DONE` | `OCC-002`, `TCG-014` | Implement orchestrator-first default routing for operator channels with fail-closed tenant/channel resolution and no legacy fallback path | `/Users/foundbrand_001/Development/vc83-com/convex/agentOntology.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/ai/chat.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/channels/router.ts` | `V-TYPE`; `V-UNIT`; `V-INTEG`; `V-DOCS` | Done 2026-02-21: removed operator-channel fail-open fallback to first active specialist, enforced desktop orchestrator route preflight in `ai.chat`, tightened channel binding/credential resolution around explicit routing identity, and passed `npm run typecheck`, `npm run test:unit`, `npm run test:integration`, `npm run docs:guard`. |
| `OCC-005` | `B` | 2 | `P0` | `DONE` | `OCC-004`, `TCG-015` | Wire collaboration routing/session metadata (`tenant + lineage + thread + workflow`) into operator-channel routing records | `/Users/foundbrand_001/Development/vc83-com/convex/schemas/agentSessionSchemas.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/ai/agentSessions.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/ai/chat.ts` | `V-TYPE`; `V-LINT`; `V-UNIT`; `V-INTEG`; `V-DOCS` | Done 2026-02-24: added typed `routingMetadata` contract on sessions, enforced fail-closed lineage/thread consistency against collaboration kernel identity, and wired desktop orchestrator chat preflight to upsert collaboration + routing metadata before runtime dispatch. Ran `npm run typecheck`, `npm run lint`, `npm run test:unit`, `npm run test:integration`, `npm run docs:guard`; lint remains non-zero due existing repo issue at `src/components/window-content/terminal-window.tsx:320` (`react-hooks/rules-of-hooks`). |
| `OCC-006` | `B` | 2 | `P1` | `DONE` | `OCC-005`, `TCG-017` | Implement DM-to-group summary sync bridge endpoint that consumes wait/resume checkpoint tokens before commit-path routing | `/Users/foundbrand_001/Development/vc83-com/convex/ai/teamHarness.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/ai/tools/teamTools.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/ai/agentExecution.ts` | `V-TYPE`; `V-UNIT`; `V-INTEG`; `V-DOCS` | Done 2026-02-24: added fail-closed DM summary sync bridge endpoint + `sync_dm_summary_to_group` tool, and updated commit-intent sync gating in `agentExecution` so bridge-provided commit metadata must pass checkpoint token validation before commit routing. Passed `npm run typecheck`, `npm run test:unit`, `npm run test:integration`, `npm run docs:guard`. |
| `OCC-007` | `C` | 3 | `P0` | `DONE` | `OCC-003`, `OCC-004`, `TCG-014` | Ship operator collaboration UI with orchestrator group thread plus direct specialist DM thread surfaces in AI chat windows | `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/ai-chat-window/*`; `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/agents-window.tsx` | `V-TYPE`; `V-LINT`; `V-UNIT`; `V-DOCS` | Done 2026-02-24: delivered per-conversation group + DM collaboration surfaces in slick AI chat header, message stream, and composer routing; added explicit DM proposal-only scope labeling; tightened DM message filtering by thread/specialist identity; and fixed slick drawer visibility regressions. Ran `npm run typecheck`, `npm run lint`, `npm run test:unit`, `npm run docs:guard` (lint remains warnings-only across existing repo debt). |
| `OCC-008` | `C` | 3 | `P1` | `DONE` | `OCC-007`, `TCG-016` | Surface unified correlation/timeline markers for group, DM, handoff, proposal, and commit events in operator UI | `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/ai-chat-window/*`; `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/agents/agent-trust-cockpit.tsx` | `V-TYPE`; `V-LINT`; `V-UNIT`; `V-INTEG`; `V-DOCS` | Done 2026-02-24: wired control-center timeline markers into slick chat surfaces with deterministic event-ordinal ordering/filtering, added message correlation badges, and surfaced group/DM/handoff/proposal/commit marker chips in trust cockpit rows. Ran `npm run typecheck`, `npm run lint`, `npm run test:unit`, `npm run test:integration`, `npm run docs:guard` (lint remains warnings-only repo debt). |
| `OCC-009` | `C` | 3 | `P1` | `DONE` | `OCC-007`, `OCC-006` | Add explicit operator flow to sync DM summary back to group thread with audit trail and replay-safe payload contract | `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/ai-chat-window/*`; `/Users/foundbrand_001/Development/vc83-com/convex/ai/tools/teamTools.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/ai/agentSessions.ts` | `V-TYPE`; `V-LINT`; `V-UNIT`; `V-INTEG`; `V-DOCS` | Done 2026-02-24: added explicit DM-only operator sync panel with checkpoint-aware status, deterministic replay-safe `syncAttemptId` derivation, and per-attempt audit entries; wired action flow to `syncOperatorDmSummaryToGroup` with blocked/error handling. Ran `npm run typecheck`, `npm run lint`, `npm run test:unit`, `npm run test:integration`, `npm run docs:guard` (lint remains warnings-only repo debt). |
| `OCC-010` | `D` | 4 | `P0` | `DONE` | `OCC-004` | Deprecate legacy AI chat entry path and cut over operator channels to orchestrator collaboration shell behind deterministic feature flags | `/Users/foundbrand_001/Development/vc83-com/convex/ai/chat.ts`; `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/ai-chat-window/*`; `/Users/foundbrand_001/Development/vc83-com/src/hooks/window-registry.tsx`; `/Users/foundbrand_001/Development/vc83-com/src/app/page.tsx` | `V-TYPE`; `V-LINT`; `V-UNIT`; `V-INTEG`; `V-DOCS` | Done 2026-02-24: added deterministic org-cohort shell cutover flag resolver (`SHELL_ENABLED`, `ROLLOUT_PERCENT`, `FORCE_LEGACY`) across page/chat entry points and injected cutover metadata into operator dispatch preflight in `convex/ai/chat.ts`. Ran `npm run typecheck`, `npm run lint`, `npm run test:unit`, `npm run test:integration`, `npm run docs:guard` (lint warnings-only repo debt). |
| `OCC-011` | `D` | 4 | `P0` | `DONE` | `OCC-010`, `TCG-016` | Add operator-facing agent configuration for explicit channel bindings and default orchestrator collaboration behavior | `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/org-owner-manage-window/*`; `/Users/foundbrand_001/Development/vc83-com/convex/agentOntology.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/ai/platformSoulAdmin.ts` | `V-TYPE`; `V-LINT`; `V-UNIT`; `V-DOCS` | Done 2026-02-24: shipped operator-facing channel binding + collaboration-default controls, enforced super-admin-only overrides for platform-managed channels (`desktop`, `slack`), and added explicit role auth query for UX gating. Ran `npm run typecheck`, `npm run lint`, `npm run test:unit`, `npm run docs:guard` (lint warnings-only repo debt). |
| `OCC-012` | `D` | 4 | `P1` | `DONE` | `OCC-011`, `OCC-009` | Publish migration and rollback playbooks for operator cutover, including support guidance and legacy fallback retirement timeline | `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/operator-collaboration-routing-cutover/MASTER_PLAN.md`; `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/operator-collaboration-routing-cutover/INDEX.md` | `V-DOCS` | Done 2026-02-24: published flag-by-flag reversible checkpoints, tenant cohort migration phases (`M0`..`M3`), support incident rollback steps, and legacy fallback retirement timeline in master plan/index. Ran `npm run docs:guard`. |
| `OCC-013` | `E` | 5 | `P1` | `DONE` | `OCC-012` | Final closeout: full verification profile, docs synchronization, and launch-readiness summary | `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/operator-collaboration-routing-cutover/INDEX.md`; `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/operator-collaboration-routing-cutover/MASTER_PLAN.md`; `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/operator-collaboration-routing-cutover/TASK_QUEUE.md`; `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/operator-collaboration-routing-cutover/SESSION_PROMPTS.md` | `V-TYPE`; `V-LINT`; `V-UNIT`; `V-INTEG`; `V-DOCS` | Done 2026-02-24: reviewed pre-task rollout/rollback risks (contract drift, lint/test signal masking, docs-state drift), confirmed all prior OCC `P0` rows are `DONE` (`OCC-001`, `OCC-002`, `OCC-004`, `OCC-005`, `OCC-007`, `OCC-010`, `OCC-011`), captured upstream dependency evidence (`TCG-014`..`TCG-017` = `DONE`), and ran `npm run typecheck`, `npm run lint` (warnings-only, exit 0), `npm run test:unit`, `npm run test:integration`, `npm run docs:guard`. |

---

## Current kickoff

- Active task: none (lane `E` closeout is complete through `OCC-013`).
- Next promotable task: none (all currently defined queue rows are `DONE`).
- Immediate objective: monitor post-cutover rollout signals and execute rollback playbook immediately if deterministic triggers fire.
