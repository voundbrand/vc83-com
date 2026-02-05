# Stripe Setup Guide - New Pricing Architecture v2.0

> Step-by-step instructions for creating all Stripe products, prices, and configuring webhooks for the 4-tier credit-based pricing model.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Prerequisites](#2-prerequisites)
3. [Step 1: Create Products](#3-step-1-create-products)
4. [Step 2: Create Prices](#4-step-2-create-prices)
5. [Step 3: Set Convex Environment Variables](#5-step-3-set-convex-environment-variables)
6. [Step 4: Configure Webhooks](#6-step-4-configure-webhooks)
7. [Step 5: Configure Tax Settings](#7-step-5-configure-tax-settings)
8. [Step 6: Delete Old Products](#8-step-6-delete-old-products)
9. [Step 7: Verify End-to-End](#9-step-7-verify-end-to-end)
10. [Environment Variable Reference](#10-environment-variable-reference)
11. [Troubleshooting](#11-troubleshooting)

---

## 1. Overview

### What We're Creating

| Category | Products | Prices | Type |
|----------|----------|--------|------|
| Platform Plans | 2 (Pro, Agency) | 4 (monthly + annual each) | Recurring subscription |
| Credit Packs | 1 (Credit Packs) | 4 (100, 500, 2000, 10000) | One-time payment |
| Sub-Org Add-on | 1 (Sub-Organization) | 1 (79 EUR/mo) | Recurring subscription |

**Total new: 4 Products, 9 Prices**

### Pricing Summary

| Item | Price | Billing | Currency |
|------|-------|---------|----------|
| Pro Monthly | 29.00 EUR | Recurring/month | EUR |
| Pro Annual | 290.00 EUR | Recurring/year | EUR |
| Agency Monthly | 299.00 EUR | Recurring/month | EUR |
| Agency Annual | 2,990.00 EUR | Recurring/year | EUR |
| Sub-Org Add-on | 79.00 EUR | Recurring/month | EUR |
| 100 Credits | 19.00 EUR | One-time | EUR |
| 500 Credits | 79.00 EUR | One-time | EUR |
| 2,000 Credits | 249.00 EUR | One-time | EUR |
| 10,000 Credits | 999.00 EUR | One-time | EUR |

---

## 2. Prerequisites

- [ ] Stripe account in **live mode** (or test mode for staging)
- [ ] Stripe Dashboard access with admin permissions
- [ ] Convex CLI installed (`npx convex`)
- [ ] Access to your Convex deployment dashboard

### Stripe Dashboard URL

- **Test mode**: https://dashboard.stripe.com/test
- **Live mode**: https://dashboard.stripe.com

> **Important**: Do everything in **test mode first**, verify it works, then repeat in live mode.

---

## 3. Step 1: Create Products

Go to **Stripe Dashboard > Products** and create the following products.

### Product 1: Pro Plan

| Field | Value |
|-------|-------|
| Name | `Pro Plan` |
| Description | `Full platform access with 200 monthly credits + 5 daily. For solo operators and small businesses.` |
| Tax category | `Software as a service (SaaS) - personal use` |
| Statement descriptor | `VC83 PRO` |

**Metadata** (add under "Additional options > Metadata"):

| Key | Value |
|-----|-------|
| `tier` | `pro` |
| `platform` | `l4yercak3` |
| `type` | `platform-tier` |
| `monthlyCredits` | `200` |
| `dailyCredits` | `5` |

### Product 2: Agency Plan

| Field | Value |
|-------|-------|
| Name | `Agency Plan` |
| Description | `Agency platform with 2,000 monthly credits + 5 daily. Sub-organizations, white label, custom domains.` |
| Tax category | `Software as a service (SaaS) - business use` |
| Statement descriptor | `VC83 AGENCY` |

**Metadata**:

| Key | Value |
|-----|-------|
| `tier` | `agency` |
| `platform` | `l4yercak3` |
| `type` | `platform-tier` |
| `monthlyCredits` | `2000` |
| `dailyCredits` | `5` |

### Product 3: Credit Packs

| Field | Value |
|-------|-------|
| Name | `Credit Packs` |
| Description | `Additional credits for agent execution and automation. Credits never expire while subscription is active.` |
| Tax category | `Software as a service (SaaS) - personal use` |
| Statement descriptor | `VC83 CREDITS` |

**Metadata**:

| Key | Value |
|-----|-------|
| `platform` | `l4yercak3` |
| `type` | `credit-pack` |

### Product 4: Sub-Organization Add-on

| Field | Value |
|-------|-------|
| Name | `Sub-Organization Add-on` |
| Description | `Additional sub-organization for Agency plan. Manage separate client environments.` |
| Tax category | `Software as a service (SaaS) - business use` |
| Statement descriptor | `VC83 SUB-ORG` |

**Metadata**:

| Key | Value |
|-----|-------|
| `platform` | `l4yercak3` |
| `type` | `sub-org-addon` |

---

## 4. Step 2: Create Prices

For each product created above, add the following prices.

### Pro Plan Prices

Go to the **Pro Plan** product page > **Add a price**.

#### Price 1: Pro Monthly

| Field | Value |
|-------|-------|
| Pricing model | Standard pricing |
| Amount | `29.00` |
| Currency | `EUR` |
| Billing period | `Monthly` |
| Price description | `Pro Plan - Monthly` |

**After creating, copy the Price ID** (starts with `price_`). This is `STRIPE_PRO_MO_PRICE_ID`.

#### Price 2: Pro Annual

| Field | Value |
|-------|-------|
| Pricing model | Standard pricing |
| Amount | `290.00` |
| Currency | `EUR` |
| Billing period | `Yearly` |
| Price description | `Pro Plan - Annual (save 17%)` |

**Copy the Price ID.** This is `STRIPE_PRO_YR_PRICE_ID`.

---

### Agency Plan Prices

Go to the **Agency Plan** product page > **Add a price**.

#### Price 3: Agency Monthly

| Field | Value |
|-------|-------|
| Pricing model | Standard pricing |
| Amount | `299.00` |
| Currency | `EUR` |
| Billing period | `Monthly` |
| Price description | `Agency Plan - Monthly` |

**Copy the Price ID.** This is `STRIPE_AGENCY_MO_PRICE_ID`.

#### Price 4: Agency Annual

| Field | Value |
|-------|-------|
| Pricing model | Standard pricing |
| Amount | `2990.00` |
| Currency | `EUR` |
| Billing period | `Yearly` |
| Price description | `Agency Plan - Annual (save 17%)` |

**Copy the Price ID.** This is `STRIPE_AGENCY_YR_PRICE_ID`.

---

### Credit Pack Prices

Go to the **Credit Packs** product page > **Add a price** for each:

#### Price 5: 100 Credits (Starter Pack)

| Field | Value |
|-------|-------|
| Pricing model | Standard pricing |
| Amount | `19.00` |
| Currency | `EUR` |
| One time | Yes (not recurring) |
| Price description | `100 Credits - Starter Pack` |

**Metadata** on this price:

| Key | Value |
|-----|-------|
| `packId` | `credits_100` |
| `credits` | `100` |

**Copy the Price ID.** This is `STRIPE_CREDITS_100_PRICE_ID`.

#### Price 6: 500 Credits (Standard Pack)

| Field | Value |
|-------|-------|
| Amount | `79.00` |
| Currency | `EUR` |
| One time | Yes |
| Price description | `500 Credits - Standard Pack (17% savings)` |

**Metadata**: `packId` = `credits_500`, `credits` = `500`

**Copy the Price ID.** This is `STRIPE_CREDITS_500_PRICE_ID`.

#### Price 7: 2,000 Credits (Pro Pack)

| Field | Value |
|-------|-------|
| Amount | `249.00` |
| Currency | `EUR` |
| One time | Yes |
| Price description | `2,000 Credits - Pro Pack (34% savings)` |

**Metadata**: `packId` = `credits_2000`, `credits` = `2000`

**Copy the Price ID.** This is `STRIPE_CREDITS_2000_PRICE_ID`.

#### Price 8: 10,000 Credits (Enterprise Pack)

| Field | Value |
|-------|-------|
| Amount | `999.00` |
| Currency | `EUR` |
| One time | Yes |
| Price description | `10,000 Credits - Enterprise Pack (47% savings)` |

**Metadata**: `packId` = `credits_10000`, `credits` = `10000`

**Copy the Price ID.** This is `STRIPE_CREDITS_10000_PRICE_ID`.

---

### Sub-Organization Add-on Price

Go to the **Sub-Organization Add-on** product page > **Add a price**.

#### Price 9: Sub-Org Monthly

| Field | Value |
|-------|-------|
| Pricing model | Standard pricing |
| Amount | `79.00` |
| Currency | `EUR` |
| Billing period | `Monthly` |
| Price description | `Additional Sub-Organization - Monthly` |

**Copy the Price ID.** This is `STRIPE_SUB_ORG_PRICE_ID`.

---

## 5. Step 3: Set Convex Environment Variables

Run these commands from your project root, replacing `price_xxx` with the actual Price IDs you copied.

```bash
# Platform Plans (Monthly)
npx convex env set STRIPE_PRO_MO_PRICE_ID price_xxx
npx convex env set STRIPE_AGENCY_MO_PRICE_ID price_xxx

# Platform Plans (Annual)
npx convex env set STRIPE_PRO_YR_PRICE_ID price_xxx
npx convex env set STRIPE_AGENCY_YR_PRICE_ID price_xxx

# Sub-Organization Add-on
npx convex env set STRIPE_SUB_ORG_PRICE_ID price_xxx

# Credit Packs (One-time)
npx convex env set STRIPE_CREDITS_100_PRICE_ID price_xxx
npx convex env set STRIPE_CREDITS_500_PRICE_ID price_xxx
npx convex env set STRIPE_CREDITS_2000_PRICE_ID price_xxx
npx convex env set STRIPE_CREDITS_10000_PRICE_ID price_xxx
```

### Verify all env vars are set

```bash
npx convex env list | grep STRIPE_
```

You should see these 9 new price IDs plus the existing ones:

```
STRIPE_SECRET_KEY          = sk_xxx
STRIPE_WEBHOOK_SECRET      = whsec_xxx (or from stripe listen)
STRIPE_AI_WEBHOOK_SECRET   = whsec_xxx
STRIPE_PRO_MO_PRICE_ID    = price_xxx
STRIPE_PRO_YR_PRICE_ID    = price_xxx
STRIPE_AGENCY_MO_PRICE_ID = price_xxx
STRIPE_AGENCY_YR_PRICE_ID = price_xxx
STRIPE_SUB_ORG_PRICE_ID   = price_xxx
STRIPE_CREDITS_100_PRICE_ID   = price_xxx
STRIPE_CREDITS_500_PRICE_ID   = price_xxx
STRIPE_CREDITS_2000_PRICE_ID  = price_xxx
STRIPE_CREDITS_10000_PRICE_ID = price_xxx
```

---

## 6. Step 4: Configure Webhooks

Platform subscription and credit pack webhooks are routed through the existing AI webhook endpoint at `/stripe-ai-webhooks`. The webhook handler in `convex/stripe/aiWebhooks.ts` automatically routes `customer.subscription.*` events to the platform webhook handler.

### Required Webhook Events

In Stripe Dashboard > **Developers > Webhooks**, ensure the endpoint at your Convex site URL + `/stripe-ai-webhooks` is configured to receive:

| Event | Purpose |
|-------|---------|
| `checkout.session.completed` | Captures billing details, triggers sales notifications |
| `customer.subscription.created` | New Pro/Agency subscription -> updates org tier + grants monthly credits |
| `customer.subscription.updated` | Tier upgrade/downgrade, renewal -> updates org tier + resets credits |
| `customer.subscription.deleted` | Cancellation -> reverts to Free tier |
| `payment_intent.succeeded` | Credit pack purchase -> adds purchased credits to balance |

### Webhook Endpoint URL

```
https://<YOUR_CONVEX_SITE>.convex.site/stripe-ai-webhooks
```

### Webhook Signing Secret

The signing secret for this endpoint goes in `STRIPE_AI_WEBHOOK_SECRET`.

```bash
npx convex env set STRIPE_AI_WEBHOOK_SECRET whsec_xxx
```

### Local Development with Stripe CLI

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to your local Convex site
stripe listen --forward-to https://<YOUR_CONVEX_DEV>.convex.site/stripe-ai-webhooks

# The CLI will print a webhook signing secret (whsec_...) - use that as STRIPE_AI_WEBHOOK_SECRET
npx convex env set STRIPE_AI_WEBHOOK_SECRET whsec_xxx_from_stripe_listen
```

### Credit Fulfillment Flow

When a credit pack purchase completes:

1. Stripe sends `checkout.session.completed` with `metadata.type = "credit-pack"`
2. The webhook handler reads `metadata.packId` and `metadata.credits`
3. It calls `internal.credits.index.addPurchasedCredits` to add credits to the org balance
4. Credits appear in the user's balance immediately

When a subscription is created/renewed:

1. Stripe sends `customer.subscription.created` with `metadata.tier = "pro"` or `"agency"`
2. The webhook handler calls `updateOrganizationTier()` to update the org plan
3. The handler should also call `internal.credits.index.grantMonthlyCredits` with the tier's monthly allocation
4. Monthly credits reset to full allocation for the new billing period

---

## 7. Step 5: Configure Tax Settings

### Stripe Tax (Automatic)

All checkout sessions have `automatic_tax: { enabled: true }` and `tax_id_collection: { enabled: true }`. For this to work:

1. Go to **Stripe Dashboard > Settings > Tax**
2. Enable **Stripe Tax**
3. Set your business address (EU-based)
4. Set your tax registration (EU VAT number)
5. Configure tax behavior: **Exclusive** (tax added on top of price) or **Inclusive** (tax included in price)

### Recommended: Tax Inclusive (EUR)

Since all prices are in EUR and marketed to EU customers, consider using **tax-inclusive pricing**. This means the displayed price (e.g., 29 EUR) already includes VAT.

- Go to each Price in Stripe and set **Tax behavior: Inclusive**
- Or set the default in **Settings > Tax > Defaults > Tax behavior: Inclusive**

### B2B Reverse Charge

The checkout flow supports B2B customers:
- `tax_id_collection: { enabled: true }` allows customers to enter their VAT number
- Stripe automatically applies reverse charge for valid intra-EU B2B transactions
- The `isB2B` metadata flag is set by the frontend when the customer identifies as a business

---

## 8. Step 6: Delete Old Products

> **Only do this after confirming no active subscribers exist on old plans.**

### Old Products to Archive/Delete

In Stripe Dashboard > Products, **archive** (don't delete - archive preserves history) these:

| Old Product | Old Price IDs to Archive |
|-------------|------------------------|
| Community Plan | `STRIPE_COMMUNITY_MO_PRICE_ID`, `STRIPE_COMMUNITY_YR_PRICE_ID` |
| Starter Plan | `STRIPE_STARTER_MO_PRICE_ID`, `STRIPE_STARTER_YR_PRICE_ID` |
| Professional Plan | `STRIPE_PROFESSIONAL_MO_PRICE_ID`, `STRIPE_PROFESSIONAL_YR_PRICE_ID` |
| Old Agency Plan (599 EUR) | Old `STRIPE_AGENCY_MO_PRICE_ID`, `STRIPE_AGENCY_YR_PRICE_ID` |
| Old Enterprise Plan | `STRIPE_ENTERPRISE_MO_PRICE_ID`, `STRIPE_ENTERPRISE_YR_PRICE_ID` |
| AI Standard Subscription | `STRIPE_AI_STANDARD_PRICE_ID` |
| AI Privacy-Enhanced Subscription | `STRIPE_AI_PRIVACY_ENHANCED_PRICE_ID` |
| Token Packs (old) | `STRIPE_TOKENS_STARTER_PRICE_ID`, `STRIPE_TOKENS_STANDARD_PRICE_ID`, `STRIPE_TOKENS_PRO_PRICE_ID`, `STRIPE_TOKENS_ENT_PRICE_ID` |

### Remove Old Convex Environment Variables

```bash
# Old platform plans
npx convex env unset STRIPE_FREE_MO_PRICE_ID
npx convex env unset STRIPE_COMMUNITY_MO_PRICE_ID
npx convex env unset STRIPE_COMMUNITY_YR_PRICE_ID
npx convex env unset STRIPE_STARTER_MO_PRICE_ID
npx convex env unset STRIPE_STARTER_YR_PRICE_ID
npx convex env unset STRIPE_PROFESSIONAL_MO_PRICE_ID
npx convex env unset STRIPE_PROFESSIONAL_YR_PRICE_ID
npx convex env unset STRIPE_ENTERPRISE_MO_PRICE_ID
npx convex env unset STRIPE_ENTERPRISE_YR_PRICE_ID

# Old AI subscriptions
npx convex env unset STRIPE_AI_STANDARD_PRICE_ID
npx convex env unset STRIPE_AI_PRIVACY_ENHANCED_PRICE_ID

# Old token packs
npx convex env unset STRIPE_TOKENS_STARTER_PRICE_ID
npx convex env unset STRIPE_TOKENS_STANDARD_PRICE_ID
npx convex env unset STRIPE_TOKENS_PRO_PRICE_ID
npx convex env unset STRIPE_TOKENS_ENT_PRICE_ID
```

> **Keep these** (still in use):
> - `STRIPE_SECRET_KEY`
> - `STRIPE_WEBHOOK_SECRET`
> - `STRIPE_AI_WEBHOOK_SECRET`
> - `STRIPE_CLIENT_ID` (Stripe Connect)

---

## 9. Step 7: Verify End-to-End

### Test Checklist

Use Stripe test mode with test card `4242 4242 4242 4242`.

#### Free Tier
- [ ] New user signs up -> gets Free tier
- [ ] Login grants 5 daily credits
- [ ] Daily credits reset next calendar day on login
- [ ] Agent actions deduct credits correctly
- [ ] Credit wall appears when credits exhausted

#### Pro Subscription
- [ ] Click "Subscribe to Pro" -> Stripe Checkout opens
- [ ] Complete checkout with test card
- [ ] Webhook fires -> org plan updated to "pro"
- [ ] 200 monthly credits granted
- [ ] Daily credits still grant on login (5/day)
- [ ] All Pro features unlocked

#### Agency Subscription
- [ ] Click "Subscribe to Agency" -> Stripe Checkout opens
- [ ] Complete checkout -> org plan updated to "agency"
- [ ] 2,000 monthly credits granted
- [ ] Sub-organization features available
- [ ] White label features available

#### Credit Pack Purchase
- [ ] Click "Buy 100 Credits" -> Stripe Checkout opens (one-time payment)
- [ ] Complete checkout -> 100 credits added to purchased balance
- [ ] Purchased credits consumed last (after daily + monthly)
- [ ] Purchased credits don't expire

#### Subscription Management
- [ ] Upgrade Pro -> Agency: immediate, prorated charge
- [ ] Downgrade Agency -> Pro: scheduled at period end
- [ ] Cancel to Free: `cancel_at_period_end`, reverts at end of billing cycle
- [ ] Cancel pending downgrade: schedule released

#### Annual Billing
- [ ] Pro Annual checkout: 290 EUR/year
- [ ] Agency Annual checkout: 2,990 EUR/year
- [ ] Credits granted for 12-month period

### Verify with Stripe CLI

```bash
# Trigger a test subscription event
stripe trigger customer.subscription.created

# Check Stripe logs
stripe logs tail

# Check specific webhook deliveries
stripe events list --limit 10
```

### Verify Convex State

After a test purchase, check in the Convex dashboard:

1. **organizations table**: `plan` field should be "pro" or "agency"
2. **objects table** (type=organization_license): `customProperties.planTier` should match
3. **creditBalances table**: `monthlyCredits` should be 200 (pro) or 2000 (agency)
4. **creditTransactions table**: Should show `monthly_grant` transaction

---

## 10. Environment Variable Reference

### Required (New)

| Variable | Example | Description |
|----------|---------|-------------|
| `STRIPE_PRO_MO_PRICE_ID` | `price_1Abc...` | Pro plan monthly price |
| `STRIPE_PRO_YR_PRICE_ID` | `price_1Def...` | Pro plan annual price |
| `STRIPE_AGENCY_MO_PRICE_ID` | `price_1Ghi...` | Agency plan monthly price |
| `STRIPE_AGENCY_YR_PRICE_ID` | `price_1Jkl...` | Agency plan annual price |
| `STRIPE_SUB_ORG_PRICE_ID` | `price_1Mno...` | Sub-org add-on monthly price |
| `STRIPE_CREDITS_100_PRICE_ID` | `price_1Pqr...` | 100 credit pack price |
| `STRIPE_CREDITS_500_PRICE_ID` | `price_1Stu...` | 500 credit pack price |
| `STRIPE_CREDITS_2000_PRICE_ID` | `price_1Vwx...` | 2,000 credit pack price |
| `STRIPE_CREDITS_10000_PRICE_ID` | `price_1Yza...` | 10,000 credit pack price |

### Required (Existing - Keep)

| Variable | Description |
|----------|-------------|
| `STRIPE_SECRET_KEY` | Stripe API secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe Connect webhook signing secret |
| `STRIPE_AI_WEBHOOK_SECRET` | Platform/AI webhook signing secret |
| `STRIPE_CLIENT_ID` | Stripe Connect OAuth client ID |

---

## 11. Troubleshooting

### "Price ID not configured" error

The checkout action throws this when an env var is missing. Check:

```bash
npx convex env list | grep STRIPE_PRO
```

If empty, set it:
```bash
npx convex env set STRIPE_PRO_MO_PRICE_ID price_xxx
```

### Webhook not firing

1. Check Stripe Dashboard > Developers > Webhooks > endpoint events
2. Make sure the endpoint URL is correct: `https://<site>.convex.site/stripe-ai-webhooks`
3. Check the signing secret matches `STRIPE_AI_WEBHOOK_SECRET`
4. For local dev, make sure `stripe listen` is running

### Credits not granted after subscription

The `updateOrganizationTier()` function in `platformWebhooks.ts` updates the tier and grants monthly credits. If credits are missing, verify:

1. Check `creditBalances` table for the org
2. Check `creditTransactions` table for `monthly_grant` entries
3. If missing, manually grant via Convex dashboard or super admin tools

### Old tier names in metadata

If a Stripe subscription has old metadata (e.g., `tier: "starter"`), the `TIER_MAP` in `platformWebhooks.ts` handles this:
- `starter` -> `pro`
- `professional` -> `agency`
- `community` -> `free`

No action needed - legacy tiers are automatically mapped.

### Webhook signature verification failed

This usually means `STRIPE_AI_WEBHOOK_SECRET` doesn't match the Stripe endpoint. Each endpoint has its own signing secret. For local dev with `stripe listen`, use the secret printed by the CLI.

---

## Quick Copy-Paste Checklist

```
[ ] Create Product: Pro Plan
[ ] Create Product: Agency Plan
[ ] Create Product: Credit Packs
[ ] Create Product: Sub-Organization Add-on
[ ] Create Price: Pro Monthly (29 EUR/mo)
[ ] Create Price: Pro Annual (290 EUR/yr)
[ ] Create Price: Agency Monthly (299 EUR/mo)
[ ] Create Price: Agency Annual (2990 EUR/yr)
[ ] Create Price: Sub-Org (79 EUR/mo)
[ ] Create Price: 100 Credits (19 EUR)
[ ] Create Price: 500 Credits (79 EUR)
[ ] Create Price: 2,000 Credits (249 EUR)
[ ] Create Price: 10,000 Credits (999 EUR)
[ ] Set 9 env vars in Convex
[ ] Verify webhook endpoint active
[ ] Test Pro checkout (test mode)
[ ] Test credit pack purchase (test mode)
[ ] Verify credits granted after subscription
[ ] Archive old Stripe products
[ ] Remove old env vars
```
