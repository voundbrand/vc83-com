# Debug Logging Added to Behavior Checkout

## Purpose
Added comprehensive logging to identify why tickets are not being created in the behavior-driven checkout system.

## Critical Fixes Applied

### Fix #1: Date Object Conversion
**Problem**: Convex doesn't support JavaScript `Date` objects - only numbers, strings, booleans, arrays, and objects.

**Solution**: Added recursive converter in [index.tsx:222-235](src/templates/checkout/behavior-driven/index.tsx:222-235):
```typescript
const convertDatesToTimestamps = (obj: any): any => {
  if (obj instanceof Date) return obj.getTime();
  // Recursively convert nested objects and arrays
};
```

This ensures invoice dates (`issueDate`, `dueDate`) are converted to timestamps before storing in session.

### Fix #2: Behavior Context Field Added to Validator
**Problem**: `updatePublicCheckoutSession` validator rejected `behaviorContext` field.

**Solution**: Added to validator in [checkoutSessionOntology.ts:335](convex/checkoutSessionOntology.ts:335):
```typescript
behaviorContext: v.optional(v.any()),
```

## Changes Made

### 1. Frontend Payment Step ([payment.tsx](src/templates/checkout/behavior-driven/steps/payment.tsx))

**Added logging before Stripe payment confirmation:**
- Checkout session ID
- Selected products
- Form responses
- Customer info

**Added logging after payment success:**
- completeCheckout result

### 2. Main Checkout Component ([index.tsx](src/templates/checkout/behavior-driven/index.tsx))

**Added behavior context extraction and persistence:**
- Extract `invoiceMapping` behavior results
- Extract `employerDetection` behavior results
- Extract `taxCalculation` results
- Store all behavior results in session

**Critical Fix:**
```typescript
behaviorContext: behaviorContext as any,  // Now stored in session!
```

This ensures that when a doctor selects their hospital (e.g., "Kaiser Permanente"), the backend knows to create an invoice for that hospital with the correct payment terms.

### 3. Backend Checkout Completion ([checkoutSessions.ts](convex/checkoutSessions.ts))

**Added logging throughout ticket creation process:**
- Session retrieval and validation
- Selected products extraction
- **Behavior context extraction** (NEW!)
- Purchase item creation
- Product fulfillment

**Critical addition - Extract behavior context from session:**
```typescript
const behaviorContext = session.customProperties?.behaviorContext as {
  invoiceMapping?: { shouldInvoice, employerOrgId, organizationName, paymentTerms, billingAddress },
  employerDetection?: { employerBilling: { organizationName, defaultPaymentTerms } },
  taxCalculation?: any,
  allResults?: Array<{ type, success, data }>
};
```

## Why This Was Needed

### Problem
The behavior system was calculating employer billing information (hospital name, payment terms) but this data was **only stored in React state**, not persisted to the checkout session. When payment completed and the backend tried to create invoices/tickets, it had **no context** about behaviors that ran earlier.

### Example Scenario
1. Doctor selects "Kaiser Permanente" from dropdown
2. `employer_detection` behavior identifies this should be invoiced to Kaiser
3. Behavior result stored in React: `{ shouldInvoice: true, organizationName: "Kaiser Permanente", paymentTerms: "net30" }`
4. ❌ **Session updated WITHOUT behavior context**
5. Payment completes, backend tries to create invoice
6. Backend has no idea which hospital to invoice!

### Solution
Now behavior results flow through the entire checkout:
1. Behaviors execute → Results in React state
2. Session update → **Behavior context included**
3. Payment completes → Backend reads behavior context from session
4. Backend creates invoice with correct hospital/terms

## What to Look For in Logs

### Frontend Console Logs

**Step Updates:**
```
📝 [BehaviorCheckout] Updating session with data:
  - selectedProducts: 2
  - formResponses: 2
  - hasBehaviorContext: true
  - behaviorTypes: ["employer_detection", "invoice_mapping", "tax_calculation"]
```

**Payment Initiation:**
```
💳 [Payment] Starting Stripe payment...
💳 [Payment] Checkout session ID: k123...
💳 [Payment] Selected products: [...]
💳 [Payment] Form responses: [...]
```

**Payment Success:**
```
✅ [Payment] Stripe payment confirmed, calling completeCheckout...
✅ [Payment] completeCheckout result: { success: true, purchasedItemIds: [...] }
```

### Backend Logs (Convex Dashboard)

**Session Retrieval:**
```
🎫 [completeCheckoutWithTickets] Starting ticket creation...
🔍 [completeCheckoutWithTickets] Session data:
  - hasCustomProperties: true
  - customPropertyKeys: ["customerEmail", "selectedProducts", "behaviorContext", ...]
```

**Data Extraction:**
```
🔍 [completeCheckoutWithTickets] Extracted data:
  - selectedProductsCount: 2
  - selectedProducts: [{ productId: "...", quantity: 1 }]
```

**Behavior Context (NEW!):**
```
🧠 [completeCheckoutWithTickets] Behavior context from session:
  - hasBehaviorContext: true
  - invoiceMapping: { shouldInvoice: true, organizationName: "Kaiser Permanente" }
  - employerDetection: { employerBilling: { organizationName: "Kaiser", paymentTerms: "net30" } }
```

**Purchase Item Creation:**
```
🛍️ [completeCheckoutWithTickets] Creating purchase items for 2 products
🔍 [completeCheckoutWithTickets] Processing product: k123...
✅ [completeCheckoutWithTickets] Product found: { name: "Conference Ticket" }
🎫 [completeCheckoutWithTickets] Creating purchase items... { quantity: 2 }
✅ [completeCheckoutWithTickets] Purchase items created: { count: 2, ids: [...] }
```

## Expected Behavior

### If Everything Works:
1. All products show in "selectedProducts"
2. Behavior context is present in session
3. Purchase items are created (count matches quantity)
4. Tickets appear in `/tickets` page

### If Something is Broken:

**Scenario A: No products in session**
```
❌ [completeCheckoutWithTickets] NO SELECTED PRODUCTS! Cannot create tickets.
```
→ Session update is failing or products not added to cart

**Scenario B: No behavior context**
```
🧠 [completeCheckoutWithTickets] Behavior context from session:
  - hasBehaviorContext: false
```
→ Behaviors didn't execute or results not stored

**Scenario C: Products found but no tickets created**
```
✅ Purchase items created: { count: 2 }
(but no tickets in database)
```
→ Ticket fulfillment logic is failing after purchase_item creation

## Next Steps

1. **Test the checkout** with the new logging
2. **Open browser console** and **Convex dashboard logs**
3. **Complete a test purchase** and watch logs flow through
4. **Identify the exact point** where the flow breaks
5. **Fix the specific issue** based on what logs reveal

## Files Modified

- `src/templates/checkout/behavior-driven/steps/payment.tsx` - Frontend payment logging
- `src/templates/checkout/behavior-driven/index.tsx` - Behavior context persistence
- `convex/checkoutSessions.ts` - Backend ticket creation logging + behavior context extraction
