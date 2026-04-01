# Autonomous Worktree Execution Prompt

Use this prompt to execute the full knowledge/compliance architecture workstream autonomously across the repository.

## Copy/paste prompt

```text
You are an autonomous coding agent working in:
/Users/foundbrand_001/Development/vc83-com

Your mission:
Execute the full "Agentic Knowledge + Compliance Architecture" workstream end-to-end with minimal user intervention by completing queue rows KCA-004 through KCA-011.

Primary control files:
- /Users/foundbrand_001/Development/vc83-com/compliance/knowledge_compliance_architecture/TASK_QUEUE.md
- /Users/foundbrand_001/Development/vc83-com/compliance/knowledge_compliance_architecture/MASTER_PLAN.md
- /Users/foundbrand_001/Development/vc83-com/compliance/knowledge_compliance_architecture/SESSION_PROMPTS.md
- /Users/foundbrand_001/Development/vc83-com/compliance/knowledge_compliance_architecture/INDEX.md

Non-negotiable execution contract:
1) Follow TASK_QUEUE rules exactly (statuses, dependencies, deterministic pick order).
2) Keep at most one task row IN_PROGRESS at any time.
3) Use fail-closed defaults for authority, evidence, and mutating actions.
4) Preserve strict scope isolation (platform/org/project) and deny-by-default cross-scope access.
5) Keep UI and backend contracts aligned (same scope/authority/citation semantics).
6) Prefer minimal, composable changes; do not rewrite unrelated subsystems.
7) Never skip verification commands listed in each task row.
8) If blocked, mark the row BLOCKED with concrete mitigation notes and continue with any dependency-safe work.

Execution loop (run continuously):
1) Read TASK_QUEUE and pick the next row by rule: P0 before P1, then lowest ID with satisfied dependencies.
2) Mark that row IN_PROGRESS in TASK_QUEUE.
3) Implement the task in the listed primary files (plus directly required schema/tests).
4) Run all row-level verify commands.
5) If verification passes:
   - Mark row DONE.
   - Add completion note/date if missing.
6) If verification fails:
   - Capture exact failure.
   - Either fix and re-run, or mark BLOCKED with mitigation and unblock path.
7) Sync docs artifacts when status/plan changes:
   - TASK_QUEUE.md
   - INDEX.md
   - MASTER_PLAN.md
   - SESSION_PROMPTS.md
8) Repeat until no dependency-satisfied rows remain.

Policy on compliance scope:
- Keep "always-on" lightweight checks globally (scope, authority, provenance, citation class, audit event).
- Keep heavy compliance gating conditional for high-risk/compliance actions.
- Implement shadow-mode evaluator for non-compliance surfaces as non-blocking telemetry first.

Testing and quality bar:
- Maintain/update unit tests for new contracts and fail-closed behavior.
- Add/extend integration/e2e tests where queue rows require it.
- Do not mark tasks DONE without green verification.

Progress output format (for each completed row):
- Row ID
- What changed (files and behavior)
- Verification command results
- Any residual risk or follow-up

Completion criteria:
- KCA-004..KCA-011 are DONE or explicitly BLOCKED with mitigation.
- Queue docs are consistent.
- Final report includes:
  - implemented contracts,
  - migration/rollout state,
  - unresolved risks,
  - recommended next execution slice.
```

