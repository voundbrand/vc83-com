# ATH-018 Operational Drill Log (2026-03-09)

## Objective

Validate `ATH-002` migration runbook behavior for:

1. dry-run-first execution,
2. deterministic apply gating by `migrationJobId`,
3. idempotent rollback procedure with explicit stop conditions.

## Drill profile

1. Mode: mock simulation (contract/runbook validation, no production writes).
2. Correlation id: `ath018-drill-2026-03-09`.
3. Input cohort model:
   - `managed_clone`: 12
   - `legacy_seeded`: 5
   - `legacy_unmanaged`: 7

## Simulated flow

1. Dry-run inventory
   - Deterministic ordering contract validated (`organizationId` -> `agentId`).
   - Partitioning contract validated (`managed_clone`, `legacy_seeded`, `legacy_unmanaged`).
   - Blocked reason simulation included: `manual_review_required`, `immutable_origin_conflict`.
2. Apply gate checks
   - Confirmed apply is denied without prior dry-run `migrationJobId`.
   - Confirmed blocked rows remain fail-closed during apply projection.
3. Rollback simulation
   - Rollback unit validated as job-scoped (`migrationJobId`).
   - Repeat rollback execution modeled as no-op (idempotent).

## Verification evidence

1. `npm run test -- tests/unit/ai/agentOntologyMutationPaths.test.ts tests/unit/agents/agentToolsConfig.dom.test.ts`
   - Result: pass (`2` files, `28` tests).
2. `npm run docs:guard`
   - Result: pass.

## Risks observed

1. Manual-review queue growth can slow apply windows when `legacy_unmanaged` volume spikes.
2. Seeded immutable-origin conflicts require explicit super-admin override reason discipline.
3. Drift-classifier changes can alter blocked ratios and should trigger pre-apply recalibration.

## Exit decision

Drill status: `PASS`.

Follow-up: keep the workstream in maintenance mode and schedule the next mock drill when migration tooling changes or before first large-scale legacy linkage campaign.
