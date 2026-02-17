# Autonomous Execution Protocol

**Last updated:** 2026-02-16  
**Purpose:** Let Codex execute AI endurance work continuously with minimal human input while preserving safety, quality, and traceability.

---

## 1) Source of truth

Codex must treat these files as the operational control set:

1. Queue: `docs/ai-endurance/TASK_QUEUE.md`
2. Blockers log: `docs/ai-endurance/BLOCKERS.md`
3. Strategy context: `docs/ai-endurance/MASTER_PLAN.md`
4. Deep implementation specs: `docs/ai-endurance/implementation-plans/*.md`

If instructions conflict, precedence is:
1) explicit user request, 2) this protocol, 3) task queue, 4) master/implementation plans.

---

## 2) Status model

Allowed task statuses:

- `READY`: executable now.
- `IN_PROGRESS`: actively being worked.
- `PENDING`: waiting on dependencies.
- `BLOCKED`: cannot continue after blocker policy was applied.
- `DONE`: implemented and verified.

Only one task should be `IN_PROGRESS` at a time.

---

## 3) Deterministic task selection

At the start of each loop:

1. Promote any `PENDING` task to `READY` when all dependencies are `DONE`.
2. Select the next task using this order:
   - lowest priority value (`P0` before `P1` before `P2`)
   - then lowest queue order number
3. Mark selected task `IN_PROGRESS`.

Codex must not skip a `READY` task unless:
- it requires forbidden/destructive/prod action without approval,
- or blocker policy was exhausted.

---

## 4) Execution loop for each task

For each selected task:

1. List top 3 regression risks.
2. Implement scoped code changes only for that task.
3. Run the task verification commands listed in `TASK_QUEUE.md`.
4. If checks pass:
   - mark task `DONE`,
   - update progress checkboxes in:
     - `docs/ai-endurance/INDEX.md`
     - `docs/ai-endurance/MASTER_PLAN.md`
   - append a brief completion note in the queue row notes field.
5. If checks fail and cannot be resolved under blocker policy:
   - mark task `BLOCKED`,
   - append blocker entry in `BLOCKERS.md`,
   - continue with next `READY` task.

---

## 5) Blocker policy

A task is considered blocked when any of these is true:

- More than 15 minutes of active debugging without viable path.
- Three failed fix attempts on the same root issue.
- Required command/action needs user approval and no safe alternative exists.
- Missing required artifact or unknown decision that cannot be inferred from code/docs.

When blocked:

1. Log the blocker in `BLOCKERS.md`.
2. Include:
   - timestamp,
   - task id,
   - blocker type,
   - attempted actions,
   - exact unblock condition,
   - suggested next command or decision.
3. Return to queue and pick next `READY` task.

---

## 6) Safety and approval boundaries

Codex must pause and request approval before:

- destructive repo/data operations not explicitly requested,
- production-impacting commands requiring elevated permissions,
- schema/data migrations where rollback is unclear.

If approval is pending, Codex should continue with any other `READY` task first.

---

## 7) Stop conditions

Codex should stop only when one of these is true:

1. No tasks are `READY` and no `PENDING` task can be promoted.
2. All remaining tasks are `BLOCKED`.
3. Explicit user stop request.

When stopping, provide:

- tasks completed this run,
- active blockers with unblock requirements,
- next task that will run automatically once unblocked.

---

## 8) Session resume prompt

Use this prompt to resume autonomous execution:

```text
Resume autonomous execution using docs/ai-endurance/AUTONOMOUS_EXECUTION_PROTOCOL.md.
Continue until no READY tasks remain in docs/ai-endurance/TASK_QUEUE.md.
For each task: risks, implementation, verification commands, and docs/progress updates.
If blocked >15 minutes or 3 failed attempts, mark BLOCKED in TASK_QUEUE.md, log details in BLOCKERS.md, and continue.
Stop only for required approvals, no promotable tasks, or explicit user stop.
```

