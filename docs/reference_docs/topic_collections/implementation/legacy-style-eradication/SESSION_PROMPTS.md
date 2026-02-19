# Legacy Style Eradication Session Prompts

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/legacy-style-eradication`

Always read first:

- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/legacy-style-eradication/TASK_QUEUE.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/legacy-style-eradication/BLOCKERS.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/legacy-style-eradication/MASTER_PLAN.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/legacy-style-eradication/INDEX.md`
- `/Users/foundbrand_001/Development/vc83-com/tmp/reports/legacy-style-full-project.txt`

---

## Lane gating and concurrency

1. Run Lane `A` first (`LSE-001`, `LSE-002`).
2. After Lane `A` is complete, run only one active task per lane.
3. Do not overlap lane work when files collide (especially `src/app/globals.css` and shared window primitives).
4. Keep dark/sepia as the only appearance modes.
5. Do not reintroduce legacy theme/window-style customization.
6. Preserve auth/onboarding/OAuth callback compatibility.

---

## Session A (Lane A: guard/tooling)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane A rows from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/legacy-style-eradication/TASK_QUEUE.md

Scope:
- LSE-001..LSE-002

Rules:
1) Run Verify commands exactly as listed in each queue row.
2) Make the legacy guard deterministic on macOS/BSD awk.
3) Re-run baseline guard from EMPTY_TREE to HEAD before marking DONE.
4) Update TASK_QUEUE.md, INDEX.md, MASTER_PLAN.md, and BLOCKERS.md after each completed task.
5) If blocked, log blocker and continue with the next READY row.
```

---

## Session B (Lane B: global tokens/selectors)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane B rows from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/legacy-style-eradication/TASK_QUEUE.md

Scope:
- LSE-003..LSE-004

Rules:
1) Confirm LSE-002 is DONE before starting.
2) Remove legacy Win95 token/class usage from global shell layers without changing core window behavior.
3) Keep dark/sepia mode semantics intact.
4) Run row Verify commands exactly.
5) Sync queue/docs after each task.
```

---

## Session C (Lane C: window migration wave 1)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane C rows from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/legacy-style-eradication/TASK_QUEUE.md

Scope:
- LSE-005..LSE-007

Rules:
1) Confirm LSE-004 is DONE.
2) Work one window family at a time.
3) Preserve integrations/publishing/manage workflows and translations.
4) Keep dark/sepia only.
5) Run row Verify commands exactly and update docs.
```

---

## Session D (Lane D: window migration wave 2)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane D rows from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/legacy-style-eradication/TASK_QUEUE.md

Scope:
- LSE-008..LSE-009

Rules:
1) Confirm LSE-007 is DONE.
2) Keep booking/events/products/assistant flows behaviorally equivalent.
3) Do not reintroduce retro button/window-style classes.
4) Run row Verify commands exactly.
5) Log blockers immediately.
```

---

## Session E (Lane E: builder + compatibility hardening)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane E rows from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/legacy-style-eradication/TASK_QUEUE.md

Scope:
- LSE-010..LSE-011

Rules:
1) Confirm LSE-009 is DONE.
2) Preserve auth/onboarding behavior and OAuth callback compatibility.
3) Keep route/deep-link contract stable while removing style debt.
4) Keep dark/sepia only.
5) Run row Verify commands exactly and sync docs after completion.
```

---

## Session F (Lane F: shared/tail cleanup)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane F rows from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/legacy-style-eradication/TASK_QUEUE.md

Scope:
- LSE-012

Rules:
1) Confirm LSE-011 is DONE.
2) Remove remaining legacy references in shared components, convex, and scripts.
3) Do not change backend contracts unless required for compatibility.
4) Run row Verify commands exactly.
5) Update queue/docs and blockers.
```

---

## Session G (Lane G: zero-debt checkpoint + closeout)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane G rows from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/legacy-style-eradication/TASK_QUEUE.md

Scope:
- LSE-013..LSE-014

Rules:
1) Confirm LSE-012 is DONE.
2) Re-run baseline guard and full-project regex scan.
3) Record updated metrics in INDEX.md and MASTER_PLAN.md.
4) Run row Verify commands exactly.
5) If LSE-012 is not DONE, mark LSE-013/LSE-014 as BLOCKED with evidence in TASK_QUEUE.md + BLOCKERS.md.
6) Do not close the lane until docs guard passes and queue artifacts are synchronized.
```
