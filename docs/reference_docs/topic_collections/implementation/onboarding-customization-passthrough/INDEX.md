# Onboarding Customization Passthrough Index

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/onboarding-customization-passthrough`
**Source brief:** Ensure all customization signals collected by Quinn during onboarding (voice preference, personality, context, use case) propagate correctly into the personal agent creation process.
**Execution mode:** Deterministic queue-first with docs-CI enforcement
**Upstream dependency:** Discovered during agent eval spec conversations (WAE-002a in `web-ai-chat-agent-evals`).

## Canonical files

- Queue: `TASK_QUEUE.md` (to be created when lane activates)
- Session prompts: `SESSION_PROMPTS.md` (to be created when lane activates)
- Master plan: `MASTER_PLAN.md`
- Index: `INDEX.md` (this file)

## Scope summary

Included:

1. Voice preference collection during Quinn onboarding interview (male/female selection).
2. Personality and context signal capture during onboarding questions.
3. Data passthrough contract: Quinn's collected signals → `complete_onboarding` → personal agent creation.
4. Predefined voice assignment per language + gender (not random — deterministic mapping).
5. Verification that personal agent reflects collected preferences in first interaction.

Excluded:

1. Quinn interview redesign beyond adding customization questions.
2. ElevenLabs voice provisioning infrastructure (assumes voice IDs are pre-configured).
3. Agent behavioral changes beyond reflecting passed-through customization.

## Blocking relationship

This implementation plan blocks the following eval scenarios in `web-ai-chat-agent-evals/AGENT_EVAL_SPECS.md`:

| Eval scenario | What it tests |
|---|---|
| `Q-007` | Voice preference capture — user picks male/female, agent arrives with correct voice |
| `Q-010` | Customization passthrough — Quinn collects personality/context, personal agent reflects them |

Until this plan delivers, those eval scenarios emit `PENDING_FEATURE` / `SKIPPED` verdicts.

## Current state

**Status:** `INITIALIZED` — plan stub created, awaiting prioritization and detailed task breakdown.

## Key files (expected touch points)

- `convex/onboarding/seedPlatformAgents.ts` — Quinn interview template, `complete_onboarding` handler
- `convex/schemas/interviewSchemas.ts` — interview data model (may need voice/personality fields)
- `convex/ai/agentExecution.ts` — agent creation path (must receive and apply customization)
- `convex/ai/toolScoping.ts` — voice assignment may need scoping awareness

## Latest update

1. `2026-03-11`: Initialized implementation plan stub. Discovered during Quinn eval spec conversation (WAE-002a). Voice preference, personality signals, and context passthrough identified as gaps between Quinn's collection and personal agent creation.
