# 14 Implementation Plan: Coordination Kernel and Turn State Machine

<!-- ci:ai-endurance-plan-template=v1 -->

## Objective

Introduce a Convex-native coordination kernel with explicit turn lifecycle semantics so multi-agent, escalation, and soul-loop behavior are deterministic under concurrency and retries.

## Current state in this codebase

- Runtime is session-centric and action-driven in `convex/ai/agentExecution.ts`.
- Session-level state exists (`errorState`, `escalationState`, `teamSession`) in `convex/schemas/agentSessionSchemas.ts`.
- Audit events are written to `objectActions` via `ai.agentSessions.logAgentAction`.
- There is no explicit turn entity with CAS-style lease semantics.

## Gaps

- No first-class turn state machine (`queued`/`running`/`suspended`/`completed`) for execution control.
- Retries and concurrent deliveries rely on implicit session behavior.
- Team handoff and escalation state transitions are not represented as formal turn transitions.
- No unified turn-level idempotency and replay model.

## Target state

- Add an explicit `AgentTurn` model with deterministic state transitions.
- Enforce single-active-turn semantics per `(sessionId, agentId)` at runtime.
- Ensure every runtime step can be reconstructed from turn + edge records.
- Preserve current product behavior while tightening coordination physics.

## Implementation chunks

1. Define `agentTurns` + `executionEdges` schema contracts and internal APIs.
2. Add lease helpers (`acquire`, `heartbeat`, `release`, `fail`) with optimistic concurrency checks.
3. Introduce turn creation at inbound entry and propagate turn IDs through runtime flow.
4. Convert escalation/handoff checkpoints into explicit turn state transitions.
5. Add deterministic recovery behavior for stale or orphaned turns.

## Validation

- Unit tests for state transition legality and CAS conflicts.
- Integration tests for duplicate inbound delivery and retry/replay behavior.
- End-to-end tests for handoff + escalation across turn boundaries.

## Risks

- Runtime regressions if turn transitions are introduced without compatibility adapters.
- Hidden coupling in existing session helpers may break under strict turn rules.
- Performance overhead from extra writes without careful indexing.

## Exit criteria

- `agentTurns` drives runtime progression for inbound processing.
- Concurrent duplicate processing is prevented by turn lease checks.
- Runtime can recover stalled turns without manual intervention.
