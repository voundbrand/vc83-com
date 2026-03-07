# SPD-016 Samantha Dispatcher Hardening Rollout Runbook

**Date:** 2026-03-06  
**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/samantha-post-capture-dispatcher`

---

## Scope and invariants

This runbook covers rollout of the Samantha post-capture dispatcher hardening that is already implemented in:

- `/Users/foundbrand_001/Development/vc83-com/convex/ai/postCaptureDispatcher.ts`
- `/Users/foundbrand_001/Development/vc83-com/convex/ai/postCaptureDispatcherContracts.ts`
- `/Users/foundbrand_001/Development/vc83-com/convex/ai/tools/interviewTools.ts`

Non-negotiables for every stage:

1. Keep Slack routing fail-closed.
2. Preserve org-scoped trust boundaries.
3. No behavior changes outside dispatcher scope.
4. Prefer additive controls and reversible switches.

---

## 1) De-risk checklist with go/no-go gates

### Pre-prod checklist (must all pass)

1. Contract and regression verification is green:
   - `npm run typecheck`
   - `npx tsc -p convex/tsconfig.json --noEmit`
   - `npx vitest run tests/unit/ai/postCaptureDispatcher.contract.test.ts tests/unit/ai/postCaptureDispatcher.routing.test.ts tests/unit/ai/postCaptureDispatcher.idempotency.test.ts`
   - `npx vitest run tests/integration/onboarding/post-capture-dispatcher.integration.test.ts`
   - `npx vitest run tests/integration/onboarding/audit-flow.integration.test.ts tests/unit/onboarding/audit-deliverable.test.ts tests/unit/ai/samanthaAuditAutoDispatch.test.ts tests/unit/ai/actionCompletionEvidenceContract.test.ts`
2. Synthetic dispatch payload confirms fail-closed behavior:
   - missing `channelId` -> `slack_routing_missing_channel`
   - missing workspace identity hint in production mode -> `slack_routing_missing_workspace_identity`
3. Canary org routing identity is pre-resolved and documented:
   - `slackChannelId` set
   - at least one hint set (`providerConnectionId` or `providerAccountId` or `routeKey`)
   - preferred: all three hints set to avoid ambiguity
4. Operator replay drill completed:
   - one dead letter moved `open -> triaging -> replay_queued -> replayed -> resolved`
5. Dashboards and alerts are live (section 6).

Pre-prod go/no-go:

- `GO`: every checklist item is complete.
- `NO_GO`: any failed command, missing alert wiring, or unresolved replay drill.

### Production readiness checklist (must all pass)

1. Canary org has explicit routing hints and no global fallback-only config.
2. Alert responders are assigned for first 24h rollout window.
3. Rollback controls are tested:
   - per-org Slack hot-lead disable (remove routing `channelId` from org/session metadata)
   - global Slack hot-lead disable (unset `SAMANTHA_POST_CAPTURE_SLACK_CHANNEL_ID` if used)
4. Runbook owner confirms dead-letter triage SLA:
   - acknowledge in 15 minutes
   - replay or park with triage note in 30 minutes

Production go/no-go:

- `GO`: all readiness items complete and on-call owner acknowledged.
- `NO_GO`: any missing owner, untested rollback switch, or ambiguous routing setup.

---

## 2) Staged rollout plan with exact metrics

### Metric definitions

1. `enabled_runs`: runs where `payloadSnapshot.sideEffects.slackHotLead.enabled=true` and `payloadSnapshot.policy.allowSlackHotLead=true`.
2. `hint_coverage`: `% of enabled_runs with >=1 explicit workspace identity hint` (`providerConnectionId` or `providerAccountId` or `routeKey`).
3. `slack_identity_dead_letter_rate`: dead letters with reason in:
   - `slack_routing_missing_workspace_identity`
   - `slack_routing_ambiguous_workspace_identity`
   - `slack_routing_workspace_not_found`
   - `slack_routing_connection_scope_mismatch`
   divided by `enabled_runs`.
4. `dispatcher_terminal_rate`: runs ending in `dead_lettered` divided by total runs.
5. `retry_pressure_due`: runs with `status=retry_scheduled` and `nextRetryAt <= now`.
6. `replay_queue_depth`: dead letters with `status in (open, triaging, replay_queued)`.

### Stage plan

| Stage | Rollout slice | Dwell | Success gates | Failure triggers |
|---|---|---|---|---|
| `Canary` | 1 org / 1 Slack workspace | `>= 2h` and `>= 20 enabled_runs` | `hint_coverage=100%`; `slack_identity_dead_letter_rate=0%`; `dispatcher_terminal_rate<=2%`; `retry_pressure_due<=5`; `replay_queue_depth<=2` | Any `slack_routing_missing_workspace_identity`; any `slack_routing_ambiguous_workspace_identity`; `dispatcher_terminal_rate>5%` for 15m |
| `Ramp` | 25% -> 50% -> 75% of targeted orgs | each step `>= 4h` and `>= 50 enabled_runs` | `hint_coverage=100%`; `slack_identity_dead_letter_rate<=0.5%`; `dispatcher_terminal_rate<=2%`; `retry_pressure_due<=10`; `replay_queue_depth<=10` | Any spike of `slack_routing_missing_workspace_identity`; `slack_identity_dead_letter_rate>1%` for 30m; `replay_queue_depth>15` for 30m |
| `Full` | 100% targeted orgs | `>= 24h` soak | `hint_coverage=100%`; `slack_identity_dead_letter_rate<=0.2%`; `dispatcher_terminal_rate<=1%`; `retry_pressure_due<=15`; `replay_queue_depth<=5` | Any identity-missing incident; `dispatcher_terminal_rate>2%` for 30m; sustained replay backlog growth for 60m |

Promotion policy:

1. Do not promote stage if any failure trigger fired within the dwell window.
2. Require written stage sign-off with metric snapshot and timestamp.
3. Roll back immediately on identity-missing failures (section 4).

---

## 3) Operator runbook: triage + replay

### Triage workflow

1. Pull open dead letters via `internal.ai.postCaptureDispatcher.listDeadLettersForTriage`.
2. Mark record `triaging` via `internal.ai.postCaptureDispatcher.updateDeadLetterStatus`.
3. Load run details via `internal.ai.postCaptureDispatcher.getDispatchRunResult`.
4. Identify failed step from `stepStateSnapshot` and reason code.
5. Apply reason-code-specific remediation.
6. Queue replay via `internal.ai.postCaptureDispatcher.replayDeadLetterDispatch` with `triageNotes`.
7. Verify run reaches `succeeded` or expected policy skip.
8. Mark dead letter `replayed`, then `resolved` when confirmed.

### Reason-code-specific actions

| Reason code | Class | Action | Replay policy |
|---|---|---|---|
| `slack_routing_missing_channel` | Config | Set `slackChannelId` in args/session metadata/env | Replay after fix |
| `slack_routing_missing_workspace_identity` | Config | Add explicit workspace hint (`providerConnectionId` preferred; optionally `providerAccountId`/`routeKey`) | Replay after fix |
| `slack_routing_ambiguous_workspace_identity` | Config | Narrow to one workspace (`providerConnectionId` or unique `routeKey`) | Replay after fix |
| `slack_routing_workspace_not_found` | Config/Auth | Verify active org-scoped Slack OAuth connection and hint values | Replay after fix |
| `slack_routing_connection_scope_mismatch` | Security/Config | Ensure selected connection is organization-scoped and has deterministic identity fields | Replay after fix |
| `slack_routing_send_failed` | Transient/provider | Check Slack provider/API health, credential validity, throttling | Replay when healthy |
| `lead_email_send_failed` | Provider | Validate email provider response and sender config | Replay when fixed |
| `sales_email_send_failed` | Provider | Validate sales mailbox route/domain config | Replay when fixed |
| `founder_call_orchestration_failed` | Provider/logic | Validate founder-call provider path and contact payload | Manual replay case-by-case |
| `dispatch_retry_exhausted` | Aggregate | Inspect latest attempt reason and remediate root cause first | Replay after root cause fix |
| `dispatch_input_invalid` | Contract | Fix producer payload contract; do not replay stale invalid payload | No replay until regenerated |
| `dispatch_org_scope_mismatch` | Security boundary | Treat as scope incident; validate org/session binding before any replay | No replay until incident closed |
| `dispatch_unexpected_error` | Unknown | Inspect runtime/audit logs; classify and patch | Replay only after classification |

Notes:

1. `slack_policy_disabled` and `slack_policy_not_hot_lead` are expected policy skips, not dead-letter triage failures.
2. Never replay before writing triage notes with remediation evidence.

---

## 4) Rollback plan

### Explicit rollback triggers

1. Any production occurrence of `slack_routing_missing_workspace_identity`.
2. Any production occurrence of `slack_routing_ambiguous_workspace_identity`.
3. `slack_identity_dead_letter_rate > 1%` for 30 minutes.
4. `dispatcher_terminal_rate > 2%` for 30 minutes.
5. `replay_queue_depth > 15` for 30 minutes.

### Blast-radius containment

1. Contain per-org first:
   - remove Slack channel routing enablement for affected org/session metadata (`samanthaSlackRouting.channelId` or `slackHotLeadRouting.channelId`).
2. If multi-org impact, apply global containment:
   - unset `SAMANTHA_POST_CAPTURE_SLACK_CHANNEL_ID` fallback.
3. Keep dispatcher active for non-Slack steps (lead/sales/founder) unless broader incident requires full dispatcher pause.

### Recovery validation before re-enable

1. Verify `hint_coverage=100%` for target org slice.
2. Replay all open dead letters caused by rollout change.
3. Observe a fresh canary dwell (`>= 2h` and `>= 20 enabled_runs`) with zero identity dead letters.
4. Re-enable using same staged progression (Canary -> Ramp -> Full).

---

## 5) Config contract guidance for Slack routing hints

### Required when Slack hot-lead delivery is enabled

1. `sideEffects.slackHotLead.enabled = true`
2. `policy.allowSlackHotLead = true`
3. `sideEffects.slackHotLead.routing.channelId` (required)
4. At least one explicit workspace identity hint in production:
   - `providerConnectionId`
   - or `providerAccountId`
   - or `routeKey`

### Optional but strongly recommended

1. Provide all three identity hints (`providerConnectionId`, `providerAccountId`, `routeKey`) for deterministic matching.
2. `requireHotLeadQualificationAtLeast` (`High` default, or `Hot`).
3. `routing.failClosed` may be present in payload, but server enforcement is already fail-closed via `failClosedRouting: true`.

### Source precedence in current implementation

1. `channelId`:
   - tool args -> session metadata (`samanthaSlackRouting`/`slackHotLeadRouting`) -> `SAMANTHA_POST_CAPTURE_SLACK_CHANNEL_ID`
2. Identity hints:
   - tool args -> session metadata

### Session metadata contract (accepted keys)

```json
{
  "samanthaSlackRouting": {
    "channelId": "C12345",
    "providerConnectionId": "oauthConnections:abc",
    "providerAccountId": "T12345",
    "routeKey": "slack:T12345"
  }
}
```

Snake case aliases are also accepted for metadata fields.

---

## 6) Dashboards and alerts

### Recommended dashboards

1. Dispatcher run status dashboard:
   - `onboardingPostCaptureDispatchRuns` by `status` over time (`queued`, `running`, `retry_scheduled`, `succeeded`, `dead_lettered`, `replay_requested`)
   - p95 run age for non-terminal runs
2. Retry pressure dashboard:
   - `retry_pressure_due`
   - retry attempt count distribution from `onboardingPostCaptureDispatchAttempts`
3. Dead-letter operations dashboard:
   - `replay_queue_depth`
   - dead letters by `reasonCode`
   - replay turnaround (`replay_queued` to `resolved`)
4. Slack routing integrity dashboard:
   - `hint_coverage`
   - identity-routing dead-letter reasons trend

### Alert policy

1. `Critical`: any `slack_routing_missing_workspace_identity` in production.
2. `High`: any `slack_routing_ambiguous_workspace_identity` in production.
3. `High`: `slack_identity_dead_letter_rate > 1%` for 30 minutes.
4. `High`: `dispatcher_terminal_rate > 2%` for 30 minutes.
5. `Medium`: `retry_pressure_due > 10` for 15 minutes.
6. `Medium`: `replay_queue_depth > 10` for 15 minutes.

---

## 7) Test and verification matrix per stage

| Stage | Required verification | Pass condition |
|---|---|---|
| `Pre-prod` | `npm run typecheck`; `npx tsc -p convex/tsconfig.json --noEmit`; `npx vitest run tests/unit/ai/postCaptureDispatcher.contract.test.ts tests/unit/ai/postCaptureDispatcher.routing.test.ts tests/unit/ai/postCaptureDispatcher.idempotency.test.ts`; `npx vitest run tests/integration/onboarding/post-capture-dispatcher.integration.test.ts`; `npx vitest run tests/integration/onboarding/audit-flow.integration.test.ts tests/unit/onboarding/audit-deliverable.test.ts tests/unit/ai/samanthaAuditAutoDispatch.test.ts tests/unit/ai/actionCompletionEvidenceContract.test.ts` | All commands exit `0`; synthetic fail-closed checks pass |
| `Canary` | Pre-prod stack + operator replay drill + live metric dwell checks | Canary success gates all green for full dwell |
| `Ramp` | Canary checks repeated at each ramp step | Ramp success gates all green at each step |
| `Full` | Ramp checks + 24h soak monitoring + replay backlog audit | Full success gates green; no unresolved critical alerts |

Operational rule:

1. If a stage fails, execute rollback immediately and re-enter at Canary after remediation.
2. Do not skip stages.

---

## Approval log template

Use this template for each stage promotion and rollback decision.

```text
Stage: <Canary|Ramp-25|Ramp-50|Ramp-75|Full>
Window: <start ISO> - <end ISO>
Enabled runs: <n>
hint_coverage: <value>
slack_identity_dead_letter_rate: <value>
dispatcher_terminal_rate: <value>
retry_pressure_due_peak: <value>
replay_queue_depth_peak: <value>
Decision: <GO|NO_GO|ROLLBACK>
Owner: <name>
Notes: <summary + links to evidence>
```
