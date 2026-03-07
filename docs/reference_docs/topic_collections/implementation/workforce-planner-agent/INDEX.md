# Workforce Planner Agent Index (DEV-Only)

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/workforce-planner-agent`  
**Source brief:** 2026-03-06 implementation request for workforce planning runtime  
**Current mode:** Deterministic queue-first DEV execution across lanes `A-G`.

## Canonical files

- Queue: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/workforce-planner-agent/TASK_QUEUE.md`
- Session prompts: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/workforce-planner-agent/SESSION_PROMPTS.md`
- Master plan: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/workforce-planner-agent/MASTER_PLAN.md`

## Scope guardrails

Included:

- New `org_agent` subtype: `workforce_planner`.
- Workforce scheduling object model using ontology (`vacation_entry`, `duty_entry`, `workforce_config`, `fairness_ledger`, `school_holiday_cache`).
- `org_member` customProperties extension contract for fairness/availability dimensions.
- Workforce planning tools and registry/scoping integration.
- External school holiday API calls with Bundesland-aware caching.
- Autonomy-level mode behavior (`collaborative`, `autonomous`) for planning actions.
- End-to-end deterministic validation and queue closeout docs.

Excluded:

- Migration/canary/cutover/rollback execution.
- Historical data backfills for existing orgs.
- Non-workforce runtime refactors.
- Frontend scheduling UI work.

## Current queue snapshot

| Lane | Queue IDs | Status snapshot |
|---|---|---|
| `A` | `WFP-A-001`, `WFP-A-002` | `READY`, `PENDING` |
| `B` | `WFP-B-001`, `WFP-B-002` | `PENDING`, `PENDING` |
| `C` | `WFP-C-001`, `WFP-C-002`, `WFP-C-003` | `PENDING`, `PENDING`, `PENDING` |
| `D` | `WFP-D-001`, `WFP-D-002` | `PENDING`, `PENDING` |
| `E` | `WFP-E-001`, `WFP-E-002` | `PENDING`, `PENDING` |
| `F` | `WFP-F-001`, `WFP-F-002` | `PENDING`, `PENDING` |
| `G` | `WFP-G-001`, `WFP-G-002` | `PENDING`, `PENDING` |

## Ready-first execution list

1. `WFP-A-001`

## Milestone criteria

| Milestone | Completion rule |
|---|---|
| `M1 Contracts` | `WFP-A-001` and `WFP-A-002` are `DONE` |
| `M2 Holiday Source` | `WFP-B-001` and `WFP-B-002` are `DONE` |
| `M3 Tool Surface` | `WFP-C-001` through `WFP-C-003` are `DONE` |
| `M4 Policy + Fairness` | `WFP-D-001`, `WFP-D-002`, `WFP-E-001`, `WFP-E-002` are `DONE` |
| `M5 Runtime Rollout` | `WFP-F-001` and `WFP-F-002` are `DONE` |
| `M6 Validation Closeout` | `WFP-G-001` and `WFP-G-002` are `DONE` with verify evidence in notes |

## Required gates

1. `npm run docs:guard`
2. `npm run typecheck`
3. `npx tsc -p convex/tsconfig.json --noEmit`
