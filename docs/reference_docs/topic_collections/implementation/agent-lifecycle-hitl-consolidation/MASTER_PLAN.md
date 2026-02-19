# Agent Lifecycle HITL Consolidation Master Plan

**Date:** 2026-02-18  
**Scope:** Use AI-Endurance/Common Ground Core runtime contracts as the backbone, converge daily operations on Soul-centric lifecycle + HITL surfaces, and retire Brain infrastructure only after trainability parity is complete.

---

## Mission

Deliver a single operational model where:

1. agents run autonomously inside explicit Soul + guardrail boundaries,
2. blockers/escalations route to a human operator with full context,
3. human interventions are auditable and feed back into agent reliability,
4. knowledge and memory systems are integrated as runtime inputs, not separate product silos.

---

## Product posture change

1. **Removed UI split:** Brain is no longer a first-class operator window.
2. **Primary operator surface:** AI Agents window and related lifecycle tabs.
3. **Primary daily workflow:** chat + intervention queue, not separate ingestion workspace.
4. **Training model:** Soul interview + lifecycle guardrails + knowledge retrieval convergence.
5. **Infrastructure posture:** Brain backend paths remain temporarily as compatibility infrastructure until retrieval and telemetry parity land.

---

## Current state snapshot

1. Brain launch surfaces were removed from desktop menu, all-apps tools, and window registry; `/brain` redirects to `/agents`.
2. `ALC-002` complete (2026-02-18): shell-copy/i18n deprecation is in effect and `ui.windows.brain.title` is no longer seeded for active window launch paths.
3. `ALC-003` complete (2026-02-18): Brain window components are fenced behind internal-only `NEXT_PUBLIC_INTERNAL_BRAIN_WINDOW`; default UI now presents archival notice and routes operators to `/agents`.
4. Agents UI already includes trust/soul/tools/sessions/approvals/escalations/analytics tabs.
5. Runtime retrieval consumes organization knowledge via `organizationMedia` chunk/docs retrieval paths.
6. `ALC-008` complete (2026-02-18): integration audit matrix now explicitly maps cross-layer overlaps, ownership boundaries, and missing contracts across core/harness/memory/KB/app layers.
7. `ALC-006` complete (2026-02-18): trust cockpit now provides a contiguous intervention drill-down workflow (queue -> blocker reason -> session timeline -> action panel) wired to live approval/escalation handlers.
8. `ALC-013` complete (2026-02-18): non-layercake teach ingests now bridge into runtime-searchable retrieval context with provenance metadata.
9. `ALC-009` complete (2026-02-18): retrieval convergence hardening now infers missing legacy teach-source types and preserves runtime bridge provenance for `pdf/audio/link/text`; resume-pass verification re-ran `npm run typecheck`, `npm run lint`, and `npx vitest run tests/unit/ai tests/integration/ai` (all pass, lint warnings pre-existing).
10. `ALC-007` complete (2026-02-18): intervention templates are now unified in trust cockpit (`send_file`, `override_draft`, `handoff_back_to_agent`) and approval/escalation audit trails now persist template-aware fields (`interventionTemplateId`, `resumeCheckpoint`, reason) via `convex/ai/interventionTemplates.ts`.
11. `ALC-011` complete (2026-02-18): cross-layer routing honors requested subtype filters, avoids wrong-subtype fallback, and is regression-hardened for coordinator escalation/delegation flows.
12. `ALC-012` complete (2026-02-18): sessions handoff flow now emits selectable valid user targets and backend validates active-org-member handoff ownership.
13. `ALC-004` complete (2026-02-18): canonical lifecycle states, actors, checkpoints, and allowed transitions are now locked in docs + backend.
14. `ALC-005` complete (2026-02-18): lifecycle transitions are enforced in approvals/escalation/execution and checkpointed to session state + trust telemetry.
15. `ALC-014` complete (2026-02-18): trust telemetry mode migrated to `lifecycle` with a `brain -> lifecycle` compatibility normalization shim.
16. Verification note: `npm run typecheck` now passes; prior TS7006 blockers in `src/components/window-content/super-admin-organizations-window/manage-org/index.tsx` are resolved.
17. `ALC-010` complete (2026-02-18): lane-F hardening added lifecycle/rollout regression checks (`tests/unit/ai/agentLifecycleContract.test.ts`, `tests/unit/ai/trustTelemetryDashboards.test.ts`) and published the operator runbook plus rollout/rollback checklist with explicit HITL rollback triggers.
18. `ALC-015` complete (2026-02-18): canonical harness-context envelope contract now ships across escalation/approval payloads and intervention drill-down rendering (`convex/ai/harnessContextEnvelope.ts`, `convex/ai/agentApprovals.ts`, `convex/ai/escalation.ts`, `src/components/window-content/agents/agent-trust-cockpit.tsx`, `tests/unit/ai/harnessContextEnvelope.test.ts`).
19. `ALC-016` complete (2026-02-18): escalation/takeover intervention drill-down now surfaces memory provenance checkpoints (consent scope/decision, candidate attribution, blocked-no-consent signal) from trust-event timeline wiring.
20. `ALC-017` complete (2026-02-18): intervention drill-down now exposes retrieval citation provenance (chunk-index vs `knowledge_item_bridge`, source kind/path, fallback markers) using retrieval snapshot wiring + mapping helpers.
21. `ALC-018` complete (2026-02-18): lane-H extension hardening is closed with regression pack coverage and operator acceptance checklist for harness/memory/knowledge visibility.

---

## Layer integration audit matrix (ALC-008)

This lane-D audit locks overlap and ownership for Common Ground Core, harnesses, memory systems, knowledge bases, and app-layer concepts.

Coverage states:

- `covered`: implemented and integrated into lifecycle/HITL runtime.
- `partial`: implemented, but cross-layer/operator contract is incomplete.
- `missing`: required contract is absent.

Canonical lifecycle naming for all rows is locked to:
`draft -> active -> paused -> escalated -> takeover -> resolved -> active`.

| Layer | Overlap + ownership boundary | Coverage | Concrete evidence paths | Owning queue task(s) | Unblock criteria |
|---|---|---|---|---|---|
| Common Ground Core | Lifecycle transitions and subtype routing are backend-owned; UI/telemetry consume, but do not define, state names. | `covered` | `convex/ai/agentLifecycle.ts`; `convex/ai/agentExecution.ts`; `convex/ai/agentApprovals.ts`; `convex/ai/escalation.ts`; `convex/ai/trustEvents.ts`; `convex/agentOntology.ts` | `ALC-004`, `ALC-005`, `ALC-011` | Closed for P0. Keep lifecycle drift checks in `ALC-010` so compatibility paths do not reintroduce non-canonical naming. |
| Harnesses | Harness context envelope is now canonicalized and rendered in intervention queue/timeline drill-down, including layer attribution, tools used, and latest handoff edge evidence. | `covered` | `convex/ai/harness.ts`; `convex/ai/teamHarness.ts`; `convex/ai/agentExecution.ts`; `convex/ai/harnessContextEnvelope.ts`; `convex/ai/agentApprovals.ts`; `convex/ai/escalation.ts`; `src/components/window-content/agents/agent-trust-cockpit.tsx`; `tests/unit/ai/harnessContextEnvelope.test.ts` | `ALC-015` | Closed 2026-02-18: normalized `harnessContext` payload contract now flows through escalation/approval outputs and is rendered in operator intervention drill-down. |
| Memory systems | Memory consent/provenance checkpoints are now wired into intervention drill-down so operators can inspect consent scope/decision and memory candidate attribution at escalation/takeover decision time. | `covered` | `convex/ai/interviewRunner.ts`; `convex/ai/trustEvents.ts`; `convex/ai/trustTelemetry.ts`; `convex/ai/agentSessions.ts`; `src/components/window-content/agents/agent-trust-cockpit.tsx`; `src/components/window-content/agents/intervention-evidence.ts`; `tests/unit/ai/interventionEvidence.test.ts` | `ALC-016` | Closed 2026-02-18: escalation/takeover intervention views now render consent checkpoint evidence and candidate attribution with deterministic helper coverage. |
| Knowledge bases | Retrieval citation explainability is now surfaced in intervention drill-down with provenance classification (`chunk_index` vs `knowledge_item_bridge`) and source kind/path evidence from retrieval snapshots. | `covered` | `convex/organizationMedia.ts`; `convex/brainKnowledge.ts`; `convex/ai/agentExecution.ts`; `convex/ai/agentSessions.ts`; `src/components/window-content/agents/agent-trust-cockpit.tsx`; `src/components/window-content/agents/intervention-evidence.ts`; `tests/unit/ai/knowledgeItemRetrievalBridge.test.ts`; `tests/unit/ai/interventionEvidence.test.ts` | `ALC-017` | Closed 2026-02-18: operator drill-down now renders chunk-vs-bridge citation provenance plus source kind/path labels with regression coverage. |
| Application layer concepts | Queue -> context -> action flow includes unified intervention templates across approval/escalation paths, and lane-F hardening now adds regression guardrails plus explicit rollback/runbook operations. | `covered` | `src/components/window-content/agents/agent-trust-cockpit.tsx`; `src/components/window-content/agents/agent-sessions-viewer.tsx`; `src/components/window-content/agents/session-handoff.ts`; `convex/ai/agentApprovals.ts`; `convex/ai/escalation.ts`; `convex/ai/agentSessions.ts`; `convex/ai/interventionTemplates.ts`; `tests/unit/ai/agentLifecycleContract.test.ts`; `tests/unit/ai/trustTelemetryDashboards.test.ts` | `ALC-010` | Closed 2026-02-18: template/audit-log parity is now under regression guardrails and rollback triggers are documented for HITL template-flow failures. |

### Ownership boundaries (decision rights)

| Domain | Primary owner | Consumers | Boundary rule |
|---|---|---|---|
| Lifecycle states/checkpoints | `convex/ai/agentLifecycle.ts` | runtime execution, approvals, escalation, trust telemetry, agents UI | UI and telemetry must consume canonical state names; they do not define new lifecycle states. |
| Cross-agent routing/subtype resolution | `convex/agentOntology.ts` + coordinator tools | PM/delegation tooling, execution runtime | Routing callers request subtype; resolver decides final active agent. |
| Knowledge retrieval eligibility | `convex/organizationMedia.ts` + `convex/brainKnowledge.ts` | `convex/ai/agentExecution.ts`, retrieval UI surfaces | Ingest layers set provenance; runtime consumes retrieval artifacts only from audited sources. |
| Operator intervention actions | `convex/ai/agentApprovals.ts`; `convex/ai/escalation.ts`; `convex/ai/agentSessions.ts` | `src/components/window-content/agents/*` | UI emits valid action payloads; backend enforces final policy and state transition legitimacy. |

### Missing-contract backlog mapped to planned rows

| Gap ID | Missing contract | Impact if unresolved | Planned closure | Unblock criteria |
|---|---|---|---|---|
| `LC-GAP-01` | Harness context envelope from runtime/escalation into operator timeline | Operators lack deterministic tool-context visibility during takeover decisions | Closed by `ALC-015` (2026-02-18) | Intervention payloads now include normalized `harnessContext` and trust cockpit drill-down renders layer/tools/handoff context for escalation and approval interventions, with regression coverage in `tests/unit/ai/harnessContextEnvelope.test.ts`. |
| `LC-GAP-02` | Memory provenance + consent trace visibility at intervention checkpoints | Human reviewers cannot quickly attribute why memory affected an action | Closed by `ALC-016` (2026-02-18) | Escalation/takeover drill-down now shows consent scope/decision, candidate attribution, and blocked-no-consent evidence with regression coverage in `tests/unit/ai/interventionEvidence.test.ts`. |
| `LC-GAP-03` | Retrieval explainability for bridge-origin knowledge docs | Trust/compliance review cannot distinguish indexed chunk vs bridge context origin | Closed by `ALC-017` (2026-02-18) | Intervention drill-down now distinguishes chunk-index vs `knowledge_item_bridge` citations and surfaces source kind/path labels with regression coverage in `tests/unit/ai/interventionEvidence.test.ts`. |
| `LC-GAP-04` | Unified intervention template contract across approvals/escalations/handoff | Action semantics drift across UI panels and backend handlers | Closed by `ALC-007` (2026-02-18) | Shared intervention schema now flows through trust cockpit + Convex mutations with template-aware audit metadata (`interventionTemplateId`, `resumeCheckpoint`, reason). |
| `LC-GAP-05` | Continuous drift guard between lifecycle contract, telemetry taxonomy, and UI copy | Reintroduction of inconsistent state naming under future refactors | Closed by `ALC-010` (2026-02-18) | Canonical lifecycle ordering is regression-locked in `tests/unit/ai/agentLifecycleContract.test.ts` and rollout rollback gates are codified in lane-F runbook/checklist. |

---

## Target architecture

1. **Soul Contract**
   - Identity, tone, do/don't rules, boundaries, escalation triggers.
2. **Lifecycle Contract**
   - `draft -> active -> paused -> escalated -> takeover -> resolved -> active`.
   - Canonical backend source: `convex/ai/agentLifecycle.ts`.
3. **HITL Control Surface**
   - Prioritized queue + full conversation timeline + guardrail breach reason + intervention actions.
4. **Knowledge Pipeline**
   - Ingestion sources normalize into retrievable runtime documents/chunks with provenance.
5. **Auditability**
   - Every intervention, override, and resume action is logged with actor, reason, and resulting state.

---

## Canonical lifecycle contract (ALC-004)

| State | Entered when | Primary actor | Allowed next states | Runtime checkpoints |
|---|---|---|---|---|
| `draft` | Agent requests gated approval for a tool/action | `agent` | `active` | `approval_requested` |
| `active` | Session is autonomously handling user turns | `system` | `draft`, `paused` | `approval_resolved`, `agent_resumed` |
| `paused` | Escalation trigger detected; autonomous execution intentionally halted | `system` | `escalated` | `escalation_detected` |
| `escalated` | Escalation persisted + notifications sent | `system` | `takeover`, `resolved` | `escalation_created`, `escalation_dismissed`, `escalation_timed_out` |
| `takeover` | Human operator takes direct control of the session | `operator` | `resolved` | `escalation_taken_over` |
| `resolved` | Human/system closes escalation/takeover and prepares autonomous resume | `operator` or `system` | `active` | `escalation_resolved`, `agent_resumed` |

Transition enforcement:

1. Only transitions listed above are allowed by `assertLifecycleTransition`.
2. Runtime paths write transition checkpoints through `internal.ai.agentLifecycle.recordLifecycleTransition`.
3. Every transition emits `trust.lifecycle.transition_checkpoint.v1` with `from`, `to`, `checkpoint`, `actor`, and `reason`.
4. Session docs persist latest lifecycle checkpoint in `agentSessions.lifecycleState` + `agentSessions.lifecycleCheckpoint`.

---

## Implementation phases

1. **Phase 0 (Correctness Closure)**
   - `ALC-011` done: subtype-aware cross-layer PM routing.
   - `ALC-012` done: sessions handoff UX/backend contract mismatch.
2. **Phase 1 (Decommission + Contract Lock)**
   - Brain UI decommission fence completed via `ALC-003`.
   - Finalize Soul/lifecycle state model and transitions.
3. **Phase 2 (Operator Flow)**
   - `ALC-006` delivered deterministic drill-down baseline in Agents UI.
   - `ALC-007` complete: intervention action-template unification + auditable template metadata in approval/escalation logs.
4. **Phase 3 (Layer Convergence)**
   - `ALC-009` complete: runtime retrieval parity + legacy-source hardening for teach ingests.
   - Align remaining harness/memory/retrieval explainability visibility in operator surfaces.
5. **Phase 4 (Hardening)**
   - Completed via `ALC-010`: regression tests for lifecycle drift + HITL rollback guardrails, operator runbook, and rollout/rollback checklist with explicit triggers.
6. **Phase 5 (Visibility Closure Extension)**
   - `ALC-015` complete: harness context envelope visibility in intervention queue/timeline.
   - `ALC-016` complete: memory consent/provenance visibility in escalation/takeover drill-down.
   - `ALC-017` complete: retrieval citation explainability for chunk vs bridge provenance.
   - `ALC-018` complete: extension hardening and operator acceptance checklist closure.

---

## Follow-on queue extension (ALC-015+)

1. `ALC-015` (`DONE`): closed `LC-GAP-01` with canonical harness-context payload + intervention-surface rendering contract.
2. `ALC-016` (`DONE`): closed `LC-GAP-02` with memory provenance panel + trust-event evidence wiring.
3. `ALC-017` (`DONE`): closed `LC-GAP-03` with retrieval citation provenance explainability in operator drill-down.
4. `ALC-018` (`DONE`): extension closeout landed with regression pack and operator acceptance checklist.

---

## Operator acceptance checklist (ALC-018)

Use this checklist for lane-H release validation and future regression audits.

1. Harness visibility contract:
   - intervention queue/drill-down shows normalized harness layer/tools/handoff evidence for approval and escalation items.
2. Memory provenance contract:
   - escalation/takeover drill-down shows consent scope, consent decision, candidate attribution, and blocked-without-consent signal when memory checkpoints exist.
3. Retrieval provenance contract:
   - intervention drill-down labels citation provenance as `chunk_index` vs `knowledge_item_bridge` and surfaces source kind/path for operator review.
4. Regression pack:
   - `tests/unit/ai/harnessContextEnvelope.test.ts` and `tests/unit/ai/interventionEvidence.test.ts` pass within `npx vitest run tests/unit/ai tests/integration/ai`.
5. Acceptance gate:
   - `LC-GAP-01`..`LC-GAP-03` remain marked closed in this plan and queue/index stay synchronized after each lane-H follow-up.

---

## Operator runbook (ALC-010)

Use this flow for active HITL incidents and lane-F canary monitoring.

1. Triage queue in `agent-trust-cockpit`:
   - prioritize items with `lifecycleState` of `escalated`/`takeover` and open escalations.
2. Validate intervention payload before action:
   - confirm selected template is one of `send_file`, `override_draft`, `handoff_back_to_agent`.
   - for `send_file`, require `fileName` or `fileUrl`; reject blank payloads.
3. Confirm lifecycle checkpoint correctness:
   - verify transition path follows canonical order `draft -> active -> paused -> escalated -> takeover -> resolved -> active`.
   - investigate any `trust.lifecycle.transition_checkpoint.v1` payload validation failure before resuming automation.
4. Execute intervention and audit:
   - ensure `interventionTemplateId`, `resumeCheckpoint`, and operator reason are persisted in audit trail entries.
5. Resume decision:
   - if guardrails are green, resolve/takeover-close and return session to `active`.
   - if rollback triggers fire, execute rollback checklist immediately.

---

## Rollout and rollback checklist (ALC-010)

### Pre-rollout checklist

1. Run verification suite in this order: `npm run typecheck`, `npm run lint`, `npx vitest run tests/unit/ai tests/integration/ai`, `npm run docs:guard`.
2. Confirm new regression coverage is present:
   - `tests/unit/ai/agentLifecycleContract.test.ts` (canonical ordering and transition checkpoints).
   - `tests/unit/ai/trustTelemetryDashboards.test.ts` (HITL rollback/warning guardrails).
3. Confirm operator surfaces still expose template-driven interventions and session timeline context.

### Rollback triggers (explicit HITL failure conditions)

Trigger rollback if any of the following occurs during canary or production rollout:

1. `trust_soul_post_approval_rollback_rate > 0.10` (critical threshold breach).
2. `trust_team_handoff_context_loss_rate > 0.08` (critical threshold breach).
3. Intervention template contract failure:
   - `send_file` action submitted without `fileName`/`fileUrl`,
   - invalid template payload shape reaching backend handlers,
   - missing template audit metadata (`interventionTemplateId`) on intervention actions.
4. Lifecycle transition payload validation failures for `trust.lifecycle.transition_checkpoint.v1` (schema status `failed` or missing lifecycle checkpoint fields).

### Rollback execution steps

1. Freeze rollout:
   - stop promoting additional orgs/traffic to updated HITL behavior.
2. Revert intervention routing to previous stable release:
   - restore prior agent-approval/escalation runtime version.
3. Preserve forensic evidence:
   - export affected `objectActions` and `aiTrustEvents` records for failed intervals.
4. Validate recovery:
   - rerun verification suite and confirm rollback-trigger metrics return below warning thresholds.
5. Re-enable rollout only after root cause + fix PR have passing `V-TYPE`, `V-LINT`, `V-AI-TESTS`, and `V-DOCS`.

---

## Acceptance criteria

1. No end-user path can launch Brain UI from desktop/navigation surfaces.
2. Operators can inspect blocker context and intervene in one contiguous workflow.
3. Lifecycle transitions are deterministic and auditable.
4. Runtime retrieval includes all supported trainable knowledge source categories.
5. Cross-layer PM delegation/escalation resolves subtype-correct target agents.
6. Manual session handoff UI emits valid takeover targets (no empty handoff IDs).
7. Docs, queue artifacts, and verification commands remain synchronized.
8. Intervention drill-down exposes harness context, memory provenance, and retrieval citation provenance with deterministic regression coverage.

---

## Risks

1. **Hidden regression risk:** stale deep links or restored sessions referencing `brain`.
   - Mitigation: route redirect + registry removal + docs deprecation notes.
2. **Contract drift:** lifecycle state names diverge between backend and UI copy.
   - Mitigation: lock canonical state map in `ALC-004`.
3. **Routing mismatch:** cross-layer tooling routes tasks to wrong active agents.
   - Mitigation: `ALC-011` subtype-aware resolver + regression tests.
4. **HITL action mismatch:** UI emits invalid takeover payloads.
   - Mitigation: `ALC-012` sessions handoff contract fix + lint/type/test gates.
5. **Retrieval inconsistency:** uploaded sources are accepted but not runtime-retrievable.
   - Mitigation: `ALC-013` + `ALC-009` runtime parity hardening with source-type regression coverage.
6. **Telemetry blind spot:** trust dashboards remain coupled to `brain` mode naming.
   - Mitigation: `ALC-014` compatibility-mode migration before backend archival.
