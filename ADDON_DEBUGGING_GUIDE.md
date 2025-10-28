# 🔍 Addon Debugging Guide - Why Addons Don't Show in Payment Step

## Issue
After moving addons from checkout configuration to product configuration, addons are not displaying in the payment step.

## Data Flow Analysis

### 1️⃣ Product Creation (✅ Working)
**Location:** [product-form.tsx:218](src/components/window-content/products-window/product-form.tsx#L218)
```typescript
// When saving a product, addons are saved to:
customProperties.addons = formData.addons;
```

**Expected Structure:**
```typescript
product.customProperties = {
  addons: [
    {
      id: "ucra-evening-event",
      name: "UCRA Evening Event",
      pricePerUnit: 3000, // €30.00 in cents
      currency: "EUR",
      taxable: true,
      formFieldId: "ucra_participants_external",
      formFieldMapping: { "0": 0, "1": 1, "2": 2 }
    }
  ]
}
```

### 2️⃣ Registration Step (✅ Working)
**Location:** [registration-form-step.tsx:168](src/components/checkout/steps/registration-form-step.tsx#L168)
```typescript
// Reads addon config from product
const productAddons = (product.customProperties as { addons?: ProductAddon[] })?.addons;

// Calculates addon costs during form submission
const calculatedAddons = calculateAddonsFromResponses(productAddons, responses);
```

**Debug Log Added:** Line 176-182 logs addon calculation results

### 3️⃣ Payment Step (❓ Needs Debugging)
**Location:** [payment-form-step.tsx:231](src/components/checkout/steps/payment-form-step.tsx#L231)
```typescript
// Should read addons from formResponses
const allAddons = (formResponses || []).flatMap((fr) => {
  const product = linkedProducts.find((p) => p._id === fr.productId);
  const productAddons = product.customProperties?.addons;
  return calculateAddonsFromResponses(productAddons, fr.responses);
});
```

**Debug Logs Added:** Lines 233-260 now show detailed addon processing

## Debugging Steps

### Step 1: Check Product Has Addons
Open the Products window and inspect a product:

1. Look for the "Addons" section
2. Verify at least one addon is configured
3. Check the addon has:
   - ✅ Name
   - ✅ Price Per Unit (in cents)
   - ✅ Form Field ID
   - ✅ Form Field Mapping (e.g., `{"0": 0, "1": 1, "2": 2}`)

### Step 2: Check Form Responses
Open browser console during checkout and look for:

```
🔧 [RegistrationForm] Calculated addons: {
  productId: "...",
  productName: "...",
  addonConfigCount: X,  // Should be > 0
  calculatedAddons: [...], // Should have entries if user selected addon
  totalCost: 3000 // Should match addon price if selected
}
```

**Key Questions:**
- Is `addonConfigCount > 0`? → Product has addons configured ✅
- Are `calculatedAddons` populated? → User selected addon ✅
- Is `totalCost > 0`? → Addon price calculated correctly ✅

### Step 3: Check Payment Step Receives Addons
Open browser console at payment step and look for NEW debug logs:

```
🔍 [PaymentStep] No addons configured for product: {
  productId: "...",
  productName: "...",
  customProperties: {...} // Should contain addons: []
}
```

**If you see this message:**
- Check `customProperties` object
- Verify `addons` key exists
- Verify `addons` is an array with items

```
🔍 [PaymentStep] Calculated addons: {
  productId: "...",
  productName: "...",
  addonConfigCount: X,
  formResponses: {...}, // Check if field IDs match
  calculatedAddons: [...] // Should match registration step
}
```

**If calculatedAddons is empty:**
- Check `formResponses` field IDs match addon `formFieldId`
- Check field values match `formFieldMapping` keys
- Example: If formFieldMapping is `{"0": 0, "1": 1}`, form must have value "0" or "1"

```
🔍 [PaymentStep] All addons collected: [...]
```

**This is the final addon list** that should display in payment step.

## Common Issues & Solutions

### Issue 1: "No addons configured for product"
**Cause:** Product's `customProperties.addons` is undefined or empty

**Solution:**
1. Open product in Products window
2. Click "Manage Addons" button
3. Add at least one addon
4. Save product
5. Try checkout again

### Issue 2: "Addon config exists but calculated addons empty"
**Cause:** Form field ID mismatch

**Example:**
```typescript
// Addon config says:
formFieldId: "ucra_participants_external"

// But form response has:
responses: { "boat_trip": 1 } // ❌ Different field ID!

// Should be:
responses: { "ucra_participants_external": 1 } // ✅ Matches!
```

**Solution:**
1. Check addon's `formFieldId` in product configuration
2. Check form template field IDs in Form Templates window
3. Ensure they EXACTLY match (case-sensitive!)

### Issue 3: "Form value doesn't map to addon quantity"
**Cause:** Form field value not in `formFieldMapping`

**Example:**
```typescript
// Addon mapping:
formFieldMapping: { "0": 0, "1": 1, "2": 2 }

// Form sends:
responses: { "ucra_participants_external": "yes" } // ❌ "yes" not in mapping!

// Should be:
responses: { "ucra_participants_external": "1" } // ✅ "1" maps to quantity 1
```

**Solution:**
1. Check form template field type (radio, select, checkbox)
2. Verify field sends values that match mapping keys
3. For radio buttons: Use values like "0", "1", "2"
4. For checkboxes: Use "yes"/"no" or "true"/"false"

## Testing Checklist

- [ ] Product has at least one addon configured
- [ ] Addon has valid `formFieldId`
- [ ] Addon has valid `formFieldMapping`
- [ ] Form template has field with matching ID
- [ ] Form field sends values that exist in mapping
- [ ] Registration step shows correct addon cost
- [ ] Payment step shows addon in Order Summary
- [ ] Payment step includes addon in total

## File References

### Frontend Components
- [addon-manager.tsx](src/components/window-content/products-window/addon-manager.tsx) - Addon configuration UI
- [product-form.tsx](src/components/window-content/products-window/product-form.tsx#L218) - Product save logic
- [registration-form-step.tsx](src/components/checkout/steps/registration-form-step.tsx#L168) - Addon calculation during registration
- [payment-form-step.tsx](src/components/checkout/steps/payment-form-step.tsx#L231) - Addon display in payment

### Type Definitions
- [product-addons.ts](src/types/product-addons.ts) - ProductAddon interface & helpers

### Helper Functions
- `calculateAddonsFromResponses()` - Calculates which addons user selected
- `calculateTotalAddonCost()` - Sums up addon prices

## Next Steps

1. **Run the checkout flow** and watch browser console
2. **Look for the new debug logs** starting with 🔍
3. **Copy the console output** and paste it below
4. **Identify which step fails:**
   - Product has no addons? → Configure addons in product
   - Addon calculation fails? → Fix field ID mismatch
   - Payment step doesn't receive data? → Check formResponses flow

## Console Output (Paste Here)
```
<!-- Paste browser console output here after testing -->
```
