# Invoice Data Flow Analysis & Generalization Plan

## Executive Summary

**Problem**: The invoice generation system creates empty invoices (totalInCents: 0, no line items) because critical ticket data is not being captured or transferred properly from the checkout flow to the invoice.

**Root Cause**: Ticket records store minimal data in `customProperties`, and the invoice generation system doesn't extract product details, pricing, or event information from the tickets when creating invoices.

**Solution**: Implement a generalized data extraction system that ensures tickets contain all necessary invoice data, and update invoice generation to properly extract and use this data.

---

## Log Analysis - Step by Step

### What Happened in the Logs

#### 1. **Product Selection & Checkout Session** ✅
```
Selected product: VIP Ticket (ID: q97d33cj0xqxtt21qwef403kd57sf0ww)
Price: €120.00
Quantity: 1
Event: Big Event (location: Am Markt 11, date: Oct 16, 2025)
Sponsor: Ameos (gold)
```
**Status**: Data available at checkout - all product, event, and pricing info exists

#### 2. **Invoice Payment Initiation** ⚠️
```javascript
initiateInvoicePayment receives:
- sessionId: valid
- checkoutSessionId: valid
- organizationId: valid
- selectedProducts: [{ productId, quantity: 1, pricePerUnit: 12000, totalPrice: 12000 }]
```
**Status**: Pricing data still present in session

#### 3. **Ticket Creation** ❌ **CRITICAL DATA LOSS**
```javascript
Created ticket with customProperties:
{
  checkoutSessionId: "...",
  holderEmail: "itsmetherealremington@gmail.com",
  holderName: "Remington Charles Splettstoesser",
  paymentIntentId: "invoice",
  pricePaid: 12000,  // ✅ Price stored!
  productId: "q97d33cj0xqxtt21qwef403kd57sf0ww",
  purchaseDate: timestamp,
  purchaseItemId: "...",
  ticketNumber: 1,
  totalTicketsInOrder: 1,
  // ❌ MISSING: eventId, eventName, eventLocation, eventDate
  // ❌ MISSING: productName, productDescription
  // ❌ MISSING: crmOrganizationId (added later by workflow)
}
```
**Problem**: Ticket stores productId but NOT:
- Event details (name, location, date)
- Product details (name, description)
- CRM organization link (added separately)

#### 4. **Consolidated Invoice Query** ⚠️
```javascript
Found 12 tickets linked to CRM org q977xja5kbhejh0qmjpbqpnnvh7sqd5c
After filtering: 1 eligible ticket (not yet invoiced)
```
**Status**: Ticket selection works correctly

#### 5. **Invoice Creation** ❌ **INCOMPLETE DATA**
```javascript
Invoice created: INV-2025-0025
ticketCount: 1
totalInCents: 0  // ❌ ZERO!
```
**Problem**: Invoice doesn't extract pricing from tickets

#### 6. **Template Data Preparation** ❌ **MISSING DETAILS**
```javascript
prepareConsolidatedTemplateData receives invoice with:
{
  lineItems: [],  // ❌ EMPTY!
  billTo: { name: "Unknown Company" },  // ❌ No CRM data
  eventName: "Event Registration",  // ❌ Generic fallback
  subtotalInCents: 0,
  taxInCents: 0,
  totalInCents: 0
}
```
**Problem**: Invoice record has no line items, no event data, no billing details

---

## Data Flow Gaps

### Gap 1: Ticket Creation Missing Product/Event Context
**Location**: `convex/paymentProviders/invoice.ts` → ticket creation
**Missing Fields**:
```typescript
// ❌ Currently NOT stored in ticket.customProperties:
eventId: string
eventName: string
eventLocation: string
eventStartDate: number
productName: string
productDescription: string
productSubtype: "ticket" | "merchandise" | etc.
```

**Why It Matters**: Without event/product details in the ticket, we can't populate invoice line items

### Gap 2: Invoice Creation Doesn't Extract Ticket Data
**Location**: `convex/invoicingOntology.ts` → `createConsolidatedInvoice`
**Problem**: Creates invoice record with empty line items instead of:
```typescript
// Should extract from each ticket:
lineItems: [
  {
    contactName: ticket.customProperties.holderName,
    contactEmail: ticket.customProperties.holderEmail,
    productId: ticket.customProperties.productId,
    productName: ticket.customProperties.productName,
    eventName: ticket.customProperties.eventName,
    eventLocation: ticket.customProperties.eventLocation,
    unitPriceInCents: ticket.customProperties.pricePaid,
    totalPriceInCents: ticket.customProperties.pricePaid,
    description: `${ticket.customProperties.holderName} - ${ticket.customProperties.productName}`,
  }
]
```

### Gap 3: CRM Organization Data Not in Invoice
**Location**: `convex/consolidatedInvoicing.ts` → `prepareConsolidatedTemplateData`
**Problem**: Doesn't fetch CRM organization details for `billTo` field
```typescript
// Currently defaults to:
billTo: {
  name: "Unknown Company",
  billingEmail: undefined,
  billingAddress: {}
}

// Should fetch from CRM organization:
billTo: {
  name: crmOrg.name,
  vatNumber: crmOrg.customProperties.vatNumber,
  billingEmail: crmOrg.customProperties.billingEmail,
  billingAddress: crmOrg.customProperties.billingAddress,
  billingContact: crmOrg.customProperties.billingContact
}
```

---

## Generalized Solution Architecture

### Phase 1: Enrich Ticket Data at Creation
**Goal**: Ensure every ticket contains ALL data needed for any invoice type

**Implementation**:
```typescript
// In paymentProviders/invoice.ts → initiateInvoicePayment
// Before creating ticket, fetch and embed:

1. Load full product details:
   - productName, productDescription, productSubtype
   - pricing info (already done ✅)

2. Load event details (if product is ticket type):
   - eventId, eventName, eventLocation, eventStartDate, eventEndDate
   - Get from productLinks → "belongs_to" → event object

3. Load event sponsors (if applicable):
   - sponsorNames, sponsorLogos, sponsorLevels
   - Get from objectLinks → event → sponsors

4. Store in ticket.customProperties:
   {
     // Existing ✅
     holderName, holderEmail, productId, pricePaid, ticketNumber,
     checkoutSessionId, purchaseDate, paymentStatus,

     // NEW - Product Context
     productName: "VIP Ticket",
     productDescription: "Premium access with VIP lounge",
     productSubtype: "ticket",

     // NEW - Event Context (for ticket products)
     eventId: "q974e0hhq8r4mv8gfa62evajm57sf9hz",
     eventName: "Big Event",
     eventLocation: "Am Markt 11",
     eventStartDate: 1760608800000,
     eventEndDate: 1760695200000,

     // NEW - Sponsor Context (for sponsored events)
     eventSponsors: [
       { name: "Ameos", level: "gold", logoUrl: "..." }
     ],

     // NEW - Employer/CRM Context (for B2B)
     crmOrganizationId: "q977xja5kbhejh0qmjpbqpnnvh7sqd5c",
     employerName: "AMEOS Krankenhausgesellschaft Holstein mbH",
     employerId: "employer-value-from-form",
   }
```

### Phase 2: Update Invoice Creation to Extract Ticket Data
**Goal**: Invoice generation pulls all needed data from enriched tickets

**Implementation**:
```typescript
// In invoicingOntology.ts → createConsolidatedInvoice

async function createConsolidatedInvoice(args) {
  // 1. Fetch all tickets
  const tickets = await Promise.all(
    args.ticketIds.map(id => ctx.db.get(id))
  );

  // 2. Extract line items from tickets
  const lineItems = tickets.map(ticket => ({
    ticketId: ticket._id,
    contactName: ticket.customProperties.holderName,
    contactEmail: ticket.customProperties.holderEmail,
    contactId: ticket.customProperties.holderId,

    productId: ticket.customProperties.productId,
    productName: ticket.customProperties.productName,
    productDescription: ticket.customProperties.productDescription,

    eventId: ticket.customProperties.eventId,
    eventName: ticket.customProperties.eventName,
    eventLocation: ticket.customProperties.eventLocation,
    eventStartDate: ticket.customProperties.eventStartDate,

    unitPriceInCents: ticket.customProperties.pricePaid,
    quantity: 1,
    totalPriceInCents: ticket.customProperties.pricePaid,

    description: `${ticket.customProperties.holderName} - ${ticket.customProperties.productName}`,
  }));

  // 3. Calculate totals from line items
  const subtotalInCents = lineItems.reduce((sum, item) => sum + item.totalPriceInCents, 0);
  const taxInCents = Math.round(subtotalInCents * 0.19); // 19% VAT
  const totalInCents = subtotalInCents + taxInCents;

  // 4. Fetch CRM organization for billTo
  const crmOrg = await ctx.db.get(args.crmOrganizationId);
  const billTo = {
    name: crmOrg.name,
    vatNumber: crmOrg.customProperties?.vatNumber,
    billingEmail: crmOrg.customProperties?.billingEmail,
    billingAddress: crmOrg.customProperties?.billingAddress || {},
    billingContact: crmOrg.customProperties?.billingContact,
  };

  // 5. Create invoice with complete data
  return await ctx.db.insert("objects", {
    type: "invoice",
    subtype: "b2b_consolidated",
    organizationId: args.organizationId,
    name: `Invoice ${invoiceNumber}`,
    customProperties: {
      invoiceNumber,
      invoiceDate: Date.now(),
      dueDate: Date.now() + paymentTermsDays * 24 * 60 * 60 * 1000,

      billTo,
      lineItems,

      subtotalInCents,
      taxInCents,
      totalInCents,
      currency: "EUR",

      eventId: tickets[0].customProperties.eventId,
      eventName: tickets[0].customProperties.eventName,

      paymentStatus: "awaiting_employer_payment",
      paymentTerms: "net30",
    }
  });
}
```

### Phase 3: Validate Template Data Preparation
**Goal**: Ensure PDF template receives complete, correct data

**Implementation**:
```typescript
// In consolidatedInvoicing.ts → prepareConsolidatedTemplateData

async function prepareConsolidatedTemplateData(ctx, invoice) {
  const props = invoice.customProperties;

  // Data should now be complete from invoice record
  return {
    invoiceNumber: props.invoiceNumber,
    invoiceDate: props.invoiceDate,
    dueDate: props.dueDate,

    eventName: props.eventName,  // ✅ From tickets

    billTo: props.billTo,  // ✅ From CRM org

    lineItems: props.lineItems.map(item => ({
      employeeName: item.contactName,
      employeeEmail: item.contactEmail,
      description: item.description,
      productName: item.productName,
      eventName: item.eventName,
      eventLocation: item.eventLocation,
      unitPrice: item.unitPriceInCents,
      totalPrice: item.totalPriceInCents,
    })),

    subtotal: props.subtotalInCents,
    taxAmount: props.taxInCents,
    total: props.totalInCents,
    currency: props.currency,

    paymentTerms: props.paymentTerms,
  };
}
```

---

## Implementation Checklist

### ✅ Phase 1: Ticket Enrichment (PRIORITY)
- [ ] Update `paymentProviders/invoice.ts` → `initiateInvoicePayment`
- [ ] Fetch product details before ticket creation
- [ ] Fetch event details (if product is ticket)
- [ ] Fetch event sponsors (if event has sponsors)
- [ ] Store all context in `ticket.customProperties`
- [ ] Add helper function: `enrichTicketDataFromProduct(productId)`

### ✅ Phase 2: Invoice Creation (PRIORITY)
- [ ] Update `invoicingOntology.ts` → `createConsolidatedInvoice`
- [ ] Extract line items from tickets (with all enriched data)
- [ ] Calculate totals from line items
- [ ] Fetch CRM organization for `billTo` field
- [ ] Store complete data in `invoice.customProperties`
- [ ] Add validation: ensure tickets have required fields

### ✅ Phase 3: Template Data (VERIFY)
- [ ] Review `consolidatedInvoicing.ts` → `prepareConsolidatedTemplateData`
- [ ] Ensure it correctly maps invoice data to template format
- [ ] Add logging to verify data completeness
- [ ] Test with sample invoice

### ✅ Phase 4: Generalization
- [ ] Create shared utility: `extractInvoiceDataFromTickets(tickets)`
- [ ] Make it work for ANY workflow type (not just consolidated B2B)
- [ ] Support B2C invoices (single ticket)
- [ ] Support different product types (tickets, merchandise, services)
- [ ] Add comprehensive error handling & logging

### ✅ Phase 5: Testing
- [ ] Test B2B consolidated invoice (multiple employees)
- [ ] Test B2B single invoice (one employee)
- [ ] Test B2C invoice (direct customer)
- [ ] Test with different product types
- [ ] Test with events that have/don't have sponsors
- [ ] Verify PDF contains all expected data

---

## Key Files to Modify

1. **`convex/paymentProviders/invoice.ts`** (Lines 140-210)
   - Add product/event data fetching
   - Enrich ticket customProperties

2. **`convex/invoicingOntology.ts`** (createConsolidatedInvoice mutation)
   - Extract line items from tickets
   - Calculate totals
   - Fetch CRM organization

3. **`convex/consolidatedInvoicing.ts`** (prepareConsolidatedTemplateData)
   - Verify correct data mapping
   - Add validation/logging

4. **`convex/ticketOntology.ts`** (documentation)
   - Update docs to show new customProperties fields

---

## Expected Outcome

After implementation, the logs should show:

```javascript
✅ Ticket created with complete data:
{
  holderName: "Remington Charles Splettstoesser",
  holderEmail: "itsmetherealremington@gmail.com",
  productId: "...",
  productName: "VIP Ticket",
  eventId: "...",
  eventName: "Big Event",
  eventLocation: "Am Markt 11",
  pricePaid: 12000,
  crmOrganizationId: "...",
  employerName: "AMEOS Krankenhausgesellschaft Holstein mbH"
}

✅ Invoice created with complete data:
{
  invoiceNumber: "INV-2025-0025",
  billTo: {
    name: "AMEOS Krankenhausgesellschaft Holstein mbH",
    billingEmail: "billing@ameos.de",
    billingAddress: { ... }
  },
  lineItems: [
    {
      employeeName: "Remington Charles Splettstoesser",
      productName: "VIP Ticket",
      eventName: "Big Event",
      unitPriceInCents: 12000,
      totalPriceInCents: 12000
    }
  ],
  subtotalInCents: 12000,
  taxInCents: 2280,
  totalInCents: 14280
}

✅ PDF template receives complete data
✅ Invoice displays correctly in UI
```

---

## Notes

- **Backward Compatibility**: Existing tickets without enriched data will still work (fallback to "Unknown" values)
- **Performance**: Fetching product/event data adds ~50-100ms to ticket creation (acceptable)
- **Scalability**: System works for 1 ticket or 1000 tickets in consolidated invoice
- **Flexibility**: Same data structure works for B2B, B2C, tickets, merchandise, etc.
