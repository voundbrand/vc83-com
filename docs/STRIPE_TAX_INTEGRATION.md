# Stripe Tax Integration

## Overview

The Stripe payment provider now includes full tax calculation and collection support using the tax system. This integration enables automatic tax calculation based on customer location, tax registrations, and product tax codes.

## Updated Types

### CheckoutItem (Core Types)

Added tax configuration fields to checkout items:

```typescript
interface CheckoutItem {
  // ... existing fields ...

  // Tax configuration
  taxCode?: string; // Stripe tax code (e.g., "txcd_10000000")
  taxBehavior?: "inclusive" | "exclusive" | "automatic";
  taxable?: boolean;
}
```

### CreateSessionOptions (Provider Types)

Added tax settings and customer address to session creation options:

```typescript
interface CreateSessionOptions {
  // ... existing fields ...

  // Tax configuration
  taxSettings?: TaxSettings;
  customerAddress?: CustomerAddress;
}
```

### TaxSettings

New interface for organization tax configuration:

```typescript
interface TaxSettings {
  taxEnabled: boolean;
  defaultTaxBehavior?: "inclusive" | "exclusive" | "automatic";
  defaultTaxCode?: string; // e.g., "txcd_10000000"
  originAddress?: {
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state?: string;
    postalCode: string;
    country: string;
  };
  stripeSettings?: {
    taxCalculationEnabled?: boolean;
    taxCodeValidation?: boolean;
  };
}
```

### CustomerAddress

Interface for customer address required for tax calculation:

```typescript
interface CustomerAddress {
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
}
```

## Updated Stripe Provider

### Enhanced createSession Method

The `createSession` method now:

1. **Accepts tax configuration** via `CreateSessionOptions`
2. **Applies tax codes** to line items from products or defaults
3. **Sets tax behavior** (inclusive/exclusive/automatic) per item
4. **Passes customer address** for tax calculation
5. **Enables automatic tax** when configured

```typescript
async createSession(options: CreateSessionOptions): Promise<CheckoutSession> {
  // Prepare tax configuration from options
  const taxConfig = options.taxSettings ? {
    automaticTaxEnabled: options.taxSettings.taxEnabled,
    originAddress: options.taxSettings.originAddress,
    stripeSettings: options.taxSettings.stripeSettings,
  } : undefined;

  // Extract tax codes from items
  const itemsWithTax = options.items.map((item) => ({
    ...item,
    taxCode: item.taxCode || options.taxSettings?.defaultTaxCode,
    taxBehavior: item.taxBehavior || options.taxSettings?.defaultTaxBehavior || "exclusive",
  }));

  // Call Convex action with tax configuration
  const response = await fetch("/api/checkout/create-stripe-session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      items: itemsWithTax,
      quantity: options.quantity,
      organizationId: options.organizationId,
      successUrl: options.successUrl,
      cancelUrl: options.cancelUrl,
      metadata: options.metadata,
      taxConfig,
      customerAddress: options.customerAddress,
    }),
  });

  // ... rest of implementation
}
```

## Usage Example

### 1. Load Tax Settings

First, fetch the organization's tax settings:

```typescript
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

const taxSettings = useQuery(api.organizationTaxSettings.getTaxSettings, {
  sessionId,
  organizationId,
});
```

### 2. Prepare Product with Tax Configuration

Products should include tax configuration:

```typescript
const product: CheckoutItem = {
  id: productId,
  name: "VIP Ticket",
  description: "VIP access to event",
  price: 12000, // $120.00
  currency: "USD",

  // Tax configuration from product data
  taxCode: "txcd_10401000", // Event tickets
  taxBehavior: "exclusive", // Tax added separately
  taxable: true,
};
```

### 3. Collect Customer Address

Collect customer address during checkout:

```typescript
const [address, setAddress] = useState<CustomerAddress>({
  addressLine1: "",
  city: "",
  state: "",
  postalCode: "",
  country: "US",
});
```

### 4. Create Checkout Session with Tax

Pass tax settings and address to provider:

```typescript
import { StripePaymentProvider } from "./providers/stripe";

const provider = new StripePaymentProvider();
await provider.initialize(providerConfig);

const session = await provider.createSession({
  items: [product],
  quantity: 2,
  organizationId,
  successUrl: "/checkout/success",
  cancelUrl: "/checkout/cancel",

  // Tax configuration
  taxSettings: {
    taxEnabled: taxSettings?.customProperties?.taxEnabled ?? false,
    defaultTaxBehavior: taxSettings?.customProperties?.defaultTaxBehavior,
    defaultTaxCode: taxSettings?.customProperties?.defaultTaxCode,
    originAddress: taxSettings?.customProperties?.originAddress,
    stripeSettings: taxSettings?.customProperties?.stripeSettings,
  },
  customerAddress: address,
});

// Redirect to Stripe Checkout
await provider.redirectToCheckout(session);
```

## Backend Implementation

### Convex Action: Create Stripe Session

The backend Convex action should handle the tax configuration:

```typescript
// convex/paymentProviders/stripe.ts

export const createCheckoutSession = action({
  args: {
    items: v.array(v.object({
      id: v.id("objects"),
      name: v.string(),
      price: v.number(),
      currency: v.string(),
      taxCode: v.optional(v.string()),
      taxBehavior: v.optional(v.union(
        v.literal("inclusive"),
        v.literal("exclusive"),
        v.literal("automatic")
      )),
    })),
    quantity: v.number(),
    organizationId: v.id("organizations"),
    taxConfig: v.optional(v.object({
      automaticTaxEnabled: v.boolean(),
      originAddress: v.optional(v.object({
        addressLine1: v.string(),
        city: v.string(),
        state: v.optional(v.string()),
        postalCode: v.string(),
        country: v.string(),
      })),
    })),
    customerAddress: v.optional(v.object({
      addressLine1: v.string(),
      city: v.string(),
      state: v.optional(v.string()),
      postalCode: v.string(),
      country: v.string(),
    })),
    successUrl: v.string(),
    cancelUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

    // Build line items with tax configuration
    const lineItems = args.items.map((item) => ({
      price_data: {
        currency: item.currency,
        unit_amount: item.price,
        product_data: {
          name: item.name,
          tax_code: item.taxCode, // Tax code for calculation
        },
        // Tax behavior: inclusive, exclusive, or automatic
        tax_behavior: item.taxBehavior || "exclusive",
      },
      quantity: args.quantity,
    }));

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      line_items: lineItems,
      mode: "payment",
      success_url: args.successUrl,
      cancel_url: args.cancelUrl,

      // Enable automatic tax calculation
      automatic_tax: {
        enabled: args.taxConfig?.automaticTaxEnabled ?? false,
      },

      // Customer address for tax calculation
      customer_details: args.customerAddress ? {
        address: {
          line1: args.customerAddress.addressLine1,
          city: args.customerAddress.city,
          state: args.customerAddress.state,
          postal_code: args.customerAddress.postalCode,
          country: args.customerAddress.country,
        },
      } : undefined,
    });

    return {
      sessionId: session.id,
      url: session.url,
    };
  },
});
```

## Tax Behavior Modes

### Exclusive (Most Common in US)

Tax is calculated separately and added to the product price:

```typescript
Product: $120.00
Tax (8.5%): $10.20
Total: $130.20
```

### Inclusive (Most Common in EU)

Tax is already included in the product price:

```typescript
Product: €119.00 (includes €19.00 VAT)
Total: €119.00
```

### Automatic

Behavior determined by product currency:
- USD, CAD, AUD → Exclusive
- EUR, GBP → Inclusive

## Tax Codes

Use appropriate Stripe tax codes for products:

| Code | Category | Description |
|------|----------|-------------|
| `txcd_10000000` | General | General goods and services |
| `txcd_10103000` | Digital goods | Software, streaming, downloads |
| `txcd_10401000` | Events | Tickets and admissions |
| `txcd_10501000` | Food & Beverage | Food and drink products |

**Full list:** [Stripe Tax Codes](https://stripe.com/docs/tax/tax-codes)

## Testing

### Test with Different Jurisdictions

1. **US California** (8.5% sales tax)
   ```typescript
   customerAddress: {
     addressLine1: "123 Main St",
     city: "San Francisco",
     state: "CA",
     postalCode: "94105",
     country: "US",
   }
   ```

2. **EU Germany** (19% VAT)
   ```typescript
   customerAddress: {
     addressLine1: "Hauptstraße 1",
     city: "Berlin",
     postalCode: "10115",
     country: "DE",
   }
   ```

3. **No Tax Region**
   ```typescript
   customerAddress: {
     addressLine1: "123 Street",
     city: "Portland",
     state: "OR",
     postalCode: "97201",
     country: "US",
   }
   ```

### Test Mode

Use Stripe test mode to verify tax calculations without real charges:

```typescript
// In test mode, Stripe calculates tax but doesn't collect it
const testMode = process.env.NODE_ENV !== "production";
```

## Important Notes

1. **Tax Registrations Required** - Only collect tax in jurisdictions where you're registered
2. **Product Tax Codes** - Use specific tax codes for accurate calculation
3. **Customer Address** - Required for automatic tax calculation
4. **Origin Address** - Set your business address in tax settings
5. **Test Thoroughly** - Verify calculations in multiple jurisdictions
6. **Stripe Tax** - Requires Stripe Tax to be enabled on your account

## References

- [Tax System Documentation](./TAX_SYSTEM.md)
- [Stripe Tax Documentation](https://stripe.com/docs/tax)
- [Stripe Tax Codes](https://stripe.com/docs/tax/tax-codes)
- [Stripe Checkout Tax](https://stripe.com/docs/payments/checkout/taxes)
