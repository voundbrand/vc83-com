---

## Task: Build a fully functional Finder / file system for the L4YERCAK3 Desktop UI

### Context

L4YERCAK3's Desktop UI uses an OS metaphor — start menu, windows, desktop. We're replacing the limited media library with a real file system that behaves like macOS Finder or Windows Explorer. This isn't a simplified file browser. It needs to feel like a native OS file system where users can create, edit, organize, move, and view files — all within the browser.

### Core requirements

**File system behavior — it must work like a real OS:**

- Browse folders and files in a tree/column/list/grid view (user's choice, like Finder's view modes)
- Create new folders anywhere
- Create new files (notes, documents, markdown, etc.) from within the Finder
- Rename, move, copy, delete files and folders (drag and drop + right-click context menu)
- Cut/copy/paste support
- File path breadcrumbs showing current location
- Search across the entire file system (by name, content, file type)
- Sort by name, date modified, size, file type
- Favorites / sidebar shortcuts to frequently accessed folders
- Recent files list
- Trash / recycle bin with restore capability

**Desktop integration:**

- Files and folders can be placed on the Desktop (just like a real OS desktop)
- Desktop icons are draggable and arrangeable
- Double-clicking a file on the Desktop opens it in the appropriate editor/viewer
- "Save to Desktop" option available from any editor or file creation flow
- Desktop persists its layout between sessions

**File creation — users need to create these from within the Finder or Desktop:**

- Notes / plain text files
- Markdown documents
- Rich text documents
- Folders
- Possibly spreadsheets (future consideration)
- Files can also be created by dragging/uploading from the user's local machine

**File editing — integrated editors, not external links:**

- **Markdown / rich text editor** — VS Code-inspired editing experience with syntax highlighting, preview mode, split pane (edit + preview side by side), and autosave
- **Plain text / code editor** — Monaco or CodeMirror-based editor with syntax highlighting for common languages (JSON, YAML, HTML, CSS, JS, etc.), line numbers, word wrap toggle, find and replace
- **Note-taking mode** — Simplified editor for quick notes (think Apple Notes or Notion-lite), supports basic formatting, checklists, inline images
- **PDF viewer** — In-app PDF rendering with page navigation, zoom, search within document, and annotation capability (highlight, comment)
- **Image viewer** — Preview images with zoom, pan, and basic metadata display
- **File info / properties panel** — View file metadata: size, created date, modified date, file type, location, tags, linked ontology object

**File types the system must handle:**

| Action | Supported types |
|---|---|
| Create & edit in-app | .md, .txt, .rtf, .json, .yaml, .html, .css, .js, notes (custom format) |
| View in-app | .pdf, .png, .jpg, .gif, .svg, .webp |
| Upload from local machine | Any file type — stored and downloadable even if not editable in-app |
| Download | Any file — user can always export/download to their local machine |

**Tabs and multi-file editing:**

- Editor supports multiple open files as tabs (like VS Code or browser tabs)
- Tabs show file name and unsaved changes indicator
- Switch between open files without losing state
- Split pane support — view two files side by side

### Integration with the ontology file system

As defined in the broader architecture, the Finder is also the interface for browsing ontology-scoped folders:

```
/
├── Desktop/              ← user's desktop files
├── Projects/
│   └── {project-name}/   ← auto-generated project folders
├── CRM/
│   ├── Contacts/{id}/
│   └── Organizations/{id}/
├── Events/{id}/
├── Web Publishing/{app-id}/
├── ... (all ontologies)
└── Trash/
```

- Ontology folders are auto-created when ontology objects are created
- Users can add files to any ontology folder manually
- AI uses these folders as context when working within that ontology scope
- Some folders/files are system-generated (e.g. Builder configs, Layers automation definitions) and should be marked as such but still viewable and editable

### Behavior details

**Autosave:**
- All editors autosave after a short debounce (2-3 seconds of inactivity)
- Manual save via Cmd/Ctrl+S
- Version history — user can see and restore previous versions of a file

**Right-click context menu (on files):**
- Open / Open with...
- Rename
- Move to...
- Copy
- Duplicate
- Delete (move to Trash)
- Download
- Get info / Properties
- Add tags
- Copy path

**Right-click context menu (on empty space / folders):**
- New folder
- New note
- New markdown file
- New text file
- Upload file(s)
- Paste
- Sort by...
- View as (list / grid / columns)

**Drag and drop:**
- Drag files between folders in the Finder
- Drag files from Finder to Desktop and vice versa
- Drag files from local machine into Finder to upload
- Drag to Trash to delete

### What this is NOT

- This is not a Google Drive or Dropbox clone — there's no sharing/collaboration model (yet)
- This is not a full IDE — the code editor is for viewing and light editing of config files, not for running builds or terminals
- This is not a DAM (digital asset management) system — no complex tagging taxonomies or approval workflows (yet)

### Technical considerations

- File storage backend should use the existing Convex infrastructure
- Files need unique IDs, not just paths, since they can be linked to ontology objects
- The file system tree should be indexable so AI can efficiently pull context from specific branches
- Large files (PDFs, images) should use blob storage with streaming for the viewer
- Editor state (open tabs, cursor position, view preferences) should persist per user session

### Key principle

**If a user has ever used Finder, Explorer, or VS Code, the L4YERCAK3 file system should feel immediately familiar.** No learning curve. Native-feeling interactions. The only difference is that it lives in the browser and is wired into L4YERCAK3's ontology layer.

---

