# Community Tier Guest Checkout with Skool Integration
**External Landing Page → Platform → Skool Community**

**Created:** December 17, 2025
**Status:** Implementation Ready
**Priority:** HIGH - Revenue Critical

---

## 🎯 Overview

This document combines **Guest Checkout** (for external landing pages) with **Community Tier + Skool Integration** to create a seamless onboarding flow.

**User Experience:**
```
Landing Page → Click "Start Trial" → Stripe Checkout → Welcome Email → Set Password + Join Skool → Active Member
```

**Time to first payment: ~2 minutes** ⚡
**Time to Skool access: ~5 minutes** (after email click)

---

## 🏗️ Architecture: Platform-First with Skool Add-On

### Key Principles

✅ **YOU own the customer relationship** (not Skool)
✅ **Community is an add-on** (not a separate platform tier)
✅ **Skool is swappable** (can move to Discord/Circle anytime)
✅ **Payment via YOUR Stripe** (direct revenue)
✅ **Free platform features** + Community access

### What Community Tier Actually Is

```typescript
// Community members get:
organization: {
  plan: "free",  // Same platform limits as Free tier
  communitySubscription: {
    active: true,
    stripeSubscriptionId: "sub_xxx",
    stripeCustomerId: "cus_xxx",
    startedAt: 1705234800000,
    trialEndsAt: 1706444400000,  // 14 days later
    skoolInviteSent: true,
    skoolJoinedAt: null,  // Populated when they join
  }
}
```

**Platform Features (Free Tier):**
- 100 contacts
- 1 user
- 3 projects
- Basic CRM
- 1 API key

**Community Add-On (€9/mo):**
- Foundations Course (on Skool)
- Templates Library (on Skool)
- Weekly Live Calls (link in Skool)
- Private Community Access (Skool)
- Early Access Features (on Platform)

---

## 📐 Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. EXTERNAL LANDING PAGE                                        │
│                                                                  │
│   [Join Community - €9/mo with 14-Day Trial]                    │
│   ↓ JavaScript: fetch('/api/v1/checkout/create-guest-link')     │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. PLATFORM API (vc83.com)                                      │
│                                                                  │
│   POST /api/v1/checkout/create-guest-link                       │
│   Body: { tier: "community", billingPeriod: "monthly" }         │
│   ↓                                                              │
│   Creates Stripe Checkout with:                                 │
│   - €9/mo price                                                  │
│   - 14-day trial                                                 │
│   - metadata: { source: "landing_page", tier: "community" }     │
│   ↓                                                              │
│   Returns: { checkoutUrl: "https://checkout.stripe.com/..." }   │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ↓ Redirect
┌─────────────────────────────────────────────────────────────────┐
│ 3. STRIPE CHECKOUT                                              │
│                                                                  │
│   User enters:                                                   │
│   - Email address                                                │
│   - Payment method (card/Apple Pay/Google Pay)                  │
│   - Billing address                                              │
│   ↓                                                              │
│   Stripe creates:                                                │
│   - Customer (cus_xxx)                                           │
│   - Subscription (sub_xxx) with 14-day trial                    │
│   - Payment Method (saved for future)                           │
│   ↓                                                              │
│   Webhook: checkout.session.completed                           │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ↓ webhook event
┌─────────────────────────────────────────────────────────────────┐
│ 4. PLATFORM WEBHOOK HANDLER (vc83.com/stripe-webhooks)         │
│                                                                  │
│   Detects: metadata.source = "landing_page"                     │
│   Detects: metadata.tier = "community"                          │
│   ↓                                                              │
│   Extracts from Stripe:                                          │
│   - customer_email                                               │
│   - customer_name                                                │
│   - subscription_id                                              │
│   - customer_id                                                  │
│   ↓                                                              │
│   Calls: createCommunityAccountFromStripe()                      │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ↓
┌─────────────────────────────────────────────────────────────────┐
│ 5. ACCOUNT CREATION (Convex Internal Action)                    │
│                                                                  │
│   Creates:                                                       │
│   1. User record                                                 │
│      - email, firstName, lastName                                │
│      - isPasswordSet: false                                      │
│      - defaultOrgId: [org created below]                         │
│                                                                  │
│   2. Organization record                                         │
│      - plan: "free" (FREE platform features!)                    │
│      - stripeCustomerId: cus_xxx                                 │
│      - stripeSubscriptionId: sub_xxx                             │
│      - communitySubscription: {                                  │
│          active: true,                                           │
│          stripeSubscriptionId: sub_xxx,                          │
│          startedAt: now,                                         │
│          trialEndsAt: now + 14 days,                             │
│          skoolInviteSent: false                                  │
│        }                                                         │
│                                                                  │
│   3. Password reset token                                        │
│      - token: random secure string                               │
│      - expiresAt: now + 7 days                                   │
│                                                                  │
│   4. Organization member (user → org relationship)               │
│                                                                  │
│   5. API key (for platform access)                               │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ↓
┌─────────────────────────────────────────────────────────────────┐
│ 6. COMMUNITY WELCOME EMAIL                                      │
│                                                                  │
│   Sent to: customer_email                                        │
│   ↓                                                              │
│   Contains:                                                      │
│   ┌─────────────────────────────────────────────────┐           │
│   │ 🎉 Welcome to l4yercak3 Community!              │           │
│   │                                                  │           │
│   │ Your 14-day trial has started.                  │           │
│   │                                                  │           │
│   │ STEP 1: Set Your Password                       │           │
│   │ [Set Password] ← vc83.com/setup-password?token= │           │
│   │                                                  │           │
│   │ STEP 2: Join Skool Community                    │           │
│   │ [Join Skool] ← https://skool.com/l4yercak3/join │           │
│   │                                                  │           │
│   │ What's included:                                │           │
│   │ ✅ Foundations Course                           │           │
│   │ ✅ Templates Library                            │           │
│   │ ✅ Weekly Live Calls                            │           │
│   │ ✅ Private Community                            │           │
│   │ ✅ Free Platform Account (100 contacts)        │           │
│   └─────────────────────────────────────────────────┘           │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ↓ User clicks "Set Password"
┌─────────────────────────────────────────────────────────────────┐
│ 7. PASSWORD SETUP PAGE (vc83.com/setup-password)               │
│                                                                  │
│   Verifies token (not expired)                                  │
│   ↓                                                              │
│   User enters:                                                   │
│   - New password (min 8 chars)                                  │
│   - Confirm password                                             │
│   ↓                                                              │
│   Platform:                                                      │
│   - Hashes password (bcrypt)                                     │
│   - Updates userPasswords table                                  │
│   - Marks isPasswordSet = true                                   │
│   - Auto-creates session (logs user in)                          │
│   ↓                                                              │
│   Redirects to: /welcome (logged in)                             │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ↓
┌─────────────────────────────────────────────────────────────────┐
│ 8. WELCOME DASHBOARD (vc83.com/welcome)                        │
│                                                                  │
│   Displays:                                                      │
│   ┌─────────────────────────────────────────────────┐           │
│   │ 🎉 Welcome [FirstName]!                         │           │
│   │                                                  │           │
│   │ Your Community trial: 14 days remaining         │           │
│   │                                                  │           │
│   │ ⚠️ Don't forget to join Skool!                  │           │
│   │ [Join Skool Community] ← Prominent button       │           │
│   │                                                  │           │
│   │ Quick Start:                                     │           │
│   │ 1. ✅ Account created                           │           │
│   │ 2. ✅ Password set                              │           │
│   │ 3. ⬜ Join Skool (← pending)                    │           │
│   │ 4. ⬜ Complete Foundations Course               │           │
│   └─────────────────────────────────────────────────┘           │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ↓ User clicks "Join Skool"
┌─────────────────────────────────────────────────────────────────┐
│ 9. SKOOL COMMUNITY JOIN                                         │
│                                                                  │
│   Opens: https://skool.com/l4yercak3/join?invite=xxx            │
│   ↓                                                              │
│   Skool Group Settings:                                          │
│   - Privacy: Private (invite-only)                              │
│   - Price: Free (you already charged via Stripe)                │
│   - Membership Question: "Enter your l4yercak3 email"           │
│   ↓                                                              │
│   User enters l4yercak3 email (for verification)                │
│   ↓                                                              │
│   Joins Skool community instantly                               │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ↓
┌─────────────────────────────────────────────────────────────────┐
│ 10. FULLY ONBOARDED! 🎉                                         │
│                                                                  │
│   User now has:                                                  │
│   ✅ Platform account (logged in)                               │
│   ✅ Free tier features (100 contacts, 3 projects)              │
│   ✅ Community subscription (€9/mo, 14-day trial)               │
│   ✅ Skool access (courses, templates, calls)                   │
│   ✅ Password set                                                │
│   ✅ Payment method saved                                        │
│                                                                  │
│   Trial charges automatically after 14 days                      │
│   Cancel anytime → keeps Free platform, loses Skool             │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔧 Implementation Details

### Phase 1: Guest Checkout API Endpoint (Same as Before)

**File:** `convex/api/v1/guestCheckout.ts`

```typescript
// Same as in EXTERNAL-LANDING-PAGE-INTEGRATION.md
// But with Community-specific metadata and trial period

const session = await stripe.checkout.sessions.create({
  mode: "subscription",
  line_items: [{ price: TIER_PRICE_IDS.monthly.community, quantity: 1 }],
  success_url: successUrl || `${platformDomain}/welcome?tier=community`,
  cancel_url: cancelUrl || origin || platformDomain,
  // ... other settings ...
  subscription_data: {
    trial_period_days: 14,  // 14-day trial for Community
    metadata: {
      tier: "community",
      source: "landing_page",
      platform: "l4yercak3",
    },
  },
  metadata: {
    tier: "community",
    source: "landing_page",
  },
});
```

---

### Phase 2: Webhook Handler for Community Tier

**File:** `convex/stripe/webhooks.ts`

Update the `checkout.session.completed` handler:

```typescript
case "checkout.session.completed": {
  const session = event.data.object as Stripe.Checkout.Session;

  // Check if this is a landing page guest checkout
  if (session.metadata?.source === "landing_page") {
    const tier = session.metadata.tier;
    const customerEmail = session.customer_email || session.customer_details?.email;

    // Community tier gets special handling
    if (tier === "community") {
      await ctx.scheduler.runAfter(0, internal.onboarding.createCommunityAccountFromStripe, {
        email: customerEmail.toLowerCase(),
        name: session.customer_details?.name || "",
        stripeCustomerId: session.customer as string,
        stripeSubscriptionId: session.subscription as string,
        checkoutSessionId: session.id,
      });
    } else {
      // Other tiers (starter, professional, etc.)
      await ctx.scheduler.runAfter(0, internal.onboarding.createAccountFromStripeCheckout, {
        email: customerEmail.toLowerCase(),
        name: session.customer_details?.name || "",
        stripeCustomerId: session.customer as string,
        stripeSubscriptionId: session.subscription as string,
        tier,
        billingPeriod: session.metadata.billingPeriod || "monthly",
        checkoutSessionId: session.id,
      });
    }
  }

  break;
}
```

---

### Phase 3: Community Account Creation Action

**File:** `convex/onboarding.ts`

Add new action specifically for Community tier:

```typescript
/**
 * CREATE COMMUNITY ACCOUNT FROM STRIPE
 *
 * Special handling for Community tier subscriptions from landing page.
 * Community is an ADD-ON, not a platform tier:
 * - Platform plan: "free" (same limits as any free user)
 * - communitySubscription: active (access to Skool, courses, calls)
 */
export const createCommunityAccountFromStripe = internalAction({
  args: {
    email: v.string(),
    name: v.string(),
    stripeCustomerId: v.string(),
    stripeSubscriptionId: v.string(),
    checkoutSessionId: v.string(),
  },
  handler: async (ctx, args) => {
    console.log(`[Community Onboarding] Creating account for: ${args.email}`);

    // 1. Check if user already exists
    const existingUser = await ctx.runQuery(internal.onboarding.getUserByEmail, {
      email: args.email,
    });

    if (existingUser) {
      console.log(`[Community Onboarding] User exists, adding Community subscription`);

      // User exists → just add Community subscription to their organization
      await ctx.runMutation(internal.onboarding.addCommunitySubscriptionToExistingUser, {
        userId: existingUser._id,
        stripeCustomerId: args.stripeCustomerId,
        stripeSubscriptionId: args.stripeSubscriptionId,
      });

      // Send upgrade email (different from new user email)
      await ctx.scheduler.runAfter(0, internal.actions.communityEmail.sendCommunityUpgradeEmail, {
        email: args.email,
        firstName: existingUser.firstName || args.name.split(" ")[0],
      });

      return { success: true, existingUser: true };
    }

    // 2. New user → full account creation
    const crypto = await import("crypto");
    const tempPassword = crypto.randomBytes(32).toString("hex");
    const passwordHash = await ctx.runAction(internal.cryptoActions.hashPassword, {
      password: tempPassword,
    });

    // Extract name
    const nameParts = args.name.trim().split(" ");
    const firstName = nameParts[0] || args.email.split("@")[0];
    const lastName = nameParts.slice(1).join(" ") || "";

    // Generate API key
    const keyBytes = new Uint8Array(32);
    crypto.getRandomValues(keyBytes);
    const keySecret = Array.from(keyBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    const apiKey = `sk_live_${keySecret}`;
    const keyPrefix = `sk_live_${keySecret.substring(0, 8)}`;
    const apiKeyHash = await ctx.runAction(internal.cryptoActions.hashPassword, {
      password: apiKey,
    });

    // 3. Create user + organization with COMMUNITY subscription
    const result = await ctx.runMutation(internal.onboarding.createCommunityAccountInternal, {
      email: args.email,
      passwordHash,
      firstName,
      lastName,
      organizationName: `${firstName}'s Organization`,
      stripeCustomerId: args.stripeCustomerId,
      stripeSubscriptionId: args.stripeSubscriptionId,
      apiKeyHash,
      apiKeyPrefix: keyPrefix,
    });

    console.log(`[Community Onboarding] Account created: ${result.user.id}`);

    // 4. Generate password setup token
    const passwordToken = crypto.randomBytes(32).toString("hex");
    const tokenExpiry = Date.now() + (7 * 24 * 60 * 60 * 1000); // 7 days

    await ctx.runMutation(internal.accountManagement.storePasswordResetToken, {
      userId: result.user.id,
      token: passwordToken,
      expiresAt: tokenExpiry,
    });

    // 5. Send Community welcome email with Skool invite
    await ctx.scheduler.runAfter(0, internal.actions.communityEmail.sendCommunityWelcomeEmail, {
      email: args.email,
      firstName,
      passwordSetupToken: passwordToken,
      organizationName: result.organization.name,
    });

    console.log(`[Community Onboarding] Welcome email sent to ${args.email}`);

    return {
      success: true,
      userId: result.user.id,
      organizationId: result.organization.id,
      newUser: true,
    };
  },
});

/**
 * CREATE COMMUNITY ACCOUNT INTERNAL
 *
 * Internal mutation to create user + org with Community subscription.
 * Platform plan = "free", communitySubscription.active = true
 */
export const createCommunityAccountInternal = internalMutation({
  args: {
    email: v.string(),
    passwordHash: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    organizationName: v.string(),
    stripeCustomerId: v.string(),
    stripeSubscriptionId: v.string(),
    apiKeyHash: v.string(),
    apiKeyPrefix: v.string(),
  },
  handler: async (ctx, args) => {
    // Similar to createFreeAccountInternal, but with Community subscription

    // 1. Create organization with FREE plan + Community subscription
    const orgSlug = args.organizationName.toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    const organizationId = await ctx.db.insert("organizations", {
      name: args.organizationName,
      slug: orgSlug,
      businessName: args.organizationName,
      plan: "free",  // IMPORTANT: Platform plan is FREE, not "community"
      isPersonalWorkspace: true,
      isActive: true,
      stripeCustomerId: args.stripeCustomerId,
      stripeSubscriptionId: args.stripeSubscriptionId,
      // Community subscription (the add-on)
      communitySubscription: {
        active: true,
        stripeSubscriptionId: args.stripeSubscriptionId,
        stripeCustomerId: args.stripeCustomerId,
        startedAt: Date.now(),
        trialEndsAt: Date.now() + (14 * 24 * 60 * 60 * 1000), // 14 days
        skoolInviteSent: false,
        skoolJoinedAt: undefined,
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
      email: args.email,
    });

    // 2. Create user
    const userId = await ctx.db.insert("users", {
      email: args.email,
      firstName: args.firstName,
      lastName: args.lastName,
      defaultOrgId: organizationId,
      isPasswordSet: false,  // Will be set after password setup
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // 3. Create password record
    await ctx.db.insert("userPasswords", {
      userId,
      passwordHash: args.passwordHash,
      createdAt: Date.now(),
    });

    // 4. Create organization membership (owner role)
    const ownerRole = await ctx.db
      .query("roles")
      .filter(q => q.eq(q.field("name"), "owner"))
      .first();

    if (ownerRole) {
      await ctx.db.insert("organizationMembers", {
        userId,
        organizationId,
        role: ownerRole._id,
        isActive: true,
        joinedAt: Date.now(),
      });
    }

    // 5. Create API key
    await ctx.db.insert("apiKeys", {
      organizationId,
      name: "Default API Key",
      keyPrefix: args.apiKeyPrefix,
      keyHash: args.apiKeyHash,
      isActive: true,
      createdAt: Date.now(),
      lastUsedAt: null,
    });

    return {
      success: true,
      user: { id: userId, email: args.email, firstName: args.firstName, lastName: args.lastName },
      organization: { id: organizationId, name: args.organizationName, slug: orgSlug, plan: "free" },
    };
  },
});

/**
 * ADD COMMUNITY SUBSCRIPTION TO EXISTING USER
 *
 * When an existing user subscribes to Community tier.
 */
export const addCommunitySubscriptionToExistingUser = internalMutation({
  args: {
    userId: v.id("users"),
    stripeCustomerId: v.string(),
    stripeSubscriptionId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user || !user.defaultOrgId) {
      throw new Error("User or organization not found");
    }

    const org = await ctx.db.get(user.defaultOrgId);
    if (!org) {
      throw new Error("Organization not found");
    }

    // Update organization with Community subscription
    await ctx.db.patch(user.defaultOrgId, {
      communitySubscription: {
        active: true,
        stripeSubscriptionId: args.stripeSubscriptionId,
        stripeCustomerId: args.stripeCustomerId,
        startedAt: Date.now(),
        trialEndsAt: Date.now() + (14 * 24 * 60 * 60 * 1000),
        skoolInviteSent: false,
      },
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});
```

---

### Phase 4: Zapier Webhook Integration (NEW!)

**See:** `docs/pricing-and-trials/ZAPIER-SKOOL-AUTOMATION.md` for full details.

**Quick Overview:**

When Community account is created, platform triggers Zapier webhook:

```typescript
// In createCommunityAccountFromStripe action:
await ctx.scheduler.runAfter(0, internal.zapier.triggers.triggerCommunitySubscriptionCreated, {
  organizationId: result.organization.id,
  userId: result.user.id,
  email: args.email,
  firstName,
  lastName,
  stripeSubscriptionId: args.stripeSubscriptionId,
});
```

Zapier then automatically creates Skool member with Foundations course access. No manual work required!

---

### Phase 5: Community Welcome Email

**File:** `convex/actions/communityEmail.ts` (new file)

```typescript
import { internalAction } from "../_generated/server";
import { v } from "convex/values";

/**
 * SEND COMMUNITY WELCOME EMAIL
 *
 * Sent to NEW users who subscribed to Community via landing page.
 * Contains password setup link + Skool community invite.
 */
export const sendCommunityWelcomeEmail = internalAction({
  args: {
    email: v.string(),
    firstName: v.string(),
    passwordSetupToken: v.string(),
    organizationName: v.string(),
  },
  handler: async (ctx, args) => {
    const platformDomain = process.env.CONVEX_SITE_URL || "https://vc83.com";
    const setupUrl = `${platformDomain}/setup-password?token=${args.passwordSetupToken}`;
    const skoolUrl = process.env.SKOOL_COMMUNITY_URL || "https://www.skool.com/l4yercak3/about";

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; }
    .header { background: linear-gradient(135deg, #6B46C1 0%, #9F7AEA 100%); color: white; padding: 40px 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 28px; }
    .header p { margin: 10px 0 0 0; font-size: 16px; opacity: 0.9; }
    .content { background: #f9f9f9; padding: 40px 30px; }
    .step { background: white; padding: 25px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #6B46C1; }
    .step-number { display: inline-block; background: #6B46C1; color: white; width: 30px; height: 30px; border-radius: 50%; text-align: center; line-height: 30px; font-weight: bold; margin-right: 10px; }
    .step h3 { margin: 0 0 10px 0; color: #6B46C1; }
    .button { display: inline-block; background: #6B46C1; color: white !important; padding: 15px 35px; text-decoration: none; border-radius: 5px; margin: 15px 0; font-weight: bold; }
    .button:hover { background: #9F7AEA; }
    .features { background: white; padding: 25px; margin: 20px 0; border-radius: 8px; }
    .features h3 { color: #6B46C1; margin-top: 0; }
    .features ul { margin: 0; padding-left: 20px; }
    .features li { margin: 10px 0; }
    .trial-notice { background: #FFF4E6; border: 1px solid #FFB020; padding: 15px; border-radius: 5px; margin: 20px 0; }
    .footer { text-align: center; padding: 30px; color: #666; font-size: 14px; }
    .footer a { color: #6B46C1; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Welcome to l4yercak3 Community!</h1>
      <p>Your 14-day trial has started</p>
    </div>

    <div class="content">
      <h2 style="color: #6B46C1;">Hi ${args.firstName}! 👋</h2>
      <p>You're in! Welcome to the l4yercak3 Community. Let's get you set up (takes 2 minutes).</p>

      <div class="step">
        <span class="step-number">1</span>
        <h3>Set Your Password</h3>
        <p>Create your password to access your platform account.</p>
        <a href="${setupUrl}" class="button">Set Password & Login</a>
        <p style="font-size: 12px; color: #666;">This link expires in 7 days</p>
      </div>

      <div class="step">
        <span class="step-number">2</span>
        <h3>Check Your Email for Skool Invite</h3>
        <p>You'll receive a separate email from Skool with your login credentials and direct access to the Foundations course. This should arrive within 5 minutes.</p>
        <p style="font-size: 12px; color: #666;">Don't see it? Check spam or reply to this email for help.</p>
      </div>

      <div class="trial-notice">
        <strong>⏰ Your 14-Day Trial</strong><br>
        Try everything risk-free. Cancel anytime, no questions asked. After 14 days, you'll be charged €9/month unless you cancel.
      </div>

      <div class="features">
        <h3>What's Included in Your Community Membership:</h3>
        <ul>
          <li><strong>✅ Foundations Course</strong> - Replace your broken tool stack with a real system</li>
          <li><strong>✅ Templates Library</strong> - Client portals, automations, workflows ready to use</li>
          <li><strong>✅ Weekly Live Calls</strong> - Q&A sessions and workshops every Thursday 2pm CET</li>
          <li><strong>✅ Private Community</strong> - Connect with 100+ founders building real businesses</li>
          <li><strong>✅ Free Platform Account</strong> - 100 contacts, 3 projects, basic CRM included</li>
          <li><strong>✅ Early Access Features</strong> - Be the first to try new platform features</li>
        </ul>
      </div>

      <div style="background: #E6F7FF; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #0066CC;">Your Organization</h3>
        <p><strong>Name:</strong> ${args.organizationName}</p>
        <p style="margin-bottom: 0;">You can change this anytime in your settings.</p>
      </div>

      <h3 style="color: #6B46C1;">Need Help?</h3>
      <p>Reply to this email or jump into the Skool community - we're here to help!</p>
    </div>

    <div class="footer">
      <p><strong>l4yercak3</strong><br>
      Stop duct-taping your business. Start building systems.</p>
      <p>
        <a href="${platformDomain}/terms">Terms</a> |
        <a href="${platformDomain}/privacy">Privacy</a> |
        <a href="${platformDomain}/cancel">Cancel Subscription</a>
      </p>
    </div>
  </div>
</body>
</html>
    `;

    // Send email using your email service
    // TODO: Integrate with your email provider (SendGrid, Resend, etc.)

    console.log(`[Community Email] Sent welcome email to ${args.email}`);
    console.log(`[Community Email] Password setup: ${setupUrl}`);
    console.log(`[Community Email] Skool invite: ${skoolUrl}`);

    return { success: true };
  },
});

/**
 * SEND COMMUNITY UPGRADE EMAIL
 *
 * Sent to EXISTING users who add Community subscription.
 * They already have password, just need Skool invite.
 */
export const sendCommunityUpgradeEmail = internalAction({
  args: {
    email: v.string(),
    firstName: v.string(),
  },
  handler: async (ctx, args) => {
    const skoolUrl = process.env.SKOOL_COMMUNITY_URL || "https://www.skool.com/l4yercak3/about";

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    /* Same styles as above */
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Welcome to the Community!</h1>
      <p>You're now a Community member</p>
    </div>

    <div class="content">
      <h2 style="color: #6B46C1;">Hi ${args.firstName}! 👋</h2>
      <p>Since you already have a platform account, you're all set. Just one more step:</p>

      <div style="text-align: center; padding: 30px 0;">
        <a href="${skoolUrl}" class="button" style="font-size: 18px; padding: 20px 40px;">Join Skool Community</a>
      </div>

      <p style="text-align: center; color: #666;">That's where you'll find courses, templates, live calls, and 100+ founders.</p>

      <!-- Rest of email similar to welcome email -->
    </div>
  </div>
</body>
</html>
    `;

    // Send email
    console.log(`[Community Email] Sent upgrade email to ${args.email}`);

    return { success: true };
  },
});
```

---

### Phase 6: Environment Variables

**File:** `.env` (or Convex Dashboard)

```env
# Skool Community Configuration
SKOOL_COMMUNITY_URL=https://www.skool.com/l4yercak3/about

# Zapier Webhook for Community Automation
ZAPIER_COMMUNITY_WEBHOOK_URL=https://hooks.zapier.com/hooks/catch/xxx/yyy

# Platform URLs
CONVEX_SITE_URL=https://vc83.com

# Stripe Price IDs
STRIPE_COMMUNITY_MO_PRICE_ID=price_xxx  # €9/month with 14-day trial
STRIPE_COMMUNITY_YR_PRICE_ID=price_xxx  # €90/year (€7.50/mo)
```

---

## 🌐 Landing Page Integration Code

### JavaScript/TypeScript (Same as Before, but Community-specific)

```typescript
const PLATFORM_API_URL = "https://vc83.com/api/v1";

async function startCommunityTrial(billingPeriod: "monthly" | "annual" = "monthly") {
  try {
    const button = document.querySelector('[data-tier="community"]');
    if (button) {
      button.textContent = "Loading...";
      button.disabled = true;
    }

    const response = await fetch(`${PLATFORM_API_URL}/checkout/create-guest-link`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tier: "community",
        billingPeriod,
        successUrl: `${window.location.origin}/thank-you?tier=community`,
        cancelUrl: window.location.href,
      }),
    });

    if (!response.ok) throw new Error("Failed to create checkout");

    const data = await response.json();
    window.location.href = data.checkoutUrl;
  } catch (error) {
    console.error("Checkout error:", error);
    alert("Failed to start checkout. Please try again.");

    const button = document.querySelector('[data-tier="community"]');
    if (button) {
      button.textContent = "Start 14-Day Trial";
      button.disabled = false;
    }
  }
}

// React Component Example
function CommunityPricingCard() {
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">("monthly");

  const monthlyPrice = "€9";
  const annualPrice = "€7.50"; // €90/year = €7.50/month

  return (
    <div className="pricing-card community">
      <h2>Community</h2>
      <p className="subtitle">Course + Templates + Calls</p>

      <div className="billing-toggle">
        <button
          onClick={() => setBillingPeriod("monthly")}
          className={billingPeriod === "monthly" ? "active" : ""}
        >
          Monthly
        </button>
        <button
          onClick={() => setBillingPeriod("annual")}
          className={billingPeriod === "annual" ? "active" : ""}
        >
          Annual (Save 17%)
        </button>
      </div>

      <div className="price">
        {billingPeriod === "monthly" ? monthlyPrice : annualPrice}
        <span className="period">/month</span>
      </div>

      {billingPeriod === "annual" && (
        <p className="annual-note">Billed €90/year</p>
      )}

      <ul className="features">
        <li>✅ All Free tier features</li>
        <li>✅ Foundations Course</li>
        <li>✅ Templates Library</li>
        <li>✅ Weekly Live Calls</li>
        <li>✅ Private Skool Group</li>
        <li>✅ Early Access Features</li>
      </ul>

      <button
        onClick={() => startCommunityTrial(billingPeriod)}
        data-tier="community"
        className="cta-button"
      >
        Start 14-Day Trial
      </button>

      <p className="trial-notice">
        No credit card required • Cancel anytime
      </p>
    </div>
  );
}
```

---

## 🔐 Skool Configuration

### Skool Group Settings

**In Skool Admin Panel:**

| Setting | Value | Reason |
|---------|-------|--------|
| **Privacy** | Private | Only Community members can join |
| **Price** | Free | You already charge €9 via Stripe |
| **Invite Link** | Generate custom invite | Include in welcome email |
| **Membership Questions** | "What's your l4yercak3 email?" | Optional verification |
| **Auto-Approve** | Yes | Immediate access after joining |

### Handling Cancellations

**Skool Limitation:** No API to automatically remove members.

**Options:**

1. **Manual Cleanup (Monthly)**
   - Export Skool member list
   - Cross-reference with active Community subscriptions
   - Manually remove canceled members

2. **Community Goodwill Approach (Recommended)**
   - Let canceled members stay in Skool
   - Most inactive users naturally stop engaging
   - Good for brand/community building

3. **Membership Questions**
   - Periodically check who's still paying
   - Ask members to re-verify email
   - Remove non-responders

**Recommendation:** Start with Option 2 (goodwill), move to Option 1 if abuse is detected.

---

## 📊 Expected Results

### Conversion Rates

**Landing Page Visitors → Paying Customers:**
- **Current (with signup wall):** 0.5-1%
- **With Guest Checkout:** 6-15%
- **Improvement:** **6-15x more customers**

### Revenue Impact (1,000 landing page visitors)

| Scenario | Conversion | Customers | Revenue/Month |
|----------|-----------|-----------|---------------|
| Current (signup required) | 1% | 10 | €90 |
| Guest Checkout | 8% | 80 | €720 |
| **Improvement** | **+7%** | **+70** | **+€630/mo** |

**Annual impact:** €7,560/year additional revenue from Community tier alone!

---

## 🧪 Testing Checklist

**Before Launch:**
- [ ] Guest checkout creates Stripe session with 14-day trial
- [ ] Webhook receives checkout.session.completed
- [ ] Account created with plan="free" + communitySubscription.active=true
- [ ] Welcome email arrives within 1 minute
- [ ] Email contains password setup link (valid 7 days)
- [ ] Email contains Skool invite link
- [ ] Password setup page works
- [ ] User can login after setting password
- [ ] Welcome dashboard shows Community status
- [ ] Skool link redirects correctly
- [ ] User can join Skool (private group)
- [ ] Trial shows in Stripe dashboard (14 days)

**Edge Cases:**
- [ ] Existing user adds Community (should not create duplicate account)
- [ ] User closes Stripe checkout (no account created)
- [ ] User never sets password (send reminder after 3 days)
- [ ] User cancels during trial (no charge, lose Skool access)
- [ ] User cancels after trial (charged once, then refund/proration)

---

## 🚀 Next Steps

**To implement this, I need from you:**

1. **Landing page domain(s)** for CORS configuration
2. **Skool community URL** and invite link
3. **Confirm trial period** (14 days is standard)
4. **Confirm pricing** (€9/mo, €90/yr)

**Then I'll:**
1. Create the guest checkout API endpoint
2. Update webhook handler for Community tier
3. Create Community-specific onboarding actions
4. Build Community welcome email templates
5. Add password setup page
6. Update CORS configuration

**Timeline:** 6-8 hours implementation + 2 hours testing

Ready to start? 🚀
