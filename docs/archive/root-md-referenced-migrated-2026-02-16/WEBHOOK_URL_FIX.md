# Webhook URL Fix - CRITICAL

## The Problem

All Stripe webhooks were returning 404 errors, preventing subscription processing from working.

## The Solution

**Convex HTTP endpoints use `.convex.site`, NOT `.convex.cloud`!**

### Correct Webhook URLs:

```
✅ CORRECT: https://aromatic-akita-723.convex.site/stripe-ai-webhooks
❌ WRONG:   https://aromatic-akita-723.convex.cloud/stripe-ai-webhooks
```

## How to Fix in Stripe Dashboard

1. Go to Stripe Dashboard → Developers → Webhooks
2. Find your webhook endpoint (or create new one)
3. Update the URL to: `https://aromatic-akita-723.convex.site/stripe-ai-webhooks`
4. Make sure these events are selected:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copy the webhook signing secret
6. Set it in Convex: `npx convex env set STRIPE_AI_WEBHOOK_SECRET whsec_...`

## Development with Stripe CLI

When using `stripe listen` for local development:

```bash
# Forward to the CORRECT domain (.convex.site)
stripe listen --forward-to https://aromatic-akita-723.convex.site/stripe-ai-webhooks

# Copy the webhook secret (starts with whsec_) and set it:
npx convex env set STRIPE_AI_WEBHOOK_SECRET whsec_xxxxxxxxxxxxx
```

## Testing Webhooks

Test that webhooks are working:

```bash
# Should return 400 "Missing signature" (means endpoint is accessible)
curl -X POST https://aromatic-akita-723.convex.site/stripe-ai-webhooks

# Should return 200 with {"status":"ok","timestamp":...}
curl https://aromatic-akita-723.convex.site/health
```

## Why .convex.site vs .convex.cloud?

- `.convex.cloud` - Used for Convex function calls (queries, mutations, actions)
- `.convex.site` - Used for HTTP endpoints (webhooks, REST API, etc.)

Both domains point to the same deployment, but HTTP routes ONLY work on `.convex.site`.

## Environment Variables

These are already set correctly in Convex:

```bash
STRIPE_AI_WEBHOOK_SECRET=  # ✅ Set
STRIPE_SECRET_KEY=...                            # ✅ Set
```

## B2B Checkout Changes

We've also simplified the B2B checkout flow:

- **Before**: User had to choose "Personal" or "Business" in our UI
- **After**: Always enable B2B mode - Stripe shows the business/personal toggle in their checkout UI

This way:
1. Tax ID collection is always available
2. Customers choose in Stripe's UI (where they expect it)
3. They can enter VAT, EIN, or other business tax IDs
4. EU reverse charge VAT works automatically

## Next Steps

1. ✅ Webhook URLs fixed (use .convex.site)
2. ✅ B2B mode simplified (always enabled)
3. 🔄 **TODO**: Update Stripe Dashboard webhook URL
4. 🔄 **TODO**: Test complete checkout → subscription → email flow
5. 🔄 **TODO**: Implement confirmation emails to customer and sales team
