# ORV-014 Canary Rollout Runbook

**Date:** 2026-03-06  
**Workstream:** `operator-mobile-realtime-voice-runtime`  
**Queue row:** `ORV-014`  
**Scope guard:** Preserve ORV-010 continuity, ORV-011 telemetry taxonomy/ingestion, ORV-012 chaos/fallback coverage, and ORV-013 fail-closed attestation + adaptive rate-limit behavior.
**Named-owner map:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/operator-mobile-realtime-voice-runtime/ORV_014_OWNER_HANDOFF_ROSTER.md`  
**Execution evidence log:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/operator-mobile-realtime-voice-runtime/ORV_014_CANARY_EXECUTION_LOG.md`

---

## Canary policy matrix

| Metric | Threshold | Window | Trigger action | Rollback action |
|---|---|---|---|---|
| Live transcript lag `P95` | `> 400ms` for 2 consecutive windows | 10m rolling; evaluate every 5m | Freeze percentage increase; page runtime + mobile owners | Roll back to prior stable mobile rollout percent and force `websocket`-first fallback while incident is open |
| Barge-in interrupt latency `P95` | `> 350ms` for 2 consecutive windows | 10m rolling; evaluate every 5m | Stop canary promotion; mark `DEGRADED` in runtime status board | Roll back canary cohort and disable realtime assistant streaming (`chunked_fallback` only) |
| Time-to-first-assistant-audio `P95` | `> 1200ms` for 2 consecutive windows | 10m rolling; evaluate every 5m | Stop canary promotion; page runtime + mobile owners | Roll back canary cohort and force non-realtime assistant path while incident is open |
| Transport fallback rate (`webrtc` -> `websocket` or `chunked_fallback`) | `> 12%` sustained or `> 20%` spike in any single window | 30m sustained + 5m spike checks | Trigger transport health investigation and hold rollout | Roll back to previous percent and apply forced transport policy for affected app version |
| Reconnect failure rate | `> 3%` failed reconnect sessions | 30m rolling | Halt promotion; require explicit SRE + mobile signoff | Roll back canary slice and apply reconnect cooldown policy |
| Session-open auth failures (`vt_auth_*`, `vt_attest_*`) | `> 1.5%` of open attempts or any missing identity metadata fail-open event | 15m rolling with immediate hard trigger on fail-open | Immediate incident + rollout freeze | Immediate full rollback and enforce strict fail-closed open gating across all active canary cohorts |
| Provider runtime errors (`vt_provider_timeout`, `vt_provider_unavailable`, `vt_provider_stream_error`) | `> 2%` across live sessions | 15m rolling | Freeze rollout and shift traffic away from unstable provider tier | Roll back cohort and enforce provider failover/default fallback tier |

---

## Rollout stages

1. Stage `0` (baseline): `0%` production canary, collect baseline telemetry for 24h.
2. Stage `1`: `5%` of eligible operator-mobile realtime sessions for 2h minimum.
3. Stage `2`: `15%` for 4h minimum.
4. Stage `3`: `30%` for 8h minimum.
5. Stage `4`: `50%` for 24h minimum.
6. Stage `5`: `100%` after final go/no-go approval.

Promotion rule: each stage needs all policy-matrix budgets green for the full minimum duration and no open `SEV-1/SEV-2` incidents tied to realtime runtime.

Automatic rollback rule: any hard trigger or two consecutive threshold breaches in the same metric window causes immediate rollback to previous stable stage.

### ORV-056 published latency baseline (2026-03-06)

Source artifact:
`/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/operator-mobile-realtime-voice-runtime/artifacts/orv-056/mobile_voice_latency_metrics_2026-03-06_real_device_network.json`

Context:

1. Evidence contract: `mobile_voice_latency_metrics_v1`.
2. Environment/profile: `ios_real_device_network_field_canary` (real-device/network canary run).
3. Device/profile matrix: `iphone_15_pro_ios_18_3_1_verizon_5g_uc_sf`, `iphone_14_pro_ios_18_3_1_att_wifi6_sf`, `iphone_13_ios_18_2_tmobile_lte_oak`.
4. Sample count: `n=36` per metric (`12` per profile).

Aggregate result:

1. `interrupt_to_silence` p50/p95: `176/238ms` (`PASS` vs `<= 350ms` p95 budget).
2. `time_to_first_assistant_audio` p50/p95: `938/1184ms` (`PASS` vs `<= 1200ms` p95 budget).
3. `live_transcript_lag` p50/p95: `252/348ms` (`PASS` vs `<= 400ms` p95 budget).

Go/No-go note:

1. Lane-`N` latency closeout is `GO` for non-DAT scope.
2. DAT-native production claim remains `NO_GO` while `ORV-023` is `BLOCKED`.

### ORV-057 residual-risk guard updates (2026-03-06)

Operational controls:

1. Relay payload/contract skew monitoring is now projected in `transportRuntime` via `mobile_voice_relay_server_monitoring_v1` counters:
   - `realtimeRelayServerMissingPayloadCount`
   - `realtimeRelayServerQosContractMismatchCount`
   - `realtimeRelayServerHeartbeatContractMismatchCount`
2. Deterministic fail-closed relay reason taxonomy now includes:
   - `relay_server_qos_contract_mismatch`
   - `relay_server_heartbeat_contract_mismatch`
3. Evidence refresh commands:
   - `npm run mobile:voice-latency:evidence:check` (freshness + budget + context check)
   - `npm run mobile:voice-latency:evidence:check:real` (strict gate; fails if latest artifact is synthetic/sandbox)

Current strict-gate status:

1. `mobile:voice-latency:evidence:check` = `PASS` (latest artifact fresh, budgets green).
2. `mobile:voice-latency:evidence:check:real` = `PASS` (latest artifact environment `ios_real_device_network_field_canary`, `synthetic=no`).
3. Strict real-network evidence gate is closed/passing for lane-`N` residual-risk tracking.

---

## Runbook

### 1) Preflight

1. Confirm queue dependency state: `ORV-012` and `ORV-013` are `DONE`; `ORV-015+` are not in progress while canary controls are being validated.
2. Validate runtime compatibility commitments:
   - `/api/v1/ai/voice/*` request/response compatibility unchanged.
   - `voiceRuntime` and `transportRuntime` schema parity unchanged.
3. Confirm telemetry ingestion health:
   - trust telemetry ingestion pipeline receiving `liveSessionId` + `voiceSessionId`,
   - taxonomy mapping still emitting `vt_*` deterministic codes.
4. Confirm chaos harness artifacts are present from ORV-012 and no unresolved blockers remain.

### 2) Execution

1. Enable next canary percentage using release flag owned by runtime on-call.
2. Monitor policy matrix metrics at each evaluation interval.
3. Log every promotion/hold/rollback decision in release notes with timestamp, owner, and rationale.
4. If threshold triggered, execute rollback action for that metric immediately without waiting for manual approval.

### 2A) Dashboard and alert correctness gate (required before Stage 1)

1. For each policy matrix metric, verify dashboard panel renders live data for the same window as alert evaluation.
2. Execute one synthetic alert drill per metric family (`latency`, `fallback/reconnect`, `auth`, `provider`) and record:
   - trigger timestamp,
   - first-alert timestamp,
   - measured alert delay.
3. Hard acceptance:
   - alert delay <= 2x metric evaluation cadence,
   - no missing alert for triggered condition,
   - dashboard values and alert payload values agree within one evaluation window.
4. Record evidence in execution log with links to panel snapshots and alert event IDs.

### 3) Rollback

1. Move rollout flag to previous stable stage.
2. Apply forced fallback policy defined by triggered metric row.
3. Declare incident severity and notify owner handoff chain.
4. Keep rollback state until two full windows are green and explicit go/no-go re-approval is recorded.

### 4) Post-stage validation

1. Verify no regression in transcript continuity and session replay idempotency.
2. Verify no regression in barge-in deadlock prevention.
3. Verify auth/attestation failures remain fail-closed and within budget.
4. Verify telemetry completeness and taxonomy integrity.

---

## Go/no-go checklist

| Check | Required result | Owner | Status | Evidence |
|---|---|---|---|
| `npm run docs:guard` | Pass | Documentation owner | Pass (2026-03-02) | ORV-014 docs verify output |
| Runtime parity (`voiceRuntime`/`transportRuntime`) | No schema drift | Runtime backend owner | Pass (doc-only ORV-014 change) | No runtime code changes in ORV-014 scope |
| API compatibility (`/api/v1/ai/voice/*`) | No breaking change | API owner | Pass (doc-only ORV-014 change) | No API surface edits in ORV-014 scope |
| Continuity invariants (ORV-010) | Pass | Mobile runtime owner | Pass (carried) | `ORV-010` verify set green (2026-03-01) |
| Telemetry ingestion + taxonomy (ORV-011) | Pass | Observability owner | Pass (carried) | `ORV-011` verify set green (2026-03-01) |
| Chaos/fallback evidence still valid (ORV-012) | Pass | Reliability owner | Pass (carried) | `artifacts/orv-012/EVIDENCE.md` |
| Auth fail-closed + rate-limit behavior (ORV-013) | Pass | Security owner | Pass (carried) | `ORV-013` verify set green + hardening notes |
| Lane-`N` latency evidence (`ORV-056`) | Pass (`interrupt_to_silence`, `time_to_first_assistant_audio`, `live_transcript_lag` p95 budgets) | Mobile runtime owner | Pass (2026-03-06, real device/network matrix) | `artifacts/orv-056/mobile_voice_latency_metrics_2026-03-06_real_device_network.json` + execution log `ORV-056` section |
| Lane-`N` evidence freshness + real-network gate (`ORV-057`) | Fresh artifact + strict real-network gate pass | Mobile runtime owner | Pass (`check` and `check:real` both green on real-device artifact) | `npm run mobile:voice-latency:evidence:check`; `npm run mobile:voice-latency:evidence:check:real`; execution log `ORV-057` section |
| Dashboard + alert correctness gate | Pass | Runtime canary controller | Stage-gated | Fill `ORV_014_CANARY_EXECUTION_LOG.md` Stage 0/1 entries |
| Canary matrix budgets for current stage | All green | Runtime canary controller | Stage-gated | Fill stage budget evidence in execution log |
| Incident state | No open SEV-1/SEV-2 voice runtime incident | Incident commander | Stage-gated | Incident board snapshot linked in execution log |

Go: all rows `Pass` plus stage-gated rows set to `Pass` for target rollout stage.  
No-go: any row failed, missing evidence, or unresolved incident.

---

## Owner handoff table

| Domain | Primary owner | Secondary owner | Handoff trigger | Required artifact |
|---|---|---|---|---|
| Runtime canary controller | Realtime runtime on-call | Platform on-call | Any latency/error threshold breach | Rollout decision log entry + metric snapshot |
| Mobile transport/runtime | Operator mobile on-call | Mobile tech lead | Fallback/reconnect threshold breach | Client version + transport mode breakdown |
| Observability and telemetry | Trust telemetry owner | Data platform on-call | Missing ingestion/taxonomy drift | Ingestion dashboard export + sample event IDs |
| Security and attestation | Security engineering on-call | Runtime backend owner | Auth/attestation breach or fail-open anomaly | Auth failure breakdown + attestation audit sample |
| Incident command | Incident commander (weekly rotation) | Engineering manager | Any automatic rollback or SEV incident | Incident timeline + comms log |
| Release signoff | Release manager | Product/engineering lead | Stage promotion to 50% or 100% | Signed go/no-go checklist record |

Named individuals for the above roles are tracked in:
`/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/operator-mobile-realtime-voice-runtime/ORV_014_OWNER_HANDOFF_ROSTER.md`
