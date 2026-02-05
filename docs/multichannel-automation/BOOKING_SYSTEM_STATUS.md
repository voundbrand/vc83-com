# Booking System Implementation Status

**Last Updated**: January 2026

This document tracks the implementation progress of the all-purpose booking system as defined in [BOOKING_SYSTEM_ARCHITECTURE.md](./BOOKING_SYSTEM_ARCHITECTURE.md).

---

## Summary

| Phase | Status | Description |
|-------|--------|-------------|
| Phase 1: Data Model Foundation | ✅ Complete | Product subtypes, schemas, tier configs |
| Phase 2: Core Ontologies | ✅ Complete | Location, Availability, Booking ontologies |
| Phase 3: API Endpoints | ✅ Complete | HTTP handlers and route registration |
| Phase 4: Payments & Confirmation | ✅ Complete | Transaction types, payment processing, refunds |
| Phase 5: Advanced Features | ⭕ Pending | Recurring bookings, multi-resource, reminders |
| Phase 6: UI Components | ✅ Complete | Admin windows, booking forms, calendars |
| Phase 7: Internationalization | ⭕ Pending | Hardcoded English strings need i18n keys |

---

## Completed Work

### Phase 1: Data Model Foundation ✅

#### Product Subtypes Updated

**Files modified:**
- `convex/productOntology.ts` (line ~439)
- `convex/api/v1/products.ts` (lines 246, 358, 967, 1051)
- `convex/api/v1/productsInternal.ts` (line ~92)

**New subtypes added:**
```typescript
// RESOURCE TYPES (bookable things)
"room"        // Hotel rooms, meeting rooms, studios
"staff"       // Therapists, consultants, instructors
"equipment"   // Vehicles, projectors, tools
"space"       // Desks, parking spots, lockers

// SERVICE TYPES (bookable with resource requirements)
"appointment" // 1:1 meetings, consultations
"class"       // Group sessions with max participants
"treatment"   // Spa, medical - may require multiple resources
```

#### Tier Configuration Updated

**File:** `convex/licensing/tierConfigs.ts`

**New limits added:**
| Limit | Free | Starter | Pro | Agency | Enterprise |
|-------|------|---------|-----|--------|------------|
| maxBookableResources | 3 | 20 | 100 | 500 | ∞ |
| maxBookingsPerMonth | 20 | 200 | 1000 | 5000 | ∞ |
| maxRecurringSeriesLength | 0 | 12 | 52 | 104 | ∞ |
| maxResourcesPerBooking | 1 | 3 | 10 | 20 | ∞ |

**New features added:**
| Feature | Free | Starter | Pro | Agency | Enterprise |
|---------|------|---------|-----|--------|------------|
| bookingsEnabled | ✅ | ✅ | ✅ | ✅ | ✅ |
| recurringBookingsEnabled | ❌ | ✅ | ✅ | ✅ | ✅ |
| multiResourceBookingsEnabled | ❌ | ✅ | ✅ | ✅ | ✅ |
| depositPaymentsEnabled | ❌ | ✅ | ✅ | ✅ | ✅ |
| bookingRemindersEnabled | ❌ | ✅ | ✅ | ✅ | ✅ |
| bufferTimeEnabled | ❌ | ✅ | ✅ | ✅ | ✅ |
| multiLocationEnabled | ❌ | ❌ | ✅ | ✅ | ✅ |

---

### Phase 2: Core Ontologies ✅

#### Location Ontology

**File:** `convex/locationOntology.ts`

**Exports:**
- `getOrganizationLocations` - Query to list locations
- `getLocationDetail` - Query to get single location
- `createLocation` - Mutation to create location
- `updateLocation` - Mutation to update location
- `archiveLocation` - Mutation to archive location

**Internal functions:**
- `getLocationInternal` - For API endpoints
- `createLocationInternal` - For API endpoints
- `updateLocationInternal` - For API endpoints
- `archiveLocationInternal` - For API endpoints

**Location object structure:**
```typescript
{
  type: "location",
  subtype: "branch" | "venue" | "virtual",
  name: string,
  customProperties: {
    address: { street, city, state, postalCode, country },
    timezone: string,
    defaultOperatingHours: { monday: { open, close }, ... },
    contactEmail?: string,
    contactPhone?: string,
  }
}
```

#### Availability Ontology

**File:** `convex/availabilityOntology.ts`

**Exports:**
- `getResourceSchedule` - Query to get weekly schedule
- `getResourceExceptions` - Query to get exceptions
- `getResourceBlocks` - Query to get blocks
- `getAvailableSlots` - Query to calculate available slots on-demand
- `setWeeklySchedule` - Mutation to set recurring hours
- `createException` - Mutation to create single-day override
- `createBlock` - Mutation to create date-range block
- `deleteAvailability` - Mutation to delete availability record

**Internal functions:**
- `getResourceAvailabilityInternal` - For API endpoints
- `setWeeklyScheduleInternal` - For API endpoints
- `createExceptionInternal` - For API endpoints
- `createBlockInternal` - For API endpoints
- `deleteAvailabilityInternal` - For API endpoints

**Availability object types:**
```typescript
// type: "availability", subtype: "schedule"
{ resourceId, dayOfWeek, startTime, endTime, isAvailable, timezone }

// type: "availability", subtype: "exception"
{ resourceId, date, isAvailable, customHours?, reason? }

// type: "availability", subtype: "block"
{ resourceId, startDate, endDate, reason? }
```

**Slot Calculation Algorithm:**
1. Get resource schedule (weekly recurring)
2. Apply exceptions (single-day overrides)
3. Remove blocks (date ranges)
4. Check existing bookings
5. Apply buffer time (bufferBefore, bufferAfter)
6. Check capacity (for classes)
7. Return available slots

#### Booking Ontology

**File:** `convex/bookingOntology.ts`

**Exports:**
- `getOrganizationBookings` - Query to list bookings with filters
- `getBookingDetail` - Query to get single booking
- `getResourceBookings` - Query to get bookings for a resource
- `createBooking` - Mutation to create single booking
- `createRecurringBooking` - Mutation to create booking series
- `updateBooking` - Mutation to update booking
- `confirmBooking` - Mutation to confirm pending booking
- `checkInBooking` - Mutation to check in customer
- `completeBooking` - Mutation to mark as completed
- `cancelBooking` - Mutation to cancel with optional reason
- `markNoShow` - Mutation to mark as no-show

**Internal functions:**
- `createBookingInternal` - For API endpoints
- `getBookingInternal` - For API endpoints
- `listBookingsInternal` - For API endpoints
- `updateBookingStatusInternal` - For API endpoints

**Booking object structure:**
```typescript
{
  type: "booking",
  subtype: "appointment" | "reservation" | "rental" | "class_enrollment",
  status: "pending_confirmation" | "confirmed" | "checked_in" |
          "completed" | "cancelled" | "no_show",
  customProperties: {
    startDateTime, endDateTime, duration, timezone,
    primaryResourceId,
    customerId, customerName, customerEmail, customerPhone,
    participants, guestDetails,
    confirmationRequired, confirmedAt, confirmedBy,
    paymentType, totalAmountCents, depositAmountCents, paidAmountCents,
    isRecurring, recurrenceSeriesId, recurrenceIndex,
    checkedInAt, checkedInBy,
    cancelledAt, cancelledBy, cancellationReason, refundAmountCents,
    locationId, notes, internalNotes,
    isAdminBooking, bookedViaEventId
  }
}
```

---

### Phase 3: API Endpoints ✅

#### Locations API

**File:** `convex/api/v1/locations.ts`

| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| GET | /api/v1/locations | listLocations | List all locations |
| POST | /api/v1/locations | createLocation | Create new location |
| GET | /api/v1/locations/:id | getLocation | Get location details |
| PATCH | /api/v1/locations/:id | updateLocation | Update location |
| DELETE | /api/v1/locations/:id | deleteLocation | Archive location |

#### Availability API

**File:** `convex/api/v1/availability.ts`

| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| GET | /api/v1/resources/:id/availability | getResourceAvailability | Get schedule + exceptions |
| POST | /api/v1/resources/:id/availability | setWeeklySchedule | Set weekly schedule |
| DELETE | /api/v1/resources/:id/availability/:availId | deleteAvailability | Remove availability |
| GET | /api/v1/resources/:id/available-slots | getAvailableSlots | Get available time slots |

**Note:** Exception and block creation use POST with `action` parameter in body.

#### Resource Bookings API

**File:** `convex/api/v1/resourceBookings.ts`

| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| GET | /api/v1/resource-bookings | listResourceBookings | List bookings |
| POST | /api/v1/resource-bookings | createResourceBooking | Create booking |
| GET | /api/v1/resource-bookings/:id | getResourceBooking | Get booking details |
| POST | /api/v1/resource-bookings/:id/confirm | confirmResourceBooking | Confirm booking |
| POST | /api/v1/resource-bookings/:id/check-in | checkInResourceBooking | Check in |
| POST | /api/v1/resource-bookings/:id/complete | completeResourceBooking | Complete |
| POST | /api/v1/resource-bookings/:id/cancel | cancelResourceBooking | Cancel |

#### Routes Registered

**File:** `convex/http.ts`

All routes registered with triple authentication support:
- API key authentication (Bearer token)
- OAuth authentication
- CLI session authentication

---

## Remaining Work

### Phase 4: Payments & Confirmation ✅

**Status:** Complete (January 2026)

- [x] Add transaction subtypes to `transactionOntology.ts`:
  - `resource_booking` - Full booking payment
  - `booking_deposit` - Deposit payment
  - `booking_balance` - Remaining balance payment
  - `booking_refund` - Refund for cancelled bookings
- [x] Create `createBookingTransactionInternal` mutation
- [x] Create `processBookingPaymentInternal` workflow
- [x] Add `recordBookingPayment` public mutation for admin UI
- [x] Add `getBookingTransactions` query
- [x] Add `getBookingPaymentSummary` query
- [x] Add `processBookingRefundInternal` mutation
- [x] Add `cancelWithRefund` mutation with refund support
- [x] Add `processBalanceOnCheckIn` mutation
- [x] Add `checkInWithPayment` mutation for balance collection

### Phase 5: Advanced Features ⭕

**Recurring Bookings:**
- [ ] Full series conflict detection (block entire series if any conflict)
- [ ] Series master booking record
- [ ] Individual instance management
- [ ] Cancel single instance vs. entire series
- [ ] Reschedule single instance vs. entire series

**Multi-Resource Bookings:**
- [ ] Service-to-resource requirements (e.g., massage needs room + therapist)
- [ ] Simultaneous availability check across resources
- [ ] Combined pricing calculation
- [ ] ObjectLinks: `requires_resource` type

**Event Integration:**
- [ ] Link events to bookable resources via `offers_booking`
- [ ] Event-scoped availability overrides
- [ ] Workshop/conference room bookings from event page

**Automated Reminders:**
- [ ] Hook into multichannel automation system
- [ ] `enrollBookingInSequences` integration
- [ ] Trigger: `booking_confirmed`, `booking_checked_in`, `booking_completed`
- [ ] Cancel pending reminders on booking cancellation

### Phase 6: UI Components ✅

**Booking Window (`src/components/window-content/booking-window/`):**
- [x] `bookings-list.tsx` - List view with search/filter
- [x] `booking-detail.tsx` - Detail view with status actions
- [x] `booking-form-modal.tsx` - Create/edit booking form
- [ ] `booking-calendar.tsx` - Calendar view of bookings (optional enhancement)

**Location Management:**
- [x] `locations-list.tsx` - Location list view
- [x] `location-detail.tsx` - Location detail view
- [x] `location-form-modal.tsx` - Create/edit location form

**Availability Management:**
- [x] `resource-availability.tsx` - Weekly schedule editor
- [ ] `exception-modal.tsx` - Single-day override form (in resource-availability.tsx)
- [ ] `block-modal.tsx` - Date range block form (in resource-availability.tsx)

**Note:** UI uses hardcoded English strings. See Phase 8 for i18n work.

### Phase 7: AI Tool Integration ⭕

**File:** `convex/aiTools/manageBookings.ts` (to be created)

**Actions:**
- [ ] `list_bookings` - List bookings with filters
- [ ] `get_booking` - Get booking details
- [ ] `create_booking` - Create new booking (preview/execute mode)
- [ ] `confirm_booking` - Confirm pending booking
- [ ] `check_in_booking` - Check in customer
- [ ] `complete_booking` - Mark as completed
- [ ] `cancel_booking` - Cancel with optional reason
- [ ] `mark_no_show` - Mark customer as no-show
- [ ] `list_locations` - List locations
- [ ] `get_location` - Get location details
- [ ] `create_location` - Create new location
- [ ] `archive_location` - Archive location
- [ ] `get_available_slots` - Get available time slots
- [ ] `get_resource_calendar` - View resource's booking calendar

### Phase 8: Internationalization (i18n) ⭕

**Reference:** See [I18N_ONTOLOGY_ARCHITECTURE.md](/docs/I18N_ONTOLOGY_ARCHITECTURE.md) for the full i18n strategy.

**Current Status:** UI components use hardcoded English strings.

**Translation Keys Needed (namespace: `ui.app.booking`):**

```typescript
// Booking List
"ui.app.booking.list.title"                    // "Bookings"
"ui.app.booking.list.search.placeholder"       // "Search bookings..."
"ui.app.booking.list.empty"                    // "No bookings found"
"ui.app.booking.list.empty.hint"               // "Create a new booking to get started"
"ui.app.booking.list.loading"                  // "Loading bookings..."
"ui.app.booking.list.login.required"           // "Please log in"
"ui.app.booking.list.login.hint"               // "Login required to view bookings"

// Booking Status
"ui.app.booking.status.pending_confirmation"   // "Pending"
"ui.app.booking.status.confirmed"              // "Confirmed"
"ui.app.booking.status.checked_in"             // "Checked In"
"ui.app.booking.status.completed"              // "Completed"
"ui.app.booking.status.cancelled"              // "Cancelled"
"ui.app.booking.status.no_show"                // "No Show"

// Booking Subtypes
"ui.app.booking.subtype.appointment"           // "Appointment"
"ui.app.booking.subtype.reservation"           // "Reservation"
"ui.app.booking.subtype.rental"                // "Rental"
"ui.app.booking.subtype.class_enrollment"      // "Class"

// Filters
"ui.app.booking.filter.all.status"             // "All Status"
"ui.app.booking.filter.all.types"              // "All Types"

// Actions
"ui.app.booking.action.new"                    // "New"
"ui.app.booking.action.confirm"                // "Confirm"
"ui.app.booking.action.check_in"               // "Check In"
"ui.app.booking.action.complete"               // "Complete"
"ui.app.booking.action.cancel"                 // "Cancel"

// Location List
"ui.app.booking.location.list.title"           // "Locations"
"ui.app.booking.location.list.search"          // "Search locations..."
"ui.app.booking.location.list.empty"           // "No locations found"
"ui.app.booking.location.list.empty.hint"      // "Create a new location to get started"
"ui.app.booking.location.list.loading"         // "Loading locations..."

// Location Subtypes
"ui.app.booking.location.subtype.branch"       // "Branch"
"ui.app.booking.location.subtype.venue"        // "Venue"
"ui.app.booking.location.subtype.virtual"      // "Virtual"

// Location Status
"ui.app.booking.location.status.active"        // "Active"
"ui.app.booking.location.status.inactive"      // "Inactive"
"ui.app.booking.location.status.archived"      // "Archived"
```

**Implementation Tasks:**
- [ ] Add translation keys to seed data
- [ ] Create German (de) translations
- [ ] Create Polish (pl) translations
- [ ] Update `bookings-list.tsx` to use `useTranslation()` hook
- [ ] Update `booking-detail.tsx` to use `useTranslation()` hook
- [ ] Update `booking-form-modal.tsx` to use `useTranslation()` hook
- [ ] Update `locations-list.tsx` to use `useTranslation()` hook
- [ ] Update `location-detail.tsx` to use `useTranslation()` hook
- [ ] Update `location-form-modal.tsx` to use `useTranslation()` hook
- [ ] Update `resource-availability.tsx` to use `useTranslation()` hook

---

## Future Enhancements (Post-MVP)

From [BOOKING_SYSTEM_ARCHITECTURE.md](./BOOKING_SYSTEM_ARCHITECTURE.md#future-enhancements):

- [ ] Wait list for full classes/sold-out times
- [ ] Package deals (10-session pass)
- [ ] Online payment integration (Stripe, etc.)
- [ ] Calendar sync (Google/Outlook)
- [ ] Customer self-service portal
- [ ] Cancellation policies with refund rules
- [ ] SMS/WhatsApp booking confirmations
- [ ] QR code check-in

---

## Files Reference

### Backend Files

| File | Status | Purpose |
|------|--------|---------|
| `convex/productOntology.ts` | ✅ Modified | Added bookable subtypes |
| `convex/api/v1/products.ts` | ✅ Modified | Added subtype validation |
| `convex/api/v1/productsInternal.ts` | ✅ Modified | Added subtype validation |
| `convex/locationOntology.ts` | ✅ Created | Location CRUD |
| `convex/availabilityOntology.ts` | ✅ Created | Schedule/slot management |
| `convex/bookingOntology.ts` | ✅ Created | Core booking logic |
| `convex/api/v1/locations.ts` | ✅ Created | Location HTTP handlers |
| `convex/api/v1/availability.ts` | ✅ Created | Availability HTTP handlers |
| `convex/api/v1/resourceBookings.ts` | ✅ Created | Booking HTTP handlers |
| `convex/licensing/tierConfigs.ts` | ✅ Modified | Added booking limits/features |
| `convex/http.ts` | ✅ Modified | Registered new routes |
| `convex/transactionOntology.ts` | ✅ Modified | Added booking transaction subtypes & functions |
| `convex/aiTools/manageBookings.ts` | ⭕ Pending | AI tool for bookings |

### UI Components (Hardcoded English - i18n pending)

| File | Status | Purpose |
|------|--------|---------|
| `src/components/window-content/booking-window/bookings-list.tsx` | ✅ Created | Booking list with search/filter |
| `src/components/window-content/booking-window/booking-detail.tsx` | ✅ Created | Booking detail view |
| `src/components/window-content/booking-window/booking-form-modal.tsx` | ✅ Created | Create/edit booking modal |
| `src/components/window-content/booking-window/locations-list.tsx` | ✅ Created | Location list view |
| `src/components/window-content/booking-window/location-detail.tsx` | ✅ Created | Location detail view |
| `src/components/window-content/booking-window/location-form-modal.tsx` | ✅ Created | Create/edit location modal |
| `src/components/window-content/booking-window/resource-availability.tsx` | ✅ Created | Weekly schedule editor |

---

## Testing Checklist

### API Endpoints

- [ ] Create location via POST /api/v1/locations
- [ ] List locations via GET /api/v1/locations
- [ ] Get location via GET /api/v1/locations/:id
- [ ] Update location via PATCH /api/v1/locations/:id
- [ ] Archive location via DELETE /api/v1/locations/:id
- [ ] Set availability via POST /api/v1/resources/:id/availability
- [ ] Get availability via GET /api/v1/resources/:id/availability
- [ ] Get available slots via GET /api/v1/resources/:id/available-slots
- [ ] Create booking via POST /api/v1/resource-bookings
- [ ] Confirm booking via POST /api/v1/resource-bookings/:id/confirm
- [ ] Check-in booking via POST /api/v1/resource-bookings/:id/check-in
- [ ] Complete booking via POST /api/v1/resource-bookings/:id/complete
- [ ] Cancel booking via POST /api/v1/resource-bookings/:id/cancel

### Use Case Scenarios

- [ ] Hotel room reservation (date-range mode)
- [ ] Appointment booking (calendar mode with slots)
- [ ] Class enrollment (capacity check)
- [ ] Equipment rental (with buffer time)
- [ ] Multi-location booking
