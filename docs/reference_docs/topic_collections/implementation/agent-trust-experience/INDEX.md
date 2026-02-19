# Agent Trust Experience Index

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-trust-experience`  
**Source request:** Trust-first planning for Brain window + interview + Pressmaster memory patterns + AI Agents UI, with super-admin parity.

---

## Purpose

Queue-first execution layer for building an explicit AI trust operating system across Brain, setup-mode interview flow, and agents management surfaces.

---

## Files

- Queue: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-trust-experience/TASK_QUEUE.md`
- Session prompts: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-trust-experience/SESSION_PROMPTS.md`
- Master plan: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-trust-experience/MASTER_PLAN.md`
- Agent control center spec: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-trust-experience/AGENT_CONTROL_CENTER_SPEC.md`
- Agent control center data contract: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-trust-experience/AGENT_CONTROL_CENTER_DATA_CONTRACT.md`
- Index (this file): `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-trust-experience/INDEX.md`

---

## Status

Current kickoff:

1. `ATX-001` (`DONE`): trust-gap baseline audit complete.
2. `ATX-002` (`DONE`): trust contract normalization completed with explicit event contracts and deterministic verification commands for every `partial` matrix row.
3. `ATX-003` (`DONE`): deterministic trust taxonomy + mode-aware payload contract implemented in `convex/ai/trustEvents.ts`, with schema surface in `convex/schemas/aiSchemas.ts`.
4. Architecture coverage matrix + closeout contracts are documented in `MASTER_PLAN.md` (`Architecture Coverage Matrix`; `ATX-002 Partial-Domain Contract Map`).
5. `ATX-004` (`DONE`): Brain Review now uses org-scoped real query pipeline (`convex/brainKnowledge.ts`) with server-side category/search filtering and explicit loading/empty/error+retry states in `review-mode.tsx`.
6. `ATX-005` (`DONE`): Brain Teach now runs real ingestion flows for docs/audio/link/text with persisted status/failure metadata and trust-event emission in `convex/brainKnowledge.ts` + `teach-mode.tsx`.
7. `ATX-006` (`DONE`): interview completion now pauses at explicit memory consent with source-attributed phase summaries; durable Content DNA writes happen only after consent accept, and consent decline/revoke path is reversible.
8. `ATX-007` (`DONE`): seeded trust-first interview templates for customer identity, agent team shape, and super-admin platform training with explicit identity anchors, guardrails, handoff boundaries, and drift cues.
9. `ATX-008` (`DONE`): interview outputs now persist shared trust artifacts (`Soul Card`, `Guardrails Card`, `Team Charter`, `Memory Ledger`) with source attribution; results UI and Brain review now surface artifact coverage.
10. `ATX-009` (`DONE`): setup mode now enforces deterministic kickoff on empty wizard chat, built-in provider routing, fenced setup artifact parsing, and builder workspace file persistence for generated artifacts.
11. `ATX-010` (`DONE`): connect flow now detects/validates setup artifacts, emits actionable validation/warning feedback, and creates/links agent + knowledge records from `agent-config.json` and `kb/*.md`.
12. `ATX-011` (`DONE`): Agents window now includes a dedicated Trust cockpit tab with an explainable trust timeline (proposals/approvals/escalations/handoffs), drift indicators, guardrail map, and action-first intervention summaries; approvals queue now favors actionable context summaries over raw payload dumps.
13. `ATX-012` (`DONE`): super-admin now has a dedicated `Platform Agent Trust` loop that uses the same guided interview + trust artifact workflow as customer-facing training, with explicit operator safeguard tokens/notes for platform-wide start and publish actions, plus admin trust event emission.
14. `ATX-013` (`DONE`): trust telemetry dashboard contracts, KPI baselines/thresholds, checkpoint payload builder, and rollout guardrail evaluator are implemented in `convex/ai/trustTelemetry.ts` with regression coverage in `tests/unit/ai/trustTelemetryDashboards.test.ts`.
15. `ATX-014` (`DONE`): rollout closeout docs now include staged rollout gates, rollback playbook, and release checklist in `MASTER_PLAN.md`, with queue/index synchronization complete.
16. `ATX-015` (`DONE`): control-center spec is now paired with an exact typed UI data contract for thread rows, timeline events, intervention payloads, and spawn lineage (`AGENT_CONTROL_CENTER_DATA_CONTRACT.md`).
17. `ATX-018` (`DONE`): HITL ingress policy + provider matrix is now explicit: Agents UI is the primary human-in-loop surface, with Telegram/Slack/Webchat channel parity requirements documented for in-stream replies.
18. `ATX-016` (`DONE`): implemented thread-level control-center optics with canonical lifecycle badges, separate delivery-state badges, escalation/active-instance badges, waiting-on-human-first sorting, and an org-level waiting-on-human header indicator. Revalidated 2026-02-19: `V-TYPE` passed, `V-AGENTS-LINT` passed with existing warnings (`0` errors, `92` warnings), and `V-UNIT` passed (`73` files, `355` tests).
19. `ATX-017` (`DONE`): trust cockpit timeline now uses canonical lifecycle checkpoint events grouped by escalation gate (`pre_llm`, `post_llm`, `tool_failure`, `not_applicable`) and includes actor/checkpoint/reason fields for intervention transitions; selected-thread drill-down now includes instance lineage metadata (template/parent/handoff reason/active state).
20. `ATX-019` (`DONE`): conversations in-stream operator reply bridge now enforces handed-off session status, routes outbound through channel router, writes channel/session/reason audit entries (`session_reply_in_stream` and failure parity), emits `trust.lifecycle.operator_reply_in_stream.v1`, and surfaces operator reply lifecycle rows in control-center timeline drill-down.
21. `ATX-020` (`DONE`): provider-native HITL quick-action parity now covers Telegram/Slack/Webchat takeover + resume entrypoints with shared lifecycle/audit semantics, and runbook coverage is documented in `AGENT_CONTROL_CENTER_DATA_CONTRACT.md`.
22. Next queue targets:
   - Lane `I` closeout complete (`ATX-018`..`ATX-020` all `DONE`).

Current state:

1. Lane `G` is complete (`ATX-013`, `ATX-014`).
2. Control-center extension lanes are now open:
   - Lane `H`: `ATX-015`..`ATX-017` done.
   - Lane `I`: `ATX-018`..`ATX-020` done.
3. Docs synchronization + policy validation are current (`npm run docs:guard` passing for this update).

---

## Lane progress board

- [x] Lane A (`ATX-001`..`ATX-003`)
- [x] Lane B (`ATX-004`..`ATX-006`)
- [x] Lane C (`ATX-007`..`ATX-008`)
- [x] Lane D (`ATX-009`..`ATX-010`)
- [x] Lane E (`ATX-011`)
- [x] Lane F (`ATX-012`)
- [x] Lane G (`ATX-013`..`ATX-014`)
- [x] Lane H (`ATX-015`..`ATX-017`)
- [x] Lane I (`ATX-018`..`ATX-020`)

---

## Operating commands

- Validate docs policy: `npm run docs:guard`
- Read queue: `cat /Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-trust-experience/TASK_QUEUE.md`
- Run core checks: `npm run typecheck && npm run lint && npm run test:unit`
