# AI Features Billing Architecture

## Overview

This document outlines the billing and subscription architecture for AI features in l4yercak3.com. The system supports two billing modes:

1. **Platform API Key Mode** (Reseller): Organizations use the platform's OpenRouter API key and are charged via Stripe subscription
2. **Bring Your Own Key (BYOK) Mode**: Organizations provide their own OpenRouter API key and are billed directly by OpenRouter

## Integration with Existing Stripe System

l4yercak3 already has a comprehensive Stripe Connect integration for payment processing. The AI billing system extends this by adding:

- **Stripe Subscriptions** for AI access (separate from Stripe Connect)
- **Usage-Based Metering** for platform API key mode
- **Budget Enforcement** to prevent runaway costs

### Key Distinction: Two Stripe Integrations

1. **Stripe Connect** (`convex/stripeConnect.ts`, `convex/paymentProviders/stripe.ts`):
   - Organizations connect their own Stripe accounts
   - Used for accepting payments from their customers
   - Stored in `organizations.paymentProviders` array
   - Account ID format: `acct_xxx`

2. **Stripe Subscriptions** (NEW - for AI billing):
   - Platform charges organizations for AI usage
   - Uses platform's Stripe account
   - Stored in `organizations.stripeCustomerId`
   - Customer ID format: `cus_xxx`
   - Separate from Connect integration

## Billing Models

### 1. Platform API Key Mode (Reseller Model)

**How it Works:**
- Organization uses platform's OpenRouter API key
- Platform pays OpenRouter for all API calls
- Platform charges organization via Stripe subscription + usage metering
- Budget controls are **enforced** (requests blocked when exceeded)

**Pricing Structure:**
```typescript
{
  baseSubscription: {
    name: "AI Features - Platform Key",
    monthlyFee: 29.00,  // Base access fee
    includedCredits: 10.00,  // $10 worth of AI usage included
    overage: "metered"  // Additional usage charged per-dollar spent
  },

  usageMetering: {
    unit: "dollar_spent",  // Metered in dollars of OpenRouter cost
    pricePerUnit: 1.50,    // $1.50 charge for every $1 of OpenRouter cost (50% markup)
    reportingInterval: "daily"  // Usage reported to Stripe daily
  },

  budgetEnforcement: {
    monthlyLimit: 100.00,  // Default $100/month budget
    blockOnExceed: true,   // Block requests when budget exceeded
    alertThresholds: [50, 75, 90, 100]  // Send alerts at these percentages
  }
}
```

**Revenue Model:**
- $29/month base subscription (includes $10 usage)
- Additional usage charged at $1.50 per $1 of OpenRouter cost
- Example: Organization uses $50 of OpenRouter credits
  - Base: $29 (includes $10)
  - Overage: $40 × $1.50 = $60
  - Total monthly charge: $89

### 2. Bring Your Own Key (BYOK) Mode

**How it Works:**
- Organization provides their own OpenRouter API key
- OpenRouter charges organization directly
- Platform provides AI features for free (or minimal subscription fee)
- Budget controls are **informational only** (no blocking)

**Pricing Structure:**
```typescript
{
  baseSubscription: {
    name: "AI Features - BYOK",
    monthlyFee: 0.00,  // Free (or $9/month for support)
    includedCredits: 0,
    overage: "none"  // Organization pays OpenRouter directly
  },

  usageTracking: {
    enabled: true,  // Still track for UI display
    enforced: false,  // No blocking
    purpose: "informational"  // Just show spend in dashboard
  },

  budgetMonitoring: {
    monthlyLimit: undefined,  // Optional, for tracking only
    blockOnExceed: false,  // Never block BYOK users
    alertThresholds: [50, 75, 90, 100]  // Still send informational alerts
  }
}
```

**Revenue Model:**
- Free tier (or minimal $9/month support fee)
- Organization pays OpenRouter directly for all AI usage
- Platform focuses on making AI integration easy, not reselling

## Database Schema

### New Table: `aiUsage`

Tracks AI usage for billing and monitoring purposes.

```typescript
export const aiUsage = defineTable({
  // Identification
  organizationId: v.id("organizations"),
  userId: v.optional(v.id("users")),  // User who made the request

  // Billing period tracking
  periodStart: v.number(),  // Unix timestamp (start of current billing month)
  periodEnd: v.number(),    // Unix timestamp (end of current billing month)

  // Usage metrics
  requestCount: v.number(),      // Number of AI requests this period
  tokenCount: v.number(),        // Total tokens used this period
  costInCents: v.number(),       // Total cost in cents ($1.00 = 100 cents)

  // Request details (for breakdown)
  requestType: v.union(
    v.literal("chat"),           // AI chat message
    v.literal("embedding"),      // Vector embedding
    v.literal("completion")      // Text completion
  ),

  // Provider info
  provider: v.string(),          // "anthropic", "openai", etc.
  model: v.string(),             // "claude-3-5-sonnet", etc.

  // Billing mode at time of request
  billingMode: v.union(
    v.literal("platform"),       // Using platform API key
    v.literal("byok")            // Using org's own API key
  ),

  // Timestamps
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_organization", ["organizationId"])
  .index("by_period", ["organizationId", "periodStart", "periodEnd"])
  .index("by_billing_mode", ["organizationId", "billingMode"]);
```

### New Table: `aiSubscriptions`

Tracks Stripe subscription status for AI features.

```typescript
export const aiSubscriptions = defineTable({
  // Identification
  organizationId: v.id("organizations"),

  // Stripe subscription details
  stripeSubscriptionId: v.string(),  // sub_xxx
  stripeCustomerId: v.string(),      // cus_xxx (same as organizations.stripeCustomerId)
  stripePriceId: v.string(),         // price_xxx (base subscription price)

  // Subscription status
  status: v.union(
    v.literal("active"),        // Subscription active and paid
    v.literal("trialing"),      // In trial period
    v.literal("past_due"),      // Payment failed, grace period
    v.literal("canceled"),      // Subscription canceled
    v.literal("unpaid")         // Payment failed, no grace period
  ),

  // Billing mode
  billingMode: v.union(
    v.literal("platform"),      // Platform API key mode
    v.literal("byok")           // Bring your own key mode
  ),

  // Plan details
  planName: v.string(),         // "AI Features - Platform Key"
  monthlyFee: v.number(),       // Base monthly fee in cents
  includedCredits: v.number(),  // Included usage in cents

  // Current billing period
  currentPeriodStart: v.number(),
  currentPeriodEnd: v.number(),

  // Usage tracking
  currentPeriodUsage: v.number(),   // Total usage this period in cents
  currentPeriodOverage: v.number(), // Overage amount in cents

  // Trial info
  trialStart: v.optional(v.number()),
  trialEnd: v.optional(v.number()),

  // Cancellation
  cancelAtPeriodEnd: v.boolean(),
  canceledAt: v.optional(v.number()),

  // Timestamps
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_organization", ["organizationId"])
  .index("by_stripe_subscription", ["stripeSubscriptionId"])
  .index("by_stripe_customer", ["stripeCustomerId"])
  .index("by_status", ["status"])
  .index("by_billing_mode", ["billingMode"]);
```

### Updates to Existing Tables

#### `organizations` table

Already has the necessary fields:
- `stripeCustomerId` - Stripe customer ID for platform billing (already exists!)
- `paymentProviders` - Array of connected payment providers (for Stripe Connect, separate)

No schema changes needed!

#### `aiSettings` table (in objects)

Already has the necessary fields:
- `llm.openrouterApiKey` - Org's own API key (BYOK mode)
- `monthlyBudgetUsd` - Monthly spending limit
- No schema changes needed!

## Stripe Product Configuration

### Products to Create in Stripe Dashboard

#### 1. Platform Key Subscription

```typescript
{
  name: "AI Features - Platform API Key",
  description: "AI-powered features using platform API key with usage-based billing",
  type: "service",

  prices: [
    {
      id: "price_ai_platform_base",
      nickname: "Base Subscription",
      type: "recurring",
      recurring: {
        interval: "month",
        usage_type: "licensed"  // Fixed monthly fee
      },
      currency: "usd",
      unit_amount: 2900,  // $29.00
      metadata: {
        included_credits: "1000",  // $10.00 included
        plan_type: "platform"
      }
    },
    {
      id: "price_ai_platform_usage",
      nickname: "Overage Usage",
      type: "recurring",
      recurring: {
        interval: "month",
        usage_type: "metered",  // Usage-based billing
        aggregate_usage: "sum"
      },
      currency: "usd",
      unit_amount: 150,  // $1.50 per unit
      billing_scheme: "per_unit",
      metadata: {
        unit_description: "dollar_of_openrouter_cost",
        markup_percentage: "50"
      }
    }
  ]
}
```

#### 2. BYOK Subscription (Optional)

```typescript
{
  name: "AI Features - Bring Your Own Key",
  description: "AI features using your own OpenRouter API key (free tier)",
  type: "service",

  prices: [
    {
      id: "price_ai_byok_free",
      nickname: "BYOK Free Tier",
      type: "recurring",
      recurring: {
        interval: "month",
        usage_type: "licensed"
      },
      currency: "usd",
      unit_amount: 0,  // Free
      metadata: {
        plan_type: "byok"
      }
    }
  ]
}
```

OR charge minimal support fee:

```typescript
{
  prices: [
    {
      id: "price_ai_byok_support",
      nickname: "BYOK Support Plan",
      type: "recurring",
      recurring: {
        interval: "month",
        usage_type: "licensed"
      },
      currency: "usd",
      unit_amount: 900,  // $9.00/month
      metadata: {
        plan_type: "byok",
        includes: "priority_support,advanced_features"
      }
    }
  ]
}
```

## Implementation Flow

### 1. Subscription Creation Flow

**User Journey:**
1. User enables AI features in Manage → AI Settings tab
2. System checks if organization has active AI subscription
3. If no subscription:
   - Show billing setup modal
   - User selects billing mode (Platform Key vs BYOK)
   - User provides payment method (if Platform Key mode)
   - System creates Stripe customer (if doesn't exist)
   - System creates Stripe subscription
   - System stores subscription details in `aiSubscriptions` table
4. If subscription exists but inactive:
   - Show reactivation flow
   - Update payment method if needed
   - Resume subscription

**Backend Flow:**
```typescript
// In convex/aiSubscriptions.ts

export const createAISubscription = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    billingMode: v.union(v.literal("platform"), v.literal("byok")),
    paymentMethodId: v.optional(v.string()),  // Stripe payment method ID
  },
  handler: async (ctx, args) => {
    // 1. Validate session and permissions
    // 2. Get or create Stripe customer
    // 3. Create Stripe subscription with appropriate price
    // 4. Store subscription in aiSubscriptions table
    // 5. Enable AI features in aiSettings
  }
});
```

### 2. Usage Tracking Flow

**For Platform Key Mode:**

```typescript
// In convex/ai/chat.ts (EXISTING FILE - ADD TO IT)

// After each OpenRouter API call:
const cost = calculateCost(response.usage);

// Record usage
await ctx.db.insert("aiUsage", {
  organizationId,
  userId: session.userId,
  periodStart: getCurrentPeriodStart(),
  periodEnd: getCurrentPeriodEnd(),
  requestCount: 1,
  tokenCount: response.usage.total_tokens,
  costInCents: cost,
  requestType: "chat",
  provider: settings.llm.provider,
  model: settings.llm.model,
  billingMode: "platform",
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

// Report to Stripe (daily batch job)
await reportUsageToStripe(organizationId, cost);
```

**For BYOK Mode:**

```typescript
// Same tracking for display purposes, but:
// - No budget enforcement
// - No Stripe reporting
// - Just store for UI dashboard
```

### 3. Budget Enforcement Flow

**Pre-Request Check (Platform Key Mode Only):**

```typescript
// In convex/ai/chat.ts - BEFORE making OpenRouter call

if (billingMode === "platform") {
  const currentUsage = await getCurrentPeriodUsage(organizationId);
  const budget = settings.monthlyBudgetUsd * 100; // Convert to cents

  if (budget && currentUsage >= budget) {
    throw new Error("Monthly AI budget exceeded. Please increase your budget or upgrade your plan.");
  }

  // Send alerts at thresholds
  const usagePercent = (currentUsage / budget) * 100;
  if ([50, 75, 90].includes(Math.floor(usagePercent))) {
    await sendBudgetAlert(organizationId, usagePercent);
  }
}
```

### 4. Stripe Webhook Handling

**New Webhook Events to Handle:**

```typescript
// In convex/stripeWebhooks.ts - ADD these handlers

// Subscription lifecycle
case "customer.subscription.created":
case "customer.subscription.updated":
case "customer.subscription.deleted":
  await handleAISubscriptionUpdate(event);
  break;

// Payment events
case "invoice.paid":
  await handleAIInvoicePaid(event);
  // Reset monthly usage counters on successful payment
  break;

case "invoice.payment_failed":
  await handleAIPaymentFailed(event);
  // Disable AI features if payment fails
  break;

// Usage reporting acknowledgment
case "billing_portal.session.created":
  // User accessed billing portal
  break;
```

## UI Integration

### 1. AI Settings Tab Enhancement

**Add Billing Status Section:**

```tsx
// In ai-settings-tab.tsx

{/* Billing Status */}
<div className="p-4 border-2" style={{...}}>
  <h3>Subscription Status</h3>

  {subscription ? (
    <div>
      <StatusBadge status={subscription.status} />
      <p>Plan: {subscription.planName}</p>
      <p>Billing Mode: {subscription.billingMode}</p>

      {subscription.billingMode === "platform" && (
        <>
          <p>Current Period Usage: ${currentUsage.toFixed(2)}</p>
          <p>Monthly Budget: ${monthlyBudget.toFixed(2)}</p>
          <ProgressBar
            current={currentUsage}
            max={monthlyBudget}
            thresholds={[50, 75, 90]}
          />
        </>
      )}

      <button onClick={openBillingPortal}>
        Manage Subscription
      </button>
    </div>
  ) : (
    <div>
      <p>AI features not enabled</p>
      <button onClick={openBillingSetup}>
        Enable AI Features
      </button>
    </div>
  )}
</div>
```

### 2. Billing Setup Modal

**New Component: `billing-setup-modal.tsx`**

```tsx
export function BillingSetupModal() {
  return (
    <Modal>
      <h2>Enable AI Features</h2>

      {/* Step 1: Choose Billing Mode */}
      <BillingModeSelector
        modes={["platform", "byok"]}
        selected={billingMode}
        onChange={setBillingMode}
      />

      {/* Step 2: Platform Key Mode - Payment Method */}
      {billingMode === "platform" && (
        <StripePaymentMethodForm
          onComplete={handlePaymentMethodAdded}
        />
      )}

      {/* Step 3: BYOK Mode - API Key Input */}
      {billingMode === "byok" && (
        <OpenRouterAPIKeyInput
          value={apiKey}
          onChange={setApiKey}
        />
      )}

      {/* Step 4: Review and Confirm */}
      <BillingReview
        billingMode={billingMode}
        monthlyFee={getMonthlyFee(billingMode)}
        onConfirm={handleSubscriptionCreate}
      />
    </Modal>
  );
}
```

### 3. Usage Dashboard (Future Enhancement)

**New Tab: Manage → AI Usage**

```tsx
// Show detailed usage analytics
- Daily/weekly/monthly usage charts
- Cost breakdown by model
- Request volume trends
- Budget utilization
- Forecast for end of month
```

## Security Considerations

### 1. API Key Storage

**Platform API Key:**
- Stored in `.env.local` as `OPENROUTER_API_KEY`
- Never exposed to frontend
- Used only in Convex actions

**Organization API Keys:**
- Stored encrypted in `aiSettings.llm.openrouterApiKey`
- Never returned to frontend (use masked display)
- Encrypted at rest in Convex

### 2. Budget Enforcement

**Platform Key Mode:**
- Check budget BEFORE making OpenRouter call
- Atomic check-and-increment to prevent race conditions
- Send alerts before reaching 100%
- Hard block at 100% (or configurable threshold)

**BYOK Mode:**
- No enforcement (organization controls their own spending)
- Still track for informational dashboard
- Send alerts as courtesy

### 3. Subscription Validation

**Before Each AI Request:**
```typescript
const subscription = await getAISubscription(organizationId);

if (!subscription || subscription.status !== "active") {
  throw new Error("AI features require an active subscription");
}

if (subscription.billingMode === "platform") {
  // Check budget
  await enforc Budget(organizationId);
}
```

## Cost Calculations

### OpenRouter Pricing (Example)

Based on OpenRouter's current pricing:

```typescript
// Example costs per 1M tokens
const OPENROUTER_COSTS = {
  "anthropic/claude-3-5-sonnet": {
    input: 3.00,   // $3.00 per 1M input tokens
    output: 15.00  // $15.00 per 1M output tokens
  },
  "openai/gpt-4": {
    input: 30.00,
    output: 60.00
  },
  "openai/gpt-3.5-turbo": {
    input: 0.50,
    output: 1.50
  }
};

function calculateCost(usage: { input_tokens: number, output_tokens: number }, model: string) {
  const pricing = OPENROUTER_COSTS[model];
  const inputCost = (usage.input_tokens / 1000000) * pricing.input;
  const outputCost = (usage.output_tokens / 1000000) * pricing.output;
  return Math.ceil((inputCost + outputCost) * 100); // Return in cents
}
```

### Platform Markup Strategy

**Option 1: Percentage Markup (50%)**
- Platform pays OpenRouter: $1.00
- Platform charges organization: $1.50
- Platform profit: $0.50 (50% margin)

**Option 2: Tiered Pricing**
```typescript
const tiers = [
  { upTo: 50,   markup: 2.00 },  // 100% markup for first $50
  { upTo: 200,  markup: 1.75 },  // 75% markup for $50-$200
  { upTo: 1000, markup: 1.50 },  // 50% markup for $200-$1000
  { upTo: Infinity, markup: 1.25 }  // 25% markup above $1000
];
```

**Option 3: Flat Monthly Fee + Low Markup**
- $29/month base (includes $10 usage)
- 25% markup on overage
- Encourages higher usage

## Migration Plan

### Phase 1: Database Schema (Week 1)
1. Create `aiUsage` table
2. Create `aiSubscriptions` table
3. Update schema migrations

### Phase 2: Stripe Configuration (Week 1)
1. Create Stripe products in dashboard
2. Create price objects for base + usage
3. Configure webhook endpoints
4. Test subscriptions in test mode

### Phase 3: Backend Implementation (Week 2)
1. Implement subscription creation mutations
2. Add usage tracking to AI actions
3. Implement budget enforcement
4. Add Stripe webhook handlers
5. Create usage reporting cron jobs

### Phase 4: Frontend Implementation (Week 2-3)
1. Add billing setup modal
2. Enhance AI Settings tab with subscription status
3. Add payment method management
4. Create usage dashboard
5. Add budget alerts UI

### Phase 5: Testing (Week 3-4)
1. Test subscription lifecycle (create, update, cancel)
2. Test usage tracking and reporting
3. Test budget enforcement
4. Test webhook handling
5. Test both billing modes

### Phase 6: Launch (Week 4)
1. Deploy to production
2. Create Stripe products in live mode
3. Migrate existing AI users (if any)
4. Monitor for issues
5. Collect feedback

## Success Metrics

### Business Metrics
- **AI Subscription Conversion Rate**: % of organizations enabling AI
- **BYOK vs Platform Split**: Ratio of billing modes
- **Average Revenue Per AI User**: Monthly revenue from AI features
- **Churn Rate**: % of AI subscriptions canceled

### Technical Metrics
- **Usage Tracking Accuracy**: Verify costs match OpenRouter bills
- **Budget Enforcement Effectiveness**: % of overages prevented
- **Webhook Processing Success Rate**: % of webhooks processed without errors
- **API Latency Impact**: Measure overhead of usage tracking

### User Experience Metrics
- **Time to Enable AI**: How long setup takes
- **Support Tickets**: Issues with billing or usage
- **Budget Alert Response**: Do users increase budgets before hitting limits?
- **Payment Failure Recovery**: % of failed payments recovered

## Alternative Approaches Considered

### 1. Pure BYOK (No Platform Key Mode)
**Pros:**
- Simpler implementation
- No billing complexity
- No OpenRouter costs for platform

**Cons:**
- Lower revenue opportunity
- Requires all users to have OpenRouter accounts
- Higher barrier to entry

**Decision:** Offer both modes to serve different customer segments

### 2. Prepaid Credits
**Pros:**
- Simpler than usage-based billing
- No risk of overages
- Predictable revenue

**Cons:**
- Less flexible for users
- Requires credit management system
- May have unused credit issues

**Decision:** Use monthly subscription + usage metering instead

### 3. Flat Monthly Unlimited
**Pros:**
- Simplest for users
- Predictable costs
- No usage tracking needed

**Cons:**
- Risk of abuse
- Can't scale pricing with usage
- May lose money on heavy users

**Decision:** Too risky without usage limits

## Conclusion

This architecture provides:
✅ Flexible billing modes (Platform Key vs BYOK)
✅ Budget controls to prevent runaway costs
✅ Usage-based pricing that scales with value
✅ Integration with existing Stripe system
✅ Clear separation between Connect and Subscriptions
✅ Path to profitability on AI features

**Next Steps:**
1. Review and approve this architecture
2. Create Stripe products in test mode
3. Implement database schema
4. Begin backend implementation
