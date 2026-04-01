# Segelschule Checkout + Universal Booking Master Plan

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/apps/segelschule-altwarp/docs`  
**Last updated:** 2026-04-01 (lane E hardening rerun)

---

## Objective

Ship a coherent booking system outcome across app and platform:

1. Segelschule booking completes with backend-enforced availability and seat capacity.
2. Checkout handoff is reliable and linked to booking context.
3. Google Calendar integration remains connected for confirmed bookings.
4. Org owners can configure this through universal mother-repo Booking UI and agent orchestration, not app-specific hardcoding.

---

## Why this stream exists

`CHECKOUT_INTEGRATION_PLAN.md` is directionally useful but not fully aligned with current code reality.

Key reality corrections:

1. Surface binding runtime resolution is already implemented (`backend binding -> env fallback`).
2. Real backend availability and seat maps are already wired in segelschule booking flow.
3. Backend seat enforcement and calendar handoff already exist in `resourceBookingsInternal`.
4. Mother repo already has a Setup Wizard tab and `configure_booking_workflow` actions.
5. Remaining work is cutover and hardening, not greenfield implementation.

---

## Current state in this codebase

### Segelschule app

1. `app/api/booking/availability/route.ts` uses backend seat availability snapshots and returns per-boat seat state.
2. `app/booking/page.tsx` consumes real availability and now uses confirmation-first step 4 (on-site payment + terms acceptance).
3. `app/api/booking/route.ts` currently creates and links:
   1. local booking object,
   2. CRM contact,
   3. optional frontend user link,
   4. optional `customerCheckoutInternal` resource booking,
   5. checkout session via `createPublicCheckoutSession` + `updatePublicCheckoutSession`,
   6. fulfillment via `completeCheckoutAndFulfill`,
   7. ticket context linkage for confirmation/email/lookup flow.

### Platform backend / mother repo

1. `convex/api/v1/resourceBookingsInternal.ts` enforces seat inventory and schedules calendar push for confirmed bookings.
2. `convex/frontendSurfaceBindings.ts` supports binding upsert/list/resolve for app-surface identities.
3. `convex/ai/tools/bookingWorkflowTool.ts` supports blueprint, binding upsert/list, and bootstrap actions.
4. `src/components/window-content/booking-window/booking-setup-wizard.tsx` already invokes those actions and supports inventory groups + profiles.

---

## Target state

### Segelschule flow

1. Step 4 is confirmation-only (on-site payment + terms acceptance), no card form.
2. Booking API uses fulfillment-backed checkout session path and persists booking/ticket context deterministically.
3. Confirmation includes ticket details and public ticket lookup path.
4. Ticket lookup page/API is available with secure code+email lookup.

### Universal setup flow

1. Booking Setup Wizard remains generic (`inventory groups`, `profiles`, `surface identity`) and reusable across org types.
2. Sailing school remains a preset template, not the schema.
3. Operator agent can drive setup from org-owner intent through interview and execute steps.

---

## Latest completion update (2026-04-01)

1. `SBQ-008` is complete: universal booking setup now defaults to generic/custom catalog behavior while keeping sailing-school as an explicit preset; surface identity normalization is enforced for stable binding resolution. Hardening rerun (2026-04-01) removed app-specific fallback defaults in setup tooling (`my-app` default) and made template normalization canonical.
2. `SBQ-009` is complete: operator chat kickoff now enforces deterministic `interview -> execute -> list bindings` sequencing with explicit `booking_writeback_v1` writeback contract handling. Hardening rerun (2026-04-01) now normalizes kickoff identities/app-slugs to lowercase and adds explicit execute-gate metadata before bootstrap execute mode.
3. `SBQ-010` is complete: booking creation now captures additive `calendarDiagnostics` (write-readiness snapshot, issue codes, recommendations) without changing hard-failure behavior.
4. `SBQ-011` is complete: tests now cover calendar diagnostics propagation in booking API responses, backend calendar handoff diagnostics, and blueprint readiness helper behavior.
5. `SBQ-012` is complete: rollout docs/env assumptions are synchronized with exact verification command evidence and local E2E assumptions (`mother backend: http://localhost:3000`, `segelschule app: http://localhost:3002`).
6. Lane `E` is now closed; all queue rows are complete.

---

## Phase map

| Phase | Rows | Outcome |
|---|---|---|
| `1` | `SBQ-001` | Queue authority established in this workstream root |
| `2` | `SBQ-002` to `SBQ-004` | Existing implemented capability captured as baseline |
| `3` | `SBQ-005`, `SBQ-006` | Segelschule checkout/on-site confirmation cutover |
| `4` | `SBQ-007` | Ticket retrieval and confirmation UX completion |
| `5` | `SBQ-008`, `SBQ-009` | Universal booking setup hardening in mother repo + operator path |
| `6` | `SBQ-010` to `SBQ-012` | Calendar diagnostics, tests, and rollout closeout |

---

## Acceptance criteria mapped to queue rows

| Acceptance criterion | Queue rows | Verification profiles |
|---|---|---|
| Queue-first planning artifacts exist and stay synced | `SBQ-001` | `V-DOCS` |
| Runtime config is backend-resolved with env fallback | `SBQ-002` | `V-BOOKING-UNIT-CORE`; `V-SEG-TYPE` |
| Seat availability and seat map are backend-driven | `SBQ-003` | `V-BOOKING-UNIT-CORE`; `V-SEG-TYPE` |
| Seat capacity + calendar handoff enforced in backend | `SBQ-004` | `V-BOOKING-UNIT-BACKEND`; `V-CONVEX-TYPE` |
| Checkout handoff is fulfillment-backed and durable | `SBQ-005`; `SBQ-006` | `V-CONVEX-TYPE`; `V-SEG-TYPE`; `V-ROOT-TYPE`; `V-SEG-BUILD` |
| Customer ticket retrieval flow is live | `SBQ-007` | `V-SEG-TYPE`; `V-SEG-BUILD` |
| Mother repo setup remains universal and agent-driven | `SBQ-008`; `SBQ-009` | `V-SETUP-UI-SMOKE`; `V-ROOT-TYPE` |
| Calendar visibility and tests are hardened | `SBQ-010`; `SBQ-011` | `V-CONVEX-TYPE`; `V-BOOKING-UNIT-BACKEND`; `V-BOOKING-UNIT-CORE`; `V-ROOT-TYPE` |
| Final env/docs and command evidence are published | `SBQ-012` | `V-DOCS`; `V-SEG-TYPE`; `V-SEG-BUILD`; `V-CONVEX-TYPE`; `V-ROOT-TYPE` |

---

## Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Segelschule API cutover breaks existing checkout redirect behavior | high | Keep additive response shape and guard with backward-compatible fallbacks |
| Calendar readiness diagnostics remain under-instrumented | medium | Complete `SBQ-010` before closing `SBQ-011`/`SBQ-012` |
| Ticket lookup introduces data exposure risk | high | Require ticket code + email and add deterministic anti-abuse handling |
| Universal setup regresses into sailing-specific labels/contracts | medium | Keep schema generic and confine sailing semantics to preset/template only |
| Calendar integration remains opaque during failures | medium | Add explicit readiness/diagnostic surfaced in setup/runtime tools |
| Documentation drifts from implementation | medium | Enforce row-level verification plus `V-DOCS` on closeout |

---

## Exit criteria

Status: all exit criteria satisfied as of 2026-04-01.

1. All `P0` rows in `TASK_QUEUE.md` are `DONE`.
2. Segelschule booking flow runs confirmation-based on-site payment UX without online card flow.
3. Booking and ticket context is linked end-to-end through checkout fulfillment.
4. Ticket lookup page/API and confirmation link path work.
5. Mother repo booking setup remains universal and operator-agent usable.
6. All verification profiles for closeout row `SBQ-012` are executed and recorded.
