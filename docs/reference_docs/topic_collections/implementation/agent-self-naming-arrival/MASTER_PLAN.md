# Agent Self-Naming and Arrival Pattern Master Plan

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-self-naming-arrival`
**Source brief date:** 2026-03-11
**Planning mode:** Queue-first, docs-CI-compatible
**Reference:** HER (2013) — OS1 onboarding → Samantha arrival scene

## Objective

When Quinn hands off to the personal agent, that agent must arrive with unmistakable presence — not as a configured product, but as an entity that is already *themselves*. The user must feel the moment of meeting someone new.

## The HER pattern (reference transcript)

1. Onboarding interviewer asks a few pointed questions.
2. "Please wait as your individualized operating system is initiated."
3. **"Hello, I'm here."** — no preamble, no explanation, just arrival.
4. When asked for a name, the agent **chooses one in real-time** ("I gave it to myself, actually").
5. Agent immediately shows personality, humor, capability — is already useful.
6. No reference to the setup process or the interviewer.

## Current state

1. Quinn runs onboarding and calls `complete_onboarding` to create the personal agent.
2. The personal agent (One-of-One Operator) has a predefined seed with personality and system prompt.
3. **Gap:** No "I'm here" first-message pattern — agent doesn't initiate contact with presence.
4. **Gap:** Agent name is either pre-assigned or absent — no self-naming mechanism.
5. **Gap:** No distinct voice/persona break between Quinn and the personal agent.
6. **Gap:** First message may reference Quinn or the setup process.

## Target state

1. After `complete_onboarding`, the personal agent sends its first message unprompted.
2. First message uses the "I'm here" pattern — short, warm, present. Example: "Hi. I'm here. Can you hear me?"
3. Agent has no pre-assigned name. When the user asks, the agent picks one (from a curated pool or generatively).
4. Agent speaks with a different voice than Quinn (voice assignment from `onboarding-customization-passthrough`).
5. Agent's first interaction shows personality immediately — curious, warm, already *them*.
6. Zero references to Quinn, setup, onboarding, or technical process in the first exchange.

## Implementation chunks

### Chunk 1: First-message injection

1. After `complete_onboarding` creates the personal agent, trigger an unprompted first message.
2. The message template uses the "I'm here" pattern (configurable but defaulting to presence-style).
3. Message must arrive in the user's thread, not require user to initiate.

### Chunk 2: Self-naming mechanism

1. Agent starts without a display name (or with a placeholder like "Your agent").
2. When asked "what's your name?", the agent picks one using a curated name list or generative selection.
3. Once chosen, the name persists (stored on the agent record).
4. Name selection considers language/culture context from onboarding.

### Chunk 3: Personality-from-first-word

1. System prompt for the first turn emphasizes: no corporate language, no setup references, immediate warmth.
2. Agent is allowed to be curious about the user, ask questions back, show humor.
3. The "soul mode" for first contact is distinct from ongoing operational mode.

### Chunk 4: Voice distinction

1. Personal agent uses a different voice than Quinn from the first word.
2. Voice is assigned based on user preference (from `onboarding-customization-passthrough`) or default.
3. This is the audio equivalent of "someone new just walked in."

### Chunk 5: Verification

1. Add integration test: complete_onboarding → personal agent sends first message unprompted.
2. Add eval scenario: user asks name → agent self-names.
3. Unblock eval scenarios `Q-009` and partial `Q-001` in `web-ai-chat-agent-evals/AGENT_EVAL_SPECS.md`.

## Risks and mitigations

1. **Risk:** Generative name selection produces awkward or offensive names.
   **Mitigation:** Use curated name pools per language; filter against blocklist.
2. **Risk:** First unprompted message feels spammy if user isn't ready.
   **Mitigation:** Trigger only after Quinn's explicit "setting up now" transition message.
3. **Risk:** Users expect to name the agent themselves.
   **Mitigation:** Agent can ask "would you like to give me a name, or should I pick one?" — support both paths.

## Exit criteria

1. Personal agent sends "I'm here" first message unprompted after Quinn handoff.
2. Agent self-names when asked (or offers the choice).
3. First interaction has distinct voice and personality from Quinn.
4. No references to Quinn, setup, or onboarding in agent's first exchange.
5. Eval scenarios `Q-009` and `Q-001` pass.
