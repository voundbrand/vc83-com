# Deployment Tier Architecture Workstream Index

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/deployment-tier-architecture`  
**Source request:** deployment-tier architecture, sovereign path, provider/runtime seam map lock-in, and platform-managed `Twilio` / `ElevenLabs` / `Infobip` control-plane planning (2026-03-13)

---

## Purpose

Queue-first execution layer for moving the platform from one managed-cloud product into a three-tier architecture:

1. `Cloud`
2. `Dedicated-EU`
3. `Sovereign`

This workstream locks the target architecture, the practical path to Sovereign today, and the provider/runtime seam extraction order.

---

## Files

- Queue: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/deployment-tier-architecture/TASK_QUEUE.md`
- Session prompts: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/deployment-tier-architecture/SESSION_PROMPTS.md`
- Master plan: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/deployment-tier-architecture/MASTER_PLAN.md`
- Provider/runtime seam map: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/deployment-tier-architecture/PROVIDER_RUNTIME_SEAM_MAP.md`
- Provider control plane plan: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/deployment-tier-architecture/PROVIDER_CONTROL_PLANE_IMPLEMENTATION_PLAN.md`
- Index (this file): `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/deployment-tier-architecture/INDEX.md`

---

## Status

Current kickoff:

1. `DTA-001` is `DONE`: tier definitions, current blockers, tier matrix, and sovereign path are published.
2. `DTA-002` is `DONE`: provider/runtime seam map and extraction order are published.
3. `DTA-014` is `DONE`: the platform-managed provider control-plane plan for `Twilio`, `ElevenLabs`, and `Infobip` is published.

Queued next:

1. `DTA-003` is `READY`: define the deployment-profile schema and provider allowlist contract.
2. After `DTA-003`, `DTA-015` becomes the next gate: lock the canonical provider-control-plane contracts across deployment profile, provider connection, channel binding, route policy, and provider mirrors.
3. After `DTA-015`, provider-specific work can begin on `Twilio`, `ElevenLabs`, and `Infobip` without changing the canonical internal agent model.

---

## Lane progress board

- [x] Lane A (`DTA-001`..`DTA-002`, `DTA-014`)
- [ ] Lane B (`DTA-003`..`DTA-005`, `DTA-015`)
- [ ] Lane C (`DTA-006`..`DTA-008`, `DTA-016`..`DTA-017`)
- [ ] Lane D (`DTA-009`..`DTA-010`, `DTA-018`)
- [ ] Lane E (`DTA-011`..`DTA-013`, `DTA-019`)

---

## Operating commands

- Validate docs policy: `npm run docs:guard`
- Read queue: `cat /Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/deployment-tier-architecture/TASK_QUEUE.md`
- Read seam map: `cat /Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/deployment-tier-architecture/PROVIDER_RUNTIME_SEAM_MAP.md`
- Read provider plan: `cat /Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/deployment-tier-architecture/PROVIDER_CONTROL_PLANE_IMPLEMENTATION_PLAN.md`
- Baseline repo checks: `npm run typecheck`
- Voice gateway check: `npm run voice-gateway:check`
