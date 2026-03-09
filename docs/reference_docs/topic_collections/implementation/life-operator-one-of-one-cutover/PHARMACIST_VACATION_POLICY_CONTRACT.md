# Pharmacist Vacation Policy Contract (Slack + Google Calendar)

**Status:** Active contract baseline (`LOC-021`)  
**Last updated:** 2026-02-26

---

## Purpose

Define a Convex-ready, implementation-grounded contract for a pharmacist-team vacation scheduler that:

1. receives requests in Slack,
2. checks policy and calendar conflicts,
3. responds with deterministic approve/conflict outcomes,
4. suggests direct colleague discussion when conflicts exist,
5. mutates calendars only on approved, trust-valid paths.

---

## Reality Anchors (Current Code)

This contract is intentionally anchored to existing runtime surfaces.

1. Slack inbound endpoints already live at `/integrations/slack/events` and `/integrations/slack/commands` with signature verification and async dispatch in `/Users/foundbrand_001/Development/vc83-com/convex/http.ts`.
2. Slack events already flow through `processSlackEvent` in `/Users/foundbrand_001/Development/vc83-com/convex/channels/webhooks.ts`, then into `api.ai.agentExecution.processInboundMessage`.
3. Slack payload normalization already exists in `/Users/foundbrand_001/Development/vc83-com/convex/channels/providers/slackProvider.ts` (`normalizeInbound`, thread/top-level metadata, DM vs mention mode handling).
4. Slack workspace/OAuth/profile settings already exist in `/Users/foundbrand_001/Development/vc83-com/convex/oauth/slack.ts` via `getSlackConnectionStatus`, `getSlackSetupConfig`, and organization-scoped `slack_settings`.
5. Google calendar readiness already exists in `/Users/foundbrand_001/Development/vc83-com/convex/calendarSyncOntology.ts` via scope-aware readiness checks and planner write readiness.
6. Calendar conflict primitives already exist in `/Users/foundbrand_001/Development/vc83-com/convex/availabilityOntology.ts` (`getAvailableSlots`, `checkConflict`, external busy-time blocking) and `/Users/foundbrand_001/Development/vc83-com/convex/calendarSyncSubcalendars.ts` (blocking sub-calendar IDs).

No new standalone Slack webhook stack or credential table should be introduced.

---

## Storage Contract (Ontology-First)

Use existing `objects` + `objectLinks` + `oauthConnections` contracts.

### 1) Vacation policy object

Store one active policy per org/team context:

- `objects.type = "vacation_policy"`
- `objects.subtype = "pharmacist_team_v1"`
- `objects.status in {"active", "archived"}`

`customProperties` payload:

- `policyVersion: 1`
- `ownerUserId: Id<"users">`
- `timezone: string` (IANA)
- `maxConcurrentAway: number` (integer >= 0)
- `minOnDutyTotal: number` (integer >= 0)
- `minOnDutyByRole: Array<{ roleTag: string; minOnDuty: number }>`
- `blockedPeriods: Array<{ id: string; startDate: string; endDate: string; reason?: string; recurrence: "none" | "yearly" }>`
- `requestWindow: { minLeadDays: number; maxFutureDays: number }`
- `overrideAuthority: {
   allowedRoleIds: Id<"roles">[];
   allowedUserIds: Id<"users">[];
   requireReason: boolean;
   requireOwnerApproval: boolean;
 }`
- `conflictResolution: {
   maxAlternativeWindows: number;
   alternativeWindowDays: number;
   requireDirectColleagueDiscussion: boolean;
   colleagueDiscussionTemplate?: string;
 }`
- `integrations: {
   slack: {
     providerConnectionId: Id<"oauthConnections">;
     teamId: string;
     channelId?: string;
     routeKey?: string;
   };
   googleCalendar: {
     providerConnectionId: Id<"oauthConnections">;
     blockingCalendarIds: string[];
     pushCalendarId?: string;
   };
 }`
- `updatedAt: number`
- `updatedBy: Id<"users">`

### 2) Vacation request object

Persist each request for auditable decisioning:

- `objects.type = "vacation_request"`
- `objects.subtype = "pharmacist_pto_v1"`
- `objects.status in {"pending", "approved", "conflict", "denied", "cancelled"}`

`customProperties` payload:

- `requesterUserId: Id<"users">`
- `requesterDisplayName: string`
- `source: "slack"`
- `sourceMetadata: { teamId: string; channelId: string; messageTs?: string; threadTs?: string; eventId?: string }`
- `requestedStartDate: string` (YYYY-MM-DD)
- `requestedEndDate: string` (YYYY-MM-DD)
- `requestedShiftTags?: string[]`
- `evaluationSnapshot: {
   policyVersion: number;
   concurrentAwayCount: number;
   minOnDutyTotalAfterDecision: number;
   minOnDutyByRoleAfterDecision: Array<{ roleTag: string; remainingOnDuty: number }>;
   blockedPeriodMatchIds: string[];
   calendarConflicts: Array<{ startDateTime: number; endDateTime: number; source: "booking" | "external_calendar" }>;
 }`
- `decision: {
   verdict: "approved" | "conflict" | "denied";
   reasonCodes: string[];
   rationale: string;
   alternatives: Array<{ startDate: string; endDate: string }>;
   colleagueResolutionSuggested: boolean;
 }`
- `calendarMutation: {
   attempted: boolean;
   succeeded: boolean;
   calendarEventId?: string;
 }`
- `approvedBy?: Id<"users">`
- `approvedAt?: number`

### 3) Links

Use `objectLinks` for traceability:

- `vacation_request --governed_by_vacation_policy--> vacation_policy`
- `vacation_request --requested_by--> frontend_user/contact object` (if applicable)
- `vacation_request --blocks_resource--> product/resource` (optional, if resource-linked availability model is used)

---

## Convex Validator Skeleton (Ready to Implement)

```ts
import { v } from "convex/values";

export const vacationBlockedPeriodValidator = v.object({
  id: v.string(),
  startDate: v.string(),
  endDate: v.string(),
  reason: v.optional(v.string()),
  recurrence: v.union(v.literal("none"), v.literal("yearly")),
});

export const vacationRoleFloorValidator = v.object({
  roleTag: v.string(),
  minOnDuty: v.number(),
});

export const pharmacistVacationPolicyValidator = v.object({
  policyVersion: v.number(),
  ownerUserId: v.id("users"),
  timezone: v.string(),
  maxConcurrentAway: v.number(),
  minOnDutyTotal: v.number(),
  minOnDutyByRole: v.array(vacationRoleFloorValidator),
  blockedPeriods: v.array(vacationBlockedPeriodValidator),
  requestWindow: v.object({
    minLeadDays: v.number(),
    maxFutureDays: v.number(),
  }),
  overrideAuthority: v.object({
    allowedRoleIds: v.array(v.id("roles")),
    allowedUserIds: v.array(v.id("users")),
    requireReason: v.boolean(),
    requireOwnerApproval: v.boolean(),
  }),
  conflictResolution: v.object({
    maxAlternativeWindows: v.number(),
    alternativeWindowDays: v.number(),
    requireDirectColleagueDiscussion: v.boolean(),
    colleagueDiscussionTemplate: v.optional(v.string()),
  }),
  integrations: v.object({
    slack: v.object({
      providerConnectionId: v.id("oauthConnections"),
      teamId: v.string(),
      channelId: v.optional(v.string()),
      routeKey: v.optional(v.string()),
    }),
    googleCalendar: v.object({
      providerConnectionId: v.id("oauthConnections"),
      blockingCalendarIds: v.array(v.string()),
      pushCalendarId: v.optional(v.string()),
    }),
  }),
  updatedAt: v.number(),
  updatedBy: v.id("users"),
});
```

---

## API Contract (Query/Mutation/Action)

Proposed modules (additive, no existing integration contract breakage):

1. `convex/vacationPolicy.ts`
   - `getActivePolicy(sessionId)` query
   - `setPolicy(sessionId, policyInput)` mutation
   - `archivePolicy(sessionId, policyId)` mutation
2. `convex/vacationRequests.ts`
   - `listVacationRequests(sessionId, status?, limit?)` query
   - `evaluateVacationRequest(input)` action
   - `applyVacationDecision(input)` mutation
3. `convex/channels/webhooks.ts`
   - extend `processSlackEvent` path to emit structured `vacation_request` payload when intent is vacation-related.

---

## Deterministic Decision Contract

Given `request + policy + current schedules`, resolve exactly one verdict:

1. If Slack or Google connection/readiness is unknown -> `blocked` (fail closed).
2. If request overlaps blocked period -> `denied` with `reasonCodes=["blocked_period"]`.
3. If request violates request window (`minLeadDays`, `maxFutureDays`) -> `denied`.
4. If `concurrentAwayCount >= maxConcurrentAway` -> `conflict`.
5. If post-decision staffing violates `minOnDutyTotal` or `minOnDutyByRole` -> `conflict`.
6. If no violation -> `approved`.

For `conflict`:

1. Always return alternatives (`maxAlternativeWindows`, bounded search window).
2. Always include explicit colleague-resolution guidance when `requireDirectColleagueDiscussion=true`.
3. Never mutate calendars in `conflict`/`denied` verdicts.

For `approved`:

1. Calendar mutation allowed only when Google write-readiness is true.
2. Persist trust evidence (`decision event`, `calendar mutation event`).

---

## Slack Date Parsing Contract (Deterministic + Fail-Closed)

Vacation request parsing in Slack supports:

1. Absolute dates:
   - `YYYY-MM-DD` (ISO)
   - `MM/DD/YYYY` and `MM-DD-YYYY` (normalized to ISO)
2. Relative windows (only when deterministic prerequisites are present):
   - `this week`
   - `next week`
   - `next month`

Relative-window prerequisites:

1. Request text must include explicit timezone token:
   - accepted examples: `tz:UTC`, `timezone:UTC`, `UTC+02:00`
2. Request must have deterministic anchor timestamp:
   - Slack Events ingress (`/integrations/slack/events`): use `event.ts`
   - Slack Commands ingress (`/integrations/slack/commands`): use `received_at_ms`

Fail-closed blocker reason codes for relative inputs:

1. `missing_relative_timezone`
2. `missing_relative_anchor_time`
3. `missing_iso_date` (compatibility fallback when no deterministic date range resolved)

Examples:

1. `vacation next week timezone:UTC` with valid `event.ts` -> parsed to Monday..Sunday of next week.
2. `/vacation next month tz:UTC` with valid `received_at_ms` -> parsed to first..last day of next month.
3. `pto next week` without timezone -> blocked (`missing_relative_timezone`).
4. `/vacation this week tz:UTC` without `received_at_ms` -> blocked (`missing_relative_anchor_time`).

---

## Trust and Audit Contract

Minimum trust/audit events for this scenario:

1. `trust.guardrail.vacation_request_received.v1`
2. `trust.guardrail.vacation_policy_evaluated.v1`
3. `trust.guardrail.vacation_decision_recorded.v1`
4. `trust.guardrail.vacation_calendar_mutation.v1`
5. `trust.guardrail.vacation_override_requested.v1` (when override path is used)

All events must include:

- `organizationId`,
- `policyId`,
- `vacationRequestId`,
- `slack team/channel identifiers` (where present),
- deterministic `reasonCodes`.

---

## Explicit Non-Goals

1. No new Slack integration workstream or alternate webhook entrypoint.
2. No bypass of existing OAuth/profile/credential contracts in `oauthConnections`.
3. No free-form autonomous override of policy constraints.
4. No calendar writes for unresolved conflicts.
