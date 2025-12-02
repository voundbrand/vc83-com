# Payment API Solution - Architecture & Design

## Problem Statement

Organizations want to accept payments on their own external websites without redirecting customers to a checkout page on a different domain. They need access to their connected Stripe accounts and payment providers, but the payment processing should happen seamlessly on their own websites.

## Solution Overview

We've created a **Client-Side Payment Integration API** that allows external websites to process payments while keeping customers on their own domain. The solution leverages:

1. **Stripe Elements** - Industry-standard embeddable payment UI
2. **Your backend payment provider infrastructure** - Reuses existing Stripe Connect accounts
3. **Secure API endpoints** - API key authentication for server-to-server communication

## Architecture

```
┌─────────────────────────────────────────────────┐
│ External Website (yoursite.com)                  │
│                                                  │
│  ┌─────────────┐    ┌──────────────────┐        │
│  │ Product Page│───▶│  Checkout Page   │        │
│  └─────────────┘    │                  │        │
│                      │  ┌────────────┐  │        │
│                      │  │  Stripe    │  │        │
│                      │  │  Elements  │  │        │
│                      │  │            │  │        │
│                      │  │  Payment   │  │        │
│                      │  │    Form    │  │        │
│                      │  └────────────┘  │        │
│                      └──────────────────┘        │
└──────────────────────────────────────────────────┘
                            │
                            ├─────┐ API Calls
                            ▼     ▼
┌─────────────────────────────────────────────────┐
│ l4yercak3 Payment API (your backend)            │
│                                                  │
│  ┌──────────────────────────────────────────┐  │
│  │ GET /api/v1/checkout/config             │  │
│  │ Returns: publishableKey, provider        │  │
│  └──────────────────────────────────────────┘  │
│                                                  │
│  ┌──────────────────────────────────────────┐  │
│  │ POST /api/v1/checkout/sessions          │  │
│  │ Returns: clientSecret, sessionId         │  │
│  └──────────────────────────────────────────┘  │
│                                                  │
│  ┌──────────────────────────────────────────┐  │
│  │ POST /api/v1/checkout/confirm            │  │
│  │ Returns: tickets, invoices, downloads    │  │
│  └──────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────┐
│ Payment Providers                                │
│                                                  │
│  ├─ Stripe Connect (organization's account)     │
│  ├─ PayPal (future)                             │
│  └─ Invoice Provider (B2B)                      │
└─────────────────────────────────────────────────┘
```

## Payment Flow

### 1. Get Payment Configuration

**Client → l4yercak3 API**
```http
GET /api/v1/checkout/config
Authorization: Bearer YOUR_API_KEY
```

**l4yercak3 API → Client**
```json
{
  "provider": "stripe",
  "providerName": "Stripe",
  "publishableKey": "pk_live_...",  // Safe to expose
  "accountId": "acct_...",
  "supportedCurrencies": ["usd", "eur", "gbp"]
}
```

### 2. Create Checkout Session

**Client → l4yercak3 API**
```http
POST /api/v1/checkout/sessions
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json

{
  "productId": "obj_...",
  "quantity": 1,
  "customerEmail": "customer@example.com",
  "customerName": "John Doe"
}
```

**l4yercak3 API → Stripe API (server-side)**
```javascript
// Uses existing payment provider infrastructure
const provider = getProviderByCode("stripe-connect");
const session = await provider.createCheckoutSession({
  organizationId,
  productId,
  priceInCents,
  currency,
  quantity,
  customerEmail,
  connectedAccountId,  // Organization's Stripe account
  ...
});
```

**l4yercak3 API → Client**
```json
{
  "sessionId": "obj_...",
  "clientSecret": "pi_..._secret_...",  // For Stripe Elements
  "amount": 9900,
  "currency": "usd",
  "expiresAt": 1234567890
}
```

### 3. Initialize Stripe Elements (Client-Side)

**Client Website**
```javascript
// Initialize Stripe with publishable key
const stripe = Stripe(publishableKey);

// Create Elements instance with clientSecret
const elements = stripe.elements({
  clientSecret: clientSecret,
  appearance: { theme: 'stripe' }
});

// Mount payment form
const paymentElement = elements.create('payment');
paymentElement.mount('#payment-element');

// Customer enters payment details and submits
await stripe.confirmPayment({
  elements,
  confirmParams: {
    return_url: 'https://yoursite.com/success'
  }
});
```

**Customer stays on `yoursite.com` throughout payment!**

### 4. Verify Payment & Fulfill Order

**Client → l4yercak3 API**
```http
POST /api/v1/checkout/confirm
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json

{
  "sessionId": "obj_...",
  "paymentIntentId": "pi_..."  // From Stripe redirect
}
```

**l4yercak3 API (server-side)**
```javascript
// 1. Verify payment with Stripe
const provider = getProviderByCode("stripe-connect");
const paymentResult = await provider.verifyCheckoutPayment(paymentIntentId);

// 2. Fulfill order (creates tickets, CRM contacts, invoices, etc.)
const result = await completeCheckoutWithTickets({
  sessionId,
  checkoutSessionId,
  paymentIntentId
});

// 3. Return fulfillment details
return {
  success: true,
  ticketIds: [...],
  invoiceId: "...",
  downloadUrls: {
    tickets: "https://l4yercak3.com/api/v1/tickets/.../download",
    invoice: "https://l4yercak3.com/api/v1/invoices/.../download"
  }
};
```

## Security Model

### API Key Authentication

- **API keys** are organization-scoped
- **API calls** must include `Authorization: Bearer YOUR_API_KEY` header
- **Keys can be revoked** in the dashboard
- **Usage tracked** for rate limiting and analytics

### Publishable Key Exposure

- **Safe to expose on frontend** - Stripe's publishable key (pk_...)
- **Cannot be used for charges** - Only for initializing Stripe Elements
- **Client-side only** - Used to render payment forms

### Secret Key Protection

- **Never exposed** - Secret keys (sk_...) stay on your backend
- **Server-to-server only** - All payment processing uses secret keys
- **Stripe Connect scoping** - Each organization uses their own account

## Benefits

### For Organizations

1. **Keep customers on their own domain** - No redirect to external checkout
2. **Brand consistency** - Customize payment UI to match their website
3. **Use their own Stripe account** - No need to integrate Stripe separately
4. **Full automation** - Tickets, invoices, CRM integration happen automatically

### For Developers

1. **Industry-standard UI** - Stripe Elements handles PCI compliance
2. **Simple API** - Only 3 endpoints needed
3. **Flexible** - Works with any frontend framework (React, Vue, plain HTML)
4. **Provider-agnostic** - Same API works for Stripe, PayPal, Invoice providers

### For Customers

1. **Seamless experience** - Never leave the merchant's website
2. **Trusted payment UI** - Recognizable Stripe Elements interface
3. **Immediate delivery** - Tickets and invoices sent right away

## Implementation Files

### Backend (Convex)

- **convex/api/v1/checkout.ts** - HTTP endpoint handlers
- **convex/api/v1/checkoutInternal.ts** - Business logic (queries, mutations, actions)
- **convex/http.ts** - Route registration
- **convex/paymentProviders/stripe.ts** - Stripe Connect provider (reused)
- **convex/checkoutSessions.ts** - Existing checkout completion logic (reused)

### API Routes

- `GET /api/v1/checkout/config` - Get payment provider configuration
- `POST /api/v1/checkout/sessions` - Create checkout session
- `POST /api/v1/checkout/confirm` - Verify payment and fulfill order

### Documentation

- **docs/PAYMENT_API_INTEGRATION.md** - Complete integration guide
- **docs/API_PAYMENT_SOLUTION.md** - This architecture document

## Code Reuse

This solution **maximizes code reuse** by:

1. **Reusing payment provider abstraction** (`convex/paymentProviders/`)
2. **Reusing checkout completion logic** (`completeCheckoutWithTickets`)
3. **Reusing fulfillment workflows** (ticket generation, email sending, CRM integration)
4. **Reusing existing Stripe Connect accounts** (no separate integration needed)

## Example Use Cases

### Event Ticketing

External event website → Embedded Stripe checkout → Instant ticket delivery

### B2B SaaS

Company website → Subscription payment → Invoice sent to billing department

### E-Commerce

Product pages → Add to cart → Checkout with Stripe Elements → Order fulfillment

## Future Enhancements

1. **PayPal Support** - Add PayPal checkout option
2. **Digital Wallets** - Apple Pay, Google Pay integration
3. **Subscription Management** - Recurring payment endpoints
4. **Webhooks** - Optional webhook notifications to customer websites
5. **Multi-Currency** - Dynamic currency selection
6. **Payment Links** - Generate shareable payment URLs

## Testing

### Test Mode

- Use test API keys (`sk_test_...`)
- Connect test Stripe accounts
- Use test payment methods (4242 4242 4242 4242)

### Production Mode

- Use live API keys (`sk_live_...`)
- Connect live Stripe accounts
- Real payment processing

## Support

For questions or issues with this API integration:

- **Documentation**: [docs/PAYMENT_API_INTEGRATION.md](./PAYMENT_API_INTEGRATION.md)
- **Email**: support@l4yercak3.com
- **Discord**: https://discord.gg/l4yercak3
