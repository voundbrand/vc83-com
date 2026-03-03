# Office File Tool Suite Index

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/office-file-tool-suite`  
**Last updated:** 2026-03-01  
**Source request:** Create a queue-first implementation plan for an Office-style AI tool suite plus a super-admin Tool Registry surface, grounded in current code reality and documented gaps.

---

## Purpose

This workstream delivers:

1. A full Office-style AI tool suite (`fs_*`, `doc_*`, `sheet_*`, `slides_*`, `share_*`, `cloud_*`, `artifact_*`).
2. Provider-first cloud rollout (Google + Microsoft first, Dropbox next).
3. A dedicated Organizations `Tool Registry` tab for global cross-org inventory/usage + Foundry read/decide review.
4. Fail-closed runtime behavior with explicit policy/scope/provider readiness gating.

---

## Core files

- Queue:  
  `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/office-file-tool-suite/TASK_QUEUE.md`
- Session prompts:  
  `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/office-file-tool-suite/SESSION_PROMPTS.md`
- Master plan:  
  `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/office-file-tool-suite/MASTER_PLAN.md`
- Index (this file):  
  `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/office-file-tool-suite/INDEX.md`

---

## Current snapshot (2026-03-01)

1. Runtime registry and callable tool execution are centralized in `convex/ai/tools/registry.ts`.
2. Tool Foundry backlog + super-admin approve/deny already exists in `convex/ai/toolFoundry/proposalBacklog.ts` and Agent Control UI.
3. File/folder CRUD, trash/restore, upload, and cross-org sharing are already implemented in `convex/projectFileSystem.ts` and `convex/projectSharing.ts`.
4. OAuth foundations and scope catalogs are in place for Google/Microsoft, including Drive and OneDrive/SharePoint scope definitions.
5. Drive/OneDrive UI remains intentionally marked as coming soon.
6. Global Tool Registry query surface and dedicated Organizations tab are not yet implemented.
7. Queue progress: `1/17` rows complete (`OFS-001`), `1/12` `P0` rows complete.
8. Next promotable row: `OFS-002`.

---

## Scope boundary

Owned in this workstream:

1. Office/cloud tool contracts and runtime/tool-offering integrations.
2. Provider file clients (Google Drive, OneDrive/SharePoint, Dropbox) and gating logic.
3. Super-admin Tool Registry tab and global Foundry review queries.
4. Trust telemetry and rollout/rollback docs specific to this capability.

Not owned in this workstream:

1. Full Tool Foundry lifecycle publishing UX.
2. Non-office feature families unrelated to filesystem/doc/sheet/slides/share/cloud.
3. Artifact storage migration away from canonical `projectFiles` backend.

---

## Lane board

- [x] Lane `A` scaffold: `OFS-001`
- [ ] Lane `A` contracts/readiness baseline: `OFS-002`, `OFS-003`
- [ ] Lane `B` fs/share/artifact families: `OFS-004`, `OFS-005`
- [ ] Lane `C` doc/sheet/slides families: `OFS-006`, `OFS-007`, `OFS-008`
- [ ] Lane `D` cloud providers: `OFS-009`, `OFS-010`, `OFS-011`
- [ ] Lane `E` runtime gating + trust events: `OFS-012`, `OFS-013`
- [ ] Lane `F` super-admin registry surface: `OFS-014`, `OFS-015`
- [ ] Lane `G` scenario validation + closeout: `OFS-016`, `OFS-017`

---

## Operating commands

- Docs guard: `npm run docs:guard`
- Baseline type safety: `npm run typecheck`
- Lint: `npm run lint`
- AI unit suite: `npm run test:unit -- tests/unit/ai`
