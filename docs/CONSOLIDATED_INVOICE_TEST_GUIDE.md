# Consolidated Invoice Workflow - End-to-End Test Guide

## Overview
This guide walks through testing the complete consolidated invoice generation workflow after implementing the `crmOrganizationId` linking in the checkout flow.

## What Was Fixed

### Problem
- Tickets were being created WITHOUT `crmOrganizationId` in customProperties
- Consolidated invoice workflow couldn't find any tickets to invoice
- Workflow logged: "Found 0 tickets linked to CRM org"

### Solution
Added `crmOrganizationId` and `contactId` to ticket creation in `/convex/checkoutSessions.ts` (lines 901-903):

```typescript
customProperties: {
  // ... existing properties
  registrationData,
  // 🔥 CRITICAL: Link ticket to CRM organization for consolidated invoicing
  crmOrganizationId, // Detected by employer-detection behavior
  contactId: crmContactId, // Link to individual contact
},
```

## Prerequisites

1. **Product with Invoice Config**: Product must have employer mapping configured
2. **CRM Organization**: Must exist in CRM with valid billing address
3. **Registration Form**: Must include `attendee_category` field that maps to employer
4. **Workflow**: Consolidated invoice workflow must be created

## Test Steps

### Step 1: Verify Product Configuration

1. Open **Products Window**
2. Find or create a product with invoice config:
   - Enable "Invoicing Configuration"
   - Set "Employer Source Field" = `attendee_category`
   - Add employer mappings (e.g., "Acme Corp" → CRM Org ID)
3. Note the product ID for testing

### Step 2: Verify CRM Organization

1. Open **CRM Window**
2. Find the mapped organization (e.g., "Acme Corp")
3. Verify it has:
   - Name
   - Billing address (street, city, postal code, country)
   - Optional: VAT number, billing email
4. Note the organization ID

### Step 3: Create Test Workflow

1. Open **Workflows Window**
2. Click "New Workflow"
3. Configure:
   - Name: "Test Consolidated Invoice - [Employer Name]"
   - Trigger: Manual
4. Add behavior:
   - Type: "Consolidated Invoice Generation"
   - Config:
     - CRM Organization ID: [From Step 2]
     - Event ID: [Optional, from your test event]
     - Exclude Already Invoiced: Yes
     - Template ID: `b2b_consolidated`
     - Send Email: No (for testing)
5. Save workflow

### Step 4: Run Test Checkout

1. Navigate to checkout page for configured product
2. **Registration Form**:
   - Fill attendee info
   - **CRITICAL**: Select employer from `attendee_category` dropdown
   - This triggers employer-detection behavior
3. **Customer Info**:
   - Should show "Employer Billing Detected" blue banner
   - Company name, address should auto-fill
   - Fill personal email and name
4. **Payment**:
   - Use test card: `4242 4242 4242 4242`
   - Complete purchase

### Step 5: Verify Ticket Creation

Open browser console and check Convex logs:

```
✅ [completeCheckoutWithTickets] Creating ticket with:
   - crmOrganizationId: [ID should be present]
   - contactId: [Contact ID]
   - productId: [Product ID]
   - eventId: [Event ID]
```

### Step 6: Run Workflow

1. Open **Workflows Window**
2. Find your test workflow
3. Click "▶ Run Now"
4. **Progress Modal Should Show**:

```
🐝 Workflow Execution Progress

✅ ticket_query: Found X eligible tickets
   Data: { ticketCount: X, ticketIds: [...] }

✅ invoice_creation: Invoice created: INV-001234
   Data: {
     invoiceId: "...",
     invoiceNumber: "INV-001234",
     ticketCount: X,
     totalAmount: "€XXX.XX"
   }

✅ pdf_generation: PDF generated successfully
   Data: { pdfUrl: "https://..." }

✅ ticket_update: Linked X tickets to invoice INV-001234
```

### Step 7: Verify Invoice Created

1. Click "View Invoice" button in progress modal
2. **OR** Open **Invoices Window**
3. Find invoice with matching number (INV-001234)
4. Verify:
   - Invoice shows correct organization
   - All tickets are listed
   - Total amount is correct
   - PDF link works

### Step 8: Export Logs (Optional)

1. Click "Export Logs" in progress modal
2. Download JSON file
3. Review execution steps and data

## Expected Results

### ✅ SUCCESS Indicators

1. **Checkout**:
   - Blue "Employer Billing Detected" banner shows
   - Company info auto-fills
   - Purchase completes successfully

2. **Ticket Creation**:
   - Console logs show `crmOrganizationId` present
   - Ticket linked to both CRM org and contact

3. **Workflow Execution**:
   - Progress modal shows all 6 steps complete
   - No errors in any step
   - Invoice ID and number displayed

4. **Invoice**:
   - Appears in Invoices window
   - Shows correct organization name
   - Lists all tickets from checkout
   - PDF generates successfully

### ❌ FAILURE Indicators

1. **No Employer Detection**:
   - Blue banner doesn't show
   - Company fields not auto-filled
   - **Fix**: Check product invoice config and employer mapping

2. **Workflow Finds 0 Tickets**:
   - Progress shows "Found 0 eligible tickets"
   - **Fix**: Check ticket customProperties has `crmOrganizationId`

3. **Invoice Creation Fails**:
   - Error in invoice_creation step
   - **Fix**: Check CRM org has valid billing address

4. **PDF Generation Fails**:
   - Warning in pdf_generation step
   - **Fix**: Check Convex file storage configuration

## Debugging

### Check Ticket Properties

```typescript
// In Convex dashboard, query tickets:
const tickets = await ctx.db.query("objects")
  .withIndex("by_type_and_organization", (q) =>
    q.eq("type", "ticket")
     .eq("organizationId", organizationId)
  )
  .collect();

// Check customProperties:
tickets.forEach(ticket => {
  console.log(ticket.customProperties?.crmOrganizationId);
  console.log(ticket.customProperties?.contactId);
});
```

### Check Workflow Execution Logs

```typescript
// In browser console during workflow execution:
// Logs should show:
🧾 [Step 1/6] Starting consolidated invoice generation
🧾 [Step 2/6] Finding eligible tickets...
🧾 Total tickets in organization: X
🧾 Found X tickets linked to CRM org [ID]
🧾 [Step 3/6] Creating consolidated invoice...
🧾 [Step 4/6] PDF generation...
🧾 [Step 5/6] Email notification...
🧾 [Step 6/6] Linking tickets to invoice...
```

### Common Issues

1. **"No eligible tickets found"**
   - Tickets don't have `crmOrganizationId` in customProperties
   - Wrong CRM organization ID in workflow config
   - Tickets already have `invoiceId` (already invoiced)

2. **"CRM Organization ID is required"**
   - Workflow config missing `crmOrganizationId`
   - Check workflow builder form submission

3. **"Failed to create invoice"**
   - CRM organization missing billing address
   - Invalid template ID
   - Insufficient permissions

## Test Data Examples

### Product Invoice Config
```json
{
  "invoiceConfig": {
    "employerSourceField": "attendee_category",
    "employerMapping": {
      "Acme Corporation": "k57abc123...",
      "TechStart GmbH": "k57def456...",
      "Global Industries": "k57ghi789..."
    },
    "defaultPaymentTerms": "net30"
  }
}
```

### Expected Ticket customProperties
```json
{
  "purchaseDate": 1704067200000,
  "paymentIntentId": "pi_abc123",
  "pricePaid": 25000,
  "ticketNumber": 1,
  "totalTicketsInOrder": 1,
  "checkoutSessionId": "k57session...",
  "purchaseItemId": "k57purchase...",
  "crmOrganizationId": "k57abc123...",
  "contactId": "k57contact...",
  "registrationData": {
    "attendee_category": "Acme Corporation",
    "attendee_name": "John Doe",
    "attendee_email": "john@acme.com"
  }
}
```

### Workflow Config
```json
{
  "crmOrganizationId": "k57abc123...",
  "eventId": "k57event...",
  "excludeInvoiced": true,
  "templateId": "b2b_consolidated",
  "sendEmail": false,
  "paymentTerms": "net30"
}
```

## Success Criteria

- [ ] Checkout detects employer and shows blue banner
- [ ] Ticket created with `crmOrganizationId` field
- [ ] Workflow finds tickets (count > 0)
- [ ] Invoice created successfully
- [ ] PDF generates
- [ ] Invoice appears in Invoices window
- [ ] Progress modal shows all steps complete
- [ ] Export logs works
- [ ] View Invoice button navigates correctly

## Next Steps

Once all tests pass:

1. Enable email sending in workflow config
2. Test with multiple tickets from same employer
3. Test with tickets from different events
4. Test date range filtering
5. Test minimum ticket count requirement
6. Test payment terms customization
