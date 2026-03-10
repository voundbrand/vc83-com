# Web AI Chat Agent Vision Runtime Index

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/web-ai-chat-agent-vision-runtime`  
**Source brief:** 2026-03-09 web AI chat initiative for "agent can see while talking"  
**Execution mode:** Deterministic queue-first with three phase gates

## Canonical files

- Queue: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/web-ai-chat-agent-vision-runtime/TASK_QUEUE.md`
- Session prompts: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/web-ai-chat-agent-vision-runtime/SESSION_PROMPTS.md`
- Master plan: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/web-ai-chat-agent-vision-runtime/MASTER_PLAN.md`

## Scope summary

Included:

1. Fast-path frame auto-attachment on voice turns.
2. Robust policy/auth/freshness hardening and observability.
3. VisionClaw-style persistent realtime multimodal parity migration.

Excluded:

1. Unrelated operator-mobile-only UI work.
2. Non-chat media features outside this runtime path.
3. General docs/reference project modifications.

## Phase summary

| Phase | Lane | Goal | Completion rows |
|---|---|---|---|
| `1` | `A` | Fast path: freshest-frame per-turn attachment | `WCV-001`..`WCV-004` |
| `2` | `B` | Robust path: safety/hardening/observability | `WCV-101`..`WCV-104` |
| `3` | `C` | VisionClaw parity: persistent multimodal session | `WCV-201`..`WCV-204` |

## Current queue snapshot

| Lane | IDs | Status snapshot |
|---|---|---|
| `A` | `WCV-001`..`WCV-004` | `DONE` x4 |
| `B` | `WCV-101`..`WCV-104` | `DONE` x4 |
| `C` | `WCV-201`..`WCV-204` | `DONE`, `DONE`, `DONE`, `READY` |

## READY-first execution list

1. `WCV-204`

## Required gates

1. `npm run docs:guard`
2. `npm run typecheck`
3. Targeted unit/integration commands listed in `TASK_QUEUE.md`

## Latest update

1. `2026-03-09`: Created queue-first workstream artifacts with one master plan split into three phases and lane prompts for each phase.
2. `2026-03-10`: Completed `WCV-001` by freezing fast-path frame-selection contract and deterministic degrade reasons; advanced `WCV-002` to `READY`.
3. `2026-03-10`: Completed `WCV-002` backend freshest-frame resolver (org/session/conversation scoping + strict freshness) and advanced `WCV-003` to `READY`.
4. `2026-03-10`: Completed `WCV-003` voice-turn auto-attach wiring (resolved freshest frame injected into transcript send path and materialized at agent ingress); advanced `WCV-004` to `READY`. Verification snapshot: `npm run typecheck` pass, `npm run docs:guard` pass, `npm run test -- tests/integration/ai/webChatVisionTurnAttach.integration.test.ts` failed with `No test files found`.
5. `2026-03-10`: Completed `WCV-004` with fast-path attach/miss and no-regression voice-path evidence. Added `tests/integration/ai/webChatVisionTurnAttach.integration.test.ts` and expanded `tests/unit/ai/webChatVisionFastPath.test.ts`; verification snapshot: `npm run typecheck` pass, `npm run test -- tests/unit/ai/webChatVisionFastPath.test.ts` pass, `npm run test -- tests/integration/ai/webChatVisionTurnAttach.integration.test.ts` pass, `npm run docs:guard` pass. Lane `A` closed; `WCV-101` advanced to `READY`.
6. `2026-03-10`: Completed `WCV-101` by adding `web_chat_vision_frame_buffer_v1` schema + runtime contract for rolling frame selection (deterministic ordering, idempotency window, TTL pruning) and wiring voice-turn frame resolution to use buffered candidates with retention-query fallback. Verification snapshot: `npm run typecheck` pass, `npm run docs:guard` pass. Advanced `WCV-102` to `READY`.
7. `2026-03-10`: Completed `WCV-102` by enforcing fail-closed retention-mode behavior (`enabled=false` forces effective mode `off`), adding org/user/interview-session isolation checks before vision attachment selection, and mapping resolver auth/policy failures to `vision_policy_blocked` fallback in HTTP voice session resolve path. Verification snapshot: `npm run test -- tests/integration/ai/webChatVisionAuthorization.integration.test.ts` pass, `npm run test -- tests/integration/ai/operatorMediaRetentionIngest.integration.test.ts tests/integration/ai/operatorMediaRetentionAuthorization.integration.test.ts` pass, `npm run docs:guard` pass, `npm run typecheck` failed with `convex/teamOntology.ts(215,41): error TS2339: Property 'name' does not exist on type ...`. Advanced `WCV-103` to `READY`.
8. `2026-03-10`: Completed `WCV-103` by adding `web_chat_vision_attachment_telemetry_v1` taxonomy/counter helpers in `trustTelemetry.ts`, wiring deterministic attachment/miss/drop/freshness telemetry snapshots into `voiceRuntime.resolveFreshestVisionFrameForVoiceTurn`, and documenting runtime reason-code mapping + counters in `docs/platform/OPERATOR_MOBILE_MEDIA_RETENTION.md`. Verification snapshot: `npm run docs:guard` pass, `npm run typecheck` failed with `convex/teamOntology.ts(215,41): error TS2339: Property 'name' does not exist on type ...`. Advanced `WCV-104` to `READY`.
9. `2026-03-10`: Completed `WCV-104` by expanding robust-path validation matrix coverage in integration tests for retention policy outcomes (`off`, `metadata_only`, `full`), auth isolation outcomes (`interview_session_mismatch`, `conversation_not_found`, `organization_mismatch`, `conversation_user_mismatch`, allow-match), and freshness outcomes (`attached`, `vision_frame_stale`, `vision_frame_missing`). Verification snapshot: `npm run typecheck` pass, `npm run test -- tests/integration/ai/webChatVisionAuthorization.integration.test.ts` pass, `npm run test -- tests/integration/ai/webChatVisionTurnAttach.integration.test.ts` pass, `npm run docs:guard` pass. Lane `B` closed; advanced `WCV-201` to `READY`.
10. `2026-03-10`: Completed `WCV-201` by freezing the persistent realtime multimodal audio+video session contract, deterministic fallback/migration guardrails to turn-stitch runtime, and rollout safety constraints required before `WCV-202`. Verification snapshot: `npm run docs:guard` pass. Advanced `WCV-202` to `READY`.
11. `2026-03-10`: Completed `WCV-202` by implementing feature-flagged persistent realtime multimodal backend lifecycle and provider adapter scaffolding (`convex/ai/voiceRuntimeAdapter.ts`, `convex/ai/voiceRuntime.ts`, `convex/api/v1/aiChat.ts`), including resolve/open/close lifecycle metadata and deterministic fallback signaling while preserving turn-stitch default behavior. Verification snapshot: `npm run typecheck` pass, `npm run docs:guard` pass. Advanced `WCV-203` to `READY`.
12. `2026-03-10`: Completed `WCV-203` by migrating web chat runtime orchestration to persistent-session-first metadata path with deterministic fallback to turn-stitch mode (`src/hooks/use-voice-runtime.ts`, `src/components/window-content/ai-chat-window/slick-pane/slick-chat-input.tsx`, `convex/ai/chatRuntimeOrchestration.ts`). Verification snapshot: `npm run typecheck` pass, `npm run docs:guard` pass, `npm run test:e2e:desktop` failed with `Error: Timed out waiting 180000ms from config.webServer.`. Advanced `WCV-204` to `READY`.
13. `2026-03-10`: Re-ran `WCV-203` verification after local process cleanup; `npm run test:e2e:desktop` now passes (`5 passed (33.9s)`). Current `WCV-203` verification snapshot: `npm run typecheck` pass, `npm run test:e2e:desktop` pass, `npm run docs:guard` pass.
