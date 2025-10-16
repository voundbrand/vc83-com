# CRM and Invoicing Apps - Requirements Document

**Date:** 2025-10-16
**Status:** Planning Phase
**Priority:** High

---

## 🎯 Executive Summary

This document outlines the requirements for implementing two critical business applications within the vc83-com platform:

1. **CRM App** - Customer relationship management with organizations and contacts
2. **Invoicing App** - Invoice creation, management, and Stripe integration

Both apps will follow the existing app architecture pattern with proper RBAC, window-based UI, and integration with the platform's event system and checkout flows.

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [CRM App Requirements](#crm-app-requirements)
3. [Invoicing App Requirements](#invoicing-app-requirements)
4. [Integration Points](#integration-points)
5. [Technical Architecture](#technical-architecture)
6. [User Flows](#user-flows)
7. [Database Schema](#database-schema)
8. [RBAC Permissions](#rbac-permissions)
9. [UI/UX Requirements](#uiux-requirements)
10. [Implementation Phases](#implementation-phases)

---

## 1. Overview

### Problem Statement

Currently, the platform lacks:
- A centralized system for managing customer/client organizations and contacts (CRM)
- A proper invoicing system that integrates with Stripe and CRM data
- Automatic CRM record creation from checkout flows and event registrations
- A way to enable Stripe Invoicing capability automatically by creating a draft invoice

### Solution

Build two interconnected apps that:
- **CRM App**: Manages customer organizations and contacts (separate from platform organizations)
- **Invoicing App**: Creates and manages invoices using CRM data and Stripe integration
- **Auto-enable Stripe Invoicing**: When user clicks "Enable Invoicing", create a draft invoice automatically to activate the feature

### Key Benefits

1. **Unified Customer Data**: All customer interactions tracked in one place
2. **Streamlined Billing**: Create invoices directly from CRM records
3. **Automatic Data Collection**: Checkout and event registrations auto-populate CRM
4. **Stripe Integration**: Seamless invoice creation and payment tracking
5. **Easy Invoicing Setup**: One-click enable via automatic draft invoice creation

---

## 2. CRM App Requirements

### 2.1 Core Features

#### CRM Organizations
- Separate entity from platform organizations
- Represents customer companies/businesses
- Can have multiple contacts
- Used for B2B relationships

**Fields:**
```typescript
{
  _id: Id<"crm_organizations">
  platformOrgId: Id<"organizations">  // Which platform org owns this CRM record
  name: string
  website?: string
  industry?: string
  size?: "1-10" | "11-50" | "51-200" | "201-500" | "501+"
  address?: {
    street: string
    city: string
    state: string
    postalCode: string
    country: string
  }
  taxId?: string  // VAT/EIN/etc
  billingEmail?: string
  phone?: string
  notes?: string
  tags: string[]
  customFields?: Record<string, any>
  createdAt: number
  updatedAt: number
  createdBy: Id<"users">
}
```

#### CRM Contacts
- Individual people within CRM organizations
- Can be associated with a platform user (optional)
- Used for communication and billing

**Fields:**
```typescript
{
  _id: Id<"crm_contacts">
  platformOrgId: Id<"organizations">  // Which platform org owns this CRM record
  crmOrgId?: Id<"crm_organizations">  // Optional company association
  platformUserId?: Id<"users">  // Optional link to platform user

  // Personal info
  firstName: string
  lastName: string
  email: string
  phone?: string
  jobTitle?: string

  // Contact preferences
  preferredLanguage?: string
  timezone?: string

  // Address
  address?: {
    street: string
    city: string
    state: string
    postalCode: string
    country: string
  }

  // Metadata
  notes?: string
  tags: string[]
  customFields?: Record<string, any>

  // Source tracking
  source?: "manual" | "checkout" | "event" | "import" | "api"
  sourceRef?: string  // ID of checkout, event, etc.

  createdAt: number
  updatedAt: number
  createdBy: Id<"users">
}
```

### 2.2 CRM Features

1. **Organization Management**
   - Create, edit, delete CRM organizations
   - Search and filter organizations
   - View organization details with contacts list
   - Add notes and tags
   - Custom fields support

2. **Contact Management**
   - Create, edit, delete contacts
   - Link contacts to CRM organizations
   - Search and filter contacts
   - View contact history (invoices, events attended, etc.)
   - Import contacts from CSV
   - Bulk operations (tag, delete, export)

3. **Relationships**
   - Link CRM contacts to platform users (for login access)
   - Associate multiple contacts with one CRM organization
   - Track contact roles within organizations

4. **Integration Points**
   - Auto-create CRM records from checkout
   - Auto-create CRM records from event registrations
   - Use CRM data for invoice creation
   - Use CRM data for email campaigns (future)

### 2.3 CRM App Registration

**App Code:** `crm`

**App Configuration:**
```typescript
{
  appCode: "crm",
  name: "CRM",
  description: "Customer relationship management - manage customer organizations and contacts",
  icon: "Users",
  category: "Business",
  version: "1.0.0",

  // Windows
  windows: [
    {
      windowId: "crm-organizations",
      title: "CRM Organizations",
      icon: "Building2",
      defaultSize: { width: 900, height: 700 }
    },
    {
      windowId: "crm-contacts",
      title: "CRM Contacts",
      icon: "Users",
      defaultSize: { width: 900, height: 700 }
    }
  ],

  // Desktop icons
  desktopIcons: [
    {
      iconId: "crm",
      label: "CRM",
      icon: "Users",
      opensWindow: "crm-organizations"
    }
  ],

  // Required permissions
  requiredPermissions: [
    "crm:view",
    "crm:manage"
  ],

  // Available for all org types by default
  availability: {
    systemOrg: true,
    regularOrg: true,
    defaultEnabled: true
  }
}
```

---

## 3. Invoicing App Requirements

### 3.1 Core Features

#### Invoices
- Create, edit, send, and track invoices
- Integration with Stripe Invoicing
- Support for draft, sent, paid, cancelled states
- Line items with products/services

**Fields:**
```typescript
{
  _id: Id<"invoices">
  platformOrgId: Id<"organizations">  // Which platform org owns this invoice

  // Invoice identification
  invoiceNumber: string  // Auto-generated or custom
  status: "draft" | "sent" | "paid" | "overdue" | "cancelled" | "refunded"

  // Customer information (from CRM)
  crmOrgId?: Id<"crm_organizations">
  crmContactId: Id<"crm_contacts">  // Bill to this contact

  // Stripe integration
  stripeInvoiceId?: string  // Stripe invoice ID when synced
  stripeCustomerId?: string  // Stripe customer ID
  stripePaymentIntentId?: string

  // Invoice details
  issueDate: number
  dueDate: number
  currency: string  // "USD", "EUR", etc.

  // Line items
  items: Array<{
    description: string
    quantity: number
    unitPrice: number  // In cents
    taxRate?: number  // Percentage
    total: number  // In cents
    productId?: Id<"products">  // Optional link to product
  }>

  // Calculations
  subtotal: number  // In cents
  taxAmount: number  // In cents
  discountAmount: number  // In cents
  total: number  // In cents
  amountPaid: number  // In cents
  amountDue: number  // In cents

  // Payment tracking
  paidAt?: number
  paymentMethod?: string

  // Additional info
  notes?: string
  termsAndConditions?: string
  footer?: string

  // Metadata
  tags: string[]
  customFields?: Record<string, any>

  createdAt: number
  updatedAt: number
  createdBy: Id<"users">
}
```

### 3.2 Invoicing Features

1. **Invoice Creation**
   - Create invoice from template
   - Add line items manually or from products catalog
   - Auto-calculate taxes based on org tax settings
   - Set payment terms (net 30, net 60, etc.)
   - Add custom notes and terms

2. **Invoice Management**
   - Save as draft
   - Send invoice (creates in Stripe)
   - Mark as paid manually
   - Cancel invoice
   - Download as PDF
   - Duplicate invoice

3. **Stripe Integration**
   - Sync invoice to Stripe when sent
   - Create Stripe customer from CRM contact
   - Track payment status from Stripe webhooks
   - Handle payment intents
   - Support for automatic payment collection

4. **Invoice Listing**
   - View all invoices with filters
   - Filter by status, customer, date range
   - Search by invoice number or customer name
   - Bulk operations (send, cancel, export)

5. **Reporting**
   - Total revenue by period
   - Outstanding invoices
   - Overdue invoices
   - Payment collection rates

### 3.3 Auto-Enable Stripe Invoicing

**Problem:** Stripe requires at least one invoice to be created to fully enable invoicing capability.

**Solution:** When user clicks "Enable Invoicing" button:

1. Show a modal: "Setting up Stripe Invoicing..."
2. Create a draft invoice with placeholder data:
   ```typescript
   {
     crmContactId: "system-contact",  // Auto-created system contact
     items: [{
       description: "Initial invoice setup (draft)",
       quantity: 1,
       unitPrice: 100,  // $1.00
       total: 100
     }],
     status: "draft",
     notes: "This is an initial draft invoice created to enable Stripe Invoicing. You can delete this draft."
   }
   ```
3. Sync draft to Stripe (creates invoice in Stripe)
4. Mark invoicing as enabled in org settings
5. Show success message
6. User can now create real invoices

**Benefits:**
- One-click enable
- No manual dashboard navigation needed
- Automatic Stripe capability activation
- User can delete draft after enabling

### 3.4 Invoicing App Registration

**App Code:** `invoicing`

**App Configuration:**
```typescript
{
  appCode: "invoicing",
  name: "Invoicing",
  description: "Create and manage invoices with Stripe integration",
  icon: "FileText",
  category: "Business",
  version: "1.0.0",

  // Dependencies
  dependencies: ["crm"],  // Requires CRM app for customer data

  // Windows
  windows: [
    {
      windowId: "invoices-list",
      title: "Invoices",
      icon: "FileText",
      defaultSize: { width: 1000, height: 700 }
    },
    {
      windowId: "invoice-create",
      title: "Create Invoice",
      icon: "FilePlus",
      defaultSize: { width: 800, height: 700 }
    },
    {
      windowId: "invoice-detail",
      title: "Invoice Details",
      icon: "FileText",
      defaultSize: { width: 800, height: 700 }
    }
  ],

  // Desktop icons
  desktopIcons: [
    {
      iconId: "invoices",
      label: "Invoices",
      icon: "FileText",
      opensWindow: "invoices-list"
    }
  ],

  // Required permissions
  requiredPermissions: [
    "invoices:view",
    "invoices:create",
    "invoices:manage"
  ],

  // Requires Stripe Connect
  prerequisites: {
    stripeConnected: true
  },

  // Available for all org types
  availability: {
    systemOrg: true,
    regularOrg: true,
    defaultEnabled: false  // Must be enabled manually
  }
}
```

---

## 4. Integration Points

### 4.1 Checkout Integration

**Automatic CRM Record Creation:**

When a customer completes checkout:

1. Check if contact exists (by email)
2. If not, create CRM contact:
   ```typescript
   {
     firstName: checkout.customerInfo.firstName,
     email: checkout.customerInfo.email,
     source: "checkout",
     sourceRef: checkout._id,
     tags: ["customer", "checkout"]
   }
   ```
3. If company info provided, create/link CRM organization
4. Store CRM contact ID in transaction record

**Implementation:**
- Add to existing checkout completion flow
- Mutation: `createCRMContactFromCheckout`
- Link transaction to CRM contact for history

### 4.2 Event Registration Integration

**Automatic CRM Record Creation:**

When someone registers for an event:

1. Check if contact exists (by email)
2. If not, create CRM contact:
   ```typescript
   {
     firstName: registration.firstName,
     email: registration.email,
     source: "event",
     sourceRef: event._id,
     tags: ["attendee", `event-${event.slug}`]
   }
   ```
3. Link registration to CRM contact
4. Track event attendance in contact history

**Implementation:**
- Add to event registration flow
- Mutation: `createCRMContactFromRegistration`
- Query: `getContactEventHistory`

### 4.3 Invoice Creation from CRM

**User Flow:**
1. Open CRM → Select Contact
2. Click "Create Invoice" button
3. Opens invoice creation form with customer pre-filled
4. Add line items
5. Save as draft or send immediately

**Implementation:**
- Button in CRM contact detail view
- Opens invoice window with pre-populated customer data
- Links invoice to CRM contact

### 4.4 Stripe Webhooks Integration

**Invoice Payment Events:**

Handle Stripe invoice webhooks:
- `invoice.paid` → Update invoice status to "paid"
- `invoice.payment_failed` → Update status, send notification
- `invoice.finalized` → Update status to "sent"
- `invoice.voided` → Update status to "cancelled"

**Implementation:**
- Extend existing webhook handler
- Match Stripe invoice ID to internal invoice
- Update status and sync data

---

## 5. Technical Architecture

### 5.1 Database Schema

**New Tables:**
```typescript
// CRM Organizations
crm_organizations: {
  _id: Id<"crm_organizations">
  platformOrgId: Id<"organizations">
  // ... fields from section 2.1
}

// CRM Contacts
crm_contacts: {
  _id: Id<"crm_contacts">
  platformOrgId: Id<"organizations">
  crmOrgId?: Id<"crm_organizations">
  // ... fields from section 2.1
}

// Invoices
invoices: {
  _id: Id<"invoices">
  platformOrgId: Id<"organizations">
  crmContactId: Id<"crm_contacts">
  // ... fields from section 3.1
}

// Invoice Items (alternative: embedded in invoices)
invoice_items?: {
  _id: Id<"invoice_items">
  invoiceId: Id<"invoices">
  description: string
  quantity: number
  unitPrice: number
  // ...
}
```

**Indexes:**
```typescript
// CRM Organizations
.index("by_platform_org", ["platformOrgId"])
.index("by_name", ["platformOrgId", "name"])

// CRM Contacts
.index("by_platform_org", ["platformOrgId"])
.index("by_email", ["platformOrgId", "email"])
.index("by_crm_org", ["crmOrgId"])

// Invoices
.index("by_platform_org", ["platformOrgId"])
.index("by_contact", ["crmContactId"])
.index("by_status", ["platformOrgId", "status"])
.index("by_stripe_id", ["stripeInvoiceId"])
```

### 5.2 Convex Functions Structure

**CRM Module:**
```
convex/
  crm/
    organizations.ts       # CRUD for CRM orgs
    contacts.ts           # CRUD for contacts
    relationships.ts      # Link contacts to orgs
    imports.ts           # CSV import functionality
    exports.ts           # Data export

  crmIntegrations/
    fromCheckout.ts      # Create contacts from checkout
    fromEvents.ts        # Create contacts from events
    linkToPlatformUser.ts # Link CRM contact to user
```

**Invoicing Module:**
```
convex/
  invoicing/
    invoices.ts          # CRUD for invoices
    items.ts            # Line item management
    calculations.ts     # Tax, total calculations
    pdf.ts              # PDF generation

  invoicingIntegrations/
    stripe.ts           # Sync with Stripe
    payments.ts         # Payment tracking
    webhooks.ts         # Stripe webhook handlers
    autoEnable.ts       # Auto-enable via draft invoice
```

### 5.3 File Structure

**Frontend Components:**
```
src/
  components/
    window-content/
      crm-window/
        organizations-tab.tsx
        contacts-tab.tsx
        organization-detail.tsx
        contact-detail.tsx
        contact-form.tsx
        import-modal.tsx

      invoicing-window/
        invoices-list-tab.tsx
        invoice-create-tab.tsx
        invoice-detail.tsx
        invoice-form.tsx
        line-items-editor.tsx
        invoice-preview.tsx
```

---

## 6. User Flows

### 6.1 CRM Flows

**Create CRM Organization:**
1. Open CRM window
2. Click "New Organization"
3. Fill form (name, address, tax ID, etc.)
4. Save
5. Organization appears in list

**Create CRM Contact:**
1. Open CRM window → Contacts tab
2. Click "New Contact"
3. Fill form (name, email, company, etc.)
4. Optional: Link to CRM organization
5. Save
6. Contact appears in list

**View Contact History:**
1. Open CRM window → Contacts tab
2. Click on contact name
3. See detail view with:
   - Contact info
   - Associated organization
   - Invoices sent to this contact
   - Events attended
   - Notes and activity log

### 6.2 Invoicing Flows

**Create Invoice (Manual):**
1. Open Invoices window
2. Click "Create Invoice"
3. Select customer (CRM contact)
4. Add line items:
   - Type description
   - Set quantity and price
   - Optionally link to product
5. Review totals (auto-calculated with tax)
6. Choose action:
   - Save as Draft
   - Send Now (creates in Stripe)
7. If sent, email notification to customer

**Create Invoice (from CRM):**
1. Open CRM → View contact detail
2. Click "Create Invoice" button
3. Invoice form opens with customer pre-filled
4. Continue from step 4 above

**Enable Stripe Invoicing (One-Click):**
1. Open Payments window → Stripe tab
2. See "Stripe Invoicing Not Set Up" message
3. Click "Enable Invoicing" button
4. Modal shows: "Setting up Stripe Invoicing..."
5. System:
   - Creates system CRM contact (if not exists)
   - Creates draft invoice with placeholder data
   - Syncs to Stripe
   - Marks invoicing as enabled
6. Success message: "Invoicing enabled! You can now create invoices."
7. Click Refresh to see updated UI
8. Go to Invoices window to create real invoices

**Send Invoice:**
1. Open invoice in draft state
2. Review details
3. Click "Send Invoice"
4. System:
   - Creates Stripe customer (if needed)
   - Creates Stripe invoice
   - Sends email to customer
   - Updates status to "sent"
5. Customer receives email with payment link

**Track Payment:**
1. Customer pays via Stripe link
2. Stripe webhook fires
3. System updates invoice status to "paid"
4. User sees updated status in Invoices list

---

## 7. Database Schema

### 7.1 Full Schema Definitions

```typescript
// convex/schema.ts additions

defineTable("crm_organizations", {
  platformOrgId: v.id("organizations"),
  name: v.string(),
  website: v.optional(v.string()),
  industry: v.optional(v.string()),
  size: v.optional(v.union(
    v.literal("1-10"),
    v.literal("11-50"),
    v.literal("51-200"),
    v.literal("201-500"),
    v.literal("501+")
  )),
  address: v.optional(v.object({
    street: v.string(),
    city: v.string(),
    state: v.string(),
    postalCode: v.string(),
    country: v.string()
  })),
  taxId: v.optional(v.string()),
  billingEmail: v.optional(v.string()),
  phone: v.optional(v.string()),
  notes: v.optional(v.string()),
  tags: v.array(v.string()),
  customFields: v.optional(v.any()),
  createdAt: v.number(),
  updatedAt: v.number(),
  createdBy: v.id("users")
})
  .index("by_platform_org", ["platformOrgId"])
  .index("by_name", ["platformOrgId", "name"])
  .index("by_created_at", ["platformOrgId", "createdAt"]),

defineTable("crm_contacts", {
  platformOrgId: v.id("organizations"),
  crmOrgId: v.optional(v.id("crm_organizations")),
  platformUserId: v.optional(v.id("users")),

  // Personal info
  firstName: v.string(),
  lastName: v.string(),
  email: v.string(),
  phone: v.optional(v.string()),
  jobTitle: v.optional(v.string()),

  // Preferences
  preferredLanguage: v.optional(v.string()),
  timezone: v.optional(v.string()),

  // Address
  address: v.optional(v.object({
    street: v.string(),
    city: v.string(),
    state: v.string(),
    postalCode: v.string(),
    country: v.string()
  })),

  // Metadata
  notes: v.optional(v.string()),
  tags: v.array(v.string()),
  customFields: v.optional(v.any()),

  // Source tracking
  source: v.optional(v.union(
    v.literal("manual"),
    v.literal("checkout"),
    v.literal("event"),
    v.literal("import"),
    v.literal("api")
  )),
  sourceRef: v.optional(v.string()),

  createdAt: v.number(),
  updatedAt: v.number(),
  createdBy: v.id("users")
})
  .index("by_platform_org", ["platformOrgId"])
  .index("by_email", ["platformOrgId", "email"])
  .index("by_crm_org", ["crmOrgId"])
  .index("by_platform_user", ["platformUserId"])
  .index("by_created_at", ["platformOrgId", "createdAt"]),

defineTable("invoices", {
  platformOrgId: v.id("organizations"),

  // Invoice identification
  invoiceNumber: v.string(),
  status: v.union(
    v.literal("draft"),
    v.literal("sent"),
    v.literal("paid"),
    v.literal("overdue"),
    v.literal("cancelled"),
    v.literal("refunded")
  ),

  // Customer
  crmOrgId: v.optional(v.id("crm_organizations")),
  crmContactId: v.id("crm_contacts"),

  // Stripe
  stripeInvoiceId: v.optional(v.string()),
  stripeCustomerId: v.optional(v.string()),
  stripePaymentIntentId: v.optional(v.string()),

  // Dates
  issueDate: v.number(),
  dueDate: v.number(),

  // Currency
  currency: v.string(),

  // Line items (embedded)
  items: v.array(v.object({
    description: v.string(),
    quantity: v.number(),
    unitPrice: v.number(),
    taxRate: v.optional(v.number()),
    total: v.number(),
    productId: v.optional(v.id("products"))
  })),

  // Calculations (in cents)
  subtotal: v.number(),
  taxAmount: v.number(),
  discountAmount: v.number(),
  total: v.number(),
  amountPaid: v.number(),
  amountDue: v.number(),

  // Payment
  paidAt: v.optional(v.number()),
  paymentMethod: v.optional(v.string()),

  // Additional
  notes: v.optional(v.string()),
  termsAndConditions: v.optional(v.string()),
  footer: v.optional(v.string()),

  // Metadata
  tags: v.array(v.string()),
  customFields: v.optional(v.any()),

  createdAt: v.number(),
  updatedAt: v.number(),
  createdBy: v.id("users")
})
  .index("by_platform_org", ["platformOrgId"])
  .index("by_contact", ["crmContactId"])
  .index("by_status", ["platformOrgId", "status"])
  .index("by_stripe_id", ["stripeInvoiceId"])
  .index("by_invoice_number", ["platformOrgId", "invoiceNumber"])
  .index("by_issue_date", ["platformOrgId", "issueDate"])
  .index("by_due_date", ["platformOrgId", "dueDate"])
```

---

## 8. RBAC Permissions

### 8.1 CRM Permissions

```typescript
// CRM permissions
{
  resource: "crm",
  actions: [
    "view",           // View CRM data
    "create",         // Create orgs/contacts
    "edit",           // Edit orgs/contacts
    "delete",         // Delete orgs/contacts
    "import",         // Import contacts
    "export",         // Export data
    "link_users"      // Link CRM contacts to platform users
  ]
}

// Example roles
{
  role: "Sales Manager",
  permissions: [
    { resource: "crm", action: "view" },
    { resource: "crm", action: "create" },
    { resource: "crm", action: "edit" },
    { resource: "crm", action: "export" }
  ]
},
{
  role: "Sales Rep",
  permissions: [
    { resource: "crm", action: "view" },
    { resource: "crm", action: "create" },
    { resource: "crm", action: "edit" }
  ]
}
```

### 8.2 Invoicing Permissions

```typescript
// Invoicing permissions
{
  resource: "invoices",
  actions: [
    "view",           // View invoices
    "create",         // Create invoices
    "edit",           // Edit draft invoices
    "send",           // Send invoices to Stripe
    "cancel",         // Cancel invoices
    "mark_paid",      // Manually mark as paid
    "download",       // Download PDF
    "view_reports"    // View revenue reports
  ]
}

// Example roles
{
  role: "Accountant",
  permissions: [
    { resource: "invoices", action: "view" },
    { resource: "invoices", action: "create" },
    { resource: "invoices", action: "edit" },
    { resource: "invoices", action: "send" },
    { resource: "invoices", action: "mark_paid" },
    { resource: "invoices", action: "view_reports" },
    { resource: "crm", action: "view" }  // Need CRM access
  ]
},
{
  role: "Billing Clerk",
  permissions: [
    { resource: "invoices", action: "view" },
    { resource: "invoices", action: "create" },
    { resource: "invoices", action: "send" },
    { resource: "crm", action: "view" }
  ]
}
```

---

## 9. UI/UX Requirements

### 9.1 Retro Desktop Theme

Both apps must follow the existing retro desktop aesthetic:

**Window Styling:**
- Draggable windows with title bar
- Minimize/maximize/close buttons
- Win95-style borders and shadows
- Retro color palette (purple, white, grays)

**Component Styling:**
- Retro buttons with 3D effect
- Pixelated fonts for headers (Press Start 2P)
- Tabbed interfaces within windows
- List views with alternating row colors
- Form inputs with retro borders

**Icons:**
- Use Lucide React icons
- Apply retro styling/colors
- Consistent iconography

### 9.2 CRM Window Layout

**Organizations Tab:**
```
┌─ CRM Organizations ─────────────────────────────────────┐
│ [Search: ________] [+ New Organization]                 │
├──────────────────────────────────────────────────────────┤
│ Organizations List                                        │
│ ┌────────────────────────────────────────────────────┐  │
│ │ Name           | Industry    | Contacts | Actions  │  │
│ ├────────────────────────────────────────────────────┤  │
│ │ Acme Corp      | Tech        | 5        | [View]   │  │
│ │ Beta Industries| Manufacturing| 3       | [View]   │  │
│ │ ...                                                 │  │
│ └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

**Contacts Tab:**
```
┌─ CRM Contacts ──────────────────────────────────────────┐
│ [Search: ________] [Filter: All ▾] [+ New Contact]      │
├──────────────────────────────────────────────────────────┤
│ Contacts List                                             │
│ ┌────────────────────────────────────────────────────┐  │
│ │ Name         | Email          | Company  | Actions │  │
│ ├────────────────────────────────────────────────────┤  │
│ │ John Doe     | john@acme.com  | Acme     | [View] │  │
│ │ Jane Smith   | jane@beta.com  | Beta     | [View] │  │
│ │ ...                                                 │  │
│ └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

### 9.3 Invoicing Window Layout

**Invoices List:**
```
┌─ Invoices ──────────────────────────────────────────────┐
│ [Search: ________] [Status: All ▾] [+ Create Invoice]   │
├──────────────────────────────────────────────────────────┤
│ Invoices                                                  │
│ ┌────────────────────────────────────────────────────┐  │
│ │ #    | Customer    | Amount   | Status  | Actions  │  │
│ ├────────────────────────────────────────────────────┤  │
│ │ 001  | John Doe    | $150.00  | Paid    | [View]   │  │
│ │ 002  | Jane Smith  | $320.00  | Sent    | [View]   │  │
│ │ 003  | Bob Johnson | $89.99   | Draft   | [Edit]   │  │
│ │ ...                                                 │  │
│ └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

**Create Invoice:**
```
┌─ Create Invoice ────────────────────────────────────────┐
│ Customer: [Select Contact ▾]                             │
│ Issue Date: [10/16/2025] Due Date: [11/15/2025]        │
├──────────────────────────────────────────────────────────┤
│ Line Items:                                               │
│ ┌────────────────────────────────────────────────────┐  │
│ │ Description      | Qty | Price    | Total          │  │
│ ├────────────────────────────────────────────────────┤  │
│ │ Web Development  | 40  | $100.00  | $4,000.00     │  │
│ │ Hosting (1 year) | 1   | $299.00  | $299.00       │  │
│ │ [+ Add Item]                                       │  │
│ └────────────────────────────────────────────────────┘  │
│                                                           │
│ Subtotal: $4,299.00                                      │
│ Tax (8%): $343.92                                        │
│ Total:    $4,642.92                                      │
├──────────────────────────────────────────────────────────┤
│ Notes: [Optional notes to customer...]                   │
│                                                           │
│ [Save as Draft]  [Send Invoice]                         │
└──────────────────────────────────────────────────────────┘
```

---

## 10. Implementation Phases

### Phase 1: CRM App Foundation (Week 1)
**Goal:** Basic CRM functionality

**Tasks:**
1. Database schema setup
   - Create `crm_organizations` table
   - Create `crm_contacts` table
   - Add indexes

2. Backend (Convex)
   - CRUD mutations for organizations
   - CRUD mutations for contacts
   - Queries for listing/searching
   - Relationship management

3. App Registration
   - Register CRM app
   - Define permissions
   - Set up app availability

4. Frontend Components
   - CRM window shell
   - Organizations tab with list
   - Contacts tab with list
   - Basic forms for create/edit

**Deliverables:**
- ✅ CRM organizations CRUD working
- ✅ CRM contacts CRUD working
- ✅ Basic UI for viewing/editing

---

### Phase 2: CRM Integration (Week 2)
**Goal:** Auto-populate CRM from checkout and events

**Tasks:**
1. Checkout Integration
   - Add mutation: `createCRMContactFromCheckout`
   - Hook into checkout completion flow
   - Link transaction to CRM contact

2. Event Integration
   - Add mutation: `createCRMContactFromRegistration`
   - Hook into event registration flow
   - Track event history in contact

3. CRM Enhancements
   - Contact detail view with history
   - Organization detail view with contacts list
   - Search and filtering
   - Tags and notes

**Deliverables:**
- ✅ Checkout auto-creates CRM contacts
- ✅ Event registration auto-creates CRM contacts
- ✅ Contact history visible in detail view

---

### Phase 3: Invoicing App Foundation (Week 3)
**Goal:** Basic invoicing functionality

**Tasks:**
1. Database Schema
   - Create `invoices` table
   - Add indexes

2. Backend (Convex)
   - CRUD mutations for invoices
   - Invoice calculation logic
   - Invoice number generation

3. App Registration
   - Register Invoicing app
   - Define permissions
   - Set dependencies (requires CRM)

4. Frontend Components
   - Invoices window shell
   - Invoices list tab
   - Create invoice form
   - Line items editor
   - Invoice detail view

**Deliverables:**
- ✅ Create/edit/view invoices
- ✅ Line items management
- ✅ Auto-calculate totals with tax

---

### Phase 4: Stripe Integration (Week 4)
**Goal:** Sync invoices with Stripe

**Tasks:**
1. Stripe Customer Creation
   - Create Stripe customer from CRM contact
   - Store Stripe customer ID

2. Stripe Invoice Sync
   - Send invoice to Stripe when user clicks "Send"
   - Map internal invoice to Stripe invoice
   - Store Stripe invoice ID

3. Webhook Handlers
   - Handle `invoice.paid` event
   - Handle `invoice.payment_failed` event
   - Handle `invoice.finalized` event
   - Update invoice status

4. Auto-Enable Invoicing
   - Add "Enable Invoicing" button
   - Create system CRM contact
   - Create draft invoice with placeholder data
   - Sync to Stripe to activate capability
   - Show success message

**Deliverables:**
- ✅ Send invoices to Stripe
- ✅ Track payment status from webhooks
- ✅ One-click enable Stripe Invoicing

---

### Phase 5: Polish & Features (Week 5)
**Goal:** Production-ready features

**Tasks:**
1. CRM Features
   - CSV import for contacts
   - Data export
   - Bulk operations
   - Advanced search

2. Invoicing Features
   - PDF generation
   - Email templates
   - Recurring invoices (future)
   - Payment reminders (future)

3. Reporting
   - Revenue dashboard
   - Outstanding invoices report
   - Customer reports

4. Testing & Bug Fixes
   - End-to-end testing
   - Edge case handling
   - Performance optimization

**Deliverables:**
- ✅ Production-ready CRM app
- ✅ Production-ready Invoicing app
- ✅ Comprehensive documentation

---

## 11. Success Metrics

### CRM App
- ✅ Users can create and manage customer organizations
- ✅ Users can create and manage contacts
- ✅ Checkout automatically creates CRM contacts (100% conversion)
- ✅ Event registration automatically creates CRM contacts (100% conversion)
- ✅ Users can view contact history (invoices, events)

### Invoicing App
- ✅ Users can create invoices from CRM contacts
- ✅ Invoices sync to Stripe successfully (100% success rate)
- ✅ Invoice status updates from Stripe webhooks (100% accuracy)
- ✅ One-click enable Stripe Invoicing works (100% success rate)
- ✅ Users can track payments and revenue

---

## 12. Technical Considerations

### 12.1 Data Migration
- No existing data to migrate (new tables)
- System contact created automatically on first invoice

### 12.2 Stripe Rate Limits
- Max 100 requests per second
- Implement retry logic for failures
- Use idempotency keys for invoice creation

### 12.3 Security
- RBAC enforced on all CRM/invoice operations
- Validate organization ownership
- Sanitize inputs to prevent XSS
- Use Stripe signature verification for webhooks

### 12.4 Performance
- Index all frequently queried fields
- Paginate large lists (CRM contacts, invoices)
- Cache commonly accessed data
- Optimize database queries

### 12.5 Error Handling
- Graceful fallbacks for Stripe API failures
- User-friendly error messages
- Retry logic for transient failures
- Detailed error logging for debugging

---

## 13. Future Enhancements

### Phase 6+ (Future)
- **CRM:**
  - Email campaigns integration
  - Activity timeline for contacts
  - Sales pipeline/deals tracking
  - Contact scoring/segmentation
  - Integration with email providers

- **Invoicing:**
  - Recurring/subscription invoices
  - Multi-currency support
  - Invoice templates/themes
  - Payment plans/installments
  - Late fee automation
  - Dunning management

- **Integration:**
  - Zapier integration
  - API for third-party integrations
  - Webhook system for external systems

---

## 14. Documentation Requirements

### 14.1 User Documentation
- How to use CRM app
- How to create invoices
- How to enable Stripe Invoicing
- Import contacts from CSV guide
- Invoice best practices

### 14.2 Developer Documentation
- Database schema reference
- API documentation
- Webhook setup guide
- Testing procedures
- Troubleshooting guide

---

## 15. Questions & Decisions Needed

### Open Questions:
1. ❓ Should invoice PDF generation be server-side or client-side?
2. ❓ Do we need approval workflow for invoices? (e.g., manager approval before sending)
3. ❓ Should we support multiple currencies per invoice?
4. ❓ Do we want to allow editing sent invoices? (Stripe allows it but may confuse customers)
5. ❓ Should CRM contacts have email preferences (opt-in/out)?

### Decisions Made:
1. ✅ Line items embedded in invoice document (not separate table) - simpler queries
2. ✅ Auto-enable Stripe via draft invoice - better UX than manual dashboard navigation
3. ✅ CRM organizations separate from platform organizations - clear separation of concerns
4. ✅ Invoice status driven by Stripe webhooks - single source of truth

---

## 16. Next Steps

1. **Review this document** with stakeholders
2. **Approve architecture** and implementation plan
3. **Begin Phase 1** implementation
4. **Set up project tracking** (GitHub issues, sprint planning)
5. **Create UI mockups** for key screens
6. **Define API contracts** between frontend and backend

---

## Appendix A: Reference Files

Key existing files to reference during implementation:

1. **App Architecture:**
   - `convex/ontologyApps.ts` - App registration pattern
   - `convex/appAvailability.ts` - App availability system
   - `src/hooks/use-app-availability.tsx` - Frontend app access

2. **RBAC System:**
   - `convex/rbac.ts` - Permissions system
   - `convex/schema.ts` - Role definitions
   - See existing permission checks in mutations

3. **Window System:**
   - `src/components/floating-window.tsx` - Window container
   - `src/components/desktop-icon.tsx` - Desktop icons
   - `src/hooks/use-window-manager.tsx` - Window state

4. **Stripe Integration:**
   - `convex/stripeConnect.ts` - Stripe account management
   - `convex/stripeWebhooks.ts` - Webhook handlers
   - `convex/paymentProviders/stripe.ts` - Stripe provider

5. **Checkout Flow:**
   - `src/app/checkout/[orgSlug]/[productSlug]/checkout-page-client.tsx`
   - `convex/stripeCheckout.ts` - Checkout mutations

6. **Events System:**
   - `convex/events.ts` - Event management
   - Event registration flows

---

## Appendix B: Mock Data Examples

### Sample CRM Organization
```json
{
  "name": "Acme Corporation",
  "website": "https://acme.com",
  "industry": "Technology",
  "size": "51-200",
  "address": {
    "street": "123 Main St",
    "city": "San Francisco",
    "state": "CA",
    "postalCode": "94102",
    "country": "US"
  },
  "taxId": "12-3456789",
  "billingEmail": "billing@acme.com",
  "phone": "+1-415-555-0100",
  "tags": ["enterprise", "tech"],
  "notes": "Key customer since 2023"
}
```

### Sample CRM Contact
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@acme.com",
  "phone": "+1-415-555-0150",
  "jobTitle": "CTO",
  "preferredLanguage": "en",
  "timezone": "America/Los_Angeles",
  "source": "checkout",
  "tags": ["decision-maker", "technical"],
  "notes": "Prefers technical demos"
}
```

### Sample Invoice
```json
{
  "invoiceNumber": "INV-2025-001",
  "status": "sent",
  "issueDate": 1729108800000,
  "dueDate": 1731700800000,
  "currency": "USD",
  "items": [
    {
      "description": "Web Development Services",
      "quantity": 40,
      "unitPrice": 10000,
      "taxRate": 8,
      "total": 400000
    },
    {
      "description": "Annual Hosting",
      "quantity": 1,
      "unitPrice": 29900,
      "total": 29900
    }
  ],
  "subtotal": 429900,
  "taxAmount": 34392,
  "total": 464292,
  "notes": "Thank you for your business!"
}
```

---

**Document Version:** 1.0
**Last Updated:** 2025-10-16
**Status:** ✅ Ready for Review
