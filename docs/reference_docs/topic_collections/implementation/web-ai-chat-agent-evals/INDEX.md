# Web AI Chat Agent Evals Index

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/web-ai-chat-agent-evals`
**Source brief:** Use web AI chat + Playwright to extensively test seeded agents, validate tool usage, and improve rollout quality with eval-driven gates.
**Execution mode:** Deterministic queue-first with docs-CI enforcement

## Canonical files

- Queue: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/web-ai-chat-agent-evals/TASK_QUEUE.md`
- Session prompts: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/web-ai-chat-agent-evals/SESSION_PROMPTS.md`
- Master plan: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/web-ai-chat-agent-evals/MASTER_PLAN.md`
- Eval-org lifecycle contract: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/web-ai-chat-agent-evals/EVAL_ORG_LIFECYCLE_CONTRACT.md`
- Agent eval specs index: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/web-ai-chat-agent-evals/AGENT_EVAL_SPECS.md`
- Scenario matrix (machine-readable): `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/web-ai-chat-agent-evals/AGENT_EVAL_SCENARIO_MATRIX.json`
- Lane `D` operator runbook: `MASTER_PLAN.md` (`## Lane D operator runbook (WAE-304)`)
- Individual agent specs: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/web-ai-chat-agent-evals/agent-specs/` (one file per agent)

## Scope summary

Included:

1. Per-agent behavioral eval specs derived from product conversations.
2. Seeded-agent scenario matrix and deterministic Playwright eval harness.
3. Tool-usage verification (required tool, forbidden tool, no-tool paths).
4. Eval telemetry envelopes, scoring, and rollout promotion gates.
5. Recursive improvement loop with human approval and rollback controls.

Excluded:

1. Non-agent product features unrelated to eval coverage.
2. Rewriting the chat runtime architecture beyond eval hooks/contracts.
3. Unscoped autonomous production mutation without approval.

## Linked implementation plans

Certain eval scenarios require features that do not exist yet. These are tracked as separate implementation workstreams:

| Feature | Plan root | Blocks |
|---|---|---|
| Onboarding customization passthrough | `docs/reference_docs/topic_collections/implementation/onboarding-customization-passthrough/` | `Q-007`, `Q-010`, `OOO-013`, `OOO-014` |
| Agent self-naming + "I'm here" arrival | `docs/reference_docs/topic_collections/implementation/agent-self-naming-arrival/` | `Q-009`, partial `Q-001`, `OOO-017` |
| Voice personality inference | `docs/reference_docs/topic_collections/implementation/voice-personality-inference/` | `OOO-015` |
| Agent architecture decoupling (`Agents | Slack | Vacation Planning` + tool-domain boundaries) | `docs/reference_projects/elevenlabs/implementation-eleven-agents-rollout/` | Cross-agent domain-isolation assertions and portfolio invariants (linked to `ELA-045`..`ELA-059`) |

## Phase summary

| Phase | Lane | Goal | Completion rows |
|---|---|---|---|
| `1` | `A` | Freeze contracts, capture agent behavioral specs, build seed matrix | `WAE-001`..`WAE-003` (including `WAE-002a`, `WAE-002b`, `WAE-002c`) |
| `2` | `B` | Build eval data plane + telemetry contracts | `WAE-101`..`WAE-104` |
| `3` | `C` | Build Playwright execution engine | `WAE-201`..`WAE-204` |
| `4` | `D` | Add scoring and rollout gating | `WAE-301`..`WAE-304` |
| `5` | `E` | Add recursive improvement loop | `WAE-401`..`WAE-404` |

## Current queue snapshot

| Lane | IDs | Status snapshot |
|---|---|---|
| `A` | `WAE-001`..`WAE-003` | `READY` x1 (`WAE-001`), `DONE` x4 (`WAE-002a`, `WAE-002b`, `WAE-002c`, `WAE-003`) |
| `B` | `WAE-101`..`WAE-104` | `DONE` x4 (`WAE-101`, `WAE-102`, `WAE-103`, `WAE-104`) |
| `C` | `WAE-201`..`WAE-204` | `DONE` x4 (`WAE-201`, `WAE-202`, `WAE-203`, `WAE-204`) |
| `D` | `WAE-301`..`WAE-304` | `DONE` x4 (`WAE-301`, `WAE-302`, `WAE-303`, `WAE-304`) |
| `E` | `WAE-401`..`WAE-404` | `DONE` x3 (`WAE-401`, `WAE-402`, `WAE-403`), `READY` x1 (`WAE-404`) |

## READY-first execution list

1. `WAE-404` (`READY`, not started)

## Required gates

1. `npm run docs:guard`
2. `npm run typecheck`
3. verification commands listed in `TASK_QUEUE.md`

## Latest update

1. `2026-03-11`: Initialized queue-first workstream artifacts for world-class web-chat agentic evals using seed-agent matrix + Playwright execution + scoring gates + recursive improvement loop.
2. `2026-03-11`: Added `AGENT_EVAL_SPECS.md` as canonical file. Split `WAE-002` into `WAE-002a` (agent behavioral conversations) and `WAE-002b` (codify eval matrix). Created linked implementation plans for `onboarding-customization-passthrough` and `agent-self-naming-arrival`.
3. `2026-03-11`: Completed all active-agent behavioral specs in `WAE-002a` (4/4 active agents) and documented decommissioned template agent cleanup row `WAE-002c`. Added explicit architecture-decoupling dependency linkage to Eleven rollout lane `J` (`ELA-045`..`ELA-059`).
4. `2026-03-11`: Completed `WAE-002b` by publishing `AGENT_EVAL_SCENARIO_MATRIX.json` (51 machine-readable scenario rows + domain-isolation, adapter-boundary, and portfolio-invariant assertion sets aligned to `ELA-045`..`ELA-059`).
5. `2026-03-11`: Completed `WAE-002c` decommission cleanup (seed roster removal, docs cleanup, and decommissioned spec file removal).
6. `2026-03-11`: Added `EVAL_ORG_LIFECYCLE_CONTRACT.md` as deterministic source-of-truth for Playwright eval-org create/reset/teardown, seed/version pinning, drift handling, fail-closed conditions, retry policy, and lifecycle evidence artifacts (`WAE-003` scope).
7. `2026-03-11`: Completed `WAE-003` and opened lane `B` entry row `WAE-101` (`READY`) after required verification passed (`npm run docs:guard`, `npm run typecheck`).
8. `2026-03-11`: Completed `WAE-101` eval-run envelope persistence (additive `evalEnvelope` contract on tool execution records + eval run indexes) and promoted `WAE-102` to `READY` after verification passed (`npm run typecheck`, `npm run test:unit -- tests/unit/ai/toolContracts.test.ts tests/unit/ai/toolSuccessFailureTelemetry.test.ts tests/unit/ai/trustTelemetryDashboards.test.ts tests/unit/ai/toolCallParsingAdapter.test.ts`, `npm run docs:guard`).
9. `2026-03-11`: Completed `WAE-102` by adding org-scoped eval trace retrieval APIs for run playback, run diffing, and promotion evidence packet assembly with fail-closed lifecycle evidence checks and strict org/user/session scope enforcement (`npm run typecheck`, `npm run test:integration`, `npm run docs:guard`); promoted `WAE-103` to `READY`.
10. `2026-03-11`: Completed `WAE-103` by adding deterministic eval lifecycle trust-event taxonomy (`trust.lifecycle.eval_run_state_transition.v1`), normalized reason-code contract for lifecycle + fail-closed conditions, org-scoped lifecycle trust-event emission in eval tool execution flow, and lifecycle snapshot fields in playback/diff/evidence payloads (`npm run typecheck`, `npm run test:unit -- tests/unit/ai/toolContracts.test.ts tests/unit/ai/toolSuccessFailureTelemetry.test.ts tests/unit/ai/trustTelemetryDashboards.test.ts tests/unit/ai/toolCallParsingAdapter.test.ts`, `npm run docs:guard`); promoted `WAE-104` to `READY`.
11. `2026-03-11`: Completed `WAE-104` by adding additive unit/integration coverage for eval envelope integrity (`wae_eval_run_envelope_v1`), deterministic tool accounting parity across playback/diff/evidence payloads, lifecycle snapshot assertions (`lifecycleSnapshotContractVersion`, lifecycle state, lexical normalized reason codes), and fail-closed replay handling for missing/mismatched lifecycle evidence paths. Verification passed: `npm run typecheck`, `npm run test:unit -- tests/unit/ai/toolContracts.test.ts tests/unit/ai/toolSuccessFailureTelemetry.test.ts tests/unit/ai/trustTelemetryDashboards.test.ts tests/unit/ai/toolCallParsingAdapter.test.ts`, `npm run test:integration`, `npm run docs:guard`; promoted `WAE-201` to `READY`.
12. `2026-03-11`: Completed `WAE-201` with deterministic WAE Playwright fixture scaffolding for authenticated web chat eval sessions (`tests/e2e/utils/wae-eval-fixture.ts`, `tests/e2e/wae-global-setup.ts`) and env-gated desktop/ATX config wiring (`PLAYWRIGHT_WAE_ENABLE=1`) for deterministic org identity + lifecycle evidence artifact emission. Verification passed: `npm run test:e2e:desktop`, `npm run docs:guard`; promoted `WAE-202` to `READY`.
13. `2026-03-12`: Completed `WAE-202` by adding deterministic scenario DSL generation from `AGENT_EVAL_SCENARIO_MATRIX.json` + `AGENT_EVAL_SPECS.md` (`tests/e2e/utils/wae-scenario-dsl.ts`), including lexical ID ordering, full/partial `PENDING_FEATURE` gate handling, and deterministic `SKIPPED` reason-code behavior; added desktop Playwright DSL contract coverage (`tests/e2e/wae-scenario-dsl.spec.ts`) and wired it into `playwright.desktop.config.ts`. Verification passed: `npm run test:e2e:desktop`, `npm run docs:guard`; promoted `WAE-203` to `READY`.
14. `2026-03-12`: Completed `WAE-203` by adding extensive seeded-agent ATX Playwright coverage from the WAE matrix/DSL (`tests/e2e/wae-seeded-agent-evals.spec.ts`) plus reusable scenario contract + deterministic retry artifact retention harness utilities (`tests/e2e/utils/wae-scenario-eval-harness.ts`). Coverage now validates required tool pathways, forbidden-tool non-usage, negative-path handling, and `PENDING_FEATURE` `SKIPPED` semantics. Verification passed: `npm run test:e2e:atx`, `npm run qa:telemetry:guard`, `npm run docs:guard`; promoted `WAE-204` to `READY`.
15. `2026-03-13`: Completed `WAE-204` by aligning WAE seeded-agent suite artifacts to deterministic run IDs, emitting schema-versioned scorer-ingestion bundles under `tmp/reports/wae/<runId>/bundle/` (`scenario-records.jsonl`, `run-records.jsonl`, `trace-metadata.json`, `bundle-index.json`), and refreshing lifecycle evidence indexes with Playwright artifact + bundle pointers. Verification passed: `npm run test:e2e:atx`, `npm run docs:guard`; promoted `WAE-301` to `READY`.
16. `2026-03-13`: Completed `WAE-301` weighted scorer verification (`npm run typecheck`, `npm run test:unit -- tests/unit/ai/toolContracts.test.ts tests/unit/ai/toolSuccessFailureTelemetry.test.ts tests/unit/ai/trustTelemetryDashboards.test.ts tests/unit/ai/toolCallParsingAdapter.test.ts`, `npm run docs:guard`) and started `WAE-302`. Lane `D` rollout verification now targets mutation-path/unit gate coverage (`tests/unit/ai/agentOntologyMutationPaths.test.ts`, `tests/unit/ai/spawnUseCaseAgentCatalogBinding.test.ts`, `tests/unit/ai/workerPool.waeRolloutGate.test.ts`).
17. `2026-03-13`: Completed `WAE-302` by persisting `wae_rollout_gate_decision_v1` artifacts in admin flow, enforcing fail-closed WAE evidence checks on template publish/distribute and managed clone spawning, and verifying `npm run typecheck`, `npm run test:unit -- tests/unit/ai/agentOntologyMutationPaths.test.ts tests/unit/ai/spawnUseCaseAgentCatalogBinding.test.ts tests/unit/ai/workerPool.waeRolloutGate.test.ts`, and `npm run docs:guard`. Promoted `WAE-303` to `READY`.
18. `2026-03-13`: Completed `WAE-303` by restoring the live One-of-One landing-page audit handoff surface needed by `tests/e2e/onboarding-audit-handoff.spec.ts` and updating the spec to wait on the functional audit surface rather than obsolete hero copy. Verification passed: `npm run test:e2e:desktop` (`7 passed`), `npm run qa:telemetry:guard`, `npm run docs:guard`.
19. `2026-03-13`: Completed `WAE-304` by publishing the lane `D` operator runbook in `MASTER_PLAN.md` with owner, SLA, escalation matrix, failure-handling procedure, promotion-block procedure, and rollback criteria. Verification passed: `npm run docs:guard`. Lane `D` is now closed and `WAE-401` is `READY`.
20. `2026-03-13`: Completed `WAE-401` by landing deterministic recommendation packets in `convex/ai/tools/evalAnalystTool.ts` and `convex/ai/selfImprovement.ts`, adding unit coverage in `tests/unit/ai/toolSuccessFailureTelemetry.test.ts`, and fixing the root `test:unit` script so canonical file-scoped WAE verification no longer expands to the full unit suite. Verification passed: `npm run typecheck`, `npm run test:unit -- tests/unit/ai/toolContracts.test.ts tests/unit/ai/toolSuccessFailureTelemetry.test.ts tests/unit/ai/trustTelemetryDashboards.test.ts tests/unit/ai/toolCallParsingAdapter.test.ts` (`4 files`, `34 passed`), and `npm run docs:guard`. `WAE-402` is now `READY`.
21. `2026-03-13`: Completed `WAE-402` by adding `wae_improvement_workflow_v1` in `convex/ai/selfImprovement.ts` and extending `soulProposals` with WAE workflow metadata in `convex/schemas/soulEvolutionSchemas.ts`. The workflow stages WAE recommendations into owner-approved soul proposals, requires exact approval-checkpoint matching before apply, creates rollback-ready soul baseline checkpoints, and automatically rolls back when post-apply WAE verification regresses. Verification passed: `npm run typecheck`, `npm run test:unit -- tests/unit/ai/agentOntologyMutationPaths.test.ts tests/unit/ai/spawnUseCaseAgentCatalogBinding.test.ts tests/unit/ai/workerPool.waeRolloutGate.test.ts tests/unit/ai/selfImprovementWaeWorkflow.test.ts` (`4 files`, `34 passed`), and `npm run docs:guard`. `WAE-403` is now `READY`.
22. `2026-03-13`: Started `WAE-403` to add deterministic baseline-vs-candidate canary evidence on a dedicated Playwright org, reusing the existing WAE scorer, rollout-gate, and rollback workflow contracts without starting `WAE-404`.
23. `2026-03-13`: Completed `WAE-403` by adding deterministic canary evidence emission in `tests/e2e/utils/wae-canary-evidence.ts`, projecting baseline and candidate bundles through the existing scorer + rollout-gate contracts, and extending `tests/e2e/wae-seeded-agent-evals.spec.ts` to emit both promotion and rollback evidence bundles under `tmp/reports/wae/<candidateRunId>/canary/`. Verification passed: `npm run test:e2e:atx` (`49 passed`), `npm run qa:telemetry:guard`, and `npm run docs:guard`. `WAE-404` is now `READY` but remains unstarted.
