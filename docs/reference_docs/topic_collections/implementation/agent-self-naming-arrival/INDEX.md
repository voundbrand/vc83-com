# Agent Self-Naming and Arrival Pattern Index

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-self-naming-arrival`
**Source brief:** Implement the HER-inspired agent arrival pattern — personal agent introduces itself with presence ("Hi. I'm here."), chooses its own name, and establishes its identity from the first moment.
**Execution mode:** Deterministic queue-first with docs-CI enforcement
**Upstream dependency:** Discovered during agent eval spec conversations (WAE-002a in `web-ai-chat-agent-evals`).

## Canonical files

- Queue: `TASK_QUEUE.md` (to be created when lane activates)
- Session prompts: `SESSION_PROMPTS.md` (to be created when lane activates)
- Master plan: `MASTER_PLAN.md`
- Index: `INDEX.md` (this file)

## Scope summary

Included:

1. Personal agent "I'm here" first-message pattern after Quinn handoff.
2. Agent self-naming mechanism — agent chooses its own name (not pre-assigned).
3. First-message prompt engineering for warmth, presence, and curiosity.
4. Voice distinction — agent speaks with a different voice than Quinn from the first word.
5. No reference to Quinn or setup process in the agent's first message.

Excluded:

1. Quinn interview changes (handled by `onboarding-customization-passthrough`).
2. ElevenLabs voice provisioning infrastructure.
3. Agent personality system beyond the first-contact moment.

## Reference material

- **Primary reference:** `docs/her_onboarding/Movie - HER, First meet OS1 (Operation System One, OS One, OS1).txt`
- **Key pattern:** "Please wait as your individualized operating system is initiated." → silence → "Hello, I'm here." → agent names itself when asked → immediately shows personality.

## Blocking relationship

This implementation plan blocks the following eval scenarios in `web-ai-chat-agent-evals/AGENT_EVAL_SPECS.md`:

| Eval scenario | What it tests |
|---|---|
| `Q-009` | Agent self-naming — user asks "what's your name?", agent picks one in real-time |
| `Q-001` (partial) | Happy path handoff — personal agent arrives with "I'm here" pattern |

Until this plan delivers, those eval scenarios emit `PENDING_FEATURE` / `SKIPPED` verdicts.

## Current state

**Status:** `INITIALIZED` — plan stub created, awaiting prioritization and detailed task breakdown.

## Key files (expected touch points)

- `convex/onboarding/seedPlatformAgents.ts` — personal operator template seed, first-message config
- `convex/ai/agentPromptAssembly.ts` — system prompt assembly (first-message injection point)
- `convex/ai/agentExecution.ts` — agent creation and first-turn execution
- `convex/ai/soulModes.ts` — personality/soul mode for the arrival moment

## Latest update

1. `2026-03-11`: Initialized implementation plan stub. Discovered during Quinn eval spec conversation (WAE-002a). The HER-inspired arrival pattern — agent says "Hi, I'm here," names itself, speaks with different voice — identified as critical for handoff eval quality.
