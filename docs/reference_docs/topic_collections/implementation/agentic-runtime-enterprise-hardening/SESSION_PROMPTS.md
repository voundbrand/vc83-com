# Agentic Runtime Enterprise Hardening Session Prompts

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agentic-runtime-enterprise-hardening`

---

## Lane gating + concurrency rules

1. Global max concurrency: one active task per lane, maximum three lanes active at once.
2. Lane `A` must start first and produce first measurable latency win before broad lane fan-out.
3. Lane `B` and lane `C` may run in parallel after `ARH-004` and `ARH-006` are done.
4. Lane `D` starts only after at least one queue/lease hardening task and one tool-cost hardening task are complete.
5. Lane `E` starts once lane `A` + one of `B/C/D` are producing telemetry-worthy changes.
6. Lane `F` CI automation can run continuously, but release-gate tasks require all blocking dependencies complete.

---

## Active lane prompts

### Lane A Prompt (Critical-path latency)
You are lane A execution agent. Implement only the queued task scope for critical-path latency reduction in session/history/idempotency hot paths. Preserve runtime semantics, add focused tests for ordering and bounded retrieval behavior, and verify with `V-TYPE`, lane-specific unit tests, and `V-DOCS`.

### Lane B Prompt (Queue/lease hardening)
You are lane B execution agent. Implement deterministic queue/lease contention safeguards without changing model/tool semantics. Focus on bounded scans, conflict telemetry, and admission controls. Verify with integration + synthetic load profiles and `V-DOCS`.

### Lane C Prompt (Tool efficiency + spend safety)
You are lane C execution agent. Improve tool execution and billing write efficiency while preserving approval/authority invariants. Implement batched tool deductions, then safe read-only parallelism and governor tool-budget extensions. Verify with `V-USAGE-GUARD`, targeted unit tests, and load smoke.

### Lane D Prompt (LLM resilience)
You are lane D execution agent. Implement provider-failure containment and retry/failover resilience. Add circuit breakers, retry budgets, and graceful degradation contracts behind flags when needed. Verify with integration tests, typecheck, and docs guard.

### Lane E Prompt (Observability + SLO)
You are lane E execution agent. Add stage-level latency, contention, and governor effectiveness telemetry plus trace correlation and alert-ready metrics. No business-logic behavior changes beyond instrumentation unless explicitly queued. Verify with synthetic load and docs guard.

### Lane F Prompt (CI + release hardening)
You are lane F execution agent. Convert perf + reliability checks into CI enforcement with stable artifacts, threshold gates, and deterministic rollback criteria. Ensure all queued verification profiles are wired and reproducible.

---

## Task handoff template

Use this handoff block for every completed task:

- `Task:` `<ID>`
- `Status:` `DONE`
- `Summary:` one paragraph, behavior impact first.
- `Files changed:` absolute paths.
- `Verification run:` exact commands + pass/fail.
- `Follow-ups:` next task IDs unblocked.
