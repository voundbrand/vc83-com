# Product OS Community + Roadmap Session Prompts

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/product-os-community-roadmap`

Pause state (2026-02-25): rows `ACR-001`..`ACR-027` are `BLOCKED` by one-of-one cutover row `LOC-003`. Do not resume this queue without explicit cutover override after `LOC-009` is `DONE`.

Use one prompt per lane/worktree.

Always read first:

- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/product-os-community-roadmap/TASK_QUEUE.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/product-os-community-roadmap/MASTER_PLAN.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/product-os-community-roadmap/INDEX.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/desktop-appearance-consolidation/LANE_G_POSTHOG_REFERENCE_NOTES.md`

Global execution rules:

1. Do not execute any row while the `LOC-003` pause lock is active.
2. Before each task, list top 3 runtime or UX regression risks.
3. Execute only promotable tasks from your assigned lane.
4. Run Verify commands exactly as specified in queue rows.
5. Update `TASK_QUEUE.md` notes/status immediately after each task.
6. Sync `INDEX.md` and `MASTER_PLAN.md` when contract or status changes.

Concurrency and gating:

- Lane `A` must finish `ACR-001`..`ACR-003` before any implementation lane starts.
- Lanes `C`, `D`, and `E` may run in parallel only after lane `B` contract rows are complete.
- Lane `G` starts only when all `P0` rows are `DONE` or `BLOCKED`.
- Lane `H` is exclusive and final.

---

## Session A (Lane A: baseline + contract freeze)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane A tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/product-os-community-roadmap/TASK_QUEUE.md

Scope:
- ACR-001..ACR-004

Rules:
1) Freeze UX and data contracts before coding implementation lanes.
2) Before each task, list top 3 runtime/UX regression risks.
3) Keep outputs concrete: workflow steps, tool mappings, deploy-ready recommendations.
4) Run Verify commands exactly from queue rows.
5) Update TASK_QUEUE.md + MASTER_PLAN.md with contract decisions.

Stop when Lane A has no promotable tasks.
```

---

## Session B (Lane B: backend contracts + APIs)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane B tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/product-os-community-roadmap/TASK_QUEUE.md

Scope:
- ACR-005..ACR-008

Rules:
1) Confirm ACR-003 is DONE before starting.
2) Before each task, list top 3 runtime/UX regression risks.
3) Keep schema changes backward compatible and deterministic.
4) Enforce one-vote-per-user semantics and deterministic ranking behavior.
5) Run Verify commands exactly from queue rows.

Stop when Lane B has no promotable tasks.
```

---

## Session C (Lane C: roadmap UX)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane C tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/product-os-community-roadmap/TASK_QUEUE.md

Scope:
- ACR-009..ACR-012

Rules:
1) Confirm ACR-006 is DONE before ACR-009.
2) Before each task, list top 3 runtime/UX regression risks.
3) Replace static roadmap placeholders with live interactions.
4) Ensure vote and submit flows have deterministic pass/fail user feedback.
5) Run Verify commands exactly from queue rows.

Stop when Lane C has no promotable tasks.
```

---

## Session D (Lane D: community hub)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane D tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/product-os-community-roadmap/TASK_QUEUE.md

Scope:
- ACR-013..ACR-016

Rules:
1) Confirm ACR-002 and ACR-007 are DONE before starting.
2) Before each task, list top 3 runtime/UX regression risks.
3) Route Community menu entries to deterministic window/route targets.
4) Preserve desktop/mobile behavior contract from Lane A.
5) Run Verify commands exactly from queue rows.

Stop when Lane D has no promotable tasks.
```

---

## Session E (Lane E: docs convergence)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane E tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/product-os-community-roadmap/TASK_QUEUE.md

Scope:
- ACR-017..ACR-019

Rules:
1) Confirm ACR-002 is DONE before starting.
2) Before each task, list top 3 runtime/UX regression risks.
3) Keep docs menu labels and translation keys deterministic.
4) Add docs-to-community and docs-to-roadmap bridges with explicit context payloads.
5) Run Verify commands exactly from queue rows.

Stop when Lane E has no promotable tasks.
```

---

## Session F (Lane F: moderation + abuse controls)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane F tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/product-os-community-roadmap/TASK_QUEUE.md

Scope:
- ACR-020..ACR-022

Rules:
1) Confirm ACR-004 and ACR-007 are DONE before starting.
2) Before each task, list top 3 runtime/UX regression risks.
3) Enforce role/action matrix exactly as defined in MASTER_PLAN.md.
4) Every moderation action must produce an auditable event record.
5) Run Verify commands exactly from queue rows.

Stop when Lane F has no promotable tasks.
```

---

## Session G (Lane G: telemetry + rollout)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane G tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/product-os-community-roadmap/TASK_QUEUE.md

Scope:
- ACR-023..ACR-025

Rules:
1) Confirm all P0 rows are DONE or BLOCKED before starting.
2) Before each task, list top 3 runtime/UX regression risks.
3) Keep telemetry names versioned and deterministic.
4) Publish rollout gates with explicit pass/fail thresholds.
5) Run Verify commands exactly from queue rows.

Stop when Lane G has no promotable tasks.
```

---

## Session H (Lane H: hardening + closeout)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane H tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/product-os-community-roadmap/TASK_QUEUE.md

Scope:
- ACR-026..ACR-027

Rules:
1) Confirm ACR-025 is DONE before starting.
2) Before each task, list top 3 runtime/UX regression risks.
3) Run full verification stack exactly from queue rows.
4) Update TASK_QUEUE.md, MASTER_PLAN.md, and INDEX.md with final evidence.
5) Stop only when docs are synchronized and closeout checklist is complete.
```
