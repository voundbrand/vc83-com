# Workforce Planner Agent Master Plan (DEV-Only)

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/workforce-planner-agent`  
**Source brief:** 2026-03-06 implementation request (new `workforce_planner` subtype, workforce scheduling data model, school holiday API integration)  
**Planning mode:** Queue-first, deterministic, contract-first  
**Scope:** DEV execution only. Migration/canary/promotion/cutover/rollback phases are excluded.

## Objective

Deliver a production-ready workforce vacation planning agent foundation inside the existing ontology and agent runtime stack:

1. Add workforce data contracts in `objects` (including fairness ledger and duty/vacation entries).
2. Ship a complete workforce tool suite with direct school holiday API integration and cache support.
3. Enforce safe autonomy behavior (`collaborative` vs `autonomous`) through scoping/runtime policy.
4. Seed a protected `workforce_planner` template agent and validate end-to-end behavior with deterministic tests.

## DEV scope boundaries

Included:

- New agent subtype rollout: `workforce_planner`.
- Workforce object contracts in ontology (`vacation_entry`, `duty_entry`, `workforce_config`, `fairness_ledger`, plus cache type `school_holiday_cache`).
- `org_member` customProperties extension contract for scheduling/fairness inputs.
- Workforce tools implementation and registry wiring.
- School holiday ingestion via external API and cache merge behavior.
- Tool profile + subtype scoping updates in `toolScoping.ts`.
- Fairness scoring and annual/rebalance planning algorithms.
- Protected template seeding and runtime subtype selection coverage.
- Unit/integration verification and workstream-doc closure.

Excluded:

- Backfill migrations for historical org data.
- Shadow/canary/prod rollout choreography.
- Non-workforce agent modularization changes.
- UI polish or front-end scheduler application work beyond runtime contracts.

## Lane plan and ownership

| Lane | Focus | Queue IDs | Ownership | Current state |
|---|---|---|---|---|
| `A` | Workforce contracts + object IO | `WFP-A-001`, `WFP-A-002` | `convex/ai/workforce/contracts.ts` (new), `convex/ai/workforce/store.ts` (new) | `WFP-A-001 READY`, `WFP-A-002 PENDING` |
| `B` | Holiday API + cache merge | `WFP-B-001`, `WFP-B-002` | `convex/ai/workforce/schoolHolidayClient.ts` (new), `convex/ai/workforce/store.ts` (new) | `PENDING`, `PENDING` |
| `C` | Tool suite + registry | `WFP-C-001`, `WFP-C-002`, `WFP-C-003` | `convex/ai/tools/workforcePlannerTools.ts` (new), `convex/ai/tools/registry.ts` | `PENDING`, `PENDING`, `PENDING` |
| `D` | Scoping + autonomy gating | `WFP-D-001`, `WFP-D-002` | `convex/ai/toolScoping.ts`, `convex/ai/agentExecution.ts` | `PENDING`, `PENDING` |
| `E` | Fairness + planning engines | `WFP-E-001`, `WFP-E-002` | `convex/ai/workforce/fairnessEngine.ts` (new), `convex/ai/workforce/plannerEngine.ts` (new) | `PENDING`, `PENDING` |
| `F` | Seeding + runtime subtype rollout | `WFP-F-001`, `WFP-F-002` | `convex/onboarding/seedPlatformAgents.ts`, `convex/ai/agentExecution.ts` | `PENDING`, `PENDING` |
| `G` | Validation + docs closeout | `WFP-G-001`, `WFP-G-002` | `tests/integration/ai/*`, workstream docs | `PENDING`, `PENDING` |

## Dependency graph (acyclic)

1. `WFP-A-001` -> `WFP-A-002`
2. `WFP-A-001` -> `WFP-B-001`
3. `WFP-B-001` + `WFP-A-002` -> `WFP-B-002`
4. `WFP-A-002` + `WFP-B-002` -> `WFP-C-001`
5. `WFP-C-001` -> `WFP-C-002`
6. `WFP-C-002` -> `WFP-C-003`
7. `WFP-C-003` -> `WFP-D-001`
8. `WFP-D-001` -> `WFP-D-002`
9. `WFP-A-002` + `WFP-D-002` -> `WFP-E-001`
10. `WFP-E-001` + `WFP-C-002` -> `WFP-E-002`
11. `WFP-C-003` + `WFP-D-002` -> `WFP-F-001`
12. `WFP-F-001` + `WFP-E-002` -> `WFP-F-002`
13. `WFP-E-002` + `WFP-F-002` -> `WFP-G-001`
14. `WFP-G-001` -> `WFP-G-002`

## Execution waves

1. Wave 1: `WFP-A-001`.
2. Wave 2: `WFP-A-002` and `WFP-B-001` (once `WFP-A-001` is done).
3. Wave 3: `WFP-B-002`.
4. Wave 4: `WFP-C-001` -> `WFP-C-002` -> `WFP-C-003`.
5. Wave 5: `WFP-D-001` -> `WFP-D-002`.
6. Wave 6: `WFP-E-001` -> `WFP-E-002`.
7. Wave 7: `WFP-F-001` -> `WFP-F-002`.
8. Wave 8: `WFP-G-001` -> `WFP-G-002`.

## Verification contract

Required gates:

1. `npm run docs:guard`
2. `npm run typecheck`
3. `npx tsc -p convex/tsconfig.json --noEmit`

Targeted test gates (row-specific):

1. `npm run test:unit -- tests/unit/ai/toolScopingPolicyAudit.test.ts tests/unit/ai/toolScopingWorkforcePlanner.test.ts`
2. `npm run test:unit -- tests/unit/ai/workforcePlannerTools.test.ts tests/unit/ai/workforceHolidayClient.test.ts`
3. `npm run test:unit -- tests/unit/ai/workforceFairnessScoring.test.ts tests/unit/ai/workforceConflictCoverage.test.ts tests/unit/ai/workforcePlanGeneration.test.ts`
4. `npm run test:unit -- tests/unit/onboarding/seedPlatformAgents.workforcePlanner.test.ts`
5. `npm run test:integration -- tests/integration/ai/workforcePlannerAgent.integration.test.ts`

## READY-first tasks

1. `WFP-A-001` (contract constants and validators for all workforce object types).

## Acceptance criteria map

| Criterion | Status target | Evidence anchor |
|---|---|---|
| Subtype rollout | `PASS` | `WFP-D-001`, `WFP-F-001`, `WFP-F-002` |
| Workforce data contracts | `PASS` | `WFP-A-001`, `WFP-A-002` |
| School holiday API + cache | `PASS` | `WFP-B-001`, `WFP-B-002` |
| Workforce tool suite | `PASS` | `WFP-C-001`, `WFP-C-002`, `WFP-C-003` |
| Fairness + planning engine | `PASS` | `WFP-E-001`, `WFP-E-002` |
| Autonomy policy safety | `PASS` | `WFP-D-002`, `WFP-F-002` |
| End-to-end validation + docs closure | `PASS` | `WFP-G-001`, `WFP-G-002` |
