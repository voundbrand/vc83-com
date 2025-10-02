# Task 019: Phase 5 - App Store UI & Stripe Integration

## Overview

This task implements the purchase flow for paid apps using Stripe, including checkout, webhooks, and confirmation. Users can buy apps (one-time or subscription) and they'll auto-install on the desktop after successful payment.

**Parent Task**: 016_app_platform_architecture.md  
**Dependencies**: Task 018 (Phase 4 - Desktop Shell must be complete)  
**Estimated Time**: 2-3 days  
**Priority**: High - Required for monetization

---

## Success Criteria

- [ ] Stripe API keys configured (test mode initially)
- [ ] Purchase flow: Click "Buy" → Stripe checkout → Payment → Confirmation
- [ ] Webhook receives Stripe events and confirms purchase
- [ ] `purchases` table stores all transactions
- [ ] Apps auto-install after successful purchase
- [ ] Desktop refreshes to show newly purchased app icons
- [ ] Subscription management (for recurring apps)
- [ ] Trial periods work (e.g., 14-day free trial for Email app)
- [ ] Refund handling (webhook uninstalls app)
- [ ] All TypeScript checks pass

---

## Phase 5 Breakdown

### 5.1 Stripe Setup (1-2 hours)

**Prerequisites**:
1. Create Stripe account (https://stripe.com)
2. Get API keys (test mode):
   - Publishable key: `pk_test_...`
   - Secret key: `sk_test_...`
   - Webhook signing secret: `whsec_...`

**Environment Variables**:
```bash
# .env.local
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

**Convex Environment**:
```bash
npx convex env set STRIPE_SECRET_KEY sk_test_...
npx convex env set STRIPE_WEBHOOK_SECRET whsec_...
```

**Install Stripe SDK**:
```bash
npm install @stripe/stripe-js stripe
```

**Action Items**:
- [ ] Create Stripe account
- [ ] Get test API keys
- [ ] Add to environment variables
- [ ] Install Stripe npm packages

---

### 5.2 Purchases Table Schema (1 hour)

**File**: `convex/schema.ts`

**Add Purchases Table**:
```typescript
purchases: defineTable({
  organizationId: v.id("organizations"),
  userId: v.id("users"),
  appId: v.id("apps"),
  
  // Stripe data
  stripeCustomerId: v.optional(v.string()),
  stripeSessionId: v.optional(v.string()),
  stripeSubscriptionId: v.optional(v.string()), // For recurring
  stripeInvoiceId: v.optional(v.string()),
  
  // Purchase details
  amount: v.number(), // In cents
  currency: v.string(), // "usd"
  billingType: v.union(
    v.literal("one-time"),
    v.literal("subscription")
  ),
  
  // Status
  status: v.union(
    v.literal("pending"),
    v.literal("completed"),
    v.literal("failed"),
    v.literal("refunded"),
    v.literal("cancelled")
  ),
  
  // Trial info (for subscriptions)
  trialEndsAt: v.optional(v.number()),
  
  // Timestamps
  purchasedAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_organization", ["organizationId"])
  .index("by_user", ["userId"])
  .index("by_app", ["appId"])
  .index("by_stripe_session", ["stripeSessionId"])
  .index("by_stripe_subscription", ["stripeSubscriptionId"])
  .index("by_status", ["status"])
```

**Action Items**:
- [ ] Add purchases table to schema
- [ ] Run Convex schema migration
- [ ] Update types

---

### 5.3 Create Checkout Session Mutation (2-3 hours)

**File**: `convex/purchases.ts`

**Implementation**:
```typescript
import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { getCurrentContext } from "./helpers";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
});

export const createCheckoutSession = mutation({
  args: {
    appId: v.id("apps"),
  },
  handler: async (ctx, { appId }) => {
    const { user, organization } = await getCurrentContext(ctx);
    
    // Get app details
    const app = await ctx.db.get(appId);
    if (!app) throw new Error("App not found");
    
    if (!app.price) {
      throw new Error("App is free - no purchase needed");
    }
    
    // Check if already purchased
    const existingPurchase = await ctx.db
      .query("purchases")
      .withIndex("by_organization", q => q.eq("organizationId", organization._id))
      .filter(q => q.and(
        q.eq(q.field("appId"), appId),
        q.eq(q.field("status"), "completed")
      ))
      .first();
      
    if (existingPurchase) {
      throw new Error("App already purchased");
    }
    
    // Create or get Stripe customer
    let stripeCustomer;
    const existingCustomer = await ctx.db
      .query("purchases")
      .withIndex("by_organization", q => q.eq("organizationId", organization._id))
      .filter(q => q.neq(q.field("stripeCustomerId"), undefined))
      .first();
      
    if (existingCustomer?.stripeCustomerId) {
      stripeCustomer = await stripe.customers.retrieve(existingCustomer.stripeCustomerId);
    } else {
      stripeCustomer = await stripe.customers.create({
        email: user.email,
        name: organization.name,
        metadata: {
          organizationId: organization._id,
          userId: user._id,
        },
      });
    }
    
    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomer.id,
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: app.priceCurrency || "usd",
            product_data: {
              name: app.name,
              description: app.description,
              images: app.icon ? [`https://vc83.com/app-icons/${app.icon}`] : [],
            },
            ...(app.billingType === "subscription" ? {
              recurring: { interval: "month" },
            } : {}),
            unit_amount: app.price,
          },
          quantity: 1,
        },
      ],
      mode: app.billingType === "subscription" ? "subscription" : "payment",
      success_url: `${process.env.NEXT_PUBLIC_URL}/desktop?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_URL}/desktop`,
      metadata: {
        organizationId: organization._id,
        userId: user._id,
        appId,
      },
      ...(app.billingType === "subscription" && {
        subscription_data: {
          trial_period_days: 14, // 14-day trial for subscriptions
        },
      }),
    });
    
    // Create pending purchase record
    await ctx.db.insert("purchases", {
      organizationId: organization._id,
      userId: user._id,
      appId,
      stripeCustomerId: stripeCustomer.id,
      stripeSessionId: session.id,
      amount: app.price,
      currency: app.priceCurrency || "usd",
      billingType: app.billingType || "one-time",
      status: "pending",
      trialEndsAt: app.billingType === "subscription" ? 
        Date.now() + (14 * 24 * 60 * 60 * 1000) : undefined,
      purchasedAt: Date.now(),
      updatedAt: Date.now(),
    });
    
    return {
      sessionId: session.id,
      url: session.url,
    };
  },
});
```

**Action Items**:
- [ ] Create purchases.ts file
- [ ] Implement createCheckoutSession mutation
- [ ] Handle Stripe customer creation
- [ ] Create checkout session with line items
- [ ] Store pending purchase record
- [ ] Return session URL

---

### 5.4 Confirm Purchase Mutation (2 hours)

**File**: `convex/purchases.ts`

**Implementation**:
```typescript
export const confirmPurchase = mutation({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, { sessionId }) => {
    // Find purchase by session ID
    const purchase = await ctx.db
      .query("purchases")
      .withIndex("by_stripe_session", q => q.eq("stripeSessionId", sessionId))
      .first();
      
    if (!purchase) {
      throw new Error("Purchase not found");
    }
    
    if (purchase.status === "completed") {
      // Already processed
      return { success: true, alreadyProcessed: true };
    }
    
    // Update purchase status
    await ctx.db.patch(purchase._id, {
      status: "completed",
      updatedAt: Date.now(),
    });
    
    // Install the app
    const existingInstallation = await ctx.db
      .query("appInstallations")
      .withIndex("by_org_and_app", q =>
        q.eq("organizationId", purchase.organizationId)
         .eq("appId", purchase.appId)
      )
      .first();
      
    if (!existingInstallation) {
      await ctx.db.insert("appInstallations", {
        organizationId: purchase.organizationId,
        appId: purchase.appId,
        isActive: true,
        isVisible: true,
        usageCount: 0,
        installedAt: Date.now(),
        installedBy: purchase.userId,
        updatedAt: Date.now(),
      });
    } else {
      // Reactivate if was previously uninstalled
      await ctx.db.patch(existingInstallation._id, {
        isActive: true,
        isVisible: true,
        updatedAt: Date.now(),
      });
    }
    
    // Create audit log
    await ctx.db.insert("auditLogs", {
      organizationId: purchase.organizationId,
      userId: purchase.userId,
      action: "app.purchased",
      resource: "app",
      resourceId: purchase.appId,
      metadata: {
        amount: purchase.amount,
        currency: purchase.currency,
        sessionId,
      },
      success: true,
      createdAt: Date.now(),
    });
    
    return { success: true, purchase };
  },
});
```

**Action Items**:
- [ ] Create confirmPurchase mutation
- [ ] Update purchase status to completed
- [ ] Install app for organization
- [ ] Create audit log
- [ ] Handle idempotency (already processed)

---

### 5.5 Stripe Webhook Handler (3-4 hours)

**File**: `convex/http.ts` (update)

**Implementation**:
```typescript
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
});

const http = httpRouter();

http.route({
  path: "/stripe/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");
    
    if (!signature) {
      return new Response("No signature", { status: 400 });
    }
    
    let event: Stripe.Event;
    
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return new Response("Invalid signature", { status: 400 });
    }
    
    // Handle different event types
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        
        // Confirm purchase
        await ctx.runMutation(api.purchases.confirmPurchase, {
          sessionId: session.id,
        });
        
        break;
      }
      
      case "invoice.payment_succeeded": {
        // Subscription renewal
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;
        
        // Update purchase record
        const purchase = await ctx.runQuery(api.purchases.getBySubscription, {
          subscriptionId,
        });
        
        if (purchase) {
          await ctx.runMutation(api.purchases.updateSubscription, {
            purchaseId: purchase._id,
            status: "completed",
          });
        }
        
        break;
      }
      
      case "customer.subscription.deleted": {
        // Subscription cancelled
        const subscription = event.data.object as Stripe.Subscription;
        
        // Uninstall app
        await ctx.runMutation(api.purchases.handleSubscriptionCancelled, {
          subscriptionId: subscription.id,
        });
        
        break;
      }
      
      case "charge.refunded": {
        // Refund issued
        const charge = event.data.object as Stripe.Charge;
        const sessionId = charge.metadata?.sessionId;
        
        if (sessionId) {
          await ctx.runMutation(api.purchases.handleRefund, {
            sessionId,
          });
        }
        
        break;
      }
    }
    
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

export default http;
```

**Action Items**:
- [ ] Add webhook route to http.ts
- [ ] Verify Stripe signature
- [ ] Handle checkout.session.completed event
- [ ] Handle invoice.payment_succeeded (subscription renewal)
- [ ] Handle customer.subscription.deleted (cancellation)
- [ ] Handle charge.refunded (refund)
- [ ] Return 200 response

---

### 5.6 Frontend Purchase Flow (2-3 hours)

**File**: `src/components/apps/AppStoreApp.tsx` (update)

**Implementation**:
```typescript
'use client';

import { loadStripe } from '@stripe/stripe-js';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

function AppCard({ app, isInstalled, isGuest }) {
  const createCheckout = useMutation(api.purchases.createCheckoutSession);
  const [loading, setLoading] = useState(false);
  
  const handlePurchase = async () => {
    if (isGuest) {
      // Show registration prompt
      openRegistrationWindow();
      return;
    }
    
    setLoading(true);
    
    try {
      // Create checkout session
      const { sessionId, url } = await createCheckout({ appId: app._id });
      
      // Redirect to Stripe Checkout
      window.location.href = url;
    } catch (error) {
      console.error("Purchase failed:", error);
      alert("Purchase failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="border-2 border-gray-400 p-4 bg-white">
      <div className="text-4xl mb-2">{app.icon}</div>
      <h3 className="font-bold">{app.name}</h3>
      <p className="text-sm text-gray-600 mb-2">{app.description}</p>
      
      {app.price && (
        <div className="mb-2">
          <p className="font-bold text-purple-600">
            ${(app.price / 100).toFixed(2)}/mo
          </p>
          {app.billingType === "subscription" && (
            <p className="text-xs text-green-600">14-day free trial</p>
          )}
        </div>
      )}
      
      <button
        onClick={handlePurchase}
        disabled={loading || isInstalled}
        className="retro-button w-full"
      >
        {loading ? 'Loading...' :
         isInstalled ? 'Purchased' :
         isGuest ? 'Sign up to buy' :
         'Buy Now'}
      </button>
    </div>
  );
}
```

**Action Items**:
- [ ] Import Stripe.js
- [ ] Create purchase handler
- [ ] Redirect to Stripe Checkout
- [ ] Handle loading states
- [ ] Show trial info

---

### 5.7 Purchase Confirmation Page (1-2 hours)

**File**: `src/app/desktop/page.tsx` (update)

**Implementation**:
```typescript
'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';

export default function Desktop() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const confirmPurchase = useMutation(api.purchases.confirmPurchase);
  
  useEffect(() => {
    if (sessionId) {
      // Confirm purchase after Stripe redirect
      confirmPurchase({ sessionId })
        .then(() => {
          // Show success message
          alert('App installed successfully!');
          
          // Remove session_id from URL
          window.history.replaceState({}, '', '/desktop');
        })
        .catch((error) => {
          console.error('Purchase confirmation failed:', error);
        });
    }
  }, [sessionId]);
  
  // ... rest of desktop code
}
```

**Action Items**:
- [ ] Check for session_id query param
- [ ] Call confirmPurchase mutation
- [ ] Show success message
- [ ] Clean up URL
- [ ] Desktop auto-refreshes to show new app

---

### 5.8 Subscription Management (2-3 hours)

**Additional Mutations Needed**:

**File**: `convex/purchases.ts`

```typescript
export const cancelSubscription = mutation({
  args: {
    purchaseId: v.id("purchases"),
  },
  handler: async (ctx, { purchaseId }) => {
    const { user, organization } = await getCurrentContext(ctx);
    
    const purchase = await ctx.db.get(purchaseId);
    if (!purchase || purchase.organizationId !== organization._id) {
      throw new Error("Purchase not found");
    }
    
    if (purchase.billingType !== "subscription") {
      throw new Error("Not a subscription");
    }
    
    if (!purchase.stripeSubscriptionId) {
      throw new Error("No subscription ID");
    }
    
    // Cancel in Stripe
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    await stripe.subscriptions.cancel(purchase.stripeSubscriptionId);
    
    // Update purchase status
    await ctx.db.patch(purchaseId, {
      status: "cancelled",
      updatedAt: Date.now(),
    });
    
    // Uninstall app
    const installation = await ctx.db
      .query("appInstallations")
      .withIndex("by_org_and_app", q =>
        q.eq("organizationId", organization._id)
         .eq("appId", purchase.appId)
      )
      .first();
      
    if (installation) {
      await ctx.db.patch(installation._id, {
        isActive: false,
        updatedAt: Date.now(),
      });
    }
    
    return { success: true };
  },
});

export const getSubscriptions = query({
  handler: async (ctx) => {
    const { organization } = await getCurrentContext(ctx);
    
    return await ctx.db
      .query("purchases")
      .withIndex("by_organization", q => q.eq("organizationId", organization._id))
      .filter(q => q.and(
        q.eq(q.field("billingType"), "subscription"),
        q.eq(q.field("status"), "completed")
      ))
      .collect();
  },
});
```

**Action Items**:
- [ ] Create cancelSubscription mutation
- [ ] Create getSubscriptions query
- [ ] Handle subscription cancellation
- [ ] Uninstall app when cancelled

---

### 5.9 Testing & Validation (2-3 hours)

**Test Scenarios**:

1. **One-Time Purchase**:
   - [ ] Guest clicks "Buy" → Registration prompt
   - [ ] Authenticated user clicks "Buy" → Stripe checkout
   - [ ] Complete payment with test card
   - [ ] Redirected back to desktop
   - [ ] App appears on desktop
   - [ ] App is launchable

2. **Subscription Purchase**:
   - [ ] Buy subscription app
   - [ ] See "14-day free trial" note
   - [ ] Complete payment
   - [ ] Check trial_end date in Stripe
   - [ ] App installs immediately
   - [ ] After trial: First payment processed

3. **Subscription Cancellation**:
   - [ ] Cancel subscription from settings
   - [ ] App uninstalls from desktop
   - [ ] Stripe subscription cancelled
   - [ ] No future charges

4. **Refund**:
   - [ ] Process refund in Stripe Dashboard
   - [ ] Webhook received
   - [ ] App uninstalls
   - [ ] Purchase status updated to "refunded"

**Stripe Test Cards**:
```
Success: 4242 4242 4242 4242
Decline: 4000 0000 0000 0002
3D Secure: 4000 0025 0000 3155
```

**Action Items**:
- [ ] Test all purchase flows
- [ ] Test webhook delivery
- [ ] Test cancellations and refunds
- [ ] Verify data consistency

---

## Stripe Dashboard Configuration

**Steps**:
1. Go to https://dashboard.stripe.com/test/webhooks
2. Click "Add endpoint"
3. URL: `https://[your-convex-url].convex.cloud/stripe/webhook`
4. Select events:
   - `checkout.session.completed`
   - `invoice.payment_succeeded`
   - `customer.subscription.deleted`
   - `charge.refunded`
5. Copy webhook signing secret to env vars

**Action Items**:
- [ ] Configure webhook endpoint
- [ ] Select event types
- [ ] Save signing secret
- [ ] Test webhook delivery

---

## Definition of Done

- [ ] Stripe API keys configured
- [ ] Purchases table created
- [ ] createCheckoutSession mutation working
- [ ] confirmPurchase mutation working
- [ ] Webhook handler processing events
- [ ] Frontend purchase flow complete
- [ ] Apps auto-install after purchase
- [ ] Desktop refreshes to show new apps
- [ ] Subscription management working
- [ ] Trial periods functional
- [ ] Refunds handled
- [ ] All test scenarios pass
- [ ] TypeScript checks pass
- [ ] Production-ready (switch to live keys)

---

## Next Steps

After Phase 5 completion:
- **Phase 6**: Security & Testing (comprehensive audit)
- **Phase 7**: Production Readiness (deployment, monitoring)

---

## Notes

- **Estimated Total Time**: 18-24 hours (2-3 days)
- **Complexity**: Medium-High (Stripe integration, webhooks)
- **Risk**: Medium (webhook reliability, testing payment flows)
- **Security**: Never expose secret keys client-side

**Important**: Start in Stripe test mode. Only switch to live mode after thorough testing!