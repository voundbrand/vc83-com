# Trigger + Common Ground Agentic Convergence Session Prompts

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/trigger-common-ground-agentic-convergence`

Use one prompt per lane/worktree.

Always read first:

- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/trigger-common-ground-agentic-convergence/TASK_QUEUE.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/trigger-common-ground-agentic-convergence/MASTER_PLAN.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/trigger-common-ground-agentic-convergence/INDEX.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/trigger-common-ground-agentic-convergence/TRIGGER_COMMON_GROUND_CONVERGENCE_IMPLEMENTATION.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/trigger-common-ground-agentic-convergence/COLLABORATION_TEAM_RUNTIME_IMPLEMENTATION_PLAN.md`
- `/Users/foundbrand_001/Development/vc83-com/convex/ai/agentExecution.ts`
- `/Users/foundbrand_001/Development/vc83-com/convex/ai/agentSessions.ts`
- `/Users/foundbrand_001/Development/vc83-com/convex/schemas/agentSessionSchemas.ts`
- `/Users/foundbrand_001/Development/vc83-com/convex/schemas/aiSchemas.ts`
- `/Users/foundbrand_001/Development/vc83-com/convex/channels/webhooks.ts`
- `/Users/foundbrand_001/Development/vc83-com/convex/channels/router.ts`

---

## Concurrency and lane gating

1. Execute lanes in dependency order from queue rows.
2. Maximum one `IN_PROGRESS` task globally in this workstream.
3. Do not start lanes `B`..`E` before dependency gates are satisfied.
4. Keep convergence first-party and contract-driven; no vendor code copy.
5. Collaboration extension tasks (`TCG-014`..`TCG-017`) must preserve fail-closed lineage/thread/authority semantics.

---

## Milestone status (2026-02-23)

1. Lane `A` tasks `TCG-001` and `TCG-002` are complete.
2. Lane `B` scope (`TCG-003`, `TCG-004`, `TCG-014`) is complete with verification evidence attached in queue notes.
3. Lane `C` scoped rows (`TCG-005`..`TCG-008`, `TCG-015`, `TCG-017`) are complete with verification evidence attached in queue notes.
4. Lane `D` scope (`TCG-009`, `TCG-010`, `TCG-016`) is complete with release-gate evidence contracts documented.
5. Lane `E` closeout scope (`TCG-011`, `TCG-012`) is complete with migration/backfill + rollback playbooks and queue artifact synchronization.
6. No promotable tasks remain in this queue; default execution is monitoring + rollback-readiness cadence.

---

## Session A (Lane A: contract freeze and mapping)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane A tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/trigger-common-ground-agentic-convergence/TASK_QUEUE.md

Scope:
- TCG-001..TCG-002

Rules:
1) Before each task, list top 3 contract-regression risks.
2) Freeze kernel vs execution boundaries before runtime implementation tasks.
3) Map each adopted concept to existing concrete runtime files.
4) Keep output deterministic, typed, and evidence-backed.
5) Run Verify commands exactly from queue rows.

Stop when lane A has no promotable tasks.
```

---

## Session B (Lane B: kernel/runtime contracts)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane B tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/trigger-common-ground-agentic-convergence/TASK_QUEUE.md

Scope:
- TCG-003..TCG-004, TCG-014

Rules:
1) Confirm TCG-001 is DONE before starting.
2) Before each task, list top 3 kernel-invariant regression risks.
3) Preserve turn lifecycle replay compatibility.
4) Waitpoint/HITL tokens must fail closed on expiry or mismatch.
5) For collaboration contract updates, enforce typed `group_thread` + `dm_thread` + shared `lineageId` and explicit orchestrator commit authority.
6) Run Verify commands exactly from queue rows.

Stop when lane B has no promotable tasks.
```

---

## Session C (Lane C: execution runtime enhancements)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane C tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/trigger-common-ground-agentic-convergence/TASK_QUEUE.md

Scope:
- TCG-005..TCG-008, TCG-015, TCG-017

Rules:
1) Confirm lane B P0 tasks are DONE before starting.
2) Before each task, list top 3 execution-runtime regression risks.
3) Implement queue/concurrency and idempotency as deterministic typed contracts.
4) Keep runtime changes backward-compatible for existing org-level behavior.
5) Treat collaboration concurrency/idempotency as lineage-aware (`tenant + lineage + thread + workflow`) and enforce deterministic conflict labels.
6) Run Verify commands exactly from queue rows.

Stop when lane C has no promotable tasks.
```

---

## Session D (Lane D: operator observability and gate wiring)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane D tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/trigger-common-ground-agentic-convergence/TASK_QUEUE.md

Scope:
- TCG-009..TCG-010, TCG-016

Rules:
1) Confirm lane C P0 tasks are DONE before starting.
2) Before each task, list top 3 operator-observability regression risks.
3) Preserve role-scoped data visibility (org owner vs super admin).
4) Release gate evidence must be deterministic and auditable.
5) Ensure group/DM/handoff/proposal/commit timeline entries carry shared lineage/thread/correlation IDs with stable ordering.
6) Run Verify commands exactly from queue rows.

Stop when lane D has no promotable tasks.
```

---

## Session E (Lane E: migration and closeout)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane E tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/trigger-common-ground-agentic-convergence/TASK_QUEUE.md

Scope:
- TCG-011..TCG-012

Rules:
1) Confirm all prior P0 tasks are DONE or BLOCKED before TCG-011.
2) Before each task, list top 3 rollout/rollback regression risks.
3) Publish migration/backfill and rollback playbooks before broad rollout.
4) Sync INDEX.md, MASTER_PLAN.md, TASK_QUEUE.md, and SESSION_PROMPTS.md.
5) Run docs guard and resolve violations before completion.

Stop when lane E closeout is complete.
```
