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
