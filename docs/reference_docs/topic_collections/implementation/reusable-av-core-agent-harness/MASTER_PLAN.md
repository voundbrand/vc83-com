# Reusable AV Core + Agent Harness Master Plan

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/reusable-av-core-agent-harness`  
**Last updated:** 2026-02-27

---

## Objective

Deliver a reusable, low-latency AV core that can:

1. take desktop screenshots,
2. record desktop video,
3. ingest live streams from webcam, iPhone, Android, Meta glasses, and digital video inputs,
4. run bidirectional audio/video into the one-agent runtime,
5. preserve canonical authority/trust/approval invariants for all actionable intents.

---

## Contract baseline (`AVR-001`)

### Required source classes

1. `desktop_screenshot`
2. `desktop_record`
3. `webcam`
4. `mobile_stream_ios`
5. `mobile_stream_android`
6. `glasses_stream_meta`
7. `digital_video_input` (`usb_capture`, `hdmi_capture`, `ndi_capture`)

### Required media directions

1. `audio_in`
2. `audio_out`
3. `video_in`
4. `video_out` (for preview/loopback and operator awareness)

### Required runtime metadata

1. `liveSessionId`
2. `cameraRuntime`
3. `voiceRuntime`
4. `captureRuntime` (source + capture mode)
5. `transportRuntime` (latency/jitter/drop/fallback)

### Required invariants

1. Native authority precedence remains `vc83_runtime_policy`.
2. AV-originated actionable intents must route through native tool registry.
3. Direct device-side mutation paths are fail-closed.
4. Trust/approval gating is non-bypassable for mutating actions.

### AVR-001 contract matrix (executed 2026-02-25)

| Contract area | Source classes | Required capture shape | Required metadata keys |
|---|---|---|---|
| Screenshot capture | `desktop_screenshot` | single still frame (`image/*`) | `liveSessionId`; `captureRuntime.sourceClass`; `captureRuntime.captureMode=screenshot`; `captureRuntime.deviceId`; `captureRuntime.captureTimestampMs` |
| Desktop video capture | `desktop_record` | bounded-duration frame sequence + optional audio track | `liveSessionId`; `captureRuntime.captureMode=record`; `captureRuntime.frameRate`; `captureRuntime.resolution`; `captureRuntime.withSystemAudio`; `captureRuntime.withMicAudio` |
| Camera/video ingest | `webcam`; `digital_video_input` (`usb_capture`/`hdmi_capture`/`ndi_capture`) | continuous frame stream | `liveSessionId`; `cameraRuntime.provider`; `cameraRuntime.sourceId`; `cameraRuntime.frameTimestampMs`; `cameraRuntime.sequence` |
| Mobile/glasses ingest | `mobile_stream_ios`; `mobile_stream_android`; `glasses_stream_meta` | continuous frame stream + session provenance | `liveSessionId`; `cameraRuntime.provider`; `cameraRuntime.sourceClass`; `cameraRuntime.deviceProfile`; `cameraRuntime.sequence`; `cameraRuntime.transport` |
| Voice ingress/egress | all source classes with audio | bidirectional audio packets + session lifecycle | `liveSessionId`; `voiceRuntime.voiceSessionId`; `voiceRuntime.requestedProviderId`; `voiceRuntime.providerId`; `voiceRuntime.mimeType`; `voiceRuntime.language` |

### AVR-002 deterministic media-session ingress envelope (executed 2026-02-25)

Canonical schema added in `convex/schemas/aiSchemas.ts`:
`MEDIA_SESSION_INGRESS_CONTRACT_VERSION = avr_media_session_ingress_v1`

Envelope shape (contract-first only):

1. Required top-level keys:
   - `contractVersion`
   - `liveSessionId`
   - `ingressTimestampMs`
   - `authority`
2. Optional runtime metadata keys:
   - `cameraRuntime`
   - `voiceRuntime`
   - `captureRuntime`
   - `transportRuntime`
3. Minimum payload rule:
   - At least one of `cameraRuntime`, `voiceRuntime`, or `captureRuntime` must be present.

Deterministic metadata contracts:

| Envelope key | Required fields | Diagnostics coverage |
|---|---|---|
| `cameraRuntime` | `provider`; `sourceClass`; `sourceId`; `frameTimestampMs`; `sequence` | optional frame rate + resolution + transport hint |
| `voiceRuntime` | `voiceSessionId`; `providerId`; `mimeType` | optional packet sequence/timestamp, sample rate, requested provider |
| `captureRuntime` | `sourceClass`; `sourceId`; `captureMode`; `captureTimestampMs` | optional dropped/late frame counters and capture-to-ingress latency |
| `transportRuntime` | `mode`; `fallbackReason`; `ingressTimestampMs` | optional latency/jitter/packet-loss/bitrate/reconnect/fallback-transition counters |

Authority/trust invariants encoded in envelope:

1. `authority.nativePolicyPrecedence = vc83_runtime_policy`
2. `authority.mutatingIntentGate = native_tool_registry`
3. `authority.approvalInvariant = non_bypassable`
4. `authority.directDeviceMutation = fail_closed`

YAI parity boundary compatibility (explicit, non-owning):

1. `YAI-018` remains owner of chat live-vision parity wiring.
2. `YAI-019` remains owner of chat voice parity wiring.
3. `YAI-020` remains owner of parity observability in current chat paths.
4. `YAI-021` remains the harness integration gate before `AVR-009` (dependency satisfied and `AVR-009` completed on 2026-02-26).
5. `AVR-002` only defines reusable ingress contract shape for downstream lanes; it does not implement parity rows.

AVR-002 verification snapshot (2026-02-25):

1. `npm run docs:guard` passed (`Docs guard passed.`).
2. `npm run typecheck` passed (`tsc --noEmit`, exit 0) after repository type-baseline blockers were cleared.
3. Queue outcome: `AVR-002` advanced to `DONE`; dependency-unlocked rows `AVR-003` and `AVR-005` promoted to `READY`.

AVR-003 verification snapshot (2026-02-25):

1. Implemented reusable desktop capture/session contract modules:
   - `src/lib/av/session/mediaSessionContract.ts`
   - `src/lib/av/capture/desktopCapture.ts`
2. Implemented deterministic adapter coverage:
   - `tests/unit/ai/desktopCaptureAdapter.test.ts`
3. Verification:
   - `npm run typecheck` passed (`tsc --noEmit`, exit 0).
   - `npm run test:unit` passed (`141` passed, `4` skipped).
4. Queue outcome: `AVR-003` advanced to `DONE`; `AVR-004` promoted to `READY` (`YAI-020@DONE_GATE` retained), and deterministic next `P0` row remains `AVR-005`.

AVR-004 verification snapshot (2026-02-25):

1. Implemented desktop capture orchestration and fallback contracts:
   - `src/lib/av/capture/desktopCaptureOrchestration.ts`
   - `src/lib/av/runtime/avFallbackPolicy.ts`
2. Added deterministic orchestration coverage:
   - `tests/unit/ai/desktopCaptureOrchestration.test.ts`
3. Runtime outcomes:
   - Lifecycle hooks now expose deterministic `start`/`pause`/`stop`/`capture` contract behavior for desktop capture sessions.
   - Capture retry policy is bounded and deterministic (configured max attempts with deterministic exponential backoff, no jitter).
   - Fallback reason mapping is explicit and fail-closed (`policy_restricted`, `approval_required`, `session_not_running`, `session_paused`, `device_unavailable`, `capture_provider_error`, `retry_exhausted`, `invalid_request`).
   - Native authority/trust invariants remain explicit (`vc83_runtime_policy` precedence, `non_bypassable` approval invariant).
4. Verification:
   - `npm run typecheck` passed (`tsc --noEmit`, exit 0).
   - `npm run test:unit` passed (`146` files passed, `4` skipped; `709` tests passed, `80` skipped).
   - `npx vitest run tests/unit/ai/ingressEnvelopeAuthorityMatrix.test.ts tests/unit/ai/agentToolOrchestrationAuthorityInvariant.test.ts` passed (`2` files, `11` tests).
5. Queue outcome: `AVR-004` progressed `READY -> IN_PROGRESS -> BLOCKED -> DONE`; external dependency `YAI-020@DONE_GATE` cleared on 2026-02-26.

AVR-005 verification snapshot (2026-02-25):

1. Implemented device ingress adapter contract:
   - `src/lib/av/ingress/deviceIngestAdapter.ts`
2. Added deterministic ingress coverage:
   - `tests/unit/ai/deviceIngestAdapter.test.ts`
3. Contract outcomes:
   - Deterministic source identity builder for `webcam`, `usb_capture`, `hdmi_capture`, `ndi_capture`.
   - Monotonic sequence/timestamp fallback when provider frames omit timing metadata.
   - Normalized diagnostics/audio-runtime metadata in canonical `MediaSessionCaptureFrame` output.
4. Verification:
   - `npm run typecheck` passed (`tsc --noEmit`, exit 0).
   - `npm run test:unit` passed (`143` passed, `4` skipped).
5. Queue outcome: `AVR-005` advanced to `DONE`; dependency-unlocked rows `AVR-006` and `AVR-007` promoted to `READY`, with deterministic next `P0` row now `AVR-007`.

AVR-006 verification snapshot (2026-02-25):

1. Implemented mobile/glasses ingress bridge contract:
   - `src/lib/av/ingress/mobileGlassesBridge.ts`
2. Extended media-session contract for mobile/glasses bridge typing:
   - `src/lib/av/session/mediaSessionContract.ts`
3. Added deterministic bridge coverage:
   - `tests/unit/ai/mobileGlassesBridge.test.ts`
4. Contract outcomes:
   - Deterministic source identity for `mobile_stream_ios`, `mobile_stream_android`, and `glasses_stream_meta` via provider-agnostic source IDs.
   - Low-latency session control contract (`startSession`, `pauseSession`, `resumeSession`, `stopSession`) with fail-closed ingest when sessions are not running.
   - Deterministic sequence/timestamp normalization for continuous stream frames.
   - Source provenance metadata contract (`providerId`, `deviceProfile`, `streamId`, `transport`) and latency-budget diagnostics on each ingested frame.
5. Verification:
   - `npm run typecheck` passed (`tsc --noEmit`, exit 0) after rerun with refreshed `tsconfig.tsbuildinfo`.
   - `npm run test:unit` passed (`147` files passed, `4` skipped; `714` tests passed, `80` skipped).
6. Queue outcome: `AVR-006` advanced to `DONE`; no additional dependency-unlocked rows were created, and deterministic next promotable row is `AVR-008`.

AVR-007 verification snapshot (2026-02-25):

1. Implemented low-latency runtime contracts:
   - `src/lib/av/runtime/transportAdapters.ts`
   - `src/lib/av/runtime/realtimeMediaSession.ts`
2. Added deterministic runtime coverage:
   - `tests/unit/ai/realtimeMediaSession.test.ts`
3. Runtime outcomes:
   - Bidirectional transport packet contract for `audio_in`, `audio_out`, `video_in`, `video_out`.
   - Session clock snapshots (start/stop, tick count, uptime).
   - Deterministic jitter/latency/loss accounting and adaptive buffer target updates.
   - Deterministic fallback reason precedence (`policy_restricted` -> `device_unavailable` -> `provider_failover` -> `capture_backpressure` -> `network_degraded` -> `none`).
4. Verification:
   - `npm run typecheck` passed (`tsc --noEmit`, exit 0).
   - `npm run test:unit` passed (`144` passed, `4` skipped).
   - `npm run lint` passed (`0` errors, baseline warnings only).
5. Queue outcome: `AVR-007` advanced to `DONE`; `AVR-008` promoted to `READY`, and downstream `AVR-009` later promoted to `READY` when `YAI-021` moved to `DONE` on 2026-02-26.

AVR-008 verification snapshot (2026-02-25/2026-02-26):

1. Implemented transport downgrade policy contracts:
   - `src/lib/av/runtime/transportFallbackPolicy.ts`
2. Integrated downgrade visibility into runtime transport snapshots:
   - `src/lib/av/runtime/realtimeMediaSession.ts`
   - `src/lib/av/runtime/transportAdapters.ts`
3. Added deterministic downgrade coverage:
   - `tests/unit/ai/avTransportFallbackPolicy.test.ts`
   - `tests/unit/ai/realtimeMediaSession.test.ts`
4. Runtime outcomes:
   - Deterministic downgrade ladder is now explicit: `full_av` -> `video_low_fps` -> `audio_only`.
   - Every downgrade/recovery is operator-visible via reason codes (for example: `network_degraded_video_low_fps`, `network_degraded_audio_only`, `recovered_full_av`).
   - Fail-closed policy handling remains enforced with native precedence + approval invariants (`vc83_runtime_policy`, `non_bypassable`).
   - Runtime diagnostics now include downgrade transition counters in addition to fallback transition counters.
5. Verification:
   - `npm run typecheck` passed (`tsc --noEmit`, exit 0).
   - `npm run test:unit` passed (`149` files passed, `4` skipped; `728` tests passed, `80` skipped).
   - `npm run lint` passed (`0` errors, baseline warnings only).
6. Verification rerun (2026-02-26):
   - `npm run typecheck` failed on unrelated dirty-worktree baseline file (`src/components/window-content/templates-window/template-sets-tab.tsx:81`, `TS2589`).
   - `npm run test:unit` passed (`154` files passed, `4` skipped; `763` tests passed, `80` skipped).
   - `npm run lint` passed (`0` errors; `3300` baseline warnings).
7. Queue outcome: `AVR-008` advanced to `DONE` after blocker clearance and full verify rerun (`typecheck`, `test:unit`, `lint`) on 2026-02-26.

AVR-009 verification snapshot (2026-02-26):

1. Verified AV ingress integration in row-owned harness files:
   - `src/hooks/use-ai-chat.ts`
   - `convex/ai/chat.ts`
   - `convex/ai/agentExecution.ts`
2. Integration outcomes:
   - Chat send contract forwards `liveSessionId` plus AV runtime metadata fields through the action boundary.
   - Inbound metadata is persisted into runtime ingress payload and normalized into canonical ingress envelope contracts.
   - Authority invariants remain fail-closed for mutating intents (`vc83_runtime_policy` precedence, native registry route requirement, direct-device mutation blocked).
3. Verification:
   - `npm run typecheck` passed (`tsc --noEmit`, exit 0).
   - `npm run test:unit` passed (`154` files passed, `4` skipped; `763` tests passed, `80` skipped).
   - `npx vitest run tests/unit/ai/ingressEnvelopeAuthorityMatrix.test.ts tests/unit/ai/agentToolOrchestrationAuthorityInvariant.test.ts` passed (`2` files, `13` tests).
4. Queue outcome: `AVR-009` advanced to `DONE`; dependency-unlocked row `AVR-010` promoted to `READY`.

AVR-010 verification snapshot (2026-02-26):

1. Implemented no-bypass trust/approval bridge enforcement in row-owned files:
   - `convex/ai/agentToolOrchestration.ts`
   - `convex/ai/tools/registry.ts`
2. Runtime outcomes:
   - Mutating native-edge tool execution now blocks before approval/execution when `runtimeAuthorityPrecedence` drifts from `vc83_runtime_policy`.
   - Native-edge mutating intents now fail-closed for non-registry routes and direct device-mutation requests.
   - Trust-gate-required mutating intents now fail-closed when authority context is missing.
   - Mutating native-edge intents with required trust/approval policy now force `pending_approval` even under autonomous mode (non-bypass approval path).
3. Added invariant coverage:
   - `tests/unit/ai/agentToolOrchestrationAuthorityInvariant.test.ts`
4. Verification:
   - `npm run typecheck` passed (`tsc --noEmit`, exit 0) after unrelated baseline nullability repairs in `model-selector.tsx` and `platformModelManagement.ts`.
   - `npx vitest run tests/unit/ai/ingressEnvelopeAuthorityMatrix.test.ts tests/unit/ai/agentToolOrchestrationAuthorityInvariant.test.ts` passed (`2` files, `15` tests).
   - `npm run test:unit` failed on unrelated baseline row-external test (`tests/unit/ai/modelPolicy.test.ts`, expected `openai/gpt-4o`, received `anthropic/claude-3-5-sonnet`).
5. Queue outcome: `AVR-010` moved `READY -> IN_PROGRESS -> BLOCKED` pending row-external `V-UNIT` baseline recovery.

AVR-010 unblock + closeout rerun (2026-02-26):

1. Cleared row-external baseline blockers that were preventing required verification from completing (`tests/unit/ai/modelPolicy.test.ts`, `tests/unit/agents/agentStorePanel.test.ts`, and repository-wide TS2589/type drift in unrelated UI/Convex files).
2. Verification rerun:
   - `npm run typecheck` passed (`tsc --noEmit`, exit 0).
   - `npm run test:unit` passed (`157` files passed, `4` skipped; `786` tests passed, `80` skipped).
   - `npx vitest run tests/unit/ai/ingressEnvelopeAuthorityMatrix.test.ts tests/unit/ai/agentToolOrchestrationAuthorityInvariant.test.ts` passed (`2` files, `15` tests).
3. Queue outcome: `AVR-010` moved `BLOCKED -> IN_PROGRESS -> DONE`; dependency-unlocked row `AVR-011` promoted to `READY`.

### Latency SLO targets (P0 contract)

| SLO metric | Target (`p95`) | Hard fail threshold | Notes |
|---|---|---|---|
| Capture-to-ingress metadata write | `<= 120 ms` | `> 250 ms` | Applies to first frame + metadata publish event. |
| Ingress-to-harness envelope normalization | `<= 80 ms` | `> 150 ms` | Measures metadata-to-canonical-envelope path. |
| End-to-end frame-to-agent-turn availability | `<= 450 ms` | `> 900 ms` | Preview/analysis path budget before tool policy evaluation. |
| Mouth-to-ear (voice round-trip) | `<= 600 ms` | `> 1200 ms` | Includes STT/runtime/TTS selection + stream output. |
| Fallback transition propagation | `<= 200 ms` | `> 400 ms` | Time from degradation detection to explicit fallback reason emission. |

### YAI parity integration boundary

1. `YAI-018` owns AI chat live vision UX parity and initial `cameraRuntime` + `liveSessionId` wire-up.
2. `YAI-019` owns AI chat voice runtime bridge parity and initial `voiceRuntime` wire-up.
3. `YAI-020` owns parity observability for live camera/voice paths in current chat runtime.
4. `YAI-021` must close parity before `AVR-009` harness integration starts in this queue (dependency is closed and `AVR-009` is complete).
5. This workstream extends those parity paths into reusable, multi-source AV session contracts without changing native authority precedence rules from `YAI-014`/`YAI-015`.

---

## Target architecture

1. **Capture layer (`src/lib/av/capture/*`)**
   - Desktop screenshot/recording + local audio capture abstraction.
2. **Ingress layer (`src/lib/av/ingress/*`)**
   - Device adapters (webcam/UVC/mobile/glasses/digital video input).
3. **Session layer (`src/lib/av/session/*`)**
   - Canonical `MediaSession` contract + frame/audio packet envelope.
4. **Runtime layer (`src/lib/av/runtime/*`)**
   - Low-latency session engine, adaptive fallback policy, deterministic reason codes.
5. **Harness integration layer (`convex/ai/*`, `src/hooks/use-ai-chat.ts`)**
   - Metadata bridge into canonical ingress envelope and authority checks.
6. **Observability layer (runtime + tests + reports)**
   - Session lifecycle metrics, cadence/jitter/drop telemetry, correlation IDs.

---

## Acceptance criteria

1. **AV-1 Source coverage:** all required source classes can be represented in one canonical `MediaSession` contract.
2. **AV-2 Bidirectional low-latency path:** audio/video in both directions is supported with measurable fallback policy.
3. **AV-3 Ingress compatibility:** chat/harness metadata path accepts AV runtime fields without bypassing authority invariants.
4. **AV-4 Trust-safe execution:** AV-originated mutating intents are approval-gated and non-bypassable.
5. **AV-5 Observability parity:** every live session emits start/stop/cadence/jitter/drop/fallback diagnostics.
6. **AV-6 Regression confidence:** targeted unit + integration + desktop e2e checks run and are recorded in queue notes.

---

## Phase map (queue alignment)

1. **Phase A (`AVR-001`, `AVR-002`)**
   - Contract freeze + schema alignment.
2. **Phase B (`AVR-003`, `AVR-004`)**
   - Desktop capture core.
3. **Phase C (`AVR-005`, `AVR-006`)**
   - Device ingress adapters.
4. **Phase D (`AVR-007`, `AVR-008`)**
   - Low-latency transport/runtime + adaptive fallback.
5. **Phase E (`AVR-009`, `AVR-010`)**
   - Harness integration + trust/approval bridge.
6. **Phase F (`AVR-011`..`AVR-013`)**
   - Observability, regression matrix, and closeout.

---

## Upstream dependency gates

1. `YAI-021` must be `DONE` before harness-integration promotion (`AVR-009`).
2. `OCG-008` readiness/closure gates final hardening and closeout rows (`AVR-012`, `AVR-013`).
3. Preserve existing `YAI-014`/`YAI-015` authority contracts as normative constraints.
4. Gate status update (2026-02-27): upstream `OCG-008` is `DONE`; `AVR-012` closeout verification is complete (`DONE`) and `AVR-013` closeout is complete (`DONE`).

---

## Risk register

1. **Conflict risk with YAI parity rows**
   - Mitigation: block harness integration (`AVR-009`) on `YAI-021`.
2. **Latency regression risk across heterogeneous devices**
   - Mitigation: deterministic fallback ladder + device-matrix validation row.
3. **Trust bypass risk through edge/device bridges**
   - Mitigation: enforce native registry + approval gating in `AVR-010`.
4. **Scope explosion risk**
   - Mitigation: lane-bound ownership and 1-2 hour task slicing per queue row.

---

## Verification baseline

1. `npm run docs:guard`
2. `npm run typecheck`
3. `npm run lint`
4. `npm run test:unit`
5. `npx vitest run tests/unit/ai/ingressEnvelopeAuthorityMatrix.test.ts tests/unit/ai/agentToolOrchestrationAuthorityInvariant.test.ts`
6. `npm run test:e2e:desktop`

---

## AVR-011 verification snapshot (2026-02-26)

1. Implemented AV observability runtime contracts in `src/lib/av/runtime/realtimeMediaSession.ts`:
   - session start/stop timestamps + lifecycle state,
   - frame cadence ms/fps derivation,
   - jitter P95 + mouth-to-ear estimate,
   - fallback transition count and source-health status (`healthy`, `provider_failover`, `device_unavailable`, `policy_restricted`).
2. Extended chat action metadata passthrough in `convex/ai/chat.ts` with contract-first inputs:
   - `transportRuntime`,
   - `avObservability`.
3. Extended canonical ingress observability normalization in `convex/ai/agentExecution.ts`:
   - session lifecycle contract fields (`sessionStartedAtMs`, `sessionStoppedAtMs`, `sessionLifecycleState`),
   - jitter/mouth-to-ear/fallback-transition extraction,
   - deterministic source-health normalization while keeping native `vc83_runtime_policy` and non-bypass trust invariants unchanged.
4. Added/updated unit coverage:
   - `tests/unit/ai/realtimeMediaSession.test.ts`
   - `tests/unit/ai/ingressEnvelopeAuthorityMatrix.test.ts`
5. Focused verification:
   - `npx vitest run tests/unit/ai/realtimeMediaSession.test.ts tests/unit/ai/ingressEnvelopeAuthorityMatrix.test.ts` passed (`2` files, `17` tests).
6. Required row verification closeout:
   - `npm run typecheck` passed (`tsc --noEmit`, exit `0`) after TS2589 baseline fix in `src/components/window-content/integrations-window/microsoft-settings.tsx`.
   - `npm run test:unit` passed (`159` files passed, `4` skipped; `822` tests passed, `80` skipped).
   - `npm run lint` passed (`0` errors, `3353` baseline warnings).
7. Queue outcome:
   - `AVR-011` moved `READY -> IN_PROGRESS -> BLOCKED -> IN_PROGRESS -> BLOCKED -> IN_PROGRESS -> DONE`.

## AVR-012 verification snapshot (2026-02-26/2026-02-27)

1. Added contract-first device matrix + latency regression suite:
   - `tests/integration/ai/avDeviceMatrixLatency.integration.test.ts`
2. Matrix coverage executed with deterministic pass/fail thresholds:
   - desktop (`desktop_screenshot`, `desktop_record`)
   - webcam (`webcam`)
   - mobile stream (`mobile_stream_ios`)
   - glasses stream (`glasses_stream_meta`)
   - DVI input via digital capture class (`hdmi_capture`)
3. Latency/contract evidence artifacts written to:
   - `/Users/foundbrand_001/Development/vc83-com/tmp/reports/av-core/avr-012-device-matrix-latency-report.json`
   - `/Users/foundbrand_001/Development/vc83-com/tmp/reports/av-core/avr-012-device-matrix-latency-report.md`
4. Matrix suite outcome:
   - `npx vitest run tests/integration/ai/avDeviceMatrixLatency.integration.test.ts` passed (`1` file, `1` test).
   - Reported thresholds passed across all covered source classes:
     - capture-to-ingress: `86`-`118 ms` (target `<=120`, hard fail `>250`)
     - ingress-to-envelope: `58`-`78 ms` (target `<=80`, hard fail `>150`)
     - frame-to-agent-turn: `374`-`434 ms` (target `<=450`, hard fail `>900`)
     - mouth-to-ear: `435`-`460 ms` (target `<=600`, hard fail `>1200`)
     - fallback propagation: `120`-`150 ms` (target `<=200`, hard fail `>400`)
   - Native authority/trust invariants stayed explicit and non-bypassable (`vc83_runtime_policy` precedence, `non_bypassable` approval invariant, registry-route enforcement, direct-device mutation blocked).
5. Historical blocker outcomes on 2026-02-26:
   - `npm run typecheck` failed on row-external baseline errors (`apps/operator-mobile/app/(tabs)/index.tsx` TS2322; `src/lib/av/runtime/realtimeMediaSession.ts` TS2739/TS2741; `src/lib/av/runtime/transportFallbackPolicy.ts` TS2322).
   - `npm run test:unit` failed (`4` tests): `tests/unit/ai/agentToolOrchestrationAuthorityInvariant.test.ts` (2 failures, meeting-concierge command policy fail-closed mismatch) and `tests/unit/ai/meetingConciergeIngress.test.ts` (2 failures, `extractedPayloadReady` false).
   - `npm run test:e2e:desktop` failed (timeout at `tests/e2e/desktop-shell.spec.ts:11`; trace/video in `tmp/test-results/desktop-shell/*`).
   - `npm run docs:guard` passed (`Docs guard passed.`).
6. Recovery + closeout rerun on 2026-02-27:
   - `npm run typecheck` passed (`tsc --noEmit`, exit `0`) after tightening desktop companion session ID narrowing in `convex/ai/chat.ts`.
   - `npm run test:unit` passed (`164` files passed, `4` skipped; `863` tests passed, `80` skipped).
   - `npm run test:e2e:desktop` passed (`1` test), including `/store?section=calculator` deep-link alias parity after preserving calculator alias in `src/components/window-content/store-window.tsx`.
   - `npm run docs:guard` passed (`Docs guard passed.`).
7. Queue outcome:
   - `AVR-012` moved `READY -> IN_PROGRESS -> BLOCKED -> IN_PROGRESS -> DONE`; dependency-unlocked row `AVR-013` moved to `READY`.

## AVR-013 closeout snapshot (2026-02-27)

1. Published residual-risk register for production operation:
   - **R1: Device heterogeneity drift**: latency and fallback behavior can regress by capture class/provider stack even when contract tests stay green.
   - **R2: Native-edge trust-context drift**: missing or malformed native trust metadata can weaken operator confidence if not fail-closed.
   - **R3: Surface parity drift**: shell deep-link/query alias behavior can regress independently of AV runtime contracts.
   - **R4: Evidence freshness drift**: device-matrix artifacts can become stale as dependent workstreams land runtime changes.
2. Published rollback runbook policy for lane `F`:
   - **Rollback triggers**: any red in `V-TYPE`, `V-UNIT`, or `V-E2E-DESKTOP`; matrix threshold breach; non-bypass authority invariant regression.
   - **Immediate containment**: keep native `vc83_runtime_policy` fail-closed (`policy_restricted`/approval-required path), disable rollout expansion, and hold on current validated surface set.
   - **Recovery order**: restore green verify profile (`typecheck` -> `test:unit` -> `test:e2e:desktop` -> `docs:guard`), re-run device-matrix evidence generation, then re-issue queue/status sync.
3. Locked next-step production rollout waves:
   - **Wave 1 (internal)**: desktop shell + mac companion ingress only, with full trust/approval telemetry and no scope expansion while monitoring fallback/jitter trends.
   - **Wave 2 (pilot)**: controlled mobile/glasses ingress cohort after Wave 1 stability window, preserving approval-required mutating-intent path.
   - **Wave 3 (scaled)**: broadened source-class rollout only after repeated green verify profile + refreshed matrix evidence across desktop/webcam/mobile/glasses/DVI.
4. Downstream handoff note:
   - `AVR-012@DONE_GATE` consumers can proceed on latest source-of-truth queue state; `AVR` queue remains canonical for AV harness readiness.
5. Row verification:
   - `npm run docs:guard` passed (`Docs guard passed.`).
6. Queue outcome:
   - `AVR-013` moved `READY -> IN_PROGRESS -> DONE`; workstream queue is now fully complete (`AVR-001`..`AVR-013` all `DONE`).
