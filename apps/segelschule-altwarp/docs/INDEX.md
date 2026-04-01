# Segelschule Checkout + Universal Booking Workstream Index

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/apps/segelschule-altwarp/docs`  
**Last updated:** 2026-04-01 (lane E hardening rerun)  
**Source request:** Convert `CHECKOUT_INTEGRATION_PLAN.md` into a queue-based implementation plan grounded in real monorepo code and validated with docs CI.

---

## Purpose

This workstream aligns three connected outcomes that were previously mixed:

1. `apps/segelschule-altwarp` booking flow completion (availability, seat capacity, checkout, confirmation UX).
2. Mother repo universal booking setup capability for org owners (wizard + agent orchestration).
3. Reusable surface binding architecture (backend-resolved config first, env fallback second).

The queue captures what is already implemented versus what remains to ship.

---

## Core files

1. Source plan:
   `/Users/foundbrand_001/Development/vc83-com/apps/segelschule-altwarp/docs/CHECKOUT_INTEGRATION_PLAN.md`
2. Queue:
   `/Users/foundbrand_001/Development/vc83-com/apps/segelschule-altwarp/docs/TASK_QUEUE.md`
3. Session prompts:
   `/Users/foundbrand_001/Development/vc83-com/apps/segelschule-altwarp/docs/SESSION_PROMPTS.md`
4. Master plan:
   `/Users/foundbrand_001/Development/vc83-com/apps/segelschule-altwarp/docs/MASTER_PLAN.md`
5. Index (this file):
   `/Users/foundbrand_001/Development/vc83-com/apps/segelschule-altwarp/docs/INDEX.md`
6. Command evidence log:
   `/Users/foundbrand_001/Development/vc83-com/apps/segelschule-altwarp/docs/CHECKOUT_INTEGRATION_PLAN.md` (Section 12)

---

## Status snapshot

1. `SBQ-001` is `DONE`: queue-first artifacts now exist in this workstream folder.
2. `SBQ-002` is `DONE`: segelschule runtime config resolves backend surface binding with env fallback.
3. `SBQ-003` is `DONE`: booking availability and seat maps are backend-driven in UI/API.
4. `SBQ-004` is `DONE`: seat inventory enforcement and confirmed-booking calendar handoff exist in backend.
5. `SBQ-005`, `SBQ-006`, and `SBQ-007` are `DONE`: checkout fulfillment cutover, confirmation-first Step 4, and ticket lookup surfaces are live.
6. `SBQ-008` and `SBQ-009` are `DONE`: setup wizard now runs custom-first universal defaults and operator kickoff enforces deterministic interview→execute→verify flow with writeback contract; 2026-04-01 hardening rerun revalidated generic `my-app` fallback defaults, lowercase identity normalization, and explicit execute-gate kickoff signaling.
7. `SBQ-010`, `SBQ-011`, and `SBQ-012` are `DONE` (calendar diagnostics hardening, test closeout, rollout evidence).
8. All queue rows are `DONE`; no open deterministic execution rows remain.

---

## Core repo facts captured by this stream

1. Segelschule runtime bridge already supports backend `frontend_surface_binding` resolution and env fallback.
2. Segelschule availability route already calls `getSeatAvailabilityInternal` with seat inventory groups.
3. Segelschule booking API now uses fulfillment-backed checkout session flow (`createPublicCheckoutSession`/`updatePublicCheckoutSession`/`completeCheckoutAndFulfill`) and links booking/ticket context end-to-end.
4. Mother repo booking window already includes a Setup Wizard tab and `configure_booking_workflow` integration.
5. `resourceBookingsInternal.customerCheckoutInternal` already enforces seat capacity and schedules calendar sync when status is confirmed.

---

## Post-cutover architecture snapshot

1. Booking submit path: segelschule UI (`/booking`) -> `/api/booking` -> local booking + `customerCheckoutInternal` seat-enforced booking -> checkout session create/update -> `completeCheckoutAndFulfill`.
2. Checkout compatibility: ticket product remains `type=product`, `subtype=ticket`; fallback/link failures emit warnings, not hard failures.
3. Calendar readiness: backend now emits additive `calendarDiagnostics` and booking API forwards them additively with `warnings`.
4. Ticket retrieval: `/ticket` + `/api/ticket` resolves ticket by code+email and returns booking context, payment status, and notes.
5. Universal setup defaults: booking setup catalog now defaults to generic/custom unless `sailing_school_two_boats` preset is explicitly selected.
6. Operator setup orchestration: booking setup chat kickoff now requires `bootstrap_booking_surface` interview first, then execute, then binding-list verification with PASS/FAIL.
7. Local E2E assumptions: mother backend `http://localhost:3000`, segelschule app `http://localhost:3002`.

---

## Lane board

- [x] Lane `A` docs authority and queue initialization: `SBQ-001`
- [x] Lane `B` baseline capability capture: `SBQ-002`, `SBQ-003`, `SBQ-004`
- [x] Lane `C` segelschule API checkout/on-site-payment cutover: `SBQ-005`, `SBQ-006`
- [x] Lane `D` ticket retrieval + confirmation UX: `SBQ-007`
- [x] Lane `E` universal mother-repo setup + operator flow: `SBQ-008`, `SBQ-009`
- [x] Lane `F` validation + rollout closeout: `SBQ-010`, `SBQ-011`, `SBQ-012`

---

## Scope boundary

Owned in this workstream:

1. Segelschule booking and checkout integration path.
2. Ticket retrieval UX/API for segelschule customers.
3. Universal booking setup hardening in mother repo Booking UI + agent orchestration.
4. Queue-first planning and verification contract for this stream.

Not owned in this workstream:

1. Hub-GW booking implementation.
2. Non-booking CMS/copy workstreams.
3. Unrelated payment provider refactors outside booking checkout handoff.

---

## Operating commands

1. Docs guard: `npm run docs:guard`
2. Segelschule typecheck: `npm --prefix apps/segelschule-altwarp run typecheck`
3. Segelschule build: `npm --prefix apps/segelschule-altwarp run build`
4. Repo typecheck: `npm run typecheck`
5. Convex typecheck: `npx tsc -p convex/tsconfig.json --noEmit`
