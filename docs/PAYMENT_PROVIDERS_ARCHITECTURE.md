# Payment Providers Architecture

## Overview

The l4yercak3.com platform uses a **dual payment provider architecture** that separates backend payment operations from frontend checkout integrations. This separation provides clear boundaries, better maintainability, and allows each system to evolve independently.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      PAYMENT SYSTEM                          │
└─────────────────────────────────────────────────────────────┘
                            │
                            ├─────────────────────────────────┐
                            │                                 │
                ┌───────────▼──────────┐        ┌────────────▼─────────┐
                │  BACKEND PROVIDERS   │        │  FRONTEND PROVIDERS  │
                │  (Server-side)       │        │  (Client-side)       │
                └──────────────────────┘        └──────────────────────┘
                            │                                 │
            ┌───────────────┼───────────────┐    ┌───────────┼──────────┐
            │               │               │    │           │          │
    ┌───────▼──────┐ ┌─────▼────┐ ┌───────▼────▼──┐ ┌──────▼─────┐ ┌──▼────┐
    │ Stripe       │ │ PayPal   │ │ Stripe        │ │ PayPal     │ │Manual │
    │ Connect      │ │ Connect  │ │ Checkout      │ │ Checkout   │ │Payment│
    │              │ │          │ │               │ │            │ │       │
    │ - OAuth      │ │ - OAuth  │ │ - Stripe.js   │ │ - SDK      │ │ - Form│
    │ - Webhooks   │ │ - IPN    │ │ - Sessions    │ │ - Sessions │ │       │
    │ - Payouts    │ │ - Payouts│ │ - Redirects   │ │ - Redirects│ │       │
    └──────────────┘ └──────────┘ └───────────────┘ └────────────┘ └───────┘
```

## Two-Layer System

### 1. Backend Providers (`convex/paymentProviders/`)

**Purpose**: Server-side payment operations and account management

**Location**: `convex/paymentProviders/`

**Key Files**:
```
convex/paymentProviders/
├── index.ts          # Public API exports
├── types.ts          # Server-side interfaces
├── manager.ts        # Provider registry
├── helpers.ts        # Utility functions
├── stripe.ts         # Stripe Connect implementation
└── paypal.ts         # PayPal Connect (future)
```

**Responsibilities**:
- ✅ **Account Onboarding** - OAuth flows for connecting merchant accounts
- ✅ **Webhook Handling** - Process payment events (payment_intent.succeeded, etc.)
- ✅ **Payout Management** - Handle transfers to merchant accounts
- ✅ **Subscription Management** - Recurring billing operations
- ✅ **Refund Processing** - Issue refunds and manage disputes
- ✅ **Security** - API key management, webhook verification

**Key Interface**:
```typescript
interface IPaymentProvider {
  // Identity
  providerCode: string;
  providerName: string;
  providerIcon: string;

  // Account management
  startAccountConnection(params: ConnectionParams): Promise<ConnectionResult>;
  completeOAuthConnection?(code: string): Promise<{ accountId: string }>;
  getAccountStatus(accountId: string): Promise<AccountStatus>;

  // Webhook handling
  handleWebhook(event: WebhookEvent): Promise<WebhookResponse>;
  verifyWebhookSignature(payload: string, signature: string): boolean;

  // Payout operations
  createPayout(params: PayoutParams): Promise<PayoutResult>;
  getPayoutStatus(payoutId: string): Promise<PayoutStatus>;
}
```

**Usage Example**:
```typescript
// In Convex action
const provider = await getPaymentProvider("stripe-connect");
const result = await provider.startAccountConnection({
  organizationId,
  returnUrl: "/settings/payments",
});
```

### 2. Frontend Providers (`src/lib/payment-providers/`)

**Purpose**: Client-side checkout and payment collection

**Location**: `src/lib/payment-providers/`

**Key Files**:
```
src/lib/payment-providers/
├── index.ts          # Public API exports
├── types.ts          # Client-side interfaces
├── stripe.ts         # Stripe Checkout implementation
├── paypal.ts         # PayPal Checkout (future)
└── manual.ts         # Manual payment flow
```

**Responsibilities**:
- ✅ **Checkout Sessions** - Create payment sessions
- ✅ **Client SDK Integration** - Load Stripe.js, PayPal SDK, etc.
- ✅ **Payment Redirects** - Handle checkout redirects
- ✅ **Session Validation** - Verify payment completion
- ✅ **Tax Calculation** - Apply taxes to checkout
- ✅ **UI Components** - Payment forms and buttons

**Key Interface**:
```typescript
interface IPaymentProvider {
  // Identity
  providerCode: string;
  providerName: string;

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

**Usage Example**:
```typescript
// In React component
import { StripePaymentProvider } from "@/lib/payment-providers";

const provider = new StripePaymentProvider();
await provider.initialize(providerConfig);

const session = await provider.createSession({
  items: [product],
  quantity: 2,
  taxSettings,
  customerAddress,
});

await provider.redirectToCheckout(session);
```

## Key Differences

| Aspect | Backend Providers | Frontend Providers |
|--------|------------------|-------------------|
| **Location** | `convex/paymentProviders/` | `src/lib/payment-providers/` |
| **Environment** | Server-side (Convex actions) | Client-side (React) |
| **Dependencies** | `stripe` Node SDK | `@stripe/stripe-js` |
| **Purpose** | Account management, webhooks | Checkout, payment collection |
| **Secrets** | Has access to secret keys | Only publishable keys |
| **Responsibilities** | OAuth, payouts, refunds | Sessions, redirects, UI |

## Why Two Systems?

### Security
- **Backend**: Can safely use secret API keys
- **Frontend**: Only uses publishable keys, no secrets

### Separation of Concerns
- **Backend**: Account setup and management (rare operations)
- **Frontend**: Daily payment collection (frequent operations)

### Different Lifecycles
- **Backend**: Provider connection happens once during onboarding
- **Frontend**: Checkout happens every transaction

### Independent Evolution
- Backend can add new providers (Square, Adyen) without affecting checkout
- Frontend can redesign checkout without touching account management

## Data Flow

### Account Connection Flow (Backend)
```
1. User clicks "Connect Stripe Account"
   ↓
2. Backend provider creates OAuth URL
   ↓
3. User redirects to Stripe
   ↓
4. User authorizes connection
   ↓
5. Stripe redirects back with code
   ↓
6. Backend provider exchanges code for account ID
   ↓
7. Store account ID in database
```

### Checkout Flow (Frontend)
```
1. Customer selects product
   ↓
2. Frontend provider loads tax settings
   ↓
3. Customer enters address (for tax)
   ↓
4. Frontend provider creates checkout session
   ↓
5. Customer redirects to Stripe Checkout
   ↓
6. Customer completes payment
   ↓
7. Stripe webhook notifies backend provider
   ↓
8. Backend provider processes webhook
   ↓
9. Customer redirects back to success page
```

## Integration Points

### Backend → Database
```typescript
// Store provider configuration
await ctx.db.insert("objects", {
  type: "paymentProvider",
  organizationId,
  customProperties: {
    providerCode: "stripe-connect",
    connectedAccountId: "acct_123",
    credentials: { /* encrypted */ },
  },
});
```

### Frontend → Backend
```typescript
// Frontend calls backend to create session
const response = await fetch("/api/checkout/create-stripe-session", {
  method: "POST",
  body: JSON.stringify({
    items,
    taxConfig,
    customerAddress,
  }),
});
```

### Backend → Provider
```typescript
// Backend action calls Stripe
const session = await stripe.checkout.sessions.create({
  line_items: [...],
  automatic_tax: { enabled: true },
  customer_details: { address: {...} },
});
```

## Configuration

### Backend Provider Config
```typescript
{
  providerId: Id<"objects">,
  providerCode: "stripe-connect",
  organizationId: Id<"organizations">,
  credentials: {
    stripeAccountId: "acct_123",
    // Encrypted in database
  },
  settings: {
    webhookSecret: "whsec_***",
    statementDescriptor: "MYSTORE",
  }
}
```

### Frontend Provider Config
```typescript
{
  providerId: Id<"objects">,
  providerCode: "stripe",
  isEnabled: true,
  isDefault: true,
  credentials: {
    publishableKey: "pk_test_***", // Safe for frontend
  },
  settings: {
    currency: "USD",
    locale: "en",
  }
}
```

## Adding a New Provider

### Backend Provider (e.g., PayPal Connect)
1. Create `convex/paymentProviders/paypal.ts`
2. Implement `IPaymentProvider` interface
3. Add OAuth flow methods
4. Add webhook handler
5. Register in `manager.ts`

### Frontend Provider (e.g., PayPal Checkout)
1. Create `src/lib/payment-providers/paypal.ts`
2. Implement `IPaymentProvider` interface
3. Add SDK initialization
4. Add session creation
5. Export from `index.ts`

## Best Practices

### Backend Providers
- ✅ Always verify webhook signatures
- ✅ Use idempotency keys for operations
- ✅ Store sensitive data encrypted
- ✅ Log all provider operations
- ✅ Handle provider errors gracefully

### Frontend Providers
- ✅ Never expose secret keys
- ✅ Load provider SDKs asynchronously
- ✅ Handle network errors
- ✅ Show loading states
- ✅ Validate before calling backend

## Testing

### Backend Provider Testing
```typescript
// Test webhook handling
test("handles payment_intent.succeeded webhook", async () => {
  const provider = new StripeConnectProvider();
  const result = await provider.handleWebhook({
    type: "payment_intent.succeeded",
    data: { /* test data */ },
  });
  expect(result.success).toBe(true);
});
```

### Frontend Provider Testing
```typescript
// Test session creation
test("creates checkout session with tax", async () => {
  const provider = new StripePaymentProvider();
  await provider.initialize(testConfig);

  const session = await provider.createSession({
    items: [testProduct],
    taxSettings: { taxEnabled: true },
  });

  expect(session.id).toBeDefined();
});
```

## Migration Guide

If you're upgrading from the old structure, see [PAYMENT_PROVIDERS_MIGRATION.md](./PAYMENT_PROVIDERS_MIGRATION.md).

## References

- **Stripe Tax Integration**: [STRIPE_TAX_INTEGRATION.md](./STRIPE_TAX_INTEGRATION.md)
- **Tax System**: [TAX_SYSTEM.md](./TAX_SYSTEM.md)
- **Backend Providers**: `convex/paymentProviders/README.md` (if exists)
- **Frontend Providers**: `src/lib/payment-providers/README.md` (to be created)

## Future Enhancements

### Backend
- [ ] PayPal Connect integration
- [ ] Square Connect integration
- [ ] Multi-currency payouts
- [ ] Automated reconciliation

### Frontend
- [ ] PayPal Checkout
- [ ] Apple Pay / Google Pay
- [ ] Buy Now Pay Later (Klarna, Affirm)
- [ ] Cryptocurrency payments
