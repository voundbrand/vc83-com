# Operator Collaboration Routing Cutover Index

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/operator-collaboration-routing-cutover`  
**Source request:** Split operator collaboration UX and routing cutover work from TCG runtime semantics; keep kernel contracts in TCG and deliver product-surface collaboration behavior here.

---

## Purpose

This folder is the queue-first execution layer for:

1. orchestrator-first default routing for operator channels,
2. group chat + specialist DM collaboration UX,
3. DM summary sync back to group workflow,
4. legacy AI chat deprecation/cutover planning,
5. explicit operator channel binding UX updates.

This workstream depends on typed runtime contracts from:

- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/trigger-common-ground-agentic-convergence/TASK_QUEUE.md` (`TCG-014`..`TCG-017`).

---

## Core files

- Queue:
  `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/operator-collaboration-routing-cutover/TASK_QUEUE.md`
- Session prompts:
  `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/operator-collaboration-routing-cutover/SESSION_PROMPTS.md`
- Master plan:
  `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/operator-collaboration-routing-cutover/MASTER_PLAN.md`
- Index (this file):
  `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/operator-collaboration-routing-cutover/INDEX.md`

---

## Status

1. Split execution model formalized.
2. Queue-first workstream initialized with deterministic task schema.
3. Lane A complete (`OCC-001`..`OCC-003`): baseline routing audit and frozen operator UX contract (`OCC-UX-01`..`OCC-UX-08`) are published.
4. Lane B complete (`OCC-004`..`OCC-006`): orchestrator-first routing, fail-closed routing/session metadata persistence, and DM summary sync bridge checkpoint gating are implemented.
5. Lane C complete (`OCC-007`..`OCC-009`): operator group/DM collaboration surfaces, unified timeline/correlation markers, and explicit DM-to-group sync flow with replay-safe audit behavior are implemented.
6. Lane D complete (`OCC-010`..`OCC-012`): deterministic shell cutover flags and explicit rollback controls are active, platform-managed channel binding overrides are super-admin gated, and migration/rollback playbooks are published.
7. Lane E complete (`OCC-013`): full closeout verification profile ran successfully (`typecheck`, `lint`, `test:unit`, `test:integration`, `docs:guard`) and upstream dependency evidence for `TCG-014`..`TCG-017` is captured.

Immediate objective:

1. preserve rollback readiness (`SHELL_ENABLED`, `ROLLOUT_PERCENT`, `FORCE_LEGACY`) with deterministic cohort behavior,
2. monitor post-closeout launch-readiness signals and escalation thresholds,
3. keep support-facing guidance aligned with role-gated platform-managed channel binding policy.

---

## Lane progress board

- [x] Lane A bootstrap (`OCC-001`)
- [x] Lane A baseline + contract (`OCC-002`..`OCC-003`)
- [x] Lane B routing/session cutover (`OCC-004`..`OCC-006`)
- [x] Lane C operator collaboration UX (`OCC-007`..`OCC-009`)
- [x] Lane D deprecation + configuration UX (`OCC-010`..`OCC-012`)
- [x] Lane E closeout (`OCC-013`)

---

## Operating commands

- Docs policy:
  `npm run docs:guard`
- Baseline checks:
  `npm run typecheck && npm run lint && npm run test:unit`
- Integration checks:
  `npm run test:integration`
