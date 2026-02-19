# Legacy Style Eradication Index

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/legacy-style-eradication`  
**Last updated:** 2026-02-19

---

## Objective

Eradicate legacy style debt (`retro-button`, `--win95-*`, `data-window-style`, legacy `zinc-*` and `purple-*` utility usage) across the full project while preserving functional compatibility.

Non-negotiable constraints:

1. Keep dark/sepia as the only appearance modes.
2. Do not reintroduce legacy theme/window-style customization.
3. Preserve auth, onboarding, and OAuth callback compatibility.

---

## Baseline snapshot

- Baseline guard (empty tree -> `HEAD`) re-ran on 2026-02-18 and still fails with real scoped violations (`BASELINE_GUARD_EXIT=1`).
- Fresh full-project regex scan (pre-edit) on `src`, `convex`, and `scripts`: `3913` matches across `274` files.
- Fresh full-project regex scan (post-edit) on `src`, `convex`, and `scripts`: `2955` matches across `244` files.
- Pass delta (pre-edit -> post-edit): `-958` matches and `-30` files.
- Legacy button class occurrences in `src` moved from `333` to `300` (`-33`) after replacing remaining `beveled-button*` usage in `integrations-window`.
- Priority-window migration status (integrations/super-admin/web-publishing/org-owner/ai-chat/products/booking/events/benefits/checkout/media-library): `0` matches for queue legacy patterns in migrated families.
- Current gate result remains **triggered** (`2955` matches, `244` files; thresholds are `>=200` matches OR `>=40` files).
- Lane `F` residual snapshot refresh on 2026-02-19 (`/Users/foundbrand_001/Development/vc83-com/tmp/reports/legacy-style-lse012-lanef-residual.txt`): `1523` scoped matches across `src/components` + `convex` + `scripts` (excluding `scripts/training/output`), with `0` matches in shared non-window `src/components`, `0` in `convex`, and `5` intentional guard literals in `scripts`.
- `LSE-012` is now `DONE`; `LSE-013` is `READY` and Lane `G` closeout remains gated on refreshed baseline scan evidence plus unresolved `V-TYPE`/`V-LEGACY` outcomes.

---

## Report artifacts

- `/Users/foundbrand_001/Development/vc83-com/tmp/reports/legacy-style-guard-baseline.txt`
- `/Users/foundbrand_001/Development/vc83-com/tmp/reports/legacy-style-full-project.txt`
- `/Users/foundbrand_001/Development/vc83-com/tmp/reports/legacy-style-summary.txt`
- `/Users/foundbrand_001/Development/vc83-com/tmp/reports/legacy-style-guard-current.txt`
- `/Users/foundbrand_001/Development/vc83-com/tmp/reports/legacy-style-full-project-current.txt`
- `/Users/foundbrand_001/Development/vc83-com/tmp/reports/legacy-style-guard-after-edits.txt`
- `/Users/foundbrand_001/Development/vc83-com/tmp/reports/legacy-style-full-project-after-edits.txt`

---

## Queue-first artifacts

- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/legacy-style-eradication/TASK_QUEUE.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/legacy-style-eradication/SESSION_PROMPTS.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/legacy-style-eradication/MASTER_PLAN.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/legacy-style-eradication/BLOCKERS.md`

---

## Current kickoff

- Active lane/task: none (`LSE-012` is now `DONE`; `LSE-013` is `READY`; `LSE-014` remains `BLOCKED` by dependency on `LSE-013`).
- Lane `E` closeout reruns on 2026-02-19: scoped queue-pattern scan for Lane `E` files (`src/components/builder/*`, `src/app/builder/*`, `src/app/page.tsx`, `src/app/auth/*`, `src/components/window-content/login-window.tsx`, `src/lib/shell/url-state.ts`) is `0` for `retro-*`, `zinc-*`, `purple-*`, `--win95-*`, `var(--win95-*)`, and `data-window-style`.
- Lane `E` verify stack reruns: `V-TYPE` pass, `V-LINT` pass with warnings (`2980`, `0` errors), `V-UNIT` pass (`89` files, `456` tests), `V-DOCS` pass, and `V-LEGACY` fail on known global debt outside Lane `E`.
- Lane `F` closeout reruns on 2026-02-19 (`LSE-012`): shared/tail queue-pattern scan is `0` for non-window `src/components` and `convex`; scripts hits are reduced to intentional guard literals. Verify: `V-TYPE` fail (`TS2589` at `src/components/interview/template-designer.tsx:57`), `V-LINT` pass with warnings (`2987`, `0` errors), `V-UNIT` pass (`90` files, `459` tests), `V-DOCS` pass, and `V-LEGACY` fail on broad guarded baseline debt.
- Immediate objective: execute Lane `G` at `LSE-013` to rerun baseline/full-project debt checkpoints with refreshed metrics.
- Next milestone: complete `LSE-013`, then promote `LSE-014` for final docs/closeout synchronization.
