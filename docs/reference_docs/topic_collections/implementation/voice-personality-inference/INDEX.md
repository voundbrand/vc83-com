# Voice Personality Inference Index

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/voice-personality-inference`
**Source brief:** Analyze user voice characteristics (tone, speed, inflection, warmth, directness) during Quinn's onboarding interview to infer personality traits that shape the personal agent's behavior.
**Execution mode:** Deterministic queue-first with docs-CI enforcement
**Upstream dependency:** Discovered during One-of-One Operator eval spec conversation (WAE-002a in `web-ai-chat-agent-evals`).

## Canonical files

- Queue: `TASK_QUEUE.md` (to be created when lane activates)
- Session prompts: `SESSION_PROMPTS.md` (to be created when lane activates)
- Master plan: `MASTER_PLAN.md`
- Index: `INDEX.md` (this file)

## Scope summary

Included:

1. Capture prosodic features from user voice during Quinn's onboarding interview (pitch, tempo, energy, warmth).
2. Run personality inference pass that produces typed personality signals (e.g., `{ warmth: 0.8, directness: 0.6, curiosity: 0.9, formality: 0.3 }`).
3. Feed personality signals into the customization passthrough pipeline (→ personal agent creation).
4. Text-based fallback: when voice is unavailable (text-only channels), infer personality from word choice, message length, response speed, and phrasing style.

Excluded:

1. ElevenLabs voice provisioning (handled by `onboarding-customization-passthrough`).
2. Quinn interview redesign (handled separately).
3. Real-time voice emotion during ongoing conversations (future scope — this plan covers onboarding inference only).

## Technical feasibility spectrum

| Approach | Feasibility | What it gives you |
|---|---|---|
| **Text-based inference** (word choice, phrasing, message length) | Works now | Directness, formality, curiosity, verbosity signals |
| **Audio-aware LLMs** (e.g., GPT-4o audio, Gemini audio) | Emerging, usable | Tone, emotion, energy from audio input |
| **Dedicated speech emotion APIs** (e.g., Hume AI, AssemblyAI sentiment) | Available now | Pitch, tempo, valence, arousal, dominance scores |
| **Custom prosodic feature extraction** (librosa / WebAudio API) | Buildable | Raw features (F0, speech rate, pause patterns) for custom model |

Recommended approach: Start with text-based inference (works on all channels), layer in audio-aware LLM analysis for voice channels when available.

## Blocking relationship

This implementation plan blocks the following eval scenarios in `web-ai-chat-agent-evals/agent-specs/one-of-one-operator.md`:

| Eval scenario | What it tests |
|---|---|
| `OOO-015` | Voice tone personality inference — agent personality reflects inferred voice traits |

## Current state

**Status:** `INITIALIZED` — plan stub created, awaiting prioritization and detailed task breakdown.

## Key files (expected touch points)

- `convex/onboarding/seedPlatformAgents.ts` — Quinn interview, completion payload
- `convex/ai/agentExecution.ts` — agent creation (receives personality signals)
- `convex/ai/agentPromptAssembly.ts` — system prompt assembly (personality tuning injection)
- `src/lib/av/runtime/` — voice runtime (audio feature capture point)
- `convex/ai/trustEvents.ts` — personality inference trust telemetry

## Latest update

1. `2026-03-11`: Initialized implementation plan stub. Discovered during One-of-One Operator eval spec conversation (WAE-002a). The idea: analyze the user's voice during Quinn's interview — not just words but tone, speed, inflection — to build a personality profile that shapes the personal agent. Text-based fallback for non-voice channels.
