# Expo Operator Edge App Session Prompts

Use these prompts to execute this workstream lane-by-lane with deterministic queue behavior.

Workstream root:
`/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/expo-operator-edge-app`

Queue:
`/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/expo-operator-edge-app/TASK_QUEUE.md`

---

## Global execution rules

1. Run only tasks in this queue.
2. Before each task, list top 3 boundary/regression risks and impacted contracts.
3. Keep one-agent authority invariants explicit: app is ingress/control surface, backend is mutation authority.
4. Build native `vc83` tool path first; treat OpenClaw compatibility as optional and feature-flagged.
5. Keep statuses limited to `READY`, `IN_PROGRESS`, `PENDING`, `BLOCKED`, `DONE`.
6. Run row `Verify` commands exactly.
7. Sync `INDEX.md`, `MASTER_PLAN.md`, `TASK_QUEUE.md`, and this file at lane milestones.
8. Keep trust-gate UX understandable for non-technical operators.

---

## Milestone snapshot

1. 2026-02-24: lane `A` rows `EXPO-001` and `EXPO-002` completed (trust-gate + contract freeze).
2. Next promotable row outside lane `A`: `EXPO-003`, gated by `YAI-014@READY`.
3. Authority invariant is frozen: Expo app is ingress/control only; backend is mutation authority.
4. Lane `B` remains blocked until `YAI-014` reaches `READY`; do not promote `EXPO-003` early.

---

## Session A (Lane A: trust model + contract freeze)

You are Codex in `/Users/foundbrand_001/Development/vc83-com`.
Execute only lane `A` rows from:
`/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/expo-operator-edge-app/TASK_QUEUE.md`

Rules:
1. Lock hard-vs-soft gate definitions and override scopes.
2. Freeze backend ingress and approval contract assumptions.
3. Keep one-agent authority invariant explicit (mobile ingress/control only; backend mutation authority).
4. Run `V-DOCS` exactly.
5. Stop when lane `A` has no promotable rows.

---

## Session B (Lane B: Expo shell + session baseline)

You are Codex in `/Users/foundbrand_001/Development/vc83-com`.
Execute only lane `B` rows from:
`/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/expo-operator-edge-app/TASK_QUEUE.md`

Rules:
1. Build app shell, org/session context, and operator workspace continuity.
2. Do not add direct mutation pathways from mobile runtime.
3. Run row `Verify` commands exactly.
4. Stop when lane `B` has no promotable rows.

---

## Session C (Lane C: capture + transport + ingress envelope)

You are Codex in `/Users/foundbrand_001/Development/vc83-com`.
Execute only lane `C` rows from:
`/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/expo-operator-edge-app/TASK_QUEUE.md`

Rules:
1. Ship phone capture path before optional glasses adapters.
2. Ensure reconnect/backpressure/offline behavior is explicit and tested.
3. Normalize all edge events into canonical ingress envelope contracts.
4. Run row `Verify` commands exactly.
5. Stop when lane `C` has no promotable rows.

---

## Session D (Lane D: trust UX + overrides)

You are Codex in `/Users/foundbrand_001/Development/vc83-com`.
Execute only lane `D` rows from:
`/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/expo-operator-edge-app/TASK_QUEUE.md`

Rules:
1. Keep copy plain-language and action-oriented.
2. Soft-gate overrides must be scoped and auditable.
3. Hard-gate paths must remain non-overridable.
4. Run row `Verify` commands exactly.
5. Stop when lane `D` has no promotable rows.

---

## Session E (Lane E: policy-safe action execution)

You are Codex in `/Users/foundbrand_001/Development/vc83-com`.
Execute only lane `E` rows from:
`/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/expo-operator-edge-app/TASK_QUEUE.md`

Rules:
1. Use approval-token action flow for every mutation request.
2. Keep backend policy authority final; mobile only requests and displays outcomes.
3. OpenClaw compatibility mode is optional and never a prerequisite for core flow.
4. Run row `Verify` commands exactly.
5. Stop when lane `E` has no promotable rows.

---

## Session F (Lane F: reliability + observability)

You are Codex in `/Users/foundbrand_001/Development/vc83-com`.
Execute only lane `F` rows from:
`/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/expo-operator-edge-app/TASK_QUEUE.md`

Rules:
1. Preserve correlation IDs from ingress through gate and execution outcomes.
2. Add safe retry semantics that avoid duplicate action side effects.
3. Run row `Verify` commands exactly.
4. Stop when lane `F` has no promotable rows.

---

## Session G (Lane G: release + handoff)

You are Codex in `/Users/foundbrand_001/Development/vc83-com`.
Execute only lane `G` rows from:
`/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/expo-operator-edge-app/TASK_QUEUE.md`

Rules:
1. Publish full QA gate evidence with unresolved risks clearly listed.
2. Ship rollout and rollback runbooks with on-call ownership.
3. Sync all queue-first docs and rerun docs guard before closure.
4. Stop only when closure criteria are satisfied or blockers are explicitly recorded.
