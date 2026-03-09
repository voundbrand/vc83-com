# Layered Context System Index

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/layered-context-system`  
**Source brief:** 2026-03-09 Layered Context PRD  
**Execution mode:** Deterministic queue-first implementation

## Canonical files

- Queue: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/layered-context-system/TASK_QUEUE.md`
- Session prompts: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/layered-context-system/SESSION_PROMPTS.md`
- Master plan: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/layered-context-system/MASTER_PLAN.md`

## Scope summary

Included:

- Conversation/workflow binding via `layerWorkflowId`.
- Dedicated `lc_ai_chat` node contract with singleton enforcement.
- Chat context switcher panel and active context UX.
- Runtime layered context bundle assembly and prompt injection.
- Layered action execution integrated with existing approval rails.
- Unit/integration verification and queue closeout.

Excluded:

- Unrelated chat shell redesign.
- Non-layered workflow execution refactors.
- Migration/cutover choreography beyond contract-safe additive changes.

## Current queue snapshot

| Lane | Queue IDs | Status snapshot |
|---|---|---|
| `A` | `LCS-A-001`..`LCS-A-003` | `DONE`, `DONE`, `DONE` |
| `B` | `LCS-B-001`..`LCS-B-006` | `DONE`, `DONE`, `DONE`, `DONE`, `PENDING`, `PENDING` |
| `C` | `LCS-C-001`..`LCS-C-003` | `DONE`, `DONE`, `PENDING` |
| `D` | `LCS-D-001`..`LCS-D-004` | `DONE`, `DONE`, `DONE`, `DONE` |
| `E` | `LCS-E-001`..`LCS-E-002` | `DONE`, `PENDING` |
| `F` | `LCS-F-001`..`LCS-F-002` | `PENDING` x2 |

## READY-first execution list

1. (none)

## Latest evidence

- `LCS-A-001` completed on 2026-03-09.
- Schema contract landed: `aiConversations.layerWorkflowId` + `aiConversations.by_workflow`.
- Verify evidence: `npm run typecheck` (EXIT_CODE=0), `npx tsc -p convex/tsconfig.json --noEmit` (EXIT_CODE=0), `npm run docs:guard` ("Docs guard passed.").
- `LCS-A-002` blocker resolved and row moved to `DONE` after verify re-run.
- `LCS-A-003` completed on 2026-03-09 with `NodeDefinition.singleton` + `LayeredContextBundle` Tier 1/Tier 2 contracts.
- `LCS-B-001` completed on 2026-03-09 with `lc_ai_chat` registry contract + legacy `lc_ai_agent` compatibility aliasing.
- `LCS-B-002` completed on 2026-03-09 with singleton enforcement in add/import/duplicate flows and passing singleton unit contract test.
- `LCS-B-003` completed on 2026-03-09 with tool-chest singleton disable affordances: already-placed singleton nodes are now non-draggable with explicit tooltip and `placed` badge state, reducing failed drag attempts.
- `LCS-B-004` completed on 2026-03-09 with backend singleton validation and structured `LAYER_SINGLETON_VIOLATION` errors.
- `LCS-C-001` completed on 2026-03-09 with persisted `activeLayerWorkflowId` chat context scoping.
- `LCS-D-001` completed on 2026-03-09 with context switcher workflow-card query + by-workflow active conversation aggregation.
- `LCS-C-002` completed on 2026-03-09 with searchable layered-context browser panel, header entrypoint wiring, and enforced context switch behavior that always creates a new workflow-scoped conversation.
- `LCS-D-002` completed on 2026-03-09 with `getLayeredContextBundle` Tier 1/Tier 2 assembly query (workflow summary, recent executions, optional AI chat node context + connected surfaces).
- `LCS-D-002` re-verified on 2026-03-09 with required row checks passing: `npm run typecheck` (EXIT_CODE=0), `npx tsc -p convex/tsconfig.json --noEmit` (EXIT_CODE=0), `npm run test:unit -- tests/unit/layers/layeredContextBundle.test.ts` (EXIT_CODE=0), `npm run docs:guard` (Docs guard passed.).
- `LCS-D-003` completed on 2026-03-09 with layered-context prompt builder module + unit tests (`buildLayeredContextSystemPrompt`), including explicit action proposal contract and approval requirements.
- `LCS-D-004` completed on 2026-03-09 with end-to-end `layerWorkflowId` send-path propagation and runtime layered-context system-message injection (`getLayeredContextBundle` + `buildLayeredContextSystemPrompt`).
- `LCS-E-001` completed on 2026-03-09 with strict `executeLayeredContextAction` route validation (downstream from `lc_ai_chat` only), fail-closed structured errors for invalid/missing context, and execution/node logging through the existing graph runtime + `executionLogger` stack. Verification evidence: `npm run typecheck` (EXIT_CODE=0), `npx tsc -p convex/tsconfig.json --noEmit` (EXIT_CODE=0), `npm run test:unit -- tests/unit/layers/layeredContextActionExecution.test.ts` (EXIT_CODE=0), `npm run docs:guard` (Docs guard passed.).

## Milestone checks

| Milestone | Completion rule |
|---|---|
| `M1 Contracts` | `LCS-A-001`..`LCS-A-003` are `DONE` |
| `M2 Node Runtime` | `LCS-B-001`, `LCS-B-002`, `LCS-B-004` are `DONE` |
| `M3 Context UX` | `LCS-C-001` and `LCS-C-002` are `DONE` |
| `M4 Prompt Injection` | `LCS-D-001`..`LCS-D-004` are `DONE` |
| `M5 Action Rail` | `LCS-E-001` and `LCS-E-002` are `DONE` |
| `M6 Validation + Closeout` | `LCS-F-001` and `LCS-F-002` are `DONE` |

## Required gates

1. `npm run docs:guard`
2. `npm run typecheck`
3. `npx tsc -p convex/tsconfig.json --noEmit`
