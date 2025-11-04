# Workflow & Behavior System Migration Analysis

## Executive Summary

You've built powerful product and checkout configuration UIs that are **tightly coupled** with custom code. The goal is to **decouple** this logic into reusable **workflow behaviors** that can be configured in the new **Workflow Builder UI**.

---

## Current System: Tight Coupling Problem

### 1. **Product Form UI** ([product-form.tsx](src/components/window-content/products-window/product-form.tsx))

#### What's Tightly Coupled:

| Feature | Current Location | Tight Coupling Issue |
|---------|------------------|---------------------|
| **Registration Form Linking** | Lines 692-781 | Form selection + timing + required flag hardcoded into product |
| **Product Add-ons** | Lines 784-789 (AddonManager) | Add-ons tied to specific form fields in product config |
| **B2B Invoicing / Employer Mapping** | Lines 792-800 (InvoicingConfigSection) | Employer detection + CRM mapping hardcoded per product |

#### Current Behavior:
```typescript
// TIGHTLY COUPLED: Product directly stores form, addons, and invoice config
customProperties: {
  formId: "form_abc",
  formTiming: "duringCheckout",
  formRequired: true,

  addons: [
    {
      id: "addon-boat",
      name: "UCRA Evening Event",
      pricePerUnit: 3000,
      formFieldIds: ["ucra_participants_external"],
      formFieldMapping: { "0": 0, "1": 1, "2": 2 }
    }
  ],

  invoiceConfig: {
    employerSourceField: "attendee_category",
    employerMapping: {
      "BDE Students": "org_j975...",
      "Others": null
    },
    defaultPaymentTerms: "net30"
  }
}
```

**Problem:** This config is **product-specific** and **not reusable**. If you want to:
- Use the same employer mapping for 5 different products → Copy/paste 5 times
- Change the mapping → Update 5 different product records
- Apply the same behavior to a **form** or **checkout** → Can't, it's locked to products

---

### 2. **Checkout Form UI** (Old checkout)

#### What's Tightly Coupled:

| Feature | Current Location | Tight Coupling Issue |
|---------|------------------|---------------------|
| **Product Linking** | Checkout configuration | Products linked at checkout level, but form comes through product |
| **Payment Providers** | `paymentProviders` array | Hardcoded provider selection in checkout config |
| **B2B Invoice Toggle** | `forceB2B` boolean | Manual boolean toggle instead of behavior-driven |

#### Current Behavior:
```typescript
// Checkout Instance (checkoutOntology.ts lines 89-101)
configuration: {
  paymentProviders: ["stripe", "invoice"], // Hardcoded providers
  linkedProducts: ["product_1", "product_2"], // Products linked here
  forceB2B: true, // Manual toggle for B2B mode
  settings: {
    maxQuantityPerOrder: 10,
    requiresAccount: false,
  }
}
```

**Problem:**
- Form connection happens through `product.customProperties.formId` (lines 692-726 of product-form.tsx)
- Add-on logic happens through `product.customProperties.addons` (lines 784-789)
- Invoice mapping happens through `product.customProperties.invoiceConfig` (lines 792-800)
- **Everything is scattered** across product config instead of being orchestrated by a workflow

---

## New System: Decoupled Workflows & Behaviors

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    WORKFLOW BUILDER UI                       │
│  (workflows-window/workflow-builder/)                       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    WORKFLOW ONTOLOGY                         │
│  (convex/workflows/workflowOntology.ts)                     │
│  - Stores workflow definitions                              │
│  - Triggers: checkout_start, form_submit, etc.              │
│  - Behaviors: Array of behavior configs                     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    BEHAVIOR ENGINE                           │
│  (src/lib/behaviors/)                                       │
│  - Executes behaviors in sequence                           │
│  - Returns actions to perform                               │
│  - No tight coupling to products/checkouts                  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    CHECKOUT ADAPTER                          │
│  (src/lib/behaviors/adapters/checkout-integration.ts)      │
│  - Integrates behaviors with checkout flow                  │
│  - Can use workflow behaviors OR product behaviors          │
└─────────────────────────────────────────────────────────────┘
```

---

## Migration Strategy: What to Keep vs. What to Move

### ✅ **Keep in Product UI**

These settings are inherent to the product itself and should stay:

| Setting | Why Keep It | Location |
|---------|-------------|----------|
| **Price, Currency, Inventory** | Core product attributes | Lines 507-582 |
| **Tax Settings** (taxable, taxCode, taxBehavior) | Product-level tax config | Lines 584-690 |
| **Ticket Settings** (sales dates, order limits, visibility) | Product-specific constraints | Lines 802-987 |
| **Event Association** | Product → Event relationship | Lines 809-856 |

**Reason:** These are **product metadata**, not business logic behaviors.

---

### 🔄 **Migrate to Workflow Behaviors**

These settings are **business logic** that should be orchestrated by workflows:

#### 1. **Form Linking Behavior** (NEW)

**Current:** Lines 692-781 in product-form.tsx

**New Behavior Type:** `form_linking`

```typescript
// NEW BEHAVIOR DEFINITION
{
  type: "form_linking",
  priority: 100,
  config: {
    formId: "form_abc",
    timing: "duringCheckout", // duringCheckout | afterPurchase | standalone
    required: true,
    triggerConditions: {
      productSubtype: ["ticket"], // Only for tickets
      minQuantity: 1,
    }
  }
}
```

**What it does:**
- Determines when and if a form should be shown
- Can apply to ANY object (product, checkout, event)
- Reusable across multiple products

**UI Location:** Workflow Builder → Behavior Config Panel

---

#### 2. **Add-on Calculation Behavior** (NEW)

**Current:** Lines 784-789 (AddonManager)

**New Behavior Type:** `addon_calculation`

```typescript
// NEW BEHAVIOR DEFINITION
{
  type: "addon_calculation",
  priority: 90,
  config: {
    addons: [
      {
        id: "addon-boat",
        name: "UCRA Evening Event",
        pricePerUnit: 3000,
        currency: "EUR",
        taxable: true,
        formFieldIds: ["ucra_participants_external", "ucra_participants_bde"],
        formFieldMapping: { "0": 0, "1": 1, "2": 2 },
        maxQuantity: 10,
      }
    ],
    calculationStrategy: "sum", // sum | max | custom
  }
}
```

**What it does:**
- Calculates add-on quantities based on form responses
- Adds line items to cart
- Works with ANY form field, not just product-specific ones

**Why this is better:**
- One behavior can apply to **multiple products** sharing the same form
- Reusable across different checkouts
- Can be tested and versioned independently

---

#### 3. **Employer Detection Behavior** (EXISTING ✅)

**Current:** Lines 792-800 (InvoicingConfigSection)

**Already Implemented:** `src/lib/behaviors/handlers/employer-detection.ts`

**Keep in Product UI for now:** Only show the form field selection and mapping UI, but execute via workflow behavior

**Workflow Behavior:**
```typescript
{
  type: "employer_detection",
  priority: 80,
  config: {
    employerSourceField: "attendee_category",
    employerMapping: {
      "BDE Students": "org_j975...",
      "AMEOS": "org_k123...",
      "Others": null
    },
    autoFillBillingAddress: true,
  }
}
```

**Integration:**
- Product UI can still show the config (for backwards compatibility)
- But execution happens via workflow behavior at checkout time
- This allows the **same mapping to be reused** across multiple products

---

#### 4. **Invoice Mapping Behavior** (EXISTING ✅)

**Current:** Implied by employer detection in product-form.tsx

**Already Implemented:** `src/lib/behaviors/handlers/invoice-mapping.ts`

**Workflow Behavior:**
```typescript
{
  type: "invoice_mapping",
  priority: 70,
  config: {
    organizationSourceField: "attendee_category",
    organizationMapping: {
      "BDE Students": "org_j975...",
      "AMEOS": "org_k123...",
    },
    defaultPaymentTerms: "net30",
    requireMapping: false,
  }
}
```

**What it does:**
- Creates invoices for B2B customers
- Skips payment step in checkout
- Returns `shouldSkipPayment: true` to checkout flow

---

### 🎯 **Hybrid Approach: Transition Strategy**

Since you have existing products with hardcoded configs, use a **dual-mode system**:

#### Phase 1: Backwards Compatibility (Current)
```typescript
// In checkout-integration.ts (lines 86-110)
export async function executeCheckoutBehaviors(
  context: CheckoutBehaviorContext,
  workflowBehaviors?: Behavior[] // NEW: from workflow system
): Promise<BehaviorExecutionResult> {

  // PRIORITY 1: Use workflow behaviors if available
  if (workflowBehaviors && workflowBehaviors.length > 0) {
    console.log("⚡ Using workflow-defined behaviors");
    return behaviorRegistry.executeMany(workflowBehaviors, behaviorContext);
  }

  // PRIORITY 2: Fall back to product-level behaviors (legacy)
  console.log("📦 Using product-level behaviors (legacy)");
  return behaviorRegistry.executeMany(productBehaviors, behaviorContext);
}
```

**This is already implemented!** (See behavior-driven/index.tsx lines 86-126)

#### Phase 2: Migration Path
1. **Keep product UI functional** - Don't break existing products
2. **Add workflow builder** - New products use workflow behaviors
3. **Gradual migration** - Offer "Migrate to Workflow" button in product UI
4. **Deprecation** - Eventually phase out product-level behavior configs

---

## Implementation Plan

### Step 1: Create Missing Behaviors ⚠️ **REQUIRED**

You need to implement these behaviors:

#### 1.1 **Form Linking Behavior** (NEW - Priority P0)

```typescript
// src/lib/behaviors/handlers/form-linking.ts
export const formLinkingHandler: BehaviorHandler<
  FormLinkingConfig,
  ExtractedFormData,
  FormLinkingResult
> = {
  type: "form_linking",
  name: "Form Linking",
  description: "Determines when and if forms should be shown in checkout",

  extract: (config, inputs, context) => {
    // Extract form requirements from context
    return {
      formId: config.formId,
      timing: config.timing,
      required: config.required,
    };
  },

  apply: (config, extracted, context) => {
    return {
      success: true,
      data: {
        formId: config.formId,
        shouldShow: true, // Can add logic to conditionally show
        timing: config.timing,
        required: config.required,
      },
      modifiedContext: {
        workflowData: {
          ...context.workflowData,
          linkedFormId: config.formId,
          formTiming: config.timing,
        },
      },
    };
  },

  validate: (config) => {
    const errors = [];
    if (!config.formId) errors.push({ field: "formId", code: "required", message: "Form ID is required" });
    return errors;
  },
};
```

#### 1.2 **Add-on Calculation Behavior** (NEW - Priority P0)

```typescript
// src/lib/behaviors/handlers/addon-calculation.ts
export const addonCalculationHandler: BehaviorHandler<
  AddonCalculationConfig,
  ExtractedAddonData,
  AddonCalculationResult
> = {
  type: "addon_calculation",
  name: "Add-on Calculation",
  description: "Calculates add-on quantities and prices based on form responses",

  extract: (config, inputs, context) => {
    const quantities: Record<string, number> = {};

    // For each addon, extract form field values and map to quantities
    for (const addon of config.addons) {
      let totalQuantity = 0;

      for (const fieldId of addon.formFieldIds) {
        // Find form response for this field
        const response = inputs.find(i => i.type === "form" && i.data[fieldId]);
        if (response) {
          const value = response.data[fieldId];
          const mappedQty = addon.formFieldMapping[String(value)] || 0;
          totalQuantity += mappedQty;
        }
      }

      quantities[addon.id] = totalQuantity;
    }

    return { quantities };
  },

  apply: (config, extracted, context) => {
    const lineItems = [];

    for (const addon of config.addons) {
      const quantity = extracted.quantities[addon.id] || 0;
      if (quantity > 0) {
        lineItems.push({
          id: addon.id,
          name: addon.name,
          quantity,
          pricePerUnit: addon.pricePerUnit,
          currency: addon.currency,
          taxable: addon.taxable,
        });
      }
    }

    return {
      success: true,
      data: { lineItems },
      actions: [
        {
          type: "add_line_items",
          payload: { lineItems },
          when: "immediate",
        },
      ],
    };
  },

  validate: (config) => {
    const errors = [];
    if (!config.addons || config.addons.length === 0) {
      errors.push({ field: "addons", code: "required", message: "At least one addon is required" });
    }
    return errors;
  },
};
```

---

### Step 2: Update Behavior Config Panel UI ✅ **PARTIALLY DONE**

The behavior config panel (behavior-config-panel.tsx) needs to support these new behavior types:

**Already Supports:**
- ✅ `employer_detection` (lines 290-336)
- ✅ `invoice_mapping` (lines 345-391)

**Needs to Add:**
- ⚠️ `form_linking` - Form selection + timing + required toggle
- ⚠️ `addon_calculation` - Add-on manager UI (can reuse from product-form!)

---

### Step 3: Product UI Migration Path

#### Option A: **Keep Product UI as-is** (Backwards Compatible)
- Product form continues to work
- Behaviors execute from `product.customProperties` (legacy mode)
- Add banner: "🎯 **Tip:** Use Workflow Builder for reusable behavior configs"

#### Option B: **Add Migration Helper** (Recommended)
- Add button in product form: "📦 → ⚡ Migrate to Workflow"
- Creates workflow from product's behaviors
- Links product to workflow
- Removes behavior config from product (keeps clean)

#### Option C: **Hybrid Mode** (Safest)
- Keep product UI for simple cases (1 product, 1 form)
- Use workflow builder for complex cases (multiple products, shared behaviors)
- System checks workflow behaviors first, then falls back to product behaviors

**Recommendation:** **Option C** is already implemented! (See behavior-driven/index.tsx lines 86-126)

---

### Step 4: Checkout Form Simplification

**Current Checkout UI Issues:**
- `linkedProducts` is at checkout level (line 93 in checkoutOntology.ts)
- But form connection happens through product (product-form.tsx line 309)
- This creates confusion: "Is the form linked to the product or the checkout?"

**Proposed Simplification:**

```typescript
// Checkout Instance (simplified)
{
  type: "checkout_instance",
  name: "L4YERCAK3 Live 2024",
  customProperties: {
    templateCode: "event-ticket-checkout",
    paymentProviders: ["stripe", "invoice"],
    linkedProducts: ["product_1", "product_2"],

    // ❌ REMOVE: Don't need forceB2B - use workflow behavior instead
    // forceB2B: true,

    // ✅ ADD: Link to workflow
    workflowId: "workflow_abc", // Workflow handles all business logic
  }
}
```

**Workflow handles everything:**
- Form linking (which forms, when, required?)
- Add-on calculation (based on form responses)
- Employer detection (extract from form)
- Invoice mapping (create invoice for employer)
- Payment rules (skip payment if invoice, apply discounts, etc.)

**Checkout just handles:**
- Template selection
- Payment provider configuration (Stripe API keys, etc.)
- Branding/theme
- Product selection

---

## Summary: What Goes Where

| Feature | Current Location | New Location | Priority |
|---------|------------------|--------------|----------|
| **Price, Tax, Inventory** | Product UI | ✅ **Keep in Product UI** | - |
| **Ticket Settings** | Product UI | ✅ **Keep in Product UI** | - |
| **Form Linking** | Product UI | 🔄 **Move to Workflow** | P0 |
| **Add-ons** | Product UI | 🔄 **Move to Workflow** | P0 |
| **Employer Mapping** | Product UI | 🔄 **Move to Workflow** (already exists!) | P1 |
| **Invoice Mapping** | Product UI | 🔄 **Move to Workflow** (already exists!) | P1 |
| **Payment Providers** | Checkout UI | ✅ **Keep in Checkout UI** | - |
| **Product Selection** | Checkout UI | ✅ **Keep in Checkout UI** | - |
| **B2B Toggle** | Checkout UI | ❌ **Remove** (use workflow) | P2 |

---

## Next Steps

### Immediate (P0)
1. ✅ **Object Selector** - Add forms and checkouts (DONE!)
2. ⚠️ **Implement `form_linking` behavior** - Create handler + UI
3. ⚠️ **Implement `addon_calculation` behavior** - Create handler + UI
4. ⚠️ **Update Behavior Config Panel** - Add UI for new behaviors

### Short-term (P1)
5. Test workflow behaviors with real checkout flow
6. Add "Migrate to Workflow" button in product form
7. Update documentation

### Long-term (P2)
8. Phase out product-level behavior configs
9. Simplify checkout configuration
10. Add workflow templates for common patterns

---

## Questions to Answer

1. **Should we remove behavior configs from Product UI immediately or keep for backwards compatibility?**
   - Recommendation: Keep for backwards compatibility, add migration path

2. **Should Add-ons always be part of products, or can they be workflow behaviors?**
   - Recommendation: Both! Simple add-ons stay in product, complex add-on logic (multiple products, conditional rules) goes to workflow

3. **How do we handle the product → form connection in the new system?**
   - Recommendation: Workflow behavior determines form linking at runtime, not at product definition time

4. **Should checkout `forceB2B` be removed entirely?**
   - Recommendation: Yes! Replace with workflow behavior that detects B2B from form response

Would you like me to start implementing the missing behaviors (`form_linking` and `addon_calculation`)?
