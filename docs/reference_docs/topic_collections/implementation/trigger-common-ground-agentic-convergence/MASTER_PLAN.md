# Trigger + Common Ground Agentic Convergence Master Plan

**Date:** 2026-02-23  
**Scope:** Converge Common Ground kernel governance concepts and Trigger.dev runtime execution concepts into implementation-ready first-party contracts for LayerCake agentic infrastructure, including collaboration runtime contracts for group+DM operator workflows with orchestrator-governed commit authority.

---

## Mission

Deliver one coherent runtime model where:

1. kernel constraints remain explicit, fail-closed, and role-scoped,
2. turn/run execution is deterministic across queueing, retries, idempotency, and HITL pause/resume,
3. operators can debug lifecycle behavior with auditable state transitions,
4. rollout decisions are evidence-backed and rollback-safe.

---

## Convergence thesis

1. Common Ground contributes the operating principle:
   - protocol and state constraints at the kernel,
   - humans as asynchronous agents in the same operational system,
   - append-only lineage and transaction-safe progression.
2. Trigger.dev contributes proven execution patterns:
   - queue/concurrency policies,
   - idempotent run triggering,
   - retry and delay semantics,
   - explicit run lifecycle states and operator-facing traces.
3. LayerCake keeps ownership of implementation:
   - first-party runtime modules,
   - existing trust and authorization boundaries,
   - no imported external runtime code.
4. Collaboration extension in this stream:
   - typed group-thread and DM-thread runtime semantics,
   - shared lineage/correlation identity across collaboration events,
   - explicit authority split (`specialist proposes`, `orchestrator commits`),
   - deterministic wait/resume checkpoints for DM-to-group sync.

---

## Companion workstream boundary

Product-surface collaboration delivery is tracked separately in:

- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/operator-collaboration-routing-cutover/INDEX.md`

Boundary rule:

1. this TCG stream owns runtime/kernel contracts,
2. companion OCC stream owns operator routing defaults, chat UX, and deprecation rollout,
3. OCC implementation rows that consume collaboration runtime metadata must wait for `TCG-014`..`TCG-017`.

---

## Current state anchor

Primary runtime surfaces already in place:

1. turn lifecycle, receipts, leases, terminal deliverables:
   `/Users/foundbrand_001/Development/vc83-com/convex/ai/agentExecution.ts`
   `/Users/foundbrand_001/Development/vc83-com/convex/ai/agentSessions.ts`
   `/Users/foundbrand_001/Development/vc83-com/convex/schemas/agentSessionSchemas.ts`
   `/Users/foundbrand_001/Development/vc83-com/convex/schemas/aiSchemas.ts`
2. fail-closed tenant resolution and route identity:
   `/Users/foundbrand_001/Development/vc83-com/convex/integrations/tenantResolver.ts`
   `/Users/foundbrand_001/Development/vc83-com/convex/channels/webhooks.ts`
   `/Users/foundbrand_001/Development/vc83-com/convex/channels/router.ts`
3. trust and privileged operations:
   `/Users/foundbrand_001/Development/vc83-com/convex/ai/platformSoulScope.ts`
   `/Users/foundbrand_001/Development/vc83-com/convex/ai/platformSoulAdmin.ts`
4. existing team-handoff foundation to extend for collaboration threads:
   `/Users/foundbrand_001/Development/vc83-com/convex/ai/teamHarness.ts`
   `/Users/foundbrand_001/Development/vc83-com/convex/ai/tools/teamTools.ts`

---

## Lane A contract freeze evidence (`TCG-001`)

### Top 3 contract-regression risks before `TCG-001`

1. lifecycle state drift between schema validators and runtime mutations could create non-replayable turn histories,
2. tenant/route identity drift across webhooks/router/session resolution could route events to the wrong org if fail-closed rules loosen,
3. collaboration authority ambiguity could allow specialist-origin mutating actions before orchestrator commit controls are formalized.

### Frozen kernel-vs-execution boundary rules

| Rule ID | Boundary owner | Frozen contract | Existing typed/runtime evidence anchors | Enforcing tasks |
|---|---|---|---|---|
| `TCG-BR-01` | Kernel | Turn lifecycle states/transitions are schema-governed and append-only via execution edges. | `/Users/foundbrand_001/Development/vc83-com/convex/schemas/aiSchemas.ts` (`AGENT_TURN_STATE_VALUES`, `AGENT_TURN_TRANSITION_VALUES`, `agentTurnStateValidator`, `agentTurnTransitionValidator`); `/Users/foundbrand_001/Development/vc83-com/convex/schemas/agentSessionSchemas.ts` (`agentTurns`, `executionEdges`); `/Users/foundbrand_001/Development/vc83-com/convex/ai/agentSessions.ts` (`recordTurnTransition`) | `TCG-003` |
| `TCG-BR-02` | Kernel | Tenant and route identity resolution remains fail-closed before any execution starts. | `/Users/foundbrand_001/Development/vc83-com/convex/integrations/tenantResolver.ts` (`resolveSingleTenantContext`); `/Users/foundbrand_001/Development/vc83-com/convex/channels/router.ts` (`validateCredentialBoundary`, `shouldAllowPlatformCredentialFallback`); `/Users/foundbrand_001/Development/vc83-com/convex/channels/webhooks.ts` (`resolveOrgFromWhatsAppPhoneNumberId`, `resolveSlackWebhookVerificationContext`) | `TCG-003`, `TCG-005` |
| `TCG-BR-03` | Execution | Runtime ingress and turn processing are idempotent-receipt + lease-driven (`ingest -> processing -> complete/fail`). | `/Users/foundbrand_001/Development/vc83-com/convex/ai/agentExecution.ts` (`ingestInboundReceipt`, `markReceiptProcessing`, `completeInboundReceipt`); `/Users/foundbrand_001/Development/vc83-com/convex/ai/agentSessions.ts` (`acquireTurnLease`, `heartbeatTurnLease`, `releaseTurnLease`, `failTurnLease`) | `TCG-004`, `TCG-005`, `TCG-006` |
| `TCG-BR-04` | Operator | Operator evidence layer is read-only aggregation over lifecycle and trust events; no hidden write-side state transitions. | `/Users/foundbrand_001/Development/vc83-com/convex/terminal/terminalFeed.ts` (`getTerminalFeed`); `/Users/foundbrand_001/Development/vc83-com/convex/ai/agentSessions.ts` (`getControlCenterThreadRows`, `getControlCenterThreadDrillDown`); `/Users/foundbrand_001/Development/vc83-com/convex/ai/trustEvents.ts` (`TRUST_LIFECYCLE_EVENT_NAMES`, `trustEventNameValidator`) | `TCG-009`, `TCG-010` |
| `TCG-BR-05` | Collaboration | Current collaboration baseline remains team handoff only until typed group/DM authority contracts ship. | `/Users/foundbrand_001/Development/vc83-com/convex/ai/teamHarness.ts` (`executeTeamHandoff`); `/Users/foundbrand_001/Development/vc83-com/convex/ai/tools/teamTools.ts` (`tagInSpecialistTool`, `listTeamAgentsTool`) | `TCG-014`, `TCG-015`, `TCG-016`, `TCG-017` |

### Freeze decisions

1. Lane `B` and beyond must treat `TCG-BR-01`..`TCG-BR-05` as source-of-truth contracts; runtime implementation cannot redefine boundaries ad hoc.
2. Queue/idempotency/runtime-attempt enhancements stay inside execution-owned files and may not loosen kernel fail-closed guards.
3. Collaboration thread, lineage, correlation, and authority fields are required metadata once introduced; missing metadata resolves to blocked/rejected behavior.

---

## Target state

## 1) Kernel contract layer (Common Ground aligned)

1. deterministic state transition contract for `queued -> running -> suspended/completed/failed/cancelled`,
2. append-only execution edges for replay and audit,
3. fail-closed route identity and tenant resolution,
4. explicit role-gated privileged paths.

## 2) Execution contract layer (Trigger inspired)

1. first-class queue/concurrency keys per tenant/route/workflow,
2. idempotency scopes with explicit TTL and conflict handling,
3. run/attempt contract with retry metadata and deterministic statuses,
4. wait-token-style pause/resume contract for HITL checkpoints,
5. execution bundle version pinning per turn/run.

## 3) Operator contract layer

1. unified turn/run timeline with ingress->routing->execution->delivery checkpoints,
2. deterministic release-gate evidence tied to runtime metrics,
3. migration and rollback playbooks for runtime contract changes.

### Release gate evidence contract (`TCG-010`)

1. release decisions are emitted via deterministic contract `tcg_release_gate_evidence_v1`,
2. required metrics are evaluated in fixed order using `TRUST_ROLLOUT_REQUIRED_METRICS`,
3. missing metric evidence is always `hold` (never `proceed`),
4. warning metric evidence is `hold` with owner-tagged incident actions,
5. critical metric evidence is `rollback` with runtime-oncall escalation actions,
6. generated evidence payload includes auditable fields: `decision`, `requiredMetrics`, `metrics`, `missingMetrics`, `warningMetrics`, `criticalMetrics`, and `incidentActions`.

## 4) Collaboration contract layer (group + DM)

1. typed collaboration kernel model with `group_thread`, `dm_thread`, shared `lineageId`, and correlation IDs,
2. authority contract where specialist actions are proposal-only and mutating commits are orchestrator-only,
3. multi-thread concurrency/idempotency keys using `tenant + lineage + thread + workflow`,
4. unified timeline event correlation across group/DM/handoff/proposal/commit transitions,
5. wait/resume token checkpoints for DM-to-group sync before commit paths.

---

## Role contracts

### Organization owner

1. sees organization-scoped run lifecycle, failures, retries, and resolution paths,
2. cannot bypass platform-level privileged controls,
3. can trigger operational remediation within scoped permissions.

### Super admin

1. can inspect cross-org runtime health and guardrail status,
2. can perform privileged operations only through audited step-up and approval gates,
3. can execute rollback procedures with explicit evidence capture.

---

## Lane mapping

| Phase | Objective | Queue lane | Queue tasks |
|---|---|---|---|
| Phase 1 | Contract freeze and deterministic concept map | `A` | `TCG-001`..`TCG-002` |
| Phase 2 | Kernel/runtime contract definitions | `B` | `TCG-003`..`TCG-004` |
| Phase 3 | Execution runtime enhancement implementation | `C` | `TCG-005`..`TCG-008` |
| Phase 4 | Operator observability and release gate wiring | `D` | `TCG-009`..`TCG-010` |
| Phase 5 | Migration, rollout, and closeout sync | `E` | `TCG-011`..`TCG-012` |
| Phase 6 | Collaboration runtime contract extension (`group+DM`, authority, correlation, sync checkpoints) | `A`..`D` extension | `TCG-013`..`TCG-017` |

---

## Milestone updates (2026-02-23)

1. Lane `B` `P0` contracts are complete: `TCG-003`, `TCG-004`, and `TCG-014` are `DONE`.
2. Lane `C` scoped runtime rows are complete: `TCG-005`, `TCG-006`, `TCG-007`, `TCG-008`, `TCG-015`, and `TCG-017` are `DONE`.
3. Runtime now persists typed queue/idempotency contracts, run-attempt envelopes, and execution bundle snapshots on turn lifecycle records.
4. Collaboration runtime now enforces lineage-aware proposal/commit replay semantics plus deterministic commit-in-progress conflict labeling.
5. DM-to-group sync checkpoints are typed (`issue`/`expiry`/`resume`/`abort`) and invalid tokens fail closed to deterministic `blocked_sync_checkpoint` outcomes.
6. Lane `D` timeline surfaces now unify ingress/routing/execution/delivery evidence with deterministic ordinals (`TCG-009`).
7. Lane `D` collaboration traces now attach shared lineage/thread/correlation IDs across group/DM/handoff/proposal/commit entries with role-scoped debug payloads (`TCG-016`).
8. Lane `D` release gate now emits deterministic, auditable evidence contracts with incident action mapping and fail-closed `hold` outcomes for missing metrics (`TCG-010`).
9. Lane `E` rollout safeguards are now published with deterministic migration/backfill + rollback playbooks, feature-flag gates, and ownership matrix (`TCG-011`).
10. Lane `E` closeout sync is complete across queue artifacts with verification evidence attached and operational cadence documented (`TCG-012`).

---

## Lane E prerequisite confirmation (`TCG-011`)

All prior `P0` tasks are now confirmed `DONE` before `TCG-011` rollout promotion.

| Prior `P0` task | Lane | Status | Evidence anchor |
|---|---|---|---|
| `TCG-001` | `A` | `DONE` | Boundary freeze + queue notes (`V-DOCS`) |
| `TCG-003` | `B` | `DONE` | Transition contract + queue notes (`V-TYPE`, `V-UNIT`, `V-DOCS`) |
| `TCG-004` | `B` | `DONE` | Waitpoint contract + queue notes (`V-TYPE`, `V-UNIT`, `V-INTEG`, `V-DOCS`) |
| `TCG-005` | `C` | `DONE` | Queue contract + queue notes (`V-TYPE`, `V-LINT`, `V-UNIT`, `V-INTEG`, `V-DOCS`) |
| `TCG-006` | `C` | `DONE` | Idempotency contract + queue notes (`V-TYPE`, `V-LINT`, `V-UNIT`, `V-INTEG`, `V-DOCS`) |
| `TCG-009` | `D` | `DONE` | Timeline evidence unification milestone + queue notes |
| `TCG-013` | `A` | `DONE` | Collaboration runtime plan publication + queue notes |
| `TCG-014` | `B` | `DONE` | Collaboration kernel/authority contracts + queue notes |
| `TCG-015` | `C` | `DONE` | Lineage-aware queue/idempotency semantics + queue notes |
| `TCG-016` | `D` | `DONE` | Correlation/ordinal trace contract milestone + queue notes |

---

## TCG-011 migration/backfill + rollback playbook

### Top 3 rollout/rollback regression risks before `TCG-011`

1. broad enablement before contract-version drift is audited could create mixed execution traces that cannot be replayed deterministically,
2. rollback without scoped feature-flag ordering could preserve partially promoted collaboration traces while disabling core runtime evidence contracts,
3. missing release-gate evidence (`TRUST_ROLLOUT_REQUIRED_METRICS`) could incorrectly widen rollout when the required decision should remain `hold`.

### Feature-flag gates (promotion order)

| Flag key | Owner | Allowed states | Purpose | Rollback action |
|---|---|---|---|---|
| `tcg_runtime_contract_rollout` | `runtime_oncall` | `off`, `canary`, `on` | Enables queue/idempotency/run-attempt/execution-bundle runtime contract enforcement. | Set to `off`; preserve existing turn state; stop canary expansion. |
| `tcg_collaboration_contract_rollout` | `runtime_oncall` | `off`, `canary`, `on` | Enables lineage/thread/correlation and orchestrator authority collaboration enforcement paths. | Set to `off`; hold proposal/commit expansion; keep existing collaboration sessions read-only. |
| `tcg_release_gate_enforcement` | `platform_admin` | `off`, `canary`, `on` | Requires deterministic release-gate evidence (`tcg_release_gate_evidence_v1`) before promotion. | Set to `off` only after runtime flags are already `off`; retain incident evidence snapshot. |

### Migration/backfill playbook

1. Preflight verification:
   - run `npm run docs:guard` and confirm queue/docs synchronization is clean.
   - verify release-gate evidence payloads include `contractVersion = tcg_release_gate_evidence_v1` and all `TRUST_ROLLOUT_REQUIRED_METRICS`.
2. Canary gate activation:
   - enable `tcg_runtime_contract_rollout=canary` for approved org cohort only.
   - keep `tcg_collaboration_contract_rollout=off` until runtime contract telemetry remains stable for one full gate window.
3. Contract metadata audit (read-only):
   - inspect `agentTurns`, `executionEdges`, and collaboration session metadata for missing contract-version markers (`tcg_turn_queue_v1`, `tcg_idempotency_v1`, `tcg_run_attempt_v1`, `tcg_execution_bundle_v1`, `tcg_collaboration_v1`).
4. Targeted backfill (additive only):
   - patch only rows missing required contract metadata; never overwrite existing explicit versions.
   - record every patch batch with operator, timestamp, and affected org/thread identifiers.
5. Broaden rollout:
   - promote `tcg_collaboration_contract_rollout=canary` after runtime canary is stable.
   - promote both runtime and collaboration flags to `on` only when release-gate decision is `proceed` for two consecutive windows.

### Deterministic rollback playbook

1. Immediate containment (`T+0`):
   - set `tcg_collaboration_contract_rollout=off`, then `tcg_runtime_contract_rollout=off`.
   - freeze further backfill jobs and capture current release-gate payload.
2. Incident triage (`T+10m`):
   - review `criticalMetrics`, `warningMetrics`, and `missingMetrics` from release-gate evidence.
   - identify affected org/thread lineage IDs from operator timelines before replay actions.
3. Data integrity checks (`T+20m`):
   - confirm no partial backfill wrote conflicting contract versions for the same turn/session.
   - verify blocked checkpoints (`blocked_sync_checkpoint`) and conflict labels remain deterministic.
4. Recovery criteria:
   - rollback remains in place until release-gate decision returns `hold` or `proceed` with no critical metrics for one full window.
   - re-enable canary only with runtime-oncall plus platform-admin signoff.

### Ownership matrix

| Surface | Primary owner | Secondary owner | Responsibilities |
|---|---|---|---|
| Runtime contract rollout (`tcg_runtime_contract_rollout`) | `runtime_oncall` | `platform_admin` | Canary scope control, runtime backfill safety, rollback execution. |
| Collaboration contract rollout (`tcg_collaboration_contract_rollout`) | `runtime_oncall` | `ops_owner` | Group/DM trace quality checks, proposal/commit flow integrity, sync checkpoint stability. |
| Release gate evidence (`tcg_release_gate_enforcement`) | `platform_admin` | `runtime_oncall` | Guardrail decision integrity, missing-metric hold enforcement, incident action assignment. |
| Rollout communication + signoff | `ops_owner` | `platform_admin` | Stage announcements, incident updates, closeout cadence and audit trail publication. |

---

## TCG-012 closeout sync and cadence

### Top 3 rollout/rollback regression risks before `TCG-012`

1. closing the lane without queue/doc synchronization could leave stale dependencies and cause invalid next-task promotion,
2. documenting verification without rerunning `V-DOCS` could hide broken cross-file references or policy violations,
3. omitting an operational cadence could delay rollback response when rollout metrics degrade after closeout.

### Closeout checklist and verification summary

1. synchronized `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/trigger-common-ground-agentic-convergence/INDEX.md`, `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/trigger-common-ground-agentic-convergence/MASTER_PLAN.md`, `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/trigger-common-ground-agentic-convergence/TASK_QUEUE.md`, and `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/trigger-common-ground-agentic-convergence/SESSION_PROMPTS.md`,
2. published migration/backfill and rollback playbooks in this document plus implementation-spec sync updates,
3. reran `npm run docs:guard` and recorded pass evidence in lane `E` queue notes.

### Operational cadence (post-closeout)

1. Daily (first 7 days after broad rollout): review release-gate evidence and confirm no critical metrics or missing required metrics.
2. Weekly (steady state): run rollback-readiness drill for one canary org and validate deterministic flag sequencing.
3. Monthly: audit contract-version coverage across runtime and collaboration records; publish variance report with remediation owner.

---

## Rollout strategy

1. Stage 0: docs and contracts only.
2. Stage 1: canary runtime changes behind feature flags.
3. Stage 2: operator visibility and gate integration in limited cohorts.
4. Stage 3: broad rollout after deterministic verification profile passes.
5. Rollback: disable new runtime contract flags, preserve prior turn lifecycle path, replay pending transitions safely.

---

## Acceptance criteria

1. queue-first docs are synchronized (`TASK_QUEUE.md`, `SESSION_PROMPTS.md`, `INDEX.md`, `MASTER_PLAN.md`),
2. convergence spec maps each adopted pattern to exact runtime files,
3. runtime tasks preserve fail-closed tenant/routing and role boundaries,
4. release gate evidence is deterministic and documented,
5. migration and rollback playbooks are published before full rollout,
6. collaboration kernel, authority, multi-thread idempotency/concurrency, and wait/resume sync checkpoints are specified as typed fail-closed contracts,
7. `npm run docs:guard` passes.

---

## Non-goals

1. replacing existing workstreams (credits, ACE, observability) with one mega-plan,
2. importing external runtime code directly from reference projects,
3. weakening privileged control contracts or trust telemetry requirements,
4. refactoring unrelated product surfaces in this stream,
5. allowing specialist-origin mutating commits outside orchestrator authority contract.
