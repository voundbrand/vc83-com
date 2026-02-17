# 12 Implementation Plan: Human Approval and Escalation Durability

<!-- ci:ai-endurance-plan-template=v1 -->

## Objective

Keep human-in-the-loop controls first-class so reliability is preserved across model upgrades and edge-case failures.

## Current state in this codebase

- Approval queue and execution flow in `convex/ai/agentApprovals.ts`.
- Tool approval creation in `convex/ai/agentExecution.ts`.
- Escalation mechanics in:
  - `convex/ai/escalation.ts`
  - `convex/ai/agentExecution.ts`

## Gaps

- Approval policy consistency between chat and agent paths is incomplete.
- Escalation thresholds need tighter coupling to reliability metrics.
- Operator runbooks are distributed and not centralized.

## Target state

- Unified approval policy with explicit modes:
  - all tools
  - high-risk tools only
  - autonomous (with guardrails)
- Escalation policy tied to measurable triggers and confidence/failure signals.

## Implementation chunks

1. Create shared approval policy resolver used by all runtime paths.
2. Define risk classes for tools and map defaults.
3. Tie escalation triggers to runtime SLO metrics and repeated failure states.
4. Add operator runbook doc for approval/escalation incidents.
5. Add tests for supervised/autonomous/draft-only transitions.

## Validation

- Integration tests for approval queue lifecycle.
- Escalation trigger tests for repeated failures and uncertainty loops.
- Manual operator workflow test.

## Risks

- Approval fatigue if policy is too strict.
- Unsafe autonomy if policy is too loose.

## Exit criteria

- Approval policy behavior is deterministic and test-covered.
- Escalation triggers are measurable and observable.
- Operators have one runbook for intervention and recovery.

