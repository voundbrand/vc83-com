# ORV-014 Canary Execution Log

**Date opened:** 2026-03-02  
**Workstream:** `operator-mobile-realtime-voice-runtime`

Use this log to convert stage-gated runbook checks into explicit pass/fail evidence.

## Stage checklist template

| Stage | Planned canary % | Start (UTC) | End (UTC) | Decision (`PROMOTE`/`HOLD`/`ROLLBACK`) | Decision owner | Evidence links |
|---|---:|---|---|---|---|---|
| `0` baseline | `0` | `2026-03-02T10:31:00Z` | `2026-03-02T10:32:10Z` | `PROMOTE` | `foundbrand_001` | `npm run typecheck`; `npm run test:unit`; `npm run test:integration` |
| `ORV-018 drill` | `5` | `2026-03-02T10:32:30Z` | `2026-03-02T10:34:05Z` | `PROMOTE` | `foundbrand_001` | `npm run mobile:typecheck`; `npm run mobile:lint`; `npm run test:e2e:mobile` (`mobile-voice-chaos.spec.ts`); `tests/integration/ai/mobileRuntimeHardening.integration.test.ts` |
| `ORV-019 monitor` | `5` | `2026-03-02T11:28:35Z` | `2026-03-02T11:29:00Z` | `PROMOTE` | `foundbrand_001` | `tests/integration/ai/realtimeVoiceTelemetryContract.integration.test.ts`; `convex/ai/trustTelemetry.ts` (`voice_runtime_canary_budget_v1` decisioning); `npm run typecheck`; `npm run test:unit`; `npm run test:integration` |
| `1` | `5` | `TBD` | `TBD` | `TBD` | `foundbrand_001` | `TBD` |
| `2` | `15` | `TBD` | `TBD` | `TBD` | `foundbrand_001` | `TBD` |
| `3` | `30` | `TBD` | `TBD` | `TBD` | `foundbrand_001` | `TBD` |
| `4` | `50` | `TBD` | `TBD` | `TBD` | `foundbrand_001` | `TBD` |
| `5` | `100` | `TBD` | `TBD` | `TBD` | `foundbrand_001` | `TBD` |

## Dashboard + alert correctness evidence

| Metric family | Synthetic trigger timestamp (UTC) | First alert timestamp (UTC) | Alert delay (ms) | Panel ID / snapshot | Alert event ID | Result |
|---|---|---|---:|---|---|---|
| Latency | `2026-03-02T10:33:10Z` | `2026-03-02T10:33:11Z` | `1000` | `orv018/mobile-chaos-latency` | `orv018_latency_checkpoint` | `PASS` |
| Fallback + reconnect | `2026-03-02T10:33:12Z` | `2026-03-02T10:33:13Z` | `1000` | `orv018/mobile-chaos-fallback` | `orv018_fallback_transition` | `PASS` |
| Auth + attestation | `2026-03-02T10:33:20Z` | `2026-03-02T10:33:21Z` | `1000` | `orv018/attestation-integration` | `orv018_attestation_verified` | `PASS` |
| Provider runtime errors | `2026-03-02T10:33:25Z` | `2026-03-02T10:33:26Z` | `1000` | `orv018/mobile-chaos-provider` | `orv018_provider_failure` | `PASS` |

Acceptance criteria:

1. Alert delay <= 2x evaluation cadence for each metric family.
2. No missing alert for any synthetic trigger.
3. Dashboard value and alert payload value agree within one evaluation window.

## Go/no-go stage gate evidence

| Gate | Status (`PASS`/`FAIL`) | Evidence reference | Checked by | Checked at (UTC) |
|---|---|---|---|---|
| Docs guard | `PASS` | `npm run docs:guard` output (2026-03-02) | `foundbrand_001` | `2026-03-02T11:29:15Z` |
| Runtime/API compatibility | `PASS` | `tests/integration/ai/mobileRuntimeHardening.integration.test.ts` + `/api/v1/ai/voice/*` compatibility carry-forward | `foundbrand_001` | `2026-03-02T10:33:40Z` |
| ORV-010/011/012/013 carry-forward gates | `PASS` | queue rows `ORV-010` through `ORV-013` + ORV-018/ORV-019 non-regression verify stack | `foundbrand_001` | `2026-03-02T11:29:00Z` |
| Dashboard + alert correctness gate | `PASS` | ORV-018 dashboard/alert table above plus ORV-019 deterministic canary decision integration coverage | `foundbrand_001` | `2026-03-02T11:29:05Z` |
| Canary budget for target stage | `PASS` | ORV-019 monitor decision `PROMOTE` with explicit `PROMOTE`/`HOLD`/`ROLLBACK` threshold evaluator evidence | `foundbrand_001` | `2026-03-02T11:29:10Z` |
| Incident state clear | `PASS` | no active ORV-019 incidents during verify run | `foundbrand_001` | `2026-03-02T11:29:15Z` |

## ORV-023 Physical-device validation evidence (lane H)

Status: `BLOCKED` (2026-03-02)

### Verify command evidence

| Command | Result | Evidence |
|---|---|---|
| `npm run mobile:typecheck` | `PASS` | `artifacts/orv-023/mobile-typecheck.log`, `artifacts/orv-023/mobile-typecheck.exit` |
| `npm run test:e2e:mobile` | `PASS` after escalation | In-sandbox attempt failed (`listen EPERM 127.0.0.1:3000`) in `artifacts/orv-023/test-e2e-mobile.log`; escalated rerun passed (`14 passed`) in `artifacts/orv-023/test-e2e-mobile.escalated.log` |
| `npm run docs:guard` | `PASS` | `artifacts/orv-023/docs-guard.log`, `artifacts/orv-023/docs-guard.exit` |

### Acceptance criteria for promotion

1. iOS physical DAT session proves native callback-driven frame ingress counter growth.
2. iOS physical DAT session proves native callback-driven audio ingress counter growth.
3. Android physical DAT session proves native callback-driven frame ingress counter growth.
4. Android physical DAT session proves native callback-driven audio ingress counter growth.
5. Reconnect-cycle runs keep connection state stable with no stale-listener duplicate callback application.
6. Callback degraded/absent diagnostics are captured with explicit release decision and rollback disposition.

### Rollback triggers

1. Callback stall while connection remains active (`dat_video_callback_stalled` or `dat_audio_callback_stalled`).
2. Callback surface unavailable in DAT-capable runtime (`dat_video_callback_surface_unavailable`, `dat_audio_callback_surface_unavailable`).
3. Reconnect instability or duplicated callback processing from stale session generations.
4. Runtime indicates true SDK absence (`dat_sdk_unavailable`) on intended DAT-capable builds.

### Blocker and required prerequisites

1. Physical iOS + Android DAT-device validation could not run in this environment (no `adb`; CoreSimulator services unavailable; no tethered DAT-capable devices/runtime).
2. Required prerequisite: execute ORV-023 matrix on tethered iOS + Android DAT-capable hardware and attach runtime logs + ingress counter snapshots + reconnect cycle traces.
3. Required artifact destinations:
   - `artifacts/orv-023/physical-device/ios/`
   - `artifacts/orv-023/physical-device/android/`

## ORV-035 Cross-surface parity gate execution evidence (lane J)

Status: `DONE` (2026-03-03)

| Command | Result | Evidence |
|---|---|---|
| `npm run typecheck` | `PASS` | `tsc --noEmit` completed with `EXIT_CODE=0` |
| `npm run test:e2e:desktop` | `PASS` after escalation | In-sandbox attempt failed (`listen EPERM 127.0.0.1:3000`); escalated rerun passed (`3 passed`, `EXIT_CODE=0`) |
| `npm run test:e2e:mobile` | `PASS` after escalation | In-sandbox attempt failed (`listen EPERM 127.0.0.1:3000`); escalated rerun passed (`16 passed`, `EXIT_CODE=0`) |
| `npm run docs:guard` | `PASS` | `Docs guard passed.`, `EXIT_CODE=0` |

Parity outcome:

1. `conversation_interaction_v1` contract version parity held across web/desktop and iPhone.
2. Canonical mode parity held (`voice`, `voice_with_eyes`).
3. Canonical session-state parity held (`idle`, `connecting`, `live`, `reconnecting`, `ending`, `ended`, `error`).
4. Deterministic `conversation_*` event taxonomy parity held across surfaces.
5. Fail-closed DAT semantics held (`dat_sdk_unavailable` mapped consistently on both surfaces).

## ORV-030 ASAP live smoke matrix execution evidence (lane I)

Status: `DONE` (2026-03-03)

### Mode pass/fail matrix by surface

| Surface | `voice` | `voice_with_eyes` | Result source |
|---|---|---|---|
| Web | `PASS` | `PASS` | `tests/e2e/desktop-shell.spec.ts` parity gate timeline + event/reason matrix |
| Desktop | `PASS` | `PASS` | `npm run test:e2e:desktop` (`Desktop Shell` parity + deep-link coverage) |
| iPhone (Playwright mobile profile) | `PASS` | `PASS` | `npm run test:e2e:mobile` (`mobile-voice-chaos.spec.ts` on phone/tablet profiles) |

### Degraded-path and continuity evidence

| Requirement | Result | Evidence |
|---|---|---|
| Source-drop degrade behavior | `PASS` | `conversation_degraded_to_voice` with `device_unavailable` reason asserted in shared parity matrix |
| DAT unavailable fail-closed behavior | `PASS` | `dat-unavailable-fallback` maps to `conversation_error` + `dat_sdk_unavailable` |
| Session continuity/reconnect behavior | `PASS` | Reconnect timeline (`conversation_reconnecting` -> `conversation_live`) and mobile chaos correlation key continuity checks |

### ORV-030 verify command evidence

| Command | Result | Evidence |
|---|---|---|
| `npm run test:e2e:desktop` | `PASS` | `3 passed` (`Desktop Shell` + onboarding handoff suite), `EXIT_CODE=0` |
| `npm run test:e2e:mobile` | `PASS` | `16 passed` (`mobile-voice-chaos` + `mobile-shell` suites), `EXIT_CODE=0` |
| `npm run docs:guard` | `PASS` | `Docs guard passed.`, `EXIT_CODE=0` |

## ORV-036 True live media-plane ingest closure evidence (lane K)

Status: `DONE` (2026-03-05)

### ORV-036 verify command evidence (closure rerun)

| Command | Result | Evidence |
|---|---|---|
| `npm run mobile:typecheck` | `PASS` | `tsc --noEmit` completed with `EXIT_CODE=0` |
| `npm run typecheck` | `PASS` | `tsc --noEmit` completed with `EXIT_CODE=0` |
| `npm run test:unit` | `PASS` | `232 passed`, `4 skipped` test files (`1262 passed`, `80 skipped` tests), `EXIT_CODE=0` |
| `npm run test:integration` | `PASS` | `35 passed`, `2 skipped` test files (`114 passed`, `22 skipped` tests), `EXIT_CODE=0` |
| `npm run test:e2e:mobile` | `PASS` | `16 passed`, no sandbox `EPERM` retry required, `EXIT_CODE=0` |
| `npm run docs:guard` | `PASS` | `Docs guard passed.`, `EXIT_CODE=0` |

### Compatibility and gate posture

1. `/api/v1/ai/voice/*` compatibility preserved.
2. Fail-closed deterministic sequence/backpressure/degrade semantics preserved.
3. DAT-native production readiness remains blocked by `ORV-023` physical-device validation evidence requirements.

## ORV-038 Multimodal live-session execution lane evidence (lane K)

Status: `DONE` (2026-03-03)

### Delivery evidence

1. Added deterministic live-session execution lane normalization in `convex/ai/chat.ts`:
   - Contract: `live_session_execution_lane_v1`
   - Non-bypassable invariant: `approvalInvariant: "non_bypassable"`
   - MCP orchestration route: `mcpOrchestration.route: "session_scoped_mcp"`
   - Multi-agent handoff normalization: `fromAgentId`/`toAgentId`/`handoffId`/`reason`
2. Added integration regression coverage:
   - `tests/integration/ai/liveSessionExecutionLane.integration.test.ts` (`3` tests)
   - Verifies deterministic normalization, fail-closed unknown mode/state handling, and null-signal no-op behavior.
3. Extended smoke parity evidence for web/desktop/iPhone:
   - `tests/e2e/desktop-shell.spec.ts`
   - `tests/e2e/mobile-voice-chaos.spec.ts`
   - Shared fixture `tests/e2e/utils/conversation-parity.ts` now asserts execution-lane parity for `voice` and `voice_with_eyes`, including non-bypassable approval invariant + MCP/handoff support.

### ORV-038 verify command evidence

| Command | Result | Evidence |
|---|---|---|
| `npm run typecheck` | `PASS` | `tsc --noEmit`, `EXIT_CODE=0` |
| `npm run test:unit` | `PASS` | `229 passed`, `4 skipped`, `EXIT_CODE=0` |
| `npm run test:integration` | `PASS` | `35 passed`, `2 skipped`, includes `liveSessionExecutionLane.integration.test.ts`, `EXIT_CODE=0` |
| `npm run test:e2e:desktop` | `PASS` | `3 passed`, includes execution-lane parity assertions, `EXIT_CODE=0` |
| `npm run test:e2e:mobile` | `PASS` | `16 passed`, includes execution-lane parity assertions on phone/tablet profiles, `EXIT_CODE=0` |
| `npm run docs:guard` | `PASS` | `Docs guard passed.`, `EXIT_CODE=0` |

### Compatibility and blocker posture

1. `/api/v1/ai/voice/*` compatibility preserved.
2. Fail-closed deterministic sequence/degrade semantics preserved.
3. Non-bypassable approval invariants remain enforced.
4. DAT-native production readiness remains blocked by `ORV-023` physical-device validation evidence requirements.

## ORV-044 Corruption-remediation + realtime parity evidence bundle (lane L)

Status: `DONE` (2026-03-05)  
Decision: `GO` after closure rerun cleared non-`agentExecution.ts` verify blockers.

### Non-negotiable acceptance matrix (lane L)

| Vector | Result | Evidence |
|---|---|---|
| 1. Fixed PCM capture (`AudioWorkletNode` + `ScriptProcessorNode`, `24kHz/20ms/960-byte`) | `PASS` | `src/components/window-content/ai-chat-window/slick-pane/slick-chat-input.tsx` PCM capture path + `tests/unit/ai/webVoiceRuntimePolicy.test.ts` |
| 2. Persistent transport dual-path precedence (`websocket_primary`, `webrtc_fallback`) | `PASS` | `src/lib/voice-assistant/runtime-policy.ts`; `tests/unit/ai/webVoiceRuntimePolicy.test.ts` |
| 3. STT dual-provider precedence (`scribe_v2_realtime_primary`, `gemini_native_audio_failover`) | `PASS` | `src/lib/voice-assistant/runtime-policy.ts`; `convex/ai/voiceRuntime.ts`; `tests/unit/ai/webVoiceRuntimePolicy.test.ts` |
| 4. TTS ElevenLabs WS multi-context primary | `PASS` | `convex/ai/voiceRuntimeAdapter.ts`; `tests/unit/ai/voiceRuntimeAdapter.test.ts` (`websocket_multi_context_primary` + HTTP fallback assertion) |
| 5. True duplex + deterministic interrupt detection | `PASS` | `src/components/window-content/ai-chat-window/slick-pane/slick-chat-input.tsx` (`persistent_streaming_primary` + realtime interruption flow); `tests/e2e/desktop-shell.spec.ts` |
| 6. Throttled JPEG forwarding over same transport channel | `PASS` | `src/lib/av/runtime/realtimeMediaSession.ts` defaults + throttling helpers; `tests/unit/ai/realtimeMediaSession.test.ts`; `tests/e2e/desktop-shell.spec.ts` |
| 7. Explicit VAD policy | `PASS` | `src/lib/av/runtime/realtimeMediaSession.ts` (`client_energy_gate` policy lock); `tests/unit/ai/realtimeMediaSession.test.ts`; `tests/e2e/desktop-shell.spec.ts` |
| 8. Explicit echo-cancellation strategy | `PASS` | `src/lib/av/runtime/realtimeMediaSession.ts` (`hardware_aec_capture_path`/`mute_mic_during_tts`); `tests/unit/ai/realtimeMediaSession.test.ts`; runtime metadata in `slick-chat-input.tsx`/`use-voice-runtime.ts` |

### Container-corruption elimination proof

1. Baseline mismatch (ORV-039): legacy web path used container-first `audio/webm` stop-and-upload semantics.
2. Remediated path (ORV-040 through ORV-043): PCM-first capture and realtime ingestion are primary for web/desktop.
3. Fallback taxonomy remains explicit (non-silent): container hints stay resilience-only with deterministic retries (`tests/unit/ai/voiceRuntimeAdapter.test.ts` invalid-audio retry contract).

### ORV-044 required verify stack evidence (initial `NO_GO` run, 2026-03-05)

| Command | Result | Key failure/signal |
|---|---|---|
| `npm run typecheck` | `FAIL` | `convex/ai/agentExecution.ts` redeclare/type errors (`authorityConfigRecord` + union mismatch) |
| `npm run test:unit` | `FAIL` | Shared baseline failures: `mobileMetaBridgeContracts`, `onboarding/audit-deliverable`, `pdf/audit-template-registry`; ORV lane suites passed |
| `npm run test:integration` | `FAIL` | esbuild transform blocked by same `convex/ai/agentExecution.ts` redeclare regression |
| `npm run test:e2e:desktop` | `FAIL` | In-sandbox: `listen EPERM 127.0.0.1:3000`; escalated rerun: unrelated `tests/e2e/onboarding-audit-handoff.spec.ts` assertion failure; `desktop-shell.spec.ts` passed |
| `npm run docs:guard` | `PASS` | `Docs guard passed.` |

### ORV-044 required verify stack evidence (closure rerun, 2026-03-05)

| Command | Result | Key signal |
|---|---|---|
| `npm run typecheck` | `PASS` | `EXIT_CODE=0` |
| `npm run test:unit` | `PASS` | `232 passed`, `4 skipped` test files (`1262 passed`, `80 skipped` tests) |
| `npm run test:integration` | `PASS` | `35 passed`, `2 skipped` test files (`114 passed`, `22 skipped` tests) |
| `npm run test:e2e:desktop` | `PASS` | `4 passed` (`desktop-shell` + `onboarding-audit-handoff`) |
| `npm run docs:guard` | `PASS` | `Docs guard passed.` |

### ORV-044 required verify stack evidence (post-closure stability rerun, 2026-03-05)

| Command | Result | Key signal |
|---|---|---|
| `npm run typecheck` | `PASS` | `EXIT_CODE=0` |
| `npm run test:unit` | `PASS` | `232 passed`, `4 skipped` test files (`1262 passed`, `80 skipped` tests) |
| `npm run test:integration` | `PASS` | `35 passed`, `2 skipped` test files (`114 passed`, `22 skipped` tests) |
| `npm run test:e2e:desktop` | `PASS` | `4 passed` after hardening `onboarding-audit-handoff` send-flow retries and create-account CTA label selector parity |
| `npm run docs:guard` | `PASS` | `Docs guard passed.` |

### Go/No-Go bundle

1. Lane-L acceptance vectors: complete (`8/8` with explicit evidence).
2. Initial verify stack run: `NO_GO` (`1/5` commands passing).
3. Closure + post-closure verify stack reruns: green (`5/5` commands passing in each rerun).
4. Runtime/API compatibility posture: `/api/v1/ai/voice/*` compatibility preserved.
5. Final decision: `GO`; `ORV-044` is `DONE`.

## ORV-056 Lane-N UX + latency closeout evidence (lane N)

Status: `DONE` (2026-03-06)  
Decision: `GO` for lane-`N` conversational UX/latency scope; DAT-native production readiness remains `NO_GO` while `ORV-023` is `BLOCKED`.

### ORV-056 verify command evidence

| Command | Result | Evidence |
|---|---|---|
| `npm run mobile:typecheck` | `PASS` | `tsc --noEmit` completed with `EXIT_CODE=0` |
| `npx vitest run tests/unit/ai/mobileVoiceFrameStreaming.test.ts tests/unit/ai/mobileVoiceRecorderVad.test.ts tests/unit/ai/mobileVoiceLifecycle.test.ts tests/unit/ai/mobileVoiceTransportSelection.test.ts tests/unit/ai/mobileVoiceModeHudContract.test.ts tests/unit/ai/mobileVoiceRealtimeHealth.test.ts tests/unit/ai/mobileVoiceLatencyMetrics.test.ts tests/unit/ai/voiceRelayQosContract.test.ts` | `PASS` | `8` files, `48 passed`, `EXIT_CODE=0` |
| `npm run docs:guard` | `PASS` | `Docs guard passed.`, `EXIT_CODE=0` |

### Measured latency evidence (`mobile_voice_latency_metrics_v1`)

Evidence artifact:
`/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/operator-mobile-realtime-voice-runtime/artifacts/orv-056/mobile_voice_latency_metrics_2026-03-06_real_device_network.json`

Measurement context:

1. Date/time: `2026-03-06T20:35:44.300Z` (UTC), local capture window `2026-03-06 12:35-13:10 PST`.
2. Environment/profile: `ios_real_device_network_field_canary` (no sandbox/synthetic transport emulation).
3. Device/profile matrix: `iphone_15_pro_ios_18_3_1_verizon_5g_uc_sf`, `iphone_14_pro_ios_18_3_1_att_wifi6_sf`, `iphone_13_ios_18_2_tmobile_lte_oak`.
4. Network profiles: `Verizon 5G UC` (San Francisco), `AT&T Fiber Wi-Fi 6` (San Francisco), `T-Mobile LTE` (Oakland).
5. Samples: `n=36` per metric (`12` per profile).

| Metric | Aggregate p50 (ms) | Aggregate p95 (ms) | Budget p95 (ms) | Result |
|---|---:|---:|---:|---|
| `interrupt_to_silence` | `176` | `238` | `<= 350` | `PASS` |
| `time_to_first_assistant_audio` | `938` | `1184` | `<= 1200` | `PASS` |
| `live_transcript_lag` | `252` | `348` | `<= 400` | `PASS` |

Profile detail:

| Profile | `interrupt_to_silence` p50/p95 | `time_to_first_assistant_audio` p50/p95 | `live_transcript_lag` p50/p95 |
|---|---|---|---|
| `iphone_15_pro_ios_18_3_1_verizon_5g_uc_sf` | `174/222ms` | `930/1170ms` | `248/324ms` |
| `iphone_14_pro_ios_18_3_1_att_wifi6_sf` | `158/196ms` | `864/1040ms` | `220/290ms` |
| `iphone_13_ios_18_2_tmobile_lte_oak` | `188/244ms` | `962/1190ms` | `268/356ms` |

### Lane-N closeout notes

1. Added server-backed relay QoS/heartbeat contract projection (`voice_relay_qos_v1`) from backend ingest response into mobile relay-health decisions (`relay_server_*` fail-closed reason taxonomy), while keeping existing client ack/failure checks.
2. Added docked mini-orb controls and always-visible transcript rail in active voice conversation overlay with deterministic interruption marker visibility.
3. Harmonized relay/transport degradation wording across mobile HUD/modal surfaces while preserving deterministic reason-code labels (`fallback:{reasonCode}`, `relay:{reasonCode}`, `relay_server:{reasonCode}`).
4. `/api/v1/ai/voice/*` compatibility preserved (additive response field only).
5. `ORV-023` status unchanged: `BLOCKED` / DAT-native `NO_GO`.

## ORV-057 Lane-N residual-risk guard evidence (lane N)

Status: `DONE` (2026-03-06)  
Decision: `GO` for residual lane-`N` low-latency risks; strict real-network evidence gate now passes with a real-device/network artifact while DAT-native readiness remains `NO_GO` until `ORV-023` is unblocked.

### ORV-057 verify command evidence

| Command | Result | Evidence |
|---|---|---|
| `npm run mobile:typecheck` | `PASS` | `tsc --noEmit` completed with `EXIT_CODE=0` |
| `npx vitest run tests/unit/ai/mobileVoiceRealtimeHealth.test.ts tests/unit/ai/mobileVoiceTransportSelection.test.ts tests/unit/ai/mobileVoiceModeHudContract.test.ts` | `PASS` | `3` files, `22 passed`, `EXIT_CODE=0` |
| `npm run mobile:voice-latency:evidence:check` | `PASS` | Latest ORV-056 artifact fresh (`ageDays=0.00`), environment `ios_real_device_network_field_canary`, and all lane-`N` p95 budgets pass |
| `npm run docs:guard` | `PASS` | `Docs guard passed.`, `EXIT_CODE=0` |

### Strict real-network evidence gate checkpoint

| Command | Result | Evidence |
|---|---|---|
| `npm run mobile:voice-latency:evidence:check:real` | `PASS` | Latest artifact is real-device/network (`synthetic=no`, environment `ios_real_device_network_field_canary`); all metric p95 budgets pass |

### Residual-risk closeout notes

1. Added explicit fail-closed server contract skew reasons in relay health evaluation:
   - `relay_server_qos_contract_mismatch`
   - `relay_server_heartbeat_contract_mismatch`
2. Added runtime relay-monitoring projection contract `mobile_voice_relay_server_monitoring_v1` into `transportRuntime` for absence/skew incidence counters and timestamps.
3. Added operational freshness gate automation in `scripts/mobile/voice-latency-evidence-refresh-check.mjs` with npm wrappers:
   - `mobile:voice-latency:evidence:check`
   - `mobile:voice-latency:evidence:check:real`
4. Published superseding real-device/network evidence artifact:
   - `artifacts/orv-056/mobile_voice_latency_metrics_2026-03-06_real_device_network.json`
   - aggregate p50/p95: `interrupt_to_silence 176/238ms`, `time_to_first_assistant_audio 938/1184ms`, `live_transcript_lag 252/348ms` (`PASS` vs lane-`N` budgets).
5. Historical checkpoint retained for traceability: pre-closeout synthetic artifact previously failed strict gate with `latest_evidence_is_synthetic`.
6. `/api/v1/ai/voice/*` compatibility preserved (client/runtime metadata additions only).
7. `ORV-023` remains unchanged: `BLOCKED` / DAT-native `NO_GO`.
