# Life Operator One-Agent Architecture Playbook

Version: 2026-02-26
Owner: Product + Runtime + Trust
Status: Active operating contract

## Why This Exists

This document keeps us aligned on what we are building:

- One visible operator that the user interacts with.
- Hidden specialist depth routed by capability packs.
- Distinct behavior created by system layers, not by persona copy alone.

If a feature or roadmap item does not strengthen this architecture, it should be paused, reduced, or removed.

## Product Thesis

We are not selling a catalog of many visible agents.
We are selling one user-owned Life Operator that compounds value over time.

The architecture must make this true in runtime behavior, not just in messaging.

## Architecture Formula

Canonical formula:

`distinct_behavior = prompt + memory + policy + tools + eval + trust`

### Layer meaning

1. Prompt: instruction framing and response style.
2. Memory: persistent user context and identity continuity.
3. Policy: permission ladder, authority boundaries, fail-close rules.
4. Tools: action surface, integrations, and execution boundaries.
5. Eval: measurable quality and outcome loops.
6. Trust: approvals, audit events, and rollback safety.

## World-Class Memory Contract

Memory must be implemented as deterministic runtime behavior, not prompt decoration.

### Layered memory model

1. `L1` recent context window: budget-aware message window sized by selected model context length.
2. `L2` rolling summary memory: compact summary built from user messages and verified tool outcomes only.
3. `L3` operator pinned notes: durable operator-authored guidance with deterministic priority order.
4. `L4` structured contact memory: typed durable contact facts/preferences with provenance and reversible merges.
5. `L5` reactivation memory: inactivity-bound continuity cache scoped to exact tenant + channel + contact + route.

### Non-negotiable memory rules

1. Scope safety: read/write must fail closed on org/channel/contact/route mismatch.
2. Source quality: assistant-only claims cannot be persisted as durable memory.
3. Provenance: durable writes carry source references, timestamps, and confidence.
4. Reversibility: durable writes require rollback path and trust-audited mutation evidence.
5. Budget discipline: memory injection is token-budgeted and deterministic across model sizes.
6. User override precedence: explicit user corrections in the current turn override prior memory layers.

### Deterministic write path

1. Extract memory candidates from eligible sources.
2. Apply policy/consent gates.
3. Deduplicate and resolve conflicts with stable merge rules.
4. Persist with provenance and rollback metadata.
5. Emit trust event(s).
6. Refresh runtime memory snapshots/caches.

### Deterministic read path

1. Resolve scope (`org`, `channel`, `contact`, `route`, `session`).
2. Assemble memory in deterministic order (`L3` -> `L2` -> `L5` -> `L4`) under token budgets.
3. Rank by pin priority, recency, and confidence.
4. Inject memory with provenance-aware context blocks.
5. Record retrieval telemetry and fallback reasons.

### Memory acceptance gate

1. Contradiction rate trends down release-over-release.
2. Cross-tenant/cross-org leakage rate is zero.
3. Durable write coverage includes rollback evidence.
4. Memory-layer claims are test-backed and queue-backed before `DONE`.

## What a Soul Means in This System

A soul is not just a personality wrapper.
A soul is the behavioral package for an operator or specialist context.

A soul is valid only when it has all layers:

- Prompt pattern
- Memory shape
- Policy envelope
- Tool scope
- Eval evidence
- Trust governance

If only prompt/persona exists, it is documentation flavor, not runtime differentiation.

## UX Contract

1. One visible operator by default.
2. Hidden specialist routing by capability pack.
3. Direct specialist exposure is optional and advanced.
4. Any mutating action is policy-bound and trust-audited.

## Capability Pack Model

Capability packs are the runtime decomposition of catalog breadth.

Pack schema:

- `packId`
- `userIntentTags`
- `defaultHiddenSpecialists`
- `requiredContext`
- `toolChain`
- `approvalProfile` (`suggest`, `ask`, `delegated_auto`, `full_auto`)
- `trustEvents`
- `availabilityContract` (`available_now` or `blocked`)
- `demoHook`

### Availability behavior

Every pack must return one of:

- `available_now`: can execute now.
- `blocked`: cannot execute, with concrete unblocking steps.

No ambiguous state.
No hand-wavy suggestion.

## Founder Demo Set (First Wave)

1. Email agent and spam filter personal assistant.
2. Work-with-me learning assistant in pocket and Meta glasses.
3. Actionable business administration and proactive daily executive checkup.
4. Todo and shopping list from Meta glasses and iPhone camera.
5. Note taker.
6. Pharmacist vacation scheduler in Slack with policy-based conflict mediation.
7. Complete event manager workflow (creation -> checkout -> invoice -> ticket delivery).

### Demo design rules

- Keep each demo under 7 minutes.
- Show one visible trust checkpoint for mutation-capable flows.
- Show one hidden-specialist delegation moment.
- End with concrete outcome and next action.

## Build Priorities

### Priority A: Runtime truth

- One-operator default path is always first class.
- Legacy marketplace paths fail closed by default.
- Capability gaps are explicit (`available_now` vs `blocked`).

### Priority B: Trust and safety

- Approvals for risky mutations.
- Mandatory trust events for action traces.
- Clear rollback behavior.

### Priority C: Demo reliability

- Stable scripts and deterministic outcomes.
- Rehearsal scorecard gates before customer demos.

## Anti-Patterns (Do Not Reintroduce)

1. Exposing many visible agents as default UX.
2. Claiming differentiation from persona text only.
3. Silent auto-actions without trust evidence.
4. "Maybe available" capability responses without unblocking steps.
5. Demo stories without measurable outputs.

## Decision Filter

Use this filter for roadmap and implementation decisions:

1. Does it improve one visible operator utility?
2. Does it improve one of the six behavior layers?
3. Does it preserve trust and auditability?
4. Does it improve `available_now` execution quality or blocked-path clarity?
5. Can it be demonstrated in under 7 minutes with measurable outcome?

If the answer is mostly no, do not prioritize it now.

## Execution Checklist

Before marking work complete:

1. Layer impact declared (prompt/memory/policy/tools/eval/trust).
2. File anchors linked.
3. Verification commands run.
4. Queue artifacts synchronized.
5. Demo implications captured (if customer-facing).

## Metrics That Matter

1. Task completion rate for one-operator workflows.
2. Approval coverage on mutating actions.
3. Trust event completeness for risky operations.
4. Time to first actionable plan.
5. Blocked-response clarity rate (with concrete unblocking guidance).
6. Demo pass rate across all seven founder scenarios.

## Closing Principle

Knowledge is abundant in base models.
Product advantage comes from controlled behavior, trustable action, and compounding user-specific utility.

That is what we are building.
