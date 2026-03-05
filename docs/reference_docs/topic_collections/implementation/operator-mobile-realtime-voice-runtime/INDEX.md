# Operator Mobile Realtime Voice Runtime Index

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/operator-mobile-realtime-voice-runtime`  
**Source request:** Build world-class operator mobile voice runtime with provider-backed realtime transport, deterministic fallback, interruptible playback, and production-grade reliability/observability/security, then layer video feed crossover at the end. Follow-up scope: implement true native DAT audio/video ingress callback wiring for physical-device Meta glasses flows, deliver `conversation_interaction_v1` in the main AI chat UI (web + desktop + iPhone), and add a concrete three-milestone true live AV media-plane + multimodal agentic execution plan. Latest extensions: (2026-03-04) research local VisionClaw + agents reference projects, compare against current web/desktop runtime, and queue a docs-first PCM/realtime migration to eliminate container corruption failures; (2026-03-05) queue post-audit mobile corrective closure for PCM contract drift + unified turn-state/VAD/barge-in/race cleanup.

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
9. web/desktop raw-PCM parity migration for STT/TTS transport and corruption-remediation evidence.
10. post-audit mobile turn-state corrective closure with explicit VAD/barge-in/race-guard parity and strict PCM contract compliance.

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
- Meta bridge observability Option C hardening note:
  `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/operator-mobile-realtime-voice-runtime/META_BRIDGE_OBSERVABILITY_OPTION_C_HARDENING.md`
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
7. web/desktop reference-parity remediation (`MediaRecorder` container path -> PCM streaming path).

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
15. Lane `K` software milestone rows are complete: `ORV-036`, `ORV-037`, and `ORV-038` are `DONE`; DAT-native production acceptance still remains gated by `ORV-023` physical-device evidence.
16. Lane `L` is now complete: `ORV-039` through `ORV-044` are `DONE` with final regression/go-no-go evidence promoted.
17. `ORV-039` findings confirmed reference-vs-current mismatch between persistent PCM streaming patterns (VisionClaw + agents) and prior web/desktop container-first capture/transcribe flow (`slick-chat-input.tsx`, `use-voice-runtime.ts`, `voiceRuntimeAdapter.ts`).
18. `ORV-040` implementation now applies PCM-first browser capture (`AudioWorkletNode` primary, `ScriptProcessorNode` fallback) with explicit MediaRecorder fallback guard for unsupported PCM browsers while preserving `/api/v1/ai/voice/*` compatibility.
19. `ORV-041` implementation now enforces deterministic PCM/transport/STT precedence gates (`24kHz`/`20ms`/`960-byte`, `websocket_primary` -> `webrtc_fallback`, `scribe_v2_realtime_primary` -> `gemini_native_audio_failover`) while preserving ordered partial/final transcript relay and explicit batch fallback semantics.
20. `ORV-042` implementation now promotes persistent duplex runtime metadata (`persistent_streaming_primary`) with deterministic client VAD interrupt policy (`client_energy_gate` + barge-in stop-assistant behavior) and throttled JPEG forwarding over the active live-session transport envelope channel.
21. Non-`agentExecution.ts` verify blockers identified during the first ORV-044 run were cleared in-place (`mobileMetaBridgeContracts`, `onboarding/audit-deliverable`, `pdf/audit-template-registry`, and `onboarding-audit-handoff` e2e contract drift) while preserving lane-`L` runtime gates.
22. Lane `L` hard gate is now explicit and non-ambiguous: transport must implement both paths with fixed precedence (`websocket_primary`, `webrtc_fallback`) and STT must integrate both providers with fixed precedence (`scribe_v2_realtime_primary`, `gemini_native_audio_failover`) before `ORV-044` can close.
23. `ORV-044` evidence bundle captures all eight lane-`L` non-negotiables and container-corruption elimination checks, and the required stack is now green (`npm run typecheck`, `npm run test:unit`, `npm run test:integration`, `npm run test:e2e:desktop`, `npm run docs:guard`), enabling final `GO` promotion to `DONE`.
24. Post-closure ORV-044 stability rerun (2026-03-05) stayed green after `onboarding-audit-handoff` send-flow/CTA selector hardening (`typecheck` pass, `test:unit` pass `1262/80`, `test:integration` pass `114/22`, `test:e2e:desktop` pass `4`, `docs:guard` pass), while preserving lane-`L` gates and leaving `convex/ai/agentExecution.ts` untouched.
25. ORV-036 closure verify rerun (2026-03-05) is green (`mobile:typecheck`, `typecheck`, `test:unit`, `test:integration`, `test:e2e:mobile`, `docs:guard`); `ORV-036` is now `DONE` and DAT-native production readiness remains fail-closed on `ORV-023` physical-device artifacts.
26. Lane `M` corrective tranche is complete from the 2026-03-05 audit findings: `ORV-045` through `ORV-052` are `DONE` in dependency order.
27. `ORV-045` closed the lane `M` `P0` PCM gate by enforcing mobile sample-rate defaults at `24_000` (`frameStreaming.ts`, `metaBridge-contracts.ts`, `app/(tabs)/index.tsx`) and fail-closed `voice_transport_v1` envelope sample-rate rejection in `convex/schemas/aiSchemas.ts`, with verify stack green (`mobile:typecheck`, `typecheck`, `test:unit`, `test:integration`, `docs:guard`).
28. Lane `M` runtime behavior rows now implement unified `ConversationTurnState` (`idle`, `listening`, `thinking`, `agent_speaking`), VAD silence endpointing (`0.015` RMS, `320ms`), proactive barge-in cancellation, final-frame mutex/duplicate guards, recorder auto-start debounce (`200-500ms`), and single-path autospeak token claims.
29. `ORV-049` hardening records deterministic fail-closed TTS cancellation guard rails (`client_http_request_abort_fail_closed`) with client-side in-flight `/api/v1/ai/voice/synthesize` request abort support; stale post-barge-in playback is suppressed by cancel-epoch + immediate stop/abort sequencing.
30. `ORV-050` now enforces full mode-switch teardown (`handleEndConversation()` fail-closed reset/cancellation with `isTranscribing`/`isLoading` bleed clear), and `ORV-051` is now `DONE` with deterministic turn-state HUD/orb indicator mapping (distinct labels/colors/animation by `ConversationTurnState`).
31. `ORV-052` closeout is now `DONE` with explicit parity impact `none`: mobile turn-state/VAD/barge-in end-to-end evidence is enforced in lane-`M` closeout tests (`mobile-voice-chaos`, `desktop-shell`, `mobileRuntimeHardening.integration`) while preserving `/api/v1/ai/voice/*` compatibility and keeping `ORV-023` DAT-native hardware status unchanged (`BLOCKED`/`NO_GO`); verify stack pass (2026-03-05): `mobile:typecheck`, `typecheck`, `test:unit` (`1298 passed`, `80 skipped`), `test:integration` (`115 passed`, `22 skipped`), `test:e2e:mobile` (`18 passed`), `test:e2e:desktop` (`5 passed` after clearing a stale local `:3200` listener), `docs:guard`.
