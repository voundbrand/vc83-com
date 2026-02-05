# Skill: Fundraising / Donations

> References: `_SHARED.md` for all ontology definitions, mutation signatures, node types, and link types.

---

## 1. Purpose

This skill builds a complete fundraising and donation system for a nonprofit or charity organization. The deployment creates tiered donation products (one-time and recurring), a donor-facing landing page with an embedded donation form, a checkout flow integrated with payment processing, CRM contact tracking for all donors, automated tax receipt generation via the invoicing system, thank-you email sequences, impact reporting automation, and donor stewardship workflows that segment and nurture donors based on giving level. The system handles major donor alerts, recurring sustainer management, year-end appeals, and lapsed donor re-engagement. The three-layer relationship applies: the L4YERCAK3 platform provides the infrastructure, the agency configures and deploys the fundraising system for their nonprofit client, and the nonprofit's donors are the end customers entering the funnel.

---

## 2. Ontologies Involved

### Objects (`objects` table)

| type | subtype | customProperties used |
|------|---------|----------------------|
| `product` | `digital` | `productCode`, `description`, `price` (cents), `currency`, `taxBehavior`, `maxQuantity` -- one product per donation tier plus a custom-amount product |
| `crm_contact` | `customer` | `firstName`, `lastName`, `email`, `phone`, `contactType`, `tags`, `pipelineStageId`, `pipelineDealValue`, `customFields` (dedicationType, tributeName, isAnonymous, isRecurring, totalGiven, firstDonationDate, lastDonationDate) |
| `form` | `registration` | `fields` (array of field objects), `formSettings` (redirect URL, notifications), `submissionWorkflow` |
| `layer_workflow` | `workflow` | Full `LayerWorkflowData`: `nodes`, `edges`, `metadata`, `triggers` |
| `automation_sequence` | `nachher` | Steps array with `channel`, `timing`, `content` -- immediate thank you, impact story, progress update |
| `automation_sequence` | `lifecycle` | Steps array with `channel`, `timing`, `content` -- re-engagement, annual appeal, upgrade ask |
| `builder_app` | `template_based` | Donation landing page, thank-you/confirmation page, campaign progress page files |
| `project` | `campaign` | `projectCode`, `description`, `status`, `startDate`, `endDate`, `budget`, `milestones` |

### Object Links (`objectLinks` table)

| linkType | sourceObjectId | targetObjectId |
|----------|---------------|----------------|
| `workflow_form` | workflow (donation processing) | form (donor registration) |
| `workflow_sequence` | workflow (donation processing) | sequence (donor stewardship nachher) |
| `workflow_sequence` | workflow (recurring donation management) | sequence (sustainer lifecycle) |
| `product_form` | product (each donation tier) | form (donor registration) |
| `checkout_product` | checkout transaction | product (donation tier) |
| `project_contact` | project (campaign) | CRM contact (nonprofit stakeholder) |

---

## 3. Builder Components

### Donation Landing Page

The Builder generates a donation landing page (`builder_app`, subtype: `template_based`) with these sections:

1. **Cause Story Section** -- Compelling narrative about the organization's mission and who they serve. Uses StoryBrand framework: the beneficiaries are the heroes, the donor is the guide who empowers transformation. Hero image of impact (rescued animal, built shelter, served meals).
2. **Impact Statistics Section** -- 3-4 key metrics displayed as large numbers with labels. Examples: "2,400 animals rescued," "$1.2M raised last year," "98% of donations go directly to programs."
3. **Donation Tiers Section** -- Card-based layout showing each tier with name, amount, impact statement, and "Donate" button. Highlighted/recommended tier uses a visual badge ("Most Popular" or "Best Value"). Custom amount option at the end.
4. **Donor Form Section** -- Embedded registration form (see Form below). Renders inline below the tiers or in a modal triggered by tier selection.
5. **Recurring Option Section** -- Toggle or radio group: "Make this a monthly gift" with explanation of sustainer benefits. Shows monthly equivalent for each tier.
6. **Social Proof Section** -- Donor testimonials (2-3 quotes), trust badges (GuideStar/Charity Navigator ratings, 501(c)(3) badge), total raised progress bar.
7. **Footer** -- Tax deductibility notice, EIN/Tax ID, privacy policy link, organization contact info.

**File:** `/builder/donation-page/index.html`

### Thank-You / Confirmation Page

Displayed after successful donation (configured via `formSettings.redirectUrl`):

1. **Confirmation Message** -- "Thank you, [firstName]! Your generous gift of $[amount] makes a real difference."
2. **Tax Receipt Info** -- "A tax-deductible receipt has been sent to [email]. Please keep it for your records. Our Tax ID is [TAX_ID]."
3. **Impact Message** -- Specific impact statement matching their tier: "Your $100 gift sponsors one month of shelter care for a rescue animal."
4. **Share Buttons** -- Social sharing with pre-filled text: "I just donated to [Org Name]! Join me in supporting [cause]. [link]"
5. **Next Step CTA** -- "Want to multiply your impact? Share this campaign with friends" or "Become a monthly sustainer."

**File:** `/builder/thank-you-page/index.html`

### Campaign Progress Page (Optional)

Displays real-time campaign progress:

1. **Thermometer/Progress Bar** -- Visual showing amount raised vs. goal. Percentage and dollar amount displayed.
2. **Recent Donors** -- Scrolling list of recent donations (first name + tier, or "Anonymous Donor").
3. **Milestone Markers** -- Visual markers on the progress bar at 25%, 50%, 75%, 100%.
4. **Campaign Deadline** -- Countdown timer if the campaign has an end date.

**File:** `/builder/campaign-progress/index.html`

### Donor Form

**Object:** `type: "form"`, `subtype: "registration"`

**Fields array:**

```json
[
  { "type": "text",    "label": "First Name",          "required": true,  "placeholder": "Jane" },
  { "type": "text",    "label": "Last Name",           "required": true,  "placeholder": "Smith" },
  { "type": "email",   "label": "Email Address",       "required": true,  "placeholder": "you@email.com" },
  { "type": "phone",   "label": "Phone Number",        "required": false, "placeholder": "+1 (555) 000-0000" },
  { "type": "number",  "label": "Donation Amount",     "required": true,  "placeholder": "100" },
  { "type": "radio",   "label": "Gift Frequency",      "required": true,  "options": ["One-Time Gift", "Monthly Recurring"] },
  { "type": "select",  "label": "Dedication Type",     "required": false, "options": ["None", "In Honor Of", "In Memory Of"] },
  { "type": "text",    "label": "Tribute Name",        "required": false, "placeholder": "Name of person being honored or remembered" },
  { "type": "checkbox","label": "Make my donation anonymous", "required": false },
  { "type": "textarea","label": "Message (optional)",  "required": false, "placeholder": "Leave a message of support..." }
]
```

**formSettings:**
```json
{
  "redirectUrl": "/thank-you-donation",
  "notifications": { "adminEmail": true, "respondentEmail": true },
  "submissionBehavior": "redirect"
}
```

> **Customization note:** The "Donation Amount" field may be pre-filled when a donor clicks a specific tier button on the landing page. The "Dedication Type" and "Tribute Name" fields use conditional logic: "Tribute Name" is only shown when "Dedication Type" is not "None". See Section 8.

---

## 4. Layers Automations

### Workflow 1: Donation Processing (Required)

**Object:** `type: "layer_workflow"`, `subtype: "workflow"`, `name: "Donation Processing Workflow"`

**Trigger:** `trigger_payment_received`

**Nodes:**

| id | type | label | config | status | position |
|----|------|-------|--------|--------|----------|
| `trigger-1` | `trigger_payment_received` | "Donation Payment Received" | `{ "paymentProvider": "any" }` | `ready` | `{ "x": 100, "y": 300 }` |
| `checkout-1` | `lc_checkout` | "Create Donation Transaction" | `{ "action": "create-transaction", "productId": "{{trigger.productId}}", "amount": "{{trigger.amount}}", "currency": "{{trigger.currency}}", "metadata": { "donationType": "donation", "campaignId": "<CAMPAIGN_PROJECT_ID>" } }` | `ready` | `{ "x": 350, "y": 300 }` |
| `crm-1` | `lc_crm` | "Create or Update Donor Contact" | `{ "action": "create-contact", "contactType": "customer", "tags": ["donor", "build-the-new-shelter-fund"], "mapFields": { "email": "{{trigger.customerEmail}}", "firstName": "{{trigger.customerFirstName}}", "lastName": "{{trigger.customerLastName}}", "phone": "{{trigger.customerPhone}}", "customFields": { "dedicationType": "{{trigger.metadata.dedicationType}}", "tributeName": "{{trigger.metadata.tributeName}}", "isAnonymous": "{{trigger.metadata.isAnonymous}}", "isRecurring": "{{trigger.metadata.isRecurring}}", "lastDonationDate": "{{trigger.timestamp}}", "totalGiven": "{{trigger.amount}}" } } }` | `ready` | `{ "x": 600, "y": 300 }` |
| `invoice-1` | `lc_invoicing` | "Generate Tax Receipt" | `{ "action": "generate-invoice", "transactionId": "{{checkout-1.output.transactionId}}", "contactId": "{{crm-1.output.contactId}}", "metadata": { "taxDeductible": true, "taxId": "47-1234567", "organizationName": "Second Chance Animal Rescue", "receiptType": "donation" } }` | `ready` | `{ "x": 850, "y": 150 }` |
| `email-1` | `lc_email` | "Send Thank You + Tax Receipt" | `{ "action": "send-confirmation-email", "to": "{{crm-1.output.email}}", "subject": "Thank You for Your Generous Donation to Second Chance Animal Rescue", "body": "Dear {{crm-1.output.firstName}},\n\nThank you for your generous donation of ${{trigger.amountFormatted}} to Second Chance Animal Rescue and our Build the New Shelter Fund campaign.\n\nYour gift makes a real difference. Here is what your donation provides:\n{{trigger.impactStatement}}\n\nYour tax-deductible receipt is attached to this email. For your records:\n- Donation Amount: ${{trigger.amountFormatted}}\n- Date: {{trigger.dateFormatted}}\n- Tax ID (EIN): 47-1234567\n- Organization: Second Chance Animal Rescue, Inc.\n\nNo goods or services were provided in exchange for this contribution.\n\nWith gratitude,\nThe Second Chance Animal Rescue Team\n\nP.S. Want to multiply your impact? Share our campaign with friends and family: https://secondchanceanimalrescue.org/donate" }` | `ready` | `{ "x": 850, "y": 350 }` |
| `ac-1` | `activecampaign` | "Sync Donor to ActiveCampaign" | `{ "action": "add_contact", "email": "{{crm-1.output.email}}", "firstName": "{{crm-1.output.firstName}}", "lastName": "{{crm-1.output.lastName}}" }` | `ready` | `{ "x": 850, "y": 550 }` |
| `ac-2` | `activecampaign` | "Tag Donor in ActiveCampaign" | `{ "action": "add_tag", "contactEmail": "{{crm-1.output.email}}", "tag": "donor-shelter-fund" }` | `ready` | `{ "x": 1100, "y": 550 }` |
| `if-1` | `if_then` | "Is Major Donor?" | `{ "expression": "{{trigger.amount}} >= 25000" }` | `ready` | `{ "x": 1100, "y": 300 }` |
| `crm-2` | `lc_crm` | "Move to Pipeline Stage" | `{ "action": "move-pipeline-stage", "contactId": "{{crm-1.output.contactId}}", "pipelineStageId": "first_time_donor" }` | `ready` | `{ "x": 1350, "y": 150 }` |
| `crm-3` | `lc_crm` | "Move to Major Donor" | `{ "action": "move-pipeline-stage", "contactId": "{{crm-1.output.contactId}}", "pipelineStageId": "major_donor" }` | `ready` | `{ "x": 1350, "y": 300 }` |

**Edges:**

| id | source | target | sourceHandle | targetHandle |
|----|--------|--------|-------------|-------------|
| `e-1` | `trigger-1` | `checkout-1` | `output` | `input` |
| `e-2` | `checkout-1` | `crm-1` | `output` | `input` |
| `e-3` | `crm-1` | `invoice-1` | `output` | `input` |
| `e-4` | `crm-1` | `email-1` | `output` | `input` |
| `e-5` | `crm-1` | `ac-1` | `output` | `input` |
| `e-6` | `ac-1` | `ac-2` | `output` | `input` |
| `e-7` | `crm-1` | `if-1` | `output` | `input` |
| `e-8` | `if-1` | `crm-2` | `false` | `input` |
| `e-9` | `if-1` | `crm-3` | `true` | `input` |

**Mutations to execute:**

1. `createWorkflow({ sessionId, name: "Donation Processing Workflow", description: "Processes donations, creates donor contacts, generates tax receipts, sends thank-you emails, syncs to ActiveCampaign, routes by donation amount" })`
2. `saveWorkflow({ sessionId, workflowId: <ID>, name: "Donation Processing Workflow", nodes: [...], edges: [...], triggers: [{ type: "trigger_payment_received", config: { paymentProvider: "any" } }] })`
3. `updateWorkflowStatus({ sessionId, workflowId: <ID>, status: "active" })`

---

### Workflow 2: Recurring Donation Management (Required)

**Object:** `type: "layer_workflow"`, `subtype: "workflow"`, `name: "Recurring Donation Management Workflow"`

**Trigger:** `trigger_payment_received`

**Nodes:**

| id | type | label | config | status | position |
|----|------|-------|--------|--------|----------|
| `trigger-1` | `trigger_payment_received` | "Payment Received" | `{ "paymentProvider": "any" }` | `ready` | `{ "x": 100, "y": 200 }` |
| `if-1` | `if_then` | "Is Recurring Donation?" | `{ "expression": "{{trigger.metadata.isRecurring}} === true" }` | `ready` | `{ "x": 350, "y": 200 }` |
| `crm-1` | `lc_crm` | "Tag as Monthly Sustainer" | `{ "action": "update-contact", "contactId": "{{trigger.contactId}}", "tags": ["monthly_sustainer", "recurring_donor"], "customFields": { "isRecurring": true, "lastDonationDate": "{{trigger.timestamp}}", "totalGiven": "{{trigger.runningTotal}}" } }` | `ready` | `{ "x": 600, "y": 100 }` |
| `crm-2` | `lc_crm` | "Move to Sustainer Stage" | `{ "action": "move-pipeline-stage", "contactId": "{{trigger.contactId}}", "pipelineStageId": "monthly_sustainer" }` | `ready` | `{ "x": 850, "y": 100 }` |
| `email-1` | `lc_email` | "Send Monthly Thank You" | `{ "action": "send-confirmation-email", "to": "{{trigger.customerEmail}}", "subject": "Your Monthly Gift to Second Chance Animal Rescue Has Been Processed", "body": "Dear {{trigger.customerFirstName}},\n\nThank you for your continued monthly support of Second Chance Animal Rescue. Your recurring gift of ${{trigger.amountFormatted}} has been successfully processed.\n\nThis month, your gift helped provide:\n{{trigger.monthlyImpactStatement}}\n\nSince you started giving monthly, you have contributed a total of ${{trigger.runningTotalFormatted}}. That is incredible.\n\nYour tax-deductible receipt for this month's gift is attached.\n\nWith gratitude,\nThe Second Chance Animal Rescue Team\n\nP.S. Know someone who loves animals as much as you? Share our mission: https://secondchanceanimalrescue.org/donate" }` | `ready` | `{ "x": 850, "y": 250 }` |
| `ac-1` | `activecampaign` | "Tag Sustainer in AC" | `{ "action": "add_tag", "contactEmail": "{{trigger.customerEmail}}", "tag": "sustainer" }` | `ready` | `{ "x": 1100, "y": 100 }` |

**Edges:**

| id | source | target | sourceHandle | targetHandle |
|----|--------|--------|-------------|-------------|
| `e-1` | `trigger-1` | `if-1` | `output` | `input` |
| `e-2` | `if-1` | `crm-1` | `true` | `input` |
| `e-3` | `crm-1` | `crm-2` | `output` | `input` |
| `e-4` | `crm-1` | `email-1` | `output` | `input` |
| `e-5` | `crm-2` | `ac-1` | `output` | `input` |

> Note: The `false` handle of `if-1` has no connection -- one-time donations are handled entirely by Workflow 1. This workflow only activates for recurring payments.

**Mutations to execute:**

1. `createWorkflow({ sessionId, name: "Recurring Donation Management Workflow", description: "Manages recurring monthly donations, tags sustainers, sends monthly thank-you emails, updates pipeline" })`
2. `saveWorkflow({ sessionId, workflowId: <ID>, name: "Recurring Donation Management Workflow", nodes: [...], edges: [...], triggers: [{ type: "trigger_payment_received", config: { paymentProvider: "any" } }] })`
3. `updateWorkflowStatus({ sessionId, workflowId: <ID>, status: "active" })`

---

### Workflow 3: Major Donor Alert (Required)

**Object:** `type: "layer_workflow"`, `subtype: "workflow"`, `name: "Major Donor Alert Workflow"`

**Trigger:** `trigger_payment_received`

**Nodes:**

| id | type | label | config | status | position |
|----|------|-------|--------|--------|----------|
| `trigger-1` | `trigger_payment_received` | "Payment Received" | `{ "paymentProvider": "any" }` | `ready` | `{ "x": 100, "y": 200 }` |
| `if-1` | `if_then` | "Amount >= $250?" | `{ "expression": "{{trigger.amount}} >= 25000" }` | `ready` | `{ "x": 350, "y": 200 }` |
| `email-1` | `lc_email` | "Notify Development Team" | `{ "action": "send-admin-notification", "to": "development@secondchanceanimalrescue.org", "subject": "Major Donation Alert: ${{trigger.amountFormatted}} from {{trigger.customerFirstName}} {{trigger.customerLastName}}", "body": "A major donation has been received. Please arrange a personal thank-you call within 24 hours.\n\nDonor Details:\n- Name: {{trigger.customerFirstName}} {{trigger.customerLastName}}\n- Email: {{trigger.customerEmail}}\n- Phone: {{trigger.customerPhone}}\n- Amount: ${{trigger.amountFormatted}}\n- Donation Tier: {{trigger.tierName}}\n- Recurring: {{trigger.metadata.isRecurring}}\n- Dedication: {{trigger.metadata.dedicationType}} - {{trigger.metadata.tributeName}}\n- Message: {{trigger.metadata.message}}\n\nRecommended Actions:\n1. Personal phone call from Executive Director within 24 hours\n2. Handwritten thank-you card mailed within 48 hours\n3. Add to major donor recognition wall (if not anonymous)\n4. Invite to upcoming donor appreciation event\n\nView donor profile in CRM: [LINK]" }` | `ready` | `{ "x": 600, "y": 100 }` |
| `crm-1` | `lc_crm` | "Move to Major Donor Stage" | `{ "action": "move-pipeline-stage", "contactId": "{{trigger.contactId}}", "pipelineStageId": "major_donor" }` | `ready` | `{ "x": 600, "y": 250 }` |
| `ac-1` | `activecampaign` | "Tag as Major Donor in AC" | `{ "action": "add_tag", "contactEmail": "{{trigger.customerEmail}}", "tag": "major_donor" }` | `ready` | `{ "x": 850, "y": 100 }` |
| `ac-2` | `activecampaign` | "Add to Major Donor List" | `{ "action": "add_to_list", "contactEmail": "{{trigger.customerEmail}}", "listId": "<AC_MAJOR_DONOR_LIST_ID>" }` | `ready` | `{ "x": 1100, "y": 100 }` |

**Edges:**

| id | source | target | sourceHandle | targetHandle |
|----|--------|--------|-------------|-------------|
| `e-1` | `trigger-1` | `if-1` | `output` | `input` |
| `e-2` | `if-1` | `email-1` | `true` | `input` |
| `e-3` | `if-1` | `crm-1` | `true` | `input` |
| `e-4` | `email-1` | `ac-1` | `output` | `input` |
| `e-5` | `ac-1` | `ac-2` | `output` | `input` |

> Note: The `false` handle of `if-1` has no connection -- donations under $250 are handled by Workflow 1 pipeline routing. This workflow only fires the admin alert and major donor tagging for gifts at or above the $250 threshold. The threshold amount (25000 cents = $250) should be adjusted to match the organization's major donor definition.

**Mutations to execute:**

1. `createWorkflow({ sessionId, name: "Major Donor Alert Workflow", description: "Sends admin notification to development team for donations >= $250, moves donor to major donor pipeline stage, tags in ActiveCampaign" })`
2. `saveWorkflow({ sessionId, workflowId: <ID>, name: "Major Donor Alert Workflow", nodes: [...], edges: [...], triggers: [{ type: "trigger_payment_received", config: { paymentProvider: "any" } }] })`
3. `updateWorkflowStatus({ sessionId, workflowId: <ID>, status: "active" })`

---

### Workflow 4: Year-End Appeal (Optional)

**Object:** `type: "layer_workflow"`, `subtype: "workflow"`, `name: "Year-End Appeal Workflow"`

**Trigger:** `trigger_schedule`

**Nodes:**

| id | type | label | config | status | position |
|----|------|-------|--------|--------|----------|
| `trigger-1` | `trigger_schedule` | "November Campaign Start" | `{ "cronExpression": "0 9 1 11 *", "timezone": "America/Chicago" }` | `ready` | `{ "x": 100, "y": 200 }` |
| `email-1` | `lc_email` | "Year-End Appeal Email" | `{ "action": "send-confirmation-email", "to": "{{donor.email}}", "subject": "Your Year-End Gift Can Change Lives Before December 31", "body": "Dear {{donor.firstName}},\n\nAs the year draws to a close, I want to share something personal with you.\n\nThis year, Second Chance Animal Rescue has rescued 847 animals, performed 1,200 veterinary procedures, and found forever homes for 623 cats and dogs. But there are still animals waiting.\n\nOur Build the New Shelter Fund has raised $112,000 of our $150,000 goal. We are so close.\n\nYour year-end gift -- in any amount -- is tax-deductible for 2026 and goes directly to completing the new shelter facility that will double our capacity.\n\nHere is what your gift provides:\n- $25 feeds a rescue animal for one week\n- $50 covers one veterinary checkup\n- $100 sponsors a month of shelter care\n- $250 funds a complete rescue operation\n- $500+ names a kennel in the new shelter\n\nDonate now: https://secondchanceanimalrescue.org/donate\n\nThank you for being part of our mission.\n\nWith hope,\nDr. Sarah Mitchell\nExecutive Director\nSecond Chance Animal Rescue\nTax ID: 47-1234567" }` | `ready` | `{ "x": 350, "y": 200 }` |
| `wait-1` | `wait_delay` | "Wait 10 Days" | `{ "duration": 10, "unit": "days" }` | `ready` | `{ "x": 600, "y": 200 }` |
| `email-2` | `lc_email` | "Reminder Email" | `{ "action": "send-confirmation-email", "to": "{{donor.email}}", "subject": "We Are 75% There -- Can You Help Us Reach Our Goal?", "body": "Dear {{donor.firstName}},\n\nGreat news -- since our last update, generous donors like you have helped us reach $125,000 of our $150,000 goal for the Build the New Shelter Fund.\n\nWe are 75% of the way there, but we still need $25,000 to break ground in January.\n\nI wanted to share a quick story. Last week, we rescued a senior dog named Biscuit from a neglect situation. He arrived malnourished, scared, and with a broken leg. Today, after surgery and round-the-clock care from our team, Biscuit is wagging his tail and learning to trust people again. He will be ready for his forever home by the new year.\n\nBiscuit is exactly why the new shelter matters. More space means more animals like him get a second chance.\n\nCan you help us close the gap? Even $25 makes a difference.\n\nDonate now: https://secondchanceanimalrescue.org/donate\n\nWith gratitude,\nDr. Sarah Mitchell\nExecutive Director" }` | `ready` | `{ "x": 850, "y": 200 }` |
| `wait-2` | `wait_delay` | "Wait Until Dec 28" | `{ "duration": 8, "unit": "days" }` | `ready` | `{ "x": 1100, "y": 200 }` |
| `email-3` | `lc_email` | "Last Chance Email" | `{ "action": "send-confirmation-email", "to": "{{donor.email}}", "subject": "Last Chance: Your Tax-Deductible Gift Must Be Made by December 31", "body": "Dear {{donor.firstName}},\n\nThis is a friendly reminder that December 31 is the deadline for tax-deductible charitable contributions for the 2026 tax year.\n\nSecond Chance Animal Rescue is a registered 501(c)(3) nonprofit (Tax ID: 47-1234567), and your donation is fully tax-deductible to the extent allowed by law.\n\nWe are now at $140,000 of our $150,000 goal. Just $10,000 more and we can begin construction on the new shelter in January.\n\nThis is your last chance to make your year-end gift count -- for the animals and for your taxes.\n\nMake your tax-deductible gift now: https://secondchanceanimalrescue.org/donate\n\nThank you for standing with us.\n\nWith hope for the new year,\nDr. Sarah Mitchell\nExecutive Director\nSecond Chance Animal Rescue\n\nP.S. Gifts of $250 or more receive a personalized impact report and invitation to our Shelter Groundbreaking Ceremony in February." }` | `ready` | `{ "x": 1350, "y": 200 }` |

**Edges:**

| id | source | target | sourceHandle | targetHandle |
|----|--------|--------|-------------|-------------|
| `e-1` | `trigger-1` | `email-1` | `output` | `input` |
| `e-2` | `email-1` | `wait-1` | `output` | `input` |
| `e-3` | `wait-1` | `email-2` | `output` | `input` |
| `e-4` | `email-2` | `wait-2` | `output` | `input` |
| `e-5` | `wait-2` | `email-3` | `output` | `input` |

**Mutations to execute:**

1. `createWorkflow({ sessionId, name: "Year-End Appeal Workflow", description: "Sends year-end appeal email series in November-December to drive tax-deductible donations before December 31" })`
2. `saveWorkflow({ sessionId, workflowId: <ID>, name: "Year-End Appeal Workflow", nodes: [...], edges: [...], triggers: [{ type: "trigger_schedule", config: { cronExpression: "0 9 1 11 *", timezone: "America/Chicago" } }] })`
3. `updateWorkflowStatus({ sessionId, workflowId: <ID>, status: "active" })`

---

## 5. CRM Pipeline Definition

### Donor Pipeline

**Pipeline Name:** "Donor Pipeline"

| Stage ID | Stage Name | Description | Automation Trigger |
|----------|-----------|-------------|-------------------|
| `prospect` | Prospect | Contact has engaged with content or visited the donation page but has not yet donated. | Auto-set when form is viewed but not submitted, or when contact is imported from external list |
| `first_time_donor` | First-Time Donor | Contact has made their first donation (any amount, one-time). | Auto-set by Workflow 1 (`crm-2` node) when amount < $250 threshold |
| `repeat_donor` | Repeat Donor | Contact has made two or more donations across separate transactions. | Auto-set by Workflow 1 when contact already has `firstDonationDate` in customFields |
| `major_donor` | Major Donor | Contact has donated $250 or more in a single transaction, or cumulative giving exceeds $1,000. | Auto-set by Workflow 3 (`crm-1` node) for single gifts >= $250; auto-set by Workflow 1 when `totalGiven` >= $1,000 |
| `monthly_sustainer` | Monthly Sustainer | Contact has an active recurring monthly donation. | Auto-set by Workflow 2 (`crm-2` node) when recurring flag is true |
| `lapsed` | Lapsed Donor | Contact has not donated in the last 12 months. Previously had at least one donation. | Set by a scheduled lifecycle sequence that checks `lastDonationDate` against current date |

---

## 6. File System Scaffold

**Project:** `type: "project"`, `subtype: "campaign"`

After calling `initializeProjectFolders({ organizationId, projectId })`, the default folders are created. Then populate:

```
/
+-- builder/
|   +-- donation-page/            (kind: builder_ref -> builder_app for donation landing page)
|   +-- thank-you-page/           (kind: builder_ref -> builder_app for thank-you/confirmation page)
|   +-- campaign-progress/        (kind: builder_ref -> builder_app for campaign progress page -- optional)
+-- layers/
|   +-- donation-processing-wf    (kind: layer_ref -> layer_workflow "Donation Processing Workflow")
|   +-- recurring-management-wf   (kind: layer_ref -> layer_workflow "Recurring Donation Management Workflow")
|   +-- major-donor-alert-wf      (kind: layer_ref -> layer_workflow "Major Donor Alert Workflow")
|   +-- year-end-appeal-wf        (kind: layer_ref -> layer_workflow "Year-End Appeal Workflow" -- optional)
+-- notes/
|   +-- campaign-brief            (kind: virtual, content: campaign objectives, target audience, fundraising goal, timeline)
|   +-- donor-communication-copy  (kind: virtual, content: all email templates, sequence drafts, appeal copy)
|   +-- impact-statements         (kind: virtual, content: impact descriptions per tier, statistics, stories)
+-- assets/
|   +-- campaign-materials/       (kind: folder)
|   |   +-- campaign-logo         (kind: media_ref -> campaign-specific logo or badge)
|   |   +-- hero-image            (kind: media_ref -> landing page hero image)
|   |   +-- impact-photos/        (kind: folder)
|   |       +-- rescue-photo-1    (kind: media_ref -> impact photo for emails and landing page)
|   |       +-- rescue-photo-2    (kind: media_ref -> impact photo)
|   +-- donor-lists/              (kind: folder)
|   |   +-- imported-prospects    (kind: virtual, content: CSV or list of imported prospect contacts)
|   +-- reports/                  (kind: folder)
|   |   +-- monthly-impact-report (kind: virtual, content: monthly impact report template)
|   |   +-- donor-summary         (kind: virtual, content: donor giving summary by tier)
|   +-- receipts/                 (kind: folder -- tax receipts are auto-generated by invoicing system)
```

**Mutations to execute:**

1. `initializeProjectFolders({ organizationId: <ORG_ID>, projectId: <PROJECT_ID> })`
2. `createVirtualFile({ sessionId, projectId: <PROJECT_ID>, name: "campaign-brief", parentPath: "/notes", content: "<campaign brief markdown>" })`
3. `createVirtualFile({ sessionId, projectId: <PROJECT_ID>, name: "donor-communication-copy", parentPath: "/notes", content: "<all email templates and sequence copy>" })`
4. `createVirtualFile({ sessionId, projectId: <PROJECT_ID>, name: "impact-statements", parentPath: "/notes", content: "<impact descriptions per tier>" })`
5. `createFolder({ sessionId, projectId: <PROJECT_ID>, name: "campaign-materials", parentPath: "/assets" })`
6. `createFolder({ sessionId, projectId: <PROJECT_ID>, name: "impact-photos", parentPath: "/assets/campaign-materials" })`
7. `createFolder({ sessionId, projectId: <PROJECT_ID>, name: "donor-lists", parentPath: "/assets" })`
8. `createFolder({ sessionId, projectId: <PROJECT_ID>, name: "reports", parentPath: "/assets" })`
9. `createFolder({ sessionId, projectId: <PROJECT_ID>, name: "receipts", parentPath: "/assets" })`
10. `captureBuilderApp({ projectId: <PROJECT_ID>, builderAppId: <DONATION_PAGE_APP_ID> })`
11. `captureBuilderApp({ projectId: <PROJECT_ID>, builderAppId: <THANK_YOU_PAGE_APP_ID> })`
12. `captureLayerWorkflow({ projectId: <PROJECT_ID>, layerWorkflowId: <DONATION_PROCESSING_WF_ID> })`
13. `captureLayerWorkflow({ projectId: <PROJECT_ID>, layerWorkflowId: <RECURRING_MANAGEMENT_WF_ID> })`
14. `captureLayerWorkflow({ projectId: <PROJECT_ID>, layerWorkflowId: <MAJOR_DONOR_ALERT_WF_ID> })`
15. `captureLayerWorkflow({ projectId: <PROJECT_ID>, layerWorkflowId: <YEAR_END_APPEAL_WF_ID> })` -- if using Workflow 4

---

## 7. Data Flow Diagram

```
                                  FUNDRAISING / DONATIONS - DATA FLOW
                                  ====================================

  DONOR                          PLATFORM (L4YERCAK3)                        EXTERNAL SYSTEMS
  =====                          ====================                        ================

  +------------------+
  | Visits Donation  |
  | Page (Builder)   |
  +--------+---------+
           |
           v
  +------------------+
  | Selects Donation |
  | Tier / Amount    |
  +--------+---------+
           |
           v
  +------------------+
  | Fills Donor Form |-----> submitPublicForm({ formId, responses, metadata })
  | (Registration)   |
  +--------+---------+
           |
           v
  +------------------+
  | Checkout / Pay   |-----> lc_checkout (create-transaction via Stripe)
  | (Stripe)         |
  +--------+---------+                                                      +----------+
           |                                                                |          |
           |         +----------------------------------------------------------+      |
           |         |  WORKFLOW 1: Donation Processing                     |   |      |
           |         |                                                     |   |      |
           +-------->|  trigger_payment_received                           |   |      |
                     |         |                                           |   |      |
                     |    (output -> input)                                |   |      |
                     |         v                                           |   |      |
                     |  lc_checkout [create-transaction]                   |   |      |
                     |         |                                           |   |      |
                     |    (output -> input)                                |   |      |
                     |         v                                           |   |      |
                     |  lc_crm [create-contact]                            |   |      |
                     |  -> creates objects { type: "crm_contact",          |   |      |
                     |     subtype: "customer", tags: ["donor"] }          |   |      |
                     |         |                                           |   |      |
                     |         +--------+---------+---------+              |   |      |
                     |         |        |         |         |              |   |      |
                     |         v        v         v         v              |   |      |
                     |   lc_invoicing lc_email  active   if_then           |   |      |
                     |   [generate-  [thank    campaign  [amount           |   |      |
                     |    invoice    you +     [add_     >= $250?]         |   |      |
                     |    tax       receipt]   contact]      |             |   |      |
                     |    receipt]      |         |     +----+----+        |   |      |
                     |         |       |    (out->in)  |         |        |   |      |
                     |         |       |         v   (true)   (false)     |   |      |
                     |         |       |    active    |         |         |   |      |
                     |         |       |    campaign  v         v         |   |      |
                     |         |       |    [add_tag] crm       crm      |   |      |
                     |         |       |              [major    [first    |   |      |
                     |         |       |              _donor]   _time]    |   |      |
                     |         |       |                                  |   |      |
                     +----------------------------------------------------------+   |
                     |                                                         |    |
                     |  WORKFLOW 2: Recurring Donation Management               |    |
                     |                                                         |    |
                     |  trigger_payment_received                               |    |
                     |         |                                               |    |
                     |    (output -> input)                                    |    |
                     |         v                                               |    |
                     |    if_then [is recurring?]                              |    |
                     |         |                                               |    |
                     |    (true -> input)                                      |    |
                     |         v                                               |    |
                     |    lc_crm [update-contact, tag: "monthly_sustainer"]    |    |
                     |         |                                               |    |
                     |    +----+----+                                          |    |
                     |    |         |                                          |    |
                     |    v         v                                     +---------+
                     | lc_crm   lc_email                                 | Active  |
                     | [move to [monthly                                 | Campaign|
                     | sustainer] thank you]     activecampaign -------->|         |
                     |    |                      [add_tag:               +---------+
                     |    +----> activecampaign   "sustainer"]
                     |          [add_tag]
                     |                                                         |
                     +----------------------------------------------------------+
                     |                                                         |
                     |  WORKFLOW 3: Major Donor Alert                           |
                     |                                                         |
                     |  trigger_payment_received                               |
                     |         |                                               |
                     |    (output -> input)                                    |
                     |         v                                               |
                     |    if_then [amount >= $250?]                            |
                     |         |                                               |
                     |    (true -> input)        (true -> input)               |
                     |         v                       v                       |
                     |    lc_email               lc_crm                        |
                     |    [send-admin-           [move to                      |
                     |     notification]          "major_donor"]               |
                     |         |                                               |
                     |    (output -> input)                                    |
                     |         v                                               |
                     |    activecampaign [add_tag: "major_donor"]              |
                     |         |                                               |
                     |    (output -> input)                                    |
                     |         v                                               |
                     |    activecampaign [add_to_list: major donors]           |
                     |                                                         |
                     +----------------------------------------------------------+
                     |
                     |  SEQUENCES
                     |
                     |  Stewardship (nachher):
                     |  Step 1: Immediate .... Thank you + tax receipt
                     |  Step 2: +7 days ...... Impact story from the field
                     |  Step 3: +30 days ..... Campaign progress update
                     |  Step 4: +90 days ..... Re-engagement / upgrade ask
                     |
                     |  Lifecycle:
                     |  Step 1: Annual ....... Year-end appeal (November)
                     |  Step 2: Anniversary .. Giving anniversary thank you
                     |  Step 3: Lapsed ....... 12-month re-engagement
                     |
                     +----------------------------------------------------------+

  DONOR PIPELINE PROGRESSION:

  [prospect] --> [first_time_donor] --> [repeat_donor] --> [major_donor]
                                                      \--> [monthly_sustainer]
                                                      \--> [lapsed]
```

---

## 8. Customization Points

### Must-Customize (deployment will fail or be meaningless without these)

| Item | Why | Where |
|------|-----|-------|
| Cause / mission description | The entire landing page narrative depends on the organization's specific mission and story | Builder donation page hero section, cause story section |
| Donation tier names, amounts, and impact statements | Each tier must reflect what the specific dollar amount provides for the specific organization | Product `name`, `price`, `description` fields; landing page tier cards |
| Organization name | Appears in all donor communications, receipts, and legal notices | `lc_email` node config `body`, invoice metadata, landing page footer, form confirmation |
| Tax ID (EIN) | Required for valid tax-deductible receipts; incorrect EIN creates legal liability | `lc_invoicing` node config `metadata.taxId`, thank-you page, email signatures, landing page footer |
| Admin notification email | Development team must receive major donor alerts at the correct address | Workflow 3 `email-1` node config `to` field |
| ActiveCampaign list ID(s) | Donor contacts must sync to the correct AC list for the organization | `ac-3` node config `listId` in Workflow 1, `ac-2` node config `listId` in Workflow 3 |
| ActiveCampaign tag names | Tags must be meaningful for the organization's donor segmentation | `ac-2` node config `tag` in Workflows 1, 2, and 3 |
| Campaign goal amount | Displayed on progress page and in appeal emails | Campaign progress page, Year-End Appeal email bodies |

### Should-Customize (significantly improves donor conversion and stewardship)

| Item | Why | Default |
|------|-----|---------|
| Thank-you email copy | Personalized, heartfelt copy converts one-time donors to recurring | Generic thank-you template with placeholder impact statements |
| Impact story content | Real stories from the organization build emotional connection | Placeholder story framework |
| Donor recognition approach | Some organizations publicly recognize donors, others keep gifts private | Anonymous option on form, no public recognition wall |
| Campaign goal and timeline | Specific goal creates urgency; timeline creates accountability | No goal amount or deadline set |
| Major donor threshold | $250 is a common threshold but varies by organization size | $250 (25000 cents) in `if_then` expression |
| Year-end appeal copy | Must reference actual achievements and real campaign progress | Generic appeal template |
| Executive director name | Personal sign-off builds trust | "[Executive Director Name]" placeholder |
| Social sharing text | Pre-filled sharing text should reference the specific cause | Generic "I just donated" template |

### Can-Use-Default (work out of the box for most fundraising deployments)

| Item | Default Value |
|------|--------------|
| Form field types and order | firstName (req), lastName (req), email (req), phone (opt), amount (req), frequency (req), dedication (opt), tribute name (opt), anonymous (opt), message (opt) |
| Pipeline stages | prospect, first_time_donor, repeat_donor, major_donor, monthly_sustainer, lapsed |
| Workflow trigger types | `trigger_payment_received` for Workflows 1-3, `trigger_schedule` for Workflow 4 |
| Sequence timing | Immediate, +7 days, +30 days, +90 days for stewardship; annual for appeals |
| Sequence channel | `email` for all steps |
| Tax receipt format | Standard invoice with tax-deductible notice and EIN |
| File system folder structure | `/builder`, `/layers`, `/notes`, `/assets` with campaign-materials, donor-lists, reports, receipts subfolders |
| Contact subtype | `customer` (donors are customers of the nonprofit) |
| Project subtype | `campaign` |
| Workflow status progression | `draft` -> `ready` -> `active` |
| Invoice type | `b2c_single` for individual donation receipts |

---

## 9. Common Pitfalls

### What Breaks

| Pitfall | Symptom | Fix |
|---------|---------|-----|
| Tax receipt not generated | Donors do not receive tax-deductible documentation; organization risks IRS compliance issues | Ensure `lc_invoicing` node is present in Workflow 1 with `action: "generate-invoice"` and correct `transactionId` and `contactId` mappings. Verify the invoice metadata includes `taxDeductible: true`, the correct `taxId`, and `organizationName`. |
| Recurring donations not tracked | Monthly sustainers appear as one-time donors; no sustainer tag or pipeline stage | Workflow 2 must have the `if_then` node checking `{{trigger.metadata.isRecurring}} === true`. Verify the payment provider passes the recurring flag in the trigger metadata. Confirm `crm-1` node applies the `monthly_sustainer` tag. |
| Major donor alert threshold wrong | Admin notifications fire for every $25 donation, or never fire at all | The `if_then` expression in Workflow 3 uses amounts in cents. $250 = 25000 cents. Verify the expression reads `{{trigger.amount}} >= 25000`, not `>= 250`. Adjust the threshold to match the organization's definition of a major donor. |
| Impact updates not sent | Donors never hear about the impact of their gift; stewardship sequence is silent | Ensure `objectLink` exists: `{ sourceObjectId: <WORKFLOW_ID>, targetObjectId: <SEQUENCE_ID>, linkType: "workflow_sequence" }`. Verify the sequence trigger event is `form_submitted` or `manual_enrollment`. Confirm all 4 sequence steps have correct timing offsets. |
| Form not linked to checkout | Donation form submissions do not trigger payment processing | The donation form must be linked to the donation products via `objectLink` with `linkType: "product_form"` for each tier product. The checkout flow must have `objectLink` with `linkType: "checkout_product"` for each product. |
| Duplicate donor contacts created | Same donor appears multiple times in CRM after repeat donations | Use `update-contact` instead of `create-contact` when the email already exists. The `lc_crm` node should check for existing contacts by email before creating new ones. Configure the node with a merge/upsert strategy. |
| Anonymous donations still show donor name | Donors who checked "anonymous" see their name in public recognition | Check the `isAnonymous` flag in all display logic. The campaign progress page "Recent Donors" section must filter anonymous donations and display "Anonymous Donor" instead of the name. |
| Year-end appeal sent to all contacts | Non-donors and prospects receive the year-end appeal, causing confusion or unsubscribes | The Year-End Appeal Workflow (Workflow 4) must filter recipients to contacts with the "donor" tag or those in the donor pipeline. Add a `filter` node after the trigger to check for donor status. |
| Tax ID missing or incorrect | Tax receipts are legally invalid; donors cannot claim deductions | Double-check the `taxId` value in `lc_invoicing` metadata and in all email templates. The EIN must match the organization's IRS determination letter exactly. |
| Dedication/tribute information lost | Donors who gave "In Memory Of" someone do not see the tribute acknowledged | Verify the form `dedicationType` and `tributeName` fields are mapped to `customFields` in the `lc_crm` node config. Ensure the thank-you email template includes conditional logic to display tribute information when present. |

### Pre-Launch Self-Check List

1. All donation tier products exist and are published (`publishProduct` was called for each).
2. Each product has the correct `price` in cents, `currency`, `description`, and impact statement.
3. Donor form exists and is published (`publishForm` was called).
4. Form `formId` is set in Workflow 1 trigger config (if using `trigger_form_submitted` as a secondary trigger).
5. `objectLink` with `linkType: "product_form"` connects each product to the donor form.
6. `objectLink` with `linkType: "checkout_product"` connects checkout to each product.
7. `objectLink` with `linkType: "workflow_form"` connects Workflow 1 to the donor form.
8. `objectLink` with `linkType: "workflow_sequence"` connects Workflow 1 to the stewardship sequence.
9. All `pipelineStageId` values in `lc_crm` nodes match actual pipeline stage IDs (prospect, first_time_donor, repeat_donor, major_donor, monthly_sustainer, lapsed).
10. Tax ID (EIN) is correct and matches IRS records in all locations: invoice metadata, email templates, landing page footer.
11. Organization name is consistent across all email templates, invoices, and landing pages.
12. ActiveCampaign `listId`, `tag`, and credential settings are real (not placeholders).
13. `lc_email` sender identity is configured and verified (SPF/DKIM).
14. Major donor alert email address is correct and monitored by the development team.
15. Major donor threshold in `if_then` expression is in cents (25000 = $250).
16. Recurring donation flag is correctly passed from payment provider to trigger metadata.
17. All four workflows have `status: "active"`.
18. Stewardship sequence has 4 steps with correct timing offsets (0, +7d, +30d, +90d).
19. Builder apps (donation page, thank-you page) are deployed and accessible.
20. Campaign progress page (if used) correctly reads and displays real-time donation totals.
21. Landing page hero section, cause story, and impact stats are customized (not placeholder copy).
22. Privacy policy link in footer is live and references the organization's actual privacy policy.

---

## 10. Example Deployment Scenario

### Scenario: Animal Rescue Donation System

A nonprofit agency sets up a donation system for an animal rescue organization. The agency configures the complete fundraising infrastructure on L4YERCAK3 so that the animal rescue can accept donations, process tax receipts, steward donors, and run campaigns.

**Organization:** Second Chance Animal Rescue
**Campaign:** Build the New Shelter Fund
**Goal:** $150,000
**Tax ID (EIN):** 47-1234567
**Executive Director:** Dr. Sarah Mitchell

**Donation Tiers:**

| Tier Name | Amount | Impact Statement |
|-----------|--------|-----------------|
| Friend | $25 | Provides one week of food for a rescue animal |
| Champion | $50 | Covers one veterinary checkup |
| Hero | $100 | Sponsors one month of shelter care |
| Guardian | $250 | Funds one complete rescue operation |
| Founder | $500+ | Names a kennel in the new shelter |

---

### Step 1: Create the Project

```
createProject({
  sessionId: "<SESSION_ID>",
  organizationId: "<ORG_ID>",
  name: "Second Chance Animal Rescue - Build the New Shelter Fund",
  subtype: "campaign",
  description: "Fundraising campaign to raise $150,000 for a new shelter facility. Donation tiers from $25 to $500+. Includes one-time and recurring giving, tax receipt generation, donor stewardship, and year-end appeal automation.",
  startDate: 1706745600000,
  endDate: 1735689600000,
  budget: 15000000
})
// Returns: projectId = "proj_shelter_fund_001"
```

```
initializeProjectFolders({
  organizationId: "<ORG_ID>",
  projectId: "proj_shelter_fund_001"
})
```

---

### Step 2: Create Donation Tier Products

```
createProduct({
  sessionId: "<SESSION_ID>",
  organizationId: "<ORG_ID>",
  name: "Friend Donation - $25",
  subtype: "digital",
  price: 2500,
  currency: "USD",
  description: "Provides one week of food for a rescue animal. Your $25 gift ensures that a cat or dog in our care receives nutritious meals every day for seven days.",
  productCode: "DONATE-FRIEND-25",
  taxBehavior: "exempt",
  maxQuantity: 1
})
// Returns: productId = "prod_friend_25"
```

```
publishProduct({ sessionId: "<SESSION_ID>", productId: "prod_friend_25" })
```

```
createProduct({
  sessionId: "<SESSION_ID>",
  organizationId: "<ORG_ID>",
  name: "Champion Donation - $50",
  subtype: "digital",
  price: 5000,
  currency: "USD",
  description: "Covers one veterinary checkup for a rescue animal. Your $50 gift pays for a full wellness exam, vaccinations, and parasite treatment for one animal.",
  productCode: "DONATE-CHAMPION-50",
  taxBehavior: "exempt",
  maxQuantity: 1
})
// Returns: productId = "prod_champion_50"
```

```
publishProduct({ sessionId: "<SESSION_ID>", productId: "prod_champion_50" })
```

```
createProduct({
  sessionId: "<SESSION_ID>",
  organizationId: "<ORG_ID>",
  name: "Hero Donation - $100",
  subtype: "digital",
  price: 10000,
  currency: "USD",
  description: "Sponsors one month of shelter care for a rescue animal. Your $100 gift covers housing, food, medical monitoring, socialization, and enrichment activities for one animal for 30 days.",
  productCode: "DONATE-HERO-100",
  taxBehavior: "exempt",
  maxQuantity: 1
})
// Returns: productId = "prod_hero_100"
```

```
publishProduct({ sessionId: "<SESSION_ID>", productId: "prod_hero_100" })
```

```
createProduct({
  sessionId: "<SESSION_ID>",
  organizationId: "<ORG_ID>",
  name: "Guardian Donation - $250",
  subtype: "digital",
  price: 25000,
  currency: "USD",
  description: "Funds one complete rescue operation. Your $250 gift covers the full cost of rescuing one animal from a neglect or abuse situation, including transport, emergency veterinary care, intake processing, and initial shelter placement.",
  productCode: "DONATE-GUARDIAN-250",
  taxBehavior: "exempt",
  maxQuantity: 1
})
// Returns: productId = "prod_guardian_250"
```

```
publishProduct({ sessionId: "<SESSION_ID>", productId: "prod_guardian_250" })
```

```
createProduct({
  sessionId: "<SESSION_ID>",
  organizationId: "<ORG_ID>",
  name: "Founder Donation - $500+",
  subtype: "digital",
  price: 50000,
  currency: "USD",
  description: "Names a kennel in the new shelter. Your $500+ gift earns you permanent recognition with a named kennel plaque in the new Second Chance Animal Rescue shelter facility. You will also receive a personalized impact report and invitation to the shelter groundbreaking ceremony.",
  productCode: "DONATE-FOUNDER-500",
  taxBehavior: "exempt",
  maxQuantity: 1
})
// Returns: productId = "prod_founder_500"
```

```
publishProduct({ sessionId: "<SESSION_ID>", productId: "prod_founder_500" })
```

```
createProduct({
  sessionId: "<SESSION_ID>",
  organizationId: "<ORG_ID>",
  name: "Custom Donation Amount",
  subtype: "digital",
  price: 0,
  currency: "USD",
  description: "Give any amount you choose. Every dollar makes a difference for the animals in our care.",
  productCode: "DONATE-CUSTOM",
  taxBehavior: "exempt",
  maxQuantity: 1
})
// Returns: productId = "prod_custom_amount"
```

```
publishProduct({ sessionId: "<SESSION_ID>", productId: "prod_custom_amount" })
```

---

### Step 3: Create the Donor Form

```
createForm({
  sessionId: "<SESSION_ID>",
  organizationId: "<ORG_ID>",
  name: "Second Chance Animal Rescue Donor Form",
  description: "Donation form for the Build the New Shelter Fund campaign. Captures donor information, gift amount, frequency, and dedication options.",
  fields: [
    { "type": "text",     "label": "First Name",          "required": true,  "placeholder": "Jane" },
    { "type": "text",     "label": "Last Name",           "required": true,  "placeholder": "Smith" },
    { "type": "email",    "label": "Email Address",       "required": true,  "placeholder": "you@email.com" },
    { "type": "phone",    "label": "Phone Number",        "required": false, "placeholder": "+1 (555) 000-0000" },
    { "type": "number",   "label": "Donation Amount",     "required": true,  "placeholder": "100" },
    { "type": "radio",    "label": "Gift Frequency",      "required": true,  "options": ["One-Time Gift", "Monthly Recurring"] },
    { "type": "select",   "label": "Dedication Type",     "required": false, "options": ["None", "In Honor Of", "In Memory Of"] },
    { "type": "text",     "label": "Tribute Name",        "required": false, "placeholder": "Name of person being honored or remembered" },
    { "type": "checkbox", "label": "Make my donation anonymous", "required": false },
    { "type": "textarea", "label": "Message (optional)",  "required": false, "placeholder": "Leave a message of support for the animals..." }
  ],
  formSettings: {
    "redirectUrl": "/thank-you-donation",
    "notifications": { "adminEmail": true, "respondentEmail": true },
    "submissionBehavior": "redirect"
  }
})
// Returns: formId = "form_shelter_donor_001"
```

```
publishForm({ sessionId: "<SESSION_ID>", formId: "form_shelter_donor_001" })
```

---

### Step 4: Create the CRM Pipeline

The pipeline is configured within the organization's CRM settings with these stages:

| Stage ID | Stage Name | Description |
|----------|-----------|-------------|
| `prospect` | Prospect | Visited donation page but has not yet donated |
| `first_time_donor` | First-Time Donor | Made their first donation to Second Chance Animal Rescue |
| `repeat_donor` | Repeat Donor | Has donated two or more times |
| `major_donor` | Major Donor | Donated $250 or more in a single gift, or $1,000+ cumulative |
| `monthly_sustainer` | Monthly Sustainer | Has an active recurring monthly donation |
| `lapsed` | Lapsed Donor | Has not donated in the last 12 months |

---

### Step 5: Create the Donation Processing Workflow

```
createWorkflow({
  sessionId: "<SESSION_ID>",
  name: "Donation Processing Workflow",
  description: "Processes all donations to Build the New Shelter Fund. Creates transaction, donor contact, tax receipt, thank-you email, ActiveCampaign sync, and pipeline routing based on amount."
})
// Returns: workflowId = "wf_donation_processing_001"
```

```
saveWorkflow({
  sessionId: "<SESSION_ID>",
  workflowId: "wf_donation_processing_001",
  name: "Donation Processing Workflow",
  nodes: [
    {
      "id": "trigger-1",
      "type": "trigger_payment_received",
      "position": { "x": 100, "y": 300 },
      "config": { "paymentProvider": "any" },
      "status": "ready",
      "label": "Donation Payment Received"
    },
    {
      "id": "checkout-1",
      "type": "lc_checkout",
      "position": { "x": 350, "y": 300 },
      "config": {
        "action": "create-transaction",
        "productId": "{{trigger.productId}}",
        "amount": "{{trigger.amount}}",
        "currency": "{{trigger.currency}}",
        "metadata": {
          "donationType": "donation",
          "campaignId": "proj_shelter_fund_001"
        }
      },
      "status": "ready",
      "label": "Create Donation Transaction"
    },
    {
      "id": "crm-1",
      "type": "lc_crm",
      "position": { "x": 600, "y": 300 },
      "config": {
        "action": "create-contact",
        "contactType": "customer",
        "tags": ["donor", "build-the-new-shelter-fund"],
        "mapFields": {
          "email": "{{trigger.customerEmail}}",
          "firstName": "{{trigger.customerFirstName}}",
          "lastName": "{{trigger.customerLastName}}",
          "phone": "{{trigger.customerPhone}}",
          "customFields": {
            "dedicationType": "{{trigger.metadata.dedicationType}}",
            "tributeName": "{{trigger.metadata.tributeName}}",
            "isAnonymous": "{{trigger.metadata.isAnonymous}}",
            "isRecurring": "{{trigger.metadata.isRecurring}}",
            "lastDonationDate": "{{trigger.timestamp}}",
            "totalGiven": "{{trigger.amount}}"
          }
        }
      },
      "status": "ready",
      "label": "Create or Update Donor Contact"
    },
    {
      "id": "invoice-1",
      "type": "lc_invoicing",
      "position": { "x": 850, "y": 150 },
      "config": {
        "action": "generate-invoice",
        "transactionId": "{{checkout-1.output.transactionId}}",
        "contactId": "{{crm-1.output.contactId}}",
        "metadata": {
          "taxDeductible": true,
          "taxId": "47-1234567",
          "organizationName": "Second Chance Animal Rescue",
          "receiptType": "donation"
        }
      },
      "status": "ready",
      "label": "Generate Tax Receipt"
    },
    {
      "id": "email-1",
      "type": "lc_email",
      "position": { "x": 850, "y": 350 },
      "config": {
        "action": "send-confirmation-email",
        "to": "{{crm-1.output.email}}",
        "subject": "Thank You for Your Generous Donation to Second Chance Animal Rescue",
        "body": "Dear {{crm-1.output.firstName}},\n\nThank you for your generous donation of ${{trigger.amountFormatted}} to Second Chance Animal Rescue and our Build the New Shelter Fund campaign.\n\nYour gift makes a real difference. Here is what your donation provides:\n{{trigger.impactStatement}}\n\nYour tax-deductible receipt is attached to this email. For your records:\n- Donation Amount: ${{trigger.amountFormatted}}\n- Date: {{trigger.dateFormatted}}\n- Tax ID (EIN): 47-1234567\n- Organization: Second Chance Animal Rescue, Inc.\n\nNo goods or services were provided in exchange for this contribution.\n\nWith gratitude,\nThe Second Chance Animal Rescue Team\n\nP.S. Want to multiply your impact? Share our campaign with friends and family: https://secondchanceanimalrescue.org/donate"
      },
      "status": "ready",
      "label": "Send Thank You + Tax Receipt"
    },
    {
      "id": "ac-1",
      "type": "activecampaign",
      "position": { "x": 850, "y": 550 },
      "config": {
        "action": "add_contact",
        "email": "{{crm-1.output.email}}",
        "firstName": "{{crm-1.output.firstName}}",
        "lastName": "{{crm-1.output.lastName}}"
      },
      "status": "ready",
      "label": "Sync Donor to ActiveCampaign"
    },
    {
      "id": "ac-2",
      "type": "activecampaign",
      "position": { "x": 1100, "y": 550 },
      "config": {
        "action": "add_tag",
        "contactEmail": "{{crm-1.output.email}}",
        "tag": "donor-shelter-fund"
      },
      "status": "ready",
      "label": "Tag Donor in ActiveCampaign"
    },
    {
      "id": "if-1",
      "type": "if_then",
      "position": { "x": 1100, "y": 300 },
      "config": {
        "expression": "{{trigger.amount}} >= 25000"
      },
      "status": "ready",
      "label": "Is Major Donor? (>= $250)"
    },
    {
      "id": "crm-2",
      "type": "lc_crm",
      "position": { "x": 1350, "y": 150 },
      "config": {
        "action": "move-pipeline-stage",
        "contactId": "{{crm-1.output.contactId}}",
        "pipelineStageId": "first_time_donor"
      },
      "status": "ready",
      "label": "Set Pipeline: First-Time Donor"
    },
    {
      "id": "crm-3",
      "type": "lc_crm",
      "position": { "x": 1350, "y": 300 },
      "config": {
        "action": "move-pipeline-stage",
        "contactId": "{{crm-1.output.contactId}}",
        "pipelineStageId": "major_donor"
      },
      "status": "ready",
      "label": "Set Pipeline: Major Donor"
    }
  ],
  edges: [
    { "id": "e-1", "source": "trigger-1",  "target": "checkout-1", "sourceHandle": "output", "targetHandle": "input" },
    { "id": "e-2", "source": "checkout-1", "target": "crm-1",      "sourceHandle": "output", "targetHandle": "input" },
    { "id": "e-3", "source": "crm-1",      "target": "invoice-1",  "sourceHandle": "output", "targetHandle": "input" },
    { "id": "e-4", "source": "crm-1",      "target": "email-1",    "sourceHandle": "output", "targetHandle": "input" },
    { "id": "e-5", "source": "crm-1",      "target": "ac-1",       "sourceHandle": "output", "targetHandle": "input" },
    { "id": "e-6", "source": "ac-1",       "target": "ac-2",       "sourceHandle": "output", "targetHandle": "input" },
    { "id": "e-7", "source": "crm-1",      "target": "if-1",       "sourceHandle": "output", "targetHandle": "input" },
    { "id": "e-8", "source": "if-1",       "target": "crm-2",      "sourceHandle": "false",  "targetHandle": "input" },
    { "id": "e-9", "source": "if-1",       "target": "crm-3",      "sourceHandle": "true",   "targetHandle": "input" }
  ],
  triggers: [{ "type": "trigger_payment_received", "config": { "paymentProvider": "any" } }]
})
```

```
updateWorkflowStatus({
  sessionId: "<SESSION_ID>",
  workflowId: "wf_donation_processing_001",
  status: "active"
})
```

---

### Step 6: Create the Recurring Donation Management Workflow

```
createWorkflow({
  sessionId: "<SESSION_ID>",
  name: "Recurring Donation Management Workflow",
  description: "Manages recurring monthly donations. Tags sustainers, sends monthly thank-you emails, updates pipeline stage."
})
// Returns: workflowId = "wf_recurring_management_001"
```

```
saveWorkflow({
  sessionId: "<SESSION_ID>",
  workflowId: "wf_recurring_management_001",
  name: "Recurring Donation Management Workflow",
  nodes: [
    {
      "id": "trigger-1",
      "type": "trigger_payment_received",
      "position": { "x": 100, "y": 200 },
      "config": { "paymentProvider": "any" },
      "status": "ready",
      "label": "Payment Received"
    },
    {
      "id": "if-1",
      "type": "if_then",
      "position": { "x": 350, "y": 200 },
      "config": {
        "expression": "{{trigger.metadata.isRecurring}} === true"
      },
      "status": "ready",
      "label": "Is Recurring Donation?"
    },
    {
      "id": "crm-1",
      "type": "lc_crm",
      "position": { "x": 600, "y": 100 },
      "config": {
        "action": "update-contact",
        "contactId": "{{trigger.contactId}}",
        "tags": ["monthly_sustainer", "recurring_donor"],
        "customFields": {
          "isRecurring": true,
          "lastDonationDate": "{{trigger.timestamp}}",
          "totalGiven": "{{trigger.runningTotal}}"
        }
      },
      "status": "ready",
      "label": "Tag as Monthly Sustainer"
    },
    {
      "id": "crm-2",
      "type": "lc_crm",
      "position": { "x": 850, "y": 100 },
      "config": {
        "action": "move-pipeline-stage",
        "contactId": "{{trigger.contactId}}",
        "pipelineStageId": "monthly_sustainer"
      },
      "status": "ready",
      "label": "Move to Sustainer Stage"
    },
    {
      "id": "email-1",
      "type": "lc_email",
      "position": { "x": 850, "y": 250 },
      "config": {
        "action": "send-confirmation-email",
        "to": "{{trigger.customerEmail}}",
        "subject": "Your Monthly Gift to Second Chance Animal Rescue Has Been Processed",
        "body": "Dear {{trigger.customerFirstName}},\n\nThank you for your continued monthly support of Second Chance Animal Rescue. Your recurring gift of ${{trigger.amountFormatted}} has been successfully processed.\n\nThis month, your gift helped provide:\n{{trigger.monthlyImpactStatement}}\n\nSince you started giving monthly, you have contributed a total of ${{trigger.runningTotalFormatted}}. That is incredible.\n\nYour tax-deductible receipt for this month's gift is attached.\n\nWith gratitude,\nThe Second Chance Animal Rescue Team\n\nP.S. Know someone who loves animals as much as you? Share our mission: https://secondchanceanimalrescue.org/donate"
      },
      "status": "ready",
      "label": "Send Monthly Thank You"
    },
    {
      "id": "ac-1",
      "type": "activecampaign",
      "position": { "x": 1100, "y": 100 },
      "config": {
        "action": "add_tag",
        "contactEmail": "{{trigger.customerEmail}}",
        "tag": "sustainer"
      },
      "status": "ready",
      "label": "Tag Sustainer in AC"
    }
  ],
  edges: [
    { "id": "e-1", "source": "trigger-1", "target": "if-1",    "sourceHandle": "output", "targetHandle": "input" },
    { "id": "e-2", "source": "if-1",      "target": "crm-1",   "sourceHandle": "true",   "targetHandle": "input" },
    { "id": "e-3", "source": "crm-1",     "target": "crm-2",   "sourceHandle": "output", "targetHandle": "input" },
    { "id": "e-4", "source": "crm-1",     "target": "email-1", "sourceHandle": "output", "targetHandle": "input" },
    { "id": "e-5", "source": "crm-2",     "target": "ac-1",    "sourceHandle": "output", "targetHandle": "input" }
  ],
  triggers: [{ "type": "trigger_payment_received", "config": { "paymentProvider": "any" } }]
})
```

```
updateWorkflowStatus({
  sessionId: "<SESSION_ID>",
  workflowId: "wf_recurring_management_001",
  status: "active"
})
```

---

### Step 7: Create the Major Donor Alert Workflow

```
createWorkflow({
  sessionId: "<SESSION_ID>",
  name: "Major Donor Alert Workflow",
  description: "Sends admin notification to development team for donations >= $250. Moves donor to major donor pipeline stage and tags in ActiveCampaign."
})
// Returns: workflowId = "wf_major_donor_alert_001"
```

```
saveWorkflow({
  sessionId: "<SESSION_ID>",
  workflowId: "wf_major_donor_alert_001",
  name: "Major Donor Alert Workflow",
  nodes: [
    {
      "id": "trigger-1",
      "type": "trigger_payment_received",
      "position": { "x": 100, "y": 200 },
      "config": { "paymentProvider": "any" },
      "status": "ready",
      "label": "Payment Received"
    },
    {
      "id": "if-1",
      "type": "if_then",
      "position": { "x": 350, "y": 200 },
      "config": {
        "expression": "{{trigger.amount}} >= 25000"
      },
      "status": "ready",
      "label": "Amount >= $250?"
    },
    {
      "id": "email-1",
      "type": "lc_email",
      "position": { "x": 600, "y": 100 },
      "config": {
        "action": "send-admin-notification",
        "to": "development@secondchanceanimalrescue.org",
        "subject": "Major Donation Alert: ${{trigger.amountFormatted}} from {{trigger.customerFirstName}} {{trigger.customerLastName}}",
        "body": "A major donation has been received. Please arrange a personal thank-you call within 24 hours.\n\nDonor Details:\n- Name: {{trigger.customerFirstName}} {{trigger.customerLastName}}\n- Email: {{trigger.customerEmail}}\n- Phone: {{trigger.customerPhone}}\n- Amount: ${{trigger.amountFormatted}}\n- Donation Tier: {{trigger.tierName}}\n- Recurring: {{trigger.metadata.isRecurring}}\n- Dedication: {{trigger.metadata.dedicationType}} - {{trigger.metadata.tributeName}}\n- Message: {{trigger.metadata.message}}\n\nRecommended Actions:\n1. Personal phone call from Executive Director (Dr. Sarah Mitchell) within 24 hours\n2. Handwritten thank-you card mailed within 48 hours\n3. Add to major donor recognition wall (if not anonymous)\n4. Invite to upcoming donor appreciation event\n5. For Founder-level ($500+): confirm kennel naming details\n\nView donor profile in CRM: [LINK]"
      },
      "status": "ready",
      "label": "Notify Development Team"
    },
    {
      "id": "crm-1",
      "type": "lc_crm",
      "position": { "x": 600, "y": 250 },
      "config": {
        "action": "move-pipeline-stage",
        "contactId": "{{trigger.contactId}}",
        "pipelineStageId": "major_donor"
      },
      "status": "ready",
      "label": "Move to Major Donor Stage"
    },
    {
      "id": "ac-1",
      "type": "activecampaign",
      "position": { "x": 850, "y": 100 },
      "config": {
        "action": "add_tag",
        "contactEmail": "{{trigger.customerEmail}}",
        "tag": "major_donor"
      },
      "status": "ready",
      "label": "Tag as Major Donor in AC"
    },
    {
      "id": "ac-2",
      "type": "activecampaign",
      "position": { "x": 1100, "y": 100 },
      "config": {
        "action": "add_to_list",
        "contactEmail": "{{trigger.customerEmail}}",
        "listId": "ac_list_major_donors"
      },
      "status": "ready",
      "label": "Add to Major Donor List"
    }
  ],
  edges: [
    { "id": "e-1", "source": "trigger-1", "target": "if-1",    "sourceHandle": "output", "targetHandle": "input" },
    { "id": "e-2", "source": "if-1",      "target": "email-1", "sourceHandle": "true",   "targetHandle": "input" },
    { "id": "e-3", "source": "if-1",      "target": "crm-1",   "sourceHandle": "true",   "targetHandle": "input" },
    { "id": "e-4", "source": "email-1",   "target": "ac-1",    "sourceHandle": "output", "targetHandle": "input" },
    { "id": "e-5", "source": "ac-1",      "target": "ac-2",    "sourceHandle": "output", "targetHandle": "input" }
  ],
  triggers: [{ "type": "trigger_payment_received", "config": { "paymentProvider": "any" } }]
})
```

```
updateWorkflowStatus({
  sessionId: "<SESSION_ID>",
  workflowId: "wf_major_donor_alert_001",
  status: "active"
})
```

---

### Step 8: Create the Year-End Appeal Workflow

```
createWorkflow({
  sessionId: "<SESSION_ID>",
  name: "Year-End Appeal Workflow",
  description: "Sends year-end appeal email series in November-December to drive tax-deductible donations before December 31."
})
// Returns: workflowId = "wf_year_end_appeal_001"
```

```
saveWorkflow({
  sessionId: "<SESSION_ID>",
  workflowId: "wf_year_end_appeal_001",
  name: "Year-End Appeal Workflow",
  nodes: [
    {
      "id": "trigger-1",
      "type": "trigger_schedule",
      "position": { "x": 100, "y": 200 },
      "config": { "cronExpression": "0 9 1 11 *", "timezone": "America/Chicago" },
      "status": "ready",
      "label": "November Campaign Start"
    },
    {
      "id": "email-1",
      "type": "lc_email",
      "position": { "x": 350, "y": 200 },
      "config": {
        "action": "send-confirmation-email",
        "to": "{{donor.email}}",
        "subject": "Your Year-End Gift Can Change Lives Before December 31",
        "body": "Dear {{donor.firstName}},\n\nAs the year draws to a close, I want to share something personal with you.\n\nThis year, Second Chance Animal Rescue has rescued 847 animals, performed 1,200 veterinary procedures, and found forever homes for 623 cats and dogs. But there are still animals waiting.\n\nOur Build the New Shelter Fund has raised $112,000 of our $150,000 goal. We are so close.\n\nYour year-end gift -- in any amount -- is tax-deductible for 2026 and goes directly to completing the new shelter facility that will double our capacity.\n\nHere is what your gift provides:\n- $25 feeds a rescue animal for one week\n- $50 covers one veterinary checkup\n- $100 sponsors a month of shelter care\n- $250 funds a complete rescue operation\n- $500+ names a kennel in the new shelter\n\nDonate now: https://secondchanceanimalrescue.org/donate\n\nThank you for being part of our mission.\n\nWith hope,\nDr. Sarah Mitchell\nExecutive Director\nSecond Chance Animal Rescue\nTax ID: 47-1234567"
      },
      "status": "ready",
      "label": "Year-End Appeal Email"
    },
    {
      "id": "wait-1",
      "type": "wait_delay",
      "position": { "x": 600, "y": 200 },
      "config": { "duration": 10, "unit": "days" },
      "status": "ready",
      "label": "Wait 10 Days"
    },
    {
      "id": "email-2",
      "type": "lc_email",
      "position": { "x": 850, "y": 200 },
      "config": {
        "action": "send-confirmation-email",
        "to": "{{donor.email}}",
        "subject": "We Are 75% There -- Can You Help Us Reach Our Goal?",
        "body": "Dear {{donor.firstName}},\n\nGreat news -- since our last update, generous donors like you have helped us reach $125,000 of our $150,000 goal for the Build the New Shelter Fund.\n\nWe are 75% of the way there, but we still need $25,000 to break ground in January.\n\nI wanted to share a quick story. Last week, we rescued a senior dog named Biscuit from a neglect situation. He arrived malnourished, scared, and with a broken leg. Today, after surgery and round-the-clock care from our team, Biscuit is wagging his tail and learning to trust people again. He will be ready for his forever home by the new year.\n\nBiscuit is exactly why the new shelter matters. More space means more animals like him get a second chance.\n\nCan you help us close the gap? Even $25 makes a difference.\n\nDonate now: https://secondchanceanimalrescue.org/donate\n\nWith gratitude,\nDr. Sarah Mitchell\nExecutive Director"
      },
      "status": "ready",
      "label": "Reminder Email"
    },
    {
      "id": "wait-2",
      "type": "wait_delay",
      "position": { "x": 1100, "y": 200 },
      "config": { "duration": 8, "unit": "days" },
      "status": "ready",
      "label": "Wait Until Dec 28"
    },
    {
      "id": "email-3",
      "type": "lc_email",
      "position": { "x": 1350, "y": 200 },
      "config": {
        "action": "send-confirmation-email",
        "to": "{{donor.email}}",
        "subject": "Last Chance: Your Tax-Deductible Gift Must Be Made by December 31",
        "body": "Dear {{donor.firstName}},\n\nThis is a friendly reminder that December 31 is the deadline for tax-deductible charitable contributions for the 2026 tax year.\n\nSecond Chance Animal Rescue is a registered 501(c)(3) nonprofit (Tax ID: 47-1234567), and your donation is fully tax-deductible to the extent allowed by law.\n\nWe are now at $140,000 of our $150,000 goal. Just $10,000 more and we can begin construction on the new shelter in January.\n\nThis is your last chance to make your year-end gift count -- for the animals and for your taxes.\n\nMake your tax-deductible gift now: https://secondchanceanimalrescue.org/donate\n\nThank you for standing with us.\n\nWith hope for the new year,\nDr. Sarah Mitchell\nExecutive Director\nSecond Chance Animal Rescue\n\nP.S. Gifts of $250 or more receive a personalized impact report and invitation to our Shelter Groundbreaking Ceremony in February."
      },
      "status": "ready",
      "label": "Last Chance Email"
    }
  ],
  edges: [
    { "id": "e-1", "source": "trigger-1", "target": "email-1", "sourceHandle": "output", "targetHandle": "input" },
    { "id": "e-2", "source": "email-1",   "target": "wait-1",  "sourceHandle": "output", "targetHandle": "input" },
    { "id": "e-3", "source": "wait-1",    "target": "email-2", "sourceHandle": "output", "targetHandle": "input" },
    { "id": "e-4", "source": "email-2",   "target": "wait-2",  "sourceHandle": "output", "targetHandle": "input" },
    { "id": "e-5", "source": "wait-2",    "target": "email-3", "sourceHandle": "output", "targetHandle": "input" }
  ],
  triggers: [{ "type": "trigger_schedule", "config": { "cronExpression": "0 9 1 11 *", "timezone": "America/Chicago" } }]
})
```

```
updateWorkflowStatus({
  sessionId: "<SESSION_ID>",
  workflowId: "wf_year_end_appeal_001",
  status: "active"
})
```

---

### Step 9: Create the Donor Stewardship Sequence

**Object:** `type: "automation_sequence"`, `subtype: "nachher"`, `name: "Donor Stewardship Sequence"`

**Trigger event:** `form_submitted`

**Steps:**

| Step | Channel | Timing | Subject | Body |
|------|---------|--------|---------|------|
| 1 | `email` | `{ offset: 0, unit: "minutes", referencePoint: "trigger_event" }` | "Thank You for Your Generous Donation to Second Chance Animal Rescue" | Dear {{contact.firstName}},\n\nThank you for your generous donation of ${{donation.amountFormatted}} to Second Chance Animal Rescue and our Build the New Shelter Fund campaign.\n\nYour gift makes a real difference. Here is what your donation provides:\n{{donation.impactStatement}}\n\nYour tax-deductible receipt is attached to this email. For your records:\n- Donation Amount: ${{donation.amountFormatted}}\n- Date: {{donation.dateFormatted}}\n- Tax ID (EIN): 47-1234567\n- Organization: Second Chance Animal Rescue, Inc.\n\nNo goods or services were provided in exchange for this contribution.\n\nWith gratitude,\nThe Second Chance Animal Rescue Team |
| 2 | `email` | `{ offset: 7, unit: "days", referencePoint: "trigger_event" }` | "See the Impact Your Gift is Making Right Now" | Dear {{contact.firstName}},\n\nOne week ago, you made a generous donation to Second Chance Animal Rescue. I wanted to share a story about exactly where your dollars are going.\n\nMeet Luna -- a two-year-old tabby cat who was found abandoned in a parking garage last Tuesday. When our rescue team brought her in, she was dehydrated, underweight, and had a respiratory infection. Thanks to supporters like you, Luna received immediate veterinary care, antibiotics, and a warm, safe place to recover.\n\nToday, Luna is eating well, purring up a storm, and starting to trust her caregivers. She will be ready for adoption in about two weeks.\n\nThis is what your gift does. Every dollar you gave went directly to providing food, shelter, and medical care for animals like Luna.\n\nIf you would like to follow Luna's journey to her forever home, check our social media: @SecondChanceAnimalRescue\n\nWith gratitude,\nDr. Sarah Mitchell\nExecutive Director |
| 3 | `email` | `{ offset: 30, unit: "days", referencePoint: "trigger_event" }` | "Your Impact Update: Build the New Shelter Fund Progress" | Dear {{contact.firstName}},\n\nI wanted to give you a quick update on the Build the New Shelter Fund -- because you are part of making this happen.\n\nCampaign Progress:\n- Goal: $150,000\n- Raised So Far: ${{campaign.totalRaised}}\n- Percentage: {{campaign.percentComplete}}%\n- Total Donors: {{campaign.totalDonors}}\n\nThis Month's Highlights:\n- 67 animals rescued\n- 89 adoptions completed\n- 142 veterinary procedures performed\n- 23 foster families actively caring for animals\n\nYour ${{donation.amountFormatted}} donation is part of this progress. Every tier of giving -- from Friend ($25) to Founder ($500+) -- adds up to real, measurable change.\n\nWe still need ${{campaign.remainingAmount}} to reach our goal. If you know anyone who loves animals, please share our donation page: https://secondchanceanimalrescue.org/donate\n\nThank you for being in our corner.\n\nWarmly,\nDr. Sarah Mitchell\nExecutive Director |
| 4 | `email` | `{ offset: 90, unit: "days", referencePoint: "trigger_event" }` | "We Miss You -- Here is What Has Happened Since Your Last Gift" | Dear {{contact.firstName}},\n\nIt has been three months since your generous donation to Second Chance Animal Rescue, and I wanted to share what has happened since then.\n\nSince your gift:\n- 203 animals have been rescued\n- 267 animals found their forever homes\n- The Build the New Shelter Fund has reached ${{campaign.totalRaised}}\n\nYour original gift of ${{donation.amountFormatted}} was part of making all of this possible. But the work continues every single day.\n\nRight now, we have 84 animals in our care who need food, shelter, and medical attention. The new shelter facility will allow us to double our capacity and save even more lives.\n\nWould you consider making another gift today? Even a small amount helps.\n\n- $25 feeds a rescue animal for one week\n- $50 covers one veterinary checkup\n- $100 sponsors a month of shelter care\n\nDonate again: https://secondchanceanimalrescue.org/donate\n\nOr, if you are able, consider becoming a monthly sustainer. A recurring gift of just $25/month provides consistent, reliable support that helps us plan ahead and rescue more animals.\n\nBecome a monthly sustainer: https://secondchanceanimalrescue.org/donate?recurring=true\n\nThank you for everything, {{contact.firstName}}.\n\nWith hope,\nDr. Sarah Mitchell\nExecutive Director |

---

### Step 10: Create the Lifecycle Sequence

**Object:** `type: "automation_sequence"`, `subtype: "lifecycle"`, `name: "Donor Lifecycle Sequence"`

**Trigger event:** `pipeline_stage_changed`

**Steps:**

| Step | Channel | Timing | Subject | Body |
|------|---------|--------|---------|------|
| 1 | `email` | `{ offset: 365, unit: "days", referencePoint: "trigger_event" }` | "Happy Giving Anniversary, {{contact.firstName}}!" | Dear {{contact.firstName}},\n\nOne year ago today, you made your first donation to Second Chance Animal Rescue. We want to celebrate that anniversary with you.\n\nIn the past year, your support -- combined with hundreds of other generous donors -- helped us:\n- Rescue 847 animals from neglect and abandonment\n- Complete 1,200 veterinary procedures\n- Find forever homes for 623 cats and dogs\n- Raise ${{campaign.totalRaised}} toward the Build the New Shelter Fund\n\nYou are part of this story, and we are grateful.\n\nAs you reflect on the past year, would you consider renewing your support? A gift today -- in any amount -- helps us continue this life-saving work.\n\nRenew your gift: https://secondchanceanimalrescue.org/donate\n\nWith gratitude on this special day,\nDr. Sarah Mitchell\nExecutive Director |

---

### Step 11: Link All Objects

```
// Link Workflow 1 to donor form
objectLinks.create({
  sourceObjectId: "wf_donation_processing_001",
  targetObjectId: "form_shelter_donor_001",
  linkType: "workflow_form"
})

// Link Workflow 1 to stewardship sequence
objectLinks.create({
  sourceObjectId: "wf_donation_processing_001",
  targetObjectId: "<STEWARDSHIP_SEQUENCE_ID>",
  linkType: "workflow_sequence"
})

// Link Workflow 2 to lifecycle sequence
objectLinks.create({
  sourceObjectId: "wf_recurring_management_001",
  targetObjectId: "<LIFECYCLE_SEQUENCE_ID>",
  linkType: "workflow_sequence"
})

// Link each product to the donor form
objectLinks.create({
  sourceObjectId: "prod_friend_25",
  targetObjectId: "form_shelter_donor_001",
  linkType: "product_form"
})

objectLinks.create({
  sourceObjectId: "prod_champion_50",
  targetObjectId: "form_shelter_donor_001",
  linkType: "product_form"
})

objectLinks.create({
  sourceObjectId: "prod_hero_100",
  targetObjectId: "form_shelter_donor_001",
  linkType: "product_form"
})

objectLinks.create({
  sourceObjectId: "prod_guardian_250",
  targetObjectId: "form_shelter_donor_001",
  linkType: "product_form"
})

objectLinks.create({
  sourceObjectId: "prod_founder_500",
  targetObjectId: "form_shelter_donor_001",
  linkType: "product_form"
})

objectLinks.create({
  sourceObjectId: "prod_custom_amount",
  targetObjectId: "form_shelter_donor_001",
  linkType: "product_form"
})

// Link project to nonprofit stakeholder contact
objectLinks.create({
  sourceObjectId: "proj_shelter_fund_001",
  targetObjectId: "<NONPROFIT_CONTACT_ID>",
  linkType: "project_contact"
})
```

---

### Step 12: Populate the File System

```
createVirtualFile({
  sessionId: "<SESSION_ID>",
  projectId: "proj_shelter_fund_001",
  name: "campaign-brief",
  parentPath: "/notes",
  content: "# Second Chance Animal Rescue - Build the New Shelter Fund\n\n## Campaign Objective\nRaise $150,000 to fund construction of a new shelter facility that will double the organization's capacity to rescue and house animals.\n\n## Organization\n- Name: Second Chance Animal Rescue, Inc.\n- Tax ID (EIN): 47-1234567\n- Executive Director: Dr. Sarah Mitchell\n- Location: Austin, TX\n- Founded: 2015\n- Website: https://secondchanceanimalrescue.org\n\n## Target Audience\n- Animal lovers in the Austin metro area (30-mile radius)\n- Previous donors and volunteers\n- Social media followers and email subscribers\n- Pet owners and pet industry professionals\n- Local business owners interested in corporate sponsorship\n\n## Donation Tiers\n1. Friend - $25 (one week of food)\n2. Champion - $50 (one veterinary checkup)\n3. Hero - $100 (one month of shelter care)\n4. Guardian - $250 (one complete rescue operation)\n5. Founder - $500+ (named kennel in new shelter)\n\n## Campaign Timeline\n- Launch: February 2026\n- Mid-campaign push: June 2026\n- Year-end appeal: November-December 2026\n- Goal deadline: December 31, 2026\n\n## KPIs\n- Total raised vs. goal ($150,000)\n- Number of unique donors\n- Average donation amount\n- Recurring donor conversion rate (target: 15%)\n- Major donor count ($250+)\n- Email open rate (target: 30%+)\n- Donor retention rate year-over-year"
})

createVirtualFile({
  sessionId: "<SESSION_ID>",
  projectId: "proj_shelter_fund_001",
  name: "donor-communication-copy",
  parentPath: "/notes",
  content: "# Donor Communication Copy - Build the New Shelter Fund\n\n## Thank You Email (Immediate)\nSubject: Thank You for Your Generous Donation to Second Chance Animal Rescue\n[See Stewardship Sequence Step 1 for full body]\n\n## Impact Story Email (+7 days)\nSubject: See the Impact Your Gift is Making Right Now\n[See Stewardship Sequence Step 2 for full body]\n\n## Progress Update Email (+30 days)\nSubject: Your Impact Update: Build the New Shelter Fund Progress\n[See Stewardship Sequence Step 3 for full body]\n\n## Re-engagement Email (+90 days)\nSubject: We Miss You -- Here is What Has Happened Since Your Last Gift\n[See Stewardship Sequence Step 4 for full body]\n\n## Year-End Appeal (November 1)\nSubject: Your Year-End Gift Can Change Lives Before December 31\n[See Workflow 4, email-1 for full body]\n\n## Year-End Reminder (November 11)\nSubject: We Are 75% There -- Can You Help Us Reach Our Goal?\n[See Workflow 4, email-2 for full body]\n\n## Year-End Last Chance (December 28)\nSubject: Last Chance: Your Tax-Deductible Gift Must Be Made by December 31\n[See Workflow 4, email-3 for full body]\n\n## Monthly Sustainer Thank You (Each Month)\nSubject: Your Monthly Gift to Second Chance Animal Rescue Has Been Processed\n[See Workflow 2, email-1 for full body]\n\n## Giving Anniversary (Annual)\nSubject: Happy Giving Anniversary, {{contact.firstName}}!\n[See Lifecycle Sequence Step 1 for full body]"
})

createVirtualFile({
  sessionId: "<SESSION_ID>",
  projectId: "proj_shelter_fund_001",
  name: "impact-statements",
  parentPath: "/notes",
  content: "# Impact Statements by Donation Tier\n\n## Friend - $25\nYour $25 gift provides one week of nutritious food for a rescue animal. Every bowl of food you provide helps a cat or dog in our care stay healthy and strong while they wait for their forever home.\n\n## Champion - $50\nYour $50 gift covers one complete veterinary checkup for a rescue animal. This includes a full wellness exam, vaccinations, parasite treatment, and health screening -- everything needed to ensure the animal is healthy and ready for adoption.\n\n## Hero - $100\nYour $100 gift sponsors one full month of shelter care for a rescue animal. This covers housing, daily meals, medical monitoring, socialization sessions, enrichment activities, and the loving attention of our staff and volunteers.\n\n## Guardian - $250\nYour $250 gift funds one complete rescue operation. This covers the full cost of responding to a neglect or abuse report, safely transporting the animal, providing emergency veterinary care, completing intake processing, and placing the animal in our shelter.\n\n## Founder - $500+\nYour $500+ gift earns you permanent recognition with a named kennel plaque in the new Second Chance Animal Rescue shelter facility. Your generosity will be seen by every visitor, volunteer, and adopter who walks through our doors for years to come. You will also receive a personalized impact report and an invitation to our Shelter Groundbreaking Ceremony.\n\n## Custom Amount\nEvery dollar you give makes a difference. Your gift goes directly to providing food, shelter, medical care, and love to the animals in our care."
})

createFolder({
  sessionId: "<SESSION_ID>",
  projectId: "proj_shelter_fund_001",
  name: "campaign-materials",
  parentPath: "/assets"
})

createFolder({
  sessionId: "<SESSION_ID>",
  projectId: "proj_shelter_fund_001",
  name: "impact-photos",
  parentPath: "/assets/campaign-materials"
})

createFolder({
  sessionId: "<SESSION_ID>",
  projectId: "proj_shelter_fund_001",
  name: "donor-lists",
  parentPath: "/assets"
})

createFolder({
  sessionId: "<SESSION_ID>",
  projectId: "proj_shelter_fund_001",
  name: "reports",
  parentPath: "/assets"
})

createFolder({
  sessionId: "<SESSION_ID>",
  projectId: "proj_shelter_fund_001",
  name: "receipts",
  parentPath: "/assets"
})

captureBuilderApp({
  projectId: "proj_shelter_fund_001",
  builderAppId: "<DONATION_PAGE_APP_ID>"
})

captureBuilderApp({
  projectId: "proj_shelter_fund_001",
  builderAppId: "<THANK_YOU_PAGE_APP_ID>"
})

captureLayerWorkflow({
  projectId: "proj_shelter_fund_001",
  layerWorkflowId: "wf_donation_processing_001"
})

captureLayerWorkflow({
  projectId: "proj_shelter_fund_001",
  layerWorkflowId: "wf_recurring_management_001"
})

captureLayerWorkflow({
  projectId: "proj_shelter_fund_001",
  layerWorkflowId: "wf_major_donor_alert_001"
})

captureLayerWorkflow({
  projectId: "proj_shelter_fund_001",
  layerWorkflowId: "wf_year_end_appeal_001"
})
```

---

### Complete Object Inventory

| # | Object Type | Subtype | Name | Key Detail |
|---|------------|---------|------|-----------|
| 1 | `project` | `campaign` | "Second Chance Animal Rescue - Build the New Shelter Fund" | Container for all assets, $150K goal |
| 2 | `product` | `digital` | "Friend Donation - $25" | 2500 cents, food for one week |
| 3 | `product` | `digital` | "Champion Donation - $50" | 5000 cents, one vet checkup |
| 4 | `product` | `digital` | "Hero Donation - $100" | 10000 cents, one month shelter care |
| 5 | `product` | `digital` | "Guardian Donation - $250" | 25000 cents, one rescue operation |
| 6 | `product` | `digital` | "Founder Donation - $500+" | 50000 cents, named kennel |
| 7 | `product` | `digital` | "Custom Donation Amount" | 0 cents (custom amount at checkout) |
| 8 | `form` | `registration` | "Second Chance Animal Rescue Donor Form" | 10 fields, published |
| 9 | `layer_workflow` | `workflow` | "Donation Processing Workflow" | 10 nodes, 9 edges, active |
| 10 | `layer_workflow` | `workflow` | "Recurring Donation Management Workflow" | 6 nodes, 5 edges, active |
| 11 | `layer_workflow` | `workflow` | "Major Donor Alert Workflow" | 6 nodes, 5 edges, active |
| 12 | `layer_workflow` | `workflow` | "Year-End Appeal Workflow" | 6 nodes, 5 edges, active |
| 13 | `automation_sequence` | `nachher` | "Donor Stewardship Sequence" | 4 emails over 90 days |
| 14 | `automation_sequence` | `lifecycle` | "Donor Lifecycle Sequence" | Annual giving anniversary |
| 15 | `builder_app` | `template_based` | "Donation Landing Page" | Cause story + tiers + form + social proof |
| 16 | `builder_app` | `template_based` | "Donation Thank You Page" | Confirmation + receipt info + share |
| 17 | `builder_app` | `template_based` | "Campaign Progress Page" | Thermometer + recent donors (optional) |

| # | Link Type | Source | Target |
|---|----------|--------|--------|
| 1 | `workflow_form` | Workflow: Donation Processing (9) | Form (8) |
| 2 | `workflow_sequence` | Workflow: Donation Processing (9) | Sequence: Stewardship (13) |
| 3 | `workflow_sequence` | Workflow: Recurring Management (10) | Sequence: Lifecycle (14) |
| 4 | `product_form` | Product: Friend $25 (2) | Form (8) |
| 5 | `product_form` | Product: Champion $50 (3) | Form (8) |
| 6 | `product_form` | Product: Hero $100 (4) | Form (8) |
| 7 | `product_form` | Product: Guardian $250 (5) | Form (8) |
| 8 | `product_form` | Product: Founder $500+ (6) | Form (8) |
| 9 | `product_form` | Product: Custom Amount (7) | Form (8) |
| 10 | `project_contact` | Project (1) | Nonprofit stakeholder contact |

### Credit Cost Estimate

| Action | Count | Credits Each | Total |
|--------|-------|-------------|-------|
| Behavior: create-transaction | 1 per donation | 1 | 1 |
| Behavior: create-contact | 1 per new donor | 1 | 1 |
| Behavior: generate-invoice (tax receipt) | 1 per donation | 1 | 1 |
| Behavior: send-confirmation-email (thank you) | 1 per donation | 1 | 1 |
| Behavior: activecampaign-sync (add_contact) | 1 per new donor | 1 | 1 |
| Behavior: activecampaign-sync (add_tag) | 1 per donation | 1 | 1 |
| Behavior: move-pipeline-stage | 1 per donation | 1 | 1 |
| Stewardship Sequence: 4 emails | 4 per donor | 1 | 4 |
| **Subtotal per one-time donor** | | | **11 credits** |
| Behavior: recurring check (Workflow 2) | 1 per recurring payment | 1 | 1 |
| Behavior: update-contact (sustainer tag) | 1 per recurring payment | 1 | 1 |
| Behavior: move-pipeline-stage (sustainer) | 1 per first recurring | 1 | 1 |
| Behavior: send-confirmation-email (monthly) | 1 per recurring payment | 1 | 1 |
| Behavior: activecampaign-sync (sustainer tag) | 1 per first recurring | 1 | 1 |
| **Subtotal per recurring payment** | | | **+5 credits** |
| Behavior: major donor check (Workflow 3) | 1 per donation >= $250 | 1 | 1 |
| Behavior: send-admin-notification | 1 per major donation | 1 | 1 |
| Behavior: move-pipeline-stage (major) | 1 per major donation | 1 | 1 |
| Behavior: activecampaign-sync (major tag) | 1 per major donation | 1 | 1 |
| Behavior: activecampaign-sync (major list) | 1 per major donation | 1 | 1 |
| **Subtotal per major donor** | | | **+5 credits** |
| Year-End Appeal: 3 emails | 3 per donor on list | 1 | 3 |
| Lifecycle: 1 anniversary email | 1 per donor per year | 1 | 1 |
| **Subtotal per donor per year (appeal + anniversary)** | | | **+4 credits** |

**Example scenario: 500 donors/year, 15% recurring (75 sustainers), 10% major donors (50):**

| Segment | Donors | Credits/Donor | Annual Credits |
|---------|--------|--------------|---------------|
| One-time donors | 375 | 11 | 4,125 |
| Recurring donors (first payment) | 75 | 16 (11 + 5) | 1,200 |
| Recurring donors (subsequent 11 months) | 75 x 11 = 825 payments | 5 | 4,125 |
| Major donor surcharge | 50 | 5 | 250 |
| Year-end appeal (all donors) | 500 | 3 | 1,500 |
| Anniversary email (all donors) | 500 | 1 | 500 |
| **Total estimated annual credits** | | | **11,700 credits** |
