# 02 Implementation Plan: Tool Registry and Execution Separation

<!-- ci:ai-endurance-plan-template=v1 -->

## Objective

Keep tool capability stable even when model behavior changes by hardening the contract between model outputs and tool execution.

## Current state in this codebase

- Tool definitions and execution live in `convex/ai/tools/registry.ts`.
- Chat executes tools through registry calls in `convex/ai/chat.ts`.
- Agent executes tools in `convex/ai/agentExecution.ts`.

## Gaps

- Tool argument normalization/parsing behavior is duplicated across runtime paths.
- Contract versioning is not explicit for critical tools.
- Error taxonomy is not standardized across all tool executions.

## Target state

- Single normalization and validation path before executing any tool.
- Versioned tool contract metadata for critical tools.
- Standard result/error envelope independent of model provider quirks.

## Implementation chunks

1. Add a shared tool invocation adapter module (`convex/ai/toolBroker` adjacent or new `toolExecutionAdapter.ts`).
2. Move common JSON argument parsing and error wrapping into shared adapter.
3. Add contract version metadata to top priority tools.
4. Ensure both chat and agent paths call shared adapter.
5. Add regression tests for malformed args and recovery behavior.

## Validation

- Unit tests for shared invocation adapter.
- Contract tests for top 10 business-critical tools.
- Cross-model tests using `scripts/test-model-validation.ts` extensions.

## Risks

- Behavior drift for legacy tool responses if migration is partial.
- Hidden assumptions in UI components consuming tool results.

## Exit criteria

- Chat and agent no longer parse tool args independently.
- Versioned metadata exists for critical tools.
- Contract tests prevent regressions across model families.

