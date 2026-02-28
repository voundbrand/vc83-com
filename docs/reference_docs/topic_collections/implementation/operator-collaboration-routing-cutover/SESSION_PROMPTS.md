# Operator Collaboration Routing Cutover Session Prompts

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/operator-collaboration-routing-cutover`

Use one prompt per lane/worktree.

Always read first:

- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/operator-collaboration-routing-cutover/TASK_QUEUE.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/operator-collaboration-routing-cutover/MASTER_PLAN.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/operator-collaboration-routing-cutover/INDEX.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/trigger-common-ground-agentic-convergence/TASK_QUEUE.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/trigger-common-ground-agentic-convergence/COLLABORATION_TEAM_RUNTIME_IMPLEMENTATION_PLAN.md`
- `/Users/foundbrand_001/Development/vc83-com/convex/agentOntology.ts`
- `/Users/foundbrand_001/Development/vc83-com/convex/ai/chat.ts`
- `/Users/foundbrand_001/Development/vc83-com/convex/ai/teamHarness.ts`
- `/Users/foundbrand_001/Development/vc83-com/convex/ai/tools/teamTools.ts`
- `/Users/foundbrand_001/Development/vc83-com/convex/channels/router.ts`

---

## Concurrency and lane gating

1. Execute lanes in dependency order from queue rows.
2. Maximum one `IN_PROGRESS` task globally in this workstream.
3. Do not start lane `B` implementation tasks until required upstream TCG dependency rows are `DONE`.
4. Preserve orchestrator-first routing and fail-closed behavior; no silent fallback to legacy chat.
5. Keep specialist actions proposal-only in operator UX actions; commit paths stay orchestrator-authorized.

Lane milestone status (2026-02-24):

- Lanes `A` through `E` are complete through `OCC-013`.
- No promotable rows remain in this queue; run only monitoring/docs-refresh follow-ups when a new row is explicitly added.

---

## OCC-003 contract freeze anchors

1. Enforce `OCC-UX-01`..`OCC-UX-08` from `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/operator-collaboration-routing-cutover/MASTER_PLAN.md`.
2. Keep boundaries explicit: TCG owns runtime contract semantics; OCC owns product-surface UX/routing behavior.
3. Any row requiring runtime semantic changes outside queued TCG dependencies must be marked `BLOCKED` with a dependency note.
4. DM-to-group summary sync UX must map invalid checkpoint/token outcomes to deterministic blocked UX states.
5. Never introduce specialist commit-path affordances in DM surfaces.

---

## Session A (Lane A: baseline and contract freeze)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane A tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/operator-collaboration-routing-cutover/TASK_QUEUE.md

Scope:
- OCC-001..OCC-003

Rules:
1) Before each task, list top 3 integration-routing or operator-UX regression risks.
2) Confirm split boundaries remain clear: runtime kernel semantics in TCG, product surfaces in OCC.
3) Run Verify commands exactly from queue rows.
4) Keep dependency notes explicit for any TCG-gated rows.

Stop when lane A has no promotable tasks.
```

---

## Session B (Lane B: routing/session cutover)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane B tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/operator-collaboration-routing-cutover/TASK_QUEUE.md

Scope:
- OCC-004..OCC-006

Rules:
1) Confirm OCC-002 is DONE before starting.
2) Confirm required upstream TCG rows are DONE (`TCG-014`, `TCG-015`, `TCG-017`) before each dependent row.
3) Before each task, list top 3 integration-routing regression risks.
4) Enforce fail-closed orchestrator-first routing; no legacy fallback path.
5) Preserve `OCC-UX-01`..`OCC-UX-08` without widening specialist authority.
6) Run Verify commands exactly from queue rows.

Stop when lane B has no promotable tasks.
```

---

## Session C (Lane C: operator collaboration UX)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane C tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/operator-collaboration-routing-cutover/TASK_QUEUE.md

Scope:
- OCC-007..OCC-009

Rules:
1) Confirm lane B P0 tasks are DONE before starting.
2) Confirm upstream `TCG-016` is DONE before timeline/correlation UI tasks.
3) Before each task, list top 3 operator-UX regression risks.
4) Keep group+DM actions role-scoped and deterministic per `OCC-UX-01`..`OCC-UX-08`.
5) Keep DM visibility scoped to operator + orchestrator + addressed specialist unless explicitly changed by queue row.
6) Run Verify commands exactly from queue rows.

Stop when lane C has no promotable tasks.
```

---

## Session D (Lane D: deprecation + configuration)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane D tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/operator-collaboration-routing-cutover/TASK_QUEUE.md

Scope:
- OCC-010..OCC-012

Rules:
1) Confirm OCC-007 and upstream `TCG-017` are DONE before starting dependent rows.
2) Before each task, list top 3 cutover or operator-support regression risks.
3) Keep feature-flag rollback path explicit and tested.
4) Enforce role gates for platform-managed channel binding overrides.
5) Run Verify commands exactly from queue rows.

Stop when lane D has no promotable tasks.
```

---

## Session E (Lane E: closeout)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane E tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/operator-collaboration-routing-cutover/TASK_QUEUE.md

Scope:
- OCC-013

Rules:
1) Confirm all prior P0 tasks are DONE or BLOCKED before closeout.
2) Before each task, list top 3 rollout/rollback verification risks.
3) Run full verification profile exactly from queue row.
4) Sync INDEX.md, MASTER_PLAN.md, TASK_QUEUE.md, and SESSION_PROMPTS.md.
5) Run docs guard and resolve violations before completion.

Stop when lane E closeout is complete.
```
