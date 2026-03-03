# Tool Foundry Index

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/tool-foundry`  
**Last updated:** 2026-03-01  
**Source request:** Build a world-class Tool Foundry where agents can create tools alongside human operators, with stronger safety and trust controls than open-ended host execution.

---

## Purpose

This workstream establishes a production-safe Tool Foundry that:

1. lets agents propose and evolve tools through deterministic stages,
2. keeps mutating behavior approval-bound and fail-closed,
3. isolates capability growth behind measurable test and trust evidence,
4. preserves one-agent authority boundaries (`prompt + memory + policy + tools + eval + trust`).

---

## Core files

- Queue:  
  `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/tool-foundry/TASK_QUEUE.md`
- Session prompts:  
  `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/tool-foundry/SESSION_PROMPTS.md`
- Master plan:  
  `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/tool-foundry/MASTER_PLAN.md`
- Integrity contract:  
  `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/tool-foundry/INTEGRITY_CONTRACT.md`
- Index (this file):  
  `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/tool-foundry/INDEX.md`

---

## Status snapshot

1. Queue-first scaffold is in place with deterministic lanes and dependency gates (`TFD-001`..`TFD-010`).
2. Foundry stage/policy contracts are implemented in `convex/ai/toolFoundry/contracts.ts` with unit coverage in `tests/unit/ai/toolFoundryContracts.test.ts`.
3. CI guardrails are in place:
   - `scripts/ci/check-tool-foundry-guard.sh`
   - `.github/workflows/tool-foundry-guard.yml`
   - `npm run tool-foundry:guard`
4. Verification evidence for this run:
   - `npm run typecheck` passed.
   - `npm run test:unit:tool-foundry` passed (`22` tests).
   - `npm run docs:guard` passed.
5. `TFD-005` is complete: runtime now emits deterministic capability-gap `blocked` payloads plus ToolSpec draft metadata when unknown internal capabilities are requested.
6. `TFD-006` is complete: runtime now upserts deterministic ToolSpec proposal backlog records with provenance/trace and rollback metadata via `convex/ai/toolFoundry/proposalBacklog.ts` plus schema-backed persistence.
7. `TFD-007` is complete: foundry lifecycle trust events now require deterministic correlation + boundary context fields (`correlation_id`, `lineage_id`, `thread_id`, `workflow_key`, `frontline_intake_trigger`, `boundary_reason`) and runtime/proposal emissions now populate them.
8. `TFD-008` is complete: operator-facing read-only evidence contract now exposes deterministic policy checks, test evidence, approval chain, canary metrics, rollback readiness, and feature-flagged mobile parity metadata.
9. `TFD-009` is complete: pilot coverage now proves deterministic read-only and mutating capability-gap paths with negative controls and mobile-flag parity checks.
10. `TFD-010` is complete: closeout recommendation, residual risk register, rollback path, and explicit parity go/no-go decision are now documented in synchronized queue artifacts.
11. `TFD-011`..`TFD-013` are complete: session-based caller wiring for promotion decisions, mandatory internal `actorUserId` contract, and immutable-core allowlist drift guard coverage.
12. `TFD-014` is complete: operator-mobile now exposes a boundary CTA entrypoint that launches interview-first Tool Foundry intake kickoff in-thread on runtime policy blocks.
13. `TFD-015` is complete: dedicated regression coverage now validates kickoff prompt composition and boundary CTA launch gating for operator-mobile.
14. Progress is `15/15` rows complete (`100%`) with `11/11` `P0` rows complete (`100%`).
15. Frontline intake quality check (2026-02-27): desktop chat surfaces now route through interview-first kickoff prompts in single-pane, slick-pane, four-pane, and boundary CTA panels.
16. Current next promotable row: none (workstream closed; all rows `DONE`).
17. Rollout recommendation: proceed with controlled desktop/web rollout under current trust gates and evidence contracts.
18. Parity decision update: operator-mobile intake entrypoint + regression gaps from `TFD-010` residual risk are now closed by `TFD-014` and `TFD-015`.

---

## Scope boundary

Owned in this workstream:

1. Tool Foundry stage model, policy invariants, and promotion contracts.
2. Runtime gap-path behavior for unsupported requests.
3. CI/CD guardrails for foundry-related change safety.
4. Trust evidence requirements and rollout/rollback policy for self-created tools.

Not owned in this workstream:

1. Global 104+ catalog recommender index/matrix scaling (`book-agent-productization` lane `J`).
2. Core one-agent identity/birthing contracts outside foundry-specific additions (`your-ai-one-agent-core`).
3. Unreviewed external skill marketplace ingestion as default path.

---

## Lane board

- [x] Lane A: charter + baseline contracts (`TFD-001`, `TFD-002`)
- [x] Lane B: stage policy + execution decision helpers (`TFD-003`)
- [x] Lane D: CI anti-regression guardrails (`TFD-004`)
- [x] Lane C: runtime capability-gap integration + mobile intake entrypoint (`TFD-005`, `TFD-006`, `TFD-014`)
- [x] Lane E: trust telemetry + evidence contracts + mobile parity regressions (`TFD-007`, `TFD-008`, `TFD-015`)
- [x] Lane F: pilot + closeout (`TFD-009`, `TFD-010`)

---

## Operating commands

- Docs guard: `npm run docs:guard`
- Foundry policy test: `npm run test:unit:tool-foundry`
- Foundry CI contract guard: `npm run tool-foundry:guard`
- Baseline type safety: `npm run typecheck`
