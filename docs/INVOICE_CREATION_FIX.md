# Invoice Creation Fix - Behavior System Integration

## Problem

The behavior-driven checkout was not creating invoices or tickets when employer billing was detected, even though the checkout session showed `skipPaymentStep: true` in the behavior context.

## Root Cause

The workflow template (`event-registration-employer-billing`) was missing the `invoice-payment` behavior that actually returns the `create_invoice` action.

The template had:
1. ✅ `employer-detection` - Detects employer from form data
2. ✅ `invoice-mapping` - Maps employer to CRM organization
3. ❌ **MISSING** `invoice-payment` - Creates invoice and returns `create_invoice` action

## The Architecture

### How Behavior-Driven Invoice Creation Works

```
1. User fills form → Behaviors execute
   ├─ employer-detection: Finds "Hospital XYZ" in form
   ├─ invoice-mapping: Maps to CRM org ID "org_123"
   └─ invoice-payment: Returns { actions: [{ type: "create_invoice", when: "immediate" }] }

2. Checkout reads behavior results
   └─ Sees skipPaymentStep: true → Jump to confirmation
   └─ Sees create_invoice action → Execute immediately

3. Action executor in checkout (index.tsx:338-387)
   └─ Calls initiateInvoice() with session data
   └─ Backend creates invoice + tickets
   └─ Updates checkout with payment result
```

### Separation of Concerns

**WHY we needed this fix:**
- `invoice-mapping` handles **data mapping** (employer → CRM org)
- `invoice-payment` handles **invoice creation** (returns actions to execute)
- Checkout is **dumb executor** (runs actions returned by behaviors)

**This keeps business logic in behaviors, not in checkout UI.**

## Solution

Added `invoice-payment` behavior to the workflow template with proper configuration:

```typescript
{
  type: "invoice-payment",
  enabled: true,
  priority: 80, // Runs after employer-detection (100) and invoice-mapping (90)
  description: "Creates invoice and skips payment step for employer billing",
  config: {
    defaultPaymentTerms: "net30",
    employerPaymentTerms: {}, // Can override per employer
    requireCrmOrganization: true,
    requireBillingAddress: false,
    autoFillFromCrm: true,
    sendInvoiceEmail: true,
    includeDetailedLineItems: true,
    includeTaxBreakdown: true,
    includeAddons: true,
  },
}
```

## Files Changed

### `/convex/workflows/workflowTemplates.ts`
**Changed:** Added `invoice-payment` behavior to `event-registration-employer-billing` template
**Line:** 98-114
**Impact:** Now workflow returns `create_invoice` action that checkout can execute

## How Action Execution Works

### 1. Behavior Returns Action (invoice-payment.ts:300-306)
```typescript
return {
  success: true,
  data: invoiceData,
  actions: [{
    type: "create_invoice",
    payload: invoiceData,
    priority: 100,
    when: "immediate", // Execute right away
  }],
};
```

### 2. Checkout Executes Action (index.tsx:338-387)
```typescript
// After behaviors run and before transitioning to next step
if (behaviorResult?.results) {
  for (const result of behaviorResult.results) {
    if (result.result.actions) {
      for (const action of result.result.actions) {
        if (action.type === "create_invoice" && action.when === "immediate") {
          // Execute invoice creation
          const result = await initiateInvoice({
            sessionId,
            checkoutSessionId,
            organizationId,
          });

          // Store payment result
          setCheckoutData(prev => ({
            ...prev,
            selectedPaymentProvider: "invoice",
            paymentResult: {
              success: true,
              transactionId: result.invoiceId,
              receiptUrl: result.pdfUrl,
              purchasedItemIds: [...],
              checkoutSessionId,
            },
          }));
        }
      }
    }
  }
}
```

## Why This Approach is Correct

### ✅ Behavior-Driven (Correct)
- Business logic lives in `invoice-payment` behavior
- Behavior returns `create_invoice` action
- Checkout generically executes all actions
- Easy to add new action types (send_email, create_ticket, etc.)
- Easy to customize per workflow/product

### ❌ Hardcoded (Wrong)
```typescript
// DON'T DO THIS - Puts business logic in checkout!
if (behaviorResult.skipPaymentStep) {
  await initiateInvoice(...);
}
```

## Testing Checklist

To verify this fix works:

1. ✅ Start checkout with product that has employer billing workflow
2. ✅ Fill registration form with hospital employer
3. ✅ Check console logs show:
   - `🎬 [BehaviorCheckout] Checking for behavior actions...`
   - `📄 [BehaviorCheckout] Executing create_invoice action...`
   - `✅ [BehaviorCheckout] Invoice and tickets created:`
4. ✅ Verify checkout skips payment step and goes to confirmation
5. ✅ Check database for:
   - Invoice object created (type = "invoice")
   - Ticket objects created (type = "ticket")
   - Payment transaction created
6. ✅ Check invoice shows in `/invoicing` window
7. ✅ Check tickets show in `/tickets` window

## Related Files

- `/src/lib/behaviors/handlers/invoice-payment.ts` - Behavior that returns create_invoice action
- `/src/lib/behaviors/handlers/invoice-mapping.ts` - Maps employer to CRM org
- `/src/lib/behaviors/handlers/employer-detection.ts` - Detects employer from form
- `/src/templates/checkout/behavior-driven/index.tsx` - Checkout action executor
- `/convex/paymentProviders/invoice.ts` - Backend invoice creation
- `/convex/checkoutSessions.ts` - Backend ticket creation

## Key Takeaway

**The behavior system provides a clean separation:**
- **Behaviors** = Business logic (what to do and when)
- **Checkout** = Execution engine (how to do it)
- **Actions** = Communication protocol between them

This makes the system:
- Easy to understand (one file per behavior)
- Easy to test (behaviors are pure functions)
- Easy to customize (configure per workflow/product)
- Easy to extend (add new behaviors and actions)
