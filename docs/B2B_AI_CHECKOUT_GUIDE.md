# B2B AI Subscription Checkout Guide

## Overview

The AI subscription checkout now supports **B2B (Business-to-Business) purchases** with:
- ✅ Tax ID collection (EU VAT, UK VAT, US EIN, etc.)
- ✅ Automatic EU reverse charge for valid VAT numbers
- ✅ Company billing information
- ✅ Business addresses
- ✅ Proper invoicing with tax compliance
- ✅ Automatic sync to organization billing details

## Features

### 1. Tax ID Collection
Organizations can provide their tax registration number during checkout:
- **EU VAT** (e.g., "DE123456789")
- **UK VAT** (e.g., "GB123456789")
- **US EIN** (e.g., "12-3456789")
- **Other country tax IDs**

### 2. Automatic Tax Calculation
Stripe Tax automatically:
- **Validates tax IDs** in real-time
- **Applies EU reverse charge** for B2B transactions with valid VAT
- **Calculates correct tax rates** based on customer location
- **Handles cross-border transactions** correctly

### 3. Billing Data Sync
After checkout, billing information is automatically synced to:
- **Stripe Customer** record
- **organization_legal** object in database
- Contains: tax IDs, addresses, company name, email

---

## API Changes

### Enhanced `createAICheckoutSession` Action

**New Optional Parameters:**

```typescript
{
  // Existing parameters
  organizationId: Id<"organizations">,
  organizationName: string,
  email: string,
  tier: "standard" | "privacy-enhanced",
  successUrl: string,
  cancelUrl: string,

  // NEW B2B Parameters
  isB2B?: boolean,                    // Enable B2B mode
  taxId?: string,                     // Company tax ID (e.g., "DE123456789")
  taxIdType?: string,                 // Tax ID type (e.g., "eu_vat", "gb_vat", "us_ein")
  companyName?: string,               // Legal business name for invoice
  billingAddress?: {                  // Company billing address
    line1: string,
    line2?: string,
    city: string,
    state?: string,
    postalCode: string,
    country: string,                  // ISO 2-letter code (e.g., "DE", "GB", "US")
  }
}
```

### Example: B2B Checkout

```typescript
// Create B2B checkout for a German company
const result = await ctx.runAction(api.stripe.aiCheckout.createAICheckoutSession, {
  organizationId: "kn7024kr1pag4ck3haeqaf29zs7sfd78",
  organizationName: "Acme GmbH",
  email: "billing@acme.de",
  tier: "standard",
  successUrl: "https://app.l4yercak3.com/billing/success",
  cancelUrl: "https://app.l4yercak3.com/billing/cancel",

  // B2B fields
  isB2B: true,
  taxId: "DE123456789",
  taxIdType: "eu_vat",
  companyName: "Acme GmbH",
  billingAddress: {
    line1: "Hauptstraße 1",
    city: "Berlin",
    postalCode: "10115",
    country: "DE",
  },
});

// Returns: { checkoutUrl, sessionId }
```

---

## Webhook Events

### New: `checkout.session.completed`

The AI webhook endpoint now listens for `checkout.session.completed` events to capture billing details.

**What it does:**
1. Extracts tax IDs entered during checkout
2. Extracts billing address from customer details
3. Syncs data to `organization_legal` object
4. Logs B2B tax information for audit trail

**Webhook URL:** `https://[deployment].convex.cloud/stripe-ai-webhooks`

**Events to enable in Stripe Dashboard:**
- ✅ `checkout.session.completed` (NEW!)
- ✅ `customer.subscription.created`
- ✅ `customer.subscription.updated`
- ✅ `customer.subscription.deleted`
- ✅ `invoice.payment_succeeded`
- ✅ `invoice.payment_failed`

---

## Data Storage

### Stripe Customer Record

B2B information is stored in the Stripe Customer:

```json
{
  "id": "cus_xxx",
  "name": "Acme GmbH",
  "email": "billing@acme.de",
  "address": {
    "line1": "Hauptstraße 1",
    "city": "Berlin",
    "postal_code": "10115",
    "country": "DE"
  },
  "tax_ids": [{
    "type": "eu_vat",
    "value": "DE123456789"
  }],
  "metadata": {
    "organizationId": "kn7024kr1pag4ck3haeqaf29zs7sfd78",
    "platform": "l4yercak3",
    "isB2B": "true"
  }
}
```

### organization_legal Object

Billing details are synced to the ontology system:

```json
{
  "_id": "xxx",
  "organizationId": "kn7024kr1pag4ck3haeqaf29zs7sfd78",
  "type": "organization_legal",
  "subtype": "billing_entity",
  "name": "Acme GmbH Billing",
  "status": "active",
  "customProperties": {
    "legalName": "Acme GmbH",
    "isB2B": true,
    "billingEmail": "billing@acme.de",
    "billingName": "Acme GmbH",
    "billingAddress": {
      "line1": "Hauptstraße 1",
      "city": "Berlin",
      "postalCode": "10115",
      "country": "DE"
    },
    "taxIds": [{
      "type": "eu_vat",
      "value": "DE123456789"
    }],
    "lastSyncedFromStripe": 1733141234000
  }
}
```

---

## Tax Scenarios

### Scenario 1: EU B2B with Valid VAT
**Customer:** German company with valid VAT ID `DE123456789`
**Result:** EU reverse charge applies, €0 VAT charged
**Invoice:** Shows "Reverse charge - VAT will be accounted for by the recipient"

### Scenario 2: EU B2B with Invalid VAT
**Customer:** German company with invalid/unverified VAT ID
**Result:** Standard German VAT (19%) applies
**Invoice:** Shows VAT at normal rate

### Scenario 3: Non-EU B2B
**Customer:** US company with EIN
**Result:** No EU VAT, local tax rules apply
**Invoice:** May show US sales tax depending on nexus

### Scenario 4: EU B2C (Consumer)
**Customer:** Individual consumer in France
**Result:** French VAT (20%) applies
**Invoice:** VAT included in price (€49.00 incl. VAT)

---

## Frontend Implementation

### Basic B2C Checkout (Current)

```typescript
// Simple consumer checkout
const handleSubscribe = async () => {
  const result = await createCheckout({
    tier: "standard",
    organizationName: "My Workspace",
    email: "user@example.com",
  });

  // Redirect to Stripe Checkout
  window.location.href = result.checkoutUrl;
};
```

### Enhanced B2B Checkout

```typescript
// B2B checkout with company details
const handleBusinessSubscribe = async (companyInfo: CompanyInfo) => {
  const result = await createCheckout({
    tier: "standard",
    organizationName: companyInfo.name,
    email: companyInfo.email,

    // Add B2B details
    isB2B: true,
    taxId: companyInfo.vatNumber,
    taxIdType: "eu_vat",
    companyName: companyInfo.legalName,
    billingAddress: {
      line1: companyInfo.address.street,
      city: companyInfo.address.city,
      postalCode: companyInfo.address.zip,
      country: companyInfo.address.countryCode,
    },
  });

  // Redirect to Stripe Checkout
  window.location.href = result.checkoutUrl;
};
```

### UI Recommendations

1. **Add "Business Subscription" toggle** in checkout form
2. **Show VAT ID field** when B2B mode is enabled
3. **Validate VAT format** client-side before submission
4. **Pre-fill company details** from organization profile if available
5. **Show "Reverse charge" message** for EU B2B customers

---

## Testing

### Test with Stripe Test Mode

**Test VAT Numbers:**
- **Valid EU VAT:** `DE123456789` (Germany)
- **Valid UK VAT:** `GB123456789` (United Kingdom)
- **Invalid VAT:** `XX123456789` (Will show as unverified)

**Test Cards:**
- **Success:** `4242 4242 4242 4242`
- **Requires 3D Secure:** `4000 0027 6000 3184`
- **Declined:** `4000 0000 0000 0002`

### Expected Behaviors

1. **With valid EU VAT:**
   - Checkout shows "Reverse charge will apply"
   - Invoice amount: €49.00 (no VAT line item)
   - Subscription created successfully
   - Tax ID synced to organization_legal

2. **With invalid EU VAT:**
   - Checkout shows local VAT rate (e.g., 19% for Germany)
   - Invoice amount: €49.00 including VAT
   - Subscription created
   - Tax ID still stored but marked as unverified

3. **Without VAT (B2C):**
   - Checkout shows local VAT rate
   - Invoice amount: €49.00 including VAT
   - Subscription created
   - No tax ID stored

---

## Compliance Notes

### GDPR
- Tax IDs and billing addresses are processed for billing purposes only
- Data is stored securely in both Stripe and Convex
- Organizations can request deletion via customer portal

### VAT Compliance
- EU reverse charge is applied automatically for valid B2B transactions
- Stripe handles VAT MOSS (Mini One-Stop Shop) reporting
- Invoices include all required VAT information

### Data Retention
- Billing details are retained for 7 years (legal requirement)
- After subscription cancellation, data remains for accounting purposes
- Organizations can export their billing data anytime

---

## Troubleshooting

### Issue: Tax ID not recognized
**Cause:** Invalid format or tax ID doesn't exist in EU VIES system
**Solution:** Customer should verify their VAT number at https://ec.europa.eu/taxation_customs/vies/

### Issue: Reverse charge not applied
**Cause:** Tax ID is invalid or checkout wasn't flagged as B2B
**Solution:** Ensure `isB2B: true` and provide valid VAT number

### Issue: Billing details not synced
**Cause:** Webhook `checkout.session.completed` not reaching endpoint
**Solution:** Check Stripe Dashboard → Webhooks → Recent deliveries

### Issue: Address validation failed
**Cause:** Invalid country code or missing required fields
**Solution:** Use ISO 2-letter country codes (e.g., "DE", "GB", "US")

---

## Migration Guide

### For Existing Subscriptions

Existing subscriptions without B2B data will continue to work normally. To add B2B details:

1. Update Stripe Customer with tax ID:
```typescript
await stripe.customers.update(customerId, {
  tax_id_data: [{
    type: "eu_vat",
    value: "DE123456789"
  }]
});
```

2. Manually create organization_legal object with billing details
3. Or have customer go through checkout flow again (will update existing subscription)

---

## Future Enhancements

- [ ] Customer portal to update billing details
- [ ] Automatic VAT number validation before checkout
- [ ] Support for multi-currency (currently EUR only)
- [ ] Automatic invoice generation with company letterhead
- [ ] Integration with accounting systems (QuickBooks, Xero)

---

**Last Updated:** 2025-12-02
**Status:** Production Ready
**Author:** Claude Code AI Assistant
