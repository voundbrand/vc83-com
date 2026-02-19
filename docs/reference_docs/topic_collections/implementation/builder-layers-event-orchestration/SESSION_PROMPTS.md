# Builder/Layers Orchestration Core + Event Playbook Session Prompts

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/builder-layers-event-orchestration`

Use one prompt per lane/worktree.

Always read first:

- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/builder-layers-event-orchestration/TASK_QUEUE.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/builder-layers-event-orchestration/MASTER_PLAN.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/builder-layers-event-orchestration/INDEX.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/voice-agent-co-creation/MASTER_PLAN.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-trust-experience/MASTER_PLAN.md`

---

## Session A (Lane A: baseline lock)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane A tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/builder-layers-event-orchestration/TASK_QUEUE.md

Scope:
- OCO-001

Rules:
1) Produce evidence-backed findings with concrete file references.
2) Capture blockers as contract deltas, not vague risks.
3) Run Verify commands exactly as listed in the queue row.
4) Update TASK_QUEUE.md and MASTER_PLAN.md before closeout.

Stop when Lane A has no promotable tasks.
```

---

## Session B (Lane B: toolchain + contract alignment)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane B tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/builder-layers-event-orchestration/TASK_QUEUE.md

Scope:
- OCO-002..OCO-005

Rules:
1) Confirm OCO-001 is DONE before coding.
2) Lock orchestration-core + playbook contract semantics before wiring new tools.
3) Register tools and scoping together in one coherent pass.
4) Run queue Verify commands exactly.
5) Preserve backward compatibility for legacy tools where explicitly required.

Stop when Lane B has no promotable tasks.
```

---

## Session C (Lane C: one-shot orchestration)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane C tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/builder-layers-event-orchestration/TASK_QUEUE.md

Scope:
- OCO-006..OCO-007

Rules:
1) Confirm OCO-003 and OCO-005 are DONE before starting.
2) Implement core runtime first, then event playbook adapter on top.
3) Keep orchestration idempotent and duplicate-safe.
4) Run queue Verify commands exactly.
5) Record step-level failure/retry semantics in notes.

Stop when Lane C has no promotable tasks.
```

---

## Session D (Lane D: seed agents + clone factory)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane D tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/builder-layers-event-orchestration/TASK_QUEUE.md

Scope:
- OCO-008..OCO-009

Rules:
1) Reuse current template-agent and worker-pool mechanics.
2) Do not introduce unmanaged clone lifecycles.
3) Enforce permissions, quotas, and audit traces for clone spawning.
4) Run queue Verify commands exactly.
5) Keep `protected` template behavior intact.

Stop when Lane D has no promotable tasks.
```

---

## Session E (Lane E: Soul v2 learning)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane E tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/builder-layers-event-orchestration/TASK_QUEUE.md

Scope:
- OCO-010..OCO-011

Rules:
1) Keep Soul v1 compatibility while introducing Soul v2 overlays.
2) Never bypass explicit owner approval for applied updates.
3) Separate immutable identity anchors from mutable execution preferences.
4) Run queue Verify commands exactly.
5) Add rollback/versioning coverage for any schema changes.

Stop when Lane E has no promotable tasks.
```

---

## Session F (Lane F: UX integration)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane F tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/builder-layers-event-orchestration/TASK_QUEUE.md

Scope:
- OCO-012

Rules:
1) Confirm OCO-006 and OCO-009 are DONE before starting.
2) Build one clear “conversation -> launch” flow with playbook selection (default: event).
3) Keep existing design language and responsive behavior.
4) Run queue Verify commands exactly.
5) Include explicit publish/payment confirmation checkpoints in UI.

Stop when Lane F has no promotable tasks.
```

---

## Session G (Lane G: tests + closeout)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane G tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/builder-layers-event-orchestration/TASK_QUEUE.md

Scope:
- OCO-013..OCO-014

Rules:
1) Start only after all P0 rows in lanes B-F are DONE or BLOCKED.
2) Add smoke coverage for full conversation-to-publish path.
3) Run Verify commands exactly as listed in queue rows.
4) Sync INDEX.md, MASTER_PLAN.md, and TASK_QUEUE.md during closeout.
5) Run docs guard and resolve violations before marking DONE.

Stop when lane closeout is complete.
```
