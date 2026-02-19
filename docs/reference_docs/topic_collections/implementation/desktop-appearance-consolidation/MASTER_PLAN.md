# Desktop Appearance Consolidation Master Plan

**Date:** 2026-02-18  
**Scope:** Execute the dark/sepia-only desktop appearance migration, selective PostHog-inspired UI architecture follow-up, and account-hub shell modernization with queue-first, low-conflict delivery.

---

## Mission

Deliver a world-class desktop experience by:

- removing multi-theme and multi-window-style bloat,
- preserving Windows/Finder metaphors,
- converging visual quality with `/builder` and `/layers`,
- safely migrating preferences and compatibility layers,
- adopting only the PostHog patterns that improve vc83 execution quality (mobile fallback, stable deep-link semantics, and shell-runtime boundaries),
- consolidating top-right account controls into an avatar-driven menu with submenu switchers and modernized manage-org surfaces.

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
- Window UI contract: `WINDOW_UI_DESIGN_CONTRACT.md`
- Window UI audit tracker: `WINDOW_UI_CONTRACT_AUDIT_MATRIX.md`
- Program-level snapshot: this file + `INDEX.md`

---

## Canonical shell URL-state contract (frozen in `DAC-025`)

Canonical desktop deep-link grammar:

- `/?app=<window-id>`
- Optional extensions:
  - `&panel=<panel-id>`
  - `&entity=<entity-id>`
  - `&context=<source>`

Field semantics:

- `app`: required shell runtime target (must map to a registered desktop window).
- `panel`: optional first-level interior tab/panel selector.
- `entity`: optional record/document discriminator for app-specific restoration.
- `context`: optional non-PII source hint (for telemetry/routing context only).

Backward-compatibility policy:

- Read aliases remain supported:
  - `openWindow` -> `app`
  - `window` -> `app`
  - `tab` -> `panel`
- Legacy OAuth callback flow (`window=manage&tab=integrations`) remains intact until callback routes are migrated.
- Auth/onboarding/OAuth attribution params remain unchanged and are not part of shell state.

Cleanup policy:

- After shell deep-link consumption, remove only shell keys (`app`, `panel`, `entity`, `context`, plus legacy aliases) and shell upgrade helpers (`upgradeReason`, `upgradeResource`).
- Preserve non-shell query params unless a dedicated callback flow explicitly clears the entire query string.

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
| Phase 10 | Selective PostHog architecture adoption follow-up | `I` | `DAC-025`..`DAC-030` |
| Phase 11 | Account-hub shell + manage-org modernization follow-up | `J` | `DAC-031`..`DAC-036` |

---

## Delivery waves

1. **Wave 0 (stabilization):** finish Lane A before any UI/schema lane starts.
2. **Wave 1 (parallel low-overlap):** run lanes B, C, and E with one active task per lane.
3. **Wave 2 (convergence):** run Lane D after B/C are complete.
4. **Wave 3 (hardening):** run Lane F only when all P0/P1 tasks are complete or blocked.
5. **Wave 4 (desktop polish):** run Lane G sequentially using PostHog reference notes as implementation guardrails.
6. **Wave 5 (interior cleanup):** run Lane H sequentially to migrate window internals to shared primitives.
7. **Wave 6 (architecture follow-up):** run Lane I sequentially after Lane H closeout to implement URL-state contract, mobile fallback mode, and shell-runtime hardening boundaries.
8. **Wave 7 (account hub follow-up):** run Lane J sequentially after `DAC-028` to restore builder/layers IA, migrate account controls to avatar menu + submenus, and modernize manage-org settings visuals/avatar upload.

---

## Acceptance criteria

1. Only `dark` and `sepia` appearance modes exist in user-facing controls.
2. Reading mode persists via `localStorage["reading-mode"]` and backend preference synchronization.
3. Legacy theme/window-style paths are removed only after compatibility and migration tasks are done.
4. Windows/Finder metaphors remain intact with improved visual consistency.
5. Verification commands in all completed queue rows pass.
6. `npm run docs:guard` passes at queue updates and final closeout.
7. Desktop deep links use one canonical URL-state grammar and restore intended app/panel context deterministically.
8. Mobile users get a stable route-first fallback experience instead of desktop multi-window overload.
9. SEO/content surfaces are owned by the separate dedicated landing page strategy, not this desktop shell workstream.
10. Top-right taskbar account controls are avatar-driven (clock removed) and expose keyboard-accessible submenu switchers for language and organization.
11. `/builder` and `/layers` are first-class desktop-runtime windows in Product/menu launcher IA and remain dark/sepia consistent.
12. Manage-org owner + super-admin surfaces support avatar upload UI and remove remaining Win95 styling leftovers in targeted scope.
13. Window UI work follows `WINDOW_UI_DESIGN_CONTRACT.md` (shared interior primitives/tokens, no emoji chrome, explicit accessibility checks).

---

## Program risks (global)

1. Cross-lane merge conflicts around `globals.css` and desktop shell files.
2. User preference drift during dual-read/write migration window.
3. Regression in desktop accessibility contrast/focus states while changing token layers.
4. URL parameter contract drift between shell entry points and OAuth/onboarding callback handlers.
5. Mobile fallback changes accidentally reducing parity for critical user actions.

Mitigation approach:

- strict lane ownership,
- deterministic dependencies,
- explicit per-row verification,
- blocker logging and skip-forward execution.
- explicit URL-state schema and parser/serializer tests before rollout.

---

## DAC-030 closeout completion (2026-02-18)

`DAC-030` is complete after dependency clear from `DAC-036` and full closeout verification rerun.

### Completed rollout checklist

1. Canonical shell URL keys remain `app`, `panel`, `entity`, `context` with legacy alias compatibility unchanged.
2. Auth/onboarding/OAuth callback query handling remains backward compatible (`window=manage&tab=integrations` still functional).
3. Mobile fallback keeps route-first critical actions (`ai-assistant`, `login`, `settings`, `store`) without multi-window overload.
4. Desktop top-nav/content links align with the dedicated landing-page SEO strategy and do not require in-shell marketing route ownership.
5. Shell telemetry allowlist/redaction behavior remains intact for nav and window lifecycle events.
6. Full verification profile passed (`npm run typecheck`, `npm run lint`, `npm run test:unit`, `npm run docs:guard`).

### Fallback behavior matrix (closeout reference)

| Surface | Desktop shell behavior | Compact/mobile fallback behavior | Regression guard |
|---|---|---|---|
| Shell entry (`/`) | Multi-window runtime with URL-state restore | Single-active-window fallback with route-first launcher actions | Keep deterministic open/focus/minimize semantics |
| Auth and OAuth callbacks | Preserve callback params and legacy alias reads | Preserve callback params; avoid shell-key over-cleanup | Do not clear non-shell params outside callback-specific paths |
| Critical actions (`ai-assistant`, `login`, `settings`, `store`) | Open via canonical shell deep links | Route-first launcher targets with canonical query contract | Ensure guest/user parity for access gates |
| Content entry links | Top-nav/content links may hand off to dedicated landing page surfaces | Same handoff behavior | Keep desktop runtime scope independent from SEO landing-page implementation |
| Telemetry (`shell_*` events) | Capture schema-allowlisted shell lifecycle/nav payloads | Capture same events without extra PII-like fields | Enforce payload builder redaction/allowlist only |

### Unresolved follow-ups (deterministic backlog, post-closeout candidates)

1. `DAC-030-FU-01`: add targeted integration coverage for canonical-vs-legacy param precedence across auth return paths.
2. `DAC-030-FU-02`: add compact-viewport interaction assertions for launcher critical-action parity.
3. `DAC-030-FU-03`: add telemetry smoke assertions for rapid focus/minimize churn to catch duplicate/missing events.

---

## Status snapshot

- Current execution status is tracked in `TASK_QUEUE.md`.
- Base migration execution is complete through Lane `F` (`DAC-013`..`DAC-015`) as of 2026-02-17.
- Follow-up Lane `G` is complete for UX polish (`DAC-016`..`DAC-018` all `DONE`), including top-nav migration, menu/document convergence, icon-system rollout, and center-origin shell motion.
- Follow-up Lane `H` is complete (`DAC-019`..`DAC-024` all `DONE`), including shared interior primitives rollout, migrated operational windows, and hardening pass that removed remaining Win95 interior tokens/classes in the migrated scope with full verification complete.
- Follow-up Lane `I` is complete (`DAC-025`..`DAC-030` all `DONE`) with shell URL-state hardening, compact fallback guardrails, telemetry instrumentation, and final closeout verification/docs synchronization complete on 2026-02-18.
- Follow-up Lane `J` is complete (`DAC-031`..`DAC-036` all `DONE`) with builder/layers runtime IA parity, avatar menu/submenu migration, direct user-settings routing, manage-org avatar upload modernization, and lane hardening verification/docs sync.
- Detailed benchmark notes for Lane `G` live in `LANE_G_POSTHOG_REFERENCE_NOTES.md`.
- Formal window-level UI governance now lives in `WINDOW_UI_DESIGN_CONTRACT.md` and is required for all future desktop-window UI changes.
