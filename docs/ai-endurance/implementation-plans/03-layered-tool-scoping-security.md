# 03 Implementation Plan: Layered Tool Scoping and Security

## Objective

Strengthen and verify tool access controls so enterprise safety does not degrade as new tools/providers are added.

## Current state in this codebase

- Layered scoping exists in `convex/ai/toolScoping.ts`.
- Autonomy and approval logic exists in `convex/ai/agentExecution.ts`.
- Tool metadata includes read-only and status signals in `convex/ai/tools/registry.ts`.

## Gaps

- Org-level allow/deny behavior is still placeholder in runtime call sites.
- Integration requirement map is static and can drift from actual provider configs.
- No explicit policy test matrix for profile x channel x autonomy combinations.

## Target state

- Fully enforced platform/org/agent/session scoping with clear precedence.
- Policy behavior covered by matrix tests.
- Security posture visible via policy decision logs.

## Implementation chunks

1. Wire org-level tool policy retrieval into runtime (replace empty org arrays).
2. Add policy decision audit logging for each resolved run.
3. Add matrix tests:
   - profile x channel
   - autonomy x readOnly
   - integration-connected vs disconnected
4. Add safeguard checks for newly added tools lacking explicit policy group.

## Validation

- Unit tests for scoping resolver.
- Integration tests in agent runtime for approval and disable paths.
- Manual verification in supervised and draft-only modes.

## Risks

- Over-restriction causing loss of capability.
- Under-restriction causing unsafe writes.

## Exit criteria

- Org-level policy active in runtime.
- Scoping matrix tests green.
- Decision logs available for security review.

