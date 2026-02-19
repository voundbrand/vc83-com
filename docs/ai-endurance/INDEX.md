# AI Endurance Index

**Last updated:** 2026-02-18  
**Purpose:** Top-level map for endurance planning, including completed waves, open residuals, and CommonGround-inspired protocol upgrades.

---

## How to use this folder

1. Start with this index.
2. Use queue-first execution for delivery:
   - `docs/ai-endurance/AUTONOMOUS_EXECUTION_PROTOCOL.md`
   - `docs/ai-endurance/TASK_QUEUE.md`
   - `docs/ai-endurance/BLOCKERS.md`
3. Use plan files for implementation detail in `docs/ai-endurance/implementation-plans/`.
4. Keep `TASK_QUEUE.md`, this file, and `MASTER_PLAN.md` synchronized after each chunk.

---

## Autonomous mode

- Protocol: `docs/ai-endurance/AUTONOMOUS_EXECUTION_PROTOCOL.md`
- Queue: `docs/ai-endurance/TASK_QUEUE.md`
- Lane prompts: `docs/ai-endurance/SESSION_PROMPTS.md`
- Baseline audit: `docs/ai-endurance/IMPLEMENTATION_BASELINE_AUDIT.md`

---

## Plan authoring contract (CI enforced)

For every file in `docs/ai-endurance/implementation-plans/`:

- Use template: `docs/ai-endurance/PLAN_TEMPLATE.md`
- Include directive: `<!-- ci:ai-endurance-plan-template=v1 -->`

`npm run docs:guard` enforces this.

---

## Plan catalog

| # | Topic | Plan |
|---|---|---|
| 01 | Knowledge -> Recipes -> Skills foundation | `docs/ai-endurance/implementation-plans/01-knowledge-recipes-skills.md` |
| 02 | Tool/runtime separation from model behavior | `docs/ai-endurance/implementation-plans/02-tool-registry-execution-separation.md` |
| 03 | Layered tool scoping and safety | `docs/ai-endurance/implementation-plans/03-layered-tool-scoping-security.md` |
| 04 | Model discovery and platform enablement control plane | `docs/ai-endurance/implementation-plans/04-model-discovery-platform-control-plane.md` |
| 05 | Unified LLM policy router | `docs/ai-endurance/implementation-plans/05-llm-policy-router.md` |
| 06 | Dynamic pricing and cost governance | `docs/ai-endurance/implementation-plans/06-dynamic-pricing-cost-governance.md` |
| 07 | Two-stage failover (OpenClaw-inspired) | `docs/ai-endurance/implementation-plans/07-two-stage-failover-openclaw-pattern.md` |
| 08 | Session stickiness for model/auth routing | `docs/ai-endurance/implementation-plans/08-session-stickiness-model-auth.md` |
| 09 | RAG and org memory pipeline | `docs/ai-endurance/implementation-plans/09-rag-memory-pipeline.md` |
| 10 | Tool contracts and compatibility eval harness | `docs/ai-endurance/implementation-plans/10-tool-contracts-and-compat-evals.md` |
| 11 | Observability, SLOs, and release gates | `docs/ai-endurance/implementation-plans/11-observability-slos-and-release-gates.md` |
| 12 | Human approval and escalation durability | `docs/ai-endurance/implementation-plans/12-human-approval-and-escalation.md` |
| 13 | Control-plane and plugin boundary architecture | `docs/ai-endurance/implementation-plans/13-control-plane-plugin-boundaries.md` |
| 14 | Coordination kernel and turn state machine | `docs/ai-endurance/implementation-plans/14-coordination-kernel-turn-state-machine.md` |
| 15 | Inbox receipts, idempotency, delivery contract | `docs/ai-endurance/implementation-plans/15-inbox-idempotency-delivery-contract.md` |
| 16 | Harness runtime wiring and team state semantics | `docs/ai-endurance/implementation-plans/16-harness-runtime-wiring-and-team-state.md` |
| 17 | Core memory model and onboarding implementation | `docs/ai-endurance/implementation-plans/17-core-memory-model-and-onboarding-implementation.md` |
| 18 | Semantic memory retrieval and context assembly V2 | `docs/ai-endurance/implementation-plans/18-semantic-memory-retrieval-v2.md` |
| 19 | Soul-loop drift scoring and reflection unification | `docs/ai-endurance/implementation-plans/19-soul-loop-drift-scoring-and-reflection-unification.md` |
| 20 | AI failure playbooks and runtime operability | `docs/ai-endurance/implementation-plans/20-ai-failure-playbooks-and-operability.md` |
| 21 | AI runtime hotspot refactor V2 | `docs/ai-endurance/implementation-plans/21-ai-runtime-hotspot-refactor-v2.md` |

---

## Execution sequence

### Completed wave (archive)
- Plans 05, 06, 07, 08, 09, 10, 11, 12 delivered.
- Lane F hardening and Lane G production closure delivered.

### Active wave H-L (queue-driven)
- Lane H: Plans 14 + 15 (CommonGround coordination kernel + receipt/idempotency borrow)
- Lane I: Plans 16 + 19 (harness/team semantics + soul-loop unification)
- Lane J: Plans 17 + 18 (core memory + semantic retrieval)
- Lane K: Plan 20 + residual closure from Plans 01/02/03/04/13
- Lane L: Plan 21 (runtime hotspot refactor after kernel/memory stabilization)

Lane H progress checklist:
- [x] `WSH-01` schema foundation (`agentTurns` + `executionEdges` + transition enums)
- [x] `WSH-02` lease/CAS helpers
- [x] `WSH-03` turn-first inbound runtime + `turnId` propagation
- [x] `WSH-04` handoff/escalation turn transitions + stale-turn recovery
- [x] `WSH-05` inbox receipt schema + receipt-first ingress
- [x] `WSH-06` idempotency/dedupe ack + one terminal deliverable pointer
- [x] `WSH-07` receipt operations queries + replay-safe debug endpoints

Lane K progress checklist:
- [x] `WSK-01` canonical operability playbooks with runtime identifier mapping
- [x] `WSK-02` operability checklist, ownership map, and tabletop evidence links
- [x] `WSK-03` unified typed knowledge composition contract + load telemetry
- [x] `WSK-04` shared tool parsing/normalization adapter across chat + agent
- [x] `WSK-05` org-level allow/deny matrix and policy-audit coverage
- [x] `WSK-06` model lifecycle retirement/deprecation workflow + safety checks
- [x] `WSK-07` channel adapter conformance + credential boundary hardening

Lane K operability ownership map:

| Scenario | Primary owner | Secondary owner | Evidence link |
|---|---|---|---|
| Model outage / provider instability | Platform AI on-call | Runtime reliability | `docs/ai-endurance/BLOCKERS.md#tt-20-a-model-outage` |
| Tool degradation / receipt instability | Runtime reliability | Platform AI on-call | `docs/ai-endurance/BLOCKERS.md#tt-20-b-tool-degradation` |
| Cost spike / budget integrity | AI economics owner | Platform AI on-call | `docs/ai-endurance/BLOCKERS.md#tt-20-c-cost-spike` |

---

## Status board

| Plan | Status | Queue IDs |
|---|---|---|
| 01 | `DONE (residual closed)` | `WSK-03` |
| 02 | `DONE (residual closed)` | `WSK-04` |
| 03 | `DONE (residual closed)` | `WSK-05` |
| 04 | `DONE (residual closed)` | `WSK-06` |
| 05 | `DONE` | Archive (`WS1-*`) |
| 06 | `DONE` | Archive (`WS2-*`) |
| 07 | `DONE` | Archive (`WSG-02`) |
| 08 | `DONE` | Archive (`WSG-03`) |
| 09 | `DONE` | Archive (`WS4-*`) |
| 10 | `DONE` | Archive (`WS3-*`) |
| 11 | `DONE` | Archive (`WS5-*`, `WSG-01`) |
| 12 | `DONE` | Archive (`WSG-04`, `WSG-05`) |
| 13 | `DONE (residual closed)` | `WSK-07` |
| 14 | `DONE` | `WSH-01..WSH-04` |
| 15 | `DONE` | `WSH-05..WSH-07` |
| 16 | `DONE` | `WSI-01..WSI-03` |
| 17 | `DONE` | `WSJ-01..WSJ-03` |
| 18 | `DONE` | `WSJ-04..WSJ-06` |
| 19 | `DONE` | `WSI-04..WSI-06` |
| 20 | `DONE` | `WSK-01..WSK-02` |
| 21 | `DONE` | `WSL-01..WSL-06` |

---

## Codebase anchors

- Chat runtime: `convex/ai/chat.ts`
- Agent runtime: `convex/ai/agentExecution.ts`
- Team runtime: `convex/ai/teamHarness.ts`
- Soul/reflection: `convex/ai/soulEvolution.ts`, `convex/ai/selfImprovement.ts`
- Knowledge retrieval: `convex/organizationMedia.ts`, `convex/ai/memoryComposer.ts`
- Tool registry/scoping: `convex/ai/tools/registry.ts`, `convex/ai/toolScoping.ts`
- Model control plane: `convex/ai/modelDiscovery.ts`, `convex/ai/platformModelManagement.ts`

CommonGround reference source folder:
- `docs/reference_projects/CommonGround/`

---

## Queue resume prompt

```text
Resume execution from docs/ai-endurance/TASK_QUEUE.md.
Process only READY tasks using dependency order and lane rules.
For each task: list top 3 risks, implement, run queue verification commands, update TASK_QUEUE.md + relevant docs.
If blocked >15 minutes or after 3 failed attempts, mark BLOCKED in TASK_QUEUE.md, log to BLOCKERS.md, and continue.
Stop only for required approvals or no promotable tasks.
```
