# 21 Implementation Plan: AI Runtime Hotspot Refactor V2

<!-- ci:ai-endurance-plan-template=v1 -->

## Objective

Reduce residual fragility in high-churn AI runtime files by extracting cohesive modules around turn orchestration, prompt assembly, and escalation/tool execution flow.

## Current state in this codebase

- `convex/ai/agentExecution.ts` remains a high-churn hotspot.
- `convex/ai/chat.ts` remains large and blends orchestration with formatting logic.
- One seam extraction was completed (`outboundDelivery.ts`), but major orchestration blocks remain monolithic.

## Gaps

- Large function bodies increase regression risk for coordination-kernel adoption.
- Prompt assembly, policy routing, tool execution, and escalation are still tightly coupled.
- Characterization coverage for extracted seams is incomplete.

## Target state

- Runtime hotspots are split into testable modules with stable interfaces.
- Coordination-kernel integration points are isolated behind dedicated adapters.
- Behavior remains unchanged except where explicitly required by queue tasks.

## Implementation chunks

1. Extract prompt/context assembly pipeline module from `agentExecution.ts`.
2. Extract turn orchestration + transition decision helpers.
3. Extract tool execution + approval orchestration into dedicated module.
4. Extract escalation decision/dispatch orchestration into dedicated module.
5. Add characterization tests before/after each extraction seam.

## Validation

- Unit tests for each extracted module.
- Integration AI suite covering inbound processing and fallback flows.
- Typecheck and lint verification after each extraction chunk.

## Risks

- Behavioral drift from extraction order mistakes.
- Circular dependencies between new modules and existing helpers.
- Incomplete characterization tests can miss subtle regressions.

## Exit criteria

- `agentExecution.ts` and `chat.ts` are materially reduced and orchestration concerns are modularized.
- All new seams have direct tests.
- Runtime behavior remains consistent across existing AI integration tests.
