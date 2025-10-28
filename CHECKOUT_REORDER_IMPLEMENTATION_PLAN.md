# Checkout Step Reordering - Implementation Plan
## Moving Registration Form Before Customer Info for Dynamic Billing

---

## Problem Statement

### Current Flow Issues

**The Problem:**
1. Employee fills out company info (Step 2) thinking they need AMEOS details
2. Then selects "AMEOS" in registration form (Step 2.5)
3. System discovers it should use AMEOS billing info, but already collected wrong data
4. Result: Invoice has employee's input instead of official AMEOS billing details

**Why This Happens:**
- Registration form comes AFTER customer info collection
- By the time we know the employer, we've already asked for billing details
- No way to pre-populate or override with correct employer data

---

## Proposed New Flow

### New Step Order

```
┌─────────────────────────────────────────────────────────┐
│ STEP 1: Product Selection                              │
│ ├─ Select ticket type                                  │
│ ├─ Choose quantity                                     │
│ └─ See pricing                                         │
│                                                         │
│ No changes needed                                      │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ STEP 2: Registration Form ⭐ MOVED UP                  │
│ ├─ Custom form for each ticket                         │
│ ├─ Collects: Name, Email, Employer, etc.              │
│ └─ KEY: Now we know who's paying BEFORE billing step! │
│                                                         │
│ ⚡ This is the key change!                            │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ STEP 3: Customer Info ⭐ NOW DYNAMIC                   │
│                                                         │
│ IF employer = "AMEOS" (or other mapped org):          │
│ ├─ Show: Personal info only (name, email, phone)      │
│ ├─ Hide: Company name, VAT, billing address           │
│ ├─ Pre-fill: Use AMEOS billing from product mapping   │
│ └─ Display: "Billing to: AMEOS GmbH" (read-only)      │
│                                                         │
│ IF employer = "Self-pay" or B2C mode:                 │
│ ├─ Show: Full billing form                            │
│ ├─ Collect: Company, VAT, full address                │
│ └─ User fills everything (they're paying)             │
│                                                         │
│ ⚡ Form adapts based on Step 2 responses!             │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ STEP 4: Payment Method Selection                       │
│                                                         │
│ IF employer billing:                                   │
│ └─ Show: "Invoice (Employer Pays)" only               │
│                                                         │
│ IF self-pay:                                           │
│ └─ Show: Stripe, Invoice, etc.                        │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ STEP 5: Payment & Confirmation                         │
│ (existing)                                              │
└─────────────────────────────────────────────────────────┘
```

---

## Enhanced Employer Mapping Data Structure

### Current Structure (Insufficient)
```typescript
// product.customProperties.invoiceConfig
{
  employerSourceField: "employer",
  employerMapping: {
    "ameos": "AMEOS GmbH",  // ❌ Just a string name
    "charite": "Charité - Universitätsmedizin Berlin"
  },
  defaultPaymentTerms: "net30"
}
```

### New Structure (Complete Billing Info)
```typescript
// product.customProperties.invoiceConfig
{
  employerSourceField: "employer",
  employerMapping: {
    "ameos": {
      type: "employer_billing",

      // Basic Info
      organizationName: "AMEOS GmbH",
      displayName: "AMEOS Klinikum Hamburg",

      // Legal & Tax
      legalEntityName: "AMEOS Gruppe GmbH",
      vatNumber: "DE123456789",
      taxId: "12/345/67890",

      // Billing Address
      billingAddress: {
        line1: "Krankenhausstraße 123",
        line2: "Building A, 3rd Floor",
        city: "Hamburg",
        state: "Hamburg",
        postalCode: "20354",
        country: "DE"
      },

      // Contact Info
      billingEmail: "rechnungen@ameos.de",
      billingContact: "Frau Schmidt, Rechnungsabteilung",
      primaryPhone: "+49 40 1234567",
      website: "www.ameos.eu",

      // Payment Settings
      defaultPaymentTerms: "net30",
      preferredPaymentMethod: "bank_transfer",

      // Internal Notes
      notes: "Benötigt Bestellnummer auf Rechnung",
      accountingReference: "COST-CENTER-4523"
    },

    "charite": {
      // Full billing details for Charité...
    },

    "self_pay": {
      type: "self_pay",
      // Indicates user must fill their own billing
    }
  }
}
```

---

## Implementation Steps

### Phase 1: Data Model Changes

#### 1.1 Update Invoice Config Schema
**File**: `convex/productOntology.ts` (schema definitions)

**Changes**:
```typescript
// New type for employer billing info
export type EmployerBillingInfo = {
  type: "employer_billing";
  organizationName: string;
  displayName?: string;
  legalEntityName?: string;
  vatNumber?: string;
  taxId?: string;
  billingAddress: {
    line1: string;
    line2?: string;
    city: string;
    state?: string;
    postalCode: string;
    country: string;
  };
  billingEmail: string;
  billingContact?: string;
  primaryPhone?: string;
  website?: string;
  defaultPaymentTerms?: "net30" | "net60" | "net90";
  preferredPaymentMethod?: string;
  notes?: string;
  accountingReference?: string;
};

export type InvoiceConfig = {
  employerSourceField: string;
  employerMapping: Record<string, EmployerBillingInfo | { type: "self_pay" }>;
  defaultPaymentTerms?: "net30" | "net60" | "net90";
};
```

#### 1.2 Migration for Existing Products
**File**: `convex/migrations/migrateInvoiceConfig.ts` (new file)

**Purpose**: Convert old string mappings to new structure

```typescript
// Convert old format:
{ "ameos": "AMEOS GmbH" }

// To new format:
{
  "ameos": {
    type: "employer_billing",
    organizationName: "AMEOS GmbH",
    billingAddress: { /* admin must fill this */ },
    // ... other fields
  }
}
```

---

### Phase 2: Frontend - Checkout Flow Reordering

#### 2.1 Update Step Sequence
**File**: `src/components/checkout/multi-step-checkout.tsx`

**Current Steps**:
```typescript
const steps = [
  "product_selection",    // Step 1
  "customer_info",        // Step 2
  "registration_form",    // Step 3 (conditional)
  "payment_method",       // Step 4
  "payment_form",         // Step 5
  "confirmation"          // Step 6
];
```

**New Steps**:
```typescript
const steps = [
  "product_selection",    // Step 1
  "registration_form",    // Step 2 ⭐ MOVED UP
  "customer_info",        // Step 3 ⭐ NOW DYNAMIC
  "payment_method",       // Step 4
  "payment_form",         // Step 5
  "confirmation"          // Step 6
];
```

#### 2.2 Make Registration Form Always Required
**File**: `src/components/checkout/multi-step-checkout.tsx`

**Current Logic** (conditional):
```typescript
const requiresRegistrationForm = linkedProducts.some(p =>
  p.customProperties?.registrationFormId
);

// Only show if product has form
if (requiresRegistrationForm) {
  showRegistrationForm();
}
```

**New Logic** (always show if configured):
```typescript
// Always show registration form after product selection
// (If no form configured, skip automatically)
const registrationFormId = linkedProducts[0]?.customProperties?.registrationFormId;

if (registrationFormId) {
  // Show registration form BEFORE customer info
  // This captures employer info early
}
```

---

#### 2.3 Dynamic Customer Info Step
**File**: `src/components/checkout/steps/customer-info-step.tsx`

**New Props**:
```typescript
interface CustomerInfoStepProps {
  checkoutData: CheckoutStepData;
  linkedProducts: CheckoutProduct[];
  onContinue: (data: CustomerInfo) => void;
  onBack: () => void;
  // NEW: Check form responses for employer info
  formResponses?: Array<{
    responses: Record<string, string | number | boolean>;
  }>;
}
```

**Dynamic Rendering Logic**:
```typescript
export function CustomerInfoStep({ formResponses, linkedProducts }: CustomerInfoStepProps) {
  // 1. Check if employer was selected in registration form
  const employerValue = formResponses?.[0]?.responses?.employer;

  // 2. Get product's invoice config
  const product = linkedProducts[0];
  const invoiceConfig = product.customProperties?.invoiceConfig;
  const employerMapping = invoiceConfig?.employerMapping?.[employerValue];

  // 3. Determine if employer billing applies
  const isEmployerBilling = employerMapping?.type === "employer_billing";

  // 4. Render different form based on billing type
  if (isEmployerBilling) {
    return <EmployerBillingCustomerInfo employer={employerMapping} />;
  } else {
    return <StandardCustomerInfo />;
  }
}
```

**Two Sub-Components**:

**A) EmployerBillingCustomerInfo**
```typescript
function EmployerBillingCustomerInfo({ employer }) {
  return (
    <form>
      {/* Personal Info Only */}
      <input name="name" label="Your Name" />
      <input name="email" label="Your Email" />
      <input name="phone" label="Your Phone (optional)" />

      {/* Read-Only Billing Info Display */}
      <div className="billing-info-display">
        <h3>Billing Information</h3>
        <p><strong>Company:</strong> {employer.organizationName}</p>
        <p><strong>Address:</strong> {employer.billingAddress.line1}, {employer.billingAddress.city}</p>
        <p><strong>VAT:</strong> {employer.vatNumber}</p>
        <p className="text-sm text-gray-600">
          Invoice will be sent to: {employer.billingEmail}
        </p>
      </div>

      {/* Hidden fields for backend */}
      <input type="hidden" name="transactionType" value="B2B" />
      <input type="hidden" name="companyName" value={employer.organizationName} />
      {/* ... all employer billing data as hidden fields */}
    </form>
  );
}
```

**B) StandardCustomerInfo**
```typescript
function StandardCustomerInfo() {
  return (
    <form>
      {/* Personal Info */}
      <input name="name" label="Name" />
      <input name="email" label="Email" />
      <input name="phone" label="Phone (optional)" />

      {/* Full Billing Info (editable) */}
      <h3>Billing Information</h3>
      <select name="transactionType">
        <option value="B2C">Personal</option>
        <option value="B2B">Business</option>
      </select>

      {/* Show if B2B selected */}
      <input name="companyName" label="Company Name" />
      <input name="vatNumber" label="VAT Number" />

      {/* Address */}
      <input name="billingLine1" label="Street Address" />
      <input name="billingCity" label="City" />
      {/* ... full address form */}
    </form>
  );
}
```

---

### Phase 3: Backend - Use Employer Billing

#### 3.1 Update Invoice Provider to Use Mapping
**File**: `convex/paymentProviders/invoice.ts`

**Current Code** (lines 162-180):
```typescript
// ❌ Only uses organizationName
crmOrganizationId = await ctx.runMutation(internal.crmIntegrations.createCRMOrganization, {
  organizationId: args.organizationId,
  companyName: organizationName,
});
```

**New Code**:
```typescript
// ✅ Use full employer billing details from mapping
const employerBilling = invoiceConfig.employerMapping[employerFieldValue];

if (employerBilling.type === "employer_billing") {
  crmOrganizationId = await ctx.runMutation(internal.crmIntegrations.createCRMOrganization, {
    organizationId: args.organizationId,
    companyName: employerBilling.organizationName,
    vatNumber: employerBilling.vatNumber,
    billingAddress: employerBilling.billingAddress,
    email: employerBilling.billingEmail,
    phone: employerBilling.primaryPhone,
    website: employerBilling.website,
  });
} else {
  // Self-pay: use checkout session data
  crmOrganizationId = await ctx.runMutation(internal.crmIntegrations.createCRMOrganization, {
    organizationId: args.organizationId,
    companyName: session.customProperties?.companyName,
    vatNumber: session.customProperties?.vatNumber,
    billingAddress: {
      line1: session.customProperties?.billingLine1,
      city: session.customProperties?.billingCity,
      // ... from checkout session
    },
    email: session.customProperties?.customerEmail,
    phone: session.customProperties?.customerPhone,
  });
}
```

---

### Phase 4: Product Config UI Updates

#### 4.1 Enhanced Employer Mapping Editor
**File**: `src/components/window-content/products-window/invoicing-config-section.tsx`

**Current UI**: Simple key-value input
```
Employer Field: [employer]
Mapping:
  ameos → AMEOS GmbH
  charite → Charité
```

**New UI**: Full billing details form
```
┌─────────────────────────────────────────────────────┐
│ Employer Mappings                                   │
├─────────────────────────────────────────────────────┤
│                                                     │
│ [+ Add Employer Organization]                      │
│                                                     │
│ ┌───────────────────────────────────────────────┐ │
│ │ AMEOS                              [Edit] [×] │ │
│ │                                               │ │
│ │ Organization: AMEOS GmbH                      │ │
│ │ VAT: DE123456789                              │ │
│ │ Address: Krankenhausstraße 123, Hamburg      │ │
│ │ Email: rechnungen@ameos.de                    │ │
│ │ Payment Terms: Net 30                         │ │
│ │                                               │ │
│ │ [View Full Details]                           │ │
│ └───────────────────────────────────────────────┘ │
│                                                     │
│ ┌───────────────────────────────────────────────┐ │
│ │ Charité                            [Edit] [×] │ │
│ │                                               │ │
│ │ Organization: Charité - Universitätsmedizin   │ │
│ │ VAT: DE987654321                              │ │
│ │ Address: Charitéplatz 1, Berlin               │ │
│ │ ...                                           │ │
│ └───────────────────────────────────────────────┘ │
│                                                     │
│ ┌───────────────────────────────────────────────┐ │
│ │ ☑ Allow Self-Pay                              │ │
│ │   Customers can pay directly instead of       │ │
│ │   using employer billing                      │ │
│ └───────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

**Modal for Adding/Editing Employer**:
```
┌─────────────────────────────────────────────────────────┐
│ Add Employer Organization                         [×]   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Form Field Value                                        │
│ ┌───────────────────────────────────────────────────┐  │
│ │ ameos                                             │  │
│ └───────────────────────────────────────────────────┘  │
│ (Must match value in registration form dropdown)       │
│                                                         │
│ Organization Details                                    │
│ ┌───────────────────────────────────────────────────┐  │
│ │ Organization Name: AMEOS GmbH                     │  │
│ │ Legal Entity Name: AMEOS Gruppe GmbH              │  │
│ │ VAT Number: DE123456789                           │  │
│ │ Tax ID: 12/345/67890                              │  │
│ └───────────────────────────────────────────────────┘  │
│                                                         │
│ Billing Address                                         │
│ ┌───────────────────────────────────────────────────┐  │
│ │ Street: Krankenhausstraße 123                     │  │
│ │ Line 2: Building A, 3rd Floor                     │  │
│ │ City: Hamburg                                     │  │
│ │ State: Hamburg                                    │  │
│ │ Postal Code: 20354                                │  │
│ │ Country: [DE ▼]                                   │  │
│ └───────────────────────────────────────────────────┘  │
│                                                         │
│ Contact Information                                     │
│ ┌───────────────────────────────────────────────────┐  │
│ │ Billing Email: rechnungen@ameos.de                │  │
│ │ Contact Person: Frau Schmidt, Rechnungsabteilung  │  │
│ │ Phone: +49 40 1234567                             │  │
│ │ Website: www.ameos.eu                             │  │
│ └───────────────────────────────────────────────────┘  │
│                                                         │
│ Payment Settings                                        │
│ ┌───────────────────────────────────────────────────┐  │
│ │ Payment Terms: [Net 30 ▼]                         │  │
│ │ Preferred Method: Bank Transfer                   │  │
│ └───────────────────────────────────────────────────┘  │
│                                                         │
│ Internal Notes (optional)                               │
│ ┌───────────────────────────────────────────────────┐  │
│ │ Benötigt Bestellnummer auf Rechnung               │  │
│ │ Accounting Reference: COST-CENTER-4523            │  │
│ └───────────────────────────────────────────────────┘  │
│                                                         │
│                          [Cancel]  [Save Organization] │
└─────────────────────────────────────────────────────────┘
```

---

## Testing Plan

### Test Scenario 1: AMEOS Employee (Employer Billing)

**Setup**: Product configured with AMEOS employer mapping

**Steps**:
1. Select ticket (Step 1)
2. Fill registration form (Step 2 - NEW ORDER)
   - Name: "Dr. Hans Müller"
   - Email: "hans.mueller@hospital.de"
   - Employer: Select "AMEOS" ✅
3. Customer info step (Step 3)
   - ✅ Should show read-only AMEOS billing
   - ✅ Should only ask for personal info
   - ✅ Should NOT show company/address fields
4. Payment method (Step 4)
   - ✅ Should show "Invoice (Employer Pays)" only
5. Complete checkout
6. Verify invoice:
   - ✅ Bill To: AMEOS GmbH with full address
   - ✅ Line item: "Event - Dr. Hans Müller"
   - ✅ CRM contact created for Dr. Müller
   - ✅ CRM organization has AMEOS billing details

---

### Test Scenario 2: Self-Pay Customer

**Setup**: Same product, but user selects "Self-Pay"

**Steps**:
1. Select ticket (Step 1)
2. Fill registration form (Step 2)
   - Employer: Select "Self-Pay / Direct Payment" ✅
3. Customer info step (Step 3)
   - ✅ Should show FULL billing form
   - ✅ User fills their own company/address
4. Payment method (Step 4)
   - ✅ Should show Stripe + Invoice options
5. Complete checkout
6. Verify invoice:
   - ✅ Bill To: User's entered company name/address
   - ✅ CRM organization created with user's data

---

### Test Scenario 3: B2C Product (No Employer Mapping)

**Steps**:
1. Select ticket (Step 1)
2. No registration form (skipped)
3. Customer info (Step 2)
   - ✅ Show standard form
4. Works as before (no regression)

---

## Migration Strategy

### Backward Compatibility

**Challenge**: Existing products have old format mappings

**Solution**: Support both formats during transition

```typescript
// Detection function
function getEmployerBilling(mapping: any, fieldValue: string) {
  const entry = mapping[fieldValue];

  if (typeof entry === "string") {
    // OLD FORMAT: Just a name
    return {
      type: "employer_billing",
      organizationName: entry,
      billingAddress: {}, // Empty, admin must update
      billingEmail: "",
    };
  } else if (entry?.type === "employer_billing") {
    // NEW FORMAT: Full billing
    return entry;
  } else {
    // Self-pay or unknown
    return null;
  }
}
```

**Admin Action Required**:
- Show banner: "⚠️ Update your employer mappings with billing details"
- Provide easy upgrade path in product config UI

---

## Timeline Estimate

| Task | Estimate | Priority |
|------|----------|----------|
| 1.1 Data model updates | 1 hour | HIGH |
| 1.2 Migration script | 30 min | MEDIUM |
| 2.1 Step reordering | 1 hour | HIGH |
| 2.2 Always show form | 30 min | HIGH |
| 2.3 Dynamic customer info | 2 hours | HIGH |
| 3.1 Backend billing mapping | 1 hour | HIGH |
| 4.1 Enhanced config UI | 2-3 hours | MEDIUM |
| Testing all scenarios | 1-2 hours | HIGH |

**Total**: ~9-11 hours

---

## Breaking Changes & Risks

### Breaking Changes
1. ✅ **Checkout step order changes** - Users will notice different flow
2. ✅ **Product config format changes** - Admins must update mappings
3. ⚠️ **In-progress checkouts** - May need to clear session storage

### Mitigation
1. Deploy during low-traffic period
2. Show upgrade wizard for existing products
3. Support both old/new formats for 2 weeks
4. Clear browser sessions on deploy

### Rollback Plan
1. Keep old checkout component as fallback
2. Feature flag: `use_new_checkout_flow`
3. Database supports both formats
4. Can revert quickly if issues

---

## Success Criteria

✅ **UX**: Employee doesn't fill confusing billing info
✅ **Data**: Invoice has correct AMEOS billing details
✅ **Flexibility**: Works for multiple employers (AMEOS, Charité, etc.)
✅ **Fallback**: Self-pay option still works
✅ **Admin**: Easy to configure employer billing
✅ **No Regression**: B2C checkouts unaffected

---

## Next Steps

1. **Review & Approve** this plan
2. **Phase 1**: Implement data model (1.5 hours)
3. **Phase 2**: Frontend reordering (3.5 hours)
4. **Phase 3**: Backend integration (1 hour)
5. **Phase 4**: Config UI (2-3 hours)
6. **Testing**: Full scenarios (1-2 hours)

**Ready to start?** Which phase should I begin with?
