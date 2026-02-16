# Skill: E-Commerce Storefront

> References: `_SHARED.md` for all ontology definitions, mutation signatures, node types, and link types. Every table name, field name, mutation signature, node type, and handle name used below is taken verbatim from that document. Do not alias or abbreviate.

---

## 1. Purpose

This skill builds a complete e-commerce product sales system for an agency's client. The deployment creates a product catalog with physical and digital products, wires up a checkout flow with Stripe payment processing, automates order processing with invoice generation and CRM tracking, sends confirmation emails and syncs contacts to ActiveCampaign, manages shipping notifications for physical products, and runs post-purchase nurture sequences that drive reviews, cross-sell recommendations, and repeat purchases. The canonical four-layer `BusinessLayer` model applies: `Business L1` (platform) provides infrastructure, `Business L2` (agency) configures and deploys for the client business at `Business L3`, and the buyers entering the store are `Business L4` end-customers. The outcome is a fully automated system where every purchase flows through order processing, invoice generation, customer relationship management, and multi-step post-purchase engagement without manual intervention.

---

## 2. Ontologies Involved

### Objects (`objects` table)

| type | subtype | customProperties used |
|------|---------|----------------------|
| `product` | `physical` | `productCode`, `description`, `price` (cents), `currency`, `inventory`, `sold`, `taxBehavior`, `maxQuantity`, `requiresShipping: true`, `invoiceConfig` |
| `product` | `digital` | `productCode`, `description`, `price` (cents), `currency`, `inventory`, `sold`, `taxBehavior`, `maxQuantity`, `requiresShipping: false`, `invoiceConfig` |
| `crm_contact` | `customer` | `firstName`, `lastName`, `email`, `phone`, `contactType: "customer"`, `tags`, `pipelineStageId`, `pipelineDealValue`, `customFields: { orderCount, totalSpent, lastOrderDate }`, `addresses` |
| `form` | `registration` | `fields` (array of field objects), `formSettings` (redirect URL, notifications), `displayMode`, `conditionalLogic`, `submissionWorkflow` |
| `layer_workflow` | `workflow` | Full `LayerWorkflowData`: `nodes`, `edges`, `metadata`, `triggers` |
| `automation_sequence` | `nachher` | Steps array with `channel`, `timing`, `content` -- post-purchase nurture |
| `builder_app` | `template_based` | Storefront page, product detail page, checkout page, order confirmation page |
| `project` | `campaign` | `projectCode`, `description`, `status`, `startDate`, `endDate`, `budget` |

### Object Links (`objectLinks` table)

| linkType | sourceObjectId | targetObjectId | Purpose |
|----------|---------------|----------------|---------|
| `checkout_product` | checkout config | product | Checkout sells this product |
| `product_form` | product | form (order details) | Product requires this order form |
| `workflow_form` | order processing workflow | form | Workflow triggered by form submission |
| `workflow_sequence` | order processing workflow | post-purchase sequence | Workflow enrolls in sequence |
| `workflow_sequence` | review request workflow | review sequence | Workflow enrolls in review sequence |
| `project_contact` | project | CRM contact (client stakeholder) | Contact assigned to project |

---

## 3. Builder Components

### 3a. Storefront / Catalog Page (`/builder/storefront-page`)

**Builder app:** `type: "builder_app"`, `subtype: "template_based"`

- **Header:** Store name, logo, navigation (Home, Shop, About, Contact), cart icon with item count.
- **Hero banner:** Featured product or seasonal promotion, headline, CTA button ("Shop Now").
- **Category filters:** Horizontal filter bar or sidebar with product categories (e.g., "All", "Single Origin", "Blends", "Gift Sets", "Subscriptions"). Filter by category, price range, availability.
- **Search bar:** Full-text search across product names and descriptions.
- **Product grid:** Responsive grid of product cards (3-4 per row on desktop, 1-2 on mobile). Each card:
  - Product image (primary photo)
  - Product name
  - Price (formatted with currency symbol, e.g., "$18.99")
  - "Add to Cart" or "View Details" CTA button
  - "Sold Out" badge when `inventory - sold <= 0`
  - Optional: star rating, "New" badge, sale price with strikethrough
- **Footer:** Store policies (shipping, returns), contact info, social links, newsletter signup.

### 3b. Product Detail Page (`/builder/product-detail-template`)

**Builder app:** `type: "builder_app"`, `subtype: "template_based"`

- **Product image gallery:** Primary image with thumbnail carousel. Zoom on hover.
- **Product info:**
  - Product name (h1)
  - Price (formatted, e.g., "$18.99")
  - Description (rich text from `customProperties.description`)
  - Variant selectors: size dropdown, grind dropdown (if applicable)
  - Quantity selector (capped at `maxQuantity`)
  - "Add to Cart" button (primary CTA)
  - Stock indicator: "In Stock" / "Only X left" / "Sold Out"
- **Shipping info:** Estimated delivery, shipping cost, free shipping threshold.
- **Reviews section:** Customer reviews with star rating, reviewer name, date, review text.
- **Related products:** Grid of 3-4 related product cards (same category or "frequently bought together").

### 3c. Cart / Checkout Page (`/builder/cart-checkout-page`)

**Builder app:** `type: "builder_app"`, `subtype: "template_based"`

- **Cart summary:**
  - Line items: product image (thumbnail), name, variant (size/grind), unit price, quantity selector, line total, remove button.
  - Subtotal, shipping cost (if physical), tax, order total.
  - "Continue Shopping" link, "Proceed to Checkout" CTA.
- **Checkout form:** Embedded registration form (`form` object, subtype: `registration`).
  - Shipping address fields (for physical products, hidden for digital-only orders).
  - Contact information (name, email, phone).
  - Special requests / gift message textarea.
- **Payment section:** Stripe checkout embed via `lc_checkout` (`create-transaction` action).
- **Order summary sidebar:** Compact view of line items and totals alongside the form.

### 3d. Order Confirmation Page (`/builder/order-confirmation-page`)

**Builder app:** `type: "builder_app"`, `subtype: "template_based"`

- **Confirmation header:** "Thank you for your order!" with checkmark icon.
- **Order summary:** Order number, items purchased, quantities, prices, total paid.
- **Delivery info (physical):** Estimated delivery date, shipping method, "You'll receive a shipping confirmation email with tracking info."
- **Digital access (digital):** Instant download link or "Check your email for access instructions."
- **What's next:** Numbered list (1. Confirmation email sent, 2. Order being prepared, 3. Shipping notification coming soon).
- **Continue browsing CTA:** "Continue Shopping" button linking back to storefront.

---

## 4. Layers Automations

### Workflow 1: Order Processing (Required)

**Object:** `type: "layer_workflow"`, `subtype: "workflow"`, `name: "Order Processing Workflow"`

**Trigger:** `trigger_payment_received`

**Nodes:**

| id | type | label | position | config | status |
|----|------|-------|----------|--------|--------|
| `trigger-1` | `trigger_payment_received` | "Payment Received" | { x: 0, y: 0 } | `{ "paymentProvider": "any" }` | `ready` |
| `checkout-1` | `lc_checkout` | "Create Transaction" | { x: 300, y: 0 } | `{ "action": "create-transaction", "productId": "{{trigger.productId}}", "amount": "{{trigger.amount}}", "currency": "{{trigger.currency}}" }` | `ready` |
| `crm-1` | `lc_crm` | "Create Customer Contact" | { x: 600, y: 0 } | `{ "action": "create-contact", "contactType": "customer", "tags": ["customer", "purchased_{{product_name}}"], "mapFields": { "email": "{{trigger.customerEmail}}", "firstName": "{{trigger.customerFirstName}}", "lastName": "{{trigger.customerLastName}}", "phone": "{{trigger.customerPhone}}", "addresses": [{ "street": "{{trigger.shippingStreet}}", "city": "{{trigger.shippingCity}}", "state": "{{trigger.shippingState}}", "zip": "{{trigger.shippingZip}}", "country": "{{trigger.shippingCountry}}" }] } }` | `ready` |
| `invoice-1` | `lc_invoicing` | "Generate Invoice" | { x: 900, y: -150 } | `{ "action": "generate-invoice", "transactionId": "{{checkout-1.output.transactionId}}", "contactId": "{{crm-1.output.contactId}}" }` | `ready` |
| `email-1` | `lc_email` | "Order Confirmation Email" | { x: 900, y: 0 } | `{ "action": "send-confirmation-email", "to": "{{crm-1.output.email}}", "subject": "Order Confirmed: {{product_name}}", "body": "Hi {{crm-1.output.firstName}},\n\nThank you for your order!\n\nOrder Details:\n- {{product_name}} x {{trigger.quantity}}\n- Total: {{trigger.amountFormatted}}\n\nYour invoice is attached.\n\n{{#if requiresShipping}}Your order is being prepared and we'll send you a shipping confirmation with tracking info shortly.\n\nShipping to:\n{{trigger.shippingStreet}}\n{{trigger.shippingCity}}, {{trigger.shippingState}} {{trigger.shippingZip}}\n{{trigger.shippingCountry}}{{/if}}\n\n{{#unless requiresShipping}}Access your purchase here: [DOWNLOAD_LINK]\n\nYou can also find your download in your confirmation email.{{/unless}}\n\nQuestions? Reply to this email.\n\nThank you,\n[Store Name] Team" }` | `ready` |
| `crm-2` | `lc_crm` | "Move to Purchased" | { x: 900, y: 150 } | `{ "action": "move-pipeline-stage", "contactId": "{{crm-1.output.contactId}}", "pipelineStageId": "purchased" }` | `ready` |
| `ac-1` | `activecampaign` | "Sync to ActiveCampaign" | { x: 1200, y: -150 } | `{ "action": "add_contact", "email": "{{crm-1.output.email}}", "firstName": "{{crm-1.output.firstName}}", "lastName": "{{crm-1.output.lastName}}" }` | `ready` |
| `ac-2` | `activecampaign` | "Tag: Product Purchased" | { x: 1500, y: -150 } | `{ "action": "add_tag", "contactEmail": "{{crm-1.output.email}}", "tag": "purchased_{{product_name}}" }` | `ready` |
| `crm-3` | `lc_crm` | "Move Pipeline to Purchased" | { x: 1200, y: 150 } | `{ "action": "move-pipeline-stage", "contactId": "{{crm-1.output.contactId}}", "pipelineStageId": "purchased" }` | `ready` |

**Edges:**

| id | source | target | sourceHandle | targetHandle |
|----|--------|--------|-------------|-------------|
| `e-1` | `trigger-1` | `checkout-1` | `output` | `input` |
| `e-2` | `checkout-1` | `crm-1` | `output` | `input` |
| `e-3` | `crm-1` | `invoice-1` | `output` | `input` |
| `e-4` | `crm-1` | `email-1` | `output` | `input` |
| `e-5` | `crm-1` | `crm-2` | `output` | `input` |
| `e-6` | `crm-1` | `ac-1` | `output` | `input` |
| `e-7` | `ac-1` | `ac-2` | `output` | `input` |

**Triggers:**
```json
[{ "type": "trigger_payment_received", "config": { "paymentProvider": "any" } }]
```

**Mutations to execute:**

1. `createWorkflow({ sessionId, name: "Order Processing Workflow", description: "Processes payments, creates customer, generates invoice, sends confirmation, syncs to ActiveCampaign" })`
2. `saveWorkflow({ sessionId, workflowId: <ID>, name: "Order Processing Workflow", nodes: [...], edges: [...], triggers: [{ type: "trigger_payment_received", config: { paymentProvider: "any" } }] })`
3. `updateWorkflowStatus({ sessionId, workflowId: <ID>, status: "active" })`

---

### Workflow 2: Shipping / Delivery (Optional -- for physical products)

**Object:** `type: "layer_workflow"`, `subtype: "workflow"`, `name: "Shipping Delivery Workflow"`

**Trigger:** `trigger_webhook`

**Nodes:**

| id | type | label | position | config | status |
|----|------|-------|----------|--------|--------|
| `trigger-1` | `trigger_webhook` | "Shipping Update Received" | { x: 0, y: 0 } | `{ "path": "/shipping-update", "secret": "{{shipping_webhook_secret}}" }` | `ready` |
| `crm-1` | `lc_crm` | "Move to Shipped" | { x: 300, y: 0 } | `{ "action": "move-pipeline-stage", "contactId": "{{trigger.contactId}}", "pipelineStageId": "shipped" }` | `ready` |
| `email-1` | `lc_email` | "Shipping Notification" | { x: 600, y: 0 } | `{ "action": "send-confirmation-email", "to": "{{trigger.customerEmail}}", "subject": "Your order has shipped!", "body": "Hi {{trigger.customerFirstName}},\n\nGreat news! Your order has been shipped.\n\nTracking Number: {{trigger.trackingNumber}}\nCarrier: {{trigger.carrier}}\nTrack your package: {{trigger.trackingUrl}}\n\nEstimated delivery: {{trigger.estimatedDelivery}}\n\nThank you for your order!\n\n[Store Name] Team" }` | `ready` |
| `wait-1` | `wait_delay` | "Wait for Estimated Delivery" | { x: 900, y: 0 } | `{ "duration": 3, "unit": "days" }` | `ready` |
| `crm-2` | `lc_crm` | "Move to Delivered" | { x: 1200, y: 0 } | `{ "action": "move-pipeline-stage", "contactId": "{{trigger.contactId}}", "pipelineStageId": "delivered" }` | `ready` |
| `email-2` | `lc_email` | "Delivery Follow-Up" | { x: 1500, y: 0 } | `{ "action": "send-confirmation-email", "to": "{{trigger.customerEmail}}", "subject": "Your order has been delivered!", "body": "Hi {{trigger.customerFirstName}},\n\nYour order has been delivered! We hope you love it.\n\nIf anything isn't right, just reply to this email and we'll make it right.\n\nEnjoy!\n[Store Name] Team" }` | `ready` |

**Edges:**

| id | source | target | sourceHandle | targetHandle |
|----|--------|--------|-------------|-------------|
| `e-1` | `trigger-1` | `crm-1` | `output` | `input` |
| `e-2` | `crm-1` | `email-1` | `output` | `input` |
| `e-3` | `email-1` | `wait-1` | `output` | `input` |
| `e-4` | `wait-1` | `crm-2` | `output` | `input` |
| `e-5` | `crm-2` | `email-2` | `output` | `input` |

**Triggers:**
```json
[{ "type": "trigger_webhook", "config": { "path": "/shipping-update", "secret": "{{shipping_webhook_secret}}" } }]
```

**Mutations to execute:**

1. `createWorkflow({ sessionId, name: "Shipping Delivery Workflow", description: "Processes shipping updates, notifies customer, confirms delivery" })`
2. `saveWorkflow({ sessionId, workflowId: <ID>, nodes: [...], edges: [...], triggers: [{ type: "trigger_webhook", config: { path: "/shipping-update", secret: "{{shipping_webhook_secret}}" } }] })`
3. `updateWorkflowStatus({ sessionId, workflowId: <ID>, status: "active" })`

---

### Workflow 3: Review Request (Required)

**Object:** `type: "layer_workflow"`, `subtype: "workflow"`, `name: "Review Request Workflow"`

**Trigger:** `trigger_contact_updated`

**Nodes:**

| id | type | label | position | config | status |
|----|------|-------|----------|--------|--------|
| `trigger-1` | `trigger_contact_updated` | "Contact Updated" | { x: 0, y: 0 } | `{}` | `ready` |
| `if-1` | `if_then` | "Is Delivered?" | { x: 300, y: 0 } | `{ "expression": "{{trigger.contact.pipelineStageId}} === 'delivered'" }` | `ready` |
| `wait-1` | `wait_delay` | "Wait 7 Days" | { x: 600, y: 0 } | `{ "duration": 7, "unit": "days" }` | `ready` |
| `email-1` | `lc_email` | "Review Request Email" | { x: 900, y: 0 } | `{ "action": "send-confirmation-email", "to": "{{trigger.contact.email}}", "subject": "How are you enjoying your {{product_name}}?", "body": "Hi {{trigger.contact.firstName}},\n\nIt's been a week since your order arrived. We'd love to hear what you think!\n\nLeave a quick review: [REVIEW_LINK]\n\nYour feedback helps other customers and helps us keep improving.\n\nAs a thank you, use code REVIEW10 for 10% off your next order.\n\nThank you,\n[Store Name] Team" }` | `ready` |
| `if-2` | `if_then` | "Review Submitted?" | { x: 1200, y: 0 } | `{ "expression": "{{trigger.contact.tags}}.includes('review_submitted')" }` | `ready` |
| `crm-1` | `lc_crm` | "Tag: Reviewed" | { x: 1500, y: 0 } | `{ "action": "update-contact", "contactId": "{{trigger.contact._id}}", "tags": ["reviewed"] }` | `ready` |

**Edges:**

| id | source | target | sourceHandle | targetHandle |
|----|--------|--------|-------------|-------------|
| `e-1` | `trigger-1` | `if-1` | `output` | `input` |
| `e-2` | `if-1` | `wait-1` | `true` | `input` |
| `e-3` | `wait-1` | `email-1` | `output` | `input` |
| `e-4` | `email-1` | `if-2` | `output` | `input` |
| `e-5` | `if-2` | `crm-1` | `true` | `input` |

> Note: The `false` handle of `if-1` has no connection -- contacts not in "delivered" stage are ignored. The `false` handle of `if-2` has no connection -- contacts who did not submit a review are not tagged.

**Triggers:**
```json
[{ "type": "trigger_contact_updated", "config": {} }]
```

**Mutations to execute:**

1. `createWorkflow({ sessionId, name: "Review Request Workflow", description: "Sends review request 7 days after delivery, tags contacts who submit reviews" })`
2. `saveWorkflow({ sessionId, workflowId: <ID>, nodes: [...], edges: [...], triggers: [{ type: "trigger_contact_updated", config: {} }] })`
3. `updateWorkflowStatus({ sessionId, workflowId: <ID>, status: "active" })`

---

### Workflow 4: Cross-Sell / Upsell (Optional)

**Object:** `type: "layer_workflow"`, `subtype: "workflow"`, `name: "Cross-Sell Upsell Workflow"`

**Trigger:** `trigger_contact_updated`

**Nodes:**

| id | type | label | position | config | status |
|----|------|-------|----------|--------|--------|
| `trigger-1` | `trigger_contact_updated` | "Contact Updated" | { x: 0, y: 0 } | `{}` | `ready` |
| `if-1` | `if_then` | "Is Delivered?" | { x: 300, y: 0 } | `{ "expression": "{{trigger.contact.pipelineStageId}} === 'delivered'" }` | `ready` |
| `wait-1` | `wait_delay` | "Wait 14 Days" | { x: 600, y: 0 } | `{ "duration": 14, "unit": "days" }` | `ready` |
| `email-1` | `lc_email` | "Related Products Email" | { x: 900, y: 0 } | `{ "action": "send-confirmation-email", "to": "{{trigger.contact.email}}", "subject": "Picked just for you, {{trigger.contact.firstName}}", "body": "Hi {{trigger.contact.firstName}},\n\nBased on your recent purchase, we thought you might love these:\n\n[RELATED_PRODUCTS_BLOCK]\n\nShop now: [STORE_LINK]\n\nThank you,\n[Store Name] Team" }` | `ready` |
| `ac-1` | `activecampaign` | "Add to Cross-Sell Automation" | { x: 1200, y: 0 } | `{ "action": "add_to_automation", "contactEmail": "{{trigger.contact.email}}", "automationId": "<AC_CROSS_SELL_AUTOMATION_ID>" }` | `ready` |

**Edges:**

| id | source | target | sourceHandle | targetHandle |
|----|--------|--------|-------------|-------------|
| `e-1` | `trigger-1` | `if-1` | `output` | `input` |
| `e-2` | `if-1` | `wait-1` | `true` | `input` |
| `e-3` | `wait-1` | `email-1` | `output` | `input` |
| `e-4` | `email-1` | `ac-1` | `output` | `input` |

> Note: The `false` handle of `if-1` has no connection -- contacts not in "delivered" stage are ignored.

**Triggers:**
```json
[{ "type": "trigger_contact_updated", "config": {} }]
```

**Mutations to execute:**

1. `createWorkflow({ sessionId, name: "Cross-Sell Upsell Workflow", description: "Sends related product recommendations 14 days after delivery, enrolls in cross-sell automation" })`
2. `saveWorkflow({ sessionId, workflowId: <ID>, nodes: [...], edges: [...], triggers: [{ type: "trigger_contact_updated", config: {} }] })`
3. `updateWorkflowStatus({ sessionId, workflowId: <ID>, status: "active" })`

---

### Sequences

#### Post-Purchase Nurture Sequence (subtype: `nachher`)

**Name:** `Post-Purchase Nurture Sequence`
**Trigger event:** `contact_tagged` (tag: `"customer"`)
**Reference point:** `trigger_event` (= moment of purchase)

| step | channel | timing | subject | body summary |
|------|---------|--------|---------|-------------|
| 1 | `email` | `{ offset: 0, unit: "minutes", referencePoint: "trigger_event" }` | "Order Confirmed: [Product Name]" | Order confirmation with details, invoice link, estimated delivery (physical) or access link (digital). |
| 2 | `email` | `{ offset: 1, unit: "days", referencePoint: "trigger_event" }` | "Your order is being prepared" | For physical: behind-the-scenes of order fulfillment, care instructions preview. For digital: quick-start tips, access instructions. |
| 3 | `email` | `{ offset: 3, unit: "days", referencePoint: "trigger_event" }` | "Your order has shipped!" | For physical: shipping notification with tracking link, carrier name, estimated delivery. (Triggered by shipping webhook, included in sequence as fallback.) |
| 4 | `email` | `{ offset: 5, unit: "days", referencePoint: "trigger_event" }` | "Your order has arrived!" | For physical: delivery confirmation, usage tips, how to get help if something is wrong. For digital: check-in, any questions about the product? |
| 5 | `email` | `{ offset: 12, unit: "days", referencePoint: "trigger_event" }` | "How are you enjoying [Product Name]?" | Review request with review link, 10% discount code for leaving a review. |
| 6 | `email` | `{ offset: 19, unit: "days", referencePoint: "trigger_event" }` | "You might also love these" | Cross-sell recommendations based on purchase. 2-3 complementary products with images and links. |
| 7 | `email` | `{ offset: 30, unit: "days", referencePoint: "trigger_event" }` | "Time for a refill?" | For consumable products: replenishment reminder with reorder link. For non-consumable: new arrivals showcase, seasonal collection. |

---

## 5. CRM Pipeline Definition

**Pipeline name:** "Customer Pipeline"

### Stages (in order)

| order | stageId | label | description | auto-transition trigger |
|-------|---------|-------|-------------|------------------------|
| 1 | `browsing` | Browsing | Contact has visited the store, no cart action yet. | Manual or inferred from page visit tracking. |
| 2 | `cart` | Cart | Contact has added item(s) to cart but not purchased. | Triggered when cart is created/updated with contact email. |
| 3 | `purchased` | Purchased | Payment completed, order confirmed. | `trigger_payment_received` -> `lc_crm` move-pipeline-stage (Workflow 1, `crm-2`). |
| 4 | `shipped` | Shipped | Physical order shipped with tracking number. | `trigger_webhook` (shipping update) -> `lc_crm` move-pipeline-stage (Workflow 2, `crm-1`). |
| 5 | `delivered` | Delivered | Order delivered to customer (physical) or accessed (digital). | `wait_delay` (3 days after shipping) -> `lc_crm` move-pipeline-stage (Workflow 2, `crm-2`). For digital: auto-set after purchase. |
| 6 | `review_requested` | Review Requested | Review request email sent 7 days post-delivery. | `trigger_contact_updated` -> `if_then` (delivered) -> `wait_delay` (7d) -> `lc_email` review request (Workflow 3). |
| 7 | `repeat_customer` | Repeat Customer | Customer has made 2+ purchases. | `trigger_payment_received` when contact already has `customer` tag -> `lc_crm` update-contact, `move-pipeline-stage`. |

### Stage Transitions

```
browsing -> cart                (cart created with email)
cart -> purchased               (payment received)
cart -> browsing                (cart abandoned, no recovery)
purchased -> shipped            (shipping webhook received)
shipped -> delivered            (3-day wait or delivery webhook)
purchased -> delivered          (digital product: immediate after purchase)
delivered -> review_requested   (7 days post-delivery, review email sent)
review_requested -> repeat_customer  (second purchase)
delivered -> repeat_customer    (second purchase before review request)
```

---

## 6. File System Scaffold

**Project:** `type: "project"`, `subtype: "campaign"`

After calling `initializeProjectFolders({ organizationId, projectId })`, the default folders are created. Then populate:

```
/
+-- builder/
|   +-- storefront-page/            (kind: builder_ref -> storefront/catalog page app)
|   +-- product-detail-template/    (kind: builder_ref -> product detail page app)
|   +-- cart-checkout-page/         (kind: builder_ref -> cart and checkout page app)
|   +-- order-confirmation-page/    (kind: builder_ref -> order confirmation page app)
|
+-- layers/
|   +-- order-processing-workflow   (kind: layer_ref -> Workflow 1: Order Processing)
|   +-- shipping-delivery-workflow  (kind: layer_ref -> Workflow 2: Shipping/Delivery -- optional, physical)
|   +-- review-request-workflow     (kind: layer_ref -> Workflow 3: Review Request)
|   +-- cross-sell-workflow         (kind: layer_ref -> Workflow 4: Cross-Sell/Upsell -- optional)
|
+-- notes/
|   +-- product-catalog-brief       (kind: virtual -> product names, descriptions, prices, SKUs, inventory)
|   +-- pricing-strategy            (kind: virtual -> pricing tiers, discounts, shipping rates, tax config)
|   +-- shipping-policy             (kind: virtual -> shipping methods, costs, delivery windows, regions)
|   +-- returns-policy              (kind: virtual -> return window, conditions, refund process)
|
+-- assets/
    +-- product-photos/             (kind: folder -> product images organized by product)
    +-- brand-assets/               (kind: folder)
    |   +-- logo                    (kind: media_ref -> store logo)
    |   +-- favicon                 (kind: media_ref -> store favicon)
    +-- category-banners/           (kind: folder -> category header images)
```

**Mutations to execute:**

1. `initializeProjectFolders({ organizationId: <ORG_ID>, projectId: <PROJECT_ID> })`
2. `createVirtualFile({ sessionId, projectId: <PROJECT_ID>, name: "product-catalog-brief", parentPath: "/notes", content: "<catalog markdown>" })`
3. `createVirtualFile({ sessionId, projectId: <PROJECT_ID>, name: "pricing-strategy", parentPath: "/notes", content: "<pricing markdown>" })`
4. `createVirtualFile({ sessionId, projectId: <PROJECT_ID>, name: "shipping-policy", parentPath: "/notes", content: "<shipping policy markdown>" })`
5. `createVirtualFile({ sessionId, projectId: <PROJECT_ID>, name: "returns-policy", parentPath: "/notes", content: "<returns policy markdown>" })`
6. `captureBuilderApp({ projectId: <PROJECT_ID>, builderAppId: <STOREFRONT_APP_ID> })`
7. `captureBuilderApp({ projectId: <PROJECT_ID>, builderAppId: <PRODUCT_DETAIL_APP_ID> })`
8. `captureBuilderApp({ projectId: <PROJECT_ID>, builderAppId: <CART_CHECKOUT_APP_ID> })`
9. `captureBuilderApp({ projectId: <PROJECT_ID>, builderAppId: <CONFIRMATION_APP_ID> })`
10. `captureLayerWorkflow({ projectId: <PROJECT_ID>, layerWorkflowId: <ORDER_PROCESSING_WF_ID> })`
11. `captureLayerWorkflow({ projectId: <PROJECT_ID>, layerWorkflowId: <SHIPPING_DELIVERY_WF_ID> })` -- if using Workflow 2
12. `captureLayerWorkflow({ projectId: <PROJECT_ID>, layerWorkflowId: <REVIEW_REQUEST_WF_ID> })`
13. `captureLayerWorkflow({ projectId: <PROJECT_ID>, layerWorkflowId: <CROSS_SELL_WF_ID> })` -- if using Workflow 4

---

## 7. Data Flow Diagram

```
                                E-COMMERCE STOREFRONT - DATA FLOW
                                ====================================

  END CUSTOMER                      PLATFORM (L4YERCAK3)                        EXTERNAL SYSTEMS
  ============                      ====================                        ================

  +--------------------+
  | Browse Catalog     |
  | (Storefront Page)  |
  +---------+----------+
            |
            v
  +--------------------+
  | Select Product     |
  | (Product Detail)   |
  +---------+----------+
            |
            v
  +--------------------+
  | Add to Cart        |------> CRM: move-pipeline-stage -> "cart"
  | (Cart Page)        |
  +---------+----------+
            |
            v
  +--------------------+
  | Fill Checkout Form |------> submitPublicForm({ formId, responses, metadata })
  | + Shipping Address |        (if physical: shipping fields)
  | (if physical)      |
  +---------+----------+
            |
            v
  +--------------------+
  | Payment Processed  |------> lc_checkout (create-transaction)
  | (Stripe)           |                                            +----------+
  +---------+----------+                                            |  Stripe  |
            |                                                       +----------+
            v
  +------------------------------------------------------------------+
  | WORKFLOW 1: Order Processing                                      |
  |                                                                    |
  |  trigger_payment_received                                          |
  |         |                                                          |
  |    (output -> input)                                               |
  |         v                                                          |
  |  lc_checkout [create-transaction]                                  |
  |         |                                                          |
  |    (output -> input)                                               |
  |         v                                                          |
  |  lc_crm [create-contact, tags:["customer","purchased_product"]]   |
  |         |                                                          |
  |    +----+--------+--------+                                        |
  |    |             |        |                                        |
  | (out->in)   (out->in)  (out->in)                                   |
  |    |             |        |                                        |
  |    v             v        v                                        |
  | lc_invoicing  lc_email  activecampaign                             |
  | [generate-   [order      [add_contact]                             |
  |  invoice]    confirm]        |                                     |
  |                         (output -> input)          +-------------+ |
  |                              v                     |             | |
  |                         activecampaign  ---------> | Active      | |
  |                         [add_tag:                  | Campaign    | |
  |                          "purchased_product"]      |             | |
  |                                                    +-------------+ |
  |         |                                                          |
  |    (out -> in)                                                     |
  |         v                                                          |
  |  lc_crm [move-pipeline-stage -> "purchased"]                      |
  +------------------------------------------------------------------+
            |
            v (physical products only)
  +------------------------------------------------------------------+
  | WORKFLOW 2: Shipping / Delivery                                   |
  |                                                                    |
  |  trigger_webhook [/shipping-update]                                |
  |         |                                                          |
  |    (output -> input)                                               |
  |         v                                                          |
  |  lc_crm [move-pipeline-stage -> "shipped"]                        |
  |         |                                                          |
  |    (output -> input)                                               |
  |         v                                                          |
  |  lc_email [shipping notification + tracking link]                 |
  |         |                                                          |
  |    (output -> input)                                               |
  |         v                                                          |
  |  wait_delay [3 days]                                               |
  |         |                                                          |
  |    (output -> input)                                               |
  |         v                                                          |
  |  lc_email [delivery follow-up]                                    |
  +------------------------------------------------------------------+
            |
            v (7 days post-delivery)
  +------------------------------------------------------------------+
  | WORKFLOW 3: Review Request                                        |
  |                                                                    |
  |  trigger_contact_updated                                           |
  |         |                                                          |
  |    (output -> input)                                               |
  |         v                                                          |
  |  if_then [pipelineStage === "delivered"?]                         |
  |         |                                                          |
  |    (true -> input)                                                 |
  |         v                                                          |
  |  wait_delay [7 days]                                               |
  |         |                                                          |
  |    (output -> input)                                               |
  |         v                                                          |
  |  lc_email [review request + discount code]                        |
  |         |                                                          |
  |    (output -> input)                                               |
  |         v                                                          |
  |  if_then [review submitted?]                                      |
  |         |                                                          |
  |    (true -> input)                                                 |
  |         v                                                          |
  |  lc_crm [update-contact, tag: "reviewed"]                        |
  +------------------------------------------------------------------+
            |
            v (14 days after delivery)
  +------------------------------------------------------------------+
  | WORKFLOW 4: Cross-Sell / Upsell (optional)                        |
  |                                                                    |
  |  trigger_contact_updated                                           |
  |         |                                                          |
  |    (output -> input)                                               |
  |         v                                                          |
  |  if_then [pipelineStage === "delivered"?]                         |
  |         |                                                          |
  |    (true -> input)                                                 |
  |         v                                                          |
  |  wait_delay [14 days]                                              |
  |         |                                                          |
  |    (output -> input)                                               |
  |         v                                                          |
  |  lc_email [related products recommendation]                       |
  |         |                                                          |
  |    (output -> input)                                               |
  |         v                                                          |
  |  activecampaign [add_to_automation: "cross_sell"]                 |
  +------------------------------------------------------------------+

  SEQUENCE: Post-Purchase Nurture (nachher)

  Step 1: Immediate .... Order confirmation + receipt
  Step 2: +1 day ....... "Your order is being prepared"
  Step 3: +3 days ...... Shipping notification (physical)
  Step 4: +5 days ...... Delivery confirmation
  Step 5: +12 days ..... Review request + discount code
  Step 6: +19 days ..... Cross-sell recommendations
  Step 7: +30 days ..... Replenishment reminder / new arrivals

  PIPELINE PROGRESSION:

  [browsing] -> [cart] -> [purchased] -> [shipped] -> [delivered]
                                                          |
                                                          v
                                                  [review_requested]
                                                          |
                                                          v
                                                  [repeat_customer]
```

---

## 8. Customization Points

### Must-Customize (deployment will fail or be meaningless without these)

| Item | Why | Where |
|------|-----|-------|
| Product names | Appear everywhere: storefront, emails, invoices, CRM tags | `createProduct({ name })`, `lc_email` node config `subject` and `body`, sequence step content, ActiveCampaign tags |
| Product descriptions | Catalog and detail pages | `createProduct({ description })`, storefront page, product detail page |
| Product prices (in cents) | Checkout amount, invoices, emails | `createProduct({ price })` -- e.g., `1899` for $18.99 |
| Product images | Storefront cards, product detail gallery | Builder storefront page, product detail page, `/assets/product-photos/` |
| Currency | Payment processing, invoice display | `createProduct({ currency })` -- ISO 4217, e.g., `"USD"` |
| `requiresShipping` | Determines whether shipping form/workflow activates | `createProduct({ requiresShipping })` -- `true` for physical, `false` for digital |
| Shipping settings (physical) | Shipping rates, delivery windows, regions | `/notes/shipping-policy`, checkout page, order confirmation email |
| Payment provider configuration | Stripe credentials for checkout | Organization integration settings |
| Store branding | Logo, colors, name in all pages and emails | Builder apps, `lc_email` node config, sequence content |
| Admin email | Order notifications | Workflow 1 admin notification node `to` field |

### Should-Customize (significantly improves conversion and relevance)

| Item | Why | Default |
|------|-----|---------|
| Storefront design | Brand colors, fonts, imagery, layout should match client identity | Generic template layout |
| Email copy | Brand voice, tone, product-specific details in all transactional and nurture emails | Generic order confirmation template |
| Review request timing | Some products need longer evaluation (e.g., subscription after first delivery vs one-time after 7d) | 7 days post-delivery |
| Cross-sell products | Manually curated or AI-driven recommendations based on purchase relationships | Generic "based on your purchase" |
| Category structure | Helps customers navigate large catalogs | Single "All Products" category |
| Shipping form fields | Some stores need additional fields (apartment number, delivery instructions) | Street, city, state, zip, country |

### Can-Use-Default (work out of the box for most deployments)

| Item | Default Value |
|------|--------------|
| Pipeline stages | browsing, cart, purchased, shipped, delivered, review_requested, repeat_customer |
| Workflow structure | 4 workflows as defined in Section 4 |
| Sequence timing | Immediate, +1d, +3d, +5d, +12d, +19d, +30d |
| Sequence channel | `email` for all steps |
| File system folder structure | `/builder`, `/layers`, `/notes`, `/assets` |
| Contact subtype | `customer` |
| Project subtype | `campaign` |
| Invoice type | `b2c_single` |
| Payment terms | `due_on_receipt` |
| Form fields | firstName, lastName, email, phone, shipping address, special requests |
| Workflow status progression | `draft` -> `ready` -> `active` |

---

## 9. Common Pitfalls

### Data Errors

| Pitfall | Symptom | Fix |
|---------|---------|-----|
| Products not linked to checkout | Checkout has no line items; payment of $0 or error | For each product, create `objectLinks { sourceObjectId: checkoutConfigId, targetObjectId: productId, linkType: "checkout_product" }` |
| Price in dollars instead of cents | Product shows $0.19 instead of $18.99 | Always multiply by 100: `price: 1899` not `price: 18.99`. Validate before `createProduct`. |
| `requiresShipping` not set for physical products | No shipping form shown, delivery workflow never activates, customer has no shipping address | Set `requiresShipping: true` on all physical products. Verify before `publishProduct`. |
| Shipping form present for digital products | Customer asked for address when buying a download | Set `requiresShipping: false` for digital products. Use `conditionalLogic` to hide shipping fields when no physical products in cart. |
| Invoice not generated | Customer receives no invoice after payment | Ensure `lc_invoicing` node with action `generate-invoice` is present in Workflow 1 and connected to the `crm-1` output. Verify `invoiceConfig.autoGenerate` is `true` on the product. |
| Tax behavior not configured | Invoices show wrong amounts; compliance issues | Set `taxBehavior: "exclusive"` (tax added at checkout) or `"inclusive"` (tax included in displayed price) on every product. |

### Linking Errors

| Pitfall | Symptom | Fix |
|---------|---------|-----|
| Missing `checkout_product` links | Checkout cannot find products; $0 transactions | Create one `objectLinks` entry per product: `{ linkType: "checkout_product", sourceObjectId: checkoutId, targetObjectId: productId }` |
| Missing `product_form` links | Order form not associated with products; form submissions have no product context | Create `objectLinks { sourceObjectId: productId, targetObjectId: formId, linkType: "product_form" }` for each product |
| Workflow not linked to form | `trigger_form_submitted` never fires for order form | Create `objectLinks { sourceObjectId: workflowId, targetObjectId: formId, linkType: "workflow_form" }`. Also set `formId` in trigger config. |
| Sequence not linked to workflow | Customer never enrolled in post-purchase sequence | Create `objectLinks { sourceObjectId: workflowId, targetObjectId: sequenceId, linkType: "workflow_sequence" }` |

### Workflow Errors

| Pitfall | Symptom | Fix |
|---------|---------|-----|
| Shipping webhook misconfigured | Shipping notifications never sent, pipeline stuck at "purchased" | Verify the shipping provider sends POST requests to the correct webhook path (`/shipping-update`) with the configured secret. Test with a manual webhook call before go-live. |
| Review timing wrong | Customers get review request before product arrives | Ensure `wait_delay` in Workflow 3 is set to 7 days and the `if_then` condition checks for `pipelineStageId === 'delivered'`, not `purchased`. |
| Shipping workflow fires for digital products | Digital buyer gets "your order has shipped" email | Only activate Workflow 2 for organizations selling physical products. Or add `if_then` node checking `product.requiresShipping === true` at start of Workflow 2. |
| Workflows left in `draft` status | No automations execute | After saving all nodes/edges, call `updateWorkflowStatus({ status: "active" })` for each workflow. |

### Pre-Launch Self-Check List

1. All products created with prices in cents, `requiresShipping` set correctly.
2. All products published (`publishProduct` called for each).
3. Order form created and published (`publishForm` called).
4. Shipping fields present in form for physical products; hidden for digital-only.
5. `objectLinks` with `linkType: "checkout_product"` created for every product.
6. `objectLinks` with `linkType: "product_form"` created for every product.
7. `objectLinks` with `linkType: "workflow_form"` connects order processing workflow to form.
8. `objectLinks` with `linkType: "workflow_sequence"` connects workflows to sequences.
9. All `pipelineStageId` values in `lc_crm` nodes match actual pipeline stage IDs.
10. ActiveCampaign integration configured with valid API credentials.
11. Stripe payment provider configured and tested.
12. Admin email set in notification nodes.
13. All workflows have `status: "active"`.
14. Post-purchase sequence has 7 steps with correct timing offsets.
15. Builder apps (storefront, product detail, cart/checkout, confirmation) deployed.
16. `taxBehavior` set on all products.
17. `inventory` and `maxQuantity` set on all products.

---

## 10. Example Deployment Scenario

### Scenario: Artisan Coffee Roaster Online Store

A marketing agency ("Brew Digital Agency") sets up an online store for their client, **"Mountain Peak Coffee Co."** The store sells specialty coffee beans and a subscription box.

**Products:**
- "Single Origin Ethiopian Yirgacheffe" -- 12oz bag, $18.99, physical
- "House Blend" -- 12oz bag, $14.99, physical
- "Coffee Lovers Starter Kit" -- 3 bags + branded mug, $49.99, physical
- "Monthly Subscription Box" -- $29.99/month, digital/recurring

**Shipping:** Flat rate $5.99 US domestic. Free over $50. **Currency:** USD.

---

### Step 1: Create the Project

```
createProject({
  sessionId: "<SESSION_ID>",
  organizationId: "<ORG_ID>",
  name: "Mountain Peak Coffee Co. - Online Store",
  subtype: "campaign",
  description: "E-commerce storefront for Mountain Peak Coffee Co. Specialty coffee beans, gift kits, and monthly subscription box.",
  startDate: 1706745600000,
  endDate: null
})
// Returns: projectId = "proj_mountain_peak_001"
```

```
initializeProjectFolders({
  organizationId: "<ORG_ID>",
  projectId: "proj_mountain_peak_001"
})
```

---

### Step 2: Create Products

**Product 1 -- Single Origin Ethiopian Yirgacheffe:**
```
createProduct({
  sessionId: "<SESSION_ID>",
  organizationId: "<ORG_ID>",
  name: "Single Origin Ethiopian Yirgacheffe",
  subtype: "physical",
  price: 1899,
  currency: "USD",
  description: "Bright and complex with notes of blueberry, jasmine, and dark chocolate. Sourced from small-lot farmers in the Yirgacheffe region of Ethiopia. Light roast, 12oz whole bean bag. Roasted fresh to order.",
  productCode: "COFFEE-ETH-YRG-12",
  inventory: 500,
  sold: 0,
  taxBehavior: "exclusive",
  maxQuantity: 10,
  requiresShipping: true,
  invoiceConfig: {
    autoGenerate: true,
    type: "b2c_single",
    paymentTerms: "due_on_receipt"
  }
})
// Returns: productId = "prod_ethiopian_yirgacheffe"
```

```
publishProduct({ sessionId: "<SESSION_ID>", productId: "prod_ethiopian_yirgacheffe" })
```

**Product 2 -- House Blend:**
```
createProduct({
  sessionId: "<SESSION_ID>",
  organizationId: "<ORG_ID>",
  name: "House Blend",
  subtype: "physical",
  price: 1499,
  currency: "USD",
  description: "Our signature everyday blend. Smooth, balanced, and approachable with notes of caramel, toasted almond, and milk chocolate. Medium roast, 12oz whole bean bag. Perfect for drip, pour-over, or French press.",
  productCode: "COFFEE-HB-12",
  inventory: 800,
  sold: 0,
  taxBehavior: "exclusive",
  maxQuantity: 10,
  requiresShipping: true,
  invoiceConfig: {
    autoGenerate: true,
    type: "b2c_single",
    paymentTerms: "due_on_receipt"
  }
})
// Returns: productId = "prod_house_blend"
```

```
publishProduct({ sessionId: "<SESSION_ID>", productId: "prod_house_blend" })
```

**Product 3 -- Coffee Lovers Starter Kit:**
```
createProduct({
  sessionId: "<SESSION_ID>",
  organizationId: "<ORG_ID>",
  name: "Coffee Lovers Starter Kit",
  subtype: "physical",
  price: 4999,
  currency: "USD",
  description: "The perfect gift for coffee enthusiasts. Includes three 12oz bags (Ethiopian Yirgacheffe, House Blend, and Colombian Supremo) plus a Mountain Peak Coffee Co. branded ceramic mug. Beautifully packaged in a gift box with tasting notes card.",
  productCode: "COFFEE-KIT-STARTER",
  inventory: 200,
  sold: 0,
  taxBehavior: "exclusive",
  maxQuantity: 5,
  requiresShipping: true,
  invoiceConfig: {
    autoGenerate: true,
    type: "b2c_single",
    paymentTerms: "due_on_receipt"
  }
})
// Returns: productId = "prod_starter_kit"
```

```
publishProduct({ sessionId: "<SESSION_ID>", productId: "prod_starter_kit" })
```

**Product 4 -- Monthly Subscription Box:**
```
createProduct({
  sessionId: "<SESSION_ID>",
  organizationId: "<ORG_ID>",
  name: "Monthly Subscription Box",
  subtype: "digital",
  price: 2999,
  currency: "USD",
  description: "A curated coffee experience delivered to your door every month. Each box includes two 12oz bags of freshly roasted single-origin coffee, tasting notes, brewing tips, and a story about the farm and farmers behind the beans. Cancel anytime.",
  productCode: "COFFEE-SUB-MONTHLY",
  inventory: 9999,
  sold: 0,
  taxBehavior: "exclusive",
  maxQuantity: 1,
  requiresShipping: false,
  invoiceConfig: {
    autoGenerate: true,
    type: "b2c_single",
    paymentTerms: "due_on_receipt"
  }
})
// Returns: productId = "prod_subscription_box"
```

```
publishProduct({ sessionId: "<SESSION_ID>", productId: "prod_subscription_box" })
```

---

### Step 3: Create Order Details Form

```
createForm({
  sessionId: "<SESSION_ID>",
  organizationId: "<ORG_ID>",
  name: "Mountain Peak Coffee Order Form",
  description: "Collects shipping and preference information for coffee orders",
  fields: [
    { "type": "text",     "label": "First Name",        "required": true,  "placeholder": "Jane" },
    { "type": "text",     "label": "Last Name",         "required": true,  "placeholder": "Smith" },
    { "type": "email",    "label": "Email Address",     "required": true,  "placeholder": "you@email.com" },
    { "type": "phone",    "label": "Phone Number",      "required": false, "placeholder": "+1 (555) 000-0000" },
    { "type": "section_header", "label": "Shipping Address", "required": false },
    { "type": "text",     "label": "Street Address",    "required": true,  "placeholder": "123 Main St, Apt 4B" },
    { "type": "text",     "label": "City",              "required": true,  "placeholder": "Denver" },
    { "type": "text",     "label": "State",             "required": true,  "placeholder": "CO" },
    { "type": "text",     "label": "ZIP Code",          "required": true,  "placeholder": "80202" },
    { "type": "select",   "label": "Country",           "required": true,
      "options": ["United States", "Canada"] },
    { "type": "section_header", "label": "Order Preferences", "required": false },
    { "type": "select",   "label": "Grind Preference",  "required": false,
      "options": ["Whole Bean", "Drip / Pour-Over", "French Press", "Espresso", "Turkish"] },
    { "type": "textarea", "label": "Gift Message",      "required": false, "placeholder": "Include a handwritten note with your order (optional)" }
  ],
  formSettings: {
    "redirectUrl": "/order-confirmation",
    "notifications": { "adminEmail": true, "respondentEmail": true },
    "submissionBehavior": "redirect"
  }
})
// Returns: formId = "form_mountain_peak_order"
```

```
publishForm({ sessionId: "<SESSION_ID>", formId: "form_mountain_peak_order" })
```

---

### Step 4: Create CRM Pipeline

**Pipeline:** "Customer Pipeline"

**Stages created (in order):**

| Stage ID | Stage Name | Description |
|----------|-----------|-------------|
| `browsing` | Browsing | Visited the store, browsing coffee selection |
| `cart` | Cart | Added coffee to cart, not yet purchased |
| `purchased` | Purchased | Payment completed, order confirmed |
| `shipped` | Shipped | Coffee shipped with tracking number |
| `delivered` | Delivered | Package delivered to customer |
| `review_requested` | Review Requested | Review request email sent 7 days after delivery |
| `repeat_customer` | Repeat Customer | Second or subsequent purchase completed |

---

### Step 5: Create Workflows

**Workflow 1: Order Processing**

```
createWorkflow({
  sessionId: "<SESSION_ID>",
  name: "Mountain Peak Order Processing",
  description: "Processes coffee orders: creates customer, generates invoice, sends confirmation, syncs to ActiveCampaign"
})
// Returns: workflowId = "wf_mountain_peak_order_001"
```

```
saveWorkflow({
  sessionId: "<SESSION_ID>",
  workflowId: "wf_mountain_peak_order_001",
  name: "Mountain Peak Order Processing",
  nodes: [
    {
      "id": "trigger-1",
      "type": "trigger_payment_received",
      "position": { "x": 0, "y": 0 },
      "config": { "paymentProvider": "any" },
      "status": "ready",
      "label": "Payment Received"
    },
    {
      "id": "checkout-1",
      "type": "lc_checkout",
      "position": { "x": 300, "y": 0 },
      "config": {
        "action": "create-transaction",
        "productId": "{{trigger.productId}}",
        "amount": "{{trigger.amount}}",
        "currency": "USD"
      },
      "status": "ready",
      "label": "Create Transaction"
    },
    {
      "id": "crm-1",
      "type": "lc_crm",
      "position": { "x": 600, "y": 0 },
      "config": {
        "action": "create-contact",
        "contactType": "customer",
        "tags": ["customer", "mountain_peak_coffee", "purchased_{{product_name}}"],
        "mapFields": {
          "email": "{{trigger.customerEmail}}",
          "firstName": "{{trigger.customerFirstName}}",
          "lastName": "{{trigger.customerLastName}}",
          "phone": "{{trigger.customerPhone}}",
          "addresses": [{
            "street": "{{trigger.shippingStreet}}",
            "city": "{{trigger.shippingCity}}",
            "state": "{{trigger.shippingState}}",
            "zip": "{{trigger.shippingZip}}",
            "country": "{{trigger.shippingCountry}}"
          }]
        }
      },
      "status": "ready",
      "label": "Create Customer"
    },
    {
      "id": "invoice-1",
      "type": "lc_invoicing",
      "position": { "x": 900, "y": -150 },
      "config": {
        "action": "generate-invoice",
        "transactionId": "{{checkout-1.output.transactionId}}",
        "contactId": "{{crm-1.output.contactId}}"
      },
      "status": "ready",
      "label": "Generate Invoice"
    },
    {
      "id": "email-1",
      "type": "lc_email",
      "position": { "x": 900, "y": 0 },
      "config": {
        "action": "send-confirmation-email",
        "to": "{{crm-1.output.email}}",
        "subject": "Order Confirmed - Mountain Peak Coffee Co.",
        "body": "Hi {{crm-1.output.firstName}},\n\nThank you for your order from Mountain Peak Coffee Co.!\n\nOrder Details:\n- {{product_name}} x {{trigger.quantity}}\n- Total: ${{trigger.amountFormatted}}\n\nYour invoice is attached.\n\nWe roast every batch fresh to order. Your coffee will be roasted within 24 hours and shipped the same day. You'll receive a shipping confirmation with tracking info within 1-2 business days.\n\nShipping to:\n{{trigger.shippingStreet}}\n{{trigger.shippingCity}}, {{trigger.shippingState}} {{trigger.shippingZip}}\n\nBrewing tip: For the best flavor, wait 3-5 days after the roast date before brewing. This lets the CO2 degas and the flavors fully develop.\n\nQuestions? Reply to this email or contact us at hello@mountainpeakcoffee.com.\n\nHappy brewing,\nThe Mountain Peak Coffee Team"
      },
      "status": "ready",
      "label": "Order Confirmation Email"
    },
    {
      "id": "email-2",
      "type": "lc_email",
      "position": { "x": 900, "y": 150 },
      "config": {
        "action": "send-admin-notification",
        "to": "orders@mountainpeakcoffee.com",
        "subject": "New Order: {{product_name}} from {{crm-1.output.firstName}} {{crm-1.output.lastName}}",
        "body": "New order received.\n\nCustomer: {{crm-1.output.firstName}} {{crm-1.output.lastName}}\nEmail: {{crm-1.output.email}}\nProduct: {{product_name}}\nQuantity: {{trigger.quantity}}\nTotal: ${{trigger.amountFormatted}}\nGrind: {{trigger.grindPreference}}\n\nShipping Address:\n{{trigger.shippingStreet}}\n{{trigger.shippingCity}}, {{trigger.shippingState}} {{trigger.shippingZip}}\n{{trigger.shippingCountry}}\n\nGift Message: {{trigger.giftMessage}}"
      },
      "status": "ready",
      "label": "Admin Notification"
    },
    {
      "id": "ac-1",
      "type": "activecampaign",
      "position": { "x": 1200, "y": -150 },
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
      "position": { "x": 1500, "y": -150 },
      "config": {
        "action": "add_tag",
        "contactEmail": "{{crm-1.output.email}}",
        "tag": "purchased_{{product_name}}"
      },
      "status": "ready",
      "label": "Tag: Product Purchased"
    },
    {
      "id": "crm-2",
      "type": "lc_crm",
      "position": { "x": 1200, "y": 150 },
      "config": {
        "action": "move-pipeline-stage",
        "contactId": "{{crm-1.output.contactId}}",
        "pipelineStageId": "purchased"
      },
      "status": "ready",
      "label": "Move to Purchased"
    }
  ],
  edges: [
    { "id": "e-1", "source": "trigger-1",  "target": "checkout-1", "sourceHandle": "output", "targetHandle": "input" },
    { "id": "e-2", "source": "checkout-1", "target": "crm-1",      "sourceHandle": "output", "targetHandle": "input" },
    { "id": "e-3", "source": "crm-1",      "target": "invoice-1",  "sourceHandle": "output", "targetHandle": "input" },
    { "id": "e-4", "source": "crm-1",      "target": "email-1",    "sourceHandle": "output", "targetHandle": "input" },
    { "id": "e-5", "source": "crm-1",      "target": "email-2",    "sourceHandle": "output", "targetHandle": "input" },
    { "id": "e-6", "source": "crm-1",      "target": "ac-1",       "sourceHandle": "output", "targetHandle": "input" },
    { "id": "e-7", "source": "ac-1",       "target": "ac-2",       "sourceHandle": "output", "targetHandle": "input" },
    { "id": "e-8", "source": "crm-1",      "target": "crm-2",      "sourceHandle": "output", "targetHandle": "input" }
  ],
  triggers: [{ "type": "trigger_payment_received", "config": { "paymentProvider": "any" } }]
})
```

```
updateWorkflowStatus({
  sessionId: "<SESSION_ID>",
  workflowId: "wf_mountain_peak_order_001",
  status: "active"
})
```

**Workflow 2: Shipping / Delivery**

```
createWorkflow({
  sessionId: "<SESSION_ID>",
  name: "Mountain Peak Shipping Update",
  description: "Processes shipping updates, notifies customer, confirms delivery"
})
// Returns: workflowId = "wf_mountain_peak_shipping_001"
```

```
saveWorkflow({
  sessionId: "<SESSION_ID>",
  workflowId: "wf_mountain_peak_shipping_001",
  name: "Mountain Peak Shipping Update",
  nodes: [
    {
      "id": "trigger-1",
      "type": "trigger_webhook",
      "position": { "x": 0, "y": 0 },
      "config": { "path": "/shipping-update", "secret": "mountain_peak_ship_secret_2024" },
      "status": "ready",
      "label": "Shipping Webhook"
    },
    {
      "id": "crm-1",
      "type": "lc_crm",
      "position": { "x": 300, "y": 0 },
      "config": {
        "action": "move-pipeline-stage",
        "contactId": "{{trigger.contactId}}",
        "pipelineStageId": "shipped"
      },
      "status": "ready",
      "label": "Move to Shipped"
    },
    {
      "id": "email-1",
      "type": "lc_email",
      "position": { "x": 600, "y": 0 },
      "config": {
        "action": "send-confirmation-email",
        "to": "{{trigger.customerEmail}}",
        "subject": "Your Mountain Peak Coffee order has shipped!",
        "body": "Hi {{trigger.customerFirstName}},\n\nGreat news! Your freshly roasted coffee is on its way.\n\nTracking Number: {{trigger.trackingNumber}}\nCarrier: {{trigger.carrier}}\nTrack your package: {{trigger.trackingUrl}}\n\nEstimated delivery: {{trigger.estimatedDelivery}}\n\nPro tip: For the best cup, use your coffee within 2-4 weeks of the roast date. Store in an airtight container at room temperature, away from direct sunlight.\n\nHappy brewing,\nThe Mountain Peak Coffee Team"
      },
      "status": "ready",
      "label": "Shipping Notification"
    },
    {
      "id": "wait-1",
      "type": "wait_delay",
      "position": { "x": 900, "y": 0 },
      "config": { "duration": 3, "unit": "days" },
      "status": "ready",
      "label": "Wait 3 Days"
    },
    {
      "id": "crm-2",
      "type": "lc_crm",
      "position": { "x": 1200, "y": 0 },
      "config": {
        "action": "move-pipeline-stage",
        "contactId": "{{trigger.contactId}}",
        "pipelineStageId": "delivered"
      },
      "status": "ready",
      "label": "Move to Delivered"
    },
    {
      "id": "email-2",
      "type": "lc_email",
      "position": { "x": 1500, "y": 0 },
      "config": {
        "action": "send-confirmation-email",
        "to": "{{trigger.customerEmail}}",
        "subject": "Your coffee has arrived!",
        "body": "Hi {{trigger.customerFirstName}},\n\nYour Mountain Peak Coffee order should be at your door!\n\nHere's how to get the best out of your beans:\n\n1. Wait 3-5 days after roast date for optimal flavor\n2. Grind just before brewing for maximum freshness\n3. Use 2 tablespoons per 6oz of water\n4. Water temperature: 195-205F (just off the boil)\n\nIf anything isn't perfect, just reply to this email and we'll make it right.\n\nEnjoy the brew!\nThe Mountain Peak Coffee Team"
      },
      "status": "ready",
      "label": "Delivery Follow-Up"
    }
  ],
  edges: [
    { "id": "e-1", "source": "trigger-1", "target": "crm-1",   "sourceHandle": "output", "targetHandle": "input" },
    { "id": "e-2", "source": "crm-1",     "target": "email-1",  "sourceHandle": "output", "targetHandle": "input" },
    { "id": "e-3", "source": "email-1",   "target": "wait-1",   "sourceHandle": "output", "targetHandle": "input" },
    { "id": "e-4", "source": "wait-1",    "target": "crm-2",    "sourceHandle": "output", "targetHandle": "input" },
    { "id": "e-5", "source": "crm-2",     "target": "email-2",  "sourceHandle": "output", "targetHandle": "input" }
  ],
  triggers: [{ "type": "trigger_webhook", "config": { "path": "/shipping-update", "secret": "mountain_peak_ship_secret_2024" } }]
})
```

```
updateWorkflowStatus({ sessionId: "<SESSION_ID>", workflowId: "wf_mountain_peak_shipping_001", status: "active" })
```

**Workflow 3: Review Request**

```
createWorkflow({
  sessionId: "<SESSION_ID>",
  name: "Mountain Peak Review Request",
  description: "Sends review request 7 days after delivery, tags reviewed contacts"
})
// Returns: workflowId = "wf_mountain_peak_review_001"
```

```
saveWorkflow({
  sessionId: "<SESSION_ID>",
  workflowId: "wf_mountain_peak_review_001",
  name: "Mountain Peak Review Request",
  nodes: [
    {
      "id": "trigger-1",
      "type": "trigger_contact_updated",
      "position": { "x": 0, "y": 0 },
      "config": {},
      "status": "ready",
      "label": "Contact Updated"
    },
    {
      "id": "if-1",
      "type": "if_then",
      "position": { "x": 300, "y": 0 },
      "config": { "expression": "{{trigger.contact.pipelineStageId}} === 'delivered'" },
      "status": "ready",
      "label": "Is Delivered?"
    },
    {
      "id": "wait-1",
      "type": "wait_delay",
      "position": { "x": 600, "y": 0 },
      "config": { "duration": 7, "unit": "days" },
      "status": "ready",
      "label": "Wait 7 Days"
    },
    {
      "id": "email-1",
      "type": "lc_email",
      "position": { "x": 900, "y": 0 },
      "config": {
        "action": "send-confirmation-email",
        "to": "{{trigger.contact.email}}",
        "subject": "How's the coffee? We'd love your feedback",
        "body": "Hi {{trigger.contact.firstName}},\n\nIt's been a week since your Mountain Peak Coffee arrived. We hope you've been enjoying every cup!\n\nWe'd love to hear what you think. Leave a quick review and let other coffee lovers know about your experience:\n\nLeave a review: https://mountainpeakcoffee.com/reviews\n\nYour feedback directly helps us select the best beans and improve our roasting process.\n\nAs a thank you, here's 10% off your next order: BREW10\n\nHappy brewing,\nThe Mountain Peak Coffee Team"
      },
      "status": "ready",
      "label": "Review Request Email"
    },
    {
      "id": "if-2",
      "type": "if_then",
      "position": { "x": 1200, "y": 0 },
      "config": { "expression": "{{trigger.contact.tags}}.includes('review_submitted')" },
      "status": "ready",
      "label": "Review Submitted?"
    },
    {
      "id": "crm-1",
      "type": "lc_crm",
      "position": { "x": 1500, "y": 0 },
      "config": {
        "action": "update-contact",
        "contactId": "{{trigger.contact._id}}",
        "tags": ["reviewed"]
      },
      "status": "ready",
      "label": "Tag: Reviewed"
    }
  ],
  edges: [
    { "id": "e-1", "source": "trigger-1", "target": "if-1",    "sourceHandle": "output", "targetHandle": "input" },
    { "id": "e-2", "source": "if-1",      "target": "wait-1",  "sourceHandle": "true",   "targetHandle": "input" },
    { "id": "e-3", "source": "wait-1",    "target": "email-1", "sourceHandle": "output", "targetHandle": "input" },
    { "id": "e-4", "source": "email-1",   "target": "if-2",    "sourceHandle": "output", "targetHandle": "input" },
    { "id": "e-5", "source": "if-2",      "target": "crm-1",   "sourceHandle": "true",   "targetHandle": "input" }
  ],
  triggers: [{ "type": "trigger_contact_updated", "config": {} }]
})
```

```
updateWorkflowStatus({ sessionId: "<SESSION_ID>", workflowId: "wf_mountain_peak_review_001", status: "active" })
```

**Workflow 4: Cross-Sell / Upsell**

```
createWorkflow({
  sessionId: "<SESSION_ID>",
  name: "Mountain Peak Cross-Sell",
  description: "Sends related product recommendations 14 days after delivery, enrolls in cross-sell automation"
})
// Returns: workflowId = "wf_mountain_peak_xsell_001"
```

```
saveWorkflow({
  sessionId: "<SESSION_ID>",
  workflowId: "wf_mountain_peak_xsell_001",
  name: "Mountain Peak Cross-Sell",
  nodes: [
    {
      "id": "trigger-1",
      "type": "trigger_contact_updated",
      "position": { "x": 0, "y": 0 },
      "config": {},
      "status": "ready",
      "label": "Contact Updated"
    },
    {
      "id": "if-1",
      "type": "if_then",
      "position": { "x": 300, "y": 0 },
      "config": { "expression": "{{trigger.contact.pipelineStageId}} === 'delivered'" },
      "status": "ready",
      "label": "Is Delivered?"
    },
    {
      "id": "wait-1",
      "type": "wait_delay",
      "position": { "x": 600, "y": 0 },
      "config": { "duration": 14, "unit": "days" },
      "status": "ready",
      "label": "Wait 14 Days"
    },
    {
      "id": "email-1",
      "type": "lc_email",
      "position": { "x": 900, "y": 0 },
      "config": {
        "action": "send-confirmation-email",
        "to": "{{trigger.contact.email}}",
        "subject": "Expand your coffee horizons, {{trigger.contact.firstName}}",
        "body": "Hi {{trigger.contact.firstName}},\n\nNow that you've had a chance to enjoy your recent order, we thought you might like to explore more of what Mountain Peak Coffee has to offer.\n\nBased on your purchase, here are some recommendations:\n\nIf you loved the Ethiopian Yirgacheffe, try our Colombian Supremo -- another bright, fruity single origin with notes of red apple and honey.\n\nIf you enjoyed the House Blend, our Coffee Lovers Starter Kit lets you sample three of our best sellers plus a branded mug -- all at a 10% savings.\n\nAnd if you want fresh coffee every month without thinking about it, our Monthly Subscription Box ($29.99/month) delivers two bags of curated single-origin beans right to your door.\n\nShop now: https://mountainpeakcoffee.com/shop\n\nUse code BREW10 for 10% off.\n\nHappy brewing,\nThe Mountain Peak Coffee Team"
      },
      "status": "ready",
      "label": "Cross-Sell Email"
    },
    {
      "id": "ac-1",
      "type": "activecampaign",
      "position": { "x": 1200, "y": 0 },
      "config": {
        "action": "add_to_automation",
        "contactEmail": "{{trigger.contact.email}}",
        "automationId": "<AC_CROSS_SELL_AUTOMATION_ID>"
      },
      "status": "ready",
      "label": "Add to Cross-Sell Automation"
    }
  ],
  edges: [
    { "id": "e-1", "source": "trigger-1", "target": "if-1",    "sourceHandle": "output", "targetHandle": "input" },
    { "id": "e-2", "source": "if-1",      "target": "wait-1",  "sourceHandle": "true",   "targetHandle": "input" },
    { "id": "e-3", "source": "wait-1",    "target": "email-1", "sourceHandle": "output", "targetHandle": "input" },
    { "id": "e-4", "source": "email-1",   "target": "ac-1",    "sourceHandle": "output", "targetHandle": "input" }
  ],
  triggers: [{ "type": "trigger_contact_updated", "config": {} }]
})
```

```
updateWorkflowStatus({ sessionId: "<SESSION_ID>", workflowId: "wf_mountain_peak_xsell_001", status: "active" })
```

---

### Step 6: Create Sequences

**Post-Purchase Nurture Sequence:**

```
// type: "automation_sequence", subtype: "nachher"
// name: "Mountain Peak Post-Purchase Nurture"
// triggerEvent: "contact_tagged" (tag: "customer")
steps: [
  {
    channel: "email",
    timing: { offset: 0, unit: "minutes", referencePoint: "trigger_event" },
    content: {
      subject: "Order Confirmed - Mountain Peak Coffee Co.",
      body: "Hi {{firstName}},\n\nThank you for your order from Mountain Peak Coffee Co.!\n\nOrder Details:\n- {{productName}} x {{quantity}}\n- Total: ${{amountFormatted}}\n\nYour invoice is attached.\n\nWe roast every batch fresh to order. Your coffee will be roasted within 24 hours and shipped the same day.\n\nBrewing tip: For the best flavor, wait 3-5 days after the roast date before brewing.\n\nHappy brewing,\nThe Mountain Peak Coffee Team"
    }
  },
  {
    channel: "email",
    timing: { offset: 1, unit: "days", referencePoint: "trigger_event" },
    content: {
      subject: "Your coffee is being roasted fresh right now",
      body: "Hi {{firstName}},\n\nRight now, your coffee beans are being carefully roasted in our small-batch roaster in the mountains of Colorado.\n\nHere's what happens next:\n1. Your beans are roasted to our exact flavor profile specifications\n2. They're rested for 12 hours to allow initial degassing\n3. We hand-pack them in our nitrogen-flushed bags to lock in freshness\n4. Your order ships the same day\n\nFun fact: Our Ethiopian Yirgacheffe beans travel over 8,000 miles from the Yirgacheffe region to our roastery. We work directly with small-lot farmers who hand-pick only the ripest cherries.\n\nYou'll receive a shipping confirmation with tracking info soon.\n\nHappy brewing,\nThe Mountain Peak Coffee Team"
    }
  },
  {
    channel: "email",
    timing: { offset: 3, unit: "days", referencePoint: "trigger_event" },
    content: {
      subject: "Your Mountain Peak Coffee order has shipped!",
      body: "Hi {{firstName}},\n\nYour freshly roasted coffee is on its way!\n\nTracking Number: {{trackingNumber}}\nCarrier: {{carrier}}\nTrack your package: {{trackingUrl}}\n\nEstimated delivery: {{estimatedDelivery}}\n\nStorage tip: When your coffee arrives, keep it in the sealed bag or transfer to an airtight container. Store at room temperature, away from direct sunlight and moisture. Do not refrigerate or freeze.\n\nHappy brewing,\nThe Mountain Peak Coffee Team"
    }
  },
  {
    channel: "email",
    timing: { offset: 5, unit: "days", referencePoint: "trigger_event" },
    content: {
      subject: "Your coffee has arrived! Here's how to brew the perfect cup",
      body: "Hi {{firstName}},\n\nYour Mountain Peak Coffee order should be at your door! Here's how to get the most out of your beans:\n\nFor Pour-Over:\n- Grind: Medium (like sea salt)\n- Ratio: 1:16 (1g coffee to 16g water)\n- Water temp: 200F\n- Bloom 30 seconds, then pour in slow circles\n\nFor French Press:\n- Grind: Coarse (like raw sugar)\n- Ratio: 1:15\n- Steep 4 minutes, press slowly\n\nFor Drip:\n- Grind: Medium\n- Use 2 tablespoons per 6oz water\n- Filtered water makes a big difference\n\nIf anything isn't perfect, just reply to this email and we'll make it right. We stand behind every bag.\n\nEnjoy the brew!\nThe Mountain Peak Coffee Team"
    }
  },
  {
    channel: "email",
    timing: { offset: 12, unit: "days", referencePoint: "trigger_event" },
    content: {
      subject: "How's the coffee? We'd love your feedback",
      body: "Hi {{firstName}},\n\nIt's been a week since your Mountain Peak Coffee arrived. We hope you've been enjoying every cup!\n\nWe'd love to hear what you think. Your review helps other coffee lovers discover their next favorite roast:\n\nLeave a review: https://mountainpeakcoffee.com/reviews\n\nAs a thank you, here's 10% off your next order: BREW10\n\nWhat we'd love to hear about:\n- Your favorite brewing method for this coffee\n- Tasting notes you noticed\n- Whether the roast level was to your liking\n\nHappy brewing,\nThe Mountain Peak Coffee Team"
    }
  },
  {
    channel: "email",
    timing: { offset: 19, unit: "days", referencePoint: "trigger_event" },
    content: {
      subject: "Expand your coffee horizons, {{firstName}}",
      body: "Hi {{firstName}},\n\nNow that you've had a chance to enjoy your recent order, here are some recommendations based on what you purchased:\n\nIf you loved the Ethiopian Yirgacheffe:\n- Try our Colombian Supremo -- bright, fruity, with notes of red apple and honey\n- Or explore our Guatemalan Antigua -- chocolatey, nutty, with a smooth finish\n\nIf you enjoyed the House Blend:\n- Our Coffee Lovers Starter Kit ($49.99) lets you sample three of our best sellers plus a branded mug\n- Save 10% vs buying individually\n\nWant fresh coffee every month?\n- Our Monthly Subscription Box ($29.99/month) delivers two bags of curated single-origin beans\n- Cancel anytime, free shipping included\n\nShop now: https://mountainpeakcoffee.com/shop\n\nUse code BREW10 for 10% off.\n\nHappy brewing,\nThe Mountain Peak Coffee Team"
    }
  },
  {
    channel: "email",
    timing: { offset: 30, unit: "days", referencePoint: "trigger_event" },
    content: {
      subject: "Time for a fresh bag? Your coffee might be running low",
      body: "Hi {{firstName}},\n\nIt's been about a month since your last order. If you've been brewing daily, your bag might be running low!\n\nReorder your favorites:\n- Single Origin Ethiopian Yirgacheffe (12oz) - $18.99\n- House Blend (12oz) - $14.99\n- Coffee Lovers Starter Kit (3 bags + mug) - $49.99\n\nOr never run out again with our Monthly Subscription Box ($29.99/month). Two bags of curated single-origin coffee delivered every month. Cancel anytime.\n\nNew this month: We just released our limited-edition Kenyan AA -- vibrant acidity, black currant, and brown sugar notes. Only 200 bags available.\n\nShop now: https://mountainpeakcoffee.com/shop\n\nHappy brewing,\nThe Mountain Peak Coffee Team"
    }
  }
]
```

---

### Step 7: Link All Objects

```
// Products -> Form (product_form)
objectLinks.create({ sourceObjectId: "prod_ethiopian_yirgacheffe", targetObjectId: "form_mountain_peak_order", linkType: "product_form" })
objectLinks.create({ sourceObjectId: "prod_house_blend",           targetObjectId: "form_mountain_peak_order", linkType: "product_form" })
objectLinks.create({ sourceObjectId: "prod_starter_kit",           targetObjectId: "form_mountain_peak_order", linkType: "product_form" })
objectLinks.create({ sourceObjectId: "prod_subscription_box",      targetObjectId: "form_mountain_peak_order", linkType: "product_form" })

// Checkout -> Products (checkout_product)
objectLinks.create({ sourceObjectId: "<checkout_config_id>", targetObjectId: "prod_ethiopian_yirgacheffe", linkType: "checkout_product" })
objectLinks.create({ sourceObjectId: "<checkout_config_id>", targetObjectId: "prod_house_blend",           linkType: "checkout_product" })
objectLinks.create({ sourceObjectId: "<checkout_config_id>", targetObjectId: "prod_starter_kit",           linkType: "checkout_product" })
objectLinks.create({ sourceObjectId: "<checkout_config_id>", targetObjectId: "prod_subscription_box",      linkType: "checkout_product" })

// Order Processing Workflow -> Form (workflow_form)
objectLinks.create({ sourceObjectId: "wf_mountain_peak_order_001", targetObjectId: "form_mountain_peak_order", linkType: "workflow_form" })

// Order Processing Workflow -> Post-Purchase Sequence (workflow_sequence)
objectLinks.create({ sourceObjectId: "wf_mountain_peak_order_001", targetObjectId: "<post_purchase_seq_id>", linkType: "workflow_sequence" })

// Review Request Workflow -> Post-Purchase Sequence (workflow_sequence)
objectLinks.create({ sourceObjectId: "wf_mountain_peak_review_001", targetObjectId: "<post_purchase_seq_id>", linkType: "workflow_sequence" })
```

---

### Step 8: Populate the File System

```
createVirtualFile({
  sessionId: "<SESSION_ID>",
  projectId: "proj_mountain_peak_001",
  name: "product-catalog-brief",
  parentPath: "/notes",
  content: "# Mountain Peak Coffee Co. - Product Catalog\n\n## Physical Products\n\n### Single Origin Ethiopian Yirgacheffe\n- SKU: COFFEE-ETH-YRG-12\n- Price: $18.99\n- 12oz whole bean, light roast\n- Tasting notes: blueberry, jasmine, dark chocolate\n- Inventory: 500 units\n\n### House Blend\n- SKU: COFFEE-HB-12\n- Price: $14.99\n- 12oz whole bean, medium roast\n- Tasting notes: caramel, toasted almond, milk chocolate\n- Inventory: 800 units\n\n### Coffee Lovers Starter Kit\n- SKU: COFFEE-KIT-STARTER\n- Price: $49.99\n- 3 x 12oz bags (Ethiopian, House Blend, Colombian) + branded mug\n- Inventory: 200 units\n\n## Digital / Recurring Products\n\n### Monthly Subscription Box\n- SKU: COFFEE-SUB-MONTHLY\n- Price: $29.99/month\n- 2 x 12oz bags of curated single-origin, tasting notes, brewing tips\n- Unlimited inventory"
})

createVirtualFile({
  sessionId: "<SESSION_ID>",
  projectId: "proj_mountain_peak_001",
  name: "pricing-strategy",
  parentPath: "/notes",
  content: "# Pricing Strategy\n\n## Pricing Tiers\n- Single bags: $14.99 - $18.99 (accessible everyday purchase)\n- Starter Kit: $49.99 (11% discount vs buying 3 individually at ~$56)\n- Subscription: $29.99/month (recurring revenue, premium experience)\n\n## Shipping\n- US domestic: flat rate $5.99\n- Free shipping over $50\n- Subscription: free shipping included\n\n## Discounts\n- BREW10: 10% off (review incentive, cross-sell)\n- Subscription: free shipping (built into price)\n\n## Tax\n- Behavior: exclusive (added at checkout)\n- Nexus: CO"
})

createVirtualFile({
  sessionId: "<SESSION_ID>",
  projectId: "proj_mountain_peak_001",
  name: "shipping-policy",
  parentPath: "/notes",
  content: "# Shipping Policy\n\n## Domestic (US)\n- Standard: $5.99, 3-5 business days\n- Free on orders $50+\n- Subscription orders: free shipping\n\n## Processing\n- Orders roasted within 24 hours of purchase\n- Shipped same day as roasting\n- Nitrogen-flushed bags for maximum freshness\n- Gift orders include tasting notes card and handwritten note\n\n## Digital Products\n- Subscription: first box ships within 3 business days of signup\n- Monthly boxes ship on the 1st of each month"
})

createVirtualFile({
  sessionId: "<SESSION_ID>",
  projectId: "proj_mountain_peak_001",
  name: "returns-policy",
  parentPath: "/notes",
  content: "# Returns Policy\n\n## Physical Products\n- 30-day satisfaction guarantee from delivery date\n- Unopened bags: full refund, free return shipping\n- Opened bags: if not satisfied with quality, contact us for replacement or refund\n- Damaged items: photo required, immediate replacement shipped at no cost\n\n## Subscription\n- Cancel anytime, no cancellation fee\n- Refund for current month if box has not shipped\n- No refund after box has shipped"
})

captureBuilderApp({ projectId: "proj_mountain_peak_001", builderAppId: "<STOREFRONT_APP_ID>" })
captureBuilderApp({ projectId: "proj_mountain_peak_001", builderAppId: "<PRODUCT_DETAIL_APP_ID>" })
captureBuilderApp({ projectId: "proj_mountain_peak_001", builderAppId: "<CART_CHECKOUT_APP_ID>" })
captureBuilderApp({ projectId: "proj_mountain_peak_001", builderAppId: "<CONFIRMATION_APP_ID>" })

captureLayerWorkflow({ projectId: "proj_mountain_peak_001", layerWorkflowId: "wf_mountain_peak_order_001" })
captureLayerWorkflow({ projectId: "proj_mountain_peak_001", layerWorkflowId: "wf_mountain_peak_shipping_001" })
captureLayerWorkflow({ projectId: "proj_mountain_peak_001", layerWorkflowId: "wf_mountain_peak_review_001" })
captureLayerWorkflow({ projectId: "proj_mountain_peak_001", layerWorkflowId: "wf_mountain_peak_xsell_001" })
```

---

### Complete Object Inventory

| # | Object Type | Subtype | Name | Key Detail |
|---|------------|---------|------|-----------|
| 1 | `project` | `campaign` | "Mountain Peak Coffee Co. - Online Store" | Container for all assets |
| 2 | `product` | `physical` | "Single Origin Ethiopian Yirgacheffe" | $18.99, 500 units, requiresShipping: true |
| 3 | `product` | `physical` | "House Blend" | $14.99, 800 units, requiresShipping: true |
| 4 | `product` | `physical` | "Coffee Lovers Starter Kit" | $49.99, 200 units, requiresShipping: true |
| 5 | `product` | `digital` | "Monthly Subscription Box" | $29.99/month, unlimited, requiresShipping: false |
| 6 | `form` | `registration` | "Mountain Peak Coffee Order Form" | 13 fields, published |
| 7 | `layer_workflow` | `workflow` | "Mountain Peak Order Processing" | 9 nodes, 8 edges, active |
| 8 | `layer_workflow` | `workflow` | "Mountain Peak Shipping Update" | 6 nodes, 5 edges, active |
| 9 | `layer_workflow` | `workflow` | "Mountain Peak Review Request" | 6 nodes, 5 edges, active |
| 10 | `layer_workflow` | `workflow` | "Mountain Peak Cross-Sell" | 5 nodes, 4 edges, active |
| 11 | `automation_sequence` | `nachher` | "Mountain Peak Post-Purchase Nurture" | 7 emails over 30 days |
| 12 | `builder_app` | `template_based` | "Storefront Page" | Product grid, categories, search |
| 13 | `builder_app` | `template_based` | "Product Detail Template" | Image gallery, variants, reviews |
| 14 | `builder_app` | `template_based` | "Cart/Checkout Page" | Line items, shipping form, Stripe |
| 15 | `builder_app` | `template_based` | "Order Confirmation Page" | Summary, delivery info, next steps |

| # | Link Type | Source | Target |
|---|----------|--------|--------|
| 1 | `product_form` | Product: Ethiopian Yirgacheffe (2) | Form (6) |
| 2 | `product_form` | Product: House Blend (3) | Form (6) |
| 3 | `product_form` | Product: Starter Kit (4) | Form (6) |
| 4 | `product_form` | Product: Subscription Box (5) | Form (6) |
| 5 | `checkout_product` | Checkout config | Product: Ethiopian Yirgacheffe (2) |
| 6 | `checkout_product` | Checkout config | Product: House Blend (3) |
| 7 | `checkout_product` | Checkout config | Product: Starter Kit (4) |
| 8 | `checkout_product` | Checkout config | Product: Subscription Box (5) |
| 9 | `workflow_form` | Workflow: Order Processing (7) | Form (6) |
| 10 | `workflow_sequence` | Workflow: Order Processing (7) | Sequence: Post-Purchase (11) |
| 11 | `workflow_sequence` | Workflow: Review Request (9) | Sequence: Post-Purchase (11) |

### Credit Cost Estimate

| Action | Count per order | Credits Each | Total |
|--------|----------------|-------------|-------|
| Behavior: create-transaction | 1 | 1 | 1 |
| Behavior: create-contact | 1 | 1 | 1 |
| Behavior: generate-invoice | 1 | 1 | 1 |
| Behavior: send-confirmation-email (order) | 1 | 1 | 1 |
| Behavior: send-admin-notification | 1 | 1 | 1 |
| Behavior: move-pipeline-stage (purchased) | 1 | 1 | 1 |
| Behavior: activecampaign-sync (add_contact) | 1 | 1 | 1 |
| Behavior: activecampaign-sync (add_tag) | 1 | 1 | 1 |
| Shipping workflow (physical only): move-pipeline-stage (shipped) + send-confirmation-email (shipping) + move-pipeline-stage (delivered) + send-confirmation-email (delivery) | 4 | 1 | 4 |
| Review request workflow: if_then + wait_delay + send-confirmation-email + if_then + update-contact | 5 | 1 | 5 |
| Cross-sell workflow: if_then + wait_delay + send-confirmation-email + add_to_automation | 4 | 1 | 4 |
| Post-purchase sequence: 7 emails | 7 | 1 | 7 |
| **Total per physical order (all workflows)** | | | **28 credits** |
| **Total per digital order (no shipping workflow)** | | | **24 credits** |

For 100 orders/month (75 physical, 25 digital): approximately 2,700 credits/month.
