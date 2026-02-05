# Skill: Lead Generation Funnel

> References: `_SHARED.md` for all ontology definitions, mutation signatures, node types, and link types.

---

## 1. Purpose

This skill builds a complete lead generation funnel deployment for an agency's client. The deployment captures leads through a landing page with an embedded registration form, creates CRM contacts with pipeline tracking, sends confirmation emails, syncs contacts to ActiveCampaign for ongoing marketing, and enrolls each new lead into a Soap Opera email sequence that nurtures them over seven days. The outcome is a fully automated system where qualified leads flow into the CRM with pipeline stage progression, while unqualified leads receive nurture content until they are ready to engage. The three-layer relationship applies: the L4YERCAK3 platform provides the infrastructure, the agency configures and deploys the funnel for their client, and the client's end customers are the leads entering the funnel.

---

## 2. Ontologies Involved

### Objects (`objects` table)

| type | subtype | customProperties used |
|------|---------|----------------------|
| `crm_contact` | `lead` | `firstName`, `lastName`, `email`, `phone`, `companyName`, `contactType`, `tags`, `pipelineStageId`, `pipelineDealValue`, `customFields` |
| `form` | `registration` | `fields` (array of field objects), `formSettings` (redirect URL, notifications), `submissionWorkflow` |
| `product` | `digital` | `productCode`, `description`, `price` (cents), `currency`, `taxBehavior` -- only for paid lead magnet variant |
| `project` | `campaign` | `projectCode`, `description`, `status`, `startDate`, `endDate` |
| `layer_workflow` | `workflow` | Full `LayerWorkflowData`: `nodes`, `edges`, `metadata`, `triggers` |
| `automation_sequence` | `nachher` | Steps array with `channel`, `timing`, `content` |
| `builder_app` | `template_based` | Landing page and thank-you page files |

### Object Links (`objectLinks` table)

| linkType | sourceObjectId | targetObjectId |
|----------|---------------|----------------|
| `workflow_form` | workflow (lead capture) | form (registration) |
| `workflow_sequence` | workflow (lead capture) | sequence (soap opera) |
| `product_form` | product (lead magnet) | form (registration) -- paid variant only |
| `checkout_product` | checkout transaction | product -- paid variant only |
| `project_contact` | project | CRM contact (client stakeholder) |

---

## 3. Builder Components

### Landing Page

The Builder generates a single-page landing page (`builder_app`, subtype: `template_based`) with these sections:

1. **Hero Section** -- Headline (StoryBrand: external problem statement), subheadline (the transformation promise), primary CTA button ("Get Your Free [Lead Magnet Name]").
2. **Form Embed Section** -- Embedded registration form (see Form below). The form renders inline on the page.
3. **Social Proof Section** -- Testimonial cards (2-3 quotes), trust badges, client logos or statistics ("500+ businesses trust us").
4. **Brief Benefits Section** -- 3-4 bullet points explaining what the lead magnet contains.
5. **Footer** -- Privacy policy link, agency branding.

**File:** `/builder/landing-page/index.html` (or framework equivalent via scaffold generator)

### Thank-You Page

Displayed after form submission (configured via `formSettings.redirectUrl`):

1. **Confirmation Message** -- "Check your inbox for [Lead Magnet Name]."
2. **Lead Magnet Delivery** -- Direct download link or "We've emailed it to you" message.
3. **Next Step CTA** -- Secondary offer or booking link ("Want faster results? Book a free consultation").
4. **Social Sharing** -- Optional share buttons.

**File:** `/builder/thank-you-page/index.html`

### Registration Form

**Object:** `type: "form"`, `subtype: "registration"`

**Fields array:**

```json
[
  { "type": "email",   "label": "Email Address",     "required": true,  "placeholder": "you@company.com" },
  { "type": "text",    "label": "First Name",        "required": true,  "placeholder": "Jane" },
  { "type": "text",    "label": "Last Name",         "required": false, "placeholder": "Smith" },
  { "type": "phone",   "label": "Phone Number",      "required": false, "placeholder": "+1 (555) 000-0000" },
  { "type": "text",    "label": "Company Name",      "required": false, "placeholder": "Acme Corp" },
  { "type": "select",  "label": "Biggest Challenge",  "required": true,  "options": ["Option A", "Option B", "Option C", "Other"] }
]
```

**formSettings:**
```json
{
  "redirectUrl": "/thank-you",
  "notifications": { "adminEmail": true, "respondentEmail": true },
  "submissionBehavior": "redirect"
}
```

> **Customization note:** The "Biggest Challenge" select field is the qualifying question. Its label and options MUST be adapted to the client's industry. See Section 8.

---

## 4. Layers Automations

### Workflow 1: Lead Capture (Required)

**Object:** `type: "layer_workflow"`, `subtype: "workflow"`, `name: "Lead Capture Workflow"`

**Trigger:** `trigger_form_submitted`

**Nodes:**

| id | type | label | config | status |
|----|------|-------|--------|--------|
| `trigger-1` | `trigger_form_submitted` | "Form Submitted" | `{ "formId": "<FORM_ID>" }` | `ready` |
| `crm-1` | `lc_crm` | "Create Lead Contact" | `{ "action": "create-contact", "contactType": "lead", "tags": ["lead-magnet", "<CAMPAIGN_TAG>"], "mapFields": { "email": "{{trigger.email}}", "firstName": "{{trigger.firstName}}", "lastName": "{{trigger.lastName}}", "phone": "{{trigger.phone}}", "companyName": "{{trigger.companyName}}", "customFields": { "biggestChallenge": "{{trigger.biggestChallenge}}" } } }` | `ready` |
| `email-1` | `lc_email` | "Send Confirmation Email" | `{ "action": "send-confirmation-email", "to": "{{crm-1.output.email}}", "subject": "Here's your [Lead Magnet Name]", "body": "Hi {{crm-1.output.firstName}},\n\nThanks for requesting [Lead Magnet Name]. Download it here: [LINK]\n\nOver the next few days, I'll share some insights that will help you [desired outcome].\n\nTalk soon,\n[Sender Name]" }` | `ready` |
| `ac-1` | `activecampaign` | "Sync to ActiveCampaign" | `{ "action": "add_contact", "email": "{{crm-1.output.email}}", "firstName": "{{crm-1.output.firstName}}", "lastName": "{{crm-1.output.lastName}}" }` | `ready` |
| `ac-2` | `activecampaign` | "Tag in ActiveCampaign" | `{ "action": "add_tag", "contactEmail": "{{crm-1.output.email}}", "tag": "lead-magnet-<CAMPAIGN_TAG>" }` | `ready` |
| `ac-3` | `activecampaign` | "Add to AC List" | `{ "action": "add_to_list", "contactEmail": "{{crm-1.output.email}}", "listId": "<AC_LIST_ID>" }` | `ready` |
| `crm-2` | `lc_crm` | "Set Pipeline Stage" | `{ "action": "move-pipeline-stage", "contactId": "{{crm-1.output.contactId}}", "pipelineStageId": "new_lead" }` | `ready` |

**Edges:**

| id | source | target | sourceHandle | targetHandle |
|----|--------|--------|-------------|-------------|
| `e-1` | `trigger-1` | `crm-1` | `output` | `input` |
| `e-2` | `crm-1` | `email-1` | `output` | `input` |
| `e-3` | `crm-1` | `ac-1` | `output` | `input` |
| `e-4` | `ac-1` | `ac-2` | `output` | `input` |
| `e-5` | `ac-2` | `ac-3` | `output` | `input` |
| `e-6` | `crm-1` | `crm-2` | `output` | `input` |

**Node positions (canvas layout):**

| id | x | y |
|----|---|---|
| `trigger-1` | 100 | 200 |
| `crm-1` | 350 | 200 |
| `email-1` | 600 | 100 |
| `ac-1` | 600 | 300 |
| `ac-2` | 850 | 300 |
| `ac-3` | 1100 | 300 |
| `crm-2` | 600 | 500 |

**Mutations to execute:**

1. `createWorkflow({ sessionId, name: "Lead Capture Workflow", description: "Captures form submissions, creates CRM leads, sends confirmation, syncs to ActiveCampaign" })`
2. `saveWorkflow({ sessionId, workflowId: <ID>, name: "Lead Capture Workflow", nodes: [...], edges: [...], triggers: [{ type: "trigger_form_submitted", config: { formId: "<FORM_ID>" } }] })`
3. `updateWorkflowStatus({ sessionId, workflowId: <ID>, status: "active" })`

---

### Workflow 2: Paid Lead Magnet (Optional -- use when lead magnet has a price)

**Object:** `type: "layer_workflow"`, `subtype: "workflow"`, `name: "Paid Lead Magnet Workflow"`

**Trigger:** `trigger_payment_received`

**Nodes:**

| id | type | label | config | status |
|----|------|-------|--------|--------|
| `trigger-1` | `trigger_payment_received` | "Payment Received" | `{ "paymentProvider": "stripe" }` | `ready` |
| `checkout-1` | `lc_checkout` | "Create Transaction" | `{ "action": "create-transaction", "productId": "<PRODUCT_ID>", "amount": "{{trigger.amount}}", "currency": "{{trigger.currency}}" }` | `ready` |
| `crm-1` | `lc_crm` | "Create Paid Lead" | `{ "action": "create-contact", "contactType": "lead", "tags": ["paid-lead-magnet", "<CAMPAIGN_TAG>"], "mapFields": { "email": "{{trigger.customerEmail}}", "firstName": "{{trigger.customerFirstName}}", "lastName": "{{trigger.customerLastName}}" } }` | `ready` |
| `invoice-1` | `lc_invoicing` | "Generate Invoice" | `{ "action": "generate-invoice", "transactionId": "{{checkout-1.output.transactionId}}", "contactId": "{{crm-1.output.contactId}}" }` | `ready` |
| `email-1` | `lc_email` | "Send Receipt + Delivery" | `{ "action": "send-confirmation-email", "to": "{{crm-1.output.email}}", "subject": "Your purchase: [Lead Magnet Name]", "body": "Hi {{crm-1.output.firstName}},\n\nThank you for your purchase. Download [Lead Magnet Name] here: [LINK]\n\nYour invoice is attached.\n\n[Sender Name]" }` | `ready` |
| `ac-1` | `activecampaign` | "Sync to ActiveCampaign" | `{ "action": "add_contact", "email": "{{crm-1.output.email}}", "firstName": "{{crm-1.output.firstName}}" }` | `ready` |
| `ac-2` | `activecampaign` | "Tag Paid Lead" | `{ "action": "add_tag", "contactEmail": "{{crm-1.output.email}}", "tag": "paid-lead-<CAMPAIGN_TAG>" }` | `ready` |

**Edges:**

| id | source | target | sourceHandle | targetHandle |
|----|--------|--------|-------------|-------------|
| `e-1` | `trigger-1` | `checkout-1` | `output` | `input` |
| `e-2` | `checkout-1` | `crm-1` | `output` | `input` |
| `e-3` | `crm-1` | `invoice-1` | `output` | `input` |
| `e-4` | `crm-1` | `email-1` | `output` | `input` |
| `e-5` | `crm-1` | `ac-1` | `output` | `input` |
| `e-6` | `ac-1` | `ac-2` | `output` | `input` |

**Mutations to execute:**

1. `createWorkflow({ sessionId, name: "Paid Lead Magnet Workflow" })`
2. `saveWorkflow({ sessionId, workflowId: <ID>, nodes: [...], edges: [...], triggers: [{ type: "trigger_payment_received", config: { paymentProvider: "stripe" } }] })`
3. `updateWorkflowStatus({ sessionId, workflowId: <ID>, status: "active" })`

---

### Workflow 3: Lead Qualification (Optional -- use for pipeline automation)

**Object:** `type: "layer_workflow"`, `subtype: "workflow"`, `name: "Lead Qualification Workflow"`

**Trigger:** `trigger_contact_updated`

**Nodes:**

| id | type | label | config | status |
|----|------|-------|--------|--------|
| `trigger-1` | `trigger_contact_updated` | "Contact Updated" | `{}` | `ready` |
| `if-1` | `if_then` | "Has Qualifying Data?" | `{ "expression": "{{trigger.contact.customFields.biggestChallenge}} !== null && {{trigger.contact.email}} !== null && {{trigger.contact.phone}} !== null" }` | `ready` |
| `crm-1` | `lc_crm` | "Move to Qualified" | `{ "action": "move-pipeline-stage", "contactId": "{{trigger.contact._id}}", "pipelineStageId": "qualified" }` | `ready` |
| `email-1` | `lc_email` | "Notify Sales Team" | `{ "action": "send-admin-notification", "to": "<ADMIN_EMAIL>", "subject": "New Qualified Lead: {{trigger.contact.firstName}} {{trigger.contact.lastName}}", "body": "A new lead has been qualified.\n\nName: {{trigger.contact.firstName}} {{trigger.contact.lastName}}\nEmail: {{trigger.contact.email}}\nPhone: {{trigger.contact.phone}}\nCompany: {{trigger.contact.companyName}}\nChallenge: {{trigger.contact.customFields.biggestChallenge}}" }` | `ready` |
| `ac-4` | `activecampaign` | "Add to Sales Automation" | `{ "action": "add_to_automation", "contactEmail": "{{trigger.contact.email}}", "automationId": "<AC_SALES_AUTOMATION_ID>" }` | `ready` |

**Edges:**

| id | source | target | sourceHandle | targetHandle |
|----|--------|--------|-------------|-------------|
| `e-1` | `trigger-1` | `if-1` | `output` | `input` |
| `e-2` | `if-1` | `crm-1` | `true` | `input` |
| `e-3` | `crm-1` | `email-1` | `output` | `input` |
| `e-4` | `crm-1` | `ac-4` | `output` | `input` |

> Note: The `false` handle of `if-1` has no connection -- unqualified contacts remain at their current pipeline stage and continue receiving the nurture sequence.

**Mutations to execute:**

1. `createWorkflow({ sessionId, name: "Lead Qualification Workflow" })`
2. `saveWorkflow({ sessionId, workflowId: <ID>, nodes: [...], edges: [...], triggers: [{ type: "trigger_contact_updated", config: {} }] })`
3. `updateWorkflowStatus({ sessionId, workflowId: <ID>, status: "active" })`

---

## 5. CRM Pipeline Definition

### Generic Pipeline

**Pipeline Name:** "Lead Generation Pipeline"

| Stage ID | Stage Name | Description | Automation Trigger |
|----------|-----------|-------------|-------------------|
| `new_lead` | New Lead | Contact just submitted the form. Awaiting initial review. | Auto-set by Workflow 1 (`crm-2` node) |
| `contacted` | Contacted | Sales rep has made first outreach (email, call, or message). | Manual move or sequence completion trigger |
| `qualified` | Qualified | Lead has qualifying data (phone + challenge + engagement). | Auto-set by Workflow 3 (`crm-1` node) |
| `proposal` | Proposal Sent | Proposal or quote has been delivered to the lead. | Manual move |
| `closed_won` | Closed Won | Lead converted to paying customer. | Manual move, triggers `update-contact` to change subtype to `customer` |
| `closed_lost` | Closed Lost | Lead did not convert. Moves to long-term nurture. | Manual move, triggers `add_tag` with "closed-lost" in ActiveCampaign |

### Example: Dental Practice Pipeline

| Stage ID | Stage Name | Description |
|----------|-----------|-------------|
| `new_lead` | New Patient Lead | Downloaded dental implant guide |
| `contacted` | Initial Consultation Booked | Front desk called, consultation scheduled |
| `qualified` | Consultation Completed | Patient attended, needs confirmed |
| `proposal` | Treatment Plan Presented | Implant treatment plan and pricing shared |
| `closed_won` | Treatment Accepted | Patient accepted and scheduled procedure |
| `closed_lost` | Not Proceeding | Patient declined or went elsewhere |

### Example: SaaS B2B Pipeline

| Stage ID | Stage Name | Description |
|----------|-----------|-------------|
| `new_lead` | New MQL | Downloaded whitepaper/checklist |
| `contacted` | Discovery Call Scheduled | SDR reached out, call booked |
| `qualified` | SQL - Demo Completed | Decision-maker attended demo |
| `proposal` | Proposal / Trial | Sent pricing or started free trial |
| `closed_won` | Customer | Signed contract |
| `closed_lost` | Lost | Did not convert |

---

## 6. File System Scaffold

**Project:** `type: "project"`, `subtype: "campaign"`

After calling `initializeProjectFolders({ organizationId, projectId })`, the default folders are created. Then populate:

```
/
├── builder/
│   ├── landing-page/          (kind: builder_ref -> builder_app for landing page)
│   └── thank-you-page/        (kind: builder_ref -> builder_app for thank-you page)
├── layers/
│   ├── lead-capture-workflow   (kind: layer_ref -> layer_workflow "Lead Capture Workflow")
│   ├── paid-lead-workflow      (kind: layer_ref -> layer_workflow "Paid Lead Magnet Workflow" -- optional)
│   └── qualification-workflow  (kind: layer_ref -> layer_workflow "Lead Qualification Workflow" -- optional)
├── notes/
│   ├── campaign-brief          (kind: virtual, content: campaign objectives, ICP, KPIs)
│   └── sequence-copy           (kind: virtual, content: all 5 sequence email drafts)
├── assets/
│   ├── lead-magnet-file        (kind: media_ref -> uploaded PDF/guide/checklist)
│   └── brand-assets/           (kind: folder)
│       ├── logo                (kind: media_ref -> agency client logo)
│       └── hero-image          (kind: media_ref -> landing page hero image)
```

**Mutations to execute:**

1. `initializeProjectFolders({ organizationId: <ORG_ID>, projectId: <PROJECT_ID> })`
2. `createVirtualFile({ sessionId, projectId: <PROJECT_ID>, name: "campaign-brief", parentPath: "/notes", content: "<campaign brief markdown>" })`
3. `createVirtualFile({ sessionId, projectId: <PROJECT_ID>, name: "sequence-copy", parentPath: "/notes", content: "<all 5 email drafts>" })`
4. `captureBuilderApp({ projectId: <PROJECT_ID>, builderAppId: <LANDING_PAGE_APP_ID> })`
5. `captureBuilderApp({ projectId: <PROJECT_ID>, builderAppId: <THANK_YOU_APP_ID> })`
6. `captureLayerWorkflow({ projectId: <PROJECT_ID>, layerWorkflowId: <LEAD_CAPTURE_WF_ID> })`
7. `captureLayerWorkflow({ projectId: <PROJECT_ID>, layerWorkflowId: <QUALIFICATION_WF_ID> })` -- if using Workflow 3

---

## 7. Data Flow Diagram

```
                                    LEAD GENERATION FUNNEL - DATA FLOW
                                    ===================================

  END CUSTOMER                    PLATFORM (L4YERCAK3)                        EXTERNAL SYSTEMS
  ============                    ====================                        ================

  +------------------+
  | Visits Landing   |
  | Page (Builder)   |
  +--------+---------+
           |
           v
  +------------------+
  | Fills Out Form   |-----> submitPublicForm({ formId, responses, metadata })
  | (Registration)   |
  +--------+---------+
           |
           |         +----------------------------------------------------------+
           |         |  WORKFLOW 1: Lead Capture                                 |
           |         |                                                          |
           +-------->|  trigger_form_submitted                                  |
                     |         |                                                |
                     |         | (output -> input)                              |
                     |         v                                                |
                     |  lc_crm [create-contact]                                 |
                     |  -> creates objects { type: "crm_contact",               |
                     |     subtype: "lead", tags: ["lead-magnet"] }             |
                     |         |                                                |
                     |         +------------+-------------+                     |
                     |         |            |             |                     |
                     |    (output->input) (output->input) (output->input)       |
                     |         |            |             |                     |
                     |         v            v             v                     |
                     |    lc_email     activecampaign  lc_crm                   |
                     |    [send-       [add_contact]   [move-pipeline-stage     |
                     |    confirmation       |          -> "new_lead"]          |
                     |    -email]            |                                  |
                     |         |        (output->input)           +----------+  |
                     |         |             v                    |          |  |
                     |         |        activecampaign  -------->| Active   |  |
                     |         |        [add_tag]                | Campaign |  |
                     |         |             |                   |          |  |
                     |         |        (output->input)          +----------+  |
                     |         |             v                                  |
                     |         |        activecampaign                          |
                     |         |        [add_to_list]                           |
                     |         |                                                |
                     +----------------------------------------------------------+
                     |
                     |  SEQUENCE: Soap Opera (nachher)
                     |
                     |  Step 1: Immediate .... "Here's your [lead magnet]"
                     |  Step 2: +1 day ....... "The backstory"
                     |  Step 3: +3 days ...... "The moment everything changed"
                     |  Step 4: +5 days ...... "The hidden benefit"
                     |  Step 5: +7 days ...... "Here's what to do next" + CTA
                     |
                     +----------------------------------------------------------+
                     |
                     |  WORKFLOW 3: Lead Qualification (optional)
                     |
                     |  trigger_contact_updated
                     |         |
                     |    (output -> input)
                     |         v
                     |    if_then [has phone + challenge + email?]
                     |         |
                     |    (true -> input)
                     |         v
                     |    lc_crm [move-pipeline-stage -> "qualified"]
                     |         |
                     |    (output -> input)      (output -> input)
                     |         v                       v
                     |    lc_email               activecampaign
                     |    [send-admin-           [add_to_automation
                     |     notification]          -> sales sequence]
                     |
                     +----------------------------------------------------------+

  PIPELINE PROGRESSION:

  [new_lead] --> [contacted] --> [qualified] --> [proposal] --> [closed_won]
                                                           \--> [closed_lost]
```

---

## 8. Customization Points

### Must-Customize (deployment will fail or be meaningless without these)

| Item | Why | Where |
|------|-----|-------|
| Lead magnet name | Appears in landing page headline, confirmation email, sequence emails | Builder landing page, `lc_email` node config `subject` and `body`, sequence step content |
| Lead magnet download link | Delivers the actual asset | `lc_email` node config `body`, thank-you page |
| Form qualifying field(s) | The select/radio question must match the client's industry | Form `fields` array -- change label, options |
| Email sender identity | From name 和 reply-to address | `lc_email` node config, sequence step content signature |
| CRM pipeline stage names | Must match the client's sales process terminology | Pipeline definition, `lc_crm` `move-pipeline-stage` config `pipelineStageId` values |
| ActiveCampaign list ID | The AC list to add contacts to | `ac-3` node config `listId` |
| ActiveCampaign tag(s) | Tags must be meaningful for the client's segmentation | `ac-2` node config `tag` |
| Admin notification email | Sales team email for qualified lead alerts | Workflow 3 `email-1` node config `to` |

### Should-Customize (significantly improves conversion and relevance)

| Item | Why | Default |
|------|-----|---------|
| Landing page copy | StoryBrand framework: identify the hero's problem, position agency's client as the guide | Generic placeholder copy |
| Sequence email content | Must speak to ICP's specific pain points, use industry language | Generic Soap Opera framework with placeholder content |
| ActiveCampaign automation IDs | Client may have existing automations to integrate | No automation enrollment |
| Social proof content | Real testimonials and statistics convert better | Placeholder testimonial blocks |
| Thank-you page next-step CTA | Should point to the client's highest-value conversion action | Generic "book a consultation" |
| Pipeline deal values | Setting `pipelineDealValue` helps with revenue forecasting | No deal value set |

### Can-Use-Default (work out of the box for most deployments)

| Item | Default Value |
|------|--------------|
| Form field types and order | email (req), firstName (req), lastName (opt), phone (opt), companyName (opt), qualifying select (req) |
| Workflow node execution order | trigger -> crm -> email + activecampaign (parallel) -> pipeline stage |
| Sequence timing | Immediate, +1 day, +3 days, +5 days, +7 days |
| Sequence channel | `email` for all steps |
| File system folder structure | `/builder`, `/layers`, `/notes`, `/assets` |
| Contact subtype | `lead` |
| Project subtype | `campaign` |
| Workflow status progression | `draft` -> `ready` -> `active` |

---

## 9. Common Pitfalls

### What Breaks

| Pitfall | Symptom | Fix |
|---------|---------|-----|
| Form not linked to workflow | Form submissions do not trigger the Lead Capture Workflow | Create objectLink: `{ sourceObjectId: <WORKFLOW_ID>, targetObjectId: <FORM_ID>, linkType: "workflow_form" }`. Also ensure `trigger_form_submitted` node config has the correct `formId`. |
| ActiveCampaign integration not connected | `activecampaign` nodes fail silently or error | Verify the agency's ActiveCampaign API credentials are configured in the organization's integration settings before activating the workflow. |
| Sequence not enrolled after contact creation | Leads receive confirmation email but no follow-up sequence | Ensure `objectLink` exists: `{ sourceObjectId: <WORKFLOW_ID>, targetObjectId: <SEQUENCE_ID>, linkType: "workflow_sequence" }`. The sequence trigger event must be `form_submitted` or `manual_enrollment`. |
| Pipeline stage IDs mismatch | `move-pipeline-stage` action fails or moves to wrong stage | The `pipelineStageId` values in `lc_crm` node configs must exactly match the stage IDs defined in the CRM pipeline. Copy-paste, do not retype. |
| Missing email sender configuration | Emails fail to send or land in spam | Confirm the organization has a verified sender domain and the `lc_email` node `to` field uses valid template variables. |
| Form `formId` placeholder not replaced | Workflow trigger never fires | After creating the form, update the `trigger_form_submitted` node config with the actual `formId` returned by `createForm`. Then call `saveWorkflow` again. |
| Workflow left in `draft` status | No automations execute | After saving all nodes/edges, call `updateWorkflowStatus({ status: "active" })`. |
| Paid variant missing product + checkout link | Payment trigger never fires | For paid lead magnets: create the product, then create `objectLink` with `linkType: "checkout_product"` and `linkType: "product_form"`. |

### Pre-Launch Self-Check List

1. Form exists and is published (`publishForm` was called).
2. Form `formId` is set in `trigger_form_submitted` node config.
3. `objectLink` with `linkType: "workflow_form"` connects workflow to form.
4. `objectLink` with `linkType: "workflow_sequence"` connects workflow to sequence.
5. All `pipelineStageId` values in `lc_crm` nodes match actual pipeline stage IDs.
6. ActiveCampaign `listId`, `tag`, and `automationId` values are real (not placeholders).
7. `lc_email` sender identity is configured and verified.
8. Lead magnet download link is live and accessible.
9. Landing page `formSettings.redirectUrl` points to the thank-you page.
10. All workflows have `status: "active"`.
11. Sequence has 5 steps with correct timing offsets.
12. Builder apps (landing page, thank-you page) are deployed.

---

## 10. Example Deployment Scenario

### Scenario: Dental Practice Lead Generation Funnel

A marketing agency ("Smile Digital Agency") sets up a lead generation funnel for their client, "Downtown Dental Associates." The lead magnet is a free PDF: **"The Complete Guide to Dental Implants: What Every Patient Should Know."**

---

### Step 1: Create the Project

```
createProject({
  sessionId: "<SESSION_ID>",
  organizationId: "<ORG_ID>",
  name: "Downtown Dental - Implant Guide Lead Gen",
  subtype: "campaign",
  description: "Lead generation funnel for dental implant guide PDF. Target: adults 35-65 considering implants.",
  startDate: 1706745600000,
  endDate: 1709424000000
})
// Returns: projectId = "proj_dental_implant_001"
```

```
initializeProjectFolders({
  organizationId: "<ORG_ID>",
  projectId: "proj_dental_implant_001"
})
```

---

### Step 2: Create the Registration Form

```
createForm({
  sessionId: "<SESSION_ID>",
  organizationId: "<ORG_ID>",
  name: "Dental Implant Guide Request Form",
  description: "Captures leads requesting the free dental implant guide",
  fields: [
    { "type": "email",  "label": "Email Address",        "required": true,  "placeholder": "you@email.com" },
    { "type": "text",   "label": "First Name",           "required": true,  "placeholder": "Jane" },
    { "type": "text",   "label": "Last Name",            "required": false, "placeholder": "Smith" },
    { "type": "phone",  "label": "Phone Number",         "required": false, "placeholder": "+1 (555) 000-0000" },
    { "type": "select", "label": "What best describes your situation?", "required": true,
      "options": [
        "I'm missing one or more teeth",
        "I have dentures but want a permanent solution",
        "My dentist recommended implants",
        "I'm researching options for a family member",
        "Just curious about the procedure"
      ]
    },
    { "type": "select", "label": "When are you looking to start treatment?", "required": false,
      "options": ["Within 1 month", "1-3 months", "3-6 months", "Not sure yet"]
    }
  ],
  formSettings: {
    "redirectUrl": "/thank-you-implant-guide",
    "notifications": { "adminEmail": true, "respondentEmail": true },
    "submissionBehavior": "redirect"
  }
})
// Returns: formId = "form_dental_implant_001"
```

```
publishForm({ sessionId: "<SESSION_ID>", formId: "form_dental_implant_001" })
```

---

### Step 3: Create the CRM Pipeline

The pipeline is configured within the organization's CRM settings with these stages:

| Stage ID | Stage Name | Description |
|----------|-----------|-------------|
| `new_lead` | New Patient Lead | Downloaded the implant guide |
| `contacted` | Consultation Booked | Front desk called and booked free consultation |
| `qualified` | Consultation Completed | Patient attended, implant candidacy confirmed |
| `proposal` | Treatment Plan Presented | Implant treatment plan and pricing shared |
| `closed_won` | Treatment Accepted | Patient accepted, procedure scheduled |
| `closed_lost` | Not Proceeding | Patient declined or chose another provider |

---

### Step 4: Create the Lead Capture Workflow

```
createWorkflow({
  sessionId: "<SESSION_ID>",
  name: "Dental Implant Lead Capture",
  description: "Captures implant guide requests, creates CRM lead, sends PDF, syncs to ActiveCampaign"
})
// Returns: workflowId = "wf_dental_lead_001"
```

```
saveWorkflow({
  sessionId: "<SESSION_ID>",
  workflowId: "wf_dental_lead_001",
  name: "Dental Implant Lead Capture",
  nodes: [
    {
      "id": "trigger-1",
      "type": "trigger_form_submitted",
      "position": { "x": 100, "y": 200 },
      "config": { "formId": "form_dental_implant_001" },
      "status": "ready",
      "label": "Implant Guide Form Submitted"
    },
    {
      "id": "crm-1",
      "type": "lc_crm",
      "position": { "x": 350, "y": 200 },
      "config": {
        "action": "create-contact",
        "contactType": "lead",
        "tags": ["implant-guide", "dental-lead", "downtown-dental"],
        "mapFields": {
          "email": "{{trigger.email}}",
          "firstName": "{{trigger.firstName}}",
          "lastName": "{{trigger.lastName}}",
          "phone": "{{trigger.phone}}",
          "customFields": {
            "situation": "{{trigger.whatBestDescribesYourSituation}}",
            "timeline": "{{trigger.whenAreYouLookingToStartTreatment}}"
          }
        }
      },
      "status": "ready",
      "label": "Create Patient Lead"
    },
    {
      "id": "email-1",
      "type": "lc_email",
      "position": { "x": 600, "y": 100 },
      "config": {
        "action": "send-confirmation-email",
        "to": "{{crm-1.output.email}}",
        "subject": "Your Free Dental Implant Guide is Here",
        "body": "Hi {{crm-1.output.firstName}},\n\nThank you for requesting The Complete Guide to Dental Implants.\n\nDownload your guide here: https://assets.downtowndental.com/implant-guide.pdf\n\nThis guide covers:\n- The different types of dental implants\n- What to expect during the procedure\n- Recovery timeline and care instructions\n- Cost ranges and financing options\n\nOver the next few days, I'll share some insights from Dr. Martinez about common questions patients have.\n\nTo your smile,\nThe Downtown Dental Team\n\nP.S. If you'd like to skip ahead and chat with us directly, book a free consultation: https://downtowndental.com/book"
      },
      "status": "ready",
      "label": "Send Implant Guide Email"
    },
    {
      "id": "ac-1",
      "type": "activecampaign",
      "position": { "x": 600, "y": 300 },
      "config": {
        "action": "add_contact",
        "email": "{{crm-1.output.email}}",
        "firstName": "{{crm-1.output.firstName}}",
        "lastName": "{{crm-1.output.lastName}}"
      },
      "status": "ready",
      "label": "Add to ActiveCampaign"
    },
    {
      "id": "ac-2",
      "type": "activecampaign",
      "position": { "x": 850, "y": 300 },
      "config": {
        "action": "add_tag",
        "contactEmail": "{{crm-1.output.email}}",
        "tag": "implant-guide-download"
      },
      "status": "ready",
      "label": "Tag: Implant Guide"
    },
    {
      "id": "ac-3",
      "type": "activecampaign",
      "position": { "x": 1100, "y": 300 },
      "config": {
        "action": "add_to_list",
        "contactEmail": "{{crm-1.output.email}}",
        "listId": "ac_list_dental_leads_2024"
      },
      "status": "ready",
      "label": "Add to Dental Leads List"
    },
    {
      "id": "crm-2",
      "type": "lc_crm",
      "position": { "x": 600, "y": 500 },
      "config": {
        "action": "move-pipeline-stage",
        "contactId": "{{crm-1.output.contactId}}",
        "pipelineStageId": "new_lead"
      },
      "status": "ready",
      "label": "Set Pipeline: New Patient Lead"
    }
  ],
  edges: [
    { "id": "e-1", "source": "trigger-1", "target": "crm-1",  "sourceHandle": "output", "targetHandle": "input" },
    { "id": "e-2", "source": "crm-1",     "target": "email-1", "sourceHandle": "output", "targetHandle": "input" },
    { "id": "e-3", "source": "crm-1",     "target": "ac-1",    "sourceHandle": "output", "targetHandle": "input" },
    { "id": "e-4", "source": "ac-1",      "target": "ac-2",    "sourceHandle": "output", "targetHandle": "input" },
    { "id": "e-5", "source": "ac-2",      "target": "ac-3",    "sourceHandle": "output", "targetHandle": "input" },
    { "id": "e-6", "source": "crm-1",     "target": "crm-2",   "sourceHandle": "output", "targetHandle": "input" }
  ],
  triggers: [{ "type": "trigger_form_submitted", "config": { "formId": "form_dental_implant_001" } }]
})
```

```
updateWorkflowStatus({
  sessionId: "<SESSION_ID>",
  workflowId: "wf_dental_lead_001",
  status: "active"
})
```

---

### Step 5: Create the Soap Opera Sequence

**Object:** `type: "automation_sequence"`, `subtype: "nachher"`, `name: "Dental Implant Nurture Sequence"`

**Trigger event:** `form_submitted`

**Steps:**

| Step | Channel | Timing | Subject | Body Summary |
|------|---------|--------|---------|-------------|
| 1 | `email` | `{ offset: 0, unit: "minutes", referencePoint: "trigger_event" }` | "Your Free Dental Implant Guide is Here" | Deliver the PDF link. Introduce Dr. Martinez as the guide. Mention the practice's 15+ years of implant experience. End with: "Over the next few days, I'll share some insights that most dental offices won't tell you." |
| 2 | `email` | `{ offset: 1, unit: "days", referencePoint: "trigger_event" }` | "Why Dr. Martinez Became an Implant Specialist" | Origin story: Dr. Martinez saw patients struggling with ill-fitting dentures. She trained at [institute] specifically to offer better solutions. Build rapport and trust. End with a question: "Have you been dealing with [common pain point]?" |
| 3 | `email` | `{ offset: 3, unit: "days", referencePoint: "trigger_event" }` | "The Moment That Changed Everything for Sarah" | Patient success story (epiphany bridge). Sarah was terrified of the procedure, almost didn't come in, but after a 30-minute consultation she realized modern implants are nothing like she imagined. Before/after transformation. |
| 4 | `email` | `{ offset: 5, unit: "days", referencePoint: "trigger_event" }` | "The Benefit Nobody Talks About" | Beyond aesthetics: implants prevent bone loss, improve nutrition (can eat properly), boost confidence in professional settings. Achievement story of a patient who got a promotion after regaining their smile. |
| 5 | `email` | `{ offset: 7, unit: "days", referencePoint: "trigger_event" }` | "Your Next Step (Free Consultation This Week)" | Urgency: "We have 3 consultation slots open this week." CTA: Book a free 30-minute implant consultation. Include direct booking link. Mention financing options available. Close with "Even if you're not ready, a consultation gives you the information you need to make the right decision." |

---

### Step 6: Link All Objects

```
// Link workflow to form
objectLinks.create({
  sourceObjectId: "wf_dental_lead_001",
  targetObjectId: "form_dental_implant_001",
  linkType: "workflow_form"
})

// Link workflow to sequence
objectLinks.create({
  sourceObjectId: "wf_dental_lead_001",
  targetObjectId: "<SEQUENCE_ID>",
  linkType: "workflow_sequence"
})
```

---

### Step 7: Populate the File System

```
createVirtualFile({
  sessionId: "<SESSION_ID>",
  projectId: "proj_dental_implant_001",
  name: "campaign-brief",
  parentPath: "/notes",
  content: "# Downtown Dental - Implant Guide Campaign\n\n## Objective\nGenerate qualified leads for dental implant consultations.\n\n## Target ICP\nAdults 35-65, missing teeth or wearing dentures, researching permanent solutions, located within 30 miles of practice.\n\n## Lead Magnet\nThe Complete Guide to Dental Implants (PDF, 12 pages)\n\n## KPIs\n- 100 leads/month\n- 20% consultation booking rate\n- 10% treatment acceptance rate\n\n## Budget\nAd spend: $2,000/month (Facebook + Google)\nPlatform: L4YERCAK3 subscription"
})

createVirtualFile({
  sessionId: "<SESSION_ID>",
  projectId: "proj_dental_implant_001",
  name: "sequence-copy",
  parentPath: "/notes",
  content: "# Soap Opera Sequence - Dental Implant Nurture\n\n## Email 1: Immediate - Guide Delivery\nSubject: Your Free Dental Implant Guide is Here\n[Full email body as specified in Step 5, Step 1]\n\n## Email 2: +1 Day - Backstory\nSubject: Why Dr. Martinez Became an Implant Specialist\n[Full email body]\n\n## Email 3: +3 Days - Epiphany Bridge\nSubject: The Moment That Changed Everything for Sarah\n[Full email body]\n\n## Email 4: +5 Days - Hidden Benefit\nSubject: The Benefit Nobody Talks About\n[Full email body]\n\n## Email 5: +7 Days - CTA\nSubject: Your Next Step (Free Consultation This Week)\n[Full email body]"
})

captureBuilderApp({
  projectId: "proj_dental_implant_001",
  builderAppId: "<LANDING_PAGE_APP_ID>"
})

captureBuilderApp({
  projectId: "proj_dental_implant_001",
  builderAppId: "<THANK_YOU_PAGE_APP_ID>"
})

captureLayerWorkflow({
  projectId: "proj_dental_implant_001",
  layerWorkflowId: "wf_dental_lead_001"
})
```

---

### Complete Object Inventory

| # | Object Type | Subtype | Name | Key Detail |
|---|------------|---------|------|-----------|
| 1 | `project` | `campaign` | "Downtown Dental - Implant Guide Lead Gen" | Container for all assets |
| 2 | `form` | `registration` | "Dental Implant Guide Request Form" | 6 fields, published |
| 3 | `layer_workflow` | `workflow` | "Dental Implant Lead Capture" | 7 nodes, 6 edges, active |
| 4 | `automation_sequence` | `nachher` | "Dental Implant Nurture Sequence" | 5 emails over 7 days |
| 5 | `builder_app` | `template_based` | "Implant Guide Landing Page" | Hero + form + social proof |
| 6 | `builder_app` | `template_based` | "Implant Guide Thank You Page" | Confirmation + download + CTA |

| # | Link Type | Source | Target |
|---|----------|--------|--------|
| 1 | `workflow_form` | Workflow (3) | Form (2) |
| 2 | `workflow_sequence` | Workflow (3) | Sequence (4) |

### Credit Cost Estimate

| Action | Count | Credits Each | Total |
|--------|-------|-------------|-------|
| Behavior: create-contact | 1 per lead | 1 | 1 |
| Behavior: move-pipeline-stage | 1 per lead | 1 | 1 |
| Behavior: send-confirmation-email | 1 per lead | 1 | 1 |
| Behavior: activecampaign-sync (add_contact) | 1 per lead | 1 | 1 |
| Behavior: activecampaign-sync (add_tag) | 1 per lead | 1 | 1 |
| Behavior: activecampaign-sync (add_to_list) | 1 per lead | 1 | 1 |
| Sequence: 5 emails | 5 per lead | 1 | 5 |
| **Total per lead** | | | **11 credits** |

For 100 leads/month: approximately 1,100 credits/month.
