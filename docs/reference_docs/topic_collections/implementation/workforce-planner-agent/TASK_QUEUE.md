# Workforce Planner Agent Task Queue (DEV-Only)

**Last updated:** 2026-03-06 (UTC)  
**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/workforce-planner-agent`  
**Source brief:** 2026-03-06 implementation request (`workforce_planner` subtype, workforce objects in ontology, school holiday API integration)  
**Execution scope:** DEV execution only. No migration/shadow/canary/promotion/cutover/rollback tasks are included.

## Queue rules

1. Allowed statuses are only: `READY`, `IN_PROGRESS`, `PENDING`, `BLOCKED`, `DONE`.
2. Row schema is fixed and must remain exact: `ID | Lane | Plan | Priority | Status | Depends On | Task | Primary files | Verify | Notes`.
3. Deterministic pick order: `P0` before `P1`, then lexical `ID`.
4. `Depends On` semantics:
   - `ID` means dependency must be `DONE` before this row moves to `IN_PROGRESS`.
   - `ID@DONE_GATE` means work may start, but row cannot move to `DONE` until dependency is `DONE`.
5. Dependencies must remain acyclic; add new rows only with forward references.
6. Every row must include concrete executable verification commands.
7. Queue and state synchronization is mandatory across `TASK_QUEUE.md`, `SESSION_PROMPTS.md`, `MASTER_PLAN.md`, and `INDEX.md`.
8. Scope lock: this queue delivers workforce planning runtime and guardrails only; no unrelated agent/runtime rewrites.

## Verification profiles

| Profile | Command |
|---|---|
| `docs` | `npm run docs:guard` |
| `typecheck` | `npm run typecheck` |
| `convex-ts` | `npx tsc -p convex/tsconfig.json --noEmit` |
| `unit-tool-scoping` | `npm run test:unit -- tests/unit/ai/toolScopingPolicyAudit.test.ts tests/unit/ai/toolScopingWorkforcePlanner.test.ts` |
| `unit-workforce-tools` | `npm run test:unit -- tests/unit/ai/workforcePlannerTools.test.ts tests/unit/ai/workforceHolidayClient.test.ts` |
| `unit-workforce-engine` | `npm run test:unit -- tests/unit/ai/workforceFairnessScoring.test.ts tests/unit/ai/workforceConflictCoverage.test.ts tests/unit/ai/workforcePlanGeneration.test.ts` |
| `unit-seeding` | `npm run test:unit -- tests/unit/onboarding/seedPlatformAgents.workforcePlanner.test.ts` |
| `integration-workforce` | `npm run test:integration -- tests/integration/ai/workforcePlannerAgent.integration.test.ts` |

## Execution lanes

| Lane | Purpose | Primary ownership | Concurrency gate |
|---|---|---|---|
| `A` | Workforce ontology contracts + object IO primitives | `convex/ai/workforce/contracts.ts` (new), `convex/ai/workforce/store.ts` (new) | Starts immediately; `A-002` waits for `A-001` |
| `B` | School holiday external API + cache/object merge | `convex/ai/workforce/schoolHolidayClient.ts` (new), `convex/ai/workforce/store.ts` (new) | `B-001` waits for `A-001`; `B-002` waits for `B-001` and `A-002` |
| `C` | Workforce tool suite + registry wiring | `convex/ai/tools/workforcePlannerTools.ts` (new), `convex/ai/tools/registry.ts` | `C-001` waits for `A-002` and `B-002` |
| `D` | Tool scoping + autonomy policy (`collaborative` vs `autonomous`) | `convex/ai/toolScoping.ts`, `convex/ai/agentExecution.ts` | `D-001` waits for `C-003`; `D-002` waits for `D-001` |
| `E` | Fairness scoring + annual plan / rebalance engine | `convex/ai/workforce/fairnessEngine.ts` (new), `convex/ai/workforce/plannerEngine.ts` (new) | `E-001` waits for `A-002` and `D-002`; `E-002` waits for `E-001` and `C-002` |
| `F` | Platform template seeding + subtype rollout | `convex/onboarding/seedPlatformAgents.ts`, `convex/ai/toolScoping.ts` | `F-001` waits for `C-003` and `D-002`; `F-002` waits for `F-001` and `E-002` |
| `G` | End-to-end validation + docs evidence closeout | `tests/unit/ai/*`, `tests/integration/ai/*`, workstream docs | `G-001` waits for `E-002` and `F-002`; `G-002` waits for `G-001` |

## Execution order

1. Wave 1: `WFP-A-001`.
2. Wave 2: `WFP-A-002`.
3. Wave 3: `WFP-B-001`.
4. Wave 4: `WFP-B-002`.
5. Wave 5: `WFP-C-001` -> `WFP-C-002` -> `WFP-C-003`.
6. Wave 6: `WFP-D-001` -> `WFP-D-002`.
7. Wave 7: `WFP-E-001` -> `WFP-E-002`.
8. Wave 8: `WFP-F-001` -> `WFP-F-002`.
9. Wave 9: `WFP-G-001` -> `WFP-G-002`.

## Task queue

| ID | Lane | Plan | Priority | Status | Depends On | Task | Primary files | Verify | Notes |
|---|---|---|---|---|---|---|---|---|---|
| `WFP-A-001` | `A` | `MP §2.1` | `P0` | `READY` | `-` | Define workforce object contract constants + validators for `org_member` extension fields and new object types: `vacation_entry`, `duty_entry`, `workforce_config`, `fairness_ledger`, `school_holiday_cache`. | `convex/ai/workforce/contracts.ts`; `convex/ai/workforce/validators.ts`; `tests/unit/ai/workforceContracts.test.ts` | `npm run typecheck`; `npx tsc -p convex/tsconfig.json --noEmit`; `npm run docs:guard` | Keep object payloads deterministic (`YYYY-MM-DD` dates, normalized enum/status fields, explicit required keys). |
| `WFP-A-002` | `A` | `MP §2.1` | `P0` | `PENDING` | `WFP-A-001` | Implement workforce data store reads/writes over `objects`/`objectActions` for all workforce object types with organization isolation and mutation audit events. | `convex/ai/workforce/store.ts`; `convex/ai/workforce/storeMutations.ts`; `tests/unit/ai/workforceStoreContracts.test.ts` | `npm run typecheck`; `npx tsc -p convex/tsconfig.json --noEmit`; `npm run test:unit -- tests/unit/ai/workforceStoreContracts.test.ts`; `npm run docs:guard` | Include helper for school holiday cache keying by `{bundesland}:{year}` and TTL metadata. |
| `WFP-B-001` | `B` | `MP §2.2` | `P0` | `PENDING` | `WFP-A-001` | Add direct external holiday API client (`fetch_school_holidays`) with normalized response contract and fail-closed error taxonomy. | `convex/ai/workforce/schoolHolidayClient.ts`; `convex/ai/tools/workforcePlannerTools.ts`; `tests/unit/ai/workforceHolidayClient.test.ts` | `npm run typecheck`; `npx tsc -p convex/tsconfig.json --noEmit`; `npm run test:unit -- tests/unit/ai/workforceHolidayClient.test.ts`; `npm run docs:guard` | Provider target: `ferien-api.de` (or compatible endpoint) with Bundesland/year inputs; no silent fallback to stale data. |
| `WFP-B-002` | `B` | `MP §2.2` | `P0` | `PENDING` | `WFP-B-001`, `WFP-A-002` | Persist `school_holiday_cache` objects and merge cached holidays with org `workforce_config.blackoutDates` + optional custom override dates. | `convex/ai/workforce/store.ts`; `convex/ai/workforce/schoolHolidayClient.ts`; `tests/unit/ai/workforceHolidayCacheMerge.test.ts` | `npm run typecheck`; `npx tsc -p convex/tsconfig.json --noEmit`; `npm run test:unit -- tests/unit/ai/workforceHolidayClient.test.ts tests/unit/ai/workforceHolidayCacheMerge.test.ts`; `npm run docs:guard` | Cache policy must be explicit (freshness timestamp + deterministic refresh rules). |
| `WFP-C-001` | `C` | `MP §2.3` | `P0` | `PENDING` | `WFP-A-002`, `WFP-B-002` | Implement read-only workforce tools: `query_workforce_status`, `fetch_school_holidays`, `check_conflicts`, `check_coverage`, `get_fairness_report`. | `convex/ai/tools/workforcePlannerTools.ts`; `convex/ai/workforce/store.ts`; `tests/unit/ai/workforcePlannerTools.test.ts` | `npm run typecheck`; `npx tsc -p convex/tsconfig.json --noEmit`; `npm run test:unit -- tests/unit/ai/workforcePlannerTools.test.ts`; `npm run docs:guard` | All read-only tools must return machine-readable diagnostics for downstream manager review. |
| `WFP-C-002` | `C` | `MP §2.3` | `P0` | `PENDING` | `WFP-C-001` | Implement mutation tools: `propose_vacation_block`, `approve_deny_vacation`, `assign_duty`, `generate_annual_plan`, `rebalance_plan`, `update_workforce_config`. | `convex/ai/tools/workforcePlannerTools.ts`; `convex/ai/workforce/plannerEngine.ts`; `tests/unit/ai/workforcePlannerMutationTools.test.ts` | `npm run typecheck`; `npx tsc -p convex/tsconfig.json --noEmit`; `npm run test:unit -- tests/unit/ai/workforcePlannerMutationTools.test.ts`; `npm run docs:guard` | Preserve manager approval trail for decision actions and include denial alternatives payloads. |
| `WFP-C-003` | `C` | `MP §2.3` | `P0` | `PENDING` | `WFP-C-002` | Register workforce tools in `TOOL_REGISTRY` with deterministic contracts, permissions, and `readOnly` flags where applicable. | `convex/ai/tools/registry.ts`; `convex/ai/tools/contracts.ts`; `tests/unit/ai/workforcePlannerTools.test.ts` | `npm run typecheck`; `npx tsc -p convex/tsconfig.json --noEmit`; `npm run test:unit -- tests/unit/ai/workforcePlannerTools.test.ts`; `npm run docs:guard` | Tool naming must stay stable to avoid scoping drift. |
| `WFP-D-001` | `D` | `MP §2.4` | `P0` | `PENDING` | `WFP-C-003` | Create `workforce_planner` profile in `TOOL_PROFILES` and map subtype default in `SUBTYPE_DEFAULT_PROFILES`. | `convex/ai/toolScoping.ts`; `tests/unit/ai/toolScopingWorkforcePlanner.test.ts` | `npm run typecheck`; `npx tsc -p convex/tsconfig.json --noEmit`; `npm run test:unit -- tests/unit/ai/toolScopingPolicyAudit.test.ts tests/unit/ai/toolScopingWorkforcePlanner.test.ts`; `npm run docs:guard` | Profile must include only workforce planning tools plus required meta/safety tools. |
| `WFP-D-002` | `D` | `MP §2.4` | `P0` | `PENDING` | `WFP-D-001` | Enforce mode semantics via `autonomyLevel`: collaborative mode supports request evaluation + approval flow; autonomous mode enables annual generation/rebalance with review output. | `convex/ai/toolScoping.ts`; `convex/ai/agentExecution.ts`; `tests/unit/ai/workforceAutonomyGating.test.ts` | `npm run typecheck`; `npx tsc -p convex/tsconfig.json --noEmit`; `npm run test:unit -- tests/unit/ai/workforceAutonomyGating.test.ts`; `npm run docs:guard` | Mutating actions must stay fail-closed when autonomy gate is not satisfied. |
| `WFP-E-001` | `E` | `MP §2.5` | `P0` | `PENDING` | `WFP-A-002`, `WFP-D-002` | Implement fairness scoring with weighted metrics (summer weeks 2x, school-holiday weeks 1.5x for parents, duty load, weekend duty, denials). | `convex/ai/workforce/fairnessEngine.ts`; `convex/ai/workforce/store.ts`; `tests/unit/ai/workforceFairnessScoring.test.ts` | `npm run typecheck`; `npx tsc -p convex/tsconfig.json --noEmit`; `npm run test:unit -- tests/unit/ai/workforceFairnessScoring.test.ts`; `npm run docs:guard` | Output must expose component scores + final score and deterministic tie-breakers. |
| `WFP-E-002` | `E` | `MP §2.5` | `P0` | `PENDING` | `WFP-E-001`, `WFP-C-002` | Implement annual planning and rebalance engines honoring staffing minimums, concurrent vacation caps, blackout dates, duty rotations, and fairness priority. | `convex/ai/workforce/plannerEngine.ts`; `convex/ai/workforce/fairnessEngine.ts`; `tests/unit/ai/workforceConflictCoverage.test.ts`; `tests/unit/ai/workforcePlanGeneration.test.ts` | `npm run typecheck`; `npx tsc -p convex/tsconfig.json --noEmit`; `npm run test:unit -- tests/unit/ai/workforceConflictCoverage.test.ts tests/unit/ai/workforcePlanGeneration.test.ts`; `npm run docs:guard` | Planner must return explainable constraint outcomes and suggested alternatives when blocked. |
| `WFP-F-001` | `F` | `MP §2.6` | `P1` | `PENDING` | `WFP-C-003`, `WFP-D-002` | Seed protected template agent with subtype `workforce_planner`, profile `workforce_planner`, and policy defaults for collaborative+autonomous operation. | `convex/onboarding/seedPlatformAgents.ts`; `tests/unit/onboarding/seedPlatformAgents.workforcePlanner.test.ts` | `npm run typecheck`; `npx tsc -p convex/tsconfig.json --noEmit`; `npm run test:unit -- tests/unit/onboarding/seedPlatformAgents.workforcePlanner.test.ts`; `npm run docs:guard` | Preserve idempotent seed behavior and existing protected-template conventions. |
| `WFP-F-002` | `F` | `MP §2.6` | `P1` | `PENDING` | `WFP-F-001`, `WFP-E-002` | Ensure deterministic runtime selection/scoping for `workforce_planner` subtype in agent execution and required-scope resolution metadata. | `convex/ai/agentExecution.ts`; `convex/ai/toolScoping.ts`; `tests/unit/ai/workforcePlannerRuntimeSelection.test.ts` | `npm run typecheck`; `npx tsc -p convex/tsconfig.json --noEmit`; `npm run test:unit -- tests/unit/ai/workforcePlannerRuntimeSelection.test.ts tests/unit/ai/toolScopingWorkforcePlanner.test.ts`; `npm run docs:guard` | Keep additive compatibility for existing subtypes and avoid regressions in specialist fallback. |
| `WFP-G-001` | `G` | `MP §2.7` | `P1` | `PENDING` | `WFP-E-002`, `WFP-F-002` | Add integration coverage for collaborative request handling and autonomous annual plan generation/rebalance paths. | `tests/integration/ai/workforcePlannerAgent.integration.test.ts`; `tests/unit/ai/workforcePlannerTools.test.ts` | `npm run typecheck`; `npx tsc -p convex/tsconfig.json --noEmit`; `npm run test:integration -- tests/integration/ai/workforcePlannerAgent.integration.test.ts`; `npm run docs:guard` | Include both approval and denial-alternative scenarios with deterministic assertions. |
| `WFP-G-002` | `G` | `MP §2.7` | `P1` | `PENDING` | `WFP-G-001` | Close out workstream docs with verification evidence and final status sync across queue artifacts. | `docs/reference_docs/topic_collections/implementation/workforce-planner-agent/TASK_QUEUE.md`; `docs/reference_docs/topic_collections/implementation/workforce-planner-agent/MASTER_PLAN.md`; `docs/reference_docs/topic_collections/implementation/workforce-planner-agent/INDEX.md`; `docs/reference_docs/topic_collections/implementation/workforce-planner-agent/SESSION_PROMPTS.md` | `npm run docs:guard`; `npm run typecheck` | Do not mark `DONE` without row-level verify command results captured in notes. |

## Current READY-first set

1. `WFP-A-001`
