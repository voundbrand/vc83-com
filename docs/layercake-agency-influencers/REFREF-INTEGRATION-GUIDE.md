# RefRef Integration Guide for Layer Cake

> How to integrate RefRef (affiliate system) with Layer Cake (your SaaS platform)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Layer Cake Repo                              │
│  vc83-com/                                                          │
│  ├── src/                  ← Next.js app (your main product)        │
│  ├── convex/               ← Convex backend                         │
│  ├── packages/sdk/         ← Your SDK                               │
│  │                                                                   │
│  └── services/             ← NEW                                     │
│      └── affiliate/        ← RefRef lives here                      │
│          ├── apps/                                                   │
│          │   ├── webapp/   ← Admin dashboard (port 3001)            │
│          │   ├── api/      ← REST API (port 3002)                   │
│          │   └── refer/    ← Affiliate portal (port 3003)           │
│          ├── packages/                                               │
│          └── docker-compose.yml                                      │
└─────────────────────────────────────────────────────────────────────┘

                              │
                              │ Stripe Webhooks
                              ▼
                      ┌───────────────┐
                      │    Stripe     │
                      └───────────────┘
```

---

## Step 1: Add RefRef to Your Repo

```bash
cd ~/Development/vc83-com

# Create services directory
mkdir -p services

# Clone RefRef
cd services
git clone https://github.com/refrefhq/refref.git affiliate
cd affiliate

# Remove RefRef's git history (make it part of your repo)
rm -rf .git

# Go back to root and commit
cd ../..
git add services/affiliate
git commit -m "Add affiliate system (RefRef fork)"
```

---

## Step 2: Configure RefRef

### 2.1 Create Environment File

```bash
cd services/affiliate
cp apps/webapp/.env.example apps/webapp/.env
```

Edit `services/affiliate/apps/webapp/.env`:

```env
# Database (use a separate PostgreSQL database)
DATABASE_URL=postgresql://postgres:your_password@localhost:5433/layercake_affiliates

# Auth secret (generate with: openssl rand -base64 32)
BETTER_AUTH_SECRET=your-generated-secret-here

# URLs (use different ports to avoid conflicts)
BETTER_AUTH_URL=http://localhost:3001
NEXT_PUBLIC_APP_URL=http://localhost:3001

# Email (optional, for affiliate notifications)
RESEND_API_KEY=re_xxxxx

# Google OAuth (optional)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

### 2.2 Update Docker Compose Ports

Edit `services/affiliate/docker-compose.yml`:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: layercake-affiliate-db
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: your_password
      POSTGRES_DB: layercake_affiliates
    ports:
      - "5433:5432"  # Different port to avoid conflicts
    volumes:
      - affiliate_postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  webapp:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: layercake-affiliate-webapp
    ports:
      - "3001:3000"  # Affiliate dashboard on 3001
    environment:
      DATABASE_URL: postgresql://postgres:your_password@postgres:5432/layercake_affiliates
      BETTER_AUTH_SECRET: ${BETTER_AUTH_SECRET}
      BETTER_AUTH_URL: ${BETTER_AUTH_URL:-http://localhost:3001}
      NEXT_PUBLIC_APP_URL: ${NEXT_PUBLIC_APP_URL:-http://localhost:3001}
    depends_on:
      postgres:
        condition: service_healthy

  api:
    build:
      context: .
      dockerfile: Dockerfile.api
    container_name: layercake-affiliate-api
    ports:
      - "3002:3000"  # Affiliate API on 3002
    environment:
      DATABASE_URL: postgresql://postgres:your_password@postgres:5432/layercake_affiliates
    depends_on:
      postgres:
        condition: service_healthy

volumes:
  affiliate_postgres_data:
```

### 2.3 Start RefRef

```bash
cd services/affiliate
docker-compose up -d
```

Access points:
- **Admin Dashboard:** http://localhost:3001
- **API:** http://localhost:3002
- **Affiliate Portal:** http://localhost:3003 (if configured)

---

## Step 3: Create Your Affiliate Program

### 3.1 Access Admin Dashboard

1. Go to http://localhost:3001
2. Create an account (this becomes the admin)
3. Create an organization (e.g., "Layer Cake")
4. Create a product (e.g., "Layer Cake Agency Plan")

### 3.2 Create a Program

In the dashboard:
1. Go to Programs → Create Program
2. Name: "Layer Cake Affiliate Program"
3. Configure reward rules (see Customization Plan for 40% setup)

### 3.3 Get API Credentials

1. Go to Settings → API Keys
2. Create a new API key
3. Save the key securely (you'll need it for integration)

---

## Step 4: Integrate with Layer Cake

### 4.1 Add RefRef Client to Layer Cake

Create `src/lib/affiliate.ts` in your Layer Cake codebase:

```typescript
// src/lib/affiliate.ts

const REFREF_API_URL = process.env.REFREF_API_URL || 'http://localhost:3002';
const REFREF_API_KEY = process.env.REFREF_API_KEY!;
const REFREF_PRODUCT_ID = process.env.REFREF_PRODUCT_ID!;
const REFREF_PROGRAM_ID = process.env.REFREF_PROGRAM_ID!;

interface TrackSignupParams {
  userId: string;
  email?: string;
  name?: string;
  refcode?: string;  // From URL param ?ref=CODE
}

interface TrackPurchaseParams {
  userId: string;
  orderId: string;
  orderAmount: number;
  currency?: string;
}

/**
 * Track a new signup with optional referral attribution
 */
export async function trackSignup(params: TrackSignupParams) {
  const response = await fetch(`${REFREF_API_URL}/v1/track/signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': REFREF_API_KEY,
    },
    body: JSON.stringify({
      timestamp: new Date().toISOString(),
      productId: REFREF_PRODUCT_ID,
      programId: REFREF_PROGRAM_ID,
      payload: {
        userId: params.userId,
        email: params.email,
        name: params.name,
        refcode: params.refcode,
      },
    }),
  });

  if (!response.ok) {
    console.error('Failed to track signup:', await response.text());
    return null;
  }

  return response.json();
}

/**
 * Track a purchase (triggers commission calculation)
 */
export async function trackPurchase(params: TrackPurchaseParams) {
  const response = await fetch(`${REFREF_API_URL}/v1/track/purchase`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': REFREF_API_KEY,
    },
    body: JSON.stringify({
      timestamp: new Date().toISOString(),
      productId: REFREF_PRODUCT_ID,
      programId: REFREF_PROGRAM_ID,
      payload: {
        userId: params.userId,
        orderId: params.orderId,
        orderAmount: params.orderAmount,
        currency: params.currency || 'USD',
      },
    }),
  });

  if (!response.ok) {
    console.error('Failed to track purchase:', await response.text());
    return null;
  }

  return response.json();
}
```

### 4.2 Add Environment Variables

Add to your Layer Cake `.env.local`:

```env
# RefRef Affiliate System
REFREF_API_URL=http://localhost:3002
REFREF_API_KEY=your_api_key_here
REFREF_PRODUCT_ID=prod_xxxxx
REFREF_PROGRAM_ID=prog_xxxxx
```

### 4.3 Capture Referral Code on Signup

In your signup flow, capture the `?ref=` parameter:

```typescript
// Example: src/app/signup/page.tsx
'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

export default function SignupPage() {
  const searchParams = useSearchParams();
  const refCode = searchParams.get('ref');

  useEffect(() => {
    // Store refcode in cookie or localStorage for later
    if (refCode) {
      document.cookie = `refcode=${refCode}; max-age=${90 * 24 * 60 * 60}; path=/`;
    }
  }, [refCode]);

  // ... rest of signup form
}
```

### 4.4 Track Signup After User Creation

When a user signs up:

```typescript
// In your signup handler (Convex action or API route)
import { trackSignup } from '@/lib/affiliate';

async function handleSignup(userData: { id: string; email: string; name: string }) {
  // Get refcode from cookie
  const refcode = getCookie('refcode');

  // Track with RefRef
  await trackSignup({
    userId: userData.id,
    email: userData.email,
    name: userData.name,
    refcode: refcode || undefined,
  });

  // Clear the cookie after tracking
  clearCookie('refcode');
}
```

---

## Step 5: Stripe Webhook Integration

This is the critical part — tracking payments to calculate commissions.

### 5.1 Create Stripe Webhook Handler

Create `src/app/api/webhooks/stripe-affiliate/route.ts`:

```typescript
// src/app/api/webhooks/stripe-affiliate/route.ts
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { trackPurchase } from '@/lib/affiliate';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET_AFFILIATE!;

export async function POST(request: Request) {
  const body = await request.text();
  const signature = headers().get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed');
    return new Response('Webhook Error', { status: 400 });
  }

  switch (event.type) {
    case 'invoice.paid': {
      const invoice = event.data.object as Stripe.Invoice;

      // Only track subscription payments (not one-time)
      if (invoice.subscription) {
        const customerId = invoice.customer as string;

        // Get customer to find user ID
        const customer = await stripe.customers.retrieve(customerId);
        const userId = (customer as Stripe.Customer).metadata?.userId;

        if (userId) {
          await trackPurchase({
            userId: userId,
            orderId: invoice.id,
            orderAmount: invoice.amount_paid / 100, // Convert cents to dollars
            currency: invoice.currency.toUpperCase(),
          });
        }
      }
      break;
    }

    case 'customer.subscription.created': {
      // Track initial subscription
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;

      const customer = await stripe.customers.retrieve(customerId);
      const userId = (customer as Stripe.Customer).metadata?.userId;

      if (userId) {
        // Get the first invoice amount
        const amount = subscription.items.data[0]?.price?.unit_amount || 0;

        await trackPurchase({
          userId: userId,
          orderId: subscription.id,
          orderAmount: amount / 100,
          currency: subscription.currency.toUpperCase(),
        });
      }
      break;
    }
  }

  return new Response('OK', { status: 200 });
}
```

### 5.2 Register Webhook in Stripe Dashboard

1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://your-domain.com/api/webhooks/stripe-affiliate`
3. Select events:
   - `invoice.paid`
   - `customer.subscription.created`
4. Copy the webhook secret to your `.env`

```env
STRIPE_WEBHOOK_SECRET_AFFILIATE=whsec_xxxxx
```

---

## Step 6: Add Tracking Script to Frontend

RefRef provides a JavaScript snippet for client-side tracking.

### 6.1 Add Script to Layout

In `src/app/layout.tsx`:

```tsx
import Script from 'next/script';

export default function RootLayout({ children }) {
  return (
    <html>
      <head>
        {/* RefRef attribution script */}
        <Script
          src="http://localhost:3002/attribution.js"
          data-product-id={process.env.NEXT_PUBLIC_REFREF_PRODUCT_ID}
          strategy="afterInteractive"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

This script:
- Captures `?ref=` parameter from URLs
- Sets a 90-day cookie for attribution
- Tracks page visits

---

## Step 7: Affiliate Portal

Affiliates access their dashboard at:
- **Development:** http://localhost:3001/refer
- **Production:** https://affiliates.layercake.com (configure subdomain)

What affiliates see:
- Their unique referral link
- Click statistics
- Signups attributed to them
- Conversions (purchases)
- Commission earnings
- Payout history

---

## API Reference

### Track Signup
```
POST /v1/track/signup
Headers:
  X-Api-Key: your_api_key

Body:
{
  "timestamp": "2026-01-29T12:00:00Z",
  "productId": "prod_xxxxx",
  "programId": "prog_xxxxx",
  "payload": {
    "userId": "user_123",
    "email": "user@example.com",
    "name": "John Doe",
    "refcode": "abc1234"  // Optional
  }
}

Response:
{
  "success": true,
  "message": "Signup tracked successfully.",
  "eventId": "evt_xxxxx"
}
```

### Track Purchase
```
POST /v1/track/purchase
Headers:
  X-Api-Key: your_api_key

Body:
{
  "timestamp": "2026-01-29T12:00:00Z",
  "productId": "prod_xxxxx",
  "programId": "prog_xxxxx",
  "payload": {
    "userId": "user_123",
    "orderId": "inv_xxxxx",
    "orderAmount": 599.00,
    "currency": "USD"
  }
}

Response:
{
  "success": true,
  "message": "Purchase tracked successfully.",
  "eventId": "evt_xxxxx"
}
```

---

## Production Deployment

### Option A: Same Server (Docker)

```bash
# On your production server
cd /var/www/layercake/services/affiliate
docker-compose -f docker-compose.prod.yml up -d
```

### Option B: Separate Service (Railway, Render, etc.)

1. Deploy RefRef to Railway/Render/Fly.io
2. Use managed PostgreSQL (Neon, Supabase, etc.)
3. Update environment variables with production URLs

### Production Checklist

- [ ] Use production PostgreSQL (not Docker volume)
- [ ] Set strong `BETTER_AUTH_SECRET`
- [ ] Configure HTTPS for all endpoints
- [ ] Set up proper domain (e.g., affiliates.layercake.com)
- [ ] Configure Stripe webhooks for production URL
- [ ] Set up monitoring/alerting
- [ ] Configure backups for affiliate database

---

## Testing the Integration

### 1. Test Referral Flow

```bash
# 1. Create a test affiliate in RefRef dashboard
# 2. Get their referral link (e.g., ?ref=abc1234)
# 3. Visit your signup page with the ref param:
open "http://localhost:3000/signup?ref=abc1234"

# 4. Complete signup
# 5. Check RefRef dashboard - should see the signup attributed
```

### 2. Test Purchase Tracking

```bash
# 1. Use Stripe CLI to trigger a test webhook
stripe trigger invoice.paid

# 2. Or create a test subscription in Stripe test mode
# 3. Check RefRef dashboard - should see the purchase event
```

### 3. Verify Commission Calculation

1. Go to RefRef dashboard → Events
2. Find the purchase event
3. Check that a reward was created for the referrer
4. Verify amount is 40% of purchase

---

## Troubleshooting

### Signup not tracked
- Check API key is correct
- Check productId and programId exist
- Check RefRef API is running (`curl http://localhost:3002/health`)

### Purchase not creating commission
- Verify reward rule is configured for "purchase" event
- Check that the user was attributed to a referrer
- Check event status in RefRef dashboard (should be "processed")

### Webhook not firing
- Check Stripe webhook is registered
- Check webhook secret is correct
- Check webhook URL is accessible from Stripe

---

*Part of the [Layer Cake Affiliate Recruitment Campaign](./README.md)*
