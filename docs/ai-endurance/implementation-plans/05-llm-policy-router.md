# 05 Implementation Plan: Unified LLM Policy Router

## Objective

Create one shared policy router for model selection, fallback selection, gating, and runtime defaults used by both chat and agent execution paths.

## Current state in this codebase

- Chat model selection currently relies on legacy fallback path in `convex/ai/chat.ts`.
- Agent model selection and fallback logic lives in `convex/ai/agentExecution.ts`.
- Model enablement query exists in `convex/ai/platformModels.ts`.
- Org default model settings exist in `convex/ai/settings.ts`.

## Gaps

- Model decision logic is duplicated and can drift between chat and agent runtime.
- Legacy `settings.llm.model` path can bypass multi-model governance expectations.

## Target state

- Shared policy module (e.g., `convex/ai/modelPolicy.ts`) used everywhere.
- Deterministic decision order:
  1. explicit runtime request
  2. org default model
  3. system default model
  4. safe fallback model
- Policy checks include platform enablement and validation status.

## Implementation chunks

1. Build pure policy helper module with deterministic decision functions.
2. Add policy tests for legacy and modern settings formats.
3. Integrate chat runtime with policy module.
4. Integrate agent runtime with policy module.
5. Emit structured logs for policy decisions.

## Validation

- Unit tests for all decision branches.
- Integration tests proving chat and agent choose same result for same inputs.
- Negative tests for disabled models.

## Risks

- Regression for orgs with only legacy config fields.
- Fallback loops if chain and policy checks are misordered.

## Exit criteria

- No direct model selection logic duplicated in chat/agent runtime.
- Legacy and modern org settings both supported.
- Policy decisions logged and test-covered.

