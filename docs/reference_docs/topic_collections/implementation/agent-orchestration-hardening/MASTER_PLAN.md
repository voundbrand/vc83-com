# Agent Orchestration Hardening Master Plan (DEV-Only)

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-orchestration-hardening`  
**Source RFC:** `SCALABLE_AGENT_RUNTIME_ARCHITECTURE_RFC.md` (dated 2026-03-02)  
**Planning mode:** Queue-first, deterministic, contract-first  
**Scope:** DEV execution only. Migration/canary/promotion/cutover/rollback phases are excluded.

## Objective

Implement RFC-defined deterministic runtime contracts for agent execution in the current Convex stack using seven execution lanes (A-G), with explicit dependencies, 1-2 hour task chunks, and strict verification gates.

## DEV scope boundaries

Included:

- Agent spec contracts and schema validation.
- Policy compile determinism and manifest hashing.
- Admission control and structured denial payloads.
- Action completion evidence and failure taxonomy.
- Idempotency tuple and replay matrix behavior.
- Observability metrics/spans, incident dedupe, and threshold logic.
- Dev CI/warmup command wiring for stages 1-4.

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

## Dependency graph (acyclic)

1. `ARH-A-001` -> `ARH-A-002`
2. `ARH-A-001` + `ARH-B-001` -> `ARH-B-002`
3. `ARH-C-001` + `ARH-B-002` -> `ARH-C-002`
4. `ARH-D-001` + `ARH-C-002` -> `ARH-D-002`
5. `ARH-E-001` + `ARH-C-002` -> `ARH-E-002`
6. `ARH-F-001` + `ARH-D-002` + `ARH-E-002` -> `ARH-F-002`
7. `ARH-G-001` + `ARH-F-002` -> `ARH-G-002`

## Execution waves

1. Wave 1 (parallel READY kickoff): `ARH-A-001`, `ARH-B-001`, `ARH-C-001`, `ARH-D-001`, `ARH-E-001`, `ARH-F-001`, `ARH-G-001`.
2. Wave 2 (gated progression): `ARH-A-002` -> `ARH-B-002` -> `ARH-C-002`.
3. Wave 3 (parallel after C): `ARH-D-002` and `ARH-E-002`.
4. Wave 4: `ARH-F-002`.
5. Wave 5: `ARH-G-002`.

## Verification contract

Required gate commands:

1. `npm run docs:guard`
2. `npm run typecheck`
3. `npx tsc -p convex/tsconfig.json --noEmit`

Targeted unit/integration slices by lane are defined per row in `TASK_QUEUE.md` and must be executed exactly when a row is completed.

## READY-first tasks

1. None currently. Remaining rows are dependency-gated.
