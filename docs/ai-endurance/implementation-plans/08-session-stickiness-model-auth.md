# 08 Implementation Plan: Session Stickiness for Model and Auth Routing

<!-- ci:ai-endurance-plan-template=v1 -->

## Objective

Reduce instability and thrashing by pinning model/auth decisions per session, while still allowing safe escape on sustained failures.

Reference pattern:
- `docs/platform/OPENCLAW_IDEA_INTEGRATION.md` (session stickiness behavior)

## Current state in this codebase

- Session entities exist for both chat and agent contexts:
  - `convex/ai/conversations.ts`
  - `convex/ai/agentSessions.ts`
- Model selection can vary per request depending on runtime call path.

## Gaps

- No explicit per-session pin policy for model choice.
- No session-level auth profile pinning mechanism.
- No consistent unlock conditions after repeated failures.

## Target state

- Session metadata includes:
  - pinned model id
  - pinned auth profile id (if implemented)
  - pin reason and timestamp
  - unlock reason
- Default behavior: sticky by session, rotate only on failover criteria.

## Implementation chunks

1. Add session pin fields (schema + migration strategy if needed).
2. Implement pin resolution utility in policy router.
3. Add unlock rules:
  - explicit user override
  - repeated retry failure
  - model/profile disabled
4. Add telemetry for pin hits vs pin misses.

## Validation

- Unit tests for pin/unpin transitions.
- Integration tests across multi-turn sessions.
- Manual tests for override commands/UI model switch behavior.

## Risks

- Sticky bad choices if unlock criteria are too strict.
- Surprising behavior if user-selected model is silently replaced.

## Exit criteria

- Session runs are stable across turns unless explicit unlock condition occurs.
- Pin behavior observable in logs and metrics.
- Overrides remain predictable to users/operators.
