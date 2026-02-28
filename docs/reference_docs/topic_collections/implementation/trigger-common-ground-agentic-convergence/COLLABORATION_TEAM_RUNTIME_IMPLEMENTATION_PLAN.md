# Collaboration Team Runtime Implementation Plan

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/trigger-common-ground-agentic-convergence`  
**Date:** 2026-02-21  
**Scope:** Define implementation-ready contracts for operator group chat + specialist DM collaboration inside the first-party agent runtime while preserving deterministic kernel controls.

---

## Objective

Converge operator collaboration requirements into the TCG runtime track:

1. typed collaboration kernel contract for group thread + DM thread + shared lineage IDs,
2. authority contract where specialists propose and orchestrator commits mutating actions,
3. idempotency/concurrency semantics for multi-thread sessions,
4. unified timeline correlation IDs across group/DM/handoff/commit events,
5. wait/resume token behavior for DM-to-group sync checkpoints.

---

## Non-negotiable constraints

1. Fail closed on missing thread identity, lineage identity, or authority scope.
2. Keep payloads typed and schema-versioned; no free-form runtime string contracts.
3. Preserve existing tenant resolution, privileged role gates, and trust event auditability.
4. Backward compatibility first: no schema-breaking removals in first rollout phase.

---

## Contract set

## 1) Collaboration kernel contract

Add typed collaboration session model:

1. `groupThreadId` (operator-visible primary thread),
2. `dmThreadId` (specialist direct thread, multiple allowed),
3. `lineageId` (stable cross-thread lineage root),
4. `parentThreadId` (DM -> group relationship),
5. `threadRole` (`group`, `dm`),
6. `visibilityScope` (`group`, `dm`, `operator_only`, `system`).

Required invariants:

1. every DM thread must reference one `lineageId` and one `groupThreadId`,
2. every message event must carry `{lineageId, threadId, correlationId}`,
3. orphan DM threads are invalid and rejected.

## 2) Authority contract

Commit authority is explicit:

1. specialists emit `proposal` artifacts only,
2. orchestrator emits `commit` for mutating actions,
3. runtime rejects specialist-origin mutating commits with `blocked_policy`.

Typed authority fields:

1. `authorityRole` (`orchestrator`, `specialist`, `operator`),
2. `intentType` (`proposal`, `commit`, `read_only`),
3. `mutatesState` (boolean),
4. `commitSourceThreadId`,
5. `proposalRefs` (array of proposal IDs used for commit).

## 3) Multi-thread idempotency and concurrency

Concurrency keys extend existing route keys:

1. `tenantId + lineageId + threadId + workflowKey`.

Idempotency scope extends ingress/orchestration keys:

1. `lineageId + threadId + intentType + payloadHash`.

Deterministic conflicts:

1. duplicate `proposal` => replay-safe return,
2. duplicate `commit` => return prior commit result,
3. concurrent commit attempts on same lineage => one winner, others `conflict_commit_in_progress`.

## 4) Timeline correlation contract

All collaboration events emit shared timeline identifiers:

1. `lineageId`,
2. `threadId`,
3. `correlationId`,
4. `eventType` (`group_message`, `dm_message`, `handoff_started`, `handoff_completed`, `proposal_created`, `commit_applied`, `commit_rejected`, `sync_checkpoint_wait`, `sync_checkpoint_resumed`),
5. `eventOrdinal`.

## 5) DM-to-group wait/resume contract

Introduce typed sync checkpoint token:

1. orchestrator issues token when DM result must be synchronized before commit,
2. token includes `lineageId`, `dmThreadId`, `groupThreadId`, `expiresAt`, `issuedForEventId`,
3. commit path requires valid unexpired token where policy requires sync,
4. expired/mismatched token => `blocked_sync_checkpoint`.

---

## Delivery phases

1. Phase 1: contract freeze + schema updates.
2. Phase 2: runtime authority + idempotency/concurrency enforcement.
3. Phase 3: timeline/event correlation and operator surfaces.
4. Phase 4: migration/backfill/rollback and rollout gates.

---

## Verification profile

1. `npm run typecheck`
2. `npm run lint`
3. `npm run test:unit`
4. `npm run test:integration`
5. `npm run docs:guard`

---

## Rollback contract

1. Feature-flag all collaboration commit-gate paths.
2. Rollback disables multi-thread commit gating and reverts to existing handoff-only path.
3. Preserve lineage/event records for audit; do not delete migrated thread metadata.
