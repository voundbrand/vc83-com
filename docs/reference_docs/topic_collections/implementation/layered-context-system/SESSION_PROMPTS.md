# Layered Context System Session Prompts

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/layered-context-system`

Read first:

- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/layered-context-system/TASK_QUEUE.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/layered-context-system/MASTER_PLAN.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/layered-context-system/INDEX.md`

Execution policy:

1. Respect dependency gates and deterministic row order from `TASK_QUEUE.md`.
2. Keep implementation anchored to current runtime architecture (`ai.chat.sendMessage` -> `ai.agentExecution.processInboundMessage`).
3. Update row status and notes only after listed verify commands pass.
4. Keep scope limited to Layered Context; do not broaden to unrelated chat/layers refactors.

Progress snapshot (2026-03-09):

- Completed: `LCS-A-001` (`DONE`).
- Completed: `LCS-A-002` (`DONE`).
- Completed: `LCS-A-003` (`DONE`).
- Completed: `LCS-B-001` (`DONE`).
- Completed: `LCS-B-002` (`DONE`).
- Completed: `LCS-B-003` (`DONE`).
- Completed: `LCS-B-004` (`DONE`).
- Completed: `LCS-C-001` (`DONE`).
- Completed: `LCS-D-001` (`DONE`).
- Completed: `LCS-C-002` (`DONE`).
- Completed: `LCS-D-002` (`DONE`).
- Re-verified: `LCS-D-002` (`DONE`) with 2026-03-09 command evidence (`typecheck`, `convex-ts`, `unit-context-bundle`, `docs` all passing).
- Completed: `LCS-D-003` (`DONE`).
- Completed: `LCS-D-004` (`DONE`).
- Completed: `LCS-E-001` (`DONE`).
- Next READY-first row: `(none)`.
- Evidence captured for `LCS-A-001`:
  - `npm run typecheck` (`EXIT_CODE=0`)
  - `npx tsc -p convex/tsconfig.json --noEmit` (`EXIT_CODE=0`)
  - `npm run docs:guard` (`Docs guard passed.`)

---

## Session A (Lane A: schema + type contracts)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane A rows from TASK_QUEUE.md.

Scope:
- LCS-A-001
- LCS-A-002
- LCS-A-003

Rules:
1) Land conversation/workflow contract changes before UI or runtime behavior.
2) Keep layer binding optional and backward compatible.
3) Add deterministic type contracts for layered context bundle shape.
4) Run Verify commands exactly as listed per row.
```

---

## Session B (Lane B: Layers node + singleton)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane B rows from TASK_QUEUE.md.

Scope:
- LCS-B-001 .. LCS-B-006

Rules:
1) Introduce lc_ai_chat as a dedicated context node contract.
2) Enforce singleton on frontend placement, duplicate/import flows, and backend save validation.
3) Keep tool chest and node visuals explicit about singleton/context semantics.
4) Update Layers AI builder prompt/catalog with max-one rule.
5) Run Verify commands exactly as listed per row.
```

---

## Session C (Lane C: Chat context UX)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane C rows from TASK_QUEUE.md.

Scope:
- LCS-C-001 .. LCS-C-003

Rules:
1) Add activeLayerWorkflowId session state with localStorage persistence.
2) Build a searchable layered-context panel and keep context-switch behavior deterministic (always new conversation).
3) Surface active context and history workflow tags without regressing current drawers.
4) Reuse existing conversation-history interaction patterns.
5) Run Verify commands exactly as listed per row.
```

---

## Session D (Lane D: Bundle + runtime prompt injection)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane D rows from TASK_QUEUE.md.

Scope:
- LCS-D-001 .. LCS-D-004

Rules:
1) Add dedicated context switcher query and layered bundle query.
2) Implement layered prompt builder with Tier 1/Tier 2 sections.
3) Inject layered context in agent runtime system-message assembly, not deprecated fallback prompt path.
4) Ensure send payload propagates layerWorkflowId end-to-end.
5) Run Verify commands exactly as listed per row.
```

---

## Session E (Lane E: Action rail integration)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane E rows from TASK_QUEUE.md.

Scope:
- LCS-E-001
- LCS-E-002

Rules:
1) Add executeLayeredContextAction with strict target-node and route validation.
2) Route approvals through existing pending_approval + ToolExecutionPanel pipeline.
3) Post execution outcomes back into conversation history deterministically.
4) Keep fail-closed behavior for unauthorized/unapproved actions.
5) Run Verify commands exactly as listed per row.
```

---

## Session F (Lane F: Validation + closeout)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane F rows from TASK_QUEUE.md.

Scope:
- LCS-F-001
- LCS-F-002

Rules:
1) Add integration coverage for Tier 1/Tier 2 context behavior and action approval loop.
2) Capture verification evidence in queue row notes before marking DONE.
3) Keep INDEX/MASTER_PLAN/TASK_QUEUE/SESSION_PROMPTS synchronized.
4) Run docs guard before closeout.
5) Run Verify commands exactly as listed per row.
```
