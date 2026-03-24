# Org Agent Action Runtime Master Plan

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/org-agent-action-runtime`  
**Last updated:** 2026-03-23

---

## Objective

Deliver a full org-owned agent activity/action runtime that:

1. captures structured outcomes from telephony, webchat, and follow-up execution,
2. writes canonical CRM data into the platform before any outbound sync,
3. creates immutable activity records and separate actionable work items,
4. supports owner approval, assignment, completion, takeover, and retry,
5. allows low-risk agent auto-execution under explicit org policy,
6. preserves auditability, receipts, retries, idempotency, and telemetry end to end.

---

## Why this stream exists

Current repository state:

1. `convex/crmOntology.ts` and `convex/crmIntegrations.ts` already manage canonical CRM objects and write `objectActions`.
2. `convex/ai/agentSessions.ts`, `convex/ai/conversations.ts`, and `convex/api/v1/conversations.ts` already own session routing, conversation lifecycle, and human message injection.
3. `convex/ai/agentApprovals.ts` already provides approval artifacts and human-in-the-loop gating.
4. `convex/integrations/telephony.ts` and `src/lib/telephony/agent-telephony.ts` already manage org telephony routing and provider/template configuration.
5. `convex/activityProtocol.ts` and `convex/ai/trustTelemetry.ts` already provide event tracing and trust telemetry.
6. Existing operator surfaces already expose approval and control-center patterns in `src/components/window-content/agents/*` and `src/components/window-content/super-admin-organizations-window/agent-control-center-tab.tsx`.

Strategic gap:

1. There is no first-class runtime artifact for immutable org-agent business activity.
2. There is no separate mutable work-item contract for owner review, assignment, or completion.
3. Telephony, webchat, and follow-up execution do not yet converge on one structured outcome model.
4. External CRM sync is not yet modeled as a strict downstream outbox from canonical platform state.
5. Org policy for owner-only versus approval-required versus auto-allowed action execution is not yet centralized.

This stream closes those gaps without replacing existing platform primitives.

---

## Scope

Internal-only V1 in scope:

1. Structured outcome capture for telephony, webchat, and follow-up execution.
2. Canonical platform CRM projection before outbound sync.
3. Immutable activity objects and mutable action-item objects with linked `objectActions`.
4. Org policy resolution, approval reuse, owner Action Center, and activity timeline UI.
5. Low-risk auto-execution for narrow internal actions only.
6. Narrow external CRM sync breadth: contact/org upsert plus note/activity append.
7. Receipts, retries, idempotency, telemetry, migration, and rollout gates.

Out of scope for internal-only V1:

1. Broad external CRM task/action execution.
2. Replacing conversations, approvals, or human takeover with a parallel subsystem.
3. Keeping Veronica telephony on a standalone receptionist prompt path.
4. UI-local mutation logic that bypasses canonical backend action contracts.

---

## Architecture decisions

### 1. Canonical state first

1. The platform remains the mutation authority for CRM objects, activities, action items, approvals, and receipts.
2. External CRM writes are downstream projections only.
3. Connector failures may delay downstream sync, but must not roll back canonical platform history.

### 2. Activity is immutable, work is mutable

1. `org_agent_activity` is append-only and models facts: outcome captured, approval requested, execution failed, sync succeeded, takeover started, and similar events.
2. `org_agent_action_item` is mutable and models owner workflow state: pending review, assigned, approved, executing, completed, failed, canceled.
3. Every action-item state change emits a new immutable activity row.

### 3. Telephony is an operator-runtime ingress, not a separate product

1. Veronica-style telephony agents must enter via the existing One-of-One Operator runtime.
2. Telephony transcripts, call outcomes, transfer events, and takeover markers must resolve to `agentSessions` and conversations.
3. The telephony provider remains an ingress transport, not a second canonical state machine.

### 4. Existing primitives are reused before new subsystems

1. User-visible business artifacts should live in `objects`, `objectLinks`, and `objectActions`.
2. Existing approval and HITL patterns stay authoritative.
3. Dedicated system tables are reserved for queue-heavy concerns such as retryable outbox jobs or execution attempts.

---

## Canonical entity model

| Entity | Storage strategy | Purpose | Key invariants |
|---|---|---|---|
| `org_agent_activity` | ontology object + `objectLinks` + `objectActions` | immutable business/event history | append-only; one row per event; never re-opened |
| `org_agent_action_item` | ontology object + `objectLinks` + `objectActions` | owner/agent actionable work | stateful; linked to source activity and target CRM objects |
| policy snapshot | embedded on activity/action-item payloads plus policy resolver module | explains why a decision was `owner_only`, `approval_required`, or `agent_auto_allowed` | snapshot stored on write so later policy edits do not rewrite history |
| execution receipt | dedicated table plus linked activity | replay-safe execution attempt details | idempotency key required; attempts correlated to action item and session |
| sync outbox job | dedicated table plus linked activity | downstream CRM projection queue | retries are safe and connector-agnostic |
| external identity binding | dedicated table or link set | maps canonical platform object IDs to external CRM record IDs | canonical platform object always wins on conflict |

Recommended activity kinds:

1. `session_outcome_captured`
2. `crm_projection_applied`
3. `action_item_created`
4. `approval_requested`
5. `approval_resolved`
6. `action_assigned`
7. `execution_started`
8. `execution_succeeded`
9. `execution_failed`
10. `human_takeover_started`
11. `human_takeover_resumed`
12. `external_sync_dispatched`
13. `external_sync_succeeded`
14. `external_sync_failed`

---

## Runtime flow

1. Ingress arrives from telephony, webchat, or follow-up runtime.
2. `agentSessions` and conversations resolve the canonical session and message history.
3. Structured outcome extraction produces a channel-agnostic outcome envelope.
4. Canonical CRM projection writes platform CRM state first.
5. Immutable activity is written for the outcome and CRM projection.
6. Action-item generation creates mutable owner work only when unresolved work remains.
7. Policy engine resolves `owner_only`, `approval_required`, or `agent_auto_allowed`.
8. Owner Action Center or low-risk auto-runner executes through the shared preview-to-receipt contract.
9. Downstream CRM sync outbox projects allowed changes outward.
10. Every stage emits immutable activity plus operational telemetry and receipts.

---

## Channel and owner workflow model

| Path | Entry surface | Canonical runtime | Owner touchpoint | Notes |
|---|---|---|---|---|
| Telephony | `convex/integrations/telephony.ts` | One-of-One Operator runtime via `agentSessions` | Action Center + takeover flows | Veronica-style calls must not bypass session routing |
| Webchat | `/api/v1/webchat/*` and conversations | `agentSessions` + conversations | Action Center + in-thread takeover | Must emit same outcome contract as telephony |
| Follow-up execution | internal action runner | `orgAgentFollowUpRuntime` + action items | Action Center retry/review | Used after original conversation ends |

Owner actions that must be supported:

1. approve
2. reject
3. assign
4. complete
5. retry
6. take over
7. resume agent

---

## Policy and approval model

Policy families:

1. `owner_only`: agent may propose, but only owner/human execution is allowed.
2. `approval_required`: agent may preview and queue for approval, but cannot execute until approved.
3. `agent_auto_allowed`: agent may execute only when the action is inside the low-risk allowlist and all contract checks pass.

Required dimensions for the resolver:

1. action family
2. risk level
3. channel source
4. org-level policy
5. agent-level overrides
6. target system class (`platform_internal` versus `external_connector`)

Approval posture:

1. Reuse `agentApprovals` and approval-style patterns.
2. Persist approval state as linked artifacts in the same timeline.
3. Missing approval evidence, missing policy snapshot, or missing idempotency key must fail closed.

---

## API and UI surfaces

Backend surfaces:

1. Extend `convex/ai/agentSessions.ts` and `convex/ai/conversations.ts` with outcome checkpoints and action-runtime hooks.
2. Extend `convex/api/v1/conversations.ts` for session/action context and takeover parity.
3. Extend `convex/api/v1/crm.ts` only for narrow downstream sync breadth and canonical CRM projections.
4. Add new internal modules for activities, action items, policy resolution, execution receipts, and sync outbox.

UI surfaces:

1. Action Center list and detail workflow under `src/components/window-content/agents/*`.
2. Immutable activity timeline under agents and CRM detail surfaces.
3. Control-center and trust-cockpit extensions for policy basis, receipts, and blocked retry reasons.
4. CRM detail embeds for contact and organization context.

---

## External CRM sync architecture

1. Canonical platform CRM writes finish first.
2. A connector-agnostic outbox job is created from canonical state deltas.
3. External identity bindings map platform object IDs to downstream record IDs.
4. Narrow V1 outward sync covers contact/org upsert and note/activity append only.
5. Broader connector-side action execution is a separate gated phase after internal-only V1.

Failure handling:

1. Outbound failures create activity plus receipts and remain retryable.
2. Connector retries must be idempotent.
3. External conflicts do not rewrite canonical platform history.

---

## Observability, receipts, retries, and idempotency

Required reliability contract:

1. one correlation chain from session to activity to action item to receipt to sync job,
2. explicit idempotency key on every execution and sync attempt,
3. replay-safe receipts for action execution and outbound sync,
4. activity protocol events for operational visibility,
5. trust telemetry for policy, approval, and failure-path diagnostics.

This gives three distinct layers:

1. `org_agent_activity` for user-visible immutable business history,
2. `objectActions` for audit trail on mutations,
3. `activityProtocol` and trust telemetry for operational diagnostics.

---

## Acceptance criteria mapped to queue rows

| Acceptance criterion | Queue rows | Verification profiles |
|---|---|---|
| Canonical architecture, lanes, and internal-only V1 gates are frozen | `OAR-001`, `OAR-002` | `V-DOCS` |
| Immutable activity and mutable action-item schema contract exists | `OAR-003`, `OAR-005` | `V-TYPE`; `V-UNIT-CONTRACT`; `V-DOCS` |
| Structured outcomes are captured for telephony, webchat, and follow-up | `OAR-004`, `OAR-008`, `OAR-009`, `OAR-010` | `V-TYPE`; `V-UNIT-INGRESS`; `V-INTEG-RUNTIME`; `V-DOCS` |
| Canonical CRM writes happen before any outbound sync | `OAR-006`, `OAR-019` | `V-TYPE`; `V-UNIT-SYNC`; `V-DOCS` |
| Org policy, approval, and auto-execution contracts are enforced | `OAR-011`, `OAR-012`, `OAR-013`, `OAR-014` | `V-TYPE`; `V-UNIT-POLICY`; `V-UNIT-OBS`; `V-DOCS` |
| Owner Action Center and immutable timeline are usable | `OAR-015`, `OAR-016`, `OAR-017`, `OAR-018` | `V-TYPE`; `V-UNIT-UI`; `V-E2E-TRUST`; `V-DOCS` |
| Narrow external CRM sync V1 is stable and auditable | `OAR-020` | `V-TYPE`; `V-UNIT-SYNC`; `V-INTEG-RUNTIME`; `V-DOCS` |
| Receipts, retries, idempotency, and telemetry are complete | `OAR-022`, `OAR-023` | `V-TYPE`; `V-UNIT-OBS`; `V-DOCS` |
| Migration, test matrix, and rollout evidence are complete | `OAR-024`, `OAR-025`, `OAR-026` | `V-INTEG-RUNTIME`; `V-E2E-TRUST`; `V-E2E-DESKTOP`; `V-DOCS` |

---

## Lane execution map

| Lane | Rows | Outcome |
|---|---|---|
| `A` | `OAR-001`, `OAR-002` | Docs baseline and queue contract frozen |
| `B` | `OAR-003`, `OAR-004`, `OAR-005`, `OAR-006` | Canonical contracts, outcomes, activities, and platform-first CRM projection |
| `C` | `OAR-007`, `OAR-008`, `OAR-009`, `OAR-010` | Telephony/webchat/follow-up runtime convergence |
| `D` | `OAR-011`, `OAR-012`, `OAR-013`, `OAR-014` | Policy, approvals, execution, and low-risk auto-runner |
| `E` | `OAR-015`, `OAR-016`, `OAR-017`, `OAR-018` | Owner Action Center, timeline, and embedded surfaces |
| `F` | `OAR-019`, `OAR-020`, `OAR-021` | Downstream CRM sync and gated external execution |
| `G` | `OAR-022`, `OAR-023` | Reliability, retries, and diagnostics |
| `H` | `OAR-024`, `OAR-025`, `OAR-026` | Migration, verification, rollout, and expansion gate |

---

## Dependency map

Internal lane gates:

1. Lane `B` starts only after lane `A` `P0` rows are `DONE`.
2. Lane `C` starts only after `OAR-003` is `DONE`.
3. Lane `D` starts only after `OAR-005` and `OAR-009` are `DONE`.
4. Lane `E` starts only after `OAR-005` and `OAR-012` are `DONE`.
5. Lane `F` starts only after `OAR-006` and `OAR-013` are `DONE`.
6. Lane `G` starts only after `OAR-013` and `OAR-019` are `DONE`.
7. Lane `H` starts only after all prior `P0` rows are `DONE` or explicitly `BLOCKED`.

Release gates:

1. Internal-only V1 completes at `OAR-025`.
2. Expansion beyond narrow external sync is considered only after `OAR-026`.

---

## Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Telephony remains on a parallel prompt-only path | high | Gate telephony work on `OAR-007` and fail closed on unresolved route identity |
| Activity and action-item semantics get conflated | high | Freeze entity split in `OAR-003` and require timeline rendering to respect it in `OAR-017` |
| External CRM becomes a hidden source of truth | high | Make `OAR-006` and `OAR-019` platform-first; external sync is outbox only |
| Approval and policy logic drift across UI and backend | high | Centralize policy in `OAR-011`; all UI consumes backend snapshots only |
| Missing idempotency leads to duplicate execution or sync | high | Require receipt/idempotency layer in `OAR-013` and `OAR-022` before rollout |
| Internal-only V1 scope expands too early | medium | Keep `OAR-014`, `OAR-020`, and `OAR-026` explicitly gate-driven and fail closed |
| Owner UX becomes another generic chat surface | medium | Keep Action Center operational and queue-first in `OAR-015` and `OAR-016` |

---

## Exit criteria

1. All `P0` rows are `DONE`.
2. Telephony, webchat, and follow-up execution share one structured outcome contract.
3. Canonical platform CRM projection is stable before outbound sync.
4. Action Center and immutable timeline are operational for org owners.
5. Receipts, retries, idempotency, telemetry, and takeover evidence are complete.
6. Internal-only V1 passes the full test matrix and canary rollout gate.
7. `TASK_QUEUE.md`, `SESSION_PROMPTS.md`, `INDEX.md`, and `MASTER_PLAN.md` are synchronized and pass docs guard.
