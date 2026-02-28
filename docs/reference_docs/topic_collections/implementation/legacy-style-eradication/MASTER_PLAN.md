# Legacy Style Eradication Master Plan

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/legacy-style-eradication`  
**Baseline date:** 2026-02-18  
**Baseline reports:** `/Users/foundbrand_001/Development/vc83-com/tmp/reports/legacy-style-guard-baseline.txt`, `/Users/foundbrand_001/Development/vc83-com/tmp/reports/legacy-style-full-project.txt`

---

## Goal

Remove legacy UI style debt across the full project baseline, converge the runtime UI to the *l4yercak3* design token contract, and lock CI so new design drift cannot re-enter.

Primary constraints:

1. Keep two runtime appearance modes only, with semantic convergence to the contract (`dark` -> `midnight`, `sepia` -> `daylight`) until naming migration is complete.
2. Do not reintroduce legacy theme/window-style customization.
3. Preserve auth, onboarding, and OAuth callback compatibility.
4. Treat `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/legacy-style-eradication/l4yercak3-design-token-contract.md` as the canonical style contract.
5. Treat UIP (`/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/ui-perfection-workstream/TASK_QUEUE.md`) as archival while LSE convergence rows remain open; unblock only after `LSE-022` completion and explicit handoff.

---

## Baseline findings (full-project scan)

- Total matches (Lane `G` rerun checkpoint): `2117`
- Total files impacted (Lane `G` rerun checkpoint): `163`
- Gate threshold met: yes (`>=200` matches or `>=40` files)
- Baseline guard (`EMPTY_TREE -> HEAD`) status: failing as expected on remaining scoped debt (`BASELINE_GUARD_EXIT=1`)
- Delta in baseline pass (`3913` / `274` -> `2117` / `163`): `-1796` matches, `-111` files impacted
- Delta versus prior Lane `F` checkpoint (`2955` / `244` -> `2117` / `163`): `-838` matches, `-81` files impacted
- Legacy button class occurrences in `src` within checkpoint artifacts: `146` -> `102` (`-44`)
- Lane `G` verify evidence (`LSE-013` + `LSE-014`): `typecheck` pass; `lint` pass with warnings (`3009`, `0` errors); `test:unit` pass (`92` files, `473` tests) in unrestricted runs; `docs:guard` pass; `ui:legacy:guard` fail on expected baseline debt.
- Token-contract baseline (`ui:design:guard`, `EMPTY_TREE -> HEAD`): `6420` hits total.
- Active-scope token-contract baseline (temporary exclusions applied): `5811` hits, with `/Users/foundbrand_001/Development/vc83-com/src/app/project/[slug]/templates/gerrit/GerritTemplate.tsx` and `/Users/foundbrand_001/Development/vc83-com/src/components/template-renderer.tsx` deferred to `LSE-023`.
- Lane `H` execution (2026-02-24): `LSE-016` landed the `globals.css` contract alias layer and is now complete after clearing newly introduced `ui:design:guard` drift in changed `src/components` lines; verify rerun passed (`typecheck`, `lint` warnings only, `test:unit`, `ui:design:guard`, `docs:guard`).

Top remaining feature/window clusters by match count:

| Matches | Feature/window area |
|---:|---|
| 146 | `window-content/ai-system-window` |
| 137 | `window-content/agents` |
| 133 | `window-content/sequences-window` |
| 127 | `window-content/finder-window` |
| 102 | `window-content/tickets-window` |
| 87 | `window-content/translations-window.tsx` |
| 87 | `window-content/compliance-window.tsx` |
| 73 | `app/globals.css` |
| 72 | `window-content/agent-configuration-window.tsx` |
| 20 | `window-content/booking-window` |
| 20 | `window-content/benefits-window` |
| 1 | `window-content/ai-chat-window` |

---

## Phase plan

| Phase | Queue rows | Purpose | Exit criteria |
|---|---|---|---|
| 1 | `LSE-001..LSE-002` | Guard/tooling stabilization | Legacy guard runs without parser errors on baseline |
| 2 | `LSE-003..LSE-004` | Global legacy token/class cleanup | Shared shell base no longer depends on Win95 token roots |
| 3 | `LSE-005..LSE-007` | Window migration wave 1 | Integrations/super-admin/publishing/manage families migrated |
| 4 | `LSE-008..LSE-009` | Window migration wave 2 | AI chat/products/booking/events/benefits/checkout/media families migrated |
| 5 | `LSE-010..LSE-011` | Builder/routes/auth compatibility pass | Legacy utility debt removed with compatibility intact |
| 6 | `LSE-012` | Shared/tail cleanup | Shared non-window `src/components` + `convex` queue patterns at `0` |
| 7 | `LSE-013..LSE-014` | Legacy checkpoint + docs closeout | Baseline rerun evidence captured and queue docs synchronized |
| 8 | `LSE-015..LSE-016` | Token contract guard + alias foundation | CI guard enforces contract-derived drift; canonical token alias layer prepared |
| 9 | `LSE-017..LSE-018` | Shell + primitive convergence | Taskbar/menu/window chrome and shared primitives mapped to contract tokens |
| 10 | `LSE-019..LSE-020` | Remaining UI migration | Window-content and route surfaces converge to contract without regressions |
| 11 | `LSE-021..LSE-022` | Visual/contrast lock + final closeout | Deterministic visual+contrast checks and final queue/doc handoff complete |
| 12 | `LSE-023` | Deferred template cleanup | Excluded template surfaces converge under token contract after closeout |

---

## Current status

- `LSE-001..LSE-012`: `DONE`.
- `LSE-013`: `DONE` (2026-02-19) after successful rerun verification and refreshed baseline metrics.
- `LSE-014`: `DONE` (2026-02-19) after final docs synchronization and row-level verify stack rerun.
- `LSE-015`: `DONE` (2026-02-19, portability follow-up 2026-02-24). `ui-design-guard` enforces contract-derived checks for newly introduced lines, includes contract-doc workflow triggers, and now runs on macOS Bash 3 (`mapfile` removed).
- `LSE-016`: `DONE` (2026-02-24) after alias-layer merge plus follow-up drift cleanup and full row verify pass.
- `LSE-017`: `DONE` (2026-02-24) after shell chrome convergence and blocker clear (`BLK-LSE-017`), including follow-up promotion rerun cleanup for out-of-scope modal drift in `src/components/processing-modal.tsx`.
- `LSE-018`: `DONE` (2026-02-24) after shared primitive convergence and follow-up full verify rerun pass (`typecheck`; `lint` warnings `3128`/`0` errors; `test:unit` `109` files/`570` tests; `ui:design:guard`; `docs:guard`).
- `LSE-019`: `DONE` (2026-02-24) after bounded migration across `ai-system-window`, `sequences-window`, `finder-window`, `tickets-window`, `translations-window`, `compliance-window`, and `agent-configuration-window`, replacing residual `retro-*` primitives and removing high-signal design drift patterns (`transition-all`, `bg-black/*`, `shadow-*`, rgba + fallback hex literals) in touched files.
- `LSE-020`: `DONE` (2026-02-24) after route/builder/start-menu sweep (`src/components/start-menu.tsx`, `src/components/builder/page-header.tsx`, `src/app/checkout/success/page.tsx`) to remove remaining disallowed utility usage and align to contract token primitives without auth/onboarding/OAuth behavior changes.
- `LSE-021`: `DONE` (2026-02-24) after landing deterministic visual/contrast contract checks and CI outputs: Playwright tests now emit stable `screen/mode/token` labels, contrast rows expose machine-readable status/ratio/threshold metadata, and CI emits deterministic summary lines from `tmp/test-results/ui-visual/results.json`.
- `LSE-022`: `DONE` (2026-02-24) after full closeout verification rerun and debt-delta publication in `/Users/foundbrand_001/Development/vc83-com/tmp/reports/legacy-style-lse022-closeout-summary.md`.
- `LSE-023`: `PENDING` deferred row for excluded template surfaces (`GerritTemplate` and `template-renderer`), scheduled after `LSE-022`.
- Cross-workstream supersession: `UIP-009` and `UIP-010` are now eligible for explicit reactivation because `LSE-022` is complete.

Open verification risk carried from prior pass:

- `V-LEGACY` remains failing on broad scoped debt by design at this migration stage (`BASELINE_GUARD_EXIT=1`).
- `typecheck` remains failing in current workspace on pre-existing out-of-scope typing debt (not introduced by Lane `K` edits), currently reproducing as `TS2589` at `src/app/api/webhooks/activecampaign/route.ts:196:39`.

---

## Implementation strategy extension (contract convergence)

1. Lock guard behavior first (`LSE-015`) so new drift cannot expand while migrations continue.
2. Introduce canonical contract token aliases in `globals.css` (`LSE-016`) while preserving compatibility with current runtime mode keys.
3. Migrate shell chrome + primitives before broad window sweeps (`LSE-017`, `LSE-018`) to reduce repeated churn.
4. Execute bounded window/route surface migrations in clustered waves (`LSE-019`, `LSE-020`).
5. Finalized visual and contrast contract validation with deterministic pass/fail output (`LSE-021`).
6. Completed final verification + docs sync (`LSE-022`) with debt deltas captured in report artifacts.

---

## Verification contract

For each queue row, run the row-level Verify commands exactly as listed in `TASK_QUEUE.md`.

Common profile stack across migration rows:

1. `npm run typecheck`
2. `npm run lint`
3. `npm run test:unit`
4. `npm run ui:design:guard`
5. `npm run docs:guard`
6. `npm run ui:legacy:guard -- "$EMPTY_TREE" HEAD` (rows that include `V-LEGACY`)

---

## Risk controls

1. Keep OAuth callback query compatibility checks in auth-adjacent rows.
2. Preserve onboarding/auth route behavior while swapping styles/tokens.
3. Isolate `globals.css` and shared primitive edits by lane to avoid merge conflicts.
4. Keep guard exceptions explicit (`**/tokens/**`, `**/globals.css`, `**/tailwind.config.*`) and avoid ad-hoc bypasses.
5. Require deterministic pass/fail labeling for visual and contrast checks before final closeout.

---

## Completion criteria

1. No new design drift introductions under `ui-design-guard` contract checks.
2. Remaining legacy-style debt is reduced and documented with refreshed baseline metrics.
3. Core runtime flows (auth, onboarding, OAuth callback, window/taskbar interactions) show no behavioral regressions.
4. Queue artifacts (`INDEX`, `MASTER_PLAN`, `TASK_QUEUE`, `SESSION_PROMPTS`, `BLOCKERS`) are synchronized and `npm run docs:guard` passes.
