# Free Onboarding Global V2 Launch Checklist

**Date:** 2026-02-25 (re-validated)  
**Queue row:** `FOG2-014`  
**Scope:** Final verification, documentation closeout, and production launch acceptance for onboarding-v2 rollout controls.

---

## Top closeout risks

1. Rollout-stage or kill-switch drift causing unintended auto-approval behavior.
2. Regression to Telegram/WhatsApp/Slack/SMS onboarding bootstrap or first-message latency tracking.
3. Runbook/document drift that slows incident rollback response.

---

## Preconditions

1. All prior `P0` tasks are `DONE` or `BLOCKED`.
2. `FOG2-013` is `DONE` and rollout policy controls are live.
3. Kill-switch and rollback commands in `MASTER_PLAN.md` remain source-of-truth and unchanged.
4. Channel handlers and first-message latency telemetry remain unchanged by this closeout row.

---

## Verification record (FOG2-014)

| Command | Result |
|---|---|
| `npm run typecheck` | Passed (exit `0`) |
| `npm run lint` | Passed with `3261 problems (0 errors, 3261 warnings)` |
| `npm run test:unit` | Passed: `Test Files 136 passed | 4 skipped (140)`; `Tests 665 passed | 80 skipped (745)` |
| `npm run docs:guard` | Passed: `Docs guard passed.` |

---

## Production acceptance checklist

1. Confirm policy state in Super Admin and by querying `betaAccess.getBetaGatingStatus`.
2. Verify target rollout state is explicit:
   - `rollout.configuredRolloutStage` is intentional for the release window.
   - `rollout.effectiveRolloutStage` matches expectation before traffic expansion.
3. Run controlled signup spot checks:
   - no-code signup remains pending when gate is on,
   - valid beta code signup is approved in `v2_beta_code_auto_approve`.
4. Run channel smoke checks without handler edits:
   - Telegram, WhatsApp, Slack, and SMS first inbound messages still route normally,
   - `onboarding.funnel.channel_first_message_latency` events are still emitted.
5. Keep telemetry watch active during launch window:
   - `onboarding.funnel.signup`
   - `onboarding.funnel.channel_first_message_latency`
6. Publish go/no-go decision in release log with operator on-call owner.

---

## Kill-switch + rollback contract (unchanged from FOG2-013)

Runbook source of truth: `MASTER_PLAN.md` -> `FOG2-013 Rollout + Rollback Runbook` (`./MASTER_PLAN.md#fog2-013-rollout--rollback-runbook`).

1. Emergency stop:
   - `betaAccess.setBetaOnboardingKillSwitch({ enabled: true })`
2. Verify rollback effect:
   - `betaAccess.getBetaGatingStatus`
   - Confirm `rollout.effectiveRolloutStage === "legacy_manual_approval"`.
3. Force explicit legacy state if needed:
   - `betaAccess.setBetaOnboardingRolloutControls({ rolloutStage: "legacy_manual_approval", killSwitchForceLegacyManualApproval: true })`.
4. Recovery path:
   - disable kill switch first,
   - re-promote `rolloutStage` to `v2_beta_code_auto_approve` only after validation checks pass.
5. Constraint:
   - do not alter Telegram/WhatsApp/Slack/SMS handlers or first-message telemetry in rollback execution.

---

## Closeout decision

1. `FOG2-014` is complete when:
   - verification commands pass,
   - this checklist is published,
   - workstream docs are synchronized,
   - kill-switch/rollback contract is confirmed unchanged.
2. Current state: `FOG2-014` is `DONE` after typecheck remediation in `convex/ai/agentExecution.ts` and successful rerun of all verification commands.
3. Lane `F` has no promotable rows in this scope.

---

## Lane G convergence guardrails

Use these guardrails when executing `FOG2-015` and `FOG2-016`.

Checkpoint (2026-02-27): `FOG2-015` is `DONE`; `FOG2-016` is `DONE`.

1. Preserve `FOG2-013` rollout/kill-switch/rollback contracts unchanged; rollback remains policy-only.
2. Enforce clone-first onboarding birthing and keep operator-default free-form create paths hidden.
3. Set `isPrimary=true` for first successful clone when no primary exists in `orgId + userId`.
4. Require capability-limit snapshot visibility at birthing handoff (`available now` vs `blocked`).
5. Route no-fit outcomes to purchase-only custom-agent concierge with exact terms: `€5,000 minimum`, `€2,500 deposit`, `includes 90-minute onboarding with engineer`.
6. Regression suite for these contracts is now required and landed in `tests/unit/onboarding/cloneFirstBirthingRegression.test.ts`.
7. Lane `G` closeout state: no promotable rows in scope `FOG2-015`..`FOG2-016`.
