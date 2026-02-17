# Stripe OAuth Setup Guide

## Required Environment Variable

To enable Stripe Connect OAuth (which allows organizations to connect their existing Stripe accounts), you need to add the following environment variable:

```bash
# Stripe Connect OAuth
STRIPE_CLIENT_ID=ca_xxxxxxxxxxxxxxxxxxxxx
```

## How to Get Your Stripe Client ID

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/)
2. Navigate to **Settings** → **Connect**
3. Find your **Client ID** under "OAuth settings"
4. Copy it and add to your `.env.local` file

## Test vs Live Mode

- **Test Mode**: Use test mode client ID (starts with `ca_` for test)
- **Live Mode**: Use live mode client ID for production

## What This Enables

With OAuth configured, when organizations connect their Stripe account, they can:
- ✅ **Sign in** to their existing Stripe account
- ✅ **Create a new** Stripe account if they don't have one
- ✅ **Full control** over their Stripe account (Standard Connect)

Without OAuth (old flow), it would only create new accounts.

## Environment Variable Example

```bash
# .env.local (for local development with test mode)
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxx
STRIPE_CLIENT_ID=ca_xxxxxxxxxxxxxxxxxxxxx  # NEW: Required for OAuth
```

```bash
# .env.prod (for production with live mode)
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxx
STRIPE_CLIENT_ID=ca_xxxxxxxxxxxxxxxxxxxxx  # NEW: Required for OAuth
```

## OAuth Return URL

The OAuth flow returns users to:
```
{APP_URL}?code={auth_code}&state={org_id}&openWindow=payments&tab=stripe
```

This is automatically handled by the frontend component.
