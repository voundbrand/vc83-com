# Operator Mobile Realtime Voice Runtime Master Plan

**Date:** 2026-02-27  
**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/operator-mobile-realtime-voice-runtime`

---

## Mission

Ship world-class realtime voice for `operator-mobile` with:

1. provider-backed low-latency streaming paths,
2. deterministic fallback (`webrtc` -> `websocket` -> `chunked_fallback`),
3. clean barge-in interruption (no overlap deadlocks),
4. transcript continuity in the same chat thread,
5. production observability and security guarantees.

Then layer video feed integration on the same runtime contract after voice release readiness is complete.

---

## Product Decisions (Locked)

1. `voiceRuntime` + `transportRuntime` metadata parity is mandatory across all transport modes.
2. Unified identifiers are canonical: `liveSessionId`, `voiceSessionId`, `interviewSessionId`, and conversation continuity IDs.
3. Realtime path is transport-first:
   - primary: `webrtc` when available,
   - fallback: `websocket` PCM streaming,
   - terminal fallback: existing chunked upload/turn-based path.
4. Barge-in is dual-layer:
   - local immediate playback stop,
   - remote stream cancel/interrupt signal.
5. Security model is fail-closed:
   - session auth required,
   - source attestation preserved,
   - org/session scope validated per stream open.
6. Video layering order is explicit:
   - voice release-critical lanes first,
   - video crossover lane executes only after canary/rollback readiness is complete.

---

## Architecture Blueprint

### Layer 1: Transport protocol contract

1. Versioned wire contract `voice_transport_v1`.
2. Envelope event types:
   - `session_open`,
   - `audio_chunk`,
   - `partial_transcript`,
   - `final_transcript`,
   - `assistant_audio_chunk`,
   - `assistant_audio_final`,
   - `barge_in`,
   - `session_close`,
   - `heartbeat`,
   - `error`.
3. Mandatory per-event metadata:
   - `contractVersion`,
   - `liveSessionId`,
   - `voiceSessionId`,
   - `interviewSessionId`,
   - `sequence`,
   - `timestampMs`.
4. Transport mode lock:
   - `transportMode` is required on each envelope and constrained to `webrtc` or `websocket`.
5. PCM contract lock:
   - `encoding` (`pcm_s16le` or `pcm_f32le`),
   - `sampleRateHz`,
   - `channels`,
   - `frameDurationMs`.
6. Sequencing + retry lock:
   - monotonic `sequence` with optional `previousSequence` continuity checks,
   - optional `retry` metadata (`attempt`, `maxAttempts`, deterministic retry reason).
7. Heartbeat + error taxonomy lock:
   - `heartbeat` events require heartbeat metadata (`intervalMs`, `timeoutMs`, optional `ackSequence`),
   - `error` events require deterministic error metadata with fixed `vt_*` codes and explicit `retryable`.
8. Shared runtime parity map lock (`voiceRuntime` + `transportRuntime`):
   - canonical session identifiers: `liveSessionId`, `voiceSessionId`, `interviewSessionId`,
   - voice runtime fields: `sessionState`, `providerId`, `language`, `sampleRateHz`, `runtimeError`, `fallbackReason`,
   - transport runtime fields: `mode`, `fallbackReason`, `transportId`, `protocol`, diagnostics fields, and observability fields,
   - attestation parity fields: `sourceAttestation.contractVersion`, `verificationStatus`, `verified`, and deterministic `reasonCodes`.

### Layer 2: Backend realtime runtime

1. Realtime relay endpoint(s) with authenticated session handshake.
2. Session FSM:
   - `opening`, `open`, `degraded`, `closing`, `closed`, `error`.
3. Streaming pipelines:
   - PCM ingest -> STT partial/final transcripts,
   - assistant text -> TTS chunk stream.
4. Transcript continuity persistence:
   - incremental updates tied to same conversation thread.

### Layer 3: Mobile runtime

1. Frame streaming while recording in LIVE mode.
2. Transport adapter selection and automatic failover.
3. Playback queue supporting chunk stream and interruption.
4. Barge-in control:
   - stop local playback,
   - emit remote cancel,
   - clear stale queue state.

### Layer 4: Reliability + operations

1. SLO/SLI + telemetry correlation.
2. Chaos and network degradation tests.
3. Canary rollout with fallback-rate guards and rollback criteria.

### Layer 5: End-layer video crossover

1. Reuse same authenticated realtime runtime for camera/video feed transport.
2. Keep metadata/session parity with voice lanes (`liveSessionId`, `interviewSessionId`, transport observability).
3. Enforce additive rollout so video cannot regress established voice SLAs.

---

## Risks and mitigations

1. **Protocol drift risk**
   - Mitigation: typed contract validators and contract tests in both client/server lanes.
2. **Low-latency instability risk**
   - Mitigation: jitter buffers, reconnect budgets, explicit downgrade transitions.
3. **Playback compatibility risk**
   - Mitigation: codec negotiation, stream/chunk playback path, bounded fallback to speech synthesis.
4. **Barge-in race conditions**
   - Mitigation: single playback authority, interrupt tokens, idempotent cancel handling.
5. **Security abuse risk**
   - Mitigation: authenticated session open, source attestation checks, per-session quotas and rate limits.
6. **Voice regression from late video integration**
   - Mitigation: gated end-layer lane with explicit dependency on voice canary readiness and parity contract reuse.

---

## Release gates

1. Voice session lifecycle rows complete with passing integration tests.
2. Partial transcript P95 latency within target under normal network profile.
3. Barge-in interruption P95 latency within target and no overlap deadlocks in soak tests.
4. Fallback behavior validated in forced outage scenarios for `webrtc` and `websocket`.
5. Docs queue artifacts synchronized and `npm run docs:guard` passing.
6. Video crossover lane starts only after voice release readiness gates are complete.
