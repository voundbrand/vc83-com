# Platform Usage Accounting Guardrails Session Prompts

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/platform-usage-accounting-guardrails`

Use one prompt per lane/worktree.

Always read first:

- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/platform-usage-accounting-guardrails/TASK_QUEUE.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/platform-usage-accounting-guardrails/MASTER_PLAN.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/platform-usage-accounting-guardrails/INDEX.md`

---

## Concurrency and gating

1. Lane `A` must complete before lane `B` or lane `C` starts.
2. Lane `B` and lane `C` may run in parallel after lane `A` is `DONE`.
3. Lane `D` starts only after lane `B` and lane `C` `P0` rows are `DONE`.
4. Lane `E` starts only after lane `D` is `DONE`.

---

## Session A (Lane A: metering contract)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane A tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/platform-usage-accounting-guardrails/TASK_QUEUE.md

Scope:
- PUAG-002

Rules:
1) Freeze one canonical metering helper contract before editing callsites.
2) Keep existing credits + ai.billing.recordUsage as the single billing authority.
3) Preserve security boundaries (no key exposure, org-scoped writes, super-admin-only rollups).
4) Run queue verify commands exactly.

Stop when PUAG-002 is DONE.
```

---

## Session B (Lane B: uncovered OpenRouter/direct callsites)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane B tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/platform-usage-accounting-guardrails/TASK_QUEUE.md

Scope:
- PUAG-003

Rules:
1) Touch only uncovered runtime files listed in PUAG-003.
2) Every provider call must emit credits outcome + recordUsage telemetry.
3) Include provider/model/action, native units/cost, billingSource, org attribution.
4) Run queue verify commands exactly.

Stop when PUAG-003 is DONE.
```

---

## Session C (Lane C: v0 accounting)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane C tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/platform-usage-accounting-guardrails/TASK_QUEUE.md

Scope:
- PUAG-004

Rules:
1) Route v0 usage into the same credits and aiUsage ledger path.
2) Derive billing source from credential provenance (platform key vs org key).
3) Keep BYOK usage visible in analytics but excluded from platform margin.
4) Run queue verify commands exactly.

Stop when PUAG-004 is DONE.
```

---

## Session D (Lane D: CI guard + tests)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane D tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/platform-usage-accounting-guardrails/TASK_QUEUE.md

Scope:
- PUAG-005
- PUAG-006

Rules:
1) Create deterministic CI guard with allowlist and fail-fast output.
2) Add regression tests that prove metering coverage and economics correctness.
3) Do not weaken guard severity for convenience.
4) Run queue verify commands exactly.

Stop when PUAG-005 and PUAG-006 are DONE.
```

---

## Session E (Lane E: guard run + fix backlog)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane E tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/platform-usage-accounting-guardrails/TASK_QUEUE.md

Scope:
- PUAG-007
- PUAG-008

Rules:
1) Run guard after implementation and capture all violations in queue rows.
2) Produce a deterministic guard-fix plan from real guard output.
3) Close with full verification profile and docs sync.
4) Run queue verify commands exactly.

Stop when lane E closeout is complete.
```
