# Office File Tool Suite Task Queue

**Last updated:** 2026-03-01  
**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/office-file-tool-suite`  
**Source request:** Deliver an Office-style tool suite (documents, sheets, slides, filesystem, sharing, cloud providers) plus a super-admin Tool Registry tab and global Tool Foundry review surface, grounded in current runtime contracts.

---

## Queue rules

1. Allowed statuses are only: `READY`, `IN_PROGRESS`, `PENDING`, `BLOCKED`, `DONE`.
2. Only one row may be `IN_PROGRESS` globally unless lane policy explicitly allows one active row per lane.
3. Promote `PENDING` -> `READY` only when dependency tokens are satisfied.
4. Deterministic pick order is `P0` before `P1`, then lowest row ID.
5. Runtime must fail closed for unknown capabilities and unauthorized mutating/external actions.
6. `convex/ai/tools/registry.ts` remains the authoritative runtime callable registry.
7. New provider/cloud operations must be gated by connection state, granted scopes, and policy before tools are offered.
8. No parallel artifact store in phase 1; generated artifacts persist through canonical `projectFiles` storage.
9. Every row must run listed `Verify` commands before moving to `DONE`.
10. Keep rows to 1-2 hour slices with deterministic scope and explicit files.
11. Sync `TASK_QUEUE.md`, `SESSION_PROMPTS.md`, `INDEX.md`, and `MASTER_PLAN.md` at lane milestones.
12. Record blockers in `Notes` and immediately continue with the next deterministic `READY` row.

---

## Dependency token rules

1. `ID`: dependency must be `DONE` before this row can move `PENDING` -> `READY`.
2. `ID@READY`: dependency must be `READY` or `DONE` before this row can move `PENDING` -> `READY`.
3. `ID@DONE_GATE`: row may move to `READY`/`IN_PROGRESS`, but cannot move to `DONE` until dependency is `DONE`.

---

## Verification profiles

| Profile | Command |
|---|---|
| `V-DOCS` | `npm run docs:guard` |
| `V-TYPE` | `npm run typecheck` |
| `V-LINT` | `npm run lint` |
| `V-UNIT-AI` | `npm run test:unit -- tests/unit/ai` |
| `V-UNIT-FILES` | `npm run test:unit -- tests/unit/project-file-system` |
| `V-UNIT-OAUTH` | `npm run test:unit -- tests/unit/oauth` |

---

## Execution lanes

| Lane | Purpose | Primary ownership | Merge-overlap policy |
|---|---|---|---|
| `A` | Contracts, taxonomy, and registry metadata baseline | `convex/ai/tools/registry.ts`; workstream docs | No runtime/provider implementation before lane `A` `P0` rows are `DONE` |
| `B` | Internal filesystem and sharing tool families | `convex/ai/tools/fileSystemTools.ts`; `convex/ai/tools/shareTools.ts` | Must reuse existing permission/license gates in `projectFileSystem` and `projectSharing` |
| `C` | Document/sheet/slides tool families + artifact exports | `convex/ai/tools/documentTools.ts`; `spreadsheetTools.ts`; `presentationTools.ts` | Deterministic schema-first operations; no partial mutating outcomes on export errors |
| `D` | Cloud provider clients and cloud_* operations | `convex/oauth/*`; `convex/ai/tools/cloudFileTools.ts` | Google + Microsoft first, Dropbox after parity |
| `E` | Runtime offering/gating and trust telemetry | `convex/ai/agentExecution.ts`; `convex/ai/toolScoping.ts`; `convex/ai/trustEvents.ts` | No provider tool exposure without connection + scope + policy readiness |
| `F` | Super-admin Tool Registry + global Foundry review surface | `convex/ai/tools/registry.ts`; `convex/ai/toolFoundry/proposalBacklog.ts`; super-admin UI | Phase 1 is read + decide only (no full lifecycle mutation UI) |
| `G` | End-to-end validation, rollout docs, closeout | tests + workstream docs | Close only after all `P0` rows are `DONE` or `BLOCKED` |

---

## Dependency-based status flow

1. Lane `A` (`OFS-001`..`OFS-003`) establishes contracts and connection-state truth before net-new tools.
2. Lanes `B`, `C`, and `D` start after `OFS-002` and can execute in parallel by lane.
3. Lane `E` starts after `OFS-004`, `OFS-006`, `OFS-007`, `OFS-008`, `OFS-009`, and `OFS-010`.
4. Lane `F` starts after `OFS-002` and `OFS-012`.
5. Lane `G` starts after `OFS-013` and `OFS-015`.

---

## Task queue

| ID | Lane | Plan | Priority | Status | Depends On | Task | Primary files | Verify | Notes |
|---|---|---:|---|---|---|---|---|---|---|
| `OFS-001` | `A` | 1 | `P0` | `DONE` | - | Create queue-first workstream scaffold and synchronize queue artifacts for office file suite scope | `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/office-file-tool-suite/TASK_QUEUE.md`; `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/office-file-tool-suite/SESSION_PROMPTS.md`; `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/office-file-tool-suite/INDEX.md`; `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/office-file-tool-suite/MASTER_PLAN.md` | `V-DOCS` | Completed 2026-03-01 in this run. |
| `OFS-002` | `A` | 1 | `P0` | `READY` | `OFS-001` | Extend `AITool` contract metadata (`operationClass`, `surfaces`, `artifactKindsIn/Out`, `approvalProfile`, `registryTags`) and enforce fail-closed validation for unknown classes/surfaces | `/Users/foundbrand_001/Development/vc83-com/convex/ai/tools/registry.ts`; `/Users/foundbrand_001/Development/vc83-com/tests/unit/ai/toolContracts.test.ts`; `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/office-file-tool-suite/MASTER_PLAN.md` | `V-TYPE`; `V-UNIT-AI`; `V-DOCS` | Current `AITool` has no metadata fields beyond `readOnly`; this row establishes canonical registry metadata contract. |
| `OFS-003` | `A` | 1 | `P0` | `PENDING` | `OFS-002` | Align integration-readiness source of truth for provider gating (oauthConnections + granted scopes) and remove any object-model drift assumptions | `/Users/foundbrand_001/Development/vc83-com/convex/ai/toolScoping.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/oauth/google.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/oauth/microsoft.ts`; tests | `V-TYPE`; `V-UNIT-AI`; `V-UNIT-OAUTH` | `toolScoping.getConnectedIntegrations` currently reads `objects` type `oauth_connection` while OAuth flows persist `oauthConnections` with `status: "active"`. |
| `OFS-004` | `B` | 2 | `P0` | `PENDING` | `OFS-002` | Implement `fs_*` and `share_*` tools over existing `projectFileSystem` and `projectSharing` contracts with no permission bypass | `/Users/foundbrand_001/Development/vc83-com/convex/ai/tools/fileSystemTools.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/ai/tools/shareTools.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/ai/tools/registry.ts` | `V-TYPE`; `V-UNIT-AI`; `V-UNIT-FILES` | Must preserve license gate and share-scope rules already enforced in backend modules. |
| `OFS-005` | `B` | 2 | `P1` | `PENDING` | `OFS-004` | Add `artifact_*` tools for canonical workspace persistence and provider-link mapping metadata | `/Users/foundbrand_001/Development/vc83-com/convex/ai/tools/fileSystemTools.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/ai/tools/registry.ts` | `V-TYPE`; `V-UNIT-AI`; `V-UNIT-FILES` | Canonical artifact storage remains `projectFiles` in phase 1. |
| `OFS-006` | `C` | 3 | `P0` | `PENDING` | `OFS-002` | Implement `doc_*` family with deterministic template application and `docx/pdf` export contracts | `/Users/foundbrand_001/Development/vc83-com/convex/ai/tools/documentTools.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/ai/tools/registry.ts`; tests | `V-TYPE`; `V-UNIT-AI` | Export failures must be deterministic and non-partial. |
| `OFS-007` | `C` | 3 | `P0` | `PENDING` | `OFS-002` | Implement `sheet_*` family with formula/range safety and `xlsx/csv` export contracts | `/Users/foundbrand_001/Development/vc83-com/convex/ai/tools/spreadsheetTools.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/ai/tools/registry.ts`; tests | `V-TYPE`; `V-UNIT-AI` | Include deterministic bounds validation before mutation. |
| `OFS-008` | `C` | 3 | `P0` | `PENDING` | `OFS-002` | Implement `slides_*` family with schema-validated slide model and `pptx/pdf` exports | `/Users/foundbrand_001/Development/vc83-com/convex/ai/tools/presentationTools.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/ai/tools/registry.ts`; tests | `V-TYPE`; `V-UNIT-AI` | Keep slide operations deterministic and schema-backed. |
| `OFS-009` | `D` | 4 | `P0` | `PENDING` | `OFS-002`, `OFS-003` | Implement Google Drive client + `cloud_*` Google operations using selected Drive scopes and explicit denied behavior when scopes are missing | `/Users/foundbrand_001/Development/vc83-com/convex/oauth/googleDriveClient.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/oauth/googleScopes.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/ai/tools/cloudFileTools.ts` | `V-TYPE`; `V-UNIT-AI`; `V-UNIT-OAUTH` | Existing `googleClient.ts` is calendar-only; Drive path must be additive and scope-gated. |
| `OFS-010` | `D` | 4 | `P0` | `PENDING` | `OFS-002`, `OFS-003` | Implement OneDrive/SharePoint client wrapper + Microsoft `cloud_*` operations and remove “coming soon” state in integrations UI once parity is proven | `/Users/foundbrand_001/Development/vc83-com/convex/oauth/oneDriveClient.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/oauth/graphClient.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/ai/tools/cloudFileTools.ts`; `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/integrations-window/microsoft-settings.tsx` | `V-TYPE`; `V-UNIT-AI`; `V-UNIT-OAUTH` | Existing Graph client has basic file endpoints marked future; this row operationalizes them in runtime tools. |
| `OFS-011` | `D` | 4 | `P1` | `PENDING` | `OFS-009`, `OFS-010` | Add Dropbox OAuth + client + `cloud_*` Dropbox operations after Google/Microsoft parity | `/Users/foundbrand_001/Development/vc83-com/convex/oauth/dropbox.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/oauth/dropboxClient.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/ai/tools/cloudFileTools.ts` | `V-TYPE`; `V-UNIT-AI`; `V-UNIT-OAUTH` | Explicitly sequenced after Google + Microsoft. |
| `OFS-012` | `E` | 5 | `P0` | `PENDING` | `OFS-004`, `OFS-006`, `OFS-007`, `OFS-008`, `OFS-009`, `OFS-010` | Enhance runtime/broker tool offering so provider tools are exposed only when connection + scope + policy preconditions are satisfied | `/Users/foundbrand_001/Development/vc83-com/convex/ai/agentExecution.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/ai/toolScoping.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/ai/toolBroker.ts`; tests | `V-TYPE`; `V-UNIT-AI` | Must remain fail-closed and deterministic for unready provider paths. |
| `OFS-013` | `E` | 5 | `P0` | `PENDING` | `OFS-012` | Add trust telemetry taxonomy/events for office export, cloud sync, and sharing actions with correlation/thread/lineage provenance | `/Users/foundbrand_001/Development/vc83-com/convex/ai/trustEvents.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/ai/agentToolOrchestration.ts`; tests | `V-TYPE`; `V-UNIT-AI` | Include machine-verifiable provenance fields and event contract tests. |
| `OFS-014` | `F` | 6 | `P0` | `PENDING` | `OFS-002`, `OFS-012` | Add super-admin query surface for global tool registry inventory/details/usage and global pending Foundry proposal review | `/Users/foundbrand_001/Development/vc83-com/convex/ai/tools/registry.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/ai/toolFoundry/proposalBacklog.ts`; tests | `V-TYPE`; `V-UNIT-AI` | Current proposal query is super-admin but org-scoped (`by_org_last_observed`); phase 1 needs global cross-org aggregation. |
| `OFS-015` | `F` | 6 | `P0` | `PENDING` | `OFS-014` | Build Organizations `Tool Registry` tab (inventory + usage + read/decide Foundry actions) and register it in super-admin window tabs | `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/super-admin-organizations-window/tool-registry-tab.tsx`; `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/super-admin-organizations-window/index.tsx`; `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/super-admin-organizations-window/agent-control-center-tab.tsx` | `V-TYPE`; `V-LINT`; `V-UNIT-AI` | Phase 1 is read + decide only; no full lifecycle register/publish/promote/deprecate UI. |
| `OFS-016` | `G` | 7 | `P0` | `PENDING` | `OFS-013`, `OFS-015` | End-to-end scenario validation: create doc/sheet/slides, manage folders, share across org, sync with cloud providers, and validate admin review traces | tests (unit/integration/e2e); docs evidence | `V-TYPE`; `V-UNIT-AI`; `V-UNIT-FILES`; `V-UNIT-OAUTH` | Must include denied-scope and disconnected-provider negative controls. |
| `OFS-017` | `G` | 7 | `P1` | `PENDING` | `OFS-016` | Docs closeout, rollout/rollback runbook, and synchronized queue artifacts | `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/office-file-tool-suite/TASK_QUEUE.md`; `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/office-file-tool-suite/INDEX.md`; `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/office-file-tool-suite/MASTER_PLAN.md`; `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/office-file-tool-suite/SESSION_PROMPTS.md` | `V-DOCS` | Final gate requires synchronized docs + explicit rollback path. |

---

## Current kickoff

- Active task: none.
- Next promotable task: `OFS-002`.
- Immediate objective: lock registry metadata contract + readiness source-of-truth alignment before adding office/cloud tool families.
