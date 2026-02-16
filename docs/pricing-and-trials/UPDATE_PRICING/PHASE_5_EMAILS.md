# Phase 5: Contextual Subscription Emails

> **Priority:** MEDIUM
> **Dependencies:** Phase 1-2 (webhook handlers must be updated)
> **Files touched:** 2 (1 create + 1 modify)

## Goal

Send context-specific emails when subscription lifecycle events occur. Each event gets a tailored email with relevant details.

---

## Email Events

| Event | Trigger | Subject Line |
|-------|---------|-------------|
| `plan_upgrade` | Subscription created or upgraded | "Welcome to {Tier} — your upgrade is active" |
| `plan_downgrade` | Downgrade scheduled | "Plan change scheduled — {From} to {To}" |
| `credit_purchase` | Credit pack purchased | "Credits added — {X} credits in your account" |
| `subscription_canceled` | Subscription set to cancel | "Subscription ending on {date}" |
| `trial_started` | Trial subscription created | "Your 14-day trial has started" |

---

## 5A. CREATE `convex/actions/subscriptionEmails.ts`

**Target:** ~250 lines

### Existing Infrastructure to Use

- `convex/emailService.ts` — `createResendClient()`, email sending with Resend
- `convex/emailDelivery.ts` — `sendEmail()` with retry logic, domain config, communication tracking
- `RESEND_API_KEY` env var for system-level sending
- From address: `l4yercak3 <team@mail.l4yercak3.com>`

### Structure

```typescript
import { internalAction } from "../_generated/server";
import { v } from "convex/values";
import { Resend } from "resend";

type EmailEvent = "plan_upgrade" | "plan_downgrade" | "credit_purchase" | "subscription_canceled" | "trial_started";

export const sendSubscriptionEmail = internalAction({
  args: {
    organizationId: v.id("organizations"),
    email: v.string(),
    organizationName: v.string(),
    event: v.string(), // EmailEvent
    details: v.object({
      tier: v.optional(v.string()),
      fromTier: v.optional(v.string()),
      toTier: v.optional(v.string()),
      billingPeriod: v.optional(v.string()),
      credits: v.optional(v.number()),
      amountInCents: v.optional(v.number()),
      effectiveDate: v.optional(v.number()),
      trialEndDate: v.optional(v.number()),
    }),
  },
  handler: async (ctx, args) => {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { subject, html } = buildEmail(args.event as EmailEvent, args);

    await resend.emails.send({
      from: "l4yercak3 <team@mail.l4yercak3.com>",
      to: args.email,
      subject,
      html,
    });
  },
});
```

### Email Content Templates

**Plan Upgrade:**
```
Subject: Welcome to Pro — your upgrade is active
---
Hi {orgName},

Your plan has been upgraded to **Pro**. Here's what's new:
- 200 credits/month + 5 daily
- 3 team members
- 2,000 contacts
- Full CRM & invoicing

Your new features are available immediately.

[Go to Platform →]
```

**Plan Downgrade:**
```
Subject: Plan change scheduled — Agency to Pro
---
Your plan will change from Agency to Pro on {date}.

Until then, all your current features remain active.
You can cancel this change anytime from the Store.

[Manage Subscription →]
```

**Credit Purchase:**
```
Subject: 1,100 credits added to your account
---
Your credit purchase is complete:

• Credits: 1,100
• Amount: €100.00 (incl. VAT)

Your credits are available immediately and never expire.

[View Credit Balance →]
```

**Subscription Canceled:**
```
Subject: Subscription ending on March 15, 2026
---
Your Pro subscription will end on March 15, 2026.
After that, you'll move to the Free plan.

Your data is safe — contacts, projects, and files
will be preserved. Some features may become limited.

Changed your mind? Reactivate anytime from the Store.

[Keep My Subscription →]
```

**Trial Started:**
```
Subject: Your 14-day Agency trial has started
---
Welcome! Your Agency trial is active until {date}.

During your trial, you have full access to:
- 2,000 credits/month
- Sub-organizations
- White label
- Priority support

No charge until your trial ends. Cancel anytime.

[Explore Your Features →]
```

---

## 5B. Wire Into Webhooks — `convex/stripe/platformWebhooks.ts`

**Action:** MODIFY

### In `handleSubscriptionCreated`:
```typescript
// After updating organization plan...
const email = await getOrgOwnerEmail(ctx, organizationId);
if (email) {
  const isTrialStart = subscription.trial_end && subscription.trial_end > Date.now() / 1000;
  await ctx.runAction(internal.actions.subscriptionEmails.sendSubscriptionEmail, {
    organizationId,
    email,
    organizationName: org.name,
    event: isTrialStart ? "trial_started" : "plan_upgrade",
    details: {
      tier: newTier,
      billingPeriod,
      trialEndDate: isTrialStart ? subscription.trial_end * 1000 : undefined,
    },
  });
}
```

### In `handleSubscriptionUpdated` (detect upgrade/downgrade):
```typescript
const oldTier = previousAttributes?.items?.data?.[0]?.plan?.metadata?.plan_tier;
const newTier = subscription.items.data[0].plan.metadata?.plan_tier;

if (oldTier && newTier && oldTier !== newTier) {
  const isUpgrade = TIER_ORDER[newTier] > TIER_ORDER[oldTier];
  await ctx.runAction(internal.actions.subscriptionEmails.sendSubscriptionEmail, {
    organizationId, email, organizationName,
    event: isUpgrade ? "plan_upgrade" : "plan_downgrade",
    details: { fromTier: oldTier, toTier: newTier, billingPeriod },
  });
}
```

### In `handleSubscriptionDeleted`:
```typescript
await ctx.runAction(internal.actions.subscriptionEmails.sendSubscriptionEmail, {
  organizationId, email, organizationName,
  event: "subscription_canceled",
  details: { tier: previousTier, effectiveDate: subscription.current_period_end * 1000 },
});
```

### In credit purchase handler (Phase 2B):
```typescript
await ctx.runAction(internal.actions.subscriptionEmails.sendSubscriptionEmail, {
  organizationId, email, organizationName,
  event: "credit_purchase",
  details: { credits, amountInCents },
});
```

---

## Verification

1. Test subscription creation → check Resend dashboard for "Welcome to Pro" email
2. Test credit purchase → check for "Credits added" email
3. Test subscription cancellation → check for "Subscription ending" email
4. Verify emails are bilingual-ready (DE/EN headers)
