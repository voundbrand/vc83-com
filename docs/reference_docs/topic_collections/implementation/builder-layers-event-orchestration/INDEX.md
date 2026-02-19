# Builder/Layers Orchestration Core + Event Playbook Index

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/builder-layers-event-orchestration`  
**Source request:** Revisit `/builder`, `/layers`, and web publishing to move from legacy event templates toward reusable orchestration agents and runtime flows, starting with an event playbook.

---

## Purpose

Queue-first execution layer for shipping a one-conversation launch path that:

- uses a reusable orchestration core with typed playbooks,
- implements `event` as playbook #1,
- creates and links canonical artifacts (event/product/ticket/form/checkout/web app/published page),
- seeds protected platform orchestration agents with controlled clone spawning,
- adds Soul v2 learning overlays with explicit owner approval.

---

## Files

- Queue: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/builder-layers-event-orchestration/TASK_QUEUE.md`
- Session prompts: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/builder-layers-event-orchestration/SESSION_PROMPTS.md`
- Master plan: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/builder-layers-event-orchestration/MASTER_PLAN.md`
- Index (this file): `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/builder-layers-event-orchestration/INDEX.md`

---

## Status

- Lane `A` baseline assessment is complete (`OCO-001`).
- Lane `B` contract lock is complete (`OCO-002`).
- Lane `B` tool registration/scoping pass is complete (`OCO-003`).
- Lane `B` legacy publish/status mismatch cleanup is complete (`OCO-005`).
- Lane `C` orchestration runtime + event playbook adapter are complete (`OCO-006`, `OCO-007`).
- Lane `D` platform specialist seeding + clone factory is complete (`OCO-008`, `OCO-009`).
- Lane `E` Soul v2 overlays + approval-gated learning loop are complete (`OCO-010`, `OCO-011`).
- Next promotable non-lane-`E` task: `OCO-012` (lane `F`).
- Core feasibility verdict: **yes**; most work is contract alignment, orchestration wiring, and controlled agent specialization.

---

## Lane Progress Board

- [x] Lane A (`OCO-001`)
- [ ] Lane B (`OCO-002`..`OCO-005`)
- [x] Lane C (`OCO-006`..`OCO-007`)
- [x] Lane D (`OCO-008`..`OCO-009`)
- [x] Lane E (`OCO-010`..`OCO-011`)
- [ ] Lane F (`OCO-012`)
- [ ] Lane G (`OCO-013`..`OCO-014`)

---

## Operating Commands

- Validate docs policy: `npm run docs:guard`
- Read queue: `cat /Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/builder-layers-event-orchestration/TASK_QUEUE.md`
- Run core checks: `npm run typecheck && npm run lint && npm run test:unit`
