# Layered Context System Master Plan

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/layered-context-system`  
**Source brief date:** 2026-03-09  
**Planning mode:** Queue-first, contract-first, codebase-reality anchored

## Objective

Ship Layered Context so any saved Layers workflow can be selected as runtime context for Chat Window conversations, with optional Tier 2 enrichment via a dedicated `lc_ai_chat` canvas node.

Outcome goals:

1. Workflow-scoped conversations are first-class (`layerWorkflowId`-bound).
2. Chat runtime receives structured workflow context on every send.
3. AI actions in layered context route through existing approval + execution rails.
4. UI exposes context selection, context status, and context-scoped history clearly.

## Current reality in this codebase

### Chat runtime and persistence

1. `aiConversations` currently has no `layerWorkflowId` field or workflow index.
2. `createConversation` currently accepts only `organizationId`, `userId`, and optional `title`.
3. `useAIChat` send path does not accept or forward `layerWorkflowId` today.
4. `AIChatContext` has no active workflow context state or storage key.
5. Runtime flow today is `ai.chat.sendMessage` -> `ai.agentExecution.processInboundMessage` with metadata handoff.
6. The non-page-builder fallback in `ai.chat.sendMessage` is effectively deprecated; layered prompt injection should be in agent runtime system-message assembly.

### Layers runtime and canvas

1. Node registry has `lc_ai_agent` (prompt/model stub), no `lc_ai_chat` context-injector semantics.
2. `NodeDefinition` type has no `singleton` field.
3. Frontend `use-layers-store` has no singleton/placement validation in `addNode`/duplication/import.
4. Backend `saveWorkflow` currently does not enforce singleton constraints.
5. Tool chest cannot disable already-placed singleton nodes.
6. `LcNativeNode` has no specialized rendering branch for a context node.

### Existing assets we should reuse

1. `listWorkflows` already returns counts/status metadata useful for context cards.
2. Layers execution tables/logger already exist for run history and node status.
3. Tool approval pipeline and `ToolExecutionPanel` already exist in chat; layered actions should integrate into this rail.
4. `layersBuilderSystem` prompt already builds node catalog from registry, so new node support can piggyback there.

## Gap statement

To realize the PRD, we must close these explicit gaps:

1. No conversation/workflow binding field or index.
2. No dedicated context node contract with singleton guard.
3. No context switcher browser in chat shell and no active context badge/tagging.
4. No backend `LayeredContextBundle` assembly query.
5. No runtime prompt layer that consistently injects workflow context on every turn.
6. No dedicated action execution entrypoint constrained to AI chat node outputs.
7. No integration tests for context switching and action approval loop.

## Target state

### Tier model

1. Tier 1 (auto): any selected/saved workflow contributes structural and recent execution context (advisory behavior).
2. Tier 2 (enriched): when `lc_ai_chat` exists, runtime additionally receives AI identity config, scoped input/output node surfaces, and action approval policy.

### Conversation scoping

1. Selecting a layered context always creates a new conversation bound to `layerWorkflowId`.
2. Existing conversations remain in history with workflow tag metadata.
3. Header always reflects active context when present.

### Runtime injection and action path

1. `layerWorkflowId` travels with send payload metadata.
2. Agent runtime fetches bundle and appends layered context system message(s) before LLM turn.
3. Proposed actions are explicit and approval-gated.
4. Approved actions execute via Layers runtime + logger and post result back to chat.

## Lane plan

| Lane | Scope | Queue IDs |
|---|---|---|
| `A` | Core schema/type contracts | `LCS-A-001`..`LCS-A-003` |
| `B` | Canvas node contract + singleton enforcement | `LCS-B-001`..`LCS-B-006` |
| `C` | Chat context switch UX and state plumbing | `LCS-C-001`..`LCS-C-003` |
| `D` | Context bundle APIs + runtime prompt injection | `LCS-D-001`..`LCS-D-004` |
| `E` | Layered action execution + approval rail integration | `LCS-E-001`..`LCS-E-002` |
| `F` | Integration coverage + closeout | `LCS-F-001`..`LCS-F-002` |

## Implementation chunks

### Chunk 1: Contracts first (`A`)

1. Add `layerWorkflowId` + `by_workflow` index in conversation schema.
2. Wire conversation mutations/queries for workflow binding.
3. Add `singleton` and `LayeredContextBundle` type contract.

### Chunk 2: Node semantics + enforcement (`B`)

1. Register `lc_ai_chat` contract.
2. Enforce singleton in frontend and backend.
3. Update tool chest and node visuals.
4. Teach Layers AI builder to honor singleton.

### Chunk 3: Context UX (`C`)

1. Add context state in `AIChatContext` + localStorage.
2. Add Layered Context panel and plus-button branching.
3. Show active-context badge and history workflow tags.

### Chunk 4: Runtime context bundle (`D`)

1. Add context switcher query and context bundle query.
2. Add layered prompt builder module.
3. Pass workflow id through send flow and inject context in `agentExecution` system message assembly.

### Chunk 5: Action rail (`E`)

1. Add `executeLayeredContextAction` with route validation and execution logging.
2. Hook layered action proposals into existing chat approval pipeline and result surfacing.

### Chunk 6: Validation + closeout (`F`)

1. Add integration tests for Tier 1 + Tier 2 runtime behavior.
2. Verify context switch creates new workflow-bound conversations.
3. Verify approval -> execution -> chat result loop.
4. Close queue docs with evidence.

## Risks and mitigations

1. **Risk:** Injecting context in deprecated prompt path instead of live runtime path.  
   **Mitigation:** Gate implementation on `LCS-D-004` using `agentExecution` system-message assembly.

2. **Risk:** UI allows impossible state (multiple AI chat nodes).  
   **Mitigation:** Enforce singleton in frontend, import/duplicate flows, and backend save validation.

3. **Risk:** Action execution bypasses existing approval controls.  
   **Mitigation:** Reuse existing `pending_approval` and ToolExecutionPanel rail; fail closed on missing approval.

4. **Risk:** Context bundle overfetch inflates prompt and latency.  
   **Mitigation:** Add dedicated lightweight context switcher query and bounded bundle payload (recent executions only).

5. **Risk:** Regression in generic chat behavior.  
   **Mitigation:** Keep `layerWorkflowId` optional and preserve existing generic conversation paths.

## Validation strategy

Required gates:

1. `npm run docs:guard`
2. `npm run typecheck`
3. `npx tsc -p convex/tsconfig.json --noEmit`

Targeted tests:

1. Schema + scoping tests for conversation/workflow binding.
2. Singleton tests for canvas placement, duplication, import, and save.
3. Bundle assembly and prompt formatting unit tests.
4. Integration tests for context switching and action approvals.

## Progress log

1. `2026-03-09`: `LCS-A-001` `DONE`.
2. Landed schema contract in `convex/schemas/aiSchemas.ts`:
   - Added `layerWorkflowId: v.optional(v.id("objects"))` to `aiConversations`.
   - Added `.index("by_workflow", ["layerWorkflowId"])`.
3. Verification evidence:
   - `npm run typecheck` -> `EXIT_CODE=0`
   - `npx tsc -p convex/tsconfig.json --noEmit` -> `EXIT_CODE=0`
   - `npm run docs:guard` -> `Docs guard passed.`
4. `2026-03-09`: `LCS-A-002` implementation landed but status is `BLOCKED` by unrelated baseline failures in required verify command expansion (`npm run test:unit -- tests/unit/ai/layeredContextConversationSchema.test.ts` executes full `tests/unit` and fails outside Layered Context scope).
5. `2026-03-09`: `LCS-A-003` `DONE` with layer-node/type contracts (`NodeDefinition.singleton`, `LayeredContextBundle` Tier 1/Tier 2 payload types).
6. `2026-03-09`: `LCS-B-001` `DONE` with `lc_ai_chat` node contract in registry plus legacy `lc_ai_agent` compatibility alias map.
7. `2026-03-09`: `LCS-A-002` blocker cleared and row moved to `DONE` after full verify re-run.
8. `2026-03-09`: `LCS-B-002` `DONE` with frontend singleton enforcement for placement/import/duplicate and singleton unit coverage.
9. `2026-03-09`: `LCS-B-004` `DONE` with backend singleton validation in `saveWorkflow` and structured `ConvexError` payloads.
10. `2026-03-09`: `LCS-C-001` `DONE` with persisted `activeLayerWorkflowId` state and workflow-scoped conversation creation defaulting.
11. `2026-03-09`: `LCS-D-001` `DONE` with `listWorkflowsForContextSwitcher` and by-workflow active conversation count aggregation.
12. `2026-03-09`: `LCS-C-002` `DONE` with `layered-context-panel.tsx` searchable workflow browser, header Layers entrypoint wiring, and deterministic context switching that always creates a new `layerWorkflowId`-scoped conversation.
13. `2026-03-09`: `LCS-D-002` `DONE` with `getLayeredContextBundle` Tier 1/Tier 2 assembly, including resilient malformed-payload handling, bounded recent execution summaries, and AI-chat node input/output surface extraction.
14. `2026-03-09`: `LCS-D-002` re-verified against required row commands. Evidence: `npm run typecheck` -> `EXIT_CODE=0`; `npx tsc -p convex/tsconfig.json --noEmit` -> `EXIT_CODE=0`; `npm run test:unit -- tests/unit/layers/layeredContextBundle.test.ts` -> `EXIT_CODE=0` (runner executes `tests/unit` + target file); `npm run docs:guard` -> `Docs guard passed.`
15. `2026-03-09`: `LCS-D-003` `DONE` with new `convex/ai/prompts/layeredContextSystem.ts` prompt formatter (`buildLayeredContextSystemPrompt`) covering Tier 1/Tier 2 instructions plus explicit layered action proposal JSON contract and approval requirements. Added `tests/unit/ai/layeredContextPromptBuilder.test.ts` for deterministic output and missing-data behavior. Verification evidence: `npm run typecheck` -> `EXIT_CODE=0`; `npm run test:unit -- tests/unit/ai/layeredContextPromptBuilder.test.ts` -> `EXIT_CODE=0`; `npm run docs:guard` -> `Docs guard passed.`
16. `2026-03-09`: `LCS-D-004` `DONE` with end-to-end `layerWorkflowId` propagation (`slick-chat-input`/`use-ai-chat` -> `ai.chat.sendMessage` -> inbound runtime metadata) and runtime layered-context injection in `ai.agentExecution.processInboundMessage` via `getLayeredContextBundle` + `buildLayeredContextSystemPrompt` system-message assembly. Verification evidence: `npm run typecheck` -> `EXIT_CODE=0`; `npx tsc -p convex/tsconfig.json --noEmit` -> `EXIT_CODE=0`; `npm run test:unit -- tests/unit/ai/layeredContextChatScoping.test.ts tests/unit/ai/layeredContextPromptBuilder.test.ts` -> `EXIT_CODE=0`; `npm run docs:guard` -> `Docs guard passed.`
17. `2026-03-09`: `LCS-E-001` `DONE` with new `convex/layers/layeredContextActions.ts` action (`executeLayeredContextAction`) that fail-closes invalid routes and missing context using deterministic structured `ConvexError` codes, requires target reachability downstream from `lc_ai_chat`, and executes via existing graph semantics (`buildDAG`/`topologicalSort`/`resolveInputData`/`evaluateExpression` + exported `executeWorkflowNode`) with execution/node logs written by existing `executionLogger` mutations. Added internal workflow-graph helper query in `layerWorkflowOntology` and unit contract coverage (`tests/unit/layers/layeredContextActionExecution.test.ts`). Verification evidence: `npm run typecheck` -> `EXIT_CODE=0`; `npx tsc -p convex/tsconfig.json --noEmit` -> `EXIT_CODE=0`; `npm run test:unit -- tests/unit/layers/layeredContextActionExecution.test.ts` -> `EXIT_CODE=0`; `npm run docs:guard` -> `Docs guard passed.`
18. `2026-03-09`: `LCS-B-003` `DONE` with singleton-awareness in `ToolChest`: `LayersCanvas` now passes current `placedNodeTypes`, singleton entries already present on canvas become non-draggable with explicit "only one allowed" tooltip + `placed` affordance, and `aria-disabled` accessibility state. Added singleton unit contract assertions for tool-chest disable behavior. Verification evidence: `npm run typecheck` -> `EXIT_CODE=0`; `npm run test:unit -- tests/unit/layers/lcAiChatSingleton.test.ts` -> `EXIT_CODE=0`; `npm run docs:guard` -> `Docs guard passed.`

## Exit criteria

1. All `P0` rows in `TASK_QUEUE.md` are `DONE` or explicitly `BLOCKED` with rationale.
2. Chat supports selecting a workflow context and visibly tags scoped conversations.
3. Runtime responses reference workflow context when bound, with Tier 2 behavior when `lc_ai_chat` exists.
4. Layered actions require explicit approval and execute through existing runtime rails with logged outcomes.
5. Docs artifacts (`INDEX`, `MASTER_PLAN`, `TASK_QUEUE`, `SESSION_PROMPTS`) are synchronized and `docs:guard` passes.
