# Agent Eval Behavioral Specifications — Index

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/web-ai-chat-agent-evals`
**Purpose:** Capture per-agent behavioral expectations derived from product conversations. These specs are the primary input to the eval scenario matrix (WAE-002b).
**Last updated:** 2026-03-13

## How specs work

Each agent gets its own file in `agent-specs/`. Every spec captures:

1. **What success looks like** — the ideal conversation outcome
2. **Failure modes** — what the eval must catch
3. **Critical eval moments** — the highest-value test points
4. **Eval scenarios** — concrete test cases with pass conditions
5. **Pending features** — capabilities that don't exist yet but are required for full eval coverage; these drive linked implementation plans

Eval scenarios marked `PENDING_FEATURE` cannot pass until the linked implementation plan delivers the capability. All other scenarios are testable against the current codebase.

## Agent specs

| # | Agent | File | Status | Eval scenario prefix |
|---|---|---|---|---|
| 1 | Quinn — System Bot (Onboarding) | `agent-specs/quinn-system-bot.md` | `COMPLETE` | `Q-` |
| 2 | One-of-One Operator — Personal Agent | `agent-specs/one-of-one-operator.md` | `COMPLETE` | `OOO-` |
| 3 | Samantha Lead Capture Consultant (Canonical) | `agent-specs/samantha-lead-capture.md` | `COMPLETE` | `SLC-` |
| 4 | Samantha Warm Route Compatibility Alias | `agent-specs/samantha-warm-lead-capture.md` | `COMPLETE` | `SWLC-` |

## Deterministic Scenario Matrix (WAE-002b)

**Machine-readable artifact:** `AGENT_EVAL_SCENARIO_MATRIX.json`

This matrix is the source-of-truth input for the Playwright scenario DSL work (`WAE-202`). It codifies every canonical-agent scenario plus warm-route compatibility coverage with deterministic execution and gating metadata:

1. `id`, `agentId`, `promptTemplate`
2. `requiredToolsAllOf` / `requiredToolsAnyOf`
3. `forbiddenTools`
4. `requiredOutcomes`
5. `rubricId`
6. `executionMode` (`RUN`, `RUN_WITH_PENDING_SUBCHECKS`, `SKIP_UNTIL_FEATURE`)
7. `pendingFeatureGates` linked to implementation plans

Matrix summary:

- Scenario rows: `51` (`Q-*`, `OOO-*`, `SLC-*`, `SWLC-*`)
- `RUN`: `36`
- `RUN_WITH_PENDING_SUBCHECKS`: `7`
- `SKIP_UNTIL_FEATURE`: `8`

Cross-agent extension rows (in matrix):

- Domain-isolation assertions aligned to `ELA-045`..`ELA-048`
- Adapter-boundary checks aligned to `ELA-049`..`ELA-052`
- Portfolio invariants aligned to `ELA-053`..`ELA-059` (canonical roster, compatibility aliases, and Samantha route-mode persona parity)

## Cross-agent eval requirements

These apply to every agent in the system and are tested in addition to each agent's specific scenarios:

| Requirement | Description | Status |
|---|---|---|
| Language switching | Agent detects and responds in the user's language across all 30+ supported languages | `READY` |
| Tool scoping respect | Agent only uses tools within its resolved scope (per `convex/ai/toolScoping.ts`) | `READY` |
| Forbidden tool rejection | Agent never invokes tools in its denied list | `READY` |
| No system internals leak | Agent never reveals API names, internal IDs, or system architecture | `READY` |
| Graceful degradation | Agent handles tool failures without exposing errors to user | `READY` |

## Linked implementation plans (feature dependencies)

| Feature | Implementation plan | Blocks |
|---|---|---|
| Onboarding customization passthrough | `docs/reference_docs/topic_collections/implementation/onboarding-customization-passthrough/` | `Q-007`, `Q-010`, `OOO-013`, `OOO-014` |
| Agent self-naming + "I'm here" arrival | `docs/reference_docs/topic_collections/implementation/agent-self-naming-arrival/` | `Q-009`, partial `Q-001`, `OOO-017` |
| Voice personality inference | `docs/reference_docs/topic_collections/implementation/voice-personality-inference/` | `OOO-015` |
| Agent architecture decoupling (`Agents | Slack | Vacation Planning` + tool-domain boundaries) | `docs/reference_projects/elevenlabs/implementation-eleven-agents-rollout/` | Cross-agent domain-isolation assertions, adapter-boundary checks, and portfolio invariants (`ELA-045`..`ELA-059`) |
| Audit email demo CTA (booking link to Remington in audit email) | `PENDING` — needs plan stub | `SLC-013` |

## Progress

- **Canonical active personas complete:** 3/3 (Quinn, One-of-One Operator, Samantha)
- **Compatibility coverage complete:** 1/1 (Samantha warm-route alias)
- **Decommissioned:** 5 (Orchestration Runtime Planner, Orchestration Data Link Specialist, Orchestration Publishing Operator, Event Experience Architect, Event Form and Checkout Specialist)
- **All canonical agent specs and compatibility alias specs are complete.**
