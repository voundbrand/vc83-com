# Multi-Provider BYOA Channel Runtime Session Prompts

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/multi-provider-byoa-channel-runtime`

Use one prompt per lane/worktree.

Always read first:

- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/multi-provider-byoa-channel-runtime/TASK_QUEUE.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/multi-provider-byoa-channel-runtime/MASTER_PLAN.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/multi-provider-byoa-channel-runtime/INDEX.md`

---

## Session A (Lane A: contract, schema, migration foundation)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane A tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/multi-provider-byoa-channel-runtime/TASK_QUEUE.md

Scope:
- MPB-002..MPB-003

Rules:
1) Before each task, list top 3 regression risks.
2) Run Verify commands exactly as listed in queue rows.
3) Keep schema changes migration-safe for existing org/provider bindings.
4) Do not start runtime security refactors until lane A P0 tasks are DONE.
5) Update TASK_QUEUE.md status and notes after each completed task.

Stop when Lane A has no promotable tasks.
```

---

## Session B (Lane B: provider ingress security)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane B tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/multi-provider-byoa-channel-runtime/TASK_QUEUE.md

Scope:
- MPB-004..MPB-006

Rules:
1) Confirm MPB-003 is DONE before starting lane B.
2) Before each task, list top 3 regression risks.
3) Enforce webhook verification at HTTP boundary before dispatch.
4) Remove no-op verification paths and implicit secret fallback behavior for BYOA installs.
5) Run Verify commands exactly from queue rows.

Stop when Lane B has no promotable tasks.
```

---

## Session C (Lane C: routing/runtime isolation)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane C tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/multi-provider-byoa-channel-runtime/TASK_QUEUE.md

Scope:
- MPB-007..MPB-009

Rules:
1) Confirm MPB-004, MPB-005, and MPB-006 are DONE before MPB-007.
2) Before each task, list top 3 regression risks.
3) Keep platform-owned app behavior explicit and isolated from org BYOA credentials.
4) Ensure session routing keys prevent multi-agent/persona collisions in shared channels.
5) Run Verify commands exactly from queue rows.

Stop when Lane C has no promotable tasks.
```

---

## Session D (Lane D: setup UX and onboarding docs)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane D tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/multi-provider-byoa-channel-runtime/TASK_QUEUE.md

Scope:
- MPB-010..MPB-011

Rules:
1) Confirm MPB-007 is DONE before starting lane D.
2) Before each task, list top 3 regression risks.
3) Optimize for painless org-owner and agency setup flows.
4) Keep provider setup steps concrete (manifest fields, callback URLs, scope lists, cutover checklist).
5) Run Verify commands exactly from queue rows.

Stop when Lane D has no promotable tasks.
```

---

## Session E (Lane E: migration, rollout, closeout)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane E tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/multi-provider-byoa-channel-runtime/TASK_QUEUE.md

Scope:
- MPB-012..MPB-014

Rules:
1) Confirm all P0 tasks are DONE or BLOCKED before starting lane E.
2) Before each task, list top 3 regression risks.
3) Require canary-first rollout with explicit rollback commands.
4) Promote stages only when security failure-path matrix is green.
5) Update TASK_QUEUE.md, MASTER_PLAN.md, and INDEX.md before finalizing.
6) Run docs guard before closeout.

Stop when lane E closeout is complete.
```
