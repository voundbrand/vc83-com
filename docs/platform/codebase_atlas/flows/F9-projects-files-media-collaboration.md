# F9 - Projects, Files, Media, and Collaboration

## Intent

Provide a shared project workspace with scoped file operations, media storage, and collaboration access controls.

## Entry points

- `convex/api/v1/projects.ts`
- Finder/project drawer UI surfaces under `src/components/window-content/finder-window/*`
- Media UI under `src/app/media/*`

## Primary anchors

- `convex/projectOntology.ts`
- `convex/projectFileSystem.ts`
- `convex/projectSharing.ts`
- `convex/projectDrawerAuth.ts`
- `convex/organizationMedia.ts`

## Sequence

```mermaid
sequenceDiagram
    participant User
    participant UI as Projects/Finder UI
    participant Project as Project Ontology
    participant FS as Project File System
    participant Sharing as Sharing/Auth
    participant Media as Organization Media
    participant Storage
    participant DB

    User->>UI: Open project workspace and manage files
    UI->>Project: Read/update project metadata
    Project->>DB: Persist project object and activity

    UI->>FS: List/create/move/delete project files
    FS->>Sharing: Resolve project/org access permissions
    Sharing-->>FS: owner/editor/viewer access
    FS->>DB: Persist file/folder metadata + revisions

    alt File upload
        UI->>Media: Request upload URL + save metadata
        Media->>Storage: Store binary content
        Storage-->>Media: storageId/url
        Media->>DB: Insert organizationMedia record
    end

    UI-->>User: Updated workspace tree + media references
```

## Invariants

1. File operations must enforce project-share permissions before writes.
2. Org-level and project-level file scopes must remain isolated.
3. Storage quota enforcement must happen before upload URL issuance.
