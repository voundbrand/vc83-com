# Web AI Chat Agent Vision Runtime Master Plan

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/web-ai-chat-agent-vision-runtime`  
**Source brief date:** 2026-03-09  
**Planning mode:** Queue-first, docs-CI-compatible, phase-gated delivery

## Objective

Ship web AI chat behavior where the active agent can "see while we talk" by executing a strict three-phase progression:

1. Phase 1 (Fast Path): attach the freshest live frame to each voice turn with minimal architecture change.
2. Phase 2 (Robust Path): harden freshness, buffering, auth/policy controls, and observability for production safety.
3. Phase 3 (Tri-reference Parity): move from turn-stitching to persistent native realtime multimodal session behavior and harden WS/mobile transport contracts using equal-weight evidence from `VisionClaw`, `meta-lens-ai`, and `openclaw`.

## Current reality in this codebase

1. Web chat already captures and forwards camera frames into backend ingest.
2. Backend stores/retains frame artifacts and session metadata with org-scoped retention controls.
3. Voice turn orchestration now resolves and forwards freshest-frame metadata on transcript turns, with deterministic voice-only fallback when frame attach is unavailable.
4. Runtime multimodal payload construction auto-materializes resolved attached frames and de-duplicates image URLs, now backed by a persisted rolling vision frame buffer contract (`web_chat_vision_frame_buffer_v1`) for turn attachment selection, but still remains attachment-centric rather than persistent live multimodal session-centric.
5. Local reference projects (`docs/reference_projects/VisionClaw`, `docs/reference_projects/meta-lens-ai`, `docs/reference_projects/openclaw`) expose complementary runtime hardening patterns (setup-first handshake, timeout/backpressure policy, reconnect and heartbeat resilience) that current vc83 gateway/mobile paths only partially cover.

## Gap statement

To achieve "agent can see while talking" in production terms:

1. Live frames must be deterministically selected and attached to turn payloads in realtime.
2. Freshness and policy controls must prevent stale, cross-org, or out-of-contract frame usage.
3. Runtime must shift to provider-native persistent multimodal sessions for true parity and close WS/mobile transport reliability gaps across iPhone/web/Android/macOS/windows endpoints connected through meta bridge.

## Three-phase plan

### Phase 1: Fast Path (minimal viable seeing)

Goal: agent receives a recent frame automatically on each voice turn.

Scope:

1. Add deterministic freshest-frame resolver (conversation/session scoped, short freshness window).
2. Inject resolved frame into voice turn send path as model-visible image context.
3. Add targeted fast-path tests and telemetry markers (`vision_frame_attached`, `vision_frame_missing`, `vision_frame_stale`, `vision_policy_blocked`).

Acceptance:

1. Voice turn payload includes image context when fresh frame exists.
2. Missing/expired/policy-blocked cases degrade safely to voice-only with explicit reason code.

#### Phase 1 frozen contract (`WCV-001`)

Contract invariants:

1. Resolver input tuple is fixed to `(orgId, sessionId, conversationId, turnStartedAtMs)`.
2. Candidate set is strictly limited to the same `orgId`, `sessionId`, and `conversationId`.
3. Candidate ordering is deterministic: `capturedAt` descending, then `ingestedAt` descending, then `frameId` descending.
4. Freshness gate is deterministic: `turnStartedAtMs - candidate.capturedAtMs <= VISION_FAST_PATH_MAX_FRAME_AGE_MS` (default contract target: `12_000` ms, configurable).
5. Degrade reason evaluation order is fixed per turn:
   1. If retention/policy mode blocks image attachment, return `vision_policy_blocked`.
   2. Else if no candidate frame exists, return `vision_frame_missing`.
   3. Else if freshest candidate is outside freshness window, return `vision_frame_stale`.
   4. Else attach freshest candidate frame as image context.
6. Voice turn submission is never blocked by vision miss states; fallback is always voice-only and preserves transcript/turn ordering.
7. Phase 1 allows only these degrade reasons: `vision_policy_blocked`, `vision_frame_missing`, `vision_frame_stale`.

### Phase 2: Robust Path (production hardening)

Goal: make fast path reliable and compliance-safe under real load and failure modes.

Scope:

1. Add rolling frame buffer contract with deterministic ordering, freshness TTL, and idempotency boundaries.
2. Enforce org/session/conversation authorization and retention-policy modes (`off`, `metadata_only`, `full`) on runtime attachment.
3. Add observability and QA coverage for freshness misses, policy drops, auth rejection, and fallback behavior.

Acceptance:

1. No cross-org or out-of-session frame attachment possible.
2. Frame attachment behavior is measurable and alertable.
3. Fallback behavior is deterministic and verified.

### Phase 3: Tri-reference parity (persistent realtime multimodal runtime + transport hardening)

Goal: converge to native realtime multimodal session architecture.

Scope:

1. Implement persistent multimodal session contract for audio+video streaming to the provider runtime path.
2. Shift web voice+vision orchestration from turn-stitching to session-level live media loop.
3. Keep backwards-compatible fallback path until parity validation and canary gates are complete.

Acceptance:

1. Session-level realtime multimodal path is primary for supported environments.
2. Legacy turn-stitch path remains explicit fallback during canary.
3. Parity checklist and adoption decisions are explicitly documented against local `VisionClaw`, `meta-lens-ai`, and `openclaw` references.

#### Phase 3 frozen contract (`WCV-201`)

Persistent realtime multimodal session contract (audio+video streaming path):

1. Runtime session identity is immutable for a live attempt: `(orgId, userId, conversationId, runtimeSessionId, providerSessionId, startedAtMs)`.
2. Audio uplink path is fixed to streaming chunks (`pcm16` target contract) over provider realtime transport; transcripts remain server-authoritative and ordered by monotonic `sequence`.
3. Video uplink path is fixed to sampled frame stream from the active chat capture source; each frame envelope must include `(frameId, capturedAtMs, sourceSessionId, conversationId)` before provider forward.
4. All media events in the persistent path carry the same `(orgId, userId, conversationId)` tuple; tuple mismatch is fail-closed and triggers deterministic fallback.
5. Attachment semantics for persistent mode are "live stream primary, turn attachment secondary": turn-level stitched image attachment is disabled while the persistent session is healthy.
6. Interrupt contract is preserved: user barge-in always interrupts model audio output within the same session and does not create a new transcript timeline.
7. Provider disconnect/reconnect keeps one logical runtime session; reconnect attempts are bounded and do not rewrite transcript history.
8. Observability contract is fixed for migration: each session emits `session_mode`, `fallback_reason`, `audio_uplink_state`, `video_uplink_state`, and `reconnect_attempts`.

Deterministic fallback and migration guardrails (persistent -> turn-stitch runtime):

1. Fallback decision precedence is fixed:
   1. `feature_flag_disabled`
   2. `provider_capability_unsupported`
   3. `session_handshake_failed`
   4. `auth_scope_mismatch`
   5. `media_stream_unhealthy`
   6. `policy_blocked`
2. Fallback is one-way for a live runtime session: once downgraded to turn-stitch, do not re-upgrade until a new user-initiated session starts.
3. Fallback keeps transcript continuity by reusing conversation/turn identity and preserving existing turn ordering guarantees.
4. Fallback preserves previously frozen phase-1/phase-2 degrade taxonomy (`vision_policy_blocked`, `vision_frame_missing`, `vision_frame_stale`) for turn-level frame behavior.
5. Provider adapter errors are normalized before orchestration decisions; raw vendor error codes never drive branching directly.
6. Migration guardrail: persistent mode is never attempted unless lane `B` contracts are available (`WCV-104` done), including auth isolation and retention fail-closed behavior.

Rollout safety constraints required before `WCV-202` implementation:

1. New backend/session code must be behind an explicit feature flag defaulted `off` in production.
2. Canary scope must be allowlist-driven (org or workspace level), with immediate kill-switch rollback to turn-stitch mode.
3. Persistent mode must fail closed on any retention-policy ambiguity; if retention mode cannot be resolved, force fallback with `policy_blocked`.
4. Release gate for enabling canary traffic requires parity evidence criteria to be defined up front (`WCV-204` matrix owner, pass/fail thresholds, rollback conditions).
5. No removal of turn-stitch runtime code paths is allowed in `WCV-202` or `WCV-203`; deletion is deferred until lane `C` closeout.
6. `docs:guard` remains mandatory for each lane `C` row to keep queue artifacts synchronized with rollout state.

## Lane plan

| Lane | Phase | Purpose | Queue IDs |
|---|---|---|---|
| `A` | Fast Path | Fresh-frame auto-attachment on every voice turn | `WCV-001`..`WCV-004` |
| `B` | Robust Path | Freshness/policy/auth/observability hardening | `WCV-101`..`WCV-104` |
| `C` | Tri-reference Parity | Persistent realtime multimodal session architecture plus WS/mobile transport hardening | `WCV-201`..`WCV-213` |

## Implementation chunks

### Chunk 1: Phase 1 fast path (`A`)

1. Freeze frame-selection, reason-code precedence, and payload-injection contract.
2. Implement freshest-frame resolver query/action.
3. Wire voice send path to attach frame context.
4. Add fast-path unit/integration tests.

### Chunk 2: Phase 2 robust path (`B`)

1. Add rolling frame-buffer invariants and strict freshness windows.
2. Enforce retention mode + authorization gates in attachment flow.
3. Add telemetry dimensions and failure taxonomy.
4. Add integration/e2e coverage for policy and auth isolation.

### Chunk 3: Phase 3 parity path (`C`)

1. Freeze persistent multimodal session contract.
2. Implement provider adapter and session lifecycle.
3. Move web runtime orchestration to persistent live session.
4. Run tri-reference adoption matrix freeze (`WCV-208`) and execute runtime hardening continuation (`WCV-209`..`WCV-213`) before canary evidence closeout.

## Tri-reference hardening blueprint (`WCV-208`..`WCV-213`)

### World-class improvement filter

Only adopt a reference behavior when all are true:

1. It closes a verified vc83 runtime gap (not speculative architecture churn).
2. It is compatible with existing vc83 kill-switch, fallback, signed-ticket, replay, and fail-closed controls.
3. It improves deterministic cross-endpoint parity for iPhone/web/Android/macOS/windows paths behind meta bridge.
4. It is testable with row-scoped unit/integration verification already defined in queue profiles.

### Tri-reference adoption matrix (`WCV-208` finalized freeze)

| Decision | Capability | Evidence references (equal-weight: VisionClaw + meta-lens-ai + openclaw + vc83) | Queue row | Rationale / compatibility impact |
|---|---|---|---|---|
| `adopt now` | Handshake timeout + setup/session-open must be first valid runtime frame | VisionClaw: `docs/reference_projects/VisionClaw/samples/CameraAccess/CameraAccess/Gemini/GeminiLiveService.swift:54`, `:88`, `:166`, `:252`; `docs/reference_projects/VisionClaw/samples/CameraAccessAndroid/app/src/main/java/com/meta/wearable/dat/externalsampleapps/cameraaccess/gemini/GeminiLiveService.kt:81`, `:119`, `:229`, `:238`.<br>meta-lens-ai: `docs/reference_projects/meta-lens-ai/android/app/src/main/java/com/metalens/app/conversation/OpenAIRealtimeClient.kt:79`, `:82`, `:250`.<br>openclaw: `docs/reference_projects/openclaw/src/gateway/server-constants.ts:21`, `docs/reference_projects/openclaw/src/gateway/server/ws-connection.ts:263`, `docs/reference_projects/openclaw/src/gateway/server/ws-connection/message-handler.ts:206`, `:217`.<br>vc83: `apps/voice-ws-gateway/src/server.mjs:520`, `:534`, `:539`. | `WCV-209` | Closes a verified gateway gap (vc83 currently allows non-open control traffic before session open), with no change to signed-ticket, replay, fallback, kill-switch, or fail-closed behavior. |
| `adopt now` | Slow-consumer buffered-send guard (`drop` or `close`) | VisionClaw: `docs/reference_projects/VisionClaw/samples/CameraAccess/CameraAccess/Gemini/GeminiLiveService.swift:209`; `docs/reference_projects/VisionClaw/samples/CameraAccessAndroid/app/src/main/java/com/meta/wearable/dat/externalsampleapps/cameraaccess/gemini/GeminiLiveService.kt:158`, `:176`.<br>meta-lens-ai: `docs/reference_projects/meta-lens-ai/android/app/src/main/java/com/metalens/app/conversation/OpenAIRealtimeClient.kt:143`, `:170`, `:204`.<br>openclaw: `docs/reference_projects/openclaw/src/gateway/server-broadcast.ts:75`, `:76`, `:81`.<br>vc83: `apps/voice-ws-gateway/src/server.mjs:657`, `:692`, `:696`. | `WCV-210` | World-class hardening delta only: adopt OpenClaw backpressure guard pattern; preserve existing vc83 auth/fallback semantics and add deterministic telemetry branches. |
| `adopt now` | Versioned `gateway_ready` policy envelope (payload/buffer/tick contract) | VisionClaw: `docs/reference_projects/VisionClaw/samples/CameraAccess/CameraAccess/Gemini/GeminiLiveService.swift:186`, `:194`, `:195`; `docs/reference_projects/VisionClaw/samples/CameraAccessAndroid/app/src/main/java/com/meta/wearable/dat/externalsampleapps/cameraaccess/gemini/GeminiLiveService.kt:214`, `:222`, `:223`.<br>meta-lens-ai: `docs/reference_projects/meta-lens-ai/android/app/src/main/java/com/metalens/app/conversation/OpenAIRealtimeClient.kt:220`, `:223`, `:235`, `:240`.<br>openclaw: `docs/reference_projects/openclaw/src/gateway/server/ws-connection/message-handler.ts:833`, `:852`, `:853`, `:855`.<br>vc83: `apps/voice-ws-gateway/src/server.mjs:521`; `apps/operator-mobile/src/hooks/useMobileVoiceRuntime.ts:366`, `:409`, `:420`. | `WCV-211` | Adds explicit policy negotiation without protocol churn; aligns gateway/mobile compatibility checks and keeps fail-closed downgrade semantics intact. |
| `adopt now` | Bounded reconnect-before-downgrade with capped backoff budget | VisionClaw: `docs/reference_projects/VisionClaw/samples/CameraAccess/CameraAccess/WebRTC/WebRTCSessionViewModel.swift:100`, `:117`, `:161`, `:219`.<br>meta-lens-ai: `docs/reference_projects/meta-lens-ai/android/app/src/main/java/com/metalens/app/conversation/AudioIoController.kt:63`, `:64`, `:66`, `:74`.<br>openclaw: `docs/reference_projects/openclaw/src/gateway/client.ts:363`, `:364`, `:365`.<br>vc83: `apps/operator-mobile/src/hooks/useMobileVoiceRuntime.ts:805`, `:814`, `:924`, `:929`, `:937`. | `WCV-212` | Current mobile path downgrades immediately on transient close/error; bounded reconnect improves reliability while preserving one-way downgrade and existing fallback controls. |
| `adopt now` | Heartbeat seq-gap + stall-timeout detection wired into health/trust decisions | VisionClaw: `docs/reference_projects/VisionClaw/samples/CameraAccess/CameraAccess/Gemini/GeminiLiveService.swift:39`; `docs/reference_projects/VisionClaw/samples/CameraAccessAndroid/app/src/main/java/com/meta/wearable/dat/externalsampleapps/cameraaccess/gemini/GeminiLiveService.kt:65`.<br>meta-lens-ai: `docs/reference_projects/meta-lens-ai/android/app/src/main/java/com/metalens/app/conversation/OpenAIRealtimeClient.kt:49`.<br>openclaw: `docs/reference_projects/openclaw/src/gateway/client.ts:303`, `:305`, `:306`, `:388`, `:389`.<br>vc83: `apps/operator-mobile/src/hooks/useMobileVoiceRuntime.ts:396`, `:405`, `:450`, `:454`. | `WCV-213` | Extends existing vc83 relay-health parsing into explicit WS health contract decisions; no speculative refactor and no relaxation of fail-closed behavior. |
| `already covered` | Signed-ticket, replay defense, fail-closed auth gate | VisionClaw: connection/setup-first discipline (`docs/reference_projects/VisionClaw/samples/CameraAccess/CameraAccess/Gemini/GeminiLiveService.swift:54`, `:58`).<br>meta-lens-ai: explicit bearer-auth handshake (`docs/reference_projects/meta-lens-ai/android/app/src/main/java/com/metalens/app/conversation/OpenAIRealtimeClient.kt:70`, `:72`).<br>openclaw: invalid handshake -> policy close (`docs/reference_projects/openclaw/src/gateway/server/ws-connection/message-handler.ts:217`, `:241`, `:243`).<br>vc83: ticket signature+expiry+jti replay checks (`apps/voice-ws-gateway/src/server.mjs:144`, `:175`, `:181`, `:185`), ticket/auth mismatch fail-closed (`:458`, `:467`, `:478`, `:481`). | `WCV-209`..`WCV-213` preserve | Freeze as non-regression constraint: downstream rows must not weaken existing kill-switch, signed-ticket, replay, fallback, or fail-closed semantics. |
| `already covered` | Provider setup contract parity (`START_OF_ACTIVITY_INTERRUPTS`, `TURN_INCLUDES_ALL_INPUT`) | VisionClaw: provider setup contract fields (`docs/reference_projects/VisionClaw/samples/CameraAccess/CameraAccess/Gemini/GeminiLiveService.swift:194`, `:195`; `docs/reference_projects/VisionClaw/samples/CameraAccessAndroid/app/src/main/java/com/meta/wearable/dat/externalsampleapps/cameraaccess/gemini/GeminiLiveService.kt:222`, `:223`).<br>meta-lens-ai: equivalent interruption/VAD session controls (`docs/reference_projects/meta-lens-ai/android/app/src/main/java/com/metalens/app/conversation/OpenAIRealtimeClient.kt:235`, `:240`).<br>openclaw: policy-envelope negotiation precedent (`docs/reference_projects/openclaw/src/gateway/server/ws-connection/message-handler.ts:852`).<br>vc83: frozen constants+contract (`src/lib/voice-assistant/runtime-policy.ts:33`, `:35`), mobile parity envelope (`apps/operator-mobile/src/lib/av/metaBridge-contracts.ts:376`), assertions (`tests/unit/ai/mobileMetaBridgeContracts.test.ts:138`, `:146`, `:149`). | `WCV-208` note | Already landed by `WCV-206`/`WCV-207`; explicitly not reopened in `WCV-209+`. |
| `defer` | Full protocol migration to OpenClaw `req/res/event` envelope | VisionClaw: provider-native `setup` envelope (`docs/reference_projects/VisionClaw/samples/CameraAccess/CameraAccess/Gemini/GeminiLiveService.swift:167`).<br>meta-lens-ai: provider-native `session.update` (`docs/reference_projects/meta-lens-ai/android/app/src/main/java/com/metalens/app/conversation/OpenAIRealtimeClient.kt:250`).<br>openclaw: gateway `req/res/event` protocol (`docs/reference_projects/openclaw/src/gateway/server/ws-connection/message-handler.ts:206`, `:229`, `:833`).<br>vc83: current runtime envelope is `gateway_ready` + `voice_session_open` + `audio_chunk` (`apps/voice-ws-gateway/src/server.mjs:521`, `:539`, `:609`). | Post `WCV-213` | Not required to close current hardening gaps; would be speculative high-risk churn against frozen runtime semantics. |
| `defer` | WebRTC room lifecycle/grace semantics in mobile WS transport | VisionClaw: room rejoin/grace behavior is signaling-room specific (`docs/reference_projects/VisionClaw/samples/CameraAccess/CameraAccess/WebRTC/WebRTCSessionViewModel.swift:100`, `:117`, `:219`).<br>meta-lens-ai: direct Realtime WS client, no room lifecycle abstraction (`docs/reference_projects/meta-lens-ai/android/app/src/main/java/com/metalens/app/conversation/OpenAIRealtimeClient.kt:66`, `:79`).<br>openclaw: direct `connect` handshake, no room rejoin contract (`docs/reference_projects/openclaw/src/gateway/server/ws-connection/message-handler.ts:206`, `:217`).<br>vc83: direct WS open contract and explicit downgrade path (`apps/operator-mobile/src/hooks/useMobileVoiceRuntime.ts:917`, `:924`, `:929`). | Post `WCV-213` | Out of scope for WS/mobile hardening continuation; current direct-WS architecture should be hardened first before considering topology changes. |

### Hardened execution contract (`WCV-209`..`WCV-213`)

1. Preserve existing security and fallback invariants: kill-switch, signed-ticket verification, ticket replay protection, auth mismatch fail-closed, one-way downgrade semantics.
2. Land only parity-hardening deltas; avoid speculative refactors or unrelated protocol redesign.
3. Add/adjust unit tests for each row-level behavior change.
4. Add/adjust integration tests whenever gateway/mobile contract boundaries change (`WCV-209`, `WCV-210`, `WCV-211`, `WCV-213`).
5. Keep `TASK_QUEUE.md`, `SESSION_PROMPTS.md`, `INDEX.md`, and `MASTER_PLAN.md` synchronized at each status transition.

### Row acceptance checkpoints

1. `WCV-209`: connection is closed deterministically when handshake timeout expires or first frame is not session-open/auth; valid `voice_session_open` path remains compatible with ticket+auth checks.
2. `WCV-210`: send path enforces deterministic slow-consumer branch (`drop` or `close`) with explicit telemetry reason codes and no silent overflow.
3. `WCV-211`: `gateway_ready` carries versioned policy envelope; mobile enforces compatibility and fail-closed handling for incompatible policy version/range.
4. `WCV-212`: transient WS failures trigger bounded exponential reconnect attempts before deterministic downgrade; downgrade remains one-way for the active live session.
5. `WCV-213`: heartbeat sequence-gap and stall-timeout detection emit deterministic runtime health/trust telemetry consumed by fallback/chaos contract tests.

## Risks and mitigations

1. **Risk:** stale frame attachment causes hallucinated visual context.  
   **Mitigation:** strict freshness window + explicit degrade reason (`vision_frame_stale`).

2. **Risk:** policy/auth bypass across org/session boundaries.  
   **Mitigation:** mandatory org/session/conversation checks before payload attachment.

3. **Risk:** parity migration destabilizes current voice reliability.  
   **Mitigation:** keep turn-stitch fallback until lane `C` parity and canary gates pass.

4. **Risk:** observability blind spots hide degraded vision performance.  
   **Mitigation:** emit deterministic counters/events for attach/miss/drop reasons.

## Validation strategy

Required gates:

1. `npm run docs:guard`
2. `npm run typecheck`

Targeted tests:

1. `npm run test -- tests/unit/ai/webChatVisionFastPath.test.ts`
2. `npm run test -- tests/integration/ai/webChatVisionTurnAttach.integration.test.ts`
3. `npm run test -- tests/integration/ai/webChatVisionAuthorization.integration.test.ts`
4. `npm run test:e2e:desktop`

## Progress log

1. `2026-03-09`: Workstream initialized with queue-first artifacts and three-phase plan (`fast -> robust -> parity`).
2. `2026-03-10`: Completed `WCV-001` contract freeze for fast-path frame selection and deterministic degrade reason taxonomy.
3. `2026-03-10`: Completed `WCV-002` backend freshest-frame resolver with org/session/conversation scoping and strict freshness gating for voice-turn use.
4. `2026-03-10`: Completed `WCV-003` by resolving freshest frame during transcript-turn send, propagating resolution metadata, and auto-materializing resolved frame into runtime multimodal attachments with deterministic voice-only fallback.
5. `2026-03-10`: Completed `WCV-004` fast-path evidence closeout by adding attach/miss coverage plus voice-path no-regression tests (`tests/unit/ai/webChatVisionFastPath.test.ts`, `tests/integration/ai/webChatVisionTurnAttach.integration.test.ts`) and passing required gates (`npm run typecheck`, targeted unit/integration tests, `npm run docs:guard`).
6. `2026-03-10`: Completed `WCV-101` robust buffer contract by introducing persisted rolling frame state (ordering + idempotency window + TTL pruning) and wiring voice-turn resolve to prefer buffered candidates with retention-query fallback; required row gates passed (`npm run typecheck`, `npm run docs:guard`).
7. `2026-03-10`: Completed `WCV-102` robust retention/auth enforcement by introducing effective retention-mode fail-closed semantics (`enabled=false` resolves to `off`), adding explicit org/user/interview-session isolation checks in vision frame attachment selection, and mapping resolver auth/policy failures to `vision_policy_blocked` in `/api/v1/ai/voice/session/resolve` fallback handling. Verify snapshot: `npm run test -- tests/integration/ai/webChatVisionAuthorization.integration.test.ts` pass, `npm run test -- tests/integration/ai/operatorMediaRetentionIngest.integration.test.ts tests/integration/ai/operatorMediaRetentionAuthorization.integration.test.ts` pass, `npm run docs:guard` pass, `npm run typecheck` failed with `convex/teamOntology.ts(215,41): error TS2339: Property 'name' does not exist on type ...`.
8. `2026-03-10`: Completed `WCV-103` observability hardening by introducing `web_chat_vision_attachment_telemetry_v1` reason/bucket/counter taxonomy in `trustTelemetry.ts`, wiring frame-attachment resolver outputs to include deterministic telemetry snapshots for auth gate/buffer/retention paths in `voiceRuntime.ts`, and documenting runtime reason-code mapping/counters in `docs/platform/OPERATOR_MOBILE_MEDIA_RETENTION.md`. Verify snapshot: `npm run docs:guard` pass, `npm run typecheck` failed with `convex/teamOntology.ts(215,41): error TS2339: Property 'name' does not exist on type ...`.
9. `2026-03-10`: Completed `WCV-104` robust-path validation matrix closeout by expanding integration coverage for retention policy outcomes (`off`, `metadata_only`, `full`), auth isolation outcomes (`interview_session_mismatch`, `conversation_not_found`, `organization_mismatch`, `conversation_user_mismatch`, allow-match), and freshness outcomes (`attached`, `vision_frame_stale`, `vision_frame_missing`). Verify snapshot: `npm run typecheck` pass, `npm run test -- tests/integration/ai/webChatVisionAuthorization.integration.test.ts` pass, `npm run test -- tests/integration/ai/webChatVisionTurnAttach.integration.test.ts` pass, `npm run docs:guard` pass. Lane `B` closed; `WCV-201` advanced to `READY`.
10. `2026-03-10`: Completed `WCV-201` by freezing the persistent realtime multimodal session contract for audio+video streaming, deterministic fallback precedence and one-way downgrade guardrails to turn-stitch runtime, and rollout safety constraints required before `WCV-202`. Verify snapshot: `npm run docs:guard` pass. Advanced `WCV-202` to `READY`.
11. `2026-03-10`: Completed `WCV-202` by implementing feature-flagged persistent realtime multimodal backend lifecycle and provider adapter scaffolding: added Gemini Live persistent session capability resolution in `voiceRuntimeAdapter.ts`, wired persistent lifecycle resolution/open/close snapshots in `voiceRuntime.ts`, and exposed lifecycle metadata in `/api/v1/ai/voice/session/resolve|open|close` via `aiChat.ts` while keeping turn-stitch as default fallback path. Verify snapshot: `npm run typecheck` pass, `npm run docs:guard` pass. Advanced `WCV-203` to `READY`.
12. `2026-03-10`: Completed `WCV-203` by migrating web chat voice orchestration to persistent-session-first runtime metadata path with deterministic fallback tagging: updated `use-voice-runtime.ts` to pass/receive persistent lifecycle fields, updated `slick-chat-input.tsx` to propagate persistent session path and turn-stitch fallback reasons through voice/conversation runtime metadata and to skip per-turn vision frame resolver calls when persistent path is active, and updated `chatRuntimeOrchestration.ts` (+ call site) to suppress latest turn-stitch image attachment injection when persistent mode is active. Verify snapshot: `npm run typecheck` pass, `npm run docs:guard` pass, `npm run test:e2e:desktop` failed with `Error: Timed out waiting 180000ms from config.webServer.`. Advanced `WCV-204` to `READY`.
13. `2026-03-10`: Re-ran `WCV-203` verification after clearing stale local dev server processes; `npm run test:e2e:desktop` now passes (`5 passed (33.9s)`). Current `WCV-203` verify state: `npm run typecheck` pass, `npm run test:e2e:desktop` pass, `npm run docs:guard` pass.
14. `2026-03-10`: Completed `WCV-204` parity closeout by validating lane-C behavior against local `VisionClaw`/`agents` references, publishing parity matrix + canary go/no-go evidence (`GO (canary)` with feature-flag/allowlist/rollback guardrails retained), and synchronizing queue artifacts. Verify snapshot: `npm run typecheck` pass, `npm run test:e2e:desktop` pass (`5 passed (31.7s)`), `npm run docs:guard` pass. Lane `C` closed.
15. `2026-03-10`: Completed `WCV-205` post-parity hardening continuation by auditing short-utterance handling, turn-time vision attach/degrade behavior, language-lock reliability, empty assistant-output recovery, and telemetry path coverage; landed safe fixes for `voiceRuntime.languageLock` precedence in `resolveInboundConversationLanguageLock` and for turn-vision attachment claim hardening (only mark turn context as attached when a valid attachable frame URL exists). Verify snapshot: `npm run typecheck` pass, `npm run test -- tests/unit/ai/agentExecutionVoiceRuntime.test.ts tests/unit/ai/desktopConversationRuntime.test.ts tests/unit/ai/voiceRuntimeSessionFsm.test.ts tests/unit/ai/voiceSegmentedDuplexRuntime.test.ts tests/unit/ai/userFacingRuntimeMessaging.test.ts` pass, `npm run docs:guard` pass.
16. `2026-03-10`: Completed `WCV-206` parity hardening closure by adding explicit provider setup contract parity constants/snapshots (`START_OF_ACTIVITY_INTERRUPTS`, `TURN_INCLUDES_ALL_INPUT`), surfacing setup metadata through persistent lifecycle and conversation-runtime paths for cross-runtime consumers, hardening video forwarding cadence policy to VisionClaw 1fps default with deterministic min/max clamps, improving ambient single-segment short-utterance recovery decisions, and persisting turn-time vision attach/degrade telemetry into `trust.voice.adaptive_flow_decision.v1` payloads + schema validators. Verify snapshot: `npm run typecheck` pass, `npm run test -- tests/unit/ai/agentExecutionVoiceRuntime.test.ts tests/unit/ai/desktopConversationRuntime.test.ts tests/unit/ai/voiceRuntimeSessionFsm.test.ts tests/unit/ai/voiceSegmentedDuplexRuntime.test.ts tests/unit/ai/userFacingRuntimeMessaging.test.ts tests/unit/ai/webVoiceRuntimePolicy.test.ts tests/unit/ai/realtimeMediaSession.test.ts` pass, `npm run test -- tests/integration/ai/voiceRuntimeTelemetryTrustIngestion.integration.test.ts tests/integration/ai/realtimeVoiceTelemetryContract.integration.test.ts tests/integration/ai/voiceRuntimeChaosFallback.integration.test.ts` pass, `npm run docs:guard` pass. Lane `C` closed.
17. `2026-03-10`: Completed `WCV-207` residual parity-risk closure by (a) adding explicit native-client `providerSetupContract` consumption/assertions in mobile Gemini metadata contract builders and tests (`apps/operator-mobile/src/lib/av/metaBridge-contracts.ts`, `tests/unit/ai/mobileMetaBridgeContracts.test.ts`) and (b) hardening voice trust telemetry to recover `voice_session_id` from telemetry correlation keys with deterministic `derived_from_live:<liveSessionId>` fallback when omitted upstream, preventing vision adaptive-event drops (`convex/ai/chat.ts`, `tests/integration/ai/voiceRuntimeTelemetryTrustIngestion.integration.test.ts`). Verify snapshot: `npm run typecheck` pass, `npm run test -- tests/unit/ai/desktopConversationRuntime.test.ts tests/unit/ai/mobileMetaBridgeContracts.test.ts` pass, `npm run test -- tests/integration/ai/voiceRuntimeTelemetryTrustIngestion.integration.test.ts tests/integration/ai/realtimeVoiceTelemetryContract.integration.test.ts tests/integration/ai/voiceRuntimeChaosFallback.integration.test.ts` pass, `npm run docs:guard` pass. Lane `C` closed.
18. `2026-03-10`: Added tri-reference continuation backlog (`WCV-208`..`WCV-213`) to incorporate user steering and prevent OpenClaw-only bias. New lane-C rows require explicit adoption-matrix evidence across `docs/reference_projects/VisionClaw`, `docs/reference_projects/meta-lens-ai`, and `docs/reference_projects/openclaw`, then execution of WS/mobile hardening items: handshake timeout + first-frame guard, slow-consumer buffering policy, versioned gateway-ready policy negotiation, bounded reconnect-before-downgrade, and heartbeat sequence-gap stall detection. `WCV-208` is now `READY`; downstream rows are dependency-gated `PENDING`.
19. `2026-03-10`: Hardened implementation planning scope for `WCV-208`..`WCV-213` by freezing a world-class-only adoption filter and tri-reference decision matrix against current vc83 runtime reality. Explicitly documented `adopt now` vs `already covered` vs `defer` outcomes, row-level acceptance checkpoints, and non-regression constraints for signed-ticket/replay/fallback/fail-closed semantics before any code execution.
20. `2026-03-11`: Completed `WCV-208` by finalizing the tri-reference adoption matrix with line-cited equal-weight evidence from VisionClaw, meta-lens-ai, openclaw, and current vc83 gateway/mobile/runtime contracts. Frozen decisions: `adopt now` for `WCV-209`..`WCV-213`, `already covered` for signed-ticket/replay/fail-closed auth + provider setup contract parity, and `defer` for protocol/topology refactors outside verified hardening gaps. Verification snapshot: `npm run typecheck` pass, `npm run docs:guard` pass.
21. `2026-03-11`: Completed `WCV-209` by hardening `apps/voice-ws-gateway/src/server.mjs` handshake behavior with a bounded connection-time timeout (`WS_HANDSHAKE_TIMEOUT_MS`) and deterministic fail-closed policy-close contract when pre-open message order is violated (`first_frame_not_session_open`, `session_open_required`, `session_open_timeout`). Updated `tests/integration/ai/voiceWsGateway.websocketAuth.integration.test.ts` to cover first-frame media-envelope rejection and timeout-driven close behavior while preserving existing ticket signature/replay/auth mismatch controls and fallback/kill-switch constraints. Verification snapshot: `npm run typecheck` pass, `npm run test -- tests/integration/ai/voiceWsGateway.integration.test.ts tests/integration/ai/voiceWsGateway.websocketAuth.integration.test.ts` pass, `npm run docs:guard` pass. Advanced `WCV-210` to `READY`.
22. `2026-03-11`: Completed `WCV-210` by adding deterministic slow-consumer send guarding to `apps/voice-ws-gateway/src/server.mjs`: buffered-amount thresholds (`WS_SLOW_CONSUMER_DROP_THRESHOLD_BYTES`, `WS_SLOW_CONSUMER_CLOSE_THRESHOLD_BYTES`), explicit `drop`/`close` policy branches in outbound send paths, deterministic slow-consumer close reason (`slow_consumer`), and telemetry counters (`wsSlowConsumerThresholdBreaches`, `wsSlowConsumerDrops`, `wsSlowConsumerCloses`) exposed on `/metrics`. Added deterministic gateway integration coverage for slow-consumer drop/close counter deltas in `tests/integration/ai/voiceWsGateway.integration.test.ts` and preserved trust telemetry compatibility for slow-consumer fallback reason propagation in `tests/integration/ai/realtimeVoiceTelemetryContract.integration.test.ts`. Verification snapshot: `npm run typecheck` pass, `npm run test -- tests/integration/ai/voiceWsGateway.integration.test.ts tests/integration/ai/voiceWsGateway.websocketAuth.integration.test.ts` pass, `npm run test -- tests/integration/ai/realtimeVoiceTelemetryContract.integration.test.ts tests/integration/ai/voiceRuntimeChaosFallback.integration.test.ts` pass, `npm run docs:guard` pass. Advanced `WCV-211` to `READY`.
23. `2026-03-11`: Completed `WCV-211` by extending `gateway_ready` in `apps/voice-ws-gateway/src/server.mjs` with a versioned policy envelope (`version`, `maxPayloadBytes`, `maxBufferedBytes`, `heartbeat.cadenceMs`, `heartbeat.contractVersion`) and by gating mobile websocket connect in `apps/operator-mobile/src/hooks/useMobileVoiceRuntime.ts` on explicit compatibility validation from `apps/operator-mobile/src/lib/voice/transport.ts` before sending `voice_session_open`. Incompatible/missing policy now closes fail-closed and downgrades transport rather than silently accepting unknown constraints. Added contract coverage in `tests/integration/ai/voiceWsGateway.websocketAuth.integration.test.ts` and `tests/unit/ai/mobileVoiceTransportSelection.test.ts`. Verification snapshot: `npm run typecheck` pass, `npm run test -- tests/integration/ai/voiceWsGateway.websocketAuth.integration.test.ts` pass, `npm run test -- tests/unit/ai/mobileVoiceTransportSelection.test.ts` pass, `npm run docs:guard` pass. Advanced `WCV-212` to `READY`.
24. `2026-03-11`: Completed `WCV-212` by adding bounded reconnect-before-downgrade behavior in mobile websocket transport. `apps/operator-mobile/src/lib/voice/transport.ts` now defines deterministic reconnect budget helpers (exponential backoff schedule + cumulative budget exhaustion cutoff), and `apps/operator-mobile/src/hooks/useMobileVoiceRuntime.ts` now retries transient websocket failures (`connect_failed`, `runtime_error`, `closed`) within that budget before deterministic one-way downgrade to fallback once exhausted. Preserved fail-closed semantics from `WCV-211` by forcing immediate downgrade on missing/incompatible `gateway_ready` policy handshakes rather than retrying incompatible contracts. Added unit coverage for backoff progression and budget cutover in `tests/unit/ai/mobileVoiceTransportSelection.test.ts`. Verification snapshot: `npm run typecheck` pass, `npm run test -- tests/unit/ai/mobileVoiceTransportSelection.test.ts tests/unit/ai/mobileVoiceLifecycle.test.ts tests/unit/ai/mobileVoiceChaosHarness.test.ts` pass, `npm run docs:guard` pass. Advanced `WCV-213` to `READY`.
25. `2026-03-11`: Completed `WCV-213` by adding explicit relay heartbeat sequence-gap + stall-timeout detection across gateway/mobile runtime contracts and wiring those decisions into telemetry/trust-facing runtime metadata. `apps/voice-ws-gateway/src/server.mjs` now emits heartbeat policy thresholds (`sequenceGapTolerance`, `stallTimeoutMs`) in `gateway_ready`; `apps/operator-mobile/src/lib/voice/realtimeHealth.ts` now evaluates deterministic fail-closed heartbeat anomalies (`relay_server_heartbeat_sequence_gap`, `relay_server_heartbeat_stall_timeout`) with sequence-gap and ack-age diagnostics; `apps/operator-mobile/src/hooks/useMobileVoiceRuntime.ts` now applies policy-derived heartbeat thresholds and records anomaly counters in transport monitoring snapshots consumed by runtime metadata paths. Telemetry/trust integration coverage updated to assert heartbeat reason propagation through normalization/adaptive decisions (`tests/integration/ai/realtimeVoiceTelemetryContract.integration.test.ts`, `tests/integration/ai/voiceRuntimeChaosFallback.integration.test.ts`) with mobile relay-health coverage additions in `tests/unit/ai/mobileVoiceLatencyMetrics.test.ts`. Verification snapshot: `npm run typecheck` pass, `npm run test -- tests/integration/ai/voiceWsGateway.integration.test.ts tests/integration/ai/voiceWsGateway.websocketAuth.integration.test.ts` pass, `npm run test -- tests/unit/ai/mobileVoiceTransportSelection.test.ts tests/unit/ai/mobileVoiceLifecycle.test.ts tests/unit/ai/mobileVoiceLatencyMetrics.test.ts tests/unit/ai/mobileVoiceChaosHarness.test.ts` pass, `npm run test -- tests/integration/ai/voiceRuntimeTelemetryTrustIngestion.integration.test.ts tests/integration/ai/realtimeVoiceTelemetryContract.integration.test.ts tests/integration/ai/voiceRuntimeChaosFallback.integration.test.ts` pass, `npm run docs:guard` pass.

## Exit criteria

1. Lane `A` done: fast-path attachment works in production path with deterministic fallback.
2. Lane `B` done: policy/auth/freshness hardening and observability coverage complete.
3. Lane `C` done: persistent realtime multimodal parity path and tri-reference runtime hardening rows (`WCV-201`..`WCV-213`) validated with fallback retained until canary promotion.
4. `INDEX.md`, `MASTER_PLAN.md`, `TASK_QUEUE.md`, and `SESSION_PROMPTS.md` remain synchronized.
5. `npm run docs:guard` passes.

## WCV-204 parity matrix and canary evidence (historical baseline)

This section captures the earlier lane-C closeout baseline before tri-reference continuation rows (`WCV-208`..`WCV-213`) were added.

Reference baselines reviewed:

1. `docs/reference_projects/VisionClaw/README.md`
2. `docs/reference_projects/VisionClaw/samples/CameraAccess/CameraAccess/Gemini/GeminiLiveService.swift`
3. `docs/reference_projects/VisionClaw/samples/CameraAccess/CameraAccess/Gemini/GeminiSessionViewModel.swift`
4. `docs/reference_projects/agents/README.md`
5. `docs/reference_projects/agents/examples/test_realtime_pipeline.py`
6. `docs/reference_projects/agents/examples/reply_interrupt_agent.py`
7. `docs/reference_projects/agents/examples/fallback_recovery.py`

### Parity matrix (`WCV-204`)

| Capability | VisionClaw / agents reference | vc83 lane-C implementation evidence | Status |
|---|---|---|---|
| Persistent realtime multimodal session lifecycle | VisionClaw documents Gemini Live realtime voice+vision session loop over WebSocket with audio/video streaming | `WCV-201`/`WCV-202` contract + adapter/lifecycle path: feature-flagged persistent session lifecycle in `convex/ai/voiceRuntime.ts` and `convex/ai/voiceRuntimeAdapter.ts` | `PASS` |
| Live video context during active voice session | VisionClaw throttles video frame forwarding while session is active (`sendVideoFrameIfThrottled`) | `WCV-203` routes voice turns via persistent-session metadata and suppresses latest turn-stitch image attachment injection in persistent mode (`chatRuntimeOrchestration.ts`) | `PASS` |
| Barge-in / interruption continuity | VisionClaw handles interrupted responses (`START_OF_ACTIVITY_INTERRUPTS`) and interruption callbacks | vc83 preserves interruption contracts and keeps deterministic fallback mode tagging in web runtime orchestration (`slick-chat-input.tsx`, `use-voice-runtime.ts`) | `PASS` |
| Deterministic fallback and recovery | agents examples include explicit fallback recovery (`fallback_recovery.py`) and interruption controls (`reply_interrupt_agent.py`) | vc83 retains explicit fallback precedence and one-way downgrade guardrail from `WCV-201`, with runtime fallback reasons propagated end-to-end in lane C | `PASS` |
| Tool-call loop compatibility under realtime session | VisionClaw routes tool calls + cancellation through OpenClaw bridge in active realtime session | vc83 keeps existing agent execution/tool flow unchanged while migrating session transport metadata path (`WCV-203` non-regression scope) | `PASS` |
| Verification gates for parity canary readiness | Reference projects emphasize realtime pipeline reliability and operational validation | `WCV-204` required verifies executed: `typecheck`, desktop e2e, docs guard | `PASS` |

### Canary go/no-go decision

Decision inputs:

1. Parity matrix rows above all `PASS`.
2. `npm run typecheck` passes.
3. `npm run test:e2e:desktop` passes.
4. `npm run docs:guard` passes.
5. Fallback compatibility and kill-switch constraints from `WCV-201` remain intact.

Decision:

1. **`GO (canary)`** for lane `C` closeout under existing rollout constraints:
   - feature flag remains default `off` in production
   - allowlist-based canary only
   - immediate rollback path to turn-stitch mode remains available and documented

Evidence snapshot timestamp: `2026-03-10` (workstream-local verification run sequence).
