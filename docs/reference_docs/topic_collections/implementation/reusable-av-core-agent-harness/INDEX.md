# Reusable AV Core + Agent Harness Index

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/reusable-av-core-agent-harness`  
**Last updated:** 2026-02-27  
**Source request:** Build reusable screenshot/video/audio capture and low-latency bidirectional media streaming across desktop, mobile, glasses, webcam, and digital video inputs, integrated into one-agent runtime authority/trust contracts.

---

## Purpose

This workstream defines and delivers a reusable AV foundation that:

1. captures desktop screenshots and desktop recordings,
2. ingests external streams (webcam/UVC, mobile, glasses, digital video inputs),
3. supports low-latency bidirectional audio/video sessions,
4. routes AV-originated intents through canonical one-agent authority/trust/approval paths.

---

## Core files

- Queue:
  `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/reusable-av-core-agent-harness/TASK_QUEUE.md`
- Session prompts:
  `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/reusable-av-core-agent-harness/SESSION_PROMPTS.md`
- Master plan:
  `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/reusable-av-core-agent-harness/MASTER_PLAN.md`
- Index (this file):
  `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/reusable-av-core-agent-harness/INDEX.md`

---

## Status snapshot

1. Queue remains deterministic across rows `AVR-001`..`AVR-013`.
2. `AVR-001` is `DONE` (2026-02-25): reusable AV contract matrix + latency SLO targets + authority invariants are published in `MASTER_PLAN.md`.
3. `AVR-002` is `DONE` (2026-02-25): deterministic media-session ingress envelope + schema contract is finalized in `MASTER_PLAN.md` + `convex/schemas/aiSchemas.ts`, preserving `vc83_runtime_policy` precedence and non-bypass approval invariants.
4. `AVR-003` is `DONE` (2026-02-25): desktop capture adapter core (`desktop_screenshot`, bounded `desktop_record`, optional mic/loopback intent) is implemented with normalized `MediaSessionCaptureFrame` outputs and unit coverage.
5. `AVR-004` is `DONE` (2026-02-26): implementation landed earlier and done-gate dependency `YAI-020@DONE_GATE` is cleared.
6. `AVR-005` and `AVR-006` are `DONE` (2026-02-25): device ingress contracts cover webcam/UVC/digital-video plus mobile/glasses streams with deterministic source identity and provenance metadata.
7. `AVR-007` is `DONE` (2026-02-25): low-latency runtime contracts cover bidirectional packet flow, session clocking, jitter/drop diagnostics, adaptive buffering, and deterministic fallback reasons.
8. `AVR-008` is `DONE` (2026-02-26): transport downgrade policy closeout was unblocked after baseline typecheck recovery; required verify profile (`typecheck`, `test:unit`, `lint`) now passes.
9. `AVR-009` is `DONE` (2026-02-26): AV media-session ingress metadata (`liveSessionId`, runtime metadata) is integrated through chat send contract into canonical inbound envelope + mutation authority invariants in harness runtime.
10. `AVR-010` is `DONE` (2026-02-26): trust/approval no-bypass guardrails are complete with verification rerun passing (`typecheck`, `test:unit`, focused AV-contract vitest).
11. YAI ownership boundaries remain explicit and unchanged (`YAI-018..021` own parity integration details).
12. OpenClaw endurance closeout dependency remains explicit for final hardening/closeout rows: `OCG-008`.
13. `AVR-011` is `DONE` (2026-02-26): AV observability contracts are implemented across runtime/harness paths (session start/stop, cadence, jitter, mouth-to-ear estimate, fallback transitions, source health) and required verify profile now passes (`typecheck`, `test:unit`, `lint`).
14. `AVR-012` is `DONE` (2026-02-27): historical verify blockers were cleared and full required verify profile now passes (`typecheck`, `test:unit`, `test:e2e:desktop`, `docs:guard`), while preserving prior device-matrix threshold evidence artifacts in `tmp/reports/av-core`.
15. `AVR-013` is `DONE` (2026-02-27): closeout documentation is published (residual-risk + rollback runbook + production rollout-wave lock), and queue-first artifacts are synchronized.
16. Current deterministic promotion state: no queue row is `READY`; all rows `AVR-001`..`AVR-013` are `DONE`.

---

## Scope boundary

Owned here:

1. reusable AV capture/ingress/runtime contracts,
2. low-latency session orchestration and fallback policies,
3. harness integration of AV ingress metadata,
4. AV observability + regression + closeout artifacts.

Not owned here:

1. ongoing YAI parity row execution details for `YAI-018..021`,
2. OpenClaw endurance queue execution details for `OCG-007..008`,
3. non-AV product UI redesign work.

---

## Lane board

- [x] Lane A: contract freeze + acceptance matrix (`AVR-001`, `AVR-002`)
- [x] Lane B: desktop capture core (`AVR-003`, `AVR-004`)
- [x] Lane C: device ingress adapters (`AVR-005`, `AVR-006`)
- [x] Lane D: low-latency transport/runtime (`AVR-007`, `AVR-008`)
- [x] Lane E: harness/trust integration (`AVR-009`, `AVR-010`)
- [x] Lane F: observability + closeout (`AVR-011`..`AVR-013`)

---

## Operating commands

- Docs guard: `npm run docs:guard`
- Runtime baseline checks:
  `npm run typecheck && npm run lint && npm run test:unit`
