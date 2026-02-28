# Legacy Style Eradication Session Prompts

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/legacy-style-eradication`

Supersession state (2026-02-24): this queue is the active authority for token/style convergence. `LSE-022` is complete, so UIP implementation rows (`UIP-009`, `UIP-010`) may now be explicitly reactivated.

Closeout checkpoint: Lane `K` (`LSE-021`, `LSE-022`) is complete; use Session `K` for deterministic regression reruns or explicit follow-up only.

Always read first:

- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/legacy-style-eradication/TASK_QUEUE.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/legacy-style-eradication/BLOCKERS.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/legacy-style-eradication/MASTER_PLAN.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/legacy-style-eradication/INDEX.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/legacy-style-eradication/l4yercak3-design-token-contract.md`
- `/Users/foundbrand_001/Development/vc83-com/tmp/reports/legacy-style-full-project.txt`
- `/Users/foundbrand_001/Development/vc83-com/tmp/reports/legacy-style-full-project-current.txt`

---

## Lane gating and concurrency

1. Run Lane `A` first (`LSE-001`, `LSE-002`).
2. After Lane `A` is complete, run only one active task per lane.
3. Do not overlap lane work when files collide (especially `src/app/globals.css` and shared window primitives).
4. Maintain only two runtime appearance modes while converging semantics to the contract (`dark` -> `midnight`, `sepia` -> `daylight`).
5. Do not reintroduce legacy theme/window-style customization.
6. Preserve auth/onboarding/OAuth callback compatibility.
7. Treat `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/legacy-style-eradication/l4yercak3-design-token-contract.md` as the source of truth for new UI styling rules.
8. Do not scope active lane work into `/Users/foundbrand_001/Development/vc83-com/src/app/project/[slug]/templates/gerrit/GerritTemplate.tsx` or `/Users/foundbrand_001/Development/vc83-com/src/components/template-renderer.tsx` until `LSE-023`.
9. Keep `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/ui-perfection-workstream/TASK_QUEUE.md` archived for implementation while this queue has unresolved convergence rows.

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

---

## Session H (Lane H: contract CI + token alias foundation)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane H rows from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/legacy-style-eradication/TASK_QUEUE.md

Scope:
- LSE-015..LSE-016

Rules:
1) Confirm LSE-002 is DONE before applying contract enforcement changes.
2) Keep guard enforcement scoped to newly introduced lines so existing debt is reported separately.
3) Treat l4yercak3-design-token-contract.md as the source for blocked/allowed pattern logic.
4) Keep raw-value exceptions aligned with the contract (`**/tokens/**`, `**/globals.css`, `**/tailwind.config.*`).
5) Run row Verify commands exactly and sync queue artifacts after status changes.
```

---

## Session I (Lane I: shell + primitive convergence)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane I rows from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/legacy-style-eradication/TASK_QUEUE.md

Scope:
- LSE-017..LSE-018

Rules:
1) Confirm LSE-016 is DONE before starting.
2) Update shell chrome and shared primitives in deterministic order to avoid globals.css merge churn.
3) Ensure button/input/select/modal/table behavior remains equivalent while token names converge.
4) Preserve runtime mode compatibility (`dark`/`sepia`) while mapping to contract semantics.
5) Run row Verify commands exactly and log blockers immediately.
```

---

## Session J (Lane J: remaining UI migration)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane J rows from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/legacy-style-eradication/TASK_QUEUE.md

Scope:
- LSE-019..LSE-020

Rules:
1) Confirm LSE-018 is DONE before starting.
2) Work window-content families in bounded clusters; avoid broad simultaneous churn.
3) Remove raw style values and disallowed utility classes in touched files.
4) Preserve auth/onboarding/deep-link/OAuth callback compatibility.
5) Run row Verify commands exactly and update docs at each completion checkpoint.
```

---

## Session K (Lane K: visual + contrast lock)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane K rows from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/legacy-style-eradication/TASK_QUEUE.md

Scope:
- LSE-021..LSE-022

Rules:
1) Confirm LSE-020 is DONE before adding final lock checks.
2) Ensure visual and contrast checks emit deterministic pass/fail labels.
3) Keep CI outputs actionable with explicit failing screen/token references.
4) Run row Verify commands exactly and capture evidence paths in queue notes.
5) Do not close the workstream until docs guard passes and all queue artifacts are synchronized.
```
