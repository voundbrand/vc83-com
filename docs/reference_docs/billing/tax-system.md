# Tax System Documentation

## Overview

The l4yercak3.com platform includes a comprehensive tax management system designed to work with multiple payment providers (Stripe, PayPal, etc.). The system is based on Stripe Tax requirements but generic enough to support any payment provider.

## Architecture

### 1. Organization Tax Settings
**Object Type:** `organization_settings` with `subtype: "tax"`

Global tax configuration for the organization.

```typescript
{
  type: "organization_settings",
  subtype: "tax",
  name: "org-slug-tax-settings",
  status: "active",
  customProperties: {
    // Global Settings
    taxEnabled: boolean,
    defaultTaxBehavior: "inclusive" | "exclusive" | "automatic",
    defaultTaxCode: string, // e.g., "txcd_10000000"

    // Origin Address (for tax nexus)
    originAddress: {
      addressLine1: string,
      addressLine2?: string,
      city: string,
      state?: string,
      postalCode: string,
      country: string, // ISO code
    },

    // Provider-Specific Settings
    stripeSettings?: {
      taxCalculationEnabled: boolean,
      taxCodeValidation: boolean,
    },

    // Custom Tax Rates (for manual calculation)
    customRates?: Array<{
      jurisdiction: string, // e.g., "US-CA", "DE", "GB"
      rate: number, // e.g., 0.19 for 19%
      name: string, // e.g., "California Sales Tax"
      type: "sales_tax" | "vat" | "gst" | "other",
      active: boolean,
    }>,
  }
}
```

### 2. Tax Registrations
**Object Type:** `tax_registration`

Per-jurisdiction tax registration information.

```typescript
{
  type: "tax_registration",
  subtype: "US-CA", // Jurisdiction code
  name: "Tax Registration: California, United States",
  status: "active" | "pending" | "inactive",
  customProperties: {
    // Jurisdiction Info
    jurisdiction: "US-CA",
    jurisdictionName: "California, United States",
    country: "US", // ISO code
    state: "CA",

    // Registration Details
    registrationNumber: "12-3456789", // Tax ID
    registrationDate: 1234567890, // Timestamp
    effectiveDate: 1234567890, // When to start collecting
    expirationDate?: 1234567890, // Optional

    // Tax Authority
    taxAuthority: "California Department of Tax and Fee Administration",
    filingFrequency: "monthly" | "quarterly" | "annually",

    // Provider Integration
    stripeRegistrationId?: "taxreg_abc123",
    providerMetadata?: {},
  }
}
```

### 3. Product Tax Configuration
**Object Type:** `product`

Tax-related fields stored in product `customProperties`.

```typescript
{
  type: "product",
  subtype: "ticket" | "physical" | "digital",
  customProperties: {
    // Pricing
    price: 12000, // In cents
    currency: "USD",

    // Tax Configuration
    taxCode: "txcd_10000000", // Stripe tax code
    taxBehavior: "inclusive" | "exclusive" | "automatic",
    taxable: true, // Whether tax applies to this product

    // For Custom Tax Calculation
    customTaxRate?: 0.19, // Override rate (e.g., 19%)
    exemptFromTax?: boolean,
    taxCategory?: "standard" | "reduced" | "zero" | "exempt",
  }
}
```

## Tax Behavior Options

### 1. **Exclusive** (tax_behavior: "exclusive")
- Tax is calculated separately and added to the product price
- Example: $100 product + $10 tax = $110 total
- **Most common for US sales tax**

### 2. **Inclusive** (tax_behavior: "inclusive")
- Tax is already included in the product price
- Example: €119 product (includes €19 VAT) = €119 total
- **Most common for EU VAT**

### 3. **Automatic** (tax_behavior: "automatic")
- Behavior determined by product currency
- USD, CAD, AUD → Exclusive
- EUR, GBP → Inclusive

## Store Pricing Transparency Contract (SPT-003)

This section freezes tax and naming semantics used by `/store`.

### 1. Store VAT display policy

1. `/store` customer-facing plan and calculator totals are VAT-inclusive.
2. The tax display mode for store pricing is fixed to `vat_included`.
3. Checkout still relies on provider-calculated tax (`automatic_tax`) for invoice correctness; UI copy and estimates remain VAT-inclusive.
4. Store subtitle/footer copy (including translation seeds) must use VAT-inclusive wording without a hardcoded country VAT percentage.

### 2. Store naming compatibility policy

1. Customer-facing tier name/key is `Scale` / `scale`.
2. Runtime compatibility tier key remains `agency`.
3. Mapping is contractually frozen in:
   - `src/lib/credit-pricing.ts`
   - `convex/licensing/tierConfigs.ts`
   - `convex/stripe/stripePrices.ts`
   - `convex/stripe/platformCheckout.ts`

### 3. Store pricing source hierarchy

1. Runtime entitlement truth: `convex/licensing/tierConfigs.ts`
2. Checkout billing truth: `convex/stripe/platformCheckout.ts`
3. Stripe plan price truth: `convex/stripe/stripePrices.ts`
4. Credits math truth: `src/lib/credit-pricing.ts`
5. Trial policy truth: `convex/stripe/trialCheckout.ts`
6. Store tax semantics truth: this document

## Tax Codes

Tax codes classify products for proper tax calculation. Stripe provides standardized codes.

### Common Tax Codes

| Code | Category | Description |
|------|----------|-------------|
| `txcd_10000000` | General | General goods and services |
| `txcd_10103000` | Digital goods | Software, streaming, downloads |
| `txcd_10401000` | Events | Tickets and admissions |
| `txcd_10501000` | Food & Beverage | Food and drink products |
| `txcd_10201000` | Clothing | Apparel and accessories |

**Reference:** [Stripe Tax Codes](https://stripe.com/docs/tax/tax-codes)

## Implementation Guide

### 1. Setting Up Organization Tax Settings

```typescript
// Create/update tax settings
await updateTaxSettings({
  sessionId,
  organizationId,
  taxEnabled: true,
  defaultTaxBehavior: "exclusive",
  defaultTaxCode: "txcd_10000000",
  originAddress: {
    addressLine1: "123 Main St",
    city: "San Francisco",
    state: "CA",
    postalCode: "94105",
    country: "US",
  },
});
```

### 2. Adding Tax Registrations

```typescript
// Register for tax collection in California
await createTaxRegistration({
  sessionId,
  organizationId,
  jurisdiction: "US-CA",
  jurisdictionName: "California, United States",
  country: "US",
  state: "CA",
  registrationNumber: "12-3456789",
  registrationDate: Date.now(),
  effectiveDate: Date.now(),
  taxAuthority: "California Department of Tax and Fee Administration",
  filingFrequency: "quarterly",
});
```

### 3. Configuring Product Taxes

```typescript
// Create product with tax configuration
await createProduct({
  sessionId,
  organizationId,
  subtype: "ticket",
  name: "VIP Ticket",
  description: "VIP access to event",
  price: 12000, // $120.00
  currency: "USD",
  customProperties: {
    taxCode: "txcd_10401000", // Event tickets
    taxBehavior: "exclusive", // Tax added separately
    taxable: true,
  },
});
```

### 4. Calculating Taxes in Checkout

```typescript
// 1. Get org tax settings
const taxSettings = await getTaxSettings({ sessionId, organizationId });

// 2. Get active tax registrations
const registrations = await getTaxRegistrations({
  sessionId,
  organizationId,
  active: true,
});

// 3. Determine customer jurisdiction from address
const customerJurisdiction = getJurisdiction(customerAddress);

// 4. Check if we should collect tax
const shouldCollectTax = registrations.some(
  r => r.subtype === customerJurisdiction
);

// 5. Calculate tax
if (shouldCollectTax && taxSettings?.customProperties?.taxEnabled) {
  const taxRate = getTaxRate(customerJurisdiction, registrations);
  const taxAmount = calculateTax(subtotal, taxRate, taxBehavior);
  const total = subtotal + taxAmount; // For exclusive
  // For inclusive: total = subtotal (tax already included)
}
```

## Payment Provider Integration

### Stripe Tax

When using Stripe, pass tax configuration in the checkout session:

```typescript
// Create Stripe checkout session with tax
const session = await stripe.checkout.sessions.create({
  line_items: [{
    price_data: {
      currency: product.currency,
      unit_amount: product.price,
      product_data: {
        name: product.name,
        tax_code: product.taxCode, // Pass tax code
      },
    },
    quantity: 1,
  }],

  // Enable automatic tax calculation
  automatic_tax: {
    enabled: taxSettings.taxEnabled,
  },

  // Customer address for tax calculation
  customer_details: {
    address: {
      line1: address.addressLine1,
      city: address.city,
      state: address.state,
      postal_code: address.postalCode,
      country: address.country,
    },
  },
});
```

### Manual Tax Calculation

For providers without automatic tax:

```typescript
function calculateTax(
  subtotal: number,
  taxRate: number,
  behavior: "inclusive" | "exclusive"
): number {
  if (behavior === "inclusive") {
    // Tax already included: extract tax amount
    return Math.round((subtotal * taxRate) / (1 + taxRate));
  } else {
    // Exclusive: calculate tax on subtotal
    return Math.round(subtotal * taxRate);
  }
}
```

## Tax Display in UI

### Product Selection Step
```
Product: VIP Ticket               $120.00
Quantity: 2
                                  --------
Subtotal:                         $240.00
Tax (CA Sales Tax 8.5%):          $20.40
                                  --------
Total:                            $260.40
```

### Confirmation Step
```
Order Summary
------------
2x VIP Ticket @ $120.00           $240.00

Subtotal:                         $240.00
Tax (CA Sales Tax 8.5%):          $20.40
Total:                            $260.40 USD
```

## Database Queries

### Key Queries Available

1. `getTaxSettings` - Get organization tax configuration
2. `getTaxRegistrations` - Get all tax registrations
3. `getTaxRegistrationByJurisdiction` - Get specific registration
4. `updateTaxSettings` - Update tax configuration
5. `createTaxRegistration` - Add new registration
6. `updateTaxRegistration` - Modify existing registration
7. `deleteTaxRegistration` - Deactivate registration

## Best Practices

1. **Always collect origin address** - Required for tax nexus determination
2. **Register before collecting** - Only collect tax where registered
3. **Use appropriate tax codes** - Ensures correct tax rates
4. **Test with multiple jurisdictions** - Verify tax calculations
5. **Display tax clearly** - Show breakdown to customers
6. **Store tax amounts** - Keep records for compliance
7. **Update registrations** - Keep registration info current

## Future Enhancements

- [ ] Tax exemption certificates
- [ ] Multi-currency tax handling
- [ ] Tax holiday support
- [ ] Automatic registration monitoring
- [ ] Tax reporting exports
- [ ] Integration with more providers (PayPal, Square)

## References

- [Stripe Tax Documentation](https://stripe.com/docs/tax)
- [Stripe Tax Codes](https://stripe.com/docs/tax/tax-codes)
- [Stripe Tax Behavior](https://stripe.com/docs/tax/products-prices-tax-codes-tax-behavior)
