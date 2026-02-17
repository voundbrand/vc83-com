# AI Endurance Session Prompts

Use these prompts in separate windows/worktrees.
Always read first:

- `docs/ai-endurance/AUTONOMOUS_EXECUTION_PROTOCOL.md`
- `docs/ai-endurance/TASK_QUEUE.md`
- `docs/ai-endurance/IMPLEMENTATION_BASELINE_AUDIT.md`

Current state note (2026-02-17):
- Prior lanes (`A` through `G`) are closed.
- Active execution wave is `Lane H` through `Lane L` in `TASK_QUEUE.md`.

---

## Session H (Lane H: CommonGround protocol foundation, Plans 14-15)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Follow docs/ai-endurance/AUTONOMOUS_EXECUTION_PROTOCOL.md and execute only Lane H tasks in docs/ai-endurance/TASK_QUEUE.md.

Scope:
- WSH-01..WSH-07

Rules:
1) Execute tasks in strict dependency order and keep exactly one task IN_PROGRESS.
2) Before each task, list top 3 regression risks.
3) Treat this lane as protocol-kernel work: preserve behavior while formalizing turn/receipt contracts.
4) Run the queue verification commands exactly.
5) Update TASK_QUEUE.md status/notes immediately after each task.
6) If blocked, mark BLOCKED and log blocker details in BLOCKERS.md.

Stop when:
- Lane H has no promotable tasks, or
- required approval is needed.
```

---

## Session I (Lane I: Harness + Soul unification, Plans 16 and 19)

Run only after `WSH-03` is `DONE`.

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Follow docs/ai-endurance/AUTONOMOUS_EXECUTION_PROTOCOL.md and execute only Lane I tasks in docs/ai-endurance/TASK_QUEUE.md.

Scope:
- WSI-01..WSI-06

Rules:
1) Verify dependency gates (`WSH-03`, then row-specific deps like `WSJ-03`) before each task.
2) Do not edit tasks outside Lane I except shared docs updates required by a completed row.
3) Before each task, list top 3 regression risks.
4) Run queue verification commands exactly.
5) Keep reflection/soul changes policy-safe and behavior-preserving unless row notes require behavior change.
6) Update TASK_QUEUE.md and BLOCKERS.md after each completion/block.

Stop when Lane I has no promotable tasks.
```

---

## Session J (Lane J: Core Memory + Semantic Retrieval, Plans 17 and 18)

Run only after `WSH-03` is `DONE`.

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Follow docs/ai-endurance/AUTONOMOUS_EXECUTION_PROTOCOL.md and execute only Lane J tasks in docs/ai-endurance/TASK_QUEUE.md.

Scope:
- WSJ-01..WSJ-06

Rules:
1) Verify dependency gates before each task.
2) Keep tenant isolation and fallback behavior explicit for all retrieval/indexing changes.
3) Before each task, list top 3 regression risks.
4) Run queue verification commands exactly.
5) Update TASK_QUEUE.md status/notes after each task.
6) Log blockers in BLOCKERS.md and continue only within Lane J.

Stop when Lane J has no promotable tasks.
```

---

## Session K (Lane K: Operability + residual closure, Plans 20 + 01/02/03/04/13 residuals)

Run only after `WSH-03` is `DONE`.

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Follow docs/ai-endurance/AUTONOMOUS_EXECUTION_PROTOCOL.md and execute only Lane K tasks in docs/ai-endurance/TASK_QUEUE.md.

Scope:
- WSK-01..WSK-07

Rules:
1) Verify dependency gates before each task.
2) For docs tasks, ensure alert/query names map to real runtime identifiers.
3) For residual code tasks, preserve behavior and add missing coverage first.
4) Before each task, list top 3 regression risks.
5) Run queue verification commands exactly.
6) Update TASK_QUEUE.md + BLOCKERS.md after each completion/block.

Stop when Lane K has no promotable tasks.
```

---

## Session L (Lane L: Runtime hotspot refactor V2, Plan 21)

Run only after `WSH-07`, `WSI-06`, and `WSJ-06` are `DONE`.

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Follow docs/ai-endurance/AUTONOMOUS_EXECUTION_PROTOCOL.md and execute only Lane L tasks in docs/ai-endurance/TASK_QUEUE.md.

Scope:
- WSL-01..WSL-06

Rules:
1) Start with characterization tests (`WSL-01`) before any extraction.
2) Keep refactors behavior-preserving unless queue notes explicitly require behavior changes.
3) Before each task, list top 3 regression risks.
4) Run queue verification commands exactly.
5) Update TASK_QUEUE.md status/notes after each task.
6) If drift is detected, block current task, log in BLOCKERS.md, and stop extraction until resolved.

Stop when Lane L has no promotable tasks or a higher-priority lane becomes READY.
```
