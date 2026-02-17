# Desktop Appearance Consolidation Autonomous Execution Protocol

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/desktop-appearance-consolidation`

---

## 1) Source of truth

Use this control set:

1. Queue: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/desktop-appearance-consolidation/TASK_QUEUE.md`
2. Blockers: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/desktop-appearance-consolidation/BLOCKERS.md`
3. Master plan: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/desktop-appearance-consolidation/MASTER_PLAN.md`
4. Session lane prompts: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/desktop-appearance-consolidation/SESSION_PROMPTS.md`
5. Source design plan: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/desktop-appearance-consolidation-plan.md`

Conflict precedence:

1. explicit user request,
2. this protocol,
3. task queue,
4. master plan.

---

## 2) Status model

Allowed statuses only:

- `READY`
- `IN_PROGRESS`
- `PENDING`
- `BLOCKED`
- `DONE`

---

## 3) Deterministic selection algorithm

At each execution cycle:

1. Promote `PENDING` -> `READY` when dependencies are `DONE`.
2. Apply concurrency rules from `TASK_QUEUE.md`.
3. Select next task deterministically by:
   - highest priority (`P0` before `P1` before `P2`),
   - then lowest ID (`DAC-001`, `DAC-002`, ...).
4. Mark selected task `IN_PROGRESS`.

---

## 4) Execution loop per task

For each task:

1. List top 3 regression risks.
2. Implement only scoped changes for that row.
3. Run all Verify commands in that row.
4. If verification passes:
   - set task to `DONE`,
   - append concise completion note in queue `Notes`,
   - update progress in `INDEX.md` and `MASTER_PLAN.md`.
5. If blocked per blocker policy:
   - set task to `BLOCKED`,
   - log blocker,
   - continue with next eligible `READY` task.

---

## 5) Blocker policy

Treat as blocked when any one is true:

- 15+ minutes debugging without clear forward path,
- three failed fix attempts for same root cause,
- required approval blocks essential command,
- unresolved requirement cannot be inferred from repo/docs.

Blocker action sequence:

1. Log in `BLOCKERS.md` Active blockers.
2. Mark task `BLOCKED` in queue.
3. Continue with next `READY` task that respects lane/concurrency rules.

---

## 6) Safety boundaries

Pause for user input when action is destructive or approval-gated.

If a single task is blocked by approvals, continue with another `READY` task when possible.

---

## 7) Stop conditions

Stop only when one is true:

1. No `READY` tasks and no `PENDING` tasks can be promoted.
2. All remaining tasks are `BLOCKED`.
3. User explicitly requests stop/pause.

On stop, report:

- completed tasks,
- active blockers and unblock conditions,
- next deterministic task once unblocked.

---

## 8) Resume prompt

```text
Resume autonomous execution using:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/desktop-appearance-consolidation/AUTONOMOUS_EXECUTION_PROTOCOL.md

Use queue:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/desktop-appearance-consolidation/TASK_QUEUE.md

For each task: risks, scoped implementation, Verify commands, and status/docs updates.
If blocked, mark BLOCKED, log in BLOCKERS.md, and continue.
Stop only when no promotable tasks remain, all tasks are blocked, or user asks to stop.
```
