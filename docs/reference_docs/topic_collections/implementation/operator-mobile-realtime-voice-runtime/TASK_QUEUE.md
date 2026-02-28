# Operator Mobile Realtime Voice Runtime Task Queue

**Last updated:** 2026-02-28  
**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/operator-mobile-realtime-voice-runtime`  
**Source request:** Add a world-class implementation plan for realtime voice transport/runtime hardening (protocol, backend relay, mobile streaming, barge-in, continuity, reliability, and security) using docs CI, with explicit video crossover layered at the end.

---

## Queue rules

1. Allowed statuses are only: `READY`, `IN_PROGRESS`, `PENDING`, `BLOCKED`, `DONE`.
2. Only one row may be `IN_PROGRESS` globally unless lane policy explicitly allows one active row per lane.
3. Deterministic execution order: `P0` then `P1` then `P2`, then lexical `ID`.
4. Rows move `PENDING` -> `READY` only when `Depends On` tokens are satisfied.
5. Every `DONE` row must run all commands in `Verify`.
6. Shared runtime parity is non-negotiable: `voiceRuntime` and `transportRuntime` metadata must remain schema-compatible.
7. Barge-in invariants are non-negotiable: user speech interrupts assistant playback locally and remotely.
8. Sync `INDEX.md`, `MASTER_PLAN.md`, `TASK_QUEUE.md`, and `SESSION_PROMPTS.md` at lane milestones.

---

## Verification profiles

| Profile | Command |
|---|---|
| `V-TYPE` | `npm run typecheck` |
| `V-UNIT` | `npm run test:unit` |
| `V-INTEG` | `npm run test:integration` |
| `V-MOBILE-TYPE` | `npm run mobile:typecheck` |
| `V-MOBILE-LINT` | `npm run mobile:lint` |
| `V-E2E-MOBILE` | `npm run test:e2e:mobile` |
| `V-DOCS` | `npm run docs:guard` |

---

## Execution lanes

| Lane | Purpose | Primary ownership | Merge-overlap policy |
|---|---|---|---|
| `A` | Protocol + contract freeze | transport contract types, validators, metadata maps | No runtime lane starts before lane `A` `P0` rows are `DONE` |
| `B` | Backend realtime runtime | Convex voice runtime + realtime relay/session FSM | Keep wire contract changes gated by lane `A` |
| `C` | Mobile streaming runtime | operator-mobile capture/stream/playback adapters | Must preserve existing chat continuity behavior |
| `D` | Barge-in + continuity correctness | interruption state machine + thread continuity integration | Must not regress turn ordering or deadlock safety |
| `E` | Reliability + observability | SLO metrics, tracing, chaos/fallback tests | Require evidence for latency + fallback targets |
| `F` | Security + rollout gates | auth/attestation/rate limits + canary/rollback plan | Release blocked until lane `F` `P0` rows are `DONE` |
| `G` | Video crossover (end-layer) | shared runtime contract reuse for camera/video feed streaming | Starts only after voice release readiness rows are `DONE` |

---

## Dependency-based status flow

1. Start with lane `A` rows `ORV-001` and `ORV-002`.
2. Lane `B` starts after lane `A` `P0` rows are `DONE`.
3. Lane `C` starts after `ORV-003` is `DONE`.
4. Lane `D` starts after `ORV-005` and `ORV-007` are `DONE`.
5. Lane `E` starts after lane `D` `P0` rows are `DONE`.
6. Lane `F` starts after lane `E` `P0` rows are `DONE`.
7. Lane `G` starts after lane `F` `P0` rows are `DONE`.

---

## Task queue

| ID | Lane | Plan | Priority | Status | Depends On | Task | Primary files | Verify | Notes |
|---|---|---:|---|---|---|---|---|---|---|
| `ORV-001` | `A` | 1 | `P0` | `DONE` | - | Freeze `voice_transport_v1` envelope spec (events, metadata, sequencing, retry, heartbeat, error taxonomy) for `webrtc` and `websocket`. | `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/operator-mobile-realtime-voice-runtime/MASTER_PLAN.md`; `/Users/foundbrand_001/Development/vc83-com/convex/schemas/aiSchemas.ts` | `V-TYPE`; `V-DOCS` | Include explicit PCM contract fields and versioning rules. |
| `ORV-002` | `A` | 1 | `P0` | `DONE` | `ORV-001` | Freeze shared runtime parity map for `voiceRuntime` + `transportRuntime` + observability fields across voice and upcoming video workstreams. | `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/operator-mobile-realtime-voice-runtime/MASTER_PLAN.md`; `/Users/foundbrand_001/Development/vc83-com/src/lib/av/session/mediaSessionContract.ts` | `V-TYPE`; `V-DOCS` | Unified session IDs and attestation fields required. |
| `ORV-003` | `B` | 2 | `P0` | `DONE` | `ORV-002` | Implement backend realtime session resolver + FSM (`opening/open/degraded/closing/closed/error`) and authenticated stream open/close path. | `/Users/foundbrand_001/Development/vc83-com/convex/api/v1/aiChat.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/ai/voiceRuntime.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/http.ts` | `V-TYPE`; `V-UNIT`; `V-INTEG`; `V-DOCS` | Ensure stale session cleanup and idempotent close semantics. |
| `ORV-004` | `B` | 2 | `P0` | `DONE` | `ORV-003` | Implement websocket PCM ingest relay with partial/final transcript events and ordered sequence handling. | `/Users/foundbrand_001/Development/vc83-com/convex/ai/voiceRuntime.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/ai/voiceRuntimeAdapter.ts`; `/Users/foundbrand_001/Development/vc83-com/tests/integration/ai/*` | `V-TYPE`; `V-UNIT`; `V-INTEG`; `V-DOCS` | Must support transcript incremental persistence for same conversation thread. |
| `ORV-005` | `B` | 2 | `P1` | `DONE` | `ORV-004` | Implement assistant TTS chunk stream relay and server-side barge-in cancellation path. | `/Users/foundbrand_001/Development/vc83-com/convex/ai/voiceRuntime.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/ai/voiceRuntimeAdapter.ts` | `V-TYPE`; `V-UNIT`; `V-INTEG`; `V-DOCS` | Server cancel must be idempotent and race-safe. |
| `ORV-006` | `C` | 3 | `P0` | `DONE` | `ORV-003` | Implement mobile realtime transport adapters with deterministic fallback ladder (`webrtc` -> `websocket` -> `chunked_fallback`). | `/Users/foundbrand_001/Development/vc83-com/apps/operator-mobile/src/hooks/useMobileVoiceRuntime.ts`; `/Users/foundbrand_001/Development/vc83-com/apps/operator-mobile/src/lib/voice/transport.ts` | `V-MOBILE-TYPE`; `V-TYPE`; `V-UNIT`; `V-DOCS` | Record downgrade reason in `transportRuntime`. |
| `ORV-007` | `C` | 3 | `P0` | `IN_PROGRESS` | `ORV-004`, `ORV-006` | Replace LIVE chunk-on-stop with frame streaming while recording; emit low-latency partial transcript updates to UI. | `/Users/foundbrand_001/Development/vc83-com/apps/operator-mobile/src/components/chat/VoiceRecorder.tsx`; `/Users/foundbrand_001/Development/vc83-com/apps/operator-mobile/app/(tabs)/index.tsx`; `/Users/foundbrand_001/Development/vc83-com/apps/operator-mobile/src/components/chat/VoiceModeModal.tsx` | `V-MOBILE-TYPE`; `V-MOBILE-LINT`; `V-UNIT`; `V-E2E-MOBILE`; `V-DOCS` | Keep manual push-to-talk fallback path intact. |
| `ORV-008` | `C` | 3 | `P1` | `PENDING` | `ORV-005`, `ORV-007` | Implement stream-capable assistant playback queue with codec negotiation and graceful fallback from unsupported codecs. | `/Users/foundbrand_001/Development/vc83-com/apps/operator-mobile/src/hooks/useMobileVoiceRuntime.ts`; `/Users/foundbrand_001/Development/vc83-com/apps/operator-mobile/src/lib/voice/*` | `V-MOBILE-TYPE`; `V-UNIT`; `V-DOCS` | Keep data-URI path only as fallback, not primary streaming path. |
| `ORV-009` | `D` | 4 | `P0` | `PENDING` | `ORV-005`, `ORV-007` | Formalize barge-in state machine and deadlock prevention invariants (local interrupt + remote cancel + queue reset). | `/Users/foundbrand_001/Development/vc83-com/apps/operator-mobile/src/lib/voice/lifecycle.ts`; `/Users/foundbrand_001/Development/vc83-com/tests/unit/ai/*voice*` | `V-TYPE`; `V-UNIT`; `V-DOCS` | Must prove no assistant/user overlap deadlocks in deterministic tests. |
| `ORV-010` | `D` | 4 | `P0` | `PENDING` | `ORV-004`, `ORV-009` | Guarantee transcript continuity in same thread when entering/exiting Voice Mode and across reconnects. | `/Users/foundbrand_001/Development/vc83-com/apps/operator-mobile/src/stores/chat.ts`; `/Users/foundbrand_001/Development/vc83-com/apps/operator-mobile/app/(tabs)/index.tsx`; `/Users/foundbrand_001/Development/vc83-com/convex/api/v1/aiChat.ts` | `V-TYPE`; `V-UNIT`; `V-INTEG`; `V-E2E-MOBILE`; `V-DOCS` | Include reconnect replay/idempotency handling. |
| `ORV-011` | `E` | 5 | `P0` | `PENDING` | `ORV-010` | Add end-to-end telemetry contract for latency, interruption, reconnect, fallback transitions, and provider failure modes. | `/Users/foundbrand_001/Development/vc83-com/convex/ai/trustTelemetry.ts`; `/Users/foundbrand_001/Development/vc83-com/apps/operator-mobile/src/lib/av/*`; `/Users/foundbrand_001/Development/vc83-com/tests/integration/ai/*` | `V-TYPE`; `V-UNIT`; `V-INTEG`; `V-DOCS` | Correlate by `liveSessionId` + `voiceSessionId`. |
| `ORV-012` | `E` | 5 | `P1` | `PENDING` | `ORV-011` | Implement chaos/fallback validation suite (forced transport drops, reorder, jitter spikes, provider timeout). | `/Users/foundbrand_001/Development/vc83-com/tests/integration/ai/*`; `/Users/foundbrand_001/Development/vc83-com/tests/e2e/*` | `V-UNIT`; `V-INTEG`; `V-E2E-MOBILE`; `V-DOCS` | Require evidence artifacts for fallback correctness. |
| `ORV-013` | `F` | 6 | `P0` | `PENDING` | `ORV-011` | Add auth hardening for realtime session open, source attestation verification, and per-session quotas/rate limits. | `/Users/foundbrand_001/Development/vc83-com/convex/api/v1/aiChat.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/ai/voiceRuntime.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/schemas/aiSchemas.ts` | `V-TYPE`; `V-UNIT`; `V-INTEG`; `V-DOCS` | Must fail closed on missing/invalid attestation for protected paths. |
| `ORV-014` | `F` | 6 | `P0` | `PENDING` | `ORV-012`, `ORV-013` | Execute canary rollout plan with automatic rollback thresholds for latency/fallback/error budgets; publish runbook. | `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/operator-mobile-realtime-voice-runtime/MASTER_PLAN.md`; `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/operator-mobile-realtime-voice-runtime/INDEX.md` | `V-DOCS` | Include go/no-go checklist and owner handoff table. |
| `ORV-015` | `G` | 7 | `P0` | `PENDING` | `ORV-014`, `ORV-002` | Add video transport parity contract (`videoRuntime` + transport metadata) reusing unified session IDs and observability fields frozen in voice lanes. | `/Users/foundbrand_001/Development/vc83-com/src/lib/av/session/mediaSessionContract.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/schemas/aiSchemas.ts`; `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/operator-mobile-realtime-voice-runtime/MASTER_PLAN.md` | `V-TYPE`; `V-DOCS` | No contract divergence from lane `A` parity rules. |
| `ORV-016` | `G` | 7 | `P1` | `PENDING` | `ORV-015` | Implement backend video relay bridge integration points (frame ingress envelope, sequencing, rate controls) on same authenticated realtime runtime. | `/Users/foundbrand_001/Development/vc83-com/convex/ai/voiceRuntime.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/api/v1/aiChat.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/http.ts` | `V-TYPE`; `V-UNIT`; `V-INTEG`; `V-DOCS` | Keep as additive lane after voice GA readiness. |
| `ORV-017` | `G` | 7 | `P1` | `PENDING` | `ORV-016`, `ORV-007` | Layer operator-mobile video feed client path (capture cadence, transport fallback parity, observability) without regressing voice SLAs. | `/Users/foundbrand_001/Development/vc83-com/apps/operator-mobile/app/(tabs)/index.tsx`; `/Users/foundbrand_001/Development/vc83-com/apps/operator-mobile/src/lib/av/*`; `/Users/foundbrand_001/Development/vc83-com/apps/operator-mobile/src/hooks/*` | `V-MOBILE-TYPE`; `V-MOBILE-LINT`; `V-E2E-MOBILE`; `V-DOCS` | Voice remains release-critical; video remains end-layer additive until stable. |

---

## Current kickoff

- Active task: `ORV-007` (`IN_PROGRESS`).
- First promotable row: `ORV-007`.
- Immediate objective: replace LIVE chunk-on-stop with frame streaming + low-latency partial transcript updates.
