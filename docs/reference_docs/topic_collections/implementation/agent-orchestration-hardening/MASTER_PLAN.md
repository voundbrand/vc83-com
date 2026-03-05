# Agent Orchestration Hardening Master Plan (DEV-Only)

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-orchestration-hardening`  
**Source RFC:** `SCALABLE_AGENT_RUNTIME_ARCHITECTURE_RFC.md` (dated 2026-03-02)  
**Planning mode:** Queue-first, deterministic, contract-first  
**Scope:** DEV execution only. Migration/canary/promotion/cutover/rollback phases are excluded.

## Objective

Execute a two-phase hardening plan:

1. Complete RFC-defined deterministic runtime contract work (lanes A-G).
2. Deliver reality-based modular runtime refactor and Der Terminmacher enablement (lanes H-M) with explicit evidence gates for Samantha parity, per-agent tooling, and hardware truth constraints.

## DEV scope boundaries

Included:

- Agent spec contracts and schema validation.
- Policy compile determinism and manifest hashing.
- Admission control and structured denial payloads.
- Action completion evidence and failure taxonomy.
- Idempotency tuple and replay matrix behavior.
- Observability metrics/spans, incident dedupe, and threshold logic.
- Dev CI/warmup command wiring for stages 1-4.
- Runtime kernel seam extraction from `agentExecution.ts`.
- Samantha-specific orchestration isolation into agent module adapters.
- Agent module registry and per-agent tool-manifest runtime resolution.
- Der Terminmacher module scaffold and deterministic stage-flow contract.
- Tool-chain reality audit and latency contract targeting `<20s` processing.
- Cross-workstream evidence gate sync so DAT-native claims remain blocked without physical-device artifacts.

Excluded:

- Shadow-mode migration phases.
- Canary/prod promotion steps.
- Cutover and rollback workflows.
- Legacy removal sequencing.

## Lane plan and ownership

| Lane | RFC sections | Queue IDs | Ownership | Current state |
|---|---|---|---|---|
| `A` Agent Spec + schema contracts | `§8.1`, `§6.1.1`, `§7.2` | `ARH-A-001`, `ARH-A-002` | `convex/ai/agentSpecRegistry.ts`, `convex/schema.ts` | `ARH-A-001 DONE`, `ARH-A-002 DONE` |
| `B` Policy Compiler + manifest hash determinism | `§7.3`, `§8.2`, `§10.2(2)` | `ARH-B-001`, `ARH-B-002` | `convex/ai/policyCompiler.ts`, `convex/ai/toolScoping.ts` | `ARH-B-001 DONE`, `ARH-B-002 DONE` |
| `C` Admission control + structured denial contract | `§7.4`, `§8.3`, `§9` | `ARH-C-001`, `ARH-C-002` | `convex/ai/admissionController.ts`, `convex/http.ts`, `convex/api/v1/webchatApi.ts` | `ARH-C-001 DONE`, `ARH-C-002 BLOCKED` |
| `D` Action completion evidence + failure taxonomy | `§7.5`, `§8.4`, taxonomy map | `ARH-D-001`, `ARH-D-002` | `convex/ai/agentExecution.ts`, `convex/ai/agentToolOrchestration.ts` | `ARH-D-001 BLOCKED`, `ARH-D-002 PENDING` |
| `E` Idempotency tuple + replay matrix behavior | `§7.6`, `§8.5` replay matrix | `ARH-E-001`, `ARH-E-002` | `convex/ai/idempotencyCoordinator.ts`, `convex/crons.ts` | `ARH-E-001 DONE`, `ARH-E-002 PENDING` |
| `F` Observability + SLO/incident thresholds | `§11.1`, `§11.2`, `§11.3`, `§11.4` | `ARH-F-001`, `ARH-F-002` | `convex/ai/trustTelemetry.ts`, `convex/ai/runtimeIncidentAlerts.ts` | `ARH-F-001 DONE`, `ARH-F-002 PENDING` |
| `G` CI/warmup pipeline wiring (dev-only) | `§7.7`, `§10.1`, `§10.2` | `ARH-G-001`, `ARH-G-002` | `scripts/ci/check-agent-runtime-dev-gates.sh`, `package.json` | `ARH-G-001 DONE`, `ARH-G-002 PENDING` |
| `H` Runtime kernel seam extraction | `Runtime Reality §1` | `ARH-H-001`, `ARH-H-002` | `convex/ai/agentExecution.ts`, `convex/ai/agentTurnOrchestration.ts`, `convex/ai/agentPromptAssembly.ts` | `ARH-H-001 DONE`, `ARH-H-002 DONE` |
| `I` Samantha module isolation + parity | `Runtime Reality §2` | `ARH-I-001`, `ARH-I-002` | `convex/ai/samanthaAuditContract.ts`, `tests/unit/ai/samanthaAuditAutoDispatch.test.ts` | `ARH-I-001 DONE`, `ARH-I-002 DONE` |
| `J` Agent module registry + per-agent tool binding | `Runtime Reality §3` | `ARH-J-001`, `ARH-J-002` | `convex/ai/agentSpecRegistry.ts`, `convex/ai/policyCompiler.ts`, `convex/ai/toolScoping.ts`, `convex/ai/tools/registry.ts` | `ARH-J-001 DONE`, `ARH-J-002 DONE` |
| `K` Der Terminmacher module scaffold + stage contract | `Terminmacher Reality §4` | `ARH-K-001`, `ARH-K-002` | `convex/ai/agentExecution.ts`, `convex/ai/tools/bookingTool.ts`, `convex/ai/tools/crmTool.ts` | `ARH-K-001 DONE`, `ARH-K-002 DONE` |
| `L` Tool-chain truth audit + latency contract | `Terminmacher Reality §5` | `ARH-L-001`, `ARH-L-002` | `tests/unit/ai/*`, `tests/integration/ai/*`, `tmp/reports/*` | `ARH-L-001 DONE`, `ARH-L-002 DONE` |
| `M` Hardware gate + truth-sync closure | `Reality Closure §6` | `ARH-M-001`, `ARH-M-002` | `docs/reference_docs/topic_collections/implementation/operator-mobile-realtime-voice-runtime/*`, `docs/reference_docs/topic_collections/implementation/life-operator-one-of-one-cutover/*`, AOH docs | `ARH-M-001 DONE`, `ARH-M-002 DONE` |

## Dependency graph (acyclic)

1. `ARH-A-001` -> `ARH-A-002`
2. `ARH-A-001` + `ARH-B-001` -> `ARH-B-002`
3. `ARH-C-001` + `ARH-B-002` -> `ARH-C-002`
4. `ARH-D-001` + `ARH-C-002` -> `ARH-D-002`
5. `ARH-E-001` + `ARH-C-002` -> `ARH-E-002`
6. `ARH-F-001` + `ARH-D-002` + `ARH-E-002` -> `ARH-F-002`
7. `ARH-G-001` + `ARH-F-002` -> `ARH-G-002`
8. `ARH-H-001` -> `ARH-H-002`
9. `ARH-H-001` -> `ARH-I-001`
10. `ARH-I-001` + `ARH-H-002` -> `ARH-I-002`
11. `ARH-H-002` -> `ARH-J-001`
12. `ARH-J-001` + `ARH-I-002` -> `ARH-J-002`
13. `ARH-J-002` -> `ARH-K-001`
14. `ARH-K-001` -> `ARH-K-002`
15. `ARH-K-002` -> `ARH-L-001`
16. `ARH-L-001` -> `ARH-L-002`
17. `ARH-L-002` -> `ARH-M-001`
18. `ARH-M-001` -> `ARH-M-002`

## Execution waves

1. Wave 1 (parallel READY kickoff): `ARH-A-001`, `ARH-B-001`, `ARH-C-001`, `ARH-D-001`, `ARH-E-001`, `ARH-F-001`, `ARH-G-001`.
2. Wave 2 (gated progression): `ARH-A-002` -> `ARH-B-002` -> `ARH-C-002`.
3. Wave 3 (parallel after C): `ARH-D-002` and `ARH-E-002`.
4. Wave 4: `ARH-F-002`.
5. Wave 5: `ARH-G-002`.
6. Wave 6: `ARH-H-001` -> `ARH-H-002` -> `ARH-I-001` -> `ARH-I-002`.
7. Wave 7: `ARH-J-001` -> `ARH-J-002` -> `ARH-K-001` -> `ARH-K-002`.
8. Wave 8: `ARH-L-001` -> `ARH-L-002` -> `ARH-M-001` -> `ARH-M-002`.

## Verification contract

Required gate commands:

1. `npm run docs:guard`
2. `npm run typecheck`
3. `npx tsc -p convex/tsconfig.json --noEmit`

Targeted unit/integration slices by lane are defined per row in `TASK_QUEUE.md` and must be executed exactly when a row is completed.

## READY-first tasks

1. None. No dependency-unblocked `READY` rows remain; next queue movement requires `ARH-C-002` blocker clearance.

## Latest evidence

- `ARH-L-002` verification (2026-03-05): `npm run typecheck` ✅; `npx tsc -p convex/tsconfig.json --noEmit` ✅; `npx vitest run tests/integration/ai/avDeviceMatrixLatency.integration.test.ts` ✅ (3 tests); `npm run demo:fnd-007` ✅ (1 passed); `npm run demo:founder` ✅ (7 passed + aggregate).
- Demo latency artifact snapshot: `tmp/reports/fnd-007/latest.json` and `tmp/reports/founder-rehearsal/latest.json` include `meeting_concierge_latency_contract_v1` with telemetry target `60s`, outcome target `20s`, and no breach reasons for current `FND-007` run (`totalRuntimeSeconds=14`).
- `ARH-M-001` verification (2026-03-05): `npm run docs:guard` ✅ after publishing synchronized cross-workstream blocker ledgers in ORV (`TASK_QUEUE.md`, `MASTER_PLAN.md`), LOC (`TASK_QUEUE.md`), and AOH (`INDEX.md`) that keep DAT-native readiness fail-closed (`NO_GO`) while `ORV-023` remains `BLOCKED` and invalidate stale DAT-native `GO` claims without physical iOS+Android artifact bundles.
- `ARH-M-002` verification (2026-03-05): `npm run docs:guard` ✅ and `npm run typecheck` ✅ after publishing final acceptance-criteria mapping, ORV-044 closure preservation notes, and unresolved-risk ownership in AOH docs.

## ARH-M-002 acceptance-criteria mapping

| Acceptance criterion | Status | Evidence | Closeout notes |
|---|---|---|---|
| `runtime modular` | `PASS` | `ARH-H-001`, `ARH-H-002` queue closure evidence in `TASK_QUEUE.md` | Shared kernel + deterministic hook contracts are in place; behavior remains fail-closed on contract mismatch. |
| `Samantha parity` | `PASS` | `ARH-I-001`, `ARH-I-002` closure evidence in `TASK_QUEUE.md` | Adapter extraction parity is evidenced across required-tool invariants, auto-dispatch statuses, and fail-closed rewrites. |
| `new-agent scaffold` | `PASS` | `ARH-K-001` closure evidence in `TASK_QUEUE.md` | `der_terminmacher` module scaffold landed with additive compatibility and no core-kernel fail-open relaxation. |
| `per-agent tools` | `PASS` | `ARH-J-002` + `ARH-K-002` closure evidence in `TASK_QUEUE.md` | Runtime tool resolution is per-agent and deterministic; legacy compatibility remains additive-only. |
| `Terminmacher tool-chain` | `PASS` | `ARH-L-001`, `ARH-L-002` closure evidence + ORV lane `ORV-044` evidence in `ORV_014_CANARY_EXECUTION_LOG.md` | Tool-chain + latency contracts are evidenced; non-DAT web/desktop realtime parity is `GO` with explicit fallback taxonomy. |
| `hardware gate` | `PASS` (gate enforcement) / `NO_GO` (DAT-native readiness) | `ARH-M-001` blocker ledger + ORV queue row `ORV-023` (`BLOCKED`) | Gate remains fail-closed: DAT-native readiness cannot be promoted without physical iOS+Android artifact bundles. |

ORV-044 closure preservation notes captured in this closeout mapping:

1. Resolved `test:e2e:desktop` onboarding-audit-handoff flakiness (`input/send` instability, CTA label drift, intermittent no-send path).
2. Hardened helper behavior with deterministic submit-button targeting, send retries tied to request-count increments, and updated create-account label matching.
3. Preserved ORV-041/ORV-042/ORV-043 gates, `/api/v1/ai/voice/*` compatibility, and explicit batch fallback semantics.
4. Confirmed `convex/ai/agentExecution.ts` was not modified in ORV-044 closure.

## Unresolved risks (owned)

| Risk | Status | Owner | Next review | Mitigation posture |
|---|---|---|---|---|
| DAT-native readiness evidence missing for `ORV-023` physical-device matrix | `OPEN` | Lane `H` mobile runtime + device QA owners (`ORV-023`) | `2026-03-12` | Keep DAT-native claim fail-closed (`NO_GO`), reject stale `GO` claims, and require both iOS+Android artifact bundles before promotion. |
| Lane `C`/`D` verification progression blocked by unrelated baseline `mobileMetaBridgeContracts` failures | `OPEN` | Lane `C` and lane `D` owners (`ARH-C-002`, `ARH-D-001`) | `2026-03-12` | Maintain additive compatibility and fail-closed enforcement; do not promote dependent rows (`ARH-D-002`, `ARH-E-002`, `ARH-F-002`, `ARH-G-002`) until blocker clears. |
