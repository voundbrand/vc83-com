# Operator Mobile Realtime Voice Runtime Master Plan

**Date:** 2026-03-05  
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

Then implement `conversation_interaction_v1` in the main AI chat UI (web + desktop + iPhone) so agents can be validated quickly with back-and-forth audio/video feed sessions.

Then execute post-audit lane `M` to close mobile PCM contract drift and implement unified turn-state/VAD/barge-in/race-cleanup behavior without regressing existing ORV invariants.

Execution snapshot (2026-03-05):

1. `ORV-026` is `DONE` with canonical web/desktop conversation state machine + persistent HUD (`idle`, `connecting`, `live`, `reconnecting`, `ending`, `ended`, `error`) and standardized `conversation_*` events with deterministic reason-code mapping.
2. `ORV-033` is `DONE` with iPhone canonical state/event parity and shared deterministic reason taxonomy.
3. `ORV-028`, `ORV-029`, `ORV-035`, and `ORV-030` are `DONE` (2026-03-03); cross-surface parity gate and final smoke evidence are complete.
4. Lane `K` software hardening is complete: `ORV-036`, `ORV-037`, and `ORV-038` are `DONE`; DAT-native production acceptance remains gated by `ORV-023` physical-device evidence.
5. Lane `L` baseline + implementation execution is complete: `ORV-039` through `ORV-044` are `DONE` after final regression/go-no-go closure.
6. Lane `L` non-negotiable gate is now deterministic: transport must implement both `websocket_primary` and `webrtc_fallback` routes; STT must implement both `scribe_v2_realtime_primary` and `gemini_native_audio_failover` routes before `ORV-044` can be `DONE`.
7. Cross-workstream truth gate (`ARH-M-001`): DAT-native readiness is `NO_GO` until `ORV-023` physical-device artifacts exist for both iOS and Android; existing lane-`L` `GO` evidence is non-DAT scope only.
8. Lane `M` corrective tranche is complete from the 2026-03-05 audit: `ORV-045` through `ORV-052` are `DONE`.
9. Lane `M` `P0` gate evidence is complete: mobile PCM defaults are enforced at `24_000 Hz` and `voice_transport_v1` envelope validation now rejects non-contract sample rates fail-closed before behavioral refactor rows.
10. Lane `M` closeout parity evidence (`ORV-052`) is now complete with explicit web/desktop parity impact `none` after `ORV-050` mode-switch cleanup closure and `ORV-051` state-driven HUD mapping completion.

## Cross-workstream DAT-native blocker ledger (`ARH-M-001` sync)

| Claim scope | Status | Gate | Required artifacts | Owner | Next review date |
|---|---|---|---|---|---|
| DAT-native production readiness (iOS + Android Meta DAT callback path) | `NO_GO` | `ORV-023` = `BLOCKED` | `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/operator-mobile-realtime-voice-runtime/artifacts/orv-023/physical-device/ios/`; `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/operator-mobile-realtime-voice-runtime/artifacts/orv-023/physical-device/android/`; canary decision log update in `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/operator-mobile-realtime-voice-runtime/ORV_014_CANARY_EXECUTION_LOG.md` | Lane `H` mobile runtime + device QA owners (`ORV-023`) | `2026-03-12` |
| Web/desktop realtime PCM migration and non-DAT conversation flows | `GO` | `ORV-044` = `DONE` | `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/operator-mobile-realtime-voice-runtime/ORV_014_CANARY_EXECUTION_LOG.md` (`ORV-044` section) | Lane `L` owners (`ORV-044`) | `2026-03-12` |

Stale-claim invalidation rule: any `GO` statement that implies DAT-native readiness without both physical-device artifact bundles is stale and must be interpreted as `NO_GO`.

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
7. Main AI chat conversation UX is contract-first:
   - composer surface exposes `Conversation` next to `Dictate`,
   - `Conversation` offers `voice` and `voice_with_eyes` modes,
   - no standalone always-visible eyes button.
8. `meta_glasses` is a capability source under `voice_with_eyes`, not a standalone mode:
   - webcam-first rollout is allowed while physical DAT validation remains blocked,
   - source drop must degrade to voice with deterministic reason codes.
9. Concurrent rollout policy is explicit:
   - lane `I` (web/desktop) and lane `J` (iPhone) can execute in parallel with one active row per lane,
   - final smoke promotion requires cross-surface parity checkpoint completion.
10. Raw audio truthfulness is explicit:
   - if an envelope claims PCM metadata, payload bytes must be PCM,
   - containerized payloads (`webm`/`mp4`) are treated as fallback transport artifacts and cannot be mislabeled as PCM primary path.
11. Mobile PCM contract parity is explicit in lane `M`:
   - mobile frame and bridge defaults must align to `24_000 Hz`,
   - schema validators must reject non-contract sample rates for `voice_transport_v1` envelopes in lane `M` acceptance scope.
12. Mobile turn flow is explicitly reducer-driven in lane `M`:
   - canonical turn states are `idle`, `listening`, `thinking`, `agent_speaking`,
   - UI/HUD rendering and capture/playback transitions derive from reducer state, not distributed boolean heuristics.
13. Lane `M` cleanup is fail-closed:
   - mode switch to chat must reset turn state and cancel pending autospeak/synthesis work,
   - no transcribing/loading bleed is allowed across mode boundaries.
14. Lane `M` isolation rule:
   - preserve ORV-010 through ORV-044 invariants and `/api/v1/ai/voice/*` compatibility,
   - do not modify `convex/ai/agentExecution.ts`.

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

### Layer 6: Main AI chat conversation interaction rollout (web + desktop + iPhone)

1. Implement `conversation_interaction_v1` in main AI chat composer and live HUD.
2. Support mode picker (`voice`, `voice_with_eyes`) and source selector (`webcam`, `meta_glasses`).
3. Bind standardized `conversation_*` events and reason codes for deterministic telemetry and regressions.
4. Preserve `/api/v1/ai/voice/*` compatibility and transcript continuity with existing agent threads.
5. Prioritize fast feed validation loops for agent back-and-forth testing (`voice` and `voice_with_eyes`).
6. Execute iPhone parity in parallel with web/desktop while preserving identical mode/state/reason-code behavior.

### Layer 7: Web/Desktop reference parity remediation (lane `L`)

1. Replace `MediaRecorder` container-first capture with fixed-frame PCM capture for ElevenLabs primary STT path.
2. Introduce persistent realtime STT session handling (`scribe_v2_realtime`) with partial/final transcript streaming.
3. Add streaming TTS path parity so web/desktop interruption behavior matches existing realtime lanes.
4. Keep batch upload and one-shot synthesis routes as explicit resilience fallback until regression evidence confirms promotion.

### Layer 8: Mobile post-audit corrective closure (lane `M`)

1. Enforce mobile PCM parity by aligning frame/bridge defaults and strict envelope validation to frozen `24_000 Hz` contract values.
2. Add unified `ConversationTurnState` reducer and wire all mobile turn-flow transitions through it (`index.tsx` and `VoiceModeModal.tsx`).
3. Add per-frame RMS reporting and VAD endpointing (`0.015` threshold, `320ms` silence) to auto-finalize user utterances.
4. Make barge-in proactive by stopping playback and cancelling in-flight TTS immediately on capture start/speech onset during `agent_speaking`.
5. Add race/guard controls: final-frame mutex, post-playback recorder debounce (`200-500ms`), and single-path assistant autospeak gating.
6. Require full mode-switch teardown to `idle` with cancellation/reset semantics before returning to chat mode.
7. Close with explicit parity verification across mobile and web/desktop conversation contracts.

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
7. **Container/audio-contract mismatch risk (`pcm` metadata with non-PCM payloads)**
   - Mitigation: explicit truthfulness guardrails, raw PCM capture path as primary, and regression checks proving corruption-class error elimination.
8. **Mobile turn-state divergence risk (boolean drift vs reducer state)**
   - Mitigation: canonical turn-state reducer + state-driven HUD/orb mapping + deterministic transition tests.
9. **Lane `M` parity regression risk (mobile fixes diverge from web/desktop behavior)**
   - Mitigation: lane `M` closeout requires explicit desktop/mobile parity reruns and documented impact report.

---

## Release gates

1. Voice session lifecycle rows complete with passing integration tests.
2. Partial transcript P95 latency within target under normal network profile.
3. Barge-in interruption P95 latency within target and no overlap deadlocks in soak tests.
4. Fallback behavior validated in forced outage scenarios for `webrtc` and `websocket`.
5. Physical radio/link impairment lane automated for Android hardware and checklist-generated for iOS hardware, with artifact bundle retention.
6. Docs queue artifacts synchronized and `npm run docs:guard` passing.
7. Video crossover lane starts only after voice release readiness gates are complete.
8. Main AI chat lane completes with desktop e2e evidence for both `voice` and `voice_with_eyes`.
9. Degradation path (`voice_with_eyes` -> `voice`) is deterministic and user-visible when feed source drops/unavailable.
10. Rapid smoke matrix evidence is published for web + desktop agent feed validation.
11. iPhone parity lane completes with mobile e2e evidence for both `voice` and `voice_with_eyes`.
12. Cross-surface parity checkpoint evidence is published before final smoke go/no-go.
13. Lane `L` promotion evidence proves web/desktop primary capture/transcribe path no longer depends on containerized `audio/webm` uploads for ElevenLabs realtime flow.
14. Lane `M` `P0` evidence proves mobile `voice_transport_v1` envelopes and bridge defaults use `24_000 Hz`, and schema validation rejects non-contract sample rates.
15. Lane `M` turn-state evidence proves deterministic `idle -> listening -> thinking -> agent_speaking` loop semantics with no distributed-boolean fallback.
16. Lane `M` VAD evidence proves auto-finalization at `320ms` endpoint silence after speech onset using per-frame RMS telemetry.
17. Lane `M` race/guard evidence proves no dual-path autospeak, no final-frame/assistant overlap race, and recorder auto-start debounce stabilization.
18. Lane `M` closeout evidence explicitly reports web/desktop parity impacts (or confirms none) and preserves DAT-native `NO_GO` status while `ORV-023` is `BLOCKED`.

---

## ORV-014 Canary rollout and rollback plan

Reference runbook:
`/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/operator-mobile-realtime-voice-runtime/ORV_014_CANARY_RUNBOOK.md`

### Mandatory guardrails

1. Preserve ORV-010 continuity/session invariants with no reconnect replay regressions.
2. Preserve ORV-011 trust telemetry ingestion and deterministic `vt_*` taxonomy mapping.
3. Preserve ORV-012 chaos/fallback coverage and hardware impairment automation evidence chain.
4. Preserve ORV-013 security posture:
   - server-issued session-open attestation proof flow remains authoritative,
   - strict mobile fail-closed checks for missing live/source identity metadata remain enforced,
   - adaptive per-tier open-session rate limits remain active.
5. Preserve `/api/v1/ai/voice/*` compatibility and shared runtime parity commitments.

### Rollout policy summary

1. Stage progression: `0%` -> `5%` -> `15%` -> `30%` -> `50%` -> `100%`.
2. Every stage requires full policy-matrix budget compliance for minimum dwell windows.
3. Automatic rollback executes on hard trigger or repeated threshold breach without waiting for manual approval.
4. Promotion to `50%` and `100%` requires signed go/no-go checklist and owner handoff confirmation.

---

## ORV-015 Video transport parity contract

1. Add `videoRuntime` as a first-class runtime metadata sibling to `cameraRuntime` and `voiceRuntime` in shared media session runtime contracts.
2. Lock unified session identity parity:
   - `liveSessionId` and `interviewSessionId` stay canonical at envelope level,
   - `videoRuntime.videoSessionId` is required when `videoRuntime` is present (fail-closed invariant).
3. Lock runtime parity fields for video lane reuse:
   - `sessionState`,
   - `providerId`,
   - `runtimeError`,
   - `fallbackReason`,
   - transport observability remains in shared `transportRuntime`.
4. Preserve additive compatibility:
   - no `/api/v1/ai/voice/*` behavior changes,
   - no divergence from lane `A` parity rules,
   - no weakening of ORV-010 through ORV-014 guardrails.

## ORV-016 Backend video relay bridge integration

1. Add authenticated video frame ingress bridge endpoint:
   - `POST /api/v1/ai/voice/video/frame`
   - same session-auth runtime boundary as existing voice endpoints.
2. Enforce deterministic sequencing using `videoRuntime.packetSequence`:
   - decisions: `accepted`, `duplicate_replay`, `gap_detected`.
3. Enforce per-session frame-rate controls:
   - fixed-window gate with `rate_limited` decision and `retryAfterMs`.
4. Persist keyed checkpoint state (`organizationId`, `interviewSessionId`, `liveSessionId`, `videoSessionId`) for replay and rate-control enforcement.
5. Keep implementation additive:
   - no behavior change to existing `/api/v1/ai/voice/*` endpoints,
   - no voice SLA regression.

## ORV-017 Operator-mobile video feed client path

1. Add operator-mobile client bridge integration for `POST /api/v1/ai/voice/video/frame`:
   - add typed API client path for media-session envelope ingest,
   - keep request auth/session boundary identical to existing voice endpoints.
2. Add deterministic capture cadence control:
   - enforce bounded frame cadence before ingress calls,
   - emit deterministic throttle reason (`capture_backpressure`) and retry window metadata.
3. Preserve transport fallback parity with voice runtime:
   - derive video transport runtime mode/fallback reason from active voice transport selection and realtime readiness,
   - preserve additive behavior when source policy/device readiness degrades.
4. Extend operator-mobile observability surface:
   - project video session/sequence/decision counters into outbound `transportRuntime` and AV observability metadata,
   - keep voice release-critical runtime paths unchanged.
5. Verification gate for completion:
   - `npm run mobile:typecheck`,
   - `npm run mobile:lint`,
   - `npm run test:e2e:mobile`,
   - `npm run docs:guard`.

## ORV-018 Cross-transport soak and rollback-drill hardening

1. Execute deterministic soak coverage for mixed voice/video runtime sessions across transport transitions:
   - `webrtc` stable sessions,
   - `websocket_preferred` sessions with HTTP fallback path,
   - forced reconnect and fallback transitions under load.
2. Prove non-regression for voice release-critical behavior while video remains additive:
   - ORV-010 continuity/session invariants,
   - ORV-011 telemetry ingestion and `vt_*` taxonomy integrity,
   - ORV-012 chaos/fallback behavior and evidence-chain quality,
   - ORV-013 auth hardening fail-closed posture,
   - ORV-014 canary/rollback controls,
   - ORV-015 through ORV-017 video parity/relay/client contracts.
3. Execute rollback-drill checks using ORV-014 policy budgets and record outcomes in canary execution artifacts.
4. Keep interface compatibility frozen:
   - no behavior change to existing `/api/v1/ai/voice/*` endpoints,
   - no schema divergence from `voiceRuntime` and `transportRuntime` parity commitments.
5. Verification gate for completion:
   - `npm run typecheck`,
   - `npm run test:unit`,
   - `npm run test:integration`,
   - `npm run mobile:typecheck`,
   - `npm run mobile:lint`,
   - `npm run test:e2e:mobile`,
   - `npm run docs:guard`.
6. Execution evidence (2026-03-02):
   - integration hardening added a verifiable source-attestation allow-path test that preserves fail-closed behavior when verification fails,
   - mobile e2e chaos probe now validates `websocket_preferred` to HTTPS fallback parity and rollback-budget decisioning (`PROMOTE` without threshold breach),
   - verify stack was green for `V-TYPE`, `V-UNIT`, `V-INTEG`, `V-MOBILE-TYPE`, `V-MOBILE-LINT`, `V-E2E-MOBILE`, and `V-DOCS`.

## ORV-019 Continuous canary budget monitoring and rollback automation

1. Add deterministic budget-monitor checks that continuously evaluate:
   - latency/fallback/provider-failure thresholds from ORV-014 policy budgets,
   - additive video-runtime impact against voice release-critical SLO budgets.
2. Require deterministic stage decision output for each monitoring window:
   - `PROMOTE`,
   - `HOLD`,
   - `ROLLBACK`.
3. Preserve carry-forward invariants:
   - ORV-010 continuity/session invariants,
   - ORV-011 telemetry ingestion and taxonomy integrity,
   - ORV-012 chaos/fallback guarantees,
   - ORV-013 fail-closed auth posture,
   - ORV-014 canary/runbook controls,
   - ORV-015 through ORV-018 video parity and soak contracts.
4. Keep API/runtime compatibility frozen:
   - no behavior changes for `/api/v1/ai/voice/*`,
   - no contract drift in `voiceRuntime` and `transportRuntime`.
5. Verification gate for completion:
   - `npm run typecheck`,
   - `npm run test:unit`,
   - `npm run test:integration`,
   - `npm run docs:guard`.
6. Execution evidence (2026-03-02):
   - added `voice_runtime_canary_budget_v1` evaluator with deterministic window decisions (`PROMOTE`, `HOLD`, `ROLLBACK`) and explicit reason codes,
   - enforced threshold evidence for coverage, latency breaches, fallback transitions, provider failures, reconnect pressure, and interruption pressure,
   - integration and unit verification now assert deterministic canary decision outcomes across promote/hold/rollback scenarios.

## ORV-020 Native DAT ingress callback contract freeze

1. Lock cross-platform callback map from true DAT `StreamSession` surfaces:
   - iOS video frame callback -> `MetaGlassesBridgeRuntime.publishFrameIngress(timestampMs, droppedFrames)`,
   - iOS audio packet callback -> `MetaGlassesBridgeRuntime.publishAudioIngress(timestampMs, sampleRate, packetDelta)`,
   - Android video frame callback -> `MetaGlassesBridgeRuntimeHooks.publishFrameIngress(timestampMs, droppedFrames)`,
   - Android audio packet callback -> `MetaGlassesBridgeRuntimeHooks.publishAudioIngress(timestampMs, sampleRate, packetDelta)`.
2. Freeze frame and audio ingress event semantics:
   - each accepted video callback increments `frameIngress.totalFrames` by exactly `1`,
   - `droppedFrames` increments by `max(0, callbackDroppedFrames)`,
   - each accepted audio callback increments `audioIngress.packetCount` by `max(1, packetDelta)`,
   - `lastFrameTs` and `lastPacketTs` store normalized epoch-millisecond timestamps.
3. Freeze deterministic timestamp normalization:
   - accepted units: nanoseconds, microseconds, milliseconds, or seconds from DAT callback payloads,
   - convert to epoch milliseconds using deterministic thresholds (`ns` -> `/1_000_000`, `us` -> `/1_000`, `s` -> `*1_000`, `ms` passthrough),
   - if callback timestamp is missing, non-finite, or non-positive, fallback to native `nowMs()`,
   - normalization applies identically on iOS and Android.
4. Freeze deterministic sample-rate and packet normalization:
   - `sampleRateHz` normalization floor remains `8_000` to preserve existing bridge runtime guard behavior,
   - missing/invalid sample-rate input falls back to prior sample rate, defaulting to `16_000`,
   - `packetDelta <= 0` normalizes to `1` (never decrement packet counters).
5. Freeze lifecycle invariants for register/teardown/reconnect safety:
   - callback listener registration occurs only when DAT SDK is available and session/device context is active,
   - listener teardown is mandatory on `disconnect`, connector `stop`, module `invalidate`/`deinit`, and session replacement,
   - reconnect must be generation-safe: no duplicate listener stacks and no callback events applied from stale sessions.
6. Freeze diagnostics and fail-closed posture:
   - true SDK absence remains fail-closed with `dat_sdk_unavailable` and blocks release promotion,
   - callback surface absence/degradation (`StreamSession` hooks unavailable, not bound, or stalled) must emit explicit diagnostics and evidence flags; it is never accepted as production-ready ingress,
   - placeholder/manual ingress paths are retained only for test scaffolding and cannot satisfy ORV-021/ORV-022/ORV-023 acceptance.
7. Preserve compatibility and prior-lane invariants:
   - no behavior breakage for `/api/v1/ai/voice/*`,
   - ORV-010 through ORV-019 continuity, telemetry taxonomy, fallback, security, and canary invariants remain mandatory,
   - lane `H` implementation rows (`ORV-021` through `ORV-023`) must consume this contract without schema drift in `voiceRuntime`, `transportRuntime`, or bridge diagnostics.
8. Verification gate for completion:
   - `npm run mobile:typecheck`,
   - `npm run docs:guard`.

## ORV-021 iOS DAT callback binding implementation

1. Bind true iOS DAT `StreamSession` callback surfaces for both video and audio ingress.
2. Map callback payloads into bridge runtime events:
   - frame callbacks update frame ingress counters,
   - audio callbacks update packet/sample-rate ingress counters.
3. Enforce lifecycle cleanup:
   - remove all listener tokens on stop/deinit,
   - ensure reconnect does not duplicate listeners.
4. Preserve compatibility and fail-closed behavior:
   - no regressions to existing `MetaGlassesBridge` connection state machine,
   - no API contract changes for JS layer snapshots.
5. Verification gate for completion:
   - `npm run mobile:typecheck`,
   - `npm run typecheck`,
   - `npm run docs:guard`.
6. Execution evidence (2026-03-02):
   - wired iOS `videoFramePublisher` callbacks to `publishFrameIngress(timestampMs,droppedFrames)` with deterministic timestamp normalization and dropped-frame semantics,
   - added iOS audio callback-surface binding against `StreamSession` audio publishers, mapping payloads to `publishAudioIngress(timestampMs,sampleRate,packetDelta)` with sample-rate and packet-delta normalization,
   - added callback-surface diagnostics (`dat_audio_callback_surface_unavailable`, `dat_video_callback_stalled`, `dat_audio_callback_stalled`) as explicit non-acceptance signals while preserving fail-closed `dat_sdk_unavailable`,
   - hardened lifecycle cleanup/reconnect safety by stopping the connector on bridge disconnect and clearing callback listener state/tokens on stop/deinit.

## ORV-022 Android DAT callback binding implementation

1. Bind true Android DAT callback surfaces for video/audio ingress using direct APIs where available and reflection-safe fallbacks where required by build variants.
2. Map callback payloads into runtime hooks:
   - `publishFrameIngress` and `publishAudioIngress` must emit from actual DAT callbacks.
3. Enforce lifecycle safety:
   - listener registration idempotency,
   - guaranteed teardown on connector stop/module invalidate,
   - reconnect-safe state reset.
4. Preserve bridge compatibility:
   - no regression to connection-state transitions,
   - no schema drift in snapshot payload fields consumed by JS contracts.
5. Verification gate for completion:
   - `npm run mobile:typecheck`,
   - `npm run typecheck`,
   - `npm run docs:guard`.
6. Execution evidence (2026-03-02):
   - added reflection-safe Android DAT callback binding for `StreamSession` frame and audio publishers with listener adapter compatibility across `listen`/`addListener`/`addObserver`/`subscribe` surfaces,
   - mapped callback payloads to bridge runtime hooks `publishFrameIngress(timestampMs,droppedFrames)` and `publishAudioIngress(timestampMs,sampleRate,packetDelta)` with ORV-020 normalization (`ns/us/s/ms` timestamp normalization, sample-rate floor `8_000`, packet floor `1`),
   - added explicit callback diagnostics for absent/degraded callback surfaces (`dat_video_callback_surface_unavailable`, `dat_audio_callback_surface_unavailable`, `dat_video_callback_stalled`, `dat_audio_callback_stalled`) while preserving fail-closed `dat_sdk_unavailable`,
   - enforced lifecycle-safe listener teardown and reconnect behavior by clearing listener handles on connector stop and calling connector stop on module disconnect/invalidate.

## ORV-023 Physical-device DAT ingress validation and rollout evidence

1. Acceptance criteria (must pass on both iOS and Android physical DAT-device runs):
   - native callback-driven `frameIngress.totalFrames` increases during live ingest (not manual/placeholder ingress),
   - native callback-driven `audioIngress.packetCount` increases during live ingest (with ORV-020 packet/sample-rate normalization),
   - connection state remains stable through planned reconnect cycles (no stale-listener duplicate events),
   - callback-surface degraded/absent diagnostics are explicitly captured (`dat_video_callback_surface_unavailable`, `dat_audio_callback_surface_unavailable`, `dat_video_callback_stalled`, `dat_audio_callback_stalled`) with release-gating decisions.
2. Rollback triggers (automatic `HOLD`/`ROLLBACK` candidate):
   - callback stall without disconnect while session state remains `connected`,
   - repeated audio ingress dropouts or non-monotonic packet counter behavior during active ingest windows,
   - state-machine instability across reconnect cycles (listener duplication, stale-session callback application, or oscillating connect/disconnect churn),
   - true SDK absence (`dat_sdk_unavailable`) at runtime on intended DAT-capable builds.
3. Artifact capture locations:
   - verify command artifacts: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/operator-mobile-realtime-voice-runtime/artifacts/orv-023/`,
   - required physical-device evidence bundles: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/operator-mobile-realtime-voice-runtime/artifacts/orv-023/physical-device/ios/` and `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/operator-mobile-realtime-voice-runtime/artifacts/orv-023/physical-device/android/`,
   - canary/evidence decision log: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/operator-mobile-realtime-voice-runtime/ORV_014_CANARY_EXECUTION_LOG.md`.
4. Preserve invariants while validating:
   - keep `/api/v1/ai/voice/*` compatibility unchanged,
   - keep ORV-010 through ORV-022 continuity/telemetry/fallback/security/callback contract invariants explicit,
   - preserve fail-closed behavior for true SDK absence (`dat_sdk_unavailable`).
5. Verification gate for completion:
   - `npm run mobile:typecheck`,
   - `npm run test:e2e:mobile`,
   - `npm run docs:guard`.
6. Execution evidence update (2026-03-02):
   - verification commands executed with artifacts captured under `artifacts/orv-023/` (`mobile:typecheck` pass, `docs:guard` pass, `test:e2e:mobile` pass when rerun outside sandbox after in-sandbox port-bind EPERM),
   - ORV-023 remains `BLOCKED` because cross-platform physical-device DAT validation could not be executed in this environment (`adb` unavailable, CoreSimulator service unavailable, no tethered DAT-capable iOS/Android hardware/runtime access),
   - next executable step is to run the physical-device matrix on tethered DAT-capable iOS + Android devices and publish ingress/reconnect/diagnostic evidence in the required `physical-device/{ios,android}` artifact folders.

## ORV-024 through ORV-035 Main AI chat UI + iPhone concurrent conversation rollout plan

1. `ORV-024` is `DONE` (2026-03-03): implementation mapping from `conversation_interaction_v1` to concrete web/desktop chat handlers is frozen in checklist section `7`.
2. `ORV-031` is `DONE` (2026-03-03): iPhone mapping from the same contract is frozen in checklist section `8`.
3. Lanes execute in parallel with one active row each where dependencies allow:
   - lane `I`: `ORV-025` -> `ORV-030`,
   - lane `J`: `ORV-032` -> `ORV-035`.
4. `ORV-025` is `DONE` (2026-03-03) with web/desktop composer UX contract updates:
   - `Conversation` control beside `Dictate`,
   - mode picker (`Voice only`, `Voice + Eyes`),
   - explicit session start confirmation.
5. `ORV-026` ships web/desktop canonical session state machine and persistent live HUD (`idle`, `connecting`, `live`, `reconnecting`, `ending`, `ended`, `error`).
6. `ORV-027` is `DONE` (2026-03-03): web/desktop eyes-source capability negotiation for `webcam` and `meta_glasses` now includes fail-closed availability reason mapping and deterministic degrade-to-voice behavior.
7. `ORV-028` is `DONE` (2026-03-03): web/desktop conversation mode metadata now propagates end-to-end through runtime/agent paths (`conversationRuntime`), preserving `/api/v1/ai/voice/*` compatibility, `conversation_interaction_v1` semantics, and fail-closed `dat_sdk_unavailable` behavior.
8. `ORV-029` is `DONE` (2026-03-03) with desktop/web regression coverage for:
   - `voice` live sessions,
   - `voice_with_eyes` sessions,
   - permission-denied flows,
   - reconnect/source-drop degradation and fallback invariants.
9. `ORV-032` is `DONE` (2026-03-03) with iPhone conversation UX parity (entrypoint, mode picker, live HUD).
10. `ORV-033` ships iPhone state/event parity for canonical `conversation_*` contract behavior.
11. `ORV-034` is `DONE` (2026-03-03): iPhone `voice_with_eyes` source negotiation now includes Meta preference path, deterministic contract reason mapping, and active-session degrade-to-voice path.
12. `ORV-035` is `DONE` (2026-03-03): shared parity gate assertions now enforce identical mode/state/event/reason behavior across web/desktop and iPhone with fail-closed `dat_sdk_unavailable` parity.
13. `ORV-030` is `DONE` (2026-03-03): final smoke matrix evidence/go-no-go notes are published for web + desktop + iPhone with explicit `voice` and `voice_with_eyes` pass/fail, degraded-path, and session-continuity outcomes.
14. Lane dependency and unblock policy:
   - lane `I` starts after `ORV-019`,
   - lane `J` starts after `ORV-024` and runs concurrently with lane `I`,
   - lane `H` `ORV-023` blocker does not block webcam-first lane `I`/`J`,
   - Meta physical-device validation evidence still required for production claims involving DAT hardware path.

## ORV-036 through ORV-038 true live AV + multimodal agentic milestone plan (2026-03-03)

1. Milestone 1 (`ORV-036`, lane `K`, `P0`):
   - implement true media-plane streaming (raw audio/video payloads) from mobile capture and DAT callback surfaces into authenticated realtime uplinks;
   - eliminate metadata-only ingress as the primary mechanism for live perception;
   - preserve deterministic sequence/backpressure/degrade semantics and existing `voiceRuntime`/`transportRuntime` metadata contracts.
2. Milestone 2 (`ORV-037`, lane `K`, `P0`):
   - implement server-side realtime AV orchestration as the primary path (audio delta + video delta + interruption/EOU policy);
   - keep chunk/fallback transcription as resilience fallback only;
   - preserve `/api/v1/ai/voice/*` compatibility and ORV-010 through ORV-023 continuity/security invariants.
3. Milestone 3 (`ORV-038`, lane `K`, `P1`):
   - deliver multimodal agentic workflow/execution runtime with live-session tool/MCP orchestration and multi-agent handoff;
   - keep non-bypassable approval invariants intact;
   - publish deterministic cross-surface evidence (`voice`, `voice_with_eyes`) with explicit go/no-go outcomes.
4. Dependency gates:
   - lane `K` activation requires `ORV-030` and `ORV-035` (end-of-workstream hardening loop),
   - `ORV-038` depends on cross-surface parity checkpoint `ORV-035`,
   - DAT-native production claims in lane `K` remain gated by `ORV-023` physical-device evidence.
5. Verification gates per milestone:
   - `ORV-036`: `npm run mobile:typecheck`, `npm run typecheck`, `npm run test:unit`, `npm run test:integration`, `npm run test:e2e:mobile`, `npm run docs:guard`,
   - `ORV-037`: `npm run typecheck`, `npm run test:unit`, `npm run test:integration`, `npm run test:e2e:desktop`, `npm run test:e2e:mobile`, `npm run docs:guard`,
   - `ORV-038`: `npm run typecheck`, `npm run test:unit`, `npm run test:integration`, `npm run test:e2e:desktop`, `npm run test:e2e:mobile`, `npm run docs:guard`.

## Reference projects vs current codebase gap analysis (ORV-039 baseline, 2026-03-04)

1. ORV-039 execution outcome:
   - Transition completed: `READY` -> `IN_PROGRESS` -> `DONE` (docs-only baseline freeze).
   - Compatibility invariant preserved: `/api/v1/ai/voice/*` endpoints remain unchanged during baseline work.
   - Fallback invariant preserved: existing batch transcribe/synthesize flows remain explicit resilience paths during lane `L` migration.
2. Reference architecture baseline (local files):
   - VisionClaw Android captures mono PCM16 and emits fixed ~100 ms chunks (`MIN_SEND_BYTES = 3200`) before sending (`AudioManager.kt` lines 15, 38-44, 87-94).
   - VisionClaw Android sends `audio/pcm;rate=16000` over a persistent WebSocket realtime channel (`GeminiLiveService.kt` lines 146-159).
   - Agents ElevenLabs STT uses persistent WebSocket realtime with `model_id = "scribe_v2_realtime"` and buffered chunk forwarding (`stt.py` lines 30, 83-120, 129-170).
   - Agents ElevenLabs TTS supports WebSocket multi-context streaming (not one-shot only), including context open/flush/close sequencing (`tts.py` lines 40, 130-132, 197-231).
   - Agents realtime transport uses deterministic PCM frame cadence (`20 ms`, mono) in WebRTC output path (`webrtc_handler.py` lines 31-35, 67-79, 90-130).
3. Current runtime baseline (required files):
   - `src/components/window-content/ai-chat-window/slick-pane/slick-chat-input.tsx`:
     - browser capture hard-requires `MediaRecorder` (lines 1332-1339),
     - primary capture path selects container MIME via `MediaRecorder` (lines 1392-1397),
     - transcription occurs on stop via accumulated blob upload (lines 1408-1455).
   - `src/hooks/use-voice-runtime.ts`:
     - transcription path uploads blob bytes and defaults MIME to `audio/webm` (lines 332-354),
     - fallback path performs client-side WAV transcode + retry only after failure (lines 357-387).
   - `convex/ai/voiceRuntimeAdapter.ts`:
     - STT default model is `scribe_v1` (line 142),
     - STT path is batch HTTP `/speech-to-text` form upload (lines 606-626),
     - container relabel retry (`audio/webm` -> `audio/mp4`) is built into primary behavior (lines 600-603, 633-647),
     - TTS path is one-shot POST synthesis (lines 730-744), not persistent multi-context streaming.
4. Deterministic gap summary:
   - Capture gap: containerized browser recording is primary; fixed PCM frame capture is absent.
   - STT transport gap: batch upload + MIME retry is primary; persistent realtime STT session is absent.
   - TTS transport gap: one-shot synthesis is primary; streaming multi-context parity is absent.
   - Session topology gap: turn-based stop/send introduces avoidable latency and corruption-class failure exposure for short recordings.
5. ORV-040 implementation checkpoint (2026-03-04):
   - status transition: `READY` -> `IN_PROGRESS` -> `DONE`,
   - web/desktop chat capture path now attempts PCM-first browser capture (`AudioWorkletNode` primary, `ScriptProcessorNode` fallback) and only uses `MediaRecorder` as explicit unsupported-browser fallback,
   - `use-voice-runtime` transcribe path now prefers PCM/WAV MIME for ElevenLabs primary attempts and logs fixed-frame telemetry (`captureMethod`, `frameDurationMs`, `sampleRateHz`, `frameCount`, `frameBytes`) while retaining existing fallback semantics.
6. Verification checkpoint for ORV-040:
   - `npm run typecheck` passed,
   - `npm run docs:guard` passed,
   - `npm run test:unit` currently fails in unrelated audit-template/meta-bridge suites; approved baseline exemption accepted for ORV-040 promotion.
7. ORV-041 implementation checkpoint (2026-03-04):
   - status transition: `PENDING` -> `READY` -> `IN_PROGRESS` -> `DONE`,
   - fixed PCM contract is enforced at ingest (`24kHz`, `20ms`, `960-byte`, Int16 mono frame) for realtime frame streaming paths,
   - persistent transport route precedence is deterministic and explicit (`websocket_primary` first, `webrtc_fallback` on qualified failure),
   - realtime STT precedence is deterministic and explicit (`scribe_v2_realtime_primary` first, `gemini_native_audio_failover` on qualified degradation),
   - `/api/v1/ai/voice/*` compatibility is preserved and batch `/api/v1/ai/voice/transcribe` remains explicit resilience fallback.
8. Verification checkpoint for ORV-041:
   - `npm run typecheck` passed,
   - `npm run test:integration` passed,
   - `npm run docs:guard` passed,
   - `npm run test:unit` continues to fail only in unrelated audit-template/meta-bridge suites; approved baseline exemption retained.
9. ORV-042 implementation checkpoint (2026-03-04):
   - status transition: `PENDING` -> `READY` -> `IN_PROGRESS` -> `DONE`,
   - conversation runtime now declares deterministic duplex policy (`persistent_streaming_primary`) and deterministic interrupt policy (`client_vad_barge_in`) for web/desktop voice capture sessions,
   - explicit client VAD policy is locked (`client_energy_gate`, `20ms` frame duration, `0.015` RMS threshold, `2` min speech frames, `320ms` endpoint silence),
   - realtime JPEG forwarding now streams over the active live-session transport envelope channel using throttled cadence (`1250ms`) with explicit max-window controls (`8` frames / `10s`),
   - `conversation_interaction_v1` taxonomy and `/api/v1/ai/voice/*` compatibility remain preserved.
10. Verification checkpoint for ORV-042:
   - `npm run typecheck` passed,
   - `npm run docs:guard` passed,
   - `npm run test:unit` retains unrelated baseline failures in `audit-template`, `audit-deliverable`, `mobileMetaBridgeContracts`, and `actionCompletionEvidenceContract`,
   - `npm run test:e2e:desktop` retains unrelated onboarding handoff failure; `desktop-shell` lane assertions (including ORV-042 policy locks) pass.
11. Dependency state after ORV-042 checkpoint:
   - `ORV-043` moved to `READY` as the next promotable row; `ORV-044` remained `PENDING`.
12. ORV-043 implementation checkpoint (2026-03-04):
   - status transition: `PENDING` -> `READY` -> `IN_PROGRESS` -> `DONE`,
   - ElevenLabs TTS now uses WebSocket multi-context synthesis as primary path in `convex/ai/voiceRuntimeAdapter.ts` with explicit `batch_synthesize_fallback` semantics preserved as resilience path,
   - web/desktop runtime metadata now emits deterministic interruption-safe playback queue telemetry (`interruption_safe_serial_queue`) and explicit echo-cancellation strategy selection (`hardware_aec_capture_path` or `mute_mic_during_tts`) in `slick-chat-input.tsx` and `use-voice-runtime.ts`,
   - ORV-043 echo-strategy policy lock coverage added in `tests/unit/ai/realtimeMediaSession.test.ts`.
13. Verification checkpoint for ORV-043:
   - `npm run typecheck` passed,
   - `npm run test:integration` passed,
   - `npm run docs:guard` passed,
   - `npm run test:unit` retains unrelated baseline failures in `mobileMetaBridgeContracts`, `onboarding/audit-deliverable`, and `pdf/audit-template-registry`, while ORV-043 targeted suites (`voiceRuntimeAdapter`, `realtimeMediaSession`) pass.
14. Dependency state after ORV-043 checkpoint:
   - `ORV-044` is now `READY` (next promotable row),
   - `ORV-023` blocker language and DAT-native physical-device evidence gate remain unchanged.
15. ORV-044 execution checkpoint (2026-03-05):
   - status transition: `READY` -> `IN_PROGRESS` -> `BLOCKED`,
   - acceptance evidence for all eight non-negotiables and container-corruption elimination is documented in `ORV_014_CANARY_EXECUTION_LOG.md` (`ORV-044` section),
   - verify stack was executed exactly (`npm run typecheck`, `npm run test:unit`, `npm run test:integration`, `npm run test:e2e:desktop`, `npm run docs:guard`) with escalated rerun for desktop e2e after sandbox bind failure.
16. ORV-044 verify/go-no-go outcome (2026-03-05):
   - `typecheck`: failed on shared compile regressions in `convex/ai/agentExecution.ts` (`authorityConfigRecord` redeclare + union mismatch),
   - `test:unit`: failed on shared baseline suites (`mobileMetaBridgeContracts`, `onboarding/audit-deliverable`, `pdf/audit-template-registry`); ORV lane assertions (`voiceRuntimeAdapter`, `realtimeMediaSession`, `webVoiceRuntimePolicy`) remained green,
   - `test:integration`: failed at esbuild transform due the same `convex/ai/agentExecution.ts` redeclare regression,
   - `test:e2e:desktop`: failed in sandbox with `listen EPERM 127.0.0.1:3000`; escalated rerun completed and still failed on unrelated `tests/e2e/onboarding-audit-handoff.spec.ts` input-value mismatch while `tests/e2e/desktop-shell.spec.ts` lane assertions passed,
   - `docs:guard`: passed.
   - Go/no-go decision: `NO_GO`; row remains `BLOCKED` pending shared verify blocker resolution.
17. ORV-044 closure checkpoint (2026-03-05):
   - status transition: `BLOCKED` -> `IN_PROGRESS` -> `DONE`,
   - non-`agentExecution.ts` verify blockers were cleared via contract-aligned test updates (`mobileMetaBridgeContracts`, `onboarding/audit-deliverable`, `pdf/audit-template-registry`, `onboarding-audit-handoff`),
   - verify stack reran exactly in required order and passed: `npm run typecheck`, `npm run test:unit`, `npm run test:integration`, `npm run test:e2e:desktop`, `npm run docs:guard`.
18. ORV-044 final go/no-go outcome (2026-03-05):
   - Go/no-go decision: `GO`; `ORV-044` is `DONE`,
   - this `GO` applies to lane-`L` non-DAT scope only; DAT-native readiness remains `NO_GO` while `ORV-023` is `BLOCKED`,
   - acceptance evidence for all eight lane-`L` non-negotiables remains intact in `ORV_014_CANARY_EXECUTION_LOG.md`,
   - preserved ORV-041/ORV-042/ORV-043 gates, `/api/v1/ai/voice/*` compatibility, and explicit batch fallback semantics,
   - `convex/ai/agentExecution.ts` was not modified in this row execution.
19. ORV-044 post-closure stability rerun (2026-03-05):
   - reran required verify stack in-order and remained green after hardening `tests/e2e/onboarding-audit-handoff.spec.ts` send-flow retries plus CTA label selector parity,
   - `npm run typecheck` passed,
   - `npm run test:unit` passed (`1262 passed`, `80 skipped`),
   - `npm run test:integration` passed (`114 passed`, `22 skipped`),
   - `npm run test:e2e:desktop` passed (`4 passed`),
   - `npm run docs:guard` passed.

## ORV-039 through ORV-044 web/desktop PCM migration plan (2026-03-04)

1. Phase 1 (`ORV-039`, `ORV-040`): corruption-elimination baseline + browser PCM capture implementation.
2. Phase 2 (`ORV-041`, `ORV-042`): enforce fixed PCM contract (`24kHz/20ms/960-byte`) and dual-path transport + STT integration with deterministic precedence (`websocket_primary`/`webrtc_fallback`, `scribe_v2_realtime_primary`/`gemini_native_audio_failover`), then promote duplex/VAD/video-stream UX.
3. Phase 3 (`ORV-043`, `ORV-044`): ElevenLabs WebSocket multi-context TTS + explicit echo strategy, then regression/canary evidence proving all eight non-negotiables.
4. Dependency rules:
   - lane `L` starts after `ORV-038`,
   - lane `L` does not remove fallback APIs until `ORV-044` evidence is complete,
   - DAT-native production claims still require `ORV-023` physical-device evidence,
   - `ORV-044` cannot close unless transport and STT dual-route precedence rules are satisfied and evidenced.
5. Verification requirements:
   - docs-only row: `npm run docs:guard`,
   - implementation rows: `npm run typecheck`, `npm run test:unit`, `npm run test:integration`/`npm run test:e2e:desktop` as listed in queue rows.

## ORV-045 through ORV-052 mobile corrective plan (2026-03-05)

1. Phase 1 (`ORV-045`): contract compliance closure.
   - Update `apps/operator-mobile/src/lib/voice/frameStreaming.ts` and `apps/operator-mobile/src/lib/av/metaBridge-contracts.ts` to `24_000 Hz` defaults.
   - Align `apps/operator-mobile/app/(tabs)/index.tsx` ingest metadata defaults.
   - Harden `convex/schemas/aiSchemas.ts` validation to reject non-contract sample rates in `voice_transport_v1` acceptance scope.
   - Update drifted tests in:
     - `tests/unit/ai/mobileVoiceFrameStreaming.test.ts`
     - `tests/unit/ai/mobileMetaBridgeContracts.test.ts`
     - `tests/unit/ai/voiceTransportEnvelopeContract.test.ts`
     - `tests/unit/ai/voiceRuntimeSessionFsm.test.ts`
     - `tests/integration/ai/voiceRuntimeWebsocketIngest.integration.test.ts`
2. Phase 2 (`ORV-046`, `ORV-047`): unified turn-state + VAD endpointing foundation.
   - Add reducer-driven `ConversationTurnState` in `apps/operator-mobile/src/lib/voice/lifecycle.ts`.
   - Rewire turn-state ownership in `apps/operator-mobile/app/(tabs)/index.tsx` and `apps/operator-mobile/src/components/chat/VoiceModeModal.tsx`.
   - Extend `apps/operator-mobile/src/components/chat/VoiceRecorder.tsx` frame payload to include RMS/energy and apply `0.015` threshold + `320ms` silence endpointing in live frame handling.
3. Phase 3 (`ORV-048`, `ORV-049`): proactive barge-in and race-proofing.
   - Stop playback and cancel in-flight synthesis immediately on capture start/speech onset while assistant audio is active.
   - Add final-frame mutex, auto-start debounce (`200-500ms`), and single-path autospeak guards.
   - Enforce deterministic client fail-closed cancellation guard rails (`client_http_request_abort_fail_closed`) with in-flight HTTP request abort support for `/api/v1/ai/voice/synthesize` calls, while keeping server-side synth-abort endpoint support explicitly false.
4. Phase 4 (`ORV-050`, `ORV-051`): mode cleanup + distinct UI mapping (`ORV-050` and `ORV-051` done).
   - Enforce `handleEndConversation()` full teardown to `idle` with cancellation/reset semantics.
   - Map each turn-state to unique orb label/color/animation in `VoiceModeModal.tsx`.
5. Phase 5 (`ORV-052`, done 2026-03-05): closeout verification + parity impact report.
   - Full lane `M` stack run complete (`mobile:typecheck`, `typecheck`, `test:unit`, `test:integration`, `test:e2e:mobile`, `test:e2e:desktop`, `docs:guard`) with pass results (`test:unit` `1298 passed` / `80 skipped`, `test:integration` `115 passed` / `22 skipped`, `test:e2e:mobile` `18 passed`, `test:e2e:desktop` `5 passed` after clearing a stale local `:3200` listener).
   - Published explicit parity impact assessment: none (mobile lane `M` closeout preserved web/desktop `conversation_interaction_v1` parity and `/api/v1/ai/voice/*` compatibility); queue artifacts synced.
6. Lane `M` boundary and non-regression rules:
   - keep `convex/ai/agentExecution.ts` untouched,
   - preserve ORV-010 through ORV-044 invariants,
   - preserve `/api/v1/ai/voice/*` compatibility,
   - keep `ORV-023` DAT-native physical-device gate unchanged (`BLOCKED`/`NO_GO` until artifacts exist).
