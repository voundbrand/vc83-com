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
3. Voice turn orchestration is functional, but live frame context is not automatically injected into each model turn.
4. Runtime multimodal payload construction is still attachment-centric rather than persistent live multimodal session-centric.
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
3. Add targeted fast-path tests and telemetry markers (`vision_frame_attached`, `vision_frame_missing`).

Acceptance:

1. Voice turn payload includes image context when fresh frame exists.
2. Missing/expired frame degrades safely to voice-only with explicit reason code.

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

## Lane plan

| Lane | Phase | Purpose | Queue IDs |
|---|---|---|---|
| `A` | Fast Path | Fresh-frame auto-attachment on every voice turn | `WCV-001`..`WCV-004` |
| `B` | Robust Path | Freshness/policy/auth/observability hardening | `WCV-101`..`WCV-104` |
| `C` | VisionClaw Parity | Persistent realtime multimodal session architecture | `WCV-201`..`WCV-204` |

## Implementation chunks

### Chunk 1: Phase 1 fast path (`A`)

1. Freeze frame-selection and payload-injection contract.
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

1. `npm run test:unit -- tests/unit/ai/webChatVisionFastPath.test.ts`
2. `npm run test -- tests/integration/ai/webChatVisionTurnAttach.integration.test.ts`
3. `npm run test -- tests/integration/ai/webChatVisionAuthorization.integration.test.ts`
4. `npm run test:e2e:desktop`

## Progress log

1. `2026-03-09`: Workstream initialized with queue-first artifacts and three-phase plan (`fast -> robust -> parity`).

## Exit criteria

1. Lane `A` done: fast-path attachment works in production path with deterministic fallback.
2. Lane `B` done: policy/auth/freshness hardening and observability coverage complete.
3. Lane `C` done: persistent realtime multimodal parity path validated with fallback retained until canary promotion.
4. `INDEX.md`, `MASTER_PLAN.md`, `TASK_QUEUE.md`, and `SESSION_PROMPTS.md` remain synchronized.
5. `npm run docs:guard` passes.
