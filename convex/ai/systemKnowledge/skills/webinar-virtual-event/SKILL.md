# Skill: Webinar / Virtual Event

> References: `_SHARED.md` for all ontology definitions, mutation signatures, node types, and link types.

---

## 1. Purpose

This skill builds a complete webinar and virtual event deployment for an agency's client. The deployment captures registrations through a landing page with an embedded form, creates CRM contacts with pipeline tracking, sends confirmation emails with calendar invite links, syncs registrants to ActiveCampaign, runs a multi-touch pre-webinar reminder sequence (email and SMS), tracks attendance via webhook, branches post-webinar follow-up into attended and no-show paths with tailored replay and offer emails, and moves contacts through a conversion pipeline that ends in a purchase or consultation booking. The canonical four-layer `BusinessLayer` model applies: `Business L1` (platform) provides infrastructure, `Business L2` (agency) configures and deploys for the client presenter/host at `Business L3`, and registrants who attend or watch the replay are `Business L4` end-customers.

---

## 2. Ontologies Involved

### Objects (`objects` table)

| type | subtype | customProperties used |
|------|---------|----------------------|
| `crm_contact` | `lead` | `firstName`, `lastName`, `email`, `phone`, `companyName`, `contactType`, `tags`, `pipelineStageId`, `pipelineDealValue`, `customFields` (includes `webinarAttended: boolean`, `registrationSource: string`, `offerClicked: boolean`) |
| `form` | `registration` | `fields` (array of field objects), `formSettings` (redirect URL, notifications, submissionBehavior), `displayMode`, `submissionWorkflow` |
| `layer_workflow` | `workflow` | Full `LayerWorkflowData`: `nodes`, `edges`, `metadata`, `triggers` |
| `automation_sequence` | `vorher` | Steps array with `channel`, `timing`, `content` -- pre-webinar reminders |
| `automation_sequence` | `nachher` | Steps array with `channel`, `timing`, `content` -- post-webinar attended follow-up |
| `automation_sequence` | `nachher` | Steps array with `channel`, `timing`, `content` -- post-webinar no-show follow-up |
| `builder_app` | `template_based` | Webinar registration page and thank-you/confirmation page files |
| `project` | `campaign` | `projectCode`, `description`, `status`, `startDate`, `endDate`, `budget` |

### Object Links (`objectLinks` table)

| linkType | sourceObjectId | targetObjectId |
|----------|---------------|----------------|
| `workflow_form` | workflow (webinar registration) | form (registration) |
| `workflow_sequence` | workflow (webinar registration) | sequence (pre-webinar vorher) |
| `workflow_sequence` | workflow (post-webinar attended) | sequence (post-attended nachher) |
| `workflow_sequence` | workflow (post-webinar no-show) | sequence (post-noshow nachher) |
| `project_contact` | project | CRM contact (client stakeholder / webinar host) |

---

## 3. Builder Components

### 3.1 Webinar Registration Page (`/builder/webinar-registration-page`)

The Builder generates a single-page registration page (`builder_app`, subtype: `template_based`) with these sections:

1. **Hero Section** -- Webinar title as H1, subtitle with the transformation promise ("Learn how to [desired outcome] in [timeframe]"), date and time with timezone, speaker headshot and name, primary CTA button ("Reserve Your Seat").
2. **What You Will Learn Section** -- 3-5 bullet points describing key takeaways from the webinar. Each bullet is a benefit statement, not a feature.
3. **Speaker Bio Section** -- Speaker photo (larger), name, title, company, 2-3 sentence bio establishing credibility, optional social links.
4. **Form Embed Section** -- Embedded registration form (see Form below). The form renders inline on the page below the speaker section.
5. **Social Proof Section** -- Testimonial quotes from past webinar attendees or coaching clients (2-3 quotes), attendee count ("500+ business owners have attended"), trust badges or media logos.
6. **FAQ Section** -- Accordion with 4-5 common questions: "Is this live?", "Will there be a replay?", "How long is the webinar?", "Is there a cost?", "What if I can't make it live?"
7. **Footer** -- Privacy policy link, agency/host branding, support email.

**File:** `/builder/webinar-registration-page/index.html`

### 3.2 Thank-You / Confirmation Page (`/builder/confirmation-page`)

Displayed after form submission (configured via `formSettings.redirectUrl`):

1. **Confirmation Message** -- "You're Registered! Check your inbox for the details."
2. **Webinar Details Card** -- Title, date, time, timezone, join link placeholder ("Link will be emailed to you 1 hour before the webinar").
3. **Add to Calendar Buttons** -- Google Calendar, Apple Calendar (.ics download), Outlook links with event title, date, time, and join URL pre-filled.
4. **Share Section** -- "Know someone who would benefit? Share this webinar:" with social sharing buttons (Twitter, LinkedIn, Facebook, email).
5. **Next Step CTA** -- Optional secondary offer: "While you wait, check out [free resource / blog post / community link]."

**File:** `/builder/confirmation-page/index.html`

### 3.3 Registration Form

**Object:** `type: "form"`, `subtype: "registration"`

**Fields array:**

```json
[
  { "type": "text",     "label": "First Name",    "required": true,  "placeholder": "Jane" },
  { "type": "text",     "label": "Last Name",     "required": true,  "placeholder": "Smith" },
  { "type": "email",    "label": "Email Address",  "required": true,  "placeholder": "you@company.com" },
  { "type": "phone",    "label": "Phone Number",   "required": false, "placeholder": "+1 (555) 000-0000" },
  { "type": "text",     "label": "Company Name",   "required": false, "placeholder": "Acme Corp" },
  { "type": "select",   "label": "Biggest Challenge", "required": true,
    "options": ["Getting more clients", "Raising my prices", "Time management", "Scaling my team", "Other"] }
]
```

**formSettings:**

```json
{
  "redirectUrl": "/confirmation",
  "notifications": { "adminEmail": true, "respondentEmail": true },
  "submissionBehavior": "redirect"
}
```

> **Customization note:** The "Biggest Challenge" select field is the qualifying question. Its label and options MUST be adapted to the webinar topic and the host's target audience. See Section 8.

---

## 4. Layers Automations

### 4.1 Workflow 1 -- Webinar Registration (Required)

**Object:** `type: "layer_workflow"`, `subtype: "workflow"`, `name: "Webinar Registration Workflow"`

**Trigger:** `trigger_form_submitted`

**Nodes:**

| id | type | label | position | config | status |
|----|------|-------|----------|--------|--------|
| `trigger-1` | `trigger_form_submitted` | "Registration Form Submitted" | { x: 100, y: 250 } | `{ "formId": "<FORM_ID>" }` | `ready` |
| `crm-1` | `lc_crm` | "Create Registrant Contact" | { x: 350, y: 250 } | `{ "action": "create-contact", "contactType": "lead", "tags": ["webinar-registrant", "<WEBINAR_TAG>"], "mapFields": { "email": "{{trigger.email}}", "firstName": "{{trigger.firstName}}", "lastName": "{{trigger.lastName}}", "phone": "{{trigger.phone}}", "companyName": "{{trigger.companyName}}", "customFields": { "biggestChallenge": "{{trigger.biggestChallenge}}", "webinarAttended": false, "registrationSource": "webinar-landing-page" } } }` | `ready` |
| `crm-2` | `lc_crm` | "Move to Registered" | { x: 600, y: 100 } | `{ "action": "move-pipeline-stage", "contactId": "{{crm-1.output.contactId}}", "pipelineStageId": "registered" }` | `ready` |
| `email-1` | `lc_email` | "Send Confirmation Email" | { x: 600, y: 250 } | `{ "action": "send-confirmation-email", "to": "{{crm-1.output.email}}", "subject": "You're registered for {{webinarTitle}}!", "body": "Hi {{crm-1.output.firstName}},\n\nYou're confirmed for:\n\n{{webinarTitle}}\nDate: {{webinarDate}}\nTime: {{webinarTime}} {{webinarTimezone}}\n\nAdd to your calendar: {{calendarLink}}\n\nYour join link will arrive 1 hour before we go live.\n\nSee you there,\n{{speakerName}}" }` | `ready` |
| `ac-1` | `activecampaign` | "Sync to ActiveCampaign" | { x: 600, y: 400 } | `{ "action": "add_contact", "email": "{{crm-1.output.email}}", "firstName": "{{crm-1.output.firstName}}", "lastName": "{{crm-1.output.lastName}}" }` | `ready` |
| `ac-2` | `activecampaign` | "Tag Registrant" | { x: 850, y: 400 } | `{ "action": "add_tag", "contactEmail": "{{crm-1.output.email}}", "tag": "webinar-registered-<WEBINAR_TAG>" }` | `ready` |
| `ac-3` | `activecampaign` | "Add to Webinar List" | { x: 1100, y: 400 } | `{ "action": "add_to_list", "contactEmail": "{{crm-1.output.email}}", "listId": "<AC_WEBINAR_LIST_ID>" }` | `ready` |

**Edges:**

| id | source | target | sourceHandle | targetHandle |
|----|--------|--------|-------------|-------------|
| `e-1` | `trigger-1` | `crm-1` | `output` | `input` |
| `e-2` | `crm-1` | `crm-2` | `output` | `input` |
| `e-3` | `crm-1` | `email-1` | `output` | `input` |
| `e-4` | `crm-1` | `ac-1` | `output` | `input` |
| `e-5` | `ac-1` | `ac-2` | `output` | `input` |
| `e-6` | `ac-2` | `ac-3` | `output` | `input` |

**Mutations to execute:**

1. `createWorkflow({ sessionId, name: "Webinar Registration Workflow", description: "Captures webinar registrations, creates CRM contacts, sends confirmation with calendar link, syncs to ActiveCampaign" })`
2. `saveWorkflow({ sessionId, workflowId: <ID>, name: "Webinar Registration Workflow", nodes: [...], edges: [...], triggers: [{ type: "trigger_form_submitted", config: { formId: "<FORM_ID>" } }] })`
3. `updateWorkflowStatus({ sessionId, workflowId: <ID>, status: "active" })`

---

### 4.2 Workflow 2 -- Webinar Reminder (Required)

**Object:** `type: "layer_workflow"`, `subtype: "workflow"`, `name: "Webinar Reminder Workflow"`

**Trigger:** `trigger_schedule` (cron-based, fires at specific times before the webinar)

This workflow uses `wait_delay` nodes to space out reminders relative to a scheduled trigger that fires 7 days before the webinar. An alternative approach is to use a `vorher` sequence (see Section 4.5) with `referencePoint: "booking_start"`. Both patterns are valid; this workflow version gives finer control over branching logic.

**Nodes:**

| id | type | label | position | config | status |
|----|------|-------|----------|--------|--------|
| `trigger-1` | `trigger_schedule` | "7 Days Before Webinar" | { x: 100, y: 250 } | `{ "cronExpression": "0 9 <7_DAYS_BEFORE_DAY> <MONTH> *", "timezone": "{{webinarTimezone}}" }` | `ready` |
| `email-1` | `lc_email` | "7-Day Reminder Email" | { x: 350, y: 250 } | `{ "action": "send-confirmation-email", "to": "{{contact.email}}", "subject": "{{webinarTitle}} is in 7 days!", "body": "Hi {{contact.firstName}},\n\nJust a quick reminder -- {{webinarTitle}} is happening in one week!\n\nDate: {{webinarDate}}\nTime: {{webinarTime}} {{webinarTimezone}}\n\nHere's what we'll cover:\n- {{takeaway1}}\n- {{takeaway2}}\n- {{takeaway3}}\n\nMake sure it's on your calendar: {{calendarLink}}\n\nSee you there,\n{{speakerName}}" }` | `ready` |
| `wait-1` | `wait_delay` | "Wait 5 Days" | { x: 600, y: 250 } | `{ "duration": 5, "unit": "days" }` | `ready` |
| `email-2` | `lc_email` | "1-Day Reminder Email" | { x: 850, y: 250 } | `{ "action": "send-confirmation-email", "to": "{{contact.email}}", "subject": "Tomorrow: {{webinarTitle}} -- don't miss it", "body": "Hi {{contact.firstName}},\n\n{{webinarTitle}} is TOMORROW.\n\nDate: {{webinarDate}}\nTime: {{webinarTime}} {{webinarTimezone}}\n\nI'll be sharing the exact strategies I used to {{keyResult}}. This is going to be a packed session.\n\nYour join link will arrive 1 hour before we go live.\n\nSee you tomorrow,\n{{speakerName}}" }` | `ready` |
| `wait-2` | `wait_delay` | "Wait 23 Hours" | { x: 1100, y: 250 } | `{ "duration": 23, "unit": "hours" }` | `ready` |
| `email-3` | `lc_email` | "1-Hour Reminder Email" | { x: 1350, y: 150 } | `{ "action": "send-confirmation-email", "to": "{{contact.email}}", "subject": "We're live in 60 minutes -- here's your link", "body": "Hi {{contact.firstName}},\n\n{{webinarTitle}} starts in 1 hour.\n\nJoin here: {{joinLink}}\n\nGrab a notebook and a coffee -- this is going to be good.\n\nSee you inside,\n{{speakerName}}" }` | `ready` |
| `sms-1` | `lc_sms` | "1-Hour SMS Reminder" | { x: 1350, y: 350 } | `{ "to": "{{contact.phone}}", "body": "{{speakerName}} here. {{webinarTitle}} starts in 1 hour. Join: {{joinLink}}" }` | `ready` |

**Edges:**

| id | source | target | sourceHandle | targetHandle |
|----|--------|--------|-------------|-------------|
| `e-1` | `trigger-1` | `email-1` | `output` | `input` |
| `e-2` | `email-1` | `wait-1` | `output` | `input` |
| `e-3` | `wait-1` | `email-2` | `output` | `input` |
| `e-4` | `email-2` | `wait-2` | `output` | `input` |
| `e-5` | `wait-2` | `email-3` | `output` | `input` |
| `e-6` | `wait-2` | `sms-1` | `output` | `input` |

**Mutations to execute:**

1. `createWorkflow({ sessionId, name: "Webinar Reminder Workflow", description: "Sends 7-day, 1-day, and 1-hour reminders via email and SMS" })`
2. `saveWorkflow({ sessionId, workflowId: <ID>, name: "Webinar Reminder Workflow", nodes: [...], edges: [...], triggers: [{ type: "trigger_schedule", config: { cronExpression: "0 9 <7_DAYS_BEFORE_DAY> <MONTH> *", timezone: "{{webinarTimezone}}" } }] })`
3. `updateWorkflowStatus({ sessionId, workflowId: <ID>, status: "active" })`

---

### 4.3 Workflow 3 -- Post-Webinar Attended (Required)

**Object:** `type: "layer_workflow"`, `subtype: "workflow"`, `name: "Post-Webinar Attended Workflow"`

**Trigger:** `trigger_webhook` (called by the webinar platform or manually after the event to process attendees)

This workflow processes contacts who DID attend the webinar. The webhook payload includes `{ contactId, attended: true }`. In practice, the host exports the attendee list and triggers this webhook per contact, or uses the `trigger_manual` with a batch of contact IDs.

**Nodes:**

| id | type | label | position | config | status |
|----|------|-------|----------|--------|--------|
| `trigger-1` | `trigger_webhook` | "Attendance Webhook" | { x: 100, y: 300 } | `{ "path": "/webinar-attendance", "secret": "{{attendance_webhook_secret}}" }` | `ready` |
| `if-1` | `if_then` | "Did Attend?" | { x: 350, y: 300 } | `{ "expression": "{{trigger.attended}} === true" }` | `ready` |
| `crm-1` | `lc_crm` | "Update: Attended" | { x: 600, y: 100 } | `{ "action": "update-contact", "contactId": "{{trigger.contactId}}", "customFields": { "webinarAttended": true } }` | `ready` |
| `crm-2` | `lc_crm` | "Move to Attended" | { x: 850, y: 100 } | `{ "action": "move-pipeline-stage", "contactId": "{{trigger.contactId}}", "pipelineStageId": "attended" }` | `ready` |
| `email-1` | `lc_email` | "Replay + Offer Email" | { x: 1100, y: 100 } | `{ "action": "send-confirmation-email", "to": "{{contact.email}}", "subject": "Replay + special offer from {{webinarTitle}}", "body": "Hi {{contact.firstName}},\n\nThank you for attending {{webinarTitle}}!\n\nAs promised, here's the replay: {{replayLink}}\n\nDuring the webinar, I mentioned {{offerName}}. As a thank-you for showing up live, you get an exclusive discount:\n\n{{offerDescription}}\nRegular price: {{regularPrice}}\nYour price: {{discountPrice}}\nOffer expires: {{offerDeadline}}\n\n{{offerCTALink}}\n\nIf you have questions, just reply to this email.\n\n{{speakerName}}" }` | `ready` |
| `ac-1` | `activecampaign` | "Tag: Attended" | { x: 1350, y: 100 } | `{ "action": "add_tag", "contactEmail": "{{contact.email}}", "tag": "webinar-attended-<WEBINAR_TAG>" }` | `ready` |
| `crm-3` | `lc_crm` | "Update: No-Show" | { x: 600, y: 500 } | `{ "action": "update-contact", "contactId": "{{trigger.contactId}}", "customFields": { "webinarAttended": false } }` | `ready` |
| `crm-4` | `lc_crm` | "Move to No-Show" | { x: 850, y: 500 } | `{ "action": "move-pipeline-stage", "contactId": "{{trigger.contactId}}", "pipelineStageId": "no_show" }` | `ready` |
| `email-2` | `lc_email` | "Replay Available Email" | { x: 1100, y: 500 } | `{ "action": "send-confirmation-email", "to": "{{contact.email}}", "subject": "You missed {{webinarTitle}} -- here's the replay", "body": "Hi {{contact.firstName}},\n\nSorry you couldn't make it to {{webinarTitle}} live.\n\nGood news: the replay is ready for you: {{replayLink}}\n\nI covered some powerful strategies including:\n- {{takeaway1}}\n- {{takeaway2}}\n- {{takeaway3}}\n\nWatch it before it comes down on {{replayDeadline}}.\n\n{{speakerName}}" }` | `ready` |
| `ac-2` | `activecampaign` | "Tag: No-Show" | { x: 1350, y: 500 } | `{ "action": "add_tag", "contactEmail": "{{contact.email}}", "tag": "webinar-noshow-<WEBINAR_TAG>" }` | `ready` |

**Edges:**

| id | source | target | sourceHandle | targetHandle |
|----|--------|--------|-------------|-------------|
| `e-1` | `trigger-1` | `if-1` | `output` | `input` |
| `e-2` | `if-1` | `crm-1` | `true` | `input` |
| `e-3` | `crm-1` | `crm-2` | `output` | `input` |
| `e-4` | `crm-2` | `email-1` | `output` | `input` |
| `e-5` | `email-1` | `ac-1` | `output` | `input` |
| `e-6` | `if-1` | `crm-3` | `false` | `input` |
| `e-7` | `crm-3` | `crm-4` | `output` | `input` |
| `e-8` | `crm-4` | `email-2` | `output` | `input` |
| `e-9` | `email-2` | `ac-2` | `output` | `input` |

**Mutations to execute:**

1. `createWorkflow({ sessionId, name: "Post-Webinar Attended Workflow", description: "Processes attendance, branches attended vs no-show, sends replay and offer, tags in ActiveCampaign" })`
2. `saveWorkflow({ sessionId, workflowId: <ID>, name: "Post-Webinar Attended Workflow", nodes: [...], edges: [...], triggers: [{ type: "trigger_webhook", config: { path: "/webinar-attendance", secret: "{{attendance_webhook_secret}}" } }] })`
3. `updateWorkflowStatus({ sessionId, workflowId: <ID>, status: "active" })`

---

### 4.4 Workflow 4 -- Post-Webinar No-Show Nurture (Required)

**Object:** `type: "layer_workflow"`, `subtype: "workflow"`, `name: "Post-Webinar No-Show Nurture Workflow"`

**Trigger:** `trigger_schedule` (fires 2 days after the webinar to run a dedicated nurture sequence for no-shows)

This workflow complements Workflow 3. While Workflow 3 sends the immediate replay email to no-shows, this workflow fires a few days later to run a dedicated no-show nurture sequence with urgency-driven replay and offer messaging.

**Nodes:**

| id | type | label | position | config | status |
|----|------|-------|----------|--------|--------|
| `trigger-1` | `trigger_schedule` | "2 Days After Webinar" | { x: 100, y: 250 } | `{ "cronExpression": "0 10 <2_DAYS_AFTER_DAY> <MONTH> *", "timezone": "{{webinarTimezone}}" }` | `ready` |
| `if-1` | `if_then` | "Is No-Show?" | { x: 350, y: 250 } | `{ "expression": "{{contact.customFields.webinarAttended}} === false" }` | `ready` |
| `email-1` | `lc_email` | "Replay Urgency Email" | { x: 600, y: 150 } | `{ "action": "send-confirmation-email", "to": "{{contact.email}}", "subject": "Replay coming down soon -- {{webinarTitle}}", "body": "Hi {{contact.firstName}},\n\nThe replay of {{webinarTitle}} is still available, but not for long.\n\nWatch it here: {{replayLink}}\n\nHere's what attendees said:\n\"{{testimonial1}}\"\n\"{{testimonial2}}\"\n\nPlus, there's a special offer for anyone who watches: {{offerDescription}}\n\nReplay expires: {{replayDeadline}}\n\n{{speakerName}}" }` | `ready` |
| `wait-1` | `wait_delay` | "Wait 2 Days" | { x: 850, y: 150 } | `{ "duration": 2, "unit": "days" }` | `ready` |
| `email-2` | `lc_email` | "Final Replay + Offer Email" | { x: 1100, y: 150 } | `{ "action": "send-confirmation-email", "to": "{{contact.email}}", "subject": "Last chance: replay expires tonight", "body": "Hi {{contact.firstName}},\n\nThis is your final reminder -- the {{webinarTitle}} replay comes down tonight at midnight.\n\nWatch now: {{replayLink}}\n\nAnd if what I shared resonates, {{offerName}} is still available at the special rate of {{discountPrice}} (regular {{regularPrice}}).\n\nAfter tonight, the replay and the discount are both gone.\n\n{{offerCTALink}}\n\n{{speakerName}}" }` | `ready` |
| `crm-1` | `lc_crm` | "Move to Follow-Up" | { x: 1350, y: 150 } | `{ "action": "move-pipeline-stage", "contactId": "{{contact._id}}", "pipelineStageId": "follow_up" }` | `ready` |

**Edges:**

| id | source | target | sourceHandle | targetHandle |
|----|--------|--------|-------------|-------------|
| `e-1` | `trigger-1` | `if-1` | `output` | `input` |
| `e-2` | `if-1` | `email-1` | `true` | `input` |
| `e-3` | `email-1` | `wait-1` | `output` | `input` |
| `e-4` | `wait-1` | `email-2` | `output` | `input` |
| `e-5` | `email-2` | `crm-1` | `output` | `input` |

> Note: The `false` handle of `if-1` has no connection -- contacts who DID attend are already being handled by the post-attended sequence from Workflow 3.

**Mutations to execute:**

1. `createWorkflow({ sessionId, name: "Post-Webinar No-Show Nurture Workflow", description: "Runs a 2-email urgency sequence for no-shows with replay deadline and offer" })`
2. `saveWorkflow({ sessionId, workflowId: <ID>, name: "Post-Webinar No-Show Nurture Workflow", nodes: [...], edges: [...], triggers: [{ type: "trigger_schedule", config: { cronExpression: "0 10 <2_DAYS_AFTER_DAY> <MONTH> *", timezone: "{{webinarTimezone}}" } }] })`
3. `updateWorkflowStatus({ sessionId, workflowId: <ID>, status: "active" })`

---

### 4.5 Sequences

#### Pre-Webinar Reminder Sequence (subtype: `vorher`)

**Name:** `Pre-Webinar Reminder Sequence`
**Trigger event:** `form_submitted`
**Reference point:** `booking_start` (= webinar start time)

This sequence is an alternative to Workflow 2 above. If using this sequence approach, link it via `workflow_sequence` from Workflow 1. If using Workflow 2 (the standalone reminder workflow), skip this sequence. Do not use both.

| step | channel | offset | unit | referencePoint | subject / body summary |
|------|---------|--------|------|----------------|------------------------|
| 1 | email | 0 | minutes | trigger_event | "You're registered for {{webinarTitle}}!" + confirmation details, calendar link, what to expect |
| 2 | email | -7 | days | booking_start | "{{webinarTitle}} is in 1 week!" + what will be covered, pre-webinar resource link |
| 3 | email | -1 | days | booking_start | "Tomorrow: {{webinarTitle}} -- don't miss it" + last-minute prep, reminder to clear schedule |
| 4 | sms | -1 | days | booking_start | "Reminder: {{webinarTitle}} is tomorrow at {{webinarTime}}. Save the date!" |
| 5 | email | -1 | hours | booking_start | "We're live in 60 minutes -- here's your join link" + {{joinLink}} |
| 6 | sms | -1 | hours | booking_start | "{{speakerName}} here. {{webinarTitle}} starts in 1 hour. Join: {{joinLink}}" |

#### Post-Webinar Attended Sequence (subtype: `nachher`)

**Name:** `Post-Webinar Attended Sequence`
**Trigger event:** `contact_tagged`
**Condition:** Contact has tag `webinar-attended-<WEBINAR_TAG>`
**Reference point:** `trigger_event` (= moment attendance is confirmed)

| step | channel | offset | unit | referencePoint | subject / body summary |
|------|---------|--------|------|----------------|------------------------|
| 1 | email | +2 | hours | trigger_event | "Thank you for attending {{webinarTitle}}! Here's the replay + slides" + {{replayLink}}, {{slidesLink}} |
| 2 | email | +1 | days | trigger_event | "The #1 takeaway from {{webinarTitle}} + your exclusive offer" + recap of key insight, introduce {{offerName}} at {{discountPrice}} |
| 3 | email | +2 | days | trigger_event | "What {{clientName}} achieved after implementing this" + case study / social proof, offer reminder |
| 4 | email | +4 | days | trigger_event | "{{offerName}} discount expires in 48 hours" + scarcity, FAQ about the offer, testimonials |
| 5 | email | +6 | days | trigger_event | "Last chance: {{offerName}} closes tonight at midnight" + final urgency, last call CTA |

#### Post-Webinar No-Show Sequence (subtype: `nachher`)

**Name:** `Post-Webinar No-Show Sequence`
**Trigger event:** `contact_tagged`
**Condition:** Contact has tag `webinar-noshow-<WEBINAR_TAG>`
**Reference point:** `trigger_event` (= moment no-show is confirmed)

| step | channel | offset | unit | referencePoint | subject / body summary |
|------|---------|--------|------|----------------|------------------------|
| 1 | email | +2 | hours | trigger_event | "We missed you at {{webinarTitle}} -- here's the replay" + {{replayLink}}, brief summary of what was covered |
| 2 | email | +1 | days | trigger_event | "The most powerful insight from {{webinarTitle}}" + tease one key takeaway, {{replayLink}} reminder |
| 3 | email | +3 | days | trigger_event | "People who watched the replay are saying..." + social proof from attendees, offer introduction |
| 4 | email | +5 | days | trigger_event | "Final chance: replay and offer expire tonight" + last call for replay access, final offer push |

---

## 5. CRM Pipeline Definition

**Pipeline Name:** `Webinar: {{webinarTitle}}`

| order | stageId | label | auto-transition trigger |
|-------|---------|-------|------------------------|
| 1 | `registered` | Registered | On form submission (Workflow 1, `crm-2` node) |
| 2 | `reminded` | Reminded | On pre-webinar reminder sequence step 2 (7-day reminder) sent |
| 3 | `attended` | Attended | On attendance webhook (Workflow 3, `crm-2` node) when `attended === true` |
| 4 | `no_show` | No-Show | On attendance webhook (Workflow 3, `crm-4` node) when `attended === false` |
| 5 | `stayed_to_offer` | Stayed to Offer | Manual move by host or automated if webinar platform reports watch duration |
| 6 | `purchased` | Purchased | On `trigger_payment_received` for the offer product, or manual move |
| 7 | `follow_up` | Follow-Up | On completion of post-webinar sequence (Workflow 4, `crm-1` node) |

**Stage transitions and automation triggers:**

- `registered -> reminded`: Triggered when pre-webinar reminder sequence sends the 7-day reminder (step 2 of vorher sequence or Workflow 2 email-1 node).
- `reminded -> attended`: Triggered by Workflow 3 attendance webhook for contacts with `attended === true`.
- `reminded -> no_show`: Triggered by Workflow 3 attendance webhook for contacts with `attended === false`.
- `registered -> no_show` (skip path): For contacts who registered but were never reminded (late registrations within 7 days), the attendance webhook directly moves them.
- `attended -> stayed_to_offer`: Manual move or automated via watch-time threshold from webinar platform.
- `attended -> purchased` or `stayed_to_offer -> purchased`: Triggered by `trigger_payment_received` for the offer product.
- `no_show -> follow_up`: Triggered by Workflow 4 (`crm-1` node) after the no-show nurture sequence completes.
- `follow_up -> purchased`: Manual move or triggered by `trigger_payment_received` for the offer product.

---

## 6. File System Scaffold

**Project:** `type: "project"`, `subtype: "campaign"`

After calling `initializeProjectFolders({ organizationId, projectId })`, the default folders are created. Then populate:

```
/
+-- builder/
|   +-- webinar-registration-page/   (kind: builder_ref -> builder_app for registration page)
|   +-- confirmation-page/           (kind: builder_ref -> builder_app for thank-you page)
|
+-- layers/
|   +-- registration-workflow        (kind: layer_ref -> layer_workflow "Webinar Registration Workflow")
|   +-- reminder-workflow            (kind: layer_ref -> layer_workflow "Webinar Reminder Workflow")
|   +-- post-webinar-workflow        (kind: layer_ref -> layer_workflow "Post-Webinar Attended Workflow")
|   +-- noshow-nurture-workflow      (kind: layer_ref -> layer_workflow "Post-Webinar No-Show Nurture Workflow")
|
+-- notes/
|   +-- webinar-brief                (kind: virtual -- webinar title, date, time, topic, target audience, offer details)
|   +-- speaker-bio                  (kind: virtual -- speaker name, title, company, bio, headshot ref)
|   +-- email-copy                   (kind: virtual -- all email drafts for review)
|   +-- offer-details                (kind: virtual -- offer name, pricing, deadline, CTA link)
|
+-- assets/
|   +-- speaker-headshot             (kind: media_ref -> speaker photo)
|   +-- webinar-banner               (kind: media_ref -> hero banner image for registration page)
|   +-- brand-assets/                (kind: folder)
|       +-- logo                     (kind: media_ref -> host/company logo)
|       +-- slide-deck               (kind: media_ref -> presentation slides for post-webinar delivery)
```

**Initialization mutation:** `initializeProjectFolders({ organizationId, projectId })` creates the four root folders. Then `createVirtualFile` and `captureBuilderApp` / `captureLayerWorkflow` populate each entry.

---

## 7. Data Flow Diagram

```
                              WEBINAR / VIRTUAL EVENT DATA FLOW
 ==========================================================================================================

 End Customer                    Platform (L4YERCAK3)                         External Systems
 ============                    ====================                         ================

 [ Visit registration page ]
       |
       v
 [ View webinar details,   ] ---> Registration Page (builder_ref)
 [ speaker bio, takeaways  ]
       |
       v
 [ Fill registration form  ] ---> form (subtype: registration)
       |                              |
       |                              v
       |                     trigger_form_submitted
       |                              |
       |                     +-------------------------------+
       |                     | WORKFLOW 1: Registration       |
       |                     |                               |
       |                     |  lc_crm [create-contact]      |
       |                     |  -> crm_contact, subtype: lead|
       |                     |  -> tags: webinar-registrant  |
       |                     |         |                     |
       |                     |    +----+----+----+           |
       |                     |    |         |    |           |
       |                     |    v         v    v           |
       |                     | lc_crm   lc_email  AC        |
       |                     | [move     [send    [add_     |-----> ActiveCampaign
       |                     |  stage:   confirm  contact,  |       (add_contact,
       |                     |  regist-  +cal     add_tag,  |        add_tag,
       |                     |  ered]    link]    add_to_   |        add_to_list)
       |                     |                    list]     |
       |                     +-------------------------------+
       |
 [ Receives confirmation   ]
 [ email + calendar invite  ]
       |
       |                     +-------------------------------+
       |                     | WORKFLOW 2: Reminders          |
       |                     |                               |
       |                     | trigger_schedule (7 days before)|
       |                     |    |                          |
       |                     |    v                          |
       |                     | lc_email [-7d reminder]       |
       |                     |    |                          |
       |                     | wait_delay [5 days]           |
       |                     |    |                          |
       |                     | lc_email [-1d reminder]       |
       |                     |    |                          |
       |                     | wait_delay [23 hours]         |
       |                     |    |                          |
       |                     |    +--------+                 |
       |                     |    |        |                 |
       |                     |    v        v                 |
       |                     | lc_email  lc_sms              |
       |                     | [-1h]     [-1h]               |
       |                     +-------------------------------+
       |
       v
 [ Attends webinar LIVE    ]
       |
       v                     +-------------------------------+
 [ Host uploads attendee   ] | WORKFLOW 3: Post-Webinar      |
 [ list via webhook        ] |                               |
       |                     | trigger_webhook               |
       |                     |    |                          |
       |                     | if_then [attended?]           |
       |                     |   /              \            |
       |                     | true            false         |
       |                     |  |                |           |
       |                     |  v                v           |
       |                     | lc_crm          lc_crm       |
       |                     | [update:        [update:     |
       |                     |  attended=true]  attended=    |
       |                     |  |               false]      |
       |                     |  v                |           |
       |                     | lc_crm            v           |
       |                     | [move->          lc_crm      |
       |                     |  attended]       [move->     |
       |                     |  |                no_show]   |
       |                     |  v                |           |
       |                     | lc_email          v           |
       |                     | [replay +        lc_email    |
       |                     |  offer]          [replay     |
       |                     |  |                available] |
       |                     |  v                |           |
       |                     | AC [tag:          v           |
       |                     |  attended]       AC [tag:    |-----> ActiveCampaign
       |                     |                  no_show]    |       (tag attended /
       |                     +-------------------------------+        no-show)
       |
       |                     +-------------------------------+
       |                     | WORKFLOW 4: No-Show Nurture    |
       |                     |                               |
       |                     | trigger_schedule (+2 days)     |
       |                     |    |                          |
       |                     | if_then [is no-show?]         |
       |                     |    |                          |
       |                     | lc_email [replay urgency]     |
       |                     |    |                          |
       |                     | wait_delay [2 days]           |
       |                     |    |                          |
       |                     | lc_email [final replay +      |
       |                     |           offer deadline]     |
       |                     |    |                          |
       |                     | lc_crm [move -> follow_up]    |
       |                     +-------------------------------+
       |
       v
 [ Watches replay OR       ]     ATTENDED PATH           NO-SHOW PATH
 [ attends live            ]     ==============          ==============
       |                         Post-Attended Seq.      Post-No-Show Seq.
       |                         (nachher)               (nachher)
       |                            |                       |
       |                         +2h: replay + slides    +2h: replay available
       |                         +1d: key takeaway +     +1d: powerful insight
       |                              offer intro            + replay
       |                         +2d: case study +       +3d: social proof +
       |                              offer reminder          offer intro
       |                         +4d: 48hr deadline      +5d: final chance:
       |                         +6d: last chance             replay + offer
       |                                                      expire
       v
 [ Clicks offer / purchases ] -> trigger_payment_received
       |                              |
       |                     lc_crm [move -> purchased]
       |                     lc_email [receipt + onboarding]
       v
 [ Customer onboarding     ]
```

---

## 8. Customization Points

### Must-Customize (deployment will fail or be meaningless without these)

| Item | Why | Where |
|------|-----|-------|
| Webinar title | Appears in every email, landing page, calendar invite | Builder registration page, all `lc_email` node configs, sequence content, pipeline name |
| Webinar date and time | Drives all reminder timing, calendar links, schedule triggers | `trigger_schedule` cron expressions, `wait_delay` calculations, sequence `referencePoint` offsets, landing page, email body content |
| Webinar timezone | Affects all scheduled triggers and display times | `trigger_schedule` node config `timezone`, landing page, email body content |
| Join link (Zoom/WebinarJam/etc.) | Registrants need this to attend | `lc_email` 1-hour reminder body, `lc_sms` reminder body, confirmation page placeholder |
| Speaker name and bio | Establishes credibility on registration page and emails | Builder registration page speaker section, email signatures, sequence content |
| Offer details (name, price, discount, deadline, CTA link) | The entire post-webinar monetization depends on this | Post-webinar email content, sequence steps 2-5, offer CTA links |

### Should-Customize (defaults work but results improve with tuning)

| Item | Why | Default |
|------|-----|---------|
| Registration page copy | StoryBrand framework: headline should name the pain, subtitle names the transformation | Generic placeholder copy |
| Email content / voice | Must sound like the speaker, use their language and stories | Generic professional tone |
| Key takeaways (bullet points) | Drive registration conversion -- must be specific to the topic | 3 placeholder bullet points |
| Replay link | Must be updated after the webinar is recorded | Placeholder URL |
| Offer pricing (regular and discount) | Must match the actual product/program pricing | Placeholder dollar amounts |
| Qualifying question options | "Biggest Challenge" options must match the ICP's actual challenges | Generic business challenges |
| Social proof / testimonials | Real quotes from past clients/attendees convert better | Placeholder testimonial blocks |
| ActiveCampaign list and tag names | Must match the client's segmentation strategy | Generic `webinar-registered-<tag>` pattern |

### Can-Use-Default (ready out of the box for most deployments)

| Item | Default Value |
|------|--------------|
| Form field types and order | firstName (req), lastName (req), email (req), phone (opt), company (opt), qualifying select (req) |
| Workflow node execution order | trigger -> crm -> email + AC (parallel) -> pipeline stage |
| Reminder timing | -7 days, -1 day, -1 hour (email); -1 hour (SMS) |
| Post-webinar sequence timing | Attended: +2h, +1d, +2d, +4d, +6d; No-show: +2h, +1d, +3d, +5d |
| Sequence channels | `email` for all steps, `sms` for 1-hour reminder only |
| Pipeline stages | registered, reminded, attended, no_show, stayed_to_offer, purchased, follow_up |
| File system folder structure | `/builder`, `/layers`, `/notes`, `/assets` |
| Contact subtype | `lead` |
| Project subtype | `campaign` |
| Workflow status progression | `draft` -> `ready` -> `active` |

---

## 9. Common Pitfalls

### What Breaks

| Pitfall | Symptom | Fix |
|---------|---------|-----|
| Form not linked to workflow | Form submissions do not trigger the Registration Workflow | Create objectLink: `{ sourceObjectId: <WORKFLOW_ID>, targetObjectId: <FORM_ID>, linkType: "workflow_form" }`. Ensure `trigger_form_submitted` node config has the correct `formId`. |
| Reminder timing uses wrong cron expression | 7-day reminder fires on the wrong date, or fires every month instead of once | Verify the `cronExpression` in `trigger_schedule` uses the exact day and month values. For a March 15 webinar, the 7-day reminder should be `"0 9 8 3 *"` (March 8 at 9 AM). |
| Attendance webhook not triggered | All registrants show as no-shows regardless of actual attendance | Ensure the host knows to call the `/webinar-attendance` webhook endpoint with `{ contactId, attended: true/false }` for each registrant after the webinar. Provide documentation or a simple upload tool. |
| No-show sequence still enrolls attendees | Attendees receive "you missed it" emails | Verify `if_then` node in Workflow 4 checks `{{contact.customFields.webinarAttended}} === false`. Ensure Workflow 3 sets `webinarAttended: true` before Workflow 4 fires. Time Workflow 4 schedule to fire AFTER Workflow 3 has processed all contacts. |
| Replay link not updated after webinar | All replay emails contain a placeholder URL | After the webinar, update the `replayLink` variable in all post-webinar email templates and sequence step content before the first post-webinar email fires. |
| Offer deadline mismatch | Offer "expires tonight" email goes out but the payment link still works, or vice versa | Coordinate the `offerDeadline` date in email copy with the actual Stripe coupon/link expiration. Both must match exactly. |
| Calendar link not configured | "Add to Calendar" buttons on confirmation page and emails do nothing or link to wrong event | Generate the `.ics` file with correct event title, date, time, timezone, and join URL. Test the Google Calendar link format: `https://calendar.google.com/calendar/render?action=TEMPLATE&text={{title}}&dates={{start}}/{{end}}&details={{description}}&location={{joinLink}}`. |
| ActiveCampaign integration not connected | `activecampaign` nodes fail silently or error | Verify the organization's ActiveCampaign API credentials are configured in integration settings before activating any workflow. |
| Sequence not linked to workflow | Registrants receive confirmation but no follow-up reminders | Ensure objectLink exists: `{ sourceObjectId: <WORKFLOW_ID>, targetObjectId: <SEQUENCE_ID>, linkType: "workflow_sequence" }`. |
| Pipeline stage IDs mismatch | `move-pipeline-stage` action fails or moves to wrong stage | The `pipelineStageId` values in all `lc_crm` node configs must exactly match the stage IDs defined in the CRM pipeline. Copy-paste from the pipeline definition, do not retype. |
| Workflow left in draft status | No automations execute despite everything being configured | After saving all nodes/edges, call `updateWorkflowStatus({ status: "active" })` for each workflow. |
| SMS not sent (phone not collected) | 1-hour SMS reminder fails silently for registrants who skipped the phone field | The phone field is optional in the form. The `lc_sms` node should gracefully skip contacts without a phone number. Consider making phone required if SMS reminders are critical. |

### Pre-Launch Self-Check List

1. Registration form exists and is published (`publishForm` was called).
2. Form `formId` is set in Workflow 1's `trigger_form_submitted` node config.
3. `objectLink` with `linkType: "workflow_form"` connects Workflow 1 to the registration form.
4. `objectLink` with `linkType: "workflow_sequence"` connects Workflow 1 to the pre-webinar reminder sequence (if using sequence approach).
5. `objectLink` with `linkType: "workflow_sequence"` connects Workflow 3 to the post-attended sequence.
6. `objectLink` with `linkType: "workflow_sequence"` connects Workflow 3 to the post-noshow sequence (or Workflow 4 to the no-show sequence).
7. All `pipelineStageId` values in `lc_crm` nodes match actual pipeline stage IDs.
8. ActiveCampaign `listId`, `tag`, and credential configuration are verified.
9. `lc_email` sender identity is configured and verified.
10. Registration page `formSettings.redirectUrl` points to the confirmation page.
11. Calendar link on the confirmation page generates a valid `.ics` file or Google Calendar URL with correct date, time, timezone, and join link.
12. All four workflows have `status: "active"`.
13. `trigger_schedule` cron expressions match the correct dates (7 days before webinar, 2 days after webinar).
14. Webinar join link is populated in the 1-hour reminder email and SMS templates.
15. Replay link placeholder is documented for post-webinar update.
16. Offer product/link is created and the deadline matches the email copy.
17. Builder apps (registration page, confirmation page) are deployed and accessible.
18. Test a registration end-to-end: submit form, verify CRM contact created, verify confirmation email received, verify ActiveCampaign sync.

---

## 10. Example Deployment Scenario

### Scenario: Business Coaching Webinar

A marketing agency ("Growth Partner Agency") sets up a webinar for their client, business coach **Marcus Johnson**. The webinar is **"The 5-Figure Client Blueprint: How to Land Premium Clients Without Cold Calling"**, scheduled for **March 15, 2025 at 2:00 PM EST**. The back-end offer is a **12-Week Coaching Program** priced at **$2,997** with a webinar-exclusive discount of **$1,997** for attendees.

---

### Step 1: Create the Project

```
createProject({
  sessionId: "<SESSION_ID>",
  organizationId: "<ORG_ID>",
  name: "Marcus Johnson - 5-Figure Client Blueprint Webinar",
  subtype: "campaign",
  description: "Live webinar funnel for business coach Marcus Johnson. Webinar: The 5-Figure Client Blueprint. Offer: 12-Week Coaching Program ($2,997 regular, $1,997 webinar-only). Target: service-based business owners doing $5K-$15K/month who want to land premium clients.",
  startDate: 1740787200000,
  endDate: 1742601600000
})
// Returns: projectId = "proj_mj_webinar_001"
```

```
initializeProjectFolders({
  organizationId: "<ORG_ID>",
  projectId: "proj_mj_webinar_001"
})
```

---

### Step 2: Create the Registration Form

```
createForm({
  sessionId: "<SESSION_ID>",
  organizationId: "<ORG_ID>",
  name: "5-Figure Client Blueprint Webinar Registration",
  description: "Registration form for Marcus Johnson's premium client acquisition webinar",
  fields: [
    { "type": "text",    "label": "First Name",       "required": true,  "placeholder": "Marcus" },
    { "type": "text",    "label": "Last Name",        "required": true,  "placeholder": "Johnson" },
    { "type": "email",   "label": "Email Address",     "required": true,  "placeholder": "you@company.com" },
    { "type": "phone",   "label": "Phone Number",      "required": false, "placeholder": "+1 (555) 000-0000" },
    { "type": "text",    "label": "Business Name",     "required": false, "placeholder": "Your business name" },
    { "type": "select",  "label": "What's your biggest challenge with landing premium clients?", "required": true,
      "options": [
        "I don't know how to find them",
        "I attract low-budget clients instead",
        "I struggle with pricing and proposals",
        "I rely on referrals and need a system",
        "I'm just getting started"
      ]
    }
  ],
  formSettings: {
    "redirectUrl": "/webinar-confirmed",
    "notifications": { "adminEmail": true, "respondentEmail": true },
    "submissionBehavior": "redirect"
  }
})
// Returns: formId = "form_mj_webinar_001"
```

```
publishForm({ sessionId: "<SESSION_ID>", formId: "form_mj_webinar_001" })
```

---

### Step 3: Create CRM Pipeline

The pipeline is configured within the organization's CRM settings with these stages:

| Stage ID | Stage Name | Description |
|----------|-----------|-------------|
| `registered` | Registered | Submitted webinar registration form |
| `reminded` | Reminded | Received 7-day reminder email |
| `attended` | Attended | Attended the live webinar |
| `no_show` | No-Show | Did not attend the live webinar |
| `stayed_to_offer` | Stayed to Offer | Watched through to the offer pitch |
| `purchased` | Purchased | Bought the 12-Week Coaching Program |
| `follow_up` | Follow-Up | Completed post-webinar sequence, not yet converted |

---

### Step 4: Create Workflow 1 -- Webinar Registration

```
createWorkflow({
  sessionId: "<SESSION_ID>",
  name: "MJ Webinar - Registration",
  description: "Captures registrations for The 5-Figure Client Blueprint webinar, creates CRM lead, sends confirmation with calendar link, syncs to ActiveCampaign"
})
// Returns: workflowId = "wf_mj_registration_001"
```

```
saveWorkflow({
  sessionId: "<SESSION_ID>",
  workflowId: "wf_mj_registration_001",
  name: "MJ Webinar - Registration",
  nodes: [
    {
      "id": "trigger-1",
      "type": "trigger_form_submitted",
      "position": { "x": 100, "y": 250 },
      "config": { "formId": "form_mj_webinar_001" },
      "status": "ready",
      "label": "Webinar Registration Submitted"
    },
    {
      "id": "crm-1",
      "type": "lc_crm",
      "position": { "x": 350, "y": 250 },
      "config": {
        "action": "create-contact",
        "contactType": "lead",
        "tags": ["webinar-registrant", "5-figure-client-blueprint", "marcus-johnson"],
        "mapFields": {
          "email": "{{trigger.email}}",
          "firstName": "{{trigger.firstName}}",
          "lastName": "{{trigger.lastName}}",
          "phone": "{{trigger.phone}}",
          "companyName": "{{trigger.businessName}}",
          "customFields": {
            "biggestChallenge": "{{trigger.whatIsYourBiggestChallengeWithLandingPremiumClients}}",
            "webinarAttended": false,
            "registrationSource": "webinar-landing-page"
          }
        }
      },
      "status": "ready",
      "label": "Create Registrant Contact"
    },
    {
      "id": "crm-2",
      "type": "lc_crm",
      "position": { "x": 600, "y": 100 },
      "config": {
        "action": "move-pipeline-stage",
        "contactId": "{{crm-1.output.contactId}}",
        "pipelineStageId": "registered"
      },
      "status": "ready",
      "label": "Move to Registered"
    },
    {
      "id": "email-1",
      "type": "lc_email",
      "position": { "x": 600, "y": 250 },
      "config": {
        "action": "send-confirmation-email",
        "to": "{{crm-1.output.email}}",
        "subject": "You're in! The 5-Figure Client Blueprint is on March 15",
        "body": "Hi {{crm-1.output.firstName}},\n\nYou're confirmed for The 5-Figure Client Blueprint!\n\nHere are the details:\n\nWhat: The 5-Figure Client Blueprint: How to Land Premium Clients Without Cold Calling\nWhen: Saturday, March 15, 2025 at 2:00 PM EST\nWhere: Online (your join link will arrive 1 hour before we go live)\n\nAdd to your calendar: https://calendar.google.com/calendar/render?action=TEMPLATE&text=The+5-Figure+Client+Blueprint&dates=20250315T190000Z/20250315T210000Z&details=Join+Marcus+Johnson+live&location=Zoom\n\nHere's what I'll cover:\n- The 3-step system I use to attract $10K+ clients on autopilot\n- Why cold calling and cold DMs are killing your brand (and what to do instead)\n- The exact positioning framework that makes premium clients come to YOU\n- A live Q&A where I'll answer your specific questions\n\nThis is going to be a high-value session. Bring a notebook.\n\nSee you on the 15th,\nMarcus Johnson\n\nP.S. Can't make it live? Register anyway. I'll send you the replay if you're on the list."
      },
      "status": "ready",
      "label": "Send Confirmation + Calendar Link"
    },
    {
      "id": "ac-1",
      "type": "activecampaign",
      "position": { "x": 600, "y": 450 },
      "config": {
        "action": "add_contact",
        "email": "{{crm-1.output.email}}",
        "firstName": "{{crm-1.output.firstName}}",
        "lastName": "{{crm-1.output.lastName}}"
      },
      "status": "ready",
      "label": "Sync to ActiveCampaign"
    },
    {
      "id": "ac-2",
      "type": "activecampaign",
      "position": { "x": 850, "y": 450 },
      "config": {
        "action": "add_tag",
        "contactEmail": "{{crm-1.output.email}}",
        "tag": "webinar-registered-5-figure-blueprint"
      },
      "status": "ready",
      "label": "Tag: Webinar Registered"
    },
    {
      "id": "ac-3",
      "type": "activecampaign",
      "position": { "x": 1100, "y": 450 },
      "config": {
        "action": "add_to_list",
        "contactEmail": "{{crm-1.output.email}}",
        "listId": "ac_list_mj_webinar_march2025"
      },
      "status": "ready",
      "label": "Add to Webinar List"
    }
  ],
  edges: [
    { "id": "e-1", "source": "trigger-1", "target": "crm-1",   "sourceHandle": "output", "targetHandle": "input" },
    { "id": "e-2", "source": "crm-1",     "target": "crm-2",   "sourceHandle": "output", "targetHandle": "input" },
    { "id": "e-3", "source": "crm-1",     "target": "email-1", "sourceHandle": "output", "targetHandle": "input" },
    { "id": "e-4", "source": "crm-1",     "target": "ac-1",    "sourceHandle": "output", "targetHandle": "input" },
    { "id": "e-5", "source": "ac-1",      "target": "ac-2",    "sourceHandle": "output", "targetHandle": "input" },
    { "id": "e-6", "source": "ac-2",      "target": "ac-3",    "sourceHandle": "output", "targetHandle": "input" }
  ],
  triggers: [{ "type": "trigger_form_submitted", "config": { "formId": "form_mj_webinar_001" } }]
})
```

```
updateWorkflowStatus({
  sessionId: "<SESSION_ID>",
  workflowId: "wf_mj_registration_001",
  status: "active"
})
```

---

### Step 5: Create Workflow 2 -- Webinar Reminders

```
createWorkflow({
  sessionId: "<SESSION_ID>",
  name: "MJ Webinar - Reminders",
  description: "Sends 7-day, 1-day, and 1-hour reminders for The 5-Figure Client Blueprint webinar via email and SMS"
})
// Returns: workflowId = "wf_mj_reminders_001"
```

```
saveWorkflow({
  sessionId: "<SESSION_ID>",
  workflowId: "wf_mj_reminders_001",
  name: "MJ Webinar - Reminders",
  nodes: [
    {
      "id": "trigger-1",
      "type": "trigger_schedule",
      "position": { "x": 100, "y": 250 },
      "config": { "cronExpression": "0 9 8 3 *", "timezone": "America/New_York" },
      "status": "ready",
      "label": "March 8 - 7 Days Before"
    },
    {
      "id": "email-1",
      "type": "lc_email",
      "position": { "x": 350, "y": 250 },
      "config": {
        "action": "send-confirmation-email",
        "to": "{{contact.email}}",
        "subject": "The 5-Figure Client Blueprint is in 7 days!",
        "body": "Hi {{contact.firstName}},\n\nJust a quick reminder -- The 5-Figure Client Blueprint webinar is happening in one week!\n\nDate: Saturday, March 15, 2025\nTime: 2:00 PM EST\n\nHere's what we'll cover:\n- The 3-step system I use to attract $10K+ clients on autopilot\n- Why cold calling and cold DMs are killing your brand\n- The exact positioning framework that makes premium clients come to YOU\n- Live Q&A\n\nMake sure it's on your calendar: https://calendar.google.com/calendar/render?action=TEMPLATE&text=The+5-Figure+Client+Blueprint&dates=20250315T190000Z/20250315T210000Z&details=Join+Marcus+Johnson+live&location=Zoom\n\nSee you on the 15th,\nMarcus Johnson"
      },
      "status": "ready",
      "label": "7-Day Reminder Email"
    },
    {
      "id": "wait-1",
      "type": "wait_delay",
      "position": { "x": 600, "y": 250 },
      "config": { "duration": 5, "unit": "days" },
      "status": "ready",
      "label": "Wait 5 Days"
    },
    {
      "id": "email-2",
      "type": "lc_email",
      "position": { "x": 850, "y": 250 },
      "config": {
        "action": "send-confirmation-email",
        "to": "{{contact.email}}",
        "subject": "Tomorrow: The 5-Figure Client Blueprint -- don't miss this",
        "body": "Hi {{contact.firstName}},\n\nThe 5-Figure Client Blueprint is TOMORROW.\n\nDate: Saturday, March 15, 2025\nTime: 2:00 PM EST\n\nI'll be sharing the exact framework I used to go from chasing $500 clients to consistently landing $10K+ engagements -- without a single cold call.\n\nThis is going to be one of the most valuable 90 minutes you spend this month.\n\nYour join link will arrive 1 hour before we go live. Keep an eye on your inbox.\n\nSee you tomorrow,\nMarcus Johnson\n\nP.S. Clear your schedule for 90 minutes. You'll want to take notes."
      },
      "status": "ready",
      "label": "1-Day Reminder Email"
    },
    {
      "id": "wait-2",
      "type": "wait_delay",
      "position": { "x": 1100, "y": 250 },
      "config": { "duration": 23, "unit": "hours" },
      "status": "ready",
      "label": "Wait 23 Hours"
    },
    {
      "id": "email-3",
      "type": "lc_email",
      "position": { "x": 1350, "y": 150 },
      "config": {
        "action": "send-confirmation-email",
        "to": "{{contact.email}}",
        "subject": "We're live in 60 minutes -- here's your link",
        "body": "Hi {{contact.firstName}},\n\nThe 5-Figure Client Blueprint starts in 1 hour.\n\nJoin here: https://zoom.us/j/mj-5figure-blueprint\n\nGrab a notebook, a coffee, and be ready to take action. I'm going to share strategies you can implement THIS WEEK.\n\nSee you inside,\nMarcus Johnson"
      },
      "status": "ready",
      "label": "1-Hour Reminder Email"
    },
    {
      "id": "sms-1",
      "type": "lc_sms",
      "position": { "x": 1350, "y": 350 },
      "config": {
        "to": "{{contact.phone}}",
        "body": "Marcus Johnson here. The 5-Figure Client Blueprint starts in 1 hour. Join now: https://zoom.us/j/mj-5figure-blueprint"
      },
      "status": "ready",
      "label": "1-Hour SMS Reminder"
    }
  ],
  edges: [
    { "id": "e-1", "source": "trigger-1", "target": "email-1", "sourceHandle": "output", "targetHandle": "input" },
    { "id": "e-2", "source": "email-1",   "target": "wait-1",  "sourceHandle": "output", "targetHandle": "input" },
    { "id": "e-3", "source": "wait-1",    "target": "email-2", "sourceHandle": "output", "targetHandle": "input" },
    { "id": "e-4", "source": "email-2",   "target": "wait-2",  "sourceHandle": "output", "targetHandle": "input" },
    { "id": "e-5", "source": "wait-2",    "target": "email-3", "sourceHandle": "output", "targetHandle": "input" },
    { "id": "e-6", "source": "wait-2",    "target": "sms-1",   "sourceHandle": "output", "targetHandle": "input" }
  ],
  triggers: [{ "type": "trigger_schedule", "config": { "cronExpression": "0 9 8 3 *", "timezone": "America/New_York" } }]
})
```

```
updateWorkflowStatus({
  sessionId: "<SESSION_ID>",
  workflowId: "wf_mj_reminders_001",
  status: "active"
})
```

---

### Step 6: Create Workflow 3 -- Post-Webinar (Attended vs No-Show)

```
createWorkflow({
  sessionId: "<SESSION_ID>",
  name: "MJ Webinar - Post-Webinar Attendance",
  description: "Processes attendance data, branches attended vs no-show, sends replay/offer, tags in ActiveCampaign"
})
// Returns: workflowId = "wf_mj_postwebinar_001"
```

```
saveWorkflow({
  sessionId: "<SESSION_ID>",
  workflowId: "wf_mj_postwebinar_001",
  name: "MJ Webinar - Post-Webinar Attendance",
  nodes: [
    {
      "id": "trigger-1",
      "type": "trigger_webhook",
      "position": { "x": 100, "y": 300 },
      "config": { "path": "/mj-webinar-attendance", "secret": "mj_5fig_attendance_2025" },
      "status": "ready",
      "label": "Attendance Webhook"
    },
    {
      "id": "if-1",
      "type": "if_then",
      "position": { "x": 350, "y": 300 },
      "config": { "expression": "{{trigger.attended}} === true" },
      "status": "ready",
      "label": "Did Attend?"
    },
    {
      "id": "crm-1",
      "type": "lc_crm",
      "position": { "x": 600, "y": 100 },
      "config": {
        "action": "update-contact",
        "contactId": "{{trigger.contactId}}",
        "customFields": { "webinarAttended": true }
      },
      "status": "ready",
      "label": "Update: Attended = true"
    },
    {
      "id": "crm-2",
      "type": "lc_crm",
      "position": { "x": 850, "y": 100 },
      "config": {
        "action": "move-pipeline-stage",
        "contactId": "{{trigger.contactId}}",
        "pipelineStageId": "attended"
      },
      "status": "ready",
      "label": "Move to Attended"
    },
    {
      "id": "email-1",
      "type": "lc_email",
      "position": { "x": 1100, "y": 100 },
      "config": {
        "action": "send-confirmation-email",
        "to": "{{contact.email}}",
        "subject": "Your replay + a thank-you gift from The 5-Figure Client Blueprint",
        "body": "Hi {{contact.firstName}},\n\nThank you for showing up live to The 5-Figure Client Blueprint! That tells me you're serious about landing premium clients.\n\nHere's what I promised:\n\nReplay: https://marcusjohnson.com/5-figure-replay\nSlides: https://marcusjohnson.com/5-figure-slides\n\nDuring the webinar, I walked through the 3-step Premium Client Attraction System. If you're ready to implement it with my hands-on guidance, I'd like to invite you to my 12-Week Coaching Program.\n\nBecause you showed up live, you get the exclusive attendee rate:\n\nRegular price: $2,997\nYour price: $1,997 (save $1,000)\n\nThis offer is only available until Friday, March 21 at midnight EST.\n\nLearn more and enroll: https://marcusjohnson.com/coaching-program?ref=webinar-live\n\nI only take 15 clients per cohort, and 4 spots are already filled.\n\nTo your growth,\nMarcus Johnson"
      },
      "status": "ready",
      "label": "Replay + Offer (Attended)"
    },
    {
      "id": "ac-1",
      "type": "activecampaign",
      "position": { "x": 1350, "y": 100 },
      "config": {
        "action": "add_tag",
        "contactEmail": "{{contact.email}}",
        "tag": "webinar-attended-5-figure-blueprint"
      },
      "status": "ready",
      "label": "Tag: Attended"
    },
    {
      "id": "crm-3",
      "type": "lc_crm",
      "position": { "x": 600, "y": 500 },
      "config": {
        "action": "update-contact",
        "contactId": "{{trigger.contactId}}",
        "customFields": { "webinarAttended": false }
      },
      "status": "ready",
      "label": "Update: Attended = false"
    },
    {
      "id": "crm-4",
      "type": "lc_crm",
      "position": { "x": 850, "y": 500 },
      "config": {
        "action": "move-pipeline-stage",
        "contactId": "{{trigger.contactId}}",
        "pipelineStageId": "no_show"
      },
      "status": "ready",
      "label": "Move to No-Show"
    },
    {
      "id": "email-2",
      "type": "lc_email",
      "position": { "x": 1100, "y": 500 },
      "config": {
        "action": "send-confirmation-email",
        "to": "{{contact.email}}",
        "subject": "You missed The 5-Figure Client Blueprint -- replay inside",
        "body": "Hi {{contact.firstName}},\n\nI noticed you couldn't make it to The 5-Figure Client Blueprint live. No worries -- life happens.\n\nThe good news: the replay is ready for you.\n\nWatch it here: https://marcusjohnson.com/5-figure-replay\n\nIn this training, I covered:\n- The 3-step system I use to attract $10K+ clients on autopilot\n- Why cold calling and cold DMs are killing your brand (and what to do instead)\n- The exact positioning framework that makes premium clients come to YOU\n\nThe replay will be available until Friday, March 21. After that, it comes down.\n\nDon't let this one slip by,\nMarcus Johnson"
      },
      "status": "ready",
      "label": "Replay Available (No-Show)"
    },
    {
      "id": "ac-2",
      "type": "activecampaign",
      "position": { "x": 1350, "y": 500 },
      "config": {
        "action": "add_tag",
        "contactEmail": "{{contact.email}}",
        "tag": "webinar-noshow-5-figure-blueprint"
      },
      "status": "ready",
      "label": "Tag: No-Show"
    }
  ],
  edges: [
    { "id": "e-1", "source": "trigger-1", "target": "if-1",    "sourceHandle": "output", "targetHandle": "input" },
    { "id": "e-2", "source": "if-1",      "target": "crm-1",   "sourceHandle": "true",   "targetHandle": "input" },
    { "id": "e-3", "source": "crm-1",     "target": "crm-2",   "sourceHandle": "output", "targetHandle": "input" },
    { "id": "e-4", "source": "crm-2",     "target": "email-1", "sourceHandle": "output", "targetHandle": "input" },
    { "id": "e-5", "source": "email-1",   "target": "ac-1",    "sourceHandle": "output", "targetHandle": "input" },
    { "id": "e-6", "source": "if-1",      "target": "crm-3",   "sourceHandle": "false",  "targetHandle": "input" },
    { "id": "e-7", "source": "crm-3",     "target": "crm-4",   "sourceHandle": "output", "targetHandle": "input" },
    { "id": "e-8", "source": "crm-4",     "target": "email-2", "sourceHandle": "output", "targetHandle": "input" },
    { "id": "e-9", "source": "email-2",   "target": "ac-2",    "sourceHandle": "output", "targetHandle": "input" }
  ],
  triggers: [{ "type": "trigger_webhook", "config": { "path": "/mj-webinar-attendance", "secret": "mj_5fig_attendance_2025" } }]
})
```

```
updateWorkflowStatus({
  sessionId: "<SESSION_ID>",
  workflowId: "wf_mj_postwebinar_001",
  status: "active"
})
```

---

### Step 7: Create Workflow 4 -- Post-Webinar No-Show Nurture

```
createWorkflow({
  sessionId: "<SESSION_ID>",
  name: "MJ Webinar - No-Show Nurture",
  description: "Sends urgency-based replay and offer emails to no-shows 2-4 days after the webinar"
})
// Returns: workflowId = "wf_mj_noshow_001"
```

```
saveWorkflow({
  sessionId: "<SESSION_ID>",
  workflowId: "wf_mj_noshow_001",
  name: "MJ Webinar - No-Show Nurture",
  nodes: [
    {
      "id": "trigger-1",
      "type": "trigger_schedule",
      "position": { "x": 100, "y": 250 },
      "config": { "cronExpression": "0 10 17 3 *", "timezone": "America/New_York" },
      "status": "ready",
      "label": "March 17 - 2 Days After Webinar"
    },
    {
      "id": "if-1",
      "type": "if_then",
      "position": { "x": 350, "y": 250 },
      "config": { "expression": "{{contact.customFields.webinarAttended}} === false" },
      "status": "ready",
      "label": "Is No-Show?"
    },
    {
      "id": "email-1",
      "type": "lc_email",
      "position": { "x": 600, "y": 150 },
      "config": {
        "action": "send-confirmation-email",
        "to": "{{contact.email}}",
        "subject": "The replay is coming down soon -- The 5-Figure Client Blueprint",
        "body": "Hi {{contact.firstName}},\n\nThe replay of The 5-Figure Client Blueprint is still available, but not for much longer.\n\nWatch it here: https://marcusjohnson.com/5-figure-replay\n\nHere's what people who attended are saying:\n\n\"I landed my first $8,000 client within 2 weeks of implementing Marcus's framework.\" -- Sarah T., Brand Consultant\n\n\"I stopped cold messaging on LinkedIn and started attracting inbound leads. Game changer.\" -- David R., Business Coach\n\nPlus, I'm offering something special for everyone who watches: my 12-Week Coaching Program at $1,997 (regular $2,997).\n\nBut this offer -- and the replay -- expire on Friday, March 21.\n\nWatch now: https://marcusjohnson.com/5-figure-replay\n\nMarcus Johnson"
      },
      "status": "ready",
      "label": "Replay Urgency Email"
    },
    {
      "id": "wait-1",
      "type": "wait_delay",
      "position": { "x": 850, "y": 150 },
      "config": { "duration": 2, "unit": "days" },
      "status": "ready",
      "label": "Wait 2 Days"
    },
    {
      "id": "email-2",
      "type": "lc_email",
      "position": { "x": 1100, "y": 150 },
      "config": {
        "action": "send-confirmation-email",
        "to": "{{contact.email}}",
        "subject": "Last chance: replay expires tonight at midnight",
        "body": "Hi {{contact.firstName}},\n\nThis is your final reminder -- The 5-Figure Client Blueprint replay comes down TONIGHT at midnight EST.\n\nWatch now: https://marcusjohnson.com/5-figure-replay\n\nIf the strategies I shared resonate with you, my 12-Week Coaching Program is still available at the webinar-exclusive rate of $1,997 (regular $2,997).\n\nAfter tonight:\n- The replay is gone\n- The $1,000 discount is gone\n- The next cohort won't open for 3 months\n\nEnroll now: https://marcusjohnson.com/coaching-program?ref=webinar-replay\n\nI only take 15 clients per cohort. Don't wait and wish you hadn't.\n\nMarcus Johnson"
      },
      "status": "ready",
      "label": "Final Replay + Offer Email"
    },
    {
      "id": "crm-1",
      "type": "lc_crm",
      "position": { "x": 1350, "y": 150 },
      "config": {
        "action": "move-pipeline-stage",
        "contactId": "{{contact._id}}",
        "pipelineStageId": "follow_up"
      },
      "status": "ready",
      "label": "Move to Follow-Up"
    }
  ],
  edges: [
    { "id": "e-1", "source": "trigger-1", "target": "if-1",    "sourceHandle": "output", "targetHandle": "input" },
    { "id": "e-2", "source": "if-1",      "target": "email-1", "sourceHandle": "true",   "targetHandle": "input" },
    { "id": "e-3", "source": "email-1",   "target": "wait-1",  "sourceHandle": "output", "targetHandle": "input" },
    { "id": "e-4", "source": "wait-1",    "target": "email-2", "sourceHandle": "output", "targetHandle": "input" },
    { "id": "e-5", "source": "email-2",   "target": "crm-1",   "sourceHandle": "output", "targetHandle": "input" }
  ],
  triggers: [{ "type": "trigger_schedule", "config": { "cronExpression": "0 10 17 3 *", "timezone": "America/New_York" } }]
})
```

```
updateWorkflowStatus({
  sessionId: "<SESSION_ID>",
  workflowId: "wf_mj_noshow_001",
  status: "active"
})
```

---

### Step 8: Create Sequences

**Post-Webinar Attended Sequence:**

```
// type: "automation_sequence", subtype: "nachher"
// name: "MJ Webinar - Post-Attended Sequence"
// triggerEvent: "contact_tagged"
// condition: contact has tag "webinar-attended-5-figure-blueprint"
steps: [
  {
    channel: "email",
    timing: { offset: 2, unit: "hours", referencePoint: "trigger_event" },
    content: {
      subject: "Your replay + slides from The 5-Figure Client Blueprint",
      body: "Hi {{firstName}},\n\nThank you for attending The 5-Figure Client Blueprint!\n\nAs promised, here are your resources:\n\nReplay: https://marcusjohnson.com/5-figure-replay\nSlides: https://marcusjohnson.com/5-figure-slides\n\nRewatch the sections on the Premium Client Attraction System (starts at 22:15) and the Positioning Framework (starts at 47:30) -- those are the two biggest needle-movers.\n\nTomorrow, I'll share the #1 thing that separates coaches who charge $500 from those who charge $10,000+.\n\nMarcus Johnson"
    }
  },
  {
    channel: "email",
    timing: { offset: 1, unit: "days", referencePoint: "trigger_event" },
    content: {
      subject: "The #1 thing that separates $500 coaches from $10K coaches",
      body: "Hi {{firstName}},\n\nYesterday's webinar covered a LOT. But if there's ONE thing to implement immediately, it's this:\n\nPremium clients don't buy services. They buy outcomes and certainty.\n\nWhen you position your offer around a specific, measurable result (\"land 3 premium clients in 90 days\") instead of a generic promise (\"grow your business\"), everything changes.\n\nThat's exactly what we build together in my 12-Week Coaching Program.\n\nBecause you attended live, you qualify for the exclusive rate:\n\nRegular: $2,997\nYour price: $1,997\n\nLearn more: https://marcusjohnson.com/coaching-program?ref=webinar-live\n\nOffer expires Friday, March 21 at midnight EST.\n\nMarcus Johnson"
    }
  },
  {
    channel: "email",
    timing: { offset: 2, unit: "days", referencePoint: "trigger_event" },
    content: {
      subject: "How Sarah went from $3K months to $15K months in 90 days",
      body: "Hi {{firstName}},\n\nI want to share a quick case study.\n\nSarah T. came to me 6 months ago. She was a brand consultant charging $1,500 per project, working with anyone who would pay. She was burning out.\n\nIn the first 4 weeks of the 12-Week Coaching Program, we:\n- Narrowed her niche to SaaS startups raising Series A\n- Rebuilt her offer as a $8,000 Brand Positioning Sprint\n- Set up an inbound lead system using the framework from the webinar\n\nBy week 8, she had landed 2 clients at $8,000 each. By week 12, she had a waitlist.\n\nHer words: \"I went from chasing clients to choosing them.\"\n\nIf you're ready for a similar transformation:\nhttps://marcusjohnson.com/coaching-program?ref=webinar-live\n\nReminder: the $1,997 rate expires Friday at midnight.\n\nMarcus Johnson"
    }
  },
  {
    channel: "email",
    timing: { offset: 4, unit: "days", referencePoint: "trigger_event" },
    content: {
      subject: "48 hours left: 12-Week Coaching Program closes Friday",
      body: "Hi {{firstName}},\n\nQuick update: the 12-Week Coaching Program at the webinar-exclusive rate of $1,997 closes in 48 hours.\n\nAfter Friday at midnight EST:\n- The price goes back to $2,997\n- The current cohort fills up (only 11 spots remain)\n- The next cohort doesn't start for 3 months\n\nHere's what's included:\n- 12 weekly 1-on-1 coaching calls (60 min each)\n- Custom client attraction system built for YOUR business\n- Positioning and messaging overhaul\n- Proposal and pricing templates that close premium deals\n- Private community of 15 high-level peers\n- Lifetime access to course materials\n\nCommon questions:\nQ: What if I'm not ready?\nA: If you're doing $5K+/month and want to hit $15K+, you're ready.\n\nQ: Is there a payment plan?\nA: Yes. 3 payments of $699.\n\nQ: What if it doesn't work?\nA: 30-day money-back guarantee. If you don't see results, you pay nothing.\n\nEnroll before Friday: https://marcusjohnson.com/coaching-program?ref=webinar-live\n\nMarcus Johnson"
    }
  },
  {
    channel: "email",
    timing: { offset: 6, unit: "days", referencePoint: "trigger_event" },
    content: {
      subject: "Final call: coaching program closes tonight at midnight",
      body: "Hi {{firstName}},\n\nThis is the last email I'll send about the 12-Week Coaching Program.\n\nTonight at midnight EST, the webinar-exclusive rate of $1,997 expires. The price goes back to $2,997 and the current cohort closes.\n\nIf you've been thinking about it, here's my honest take:\n\nThe coaches who transform their businesses aren't the ones who wait for the \"perfect time.\" They're the ones who decide and commit.\n\nYou showed up to the webinar. You took notes. You saw the framework. The question is: are you going to implement it alone, or do you want someone in your corner?\n\nLast chance: https://marcusjohnson.com/coaching-program?ref=webinar-live\n\nWhatever you decide, I'm rooting for you.\n\nMarcus Johnson\n\nP.S. If you have any last questions, reply to this email. I read every response."
    }
  }
]
```

**Post-Webinar No-Show Sequence:**

```
// type: "automation_sequence", subtype: "nachher"
// name: "MJ Webinar - Post-No-Show Sequence"
// triggerEvent: "contact_tagged"
// condition: contact has tag "webinar-noshow-5-figure-blueprint"
steps: [
  {
    channel: "email",
    timing: { offset: 2, unit: "hours", referencePoint: "trigger_event" },
    content: {
      subject: "We missed you -- here's the replay of The 5-Figure Client Blueprint",
      body: "Hi {{firstName}},\n\nI noticed you couldn't make it to The 5-Figure Client Blueprint live. No worries at all -- I know schedules get crazy.\n\nThe replay is ready for you:\nhttps://marcusjohnson.com/5-figure-replay\n\nIn this 90-minute training, I covered:\n- The 3-step system I use to attract $10K+ clients without cold outreach\n- Why most service-based businesses repel premium clients (and how to fix it)\n- The Positioning Framework that makes high-value clients come to YOU\n\nThe replay is available until Friday, March 21.\n\nWatch it here: https://marcusjohnson.com/5-figure-replay\n\nMarcus Johnson"
    }
  },
  {
    channel: "email",
    timing: { offset: 1, unit: "days", referencePoint: "trigger_event" },
    content: {
      subject: "The most powerful strategy from the webinar (in 2 minutes)",
      body: "Hi {{firstName}},\n\nI know 90 minutes is a commitment. So let me give you the single most powerful insight from The 5-Figure Client Blueprint in under 2 minutes:\n\nThe #1 reason service providers stay stuck at $3K-$5K/month is they position themselves as a commodity. \"I do web design.\" \"I'm a business coach.\" \"I help with marketing.\"\n\nPremium clients don't buy commodities. They buy specific, measurable outcomes delivered by a recognized authority.\n\nIn the webinar, I show you exactly how to reposition yourself (with real before/after examples). It's the section starting at 22:15.\n\nWatch the full replay: https://marcusjohnson.com/5-figure-replay\n\nTrust me -- this one strategy alone can double your rates.\n\nMarcus Johnson"
    }
  },
  {
    channel: "email",
    timing: { offset: 3, unit: "days", referencePoint: "trigger_event" },
    content: {
      subject: "People who watched the replay are already seeing results",
      body: "Hi {{firstName}},\n\nI've been getting messages from people who watched The 5-Figure Client Blueprint replay, and the results are incredible:\n\n\"I rewrote my LinkedIn headline using Marcus's framework and got 3 inbound inquiries within a week.\" -- Alex M.\n\n\"I raised my prices from $2,500 to $7,500 per project and my first prospect said yes without hesitation.\" -- Jennifer K.\n\nThese results came from the FREE training. Imagine what happens with 12 weeks of hands-on coaching.\n\nI'm offering my 12-Week Coaching Program at a special rate of $1,997 (regular $2,997) for everyone who registered for the webinar.\n\nBut this offer -- and the replay -- expire Friday, March 21.\n\nWatch the replay: https://marcusjohnson.com/5-figure-replay\nLearn about the program: https://marcusjohnson.com/coaching-program?ref=webinar-replay\n\nMarcus Johnson"
    }
  },
  {
    channel: "email",
    timing: { offset: 5, unit: "days", referencePoint: "trigger_event" },
    content: {
      subject: "Tonight at midnight: replay + offer both expire",
      body: "Hi {{firstName}},\n\nFinal notice: The 5-Figure Client Blueprint replay comes down tonight at midnight EST.\n\nAfter tonight:\n- The replay link will no longer work\n- The $1,997 coaching program offer expires (goes back to $2,997)\n- The current cohort closes enrollment\n\nIf you haven't watched it yet, this is your last chance:\nhttps://marcusjohnson.com/5-figure-replay\n\nAnd if the strategies resonate and you want hands-on help implementing them:\nhttps://marcusjohnson.com/coaching-program?ref=webinar-replay\n\n30-day money-back guarantee. 3-payment option available ($699/month).\n\nWhatever you decide, I appreciate you registering. That alone tells me you're serious about growth.\n\nMarcus Johnson"
    }
  }
]
```

---

### Step 9: Link All Objects

```
// Workflow 1 -> Form
objectLinks.create({
  sourceObjectId: "wf_mj_registration_001",
  targetObjectId: "form_mj_webinar_001",
  linkType: "workflow_form"
})

// Workflow 3 -> Post-Attended Sequence
objectLinks.create({
  sourceObjectId: "wf_mj_postwebinar_001",
  targetObjectId: "<POST_ATTENDED_SEQUENCE_ID>",
  linkType: "workflow_sequence"
})

// Workflow 3 -> Post-No-Show Sequence
objectLinks.create({
  sourceObjectId: "wf_mj_postwebinar_001",
  targetObjectId: "<POST_NOSHOW_SEQUENCE_ID>",
  linkType: "workflow_sequence"
})

// Project -> Client Contact (Marcus Johnson as stakeholder)
objectLinks.create({
  sourceObjectId: "proj_mj_webinar_001",
  targetObjectId: "<MARCUS_JOHNSON_CONTACT_ID>",
  linkType: "project_contact"
})
```

---

### Step 10: Populate the File System

```
createVirtualFile({
  sessionId: "<SESSION_ID>",
  projectId: "proj_mj_webinar_001",
  name: "webinar-brief",
  parentPath: "/notes",
  content: "# The 5-Figure Client Blueprint Webinar\n\n## Overview\nHost: Marcus Johnson, Business Coach\nTitle: The 5-Figure Client Blueprint: How to Land Premium Clients Without Cold Calling\nDate: Saturday, March 15, 2025\nTime: 2:00 PM EST (90 minutes)\nPlatform: Zoom\n\n## Target Audience\nService-based business owners (coaches, consultants, freelancers, agencies) doing $5K-$15K/month who want to land premium $10K+ clients without cold outreach.\n\n## Key Takeaways\n1. The 3-step Premium Client Attraction System\n2. Why cold calling/cold DMs damage your brand\n3. The Positioning Framework for attracting inbound premium leads\n4. Live Q&A\n\n## Back-End Offer\n12-Week Coaching Program\nRegular: $2,997\nWebinar attendee price: $1,997 (save $1,000)\nPayment plan: 3x $699\nDeadline: Friday, March 21, 2025 at midnight EST\nCapacity: 15 clients per cohort\n\n## KPIs\n- 500 registrations\n- 40% live attendance rate (200 attendees)\n- 30% replay watch rate of no-shows (90 replay viewers)\n- 5% offer conversion (15 sales = $29,955 revenue)"
})

createVirtualFile({
  sessionId: "<SESSION_ID>",
  projectId: "proj_mj_webinar_001",
  name: "speaker-bio",
  parentPath: "/notes",
  content: "# Marcus Johnson - Speaker Bio\n\nMarcus Johnson is a business coach and consultant who helps service-based business owners land premium clients without cold calling. Over the past 8 years, he has helped 200+ coaches, consultants, and freelancers scale from $5K/month to $15K+/month using his Premium Client Attraction System.\n\nBefore coaching, Marcus ran a boutique branding agency where he learned firsthand the difference between chasing clients and attracting them. He closed his first $25,000 engagement without a single cold email -- and now teaches others to do the same.\n\nMarcus has been featured in Entrepreneur, Forbes Coaches Council, and The Coaching Podcast. He lives in Atlanta, GA with his wife and two kids."
})

createVirtualFile({
  sessionId: "<SESSION_ID>",
  projectId: "proj_mj_webinar_001",
  name: "email-copy",
  parentPath: "/notes",
  content: "# Email Copy - All Sequences\n\nSee Step 4 (registration confirmation), Step 5 (reminder emails), Step 6 (post-webinar emails), and Step 8 (sequence emails) for complete email copy.\n\nAll emails are written in Marcus Johnson's voice: direct, confident, mentor-like, with specific numbers and social proof. Use short paragraphs. Include P.S. lines on key conversion emails."
})

createVirtualFile({
  sessionId: "<SESSION_ID>",
  projectId: "proj_mj_webinar_001",
  name: "offer-details",
  parentPath: "/notes",
  content: "# 12-Week Coaching Program - Offer Details\n\n## Product\nName: 12-Week Premium Client Coaching Program\nDelivery: 12 weekly 1-on-1 coaching calls (60 min each)\n\n## Pricing\nRegular: $2,997\nWebinar-exclusive: $1,997\nPayment plan: 3 x $699/month\n\n## Deadline\nFriday, March 21, 2025 at 11:59 PM EST\n\n## Capacity\n15 clients per cohort (4 pre-filled at launch)\n\n## Guarantee\n30-day money-back guarantee\n\n## Links\nSales page: https://marcusjohnson.com/coaching-program\nWebinar attendee link: https://marcusjohnson.com/coaching-program?ref=webinar-live\nReplay viewer link: https://marcusjohnson.com/coaching-program?ref=webinar-replay\n\n## Included\n- 12 weekly 1-on-1 coaching calls\n- Custom client attraction system\n- Positioning and messaging overhaul\n- Proposal and pricing templates\n- Private community of 15 peers\n- Lifetime access to course materials"
})

captureBuilderApp({
  projectId: "proj_mj_webinar_001",
  builderAppId: "<REGISTRATION_PAGE_APP_ID>"
})

captureBuilderApp({
  projectId: "proj_mj_webinar_001",
  builderAppId: "<CONFIRMATION_PAGE_APP_ID>"
})

captureLayerWorkflow({
  projectId: "proj_mj_webinar_001",
  layerWorkflowId: "wf_mj_registration_001"
})

captureLayerWorkflow({
  projectId: "proj_mj_webinar_001",
  layerWorkflowId: "wf_mj_reminders_001"
})

captureLayerWorkflow({
  projectId: "proj_mj_webinar_001",
  layerWorkflowId: "wf_mj_postwebinar_001"
})

captureLayerWorkflow({
  projectId: "proj_mj_webinar_001",
  layerWorkflowId: "wf_mj_noshow_001"
})
```

---

### Complete Object Inventory

| # | Object Type | Subtype | Name | Key Detail |
|---|------------|---------|------|-----------|
| 1 | `project` | `campaign` | "Marcus Johnson - 5-Figure Client Blueprint Webinar" | Container for all assets |
| 2 | `form` | `registration` | "5-Figure Client Blueprint Webinar Registration" | 6 fields, published |
| 3 | `layer_workflow` | `workflow` | "MJ Webinar - Registration" | 7 nodes, 6 edges, active |
| 4 | `layer_workflow` | `workflow` | "MJ Webinar - Reminders" | 7 nodes, 6 edges, active |
| 5 | `layer_workflow` | `workflow` | "MJ Webinar - Post-Webinar Attendance" | 10 nodes, 9 edges, active |
| 6 | `layer_workflow` | `workflow` | "MJ Webinar - No-Show Nurture" | 6 nodes, 5 edges, active |
| 7 | `automation_sequence` | `nachher` | "MJ Webinar - Post-Attended Sequence" | 5 emails over 6 days |
| 8 | `automation_sequence` | `nachher` | "MJ Webinar - Post-No-Show Sequence" | 4 emails over 5 days |
| 9 | `builder_app` | `template_based` | "5-Figure Client Blueprint Registration Page" | Hero + speaker + form + social proof |
| 10 | `builder_app` | `template_based` | "5-Figure Client Blueprint Confirmation Page" | Thank-you + calendar + share |

| # | Link Type | Source | Target |
|---|----------|--------|--------|
| 1 | `workflow_form` | Workflow 1 (3) | Form (2) |
| 2 | `workflow_sequence` | Workflow 3 (5) | Post-Attended Sequence (7) |
| 3 | `workflow_sequence` | Workflow 3 (5) | Post-No-Show Sequence (8) |
| 4 | `project_contact` | Project (1) | Marcus Johnson contact |

### Credit Cost Estimate

| Action | Count per Registrant | Credits Each | Total per Registrant |
|--------|---------------------|-------------|---------------------|
| Behavior: create-contact (Workflow 1) | 1 | 1 | 1 |
| Behavior: move-pipeline-stage to registered (Workflow 1) | 1 | 1 | 1 |
| Behavior: send-confirmation-email (Workflow 1) | 1 | 1 | 1 |
| Behavior: activecampaign-sync add_contact (Workflow 1) | 1 | 1 | 1 |
| Behavior: activecampaign-sync add_tag (Workflow 1) | 1 | 1 | 1 |
| Behavior: activecampaign-sync add_to_list (Workflow 1) | 1 | 1 | 1 |
| Behavior: send-confirmation-email 7-day reminder (Workflow 2) | 1 | 1 | 1 |
| Behavior: send-confirmation-email 1-day reminder (Workflow 2) | 1 | 1 | 1 |
| Behavior: send-confirmation-email 1-hour reminder (Workflow 2) | 1 | 1 | 1 |
| Behavior: lc_sms 1-hour reminder (Workflow 2) | 1 | 1 | 1 |
| Behavior: update-contact attendance (Workflow 3) | 1 | 1 | 1 |
| Behavior: move-pipeline-stage attended/no_show (Workflow 3) | 1 | 1 | 1 |
| Behavior: send-confirmation-email replay (Workflow 3) | 1 | 1 | 1 |
| Behavior: activecampaign-sync add_tag attended/no_show (Workflow 3) | 1 | 1 | 1 |
| Sequence: Post-attended (5 emails) OR post-no-show (4 emails) | 4-5 | 1 | 4-5 |
| Behavior: No-show nurture emails (Workflow 4, no-shows only) | 0-2 | 1 | 0-2 |
| Behavior: move-pipeline-stage follow_up (Workflow 4, no-shows only) | 0-1 | 1 | 0-1 |
| **Total per registrant (attended path)** | | | **19 credits** |
| **Total per registrant (no-show path)** | | | **21 credits** |

**Projection for 500 registrants:**
- 200 attend (40%): 200 x 19 = 3,800 credits
- 300 no-show (60%): 300 x 21 = 6,300 credits
- **Total: approximately 10,100 credits for the entire webinar campaign**
