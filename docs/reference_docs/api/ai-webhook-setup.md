# AI Subscription Webhook Setup

## Current Issue: 404 Webhook Errors

The webhooks are failing with 404 because the `STRIPE_AI_WEBHOOK_SECRET` environment variable is not set in Convex.

### Quick Fix for Development (Using Stripe CLI):

1. **Your stripe listen command shows the webhook secret:**
   ```
   whsec_3c5cc8127ec4e42a0f97868818916fff91e88f226ddf2fce9be12b90d6b19998
   ```

2. **Set this in Convex:**
   ```bash
   npx convex env set STRIPE_AI_WEBHOOK_SECRET whsec_3c5cc8127ec4e42a0f97868818916fff91e88f226ddf2fce9be12b90d6b19998
   ```

3. **Then restart your stripe listener** - webhooks should now work!

### For Production:

1. **Go to Stripe Dashboard** → Developers → Webhooks
2. **Create a new webhook endpoint:**
   - URL: `https://aromatic-akita-723.convex.cloud/stripe-ai-webhooks`
   - Events to listen for:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`

3. **Get the webhook signing secret** (starts with `whsec_...`)

4. **Set it in Convex production:**
   ```bash
   npx convex env set STRIPE_AI_WEBHOOK_SECRET whsec_PRODUCTION_SECRET_HERE --prod
   ```

## Debugging Webhooks

With the new logging, you'll see:

```
[AI Webhooks] 🔔 Received webhook request
[AI Webhooks] 📝 Request details: { hasSignature: true, bodyLength: 1234, ... }
[AI Webhooks] 🔑 Webhook secret configured: true
[AI Webhooks] ✅ Signature verified for event: invoice.payment_succeeded
[AI Webhooks] 📦 Processing: invoice.payment_succeeded (evt_123...)
[AI Webhooks] 📧 Customer email: customer@example.com
[AI Webhooks] ✅ Event queued for processing
```

## Stripe Account Separation

### Platform Stripe (Current - AI Subscriptions)
- **Purpose**: Bill l4yercak3 customers for AI features
- **Env Vars**:
  - `STRIPE_SECRET_KEY` - Main platform Stripe account
  - `STRIPE_AI_WEBHOOK_SECRET` - Webhook secret for AI subscriptions
  - `STRIPE_AI_STANDARD_PRICE_ID` - Standard tier price
  - `STRIPE_AI_PRIVACY_ENHANCED_PRICE_ID` - Privacy tier price

### Stripe Connect (Future - Customer Payments)
- **Purpose**: Organizations sell to THEIR customers
- **Env Vars**:
  - `STRIPE_CONNECT_CLIENT_ID` - For OAuth
  - Separate webhook endpoints per connected account

### File Structure (Proposed)
```
convex/stripe/
├── platform/              # l4yercak3 platform billing
│   ├── aiCheckout.ts      # ✅ Already here
│   ├── aiWebhooks.ts      # ✅ Already here
│   └── aiSubscriptions.ts # Subscription management
│
└── connect/               # Customer payment processing
    ├── connectOnboarding.ts
    ├── connectPayments.ts
    └── connectWebhooks.ts
```

## Next Steps

1. ✅ Set `STRIPE_AI_WEBHOOK_SECRET` in Convex
2. ✅ Test webhooks with stripe listen
3. ⏳ Add email notifications (customer + sales team)
4. ⏳ Organize files into platform/ and connect/ folders
