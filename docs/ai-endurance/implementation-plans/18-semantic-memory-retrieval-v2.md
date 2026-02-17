# 18 Implementation Plan: Semantic Memory Retrieval and Context Assembly V2

<!-- ci:ai-endurance-plan-template=v1 -->

## Objective

Upgrade the current tag/latest-doc memory retrieval path to semantic retrieval with citations and budget-aware assembly.

## Current state in this codebase

- Org knowledge docs are fetched by tags + recency in `convex/organizationMedia.ts`.
- Context budgeting is handled by `convex/ai/memoryComposer.ts`.
- Runtime injection is performed in `convex/ai/agentExecution.ts`.

## Gaps

- No vector/semantic retrieval layer for organization knowledge.
- No per-chunk citation references in responses/audit payloads.
- Current ordering and relevance selection can over-inject stale or weak context.
- No retrieval confidence telemetry tied to each injected chunk.

## Target state

- Support semantic retrieval of knowledge chunks with tenant-safe filtering.
- Inject only top-ranked relevant chunks under explicit budget.
- Persist citation metadata for runtime/audit transparency.
- Keep fallback path to current retrieval when semantic index is unavailable.

## Implementation chunks

1. Add chunk/index schema for semantic retrieval pipeline.
2. Build ingest/index job for eligible knowledge-base documents.
3. Add retrieval API returning ranked chunks + relevance metadata.
4. Integrate semantic retrieval into `agentExecution.ts` with fallback to existing path.
5. Add citation metadata into message audit logs and retrieval telemetry.

## Validation

- Unit tests for chunking, ranking, and budget selection.
- Integration tests for tenant isolation and fallback behavior.
- Benchmark checks for latency impact and prompt-size reduction.

## Risks

- Embedding/index operations may increase cost and operational complexity.
- Retrieval quality can regress without tuning and evaluation datasets.
- Citation leakage risk if chunk filtering is not tenant-safe.

## Exit criteria

- Runtime uses semantic retrieval by default for indexed org docs.
- Fallback path works when semantic index is unavailable.
- Retrieval telemetry includes chunk rank, source, and citation metadata.
