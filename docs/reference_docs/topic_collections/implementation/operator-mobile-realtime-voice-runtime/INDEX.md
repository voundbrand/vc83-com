# Operator Mobile Realtime Voice Runtime Index

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/operator-mobile-realtime-voice-runtime`  
**Source request:** Build world-class operator mobile voice runtime with provider-backed realtime transport, deterministic fallback, interruptible playback, and production-grade reliability/observability/security, then layer video feed crossover at the end. Follow-up scope: implement true native DAT audio/video ingress callback wiring for physical-device Meta glasses flows, deliver `conversation_interaction_v1` in the main AI chat UI (web + desktop + iPhone), and now add a concrete three-milestone true live AV media-plane + multimodal agentic execution plan.

---

## Purpose

This workstream defines how to deliver production-grade realtime voice on `operator-mobile` by closing:

1. transport protocol contract (`webrtc` + `websocket` + `chunked_fallback`),
2. backend realtime runtime (streaming ingest/egress + session FSM + transcript continuity),
3. mobile streaming runtime (low-latency capture, playback, barge-in, reconnection),
4. reliability, observability, and security hardening gates.
5. end-layer video crossover on the same runtime contract after voice readiness.
6. native DAT callback ingress hardening for iOS and Android connectors after ORV-019 stabilization.
7. main AI chat conversation UX/runtime rollout across web, desktop, and iPhone using `conversation_interaction_v1`.
8. true live AV media-plane activation and multimodal agentic workflow/execution rollout after cross-surface conversation state parity is in place.

---

## Core files

- Queue:
  `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/operator-mobile-realtime-voice-runtime/TASK_QUEUE.md`
- Session prompts:
  `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/operator-mobile-realtime-voice-runtime/SESSION_PROMPTS.md`
- Master plan:
  `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/operator-mobile-realtime-voice-runtime/MASTER_PLAN.md`
- ORV-014 canary runbook:
  `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/operator-mobile-realtime-voice-runtime/ORV_014_CANARY_RUNBOOK.md`
- ORV-014 owner handoff roster:
  `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/operator-mobile-realtime-voice-runtime/ORV_014_OWNER_HANDOFF_ROSTER.md`
- ORV-014 canary execution log:
  `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/operator-mobile-realtime-voice-runtime/ORV_014_CANARY_EXECUTION_LOG.md`
- Web chat conversation interaction contract:
  `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/operator-mobile-realtime-voice-runtime/WEB_CHAT_CONVERSATION_INTERACTION_CONTRACT.md`
- Conversation interaction implementation checklist:
  `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/operator-mobile-realtime-voice-runtime/CONVERSATION_INTERACTION_IMPLEMENTATION_CHECKLIST.md`
- Index:
  `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/operator-mobile-realtime-voice-runtime/INDEX.md`

---

## Scope boundary

Owned here:

1. voice transport protocol + runtime metadata parity contracts,
2. Convex HTTP + voiceRuntime integration for realtime session lifecycle,
3. operator-mobile streaming client path (capture, transcripts, playback, barge-in),
4. fallback policy and production rollout gates,
5. explicit end-layer video crossover tasks and dependencies,
6. main AI chat web/desktop/iPhone conversation controls and live feed testing lanes.

Not owned here:

1. unrelated desktop UI redesign workstreams outside AI chat conversation runtime,
2. non-voice product surfaces outside shared media runtime contract needs,
3. provider commercial/account operations policy outside runtime integration.

---

## Status snapshot

1. `ORV-001` through `ORV-019` are `DONE`; protocol, runtime, continuity, reliability, security, canary, and additive video crossover lanes are complete.
2. Follow-up lane `H` is now added with `ORV-020` through `ORV-023` for native DAT callback ingress hardening.
3. `ORV-020` is `DONE` with frozen callback contract decisions for iOS + Android DAT ingress mapping, normalization, counters, lifecycle invariants, and degraded-surface diagnostics.
4. `ORV-021` is `DONE` with iOS `StreamSession` callback wiring hardening (video callback mapping, audio callback-surface binding, explicit callback diagnostics, and reconnect-safe listener teardown).
5. `ORV-022` is now `DONE` with Android reflection-safe DAT callback binding for frame/audio ingress, callback-surface diagnostics, and lifecycle-safe listener teardown/reconnect behavior.
6. `ORV-023` (physical-device validation evidence) is now `BLOCKED` pending tethered iOS + Android DAT runtime validation prerequisites.
7. Lane `H` preserves fail-closed true SDK absence (`dat_sdk_unavailable`) while disallowing placeholder-only ingress paths as production acceptance criteria.
8. All lane `H` follow-up rows preserve `/api/v1/ai/voice/*` compatibility and ORV-010 through ORV-022 `voiceRuntime`/`transportRuntime` parity commitments.
9. Voice release remains gated by canary policy budgets and callback-ingress acceptance evidence.
10. ORV-023 evidence/verify artifacts are captured under `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/operator-mobile-realtime-voice-runtime/artifacts/orv-023/`; physical-device artifacts must be published under `artifacts/orv-023/physical-device/{ios,android}/`.
11. Lane `I` rows `ORV-024` through `ORV-029` are `DONE`; web/desktop now has canonical conversation states (`idle`, `connecting`, `live`, `reconnecting`, `ending`, `ended`, `error`), standardized `conversation_*` event binding/reason parity, and end-to-end `conversationRuntime` propagation into runtime/agent metadata paths.
12. Lane `J` rows `ORV-031`, `ORV-032`, and `ORV-033` are `DONE`; iPhone now has canonical conversation state/event parity with the same deterministic reason taxonomy and translation-backed HUD state labels while preserving one-shot dictate.
13. `ORV-035` is now `DONE`; cross-surface parity gate assertions now enforce identical `conversation_interaction_v1` mode/state/event/reason behavior across web/desktop and iPhone, including fail-closed `dat_sdk_unavailable` mapping.
14. `ORV-030` is now `DONE`; live smoke matrix evidence is published with explicit `voice` and `voice_with_eyes` pass/fail outcomes for web, desktop, and iPhone (Playwright mobile profile), including degraded-path and session-continuity evidence.
15. Lane `K` (`ORV-036` through `ORV-038`) remains `PENDING` and intentionally not started in this execution; DAT-native production acceptance in lane `K` remains gated by `ORV-023` physical-device evidence.
