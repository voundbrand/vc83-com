# Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                 AUTOMATION ENGINE                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐      ┌─────────────────┐                  │
│  │   SEQUENCES     │      │   MESSAGE       │                  │
│  │   (objects)     │──────▶   QUEUE         │                  │
│  │                 │      │   (table)       │                  │
│  │ • trigger event │      │                 │                  │
│  │ • steps[]       │      │ • scheduledFor  │                  │
│  │ • conditions    │      │ • channel       │                  │
│  └────────┬────────┘      │ • status        │                  │
│           │               └────────┬────────┘                  │
│           │                        │                            │
│  Booking  │                        │ Cron (5 min)              │
│  triggers │                        ▼                            │
│           │               ┌─────────────────┐                  │
│           ▼               │   DELIVERY      │                  │
│  ┌─────────────────┐      │   ROUTER        │                  │
│  │   BOOKINGS      │      │                 │                  │
│  │   (objects)     │      │ email → Resend  │                  │
│  │                 │      │ sms → Infobip   │                  │
│  │ confirmed ──────┼──────│ wa → Infobip    │                  │
│  │ checked_in      │      └─────────────────┘                  │
│  │ completed       │                                            │
│  └─────────────────┘                                            │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. Booking Created/Updated

When a booking is created or its status changes, the automation system is triggered:

```
bookingOntology.createBooking()
  └─► automationSequences.enrollBookingInSequences()
        ├─► Find sequences matching triggerEvent + bookingSubtype
        ├─► For each sequence step:
        │     ├─► Calculate scheduledFor (booking date + offset)
        │     ├─► Check conditions (minDaysOut, etc.)
        │     ├─► Resolve template and variables
        │     └─► messageQueue.scheduleMessage()
        └─► Return enrollment count
```

### 2. Message Processing (Cron)

Every 5 minutes, the cron job processes scheduled messages:

```
Every 5 minutes:
  automationEngine.processScheduledMessages()
    ├─► messageQueue.getPendingMessages(before: now, limit: 50)
    ├─► For each message:
    │     ├─► Mark as "sending"
    │     ├─► messageDelivery.deliverMessage()
    │     │     ├─► email → sendEmail (Resend)
    │     │     ├─► sms → sendSms (Infobip)
    │     │     └─► whatsapp → sendWhatsApp (Infobip)
    │     ├─► On success: mark "sent", log communication
    │     └─► On failure: retry or mark "failed"
    └─► Return processed count
```

### 3. Template Resolution

Templates are resolved with booking and contact data:

```
resolveTemplate(templateId, context)
  ├─► Load template from objects table
  ├─► Get contact details (name, email, phone, language)
  ├─► Get booking details (event name, date, location)
  ├─► Replace {{variables}} in body
  └─► Return rendered content
```

## Components

### Core Files (New)

| File | Purpose |
|------|---------|
| `convex/schemas/messageQueueSchemas.ts` | Queue table schema |
| `convex/messageQueue.ts` | Queue CRUD operations |
| `convex/messageDelivery.ts` | Channel-specific delivery |
| `convex/automationSequences.ts` | Sequence management |
| `convex/automationEngine.ts` | Cron processor |

### Modified Files

| File | Changes |
|------|---------|
| `convex/schema.ts` | Import messageQueue table |
| `convex/crons.ts` | Add 5-min processor |
| `convex/bookingOntology.ts` | Trigger enrollment on booking events |
| `convex/crmOntology.ts` | Add channel preference fields |

## Existing Infrastructure Reused

We leverage existing patterns and infrastructure:

- **Email Delivery**: `convex/emailDelivery.ts` (Resend integration)
- **Communication Tracking**: `convex/communicationTracking.ts`
- **Objects Table**: Universal storage for sequences/templates
- **ObjectLinks**: Booking ↔ Contact relationships
- **Cron Jobs**: Convex scheduled functions (`convex/crons.ts`)

## Error Handling

| Scenario | Handling |
|----------|----------|
| **Delivery Failure** | Retry up to 3 times with exponential backoff |
| **Booking Cancelled** | Cancel all pending messages for that booking |
| **Invalid Phone** | Skip SMS/WhatsApp, fallback to email |
| **Template Missing** | Log error, skip message |
| **Rate Limits** | Batch processing (50 at a time) |

## Message Status Lifecycle

```
scheduled → sending → sent
              ↓
           failed (after 3 retries)

scheduled → cancelled (booking cancelled)
```

## Trigger Events

The system responds to these booking lifecycle events:

| Event | When Fired | Typical Sequences |
|-------|------------|-------------------|
| `booking_created` | New booking inserted | Immediate confirmation |
| `booking_confirmed` | Booking status → confirmed | Vorher sequences |
| `booking_checked_in` | Guest checks in | Während sequences |
| `booking_completed` | Event/stay finished | Nachher sequences |
| `booking_cancelled` | Booking cancelled | Cancel pending messages |

## Channel Selection Logic

```typescript
function selectChannel(step, contact) {
  if (step.channel === "preferred") {
    // Use contact's preference
    return contact.channelPreference || "email";
  }

  if (step.channel === "sms" && !contact.phone) {
    // Fallback to email if no phone
    return "email";
  }

  if (step.channel === "whatsapp" && !contact.whatsappOptIn) {
    // Fallback if no WhatsApp consent
    return contact.phone ? "sms" : "email";
  }

  return step.channel;
}
```

## Scalability Considerations

- **Batch Processing**: 50 messages per cron run prevents timeouts
- **Indexed Queries**: `by_status_scheduled` index for efficient pending message lookup
- **Retry Backoff**: Prevents overwhelming failed endpoints
- **Multi-tenant**: All queries scoped by `organizationId`

## Monitoring Points

1. **Cron Health**: Is the 5-minute job running?
2. **Queue Depth**: How many messages are scheduled?
3. **Failure Rate**: What percentage are failing?
4. **Delivery Latency**: Time from scheduled to sent
