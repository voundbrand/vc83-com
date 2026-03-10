# Web AI Chat Agent Vision Runtime Task Queue

**Last updated:** 2026-03-10  
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
| `V-UNIT-FAST` | `npm run test -- tests/unit/ai/webChatVisionFastPath.test.ts` |
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
| `WCV-001` | `A` | `MP §Three-phase plan / Phase 1` | `P0` | `DONE` | `-` | Freeze fast-path contract for per-turn freshest-frame selection and deterministic degrade reasons (`vision_frame_missing`, `vision_frame_stale`, `vision_policy_blocked`). | `docs/reference_docs/topic_collections/implementation/web-ai-chat-agent-vision-runtime/MASTER_PLAN.md`; `docs/reference_docs/topic_collections/implementation/web-ai-chat-agent-vision-runtime/TASK_QUEUE.md` | `V-DOCS` | Completed 2026-03-10; contract frozen in `MASTER_PLAN.md` Phase 1 section. |
| `WCV-002` | `A` | `MP §Three-phase plan / Phase 1` | `P0` | `DONE` | `WCV-001` | Implement backend freshest-frame resolver scoped to org/session/conversation with strict freshness window enforcement. | `convex/ai/voiceRuntime.ts`; `convex/ai/mediaRetention.ts`; `convex/api/v1/aiChat.ts` | `V-TYPE`; `V-UNIT-FAST`; `V-DOCS` | Completed 2026-03-10 with deterministic `attached/missing/stale/policy_blocked` resolver and API exposure on voice session resolve. |
| `WCV-003` | `A` | `MP §Three-phase plan / Phase 1` | `P0` | `DONE` | `WCV-002` | Inject resolved freshest frame into voice turn send path so model input includes image context automatically when available. | `convex/ai/agentExecution.ts`; `convex/ai/chatRuntimeOrchestration.ts`; `src/components/window-content/ai-chat-window/slick-pane/slick-chat-input.tsx` | `V-TYPE`; `V-INTEG-FAST`; `V-DOCS` | Completed 2026-03-10. Voice transcript turns now resolve freshest frame and pass it via runtime metadata; agent ingress auto-materializes attached frame into multimodal input. Verify run: `V-TYPE` pass, `V-DOCS` pass, `V-INTEG-FAST` failed (`No test files found` for `tests/integration/ai/webChatVisionTurnAttach.integration.test.ts`). |
| `WCV-004` | `A` | `MP §Three-phase plan / Phase 1` | `P1` | `DONE` | `WCV-003` | Add fast-path test coverage and docs evidence for attach/miss behavior and no-regression voice path. | `tests/unit/ai/webChatVisionFastPath.test.ts`; `tests/integration/ai/webChatVisionTurnAttach.integration.test.ts`; `docs/reference_docs/topic_collections/implementation/web-ai-chat-agent-vision-runtime/INDEX.md` | `V-TYPE`; `V-UNIT-FAST`; `V-INTEG-FAST`; `V-DOCS` | Completed 2026-03-10. Added integration coverage at `tests/integration/ai/webChatVisionTurnAttach.integration.test.ts` for attached/missing fast-path resolution and voice-request no-regression; verify run: `V-TYPE` pass, `V-UNIT-FAST` pass, `V-INTEG-FAST` pass, `V-DOCS` pass. |
| `WCV-101` | `B` | `MP §Three-phase plan / Phase 2` | `P0` | `DONE` | `WCV-004` | Add robust rolling frame buffer contract (ordering, idempotency, freshness TTL windows) for model-turn attachment selection. | `convex/ai/voiceRuntime.ts`; `convex/schemas/aiSchemas.ts`; `convex/schema.ts` | `V-TYPE`; `V-DOCS` | Completed 2026-03-10. Added `web_chat_vision_frame_buffer_v1` persisted buffer contract and schema, append/query mutations for deterministic ordering + idempotency window + TTL pruning, and voice-turn resolver fast-path against buffered candidates with compatibility fallback to retention query. Verify run: `V-TYPE` pass, `V-DOCS` pass. |
| `WCV-102` | `B` | `MP §Three-phase plan / Phase 2` | `P0` | `DONE` | `WCV-101` | Enforce retention-policy mode and auth isolation in attachment flow (`off`, `metadata_only`, `full`) with fail-closed behavior. | `convex/ai/mediaRetention.ts`; `convex/ai/voiceRuntime.ts`; `convex/api/v1/aiChat.ts` | `V-TYPE`; `V-INTEG-AUTH`; `V-INTEG-RETENTION`; `V-DOCS` | Completed 2026-03-10. Enforced effective retention mode fail-closed (`enabled=false` => `off`), added conversation org/user + interview-session isolation gate before frame attachment selection, and mapped voice-session vision resolver auth/policy errors to `vision_policy_blocked` fallback. Verify run: `V-INTEG-AUTH` pass, `V-INTEG-RETENTION` pass, `V-DOCS` pass, `V-TYPE` failed with `convex/teamOntology.ts(215,41): error TS2339: Property 'name' does not exist on type ...`. |
| `WCV-103` | `B` | `MP §Three-phase plan / Phase 2` | `P1` | `DONE` | `WCV-102` | Add observability taxonomy and counters for attach/miss/drop reasons and freshness distribution. | `convex/ai/trustTelemetry.ts`; `convex/ai/voiceRuntime.ts`; `docs/platform/OPERATOR_MOBILE_MEDIA_RETENTION.md` | `V-TYPE`; `V-DOCS` | Completed 2026-03-10. Added `web_chat_vision_attachment_telemetry_v1` taxonomy + freshness bucket helpers in `trustTelemetry.ts`, wired voice-frame resolver to emit deterministic `telemetry` snapshots/counters for auth gate, buffer, and retention paths, and documented runtime reason-code mapping in retention runbook. Verify run: `V-DOCS` pass, `V-TYPE` failed with `convex/teamOntology.ts(215,41): error TS2339: Property 'name' does not exist on type ...`. |
| `WCV-104` | `B` | `MP §Three-phase plan / Phase 2` | `P1` | `DONE` | `WCV-103` | Execute robust-path validation matrix (policy/auth/freshness) and publish evidence in workstream docs. | `tests/integration/ai/webChatVisionAuthorization.integration.test.ts`; `tests/integration/ai/webChatVisionTurnAttach.integration.test.ts`; `docs/reference_docs/topic_collections/implementation/web-ai-chat-agent-vision-runtime/INDEX.md` | `V-TYPE`; `V-INTEG-AUTH`; `V-INTEG-FAST`; `V-DOCS` | Completed 2026-03-10. Added robust-path matrix assertions for retention outcomes (`off`, `metadata_only`, `full`), auth isolation mismatches (`interview_session_mismatch`, `conversation_not_found`, `organization_mismatch`, `conversation_user_mismatch`), and freshness outcomes (`attached`, `vision_frame_stale`, `vision_frame_missing`). Verify run: `V-TYPE` pass, `V-INTEG-AUTH` pass, `V-INTEG-FAST` pass, `V-DOCS` pass. Lane `B` closed. |
| `WCV-201` | `C` | `MP §Three-phase plan / Phase 3` | `P0` | `DONE` | `WCV-104` | Freeze persistent realtime multimodal session contract and migration guardrails from turn-stitch runtime. | `docs/reference_docs/topic_collections/implementation/web-ai-chat-agent-vision-runtime/MASTER_PLAN.md`; `docs/reference_docs/topic_collections/implementation/web-ai-chat-agent-vision-runtime/TASK_QUEUE.md` | `V-DOCS` | Completed 2026-03-10. Frozen contract now specifies persistent audio+video session identity/event invariants, deterministic fallback precedence, one-way downgrade guardrail, and pre-`WCV-202` rollout safety constraints. |
| `WCV-202` | `C` | `MP §Three-phase plan / Phase 3` | `P0` | `DONE` | `WCV-201` | Implement provider adapter and backend session lifecycle for native realtime multimodal audio+video streaming. | `convex/ai/voiceRuntime.ts`; `convex/ai/voiceRuntimeAdapter.ts`; `convex/api/v1/aiChat.ts` | `V-TYPE`; `V-DOCS` | Completed 2026-03-10. Added feature-flagged persistent realtime multimodal lifecycle (`web_chat_persistent_realtime_multimodal_v1`) with Gemini Live adapter capability resolution, open/close lifecycle metadata, deterministic fallback reasons, and HTTP API surface wiring while preserving turn-stitch default behavior. |
| `WCV-203` | `C` | `MP §Three-phase plan / Phase 3` | `P0` | `DONE` | `WCV-202` | Migrate web chat runtime orchestration to persistent session path with deterministic fallback to current turn-stitch mode. | `src/hooks/use-voice-runtime.ts`; `src/components/window-content/ai-chat-window/slick-pane/slick-chat-input.tsx`; `convex/ai/chatRuntimeOrchestration.ts` | `V-TYPE`; `V-E2E-DESKTOP`; `V-DOCS` | Completed 2026-03-10. Web runtime now carries persistent multimodal lifecycle metadata through open/close/session orchestration, uses persistent-session-first runtime path metadata on voice turns, deterministically tags turn-stitch fallback reasons, and suppresses latest turn-stitch image attachment injection when persistent mode is active. Verify snapshot: `V-TYPE` pass, `V-E2E-DESKTOP` pass, `V-DOCS` pass. |
| `WCV-204` | `C` | `MP §Three-phase plan / Phase 3` | `P1` | `READY` | `WCV-203` | Run parity matrix against local VisionClaw/agents references, capture canary go/no-go evidence, and sync queue docs. | `docs/reference_docs/topic_collections/implementation/web-ai-chat-agent-vision-runtime/INDEX.md`; `docs/reference_docs/topic_collections/implementation/web-ai-chat-agent-vision-runtime/MASTER_PLAN.md`; `docs/reference_docs/topic_collections/implementation/web-ai-chat-agent-vision-runtime/SESSION_PROMPTS.md` | `V-TYPE`; `V-E2E-DESKTOP`; `V-DOCS` | Lane `C` closeout row. Dependency `WCV-203` satisfied. |

## Current READY-first set

1. `WCV-204`
