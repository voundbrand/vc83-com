# Stripe Invoice Detection Testing Guide

## Overview

This document explains how to test the Stripe Invoicing capability detection feature in vc83-com. The implementation checks if a Stripe Connect account has invoicing enabled and syncs settings accordingly.

## What Was Implemented

### Files Modified

1. **[convex/stripeConnect.ts:703-790](convex/stripeConnect.ts#L703-L790)** - Invoice capability detection in `refreshAccountStatusFromStripe`
2. **[convex/organizationInvoiceSettings.ts](convex/organizationInvoiceSettings.ts)** - Invoice settings storage and management
3. **[convex/paymentProviders/stripe.ts](convex/paymentProviders/stripe.ts)** - Invoice webhook handlers

### Detection Logic (Based on Reference Project)

The implementation checks three key criteria:

1. **Invoicing Capability**: `account.capabilities.invoicing === 'active'`
2. **Business Profile**: Account must have either `business_profile.name` OR `company.name`
3. **Optional**: Checks if any invoices exist (non-blocking)

Only if criteria #1 AND #2 are met, invoicing is considered enabled.

## Stripe CLI Testing

### Prerequisites

```bash
# Install Stripe CLI if not installed
brew install stripe/stripe-cli/stripe

# Login to Stripe
stripe login
```

### Test Commands

#### 1. Check Account Capabilities

```bash
# Get your connected account ID from your Stripe Dashboard
ACCOUNT_ID="acct_xxxxxxxxxxxxx"

# Retrieve account with capabilities
stripe accounts retrieve $ACCOUNT_ID --expand capabilities

# Look for the "invoicing" capability in the output:
# "capabilities": {
#   "card_payments": "active",
#   "invoicing": "active",  <-- This is what we check
#   "transfers": "active"
# }
```

#### 2. Check Business Profile

```bash
# Check if business profile is set up
stripe accounts retrieve $ACCOUNT_ID | grep -A 5 "business_profile"

# Should see something like:
# "business_profile": {
#   "name": "Your Business Name",
#   ...
# }
```

#### 3. List Invoices (Optional Check)

```bash
# Check if account has created any invoices
stripe invoices list --limit 1 --stripe-account $ACCOUNT_ID

# If invoices exist, you'll see invoice data
# If not: {"data": [], ...}
```

#### 4. Enable Invoicing Capability

If invoicing capability is NOT active, you may need to:

```bash
# Option 1: Enable via Stripe Dashboard
# Go to: Connect → Settings → Capabilities → Enable "Invoicing"

# Option 2: Contact Stripe Support
# Some accounts require manual enablement by Stripe
```

#### 5. Set Up Business Profile

```bash
# Update business profile via CLI
stripe accounts update $ACCOUNT_ID \
  --business-profile[name]="Your Business Name" \
  --business-profile[url]="https://yourbusiness.com"

# Or update company information
stripe accounts update $ACCOUNT_ID \
  --company[name]="Your Company LLC"
```

## Testing in vc83-com

### 1. UI Testing (Payments Window)

1. Navigate to the Payments window in vc83-com
2. Go to the Stripe Connect section
3. Click the "Refresh" button to trigger `refreshAccountStatusFromStripe`
4. Check browser console for detailed logs:

```
🔍 Checking Stripe Invoicing capability...
📋 Account capabilities: { "invoicing": "active", ... }
💳 Invoicing capability status: active
💳 Has invoicing capability: true
🏢 Business profile name: Your Business
🏢 Has business profile: true
📄 Has created invoices: false
🎯 Overall invoicing enabled: true
✅ Synced invoice settings from Stripe
```

### 2. Expected Behaviors

#### When Invoicing IS Enabled:
- ✅ `capabilities.invoicing === 'active'`
- ✅ Business profile exists
- ✅ Console shows: "Overall invoicing enabled: true"
- ✅ Invoice settings are synced to database
- ✅ UI shows invoice options (future enhancement)

#### When Invoicing is NOT Enabled:
- ❌ Missing invoicing capability OR missing business profile
- ℹ️ Console shows: "Invoicing not enabled - requirements not met"
- ℹ️ Console shows: "Missing requirements for invoicing: [list]"
- ❌ No invoice settings synced
- ❌ Invoice features remain hidden in UI

### 3. Database Verification

Check if settings were stored correctly:

```typescript
// In Convex dashboard, run:
db.query("organization_legal")
  .filter(q => q.eq(q.field("organization_id"), YOUR_ORG_ID))
  .first()

// Check customProperties.invoiceSettings:
{
  invoicingEnabled: true,
  collectionMethod: "send_invoice",
  paymentTerms: "net_30",
  autoAdvance: true,
  daysUntilDue: 30,
  defaultPaymentMethods: [],
  customFooter: "",
  automaticTax: false
}
```

## Common Issues & Solutions

### Issue 1: "invoicing capability not active"

**Solution:**
- Check if the capability is available for your account type
- Standard Connect accounts may need to request this capability
- Contact Stripe support to enable invoicing

**Stripe CLI Check:**
```bash
stripe accounts retrieve $ACCOUNT_ID --expand capabilities | grep invoicing
```

### Issue 2: "business profile incomplete"

**Solution:**
- Add business name in Stripe Dashboard: Settings → Business Settings
- Or update via CLI (see command above)

**Stripe CLI Check:**
```bash
stripe accounts retrieve $ACCOUNT_ID | grep -A 10 business_profile
```

### Issue 3: Cannot access connected account

**Solution:**
- Ensure `STRIPE_SECRET_KEY` is set in environment
- Verify account ID is correct
- Check if account has proper permissions

**Stripe CLI Check:**
```bash
stripe accounts retrieve $ACCOUNT_ID
```

## Implementation Details

### Key Code Sections

**1. Capability Check ([stripeConnect.ts:724-730](convex/stripeConnect.ts#L724-L730))**
```typescript
const capabilities = accountWithCapabilities.capabilities as Record<string, string | undefined>;
const hasInvoicingCapability = capabilities?.invoicing === "active";
```

**2. Business Profile Check ([stripeConnect.ts:732-740](convex/stripeConnect.ts#L732-L740))**
```typescript
const hasBusinessProfile = !!(
  accountWithCapabilities.business_profile?.name ||
  accountWithCapabilities.company?.name
);
```

**3. Overall Status ([stripeConnect.ts:756-757](convex/stripeConnect.ts#L756-L757))**
```typescript
const isInvoicingEnabled = hasInvoicingCapability && hasBusinessProfile;
```

### Type Definition

The implementation uses a type cast for the invoicing capability:

```typescript
const capabilities = accountWithCapabilities.capabilities as Record<string, string | undefined>;
```

This is necessary because TypeScript's default Stripe types don't include the `invoicing` capability (it's not in all account types).

## Next Steps

### Immediate (Testing Phase)
- ✅ Run Stripe CLI commands to verify your account setup
- ⏳ Test refresh button in UI
- ⏳ Verify console logs show correct detection
- ⏳ Check database for synced settings

### Future Enhancements
- [ ] Add UI section to display invoice settings
- [ ] Add "Enable Invoicing" button for accounts without capability
- [ ] Show helpful instructions when requirements aren't met
- [ ] Add invoice creation/management features

## References

- **Reference Implementation**: `.kiro/projects_for_reference/eventrrr-beta-0.0.1/app/actions/checkStripeInvoicingStatus.ts`
- **Stripe API Docs**: https://stripe.com/docs/api/accounts/retrieve
- **Stripe Invoicing Guide**: https://stripe.com/docs/invoicing
- **Capabilities Documentation**: https://stripe.com/docs/connect/account-capabilities

## Testing Checklist

- [ ] Stripe CLI installed and authenticated
- [ ] Retrieved account with capabilities expanded
- [ ] Verified `invoicing` capability status
- [ ] Verified business profile exists
- [ ] Tested refresh button in UI
- [ ] Checked console logs for detection results
- [ ] Verified database settings storage
- [ ] Tested with account that has invoicing enabled
- [ ] Tested with account that does NOT have invoicing enabled

---

**Last Updated**: 2025-10-16
**Implementation Status**: ✅ Backend Complete | ⏳ UI Pending | ⏳ Testing In Progress
