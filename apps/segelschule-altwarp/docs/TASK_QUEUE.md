# Segelschule Checkout + Universal Booking Task Queue

**Last updated:** 2026-04-01 (lane E hardening rerun)  
**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/apps/segelschule-altwarp/docs`  
**Source request:** Convert `CHECKOUT_INTEGRATION_PLAN.md` into a queue-first implementation plan grounded in current monorepo reality and docs CI.

---

## Queue rules

1. Allowed statuses are only: `READY`, `IN_PROGRESS`, `PENDING`, `BLOCKED`, `DONE`.
2. Only one row may be `IN_PROGRESS` globally unless explicit temporary concurrency is approved.
3. Promote `PENDING` to `READY` only when all dependency tokens are satisfied.
4. Deterministic execution order is `P0` before `P1`, then lowest task ID.
5. Keep segelschule app-specific UX work decoupled from reusable mother-repo setup logic.
6. Do not regress backend surface binding resolution (`backend first`, `env fallback`).
7. Keep seat inventory enforcement source-of-truth in backend (`resourceBookingsInternal`), not client-only checks.
8. Keep checkout handoff and booking context linking additive and backward-compatible where feasible.
9. Sync `TASK_QUEUE.md`, `SESSION_PROMPTS.md`, `INDEX.md`, `MASTER_PLAN.md` whenever row status changes.
10. Each row must remain a 1-2 hour implementation slice with explicit `Verify` commands.

---

## Dependency token semantics

1. `ID`: dependency row must be `DONE` before this row can move to `READY`.
2. `ID@READY`: dependency row must be `READY` or `DONE` before this row can move to `READY`.
3. `ID@DONE_GATE`: row may start, but cannot move to `DONE` until dependency row is `DONE`.

---

## Verification profiles

| Profile | Command |
|---|---|
| `V-DOCS` | `npm run docs:guard` |
| `V-SEG-TYPE` | `npm --prefix apps/segelschule-altwarp run typecheck` |
| `V-SEG-BUILD` | `npm --prefix apps/segelschule-altwarp run build` |
| `V-ROOT-TYPE` | `npm run typecheck` |
| `V-CONVEX-TYPE` | `npx tsc -p convex/tsconfig.json --noEmit` |
| `V-BOOKING-UNIT-CORE` | `npm run test:unit -- tests/unit/booking/segelschuleBookingPlatformBridge.test.ts tests/unit/booking/segelschuleAvailabilityRoute.test.ts tests/unit/booking/segelschuleBookingRuntimeContracts.test.ts` |
| `V-BOOKING-UNIT-BACKEND` | `npm run test:unit -- tests/unit/booking/resourceBookingsInternalSeatInventory.test.ts tests/unit/booking/resourceBookingsInternalCalendarHandoff.test.ts tests/unit/booking/frontendSurfaceBindings.test.ts` |
| `V-SETUP-UI-SMOKE` | `rg -n "BookingSetupWizard|configure_booking_workflow|bootstrap_booking_surface|inventoryGroups|booking-tab-setup" src/components/window-content/booking-window.tsx src/components/window-content/booking-window/booking-setup-wizard.tsx convex/ai/tools/bookingWorkflowTool.ts` |

---

## Execution lanes

| Lane | Purpose | Primary ownership | Merge-overlap policy |
|---|---|---|---|
| `A` | Queue authority and repo-reality alignment | Workstream docs | Keep docs authoritative for implementation order |
| `B` | Existing backend capability baseline | `apps/segelschule-altwarp/lib`, `convex/api/v1/resourceBookingsInternal.ts` | Record current `DONE` capability rows before new changes |
| `C` | Segelschule booking/checkout API cutover | `apps/segelschule-altwarp/app/api/booking/route.ts`, related contracts | Preserve backward compatibility for current API response keys |
| `D` | Segelschule booking UX + ticket retrieval | `apps/segelschule-altwarp/app/booking`, `app/ticket`, translations, email | No direct Convex schema mutations in this lane |
| `E` | Mother repo universal setup + operator orchestration | `src/components/window-content/booking-window/*`, `convex/ai/tools/bookingWorkflowTool.ts`, chat prompts | Keep setup schema generic (`inventory groups`, `profiles`) not domain-hardcoded |
| `F` | Verification, tests, rollout docs/env | tests + segelschule deployment/env docs | Do not mark stream complete without full verification matrix |

---

## Dependency-based status flow

1. Close lane `A` baseline (`SBQ-001`) before modifying execution priorities.
2. Treat lane `B` capability rows as baseline evidence (`SBQ-002` to `SBQ-004`).
3. Execute lane `C` cutover (`SBQ-005`, `SBQ-006`) before ticket lookup in lane `D`.
4. Execute lane `D` (`SBQ-007`) before final calendar hardening/tests in lane `F`.
5. Lane `E` can run in parallel with lane `C` after `SBQ-001`, but must not change segelschule API contracts.
6. Final rollout row `SBQ-012` only after all `P0` rows are `DONE`.

---

## Task queue

| ID | Lane | Plan | Priority | Status | Depends On | Task | Primary files | Verify | Notes |
|---|---|---:|---|---|---|---|---|---|---|
| `SBQ-001` | `A` | 1 | `P0` | `DONE` | - | Convert checkout plan into queue-first workstream artifacts tied to real monorepo state | `/Users/foundbrand_001/Development/vc83-com/apps/segelschule-altwarp/docs/CHECKOUT_INTEGRATION_PLAN.md`; `/Users/foundbrand_001/Development/vc83-com/apps/segelschule-altwarp/docs/TASK_QUEUE.md`; `/Users/foundbrand_001/Development/vc83-com/apps/segelschule-altwarp/docs/SESSION_PROMPTS.md`; `/Users/foundbrand_001/Development/vc83-com/apps/segelschule-altwarp/docs/INDEX.md`; `/Users/foundbrand_001/Development/vc83-com/apps/segelschule-altwarp/docs/MASTER_PLAN.md` | `V-DOCS` | Completed 2026-04-01 in this planning pass. |
| `SBQ-002` | `B` | 2 | `P0` | `DONE` | `SBQ-001` | Backend-resolved runtime config and env fallback are wired for segelschule booking surfaces | `/Users/foundbrand_001/Development/vc83-com/apps/segelschule-altwarp/lib/booking-platform-bridge.ts`; `/Users/foundbrand_001/Development/vc83-com/apps/segelschule-altwarp/app/api/booking/route.ts`; `/Users/foundbrand_001/Development/vc83-com/apps/segelschule-altwarp/app/api/booking/availability/route.ts`; `/Users/foundbrand_001/Development/vc83-com/tests/unit/booking/segelschuleBookingPlatformBridge.test.ts` | `V-BOOKING-UNIT-CORE`; `V-SEG-TYPE` | Already implemented; keep as baseline invariant. |
| `SBQ-003` | `B` | 2 | `P0` | `DONE` | `SBQ-002` | Replace mocked seat availability with backend seat snapshots in segelschule booking UI flow | `/Users/foundbrand_001/Development/vc83-com/apps/segelschule-altwarp/app/booking/page.tsx`; `/Users/foundbrand_001/Development/vc83-com/apps/segelschule-altwarp/app/api/booking/availability/route.ts`; `/Users/foundbrand_001/Development/vc83-com/tests/unit/booking/segelschuleAvailabilityRoute.test.ts` | `V-BOOKING-UNIT-CORE`; `V-SEG-TYPE` | Already implemented; default local boat state remains as pre-fetch fallback only. |
| `SBQ-004` | `B` | 2 | `P0` | `DONE` | `SBQ-002` | Enforce seat inventory and schedule Google Calendar push on confirmed bookings in backend booking creation | `/Users/foundbrand_001/Development/vc83-com/convex/api/v1/resourceBookingsInternal.ts`; `/Users/foundbrand_001/Development/vc83-com/tests/unit/booking/resourceBookingsInternalSeatInventory.test.ts`; `/Users/foundbrand_001/Development/vc83-com/tests/unit/booking/resourceBookingsInternalCalendarHandoff.test.ts` | `V-BOOKING-UNIT-BACKEND`; `V-CONVEX-TYPE` | Already implemented; strict seat selection and post-confirmation calendar handoff exist. |
| `SBQ-005` | `C` | 3 | `P0` | `DONE` | `SBQ-004` | Cut over segelschule booking API checkout handoff to fulfillment-backed checkout session (`createPublicCheckoutSession`/`updatePublicCheckoutSession`/`completeCheckoutAndFulfill`) with durable booking context linking | `/Users/foundbrand_001/Development/vc83-com/apps/segelschule-altwarp/app/api/booking/route.ts`; `/Users/foundbrand_001/Development/vc83-com/apps/segelschule-altwarp/lib/booking-runtime-contracts.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/checkoutSessionOntology.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/checkoutSessions.ts` | `V-CONVEX-TYPE`; `V-SEG-TYPE`; `V-ROOT-TYPE` | Completed 2026-04-01 with additive response compatibility (`checkoutSession`, `warnings`, `platformBookingId`). |
| `SBQ-006` | `C` | 3 | `P0` | `DONE` | `SBQ-005` | Remove online payment requirement from segelschule payload contract and align API/UI to on-site payment + terms-confirmed booking submission | `/Users/foundbrand_001/Development/vc83-com/apps/segelschule-altwarp/app/api/booking/route.ts`; `/Users/foundbrand_001/Development/vc83-com/apps/segelschule-altwarp/app/booking/page.tsx`; `/Users/foundbrand_001/Development/vc83-com/apps/segelschule-altwarp/lib/translations.ts` | `V-SEG-TYPE`; `V-SEG-BUILD` | Completed 2026-04-01; online payment UI removed and terms acceptance now required. |
| `SBQ-007` | `D` | 4 | `P0` | `DONE` | `SBQ-005`, `SBQ-006` | Add ticket retrieval surface (`/ticket` page + `/api/ticket`) and include ticket context in customer email + confirmation page | `/Users/foundbrand_001/Development/vc83-com/apps/segelschule-altwarp/app/ticket/page.tsx`; `/Users/foundbrand_001/Development/vc83-com/apps/segelschule-altwarp/app/api/ticket/route.ts`; `/Users/foundbrand_001/Development/vc83-com/apps/segelschule-altwarp/lib/email.ts`; `/Users/foundbrand_001/Development/vc83-com/apps/segelschule-altwarp/app/booking/page.tsx` | `V-SEG-TYPE`; `V-SEG-BUILD` | Completed 2026-04-01 with ticket code + email lookup and anti-abuse rate limiting. |
| `SBQ-008` | `E` | 5 | `P0` | `DONE` | `SBQ-001` | Harden universal booking setup in mother repo UI/tooling so org owners can configure inventory groups, profiles, checkout bindings, and surfaces without app-specific hardcoding | `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/booking-window.tsx`; `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/booking-window/booking-setup-wizard.tsx`; `/Users/foundbrand_001/Development/vc83-com/convex/ai/tools/bookingWorkflowTool.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/frontendSurfaceBindings.ts` | `V-SETUP-UI-SMOKE`; `V-ROOT-TYPE` | Completed 2026-04-01 with custom-first template defaults, normalized surface identities, and wizard interview/execute hardening while keeping sailing preset additive-only. Revalidated/hardened 2026-04-01: generic `my-app` fallback and canonical template normalization in setup tooling. |
| `SBQ-009` | `E` | 5 | `P1` | `DONE` | `SBQ-008` | Strengthen operator-agent setup path for org-owner chat intent (`setup booking for my app`) with deterministic interview → execute flow and writeback behavior | `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/ai-chat-window/index.tsx`; `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/ai-chat-window/kickoff-message-visibility.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/ai/prompts/pageBuilderSystem.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/ai/tools/bookingWorkflowTool.ts` | `V-SETUP-UI-SMOKE`; `V-ROOT-TYPE` | Completed 2026-04-01 with kickoff required-sequence contract, booking_writeback enforcement, and deterministic bootstrap interview→execute orchestration. Revalidated/hardened 2026-04-01: lowercase identity kickoff normalization and explicit execute gate marker before bootstrap execute mode. |
| `SBQ-010` | `F` | 6 | `P0` | `DONE` | `SBQ-005`, `SBQ-007` | Harden calendar integration checks for booking creation and expose actionable readiness diagnostics for ops during go-live | `/Users/foundbrand_001/Development/vc83-com/convex/api/v1/resourceBookingsInternal.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/ai/tools/bookingWorkflowTool.ts`; `/Users/foundbrand_001/Development/vc83-com/apps/segelschule-altwarp/app/api/booking/route.ts` | `V-CONVEX-TYPE`; `V-BOOKING-UNIT-BACKEND`; `V-ROOT-TYPE` | Completed 2026-04-01 with additive `calendarDiagnostics`, warning-only readiness signaling, and blueprint readiness recommendations for ops. |
| `SBQ-011` | `F` | 6 | `P0` | `DONE` | `SBQ-006`, `SBQ-007`, `SBQ-010` | Add and adjust tests for checkout fulfillment cutover, ticket lookup flow, and backward compatibility behavior | `/Users/foundbrand_001/Development/vc83-com/tests/unit/booking/segelschuleBookingRoute.test.ts`; `/Users/foundbrand_001/Development/vc83-com/tests/unit/booking/segelschuleTicketRoute.test.ts`; `/Users/foundbrand_001/Development/vc83-com/tests/unit/booking/segelschuleBookingRuntimeContracts.test.ts` | `V-BOOKING-UNIT-CORE`; `V-BOOKING-UNIT-BACKEND`; `V-ROOT-TYPE` | Completed 2026-04-01 with route diagnostics/warning tests, backend calendar handoff diagnostics tests, and setup blueprint readiness helper tests. |
| `SBQ-012` | `F` | 6 | `P1` | `DONE` | `SBQ-011` | Finalize env/config rollout docs and close stream with full command evidence | `/Users/foundbrand_001/Development/vc83-com/apps/segelschule-altwarp/.env.example`; `/Users/foundbrand_001/Development/vc83-com/apps/segelschule-altwarp/DEPLOYMENT.md`; `/Users/foundbrand_001/Development/vc83-com/apps/segelschule-altwarp/docs/CHECKOUT_INTEGRATION_PLAN.md`; `/Users/foundbrand_001/Development/vc83-com/apps/segelschule-altwarp/docs/INDEX.md` | `V-DOCS`; `V-SEG-TYPE`; `V-SEG-BUILD`; `V-CONVEX-TYPE`; `V-ROOT-TYPE` | Completed 2026-04-01 with rollout assumptions (`localhost:3000`/`localhost:3002`), seed/idempotency validation, and exact verification command evidence. |

---

## Current kickoff

1. Active task count: `0` rows in `IN_PROGRESS`.
2. Next deterministic promotable row: none (`all rows are DONE`).
3. Lane `E` rows `SBQ-008` and `SBQ-009` are complete; this queue is fully closed.
