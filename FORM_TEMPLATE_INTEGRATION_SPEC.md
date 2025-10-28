# Form Template Integration Specification
## Multi-Step Checkout Enhancement

**Date:** 2025-10-18
**Status:** Research & Planning Phase
**Goal:** Inject custom form template step into checkout flow WITHOUT replacing customer-info step

---

## 📋 Current State Analysis

### Current Checkout Flow (6 Steps)

```
Step 1: Product Selection
  ↓
Step 2: Customer Information (ALWAYS SHOWN)
  - Email (required)
  - Name (required)
  - Phone (optional)
  - Notes (optional)
  - B2B fields (company, VAT, billing address)
  ↓
Step 2.5: Registration Form (CONDITIONAL - REPLACES Step 2)
  - Only if product has formId + formTiming="duringCheckout"
  - Currently SKIPS customer-info step
  - Collects form-specific data per ticket
  ↓
Step 3: Payment Method Selection (CONDITIONAL)
  - Only if multiple payment providers
  ↓
Step 4: Payment Form
  - Provider-specific payment UI
  ↓
Step 5: Confirmation
  - Success page with tickets/receipt
```

### Current Problem

**File:** `src/components/checkout/multi-step-checkout.tsx:187-194`

```typescript
// Current logic SKIPS customer-info if form exists
if (needsForm) {
  return "registration-form"; // ❌ Goes directly to form
}
return "customer-info"; // ✅ Only shown if NO form
```

**Issue:** When a product has a form template (like HaffSymposium), the checkout:
- ✅ Shows product selection
- ❌ SKIPS customer-info step entirely
- ✅ Goes straight to registration form
- ❌ Loses valuable B2B data collection (company, VAT, billing address)

---

## 🎯 Desired State

### New Checkout Flow (7 Steps - Injected Approach)

```
Step 1: Product Selection
  ↓
Step 2: Customer Information (ALWAYS SHOWN)
  - Email, Name, Phone, Notes
  - B2B: Company, VAT, Billing Address
  - This step is NEVER skipped
  ↓
Step 2.5: Custom Form Template (CONDITIONAL - INJECTED AFTER Step 2)
  - Only if product has formId + formTiming="duringCheckout"
  - Uses HaffSymposium or other custom form templates
  - Collects event-specific data (categories, accommodations, activities)
  - Per-ticket data collection
  ↓
Step 3: Payment Method Selection (CONDITIONAL)
  ↓
Step 4: Payment Form
  ↓
Step 5: Confirmation
```

### Key Requirements

1. **Customer-info ALWAYS runs first**
   - Never skip this step
   - Collect essential customer + B2B data
   - Store in checkout session

2. **Form template INJECTED after customer-info**
   - Only if product has form template linked
   - Appears as additional step
   - Enhances data, doesn't replace it

3. **Data flows through both steps**
   - Customer-info → Basic contact + B2B
   - Form template → Event-specific details
   - Both stored in checkout session

---

## 🏗️ Technical Implementation Strategy

### A. Step Flow Modification

**Current Logic (multi-step-checkout.tsx:158-195):**
```typescript
case "product-selection": {
  const needsForm = /* check for formId */;

  if (needsForm) {
    return "registration-form"; // ❌ Skip customer-info
  }
  return "customer-info";
}

case "customer-info":
  return paymentProviders.length > 1 ? "payment-method" : "payment-form";

case "registration-form":
  return paymentProviders.length > 1 ? "payment-method" : "payment-form";
```

**Proposed New Logic:**
```typescript
case "product-selection": {
  return "customer-info"; // ✅ ALWAYS go to customer-info first
}

case "customer-info": {
  // Check if any product needs form template
  const needsForm = stepData.selectedProducts?.some((sp) => {
    const product = linkedProducts.find((p) => p._id === sp.productId);
    return (
      product?.customProperties?.formId &&
      product?.customProperties?.formTiming === "duringCheckout"
    );
  });

  if (needsForm) {
    return "registration-form"; // ✅ Inject form step AFTER customer-info
  }

  return paymentProviders.length > 1 ? "payment-method" : "payment-form";
}

case "registration-form":
  return paymentProviders.length > 1 ? "payment-method" : "payment-form";
```

### B. Data Structure Changes

**Current CheckoutStepData (multi-step-checkout.tsx:31-96):**
```typescript
export interface CheckoutStepData {
  // Step 2: Customer Information
  customerInfo?: {
    email: string;
    name: string;
    phone?: string;
    notes?: string;
    transactionType?: "B2C" | "B2B";
    companyName?: string;
    vatNumber?: string;
    billingAddress?: { /* ... */ };
  };

  // Step 2.5: Registration Form
  formResponses?: Array<{
    productId: Id<"objects">;
    ticketNumber: number;
    formId: string;
    responses: Record<string, unknown>;
    addedCosts: number;
    submittedAt: number;
  }>;
}
```

**No changes needed!** ✅ Both data structures already exist separately.

### C. Step Progress Indicator

**Current Progress Bar (multi-step-checkout.tsx:494-525):**
```typescript
const visibleSteps = [
  { key: "product-selection", label: "Products", visible: true },
  { key: "customer-info", label: "Information", visible: true },
  {
    key: "registration-form",
    label: "Registration",
    visible: (stepData.formResponses?.length > 0) || currentStep === "registration-form",
  },
  // ...
];
```

**Issue:** Progress indicator currently shows registration-form as REPLACING customer-info.

**Proposed Change:**
```typescript
const visibleSteps = [
  { key: "product-selection", label: "Products", visible: true },
  { key: "customer-info", label: "Information", visible: true }, // ✅ Always visible
  {
    key: "registration-form",
    label: "Event Details", // Better label
    visible: hasFormTemplate || currentStep === "registration-form",
  },
  // ...
];
```

### D. Back Navigation

**Current Behavior:**
- From registration-form → back to product-selection ❌

**Desired Behavior:**
- From registration-form → back to customer-info ✅

**Change in RegistrationFormStep (registration-form-step.tsx:51):**
```typescript
// Already has onBack prop - just needs proper wiring
export function RegistrationFormStep({
  // ...
  onBack, // ✅ This should navigate to customer-info now
}: RegistrationFormStepProps) {
```

---

## 📊 HaffSymposium Form Analysis

### Form Structure

**File:** `src/templates/forms/haffsymposium-registration/schema.ts`

**Sections:**
1. **Category Selection** (attendee type: external, AMEOS employee, HaffNet member, speaker, sponsor, organizer)
2. **Personal Info** (salutation, title, first/last name, phone, email, organization)
3. **Arrival Times** (Friday/Saturday arrival)
4. **Accommodation** (hotel room, sharing preferences)
5. **Event Activities** (Friday activities, Saturday activities, meals)
6. **Dietary Requirements**
7. **Additional Info** (special requests, privacy consent)

### Data Collection Strategy

**Customer-info step collects:**
- ✅ Email
- ✅ Full name
- ✅ Phone
- ✅ Company (for B2B)
- ✅ VAT number
- ✅ Billing address

**HaffSymposium form collects:**
- ✅ Attendee category (external/employee/partner/speaker/sponsor/orga)
- ✅ Title (Dr., Prof., etc.)
- ✅ Arrival times
- ✅ Accommodation preferences
- ✅ Activity selections
- ✅ Dietary requirements
- ✅ Special requests

**Overlap:** Email and name appear in BOTH steps!

### Handling Overlapping Fields

**Option 1: Pre-populate form from customer-info** ✅ RECOMMENDED
```typescript
// In RegistrationFormStep, pre-fill email/name from stepData.customerInfo
const initialFormData = {
  private_email: stepData.customerInfo?.email,
  first_name: extractFirstName(stepData.customerInfo?.name),
  last_name: extractLastName(stepData.customerInfo?.name),
  mobile_phone: stepData.customerInfo?.phone,
};
```

**Option 2: Hide duplicate fields in form**
- Modify form renderer to skip email/name fields
- Use values from customer-info automatically

**Recommendation:** Option 1 - Pre-populate but allow editing for flexibility.

---

## 🔄 Implementation Phases

### Phase 1: Step Flow Refactor ✅ SAFE
**Goal:** Make customer-info always run first

**Files to modify:**
- `src/components/checkout/multi-step-checkout.tsx`
  - Update `getNextStep()` logic (lines 158-195)
  - Ensure customer-info → registration-form flow

**Testing:**
- ✅ Products without forms → customer-info → payment
- ✅ Products with forms → customer-info → registration-form → payment
- ✅ Back navigation works correctly

### Phase 2: Data Pre-population ✅ ENHANCEMENT
**Goal:** Pre-fill form template with customer-info data

**Files to modify:**
- `src/components/checkout/steps/registration-form-step.tsx`
  - Accept `customerInfo` prop
  - Pre-populate overlapping fields

**Testing:**
- ✅ Email/name auto-filled in form
- ✅ User can edit pre-filled values
- ✅ Form validation still works

### Phase 3: Progress Indicator Polish ✅ UX
**Goal:** Better labels and visibility

**Files to modify:**
- `src/components/checkout/multi-step-checkout.tsx`
  - Update progress bar labels
  - Ensure both steps show in sequence

**Testing:**
- ✅ Progress indicator shows both steps
- ✅ Labels are clear ("Information" → "Event Details")

---

## ⚠️ Risks & Considerations

### 1. Breaking Changes
**Risk:** Existing checkouts in progress might break
**Mitigation:** Deploy during low-traffic period, test thoroughly

### 2. Data Duplication
**Risk:** Email/name collected twice
**Mitigation:** Pre-populate form to reduce friction

### 3. Step Length
**Risk:** Checkout feels too long with extra step
**Mitigation:** Progress bar shows clear advancement

### 4. Mobile UX
**Risk:** Long forms on mobile are painful
**Mitigation:** Ensure responsive design, test on devices

---

## ✅ Success Criteria

1. **Customer-info ALWAYS runs** - Never skipped
2. **B2B data collected** - Company, VAT, billing address captured
3. **Form template works** - HaffSymposium form displays correctly
4. **Data flows correctly** - Both steps save to checkout session
5. **No regression** - Simple products (no form) still work
6. **Back navigation** - Can go back from form to customer-info

---

## 📝 Next Steps (Implementation)

1. ✅ Get approval on this specification
2. 🔨 Implement Phase 1 (Step flow refactor)
3. 🔨 Test Phase 1 thoroughly
4. 🔨 Implement Phase 2 (Data pre-population)
5. 🔨 Implement Phase 3 (Progress polish)
6. 🧪 End-to-end testing with real products
7. 🚀 Deploy to production

---

## 📚 Related Files

- `src/components/checkout/multi-step-checkout.tsx` - Main checkout orchestrator
- `src/components/checkout/steps/customer-info-step.tsx` - Step 2 component
- `src/components/checkout/steps/registration-form-step.tsx` - Step 2.5 component
- `src/templates/forms/haffsymposium-registration/schema.ts` - Form template
- `convex/checkoutSessionOntology.ts` - Backend session management

---

**Status:** ✅ Research Complete - Ready for Implementation Review
