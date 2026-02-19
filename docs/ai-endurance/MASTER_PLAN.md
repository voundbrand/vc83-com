# AI Endurance Master Plan

**Date:** 2026-02-18  
**Scope:** Keep `vc83-com` durable under rapid model/provider/tool changes while scaling from single-agent behavior to reliable multi-agent coordination.

---

## 0. Planning surfaces

- Queue-first execution: `docs/ai-endurance/TASK_QUEUE.md`
- Session lane prompts: `docs/ai-endurance/SESSION_PROMPTS.md`
- Deep-dive plans: `docs/ai-endurance/INDEX.md`
- Baseline audit: `docs/ai-endurance/IMPLEMENTATION_BASELINE_AUDIT.md`

---

## 1. Mission

Build a model-agnostic AI platform where runtime coordination, memory, safety policy, and operability remain stable even as models and providers change.

---

## 2. Current baseline

Delivered and hardened:
- Policy/cost/failover/stickiness foundation (Plans 05-08).
- RAG v1 + contracts + observability + approval durability (Plans 09-12).
- Production closure lane completed (`WSG-*`).

Open and re-activated in this wave:
- Residual unfinished seams in Plans 01/02/03/04/13.
- CommonGround borrow implementation (Plans 14-15).
- Harness/memory/soul unification and operability closure (Plans 16-20).
- Hotspot refactor wave v2 (Plan 21).

---

## 3. Endurance principles

1. **Protocol over heuristics**: coordination state is explicit and replay-safe.
2. **Model-agnostic core**: business behavior is not tied to a model ID.
3. **Stable tool contracts**: tool interfaces are versioned, tested, and policy-gated.
4. **Memory over prompt bloat**: retrieval and structure beat giant static prompts.
5. **Human-as-agent participation**: approvals/escalations are first-class runtime states.
6. **Operability by default**: alerts map to runbooks with clear owners.

---

## 4. Workstreams

| Workstream | Plans | Status | Queue lanes |
|---|---|---|---|
| WS1 Policy control plane | 05 | `DONE` | Archive (`WS1-*`) |
| WS2 Pricing/cost integrity | 06 | `DONE` | Archive (`WS2-*`) |
| WS3 Tool contract reliability | 10 | `DONE` | Archive (`WS3-*`) |
| WS4 Knowledge pipeline v1 | 09 | `DONE` | Archive (`WS4-*`) |
| WS5 Observability/SLOs v1 | 11 | `DONE` | Archive (`WS5-*`) |
| WS6 Security/refactor seam v1 | 13 | `DONE (residual closed)` | `WSK-07` |
| WS7 Coordination kernel | 14 | `DONE` | `WSH-01..WSH-04` |
| WS8 Receipts + idempotency contract | 15 | `DONE` | `WSH-05..WSH-07` |
| WS9 Harness/team semantics | 16 | `DONE` | `WSI-01..WSI-03` |
| WS10 Core memory + semantic retrieval | 17, 18 | `DONE` | `WSJ-01..WSJ-06` |
| WS11 Soul-loop drift unification | 19 | `DONE` | `WSI-04..WSI-06` |
| WS12 Operability + residual closure | 20 + residual 01/02/03/04/13 | `DONE` | `WSK-01..WSK-07` |
| WS13 Hotspot refactor v2 | 21 | `DONE` | `WSL-01..WSL-06` |

---

## 5. Phase plan

## Phase 0-5 (completed baseline)

- [x] Phase 0: policy unification
- [x] Phase 1: cost/fallback hardening
- [x] Phase 2: tool contracts + eval gates
- [x] Phase 3: knowledge pipeline completion (v1)
- [x] Phase 4: SLO publication + partial cleanup
- [x] Phase 5: production closure lane (G)

## Phase 6 (next): Coordination kernel + receipt contract

- [x] Implement explicit turn state machine and lease/CAS semantics (Plan 14).
- [x] Move all ingress to receipt-first idempotent contract with terminal deliverable pointer (Plan 15).
- [x] `WSH-01`: Added `agentTurns` + `executionEdges` schema contracts and turn transition enums.
- [x] `WSH-02`: Lease helpers (`acquire`, `heartbeat`, `release`, `fail`) with optimistic concurrency.
- [x] `WSH-03`: Turn-first inbound runtime path and `turnId` propagation.
- [x] `WSH-04`: Handoff/escalation turn transitions and stale-turn recovery.
- [x] `WSH-05`: Receipt schema and receipt-first ingress helper.
- [x] `WSH-06`: Idempotency keys, dedupe ack semantics, terminal deliverable pointer enforcement.
- [x] `WSH-07`: Receipt operations queries and replay-safe debug endpoints.

**Exit criteria:** duplicate inbound deliveries cannot create duplicate side effects; runtime progression is turn-driven and replay-safe.

## Phase 7: Harness/memory/soul integration

- [x] Wire harness context into runtime and formalize team handoff contract (Plan 16).
- [x] Ship core memory anchors through onboarding and soul lifecycle (Plan 17).
- [x] Upgrade retrieval to semantic + citation-aware context assembly (Plan 18).
- [x] Unify reflection engine and drift-aware soul policy enforcement (Plan 19).

**Exit criteria:** one reflection engine, memory anchors are immutable-by-default, semantic retrieval is production with fallback and telemetry.

## Phase 8: Operability + residual plan closure

- [x] Publish and link runbooks for model outage, tool degradation, cost spikes (Plan 20).
- [x] Close unfinished seams from Plans 01/02/03/04/13.
- [x] `WSK-01`: canonical playbooks published with runtime identifier mappings (`ai/platformAlerts`, `ai/agentSessions`, `ai/billing`, `ai/platformModelManagement`).
- [x] `WSK-02`: operability checklist + ownership map + tabletop drill evidence links.
- [x] `WSK-03`: typed knowledge composition contract + load telemetry.
- [x] `WSK-04`: shared tool parsing/normalization adapters across runtimes.
- [x] `WSK-05`: org-level allow/deny matrix + policy-audit coverage.
- [x] `WSK-06`: model lifecycle retirement/deprecation workflow + safety checks.
- [x] `WSK-07`: adapter conformance + control-plane/plugin credential boundaries.

Phase 8 operability ownership map:

| Incident class | Primary owner | Secondary owner | Runtime surfaces |
|---|---|---|---|
| Model outage / provider instability | Platform AI on-call | Runtime reliability | `ai/platformAlerts`, `ai/agentSessions:getModelFallbackRate`, `ai/platformModelManagement` |
| Tool degradation / receipt instability | Runtime reliability | Platform AI on-call | `ai/agentSessions:getToolSuccessFailureRatio`, `ai/agentSessions:getAgingReceipts`, `ai/agentSessions:getStuckReceipts` |
| Cost spike / budget integrity | AI economics owner | Platform AI on-call | `ai/billing:getUsageSummary`, `ai/agentSessions:getAgentStats`, `ai/modelPricing:getModelPricing` |

Tabletop drill evidence links:

- Model outage drill packet: `docs/ai-endurance/BLOCKERS.md#tt-20-a-model-outage`
- Tool degradation drill packet: `docs/ai-endurance/BLOCKERS.md#tt-20-b-tool-degradation`
- Cost spike drill packet: `docs/ai-endurance/BLOCKERS.md#tt-20-c-cost-spike`

**Exit criteria:** all known residual gaps are represented by completed queue tasks and validated in code/docs.

## Phase 9: Runtime hotspot refactor v2

- [x] Characterize current behavior and extract major orchestration seams from `agentExecution.ts` and `chat.ts` (Plan 21).

**Exit criteria:** hotspot modules are decomposed behind tested interfaces with no unintended behavior drift.

---

## 6. CommonGround borrow policy

Borrow only kernel-level protocol concepts that strengthen determinism in this codebase:

- Explicit turn state machine and lease semantics.
- Durable inbox receipts + idempotency keys.
- One terminal deliverable contract per turn.
- Replay-safe operational query surface.

Do not copy framework assumptions directly; adapt to Convex runtime, current schemas, and existing product behavior.

Reference source folder:
- `docs/reference_projects/CommonGround/`

---

## 7. Delivery loop

For each queue task:

1. List top 3 regression risks.
2. Implement smallest viable chunk.
3. Run row-specific verification commands.
4. Update `TASK_QUEUE.md` status/notes.
5. Update `INDEX.md` and this file when plan status changes.
6. If blocked, log in `BLOCKERS.md` and continue with next promotable task.
