# l4yercak3 Stripe Configuration Guide

**Version:** 2.0 (Updated with 14-day trials and Community Access)
**Date:** December 2025
**Purpose:** Complete specification for Stripe products, prices, and metadata for platform licensing

---

## ⚠️ IMPORTANT: How to Add 14-Day Trials to Existing Products

### You CANNOT Edit Existing Prices

Stripe does not allow you to add trial periods to existing prices. You must **create NEW prices** with trials.

### Step-by-Step Process

#### For Each Existing Product (Starter, Professional, Agency, Enterprise):

1. **Go to Stripe Dashboard** → Products → Select your product (e.g., "l4yercak3 Starter")

2. **Keep existing prices active** (for current customers)
   - Your existing customers will continue using the old prices
   - They won't be forced onto trials

3. **Create NEW price with trial:**
   - Click **"Add another price"**
   - Set amount (same as before): €199 for Starter, €399 for Pro, etc.
   - Set billing period: Monthly or Yearly
   - **NEW:** Check "Add a free trial"
   - Set trial period: **14 days**
   - Set nickname: "Starter Monthly (14-day trial)" or "Professional Annual (14-day trial)"
   - Save

4. **Update product metadata** (if not already updated):
   - Scroll to "Metadata" section
   - Add: `community_access_included` = `true`
   - Add: `skool_group_access` = `true`
   - Add: `courses_access` = `true`
   - Add: `templates_library_access` = `true`
   - Add: `weekly_calls_access` = `true`
   - Add: `trial_days` = `14`

5. **Update your codebase:**
   - Add new price IDs to environment variables
   - Update frontend to use new trial prices for new signups
   - Keep old prices for existing customer management

### Example: Starter Product After Updates

**Existing Prices** (keep active):
- `price_starter_monthly` (€199/mo, no trial) ← Existing customers
- `price_starter_annual` (€1,990/yr, no trial) ← Existing customers

**New Prices** (for new signups):
- `price_starter_monthly_trial` (€199/mo, 14-day trial) ← New customers
- `price_starter_annual_trial` (€1,990/yr, 14-day trial) ← New customers

### Why This Approach?

✅ Existing customers not disrupted
✅ New customers get trial experience
✅ Clean separation for billing logic
✅ Can roll back if needed

---

## Overview

This document defines all Stripe products, prices, and metadata needed to power l4yercak3's billing system. The metadata is used by webhooks to automatically provision and enforce license limits.

**NEW in v2.0:**
- Community Access product (€9/mo)
- 14-day trials for all paid tiers
- Community access included in Starter+ tiers

---

## Products to Create

### Product 1: l4yercak3 Community

| Field | Value |
|-------|-------|
| **Name** | l4yercak3 Community |
| **Description** | Access to Foundations Course, Templates Library, Weekly Live Calls, and Private Skool Group. Includes Free platform features. |
| **Product ID** | `prod_community` (or auto-generated) |
| **Tax Code** | `txcd_10103001` (SaaS - business use) |
| **Unit Label** | subscription |
| **Statement Descriptor** | L4YERCAK3 COMM |

#### Community Prices

**Monthly:**
| Field | Value |
|-------|-------|
| **Nickname** | Community Monthly (14-day trial) |
| **Amount** | €9.00 |
| **Currency** | EUR |
| **Billing Period** | Monthly |
| **Trial Period** | 14 days |
| **Price ID** | `price_community_monthly` (or auto-generated) |

**Annual:**
| Field | Value |
|-------|-------|
| **Nickname** | Community Annual (14-day trial) |
| **Amount** | €90.00 |
| **Currency** | EUR |
| **Billing Period** | Yearly |
| **Trial Period** | 14 days |
| **Price ID** | `price_community_annual` (or auto-generated) |

#### Community Metadata (Minimal Version)

```json
{
  "plan_tier": "community",
  "max_users": "1",
  "max_contacts": "100",
  "max_projects": "3",
  "storage_gb": "0.25",
  "community_access": "true"
}
```

**Note:** Trial period (14 days) is configured at the **Price** level, not in metadata.

#### Community Marketing Features

*Add these in Stripe Dashboard → Products → Community → Marketing features*

| Feature |
|---------|
| Foundations Course (full access) |
| Templates Library |
| Weekly Live Calls |
| Private Skool Group |
| Early Access Features |
| Free platform account (100 contacts, 1 user) |

---

### Product 2: l4yercak3 Starter

| Field | Value |
|-------|-------|
| **Name** | l4yercak3 Starter |
| **Description** | Full platform access for solo founders and small teams. 1,000 contacts, AI included, email support. |
| **Product ID** | `prod_starter` (or auto-generated) |
| **Tax Code** | `txcd_10103001` (SaaS - business use) |
| **Unit Label** | subscription |
| **Statement Descriptor** | L4YERCAK3 STARTER |

#### Starter Prices

**Monthly:**
| Field | Value |
|-------|-------|
| **Nickname** | Starter Monthly (14-day trial) |
| **Amount** | €199.00 |
| **Currency** | EUR |
| **Billing Period** | Monthly |
| **Trial Period** | 14 days |
| **Price ID** | `price_starter_monthly_trial` (or auto-generated) |

**Annual:**
| Field | Value |
|-------|-------|
| **Nickname** | Starter Annual (14-day trial) |
| **Amount** | €1,990.00 |
| **Currency** | EUR |
| **Billing Period** | Yearly |
| **Trial Period** | 14 days |
| **Price ID** | `price_starter_annual_trial` (or auto-generated) |

#### Starter Metadata (Minimal Version)

```json
{
  "plan_tier": "starter",
  "max_users": "3",
  "max_api_keys": "2",
  "max_custom_domains": "2",
  "max_contacts": "1000",
  "max_crm_organizations": "50",
  "max_projects": "20",
  "max_events": "20",
  "max_products": "50",
  "max_forms": "20",
  "max_invoices_per_month": "100",
  "max_published_pages": "5",
  "max_workflows": "10",
  "max_certificates": "200",
  "max_custom_templates": "10",
  "storage_gb": "5",
  "max_file_upload_mb": "50",
  "max_emails_per_month": "500",
  "ai_monthly_token_limit": "100000",
  "max_sub_orgs": "0",
  "max_webhooks": "5",
  "rate_limit_per_minute": "60",
  "rate_limit_per_day": "5000",
  "audit_log_retention_days": "30",
  "community_access_included": "true"
}
```

**Removed:** Boolean flags that can be inferred from numeric limits (e.g., `ai_enabled` inferred from `ai_monthly_token_limit > 0`, `sub_orgs_enabled` inferred from `max_sub_orgs > 0`). Trial period is at Price level, not metadata.

#### Starter Marketing Features

*Add these in Stripe Dashboard → Products → Starter → Marketing features*

| Feature |
|---------|
| **14-day free trial** |
| Up to 3 team members |
| 1,000 CRM contacts |
| 2 API keys |
| 2 custom domains |
| AI Assistant included |
| **Community access included (€9 value):** |
| • Foundations Course |
| • Templates Library |
| • Weekly Live Calls |
| • Private Skool Group |
| CRM & pipeline management |
| Invoicing & payments |
| Forms & registration |
| Email campaigns (500/mo) |
| 20 projects |
| 20 events |
| 10 workflows |
| 5 GB storage |
| Email support (48h) |

---

### Product 2: l4yercak3 Professional

| Field | Value |
|-------|-------|
| **Name** | l4yercak3 Professional |
| **Description** | For growing businesses and teams. 5,000 contacts, custom domain, advanced features. |
| **Product ID** | `prod_professional` (or auto-generated) |
| **Tax Code** | `txcd_10103001` (SaaS - business use) |
| **Unit Label** | subscription |
| **Statement Descriptor** | L4YERCAK3 PRO |

#### Professional Prices

**Monthly:**
| Field | Value |
|-------|-------|
| **Nickname** | Professional Monthly (14-day trial) |
| **Amount** | €399.00 |
| **Currency** | EUR |
| **Billing Period** | Monthly |
| **Trial Period** | 14 days |
| **Price ID** | `price_professional_monthly_trial` (or auto-generated) |

**Annual:**
| Field | Value |
|-------|-------|
| **Nickname** | Professional Annual (14-day trial) |
| **Amount** | €3,990.00 |
| **Currency** | EUR |
| **Billing Period** | Yearly |
| **Trial Period** | 14 days |
| **Price ID** | `price_professional_annual_trial` (or auto-generated) |

#### Professional Metadata (Minimal Version)

```json
{
  "plan_tier": "professional",
  "max_users": "10",
  "max_api_keys": "3",
  "max_custom_domains": "5",
  "max_contacts": "5000",
  "max_crm_organizations": "200",
  "max_projects": "-1",
  "max_events": "100",
  "max_products": "200",
  "max_forms": "100",
  "max_invoices_per_month": "500",
  "max_published_pages": "25",
  "max_workflows": "50",
  "max_certificates": "2000",
  "max_custom_templates": "50",
  "storage_gb": "25",
  "max_file_upload_mb": "100",
  "max_emails_per_month": "2500",
  "ai_monthly_token_limit": "500000",
  "max_sub_orgs": "0",
  "white_label_level": "badge_removal",
  "max_webhooks": "20",
  "rate_limit_per_minute": "120",
  "rate_limit_per_day": "25000",
  "audit_log_retention_days": "90",
  "community_access_included": "true"
}
```

**Removed:** Boolean enable flags (inferred from limits), descriptive fields. Kept `white_label_level` because it has multiple values ("badge_removal", "full", "none").

#### Professional Marketing Features

*Add these in Stripe Dashboard → Products → Professional → Marketing features*

| Feature |
|---------|
| **14-day free trial** |
| Everything in Starter, plus: |
| Up to 10 team members |
| 5,000 CRM contacts |
| 3 API keys |
| 5 custom domains |
| Badge removal (white-label) |
| **Community access included (€9 value):** |
| • Foundations Course |
| • Templates Library |
| • Weekly Live Calls |
| • Private Skool Group |
| Email campaigns (2,500/mo) |
| Unlimited projects |
| 100 events |
| 50 workflows |
| 25 GB storage |
| Microsoft/Google contact sync |
| Advanced reports & analytics |
| Custom roles & permissions |
| Auto-translation (6 languages) |
| Email support (24h) |

---

### Product 3: l4yercak3 Agency

| Field | Value |
|-------|-------|
| **Name** | l4yercak3 Agency |
| **Description** | For agencies and multi-client operators. Sub-organizations, white-label, priority support. |
| **Product ID** | `prod_agency` (or auto-generated) |
| **Tax Code** | `txcd_10103001` (SaaS - business use) |
| **Unit Label** | subscription |
| **Statement Descriptor** | L4YERCAK3 AGENCY |

#### Agency Prices

**Monthly (Base):**
| Field | Value |
|-------|-------|
| **Nickname** | Agency Monthly (14-day trial) |
| **Amount** | €599.00 |
| **Currency** | EUR |
| **Billing Period** | Monthly |
| **Trial Period** | 14 days |
| **Price ID** | `price_agency_monthly_trial` (or auto-generated) |

**Annual (Base):**
| Field | Value |
|-------|-------|
| **Nickname** | Agency Annual (14-day trial) |
| **Amount** | €5,990.00 |
| **Currency** | EUR |
| **Billing Period** | Yearly |
| **Trial Period** | 14 days |
| **Price ID** | `price_agency_annual_trial` (or auto-generated) |

#### Agency Metadata (Minimal Version)

```json
{
  "plan_tier": "agency",
  "max_users": "15",
  "max_api_keys": "5",
  "max_custom_domains": "7",
  "max_api_keys_per_sub_org": "1",
  "max_custom_domains_per_sub_org": "2",
  "max_contacts": "10000",
  "max_contacts_per_sub_org": "2000",
  "max_crm_organizations": "500",
  "max_projects": "-1",
  "max_events": "-1",
  "max_products": "-1",
  "max_forms": "-1",
  "max_invoices_per_month": "2000",
  "max_published_pages": "100",
  "max_workflows": "-1",
  "max_certificates": "10000",
  "max_custom_templates": "-1",
  "storage_gb": "50",
  "storage_gb_per_sub_org": "5",
  "max_file_upload_mb": "250",
  "max_emails_per_month": "10000",
  "ai_monthly_token_limit": "1000000",
  "sub_orgs_included": "2",
  "max_sub_orgs": "20",
  "white_label_level": "full",
  "max_webhooks": "50",
  "rate_limit_per_minute": "300",
  "rate_limit_per_day": "100000",
  "audit_log_retention_days": "180",
  "community_access_included": "true"
}
```

**Removed:** Boolean enable flags, descriptive fields. Kept `sub_orgs_included` (different from max) and `white_label_level` (enum value).

#### Agency Marketing Features

*Add these in Stripe Dashboard → Products → Agency → Marketing features*

| Feature |
|---------|
| **14-day free trial** |
| Everything in Professional, plus: |
| Up to 15 team members |
| 10,000 CRM contacts |
| 5 API keys |
| 7 custom domains |
| 2 sub-organizations included |
| Add more sub-orgs for €79/mo each |
| Full white-label |
| **Community access included (€9 value):** |
| • Foundations Course |
| • Templates Library |
| • Weekly Live Calls |
| • Private Skool Group |
| Email campaigns (10,000/mo) |
| Unlimited projects, events, workflows |
| 50 GB storage (+5 GB per sub-org) |
| Custom invoice templates |
| Template sharing |
| Priority support (12h) |

---

### Product 4: Agency Sub-Organization Add-On

| Field | Value |
|-------|-------|
| **Name** | Agency Sub-Organization |
| **Description** | Additional sub-organization for Agency plan. Includes 2,000 contacts, 5GB storage, 1 API key. |
| **Product ID** | `prod_agency_sub_org` (or auto-generated) |
| **Tax Code** | `txcd_10103001` (SaaS - business use) |
| **Unit Label** | sub-organization |
| **Statement Descriptor** | L4YERCAK3 SUB-ORG |

#### Sub-Organization Prices

**Monthly:**
| Field | Value |
|-------|-------|
| **Nickname** | Sub-Organization Monthly |
| **Amount** | €79.00 |
| **Currency** | EUR |
| **Billing Period** | Monthly |
| **Usage Type** | Licensed (quantity-based) |
| **Price ID** | `price_sub_org_monthly` (or auto-generated) |

**Annual:**
| Field | Value |
|-------|-------|
| **Nickname** | Sub-Organization Annual |
| **Amount** | €790.00 |
| **Currency** | EUR |
| **Billing Period** | Yearly |
| **Usage Type** | Licensed (quantity-based) |
| **Price ID** | `price_sub_org_annual` (or auto-generated) |

#### Sub-Organization Metadata (Minimal Version)

```json
{
  "addon_type": "sub_organization",
  "requires_plan": "agency",
  "contacts_per_unit": "2000",
  "storage_gb_per_unit": "5",
  "api_keys_per_unit": "1",
  "custom_domains_per_unit": "2"
}
```

#### Sub-Organization Marketing Features

*Add these in Stripe Dashboard → Products → Sub-Organization → Marketing features*

| Feature |
|---------|
| Separate client workspace |
| 2,000 additional contacts |
| 5 GB additional storage |
| 1 additional API key |
| 2 additional custom domains |
| Full white-label for client |
| Isolated data & settings |

---

### Product 5: Build Sprint

| Field | Value |
|-------|-------|
| **Name** | l4yercak3 Build Sprint |
| **Description** | 12-week high-touch implementation program. Includes 6 months Professional access. |
| **Product ID** | `prod_build_sprint` (or auto-generated) |
| **Tax Code** | `txcd_10103001` (SaaS - business use) |
| **Unit Label** | program |
| **Statement Descriptor** | L4YERCAK3 BUILD |

#### Build Sprint Prices

**Full Payment:**
| Field | Value |
|-------|-------|
| **Nickname** | Build Sprint - Full Payment |
| **Amount** | €12,500.00 |
| **Currency** | EUR |
| **Billing Period** | One-time |
| **Price ID** | `price_build_sprint_full` (or auto-generated) |

**Full Payment (10% Discount):**
| Field | Value |
|-------|-------|
| **Nickname** | Build Sprint - Full Payment (Discounted) |
| **Amount** | €11,250.00 |
| **Currency** | EUR |
| **Billing Period** | One-time |
| **Price ID** | `price_build_sprint_discounted` (or auto-generated) |

**Deposit (50%):**
| Field | Value |
|-------|-------|
| **Nickname** | Build Sprint - Deposit |
| **Amount** | €6,250.00 |
| **Currency** | EUR |
| **Billing Period** | One-time |
| **Price ID** | `price_build_sprint_deposit` (or auto-generated) |

**Second Payment (50%):**
| Field | Value |
|-------|-------|
| **Nickname** | Build Sprint - Second Payment |
| **Amount** | €6,250.00 |
| **Currency** | EUR |
| **Billing Period** | One-time |
| **Price ID** | `price_build_sprint_second` (or auto-generated) |

#### Build Sprint Metadata (Minimal Version)

```json
{
  "product_type": "build_sprint",
  "program_duration_weeks": "12",
  "included_plan_tier": "professional",
  "included_plan_duration_months": "6",
  "post_sprint_support_days": "30"
}
```

**Removed:** Boolean "included" flags (all Build Sprint services are included by definition).

#### Build Sprint Marketing Features

*Add these in Stripe Dashboard → Products → Build Sprint → Marketing features*

| Feature |
|---------|
| 12-week implementation program |
| Weekly 1:1 calls with founder |
| Full platform setup & configuration |
| Custom workflows built for you |
| Frontend integration support |
| Team training session |
| Custom documentation & runbook |
| 6 months Professional plan included |
| 30 days post-launch support |
| Slack/email support throughout |

---

### Product 6: AI Token Pack (Add-On)

| Field | Value |
|-------|-------|
| **Name** | AI Token Pack |
| **Description** | Additional AI tokens when your monthly limit runs out. 100,000 tokens. |
| **Product ID** | `prod_ai_tokens` (or auto-generated) |
| **Tax Code** | `txcd_10103001` (SaaS - business use) |
| **Unit Label** | pack |
| **Statement Descriptor** | L4YERCAK3 AI |

#### AI Token Pack Price

| Field | Value |
|-------|-------|
| **Nickname** | AI Token Pack (100K) |
| **Amount** | €49.00 |
| **Currency** | EUR |
| **Billing Period** | One-time |
| **Price ID** | `price_ai_tokens_100k` (or auto-generated) |

#### AI Token Pack Metadata (Minimal Version)

```json
{
  "addon_type": "ai_tokens",
  "tokens_included": "100000",
  "requires_plan": "starter,professional,agency,enterprise"
}
```

#### AI Token Pack Marketing Features

*Add these in Stripe Dashboard → Products → AI Token Pack → Marketing features*

| Feature |
|---------|
| 100,000 AI tokens |
| Use with any paid plan |
| Never expires |
| Instant activation |

---

### Product 7: AI Privacy-Enhanced (Add-On)

| Field | Value |
|-------|-------|
| **Name** | AI Privacy-Enhanced |
| **Description** | EU-sovereign AI processing with enhanced privacy controls. |
| **Product ID** | `prod_ai_privacy` (or auto-generated) |
| **Tax Code** | `txcd_10103001` (SaaS - business use) |
| **Unit Label** | subscription |
| **Statement Descriptor** | L4YERCAK3 AI PRV |

#### AI Privacy-Enhanced Prices

**Monthly:**
| Field | Value |
|-------|-------|
| **Nickname** | AI Privacy-Enhanced Monthly |
| **Amount** | €149.00 |
| **Currency** | EUR |
| **Billing Period** | Monthly |
| **Price ID** | `price_ai_privacy_monthly` (or auto-generated) |

**Annual:**
| Field | Value |
|-------|-------|
| **Nickname** | AI Privacy-Enhanced Annual |
| **Amount** | €1,490.00 |
| **Currency** | EUR |
| **Billing Period** | Yearly |
| **Price ID** | `price_ai_privacy_annual` (or auto-generated) |

#### AI Privacy-Enhanced Metadata (Minimal Version)

```json
{
  "addon_type": "ai_privacy_enhanced",
  "ai_tier": "privacy_enhanced",
  "data_residency": "eu",
  "requires_plan": "starter,professional,agency,enterprise"
}
```

#### AI Privacy-Enhanced Marketing Features

*Add these in Stripe Dashboard → Products → AI Privacy-Enhanced → Marketing features*

| Feature |
|---------|
| EU-sovereign AI processing |
| Data never leaves Europe |
| GDPR-compliant by design |
| Enhanced privacy controls |
| Audit trail for AI usage |
| Perfect for regulated industries |

---

## Webhook Events to Handle

Configure your webhook endpoint to handle these events:

### Subscription Events

| Event | Action |
|-------|--------|
| `customer.subscription.created` | Create/update organization license with plan metadata |
| `customer.subscription.updated` | Update organization license (plan change, quantity change) |
| `customer.subscription.deleted` | Downgrade to free tier or suspend |
| `customer.subscription.paused` | Suspend organization access |
| `customer.subscription.resumed` | Restore organization access |
| `customer.subscription.trial_will_end` | Send reminder email (if using trials) |

### Payment Events

| Event | Action |
|-------|--------|
| `invoice.paid` | Confirm subscription active, update billing status |
| `invoice.payment_failed` | Mark organization as past_due, send notification |
| `invoice.payment_action_required` | Send notification for 3D Secure |
| `checkout.session.completed` | Process one-time purchases (Build Sprint, AI tokens) |

### Customer Events

| Event | Action |
|-------|--------|
| `customer.created` | Link Stripe customer to organization |
| `customer.updated` | Sync customer details |
| `customer.deleted` | Handle customer deletion |

---

## Webhook Handler Logic

### On Subscription Created/Updated

```typescript
async function handleSubscriptionChange(subscription: Stripe.Subscription) {
  const organizationId = subscription.metadata.organization_id;
  const priceId = subscription.items.data[0].price.id;
  
  // Get product metadata from the price's product
  const price = await stripe.prices.retrieve(priceId, {
    expand: ['product']
  });
  const product = price.product as Stripe.Product;
  const metadata = product.metadata;
  
  // Update organization license
  await updateOrganizationLicense(organizationId, {
    planTier: metadata.plan_tier,
    billingStatus: subscription.status === 'active' ? 'active' : 'past_due',
    billingCycle: price.recurring?.interval === 'year' ? 'annual' : 'monthly',
    stripeSubscriptionId: subscription.id,
    stripeCustomerId: subscription.customer as string,
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    
    // Parse all limits from metadata
    core: {
      maxUsers: parseInt(metadata.max_users) || 1,
      maxApiKeys: parseInt(metadata.max_api_keys) || 1,
      // ... etc
    },
    crm: {
      maxContacts: parseInt(metadata.max_contacts) || 100,
      // ... etc
    },
    // ... all other modules
  });
  
  // Handle sub-organization add-ons (quantity-based)
  const subOrgItem = subscription.items.data.find(
    item => item.price.metadata?.addon_type === 'sub_organization'
  );
  if (subOrgItem) {
    const additionalSubOrgs = subOrgItem.quantity || 0;
    const includedSubOrgs = parseInt(metadata.sub_orgs_included) || 0;
    await updateSubOrgLimit(organizationId, includedSubOrgs + additionalSubOrgs);
  }
}
```

### On Build Sprint Purchase

```typescript
async function handleBuildSprintPurchase(session: Stripe.Checkout.Session) {
  const organizationId = session.metadata.organization_id;
  const priceId = session.line_items?.data[0]?.price?.id;
  
  // Get Build Sprint metadata
  const price = await stripe.prices.retrieve(priceId, {
    expand: ['product']
  });
  const metadata = (price.product as Stripe.Product).metadata;
  
  // Create Build Sprint record
  await createBuildSprint(organizationId, {
    status: 'deposit_paid', // or 'paid_in_full'
    startDate: null, // Set when kickoff scheduled
    programDurationWeeks: parseInt(metadata.program_duration_weeks),
    includedPlanTier: metadata.included_plan_tier,
    includedPlanDurationMonths: parseInt(metadata.included_plan_duration_months),
  });
  
  // Upgrade organization to Professional for 6 months
  await upgradeOrganization(organizationId, {
    planTier: metadata.included_plan_tier,
    source: 'build_sprint',
    expiresAt: addMonths(new Date(), parseInt(metadata.included_plan_duration_months)),
  });
  
  // Send confirmation email
  await sendBuildSprintConfirmation(organizationId);
}
```

### On AI Token Pack Purchase

```typescript
async function handleAiTokenPurchase(session: Stripe.Checkout.Session) {
  const organizationId = session.metadata.organization_id;
  const priceId = session.line_items?.data[0]?.price?.id;
  
  const price = await stripe.prices.retrieve(priceId, {
    expand: ['product']
  });
  const metadata = (price.product as Stripe.Product).metadata;
  
  // Add tokens to organization balance
  const tokensToAdd = parseInt(metadata.tokens_included);
  await addAiTokens(organizationId, tokensToAdd);
  
  // Log purchase
  await logTokenPurchase(organizationId, {
    tokens: tokensToAdd,
    amount: session.amount_total,
    stripePaymentId: session.payment_intent as string,
  });
}
```

---

## Checkout Session Creation

### For Subscriptions

```typescript
async function createSubscriptionCheckout(
  organizationId: string,
  priceId: string,
  successUrl: string,
  cancelUrl: string
) {
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card', 'sepa_debit'],
    line_items: [{
      price: priceId,
      quantity: 1,
    }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      organization_id: organizationId,
    },
    subscription_data: {
      metadata: {
        organization_id: organizationId,
      },
    },
    tax_id_collection: {
      enabled: true,
    },
    customer_update: {
      address: 'auto',
      name: 'auto',
    },
    billing_address_collection: 'required',
    allow_promotion_codes: true,
  });
  
  return session;
}
```

### For Agency with Sub-Organizations

```typescript
async function createAgencyCheckout(
  organizationId: string,
  additionalSubOrgs: number, // Beyond the 2 included
  annual: boolean,
  successUrl: string,
  cancelUrl: string
) {
  const lineItems = [
    {
      price: annual ? 'price_agency_annual' : 'price_agency_monthly',
      quantity: 1,
    },
  ];
  
  if (additionalSubOrgs > 0) {
    lineItems.push({
      price: annual ? 'price_sub_org_annual' : 'price_sub_org_monthly',
      quantity: additionalSubOrgs,
    });
  }
  
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card', 'sepa_debit'],
    line_items: lineItems,
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      organization_id: organizationId,
    },
    subscription_data: {
      metadata: {
        organization_id: organizationId,
      },
    },
    // ... same options as above
  });
  
  return session;
}
```

### For Build Sprint

```typescript
async function createBuildSprintCheckout(
  organizationId: string,
  paymentType: 'full' | 'discounted' | 'deposit',
  successUrl: string,
  cancelUrl: string
) {
  const priceMap = {
    full: 'price_build_sprint_full',
    discounted: 'price_build_sprint_discounted',
    deposit: 'price_build_sprint_deposit',
  };
  
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card', 'sepa_debit'],
    line_items: [{
      price: priceMap[paymentType],
      quantity: 1,
    }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      organization_id: organizationId,
      product_type: 'build_sprint',
      payment_type: paymentType,
    },
    invoice_creation: {
      enabled: true,
    },
    // ... same options as above
  });
  
  return session;
}
```

---

## Customer Portal Configuration

Enable the Stripe Customer Portal for self-service:

### Portal Features to Enable

| Feature | Setting |
|---------|---------|
| Invoice history | ✅ Enabled |
| Update payment method | ✅ Enabled |
| Cancel subscription | ✅ Enabled (with survey) |
| Pause subscription | ❌ Disabled |
| Switch plans | ✅ Enabled |
| Update quantity | ✅ Enabled (for sub-orgs) |
| Promotion codes | ✅ Enabled |

### Allowed Plan Switches

| From | To | Allowed |
|------|-----|---------|
| Starter | Professional | ✅ Upgrade |
| Starter | Agency | ✅ Upgrade |
| Professional | Starter | ✅ Downgrade |
| Professional | Agency | ✅ Upgrade |
| Agency | Professional | ✅ Downgrade |
| Agency | Starter | ✅ Downgrade |

### Cancellation Survey Options

1. "Too expensive"
2. "Missing features I need"
3. "Switching to a competitor"
4. "No longer need it"
5. "Other"

---

## Stripe Dashboard Setup Checklist

### Products & Prices
- [ ] Create Starter product with monthly/annual prices
- [ ] Create Professional product with monthly/annual prices
- [ ] Create Agency product with monthly/annual prices
- [ ] Create Sub-Organization add-on with monthly/annual prices
- [ ] Create Build Sprint product with all payment options
- [ ] Create AI Token Pack product
- [ ] Create AI Privacy-Enhanced add-on with monthly/annual prices
- [ ] Add all metadata to each product

### Webhooks
- [ ] Create webhook endpoint
- [ ] Subscribe to: `customer.subscription.*`, `invoice.*`, `checkout.session.completed`, `customer.*`
- [ ] Verify webhook signature in handler

### Customer Portal
- [ ] Configure portal branding
- [ ] Enable/disable features as specified
- [ ] Configure allowed plan switches
- [ ] Set up cancellation survey

### Tax
- [ ] Enable Stripe Tax
- [ ] Configure EU VAT settings
- [ ] Set up tax ID collection

### Branding
- [ ] Upload l4yercak3 logo
- [ ] Set brand colors
- [ ] Configure receipt/invoice branding

---

## Price ID Reference Table

Keep this updated with actual Stripe Price IDs after creation:

| Product | Interval | Price (€) | Trial | Price ID |
|---------|----------|-----------|-------|----------|
| **Community** | Monthly | 9 | 14 days | `price_xxx` |
| **Community** | Annual | 90 | 14 days | `price_xxx` |
| **Starter (NEW with trial)** | Monthly | 199 | 14 days | `price_xxx` |
| **Starter (NEW with trial)** | Annual | 1,990 | 14 days | `price_xxx` |
| Starter (LEGACY, no trial) | Monthly | 199 | None | `price_xxx` |
| Starter (LEGACY, no trial) | Annual | 1,990 | None | `price_xxx` |
| **Professional (NEW with trial)** | Monthly | 399 | 14 days | `price_xxx` |
| **Professional (NEW with trial)** | Annual | 3,990 | 14 days | `price_xxx` |
| Professional (LEGACY, no trial) | Monthly | 399 | None | `price_xxx` |
| Professional (LEGACY, no trial) | Annual | 3,990 | None | `price_xxx` |
| **Agency (NEW with trial)** | Monthly | 599 | 14 days | `price_xxx` |
| **Agency (NEW with trial)** | Annual | 5,990 | 14 days | `price_xxx` |
| Agency (LEGACY, no trial) | Monthly | 599 | None | `price_xxx` |
| Agency (LEGACY, no trial) | Annual | 5,990 | None | `price_xxx` |
| Sub-Organization | Monthly | 79 | N/A | `price_xxx` |
| Sub-Organization | Annual | 790 | N/A | `price_xxx` |
| Build Sprint (Full) | One-time | 12,500 | N/A | `price_xxx` |
| Build Sprint (Discounted) | One-time | 11,250 | N/A | `price_xxx` |
| Build Sprint (Deposit) | One-time | 6,250 | N/A | `price_xxx` |
| Build Sprint (Second) | One-time | 6,250 | N/A | `price_xxx` |
| AI Token Pack | One-time | 49 | N/A | `price_xxx` |
| AI Privacy-Enhanced | Monthly | 149 | N/A | `price_xxx` |
| AI Privacy-Enhanced | Annual | 1,490 | N/A | `price_xxx` |

**Note:** Keep legacy prices active for existing customers. Direct new signups to trial prices.

---

## Environment Variables

```bash
# Stripe API Keys
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# NEW: Community Tier
COMMUNITY_STRIPE_PRICE_MONTHLY=price_xxx
COMMUNITY_STRIPE_PRICE_ANNUAL=price_xxx
COMMUNITY_STRIPE_PRODUCT_ID=prod_xxx

# Platform Tier Price IDs - WITH TRIALS (for new signups)
STRIPE_PRICE_STARTER_MONTHLY_TRIAL=price_xxx
STRIPE_PRICE_STARTER_ANNUAL_TRIAL=price_xxx
STRIPE_PRICE_PROFESSIONAL_MONTHLY_TRIAL=price_xxx
STRIPE_PRICE_PROFESSIONAL_ANNUAL_TRIAL=price_xxx
STRIPE_PRICE_AGENCY_MONTHLY_TRIAL=price_xxx
STRIPE_PRICE_AGENCY_ANNUAL_TRIAL=price_xxx

# Platform Tier Price IDs - LEGACY (keep for existing customers)
STRIPE_PRICE_STARTER_MONTHLY_LEGACY=price_xxx
STRIPE_PRICE_STARTER_ANNUAL_LEGACY=price_xxx
STRIPE_PRICE_PROFESSIONAL_MONTHLY_LEGACY=price_xxx
STRIPE_PRICE_PROFESSIONAL_ANNUAL_LEGACY=price_xxx
STRIPE_PRICE_AGENCY_MONTHLY_LEGACY=price_xxx
STRIPE_PRICE_AGENCY_ANNUAL_LEGACY=price_xxx

# Add-ons
STRIPE_PRICE_SUB_ORG_MONTHLY=price_xxx
STRIPE_PRICE_SUB_ORG_ANNUAL=price_xxx
STRIPE_PRICE_BUILD_SPRINT_FULL=price_xxx
STRIPE_PRICE_BUILD_SPRINT_DISCOUNTED=price_xxx
STRIPE_PRICE_BUILD_SPRINT_DEPOSIT=price_xxx
STRIPE_PRICE_BUILD_SPRINT_SECOND=price_xxx
STRIPE_PRICE_AI_TOKENS=price_xxx
STRIPE_PRICE_AI_PRIVACY_MONTHLY=price_xxx
STRIPE_PRICE_AI_PRIVACY_ANNUAL=price_xxx

# Product IDs
STRIPE_PRODUCT_COMMUNITY=prod_xxx
STRIPE_PRODUCT_STARTER=prod_xxx
STRIPE_PRODUCT_PROFESSIONAL=prod_xxx
STRIPE_PRODUCT_AGENCY=prod_xxx
STRIPE_PRODUCT_SUB_ORG=prod_xxx
STRIPE_PRODUCT_BUILD_SPRINT=prod_xxx
STRIPE_PRODUCT_AI_TOKENS=prod_xxx
STRIPE_PRODUCT_AI_PRIVACY=prod_xxx

# Skool Integration
SKOOL_COMMUNITY_URL=https://skool.com/xxx
SKOOL_WEBHOOK_URL=https://xxx  # Optional
```

---

## Testing Checklist

### Test Mode Verification

- [ ] Create test subscription (Starter monthly)
- [ ] Verify webhook receives `customer.subscription.created`
- [ ] Verify organization license updated correctly
- [ ] Test upgrade from Starter to Professional
- [ ] Test downgrade from Professional to Starter
- [ ] Test adding sub-organizations to Agency
- [ ] Test Build Sprint purchase (full payment)
- [ ] Test Build Sprint purchase (deposit)
- [ ] Test AI token pack purchase
- [ ] Test cancellation flow
- [ ] Test failed payment handling
- [ ] Test customer portal access

### Test Card Numbers

| Scenario | Card Number |
|----------|-------------|
| Successful payment | 4242 4242 4242 4242 |
| Requires authentication | 4000 0025 0000 3155 |
| Declined | 4000 0000 0000 9995 |
| Insufficient funds | 4000 0000 0000 9995 |

---

*Document Version 1.0 — December 2025*
