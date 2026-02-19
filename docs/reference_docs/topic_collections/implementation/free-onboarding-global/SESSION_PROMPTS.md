# Free Onboarding Global Session Prompts

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/free-onboarding-global`

Use one prompt per lane/worktree.

Always read first:

- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/free-onboarding-global/TASK_QUEUE.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/free-onboarding-global/MASTER_PLAN.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/free-onboarding-global/INDEX.md`

---

## Session A (Lane A: channel contract and runtime parity)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane A tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/free-onboarding-global/TASK_QUEUE.md

Scope:
- FOG-001..FOG-003

Rules:
1) Before each task, list top 3 regression risks.
2) Run Verify commands exactly as listed in queue rows.
3) Preserve existing Telegram onboarding behavior while fixing channel parity.
4) Keep auth-protected desktop/product actions unchanged in this lane.
5) Update TASK_QUEUE.md status and notes after each completed task.

Stop when Lane A has no promotable tasks.
```

---

## Session B (Lane B: identity claim and linking)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane B tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/free-onboarding-global/TASK_QUEUE.md

Scope:
- FOG-004..FOG-005

Rules:
1) Confirm FOG-002 is DONE before starting FOG-004.
2) Before each task, list top 3 regression risks.
3) Run queue Verify commands exactly.
4) Ensure claim/link operations are idempotent and auditable.
5) Do not redesign chat widgets/desktop UI in this lane.

Stop when Lane B has no promotable tasks.
```

---

## Session C (Lane C: onboarding conversion tools)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane C tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/free-onboarding-global/TASK_QUEUE.md

Scope:
- FOG-006..FOG-007

Rules:
1) Confirm FOG-002 is DONE before FOG-006.
2) Before each task, list top 3 regression risks.
3) Run Verify commands exactly from queue rows.
4) Keep tool outputs channel-safe (Telegram, webchat, native guest).
5) Preserve one-question-at-a-time onboarding interaction quality.

Stop when Lane C has no promotable tasks.
```

---

## Session D (Lane D: native and web conversion UX)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane D tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/free-onboarding-global/TASK_QUEUE.md

Scope:
- FOG-008..FOG-009

Rules:
1) Confirm FOG-003 and FOG-004 are DONE before FOG-008.
2) Before each task, list top 3 regression risks.
3) Run Verify commands exactly from queue rows.
4) Keep signed-in AI Assistant behavior stable while adding guest mode.
5) Reuse existing billing/store flows instead of adding parallel checkout logic.

Stop when Lane D has no promotable tasks.
```

---

## Session E (Lane E: abuse controls and analytics)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane E tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/free-onboarding-global/TASK_QUEUE.md

Scope:
- FOG-010..FOG-011

Rules:
1) Confirm FOG-003 is DONE before FOG-010.
2) Before each task, list top 3 regression risks.
3) Run Verify commands exactly from queue rows.
4) Prioritize abuse mitigation without degrading legitimate onboarding conversion.
5) Emit deterministic funnel events with channel attribution.

Stop when Lane E has no promotable tasks.
```

---

## Session F (Lane F: hardening and release closeout)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane F tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/free-onboarding-global/TASK_QUEUE.md

Scope:
- FOG-012

Rules:
1) Confirm all P0 tasks are DONE or BLOCKED before starting.
2) Before the task, list top 3 regression risks.
3) Run Verify commands exactly from the queue row.
4) Update TASK_QUEUE.md, MASTER_PLAN.md, and INDEX.md with final status.
5) Run docs guard before closeout and resolve any docs violations.

Stop when lane F closeout is complete.
```
