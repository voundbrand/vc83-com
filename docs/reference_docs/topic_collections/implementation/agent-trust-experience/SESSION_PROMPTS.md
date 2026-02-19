# Agent Trust Experience Session Prompts

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-trust-experience`

Use one prompt per lane/worktree.

Always read first:

- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-trust-experience/TASK_QUEUE.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-trust-experience/MASTER_PLAN.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-trust-experience/INDEX.md`

---

## Session A (Lane A: trust contract + event taxonomy)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane A tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-trust-experience/TASK_QUEUE.md

Scope:
- ATX-001..ATX-003

Rules:
1) Before each task, list top 3 trust-regression risks.
2) Run Verify commands exactly as listed in queue rows.
3) Do not implement UI behavior before ATX-002 contract artifacts are complete.
4) Keep event naming deterministic and mode-aware (Brain/Setup/Agents/Admin).
5) Update TASK_QUEUE.md status/notes after each completed task.

Stop when Lane A has no promotable tasks.
```

---

## Session B (Lane B: Brain trust data + memory consent)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane B tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-trust-experience/TASK_QUEUE.md

Scope:
- ATX-004..ATX-006

Rules:
1) Confirm ATX-002 is DONE before starting.
2) Before each task, list top 3 trust-regression risks.
3) Run queue Verify commands exactly.
4) Replace mocks/simulations with real data paths and explicit error states.
5) Keep consent UX explicit, reversible, and source-attributed.

Stop when Lane B has no promotable tasks.
```

---

## Session C (Lane C: soul-building interview framework)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane C tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-trust-experience/TASK_QUEUE.md

Scope:
- ATX-007..ATX-008

Rules:
1) Confirm ATX-002 is DONE before ATX-007.
2) Before each task, list top 3 trust-regression risks.
3) Run Verify commands exactly from queue rows.
4) Ensure outputs include identity anchors, guardrails, and drift cues.
5) Keep artifacts consumable by Brain, Setup, and Agents surfaces.

Stop when Lane C has no promotable tasks.
```

---

## Session D (Lane D: setup-mode runtime and connect handoff)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane D tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-trust-experience/TASK_QUEUE.md

Scope:
- ATX-009..ATX-010

Rules:
1) Confirm ATX-003 and ATX-007 are DONE before ATX-009.
2) Before each task, list top 3 trust-regression risks.
3) Run Verify commands exactly from queue rows.
4) Ensure setup mode has deterministic kickoff behavior and no empty wizard state.
5) Ensure connect consumes generated setup artifacts with clear validation feedback.

Stop when Lane D has no promotable tasks.
```

---

## Session E (Lane E: agents trust cockpit)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane E tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-trust-experience/TASK_QUEUE.md

Scope:
- ATX-011

Rules:
1) Confirm ATX-006 and ATX-008 are DONE before starting.
2) Before the task, list top 3 trust-regression risks.
3) Run Verify commands exactly from queue row.
4) Prioritize actionable explainability over raw telemetry dumps.
5) Keep existing approval/escalation behavior intact while improving trust visibility.

Stop when Lane E has no promotable tasks.
```

---

## Session F (Lane F: super-admin trust parity)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane F tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-trust-experience/TASK_QUEUE.md

Scope:
- ATX-012

Rules:
1) Confirm ATX-010 and ATX-011 are DONE before starting.
2) Before the task, list top 3 trust-regression risks.
3) Run Verify commands exactly from queue row.
4) Enforce process parity between customer-facing and platform-agent training.
5) Add operator safeguards for platform-wide actions.

Stop when Lane F has no promotable tasks.
```

---

## Session G (Lane G: telemetry + hardening + closeout)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane G tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-trust-experience/TASK_QUEUE.md

Scope:
- ATX-013..ATX-014

Rules:
1) Confirm all P0 tasks are DONE or BLOCKED before ATX-013.
2) Before each task, list top 3 trust-regression risks.
3) Run Verify commands exactly from queue rows.
4) Ensure trust KPI definitions and alert thresholds are documented.
5) Run docs guard before closeout and resolve violations.

Stop when lane G closeout is complete.
```

---

## Session H (Lane H: control center contract + lifecycle optics)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane H tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-trust-experience/TASK_QUEUE.md

Scope:
- ATX-015..ATX-017

Rules:
1) Keep lifecycle naming exactly: draft -> active -> paused -> escalated -> takeover -> resolved -> active.
2) Keep lifecycle state distinct from delivery/work status in all UI contracts.
3) Run Verify commands exactly from queue rows.
4) Do not add provider-specific lifecycle variants.
5) Preserve auditable actor/checkpoint/reason fields in timeline surfaces.

Stop when Lane H has no promotable tasks.
```

---

## Session I (Lane I: human in-loop channel ingress)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane I tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-trust-experience/TASK_QUEUE.md

Scope:
- ATX-018..ATX-020

Rules:
1) Treat Agents UI as the primary HITL surface; provider channels are ingress/interaction entrypoints.
2) Preserve receipt-first idempotent ingest and CAS turn-leasing behavior.
3) Run Verify commands exactly from queue rows.
4) Ensure in-stream operator replies include audit + trust event parity.
5) Keep Telegram/Slack/Webchat semantics consistent for takeover/resume.

Stop when Lane I has no promotable tasks.
```
