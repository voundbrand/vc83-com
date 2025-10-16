# Tax Settings - Simple Implementation

## ✅ What We Built

Tax collection settings are now integrated into the existing **Legal & Tax Information** section in the Manage Window. No separate tabs, no overengineering - just the essential fields needed for tax compliance.

## 📍 Location

**Path:** Desktop → Manage icon → Organization tab → Legal & Tax Information section (scroll down, it's a collapsible section)

**Who can access:** Organization owners and business managers with `manage_organization` permission

## 🎯 Fields Added

### Tax Collection Settings (in Legal & Tax Information section)

1. **Enable Tax Collection** (checkbox)
   - Simple on/off toggle for the entire organization
   - When disabled, all other tax settings are grayed out

2. **Default Tax Behavior** (dropdown)
   - `Exclusive` - Tax added at checkout (default)
   - `Inclusive` - Tax included in price
   - `Automatic` - Payment provider determines

3. **Default Tax Code** (text input)
   - Provider-specific tax code format (e.g., `txcd_00000000` for Stripe)
   - Optional - leave empty for standard rate
   - Applied to products without specific tax codes

## 🔄 How It Works

### Backend Storage

Tax settings are stored in the `organization_legal` ontology object alongside other legal entity information:

```typescript
// Stored in objects table
{
  type: "organization_legal",
  organizationId: "...",
  customProperties: {
    // Existing legal fields
    taxId: "...",
    vatNumber: "...",
    companyRegistrationNumber: "...",
    legalEntityType: "...",

    // New tax collection fields
    taxEnabled: boolean,
    defaultTaxBehavior: "inclusive" | "exclusive" | "automatic",
    defaultTaxCode: string
  }
}
```

### Edit & Save Flow

1. **Click "Edit Organization"** button in Manage Window
2. **Expand "Legal & Tax Information"** section
3. **Toggle tax settings:**
   - Check "Enable tax collection"
   - Select tax behavior
   - Enter default tax code (if needed)
4. **Click "Save All Changes"** - saves all organization details including tax settings

All fields save together as one atomic update via `updateOrganizationLegal` mutation.

## 🔌 Payment Provider Integration

### Payment-Agnostic Design

The tax settings are intentionally provider-agnostic:

- **Generic fields** that work with any payment provider
- **Tax code format** is flexible (Stripe uses `txcd_*`, others may differ)
- **Tax behavior** is a universal concept across all providers

### Using with Stripe

When creating a Stripe checkout session:

```typescript
import { api } from "convex/_generated/api";

// Get org tax settings
const legal = await ctx.runQuery(api.organizationOntology.getOrganizationLegal, {
  organizationId
});

// Create Stripe session
const session = await stripe.checkout.sessions.create({
  // ... other params

  // Apply tax settings
  tax_calculation: {
    automatic_tax: {
      enabled: legal?.customProperties?.taxEnabled || false
    }
  },

  line_items: [{
    price_data: {
      // ... price details
      tax_behavior: legal?.customProperties?.defaultTaxBehavior || "exclusive",
      product_data: {
        tax_code: legal?.customProperties?.defaultTaxCode || undefined
      }
    }
  }]
});
```

### Using with Other Providers

For PayPal, Square, or manual invoicing:

```typescript
const legal = await ctx.runQuery(api.organizationOntology.getOrganizationLegal, {
  organizationId
});

if (legal?.customProperties?.taxEnabled) {
  // Apply tax according to provider's API
  const taxBehavior = legal.customProperties.defaultTaxBehavior;
  // ... implement provider-specific tax logic
}
```

## 📊 Data Architecture

### Why Legal Section?

Tax collection settings are part of legal/compliance configuration, so they belong with:
- Tax ID (EIN/SSN)
- VAT number
- Company registration
- Legal entity type

This keeps all compliance-related settings together in one logical place.

### Advanced Tax Features (Future)

For advanced tax features (Stripe Tax integration, tax registrations by jurisdiction, etc.), see:
- `convex/organizationTaxSettings.ts` - Full tax registration system
- Uses separate `tax_registration` objects for multi-jurisdiction support
- Not part of basic tax collection (implemented here)

## 🛠️ Files Modified

### Frontend
- `src/components/window-content/manage-window/index.tsx`
  - Removed separate tax-settings tab
  - Tax fields now save via existing Legal mutation

- `src/components/window-content/manage-window/organization-details-form.tsx`
  - Added tax fields to FormData interface
  - Added Tax Collection Settings section in Legal & Tax Information
  - Fields disable when tax collection is off

### Backend
- `convex/organizationOntology.ts`
  - Updated `updateOrganizationLegal` mutation to accept tax fields:
    - `taxEnabled: v.optional(v.boolean())`
    - `defaultTaxBehavior: v.optional(v.union(...))`
    - `defaultTaxCode: v.optional(v.string())`

## ✅ Quality Checks

- **TypeScript:** ✅ No errors
- **Linting:** ✅ No blocking issues (only warnings)
- **Integration:** ✅ Fully wired up
- **Permissions:** ✅ Respects `manage_organization` permission

## 🎉 Summary

Tax settings are now properly integrated into the Legal & Tax Information section where they belong. Simple, clean, and payment-provider agnostic. No tabs, no overengineering - just the essential fields needed to configure tax collection for an organization.
