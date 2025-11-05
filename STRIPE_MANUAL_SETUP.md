# Manual Stripe Account Connection Guide

This guide shows you how to manually connect a Stripe account to an organization in your L4YERCAK3.com database.

## Overview

Your platform uses **TWO different Stripe integrations**:

1. **Stripe Customer** (for platform billing) - stored in `organizations.stripeCustomerId`
2. **Stripe Connect** (for organization's own payments) - stored in `objects` table as `payment_provider_config`

## What You Need

### For CTC NORDSTERN Organization:

From the old platform data you provided:
- **Organization Clerk ID**: `org_2vUHtOTvkJiKBDityiazM4cmWFq`
- **Organization Name**: CTC NORDSTERN
- **Billing Address**: Schulstr. 9, 17039 Sponholz

You still need to find:
- **Stripe Connect Account ID**: `acct_xxxxxxxxxxxxx` (from your Stripe Dashboard)
- **Test Mode**: `true` or `false`

---

## Step 1: Find the Stripe Account ID

### Option A: From Stripe Dashboard
1. Go to [Stripe Dashboard → Connect → Accounts](https://dashboard.stripe.com/connect/accounts)
2. Search for "CTC NORDSTERN" or the billing address
3. Click on the account
4. Copy the Account ID (starts with `acct_`)

### Option B: From Old Platform Database
If you have database access to the old platform:
```javascript
// Look for fields like:
organization.stripeConnectedAccountId
organization.stripe.accountId
organization.paymentProviders[0].accountId
```

---

## Step 2: Find Your Organization ID in New Database

Open the Convex dashboard and run this query:

```javascript
// In Convex Dashboard → Query
const { query } = require('./_generated/server');

// Find organization by Clerk ID (if you kept clerk integration)
await db.query("organizations")
  .filter(q => q.eq(q.field("clerkId"), "org_2vUHtOTvkJiKBDityiazM4cmWFq"))
  .first();

// OR find by name
await db.query("organizations")
  .filter(q => q.eq(q.field("name"), "CTC NORDSTERN"))
  .first();

// Copy the _id field (looks like: "j97abcd12345...")
```

---

## Step 3: Create the Payment Provider Config

### Method A: Using Convex Dashboard (Recommended)

1. Go to **Convex Dashboard → Data → objects table**
2. Click **"Insert Document"**
3. Paste this structure (replace values with your actual data):

```json
{
  "organizationId": "YOUR_ORG_ID_FROM_STEP_2",
  "type": "payment_provider_config",
  "name": "Stripe Connect",
  "description": "Accept credit card payments via Stripe",
  "status": "active",
  "customProperties": {
    "providerCode": "stripe-connect",
    "accountId": "acct_XXXXXXXXXXXXX",
    "isDefault": true,
    "isTestMode": false,
    "supportsB2B": true,
    "supportsB2C": true,
    "connectedAt": 1755251537248,
    "chargesEnabled": true,
    "payoutsEnabled": true
  },
  "createdBy": "YOUR_USER_ID",
  "createdAt": 1755251537248,
  "updatedAt": 1755251537248
}
```

### Method B: Using Convex Function

Alternatively, run this mutation in the Convex Dashboard:

```javascript
// In Convex Dashboard → Mutations
import { mutation } from './_generated/server';

export default mutation({
  handler: async (ctx) => {
    const orgId = "YOUR_ORG_ID_FROM_STEP_2"; // Replace
    const stripeAccountId = "acct_XXXXXXXXXXXXX"; // Replace

    return await ctx.db.insert("objects", {
      organizationId: orgId,
      type: "payment_provider_config",
      name: "Stripe Connect",
      description: "Accept credit card payments via Stripe",
      status: "active",
      customProperties: {
        providerCode: "stripe-connect",
        accountId: stripeAccountId,
        isDefault: true,
        isTestMode: false,
        supportsB2B: true,
        supportsB2C: true,
        connectedAt: Date.now(),
        chargesEnabled: true,
        payoutsEnabled: true,
      },
      createdBy: orgId, // Temporary - use real user ID if available
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});
```

---

## Step 4: (Optional) Add Stripe Customer ID

If you also want to track this organization as a Stripe customer for platform billing:

1. Go to **Convex Dashboard → Data → organizations table**
2. Find the CTC NORDSTERN organization
3. Click **Edit**
4. Add field:
   ```json
   {
     "stripeCustomerId": "cus_XXXXXXXXXXXXX"
   }
   ```

---

## Step 5: Verify the Connection

### Check in Convex Dashboard:

```javascript
// Query to verify payment provider
const org = await db.query("organizations")
  .filter(q => q.eq(q.field("name"), "CTC NORDSTERN"))
  .first();

const providers = await db.query("objects")
  .withIndex("by_org_type", q =>
    q.eq("organizationId", org._id)
     .eq("type", "payment_provider_config")
  )
  .collect();

console.log("Organization:", org);
console.log("Payment Providers:", providers);
```

### Expected Output:
```javascript
{
  _id: "...",
  name: "CTC NORDSTERN",
  slug: "ctc-nordstern",
  // ... other fields
}

// Payment Provider:
[{
  _id: "...",
  organizationId: "...",
  type: "payment_provider_config",
  name: "Stripe Connect",
  status: "active",
  customProperties: {
    providerCode: "stripe-connect",
    accountId: "acct_...",
    isDefault: true,
    // ... other fields
  }
}]
```

---

## Step 6: Test the Connection

### From Your Application:

1. **Login as CTC NORDSTERN organization**
2. **Navigate to Checkout app settings** (if available)
3. **Check Payment Methods** - Stripe should appear as "Connected"
4. **Try creating a test checkout** to verify payment processing works

### From Stripe Dashboard:

1. Go to your **Stripe Connect Dashboard**
2. Find the **CTC NORDSTERN account**
3. Check that:
   - ✅ Charges are enabled
   - ✅ Payouts are enabled
   - ✅ Account is not restricted

---

## Troubleshooting

### Provider Not Showing in UI?

Check that the `customProperties.isDefault` is set to `true` for at least one provider.

### Payments Not Working?

1. Verify `chargesEnabled: true` in the provider config
2. Check Stripe account status in Stripe Dashboard
3. Verify you're using the correct environment (test/live)

### Test Mode Issues?

Make sure `isTestMode` matches your Stripe keys:
- Test mode: Use `pk_test_...` and `sk_test_...`
- Live mode: Use `pk_live_...` and `sk_live_...`

---

## Complete Example for CTC NORDSTERN

Here's what the complete record should look like:

```json
{
  "_id": "ms7xxx...",
  "organizationId": "j97xxx...",
  "type": "payment_provider_config",
  "name": "Stripe Connect",
  "description": "Accept credit card payments via Stripe",
  "status": "active",
  "customProperties": {
    "providerCode": "stripe-connect",
    "accountId": "acct_1234567890ABCDEF",
    "isDefault": true,
    "isTestMode": false,
    "supportsB2B": true,
    "supportsB2C": true,
    "connectedAt": 1755251537248,
    "chargesEnabled": true,
    "payoutsEnabled": true,
    "metadata": {
      "businessName": "CTC NORDSTERN",
      "country": "DE",
      "currency": "EUR"
    }
  },
  "createdBy": "user_xxx...",
  "createdAt": 1755251537248,
  "updatedAt": 1755251537248
}
```

---

## Database Schema Reference

### Organizations Table (for billing):
```typescript
{
  stripeCustomerId: string | undefined // e.g., "cus_..."
}
```

### Objects Table (for Connect):
```typescript
{
  type: "payment_provider_config",
  organizationId: Id<"organizations">,
  customProperties: {
    providerCode: "stripe-connect",
    accountId: string, // e.g., "acct_..."
    isDefault: boolean,
    isTestMode: boolean,
    supportsB2B: boolean,
    supportsB2C: boolean,
    connectedAt: number,
    chargesEnabled?: boolean,
    payoutsEnabled?: boolean,
    metadata?: any
  }
}
```

---

## Need Help?

If you need assistance:
1. Check the Convex logs for any errors
2. Verify the Stripe account ID is correct
3. Make sure the organization exists in your database
4. Ensure the user has proper permissions
