# Operator Mobile Realtime Voice Runtime Index

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/operator-mobile-realtime-voice-runtime`  
**Source request:** Build world-class operator mobile voice runtime with provider-backed realtime transport, deterministic fallback, interruptible playback, and production-grade reliability/observability/security, then layer video feed crossover at the end.

---

## Purpose

This workstream defines how to deliver production-grade realtime voice on `operator-mobile` by closing:

1. transport protocol contract (`webrtc` + `websocket` + `chunked_fallback`),
2. backend realtime runtime (streaming ingest/egress + session FSM + transcript continuity),
3. mobile streaming runtime (low-latency capture, playback, barge-in, reconnection),
4. reliability, observability, and security hardening gates.
5. end-layer video crossover on the same runtime contract after voice readiness.

---

## Core files

- Queue:
  `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/operator-mobile-realtime-voice-runtime/TASK_QUEUE.md`
- Session prompts:
  `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/operator-mobile-realtime-voice-runtime/SESSION_PROMPTS.md`
- Master plan:
  `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/operator-mobile-realtime-voice-runtime/MASTER_PLAN.md`
- Index:
  `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/operator-mobile-realtime-voice-runtime/INDEX.md`

---

## Scope boundary

Owned here:

1. voice transport protocol + runtime metadata parity contracts,
2. Convex HTTP + voiceRuntime integration for realtime session lifecycle,
3. operator-mobile streaming client path (capture, transcripts, playback, barge-in),
4. fallback policy and production rollout gates,
5. explicit end-layer video crossover tasks and dependencies.

Not owned here:

1. unrelated desktop UI redesign workstreams,
2. non-voice product surfaces outside shared media runtime contract needs,
3. provider commercial/account operations policy outside runtime integration.

---

## Status snapshot

1. `ORV-001`, `ORV-002`, and `ORV-003` are `DONE`; lane `A` and lane `B` session-FSM/open-close backend gate is complete.
2. Next promotable row is `ORV-005` (lane `B` assistant TTS chunk relay + server barge-in cancellation path).
3. All lanes must keep metadata parity with existing `voiceRuntime`/`transportRuntime` fields used by AI chat ingress.
4. Release is blocked until realtime latency, interruption, and fallback SLO rows are `DONE`.
5. Video crossover lane is intentionally deferred until voice canary readiness is complete.
