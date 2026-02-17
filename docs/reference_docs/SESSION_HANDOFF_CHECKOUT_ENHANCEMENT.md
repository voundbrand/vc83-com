# Session Handoff: Checkout System Enhancement

## Context
Working on event registration system. Frontend will use checkout API instead of workflow API for registrations.

## Completed ✅
1. Created comprehensive frontend integration guide: `docs/reference_docs/frontend/frontend-checkout-integration.md`
2. Identified and clarified all backend requirements with user
3. Already have: workflows for validation, checkout for fulfillment, dormant user creation in workflow behaviors

---

## Current Task: Implement Backend Changes

### Requirements Confirmed by User

**Invoicing Support:**
- ✅ Auto-detected employer invoices (already works)
- ✅ Manual B2B self-pay invoices (needs to be added)
- ✅ B2C pay-later invoices (needs to be added)
- ✅ B2C receipts (needs to be added)

**Key Decision:** Checkout MUST accept `paymentMethod: "invoice"` regardless of auto-detection

**Configuration Decisions:**
- ❌ NO payment method restrictions on products (user rejected)
- ✅ Payment configuration at checkout level only
- ✅ Use organization payment terms settings (already implemented)
- ✅ All invoices use same numbering system

---

## Implementation Changes

### Change 1: Add Free Payment Support ⚡ PRIORITY 1

**File:** `convex/checkoutSessions.ts`
**Function:** `completeCheckoutAndFulfill` (starts line 636)
**Location:** Around line 770-782 (payment verification section)

**Current code:**
```typescript
// 3. Verify payment was successful (pass connected account ID for Stripe Connect)
const provider = getProviderByCode("stripe-connect");
const paymentResult = await provider.verifyCheckoutPayment(args.paymentIntentId, connectedAccountId);

if (!paymentResult.success) {
  // Mark session as failed
  await ctx.runMutation(api.checkoutSessionOntology.failCheckoutSession, {
    sessionId: args.sessionId,
    checkoutSessionId: args.checkoutSessionId,
    errorMessage: "Payment verification failed",
  });
  throw new Error("Payment verification failed");
}
```

**Replace with:**
```typescript
let paymentResult: PaymentVerificationResult;

// 3. Verify payment based on payment method
if (args.paymentIntentId === 'free' || args.paymentIntentId.startsWith('free_')) {
  // FREE PAYMENT: No payment required (free events)
  console.log("✅ [completeCheckoutAndFulfill] Free registration - no payment verification needed");
  paymentResult = {
    success: true,
    paymentId: args.paymentIntentId,
    amount: 0,
    currency: session.customProperties?.currency as string || 'EUR',
  };

} else if (args.paymentIntentId.startsWith('inv_') || args.paymentIntentId === 'invoice') {
  // INVOICE PAYMENT: Pay later (B2B or B2C)
  console.log("✅ [completeCheckoutAndFulfill] Invoice payment - no immediate payment verification");
  paymentResult = {
    success: true,
    paymentId: args.paymentIntentId,
    amount: session.customProperties?.totalAmount as number || 0,
    currency: session.customProperties?.currency as string || 'EUR',
  };

} else {
  // STRIPE PAYMENT: Verify payment with Stripe
  console.log("💳 [completeCheckoutAndFulfill] Stripe payment - verifying with provider");
  const provider = getProviderByCode("stripe-connect");
  paymentResult = await provider.verifyCheckoutPayment(args.paymentIntentId, connectedAccountId);

  if (!paymentResult.success) {
    // Mark session as failed
    await ctx.runMutation(api.checkoutSessionOntology.failCheckoutSession, {
      sessionId: args.sessionId,
      checkoutSessionId: args.checkoutSessionId,
      errorMessage: "Payment verification failed",
    });
    throw new Error("Payment verification failed");
  }
}

console.log("✅ [completeCheckoutAndFulfill] Payment verification complete:", {
  method: args.paymentIntentId.startsWith('free') ? 'free' :
          args.paymentIntentId.startsWith('inv') ? 'invoice' : 'stripe',
  amount: paymentResult.amount,
  currency: paymentResult.currency,
});
```

**Important:** This enables three payment flows:
1. `free` or `free_*` → Free registration (no payment)
2. `invoice` or `inv_*` → Pay later via invoice (B2B or B2C)
3. `pi_*` (Stripe) → Immediate card payment

---

### Change 2: Support All Invoice Types ⚡ PRIORITY 2

**File:** `convex/checkoutSessions.ts`
**Function:** `completeCheckoutAndFulfill`
**Location:** Around line 1069-1076 (invoice PDF generation decision)

**Current code:**
```typescript
// 6.6. Determine whether to include invoice PDF in email
const isEmployerBilled = !!crmOrganizationId && behaviorContext?.metadata?.isEmployerBilling === true;
const includeInvoicePDF = !isEmployerBilled; // Skip PDF for employer billing

if (isEmployerBilled) {
  console.log("📋 [completeCheckoutAndFulfill] B2B employer billing detected - skipping invoice PDF");
}
```

**Replace with:**
```typescript
// 6.6. Determine invoice handling based on payment method
const isEmployerBilled = !!crmOrganizationId && behaviorContext?.metadata?.isEmployerBilling === true;
const isManualInvoice = args.paymentIntentId.startsWith('inv_') || args.paymentIntentId === 'invoice';
const isFreeRegistration = args.paymentIntentId === 'free' || args.paymentIntentId.startsWith('free_');

// Invoice PDF logic:
// - Auto-detected employer billing: Skip PDF (they get consolidated invoice later)
// - Manual invoice request (B2B/B2C): Include PDF in email
// - Free registration: No invoice needed
// - Stripe payment: Receipt/invoice included

let includeInvoicePDF = false;
let invoiceType: 'employer' | 'manual_b2b' | 'manual_b2c' | 'receipt' | 'none' = 'none';

if (isEmployerBilled && !isManualInvoice) {
  // Auto-detected employer billing - consolidated invoice later
  includeInvoicePDF = false;
  invoiceType = 'employer';
  console.log("📋 [completeCheckoutAndFulfill] Employer billing - consolidated invoice will be generated later");

} else if (isManualInvoice) {
  // Manual invoice request (B2B or B2C pay-later)
  includeInvoicePDF = true;

  // Determine if B2B or B2C based on presence of CRM organization
  if (crmOrganizationId) {
    invoiceType = 'manual_b2b';
    console.log("📋 [completeCheckoutAndFulfill] Manual B2B invoice - will generate and send PDF");
  } else {
    invoiceType = 'manual_b2c';
    console.log("📋 [completeCheckoutAndFulfill] Manual B2C invoice - will generate and send PDF");
  }

} else if (isFreeRegistration) {
  // Free registration - no invoice needed
  includeInvoicePDF = false;
  invoiceType = 'none';
  console.log("📋 [completeCheckoutAndFulfill] Free registration - no invoice needed");

} else {
  // Stripe payment - include receipt/invoice
  includeInvoicePDF = true;
  invoiceType = 'receipt';
  console.log("📋 [completeCheckoutAndFulfill] Stripe payment - will include receipt/invoice PDF");
}
```

**Important:** This creates invoices for:
- ✅ Manual B2B invoices (company pays later)
- ✅ Manual B2C invoices (individual pays later)
- ✅ Payment receipts (Stripe payments)
- ❌ Employer billing (gets consolidated invoice)
- ❌ Free registrations (no invoice needed)

---

### Change 3: Add Dormant User Creation ⚡ PRIORITY 3

**File:** `convex/checkoutSessions.ts`
**Function:** `completeCheckoutAndFulfill`
**Location:** Around line 786-873 (after CRM contact creation)

**Find this section:**
```typescript
// 4. AUTO-CREATE CRM CONTACT & B2B ORGANIZATION (if applicable)
// Do this BEFORE creating purchase items so we can link them
let crmContactId: Id<"objects"> | undefined;
let crmOrganizationId: Id<"objects"> | undefined;

try {
  const contactResult = await ctx.runMutation(internal.crmIntegrations.autoCreateContactFromCheckoutInternal, {
    checkoutSessionId: args.checkoutSessionId,
  });
  crmContactId = contactResult.contactId;

  // ... rest of organization creation ...
```

**Add AFTER the contactResult section (around line 873):**
```typescript
  crmContactId = contactResult.contactId;

  // ✅ NEW: Create dormant frontend user for guest checkout
  // This allows customers to activate their account later to view tickets/registrations
  let frontendUserId: Id<"objects"> | undefined;
  try {
    console.log("👤 [completeCheckoutAndFulfill] Creating dormant frontend user for guest checkout...");

    // Extract name parts from customerName
    const nameParts = customerName.split(' ');
    const firstName = nameParts[0] || customerName;
    const lastName = nameParts.slice(1).join(' ') || '';

    const userResult = await ctx.runMutation(internal.auth.createOrGetGuestUser, {
      email: customerEmail,
      firstName,
      lastName,
    });

    frontendUserId = userResult.userId;
    console.log(`✅ [completeCheckoutAndFulfill] Created/found dormant frontend user: ${frontendUserId}`);
    console.log(`   Email: ${customerEmail}, Status: ${userResult.isNew ? 'new' : 'existing'}`);
  } catch (userError) {
    console.error("❌ [completeCheckoutAndFulfill] Failed to create frontend user (non-critical):", userError);
    // Don't fail checkout if user creation fails - this is a nice-to-have feature
  }

  // Continue with employer detection...
  // 🔥 FIRST: Check if employer-detection behavior already identified a CRM org
```

**Then update ticket creation (around line 1000):**
```typescript
// Use internal mutation since we're in a backend action (no user session)
const ticketId = await ctx.runMutation(internal.ticketOntology.createTicketInternal, {
  organizationId,
  productId: selectedProduct.productId,
  eventId,
  holderName,
  holderEmail,
  userId: frontendUserId, // ✅ CHANGED: Pass dormant user ID instead of undefined
  customProperties: {
    // ... rest of properties
```

**Also update purchase_item creation (around line 936):**
```typescript
const purchaseItemsResult = await ctx.runMutation(internal.purchaseOntology.createPurchaseItemInternal, {
  organizationId,
  checkoutSessionId: args.checkoutSessionId,
  productId: selectedProduct.productId,
  quantity: selectedProduct.quantity,
  pricePerUnit: selectedProduct.pricePerUnit,
  totalPrice: selectedProduct.totalPrice,
  buyerEmail: customerEmail,
  buyerName: customerName,
  buyerPhone: customerPhone,
  // B2B fields
  buyerTransactionType: transactionType,
  buyerCompanyName: companyName,
  buyerVatNumber: vatNumber,
  crmOrganizationId, // Link to CRM organization if B2B
  fulfillmentType,
  registrationData: undefined, // Will be set below if forms exist
  userId: frontendUserId, // ✅ CHANGED: Pass dormant user ID
});
```

**Important:** This creates a dormant frontend_user that:
- Allows guest to activate account later
- Links to all their tickets and registrations
- Status: "dormant", isPasswordSet: false
- Can be upgraded to active account with password

---

### Change 4: Update Return Response (Add Guest Flag)

**File:** `convex/checkoutSessions.ts`
**Function:** `completeCheckoutAndFulfill`
**Location:** End of function (around line 1128-1136)

**Current return statement:**
```typescript
return {
  success: true,
  purchasedItemIds: createdPurchaseItems, // Generic! Works for any product type
  crmContactId,
  paymentId: paymentResult.paymentId,
  amount: paymentResult.amount,
  currency: paymentResult.currency,
};
```

**Update to:**
```typescript
return {
  success: true,
  purchasedItemIds: createdPurchaseItems, // Generic! Works for any product type
  crmContactId,
  paymentId: paymentResult.paymentId,
  amount: paymentResult.amount,
  currency: paymentResult.currency,
  // ✅ NEW: Indicate if guest registration (for frontend account activation prompt)
  isGuestRegistration: !!frontendUserId,
  frontendUserId, // For debugging/linking
  invoiceType, // 'employer' | 'manual_b2b' | 'manual_b2c' | 'receipt' | 'none'
};
```

---

## Frontend Payment Method Values

Frontend should send one of these `paymentIntentId` values when calling `/api/v1/checkout/confirm`:

| Payment Method | paymentIntentId Value | What Happens |
|----------------|----------------------|--------------|
| Free Event | `"free"` | No payment, immediate fulfillment |
| Pay by Invoice (B2B) | `"invoice"` or `"inv_xyz"` | Creates B2B invoice, pay later |
| Pay by Invoice (B2C) | `"invoice"` or `"inv_xyz"` | Creates B2C invoice, pay later |
| Stripe Payment | `"pi_abc123..."` | Verifies with Stripe, immediate fulfillment |

**Note:** For invoice payments, frontend can generate unique ID like `inv_${Date.now()}` to track requests.

---

## Testing Checklist

After implementation, test these scenarios:

### Free Registration
- [ ] Create session with `paymentMethod: 'free'`
- [ ] Confirm with `paymentIntentId: 'free'`
- [ ] Verify: No payment, tickets created, email sent
- [ ] Verify: Dormant user created with correct email

### Manual B2B Invoice
- [ ] Create session with `paymentMethod: 'invoice'`, includes company name
- [ ] Confirm with `paymentIntentId: 'invoice'`
- [ ] Verify: Invoice PDF generated and sent
- [ ] Verify: CRM organization created
- [ ] Verify: Payment terms from organization settings

### Manual B2C Invoice
- [ ] Create session with `paymentMethod: 'invoice'`, no company
- [ ] Confirm with `paymentIntentId: 'invoice'`
- [ ] Verify: Invoice PDF generated and sent to individual
- [ ] Verify: No CRM organization (just contact)

### Stripe Payment
- [ ] Create session with `paymentMethod: 'stripe'`
- [ ] Complete Stripe payment on frontend
- [ ] Confirm with `paymentIntentId: 'pi_...'`
- [ ] Verify: Payment verified, receipt/invoice sent

### Employer Auto-Detection (Existing)
- [ ] Register with `attendee_category: 'external'`
- [ ] Verify: Employer detected, NO immediate invoice
- [ ] Verify: Tickets marked "awaiting_employer_payment"

---

## Files to Modify

1. **`convex/checkoutSessions.ts`** - Main checkout fulfillment function
   - Line ~770-782: Payment verification
   - Line ~1069-1076: Invoice PDF decision
   - Line ~873: Add dormant user creation
   - Line ~1000: Update ticket creation with userId
   - Line ~936: Update purchase_item creation with userId
   - Line ~1128-1136: Update return statement

2. **`docs/reference_docs/frontend/frontend-checkout-integration.md`** - Update if needed (already created)

---

## Dependencies

**These functions must exist:**
- `internal.auth.createOrGetGuestUser` - From workflows (already implemented)
- `internal.ticketOntology.createTicketInternal` - Existing
- `internal.purchaseOntology.createPurchaseItemInternal` - Existing
- `api.checkoutSessionOntology.failCheckoutSession` - Existing
- Organization payment terms settings - Existing

**Payment Provider Types:**
- From `convex/paymentProviders/types.ts`
- `PaymentVerificationResult` interface

---

## Organization Payment Terms

User confirmed: Use existing organization settings for payment terms.

**Where it's stored:**
- Check `organization.customProperties.defaultPaymentTerms`
- Or `organization.paymentTerms`
- Default to "net30" if not set

**When creating invoices, use:**
```typescript
const paymentTerms = org.customProperties?.defaultPaymentTerms as string ||
                     org.paymentTerms as string ||
                     "net30";
```

---

## Important Notes

1. **All invoice types use same numbering system** - Confirmed by user
2. **No payment restrictions on products** - Configuration at checkout level only
3. **Organization payment terms** - Already implemented, use existing settings
4. **Dormant users** - Non-critical feature, don't fail checkout if it fails
5. **Invoice types**: employer (consolidated), manual_b2b, manual_b2c, receipt, none

---

## After Implementation

1. Run TypeCheck: `npm run typecheck`
2. Run Lint: `npm run lint`
3. Test all 5 scenarios above
4. Update frontend docs if changes needed
5. Create payment rules system proposal (optional future enhancement)
6. Commit with comprehensive message

---

## Git Commit Message Template

```
Add free payment and manual invoice support to checkout system

FEATURES:
- Free registration support (paymentIntentId: 'free')
- Manual B2B invoice support (pay later for companies)
- Manual B2C invoice support (pay later for individuals)
- Dormant frontend user creation for guest checkout
- Payment method detection and routing

CHANGES:
- Modified completeCheckoutAndFulfill payment verification
- Added invoice type detection (employer/manual_b2b/manual_b2c/receipt/none)
- Created dormant users with account activation capability
- Updated ticket and purchase_item creation with userId
- Enhanced return response with guest registration flag

PAYMENT FLOWS SUPPORTED:
1. Free events → paymentIntentId: 'free'
2. Stripe payments → paymentIntentId: 'pi_xxx' (existing)
3. Manual invoices → paymentIntentId: 'invoice' or 'inv_xxx' (new)
4. Employer billing → Auto-detected via behaviors (existing)

GUEST ACCOUNTS:
- Created as status: 'dormant', isPasswordSet: false
- Linked to all tickets and registrations
- Can be activated later by setting password
- Non-critical (won't fail checkout if creation fails)

All invoice types use organization payment terms settings.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## Questions Resolved

✅ Checkout should accept `paymentMethod: "invoice"` regardless of auto-detection?
**Answer:** YES

✅ Auto-detected employers (already works)?
**Answer:** YES

✅ Manual B2B self-pay (needs to be added)?
**Answer:** YES

✅ Possibly B2C pay-later?
**Answer:** YES (confirmed)

✅ B2C invoicing: Is this for "pay later" individuals, or just receipts?
**Answer:** BOTH

✅ Invoice numbering: Should manual invoices use same system as employer invoices?
**Answer:** YES

✅ Payment terms: What default payment terms for manual B2B invoices?
**Answer:** Use organization settings (already implemented)

---

## Ready to Implement!

All requirements clarified. All changes documented. Ready to code! 🚀
