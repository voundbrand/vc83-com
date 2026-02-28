# Release Gate Checklist

**Workstream:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-creation-experience-convergence`  
**Decision labels:** `proceed` | `hold` | `rollback`

---

## Operator checklist rows

| Gate | Status (`proceed`/`hold`/`rollback`) | Blocking rule | Required evidence |
|---|---|---|---|
| `Layer 1: Model conformance` | `proceed` | Any failed threshold (`parse>=0.90`, `schema>=0.90`, `refusal>=0.85`, `latency_p95<=12000`, `cost_per_1k<=0.5`) blocks `proceed` | `ACE-013`: `npm run test:model` (2026-02-19 UTC) `6/6` tests pass; parse=`1`, schema=`1`, refusal=`1`, latency_p95=`5214`, cost_per_1k=`0` |
| `Layer 2: Workflow behavior` | `proceed` | Any failed required command or `P0` regression blocks `proceed` | `ACE-013`: `npm run typecheck`, `npm run lint` (warnings only, no errors), `npm run test:unit` (`92/92` files pass), `npm run test:e2e:desktop`, `npm run test:e2e:mobile`, `npm run test:e2e:atx` |
| `Layer 3: Live soul-binding` | `hold` | Score `<10` or fail-fast condition blocks `proceed` | Lane-F run did not execute a fresh worksheet session id for this candidate; evidence package must include a current worksheet artifact before `proceed` |
| `Layer 4: Trust telemetry` | `hold` | `evaluateTrustRolloutGuardrails` result of `hold`/`rollback` blocks `proceed` | Lane-F run did not attach a fresh KPI snapshot + guardrail payload for this candidate |
| `Layer 5: Privileged controls` | `hold` | Missing step-up/elevation/dual-approval(reason+ticket) evidence blocks `proceed` | Contract tests passed, but lane-F run did not attach release-candidate trust-event ids for step-up/elevation/dual-approval reason+ticket evidence |

---

## Privileged control checklist (Layer 5)

| Control | Required evidence | Block condition |
|---|---|---|
| Step-up auth verified | trust event id for step-up verification + actor id + timestamp | Missing event, wrong actor, or stale timestamp |
| Time-bound elevation active | elevation id + `expiresAt` + target scope | Expired elevation or scope mismatch |
| Dual approval on prod apply | two distinct approver ids + proposal id + approval timestamps | Fewer than two unique approvers in production |
| Reason + ticket required | reason code + ticket id captured in audit/trust event payload | Empty reason/ticket or mismatch with executed action |

---

## Final decision reduction

1. If any checklist row is `rollback`, final decision is `rollback`.
2. Else if any checklist row is `hold`, final decision is `hold`.
3. Else final decision is `proceed`.
4. Missing evidence is never interpreted as pass.

---

## Release decision record

| Field | Value |
|---|---|
| Candidate build id | `local-c485d2a0-dirty` |
| Evaluated at (UTC) | `2026-02-19T20:14:06Z` |
| Evaluated by | `Codex lane-F operator` |
| Final decision | `hold` |
| Decision rationale | `Layer 1` and `Layer 2` passed with deterministic evidence, but `Layer 3`/`Layer 4`/`Layer 5` are `hold` due to missing release-candidate live-eval, telemetry, and privileged-control evidence artifacts. |
| Remediation tasks (if not proceed) | `ACE-014 follow-up cadence`: run live eval worksheet, attach telemetry guardrail snapshot, attach privileged trust-event/audit evidence, then rerun release reduction. |

---

## ACE-013 verification command summary

| Command | Result | Notes |
|---|---|---|
| `npm run typecheck` | `PASS` | Exit code `0`. |
| `npm run lint` | `PASS` | Exit code `0`; warning-only output (`3009` warnings, `0` errors). |
| `npm run test:unit` | `PASS` | `92` files and `473` tests passed. |
| `npm run test:model` | `PASS` | `6/6` tests passed; conformance status `PASS`. |
| `npm run test:e2e:desktop` | `PASS` | `1/1` test passed. |
| `npm run test:e2e:mobile` | `PASS` | `12/12` tests passed. |
| `npm run test:e2e:atx` | `PASS` | `2/2` tests passed. |
| `npm run docs:guard` | `PASS` | Docs guard passed. |

---

## P0 behavior contract notes (explicit pass/fail)

| P0 contract | Status | Evidence note |
|---|---|---|
| `ACE-001` LayerCake sequence lock | `PASS` | Contract remains intact in `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-creation-experience-convergence/MASTER_PLAN.md`; docs guard passes. |
| `ACE-003` LayerCake roster boundaries | `PASS` | Canonical roster/handoff contracts remain published in `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-creation-experience-convergence/LAYERCAKE_PLATFORM_AGENT_STACK.md`. |
| `ACE-004` Deterministic routing and interfaces | `PASS` | Route and schema contracts remain explicit and unchanged in stack doc. |
| `ACE-005` Voice-first launch + `slick` default | `PASS` | `ACE-013` desktop/mobile E2E suites passed with no regressions in launch/deep-link shell behavior. |
| `ACE-006` Platform productivity loop | `PASS` | `ACE-013` typecheck/lint/unit suites passed; no contract-breaking regressions surfaced. |
| `ACE-008` Live eval protocol + fail-fast boundaries | `PASS` | Playbook contract remains published; release row is `hold` until fresh worksheet evidence is attached for this candidate. |
| `ACE-010` Deterministic threshold matrix | `PASS` | Threshold matrix remains synced in runbook/plan/checklist docs. |
| `ACE-011` Release gate blocking behavior | `PASS` | Checklist enforces missing-evidence `hold`; final decision reduced deterministically. |
| `ACE-015` `platform_soul_admin` L2-only scope | `PASS` | Unit profile includes policy/audit tests and passed during `ACE-013`. |
| `ACE-016` Privileged safeguard contract | `PASS` | Code-level safeguards and tests are passing; operational release evidence remains required (current gate row is `hold`). |
| `ACE-013` Full verification profile execution | `PASS` | All queue-listed verification commands executed in order with zero nonzero exits. |
