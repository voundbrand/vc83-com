# Workforce Planner Agent Master Plan (DEV-Only)

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/workforce-planner-agent`  
**Source brief:** 2026-03-17 architecture reset for a standalone workforce scheduling and leave-planning agent  
**Planning mode:** Queue-first, deterministic, contract-first  
**Scope:** DEV execution only. Migration/canary/promotion/cutover/rollback phases are excluded.

## Objective

Deliver a production-ready workforce planning foundation inside the existing ontology and agent runtime stack:

1. Create a standalone reusable `workforce_planner` agent for employee scheduling, leave planning, coverage management, and fairness-aware rebalancing.
2. Remove workforce planning from the personal-operator product definition and from the misleading `Vacation Delegate Guard` framing.
3. Preserve the current pharmacist Slack + Google Calendar vacation runtime as a compatibility adapter and first vertical template input, not the core domain architecture.
4. Seed, scope, and validate `workforce_planner` as the canonical deployable agent for staffing and leave workflows.

## Architecture principles

1. Core domain:
   `workforce_planner` owns leave requests, shift assignments, workforce policy, staffing constraints, fairness scoring, annual planning, and rebalance logic.
2. Adapter layer:
   Slack, Google Calendar, holiday APIs, and future workforce systems are adapters into the core domain; they must not define the domain vocabulary.
3. Template layer:
   Pharmacy, hospitality, care teams, retail, or other customer-specific policies are vertical templates on top of the generic workforce-planner core.
4. Personal operator boundary:
   Personal operator remains a distinct agent for private-life scheduling, outreach, and personal coordination; it is not the home for employee scheduling.
5. Product-surface integrity:
   Any agent pack, seeded template, or setup flow that positions workforce planning as away-message delegation or personal scheduling must be corrected before rollout.

## Architecture reset contract (`WFP-A-001`)

1. `workforce_planner` is the standalone reusable agent for employee scheduling, leave planning, staffing coverage, fairness-aware coverage decisions, and rebalancing.
2. Personal operator is a different agent with distinct setup, runtime, and success criteria focused on personal scheduling, outreach, and private-life coordination.
3. The current pharmacist Slack + Google Calendar vacation flow is preserved only as a legacy adapter and first pharmacy template input into the generic `workforce_planner` domain.
4. `pack_vacation_delegate_guard` is the wrong product surface for workforce planning and must not remain the canonical framing for this workstream.

## DEV scope boundaries

Included:

- New subtype and protected template for `workforce_planner`.
- Generic workforce data contracts in ontology and compatibility mapping from the current pharmacist runtime.
- Policy, holiday, fairness, coverage, annual-planning, and rebalance engines.
- Tool suite, registry, scoping, and runtime selection support for workforce planning.
- Cleanup of product/seeded entry surfaces that currently misrepresent this use case.
- Deterministic unit/integration validation, including one true end-to-end Slack-vacation bridge test.

Excluded:

- Backfill migrations for existing organizations.
- Shadow/canary/prod rollout choreography.
- Full staffing UI/product application work beyond entry-surface correction.
- Personal-operator feature growth unrelated to removing workforce-planning drift.

## Cross-workstream ownership

1. This workstream owns reusable workforce scheduling and leave-planning architecture.
2. `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/personal-life-operator-agent/` owns the personal operator runtime and setup flows.
3. `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/life-operator-one-of-one-cutover/` is retained as the historical source for the pharmacist-specific vacation runtime and demo evidence.
4. Cleanup of `pack_vacation_delegate_guard`, `One-of-One Operator`, and any related entry-surface drift belongs to this workforce-planner queue because it affects canonical product positioning.

## Lane plan and ownership

| Lane | Focus | Queue IDs | Ownership | Current state |
|---|---|---|---|---|
| `A` | Architecture reset + drift inventory | `WFP-A-001`, `WFP-A-002` | Workstream docs; legacy runtime references | `WFP-A-001 DONE`, `WFP-A-002 DONE` |
| `B` | Generic workforce ontology + compatibility store | `WFP-B-001`, `WFP-B-002` | `convex/ai/workforce/*` (new); compatibility mapping in current runtime surfaces | `READY`, `PENDING` |
| `C` | Policy, holiday, fairness, and planning foundation | `WFP-C-001`, `WFP-C-002`, `WFP-C-003` | `convex/ai/workforce/*` (new) | `PENDING`, `PENDING`, `PENDING` |
| `D` | Workforce tools + registry/scoping | `WFP-D-001`, `WFP-D-002`, `WFP-D-003` | `convex/ai/tools/workforcePlannerTools.ts` (new); `convex/ai/toolScoping.ts` | `PENDING`, `PENDING`, `PENDING` |
| `E` | Product surface cleanup + seeded-entry correction | `WFP-E-001`, `WFP-E-002`, `WFP-E-003` | `src/components/window-content/agents*`; `convex/onboarding/seedPlatformAgents.ts`; docs | `READY`, `READY`, `PENDING` |
| `F` | Template seeding + runtime rollout | `WFP-F-001`, `WFP-F-002`, `WFP-F-003` | `convex/onboarding/seedPlatformAgents.ts`; `convex/ai/agentExecution.ts` | `PENDING`, `PENDING`, `PENDING` |
| `G` | Validation + docs closeout | `WFP-G-001`, `WFP-G-002`, `WFP-G-003` | `tests/integration/ai/*`; workstream docs | `PENDING`, `PENDING`, `PENDING` |

## Plan sections

### §2.1 Architecture reset + migration inventory

1. Publish the contract that `workforce_planner` is the canonical reusable agent for staffing and leave planning.
2. Inventory all current legacy surfaces:
   `pack_vacation_delegate_guard`, `One-of-One Operator`, pharmacist-specific runtime names, and any docs that conflate personal setup with workforce planning.
3. Classify each legacy surface as one of:
   core domain, adapter layer, vertical template, historical-only reference.

## Current execution status

1. `WFP-A-001` is `DONE` as of 2026-03-17 after publishing the architecture reset contract and passing `npm run docs:guard`.
2. `WFP-A-002` is `DONE` as of 2026-03-17 after publishing the legacy-surface migration inventory and passing the exact repo-scan verification plus `npm run docs:guard`.
3. `WFP-B-001` is now the deterministic next `READY` row.
4. `WFP-E-001` and `WFP-E-002` are also dependency-unblocked, but they remain later in queue order.

## Legacy-surface migration inventory (`WFP-A-002`)

Classification rules:

1. Core domain must end at reusable `workforce_planner` scheduling, leave, coverage, fairness, and rebalance contracts.
2. Slack, Google Calendar, and existing owner setup flows may remain as compatibility adapters while the new core contracts land.
3. Pharmacy-specific policy and setup can survive only as a vertical template layer on top of the generic workforce-planner core.
4. Historical one-of-one cutover references remain traceability artifacts and must not define active architecture ownership.
5. Personal operator stays a separate agent boundary and cannot remain the canonical product home for workforce planning.

| Surface | Evidence | Current framing | Target classification | Required migration action |
|---|---|---|---|---|
| Slack vacation ingress and persisted `pharmacist_pto_v1` requests | `/Users/foundbrand_001/Development/vc83-com/convex/channels/webhooks.ts` | Slack intake resolves `vacation_policy`, calls `evaluatePharmacistVacationRequestInternal`, and persists `vacation_request` objects with subtype `pharmacist_pto_v1`. | Adapter layer plus first pharmacy template input | Preserve the live Slack path, but normalize it into generic workforce leave-request envelopes before core workforce evaluation. |
| Pharmacist-specific vacation-policy evaluation in ontology/runtime | `/Users/foundbrand_001/Development/vc83-com/convex/bookingOntology.ts`; verify scan also flags related pharmacist-specific names in `convex/ai/agentExecution.ts` and `convex/ai/trustEvents.ts` | Policy evaluation, blocked reasons, and request semantics still use pharmacist-specific naming at the core decision boundary. | Core-domain drift to replace | Move evaluation into generic `workforce_planner` contracts (`leave_request`, `workforce_policy`, coverage/fairness scoring) with pharmacy rules supplied only as template data. |
| Slack and Google admin setup for pharmacist vacation policy | `/Users/foundbrand_001/Development/vc83-com/convex/oauth/slack.ts`; verify scan also flags dependent settings UI/tool references in `src/components/window-content/integrations-window/slack-settings.tsx` and `convex/ai/tools/interviewTools.ts` | `getPharmacistVacationPolicyConfig`, `savePharmacistVacationPolicyConfig`, and pharmacist role-floor readiness live inside Slack integration setup. | Adapter layer feeding a pharmacy template setup | Keep as a compatibility/admin adapter until workforce-planner setup exists, then rename and rescope away from the canonical workforce architecture. |
| Seeded `One-of-One Operator` template with workforce-vacation tooling | `/Users/foundbrand_001/Development/vc83-com/convex/onboarding/seedPlatformAgents.ts` | The protected personal-operator seed still advertises Slack/vacation-policy onboarding and enables `save_pharmacist_vacation_policy`. | Separate personal-operator boundary; remove workforce ownership | Keep `One-of-One Operator` for personal scheduling/outreach only and move workforce-planning setup/tooling into `workforce_planner` or an explicit pharmacy vertical template. |
| `pack_vacation_delegate_guard` pack and related coverage recommendation | `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/agents-window.tsx`; verify scan also flags `src/components/window-content/agents/agent-recommender.ts` | The visible product surface frames workforce planning as vacation delegation and away-message defense. | Legacy/misnamed product surface to replace; not canonical | Replace with a correctly named workforce scheduling + leave-planning entry surface and retire `pack_vacation_delegate_guard` from canonical framing. |
| Pharmacist vacation contract and demo references in one-of-one cutover docs | `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/life-operator-one-of-one-cutover/PHARMACIST_VACATION_POLICY_CONTRACT.md`; `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/life-operator-one-of-one-cutover/DEMO_PLAYBOOKS.md`; `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/life-operator-one-of-one-cutover/INDEX.md`; `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/life-operator-one-of-one-cutover/TASK_QUEUE.md` | Historical one-of-one workstream still contains the active pharmacist Slack-vacation contract and demo evidence. | Historical-only reference plus pharmacy template source | Keep for traceability and runtime evidence, but point active generic architecture ownership to this workforce-planner workstream. |

### §2.2 Generic domain contracts + compatibility bridge

1. Define generic workforce entities:
   `leave_request`, `shift_assignment`, `workforce_policy`, `staffing_config`, `fairness_ledger`, `holiday_cache`.
2. Build a compatibility-aware store layer so the current Slack vacation flow can be represented in the new domain without creating a parallel ingress stack.
3. Keep business-specific naming out of the new contract boundary.

### §2.3 Policy, holiday, fairness, and planning foundation

1. Add holiday sourcing and cache behavior as optional policy inputs.
2. Implement fairness, staffing-floor, blackout, and conflict evaluation.
3. Implement schedule generation and rebalance so staffing and leave stay in one agent domain.

### §2.4 Workforce tool surface

1. Add read-only tools for visibility and diagnostics.
2. Add mutation tools for leave decisions, policy updates, shift assignment, and schedule generation.
3. Register tools and subtype/profile rules with stable, generic names.

### §2.5 Product surface cleanup

1. Replace the misleading `Vacation Delegate Guard` surface for this use case.
2. Remove workforce-planning ownership from the seeded `One-of-One Operator`.
3. Audit docs and setup references so personal operator and workforce planner remain clearly distinct.

### §2.6 Template seeding + runtime rollout

1. Seed `workforce_planner` as a protected template.
2. Route runtime selection/scoping and current Slack vacation traffic through the new workforce-planner domain.
3. Formalize pharmacy as a vertical template layer on top of the generic workforce planner.

### §2.7 Deterministic validation

1. Add one true end-to-end Slack-vacation bridge integration test.
2. Add generic workforce-planner integration coverage for collaborative and autonomous flows.
3. Close workstream docs only after row-level verification evidence is captured.

## Dependency graph (acyclic)

1. `WFP-A-001` -> `WFP-A-002`
2. `WFP-A-002` -> `WFP-B-001`
3. `WFP-B-001` -> `WFP-B-002`
4. `WFP-B-001` -> `WFP-C-001`
5. `WFP-B-002` + `WFP-C-001` -> `WFP-C-002`
6. `WFP-C-002` -> `WFP-C-003`
7. `WFP-B-002` + `WFP-C-001` -> `WFP-D-001`
8. `WFP-D-001` + `WFP-C-003` -> `WFP-D-002`
9. `WFP-D-002` -> `WFP-D-003`
10. `WFP-A-002` -> `WFP-E-001`
11. `WFP-A-002` -> `WFP-E-002`
12. `WFP-E-001` + `WFP-E-002` -> `WFP-E-003`
13. `WFP-D-003` + `WFP-E-002` -> `WFP-F-001`
14. `WFP-F-001` + `WFP-B-002` -> `WFP-F-002`
15. `WFP-F-002` + `WFP-E-003` -> `WFP-F-003`
16. `WFP-F-002` -> `WFP-G-001`
17. `WFP-D-003` + `WFP-F-002` -> `WFP-G-002`
18. `WFP-G-001` + `WFP-G-002` -> `WFP-G-003`

## Execution waves

1. Wave 1: `WFP-A-001`.
2. Wave 2: `WFP-A-002`.
3. Wave 3: `WFP-B-001`.
4. Wave 4: `WFP-B-002` and `WFP-C-001`.
5. Wave 5: `WFP-C-002` -> `WFP-C-003`.
6. Wave 6: `WFP-D-001` -> `WFP-D-002` -> `WFP-D-003`.
7. Wave 7: `WFP-E-001` + `WFP-E-002` -> `WFP-E-003`.
8. Wave 8: `WFP-F-001` -> `WFP-F-002` -> `WFP-F-003`.
9. Wave 9: `WFP-G-001` -> `WFP-G-002` -> `WFP-G-003`.

## Verification contract

Required gates:

1. `npm run docs:guard`
2. `npm run typecheck`
3. `npx tsc -p convex/tsconfig.json --noEmit`

Targeted test gates:

1. `npm run test:unit -- tests/unit/ai/workforceContracts.test.ts tests/unit/ai/workforceStoreContracts.test.ts`
2. `npm run test:unit -- tests/unit/ai/workforceHolidayClient.test.ts tests/unit/ai/workforceFairnessScoring.test.ts tests/unit/ai/workforceConflictCoverage.test.ts tests/unit/ai/workforcePlanGeneration.test.ts`
3. `npm run test:unit -- tests/unit/ai/workforcePlannerTools.test.ts tests/unit/ai/workforcePlannerMutationTools.test.ts tests/unit/ai/toolScopingWorkforcePlanner.test.ts`
4. `npx vitest run tests/unit/agents/agentRecommender.test.ts tests/unit/agents/agentStorePanel.test.ts tests/unit/onboarding/seedPlatformAgents.workforcePlanner.test.ts`
5. `npx vitest run tests/integration/ai/workforceSlackVacationBridge.integration.test.ts`
6. `npx vitest run tests/integration/ai/workforcePlannerAgent.integration.test.ts`

## READY-first tasks

1. `WFP-B-001`:
   generic workforce domain contracts and validators.

## Acceptance criteria map

| Criterion | Status target | Evidence anchor |
|---|---|---|
| Standalone workforce-planner positioning is explicit | `PASS` | `WFP-A-001`, `WFP-E-001`, `WFP-E-002` |
| Personal operator is clearly separated | `PASS` | `WFP-A-001`, `WFP-E-002`, `WFP-E-003` |
| Generic domain contracts replace business-specific naming at the core boundary | `PASS` | `WFP-B-001`, `WFP-B-002` |
| Leave, staffing, fairness, and scheduling live in one coherent agent domain | `PASS` | `WFP-C-002`, `WFP-C-003`, `WFP-D-002` |
| Seeded/runtime surfaces align to `workforce_planner` | `PASS` | `WFP-D-003`, `WFP-F-001`, `WFP-F-002` |
| Current Slack vacation flow is preserved through the new bridge | `PASS` | `WFP-B-002`, `WFP-F-002`, `WFP-G-001` |
| Vertical-template layering is explicit | `PASS` | `WFP-F-003` |
| Validation and docs closure are complete | `PASS` | `WFP-G-001`, `WFP-G-002`, `WFP-G-003` |
