# Webchat Deployment UI Index

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/webchat-deployment-ui`  
**Source request:** Create a queue-first implementation plan for a native Webchat Deployment UI.

---

## Purpose

Queue-first execution layer for shipping a native desktop webchat deployment experience with:

- deploy snippet UX,
- webchat config customization,
- hardened payload contract (`organizationId`),
- deterministic tests and smoke checks.

---

## Files

- Queue: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/webchat-deployment-ui/TASK_QUEUE.md`
- Session prompts: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/webchat-deployment-ui/SESSION_PROMPTS.md`
- Master plan: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/webchat-deployment-ui/MASTER_PLAN.md`
- Smoke checklist: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/webchat-deployment-ui/SMOKE_CHECKLIST.md`
- Index (this file): `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/webchat-deployment-ui/INDEX.md`

---

## Status

- Workstream initialized.
- Lane `A` complete (`WDU-001`..`WDU-003` done).
- Lane `B` complete (`WDU-004`..`WDU-006` done).
- Lane `C` complete (`WDU-007`..`WDU-009` done).
- Lane `D` complete (`WDU-010`..`WDU-012` done) with payload/snippet unit coverage expansion, smoke harness, smoke checklist, and docs closeout.
- Current promotable task: none.

---

## Lane progress board

- [x] Lane A (`WDU-001`..`WDU-003`) - backend contract complete
- [x] Lane B (`WDU-004`..`WDU-006`) - deterministic snippets + runtime contract parity complete
- [x] Lane C (`WDU-007`..`WDU-009`) - desktop UI complete
- [x] Lane D (`WDU-010`..`WDU-012`) - docs/testing + closeout complete

---

## Operating commands

- Validate docs policy: `npm run docs:guard`
- Read queue: `cat /Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/webchat-deployment-ui/TASK_QUEUE.md`
- Run core checks: `npm run typecheck && npm run lint && npm run test:unit`
- Run deployment flow smoke suite: `npx vitest run tests/unit/shell/webchat-deployment-flow.smoke.test.ts`
