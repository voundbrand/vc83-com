# AI Subscription Data Storage & Webhook Issues

## 🚨 Webhook Errors You're Seeing

```
2025-12-02 10:21:42   --> customer.subscription.created [evt_1SZpmEEEbynvhkixzooZ3RRk]
2025-12-02 10:21:43  <--  [502] POST https://aromatic-akita-723.convex.cloud/stripe-ai-webhooks
2025-12-02 10:21:45   --> invoice.payment_succeeded [evt_1SZpmGEEbynvhkix9Iebfi6D]
2025-12-02 10:21:45  <--  [404] POST https://aromatic-akita-723.convex.cloud/stripe-ai-webhooks
```

### Error Analysis

**502 Bad Gateway Error (customer.subscription.created)**
- **Cause**: Your Convex backend is likely throwing an unhandled error during webhook processing
- **Impact**: The subscription data may not have been saved to the database
- **Location**: Check [convex/stripe/aiWebhooks.ts:99-138](convex/stripe/aiWebhooks.ts#L99-L138)

**404 Not Found Error (invoice.payment_succeeded)**
- **Cause**: Stripe is sending webhooks to an endpoint that doesn't exist or isn't registered
- **Impact**: Payment success not recorded, tokens not reset
- **Location**: Webhook endpoint should be at [convex/http.ts:165](convex/http.ts#L165)

### Debugging Steps

1. **Check Convex Logs**:
```bash
# View Convex function logs to see the actual error
npx convex dev --tail-logs
```

2. **Verify Webhook Endpoint**:
- The endpoint should be: `https://aromatic-akita-723.convex.cloud/stripe-ai-webhooks`
- Check if it's registered in Stripe Dashboard → Developers → Webhooks

3. **Check Stripe Webhook Secret**:
```bash
# Verify your Stripe webhook secret is set
echo $STRIPE_AI_WEBHOOK_SECRET
```

---

## 📊 What Data Gets Saved

When a subscription is successfully created, the following data is saved:

### 1. **aiSubscriptions** Table

This is the main subscription record stored in the `aiSubscriptions` table:

| Field | Example Value | Description |
|-------|---------------|-------------|
| `organizationId` | `jx7...` | Links subscription to organization |
| `stripeSubscriptionId` | `sub_1SZpm...` | Stripe subscription ID |
| `stripeCustomerId` | `cus_RdFG...` | Stripe customer ID |
| `stripePriceId` | `price_1SZp...` | Stripe price ID |
| `status` | `"active"` | Subscription status |
| `tier` | `"standard"` or `"privacy-enhanced"` | Which tier was purchased |
| `currentPeriodStart` | `1733140902000` | Billing period start (Unix ms) |
| `currentPeriodEnd` | `1735819302000` | Billing period end (Unix ms) |
| `includedTokensTotal` | `500000` | Monthly token allowance |
| `includedTokensUsed` | `0` | Tokens used this period |
| `priceInCents` | `4900` | Price in cents (€49.00) |
| `currency` | `"eur"` | Currency |
| `cancelAtPeriodEnd` | `false` | Will cancel at end? |
| `createdAt` | `1733140903000` | Record creation time |
| `updatedAt` | `1733140903000` | Last update time |

**Database Query Example**:
```typescript
// Find subscription by organization
const subscription = await ctx.db
  .query("aiSubscriptions")
  .withIndex("by_organization", (q) =>
    q.eq("organizationId", "jx7abc123...")
  )
  .first();
```

---

## 🔍 Where to Find Subscription Data

### 1. **Convex Dashboard**

Visit: https://dashboard.convex.dev/

1. Select your project: **aromatic-akita-723**
2. Click "Data" in left sidebar
3. Select table: **aiSubscriptions**
4. Filter by `organizationId` to find your org's subscription

### 2. **Query from Frontend**

```typescript
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

function SubscriptionDisplay() {
  const subscription = useQuery(
    api.ai.billing.getSubscriptionStatus,
    { organizationId: user.defaultOrgId }
  );

  return (
    <div>
      <p>Status: {subscription?.status}</p>
      <p>Tier: {subscription?.tier}</p>
      <p>Tokens Remaining: {subscription?.includedTokensRemaining}</p>
    </div>
  );
}
```

### 3. **Convex Dev Console**

```bash
# Start Convex dev mode
npx convex dev

# Open a new terminal and query
npx convex run ai/billing:getSubscriptionStatus \
  --arg organizationId="jx7abc123..."
```

---

## 📋 Complete Data Flow

```
┌─────────────────┐
│  User Checkout  │
│   in Browser    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Stripe Checkout │  ← Redirect to Stripe
│     Session     │
└────────┬────────┘
         │ Payment Success
         ▼
┌─────────────────┐
│ Stripe Webhooks │
│      Send:      │
│ 1. customer.    │
│    subscription.│
│    created      │  ← 502 Error occurred here!
│ 2. invoice.     │
│    payment_     │
│    succeeded    │  ← 404 Error occurred here!
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Your Backend   │
│  /stripe-ai-    │
│   webhooks      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   aiWebhooks    │  ← convex/stripe/aiWebhooks.ts
│  processAIWeb-  │
│      hook       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  upsertSub-     │  ← convex/ai/billing.ts
│  scription-     │
│  FromStripe     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ aiSubscriptions │  ← DATABASE TABLE
│      Table      │
└─────────────────┘
```

---

## 🔧 How to Fix the Webhook Errors

### Step 1: Check Convex Logs

```bash
# Open terminal and watch logs
npx convex dev --tail-logs
```

Then trigger a test webhook from Stripe Dashboard to see the actual error.

### Step 2: Verify Webhook Secret

The webhook secret should be configured in your Convex environment:

```bash
# Check if it's set
npx convex env get STRIPE_AI_WEBHOOK_SECRET
```

If not set:
```bash
# Get secret from Stripe Dashboard → Developers → Webhooks
npx convex env set STRIPE_AI_WEBHOOK_SECRET "whsec_..."
```

### Step 3: Verify Stripe Webhook Configuration

1. Go to: https://dashboard.stripe.com/webhooks
2. Find your webhook endpoint
3. Check these events are enabled:
   - ✅ `customer.subscription.created`
   - ✅ `customer.subscription.updated`
   - ✅ `customer.subscription.deleted`
   - ✅ `invoice.payment_succeeded`
   - ✅ `invoice.payment_failed`

4. **Endpoint URL must be**:
   ```
   https://aromatic-akita-723.convex.cloud/stripe-ai-webhooks
   ```

### Step 4: Test Webhook Manually

From Stripe Dashboard → Webhooks → Your webhook → "Send test webhook":

1. Select event: `customer.subscription.created`
2. Click "Send test webhook"
3. Watch Convex logs for errors

---

## 🐛 Common Issues

### Issue 1: organizationId Not Found
```
Error: No organizationId in subscription metadata
```

**Solution**: When creating checkout session, ensure metadata includes organizationId:

```typescript
// convex/stripe/aiCheckout.ts
const session = await stripe.checkout.sessions.create({
  // ...
  subscription_data: {
    metadata: {
      organizationId: args.organizationId,  // ✅ Must be here!
      tier: args.tier,
    },
  },
});
```

### Issue 2: Webhook Secret Mismatch
```
Error: Invalid signature
```

**Solution**: Use the webhook-specific secret, not your API key:

```typescript
// ❌ Wrong - This is your API key
const secret = "sk_test_...";

// ✅ Correct - This is your webhook secret
const secret = "whsec_...";
```

### Issue 3: Database Schema Mismatch
```
Error: Field 'tier' is required but not provided
```

**Solution**: Ensure all required fields are provided to upsertSubscriptionFromStripe:

```typescript
await ctx.runMutation(internal.ai.billing.upsertSubscriptionFromStripeInternal, {
  organizationId: organizationId as any,
  stripeSubscriptionId: id,
  stripeCustomerId: customer,
  stripePriceId: priceId,
  status: status,
  tier: tier,                    // ✅ Required
  privateLLMTier: privateLLMTier,
  currentPeriodStart: current_period_start * 1000,
  currentPeriodEnd: current_period_end * 1000,
  cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
  canceledAt: subscription.canceled_at ? subscription.canceled_at * 1000 : undefined,
  priceInCents: amount,
  currency: currency,
  includedTokensTotal: includedTokensTotal,
});
```

---

## 📍 Key File Locations

| File | Purpose | Line |
|------|---------|------|
| [convex/http.ts](convex/http.ts#L165) | Webhook endpoint registration | L165 |
| [convex/stripe/aiWebhooks.ts](convex/stripe/aiWebhooks.ts) | Webhook event handlers | All |
| [convex/ai/billing.ts](convex/ai/billing.ts#L186) | Subscription data mutations | L186-L267 |
| [convex/schemas/aiBillingSchemas.ts](convex/schemas/aiBillingSchemas.ts#L119) | Database schema definition | L119-L217 |

---

## 🎯 Next Steps

1. **Fix the 502 error**: Check Convex logs to see what's throwing
2. **Fix the 404 error**: Verify webhook endpoint is registered in Stripe
3. **Verify data**: Query `aiSubscriptions` table to see if subscription was saved
4. **Test again**: Create a new test subscription and watch the logs

---

## 📞 Need Help?

If the issue persists:

1. **Check Convex Dashboard logs**: https://dashboard.convex.dev/
2. **Check Stripe webhook logs**: https://dashboard.stripe.com/webhooks
3. **Compare webhook events**: Match Stripe webhook IDs with Convex logs
