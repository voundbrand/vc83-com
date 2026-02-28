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
3. Run `V-TYPE`, `V-UNIT`, `V-INTEG`, `V-E2E-MOBILE`, `V-DOCS`.
4. Stop when lane `E` has no promotable rows.

---

## Session F (Lane F: security and rollout)

You are Codex in `/Users/foundbrand_001/Development/vc83-com`.
Execute only lane `F` rows from:
`/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/operator-mobile-realtime-voice-runtime/TASK_QUEUE.md`

Rules:

1. Enforce auth/attestation/rate limits and fail-closed behavior.
2. Publish canary rollout + rollback criteria with explicit ownership.
3. Run row `Verify` commands exactly.
4. Stop only when release gate rows are `DONE` or blockers are documented.

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
5. Stop when lane `G` has no promotable rows or blockers are documented.
