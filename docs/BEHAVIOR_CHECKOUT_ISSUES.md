# Behavior-Driven Checkout - Remaining Issues

## Current Status (As of Session End)

### ✅ What's Working
1. **Checkout session created** - Session object is created on page load
2. **Transaction record created** - Shows up in Transactions page
3. **Payment processing** - Invoice and Stripe handlers are called
4. **Math calculations fixed** - All totals consistent across steps

### ❌ What's NOT Working

#### 1. **NO TICKETS BEING CREATED** 🚨 CRITICAL
- **Problem**: After completing checkout, no ticket objects appear in database
- **Expected**: Should create one ticket per product quantity
- **Location**: `convex/checkoutSessions.ts:559` - `completeCheckoutWithTickets`
- **Test**: Check `/tickets` page after checkout - should show tickets

#### 2. **Transaction Data Incomplete**
- **Missing**: Add-ons not included in transaction breakdown
- **Wrong**: Tax amount incorrect
- **Wrong**: Currency incorrect (not using product currency)
- **Wrong**: Payment method not being recorded
- **Location**: Where transaction record is created during payment

#### 3. **Download Tickets Button Non-Functional**
- **Problem**: Button shows "Download feature coming soon" alert
- **Blocker**: Can't implement until tickets are actually created (Issue #1)
- **Location**: `src/templates/checkout/behavior-driven/steps/confirmation.tsx:182`

## Investigation Plan for Next Session

### Step 1: Debug Ticket Creation
```bash
# Check if completeCheckoutWithTickets is being called
# Add console.log in convex/checkoutSessions.ts:559
```

**Files to check:**
1. `src/templates/checkout/behavior-driven/steps/payment.tsx:235-257` - Stripe handler calls `completeCheckout`
2. `convex/checkoutSessions.ts:559-750` - `completeCheckoutWithTickets` function
3. `convex/ticketGeneration.ts` - Ticket creation logic

**Questions to answer:**
- Is `completeCheckoutWithTickets` being called?
- Is it receiving the correct `checkoutSessionId`?
- Are the `selectedProducts` in the session data?
- Is ticket generation succeeding or silently failing?

### Step 2: Fix Transaction Data

**Check these locations:**
```typescript
// Invoice payment
src/templates/checkout/behavior-driven/steps/payment.tsx:175 - initiateInvoice call
convex/paymentProviders/invoice.ts - Creates transaction record

// Stripe payment
src/templates/checkout/behavior-driven/steps/payment.tsx:235-239 - completeCheckout call
convex/checkoutSessions.ts:559+ - Creates transaction record
```

**What needs to be passed:**
- Form addons (`checkoutData.formResponses`)
- Correct total with tax
- Product currency
- Payment method ("invoice" or "stripe")

### Step 3: Implement Ticket Download

**After tickets are created:**
1. Create public query: `getTicketsByCheckoutSession` in `convex/ticketOntology.ts`
2. Use query in confirmation step to fetch tickets
3. Implement download handler to generate PDF or open ticket view
4. Connect button to handler

## Code Locations Reference

### Payment Processing
- **Stripe**: `src/templates/checkout/behavior-driven/steps/payment.tsx:195-257`
- **Invoice**: `src/templates/checkout/behavior-driven/steps/payment.tsx:149-189`

### Backend Functions
- **Complete Checkout**: `convex/checkoutSessions.ts:559` - `completeCheckoutWithTickets`
- **Initiate Invoice**: `convex/paymentProviders/invoice.ts:57` - `initiateInvoicePayment`
- **Ticket Generation**: `convex/ticketGeneration.ts`

### Session Management
- **Create Session**: `src/templates/checkout/behavior-driven/index.tsx:109-138`
- **Update Session**: `src/templates/checkout/behavior-driven/index.tsx:220-251`

## Quick Test Checklist

After fixing:
1. ✅ Complete checkout with 2 products
2. ✅ Check console for "Creating tickets" logs
3. ✅ Go to `/tickets` - should see 2 tickets
4. ✅ Go to `/transactions` - should see correct breakdown
5. ✅ Confirmation page - Download Tickets button should work

## Likely Root Causes

### Ticket Creation Not Working - Possible Issues:

1. **Checkout Session Data Missing Products**
   - Session might not have `selectedProducts` when payment completes
   - Check: `updatePublicCheckoutSession` is being called with products

2. **completeCheckoutWithTickets Not Being Called**
   - Stripe/Invoice handlers might not be calling it
   - Check: Payment handlers have correct function calls

3. **Ticket Generation Failing Silently**
   - Error in ticket creation might be caught and ignored
   - Check: Error logs in `ticketGeneration.ts`

4. **Session ID Not Passed to Backend**
   - `checkoutSessionId` might be undefined when payment happens
   - Check: `checkoutData.paymentResult.checkoutSessionId` exists

## Next Steps (Priority Order)

1. **🔴 HIGH**: Fix ticket creation - checkout is useless without tickets
2. **🟡 MEDIUM**: Fix transaction data completeness
3. **🟢 LOW**: Implement ticket download (after tickets work)

## Files Modified This Session

1. `src/templates/checkout/behavior-driven/index.tsx` - Added session creation
2. `src/templates/checkout/behavior-driven/steps/payment.tsx` - Real payment processing
3. `src/templates/checkout/behavior-driven/steps/confirmation.tsx` - Fixed math
4. `src/templates/checkout/behavior-driven/steps/review-order.tsx` - Fixed math

## Commands to Run

```bash
# Check for errors
npm run typecheck
npm run lint

# Test the checkout
npm run dev
npx convex dev

# Check database after checkout
# Look for objects with type="ticket" and type="payment"
```
