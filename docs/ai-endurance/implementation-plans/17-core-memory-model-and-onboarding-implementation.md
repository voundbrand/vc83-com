# 17 Implementation Plan: Core Memory Model and Onboarding Implementation

<!-- ci:ai-endurance-plan-template=v1 -->

## Objective

Move core memories from strategy narrative into production data model and onboarding flow, anchoring soul evolution to immutable identity memories.

Primary strategy input:
- `docs/000_NORTH_STAR_ICP/synthesis/GRADUATED-AUTONOMY-STRATEGY.md`

## Current state in this codebase

- Soul model and proposal lifecycle exist in `convex/ai/soulEvolution.ts`.
- Onboarding interview templates exist in `convex/onboarding/seedPlatformAgents.ts`.
- Guided interview execution exists in `convex/ai/interviewRunner.ts`.
- No `coreMemories` field exists in runtime schema/model.

## Gaps

- Core memory data model is unimplemented.
- Onboarding interview does not collect memory narratives.
- No immutable-by-default memory anchor behavior in soul evolution.
- No memory-type taxonomy (`identity`, `boundary`, `empathy`, `pride`, `caution`) in runtime.

## Target state

- Agent soul includes typed `coreMemories` with source metadata and immutability policy.
- Onboarding includes memory elicitation phase and memory approval checkpoint.
- Soul proposals can reference core memories but cannot overwrite anchors silently.
- Core memories are visible in operator review flows.

## Implementation chunks

1. Extend soul schema/model with `coreMemories` and memory metadata.
2. Add onboarding interview phase for memory elicitation and roleplay capture.
3. Add memory distillation step from interview output to structured memory entries.
4. Add memory-aware review UI/query payloads for owner approval.
5. Enforce immutable-by-default behavior in soul update/apply paths.

## Validation

- Unit tests for memory schema validators and mutation constraints.
- Integration tests for onboarding flow generating memory anchors.
- Regression tests ensuring existing soul proposal flow remains functional.

## Risks

- Poor memory distillation quality can create brittle or noisy anchors.
- Overly rigid immutability rules can block legitimate business updates.
- Backward compatibility with agents that already have soul version history.

## Exit criteria

- New agents created via onboarding have core memories recorded.
- Core memories persist through soul proposal cycles without silent mutation.
- Operators can review and trust memory anchors as identity baseline.
