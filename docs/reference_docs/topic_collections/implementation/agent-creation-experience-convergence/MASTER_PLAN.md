# Agent Creation Experience Convergence Master Plan

**Date:** 2026-02-20  
**Scope:** Build a world-class agentic system by sequencing work in this order: LayerCake platform agents first, then eval architecture, then live soul-binding interview operations; extend with Slack unified multi-tenant endpoint architecture and pre-manifest UX planning.

---

## Mission

Deliver one coherent platform where:

1. platform agents help users create deployable agents and workflows quickly,
2. soul-binding remains a governed advanced mode for trust and drift control,
3. evals determine release decisions using deterministic gates,
4. operators can run the system end to end from a documented runbook.

---

## Why this convergence plan

Current foundations are strong, but missing one operator-ready operating model:

1. creation UX, trust UX, and deployment UX are implemented across multiple workstreams,
2. model conformance, trust telemetry, and E2E checks exist but are not expressed as one execution contract for this workstream,
3. there is no single live soul-binding interview playbook for structured real-world eval sessions,
4. there is no single "how to run the system" guide from startup to go/no-go,
5. Slack integration onboarding still needs one deterministic architecture contract for multi-tenant endpoint routing and manifest pre-collection UX.

---

## Reuse map (do not rebuild)

1. BYOA runtime and channel routing baseline:
   - `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/multi-provider-byoa-channel-runtime/MASTER_PLAN.md`
2. Voice co-creation runtime and trust-compatible handoff contracts:
   - `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/voice-agent-co-creation/MASTER_PLAN.md`
3. Trust event taxonomy, consent contracts, and dashboards:
   - `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-trust-experience/MASTER_PLAN.md`
4. Model conformance and enablement gates:
   - `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/byok-multimodal-frontier-runtime/MASTER_PLAN.md`
5. Free onboarding and deployment continuity contracts:
   - `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/free-onboarding-global/MASTER_PLAN.md`
   - `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/webchat-deployment-ui/MASTER_PLAN.md`

---

## Slack integration extension contract (lane G)

Lane `G` extends this workstream with a reusable integration architecture pattern:

1. adopt Option 3 unified ingress endpoints for Slack and future providers,
2. route tenant context server-side through verified payload + installation mapping,
3. replace direct manifest export with a pre-manifest wizard that collects required operator inputs first,
4. keep manifest generation typed, deterministic, and role-gated for platform-managed exports,
5. publish migration/backfill + rollback playbooks before provider generalization.

Primary implementation design doc:

- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-creation-experience-convergence/SLACK_MULTI_TENANT_ENDPOINT_MANIFEST_IMPLEMENTATION_PLAN.md`

---

## LayerCake-first contract

The implementation sequence is fixed:

1. define and wire LayerCake platform agents,
2. expose agent creation and productivity flows through those agents,
3. run eval stack (offline, workflow, live, telemetry) before broad rollout,
4. keep soul-binding as a governed advanced mode with explicit consent gates.

### LayerCake stack levels

1. `L0 Runtime`: channel, session, tool, model routing infrastructure.
2. `L1 Orchestration`: session routing and handoff policy across platform agents.
3. `L2 Platform Agents`: specialist agents that guide creation, deployment, trust, and productivity.
4. `L3 User Agents`: customer-created agents produced through the platform flow.

### ACE-001 contract freeze (locked)

This workstream now treats these as non-negotiable execution invariants:

1. Sequence is locked to `platform agents -> evals -> rollout`; no lane may reverse this order.
2. Soul-binding is explicitly post-activation and consent-governed; it is not a day-one onboarding blocker.
3. Existing runtime/trust/model/deployment contracts from the reuse map are reused as-is for this stream.
4. Any net-new contract in this stream must extend existing foundations and cannot redefine completed upstream contracts.
5. Rollout decisions require deterministic eval outcomes (`proceed`, `hold`, `rollback`) before widening exposure.

---

## Voice-first launch surface contract

The default launch surface is a single unified chat experience with voice controls, not a mode-choice wizard.

1. No first-run `Talk` vs `Type` branching choice is shown.
2. Chat input always exposes typed input and voice controls in the same surface.
3. Existing AI chat system gains a third presentation mode: `slick`.
4. `slick` is the default mode for first-run agent creation entry paths.
5. Desktop default on load/refresh: open welcome window and a separate AI chat window in `slick` mode.
6. Mobile default on load/refresh: open AI chat in `slick` mode full-screen; welcome remains in background/hidden by the chat layer.
7. `Create Agent` entry paths route directly into this same unified chat surface.
8. `slick` is a distinct third UI variant (separate from `single` basic and workflow panes) and includes a voice-circle visualization as the primary voice capture affordance.

---

## Super-admin platform soul access contract

Super-admin access is supported only as a constrained capability, not a blanket god mode.

Required control model:

1. Capability name is `platform_soul_admin`.
2. Scope is limited to `L2 Platform Agents` souls only; `L3 User Agents` are explicitly excluded.
3. Allowed actions are explicit and separate: `view`, `propose`, `approve_apply`, `rollback`.
4. `approve_apply` in production requires dual approval.
5. Access requires step-up auth (re-auth + MFA) and time-limited elevation.
6. Every action requires reason code + ticket reference and emits auditable trust events.
7. Default views are diff/provenance-first; raw memory export is break-glass only and separately audited.
8. Consent and guardrail contracts cannot be bypassed by super-admin mode.

---

## Required LayerCake platform agents

Canonical definitions live in:

- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-creation-experience-convergence/LAYERCAKE_PLATFORM_AGENT_STACK.md`

Initial core set:

1. `Platform Orchestrator`: routes tasks and handoffs.
2. `Agent Creation Architect`: helps define role, scope, and success criteria.
3. `Workflow Builder`: maps user goals into concrete tool/workflow steps.
4. `Integration and Deployment Guide`: drives Webchat/Telegram deployment steps.
5. `Soul Binding Coach`: runs advanced reflection/consent checkpoints.
6. `Productivity Coach`: optimizes operating loops after activation.
7. `Eval Analyst`: runs and interprets conformance/workflow/live eval packs.

---

## Eval architecture requirements

Eval requirements are split into four gate layers:

1. `Layer 1: Model conformance gate`
   - Source: `npm run test:model`.
   - Contract: tool-call parsing, schema fidelity, refusal handling, latency p95, cost per 1k tokens.
2. `Layer 2: Workflow behavior gate`
   - Source: unit/integration/E2E profiles.
   - Contract: creation flow completion, deploy handoff correctness, consent checkpoint behavior.
3. `Layer 3: Live soul-binding interview gate`
   - Source: operator-run playbook and scoring worksheet.
   - Contract: identity clarity, guardrail specificity, consent integrity, deployment readiness.
4. `Layer 4: Trust telemetry rollout gate`
   - Source: trust KPI snapshots and guardrail logic.
   - Contract: deterministic hold/rollback decisions on threshold violations.

### ACE-010 deterministic eval matrix (locked thresholds)

| Gate layer | Evidence source | `proceed` threshold (all must pass) | `hold` threshold | `rollback` threshold |
|---|---|---|---|---|
| `Layer 1: Model conformance` | `npm run test:model` + `convex/ai/modelConformance.ts` | tool-call parse rate `>= 0.90`, schema fidelity `>= 0.90`, refusal handling `>= 0.85`, latency p95 `<= 12000`, cost/1k tokens `<= 0.5` | Any warning-level instability with no consent/safety breach and active remediation owner/date | Any threshold breach in release candidate run, missing conformance summary, or unresolved critical model gate |
| `Layer 2: Workflow behavior` | `npm run typecheck`; `npm run lint`; `npm run test:unit`; `npm run test:integration`; E2E profiles | All required commands pass; no `P0` regression in creation, deploy handoff, consent checkpoint, or rollback path | Non-`P0` defect or flaky infra condition with deterministic rerun plan and owner/date | Any `P0` regression, consent/guardrail bypass, or failed deterministic rollback execution path |
| `Layer 3: Live soul-binding interview` | `SOUL_BINDING_LIVE_EVAL_PLAYBOOK.md` worksheet | Score `10-12`, fail-fast not triggered, required evidence fields complete | Score `7-9`, or evidence gap with bounded remediation scope | Score `0-6`, fail-fast trigger, or critical consent/safety violation |
| `Layer 4: Trust telemetry rollout` | `convex/ai/trustTelemetry.ts` guardrails (`evaluateTrustRolloutGuardrails`) | Required metrics present and severity `ok` for all required metrics | Missing metric or warning metric present | Any critical metric; guardrail status `rollback` |

Deterministic action contract:

1. If any layer is `rollback`, overall decision is `rollback`.
2. Else if any layer is `hold`, overall decision is `hold`.
3. Else overall decision is `proceed`.
4. Missing evidence is never treated as pass; it is at least `hold`.

Live interview protocol and question banks:

- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-creation-experience-convergence/SOUL_BINDING_LIVE_EVAL_PLAYBOOK.md`

System operation guide:

- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-creation-experience-convergence/SYSTEM_RUNBOOK.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-creation-experience-convergence/RELEASE_GATE_CHECKLIST.md`
- Deterministic lane-A gap matrix:
  `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-creation-experience-convergence/DETERMINISTIC_GAP_MATRIX.md`

---

## Phase-to-lane mapping

| Phase | Objective | Queue lane | Queue tasks |
|---|---|---|---|
| Phase 1 | Contract freeze and eval taxonomy lock | `A` | `ACE-001`..`ACE-002` |
| Phase 2 | LayerCake platform agent stack definition and interfaces | `B` | `ACE-003`..`ACE-004` |
| Phase 3 | LayerCake platform-agent implementation for creation/productivity + privileged soul access boundaries | `C` | `ACE-005`..`ACE-007`, `ACE-015` |
| Phase 4 | Live soul-binding eval playbook and evidence workflow | `D` | `ACE-008`..`ACE-009` |
| Phase 5 | Eval gate wiring, release matrix, and privileged-access gate checks | `E` | `ACE-010`..`ACE-011`, `ACE-016` |
| Phase 6 | Operator runbook and hardening closeout | `F` | `ACE-012`..`ACE-014` |
| Phase 7 | Unified integration endpoints + manifest wizard + migration/provider extension docs | `G` | `ACE-017`..`ACE-020` |

---

## Execution updates

1. **2026-02-19 (`ACE-001` complete):** locked `ACE-001 contract freeze` invariants for sequence order (`platform agents -> evals -> rollout`), post-activation consent-governed soul-binding, and no-redefinition reuse boundaries.
2. **2026-02-19 (`ACE-002` complete):** published deterministic code-anchored gap matrix in `DETERMINISTIC_GAP_MATRIX.md` covering creation flow, trust flow, deployment handoff, and release gates with queue closure mappings.
3. **2026-02-19 (`ACE-003` complete):** published canonical LayerCake agent roster boundaries with deterministic stop-condition ownership and `handoff_payload.v1` schema contracts in `LAYERCAKE_PLATFORM_AGENT_STACK.md`.
4. **2026-02-19 (`ACE-004` complete):** defined deterministic orchestrator routing policy (`R-001`..`R-006`) and per-agent prompt/interface schema contracts (`agent_prompt_contract.v1`, `agent_result.v1`) for creation/productivity workflows.
5. **2026-02-19 (`ACE-005` complete):** implemented voice-first launch contract in product surfaces: first-run `slick` mode defaults, Create Agent routing into platform-agent-guided chat, and deterministic desktop/mobile launch behavior without first-run Talk/Type branching.
6. **2026-02-19 (`ACE-006` complete):** implemented platform-agent productivity loop tooling and kickoff behavior that produces concrete workflow steps, tool mappings, and deploy-ready recommendations through one unified voice+text composer surface.
7. **2026-02-19 (`ACE-007` complete):** implemented Eval Analyst action outputs with deterministic `PASS`/`FAIL` labels, explicit decision outputs, and structured failed-metric remediation payloads.
8. **2026-02-19 (`ACE-015` complete):** implemented `platform_soul_admin` with strict L2-only soul scope enforcement, explicit action matrix (`view`, `propose`, `approve_apply`, `rollback`), fail-closed metadata behavior, and audit action logging.
9. **2026-02-19 (`ACE-008` complete):** published live soul-binding eval playbook question packs spanning identity, guardrails, consent, productivity, handoff, and deployment readiness with deterministic scoring and explicit fail-fast consent/safety boundaries.
10. **2026-02-19 (`ACE-009` complete):** added operator evidence worksheet schema, session artifact/logging contract, and deterministic `proceed`/`hold`/`rollback` mapping for repeatable live interview gate decisions.
11. **2026-02-19 (`ACE-010` complete):** locked deterministic threshold matrix for model/workflow/live/telemetry layers and explicit `rollback > hold > proceed` reduction semantics in `MASTER_PLAN.md` and `SYSTEM_RUNBOOK.md`.
12. **2026-02-19 (`ACE-011` complete):** added release checklist artifact and blocking runbook contract requiring evidence-backed per-layer status before any rollout decision.
13. **2026-02-19 (`ACE-016` complete):** enforced privileged step-up + time-bound elevation + reason/ticket requirements, added production dual-approval hold-before-apply behavior, and expanded trust-event taxonomy coverage for privileged platform soul admin actions.
14. **2026-02-19 (`ACE-012` complete):** hardened `SYSTEM_RUNBOOK.md` with exact startup commands, queue-ordered verification profile, live-eval execution protocol, release-gate review flow, and incident-response rollback triggers.
15. **2026-02-19 (`ACE-013` complete):** executed full lane-F verification profile (`typecheck`, `lint`, `unit`, `model`, `desktop/mobile/atx E2E`, `docs:guard`) and published deterministic gate summary plus explicit `P0` pass/fail contract notes in `RELEASE_GATE_CHECKLIST.md` (current reduction: `hold` due to missing fresh live/telemetry/privileged evidence rows).
16. **2026-02-19 (`ACE-014` complete):** synchronized closeout artifacts (`INDEX.md`, `MASTER_PLAN.md`, `TASK_QUEUE.md`, `SESSION_PROMPTS.md`) and locked ongoing operations cadence + rollback follow-up guidance for release-hold clearance.
17. **2026-02-20 (lane-F convergence follow-up hardening):** finalized AI chat shell runtime convergence gaps by (a) switching native-reasoning routing to persisted per-model capability metadata, (b) enforcing deterministic `plan_soft` readiness scoring output with per-step `READY`/`BLOCKED`/`NEEDS_INFO` reasons and non-execution guarantees, and (c) replacing extractive URL reference compression with query-aware ranking/summaries that preserve source attribution (`URL`, relevance signal, status).
18. **2026-02-20 (`ACE-017` complete):** published cohesive Slack integration implementation plan for Option 3 unified endpoint routing, pre-manifest wizard UX, typed manifest builder contracts, security/isolation controls, and migration/provider-generalization path.
19. **2026-02-20 (`ACE-018` complete):** implemented Option 3 unified Slack ingress routing with provider-agnostic endpoint resolver contracts, fail-closed tenant resolution behavior, legacy-alias compatibility, and deterministic signing-secret resolution across active installation mappings.
20. **2026-02-20 (`ACE-019` complete):** implemented pre-manifest wizard flow (workspace context + required app name + preset/format review/export), enforced super-admin gate on platform manifest export, and aligned manifest generation to canonical `/integrations/slack/*` endpoint contracts.
21. **2026-02-20 (`ACE-020` complete):** published deterministic migration/backfill + rollback + provider-extension playbooks (`INTEGRATION_ENDPOINT_MIGRATION_PROVIDER_PLAYBOOK.md`) and wired system runbook operations for unified endpoint incident response and Google/Microsoft extension gates.

---

## Rollout strategy

1. Stage 0: internal-only rollout of LayerCake platform agents with explicit operator oversight.
2. Stage 1: enable live soul-binding eval sessions for controlled internal cohorts.
3. Stage 2: canary external cohorts only when all eval layers pass.
4. Stage 3: default rollout after stable telemetry and no critical guardrail triggers.
5. Rollback: revert platform-agent routing to prior stable creation path; keep trust/runtime foundations active.

---

## Acceptance criteria

1. LayerCake platform-agent roster and handoff contracts are defined and mapped to implementation files.
2. Eval requirements are explicit across model, workflow, live interview, and telemetry layers.
3. Voice-first launch contract is implemented: no `Talk`/`Type` gate, `slick` mode exists as third chat mode and is default for creation entry, desktop opens welcome + separate chat window, and mobile opens full-screen chat overlay behavior.
4. Live soul-binding interview playbook includes deterministic question packs and scoring rules.
5. System runbook explains how to launch, validate, and gate releases.
6. `platform_soul_admin` is implemented with L2-only scope, step-up auth, dual-approval apply, and auditable events.
7. No privileged path allows bypassing consent checkpoints or guardrail contracts.
8. Queue files are synchronized (`TASK_QUEUE.md`, `SESSION_PROMPTS.md`, `INDEX.md`, this plan).
9. `npm run docs:guard` passes.
10. Unified integration endpoint contracts are provider-agnostic and reusable across Slack/Google/Microsoft.
11. Pre-manifest wizard flow collects required data before manifest generation and preserves role-gated platform export policy.
12. Migration/backfill and rollback playbooks are published before provider generalization and referenced by operator runbook procedures.

---

## Non-goals

1. Rebuilding completed channel/runtime security foundations.
2. Changing `trust-artifacts.v1` schema contracts.
3. Expanding deployment channels beyond existing Webchat and Telegram in this workstream.
4. Introducing unrestricted super-admin read/write access across all agent souls.

---

## Initial status

- Workstream is now centered on LayerCake platform-agent-first execution.
- Eval requirements are defined as mandatory release gates.
- Live soul-binding and system-operation docs are published in this folder.
- Lanes `A` through `F` are complete (`ACE-001`..`ACE-016` in queue scope, including `ACE-012`..`ACE-014` closeout).
- Lane `G` is complete for Slack unified endpoint + manifest UX + migration/provider playbook scope (`ACE-017`..`ACE-020`).
- Current release-gate reduction is `hold` until fresh live-eval worksheet evidence, telemetry guardrail snapshot evidence, and privileged-control trust-event evidence are attached.
