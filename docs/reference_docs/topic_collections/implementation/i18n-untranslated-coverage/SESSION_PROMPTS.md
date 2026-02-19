# I18n Untranslated Coverage Session Prompts

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/i18n-untranslated-coverage`

Use one prompt per lane/worktree.

Always read first:

- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/i18n-untranslated-coverage/TASK_QUEUE.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/i18n-untranslated-coverage/MASTER_PLAN.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/i18n-untranslated-coverage/INDEX.md`

---

## Session A (Lane A: discovery and audit tooling)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane A tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/i18n-untranslated-coverage/TASK_QUEUE.md

Scope:
- IUC-001..IUC-003

Rules:
1) Before each task, list top 3 regression risks.
2) Run queue Verify commands exactly.
3) Keep audit output deterministic and scoped (builder, layers, window-content).
4) Treat allowlist entries as explicit exceptions with reason comments.
5) Update TASK_QUEUE.md status + notes immediately after each task.

Stop when Lane A has no promotable tasks.
```

---

## Session B (Lane B: builder UI migration)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane B tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/i18n-untranslated-coverage/TASK_QUEUE.md

Scope:
- IUC-004..IUC-005

Rules:
1) Confirm IUC-003 is DONE before starting.
2) Before each task, list top 3 regression risks.
3) Run queue Verify commands exactly.
4) Preserve existing builder UX/flows while replacing literals with translation keys.
5) Do not edit translation seed contracts in this lane.

Stop when Lane B has no promotable tasks.
```

---

## Session C (Lane C: layers and desktop window hotspots)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane C tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/i18n-untranslated-coverage/TASK_QUEUE.md

Scope:
- IUC-006..IUC-007

Rules:
1) Confirm IUC-003 is DONE before IUC-006.
2) Before each task, list top 3 regression risks.
3) Run queue Verify commands exactly.
4) Prioritize user-visible alerts/placeholders/loading/empty states.
5) Do not modify builder-only files owned by Lane B unless re-queued.

Stop when Lane C has no promotable tasks.
```

---

## Session D (Lane D: six-locale completeness)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane D tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/i18n-untranslated-coverage/TASK_QUEUE.md

Scope:
- IUC-008..IUC-009

Rules:
1) Confirm IUC-003 is DONE before IUC-008.
2) Before each task, list top 3 regression risks.
3) Run queue Verify commands exactly.
4) Enforce six-locale parity for every newly introduced key.
5) Avoid UI refactors in this lane; stay in translation contracts and seed assets.

Stop when Lane D has no promotable tasks.
```

---

## Session E (Lane E: CI and regression gates)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane E tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/i18n-untranslated-coverage/TASK_QUEUE.md

Scope:
- IUC-010

Rules:
1) Confirm IUC-005, IUC-007, and IUC-009 are DONE before starting.
2) Before the task, list top 3 regression risks.
3) Run queue Verify commands exactly.
4) CI should block new untranslated literals but keep migration debt handling pragmatic.
5) Keep exceptions explicit and reviewed (no silent ignores).

Stop when Lane E has no promotable tasks.
```

---

## Session F (Lane F: QA and closeout)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane F tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/i18n-untranslated-coverage/TASK_QUEUE.md

Scope:
- IUC-011..IUC-012

Rules:
1) Confirm all P0 tasks are DONE or BLOCKED before starting.
2) Before each task, list top 3 regression risks.
3) Run queue Verify commands exactly.
4) Capture six-locale QA outcomes and unresolved debt in docs.
5) Finalize TASK_QUEUE.md, MASTER_PLAN.md, and INDEX.md in one closeout pass.

Stop when closeout is complete.
```
