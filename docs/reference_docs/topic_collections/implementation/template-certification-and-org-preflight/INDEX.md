# Template Certification And Org Preflight Index

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/template-certification-and-org-preflight`  
**Source request:** Replace deploy-time WAE rollout gating with reusable template certification plus lightweight org preflight.

---

## Purpose

This workstream converts protected-template rollout from manual per-org ceremony into a scalable operating model:

1. certify exact template versions once,
2. invalidate certification only when the version manifest meaningfully changes,
3. run org preflight separately at deploy time,
4. fail closed for missing or invalid certification and for org-specific readiness blockers,
5. preserve managed-clone and protected telephony deployment flows.

---

## Current status

1. Backend certification artifacts, risk tiers, deterministic dependency digests, and org preflight are implemented.
2. Publish, distribution, spawn, and telephony sync paths now enforce certification plus org preflight.
3. Super-admin, Platform Mother, agent detail, and telephony surfaces now expose certification, blockers, rollout readiness, and drift more clearly.
4. Risk policy is now platform-configurable, org preflight includes non-telephony channels and mapped integrations, and CI/admin automation now ingests evaluation outputs into risk-tier-aware non-WAE certification bundles by default for low/medium promotions.
5. Certification evidence recording now returns concrete operator/CI payloads (recorded sources, missing requirements, failed requirements, and block reasons) while preserving WAE bridge/manual compatibility.
6. Focused verification is complete for the touched paths in this turn.

Immediate follow-up:

1. Define `TCP-013`: rollout ownership, alerting, and policy governance for template-family CI adoption on top of the new automation contract.

---

## Core artifacts

- Queue: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/template-certification-and-org-preflight/TASK_QUEUE.md`
- Session prompts: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/template-certification-and-org-preflight/SESSION_PROMPTS.md`
- Master plan: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/template-certification-and-org-preflight/MASTER_PLAN.md`
- Index: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/template-certification-and-org-preflight/INDEX.md`

---

## Verification commands

1. `npm run typecheck`
2. `npx vitest run tests/unit/ai/agentCatalogAdmin.waeRolloutGateControl.test.ts tests/unit/ai/workerPool.waeRolloutGate.test.ts tests/unit/telephony/telephonyIntegration.test.ts tests/unit/ai/platformMotherMigrationGates.test.ts tests/unit/ai/platformMotherAdmin.test.ts tests/unit/ai/agentControlCenterTab.templateLifecycle.dom.test.ts tests/unit/agents/agentDetailPanel.dom.test.ts`
3. `npm run docs:guard`
