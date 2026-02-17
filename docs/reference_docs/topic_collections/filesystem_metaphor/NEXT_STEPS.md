# What's Next — Finder Upgrade Roadmap

## Current State

Phases 1–5 are done. The Finder has a working 3-pane UI, full backend CRUD, cross-org sharing, AI knowledge base integration, and auto-capture wiring. Phase 6 (polish) is partially complete.

The Finder currently functions as a **file browser**. The upgrade phases below turn it into a **file system** — with the interactions, editors, and desktop integration users expect from a native OS experience.

## Priority Order

### 1. Phase A — Core Interactions (Start Here)

This is the highest-impact upgrade. Without these, the Finder feels like a read-only viewer.

**What it adds:** Right-click context menus, multi-select, cut/copy/paste, keyboard shortcuts, inline rename, drag-and-drop, delete confirmation.

**Start with:**
1. `finder-types.ts` — proper TypeScript types (foundation)
2. `use-finder-selection.ts` — multi-select hook
3. `finder-context-menu.tsx` — right-click menus
4. `use-finder-clipboard.ts` + backend `duplicateFile` mutation
5. `use-finder-keyboard.ts` — keyboard shortcuts
6. Inline rename + delete confirmation in existing components

Each step is independently testable.

### 2. Phase C — Integrated Editors & Tabs

This is the second-highest impact. Opening files in-app (instead of just previewing metadata) is what makes the Finder a workspace.

**What it adds:** Tab bar, markdown editor (split pane), code editor, note editor, PDF viewer, image viewer, editor routing.

**Dependencies:** Phase A multi-select and keyboard hooks should be in place first so editors can share the keyboard infrastructure.

### 3. Phase B — Trash, Favorites, Recent, Tags

Quality-of-life features that make the file system feel complete.

**What it adds:** Soft delete with restore, favorites sidebar, recent files list, file tags.

**Schema changes required:** This is the first phase that modifies the `projectFiles` schema (adds soft-delete fields + tags) and creates 2 new tables (`userFileBookmarks`, `userRecentFiles`).

### 4. Phase D — Desktop Integration

Connect the Finder to the OS desktop surface.

**What it adds:** Files on desktop, persistent layout, drag between Finder and Desktop, Save to Desktop.

**Schema changes:** New `desktopItems` table.

### 5. Phase E — Advanced Features

Power-user and platform features.

**What it adds:** File versioning, ontology auto-folder creation, full-text content search, column view.

### 6. Phase F — Polish

Fit and finish.

**What it adds:** Upload progress bars, drag visual feedback, undo/redo, full keyboard accessibility.

## Remaining Phase 6 Items (from original roadmap)

These should be addressed alongside or before the upgrade phases:
- [ ] Lazy migration: create default folders on first access for existing projects
- [ ] Link existing builder_apps to projects via objectLinks
- [ ] Compact file tree component in project drawer

## Full Specification

See [FINDER_UPGRADES.md](./FINDER_UPGRADES.md) for complete technical spec including schema changes, new files, modified files, and implementation details for each phase.
