# Limited Live Canary Preflight

- Bundle ID: `LCANARY-PREFLIGHT-20260401T1448Z-v1`
- Date: `2026-04-01`
- Scope: one strategy, one operator, one tenant, reduced caps.

## Checklist

- [x] Runtime mode lock prepared: `live_limited` only after manual operator switch.
- [x] Single strategy lock prepared: `canary_v1_single_strategy`.
- [x] Reduced cap profile prepared (`5/20/15/2`).
- [x] Kill switch channels validated in smoke (`manual API`, `env`, `sentinel flag`).
- [x] Execution profile gate required (`ACTIVE` + eligible).
- [x] Venue eligibility gate required (`classification=eligible`).
- [x] Agent intent approval required before order path.
- [x] Audit chain fields present: `executionProfileId`, `eligibilitySnapshot`, `intentId`, `policyDecisionId`.
- [x] Rollback triggers documented and operator run command prepared.

## Hard rollback triggers

- Any unresolved anomaly in reconciliation ledger.
- Any eligibility classification different from `eligible`.
- Any operator approval mismatch for agent-originated intent.
- Any unexpected adapter submit failure trend.
- Any kill-switch activation event.

## Immediate rollback action

1. Set runtime mode to `paper_sim`.
2. Activate kill switch (`/v1/kill-switch/activate`).
3. Verify no new order path proceeds.
