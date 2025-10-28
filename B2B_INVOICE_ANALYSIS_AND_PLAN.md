# B2B Consolidated Invoice Analysis & Implementation Plan

## Current State Analysis

### ✅ What We Have

1. **Invoice Template System** (`pdfTemplates.ts`)
   - `b2b_consolidated` template (basic)
   - `b2b_consolidated_detailed` template (with per-employee breakdown)
   - Templates support showing base price + addons for each employee

2. **Consolidated Invoice Creation** (`invoicingOntology.ts:347`)
   - `createConsolidatedInvoice` mutation exists
   - Takes multiple ticket IDs and creates one invoice
   - Links invoice to CRM organization (employer)

3. **Invoice Viewing UI** (`invoicing-window/index.tsx`)
   - Lists all invoices
   - View button now works (just implemented)
   - Shows invoice details in modal

4. **Automatic Invoice Creation During Checkout** (`paymentProviders/invoice.ts:305`)
   - Creates consolidated invoice automatically when using invoice checkout provider
   - Generates tickets immediately
   - Links to employer organization

### ❌ What's Missing/Broken

#### 1. **CRM Contact Not Created** ⚠️ CRITICAL
**Problem**: Line items show "Event - Unbekannter Kontakt" (Unknown Contact)

**Root Cause**:
- Invoice provider creates tickets at `invoice.ts:207-230`
- But does NOT create CRM contacts for each employee
- Tickets have `holderName` and `holderEmail` but no `contactId`

**Location**: `convex/paymentProviders/invoice.ts:207-230`

**Impact**:
- Invoice line items can't show employee names properly
- No CRM record of employees for future marketing/follow-up

---

#### 2. **Employer Organization Has No Billing Details** ⚠️ CRITICAL
**Problem**: Invoice shows employer as "AMEOS" but no address, VAT, contact info

**Root Cause**:
- Invoice provider creates/finds CRM org at `invoice.ts:162-180`
- But only passes `companyName` to `createCRMOrganization`
- Doesn't extract billing address, VAT, email, phone from checkout session

**Location**: `convex/paymentProviders/invoice.ts:162-180`

**Impact**:
- Invoice PDF missing critical billing information
- Can't legally send invoice without proper billing address
- VAT requirements not met

---

#### 3. **No Manual Consolidation UI** 🔧 FEATURE REQUEST
**Problem**: No way for admin to manually create consolidated invoices

**What's Needed**:
- UI workflow to:
  1. Select employer organization (AMEOS, etc.)
  2. See all uninvoiced tickets for that employer
  3. Select which tickets to include
  4. Generate consolidated invoice
  5. Download PDF and/or send email

**Location**: Would go in `src/components/window-content/invoicing-window/index.tsx`

**Use Case**:
- Manual invoicing at month-end
- Correcting mistakes from automatic invoices
- Combining multiple events into one invoice

---

## Implementation Plan

### Phase 1: Fix Critical Data Issues (Priority: HIGH)

#### Task 1.1: Create CRM Contacts During Invoice Checkout
**File**: `convex/paymentProviders/invoice.ts`

**Steps**:
1. Before creating each ticket (line ~207), create CRM contact:
   ```typescript
   const contactId = await ctx.runMutation(
     internal.crmIntegrations.createCRMContact,
     {
       organizationId: args.organizationId,
       crmOrganizationId, // Link to employer
       firstName: formResponse?.responses?.firstName || holderName,
       lastName: formResponse?.responses?.lastName || "",
       email: holderEmail,
       phone: formResponse?.responses?.phone,
     }
   );
   ```

2. Pass `contactId` when creating ticket:
   ```typescript
   const ticketId = await ctx.runMutation(
     internal.ticketOntology.createTicketInternal,
     {
       // ...existing fields...
       contactId, // NEW: Link to CRM contact
       customProperties: {
         // ...existing props...
         contactId, // Store in customProperties too
       }
     }
   );
   ```

**Expected Result**: Invoice line items show "Event - John Doe" instead of "Unknown Contact"

---

#### Task 1.2: Add Billing Details to CRM Organization
**File**: `convex/paymentProviders/invoice.ts`

**Steps**:
1. Extract billing details from checkout session (line ~162):
   ```typescript
   const billingAddress = {
     line1: session.customProperties?.billingLine1 as string || "",
     line2: session.customProperties?.billingLine2 as string | undefined,
     city: session.customProperties?.billingCity as string || "",
     state: session.customProperties?.billingState as string | undefined,
     postalCode: session.customProperties?.billingPostalCode as string || "",
     country: session.customProperties?.billingCountry as string || "DE",
   };
   ```

2. Pass all details to `createCRMOrganization`:
   ```typescript
   crmOrganizationId = await ctx.runMutation(internal.crmIntegrations.createCRMOrganization, {
     organizationId: args.organizationId,
     companyName: organizationName,
     vatNumber: session.customProperties?.vatNumber as string | undefined,
     billingAddress: billingAddress.line1 ? billingAddress : undefined,
     email: session.customProperties?.customerEmail as string | undefined,
     phone: session.customProperties?.customerPhone as string | undefined,
   });
   ```

**Expected Result**: Invoice PDF shows complete AMEOS billing details

---

### Phase 2: Manual Consolidation Workflow (Priority: MEDIUM)

#### Task 2.1: Add Consolidation Tab to Invoicing Window
**File**: `src/components/window-content/invoicing-window/index.tsx`

**UI Flow**:
1. Enable "Consolidation" tab (currently disabled)
2. Show wizard with 3 steps:
   - **Step 1**: Select employer organization (dropdown of CRM orgs)
   - **Step 2**: Show uninvoiced tickets for that org (checkboxes to select)
   - **Step 3**: Review and confirm (show preview of line items)
3. Button: "Generate Invoice"

**Backend**:
- Use existing `createConsolidatedInvoice` mutation
- Use existing `previewConsolidation` query to show preview

---

#### Task 2.2: Add Query to List Uninvoiced Tickets by Organization
**File**: `convex/invoicingOntology.ts`

**New Query**:
```typescript
export const listUninvoicedTicketsByOrganization = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    crmOrganizationId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    // Find all tickets where:
    // - contactId belongs to this CRM organization
    // - ticket doesn't have invoiceId
    // Return with ticket details, contact name, event name, price
  }
});
```

---

### Phase 3: Testing & Validation (Priority: HIGH)

#### Test Case 1: Automatic Invoice from Checkout
1. Go through checkout with invoice provider
2. Select AMEOS as employer
3. Fill out complete billing address
4. Complete checkout
5. ✅ Verify: Invoice shows AMEOS name, address, VAT
6. ✅ Verify: Line items show employee names (not "Unknown")
7. ✅ Verify: PDF generates correctly
8. ✅ Verify: Email sent to employee with tickets only

#### Test Case 2: Manual Consolidation
1. Open Invoicing window
2. Click "Consolidation" tab
3. Select AMEOS from dropdown
4. See list of uninvoiced tickets
5. Select 3 tickets
6. Click "Generate Invoice"
7. ✅ Verify: Invoice created with 3 line items
8. ✅ Verify: All ticket holders shown correctly

---

## Data Model Review

### CRM Organization Fields (Already Support)
```typescript
{
  companyName: string,
  vatNumber?: string,
  billingAddress?: {
    line1: string,
    line2?: string,
    city: string,
    state?: string,
    postalCode: string,
    country: string,
  },
  billingEmail?: string,
  billingContact?: string,
  primaryEmail?: string,
  primaryPhone?: string,
  website?: string,
}
```

### CRM Contact Fields (Already Support)
```typescript
{
  firstName: string,
  lastName: string,
  email: string,
  phone?: string,
  crmOrganizationId?: Id<"objects">, // Link to employer
  // ... other fields
}
```

### Ticket Fields (Need to Add)
```typescript
{
  contactId: Id<"objects">, // NEW: Link to CRM contact
  customProperties: {
    contactId: Id<"objects">, // Also store here
    holderName: string,
    holderEmail: string,
    // ... existing fields
  }
}
```

---

## Timeline Estimate

- **Task 1.1** (CRM Contacts): 30 minutes
- **Task 1.2** (Billing Details): 20 minutes
- **Task 2.1** (UI Workflow): 1-2 hours
- **Task 2.2** (Backend Query): 30 minutes
- **Testing**: 1 hour

**Total**: ~3-4 hours

---

## Priority Order

1. ✅ **Task 1.2 first** - Fix billing details (most critical for legal compliance)
2. ✅ **Task 1.1 second** - Fix contact creation (important for invoice readability)
3. ⏳ **Task 2.x last** - Manual workflow (nice-to-have, automatic flow works)

