# Operator Mobile Realtime Voice Runtime Session Prompts

Use these prompts to execute this workstream lane-by-lane with deterministic queue behavior.

Workstream root:
`/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/operator-mobile-realtime-voice-runtime`

Queue:
`/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/operator-mobile-realtime-voice-runtime/TASK_QUEUE.md`

---

## Global execution rules

1. Run only rows in this queue.
2. Keep status values limited to `READY`, `IN_PROGRESS`, `PENDING`, `BLOCKED`, `DONE`.
3. Before each row, list top 3 regression risks and required runtime contracts.
4. Preserve `voiceRuntime` and `transportRuntime` metadata parity across all changes.
5. Keep barge-in invariants explicit and tested.
6. Run row `Verify` commands exactly.
7. Sync `INDEX.md`, `MASTER_PLAN.md`, `TASK_QUEUE.md`, and this file at lane milestones.
8. Video crossover work executes only in end-layer lane `G` after voice release readiness rows are complete.
9. Native DAT callback ingress work executes only in lane `H` after `ORV-019` is `DONE`.
10. Main AI chat conversation rollout executes only in lane `I` after `ORV-019` with `conversation_interaction_v1` contract compatibility preserved.
11. iPhone parity rollout executes in lane `J` after `ORV-024` and may run concurrently with lane `I` (one active row per lane).
12. Do not promote final smoke evidence rows until cross-surface parity checkpoint row `ORV-035` is `DONE`.
13. True live AV + multimodal agentic runtime work executes only in lane `K` after `ORV-030` and `ORV-035`; DAT-native production acceptance remains gated by `ORV-023` physical-device evidence.
14. Web/desktop PCM corruption-remediation and realtime parity work executes only in lane `L` after `ORV-038`; do not claim DAT-native parity from lane `L` work alone.
15. Mobile post-audit corrective work executes only in lane `M` after `ORV-044`; preserve ORV-010 through ORV-044 invariants, keep `/api/v1/ai/voice/*` compatibility, and do not modify `convex/ai/agentExecution.ts`.
16. Mobile conversational UX acceleration executes only in lane `N` after `ORV-052`; preserve ORV-010 through ORV-052 invariants, keep `/api/v1/ai/voice/*` compatibility, and do not change `ORV-023` DAT-native gate status without physical-device artifacts.

---

## Session A (Lane A: protocol and contract freeze)

You are Codex in `/Users/foundbrand_001/Development/vc83-com`.
Execute only lane `A` rows from:
`/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/operator-mobile-realtime-voice-runtime/TASK_QUEUE.md`

Rules:

1. Freeze `voice_transport_v1` envelope fields and sequencing semantics.
2. Lock metadata parity map across voice and transport runtimes.
3. Add/adjust validators before implementation lanes proceed.
4. Run `V-TYPE` and `V-DOCS`.
5. Stop when lane `A` has no promotable rows.

---

## Session B (Lane B: backend realtime runtime)

You are Codex in `/Users/foundbrand_001/Development/vc83-com`.
Execute only lane `B` rows from:
`/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/operator-mobile-realtime-voice-runtime/TASK_QUEUE.md`

Rules:

1. Implement authenticated stream lifecycle with explicit session FSM.
2. Implement partial/final transcript relay with ordering/idempotency guards.
3. Implement server-side barge-in cancellation for assistant synthesis streams.
4. Run `V-TYPE`, `V-UNIT`, `V-INTEG`, `V-DOCS`.
5. Stop when lane `B` has no promotable rows.

---

## Session C (Lane C: mobile streaming runtime)

You are Codex in `/Users/foundbrand_001/Development/vc83-com`.
Execute only lane `C` rows from:
`/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/operator-mobile-realtime-voice-runtime/TASK_QUEUE.md`

Rules:

1. Implement deterministic transport fallback ladder and runtime reporting.
2. Replace LIVE chunk-on-stop with frame streaming plus low-latency partial transcript UX.
3. Implement stream-capable playback with codec fallback behavior.
4. Run `V-MOBILE-TYPE`, `V-MOBILE-LINT`, `V-UNIT`, `V-E2E-MOBILE`, `V-DOCS`.
5. Stop when lane `C` has no promotable rows.

---

## Session D (Lane D: barge-in and continuity)

You are Codex in `/Users/foundbrand_001/Development/vc83-com`.
Execute only lane `D` rows from:
`/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/operator-mobile-realtime-voice-runtime/TASK_QUEUE.md`

Rules:

1. Formalize interruption state machine and enforce deadlock prevention invariants.
2. Guarantee transcript continuity in same thread across modal transitions and reconnect.
3. Run `V-TYPE`, `V-UNIT`, `V-INTEG`, `V-E2E-MOBILE`, `V-DOCS`.
4. Stop when lane `D` has no promotable rows.

---

## Session E (Lane E: reliability and observability)

You are Codex in `/Users/foundbrand_001/Development/vc83-com`.
Execute only lane `E` rows from:
`/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/operator-mobile-realtime-voice-runtime/TASK_QUEUE.md`

Rules:

1. Instrument latency/fallback/interruption telemetry contracts end-to-end.
2. Run chaos/fallback validation matrix and store evidence.
3. Run physical hardware impairment automation (`scripts/mobile/voice-radio-chaos-hardware.mjs`) and retain artifacts.
4. Run `V-TYPE`, `V-UNIT`, `V-INTEG`, `V-E2E-MOBILE`, `V-DOCS`.
5. Stop when lane `E` has no promotable rows.

---

## Session F (Lane F: security and rollout)

You are Codex in `/Users/foundbrand_001/Development/vc83-com`.
Execute only lane `F` rows from:
`/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/operator-mobile-realtime-voice-runtime/TASK_QUEUE.md`

Rules:

1. Enforce auth/attestation/rate limits and fail-closed behavior.
2. Execute ORV-014 canary policy matrix with automatic rollback thresholds for latency/fallback/error budgets.
3. Publish and maintain runbook + go/no-go checklist + owner handoff table in:
   `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/operator-mobile-realtime-voice-runtime/ORV_014_CANARY_RUNBOOK.md`
4. Do not promote lane `G` (`ORV-015+`) until `ORV-014` is `DONE`.
5. Run row `Verify` commands exactly.
6. Stop only when release gate rows are `DONE` or blockers are documented.

---

## Session G (Lane G: end-layer video crossover)

You are Codex in `/Users/foundbrand_001/Development/vc83-com`.
Execute only lane `G` rows from:
`/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/operator-mobile-realtime-voice-runtime/TASK_QUEUE.md`

Rules:

1. Reuse shared runtime/session contracts from voice lanes; do not introduce parallel metadata schemas.
2. Keep implementation additive and block any change that regresses voice latency/interruption/fallback SLOs.
3. Preserve deterministic transport fallback parity between voice and video paths.
4. Run row `Verify` commands exactly.
5. Current lane status (2026-03-02): `ORV-015` through `ORV-019` are `DONE`; lane `G` has no promotable rows.
6. Preserve ORV-010 through ORV-019 invariants and `/api/v1/ai/voice/*` compatibility for any follow-up queue rows added after `ORV-019`.
7. Stop when lane `G` has no promotable rows or blockers are documented.

---

## Session H (Lane H: native DAT callback ingress hardening)

You are Codex in `/Users/foundbrand_001/Development/vc83-com`.
Execute only lane `H` rows from:
`/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/operator-mobile-realtime-voice-runtime/TASK_QUEUE.md`

Rules:

1. Bind true native DAT callback surfaces for both frame and audio ingress on iOS and Android.
2. Use the frozen ORV-020 contract map:
   - video callback -> `publishFrameIngress(timestampMs, droppedFrames)`,
   - audio callback -> `publishAudioIngress(timestampMs, sampleRate, packetDelta)`.
3. Preserve deterministic normalization semantics from ORV-020:
   - timestamp normalization (`ns/us/s/ms` -> epoch `ms`),
   - sample-rate floor `8_000` with `16_000` default fallback,
   - `packetDelta` floor `1`, frame increment fixed `+1`.
4. Preserve fail-closed behavior for true SDK absence (`dat_sdk_unavailable`) while treating callback-surface absence/degradation as explicit diagnostics (not production-accepted ingress).
5. Enforce lifecycle-safe callback registration and teardown across start/stop/reconnect/invalidate flows.
6. Keep JS snapshot and metadata contracts stable (`voiceRuntime`, `transportRuntime`, bridge diagnostics) and preserve `/api/v1/ai/voice/*` compatibility.
7. Current lane status (2026-03-02): `ORV-020` through `ORV-022` are `DONE`; `ORV-023` is `BLOCKED` pending physical-device prerequisites.
8. Preserve ORV-010 through ORV-022 invariants while executing lane `H`.
9. ORV-023 cannot move to `DONE` without physical-device evidence from both platforms in `artifacts/orv-023/physical-device/{ios,android}/` proving callback-driven frame/audio counter growth and reconnect-stable state.
10. Run row `Verify` commands exactly, then stop when lane `H` has no promotable rows or blockers are documented.

---

## Session I (Lane I: main AI chat conversation UX/runtime rollout)

You are Codex in `/Users/foundbrand_001/Development/vc83-com`.
Execute only lane `I` rows from:
`/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/operator-mobile-realtime-voice-runtime/TASK_QUEUE.md`

Rules:

1. Implement `conversation_interaction_v1` exactly as frozen in:
   `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/operator-mobile-realtime-voice-runtime/WEB_CHAT_CONVERSATION_INTERACTION_CONTRACT.md`
2. Ship composer UX with `Conversation` entrypoint beside `Dictate`, mode picker (`voice`, `voice_with_eyes`), and no standalone always-visible eyes button.
3. Implement canonical session states (`idle`, `connecting`, `live`, `reconnecting`, `ending`, `ended`, `error`) with persistent live HUD and deterministic reason codes.
4. Support source negotiation for `webcam` and `meta_glasses`; degrade to `voice` on eyes-source drop and emit standardized `conversation.degraded_to_voice` events.
5. Preserve `/api/v1/ai/voice/*` compatibility and ORV-010 through ORV-022 continuity/fallback/security invariants.
6. Prioritize ASAP validation for agent back-and-forth feed testing using row verify commands, including desktop e2e coverage.
7. Lane `H` `ORV-023` physical DAT blocker does not block webcam-first `voice_with_eyes` rollout; document any Meta hardware limitations explicitly.
8. Execute concurrently with lane `J` when possible while preserving dependency order.
9. Run row `Verify` commands exactly, then stop when lane `I` has no promotable rows or blockers are documented.
10. Current lane status (2026-03-03): `ORV-024` through `ORV-030` are `DONE`; lane `I` has no promotable rows in this workstream slice.

---

## Session J (Lane J: iPhone conversation parity rollout)

You are Codex in `/Users/foundbrand_001/Development/vc83-com`.
Execute only lane `J` rows from:
`/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/operator-mobile-realtime-voice-runtime/TASK_QUEUE.md`

Rules:

1. Keep iPhone behavior identical to `conversation_interaction_v1` and lane `I` semantics for modes, states, and reason codes.
2. Ship iPhone conversation entrypoint, mode picker, and live HUD parity while preserving current one-shot dictate flow.
3. Implement `voice_with_eyes` source handling with Meta glasses preference and deterministic degrade-to-voice behavior.
4. Preserve fail-closed `dat_sdk_unavailable` semantics and document runtime diagnostics explicitly.
5. Execute concurrently with lane `I` when possible while preserving dependency order.
6. Complete parity checkpoint `ORV-035` before lane `I`/`J` final smoke promotion.
7. Run row `Verify` commands exactly, then stop when lane `J` has no promotable rows or blockers are documented.
8. Current lane status (2026-03-03): `ORV-031` through `ORV-035` are `DONE`; lane `J` has no promotable rows in this workstream slice.

---

## Session K (Lane K: true live AV + multimodal agentic execution)

You are Codex in `/Users/foundbrand_001/Development/vc83-com`.
Execute only lane `K` rows from:
`/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/operator-mobile-realtime-voice-runtime/TASK_QUEUE.md`

Rules:

1. Implement true media-plane streaming first: raw audio/video payload ingress from mobile capture and DAT callback surfaces into authenticated realtime uplinks, not metadata-only counters.
2. Preserve deterministic sequence/order/backpressure and degrade semantics while maintaining existing `voiceRuntime`/`transportRuntime` schema compatibility.
3. Implement server-side realtime AV orchestration (audio delta + video delta + interruption/EOU) as the primary path; keep chunk/fallback transcription only as resilience fallback.
4. Add multimodal tool/MCP + multi-agent handoff flow with non-bypassable approval invariants and explicit `voice`/`voice_with_eyes` evidence.
5. Preserve `/api/v1/ai/voice/*` compatibility and ORV-010 through ORV-023 continuity/security/fallback invariants.
6. `ORV-023` remains required for DAT-native production claims; webcam/camera-first rollout may proceed with explicit DAT limitation notes.
7. Run row `Verify` commands exactly, then stop when lane `K` has no promotable rows or blockers are documented.
8. Current lane status (2026-03-05): `ORV-036`, `ORV-037`, and `ORV-038` are `DONE`; no promotable lane-`K` software rows remain, and DAT-native production readiness remains gated by `ORV-023` physical-device evidence.

---

## Session L (Lane L: web/desktop PCM parity migration)

You are Codex in `/Users/foundbrand_001/Development/vc83-com`.
Execute only lane `L` rows from:
`/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/operator-mobile-realtime-voice-runtime/TASK_QUEUE.md`

Rules:

1. Start with `ORV-039` and keep references explicit to local source files under `docs/reference_projects/VisionClaw/` and `docs/reference_projects/agents/`.
2. Eliminate container-corruption failure mode first: browser path must stop treating `audio/webm` blobs as primary PCM ingest for ElevenLabs STT.
3. Implement fixed-frame PCM capture for web/desktop (`AudioWorkletNode` primary, `ScriptProcessorNode` fallback) with hard contract `24kHz`, `20ms`, `960-byte` Int16 mono frame payloads.
4. Implement persistent realtime audio transport with both paths and fixed precedence (`websocket_primary`, `webrtc_fallback`), plus realtime STT with both providers and fixed precedence (`scribe_v2_realtime_primary`, `gemini_native_audio_failover`) before promoting UX rows.
5. Implement streaming TTS with ElevenLabs WebSocket multi-context path as primary, preserving interruption-safe playback queue behavior.
6. Enforce true duplex runtime behavior (simultaneous audio in/out + deterministic interrupt detection), explicit VAD strategy (client or server), and throttled JPEG frame forwarding over the same persistent transport channel.
7. Enforce explicit echo-cancellation strategy (mute mic during TTS or hardware AEC capability path) and expose the chosen strategy in runtime telemetry.
8. Preserve `conversation_interaction_v1` state/reason taxonomy and existing `/api/v1/ai/voice/*` compatibility guarantees.
9. Keep batch transcribe/synthesize APIs as explicit resilience fallback during migration; do not silently remove fallback paths until regression evidence is complete.
10. Do not mark `ORV-044` `DONE` until all eight non-negotiable vectors are proven in artifacts and verify outputs.
11. Run row `Verify` commands exactly, then stop when lane `L` has no promotable rows or blockers are documented.
12. Current lane status (2026-03-05): `ORV-039` through `ORV-044` are `DONE`; lane `L` has no remaining promotable rows.
13. Use the frozen ORV-039 baseline in `MASTER_PLAN.md` as authoritative reference mapping for `src/hooks/use-voice-runtime.ts`, `src/components/window-content/ai-chat-window/slick-pane/slick-chat-input.tsx`, and `convex/ai/voiceRuntimeAdapter.ts` versus local VisionClaw/agents patterns.
14. ORV-044 closure snapshot (2026-03-05): all eight non-negotiable acceptance vectors remain documented in `ORV_014_CANARY_EXECUTION_LOG.md`, and required verify stack reruns remain green (`typecheck`, `test:unit`, `test:integration`, `test:e2e:desktop`, `docs:guard`) after onboarding handoff e2e send-flow/CTA selector hardening, with lane `L` gates preserved and no edits to `convex/ai/agentExecution.ts` in this row execution.

---

## Session M (Lane M: mobile post-audit corrective closure)

You are Codex in `/Users/foundbrand_001/Development/vc83-com`.
Execute only lane `M` rows from:
`/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/operator-mobile-realtime-voice-runtime/TASK_QUEUE.md`

Rules:

1. Fix mobile PCM contract drift first (`16_000` -> `24_000`) in frame/envelope/default surfaces and tests before any turn-state behavior refactor rows.
2. Strengthen `voiceTransportPcmContractValidator` to fail closed for non-contract sample rates in lane `M` scope while preserving existing envelope compatibility (`voice_transport_v1`, `/api/v1/ai/voice/*`).
3. Introduce unified `ConversationTurnState` (`idle`, `listening`, `thinking`, `agent_speaking`) in `lifecycle.ts` and wire it through `index.tsx` -> `VoiceModeModal.tsx`.
4. Replace boolean-derived HUD/orb turn-flow derivation with reducer-driven turn-state mapping and keep deterministic status labels.
5. Add per-frame RMS/energy reporting in `VoiceRecorder.tsx`, then enforce VAD endpointing in `index.tsx` using `0.015` RMS threshold + `320ms` endpoint silence.
6. Make barge-in proactive: stop playback and cancel in-flight synthesis immediately when user capture starts (tap or VAD speech onset during `agent_speaking`).
7. Add race guards: final-frame mutex, `200-500ms` recorder auto-start debounce after assistant playback, and a single assistant autospeak path (no dual orchestration + refresh playback).
8. Ensure mode switch cleanup in `handleEndConversation()` fully resets turn state to `idle`, clears `isTranscribing`/`isLoading`, and cancels pending auto-speak operations.
9. Keep implementation scoped to audited files and listed tests; avoid widening to unrelated modules.
10. Preserve ORV-010 through ORV-044 invariants, and do not edit `convex/ai/agentExecution.ts`.
11. Run row `Verify` commands exactly, then stop when lane `M` has no promotable rows or blockers are documented.
12. Current lane status (2026-03-05): `ORV-045` through `ORV-052` are `DONE`; lane `M` has no promotable rows; `ORV-023` remains `BLOCKED` and unchanged by lane `M` execution.

---

## Session N (Lane N: mobile conversational UX acceleration)

You are Codex in `/Users/foundbrand_001/Development/vc83-com`.
Execute only lane `N` rows from:
`/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/operator-mobile-realtime-voice-runtime/TASK_QUEUE.md`

Rules:

1. Start with `ORV-053` and freeze `conversation_voice_live_ux_v1` contract targets before code changes.
2. Enforce realtime-first transport behavior for voice mode and prevent silent fallback drift to `chunked_fallback`.
3. Prioritize interruption responsiveness: optimize for sub-second user barge-in stop semantics and minimize perceived dead-air between turns.
4. Reduce capture/turn segmentation latency while preserving sequence/idempotency safety in `voiceRuntime` ingest paths.
5. Implement compact docked orb controls at composer bottom and avoid full-screen modal dominance during active conversation.
6. Implement always-visible live transcript rail (`user_partial`, `assistant_partial`, finalized turns) with deterministic interruption markers.
7. Preserve `conversation_interaction_v1` state/reason taxonomy and same-thread transcript continuity guarantees.
8. Preserve ORV-010 through ORV-052 invariants and `/api/v1/ai/voice/*` compatibility.
9. Do not alter `ORV-023` DAT-native blocker status or claim DAT-native `GO` without required physical-device evidence artifacts.
10. Run row `Verify` commands exactly; lane-`N` rows touching latency evidence must include freshness checks (`mobile:voice-latency:evidence:check` and strict real gate when publishing canary evidence).
11. Current lane status (2026-03-06): `ORV-053`, `ORV-054`, `ORV-055`, `ORV-056`, and `ORV-057` are `DONE` (including ORV-053 contract freeze, ORV-055 de-risk follow-up, ORV-056 server-backed relay QoS projection + docked mini-orb/transcript rail closeout + real-device p50/p95 evidence publication, and ORV-057 residual-risk monitors/freshness guard automation); strict real-network latency gate is `PASS` on latest evidence (`ios_real_device_network_field_canary`), and `ORV-023` remains `BLOCKED`.
