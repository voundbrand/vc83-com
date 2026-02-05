# VLN Stripe Workstream — Continuation Prompt

> **Status**: Ready to implement. All backend + frontend scaffolding done.
> **Branch**: `agent_per_org`
> **Last session**: 2026-02-02

## What's Done (DO NOT REBUILD)

The L4YERCAK3 SMS feature is fully wired for **alphanumeric senders** (free, instant). The **VLN (dedicated number)** flow has a complete UI wizard and backend — but the final Stripe checkout link is a "Coming Soon" placeholder. That's what this workstream finishes.

### Completed Files

| File | What it does |
|------|-------------|
| `convex/channels/platformSms.ts` | Full backend: `getPlatformSmsConfig`, `saveAlphanumericSender`, `disconnectPlatformSms`, `getAvailableNumbers` (Infobip API), `saveVlnOrder`, `activateVln` (internal), `updateVlnStatus` (internal), `purchaseInfobipNumber` (internal), `getVlnConfigInternal` (internal) |
| `convex/channels/router.ts` | Per-org sender ID lookup in platform SMS fallback (lines 140-162). Checks `platform_sms_config` object, uses alphanumeric or VLN number as sender instead of global `INFOBIP_SMS_SENDER_ID` |
| `convex/channels/infobipCpaasX.ts` | CPaaS X multi-tenant isolation (Application = platform, Entity = per-org). Provisioning, lookup, delete |
| `convex/channels/providers/infobipProvider.ts` | SMS send with CPaaS X `applicationId` + `entityId` in payload |
| `convex/channels/webhooks.ts` | Inbound webhook processing with entityId fast-path org resolution |
| `convex/licensing/tierConfigs.ts` | `platformSmsEnabled: boolean` — false for FREE, true for PRO/AGENCY/ENTERPRISE |
| `src/components/window-content/integrations-window/platform-sms-settings.tsx` | Full UI: choose alphanumeric vs VLN, 4-step wizard (Country → Offers → Details → Checkout summary). The "Subscribe & Purchase" button at step 4 is the placeholder. |
| `src/components/window-content/integrations-window/index.tsx` | Integration card for "L4YERCAK3 SMS" (purple #7c3aed, gated by `platformSmsEnabled`) + rendering case |

### Data Model

Config stored as `type="platform_sms_config"` in the `objects` table:

```typescript
{
  type: "platform_sms_config",
  organizationId: Id<"organizations">,
  name: "Platform SMS Config",
  status: "active",
  customProperties: {
    senderType: "alphanumeric" | "vln",
    // Alphanumeric
    alphanumericSender?: string,           // max 11 chars
    // VLN
    vlnNumber?: string,                     // "+4930123456789"
    vlnCountry?: string,                    // "DE" | "AT" | "CH"
    vlnStatus?: "pending_payment" | "pending_provisioning" | "active" | "suspended" | "cancelled" | "error",
    vlnInfobipNumberKey?: string,           // Infobip's number key for purchase
    vlnSetupFee?: number,                   // Infobip cost EUR
    vlnMonthlyFee?: number,                 // Infobip cost EUR
    vlnOurSetupFee?: number,                // Our price EUR (Infobip * 1.35)
    vlnOurMonthlyFee?: number,              // Our price EUR (Infobip * 1.35)
    vlnInfobipNumberId?: string,            // After purchase
    stripeSubscriptionId?: string,          // Stripe sub ID
    stripeSubscriptionStatus?: string,
    // Compliance (required for VLN registration)
    companyName?: string,
    useCase?: string,
    optInFlow?: string,
    optOutFlow?: string,
    messageExample?: string,
    monthlyOutboundEstimate?: string,
    monthlyInboundEstimate?: string,
    configuredAt: number,
    vlnProvisionedAt?: number,
  }
}
```

---

## What Needs to Be Built

### Task 1: Stripe Checkout Route for VLN Purchase

**New file**: `src/app/api/stripe/create-sms-checkout/route.ts`

This is a Next.js API route (like the existing `src/app/api/stripe/create-checkout/route.ts`). It:

1. Receives POST with `{ sessionId, organizationId, organizationName, email, successUrl, cancelUrl }`
2. Uses `ConvexHttpClient` to read the org's `platform_sms_config` (to get pricing from `vlnOurSetupFee` and `vlnOurMonthlyFee`)
3. Creates **dynamic Stripe Price objects** (ad-hoc prices, since each number has different pricing):
   - One-time setup fee: `stripe.prices.create({ unit_amount: vlnOurSetupFee * 100, currency: "eur", product_data: { name: "SMS Number Setup" } })`
   - Monthly recurring: `stripe.prices.create({ unit_amount: vlnOurMonthlyFee * 100, currency: "eur", recurring: { interval: "month" }, product_data: { name: "SMS Number Monthly" } })`
4. Creates a Stripe Checkout Session with `mode: "subscription"`:
   ```typescript
   {
     customer: customerId,
     mode: "subscription",
     line_items: [
       { price: setupPriceId, quantity: 1 },      // one-time as "add_invoice_items" instead
       { price: monthlyPriceId, quantity: 1 },     // recurring
     ],
     metadata: {
       type: "sms-number",
       organizationId,
       platform: "l4yercak3",
     },
     success_url: successUrl,
     cancel_url: cancelUrl,
     billing_address_collection: "required",
     automatic_tax: { enabled: true },
     tax_id_collection: { enabled: true },
   }
   ```

   **Important**: For a subscription with a one-time setup fee, use `subscription_data.add_invoice_items` instead of mixing one-time + recurring line items:
   ```typescript
   subscription_data: {
     metadata: { type: "sms-number", organizationId },
     add_invoice_items: [{ price: setupPriceId, quantity: 1 }],
   }
   ```

**Reference pattern**: See `src/app/api/stripe/create-checkout/route.ts` (lines 1-55) for the existing ConvexHttpClient bridge pattern. See `convex/stripe/platformCheckout.ts` `getOrCreateCustomer()` (lines 64-131) for how we get/create Stripe customers.

**Alternative approach**: Instead of a Next.js route, you could add a new Convex action `createSmsCheckoutSession` in `convex/stripe/platformCheckout.ts` and call it from a minimal Next.js route, matching the existing pattern.

### Task 2: Wire the Frontend "Subscribe & Purchase" Button

**File**: `src/components/window-content/integrations-window/platform-sms-settings.tsx`

Find the placeholder at the bottom of the `step === "checkout"` section (around line 586):

```typescript
onClick={() => {
  // TODO: Redirect to Stripe Checkout via /api/stripe/create-sms-checkout
  notification.success(
    "Coming Soon",
    "Stripe checkout for VLN numbers will be available shortly."
  );
}}
```

Replace with:
```typescript
onClick={async () => {
  if (!sessionId) return;
  setIsSubmittingCheckout(true);
  try {
    const resp = await fetch("/api/stripe/create-sms-checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        organizationId: /* need to get from auth or pass through */,
        organizationName: companyName,
        email: /* user email */,
        successUrl: `${window.location.origin}?sms_checkout=success`,
        cancelUrl: `${window.location.origin}?sms_checkout=cancel`,
      }),
    });
    const data = await resp.json();
    if (data.url) {
      window.location.href = data.url;
    } else {
      notification.error("Error", data.error || "Failed to create checkout");
    }
  } catch (error) {
    notification.error("Error", "Failed to create checkout session");
  } finally {
    setIsSubmittingCheckout(false);
  }
}}
```

You'll need to get `organizationId` and `email` from the auth context. Check how `useAuth()` and `useCurrentOrganization()` work — they're imported in the integrations index but not currently in platform-sms-settings.

### Task 3: Webhook Handler for SMS Number Checkout

**File**: `convex/stripe/platformWebhooks.ts`

In `handleCheckoutCompleted()` (around line 214), after the credit-pack fulfillment block, add a new block:

```typescript
// Fulfill SMS number purchases
if (checkoutType === "sms-number") {
  const subscriptionId = subscription;
  if (subscriptionId && organizationId) {
    try {
      // 1. Activate VLN (update status to pending_provisioning)
      await ctx.runMutation(internal.channels.platformSms.activateVln, {
        organizationId,
        stripeSubscriptionId: subscriptionId,
      });

      // 2. Trigger Infobip number purchase
      await ctx.runAction(internal.channels.platformSms.purchaseInfobipNumber, {
        organizationId,
      });

      console.log(`[Platform Webhooks] ✓ VLN activated for org ${organizationId}`);
    } catch (error) {
      console.error(`[Platform Webhooks] Failed to activate VLN:`, error);
    }
  }
  return;
}
```

In `handleSubscriptionDeleted()` (around line 468), add a check for SMS number subscriptions. Before the tier revert logic, check if this subscription is for an SMS number:

```typescript
// Check if this is an SMS number subscription
const subType = metadata?.type;
if (subType === "sms-number") {
  const orgId = metadata?.organizationId as Id<"organizations">;
  if (orgId) {
    // Release the number and remove config
    try {
      await ctx.runMutation(internal.channels.platformSms.updateVlnStatus, {
        organizationId: orgId,
        status: "cancelled",
      });
      console.log(`[Platform Webhooks] ✓ VLN subscription cancelled for org ${orgId}`);
    } catch (error) {
      console.error(`[Platform Webhooks] Failed to cancel VLN:`, error);
    }
  }
  return; // Don't process as tier change
}
```

### Task 4: Fix `disconnectPlatformSms` to Cancel Stripe Sub

**File**: `convex/channels/platformSms.ts`

The `disconnectPlatformSms` mutation has a `// TODO: If VLN, cancel Stripe subscription and release Infobip number` at line 210. Replace the simple delete with:

```typescript
if (config) {
  const props = config.customProperties as Record<string, unknown>;

  // If VLN with active Stripe subscription, schedule cancellation
  if (props.senderType === "vln" && props.stripeSubscriptionId) {
    // Schedule Stripe subscription cancellation (needs to be an action for Stripe API call)
    await ctx.scheduler.runAfter(0, internalRef.channels.platformSms.cancelVlnSubscription, {
      organizationId: orgId,
      stripeSubscriptionId: props.stripeSubscriptionId as string,
    });
  }

  await ctx.db.delete(config._id);
}
```

Then add a new `internalAction`:

```typescript
export const cancelVlnSubscription = internalAction({
  args: {
    organizationId: v.id("organizations"),
    stripeSubscriptionId: v.string(),
  },
  handler: async (ctx, args) => {
    // Cancel the Stripe subscription
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2025-10-29.clover",
    });

    try {
      await stripe.subscriptions.cancel(args.stripeSubscriptionId);
      console.log(`[PlatformSMS] Cancelled Stripe subscription ${args.stripeSubscriptionId}`);
    } catch (error) {
      console.error("[PlatformSMS] Failed to cancel Stripe subscription:", error);
    }

    // Also delete the Infobip entity (optional cleanup)
    try {
      await (ctx.runAction as Function)(
        internalRef.channels.infobipCpaasX.deleteOrgEntity,
        { organizationId: args.organizationId }
      );
    } catch (e) {
      console.error("[PlatformSMS] Entity cleanup failed (non-blocking):", e);
    }
  },
});
```

---

## Pricing Reference

| Component | Infobip Cost | Our Price | Markup |
|-----------|-------------|-----------|--------|
| VLN Setup (DE) | EUR 10.06 | ~EUR 14.99 | ~49% |
| VLN Monthly (DE) | EUR 29.34 | ~EUR 39.99/mo | ~36% |
| SMS Outbound (DE) | ~EUR 0.10 | 2 credits (~EUR 0.20-0.38) | 100-280% |
| Alphanumeric Sender | EUR 0 | Free | N/A |

Prices are fetched dynamically from Infobip API (`GET /numbers/1/numbers/available`), markup applied at 35% (`MARKUP = 1.35`), rounded with `Math.ceil((price * 1.35) * 100 - 1) / 100` to land on .99 endings.

---

## Key Codebase Patterns to Follow

### Convex Function Signatures
- **Public** (frontend-facing): `query`, `mutation`, `action` — takes `sessionId: v.string()`
- **Internal** (backend-only): `internalQuery`, `internalMutation`, `internalAction` — takes typed args directly
- **Avoid TS2589**: Use `require("../_generated/api")` instead of `import { api } from "..._generated/api"`:
  ```typescript
  const { api: apiRef, internal: internalRef } = require("../_generated/api") as {
    api: Record<string, Record<string, Record<string, unknown>>>;
    internal: Record<string, Record<string, Record<string, unknown>>>;
  };
  ```

### Stripe in Convex
- `platformCheckout.ts` uses `import Stripe from "stripe"` directly
- API version: `"2025-10-29.clover"`
- `STRIPE_SECRET_KEY` env var
- Customer ID stored on `organizations.stripeCustomerId`
- Use `getOrCreateCustomer()` helper from `platformCheckout.ts` (or duplicate for the action)

### Session Auth
- Frontend: `const { sessionId } = useAuth()`
- Backend query/mutation: `ctx.db.get(args.sessionId as Id<"sessions">)` → validate `expiresAt` → get `user.defaultOrgId`
- Backend action: `(ctx.runQuery as Function)(apiRef.auth.canUserPerform, { sessionId, permission, resource })`

### Objects Table
- All config stored in `objects` table with `type` discriminator
- Query by org + type: `.withIndex("by_org_type", (q) => q.eq("organizationId", orgId).eq("type", "platform_sms_config"))`
- Query by type only: `.withIndex("by_type", (q) => q.eq("type", "platform_sms_config"))`

---

## Verification Checklist

After implementing:

1. [ ] `npx tsc --noEmit` — zero errors in both tsconfigs
2. [ ] Alphanumeric sender still works (save "TestBrand" → verify in config)
3. [ ] VLN wizard flows through all 4 steps
4. [ ] "Subscribe & Purchase" button calls `/api/stripe/create-sms-checkout`
5. [ ] Stripe Checkout Session created with correct prices + metadata
6. [ ] `checkout.session.completed` webhook calls `activateVln` + `purchaseInfobipNumber`
7. [ ] `customer.subscription.deleted` webhook sets VLN status to "cancelled"
8. [ ] Disconnect button cancels Stripe subscription
9. [ ] Type: `"sms-number"` in metadata distinguishes from tier/credit-pack checkouts

---

## Quick Start Prompt

Paste this to start the work:

```
Continue implementing the L4YERCAK3 SMS VLN Stripe workstream.

Read the handoff doc at: docs/infobip/VLN_STRIPE_WORKSTREAM.md

The alphanumeric sender flow is complete. The VLN wizard UI is complete but the
"Subscribe & Purchase" button is a placeholder. I need you to:

1. Create `src/app/api/stripe/create-sms-checkout/route.ts` — Next.js API route
   that reads VLN pricing from the org's platform_sms_config, creates dynamic
   Stripe prices, and returns a Checkout Session URL. Follow the pattern in
   `src/app/api/stripe/create-checkout/route.ts` and use `getOrCreateCustomer`
   from `convex/stripe/platformCheckout.ts`.

2. Wire the frontend button in `platform-sms-settings.tsx` — replace the "Coming
   Soon" placeholder with a fetch to `/api/stripe/create-sms-checkout` that
   redirects to Stripe Checkout.

3. Add webhook handlers in `convex/stripe/platformWebhooks.ts`:
   - In handleCheckoutCompleted: if type === "sms-number", call activateVln +
     purchaseInfobipNumber
   - In handleSubscriptionDeleted: if type === "sms-number", set VLN status
     to "cancelled"

4. Fix disconnectPlatformSms in `convex/channels/platformSms.ts` to cancel
   the Stripe subscription when disconnecting a VLN.

5. Run `npx tsc --noEmit` to verify zero type errors.

Key files to read first:
- docs/infobip/VLN_STRIPE_WORKSTREAM.md (this handoff doc)
- convex/channels/platformSms.ts (existing backend)
- convex/stripe/platformCheckout.ts (Stripe patterns)
- convex/stripe/platformWebhooks.ts (webhook handlers)
- src/components/window-content/integrations-window/platform-sms-settings.tsx (UI)
- src/app/api/stripe/create-checkout/route.ts (existing checkout route pattern)
```
