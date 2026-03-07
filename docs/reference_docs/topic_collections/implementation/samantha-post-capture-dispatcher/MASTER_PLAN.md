# Samantha Post-Capture Dispatcher Master Plan

**Date:** 2026-03-06  
**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/samantha-post-capture-dispatcher`

---

## Mission

Operate Samantha post-capture dispatch with deterministic, fail-closed behavior:

1. keep side effects in dispatcher runtime,
2. preserve org-scoped trust boundaries,
3. keep rollout controls additive and reversible,
4. avoid behavior changes outside dispatcher scope.

---

## Current implementation snapshot

Implemented runtime and contracts:

1. Dispatcher runtime: `/Users/foundbrand_001/Development/vc83-com/convex/ai/postCaptureDispatcher.ts`
2. Contracts: `/Users/foundbrand_001/Development/vc83-com/convex/ai/postCaptureDispatcherContracts.ts`
3. Producer handoff path: `/Users/foundbrand_001/Development/vc83-com/convex/ai/tools/interviewTools.ts`

Current contract versions:

1. Input: `samantha_post_capture_dispatch_input_v2`
2. Result: `samantha_post_capture_dispatch_result_v2`

Current step execution order:

1. `lead_email_send`
2. `sales_notification_send`
3. `founder_call_orchestration`
4. `slack_hot_lead_notify`

Current fail-closed Slack routing behavior:

1. `channelId` is required when Slack hot-lead is enabled.
2. In production runtime, at least one explicit workspace identity hint is required:
   - `providerConnectionId`, or
   - `providerAccountId`, or
   - `routeKey`.
3. Ambiguous, missing, or scope-mismatched routing fails terminally with deterministic reason codes.

---

## Hardening completion (SPD-012 to SPD-015)

1. `SPD-012`: explicit Slack workspace/channel routing and fail-closed identity enforcement.
2. `SPD-013`: leased retry model with persisted attempt ledger and exponential backoff.
3. `SPD-014`: dead-letter persistence, triage statuses, replay workflow, audit trail events.
4. `SPD-015`: Samantha deliverable cutover to single dispatcher handoff while preserving output invariants.

Verification pass (2026-03-06):

1. `npm run typecheck`
2. `npx tsc -p convex/tsconfig.json --noEmit`
3. `npx vitest run tests/unit/ai/postCaptureDispatcher.contract.test.ts tests/unit/ai/postCaptureDispatcher.routing.test.ts tests/unit/ai/postCaptureDispatcher.idempotency.test.ts`
4. `npx vitest run tests/integration/onboarding/post-capture-dispatcher.integration.test.ts`

---

## Focused de-risk and rollout package (SPD-016)

Authoritative runbook:

- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/samantha-post-capture-dispatcher/SPD_016_DISPATCHER_HARDENING_ROLLOUT_RUNBOOK.md`

This runbook provides:

1. pre-prod and prod checklists with explicit go/no-go gates,
2. staged rollout plan (`Canary -> Ramp -> Full`) with exact success/failure metrics,
3. operator triage and replay workflow for dead letters with reason-code-specific actions,
4. rollback triggers, blast-radius containment, and recovery validation,
5. Slack routing hint config contract guidance (required vs optional),
6. dispatcher status, retry pressure, and dead-letter dashboards/alerts,
7. stage-by-stage test and verification matrix.

---

## Stage metrics and gates summary

| Stage | Success gates | Failure triggers |
|---|---|---|
| `Canary` | `hint_coverage=100%`; `slack_identity_dead_letter_rate=0%`; `dispatcher_terminal_rate<=2%`; `retry_pressure_due<=5`; `replay_queue_depth<=2` | Any `slack_routing_missing_workspace_identity`; any `slack_routing_ambiguous_workspace_identity`; `dispatcher_terminal_rate>5%` for 15m |
| `Ramp` | `hint_coverage=100%`; `slack_identity_dead_letter_rate<=0.5%`; `dispatcher_terminal_rate<=2%`; `retry_pressure_due<=10`; `replay_queue_depth<=10` | Any `slack_routing_missing_workspace_identity`; `slack_identity_dead_letter_rate>1%` for 30m; `replay_queue_depth>15` for 30m |
| `Full` | `hint_coverage=100%`; `slack_identity_dead_letter_rate<=0.2%`; `dispatcher_terminal_rate<=1%`; `retry_pressure_due<=15`; `replay_queue_depth<=5` | Any identity-missing incident; `dispatcher_terminal_rate>2%` for 30m; sustained backlog growth for 60m |

---

## Config contract summary for Slack routing

Required to enable Slack hot-lead delivery safely:

1. `sideEffects.slackHotLead.enabled = true`
2. `policy.allowSlackHotLead = true`
3. `sideEffects.slackHotLead.routing.channelId` present
4. at least one explicit identity hint in production (`providerConnectionId` or `providerAccountId` or `routeKey`)

Recommended for deterministic routing:

1. provide all three identity hints (`providerConnectionId`, `providerAccountId`, `routeKey`)
2. avoid channel-only enablement in production
3. keep per-org metadata as primary rollout control, global env fallback as emergency-only control

---

## Rollback strategy summary

Primary rollback triggers:

1. any production `slack_routing_missing_workspace_identity`,
2. any production `slack_routing_ambiguous_workspace_identity`,
3. `slack_identity_dead_letter_rate > 1%` for 30 minutes,
4. `dispatcher_terminal_rate > 2%` for 30 minutes,
5. `replay_queue_depth > 15` for 30 minutes.

Containment order:

1. disable Slack hot-lead only for affected org/session metadata,
2. if multi-org incident, disable global Slack channel fallback,
3. keep non-Slack dispatcher side effects active unless broader incident requires full freeze.

---

## Operational dashboards and alerts summary

Dashboards:

1. dispatcher run status over time (`queued`, `running`, `retry_scheduled`, `succeeded`, `dead_lettered`, `replay_requested`),
2. retry pressure (`retry_pressure_due`, attempt distribution),
3. dead-letter backlog (`open`, `triaging`, `replay_queued`, reason-code breakdown),
4. routing integrity (`hint_coverage`, identity-failure trend).

Critical alerts:

1. any `slack_routing_missing_workspace_identity` in production,
2. any `slack_routing_ambiguous_workspace_identity` in production.

---

## Validation baseline before each stage

1. `npm run typecheck`
2. `npx tsc -p convex/tsconfig.json --noEmit`
3. `npx vitest run tests/unit/ai/postCaptureDispatcher.contract.test.ts tests/unit/ai/postCaptureDispatcher.routing.test.ts tests/unit/ai/postCaptureDispatcher.idempotency.test.ts`
4. `npx vitest run tests/integration/onboarding/post-capture-dispatcher.integration.test.ts`
5. `npx vitest run tests/integration/onboarding/audit-flow.integration.test.ts tests/unit/onboarding/audit-deliverable.test.ts tests/unit/ai/samanthaAuditAutoDispatch.test.ts tests/unit/ai/actionCompletionEvidenceContract.test.ts`
6. `npm run docs:guard`

---

## Next row

1. `SPD-017` is `DONE` with stage evidence in `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/samantha-post-capture-dispatcher/SPD_017_ROLLOUT_EXECUTION_LOG.md`.
2. Latest stage decisions (2026-03-06):
   - Canary: `GO` at `2026-03-06T16:22:00Z`.
   - Ramp-25 pre-entry: initial `NO_GO` at `2026-03-06T16:40:00Z`, then re-evaluated to `GO` at `2026-03-06T20:16:18Z` after 24h responder assignment acknowledgement.
   - Operator closure override: remaining Ramp-50/Ramp-75/Full stages skipped with explicit `NO_GO` closure decision at `2026-03-06T20:24:51Z` (runbook exception recorded).
   - Rollback checkpoints: not invoked at logged decision points because no rollback triggers were breached.
3. `SPD-018` is `DONE` and published the docs-first re-entry gate for deferred `Ramp-50/Ramp-75/Full` progression.
4. `SPD-018` acceptance criteria (completed):
   - queue/index/master/session docs remain synchronized on the same next-row state,
   - fail-closed Slack routing and org-scoped trust boundaries remain explicit and unchanged,
   - resumed rollout stages require timestamped `GO/NO_GO` evidence before any traffic expansion.
5. Verification for `SPD-018`: `npm run docs:guard` (pass on 2026-03-06).
6. No active next row in lane `G`; resume only if deferred stage progression is explicitly re-opened.
