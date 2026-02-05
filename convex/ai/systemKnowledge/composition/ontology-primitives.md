# Platform Ontology Primitives

You are composing automations from platform building blocks. Every entity lives in the `objects` table with a `type`, `subtype`, and flexible `customProperties`. Relationships between objects use `objectLinks`. Actions and audit trail use `objectActions`.

## Object Types

### CRM Contact (`crm_contact`)

**Subtypes:** `customer` | `lead` | `prospect`

**Key properties:**
- `firstName`, `lastName`, `email`, `phone`
- `companyName`, `contactType`
- `tags[]` — for segmentation and automation triggers
- `pipelineStageId` — current stage in a CRM pipeline
- `pipelineDealValue` — monetary value of the deal
- `customFields` — arbitrary key-value data
- `addresses[]` — structured address objects

**Create with:** `createContact(sessionId, organizationId, firstName, lastName, email, phone, contactType, customFields, tags)`

**Update with:** `updateContact(sessionId, contactId, firstName, lastName, email, phone, tags, customFields)`

**Link to org:** `linkContactToOrganization(sessionId, contactId, crmOrganizationId, roleInOrganization)`

---

### CRM Organization (`crm_organization`)

**Subtypes:** `customer` | `prospect` | `partner`

**Key properties:**
- `companyName`, `industry`, `employeeCount`
- `addresses[]`, `customFields`

**Create with:** `createCrmOrganization(sessionId, organizationId, companyName, subtype, industry, customFields)`

---

### Form (`form`)

**Subtypes:** `registration` | `survey` | `application`

**Field types:** `text` | `textarea` | `email` | `phone` | `number` | `date` | `select` | `radio` | `checkbox` | `multi_select` | `file` | `rating` | `section_header`

**Key properties:**
- `fields[]` — ordered array of field definitions, each with `type`, `label`, `required`, `options[]`
- `formSettings` — submission behavior, redirect URL, notifications
- `displayMode` — how the form renders
- `conditionalLogic[]` — show/hide fields based on answers
- `submissionWorkflow` — what happens after submission

**Create with:** `createForm(sessionId, organizationId, name, subtype, fields, formSettings)`

**Publish with:** `publishForm(sessionId, formId)` — makes form publicly accessible

**Submissions:** `createFormResponse(sessionId, formId, answers, metadata)` or `submitPublicForm(formId, answers, metadata)` (no auth)

---

### Product (`product`)

**Subtypes:** `ticket` | `physical` | `digital`

**Key properties:**
- `productCode`, `description`
- `priceConfig` — pricing tiers, currency, intervals
- `taxBehavior` — tax handling mode
- `saleStartDate`, `saleEndDate` — availability window
- `earlyBirdUntil` — early bird pricing cutoff
- `maxQuantity` — inventory cap
- `requiresShipping` — physical fulfillment flag
- `invoiceConfig` — invoice template settings

**Create with:** `createProduct(sessionId, organizationId, name, subtype, description, priceConfig, saleStartDate, saleEndDate)`

**Publish with:** `publishProduct(sessionId, productId)`

**Archive with:** `archiveProduct(sessionId, productId)`

---

### Project (`project`)

**Subtypes:** `client_project` | `internal` | `campaign` | `product_development` | `other`

**Status flow:** `draft` -> `planning` -> `active` -> `on_hold` -> `completed` -> `cancelled`

**Key properties:**
- `projectCode`, `description`, `status`
- `startDate`, `endDate`, `budget`
- `milestones[]` — each with `title`, `dueDate`, `assignedTo`
- `tasks[]` — each with `title`, `description`, `status`, `priority`, `assignedTo`, `dueDate`
- `internalTeam[]` — platform users assigned to project
- `clientTeam[]` — CRM contacts assigned to project
- `publicPageConfig` — client-facing project portal settings

**Create with:** `createProject(sessionId, organizationId, name, subtype, description, startDate, endDate, budget, clientContactId)`

**Add milestones:** `createMilestone(sessionId, projectId, title, dueDate, assignedTo)`

**Add tasks:** `createTask(sessionId, projectId, title, description, status, priority, assignedTo, dueDate)`

---

### Event (`event`)

Events represent one-time or recurring gatherings — conferences, workshops, meetups.

**Key properties:**
- `name`, `date`, `location`, `description`
- Linked to products (for ticketing), forms (for registration), projects (for planning)

---

### Bookable Resource (`bookable_resource`)

**Subtypes:** `room` | `staff` | `equipment` | `space`

### Bookable Service (`bookable_service`)

**Subtypes:** `appointment` | `class` | `treatment`

---

### Builder App (`builder_app`)

**Subtypes:** `v0_generated` | `template_based` | `custom`

**Status flow:** `draft` -> `generating` -> `ready` -> `deploying` -> `deployed` -> `failed` -> `archived`

**Key properties:**
- `appCode`, `v0ChatId`, `v0WebUrl`, `v0DemoUrl`
- `linkedObjects` — objects this app connects to
- `deploymentInfo` — hosting and domain config
- `connectionConfig` — API key and scope mapping
- `sdkIntegration` — client SDK configuration

---

## Object Links

Relationships between any two objects. Used to wire forms to products, products to checkouts, contacts to projects, etc.

```
objectLinks table:
  sourceObjectId — the "from" object
  targetObjectId — the "to" object
  linkType — describes the relationship (e.g., "product_form", "project_contact", "checkout_product")
  properties — optional metadata on the link
```

**Common link patterns:**
- Form -> CRM Pipeline (form submission creates lead in pipeline)
- Product -> Form (product requires registration form)
- Product -> Checkout (product sold through checkout)
- Project -> Contact (client assigned to project)
- Workflow -> Form (workflow triggered by form submission)
- Workflow -> Sequence (workflow enrolls contact in sequence)

## Object Actions

Audit trail for every mutation. Each action records `actionType`, `triggeredBy`, `timestamp`, and `metadata`.

---

## Composition Rules

1. **Always create dependencies first.** A checkout needs products. A workflow triggered by form submission needs the form. Create in dependency order.
2. **Link objects after creation.** Use `link_objects` to wire relationships. Links are what make the automation flow work.
3. **Respect status flows.** Objects start in `draft`. Publish/activate when the composition is complete, not before.
4. **Use tags for automation triggers.** Tags on contacts are the primary mechanism for enrollment in sequences and workflow branching.
5. **CRM pipelines are ordered stages.** Each stage represents a step in the sales/service process. Contacts move through stages via workflow actions or manual updates.
