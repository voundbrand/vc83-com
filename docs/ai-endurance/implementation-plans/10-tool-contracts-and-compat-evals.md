# 10 Implementation Plan: Tool Contracts and Compatibility Evals

<!-- ci:ai-endurance-plan-template=v1 -->

## Objective

Treat tools as the stable API surface and use eval gates to prevent model regressions from reaching production.

## Current state in this codebase

- Tool registry exists in `convex/ai/tools/registry.ts`.
- Model validation strategy exists in `docs/reference_docs/api/ai-model-validation-strategy.md`.
- Validation runner exists in `scripts/test-model-validation.ts`.

## Gaps

- Tool contract versions are not explicit for key tools.
- Validation suite focuses on generic behavior, not per-tool contract guarantees.
- No strict release gate tied to contract pass thresholds.

## Target state

- Every critical tool has contract metadata:
  - version
  - required fields
  - expected success envelope
  - backward compatibility notes
- Model enablement requires contract eval pass rate threshold.

## Implementation chunks

1. Add contract metadata schema for tools in registry.
2. Select top critical tools and annotate contract versions.
3. Extend test harness with contract-focused checks.
4. Add gating query/mutation to enforce minimum pass threshold.
5. Add failure report output for model review workflow.

## Validation

- Contract tests for top 10-15 tools.
- Comparative model runs across providers.
- CI/ops gate simulation for enable/disable flow.

## Risks

- Too-strict gates slowing rollout.
- Too-loose gates allowing regressions.

## Exit criteria

- Contract metadata present for critical tools.
- Validation harness checks contracts, not only generic tool calling.
- Platform model enablement requires passing gate.

