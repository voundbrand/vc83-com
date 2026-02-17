# Desktop Appearance Consolidation Master Plan

**Date:** 2026-02-17  
**Scope:** Execute the dark/sepia-only desktop appearance migration with queue-first, low-conflict delivery.

---

## Mission

Deliver a world-class desktop experience by:

- removing multi-theme and multi-window-style bloat,
- preserving Windows/Finder metaphors,
- converging visual quality with `/builder` and `/layers`,
- safely migrating preferences and compatibility layers.

---

## Non-goals

- No redesign of template/web publishing theme system in `src/templates/**`.
- No broad unrelated refactors outside appearance migration scope.
- No code implementation from this file alone; execution is controlled by queue rows.

---

## Workstream architecture

- Queue control: `TASK_QUEUE.md`
- Operational protocol: `AUTONOMOUS_EXECUTION_PROTOCOL.md`
- Lane prompts: `SESSION_PROMPTS.md`
- Blocker logging: `BLOCKERS.md`
- Program-level snapshot: this file + `INDEX.md`

---

## Phase-to-lane mapping

| Source phase | Objective | Queue lanes | Queue tasks |
|---|---|---|---|
| Phase 1 | Appearance foundation + persistence | `A` | `DAC-001`..`DAC-003` |
| Phase 2 | Typography/layout convergence | `B` | `DAC-004`..`DAC-005` |
| Phase 3 | UI cleanup for settings and toggles | `C` | `DAC-006`..`DAC-007` |
| Phase 4 | CSS token convergence + shell modernization | `D` | `DAC-010`..`DAC-012` |
| Phase 5 | Backend preference migration | `E` | `DAC-008`..`DAC-009` |
| Phase 6 + 7 | Hardening + deletion pass | `F` | `DAC-013`..`DAC-015` |
| Phase 8 | PostHog-inspired desktop polish follow-up | `G` | `DAC-016`..`DAC-018` |
| Phase 9 | Window interior control cleanup follow-up | `H` | `DAC-019`..`DAC-024` |

---

## Delivery waves

1. **Wave 0 (stabilization):** finish Lane A before any UI/schema lane starts.
2. **Wave 1 (parallel low-overlap):** run lanes B, C, and E with one active task per lane.
3. **Wave 2 (convergence):** run Lane D after B/C are complete.
4. **Wave 3 (hardening):** run Lane F only when all P0/P1 tasks are complete or blocked.
5. **Wave 4 (desktop polish):** run Lane G sequentially using PostHog reference notes as implementation guardrails.
6. **Wave 5 (interior cleanup):** run Lane H sequentially to migrate window internals to shared primitives.

---

## Acceptance criteria

1. Only `dark` and `sepia` appearance modes exist in user-facing controls.
2. Reading mode persists via `localStorage["reading-mode"]` and backend preference synchronization.
3. Legacy theme/window-style paths are removed only after compatibility and migration tasks are done.
4. Windows/Finder metaphors remain intact with improved visual consistency.
5. Verification commands in all completed queue rows pass.
6. `npm run docs:guard` passes at queue updates and final closeout.

---

## Program risks (global)

1. Cross-lane merge conflicts around `globals.css` and desktop shell files.
2. User preference drift during dual-read/write migration window.
3. Regression in desktop accessibility contrast/focus states while changing token layers.

Mitigation approach:

- strict lane ownership,
- deterministic dependencies,
- explicit per-row verification,
- blocker logging and skip-forward execution.

---

## Status snapshot

- Current execution status is tracked in `TASK_QUEUE.md`.
- Base migration execution is complete through Lane `F` (`DAC-013`..`DAC-015`) as of 2026-02-17.
- Follow-up Lane `G` is complete for UX polish (`DAC-016`..`DAC-018` all `DONE`), including top-nav migration, menu/document convergence, icon-system rollout, and center-origin shell motion.
- Follow-up Lane `H` is in progress: `DAC-019`..`DAC-022` are complete (shared primitives + settings/control-panel + launcher/menu + CRM/projects/invoicing shell interiors), and `DAC-023` is actively migrating remaining operational interiors with Store dark-mode interior contrast cleanup already landed.
- Detailed benchmark notes for Lane `G` live in `LANE_G_POSTHOG_REFERENCE_NOTES.md`.
