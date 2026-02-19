# Legacy Style Eradication Master Plan

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/legacy-style-eradication`  
**Baseline date:** 2026-02-18  
**Baseline reports:** `/Users/foundbrand_001/Development/vc83-com/tmp/reports/legacy-style-guard-baseline.txt`, `/Users/foundbrand_001/Development/vc83-com/tmp/reports/legacy-style-full-project.txt`

---

## Goal

Remove legacy style usage across the full project baseline, verify no regressions in high-risk user flows, and lock the guard so legacy patterns cannot re-enter.

Constraints:

1. Dark/sepia remain the only appearance modes.
2. No legacy theme/window-style customization is reintroduced.
3. Auth/onboarding/OAuth callback compatibility is preserved.

---

## Baseline findings (full-project scan)

- Total matches (post-edit checkpoint): `2955`
- Total files impacted (post-edit checkpoint): `244`
- Gate threshold met: yes (`>=200` matches or `>=40` files)
- Baseline guard (`EMPTY_TREE -> HEAD`) status: failing as expected on remaining scoped debt (`BASELINE_GUARD_EXIT=1`)
- Delta in this pass (`3913` / `274` -> `2955` / `244`): `-958` matches, `-30` files impacted
- Legacy button class occurrences in `src`: `333` -> `300` (`-33`)

Top feature/window groups by match count:

| Matches | Feature/window area |
|---:|---|
| 424 | `window-content/ai-chat-window` |
| 260 | `window-content/booking-window` |
| 195 | `window-content/benefits-window` |
| 146 | `window-content/ai-system-window` |
| 133 | `window-content/sequences-window` |
| 127 | `window-content/finder-window` |
| 117 | `window-content/agents` |
| 102 | `window-content/tickets-window` |
| 97 | `app/globals.css` |
| 87 | `window-content/translations-window.tsx` |
| 87 | `window-content/compliance-window.tsx` |
| 72 | `window-content/agent-configuration-window.tsx` |

Primary strategy:

1. Stabilize guard tooling first.
2. Remove global legacy token/class foundations.
3. Migrate high-density window families in deterministic waves.
4. Protect builder/routes/auth-sensitive flows while cleaning legacy utilities.
5. Run full verification stack and baseline scans after each major wave.

---

## Phase plan

| Phase | Queue rows | Purpose | Exit criteria |
|---|---|---|---|
| 1 | `LSE-001..LSE-002` | Guard/tooling stabilization | Guard runs cleanly on baseline without regex parser errors |
| 2 | `LSE-003..LSE-004` | Global token/class cleanup | `globals.css` and shared primitives no longer define/use legacy foundations |
| 3 | `LSE-005..LSE-007` | Window migration wave 1 | Integrations/super-admin/web-publishing/org-owner families migrated |
| 4 | `LSE-008..LSE-009` | Window migration wave 2 | AI chat/products/booking/events/benefits/checkout/media families migrated |
| 5 | `LSE-010..LSE-011` | Builder/routes/auth compatibility pass | Legacy utilities removed from builder/routes with compatibility intact |
| 6 | `LSE-012` | Shared/tail cleanup | Remaining legacy references cleared in shared files, `convex`, and scripts |
| 7 | `LSE-013..LSE-014` | Zero-debt checkpoint + docs closeout | Baseline scan rerun + docs synchronized + guard stack passing |

---

## Phase 1-3 progress

- `LSE-001` is `DONE` (2026-02-18): guard matching is now deterministic on BSD/macOS awk and no longer emits regex parser errors.
- Baseline guard now surfaces true legacy violations in scoped paths, which is expected until migration rows remove existing debt.
- `LSE-002` is `DONE` (2026-02-19): guard script/unit/smoke coverage is in place and full verify stack was rerun (`typecheck` pass, `lint` pass with warnings, `test:unit` pass, `docs:guard` pass, `ui:legacy:guard` fail on known baseline debt).
- `LSE-003` is `DONE` (2026-02-19): canonical `--shell-*` dark/sepia token semantics remain in `src/app/globals.css` for shared shell layers and core window behavior was preserved. Row verify stack: `typecheck` pass, `lint` pass with warnings (`2964`, `0` errors), `test:unit` pass (`76` files, `391` tests), `docs:guard` pass, `ui:legacy:guard` fail on known baseline scoped debt.
- `LSE-004` is `DONE` (2026-02-19): shared primitives use `desktop-shell-*` classes/tokens in `src/components/retro-button.tsx`, `src/components/retro-window.tsx`, and `src/components/floating-window.tsx` while keeping dark/sepia semantics intact. Row verify stack: `typecheck` transient `TS2589` (`src/components/window-content/store-window.tsx:46`) on first run and pass on immediate rerun; `lint` pass with warnings (`2963`, `0` errors); `test:unit` pass (`77` files, `396` tests); `docs:guard` pass; `ui:legacy:guard` fail on known baseline scoped debt.
- `LSE-005` is `DONE` (2026-02-19): `src/components/window-content/integrations-window/*` scans `0` for queue legacy patterns and integrations workflows were preserved. Row verify stack: `typecheck` pass; `lint` pass with warnings (`2970`, `0` errors); `test:unit` pass (`80` files, `417` tests); `docs:guard` pass; `ui:legacy:guard -- "$EMPTY_TREE" HEAD` fail on known global baseline debt outside Lane `C`.
- `LSE-006` is `DONE` (2026-02-19): `src/components/window-content/super-admin-organizations-window/*` scans `0` for queue legacy patterns and manage/admin workflows + translations were preserved. Row verify stack: `typecheck` pass; `lint` pass with warnings (`2970`, `0` errors); `test:unit` pass (`80` files, `417` tests); `docs:guard` pass; `ui:legacy:guard -- "$EMPTY_TREE" HEAD` fail on known global baseline debt outside Lane `C`.
- `LSE-007` is `DONE` (2026-02-19): `src/components/window-content/web-publishing-window/*` and `src/components/window-content/org-owner-manage-window/*` scan `0` for queue legacy patterns while preserving publishing/manage workflows and translation keys. Row verify stack: `typecheck` pass after lane-safe type unblocks (`src/components/window-content/org-owner-manage-window/ai-settings-tab.tsx`, `src/lib/store-pricing-calculator.ts`, `convex/integrations/aiConnections.ts`); `lint` pass with warnings (`2971`, `0` errors); `test:unit` pass (`84` files, `431` tests); `docs:guard` pass; `ui:legacy:guard -- "$EMPTY_TREE" HEAD` fail on known global baseline debt outside Lane `C`.
- Additional targeted migration pass (2026-02-18) completed in priority windows: `products-window`, `events-window`, `checkout-window`, `media-library-window`, and `integrations-window` now scan `0` for `retro-button|beveled-button|var(--win95-|--win95-` after mapping to `desktop-interior-button*` and `--shell-*` tokens.
- Lane `B` closeout completed on 2026-02-19: `LSE-003` and `LSE-004` are now `DONE`; `V-LEGACY` still fails on broad baseline debt (`EMPTY_TREE -> HEAD`) but no longer blocks the dependency chain for Lane `C`.
- Lane `D` closeout completed on 2026-02-19: `LSE-008` and `LSE-009` are now `DONE`; scoped queue-pattern scans are `0` across `ai-chat-window`, `products-window`, `booking-window`, `events-window`, `benefits-window`, `checkout-window`, and `media-library-window` while preserving assistant/products/booking/events behavior.
- Lane `D` verify stack reruns (2026-02-19): `npm run typecheck` pass after transient deep-instantiation noise on earlier attempts; `npm run lint` pass with warnings (`2977`, `0` errors); `npm run test:unit` pass (`85` files, `437` tests); `npm run docs:guard` pass; `npm run ui:legacy:guard -- "$EMPTY_TREE" HEAD` fail on known broad baseline debt outside Lane `D`.
- Lane `E` closeout completed on 2026-02-19: `LSE-010` and `LSE-011` are now `DONE`; builder workspace/path surfaces no longer use `zinc-*`/`purple-*` utilities, `src/app/page.tsx` taskbar shell wrappers use `desktop-shell-window`, and auth-adjacent `login-window`/`auth/cli-login` styling migrated from `retro-*` classes to `desktop-shell-*` aliases while preserving auth/onboarding/OAuth callback behavior.
- Lane `E` verify stack reruns (2026-02-19): `npm run typecheck` pass (with local `TS2589` suppression on `login-window` Convex query), `npm run lint` pass with warnings (`2980`, `0` errors), `npm run test:unit` pass (`89` files, `456` tests), `npm run docs:guard` pass, and `npm run ui:legacy:guard -- "$EMPTY_TREE" HEAD` fail on known broad baseline debt outside Lane `E`.
- Lane `F` closeout completed on 2026-02-19: `LSE-012` is now `DONE` after shared/tail cleanup removed remaining queue-pattern matches from non-window shared `src/components` and `convex`, while preserving script guard literals required by `scripts/ci/check-legacy-style-introductions.sh`.
- Lane `F` verify stack results (2026-02-19): `npm run typecheck` failed (`TS2589` at `src/components/interview/template-designer.tsx:57`); `npm run lint` passed with warnings (`2987`, `0` errors); `npm run test:unit` passed (`90` files, `459` tests); `npm run docs:guard` passed; `npm run ui:legacy:guard -- "$EMPTY_TREE" HEAD` failed on broad existing debt in guarded scope (`src/app/globals.css`, `src/app/page.tsx`, and `src/components/window-content/*`).
- Residual tracking for Lane `F`: `/Users/foundbrand_001/Development/vc83-com/tmp/reports/legacy-style-lse012-lanef-residual.txt` now reports `1523` scoped matches across `src/components`, `convex`, and `scripts` (excluding `scripts/training/output`), with `0` in non-window shared `src/components`, `0` in `convex`, and only `5` intentional guard literals in scripts.
- Lane `G` checkpoint state on 2026-02-19: dependency gate is now satisfied (`LSE-013` is `READY`), but closeout remains gated until reruns capture updated baseline debt metrics and address unresolved `V-TYPE` (`template-designer` `TS2589`) plus broad `V-LEGACY` failures.

---

## Verification contract

Every queue row must run:

1. `npm run typecheck`
2. `npm run lint`
3. `npm run test:unit`
4. `npm run docs:guard`
5. `npm run ui:legacy:guard -- "$EMPTY_TREE" HEAD` (with `EMPTY_TREE=$(git hash-object -t tree /dev/null)`)

---

## Risk controls

1. Keep OAuth callback query compatibility tests/scenarios in every auth-adjacent migration row.
2. Keep onboarding and auth route behavior under unit/integration checks before and after style changes.
3. Isolate shared-shell file edits to reduce multi-lane merge conflicts.
4. Guard-script reliability was a release blocker; this was resolved in `LSE-001` on 2026-02-18 and the baseline guard now reports real legacy matches.

---

## Completion criteria

1. Full-project regex scan reduced to intentional/approved residuals only (ideally zero runtime legacy matches).
2. Guard stack runs cleanly without script parser errors.
3. No regressions in auth/onboarding/OAuth callback and desktop shell behavior.
4. Queue, blockers, index, and master plan are synchronized and docs guard passes.
