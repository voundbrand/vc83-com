# Agent Lifecycle HITL Consolidation Session Prompts

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-lifecycle-hitl-consolidation`

Always read first:

- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-lifecycle-hitl-consolidation/TASK_QUEUE.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-lifecycle-hitl-consolidation/MASTER_PLAN.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-lifecycle-hitl-consolidation/INDEX.md`

---

## Session A (Lane A: Brain decommission)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane A tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-lifecycle-hitl-consolidation/TASK_QUEUE.md

Scope:
- ALC-001..ALC-003

Rules:
1) Keep backend knowledge APIs intact unless task explicitly requires backend changes.
2) Remove/redirect all end-user Brain launch paths.
3) Run Verify commands exactly as listed in each row.
4) Update queue status and notes immediately after each completed task.
```

---

## Session B (Lane B: Soul/lifecycle contract)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane B tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-lifecycle-hitl-consolidation/TASK_QUEUE.md

Scope:
- ALC-004..ALC-005, ALC-014

Rules:
1) Define canonical lifecycle states and allowed transitions before UI refinements.
2) Bind transition checkpoints to runtime telemetry/events.
3) Keep state naming consistent between docs, backend, and UI copy.
4) Run Verify commands exactly from queue rows.
```

---

## Session C (Lane C: HITL intervention workflow)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane C tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-lifecycle-hitl-consolidation/TASK_QUEUE.md

Scope:
- ALC-006..ALC-007

Rules:
1) Prioritize operator comprehension: queue -> context -> action -> resume.
2) Ensure intervention actions are auditable and reversible where possible.
3) Do not hide guardrail breach reasons from operators.
4) Run Verify commands exactly from queue rows.
```

---

## Session D (Lane D: Layer integration audit)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane D tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-lifecycle-hitl-consolidation/TASK_QUEUE.md

Scope:
- ALC-008

Rules:
1) Produce explicit overlap/ownership matrix across core, harnesses, memory, knowledge, app-layer concepts.
2) Mark each layer as covered/partial/missing with concrete evidence paths.
3) Attach queue task ownership for every partial/missing row.
4) Run docs guard before task closeout.
```

---

## Session E (Lane E: Retrieval convergence)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane E tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-lifecycle-hitl-consolidation/TASK_QUEUE.md

Scope:
- ALC-009, ALC-013

Rules:
1) Ensure all supported training sources become runtime-retrievable knowledge context.
2) Preserve tenant/org isolation and provenance metadata.
3) Add regression tests for source-type retrieval parity.
4) Run Verify commands exactly from queue rows.
```

---

## Session G (Lane G: Runtime correctness closure)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane G tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-lifecycle-hitl-consolidation/TASK_QUEUE.md

Scope:
- ALC-011..ALC-012

Rules:
1) Close subtype-routing and session-handoff contract defects before deeper lifecycle UX work.
2) Add or extend regression tests that prove the specific defect is closed.
3) Keep fixes minimal and behavior-preserving outside the audited defect paths.
4) Run Verify commands exactly from queue rows.
```

---

## Session F (Lane F: Hardening and release)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane F tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-lifecycle-hitl-consolidation/TASK_QUEUE.md

Scope:
- ALC-010

Rules:
1) Confirm all P0 rows are DONE or BLOCKED before starting.
2) Run full verification suite in queue row order.
3) Publish rollout and rollback checklist with concrete triggers.
4) Sync INDEX/MASTER_PLAN/TASK_QUEUE on completion.
```

---

## Session H (Lane H: Visibility closure extension)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane H tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-lifecycle-hitl-consolidation/TASK_QUEUE.md

Scope:
- ALC-015..ALC-018

Rules:
1) Close residual audit gaps only: harness context visibility, memory provenance visibility, and retrieval citation explainability.
2) Keep lifecycle state names/checkpoints canonical (`draft -> active -> paused -> escalated -> takeover -> resolved -> active`).
3) Land deterministic regression coverage for each gap before marking rows `DONE`.
4) Run Verify commands exactly from queue rows and sync INDEX/MASTER_PLAN/TASK_QUEUE after each completion.
```
