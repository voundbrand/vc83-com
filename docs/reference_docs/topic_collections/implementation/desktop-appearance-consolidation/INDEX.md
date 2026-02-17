# Desktop Appearance Consolidation Index

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/desktop-appearance-consolidation`  
**Source plan:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/desktop-appearance-consolidation-plan.md`

---

## Purpose

This folder is the queue-first execution layer for the desktop appearance consolidation initiative (dark + sepia only).

---

## Files

- Queue: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/desktop-appearance-consolidation/TASK_QUEUE.md`
- Session prompts: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/desktop-appearance-consolidation/SESSION_PROMPTS.md`
- Blockers: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/desktop-appearance-consolidation/BLOCKERS.md`
- Autonomous protocol: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/desktop-appearance-consolidation/AUTONOMOUS_EXECUTION_PROTOCOL.md`
- Master plan: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/desktop-appearance-consolidation/MASTER_PLAN.md`
- PostHog reference lane notes: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/desktop-appearance-consolidation/LANE_G_POSTHOG_REFERENCE_NOTES.md`

---

## Status

Original consolidation lanes (`A`..`F`) are complete through `DAC-015`.

Follow-up lane `G` is now queued for PostHog-inspired desktop polish work:

1. `DAC-016` (`DONE`): top link-first taskbar and Start-button removal.
2. `DAC-017` (`DONE`): menu/window surface convergence.
3. `DAC-018` (`DONE`): custom icon rollout + center-origin window motion + PostHog-style shell chrome convergence.

Follow-up lane `H` is now in progress for window-interior control cleanup work:

1. `DAC-019` (`DONE`): shared interior primitives/tokens for controls.
2. `DAC-020` (`DONE`): settings + control-panel migration to shared primitives.
3. `DAC-021` (`DONE`): launcher/utility interior migration (All Apps + windows menu).
4. `DAC-022` (`DONE`): high-traffic CRUD migration (CRM + Projects + Invoicing shell controls).
5. `DAC-023` (`IN_PROGRESS`): remaining operational interior migration (Payments/Forms/Templates/Workflows), with Store dark-mode interior contrast cleanup checkpoint landed.
6. `DAC-024` (`PENDING`): lane hardening + deletion pass.

---

## Lane progress board

- [x] Lane A (`DAC-001`..`DAC-003`)
- [x] Lane B (`DAC-004`..`DAC-005`)
- [x] Lane C (`DAC-006`..`DAC-007`)
- [x] Lane D (`DAC-010`..`DAC-012`)
- [x] Lane E (`DAC-008`..`DAC-009`)
- [x] Lane F (`DAC-013`..`DAC-015`)
- [x] Lane G (`DAC-016`..`DAC-018`)
- [ ] Lane H (`DAC-019`..`DAC-024`)

---

## Operating commands

- Validate docs policy: `npm run docs:guard`
- Read queue: `cat /Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/desktop-appearance-consolidation/TASK_QUEUE.md`
- Resume autonomous mode: use resume prompt in `AUTONOMOUS_EXECUTION_PROTOCOL.md`
