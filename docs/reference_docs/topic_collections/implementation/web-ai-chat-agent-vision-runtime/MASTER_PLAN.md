# Web AI Chat Agent Vision Runtime Master Plan

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/web-ai-chat-agent-vision-runtime`  
**Source brief date:** 2026-03-09  
**Planning mode:** Queue-first, docs-CI-compatible, phase-gated delivery

## Objective

Ship web AI chat behavior where the active agent can "see while we talk" by executing a strict three-phase progression:

1. Phase 1 (Fast Path): attach the freshest live frame to each voice turn with minimal architecture change.
2. Phase 2 (Robust Path): harden freshness, buffering, auth/policy controls, and observability for production safety.
3. Phase 3 (VisionClaw Parity): move from turn-stitching to persistent native realtime multimodal session behavior.

## Current reality in this codebase

1. Web chat already captures and forwards camera frames into backend ingest.
2. Backend stores/retains frame artifacts and session metadata with org-scoped retention controls.
3. Voice turn orchestration now resolves and forwards freshest-frame metadata on transcript turns, with deterministic voice-only fallback when frame attach is unavailable.
4. Runtime multimodal payload construction auto-materializes resolved attached frames and de-duplicates image URLs, now backed by a persisted rolling vision frame buffer contract (`web_chat_vision_frame_buffer_v1`) for turn attachment selection, but still remains attachment-centric rather than persistent live multimodal session-centric.
5. Local reference projects (`docs/reference_projects/VisionClaw`, `docs/reference_projects/agents`) demonstrate persistent realtime multimodal loops that current production runtime does not yet match.

## Gap statement

To achieve "agent can see while talking" in production terms:

1. Live frames must be deterministically selected and attached to turn payloads in realtime.
2. Freshness and policy controls must prevent stale, cross-org, or out-of-contract frame usage.
3. Runtime must eventually shift to provider-native persistent multimodal sessions for true parity.

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

### Phase 3: VisionClaw parity (persistent realtime multimodal runtime)

Goal: converge to native realtime multimodal session architecture.

Scope:

1. Implement persistent multimodal session contract for audio+video streaming to the provider runtime path.
2. Shift web voice+vision orchestration from turn-stitching to session-level live media loop.
3. Keep backwards-compatible fallback path until parity validation and canary gates are complete.

Acceptance:

1. Session-level realtime multimodal path is primary for supported environments.
2. Legacy turn-stitch path remains explicit fallback during canary.
3. Parity checklist against local VisionClaw/agents references is complete and documented.

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
| `C` | VisionClaw Parity | Persistent realtime multimodal session architecture | `WCV-201`..`WCV-204` |

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
4. Run parity matrix and canary evidence closeout.

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

## Exit criteria

1. Lane `A` done: fast-path attachment works in production path with deterministic fallback.
2. Lane `B` done: policy/auth/freshness hardening and observability coverage complete.
3. Lane `C` done: persistent realtime multimodal parity path validated with fallback retained until canary promotion.
4. `INDEX.md`, `MASTER_PLAN.md`, `TASK_QUEUE.md`, and `SESSION_PROMPTS.md` remain synchronized.
5. `npm run docs:guard` passes.
