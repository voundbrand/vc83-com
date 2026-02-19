# Desktop Appearance Consolidation Index

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/desktop-appearance-consolidation`  
**Source plan:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/desktop-appearance-consolidation-plan.md`

---

## Purpose

This folder is the queue-first execution layer for the desktop appearance consolidation initiative (dark + sepia only), selective PostHog-inspired architecture follow-up work, and the account-hub shell modernization follow-up.

---

## Files

- Queue: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/desktop-appearance-consolidation/TASK_QUEUE.md`
- Session prompts: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/desktop-appearance-consolidation/SESSION_PROMPTS.md`
- Blockers: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/desktop-appearance-consolidation/BLOCKERS.md`
- Autonomous protocol: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/desktop-appearance-consolidation/AUTONOMOUS_EXECUTION_PROTOCOL.md`
- Master plan: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/desktop-appearance-consolidation/MASTER_PLAN.md`
- Window UI design contract: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/desktop-appearance-consolidation/WINDOW_UI_DESIGN_CONTRACT.md`
- Window UI contract audit matrix: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/desktop-appearance-consolidation/WINDOW_UI_CONTRACT_AUDIT_MATRIX.md`
- PostHog reference lane notes: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/desktop-appearance-consolidation/LANE_G_POSTHOG_REFERENCE_NOTES.md`

---

## Status

Original consolidation lanes (`A`..`F`) are complete through `DAC-015`.

Follow-up lane `G` is now queued for PostHog-inspired desktop polish work:

1. `DAC-016` (`DONE`): top link-first taskbar and Start-button removal.
2. `DAC-017` (`DONE`): menu/window surface convergence.
3. `DAC-018` (`DONE`): custom icon rollout + center-origin window motion + PostHog-style shell chrome convergence.

Follow-up lane `H` is now complete for window-interior control cleanup work:

1. `DAC-019` (`DONE`): shared interior primitives/tokens for controls.
2. `DAC-020` (`DONE`): settings + control-panel migration to shared primitives.
3. `DAC-021` (`DONE`): launcher/utility interior migration (All Apps + windows menu).
4. `DAC-022` (`DONE`): high-traffic CRUD migration (CRM + Projects + Invoicing shell controls).
5. `DAC-023` (`DONE`): remaining operational interior migration (Payments/Forms/Templates/Workflows/Store).
6. `DAC-024` (`DONE`): lane hardening + deletion pass, with full verify (`typecheck`, `lint`, `test:unit`, `docs:guard`) complete.

Follow-up lane `I` is complete for selective PostHog architecture adoption work:

1. `DAC-025` (`DONE`): canonical shell URL-state/deep-link grammar frozen (`app/panel/entity/context`) with legacy alias compatibility and deterministic shell-key cleanup policy.
2. `DAC-026` (`DONE`): shared shell URL codec/util + deterministic open-window prop mapping with unit coverage (`tests/unit/shell/url-state.test.ts`).
3. `DAC-027` (`DONE`): compact-viewport fallback mode with single-active-window enforcement and route-first launcher coverage for critical actions (`AI assistant`, `login`, `settings`, `store`).
4. `DAC-028` (`DONE`, de-scoped): route-first marketing/content page split experiment completed, then explicitly removed from active strategy in favor of a separate dedicated landing page for SEO/content ownership.
5. `DAC-029` (`DONE`): shell lifecycle/nav telemetry and guardrails (schema-allowlisted payloads, PII redaction, and unit coverage in `tests/unit/shell/telemetry.test.ts`).
6. `DAC-030` (`DONE`): lane hardening and closeout completed after `DAC-036`, with full verification rerun (`npm run typecheck`, `npm run lint`, `npm run test:unit`, `npm run docs:guard`) and queue/docs synchronization.

Follow-up lane `J` is complete for account-hub shell and manage-org modernization work (using Lane G PostHog menu cues):

1. `DAC-031` (`DONE`): restored canonical `/builder` + `/layers` shell runtime windows across Product menu, mobile launcher, All Apps, and registry deep-link/session aliases.
2. `DAC-032` (`DONE`): replaced the top-right clock with an avatar trigger and migrated prior `More` actions into the avatar menu.
3. `DAC-033` (`DONE`): added keyboard-accessible avatar submenus for organization/language switching with icon-led chevron rows.
4. `DAC-034` (`DONE`): added direct avatar-menu `User Settings` entry into canonical Manage users/current-user flow.
5. `DAC-035` (`DONE`): shipped manage-org avatar upload/remove UX on owner + super-admin surfaces and removed targeted Win95 interior leftovers.
6. `DAC-036` (`DONE`): completed lane hardening matrix for avatar/menu/manage flows and synchronized queue/docs artifacts.

---

## Lane progress board

- [x] Lane A (`DAC-001`..`DAC-003`)
- [x] Lane B (`DAC-004`..`DAC-005`)
- [x] Lane C (`DAC-006`..`DAC-007`)
- [x] Lane D (`DAC-010`..`DAC-012`)
- [x] Lane E (`DAC-008`..`DAC-009`)
- [x] Lane F (`DAC-013`..`DAC-015`)
- [x] Lane G (`DAC-016`..`DAC-018`)
- [x] Lane H (`DAC-019`..`DAC-024`)
- [x] Lane I (`DAC-025`..`DAC-030`)
- [x] Lane J (`DAC-031`..`DAC-036`)

---

## Operating commands

- Validate docs policy: `npm run docs:guard`
- Read queue: `cat /Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/desktop-appearance-consolidation/TASK_QUEUE.md`
- Resume autonomous mode: use resume prompt in `AUTONOMOUS_EXECUTION_PROTOCOL.md`
