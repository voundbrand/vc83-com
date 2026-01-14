# Database Schema

## New Table: messageQueue

This is the core table for scheduling and tracking message delivery.

```typescript
// convex/schemas/messageQueueSchemas.ts

import { defineTable } from "convex/server";
import { v } from "convex/values";

export const messageQueue = defineTable({
  // Multi-tenancy
  organizationId: v.id("organizations"),

  // Channel
  channel: v.union(
    v.literal("email"),
    v.literal("sms"),
    v.literal("whatsapp")
  ),

  // Recipient
  recipientId: v.optional(v.id("objects")),     // crm_contact reference
  recipientEmail: v.optional(v.string()),
  recipientPhone: v.optional(v.string()),

  // Content
  templateId: v.optional(v.id("objects")),      // message_template reference
  subject: v.optional(v.string()),              // Email only
  body: v.string(),                             // Rendered plain text content
  bodyHtml: v.optional(v.string()),             // Email HTML version

  // WhatsApp specific
  whatsappTemplateName: v.optional(v.string()),
  whatsappTemplateParams: v.optional(v.array(v.string())),

  // Scheduling
  scheduledFor: v.number(),                     // Unix timestamp (ms)

  // Context/Source
  sequenceId: v.optional(v.id("objects")),      // automation_sequence reference
  sequenceStepIndex: v.optional(v.number()),    // Which step in sequence
  bookingId: v.optional(v.id("objects")),       // booking reference

  // Status
  status: v.union(
    v.literal("scheduled"),   // Waiting to be sent
    v.literal("sending"),     // Currently being processed
    v.literal("sent"),        // Successfully delivered
    v.literal("failed"),      // Permanently failed (after retries)
    v.literal("cancelled")    // Cancelled (e.g., booking cancelled)
  ),

  // Delivery tracking
  sentAt: v.optional(v.number()),               // When actually sent
  externalId: v.optional(v.string()),           // Provider message ID
  lastError: v.optional(v.string()),            // Last error message
  retryCount: v.number(),                       // Default: 0, max: 3

  // Metadata
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_status_scheduled", ["status", "scheduledFor"])
  .index("by_org_status", ["organizationId", "status"])
  .index("by_booking", ["bookingId"])
  .index("by_recipient", ["recipientId"])
  .index("by_sequence", ["sequenceId"]);
```

### Index Usage

| Query | Index |
|-------|-------|
| Get pending messages due now | `by_status_scheduled` |
| Get org's message history | `by_org_status` |
| Cancel messages for booking | `by_booking` |
| Get contact's message history | `by_recipient` |
| Get sequence execution status | `by_sequence` |

---

## Objects Table Extensions

We use the existing `objects` table (ontology pattern) for sequences and templates.

### Automation Sequence (type="automation_sequence")

```typescript
// Stored in objects table
{
  _id: Id<"objects">,
  type: "automation_sequence",
  subtype: "vorher" | "waehrend" | "nachher" | "custom",
  organizationId: Id<"organizations">,
  name: "Segelschule Vorfreude-Sequenz",
  status: "active" | "draft" | "archived",

  customProperties: {
    description: "Emails vor dem Segelkurs",

    // Trigger configuration
    triggerEvent: "booking_confirmed",  // When to start the sequence
    bookingSubtypes: ["class_enrollment"],  // Which booking types trigger this

    // Sequence steps
    steps: [
      {
        offsetHours: -168,              // -7 days (negative = before booking)
        channel: "email",               // "email" | "sms" | "whatsapp" | "preferred"
        templateId: "j97abc123...",     // Reference to message_template
        conditions: {
          minDaysOut: 7,                // Only schedule if booking is 7+ days away
        }
      },
      {
        offsetHours: -72,               // -3 days
        channel: "email",
        templateId: "j97def456...",
        conditions: {}
      },
      {
        offsetHours: -24,               // -1 day
        channel: "preferred",           // Use contact's channel preference
        templateId: "j97ghi789...",
        conditions: {}
      }
    ],

    enabled: true,                      // Can be disabled without deleting
  }
}
```

### Message Template (type="message_template")

```typescript
// Stored in objects table
{
  _id: Id<"objects">,
  type: "message_template",
  subtype: "email" | "sms" | "whatsapp",
  organizationId: Id<"organizations">,
  name: "7-Tage Vorfreude Email",
  status: "active",

  customProperties: {
    // Content
    subject: "Das erwartet dich am Haff",           // Email only
    body: "Hallo {{firstName}},\n\nIn einer Woche bist du hier am Haff...",
    bodyHtml: "<html><body><h1>Hallo {{firstName}}</h1>...</body></html>",

    // WhatsApp specific (must match Meta-approved template)
    whatsappTemplateName: "haff_reminder_7days",

    // Metadata
    language: "de",
    variables: ["firstName", "eventName", "eventDate", "locationName"],

    // Preview data for testing
    sampleData: {
      firstName: "Max",
      eventName: "SBF Binnen Kurs",
      eventDate: "15. März 2025",
      locationName: "Stettiner Haff"
    }
  }
}
```

### Template Variables

| Variable | Source | Example |
|----------|--------|---------|
| `{{firstName}}` | Contact | "Max" |
| `{{lastName}}` | Contact | "Mustermann" |
| `{{email}}` | Contact | "max@example.com" |
| `{{eventName}}` | Booking | "SBF Binnen Kurs" |
| `{{eventDate}}` | Booking | "15. März 2025" |
| `{{eventTime}}` | Booking | "09:00 Uhr" |
| `{{locationName}}` | Booking | "Stettiner Haff" |
| `{{bookingRef}}` | Booking | "BK-2025-0042" |
| `{{daysUntil}}` | Calculated | "7" |

---

## Contact Extension (crm_contact customProperties)

Add these fields to existing CRM contacts:

```typescript
// Add to existing crm_contact customProperties
{
  // Existing fields...
  firstName: "Max",
  lastName: "Mustermann",
  email: "max@example.com",
  phone: "+4915123456789",              // E.164 format

  // NEW: Channel preferences
  channelPreference: "email",           // "email" | "sms" | "whatsapp"
  smsOptIn: true,                       // Has consented to SMS
  whatsappOptIn: false,                 // Has consented to WhatsApp
  communicationLanguage: "de",          // "de" | "en"
}
```

### Channel Preference Logic

1. If `channelPreference` is set, use that channel when step.channel = "preferred"
2. If sending SMS but `smsOptIn` is false or no phone, fall back to email
3. If sending WhatsApp but `whatsappOptIn` is false, fall back to SMS then email

---

## Schema Integration

Add to `convex/schema.ts`:

```typescript
import { messageQueue } from "./schemas/messageQueueSchemas";

export default defineSchema({
  // ... existing tables
  messageQueue,
});
```

---

## Example Records

### Scheduled Message Example

```json
{
  "_id": "m1234567890",
  "organizationId": "org123",
  "channel": "email",
  "recipientId": "contact456",
  "recipientEmail": "max@example.com",
  "templateId": "template789",
  "subject": "Das erwartet dich am Haff",
  "body": "Hallo Max,\n\nIn einer Woche bist du hier...",
  "bodyHtml": "<html>...</html>",
  "scheduledFor": 1710489600000,
  "sequenceId": "seq123",
  "sequenceStepIndex": 0,
  "bookingId": "booking456",
  "status": "scheduled",
  "retryCount": 0,
  "createdAt": 1709884800000,
  "updatedAt": 1709884800000
}
```

### Sent Message Example

```json
{
  "_id": "m1234567890",
  "status": "sent",
  "sentAt": 1710489650000,
  "externalId": "resend_abc123xyz",
  "retryCount": 0,
  "updatedAt": 1710489650000
}
```

### Failed Message Example

```json
{
  "_id": "m1234567891",
  "status": "failed",
  "lastError": "Invalid phone number format",
  "retryCount": 3,
  "updatedAt": 1710490000000
}
```
