# Workflow Behaviors Implementation Plan

## Overview
Complete the workflow behavior system to replace tightly-coupled product/checkout logic with reusable, configurable behaviors through the Workflow Builder UI.

---

## Current State

### ✅ What's Working
- Workflow Builder UI shell (canvas, object selector, behavior panel)
- Object selector shows products, forms, checkouts ✅ (DONE!)
- Behavior registry system exists (`src/lib/behaviors/`)
- 2 behaviors implemented but NOT properly integrated:
  - `employer_detection` (src/lib/behaviors/handlers/employer-detection.ts)
  - `invoice_mapping` (src/lib/behaviors/handlers/invoice-mapping.ts)
- Checkout adapter can use workflow behaviors OR product behaviors (fallback)

### ⚠️ What's Broken
- **BehaviorConfigPanel shows JSON editor** (line 224-226 of behavior-config-panel.tsx)
  - No proper form inputs for configuring behaviors
  - Users have to manually edit JSON (bad UX)
- **Missing 2 critical behaviors:**
  - `form_linking` - Determines which forms to show in checkout
  - `addon_calculation` - Calculates add-on quantities from form responses
- **No way to test end-to-end** - Can't create a full workflow and see it work in checkout

---

## Implementation Plan

### Phase 1: Backend - Implement Missing Behaviors ⚡ HIGH PRIORITY

#### Task 1.1: Create `form_linking` Behavior Handler
**File:** `src/lib/behaviors/handlers/form-linking.ts`

**What it does:**
- Determines which form should be shown in checkout
- When to show it (during checkout, after purchase, standalone)
- Whether it's required or optional

**Config Structure:**
```typescript
{
  formId: "form_abc123",
  timing: "duringCheckout" | "afterPurchase" | "standalone",
  required: true,
  triggerConditions?: {
    productSubtype?: ["ticket", "physical"],
    minQuantity?: 1,
  }
}
```

**Implementation Steps:**
1. Create handler file with extract/apply/validate methods
2. Extract form requirements from inputs
3. Return form display instructions in result
4. Add to behavior registry (src/lib/behaviors/index.ts)

**Files to Create/Modify:**
- ✅ `src/lib/behaviors/handlers/form-linking.ts` (NEW)
- ✅ `src/lib/behaviors/index.ts` (register handler)
- ✅ `src/lib/behaviors/types.ts` (add FormLinkingConfig type if needed)

---

#### Task 1.2: Create `addon_calculation` Behavior Handler
**File:** `src/lib/behaviors/handlers/addon-calculation.ts`

**What it does:**
- Reads form responses (e.g., "How many UCRA participants? 0, 1, 2")
- Maps form values to add-on quantities using formFieldMapping
- Calculates total add-on cost
- Returns line items to add to cart

**Config Structure:**
```typescript
{
  addons: [
    {
      id: "addon-boat",
      name: "UCRA Evening Event",
      pricePerUnit: 3000, // cents
      currency: "EUR",
      taxable: true,
      taxCode?: "txcd_10401000",
      formFieldIds: ["ucra_participants_external", "ucra_participants_bde"],
      formFieldMapping: {
        "0": 0,  // If form value is "0", add 0 of this addon
        "1": 1,  // If form value is "1", add 1 of this addon
        "2": 2,  // If form value is "2", add 2 of this addon
      },
      maxQuantity?: 10,
    }
  ],
  calculationStrategy: "sum" | "max" | "custom"
}
```

**Implementation Steps:**
1. Create handler file with extract/apply/validate methods
2. Extract form field values from inputs
3. Map values to quantities using formFieldMapping
4. Calculate total quantities across multiple form fields (if applicable)
5. Return line items with quantities and prices
6. Add to behavior registry

**Files to Create/Modify:**
- ✅ `src/lib/behaviors/handlers/addon-calculation.ts` (NEW)
- ✅ `src/lib/behaviors/index.ts` (register handler)
- ✅ `src/lib/behaviors/types.ts` (add AddonCalculationConfig type)

---

#### Task 1.3: Register All Behaviors
**File:** `src/lib/behaviors/index.ts`

**Current:** Only 2 behaviors registered (lines 294-295)
```typescript
behaviorRegistry.register(invoiceMappingHandler);
behaviorRegistry.register(employerDetectionHandler);
```

**Add:**
```typescript
behaviorRegistry.register(formLinkingHandler);
behaviorRegistry.register(addonCalculationHandler);
```

**Files to Modify:**
- ✅ `src/lib/behaviors/index.ts` (lines 294-295)

---

### Phase 2: Frontend - Build Proper Config UI Forms 🎨 HIGH PRIORITY

#### Task 2.1: Replace JSON Editor with Proper Forms
**File:** `src/components/window-content/workflows-window/workflow-builder/behavior-config-panel.tsx`

**Current Problem:** Lines 219-227 show a JSON preview block:
```tsx
<pre className="mt-1 overflow-auto border p-2 text-[10px]">
  {JSON.stringify(behavior.config, null, 2)}
</pre>
```

**Solution:** Create a `renderBehaviorConfig()` function that shows different forms based on `behavior.type`:
```tsx
function renderBehaviorConfig(behavior: any) {
  switch (behavior.type) {
    case "employer-detection":
      return <EmployerDetectionConfigForm ... />;
    case "invoice-mapping":
      return <InvoiceMappingConfigForm ... />;
    case "form-linking":
      return <FormLinkingConfigForm ... />;
    case "addon-calculation":
      return <AddonCalculationConfigForm ... />;
    default:
      return <pre>{JSON.stringify(behavior.config, null, 2)}</pre>;
  }
}
```

**Files to Modify:**
- ✅ `src/components/window-content/workflows-window/workflow-builder/behavior-config-panel.tsx` (replace lines 219-227)

---

#### Task 2.2: Create Employer Detection Config Form
**File:** `src/components/window-content/workflows-window/workflow-builder/behavior-forms/employer-detection-form.tsx` (NEW)

**UI Elements:**
1. **Form Field Selector** (dropdown)
   - Label: "Form Field Containing Employer Info"
   - Options: List all form fields from linked forms in workflow
   - Example: `attendee_category`, `company`, `employer_name`

2. **Employer → CRM Organization Mapping** (table)
   - Label: "Employer Value → CRM Organization Mapping"
   - Columns: `Form Value` | `→` | `CRM Organization` | `[Delete]`
   - "Add Mapping" button to add rows
   - CRM Organization dropdown populated from `api.crmOntology.getCrmOrganizations`

3. **Auto-Fill Billing Address** (checkbox)
   - Label: "Auto-fill billing address from CRM"
   - Default: `true`

4. **Payment Terms** (dropdown)
   - Label: "Default Payment Terms"
   - Options: NET 30, NET 60, NET 90
   - Default: NET 30

**Data Flow:**
- On change → Call `onUpdateBehavior(behaviorId, { config: newConfig })`
- Reads from `behavior.config.employerSourceField`, `behavior.config.employerMapping`, etc.

**Similar to:** The existing InvoicingConfigSection (src/components/window-content/products-window/invoicing-config-section.tsx) - can reuse UI patterns!

**Files to Create:**
- ✅ `src/components/window-content/workflows-window/workflow-builder/behavior-forms/employer-detection-form.tsx` (NEW)

---

#### Task 2.3: Create Invoice Mapping Config Form
**File:** `src/components/window-content/workflows-window/workflow-builder/behavior-forms/invoice-mapping-form.tsx` (NEW)

**UI Elements:**
1. **Organization Source Field** (dropdown)
   - Label: "Form Field Containing Organization Info"
   - Options: List all form fields

2. **Organization Mapping** (table)
   - Same as employer detection (they're very similar)
   - Form Value → CRM Organization

3. **Default Payment Terms** (dropdown)
   - NET 30, NET 60, NET 90

4. **Require Mapping** (checkbox)
   - If true: Fail checkout if organization not found
   - If false: Skip invoice creation if not mapped

**Similar to:** Employer detection form (can share components)

**Files to Create:**
- ✅ `src/components/window-content/workflows-window/workflow-builder/behavior-forms/invoice-mapping-form.tsx` (NEW)

---

#### Task 2.4: Create Form Linking Config Form
**File:** `src/components/window-content/workflows-window/workflow-builder/behavior-forms/form-linking-form.tsx` (NEW)

**UI Elements:**
1. **Form Selector** (dropdown)
   - Label: "Form to Link"
   - Options: All published forms from `api.formsOntology.getForms`
   - Shows: Form name + subtype

2. **Form Timing** (radio buttons or dropdown)
   - Label: "When to Collect Form"
   - Options:
     - 🛒 During Checkout (before payment)
     - ✉️ After Purchase (via email link)
     - 🔗 Standalone (separate link only)

3. **Form Required** (toggle/checkbox)
   - Label: "Form Completion Required"
   - If true: Customer must complete to proceed
   - If false: Form is optional

4. **Trigger Conditions** (optional, advanced)
   - Product Subtype filter (e.g., only for "ticket" products)
   - Min Quantity (e.g., only if buying 2+ tickets)

**Similar to:** Form linking section in product form (lines 692-781 of product-form.tsx) - can reuse patterns

**Files to Create:**
- ✅ `src/components/window-content/workflows-window/workflow-builder/behavior-forms/form-linking-form.tsx` (NEW)

---

#### Task 2.5: Create Add-on Calculation Config Form
**File:** `src/components/window-content/workflows-window/workflow-builder/behavior-forms/addon-calculation-form.tsx` (NEW)

**UI Elements:**
1. **Add-ons List** (similar to AddonManager)
   - Shows existing add-ons in a list
   - "Add Add-on" button

2. **Add-on Editor** (for each add-on)
   - Name (text input)
   - Icon (emoji input, optional)
   - Description (textarea)
   - Price Per Unit (number input + currency)
   - Taxable (checkbox)
   - Tax Code (dropdown, optional)

3. **Form Field Mapping** (multi-select + mapping table)
   - **Form Fields** (multi-select checkboxes)
     - Label: "Form Fields That Trigger This Add-on"
     - Shows all form fields from linked forms
     - Allow multiple selections (e.g., select all UCRA fields)

   - **Field Value → Quantity Mapping** (table)
     - Columns: `Field Value` | `→` | `Quantity` | `[Delete]`
     - Example: `"0"` → `0`, `"1"` → `1`, `"2"` → `2`
     - "Auto-Fill" button to generate mapping from field options
     - "Add Mapping" button to add custom entries

4. **Calculation Strategy** (dropdown)
   - Sum (default): Add quantities from all fields
   - Max: Take maximum quantity from all fields
   - Custom: Advanced formula (future)

**Similar to:** AddonManager component (src/components/window-content/products-window/addon-manager.tsx) - can reuse most of it!

**Files to Create:**
- ✅ `src/components/window-content/workflows-window/workflow-builder/behavior-forms/addon-calculation-form.tsx` (NEW)
- Consider: Extract shared components from AddonManager for reuse

---

#### Task 2.6: Update BEHAVIOR_TYPES Array
**File:** `src/components/window-content/workflows-window/workflow-builder/behavior-config-panel.tsx`

**Current:** Lines 20-40 only have 2 behaviors

**Add:**
```typescript
{
  type: "form-linking",
  name: "Form Linking",
  description: "Link forms to checkout flow",
  defaultConfig: {
    formId: "",
    timing: "duringCheckout",
    required: true,
  },
},
{
  type: "addon-calculation",
  name: "Add-on Calculation",
  description: "Calculate add-ons based on form responses",
  defaultConfig: {
    addons: [],
    calculationStrategy: "sum",
  },
},
```

**Files to Modify:**
- ✅ `src/components/window-content/workflows-window/workflow-builder/behavior-config-panel.tsx` (lines 20-40)

---

### Phase 3: Integration & Testing 🧪 CRITICAL

#### Task 3.1: Test Workflow Creation in UI
**Manual Testing Steps:**

1. Open Workflows window
2. Click "Create Workflow"
3. Select trigger: "Checkout Start"
4. Add objects: Select a product (ticket)
5. Add behavior: "Form Linking"
   - Configure form selector (choose a published form)
   - Set timing: "During Checkout"
   - Required: true
6. Add behavior: "Add-on Calculation"
   - Add an add-on (name, price, form field mapping)
7. Add behavior: "Employer Detection"
   - Select form field
   - Map values to CRM organizations
8. Add behavior: "Invoice Mapping"
   - Configure organization mapping
9. Save workflow
10. Set workflow to "active"

**Expected Result:**
- All behaviors show proper forms (no JSON editor)
- All dropdowns populated with real data (forms, CRM orgs, form fields)
- Configuration saves correctly
- Workflow status changes to "active"

**Files to Test:**
- Entire workflow builder UI
- All 4 behavior config forms

---

#### Task 3.2: Test Checkout Flow End-to-End
**Manual Testing Steps:**

1. **Setup:**
   - Create a published form with fields: `attendee_category`, `ucra_participants_external`
   - Create a CRM organization: "BDE Students"
   - Create a product (ticket) linked to that form
   - Create a checkout instance
   - Create a workflow (as in Task 3.1) linked to that checkout

2. **Test Checkout:**
   - Go to checkout page
   - Select product (ticket)
   - **VERIFY:** Form appears (form_linking behavior)
   - Fill form:
     - `attendee_category`: "BDE Students"
     - `ucra_participants_external`: "2"
   - **VERIFY:** Add-on appears in cart (addon_calculation behavior)
     - Should show: "UCRA Evening Event x2"
   - Continue to customer info
   - **VERIFY:** Billing address auto-filled (employer_detection behavior)
   - Continue to review order
   - **VERIFY:** Total includes add-on cost
   - **VERIFY:** Payment method options shown
   - If employer is "BDE Students":
     - **VERIFY:** "Invoice (Pay Later)" option available (invoice_mapping behavior)
     - Select invoice payment
     - **VERIFY:** Skip payment step (goes directly to confirmation)
   - Complete order
   - **VERIFY:** Confirmation shows all items including add-ons

3. **Backend Verification:**
   - Check database:
     - Form response saved with correct data
     - Invoice created for CRM organization "BDE Students"
     - Line items include base product + add-ons
     - Total matches frontend calculation

**Expected Result:**
- Form appears at correct time
- Add-ons calculated correctly from form responses
- Employer detected and matched to CRM org
- Invoice created for B2B customer
- Payment step skipped for invoice customers
- All data saved correctly in database

**Files to Test:**
- `src/templates/checkout/behavior-driven/index.tsx` (checkout component)
- `src/lib/behaviors/adapters/checkout-integration.ts` (behavior adapter)
- All 4 behavior handlers

---

#### Task 3.3: Debug & Fix Issues
**Common Issues to Watch For:**

1. **Behavior not executing:**
   - Check: Is workflow active?
   - Check: Is behavior enabled?
   - Check: Are triggers correct?
   - Check: Is behavior registered in registry?

2. **Form not appearing:**
   - Check: form_linking behavior config
   - Check: formId is valid Convex ID
   - Check: Form is published

3. **Add-ons not calculating:**
   - Check: addon_calculation config
   - Check: formFieldIds match actual form field IDs
   - Check: formFieldMapping has correct values
   - Check: Form response data format

4. **Employer not detected:**
   - Check: employer_detection config
   - Check: employerSourceField matches form field ID
   - Check: employerMapping has correct CRM org IDs

5. **Invoice not created:**
   - Check: invoice_mapping config
   - Check: CRM organization exists
   - Check: Behavior returns correct actions

**Debugging Tools:**
- Enable `debugMode: true` in checkout config (line 16 of behavior-driven/config.ts)
- Check browser console for behavior execution logs
- Add console.logs in behavior handlers

---

### Phase 4: Polish & Documentation 📝 MEDIUM PRIORITY

#### Task 4.1: Add Validation to Behavior Forms
- Validate required fields before saving
- Show error messages for invalid configs
- Prevent saving incomplete behaviors

#### Task 4.2: Add Help Text & Examples
- Add tooltips to form fields
- Show example configurations
- Add "?" help icons with explanations

#### Task 4.3: Add Workflow Templates
- Create pre-configured workflow templates
- "Ticket Sales with B2B Invoicing"
- "Event Registration with Add-ons"
- "Simple Product Checkout"

#### Task 4.4: Update Documentation
- Document all 4 behavior types
- Add screenshots of config forms
- Create step-by-step guides

---

## File Structure Summary

### New Files to Create (8 files)
```
src/lib/behaviors/handlers/
  ├── form-linking.ts                    [NEW - Task 1.1]
  └── addon-calculation.ts               [NEW - Task 1.2]

src/components/window-content/workflows-window/workflow-builder/behavior-forms/
  ├── employer-detection-form.tsx        [NEW - Task 2.2]
  ├── invoice-mapping-form.tsx           [NEW - Task 2.3]
  ├── form-linking-form.tsx              [NEW - Task 2.4]
  └── addon-calculation-form.tsx         [NEW - Task 2.5]
```

### Files to Modify (3 files)
```
src/lib/behaviors/
  └── index.ts                           [MODIFY - Task 1.3 - Register new behaviors]

src/components/window-content/workflows-window/workflow-builder/
  └── behavior-config-panel.tsx          [MODIFY - Task 2.1, 2.6 - Replace JSON editor, add behavior types]

src/templates/checkout/behavior-driven/
  └── index.tsx                          [TEST - Task 3.2 - Verify behaviors execute]
```

---

## Success Criteria ✅

### Phase 1 Complete When:
- [x] 4 behavior handlers exist and are registered
- [x] All handlers have extract/apply/validate methods
- [x] Handlers pass TypeScript compilation

### Phase 2 Complete When:
- [x] No JSON editor visible in behavior config panel
- [x] All 4 behaviors have proper form UIs
- [x] Forms populated with real data (dropdowns, etc.)
- [x] Configuration updates behavior state correctly

### Phase 3 Complete When:
- [x] Can create a workflow with all 4 behaviors in UI
- [x] Workflow saves and becomes active
- [x] Checkout flow executes all behaviors correctly
- [x] Add-ons appear in cart
- [x] Invoice created for B2B customers
- [x] Payment step skipped for invoice customers

### Phase 4 Complete When:
- [x] Forms have validation and error handling
- [x] Help text and tooltips added
- [x] Documentation updated

---

## Estimated Effort

| Phase | Tasks | Estimated Time |
|-------|-------|----------------|
| Phase 1: Backend Behaviors | 3 tasks | 4-6 hours |
| Phase 2: Frontend Forms | 6 tasks | 8-12 hours |
| Phase 3: Testing & Debug | 3 tasks | 4-6 hours |
| Phase 4: Polish & Docs | 4 tasks | 2-4 hours |
| **TOTAL** | **16 tasks** | **18-28 hours** |

---

## Next Steps

1. **Start with Phase 1, Task 1.1** - Create `form_linking` behavior handler
2. **Then Phase 1, Task 1.2** - Create `addon_calculation` behavior handler
3. **Then Phase 1, Task 1.3** - Register both behaviors
4. **Test backend** - Verify behaviors can be called programmatically
5. **Move to Phase 2** - Build UI forms
6. **Test end-to-end** - Full checkout flow with all behaviors

---

## Questions Before Starting

1. **Priority:** Should we do all 4 behaviors at once, or implement incrementally (1-2 at a time)?
   - Recommendation: Do 2 at a time (form_linking + addon_calculation first, then employer + invoice)

2. **Reusability:** Can we extract shared components from existing product UI for reuse?
   - Recommendation: Yes! Reuse AddonManager, InvoicingConfigSection patterns

3. **Testing:** Should we write automated tests or focus on manual testing first?
   - Recommendation: Manual testing first to validate flow, automated tests later

4. **Backwards Compatibility:** Keep product-level behavior configs or phase out?
   - Decision: KEEP for now (no migration needed per user request)
