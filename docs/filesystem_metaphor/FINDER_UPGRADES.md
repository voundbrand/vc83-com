# Finder Upgrades — Full Specification

Everything needed to take the Finder from "file browser" to "OS-native file system experience."

Phases A–C are core functionality. D–F are enhancements.

---

## Phase A: Core File System Interactions

The interaction primitives that make the Finder feel like a real file manager.

### A1. Shared Types

**New file: `src/components/window-content/finder-window/finder-types.ts`** (~60 lines)

Extract proper TypeScript types from the current `any` usage:

```typescript
interface ProjectFile {
  _id: Id<"projectFiles">;
  organizationId: Id<"organizations">;
  projectId: Id<"objects">;
  name: string;
  path: string;
  parentPath: string;
  fileKind: "virtual" | "media_ref" | "builder_ref" | "layer_ref" | "folder";
  content?: string;
  contentHash?: string;
  mediaId?: Id<"organizationMedia">;
  builderAppId?: Id<"objects">;
  layerWorkflowId?: Id<"objects">;
  mimeType?: string;
  sizeBytes?: number;
  language?: string;
  source: "user" | "builder_auto" | "layers_auto" | "ai_generated" | "migration";
  createdBy?: Id<"users">;
  createdAt: number;
  updatedAt: number;
  // Phase B additions
  isDeleted?: boolean;
  deletedAt?: number;
  originalPath?: string;
  tags?: string[];
}

type ViewMode = "grid" | "list" | "columns";
type SortField = "name" | "updatedAt" | "sizeBytes" | "fileKind";
type SortDirection = "asc" | "desc";
type FileClipboard = { mode: "cut" | "copy"; files: ProjectFile[] } | null;
```

### A2. Right-Click Context Menus

**New file: `src/components/window-content/finder-window/finder-context-menu.tsx`** (~250 lines)

Positioned absolutely at cursor coordinates. Dismisses on click-away or Escape.

**File context menu** (right-click on a file or folder):

| Item | Action | Condition |
|------|--------|-----------|
| Open | Navigate (folder) or open in editor tab | Always |
| Open in Builder | Open builder window | `builder_ref` only |
| Open in Layers | Open layers window | `layer_ref` only |
| --- | separator | |
| Rename | Trigger inline rename | Always |
| Move to... | Open move dialog | Always |
| Copy | Add to clipboard (copy mode) | Always |
| Cut | Add to clipboard (cut mode) | Always |
| Duplicate | Create copy in same folder | Not folders |
| --- | separator | |
| Delete | Move to Trash | Always |
| Download | Trigger browser download | `media_ref` only |
| --- | separator | |
| Get Info | Show properties panel | Always |
| Add to Favorites | Toggle favorite | Always |
| Tags... | Open tag manager | Always |
| Copy Path | Copy file path to system clipboard | Always |

**Empty space context menu** (right-click on content background):

| Item | Action |
|------|--------|
| New Folder | Open create folder dialog |
| New Note | Create .md virtual file |
| New Markdown File | Create .md with template |
| New Text File | Create .txt virtual file |
| --- | separator |
| Upload File(s) | Trigger file upload input |
| --- | separator |
| Paste | Paste from clipboard (greyed if empty) |
| --- | separator |
| Sort by → | Submenu: Name, Date, Size, Kind |
| View as → | Submenu: Grid, List, Columns |

**Implementation notes:**
- Reuse the `MenuButton` hover styling from `finder-toolbar.tsx`
- Position via `{ top, left }` using `e.clientY/clientX` relative to Finder container
- `useEffect` with click-away listener and Escape key

**Modifications:**
- `finder-content.tsx` — Add `onContextMenu` handlers to file items and content background
- `index.tsx` — Add context menu state: `{ type, position, file? } | null`

### A3. Multi-Select

**New file: `src/components/window-content/finder-window/use-finder-selection.ts`** (~120 lines)

```typescript
function useFinderSelection(files: ProjectFile[]) {
  // State
  selectedIds: Set<string>
  lastSelectedIndex: number | null

  // Handlers
  handleSelect(file, event) {
    if (event.metaKey) → toggle file in selection
    if (event.shiftKey) → range select from lastSelectedIndex
    else → single select (clear others)
  }

  selectAll() → select all files in current view
  clearSelection() → empty selection
  isSelected(fileId) → boolean

  return { selectedIds, handleSelect, selectAll, clearSelection, isSelected }
}
```

**Modifications:**
- `finder-content.tsx` — Replace single `selectedFileId` with multi-select. Visual highlight on all selected items.
- `index.tsx` — Preview panel shows last-selected file details. Context menu operates on all selected files (bulk delete, bulk move, etc.).

### A4. Clipboard (Cut/Copy/Paste)

**New file: `src/components/window-content/finder-window/use-finder-clipboard.ts`** (~100 lines)

```typescript
function useFinderClipboard() {
  clipboard: FileClipboard

  cut(files: ProjectFile[]) → set clipboard with mode "cut"
  copy(files: ProjectFile[]) → set clipboard with mode "copy"
  paste(targetPath: string) {
    if (mode === "cut") → call moveFile for each file, then clear clipboard
    if (mode === "copy") → call duplicateFile for each file
  }
  clear()
}
```

**Visual feedback:** Cut files rendered at 40% opacity in content view.

**Backend addition — `convex/projectFileSystem.ts`:**

```typescript
// New mutation: duplicateFile
duplicateFile({ sessionId, fileId, targetParentPath? })
  → Creates copy with name "Copy of {name}"
  → virtual files: copies content
  → ref types: creates new ref to same media/builder/layer
  → folders: recursively duplicates all children
```

### A5. Keyboard Shortcuts

**New file: `src/components/window-content/finder-window/use-finder-keyboard.ts`** (~100 lines)

Scoped to the Finder window container (not global) via `useEffect` + `addEventListener("keydown")`.

| Shortcut | Action |
|----------|--------|
| `Delete` / `Backspace` | Delete selected (with confirmation) |
| `Enter` | Start inline rename on single selection |
| `Cmd+C` | Copy selected to clipboard |
| `Cmd+X` | Cut selected to clipboard |
| `Cmd+V` | Paste at current path |
| `Cmd+A` | Select all in current view |
| `Escape` | Clear selection, close context menu |
| `Arrow keys` | Navigate between files |
| `Cmd+Shift+N` | New folder |
| `Cmd+F` | Focus search input |
| `Cmd+Z` | Undo last operation (Phase F) |

**Modifications:**
- `index.tsx` — Add `tabIndex={0}` and `ref` to container for keyboard focus

### A6. Inline Rename

**Modify: `finder-content.tsx`**

- Add `renamingFileId` state
- When active, render `<input>` over the file name text
- `Enter` or blur → call `renameFile` mutation
- `Escape` → cancel
- Both grid and list views support inline rename

### A7. Delete Confirmation Modal

**Modify: `finder-modals.tsx`**

Add `DeleteConfirmationModal`:
- Shows file count and names
- Warns about folder recursion ("This folder contains X items")
- "Move to Trash" and "Cancel" buttons
- Uses existing `ModalOverlay` pattern

### A8. Drag and Drop

**New file: `src/components/window-content/finder-window/use-finder-drag-drop.ts`** (~150 lines)

Uses HTML5 Drag and Drop API:

| Drag source | Drop target | Action |
|-------------|-------------|--------|
| File(s) in Finder | Folder in Finder | `moveFile` to target folder |
| File(s) in Finder | Sidebar folder | `moveFile` to sidebar folder path |
| File(s) in Finder | Desktop | Create desktop shortcut (Phase D) |
| Local machine files | Finder content area | Upload via `organizationMedia` → `createMediaRef` |
| Local machine files | Desktop | Upload + create desktop shortcut (Phase D) |

**Visual feedback:**
- Dragged item shows ghost with file icon + name
- Valid drop targets highlight with `--win95-highlight-bg` border
- Invalid targets show "not allowed" cursor

**Modifications:**
- `finder-content.tsx` — Add `draggable`, `onDragStart`, `onDragOver`, `onDrop` to file items and folder items
- `finder-sidebar.tsx` — Add `onDragOver`, `onDrop` to sidebar tree folders

### Phase A Backend Changes Summary

| File | Change |
|------|--------|
| `convex/projectFileSystem.ts` | Add `duplicateFile` mutation, `deleteFiles` batch mutation |

No schema changes needed.

### Phase A New Files Summary

| File | Lines |
|------|-------|
| `finder-types.ts` | ~60 |
| `finder-context-menu.tsx` | ~250 |
| `use-finder-selection.ts` | ~120 |
| `use-finder-clipboard.ts` | ~100 |
| `use-finder-keyboard.ts` | ~100 |
| `use-finder-drag-drop.ts` | ~150 |

---

## Phase B: Trash, Favorites, Recent Files, Tags

### B1. Trash / Recycle Bin

**Schema changes — `convex/schemas/projectFileSchemas.ts`:**

Add to `projectFiles` table:
```
isDeleted: v.optional(v.boolean())
deletedAt: v.optional(v.number())
deletedBy: v.optional(v.id("users"))
originalPath: v.optional(v.string())
originalParentPath: v.optional(v.string())
```

Add index: `.index("by_project_deleted", ["projectId", "isDeleted"])`

**Backend changes — `convex/projectFileSystem.ts`:**

| Function | Type | Description |
|----------|------|-------------|
| `deleteFile` | Mutation (modify) | Change to soft-delete: set `isDeleted: true`, stash `originalPath`/`originalParentPath` |
| `restoreFile` | Mutation (new) | Restore from trash, check path conflicts, clear soft-delete fields |
| `permanentlyDeleteFile` | Mutation (new) | Hard `ctx.db.delete()` |
| `emptyTrash` | Mutation (new) | Delete all `isDeleted: true` for project |
| `listTrash` | Query (new) | List all `isDeleted: true` files for project |
| `listFiles` | Query (modify) | Filter out `isDeleted: true` |
| `getFileTree` | Query (modify) | Filter out `isDeleted: true` |

**New backend file: `convex/projectFileSystemScheduler.ts`** (~50 lines)
- Cron job: auto-purge files in trash older than 30 days

**New frontend file: `src/components/window-content/finder-window/finder-trash-view.tsx`** (~200 lines)
- List view of trashed files: original path, deleted date, who deleted
- Actions: Restore, Delete Permanently
- "Empty Trash" button
- Badge count in sidebar

**Modify: `finder-sidebar.tsx`**
- Add "Trash" nav item with count badge below mode buttons

### B2. Favorites

**Schema — new table in `projectFileSchemas.ts`:**

```
userFileBookmarks: defineTable({
  userId: v.id("users"),
  fileId: v.id("projectFiles"),
  projectId: v.id("objects"),
  createdAt: v.number(),
})
  .index("by_user", ["userId"])
  .index("by_user_project", ["userId", "projectId"])
```

**Backend — `convex/projectFileSystem.ts`:**
- `toggleFavorite(sessionId, fileId)` — mutation
- `listFavorites(sessionId, projectId)` — query

**Frontend:**
- `finder-sidebar.tsx` — Add "Favorites" section listing pinned files/folders
- `finder-context-menu.tsx` — Add "Add to Favorites" / "Remove from Favorites"
- `finder-content.tsx` — Star icon on favorited items

### B3. Recent Files

**Schema — new table in `projectFileSchemas.ts`:**

```
userRecentFiles: defineTable({
  userId: v.id("users"),
  fileId: v.id("projectFiles"),
  projectId: v.id("objects"),
  accessedAt: v.number(),
})
  .index("by_user", ["userId"])
  .index("by_user_project", ["userId", "projectId"])
  .index("by_user_file", ["userId", "fileId"])
```

**Backend — `convex/projectFileSystem.ts`:**
- `recordFileAccess(sessionId, fileId)` — mutation (upsert)
- `listRecentFiles(sessionId, projectId)` — query (last 20, sorted desc)

**Frontend:**
- `finder-sidebar.tsx` — Add "Recent" section showing last 10 accessed files

### B4. Tags

**Schema — add to `projectFiles` table:**
```
tags: v.optional(v.array(v.string()))
```

Add index: `.index("by_project_tag", ["projectId"])` (filter in-query)

**Backend — `convex/projectFileSystem.ts`:**
- `addTag(sessionId, fileId, tag)` — mutation
- `removeTag(sessionId, fileId, tag)` — mutation
- `listProjectTags(sessionId, projectId)` — query (distinct tags across all files)
- Modify `listFiles` to optionally filter by tag

**New file: `src/components/window-content/finder-window/tag-manager.tsx`** (~150 lines)
- Popover for adding/removing tags on a file
- Tag autocomplete from existing project tags
- Color-coded tag pills

**Frontend modifications:**
- `finder-context-menu.tsx` — Add "Tags..." menu item
- `finder-sidebar.tsx` — Add "Tags" collapsible section with clickable tag filters
- `finder-content.tsx` — Show tag pills on files in list view

### Phase B Schema Summary

| Table | Change |
|-------|--------|
| `projectFiles` | +5 fields (soft delete) + `tags` |
| `userFileBookmarks` | New table |
| `userRecentFiles` | New table |
| `schema.ts` | Import new tables |

---

## Phase C: Integrated Editors & Tab System

The Finder becomes a workspace — files open in tabs within the Finder window itself.

### C1. Tab System

**New file: `src/components/window-content/finder-window/finder-tabs.tsx`** (~200 lines)

Tab bar between toolbar and content area:
- Tab pills showing file name + kind icon
- Dirty indicator (dot) for unsaved changes
- Close button (X) on each tab, middle-click to close
- Drag tabs to reorder
- Tab overflow: horizontal scroll when too many tabs
- "Browse" pseudo-tab returns to Finder content view

**New file: `src/components/window-content/finder-window/use-finder-tabs.ts`** (~120 lines)

```typescript
interface TabState {
  id: string;        // file ID
  name: string;
  fileKind: string;
  isDirty: boolean;
  editorType: EditorType;
}

type EditorType = "markdown" | "code" | "note" | "image" | "pdf" | "info";

function useFinderTabs() {
  tabs: TabState[]
  activeTabId: string | null

  openTab(file: ProjectFile)     // opens or focuses existing tab
  closeTab(id: string)           // warns if dirty
  setActiveTab(id: string)
  markDirty(id: string)
  markClean(id: string)
  closeAllTabs()
  closeOtherTabs(id: string)
}
```

**Editor type routing logic:**

| fileKind | mimeType / language | Editor |
|----------|-------------------|--------|
| `folder` | — | Navigate, don't open tab |
| `virtual` | `text/markdown`, `.md` | Markdown Editor |
| `virtual` | `application/json`, `.json`, `.yaml`, `.html`, `.css`, `.js`, `.ts` | Code Editor |
| `virtual` | `text/plain`, `.txt` | Note Editor |
| `virtual` | other | Code Editor (fallback) |
| `media_ref` | `image/*` | Image Viewer |
| `media_ref` | `application/pdf` | PDF Viewer |
| `media_ref` | other | File Info (download link) |
| `builder_ref` | — | Redirect to Builder window |
| `layer_ref` | — | Redirect to Layers window |

### C2. Markdown Editor

**New file: `src/components/window-content/finder-window/editors/markdown-editor.tsx`** (~300 lines)

Split-pane layout:
- **Left pane:** `<textarea>` with monospace font, line numbers in gutter
- **Right pane:** Rendered markdown preview (use `react-markdown` or lightweight renderer)
- **Toggle:** Edit only / Preview only / Split

Toolbar:
- Bold (`**text**`), Italic (`*text*`), Heading (`# `), Link (`[]()`), Code (`` ` ``), List (`- `), Checkbox (`- [ ] `)
- Insert image (from project media)
- Toggle preview

Autosave:
- Debounced `updateFileContent` mutation, 500ms after last keystroke
- Visual indicator: "Saving..." → "Saved" → fade out
- `Cmd+S` for manual save

Integration:
- Calls `markDirty(tabId)` on content change
- Calls `markClean(tabId)` after successful save

### C3. Code / Text Editor

**New file: `src/components/window-content/finder-window/editors/code-editor.tsx`** (~250 lines)

Minimal viable editor (Monaco/CodeMirror can be added later as enhancement):
- `<textarea>` with monospace font and Tab key support
- Line number gutter (rendered div synced to textarea scroll)
- Language label from file extension
- Word wrap toggle
- Autosave (same pattern as markdown)

Find and Replace bar (`Cmd+F`):
- Search input with match count
- Replace input with Replace / Replace All
- Case-sensitive toggle, regex toggle

### C4. Note Editor

**New file: `src/components/window-content/finder-window/editors/note-editor.tsx`** (~250 lines)

Simplified rich editing using `contentEditable`:
- Toolbar: Bold, Italic, Underline, H1/H2/H3, Unordered List, Checkbox List, Horizontal Rule
- Content stored as markdown (convert HTML ↔ markdown on load/save)
- Inline image support (paste or drag from media)
- Autosave

### C5. Image Viewer

**New file: `src/components/window-content/finder-window/editors/image-viewer.tsx`** (~150 lines)

For `media_ref` files with `image/*` mimeType:
- Load URL from `organizationMedia` query
- Zoom: buttons (+/-) and scroll wheel, fit-to-window toggle
- Pan: click-and-drag when zoomed beyond container
- Metadata bar: dimensions, file size, mime type, created date
- Download button

### C6. PDF Viewer

**New file: `src/components/window-content/finder-window/editors/pdf-viewer.tsx`** (~150 lines)

For `media_ref` files with `application/pdf`:
- Render via `<iframe>` or `<embed>` pointing to storage URL
- Fallback: `react-pdf` if iframe doesn't work in the Win95 window context
- Page navigation (prev/next, page number input)
- Zoom controls
- Download button

### C7. Editor Router

**New file: `src/components/window-content/finder-window/editors/editor-router.tsx`** (~80 lines)

Given a `ProjectFile`, selects and renders the correct editor component:

```typescript
function EditorRouter({ file, onDirty, onClean }: Props) {
  const editorType = getEditorType(file);

  switch (editorType) {
    case "markdown": return <MarkdownEditor file={file} ... />;
    case "code":     return <CodeEditor file={file} ... />;
    case "note":     return <NoteEditor file={file} ... />;
    case "image":    return <ImageViewer file={file} ... />;
    case "pdf":      return <PdfViewer file={file} ... />;
    default:         return <FileInfoPanel file={file} ... />;
  }
}
```

### C8. Finder Integration

**Modify: `index.tsx`**
- Add tab hook
- Render `<FinderTabs>` below toolbar when tabs exist
- When active tab selected → show `<EditorRouter>` instead of content area
- When no active tab (or "Browse" tab) → show normal Finder content
- Hide preview panel when editor tab is active
- Double-click file → `openTab(file)` instead of just selecting

**Modify: `finder-content.tsx`**
- `onDoubleClick` calls `openTab(file)` for non-folders (folders still navigate)

### Phase C Backend Changes

**Modify: `convex/projectFileSystem.ts`:**
- Add `getFileContent(sessionId, fileId)` query — returns file content optimized for editor use. For `virtual`: returns `content` string. For `media_ref`: returns storage URL. For refs: returns linked object summary.

### Phase C New Files Summary

| File | Lines |
|------|-------|
| `finder-tabs.tsx` | ~200 |
| `use-finder-tabs.ts` | ~120 |
| `editors/markdown-editor.tsx` | ~300 |
| `editors/code-editor.tsx` | ~250 |
| `editors/note-editor.tsx` | ~250 |
| `editors/image-viewer.tsx` | ~150 |
| `editors/pdf-viewer.tsx` | ~150 |
| `editors/editor-router.tsx` | ~80 |

---

## Phase D: Desktop Integration

Connect the Finder to the Desktop surface (the main OS desktop in `page.tsx`).

### D1. Desktop Files Schema

**New table: `desktopItems`** in `projectFileSchemas.ts`:

```
desktopItems: defineTable({
  userId: v.id("users"),
  organizationId: v.id("organizations"),
  // What's on the desktop
  itemType: v.union(
    v.literal("file_shortcut"),   // Link to a projectFile
    v.literal("folder_shortcut"), // Link to a project folder path
    v.literal("app_shortcut"),    // Link to a system app
  ),
  fileId: v.optional(v.id("projectFiles")),
  projectId: v.optional(v.id("objects")),
  folderPath: v.optional(v.string()),
  appCode: v.optional(v.string()),
  // Desktop layout
  label: v.string(),
  icon: v.optional(v.string()),
  positionX: v.number(),
  positionY: v.number(),
  createdAt: v.number(),
})
  .index("by_user_org", ["userId", "organizationId"])
```

### D2. Desktop Surface Component

**New file: `src/components/desktop/desktop-icons.tsx`** (~250 lines)

- Renders `desktopItems` as draggable icons on the desktop background
- Grid-snapping: icons snap to nearest grid cell (64x64 grid)
- Double-click: opens file in Finder tab, or launches app window
- Right-click: context menu (Open, Remove from Desktop, Get Info)
- Drag to reorder: updates `positionX`/`positionY` via mutation

### D3. Save to Desktop

- Context menu in Finder: "Add to Desktop" creates a `desktopItem` shortcut
- Editor toolbar: "Save to Desktop" button
- Drag from Finder to Desktop: creates shortcut on drop

### D4. Desktop Backend

**New file or extend: `convex/desktopItems.ts`** (~100 lines)

- `listDesktopItems(sessionId)` — query
- `addToDesktop(sessionId, itemType, fileId?, appCode?, position)` — mutation
- `removeFromDesktop(sessionId, itemId)` — mutation
- `updatePosition(sessionId, itemId, x, y)` — mutation
- `updatePositions(sessionId, items: {id, x, y}[])` — batch position update

### D5. Integration with page.tsx

Modify `src/app/page.tsx`:
- Render `<DesktopIcons>` layer behind windows
- Accept file drops from Finder windows

---

## Phase E: Advanced Features

### E1. File Versioning

**New table: `projectFileVersions`**:

```
projectFileVersions: defineTable({
  fileId: v.id("projectFiles"),
  projectId: v.id("objects"),
  version: v.number(),
  content: v.string(),
  contentHash: v.string(),
  createdBy: v.optional(v.id("users")),
  createdAt: v.number(),
  changeDescription: v.optional(v.string()),
})
  .index("by_file", ["fileId"])
  .index("by_file_version", ["fileId", "version"])
```

- Create version entry on every `updateFileContent` call
- Keep last 50 versions per file (prune older on save)
- UI: "Version History" panel in preview or modal — list versions, diff view, restore button

### E2. Ontology Auto-Folder Creation

When ontology objects are created, auto-create corresponding folders in the project file tree:

```
/Projects/{project-name}/
├── CRM/
│   ├── Contacts/{contact-name}/
│   └── Organizations/{org-name}/
├── Events/{event-name}/
├── Forms/{form-name}/
├── Invoices/{invoice-number}/
├── Products/{product-name}/
└── Workflows/{workflow-name}/
```

Hook into each ontology's create mutation to call a new `captureOntologyObject()` internal function.

### E3. Content Search

**Convex search index** on `projectFiles.content`:

```typescript
.searchIndex("search_content", {
  searchField: "content",
  filterFields: ["projectId", "fileKind", "isDeleted"],
})
```

New query: `searchFiles(sessionId, projectId, query)` — full-text search across file content.

Frontend: enhance search bar in `finder-toolbar.tsx` to search content (not just names).

### E4. Column View

**New file: `src/components/window-content/finder-window/finder-columns-view.tsx`** (~250 lines)

macOS Finder column browser:
- Each column represents a folder level
- Selecting a folder opens its contents in the next column
- Selecting a file shows preview in the rightmost column
- Horizontal scroll when columns exceed container width
- Consistent file icons and selection styling

Add "columns" to `ViewMode` type and toolbar toggle.

### E5. Enhanced File Properties

Expand `finder-preview.tsx` into a full properties panel:
- All metadata: path, size, kind, mime, language, created, modified, source
- Tags (editable)
- Linked ontology objects (clickable)
- Version history summary
- Sharing info (if shared)
- Storage info for media_ref (storage ID, original upload)

---

## Phase F: Polish

### F1. Upload Progress

- Track upload state in a React context or Finder-scoped state
- Progress bar per file in a toast/footer area
- Cancel button
- Success/failure notifications
- Queue multiple uploads

### F2. Drag-and-Drop Visual Feedback

- Drop target folders highlight with `--win95-highlight-bg` border + glow
- Drag ghost shows file icon + name + count badge for multi-select
- Invalid drop targets show "not-allowed" cursor
- Insertion line between list items for reorder (future)

### F3. Undo/Redo

- Operation log using `useReducer` or dedicated stack
- Each file operation (rename, move, delete, create) pushes an inverse operation
- `Cmd+Z` pops and executes inverse
- Session-scoped (not persisted)
- Max 50 operations in stack

### F4. Keyboard Accessibility

- Focus management: tab order through sidebar → toolbar → content → preview
- ARIA labels on all interactive elements
- `role="grid"` on file grid, `role="row"` on items
- Screen reader announcements for operations ("File moved to Trash")
- Focus ring styling consistent with Win95 theme

---

## Implementation Priority

| Order | Phase | Impact | Complexity |
|-------|-------|--------|------------|
| 1 | A (Core Interactions) | Critical | Medium |
| 2 | C (Editors & Tabs) | High | High |
| 3 | B (Trash/Favorites/Tags) | Medium | Medium |
| 4 | D (Desktop Integration) | Medium | Medium |
| 5 | E (Advanced) | Lower | High |
| 6 | F (Polish) | Lower | Medium |

Phases A and C together create the "real file system" experience. B and D make it feel complete. E and F are enhancements.

---

## Critical Files Reference

### Frontend (modify)

| File | Phases |
|------|--------|
| `src/components/window-content/finder-window/index.tsx` | A, B, C |
| `src/components/window-content/finder-window/finder-content.tsx` | A, B, C |
| `src/components/window-content/finder-window/finder-sidebar.tsx` | A, B |
| `src/components/window-content/finder-window/finder-toolbar.tsx` | A, E |
| `src/components/window-content/finder-window/finder-preview.tsx` | B, E |
| `src/components/window-content/finder-window/finder-modals.tsx` | A |
| `src/app/page.tsx` | D |

### Backend (modify)

| File | Phases |
|------|--------|
| `convex/projectFileSystem.ts` | A, B, C, E |
| `convex/schemas/projectFileSchemas.ts` | B, D, E |
| `convex/schema.ts` | B, D, E |

### New files (all phases)

| File | Phase |
|------|-------|
| `finder-types.ts` | A |
| `finder-context-menu.tsx` | A |
| `use-finder-selection.ts` | A |
| `use-finder-clipboard.ts` | A |
| `use-finder-keyboard.ts` | A |
| `use-finder-drag-drop.ts` | A |
| `finder-trash-view.tsx` | B |
| `tag-manager.tsx` | B |
| `finder-tabs.tsx` | C |
| `use-finder-tabs.ts` | C |
| `editors/markdown-editor.tsx` | C |
| `editors/code-editor.tsx` | C |
| `editors/note-editor.tsx` | C |
| `editors/image-viewer.tsx` | C |
| `editors/pdf-viewer.tsx` | C |
| `editors/editor-router.tsx` | C |
| `desktop-icons.tsx` | D |
| `finder-columns-view.tsx` | E |
| `convex/projectFileSystemScheduler.ts` | B |
| `convex/desktopItems.ts` | D |
