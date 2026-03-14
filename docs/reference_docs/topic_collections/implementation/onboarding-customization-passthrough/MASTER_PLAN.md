# Onboarding Customization Passthrough Master Plan

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/onboarding-customization-passthrough`
**Source brief date:** 2026-03-11
**Planning mode:** Queue-first, docs-CI-compatible

## Objective

Ensure every customization signal Quinn collects during onboarding flows through to the personal agent creation process, so the agent that arrives after handoff reflects the user's stated preferences from the first moment.

## Current state

1. Quinn runs a multi-step onboarding interview via `convex/onboarding/seedPlatformAgents.ts`.
2. The interview collects workspace name, context, and basic personalization signals.
3. `complete_onboarding` creates the org + personal agent.
4. **Gap:** Voice preference (male/female) is not collected during onboarding.
5. **Gap:** Personality and context signals collected by Quinn are not formally passed through to agent creation properties.
6. **Gap:** No predefined voice-per-language mapping exists for deterministic voice assignment.

## Target state

1. Quinn's interview includes a voice preference question (male/female).
2. Quinn's interview captures personality and context signals that inform agent behavior.
3. `complete_onboarding` receives a structured customization payload: `{ voicePreference, personalitySignals, contextNotes }`.
4. Agent creation applies these: correct voice ID (from predefined language+gender map), personality tuning, initial context.
5. The personal agent's first interaction reflects these choices (correct voice, personality-aware greeting).

## Implementation chunks

### Chunk 1: Voice preference collection

1. Add voice preference question to Quinn's interview template (male/female, with option to skip).
2. Store preference in interview completion payload.

### Chunk 2: Personality and context signal capture

1. Identify which existing Quinn interview signals map to agent personality tuning.
2. Define structured format for personality signals in completion payload.

### Chunk 3: Predefined voice mapping

1. Create deterministic voice ID mapping: `{ language, gender } → voiceId`.
2. One male and one female voice per supported language.
3. Store mapping as a constant (not database-driven) for determinism.

### Chunk 4: Passthrough contract

1. Extend `complete_onboarding` args to accept customization payload.
2. Wire agent creation to apply voice ID, personality tuning, and context from payload.
3. Add unit tests for passthrough integrity.

### Chunk 5: Verification

1. Add integration test: Quinn interview with voice preference → agent created with correct voice ID.
2. Unblock eval scenarios `Q-007` and `Q-010` in `web-ai-chat-agent-evals/AGENT_EVAL_SPECS.md`.

## Risks and mitigations

1. **Risk:** ElevenLabs voice IDs change or become unavailable.
   **Mitigation:** Voice mapping uses stable IDs with fallback to default per language.
2. **Risk:** Personality signal format is too loose to be actionable.
   **Mitigation:** Define a small, typed enum of personality dimensions rather than free-form text.

## Exit criteria

1. Quinn collects voice preference and personality signals.
2. `complete_onboarding` passes structured customization to agent creation.
3. Personal agent arrives with correct voice and personality-aware first message.
4. Eval scenarios `Q-007` and `Q-010` pass.
