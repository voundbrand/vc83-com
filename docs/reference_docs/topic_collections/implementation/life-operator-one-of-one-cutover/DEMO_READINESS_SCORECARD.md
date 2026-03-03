# Demo Readiness Scorecard

**Status:** Final deterministic gate (`LOC-014`)  
**Last updated:** 2026-03-02

Use this scorecard before any customer-facing founder demo claim.

Executable rehearsal commands:

1. Run full founder set: `npm run demo:founder`.
2. Read per-scenario evidence from `tmp/reports/fnd-001/latest.json` .. `tmp/reports/fnd-007/latest.json`.
3. Read aggregate scorecard artifact from `tmp/reports/founder-rehearsal/latest.json`.
4. Optional single scenario run: `npm run test:e2e:fnd-001` .. `npm run test:e2e:fnd-007`.

## Scorecard contract

1. One visible operator UX only; hidden specialist routing remains implementation detail.
2. Inputs must come from `DEMO_PLAYBOOKS.md` evidence artifacts only (`preflight_status`, `action_log`, `trust_log`, `outcome_summary`).
3. If required evidence is missing or ambiguous, result is `FAIL` (fail closed).
4. All seven founder scenarios (`FND-001`..`FND-007`) must be evaluated per rehearsal set.

---

## Scenario-checkpoint map

| Scenario | Required checkpoint IDs |
|---|---|
| `FND-001` | `FND-001-C1`, `FND-001-C2`, `FND-001-C3`, `FND-001-C4` |
| `FND-002` | `FND-002-C1`, `FND-002-C2`, `FND-002-C3`, `FND-002-C4` |
| `FND-003` | `FND-003-C1`, `FND-003-C2`, `FND-003-C3`, `FND-003-C4` |
| `FND-004` | `FND-004-C1`, `FND-004-C2`, `FND-004-C3`, `FND-004-C4` |
| `FND-005` | `FND-005-C1`, `FND-005-C2`, `FND-005-C3`, `FND-005-C4` |
| `FND-006` | `FND-006-C1`, `FND-006-C2`, `FND-006-C3`, `FND-006-C4` |
| `FND-007` | `FND-007-C1`, `FND-007-C2`, `FND-007-C3`, `FND-007-C4` |

---

## Dimension thresholds (deterministic)

| Dimension | Deterministic metric | Pass threshold |
|---|---|---|
| `utility` | Required checkpoint pass rate per scenario | `100%` (`4/4`) |
| `trust` | Mutation approvals + trust events for every mutating action | `100%` |
| `speed` | Time to first actionable output + full playbook runtime | `<= 45s` first action and `<= 7m` total |
| `clarity` | Preflight + blocker explanation contract | `100%` (`available_now`/`blocked` only, and blocked includes concrete unblocking steps) |
| `consistency` | One-visible-operator continuity | `100%` (no exposed specialist handoff UI) |

---

## Per-run evidence template

| Field | Required value format |
|---|---|
| `runId` | `demo-YYYYMMDD-##` |
| `scenarioId` | `FND-001`..`FND-007` |
| `checkpointPassCount` | integer (`0`..`4`) |
| `checkpointFailIds` | checkpoint IDs or `none` |
| `firstActionableSeconds` | integer seconds |
| `totalRuntimeSeconds` | integer seconds (`<= 420` for pass) |
| `mutatingActionCount` | integer |
| `approvedMutationCount` | integer |
| `trustEventCoverage` | `covered`/`missing` |
| `preflightStatus` | `available_now`/`blocked` |
| `blockedUnblockingStepsPresent` | `yes`/`no`/`n_a` |
| `oneVisibleOperatorMaintained` | `yes`/`no` |
| `result` | `PASS`/`FAIL` |
| `notes` | concise remediation detail when `FAIL` |
| `preflight_status.runtimeReadiness.convexConnected` | `true`/`false` |
| `preflight_status.runtimeReadiness.crmLookupCreateConfigured` | `true`/`false` |
| `preflight_status.runtimeReadiness.calendarReadinessConfigured` | `true`/`false` |
| `preflight_status.runtimeReadiness.outboundInviteChannelReady` | `true`/`false` |

---

## Rehearsal log template

| Run ID | Scenario | Checkpoints | Utility | Trust | Speed | Clarity | Consistency | Result | Notes |
|---|---|---|---|---|---|---|---|---|---|
| `demo-YYYYMMDD-01` | `FND-001` | `4/4` | `PASS/FAIL` | `PASS/FAIL` | `PASS/FAIL` | `PASS/FAIL` | `PASS/FAIL` | `PASS/FAIL` |  |
| `demo-YYYYMMDD-02` | `FND-002` | `4/4` | `PASS/FAIL` | `PASS/FAIL` | `PASS/FAIL` | `PASS/FAIL` | `PASS/FAIL` | `PASS/FAIL` |  |
| `demo-YYYYMMDD-03` | `FND-003` | `4/4` | `PASS/FAIL` | `PASS/FAIL` | `PASS/FAIL` | `PASS/FAIL` | `PASS/FAIL` | `PASS/FAIL` |  |
| `demo-YYYYMMDD-04` | `FND-004` | `4/4` | `PASS/FAIL` | `PASS/FAIL` | `PASS/FAIL` | `PASS/FAIL` | `PASS/FAIL` | `PASS/FAIL` |  |
| `demo-YYYYMMDD-05` | `FND-005` | `4/4` | `PASS/FAIL` | `PASS/FAIL` | `PASS/FAIL` | `PASS/FAIL` | `PASS/FAIL` | `PASS/FAIL` |  |
| `demo-YYYYMMDD-06` | `FND-006` | `4/4` | `PASS/FAIL` | `PASS/FAIL` | `PASS/FAIL` | `PASS/FAIL` | `PASS/FAIL` | `PASS/FAIL` |  |
| `demo-YYYYMMDD-07` | `FND-007` | `4/4` | `PASS/FAIL` | `PASS/FAIL` | `PASS/FAIL` | `PASS/FAIL` | `PASS/FAIL` | `PASS/FAIL` |  |

---

## Automatic fail triggers

1. Any required checkpoint is missing evidence.
2. Any mutating action lacks approval artifact or trust event.
3. Any preflight output is not exactly `available_now` or `blocked`.
4. Any blocked case is missing concrete unblocking steps.
5. Any run exceeds `7m` total runtime.
6. Any run exposes raw specialist handoff UI.

---

## LOC-045 runtime readiness evidence contract

`FND-007` artifacts must publish deterministic runtime-readiness fields for the stage-critical path:

1. Convex connectivity (`preflight_status.runtimeReadiness.convexConnected`),
2. CRM lookup/create configuration (`preflight_status.runtimeReadiness.crmLookupCreateConfigured`),
3. Calendar readiness configuration (`preflight_status.runtimeReadiness.calendarReadinessConfigured`),
4. Outbound invite channel readiness (`preflight_status.runtimeReadiness.outboundInviteChannelReady`).

Fail-closed policy:

1. Missing readiness fields in `tmp/reports/fnd-007/latest.json` is immediate `NO_GO`.
2. Any `false` readiness value must include explicit owner/date follow-up in lane `K` ledger notes before `LOC-047` signoff.

---

## Go/no-go rule

1. A rehearsal set is `GO` only if all seven scenario rows are `PASS` across all dimensions.
2. Any `trust` or `clarity` failure is immediate `NO_GO`.
3. Any missing run for `FND-001`..`FND-007` is immediate `NO_GO`.
