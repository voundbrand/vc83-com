# UI Perfection Session Prompts

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/ui-perfection-workstream`

Use one prompt per lane/worktree.

Reactivation state (2026-02-24): `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/legacy-style-eradication/TASK_QUEUE.md` completed `LSE-022`, cycle-7 closeout finished through `UIP-012`, and cycle-8 recurring UIP CI operation was seeded.
Pause state (2026-02-25): rows `UIP-013` and `UIP-014` are `BLOCKED` by one-of-one cutover row `LOC-003`; do not run this queue without explicit cutover override after `LOC-009` is `DONE`.

Always read first:

- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/ui-perfection-workstream/UI_PERFECTION_TASK_QUEUE.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/ui-perfection-workstream/TASK_QUEUE.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/ui-perfection-workstream/MASTER_PLAN.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/ui-perfection-workstream/INDEX.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/legacy-style-eradication/l4yercak3-design-token-contract.md`
- `/Users/foundbrand_001/Development/vc83-com/scripts/ci/check-ui-design-drift.sh`
- `/Users/foundbrand_001/Development/vc83-com/scripts/ci/check-ui-showcase-enforcement.sh`

---

## Loop operating contract

1. Execute UIP rows only when the cross-workstream gate is satisfied (`LSE-022` `DONE`) and the `LOC-003` pause lock is explicitly lifted.
2. Execute the next promotable row from `UI_PERFECTION_TASK_QUEUE.md` only.
3. Before each task, list top 3 UI regression risks.
4. Run row `Verify` commands exactly as written.
5. After each `DONE` row, update:
   - row `Status` + `Notes`,
   - `Touched File Ledger` with exact file paths edited,
   - `INDEX.md`, `MASTER_PLAN.md`, `UI_PERFECTION_TASK_QUEUE.md`, `TASK_QUEUE.md`, and `SESSION_PROMPTS.md` at lane milestones.
6. If a dependency is not met, keep row `PENDING` (or set `BLOCKED` with evidence).
7. If a verify command fails due unrelated baseline debt, record the blocker and continue with the next promotable row.
8. Stop when no promotable rows remain, then run the reseed row (`UIP-014`) to begin the next cycle.

## Current checkpoint (2026-02-24)

1. Lane `D` and lane `E` are complete (`UIP-006`..`UIP-008`).
2. Lane `F` closeout/reseed baseline is complete (`UIP-009` and `UIP-010` are `DONE`).
3. Cycle-7 recurring CI operation rows (`UIP-011`, `UIP-012`) are `DONE`; cycle-8 rows (`UIP-013`, `UIP-014`) are now `BLOCKED` by `LOC-003`.
4. Known recurring blocker: `npm run test:unit` can hang with websocket reconnect loops; record as `exit=143` when reproduced.
5. Known transient visual timeout signature: `screen=design-token-showcase mode=sepia token=text-secondary-on-bg`; capture artifact paths if it reappears.

---

## Session 0 (Universal repeatable loop)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute the next promotable task from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/ui-perfection-workstream/UI_PERFECTION_TASK_QUEUE.md

Rules:
0) Confirm `LSE-022` is `DONE` and UIP reactivation is explicitly documented; otherwise stop without edits.
1) Before each task, list top 3 UI regression risks (token drift, sepia/daylight mismatch, interaction/readability regressions).
2) Run Verify commands exactly from the queue row.
3) After each completed task, update row status/notes and append exact paths to the Touched File Ledger.
4) Keep UI_PERFECTION_TASK_QUEUE.md and TASK_QUEUE.md synchronized.
5) Sync INDEX.md, MASTER_PLAN.md, TASK_QUEUE.md, UI_PERFECTION_TASK_QUEUE.md, and SESSION_PROMPTS.md at lane milestones.
6) If blocked, mark BLOCKED with concrete evidence and continue to next promotable row.

Stop when there are no promotable tasks left for this cycle.
```

---

## Session A (Lane A: baseline + inventory)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane A rows from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/ui-perfection-workstream/UI_PERFECTION_TASK_QUEUE.md

Scope:
- UIP-001..UIP-002

Rules:
1) Generate a deterministic baseline drift matrix before any migration edits.
2) Confirm touch-ledger seed entries are current before marking DONE.
3) Run Verify commands exactly from each row.
4) Promote lane B only when lane A rows are DONE.
```

---

## Session B (Lane B + C: token roots + showcase)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute Lane B and Lane C rows from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/ui-perfection-workstream/UI_PERFECTION_TASK_QUEUE.md

Scope:
- UIP-003..UIP-005

Rules:
1) Confirm UIP-002 is DONE before starting lane B.
2) Keep behavior unchanged while style tokens converge.
3) Keep showcase deterministic with stable test IDs and snapshot naming.
4) Run Verify commands exactly from each row.
```

---

## Session C (Lane D + E: surface sweep + visual lock)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute Lane D and Lane E rows from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/ui-perfection-workstream/UI_PERFECTION_TASK_QUEUE.md

Scope:
- UIP-006..UIP-008

Rules:
1) Confirm UIP-005 is DONE before lane D.
2) Prioritize files already present in the touch-ledger before widening scope.
3) Keep CI outputs deterministic and snapshot names stable.
4) Run Verify commands exactly from each row.
```

---

## Session D (Lane F: recurring closeout)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane F rows from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/ui-perfection-workstream/UI_PERFECTION_TASK_QUEUE.md

Scope:
- UIP-014

Rules:
0) Confirm `LSE-022` is `DONE` and the active cycle reseed baseline row (`UIP-012`) is already complete.
1) Confirm all prior P0 rows in the active cycle are DONE or BLOCKED before closeout.
2) Run full verification profile exactly from queue rows.
3) Publish residual drift counts and evidence paths in queue Notes.
4) Sync INDEX.md, MASTER_PLAN.md, TASK_QUEUE.md, UI_PERFECTION_TASK_QUEUE.md, and SESSION_PROMPTS.md.
5) Run docs guard and resolve violations before completion.
```

---

## Session E (Cycle 8 recurring CI loop)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute cycle-8 recurring CI rows from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/ui-perfection-workstream/UI_PERFECTION_TASK_QUEUE.md

Scope:
- UIP-013..UIP-014

Rules:
1) Treat UIP-013 as the always-on CI contract row for design/showcase/visual checks.
2) Require deterministic pass/fail labels (`screen=... mode=... token=...`) in all visual/contrast outputs.
3) When CI fails, record exact failing screen/token references and artifact paths in queue Notes.
4) Keep TASK_QUEUE.md and UI_PERFECTION_TASK_QUEUE.md synchronized after every row status change.
5) Finish cycle closeout only after `npm run docs:guard` passes.
```
