# L4YERCAK3 File System Architecture — Progress Tracker

## Status Overview

| Phase | Status | Notes |
|-------|--------|-------|
| Phase 1 — Schema + Backend CRUD | DONE | All tables, indexes, CRUD, access control |
| Phase 2 — Finder Window | DONE | All components built, window registered |
| Phase 3 — Auto-Capture Wiring | DONE | Backend hooks + frontend context wired |
| Phase 4 — Cross-Org Sharing | DONE | Share dialog, license gate, Finder integration |
| Phase 5 — AI Knowledge Base | DONE | Chat integration + /notes as AI memory |
| Phase 6 — Polish + Migration | PARTIAL | Finder in start menu, Builder/Layers actions wired |

---

## Phase 1 — Schema + Backend CRUD (DONE)

- [x] `convex/schemas/projectFileSchemas.ts` — projectFiles + projectShares tables
- [x] `convex/schema.ts` — Both tables registered
- [x] `convex/projectFileSystem.ts` — Full CRUD with cross-org access checks
  - Queries: listFiles, getFile, getFileTree, getBreadcrumbs
  - Mutations: createFolder, createVirtualFile, createMediaRef, updateFileContent, renameFile, moveFile, deleteFile
- [x] `convex/projectFileSystemInternal.ts` — Capture hooks + AI query
  - initializeProjectFolders, captureBuilderApp, captureLayerWorkflow
  - removeBuilderCapture, removeLayerCapture
  - getProjectKnowledgeBase, getFilesByKind
- [x] `convex/projectOntology.ts` — Default folder creation on project init

## Phase 2 — Finder Window (DONE)

- [x] Create `src/components/window-content/finder-window/` directory
  - [x] `index.tsx` — Main Finder component with three-mode navigation
  - [x] `finder-sidebar.tsx` — Left sidebar with mode switching + project file tree
  - [x] `finder-content.tsx` — Grid/list content area with sort/search/filter
  - [x] `finder-toolbar.tsx` — Breadcrumbs, search, view toggle, new menu
  - [x] `finder-preview.tsx` — Right panel detail view with metadata + actions
  - [x] `finder-modals.tsx` — Create folder + create note dialogs
- [x] Register "finder" window in `src/hooks/window-registry.tsx`
- [x] Three navigation modes in left sidebar:
  - [x] Org Files — placeholder with link to media library
  - [x] Project Files — project-scoped tree with project dropdown
  - [x] Shared with Me — cross-org shared projects list
- [x] File rendering by kind:
  - [x] Folder — shows children (navigable)
  - [x] Virtual — content preview in detail panel
  - [x] media_ref — icon + metadata
  - [x] builder_ref — "Open in Builder" action
  - [x] layer_ref — "Open in Layers" action
- [ ] Drag-and-drop from org files into project folders (creates media_ref) — deferred

## Phase 3 — Auto-Capture Wiring (DONE)

- [x] `convex/projectFileSystemInternal.ts` — captureBuilderApp, captureLayerWorkflow
- [x] `convex/projectOntology.ts` — initializeProjectFolders called on project create
- [x] `convex/builderAppOntology.ts` — captureBuilderApp calls integrated + `projectId` arg added
- [x] `convex/layers/layerWorkflowOntology.ts` — captureLayerWorkflow calls integrated
- [x] `src/contexts/builder-context.tsx` — `activeProjectId` state added
- [x] Builder app creation/update passes `activeProjectId` → triggers auto-capture
- [x] AI chat `sendChatMessage` passes `activeProjectId` for knowledge base injection

## Phase 4 — Cross-Org Sharing (DONE)

- [x] `convex/projectSharing.ts` — Full sharing CRUD
  - createShare, acceptShare, revokeShare, updateSharePermission
  - listMyShares, listSharedWithMe, listPendingInvites
  - Sub-org auto-accept logic
  - License gate: Agency/Enterprise tiers required for `createShare`
- [x] `convex/projectFileSystem.ts` — Cross-org access checks in all queries/mutations
- [x] `src/components/window-content/finder-window/share-dialog.tsx` — Full share dialog
  - [x] Target org ID input
  - [x] Permission selector (viewer/editor/admin)
  - [x] Scope toggle (project vs. folder subtree)
  - [x] Active shares list with revoke + permission update
  - [x] Pending invites with accept/decline
- [x] "Share" button in Finder toolbar (wired to share dialog)
- [x] Shared project navigation: clicking shared project switches to project mode

## Phase 5 — AI Knowledge Base (DONE)

- [x] `convex/projectFileSystemInternal.ts` — getProjectKnowledgeBase (80K char cap, path filtering)
- [x] `convex/ai/chat.ts` — `projectId` arg added to `sendMessage` action
  - Injects project knowledge base into system prompt when projectId provided
  - Uses `getProjectKnowledgeBase` internal query
  - Graceful fallback on errors
- [x] `/notes` folder serves as persistent AI memory (included in knowledge base)
- [x] Builder context passes `activeProjectId` to chat for knowledge context

## Phase 6 — Polish + Migration (PARTIAL)

### Done
- [x] Finder added to start menu (`src/app/page.tsx`)
- [x] "Open in Builder" / "Open in Layers" actions wired in Finder preview panel
- [x] Finder app registered in seedApps (replaced media library as standalone app)

### Remaining
- [ ] Lazy migration: create default folders on first access for existing projects
- [ ] Link existing builder_apps to projects via objectLinks
- [ ] Compact file tree component in project drawer

---

## Upgrade Phases (Next)

See `FINDER_UPGRADES.md` for full specification.

| Phase | Status | Scope |
|-------|--------|-------|
| Phase A — Core Interactions | DONE | Context menus, multi-select, clipboard, keyboard, drag-drop, inline rename |
| Phase B — Trash, Favorites, Recent, Tags | NOT STARTED | Soft delete, favorites sidebar, recent files, tagging |
| Phase C — Integrated Editors & Tabs | DONE | Tab system, markdown/code/note editors, PDF/image viewers, editor router |
| Phase D — Desktop Integration | NOT STARTED | Desktop files, layout persistence, drag Finder ↔ Desktop |
| Phase E — Advanced | NOT STARTED | Versioning, ontology auto-folders, content search, column view |
| Phase F — Polish | NOT STARTED | Upload progress, drag feedback, undo/redo, accessibility |

---

## Phase A — Core Interactions (DONE)

### New files created (6)

| File | Purpose |
|------|---------|
| `finder-types.ts` | Shared TypeScript types replacing `any` — `ProjectFile`, `FileClipboard`, `ContextMenuState`, etc. |
| `use-finder-selection.ts` | Multi-select hook — click, Cmd+click toggle, Shift+click range, select all, clear |
| `finder-context-menu.tsx` | Right-click menus — file menu (Open, Rename, Copy, Cut, Duplicate, Delete, Get Info, Copy Path) and background menu (New Folder, New Note, Paste, Sort by, View as) |
| `use-finder-clipboard.ts` | Cut/Copy/Paste hook — tracks clipboard state, moves files on cut-paste, duplicates on copy-paste, visual cut opacity |
| `use-finder-keyboard.ts` | Keyboard shortcuts scoped to Finder container — Del, Enter, Cmd+C/X/V/A, Escape, Cmd+Shift+N, Cmd+F |
| `use-finder-drag-drop.ts` | HTML5 drag-and-drop — drag files to folders (move), multi-drag, drop target highlighting |

### Backend additions

| Mutation | File |
|----------|------|
| `deleteFiles` (batch) | `convex/projectFileSystem.ts` |
| `duplicateFile` (recursive for folders) | `convex/projectFileSystem.ts` |

### Modified files (4)

| File | Changes |
|------|---------|
| `index.tsx` | Orchestrates all Phase A hooks, context menu state, delete confirmation, inline rename state, keyboard focus container |
| `finder-content.tsx` | Multi-select highlighting, inline rename input, context menu triggers, drag-and-drop attributes, cut file opacity |
| `finder-modals.tsx` | Added `DeleteConfirmationModal` with folder recursion warning |
| `finder-toolbar.tsx` | Added `searchInputRef` prop for Cmd+F focus |

TypeScript passes with zero new errors.

---

## Phase C — Integrated Editors & Tabs (DONE)

### New files created (8)

| File | Purpose |
|------|---------|
| `use-finder-tabs.ts` | Tab state hook — open/close/activate tabs, dirty tracking, editor type routing logic |
| `finder-tabs.tsx` | Tab bar UI — Browse pseudo-tab, file tabs with dirty dot, close button, middle-click close, horizontal scroll |
| `editors/markdown-editor.tsx` | Split-pane markdown editor — edit/preview/split modes, formatting toolbar, debounced autosave, Cmd+S |
| `editors/code-editor.tsx` | Code editor — monospace textarea, line number gutter, find/replace bar, word wrap, language label |
| `editors/note-editor.tsx` | Note editor — contentEditable rich text, B/I/U/H1/H2/List toolbar, autosave as plain text |
| `editors/image-viewer.tsx` | Image viewer — zoom (buttons + scroll wheel), pan when zoomed, checkerboard transparency, metadata bar, download |
| `editors/pdf-viewer.tsx` | PDF viewer — iframe-based display, open in new tab, download, metadata bar |
| `editors/editor-router.tsx` | Editor router — maps file kind + mime type to correct editor component |

### Backend additions

| Query | File |
|-------|------|
| `getFileContent` (editor-optimized content fetch) | `convex/projectFileSystem.ts` |

### Modified files (1)

| File | Changes |
|------|---------|
| `index.tsx` | Added tab hook, tab bar rendering, editor view (replaces content area when tab active), updated double-click to open tabs |

### Editor type routing

| fileKind | Condition | Editor |
|----------|-----------|--------|
| `virtual` | `.md`, `text/markdown` | Markdown Editor (split-pane) |
| `virtual` | `.txt`, `text/plain` | Note Editor (rich text) |
| `virtual` | `.json`, `.js`, `.ts`, `.html`, `.css`, `.yaml` | Code Editor (monospace) |
| `virtual` | other | Code Editor (fallback) |
| `media_ref` | `image/*` | Image Viewer (zoom/pan) |
| `media_ref` | `application/pdf` | PDF Viewer (iframe) |
| `media_ref` | other | Info Panel (download link) |
| `builder_ref` | — | Redirects to Builder window |
| `layer_ref` | — | Redirects to Layers window |
| `folder` | — | Navigates (no tab opened) |

---

## Verification Checklist

- [ ] Schema: `npx convex dev` — both tables deploy without errors
- [ ] CRUD: Create project -> verify 4 default folders -> create files -> list/read/move/delete
- [ ] Auto-capture: Save in Builder with project context -> verify /builder/{name} in file tree
- [ ] AI context: getProjectKnowledgeBase returns assembled notes + builder + workflow summaries
- [ ] Finder UI: Open Finder -> switch Org/Project/Shared modes -> browse, preview, drag-drop
- [ ] Sharing: Share with sub-org -> target sees in "Shared with Me" -> test permissions -> revoke
- [ ] Subtree sharing: Share /assets -> target sees only that subtree

---

## Files Modified (Phases 3-6)

| File | Change |
|------|--------|
| `convex/builderAppOntology.ts` | Added `projectId` arg to `createBuilderApp`, included in customProperties |
| `convex/projectSharing.ts` | Added license gate (Agency/Enterprise) to `createShare` |
| `convex/ai/chat.ts` | Added `projectId` arg, injects project knowledge base into system prompt |
| `src/contexts/builder-context.tsx` | Added `activeProjectId` state, wired into create/update/chat calls |
| `src/components/window-content/finder-window/share-dialog.tsx` | **NEW** — Share dialog with tabs, invites, permissions |
| `src/components/window-content/finder-window/index.tsx` | Wired share dialog, Open in Builder/Layers callbacks |
| `src/components/window-content/finder-window/finder-toolbar.tsx` | Added Share button |
| `src/components/window-content/finder-window/finder-content.tsx` | Wired shared project navigation |
| `src/app/page.tsx` | Added Finder window to start menu |
