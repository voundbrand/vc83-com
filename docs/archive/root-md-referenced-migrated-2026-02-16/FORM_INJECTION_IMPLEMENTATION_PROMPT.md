# Form Template Step Injection - Implementation Prompt

## 🎯 Objective
Modify the multi-step checkout flow to INJECT custom form template step AFTER customer-info step, instead of replacing/skipping it.

## 📋 Current Behavior (WRONG)
```
Product Selection → Registration Form (if product has form)
                 → Customer Info (if product has NO form)
```

**Problem:** When a product has a form template linked (like HaffSymposium registration), the checkout SKIPS the customer-info step entirely and goes straight to the registration form. This loses valuable B2B data (company name, VAT, billing address).

## ✅ Desired Behavior (CORRECT)
```
Product Selection → Customer Info (ALWAYS)
                 → Registration Form (ONLY if product has form)
                 → Payment
```

**Goal:** Customer-info step is NEVER skipped. Form template is INJECTED as an additional step after customer-info.

---

## 🔧 Implementation Details

### File to Modify
**`src/components/checkout/multi-step-checkout.tsx`**

### Changes Needed

#### 1. Modify `getNextStep()` function (lines 158-215)

**Current Code (lines 160-195):**
```typescript
case "product-selection": {
  const needsForm = stepData.selectedProducts?.some((sp) => {
    const product = linkedProducts.find((p) => p._id === sp.productId);
    return (
      product?.customProperties?.formId &&
      product?.customProperties?.formTiming === "duringCheckout"
    );
  });

  // ❌ WRONG: Skips customer-info if form exists
  if (needsForm) {
    return "registration-form";
  }
  return "customer-info";
}

case "customer-info":
  // After customer info (for products WITHOUT forms), go to payment
  if (paymentProviders.length > 1) {
    return "payment-method";
  }
  return "payment-form";

case "registration-form":
  // After form, check payment method
  if (paymentProviders.length > 1) {
    return "payment-method";
  }
  return "payment-form";
```

**New Code (REPLACE above with):**
```typescript
case "product-selection": {
  // ✅ ALWAYS go to customer-info first (NEVER skip it)
  return "customer-info";
}

case "customer-info": {
  // ✅ AFTER customer-info, check if we need form template
  const needsForm = stepData.selectedProducts?.some((sp) => {
    const product = linkedProducts.find((p) => p._id === sp.productId);
    return (
      product?.customProperties?.formId &&
      product?.customProperties?.formTiming === "duringCheckout"
    );
  });

  // If product has form template, inject it as next step
  if (needsForm) {
    return "registration-form";
  }

  // Otherwise, go straight to payment
  if (paymentProviders.length > 1) {
    return "payment-method";
  }
  return "payment-form";
}

case "registration-form":
  // After form, check payment method
  if (paymentProviders.length > 1) {
    return "payment-method";
  }
  return "payment-form";
```

#### 2. Fix Back Navigation (lines 345-368)

**Current Code:**
```typescript
const handleBack = () => {
  switch (currentStep) {
    case "customer-info":
      setCurrentStep("product-selection");
      break;
    case "registration-form":
      setCurrentStep("product-selection"); // ❌ WRONG: Should go to customer-info
      break;
    // ...
  }
};
```

**New Code:**
```typescript
const handleBack = () => {
  switch (currentStep) {
    case "customer-info":
      setCurrentStep("product-selection");
      break;
    case "registration-form":
      setCurrentStep("customer-info"); // ✅ CORRECT: Go back to customer-info
      break;
    // ... rest unchanged
  }
};
```

---

## 🧪 Testing Checklist

After implementation, test these scenarios:

### Test 1: Product WITHOUT form template
- [ ] Product selection → customer-info → payment
- [ ] Customer-info data is saved
- [ ] Back button works correctly

### Test 2: Product WITH form template (HaffSymposium)
- [ ] Product selection → customer-info → registration-form → payment
- [ ] Customer-info step is NOT skipped
- [ ] Customer-info data is saved
- [ ] Registration form appears AFTER customer-info
- [ ] Back button from registration-form goes to customer-info
- [ ] Form data is saved
- [ ] Both customer-info AND form data are in checkout session

### Test 3: Multiple products (mixed)
- [ ] Mix of products with/without forms
- [ ] Customer-info always shows first
- [ ] Form step appears if ANY product has form

---

## 📝 Notes

1. **No data structure changes needed** - `CheckoutStepData` already supports both `customerInfo` and `formResponses`
2. **Form template will have duplicate fields** - User will manually fix the HaffSymposium template afterward to remove email/name/phone fields
3. **Progress indicator** - Already shows both steps correctly, no changes needed

---

## ✅ Success Criteria

- Customer-info step is NEVER skipped
- B2B data (company, VAT, billing address) is always collected
- Form template appears as ADDITIONAL step when needed
- Back navigation works correctly
- No regression in checkout flow for products without forms

---

## 🚀 Implementation Steps

1. Open `src/components/checkout/multi-step-checkout.tsx`
2. Find the `getNextStep()` function (line 158)
3. Replace the `case "product-selection"` logic (lines 160-195)
4. Update the `case "customer-info"` logic (lines 197-202)
5. Find the `handleBack()` function (line 345)
6. Fix the `case "registration-form"` back navigation (line 357)
7. Run `npm run typecheck` and `npm run lint`
8. Test both scenarios (with and without form template)
9. Verify data is saved correctly in checkout session

---

**Ready to implement!** 🎯
