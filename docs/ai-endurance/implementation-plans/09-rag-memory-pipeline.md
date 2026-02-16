# 09 Implementation Plan: RAG and Organization Memory Pipeline

## Objective

Turn org memory into a durable moat by completing retrieval in runtime paths and enforcing scoped, measurable memory usage.

## Current state in this codebase

- RAG direction documented in `docs/layers/AI_COMPOSITION_PLATFORM.md`.
- Agent runtime still has TODO for KB retrieval in `convex/ai/agentExecution.ts`.
- Media and knowledge retrieval building blocks exist in `organizationMedia` flows.

## Gaps

- Agent runtime does not consistently inject real org KB docs.
- Retrieval quality and token/cost controls are not fully enforced.
- Memory relevance is not measured with explicit metrics.

## Target state

- Runtime pipeline:
  1. classify query intent
  2. retrieve scoped org memory
  3. rank/chunk by relevance and budget
  4. inject selected context with provenance metadata

## Implementation chunks

1. Implement KB retrieval call in `agentExecution.ts` and integrate tags filter.
2. Add budget guardrails:
  - max chunks
  - max bytes/tokens injected
3. Add retrieval telemetry:
  - docs retrieved
  - chunks injected
  - bytes/tokens injected
4. Add source provenance formatting in prompt context.
5. Add tests for isolation and tag-scoped retrieval.

## Validation

- Integration tests with synthetic org KB data.
- Multi-tenant isolation tests.
- Quality checks using representative user intents.

## Risks

- Retrieval noise degrading answer quality.
- Token overrun and cost spikes.
- Cross-tenant leakage if filters are incorrect.

## Exit criteria

- TODO removed and production retrieval active.
- Retrieval guardrails enforced in runtime.
- Memory usage and relevance signals available for tuning.

