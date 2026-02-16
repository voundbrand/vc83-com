# 13 Implementation Plan: Control-Plane and Plugin Boundaries

## Objective

Establish clean control-plane boundaries so channels/providers/integrations can evolve without destabilizing core AI runtime.

Reference patterns:
- `docs/agentic_system/OPENCLAW_IDEA_INTEGRATION.md`

## Current state in this codebase

- Core orchestration and channel delivery live in `convex/ai/agentExecution.ts` and `convex/channels/router.ts`.
- Provider implementations are in `convex/channels/providers/`.
- Tool and integration logic spread across `convex/ai/tools/` and provider-specific modules.

## Gaps

- Some provider/runtime concerns are coupled in shared code paths.
- Plugin/extension boundaries are implicit rather than formalized as contracts.
- Failure isolation between control-plane and provider adapters can be improved.

## Target state

- Control-plane core owns:
  - policy
  - routing decisions
  - retries/failover orchestration
  - observability
- Provider/plugin adapters own:
  - provider protocol details
  - payload translation
  - provider-specific retries where appropriate

## Implementation chunks

1. Define interface contracts for provider adapters and integration plugins.
2. Document and enforce separation between control-plane orchestration and adapter logic.
3. Add adapter conformance tests (normalize inbound, send outbound, verify).
4. Add isolation guards so adapter failures cannot corrupt session state.
5. Add architecture decision record (ADR) documenting boundaries.

## Validation

- Contract tests for all registered channel providers.
- Failure-injection tests for provider outage and malformed payloads.
- Recovery tests ensuring session consistency after adapter errors.

## Risks

- Refactor complexity across multiple provider implementations.
- Temporary feature gaps during boundary extraction.

## Exit criteria

- Provider boundaries documented and test-enforced.
- Core runtime remains stable under adapter failure conditions.
- New providers can be added via contract without core runtime edits.
