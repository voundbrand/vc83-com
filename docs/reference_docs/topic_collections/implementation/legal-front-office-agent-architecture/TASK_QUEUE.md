# Legal Front Office Agent Architecture Task Queue

**Last updated:** 2026-03-26  
**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/legal-front-office-agent-architecture`  
**Source analysis:** `/Users/foundbrand_001/Development/vc83-com/convex/ai/agents/ARCHITECTURE_REALITY_ANALYSIS_2026-03-26.md`  
**Source topology guide:** `/Users/foundbrand_001/Development/vc83-com/convex/ai/agents/TOPOLOGY_GUIDE.md`

---

## Queue rules

1. Allowed statuses are only: `READY`, `IN_PROGRESS`, `PENDING`, `BLOCKED`, `DONE`.
2. Row schema is fixed and must remain exact: `ID | Lane | Plan | Priority | Status | Depends On | Task | Primary files | Verify | Notes`.
3. At most one row may be `IN_PROGRESS` globally.
4. Deterministic pick order is `P0` before `P1`, then lexical `ID`.
5. Promote `PENDING` to `READY` only when all dependencies are `DONE`.
6. Every row must run listed `Verify` commands exactly before moving to `DONE`.
7. Any fail-closed boundary (authority, compliance, evidence, org isolation) must remain fail-closed through all changes.
8. Keep `TASK_QUEUE.md`, `INDEX.md`, `MASTER_PLAN.md`, and `SESSION_PROMPTS.md` synchronized on every state transition.

---

## Verification profiles

| Profile | Command |
|---|---|
| `V-DOCS` | `npm run docs:guard` |
| `V-TYPE` | `npm run typecheck` |
| `V-UNIT-AI` | `npm run test:unit -- tests/unit/ai/runtimeModuleRegistry.test.ts tests/unit/ai/agentSpecRegistry.contract.test.ts tests/unit/ai/agentExecutionHotspotCharacterization.test.ts` |
| `V-UNIT-COMPLIANCE` | `npm run test:unit -- tests/unit/compliance/complianceShadowModeEvaluator.test.ts tests/unit/ai/orgActionRuntimeTopologyContract.test.ts` |
| `V-UNIT-TELEPHONY` | `npm run test:unit -- tests/unit/telephony/telephonyIntegration.test.ts tests/unit/ai/telephonyWebhookCompatibilityBridge.test.ts` |

---

## Execution lanes

| Lane | Purpose | Primary ownership | Merge-overlap policy |
|---|---|---|---|
| `A` | Architecture and contract docs finalization | workstream docs + `convex/ai/agents/*.md` | no runtime behavior changes |
| `B` | Runtime module extraction and topology declaration | `convex/ai/agents/*`, `convex/onboarding/seedPlatformAgents.ts`, `convex/ai/agentExecution.ts` | avoid telephony provider sync edits |
| `C` | Clara -> Helena handoff and compliance gating | `convex/ai/agentExecution.ts`, `convex/complianceControlPlane.ts`, schemas | preserve fail-closed semantics |
| `D` | ElevenLabs lifecycle governance and roster cleanup | `scripts/ai/elevenlabs/*`, rollout docs | keep inactive assets preserved, not deleted |
| `E` | Synthetic legal-org fixture and validation gates | test fixtures + unit tests + workstream docs | only after B/C P0 completion |

---

## Dependency-based status flow

1. Lane `A` must be `DONE` before any lane `B` or lane `C` row starts.
2. Lane `D` starts only after `LFA-004` and `LFA-006` are `DONE`.
3. Lane `E` starts only after lane `B` and lane `C` P0 rows are `DONE`.
4. Any blocked `P0` row halts promotion of dependent rows.

---

## Task queue

| ID | Lane | Plan | Priority | Status | Depends On | Task | Primary files | Verify | Notes |
|---|---|---:|---|---|---|---|---|---|---|
| `LFA-001` | `A` | 1 | `P0` | `DONE` | - | Finalize canonical target architecture docs with explicit roles: `Clara` (voice concierge), `Helena` (back-office worker), `Compliance Evaluator`, `Quinn` (onboarding). | `/Users/foundbrand_001/Development/vc83-com/convex/ai/agents/ARCHITECTURE_REALITY_ANALYSIS_2026-03-26.md`; `/Users/foundbrand_001/Development/vc83-com/convex/ai/agents/TOPOLOGY_GUIDE.md`; `/Users/foundbrand_001/Development/vc83-com/convex/ai/agents/ARCHITECTURE.md` | `npm run docs:guard` | Completed 2026-03-26: canonical role boundaries and legal execution rail locked in source-of-truth docs. |
| `LFA-002` | `B` | 1 | `P0` | `DONE` | `LFA-001` | Add explicit topology declarations (`runtimeTopologyProfile`, `runtimeTopologyAdapter`) for seeded protected templates that currently rely on heuristic inference. | `/Users/foundbrand_001/Development/vc83-com/convex/onboarding/seedPlatformAgents.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/ai/agentExecution.ts` | `npm run typecheck`; `npm run test:unit -- tests/unit/ai/orgActionRuntimeTopologyContract.test.ts`; `npm run docs:guard` | Completed 2026-03-26: seeded protected templates now declare explicit topology profile+adapter and runtime rejects adapter/profile mismatches. |
| `LFA-003` | `B` | 1 | `P0` | `DONE` | `LFA-002` | Extract `Quinn` onboarding runtime module scaffold (`convex/ai/agents/quinn/*`) and register in module registry without behavior change. | `/Users/foundbrand_001/Development/vc83-com/convex/ai/agents/quinn/runtimeModule.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/ai/agents/quinn/prompt.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/ai/agents/runtimeModuleRegistry.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/ai/agentExecution.ts` | `npm run typecheck`; `npm run test:unit -- tests/unit/ai/runtimeModuleRegistry.test.ts tests/unit/ai/agentExecutionHotspotCharacterization.test.ts`; `npm run docs:guard` | Completed 2026-03-26: Quinn runtime module scaffold is registered and activates only via explicit runtime module key. |
| `LFA-004` | `B` | 1 | `P0` | `DONE` | `LFA-003` | Add new `Helena` back-office runtime module scaffold and topology contract (`pipeline_router`) with deterministic tool manifest boundaries. | `/Users/foundbrand_001/Development/vc83-com/convex/ai/agents/helena/runtimeModule.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/ai/agents/helena/prompt.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/ai/agents/runtimeModuleRegistry.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/ai/agentSpecRegistry.ts` | `npm run typecheck`; `npm run test:unit -- tests/unit/ai/runtimeModuleRegistry.test.ts tests/unit/ai/agentSpecRegistry.contract.test.ts`; `npm run docs:guard` | Completed 2026-03-26: Helena module scaffold, pipeline topology mapping, and deterministic tool manifest boundaries are registered. |
| `LFA-005` | `C` | 2 | `P0` | `DONE` | `LFA-001` | Define and enforce `structured_handoff_packet` schema for voice-intake transfer from Clara to Helena. | `/Users/foundbrand_001/Development/vc83-com/convex/schemas/aiSchemas.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/ai/agentExecution.ts`; `/Users/foundbrand_001/Development/vc83-com/tests/unit/ai` | `npm run typecheck`; `npm run test:unit -- tests/unit/ai/agentExecutionVoiceRuntime.test.ts tests/unit/ai/telephonyWebhookCompatibilityBridge.test.ts`; `npm run docs:guard` | Completed 2026-03-26: structured handoff packet schema is enforced fail-closed and injected into runtime context when valid. |
| `LFA-006` | `C` | 2 | `P0` | `DONE` | `LFA-005`, `LFA-004` | Wire Clara -> Helena execution path and mandatory compliance evaluator gate before outward commitments. | `/Users/foundbrand_001/Development/vc83-com/convex/ai/agentExecution.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/complianceControlPlane.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/ai/orgActionPolicy.ts` | `npm run typecheck`; `npm run test:unit -- tests/unit/compliance/complianceShadowModeEvaluator.test.ts tests/unit/ai/agentExecutionVoiceRuntime.test.ts`; `npm run docs:guard` | Completed 2026-03-26: legal outward-commitment intent + mandatory evaluator gate are enforced fail-closed before tool dispatch, with gate telemetry in audit and response payloads. |
| `LFA-007` | `D` | 3 | `P1` | `DONE` | `LFA-004`, `LFA-006` | Add explicit active/inactive lifecycle metadata for ElevenLabs roster and default sync/deploy behavior to active subset only. | `/Users/foundbrand_001/Development/vc83-com/scripts/ai/elevenlabs/lib/catalog.ts`; `/Users/foundbrand_001/Development/vc83-com/scripts/ai/elevenlabs/sync-elevenlabs-agent.ts`; `/Users/foundbrand_001/Development/vc83-com/scripts/ai/elevenlabs/README.md` | `npm run typecheck`; `npm run test:unit -- tests/unit/telephony/telephonyIntegration.test.ts`; `npm run docs:guard` | Completed 2026-03-26: lifecycle governance now marks specialist roster members inactive-by-default while preserving their assets and enabling explicit full-catalog sync via `--all`. |
| `LFA-008` | `D` | 3 | `P1` | `DONE` | `LFA-007` | Formalize Veronica boundary and deployment expectations relative to Clara legal/demo flows. | `/Users/foundbrand_001/Development/vc83-com/convex/ai/agents/elevenlabs/landing-demo-agents/README.md`; `/Users/foundbrand_001/Development/vc83-com/scripts/ai/elevenlabs/lib/catalog.ts`; `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/legal-front-office-agent-architecture/MASTER_PLAN.md` | `npm run docs:guard`; `npm run typecheck` | Completed 2026-03-26: Veronica boundary is codified as separate-line adjacent runtime with explicit non-default Clara routing expectations. |
| `LFA-009` | `E` | 4 | `P0` | `DONE` | `LFA-004`, `LFA-006` | Build synthetic legal test-organization fixture package for repeatable intake/back-office/compliance scenarios. | `/Users/foundbrand_001/Development/vc83-com/tests/fixtures`; `/Users/foundbrand_001/Development/vc83-com/tests/unit/ai`; `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/legal-front-office-agent-architecture/MASTER_PLAN.md` | `npm run typecheck`; `npm run test:unit -- tests/unit/ai/agentExecutionVoiceRuntime.test.ts tests/unit/compliance/complianceShadowModeEvaluator.test.ts`; `npm run docs:guard` | Completed 2026-03-26: synthetic legal-front-office fixture package now covers urgent callback, evidence follow-up, and informational intake scenarios reused by AI/compliance regression tests. |
| `LFA-010` | `E` | 4 | `P0` | `DONE` | `LFA-009` | Ship regression matrix for legal-front-office critical path and update runbook + rollout checks. | `/Users/foundbrand_001/Development/vc83-com/tests/unit/ai`; `/Users/foundbrand_001/Development/vc83-com/tests/unit/compliance`; `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/legal-front-office-agent-architecture/INDEX.md`; `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/legal-front-office-agent-architecture/MASTER_PLAN.md` | `npm run typecheck`; `npm run test:unit`; `npm run docs:guard` | Completed 2026-03-26: legal-front-office regression matrix and rollout checks are now codified in AI/compliance test suites and workstream runbooks. |

---

## Current kickoff

1. Active row: `none` (queue complete).
2. Deterministic next row: `none` (all rows `DONE`).
3. Active row count: `0`.
