# 06 Implementation Plan: Dynamic Pricing and Cost Governance

## Objective

Replace static model pricing assumptions with control-plane pricing data and enforce consistent cost accounting across runtime, reporting, and credits.

## Current state in this codebase

- Static cost map exists in `convex/ai/openrouter.ts`.
- Discovered model pricing is stored in `aiModels` via `convex/ai/modelDiscovery.ts`.
- Runtime and credit flows in `convex/ai/chat.ts` and `convex/ai/agentExecution.ts`.

## Gaps

- Runtime can report stale cost if static map diverges from discovered pricing.
- Different code paths can produce inconsistent spend numbers.

## Target state

- Cost resolution service reads from `aiModels` first.
- Controlled fallback behavior when pricing is unknown.
- One shared cost calculation path for chat and agent metrics.

## Implementation chunks

1. Add model pricing resolver module backed by `aiModels`.
2. Refactor `OpenRouterClient.calculateCost` call sites to use resolver.
3. Add warning and telemetry for missing pricing fallback.
4. Align spend reporting and credit deduction calculations.
5. Add regression tests for known-pricing and missing-pricing cases.

## Validation

- Unit tests for pricing resolver.
- Integration tests for chat/agent usage events with expected cost.
- Drift check script comparing static assumptions to discovery cache (one-time migration safety).

## Risks

- Temporary pricing gaps for newly discovered models.
- Under/over-charging if migration is partial.

## Exit criteria

- Static map removed from runtime cost path.
- Cost outputs are consistent across chat, agent, and analytics.
- Missing-pricing behavior is explicit and observable.

