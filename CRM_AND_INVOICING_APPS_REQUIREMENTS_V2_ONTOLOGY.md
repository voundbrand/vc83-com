# CRM and Invoicing Apps - Requirements Document v2.0
## 🛤️ Using Ontology System (Gravel Road Approach)

**Date:** 2025-10-16
**Status:** Planning Phase
**Priority:** High
**Architecture:** Universal `objects` table (Palantir-style gravel road)

---

## 🎯 Executive Summary

This document outlines requirements for implementing CRM and Invoicing apps using the **universal ontology system** (objects, objectLinks, objectActions tables). This is the "gravel road" approach - we start with a flexible foundation and pave it later only if needed.

**Key Architectural Decision:**
❌ **NO new tables** - Use existing `objects` table
✅ **Different object types** - `type="crm_contact"`, `type="invoice"`, etc.
✅ **Custom properties** - Per-org flexibility via `customProperties` field
✅ **Graph relationships** - Use `objectLinks` for connections
✅ **Audit trail** - Use `objectActions` for history

---

## 1. Why Ontology? (Gravel Road Philosophy)

### The Palantir Approach
> "Build the gravel road first, pave it later if needed"

**Benefits:**
1. **No schema migrations** - Add fields via `customProperties`
2. **Per-org customization** - Each org can have different fields
3. **Faster development** - Use universal CRUD operations
4. **Graph flexibility** - Link any objects together
5. **Automatic audit** - Built-in action tracking
6. **Future-proof** - Easy to add new entity types

### What We're Building

```
objects table (universal storage)
├── type="crm_organization" → Customer companies
├── type="crm_contact" → Individual contacts
├── type="invoice" → Invoices
└── ... (future: products, quotes, etc.)

objectLinks table (relationships)
├── contact → works_at → organization
├── invoice → billed_to → contact
└── contact → attended → event

objectActions table (audit trail)
├── invoice → sent → by user X at time Y
├── contact → created_from_checkout → checkout ID
└── ... (all actions tracked automatically)
```

---

## 2. Object Type Definitions

### 2.1 CRM Organization Object

**Type:** `crm_organization`
**Subtype:** `customer` | `prospect` | `partner`

```typescript
{
  // In: objects table
  _id: Id<"objects">,

  // Multi-tenancy
  organizationId: Id<"organizations">,  // Platform org that owns this

  // Object identity
  type: "crm_organization",
  subtype: "customer",

  // Universal fields (all objects have these)
  name: "Acme Corporation",
  description: "Technology company in San Francisco",
  status: "active",  // "active", "inactive", "archived"

  // CRM org specific data
  customProperties: {
    website: "https://acme.com",
    industry: "Technology",
    size: "51-200",  // "1-10", "11-50", "51-200", "201-500", "501+"

    address: {
      street: "123 Main St",
      city: "San Francisco",
      state: "CA",
      postalCode: "94102",
      country: "US"
    },

    taxId: "12-3456789",  // VAT/EIN/etc
    billingEmail: "billing@acme.com",
    phone: "+1-415-555-0100",

    tags: ["enterprise", "tech", "west-coast"],
    notes: "Key customer since 2023. Annual contract renewal in Q4.",

    // Custom fields (each org can add their own!)
    customField_accountManager: "Sarah Smith",
    customField_salesRegion: "West",
    customField_annualRevenue: 500000
  },

  // Metadata (automatic)
  createdBy: Id<"users">,
  createdAt: number,
  updatedAt: number
}
```

**Queries:**
```typescript
// Get all CRM organizations for an org
getObjects({
  organizationId: myOrgId,
  type: "crm_organization"
})

// Get only customers (not prospects)
getObjects({
  organizationId: myOrgId,
  type: "crm_organization",
  subtype: "customer"
})

// Search by name
// Uses existing .searchIndex("search_by_name")
```

### 2.2 CRM Contact Object

**Type:** `crm_contact`
**Subtype:** `customer` | `lead` | `prospect`

```typescript
{
  // In: objects table
  _id: Id<"objects">,

  organizationId: Id<"organizations">,

  type: "crm_contact",
  subtype: "customer",

  // Universal fields
  name: "John Doe",  // Full name for display
  description: "CTO at Acme Corporation",
  status: "active",  // "active", "inactive", "unsubscribed"

  // Contact specific data
  customProperties: {
    // Core fields
    firstName: "John",
    lastName: "Doe",
    email: "john.doe@acme.com",
    phone: "+1-415-555-0150",
    jobTitle: "CTO",

    // Preferences
    preferredLanguage: "en",
    timezone: "America/Los_Angeles",
    emailOptIn: true,

    // Address
    address: {
      street: "123 Main St",
      city: "San Francisco",
      state: "CA",
      postalCode: "94102",
      country: "US"
    },

    // Social
    linkedin: "https://linkedin.com/in/johndoe",
    twitter: "@johndoe",

    // Tracking
    source: "checkout",  // "manual", "checkout", "event", "import", "api"
    sourceRef: "checkout_xyz123",  // Link to source

    tags: ["decision-maker", "technical", "active"],
    notes: "Prefers technical demos. Best time to contact: 2-4pm PST.",

    // Optional platform user link
    platformUserId: Id<"users">,  // If they have a platform account

    // Custom fields
    customField_leadScore: 85,
    customField_lastContact: timestamp,
    customField_nextFollowUp: timestamp
  },

  createdBy: Id<"users">,
  createdAt: number,
  updatedAt: number
}
```

**Link contact to organization:**
```typescript
// In: objectLinks table
{
  organizationId: Id<"organizations">,
  fromObjectId: contactObjectId,
  toObjectId: crmOrgObjectId,
  linkType: "works_at",

  properties: {
    jobTitle: "CTO",
    isPrimaryContact: true,
    startDate: timestamp,
    department: "Engineering"
  },

  createdBy: Id<"users">,
  createdAt: timestamp
}
```

### 2.3 Invoice Object

**Type:** `invoice`
**Subtype:** `sales` | `subscription` | `one-time` | `recurring`

```typescript
{
  // In: objects table
  _id: Id<"objects">,

  organizationId: Id<"organizations">,

  type: "invoice",
  subtype: "sales",

  // Universal fields
  name: "INV-2025-001",  // Invoice number (displayed in UI)
  description: "Web development services for Q4 2025",
  status: "sent",  // "draft", "sent", "paid", "overdue", "cancelled", "refunded"

  // Invoice specific data
  customProperties: {
    // Identification
    invoiceNumber: "INV-2025-001",

    // Dates
    issueDate: 1729108800000,
    dueDate: 1731700800000,
    paidAt: 1731500000000,  // When payment received

    // Currency
    currency: "USD",

    // Line items
    items: [
      {
        id: "item_1",
        description: "Web Development Services",
        quantity: 40,
        unitPrice: 10000,  // $100.00 (in cents)
        taxRate: 8,  // 8%
        taxAmount: 32000,  // Calculated
        total: 432000,  // $4,320.00
        productId: Id<"products">  // Optional link to product catalog
      },
      {
        id: "item_2",
        description: "Annual Hosting",
        quantity: 1,
        unitPrice: 29900,  // $299.00
        taxRate: 8,
        taxAmount: 2392,
        total: 32292,
        productId: Id<"products">
      }
    ],

    // Calculations (all in cents)
    subtotal: 429900,  // $4,299.00
    taxAmount: 34392,  // $343.92
    discountAmount: 0,
    total: 464292,  // $4,642.92
    amountPaid: 464292,
    amountDue: 0,

    // Stripe integration
    stripeInvoiceId: "in_xyz123",
    stripeCustomerId: "cus_abc456",
    stripePaymentIntentId: "pi_def789",
    stripeInvoiceUrl: "https://invoice.stripe.com/...",

    // Payment
    paymentMethod: "card",  // "card", "bank_transfer", "check", "cash"
    paymentTerms: "net_30",  // "net_30", "net_60", "net_90", "due_on_receipt"

    // Content
    notes: "Thank you for your business! Please remit payment within 30 days.",
    termsAndConditions: "Payment is due within 30 days of invoice date. Late payments subject to 1.5% monthly interest.",
    footer: "Questions? Contact billing@example.com or call +1-555-0100",

    // Metadata
    tags: ["consulting", "paid", "Q4-2025"],
    internalNotes: "Client was very happy with the work",

    // Custom fields
    customField_poNumber: "PO-2025-456",
    customField_project: "Website Redesign",
    customField_salesRep: "Sarah Smith"
  },

  createdBy: Id<"users">,
  createdAt: number,
  updatedAt: number
}
```

**Link invoice to contact:**
```typescript
// In: objectLinks table
{
  organizationId: Id<"organizations">,
  fromObjectId: invoiceObjectId,
  toObjectId: contactObjectId,
  linkType: "billed_to",

  properties: {
    role: "billing_contact",
    sentAt: timestamp,
    sentVia: "email"
  },

  createdBy: Id<"users">,
  createdAt: timestamp
}
```

**Track invoice actions:**
```typescript
// In: objectActions table

// When invoice is created
{
  organizationId: Id<"organizations">,
  objectId: invoiceObjectId,
  actionType: "created",
  actionData: {
    fromTemplate: false,
    totalAmount: 464292
  },
  performedBy: Id<"users">,
  performedAt: timestamp
}

// When invoice is sent
{
  objectId: invoiceObjectId,
  actionType: "sent",
  actionData: {
    sentTo: "john.doe@acme.com",
    sentVia: "stripe",
    stripeInvoiceId: "in_xyz123",
    previousStatus: "draft"
  },
  performedBy: Id<"users">,
  performedAt: timestamp
}

// When invoice is paid
{
  objectId: invoiceObjectId,
  actionType: "paid",
  actionData: {
    amount: 464292,
    paymentMethod: "card",
    stripePaymentIntentId: "pi_def789",
    paidBy: "john.doe@acme.com"
  },
  performedBy: Id<"users">,  // Or system user for webhooks
  performedAt: timestamp
}
```

---

## 3. Using Existing Ontology Functions

### 3.1 CRUD Operations (Already Built!)

All CRUD operations already exist in `convex/ontologyHelpers.ts`:

```typescript
// CREATE
const contactId = await createObject({
  sessionId,
  organizationId,
  type: "crm_contact",
  subtype: "customer",
  name: "John Doe",
  description: "CTO at Acme",
  status: "active",
  customProperties: {
    firstName: "John",
    lastName: "Doe",
    email: "john@acme.com",
    // ... more fields
  }
});

// READ (single)
const contact = await getObject({ objectId: contactId });

// READ (list)
const allContacts = await getObjects({
  organizationId,
  type: "crm_contact"
});

// READ (filtered)
const customers = await getObjects({
  organizationId,
  type: "crm_contact",
  subtype: "customer"
});

// UPDATE
await updateObject({
  sessionId,
  objectId: contactId,
  updates: {
    status: "inactive",
    customProperties: {
      ...existingProps,
      notes: "Updated notes"
    }
  }
});

// DELETE
await deleteObject({
  sessionId,
  objectId: contactId
});
```

### 3.2 Relationships (objectLinks)

Create new mutations in `convex/crm/relationships.ts`:

```typescript
// Link contact to organization
export const linkContactToOrganization = mutation({
  args: {
    sessionId: v.string(),
    contactId: v.id("objects"),
    organizationId: v.id("objects"),
    jobTitle: v.optional(v.string()),
    isPrimaryContact: v.optional(v.boolean())
  },
  handler: async (ctx, args) => {
    // Validate session
    const session = await validateSession(ctx, args.sessionId);

    // Create link
    return await ctx.db.insert("objectLinks", {
      organizationId: session.organizationId,
      fromObjectId: args.contactId,
      toObjectId: args.organizationId,
      linkType: "works_at",
      properties: {
        jobTitle: args.jobTitle,
        isPrimaryContact: args.isPrimaryContact ?? false
      },
      createdBy: session.userId,
      createdAt: Date.now()
    });
  }
});

// Get contacts for an organization
export const getOrganizationContacts = query({
  args: {
    crmOrganizationId: v.id("objects")
  },
  handler: async (ctx, args) => {
    // Get all links where toObjectId = organization
    const links = await ctx.db
      .query("objectLinks")
      .withIndex("by_to_link_type", q =>
        q.eq("toObjectId", args.crmOrganizationId)
         .eq("linkType", "works_at")
      )
      .collect();

    // Get contact objects
    const contacts = await Promise.all(
      links.map(link => ctx.db.get(link.fromObjectId))
    );

    // Combine contact data with link properties
    return contacts.map((contact, i) => ({
      ...contact,
      relationship: links[i].properties
    }));
  }
});
```

### 3.3 Action Tracking (objectActions)

Create helper in `convex/crm/actions.ts`:

```typescript
// Track any action on any object
export const trackAction = async (
  ctx: MutationCtx,
  args: {
    objectId: Id<"objects">,
    actionType: string,
    actionData?: Record<string, any>,
    performedBy: Id<"users">,
    organizationId: Id<"organizations">
  }
) => {
  return await ctx.db.insert("objectActions", {
    organizationId: args.organizationId,
    objectId: args.objectId,
    actionType: args.actionType,
    actionData: args.actionData,
    performedBy: args.performedBy,
    performedAt: Date.now()
  });
};

// Get action history for an object
export const getObjectHistory = query({
  args: {
    objectId: v.id("objects")
  },
  handler: async (ctx, args) => {
    const actions = await ctx.db
      .query("objectActions")
      .withIndex("by_object", q => q.eq("objectId", args.objectId))
      .order("desc")
      .collect();

    // Enrich with user data
    return await Promise.all(
      actions.map(async (action) => {
        const user = await ctx.db.get(action.performedBy);
        return {
          ...action,
          performedByUser: user
        };
      })
    );
  }
});
```

---

## 4. App-Specific Convex Modules

### 4.1 CRM Module Structure

```
convex/
  crm/
    organizations.ts      # CRM org CRUD (wraps ontologyHelpers)
    contacts.ts          # Contact CRUD (wraps ontologyHelpers)
    relationships.ts     # Link contacts <-> orgs
    search.ts           # Search across CRM data
    imports.ts          # CSV import
    exports.ts          # Data export

  crmIntegrations/
    fromCheckout.ts     # Auto-create from checkout
    fromEvents.ts       # Auto-create from events
    linkToPlatformUser.ts  # Link CRM contact to user
```

**Example: `convex/crm/contacts.ts`**

```typescript
import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { createObject, updateObject, getObjects } from "../ontologyHelpers";

// CREATE CONTACT
export const createContact = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    firstName: v.string(),
    lastName: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    jobTitle: v.optional(v.string()),
    // ... more args
  },
  handler: async (ctx, args) => {
    // Use universal createObject
    return await createObject({
      ...ctx,
      sessionId: args.sessionId,
      organizationId: args.organizationId,
      type: "crm_contact",
      subtype: "customer",
      name: `${args.firstName} ${args.lastName}`,
      description: args.jobTitle || "Contact",
      status: "active",
      customProperties: {
        firstName: args.firstName,
        lastName: args.lastName,
        email: args.email,
        phone: args.phone,
        jobTitle: args.jobTitle,
        source: "manual",
        tags: []
      }
    });
  }
});

// LIST CONTACTS
export const listContacts = query({
  args: {
    organizationId: v.id("organizations"),
    subtype: v.optional(v.string()),  // "customer", "lead", "prospect"
    searchQuery: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    // Use universal getObjects
    let contacts = await getObjects({
      ...ctx,
      organizationId: args.organizationId,
      type: "crm_contact",
      subtype: args.subtype
    });

    // Filter by search query if provided
    if (args.searchQuery) {
      const query = args.searchQuery.toLowerCase();
      contacts = contacts.filter(c =>
        c.name.toLowerCase().includes(query) ||
        c.customProperties?.email?.toLowerCase().includes(query)
      );
    }

    return contacts;
  }
});
```

### 4.2 Invoicing Module Structure

```
convex/
  invoicing/
    invoices.ts         # Invoice CRUD (wraps ontologyHelpers)
    calculations.ts     # Tax, total calculations
    pdf.ts             # PDF generation
    numbering.ts       # Invoice number generation

  invoicingIntegrations/
    stripe.ts          # Sync with Stripe
    payments.ts        # Payment tracking
    webhooks.ts        # Stripe webhook handlers
    autoEnable.ts      # Auto-enable via draft invoice
```

**Example: `convex/invoicing/invoices.ts`**

```typescript
import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { createObject } from "../ontologyHelpers";
import { trackAction } from "../crm/actions";

// CREATE INVOICE
export const createInvoice = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    contactId: v.id("objects"),  // CRM contact
    items: v.array(v.object({
      description: v.string(),
      quantity: v.number(),
      unitPrice: v.number(),
      taxRate: v.optional(v.number())
    })),
    dueDate: v.number(),
    notes: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const session = await validateSession(ctx, args.sessionId);

    // Calculate totals
    const calculations = calculateInvoiceTotals(args.items);

    // Generate invoice number
    const invoiceNumber = await generateInvoiceNumber(ctx, args.organizationId);

    // Create invoice object
    const invoiceId = await createObject({
      ...ctx,
      sessionId: args.sessionId,
      organizationId: args.organizationId,
      type: "invoice",
      subtype: "sales",
      name: invoiceNumber,
      description: `Invoice for ${calculations.total / 100} USD`,
      status: "draft",
      customProperties: {
        invoiceNumber,
        issueDate: Date.now(),
        dueDate: args.dueDate,
        currency: "USD",
        items: args.items.map((item, i) => ({
          id: `item_${i}`,
          ...item,
          total: item.quantity * item.unitPrice
        })),
        ...calculations,
        notes: args.notes,
        tags: []
      }
    });

    // Link invoice to contact
    await ctx.db.insert("objectLinks", {
      organizationId: args.organizationId,
      fromObjectId: invoiceId,
      toObjectId: args.contactId,
      linkType: "billed_to",
      properties: { role: "billing_contact" },
      createdBy: session.userId,
      createdAt: Date.now()
    });

    // Track creation action
    await trackAction(ctx, {
      objectId: invoiceId,
      actionType: "created",
      actionData: { totalAmount: calculations.total },
      performedBy: session.userId,
      organizationId: args.organizationId
    });

    return invoiceId;
  }
});
```

---

## 5. Integration Points

### 5.1 Auto-Create from Checkout

**File:** `convex/crmIntegrations/fromCheckout.ts`

```typescript
export const createContactFromCheckout = mutation({
  args: {
    organizationId: v.id("organizations"),
    checkoutId: v.id("checkouts"),  // Or whatever your checkout table is
    customerInfo: v.object({
      firstName: v.string(),
      lastName: v.string(),
      email: v.string(),
      phone: v.optional(v.string())
    })
  },
  handler: async (ctx, args) => {
    // Check if contact already exists by email
    const existingContacts = await getObjects({
      ...ctx,
      organizationId: args.organizationId,
      type: "crm_contact",
      filters: {
        "customProperties.email": args.customerInfo.email
      }
    });

    if (existingContacts.length > 0) {
      // Contact exists, just return it
      return existingContacts[0]._id;
    }

    // Create new contact
    const contactId = await createObject({
      ...ctx,
      sessionId: "system",  // System-generated
      organizationId: args.organizationId,
      type: "crm_contact",
      subtype: "customer",
      name: `${args.customerInfo.firstName} ${args.customerInfo.lastName}`,
      description: "Customer from checkout",
      status: "active",
      customProperties: {
        ...args.customerInfo,
        source: "checkout",
        sourceRef: args.checkoutId,
        tags: ["customer", "checkout"],
        createdFromCheckout: true
      }
    });

    // Track the action
    await trackAction(ctx, {
      objectId: contactId,
      actionType: "created_from_checkout",
      actionData: { checkoutId: args.checkoutId },
      performedBy: "system",  // System user
      organizationId: args.organizationId
    });

    return contactId;
  }
});
```

**Hook into checkout flow:** In your existing checkout completion mutation, add:

```typescript
// After successful payment
const contactId = await ctx.runMutation(
  internal.crmIntegrations.fromCheckout.createContactFromCheckout,
  {
    organizationId,
    checkoutId: checkout._id,
    customerInfo: {
      firstName: checkout.customerInfo.firstName,
      lastName: checkout.customerInfo.lastName,
      email: checkout.customerInfo.email,
      phone: checkout.customerInfo.phone
    }
  }
);

// Store contactId in transaction for reference
await ctx.db.patch(transaction._id, {
  crmContactId: contactId
});
```

### 5.2 Auto-Enable Stripe Invoicing

**File:** `convex/invoicingIntegrations/autoEnable.ts`

```typescript
export const autoEnableStripeInvoicing = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations")
  },
  handler: async (ctx, args) => {
    const session = await validateSession(ctx, args.sessionId);

    // 1. Create system contact (if not exists)
    let systemContact = await getObjects({
      ...ctx,
      organizationId: args.organizationId,
      type: "crm_contact",
      filters: { "customProperties.email": "system@internal.local" }
    });

    if (systemContact.length === 0) {
      const contactId = await createObject({
        ...ctx,
        sessionId: args.sessionId,
        organizationId: args.organizationId,
        type: "crm_contact",
        subtype: "system",
        name: "System Contact",
        description: "Internal system contact for setup",
        status: "active",
        customProperties: {
          firstName: "System",
          lastName: "Contact",
          email: "system@internal.local",
          source: "system",
          tags: ["system", "internal"]
        }
      });
      systemContact = [{ _id: contactId }];
    }

    // 2. Create draft invoice
    const invoiceId = await createObject({
      ...ctx,
      sessionId: args.sessionId,
      organizationId: args.organizationId,
      type: "invoice",
      subtype: "setup",
      name: "SETUP-DRAFT",
      description: "Initial setup invoice (draft)",
      status: "draft",
      customProperties: {
        invoiceNumber: "SETUP-DRAFT-001",
        issueDate: Date.now(),
        dueDate: Date.now() + (30 * 24 * 60 * 60 * 1000),  // 30 days
        currency: "USD",
        items: [{
          id: "item_1",
          description: "Initial invoice setup (draft - can be deleted)",
          quantity: 1,
          unitPrice: 100,  // $1.00
          total: 100
        }],
        subtotal: 100,
        taxAmount: 0,
        total: 100,
        amountPaid: 0,
        amountDue: 100,
        notes: "This is a setup invoice created to enable Stripe Invoicing. You can safely delete this draft.",
        tags: ["setup", "draft", "system"]
      }
    });

    // 3. Link invoice to system contact
    await ctx.db.insert("objectLinks", {
      organizationId: args.organizationId,
      fromObjectId: invoiceId,
      toObjectId: systemContact[0]._id,
      linkType: "billed_to",
      properties: { role: "system" },
      createdBy: session.userId,
      createdAt: Date.now()
    });

    // 4. Sync to Stripe
    await ctx.scheduler.runAfter(0, internal.invoicingIntegrations.stripe.syncToStripe, {
      invoiceId,
      organizationId: args.organizationId
    });

    // 5. Mark invoicing as enabled
    await ctx.runMutation(
      internal.organizationInvoiceSettings.syncInvoiceSettingsFromStripe,
      {
        organizationId: args.organizationId,
        stripeInvoiceSettings: {
          defaultCollectionMethod: "send_invoice",
          defaultPaymentTerms: "net_30",
          defaultAutoAdvance: true,
          defaultDaysUntilDue: 30
        }
      }
    );

    return { invoiceId, success: true };
  }
});
```

---

## 6. RBAC Permissions (Unchanged)

Same permissions structure as before, but now applies to objects:

```typescript
// Check permission before CRUD
const hasPermission = await checkPermission(ctx, {
  userId: session.userId,
  resource: "crm",  // or "invoices"
  action: "create"
});

if (!hasPermission) {
  throw new Error("Permission denied");
}
```

---

## 7. UI Components (Unchanged)

Same retro desktop UI, but queries use object types:

```typescript
// In CRM window component
const contacts = useQuery(api.crm.contacts.listContacts, {
  organizationId: myOrgId,
  subtype: "customer"
});

// In Invoices window
const invoices = useQuery(api.ontologyHelpers.getObjects, {
  organizationId: myOrgId,
  type: "invoice"
});
```

---

## 8. Implementation Phases (Updated)

### Phase 1: CRM Foundation (Week 1)
**Goal:** Basic CRM using ontology

**Tasks:**
1. ✅ No new tables needed! (objects table exists)
2. Create `convex/crm/` modules
3. Wrap `ontologyHelpers` for CRM-specific operations
4. Build UI components
5. Test CRUD operations

**Deliverables:**
- ✅ Create/edit/view CRM organizations
- ✅ Create/edit/view CRM contacts
- ✅ Link contacts to organizations
- ✅ Search and filter

### Phase 2: CRM Integration (Week 2)
**Goal:** Auto-populate from checkout and events

**Tasks:**
1. Create `convex/crmIntegrations/` modules
2. Hook into checkout completion
3. Hook into event registration
4. Contact history view

**Deliverables:**
- ✅ Checkout auto-creates contacts
- ✅ Events auto-create contacts
- ✅ View contact history (actions)

### Phase 3: Invoicing Foundation (Week 3)
**Goal:** Basic invoicing using ontology

**Tasks:**
1. Create `convex/invoicing/` modules
2. Invoice CRUD using objects table
3. Line items calculation
4. UI components

**Deliverables:**
- ✅ Create/edit invoices
- ✅ Line items management
- ✅ Auto-calculate totals

### Phase 4: Stripe Integration (Week 4)
**Goal:** Sync with Stripe

**Tasks:**
1. Stripe customer creation
2. Stripe invoice sync
3. Webhook handlers
4. Auto-enable via draft invoice

**Deliverables:**
- ✅ Send invoices to Stripe
- ✅ Track payments via webhooks
- ✅ One-click enable

### Phase 5: Polish (Week 5)
**Goal:** Production ready

**Tasks:**
1. CSV import/export
2. Bulk operations
3. Reporting
4. Testing

---

## 9. Benefits of Ontology Approach

### Immediate Benefits
1. **No schema migrations** - Start coding immediately
2. **Flexible schema** - Add fields without DB changes
3. **Per-org customization** - Each org can have unique fields
4. **Universal operations** - One set of CRUD functions
5. **Built-in relationships** - objectLinks handles all connections
6. **Automatic audit** - objectActions tracks everything

### Future Benefits
1. **Easy to extend** - Add new object types without new tables
2. **Graph queries** - Traverse relationships easily
3. **Cross-type queries** - Query across all objects
4. **Analytics** - Aggregate across object types
5. **AI-ready** - Flexible schema perfect for AI features

### Development Speed
- **Week 1:** CRM working (vs 2 weeks with new tables)
- **Week 2:** Integrations done (vs 3 weeks)
- **Week 3:** Invoicing working (vs 4 weeks)
- **Total:** 5 weeks vs 8 weeks traditional approach

---

## 10. Migration Path (If Needed)

If we need to optimize later:

```typescript
// Create specialized indexes
objects
  .index("by_org_type_email", [
    "organizationId",
    "type",
    "customProperties.email"  // If Convex supports this
  ])

// Or create materialized views
crm_contacts_view: computed from objects where type="crm_contact"
```

But start with gravel road first!

---

## Appendix: Quick Reference

### Object Types
- `crm_organization` - Customer companies
- `crm_contact` - Individual contacts
- `invoice` - Invoices

### Link Types
- `works_at` - Contact → Organization
- `billed_to` - Invoice → Contact
- `attended` - Contact → Event

### Action Types
- `created` - Object created
- `created_from_checkout` - Contact from checkout
- `created_from_event` - Contact from event
- `sent` - Invoice sent
- `paid` - Invoice paid
- `cancelled` - Invoice cancelled

### Status Values
**CRM Organization:** `active`, `inactive`, `archived`
**CRM Contact:** `active`, `inactive`, `unsubscribed`
**Invoice:** `draft`, `sent`, `paid`, `overdue`, `cancelled`, `refunded`

---

**Document Version:** 2.0
**Architecture:** Universal Objects (Gravel Road)
**Last Updated:** 2025-10-16
**Status:** ✅ Ready for Implementation
