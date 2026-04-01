# Checkout Integration Plan — Segelschule Altwarp

**Status:** IMPLEMENTED (`SBQ-001` through `SBQ-012` closed on 2026-04-01; lane `E` hardening rerun applied 2026-04-01)
**Date:** 2026-04-01
**References:** [Anforderungsdokument](./Anforderungsdokument-Segelschule-Alwarp.md) Section 4.4, 4.5

---

## Implementation Reality Update (2026-04-01)

1. Checkout handoff is now fulfillment-backed (`createPublicCheckoutSession` + `updatePublicCheckoutSession` + `completeCheckoutAndFulfill`) and remains ticket-compatible (`type=product`, `subtype=ticket`).
2. Online payment is removed from booking submission payload semantics; booking submit defaults to invoice/on-site collection while keeping Stripe path dormant.
3. Ticket retrieval is live at `/ticket` with `/api/ticket` lookup (code + email) and deterministic anti-abuse/rate-limit handling.
4. Backend booking bridge keeps seat enforcement in `resourceBookingsInternal.customerCheckoutInternal` and now emits additive calendar readiness diagnostics for go-live operations.
5. Booking API response compatibility remains additive (`checkoutSession`, `warnings`, `platformBookingId`, `calendarDiagnostics`).
6. Non-critical patch/link failures remain warnings, not hard failures.
7. Universal booking setup in mother repo now defaults to generic/custom catalog behavior; sailing-school values remain template-only preset data.
8. Operator booking setup chat flow is deterministic (`interview -> execute -> list bindings`) with explicit `booking_writeback_v1` writeback contract guidance.
9. Lane `E` hardening rerun revalidated universal defaults (`my-app` fallback), canonical template resolution, lowercase kickoff identity normalization, and execute-gate metadata before bootstrap execute mode.

---

## 1. Problem

The current booking page (Step 4) has a full online payment UI — credit card form, Apple Pay, and PayPal tabs — backed by a Stripe checkout session flow in the API route.

The contract explicitly states:

> **"Keine Online-Zahlung – Zahlung erfolgt vor Ort"**
> Vor-Ort-Zahlungsmethoden: SumUp (Karte) und Voo (Mobile Payment)

Additionally, the contract requires:
- AGB/Stornobedingungen checkbox before booking (Section 4.4)
- Confirmation page with: email confirmation note, weather/packing list ~1 week before, T-shirt voucher hint for multi-day courses (Section 4.5)

---

## 2. Solution Overview

Keep the custom segelschule 4-step booking wizard (course → date/time/seats → personal info → confirmation). Remove the online payment UI. Map the completed booking to a **checkout session object** on the platform backend using the behavior-driven checkout system.

This gives us:
- **Transaction** created automatically (financial audit trail)
- **Ticket** issued with a unique code (product subtype "ticket")
- **CRM contact** auto-created for the customer
- **Email** sent via platform template system
- **Captain's admin** via the existing platform Tickets/Bookings/Transactions windows

Customers receive a ticket code and can later view their booking details (packing list, weather info, T-shirt voucher) on a `/ticket` page using their ticket code + email — no login required.

---

## 3. Platform Checkout System Integration

The platform's behavior-driven checkout is a reusable system that carries organization settings (products, payment types, allowed methods). We connect to it at the API level — the custom frontend collects all booking data, then the API route creates and completes a checkout session on the backend.

### 3.1 Key Platform Functions

| Function | File | Purpose |
|----------|------|---------|
| `createPublicCheckoutSession` | `convex/checkoutSessionOntology.ts:239` | Creates checkout session (no auth, uses system user) |
| `updatePublicCheckoutSession` | `convex/checkoutSessionOntology.ts:346` | Populates session with products, customer info, amounts |
| `completeCheckoutAndFulfill` | `convex/checkoutSessions.ts:661` | Orchestrates: CRM contact, purchase items, tickets, transactions, emails |
| `customerCheckoutInternal` | `convex/api/v1/resourceBookingsInternal.ts` | Creates resource booking with seat reservations |
| `createTicketInternal` | `convex/ticketOntology.ts:209` | Creates ticket instance from a ticket product |

### 3.2 Payment Method Mapping

The `completeCheckoutAndFulfill` action supports non-Stripe payment:
- `paymentMethod: "invoice"` → skips Stripe verification, preserves full amount, status = "pending"
- `paymentMethod: "free"` → skips Stripe, amount = 0
- `paymentMethod: "stripe"` → verifies with Stripe (current, being replaced)

For on-site payment we use **`paymentMethod: "invoice"`** with `paymentIntentId: "on_site_{bookingId}"`. This preserves the booking amount in the transaction record while skipping any online payment gateway.

### 3.3 Ticket Product Prerequisite

The `completeCheckoutAndFulfill` flow creates tickets from products with `type: "product"`, `subtype: "ticket"`. The segelschule org needs at least one such product.

Approach: Add a helper `ensureTicketProduct()` in the API route that queries for an existing ticket product in the org. If none exists, it creates a generic "Segelschule Kurs-Ticket" product. This runs once and the ID is reused for subsequent bookings.

---

## 4. Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  CUSTOMER: Booking Wizard (Steps 1–4)                           │
│  Course → Date/Time/Seats → Personal Info → Confirm & AGB      │
└──────────────────────────┬──────────────────────────────────────┘
                           │ POST /api/booking
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  API ROUTE: /api/booking                                        │
│                                                                 │
│  1. Validate payload (course, date, seats, formData, agreedTo-  │
│     Terms) — no paymentMethod required                          │
│                                                                 │
│  2. Resolve runtime config (backend binding → env → defaults)   │
│                                                                 │
│  3. Create local booking object (insertObjectInternal)          │
│                                                                 │
│  4. Create CRM contact + frontend user (existing bridge)        │
│                                                                 │
│  5. Resource booking (customerCheckoutInternal)                 │
│     → seat reservation, capacity check                          │
│                                                                 │
│  6. ┌── NEW: Checkout Session Flow ──────────────────────────┐  │
│     │ a. createPublicCheckoutSession()                       │  │
│     │    → checkout_session object (status: "active")        │  │
│     │                                                        │  │
│     │ b. updatePublicCheckoutSession()                       │  │
│     │    → products, customer info, amounts, currency        │  │
│     │                                                        │  │
│     │ c. completeCheckoutAndFulfill()                        │  │
│     │    → paymentMethod: "invoice"                          │  │
│     │    → paymentIntentId: "on_site_{bookingId}"            │  │
│     │    → Creates: CRM contact, ticket, transaction, email  │  │
│     │                                                        │  │
│     │ d. Generate ticket code: "SA-" + 7-char alphanumeric   │  │
│     │    → Patch ticket with ticketCode                      │  │
│     └────────────────────────────────────────────────────────┘  │
│                                                                 │
│  7. Patch booking context (ticketId, ticketCode, paymentType)   │
│                                                                 │
│  8. Send segelschule-branded email (with ticket code + link)    │
│                                                                 │
│  → Return { bookingId, ticketCode, ticketId }                   │
└──────────────────────────┬──────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  FRONTEND: Confirmation Page                                    │
│  ✓ Booking details + ticket code                                │
│  ✓ "Bestätigung per E-Mail" hint                                │
│  ✓ "Packliste & Wetterinfo ~1 Woche vorher" hint               │
│  ✓ T-shirt voucher (multi-day only)                             │
│  ✓ "Zahlung vor Ort (SumUp/Voo)" reminder                      │
│  ✓ Link: "Dein Ticket anzeigen" → /ticket?code=XX&email=YY     │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. Ticket Lookup Flow

```
┌──────────────────────────────────────┐
│  /ticket?code=SA-xxx&email=yyy       │
│  OR                                  │
│  /ticket (form: code + email input)  │
└──────────────────┬───────────────────┘
                   │ GET /api/ticket?code=XX&email=YY
                   ▼
┌──────────────────────────────────────┐
│  API: Query tickets by org           │
│  Match: ticketCode + holderEmail     │
│  Rate limited by IP                  │
└──────────────────┬───────────────────┘
                   ▼
┌──────────────────────────────────────┐
│  Ticket Detail Page                  │
│  • Course, date, time, participants  │
│  • Boat & seats                      │
│  • Total price + "Zahlung vor Ort"   │
│  • Packing list (from captain)       │
│  • Weather info (from captain)       │
│  • T-shirt voucher (if multi-day)    │
│  • Booking status                    │
└──────────────────────────────────────┘
```

**Security:** Ticket code (7-char alphanumeric, ~30^7 = 21.8B combinations) + email address combo. Rate limited to prevent brute force.

---

## 6. Captain's Workflow

No changes needed in the mother repo platform. The captain uses existing admin windows:

| Admin Window | What the Captain Does |
|---|---|
| **Tickets** | View all issued tickets. Open detail modal → update `packingList` and `weatherInfo` in customProperties (~1 week before course) |
| **Bookings** | View resource bookings with seat allocations per boat |
| **Transactions** | View financial records. Mark as "paid" when payment is collected on-site via SumUp/Voo |

Future enhancement: A dedicated "upcoming courses" bulk-update view. Out of scope for this iteration.

---

## 7. Files to Change

| File | Action |
|------|--------|
| `app/booking/page.tsx` | Remove payment UI (card/ApplePay/PayPal), add "Zahlung vor Ort" info + AGB checkbox, show ticket code on confirmation |
| `app/api/booking/route.ts` | Remove Stripe checkout block, add checkout session creation + fulfillment flow |
| `app/ticket/page.tsx` | **NEW** — ticket lookup page (code + email) |
| `app/api/ticket/route.ts` | **NEW** — ticket lookup API route |
| `lib/translations.ts` | Remove 8 payment keys, rename step, add ~15 new keys (4 languages) |
| `lib/email.ts` | Add ticket code row, on-site payment row, ticket page CTA link |
| `lib/booking-runtime-contracts.ts` | Remove `buildCheckoutMetadata` and related (no longer used) |

**Unchanged:** `lib/booking-platform-bridge.ts`, `lib/server-convex.ts`, `app/api/booking/availability/route.ts`, `app/api/contact/route.ts`

---

## 8. Translation Changes (All 4 Languages: DE, EN, NL, CH)

### Remove
`paymentInfo`, `cardNumber`, `expiryDate`, `cardholderName`, `securePayment`, `useApplePay`, `paypalRedirect`, `payLabel`

### Rename
`steps.payment` → `steps.confirmation`

### Add
| Key | DE | EN |
|-----|----|----|
| `onSitePaymentTitle` | Zahlung vor Ort | Payment on Site |
| `onSitePaymentDesc` | Die Zahlung erfolgt vor Ort per Kartenzahlung (SumUp) oder mobil (Voo). | Payment is collected on-site via card (SumUp) or mobile (Voo). |
| `agreeToTerms` | Ich akzeptiere die AGB und Stornobedingungen | I accept the terms and cancellation policy |
| `confirmBooking` | Buchung bestätigen | Confirm Booking |
| `confirmationEmailNote` | Sie erhalten eine Bestätigung per E-Mail. | You will receive a confirmation by email. |
| `confirmationWeatherNote` | Ca. 1 Woche vor Kursbeginn erhalten Sie Wetterinfo und eine Packliste. | About 1 week before the course you'll receive weather info and a packing list. |
| `confirmationTshirtNote` | Ihr T-Shirt-Gutschein kann im Outfitter Shop Altwarp eingelöst werden. | Your T-shirt voucher can be redeemed at Outfitter Shop Altwarp. |
| `viewTicket` | Dein Ticket anzeigen | View Your Ticket |
| `ticketPageTitle` | Dein Segeltörn-Ticket | Your Sailing Ticket |
| `ticketLookupTitle` | Ticket abrufen | Look Up Ticket |
| `ticketCode` | Ticket-Code | Ticket Code |
| `ticketEmail` | E-Mail-Adresse | Email Address |
| `ticketNotFound` | Ticket nicht gefunden | Ticket not found |
| `packingListTitle` | Packliste | Packing List |
| `weatherInfoTitle` | Wetter-Info | Weather Info |
| `noInfoYet` | Wird ca. 1 Woche vor Kursbeginn aktualisiert | Will be updated about 1 week before the course |

(NL and CH translations follow same pattern)

---

## 9. Ticket Code Format

```
Prefix:    "SA-"  (Segelschule Altwarp)
Body:      7 characters
Charset:   23456789abcdefghjkmnpqrstuvwxyz  (no 0/O/1/I/l — avoids confusion)
Example:   SA-m4kp7nx
Entropy:   30^7 ≈ 21.8 billion combinations
```

Generated inline in the booking API route. No external dependency needed.

---

## 10. Verification Checklist

- [x] `npx tsc -p convex/tsconfig.json --noEmit` passes.
- [x] `npm --prefix apps/segelschule-altwarp run typecheck` passes.
- [x] `npm run typecheck` passes.
- [x] `npm run test:unit -- tests/unit/booking/segelschuleBookingRoute.test.ts tests/unit/booking/segelschuleTicketRoute.test.ts tests/unit/booking/segelschuleBookingRuntimeContracts.test.ts` passes.
- [x] `npm run test:unit -- tests/unit/booking/frontendSurfaceBindings.test.ts tests/unit/ai/bookingWorkflowSetupBlueprint.test.ts` passes.
- [x] `node ./node_modules/tsx/dist/cli.mjs scripts/seed-segelschule-booking-workflow.ts --inspect-only --env apps/segelschule-altwarp/.env.local` passes.
- [x] `node ./node_modules/tsx/dist/cli.mjs scripts/seed-segelschule-booking-workflow.ts --env apps/segelschule-altwarp/.env.local` passes.
- [x] `npm run seed:segelschule:booking -- --inspect-only --env apps/segelschule-altwarp/.env.local` passes.
- [x] `npm run seed:segelschule:booking -- --env apps/segelschule-altwarp/.env.local` passes.
- [x] `npm run docs:guard` passes.

---

## 11. What This Does NOT Change

- Seat enforcement source-of-truth remains backend `resourceBookingsInternal.customerCheckoutInternal`.
- Checkout remains ticket-compatible (`type=product`, `subtype=ticket`) with fallback/warning behavior, not hard failure.
- Response compatibility remains additive (`checkoutSession`, `warnings`, `platformBookingId`, `calendarDiagnostics`, ticket context).
- Non-critical patch/linking failures remain warning-only and do not block successful booking completion.
- Local E2E assumptions remain `mother backend: http://localhost:3000` and `segelschule app: http://localhost:3002`.
- Stripe remains dormant (not removed) and can be reactivated via payment settings without reversing on-site confirmation UX.

---

## 12. Command Evidence (2026-04-01)

### Seed + idempotency checks

| Command | Result | Key output evidence |
|---|---|---|
| `node ./node_modules/tsx/dist/cli.mjs scripts/seed-segelschule-booking-workflow.ts --inspect-only --env apps/segelschule-altwarp/.env.local` | `PASS` | `organizationId: ks76v27s40kzdqhf5x5ztqrdth83erpy`; `paymentProviders[0].providerCode: invoice`; `surfaceBindings[0].name: segelschule-altwarp:booking:default` |
| `node ./node_modules/tsx/dist/cli.mjs scripts/seed-segelschule-booking-workflow.ts --env apps/segelschule-altwarp/.env.local` | `PASS` | `invoiceProvider.created: false`; `ticketProduct.created: false`; `surfaceBinding.created: false`; `bindingCount: 1` |
| `npm run seed:segelschule:booking -- --inspect-only --env apps/segelschule-altwarp/.env.local` | `PASS` | `seed:segelschule:booking`; `organizationId: ks76v27s40kzdqhf5x5ztqrdth83erpy`; `surfaceBindings[0].surfaceType: booking` |
| `npm run seed:segelschule:booking -- --env apps/segelschule-altwarp/.env.local` | `PASS` | `seed:segelschule:booking`; `prepared.resourceByCourseId.schnupper: ns751eb6df13cvkrqs4afbnytx840d67`; `bindingCount: 1` |

### Required verification commands

| Command | Result | Key output evidence |
|---|---|---|
| `npx tsc -p convex/tsconfig.json --noEmit` | `PASS` | Exit code `0` (no compiler errors emitted). |
| `npm --prefix apps/segelschule-altwarp run typecheck` | `PASS` | `> segelschule-altwarp@0.1.0 typecheck`; `> tsc --noEmit -p tsconfig.json` |
| `npm run typecheck` | `PASS` | `> l4yercak3-com@0.1.0 typecheck`; `> tsc --noEmit` |
| `npm run test:unit -- tests/unit/booking/segelschuleBookingRoute.test.ts tests/unit/booking/segelschuleTicketRoute.test.ts tests/unit/booking/segelschuleBookingRuntimeContracts.test.ts` | `PASS` | `Test Files 3 passed (3)`; `Tests 13 passed (13)` |
| `npm run test:unit -- tests/unit/booking/frontendSurfaceBindings.test.ts tests/unit/ai/bookingWorkflowSetupBlueprint.test.ts` | `PASS` | `Test Files 2 passed (2)`; `Tests 11 passed (11)` |
| `npm run docs:guard` | `PASS` | `> bash scripts/ci/check-docs-guard.sh`; `Docs guard passed.` |
