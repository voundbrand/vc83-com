# Legacy Style Eradication Index

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/legacy-style-eradication`  
**Last updated:** 2026-02-18

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
- Priority-window migration status (products/events/checkout/media-library/integrations): `0` matches for `retro-button|beveled-button|var(--win95-|--win95-`.
- Current gate result remains **triggered** (`2955` matches, `244` files; thresholds are `>=200` matches OR `>=40` files).
- `LSE-012` is not `DONE` (currently `BLOCKED`), so Lane `G` closeout remains blocked by dependency and failing `V-LEGACY`.

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

- Active lane/task: none (`LSE-002`, `LSE-003`, `LSE-004`, `LSE-005`, `LSE-006`, `LSE-007`, `LSE-008`, `LSE-009`, `LSE-010`, `LSE-011`, `LSE-012`, `LSE-013`, and `LSE-014` are `BLOCKED`).
- Lane `G` checkpoint (2026-02-18): scans and verify commands were re-executed for `LSE-013`/`LSE-014`; dependency `LSE-012` is still not `DONE`, `V-TYPE` fails on `src/components/window-content/media-library-window/components/left-sidebar.tsx:32`, `V-LINT` passes with warnings, `V-UNIT` passes (`71` files, `346` tests), `V-DOCS` passes, and `V-LEGACY` fails on broad scoped debt.
- Immediate objective: clear upstream dependency blockers (`BLK-LSE-002`, `BLK-LSE-003`, `BLK-LSE-004`) so implemented Lane `C` rows can be promoted from `BLOCKED`.
- Next milestone: close `LSE-005..LSE-007`, then proceed to Lane `D` (`LSE-008`, `LSE-009`) and Lane `E` gating.
