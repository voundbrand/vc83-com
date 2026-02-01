# Ontology Connection Reference

How each l4yercak3 ontology object maps to the builder connection system: what it is, what's exposed via API, and how it connects to UI elements in v0-generated apps.

---

## Object Inventory

| Ontology | DB Type | Subtypes | Key Fields | API Endpoints | Public Mutations | UI Elements That Map |
|----------|---------|----------|------------|---------------|-----------------|---------------------|
| **Product** | `product` | ticket, physical, digital, room, staff, equipment, space, appointment, class, treatment | name, price (cents), currency, inventory, sold, taxBehavior, eventId | GET/POST `/products`, GET/PUT `/{id}` | createProduct, updateProduct, archiveProduct, publishProduct, duplicateProduct | **Pricing tiers**, product cards, feature cards with prices, "Buy Now" CTAs |
| **Event** | `event` | conference, workshop, concert, meetup, seminar | name, startDate, endDate, location, timezone, agenda[], maxCapacity, slug, media | GET/POST `/events`, GET/PUT `/{id}` | createEvent, updateEvent, cancelEvent, publishEvent | **Hero/CTA with dates**, schedule sections, countdown timers, "Register" CTAs |
| **Contact** | `crm_contact` | customer, lead, prospect | firstName, lastName, email, phone, jobTitle, company, addresses[], source, tags[] | GET/POST `/crm/contacts`, GET `/{id}` | createContact, updateContact, deleteContact | **Team sections**, testimonial authors, "Contact Us" forms, newsletter signups |
| **Form** | `form` | registration, survey, application | formSchema (fields[], sections[], settings), eventId, stats, publicUrl | GET/POST `/forms`, GET `/{id}`, POST `/responses`, POST `/public/{id}/submit` | createForm, updateForm, publishForm, duplicateForm | **Form elements** (`<form>`, inputs, textareas), registration flows, survey pages, application forms |
| **Invoice** | `invoice` | b2b_consolidated, b2b_single, b2c_single | billToName, billToEmail, lineItems[], subtotal, tax, total, currency, dueDate, paymentTerms, status | GET/POST `/invoices`, GET `/{id}`, POST `/{id}/send` | createDraftInvoice, markAsSent, markAsPaid | **Billing tables**, line-item lists, payment status displays, "Pay Now" CTAs |
| **Ticket** | `ticket` | standard, vip, early-bird, student | holderName, holderEmail, productId, eventId, purchaseDate, status (issued/redeemed/cancelled) | GET/POST `/tickets`, GET/PUT `/{id}` | createTicket (public), redeemTicket, cancelTicket | **Ticket tier selectors**, admission badges, QR code displays, "Get Tickets" CTAs |
| **Booking** | `booking` | appointment, reservation, rental, class_enrollment | startDateTime, endDateTime, customerName, customerEmail, resourceIds[], participants, totalAmountCents | GET/POST `/resource-bookings`, POST `/checkout`, GET `/resources/{id}/slots` | createBooking | **Calendar/datepicker**, time slot grids, availability displays, "Book Now" CTAs |
| **Workflow** | `workflow` | custom (e.g., checkout-flow, form-processing) | name, triggerOn, objects[], behaviors[], execution config, visualData | POST `/workflows/trigger` | createWorkflow, updateWorkflow, executeWorkflow | **Process/step visualizations**, automation diagrams, pipeline displays |
| **Checkout** | `checkout_instance` | ticket, product, service | templateCode, name, paymentProvider(s), linkedProducts[], publicSlug, branding, checkoutFlow | POST `/checkout`, GET `/checkout/{id}`, POST `/checkout/{id}/complete`, GET `/orders` | createCheckoutInstance, publishCheckoutInstance | **Shopping carts**, order summaries, payment forms, "Add to Cart" buttons, multi-step purchase flows |

---

## Connection Capability Matrix

| Type | Auto-Detect in v0 Files | Auto-Detect in JSON Schema | Manual Add | Create New | Link Existing | Skip |
|------|------------------------|---------------------------|------------|------------|---------------|------|
| **Product** | pricing/plans arrays | pricing section tiers | yes | yes | yes | yes |
| **Event** | -- | hero/cta with dates | yes | yes | yes | yes |
| **Contact** | team/member arrays | team section members | yes | yes | yes | yes |
| **Form** | `<form>` tags, 3+ inputs | -- | yes | yes | yes | yes |
| **Invoice** | invoice/billing keywords + table | -- | yes | yes | yes | yes |
| **Ticket** | ticket/admission/QR keywords | -- | yes | **Link only** (internal mutation) | yes | yes |
| **Booking** | calendar/datepicker/availability | -- | yes | yes | yes | yes |
| **Workflow** | -- (purely backend) | -- | yes | yes | yes | yes |
| **Checkout** | cart/checkout/order-summary | -- | yes | yes | yes | yes |

---

## Create Mutation Args (Builder Defaults)

When a user clicks "Create New" in the connection panel, these mutations are called with sensible defaults:

| Type | Mutation | Required Args (with defaults) |
|------|----------|-------------------------------|
| **Product** | `productOntology.createProduct` | `name`, `subtype: "digital"`, `price: 0` |
| **Event** | `eventOntology.createEvent` | `name`, `subtype: "meetup"`, `startDate: now+7d`, `endDate: now+7d+2h`, `location: "TBD"` |
| **Contact** | `crmOntology.createContact` | `firstName`, `lastName`, `subtype: "lead"` |
| **Form** | `formsOntology.createForm` | `name`, `subtype: "registration"`, `formSchema: { version:"1.0", fields:[], settings:{} }` |
| **Invoice** | `invoicingOntology.createDraftInvoice` | `billToName`, `billToEmail`, `lineItems: []`, `subtotalInCents: 0`, `taxInCents: 0`, `totalInCents: 0`, `currency: "EUR"`, `invoiceDate: now`, `dueDate: now+30d` |
| **Ticket** | **N/A -- internal only** | Cannot create from client. Link existing or skip only. |
| **Booking** | `bookingOntology.createBooking` | `subtype: "appointment"`, `customerName`, `customerEmail`, `startDateTime: now+1d`, `endDateTime: now+1d+1h`, `resourceIds: []` |
| **Workflow** | `workflowOntology.createWorkflow` | `name`, `subtype: "custom"`, `triggerOn: "manual"`, `objects: []`, `behaviors: []`, `execution: { triggerOn:"manual", errorHandling:"continue" }` |
| **Checkout** | `checkoutOntology.createCheckoutInstance` | `templateCode: "default"`, `name` |

---

## DB Type Map (Existing Records Search)

Maps `DetectedItem.type` to the actual `objects.type` string used in Convex queries (`getExistingRecordsForConnection`):

| DetectedItem type | DB object type | Notes |
|---|---|---|
| contact | `crm_contact` | |
| form | `form` | |
| product | `product` | |
| event | `event` | |
| invoice | `invoice` | |
| ticket | `ticket` | |
| booking | `booking` | |
| workflow | `workflow` | |
| checkout | `checkout_instance` | |

---

## API Category IDs

The publish wizard uses these category IDs (stored in `connectionConfig.selectedCategories`):

| Category ID | Label | Scopes |
|---|---|---|
| `forms` | Forms & Submissions | forms:read, forms:write |
| `crm` | CRM & Contacts | contacts:read, contacts:write |
| `events` | Events & Ticketing | events:read, events:write |
| `products` | Products & Pricing | products:read, products:write |
| `workflows` | Workflows & Automation | workflows:trigger, workflows:write |
| `invoices` | Invoicing & Payments | invoices:read, invoices:write |
| `tickets` | Tickets & Check-in | tickets:read, tickets:write |
| `bookings` | Bookings & Availability | bookings:read, bookings:write, availability:read, availability:write |
| `checkout` | Checkout & Orders | checkout:read, checkout:write |

---

## Key Files

| File | Purpose |
|------|---------|
| `src/lib/api-catalog.ts` | Static catalog of all 9 API categories |
| `src/contexts/builder-context.tsx` | DetectedItem/LinkedRecord types, analyzePageForConnections, executeConnections, addManualConnectionItem |
| `convex/builderAppOntology.ts` | linkObjectsToBuilderApp (persists connections), getExistingRecordsForConnection (lookup) |
| `src/lib/builder/v0-file-analyzer.ts` | Heuristic detection of UI elements in v0 React source files |
| `src/components/builder/connection-panel.tsx` | Interactive UI for create/link/skip per detected item |
| `src/lib/scaffold-generators/thin-client.ts` | Generates API helper libs and pages per category |
