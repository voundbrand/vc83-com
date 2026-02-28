# Legacy Style Eradication Blockers

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/legacy-style-eradication`  
**Last updated:** 2026-02-24

---

## Open blockers

| ID | Severity | Status | Owner lane | Blocker | Evidence | Next action |
|---|---|---|---|---|---|---|
| _None_ | - | - | - | - | - | - |

---

## Cleared blockers

| ID | Cleared on | Resolution |
|---|---|---|
| `BLK-LSE-017` | 2026-02-24 | Cleared after fixing out-of-scope `ui:design:guard` drift in `src/components/window-content/agents-window.tsx` and the residual `border-2` drift line in `src/components/window-content/org-owner-manage-window/ai-settings-tab.tsx`. Follow-up promotion rerun on 2026-02-24 also cleared an out-of-scope modal drift line in `src/components/processing-modal.tsx` (`bg-black/60` -> `var(--modal-overlay-bg)`), then reran the full verify stack used by `LSE-017`/`LSE-018`: `typecheck` pass; `lint` pass with warnings (`3128`, `0` errors); `test:unit` pass (`109` files, `570` tests); `ui:design:guard` pass; `docs:guard` pass. |
| `BLK-LSE-016` | 2026-02-24 | Cleared after lane-safe cleanup of newly introduced `ui:design:guard` drift lines in changed `src/components` files (`builder-chat-panel.tsx`, `agents-window.tsx`, `agent-trust-cockpit.tsx`, `agent-create-form.tsx`) and rerunning the full `LSE-016` verify stack: `typecheck` pass; `lint` pass with warnings (`3114`, `0` errors); `test:unit` pass (`108` files, `558` tests); `ui:design:guard` pass; `docs:guard` pass. |
| `BLK-LSE-013` | 2026-02-19 | Cleared after rerunning `npm run test:unit` unrestricted and completing full Lane `G` verify stacks: `LSE-013` baseline/scan rerun remained at `2117` matches across `163` files with expected `V-LEGACY` failure, while non-legacy verifies passed (`typecheck`, `lint` warnings only, `test:unit` pass `92` files/`473` tests, `docs:guard` pass). `LSE-014` then completed docs synchronization and matching verify rerun, and both rows are now `DONE`. |
| `BLK-LSE-012` | 2026-02-19 | Cleared after Lane `F` completion: `LSE-012` is now `DONE` with shared/tail queue-pattern scan at `0` for non-window `src/components` and `convex` (scripts hits reduced to intentional guard literals). Lane `G` dependency gate is now satisfied and `LSE-013` is promoted to `READY`. |
| `BLK-LSE-001` | 2026-02-18 | `LSE-001` replaced dynamic `awk` regex matching with BSD/macOS-safe matching logic; baseline guard now runs without parser errors and reports true legacy violations. |
| `BLK-LSE-002` | 2026-02-19 | Cleared after restoring workspace `typecheck` and rerunning the full `LSE-002` verify stack: `typecheck` pass, `lint` pass with warnings, `test:unit` pass, `docs:guard` pass, `ui:legacy:guard -- "$EMPTY_TREE" HEAD` fail on known baseline debt. |
| `BLK-LSE-003` | 2026-02-19 | Cleared after rerunning the full row verify stack and promoting `LSE-003` to `DONE`: `typecheck` pass, `lint` pass with warnings (`2964`, `0` errors), `test:unit` pass (`76` files, `391` tests), `docs:guard` pass, `ui:legacy:guard -- "$EMPTY_TREE" HEAD` fail on known baseline scoped debt. |
| `BLK-LSE-004` | 2026-02-19 | Cleared after rerunning the full row verify stack and promoting `LSE-004` to `DONE`: `typecheck` transient `TS2589` at `src/components/window-content/store-window.tsx:46` passed on immediate rerun; `lint` pass with warnings (`2963`, `0` errors); `test:unit` pass (`77` files, `396` tests); `docs:guard` pass; `ui:legacy:guard -- "$EMPTY_TREE" HEAD` fail on known baseline scoped debt. |
| `BLK-LSE-005` | 2026-02-19 | Cleared after rerunning the full `LSE-005` verify stack and promoting to `DONE`: scoped `integrations-window` regex scan returned `0` queue-pattern matches; `typecheck` pass; `lint` pass with warnings (`2970`, `0` errors); `test:unit` pass (`80` files, `417` tests); `docs:guard` pass; `ui:legacy:guard -- "$EMPTY_TREE" HEAD` fail on known global debt outside Lane `C`. |
| `BLK-LSE-006` | 2026-02-19 | Cleared after rerunning the full `LSE-006` verify stack and promoting to `DONE`: scoped `super-admin-organizations-window` regex scan returned `0` queue-pattern matches; `typecheck` pass; `lint` pass with warnings (`2970`, `0` errors); `test:unit` pass (`80` files, `417` tests); `docs:guard` pass; `ui:legacy:guard -- "$EMPTY_TREE" HEAD` fail on known global debt outside Lane `C`. |
| `BLK-LSE-007` | 2026-02-19 | Cleared after rerunning the full `LSE-007` verify stack and promoting to `DONE`: scoped `web-publishing-window` + `org-owner-manage-window` regex scan returned `0` queue-pattern matches while preserving publish/manage workflows and translations. Verify: `typecheck` pass after lane-safe type unblocks (`src/components/window-content/org-owner-manage-window/ai-settings-tab.tsx`, `src/lib/store-pricing-calculator.ts`, `convex/integrations/aiConnections.ts`), `lint` pass with warnings (`2971`, `0` errors), `test:unit` pass (`84` files, `431` tests), `docs:guard` pass, `ui:legacy:guard -- "$EMPTY_TREE" HEAD` fail on known global debt outside Lane `C`. |
| `BLK-LSE-008` | 2026-02-19 | Cleared by Lane `D` completion: `LSE-008` is now `DONE` with scoped queue-pattern scans at `0` for `ai-chat-window`, `products-window`, and `booking-window`; verify reruns reached `typecheck`/`lint`/`test:unit`/`docs:guard` pass and `ui:legacy:guard` fail on known global debt outside Lane `D`. |
| `BLK-LSE-010` | 2026-02-19 | Cleared by dependency resolution and Lane `D` closeout: `LSE-009` is now `DONE`, so `LSE-010` was promoted to `READY` for Lane `E` execution. |
