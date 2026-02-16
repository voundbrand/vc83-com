# B2B Invoice Payment Enforcement Plan

## 🎯 Goal
When a product has B2B invoicing configured with employer mapping, automatically enforce invoice payment (skip provider selection) and show a clear message to the customer.

## 📋 Current Flow (What We Have)

### Product Configuration
```typescript
// In product.customProperties.invoiceConfig:
{
  employerSourceField: "attendee_category",      // Which form field contains employer info
  employerMapping: {
    "ameos": "AMEOS Klinikum Ueckermünde",      // Doctor from AMEOS → Invoice AMEOS
    "haffnet": "HaffNet e.V.",                   // Member from HaffNet → Invoice HaffNet
    "external": null                             // External attendee → Personal payment (no invoice)
  },
  defaultPaymentTerms: "net30"                   // Due in 30 days
}
```

### Checkout Flow (What Happens)
1. **Product Selection** - Customer selects product
2. **Customer Info** - Email, name, phone
3. **Registration Form** - Customer fills form (including `attendee_category`)
4. **Payment Method Selection** ⚠️ **PROBLEM: Shows both Stripe & Invoice**
5. **Payment** - Process payment

## 🔴 The Problem

**Scenario**: Doctor from AMEOS Hospital registers for symposium
- Form field `attendee_category` = "ameos"
- Mapping says: "ameos" → "AMEOS Klinikum Ueckermünde"
- **Expected**: Automatically use invoice payment, skip provider selection
- **Current**: Doctor sees both Stripe and Invoice options (confusing!)

**What Should Happen**:
```
┌─────────────────────────────────────────┐
│ Payment Information                     │
├─────────────────────────────────────────┤
│ ✅ Your employer will be invoiced       │
│                                         │
│ An invoice will be sent to:            │
│ AMEOS Klinikum Ueckermünde              │
│                                         │
│ Payment Terms: Net 30 days              │
│ Invoice Reference: INV-2025-001         │
│                                         │
│ You will receive your tickets           │
│ immediately after registration.         │
│                                         │
│        [Complete Registration →]        │
└─────────────────────────────────────────┘
```

## ✅ Solution Design

### Phase 1: Detect B2B Invoice Requirement

**When**: After registration form is submitted (before payment method selection)

**Logic**:
```typescript
// In multi-step-checkout.tsx after form submission
function shouldEnforceInvoicePayment(): {
  enforced: boolean;
  employerName?: string;
  paymentTerms?: string;
  reason?: string;
} {
  // 1. Check if product has invoiceConfig
  const product = linkedProducts.find(p => p._id === selectedProducts[0].productId);
  const invoiceConfig = product?.customProperties?.invoiceConfig;

  if (!invoiceConfig) {
    return { enforced: false };
  }

  // 2. Get value from form response for employer field
  const formResponse = formResponses?.[0]; // First ticket's form
  const employerFieldValue = formResponse?.responses[invoiceConfig.employerSourceField];

  if (!employerFieldValue) {
    return { enforced: false };
  }

  // 3. Check employer mapping
  const mappedEmployerName = invoiceConfig.employerMapping[employerFieldValue];

  // If mapping exists (not null), enforce invoice payment
  if (mappedEmployerName) {
    return {
      enforced: true,
      employerName: mappedEmployerName,
      paymentTerms: invoiceConfig.defaultPaymentTerms,
      reason: "employer_pays"
    };
  }

  // If mapped to null (external attendee), allow personal payment
  return { enforced: false, reason: "personal_payment_allowed" };
}
```

### Phase 2: Modify Checkout Flow

**Option A: Skip Payment Method Selection**
```typescript
const getNextStep = (current: CheckoutStep): CheckoutStep | null => {
  switch (current) {
    case "registration-form": {
      // Check if invoice payment is enforced
      const invoiceEnforcement = shouldEnforceInvoicePayment();

      if (invoiceEnforcement.enforced) {
        // AUTO-SELECT invoice provider
        setSelectedProvider("invoice");

        // SKIP payment-method step entirely
        return "payment-form"; // Go straight to payment
      }

      // Normal flow: show provider selection if multiple providers
      if (availableProviders.length > 1) {
        return "payment-method";
      }
      return "payment-form";
    }
    // ... rest of flow
  }
};
```

**Option B: Show Custom Invoice Enforcement Message**
```typescript
// Create new step: "invoice-enforcement"
case "invoice-enforcement":
  return (
    <InvoiceEnforcementStep
      employerName={invoiceEnforcementData.employerName}
      paymentTerms={invoiceEnforcementData.paymentTerms}
      customerEmail={stepData.customerInfo.email}
      totalAmount={totalAmount}
      currency={currency}
      onComplete={() => {
        setSelectedProvider("invoice");
        handleStepComplete({ selectedPaymentProvider: "invoice" });
      }}
      onBack={handleBack}
    />
  );
```

### Phase 3: Create Invoice Enforcement UI Component

**File**: `src/components/checkout/steps/invoice-enforcement-step.tsx`

```typescript
interface InvoiceEnforcementStepProps {
  employerName: string;
  paymentTerms: string; // "net30", "net60", "net90"
  customerEmail: string;
  totalAmount: number;
  currency: string;
  onComplete: () => void;
  onBack: () => void;
}

export function InvoiceEnforcementStep({ ... }) {
  const paymentTermsDisplay = {
    "net30": "30 days",
    "net60": "60 days",
    "net90": "90 days"
  }[paymentTerms] || "30 days";

  return (
    <div className={styles.stepContainer}>
      {/* Success Icon */}
      <div style={{ textAlign: "center", marginBottom: "2rem" }}>
        <div style={{ fontSize: "4rem" }}>✅</div>
        <h2>Your Employer Will Be Invoiced</h2>
      </div>

      {/* Invoice Details Card */}
      <div className={styles.invoiceCard}>
        <h3>Invoice Details</h3>
        <div className={styles.detailRow}>
          <span>Billed To:</span>
          <strong>{employerName}</strong>
        </div>
        <div className={styles.detailRow}>
          <span>Payment Terms:</span>
          <strong>Net {paymentTermsDisplay}</strong>
        </div>
        <div className={styles.detailRow}>
          <span>Total Amount:</span>
          <strong>{formatPrice(totalAmount, currency)}</strong>
        </div>
        <div className={styles.detailRow}>
          <span>Confirmation Sent To:</span>
          <strong>{customerEmail}</strong>
        </div>
      </div>

      {/* What Happens Next */}
      <div className={styles.infoBox}>
        <h4>📧 What Happens Next</h4>
        <ol>
          <li>An invoice will be sent to {employerName}</li>
          <li>You will receive your tickets immediately</li>
          <li>Your employer has {paymentTermsDisplay} to pay</li>
          <li>Confirmation email will be sent to {customerEmail}</li>
        </ol>
      </div>

      {/* Actions */}
      <div className={styles.actionButtons}>
        <button onClick={onBack} className={styles.secondaryButton}>
          ← Back
        </button>
        <button onClick={onComplete} className={styles.primaryButton}>
          Complete Registration →
        </button>
      </div>
    </div>
  );
}
```

### Phase 4: Update Invoice Payment Form

**File**: `src/components/checkout/steps/payment-form-step.tsx`

Update `InvoicePaymentForm` to show employer name instead of generic message:

```typescript
function InvoicePaymentForm({ ... }) {
  // Get employer name from invoiceEnforcement data
  const employerName = /* extract from product config + form response */;

  return (
    <div>
      {employerName ? (
        <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-6 mb-6">
          <h3>✅ Employer Payment Confirmed</h3>
          <p>Invoice will be sent to: <strong>{employerName}</strong></p>
        </div>
      ) : (
        // Default B2B invoice message
        <div>...</div>
      )}
    </div>
  );
}
```

## 📊 Data Flow

### 1. Product Configuration (Already Done ✅)
```
Product → customProperties.invoiceConfig → {
  employerSourceField,
  employerMapping,
  defaultPaymentTerms
}
```

### 2. Form Submission (Already Done ✅)
```
Customer fills form → formResponses[0].responses → {
  attendee_category: "ameos",
  name: "Dr. Schmidt",
  ...
}
```

### 3. NEW: Invoice Enforcement Check
```
formResponses + invoiceConfig → shouldEnforceInvoicePayment() → {
  enforced: true,
  employerName: "AMEOS Klinikum Ueckermünde",
  paymentTerms: "net30"
}
```

### 4. NEW: Checkout Flow Decision
```
if (invoiceEnforced) {
  autoSelectProvider("invoice");
  skipPaymentMethodSelection();
  showInvoiceEnforcementMessage();
} else {
  showPaymentMethodSelection(); // Normal flow
}
```

## 🛠️ Implementation Steps

### Step 1: Create Invoice Enforcement Logic ✅ (To Do)
- [ ] Add `shouldEnforceInvoicePayment()` helper function
- [ ] Extract employer from form responses
- [ ] Check mapping in invoiceConfig
- [ ] Return enforcement decision + data

### Step 2: Update Checkout Navigation ✅ (To Do)
- [ ] Modify `getNextStep()` to check enforcement
- [ ] Auto-select "invoice" provider when enforced
- [ ] Skip payment-method step when enforced
- [ ] Store enforcement data in checkout session

### Step 3: Create Invoice Enforcement Step UI ✅ (To Do)
- [ ] Create `InvoiceEnforcementStep` component
- [ ] Show employer name, terms, total
- [ ] Display "What Happens Next" instructions
- [ ] Style to match retro theme

### Step 4: Update Payment Form ✅ (To Do)
- [ ] Pass enforcement data to `InvoicePaymentForm`
- [ ] Show employer-specific messaging
- [ ] Include payment terms in confirmation

### Step 5: Test Scenarios ✅ (To Do)
- [ ] Doctor from AMEOS → Auto invoice
- [ ] Member from HaffNet → Auto invoice
- [ ] External attendee → Personal payment (both options)
- [ ] Product without invoiceConfig → Normal flow

## 🎨 UI/UX Considerations

### Clear Communication
- ✅ Large checkmark icon for reassurance
- ✅ Explicit employer name (not just "your employer")
- ✅ Payment terms clearly stated
- ✅ Step-by-step "what happens next"

### No Confusion
- ❌ Don't show payment method selection
- ❌ Don't show Stripe card form
- ✅ Single clear path forward

### Professional Appearance
- Matches existing retro theme
- Purple accent colors for confirmation
- Clean, easy-to-read layout
- Mobile responsive

## 🔮 Future Enhancements

### 1. Multi-Employer Support
If cart has multiple tickets with different employers:
- Show list of all invoices to be generated
- Group tickets by employer
- Show separate totals per employer

### 2. Employer Approval Workflow
Optional setting to require employer approval before registration:
- Send approval request email
- Registration pending until approved
- Tickets delivered after approval

### 3. Custom Payment Terms per Employer
Instead of defaultPaymentTerms, support per-employer terms:
```typescript
employerMapping: {
  "ameos": {
    name: "AMEOS Klinikum Ueckermünde",
    paymentTerms: "net30",
    billingContact: "billing@ameos.de"
  }
}
```

## ❓ Questions to Answer

1. **Mixed carts**: What if user buys multiple products, some with invoice enforcement, some without?
   - **Answer**: Enforce invoice if ANY product requires it

2. **Multiple tickets, different employers**: Doctor brings colleague from different hospital?
   - **✅ ANSWERED**: Block this scenario - show validation error, require separate checkouts

3. **Override option**: Should org owner be able to manually override enforcement?
   - **✅ ANSWERED**: Not needed - org owner configures the rules, so there's nothing to override

4. **Partial enforcement**: What if some attendees pay personally, others via employer?
   - **✅ ANSWERED**: Not supported - all tickets must use same payment method (enforced by mixed employers rule)

## 🏗️ Better Architecture: Payment Rules Engine

### The Problem with Current Approach
The checkout currently has to understand:
- Product configuration format
- Form template structure
- Mapping between form values and employers
- When to enforce, when to allow choice

This creates tight coupling and makes changes brittle.

### The Solution: Abstraction Layer

Create **Payment Rules Engine** (`convex/paymentRulesEngine.ts`) that sits between product/form and checkout:

```typescript
// Checkout only needs to ask ONE question:
const paymentRules = evaluatePaymentRules(session, products, formResponses);

// Then it gets everything it needs:
paymentRules.availableProviders;      // What providers can be used
paymentRules.enforcedProvider;        // If enforced, which one MUST be used
paymentRules.paymentMetadata;         // Display info (employer name, terms, etc.)
paymentRules.validationRules;         // Any blocking validation errors
```

### Key Benefits

1. **Checkout doesn't care about product internals** - Just asks "what payment methods?"
2. **Form changes don't break checkout** - Rules engine handles the mapping
3. **Easy to add new rules** - All logic in one place
4. **Easy to test** - Pure function with clear inputs/outputs
5. **Validation in one place** - Mixed employers, minimums, restrictions, etc.

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     PAYMENT RULES ENGINE                         │
│  (New abstraction layer - handles all payment logic)            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Input:                                                          │
│  - Product configuration                                         │
│  - Form responses                                                │
│  - Cart contents                                                 │
│                                                                  │
│  Output:                                                         │
│  - Available payment methods                                     │
│  - Enforced payment method (if any)                             │
│  - Payment metadata (employer, terms, etc.)                     │
│  - Validation rules                                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
              ↓                                    ↓
    ┌──────────────────┐              ┌──────────────────┐
    │   Product API    │              │  Checkout Flow   │
    │  (Configuration) │              │  (Just renders)  │
    └──────────────────┘              └──────────────────┘
```

### Implementation Created

✅ Created `convex/paymentRulesEngine.ts` with:
- `evaluatePaymentRules()` - Main API
- B2B invoice enforcement logic
- Mixed employers validation
- Extensible for future rules (minimums, geo restrictions, etc.)

### How Checkout Will Use It

```typescript
// In multi-step-checkout.tsx
const paymentRules = evaluatePaymentRules(
  checkoutSession,
  linkedProducts,
  formResponses
);

// Check for blocking validations
if (paymentRules.validationRules.some(r => r.blocksCheckout)) {
  showValidationErrors(paymentRules.validationRules);
  return;
}

// Check if payment is enforced
if (paymentRules.enforcedProvider) {
  // Skip provider selection, go straight to payment form
  setSelectedProvider(paymentRules.enforcedProvider.providerId);
  setPaymentMetadata(paymentRules.paymentMetadata);
  skipToPaymentForm();
} else {
  // Show provider selection
  showPaymentMethodSelection(paymentRules.availableProviders);
}
```

## 📝 Summary

This plan creates a seamless B2B invoicing experience where:
1. ✅ Product owner configures employer mapping
2. ✅ Customer fills registration form (including employer field)
3. ✅ System automatically enforces invoice payment
4. ✅ Customer sees clear confirmation message
5. ✅ No confusion about payment methods
6. ✅ Professional, trustworthy UX

**Next Steps**: Review this plan, confirm approach, then implement! 🚀
