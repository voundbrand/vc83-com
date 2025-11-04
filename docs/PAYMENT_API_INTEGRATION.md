# Payment API Integration Guide

This guide shows how to accept payments on your external website using the L4YERCAK3 Payment API while keeping customers on your own domain.

## Overview

The Payment API allows you to:
- **Accept payments directly on your website** (customers never leave your domain)
- **Use your organization's connected Stripe account** (no need for separate integration)
- **Automatically fulfill orders** (tickets, invoices, CRM integration, etc.)
- **Customize the payment experience** to match your brand

## Architecture

```
Your Website (yoursite.com)
    ↓
1. GET /api/v1/checkout/config
   Returns: { publishableKey, provider: "stripe" }
    ↓
2. POST /api/v1/checkout/sessions
   Returns: { clientSecret, sessionId }
    ↓
3. Initialize Stripe Elements on your page
    ↓
4. Customer completes payment (stays on yoursite.com)
    ↓
5. POST /api/v1/checkout/confirm
   Returns: { ticketIds, downloadUrls }
```

## Prerequisites

1. **API Key**: Get your API key from L4YERCAK3 dashboard → Settings → API Keys
2. **Stripe Connected**: Connect your Stripe account in L4YERCAK3 dashboard → Payments
3. **Product Created**: Create a product in L4YERCAK3 dashboard → Products

## Step-by-Step Integration

### Step 1: Get Payment Configuration

First, fetch your organization's payment provider configuration (public keys only):

```javascript
// Server-side (Node.js, Next.js API route, etc.)
const response = await fetch('https://l4yercak3.com/api/v1/checkout/config', {
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
  },
});

const config = await response.json();
console.log(config);
// {
//   provider: "stripe",
//   providerName: "Stripe",
//   publishableKey: "pk_live_...",
//   accountId: "acct_...",
//   supportedCurrencies: ["usd", "eur", "gbp"]
// }
```

### Step 2: Create Checkout Session

Create a payment session for a specific product:

```javascript
// Server-side
const sessionResponse = await fetch('https://l4yercak3.com/api/v1/checkout/sessions', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    productId: 'your_product_id', // From L4YERCAK3 dashboard
    quantity: 1,
    customerEmail: 'customer@example.com',
    customerName: 'John Doe',
    customerPhone: '+1234567890',
    metadata: {
      // Optional custom data
      referralSource: 'google',
      campaignId: 'summer-sale',
    },
  }),
});

const session = await sessionResponse.json();
console.log(session);
// {
//   sessionId: "obj_...",
//   clientSecret: "pi_..._secret_...",
//   amount: 9900,
//   currency: "usd",
//   expiresAt: 1234567890
// }
```

### Step 3: Initialize Stripe Elements on Your Website

Now use the `clientSecret` to initialize Stripe Elements on your frontend:

```html
<!-- Your website's payment page -->
<!DOCTYPE html>
<html>
<head>
  <script src="https://js.stripe.com/v3/"></script>
</head>
<body>
  <form id="payment-form">
    <div id="payment-element"></div>
    <button id="submit">Pay Now</button>
    <div id="error-message"></div>
  </form>

  <script>
    // Initialize Stripe with your publishable key
    const stripe = Stripe('{{ publishableKey }}'); // From Step 1

    // Create Elements instance with clientSecret
    const elements = stripe.elements({
      clientSecret: '{{ clientSecret }}', // From Step 2
      appearance: {
        theme: 'stripe',
        // Customize to match your brand
        variables: {
          colorPrimary: '#0570de',
        },
      },
    });

    // Create and mount Payment Element
    const paymentElement = elements.create('payment');
    paymentElement.mount('#payment-element');

    // Handle form submission
    const form = document.getElementById('payment-form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      // Disable submit button
      document.getElementById('submit').disabled = true;

      // Confirm payment with Stripe
      const {error} = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: 'https://yoursite.com/payment/success',
        },
      });

      if (error) {
        // Show error message
        document.getElementById('error-message').textContent = error.message;
        document.getElementById('submit').disabled = false;
      }
      // If successful, customer is redirected to return_url
    });
  </script>
</body>
</html>
```

### Step 4: Verify Payment and Fulfill Order

After Stripe redirects the customer back to your success page, verify the payment and fulfill the order:

```javascript
// On your success page (e.g., /payment/success)
// Server-side verification

// Extract payment_intent from URL
const urlParams = new URLSearchParams(window.location.search);
const paymentIntentId = urlParams.get('payment_intent');
const sessionId = '{{ sessionId }}'; // From Step 2 (store in session/database)

// Verify and fulfill order
const confirmResponse = await fetch('https://l4yercak3.com/api/v1/checkout/confirm', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    sessionId: sessionId,
    paymentIntentId: paymentIntentId,
  }),
});

const result = await confirmResponse.json();
console.log(result);
// {
//   success: true,
//   transactionId: "pi_...",
//   purchaseItemIds: ["obj_...", "obj_..."],
//   ticketIds: ["obj_...", "obj_..."],
//   crmContactId: "obj_...",
//   downloadUrls: {
//     tickets: "https://l4yercak3.com/api/v1/tickets/obj_.../download",
//     invoice: "https://l4yercak3.com/api/v1/invoices/obj_.../download"
//   }
// }

// Now you can:
// 1. Show success message to customer
// 2. Provide download links for tickets
// 3. Send confirmation email (L4YERCAK3 auto-sends too)
// 4. Redirect to ticket download page
```

## Complete Example (Next.js)

Here's a complete Next.js example:

### `/pages/api/checkout/config.ts`

```typescript
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const response = await fetch(
    `${process.env.L4YERCAK3_API_URL}/api/v1/checkout/config`,
    {
      headers: {
        Authorization: `Bearer ${process.env.L4YERCAK3_API_KEY}`,
      },
    }
  );

  const config = await response.json();
  res.status(200).json(config);
}
```

### `/pages/api/checkout/create-session.ts`

```typescript
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { productId, customerEmail, customerName } = req.body;

  const response = await fetch(
    `${process.env.L4YERCAK3_API_URL}/api/v1/checkout/sessions`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.L4YERCAK3_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        productId,
        quantity: 1,
        customerEmail,
        customerName,
      }),
    }
  );

  const session = await response.json();
  res.status(200).json(session);
}
```

### `/pages/checkout.tsx`

```typescript
import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';

// Payment form component
function CheckoutForm({ sessionId }: { sessionId: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) return;

    setProcessing(true);
    setError(null);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/payment/success?session_id=${sessionId}`,
      },
    });

    if (error) {
      setError(error.message || 'An error occurred');
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement />
      <button disabled={!stripe || processing}>
        {processing ? 'Processing...' : 'Pay Now'}
      </button>
      {error && <div className="error">{error}</div>}
    </form>
  );
}

// Main checkout page
export default function CheckoutPage() {
  const [stripePromise, setStripePromise] = useState(null);
  const [clientSecret, setClientSecret] = useState('');
  const [sessionId, setSessionId] = useState('');

  useEffect(() => {
    // Load Stripe config
    fetch('/api/checkout/config')
      .then((res) => res.json())
      .then((config) => {
        setStripePromise(loadStripe(config.publishableKey));
      });

    // Create checkout session
    fetch('/api/checkout/create-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId: 'your_product_id',
        customerEmail: 'customer@example.com',
        customerName: 'John Doe',
      }),
    })
      .then((res) => res.json())
      .then((session) => {
        setClientSecret(session.clientSecret);
        setSessionId(session.sessionId);
      });
  }, []);

  if (!stripePromise || !clientSecret) {
    return <div>Loading...</div>;
  }

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: { theme: 'stripe' },
      }}
    >
      <CheckoutForm sessionId={sessionId} />
    </Elements>
  );
}
```

### `/pages/payment/success.tsx`

```typescript
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

export default function PaymentSuccessPage() {
  const router = useRouter();
  const { payment_intent, session_id } = router.query;
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!payment_intent || !session_id) return;

    // Verify payment and fulfill order
    fetch('/api/checkout/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: session_id,
        paymentIntentId: payment_intent,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        setResult(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Confirmation error:', error);
        setLoading(false);
      });
  }, [payment_intent, session_id]);

  if (loading) {
    return <div>Verifying payment...</div>;
  }

  if (!result?.success) {
    return <div>Payment verification failed. Please contact support.</div>;
  }

  return (
    <div>
      <h1>Payment Successful!</h1>
      <p>Your order has been confirmed.</p>
      <div>
        <h2>Download Your Tickets</h2>
        <a href={result.downloadUrls.tickets} download>
          Download Tickets (PDF)
        </a>
        {result.downloadUrls.invoice && (
          <a href={result.downloadUrls.invoice} download>
            Download Invoice (PDF)
          </a>
        )}
      </div>
    </div>
  );
}
```

## API Reference

### GET /api/v1/checkout/config

Get payment provider configuration (public keys only).

**Headers:**
- `Authorization: Bearer YOUR_API_KEY`

**Response:**
```json
{
  "provider": "stripe",
  "providerName": "Stripe",
  "publishableKey": "pk_live_...",
  "accountId": "acct_...",
  "supportedCurrencies": ["usd", "eur", "gbp"]
}
```

### POST /api/v1/checkout/sessions

Create a checkout session.

**Headers:**
- `Authorization: Bearer YOUR_API_KEY`
- `Content-Type: application/json`

**Body:**
```json
{
  "productId": "obj_...",
  "quantity": 1,
  "customerEmail": "customer@example.com",
  "customerName": "John Doe",
  "customerPhone": "+1234567890",
  "metadata": {}
}
```

**Response:**
```json
{
  "sessionId": "obj_...",
  "clientSecret": "pi_..._secret_...",
  "amount": 9900,
  "currency": "usd",
  "expiresAt": 1234567890
}
```

### POST /api/v1/checkout/confirm

Verify payment and fulfill order.

**Headers:**
- `Authorization: Bearer YOUR_API_KEY`
- `Content-Type: application/json`

**Body:**
```json
{
  "sessionId": "obj_...",
  "paymentIntentId": "pi_..."
}
```

**Response:**
```json
{
  "success": true,
  "transactionId": "pi_...",
  "purchaseItemIds": ["obj_...", "obj_..."],
  "ticketIds": ["obj_...", "obj_..."],
  "crmContactId": "obj_...",
  "downloadUrls": {
    "tickets": "https://l4yercak3.com/api/v1/tickets/obj_.../download",
    "invoice": "https://l4yercak3.com/api/v1/invoices/obj_.../download"
  }
}
```

## Security Best Practices

1. **Never expose your API key on the frontend** - Always proxy API calls through your backend
2. **Validate webhooks** - Use Stripe webhooks to verify payment status independently
3. **Use HTTPS** - All API calls must use HTTPS in production
4. **Store session IDs securely** - Use encrypted sessions or database storage
5. **Verify payment status** - Always call `/confirm` endpoint server-side before fulfilling orders

## Troubleshooting

### "Organization has not connected a payment provider"
- Connect your Stripe account in the L4YERCAK3 dashboard → Payments

### "Product not found"
- Verify the `productId` exists in your L4YERCAK3 dashboard → Products
- Make sure the product is published

### "Invalid API key"
- Generate a new API key in L4YERCAK3 dashboard → Settings → API Keys
- Make sure to use the correct environment (test/production)

### Payment succeeds but tickets aren't generated
- Check that you called `/api/v1/checkout/confirm` with the correct `paymentIntentId`
- Look for errors in the response payload

## Support

For questions or issues:
- Documentation: https://docs.l4yercak3.com
- Email: support@l4yercak3.com
- Discord: https://discord.gg/l4yercak3
