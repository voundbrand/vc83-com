# Legacy Style Eradication Task Queue

**Last updated:** 2026-02-18  
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
| `LSE-002` | `A` | 1 | `P0` | `BLOCKED` | `LSE-001` | Add deterministic guard coverage (script/unit/smoke) to prevent regex regressions | `scripts/ci/check-legacy-style-introductions.sh`; `tests/*` | `npm run typecheck`; `npm run lint`; `npm run test:unit`; `npm run docs:guard`; `npm run ui:legacy:guard -- "$EMPTY_TREE" HEAD` | Blocked 2026-02-18 (`BLK-LSE-002`): implementation landed (unit+smoke coverage added), but required verify stack failed at `npm run typecheck` on unrelated typed ID errors in `src/components/window-content/integrations-window/microsoft-settings.tsx`. Remaining commands executed: `lint`, `test:unit`, and `docs:guard` passed; baseline `ui:legacy:guard` failed on known legacy debt without `awk` parser errors. |
| `LSE-003` | `B` | 2 | `P0` | `BLOCKED` | `LSE-002` | Remove `--win95-*` root token definitions and map surviving semantics to modern dark/sepia token names | `src/app/globals.css` | `npm run typecheck`; `npm run lint`; `npm run test:unit`; `npm run docs:guard`; `npm run ui:legacy:guard -- "$EMPTY_TREE" HEAD` | Blocked on 2026-02-18 (`BLK-LSE-003`): implementation landed in working tree (root `--win95-*` moved to `--shell-*` dark/sepia tokens plus non-root compatibility bridge), but queue gate requires `LSE-002` to be `DONE`. Latest verify stack outcomes: `typecheck` pass, `lint` pass with existing warnings, `test:unit` pass, `docs:guard` pass, `ui:legacy:guard -- "$EMPTY_TREE" HEAD` fail on known baseline debt. |
| `LSE-004` | `B` | 2 | `P1` | `BLOCKED` | `LSE-003` | Replace `.retro-button*` selectors and `var(--win95-*)` references in shared shell primitives | `src/app/globals.css`; `src/components/retro-button.tsx`; `src/components/retro-window.tsx`; `src/components/floating-window.tsx` | `npm run typecheck`; `npm run lint`; `npm run test:unit`; `npm run docs:guard`; `npm run ui:legacy:guard -- "$EMPTY_TREE" HEAD` | Blocked on 2026-02-18 (`BLK-LSE-004`): shared primitives now use `desktop-shell-*` classes/tokens with compatibility aliases to preserve behavior, but row cannot move to `DONE` until dependency `LSE-003` is unblocked and `LSE-002` is `DONE`. Latest verify stack outcomes match `LSE-003` (`typecheck`/`lint`/`test:unit`/`docs:guard` pass; legacy guard baseline fail). |
| `LSE-005` | `C` | 3 | `P1` | `BLOCKED` | `LSE-004` | Migrate `integrations-window` family off legacy style tokens/classes | `src/components/window-content/integrations-window/*` | `npm run typecheck`; `npm run lint`; `npm run test:unit`; `npm run docs:guard`; `npm run ui:legacy:guard -- "$EMPTY_TREE" HEAD` | Blocked on 2026-02-18 (`BLK-LSE-005`): dependency `LSE-004` is not `DONE`. Scoped migration landed: `integrations-window` now returns `0` matches for queue legacy patterns (`retro-button`, `--win95-*`, `var(--win95-*)`, `data-window-style`, `zinc-*`, `purple-*`). Verify run: `typecheck` pass, `lint` pass with warnings, `test:unit` pass, `docs:guard` pass, `ui:legacy:guard -- "$EMPTY_TREE" HEAD` fail on existing global debt outside Lane `C`. |
| `LSE-006` | `C` | 3 | `P1` | `BLOCKED` | `LSE-005` | Migrate `super-admin-organizations-window` and remove remaining legacy token usage | `src/components/window-content/super-admin-organizations-window/*` | `npm run typecheck`; `npm run lint`; `npm run test:unit`; `npm run docs:guard`; `npm run ui:legacy:guard -- "$EMPTY_TREE" HEAD` | Blocked on 2026-02-18 (`BLK-LSE-006`): depends on blocked `LSE-005`. Scoped migration landed: `super-admin-organizations-window` now returns `0` matches for queue legacy patterns. Verify run: `typecheck` pass, `lint` pass with warnings, `test:unit` pass, `docs:guard` pass, `ui:legacy:guard -- "$EMPTY_TREE" HEAD` fail on existing global debt outside Lane `C`. |
| `LSE-007` | `C` | 3 | `P1` | `BLOCKED` | `LSE-006` | Migrate `web-publishing-window` and `org-owner-manage-window` off legacy classes/tokens | `src/components/window-content/web-publishing-window/*`; `src/components/window-content/org-owner-manage-window/*` | `npm run typecheck`; `npm run lint`; `npm run test:unit`; `npm run docs:guard`; `npm run ui:legacy:guard -- "$EMPTY_TREE" HEAD` | Blocked on 2026-02-18 (`BLK-LSE-007`): depends on blocked `LSE-006`. Scoped migration landed: both `web-publishing-window` and `org-owner-manage-window` now return `0` matches for queue legacy patterns while preserving publish/manage workflows and translation keys. Verify run: `typecheck` pass, `lint` pass with warnings, `test:unit` pass, `docs:guard` pass, `ui:legacy:guard -- "$EMPTY_TREE" HEAD` fail on existing global debt outside Lane `C`. |
| `LSE-008` | `D` | 4 | `P1` | `BLOCKED` | `LSE-007` | Migrate `ai-chat-window`, `products-window`, and `booking-window` families | `src/components/window-content/ai-chat-window/*`; `src/components/window-content/products-window/*`; `src/components/window-content/booking-window/*` | `npm run typecheck`; `npm run lint`; `npm run test:unit`; `npm run docs:guard`; `npm run ui:legacy:guard -- "$EMPTY_TREE" HEAD` | Blocked on 2026-02-18 because `LSE-007` is not `DONE`; verify stack run returned: typecheck pass, lint pass (warnings), unit pass, docs pass, legacy guard fail (exit 1). See `BLK-LSE-008`. |
| `LSE-009` | `D` | 4 | `P1` | `BLOCKED` | `LSE-008` | Migrate `events-window`, `benefits-window`, `checkout-window`, and `media-library-window` families | `src/components/window-content/events-window/*`; `src/components/window-content/benefits-window/*`; `src/components/window-content/checkout-window/*`; `src/components/window-content/media-library-window/*` | `npm run typecheck`; `npm run lint`; `npm run test:unit`; `npm run docs:guard`; `npm run ui:legacy:guard -- "$EMPTY_TREE" HEAD` | Blocked on 2026-02-18 because `LSE-008` is blocked by unresolved `LSE-007`; row verify was not executed due dependency gate. |
| `LSE-010` | `E` | 5 | `P0` | `BLOCKED` | `LSE-009` | Clean builder/routes legacy class usage (`zinc-*`, `purple-*`, legacy button classes) while preserving route contracts | `src/components/builder/*`; `src/app/builder/page.tsx`; `src/app/(marketing)/*`; `src/app/page.tsx` | `npm run typecheck`; `npm run lint`; `npm run test:unit`; `npm run docs:guard`; `npm run ui:legacy:guard -- "$EMPTY_TREE" HEAD` | Blocked on 2026-02-18 (`BLK-LSE-010`): dependency `LSE-009` is not `DONE` and scoped Lane `D` files still contain extensive legacy matches. Lane `E` style cleanup edits were prepared in working tree (builder `zinc-*`/`purple-*` removal and `src/app/page.tsx` button-class cleanup), but row cannot be promoted to `DONE` until dependency and verify gates clear. Verify run: `typecheck` failed on existing TS2589 in `src/components/window-content/integrations-window/microsoft-settings.tsx`; `lint`/`test:unit`/`docs:guard` passed; `ui:legacy:guard -- "$EMPTY_TREE" HEAD` failed on known baseline debt. |
| `LSE-011` | `E` | 5 | `P0` | `BLOCKED` | `LSE-010` | Validate auth/onboarding/OAuth callback compatibility while removing legacy style branches in auth-adjacent views | `src/app/auth/*`; `src/components/window-content/login-window.tsx`; `src/app/page.tsx`; `src/lib/shell/url-state.ts` | `npm run typecheck`; `npm run lint`; `npm run test:unit`; `npm run docs:guard`; `npm run ui:legacy:guard -- "$EMPTY_TREE" HEAD` | Blocked on 2026-02-18 (`BLK-LSE-010`): depends on blocked `LSE-010`. Auth-adjacent style cleanup edits were prepared in working tree (`src/app/auth/cli-login/page.tsx`, `src/components/window-content/login-window.tsx`) while preserving OAuth callback/onboarding logic, but completion is gated on `LSE-010` verification. |
| `LSE-012` | `F` | 6 | `P1` | `BLOCKED` | `LSE-011` | Remove remaining legacy references in shared/tail files including `convex` and scripts | `src/components/*`; `convex/*`; `scripts/*` | `npm run typecheck`; `npm run lint`; `npm run test:unit`; `npm run docs:guard`; `npm run ui:legacy:guard -- "$EMPTY_TREE" HEAD` | Blocked 2026-02-18 (`BLK-LSE-012`): prerequisite `LSE-011` is not `DONE`. Partial Lane F sweep landed: `var(--win95-*)` removed from shared non-window/non-builder components and cleared in `convex`; scripts now only contain intentional guard literals. Verify results: `typecheck` pass, `lint` pass (warnings), `test:unit` pass, `docs:guard` pass, `ui:legacy:guard` fail on broad existing debt in guarded scope. Residual snapshot: `/Users/foundbrand_001/Development/vc83-com/tmp/reports/legacy-style-lse012-lanef-residual.txt`. |
| `LSE-013` | `G` | 7 | `P0` | `BLOCKED` | `LSE-012` | Re-run full baseline guard + full-project regex scan and confirm debt reduction target | `/Users/foundbrand_001/Development/vc83-com/tmp/reports/*`; `scripts/ci/check-legacy-style-introductions.sh` | `npm run typecheck`; `npm run lint`; `npm run test:unit`; `npm run docs:guard`; `npm run ui:legacy:guard -- "$EMPTY_TREE" HEAD` | Blocked on 2026-02-18 (`BLK-LSE-013`): dependency gate failed (`LSE-012` is `BLOCKED`, not `DONE`). Fresh scan pass completed anyway: pre-edit full-project scan `3913` matches across `274` files with `333` legacy button-class hits in `src`; post-edit scan `2955` matches across `244` files with `300` legacy button-class hits (delta `-958` matches, `-30` files, `-33` button-class occurrences). Verify run outcomes: `npm run typecheck` failed (`TS2589` at `src/components/window-content/media-library-window/components/left-sidebar.tsx:32`), `npm run lint` passed with warnings (`0` errors), `npm run test:unit` passed (`71` files, `346` tests), `npm run docs:guard` passed, `npm run ui:legacy:guard -- "$EMPTY_TREE" HEAD` failed on broad legacy debt. |
| `LSE-014` | `G` | 7 | `P1` | `BLOCKED` | `LSE-013` | Final docs sync (`INDEX`, `MASTER_PLAN`, `BLOCKERS`, `TASK_QUEUE`, `SESSION_PROMPTS`) and closeout handoff | `docs/reference_docs/topic_collections/implementation/legacy-style-eradication/*` | `npm run typecheck`; `npm run lint`; `npm run test:unit`; `npm run docs:guard`; `npm run ui:legacy:guard -- "$EMPTY_TREE" HEAD` | Blocked on 2026-02-18: queue artifacts were synchronized after the fresh scan/migration pass, but row cannot be promoted because `LSE-013` remains blocked and verify stack is not fully green (`typecheck` fail at `media-library-window/components/left-sidebar.tsx:32`, `lint` pass with warnings, `test:unit` pass, `docs:guard` pass, `ui:legacy:guard -- "$EMPTY_TREE" HEAD` fail). |

---

## Current kickoff

- Active task: none (`LSE-002`/`LSE-003`/`LSE-004`/`LSE-005`/`LSE-006`/`LSE-007`/`LSE-013`/`LSE-014` are blocked; see `BLK-LSE-002`, `BLK-LSE-003`, `BLK-LSE-004`, `BLK-LSE-005`, `BLK-LSE-006`, `BLK-LSE-007`, `BLK-LSE-013`).
- Immediate gate: close `LSE-002` and clear enough baseline debt for `V-LEGACY` so blocked upstream rows can be promoted.
- Next promotable task after `LSE-002` unblock: close `LSE-003` then `LSE-004` from current working-tree implementation.
- Lane `D` execution (`LSE-008`, `LSE-009`) is currently blocked by unresolved `LSE-007` (`BLK-LSE-008`).
- Lane `F` execution (`LSE-012`) is currently blocked by unresolved `LSE-011` (`BLK-LSE-012`).
- Lane `E` execution (`LSE-010`, `LSE-011`) is currently blocked by unresolved `LSE-009` plus downstream verify gating (`BLK-LSE-010`).
- Lane `G` execution (`LSE-013`, `LSE-014`) is blocked by unresolved dependency `LSE-012` and failing `V-LEGACY` baseline results (`BLK-LSE-013`).
