# Agentic Runtime Enterprise Hardening Task Queue

**Last updated:** 2026-02-27  
**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agentic-runtime-enterprise-hardening`  
**Source request:** Exhaustive implementation plan using CI for every improvement, ordered from highest-leverage low-hanging fruit through enterprise-grade production hardening.

---

## Queue rules

1. Allowed statuses are only: `READY`, `IN_PROGRESS`, `PENDING`, `BLOCKED`, `DONE`.
2. At most one task may be `IN_PROGRESS` globally unless lane concurrency rules explicitly allow one per lane.
3. Promotion from `PENDING` to `READY` is dependency-driven only (`Depends On` rows must be `DONE`).
4. Deterministic selection order: `Priority` (`P0` -> `P1` -> `P2`) then lexical `ID`.
5. Every code task must include CI-grade verification commands in `Verify`.
6. Every lane milestone completion requires `npm run docs:guard`.
7. No speculative refactors; each task must tie to measured bottlenecks, reliability risks, or observability gaps.
8. Runtime behavior changes must ship behind explicit runtime flags where blast radius is non-trivial.
9. Any failed CI command reclassifies task status to `BLOCKED` until root cause + fix row is captured.
10. Queue/docs sync is mandatory after each completed task (`TASK_QUEUE.md`, `SESSION_PROMPTS.md`, `INDEX.md`, `MASTER_PLAN.md`).

---

## Verification profiles

| Profile | Command |
|---|---|
| `V-TYPE` | `npm run typecheck` |
| `V-DOCS` | `npm run docs:guard` |
| `V-USAGE-GUARD` | `npm run ai:usage:guard` |
| `V-UNIT-GOV` | `npx vitest run tests/unit/ai/runtimeGovernor.test.ts` |
| `V-UNIT-TARGET` | `npx vitest run tests/unit/ai/agentExecutionComposerControls.test.ts tests/unit/ai/providerExecutionTelemetryCoverage.test.ts` |
| `V-INTEG-TARGET` | `npx vitest run tests/integration/ai/mobileRuntimeHardening.integration.test.ts tests/integration/ai/supportEscalationCriteria.integration.test.ts` |
| `V-LOAD-SYNTH` | `npx tsx scripts/perf/agenticRuntimeLoadAudit.ts` |
| `V-LOAD-SMOKE` | `PERF_SCENARIO_FILTER=10x5_tools npx tsx scripts/perf/agenticRuntimeLoadAudit.ts` |
| `V-CI-LOCAL-CORE` | `npm run typecheck && npm run ai:usage:guard && npm run docs:guard` |

---

## Execution lanes

| Lane | Purpose | Primary ownership | Merge-overlap policy |
|---|---|---|---|
| `A` | Critical-path latency reduction (read/write hot paths) | `convex/ai/agentSessions.ts`, `convex/ai/agentExecution.ts`, schema/index files | No tooling/governor policy changes |
| `B` | Idempotency/queue/lease contention hardening | `convex/ai/agentExecution.ts`, `convex/ai/agentSessions.ts`, turn orchestration | No model-routing changes |
| `C` | Tool orchestration efficiency + spend safety | `convex/ai/agentToolOrchestration.ts`, billing/credits surfaces | No inbox/lease contract edits |
| `D` | LLM pipeline resilience and failover controls | `convex/ai/agentExecution.ts`, retry/failover modules | No schema/index edits |
| `E` | Observability, SLOs, alerts, tracing | telemetry + trust events + scripts/perf | No runtime semantics changes without flags |
| `F` | CI, load/perf automation, release hardening | `scripts/ci/*`, workflows, test harnesses | No business logic changes |

---

## Dependency-based status flow

1. Execute lane `A` quick wins first (`ARH-001`..`ARH-006`) to cut baseline latency and DB scans.
2. Start lane `B` after `ARH-002` and `ARH-004` are `DONE` (queue + idempotency contracts depend on hot-path query shape).
3. Start lane `C` in parallel with late lane `B` once `ARH-006` is `DONE`.
4. Start lane `D` after `ARH-009` and `ARH-013` are `DONE` (avoid compounding unresolved contention).
5. Start lane `E` after at least one milestone in lanes `A`..`D` is `DONE` so telemetry covers new paths.
6. Lane `F` runs continuously but final closeout (`ARH-036`..`ARH-040`) requires all prior `P0/P1` rows complete.

---

## Task queue

| ID | Lane | Plan | Priority | Status | Depends On | Task | Primary files | Verify | Notes |
|---|---|---:|---|---|---|---|---|---|---|
| `ARH-001` | `A` | 1 | `P0` | `DONE` | `-` | Replace full-history `collect+sort+slice` in internal session message reads with bounded index-driven retrieval | `convex/ai/agentSessions.ts`, `convex/schemas/agentSessionSchemas.ts` | `V-TYPE`; `V-UNIT-TARGET`; `V-DOCS` | Completed 2026-02-27: added `by_session_timestamp` index + bounded descending reads with chronological parity. |
| `ARH-002` | `A` | 1 | `P0` | `DONE` | `ARH-001` | Collapse duplicate history fetches inside `processInboundMessage` into one shared history snapshot per turn | `convex/ai/agentExecution.ts` | `V-TYPE`; `V-UNIT-TARGET`; `V-LOAD-SMOKE`; `V-DOCS` | Completed 2026-02-27: single `sessionHistorySnapshot` reused for pre-escalation, context window, and post-escalation counters. |
| `ARH-003` | `A` | 1 | `P0` | `READY` | `ARH-001` | Add bounded helper for message retrieval with deterministic ordering guarantees | `convex/ai/agentSessions.ts` | `V-TYPE`; `V-UNIT-TARGET`; `V-DOCS` | Avoid repeated ad-hoc query logic |
| `ARH-004` | `A` | 1 | `P0` | `READY` | `-` | Rework receipt idempotency duplicate checks to avoid broad `collect+sort+find` scans | `convex/ai/agentExecution.ts` | `V-TYPE`; `V-INTEG-TARGET`; `V-LOAD-SMOKE`; `V-DOCS` | Direct throughput/latency lever under concurrency |
| `ARH-005` | `A` | 1 | `P1` | `PENDING` | `ARH-004` | Rework turn idempotency duplicate checks with bounded lookup strategy and deterministic tie-break | `convex/ai/agentSessions.ts` | `V-TYPE`; `V-INTEG-TARGET`; `V-DOCS` | Keep replay invariants intact |
| `ARH-006` | `A` | 1 | `P1` | `PENDING` | `ARH-002`, `ARH-003` | Batch user+assistant persistence where safe and reduce write round-trips on success/error branches | `convex/ai/agentExecution.ts`, `convex/ai/agentSessions.ts` | `V-TYPE`; `V-UNIT-TARGET`; `V-DOCS` | Maintain audit parity |
| `ARH-007` | `B` | 2 | `P0` | `PENDING` | `ARH-004` | Harden lease acquire path with bounded conflict scanning + deterministic conflict telemetry | `convex/ai/agentSessions.ts`, `convex/ai/agentExecution.ts` | `V-TYPE`; `V-INTEG-TARGET`; `V-LOAD-SYNTH`; `V-DOCS` | Prevent hidden lock hot spots |
| `ARH-008` | `B` | 2 | `P1` | `PENDING` | `ARH-007` | Add explicit queue wait-time and lease contention metrics per `queueConcurrencyKey` | `convex/ai/agentSessions.ts`, telemetry surfaces | `V-TYPE`; `V-LOAD-SYNTH`; `V-DOCS` | Enables SLO alerting |
| `ARH-009` | `B` | 2 | `P1` | `PENDING` | `ARH-007` | Add adaptive backpressure at ingress when queue/lease conflict thresholds trip | `convex/ai/agentExecution.ts`, ingress adapters | `V-TYPE`; `V-INTEG-TARGET`; `V-LOAD-SYNTH`; `V-DOCS` | Guard against burst collapse |
| `ARH-010` | `B` | 2 | `P2` | `PENDING` | `ARH-009` | Introduce rate-tier aware admission control policies (org/channel/workflow) | `convex/ai/agentExecution.ts`, policy modules | `V-TYPE`; `V-INTEG-TARGET`; `V-DOCS` | Enterprise multi-tenant hardening |
| `ARH-011` | `C` | 3 | `P0` | `PENDING` | `ARH-006` | Implement per-turn batched tool credit deduction to remove per-tool mutation loop | `convex/ai/agentExecution.ts`, credits/billing APIs | `V-TYPE`; `V-USAGE-GUARD`; `V-UNIT-TARGET`; `V-DOCS` | High write-path leverage |
| `ARH-012` | `C` | 3 | `P1` | `PENDING` | `ARH-011` | Add tool execution grouping: parallelize explicitly read-only tools while serializing mutating tools | `convex/ai/agentToolOrchestration.ts` | `V-TYPE`; `V-UNIT-TARGET`; `V-LOAD-SMOKE`; `V-DOCS` | Preserve approval + authority gates |
| `ARH-013` | `C` | 3 | `P1` | `PENDING` | `ARH-011` | Add tool budget controls (`max_tool_calls_per_turn`, optional `max_tool_cost_usd`) as governor extension | `convex/ai/runtimeGovernor.ts`, `convex/ai/agentExecution.ts`, tests | `V-TYPE`; `V-UNIT-GOV`; `V-USAGE-GUARD`; `V-DOCS` | Spend hardening beyond LLM-only budget |
| `ARH-014` | `C` | 3 | `P2` | `PENDING` | `ARH-012` | Add per-tool cooldown/circuit-breaker policy to stop repeated failing tools from dominating turns | `convex/ai/agentToolOrchestration.ts` | `V-TYPE`; `V-UNIT-TARGET`; `V-DOCS` | Reliability + cost containment |
| `ARH-015` | `D` | 4 | `P0` | `PENDING` | `ARH-009`, `ARH-013` | Add provider failover circuit breaker (provider-level cooldown windows and fail-fast) | `convex/ai/agentExecution.ts`, `convex/ai/retryPolicy.ts`, failover modules | `V-TYPE`; `V-UNIT-TARGET`; `V-LOAD-SYNTH`; `V-DOCS` | Avoid retry storms |
| `ARH-016` | `D` | 4 | `P1` | `PENDING` | `ARH-015` | Add per-org/model retry budgets and failure-domain isolation | model routing/failover modules | `V-TYPE`; `V-INTEG-TARGET`; `V-DOCS` | Enterprise isolation control |
| `ARH-017` | `D` | 4 | `P1` | `PENDING` | `ARH-015` | Cache immutable model pricing/config snapshots per turn to cut repeated reads | `convex/ai/agentExecution.ts` | `V-TYPE`; `V-UNIT-TARGET`; `V-LOAD-SMOKE`; `V-DOCS` | Low risk, moderate latency gain |
| `ARH-018` | `D` | 4 | `P2` | `PENDING` | `ARH-016` | Add graceful degradation policies for partial provider outages (deterministic fallback contracts) | runtime policy + execution modules | `V-TYPE`; `V-INTEG-TARGET`; `V-DOCS` | Enterprise resilience |
| `ARH-019` | `E` | 5 | `P0` | `PENDING` | `ARH-002`, `ARH-007`, `ARH-011`, `ARH-015` | Instrument stage-level latency histogram (`ingress`, `context`, `llm`, `governor`, `tools`, `persist`, `outbound`) | `convex/ai/agentExecution.ts`, telemetry sinks | `V-TYPE`; `V-LOAD-SYNTH`; `V-DOCS` | Foundation for SLOs |
| `ARH-020` | `E` | 5 | `P0` | `PENDING` | `ARH-019` | Standardize trace correlation IDs across receipt -> turn -> provider -> tool -> outbound | execution + trust event surfaces | `V-TYPE`; `V-INTEG-TARGET`; `V-DOCS` | Distributed tracing prerequisite |
| `ARH-021` | `E` | 5 | `P1` | `PENDING` | `ARH-019` | Add queue-depth, lease-conflict, wait-time metrics with cardinality-safe tags | sessions + telemetry modules | `V-TYPE`; `V-LOAD-SYNTH`; `V-DOCS` | Contention visibility |
| `ARH-022` | `E` | 5 | `P1` | `PENDING` | `ARH-019` | Add governor effectiveness metrics (trim rates, blocked rates, cost/time threshold proximity) | governor + usage telemetry | `V-TYPE`; `V-UNIT-GOV`; `V-DOCS` | Policy tuning data |
| `ARH-023` | `E` | 5 | `P1` | `PENDING` | `ARH-020` | Add alert thresholds + runbook docs for p95/p99 regressions and retry storms | alert config docs + scripts | `V-DOCS`; `V-CI-LOCAL-CORE` | Ops readiness |
| `ARH-024` | `E` | 5 | `P2` | `PENDING` | `ARH-023` | Add cross-org SLO dashboards and weekly regression diff reports | perf scripts + docs | `V-DOCS`; `V-CI-LOCAL-CORE` | Executive visibility |
| `ARH-025` | `F` | 6 | `P0` | `PENDING` | `ARH-019` | Promote synthetic load audit script into CI smoke lane with artifact retention | `scripts/perf/agenticRuntimeLoadAudit.ts`, `.github/workflows/*` | `V-LOAD-SMOKE`; `V-DOCS` | Protects critical-path regressions |
| `ARH-026` | `F` | 6 | `P1` | `PENDING` | `ARH-025` | Add nightly sustained/burst load CI lane with budget thresholds and failure gates | workflow + perf scripts | `V-LOAD-SYNTH`; `V-DOCS` | Early warning for drift |
| `ARH-027` | `F` | 6 | `P1` | `PENDING` | `ARH-025`, `ARH-026` | Add perf-baseline snapshot + auto-diff checker in CI | perf scripts + reports | `V-LOAD-SYNTH`; `V-DOCS` | Regression enforcement |
| `ARH-028` | `F` | 6 | `P1` | `PENDING` | `ARH-027` | Add flamegraph/profiling capture mode for failed perf jobs | perf tooling scripts | `V-DOCS`; `V-CI-LOCAL-CORE` | Faster incident triage |
| `ARH-029` | `F` | 6 | `P2` | `PENDING` | `ARH-026` | Add failure-injection CI scenarios (provider timeout, mutation conflict, queue saturation) | test harnesses + workflows | `V-INTEG-TARGET`; `V-DOCS` | Reliability validation |
| `ARH-030` | `F` | 6 | `P2` | `PENDING` | `ARH-029` | Add disaster-recovery drill script for DLQ/queue replay correctness | scripts + docs | `V-DOCS`; `V-CI-LOCAL-CORE` | Enterprise operations hardening |
| `ARH-031` | `E` | 7 | `P1` | `PENDING` | `ARH-022` | Build formal runtime SLO spec (latency, error, queue, cost, governor) with target budgets | workstream docs + ops docs | `V-DOCS` | Governance layer |
| `ARH-032` | `D` | 7 | `P1` | `PENDING` | `ARH-016`, `ARH-031` | Add per-tenant policy contracts for execution ceilings and protected workload tiers | runtime policy modules | `V-TYPE`; `V-INTEG-TARGET`; `V-DOCS` | Enterprise tenant safety |
| `ARH-033` | `B` | 7 | `P2` | `PENDING` | `ARH-010`, `ARH-032` | Add deterministic replay API for failed turns and controlled queue re-entry | turn orchestration modules | `V-TYPE`; `V-INTEG-TARGET`; `V-DOCS` | Operational recoverability |
| `ARH-034` | `C` | 7 | `P2` | `PENDING` | `ARH-014`, `ARH-031` | Add policy-driven tool batching windows for high-throughput enterprise lanes | tool orchestration + policy | `V-TYPE`; `V-LOAD-SYNTH`; `V-DOCS` | Throughput scaling |
| `ARH-035` | `E` | 7 | `P2` | `PENDING` | `ARH-024`, `ARH-031` | Add auditable monthly efficiency report (cost/latency/throughput deltas) | reports + docs | `V-DOCS`; `V-CI-LOCAL-CORE` | Stakeholder reporting |
| `ARH-036` | `F` | 8 | `P0` | `PENDING` | `ARH-025`..`ARH-035` | Full CI hardening pass and remediation loop until zero blocking regressions | workflows + affected modules | `V-CI-LOCAL-CORE`; `V-LOAD-SYNTH` | Release gate |
| `ARH-037` | `F` | 8 | `P0` | `PENDING` | `ARH-036` | Run full verification matrix and publish signed release-readiness checklist | workstream docs + reports | `V-CI-LOCAL-CORE`; `V-LOAD-SYNTH`; `V-DOCS` | Enterprise go-live gate |
| `ARH-038` | `F` | 8 | `P1` | `PENDING` | `ARH-037` | Post-release 7-day burn-in protocol with rollback criteria and incident thresholds | runbooks + dashboards docs | `V-DOCS`; `V-CI-LOCAL-CORE` | Production stabilization |
| `ARH-039` | `F` | 8 | `P1` | `PENDING` | `ARH-038` | Finalize long-term ownership map and on-call escalation playbook | docs + runbooks | `V-DOCS` | Sustainable operations |
| `ARH-040` | `F` | 8 | `P1` | `PENDING` | `ARH-039` | Program closeout: lock baselines, archive evidence artifacts, and open next-cycle queue | workstream docs + artifact index | `V-DOCS`; `V-CI-LOCAL-CORE` | Deterministic closeout |

---

## Current kickoff

- Active task: `ARH-004` (next highest-leverage `P0` task in deterministic order).
- Immediate objective: remove broad receipt idempotency scan path (`collect+sort+find`) under concurrency.
- Next tasks by deterministic order: `ARH-003`, `ARH-005`, `ARH-006`.
