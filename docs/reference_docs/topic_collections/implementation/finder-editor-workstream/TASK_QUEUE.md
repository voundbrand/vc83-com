# Finder + Text Editor Task Queue

**Last updated:** 2026-02-17  
**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/finder-editor-workstream`  
**Source request:** Finder VSCode-like new file flow + standalone text editor app planning request (2026-02-17)

---

## Queue rules

1. Allowed statuses are only: `READY`, `IN_PROGRESS`, `PENDING`, `BLOCKED`, `DONE`.
2. Only one task may be `IN_PROGRESS` globally unless concurrency rules allow one per lane.
3. Promote from `PENDING` to `READY` only when all dependencies are `DONE`.
4. Selection order is deterministic: highest priority (`P0` -> `P1` -> `P2`) then lowest ID.
5. Every task must include explicit verification commands before moving to `DONE`.
6. Keep lane ownership strict; avoid cross-lane file edits while another lane is active on the same files.
7. If blocked, mark `BLOCKED` with a concrete blocker note and continue with next `READY` task.
8. Sync `INDEX.md`, `MASTER_PLAN.md`, and `TASK_QUEUE.md` after each completed task.

---

## Verification profiles

| Profile | Command |
|---|---|
| `V-TYPE` | `npm run typecheck` |
| `V-LINT` | `npm run lint` |
| `V-FINDER-LINT` | `npx eslint src/components/window-content/finder-window src/components/window-content/text-editor-window src/app/page.tsx src/components/window-content/all-apps-window.tsx` |
| `V-FINDER-UNIT` | `npx vitest run tests/unit/finder` |
| `V-DOCS` | `npm run docs:guard` |

---

## Execution lanes

| Lane | Purpose | Primary ownership | Merge-overlap policy |
|---|---|---|---|
| `A` | File type capability contract + editor routing base | `src/components/window-content/finder-window/use-finder-tabs.ts`; new registry file | No toolbar/modal changes until lane `A` foundational registry is done |
| `B` | Finder "New File" UX (VSCode-like creation flow) | `src/components/window-content/finder-window/finder-modals.tsx`; `finder-toolbar.tsx`; `finder-context-menu.tsx`; `index.tsx`; `use-finder-keyboard.ts` | Do not modify top-nav/all-app registrations in this lane |
| `C` | Standalone Text Editor app + desktop/menu entry points | `src/components/window-content/text-editor-window/*`; `src/app/page.tsx`; `src/components/window-content/all-apps-window.tsx`; `src/components/icons/*` | Do not modify Convex file-creation backend in this lane |
| `D` | Backend normalization and safeguards for broad file creation | `convex/projectFileSystem.ts`; `convex/migrations/*` | No Finder UI/UX restyling in this lane |
| `E` | Tests, hardening, and docs closeout | `tests/unit/finder/*`; this workstream docs | Lane `E` starts after all `P0` tasks are complete or blocked |

---

## Concurrency rules

1. Run lane `A` first until `FTE-002` is `DONE`.
2. After `FTE-002`, run lanes `B` and `C` in parallel (max one `IN_PROGRESS` task per lane).
3. Lane `D` starts only after `FTE-003` is `DONE` (contract stabilized).
4. Lane `E` starts only after all `P0` rows are `DONE` or explicitly `BLOCKED`.
5. If a task requires editing a file currently owned by another active lane, pause and re-queue.

---

## Task queue

| ID | Lane | Plan | Priority | Status | Depends On | Task | Primary files | Verify | Notes |
|---|---|---:|---|---|---|---|---|---|---|
| `FTE-001` | `A` | 1 | `P0` | `DONE` | - | Create shared file-type capability registry (`extension -> mime -> language -> editor`) with phase-1 common text types and deterministic fallback | `src/components/window-content/finder-window/file-type-registry.ts` (new); `src/components/window-content/finder-window/finder-types.ts` | `npm run typecheck`; `npx eslint src/components/window-content/finder-window/file-type-registry.ts src/components/window-content/finder-window/finder-types.ts` | Done 2026-02-17: added centralized registry (`file-type-registry.ts`) for phase-1 types plus deterministic fallback and shared capability types in `finder-types.ts`; verify commands passed. |
| `FTE-002` | `A` | 1 | `P0` | `DONE` | `FTE-001` | Integrate registry into editor selection and tab opening logic; remove hardcoded extension checks from `getEditorType` | `src/components/window-content/finder-window/use-finder-tabs.ts`; `src/components/window-content/finder-window/editors/editor-router.tsx` | `npm run typecheck`; `npx eslint src/components/window-content/finder-window/use-finder-tabs.ts src/components/window-content/finder-window/editors/editor-router.tsx` | Done 2026-02-17: `getEditorType` now resolves virtual files via registry, tab reopen refreshes `editorType`, and router uses shared editor typing while preserving existing PDF/image/info behavior; verify commands passed. |
| `FTE-003` | `B` | 2 | `P0` | `DONE` | `FTE-001` | Replace split creation modals with a VSCode-like `New File` flow (single name input, extension-aware, optional starter content) | `src/components/window-content/finder-window/finder-modals.tsx`; `src/components/window-content/finder-window/finder-toolbar.tsx`; `src/components/window-content/finder-window/finder-context-menu.tsx`; `src/components/window-content/finder-window/index.tsx` | `npm run typecheck`; `npx eslint src/components/window-content/finder-window/finder-modals.tsx src/components/window-content/finder-window/finder-toolbar.tsx src/components/window-content/finder-window/finder-context-menu.tsx src/components/window-content/finder-window/index.tsx` | Done 2026-02-17: Finder now uses a unified `New File` modal with single filename input, extension-aware metadata, optional starter content, and post-create auto-open into tabs while preserving project/org path scoping and `New Folder`; verify commands passed (eslint warnings only, no errors). |
| `FTE-004` | `B` | 2 | `P1` | `DONE` | `FTE-003` | Add lightweight creation navigation parity: keyboard shortcut (`New File`), context-menu parity, and immediate-open behavior into active editor tab | `src/components/window-content/finder-window/use-finder-keyboard.ts`; `src/components/window-content/finder-window/index.tsx`; `src/components/window-content/finder-window/finder-toolbar.tsx` | `npm run typecheck`; `npx eslint src/components/window-content/finder-window/use-finder-keyboard.ts src/components/window-content/finder-window/index.tsx src/components/window-content/finder-window/finder-toolbar.tsx` | Done 2026-02-17: added `Cmd/Ctrl+N` new-file shortcut, aligned context menu/toolbar `New File` actions, and ensured create->focus editor tab parity via pending open flow; verify commands passed (eslint warnings only, no errors). |
| `FTE-005` | `C` | 3 | `P0` | `DONE` | `FTE-002`, `FTE-003` | Build standalone `Text Editor` window app reusing Finder editor primitives for tabbed editing of supported text files | `src/components/window-content/text-editor-window/index.tsx` (new); `src/components/window-content/text-editor-window/*` (new); `src/components/window-content/finder-window/editors/*` | `npm run typecheck`; `npx eslint src/components/window-content/text-editor-window src/components/window-content/finder-window/editors` | Done 2026-02-17: added standalone Text Editor window using shared Finder tabs/editor router with recents/favorites workspace and event-driven open-file handling; verify commands executed (eslint warnings only, no errors). |
| `FTE-006` | `C` | 3 | `P1` | `DONE` | `FTE-005` | Register Text Editor entry points in desktop/navigation surfaces (top menu + all apps + icon mapping) | `src/app/page.tsx`; `src/components/window-content/all-apps-window.tsx`; `src/components/icons/shell-icons.tsx` | `npm run typecheck`; `npx eslint src/app/page.tsx src/components/window-content/all-apps-window.tsx src/components/icons/shell-icons.tsx` | Done 2026-02-17: Text Editor is registered as first-class app in Product menu + All Apps + shell icon mapping and window registry (`text-editor` window id). Verify commands executed (eslint warnings only, no errors). |
| `FTE-007` | `C` | 3 | `P1` | `DONE` | `FTE-005` | Add Finder integration hooks: `Open in Text Editor` action + `New File` bridge into editor app route/window | `src/components/window-content/finder-window/finder-context-menu.tsx`; `src/components/window-content/finder-window/index.tsx`; `src/app/page.tsx` | `npm run typecheck`; `npx eslint src/components/window-content/finder-window/finder-context-menu.tsx src/components/window-content/finder-window/index.tsx src/app/page.tsx` | Done 2026-02-17: Finder file menu now supports `Open in Text Editor` for text-capable virtual files, and background menu adds `New File in Text Editor` bridge while preserving existing image/pdf/builder/layer open behavior. Verify commands executed (eslint warnings only, no errors). |
| `FTE-008` | `D` | 4 | `P1` | `DONE` | `FTE-003` | Normalize backend virtual-file creation for flexible extensions (safe mime/language derivation + guardrails) | `convex/projectFileSystem.ts`; `convex/projectFileSystemHelpers.ts` (new/optional) | `npm run typecheck`; `npx eslint convex/projectFileSystem.ts convex/projectFileSystemHelpers.ts` | Done 2026-02-17: added backend `projectFileSystemHelpers` metadata registry + guardrails, and `createVirtualFile` now normalizes names and derives safe `mimeType/language` with extension mapping plus legacy markdown default for extensionless files. Verify commands executed: eslint passed (warnings only); typecheck failed on pre-existing `src/app/builder/[projectId]/page.tsx:59` (`TS2589`). |
| `FTE-009` | `D` | 4 | `P2` | `DONE` | `FTE-008` | Add migration/backfill for virtual files missing metadata (`mimeType`, `language`) to improve editor routing consistency | `convex/migrations/backfillVirtualFileMetadata.ts` (new); `convex/projectFileSystem.ts` | `npm run typecheck`; `npx eslint convex/migrations/backfillVirtualFileMetadata.ts convex/projectFileSystem.ts` | Done 2026-02-17: added idempotent cursor-based migration `backfillVirtualFileMetadata` that patches only missing virtual-file `mimeType/language` using shared backend derivation logic. Verify commands executed: eslint passed (warnings only); typecheck failed on pre-existing `src/components/builder/builder-preview-panel.tsx:220` (`TS2589`). |
| `FTE-010` | `E` | 5 | `P1` | `DONE` | `FTE-004`, `FTE-006`, `FTE-008` | Add Finder/editor unit tests for registry mapping, new-file modal behavior, and launch entry points | `tests/unit/finder/file-type-registry.test.ts` (new); `tests/unit/finder/new-file-flow.test.ts` (new); `tests/unit/finder/text-editor-launch.test.ts` (new) | `npx vitest run tests/unit/finder`; `npm run typecheck` | Done 2026-02-17: added registry/new-file/launch coverage via new finder unit tests and extracted `new-file-flow` helpers for deterministic metadata+starter-content assertions. Verify commands executed: `npx vitest run tests/unit/finder` passed; initial `npm run typecheck` run hit non-lane errors in `src/components/window-content/org-owner-manage-window/security-tab.tsx`, then later lane verify reruns passed after in-flight workspace updates. |
| `FTE-011` | `E` | 5 | `P1` | `DONE` | `FTE-010` | Hardening pass: accessibility, dirty-state confirmation, unsaved-change prompts, and focus flow | `src/components/window-content/finder-window/*`; `src/components/window-content/text-editor-window/*` | `npm run typecheck`; `npm run lint`; `npx vitest run tests/unit/finder` | Done 2026-02-17: added dirty-tab close confirmation and beforeunload guard hooks for Finder/Text Editor, keyboard resolver with `Cmd/Ctrl+W` close-tab + `Cmd/Ctrl+F` focus coverage, tab a11y semantics, and editor focus-on-tab-change behavior. Explicit tests added in `tests/unit/finder/hardening-safety.test.ts` for keyboard/focus + unsaved safety. Verify commands passed (`typecheck`, `lint` with warnings only, finder tests). |
| `FTE-012` | `E` | 5 | `P1` | `DONE` | `FTE-011` | Final docs sync and release readiness check for Finder + Text Editor initiative | `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/finder-editor-workstream/*` | `npm run docs:guard`; `npm run typecheck`; `npm run lint` | Done 2026-02-17: synced queue/index/master closeout state, added explicit phase-1 support + phase-2 expansion decision log in `MASTER_PLAN.md`, and completed release readiness checks. Verify commands passed (`docs:guard`, `typecheck`, `lint` with warnings only). |

---

## Current kickoff

- Active task: Lane `E` complete (`FTE-010` through `FTE-012` `DONE`).
- Lane `E` promotable tasks remaining: none.
