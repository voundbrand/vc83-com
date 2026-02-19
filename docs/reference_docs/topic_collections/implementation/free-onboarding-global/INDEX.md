# Free Onboarding Global Index

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/free-onboarding-global`  
**Source request:** Global free-token onboarding alignment across Telegram, webchat, and native AI chat (2026-02-17)

---

## Purpose

Queue-first execution layer for unifying free onboarding and conversion across external chat channels and native desktop chat.

---

## Files

- Queue: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/free-onboarding-global/TASK_QUEUE.md`
- Session prompts: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/free-onboarding-global/SESSION_PROMPTS.md`
- Master plan: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/free-onboarding-global/MASTER_PLAN.md`
- Rollout checklist: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/free-onboarding-global/ROLLOUT_CHECKLIST.md`
- Index (this file): `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/free-onboarding-global/INDEX.md`

---

## Status

Current kickoff:

1. Lane `A` (`FOG-001`..`FOG-003`) is `DONE`: channel/runtime parity landed.
2. Lane `B` (`FOG-004`..`FOG-005`) is `DONE`: anonymous + Telegram claim/linking shipped.
3. Lane `C` (`FOG-006`..`FOG-007`) is `DONE`: conversion tools + global funnel prompt/template routing landed.
4. Lane `D` (`FOG-008`..`FOG-009`) is `DONE`: native guest chat mode + explicit conversion UX shipped with store-flow reuse.
5. Lane `E` (`FOG-010`..`FOG-011`) is `DONE`: abuse controls hardened and deterministic funnel analytics with channel attribution shipped.
6. Lane `F` (`FOG-012`) is `DONE`: hardening verify suite passed, rollout checklist finalized, and onboarding rollout guardrail tests added.

Next queued tasks:

1. None - this workstream queue is complete through lane `F`.

---

## Lane progress board

- [x] Lane A (`FOG-001`..`FOG-003`)
- [x] Lane B (`FOG-004`..`FOG-005`)
- [x] Lane C (`FOG-006`..`FOG-007`)
- [x] Lane D (`FOG-008`..`FOG-009`)
- [x] Lane E (`FOG-010`..`FOG-011`)
- [x] Lane F (`FOG-012`)

---

## Operating commands

- Validate docs policy: `npm run docs:guard`
- Read queue: `cat /Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/free-onboarding-global/TASK_QUEUE.md`
- Run core checks: `npm run typecheck && npm run lint`
