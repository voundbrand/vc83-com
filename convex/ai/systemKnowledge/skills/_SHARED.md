# Shared Ontology Reference

Canonical field names, mutation signatures, and node types for all skills. Every SKILL.md references this document. Use these exact names — no aliases, no abbreviations.

---

## Universal Object Model

All entities live in the `objects` table:

```
objects {
  _id: Id<"objects">
  organizationId: Id<"organizations">
  type: string              // "crm_contact", "product", "form", "project", etc.
  subtype: string           // varies by type
  name: string
  customProperties: any     // type-specific fields (see below)
  createdBy: Id<"users">
  createdAt: number
  updatedAt?: number
}
```

Relationships use `objectLinks`:

```
objectLinks {
  sourceObjectId: Id<"objects">
  targetObjectId: Id<"objects">
  linkType: string          // "product_form", "project_contact", "checkout_product", etc.
  properties?: any          // optional metadata on the link
}
```

---

## CRM

### Contact (`type: "crm_contact"`)

**Subtypes:** `customer` | `lead` | `prospect`

**customProperties:**
- `firstName: string`
- `lastName: string`
- `email: string`
- `phone: string`
- `companyName: string`
- `contactType: string`
- `tags: string[]`
- `pipelineStageId: string`
- `pipelineDealValue: number`
- `customFields: Record<string, any>`
- `addresses: Array<{ street, city, state, zip, country }>`

**Mutations:**
- `createContact({ sessionId, organizationId, firstName, lastName, email, phone, contactType, customFields, tags })`
- `updateContact({ sessionId, contactId, firstName?, lastName?, email?, phone?, tags?, customFields? })`
- `deleteContact({ sessionId, contactId })`
- `linkContactToOrganization({ sessionId, contactId, crmOrganizationId, roleInOrganization })`
- `inviteContactToPortal({ sessionId, contactId, portalType, permissions })`

### CRM Organization (`type: "crm_organization"`)

**Subtypes:** `customer` | `prospect` | `partner`

**customProperties:**
- `companyName: string`
- `industry: string`
- `employeeCount: number`
- `customFields: Record<string, any>`
- `addresses: Array<{ street, city, state, zip, country }>`

**Mutations:**
- `createCrmOrganization({ sessionId, organizationId, companyName, subtype, industry, customFields })`
- `updateCrmOrganization({ sessionId, crmOrganizationId, companyName?, industry?, customFields? })`

---

## Products

### Product (`type: "product"`)

**Subtypes:** `ticket` | `physical` | `digital`

**customProperties:**
- `productCode: string`
- `description: string`
- `price: number` (in cents)
- `currency: string` (ISO 4217)
- `inventory: number`
- `sold: number`
- `taxBehavior: string`
- `saleStartDate: number` (timestamp)
- `saleEndDate: number` (timestamp)
- `earlyBirdUntil: number` (timestamp)
- `maxQuantity: number`
- `requiresShipping: boolean`
- `invoiceConfig: object`
- `eventId: string` (for ticket subtype)
- `ticketTier: string` (for ticket subtype)
- `bookingSettings: object` (for bookable products)

**Mutations:**
- `createProduct({ sessionId, organizationId, name, subtype, price?, currency?, description?, ... })`
- `updateProduct({ sessionId, productId, name?, description?, price?, ... })`
- `publishProduct({ sessionId, productId })`
- `archiveProduct({ sessionId, productId })`
- `restoreProduct({ sessionId, productId })`
- `duplicateProduct({ sessionId, productId, newName })`
- `incrementSold({ productId, quantity })`

### Bookable Resource (`type: "bookable_resource"`)

**Subtypes:** `room` | `staff` | `equipment` | `space`

### Bookable Service (`type: "bookable_service"`)

**Subtypes:** `appointment` | `class` | `treatment`

---

## Forms

### Form (`type: "form"`)

**Subtypes:** `registration` | `survey` | `application`

**Field types:** `text` | `textarea` | `email` | `phone` | `number` | `date` | `time` | `datetime` | `select` | `radio` | `checkbox` | `multi_select` | `file` | `rating` | `section_header`

**customProperties:**
- `fields: Array<{ type, label, required, options?, placeholder?, defaultValue? }>`
- `formSettings: object` (redirect URL, notifications, submission behavior)
- `displayMode: string`
- `conditionalLogic: Array<{ fieldId, operator, value, action, targetFieldId }>`
- `submissionWorkflow: object`

**Mutations:**
- `createForm({ sessionId, organizationId, name, description?, fields, formSettings? })`
- `updateForm({ sessionId, formId, name?, fields?, formSettings?, conditionalLogic? })`
- `publishForm({ sessionId, formId })`
- `unpublishForm({ sessionId, formId })`
- `duplicateForm({ sessionId, formId, newName })`
- `createFormResponse({ sessionId, formId, responses, metadata? })`
- `submitPublicForm({ formId, responses, metadata? })` — no auth required
- `linkFormToTicket({ sessionId, formId, ticketProductId })`

---

## Invoicing

### Invoice

**Types:** `b2b_consolidated` | `b2b_single` | `b2c_single`

**Status flow:** `draft` -> `sent` -> `paid` | `overdue` | `cancelled` | `awaiting_employer_payment`

**Payment terms:** `due_on_receipt` | `net7` | `net15` | `net30` | `net60` | `net90`

**Workflow:** draft -> seal (generates final number) -> send -> paid

**Mutations:**
- `createDraftInvoiceFromTransactions({ organizationId, customerId, transactionIds, ... })`
- `editDraftInvoiceLineItems({ invoiceId, lineItems })`
- `sealInvoice({ invoiceId })` — generates invoice number, locks line items
- `markInvoiceAsSent({ sessionId, invoiceId })`
- `markInvoiceAsPaid({ sessionId, invoiceId, paymentDate, ... })`
- `createInvoiceRule({ sessionId, organizationId, name, ruleType, ... })`
- `executeInvoiceRule({ sessionId, ruleId })`
- `createConsolidatedInvoice({ sessionId, organizationId, employerId, ... })`

---

## Projects

### Project (`type: "project"`)

**Subtypes:** `client_project` | `internal` | `campaign` | `product_development` | `other`

**Status flow:** `draft` -> `planning` -> `active` -> `on_hold` -> `completed` -> `cancelled`

**customProperties:**
- `projectCode: string`
- `description: string`
- `status: string`
- `startDate: number`
- `endDate: number`
- `budget: number`
- `milestones: Array<{ title, dueDate, assignedTo, status }>`
- `tasks: Array<{ title, description, status, priority, assignedTo, dueDate }>`
- `internalTeam: Array<{ userId, role }>`
- `clientTeam: Array<{ contactId, role }>`
- `publicPageConfig: object`

**Mutations:**
- `createProject({ sessionId, organizationId, name, subtype, description?, startDate?, endDate?, budget?, clientContactId? })`
- `updateProject({ sessionId, projectId, name?, description?, status?, startDate?, endDate?, budget? })`
- `createMilestone({ sessionId, projectId, title, dueDate, assignedTo? })`
- `createTask({ sessionId, projectId, title, description?, status?, priority?, assignedTo?, dueDate? })`
- `addInternalTeamMember({ sessionId, projectId, userId, role })`
- `addClientTeamMember({ sessionId, projectId, contactId, role })`

### Project File System

**Default folders:** `/builder`, `/layers`, `/notes`, `/assets`

**File kinds:** `folder` | `virtual` | `media_ref` | `builder_ref` | `layer_ref`

**Mutations:**
- `initializeProjectFolders({ organizationId, projectId })`
- `createFolder({ sessionId, projectId, name, parentPath })`
- `createVirtualFile({ sessionId, projectId, name, parentPath, content })`
- `captureBuilderApp({ projectId, builderAppId })`
- `captureLayerWorkflow({ projectId, layerWorkflowId })`

---

## Certificates

**Create certificate fields:**
- `pointType: string` ("ce", "cme", "cpd")
- `pointsAwarded: number`
- `pointCategory: string`
- `pointUnit: string` ("credits", "hours")
- `recipientName: string`
- `recipientEmail: string`
- `licenseNumber?: string`
- `profession?: string`
- `eventId?: string`
- `eventName?: string`
- `eventDate?: number`
- `accreditingBody?: string`
- `expirationMonths?: number`

**API:** POST `/api/v1/certificates`
**Batch:** POST `/api/v1/certificates/batch`
**Verify:** GET `/api/v1/certificates/verify/:certificateNumber` (public)

---

## Bookings

**Create booking:**
```
POST /api/v1/bookings/create
{
  eventId, productId,
  primaryAttendee: { firstName, lastName, email, phone },
  guests?: [{ firstName, lastName, email?, phone }],
  source: "web" | "mobile"
}
```

**Returns:** `bookingId`, `transactionId`, `tickets[]` (each with `qrCode`), `crmContacts[]`

---

## Benefits

**Create benefit:** POST `/api/v1/benefits`
**Claims:** POST `/api/v1/benefits/:benefitId/claims`
**Commissions:** POST `/api/v1/commissions`
**Payouts:** POST `/api/v1/commissions/:commissionId/payouts`

---

## Layers Workflow System

### Workflow Object (`type: "layer_workflow"`)

**Subtypes:** `workflow` | `template_clone`

**Status flow:** `draft` -> `ready` -> `active` -> `paused` -> `error` -> `archived`

**Data structure:**
```
LayerWorkflowData {
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  metadata: { description, isActive, mode, runCount, version }
  triggers: TriggerConfig[]
  viewport?: { x, y, zoom }
}
```

**Node structure:**
```
WorkflowNode {
  id: string           // unique node ID
  type: string         // exact node type from registry
  position: { x, y }   // canvas position
  config: {}           // node-specific configuration
  status: "draft" | "configuring" | "ready" | "active" | "error" | "disabled"
  label?: string
}
```

**Edge structure:**
```
WorkflowEdge {
  id: string
  source: string        // source node ID
  target: string        // target node ID
  sourceHandle: string  // output handle ID
  targetHandle: string  // input handle ID
  condition?: string
  label?: string
}
```

**Mutations:**
- `createWorkflow({ sessionId, name, description? })` -> workflowId
- `saveWorkflow({ sessionId, workflowId, name?, description?, nodes, edges, triggers?, viewport? })`
- `updateWorkflowStatus({ sessionId, workflowId, status })`
- `deleteWorkflow({ sessionId, workflowId })`
- `cloneWorkflow({ sessionId, sourceWorkflowId, newName })`

### Trigger Nodes

| Type | Config | Outputs |
|------|--------|---------|
| `trigger_form_submitted` | `formId` | `output` |
| `trigger_payment_received` | `paymentProvider: "any" \| "stripe" \| "lc_checkout"` | `output` |
| `trigger_booking_created` | — | `output` |
| `trigger_contact_created` | — | `output` |
| `trigger_contact_updated` | — | `output` |
| `trigger_webhook` | `path, secret` | `output` |
| `trigger_schedule` | `cronExpression, timezone` | `output` |
| `trigger_manual` | `sampleData` | `output` |
| `trigger_email_received` | — | `output` |
| `trigger_chat_message` | — | `output` |

### LC Native Nodes

| Type | Actions | Inputs/Outputs |
|------|---------|---------------|
| `lc_crm` | `create-contact`, `update-contact`, `move-pipeline-stage`, `detect-employer-billing` | `input` -> `output` |
| `lc_forms` | `create-form-response`, `validate-registration` | `input` -> `output` |
| `lc_invoicing` | `generate-invoice`, `consolidated-invoice-generation` | `input` -> `output` |
| `lc_checkout` | `create-transaction`, `calculate-pricing` | `input` -> `output` |
| `lc_tickets` | — | `input` -> `output` |
| `lc_bookings` | — | `input` -> `output` |
| `lc_events` | — | `input` -> `output` |
| `lc_email` | `send-confirmation-email`, `send-admin-notification` | `input` -> `output` |
| `lc_sms` | — | `input` -> `output` |
| `lc_whatsapp` | — | `input` -> `output` |
| `lc_ai_agent` | — (config: `prompt`, `model`) | `input` -> `output` |
| `lc_landing_pages` | — | `input` -> `output` |
| `lc_file_storage` | — | `input` -> `output` |
| `lc_certificates` | — | `input` -> `output` |
| `lc_activecampaign_sync` | — | `input` -> `output` |

### Integration Nodes (Available)

| Type | Actions | Status |
|------|---------|--------|
| `activecampaign` | `add_contact`, `add_tag`, `add_to_list`, `add_to_automation` | available |
| `whatsapp_business` | `send_message`, `send_template` | available |
| `resend` | config: `to`, `subject`, `htmlContent` | available |
| `stripe` | — | available |
| `manychat` | — | available |
| `chatwoot` | — | available |
| `infobip` | — | available |
| `pushover` | — | available |
| `posthog` | — | available |
| `github` | — | available |
| `vercel` | — | available |
| `microsoft_365` | — | available |
| `google_workspace` | — | available |

### Logic Nodes

| Type | Handles | Config |
|------|---------|--------|
| `if_then` | `input` -> `true` \| `false` | `expression` |
| `wait_delay` | `input` -> `output` | `duration`, `unit: "seconds" \| "minutes" \| "hours" \| "days"` |
| `split_ab` | `input` -> `branch_a` \| `branch_b` | `splitPercentage` |
| `merge` | `input_a` + `input_b` -> `output` | `mergeStrategy: "wait_all" \| "first"` |
| `loop_iterator` | `input` -> `each_item` \| `completed` | `arrayField`, `maxIterations` |
| `filter` | `input` -> `match` \| `no_match` | — |
| `transform_data` | `input` -> `output` | — |
| `http_request` | `input` -> `output` | `url`, `method`, `headers`, `body` |
| `code_block` | `input` -> `output` | `code` (JavaScript) |

---

## Sequences

**Type:** `automation_sequence`

**Subtypes:** `vorher` (before) | `waehrend` (during) | `nachher` (after) | `lifecycle` | `custom`

**Trigger events:** `booking_confirmed`, `booking_checked_in`, `booking_completed`, `pipeline_stage_changed`, `contact_tagged`, `form_submitted`, `manual_enrollment`

**Channels:** `email` | `sms` | `whatsapp` | `preferred`

**Timing reference points:** `trigger_event` | `booking_start` | `booking_end` | `previous_step`

**Step structure:**
```
{
  channel: "email" | "sms" | "whatsapp" | "preferred",
  timing: {
    offset: number,
    unit: "minutes" | "hours" | "days",
    referencePoint: "trigger_event" | "booking_start" | "booking_end" | "previous_step"
  },
  content: { subject?, body, ... }
}
```

---

## Behavior Executor

The workflow behavior system executes actions. Each behavior costs 1 credit.

**Behavior types:**
- `create-contact`, `update-contact`, `move-pipeline-stage`
- `create-ticket`, `create-transaction`, `generate-invoice`
- `send-confirmation-email`, `send-admin-notification`
- `validate-registration`, `detect-employer-billing`
- `check-event-capacity`, `calculate-pricing`
- `create-form-response`, `update-statistics`
- `consolidated-invoice-generation`, `activecampaign-sync`

**Execute:**
```
executeBehavior({ sessionId, organizationId, behaviorType, config, context? })
```

---

## Builder App (`type: "builder_app"`)

**Subtypes:** `v0_generated` | `template_based` | `custom`

**Status flow:** `draft` -> `generating` -> `ready` -> `deploying` -> `deployed` -> `failed` -> `archived`

**File system mutations:**
- `bulkUpsertFiles({ appId, files: [{ path, content, language }], modifiedBy })`
- `updateFileContent({ sessionId, appId, path, content, modifiedBy })`
- `getFilesByApp({ sessionId, appId })`

**modifiedBy values:** `v0` | `user` | `self-heal` | `scaffold` | `github-import`

---

## Link Types

Standard `linkType` values used in `objectLinks`:

- `product_form` — product requires this form
- `checkout_product` — checkout sells this product
- `project_contact` — contact assigned to project
- `workflow_form` — workflow triggered by form
- `workflow_sequence` — workflow enrolls in sequence
- `event_product` — event uses this ticket product
- `form_ticket` — form linked to ticket product

---

## Credit Costs

| Action | Credits |
|--------|---------|
| Behavior execution | 1 |
| AI agent message (per message) | 1-3 |
| RAG embed document | 3 |
| RAG query | 1 |
| Skill execution (per skill step) | 1-3 |
