# Commercial Pricing Motion Unification Index

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/commercial-pricing-motion-unification`  
**Source request:** Correct CPMU motion contract and align implementation plan to codebase reality with coexistence-safe execution.

---

## Purpose

Queue-first execution layer for commercialization parity:

1. One canonical commercial contract (Diagnostic, Consulting Sprint, Implementation Start).
2. One deterministic CTA + metadata envelope (`offer_code`, `intent_code`, `surface`, `routing_hint`, campaign keys).
3. One aligned public sales motion across Store + one-of-one landing + chat handoff.
4. One coexistence-safe Stripe and backoffice behavior during migration and rollback windows.

---

## Files

- Queue: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/commercial-pricing-motion-unification/TASK_QUEUE.md`
- Session prompts: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/commercial-pricing-motion-unification/SESSION_PROMPTS.md`
- Master plan: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/commercial-pricing-motion-unification/MASTER_PLAN.md`
- CPMU-013 runbook: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/commercial-pricing-motion-unification/CPMU_013_CUTOVER_RUNBOOK.md`
- Index (this file): `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/commercial-pricing-motion-unification/INDEX.md`

---

## Status snapshot (2026-03-02)

1. `CPMU-001`..`CPMU-005` remain `DONE` as baseline and coexistence metadata infrastructure.
2. Contract correction now locked: `€3,500` consulting-only, `€7,000+` implementation start, Free Diagnostic lead-gen.
3. `CPMU-006` is now `DONE`; Store public motion framing and legacy sales-surface de-emphasis remain in place with coexistence-safe behavior.
4. `CPMU-007` is now `DONE`; Store CTAs now emit deterministic commercial intent keys and preserve campaign attribution through chat handoff and commercial checkout metadata.
5. `CPMU-008` is now `DONE`; one-of-one landing motion copy now enforces Free Diagnostic lead-gen, `€3,500` consulting scope-only, and `€7,000+` implementation start language.
6. `CPMU-009` is now `DONE`; landing handoff links now emit canonical commercial keys while preserving legacy link compatibility and direct `/chat` attribution continuity.
7. `CPMU-010` is now `DONE`; Samantha/intake routing now applies motion-intent guardrails for diagnostic, consulting scope-only, and implementation readiness at `€7,000+`.
8. `CPMU-011` is now `DONE`; Samantha handoff kickoff summaries and audit lead payload tags now preserve canonical commercial intent fields and campaign envelope keys with additive compatibility aliases.
9. `CPMU-012` is now `DONE`; migration/rollback gates are now implemented as deterministic checks with rehearsal-safe rollback validation and metadata envelope continuity tests, all completed with required verifies.
10. `CPMU-013` is now `DONE`; controlled legacy visibility cutover toggles and rollback runbook thresholds are now documented and wired across Store + landing public surfaces.

Next promotable task:

1. none (queue complete)

---

## Lane progress board

- [x] Lane A (`CPMU-001`..`CPMU-005`) — baseline complete
- [x] Lane C (`CPMU-006`..`CPMU-007`) — corrected Store motion + CTA contract
- [x] Lane D (`CPMU-008`..`CPMU-009`) — corrected Landing motion + handoff contract
- [x] Lane E (`CPMU-010`..`CPMU-011`) — Samantha intent routing alignment
- [x] Lane F (`CPMU-012`..`CPMU-013`) — measurable gates, rollback rehearsal, cutover control

---

## Operating commands

- Validate docs policy: `npm run docs:guard`
- Core checks: `npm run typecheck && npm run lint`
- Unit checks when row requires: `npm run test:unit`
