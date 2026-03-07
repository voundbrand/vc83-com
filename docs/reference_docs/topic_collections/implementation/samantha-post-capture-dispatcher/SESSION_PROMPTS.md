# Samantha Post-Capture Dispatcher Session Prompts

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/samantha-post-capture-dispatcher`

Always read first:

- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/samantha-post-capture-dispatcher/TASK_QUEUE.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/samantha-post-capture-dispatcher/MASTER_PLAN.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/samantha-post-capture-dispatcher/INDEX.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/samantha-post-capture-dispatcher/SPD_016_DISPATCHER_HARDENING_ROLLOUT_RUNBOOK.md`

---

## Concurrency and gating

1. Lane `A` must finish before lane `B` starts.
2. Lane `B` must finish before lane `C` starts.
3. Lane `C` must finish before lane `D` starts.
4. Lane `D` must finish before lane `E` starts.
5. Keep exactly one active `IN_PROGRESS` row unless queue rules are updated explicitly.
6. Lane `F` (hardening follow-up) may run once dispatcher runtime/schema artifacts are present.
7. Lane `G` (focused rollout operations) starts after `SPD-015` and uses SPD-016 metrics/rollback gates without expanding scope beyond dispatcher controls.

---

## Session A (Lane A: contracts and baseline)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane A rows from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/samantha-post-capture-dispatcher/TASK_QUEUE.md

Scope:
- SPD-001
- SPD-002

Rules:
1) Enumerate all direct post-deliverable side effects currently in interviewTools.
2) Freeze canonical dispatcher contracts before moving behavior.
3) Lock deterministic failure reason enums and idempotency key rules.
4) Run verify commands exactly.

Stop when SPD-001 and SPD-002 are DONE.
```

---

## Session B (Lane B: dispatcher core + persistence)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane B rows from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/samantha-post-capture-dispatcher/TASK_QUEUE.md

Scope:
- SPD-003
- SPD-004
- SPD-005

Rules:
1) Build dispatcher execution ledger with idempotency-safe indexes before side-effect execution logic.
2) Implement fixed-order step runner: CRM -> campaign -> Slack -> optional email.
3) Keep retry semantics deterministic and replay-safe.
4) Preserve org-scoped access checks for every write.
5) Run verify commands exactly.

Stop when lane B rows are DONE.
```

---

## Session C (Lane C: Samantha cutover + policy gates)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane C rows from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/samantha-post-capture-dispatcher/TASK_QUEUE.md

Scope:
- SPD-006
- SPD-007

Rules:
1) Add approval gate and env-toggle policy enforcement in dispatcher runtime.
2) Remove direct multichannel orchestration from generate_audit_workflow_deliverable.
3) Keep Samantha prompt updates minimal and dispatcher-focused.
4) Do not broaden behavior changes outside post-capture dispatch.
5) Run verify commands exactly.

Stop when lane C rows are DONE.
```

---

## Session D (Lane D: telemetry and observability)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane D rows from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/samantha-post-capture-dispatcher/TASK_QUEUE.md

Scope:
- SPD-008

Rules:
1) Emit correlation-ID structured logs for dispatcher start/step/result.
2) Attach dispatcher per-step status summary to action-completion telemetry.
3) Ensure deterministic reason-code propagation across logs, DB rows, and tool outputs.
4) Run verify commands exactly.

Stop when SPD-008 is DONE.
```

---

## Session E (Lane E: tests, regression, closeout)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane E rows from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/samantha-post-capture-dispatcher/TASK_QUEUE.md

Scope:
- SPD-009
- SPD-010
- SPD-011

Rules:
1) Add dispatcher unit tests for contract/routing/idempotency and policy gates.
2) Add end-to-end integration test for post-capture dispatcher flow.
3) Re-run existing Samantha audit deliverable regressions and keep them green.
4) Publish rollout/rollback/runbook notes and unresolved follow-up queue.
5) Run verify commands exactly.

Stop when lane E closeout is complete.
```

---

## Session F (Lane F: hardening follow-up)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane F rows from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/samantha-post-capture-dispatcher/TASK_QUEUE.md

Scope:
- SPD-012
- SPD-013
- SPD-014
- SPD-015

Rules:
1) Enforce explicit org-scoped Slack OAuth workspace/channel routing for dispatcher sends.
2) Keep retry execution queue-backed with leased attempts and deterministic exponential backoff.
3) Persist dead-letter terminal failures with replay workflow and audit trail events.
4) Preserve Samantha output contracts while routing side effects through dispatcher handoff.
5) Run verify commands exactly and sync queue docs before completion.

Stop when Lane F rows are DONE and verification logs are recorded.
```

---

## Session G (Lane G: focused rollout operations)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane G rows from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/samantha-post-capture-dispatcher/TASK_QUEUE.md

Scope:
- SPD-018 (closeout reference; row is `DONE`)

Rules:
1) Treat SPD-016 and SPD-017 as fixed historical evidence and do not rewrite rollout outcomes.
2) Keep fail-closed Slack routing behavior intact; do not introduce fail-open fallback.
3) Preserve org-scoped trust boundaries for every routing hint and replay action.
4) Restrict this row to docs-first queue synchronization only (`TASK_QUEUE.md`, `INDEX.md`, `MASTER_PLAN.md`, `SESSION_PROMPTS.md`).
5) Document re-entry requirements for deferred `Ramp-50/Ramp-75/Full` progression, including explicit timestamped `GO/NO_GO` evidence before traffic expansion.
6) Do not change dispatcher runtime behavior or non-dispatcher scope.
7) Run `npm run docs:guard` before lane completion.
8) Lane `G` closeout note: `SPD-018` completed on 2026-03-06; no active lane-`G` row remains until staged rollout progression is explicitly resumed.

Stop when the docs re-entry gate is synchronized and verified.
```
