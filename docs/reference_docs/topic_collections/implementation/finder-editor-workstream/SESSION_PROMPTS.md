# Finder + Text Editor Session Prompts

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/finder-editor-workstream`

Use one prompt per lane/worktree.

Always read first:

- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/finder-editor-workstream/TASK_QUEUE.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/finder-editor-workstream/MASTER_PLAN.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/finder-editor-workstream/INDEX.md`

---

## Session A (Lane A: registry + editor routing contract)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane A tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/finder-editor-workstream/TASK_QUEUE.md

Scope:
- FTE-001..FTE-002

Rules:
1) Before each task, list top 3 regression risks.
2) Run Verify commands exactly as specified in queue rows.
3) Keep PDF/image/viewer behaviors unchanged while refactoring editor routing.
4) Update TASK_QUEUE.md row status + notes after each completion.
5) Do not edit top-nav/all-app registrations in this lane.

Stop when Lane A has no promotable tasks.
```

---

## Session B (Lane B: VSCode-like New File UX in Finder)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane B tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/finder-editor-workstream/TASK_QUEUE.md

Scope:
- FTE-003..FTE-004

Rules:
1) Confirm FTE-001 is DONE before starting FTE-003.
2) Before each task, list top 3 regression risks.
3) Run Verify commands exactly from each queue row.
4) Preserve project/org path scoping and existing folder-creation behavior.
5) Keep changes limited to Finder UI/UX surface files.

Stop when Lane B has no promotable tasks.
```

---

## Session C (Lane C: standalone Text Editor app + launch points)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane C tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/finder-editor-workstream/TASK_QUEUE.md

Scope:
- FTE-005..FTE-007

Rules:
1) Confirm FTE-002 and FTE-003 are DONE before FTE-005.
2) Before each task, list top 3 regression risks.
3) Run Verify commands exactly from each queue row.
4) Register Text Editor in desktop product menu + All Apps as a first-class window.
5) Do not modify Convex backend contracts in this lane.

Stop when Lane C has no promotable tasks.
```

---

## Session D (Lane D: backend safeguards)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane D tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/finder-editor-workstream/TASK_QUEUE.md

Scope:
- FTE-008..FTE-009

Rules:
1) Confirm FTE-003 is DONE before starting FTE-008.
2) Before each task, list top 3 regression risks.
3) Run Verify commands exactly as listed.
4) Keep backend changes idempotent and safe for mixed old/new frontend behavior.
5) Do not refactor Finder UI files in this lane.

Stop when Lane D has no promotable tasks.
```

---

## Session E (Lane E: testing + hardening + docs closeout)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane E tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/finder-editor-workstream/TASK_QUEUE.md

Scope:
- FTE-010..FTE-012

Rules:
1) Confirm all P0 tasks are DONE or BLOCKED before starting.
2) Before each task, list top 3 regression risks.
3) Run Verify commands exactly from each row.
4) Ensure keyboard/focus and unsaved-change safety are explicitly tested.
5) Finalize queue/docs and run docs guard before closeout.

Stop when Lane E has no promotable tasks.
```
