# Backend Implementation Brief: Affiliate System Integration

> **For:** Backend Team
> **Project:** Layer Cake Affiliate System
> **Priority:** High
> **Estimated Total Effort:** 3-5 days

---

## ⚡ Decision: RefRef vs Native Convex

**Q: Should we build affiliate tracking natively in Convex or use RefRef?**

**A: Use RefRef as a separate service** — here's why:

| Factor | RefRef (Separate) | Native Convex |
|--------|-------------------|---------------|
| **Time to launch** | 3-5 days | 2-3 weeks |
| **Attribution/cookies** | Built-in | Need to build |
| **Affiliate portal** | Built-in | Need to build |
| **Commission rules engine** | Built-in | Need to build |
| **Integration with Benefits Ontology** | Future phase | Immediate |

**Key point:** RefRef is purpose-built for external affiliate tracking (cookies, referral codes, attribution windows). Our existing Benefits Ontology is designed for internal member-to-member value sharing.

**Future integration:** Once RefRef is stable, we can sync data INTO the Benefits Ontology:
- RefRef affiliates → `crm_contact` with `subtype: "affiliate"`
- RefRef rewards → `commission` objects linked via `earns_commission`

See `HYBRID-ARCHITECTURE-PLAN.md` for the full sync strategy.

---

## Context

We're launching an affiliate program to recruit agency influencers who will promote Layer Cake to their audiences. We need to integrate an open-source affiliate tracking system (RefRef) into our codebase.

**Business Goal:** Enable affiliates to earn 40% recurring lifetime commission on every agency they refer.

**Reference Documentation:**
- `REFREF-INTEGRATION-GUIDE.md` — Full technical integration guide
- `REFREF-CUSTOMIZATION-PLAN.md` — What to customize for Layer Cake
- `HYBRID-ARCHITECTURE-PLAN.md` — How RefRef connects to Benefits Ontology
- `AFFILIATE-PROGRAM.md` — Commission structure and business rules

---

## Architecture Overview

```
vc83-com/
├── src/                      ← Existing Next.js app
├── convex/                   ← Existing Convex backend
├── packages/sdk/             ← Existing SDK
│
└── services/                 ← NEW DIRECTORY
    └── affiliate/            ← RefRef (open-source affiliate system)
        ├── apps/
        │   ├── webapp/       ← Admin dashboard (port 3001)
        │   ├── api/          ← REST API (port 3002)
        │   └── refer/        ← Affiliate portal (port 3003)
        ├── packages/
        └── docker-compose.yml
```

**Key Integration Points:**
1. Layer Cake signup → RefRef tracks attribution
2. Stripe payment → RefRef calculates commission
3. Affiliate portal → Affiliates view earnings

---

## Phase 1: Setup RefRef as a Service

**Estimated Time:** 4-6 hours
**Goal:** Get RefRef running locally alongside Layer Cake

### Tasks

#### 1.1 Clone RefRef into services directory

```bash
cd ~/Development/vc83-com
mkdir -p services
cd services
git clone https://github.com/refrefhq/refref.git affiliate
cd affiliate
rm -rf .git  # Remove RefRef's git history, make it part of our repo
```

#### 1.2 Configure environment

Create `services/affiliate/.env`:

```env
# Database
DATABASE_URL=postgresql://postgres:layercake_affiliate_pw@localhost:5433/layercake_affiliates

# Auth (generate with: openssl rand -base64 32)
BETTER_AUTH_SECRET=<generate-this>
BETTER_AUTH_URL=http://localhost:3001

# App URLs
NEXT_PUBLIC_APP_URL=http://localhost:3001

# Optional: Email
RESEND_API_KEY=

# Optional: Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

#### 1.3 Update Docker Compose ports

Edit `services/affiliate/docker-compose.yml` to avoid port conflicts:

| Service | Current Port | Change To |
|---------|--------------|-----------|
| PostgreSQL | 5432 | **5433** |
| Webapp | 3000 | **3001** |
| API | 3000 | **3002** |

See `REFREF-INTEGRATION-GUIDE.md` section "Step 2.2" for full docker-compose.yml.

#### 1.4 Start and verify

```bash
cd services/affiliate
docker-compose up -d

# Verify services are running
curl http://localhost:3001  # Admin dashboard
curl http://localhost:3002/health  # API health check
```

#### 1.5 Commit to repo

```bash
cd ~/Development/vc83-com
git add services/affiliate
git commit -m "feat: add affiliate system (RefRef fork)"
```

### Deliverable
- [ ] RefRef running on ports 3001/3002
- [ ] Admin dashboard accessible
- [ ] Database initialized

---

## Phase 2: Create Affiliate Client Library

**Estimated Time:** 2-3 hours
**Goal:** Layer Cake can communicate with RefRef API

### Tasks

#### 2.1 Create affiliate client

Create `src/lib/affiliate.ts`:

```typescript
const REFREF_API_URL = process.env.REFREF_API_URL || 'http://localhost:3002';
const REFREF_API_KEY = process.env.REFREF_API_KEY!;
const REFREF_PRODUCT_ID = process.env.REFREF_PRODUCT_ID!;
const REFREF_PROGRAM_ID = process.env.REFREF_PROGRAM_ID!;

interface TrackSignupParams {
  userId: string;
  email?: string;
  name?: string;
  refcode?: string;
}

interface TrackPurchaseParams {
  userId: string;
  orderId: string;
  orderAmount: number;
  currency?: string;
}

export async function trackSignup(params: TrackSignupParams) {
  try {
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
      console.error('[Affiliate] Failed to track signup:', await response.text());
      return null;
    }

    return response.json();
  } catch (error) {
    console.error('[Affiliate] Error tracking signup:', error);
    return null;
  }
}

export async function trackPurchase(params: TrackPurchaseParams) {
  try {
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
      console.error('[Affiliate] Failed to track purchase:', await response.text());
      return null;
    }

    return response.json();
  } catch (error) {
    console.error('[Affiliate] Error tracking purchase:', error);
    return null;
  }
}
```

#### 2.2 Add environment variables

Add to `.env.local`:

```env
# Affiliate System (RefRef)
REFREF_API_URL=http://localhost:3002
REFREF_API_KEY=  # Get from RefRef dashboard after Phase 3
REFREF_PRODUCT_ID=  # Get from RefRef dashboard after Phase 3
REFREF_PROGRAM_ID=  # Get from RefRef dashboard after Phase 3
```

#### 2.3 Create types (optional)

Create `src/types/affiliate.ts` if you want stricter typing.

### Deliverable
- [ ] `src/lib/affiliate.ts` created
- [ ] Environment variables added to `.env.local` and `.env.example`

---

## Phase 3: Configure RefRef Dashboard

**Estimated Time:** 1-2 hours
**Goal:** Create Layer Cake product and affiliate program in RefRef

### Tasks

#### 3.1 Create admin account

1. Go to http://localhost:3001
2. Sign up with an admin email
3. Create organization: "Layer Cake"

#### 3.2 Create product

1. Go to Products → Create Product
2. Name: "Layer Cake Agency Plan"
3. Save the `productId` → add to `.env.local`

#### 3.3 Create program

1. Go to Programs → Create Program
2. Name: "Layer Cake Affiliate Program"
3. Save the `programId` → add to `.env.local`

#### 3.4 Create reward rule (40% commission)

1. Go to Program → Reward Rules → Create
2. Configure:
   - **Name:** "40% Recurring Commission"
   - **Trigger Event:** `purchase`
   - **Participant Type:** `referrer`
   - **Reward Type:** `cash`
   - **Amount:** `40`
   - **Unit:** `percent`
   - **Currency:** `USD`

#### 3.5 Generate API key

1. Go to Settings → API Keys
2. Create new key
3. Save to `.env.local` as `REFREF_API_KEY`

### Deliverable
- [ ] Product created, ID saved
- [ ] Program created, ID saved
- [ ] 40% reward rule configured
- [ ] API key generated and saved

---

## Phase 4: Integrate Signup Tracking

**Estimated Time:** 2-3 hours
**Goal:** Track signups with referral attribution

### Tasks

#### 4.1 Capture referral code on frontend

The referral code comes via URL: `https://layercake.com/signup?ref=abc1234`

Option A: Client-side cookie (recommended)

Create or update signup page to capture ref param:

```typescript
// src/app/(auth)/signup/page.tsx or wherever signup lives
'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

export default function SignupPage() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const refCode = searchParams.get('ref');
    if (refCode) {
      // Store in cookie for 90 days
      document.cookie = `lc_refcode=${refCode}; max-age=${90 * 24 * 60 * 60}; path=/; SameSite=Lax`;
    }
  }, [searchParams]);

  // ... rest of signup form
}
```

Option B: Store in Convex session (if you have one)

#### 4.2 Track signup after user creation

Find where users are created (likely a Convex mutation) and add tracking:

```typescript
// In your signup handler (Convex action or API route)
import { trackSignup } from '@/lib/affiliate';

// Helper to get cookie value
function getRefCode(cookieHeader: string | null): string | undefined {
  if (!cookieHeader) return undefined;
  const match = cookieHeader.match(/lc_refcode=([^;]+)/);
  return match ? match[1] : undefined;
}

// After creating user in your existing signup flow:
async function afterUserCreated(user: { id: string; email: string; name?: string }, cookies: string | null) {
  const refcode = getRefCode(cookies);

  // Track with affiliate system (fire and forget, don't block signup)
  trackSignup({
    userId: user.id,
    email: user.email,
    name: user.name,
    refcode: refcode,
  }).catch(err => console.error('[Affiliate] Tracking failed:', err));
}
```

#### 4.3 Clear refcode cookie after tracking

After successful signup tracking, clear the cookie to prevent re-attribution:

```typescript
// Client-side after signup completes
document.cookie = 'lc_refcode=; max-age=0; path=/';
```

### Deliverable
- [ ] Refcode captured from URL params
- [ ] Stored in cookie (90 days)
- [ ] Signup tracked to RefRef with refcode
- [ ] Cookie cleared after tracking

---

## Phase 5: Integrate Stripe Webhook

**Estimated Time:** 3-4 hours
**Goal:** Track payments to calculate commissions

### Tasks

#### 5.1 Create Stripe webhook endpoint

Create `src/app/api/webhooks/stripe-affiliate/route.ts`:

```typescript
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { trackPurchase } from '@/lib/affiliate';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET_AFFILIATE!;

export async function POST(request: Request) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature');

  if (!signature) {
    return new Response('Missing signature', { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error('[Stripe Webhook] Signature verification failed:', err);
    return new Response('Webhook signature verification failed', { status: 400 });
  }

  try {
    switch (event.type) {
      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;

        // Only track subscription invoices
        if (!invoice.subscription) break;

        // Get customer to find user ID
        const customer = await stripe.customers.retrieve(invoice.customer as string);
        if (customer.deleted) break;

        const userId = customer.metadata?.userId || customer.metadata?.user_id;
        if (!userId) {
          console.warn('[Stripe Webhook] No userId in customer metadata:', invoice.customer);
          break;
        }

        await trackPurchase({
          userId: userId,
          orderId: invoice.id,
          orderAmount: invoice.amount_paid / 100, // Convert cents to dollars
          currency: invoice.currency.toUpperCase(),
        });

        console.log('[Stripe Webhook] Tracked purchase:', {
          userId,
          orderId: invoice.id,
          amount: invoice.amount_paid / 100,
        });
        break;
      }

      // Add more events as needed:
      // case 'customer.subscription.created':
      // case 'charge.refunded':
    }
  } catch (error) {
    console.error('[Stripe Webhook] Error processing event:', error);
    // Don't return error - Stripe will retry
  }

  return new Response('OK', { status: 200 });
}
```

#### 5.2 Add webhook secret to env

```env
STRIPE_WEBHOOK_SECRET_AFFILIATE=whsec_xxxxx
```

#### 5.3 Register webhook in Stripe Dashboard

1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint:
   - **URL:** `https://your-domain.com/api/webhooks/stripe-affiliate`
   - **Events:**
     - `invoice.paid`
     - `customer.subscription.created` (optional)
3. Copy webhook secret to `.env`

#### 5.4 Ensure userId is in Stripe customer metadata

**IMPORTANT:** For this to work, when you create Stripe customers, you MUST include the userId in metadata:

```typescript
// When creating a Stripe customer
const customer = await stripe.customers.create({
  email: user.email,
  name: user.name,
  metadata: {
    userId: user.id,  // <-- This is critical
  },
});
```

If your existing customers don't have this, you'll need to backfill or use a different lookup method.

#### 5.5 Test locally with Stripe CLI

```bash
# Install Stripe CLI if needed
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local
stripe listen --forward-to localhost:3000/api/webhooks/stripe-affiliate

# In another terminal, trigger test event
stripe trigger invoice.paid
```

### Deliverable
- [ ] Webhook endpoint created at `/api/webhooks/stripe-affiliate`
- [ ] Webhook registered in Stripe dashboard
- [ ] `invoice.paid` events tracked to RefRef
- [ ] User ID included in Stripe customer metadata

---

## Phase 6: Branding & Customization

**Estimated Time:** 2-3 hours
**Goal:** Make RefRef look like Layer Cake

### Tasks

See `REFREF-CUSTOMIZATION-PLAN.md` for full details.

#### 6.1 Replace logos

```bash
# Copy Layer Cake logos to RefRef
cp path/to/layercake-logo.svg services/affiliate/apps/webapp/public/logo.svg
cp path/to/layercake-logo-dark.svg services/affiliate/apps/webapp/public/logo-dark.svg
cp path/to/layercake-favicon.ico services/affiliate/apps/webapp/public/favicon.ico

# Same for affiliate portal
cp path/to/layercake-logo.svg services/affiliate/apps/refer/public/logo.svg
```

#### 6.2 Update brand colors

Edit `services/affiliate/packages/ui/tailwind.config.ts` or CSS variables.

#### 6.3 Update 90-day cookie

Edit `services/affiliate/packages/attribution-script/src/index.ts`:
- Find cookie `maxAge` config
- Ensure it's set to `90 * 24 * 60 * 60` (90 days)

#### 6.4 Search and replace branding

```bash
cd services/affiliate

# Find all RefRef references
grep -r "RefRef" --include="*.tsx" --include="*.ts" --include="*.json" | head -50

# Replace (be careful, review changes)
# RefRef → Layer Cake Affiliates
# refref.ai → affiliates.layercake.com
```

### Deliverable
- [ ] Logos replaced
- [ ] Colors updated
- [ ] Cookie window set to 90 days
- [ ] Text branding updated

---

## Phase 7: Production Deployment

**Estimated Time:** 4-6 hours
**Goal:** Deploy affiliate system to production

### Tasks

#### 7.1 Set up production database

Options:
- Neon (PostgreSQL, free tier available)
- Supabase (PostgreSQL)
- Railway (PostgreSQL)
- AWS RDS

#### 7.2 Create production environment

Create `services/affiliate/.env.production`:

```env
DATABASE_URL=postgresql://...production-db-url...
BETTER_AUTH_SECRET=<strong-production-secret>
BETTER_AUTH_URL=https://affiliates.layercake.com
NEXT_PUBLIC_APP_URL=https://affiliates.layercake.com
RESEND_API_KEY=re_xxxxx
```

#### 7.3 Deploy options

**Option A: Same server as Layer Cake (Docker)**
```bash
docker-compose -f docker-compose.prod.yml up -d
```

**Option B: Separate service (Railway/Render)**
- Deploy as separate service
- Configure environment variables
- Set up custom domain

#### 7.4 Configure production subdomain

- `affiliates.layercake.com` → RefRef webapp
- `api.affiliates.layercake.com` → RefRef API (or use path: `affiliates.layercake.com/api`)

#### 7.5 Update production Stripe webhook

1. Add production webhook URL in Stripe dashboard
2. Update production env with new webhook secret

#### 7.6 Update Layer Cake production env

```env
REFREF_API_URL=https://api.affiliates.layercake.com
REFREF_API_KEY=<production-api-key>
REFREF_PRODUCT_ID=<production-product-id>
REFREF_PROGRAM_ID=<production-program-id>
```

### Deliverable
- [ ] Production database provisioned
- [ ] RefRef deployed to production
- [ ] Custom domain configured
- [ ] Stripe production webhook registered
- [ ] Layer Cake production env updated

---

## Testing Checklist

### End-to-End Flow Test

```
1. [ ] Visit signup with ref param: /signup?ref=TEST123
2. [ ] Verify cookie is set (check browser dev tools)
3. [ ] Complete signup
4. [ ] Check RefRef dashboard → Events → Should see signup event
5. [ ] Create test subscription in Stripe (test mode)
6. [ ] Check RefRef dashboard → Events → Should see purchase event
7. [ ] Check RefRef dashboard → Rewards → Should see commission (40% of purchase)
8. [ ] Verify commission amount is correct
```

### Edge Cases

```
- [ ] Signup without ref param (should work, no attribution)
- [ ] Signup with invalid ref param (should work, no attribution)
- [ ] Multiple payments for same subscription (each should create commission)
- [ ] Refund (decide: claw back or not?)
```

---

## Questions for Backend Team

Before starting, please clarify:

1. **Stripe customer metadata:** Do we already store `userId` in Stripe customer metadata? If not, we need to add this.

2. **Signup flow location:** Where exactly is user creation handled? (Convex mutation? API route? Clerk webhook?)

3. **Existing webhooks:** Do we have existing Stripe webhooks? We need to ensure they don't conflict.

4. **Deployment preference:** Deploy RefRef on same infrastructure or separate service?

5. **Database:** Use existing Postgres or provision separate one for affiliate system?

---

## Timeline Summary

| Phase | Task | Time | Dependencies |
|-------|------|------|--------------|
| 1 | Setup RefRef | 4-6h | None |
| 2 | Create client library | 2-3h | Phase 1 |
| 3 | Configure dashboard | 1-2h | Phase 1 |
| 4 | Signup tracking | 2-3h | Phase 2, 3 |
| 5 | Stripe webhook | 3-4h | Phase 2, 3 |
| 6 | Branding | 2-3h | Phase 1 |
| 7 | Production deploy | 4-6h | All above |

**Total: 18-27 hours (3-5 days)**

---

## Future: Benefits Ontology Integration

After RefRef is stable (post-launch), we can connect it to our existing Benefits Ontology:

### Phase 2: Sync Affiliates to Convex
- Create `crm_contact` for each RefRef participant
- Store `refrefParticipantId` in `customProperties`
- Affiliates visible in Layer Cake CRM

### Phase 3: Sync Rewards to Convex
- Create `commission` object for each RefRef reward
- Link via `earns_commission` relationship
- Unified commission reporting across internal + external referrals

**See `HYBRID-ARCHITECTURE-PLAN.md` for full implementation details.**

---

## Contact

Questions? Reach out to [Remington] or check the reference docs in this folder.

---

*This brief references:*
- `REFREF-INTEGRATION-GUIDE.md` — Detailed technical guide
- `REFREF-CUSTOMIZATION-PLAN.md` — Customization details
- `HYBRID-ARCHITECTURE-PLAN.md` — Benefits Ontology integration strategy
- `AFFILIATE-PROGRAM.md` — Business rules and commission structure
