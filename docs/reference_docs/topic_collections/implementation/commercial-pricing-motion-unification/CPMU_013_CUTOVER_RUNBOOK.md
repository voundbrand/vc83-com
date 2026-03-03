# CPMU-013 Cutover & Rollback Runbook

**Date:** 2026-03-02  
**Scope:** Controlled public legacy Pro/Scale visibility cutover and deterministic rollback handling.

---

## Cutover toggle contract

Runtime toggle key:

- `NEXT_PUBLIC_CPMU_LEGACY_PUBLIC_CUTOVER_MODE`

Allowed values:

1. `compatibility` (default)
   - Legacy Pro/Scale cards are visible only for workspaces with legacy subscription access.
2. `cutover_hide_legacy`
   - Legacy Pro/Scale cards are hidden on public Store surfaces.
   - Manual super-admin reveal remains available for supervised checks.
3. `rollback_show_legacy_public`
   - Emergency rollback mode that temporarily reveals legacy Pro/Scale cards on public Store surfaces.

Implementation references:

- `src/lib/commercial-cutover.ts`
- `src/components/window-content/store-window.tsx`
- `src/components/window-content/store/store-plan-cards.tsx`
- `apps/one-of-one-landing/app/page.tsx`

---

## Promotion gate references

Use the CPMU-012 measurable gates as the go/no-go contract:

1. Metadata completeness `>=99.5%`.
2. Checkout failure-rate delta `<=0` vs baseline window.
3. Credit drift incidents `=0`.
4. Backoffice continuity incidents `=0`.
5. Subscriber continuity incidents `=0`.

If any gate breaches threshold for two consecutive windows, rollback mode is required.

---

## Rollback trigger thresholds

Trigger rollback immediately when any of the following are confirmed:

1. Metadata completeness falls below `99.5%` in two consecutive windows.
2. Checkout failure-rate delta is above baseline in two consecutive windows.
3. Any non-zero credit drift in validation cohort.
4. Any subscriber renewal/management entitlement regression.
5. Any blocked backoffice billing/credits operation tied to cutover.

---

## Operator steps

1. Validate current gate window against CPMU-012 thresholds.
2. If all gates pass, set `NEXT_PUBLIC_CPMU_LEGACY_PUBLIC_CUTOVER_MODE=cutover_hide_legacy`.
3. Re-run smoke checks on Store + landing handoff + checkout start paths.
4. Continue hourly gate checks during first stabilization window.
5. If rollback trigger hits, set `NEXT_PUBLIC_CPMU_LEGACY_PUBLIC_CUTOVER_MODE=rollback_show_legacy_public`.
6. Confirm legacy card visibility restored and re-run checkout/credits/backoffice continuity checks.
7. Resolve incident root cause, then move back to `compatibility` or `cutover_hide_legacy` only after two clean windows.

---

## Verification commands

Required for CPMU-013 completion:

- `npm run typecheck`
- `npm run lint`
- `npm run docs:guard`
