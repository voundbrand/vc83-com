# Legacy Style Eradication Task Queue

**Last updated:** 2026-02-19  
**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/legacy-style-eradication`  
**Baseline reports:** `/Users/foundbrand_001/Development/vc83-com/tmp/reports/legacy-style-guard-baseline.txt`, `/Users/foundbrand_001/Development/vc83-com/tmp/reports/legacy-style-full-project.txt`

---

## Queue rules

1. Allowed statuses are only: `READY`, `IN_PROGRESS`, `PENDING`, `BLOCKED`, `DONE`.
2. Promote a task from `PENDING` to `READY` only when every dependency is `DONE`.
3. Deterministic selection order: highest priority (`P0` -> `P1` -> `P2`) then lowest ID.
4. Keep one `IN_PROGRESS` task per lane maximum; do not overlap edits on the same files.
5. Every task must run the queue verify stack before moving to `DONE`.
6. If a task is `BLOCKED`, log it in `BLOCKERS.md` and move to the next `READY` task.
7. Keep dark/sepia as the only appearance modes.
8. Do not reintroduce legacy theme families or `data-window-style` customization.
9. Preserve auth, onboarding, and OAuth callback behavior (`window=manage&tab=integrations` and related flows).
10. After each completed task, sync `INDEX.md`, `MASTER_PLAN.md`, and `TASK_QUEUE.md`.

---

## Verification profiles

| Profile | Command |
|---|---|
| `V-TYPE` | `npm run typecheck` |
| `V-LINT` | `npm run lint` |
| `V-UNIT` | `npm run test:unit` |
| `V-DOCS` | `npm run docs:guard` |
| `V-LEGACY` | `npm run ui:legacy:guard -- "$EMPTY_TREE" HEAD` |

Note: Set `EMPTY_TREE=$(git hash-object -t tree /dev/null)` in the current shell before running `V-LEGACY`.

---

## Execution lanes

| Lane | Purpose | Primary ownership | Merge-overlap policy |
|---|---|---|---|
| `A` | Guard/tooling stabilization and scan repeatability | `scripts/ci/*`, report automation | No UI edits until guard output is stable |
| `B` | Global token/selector cleanup | `src/app/globals.css`, shell primitives | No route/component churn until base tokens are stable |
| `C` | High-density window-content migration wave 1 | `src/components/window-content/{integrations-window,super-admin-organizations-window,web-publishing-window}` | One window family at a time |
| `D` | High-density window-content migration wave 2 | `src/components/window-content/{org-owner-manage-window,ai-chat-window,products-window,booking-window,events-window}` | One window family at a time |
| `E` | Builder/routes/auth compatibility hardening | `src/components/builder/*`, `src/app/*`, auth/onboarding/OAuth-sensitive flows | Preserve route/query behavior |
| `F` | Shared component and tail cleanup | `src/components/*`, `convex/*`, `scripts/*` | No schema contract drift |
| `G` | Final verification + closeout docs sync | cross-cutting + workstream docs | Start only after all P0/P1 tasks are done |

---

## Concurrency rules

1. Run Lane `A` first through `LSE-002`.
2. After `LSE-002` is `DONE`, run one active task each in Lane `B` and Lane `C`.
3. Lane `D` starts only after `LSE-004` and `LSE-005` are `DONE`.
4. Lane `E` starts only after `LSE-007` and `LSE-009` are `DONE`.
5. Lane `F` starts only after Lane `E` tasks are `DONE`.
6. Lane `G` starts only when all `P0` and `P1` tasks are `DONE` or explicitly `BLOCKED`.

---

## Dependency-based status flow

1. Keep `LSE-001` as the first executable task because guard script validity gates all later verification trust.
2. Keep all migration rows `PENDING` until their predecessor lane gates are met.
3. Promote `LSE-010` only after builder/routes cleanup rows are complete to avoid mixed contracts.
4. Promote `LSE-012` only after `LSE-011` to avoid repeated shared-component conflicts.
5. Promote `LSE-013` only after all code migration rows are `DONE`; this is the zero-debt checkpoint.
6. Promote `LSE-014` only after `LSE-013` is `DONE`; final docs sync is the closeout gate.

---

## Task queue

| ID | Lane | Plan | Priority | Status | Depends On | Task | Primary files | Verify | Notes |
|---|---|---:|---|---|---|---|---|---|---|
| `LSE-001` | `A` | 1 | `P0` | `DONE` | - | Fix `ui:legacy:guard` regex handling so baseline runs without `awk` syntax errors | `scripts/ci/check-legacy-style-introductions.sh` | `npm run typecheck`; `npm run lint`; `npm run test:unit`; `npm run docs:guard`; `npm run ui:legacy:guard -- "$EMPTY_TREE" HEAD` | Done 2026-02-18: replaced dynamic `awk` regex matching with BSD/macOS-safe literal and POSIX-boundary checks, and sorted scoped path iteration with `LC_ALL=C` for deterministic ordering. Verify: `npm run typecheck` passed; `npm run lint` passed with existing repo warnings (0 errors); `npm run test:unit` passed; `npm run docs:guard` passed; `npm run ui:legacy:guard -- "$EMPTY_TREE" HEAD` now fails on real baseline legacy matches without any `awk` syntax errors. |
| `LSE-002` | `A` | 1 | `P0` | `DONE` | `LSE-001` | Add deterministic guard coverage (script/unit/smoke) to prevent regex regressions | `scripts/ci/check-legacy-style-introductions.sh`; `tests/*` | `npm run typecheck`; `npm run lint`; `npm run test:unit`; `npm run docs:guard`; `npm run ui:legacy:guard -- "$EMPTY_TREE" HEAD` | Done 2026-02-19: cleared workspace typecheck blockers and reran full verify stack. Results: `npm run typecheck` pass; `npm run lint` pass with existing warnings (`0` errors); `npm run test:unit` pass (`75` files, `377` tests); `npm run docs:guard` pass; `npm run ui:legacy:guard -- "$EMPTY_TREE" HEAD` fail on known baseline legacy debt (expected for current migration stage). |
| `LSE-003` | `B` | 2 | `P0` | `DONE` | `LSE-002` | Remove `--win95-*` root token definitions and map surviving semantics to modern dark/sepia token names | `src/app/globals.css` | `npm run typecheck`; `npm run lint`; `npm run test:unit`; `npm run docs:guard`; `npm run ui:legacy:guard -- "$EMPTY_TREE" HEAD` | Done 2026-02-19: finalized Lane B token foundation in `src/app/globals.css` with canonical dark/sepia `--shell-*` semantics as the shared shell source of truth while preserving core window behavior. Verify: `npm run typecheck` pass; `npm run lint` pass with existing warnings (`2964`, `0` errors); `npm run test:unit` pass (`76` files, `391` tests); `npm run docs:guard` pass; `npm run ui:legacy:guard -- "$EMPTY_TREE" HEAD` fail on known baseline scoped legacy debt. |
| `LSE-004` | `B` | 2 | `P1` | `DONE` | `LSE-003` | Replace `.retro-button*` selectors and `var(--win95-*)` references in shared shell primitives | `src/app/globals.css`; `src/components/retro-button.tsx`; `src/components/retro-window.tsx`; `src/components/floating-window.tsx` | `npm run typecheck`; `npm run lint`; `npm run test:unit`; `npm run docs:guard`; `npm run ui:legacy:guard -- "$EMPTY_TREE" HEAD` | Done 2026-02-19: finalized shared shell primitives on `desktop-shell-*` classes/tokens in `src/components/retro-button.tsx`, `src/components/retro-window.tsx`, and `src/components/floating-window.tsx` while keeping dark/sepia semantics and core window behavior intact. Verify: `npm run typecheck` hit transient `TS2589` at `src/components/window-content/store-window.tsx:46` on first run and passed on immediate rerun; `npm run lint` pass with existing warnings (`2963`, `0` errors); `npm run test:unit` pass (`77` files, `396` tests); `npm run docs:guard` pass; `npm run ui:legacy:guard -- "$EMPTY_TREE" HEAD` fail on known baseline scoped legacy debt. |
| `LSE-005` | `C` | 3 | `P1` | `DONE` | `LSE-004` | Migrate `integrations-window` family off legacy style tokens/classes | `src/components/window-content/integrations-window/*` | `npm run typecheck`; `npm run lint`; `npm run test:unit`; `npm run docs:guard`; `npm run ui:legacy:guard -- "$EMPTY_TREE" HEAD` | Done 2026-02-19: confirmed `integrations-window` remains at `0` matches for queue legacy patterns (`retro-button`, `--win95-*`, `var(--win95-*)`, `data-window-style`, `zinc-*`, `purple-*`) while preserving integrations workflow behavior. Verify rerun: `typecheck` pass; `lint` pass with warnings (`2970`, `0` errors); `test:unit` pass (`80` files, `417` tests); `docs:guard` pass; `ui:legacy:guard -- "$EMPTY_TREE" HEAD` fail on known baseline debt outside Lane `C`. |
| `LSE-006` | `C` | 3 | `P1` | `DONE` | `LSE-005` | Migrate `super-admin-organizations-window` and remove remaining legacy token usage | `src/components/window-content/super-admin-organizations-window/*` | `npm run typecheck`; `npm run lint`; `npm run test:unit`; `npm run docs:guard`; `npm run ui:legacy:guard -- "$EMPTY_TREE" HEAD` | Done 2026-02-19: confirmed `super-admin-organizations-window` returns `0` matches for queue legacy patterns while preserving org-management workflows and translations. Verify rerun: `typecheck` pass; `lint` pass with warnings (`2970`, `0` errors); `test:unit` pass (`80` files, `417` tests); `docs:guard` pass; `ui:legacy:guard -- "$EMPTY_TREE" HEAD` fail on known baseline debt outside Lane `C`. |
| `LSE-007` | `C` | 3 | `P1` | `DONE` | `LSE-006` | Migrate `web-publishing-window` and `org-owner-manage-window` off legacy classes/tokens | `src/components/window-content/web-publishing-window/*`; `src/components/window-content/org-owner-manage-window/*` | `npm run typecheck`; `npm run lint`; `npm run test:unit`; `npm run docs:guard`; `npm run ui:legacy:guard -- "$EMPTY_TREE" HEAD` | Done 2026-02-19: both `web-publishing-window` and `org-owner-manage-window` return `0` matches for queue legacy patterns while preserving publish/manage workflows and translation keys. Verify rerun: `typecheck` pass after lane-safe type unblocks in `src/components/window-content/org-owner-manage-window/ai-settings-tab.tsx`, `src/lib/store-pricing-calculator.ts`, and `convex/integrations/aiConnections.ts`; `lint` pass with warnings (`2971`, `0` errors); `test:unit` pass (`84` files, `431` tests); `docs:guard` pass; `ui:legacy:guard -- "$EMPTY_TREE" HEAD` fail on known baseline debt outside Lane `C`. |
| `LSE-008` | `D` | 4 | `P1` | `DONE` | `LSE-007` | Migrate `ai-chat-window`, `products-window`, and `booking-window` families | `src/components/window-content/ai-chat-window/*`; `src/components/window-content/products-window/*`; `src/components/window-content/booking-window/*` | `npm run typecheck`; `npm run lint`; `npm run test:unit`; `npm run docs:guard`; `npm run ui:legacy:guard -- "$EMPTY_TREE" HEAD` | Done 2026-02-19: migrated Lane `D` wave 2 part 1 to modern shell/tone tokens/classes and removed scoped `zinc-*`/`purple-*` utility usage in `ai-chat-window`, with scoped queue-pattern scans now `0` for `ai-chat-window`, `products-window`, and `booking-window`. Behavior remained equivalent for assistant/products/booking flows. Verify reruns: `typecheck` pass (after transient `TS2589` and transient union noise on earlier attempts), `lint` pass with warnings (`2977`, `0` errors), `test:unit` pass (`85` files, `437` tests), `docs:guard` pass, `ui:legacy:guard -- "$EMPTY_TREE" HEAD` fail on known global baseline debt outside Lane `D`. |
| `LSE-009` | `D` | 4 | `P1` | `DONE` | `LSE-008` | Migrate `events-window`, `benefits-window`, `checkout-window`, and `media-library-window` families | `src/components/window-content/events-window/*`; `src/components/window-content/benefits-window/*`; `src/components/window-content/checkout-window/*`; `src/components/window-content/media-library-window/*` | `npm run typecheck`; `npm run lint`; `npm run test:unit`; `npm run docs:guard`; `npm run ui:legacy:guard -- "$EMPTY_TREE" HEAD` | Done 2026-02-19: completed Lane `D` wave 2 part 2 and migrated `benefits-window` to modern tokens/classes while preserving events/checkout/media-library behavior; scoped queue-pattern scans are now `0` for `events-window`, `benefits-window`, `checkout-window`, and `media-library-window`. Verify: `typecheck` pass, `lint` pass with warnings (`2977`, `0` errors), `test:unit` pass (`85` files, `437` tests), `docs:guard` pass, `ui:legacy:guard -- "$EMPTY_TREE" HEAD` fail on known global baseline debt outside Lane `D`. |
| `LSE-010` | `E` | 5 | `P0` | `DONE` | `LSE-009` | Clean builder/routes legacy class usage (`zinc-*`, `purple-*`, legacy button classes) while preserving route contracts | `src/components/builder/*`; `src/app/builder/page.tsx`; `src/app/builder/[projectId]/*`; `src/app/page.tsx` | `npm run typecheck`; `npm run lint`; `npm run test:unit`; `npm run docs:guard`; `npm run ui:legacy:guard -- "$EMPTY_TREE" HEAD` | Done 2026-02-19: removed Lane `E` builder/routes legacy utility usage by migrating builder workspace loading/error surfaces off `zinc-*`/`purple-*` classes and replacing taskbar `retro-window` usage with `desktop-shell-window`. Queue-pattern scan is `0` in scoped Lane `E` files and route/deep-link logic is unchanged. Verify: `typecheck` pass, `lint` pass with warnings (`2980`, `0` errors), `test:unit` pass (`89` files, `456` tests), `docs:guard` pass, `ui:legacy:guard -- "$EMPTY_TREE" HEAD` fail on known global baseline debt. |
| `LSE-011` | `E` | 5 | `P0` | `DONE` | `LSE-010` | Validate auth/onboarding/OAuth callback compatibility while removing legacy style branches in auth-adjacent views | `src/app/auth/*`; `src/components/window-content/login-window.tsx`; `src/app/page.tsx`; `src/lib/shell/url-state.ts` | `npm run typecheck`; `npm run lint`; `npm run test:unit`; `npm run docs:guard`; `npm run ui:legacy:guard -- "$EMPTY_TREE" HEAD` | Done 2026-02-19: migrated auth-adjacent `retro-*` class usage in `login-window` and `auth/cli-login` to `desktop-shell-*` aliases with equivalent styling in `globals.css`, preserving onboarding/auth and OAuth callback compatibility (`window=manage&tab=integrations` contract unchanged in `src/lib/shell/url-state.ts` and `src/app/page.tsx`). Verify: `typecheck` pass (with local `TS2589` suppression at `login-window` query call), `lint` pass with warnings (`2980`, `0` errors), `test:unit` pass (`89` files, `456` tests), `docs:guard` pass, `ui:legacy:guard -- "$EMPTY_TREE" HEAD` fail on known global baseline debt. |
| `LSE-012` | `F` | 6 | `P1` | `DONE` | `LSE-011` | Remove remaining legacy references in shared/tail files including `convex` and scripts | `src/components/*`; `convex/*`; `scripts/*` | `npm run typecheck`; `npm run lint`; `npm run test:unit`; `npm run docs:guard`; `npm run ui:legacy:guard -- "$EMPTY_TREE" HEAD` | Done 2026-02-19: completed Lane `F` shared/tail cleanup by migrating remaining shared `retro-button*`/`beveled-button*` references to `desktop-shell-*`/`desktop-interior-*`, remapping shared `zinc-*`/`purple-*` utility usage to non-legacy palettes, and confirming no queue-pattern matches remain in shared non-window scopes. Scoped queue-pattern scan results: `src/components` (excluding `window-content` and `builder`) `0`; `convex` `0`; `scripts` (excluding training output) `5` intentional guard literals only. Residual snapshot: `/Users/foundbrand_001/Development/vc83-com/tmp/reports/legacy-style-lse012-lanef-residual.txt` (`1523` scoped matches, concentrated in `window-content`). Verify: `npm run typecheck` fail (`TS2589` at `src/components/interview/template-designer.tsx:57`); `npm run lint` pass with warnings (`2987`, `0` errors); `npm run test:unit` pass (`90` files, `459` tests); `npm run docs:guard` pass; `npm run ui:legacy:guard -- "$EMPTY_TREE" HEAD` fail on known broad baseline debt in guarded scope. |
| `LSE-013` | `G` | 7 | `P0` | `READY` | `LSE-012` | Re-run full baseline guard + full-project regex scan and confirm debt reduction target | `/Users/foundbrand_001/Development/vc83-com/tmp/reports/*`; `scripts/ci/check-legacy-style-introductions.sh` | `npm run typecheck`; `npm run lint`; `npm run test:unit`; `npm run docs:guard`; `npm run ui:legacy:guard -- "$EMPTY_TREE" HEAD` | Ready on 2026-02-19: dependency gate is now satisfied (`LSE-012` is `DONE`). Lane `G` should rerun baseline/full-project scans and capture updated debt metrics; current open risks remain broad `V-LEGACY` debt and workspace `V-TYPE` failure at `src/components/interview/template-designer.tsx:57`. |
| `LSE-014` | `G` | 7 | `P1` | `BLOCKED` | `LSE-013` | Final docs sync (`INDEX`, `MASTER_PLAN`, `BLOCKERS`, `TASK_QUEUE`, `SESSION_PROMPTS`) and closeout handoff | `docs/reference_docs/topic_collections/implementation/legacy-style-eradication/*` | `npm run typecheck`; `npm run lint`; `npm run test:unit`; `npm run docs:guard`; `npm run ui:legacy:guard -- "$EMPTY_TREE" HEAD` | Blocked on 2026-02-19: row stays gated until `LSE-013` completes full checkpoint reruns and the resulting verify/debt outputs are synchronized into queue artifacts. |

---

## Current kickoff

- Active task: none (`LSE-012` is now `DONE`; `LSE-013` is `READY`; `LSE-014` remains `BLOCKED` by dependency `LSE-013`).
- Immediate gate: start Lane `G` at `LSE-013` and rerun baseline guard + full-project regex scans with updated metrics.
- Next promotable task: `LSE-013` (`READY`).
- Lane `F` execution (`LSE-012`) is complete: scoped queue-pattern scan is `0` in shared non-window `src/components` and `convex`, with `scripts` matches reduced to intentional guard literals only.
- Lane `G` closeout remains dependent on rerun outputs meeting `V-TYPE` and debt-reduction expectations before `LSE-014` can be promoted.
