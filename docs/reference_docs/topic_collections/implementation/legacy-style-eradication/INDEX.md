# Legacy Style Eradication Index

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/legacy-style-eradication`  
**Last updated:** 2026-02-24

---

## Objective

Eradicate legacy UI style debt and converge the full runtime UI to the *l4yercak3* design token contract while preserving functional compatibility.

Supersession scope:

- This workstream is the active execution authority for UI token/style convergence.
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/ui-perfection-workstream/TASK_QUEUE.md` remains archival for implementation; `UIP-009`/`UIP-010` can now be reactivated explicitly because `LSE-022` is `DONE`.

Non-negotiable constraints:

1. Keep two runtime appearance modes only, with current keys mapped to contract semantics (`dark` -> `midnight`, `sepia` -> `daylight`) until naming migration lands.
2. Do not reintroduce legacy theme/window-style customization.
3. Preserve auth, onboarding, and OAuth callback compatibility.
4. Use `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/legacy-style-eradication/l4yercak3-design-token-contract.md` as the canonical style source.

---

## Baseline snapshot

- Lane `G` baseline guard rerun on 2026-02-19 (empty tree -> `HEAD`) remains failing with scoped violations (`BASELINE_GUARD_EXIT=1`).
- Lane `G` full-project regex scan rerun: `2117` matches across `163` files (`/Users/foundbrand_001/Development/vc83-com/tmp/reports/legacy-style-full-project-current.txt`).
- Delta versus prior Lane `F` checkpoint (`2955` / `244`): `-838` matches and `-81` files.
- Legacy button class occurrences in `src` within full-project scan moved from `146` to `102` (`-44`) versus the prior checkpoint artifact.
- Lane `G` verify reruns now pass all non-legacy gates: `LSE-013` and `LSE-014` both recorded `typecheck` pass, `lint` pass with warnings (`3009`, `0` errors), and `test:unit` pass in unrestricted runs (`92` files, `473` tests each).
- `ui:legacy:guard` still fails by design on known broad baseline debt for both Lane `G` rows; `docs:guard` passes.
- Deferred scope check (no edits applied): `src/app/project/[slug]/templates/gerrit/GerritTemplate.tsx`=`5` matches and `src/components/template-renderer.tsx`=`0` matches in the refreshed scan.
- Lane `F` residual snapshot (`/Users/foundbrand_001/Development/vc83-com/tmp/reports/legacy-style-lse012-lanef-residual.txt`): `1523` scoped matches, with shared non-window `src/components`=`0`, `convex`=`0`, and scripts limited to intentional guard literals.
- Contract CI checkpoint: `LSE-015` is `DONE`; `ui-design-guard` enforces contract-derived drift checks on newly introduced lines, the workflow watches contract doc changes, and runtime execution is now Bash 3 compatible on macOS.
- Lane `H` token-alias checkpoint (`LSE-016`): `DONE` on 2026-02-24 after landing `globals.css` contract aliases and clearing newly introduced `ui:design:guard` drift in changed `src/components` lines; verify rerun passed (`typecheck`, `lint` warnings only, `test:unit`, `ui:design:guard`, `docs:guard`).
- Lane `I` shell + primitive convergence checkpoint (`LSE-017`, `LSE-018`) is `DONE` (2026-02-24): lane-scope shell chrome and shared primitive convergence landed, out-of-scope guard drift was cleared (including promotion-rerun cleanup in `src/components/processing-modal.tsx`), and the full verify stack passed (`typecheck`; `lint` warnings `3128`/`0` errors; `test:unit` `109` files/`570` tests; `ui:design:guard`; `docs:guard`).
- Lane `J` migration checkpoint (`LSE-019`, `LSE-020`) is `DONE` (2026-02-24): high-density window families plus remaining route/builder/start-menu surfaces were converged to contract-compatible primitives and disallowed utility drift was removed in touched files; verify reruns passed `lint` (`3145` warnings, `0` errors), `test:unit` (`109` files, `570` tests), `ui:design:guard`, and `docs:guard`, while `typecheck` remains blocked by pre-existing out-of-scope workspace errors (FormData typing in `convex/oauth/endpoints.ts` and existing non-Lane-J type debt).
- Lane `K` visual/contrast closeout checkpoint (`LSE-021`, `LSE-022`) is `DONE` (2026-02-24): deterministic pass/fail labeling is now emitted for visual and contrast checks (`screen/mode/token` labels + CI summary lines), visual baselines were refreshed for `visual-shell` and `design-token-showcase-coverage`, and full closeout verification was rerun with deltas published to `/Users/foundbrand_001/Development/vc83-com/tmp/reports/legacy-style-lse022-closeout-summary.md`. Verify highlights: `test:e2e:visual` pass (`18` tests), `ui:design:guard` pass, `docs:guard` pass, `lint` pass with warnings (`3146`, `0` errors), `test:unit` pass (`109` files, `570` tests), with expected failures retained for pre-existing `typecheck` debt (`TS2589` in `src/app/api/webhooks/activecampaign/route.ts`) and baseline `ui:legacy:guard` debt (`1425` scoped hits).
- Token-contract full baseline (`ui:design:guard`, `EMPTY_TREE -> HEAD`): `6420` hits.
- Active-scope token baseline (temporary exclusions applied): `5811` hits after deferring `/Users/foundbrand_001/Development/vc83-com/src/app/project/[slug]/templates/gerrit/GerritTemplate.tsx` and `/Users/foundbrand_001/Development/vc83-com/src/components/template-renderer.tsx` to `LSE-023`.
- Cross-workstream gate: `LSE-022` is complete, so UIP closeout/reseed rows can be reactivated on explicit request.

---

## Report artifacts

- `/Users/foundbrand_001/Development/vc83-com/tmp/reports/legacy-style-guard-baseline.txt`
- `/Users/foundbrand_001/Development/vc83-com/tmp/reports/legacy-style-full-project.txt`
- `/Users/foundbrand_001/Development/vc83-com/tmp/reports/legacy-style-summary.txt`
- `/Users/foundbrand_001/Development/vc83-com/tmp/reports/legacy-style-guard-current.txt`
- `/Users/foundbrand_001/Development/vc83-com/tmp/reports/legacy-style-full-project-current.txt`
- `/Users/foundbrand_001/Development/vc83-com/tmp/reports/legacy-style-summary-current.txt`
- `/Users/foundbrand_001/Development/vc83-com/tmp/reports/legacy-style-lse013-verify-status.env`
- `/Users/foundbrand_001/Development/vc83-com/tmp/reports/legacy-style-lse014-verify-status.env`
- `/Users/foundbrand_001/Development/vc83-com/tmp/reports/legacy-style-guard-after-edits.txt`
- `/Users/foundbrand_001/Development/vc83-com/tmp/reports/legacy-style-full-project-after-edits.txt`
- `/Users/foundbrand_001/Development/vc83-com/tmp/reports/legacy-style-lse021-test-e2e-visual-update.txt`
- `/Users/foundbrand_001/Development/vc83-com/tmp/reports/legacy-style-lse021-test-e2e-visual.txt`
- `/Users/foundbrand_001/Development/vc83-com/tmp/reports/legacy-style-lse021-visual-summary.txt`
- `/Users/foundbrand_001/Development/vc83-com/tmp/reports/legacy-style-lse022-typecheck.txt`
- `/Users/foundbrand_001/Development/vc83-com/tmp/reports/legacy-style-lse022-lint.txt`
- `/Users/foundbrand_001/Development/vc83-com/tmp/reports/legacy-style-lse022-test-unit.txt`
- `/Users/foundbrand_001/Development/vc83-com/tmp/reports/legacy-style-lse022-ui-design-guard.txt`
- `/Users/foundbrand_001/Development/vc83-com/tmp/reports/legacy-style-lse022-ui-legacy-guard.txt`
- `/Users/foundbrand_001/Development/vc83-com/tmp/reports/legacy-style-lse022-docs-guard.txt`
- `/Users/foundbrand_001/Development/vc83-com/tmp/reports/legacy-style-lse022-closeout-summary.md`
- `/Users/foundbrand_001/Development/vc83-com/tmp/test-results/ui-visual/results.json`

---

## Queue-first artifacts

- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/legacy-style-eradication/TASK_QUEUE.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/legacy-style-eradication/SESSION_PROMPTS.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/legacy-style-eradication/MASTER_PLAN.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/legacy-style-eradication/BLOCKERS.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/legacy-style-eradication/l4yercak3-design-token-contract.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/legacy-style-eradication/l4yercak3-ui-token-convergence-implementation.md`

---

## Current kickoff

- Active lane/task: none (`LSE-021` + `LSE-022` are complete).
- Lane `G` closeout is complete and synchronized across queue artifacts.
- Next globally promotable `READY` row: none in active scope (`LSE-023` remains deferred).
- Contract-convergence backlog status: Lanes `J` and `K` are complete (`LSE-019..LSE-022` `DONE`), including deterministic visual+contrast lock checks.
- Deferred scope: `GerritTemplate.tsx` + `template-renderer.tsx` remain out of active lanes and are tracked by `LSE-023`.
- Superseded workstream note: UIP (`UIP-009`, `UIP-010`) can now be explicitly reactivated because this stream reached `LSE-022` closeout.
