# 01 Implementation Plan: Knowledge -> Recipes -> Skills

## Objective

Make the `knowledge + recipes + skills` model the operational source of truth for AI composition across chat, builder, and agent workflows.

## Current state in this codebase

- Strategy is documented in `docs/agentic_system/AI_COMPOSITION_PLATFORM.md`.
- Skills content exists in `convex/ai/systemKnowledge/skills/`.
- Composition docs exist in `convex/ai/systemKnowledge/composition/`.
- Runtime loading paths differ by context and are not fully unified (`convex/ai/chat.ts`, `convex/ai/agentExecution.ts`).

## Gaps

- No single contract that guarantees consistent knowledge loading per context.
- Recipe-to-tool mapping is partially implicit in prompts/docs.
- Missing explicit tests validating that intended skills are loaded for specific intents.

## Target state

- One deterministic knowledge loading pipeline with explicit context modes.
- Documented and testable mapping: intent -> recipe -> tool set.
- Composition behavior reproducible across model changes.

## Implementation chunks

1. Define a typed composition loader contract in `convex/ai/systemKnowledge/index.ts`.
2. Create an explicit intent-to-skill map artifact under `convex/ai/systemKnowledge/composition/`.
3. Wire both chat and agent paths to shared loader entry points.
4. Add tests for deterministic knowledge selection by intent and mode.
5. Add observability counters for loaded docs, recipes, and skills per run.

## Validation

- Unit tests for loader determinism.
- Integration tests for representative intents (lead gen, booking, webinar).
- Snapshot checks for loaded knowledge set by mode.

## Risks

- Token budget inflation from over-loading knowledge.
- Divergence between docs and runtime mapping.
- Hidden prompt dependencies in existing flows.

## Exit criteria

- Shared loader used by chat and agent runtime.
- Intent-to-skill mapping test suite green.
- Knowledge loading metrics visible in logs/analytics.
