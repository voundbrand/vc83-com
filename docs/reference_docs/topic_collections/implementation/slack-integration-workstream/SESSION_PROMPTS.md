# Slack Integration Workstream Session Prompts

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/slack-integration-workstream`

Use one prompt per lane/worktree.

Always read first:

- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/slack-integration-workstream/TASK_QUEUE.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/slack-integration-workstream/MASTER_PLAN.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/slack-integration-workstream/INDEX.md`

---

## Session A (Lane A: scope, contracts, and config)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane A tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/slack-integration-workstream/TASK_QUEUE.md

Scope:
- SLI-001..SLI-002

Rules:
1) Before each task, list top 3 regression risks.
2) Run Verify commands exactly as listed in queue rows.
3) Freeze v1 scope and non-goals before implementation lanes start.
4) Keep queue, master plan, and index synchronized after each completion.
5) Do not start lane B/C work until SLI-002 is DONE.

Stop when Lane A has no promotable tasks.
```

---

## Session B (Lane B: OAuth lifecycle and integrations UI)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane B tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/slack-integration-workstream/TASK_QUEUE.md

Scope:
- SLI-003..SLI-004

Rules:
1) Confirm SLI-002 is DONE before starting SLI-003.
2) Before each task, list top 3 regression risks.
3) Reuse existing OAuth connection patterns (Google/GitHub/Microsoft) where possible.
4) Run queue Verify commands exactly.
5) Do not edit channel runtime behavior in this lane.

Stop when Lane B has no promotable tasks.
```

---

## Session C (Lane C: provider runtime, inbound events, outbound send)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane C tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/slack-integration-workstream/TASK_QUEUE.md

Scope:
- SLI-005..SLI-007

Rules:
1) Confirm SLI-002 is DONE before SLI-005.
2) Before each task, list top 3 regression risks.
3) Enforce signature verification and retry-safe idempotency on inbound events.
4) Keep Slack behavior inside provider abstraction, not ad-hoc code paths.
5) Run Verify commands exactly from queue rows.

Stop when Lane C has no promotable tasks.
```

---

## Session D (Lane D: mention/slash command behavior)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane D tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/slack-integration-workstream/TASK_QUEUE.md

Scope:
- SLI-008

Rules:
1) Confirm SLI-004 and SLI-007 are DONE before starting.
2) Before the task, list top 3 regression risks.
3) Keep response formatting deterministic for thread vs channel replies.
4) Run queue Verify commands exactly.
5) Do not change schema contracts in this lane.

Stop when Lane D has no promotable tasks.
```

---

## Session E (Lane E: security hardening and test expansion)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane E tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/slack-integration-workstream/TASK_QUEUE.md

Scope:
- SLI-009..SLI-010

Rules:
1) Confirm SLI-006 is DONE before SLI-009.
2) Before each task, list top 3 regression risks.
3) Prioritize failure-path tests and abuse-path tests, not only happy paths.
4) Run Verify commands exactly from queue rows.
5) Keep rollout disabled by default until lane F closeout.

Stop when Lane E has no promotable tasks.
```

---

## Session F (Lane F: rollout and closeout)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane F tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/slack-integration-workstream/TASK_QUEUE.md

Scope:
- SLI-011..SLI-012

Rules:
1) Confirm all P0 tasks are DONE or BLOCKED before starting lane F.
2) Before each task, list top 3 regression risks.
3) Run Verify commands exactly as listed in queue rows.
4) Update TASK_QUEUE.md, MASTER_PLAN.md, and INDEX.md in one closeout pass.
5) Run docs guard before finalizing and resolve any violations.
6) Keep runbook sections current in MASTER_PLAN.md:
   - Lane F operator runbook + user setup guide (`SLI-011`)
   - Lane F launch readiness closeout (`SLI-012`)

Stop when lane F closeout is complete.
```
