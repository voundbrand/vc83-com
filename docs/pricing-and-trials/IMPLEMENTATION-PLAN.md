# Community Tier & Trial Implementation Plan

**Version:** 1.0
**Date:** December 17, 2025
**Goal:** Integrate Community tier (€9/mo) with 14-day trials into platform onboarding and tier configuration

---

## Overview

This implementation adds:
1. **Community tier** (€9/mo) - Free platform features + Skool community access
2. **14-day trials** for all paid tiers (Community, Starter, Professional, Agency, Enterprise)
3. **Updated tier configs** to reflect Community tier as separate from Free
4. **Enhanced onboarding** to handle Community subscriptions

### Key Architectural Decisions

- **Community is NOT a platform tier** - It's Free tier + community add-on subscription
- **Skool integration** - Platform-first: we own the customer, Skool is content delivery
- **Trial handling** - Stripe manages trials at price level, not in metadata
- **No existing customers** - Safe to use new trial prices for all signups

---

## Phase 1: Update Tier Configuration System ✅ PRIORITY

**Goal:** Add Community tier to licensing configuration with proper limits and features

### Tasks

#### 1.1 Add Community Tier to tierConfigs.ts

**File:** `convex/licensing/tierConfigs.ts`

**Changes:**
- [ ] Create `COMMUNITY_TIER` constant with configuration
- [ ] Add to `TIER_CONFIGS` export object
- [ ] Update `getTierConfig()` type signatures
- [ ] Update `TIER_ORDER` in platformCheckout.ts (already done ✅)

**Community Tier Spec:**
```typescript
export const COMMUNITY_TIER: TierConfig = {
  name: "Community",
  description: "€9/month - Skool community + Free platform features",
  priceInCents: 900,
  currency: "EUR",
  supportLevel: "docs",

  limits: {
    // Same as Free tier (100 contacts, 1 user, etc.)
    maxUsers: 1,
    maxContacts: 100,
    // ... all Free tier limits
  },

  features: {
    // Same as Free tier features
    // NO additional platform features beyond Free
    // Community access is metadata flag, not a feature flag
  },
};
```

**Special Fields:**
- `communityAccess: true` (metadata flag, not in TierLimits)
- All other limits identical to Free tier

#### 1.2 Update Type Definitions

**Files to update:**
- `convex/licensing/tierConfigs.ts` - Add "community" to union types
- `convex/stripe/platformCheckout.ts` - Already done ✅
- `convex/stripe/stripePrices.ts` - Already done ✅

---

## Phase 2: Database Schema Updates

**Goal:** Store community subscription state separately from platform tier

### Tasks

#### 2.1 Add Community Subscription to Users Schema

**File:** `convex/schema.ts`

**Add to users table:**
```typescript
users: defineTable({
  // ... existing fields

  // NEW: Community subscription (add-on)
  communitySubscription: v.optional(v.object({
    active: v.boolean(),
    stripeSubscriptionId: v.optional(v.string()),
    stripeCustomerId: v.optional(v.string()),
    startedAt: v.optional(v.number()),
    canceledAt: v.optional(v.number()),
    currentPeriodEnd: v.optional(v.number()),
    skoolInviteSent: v.optional(v.boolean()),
    skoolInviteSentAt: v.optional(v.number()),
    billingPeriod: v.optional(v.union(v.literal("monthly"), v.literal("annual"))),
  })),
})
```

**Key insight:** This is stored on `users` table, not `organizations` table, because:
- Community access is personal (1 user per subscription)
- If user belongs to multiple orgs, community access follows the user
- Platform tier is organization-level, community is user-level

#### 2.2 Add Community Access Flag to Organizations

**File:** `convex/schema.ts`

**Add to organizations table (optional):**
```typescript
organizations: defineTable({
  // ... existing fields

  // Community access included in Starter+ tiers
  hasCommunityAccess: v.optional(v.boolean()),
  communityAccessGrantedAt: v.optional(v.number()),
})
```

**Why:** Starter+ tiers include Community access (€9 value). Track this separately from individual Community subscriptions.

---

## Phase 3: Stripe Integration Updates ✅ PARTIALLY DONE

**Goal:** Handle Community tier subscriptions via Stripe webhooks

### Tasks

#### 3.1 Update Environment Variables ✅ DONE

**Files:**
- `stripe-price-ids-clean.env` - Created ✅
- `.env.local` - User will update
- Convex deployment env vars - User will update

**Variables added:**
```bash
STRIPE_COMMUNITY_MO_PRICE_ID=price_1SfJQeEEbynvhkixAaECDaeA
STRIPE_COMMUNITY_YR_PRICE_ID=price_1SfJQfEEbynvhkixmZiVq8eo
```

#### 3.2 Update Price Fetching ✅ DONE

**File:** `convex/stripe/stripePrices.ts`

**Changes completed:**
- [x] Added Community price IDs to `PRICE_IDS` mapping
- [x] Updated `getAllPrices()` to fetch Community prices
- [x] Updated `getPlatformPrices()` to fetch Community prices

#### 3.3 Update Platform Checkout ✅ DONE

**File:** `convex/stripe/platformCheckout.ts`

**Changes completed:**
- [x] Added Community to `TIER_PRICE_IDS`
- [x] Added `v.literal("community")` to tier union types
- [x] Updated `TIER_ORDER` hierarchy (community: 1, between free and starter)
- [x] Added Community to upgrade/downgrade logic

#### 3.4 Update Stripe Webhooks

**File:** `convex/stripe/webhooks.ts` or similar

**Handle Community subscriptions:**
- [ ] In `customer.subscription.created` - Create community subscription record
- [ ] In `customer.subscription.updated` - Update community subscription state
- [ ] In `customer.subscription.deleted` - Mark community subscription as canceled
- [ ] In `invoice.paid` - Confirm recurring community payment
- [ ] In `checkout.session.completed` - Process new Community signups

**Special handling:**
```typescript
// Check if this is a Community subscription
if (metadata.plan_tier === 'community') {
  // Update user.communitySubscription
  // NOT organization.plan (stays "free")
  // Send Skool invite email
}

// Check if this is Starter+ (includes Community)
if (['starter', 'professional', 'agency', 'enterprise'].includes(metadata.plan_tier)) {
  // Set organization.plan to metadata.plan_tier
  // ALSO grant Community access: organization.hasCommunityAccess = true
  // Send Skool invite email
}
```

---

## Phase 4: Onboarding Flow Updates

**Goal:** Enable Community tier signup and integrate with existing onboarding

### Tasks

#### 4.1 Create Community Signup Action

**File:** `convex/onboarding.ts`

**Add new export:**
```typescript
export const signupCommunityAccount = action({
  args: {
    email: v.string(),
    password: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    billingPeriod: v.union(v.literal("monthly"), v.literal("annual")),
    organizationName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // 1. Hash password
    // 2. Create user + organization (Free tier)
    // 3. Create Stripe Checkout session for Community subscription
    // 4. Return checkout URL
  },
});
```

**Key difference from `signupFreeAccount`:**
- Creates Free tier account (100 contacts, 1 user)
- Does NOT create Community subscription yet (Stripe does this)
- Returns Stripe Checkout URL instead of API key
- Webhook handles subscription creation after payment

#### 4.2 Update Manual Onboarding (Quick Start)

**File:** `convex/manualOnboarding.ts`

**Changes:**
- [ ] Add check: If user has `communitySubscription.active = true`, grant access to community features
- [ ] Update `applyQuickStart()` to check Community access
- [ ] Provision Community-specific content if applicable

**Current state:** Already provisions apps and Freelancer Portal template. Community doesn't change this.

#### 4.3 Update Welcome Email

**File:** `convex/actions/welcomeEmail.ts` or similar

**Add Skool invitation logic:**
```typescript
// If user has Community access
if (user.communitySubscription?.active || org.hasCommunityAccess) {
  email.body += `
    🎓 Join our Private Community:
    ${process.env.SKOOL_COMMUNITY_URL}

    Get access to:
    - Foundations Course
    - Templates Library
    - Weekly Live Calls
    - Private Skool Group
  `;

  // Mark Skool invite as sent
  await ctx.runMutation(internal.users.markSkoolInviteSent, { userId });
}
```

---

## Phase 5: Frontend Updates

**Goal:** Display Community tier in pricing and allow signup

### Tasks

#### 5.1 Update Pricing Page

**Files:**
- `src/app/pricing/page.tsx` or similar
- `src/components/pricing/PricingCard.tsx` or similar

**Add Community tier card:**
```typescript
{
  name: "Community",
  price: "€9",
  period: "/month",
  description: "Skool community + Free platform features",
  features: [
    "All Free tier features",
    "Foundations Course",
    "Templates Library",
    "Weekly Live Calls",
    "Private Skool Group",
    "Early Access Features",
  ],
  cta: "Start 14-Day Trial",
  popular: false,
}
```

**Order:** Free → **Community** → Starter → Professional → Agency → Enterprise

#### 5.2 Create Community Signup Flow

**File:** `src/app/signup/community/page.tsx` (new)

**Flow:**
1. User enters email, password, name
2. Select billing period (monthly/annual)
3. Call `signupCommunityAccount` action
4. Redirect to Stripe Checkout
5. After payment, redirect to success page
6. Webhook creates subscription + sends Skool invite

#### 5.3 Update Dashboard UI

**File:** `src/app/dashboard/page.tsx` or similar

**Show Community status:**
```typescript
{user.communitySubscription?.active && (
  <Badge variant="success">
    🎓 Community Member
  </Badge>
)}
```

**Link to Skool:**
```typescript
{(user.communitySubscription?.active || org.hasCommunityAccess) && (
  <Card>
    <h3>Community Access</h3>
    <p>Join our private Skool community</p>
    <Button href={SKOOL_COMMUNITY_URL} target="_blank">
      Open Skool Community →
    </Button>
  </Card>
)}
```

---

## Phase 6: Licensing Enforcement

**Goal:** Enforce Community access in license checks

### Tasks

#### 6.1 Update License Enforcement

**File:** `convex/licensing/enforcement.ts` or similar

**Add Community access check:**
```typescript
export function hasCommunityAccess(
  user: UserDoc,
  org: OrganizationDoc
): boolean {
  // Individual Community subscription
  if (user.communitySubscription?.active) {
    return true;
  }

  // Included in Starter+ tiers
  if (org.hasCommunityAccess) {
    return true;
  }

  return false;
}
```

**Use in gating:**
```typescript
// When checking access to community resources
if (!hasCommunityAccess(user, org)) {
  throw new ConvexError({
    code: "COMMUNITY_ACCESS_REQUIRED",
    message: "Community subscription required",
  });
}
```

#### 6.2 Update Tier Comparison Logic

**File:** `convex/licensing/tierHelpers.ts` or similar

**Handle Community tier:**
```typescript
// Community is between Free and Starter
function compareTiers(tierA: string, tierB: string): number {
  const order = {
    free: 0,
    community: 1,  // NEW
    starter: 2,
    professional: 3,
    agency: 4,
    enterprise: 5,
  };

  return order[tierA] - order[tierB];
}
```

**Important:** Community has same platform limits as Free, but includes community content access.

---

## Phase 7: Email Notifications

**Goal:** Send proper emails for Community subscription lifecycle

### Tasks

#### 7.1 Welcome Email (After Payment)

**File:** `convex/actions/communityWelcomeEmail.ts` (new)

**Triggered by:** `checkout.session.completed` webhook

**Content:**
```
Subject: Welcome to the l4yercak3 Community! 🎉

Hi {firstName},

Welcome to the l4yercak3 Community!

Your 14-day trial has started. Here's what you get:

🎓 Foundations Course - Learn the platform from scratch
📚 Templates Library - Pre-built solutions you can deploy
📞 Weekly Live Calls - Ask questions and get help
💬 Private Skool Group - Connect with other founders

🔗 Join the Skool Community:
{SKOOL_COMMUNITY_URL}

🔑 Access Your Platform Account:
{PLATFORM_URL}/login
Email: {email}

Questions? Reply to this email!

- The l4yercak3 Team
```

#### 7.2 Trial Ending Email

**Triggered by:** `customer.subscription.trial_will_end` webhook (3 days before)

**Content:**
```
Subject: Your trial ends in 3 days

Hi {firstName},

Your 14-day trial of l4yercak3 Community ends in 3 days.

To keep access to:
- Foundations Course
- Templates Library
- Weekly Live Calls
- Private Skool Group

Your subscription will automatically renew at €9/month on {renewalDate}.

Want to upgrade? Check out our paid plans:
{PLATFORM_URL}/pricing

Want to cancel? Manage your subscription:
{STRIPE_PORTAL_URL}

- The l4yercak3 Team
```

#### 7.3 Cancellation Email

**Triggered by:** `customer.subscription.deleted` webhook

**Content:**
```
Subject: Sorry to see you go

Hi {firstName},

Your Community subscription has been canceled.

You still have your Free platform account with:
- 100 contacts
- 1 user
- Basic features

Ready to come back? Rejoin anytime:
{PLATFORM_URL}/pricing

- The l4yercak3 Team
```

---

## Phase 8: Testing & Validation

**Goal:** Ensure all flows work correctly

### Tasks

#### 8.1 Test Free Signup (No Changes)

- [ ] User signs up for Free tier
- [ ] Gets Free platform account (100 contacts, 1 user)
- [ ] No Community access
- [ ] Can upgrade to Community or paid tiers

#### 8.2 Test Community Signup

- [ ] User signs up for Community tier
- [ ] Redirects to Stripe Checkout
- [ ] Enters payment info
- [ ] Trial starts (14 days, no charge)
- [ ] Webhook creates `user.communitySubscription`
- [ ] User receives welcome email with Skool link
- [ ] User can access platform (Free tier limits)
- [ ] User receives Skool invite

#### 8.3 Test Community Cancellation

- [ ] User cancels Community subscription via Stripe portal
- [ ] Webhook marks `communitySubscription.active = false`
- [ ] User receives cancellation email
- [ ] User keeps Free platform account
- [ ] User loses Community badge/link in dashboard

#### 8.4 Test Starter+ Signup (Includes Community)

- [ ] User signs up for Starter tier (€199/mo)
- [ ] Webhook sets `organization.plan = "starter"`
- [ ] Webhook sets `organization.hasCommunityAccess = true`
- [ ] User receives welcome email with Skool link
- [ ] User gets Starter platform features + Community access

#### 8.5 Test Upgrade Path

- [ ] Free user upgrades to Community (€9/mo)
- [ ] Community user upgrades to Starter (€199/mo)
- [ ] Starter user downgrades to Community (€9/mo)
- [ ] Community user downgrades to Free (€0)

---

## Phase 9: Documentation

**Goal:** Document the Community tier for support and development

### Tasks

#### 9.1 Update Internal Docs

- [ ] Update `docs/pricing-and-trials/STRIPE-CONFIGURATION.md` ✅ (already done)
- [ ] Create `docs/community/OVERVIEW.md`
- [ ] Create `docs/community/USER-FLOWS.md`
- [ ] Update `docs/onboarding/SIGNUP-FLOWS.md`

#### 9.2 Update User-Facing Docs

- [ ] Update pricing page copy
- [ ] Create Community FAQ
- [ ] Update cancellation policy
- [ ] Document Skool integration

---

## Phase 10: Deployment

**Goal:** Roll out to production safely

### Tasks

#### 10.1 Pre-Deployment Checklist

- [ ] All TypeScript compiles without errors (`npm run typecheck`)
- [ ] All linting passes (`npm run lint`)
- [ ] All tests pass (`npm test`)
- [ ] Stripe products created in test mode
- [ ] Webhooks tested in test mode
- [ ] Community tier tested end-to-end in staging

#### 10.2 Production Deployment

- [ ] Create Stripe products in LIVE mode (use `scripts/create-stripe-products.sh --execute`)
- [ ] Update production environment variables
- [ ] Deploy Convex backend (`npx convex deploy`)
- [ ] Deploy frontend (`npm run build && vercel --prod`)
- [ ] Verify webhook endpoint in Stripe dashboard
- [ ] Test one Community signup in production

#### 10.3 Post-Deployment

- [ ] Monitor Stripe webhooks for errors
- [ ] Monitor Convex logs for Community subscription events
- [ ] Check welcome emails are sending
- [ ] Verify Skool invites are working
- [ ] Monitor cancellation flow

---

## Rollback Plan

If issues occur:

1. **Immediate:** Disable Community tier in frontend (hide pricing card)
2. **Backend:** Keep webhook handlers (don't break existing Community users)
3. **Stripe:** Archive Community product (don't delete - keeps history)
4. **Rollback:** Deploy previous frontend version
5. **Investigation:** Check Convex logs, Stripe dashboard, user reports

---

## Success Metrics

Track these after launch:

- Community signups per week
- Trial → paid conversion rate (target: >40%)
- Community cancellation rate (target: <5% monthly churn)
- Free → Community upgrade rate
- Community → Starter upgrade rate
- Average time to Skool group join
- Welcome email open rate

---

## Timeline Estimate

| Phase | Estimated Time | Priority |
|-------|----------------|----------|
| Phase 1: Tier Configs | 1 hour | 🔴 Critical |
| Phase 2: Database Schema | 30 minutes | 🔴 Critical |
| Phase 3: Stripe Integration | 2 hours | 🔴 Critical |
| Phase 4: Onboarding | 3 hours | 🔴 Critical |
| Phase 5: Frontend | 4 hours | 🟡 Important |
| Phase 6: Licensing | 1 hour | 🟡 Important |
| Phase 7: Emails | 2 hours | 🟡 Important |
| Phase 8: Testing | 3 hours | 🔴 Critical |
| Phase 9: Documentation | 1 hour | 🟢 Nice to have |
| Phase 10: Deployment | 1 hour | 🔴 Critical |

**Total:** ~18-20 hours of focused development

---

## Next Steps

Start with **Phase 1** (Update Tier Configuration System) as it's foundational for all other phases.

**Ready to begin?** Let's start with Phase 1, Task 1.1: Adding Community tier to `tierConfigs.ts`.
