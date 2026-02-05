# Product Launch

> Skill template for the L4YERCAK3 AI Composition Platform.
> All field names, node types, and mutation signatures reference `_SHARED.md`. Use exact names -- no aliases, no abbreviations.

---

## 1. Purpose

Deploy a complete product launch system with waitlist capture, pre-launch anticipation sequence, timed cart open/close, early-bird pricing, checkout, and post-purchase onboarding. An agency uses this skill to launch a new product, course, or program on behalf of a client. The system handles the full lifecycle: build interest before launch, convert during a defined sales window, and onboard buyers after purchase.

**Three-layer mapping:** L4YERCAK3 platform -> Agency (configures launch) -> Agency's Client (owns product) -> End Customer (buys product).

---

## 2. Ontologies Involved

### Product (`type: "product"`)

- **subtype:** `digital` or `physical`
- **customProperties used:**
  - `productCode: string`
  - `description: string`
  - `price: number` (in cents -- regular price)
  - `currency: string` (ISO 4217, e.g. `"EUR"` or `"USD"`)
  - `inventory: number` (set for limited-quantity launches)
  - `sold: number` (auto-incremented)
  - `taxBehavior: string`
  - `saleStartDate: number` (timestamp -- cart open date)
  - `saleEndDate: number` (timestamp -- cart close date)
  - `earlyBirdUntil: number` (timestamp -- early-bird cutoff)
  - `maxQuantity: number` (per buyer)
  - `requiresShipping: boolean` (true for physical)
  - `invoiceConfig: object`

- **Mutations:** `createProduct`, `updateProduct`, `publishProduct`, `archiveProduct`, `duplicateProduct`, `incrementSold`

### Form (`type: "form"`)

- **subtype:** `registration`
- **customProperties used:**
  - `fields: Array<{ type, label, required, options?, placeholder?, defaultValue? }>`
  - `formSettings: object`
  - `submissionWorkflow: object`
- **Field types used:** `text` (first name), `email` (email address), `phone` (optional), `select` or `radio` (qualifying questions, e.g. "How did you hear about us?"), `section_header` (visual separation)
- **Mutations:** `createForm`, `updateForm`, `publishForm`, `createFormResponse`, `submitPublicForm`

### CRM Contact (`type: "crm_contact"`)

- **subtype:** `lead` (at waitlist signup), transitions to `customer` (after purchase)
- **customProperties used:**
  - `firstName: string`
  - `lastName: string`
  - `email: string`
  - `phone: string`
  - `contactType: string`
  - `tags: string[]` (e.g. `["waitlist", "product_name", "early_bird", "purchased_product_name"]`)
  - `pipelineStageId: string`
  - `pipelineDealValue: number` (product price)
  - `customFields: Record<string, any>`
- **Mutations:** `createContact`, `updateContact`

### Checkout (`lc_checkout` node)

- **Actions:** `create-transaction`, `calculate-pricing`
- **Linked to product via `checkout_product` link type**
- **Linked to form via `product_form` link type (product -> waitlist form)**

### Invoice

- **Type:** `b2c_single`
- **Status flow:** `draft` -> `sent` -> `paid`
- **Mutations:** `createDraftInvoiceFromTransactions`, `sealInvoice`, `markInvoiceAsSent`, `markInvoiceAsPaid`

### Workflow (`type: "layer_workflow"`)

- **subtype:** `workflow`
- **Mutations:** `createWorkflow`, `saveWorkflow`, `updateWorkflowStatus`

### Automation Sequence (`type: "automation_sequence"`)

- **Subtypes used:**
  - `vorher` -- pre-launch anticipation sequence (before cart open)
  - `custom` -- launch sales campaign sequence (during cart open window)
  - `nachher` -- post-purchase onboarding sequence (after purchase)
- **Channels:** `email` (primary), `sms` (optional urgency nudges), `whatsapp` (optional)
- **Trigger events:** `form_submitted` (waitlist), `pipeline_stage_changed` (cart open), `contact_tagged` (purchased)

### Object Links (`objectLinks`)

| linkType | sourceObjectId | targetObjectId | Purpose |
|----------|---------------|----------------|---------|
| `product_form` | product | waitlist form | Product requires this form |
| `checkout_product` | checkout config | product | Checkout sells this product |
| `workflow_form` | waitlist workflow | waitlist form | Workflow triggered by form |
| `workflow_sequence` | waitlist workflow | pre-launch sequence | Workflow enrolls in sequence |
| `workflow_sequence` | purchase workflow | onboarding sequence | Workflow enrolls in sequence |

---

## 3. Builder Components

### 3a. Pre-Launch Landing Page (builder_app, subtype: `v0_generated`)

- **Headline:** StoryBrand one-liner (problem -> solution -> result)
- **Countdown timer:** Counts down to `saleStartDate`
- **Waitlist form embed:** Embedded registration form (email + firstName + optional qualifying question)
- **Social proof placeholder:** Testimonial slots, "X people already on the waitlist" counter
- **Sections:** Hero with value prop, problem agitation, solution overview, what you get (bullet list), waitlist CTA, footer

### 3b. Sales Page (builder_app, subtype: `v0_generated`)

- **Product details:** Name, description, key benefits, what is included
- **Pricing section:** Early-bird price (with strikethrough regular price) or regular price after early-bird window
- **Testimonials:** 3-5 customer testimonials/results
- **FAQ accordion:** 5-8 common objections answered
- **Checkout embed:** `lc_checkout` component, linked to product
- **Urgency elements:** Countdown to `saleEndDate`, inventory counter if limited
- **Sections:** Hero, transformation promise, curriculum/modules, instructor/creator bio, pricing, testimonials, FAQ, final CTA

### 3c. Thank-You / Access Page (builder_app, subtype: `v0_generated`)

- **Confirmation message:** "You're in! Here's what happens next."
- **Access delivery:** Download link, login instructions, or calendar booking for onboarding call
- **Next steps:** Numbered list (1. Check email for receipt, 2. Access product, 3. Join community)
- **Upsell/cross-sell:** Optional related product or upgrade offer

### 3d. Order Confirmation Email Template

- **Receipt details:** Product name, amount paid, transaction ID
- **Access instructions:** How to access the purchased product
- **Support contact:** Where to get help

---

## 4. Layers Automations

### Workflow 1: Waitlist Capture

**Name:** `waitlist-capture`
**Trigger:** Form submission on waitlist form.

**Nodes:**

| id | type | config | label |
|----|------|--------|-------|
| `trigger-1` | `trigger_form_submitted` | `{ formId: "<waitlist_form_id>" }` | "Waitlist Form Submitted" |
| `crm-1` | `lc_crm` | `{ action: "create-contact", contactType: "lead", tags: ["waitlist", "<product_name>"], pipelineStageId: "waitlisted" }` | "Create Waitlist Contact" |
| `email-1` | `lc_email` | `{ action: "send-confirmation-email", subject: "You're on the waitlist!", templateVars: { productName: "<product_name>", launchDate: "<sale_start_date>" } }` | "Send Waitlist Confirmation" |
| `ac-1` | `activecampaign` | `{ action: "add_contact" }` | "Sync to ActiveCampaign" |
| `ac-2` | `activecampaign` | `{ action: "add_to_list", listName: "launch_waitlist_<product_name>" }` | "Add to Waitlist List" |
| `ac-3` | `activecampaign` | `{ action: "add_tag", tag: "waitlist_<product_name>" }` | "Tag as Waitlist" |

**Edges:**

| id | source | target | sourceHandle | targetHandle | label |
|----|--------|--------|-------------|-------------|-------|
| `e-w1-1` | `trigger-1` | `crm-1` | `output` | `input` | "on submit" |
| `e-w1-2` | `crm-1` | `email-1` | `output` | `input` | "contact created" |
| `e-w1-3` | `email-1` | `ac-1` | `output` | `input` | "email sent" |
| `e-w1-4` | `ac-1` | `ac-2` | `output` | `input` | "synced" |
| `e-w1-5` | `ac-2` | `ac-3` | `output` | `input` | "listed" |

**Triggers:**
```json
[{ "type": "trigger_form_submitted", "config": { "formId": "<waitlist_form_id>" } }]
```

---

### Workflow 2: Purchase Processing

**Name:** `purchase-processing`
**Trigger:** Payment received from checkout.

**Nodes:**

| id | type | config | label |
|----|------|--------|-------|
| `trigger-2` | `trigger_payment_received` | `{ paymentProvider: "any" }` | "Payment Received" |
| `crm-2` | `lc_crm` | `{ action: "update-contact", tags: ["purchased_<product_name>"], contactType: "customer" }` | "Update Contact to Customer" |
| `crm-3` | `lc_crm` | `{ action: "move-pipeline-stage", pipelineStageId: "purchased" }` | "Move to Purchased Stage" |
| `invoice-1` | `lc_invoicing` | `{ action: "generate-invoice", invoiceType: "b2c_single" }` | "Generate Invoice" |
| `email-2` | `lc_email` | `{ action: "send-confirmation-email", subject: "Your purchase is confirmed!", templateVars: { productName: "<product_name>", accessUrl: "<access_url>" } }` | "Send Receipt + Access" |
| `email-3` | `lc_email` | `{ action: "send-admin-notification", subject: "New purchase: <product_name>", templateVars: { notificationType: "purchase" } }` | "Notify Admin" |
| `ac-4` | `activecampaign` | `{ action: "add_tag", tag: "purchased_<product_name>" }` | "Tag as Purchased" |
| `ac-5` | `activecampaign` | `{ action: "add_to_automation", automationName: "post_purchase_onboarding_<product_name>" }` | "Enroll in Onboarding" |

**Edges:**

| id | source | target | sourceHandle | targetHandle | label |
|----|--------|--------|-------------|-------------|-------|
| `e-w2-1` | `trigger-2` | `crm-2` | `output` | `input` | "payment confirmed" |
| `e-w2-2` | `crm-2` | `crm-3` | `output` | `input` | "contact updated" |
| `e-w2-3` | `crm-3` | `invoice-1` | `output` | `input` | "stage moved" |
| `e-w2-4` | `invoice-1` | `email-2` | `output` | `input` | "invoice generated" |
| `e-w2-5` | `email-2` | `email-3` | `output` | `input` | "receipt sent" |
| `e-w2-6` | `email-3` | `ac-4` | `output` | `input` | "admin notified" |
| `e-w2-7` | `ac-4` | `ac-5` | `output` | `input` | "tagged" |

**Triggers:**
```json
[{ "type": "trigger_payment_received", "config": { "paymentProvider": "any" } }]
```

---

### Workflow 3: Cart Abandonment (Optional)

**Name:** `cart-abandonment`
**Trigger:** Contact updated (moved to cart_open stage but no purchase).

**Nodes:**

| id | type | config | label |
|----|------|--------|-------|
| `trigger-3` | `trigger_contact_updated` | `{}` | "Contact Updated" |
| `if-1` | `if_then` | `{ expression: "contact.pipelineStageId === 'cart_open' && !contact.tags.includes('purchased_<product_name>')" }` | "Is Cart Open Without Purchase?" |
| `wait-1` | `wait_delay` | `{ duration: 1, unit: "hours" }` | "Wait 1 Hour" |
| `if-2` | `if_then` | `{ expression: "!contact.tags.includes('purchased_<product_name>')" }` | "Still No Purchase?" |
| `email-4` | `lc_email` | `{ action: "send-confirmation-email", subject: "You left something behind...", templateVars: { productName: "<product_name>", checkoutUrl: "<checkout_url>" } }` | "Send Cart Reminder" |
| `wait-2` | `wait_delay` | `{ duration: 12, unit: "hours" }` | "Wait 12 Hours" |
| `if-3` | `if_then` | `{ expression: "!contact.tags.includes('purchased_<product_name>')" }` | "Still No Purchase (2nd Check)?" |
| `email-5` | `lc_email` | `{ action: "send-confirmation-email", subject: "Last chance: <product_name> is closing soon", templateVars: { productName: "<product_name>", urgency: true } }` | "Send Urgency Reminder" |

**Edges:**

| id | source | target | sourceHandle | targetHandle | label |
|----|--------|--------|-------------|-------------|-------|
| `e-w3-1` | `trigger-3` | `if-1` | `output` | `input` | "contact changed" |
| `e-w3-2` | `if-1` | `wait-1` | `true` | `input` | "cart open, no purchase" |
| `e-w3-3` | `wait-1` | `if-2` | `output` | `input` | "1h elapsed" |
| `e-w3-4` | `if-2` | `email-4` | `true` | `input` | "still no purchase" |
| `e-w3-5` | `email-4` | `wait-2` | `output` | `input` | "reminder sent" |
| `e-w3-6` | `wait-2` | `if-3` | `output` | `input` | "12h elapsed" |
| `e-w3-7` | `if-3` | `email-5` | `true` | `input` | "still abandoned" |

**Note:** `if-1` false handle, `if-2` false handle, and `if-3` false handle all terminate (no target -- flow ends silently for non-matching contacts).

**Triggers:**
```json
[{ "type": "trigger_contact_updated", "config": {} }]
```

---

### Workflow 4: Early Bird Expiry

**Name:** `early-bird-expiry`
**Trigger:** Scheduled at `earlyBirdUntil` timestamp.

**Nodes:**

| id | type | config | label |
|----|------|--------|-------|
| `trigger-4` | `trigger_schedule` | `{ cronExpression: "<earlyBirdUntil as cron>", timezone: "<client_timezone>" }` | "Early Bird Deadline" |
| `code-1` | `code_block` | `{ code: "// Update product: remove early bird pricing, set price to regular price\ncontext.productUpdate = { earlyBirdUntil: null };" }` | "Expire Early Bird Price" |
| `email-6` | `lc_email` | `{ action: "send-confirmation-email", subject: "Early bird pricing just ended -- regular price now live", templateVars: { productName: "<product_name>", regularPrice: "<regular_price>" } }` | "Notify Waitlist: Early Bird Ended" |
| `ac-6` | `activecampaign` | `{ action: "add_tag", tag: "early_bird_expired_<product_name>" }` | "Tag Early Bird Expired" |

**Edges:**

| id | source | target | sourceHandle | targetHandle | label |
|----|--------|--------|-------------|-------------|-------|
| `e-w4-1` | `trigger-4` | `code-1` | `output` | `input` | "schedule fired" |
| `e-w4-2` | `code-1` | `email-6` | `output` | `input` | "price updated" |
| `e-w4-3` | `email-6` | `ac-6` | `output` | `input` | "notification sent" |

**Triggers:**
```json
[{ "type": "trigger_schedule", "config": { "cronExpression": "<earlyBirdUntil as cron>", "timezone": "<client_timezone>" } }]
```

---

## 5. CRM Pipeline

**Pipeline name:** `Launch: <Product Name>`

### Stages (in order)

| Stage ID | Stage Name | Description | Trigger |
|----------|-----------|-------------|---------|
| `interested` | Interested | Visited landing page, showed intent | Manual or inferred |
| `waitlisted` | Waitlisted | Submitted waitlist form | `trigger_form_submitted` -> `lc_crm` (Workflow 1) |
| `early_bird_purchased` | Early Bird Purchased | Bought during early-bird window | `trigger_payment_received` + earlyBirdUntil check |
| `cart_open` | Cart Open | Received cart-open email, clicked through | `pipeline_stage_changed` via launch sequence enrollment |
| `purchased` | Purchased | Completed checkout at any price | `trigger_payment_received` -> `lc_crm` (Workflow 2) |
| `onboarding` | Onboarding | Receiving post-purchase onboarding sequence | Automatically after purchase, via onboarding sequence enrollment |
| `completed` | Completed | Finished onboarding / consumed product | Manual or time-based (end of onboarding sequence) |
| `refunded` | Refunded | Requested and received refund | Manual or Stripe webhook |

### Stage Transitions

```
interested -> waitlisted          (form submitted)
waitlisted -> early_bird_purchased (payment before earlyBirdUntil)
waitlisted -> cart_open            (launch email clicked, sale window open)
cart_open -> purchased             (payment received)
early_bird_purchased -> onboarding (automatic)
purchased -> onboarding            (automatic)
onboarding -> completed            (sequence finished / manual)
purchased -> refunded              (refund processed)
early_bird_purchased -> refunded   (refund processed)
```

---

## 6. File System Scaffold

Project type: `campaign` (subtype of project).

```
/builder
  /pre-launch-page          # builder_ref -> pre-launch landing page app
  /sales-page               # builder_ref -> sales page app
  /thank-you-page           # builder_ref -> thank-you/access page app

/layers
  /waitlist-workflow         # layer_ref -> Workflow 1: Waitlist Capture
  /purchase-workflow         # layer_ref -> Workflow 2: Purchase Processing
  /cart-abandonment-workflow # layer_ref -> Workflow 3: Cart Abandonment (optional)
  /early-bird-expiry-workflow # layer_ref -> Workflow 4: Early Bird Expiry

/notes
  /launch-plan              # virtual -> launch timeline, milestones, go/no-go checklist
  /product-brief            # virtual -> product description, target audience, positioning
  /pricing-strategy         # virtual -> regular price, early bird price, bundle/upsell pricing
  /copy-bank                # virtual -> StoryBrand one-liner, headlines, email subject lines

/assets
  /product-images            # media_ref -> hero image, product mockups
  /testimonial-screenshots   # media_ref -> social proof screenshots, video testimonials
  /brand-assets              # media_ref -> logo, brand colors, fonts
```

**Mutations used:**
1. `initializeProjectFolders({ organizationId, projectId })` -- creates `/builder`, `/layers`, `/notes`, `/assets`
2. `createVirtualFile({ sessionId, projectId, name, parentPath, content })` -- for each `/notes/*` file
3. `captureBuilderApp({ projectId, builderAppId })` -- for each `/builder/*` reference
4. `captureLayerWorkflow({ projectId, layerWorkflowId })` -- for each `/layers/*` reference

---

## 7. Data Flow Diagram

```
PRE-LAUNCH PHASE
================

  Visitor
    |
    v
  [Pre-Launch Landing Page]
    |
    | fills out waitlist form
    v
  (trigger_form_submitted)
    |
    v
  [lc_crm: create-contact]-----> CRM Contact (lead, tags:["waitlist","<product>"])
    |                                  |
    v                                  | pipelineStageId = "waitlisted"
  [lc_email: waitlist confirmation]    |
    |                                  v
    v                            [activecampaign: add_to_list]
  [activecampaign: sync]              |
    |                                  v
    v                            Vorher Sequence (Pre-Launch Anticipation)
  Done                                 |
                                       | 3-5 emails building anticipation
                                       | countdown to saleStartDate
                                       v
                                  (saleStartDate reached)


LAUNCH PHASE (Cart Open)
=========================

  [Launch Email: "Cart is OPEN!"]
    |
    | click-through
    v
  [Sales Page] <-- product details, pricing, testimonials, FAQ
    |
    | add to cart / buy now
    v
  [lc_checkout: create-transaction] ----> Transaction
    |                                        |
    v                                        | linked via checkout_product
  [Payment Gateway (Stripe / lc_checkout)]   |
    |                                        v
    | success                            Product (incrementSold)
    v
  (trigger_payment_received)
    |
    v
  [lc_crm: update-contact] ---------> CRM Contact (customer, tags:["purchased_<product>"])
    |                                      |
    v                                      | pipelineStageId = "purchased"
  [lc_crm: move-pipeline-stage]           |
    |                                      v
    v                                [activecampaign: add_tag]
  [lc_invoicing: generate-invoice]        |
    |                                      v
    v                                [activecampaign: add_to_automation]
  [lc_email: receipt + access]            |
    |                                      v
    v                                Nachher Sequence (Post-Purchase Onboarding)
  [lc_email: admin notification]          |
    |                                      | Welcome, access instructions
    v                                      | Module 1 reminder (+1d)
  Done                                     | Check-in (+3d)
                                           | Community invite (+5d)
                                           v
                                      (onboarding complete)


CART ABANDONMENT (Optional)
============================

  CRM Contact (pipelineStageId = "cart_open")
    |
    | no purchase after 1 hour
    v
  [wait_delay: 1h] -> [if_then: still no purchase?]
    |                         |
    | true                    | false -> end
    v
  [lc_email: cart reminder]
    |
    | no purchase after 12 more hours
    v
  [wait_delay: 12h] -> [if_then: still no purchase?]
    |                         |
    | true                    | false -> end
    v
  [lc_email: urgency/last chance]


SALES CAMPAIGN SEQUENCE (Custom, 7-10 emails over 5-7 days)
=============================================================

  Day 0: Big announcement, main value prop, early bird price
  Day 1: Social proof, testimonials, results
  Day 2: FAQ / objection handling
  Day 3: Case study deep dive
  Day 4: Bonus stack, increase value-to-price ratio
  Day 5: Scarcity signal ("50% sold", "price increases tomorrow")
  Day 6 AM: Final day, deadline reminder, recap of everything
  Day 6 PM: Last chance, cart closing tonight, final CTA
```

---

## 8. Customization Points

### Must-Customize (skill will not function without these)

| Field | Location | Example |
|-------|----------|---------|
| Product name | `createProduct({ name })` | "12-Week Body Transformation Program" |
| Product description | `createProduct({ description })` | "A complete fitness and nutrition program..." |
| Product price (cents) | `createProduct({ price })` | `49700` ($497.00) |
| Early bird price (cents) | Separate product variant or `code_block` logic | `29700` ($297.00) |
| Currency | `createProduct({ currency })` | `"USD"` |
| Launch date (saleStartDate) | `createProduct({ saleStartDate })` | `1742025600000` (March 15 2025 00:00 UTC) |
| Cart close date (saleEndDate) | `createProduct({ saleEndDate })` | `1742630400000` (March 22 2025 00:00 UTC) |
| Early bird cutoff (earlyBirdUntil) | `createProduct({ earlyBirdUntil })` | `1742198400000` (March 17 2025 00:00 UTC) |
| Access delivery method | Thank-you page + receipt email | Download link, login URL, calendar booking |
| Product subtype | `createProduct({ subtype })` | `"digital"` or `"physical"` |

### Should-Customize (works with defaults but much better when tailored)

| Field | Default | Customization |
|-------|---------|---------------|
| Sales page copy | Generic template copy | StoryBrand framework, client voice |
| Sequence email content | Placeholder subject/body | Brand-specific copy, real testimonials |
| Testimonials | Empty placeholder slots | Real customer quotes and results |
| FAQ content | Generic 5 questions | Product-specific objections |
| Waitlist form fields | email + firstName | Add qualifying questions (select/radio) |
| Scarcity mechanics | Countdown timer only | Inventory counter, price increase, bonus removal |
| Pipeline deal value | Product price | Adjusted for LTV or upsell potential |
| Admin notification recipients | Org owner email | Specific team members |

### Can-Use-Default (sensible defaults, override only if needed)

| Field | Default |
|-------|---------|
| Pipeline stages | interested -> waitlisted -> early_bird_purchased -> cart_open -> purchased -> onboarding -> completed -> refunded |
| Workflow structure | 4 workflows as defined in Section 4 |
| Sequence timing | Vorher: -7d to -1d before launch. Custom: Day 0-6. Nachher: Day 0-5 post-purchase |
| Form field types | text (firstName), email (email) |
| Invoice type | `b2c_single` |
| Payment provider filter | `"any"` |
| Wait delay for cart abandonment | 1 hour first, 12 hours second |
| Checkout calculate-pricing action | Standard (no discount codes) |

---

## 9. Common Pitfalls

### Data Errors

| Pitfall | Why It Breaks | Fix |
|---------|--------------|-----|
| `earlyBirdUntil` not set on product | Early bird workflow (Workflow 4) fires with no reference date; `code_block` has nothing to expire | Always set `earlyBirdUntil` as a timestamp when creating the product. If no early bird, omit Workflow 4 entirely |
| `saleStartDate` in the past | Countdown timer shows negative, launch emails already missed their window | Validate `saleStartDate > Date.now()` before `createProduct`. Minimum 48 hours in future recommended |
| `saleEndDate` before `saleStartDate` | Cart closes before it opens; checkout rejects transactions | Validate `saleEndDate > saleStartDate`. Minimum 3-day window recommended |
| Price in dollars instead of cents | Product shows $4.97 instead of $497 | Always multiply by 100: `price: 49700` not `price: 497` |
| `earlyBirdUntil` after `saleEndDate` | Early bird never expires; regular price never takes effect | Validate `saleStartDate < earlyBirdUntil < saleEndDate` |

### Linking Errors

| Pitfall | Why It Breaks | Fix |
|---------|--------------|-----|
| Checkout not linked to product | `lc_checkout` node has no product to sell; transaction has $0 amount | Create `objectLinks` entry: `{ linkType: "checkout_product", sourceObjectId: checkoutConfigId, targetObjectId: productId }` |
| Workflow not linked to form | `trigger_form_submitted` fires but workflow does not match the form | Create `objectLinks` entry: `{ linkType: "workflow_form", sourceObjectId: workflowId, targetObjectId: formId }` and set `formId` in trigger config |
| Missing `product_form` link | Product page does not know which form to embed for waitlist | Create `objectLinks` entry: `{ linkType: "product_form", sourceObjectId: productId, targetObjectId: formId }` |

### Sequence Errors

| Pitfall | Why It Breaks | Fix |
|---------|--------------|-----|
| Waitlist contacts not moved to `cart_open` when launch begins | Cart abandonment workflow never triggers; contacts stuck in `waitlisted` stage | Add a `trigger_schedule` workflow at `saleStartDate` that bulk-moves all `waitlisted` contacts to `cart_open` via `lc_crm` `move-pipeline-stage` |
| No separation between waitlist and purchase sequences | Buyers keep receiving sales emails after purchasing | Use `contact_tagged` trigger event: when `purchased_<product_name>` tag is added, remove contact from sales campaign sequence. Or use `if_then` node checking purchase tag before each email |
| Onboarding sequence starts before receipt email | Customer gets "Week 1 starts now" before they have access | Ensure `nachher` sequence first step has `timing: { offset: 1, unit: "hours", referencePoint: "trigger_event" }` minimum delay |

### Builder Errors

| Pitfall | Why It Breaks | Fix |
|---------|--------------|-----|
| Sales page deployed before `saleStartDate` | Customers can buy before launch; early bird feels meaningless | Keep sales page in `draft` status until `saleStartDate`. Use pre-launch page until then |
| Checkout embed missing on sales page | Customers cannot complete purchase | Verify `lc_checkout` component is rendered and linked via `checkout_product` |

---

## 10. Example Deployment

**Scenario:** A marketing agency (FitBrand Agency) launches an online course for a fitness coach (Coach Sarah). Product: "12-Week Body Transformation Program". Regular price $497, early bird $297 (first 100 buyers or until March 17). Launch date March 15. Cart closes March 22.

### Step 1: Create Product

```
createProduct({
  sessionId: "<session>",
  organizationId: "<org_id>",
  name: "12-Week Body Transformation Program",
  subtype: "digital",
  price: 49700,
  currency: "USD",
  description: "A complete 12-week fitness and nutrition program with video workouts, meal plans, and weekly coaching calls. Designed for busy professionals who want to transform their body without living at the gym.",
  productCode: "BODY-TRANSFORM-12W",
  inventory: 200,
  sold: 0,
  taxBehavior: "inclusive",
  saleStartDate: 1742025600000,
  saleEndDate: 1742630400000,
  earlyBirdUntil: 1742198400000,
  maxQuantity: 1,
  requiresShipping: false,
  invoiceConfig: {
    autoGenerate: true,
    type: "b2c_single",
    paymentTerms: "due_on_receipt"
  }
})
```
**Result:** `productId = "prod_12wk_transform"`

### Step 2: Create Waitlist Form

```
createForm({
  sessionId: "<session>",
  organizationId: "<org_id>",
  name: "Body Transformation Waitlist",
  description: "Join the waitlist for Coach Sarah's 12-Week Body Transformation Program",
  fields: [
    { type: "section_header", label: "Join the Waitlist", required: false },
    { type: "text", label: "First Name", required: true, placeholder: "Your first name" },
    { type: "email", label: "Email Address", required: true, placeholder: "you@example.com" },
    { type: "select", label: "What's your #1 fitness goal?", required: true, options: ["Lose weight", "Build muscle", "Improve energy", "Overall health"] },
    { type: "radio", label: "Have you done an online fitness program before?", required: false, options: ["Yes", "No", "Currently in one"] }
  ],
  formSettings: {
    redirectUrl: "/thank-you-waitlist",
    showSuccessMessage: true,
    successMessage: "You're on the list! Check your inbox for confirmation."
  }
})
```
**Result:** `formId = "form_transform_waitlist"`

Then publish: `publishForm({ sessionId: "<session>", formId: "form_transform_waitlist" })`

### Step 3: Create Checkout Configuration

Wire the checkout to the product:

```
objectLinks.create({
  sourceObjectId: "<checkout_config_id>",
  targetObjectId: "prod_12wk_transform",
  linkType: "checkout_product"
})
```

The `lc_checkout` node uses action `create-transaction` with `calculate-pricing` to handle early-bird vs regular price based on current timestamp vs `earlyBirdUntil`.

### Step 4: Create CRM Pipeline

**Pipeline:** `Launch: 12-Week Body Transformation`

**Stages created (in order):**
1. `interested` -- "Interested" -- Visited landing page
2. `waitlisted` -- "Waitlisted" -- Submitted waitlist form
3. `early_bird_purchased` -- "Early Bird Purchased" -- Bought at $297 before March 17
4. `cart_open` -- "Cart Open" -- Received cart-open email after March 15
5. `purchased` -- "Purchased" -- Completed checkout at $497
6. `onboarding` -- "Onboarding" -- Receiving welcome sequence and Week 1 content
7. `completed` -- "Completed" -- Finished 12-week program
8. `refunded` -- "Refunded" -- Refund processed

### Step 5: Create Layers Workflows

**Workflow 1: Waitlist Capture** (as defined in Section 4, Workflow 1)
- `formId` = `"form_transform_waitlist"`
- tags = `["waitlist", "body_transformation"]`
- listName = `"launch_waitlist_body_transformation"`

```
createWorkflow({ sessionId: "<session>", name: "Waitlist: Body Transformation", description: "Captures waitlist signups and syncs to CRM + ActiveCampaign" })
saveWorkflow({ sessionId: "<session>", workflowId: "<wf1_id>", nodes: [...], edges: [...], triggers: [{ type: "trigger_form_submitted", config: { formId: "form_transform_waitlist" } }] })
updateWorkflowStatus({ sessionId: "<session>", workflowId: "<wf1_id>", status: "active" })
```

**Workflow 2: Purchase Processing** (as defined in Section 4, Workflow 2)
- tags = `["purchased_body_transformation"]`
- accessUrl = `"https://coachsarah.com/program/login"`

```
createWorkflow({ sessionId: "<session>", name: "Purchase: Body Transformation", description: "Processes payments, generates invoices, delivers access" })
saveWorkflow({ sessionId: "<session>", workflowId: "<wf2_id>", nodes: [...], edges: [...], triggers: [{ type: "trigger_payment_received", config: { paymentProvider: "any" } }] })
updateWorkflowStatus({ sessionId: "<session>", workflowId: "<wf2_id>", status: "active" })
```

**Workflow 3: Cart Abandonment** (as defined in Section 4, Workflow 3)
- checkoutUrl = `"https://coachsarah.com/body-transformation/checkout"`

```
createWorkflow({ sessionId: "<session>", name: "Cart Abandonment: Body Transformation" })
saveWorkflow({ sessionId: "<session>", workflowId: "<wf3_id>", nodes: [...], edges: [...], triggers: [{ type: "trigger_contact_updated", config: {} }] })
updateWorkflowStatus({ sessionId: "<session>", workflowId: "<wf3_id>", status: "active" })
```

**Workflow 4: Early Bird Expiry** (as defined in Section 4, Workflow 4)
- cronExpression for March 17 00:00 UTC: `"0 0 17 3 *"`
- timezone = `"America/New_York"`

```
createWorkflow({ sessionId: "<session>", name: "Early Bird Expiry: Body Transformation" })
saveWorkflow({ sessionId: "<session>", workflowId: "<wf4_id>", nodes: [...], edges: [...], triggers: [{ type: "trigger_schedule", config: { cronExpression: "0 0 17 3 *", timezone: "America/New_York" } }] })
updateWorkflowStatus({ sessionId: "<session>", workflowId: "<wf4_id>", status: "active" })
```

### Step 6: Create Sequences

**Sequence A: Pre-Launch Anticipation** (subtype: `vorher`)

| Step | Channel | Timing | Subject | Body Summary |
|------|---------|--------|---------|-------------|
| 1 | email | -7d from saleStartDate (`{ offset: 7, unit: "days", referencePoint: "trigger_event" }`) | "Something big is coming..." | Tease the transformation, Coach Sarah's story |
| 2 | email | -5d | "The #1 mistake busy professionals make with fitness" | Problem agitation, hint at the solution |
| 3 | email | -3d | "How 47 people transformed their bodies in 12 weeks" | Social proof, before/after results |
| 4 | email | -1d | "Tomorrow changes everything" | Final anticipation, what to expect, early bird reveal |
| 5 | sms | -2h | "Cart opens in 2 hours! Check your email for early bird access" | Urgency nudge |

Trigger event: `contact_tagged` (tag: `"waitlist_body_transformation"`)

**Sequence B: Launch Sales Campaign** (subtype: `custom`)

| Step | Channel | Timing | Subject | Body Summary |
|------|---------|--------|---------|-------------|
| 1 | email | Day 0 (`{ offset: 0, unit: "days", referencePoint: "trigger_event" }`) | "It's HERE: 12-Week Body Transformation (early bird: $297)" | Big announcement, value prop, early bird CTA |
| 2 | email | Day 1 | "She lost 23 lbs in 12 weeks (here's her story)" | Social proof, testimonial, results |
| 3 | email | Day 2 | "Your top 7 questions, answered" | FAQ, objection handling |
| 4 | email | Day 3 | "From desk job to deadlifts: Mark's transformation" | Case study deep dive |
| 5 | email | Day 4 | "I'm adding 3 bonus modules (worth $297)" | Bonus stack, value-to-price ratio |
| 6 | email | Day 5 | "50% sold -- and early bird ends tomorrow" | Scarcity signal, inventory count |
| 7 | sms | Day 5 | "Early bird $297 ends tomorrow. 47 spots left." | SMS urgency |
| 8 | email | Day 6 AM (`{ offset: 6, unit: "days", referencePoint: "trigger_event" }`) | "FINAL DAY: Everything you get for $497" | Deadline reminder, full recap |
| 9 | email | Day 6 PM (`{ offset: 150, unit: "hours", referencePoint: "trigger_event" }`) | "Cart closes at midnight -- last chance" | Final CTA, countdown, urgency |
| 10 | sms | Day 6 PM | "Last chance: cart closes tonight. Link inside." | Final SMS push |

Trigger event: `pipeline_stage_changed` (to `cart_open`)

**Sequence C: Post-Purchase Onboarding** (subtype: `nachher`)

| Step | Channel | Timing | Subject | Body Summary |
|------|---------|--------|---------|-------------|
| 1 | email | +1h from purchase (`{ offset: 1, unit: "hours", referencePoint: "trigger_event" }`) | "Welcome! Here's how to get started" | Login instructions, download links, community invite |
| 2 | email | +1d | "Week 1 starts now: Your first workout" | First module access, what to expect |
| 3 | email | +3d | "Quick check-in: How's Week 1 going?" | Engagement check, support link |
| 4 | whatsapp | +5d | "Hey! Join our private community group" | Community invite via WhatsApp |
| 5 | email | +7d | "Week 2 unlocked + your progress tracker" | Next module, progress tracking |

Trigger event: `contact_tagged` (tag: `"purchased_body_transformation"`)

### Step 7: Generate Copy

**StoryBrand One-Liner:**
"Most busy professionals waste months on fitness programs that don't work. The 12-Week Body Transformation gives you a proven system with video workouts, meal plans, and weekly coaching -- so you can finally get the body you want without living at the gym."

**Landing page headline:** "Transform Your Body in 12 Weeks -- Without Spending Hours at the Gym"
**Subheadline:** "Join 200+ professionals who got in the best shape of their lives with Coach Sarah's proven system."

### Step 8: Link Objects

```
// Product -> Waitlist Form
objectLinks.create({
  sourceObjectId: "prod_12wk_transform",
  targetObjectId: "form_transform_waitlist",
  linkType: "product_form"
})

// Checkout -> Product
objectLinks.create({
  sourceObjectId: "<checkout_config_id>",
  targetObjectId: "prod_12wk_transform",
  linkType: "checkout_product"
})

// Waitlist Workflow -> Waitlist Form
objectLinks.create({
  sourceObjectId: "<wf1_id>",
  targetObjectId: "form_transform_waitlist",
  linkType: "workflow_form"
})

// Waitlist Workflow -> Pre-Launch Sequence
objectLinks.create({
  sourceObjectId: "<wf1_id>",
  targetObjectId: "<seq_a_id>",
  linkType: "workflow_sequence"
})

// Purchase Workflow -> Onboarding Sequence
objectLinks.create({
  sourceObjectId: "<wf2_id>",
  targetObjectId: "<seq_c_id>",
  linkType: "workflow_sequence"
})
```

### Final Checklist

- [x] Product created with price in cents (49700), `saleStartDate`, `saleEndDate`, `earlyBirdUntil` all set
- [x] `saleStartDate < earlyBirdUntil < saleEndDate` validated
- [x] Waitlist form created and published
- [x] Checkout linked to product via `checkout_product`
- [x] CRM pipeline with 8 stages created
- [x] 4 workflows created, saved, and set to `active`
- [x] 3 sequences created (vorher, custom, nachher)
- [x] All `objectLinks` created (product_form, checkout_product, workflow_form, workflow_sequence x2)
- [x] Pre-launch page live, sales page in draft until `saleStartDate`
- [x] Project file system scaffold initialized with `/builder`, `/layers`, `/notes`, `/assets`
- [x] Copy generated: StoryBrand one-liner, headlines, email subjects
