# Trigger + Common Ground Agentic Convergence Task Queue

**Last updated:** 2026-02-23  
**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/trigger-common-ground-agentic-convergence`  
**Source request:** Deeply analyze Trigger.dev and Common Ground reference projects, then create implementation-ready convergence docs for integrating high-value runtime ideas into the existing agentic platform; extend this stream with collaboration runtime contracts (group + DM threads, orchestrator authority gating, multi-thread idempotency/concurrency, correlation IDs, and DM-to-group wait/resume checkpoints).

---

## Queue rules

1. Allowed statuses are only: `READY`, `IN_PROGRESS`, `PENDING`, `BLOCKED`, `DONE`.
2. Only one task may be `IN_PROGRESS` globally unless lane policy explicitly allows overlap.
3. Promote `PENDING` to `READY` only when dependencies are `DONE`.
4. Deterministic pick order is `P0` before `P1`, then lowest task ID.
5. If blocked, capture blocker details in `Notes` and continue with next `READY` task.
6. Every task must run row `Verify` commands before moving to `DONE`.
7. Preserve fail-closed tenant resolution and role gates for all runtime contract changes.
8. Keep payload contracts typed and deterministic; avoid free-form runtime schema drift.
9. Sync `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/trigger-common-ground-agentic-convergence/INDEX.md`, `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/trigger-common-ground-agentic-convergence/MASTER_PLAN.md`, `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/trigger-common-ground-agentic-convergence/TASK_QUEUE.md`, and `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/trigger-common-ground-agentic-convergence/SESSION_PROMPTS.md` at lane milestones.
10. External references are concept-only; implementation remains first-party and license-safe.
11. Collaboration runtime changes must fail closed when lineage/thread/correlation/authority metadata is missing or invalid.

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
| `A` | Contract freeze and convergence mapping | workstream docs/spec | No implementation lanes before lane `A` `P0` rows are `DONE` |
| `B` | Kernel/runtime contract definitions | `convex/ai/*`; schemas; routing contracts | Start only after lane `A` `P0` rows are `DONE` |
| `C` | Execution runtime enhancements | queue/idempotency/retry/version-pinning paths | Start only after lane `B` `P0` rows are `DONE` |
| `D` | Operator observability and release gate wiring | terminal/trust cockpit + runtime metrics | Start only after lane `C` `P0` rows are `DONE` |
| `E` | Migration, rollout, and closeout | runbook/playbook/docs sync | Start only when all prior `P0` rows are `DONE` or `BLOCKED` |

---

## Dependency-based status flow

1. Execute lane `A` first (`TCG-001`..`TCG-002`).
2. Start lane `B` after `TCG-001` is `DONE`.
3. Start lane `C` after lane `B` `P0` rows are `DONE`.
4. Start lane `D` after lane `C` `P0` rows are `DONE`.
5. Start lane `E` after all prior `P0` rows are `DONE` or `BLOCKED`.
6. Collaboration extension tasks (`TCG-014`..`TCG-017`) may start only after `TCG-003` and must respect lane dependencies encoded per row.
7. Downstream product-surface execution in `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/operator-collaboration-routing-cutover/TASK_QUEUE.md` must not promote TCG-dependent rows until `TCG-014`..`TCG-017` are `DONE`.

---

## Task queue

| ID | Lane | Plan | Priority | Status | Depends On | Task | Primary files | Verify | Notes |
|---|---|---:|---|---|---|---|---|---|---|
| `TCG-001` | `A` | 1 | `P0` | `DONE` | - | Lock convergence architecture contract (`kernel constraints` + `execution lifecycle`) and publish deterministic boundary rules | `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/trigger-common-ground-agentic-convergence/MASTER_PLAN.md`; `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/trigger-common-ground-agentic-convergence/TRIGGER_COMMON_GROUND_CONVERGENCE_IMPLEMENTATION.md` | `V-DOCS` | Done 2026-02-21: published `TCG-BR-01`..`TCG-BR-05` boundary freeze and ran `npm run docs:guard`. |
| `TCG-002` | `A` | 1 | `P1` | `DONE` | `TCG-001` | Publish code-anchored deterministic mapping matrix from Trigger/Common Ground concepts to current LayerCake modules | `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/trigger-common-ground-agentic-convergence/TRIGGER_COMMON_GROUND_CONVERGENCE_IMPLEMENTATION.md` | `V-DOCS` | Done 2026-02-21: published `TCG-P01`..`TCG-P12` with explicit `TCG-G01`..`TCG-G12` gap labels and closure task IDs. |
| `TCG-003` | `B` | 2 | `P0` | `DONE` | `TCG-001` | Formalize turn/run transition policy contract and replay edge invariants with typed validation hooks | `/Users/foundbrand_001/Development/vc83-com/convex/ai/agentSessions.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/schemas/agentSessionSchemas.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/schemas/aiSchemas.ts` | `V-TYPE`; `V-UNIT`; `V-DOCS` | Done 2026-02-21: added typed transition policy rules + edge invariant hooks, persisted policy markers, and passed `npm run typecheck`, `npm run test:unit`, `npm run docs:guard`. |
| `TCG-004` | `B` | 2 | `P0` | `DONE` | `TCG-003` | Define typed waitpoint token contract (issue, expiry, resume, abort) for HITL checkpoints | `/Users/foundbrand_001/Development/vc83-com/convex/ai/agentExecution.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/schemas/agentSessionSchemas.ts` | `V-TYPE`; `V-UNIT`; `V-INTEG`; `V-DOCS` | Done 2026-02-21: implemented fail-closed HITL waitpoint issue/expiry/resume/abort contract and passed `npm run typecheck`, `npm run test:unit`, `npm run test:integration`, `npm run docs:guard`. |
| `TCG-005` | `C` | 3 | `P0` | `DONE` | `TCG-004` | Implement first-class queue/concurrency keys per tenant+route+workflow and deterministic conflict responses | `/Users/foundbrand_001/Development/vc83-com/convex/ai/agentExecution.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/ai/agentSessions.ts` | `V-TYPE`; `V-LINT`; `V-UNIT`; `V-INTEG`; `V-DOCS` | Done 2026-02-21: added typed queue contracts (`tenant + route + workflow`) and deterministic conflict labels in receipt + lease paths; passed `npm run typecheck`, `npm run lint`, `npm run test:unit`, `npm run test:integration`, `npm run docs:guard`. |
| `TCG-006` | `C` | 3 | `P0` | `DONE` | `TCG-005` | Add idempotency scope + TTL policy for ingress and orchestration actions with replay-safe outcomes | `/Users/foundbrand_001/Development/vc83-com/convex/ai/agentExecution.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/schemas/aiSchemas.ts` | `V-TYPE`; `V-LINT`; `V-UNIT`; `V-INTEG`; `V-DOCS` | Done 2026-02-21: added typed idempotency scope contracts with TTL, scope-key indexes, and replay-safe duplicate handling while preserving org-level key compatibility; passed `npm run typecheck`, `npm run lint`, `npm run test:unit`, `npm run test:integration`, `npm run docs:guard`. |
| `TCG-007` | `C` | 3 | `P1` | `DONE` | `TCG-006` | Introduce run-attempt contract fields for retries, delay reason, and terminal attempt outcome labels | `/Users/foundbrand_001/Development/vc83-com/convex/ai/agentSessions.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/schemas/agentSessionSchemas.ts` | `V-TYPE`; `V-UNIT`; `V-INTEG`; `V-DOCS` | Done 2026-02-21: persisted typed run-attempt contracts on turns (`attempts`, `delayReason`, `terminalOutcome`) and updated runtime recording paths; passed `npm run typecheck`, `npm run test:unit`, `npm run test:integration`, `npm run docs:guard`. |
| `TCG-008` | `C` | 3 | `P1` | `DONE` | `TCG-006` | Pin execution bundle version (model/tool/prompt snapshot) per turn/run and persist in lifecycle records | `/Users/foundbrand_001/Development/vc83-com/convex/ai/agentExecution.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/ai/agentSessions.ts` | `V-TYPE`; `V-UNIT`; `V-DOCS` | Done 2026-02-21: added typed execution bundle snapshot pinning (model/provider/auth profile + prompt/tool hashes) on turn lifecycle records and audit payloads; passed `npm run typecheck`, `npm run test:unit`, `npm run docs:guard`. |
| `TCG-009` | `D` | 4 | `P0` | `DONE` | `TCG-006` | Unify ingress/routing/execution/delivery timeline evidence for operator debugging in existing surfaces | `/Users/foundbrand_001/Development/vc83-com/convex/terminal/terminalFeed.ts`; `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/agents/agent-trust-cockpit.tsx`; `/Users/foundbrand_001/Development/vc83-com/convex/ai/agentSessions.ts` | `V-TYPE`; `V-LINT`; `V-UNIT`; `V-INTEG`; `V-DOCS` | Done 2026-02-21: unified ingress/routing/execution/delivery timeline evidence with deterministic ordinals; verification evidence captured in prior lane D milestone notes. |
| `TCG-010` | `D` | 4 | `P1` | `DONE` | `TCG-009` | Wire deterministic runtime metrics into release-gate evidence contract and incident triage runbook | `/Users/foundbrand_001/Development/vc83-com/convex/ai/trustTelemetry.ts`; `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/trigger-common-ground-agentic-convergence/MASTER_PLAN.md` | `V-TYPE`; `V-UNIT`; `V-DOCS` | Done 2026-02-21: release gate evidence contract `tcg_release_gate_evidence_v1` and incident action mapping landed with fail-closed `hold` handling for missing required metrics. |
| `TCG-011` | `E` | 5 | `P0` | `DONE` | `TCG-010` | Publish migration/backfill + rollback playbooks for runtime contract rollout with feature-flag gates | `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/trigger-common-ground-agentic-convergence/MASTER_PLAN.md`; `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/trigger-common-ground-agentic-convergence/TRIGGER_COMMON_GROUND_CONVERGENCE_IMPLEMENTATION.md` | `V-DOCS` | Done 2026-02-23: confirmed all prior `P0` rows are `DONE`; published feature-flag rollout gates, additive migration/backfill sequence, deterministic rollback triggers, and ownership matrix. Pre-task risks reviewed: contract-version drift during broad enablement, rollback flag-order errors, and missing release-gate evidence. |
| `TCG-012` | `E` | 5 | `P1` | `DONE` | `TCG-011` | Final closeout: sync queue artifacts, verification summary, and operational cadence | `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/trigger-common-ground-agentic-convergence/INDEX.md`; `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/trigger-common-ground-agentic-convergence/MASTER_PLAN.md`; `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/trigger-common-ground-agentic-convergence/TASK_QUEUE.md`; `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/trigger-common-ground-agentic-convergence/SESSION_PROMPTS.md` | `V-DOCS` | Done 2026-02-23: synchronized queue artifacts, published operational cadence, and attached `V-DOCS` pass evidence. Pre-task risks reviewed: stale dependency state across docs, missing verification evidence, and post-closeout rollback-readiness drift. |
| `TCG-013` | `A` | 1 | `P0` | `DONE` | - | Publish collaboration runtime implementation plan covering group+DM threads, orchestrator authority, multi-thread idempotency/concurrency, correlation IDs, and DM-to-group wait/resume checkpoints | `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/trigger-common-ground-agentic-convergence/COLLABORATION_TEAM_RUNTIME_IMPLEMENTATION_PLAN.md`; `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/trigger-common-ground-agentic-convergence/MASTER_PLAN.md`; `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/trigger-common-ground-agentic-convergence/TASK_QUEUE.md` | `V-DOCS` | Done 2026-02-21: published typed contract-first collaboration implementation plan and integrated it into queue governance. |
| `TCG-014` | `B` | 2 | `P0` | `DONE` | `TCG-003`, `TCG-013` | Formalize typed collaboration kernel contract (`group_thread`, `dm_thread`, shared lineage IDs) and authority contract (`specialist proposal`, `orchestrator commit`) with fail-closed validation hooks | `/Users/foundbrand_001/Development/vc83-com/convex/schemas/agentSessionSchemas.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/schemas/aiSchemas.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/ai/agentSessions.ts`; `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/trigger-common-ground-agentic-convergence/TRIGGER_COMMON_GROUND_CONVERGENCE_IMPLEMENTATION.md` | `V-TYPE`; `V-UNIT`; `V-DOCS` | Done 2026-02-21: enforced typed collaboration kernel/authority contracts, orphan DM rejection, and orchestrator-only mutating commits with docs sync; passed `npm run typecheck`, `npm run test:unit`, `npm run docs:guard`. |
| `TCG-015` | `C` | 3 | `P0` | `DONE` | `TCG-006`, `TCG-014` | Extend queue/concurrency and idempotency semantics for multi-thread sessions (`tenant + lineage + thread + workflow`) with deterministic conflict outcomes | `/Users/foundbrand_001/Development/vc83-com/convex/ai/agentExecution.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/ai/agentSessions.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/schemas/aiSchemas.ts` | `V-TYPE`; `V-LINT`; `V-UNIT`; `V-INTEG`; `V-DOCS` | Done 2026-02-21: added lineage-aware queue/idempotency key derivation and deterministic proposal/commit replay + `conflict_commit_in_progress` labeling for collaboration runtime flows; passed `npm run typecheck`, `npm run lint`, `npm run test:unit`, `npm run test:integration`, `npm run docs:guard`. |
| `TCG-016` | `D` | 4 | `P0` | `DONE` | `TCG-009`, `TCG-015` | Unify operator timeline correlation IDs across group/DM/handoff/proposal/commit events and expose role-scoped debugging traces | `/Users/foundbrand_001/Development/vc83-com/convex/terminal/terminalFeed.ts`; `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/agents/agent-trust-cockpit.tsx`; `/Users/foundbrand_001/Development/vc83-com/convex/ai/agentSessions.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/ai/trustEvents.ts` | `V-TYPE`; `V-LINT`; `V-UNIT`; `V-INTEG`; `V-DOCS` | Done 2026-02-21: timeline entries now carry shared lineage/thread/correlation IDs with stable event ordinals and role-scoped debugging payloads. |
| `TCG-017` | `C` | 3 | `P1` | `DONE` | `TCG-004`, `TCG-014` | Implement DM-to-group sync wait/resume token contract for collaboration checkpoints (`issue`, `expiry`, `resume`, `abort`) and enforce commit blocking on invalid checkpoint tokens | `/Users/foundbrand_001/Development/vc83-com/convex/ai/agentExecution.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/ai/agentSessions.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/schemas/agentSessionSchemas.ts` | `V-TYPE`; `V-UNIT`; `V-INTEG`; `V-DOCS` | Done 2026-02-21: implemented typed DM-to-group sync checkpoint token contract (`issue`, `expiry`, `resume`, `abort`) and commit-path blocking on missing/expired/mismatched tokens with deterministic `blocked_sync_checkpoint` outcomes; passed `npm run typecheck`, `npm run test:unit`, `npm run test:integration`, `npm run docs:guard`. |

---

## Current kickoff

- Active task: none (lane `E` closeout complete through `TCG-012`).
- Next promotable task: none (all currently defined queue rows are `DONE`).
- Immediate objective: monitor release-gate evidence and execute rollback playbook immediately if deterministic triggers fire.
