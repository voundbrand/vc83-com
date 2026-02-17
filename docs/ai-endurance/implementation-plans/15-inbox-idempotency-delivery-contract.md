# 15 Implementation Plan: Inbox Receipts, Idempotency, and Delivery Contract

<!-- ci:ai-endurance-plan-template=v1 -->

## Objective

Adopt the most valuable protocol borrow from CommonGround: durable inbox receipts as execution truth, idempotent processing keys, and one terminal deliverable contract per turn.

Reference source:
- `docs/reference_projects/CommonGround/docs/EN/04_protocol_l0/state_machine.md`
- `docs/reference_projects/CommonGround/docs/EN/04_protocol_l0/nats_protocol.md`

## Current state in this codebase

- Inbound events are processed directly through action flow in `convex/ai/agentExecution.ts`.
- Session messages and action logs provide audit, but not receipt-level replay boundaries.
- Dead-letter queue exists for outbound failures in `convex/ai/deadLetterQueue.ts`.

## Gaps

- No durable inbound receipt row that records accepted/processing/completed semantics.
- Idempotency is partial and path-specific.
- No strict “one terminal deliverable per turn” contract.
- Replay and duplicate handling depend on path-specific conditions.

## Target state

- Introduce receipt table(s) for inbound processing with clear status progression.
- Require idempotency key per inbound message and dedupe at receipt write.
- Persist terminal deliverable metadata once per turn.
- Expose replay-safe query paths for support/debug tooling.

## Implementation chunks

1. Add `agentInboxReceipts` schema with idempotency key and status lifecycle.
2. Write receipt-first ingress helper used by all supported channels.
3. Implement dedupe/ack behavior for duplicate delivery attempts.
4. Persist one terminal deliverable pointer per turn on success/failure paths.
5. Add operational queries for receipt aging, stuck rows, and duplicates.

## Validation

- Unit tests for idempotency dedupe and status transitions.
- Integration tests simulating duplicate inbound webhook delivery.
- Regression tests ensuring existing channel flows still return responses.

## Risks

- Channel handlers may bypass receipt helper if migration is incomplete.
- Backfill/migration complexity for in-flight sessions.
- Overly strict idempotency keys can block legitimate retries if key design is poor.

## Exit criteria

- All inbound AI runtime paths are receipt-first.
- Duplicate deliveries are acknowledged without duplicated side effects.
- Terminal deliverable record exists exactly once per turn.
