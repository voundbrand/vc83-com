# Booking System Architecture

## Overview

The booking system is a general-purpose scheduling platform that supports various use cases:
- **Appointments**: 1:1 consultations, meetings, services
- **Reservations**: Room bookings, table reservations, space rentals
- **Rentals**: Equipment, vehicles, vacation properties
- **Class Enrollments**: Group sessions, workshops, courses

## Core Concepts

### 1. Products as Bookable Resources

Products (`objects` table, type: `product`) serve as the bookable resources. The `subtype` field determines the type of resource:

**Resource Types:**
- `room` - Hotel rooms, meeting rooms, studios
- `staff` - Therapists, consultants, instructors
- `equipment` - Cameras, projectors, tools
- `space` - Desks, parking spots, lockers
- `vehicle` - Cars, boats, bikes
- `accommodation` - Vacation rentals, apartments

**Service Types:**
- `appointment` - 1:1 meetings, consultations
- `class` - Group sessions with max participants
- `treatment` - Spa, medical (may require multiple resources)

### 2. Bookable Configuration (Product customProperties)

Products that are bookable have these configuration options:

```typescript
interface BookableConfig {
  // Booking Mode
  bookingMode: "calendar" | "date-range" | "both"
  // - calendar: Pick specific time slots (appointments)
  // - date-range: Pick check-in/check-out dates (hotels)
  // - both: Support both modes (flexible)

  // Duration Settings
  minDuration: number           // Minimum booking duration
  maxDuration: number           // Maximum booking duration
  durationUnit: "minutes" | "hours" | "days" | "nights"
  slotIncrement: number         // Time slot increments (15, 30, 60 min)

  // Buffer Time (prevents back-to-back bookings)
  bufferBefore: number          // Minutes before booking
  bufferAfter: number           // Minutes after booking

  // Capacity
  capacity: number              // Concurrent bookings (1 for 1:1, 10 for classes)

  // Confirmation
  confirmationRequired: boolean // Admin approval needed

  // Pricing
  pricePerUnit: number          // Price in cents
  priceUnit: "hour" | "day" | "night" | "session" | "flat"

  // Deposit
  depositRequired: boolean
  depositAmountCents: number    // Fixed amount in cents
  depositPercent: number        // Or percentage of total

  // Additional (type-specific)
  maxOccupancy?: number         // For rooms/accommodations
  amenities?: string[]          // ["wifi", "ac", "projector"]
  specialties?: string[]        // For staff: ["massage", "facial"]
}
```

### 3. Availability System

Availability is managed through `objects` table with type: `availability` and various subtypes:

**Schedule (Weekly Recurring):**
```typescript
// subtype: "schedule"
{
  resourceId: Id<"objects">     // Link to product
  dayOfWeek: number             // 0=Sunday, 6=Saturday
  startTime: string             // "09:00"
  endTime: string               // "17:00"
  isAvailable: boolean
  timezone: string
}
```

**Exception (Single Day Override):**
```typescript
// subtype: "exception"
{
  resourceId: Id<"objects">
  date: number                  // Unix timestamp
  isAvailable: boolean
  startTime?: string            // Optional hours if available
  endTime?: string
  reason?: string               // "Holiday", "Maintenance"
}
```

**Block (Date Range Unavailable):**
```typescript
// subtype: "block"
{
  resourceId: Id<"objects">
  startDate: number
  endDate: number
  reason?: string               // "Vacation", "Reserved"
}
```

### 4. Bookings

Bookings are stored in `objects` table with type: `booking`:

```typescript
// subtype: "appointment" | "reservation" | "rental" | "class_enrollment"
{
  // Time
  startDateTime: number
  endDateTime: number
  duration: number              // Minutes
  timezone: string

  // Customer
  customerId?: Id<"objects">    // Link to contact
  customerName: string
  customerEmail: string
  customerPhone?: string
  participants: number
  guestDetails: Array<{ name: string; email?: string }>

  // Location (optional)
  locationId?: Id<"objects">

  // Confirmation
  confirmationRequired: boolean
  confirmedAt?: number
  confirmedBy?: Id<"users">

  // Payment
  paymentType: "none" | "deposit" | "full"
  totalAmountCents: number
  depositAmountCents: number
  paidAmountCents: number
  transactionId?: Id<"objects">

  // Recurring
  isRecurring: boolean
  recurrenceSeriesId?: Id<"objects">
  recurrenceIndex?: number

  // Check-in/out
  checkedInAt?: number
  checkedInBy?: Id<"users">

  // Cancellation
  cancelledAt?: number
  cancelledBy?: Id<"users">
  cancellationReason?: string
  refundAmountCents: number

  // Notes
  notes: string
  internalNotes: string

  // Source
  isAdminBooking: boolean
  bookedViaEventId?: Id<"objects">
}
```

**Status Workflow:**
```
pending_confirmation → confirmed → checked_in → completed
                    ↘ cancelled
         confirmed → no_show
```

### 5. Locations

Locations support multi-location businesses:

```typescript
// type: "location", subtype: "branch" | "venue" | "virtual"
{
  name: string
  address: {
    street?: string
    city?: string
    state?: string
    postalCode?: string
    country?: string
  }
  timezone: string
  defaultOperatingHours: {
    monday: { open: string; close: string }
    // ... other days
  }
  contactEmail?: string
  contactPhone?: string
}
```

### 6. Object Links

Relationships between entities use `objectLinks` table:

| linkType | fromObjectId | toObjectId |
|----------|--------------|------------|
| `books_resource` | booking | product |
| `has_availability` | product | availability |
| `located_at` | product | location |
| `for_customer` | booking | contact |

## API Endpoints

### Locations API
- `GET /api/v1/locations` - List locations
- `POST /api/v1/locations` - Create location
- `GET /api/v1/locations/:id` - Get location
- `PATCH /api/v1/locations/:id` - Update location
- `DELETE /api/v1/locations/:id` - Archive location

### Availability API
- `GET /api/v1/resources/:id/availability` - Get resource availability
- `POST /api/v1/resources/:id/availability` - Set weekly schedule
- `DELETE /api/v1/resources/:id/availability` - Delete availability record

### Bookings API
- `GET /api/v1/resource-bookings` - List bookings
- `POST /api/v1/resource-bookings` - Create booking
- `GET /api/v1/resource-bookings/:id` - Get booking details
- `POST /api/v1/resource-bookings/:id/confirm` - Confirm booking
- `POST /api/v1/resource-bookings/:id/check-in` - Check in
- `POST /api/v1/resource-bookings/:id/complete` - Complete
- `POST /api/v1/resource-bookings/:id/cancel` - Cancel

### Available Slots API
- `GET /api/v1/resources/:id/available-slots` - Get available time slots
  - Query params: `startDate`, `endDate`, `duration`, `timezone`

## AI Tool Integration

The `manage_bookings` AI tool provides natural language access:

**Actions:**
- `list_bookings` - List bookings with filters
- `get_booking` - Get booking details
- `create_booking` - Create new booking (preview/execute mode)
- `confirm_booking` - Confirm pending booking
- `check_in_booking` - Check in customer
- `complete_booking` - Mark as completed
- `cancel_booking` - Cancel with optional reason
- `mark_no_show` - Mark customer as no-show
- `list_locations` - List locations
- `get_location` - Get location details
- `create_location` - Create new location
- `archive_location` - Archive location
- `get_available_slots` - Get available time slots
- `get_resource_calendar` - View resource's booking calendar

## UI Components

### Booking Window (`src/components/window-content/booking-window/`)
- **bookings-list.tsx** - List view with search/filter
- **booking-detail.tsx** - Detail view with status actions
- **booking-form-modal.tsx** - Create/edit booking form
- **locations-list.tsx** - Location list view
- **location-detail.tsx** - Location detail view
- **location-form-modal.tsx** - Create/edit location form
- **resource-availability.tsx** - Availability schedule management

### Product Form Extension
- **bookable-config-section.tsx** - Booking configuration for products

## Use Case Examples

### 1. Hotel Room Booking
```
Product: "Deluxe Ocean View Room"
  subtype: "accommodation"
  bookingMode: "date-range"
  durationUnit: "nights"
  pricePerUnit: 15000 (cents = $150/night)
  capacity: 1 (one room)
  maxOccupancy: 4
  depositRequired: true
  depositPercent: 20
  confirmationRequired: true
```

### 2. Kayak Rental
```
Product: "Single Kayak"
  subtype: "equipment"
  bookingMode: "both"
  durationUnit: "hours"
  minDuration: 1
  maxDuration: 8
  pricePerUnit: 2500 (cents = $25/hour)
  capacity: 3 (3 kayaks available)
  bufferAfter: 30 (cleanup time)
```

### 3. Massage Appointment
```
Product: "60-Minute Swedish Massage"
  subtype: "appointment"
  bookingMode: "calendar"
  durationUnit: "minutes"
  minDuration: 60
  maxDuration: 60
  slotIncrement: 15
  pricePerUnit: 8000 (cents = $80/session)
  priceUnit: "session"
  bufferBefore: 5
  bufferAfter: 15
```

### 4. Yoga Class
```
Product: "Morning Yoga Flow"
  subtype: "class"
  bookingMode: "calendar"
  durationUnit: "minutes"
  minDuration: 60
  maxDuration: 60
  capacity: 15 (max participants)
  pricePerUnit: 2000 (cents = $20/session)
  confirmationRequired: false
```

## Slot Calculation Algorithm

Available slots are calculated on-demand (not pre-computed):

1. **Get Resource Schedule** - Weekly recurring availability
2. **Apply Exceptions** - Single-day overrides
3. **Remove Blocks** - Date ranges marked unavailable
4. **Check Existing Bookings** - Remove conflicting times
5. **Apply Buffer Time** - Add buffer before/after slots
6. **Check Capacity** - For classes, allow until capacity reached
7. **Return Available Slots** - List of { start, end } times

## Future Enhancements

- [ ] Recurring booking series (weekly appointments)
- [ ] Wait list for full classes/sold-out times
- [ ] Package deals (10-session pass)
- [ ] Multi-resource bookings (treatment needs room + therapist)
- [ ] Online payment integration
- [ ] Automated reminders (email/SMS)
- [ ] Calendar sync (Google/Outlook)
- [ ] Customer self-service portal
- [ ] Cancellation policies with refund rules
