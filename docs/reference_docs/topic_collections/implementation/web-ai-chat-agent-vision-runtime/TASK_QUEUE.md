# Web AI Chat Agent Vision Runtime Task Queue

**Last updated:** 2026-03-09  
**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/web-ai-chat-agent-vision-runtime`  
**Source brief:** Enable web AI chat agent "seeing while talking" with phase-gated rollout (`fast path` -> `robust path` -> `VisionClaw parity`).

## Queue rules

1. Allowed statuses are only: `READY`, `IN_PROGRESS`, `PENDING`, `BLOCKED`, `DONE`.
2. Deterministic row schema is mandatory: `ID | Lane | Plan | Priority | Status | Depends On | Task | Primary files | Verify | Notes`.
3. Only one row may be `IN_PROGRESS` globally.
4. Deterministic execution order is `P0`, then `P1`, then lexical `ID`.
5. Rows may move `PENDING` -> `READY` only when all `Depends On` rows are `DONE`.
6. Lane gating is strict: lane `B` starts only after lane `A` closeout; lane `C` starts only after lane `B` closeout.
7. Every `DONE` row must execute all listed `Verify` commands.
8. Keep `INDEX.md`, `MASTER_PLAN.md`, `TASK_QUEUE.md`, and `SESSION_PROMPTS.md` synchronized at each milestone.

## Verification profiles

| Profile | Command |
|---|---|
| `V-DOCS` | `npm run docs:guard` |
| `V-TYPE` | `npm run typecheck` |
| `V-UNIT-FAST` | `npm run test:unit -- tests/unit/ai/webChatVisionFastPath.test.ts` |
| `V-INTEG-FAST` | `npm run test -- tests/integration/ai/webChatVisionTurnAttach.integration.test.ts` |
| `V-INTEG-AUTH` | `npm run test -- tests/integration/ai/webChatVisionAuthorization.integration.test.ts` |
| `V-INTEG-RETENTION` | `npm run test -- tests/integration/ai/operatorMediaRetentionIngest.integration.test.ts tests/integration/ai/operatorMediaRetentionAuthorization.integration.test.ts` |
| `V-E2E-DESKTOP` | `npm run test:e2e:desktop` |

## Execution lanes

| Lane | Phase | Purpose | Primary ownership | Concurrency gate |
|---|---|---|---|---|
| `A` | Fast Path | Auto-attach freshest live frame to each voice turn | `convex/ai/voiceRuntime.ts`, `convex/ai/agentExecution.ts`, `src/components/window-content/ai-chat-window/slick-pane/slick-chat-input.tsx` | Starts immediately |
| `B` | Robust Path | Freshness buffer, retention policy enforcement, auth isolation, telemetry | `convex/ai/mediaRetention.ts`, `convex/ai/voiceRuntime.ts`, `convex/api/v1/aiChat.ts`, targeted tests | Starts only after all lane `A` rows are `DONE` |
| `C` | VisionClaw Parity | Persistent native realtime multimodal session architecture | `src/hooks/use-voice-runtime.ts`, `convex/ai/voiceRuntime.ts`, `convex/ai/voiceRuntimeAdapter.ts`, parity tests/docs | Starts only after all lane `B` rows are `DONE` |

## Dependency-based status flow

1. Start lane `A` with `WCV-001`.
2. Lane `A` closes when `WCV-004` is `DONE`.
3. Lane `B` starts with `WCV-101` only after lane `A` closeout.
4. Lane `B` closes when `WCV-104` is `DONE`.
5. Lane `C` starts with `WCV-201` only after lane `B` closeout.
6. Lane `C` closes when `WCV-204` is `DONE`.

## Task queue

| ID | Lane | Plan | Priority | Status | Depends On | Task | Primary files | Verify | Notes |
|---|---|---|---|---|---|---|---|---|---|
| `WCV-001` | `A` | `MP §Three-phase plan / Phase 1` | `P0` | `READY` | `-` | Freeze fast-path contract for per-turn freshest-frame selection and deterministic degrade reasons (`vision_frame_missing`, `vision_frame_stale`, `vision_policy_blocked`). | `docs/reference_docs/topic_collections/implementation/web-ai-chat-agent-vision-runtime/MASTER_PLAN.md`; `docs/reference_docs/topic_collections/implementation/web-ai-chat-agent-vision-runtime/TASK_QUEUE.md` | `V-DOCS` | Contract-first row; no runtime behavior changes. |
| `WCV-002` | `A` | `MP §Three-phase plan / Phase 1` | `P0` | `PENDING` | `WCV-001` | Implement backend freshest-frame resolver scoped to org/session/conversation with strict freshness window enforcement. | `convex/ai/voiceRuntime.ts`; `convex/ai/mediaRetention.ts`; `convex/api/v1/aiChat.ts` | `V-TYPE`; `V-UNIT-FAST`; `V-DOCS` | Keep fallback voice-only behavior explicit. |
| `WCV-003` | `A` | `MP §Three-phase plan / Phase 1` | `P0` | `PENDING` | `WCV-002` | Inject resolved freshest frame into voice turn send path so model input includes image context automatically when available. | `convex/ai/agentExecution.ts`; `convex/ai/chatRuntimeOrchestration.ts`; `src/components/window-content/ai-chat-window/slick-pane/slick-chat-input.tsx` | `V-TYPE`; `V-INTEG-FAST`; `V-DOCS` | Must preserve current transcript/turn ordering semantics. |
| `WCV-004` | `A` | `MP §Three-phase plan / Phase 1` | `P1` | `PENDING` | `WCV-003` | Add fast-path test coverage and docs evidence for attach/miss behavior and no-regression voice path. | `tests/unit/ai/webChatVisionFastPath.test.ts`; `tests/integration/ai/webChatVisionTurnAttach.integration.test.ts`; `docs/reference_docs/topic_collections/implementation/web-ai-chat-agent-vision-runtime/INDEX.md` | `V-TYPE`; `V-UNIT-FAST`; `V-INTEG-FAST`; `V-DOCS` | Lane `A` closeout row. |
| `WCV-101` | `B` | `MP §Three-phase plan / Phase 2` | `P0` | `PENDING` | `WCV-004` | Add robust rolling frame buffer contract (ordering, idempotency, freshness TTL windows) for model-turn attachment selection. | `convex/ai/voiceRuntime.ts`; `convex/schemas/aiSchemas.ts`; `convex/schema.ts` | `V-TYPE`; `V-DOCS` | Keep metadata compatibility with existing retention schema. |
| `WCV-102` | `B` | `MP §Three-phase plan / Phase 2` | `P0` | `PENDING` | `WCV-101` | Enforce retention-policy mode and auth isolation in attachment flow (`off`, `metadata_only`, `full`) with fail-closed behavior. | `convex/ai/mediaRetention.ts`; `convex/ai/voiceRuntime.ts`; `convex/api/v1/aiChat.ts` | `V-TYPE`; `V-INTEG-AUTH`; `V-INTEG-RETENTION`; `V-DOCS` | Must prevent cross-org/session frame usage. |
| `WCV-103` | `B` | `MP §Three-phase plan / Phase 2` | `P1` | `PENDING` | `WCV-102` | Add observability taxonomy and counters for attach/miss/drop reasons and freshness distribution. | `convex/ai/trustTelemetry.ts`; `convex/ai/voiceRuntime.ts`; `docs/platform/OPERATOR_MOBILE_MEDIA_RETENTION.md` | `V-TYPE`; `V-DOCS` | Include runtime reason-code mapping in docs. |
| `WCV-104` | `B` | `MP §Three-phase plan / Phase 2` | `P1` | `PENDING` | `WCV-103` | Execute robust-path validation matrix (policy/auth/freshness) and publish evidence in workstream docs. | `tests/integration/ai/webChatVisionAuthorization.integration.test.ts`; `tests/integration/ai/webChatVisionTurnAttach.integration.test.ts`; `docs/reference_docs/topic_collections/implementation/web-ai-chat-agent-vision-runtime/INDEX.md` | `V-TYPE`; `V-INTEG-AUTH`; `V-INTEG-FAST`; `V-DOCS` | Lane `B` closeout row. |
| `WCV-201` | `C` | `MP §Three-phase plan / Phase 3` | `P0` | `PENDING` | `WCV-104` | Freeze persistent realtime multimodal session contract and migration guardrails from turn-stitch runtime. | `docs/reference_docs/topic_collections/implementation/web-ai-chat-agent-vision-runtime/MASTER_PLAN.md`; `docs/reference_docs/topic_collections/implementation/web-ai-chat-agent-vision-runtime/TASK_QUEUE.md` | `V-DOCS` | Contract must preserve fallback compatibility. |
| `WCV-202` | `C` | `MP §Three-phase plan / Phase 3` | `P0` | `PENDING` | `WCV-201` | Implement provider adapter and backend session lifecycle for native realtime multimodal audio+video streaming. | `convex/ai/voiceRuntime.ts`; `convex/ai/voiceRuntimeAdapter.ts`; `convex/api/v1/aiChat.ts` | `V-TYPE`; `V-DOCS` | Keep explicit feature flag for staged rollout. |
| `WCV-203` | `C` | `MP §Three-phase plan / Phase 3` | `P0` | `PENDING` | `WCV-202` | Migrate web chat runtime orchestration to persistent session path with deterministic fallback to current turn-stitch mode. | `src/hooks/use-voice-runtime.ts`; `src/components/window-content/ai-chat-window/slick-pane/slick-chat-input.tsx`; `convex/ai/chatRuntimeOrchestration.ts` | `V-TYPE`; `V-E2E-DESKTOP`; `V-DOCS` | Preserve interruption and transcript continuity contracts. |
| `WCV-204` | `C` | `MP §Three-phase plan / Phase 3` | `P1` | `PENDING` | `WCV-203` | Run parity matrix against local VisionClaw/agents references, capture canary go/no-go evidence, and sync queue docs. | `docs/reference_docs/topic_collections/implementation/web-ai-chat-agent-vision-runtime/INDEX.md`; `docs/reference_docs/topic_collections/implementation/web-ai-chat-agent-vision-runtime/MASTER_PLAN.md`; `docs/reference_docs/topic_collections/implementation/web-ai-chat-agent-vision-runtime/SESSION_PROMPTS.md` | `V-TYPE`; `V-E2E-DESKTOP`; `V-DOCS` | Lane `C` closeout row. |

## Current READY-first set

1. `WCV-001`
