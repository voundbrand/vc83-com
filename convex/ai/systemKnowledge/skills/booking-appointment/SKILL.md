# Skill: Booking & Appointment System

> **Depends on:** `_SHARED.md` for all object schemas, mutation signatures, node types, and edge conventions.

---

## 1. Purpose

Deploy a complete online booking and appointment system for a service-based business. The agency (`Business L2`) configures this skill on behalf of their client business (`Business L3`) -- a dentist, consultant, salon, therapist, coach, physiotherapist, or any provider that sells time-based services.

**Outcome:** End customers (`Business L4`) browse available services, select a time slot, fill an intake form, and book online. The system then:

- Creates/updates a CRM contact automatically
- Sends a confirmation email and optional SMS/WhatsApp
- Runs a pre-appointment reminder sequence (vorher)
- Detects no-shows and triggers re-engagement
- Runs a post-appointment follow-up sequence (nachher) that drives reviews, feedback, and rebooking
- Generates invoices and receipts for paid services

---

## 2. Ontologies Involved

### 2.1 Product (`type: "product"`, subtype: `"digital"`)

One product per bookable service offering.

```
customProperties: {
  productCode: "INIT-CONSULT-60",
  description: "Initial Consultation - 60 minutes",
  price: 12000,                    // cents ($120.00)
  currency: "USD",
  taxBehavior: "inclusive",
  maxQuantity: 1,
  bookingSettings: {
    duration: 60,                  // minutes
    bufferBefore: 10,              // minutes gap before
    bufferAfter: 10,               // minutes gap after
    requiresResource: true,
    resourceType: "staff",
    allowGroupBooking: false,
    maxGroupSize: 1,
    cancellationPolicy: "24h",
    depositRequired: false
  }
}
```

**Mutations used:** `createProduct`, `updateProduct`, `publishProduct`, `incrementSold`

### 2.2 Bookable Resource (`type: "bookable_resource"`)

Represents the provider or physical space required for the service.

| Subtype | Example | customProperties |
|---------|---------|-----------------|
| `staff` | Dr. Sarah Chen | `{ staffName, title, specializations, availableHours, breakTimes }` |
| `room` | Treatment Room A | `{ capacity, equipment, floor, accessible }` |
| `equipment` | Ultrasound Machine | `{ model, maintenanceSchedule }` |
| `space` | Group Studio | `{ capacity, amenities }` |

### 2.3 Bookable Service (`type: "bookable_service"`)

Links a product to resource requirements and scheduling rules.

| Subtype | Use Case |
|---------|----------|
| `appointment` | 1-on-1 session (consultation, therapy, dental exam) |
| `class` | Group session (yoga class, group coaching) |
| `treatment` | Clinical or spa treatment (massage, physio session) |

```
customProperties: {
  linkedProductId: "<product._id>",
  requiredResources: [
    { resourceType: "staff", resourceId: "<bookable_resource._id>" },
    { resourceType: "room", resourceId: "<bookable_resource._id>" }
  ],
  duration: 60,
  availabilityRules: {
    businessHours: { mon: "09:00-17:00", tue: "09:00-17:00", ... },
    timezone: "America/New_York",
    slotInterval: 30,
    advanceBookingDays: 30,
    minNoticeHours: 24
  }
}
```

### 2.4 Form (`type: "form"`, subtype: `"registration"`)

Intake form embedded in the booking page. Collects patient/client information.

```
fields: [
  { type: "section_header", label: "Personal Information", required: false },
  { type: "text", label: "First Name", required: true, placeholder: "Your first name" },
  { type: "text", label: "Last Name", required: true, placeholder: "Your last name" },
  { type: "email", label: "Email", required: true, placeholder: "you@example.com" },
  { type: "phone", label: "Phone", required: true, placeholder: "+1 (555) 000-0000" },
  { type: "datetime", label: "Preferred Date & Time", required: true },
  { type: "select", label: "Service Type", required: true, options: ["Initial Consultation", "Follow-Up Session", "Sports Massage"] },
  { type: "textarea", label: "Notes / Reason for Visit", required: false, placeholder: "Any details you'd like us to know..." },
  { type: "section_header", label: "Industry-Specific", required: false },
  { type: "text", label: "Insurance Provider", required: false, placeholder: "e.g. Aetna, Blue Cross" },
  { type: "text", label: "Referral Source", required: false, placeholder: "How did you hear about us?" },
  { type: "checkbox", label: "I agree to the cancellation policy", required: true }
]

formSettings: {
  redirectUrl: "/booking/confirmation",
  notifications: { adminEmail: true, confirmationEmail: true },
  submissionBehavior: "redirect"
}
```

**Mutations used:** `createForm`, `updateForm`, `publishForm`, `createFormResponse`, `submitPublicForm`

### 2.5 CRM Contact (`type: "crm_contact"`)

Created or updated on every booking.

| Field | Source |
|-------|--------|
| `firstName` | primaryAttendee.firstName |
| `lastName` | primaryAttendee.lastName |
| `email` | primaryAttendee.email |
| `phone` | primaryAttendee.phone |
| `contactType` | `"customer"` |
| `tags` | `["client", "service_name", "booking_source_web"]` |
| `pipelineStageId` | `"booked"` |
| `customFields` | `{ preferredService, insuranceProvider, referralSource, firstVisitDate, lastVisitDate, totalVisits }` |

**Subtypes:** Initially `lead` on first contact, transitions to `customer` after first completed appointment.

**Mutations used:** `createContact`, `updateContact`

### 2.6 Workflow (`type: "layer_workflow"`)

Five workflows defined in Section 4.

**Mutations used:** `createWorkflow`, `saveWorkflow`, `updateWorkflowStatus`

### 2.7 Automation Sequence (`type: "automation_sequence"`)

| Subtype | Purpose |
|---------|---------|
| `vorher` | Pre-appointment reminders (1 day before, 1 hour before) |
| `nachher` | Post-appointment follow-up (thank you, feedback, rebooking) |
| `lifecycle` | No-show re-engagement, recurring client nurture |
| `custom` | Seasonal re-engagement, birthday/anniversary specials |

### 2.8 Object Links (`objectLinks`)

| linkType | sourceObjectId | targetObjectId | Purpose |
|----------|---------------|----------------|---------|
| `product_form` | product._id | form._id | Booking product requires intake form |
| `checkout_product` | checkout._id | product._id | Checkout sells booking product |
| `workflow_form` | workflow._id | form._id | Workflow triggered by form |
| `workflow_sequence` | workflow._id | sequence._id | Workflow enrolls in sequence |

---

## 3. Builder Components

### 3.1 Booking Page (`/builder/booking-page`)

**Purpose:** Public-facing page where end customers select a service and book.

**Sections:**
1. **Service Selection** -- List of available services with name, description, duration, and price. Each service is a published `product` (subtype `digital`) with `bookingSettings`.
2. **Availability Calendar** -- Monthly calendar view showing available dates. Pulls availability from `bookable_service.availabilityRules` cross-referenced with `bookable_resource` schedules.
3. **Time Slot Picker** -- Shows available slots for the selected date. Slot interval from `bookable_service.availabilityRules.slotInterval`. Grey out slots that conflict with existing bookings or resource unavailability.
4. **Intake Form Embed** -- Renders the published `form` (subtype `registration`). Pre-fills service type from step 1 and datetime from step 3.

**Data flow:** User selects service -> calendar shows available dates -> user picks date -> slots load -> user picks slot -> intake form appears -> user submits -> `POST /api/v1/bookings/create` fires.

### 3.2 Confirmation Page (`/builder/confirmation-page`)

**Purpose:** Shown immediately after successful booking.

**Sections:**
1. **Booking Summary** -- Service name, date, time, duration, provider name, location
2. **Calendar Add Link** -- "Add to Google Calendar" / "Add to Apple Calendar" (.ics download)
3. **Preparation Instructions** -- Dynamic content based on service type (e.g., "Please arrive 10 minutes early", "Wear comfortable clothing", "Bring your insurance card")
4. **Cancellation/Reschedule Info** -- Link to reschedule, cancellation policy reminder
5. **Contact Information** -- Business phone, email, location map embed

### 3.3 Service Menu Page (`/builder/service-menu`)

**Purpose:** Browse all available services before entering the booking flow.

**Sections:**
1. **Service Cards** -- Grid or list of services. Each card: name, short description, duration badge, price, "Book Now" button linking to `/builder/booking-page?service={productId}`
2. **Staff Profiles** -- Optional section showing providers with photo, title, specializations
3. **Location Info** -- Address, map, parking instructions, accessibility info

---

## 4. Layers Automations

### 4.1 Workflow 1: Booking Confirmation

**Trigger:** A new booking is created.

```
Nodes:
  trigger_1:
    type: "trigger_booking_created"
    id: "trigger_1"
    position: { x: 0, y: 200 }
    config: {}
    status: "active"
    label: "Booking Created"

  crm_1:
    type: "lc_crm"
    id: "crm_1"
    position: { x: 300, y: 200 }
    config:
      action: "create-contact"
      firstName: "{{booking.primaryAttendee.firstName}}"
      lastName: "{{booking.primaryAttendee.lastName}}"
      email: "{{booking.primaryAttendee.email}}"
      phone: "{{booking.primaryAttendee.phone}}"
      contactType: "customer"
      tags: ["client", "{{booking.serviceName}}", "booking_source_{{booking.source}}"]
      customFields:
        preferredService: "{{booking.serviceName}}"
        firstVisitDate: "{{booking.dateTime}}"
    status: "ready"
    label: "Create/Update CRM Contact"

  crm_2:
    type: "lc_crm"
    id: "crm_2"
    position: { x: 600, y: 200 }
    config:
      action: "move-pipeline-stage"
      pipelineStageId: "booked"
    status: "ready"
    label: "Move to Booked Stage"

  email_1:
    type: "lc_email"
    id: "email_1"
    position: { x: 900, y: 200 }
    config:
      action: "send-confirmation-email"
      to: "{{booking.primaryAttendee.email}}"
      subject: "Your {{booking.serviceName}} is confirmed - {{booking.dateFormatted}}"
      body: |
        Hi {{booking.primaryAttendee.firstName}},

        Your appointment is confirmed:

        Service: {{booking.serviceName}}
        Date: {{booking.dateFormatted}}
        Time: {{booking.timeFormatted}}
        Duration: {{booking.duration}} minutes
        Location: {{business.address}}
        Provider: {{booking.staffName}}

        Preparation: {{booking.prepInstructions}}

        Need to reschedule? Reply to this email or call {{business.phone}}.

        See you soon!
        {{business.name}}
    status: "ready"
    label: "Send Confirmation Email"

  ac_1:
    type: "activecampaign"
    id: "ac_1"
    position: { x: 1200, y: 200 }
    config:
      action: "add_contact"
      email: "{{booking.primaryAttendee.email}}"
      firstName: "{{booking.primaryAttendee.firstName}}"
      lastName: "{{booking.primaryAttendee.lastName}}"
    status: "ready"
    label: "Sync to ActiveCampaign"

  ac_2:
    type: "activecampaign"
    id: "ac_2"
    position: { x: 1500, y: 200 }
    config:
      action: "add_tag"
      tag: "booked_{{booking.serviceName}}"
    status: "ready"
    label: "Tag: Booked Service"

Edges:
  - { id: "e1", source: "trigger_1", target: "crm_1", sourceHandle: "output", targetHandle: "input" }
  - { id: "e2", source: "crm_1", target: "crm_2", sourceHandle: "output", targetHandle: "input" }
  - { id: "e3", source: "crm_2", target: "email_1", sourceHandle: "output", targetHandle: "input" }
  - { id: "e4", source: "email_1", target: "ac_1", sourceHandle: "output", targetHandle: "input" }
  - { id: "e5", source: "ac_1", target: "ac_2", sourceHandle: "output", targetHandle: "input" }
```

### 4.2 Workflow 2: Appointment Reminder (Vorher)

**Trigger:** Scheduled daily at 9:00 AM. Queries bookings for the next day and sends reminders.

```
Nodes:
  trigger_1:
    type: "trigger_schedule"
    id: "trigger_1"
    position: { x: 0, y: 200 }
    config:
      cronExpression: "0 9 * * *"
      timezone: "America/New_York"
    status: "active"
    label: "Daily 9 AM"

  code_1:
    type: "code_block"
    id: "code_1"
    position: { x: 300, y: 200 }
    config:
      code: |
        // Query bookings where date = tomorrow
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const startOfDay = new Date(tomorrow.setHours(0, 0, 0, 0)).getTime();
        const endOfDay = new Date(tomorrow.setHours(23, 59, 59, 999)).getTime();
        const bookings = await ctx.query("bookings", {
          filter: { dateTime: { $gte: startOfDay, $lte: endOfDay }, status: "confirmed" }
        });
        return { bookings };
    status: "ready"
    label: "Query Tomorrow's Bookings"

  loop_1:
    type: "loop_iterator"
    id: "loop_1"
    position: { x: 600, y: 200 }
    config:
      arrayField: "bookings"
      maxIterations: 100
    status: "ready"
    label: "For Each Booking"

  email_1:
    type: "lc_email"
    id: "email_1"
    position: { x: 900, y: 100 }
    config:
      action: "send-confirmation-email"
      to: "{{item.primaryAttendee.email}}"
      subject: "Reminder: Your {{item.serviceName}} is tomorrow"
      body: |
        Hi {{item.primaryAttendee.firstName}},

        Just a friendly reminder that your appointment is tomorrow:

        Service: {{item.serviceName}}
        Date: {{item.dateFormatted}}
        Time: {{item.timeFormatted}}
        Location: {{business.address}}
        Provider: {{item.staffName}}

        Preparation: {{item.prepInstructions}}

        Need to reschedule? Contact us at {{business.phone}} or reply to this email.

        See you tomorrow!
        {{business.name}}
    status: "ready"
    label: "Send Reminder Email"

  sms_1:
    type: "lc_sms"
    id: "sms_1"
    position: { x: 900, y: 300 }
    config:
      to: "{{item.primaryAttendee.phone}}"
      body: "Reminder: Your {{item.serviceName}} is tomorrow at {{item.timeFormatted}}. {{business.address}}. Need to reschedule? Call {{business.phone}}"
    status: "ready"
    label: "Send Reminder SMS"

Edges:
  - { id: "e1", source: "trigger_1", target: "code_1", sourceHandle: "output", targetHandle: "input" }
  - { id: "e2", source: "code_1", target: "loop_1", sourceHandle: "output", targetHandle: "input" }
  - { id: "e3", source: "loop_1", target: "email_1", sourceHandle: "each_item", targetHandle: "input" }
  - { id: "e4", source: "loop_1", target: "sms_1", sourceHandle: "each_item", targetHandle: "input" }
```

### 4.3 Workflow 3: Post-Appointment Follow-Up (Nachher)

**Trigger:** Booking created. Waits until the appointment is over, then starts the follow-up sequence.

```
Nodes:
  trigger_1:
    type: "trigger_booking_created"
    id: "trigger_1"
    position: { x: 0, y: 200 }
    config: {}
    status: "active"
    label: "Booking Created"

  wait_1:
    type: "wait_delay"
    id: "wait_1"
    position: { x: 300, y: 200 }
    config:
      duration: "{{booking.duration + 60}}"
      unit: "minutes"
    status: "ready"
    label: "Wait Until Appointment Ends + 1 Hour"

  crm_1:
    type: "lc_crm"
    id: "crm_1"
    position: { x: 600, y: 200 }
    config:
      action: "move-pipeline-stage"
      pipelineStageId: "completed"
    status: "ready"
    label: "Move to Completed Stage"

  email_1:
    type: "lc_email"
    id: "email_1"
    position: { x: 900, y: 200 }
    config:
      action: "send-confirmation-email"
      to: "{{booking.primaryAttendee.email}}"
      subject: "Thank you for your visit, {{booking.primaryAttendee.firstName}}!"
      body: |
        Hi {{booking.primaryAttendee.firstName}},

        Thank you for visiting {{business.name}} today for your {{booking.serviceName}}.

        We hope everything met your expectations. If you have any questions about your session, don't hesitate to reach out.

        We'd love your feedback: {{feedbackFormUrl}}

        To book your next appointment: {{bookingPageUrl}}

        Best regards,
        {{business.name}}
    status: "ready"
    label: "Send Thank You + Feedback Link"

  wait_2:
    type: "wait_delay"
    id: "wait_2"
    position: { x: 1200, y: 200 }
    config:
      duration: 1
      unit: "days"
    status: "ready"
    label: "Wait 1 Day"

  email_2:
    type: "lc_email"
    id: "email_2"
    position: { x: 1500, y: 200 }
    config:
      action: "send-confirmation-email"
      to: "{{booking.primaryAttendee.email}}"
      subject: "How are you feeling after your {{booking.serviceName}}?"
      body: |
        Hi {{booking.primaryAttendee.firstName}},

        Just checking in after your {{booking.serviceName}} yesterday. How are you feeling?

        If you have any questions or concerns, we're here to help.

        {{business.name}}
        {{business.phone}}
    status: "ready"
    label: "Day-After Check-In"

  wait_3:
    type: "wait_delay"
    id: "wait_3"
    position: { x: 1800, y: 200 }
    config:
      duration: 6
      unit: "days"
    status: "ready"
    label: "Wait 6 More Days (Day 7 Total)"

  email_3:
    type: "lc_email"
    id: "email_3"
    position: { x: 2100, y: 200 }
    config:
      action: "send-confirmation-email"
      to: "{{booking.primaryAttendee.email}}"
      subject: "Could you leave us a review?"
      body: |
        Hi {{booking.primaryAttendee.firstName}},

        It's been a week since your {{booking.serviceName}}. We hope you're doing well!

        If you had a great experience, we'd be grateful if you could leave a review: {{reviewLink}}

        Your feedback helps others find the care they need.

        Thank you,
        {{business.name}}
    status: "ready"
    label: "Review Request (Day 7)"

  wait_4:
    type: "wait_delay"
    id: "wait_4"
    position: { x: 2400, y: 200 }
    config:
      duration: 7
      unit: "days"
    status: "ready"
    label: "Wait 7 More Days (Day 14 Total)"

  email_4:
    type: "lc_email"
    id: "email_4"
    position: { x: 2700, y: 200 }
    config:
      action: "send-confirmation-email"
      to: "{{booking.primaryAttendee.email}}"
      subject: "Time for your next {{booking.serviceName}}?"
      body: |
        Hi {{booking.primaryAttendee.firstName}},

        It's been two weeks since your last {{booking.serviceName}}. Based on your treatment plan, now is a great time to schedule your next session.

        Book now: {{bookingPageUrl}}

        {{business.name}}
    status: "ready"
    label: "Rebooking Prompt (Day 14)"

Edges:
  - { id: "e1", source: "trigger_1", target: "wait_1", sourceHandle: "output", targetHandle: "input" }
  - { id: "e2", source: "wait_1", target: "crm_1", sourceHandle: "output", targetHandle: "input" }
  - { id: "e3", source: "crm_1", target: "email_1", sourceHandle: "output", targetHandle: "input" }
  - { id: "e4", source: "email_1", target: "wait_2", sourceHandle: "output", targetHandle: "input" }
  - { id: "e5", source: "wait_2", target: "email_2", sourceHandle: "output", targetHandle: "input" }
  - { id: "e6", source: "email_2", target: "wait_3", sourceHandle: "output", targetHandle: "input" }
  - { id: "e7", source: "wait_3", target: "email_3", sourceHandle: "output", targetHandle: "input" }
  - { id: "e8", source: "email_3", target: "wait_4", sourceHandle: "output", targetHandle: "input" }
  - { id: "e9", source: "wait_4", target: "email_4", sourceHandle: "output", targetHandle: "input" }
```

### 4.4 Workflow 4: No-Show Handler

**Trigger:** Contact's pipeline stage changes to `no_show`.

```
Nodes:
  trigger_1:
    type: "trigger_contact_updated"
    id: "trigger_1"
    position: { x: 0, y: 200 }
    config: {}
    status: "active"
    label: "Contact Updated"

  if_1:
    type: "if_then"
    id: "if_1"
    position: { x: 300, y: 200 }
    config:
      expression: "contact.pipelineStageId === 'no_show'"
    status: "ready"
    label: "Is No-Show?"

  email_1:
    type: "lc_email"
    id: "email_1"
    position: { x: 600, y: 100 }
    config:
      action: "send-confirmation-email"
      to: "{{contact.email}}"
      subject: "We missed you today, {{contact.firstName}}"
      body: |
        Hi {{contact.firstName}},

        We noticed you weren't able to make your appointment today. No worries -- life happens!

        We'd love to get you rescheduled at a time that works better:
        {{bookingPageUrl}}

        If you have any questions, just reply to this email or call us at {{business.phone}}.

        {{business.name}}
    status: "ready"
    label: "Reschedule Offer Email"

  wait_1:
    type: "wait_delay"
    id: "wait_1"
    position: { x: 900, y: 100 }
    config:
      duration: 2
      unit: "days"
    status: "ready"
    label: "Wait 2 Days"

  email_2:
    type: "lc_email"
    id: "email_2"
    position: { x: 1200, y: 100 }
    config:
      action: "send-confirmation-email"
      to: "{{contact.email}}"
      subject: "Still thinking about your {{contact.customFields.preferredService}}?"
      body: |
        Hi {{contact.firstName}},

        Just a gentle follow-up. Your {{contact.customFields.preferredService}} can help with:
        - [Benefit 1 specific to service]
        - [Benefit 2 specific to service]
        - [Benefit 3 specific to service]

        Many of our clients see results after just one session. Don't let this wait!

        Rebook here: {{bookingPageUrl}}

        {{business.name}}
    status: "ready"
    label: "Value Reminder + Rebooking Link"

  crm_1:
    type: "lc_crm"
    id: "crm_1"
    position: { x: 600, y: 350 }
    config:
      action: "update-contact"
      tags: ["no_show", "needs_reschedule"]
    status: "ready"
    label: "Tag as No-Show"

Edges:
  - { id: "e1", source: "trigger_1", target: "if_1", sourceHandle: "output", targetHandle: "input" }
  - { id: "e2", source: "if_1", target: "email_1", sourceHandle: "true", targetHandle: "input", label: "Is No-Show" }
  - { id: "e3", source: "if_1", target: "crm_1", sourceHandle: "true", targetHandle: "input", label: "Tag Contact" }
  - { id: "e4", source: "email_1", target: "wait_1", sourceHandle: "output", targetHandle: "input" }
  - { id: "e5", source: "wait_1", target: "email_2", sourceHandle: "output", targetHandle: "input" }
```

### 4.5 Workflow 5: Payment Processing (Optional -- Paid Services)

**Trigger:** Payment received for a booking product.

```
Nodes:
  trigger_1:
    type: "trigger_payment_received"
    id: "trigger_1"
    position: { x: 0, y: 200 }
    config:
      paymentProvider: "any"
    status: "active"
    label: "Payment Received"

  invoice_1:
    type: "lc_invoicing"
    id: "invoice_1"
    position: { x: 300, y: 200 }
    config:
      action: "generate-invoice"
      invoiceType: "b2c_single"
      lineItems: [
        {
          description: "{{payment.productName}}",
          quantity: 1,
          unitPrice: "{{payment.amount}}",
          currency: "{{payment.currency}}"
        }
      ]
      paymentTerms: "due_on_receipt"
    status: "ready"
    label: "Generate Invoice"

  email_1:
    type: "lc_email"
    id: "email_1"
    position: { x: 600, y: 200 }
    config:
      action: "send-confirmation-email"
      to: "{{payment.customerEmail}}"
      subject: "Receipt for your {{payment.productName}} - {{business.name}}"
      body: |
        Hi {{payment.customerFirstName}},

        Thank you for your payment. Here is your receipt:

        Service: {{payment.productName}}
        Amount: {{payment.amountFormatted}}
        Date: {{payment.dateFormatted}}
        Invoice: {{invoiceUrl}}

        Your appointment details have been sent in a separate confirmation email.

        {{business.name}}
    status: "ready"
    label: "Send Receipt Email"

Edges:
  - { id: "e1", source: "trigger_1", target: "invoice_1", sourceHandle: "output", targetHandle: "input" }
  - { id: "e2", source: "invoice_1", target: "email_1", sourceHandle: "output", targetHandle: "input" }
```

---

## 5. CRM Pipeline

**Pipeline Name:** `Bookings: [Service Name]`

**Stages:**

| Stage | ID | Description | Trigger |
|-------|----|-------------|---------|
| Inquiry | `inquiry` | Contact expressed interest but has not yet booked | Form submitted without completing booking, or manual entry |
| Booked | `booked` | Booking created, awaiting confirmation or payment | `trigger_booking_created` fires -> `lc_crm` moves to this stage |
| Confirmed | `confirmed` | Payment received (if paid) or booking confirmed (if free) | `trigger_payment_received` fires, or automatic for free services |
| Checked In | `checked_in` | Client has arrived for the appointment | Staff manually marks, or check-in kiosk triggers `trigger_contact_updated` |
| Completed | `completed` | Appointment finished successfully | Post-appointment workflow moves contact here after `wait_delay` |
| No-Show | `no_show` | Client did not attend | Staff marks manually -> triggers Workflow 4 (No-Show Handler) |
| Follow-Up | `follow_up` | Post-service sequence active, awaiting rebooking or feedback | Entered automatically by Workflow 3 during post-appointment emails |
| Recurring | `recurring` | Client has booked 2+ appointments, considered an active recurring client | Updated when `customFields.totalVisits >= 2` |

**Stage Transitions:**

```
inquiry -> booked        (booking created)
booked -> confirmed      (payment received or auto-confirm for free)
confirmed -> checked_in  (arrival detected or manual check-in)
checked_in -> completed  (appointment ends, post-workflow fires)
confirmed -> no_show     (staff marks no-show)
no_show -> booked        (client reschedules via no-show workflow)
completed -> follow_up   (post-appointment sequence begins)
follow_up -> recurring   (totalVisits >= 2 on next booking)
recurring -> confirmed   (new booking created for recurring client)
```

---

## 6. File System Scaffold

```
/ (project root)
├── /builder
│   ├── booking-page          # kind: builder_ref — Service selection + calendar + intake form
│   ├── confirmation-page     # kind: builder_ref — Post-booking confirmation with details
│   └── service-menu          # kind: builder_ref — Public service catalog / menu page
│
├── /layers
│   ├── booking-confirmation-workflow     # kind: layer_ref — Workflow 1: CRM + email + AC sync
│   ├── reminder-workflow                 # kind: layer_ref — Workflow 2: Daily reminder scheduler
│   ├── post-appointment-workflow         # kind: layer_ref — Workflow 3: Follow-up sequence
│   ├── no-show-workflow                  # kind: layer_ref — Workflow 4: No-show re-engagement
│   └── payment-processing-workflow       # kind: layer_ref — Workflow 5: Invoice + receipt (optional)
│
├── /notes
│   ├── service-catalog       # kind: virtual — List of all services, durations, prices, descriptions
│   ├── intake-questions       # kind: virtual — Intake form field rationale and customization notes
│   └── preparation-instructions  # kind: virtual — Per-service preparation text for confirmation emails
│
└── /assets
    ├── service-photos         # kind: media_ref — Photos of treatment rooms, equipment, etc.
    ├── location-map           # kind: media_ref — Embedded map image or link
    └── team-photos            # kind: media_ref — Staff headshots for provider profiles
```

**Initialization:**

```
initializeProjectFolders({ organizationId, projectId })
createFolder({ sessionId, projectId, name: "builder", parentPath: "/" })
createFolder({ sessionId, projectId, name: "layers", parentPath: "/" })
createFolder({ sessionId, projectId, name: "notes", parentPath: "/" })
createFolder({ sessionId, projectId, name: "assets", parentPath: "/" })
captureBuilderApp({ projectId, builderAppId: "<booking-page-app-id>" })
captureLayerWorkflow({ projectId, layerWorkflowId: "<booking-confirmation-workflow-id>" })
captureLayerWorkflow({ projectId, layerWorkflowId: "<reminder-workflow-id>" })
captureLayerWorkflow({ projectId, layerWorkflowId: "<post-appointment-workflow-id>" })
captureLayerWorkflow({ projectId, layerWorkflowId: "<no-show-workflow-id>" })
```

---

## 7. Data Flow Diagram

```
                                    BOOKING & APPOINTMENT SYSTEM
                                    ============================

  END CUSTOMER                        PLATFORM                              BACK-OFFICE
  ============                        ========                              ===========

  +-----------------+
  | Visit Service   |
  | Menu Page       |
  +--------+--------+
           |
           v
  +-----------------+
  | Select Service  |-----> product (digital) with bookingSettings
  +--------+--------+
           |
           v
  +-----------------+
  | Pick Date on    |-----> bookable_service.availabilityRules
  | Calendar        |-----> bookable_resource schedules
  +--------+--------+
           |
           v
  +-----------------+
  | Select Time     |-----> Available slots (slotInterval, bufferBefore/After)
  | Slot            |
  +--------+--------+
           |
           v
  +-----------------+
  | Fill Intake     |-----> form (registration subtype)
  | Form            |-----> submitPublicForm({ formId, responses })
  +--------+--------+
           |
           v
  +-----------------+       +--------------------+
  | POST /bookings/ |------>| Booking Created    |-----> bookingId, transactionId
  | create          |       +--------+-----------+       tickets[], crmContacts[]
  +-----------------+                |
                                     |
                      +--------------+--------------+
                      |              |              |
                      v              v              v
              +-------+----+  +-----+------+  +---+----------+
              | CRM Contact|  | Confirmation|  | ActiveCamp.  |
              | Created/   |  | Email + SMS |  | Sync + Tag   |
              | Updated    |  +-----+------+  +---+----------+
              | Stage:     |        |              |
              | "booked"   |        v              |
              +-------+----+  +-----+------+      |
                      |       | Calendar   |      |
                      |       | .ics link  |      |
                      |       +------------+      |
                      |                           |
                      v                           |
              +-------+----------+                |
              |  VORHER SEQUENCE |                |
              |  (Pre-Appt)      |                |
              +--+------------+--+                |
                 |            |                   |
                 v            v                   |
          +------+---+  +----+----+              |
          | -1 day   |  | -1 hour |              |
          | Email    |  | SMS     |              |
          | Reminder |  | Reminder|              |
          +------+---+  +----+----+              |
                 |            |                   |
                 +-----+------+                   |
                       |                          |
                       v                          |
              +--------+---------+                |
              | APPOINTMENT      |                |
              | (Real World)     |                |
              +---+---------+----+                |
                  |         |                     |
            +-----+    +---+-----+               |
            |          |         |                |
            v          v         v                |
     +------+--+ +----+----+ +--+--------+       |
     | Completed| | No-Show | | Checked   |       |
     | (normal) | | (miss)  | | In (kiosk)|       |
     +------+---+ +----+----+ +--+--------+       |
            |           |         |                |
            |           v         |                |
            |    +------+------+  |                |
            |    | NO-SHOW WF  |  |                |
            |    | Reschedule  |  |                |
            |    | offer email |  |                |
            |    | +2d: Value  |  |                |
            |    | reminder    |  |                |
            |    +-------------+  |                |
            |                     |                |
            +----------+----------+                |
                       |                           |
                       v                           |
              +--------+-----------+               |
              | NACHHER SEQUENCE   |               |
              | (Post-Appt)        |               |
              +--+-----------+--+--+               |
                 |           |  |                  |
                 v           v  v                  v
          +------+---+ +----++ +---+-----+ +------+------+
          | +1h      | |+1d | | +7d     | | +14d        |
          | Thank you| |Chk | | Review  | | Rebook      |
          | +feedback| |in  | | request | | prompt      |
          +----------+ +----+ +---------+ +------+------+
                                                  |
                                                  v
                                          +-------+--------+
                                          | Pipeline Stage: |
                                          | "recurring"     |
                                          | (totalVisits>=2)|
                                          +----------------+
```

---

## 8. Customization Points

### Must-Customize (deployment will not work without these)

| Item | Where | Example |
|------|-------|---------|
| Service names | product.name, bookable_service.name | "Initial Consultation", "Deep Tissue Massage" |
| Service durations | product.bookingSettings.duration, bookable_service.duration | 30, 45, 60, 90 minutes |
| Service prices | product.customProperties.price | 7500, 9500, 12000 (cents) |
| Staff names | bookable_resource (subtype: staff) | "Dr. Sarah Chen", "Dr. Mike Torres" |
| Business hours | bookable_service.availabilityRules.businessHours | `{ mon: "09:00-17:00", ... }` |
| Location details | Builder pages, email templates | "123 Health Ave, Suite 200, New York, NY 10001" |
| Business name | Email templates, builder pages | "PhysioFirst Clinic" |
| Business phone | Email templates, SMS content | "+1 (555) 123-4567" |

### Should-Customize (works with defaults but better when tailored)

| Item | Where | Default |
|------|-------|---------|
| Intake form questions | form.customProperties.fields | Generic: name, email, phone, date, service, notes |
| Industry-specific fields | form.customProperties.fields (after section_header) | None (insurance, referral source are examples) |
| Confirmation email content | Workflow 1, email_1.config.body | Generic template with placeholders |
| Preparation instructions | Confirmation page, reminder emails | "Please arrive 10 minutes early" |
| Reminder timing | Workflow 2 cron, Workflow 3 wait_delay durations | -1 day email, same-day SMS |
| Follow-up sequence content | Workflow 3 email bodies | Generic thank you / check-in / review request |
| Cancellation policy text | form checkbox, confirmation page | "24-hour cancellation policy" |
| Review link URL | Workflow 3 email_3.config.body `{{reviewLink}}` | Placeholder -- must set Google/Yelp link |

### Can-Use-Default (safe to deploy as-is)

| Item | Where |
|------|-------|
| Pipeline stages | inquiry -> booked -> confirmed -> checked_in -> completed -> no_show -> follow_up -> recurring |
| Workflow structure | 5 workflows as defined in Section 4 |
| Sequence timing offsets | +1h, +1d, +7d, +14d for post-appointment |
| File system layout | /builder, /layers, /notes, /assets |
| CRM contact fields | firstName, lastName, email, phone, tags, pipelineStageId, customFields |
| Edge routing | All sourceHandle/targetHandle mappings |
| Slot interval | 30 minutes |
| Advance booking window | 30 days |
| Minimum notice | 24 hours |

---

## 9. Common Pitfalls

### P1: Bookable Resource Not Created

**Symptom:** Booking page shows "No availability" even though business hours are set.
**Cause:** Only `product` (digital) was created, but no `bookable_resource` (staff/room) was created and linked to a `bookable_service`.
**Fix:** Create at least one `bookable_resource` (subtype `staff`), then create a `bookable_service` with `requiredResources` referencing that resource.

### P2: Service Duration Not Configured

**Symptom:** Calendar shows overlapping slots or all-day availability.
**Cause:** `product.bookingSettings.duration` is missing or zero, and `bookable_service.duration` is not set.
**Fix:** Set `duration` in both `product.bookingSettings` and `bookable_service.customProperties`. They must match.

### P3: Reminder Workflow Wrong Timing Reference

**Symptom:** Reminders fire relative to when the booking was created instead of when the appointment is scheduled.
**Cause:** Using `referencePoint: "trigger_event"` (which is booking creation time) instead of `referencePoint: "booking_start"` in sequence timing.
**Fix:** For vorher (pre-appointment) sequences, always use `referencePoint: "booking_start"`. For nachher (post-appointment), use `referencePoint: "booking_end"` or calculate from `booking_start + duration`.

### P4: No-Show Detection Not Wired

**Symptom:** No-show workflow never fires.
**Cause:** No mechanism to move the contact to the `no_show` pipeline stage. The `trigger_contact_updated` node in Workflow 4 only fires when `pipelineStageId` changes.
**Fix:** Ensure staff has a way to mark no-shows (manual pipeline stage move, or build a check-in system that auto-detects missed appointments after `booking_start + duration + grace_period`).

### P5: Form Fields Don't Match Booking API

**Symptom:** Booking creation fails with validation error.
**Cause:** The Bookings API `POST /api/v1/bookings/create` requires `primaryAttendee: { firstName, lastName, email, phone }` as separate fields. If the intake form uses a single "Full Name" field, the mapping breaks.
**Fix:** Intake form MUST have separate `text` fields for "First Name" and "Last Name", plus `email` and `phone` field types. Map form responses to `primaryAttendee` fields before calling the Bookings API.

### P6: Payment Workflow Missing for Paid Services

**Symptom:** Client books a paid service but receives no receipt or invoice.
**Cause:** Workflow 5 (Payment Processing) was not activated, or `trigger_payment_received` is not configured.
**Fix:** For any product where `price > 0`, activate Workflow 5 and ensure `lc_invoicing` node is configured with correct `invoiceType` and line items.

### P7: Buffer Times Not Accounted For

**Symptom:** Back-to-back bookings with no gap for cleanup/transition.
**Cause:** `bookingSettings.bufferBefore` and `bufferAfter` not set on the product.
**Fix:** Set appropriate buffer times. Example: a 60-minute massage needs `bufferBefore: 10` and `bufferAfter: 15` for room turnover.

### P8: Timezone Mismatch

**Symptom:** Reminders arrive at wrong time, calendar shows wrong availability.
**Cause:** `bookable_service.availabilityRules.timezone` does not match `trigger_schedule.config.timezone` in Workflow 2.
**Fix:** Use the same timezone string everywhere. Set it once in the service configuration and reference it in all schedule-based triggers.

---

## 10. Example Deployment

> A marketing agency sets up online booking for a physiotherapy clinic. Services: Initial Consultation (60min, $120), Follow-Up Session (30min, $75), Sports Massage (45min, $95). Staff: Dr. Sarah Chen, Dr. Mike Torres. Rooms: Treatment Room A, Treatment Room B.

### Step 1: Create Products

```
createProduct({
  sessionId: "<session>",
  organizationId: "<org>",
  name: "Initial Consultation",
  subtype: "digital",
  price: 12000,
  currency: "USD",
  description: "Comprehensive initial assessment including movement analysis, pain evaluation, and personalized treatment plan. 60 minutes with a senior physiotherapist.",
  bookingSettings: {
    duration: 60,
    bufferBefore: 10,
    bufferAfter: 10,
    requiresResource: true,
    resourceType: "staff",
    allowGroupBooking: false,
    maxGroupSize: 1,
    cancellationPolicy: "24h",
    depositRequired: false
  }
})
// Returns: productId_consult

createProduct({
  sessionId: "<session>",
  organizationId: "<org>",
  name: "Follow-Up Session",
  subtype: "digital",
  price: 7500,
  currency: "USD",
  description: "Targeted follow-up treatment session. Progress review and continued rehabilitation exercises. 30 minutes.",
  bookingSettings: {
    duration: 30,
    bufferBefore: 5,
    bufferAfter: 5,
    requiresResource: true,
    resourceType: "staff",
    allowGroupBooking: false,
    maxGroupSize: 1,
    cancellationPolicy: "24h",
    depositRequired: false
  }
})
// Returns: productId_followup

createProduct({
  sessionId: "<session>",
  organizationId: "<org>",
  name: "Sports Massage",
  subtype: "digital",
  price: 9500,
  currency: "USD",
  description: "Deep tissue sports massage targeting muscle tension, recovery, and flexibility. 45 minutes.",
  bookingSettings: {
    duration: 45,
    bufferBefore: 10,
    bufferAfter: 15,
    requiresResource: true,
    resourceType: "staff",
    allowGroupBooking: false,
    maxGroupSize: 1,
    cancellationPolicy: "24h",
    depositRequired: false
  }
})
// Returns: productId_massage
```

Publish all three:

```
publishProduct({ sessionId: "<session>", productId: "productId_consult" })
publishProduct({ sessionId: "<session>", productId: "productId_followup" })
publishProduct({ sessionId: "<session>", productId: "productId_massage" })
```

### Step 2: Create Bookable Resources

```
// Staff
createObject({
  organizationId: "<org>",
  type: "bookable_resource",
  subtype: "staff",
  name: "Dr. Sarah Chen",
  customProperties: {
    staffName: "Dr. Sarah Chen",
    title: "Senior Physiotherapist",
    specializations: ["sports injuries", "post-operative rehabilitation", "chronic pain"],
    availableHours: {
      mon: "09:00-17:00",
      tue: "09:00-17:00",
      wed: "09:00-13:00",
      thu: "09:00-17:00",
      fri: "09:00-15:00"
    },
    breakTimes: [{ start: "12:00", end: "13:00" }]
  }
})
// Returns: resourceId_sarah

createObject({
  organizationId: "<org>",
  type: "bookable_resource",
  subtype: "staff",
  name: "Dr. Mike Torres",
  customProperties: {
    staffName: "Dr. Mike Torres",
    title: "Physiotherapist & Sports Massage Specialist",
    specializations: ["sports massage", "muscle recovery", "flexibility training"],
    availableHours: {
      mon: "10:00-18:00",
      tue: "10:00-18:00",
      wed: "10:00-18:00",
      thu: "10:00-18:00",
      fri: "10:00-16:00"
    },
    breakTimes: [{ start: "13:00", end: "14:00" }]
  }
})
// Returns: resourceId_mike

// Rooms
createObject({
  organizationId: "<org>",
  type: "bookable_resource",
  subtype: "room",
  name: "Treatment Room A",
  customProperties: {
    capacity: 1,
    equipment: ["treatment table", "ultrasound machine", "exercise bands"],
    floor: "1st",
    accessible: true
  }
})
// Returns: resourceId_roomA

createObject({
  organizationId: "<org>",
  type: "bookable_resource",
  subtype: "room",
  name: "Treatment Room B",
  customProperties: {
    capacity: 1,
    equipment: ["treatment table", "massage table", "heat therapy unit"],
    floor: "1st",
    accessible: true
  }
})
// Returns: resourceId_roomB
```

### Step 3: Create Bookable Services

```
createObject({
  organizationId: "<org>",
  type: "bookable_service",
  subtype: "appointment",
  name: "Initial Consultation Service",
  customProperties: {
    linkedProductId: "productId_consult",
    requiredResources: [
      { resourceType: "staff", resourceId: "resourceId_sarah" },
      { resourceType: "staff", resourceId: "resourceId_mike" },
      { resourceType: "room", resourceId: "resourceId_roomA" },
      { resourceType: "room", resourceId: "resourceId_roomB" }
    ],
    duration: 60,
    availabilityRules: {
      businessHours: {
        mon: "09:00-17:00",
        tue: "09:00-17:00",
        wed: "09:00-17:00",
        thu: "09:00-17:00",
        fri: "09:00-16:00"
      },
      timezone: "America/New_York",
      slotInterval: 30,
      advanceBookingDays: 30,
      minNoticeHours: 24
    }
  }
})
// Returns: serviceId_consult

createObject({
  organizationId: "<org>",
  type: "bookable_service",
  subtype: "treatment",
  name: "Follow-Up Session Service",
  customProperties: {
    linkedProductId: "productId_followup",
    requiredResources: [
      { resourceType: "staff", resourceId: "resourceId_sarah" },
      { resourceType: "staff", resourceId: "resourceId_mike" },
      { resourceType: "room", resourceId: "resourceId_roomA" },
      { resourceType: "room", resourceId: "resourceId_roomB" }
    ],
    duration: 30,
    availabilityRules: {
      businessHours: {
        mon: "09:00-17:00",
        tue: "09:00-17:00",
        wed: "09:00-17:00",
        thu: "09:00-17:00",
        fri: "09:00-16:00"
      },
      timezone: "America/New_York",
      slotInterval: 30,
      advanceBookingDays: 30,
      minNoticeHours: 24
    }
  }
})
// Returns: serviceId_followup

createObject({
  organizationId: "<org>",
  type: "bookable_service",
  subtype: "treatment",
  name: "Sports Massage Service",
  customProperties: {
    linkedProductId: "productId_massage",
    requiredResources: [
      { resourceType: "staff", resourceId: "resourceId_mike" },
      { resourceType: "room", resourceId: "resourceId_roomB" }
    ],
    duration: 45,
    availabilityRules: {
      businessHours: {
        mon: "10:00-18:00",
        tue: "10:00-18:00",
        wed: "10:00-18:00",
        thu: "10:00-18:00",
        fri: "10:00-16:00"
      },
      timezone: "America/New_York",
      slotInterval: 30,
      advanceBookingDays: 30,
      minNoticeHours: 24
    }
  }
})
// Returns: serviceId_massage
```

### Step 4: Create Intake Form

```
createForm({
  sessionId: "<session>",
  organizationId: "<org>",
  name: "PhysioFirst Booking Intake Form",
  description: "Patient intake form for booking appointments at PhysioFirst Clinic",
  fields: [
    { type: "section_header", label: "Personal Information", required: false },
    { type: "text", label: "First Name", required: true, placeholder: "Your first name" },
    { type: "text", label: "Last Name", required: true, placeholder: "Your last name" },
    { type: "email", label: "Email", required: true, placeholder: "you@example.com" },
    { type: "phone", label: "Phone", required: true, placeholder: "+1 (555) 000-0000" },
    { type: "datetime", label: "Preferred Date & Time", required: true },
    { type: "select", label: "Service Type", required: true, options: [
      "Initial Consultation (60min - $120)",
      "Follow-Up Session (30min - $75)",
      "Sports Massage (45min - $95)"
    ]},
    { type: "select", label: "Preferred Therapist", required: false, options: [
      "No Preference",
      "Dr. Sarah Chen",
      "Dr. Mike Torres"
    ]},
    { type: "section_header", label: "Medical Information", required: false },
    { type: "textarea", label: "Reason for Visit / Current Symptoms", required: true, placeholder: "Describe your condition, pain areas, or goals for this visit..." },
    { type: "textarea", label: "Medical History", required: false, placeholder: "Any relevant surgeries, conditions, or medications..." },
    { type: "text", label: "Insurance Provider", required: false, placeholder: "e.g. Aetna, Blue Cross" },
    { type: "text", label: "Insurance Policy Number", required: false, placeholder: "Policy #" },
    { type: "text", label: "Referring Physician", required: false, placeholder: "Dr. name (if applicable)" },
    { type: "section_header", label: "Additional", required: false },
    { type: "radio", label: "How did you hear about us?", required: false, options: [
      "Google Search",
      "Doctor Referral",
      "Friend/Family",
      "Insurance Directory",
      "Social Media",
      "Other"
    ]},
    { type: "checkbox", label: "I agree to the 24-hour cancellation policy", required: true }
  ],
  formSettings: {
    redirectUrl: "/booking/confirmation",
    notifications: { adminEmail: true, confirmationEmail: true },
    submissionBehavior: "redirect"
  }
})
// Returns: formId_intake

publishForm({ sessionId: "<session>", formId: "formId_intake" })
```

### Step 5: Create CRM Pipeline

Pipeline: **"Bookings: PhysioFirst Clinic"**

Stages created:

| Order | Stage ID | Stage Name | Description |
|-------|----------|------------|-------------|
| 1 | `inquiry` | Inquiry | Expressed interest, not yet booked |
| 2 | `booked` | Booked | Appointment scheduled, awaiting payment/confirmation |
| 3 | `confirmed` | Confirmed | Payment received, appointment locked in |
| 4 | `checked_in` | Checked In | Patient arrived at clinic |
| 5 | `completed` | Completed | Session finished |
| 6 | `no_show` | No-Show | Patient did not attend |
| 7 | `follow_up` | Follow-Up | Post-session sequence active |
| 8 | `recurring` | Recurring | 2+ visits, active ongoing patient |

### Step 6: Create Workflows

**Workflow 1: Booking Confirmation**

```
createWorkflow({ sessionId: "<session>", name: "PhysioFirst: Booking Confirmation", description: "Creates CRM contact, sends confirmation email, syncs to ActiveCampaign on new booking" })
// Returns: workflowId_confirm

saveWorkflow({
  sessionId: "<session>",
  workflowId: "workflowId_confirm",
  name: "PhysioFirst: Booking Confirmation",
  nodes: [
    {
      id: "trigger_1", type: "trigger_booking_created", position: { x: 0, y: 200 },
      config: {}, status: "active", label: "Booking Created"
    },
    {
      id: "crm_1", type: "lc_crm", position: { x: 300, y: 200 },
      config: {
        action: "create-contact",
        firstName: "{{booking.primaryAttendee.firstName}}",
        lastName: "{{booking.primaryAttendee.lastName}}",
        email: "{{booking.primaryAttendee.email}}",
        phone: "{{booking.primaryAttendee.phone}}",
        contactType: "customer",
        tags: ["client", "physiotherapy", "booking_source_{{booking.source}}"],
        customFields: {
          preferredService: "{{booking.serviceName}}",
          firstVisitDate: "{{booking.dateTime}}",
          insuranceProvider: "{{booking.formResponses.insuranceProvider}}",
          referringPhysician: "{{booking.formResponses.referringPhysician}}"
        }
      },
      status: "ready", label: "Create CRM Contact"
    },
    {
      id: "crm_2", type: "lc_crm", position: { x: 600, y: 200 },
      config: { action: "move-pipeline-stage", pipelineStageId: "booked" },
      status: "ready", label: "Move to Booked"
    },
    {
      id: "email_1", type: "lc_email", position: { x: 900, y: 200 },
      config: {
        action: "send-confirmation-email",
        to: "{{booking.primaryAttendee.email}}",
        subject: "Your {{booking.serviceName}} is confirmed - {{booking.dateFormatted}}",
        body: "Hi {{booking.primaryAttendee.firstName}},\n\nYour appointment at PhysioFirst Clinic is confirmed:\n\nService: {{booking.serviceName}}\nDate: {{booking.dateFormatted}}\nTime: {{booking.timeFormatted}}\nDuration: {{booking.duration}} minutes\nTherapist: {{booking.staffName}}\nLocation: 123 Health Avenue, Suite 200, New York, NY 10001\n\nPlease arrive 10 minutes early to complete any remaining paperwork.\nWear comfortable, loose-fitting clothing.\nBring your insurance card and photo ID.\n\nNeed to reschedule? Reply to this email or call (555) 123-4567.\n\nSee you soon!\nPhysioFirst Clinic"
      },
      status: "ready", label: "Send Confirmation Email"
    },
    {
      id: "ac_1", type: "activecampaign", position: { x: 1200, y: 200 },
      config: {
        action: "add_contact",
        email: "{{booking.primaryAttendee.email}}",
        firstName: "{{booking.primaryAttendee.firstName}}",
        lastName: "{{booking.primaryAttendee.lastName}}"
      },
      status: "ready", label: "Sync to ActiveCampaign"
    },
    {
      id: "ac_2", type: "activecampaign", position: { x: 1500, y: 200 },
      config: { action: "add_tag", tag: "booked_{{booking.serviceName}}" },
      status: "ready", label: "Tag: Booked Service"
    }
  ],
  edges: [
    { id: "e1", source: "trigger_1", target: "crm_1", sourceHandle: "output", targetHandle: "input" },
    { id: "e2", source: "crm_1", target: "crm_2", sourceHandle: "output", targetHandle: "input" },
    { id: "e3", source: "crm_2", target: "email_1", sourceHandle: "output", targetHandle: "input" },
    { id: "e4", source: "email_1", target: "ac_1", sourceHandle: "output", targetHandle: "input" },
    { id: "e5", source: "ac_1", target: "ac_2", sourceHandle: "output", targetHandle: "input" }
  ],
  triggers: [{ type: "trigger_booking_created" }]
})

updateWorkflowStatus({ sessionId: "<session>", workflowId: "workflowId_confirm", status: "active" })
```

**Workflow 2: Appointment Reminder**

```
createWorkflow({ sessionId: "<session>", name: "PhysioFirst: Appointment Reminder", description: "Daily 9 AM job: queries tomorrow's bookings and sends email + SMS reminders" })
// Returns: workflowId_reminder

saveWorkflow({
  sessionId: "<session>",
  workflowId: "workflowId_reminder",
  name: "PhysioFirst: Appointment Reminder",
  nodes: [
    {
      id: "trigger_1", type: "trigger_schedule", position: { x: 0, y: 200 },
      config: { cronExpression: "0 9 * * *", timezone: "America/New_York" },
      status: "active", label: "Daily 9 AM ET"
    },
    {
      id: "code_1", type: "code_block", position: { x: 300, y: 200 },
      config: {
        code: "const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1); const startOfDay = new Date(tomorrow.setHours(0,0,0,0)).getTime(); const endOfDay = new Date(tomorrow.setHours(23,59,59,999)).getTime(); const bookings = await ctx.query('bookings', { filter: { dateTime: { $gte: startOfDay, $lte: endOfDay }, status: 'confirmed' } }); return { bookings };"
      },
      status: "ready", label: "Query Tomorrow's Bookings"
    },
    {
      id: "loop_1", type: "loop_iterator", position: { x: 600, y: 200 },
      config: { arrayField: "bookings", maxIterations: 100 },
      status: "ready", label: "For Each Booking"
    },
    {
      id: "email_1", type: "lc_email", position: { x: 900, y: 100 },
      config: {
        action: "send-confirmation-email",
        to: "{{item.primaryAttendee.email}}",
        subject: "Reminder: Your {{item.serviceName}} is tomorrow at {{item.timeFormatted}}",
        body: "Hi {{item.primaryAttendee.firstName}},\n\nFriendly reminder about your appointment tomorrow:\n\nService: {{item.serviceName}}\nDate: {{item.dateFormatted}}\nTime: {{item.timeFormatted}}\nTherapist: {{item.staffName}}\nLocation: 123 Health Avenue, Suite 200, New York, NY 10001\n\nReminders:\n- Arrive 10 minutes early\n- Wear comfortable clothing\n- Bring your insurance card\n\nNeed to reschedule? Call (555) 123-4567 or reply to this email.\n\nPhysioFirst Clinic"
      },
      status: "ready", label: "Send Reminder Email"
    },
    {
      id: "sms_1", type: "lc_sms", position: { x: 900, y: 300 },
      config: {
        to: "{{item.primaryAttendee.phone}}",
        body: "PhysioFirst Reminder: Your {{item.serviceName}} is tomorrow at {{item.timeFormatted}}. 123 Health Ave, Suite 200. Need to reschedule? Call (555) 123-4567"
      },
      status: "ready", label: "Send Reminder SMS"
    }
  ],
  edges: [
    { id: "e1", source: "trigger_1", target: "code_1", sourceHandle: "output", targetHandle: "input" },
    { id: "e2", source: "code_1", target: "loop_1", sourceHandle: "output", targetHandle: "input" },
    { id: "e3", source: "loop_1", target: "email_1", sourceHandle: "each_item", targetHandle: "input" },
    { id: "e4", source: "loop_1", target: "sms_1", sourceHandle: "each_item", targetHandle: "input" }
  ],
  triggers: [{ type: "trigger_schedule", config: { cronExpression: "0 9 * * *", timezone: "America/New_York" } }]
})

updateWorkflowStatus({ sessionId: "<session>", workflowId: "workflowId_reminder", status: "active" })
```

**Workflow 3: Post-Appointment Follow-Up**

```
createWorkflow({ sessionId: "<session>", name: "PhysioFirst: Post-Appointment Follow-Up", description: "After appointment ends: thank you, check-in, review request, rebooking prompt" })
// Returns: workflowId_postappt

saveWorkflow({
  sessionId: "<session>",
  workflowId: "workflowId_postappt",
  name: "PhysioFirst: Post-Appointment Follow-Up",
  nodes: [
    {
      id: "trigger_1", type: "trigger_booking_created", position: { x: 0, y: 200 },
      config: {}, status: "active", label: "Booking Created"
    },
    {
      id: "wait_1", type: "wait_delay", position: { x: 250, y: 200 },
      config: { duration: "{{booking.duration + 60}}", unit: "minutes" },
      status: "ready", label: "Wait: Appointment End + 1h"
    },
    {
      id: "crm_1", type: "lc_crm", position: { x: 500, y: 200 },
      config: { action: "move-pipeline-stage", pipelineStageId: "completed" },
      status: "ready", label: "Move to Completed"
    },
    {
      id: "email_1", type: "lc_email", position: { x: 750, y: 200 },
      config: {
        action: "send-confirmation-email",
        to: "{{booking.primaryAttendee.email}}",
        subject: "Thank you for visiting PhysioFirst, {{booking.primaryAttendee.firstName}}!",
        body: "Hi {{booking.primaryAttendee.firstName}},\n\nThank you for your {{booking.serviceName}} today with {{booking.staffName}}.\n\nWe hope everything met your expectations. Here is a summary:\n\nService: {{booking.serviceName}}\nDate: {{booking.dateFormatted}}\nTherapist: {{booking.staffName}}\n\nIf you have any questions about your session or exercises, don't hesitate to reach out.\n\nWe'd love to hear about your experience: {{feedbackFormUrl}}\n\nTo schedule your next appointment: {{bookingPageUrl}}\n\nBest regards,\nPhysioFirst Clinic\n(555) 123-4567"
      },
      status: "ready", label: "Thank You Email + Feedback Link"
    },
    {
      id: "wait_2", type: "wait_delay", position: { x: 1000, y: 200 },
      config: { duration: 1, unit: "days" },
      status: "ready", label: "Wait 1 Day"
    },
    {
      id: "email_2", type: "lc_email", position: { x: 1250, y: 200 },
      config: {
        action: "send-confirmation-email",
        to: "{{booking.primaryAttendee.email}}",
        subject: "How are you feeling after your {{booking.serviceName}}?",
        body: "Hi {{booking.primaryAttendee.firstName}},\n\nJust checking in after your {{booking.serviceName}} yesterday.\n\nIt's normal to experience some mild soreness after treatment. If you have any concerns or questions about your recovery, we're here to help.\n\nRemember to follow the exercises {{booking.staffName}} showed you -- consistency is key!\n\nPhysioFirst Clinic\n(555) 123-4567"
      },
      status: "ready", label: "Day-After Check-In"
    },
    {
      id: "wait_3", type: "wait_delay", position: { x: 1500, y: 200 },
      config: { duration: 2, unit: "days" },
      status: "ready", label: "Wait 2 More Days (Day 3 Total)"
    },
    {
      id: "email_3", type: "lc_email", position: { x: 1750, y: 200 },
      config: {
        action: "send-confirmation-email",
        to: "{{booking.primaryAttendee.email}}",
        subject: "Recovery tip from PhysioFirst",
        body: "Hi {{booking.primaryAttendee.firstName}},\n\nHere's a quick recovery tip based on your {{booking.serviceName}}:\n\n[Dynamic content: stretching guide / exercise PDF / recovery tips relevant to service type]\n\nConsistency with your home exercises makes a big difference between sessions.\n\nQuestions? Reply to this email or call (555) 123-4567.\n\nPhysioFirst Clinic"
      },
      status: "ready", label: "Recovery Resource (Day 3)"
    },
    {
      id: "wait_4", type: "wait_delay", position: { x: 2000, y: 200 },
      config: { duration: 4, unit: "days" },
      status: "ready", label: "Wait 4 More Days (Day 7 Total)"
    },
    {
      id: "email_4", type: "lc_email", position: { x: 2250, y: 200 },
      config: {
        action: "send-confirmation-email",
        to: "{{booking.primaryAttendee.email}}",
        subject: "Could you leave us a review, {{booking.primaryAttendee.firstName}}?",
        body: "Hi {{booking.primaryAttendee.firstName}},\n\nIt's been a week since your {{booking.serviceName}}. We hope you're feeling better!\n\nIf you had a positive experience, we'd be grateful if you could leave a quick review:\n\nGoogle: {{googleReviewLink}}\nYelp: {{yelpReviewLink}}\n\nYour feedback helps other people in pain find the care they need.\n\nThank you!\nPhysioFirst Clinic"
      },
      status: "ready", label: "Review Request (Day 7)"
    },
    {
      id: "wait_5", type: "wait_delay", position: { x: 2500, y: 200 },
      config: { duration: 7, unit: "days" },
      status: "ready", label: "Wait 7 More Days (Day 14 Total)"
    },
    {
      id: "email_5", type: "lc_email", position: { x: 2750, y: 200 },
      config: {
        action: "send-confirmation-email",
        to: "{{booking.primaryAttendee.email}}",
        subject: "Time for your next appointment at PhysioFirst?",
        body: "Hi {{booking.primaryAttendee.firstName}},\n\nIt's been two weeks since your last {{booking.serviceName}}. For optimal recovery, we recommend scheduling your next session.\n\nBook your next appointment: {{bookingPageUrl}}\n\nOr call us at (555) 123-4567 to schedule.\n\nPhysioFirst Clinic"
      },
      status: "ready", label: "Rebooking Prompt (Day 14)"
    },
    {
      id: "crm_2", type: "lc_crm", position: { x: 3000, y: 200 },
      config: { action: "move-pipeline-stage", pipelineStageId: "follow_up" },
      status: "ready", label: "Move to Follow-Up Stage"
    }
  ],
  edges: [
    { id: "e1", source: "trigger_1", target: "wait_1", sourceHandle: "output", targetHandle: "input" },
    { id: "e2", source: "wait_1", target: "crm_1", sourceHandle: "output", targetHandle: "input" },
    { id: "e3", source: "crm_1", target: "email_1", sourceHandle: "output", targetHandle: "input" },
    { id: "e4", source: "email_1", target: "wait_2", sourceHandle: "output", targetHandle: "input" },
    { id: "e5", source: "wait_2", target: "email_2", sourceHandle: "output", targetHandle: "input" },
    { id: "e6", source: "email_2", target: "wait_3", sourceHandle: "output", targetHandle: "input" },
    { id: "e7", source: "wait_3", target: "email_3", sourceHandle: "output", targetHandle: "input" },
    { id: "e8", source: "email_3", target: "wait_4", sourceHandle: "output", targetHandle: "input" },
    { id: "e9", source: "wait_4", target: "email_4", sourceHandle: "output", targetHandle: "input" },
    { id: "e10", source: "email_4", target: "wait_5", sourceHandle: "output", targetHandle: "input" },
    { id: "e11", source: "wait_5", target: "email_5", sourceHandle: "output", targetHandle: "input" },
    { id: "e12", source: "email_5", target: "crm_2", sourceHandle: "output", targetHandle: "input" }
  ],
  triggers: [{ type: "trigger_booking_created" }]
})

updateWorkflowStatus({ sessionId: "<session>", workflowId: "workflowId_postappt", status: "active" })
```

**Workflow 4: No-Show Handler**

```
createWorkflow({ sessionId: "<session>", name: "PhysioFirst: No-Show Handler", description: "Detects no-show stage, sends reschedule offer, follows up with value reminder" })
// Returns: workflowId_noshow

saveWorkflow({
  sessionId: "<session>",
  workflowId: "workflowId_noshow",
  name: "PhysioFirst: No-Show Handler",
  nodes: [
    {
      id: "trigger_1", type: "trigger_contact_updated", position: { x: 0, y: 200 },
      config: {}, status: "active", label: "Contact Updated"
    },
    {
      id: "if_1", type: "if_then", position: { x: 300, y: 200 },
      config: { expression: "contact.pipelineStageId === 'no_show'" },
      status: "ready", label: "Is No-Show?"
    },
    {
      id: "crm_1", type: "lc_crm", position: { x: 600, y: 300 },
      config: { action: "update-contact", tags: ["no_show", "needs_reschedule"] },
      status: "ready", label: "Tag: No-Show"
    },
    {
      id: "email_1", type: "lc_email", position: { x: 600, y: 100 },
      config: {
        action: "send-confirmation-email",
        to: "{{contact.email}}",
        subject: "We missed you today, {{contact.firstName}}",
        body: "Hi {{contact.firstName}},\n\nWe noticed you weren't able to make your appointment today. No worries -- life happens!\n\nWe'd love to get you rescheduled at a time that works better for you:\n{{bookingPageUrl}}\n\nIf you have any questions, just reply to this email or call us at (555) 123-4567.\n\nPhysioFirst Clinic"
      },
      status: "ready", label: "Reschedule Offer Email"
    },
    {
      id: "wait_1", type: "wait_delay", position: { x: 900, y: 100 },
      config: { duration: 2, unit: "days" },
      status: "ready", label: "Wait 2 Days"
    },
    {
      id: "email_2", type: "lc_email", position: { x: 1200, y: 100 },
      config: {
        action: "send-confirmation-email",
        to: "{{contact.email}}",
        subject: "Your recovery matters, {{contact.firstName}}",
        body: "Hi {{contact.firstName}},\n\nJust a gentle follow-up. Your {{contact.customFields.preferredService}} can help with:\n\n- Reducing pain and improving mobility\n- Preventing further injury\n- Getting you back to full activity faster\n\nMany of our patients see significant improvement after just one session. Don't let discomfort wait!\n\nRebook here: {{bookingPageUrl}}\n\nOr call (555) 123-4567 -- we'll find a time that works for you.\n\nPhysioFirst Clinic"
      },
      status: "ready", label: "Value Reminder + Rebooking Link"
    }
  ],
  edges: [
    { id: "e1", source: "trigger_1", target: "if_1", sourceHandle: "output", targetHandle: "input" },
    { id: "e2", source: "if_1", target: "email_1", sourceHandle: "true", targetHandle: "input", label: "Is No-Show" },
    { id: "e3", source: "if_1", target: "crm_1", sourceHandle: "true", targetHandle: "input", label: "Tag Contact" },
    { id: "e4", source: "email_1", target: "wait_1", sourceHandle: "output", targetHandle: "input" },
    { id: "e5", source: "wait_1", target: "email_2", sourceHandle: "output", targetHandle: "input" }
  ],
  triggers: [{ type: "trigger_contact_updated" }]
})

updateWorkflowStatus({ sessionId: "<session>", workflowId: "workflowId_noshow", status: "active" })
```

**Workflow 5: Payment Processing**

```
createWorkflow({ sessionId: "<session>", name: "PhysioFirst: Payment Processing", description: "Generates invoice and sends receipt on payment" })
// Returns: workflowId_payment

saveWorkflow({
  sessionId: "<session>",
  workflowId: "workflowId_payment",
  name: "PhysioFirst: Payment Processing",
  nodes: [
    {
      id: "trigger_1", type: "trigger_payment_received", position: { x: 0, y: 200 },
      config: { paymentProvider: "any" },
      status: "active", label: "Payment Received"
    },
    {
      id: "invoice_1", type: "lc_invoicing", position: { x: 300, y: 200 },
      config: {
        action: "generate-invoice",
        invoiceType: "b2c_single",
        lineItems: [{
          description: "{{payment.productName}}",
          quantity: 1,
          unitPrice: "{{payment.amount}}",
          currency: "USD"
        }],
        paymentTerms: "due_on_receipt"
      },
      status: "ready", label: "Generate Invoice"
    },
    {
      id: "email_1", type: "lc_email", position: { x: 600, y: 200 },
      config: {
        action: "send-confirmation-email",
        to: "{{payment.customerEmail}}",
        subject: "Receipt: {{payment.productName}} - PhysioFirst Clinic",
        body: "Hi {{payment.customerFirstName}},\n\nThank you for your payment. Here is your receipt:\n\nService: {{payment.productName}}\nAmount: {{payment.amountFormatted}}\nDate: {{payment.dateFormatted}}\nInvoice: {{invoiceUrl}}\n\nYour appointment details have been sent in a separate confirmation email.\n\nPhysioFirst Clinic\n(555) 123-4567"
      },
      status: "ready", label: "Send Receipt Email"
    }
  ],
  edges: [
    { id: "e1", source: "trigger_1", target: "invoice_1", sourceHandle: "output", targetHandle: "input" },
    { id: "e2", source: "invoice_1", target: "email_1", sourceHandle: "output", targetHandle: "input" }
  ],
  triggers: [{ type: "trigger_payment_received", config: { paymentProvider: "any" } }]
})

updateWorkflowStatus({ sessionId: "<session>", workflowId: "workflowId_payment", status: "active" })
```

### Step 7: Create Sequences

**Sequence 1: Post-Appointment Follow-Up (nachher)**

```
type: "automation_sequence"
subtype: "nachher"
name: "PhysioFirst: Post-Appointment Follow-Up"

triggerEvent: "booking_completed"

steps: [
  {
    channel: "email",
    timing: { offset: 1, unit: "hours", referencePoint: "booking_end" },
    content: {
      subject: "Thank you for visiting PhysioFirst, {{firstName}}!",
      body: "Thank you + session summary + feedback form link"
    }
  },
  {
    channel: "email",
    timing: { offset: 1, unit: "days", referencePoint: "booking_end" },
    content: {
      subject: "How are you feeling after your {{serviceName}}?",
      body: "Check-in + exercise reminder"
    }
  },
  {
    channel: "email",
    timing: { offset: 3, unit: "days", referencePoint: "booking_end" },
    content: {
      subject: "Recovery tip from PhysioFirst",
      body: "Additional resource / stretching guide"
    }
  },
  {
    channel: "email",
    timing: { offset: 7, unit: "days", referencePoint: "booking_end" },
    content: {
      subject: "Could you leave us a review?",
      body: "Review request with Google/Yelp links"
    }
  },
  {
    channel: "email",
    timing: { offset: 14, unit: "days", referencePoint: "booking_end" },
    content: {
      subject: "Time for your next appointment?",
      body: "Rebooking prompt with direct booking link"
    }
  },
  {
    channel: "email",
    timing: { offset: 30, unit: "days", referencePoint: "booking_end" },
    content: {
      subject: "We haven't seen you in a while, {{firstName}}",
      body: "Re-engagement + seasonal promotion or maintenance visit suggestion"
    }
  }
]
```

**Sequence 2: No-Show Recovery (lifecycle)**

```
type: "automation_sequence"
subtype: "lifecycle"
name: "PhysioFirst: No-Show Recovery"

triggerEvent: "pipeline_stage_changed"  // to "no_show"

steps: [
  {
    channel: "email",
    timing: { offset: 0, unit: "hours", referencePoint: "trigger_event" },
    content: {
      subject: "We missed you today, {{firstName}}",
      body: "Reschedule offer + booking link"
    }
  },
  {
    channel: "sms",
    timing: { offset: 4, unit: "hours", referencePoint: "trigger_event" },
    content: {
      body: "Hi {{firstName}}, we missed you at PhysioFirst today. Reschedule easily: {{bookingPageUrl}}"
    }
  },
  {
    channel: "email",
    timing: { offset: 2, unit: "days", referencePoint: "trigger_event" },
    content: {
      subject: "Your recovery matters, {{firstName}}",
      body: "Value reminder + benefits + rebooking link"
    }
  },
  {
    channel: "email",
    timing: { offset: 7, unit: "days", referencePoint: "trigger_event" },
    content: {
      subject: "Special offer: Get back on track",
      body: "Optional incentive (e.g., free consultation add-on) + rebooking link"
    }
  }
]
```

**Sequence 3: Pre-Appointment Reminder (vorher)**

```
type: "automation_sequence"
subtype: "vorher"
name: "PhysioFirst: Pre-Appointment Reminders"

triggerEvent: "booking_confirmed"

steps: [
  {
    channel: "email",
    timing: { offset: -1, unit: "days", referencePoint: "booking_start" },
    content: {
      subject: "Reminder: Your {{serviceName}} is tomorrow",
      body: "Full appointment details + preparation + reschedule option"
    }
  },
  {
    channel: "sms",
    timing: { offset: -2, unit: "hours", referencePoint: "booking_start" },
    content: {
      body: "PhysioFirst: Your {{serviceName}} is in 2 hours at 123 Health Ave. See you soon!"
    }
  }
]
```

### Step 8: Link Objects

```
// Link products to intake form
createObjectLink({ sourceObjectId: "productId_consult", targetObjectId: "formId_intake", linkType: "product_form" })
createObjectLink({ sourceObjectId: "productId_followup", targetObjectId: "formId_intake", linkType: "product_form" })
createObjectLink({ sourceObjectId: "productId_massage", targetObjectId: "formId_intake", linkType: "product_form" })

// Link workflows to form
createObjectLink({ sourceObjectId: "workflowId_confirm", targetObjectId: "formId_intake", linkType: "workflow_form" })

// Link workflows to sequences
createObjectLink({ sourceObjectId: "workflowId_postappt", targetObjectId: "sequenceId_postappt", linkType: "workflow_sequence" })
createObjectLink({ sourceObjectId: "workflowId_noshow", targetObjectId: "sequenceId_noshow", linkType: "workflow_sequence" })
createObjectLink({ sourceObjectId: "workflowId_reminder", targetObjectId: "sequenceId_vorher", linkType: "workflow_sequence" })
```

### Deployment Summary

| Object Type | Count | Names |
|-------------|-------|-------|
| Products (digital) | 3 | Initial Consultation, Follow-Up Session, Sports Massage |
| Bookable Resources (staff) | 2 | Dr. Sarah Chen, Dr. Mike Torres |
| Bookable Resources (room) | 2 | Treatment Room A, Treatment Room B |
| Bookable Services | 3 | Initial Consultation Service, Follow-Up Session Service, Sports Massage Service |
| Forms (registration) | 1 | PhysioFirst Booking Intake Form (17 fields) |
| CRM Pipeline | 1 | Bookings: PhysioFirst Clinic (8 stages) |
| Workflows | 5 | Booking Confirmation, Appointment Reminder, Post-Appointment, No-Show, Payment |
| Sequences | 3 | Post-Appointment (6 steps), No-Show Recovery (4 steps), Pre-Appointment (2 steps) |
| Object Links | 6 | 3x product_form, 1x workflow_form, 3x workflow_sequence |
| Builder Pages | 3 | booking-page, confirmation-page, service-menu |
| Total Workflow Nodes | 28 | Across all 5 workflows |
| Total Workflow Edges | 24 | Every connection specified with sourceHandle/targetHandle |
