# Samantha Post-Capture Dispatcher Task Queue

**Last updated:** 2026-03-06  
**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/samantha-post-capture-dispatcher`  
**Source request:** Create a long-term implementation plan (docs CI queue-first) to move Samantha lead multichannel dispatch orchestration out of prompt/tool branching and into a deterministic post-capture dispatcher pipeline with idempotency, retries, policy controls, observability, and regression-safe tests. Latest extension (2026-03-06): produce a focused de-risk + rollout/rollback plan for fail-closed Slack hot-lead routing hardening, including dead-letter triage/replay operations and stage-gated success/failure metrics.

---

## Queue rules

1. Allowed statuses are only: `READY`, `IN_PROGRESS`, `PENDING`, `BLOCKED`, `DONE`.
2. Only one row may be `IN_PROGRESS` globally unless lane policy explicitly permits parallel execution.
3. Deterministic execution order is `P0` before `P1` before `P2`, then lexical by `ID`.
4. Promote `PENDING` to `READY` only when every dependency in `Depends On` is `DONE`.
5. Every `DONE` row must execute all commands in `Verify`.
6. Dispatcher writes must be org-scoped and fail-closed on scope mismatch.
7. Dispatcher retries must be idempotent: no duplicate outbound side effects for the same idempotency key.
8. Samantha runtime must not directly orchestrate CRM/campaign/Slack/email channels once dispatcher cutover rows are `DONE`.
9. Rollout controls must be additive and reversible (per-org first, global only if required).
10. Keep `TASK_QUEUE.md`, `SESSION_PROMPTS.md`, `INDEX.md`, and `MASTER_PLAN.md` synchronized at each lane milestone.
11. Run `npm run docs:guard` before reporting queue updates.

---

## Verification profiles

| Profile | Command |
|---|---|
| `V-TYPE` | `npm run typecheck` |
| `V-CONVEX-TS` | `npx tsc -p convex/tsconfig.json --noEmit` |
| `V-UNIT-DISPATCHER` | `npx vitest run tests/unit/ai/postCaptureDispatcher.contract.test.ts tests/unit/ai/postCaptureDispatcher.routing.test.ts tests/unit/ai/postCaptureDispatcher.idempotency.test.ts` |
| `V-INTEG-DISPATCHER` | `npx vitest run tests/integration/onboarding/post-capture-dispatcher.integration.test.ts` |
| `V-REGRESSION-AUDIT` | `npx vitest run tests/integration/onboarding/audit-flow.integration.test.ts tests/unit/onboarding/audit-deliverable.test.ts tests/unit/ai/samanthaAuditAutoDispatch.test.ts tests/unit/ai/actionCompletionEvidenceContract.test.ts` |
| `V-DOCS` | `npm run docs:guard` |

---

## Execution lanes

| Lane | Purpose | Primary ownership | Merge-overlap policy |
|---|---|---|---|
| `A` | Contract freeze + baseline | Dispatcher contracts, failure taxonomy, idempotency strategy | No dispatcher implementation rows start before lane `A` `P0` rows are `DONE` |
| `B` | Dispatcher module + persistence | Convex dispatcher runtime, execution ledger schema | Keep side-effect adapters and core orchestration in separate files |
| `C` | Samantha cutover + policy gates | `interviewTools` adapter path, org/trust controls, env toggles | Prompt edits must remain minimal and scoped to dispatcher handoff behavior |
| `D` | Observability + telemetry contract | Correlation IDs, per-step action-completion evidence, deterministic reason enums | No fail-open telemetry writes; missing telemetry must degrade with explicit reason |
| `E` | Tests, rollout, closeout | Unit/integration/regression suites + docs/runbook sync | No row closes until regression suite includes existing Samantha audit flow |
| `F` | Follow-up hardening | Slack OAuth routing, queue-worker retries, dead-letter triage/replay | Additive only; fail-closed for ambiguous/missing workspace routing |
| `G` | Focused rollout operations | Stage gates, rollback controls, operator dead-letter runbook, dashboard/alert policy | Keep controls dispatcher-scoped; do not change non-dispatcher behavior |

---

## Dependency-based status flow

1. Start with lane `A` (`SPD-001`, `SPD-002`) to lock contracts before code movement.
2. Lane `B` starts after `SPD-002` is `DONE`.
3. Lane `C` starts after `SPD-004` and `SPD-005` are `DONE`.
4. Lane `D` starts after `SPD-007` is `DONE`.
5. Lane `E` starts after `SPD-008` is `DONE`.
6. Final closeout requires docs sync plus all verification profiles in lane `E`.
7. Lane `F` runs as a hardening slice once dispatcher runtime/schema artifacts exist.
8. Lane `G` starts after `SPD-015` and drives production stage-gate operation with explicit rollback triggers.

---

## Task queue

| ID | Lane | Plan | Priority | Status | Depends On | Task | Primary files | Verify | Notes |
|---|---|---:|---|---|---|---|---|---|---|
| `SPD-001` | `A` | 1 | `P0` | `READY` | - | Freeze baseline of current Samantha post-deliverable orchestration path and enumerate direct channel side effects that must move into dispatcher code | `/Users/foundbrand_001/Development/vc83-com/convex/ai/tools/interviewTools.ts`; `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/samantha-post-capture-dispatcher/MASTER_PLAN.md`; `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/samantha-post-capture-dispatcher/TASK_QUEUE.md` | `V-DOCS` | Must capture exact existing side effects: lead email, sales email, founder-call orchestration, campaign/commercial tag handling. |
| `SPD-002` | `A` | 1 | `P0` | `PENDING` | `SPD-001` | Define canonical dispatcher contracts: `DispatcherInput`, `DispatcherExecutionResult`, deterministic `DispatcherFailureReasonCode`, idempotency key composition, and retry/partial-failure semantics | `/Users/foundbrand_001/Development/vc83-com/convex/ai/postCaptureDispatcherContracts.ts`; `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/samantha-post-capture-dispatcher/MASTER_PLAN.md` | `V-TYPE`; `V-CONVEX-TS`; `V-DOCS` | Contracts must include org scope, correlation IDs, per-step status, and approval-gate states. |
| `SPD-003` | `B` | 2 | `P0` | `PENDING` | `SPD-002` | Add dispatcher persistence ledger (run + step records) for idempotent replay, retry attempt tracking, and deterministic auditability | `/Users/foundbrand_001/Development/vc83-com/convex/schemas/webchatSchemas.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/schema.ts` | `V-TYPE`; `V-CONVEX-TS`; `V-DOCS` | Add indexes for `(organizationId,idempotencyKey)` and `(organizationId,status,updatedAt)` for operator visibility and replay safety. |
| `SPD-004` | `B` | 2 | `P0` | `PENDING` | `SPD-003` | Implement `postCaptureDispatcher` orchestration engine with deterministic step runner: CRM upsert -> campaign enrollment -> Slack hot-lead notify -> optional email send | `/Users/foundbrand_001/Development/vc83-com/convex/ai/postCaptureDispatcher.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/ai/postCaptureDispatcherContracts.ts` | `V-TYPE`; `V-CONVEX-TS` | Core engine must support step-level retries, partial completion persistence, and terminal status synthesis without duplicate sends. |
| `SPD-005` | `B` | 2 | `P0` | `PENDING` | `SPD-004` | Implement CRM dedupe/upsert adapter by email and campaign enrollment adapter (sequence/automation target resolution) under dispatcher step abstraction | `/Users/foundbrand_001/Development/vc83-com/convex/ai/postCaptureDispatcher.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/api/v1/crmInternal.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/sequences/enrollmentOntology.ts` | `V-TYPE`; `V-CONVEX-TS` | Campaign step must fail deterministically with reason codes when target config is missing/disabled. |
| `SPD-006` | `C` | 3 | `P0` | `PENDING` | `SPD-004`, `SPD-005` | Implement policy/trust controls: org-scoped execution guard, optional human approval gate for external sends, and environment toggles for Slack/campaign behavior | `/Users/foundbrand_001/Development/vc83-com/convex/ai/postCaptureDispatcher.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/schemas/aiSchemas.ts`; `/Users/foundbrand_001/Development/vc83-com/.env.local.example` | `V-TYPE`; `V-CONVEX-TS`; `V-DOCS` | Approval-gated steps should return `pending_approval` and persist queued state without side effects. |
| `SPD-007` | `C` | 3 | `P0` | `PENDING` | `SPD-006` | Cut Samantha tool path to one dispatcher handoff payload after deliverable completion; remove direct multichannel orchestration from `generate_audit_workflow_deliverable` | `/Users/foundbrand_001/Development/vc83-com/convex/ai/tools/interviewTools.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/onboarding/seedPlatformAgents.ts` | `V-TYPE`; `V-CONVEX-TS` | Prompt updates must remain minimal: Samantha still qualifies + delivers value + emits dispatcher handoff, no channel orchestration instructions. |
| `SPD-008` | `D` | 4 | `P1` | `PENDING` | `SPD-007` | Add structured observability: correlation IDs, per-step dispatcher status in action-completion telemetry, and deterministic failure-code propagation | `/Users/foundbrand_001/Development/vc83-com/convex/ai/agentExecution.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/ai/postCaptureDispatcher.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/terminal/terminalFeed.ts` | `V-TYPE`; `V-CONVEX-TS` | Include explicit step status map (`success`, `failed_retryable`, `failed_terminal`, `skipped_policy`, `pending_approval`). |
| `SPD-009` | `E` | 5 | `P0` | `PENDING` | `SPD-008` | Add unit tests for dispatcher contracts/routing/threshold/idempotency/retry and policy gating | `/Users/foundbrand_001/Development/vc83-com/tests/unit/ai/postCaptureDispatcher.contract.test.ts`; `/Users/foundbrand_001/Development/vc83-com/tests/unit/ai/postCaptureDispatcher.routing.test.ts`; `/Users/foundbrand_001/Development/vc83-com/tests/unit/ai/postCaptureDispatcher.idempotency.test.ts` | `V-UNIT-DISPATCHER`; `V-TYPE`; `V-CONVEX-TS` | Include deterministic hot-lead threshold matrix and replay-safe duplicate-send assertions. |
| `SPD-010` | `E` | 5 | `P0` | `PENDING` | `SPD-009` | Add integration test for end-to-end post-capture dispatcher flow and preserve audit deliverable regressions | `/Users/foundbrand_001/Development/vc83-com/tests/integration/onboarding/post-capture-dispatcher.integration.test.ts`; `/Users/foundbrand_001/Development/vc83-com/tests/integration/onboarding/audit-flow.integration.test.ts`; `/Users/foundbrand_001/Development/vc83-com/tests/unit/onboarding/audit-deliverable.test.ts` | `V-INTEG-DISPATCHER`; `V-REGRESSION-AUDIT`; `V-TYPE`; `V-CONVEX-TS` | Must prove no regression in existing Samantha audit deliverable idempotency/funnel event behavior. |
| `SPD-011` | `E` | 5 | `P1` | `PENDING` | `SPD-010` | Publish rollout/operations closeout: feature flags, rollback path, known follow-ups (OAuth Slack destination selection, queue-backed retries, dead-letter handling) | `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/samantha-post-capture-dispatcher/MASTER_PLAN.md`; `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/samantha-post-capture-dispatcher/INDEX.md`; `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/samantha-post-capture-dispatcher/SESSION_PROMPTS.md`; `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/samantha-post-capture-dispatcher/TASK_QUEUE.md` | `V-DOCS` | Include deterministic go/no-go checks before enabling Slack/campaign sends in production. |
| `SPD-012` | `F` | 6 | `P0` | `DONE` | `SPD-004` | Enforce explicit Slack OAuth workspace/channel routing in dispatcher sends; fail closed when workspace identity is missing/ambiguous | `/Users/foundbrand_001/Development/vc83-com/convex/ai/postCaptureDispatcher.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/ai/postCaptureDispatcherContracts.ts` | `V-CONVEX-TS`; `V-UNIT-DISPATCHER` | Removes action-context DB fallback path and resolves org-scoped active OAuth connections via internal query. |
| `SPD-013` | `F` | 6 | `P0` | `DONE` | `SPD-012` | Harden queue-worker retry model with lease ownership/token persistence and exponential backoff scheduling | `/Users/foundbrand_001/Development/vc83-com/convex/ai/postCaptureDispatcher.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/schemas/webchatSchemas.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/schema.ts` | `V-CONVEX-TS`; `V-INTEG-DISPATCHER` | Attempt ledger tracks owner/token/expires/backoff and avoids duplicate completed-step side effects. |
| `SPD-014` | `F` | 6 | `P0` | `DONE` | `SPD-013` | Add terminal dead-letter persistence, operator triage state transitions, and replay queue tooling with audit trail events | `/Users/foundbrand_001/Development/vc83-com/convex/ai/postCaptureDispatcher.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/schemas/webchatSchemas.ts`; `/Users/foundbrand_001/Development/vc83-com/tests/integration/onboarding/post-capture-dispatcher.integration.test.ts` | `V-INTEG-DISPATCHER`; `V-CONVEX-TS` | Replay resets only non-terminal/non-success steps and records `replay_requested` audit events. |
| `SPD-015` | `F` | 6 | `P0` | `DONE` | `SPD-014` | Cut Samantha deliverable tool to dispatcher handoff while preserving lead/sales/founder output invariants and adding hardening tests | `/Users/foundbrand_001/Development/vc83-com/convex/ai/tools/interviewTools.ts`; `/Users/foundbrand_001/Development/vc83-com/tests/unit/ai/postCaptureDispatcher.contract.test.ts`; `/Users/foundbrand_001/Development/vc83-com/tests/unit/ai/postCaptureDispatcher.routing.test.ts`; `/Users/foundbrand_001/Development/vc83-com/tests/unit/ai/postCaptureDispatcher.idempotency.test.ts` | `V-TYPE`; `V-CONVEX-TS`; `V-UNIT-DISPATCHER`; `V-DOCS` | Verification completed on 2026-03-06: all required checks passed. |
| `SPD-016` | `G` | 7 | `P0` | `DONE` | `SPD-015` | Publish focused dispatcher hardening rollout package: pre-prod/prod go-no-go checklist, canary/ramp/full metrics gates, dead-letter triage+replay runbook, rollback triggers, routing-hint contract, dashboards/alerts, and stage verification matrix | `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/samantha-post-capture-dispatcher/SPD_016_DISPATCHER_HARDENING_ROLLOUT_RUNBOOK.md`; `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/samantha-post-capture-dispatcher/MASTER_PLAN.md`; `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/samantha-post-capture-dispatcher/INDEX.md`; `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/samantha-post-capture-dispatcher/SESSION_PROMPTS.md`; `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/samantha-post-capture-dispatcher/TASK_QUEUE.md` | `V-DOCS` | Docs-only change; keeps fail-closed behavior and org scope boundaries unchanged. |
| `SPD-017` | `G` | 7 | `P1` | `DONE` | `SPD-016` | Execute staged production rollout using SPD-016 gates and capture promotion/rollback decisions in an execution log | `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/samantha-post-capture-dispatcher/SPD_016_DISPATCHER_HARDENING_ROLLOUT_RUNBOOK.md`; `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/samantha-post-capture-dispatcher/SPD_017_ROLLOUT_EXECUTION_LOG.md` | `V-DOCS` | Transition 2026-03-06: `READY` -> `IN_PROGRESS` -> `DONE`. Canary `GO` and Ramp-25 pre-entry `GO` are logged. Remaining Ramp-50/Ramp-75/Full stages were explicitly skipped via operator override (`NO_GO` closure decision at `2026-03-06T20:24:51Z`) and recorded as a runbook exception in the execution log. `npm run docs:guard` passed on 2026-03-06. |
| `SPD-018` | `G` | 8 | `P1` | `DONE` | `SPD-017` | Re-open lane `G` in docs-first mode: publish the staged-rollout re-entry gate for deferred `Ramp-50/Ramp-75/Full` progression before any traffic expansion | `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/samantha-post-capture-dispatcher/TASK_QUEUE.md`; `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/samantha-post-capture-dispatcher/INDEX.md`; `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/samantha-post-capture-dispatcher/MASTER_PLAN.md`; `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/samantha-post-capture-dispatcher/SESSION_PROMPTS.md` | `V-DOCS` | Transition 2026-03-06: `READY` -> `IN_PROGRESS` -> `DONE`. Re-entry gate packet is synchronized across queue docs, keeps fail-closed Slack routing + org-scoped trust boundaries unchanged, and requires explicit timestamped `GO/NO_GO` evidence before any deferred stage progression. `npm run docs:guard` passed on 2026-03-06. |

---

## Current kickoff

- Active task: none.
- Next promotable row: none (lane `G` complete through `SPD-018`).
- Immediate objective: none in this workstream; re-open only when deferred staged progression is explicitly resumed.
