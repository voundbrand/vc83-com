# AI Endurance Master Plan

**Date:** 2026-02-17  
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
| WS6 Security/refactor seam v1 | 13 | `PARTIAL (residual)` | `WSK-07` |
| WS7 Coordination kernel | 14 | `OPEN` | `WSH-01..WSH-04` |
| WS8 Receipts + idempotency contract | 15 | `OPEN` | `WSH-05..WSH-07` |
| WS9 Harness/team semantics | 16 | `OPEN` | `WSI-01..WSI-03` |
| WS10 Core memory + semantic retrieval | 17, 18 | `OPEN` | `WSJ-01..WSJ-06` |
| WS11 Soul-loop drift unification | 19 | `OPEN` | `WSI-04..WSI-06` |
| WS12 Operability + residual closure | 20 + residual 01/02/03/04/13 | `OPEN` | `WSK-01..WSK-07` |
| WS13 Hotspot refactor v2 | 21 | `OPEN` | `WSL-01..WSL-06` |

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

- [ ] Implement explicit turn state machine and lease/CAS semantics (Plan 14).
- [ ] Move all ingress to receipt-first idempotent contract with terminal deliverable pointer (Plan 15).

**Exit criteria:** duplicate inbound deliveries cannot create duplicate side effects; runtime progression is turn-driven and replay-safe.

## Phase 7: Harness/memory/soul integration

- [ ] Wire harness context into runtime and formalize team handoff contract (Plan 16).
- [ ] Ship core memory anchors through onboarding and soul lifecycle (Plan 17).
- [ ] Upgrade retrieval to semantic + citation-aware context assembly (Plan 18).
- [ ] Unify reflection engine and drift-aware soul policy enforcement (Plan 19).

**Exit criteria:** one reflection engine, memory anchors are immutable-by-default, semantic retrieval is production with fallback and telemetry.

## Phase 8: Operability + residual plan closure

- [ ] Publish and link runbooks for model outage, tool degradation, cost spikes (Plan 20).
- [ ] Close unfinished seams from Plans 01/02/03/04/13.

**Exit criteria:** all known residual gaps are represented by completed queue tasks and validated in code/docs.

## Phase 9: Runtime hotspot refactor v2

- [ ] Characterize current behavior and extract major orchestration seams from `agentExecution.ts` and `chat.ts` (Plan 21).

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

