# Stripe Integration Architecture

## Two Separate Stripe Integrations

This platform has **TWO DISTINCT** Stripe integrations with different purposes:

### 1. Platform Billing (AI Subscriptions)
**Purpose:** Organizations subscribe TO YOUR PLATFORM for AI features

**Money Flow:** Organizations → Your Platform

**Files:**
- `convex/stripe/aiWebhooks.ts` - Webhook handlers
- `convex/ai/billing.ts` - Subscription management
- `convex/stripe/aiCheckout.ts` - Checkout session creation

**Webhook Endpoint:** `/stripe-ai-webhooks`

**Environment Variables:**
- `STRIPE_SECRET_KEY` - Your platform's Stripe secret key
- `STRIPE_AI_WEBHOOK_SECRET` - Webhook signing secret for AI billing
- `STRIPE_AI_STANDARD_PRICE_ID` - Price ID for standard tier
- `STRIPE_AI_PRIVACY_ENHANCED_PRICE_ID` - Price ID for privacy tier

**Stripe Dashboard Setup:**
1. Create products for each AI tier (Standard, Privacy-Enhanced, Private LLM)
2. Create webhook endpoint: `https://[deployment].convex.cloud/stripe-ai-webhooks`
3. Listen for events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`

---

### 2. Organization Payments (Stripe Connect)
**Purpose:** Organizations accept payments FROM THEIR CUSTOMERS

**Money Flow:** Customers → Organizations (through your platform)

**Files:**
- `convex/paymentProviders/stripe.ts` - Stripe Connect provider
- `convex/paymentProviders/manager.ts` - Provider manager
- `convex/stripeWebhooks.ts` - Connect webhook handlers

**Webhook Endpoint:** `/stripe-webhooks` or `/stripe-connect-webhooks`

**Environment Variables:**
- `STRIPE_SECRET_KEY` - Your platform's Stripe secret key (same as above)
- `STRIPE_WEBHOOK_SECRET` - Webhook signing secret for Connect events
- `STRIPE_CLIENT_ID` - OAuth client ID for Connect onboarding

**Stripe Dashboard Setup:**
1. Enable Stripe Connect in your account settings
2. Create webhook endpoint: `https://[deployment].convex.cloud/stripe-webhooks`
3. Listen for Connect events:
   - `account.updated`
   - `account.application.deauthorized`
   - `payment_intent.succeeded`
   - `charge.refunded`

---

## Key Differences

| Aspect | Platform Billing | Organization Payments |
|--------|-----------------|----------------------|
| **Purpose** | Organizations pay YOU | Customers pay organizations |
| **Stripe Account** | Your platform account | Organization's connected account |
| **Webhook Secret** | `STRIPE_AI_WEBHOOK_SECRET` | `STRIPE_WEBHOOK_SECRET` |
| **Webhook Endpoint** | `/stripe-ai-webhooks` | `/stripe-webhooks` |
| **Database Tables** | `aiSubscriptions`, `aiUsage` | `transactions`, `invoices` |
| **Who configures** | You (platform owner) | Individual organizations |

---

## Current Issue

The `/stripe-ai-webhooks` endpoint was incorrectly trying to use the Stripe Connect provider for signature verification, which uses `STRIPE_WEBHOOK_SECRET` instead of `STRIPE_AI_WEBHOOK_SECRET`.

**Fix Applied:**
- Updated `/stripe-ai-webhooks` to use `STRIPE_AI_WEBHOOK_SECRET` directly
- Added clear comments explaining the separation
- Fixed type casting for `organizationId`

---

## Proposed Refactoring (Future)

Move files to clearer structure:

```
convex/
  platformBilling/              # Organizations → Platform
    webhooks.ts                 # AI subscription webhooks
    subscriptions.ts            # Subscription management
    checkout.ts                 # Checkout creation

  organizationPayments/         # Customers → Organizations
    providers/
      stripe/
        connect.ts              # Stripe Connect provider
        webhooks.ts             # Connect webhooks
      invoice/
        provider.ts             # Invoice provider
      manager.ts                # Provider manager
    transactions.ts             # Transaction management
```

This makes the separation crystal clear in the folder structure.

---

## Testing Checklist

### Platform Billing Test
1. Create AI subscription via checkout
2. Verify webhook received at `/stripe-ai-webhooks`
3. Check `aiSubscriptions` table for new record
4. Verify token limits are set correctly

### Organization Payments Test
1. Connect organization's Stripe account
2. Create payment via organization
3. Verify webhook received at `/stripe-webhooks`
4. Check `transactions` table for new record

---

**Last Updated:** 2025-12-02
