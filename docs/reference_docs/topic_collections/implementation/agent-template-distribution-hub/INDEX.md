# Agent Template Distribution Hub Index

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-template-distribution-hub`  
**Source request:** Define an implementable plan where agents are centrally managed as templates, copied/distributed per organization by default, and controlled from a super-admin hub.

---

## Purpose

This workstream defines and executes a centralized multi-tenant agent distribution model:

1. super-admin manages global agent templates and versions,
2. organizations receive per-org clone instances by default,
3. org-level teams can override only allowed fields,
4. seeded platform agents are migrated without breaking seed contracts,
5. published agents can be presented with package/license context for activation eligibility,
6. super-admin can inspect drift, rollout safely, and rollback quickly.

---

## Core files

- Queue:
  `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-template-distribution-hub/TASK_QUEUE.md`
- Session prompts:
  `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-template-distribution-hub/SESSION_PROMPTS.md`
- Master plan:
  `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-template-distribution-hub/MASTER_PLAN.md`
- Index (this file):
  `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-template-distribution-hub/INDEX.md`

---

## Status

1. Queue-first artifacts are initialized.
2. Lane structure and dependency gates are defined.
3. Lane `A` `P0` contract freeze (`ATH-001`) is complete.
4. Seeded migration bridge lock (`ATH-015`) is complete.
5. Migration runbook operational drill (`ATH-018`) is complete.
6. Pre-rollout readiness drill (`ATH-019`) is complete.
7. Canary rollout runbook execution (`ATH-020`) is complete.

Immediate objective:

1. monitor canary telemetry for stability and confirm no policy-gate regressions,
2. preserve rollback readiness and staged rollout discipline for subsequent waves,
3. promote to wider rollout only with the same dry-run/apply/hold criteria.

---

## Lane progress board

- [x] Lane A contract freeze and migration policy (`ATH-001`..`ATH-002`) (`ATH-001`, `ATH-002` done)
- [x] Lane B backend model and distribution APIs (`ATH-003`..`ATH-006`, `ATH-015`) (`ATH-003`, `ATH-004`, `ATH-005`, `ATH-006`, `ATH-015` done)
- [x] Lane C super-admin hub UX (`ATH-007`..`ATH-009`, `ATH-016`) (`ATH-007`, `ATH-008`, `ATH-009`, `ATH-016` done)
- [x] Lane D org clone controls and override gates (`ATH-010`..`ATH-012`, `ATH-017`) (`ATH-010`, `ATH-011`, `ATH-012`, `ATH-017` done)
- [x] Lane E verification and closeout (`ATH-013`..`ATH-014`, `ATH-018`, `ATH-019`) (`ATH-013`, `ATH-014`, `ATH-018`, `ATH-019` done on 2026-03-09)
- [x] Lane E canary execution (`ATH-020`) (`DONE` on 2026-03-11 after operator-confirmed live canary success)

---

## Operating commands

- Docs guard:
  `npm run docs:guard`
- Baseline type safety:
  `npm run typecheck`
- Unit validation:
  `npm run test:unit`
- Targeted agent validation:
  `npm run test -- tests/unit/ai/agentOntologyMutationPaths.test.ts tests/unit/agents/agentToolsConfig.dom.test.ts`
