# Voice Personality Inference Master Plan

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/voice-personality-inference`
**Source brief date:** 2026-03-11
**Planning mode:** Queue-first, docs-CI-compatible

## Objective

During Quinn's onboarding interview, analyze the user's communication style — through voice characteristics and text patterns — to produce a typed personality signal that shapes how the personal agent behaves, speaks, and relates to the user from the very first interaction.

The agent should match the user. If they're warm, the agent is warm. If they're direct, the agent is direct. The questions Quinn asks can't be direct ("are you warm or business-like?") — instead, the system infers personality from *how* the user answers, not just *what* they say.

## The insight

Quinn's interview questions should be designed to surface personality through indirect signals:
- A user who gives long, story-like answers → warmer, more personal agent
- A user who gives short, direct answers → efficient, task-oriented agent
- A user who asks curious follow-up questions → exploratory, proactive agent
- A user who hesitates or speaks slowly → patient, gentle agent
- A user who speaks fast and decisively → responsive, action-oriented agent

The words reveal intent. The voice reveals character.

## Current state

1. Quinn's interview collects structured answers (workspace name, use case, preferences).
2. Voice runtime exists (`src/lib/av/runtime/`) and can capture audio streams.
3. **Gap:** No personality inference from text patterns during onboarding.
4. **Gap:** No prosodic feature extraction from voice during onboarding.
5. **Gap:** No typed personality signal format in the customization passthrough.

## Target state

1. During Quinn's interview, a background inference process analyzes user responses.
2. Text-based signals are extracted on all channels: word choice, message length, response time, phrasing style, question-asking behavior.
3. On voice channels, prosodic features are additionally captured: speech rate, pitch variation, energy, pause patterns.
4. A typed personality signal is produced: `{ warmth: float, directness: float, curiosity: float, formality: float, patience: float }`.
5. This signal feeds into `onboarding-customization-passthrough` alongside voice preference and context.
6. The personal agent's system prompt, temperature, and interaction style are tuned based on these signals.

## Implementation chunks

### Chunk 1: Personality signal type definition

1. Define the typed personality signal schema (dimensions, ranges, defaults).
2. Define how each dimension maps to agent behavior (prompt tuning, temperature, response length).
3. Document the mapping so it's auditable and tunable.

### Chunk 2: Text-based inference (works on all channels)

1. After Quinn's interview completes, run inference on the full transcript.
2. Extract: average message length, vocabulary richness, question frequency, hedging language, emoji usage, formality markers.
3. Map extracted features to personality signal dimensions.
4. This is the fallback path — always available, even on text-only channels.

### Chunk 3: Voice-based inference (voice channels only)

1. During Quinn's voice interview, capture prosodic features from the user's audio.
2. Options: audio-aware LLM pass, dedicated speech emotion API, or WebAudio feature extraction.
3. Extract: speech rate (words/minute), pitch variation, energy level, pause duration, vocal warmth.
4. Merge with text-based signals (voice signals have higher weight when available).

### Chunk 4: Integration with customization passthrough

1. Personality signal becomes part of the `complete_onboarding` customization payload.
2. Agent creation applies personality tuning: system prompt modifiers, temperature adjustment, response length hints.
3. Personality signal is stored on the agent record for ongoing tuning.

### Chunk 5: Verification

1. Add unit tests: transcript → personality signal extraction (text path).
2. Add integration test: full Quinn interview → personality signal → agent creation with tuned personality.
3. Unblock eval scenario `OOO-015` in `web-ai-chat-agent-evals/agent-specs/one-of-one-operator.md`.

## Risks and mitigations

1. **Risk:** Personality inference is inaccurate or stereotyping.
   **Mitigation:** Keep dimensions behavioral (warmth, directness) not demographic. Use confidence scores — fall back to neutral defaults when confidence is low.
2. **Risk:** Voice analysis adds latency to onboarding.
   **Mitigation:** Run inference asynchronously after each answer, not at the end. Results available by interview completion.
3. **Risk:** Users feel profiled or surveilled.
   **Mitigation:** Personality matching is presented as "your agent learns your style" not "we analyzed your voice." The mechanism is invisible; the outcome is natural.
4. **Risk:** Text-only inference is too weak to be useful.
   **Mitigation:** Design Quinn's questions to maximize indirect signal (open-ended, emotionally resonant). Even "how would you describe your ideal morning?" reveals warmth vs. efficiency.

## Exit criteria

1. Typed personality signal schema is defined and documented.
2. Text-based inference path works on all channels.
3. Voice-based inference path works on voice channels (additive).
4. Personality signal feeds into agent creation through customization passthrough.
5. Eval scenario `OOO-015` passes.
