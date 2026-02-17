# 19 Implementation Plan: Soul Loop Drift Scoring and Reflection Unification

<!-- ci:ai-endurance-plan-template=v1 -->

## Objective

Unify duplicated reflection engines and implement drift-aware soul evolution tied to core memory anchors and measurable correction signals.

## Current state in this codebase

- Reflection and metric collection exists in `convex/ai/selfImprovement.ts`.
- Separate reflection path also exists in `convex/ai/soulEvolution.ts`.
- Weekly cron currently triggers `ai.soulEvolution.scheduledReflection`.
- Soul policy includes fields that are not fully enforced.

## Gaps

- Reflection logic is duplicated and can diverge.
- No explicit drift scoring dimensions (identity/scope/boundary/performance).
- No alignment-proposal mode when drift exceeds threshold.
- Policy controls (`maxProposalsPerWeek`, `cooldownBetweenProposals`, min-conversation/session gates) are incomplete.

## Target state

- One reflection orchestration path with consistent policy enforcement.
- Drift scoring integrated into proposal generation context.
- Alignment proposals available when drift is high.
- Proposal generation obeys all configured rate/quality gates.

## Implementation chunks

1. Consolidate reflection scheduling/orchestration into one runtime path.
2. Implement full soul policy enforcement for all configured guard fields.
3. Add drift scoring model and persistence for four drift dimensions.
4. Add alignment proposal pathway for drift remediation.
5. Add dashboard/query endpoints for drift + reflection outcomes.

## Validation

- Unit tests for policy gate enforcement.
- Integration tests for reflection scheduling and proposal lifecycle.
- Regression tests ensuring owner approval flow still works end-to-end.

## Risks

- Reflection quality can degrade if prompts are not calibrated to new fields.
- Overly sensitive drift thresholds can create proposal spam.
- Under-sensitive thresholds can miss meaningful behavior drift.

## Exit criteria

- Only one reflection engine is active in production paths.
- Drift scoring is persisted and visible for operators.
- Proposal generation obeys policy constraints and supports alignment fixes.
