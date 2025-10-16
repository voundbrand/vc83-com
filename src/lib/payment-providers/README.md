# Frontend Payment Providers

Client-side payment provider integrations for checkout and payment collection.

## Purpose

This directory contains **frontend payment providers** - client-side implementations that handle:
- Checkout session creation
- Payment redirect flows
- Client SDK integration (Stripe.js, PayPal SDK, etc.)
- Tax calculation integration
- Payment UI components

## NOT in This Directory

**Backend payment operations** (OAuth, webhooks, payouts) are in `convex/paymentProviders/`.

See [PAYMENT_PROVIDERS_ARCHITECTURE.md](../../../docs/PAYMENT_PROVIDERS_ARCHITECTURE.md) for details on the dual-layer architecture.

## Files

- **`index.ts`** - Main exports and provider registry
- **`types.ts`** - TypeScript interfaces and types
- **`stripe.ts`** - Stripe Checkout implementation
- **`manual.ts`** - Manual payment flow
- **`paypal.ts`** - PayPal Checkout (future)

## Usage

### Basic Usage

```typescript
import { StripePaymentProvider } from "@/lib/payment-providers";

// Initialize provider
const provider = new StripePaymentProvider();
await provider.initialize({
  providerId,
  providerCode: "stripe",
  isEnabled: true,
  isDefault: true,
  credentials: {
    publishableKey: "pk_test_...",
  },
  settings: {},
});

// Create checkout session
const session = await provider.createSession({
  items: [product],
  quantity: 2,
  organizationId,
  successUrl: "/checkout/success",
  cancelUrl: "/checkout/cancel",
  taxSettings: {
    taxEnabled: true,
    defaultTaxBehavior: "exclusive",
    defaultTaxCode: "txcd_10000000",
  },
  customerAddress: {
    addressLine1: "123 Main St",
    city: "San Francisco",
    state: "CA",
    postalCode: "94105",
    country: "US",
  },
});

// Redirect to checkout
await provider.redirectToCheckout(session);
```

### Using Provider Registry

```typescript
import { getPaymentProvider } from "@/lib/payment-providers";

// Get provider by config
const provider = await getPaymentProvider({
  providerCode: "stripe",
  credentials: { publishableKey: "pk_test_..." },
  // ... other config
});

// Use provider
const session = await provider.createSession(options);
```

### Available Providers

```typescript
import { getAvailableProviders, isValidProvider } from "@/lib/payment-providers";

// Get all provider codes
const providers = getAvailableProviders();
// ["stripe", "manual"]

// Check if provider exists
if (isValidProvider("stripe")) {
  // Provider is available
}
```

## Tax Integration

All providers support automatic tax calculation:

```typescript
const session = await provider.createSession({
  items: [{
    id: productId,
    name: "VIP Ticket",
    price: 12000, // $120.00
    currency: "USD",
    taxCode: "txcd_10401000", // Event tickets
    taxBehavior: "exclusive",
    taxable: true,
  }],
  taxSettings: {
    taxEnabled: true,
    defaultTaxBehavior: "exclusive",
    originAddress: {
      addressLine1: "123 Business St",
      city: "San Francisco",
      state: "CA",
      postalCode: "94105",
      country: "US",
    },
  },
  customerAddress: {
    // Customer's address for tax calculation
  },
});
```

See [STRIPE_TAX_INTEGRATION.md](../../../docs/STRIPE_TAX_INTEGRATION.md) for details.

## Provider Interface

All providers implement `IPaymentProvider`:

```typescript
interface IPaymentProvider {
  // Identity
  readonly providerCode: string;
  readonly providerName: string;

  // Initialization
  initialize(config: PaymentProviderConfig): Promise<void>;

  // Checkout operations
  createSession(options: CreateSessionOptions): Promise<CheckoutSession>;
  redirectToCheckout(session: CheckoutSession): Promise<void>;
  validateSession(sessionId: string): Promise<SessionValidationResult>;
  getPaymentResult(sessionId: string): Promise<PaymentResult>;
  cancelSession(sessionId: string): Promise<void>;

  // Status
  isConfigured(): boolean;
  getMetadata(): ProviderMetadata;
}
```

## Adding a New Provider

1. **Create provider file** (e.g., `paypal.ts`):

```typescript
import { IPaymentProvider, PaymentProviderConfig } from "./types";

export class PayPalPaymentProvider implements IPaymentProvider {
  readonly providerCode = "paypal";
  readonly providerName = "PayPal";

  async initialize(config: PaymentProviderConfig): Promise<void> {
    // Load PayPal SDK
  }

  async createSession(options: CreateSessionOptions): Promise<CheckoutSession> {
    // Create PayPal order
  }

  // Implement other methods...
}
```

2. **Register in `index.ts`**:

```typescript
import { PayPalPaymentProvider } from "./paypal";

const providerRegistry: Record<string, new () => IPaymentProvider> = {
  stripe: StripePaymentProvider,
  manual: ManualPaymentProvider,
  paypal: PayPalPaymentProvider, // ← Add here
};
```

3. **Export from `index.ts`**:

```typescript
export { PayPalPaymentProvider } from "./paypal";
```

## Testing

```typescript
import { StripePaymentProvider } from "@/lib/payment-providers";

test("creates checkout session", async () => {
  const provider = new StripePaymentProvider();
  await provider.initialize(testConfig);

  const session = await provider.createSession({
    items: [testProduct],
    quantity: 1,
    organizationId: testOrgId,
  });

  expect(session.id).toBeDefined();
  expect(session.status).toBe("pending");
});
```

## Security

### ✅ Safe for Frontend
- Only uses **publishable keys** (safe to expose)
- No secret keys or sensitive data
- All payment processing happens on provider's secure servers

### ❌ Never Do This
```typescript
// ❌ DON'T: Never put secret keys in frontend
const config = {
  credentials: {
    secretKey: "sk_test_...", // NEVER!
  },
};
```

### ✅ Do This Instead
```typescript
// ✅ DO: Only use publishable keys
const config = {
  credentials: {
    publishableKey: "pk_test_...", // Safe for frontend
  },
};
```

## Architecture

```
┌────────────────────────────────────┐
│   Frontend Payment Providers       │
│   (src/lib/payment-providers/)     │
└────────────────┬───────────────────┘
                 │
         ┌───────┼───────┐
         │       │       │
    ┌────▼──┐ ┌──▼───┐ ┌▼─────┐
    │Stripe │ │PayPal│ │Manual│
    └────┬──┘ └──┬───┘ └┬─────┘
         │       │      │
         └───────┼──────┘
                 │
         ┌───────▼────────┐
         │  Checkout UI   │
         └────────────────┘
```

## Backend Integration

Frontend providers call backend actions to create sessions:

```typescript
// Frontend → Backend
const response = await fetch("/api/checkout/create-stripe-session", {
  method: "POST",
  body: JSON.stringify({
    items,
    taxConfig,
    customerAddress,
  }),
});

// Backend action (convex/)
export const createCheckoutSession = action({
  handler: async (ctx, args) => {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    const session = await stripe.checkout.sessions.create({
      // Create session with secret key
    });
    return { sessionId: session.id, url: session.url };
  },
});
```

## Documentation

- **Architecture**: [PAYMENT_PROVIDERS_ARCHITECTURE.md](../../../docs/PAYMENT_PROVIDERS_ARCHITECTURE.md)
- **Migration Guide**: [PAYMENT_PROVIDERS_MIGRATION.md](../../../docs/PAYMENT_PROVIDERS_MIGRATION.md)
- **Tax Integration**: [STRIPE_TAX_INTEGRATION.md](../../../docs/STRIPE_TAX_INTEGRATION.md)
- **Tax System**: [TAX_SYSTEM.md](../../../docs/TAX_SYSTEM.md)

## Related

- **Backend Providers**: `convex/paymentProviders/` - Server-side payment operations
- **Checkout Templates**: `src/templates/checkout/` - Checkout UI components
- **Checkout Core**: `src/templates/checkout/core/` - Shared checkout logic
