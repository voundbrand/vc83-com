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
5. Certification evidence recording now returns concrete operator/CI payloads (recorded sources, missing requirements, failed requirements, block reasons, family adoption mode, owner mappings, alert recommendations, and per-channel dispatch outcomes) while preserving WAE bridge/manual compatibility.
6. Certification alert dispatches now run through queued Slack/PagerDuty/Email worker execution with deterministic ordering, retry handling, acknowledgement lifecycle, and manual/system throttle controls while preserving version+digest dedupe semantics.
7. Alert workers now use provider-specific external transports (Slack webhook/API, PagerDuty events-v2, Resend email) with fail-closed configuration handling while preserving TCP-015 retry/throttle/ack semantics.
8. Super-admin WAE certification status UI now includes direct per-dispatch operator controls for `Acknowledge`, `Snooze 30m`, and `Snooze 2h`.
9. `TCP-017` is complete: dispatch control now includes per-channel credential governance policy and credential health telemetry with runbook links for Slack/PagerDuty/Email alert transports.
10. Adapter dispatch now fails closed with deterministic governance/credential error codes while preserving TCP-015/TCP-016 retry + ack + throttle/snooze semantics.
11. Certification requirement authoring now enforces deterministic foundational/operational verification standards, and policy/evidence surfaces include authoring coverage metadata for auditability.
12. `TCP-018` implementation is complete: alert dispatch control now supports strict-mode rollout automation (`manual` / `auto_promote_ready_channels`) with advisory/enforced guardrails and runtime effective-policy promotion for ready Slack/PagerDuty/Email channels.
13. Certification evidence/status alert recommendations now include deterministic `policy_drift_detected` notifications with unchanged version+digest+channel dedupe semantics.
14. Super-admin WAE certification operations now surface strict-mode rollout progress and policy drift issues alongside credential health telemetry.
15. Verification passed for the `TCP-018` slice (`npm run typecheck`, focused vitest alert-operation suites for touched files, and `npm run docs:guard`).

Immediate follow-up:

1. Define `TCP-019` automation for scheduled drift sweeps + owner escalation outside evidence-write flows.

---

## Core artifacts

- Queue: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/template-certification-and-org-preflight/TASK_QUEUE.md`
- Session prompts: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/template-certification-and-org-preflight/SESSION_PROMPTS.md`
- Master plan: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/template-certification-and-org-preflight/MASTER_PLAN.md`
- Index: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/template-certification-and-org-preflight/INDEX.md`
- Transport credential runbook: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/template-certification-and-org-preflight/TRANSPORT_CREDENTIAL_RUNBOOK.md`

---

## Verification commands

1. `npm run typecheck`
2. `npx vitest run tests/unit/ai/agentCatalogAdmin.waeRolloutGateControl.test.ts tests/unit/ai/templateCertificationPolicyAndEvidence.test.ts tests/unit/ai/workerPool.waeRolloutGate.test.ts tests/unit/telephony/telephonyIntegration.test.ts tests/unit/ai/platformMotherMigrationGates.test.ts tests/unit/ai/platformMotherAdmin.test.ts tests/unit/ai/agentControlCenterTab.templateLifecycle.dom.test.ts tests/unit/agents/agentDetailPanel.dom.test.ts`
3. `npm run docs:guard`
