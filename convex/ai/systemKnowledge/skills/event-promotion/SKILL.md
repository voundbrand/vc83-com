# Skill: Event / Workshop Registration

> **Canonical ontology reference:** `_SHARED.md` in the parent `skills/` directory.
> Every table name, field name, mutation signature, node type, and handle name
> used below is taken verbatim from that document. Do not alias or abbreviate.

---

## 1. Purpose

Deploy a complete event or workshop registration system for an agency's client
(conference organizer, training company, community host, meetup group).

**Outcome after execution:**

- Ticket products created (free or multi-tier paid).
- Registration form published and linked to tickets.
- Checkout flow wired to Stripe (paid events).
- CRM pipeline tracks every attendee from registration through post-event conversion.
- Layers workflows automate confirmation, ticket generation, invoicing, check-in, and follow-up.
- Pre-event reminder sequence and post-event nurture sequence run on autopilot.
- All objects linked so the system is fully connected end-to-end.

**Three-layer context:** L4YERCAK3 (platform) -> Agency (deploys the skill) -> Agency's Client (the event organizer) -> End Customer (the attendee).

---

## 2. Ontologies Involved

### 2.1 Product (ticket)

```
objects {
  _id: Id<"objects">
  organizationId: Id<"organizations">
  type: "product"
  subtype: "ticket"
  name: string                         // e.g. "Early Bird Ticket"
  customProperties: {
    productCode: string                // e.g. "FLS-2025-EB"
    description: string
    price: number                      // in cents, e.g. 14900
    currency: string                   // "USD"
    inventory: number                  // total tickets available for this tier
    sold: number                       // starts at 0
    taxBehavior: string                // "exclusive" | "inclusive"
    saleStartDate: number              // timestamp — when sales open
    saleEndDate: number                // timestamp — event date (sales close)
    earlyBirdUntil: number             // timestamp — early-bird cutoff
    maxQuantity: number                // max per order
    requiresShipping: false
    eventId: string                    // links to the event concept
    ticketTier: string                 // "early_bird" | "general" | "vip"
  }
  createdBy: Id<"users">
  createdAt: number
  updatedAt?: number
}
```

### 2.2 Form (registration)

```
objects {
  _id: Id<"objects">
  organizationId: Id<"organizations">
  type: "form"
  subtype: "registration"
  name: string                         // e.g. "Future Leaders Summit Registration"
  customProperties: {
    fields: [
      { type: "text",           label: "First Name",       required: true  },
      { type: "text",           label: "Last Name",        required: true  },
      { type: "email",          label: "Email",            required: true  },
      { type: "phone",          label: "Phone",            required: false },
      { type: "text",           label: "Company / Org",    required: false },
      { type: "text",           label: "Job Title",        required: false },
      { type: "select",         label: "Ticket Tier",      required: true,
        options: ["Early Bird ($149)", "General ($249)", "VIP ($499)"] },
      { type: "textarea",       label: "Dietary Requirements", required: false },
      { type: "checkbox",       label: "I agree to the terms and conditions", required: true }
    ],
    formSettings: {
      redirectUrl: "/confirmation",
      notifications: { adminEmail: true, respondentEmail: true },
      submissionBehavior: "redirect"
    },
    displayMode: "embedded",
    conditionalLogic: [],
    submissionWorkflow: {}
  }
  createdBy: Id<"users">
  createdAt: number
  updatedAt?: number
}
```

### 2.3 CRM Contact (attendee)

```
objects {
  _id: Id<"objects">
  organizationId: Id<"organizations">
  type: "crm_contact"
  subtype: "lead"                      // promoted to "customer" after purchase/check-in
  name: string                         // "Jane Doe"
  customProperties: {
    firstName: string
    lastName: string
    email: string
    phone: string
    companyName: string
    contactType: "attendee"
    tags: ["future_leaders_summit_2025", "attendee", "early_bird"]
    pipelineStageId: string            // current stage ID
    pipelineDealValue: number          // ticket price in cents
    customFields: {
      ticketTier: string
      dietaryRequirements: string
      checkedIn: boolean
      attendedSessions: string[]
    }
  }
  createdBy: Id<"users">
  createdAt: number
  updatedAt?: number
}
```

### 2.4 Workflow (layer_workflow)

```
objects {
  _id: Id<"objects">
  organizationId: Id<"organizations">
  type: "layer_workflow"
  subtype: "workflow"
  name: string                         // e.g. "Event Registration Workflow"
  customProperties: {
    // See LayerWorkflowData in section 4
  }
  createdBy: Id<"users">
  createdAt: number
  updatedAt?: number
}
```

### 2.5 Sequence (automation_sequence)

```
objects {
  _id: Id<"objects">
  organizationId: Id<"organizations">
  type: "automation_sequence"
  subtype: "vorher" | "nachher"
  name: string                         // e.g. "Pre-Event Reminder Sequence"
  customProperties: {
    triggerEvent: string               // "booking_confirmed" | "booking_completed" | "contact_tagged"
    channel: "email" | "sms" | "whatsapp" | "preferred"
    steps: [...]                       // see section 4.5
  }
  createdBy: Id<"users">
  createdAt: number
  updatedAt?: number
}
```

### 2.6 Object Links

All links use `objectLinks { sourceObjectId, targetObjectId, linkType, properties? }`.

| linkType            | source             | target             | purpose                              |
|---------------------|--------------------|--------------------|--------------------------------------|
| `event_product`     | event object       | product (ticket)   | Event has these ticket products      |
| `product_form`      | product (ticket)   | form (registration)| Ticket requires this registration    |
| `checkout_product`  | checkout object    | product (ticket)   | Checkout sells these tickets         |
| `form_ticket`       | form (registration)| product (ticket)   | Form linked to ticket for generation |
| `workflow_form`     | workflow           | form (registration)| Workflow triggered by this form      |
| `workflow_sequence` | workflow           | sequence           | Workflow enrolls into this sequence  |

---

## 3. Builder Components

### 3.1 Event Landing Page (`/builder/event-landing-page`)

- **Hero section:** Event name, date, time, venue, tagline, hero image/banner.
- **About section:** Event description, key takeaways, who should attend.
- **Speaker bios section:** Grid of speaker cards (photo, name, title, company, short bio).
- **Schedule section:** Time-blocked agenda (session title, speaker, time, room/track).
- **Ticket tiers section:** Card-per-tier layout showing tier name, price, what's included, availability count, "Select" CTA per tier.
- **Registration form embed:** Embedded `form` object (subtype: `registration`). When a tier is selected above, the "Ticket Tier" select field auto-populates.
- **FAQ section:** Accordion with common questions (refund policy, parking, accessibility).
- **Footer:** Venue map embed, contact email, social links.

### 3.2 Registration Confirmation Page (`/builder/confirmation-page`)

- Thank-you headline.
- Order summary (tier, price, attendee name).
- Ticket preview with QR code (generated by `lc_tickets`).
- "Add to Calendar" button (`.ics` download link with event datetime/location).
- "Share this event" social buttons.
- Next steps / what to expect before the event.

### 3.3 Checkout Flow (paid events)

- Tier selection (pre-populated from landing page).
- Quantity selector (capped at `maxQuantity`).
- Stripe checkout session via `lc_checkout` node (`create-transaction` action).
- On success: redirect to confirmation page + trigger `trigger_payment_received`.

---

## 4. Layers Automations

### 4.1 Workflow 1 — Free Event Registration

**Name:** `Free Event Registration`
**Trigger:** `trigger_form_submitted`

**Nodes:**

| id       | type                      | label                        | position    | config                                                                                                                                  |
|----------|---------------------------|------------------------------|-------------|-----------------------------------------------------------------------------------------------------------------------------------------|
| `n-trig` | `trigger_form_submitted`  | Form Submitted               | { x:0, y:0 } | `{ formId: "<registration_form_id>" }`                                                                                                |
| `n-crm1` | `lc_crm`                 | Create Contact               | { x:300, y:0 } | `{ action: "create-contact", firstName: "{{formData.firstName}}", lastName: "{{formData.lastName}}", email: "{{formData.email}}", phone: "{{formData.phone}}", contactType: "attendee", tags: ["{{event_name}}", "attendee"] }` |
| `n-crm2` | `lc_crm`                 | Move to Registered           | { x:600, y:0 } | `{ action: "move-pipeline-stage", pipelineStageId: "registered" }`                                                                    |
| `n-email`| `lc_email`               | Send Confirmation            | { x:900, y:0 } | `{ action: "send-confirmation-email", subject: "You're registered for {{event_name}}!", templateId: "event_confirmation", data: { eventName: "{{event_name}}", eventDate: "{{event_date}}", eventVenue: "{{event_venue}}" } }` |
| `n-ac`   | `activecampaign`         | Sync to ActiveCampaign       | { x:1200, y:0 } | `{ action: "add_contact", email: "{{formData.email}}", firstName: "{{formData.firstName}}", lastName: "{{formData.lastName}}" }`      |
| `n-ac2`  | `activecampaign`         | Tag in ActiveCampaign        | { x:1500, y:0 } | `{ action: "add_tag", tag: "{{event_name}}" }`                                                                                        |

**Edges:**

| id     | source   | target   | sourceHandle | targetHandle |
|--------|----------|----------|--------------|--------------|
| `e-1`  | `n-trig` | `n-crm1` | `output`     | `input`      |
| `e-2`  | `n-crm1` | `n-crm2` | `output`     | `input`      |
| `e-3`  | `n-crm2` | `n-email`| `output`     | `input`      |
| `e-4`  | `n-email`| `n-ac`   | `output`     | `input`      |
| `e-5`  | `n-ac`   | `n-ac2`  | `output`     | `input`      |

---

### 4.2 Workflow 2 — Paid Event Ticket Purchase

**Name:** `Ticket Purchase Workflow`
**Trigger:** `trigger_payment_received`

**Nodes:**

| id       | type                        | label                        | position       | config                                                                                                                                  |
|----------|-----------------------------|------------------------------|----------------|-----------------------------------------------------------------------------------------------------------------------------------------|
| `n-trig` | `trigger_payment_received`  | Payment Received             | { x:0, y:0 }  | `{ paymentProvider: "stripe" }`                                                                                                        |
| `n-crm1` | `lc_crm`                   | Create Contact               | { x:300, y:0 } | `{ action: "create-contact", firstName: "{{paymentData.firstName}}", lastName: "{{paymentData.lastName}}", email: "{{paymentData.email}}", phone: "{{paymentData.phone}}", contactType: "attendee", tags: ["{{event_name}}", "attendee", "{{ticketTier}}"] }` |
| `n-crm2` | `lc_crm`                   | Move to Registered           | { x:600, y:0 } | `{ action: "move-pipeline-stage", pipelineStageId: "registered" }`                                                                    |
| `n-tick` | `lc_tickets`               | Generate Ticket + QR         | { x:900, y:0 } | `{}`                                                                                                                                    |
| `n-email`| `lc_email`                 | Confirmation + Ticket        | { x:1200, y:0 }| `{ action: "send-confirmation-email", subject: "Your ticket for {{event_name}}", templateId: "event_ticket_confirmation", data: { eventName: "{{event_name}}", eventDate: "{{event_date}}", eventVenue: "{{event_venue}}", ticketTier: "{{ticketTier}}", ticketQr: "{{ticketQrUrl}}" } }` |
| `n-inv`  | `lc_invoicing`             | Generate Invoice             | { x:1500, y:0 }| `{ action: "generate-invoice" }`                                                                                                       |
| `n-ac`   | `activecampaign`           | Tag in ActiveCampaign        | { x:1800, y:0 }| `{ action: "add_tag", tag: "{{event_name}}_paid" }`                                                                                    |

**Edges:**

| id     | source   | target   | sourceHandle | targetHandle |
|--------|----------|----------|--------------|--------------|
| `e-1`  | `n-trig` | `n-crm1` | `output`     | `input`      |
| `e-2`  | `n-crm1` | `n-crm2` | `output`     | `input`      |
| `e-3`  | `n-crm2` | `n-tick` | `output`     | `input`      |
| `e-4`  | `n-tick` | `n-email`| `output`     | `input`      |
| `e-5`  | `n-email`| `n-inv`  | `output`     | `input`      |
| `e-6`  | `n-inv`  | `n-ac`   | `output`     | `input`      |

---

### 4.3 Workflow 3 — Check-In

**Name:** `Event Check-In Workflow`
**Trigger:** `trigger_webhook`

**Nodes:**

| id       | type                | label                        | position       | config                                                                             |
|----------|---------------------|------------------------------|----------------|-------------------------------------------------------------------------------------|
| `n-trig` | `trigger_webhook`   | Check-In Webhook             | { x:0, y:0 }  | `{ path: "/event-checkin", secret: "{{checkin_webhook_secret}}" }`                 |
| `n-crm1` | `lc_crm`           | Move to Checked In           | { x:300, y:0 } | `{ action: "move-pipeline-stage", pipelineStageId: "checked_in" }`                |
| `n-crm2` | `lc_crm`           | Update Contact               | { x:600, y:0 } | `{ action: "update-contact", customFields: { checkedIn: true } }`                 |
| `n-email`| `lc_email`          | Send Welcome Materials       | { x:900, y:0 } | `{ action: "send-confirmation-email", subject: "Welcome to {{event_name}}!", templateId: "event_welcome_materials", data: { wifiPassword: "{{wifi_password}}", scheduleUrl: "{{schedule_url}}", venueMap: "{{venue_map_url}}" } }` |

**Edges:**

| id     | source   | target   | sourceHandle | targetHandle |
|--------|----------|----------|--------------|--------------|
| `e-1`  | `n-trig` | `n-crm1` | `output`     | `input`      |
| `e-2`  | `n-crm1` | `n-crm2` | `output`     | `input`      |
| `e-3`  | `n-crm2` | `n-email`| `output`     | `input`      |

---

### 4.4 Workflow 4 — Post-Event Follow-Up

**Name:** `Post-Event Follow-Up Workflow`
**Trigger:** `trigger_schedule`

**Nodes:**

| id       | type                | label                         | position        | config                                                                              |
|----------|---------------------|-------------------------------|-----------------|--------------------------------------------------------------------------------------|
| `n-trig` | `trigger_schedule`  | Day After Event               | { x:0, y:0 }   | `{ cronExpression: "0 9 <day_after> <month> *", timezone: "{{event_timezone}}" }`   |
| `n-crm1` | `lc_crm`           | Move to Follow-Up             | { x:300, y:0 }  | `{ action: "move-pipeline-stage", pipelineStageId: "follow_up" }`                  |
| `n-cond` | `if_then`           | Attended?                     | { x:600, y:0 }  | `{ expression: "{{contact.customFields.checkedIn}} === true" }`                    |
| `n-att`  | `lc_email`          | Thank You + Recording         | { x:900, y:-100}| `{ action: "send-confirmation-email", subject: "Thank you for attending {{event_name}}!", templateId: "post_event_attended", data: { recordingUrl: "{{recording_url}}", slidesUrl: "{{slides_url}}" } }` |
| `n-noshow`| `lc_email`         | Replay Available              | { x:900, y:100} | `{ action: "send-confirmation-email", subject: "You missed {{event_name}} - here's the replay", templateId: "post_event_noshow", data: { replayUrl: "{{recording_url}}" } }` |
| `n-ac1`  | `activecampaign`    | Tag Attended                  | { x:1200, y:-100}| `{ action: "add_tag", tag: "{{event_name}}_attended" }`                            |
| `n-ac2`  | `activecampaign`    | Tag No-Show                   | { x:1200, y:100}| `{ action: "add_tag", tag: "{{event_name}}_noshow" }`                              |

**Edges:**

| id     | source    | target     | sourceHandle | targetHandle |
|--------|-----------|------------|--------------|--------------|
| `e-1`  | `n-trig`  | `n-crm1`   | `output`     | `input`      |
| `e-2`  | `n-crm1`  | `n-cond`   | `output`     | `input`      |
| `e-3`  | `n-cond`  | `n-att`    | `true`       | `input`      |
| `e-4`  | `n-cond`  | `n-noshow` | `false`      | `input`      |
| `e-5`  | `n-att`   | `n-ac1`    | `output`     | `input`      |
| `e-6`  | `n-noshow`| `n-ac2`    | `output`     | `input`      |

---

### 4.5 Sequences

#### Pre-Event Sequence (subtype: `vorher`)

**Name:** `Pre-Event Reminder Sequence`
**Trigger event:** `booking_confirmed`
**Reference point:** `booking_start` (= event start time)

| step | channel  | offset | unit    | referencePoint   | subject / body summary                                           |
|------|----------|--------|---------|------------------|------------------------------------------------------------------|
| 1    | email    | 0      | minutes | trigger_event    | "You're confirmed! Here's what to expect" + event details        |
| 2    | email    | -7     | days    | booking_start    | "One week to go! Prepare for {{event_name}}" + schedule preview  |
| 3    | email    | -1     | days    | booking_start    | "Tomorrow is the day! Final details" + venue directions + parking|
| 4    | sms      | -1     | days    | booking_start    | "Reminder: {{event_name}} is tomorrow at {{event_time}}"        |
| 5    | sms      | -1     | hours   | booking_start    | "Starting in 1 hour! See you at {{event_venue}}"                |
| 6    | email    | 0      | minutes | booking_start    | "We're live! Join now" + live-stream link (if hybrid)            |

#### Post-Event Sequence — Attended (subtype: `nachher`)

**Name:** `Post-Event Attended Sequence`
**Trigger event:** `booking_completed`
**Condition:** `contact.customFields.checkedIn === true`
**Reference point:** `booking_end` (= event end time)

| step | channel  | offset | unit    | referencePoint | subject / body summary                                               |
|------|----------|--------|---------|----------------|----------------------------------------------------------------------|
| 1    | email    | +1     | hours   | booking_end    | "Thank you! Here's the replay + resources"                          |
| 2    | email    | +1     | days    | booking_end    | "Key takeaways from {{event_name}} + special offer"                 |
| 3    | email    | +2     | days    | booking_end    | "Exclusive offer for attendees + FAQ"                               |
| 4    | email    | +4     | days    | booking_end    | "Offer deadline approaching" + scarcity/urgency                     |
| 5    | email    | +5     | days    | booking_end    | "Last chance: offer expires tonight"                                |

#### Post-Event Sequence — No-Show (subtype: `nachher`)

**Name:** `Post-Event No-Show Sequence`
**Trigger event:** `booking_completed`
**Condition:** `contact.customFields.checkedIn !== true`
**Reference point:** `booking_end` (= event end time)

| step | channel  | offset | unit    | referencePoint | subject / body summary                                               |
|------|----------|--------|---------|----------------|----------------------------------------------------------------------|
| 1    | email    | +2     | hours   | booking_end    | "We missed you! The replay is available now"                        |
| 2    | email    | +1     | days    | booking_end    | "Highlights from {{event_name}} + special offer"                    |
| 3    | email    | +3     | days    | booking_end    | "Don't miss out: offer + social proof from attendees"               |
| 4    | email    | +5     | days    | booking_end    | "Final chance: replay access expires soon"                          |

---

## 5. CRM Pipeline

**Pipeline name:** `Event: {{event_name}}`

| order | stageId       | label        | auto-transition trigger                                                    |
|-------|---------------|--------------|---------------------------------------------------------------------------|
| 1     | `registered`  | Registered   | On form submission (free) or payment received (paid)                       |
| 2     | `confirmed`   | Confirmed    | On confirmation email delivered successfully                               |
| 3     | `reminded`    | Reminded     | On pre-event sequence step 2 (7-day reminder) sent                         |
| 4     | `checked_in`  | Checked In   | On check-in webhook received (`trigger_webhook` path `/event-checkin`)     |
| 5     | `attended`    | Attended     | On event end (contact has `checkedIn: true`)                               |
| 6     | `no_show`     | No-Show      | On event end (contact has `checkedIn: false` or missing)                   |
| 7     | `follow_up`   | Follow-Up    | On post-event workflow trigger (day after event)                           |
| 8     | `converted`   | Converted    | On post-event upsell purchase or manual move by sales                      |

**Stage transitions and automation triggers:**

- `registered -> confirmed`: Triggered automatically when `lc_email` (confirmation) reports `delivered` status.
- `confirmed -> reminded`: Triggered when pre-event sequence sends the 7-day reminder (step 2).
- `reminded -> checked_in`: Triggered by check-in workflow (Workflow 3) via webhook.
- `checked_in -> attended`: Triggered by post-event workflow (Workflow 4) for contacts with `checkedIn: true`.
- `registered -> no_show` (skip path): Triggered by post-event workflow for contacts never checked in.
- `attended -> follow_up`: Triggered by post-event workflow day-after schedule.
- `no_show -> follow_up`: Triggered by post-event workflow day-after schedule.
- `follow_up -> converted`: Manual move or triggered by `trigger_payment_received` for upsell product.

---

## 6. File System Scaffold

```
/builder
  /event-landing-page          # kind: builder_ref — Hero, speakers, schedule, tiers, form
  /confirmation-page           # kind: builder_ref — Thank you, ticket QR, calendar add

/layers
  /registration-workflow       # kind: layer_ref — Workflow 1 (free) or Workflow 2 (paid)
  /ticket-purchase-workflow    # kind: layer_ref — Workflow 2 (paid events only)
  /checkin-workflow             # kind: layer_ref — Workflow 3
  /post-event-workflow          # kind: layer_ref — Workflow 4

/notes
  /event-brief                 # kind: virtual — Event name, date, time, venue, capacity, description
  /speaker-bios                # kind: virtual — Speaker name, title, company, bio, photo ref
  /schedule                    # kind: virtual — Time blocks, session titles, speakers, rooms

/assets
  /event-banner                # kind: media_ref — Hero banner image
  /speaker-photos              # kind: folder — Individual speaker headshots
  /venue-map                   # kind: media_ref — Venue floor plan / directions image
```

**Initialization mutation:** `initializeProjectFolders({ organizationId, projectId })` creates the four root folders. Then `createVirtualFile` and `captureBuilderApp` / `captureLayerWorkflow` populate each entry.

---

## 7. Data Flow Diagram

```
                                    EVENT REGISTRATION DATA FLOW
 ============================================================================================================

  End Customer                     Platform                                    Backend Systems
  -----------                      --------                                    ---------------

  [ Visit event page ]
        |
        v
  [ View ticket tiers ] -------> Landing Page (builder_ref)
        |
        v
  [ Select tier ]
        |
        v
  [ Fill registration form ] ---> form (subtype: registration)
        |                             |
        |                             v
        |                     +------------------+
        |                     | FREE?    PAID?   |
        |                     +------------------+
        |                       |              |
        v                       v              v
  (free: submit form)    trigger_form    [ Stripe Checkout ] ---> lc_checkout (create-transaction)
        |                  _submitted          |
        |                       |              v
        |                       |        trigger_payment
        |                       |          _received
        |                       |              |
        |                       v              v
        |                  +-------------------------------+
        |                  |   lc_crm (create-contact)     |
        |                  |   lc_crm (move-pipeline-stage  |
        |                  |          -> "registered")      |
        |                  +-------------------------------+
        |                              |
        |                              v
        |                  +-------------------------------+
        |                  |   lc_tickets (generate QR)    |  <-- paid only
        |                  +-------------------------------+
        |                              |
        |                              v
        |                  +-------------------------------+
        |                  |   lc_email (confirmation +    |
        |                  |            ticket attachment)  |
        |                  +-------------------------------+
        |                              |
        |                              v
        |                  +-------------------------------+
        |                  |   lc_invoicing                |  <-- paid only
        |                  |   (generate-invoice)          |
        |                  +-------------------------------+
        |                              |
        |                              v
        |                  +-------------------------------+
        |                  |   activecampaign              |
        |                  |   (add_contact, add_tag)      |
        |                  +-------------------------------+
        |                              |
        |                              v
  [ Receives confirmation   Pre-Event Sequence (vorher)
    email + ticket ]               |
        |                   -7d: anticipation email
        |                   -1d: email + SMS reminder
        |                   -1h: SMS reminder
        |                    0:  "We're live" email
        |                              |
        v                              v
  [ Arrives at event ] --------> Check-In Webhook
        |                              |
        |                    lc_crm (move -> "checked_in")
        |                    lc_email (welcome materials)
        |                              |
        v                              v
  [ Attends sessions ]         trigger_schedule (day after)
        |                              |
        |                    if_then: checkedIn?
        |                     /              \
        |                  true             false
        |                   |                 |
        |            "attended" path    "no_show" path
        |                   |                 |
        v                   v                 v
  [ Receives follow-up ]  Post-Event        Post-Event
        |                Attended Seq.     No-Show Seq.
        |                   |                 |
        v                   v                 v
  [ Takes upsell offer ] -> lc_crm (move -> "converted")
```

---

## 8. Customization Points

### Must Customize (skill will not work without these)

| Item                  | Where                              | Example value                              |
|-----------------------|------------------------------------|--------------------------------------------|
| Event name            | All templates, sequences, pipeline | "Future Leaders Summit 2025"               |
| Event date & time     | Product `saleEndDate`, sequences   | 1756684800000 (timestamp)                  |
| Event venue / location| Email templates, landing page      | "Marriott Marquis, NYC"                    |
| Ticket tiers & pricing| Product objects (`price`, `ticketTier`) | Early Bird $149, General $249, VIP $499 |
| Speaker information   | Landing page, `/notes/speaker-bios`| Name, title, company, bio, photo           |
| Event schedule        | Landing page, `/notes/schedule`    | Time blocks with session details           |
| Capacity per tier     | Product `inventory`, `maxQuantity` | 50 early bird, 120 general, 30 VIP        |

### Should Customize (defaults work but results improve with tuning)

| Item                     | Where                                 | Default                                    |
|--------------------------|---------------------------------------|--------------------------------------------|
| Landing page copy        | Builder event-landing-page            | Generic event template text                |
| Email templates          | `lc_email` node config `templateId`   | Platform default confirmation template     |
| Sequence timing          | Sequence steps `offset` / `unit`      | -7d, -1d, -1h, 0, +1h, +1d, +2d, +4d, +5d|
| Post-event offer         | Nachher sequence content              | No offer (just thank-you)                  |
| ActiveCampaign tag names | `activecampaign` node config          | Uses `{{event_name}}`                      |
| Check-in webhook secret  | Workflow 3 trigger config             | Auto-generated                             |

### Can Use Defaults (ready out of the box)

| Item                    | Default value                                                      |
|-------------------------|--------------------------------------------------------------------|
| Pipeline stages         | registered, confirmed, reminded, checked_in, attended, no_show, follow_up, converted |
| Workflow structure       | 4 workflows as defined in section 4                               |
| Form field types         | text, email, phone, select, textarea, checkbox                    |
| File system layout       | /builder, /layers, /notes, /assets                                |
| Link types               | event_product, product_form, checkout_product, form_ticket, workflow_form, workflow_sequence |
| Sequence channel mix     | email primary, SMS for day-before and hour-before reminders       |

---

## 9. Common Pitfalls

### 9.1 Missing `event_product` link

**Problem:** Ticket product created but not linked to the event object via `objectLinks` with `linkType: "event_product"`.
**Symptom:** Event page cannot look up available tickets; tier cards show empty.
**Fix:** After creating each ticket product, create an `objectLinks` entry: `{ sourceObjectId: eventId, targetObjectId: productId, linkType: "event_product" }`.

### 9.2 Missing `form_ticket` link

**Problem:** Registration form exists but is not linked to the ticket product.
**Symptom:** Form submissions do not trigger ticket generation; `lc_tickets` node receives no product context.
**Fix:** Call `linkFormToTicket({ sessionId, formId, ticketProductId })` or create `objectLinks` with `linkType: "form_ticket"`.

### 9.3 Checkout not wired to products

**Problem:** Checkout object exists but `checkout_product` links are missing.
**Symptom:** Stripe checkout session has no line items; payment of $0 or error.
**Fix:** For each ticket product, create `objectLinks { sourceObjectId: checkoutId, targetObjectId: productId, linkType: "checkout_product" }`.

### 9.4 Pre-event sequence timing uses wrong reference point

**Problem:** Reminder steps use `referencePoint: "trigger_event"` instead of `referencePoint: "booking_start"`.
**Symptom:** Reminders fire relative to when the person registered, not relative to the event date. A person registering 30 days out gets the "-7 day" reminder immediately after registration.
**Fix:** Set `referencePoint: "booking_start"` for all countdown reminders (steps 2-6). Only the immediate confirmation (step 1) should use `referencePoint: "trigger_event"`.

### 9.5 No-show and attended sequences not separated

**Problem:** A single post-event sequence is used for all contacts regardless of check-in status.
**Symptom:** No-shows receive "thank you for attending" emails; checked-in attendees receive "you missed it" emails.
**Fix:** Create two separate `nachher` sequences with conditions: one with `contact.customFields.checkedIn === true`, one with `contact.customFields.checkedIn !== true`. Use `if_then` node in Workflow 4 to branch.

### 9.6 `maxQuantity` not set on ticket products

**Problem:** Product `maxQuantity` left as `undefined` or `0`.
**Symptom:** No per-order limit; a single buyer can purchase all remaining tickets. Or if `0`, no tickets can be purchased.
**Fix:** Set `maxQuantity` to a sensible per-order cap (e.g., 5 for General, 2 for VIP). Set `inventory` to the total tier capacity.

### 9.7 Workflow not linked to form

**Problem:** Workflow has `trigger_form_submitted` but no `workflow_form` objectLink.
**Symptom:** Workflow does not fire when form is submitted because the system cannot resolve which workflow to trigger.
**Fix:** Create `objectLinks { sourceObjectId: workflowId, targetObjectId: formId, linkType: "workflow_form" }`.

### 9.8 Sequence not linked to workflow

**Problem:** Sequences created but no `workflow_sequence` link exists.
**Symptom:** Workflow completes but never enrolls the contact into the pre-event or post-event sequence.
**Fix:** Create `objectLinks { sourceObjectId: workflowId, targetObjectId: sequenceId, linkType: "workflow_sequence" }`.

---

## 10. Example Deployment

> A marketing agency sets up event registration for a leadership conference.
> The event is "Future Leaders Summit 2025", 200-person capacity, 3 ticket tiers:
> Early Bird ($149), General ($249), VIP ($499).

### Step 1: Create Ticket Products

**Product 1 — Early Bird:**
```
createProduct({
  sessionId: "<session>",
  organizationId: "<org>",
  name: "Early Bird Ticket",
  subtype: "ticket",
  price: 14900,
  currency: "USD",
  description: "Early Bird access to Future Leaders Summit 2025. Includes all sessions and lunch.",
  productCode: "FLS-2025-EB",
  inventory: 50,
  sold: 0,
  taxBehavior: "exclusive",
  saleStartDate: 1740000000000,
  saleEndDate: 1748736000000,
  earlyBirdUntil: 1745000000000,
  maxQuantity: 5,
  requiresShipping: false,
  eventId: "future-leaders-summit-2025",
  ticketTier: "early_bird"
})
```

**Product 2 — General:**
```
createProduct({
  sessionId: "<session>",
  organizationId: "<org>",
  name: "General Admission Ticket",
  subtype: "ticket",
  price: 24900,
  currency: "USD",
  description: "General admission to Future Leaders Summit 2025. Includes all sessions and lunch.",
  productCode: "FLS-2025-GA",
  inventory: 120,
  sold: 0,
  taxBehavior: "exclusive",
  saleStartDate: 1740000000000,
  saleEndDate: 1756684800000,
  earlyBirdUntil: null,
  maxQuantity: 5,
  requiresShipping: false,
  eventId: "future-leaders-summit-2025",
  ticketTier: "general"
})
```

**Product 3 — VIP:**
```
createProduct({
  sessionId: "<session>",
  organizationId: "<org>",
  name: "VIP Ticket",
  subtype: "ticket",
  price: 49900,
  currency: "USD",
  description: "VIP access to Future Leaders Summit 2025. Front-row seating, VIP lounge, meet-and-greet with speakers, all sessions and lunch.",
  productCode: "FLS-2025-VIP",
  inventory: 30,
  sold: 0,
  taxBehavior: "exclusive",
  saleStartDate: 1740000000000,
  saleEndDate: 1756684800000,
  earlyBirdUntil: null,
  maxQuantity: 2,
  requiresShipping: false,
  eventId: "future-leaders-summit-2025",
  ticketTier: "vip"
})
```

### Step 2: Create Registration Form

```
createForm({
  sessionId: "<session>",
  organizationId: "<org>",
  name: "Future Leaders Summit 2025 Registration",
  description: "Register for the Future Leaders Summit 2025 conference.",
  fields: [
    { type: "section_header", label: "Attendee Information", required: false },
    { type: "text",      label: "First Name",              required: true  },
    { type: "text",      label: "Last Name",               required: true  },
    { type: "email",     label: "Email",                   required: true  },
    { type: "phone",     label: "Phone",                   required: false },
    { type: "text",      label: "Company / Organization",  required: false },
    { type: "text",      label: "Job Title",               required: false },
    { type: "section_header", label: "Ticket Selection",   required: false },
    { type: "select",    label: "Ticket Tier",             required: true,
      options: ["Early Bird ($149)", "General Admission ($249)", "VIP ($499)"] },
    { type: "number",    label: "Number of Tickets",       required: true, placeholder: "1" },
    { type: "section_header", label: "Additional Info",    required: false },
    { type: "textarea",  label: "Dietary Requirements",    required: false, placeholder: "Any allergies or dietary needs?" },
    { type: "checkbox",  label: "I agree to the terms and conditions", required: true }
  ],
  formSettings: {
    redirectUrl: "/confirmation",
    notifications: { adminEmail: true, respondentEmail: true },
    submissionBehavior: "redirect"
  }
})
```

Then publish: `publishForm({ sessionId: "<session>", formId: "<form_id>" })`

### Step 3: Link Form to Tickets

```
linkFormToTicket({ sessionId: "<session>", formId: "<form_id>", ticketProductId: "<eb_product_id>" })
linkFormToTicket({ sessionId: "<session>", formId: "<form_id>", ticketProductId: "<ga_product_id>" })
linkFormToTicket({ sessionId: "<session>", formId: "<form_id>", ticketProductId: "<vip_product_id>" })
```

### Step 4: Create Checkout & Link Products

Create checkout object, then link all three products:

```
// objectLinks for checkout
{ sourceObjectId: "<checkout_id>", targetObjectId: "<eb_product_id>",  linkType: "checkout_product" }
{ sourceObjectId: "<checkout_id>", targetObjectId: "<ga_product_id>",  linkType: "checkout_product" }
{ sourceObjectId: "<checkout_id>", targetObjectId: "<vip_product_id>", linkType: "checkout_product" }
```

### Step 5: Create CRM Pipeline

Pipeline: **"Event: Future Leaders Summit 2025"**

Stages (in order):
1. `registered` — "Registered"
2. `confirmed` — "Confirmed"
3. `reminded` — "Reminded"
4. `checked_in` — "Checked In"
5. `attended` — "Attended"
6. `no_show` — "No-Show"
7. `follow_up` — "Follow-Up"
8. `converted` — "Converted"

### Step 6: Create Workflows

**Workflow 1 — Ticket Purchase (see section 4.2):**
```
createWorkflow({ sessionId: "<session>", name: "FLS 2025 — Ticket Purchase", description: "Handles paid registration for Future Leaders Summit 2025" })

saveWorkflow({
  sessionId: "<session>",
  workflowId: "<wf1_id>",
  name: "FLS 2025 — Ticket Purchase",
  nodes: [
    { id: "n-trig", type: "trigger_payment_received", position: { x: 0, y: 0 }, config: { paymentProvider: "stripe" }, status: "ready", label: "Payment Received" },
    { id: "n-crm1", type: "lc_crm", position: { x: 300, y: 0 }, config: { action: "create-contact", firstName: "{{paymentData.firstName}}", lastName: "{{paymentData.lastName}}", email: "{{paymentData.email}}", phone: "{{paymentData.phone}}", contactType: "attendee", tags: ["future_leaders_summit_2025", "attendee", "{{ticketTier}}"] }, status: "ready", label: "Create Contact" },
    { id: "n-crm2", type: "lc_crm", position: { x: 600, y: 0 }, config: { action: "move-pipeline-stage", pipelineStageId: "registered" }, status: "ready", label: "Move to Registered" },
    { id: "n-tick", type: "lc_tickets", position: { x: 900, y: 0 }, config: {}, status: "ready", label: "Generate Ticket + QR" },
    { id: "n-email", type: "lc_email", position: { x: 1200, y: 0 }, config: { action: "send-confirmation-email", subject: "Your ticket for Future Leaders Summit 2025", templateId: "event_ticket_confirmation", data: { eventName: "Future Leaders Summit 2025", eventDate: "September 1, 2025", eventVenue: "Marriott Marquis, NYC", ticketTier: "{{ticketTier}}", ticketQr: "{{ticketQrUrl}}" } }, status: "ready", label: "Confirmation + Ticket" },
    { id: "n-inv", type: "lc_invoicing", position: { x: 1500, y: 0 }, config: { action: "generate-invoice" }, status: "ready", label: "Generate Invoice" },
    { id: "n-ac", type: "activecampaign", position: { x: 1800, y: 0 }, config: { action: "add_tag", tag: "future_leaders_summit_2025_paid" }, status: "ready", label: "Tag in ActiveCampaign" }
  ],
  edges: [
    { id: "e-1", source: "n-trig", target: "n-crm1", sourceHandle: "output", targetHandle: "input" },
    { id: "e-2", source: "n-crm1", target: "n-crm2", sourceHandle: "output", targetHandle: "input" },
    { id: "e-3", source: "n-crm2", target: "n-tick", sourceHandle: "output", targetHandle: "input" },
    { id: "e-4", source: "n-tick", target: "n-email", sourceHandle: "output", targetHandle: "input" },
    { id: "e-5", source: "n-email", target: "n-inv", sourceHandle: "output", targetHandle: "input" },
    { id: "e-6", source: "n-inv", target: "n-ac", sourceHandle: "output", targetHandle: "input" }
  ],
  triggers: [{ type: "trigger_payment_received", config: { paymentProvider: "stripe" } }]
})

updateWorkflowStatus({ sessionId: "<session>", workflowId: "<wf1_id>", status: "active" })
```

**Workflow 3 — Check-In (see section 4.3):**
```
createWorkflow({ sessionId: "<session>", name: "FLS 2025 — Check-In", description: "Handles day-of check-in for Future Leaders Summit 2025" })

saveWorkflow({
  sessionId: "<session>",
  workflowId: "<wf3_id>",
  name: "FLS 2025 — Check-In",
  nodes: [
    { id: "n-trig", type: "trigger_webhook", position: { x: 0, y: 0 }, config: { path: "/event-checkin", secret: "fls2025_checkin_secret" }, status: "ready", label: "Check-In Webhook" },
    { id: "n-crm1", type: "lc_crm", position: { x: 300, y: 0 }, config: { action: "move-pipeline-stage", pipelineStageId: "checked_in" }, status: "ready", label: "Move to Checked In" },
    { id: "n-crm2", type: "lc_crm", position: { x: 600, y: 0 }, config: { action: "update-contact", customFields: { checkedIn: true } }, status: "ready", label: "Update Contact" },
    { id: "n-email", type: "lc_email", position: { x: 900, y: 0 }, config: { action: "send-confirmation-email", subject: "Welcome to Future Leaders Summit 2025!", templateId: "event_welcome_materials", data: { wifiPassword: "FLS2025Guest", scheduleUrl: "https://fls2025.example.com/schedule", venueMap: "https://fls2025.example.com/venue-map" } }, status: "ready", label: "Send Welcome Materials" }
  ],
  edges: [
    { id: "e-1", source: "n-trig", target: "n-crm1", sourceHandle: "output", targetHandle: "input" },
    { id: "e-2", source: "n-crm1", target: "n-crm2", sourceHandle: "output", targetHandle: "input" },
    { id: "e-3", source: "n-crm2", target: "n-email", sourceHandle: "output", targetHandle: "input" }
  ],
  triggers: [{ type: "trigger_webhook", config: { path: "/event-checkin", secret: "fls2025_checkin_secret" } }]
})

updateWorkflowStatus({ sessionId: "<session>", workflowId: "<wf3_id>", status: "active" })
```

**Workflow 4 — Post-Event (see section 4.4):**
```
createWorkflow({ sessionId: "<session>", name: "FLS 2025 — Post-Event Follow-Up", description: "Day-after follow-up branching on attendance for Future Leaders Summit 2025" })

saveWorkflow({
  sessionId: "<session>",
  workflowId: "<wf4_id>",
  name: "FLS 2025 — Post-Event Follow-Up",
  nodes: [
    { id: "n-trig", type: "trigger_schedule", position: { x: 0, y: 0 }, config: { cronExpression: "0 9 2 9 *", timezone: "America/New_York" }, status: "ready", label: "Day After Event" },
    { id: "n-crm1", type: "lc_crm", position: { x: 300, y: 0 }, config: { action: "move-pipeline-stage", pipelineStageId: "follow_up" }, status: "ready", label: "Move to Follow-Up" },
    { id: "n-cond", type: "if_then", position: { x: 600, y: 0 }, config: { expression: "{{contact.customFields.checkedIn}} === true" }, status: "ready", label: "Attended?" },
    { id: "n-att", type: "lc_email", position: { x: 900, y: -100 }, config: { action: "send-confirmation-email", subject: "Thank you for attending Future Leaders Summit 2025!", templateId: "post_event_attended", data: { recordingUrl: "https://fls2025.example.com/replay", slidesUrl: "https://fls2025.example.com/slides" } }, status: "ready", label: "Thank You + Recording" },
    { id: "n-noshow", type: "lc_email", position: { x: 900, y: 100 }, config: { action: "send-confirmation-email", subject: "You missed Future Leaders Summit 2025 - here's the replay", templateId: "post_event_noshow", data: { replayUrl: "https://fls2025.example.com/replay" } }, status: "ready", label: "Replay Available" },
    { id: "n-ac1", type: "activecampaign", position: { x: 1200, y: -100 }, config: { action: "add_tag", tag: "future_leaders_summit_2025_attended" }, status: "ready", label: "Tag Attended" },
    { id: "n-ac2", type: "activecampaign", position: { x: 1200, y: 100 }, config: { action: "add_tag", tag: "future_leaders_summit_2025_noshow" }, status: "ready", label: "Tag No-Show" }
  ],
  edges: [
    { id: "e-1", source: "n-trig", target: "n-crm1", sourceHandle: "output", targetHandle: "input" },
    { id: "e-2", source: "n-crm1", target: "n-cond", sourceHandle: "output", targetHandle: "input" },
    { id: "e-3", source: "n-cond", target: "n-att", sourceHandle: "true", targetHandle: "input" },
    { id: "e-4", source: "n-cond", target: "n-noshow", sourceHandle: "false", targetHandle: "input" },
    { id: "e-5", source: "n-att", target: "n-ac1", sourceHandle: "output", targetHandle: "input" },
    { id: "e-6", source: "n-noshow", target: "n-ac2", sourceHandle: "output", targetHandle: "input" }
  ],
  triggers: [{ type: "trigger_schedule", config: { cronExpression: "0 9 2 9 *", timezone: "America/New_York" } }]
})

updateWorkflowStatus({ sessionId: "<session>", workflowId: "<wf4_id>", status: "active" })
```

### Step 7: Create Sequences

**Pre-Event Reminder Sequence:**
```
// type: "automation_sequence", subtype: "vorher"
// name: "FLS 2025 — Pre-Event Reminders"
// triggerEvent: "booking_confirmed"
steps: [
  { channel: "email", timing: { offset: 0,  unit: "minutes", referencePoint: "trigger_event" },  content: { subject: "You're confirmed for Future Leaders Summit 2025!", body: "..." } },
  { channel: "email", timing: { offset: -7, unit: "days",    referencePoint: "booking_start" },  content: { subject: "One week to go! Prepare for FLS 2025", body: "..." } },
  { channel: "email", timing: { offset: -1, unit: "days",    referencePoint: "booking_start" },  content: { subject: "Tomorrow is the day! Final details for FLS 2025", body: "..." } },
  { channel: "sms",   timing: { offset: -1, unit: "days",    referencePoint: "booking_start" },  content: { body: "Reminder: Future Leaders Summit is tomorrow at 9:00 AM, Marriott Marquis NYC" } },
  { channel: "sms",   timing: { offset: -1, unit: "hours",   referencePoint: "booking_start" },  content: { body: "Starting in 1 hour! See you at Marriott Marquis. Check in at the main lobby." } },
  { channel: "email", timing: { offset: 0,  unit: "minutes", referencePoint: "booking_start" },  content: { subject: "We're live! Future Leaders Summit 2025 is starting now", body: "..." } }
]
```

**Post-Event Attended Sequence:**
```
// type: "automation_sequence", subtype: "nachher"
// name: "FLS 2025 — Post-Event (Attended)"
// triggerEvent: "booking_completed"
// condition: contact.customFields.checkedIn === true
steps: [
  { channel: "email", timing: { offset: 1,  unit: "hours", referencePoint: "booking_end" }, content: { subject: "Thank you! Here's the replay + resources", body: "..." } },
  { channel: "email", timing: { offset: 1,  unit: "days",  referencePoint: "booking_end" }, content: { subject: "Key takeaways from FLS 2025 + exclusive offer", body: "..." } },
  { channel: "email", timing: { offset: 2,  unit: "days",  referencePoint: "booking_end" }, content: { subject: "Exclusive attendee offer + FAQ", body: "..." } },
  { channel: "email", timing: { offset: 4,  unit: "days",  referencePoint: "booking_end" }, content: { subject: "Offer deadline approaching — don't miss out", body: "..." } },
  { channel: "email", timing: { offset: 5,  unit: "days",  referencePoint: "booking_end" }, content: { subject: "Last chance: your FLS 2025 offer expires tonight", body: "..." } }
]
```

**Post-Event No-Show Sequence:**
```
// type: "automation_sequence", subtype: "nachher"
// name: "FLS 2025 — Post-Event (No-Show)"
// triggerEvent: "booking_completed"
// condition: contact.customFields.checkedIn !== true
steps: [
  { channel: "email", timing: { offset: 2,  unit: "hours", referencePoint: "booking_end" }, content: { subject: "We missed you! The FLS 2025 replay is available now", body: "..." } },
  { channel: "email", timing: { offset: 1,  unit: "days",  referencePoint: "booking_end" }, content: { subject: "Highlights from FLS 2025 + special offer", body: "..." } },
  { channel: "email", timing: { offset: 3,  unit: "days",  referencePoint: "booking_end" }, content: { subject: "Don't miss out — offer + social proof from attendees", body: "..." } },
  { channel: "email", timing: { offset: 5,  unit: "days",  referencePoint: "booking_end" }, content: { subject: "Final chance: replay access expires soon", body: "..." } }
]
```

### Step 8: Link All Objects

```
// Event -> Products
{ sourceObjectId: "<event_id>", targetObjectId: "<eb_product_id>",  linkType: "event_product" }
{ sourceObjectId: "<event_id>", targetObjectId: "<ga_product_id>",  linkType: "event_product" }
{ sourceObjectId: "<event_id>", targetObjectId: "<vip_product_id>", linkType: "event_product" }

// Products -> Form
{ sourceObjectId: "<eb_product_id>",  targetObjectId: "<form_id>", linkType: "product_form" }
{ sourceObjectId: "<ga_product_id>",  targetObjectId: "<form_id>", linkType: "product_form" }
{ sourceObjectId: "<vip_product_id>", targetObjectId: "<form_id>", linkType: "product_form" }

// Checkout -> Products
{ sourceObjectId: "<checkout_id>", targetObjectId: "<eb_product_id>",  linkType: "checkout_product" }
{ sourceObjectId: "<checkout_id>", targetObjectId: "<ga_product_id>",  linkType: "checkout_product" }
{ sourceObjectId: "<checkout_id>", targetObjectId: "<vip_product_id>", linkType: "checkout_product" }

// Form -> Tickets (via linkFormToTicket mutation, creates these automatically)
{ sourceObjectId: "<form_id>", targetObjectId: "<eb_product_id>",  linkType: "form_ticket" }
{ sourceObjectId: "<form_id>", targetObjectId: "<ga_product_id>",  linkType: "form_ticket" }
{ sourceObjectId: "<form_id>", targetObjectId: "<vip_product_id>", linkType: "form_ticket" }

// Workflow -> Form
{ sourceObjectId: "<wf1_id>", targetObjectId: "<form_id>", linkType: "workflow_form" }

// Workflow -> Sequences
{ sourceObjectId: "<wf1_id>", targetObjectId: "<pre_event_seq_id>",      linkType: "workflow_sequence" }
{ sourceObjectId: "<wf4_id>", targetObjectId: "<post_attended_seq_id>",   linkType: "workflow_sequence" }
{ sourceObjectId: "<wf4_id>", targetObjectId: "<post_noshow_seq_id>",     linkType: "workflow_sequence" }
```

### Summary of Created Objects

| # | Object                              | type                  | subtype        |
|---|-------------------------------------|-----------------------|----------------|
| 1 | Early Bird Ticket                   | product               | ticket         |
| 2 | General Admission Ticket            | product               | ticket         |
| 3 | VIP Ticket                          | product               | ticket         |
| 4 | FLS 2025 Registration Form          | form                  | registration   |
| 5 | FLS 2025 — Ticket Purchase Workflow | layer_workflow        | workflow       |
| 6 | FLS 2025 — Check-In Workflow        | layer_workflow        | workflow       |
| 7 | FLS 2025 — Post-Event Workflow      | layer_workflow        | workflow       |
| 8 | FLS 2025 — Pre-Event Reminders      | automation_sequence   | vorher         |
| 9 | FLS 2025 — Post-Event (Attended)    | automation_sequence   | nachher        |
| 10| FLS 2025 — Post-Event (No-Show)     | automation_sequence   | nachher        |

**Total objectLinks created:** 18 (3 event_product + 3 product_form + 3 checkout_product + 3 form_ticket + 1 workflow_form + 3 workflow_sequence + 2 implicit from mutations)

**Total workflow nodes:** 18 (7 in Workflow 1 + 4 in Workflow 3 + 7 in Workflow 4)
**Total workflow edges:** 15 (6 in Workflow 1 + 3 in Workflow 3 + 6 in Workflow 4)
**Total sequence steps:** 15 (6 pre-event + 5 post-attended + 4 post-noshow)
**Credit cost estimate:** ~18 behavior executions per registration (workflow nodes) + sequence steps per contact
