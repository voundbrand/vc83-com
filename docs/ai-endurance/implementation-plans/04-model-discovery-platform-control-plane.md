# 04 Implementation Plan: Model Discovery and Platform Control Plane

<!-- ci:ai-endurance-plan-template=v1 -->

## Objective

Treat model lifecycle management (discover -> validate -> enable -> default -> retire) as a governed control-plane workflow.

## Current state in this codebase

- Discovery and cache update logic: `convex/ai/modelDiscovery.ts`.
- Platform model queries/gating: `convex/ai/platformModels.ts`.
- Settings storage for org defaults: `convex/ai/settings.ts`.
- Schema support in `convex/schemas/aiSchemas.ts` (`aiModels`, `organizationAiSettings`).

## Gaps

- Runtime enforcement does not consistently validate selected model against platform enablement.
- Validation status exists but is not a strict runtime/enablement gate.
- Retired/deprecated model handling policy is not explicit.

## Target state

- Strong lifecycle states: discovered, validated, enabled, default, deprecated.
- Runtime can only use models that pass policy gates.
- Admin workflows support safe rollout and rollback.

## Implementation chunks

1. Define lifecycle policy doc and enum mappings.
2. Enforce enablement + validation checks in chat and agent runtime paths.
3. Add deprecation fields and fallback behavior for retired models.
4. Add admin query endpoints for lifecycle dashboards.
5. Add tests for invalid/disabled/deprecated model selections.

## Validation

- Unit tests for lifecycle policy checks.
- Integration tests for runtime rejection and fallback behavior.
- Manual admin workflow test for enable/disable/default transitions.

## Risks

- Breaking existing org configurations during migration.
- Silent runtime fallback masking misconfiguration.

## Exit criteria

- Runtime uses only policy-compliant models.
- Admin lifecycle transitions are observable and test-covered.
- Deprecation flow works without customer-facing outages.

