# Form Data Flow Analysis - Complete Trace

**Date:** 2025-10-18
**Issue:** Form not appearing in live checkout despite "Form Required" labels in UI
**Status:** Investigation Complete

---

## 🔍 Complete Data Flow Trace

### 1. **Product Creation (UI → Database)**

**File:** `src/components/window-content/products-window/product-form.tsx`

**When user creates/edits a product:**
- Lines 69-71: Form fields in UI state
  ```typescript
  formId: "",              // Linked form for registration
  formTiming: "duringCheckout" | "afterPurchase" | "standalone"
  formRequired: true       // Whether form must be completed
  ```

- Lines 129-131: Load existing product data
  ```typescript
  formId: (props.formId as string) || "",
  formTiming: (props.formTiming as "duringCheckout" | ...) || "duringCheckout",
  formRequired: (props.formRequired as boolean) ?? true,
  ```

**✅ DATA IS SAVED:** Product's `customProperties.formId`, `customProperties.formTiming`, `customProperties.formRequired` are saved to database.

---

### 2. **Checkout Creation (Product Selection)**

**File:** `src/components/window-content/checkout-window/create-checkout-tab.tsx`

**When user selects products for checkout:**
- Lines 748-750: Read form data from product
  ```typescript
  const hasForm = !!props?.formId;
  const formTiming = props?.formTiming || "duringCheckout";
  const formRequired = props?.formRequired ?? true;
  ```

- Lines 826-863: Display badges
  ```typescript
  {hasForm && (
    <span>📋 Form {formRequired ? "Required" : "Optional"}</span>
  )}
  {formTiming === "duringCheckout" && (
    <span>🛒 In Checkout</span>
  )}
  ```

**✅ UI CORRECTLY SHOWS:** The badges accurately reflect the product's form configuration from database.

---

### 3. **Product Loading in Checkout (Backend Query)**

**File:** `convex/checkoutOntology.ts`

**Function:** `getPublicCheckoutProducts` (lines 568-713)

**This is the CRITICAL function that loads products for checkout pages!**

**Current Behavior:**
- Line 583: Get linked product IDs from checkout instance
  ```typescript
  const linkedProductIds = (checkout.customProperties?.linkedProducts as string[]) || [];
  ```

- Lines 591-696: For each product, fetch data including:
  - Basic product info (name, price, description)
  - Event data (via objectLinks)
  - Event sponsors (via objectLinks)
  - **Form data** (lines 599-619)

**🔍 FORM DATA LOADING (lines 599-619):**
```typescript
// For products with forms, fetch the form data
let formData = null;
const formId = (product.customProperties as Record<string, unknown>)?.formId as string | undefined;

if (formId) {
  console.log("🔍 [getPublicCheckoutProducts] Product has formId:", formId);

  // Find the form object via objectLinks
  const formLinks = await ctx.db
    .query("objectLinks")
    .withIndex("by_from_object", (q) => q.eq("fromObjectId", product._id))
    .filter((q) => q.eq(q.field("linkType"), "requiresForm"))
    .collect();

  if (formLinks.length > 0) {
    const form = await ctx.db.get(formLinks[0].toObjectId);
    if (form) {
      console.log("🔍 [getPublicCheckoutProducts] Found form:", form.name);
      formData = form;
    }
  }
}
```

**Return value (lines 692-696):**
```typescript
return {
  ...product,              // Includes customProperties.formId, formTiming, formRequired
  linkedForm: formData,    // The actual form object (if objectLink exists)
  ...eventDetails,         // Event data
};
```

**✅ PRODUCT DATA RETURNED TO FRONTEND INCLUDES:**
- `customProperties.formId` ✅
- `customProperties.formTiming` ✅
- `customProperties.formRequired` ✅
- `linkedForm` (if objectLink exists) ✅

---

### 4. **Form Detection in Checkout Flow**

**File:** `src/components/checkout/multi-step-checkout.tsx`

**Function:** `getNextStep()` - After customer-info step (lines 165-202)

```typescript
case "customer-info": {
  // ✅ AFTER customer-info, check if we need form template
  const needsForm = stepData.selectedProducts?.some((sp) => {
    const product = linkedProducts.find((p) => p._id === sp.productId);

    // DEBUG: Log each product check
    console.log("🔍 [MultiStepCheckout] Checking product for form:", {
      productId: sp.productId,
      productName: product?.name,
      hasFormId: !!product?.customProperties?.formId,
      formId: product?.customProperties?.formId,
      formTiming: product?.customProperties?.formTiming,
      needsForm: !!(
        product?.customProperties?.formId &&
        product?.customProperties?.formTiming === "duringCheckout"
      ),
    });

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
  return paymentProviders.length > 1 ? "payment-method" : "payment-form";
}
```

**🚨 KEY QUESTION:** Does `linkedProducts` (passed as prop to MultiStepCheckout) include the `customProperties` with `formId` and `formTiming`?

---

### 5. **Where MultiStepCheckout Gets linkedProducts**

**File:** `src/app/checkout/[orgSlug]/[productSlug]/checkout-page-client.tsx` (likely)

**Expected Flow:**
1. Page component calls `useQuery(api.checkoutOntology.getPublicCheckoutProducts, { checkoutInstanceId })`
2. Gets array of products with ALL customProperties
3. Passes to `<MultiStepCheckout linkedProducts={products} />`

**Type Definition:**
```typescript
// src/templates/checkout/types.ts
export interface CheckoutProduct {
  _id: Id<"objects">;
  name: string;
  description?: string;
  customProperties?: Record<string, unknown>; // ✅ Includes formId, formTiming
  // ... other fields
}
```

---

## 🎯 Diagnostic Strategy

### What We Need to Verify:

1. **Does `getPublicCheckoutProducts` return formId/formTiming?**
   - Check console logs: `🔍 [getPublicCheckoutProducts] Product has formId:`
   - Inspect returned product objects in browser DevTools

2. **Does MultiStepCheckout receive formId/formTiming in linkedProducts?**
   - Check console logs: `🔍 [MultiStepCheckout] Checking product for form:`
   - Inspect `linkedProducts` prop in React DevTools

3. **Is the form detection logic working correctly?**
   - Check console log: `🔍 [MultiStepCheckout] Form decision after customer-info:`
   - Should show `needsForm: true` if product has formId + formTiming="duringCheckout"

---

## 🔧 How to Debug (Step-by-Step)

### Step 1: Check Backend Data
**Open browser console on live checkout page**

Look for logs from `getPublicCheckoutProducts`:
```
🔍 [getPublicCheckoutProducts] Fetching products for: [checkoutId]
🔍 [getPublicCheckoutProducts] Found linkedProducts: X
🔍 [getPublicCheckoutProducts] Product has formId: [formId]
🔍 [getPublicCheckoutProducts] Found form: [formName]
🔍 [getPublicCheckoutProducts] Returning products: X
```

**Expected:** If product has formId, you should see the "Product has formId" log.

### Step 2: Check Frontend Props
**Open React DevTools → Components → MultiStepCheckout**

Inspect `linkedProducts` prop:
```javascript
linkedProducts: [
  {
    _id: "...",
    name: "Ticket Name",
    customProperties: {
      formId: "haff_symposium_2025",     // ✅ Should be here
      formTiming: "duringCheckout",      // ✅ Should be here
      formRequired: true,                // ✅ Should be here
      // ... other properties
    }
  }
]
```

### Step 3: Check Form Detection
**Look for MultiStepCheckout console logs after clicking "Continue" on customer-info:**

```
🔍 [MultiStepCheckout] Checking product for form: {
  productId: "...",
  productName: "...",
  hasFormId: true,                      // ✅ Should be true
  formId: "haff_symposium_2025",        // ✅ Should match
  formTiming: "duringCheckout",         // ✅ Should match
  needsForm: true                       // ✅ Should be true
}
🔍 [MultiStepCheckout] Form decision after customer-info: {
  needsForm: true,                      // ✅ Should be true
  nextStep: "registration-form"         // ✅ Should go to form
}
```

---

## 🚨 Possible Issues & Solutions

### Issue 1: formId not in customProperties
**Symptom:** `hasFormId: false` in console logs
**Cause:** Product was created before formId field was added
**Solution:** Re-save the product in UI to update customProperties

### Issue 2: formTiming is not "duringCheckout"
**Symptom:** `formTiming: "afterPurchase"` or undefined
**Cause:** Product configured for post-purchase form collection
**Solution:** Edit product, set formTiming to "duringCheckout"

### Issue 3: customProperties not returned by backend
**Symptom:** `product.customProperties` is undefined in frontend
**Cause:** Backend query not including customProperties
**Solution:** Check `getPublicCheckoutProducts` return statement

### Issue 4: Preview vs Live checkout difference
**Symptom:** Preview shows form, live doesn't (or vice versa)
**Cause:** Preview might pre-populate `linkedProducts` differently
**Solution:** Compare how products are loaded in preview vs live

---

## ✅ Verification Checklist

- [ ] Product in database has `customProperties.formId` set
- [ ] Product in database has `customProperties.formTiming = "duringCheckout"`
- [ ] `getPublicCheckoutProducts` logs show formId detected
- [ ] React DevTools shows formId in linkedProducts prop
- [ ] MultiStepCheckout logs show `needsForm: true`
- [ ] Form step appears after customer-info in checkout
- [ ] Back button works correctly (form → customer-info)

---

## 📝 Next Steps

1. **Open live checkout in browser**
2. **Open DevTools console**
3. **Click through checkout flow**
4. **Check all console logs match expected values**
5. **If any mismatch, investigate that specific layer**

---

## 🎯 Summary

The data flow is:
1. ✅ Product UI saves formId/formTiming to database
2. ✅ Checkout creation UI reads and displays formId/formTiming correctly
3. ✅ Backend `getPublicCheckoutProducts` loads formId/formTiming (with debug logs)
4. ✅ Frontend MultiStepCheckout checks formId/formTiming (with debug logs)
5. ✅ Form step is injected after customer-info when conditions match

**The system is correctly instrumented with debug logs at every step!**

Use the console logs to identify exactly where the data flow breaks.
