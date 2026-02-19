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

## Phase 1-2 progress

- `LSE-001` is `DONE` (2026-02-18): guard matching is now deterministic on BSD/macOS awk and no longer emits regex parser errors.
- Baseline guard now surfaces true legacy violations in scoped paths, which is expected until migration rows remove existing debt.
- `LSE-002` implementation is landed (script/unit/smoke coverage), but row status is `BLOCKED` by unrelated typecheck failures in `src/components/window-content/integrations-window/microsoft-settings.tsx`.
- `LSE-003` implementation is landed in working tree: `src/app/globals.css` now uses canonical `--shell-*` root tokens for dark/sepia, and legacy token names are bridged outside `:root` for compatibility.
- `LSE-004` implementation is landed in working tree: shared primitives switched to `desktop-shell-*` classes/tokens in `src/components/retro-button.tsx`, `src/components/retro-window.tsx`, `src/components/floating-window.tsx`, with compatibility selectors retained in `globals.css`.
- `LSE-005` implementation is landed in working tree: `src/components/window-content/integrations-window/*` now scans `0` for queue legacy patterns (`retro-button`, `--win95-*`, `var(--win95-*)`, `data-window-style`, `zinc-*`, `purple-*`), but row remains `BLOCKED` by upstream dependency `LSE-004` and global `V-LEGACY` failure.
- `LSE-006` implementation is landed in working tree: `src/components/window-content/super-admin-organizations-window/*` now scans `0` for queue legacy patterns, but row remains `BLOCKED` by dependency on `LSE-005` and global `V-LEGACY` failure.
- `LSE-007` implementation is landed in working tree: `src/components/window-content/web-publishing-window/*` and `src/components/window-content/org-owner-manage-window/*` now scan `0` for queue legacy patterns while preserving publish/manage flows and translations, but row remains `BLOCKED` by dependency chain and global `V-LEGACY` failure.
- Additional targeted migration pass (2026-02-18) completed in priority windows: `products-window`, `events-window`, `checkout-window`, `media-library-window`, and `integrations-window` now scan `0` for `retro-button|beveled-button|var(--win95-|--win95-` after mapping to `desktop-interior-button*` and `--shell-*` tokens.
- Both Lane `B` rows remain `BLOCKED` (`BLK-LSE-003`, `BLK-LSE-004`) until `LSE-002` is `DONE`; latest verify runs show `typecheck`/`lint`/`test:unit`/`docs:guard` passing while `V-LEGACY` continues to fail on global baseline debt (`EMPTY_TREE -> HEAD`).
- Lane `D` execution remains blocked (`BLK-LSE-008`) because `LSE-007` is not `DONE` under dependency rules, even though scoped Lane `C` files are now clean in working tree.
- Lane `E` execution attempt on 2026-02-18 is blocked (`BLK-LSE-010`): scoped builder/auth cleanup edits were prepared, but `LSE-009` is still blocked and required verify gates cannot be satisfied yet.
- Lane `F` execution attempt on 2026-02-18 is blocked (`BLK-LSE-012`) because `LSE-011` is not `DONE`; partial cleanup landed by removing `var(--win95-*)` usage from shared non-window/non-builder components and clearing `convex` references.
- Lane `F` verify stack results (2026-02-18): `npm run typecheck` pass; `npm run lint` pass with existing warnings; `npm run test:unit` pass; `npm run docs:guard` pass; `npm run ui:legacy:guard -- "$EMPTY_TREE" HEAD` fail on broad existing debt in guarded scope (`src/app/globals.css`, `src/app/page.tsx`, and `src/components/window-content/*`).
- Residual tracking for Lane `F`: `/Users/foundbrand_001/Development/vc83-com/tmp/reports/legacy-style-lse012-lanef-residual.txt` (`4591` total matches across `src/components`, `convex`, and `scripts`; `0` in `convex`; script-only matches are intentional guard literals).
- Lane `G` checkpoint (2026-02-18): `LSE-013`/`LSE-014` reran scans and full verify stack; rows remain blocked because `LSE-012` is not `DONE`, `npm run typecheck` fails (`TS2589` in `src/components/window-content/media-library-window/components/left-sidebar.tsx:32`), `npm run lint` passes with warnings (`0` errors), `npm run test:unit` passes (`71` files, `346` tests), `npm run docs:guard` passes, and `npm run ui:legacy:guard -- "$EMPTY_TREE" HEAD` fails on broad scoped debt.

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
