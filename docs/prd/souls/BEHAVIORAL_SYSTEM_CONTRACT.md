# Behavioral System Contract

**Status:** Active contract  
**Last updated:** 2026-02-25

This document defines how we build distinct agent behavior on top of a shared base model.

Canonical formula:

`distinct_behavior = prompt + memory + policy + tools + eval + trust`

Interpretation:

1. The underlying LLM is a shared cognitive substrate.
2. Prompt tone/persona text is necessary but insufficient.
3. Production differentiation must come from deterministic behavior layers, not prompt cosmetics.

---

## Layer Definitions

| Layer | Runtime meaning | Minimum required evidence |
|---|---|---|
| `prompt` | instruction framing and communication style | `systemPrompt`/instruction contract is explicit and versioned |
| `memory` | persistent identity + user context + continuity | stable memory schema and non-overwrite identity rules |
| `policy` | authority, autonomy, and permission ladder | explicit levels (`suggest`, `ask`, `delegated_auto`, `full_auto`) and fail-closed behavior |
| `tools` | action surface and capability limits | scoped tool profile, mutability defaults, and integration requirements |
| `eval` | outcome/quality feedback loop | measurable quality gates and regression checks tied to queue verify commands |
| `trust` | approvals, auditability, and safety governance | non-bypassable approvals, trust events, and rollback path |

---

## Non-Negotiable Rules

1. No soul/operator may claim "distinct behavior" from prompt text alone.
2. Any behavior-affecting change must touch at least one non-prompt layer (`memory`, `policy`, `tools`, `eval`, or `trust`) or explicitly document why it is docs-only.
3. Mutating actions must always be policy-bound and trust-auditable.
4. Global model/provider updates must never overwrite user identity memory.
5. If `trust` evidence is missing for a high-risk action, runtime behavior must fail closed.

---

## Mapping To Current Artifacts

| Layer | Primary contracts in this repo |
|---|---|
| `prompt` | soul templates + runtime prompt assembly (`convex/ai/agentPromptAssembly.ts`) |
| `memory` | soul identity anchors + memory composition (`convex/ai/memoryComposer.ts`) |
| `policy` | one-agent authority + autonomy contracts (`YAI-003`/`YAI-004`/`YAI-008`) |
| `tools` | tool scoping and registry contracts (`convex/ai/toolScoping.ts`, `convex/ai/tools/registry.ts`) |
| `eval` | row verify stacks, conformance suites, and acceptance matrices |
| `trust` | approvals + trust events + telemetry (`convex/ai/agentApprovals.ts`, `convex/ai/trustEvents.ts`) |

---

## Acceptance Gate

Before marking behavioral-contract work `DONE` in queue artifacts:

1. The change references this formula explicitly.
2. At least one non-prompt layer delta is documented with file anchors.
3. Verify commands complete and are recorded in queue notes.

