# Payment Provider Setup Guide

## Problem
Payment providers are not showing up in checkout because they're stored in the wrong format.

**Old Format** (not working): `organizations.paymentProviders[]` array
**New Format** (working): `objects` table with `type: "payment_provider_config"`

## Solution: Run Migration

### Step 1: Check Current Setup

Run this in your Convex dashboard console (Functions tab → Query Console):

```typescript
// Check your organization
api.organizations.getById({
  sessionId: "your-session-id",
  organizationId: "your-org-id"
})

// Check existing provider configs
api.paymentProviders.helpers.getAvailableProviders({
  organizationId: "your-org-id"
})
```

### Step 2: Find Your Organization ID

1. Go to Convex Dashboard → Data → `organizations` table
2. Find your organization by slug (e.g., "voundbrand")
3. Copy the `_id` field

### Step 3: Run Migration

In Convex Dashboard → Functions tab → Action Console:

```typescript
internal.migrations.migratePaymentProviders.migratePaymentProviders({
  organizationId: "YOUR_ORG_ID_HERE"
})
```

**OR** migrate all organizations at once:

```typescript
internal.migrations.migratePaymentProviders.migrateAllOrganizations({})
```

### Step 4: Verify Setup

After migration, check that providers exist:

```typescript
api.paymentProviderOntology.getProvidersForOrg({
  sessionId: "your-session-id",
  organizationId: "your-org-id"
})
```

You should see objects like:

```json
[
  {
    "_id": "...",
    "name": "Stripe Connect",
    "providerCode": "stripe-connect",
    "status": "active",
    "isDefault": true
  },
  {
    "_id": "...",
    "name": "Invoice (Pay Later)",
    "providerCode": "invoice",
    "status": "active",
    "isDefault": false
  }
]
```

## What the Migration Does

1. **Finds Stripe Connect**: Looks for `org.stripeConnectAccountId` and creates a provider config
2. **Checks Invoicing App**: If you have `app_invoicing` enabled, creates invoice provider
3. **Migrates Old Array**: If you had `org.paymentProviders[]`, migrates those too
4. **Sets Defaults**: First provider found becomes default

## Manual Registration (Alternative)

If migration doesn't work, you can manually register providers:

### Register Stripe (after onboarding complete):

```typescript
api.paymentProviderOntology.registerStripeProvider({
  sessionId: "your-session-id",
  organizationId: "your-org-id",
  accountId: "acct_YOUR_STRIPE_ACCOUNT",
  isTestMode: false
})
```

### Register Invoice Payment:

```typescript
api.paymentProviderOntology.registerInvoiceProvider({
  sessionId: "your-session-id",
  organizationId: "your-org-id"
})
```

## Debugging

### Check if providers exist in database:

Go to Convex Dashboard → Data → `objects` table:
- Filter: `type = "payment_provider_config"`
- Filter: `organizationId = YOUR_ORG_ID`
- Filter: `status = "active"`

You should see entries with `customProperties.providerCode` set to "stripe-connect" or "invoice".

### Common Issues:

1. **"Invoice provider requires Invoicing app"**
   - Solution: Enable the Invoicing app first
   - Run: `api.seedApps.enableInvoicingForOrg({ sessionId, organizationId })`

2. **"Providers exist but not showing in checkout"**
   - Check browser console for errors
   - Verify `getAvailableProviders` query returns data
   - Check that checkout is using the correct organization ID

3. **"Stripe not migrating"**
   - Check if `org.stripeConnectAccountId` field exists
   - May need to complete Stripe Connect onboarding first

## Next Steps After Migration

1. **Test Checkout**: Go to your checkout page and verify both providers appear
2. **Set Default**: Use `api.paymentProviderOntology.setDefaultProvider()` if needed
3. **Update Checkout Config**: Edit existing checkouts to include both providers

## Questions to Answer

For debugging, please provide:

1. **Organization Slug**: _____________
2. **Organization ID**: _____________
3. **Stripe Connected?**: Yes / No
4. **Stripe Account ID** (if yes): acct_____________
5. **Invoicing App Enabled?**: Yes / No
6. **Existing `payment_provider_config` objects**: _____ (count)
