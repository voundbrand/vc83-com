# Continuation Prompt: Builder Virtual File System & Code Editor

## Context: Where We Left Off

We just implemented the self-heal deploy chat flow (see `SELF_HEAL_DEPLOY_PLAN.md`). During deployment testing, we discovered a fundamental limitation: **v0-generated files are stored as an opaque JSON blob** (`customProperties.generatedFiles[]`) on Convex `objects` rows, with no way to view, edit, or debug them from the builder UI.

### The Immediate Problem

When deploying a v0-built Next.js app, the root URL showed a 404 because there was no `app/page.tsx`. We added a `generatePageTsx()` scaffold function to auto-create one, but it fell back to a minimal placeholder ("Welcome / Your app is live") because it couldn't find the v0 component to import. The generated files from v0 are stored in the DB but we had no visibility into them - no way to check what paths v0 used, no way to manually fix the import, no way to see the actual file tree.

This exposed the need for a proper file system layer in the builder.

---

## Current Architecture (As-Is)

### File Storage
- **Location**: `customProperties.generatedFiles` on `builder_app` objects in Convex
- **Shape**: `Array<{ path: string; content: string; language: string }>`
- **Example paths from v0**: `components/landing-page.tsx`, `lib/utils.ts`, `components/ui/button.tsx`
- **Scaffold files added at publish time**: `package.json`, `app/layout.tsx`, `app/globals.css`, `next.config.js`, `tsconfig.json`, `.gitignore`, `app/page.tsx`

### File Flow
```
v0 Platform API --> builderChat() action --> generatedFiles[] stored in Convex DB
                                                    |
                                                    v
                                        createRepoFromBuilderApp()
                                                    |
                                                    v
                                        Merge with scaffold files
                                                    |
                                                    v
                                        Push to GitHub (Git Trees API, single atomic commit)
                                                    |
                                                    v
                                        Vercel auto-deploys from GitHub
```

### Preview Rendering
- **v0 provider**: Uses v0's hosted demo URL in an iframe (NOT the stored files)
- **Built-in provider**: Uses `pageSchema` JSON rendered by `PageRenderer` (NOT the stored files)
- **Neither mode** renders from the actual `generatedFiles` - the files only matter at deploy time

### What Doesn't Exist Yet
- No file tree / file explorer UI
- No code editor (no Monaco, no CodeMirror)
- No virtual filesystem abstraction
- No diff viewer
- No way to see what's actually being deployed
- No way to manually edit files before/after v0 generation

---

## Proposed Architecture (To-Be)

### 1. Virtual File System (VFS) Layer

Create a proper file system abstraction in Convex that replaces the flat `generatedFiles[]` array:

```
convex/fileSystem/
  fileSystemOntology.ts    -- CRUD mutations/queries for files
  fileTreeHelpers.ts       -- Tree operations (move, rename, mkdir)
```

**Schema design options**:

**Option A: Separate `files` table** (recommended)
```typescript
// Each file is its own Convex document
files: defineTable({
  appId: v.id("objects"),           // Link to builder_app
  path: v.string(),                 // "app/page.tsx"
  content: v.string(),              // File contents
  language: v.string(),             // "typescript"
  contentHash: v.string(),          // SHA for change detection
  lastModifiedAt: v.number(),
  lastModifiedBy: v.union(v.literal("v0"), v.literal("user"), v.literal("self-heal"), v.literal("scaffold")),
  isScaffold: v.boolean(),          // true for generated infra files
}).index("by_app", ["appId"])
  .index("by_app_path", ["appId", "path"])
```

Benefits:
- Individual file reads/writes don't reload the entire file set
- Convex reactivity works per-file (editing one file doesn't re-render everything)
- Git-style change tracking via `contentHash` + `lastModifiedBy`
- Can query file tree without loading all content

**Option B: Keep flat array, add metadata** (simpler migration)
- Keep `generatedFiles[]` but add `lastModifiedBy`, `hash` fields
- Add a separate `fileMetadata` field for tree structure
- Less ideal for reactivity and scale

### 2. File Explorer Panel (UI)

New tab in the builder sidebar alongside Chat, Design, Vars, Rules, Settings:

```
src/components/builder/
  file-explorer-panel.tsx      -- File tree + editor container
  file-tree.tsx                -- Recursive tree component
  code-editor.tsx              -- Monaco editor wrapper
  file-diff-viewer.tsx         -- Side-by-side diff for self-heal changes
```

**Features**:
- Tree view of all project files (v0 generated + scaffold)
- Click to open in code editor
- Visual indicators: v0-generated vs scaffold vs user-edited vs self-heal-modified
- Right-click context menu: rename, delete, new file, duplicate
- Search across files (Cmd+Shift+F style)

### 3. Code Editor (Monaco)

Embed Monaco editor for viewing and editing files:

```typescript
// code-editor.tsx
import Editor from "@monaco-editor/react";

<Editor
  height="100%"
  language={file.language}
  value={file.content}
  theme="vs-dark"
  onChange={(value) => updateFile(file.path, value)}
  options={{
    minimap: { enabled: false },
    fontSize: 13,
    wordWrap: "on",
    formatOnPaste: true,
  }}
/>
```

**Package**: `@monaco-editor/react` (well-maintained, ~500KB)

### 4. AI Code Tools

Integrate AI assistance directly into the file editor:

- **Inline fix**: Select code, ask AI to fix/improve it
- **Generate file**: "Create app/page.tsx that imports and renders the main v0 component"
- **Explain errors**: When self-heal identifies a build error, show the relevant file with error annotations
- **Self-heal integration**: After self-heal generates fixes, show a diff view before applying

This connects to the existing `selfHealDeploy.ts` / `selfHealChat.ts` infrastructure - instead of blindly applying fixes, show them in the diff viewer first.

### 5. Deploy Preview (What's Actually Being Deployed)

Before hitting "Publish", show a "Review Files" step:
- Full file tree of what will be committed to GitHub
- Scaffold files highlighted separately
- Any missing critical files flagged (e.g., no `app/page.tsx`)
- Diff against last deployed version (if redeploying)

---

## Key Files to Reference

| File | Purpose | Relevance |
|------|---------|-----------|
| `convex/builderAppOntology.ts` | Builder app CRUD, file storage | Migration target for VFS |
| `convex/integrations/github.ts` | GitHub push, scaffold generation | Consumes VFS files |
| `convex/integrations/selfHealDeploy.ts` | LLM code fix generation | Writes to VFS after fix |
| `convex/integrations/selfHealChat.ts` | Chat-based heal orchestration | Coordinates fix flow |
| `src/contexts/builder-context.tsx` | Builder state management | Needs VFS integration |
| `src/components/builder/builder-chat-panel.tsx` | Chat UI, sidebar tabs | Add "Files" tab |
| `src/components/builder/builder-preview-panel.tsx` | App preview | Could render from VFS |
| `src/components/builder/publish-dropdown.tsx` | Deploy UI | Add "Review Files" step |
| `src/components/builder/publish-config-wizard.tsx` | Deploy config wizard | Scaffold file config |

---

## Immediate Bug to Fix First

The `app/page.tsx` fallback is showing a placeholder instead of the v0 component. Before building the full VFS, we need to:

1. **Log the actual `generatedFiles` paths** during `createRepoFromBuilderApp` so we can see what v0 produced
2. **Fix `generatePageTsx()`** to handle v0's actual file naming conventions (v0 often puts the main component at the root level like `page.tsx` without the `app/` prefix, or uses names like `v0-landing-page.tsx`)
3. **Consider always using v0's `page.tsx` output directly** by copying it to `app/page.tsx` instead of generating a wrapper

Add this debug logging to `github.ts` in the `createRepoFromBuilderApp` action:
```typescript
console.log("[GitHub] Generated files from v0:", generatedFiles.map(f => f.path));
console.log("[GitHub] All files to commit:", allFiles.map(f => f.path));
```

---

## Migration Strategy

### Phase 1: Visibility (Quick Win)
- Add file path logging in GitHub push
- Fix `app/page.tsx` generation based on actual v0 output
- Add a read-only "Files" tab to the builder sidebar showing the file tree

### Phase 2: Virtual File System
- Create `files` table in Convex schema
- Migrate `generatedFiles[]` to individual file records
- Update `github.ts` to read from new table
- Update `selfHealDeploy.ts` to write fixes to new table

### Phase 3: Code Editor
- Integrate Monaco editor
- File editing with save to Convex
- Syntax highlighting, error markers
- Self-heal diff viewer

### Phase 4: AI Code Tools
- Inline AI assistance in editor
- "Fix this file" context action
- Pre-deploy file review with AI analysis
- Smart scaffold generation (AI writes `app/page.tsx` by analyzing v0 output)

---

## Dependencies to Install (Phase 3)

```bash
npm install @monaco-editor/react
# Monaco is loaded from CDN by default, no extra config needed
```

---

## Notes

- The Convex `objects` table uses a flexible `customProperties` field (no strict schema), so the VFS migration can be gradual
- v0 Platform API returns files with paths like `components/foo.tsx` (no `src/` or `app/` prefix)
- The scaffold always assumes Next.js App Router (`app/` directory)
- Self-heal writes to `generatedFiles[]` via `updateBuilderApp` mutation - this needs to target VFS instead
- The builder chat already has `addSystemMessage` / `addAssistantMessage` for programmatic message injection (added in the self-heal chat PR)
