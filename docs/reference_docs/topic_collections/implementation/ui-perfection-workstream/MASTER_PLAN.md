# UI Perfection Workstream Master Plan

**Date:** 2026-02-25  
**Scope:** Repeatable lane-based execution for UI quality convergence, with deterministic guard enforcement and touched-file tracking.

---

## Mission

Run a systematic UI loop that repeatedly improves the product until the major visual regressions are removed, with explicit focus on:

1. sepia/daylight correctness,
2. token-contract compliance,
3. deterministic showcase coverage,
4. CI-visible visual stability.

---

## Reactivation decision (2026-02-24)

1. Legacy-style closeout completed (`LSE-022` `DONE`) and the UIP lane-`F` gate is cleared.
2. UIP resumed active operation for recurring UI-principles CI enforcement.
3. `UIP-009` completed closeout verification and residual publication.
4. `UIP-010` reseeded cycle-7 rows (`UIP-011`, `UIP-012`) so the loop remains deterministic.
5. `UIP-012` completed cycle-7 closeout, published residuals, and reseeded cycle-8 rows (`UIP-013`, `UIP-014`).

---

## Pivot pause decision (2026-02-25)

1. UI-perfection cycle-8 rows (`UIP-013`, `UIP-014`) are non-core under the one-primary-operator cutover.
2. Both rows are now `BLOCKED` by cutover row `LOC-003`.
3. Resume requires explicit cutover override after `LOC-009` is `DONE`.

---

## Guard boundary (what enforcement does and does not do)

1. `ui:design:guard` blocks newly introduced design drift patterns (raw color literals, disallowed utilities, raw px/radius/shadow, `transition-all`, brand-case drift).
2. `ui:showcase:guard` enforces structural showcase/route/snapshot contracts.
3. Guards do not force one exact aesthetic composition. They enforce boundaries so design remains intentional and consistent.
4. Visual quality still requires iterative component-level and surface-level sweeps.

---

## Execution strategy

## 1) Measure first

1. Establish baseline drift matrix for dark + sepia.
2. Capture failures by exact surface and token class.
3. Seed touch-ledger from already edited files.

## 2) Fix token roots before broad sweeps

1. Correct token semantics in global and shell layers.
2. Remove disallowed raw styling where regressions are most visible.
3. Keep behavior unchanged while converging style paths.

## 3) Use showcase as contract surface

1. Ensure showcase includes all high-value shared primitive states.
2. Keep test IDs and snapshot naming deterministic.
3. Use coverage gaps to drive queue promotion order.

## 4) Sweep high-traffic product surfaces

1. Prioritize windows/routes that operators and customers hit most.
2. Use touched-file ordering to reduce spread and merge churn.
3. Validate each sweep with row-level verification.

## 5) Lock visual + CI behavior

1. Stabilize visual snapshots for shell + showcase + critical surfaces.
2. Keep CI outputs explicit and deterministic.
3. Record evidence and residual drift counts during closeout.

## 6) Reseed for next cycle

1. Queue never returns to ad-hoc planning.
2. `UIP-012` is the latest completed reseed row and `UIP-014` is the next deterministic reseed closeout row.
3. Touched-file ledger remains the source of truth for sequencing.

---

## Phase mapping to queue lanes

| Phase | Objective | Queue lane | Queue tasks |
|---|---|---|---|
| Phase 1 | Baseline + inventory | `A` | `UIP-001`..`UIP-002` |
| Phase 2 | Token parity + shell convergence | `B` | `UIP-003`..`UIP-004` |
| Phase 3 | Showcase + primitive coverage | `C` | `UIP-005` |
| Phase 4 | High-traffic UI sweeps | `D` | `UIP-006`..`UIP-007` |
| Phase 5 | Visual lock + CI hardening | `E` | `UIP-008` |
| Phase 6 | Closeout + reseed | `F` | `UIP-009`..`UIP-010` |
| Phase 7 | Recurring CI operation + residual reseed | `E` + `F` | `UIP-011`..`UIP-012` |
| Phase 8 | Recurring CI operation + residual reseed | `E` + `F` | `UIP-013`..`UIP-014` |

---

## Progress checkpoint (2026-02-24)

1. `UIP-006`..`UIP-008` remain complete with token-safe high-traffic surfaces and deterministic visual/CI lock.
2. `UIP-009` is complete: full verify rerun captured with deterministic evidence paths and residual report publication.
3. Remaining blocker pattern is still `test:unit` websocket reconnect hangs (`exit=143`) during lane verification runs.
4. `UIP-010` is complete: recurring CI scope includes `src/templates`, showcase contract checks enforce deterministic label anchors, and cycle-7 rows were seeded.
5. `UIP-011` is complete: design/showcase guards are green, visual suite is green (`18 passed`), and deterministic summary labels are captured.
6. During `UIP-011`, a transient first-attempt timeout was recorded with explicit reference (`screen=design-token-showcase mode=sepia token=text-secondary-on-bg`) and then cleared on rerun.
7. `UIP-012` is complete: cycle-7 residual report was published and cycle-8 rows were reseeded using touch-ledger priorities.
8. Next promotable row: none while `LOC-003` pause lock remains active.

---

## Regression-risk checklist (apply before each row)

1. Sepia/daylight token mismatch reintroduced at shell or primitive layer.
2. High-traffic surfaces lose readability or interaction affordances while style tokens converge.
3. Snapshot contract churn causes nondeterministic CI failures or stale goldens.

---

## Acceptance criteria

1. Queue rows are executed in deterministic dependency order.
2. Every completed row records concrete verify evidence and touched files.
3. `ui:design:guard` and `ui:showcase:guard` stay green for landed changes.
4. Visual snapshots for guarded scenes are stable and intentional across dark + sepia.
5. Workstream docs (`INDEX`, `MASTER_PLAN`, `UI_PERFECTION_TASK_QUEUE`, `TASK_QUEUE`, `SESSION_PROMPTS`) remain synchronized.

---

## UIP-002 deterministic showcase coverage map (2026-02-21)

### Snapshot contract coverage (current)

| Coverage ID | Surface | Source anchor | Default render gate | Dark snapshot | Sepia snapshot | Status |
|---|---|---|---|---|---|---|
| `SCN-001` | Showcase root scene | `data-testid="design-token-showcase-scene"` | Always rendered | Yes | Yes | Covered |
| `SCN-002` | Taskbar shell + top nav controls | `DesignTokenShowcaseV2` root render | Always rendered | Yes | Yes | Covered |
| `SCN-003` | Window shell + tab strip chrome | `Window` + tab-row container | Always rendered | Yes | Yes | Covered |
| `TAB-001` | Colors panel | `{tab === 0 && <ColorsPanel .../>}` | `tab` default is `0` | Yes | Yes | Covered |
| `TAB-002` | Typography panel | `{tab === 1 && <TypographyPanel .../>}` | Requires tab switch | No | No | Gap |
| `TAB-003` | Spacing/shape panel | `{tab === 2 && <SpacingShapePanel .../>}` | Requires tab switch | No | No | Gap |
| `TAB-004` | Components panel | `{tab === 3 && <ComponentsPanel .../>}` | Requires tab switch | No | No | Gap |
| `TAB-005` | Contrast panel | `{tab === 4 && <ContrastPanel .../>}` | Requires tab switch | No | No | Gap |
| `ST-001` | Product menu dropdown list | `{menuOpen && ...}` | `menuOpen` default `false` | No | No | Gap |
| `ST-002` | Modal surface | `{modalOpen && ...}` | `modalOpen` default `false` | No | No | Gap |
| `ST-003` | Select menu list | `{selectOpen && ...}` | `selectOpen` default `false` | No | No | Gap |

### Shared primitive contract coverage (direct usage check)

Inventory source: `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/shared/interior-primitives.tsx` exports.  
Coverage method: symbol-name presence check in `/Users/foundbrand_001/Development/vc83-com/src/tokens/showcase/design-token-showcase-v2.tsx`.

| Primitive export | Direct references in showcase file | Status |
|---|---:|---|
| `InteriorRoot` | 0 | Gap |
| `InteriorHeader` | 0 | Gap |
| `InteriorTitle` | 0 | Gap |
| `InteriorSubtitle` | 0 | Gap |
| `InteriorPanel` | 0 | Gap |
| `InteriorSectionHeader` | 0 | Gap |
| `InteriorHelperText` | 0 | Gap |
| `InteriorTabRow` | 0 | Gap |
| `InteriorTabButton` | 0 | Gap |
| `InteriorButton` | 0 | Gap |
| `InteriorInput` | 0 | Gap |
| `InteriorTextarea` | 0 | Gap |
| `InteriorSelect` | 0 | Gap |
| `InteriorTileButton` | 0 | Gap |

### Missing coverage set for queue sequencing

1. `GAP-SURF-001`: hidden tab panels (`TAB-002`..`TAB-005`) are not in visual snapshots.
2. `GAP-SURF-002`: transient interactive states (`menuOpen`, `modalOpen`, `selectOpen`) are not in visual snapshots.
3. `GAP-PRIM-001`: shared interior primitives have no direct showcase integration coverage.
4. `GAP-PRIM-002`: `InteriorTextarea` and `InteriorTileButton` have no proxy examples in the current showcase scene.

These gaps are the direct input for `UIP-005` (showcase scene expansion) and lane `D` sweep prioritization.
