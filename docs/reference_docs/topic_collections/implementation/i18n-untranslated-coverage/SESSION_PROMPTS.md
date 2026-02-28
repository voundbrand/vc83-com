# I18n Untranslated Coverage Session Prompts

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/i18n-untranslated-coverage`

Read before executing any lane:

- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/i18n-untranslated-coverage/TASK_QUEUE.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/i18n-untranslated-coverage/MASTER_PLAN.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/i18n-untranslated-coverage/INDEX.md`

Concurrency contract:

1. `IUC-013` and `IUC-014` are complete and serve as the current baseline snapshot.
2. Lane `B` (`IUC-015`) and lane `C` (`IUC-016`..`IUC-018`) may run in parallel, but only one `IN_PROGRESS` row per lane.
3. Lane `D` starts only after `IUC-015`..`IUC-018` are `DONE`.
4. Lane `E` starts only after `IUC-019` is `DONE`.
5. Lane `F` starts only after `IUC-020` is `DONE`.

---

## Session B (Lane B: builder/layers regression cleanup)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane B rows from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/i18n-untranslated-coverage/TASK_QUEUE.md

Scope:
- IUC-015

Rules:
1) Run row Verify commands exactly.
2) Keep UX behavior unchanged while replacing user-facing literals with translation lookups.
3) Do not edit window-content surfaces in this lane.
4) Keep fallback copy explicit when translation keys are missing.
5) Update TASK_QUEUE.md status/notes immediately after completion.

Stop when Lane B has no promotable rows.
```

---

## Session C (Lane C: window-content hotspot burn-down)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane C rows from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/i18n-untranslated-coverage/TASK_QUEUE.md

Scope:
- IUC-016
- IUC-017
- IUC-018

Rules:
1) Start with highest-priority promotable row (P0 then lowest ID).
2) Run row Verify commands exactly.
3) Keep changes scoped to the lane's primary files and avoid translation seed edits.
4) Prioritize user-visible labels, placeholders, alerts/confirms/prompts, and status text.
5) Update TASK_QUEUE.md status/notes after each completed row.

Stop when Lane C has no promotable rows.
```

---

## Session D (Lane D: six-locale seed parity follow-through)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane D rows from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/i18n-untranslated-coverage/TASK_QUEUE.md

Scope:
- IUC-019

Rules:
1) Confirm IUC-015..IUC-018 are DONE before starting.
2) Run row Verify commands exactly.
3) Every new key must include en,de,pl,es,fr,ja values in the same change.
4) Do not perform UI refactors in this lane.
5) Update TASK_QUEUE.md status/notes after completion.

Stop when Lane D has no promotable rows.
```

---

## Session E (Lane E: guard-to-green enforcement)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane E rows from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/i18n-untranslated-coverage/TASK_QUEUE.md

Scope:
- IUC-020

Rules:
1) Confirm IUC-019 is DONE before starting.
2) Run row Verify commands exactly.
3) Achieve newFindings=0 without broadening allowlists.
4) Treat baseline rebases as blocked unless explicitly approved.
5) Update TASK_QUEUE.md status/notes with exact command output.

Stop when Lane E has no promotable rows.
```

---

## Session F (Lane F: documentation closeout)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane F rows from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/i18n-untranslated-coverage/TASK_QUEUE.md

Scope:
- IUC-021

Rules:
1) Confirm IUC-020 is DONE before starting.
2) Run row Verify commands exactly.
3) Sync TASK_QUEUE.md, MASTER_PLAN.md, INDEX.md, and QA_MATRIX.md in one pass.
4) Include before/after audit delta stats and unresolved debt summary.
5) Stop after docs are synchronized and verified.
```
