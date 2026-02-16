# Phase 2.7: Agency Tier — 14-Day Free Trial with Stripe Billing

## Goal
Users can start a 14-day free trial of the Agency tier (€599/month) by entering their credit card details on a checkout page. The system activates agency features immediately, sends a reminder email 2 days before the trial ends, and auto-charges if not cancelled. This replaces manual tier upgrades and lets users discover agency features (sub-org creation, client management) risk-free before committing.

## Depends On
- Step 11 (Agency Sub-Orgs) — the agency features users are trialing
- Platform Webhooks (`convex/stripe/platformWebhooks.ts`) — subscription lifecycle handling
- Licensing System (`convex/licensing/helpers.ts`, `tierConfigs.ts`) — tier enforcement
- Email Service (`convex/actions/salesNotificationEmail.ts`, Resend) — notifications
- Cron Infrastructure (`convex/crons.ts`) — scheduled trial checks

## What Already Exists

| Component | Status | Location |
|---|---|---|
| Stripe checkout session creation | Done | `convex/stripeCheckout.ts` |
| Platform subscription webhooks | Done | `convex/stripe/platformWebhooks.ts` |
| `upsertOrganizationLicense` (supports `"trial"` status) | Done | `convex/stripe/platformWebhooks.ts:537-602` |
| `updateOrganizationPlan` mutation | Done | `convex/stripe/platformWebhooks.ts:483-532` |
| Tier configs with Agency limits/features | Done | `convex/licensing/tierConfigs.ts` |
| `getLicenseInternal` with trialEnd field | Done | `convex/licensing/helpers.ts:43-138` |
| `changePlanTier` (super admin mutation) | Done | `convex/licensing/helpers.ts:1084-1141` |
| Credit notification pattern (cooldown, dedup) | Done | `convex/credits/notifications.ts` |
| Sales notification emails (Resend) | Done | `convex/actions/salesNotificationEmail.ts` |
| Cron job infrastructure | Done | `convex/crons.ts` |
| Stripe subscription status handling (`trialing`) | Done | `convex/stripe/aiWebhooks.ts:227` |
| Agency tool gating (`subOrgsEnabled`) | Done | `convex/ai/agentExecution.ts:182-194` |

## What's Missing

### 1. Trial Checkout Action
A dedicated action that creates a Stripe checkout session with `subscription_data.trial_period_days: 14`. The checkout collects credit card details but doesn't charge until the trial ends. Must include org metadata so the webhook can activate the trial.

### 2. Trial Activation (Webhook Handling)
When Stripe fires `customer.subscription.created` with status `"trialing"`, the existing `handleSubscriptionCreated` needs to set the license to `"trial"` status (not `"active"`) and record `trialStart` and `trialEnd` timestamps.

### 3. Trial Reminder Email (2-Day Warning)
A cron job that runs daily, finds orgs with `trialEnd` within the next 48 hours, and sends a reminder email: "Your Agency trial ends in 2 days. You'll be charged €599/month unless you cancel."

### 4. Trial Expiry Handling
When the trial ends and Stripe charges, it fires `customer.subscription.updated` with status `"active"`. The webhook handler should upgrade the license from `"trial"` to `"active"`. If the user cancelled, Stripe fires `customer.subscription.deleted` and the existing handler reverts to free.

### 5. Customer-Facing Trial Emails
Three email templates:
- **Trial Started**: Welcome, what you can do, link to Telegram bot
- **Trial Reminder (Day 12)**: 2-day warning, cancel link, what you'll lose
- **Trial Converted**: Confirmation of Agency subscription

### 6. Frontend Trial CTA
A button/link in the app (and optionally in the agent's Telegram responses) that redirects to the Stripe checkout with trial parameters pre-configured.

## Architecture

```
User clicks "Try Agency Free for 14 Days"
    │
    ▼
Frontend calls createAgencyTrialCheckout action
    │
    ├── Creates Stripe Checkout Session:
    │     mode: "subscription"
    │     subscription_data.trial_period_days: 14
    │     metadata: { organizationId, tier: "agency", type: "platform-trial" }
    │     payment_method_collection: "always"  (card required)
    │
    ▼
User enters credit card on Stripe Checkout → Submits
    │
    ▼
Stripe fires: checkout.session.completed
    ├── Existing handler: syncs billing details (address, tax ID)
    ├── Sends sales notification: "trial_started"
    │
Stripe fires: customer.subscription.created (status: "trialing")
    │
    ▼
handleSubscriptionCreated (MODIFIED):
    ├── Detects status === "trialing"
    ├── Calls updateOrganizationTier(org, "agency", { status: "trial" })
    ├── Calls upsertOrganizationLicense with:
    │     planTier: "agency"
    │     status: "trial"
    │     trialStart: subscription.trial_start * 1000
    │     trialEnd: subscription.trial_end * 1000
    ├── Sends "trial_started" email to customer
    │
    ▼
Agency features are now active:
    - subOrgsEnabled: true
    - create_client_org tool available
    - PM agent shows agency model awareness
    │
    │  ... Day 12 ...
    │
    ▼
Cron: "Check trial expiration reminders" (daily, 7 AM UTC)
    ├── Finds licenses with status "trial" and trialEnd within 48 hours
    ├── Checks cooldown (only send once per trial)
    ├── Sends reminder email via Resend:
    │     "Your Agency trial ends in 2 days.
    │      You'll be charged €599/month.
    │      Cancel anytime: [Stripe Customer Portal link]"
    │
    │  ... Day 14 ...
    │
    ▼
Stripe auto-charges card → fires: customer.subscription.updated (status: "active")
    │
    ▼
handleSubscriptionUpdated (EXISTING):
    ├── Updates license: status "trial" → "active"
    ├── Sets currentPeriodStart / currentPeriodEnd
    ├── Sends "trial_converted" email + sales notification
    │
    ▼
User is now a paying Agency customer
```

### Cancellation Flow

```
User opens Stripe Customer Portal (link in email or app)
    │
    ▼
User clicks "Cancel Subscription"
    │
    ▼
Stripe fires: customer.subscription.deleted
    │
    ▼
handleSubscriptionDeleted (EXISTING):
    ├── Reverts org to free tier
    ├── License: "trial" → "active" (free tier)
    ├── Agency features disabled immediately
    ├── Existing sub-orgs remain but agents stop responding
    │     (no subOrgsEnabled = tools filtered out)
```

## Changes

### 1. NEW: convex/stripe/trialCheckout.ts — Trial checkout session creator

```typescript
/**
 * AGENCY TRIAL CHECKOUT
 *
 * Creates a Stripe Checkout Session with a 14-day free trial.
 * Collects payment method upfront but doesn't charge until trial ends.
 */

import { action } from "../_generated/server";
import { v } from "convex/values";
import Stripe from "stripe";
import { internal } from "../_generated/api";

/**
 * Create a checkout session for the 14-day Agency trial.
 */
export const createAgencyTrialCheckout = action({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    successUrl: v.string(),
    cancelUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      throw new Error("STRIPE_SECRET_KEY not configured");
    }

    // 1. Check current license — don't allow trial if already on paid tier
    const license = await ctx.runQuery(
      internal.licensing.helpers.getLicenseInternalQuery,
      { organizationId: args.organizationId }
    );

    if (license.exists && license.planTier !== "free") {
      throw new Error(
        `Organization is already on ${license.planTier} tier. Trials are only for free-tier organizations.`
      );
    }

    // 2. Check if org already had a trial (prevent trial abuse)
    const hadTrial = await ctx.runQuery(
      internal.stripe.trialCheckout.checkPreviousTrial,
      { organizationId: args.organizationId }
    );

    if (hadTrial) {
      throw new Error(
        "This organization has already used a free trial. Please subscribe directly."
      );
    }

    // 3. Get org details for Stripe
    const org = await ctx.runQuery(
      internal.stripe.platformWebhooks.getOrganizationInternal,
      { organizationId: args.organizationId }
    );

    if (!org) {
      throw new Error("Organization not found");
    }

    // 4. Get or create Stripe customer
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2025-10-29.clover",
    });

    let stripeCustomerId = org.stripeCustomerId;

    if (!stripeCustomerId) {
      // Get primary user email for Stripe customer
      const members = await ctx.runQuery(
        internal.stripe.platformWebhooks.getOrganizationMembers,
        { organizationId: args.organizationId }
      );

      const primaryMember = members.find((m: { isActive: boolean }) => m.isActive);
      const email = primaryMember?.user?.email;

      const customer = await stripe.customers.create({
        email: email || undefined,
        name: org.name,
        metadata: {
          organizationId: args.organizationId,
          platform: "l4yercak3",
        },
      });

      stripeCustomerId = customer.id;

      // Save Stripe customer ID to org
      await ctx.runMutation(
        internal.stripe.platformWebhooks.updateOrganizationPlan,
        {
          organizationId: args.organizationId,
          plan: "free",
          stripeCustomerId: stripeCustomerId,
        }
      );
    }

    // 5. Get the Agency price ID from env (configured in Stripe Dashboard)
    const agencyPriceId = process.env.STRIPE_AGENCY_PRICE_ID;
    if (!agencyPriceId) {
      throw new Error("STRIPE_AGENCY_PRICE_ID not configured");
    }

    // 6. Create checkout session with trial
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: "subscription",
      payment_method_collection: "always",
      line_items: [
        {
          price: agencyPriceId,
          quantity: 1,
        },
      ],
      subscription_data: {
        trial_period_days: 14,
        metadata: {
          organizationId: args.organizationId,
          tier: "agency",
          type: "platform-trial",
          trialStartedAt: Date.now().toString(),
        },
      },
      metadata: {
        organizationId: args.organizationId,
        tier: "agency",
        type: "platform-trial",
      },
      success_url: args.successUrl,
      cancel_url: args.cancelUrl,
      allow_promotion_codes: true,
    });

    return {
      checkoutUrl: session.url,
      sessionId: session.id,
    };
  },
});
```

### 2. NEW: convex/stripe/trialCheckout.ts — Trial abuse prevention query

Add to the same file:

```typescript
/**
 * Check if an organization has previously used a trial.
 * Prevents trial abuse (one trial per org, ever).
 */
export const checkPreviousTrial = internalQuery({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    // Check audit logs for previous trial activation
    const trialLog = await ctx.db
      .query("auditLogs")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .filter((q) =>
        q.eq(q.field("action"), "organization.trial_started")
      )
      .first();

    return !!trialLog;
  },
});
```

### 3. MODIFY: convex/stripe/platformWebhooks.ts — Handle trialing status

In `handleSubscriptionCreated`, add trial detection:

```typescript
async function handleSubscriptionCreated(ctx: ActionCtx, subscription: StripeSubscription) {
  const { metadata, customer, id, status, current_period_start, current_period_end, items } = subscription;
  const organizationId = metadata?.organizationId as Id<"organizations">;
  const tier = metadata?.tier || "free";

  // ... existing org lookup logic ...

  // NEW: Detect trial subscriptions
  const isTrial = status === "trialing";
  const trialEnd = (subscription as any).trial_end;

  await updateOrganizationTier(ctx, organizationId, tier, {
    stripeSubscriptionId: id,
    stripeCustomerId: customer,
    status: isTrial ? "trialing" : status,  // Pass trialing status through
    currentPeriodStart: current_period_start * 1000,
    currentPeriodEnd: current_period_end * 1000,
    priceId: items.data[0]?.price?.id,
    amount: items.data[0]?.price?.unit_amount || 0,
    currency: items.data[0]?.price?.currency || "eur",
  });

  // NEW: If trial, record trial metadata + send welcome email
  if (isTrial && organizationId) {
    // Record trial start in license
    await ctx.runMutation(internal.stripe.trialCheckout.recordTrialStart, {
      organizationId,
      trialStart: Date.now(),
      trialEnd: trialEnd ? trialEnd * 1000 : Date.now() + 14 * 24 * 60 * 60 * 1000,
      stripeSubscriptionId: id,
    });

    // Send trial welcome email
    await ctx.runAction(internal.stripe.trialEmails.sendTrialStartedEmail, {
      organizationId,
    });

    // Log audit event
    await ctx.runMutation(internal.stripe.trialCheckout.logTrialEvent, {
      organizationId,
      action: "organization.trial_started",
      metadata: { tier, trialEnd: trialEnd ? trialEnd * 1000 : null },
    });
  }
}
```

Also update `updateOrganizationTier` to map `"trialing"` → `"trial"` for license status:

```typescript
async function updateOrganizationTier(ctx, organizationId, tier, subscriptionInfo) {
  // ... existing logic ...

  // Map Stripe status to license status
  let licenseStatus: "active" | "trial" | "expired" | "suspended";
  if (subscriptionInfo.status === "trialing") {
    licenseStatus = "trial";
  } else if (subscriptionInfo.status === "active") {
    licenseStatus = "active";
  } else {
    licenseStatus = "suspended";
  }

  await ctx.runMutation(internal.stripe.platformWebhooks.upsertOrganizationLicense, {
    organizationId,
    planTier: normalizedTier,
    status: licenseStatus,
    // ... rest unchanged ...
  });
}
```

### 4. NEW: convex/stripe/trialCheckout.ts — Trial metadata mutations

```typescript
/**
 * Record trial start in the license object.
 * Adds trialStart/trialEnd timestamps for cron job to check.
 */
export const recordTrialStart = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    trialStart: v.number(),
    trialEnd: v.number(),
    stripeSubscriptionId: v.string(),
  },
  handler: async (ctx, args) => {
    const license = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "organization_license")
      )
      .first();

    if (license) {
      await ctx.db.patch(license._id, {
        customProperties: {
          ...license.customProperties,
          trialStart: args.trialStart,
          trialEnd: args.trialEnd,
          stripeSubscriptionId: args.stripeSubscriptionId,
        },
        updatedAt: Date.now(),
      });
    }
  },
});

/**
 * Log a trial-related audit event.
 */
export const logTrialEvent = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    action: v.string(),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("auditLogs", {
      organizationId: args.organizationId,
      action: args.action,
      resource: "organizations",
      resourceId: args.organizationId as unknown as string,
      metadata: args.metadata || {},
      success: true,
      createdAt: Date.now(),
    });
  },
});

/**
 * Record that a trial reminder was sent (cooldown tracking).
 */
export const recordTrialReminderSent = internalMutation({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("objects", {
      type: "trial_reminder_sent",
      name: "Trial Reminder",
      organizationId: args.organizationId,
      status: "active",
      customProperties: { sentAt: Date.now() },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});
```

### 5. NEW: convex/stripe/trialEmails.ts — Trial email templates

```typescript
/**
 * TRIAL EMAIL NOTIFICATIONS
 *
 * Three emails in the trial lifecycle:
 * 1. Trial Started — welcome, features overview, Telegram bot link
 * 2. Trial Reminder — 2-day warning, cancel link, what you'll lose
 * 3. Trial Converted — confirmation of paid subscription
 */

"use node";

import { internalAction } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { Resend } from "resend";

const createResendClient = () => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY not configured");
  return new Resend(apiKey);
};

/**
 * Send "Trial Started" email.
 */
export const sendTrialStartedEmail = internalAction({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const org = await ctx.runQuery(
      internal.stripe.platformWebhooks.getOrganizationInternal,
      { organizationId: args.organizationId }
    );
    const members = await ctx.runQuery(
      internal.stripe.platformWebhooks.getOrganizationMembers,
      { organizationId: args.organizationId }
    );

    const primaryMember = members.find((m: { isActive: boolean }) => m.isActive);
    const email = primaryMember?.user?.email;
    if (!email) return;

    const firstName = primaryMember?.user?.firstName || "there";
    const resend = createResendClient();
    const fromEmail = process.env.AUTH_RESEND_FROM || "l4yercak3 <team@mail.l4yercak3.com>";

    await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: `Your 14-day Agency trial is active — welcome, ${firstName}!`,
      html: `
        <h2>Your Agency trial is live!</h2>
        <p>Hey ${firstName},</p>
        <p>Your <strong>14-day free trial</strong> of the Agency plan is now active for <strong>${org?.name || "your organization"}</strong>.</p>

        <h3>What you can do now:</h3>
        <ul>
          <li><strong>Create client sub-organizations</strong> — tell your PM agent "I want to build an agent for [client name]"</li>
          <li><strong>Manage a portfolio</strong> — each client gets their own agent, soul, and Telegram deep link</li>
          <li><strong>Monitor performance</strong> — ask your PM "how is [client] doing?"</li>
          <li><strong>Up to 25 sub-organizations</strong> with independent agent teams</li>
        </ul>

        <h3>Get started:</h3>
        <p>Message your PM agent on Telegram and say: <em>"I want to create an agent for my first client"</em></p>

        <hr/>
        <p style="color: #666; font-size: 13px;">
          Your trial ends in 14 days. You'll be charged €599/month after that unless you cancel.
          You can cancel anytime from your billing portal — no questions asked.
        </p>
      `,
    });
  },
});

/**
 * Send "Trial Ending Soon" reminder email (2 days before).
 */
export const sendTrialReminderEmail = internalAction({
  args: {
    organizationId: v.id("organizations"),
    trialEnd: v.number(),
  },
  handler: async (ctx, args) => {
    const org = await ctx.runQuery(
      internal.stripe.platformWebhooks.getOrganizationInternal,
      { organizationId: args.organizationId }
    );
    const members = await ctx.runQuery(
      internal.stripe.platformWebhooks.getOrganizationMembers,
      { organizationId: args.organizationId }
    );

    const primaryMember = members.find((m: { isActive: boolean }) => m.isActive);
    const email = primaryMember?.user?.email;
    if (!email) return;

    const firstName = primaryMember?.user?.firstName || "there";
    const endDate = new Date(args.trialEnd).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // Get Stripe billing portal URL
    const portalUrl = process.env.STRIPE_BILLING_PORTAL_URL
      || "https://billing.stripe.com/p/login/test_placeholder";

    const resend = createResendClient();
    const fromEmail = process.env.AUTH_RESEND_FROM || "l4yercak3 <team@mail.l4yercak3.com>";

    await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: `Your Agency trial ends in 2 days — ${org?.name || "action required"}`,
      html: `
        <h2>Your trial ends on ${endDate}</h2>
        <p>Hey ${firstName},</p>
        <p>Just a heads up — your <strong>14-day Agency trial</strong> for <strong>${org?.name || "your organization"}</strong> ends in <strong>2 days</strong>.</p>

        <h3>What happens next:</h3>
        <ul>
          <li><strong>If you keep it:</strong> You'll be charged €599/month starting ${endDate}. No action needed — your sub-orgs and agents keep running.</li>
          <li><strong>If you cancel:</strong> Your agency features will be disabled. Existing sub-org agents will stop responding, but data is preserved.</li>
        </ul>

        <p>
          <a href="${portalUrl}" style="display: inline-block; background: #1a1a1a; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">
            Manage Subscription
          </a>
        </p>

        <hr/>
        <p style="color: #666; font-size: 13px;">
          Questions? Reply to this email — we read every message.
        </p>
      `,
    });
  },
});

/**
 * Send "Trial Converted" confirmation email.
 */
export const sendTrialConvertedEmail = internalAction({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const org = await ctx.runQuery(
      internal.stripe.platformWebhooks.getOrganizationInternal,
      { organizationId: args.organizationId }
    );
    const members = await ctx.runQuery(
      internal.stripe.platformWebhooks.getOrganizationMembers,
      { organizationId: args.organizationId }
    );

    const primaryMember = members.find((m: { isActive: boolean }) => m.isActive);
    const email = primaryMember?.user?.email;
    if (!email) return;

    const firstName = primaryMember?.user?.firstName || "there";
    const resend = createResendClient();
    const fromEmail = process.env.AUTH_RESEND_FROM || "l4yercak3 <team@mail.l4yercak3.com>";

    await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: `Welcome to Agency — you're all set, ${firstName}!`,
      html: `
        <h2>You're officially on the Agency plan!</h2>
        <p>Hey ${firstName},</p>
        <p>Your trial has converted to a full <strong>Agency subscription</strong> for <strong>${org?.name || "your organization"}</strong>.</p>

        <h3>Your plan includes:</h3>
        <ul>
          <li>Up to 25 client sub-organizations</li>
          <li>Unlimited agent teams per client</li>
          <li>Priority support (12h response time)</li>
          <li>5,000 monthly AI credits</li>
          <li>Portfolio-wide analytics</li>
        </ul>

        <p>Keep building — your clients' agents are getting smarter every day.</p>

        <hr/>
        <p style="color: #666; font-size: 13px;">
          First charge: €599 today. Next billing: 30 days from now.
          Manage your subscription anytime from your billing portal.
        </p>
      `,
    });
  },
});
```

### 6. NEW: convex/stripe/trialCron.ts — Daily trial expiry checker

```typescript
/**
 * TRIAL EXPIRATION CRON
 *
 * Runs daily to:
 * 1. Find trials expiring within 48 hours → send reminder
 * 2. Find expired trials that Stripe hasn't processed yet → log warning
 */

import { internalAction, internalQuery } from "../_generated/server";
import { internal } from "../_generated/api";

/**
 * Find all organizations with trials expiring within 48 hours.
 */
export const getTrialsExpiringSoon = internalQuery({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const in48Hours = now + 48 * 60 * 60 * 1000;

    // Get all trial licenses
    const trialLicenses = await ctx.db
      .query("objects")
      .filter((q) =>
        q.and(
          q.eq(q.field("type"), "organization_license"),
          q.eq(q.field("status"), "trial")
        )
      )
      .collect();

    // Filter to those expiring within 48 hours
    const expiringSoon = trialLicenses.filter((license) => {
      const trialEnd = (license.customProperties as Record<string, unknown>)?.trialEnd as number;
      return trialEnd && trialEnd > now && trialEnd <= in48Hours;
    });

    // Check which ones haven't been reminded yet
    const results = [];
    for (const license of expiringSoon) {
      const reminderSent = await ctx.db
        .query("objects")
        .withIndex("by_org_type", (q) =>
          q.eq("organizationId", license.organizationId).eq("type", "trial_reminder_sent")
        )
        .first();

      if (!reminderSent) {
        results.push({
          organizationId: license.organizationId,
          trialEnd: (license.customProperties as Record<string, unknown>)?.trialEnd as number,
        });
      }
    }

    return results;
  },
});

/**
 * Process trial expiration reminders.
 * Called by cron daily at 7 AM UTC.
 */
export const processTrialReminders = internalAction({
  args: {},
  handler: async (ctx) => {
    const expiring = await ctx.runQuery(
      internal.stripe.trialCron.getTrialsExpiringSoon
    );

    console.log(`[Trial Cron] Found ${expiring.length} trial(s) expiring within 48 hours`);

    for (const trial of expiring) {
      try {
        // Send reminder email
        await ctx.runAction(internal.stripe.trialEmails.sendTrialReminderEmail, {
          organizationId: trial.organizationId,
          trialEnd: trial.trialEnd,
        });

        // Record that reminder was sent (prevents duplicate sends)
        await ctx.runMutation(
          internal.stripe.trialCheckout.recordTrialReminderSent,
          { organizationId: trial.organizationId }
        );

        console.log(`[Trial Cron] ✓ Sent reminder for org ${trial.organizationId}`);
      } catch (e) {
        console.error(`[Trial Cron] Failed to send reminder for org ${trial.organizationId}:`, e);
      }
    }
  },
});
```

### 7. MODIFY: convex/crons.ts — Add trial reminder cron

```typescript
/**
 * Check Trial Expiration Reminders
 *
 * Runs daily at 7 AM UTC to find trials expiring within 48 hours
 * and send reminder emails to the org owner.
 */
crons.daily(
  "Check trial expiration reminders",
  {
    hourUTC: 7,
    minuteUTC: 0,
  },
  internal.stripe.trialCron.processTrialReminders
);
```

### 8. MODIFY: convex/stripe/platformWebhooks.ts — Detect trial→active conversion

In `handleSubscriptionUpdated`, add trial conversion detection:

```typescript
async function handleSubscriptionUpdated(ctx: ActionCtx, subscription: StripeSubscription) {
  // ... existing logic ...

  // NEW: Detect trial → active conversion
  const previousStatus = metadata?.previousStatus; // If available
  const isConversion = status === "active" && metadata?.type === "platform-trial";

  await updateOrganizationTier(ctx, organizationId, tier, {
    // ... existing fields ...
  });

  // If this is a trial converting to active, send confirmation
  if (isConversion || (status === "active" && tier === "agency")) {
    // Check if org was on trial
    const license = await ctx.runQuery(
      internal.licensing.helpers.getLicenseInternalQuery,
      { organizationId }
    );

    if (license?.status === "trial" || (license?.customProperties as any)?.trialEnd) {
      try {
        await ctx.runAction(internal.stripe.trialEmails.sendTrialConvertedEmail, {
          organizationId,
        });

        // Sales notification
        const org = await ctx.runQuery(
          internal.stripe.platformWebhooks.getOrganizationInternal,
          { organizationId }
        );
        const members = await ctx.runQuery(
          internal.stripe.platformWebhooks.getOrganizationMembers,
          { organizationId }
        );
        const primaryMember = members.find((m: OrganizationMember) => m.isActive);

        await ctx.runAction(internal.actions.salesNotificationEmail.sendSalesNotification, {
          eventType: "platform_tier_upgrade",
          user: {
            email: primaryMember?.user?.email || "",
            firstName: primaryMember?.user?.firstName || "",
            lastName: primaryMember?.user?.lastName || "",
          },
          organization: {
            name: org?.name || "Unknown",
            planTier: "agency",
          },
          metadata: {
            source: "trial_conversion",
            trialDuration: "14_days",
          },
        });
      } catch (e) {
        console.error("[Platform Webhooks] Trial conversion notification failed:", e);
      }
    }
  }
}
```

### 9. OPTIONAL: Frontend CTA component

```typescript
// src/components/billing/AgencyTrialButton.tsx
// A simple button that calls createAgencyTrialCheckout and redirects to Stripe

export function AgencyTrialButton({ organizationId, sessionId }: Props) {
  const startTrial = useAction(api.stripe.trialCheckout.createAgencyTrialCheckout);

  const handleClick = async () => {
    const result = await startTrial({
      sessionId,
      organizationId,
      successUrl: `${window.location.origin}/settings/billing?trial=started`,
      cancelUrl: `${window.location.origin}/settings/billing?trial=cancelled`,
    });

    if (result.checkoutUrl) {
      window.location.href = result.checkoutUrl;
    }
  };

  return (
    <button onClick={handleClick}>
      Try Agency Free for 14 Days
    </button>
  );
}
```

## Environment Variables Required

```bash
# Already configured:
STRIPE_SECRET_KEY=sk_live_...
RESEND_API_KEY=re_...
AUTH_RESEND_FROM="l4yercak3 <team@mail.l4yercak3.com>"

# NEW — must be configured:
STRIPE_AGENCY_PRICE_ID=price_...          # Agency monthly price in Stripe Dashboard
STRIPE_BILLING_PORTAL_URL=https://...     # Stripe Customer Portal link for self-service cancellation
```

## Stripe Dashboard Setup

1. **Create Agency Product** in Stripe Dashboard (if not already done)
   - Name: "Agency Plan"
   - Price: €599/month (recurring)
   - Copy the `price_id` → set as `STRIPE_AGENCY_PRICE_ID`

2. **Enable Customer Portal** in Stripe settings
   - Allow subscription cancellation
   - Copy portal URL → set as `STRIPE_BILLING_PORTAL_URL`

3. **Verify webhook endpoint** includes these events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`

## Verification

1. `npx convex typecheck` — passes
2. Free-tier user clicks "Try Agency Free" → redirected to Stripe Checkout
3. User enters credit card → completes checkout
4. Stripe fires `subscription.created` with `status: "trialing"` → license becomes `trial` + `agency`
5. Agent now has agency tools (`create_client_org` appears in tool list)
6. User creates a sub-org via Telegram → works
7. Day 12: cron finds trial expiring → sends reminder email
8. Day 14 (keep): Stripe charges card → `subscription.updated` with `status: "active"` → license becomes `active`
9. Day 14 (cancel): user cancels in portal → `subscription.deleted` → reverts to free tier, agency tools disappear

## Complexity: Medium

- 3 new files (`trialCheckout.ts`, `trialEmails.ts`, `trialCron.ts`)
- 2 modified files (`platformWebhooks.ts`, `crons.ts`)
- 1 optional frontend component (`AgencyTrialButton.tsx`)
- Relies heavily on existing Stripe + license infrastructure (no schema changes)
- Stripe handles all billing logic — we just respond to webhooks

## Edge Cases

### Trial Abuse Prevention
Each org can only trial once, enforced by audit log check. If someone creates a new org to get another trial, that's acceptable — they'd have to re-set up everything.

### Payment Method Failure at Conversion
If the card fails when Stripe tries to charge after 14 days, Stripe fires `customer.subscription.updated` with `status: "past_due"`. The existing webhook maps this to `"suspended"`, which disables agency features. The user gets Stripe's built-in payment retry emails.

### Sub-Orgs After Trial Cancellation
When trial ends without conversion, `subOrgsEnabled` becomes `false`. Existing sub-org agents stop being available (tools filtered out in `agentExecution.ts`). Sub-org data is preserved — if the user subscribes later, everything reactivates.

### Mid-Trial Upgrade
If the user wants to skip the trial and go straight to paid (e.g., annual billing), they can subscribe normally. The trial subscription gets replaced by the new one, and Stripe handles the proration.

### Concurrent Trial + Subscription
The checkout action checks `license.planTier !== "free"` to prevent creating a trial for orgs already on a paid tier. This prevents accidental double subscriptions.

## The "Wow" Moment

```
Owner: I want to create agents for my clients but I'm on the free tier.

Quinn (PM): Great news! You can try our Agency plan free for 14 days.
  You'll get:
  - Sub-organization management
  - Client agent bootstrapping
  - Portfolio analytics

  No charge for 14 days. We'll remind you 2 days before it renews.

  → [Start Free Trial] (link to Stripe Checkout)

--- Owner clicks link, enters card, returns ---

Owner: OK I'm back, trial is active!

Quinn: Welcome to Agency! Let's set up your first client.
  Tell me about their business — name, industry, and
  who their customers are.

Owner: Apotheke Schmidt, pharmacy in Berlin, elderly + families.

Quinn: [create_client_org] ✓

  Done! Apotheke Schmidt is live with agent "Petra".
  Deep link: t.me/l4yercak3_platform_bot?start=acme-apotheke-schmidt

--- Day 12 ---

📧 Email to owner:
  "Your Agency trial ends in 2 days. You'll be charged
   €599/month. Your 1 client org (Apotheke Schmidt) and
   agent (Petra) will keep running. Cancel anytime."

--- Day 14 (owner keeps it) ---

📧 Email to owner:
  "Welcome to Agency — you're all set!
   Petra has handled 47 conversations this week. 🎉"
```

## What This Enables

- **Zero-Risk Discovery**: Users experience agency features before paying, dramatically reducing conversion friction
- **Self-Service Monetization**: No sales calls needed — users can upgrade, trial, and cancel entirely on their own
- **Stripe-Native Billing**: All payment logic delegated to Stripe — no custom billing code, retry logic, or card storage
- **Automated Lifecycle**: Trial → Reminder → Convert/Cancel is fully automated via webhooks + cron
- **Sales Intelligence**: Sales team gets notified of trial starts and conversions for targeted outreach
