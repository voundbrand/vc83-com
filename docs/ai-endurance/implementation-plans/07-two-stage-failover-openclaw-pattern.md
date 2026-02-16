# 07 Implementation Plan: Two-Stage Failover (OpenClaw Pattern)

## Objective

Adopt a two-stage failover architecture:
1) rotate auth profile inside provider first,
2) then fallback to next model only when profile pool is exhausted.

This plan translates patterns from:
- `docs/agentic_system/OPENCLAW_IDEA_INTEGRATION.md`

## Current state in this codebase

- Model fallback exists but is static (`convex/ai/retryPolicy.ts`).
- No explicit auth-profile rotation layer before model fallback.
- Runtime uses a single OpenRouter key path in critical flows.

## Gaps

- Provider-level transient auth/rate-limit failures can prematurely trigger model fallback.
- No profile cooldown/disable state to avoid repeatedly hitting failing credentials.

## Target state

- Failover order:
  1. try preferred auth profile
  2. rotate to next auth profile for same provider
  3. apply cooldown/disable to failing profile
  4. fallback to next model only when provider profile pool is exhausted

## Implementation chunks

1. Introduce auth profile concept in settings/config model (platform-level first).
2. Create profile selection and rotation module with cooldown metadata.
3. Add runtime integration in chat and agent request path.
4. Move model fallback to happen after profile exhaustion.
5. Add persistent failure/cooldown bookkeeping.

## Validation

- Unit tests for profile rotation and cooldown behavior.
- Failure-injection integration tests:
  - auth failure
  - rate limit
  - billing disable
- Observability checks for stage-1 vs stage-2 failover counts.

## Risks

- Added complexity in credential management and migrations.
- Incorrect profile locking can reduce availability.

## Exit criteria

- Runtime can rotate profiles within provider before model fallback.
- Cooldown/disable behavior persists and is auditable.
- Failover metrics clearly separate profile rotation from model fallback.
