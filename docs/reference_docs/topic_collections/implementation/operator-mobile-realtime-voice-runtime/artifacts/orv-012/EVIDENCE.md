# ORV-012 Chaos/Fallback Validation Evidence

Date: 2026-03-01

## Scenario matrix

| Scenario | Injection method | Expected behavior | Evidence |
|---|---|---|---|
| Forced transport drop | `downgradeVoiceTransportSelection(...reason: "websocket_closed")` | Runtime downgrades `websocket` -> `chunked_fallback`; fallback reason preserved; telemetry records `fallback_transition`. | `tests/integration/ai/voiceRuntimeChaosFallback.integration.test.ts` |
| Reorder / sequence anomalies | `resolveVoiceTransportSequenceDecision` with replay (`sequence:1`) and gap (`sequence:5`) against accepted `{0,1,2}` | Replay is deterministically ignored (`duplicate_replay`); gap is detected (`gap_detected`, `expectedSequence:3`) without session-correlation drift. | `tests/integration/ai/voiceRuntimeChaosFallback.integration.test.ts` |
| Device-level packet impairment harness | `createVoiceRuntimeChaosHarness` with `dropEveryN`, `reorderWindowSize`, `jitterMs` | Deterministic drop/reorder/jitter decisions are produced before websocket send and can be flushed safely across session teardown. | `apps/operator-mobile/src/lib/voice/chaosHarness.ts`; `tests/unit/ai/mobileVoiceChaosHarness.test.ts`; `tests/integration/ai/voiceRuntimeChaosFallback.integration.test.ts` |
| Physical radio/link impairment automation | Hardware runner toggles Wi-Fi/data radio states on Android (`svc wifi|data`) and generates deterministic iOS manual scenarios | Real-device impairment scenarios produce repeatable artifacts (`timeline`, `summary`, connectivity/logcat dumps) for fallback/reconnect/correlation validation. | `scripts/mobile/voice-radio-chaos-hardware.mjs`; `docs/reference_docs/topic_collections/implementation/operator-mobile-realtime-voice-runtime/artifacts/orv-012/HARDWARE_NETWORK_IMPAIRMENT_AUTOMATION.md` |
| Jitter spike / latency breach | Telemetry `latency_checkpoint` at `stream_frame_roundtrip` with `latencyMs:1200`, `targetMs:600`, `breached:true` | Adaptive decision is `latency_budget_breached`; continuity IDs remain `liveSessionId::voiceSessionId`. | `tests/integration/ai/voiceRuntimeChaosFallback.integration.test.ts` |
| Provider timeout | Telemetry `provider_failure` with `reasonCode:"provider_timeout"` and fallback provider `browser` | Trust failover event classifies `voice_failover_reason=provider_timeout`, health `degraded`, and keeps voice session correlation. | `tests/integration/ai/voiceRuntimeChaosFallback.integration.test.ts`; `apps/operator-mobile/src/hooks/useMobileVoiceRuntime.ts` |
| Browser/device runtime chaos probe (mobile e2e) | Playwright mobile spec executes drop/reorder/jitter/timeout injection logic in page runtime | Mobile e2e now validates direct voice chaos probe path in-browser, not only shell navigation. | `tests/e2e/mobile-voice-chaos.spec.ts`; `playwright.mobile.config.ts` |

## Correlation continuity proof

- Telemetry contract correlation key asserted as `mobile_live_orv_012_chaos::voice_orv_012_chaos`.
- Every normalized telemetry event enforces the same `liveSessionId` + `voiceSessionId`.
- Trust payloads preserve `voice_session_id` from the same correlated contract.

## Required verify logs

- `typecheck.log` / `typecheck.exit`
- `test-unit.log` / `test-unit.exit`
- `test-integration.log` / `test-integration.exit`
- `test-e2e-mobile.log` / `test-e2e-mobile.exit`
- `docs-guard.log` / `docs-guard.exit`
- `hardware/*/summary.json` (physical-device impairment lane)
