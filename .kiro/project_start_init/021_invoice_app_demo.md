# Task 018: Demo Invoice App (app_invoice83) - Private-Tool Testing

## Overview

Create a demo invoicing application to validate the private-tool app architecture from Phase 3. This app will demonstrate data isolation between organizations, paid app installation, and Stripe Connect integration. The app allows organizations to invoice customers (B2C and B2B) through our platform.

**Parent Task**: 017_phase3_refactor.md  
**Estimated Time**: 2-3 days  
**Priority**: High - Needed to validate private-tool app pattern  
**Approach**: Mock data first, then integrate Stripe Connect

---

## Why This Demo App?

**Problem**: We need to validate that private-tool apps work correctly:
- ✅ Data isolation between organizations
- ✅ Paid app installation flow
- ✅ Stripe Connect integration pattern
- ✅ B2C and B2B invoicing scenarios

**Solution**: Build a real invoicing app that showcases all private-tool features while being useful for testing.

---

## Success Criteria

### Phase 1: Mock Data (Days 1-2)
- [ ] App registered in DEFAULT_APPS as paid app ($19.99/month)
- [ ] Invoice schema with proper data isolation
- [ ] CRUD operations with organization-scoped data
- [ ] Mock customer management
- [ ] Mock invoice generation and PDF creation
- [ ] Security tests validate data isolation between orgs
- [ ] Basic UI component for invoice management

### Phase 2: Stripe Connect (Day 3)
- [ ] Stripe Connect onboarding flow
- [ ] Real payment processing for invoices
- [ ] Webhook handling for payment events
- [ ] Invoice status updates based on payments
- [ ] Transaction history and reporting

---

## App Specification

### App Metadata
```typescript
{
  code: "app_invoice83",
  name: "Invoice83",
  description: "Professional invoicing for B2C and B2B with Stripe Connect",
  icon: "📄",
  category: "finance",
  plans: ["business", "enterprise"],
  appType: "private-tool",
  dataScope: "installer-owned",
  price: 1999, // $19.99/month
  priceCurrency: "usd",
  billingType: "subscription",
  version: "1.0.0",
  isActive: true,
}
```

### Feature Set

**Core Features (Phase 1 - Mock)**:
1. Customer management (B2C and B2B contacts)
2. Invoice creation with line items
3. Invoice templates and customization
4. PDF generation (mock)
5. Invoice status tracking (draft, sent, paid, overdue)
6. Basic reporting (revenue, outstanding)

**Advanced Features (Phase 2 - Stripe)**:
1. Stripe Connect account setup
2. Payment processing via Stripe
3. Automatic invoice status updates
4. Payment reminders
5. Transaction history
6. Webhook event handling

---

## Data Model (Phase 1)

### Schema Updates

**File**: `convex/schema.ts`

```typescript
// Invoice Customers (scoped to installer org)
invoiceCustomers: defineTable({
  organizationId: v.id("organizations"), // Installer org
  appId: v.id("apps"), // app_invoice83
  
  // Customer info
  type: v.union(
    v.literal("individual"), // B2C
    v.literal("business")    // B2B
  ),
  name: v.string(),
  email: v.string(),
  phone: v.optional(v.string()),
  
  // B2B fields
  businessName: v.optional(v.string()),
  taxId: v.optional(v.string()),
  
  // Address
  address: v.optional(v.object({
    street: v.string(),
    city: v.string(),
    state: v.string(),
    zip: v.string(),
    country: v.string(),
  })),
  
  // Metadata
  notes: v.optional(v.string()),
  isActive: v.boolean(),
  
  // Audit
  createdBy: v.id("users"),
  createdAt: v.number(),
  updatedBy: v.id("users"),
  updatedAt: v.number(),
})
  .index("by_org", ["organizationId"])
  .index("by_org_and_app", ["organizationId", "appId"])
  .index("by_email", ["email"])
  .index("by_org_and_email", ["organizationId", "email"]),

// Invoices (scoped to installer org)
invoices: defineTable({
  organizationId: v.id("organizations"), // Installer org
  appId: v.id("apps"), // app_invoice83
  customerId: v.id("invoiceCustomers"),
  
  // Invoice details
  invoiceNumber: v.string(), // Auto-generated: INV-2025-0001
  invoiceDate: v.string(), // ISO date
  dueDate: v.string(), // ISO date
  
  // Line items
  items: v.array(v.object({
    description: v.string(),
    quantity: v.number(),
    unitPrice: v.number(), // In cents
    amount: v.number(), // quantity * unitPrice
  })),
  
  // Totals
  subtotal: v.number(), // In cents
  taxRate: v.optional(v.number()), // Percentage (e.g., 19 for 19%)
  taxAmount: v.optional(v.number()), // In cents
  total: v.number(), // In cents
  
  // Currency
  currency: v.string(), // "usd", "eur", etc.
  
  // Status
  status: v.union(
    v.literal("draft"),
    v.literal("sent"),
    v.literal("paid"),
    v.literal("overdue"),
    v.literal("cancelled")
  ),
  
  // Payment tracking (Phase 2 - Stripe)
  stripePaymentIntentId: v.optional(v.string()),
  paidAt: v.optional(v.number()),
  paymentMethod: v.optional(v.string()), // "card", "bank_transfer", etc.
  
  // Notes
  notes: v.optional(v.string()),
  internalNotes: v.optional(v.string()),
  
  // Audit
  createdBy: v.id("users"),
  createdAt: v.number(),
  updatedBy: v.id("users"),
  updatedAt: v.number(),
  sentAt: v.optional(v.number()),
})
  .index("by_org", ["organizationId"])
  .index("by_org_and_app", ["organizationId", "appId"])
  .index("by_customer", ["customerId"])
  .index("by_invoice_number", ["invoiceNumber"])
  .index("by_status", ["status"])
  .index("by_org_and_status", ["organizationId", "status"]),

// Stripe Connect Accounts (Phase 2)
invoiceStripeAccounts: defineTable({
  organizationId: v.id("organizations"), // Installer org
  appId: v.id("apps"), // app_invoice83
  
  stripeAccountId: v.string(), // Stripe Connect account ID
  stripeAccountStatus: v.union(
    v.literal("pending"),
    v.literal("complete"),
    v.literal("restricted"),
    v.literal("disabled")
  ),
  
  // Settings
  defaultCurrency: v.string(),
  isActive: v.boolean(),
  
  // Audit
  createdBy: v.id("users"),
  createdAt: v.number(),
  updatedBy: v.id("users"),
  updatedAt: v.number(),
})
  .index("by_org", ["organizationId"])
  .index("by_stripe_account", ["stripeAccountId"]),
```

---

## Implementation Plan

### Phase 1: Mock Data Foundation (Days 1-2)

#### Day 1: Backend Foundation
**Files to Create/Modify**:
1. `convex/schema.ts` - Add invoice tables
2. `convex/modules/invoicing/customers.ts` - Customer CRUD
3. `convex/modules/invoicing/invoices.ts` - Invoice CRUD
4. `convex/modules/invoicing/helpers.ts` - Calculation helpers
5. `convex/apps.ts` - Add app_invoice83 to DEFAULT_APPS

**Customer Management**:
```typescript
// convex/modules/invoicing/customers.ts
import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { requireAppInstalled, requireAuth } from "../../helpers";

// Create customer
export const createCustomer = mutation({
  args: {
    type: v.union(v.literal("individual"), v.literal("business")),
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    businessName: v.optional(v.string()),
    taxId: v.optional(v.string()),
    address: v.optional(v.object({
      street: v.string(),
      city: v.string(),
      state: v.string(),
      zip: v.string(),
      country: v.string(),
    })),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user, organization } = await requireAuth(ctx);
    
    // Find app_invoice83
    const app = await ctx.db.query("apps")
      .withIndex("by_code", q => q.eq("code", "app_invoice83"))
      .first();
    if (!app) throw new Error("Invoice app not found");
    
    // Verify app is installed
    await requireAppInstalled(ctx, organization._id, app._id);
    
    // Check for duplicate email
    const existing = await ctx.db.query("invoiceCustomers")
      .withIndex("by_org_and_email", q => 
        q.eq("organizationId", organization._id).eq("email", args.email)
      )
      .first();
    if (existing) throw new Error("Customer with this email already exists");
    
    // Create customer
    const customerId = await ctx.db.insert("invoiceCustomers", {
      organizationId: organization._id,
      appId: app._id,
      type: args.type,
      name: args.name,
      email: args.email,
      phone: args.phone,
      businessName: args.businessName,
      taxId: args.taxId,
      address: args.address,
      notes: args.notes,
      isActive: true,
      createdBy: user._id,
      createdAt: Date.now(),
      updatedBy: user._id,
      updatedAt: Date.now(),
    });
    
    // Audit log
    await ctx.db.insert("auditLogs", {
      organizationId: organization._id,
      userId: user._id,
      action: "customer.create",
      resourceType: "invoiceCustomer",
      resourceId: customerId,
      details: { customerEmail: args.email, customerType: args.type },
      timestamp: Date.now(),
    });
    
    return customerId;
  },
});

// List customers (scoped to org)
export const listCustomers = query({
  args: {
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, { isActive }) => {
    const { user, organization } = await requireAuth(ctx);
    
    const app = await ctx.db.query("apps")
      .withIndex("by_code", q => q.eq("code", "app_invoice83"))
      .first();
    if (!app) return [];
    
    await requireAppInstalled(ctx, organization._id, app._id);
    
    let query = ctx.db.query("invoiceCustomers")
      .withIndex("by_org_and_app", q => 
        q.eq("organizationId", organization._id).eq("appId", app._id)
      );
    
    if (isActive !== undefined) {
      query = query.filter(q => q.eq(q.field("isActive"), isActive));
    }
    
    return await query.collect();
  },
});

// Similar for updateCustomer, deleteCustomer, getCustomer
```

**Invoice Management**:
```typescript
// convex/modules/invoicing/invoices.ts
import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { requireAppInstalled, requireAuth } from "../../helpers";
import { generateInvoiceNumber, calculateTotals } from "./helpers";

// Create invoice
export const createInvoice = mutation({
  args: {
    customerId: v.id("invoiceCustomers"),
    invoiceDate: v.string(),
    dueDate: v.string(),
    items: v.array(v.object({
      description: v.string(),
      quantity: v.number(),
      unitPrice: v.number(),
      amount: v.number(),
    })),
    taxRate: v.optional(v.number()),
    currency: v.string(),
    notes: v.optional(v.string()),
    internalNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user, organization } = await requireAuth(ctx);
    
    const app = await ctx.db.query("apps")
      .withIndex("by_code", q => q.eq("code", "app_invoice83"))
      .first();
    if (!app) throw new Error("Invoice app not found");
    
    await requireAppInstalled(ctx, organization._id, app._id);
    
    // Verify customer belongs to org
    const customer = await ctx.db.get(args.customerId);
    if (!customer || customer.organizationId !== organization._id) {
      throw new Error("Customer not found or access denied");
    }
    
    // Calculate totals
    const { subtotal, taxAmount, total } = calculateTotals(
      args.items,
      args.taxRate
    );
    
    // Generate invoice number
    const invoiceNumber = await generateInvoiceNumber(ctx, organization._id);
    
    // Create invoice
    const invoiceId = await ctx.db.insert("invoices", {
      organizationId: organization._id,
      appId: app._id,
      customerId: args.customerId,
      invoiceNumber,
      invoiceDate: args.invoiceDate,
      dueDate: args.dueDate,
      items: args.items,
      subtotal,
      taxRate: args.taxRate,
      taxAmount,
      total,
      currency: args.currency,
      status: "draft",
      notes: args.notes,
      internalNotes: args.internalNotes,
      createdBy: user._id,
      createdAt: Date.now(),
      updatedBy: user._id,
      updatedAt: Date.now(),
    });
    
    // Audit log
    await ctx.db.insert("auditLogs", {
      organizationId: organization._id,
      userId: user._id,
      action: "invoice.create",
      resourceType: "invoice",
      resourceId: invoiceId,
      details: { 
        invoiceNumber, 
        customerId: args.customerId,
        total 
      },
      timestamp: Date.now(),
    });
    
    return invoiceId;
  },
});

// List invoices (scoped to org)
export const listInvoices = query({
  args: {
    status: v.optional(v.union(
      v.literal("draft"),
      v.literal("sent"),
      v.literal("paid"),
      v.literal("overdue"),
      v.literal("cancelled")
    )),
    customerId: v.optional(v.id("invoiceCustomers")),
  },
  handler: async (ctx, { status, customerId }) => {
    const { user, organization } = await requireAuth(ctx);
    
    const app = await ctx.db.query("apps")
      .withIndex("by_code", q => q.eq("code", "app_invoice83"))
      .first();
    if (!app) return [];
    
    await requireAppInstalled(ctx, organization._id, app._id);
    
    let query = ctx.db.query("invoices")
      .withIndex("by_org_and_app", q => 
        q.eq("organizationId", organization._id).eq("appId", app._id)
      );
    
    if (status) {
      query = query.filter(q => q.eq(q.field("status"), status));
    }
    
    if (customerId) {
      query = query.filter(q => q.eq(q.field("customerId"), customerId));
    }
    
    return await query.order("desc").collect();
  },
});

// Send invoice (change status)
export const sendInvoice = mutation({
  args: { invoiceId: v.id("invoices") },
  handler: async (ctx, { invoiceId }) => {
    const { user, organization } = await requireAuth(ctx);
    
    const invoice = await ctx.db.get(invoiceId);
    if (!invoice || invoice.organizationId !== organization._id) {
      throw new Error("Invoice not found or access denied");
    }
    
    if (invoice.status !== "draft") {
      throw new Error("Only draft invoices can be sent");
    }
    
    await ctx.db.patch(invoiceId, {
      status: "sent",
      sentAt: Date.now(),
      updatedBy: user._id,
      updatedAt: Date.now(),
    });
    
    // Audit log
    await ctx.db.insert("auditLogs", {
      organizationId: organization._id,
      userId: user._id,
      action: "invoice.send",
      resourceType: "invoice",
      resourceId: invoiceId,
      details: { invoiceNumber: invoice.invoiceNumber },
      timestamp: Date.now(),
    });
    
    // TODO Phase 2: Send email to customer with payment link
    
    return invoiceId;
  },
});

// Mark as paid (mock for Phase 1)
export const markInvoiceAsPaid = mutation({
  args: { 
    invoiceId: v.id("invoices"),
    paymentMethod: v.optional(v.string()),
  },
  handler: async (ctx, { invoiceId, paymentMethod }) => {
    const { user, organization } = await requireAuth(ctx);
    
    const invoice = await ctx.db.get(invoiceId);
    if (!invoice || invoice.organizationId !== organization._id) {
      throw new Error("Invoice not found or access denied");
    }
    
    if (invoice.status === "paid") {
      throw new Error("Invoice is already paid");
    }
    
    await ctx.db.patch(invoiceId, {
      status: "paid",
      paidAt: Date.now(),
      paymentMethod: paymentMethod || "manual",
      updatedBy: user._id,
      updatedAt: Date.now(),
    });
    
    // Audit log
    await ctx.db.insert("auditLogs", {
      organizationId: organization._id,
      userId: user._id,
      action: "invoice.paid",
      resourceType: "invoice",
      resourceId: invoiceId,
      details: { 
        invoiceNumber: invoice.invoiceNumber,
        paymentMethod 
      },
      timestamp: Date.now(),
    });
    
    return invoiceId;
  },
});

// Similar for updateInvoice, deleteInvoice, getInvoice, cancelInvoice
```

**Helper Functions**:
```typescript
// convex/modules/invoicing/helpers.ts
import { QueryCtx, MutationCtx } from "../../_generated/server";
import { Id } from "../../_generated/dataModel";

export function calculateTotals(
  items: Array<{ quantity: number; unitPrice: number; amount: number }>,
  taxRate?: number
): { subtotal: number; taxAmount: number; total: number } {
  const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
  const taxAmount = taxRate ? Math.round(subtotal * (taxRate / 100)) : 0;
  const total = subtotal + taxAmount;
  
  return { subtotal, taxAmount, total };
}

export async function generateInvoiceNumber(
  ctx: MutationCtx,
  organizationId: Id<"organizations">
): Promise<string> {
  const year = new Date().getFullYear();
  
  // Find last invoice for this org this year
  const invoices = await ctx.db.query("invoices")
    .withIndex("by_org", q => q.eq("organizationId", organizationId))
    .filter(q => q.gte(q.field("invoiceNumber"), `INV-${year}-`))
    .order("desc")
    .take(1);
  
  let nextNumber = 1;
  if (invoices.length > 0) {
    const lastNumber = parseInt(invoices[0].invoiceNumber.split("-")[2]);
    nextNumber = lastNumber + 1;
  }
  
  return `INV-${year}-${String(nextNumber).padStart(4, "0")}`;
}

export function isInvoiceOverdue(invoice: {
  dueDate: string;
  status: "draft" | "sent" | "paid" | "overdue" | "cancelled";
}): boolean {
  if (invoice.status === "paid" || invoice.status === "cancelled") {
    return false;
  }
  
  const dueDate = new Date(invoice.dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return dueDate < today;
}
```

#### Day 2: Testing & Security Validation
**Files to Create**:
1. `convex/tests/invoicing.test.ts` - Data isolation tests
2. `convex/tests/invoicing-customers.test.ts` - Customer CRUD tests
3. `convex/tests/invoicing-calculations.test.ts` - Invoice calculation tests

**Test Scenarios**:
```typescript
// convex/tests/invoicing.test.ts
import { convexTest } from "convex-test";
import { expect, test, describe } from "vitest";
import schema from "../schema";
import { setupTestOrgs } from "./helpers";

describe("Invoice App - Data Isolation", () => {
  test("Org A cannot see Org B's customers", async () => {
    const t = convexTest(schema);
    const { orgA, orgB, userA, userB } = await setupTestOrgs(t);
    
    // Org A creates customer
    const customerA = await t
      .withIdentity({ email: userA.email })
      .mutation("modules/invoicing/customers:createCustomer", {
        type: "individual",
        name: "Customer A",
        email: "customer-a@example.com",
      });
    
    // Org B tries to list customers
    const customersB = await t
      .withIdentity({ email: userB.email })
      .query("modules/invoicing/customers:listCustomers", {});
    
    // Org B should not see Org A's customer
    expect(customersB).toHaveLength(0);
  });
  
  test("Org A cannot access Org B's invoices", async () => {
    const t = convexTest(schema);
    const { orgA, orgB, userA, userB } = await setupTestOrgs(t);
    
    // Org B creates customer and invoice
    const customerB = await t
      .withIdentity({ email: userB.email })
      .mutation("modules/invoicing/customers:createCustomer", {
        type: "business",
        name: "Company B",
        email: "company-b@example.com",
      });
    
    const invoiceB = await t
      .withIdentity({ email: userB.email })
      .mutation("modules/invoicing/invoices:createInvoice", {
        customerId: customerB,
        invoiceDate: "2025-10-01",
        dueDate: "2025-10-31",
        items: [{ description: "Service", quantity: 1, unitPrice: 10000, amount: 10000 }],
        currency: "usd",
      });
    
    // Org A tries to access invoice
    await expect(
      t.withIdentity({ email: userA.email })
        .query("modules/invoicing/invoices:getInvoice", { invoiceId: invoiceB })
    ).rejects.toThrow("access denied");
  });
  
  test("Invoice numbers are unique per org", async () => {
    const t = convexTest(schema);
    const { orgA, orgB, userA, userB } = await setupTestOrgs(t);
    
    // Both orgs create customers
    const customerA = await t
      .withIdentity({ email: userA.email })
      .mutation("modules/invoicing/customers:createCustomer", {
        type: "individual",
        name: "Customer A",
        email: "customer-a@example.com",
      });
    
    const customerB = await t
      .withIdentity({ email: userB.email })
      .mutation("modules/invoicing/customers:createCustomer", {
        type: "individual",
        name: "Customer B",
        email: "customer-b@example.com",
      });
    
    // Both orgs create invoices
    const invoiceA1 = await t
      .withIdentity({ email: userA.email })
      .mutation("modules/invoicing/invoices:createInvoice", {
        customerId: customerA,
        invoiceDate: "2025-10-01",
        dueDate: "2025-10-31",
        items: [{ description: "Service A", quantity: 1, unitPrice: 10000, amount: 10000 }],
        currency: "usd",
      });
    
    const invoiceB1 = await t
      .withIdentity({ email: userB.email })
      .mutation("modules/invoicing/invoices:createInvoice", {
        customerId: customerB,
        invoiceDate: "2025-10-01",
        dueDate: "2025-10-31",
        items: [{ description: "Service B", quantity: 1, unitPrice: 20000, amount: 20000 }],
        currency: "usd",
      });
    
    // Both should have INV-2025-0001
    const invoiceAData = await t.query("modules/invoicing/invoices:getInvoice", { invoiceId: invoiceA1 });
    const invoiceBData = await t.query("modules/invoicing/invoices:getInvoice", { invoiceId: invoiceB1 });
    
    expect(invoiceAData.invoiceNumber).toBe("INV-2025-0001");
    expect(invoiceBData.invoiceNumber).toBe("INV-2025-0001");
  });
  
  test("Only org members can create invoices for their org", async () => {
    const t = convexTest(schema);
    const { orgA, userB } = await setupTestOrgs(t);
    
    // User B (from Org B) tries to create customer for Org A
    await expect(
      t.withIdentity({ email: userB.email })
        .mutation("modules/invoicing/customers:createCustomer", {
          type: "individual",
          name: "Hacker Customer",
          email: "hacker@example.com",
        })
    ).rejects.toThrow("not installed");
  });
});

describe("Invoice Calculations", () => {
  test("Calculate totals correctly with tax", async () => {
    const t = convexTest(schema);
    const { userA } = await setupTestOrgs(t);
    
    const customer = await t
      .withIdentity({ email: userA.email })
      .mutation("modules/invoicing/customers:createCustomer", {
        type: "business",
        name: "Test Company",
        email: "test@example.com",
      });
    
    const invoice = await t
      .withIdentity({ email: userA.email })
      .mutation("modules/invoicing/invoices:createInvoice", {
        customerId: customer,
        invoiceDate: "2025-10-01",
        dueDate: "2025-10-31",
        items: [
          { description: "Item 1", quantity: 2, unitPrice: 5000, amount: 10000 },
          { description: "Item 2", quantity: 1, unitPrice: 3000, amount: 3000 },
        ],
        taxRate: 19, // 19% tax
        currency: "eur",
      });
    
    const invoiceData = await t.query("modules/invoicing/invoices:getInvoice", { invoiceId: invoice });
    
    expect(invoiceData.subtotal).toBe(13000); // 130.00 EUR
    expect(invoiceData.taxAmount).toBe(2470); // 24.70 EUR (19% of 130.00)
    expect(invoiceData.total).toBe(15470); // 154.70 EUR
  });
});
```

---

### Phase 2: Stripe Connect Integration (Day 3)

**Implementation Details**: TBD after Phase 1 validation

**Key Features**:
1. Stripe Connect onboarding
2. Payment intent creation
3. Webhook handling
4. Transaction reconciliation

---

## UI Component (Basic)

**File**: `components/apps/invoice-manager.tsx`

```typescript
// Basic invoice manager window
export function InvoiceManager() {
  // TODO: Implement after backend validation
  return (
    <div className="p-4">
      <h2>Invoice Manager</h2>
      {/* Customer list, invoice creation form, etc. */}
    </div>
  );
}
```

---

## Testing Checklist

### Backend Tests
- [ ] Customer CRUD operations
- [ ] Invoice CRUD operations
- [ ] Data isolation between orgs
- [ ] Invoice number generation
- [ ] Tax calculations
- [ ] Status transitions (draft → sent → paid)
- [ ] Audit logging

### Security Tests
- [ ] Cross-org data access prevention
- [ ] App installation requirement enforcement
- [ ] User authentication checks
- [ ] Customer email uniqueness per org

### Manual Tests
- [ ] Create customers (B2C and B2B)
- [ ] Create invoices with multiple line items
- [ ] Send invoices
- [ ] Mark invoices as paid
- [ ] View invoice list with filters

---

## Definition of Done (Phase 1)

- [ ] All schema tables created
- [ ] All backend mutations/queries implemented
- [ ] All security tests passing (8+ tests)
- [ ] TypeScript checks pass (0 errors)
- [ ] Lint checks pass (0 new issues)
- [ ] App registered in DEFAULT_APPS
- [ ] Documentation complete

---

## Notes

**Why This Matters**:
- Validates the entire private-tool app architecture
- Demonstrates data isolation patterns
- Provides real testing ground for paid apps
- Useful for future app developers as reference

**Scope Control**:
- Phase 1 focuses on mock data and backend validation
- Phase 2 (Stripe) can wait until we validate Phase 1 works
- UI can be minimal for now (just enough to test backend)

**Related Tasks**:
- Task 017: Phase 3 refactor (parent)
- Task 019: Desktop UI (will use this app)
- Task 020: App Store & Stripe (will integrate payments)
