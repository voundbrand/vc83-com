# 14-Day Trial Period Implementation Guide

**Version:** 1.0
**Date:** December 2025
**Purpose:** Add 14-day free trial to ALL pricing tiers including new Community tier

---

## Overview

This document outlines the implementation of a 14-day trial period for all subscription tiers on the l4yercak3 platform.

### Trial Period Applies To:
- **Community:** €9/month (NEW TIER)
- **Starter:** €199/month
- **Professional:** €399/month
- **Agency:** €599/month
- **Enterprise:** €1,500+/month (custom pricing)

### Trial Benefits:
- **Lower barrier to entry** - Users can test the platform risk-free
- **Higher conversion rates** - Users experience value before payment
- **Reduced churn** - Better product-market fit before commitment
- **Competitive advantage** - Most competitors don't offer trials at these price points

---

## Changes Required

### 1. Stripe Product Configuration

For **EACH** existing product (Starter, Professional, Agency, Enterprise), update prices to include trial:

#### Update Process in Stripe Dashboard:

1. Navigate to **Products** → Select product (e.g., "l4yercak3 Starter")
2. Click on **Price** (e.g., "Starter Monthly")
3. Click **"..."** menu → **"Edit price"**
4. Scroll to **Free trial**
5. Set **"Trial period days"** to `14`
6. Save changes
7. Repeat for ALL prices (monthly AND annual)

**Note:** You cannot edit existing prices in Stripe. You must create NEW prices with trials:

```
OLD PRICE:
- Starter Monthly: €199/mo (no trial) → Keep for legacy customers
- ID: price_old_starter_monthly

NEW PRICE:
- Starter Monthly (14-day trial): €199/mo + 14-day trial
- ID: price_new_starter_monthly_trial
```

#### Create New Community Product:

Since Community is a NEW tier, create it from scratch with trial included:

**Product Details:**
```
Name: l4yercak3 Community
Description: Access to courses, templates, and weekly live calls. Platform features included.
Statement Descriptor: L4YERCAK3 COMM
Tax Code: txcd_10103001 (SaaS - business use)
```

**Monthly Price:**
```
Nickname: Community Monthly (14-day trial)
Amount: €9.00
Currency: EUR
Billing Period: Monthly
Trial Period: 14 days
```

**Annual Price:**
```
Nickname: Community Annual (14-day trial)
Amount: €90.00 (save €18 = 2 months free)
Currency: EUR
Billing Period: Yearly
Trial Period: 14 days
```

---

### 2. Community Tier Metadata

Add this metadata to the Community product:

```json
{
  "plan_tier": "community",
  "display_name": "Community",
  "product_type": "community_subscription",

  // Platform features = Same as Free tier
  "platform_tier": "free",
  "max_users": "1",
  "max_api_keys": "1",
  "max_contacts": "100",
  "max_crm_organizations": "10",
  "max_projects": "3",
  "max_events": "3",
  "max_products": "5",
  "max_forms": "3",
  "storage_gb": "0.25",

  // Community-specific features
  "community_access": "true",
  "skool_group_access": "true",
  "courses_access": "true",
  "templates_library_access": "true",
  "weekly_calls_access": "true",

  // Trial configuration
  "trial_days": "14",
  "trial_description": "Full access for 14 days, then €9/month"
}
```

---

### 3. Database Schema Updates

#### Add Trial Tracking Fields

**File:** `convex/schemas/coreSchemas.ts`

```typescript
// Add to organizations table
export const organizationsTable = defineTable({
  // ... existing fields ...

  // Trial tracking
  trialStatus: v.optional(v.union(
    v.literal("active"),
    v.literal("ended"),
    v.literal("converted"),
    v.literal("canceled")
  )),
  trialStartedAt: v.optional(v.number()),
  trialEndsAt: v.optional(v.number()),
  trialPlan: v.optional(v.string()), // Which plan they're trialing

  // Community subscription (separate from platform tier)
  communitySubscription: v.optional(v.object({
    active: v.boolean(),
    stripeSubscriptionId: v.optional(v.string()),
    stripeCustomerId: v.optional(v.string()),
    startedAt: v.optional(v.number()),
    trialEndsAt: v.optional(v.number()),
    canceledAt: v.optional(v.number()),
    skoolInviteSent: v.optional(v.boolean()),
    skoolJoinedAt: v.optional(v.number()),
  })),
});
```

---

### 4. Stripe Webhook Handler Updates

**File:** `convex/stripe/platformWebhooks.ts`

Add handling for trial-related events:

```typescript
// NEW EVENT: Trial Will End (3 days before)
case 'customer.subscription.trial_will_end':
  await handleTrialWillEnd(subscription);
  break;

// UPDATE: Checkout Session Completed
case 'checkout.session.completed':
  const session = event.data.object as Stripe.Checkout.Session;
  const subscription = await stripe.subscriptions.retrieve(
    session.subscription as string
  );

  // Check if subscription is in trial
  if (subscription.status === 'trialing') {
    await handleTrialStarted(subscription, session);
  } else {
    await handleImmediateSubscription(subscription, session);
  }
  break;

// UPDATE: Subscription Updated (trial → active)
case 'customer.subscription.updated':
  const prevAttributes = event.data.previous_attributes;

  // Detect trial → active conversion
  if (prevAttributes.status === 'trialing' &&
      subscription.status === 'active') {
    await handleTrialConverted(subscription);
  }
  break;

// NEW: Handle trial cancellation during trial
case 'customer.subscription.deleted':
  if (subscription.status === 'trialing') {
    await handleTrialCanceled(subscription);
  } else {
    await handleSubscriptionCanceled(subscription);
  }
  break;
```

#### Handler Implementations:

```typescript
async function handleTrialStarted(
  subscription: Stripe.Subscription,
  session: Stripe.Checkout.Session
) {
  const metadata = subscription.metadata;
  const productType = metadata.product_type;

  if (productType === 'community') {
    // Create user account + community subscription
    await createCommunityAccount(session.customer_email, {
      stripeSubscriptionId: subscription.id,
      stripeCustomerId: subscription.customer as string,
      trialEndsAt: subscription.trial_end! * 1000,
      communityAccess: true,
    });

    // Send welcome email with Skool invite
    await sendCommunityTrialWelcomeEmail(session.customer_email, {
      trialEndsAt: new Date(subscription.trial_end! * 1000),
    });
  } else {
    // Platform subscription (Starter, Pro, Agency, Enterprise)
    await createOrUpdateOrganization(metadata.organization_id, {
      plan: metadata.plan_tier,
      trialStatus: 'active',
      trialStartedAt: Date.now(),
      trialEndsAt: subscription.trial_end! * 1000,
      trialPlan: metadata.plan_tier,
    });

    // Send platform trial welcome email
    await sendPlatformTrialWelcomeEmail(metadata.organization_id);
  }
}

async function handleTrialWillEnd(subscription: Stripe.Subscription) {
  const daysRemaining = 3;
  const metadata = subscription.metadata;

  if (metadata.product_type === 'community') {
    await sendCommunityTrialEndingEmail(subscription.customer as string, {
      daysRemaining,
      price: '€9/month',
    });
  } else {
    await sendPlatformTrialEndingEmail(metadata.organization_id, {
      daysRemaining,
      planName: metadata.plan_tier,
    });
  }
}

async function handleTrialConverted(subscription: Stripe.Subscription) {
  const metadata = subscription.metadata;

  if (metadata.product_type === 'community') {
    await updateCommunitySubscription(subscription.customer as string, {
      trialStatus: 'converted',
      paidStartedAt: Date.now(),
    });

    // Send "Thanks for subscribing" email
    await sendCommunityTrialConvertedEmail(subscription.customer as string);
  } else {
    await updateOrganization(metadata.organization_id, {
      trialStatus: 'converted',
      billingStatus: 'active',
    });

    await sendPlatformTrialConvertedEmail(metadata.organization_id);
  }
}

async function handleTrialCanceled(subscription: Stripe.Subscription) {
  const metadata = subscription.metadata;

  if (metadata.product_type === 'community') {
    // User keeps free account, loses community access
    await updateCommunitySubscription(subscription.customer as string, {
      active: false,
      trialStatus: 'canceled',
      canceledAt: Date.now(),
    });

    await sendCommunityTrialCanceledEmail(subscription.customer as string);
  } else {
    // Downgrade to Free tier
    await updateOrganization(metadata.organization_id, {
      plan: 'free',
      trialStatus: 'canceled',
      billingStatus: 'active', // Still active, just on Free
    });

    await sendPlatformTrialCanceledEmail(metadata.organization_id);
  }
}
```

---

### 5. Email Templates

Create email templates for trial lifecycle:

#### A. Trial Started (Welcome)

**Subject:** Welcome to l4yercak3! Your 14-day trial starts now

**Content:**
```
Hi {firstName},

Welcome to l4yercak3! 🎉

Your 14-day trial of {planName} starts today. Here's what you get:

{COMMUNITY TIER:}
✅ Access to Foundations Course
✅ Templates library
✅ Weekly live calls with the community
✅ Private Skool group access
✅ Free platform account (1 user, 100 contacts)

{STARTER/PRO/AGENCY TIER:}
✅ Full platform access with {planFeatures}
✅ AI Assistant included
✅ All features unlocked

📅 Trial ends: {trialEndDate}
💳 First charge: {firstChargeDate} - {price}

Getting started:
1. {COMMUNITY: Join our Skool group →} {skoolInviteLink}
2. Set up your profile → {profileLink}
3. {PLATFORM: Create your first project →} {quickStartLink}

No credit card charged until {firstChargeDate}. Cancel anytime.

Questions? Reply to this email.

— The l4yercak3 Team
```

#### B. Trial Ending (3 Days Before)

**Subject:** Your l4yercak3 trial ends in 3 days

**Content:**
```
Hi {firstName},

Your 14-day trial of {planName} ends in 3 days.

📅 Trial ends: {trialEndDate}
💳 First charge: {firstChargeDate} - {price}

Continue using l4yercak3:
→ No action needed! You'll automatically continue on {planName}.

Want to cancel?
→ Manage subscription: {customerPortalLink}

Want to change plans?
→ View all plans: {pricingLink}

{COMMUNITY: If you cancel, you'll keep your free platform account but lose access to the community.}

— The l4yercak3 Team
```

#### C. Trial Converted (Thank You)

**Subject:** Thank you for subscribing to l4yercak3!

**Content:**
```
Hi {firstName},

Thanks for becoming a paying member! 🎉

Your {planName} subscription is now active:
💳 {price} charged today
📅 Next billing date: {nextBillingDate}

What's next:
{COMMUNITY: Continue enjoying our courses, templates, and weekly calls!}
{PLATFORM: Unlock the full potential of your platform with {planFeatures}.}

Manage subscription: {customerPortalLink}
Need help? {supportLink}

— The l4yercak3 Team
```

#### D. Trial Canceled

**Subject:** Sorry to see you go

**Content:**
```
Hi {firstName},

We've canceled your {planName} trial.

{COMMUNITY:}
You'll keep your free platform account (1 user, 100 contacts), but you'll lose access to:
❌ Skool community group
❌ Foundations Course
❌ Templates library
❌ Weekly live calls

Want to rejoin? → {communitySignupLink}

{PLATFORM:}
Your account has been downgraded to the Free tier:
✅ 1 user
✅ 100 CRM contacts
✅ 3 projects
✅ Basic features

Want to upgrade? → {pricingLink}

— The l4yercak3 Team
```

---

### 6. Frontend Updates

#### Update Pricing Display

**File:** `src/components/pricing/pricing-cards.tsx`

Add trial badge to all tiers:

```tsx
<div className="pricing-card">
  {/* Trial Badge */}
  <div className="trial-badge">
    <span className="badge badge-success">14-day free trial</span>
  </div>

  <h3>{tierName}</h3>
  <div className="price">
    <span className="amount">{price}</span>
    <span className="period">/month</span>
  </div>

  <p className="trial-description">
    Try free for 14 days, then {price}/month. Cancel anytime.
  </p>

  {/* Features list */}
  <ul className="features">
    {features.map(feature => (
      <li key={feature}>{feature}</li>
    ))}
  </ul>

  <button className="cta-button">
    Start 14-day trial
  </button>
</div>
```

#### Update Checkout Flow

**File:** `src/app/signup/community/page.tsx` (NEW)

```tsx
export default function CommunitySignup() {
  return (
    <div className="signup-container">
      <h1>Join the l4yercak3 Community</h1>

      <div className="trial-info">
        <h2>14-day free trial</h2>
        <p>No credit card required until trial ends</p>
      </div>

      <div className="includes">
        <h3>What's included:</h3>
        <ul>
          <li>✅ Foundations Course (full access)</li>
          <li>✅ Templates library</li>
          <li>✅ Weekly live calls</li>
          <li>✅ Private Skool group</li>
          <li>✅ Free platform account (100 contacts)</li>
        </ul>
      </div>

      <div className="pricing-summary">
        <div className="trial-period">
          <span className="days">14 days</span>
          <span className="price">Free</span>
        </div>
        <div className="after-trial">
          <span>Then</span>
          <span className="price">€9/month</span>
        </div>
      </div>

      <form onSubmit={handleSignup}>
        <input type="email" placeholder="Email" required />
        <input type="text" placeholder="First name" required />
        <input type="text" placeholder="Last name" required />

        <button type="submit" className="btn-primary">
          Start 14-day free trial
        </button>
      </form>

      <p className="terms">
        By signing up, you agree to our Terms of Service and Privacy Policy.
        Cancel anytime during your trial without being charged.
      </p>
    </div>
  );
}
```

#### Add Trial Status to Dashboard

**File:** `src/components/dashboard/trial-banner.tsx` (NEW)

```tsx
export function TrialBanner({ organization }) {
  if (organization.trialStatus !== 'active') return null;

  const daysRemaining = Math.ceil(
    (organization.trialEndsAt - Date.now()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div className="trial-banner">
      <div className="trial-info">
        <span className="badge">Trial</span>
        <span className="days-remaining">
          {daysRemaining} days remaining
        </span>
      </div>

      <p>
        You're on a 14-day trial of {organization.plan}.
        First charge on {formatDate(organization.trialEndsAt)}.
      </p>

      <div className="actions">
        <a href="/settings/billing">Manage subscription</a>
      </div>
    </div>
  );
}
```

---

### 7. Billing Management UI

**File:** `src/app/settings/billing/page.tsx`

Update to show trial status:

```tsx
export default function BillingPage() {
  const organization = useOrganization();

  return (
    <div className="billing-page">
      <h1>Billing & Subscription</h1>

      {/* Trial Status */}
      {organization.trialStatus === 'active' && (
        <div className="trial-section">
          <h2>Trial Active</h2>
          <p>
            You're currently on a 14-day trial of {organization.plan}.
          </p>
          <ul>
            <li>Trial started: {formatDate(organization.trialStartedAt)}</li>
            <li>Trial ends: {formatDate(organization.trialEndsAt)}</li>
            <li>First charge: {formatDate(organization.trialEndsAt)}</li>
          </ul>

          <button onClick={() => openCustomerPortal()}>
            Cancel trial
          </button>
        </div>
      )}

      {/* Regular subscription info */}
      {organization.trialStatus !== 'active' && (
        <div className="subscription-section">
          <h2>Current Plan: {organization.plan}</h2>
          {/* ... existing billing info ... */}
        </div>
      )}

      {/* Community Subscription (if applicable) */}
      {organization.communitySubscription?.active && (
        <div className="community-section">
          <h2>Community Access</h2>
          <p>€9/month - Access to courses, templates, and live calls</p>

          {organization.communitySubscription.trialEndsAt && (
            <p className="trial-info">
              Trial ends: {formatDate(organization.communitySubscription.trialEndsAt)}
            </p>
          )}

          <button onClick={() => openCustomerPortal()}>
            Manage community subscription
          </button>
        </div>
      )}
    </div>
  );
}
```

---

### 8. Environment Variables

Add new Community price IDs:

```bash
# Community Tier (NEW)
COMMUNITY_STRIPE_PRICE_MONTHLY=price_xxx
COMMUNITY_STRIPE_PRICE_ANNUAL=price_xxx
COMMUNITY_STRIPE_PRODUCT_ID=prod_xxx

# Updated Platform Tiers (with trials)
STRIPE_PRICE_STARTER_MONTHLY_TRIAL=price_xxx
STRIPE_PRICE_STARTER_ANNUAL_TRIAL=price_xxx
STRIPE_PRICE_PROFESSIONAL_MONTHLY_TRIAL=price_xxx
STRIPE_PRICE_PROFESSIONAL_ANNUAL_TRIAL=price_xxx
STRIPE_PRICE_AGENCY_MONTHLY_TRIAL=price_xxx
STRIPE_PRICE_AGENCY_ANNUAL_TRIAL=price_xxx

# Skool Integration
SKOOL_COMMUNITY_URL=https://skool.com/xxx
SKOOL_WEBHOOK_URL=https://xxx (optional)
```

---

### 9. Update stripePrices.ts

**File:** `convex/stripe/stripePrices.ts`

Add Community tier to price fetching:

```typescript
const PRICE_IDS = {
  // Community (NEW)
  community: {
    monthly: process.env.COMMUNITY_STRIPE_PRICE_MONTHLY,
    annual: process.env.COMMUNITY_STRIPE_PRICE_ANNUAL,
  },

  // Platform Plans (Monthly) - WITH TRIALS
  platformMonthly: {
    free: undefined, // No Stripe product for free
    starter: process.env.STRIPE_PRICE_STARTER_MONTHLY_TRIAL,
    professional: process.env.STRIPE_PRICE_PROFESSIONAL_MONTHLY_TRIAL,
    agency: process.env.STRIPE_PRICE_AGENCY_MONTHLY_TRIAL,
    enterprise: process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY_TRIAL,
  },

  // Platform Plans (Annual) - WITH TRIALS
  platformAnnual: {
    starter: process.env.STRIPE_PRICE_STARTER_ANNUAL_TRIAL,
    professional: process.env.STRIPE_PRICE_PROFESSIONAL_ANNUAL_TRIAL,
    agency: process.env.STRIPE_PRICE_AGENCY_ANNUAL_TRIAL,
    enterprise: process.env.STRIPE_PRICE_ENTERPRISE_ANNUAL_TRIAL,
  },

  // ... rest of pricing structure
};

// Add Community to getAllPrices return
export const getAllPrices = action({
  handler: async () => {
    const stripe = getStripe();

    const [
      // Community
      communityMonthly,
      communityAnnual,
      // ... rest of fetches
    ] = await Promise.all([
      fetchPrice(stripe, PRICE_IDS.community.monthly),
      fetchPrice(stripe, PRICE_IDS.community.annual),
      // ... rest of fetches
    ]);

    return {
      community: {
        monthly: communityMonthly,
        annual: communityAnnual,
      },
      platform: {
        // ... existing structure
      },
      // ... rest of return
    };
  },
});
```

---

### 10. Testing Checklist

#### Stripe Test Mode:

- [ ] Create Community product with trial
- [ ] Create updated Starter/Pro/Agency prices with trial
- [ ] Configure webhook endpoint for trial events
- [ ] Test Community signup flow
- [ ] Test Platform (Starter) signup flow
- [ ] Verify trial started webhook fires
- [ ] Verify trial_will_end webhook fires (use Stripe CLI)
- [ ] Verify trial → active conversion webhook
- [ ] Test trial cancellation
- [ ] Verify emails send correctly
- [ ] Test Skool invite link delivery
- [ ] Verify dashboard shows trial status
- [ ] Test Customer Portal during trial
- [ ] Test upgrade during trial

#### Stripe CLI Commands:

```bash
# Listen to webhooks locally
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Trigger trial_will_end event
stripe trigger customer.subscription.trial_will_end

# Advance time to end trial (test subscription)
stripe subscriptions update sub_xxx --trial_end now
```

---

## Migration Strategy

### For Existing Customers:

**DO NOT FORCE ONTO TRIALS**

Keep existing customers on their current non-trial prices:
- They already paid, don't disrupt them
- Legacy price IDs remain valid
- New signups get trial prices

### Price ID Strategy:

```
LEGACY (keep active):
- price_starter_monthly (no trial)
- price_starter_annual (no trial)

NEW (for new signups):
- price_starter_monthly_trial (14-day trial)
- price_starter_annual_trial (14-day trial)
```

### In Stripe Customer Portal:

Configure "allowed upgrades" to include BOTH legacy and trial prices:
- Legacy → Legacy (for existing customers)
- Trial → Trial (for new customers)
- Block cross-contamination

---

## Launch Plan

### Phase 1: Stripe Setup (Day 1)
- [ ] Create Community product with trials
- [ ] Create new price versions for all tiers with trials
- [ ] Configure webhook events
- [ ] Update environment variables
- [ ] Test in Stripe test mode

### Phase 2: Backend (Day 2-3)
- [ ] Update database schema
- [ ] Implement webhook handlers
- [ ] Create email templates
- [ ] Test locally with Stripe CLI
- [ ] Deploy to staging

### Phase 3: Frontend (Day 4-5)
- [ ] Update pricing page
- [ ] Create Community signup flow
- [ ] Add trial status UI
- [ ] Update billing management
- [ ] Test full user flows

### Phase 4: Skool Setup (Day 6)
- [ ] Create private Skool group
- [ ] Configure invite link
- [ ] Test invite delivery
- [ ] Prepare welcome content

### Phase 5: Testing (Day 7)
- [ ] Complete QA checklist
- [ ] Test all trial scenarios
- [ ] Verify email delivery
- [ ] Test Skool integration
- [ ] Load test checkout flow

### Phase 6: Launch (Day 8)
- [ ] Switch to Stripe live mode
- [ ] Update production environment
- [ ] Deploy frontend changes
- [ ] Monitor webhook logs
- [ ] Announce launch

---

## Success Metrics

Track these KPIs post-launch:

### Trial Metrics:
- Trial signup rate
- Trial → paid conversion rate
- Days to conversion (within trial)
- Trial cancellation rate
- Trial cancellation reasons

### Community Metrics:
- Community signups
- Skool group join rate
- Community engagement (posts, call attendance)
- Community → Platform upgrade rate

### Overall Impact:
- Total signups (before vs after trials)
- Revenue impact (MRR growth)
- Churn rate comparison
- Customer lifetime value

---

## Support & FAQ

### Common Questions:

**Q: What happens if I cancel during the trial?**
A: No charge. You keep your free account (Community members) or downgrade to Free tier (Platform members).

**Q: Can I upgrade during the trial?**
A: Yes! Upgrade anytime through Settings → Billing.

**Q: Will I be notified before I'm charged?**
A: Yes, you'll receive an email 3 days before your trial ends.

**Q: Can I switch from monthly to annual during trial?**
A: Yes, through the Customer Portal or by contacting support.

**Q: What if my payment fails at trial end?**
A: We'll retry 3 times over 7 days. You'll receive email notifications.

---

*Document Version 1.0 — December 2025*
