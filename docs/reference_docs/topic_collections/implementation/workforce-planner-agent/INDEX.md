# Workforce Planner Agent Index (DEV-Only)

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/workforce-planner-agent`  
**Source brief:** 2026-03-17 architecture reset for a standalone, reusable workforce planning agent  
**Current mode:** Deterministic queue-first DEV execution across lanes `A-G`

## Canonical files

- Queue: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/workforce-planner-agent/TASK_QUEUE.md`
- Session prompts: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/workforce-planner-agent/SESSION_PROMPTS.md`
- Master plan: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/workforce-planner-agent/MASTER_PLAN.md`
- Index: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/workforce-planner-agent/INDEX.md`

## Scope guardrails

Included:

- New standalone `org_agent` subtype: `workforce_planner`.
- Generic workforce scheduling + leave-planning domain contracts.
- Separation of workforce planning from the personal operator and its setup surfaces.
- Cleanup of misleading seeded/product entry points currently framing this as `Vacation Delegate Guard`.
- Compatibility bridge from the current Slack + Google Calendar vacation runtime into generic workforce-planner contracts.
- Workforce policy, coverage, fairness, annual planning, and rebalance engines.
- External holiday API + cache integration where useful for staffing/leave policy.
- Protected template seeding, runtime scoping, deterministic integration coverage, and docs closeout.

Excluded:

- Migration/canary/cutover/rollback execution.
- Historical backfills for existing organizations.
- Full scheduler UI application work beyond entry-surface cleanup and agent-positioning corrections.
- Personal-operator feature expansion unrelated to removing workforce-planning drift.

## Architecture direction

1. `workforce_planner` is the deployable reusable agent for employee scheduling, leave planning, staffing coverage, fairness-aware decisions, and schedule rebalancing.
2. Personal operator remains a separate agent for private-life coordination, appointment booking, and related personal workflows with different setup, runtime, and success criteria.
3. Slack, Google Calendar, and future adapters are transport/integration layers for workforce planning, not the domain model itself.
4. Pharmacist-specific policy logic becomes a first vertical template or compatibility layer on top of the generic workforce-planner core.
5. `pack_vacation_delegate_guard` is not the right product surface for employee scheduling and leave management; that surface must be corrected before rollout.

## Architecture reset contract (`WFP-A-001`)

1. `workforce_planner` is the standalone reusable agent for employee scheduling, leave planning, staffing coverage, fairness scoring, and rebalancing.
2. Personal operator is a separate agent with different setup, runtime, and success criteria centered on personal coordination rather than workforce operations.
3. The current pharmacist Slack + Google Calendar vacation flow is a legacy compatibility adapter and first pharmacy template input into `workforce_planner`; it is not the core domain architecture.
4. `pack_vacation_delegate_guard` is the wrong product surface for workforce planning and must be treated as legacy naming drift, not canonical framing.

## Current queue snapshot

| Lane | Queue IDs | Status snapshot |
|---|---|---|
| `A` | `WFP-A-001`, `WFP-A-002` | `DONE`, `DONE` |
| `B` | `WFP-B-001`, `WFP-B-002` | `READY`, `PENDING` |
| `C` | `WFP-C-001`, `WFP-C-002`, `WFP-C-003` | `PENDING`, `PENDING`, `PENDING` |
| `D` | `WFP-D-001`, `WFP-D-002`, `WFP-D-003` | `PENDING`, `PENDING`, `PENDING` |
| `E` | `WFP-E-001`, `WFP-E-002`, `WFP-E-003` | `READY`, `READY`, `PENDING` |
| `F` | `WFP-F-001`, `WFP-F-002`, `WFP-F-003` | `PENDING`, `PENDING`, `PENDING` |
| `G` | `WFP-G-001`, `WFP-G-002`, `WFP-G-003` | `PENDING`, `PENDING`, `PENDING` |

## Ready-first execution list

1. `WFP-B-001`

## Latest evidence update

- `WFP-A-001` completed on 2026-03-17 after publishing the architecture reset contract across the row-owned workstream docs.
- The published contract now states that `workforce_planner` is the standalone reusable agent for employee scheduling, leave planning, staffing coverage, fairness, and rebalancing, while personal operator remains a separate agent with different setup, runtime, and success criteria.
- The pharmacist Slack + Google Calendar vacation flow is now documented as a legacy adapter and first pharmacy template input, not the core domain architecture, and `pack_vacation_delegate_guard` is explicitly called out as the wrong canonical product surface.
- Verification evidence: `npm run docs:guard` (`Docs guard passed.`).
- `WFP-A-002` completed on 2026-03-17 after publishing the legacy-surface migration inventory and classifying the current pharmacist-specific surfaces into core-domain drift, compatibility adapters, template/personal-boundary surfaces, and historical-only references.
- Verification evidence for `WFP-A-002`: exact repo scan `rg -n "pack_vacation_delegate_guard|PHARMACIST|pharmacist|vacation_policy|pharmacist_pto_v1|savePharmacistVacationPolicyConfig|One-of-One Operator" convex src docs/reference_docs/topic_collections/implementation` ✅ (representative hits in `convex/bookingOntology.ts`, `convex/channels/webhooks.ts`, `convex/oauth/slack.ts`, `convex/onboarding/seedPlatformAgents.ts`, `src/components/window-content/agents-window.tsx`, and `docs/reference_docs/topic_collections/implementation/life-operator-one-of-one-cutover/`) plus `npm run docs:guard` ✅ (`Docs guard passed.`).
- `WFP-B-001` is now the deterministic next `READY` row; `WFP-E-001` and `WFP-E-002` are also dependency-unblocked but remain later in queue order.

## Legacy surface inventory snapshot (`WFP-A-002`)

- Core-domain drift: `convex/bookingOntology.ts` still centers pharmacist-specific `vacation_policy` evaluation and `pharmacist_pto_v1` request semantics that must move behind generic `workforce_planner` contracts.
- Adapter layer: `convex/channels/webhooks.ts` and `convex/oauth/slack.ts` preserve the current Slack + Google Calendar intake/setup flow and should remain compatibility adapters, not the domain definition.
- Template and boundary surfaces: `convex/onboarding/seedPlatformAgents.ts` still attaches workforce-vacation setup to the seeded `One-of-One Operator`, while `src/components/window-content/agents-window.tsx` still exposes `pack_vacation_delegate_guard` as the product surface; both require reclassification away from canonical workforce ownership.
- Historical-only references: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/life-operator-one-of-one-cutover/` remains traceability for the pharmacist Slack vacation demo/runtime and first pharmacy template input, not the owner of the generic architecture.

## Milestone criteria

| Milestone | Completion rule |
|---|---|
| `M1 Architecture Reset` | `WFP-A-001` and `WFP-A-002` are `DONE` |
| `M2 Generic Domain Contracts` | `WFP-B-001` and `WFP-B-002` are `DONE` |
| `M3 Policy + Planning Foundation` | `WFP-C-001`, `WFP-C-002`, and `WFP-C-003` are `DONE` |
| `M4 Tool Surface` | `WFP-D-001`, `WFP-D-002`, and `WFP-D-003` are `DONE` |
| `M5 Product Surface Cleanup` | `WFP-E-001`, `WFP-E-002`, and `WFP-E-003` are `DONE` |
| `M6 Runtime Rollout` | `WFP-F-001`, `WFP-F-002`, and `WFP-F-003` are `DONE` |
| `M7 Validation Closeout` | `WFP-G-001`, `WFP-G-002`, and `WFP-G-003` are `DONE` with verify evidence in notes |

## Cross-workstream ownership

1. This workstream owns reusable workforce scheduling, leave planning, fairness, coverage, and related seeded entry cleanup.
2. `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/personal-life-operator-agent/` remains owner of personal operator runtime and setup flows.
3. `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/life-operator-one-of-one-cutover/` remains the historical source for the pharmacist-specific Slack vacation runtime and demo flow, but no longer owns the generic architecture direction.
4. Work that removes workforce-planning drift from `One-of-One Operator`, `pack_vacation_delegate_guard`, and related product surfaces belongs here.

## Required gates

1. `npm run docs:guard`
2. `npm run typecheck`
3. `npx tsc -p convex/tsconfig.json --noEmit`
