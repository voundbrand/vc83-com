# Voice Agent Co-Creation Session Prompts

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/voice-agent-co-creation`

Use one prompt per lane/worktree.

Always read first:

- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/voice-agent-co-creation/TASK_QUEUE.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/voice-agent-co-creation/MASTER_PLAN.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/voice-agent-co-creation/INDEX.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-trust-experience/TASK_QUEUE.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-trust-experience/MASTER_PLAN.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/desktop-appearance-consolidation/WINDOW_UI_DESIGN_CONTRACT.md`

---

## Session A (Lane A: baseline + contract)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane A tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/voice-agent-co-creation/TASK_QUEUE.md

Scope:
- VAC-001..VAC-003

Rules:
1) Confirm ATX trust baseline assumptions still hold before VAC-002.
2) Before each task, list top 3 trust-regression risks.
3) Run Verify commands exactly as specified in each queue row.
4) Update TASK_QUEUE.md status and notes after each task.
5) Keep event naming deterministic and versioned.

Stop when Lane A has no promotable tasks.
```

---

## Session B (Lane B: voice runtime + provider layer)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane B tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/voice-agent-co-creation/TASK_QUEUE.md

Scope:
- VAC-004..VAC-006

Rules:
1) Confirm VAC-002 is DONE before starting.
2) Before each task, list top 3 trust-regression risks.
3) Run queue Verify commands exactly.
4) Keep provider logic behind one typed adapter contract.
5) Document fallback behavior when voice provider health degrades.

Stop when Lane B has no promotable tasks.
```

---

## Session C (Lane C: adaptive interview + trust boundaries)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane C tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/voice-agent-co-creation/TASK_QUEUE.md

Scope:
- VAC-007..VAC-009

Rules:
1) Confirm VAC-002 and VAC-004 are DONE before VAC-007.
2) Before each task, list top 3 trust-regression risks.
3) Run Verify commands exactly from queue rows.
4) Never allow durable memory writes prior to explicit consent/save state.
5) Keep source attribution visible at every consent checkpoint.

Stop when Lane C has no promotable tasks.
```

---

## Session D (Lane D: Brain + shell integration)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane D tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/voice-agent-co-creation/TASK_QUEUE.md

Scope:
- VAC-010..VAC-011

Rules:
1) Confirm VAC-007 is DONE before starting.
2) Before each task, list top 3 trust-regression risks.
3) Run queue Verify commands exactly.
4) Ensure Brain voice entry appears in both Product menu and All Apps.
5) Keep interior styling compliant with WINDOW_UI_DESIGN_CONTRACT.md.

Stop when Lane D has no promotable tasks.
```

---

## Session E (Lane E: ongoing co-creation orchestration)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane E tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/voice-agent-co-creation/TASK_QUEUE.md

Scope:
- VAC-012

Rules:
1) Confirm VAC-009 and VAC-011 are DONE before starting.
2) Before each task, list top 3 trust-regression risks.
3) Run Verify commands exactly.
4) Preserve human-in-the-loop approvals and escalation controls.
5) Keep trust artifacts schema-compatible with existing ATX outputs.

Stop when Lane E has no promotable tasks.
```

---

## Session F (Lane F: telemetry + guardrails)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane F tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/voice-agent-co-creation/TASK_QUEUE.md

Scope:
- VAC-013

Rules:
1) Confirm all P0 tasks are DONE or BLOCKED before starting.
2) Before each task, list top 3 trust-regression risks.
3) Run queue Verify commands exactly.
4) Ensure KPI definitions and alert thresholds are documented and test-covered.
5) Sync MASTER_PLAN.md + TASK_QUEUE.md with final threshold values.

Stop when Lane F has no promotable tasks.
```

---

## Session G (Lane G: hardening + closeout)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane G tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/voice-agent-co-creation/TASK_QUEUE.md

Scope:
- VAC-014

Rules:
1) Confirm VAC-013 is DONE before starting.
2) Before each task, list top 3 trust-regression risks.
3) Run Verify commands exactly from queue rows.
4) Run docs guard before closeout and resolve any violations.
5) Stop only when lane closeout is complete and docs are synchronized.
```
