# 16 Implementation Plan: Harness Runtime Wiring and Team State Semantics

<!-- ci:ai-endurance-plan-template=v1 -->

## Objective

Wire harness-aware runtime context into live execution and align team handoff semantics with formal coordination state.

## Current state in this codebase

- Harness builder exists in `convex/ai/harness.ts`.
- Team handoff execution exists in `convex/ai/teamHarness.ts` and `convex/ai/tools/teamTools.ts`.
- `agentExecution.ts` injects partial handoff context and does active-agent switching.
- `harness.ts` is not currently integrated into runtime prompt assembly.

## Gaps

- Harness self-awareness contract is not consistently applied in runtime.
- Layer-aware role constraints are defined but not enforced through harness injection.
- Team handoff context format is not coupled to a formal runtime contract.
- Team coordination docs and runtime schema semantics can drift.

## Target state

- Runtime system prompt composition includes deterministic harness block.
- Layer/role constraints are enforced through a single harness context path.
- Team handoff state transition and context handover are schema-backed and tested.
- Team coordination docs match runtime behavior exactly.

## Implementation chunks

1. Integrate `buildHarnessContext` into `agentExecution.ts` prompt build path.
2. Add runtime resolution for `determineAgentLayer` inputs and inject layer guardrails.
3. Standardize handoff payload contract (`reason`, `summary`, `goal`) and validation.
4. Add tests for PM -> specialist handoff and specialist continuity behavior.
5. Reconcile `docs/platform/TEAM_COORDINATION.md` with actual schema/runtime behavior.

## Validation

- Unit tests for harness composition and layer resolution logic.
- Integration tests for team handoff continuity in multi-turn sessions.
- Docs guard + manual doc/runtime parity review.

## Risks

- Prompt bloat if harness block is not budgeted.
- Behavior drift if harness wording conflicts with system knowledge blocks.
- Existing teams relying on implicit handoff assumptions may see behavioral changes.

## Exit criteria

- Harness context is injected in production runtime.
- Layer-aware and handoff-aware rules are enforced through one contract.
- Team handoff tests pass and docs reflect exact runtime semantics.
