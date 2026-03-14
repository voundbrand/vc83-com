# Web AI Chat Agent Evals Master Plan

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/web-ai-chat-agent-evals`  
**Source brief date:** 2026-03-11  
**Planning mode:** Queue-first, docs-CI-compatible, deterministic promotion gating

## Objective

Build a world-class, production-safe agentic eval system that uses web AI chat plus Playwright to continuously test seeded agents, validate tool usage behavior, score outcomes, and gate rollout decisions.

## Current state in this codebase

1. Seeded platform agents already exist via `/Users/foundbrand_001/Development/vc83-com/convex/onboarding/seedPlatformAgents.ts`.
2. Org-agent rollout mechanics already exist via `/Users/foundbrand_001/Development/vc83-com/convex/agentOntology.ts` template distribution actions.
3. Chat runtime already executes and records tool calls in `/Users/foundbrand_001/Development/vc83-com/convex/ai/chat.ts`.
4. Trust telemetry and rollout guardrail primitives already exist in `/Users/foundbrand_001/Development/vc83-com/convex/ai/trustTelemetry.ts` and `/Users/foundbrand_001/Development/vc83-com/convex/ai/trustEvents.ts`.
5. A release-oriented eval helper already exists in `/Users/foundbrand_001/Development/vc83-com/convex/ai/tools/evalAnalystTool.ts`.
6. Playwright infrastructure already exists (`/Users/foundbrand_001/Development/vc83-com/tests/e2e`, `/Users/foundbrand_001/Development/vc83-com/playwright.desktop.config.ts`, `/Users/foundbrand_001/Development/vc83-com/playwright.atx.config.ts`).
7. Machine-readable scenario matrix exists at `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/web-ai-chat-agent-evals/AGENT_EVAL_SCENARIO_MATRIX.json` (`WAE-002b` complete).
8. Eval-org lifecycle contract is now codified at `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/web-ai-chat-agent-evals/EVAL_ORG_LIFECYCLE_CONTRACT.md` (deterministic create/reset/teardown + seed/version pins).
9. Eval-run playback/diff/promotion-evidence retrieval APIs are now implemented with org/user fail-closed scope checks and lifecycle evidence packet validation (`WAE-102` complete).
10. Eval lifecycle trust-event taxonomy is now implemented with deterministic states (`queued`, `running`, `passed`, `failed`, `blocked`), normalized reason codes, org-scoped emission, and machine-readable lifecycle snapshots in trace/evidence retrieval payloads (`WAE-103` complete).
11. Replay/integrity coverage is now implemented for envelope integrity, deterministic tool accounting in playback/diff/evidence payloads, lifecycle snapshot parity assertions, and failed-scenario replay reproducibility with fail-closed lifecycle evidence mismatch handling (`WAE-104` complete).
12. Playwright fixture foundations for deterministic eval org/session bootstrapping are now implemented with env-gated setup (`PLAYWRIGHT_WAE_ENABLE=1`), deterministic suite/org identity derivation, and lifecycle evidence artifact emission for lane `C` execution (`WAE-201` complete).
13. Scenario DSL generation is now implemented from `AGENT_EVAL_SCENARIO_MATRIX.json` + `AGENT_EVAL_SPECS.md`, including deterministic lexical ordering and `PENDING_FEATURE` skip gates for full/partial checks (`WAE-202` complete).
14. Extensive seeded-agent ATX scenario suites are now implemented from the WAE DSL with deterministic contract validation for required/forbidden tool pathways, negative-path handling, `PENDING_FEATURE` `SKIPPED` semantics, and deterministic retry artifact retention behavior (`WAE-203` complete).
15. Schema-versioned scorer-ingestion artifact bundles are now emitted from WAE Playwright runs under `tmp/reports/wae/<runId>/bundle/`, including JSONL scenario/run records, aggregated trace metadata, screenshot paths, deterministic lifecycle evidence pointers, and refreshed lifecycle evidence indexes that reference Playwright + bundle artifacts (`WAE-204` complete).
16. Weighted WAE scoring is now implemented with deterministic rubric weights, thresholds, explainable scenario/run verdict packets, and remediation payloads (`WAE-301` complete).
17. `WAE-303` CI wiring is now verified green in `.github/workflows/wae-eval-gate.yml` with deterministic nightly/pre-rollout paths, artifact upload, scorer verdict summaries, and optional persisted rollout-gate recording via `wae_rollout_gate_decision_v1`; closeout was unblocked on `2026-03-13` by restoring the live landing-page audit handoff CTAs in `apps/one-of-one-landing/app/page.tsx` and updating `tests/e2e/onboarding-audit-handoff.spec.ts` to wait on the audit surface instead of stale hero copy.
18. `WAE-304` operator runbook is now published in this plan and indexed in the workstream docs, covering owner, SLA, escalation matrix, fail-closed promotion-block handling, and rollback criteria for nightly and pre-rollout WAE gate failures (`2026-03-13`).
19. `WAE-401` recommendation-packet implementation is now complete in `convex/ai/tools/evalAnalystTool.ts` and `convex/ai/selfImprovement.ts` with deterministic `wae_eval_recommendation_packet_v1` output, concrete scenario/run evidence references, and a root `test:unit` script update that restores deterministic file-scoped verification for the canonical WAE contract command (`2026-03-13`).

## Gaps

1. Continuous cadence and ownership handoff for lane `E` are not yet published.

## Target state

1. Deterministic eval runs are first-class objects with stable schema, replayability, and org scoping.
2. Every seeded agent has a maintained scenario matrix that exercises required and forbidden tool behavior.
3. Playwright executes extensive web-chat eval suites in dedicated test orgs, with versioned artifacts.
4. Rollout, publish, and managed clone distribution paths are blocked when eval evidence is missing/stale/mismatched or critical thresholds are breached.
5. Failure findings produce actionable improvement packets with human approval and automatic rollback safety.

## Architecture contract

1. **Eval run envelope contract:** Each run stores `runId`, scenario metadata, agent/version identity, tool-call sequence, timing, verdict, and artifact pointers.
2. **Deterministic execution contract:** Seed version and scenario DSL must make reruns reproducible.
3. **Scope and safety contract:** All eval data access is org-scoped; rollout gates fail closed on missing evidence.
4. **Promotion contract:** Only scored runs with green critical metrics can unblock rollout actions.
5. **Improvement contract:** Auto-generated changes must remain suggestion-only until approved.

## Implementation chunks

### Chunk A: Contract freeze, agent behavioral specs, and seed matrix

1. Freeze scoring taxonomy and promotion semantics.
2. **Capture per-agent behavioral eval specs through product conversations** — for each seeded agent, define success criteria, failure modes, critical eval moments, concrete eval scenarios with pass conditions, and identify pending features. Document in `AGENT_EVAL_SPECS.md`. (WAE-002a)
3. Codify behavioral specs into deterministic eval scenario matrix with required/forbidden tool mappings, acceptance rubrics, and `PENDING_FEATURE` gates linked to implementation plans. (WAE-002b)
4. Freeze create/reset/teardown lifecycle for Playwright eval orgs in `EVAL_ORG_LIFECYCLE_CONTRACT.md`, including deterministic naming/idempotency, seed/version drift handling, fail-closed criteria, and CI evidence requirements. (WAE-003)

### Linked implementation plans (feature dependencies)

Certain eval scenarios require features that do not exist yet. These are tracked as separate implementation workstreams that can proceed in parallel with the eval infrastructure build.

| Feature | Plan root | Blocks eval scenarios |
|---|---|---|
| Onboarding customization passthrough (voice, personality, context from Quinn → agent creation) | `docs/reference_docs/topic_collections/implementation/onboarding-customization-passthrough/` | `Q-007`, `Q-010`, `OOO-013`, `OOO-014` |
| Agent self-naming + "I'm here" first contact pattern (HER-inspired arrival) | `docs/reference_docs/topic_collections/implementation/agent-self-naming-arrival/` | `Q-009`, partial `Q-001`, `OOO-017` |
| Voice personality inference (tone/speed/inflection → personality signals during onboarding) | `docs/reference_docs/topic_collections/implementation/voice-personality-inference/` | `OOO-015` |
| Agent architecture decoupling (`Agents | Slack | Vacation Planning`, plus tool-domain split for `core runtime | CRM | Event Management | adapters`) | `docs/reference_projects/elevenlabs/implementation-eleven-agents-rollout/` | Cross-agent domain-isolation, adapter-boundary eval assertions, and portfolio invariants (`ELA-045`..`ELA-059`) |

Eval scenarios marked `PENDING_FEATURE` in `AGENT_EVAL_SPECS.md` emit `SKIPPED` verdicts until their linked implementation plan delivers. This allows the eval infrastructure to be built and validated independently while feature work proceeds.

### Chunk B: Eval data plane

1. Persist eval-run envelope and tool traces.
2. Expose org-scoped retrieval APIs.
3. Normalize trust telemetry reason codes for eval lifecycle.
4. Add deterministic replay/integrity tests.

### Chunk C: Playwright execution engine

1. Add authenticated eval fixtures for web AI chat.
2. Implement scenario DSL generated from seed matrix.
3. Add extensive multi-tool, negative-path e2e suites.
4. Emit schema-versioned artifact bundles for scoring.

### Chunk D: Scoring and rollout gates

1. Implement weighted scorer and explainable verdict packet.
2. Gate rollout/template distribution on eval outcomes.
3. Add docs-CI and CI workflow checks for nightly and pre-rollout jobs.
4. Publish operator runbook for blocked promotions and rollback criteria.

### Chunk E: Recursive improvement loop

1. Cluster failures and generate recommendation packets.
2. Enforce human-in-the-loop application workflow.
3. Run canary baseline-vs-candidate loop in dedicated eval org.
4. Publish continuous operating cadence and ownership handoff.

20. `WAE-402` is now complete with a deterministic `wae_improvement_workflow_v1` path in `convex/ai/selfImprovement.ts`: WAE recommendation packets can be staged into owner-approved `soulProposals`, application requires the exact approval checkpoint token, rollback readiness creates baseline soul-history checkpoints, and post-apply WAE verification automatically rolls the soul back when regression is detected (`2026-03-13`).
21. `WAE-403` is now complete with deterministic baseline-vs-candidate canary comparison bundles under `tmp/reports/wae/<candidateRunId>/canary/`: Playwright canary evidence now reuses the WAE scorer bundle contract (`WAE-301`), projects candidate and baseline through the rollout-gate artifact shape (`WAE-302`), and records promotion versus rollback decisions with `wae_improvement_workflow_v1` verification semantics (`WAE-402`) while preserving dedicated-org replay context (`2026-03-13`).

## Lane D operator runbook (`WAE-304`)

### Ownership and SLA

| Concern | Owner | SLA | Notes |
|---|---|---|---|
| Nightly WAE regression failure triage | AI Runtime / eval gate DRI | Acknowledge within `1 business day`; classify as `infra`, `product regression`, or `gate contract drift` within the same window | Applies to scheduled `.github/workflows/wae-eval-gate.yml` failures. |
| Pre-rollout promotion block | Release owner for the candidate rollout | Acknowledge within `15 minutes`; decide `fix forward`, `revert`, or `hold rollout` within `60 minutes` | Promotion remains fail-closed until a fresh green gate exists. |
| Rollback execution | Release owner with AI Runtime approver | Start rollback within `30 minutes` of confirmed user-facing risk | Rollback must restore the last known passing rollout artifact set. |
| Artifact integrity / CI plumbing breakage | CI workflow maintainer | Triage within `4 hours` | Treat missing artifacts as a production-blocking gate failure, not a soft warning. |

### Escalation matrix

| Trigger | Primary escalation | Secondary escalation | Required action |
|---|---|---|---|
| `wae:eval:contracts` fails in nightly or pre-rollout flow | AI Runtime / eval gate DRI | CI workflow maintainer | Reproduce locally, classify failure source, and keep rollout blocked until contracts pass. |
| `wae:eval:regression` or `npm run test:e2e:desktop` fails on candidate rollout | Release owner | Product/ops approver for the affected agent rollout | Freeze promotion/distribution for the candidate version and attach failing Playwright artifacts to the incident thread. |
| `npm run qa:telemetry:guard` fails | Trust telemetry owner | AI Runtime / eval gate DRI | Treat as fail-closed telemetry contract drift; do not override rollout without a documented approval and follow-up fix. |
| Missing or stale `wae_rollout_gate_decision_v1` evidence | Release owner | AI Runtime approver | Re-run the gate on the same commit or revert; never publish/distribute/spawn on stale evidence. |
| User-facing regression escapes after a green gate | Release owner | Product/ops approver plus AI Runtime approver | Execute rollback and require a fresh green gate before retrying promotion. |

### Failure handling procedure

1. Preserve the failing GitHub Actions artifacts (`trace`, screenshots, HTML report, verdict summary) and link them in the incident thread before rerunning anything.
2. Reproduce on the failing commit with the exact gate commands in this order: `npm run wae:eval:contracts`, `npm run test:e2e:desktop`, `npm run qa:telemetry:guard`, `npm run docs:guard`. Run `npm run wae:eval:regression` when the failure is in the seeded-agent regression path or the nightly workflow.
3. Classify the failure as one of: `infra/startup`, `landing/app regression`, `eval contract drift`, `telemetry contract drift`, or `scorer/gate evidence drift`.
4. Keep promotion fail-closed until the reproduced failure is resolved and the full required gate set is green again on the candidate commit.

### Promotion-block procedure

1. Do not bypass rollout gating when `wae_rollout_gate_decision_v1` is missing, older than the `72h` freshness window, or carries critical reason-code budget violations.
2. Freeze publish/distribute/spawn actions for the affected agent or template version while investigation is active.
3. Prefer fix-forward only when the regression is isolated, the new gate run is green on the exact replacement commit, and artifacts are uploaded successfully.
4. Use revert/rollback when the regression is user-facing, the root cause is not yet understood, or gate evidence cannot be regenerated deterministically.

### Rollback procedure

1. Revert the candidate code or configuration that introduced the failing gate result.
2. Re-run the full pre-rollout gate set on the rollback commit: `npm run wae:eval:contracts`, `npm run test:e2e:desktop`, `npm run qa:telemetry:guard`, `npm run docs:guard`, plus `npm run wae:eval:regression` when seeded-agent coverage is part of the affected workflow.
3. Confirm the regenerated rollout evidence is fresh and that `wae_rollout_gate_decision_v1` now points at the rollback commit with passing verdicts.
4. Resume promotion only after the release owner and AI Runtime approver both confirm the rollback artifacts and verdict summary.

## Validation

1. `npm run docs:guard`
2. `npm run typecheck`
3. `npm run test:unit -- tests/unit/ai/toolContracts.test.ts tests/unit/ai/toolSuccessFailureTelemetry.test.ts tests/unit/ai/trustTelemetryDashboards.test.ts tests/unit/ai/toolCallParsingAdapter.test.ts`
4. `npm run test:integration`
5. `npm run test:e2e:desktop`
6. `npm run test:e2e:atx`
7. `npm run qa:telemetry:guard`

## Exit criteria

1. All rows through `WAE-404` are `DONE` with verification evidence logged.
2. Playwright harness covers seeded-agent critical tool pathways and negative paths.
3. Rollout gating blocks promotions on failing eval verdicts.
4. Improvement loop is live with explicit approval and rollback controls.
5. Queue docs (`INDEX.md`, `MASTER_PLAN.md`, `TASK_QUEUE.md`, `SESSION_PROMPTS.md`) are synchronized.

## Risks and mitigations

1. **Risk:** flaky e2e runs produce noisy gate decisions.  
   **Mitigation:** deterministic fixtures, artifact retention, and explicit retry policy with reason-code tracking.
2. **Risk:** eval data leaks across org scope.  
   **Mitigation:** strict org/user scoping in every read/write path and dedicated test org lifecycle contract.
3. **Risk:** overfitting agents to benchmark prompts only.  
   **Mitigation:** maintain mixed scenario sets (happy path, adversarial, and negative tool-path cases).
4. **Risk:** autonomous self-improvement introduces regressions.  
   **Mitigation:** approval token requirement, staged canary rollout, and automatic rollback on regression.
