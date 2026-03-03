# Office File Tool Suite Master Plan

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/office-file-tool-suite`  
**Last updated:** 2026-03-01

---

## Objective

Deliver a production-grade Office-style AI tool suite and super-admin Tool Registry control plane without breaking existing trust, approval, and policy boundaries.

Phase-1 outcomes:

1. Runtime-callable `fs_*`, `doc_*`, `sheet_*`, `slides_*`, `share_*`, `cloud_*`, and `artifact_*` tools.
2. Provider-first cloud support in sequence: Google, Microsoft, then Dropbox.
3. Global super-admin Tool Registry tab with cross-org inventory/usage and Foundry read+decide review.
4. Deterministic fail-closed behavior for unavailable capabilities and missing provider scopes.

---

## Current state in this codebase (ground truth)

### 1) Runtime tool registry exists and is authoritative

- `AITool` and `TOOL_REGISTRY` are centralized in `convex/ai/tools/registry.ts` (`AITool` at line `202`, `TOOL_REGISTRY` at line `3830`).
- Current metadata is limited (`name`, `description`, `status`, `parameters`, `readOnly`, `execute`); no `operationClass`/`surfaces`/artifact metadata yet.
- Public metadata query exists as `getToolList` in the same file (line `4420`).

### 2) Tool Foundry proposal queue + approval surface exists

- Runtime capability-gap persistence and promotion decision contracts are in `convex/ai/toolFoundry/proposalBacklog.ts`.
- Super-admin review query exists: `listPendingProposalsForReview` (line `648`).
- Promotion decisions can be submitted via `submitProposalPromotionDecision` (line `812`).

### 3) Super-admin Organizations UI currently hosts Foundry review inside Agent Control

- `AgentControlCenterTab` calls Foundry list + decision mutations (`agent-control-center-tab.tsx` lines `345`, `406`, `500`).
- Organizations tab registry currently includes `agent-control-center` but no dedicated `tool-registry` tab (`super-admin-organizations-window/index.tsx` lines `31-43`, `50-62`, `265`).

### 4) Internal file system + sharing backend are production-capable

- `projectFileSystem` provides list/get/tree/content, folder/file create, rename/move, trash/restore, upload URL + save (`convex/projectFileSystem.ts` lines `229`, `251`, `275`, `352`, `481`, `528`, `759`, `789`, `840`, `891`, `1058`, `1326`, `1350`).
- `projectSharing` provides share create/list/accept/revoke/permission update (`convex/projectSharing.ts` lines `25`, `53`, `88`, `131`, `212`, `238`, `266`).

### 5) OAuth and scope foundations exist for Google + Microsoft

- Google OAuth initiation + scope selection are implemented in `convex/oauth/google.ts` (`initiateGoogleOAuth` line `31`, `GOOGLE_REQUIRED_SCOPES` line `20`).
- Microsoft OAuth initiation + dynamic scopes are implemented in `convex/oauth/microsoft.ts` (`initiateMicrosoftOAuth` line `26`, `getRequiredScopes()` usage line `90`).
- Scope catalogs include Drive and OneDrive/SharePoint scopes:
  - `convex/oauth/googleScopes.ts` (`drive.readonly` line `74`, `drive.file` line `81`).
  - `convex/oauth/microsoftScopes.ts` (`Files.Read*` lines `174-209`, `Sites.Read.All` line `261`).

### 6) Provider API clients are partially ready

- Google API client is calendar-focused (`convex/oauth/googleClient.ts`, header and base URL lines `2`, `13`), with calendar operations but no Drive module.
- Microsoft Graph client already has generic request plumbing + calendar operations and basic OneDrive/SharePoint endpoints marked future (`convex/oauth/graphClient.ts` lines `315`, `317`, `335`, `337`).

### 7) Runtime offering/gating exists but is not scope-granular for office cloud tools

- Layered tool scoping and integration-aware filtering exist (`convex/ai/toolScoping.ts`):
  - `INTEGRATION_REQUIREMENTS` map at line `49`.
  - Removal by missing integration in resolution path (line `705`).
  - Connected integrations query at line `801`.
- Existing integration lookup uses `objects` of type `oauth_connection` with `status === "connected"` (`toolScoping.ts` lines `810-818`), while OAuth flows persist provider state in `oauthConnections` with `status: "active"` (`google.ts` line `303` and `microsoft.ts` line `556`).

### 8) UI explicitly signals Drive/OneDrive as pending

- Google integration screen has disabled “Access Drive (coming soon)” (`google-settings.tsx` line `416`).
- Microsoft integration screen has disabled “Access OneDrive (coming soon)” (`microsoft-settings.tsx` line `474`).

---

## Gap analysis

### Implemented now

1. Authoritative runtime tool registry and callable execution path.
2. Capability-gap proposal persistence and super-admin decisioning in Tool Foundry.
3. Mature internal file/folder/share backend contracts.
4. OAuth, token refresh, and scope catalog foundations for Google/Microsoft.

### Partially implemented

1. Cloud provider clients: Microsoft Graph has baseline file endpoints but not integrated as runtime `cloud_*` tools; Google is calendar-centric without Drive client module.
2. Runtime integration gating is provider-name based, not operation/scope based for file workloads.
3. Super-admin currently reviews Foundry proposals but lacks global registry inventory/usage control plane.

### Missing / to build

1. Office tool family modules (`fileSystemTools.ts`, `documentTools.ts`, `spreadsheetTools.ts`, `presentationTools.ts`, `cloudFileTools.ts`, `shareTools.ts`).
2. Registry metadata contract expansion for operation class/surfaces/artifact I/O/approval profile.
3. Global super-admin queries:
   - `api.ai.tools.registry.getToolRegistryInventory`
   - `api.ai.tools.registry.getToolRegistryToolDetails`
   - `api.ai.tools.registry.getToolRegistryUsageSummary`
   - `api.ai.toolFoundry.proposalBacklog.listPendingProposalsForReviewGlobal`
4. Dedicated Organizations `Tool Registry` tab.
5. Trust-event taxonomy additions for export/cloud/share actions with correlation + lineage provenance.

---

## Target state

### Runtime contract

1. `convex/ai/tools/registry.ts` remains source of truth for callable tools.
2. Every office/cloud tool carries explicit metadata for authority and visibility:
   - `operationClass`: `read` | `mutate` | `external_network` | `secret_access`
   - `surfaces`: `internal_filesystem` | `google_drive` | `onedrive_sharepoint` | `dropbox` | `artifact_export`
   - `artifactKindsIn` / `artifactKindsOut`
   - `approvalProfile`: `none` | `mutating_required` | `provider_write_required`
   - `registryTags`
3. Runtime only offers provider tools when connection + granted scope + policy are all true.
4. Unknown capabilities continue through deterministic Tool Foundry blocked/proposal path.

### Tool families (phase 1)

1. `fs_*`: list/get/create folder/move/rename/trash/restore/upload.
2. `doc_*`: create/edit/template/export (`docx`, `pdf`).
3. `sheet_*`: create/edit/formula/table/export (`xlsx`, `csv`).
4. `slides_*`: create/edit/chart/export (`pptx`, `pdf`).
5. `share_*`: create/list/accept/update/revoke sharing.
6. `cloud_*`: list/download/upload/create share link/sync internal file.
7. `artifact_*`: persist exports to internal workspace and provider-link references.

### Super-admin control plane (phase 1)

1. New Organizations `Tool Registry` tab.
2. Global cross-org inventory and usage summary with org filters.
3. Foundry review as read+decide only (no full lifecycle publishing UI in this phase).

---

## Implementation phases (queue aligned)

| Phase | Outcome | Queue IDs |
|---|---|---|
| 1 | Registry contract + readiness source-of-truth hardening | `OFS-001`, `OFS-002`, `OFS-003` |
| 2 | Internal filesystem/share/artifact tool families | `OFS-004`, `OFS-005` |
| 3 | Document/sheet/slides tool families | `OFS-006`, `OFS-007`, `OFS-008` |
| 4 | Provider clients + cloud tool families | `OFS-009`, `OFS-010`, `OFS-011` |
| 5 | Runtime gating + trust telemetry hardening | `OFS-012`, `OFS-013` |
| 6 | Super-admin Tool Registry + global Foundry review | `OFS-014`, `OFS-015` |
| 7 | Scenario validation + closeout/runbook | `OFS-016`, `OFS-017` |

---

## Risks and mitigations

1. Risk: provider tools are exposed without valid scopes.
   Mitigation: add scope-aware offer-time gating and explicit denied reasons before tool schema exposure.
2. Risk: integration readiness source drifts across tables/models.
   Mitigation: normalize provider readiness contract to `oauthConnections` + granted scopes and add deterministic tests.
3. Risk: export flows partially mutate storage on failure.
   Mitigation: use transactional artifact write pattern with deterministic error classes.
4. Risk: super-admin query performance/regression in global mode.
   Mitigation: add indexed aggregation queries with bounded pagination and org filters.
5. Risk: governance surface overreaches phase-1 scope.
   Mitigation: enforce read+decide-only UX contract and defer full lifecycle publishing UX to later workstream.

---

## Acceptance criteria

1. All phase-1 office/cloud tool IDs are present in registry with complete metadata contract.
2. Provider tools are not offered when provider is disconnected or required scopes are missing.
3. `doc_export_docx`, `sheet_export_xlsx`, and `slides_export_pptx` persist canonical artifacts in internal workspace.
4. Sharing flows (`create`, `accept`, `permission update`, `revoke`) preserve existing backend permission and license gates.
5. Super-admin Tool Registry tab loads global inventory/usage and supports Foundry approve/deny decisions.
6. Trust telemetry captures export/cloud/share actions with correlation, lineage, thread, org, and actor provenance.
7. Queue docs remain synchronized and `npm run docs:guard` passes.

---

## Out of scope (phase 1)

1. Full Tool Foundry lifecycle management UI (`register`, `publish`, `promote`, `deprecate`).
2. Alternative artifact storage backend outside `projectFiles`.
3. Provider parity beyond Google/Microsoft/Dropbox.
