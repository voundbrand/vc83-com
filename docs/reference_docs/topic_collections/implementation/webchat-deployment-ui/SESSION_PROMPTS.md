# Webchat Deployment UI Session Prompts

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/webchat-deployment-ui`

Use one prompt per lane/worktree.

Always read first:

- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/webchat-deployment-ui/TASK_QUEUE.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/webchat-deployment-ui/MASTER_PLAN.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/webchat-deployment-ui/INDEX.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/bring_it_all_together/05-WEBCHAT-WIDGET.md`

---

## Session A (Lane A: backend contract)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane A tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/webchat-deployment-ui/TASK_QUEUE.md

Scope:
- WDU-001..WDU-003

Rules:
1) Confirm WDU-001 findings are captured before changing code.
2) Prioritize payload contract hardening, specifically organizationId resolution.
3) Run Verify commands exactly as listed in each queue row.
4) Preserve backward compatibility for existing deployed widgets where possible.
5) Update TASK_QUEUE.md status and Notes after each completed task.

Stop when Lane A has no promotable tasks.
```

---

## Session B (Lane B: widget runtime + snippets)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane B tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/webchat-deployment-ui/TASK_QUEUE.md

Scope:
- WDU-004..WDU-006

Rules:
1) Confirm WDU-002 is DONE before WDU-004 and WDU-003 is DONE before WDU-005.
2) Keep snippet generation deterministic across script, React, and iframe modes.
3) Ensure customization contract fields match backend validation exactly.
4) Run queue Verify commands exactly.
5) Do not modify desktop window registration in this lane.

Stop when Lane B has no promotable tasks.
```

---

## Session C (Lane C: native desktop UI)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane C tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/webchat-deployment-ui/TASK_QUEUE.md

Scope:
- WDU-007..WDU-009

Rules:
1) Confirm WDU-004 and WDU-005 are DONE before starting.
2) Build a native Webchat Deployment UI flow with clear snippet and config affordances.
3) Include deploy snippet UX requirements: copy states, validation hints, and quick checks.
4) Run queue Verify commands exactly.
5) Avoid Convex payload/schema edits in this lane.

Stop when Lane C has no promotable tasks.
```

---

## Session D (Lane D: docs/testing closeout)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane D tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/webchat-deployment-ui/TASK_QUEUE.md

Scope:
- WDU-010..WDU-012

Rules:
1) Start only after all P0 tasks in lanes A-C are DONE or BLOCKED.
2) Add both targeted unit tests and end-to-end smoke checks for deployment flow.
3) Run Verify commands exactly as listed, including docs guard.
4) Sync TASK_QUEUE.md, MASTER_PLAN.md, and INDEX.md with final execution status.
5) Do not close lane D until docs guard is passing.

Stop when lane D closeout is complete.
```
