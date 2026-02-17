# Desktop Appearance Consolidation Session Prompts

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/desktop-appearance-consolidation`

Use one prompt per lane/worktree.

Always read first:

- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/desktop-appearance-consolidation/AUTONOMOUS_EXECUTION_PROTOCOL.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/desktop-appearance-consolidation/TASK_QUEUE.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/desktop-appearance-consolidation/BLOCKERS.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/desktop-appearance-consolidation/MASTER_PLAN.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/desktop-appearance-consolidation-plan.md`

---

## Session A (Lane A: foundation)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane A tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/desktop-appearance-consolidation/TASK_QUEUE.md

Scope:
- DAC-001..DAC-003

Rules:
1) Follow AUTONOMOUS_EXECUTION_PROTOCOL.md in the same workstream folder.
2) Before each task, list top 3 regression risks.
3) Run Verify commands exactly as specified in queue row.
4) Update status + notes in TASK_QUEUE.md after each task.
5) If blocked, log in BLOCKERS.md and continue with next READY task in Lane A.

Stop when Lane A has no promotable tasks.
```

---

## Session B (Lane B: typography/layout)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane B tasks from this workstream queue:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/desktop-appearance-consolidation/TASK_QUEUE.md

Scope:
- DAC-004..DAC-005

Rules:
1) Confirm DAC-003 is DONE before starting.
2) Before each task, list top 3 regression risks.
3) Run queue Verify commands exactly.
4) Update TASK_QUEUE.md status and notes.
5) Do not edit Convex schema/migration files.

Stop when Lane B has no promotable tasks.
```

---

## Session C (Lane C: settings + homepage)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane C tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/desktop-appearance-consolidation/TASK_QUEUE.md

Scope:
- DAC-006..DAC-007

Rules:
1) Confirm DAC-003 is DONE before starting.
2) Before each task, list top 3 regression risks.
3) Run Verify commands exactly as listed.
4) Update TASK_QUEUE.md status and notes after each task.
5) Keep wallpaper/region settings behavior unchanged.

Stop when Lane C has no promotable tasks.
```

---

## Session D (Lane D: CSS/token convergence)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane D tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/desktop-appearance-consolidation/TASK_QUEUE.md

Scope:
- DAC-010..DAC-012

Rules:
1) Confirm DAC-005 and DAC-007 are DONE before DAC-010.
2) Before each task, list top 3 regression risks.
3) Run Verify commands exactly from each queue row.
4) Update TASK_QUEUE.md status and notes.
5) Preserve desktop/Finder interactions while changing styling.

Stop when Lane D has no promotable tasks.
```

---

## Session E (Lane E: backend preference migration)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane E tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/desktop-appearance-consolidation/TASK_QUEUE.md

Scope:
- DAC-008..DAC-009

Rules:
1) Confirm DAC-003 is DONE before starting.
2) Before each task, list top 3 regression risks.
3) Run queue Verify commands exactly.
4) Update TASK_QUEUE.md status and notes.
5) Keep dual-read compatibility until final deletion pass.

Stop when Lane E has no promotable tasks.
```

---

## Session F (Lane F: hardening + deletion)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane F tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/desktop-appearance-consolidation/TASK_QUEUE.md

Scope:
- DAC-013..DAC-015

Rules:
1) Confirm all P0/P1 tasks are DONE or BLOCKED before starting.
2) Before each task, list top 3 regression risks.
3) Run Verify commands exactly.
4) Update TASK_QUEUE.md status and notes.
5) Update INDEX.md and MASTER_PLAN.md for completed work.

Stop when Lane F has no promotable tasks.
```

---

## Session G (Lane G: PostHog-inspired desktop polish)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane G tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/desktop-appearance-consolidation/TASK_QUEUE.md

Scope:
- DAC-016..DAC-018

Required references:
- /Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/desktop-appearance-consolidation/LANE_G_POSTHOG_REFERENCE_NOTES.md
- /Users/foundbrand_001/Development/vc83-com/tmp/posthog-audit/menu-product-os.png
- /Users/foundbrand_001/Development/vc83-com/tmp/posthog-audit/menu-more.png

Rules:
1) Confirm DAC-015 is DONE before starting.
2) Before each task, list top 3 regression risks.
3) Run queue Verify commands exactly for each row.
4) Keep dark/sepia as the only appearance modes.
5) Replace Start-button flow with top link navigation and maintain keyboard accessibility.
6) Use custom icon components for desktop/menu/nav surfaces; no emoji UI glyphs.
7) Update TASK_QUEUE.md notes after each task and log blockers in BLOCKERS.md.

Stop when Lane G has no promotable tasks.
```

---

## Session H (Lane H: window interior control cleanup)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane H tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/desktop-appearance-consolidation/TASK_QUEUE.md

Scope:
- DAC-019..DAC-024

Required references:
- /Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/desktop-appearance-consolidation/LANE_G_POSTHOG_REFERENCE_NOTES.md
- /Users/foundbrand_001/Development/vc83-com/tmp/posthog-audit/menu-product-os.png
- /Users/foundbrand_001/Development/vc83-com/tmp/posthog-audit/menu-more.png

Rules:
1) Confirm DAC-018 is DONE before starting.
2) Before each task, list top 3 regression risks.
3) Run queue Verify commands exactly for each row.
4) Keep dark/sepia as the only appearance modes.
5) Keep top-link navigation; do not reintroduce Start-button flow.
6) Use custom icon components for desktop/menu/nav/window chrome surfaces; no emoji UI glyphs.
7) Preserve translation key/namespace integrity; raw key display indicates a bug and must not be masked.
8) Do not change schema/backend preference contracts in Lane H.
9) Update TASK_QUEUE.md notes after each task and log blockers in BLOCKERS.md.

Stop when Lane H has no promotable tasks.
```
