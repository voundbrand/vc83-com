# Backend API Payload Structure (For Frontend Integration)

## 🎯 Overview

This document defines the **exact payload structure** that your backend expects from your frontend application. Use this as the source of truth when building your frontend checkout integration.

**Backend API Base URL**: `https://agreeable-lion-828.convex.site` (from your deployment)

---

## 📋 Table of Contents

1. [Authentication](#authentication)
2. [Endpoint 1: Create Checkout Session](#endpoint-1-create-checkout-session)
3. [Endpoint 2: Confirm Payment](#endpoint-2-confirm-payment)
4. [Endpoint 3: Get Checkout Config (Optional)](#endpoint-3-get-checkout-config)
5. [Complete Flow Examples](#complete-flow-examples)
6. [TypeScript Types](#typescript-types)

---

## 🔐 Authentication

All API requests require Bearer token authentication:

```typescript
headers: {
  'Authorization': 'Bearer YOUR_API_KEY',
  'Content-Type': 'application/json',
}
```

**API Key Format**: `org_{organizationId}_{random32chars}`

Example: `org_j97a2b3c4d5e6f7g8h9i_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`

---

## Endpoint 1: Create Checkout Session

**URL**: `POST /api/v1/checkout/sessions`

**Purpose**: Creates a checkout session with all registration data. Returns `clientSecret` for Stripe Elements or indicates no payment needed.

### Request Payload Structure

```typescript
{
  // REQUIRED FIELDS
  "organizationId": "j97abc123...",           // Your platform org ID
  "checkoutInstanceId": "k123abc...",         // Checkout instance ID
  "productIds": ["m456def..."],                // Array of product IDs
  "quantities": [1],                           // Array of quantities (matches productIds)

  // CUSTOMER INFORMATION (REQUIRED)
  "customerEmail": "john.doe@example.com",
  "customerName": "John Doe",                 // Full name
  "customerPhone": "+49123456789",            // Optional but recommended

  // PAYMENT METHOD (REQUIRED)
  "paymentMethod": "free" | "stripe" | "invoice",

  // FORM RESPONSES (Event Registration Data)
  "formResponses": [
    {
      "productId": "m456def...",              // Must match one from productIds
      "ticketNumber": 1,                      // Sequential number (1, 2, 3...)
      "formId": "form_event_registration",    // Optional: form template ID
      "responses": {
        // Your custom form fields
        "firstName": "John",
        "lastName": "Doe",
        "email": "john.doe@example.com",
        "phone": "+49123456789",
        "organization": "ACME Corp",
        "attendee_category": "external",      // "internal" | "external" | "partner"
        "dietary_requirements": "vegetarian",
        "consent_privacy": true,
        // ... any other custom fields
      },
      "addedCosts": 0                         // Dynamic pricing from form (in cents)
    }
  ],

  // B2B TRANSACTION FIELDS (Optional - for manual invoices)
  "transactionType": "B2C" | "B2B",           // Omit for B2C
  "companyName": "ACME Corporation",          // Required if B2B
  "vatNumber": "DE123456789",                 // Required for EU B2B
  "billingAddress": {                         // Required if B2B invoice
    "line1": "Hauptstraße 1",
    "line2": "Suite 200",                     // Optional
    "city": "Berlin",
    "state": "Berlin",                        // Optional (US states)
    "postalCode": "10115",
    "country": "Germany"
  }
}
```

### Response Structure

```typescript
{
  // SUCCESS RESPONSE
  "checkoutSessionId": "k789xyz...",        // Checkout session ID (use in confirm)
  "sessionId": "sess_abc123",               // Legacy: same as checkoutSessionId
  "clientSecret": "pi_abc123_secret_xyz",  // For Stripe Elements (if stripe payment)
  "requiresPayment": true,                  // false for free events
  "amount": 5000,                           // Total in cents (EUR 50.00)
  "currency": "eur",
  "expiresAt": 1704123456789               // Timestamp when session expires
}
```

### Important Notes

1. **Product Matching**: Each `formResponses[].productId` MUST match one of the `productIds` in the main array
2. **Ticket Numbers**: Start from 1 and increment sequentially (1, 2, 3...)
3. **Form Responses**: Include ALL registration data here - it's stored for audit trail
4. **Payment Method**:
   - `"free"`: No payment, immediate confirmation
   - `"stripe"`: Returns `clientSecret` for Stripe Elements
   - `"invoice"`: Manual invoice (B2B or B2C)

---

## Endpoint 2: Confirm Payment

**URL**: `POST /api/v1/checkout/confirm`

**Purpose**: Completes the checkout, verifies payment, creates tickets/purchases, sends emails.

### Request Payload Structure

```typescript
{
  "checkoutSessionId": "k789xyz...",        // From createCheckoutSession response
  "sessionId": "sess_abc123",               // Legacy: same as checkoutSessionId
  "paymentIntentId": "free" | "invoice" | "pi_abc123..." // See below
}
```

### Payment Intent ID Values

| Payment Method | `paymentIntentId` Value | When to Use |
|----------------|-------------------------|-------------|
| **Free** | `"free"` | Free events, no payment |
| **Invoice (B2B/B2C)** | `"invoice"` | Manual invoices |
| **Stripe** | `"pi_abc123..."` | From Stripe PaymentIntent |
| **Auto Employer** | `"free"` | Employer pays later (auto-detected) |

### Response Structure

```typescript
{
  // SUCCESS RESPONSE
  "success": true,
  "purchasedItemIds": ["ticket_123", "ticket_456"], // Generic purchase IDs
  "crmContactId": "contact_xyz",                     // CRM contact created
  "paymentId": "free" | "invoice" | "pi_abc123",    // Payment reference
  "amount": 0,                                       // 0 for free, actual for paid
  "currency": "EUR",

  // NEW FIELDS (v2.0)
  "isGuestRegistration": true,                       // true = dormant user created
  "frontendUserId": "frontend_user_abc",            // User ID for activation
  "invoiceType": "none" | "receipt" | "manual_b2b" | "manual_b2c" | "employer",

  // DOWNLOAD URLS
  "downloadUrls": {
    "purchaseItems": "https://.../purchase-items/k789xyz/download",
    "tickets": "https://.../tickets/k789xyz/download",     // If tickets
    "invoice": "https://.../invoices/k789xyz/download"     // If B2B
  }
}
```

### Invoice Types Explained

| Type | Description | Email Behavior |
|------|-------------|----------------|
| `none` | Free registration | Confirmation email only |
| `receipt` | Stripe payment | Receipt/invoice PDF attached |
| `manual_b2b` | B2B pay-later | Invoice PDF sent to company |
| `manual_b2c` | B2C pay-later | Invoice PDF sent to customer |
| `employer` | Auto-detected employer billing | Consolidated invoice (no immediate PDF) |

---

## Endpoint 3: Get Checkout Config

**URL**: `GET /api/v1/checkout/config`

**Purpose**: Get Stripe publishable key and provider info (optional - for dynamic config).

### Request

```typescript
// GET request with Authorization header
headers: {
  'Authorization': 'Bearer YOUR_API_KEY',
}
```

### Response

```typescript
{
  "provider": "stripe",                       // "stripe" or "invoice"
  "providerName": "Stripe",
  "accountId": "acct_abc123",                // Stripe connected account ID
  "publishableKey": "pk_test_abc123...",    // Stripe publishable key
  "supportedCurrencies": ["usd", "eur", "gbp", "cad", "aud"]
}
```

---

## Complete Flow Examples

### Example 1: Free Event Registration

```typescript
// STEP 1: Create session
const createResponse = await fetch('https://agreeable-lion-828.convex.site/api/v1/checkout/sessions', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer org_j97abc...',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    organizationId: 'j97abc123',
    checkoutInstanceId: 'k123abc',
    productIds: ['m456def'],
    quantities: [1],

    customerEmail: 'john@example.com',
    customerName: 'John Doe',
    customerPhone: '+49123456789',

    paymentMethod: 'free', // ✅ FREE EVENT

    formResponses: [{
      productId: 'm456def',
      ticketNumber: 1,
      formId: 'event_registration',
      responses: {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '+49123456789',
        organization: 'ACME Corp',
        attendee_category: 'internal',
        dietary_requirements: 'none',
        consent_privacy: true,
      },
      addedCosts: 0,
    }],
  }),
});

const { checkoutSessionId, requiresPayment } = await createResponse.json();

// STEP 2: Immediate confirmation (no payment UI)
if (!requiresPayment) {
  const confirmResponse = await fetch('https://agreeable-lion-828.convex.site/api/v1/checkout/confirm', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer org_j97abc...',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      checkoutSessionId,
      paymentIntentId: 'free', // ✅ FREE MARKER
    }),
  });

  const result = await confirmResponse.json();

  // SUCCESS!
  console.log('Registration complete:', result.purchasedItemIds);
  console.log('Guest user created:', result.frontendUserId);
  console.log('Invoice type:', result.invoiceType); // 'none'
}
```

---

### Example 2: Paid Event (Stripe)

```typescript
// STEP 1: Create session
const createResponse = await fetch('https://agreeable-lion-828.convex.site/api/v1/checkout/sessions', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer org_j97abc...',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    organizationId: 'j97abc123',
    checkoutInstanceId: 'k123abc',
    productIds: ['m456def'],
    quantities: [1],

    customerEmail: 'jane@example.com',
    customerName: 'Jane Smith',
    customerPhone: '+49987654321',

    paymentMethod: 'stripe', // ✅ STRIPE PAYMENT

    formResponses: [{
      productId: 'm456def',
      ticketNumber: 1,
      responses: {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
        // ... other fields
      },
      addedCosts: 0,
    }],
  }),
});

const { checkoutSessionId, clientSecret, requiresPayment } = await createResponse.json();

// STEP 2: Show Stripe payment UI
if (requiresPayment && clientSecret) {
  const stripe = await loadStripe('pk_test_...');
  const elements = stripe.elements({ clientSecret });
  const paymentElement = elements.create('payment');
  paymentElement.mount('#payment-element');

  // STEP 3: User submits payment
  const handleSubmit = async (e) => {
    e.preventDefault();

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: 'https://yoursite.com/success',
      },
      redirect: 'if_required',
    });

    if (error) {
      console.error('Payment failed:', error);
      return;
    }

    // STEP 4: Confirm with backend
    const confirmResponse = await fetch('https://agreeable-lion-828.convex.site/api/v1/checkout/confirm', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer org_j97abc...',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        checkoutSessionId,
        paymentIntentId: paymentIntent.id, // ✅ STRIPE PAYMENT INTENT
      }),
    });

    const result = await confirmResponse.json();

    // SUCCESS!
    console.log('Tickets:', result.purchasedItemIds);
    console.log('Amount paid:', result.amount, result.currency);
    console.log('Invoice type:', result.invoiceType); // 'receipt'
  };
}
```

---

### Example 3: Manual B2B Invoice

```typescript
// STEP 1: Create session with B2B data
const createResponse = await fetch('https://agreeable-lion-828.convex.site/api/v1/checkout/sessions', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer org_j97abc...',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    organizationId: 'j97abc123',
    checkoutInstanceId: 'k123abc',
    productIds: ['m456def'],
    quantities: [1],

    customerEmail: 'procurement@acme.com',
    customerName: 'Bob Johnson',
    customerPhone: '+49111222333',

    paymentMethod: 'invoice', // ✅ MANUAL INVOICE

    // B2B FIELDS
    transactionType: 'B2B',
    companyName: 'ACME Corporation',
    vatNumber: 'DE123456789',
    billingAddress: {
      line1: 'Hauptstraße 1',
      city: 'Berlin',
      postalCode: '10115',
      country: 'Germany',
    },

    formResponses: [{
      productId: 'm456def',
      ticketNumber: 1,
      responses: {
        firstName: 'Bob',
        lastName: 'Johnson',
        email: 'bob@acme.com',
        companyName: 'ACME Corporation',
        // ... other fields
      },
      addedCosts: 0,
    }],
  }),
});

const { checkoutSessionId } = await createResponse.json();

// STEP 2: Immediate confirmation (invoice sent via email)
const confirmResponse = await fetch('https://agreeable-lion-828.convex.site/api/v1/checkout/confirm', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer org_j97abc...',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    checkoutSessionId,
    paymentIntentId: 'invoice', // ✅ INVOICE MARKER
  }),
});

const result = await confirmResponse.json();

// SUCCESS!
console.log('Invoice type:', result.invoiceType); // 'manual_b2b'
console.log('CRM Organization created:', result.crmContactId);
console.log('Download invoice:', result.downloadUrls.invoice);
```

---

## TypeScript Types

Use these exact types in your frontend:

```typescript
// CREATE SESSION REQUEST
interface CreateCheckoutSessionRequest {
  organizationId: string;
  checkoutInstanceId: string;
  productIds: string[];
  quantities: number[];

  customerEmail: string;
  customerName: string;
  customerPhone?: string;

  paymentMethod: 'free' | 'stripe' | 'invoice';

  formResponses: Array<{
    productId: string;
    ticketNumber: number;
    formId?: string;
    responses: Record<string, unknown>;
    addedCosts: number;
  }>;

  // Optional B2B fields
  transactionType?: 'B2C' | 'B2B';
  companyName?: string;
  vatNumber?: string;
  billingAddress?: {
    line1: string;
    line2?: string;
    city: string;
    state?: string;
    postalCode: string;
    country: string;
  };
}

// CREATE SESSION RESPONSE
interface CreateCheckoutSessionResponse {
  checkoutSessionId: string;
  sessionId: string; // Legacy: same as checkoutSessionId
  clientSecret?: string; // Only present if requiresPayment
  requiresPayment: boolean;
  amount: number;
  currency: string;
  expiresAt: number;
}

// CONFIRM PAYMENT REQUEST
interface ConfirmPaymentRequest {
  checkoutSessionId: string;
  sessionId: string; // Legacy: same as checkoutSessionId
  paymentIntentId: 'free' | 'invoice' | string; // 'pi_...' for Stripe
}

// CONFIRM PAYMENT RESPONSE
interface ConfirmPaymentResponse {
  success: boolean;
  purchasedItemIds: string[];
  crmContactId?: string;
  paymentId: string;
  amount: number;
  currency: string;

  // v2.0 fields
  isGuestRegistration: boolean;
  frontendUserId?: string;
  invoiceType: 'none' | 'receipt' | 'manual_b2b' | 'manual_b2c' | 'employer';

  downloadUrls: {
    purchaseItems: string;
    tickets?: string;
    invoice?: string;
  };
}

// CHECKOUT CONFIG RESPONSE
interface CheckoutConfigResponse {
  provider: 'stripe' | 'invoice';
  providerName: string;
  accountId: string;
  publishableKey?: string;
  supportedCurrencies: string[];
}
```

---

## Error Responses

All endpoints return errors in this format:

```typescript
{
  "error": "Error type",
  "message": "Detailed error message"
}
```

**HTTP Status Codes**:
- `401`: Invalid API key
- `400`: Invalid request (missing required fields)
- `404`: Resource not found (product, checkout instance)
- `500`: Internal server error

---

## Testing Checklist

### Free Events
- [ ] Create session with `paymentMethod: 'free'`
- [ ] Verify `requiresPayment: false`
- [ ] Confirm with `paymentIntentId: 'free'`
- [ ] Check `invoiceType: 'none'`
- [ ] Verify guest user created (`isGuestRegistration: true`)

### Stripe Payments
- [ ] Create session with `paymentMethod: 'stripe'`
- [ ] Receive `clientSecret` in response
- [ ] Initialize Stripe Elements with `clientSecret`
- [ ] Complete payment with Stripe
- [ ] Confirm with `paymentIntentId: 'pi_...'`
- [ ] Check `invoiceType: 'receipt'`

### Manual B2B Invoices
- [ ] Include `transactionType: 'B2B'`, `companyName`, `vatNumber`, `billingAddress`
- [ ] Create session with `paymentMethod: 'invoice'`
- [ ] Confirm with `paymentIntentId: 'invoice'`
- [ ] Check `invoiceType: 'manual_b2b'`
- [ ] Verify CRM organization created
- [ ] Verify invoice PDF in `downloadUrls.invoice`

### Manual B2C Invoices
- [ ] Create session with `paymentMethod: 'invoice'` (no company fields)
- [ ] Confirm with `paymentIntentId: 'invoice'`
- [ ] Check `invoiceType: 'manual_b2c'`

---

## Common Issues & Solutions

### Issue: "Product not found"
**Solution**: Verify `productIds` are valid IDs from your backend

### Issue: "Missing clientSecret"
**Solution**: Check `paymentMethod` is `'stripe'` and Stripe is connected

### Issue: "Checkout session not found"
**Solution**: Use the exact `checkoutSessionId` from create response

### Issue: "Invoice not generated"
**Solution**: Ensure `transactionType: 'B2B'` and all B2B fields are present

---

## Support

- **Backend Repo**: `/Users/foundbrand_001/Development/vc83-com`
- **Frontend Repo**: `/Users/foundbrand_001/Development/haffnet-l4yercak3`
- **API Deployment**: `https://agreeable-lion-828.convex.site`

For questions, check the backend documentation:
- [FRONTEND_CHECKOUT_INTEGRATION.md](../frontend/frontend-checkout-integration.md)
- [SESSION_HANDOFF_CHECKOUT_ENHANCEMENT.md](../SESSION_HANDOFF_CHECKOUT_ENHANCEMENT.md)
