# L4YERCAK3 File System Architecture — Design Reference

## Overview

A project-scoped file system unifying Desktop, Builder, and Layers under a Finder metaphor. Projects are the organizing primitive — every artifact lives in a project's file tree and doubles as AI context.

## Schema

### projectFiles Table

```
projectFiles
├── organizationId, projectId          # Scoping
├── name, path, parentPath             # Identity + folder listing
├── fileKind: virtual|media_ref|builder_ref|layer_ref|folder
├── content, contentHash               # Inline (virtual files only)
├── mediaId, builderAppId, layerWorkflowId  # References
├── mimeType, sizeBytes, language      # Metadata
├── source: user|builder_auto|layers_auto|ai_generated|migration
├── createdBy, createdAt, updatedAt
└── Indexes: by_project, by_project_path, by_project_parent,
             by_project_kind, by_org, by_media_ref, by_builder_ref, by_layer_ref
```

### projectShares Table

```
projectShares
├── projectId                          # The project being shared
├── ownerOrgId                         # The org that owns the project
├── targetOrgId                        # The org receiving access
├── shareScope: "project"|"subtree"    # Entire project or specific path
├── sharedPath: optional               # Root path for subtree shares
├── permission: "viewer"|"editor"|"admin"
├── sharedBy, acceptedBy               # User IDs
├── status: "pending"|"active"|"revoked"
├── createdAt, updatedAt
└── Indexes: by_project, by_target_org, by_owner_org,
             by_project_target, by_target_status
```

## Key Design Decisions

1. **Reference-based linking** — `builder_ref` and `layer_ref` point to existing objects; zero data duplication
2. **path + parentPath** — O(1) folder listing, no recursive queries
3. **media_ref** bridges org media into project scope without copying files
4. **Existing tables unchanged** — organizationMedia, builderFiles, objects all stay as-is

## Cross-Org Sharing Rules

- **License gating** — Agency/Enterprise tiers can create shares; all tiers can receive
- **Owner retains control** — Owning org can revoke at any time
- **Sub-org shortcut** — Parent-child org shares auto-accept (skip invite flow)
- **AI context isolation** — Target org AI only gets shared context when working within the shared project
- **Audit trail** — All share events logged

## Default Folder Structure

On project creation, these folders are auto-initialized:
```
/builder    — builder_ref files (auto-captured)
/layers     — layer_ref files (auto-captured)
/notes      — virtual files (user notes, AI memory)
/assets     — media_ref files (drag from org media)
```

## Auto-Capture Flow

```
Builder save → check customProperties.projectId → captureBuilderApp()
  → upsert projectFile { fileKind: "builder_ref", path: "/builder/{name}" }

Layers save → check customProperties.projectId → captureLayerWorkflow()
  → upsert projectFile { fileKind: "layer_ref", path: "/layers/{name}" }
```

## AI Knowledge Base

`getProjectKnowledgeBase(projectId)` assembles context:
- virtual files → inline content
- media_ref → extractedText from organizationMedia
- builder_ref → file listing from builderFiles
- layer_ref → workflow summary (nodes, edges, triggers)
- Capped at 80K chars, supports path filtering

## Critical Files Reference

| File | Purpose |
|------|---------|
| `convex/schemas/projectFileSchemas.ts` | Table definitions |
| `convex/projectFileSystem.ts` | Authenticated CRUD (7 queries, 8 mutations) |
| `convex/projectFileSystemInternal.ts` | Internal hooks + AI queries |
| `convex/projectSharing.ts` | Sharing CRUD (4 queries, 4 mutations) |
| `convex/projectOntology.ts` | Project creation + folder init |
| `convex/builderAppOntology.ts` | Builder auto-capture integration |
| `src/components/window-content/media-library-window/index-dropbox.tsx` | UI starting point for Finder |
| `src/hooks/window-registry.tsx` | Window registration |
| `src/contexts/builder-context.tsx` | Builder state (needs activeProjectId) |
