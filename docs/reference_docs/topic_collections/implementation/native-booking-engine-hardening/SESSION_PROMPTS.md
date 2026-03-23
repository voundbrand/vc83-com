# Native Booking Engine Hardening Session Prompts

Use these prompts to execute this workstream lane-by-lane with deterministic queue behavior.

**Last synced:** 2026-03-17 (`NBH-001`, `NBH-002`, `NBH-003`, `NBH-004`, and `NBH-005` are `DONE`; `NBH-006`, `NBH-007`, and `NBH-009` are `READY`)

Workstream root:
`/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/native-booking-engine-hardening`

Queue:
`/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/native-booking-engine-hardening/TASK_QUEUE.md`

---

## Global execution rules

1. Run only tasks in this queue.
2. Verify code reality before editing docs or code; do not plan from memory when the repo already contains a relevant contract.
3. Native booking engine remains primary throughout this queue.
4. Google Calendar is the first-class external calendar backend for conflict detection and booking pushes in this queue.
5. Cal.com is constrained to API v2 adapter scope only. Do not add OAuth, Cal.com Platform, or enterprise-specific provider architecture here.
6. The first public-facing UX milestone is a native visual slot picker and embeddable widget backed by the platform's own availability engine.
7. Keep provider-neutral slot and booking contracts whenever a public or agent-facing surface is introduced.
8. Preserve preview-first and explicit confirmation semantics for agentic booking mutations unless a row explicitly upgrades them.
9. Run row `Verify` commands exactly as listed.
10. Keep statuses limited to `READY`, `IN_PROGRESS`, `PENDING`, `BLOCKED`, `DONE`.
11. Sync `INDEX.md`, `MASTER_PLAN.md`, `TASK_QUEUE.md`, and this file at lane milestones.
12. Respect cross-workstream ownership:
    - personal/business operator runtime: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/personal-life-operator-agent/`
    - concierge/mobile cutover: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/life-operator-one-of-one-cutover/`
    - multi-provider commercialization patterns: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/multi-provider-byoa-channel-runtime/`

---

## Session A (Lane A: reality lock + architecture freeze)

You are Codex in `/Users/foundbrand_001/Development/vc83-com`.
Execute only lane `A` rows from:
`/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/native-booking-engine-hardening/TASK_QUEUE.md`

Rules:
1. Freeze the current code-backed baseline before proposing new architecture.
2. Cite exact native-booking, Google Calendar, agent runtime, and Cal.com v2 anchors.
3. Record the decision lock explicitly: native booking primary, Google hardening next, Cal.com v2 adapter only.
4. Stop when lane `A` has no promotable rows.

---

## Session B (Lane B: Google Calendar conflict/push hardening)

You are Codex in `/Users/foundbrand_001/Development/vc83-com`.
Execute only lane `B` rows from:
`/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/native-booking-engine-hardening/TASK_QUEUE.md`

Rules:
1. Backend conflict and reconciliation contracts land before UI polish.
2. Missing scope, inactive connection, and sync-disabled states must fail closed.
3. Keep external busy-time semantics deterministic and testable.
4. Do not hide Google dependency assumptions inside generic wording.
5. Stop when lane `B` has no promotable rows.

---

## Session C (Lane C: agent runtime booking-engine convergence)

You are Codex in `/Users/foundbrand_001/Development/vc83-com`.
Execute only lane `C` rows from:
`/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/native-booking-engine-hardening/TASK_QUEUE.md`

Rules:
1. Make agents book through native booking primitives, not provider-specific endpoints.
2. Preserve preview-first and explicit confirmation unless the row says otherwise.
3. Booking mutation artifacts must be reconstructable without third-party-provider inference.
4. Keep approval and audit evidence part of the core contract, not a later add-on.
5. Stop when lane `C` has no promotable rows.

---

## Session D (Lane D: native public slot-picker + embed surface)

You are Codex in `/Users/foundbrand_001/Development/vc83-com`.
Execute only lane `D` rows from:
`/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/native-booking-engine-hardening/TASK_QUEUE.md`

Rules:
1. Start with a provider-neutral public availability contract.
2. The UI must support a manual visual date/time selection flow comparable to hosted schedulers, but owned by the platform.
3. The embed/widget must not rely on a third-party iframe as the default product path.
4. Landing-page consumption should use the same native contract as future public surfaces.
5. Stop when lane `D` has no promotable rows.

---

## Session E (Lane E: Cal.com v2 adapter containment)

You are Codex in `/Users/foundbrand_001/Development/vc83-com`.
Execute only lane `E` rows from:
`/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/native-booking-engine-hardening/TASK_QUEUE.md`

Rules:
1. Keep Cal.com working on API v2.
2. Do not add OAuth, user-host identity models, or enterprise-provider design in this lane.
3. Treat Cal.com as an adapter that consumes platform booking needs, not as the architecture owner.
4. Track hardcoded Cal.com fallback links separately from the adapter contract itself.
5. Stop when lane `E` has no promotable rows.

---

## Session F (Lane F: roadmap, ship gates, closeout)

You are Codex in `/Users/foundbrand_001/Development/vc83-com`.
Execute only lane `F` rows from:
`/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/native-booking-engine-hardening/TASK_QUEUE.md`

Rules:
1. Publish the ship order in plain operational terms: what lands first, what is blocked, what is deferred.
2. The go/no-go list must make native booking and Google hardening mandatory before any serious Cal.com expansion.
3. Keep the closeout synced across all workstream docs.
4. Stop when lane `F` has no promotable rows.
