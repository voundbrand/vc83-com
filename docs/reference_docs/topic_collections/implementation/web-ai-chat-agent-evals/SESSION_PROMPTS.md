# Web AI Chat Agent Evals Session Prompts

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/web-ai-chat-agent-evals`

Read first:

- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/web-ai-chat-agent-evals/TASK_QUEUE.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/web-ai-chat-agent-evals/MASTER_PLAN.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/web-ai-chat-agent-evals/INDEX.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/web-ai-chat-agent-evals/EVAL_ORG_LIFECYCLE_CONTRACT.md`

Global execution rules:

1. Execute only rows from this queue.
2. Keep statuses limited to `READY`, `IN_PROGRESS`, `PENDING`, `BLOCKED`, `DONE`.
3. Respect deterministic dependency and priority order.
4. Run each row's `Verify` commands before marking `DONE`.
5. Keep scope centered on seeded-agent evals, tool-usage validation, rollout gating, and improvement loop controls.
6. Keep `INDEX.md`, `MASTER_PLAN.md`, `TASK_QUEUE.md`, and this file synchronized.
7. Keep row size `1-2h`; split work if it grows beyond that bound.
8. For eval-org setup/cleanup, follow `EVAL_ORG_LIFECYCLE_CONTRACT.md` exactly; fail closed on pin drift or missing lifecycle evidence.

Current lane snapshot (`2026-03-13`): Lane `B` has `WAE-101`, `WAE-102`, `WAE-103`, and `WAE-104` `DONE`; lane `C` has `WAE-201`, `WAE-202`, `WAE-203`, and `WAE-204` `DONE`; lane `D` has `WAE-301`, `WAE-302`, `WAE-303`, and `WAE-304` `DONE`; lane `E` has `WAE-401`, `WAE-402`, and `WAE-403` `DONE`, and `WAE-404` `READY`.

## Session A (Lane A: contracts + agent behavioral specs + seed matrix)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane A rows from TASK_QUEUE.md.

Scope:
- WAE-001, WAE-002a, WAE-002b, WAE-002c, WAE-003

Rules:
1) Freeze deterministic eval contracts before code expansion.
2) For WAE-002a: capture per-agent behavioral eval specs through product
   conversations. Scope is the 3 canonical agents plus Samantha warm-route
   compatibility coverage: Quinn, One-of-One Operator, Samantha Lead Capture,
   Samantha Warm Route Compatibility Alias.
3) For WAE-002b: codify behavioral specs into deterministic eval scenario matrix.
   Mark scenarios that depend on unbuilt features as PENDING_FEATURE with links
   to their implementation plans (including architecture-decoupling dependencies).
4) For WAE-002c: remove the 5 decommissioned orchestration/event template agents
   from seed/docs references and verify no runtime role links remain.
5) Define replay-safe Playwright org lifecycle (create/reset/teardown).
6) Keep outputs docs-first and docs-CI clean.
7) Run Verify commands exactly as listed.
8) Keep lifecycle contract implementation-ready for `WAE-201`/`WAE-202` fixture and DSL work.
```

## Session B (Lane B: eval data plane)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane B rows from TASK_QUEUE.md.

Scope:
- WAE-101..WAE-104

Rules:
1) Start only after lane A closes.
2) Persist eval envelope data without breaking existing runtime contracts.
3) Enforce strict org-scoped retrieval and deterministic reason codes.
4) Consume lifecycle evidence contracts from `EVAL_ORG_LIFECYCLE_CONTRACT.md` (pin manifest + create/reset/teardown receipts).
5) Add tests for replayability and tool-accounting integrity.
6) Run Verify commands exactly as listed.
```

## Session C (Lane C: Playwright execution)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane C rows from TASK_QUEUE.md.

Scope:
- WAE-201..WAE-204

Rules:
1) Start only after lane B closes.
2) Use seeded-agent matrix to generate deterministic scenario coverage.
3) Implement deterministic eval-org create/reset/teardown fixture flow from `EVAL_ORG_LIFECYCLE_CONTRACT.md`.
4) Validate required and forbidden tool usage in web AI chat flows.
5) Emit stable artifacts for downstream scoring and diffing.
6) Run Verify commands exactly as listed.
```

## Session D (Lane D: scoring + promotion gates)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane D rows from TASK_QUEUE.md.

Scope:
- WAE-301..WAE-304

Rules:
1) Start only after lane C closes.
2) Keep scoring explainable and deterministic.
3) Fail rollout gates closed when evidence is missing, stale, mismatched, or critical reason-code budgets are breached.
4) Wire CI to publish clear go/no-go verdicts.
5) Run Verify commands exactly as listed.
```

## Session E (Lane E: recursive improvement loop)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane E rows from TASK_QUEUE.md.

Scope:
- WAE-401..WAE-404

Rules:
1) Start only after lane D closes.
2) Convert failures into actionable recommendation packets.
3) Require human approval for all production-impacting mutations.
4) Enforce canary baseline-vs-candidate evidence before promotion.
5) Run Verify commands exactly as listed.
6) Keep all queue docs synchronized before closeout.
```
