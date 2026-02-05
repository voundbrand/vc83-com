# Client Credit Purchase Flow via Stripe Connect

> Last updated: 2026-02-04
> Depends on: Existing Stripe Connect integration, credit system, sub-organization model
> Tier requirement: Agency (EUR 299/mo) + Enterprise

This is the technical and UX spec for how an agency's clients buy and consume credits. This powers the revenue model where agencies resell AI access to their clients at a markup through L4YERCAK3.

---

## The Two Stripe Paths (Critical Distinction)

L4YERCAK3 uses Stripe in two fundamentally different ways. Every payment in the platform goes through one of these paths — never both.

### Path 1: Direct Stripe (Platform → L4YERCAK3)

**Who pays:** Organizations on our platform (agencies, solo users, enterprises)
**Who receives:** L4YERCAK3 directly
**Stripe account:** L4YERCAK3's own Stripe account
**Used for:**
- Platform subscriptions (Free → Pro → Agency → Enterprise)
- Credit pack purchases by the org itself
- SMS number setup fees
- Any payment where the customer is paying US (the platform)

**Implementation:** `convex/stripe/platformCheckout.ts`, `convex/stripe/platformWebhooks.ts`

```
Organization ──── pays ────► L4YERCAK3's Stripe Account
                              (100% to platform)
```

### Path 2: Stripe Connect (End Customer → Agency, with Platform Fee)

**Who pays:** An agency's client (end customer)
**Who receives:** The agency (via their connected Stripe account), minus platform fee
**Stripe account:** Agency's connected Stripe account (via Stripe Connect)
**Used for:**
- Product/service sales by the agency to their clients
- Event ticket sales
- Booking payments
- **Client credit purchases** (this spec)
- Any payment where the customer is paying THE AGENCY

**Implementation:** `convex/stripeConnect.ts`, `convex/paymentProviders/stripe.ts`

```
End Customer ──── pays ────► Stripe Connect
                              ├── Application fee ──► L4YERCAK3 (platform cut)
                              └── Remainder ────────► Agency's Stripe Account
```

### Why This Matters for Client Credits

When an agency's client buys credits, the money flows through **Path 2 (Stripe Connect)**, not Path 1. The client is paying the agency for AI access. The agency sets the price. L4YERCAK3 takes a platform fee via Stripe Connect's `application_fee_amount`. The agency keeps the rest.

This is different from when the agency itself buys credits for their own org — that goes through **Path 1 (Direct Stripe)** at platform pricing.

| Scenario | Stripe Path | Who Sets Price | Who Gets Paid |
|----------|-------------|---------------|---------------|
| Agency buys Pro subscription | Direct (Path 1) | L4YERCAK3 | L4YERCAK3 (100%) |
| Agency buys credits for themselves | Direct (Path 1) | L4YERCAK3 | L4YERCAK3 (100%) |
| Agency's client buys credits | Connect (Path 2) | Agency | Agency (80%) + L4YERCAK3 (20% fee) |
| Agency's client buys a product | Connect (Path 2) | Agency | Agency (minus platform fee) |

### Current gap

The existing Stripe Connect integration uses `stripeAccount` parameter (direct charges on connected account), which sends 100% to the agency with no platform revenue share. For client credit purchases, we need to switch to **destination charges** with `application_fee_amount` so L4YERCAK3 takes its cut.

---

## Existing Infrastructure (What's Already Built)

Before specifying what to build, here's what's in place:

### Stripe Connect
- **OAuth-based connection** fully implemented (`convex/stripeConnect.ts`, `convex/paymentProviders/stripe.ts`)
- Agencies connect their Stripe accounts via OAuth flow
- Account status tracking (charges enabled, payouts enabled, onboarding status)
- Test/live mode support
- **Gap:** Current PaymentIntents use `stripeAccount` parameter (direct charges), NOT destination charges with `application_fee_amount`. No platform revenue share exists on client payments.

### Sub-Organizations (Tenants)
- **Parent-child org model** implemented (`convex/api/v1/subOrganizations.ts`)
- One level of nesting: Agency → Client orgs
- Each child org gets its own credit balance
- CRUD endpoints: create, list, get, update child orgs
- Schema supports `parentOrganizationId` on organizations table
- **Gap:** No parent credit fallback (mentioned in comments but not implemented). No client-initiated credit purchase flow.

### Credit System
- **Full credit lifecycle** implemented (`convex/credits/index.ts`)
- Three pools: daily (reset on login), monthly (subscription), purchased (never expire)
- Deduction order: daily → monthly → purchased
- Transaction audit trail with source tracking
- Low-balance notifications at 20%, 10%, 0%
- **Gap:** No Stripe Connect-aware purchase flow. No agency-defined pricing. No client-facing purchase UI.

### Credit Pack Checkout (Platform Direct)
- **One-time purchase flow** via Stripe Checkout (`convex/stripe/platformCheckout.ts`)
- 4 pack tiers: 100, 500, 2,000, 10,000 credits
- Platform pricing: EUR 19 to EUR 999
- Webhook fulfillment adds credits to org's purchased pool
- **Gap:** This flow uses the platform's Stripe account directly. For client purchases, we need the charge to go through the agency's connected Stripe account with a platform application fee.

### Invoicing
- **Full invoice system** built (`convex/invoicingOntology.ts`)
- Supports B2B consolidated, B2B single, B2C invoices
- Line items, tax calculations, payment tracking
- PDF generation
- German invoicing compliance (Rechnungsstellung)
- **Gap:** No credit purchase invoices. The existing system handles event tickets and product sales, not credit packs.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│ CLIENT (Agency's Customer)                                       │
│                                                                  │
│ 1. Sees credit balance in their dashboard                        │
│ 2. Clicks "Buy Credits"                                          │
│ 3. Selects pack from agency-defined pricing                      │
│ 4. Stripe Checkout opens (white-label, agency branding)          │
└──────────────────────┬──────────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────────┐
│ STRIPE (Destination Charge)                                      │
│                                                                  │
│ PaymentIntent created on L4YERCAK3's platform account:           │
│   amount: €79.00 (agency's price for 500 credits)                │
│   application_fee_amount: €15.80 (20% platform fee)              │
│   transfer_data.destination: acct_agency_xxx                     │
│                                                                  │
│ Result:                                                          │
│   L4YERCAK3 receives: €15.80 (platform fee)                      │
│   Agency receives: €63.20 (after platform fee)                   │
│   Client pays: €79.00 total                                      │
└──────────────────────┬──────────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────────┐
│ L4YERCAK3 BACKEND (Webhook Fulfillment)                          │
│                                                                  │
│ 1. Receive checkout.session.completed webhook                    │
│ 2. Verify metadata: type="client-credit-pack"                    │
│ 3. Add purchased credits to client org's balance                 │
│ 4. Record transaction in creditTransactions                      │
│ 5. Record purchase in creditPurchases                            │
│ 6. Generate invoice (optional, per agency config)                │
│ 7. Send receipt notification to client                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## Prerequisites

Before this flow works, the following must be in place:

1. **Agency has connected Stripe** — via existing OAuth flow in `stripe-connect-section.tsx`
2. **Agency has created client as sub-org** — via existing `POST /api/v1/organizations/children`
3. **Agency has configured credit pricing** — new feature, see Section 4
4. **Client has an account** — logged into L4YERCAK3 under the child org

---

## 1. Client Onboarding Flow

### Step 1: Agency invites client

Agency creates a child organization using the existing sub-org system:

```
POST /api/v1/organizations/children
{
  name: "Client Corp",
  slug: "client-corp",
  businessName: "Client Corp GmbH"
}
```

The child org inherits the parent's plan tier but gets its own credit balance (initialized at zero).

### Step 2: Client creates account

Client receives an invitation link, creates their account, and is associated with the child org. This uses the existing auth flow — no changes needed.

### Step 3: Client adds payment method

Two options:

**Option A: On-demand (during first purchase)**
Client's payment method is collected during their first Stripe Checkout session. Stripe stores the card for future purchases if the agency enables auto-replenishment.

**Option B: Upfront (during onboarding)**
A Stripe Setup Intent is created to collect and store the client's payment method before any purchase. This enables auto-replenishment from day one.

Recommendation: **Option A** for simplicity. Collect payment info during first purchase. Offer auto-replenishment setup after first successful purchase.

---

## 2. Credit Purchase Flow

### Step 1: Client views credit dashboard

The client sees their current balance and a "Buy Credits" action. The dashboard shows:

- Current balance (daily + monthly + purchased)
- Usage this period (credits consumed, by action type)
- Purchase history
- "Buy Credits" button

This uses the existing `getCreditBalance` query from `convex/credits/index.ts:36`.

### Step 2: Client selects a credit package

The client sees the agency's configured pricing tiers (NOT the platform's standard pricing). The agency defines their own packs and prices — see Section 4.

Example agency pricing:

| Pack | Credits | Agency Price | Platform Cost | Agency Margin |
|------|---------|-------------|---------------|---------------|
| Starter | 100 | EUR 25 | EUR 10 | EUR 15 |
| Standard | 500 | EUR 99 | EUR 40 | EUR 59 |
| Professional | 2,000 | EUR 349 | EUR 125 | EUR 224 |
| Enterprise | 10,000 | EUR 1,499 | EUR 500 | EUR 999 |

The "Platform Cost" column represents what L4YERCAK3 charges via application fees. The agency keeps the difference.

### Step 3: Payment via Stripe Connect (Destination Charges)

This is the critical change from the current implementation.

**Current flow** (`convex/paymentProviders/stripe.ts:284-306`):
- Uses `stripeAccount` parameter (direct charges)
- 100% goes to agency
- Platform gets nothing

**New flow** (destination charges with application fee):

```typescript
// New: createClientCreditCheckout action
const session = await stripe.checkout.sessions.create({
  mode: "payment",
  line_items: [{
    price_data: {
      currency: "eur",
      product_data: {
        name: `${packName} — ${agencyName}`,
        description: `${creditsAmount} AI credits`,
      },
      unit_amount: agencyPriceInCents, // Agency's price to client
    },
    quantity: 1,
  }],
  payment_intent_data: {
    application_fee_amount: platformFeeInCents, // L4YERCAK3's cut
    transfer_data: {
      destination: agencyStripeAccountId, // Agency's connected account
    },
  },
  metadata: {
    type: "client-credit-pack",
    organizationId: clientOrgId,       // Client's org (child)
    parentOrganizationId: agencyOrgId, // Agency's org (parent)
    packId: selectedPackId,
    credits: String(creditsAmount),
    platformFee: String(platformFeeInCents),
  },
  // White-label: use agency's branding if available
  // Stripe automatically shows the connected account's business name
  success_url: `${baseUrl}/credits?purchase=success`,
  cancel_url: `${baseUrl}/credits?purchase=cancelled`,
});
```

### Step 4: Webhook fulfillment

On `checkout.session.completed`:

```typescript
if (metadata.type === "client-credit-pack") {
  const clientOrgId = metadata.organizationId;
  const credits = parseInt(metadata.credits);
  const packId = metadata.packId;
  const paymentIntentId = session.payment_intent;

  // Add credits to client's balance
  await ctx.runMutation(internal.credits.index.addPurchasedCredits, {
    organizationId: clientOrgId,
    credits,
    packId,
    stripePaymentIntentId: paymentIntentId,
  });

  // Record in creditPurchases for audit
  await ctx.db.insert("creditPurchases", {
    organizationId: clientOrgId,
    packId,
    packName: metadata.packName,
    creditsAmount: credits,
    priceInCents: session.amount_total,
    currency: session.currency,
    vatRate: 19, // German VAT
    netAmountInCents: Math.round(session.amount_total / 1.19),
    vatAmountInCents: session.amount_total - Math.round(session.amount_total / 1.19),
    stripePaymentIntentId: paymentIntentId,
    paymentStatus: "succeeded",
    purchasedAt: Date.now(),
    completedAt: Date.now(),
  });

  // Notify client
  await ctx.scheduler.runAfter(0, internal.credits.notifications.notifyCreditPurchase, {
    organizationId: clientOrgId,
    credits,
    packName: metadata.packName,
  });
}
```

### Step 5: Credits available immediately

After webhook fires, the client's `purchasedCredits` pool is updated. They can immediately use AI-powered features.

---

## 3. Credit Consumption

Credits are consumed through the existing credit system — no changes needed to the deduction logic.

### Cost per action (from `convex/credits/index.ts:484-558`)

| Action | Credits | Notes |
|--------|---------|-------|
| Agent chat (simple model) | 1 | Llama, Mistral |
| Agent chat (complex model) | 3 | Claude, GPT-4o |
| Agent chat (default) | 2 | Unknown complexity |
| Send email | 1 | |
| AI-composed email | 2 | AI writes + sends |
| Create contact | 1 | |
| Workflow trigger | 1 | |
| Sequence step | 1 | |
| SMS outbound | 2 | |
| Form submission | 0 | Free |
| Builder generation | 0 | BYOK (user's V0) |

### Client dashboard shows:

- Real-time credit balance
- Consumption breakdown by action type
- Daily/weekly/monthly usage charts
- "Buy more credits" when balance is low

### Low-balance alerts

Using existing notification system (`convex/credits/notifications.ts`):
- **0%**: Agent stops responding, client sees "credits depleted" message
- **10%**: Email/in-app notification to client (and agency, optionally)
- **20%**: In-app notification to client

---

## 4. Agency Credit Pricing Configuration

This is a new feature. Agencies need to define what they charge their clients for credits.

### Data model

Store as an object in the objects table (following existing ontology pattern):

```typescript
// Object type: "credit_pricing_config"
{
  type: "credit_pricing_config",
  organizationId: agencyOrgId, // The agency
  customProperties: {
    packs: [
      {
        packId: "starter",
        name: "Starter",
        credits: 100,
        priceInCents: 2500,  // EUR 25.00 (agency's price to client)
        currency: "eur",
        isActive: true,
        sortOrder: 0,
      },
      {
        packId: "standard",
        name: "Standard",
        credits: 500,
        priceInCents: 9900,
        currency: "eur",
        isActive: true,
        sortOrder: 1,
      },
      // ... more packs
    ],
    defaultPackId: "standard",
    allowCustomAmounts: false,  // Can clients enter a custom credit amount?
    minPurchaseCredits: 100,
    autoReplenishEnabled: true, // Can clients opt into auto-replenish?
    autoReplenishThreshold: 50, // Trigger auto-replenish when balance drops below this
    autoReplenishPackId: "standard", // Which pack to auto-purchase
  }
}
```

### Platform fee calculation

The platform fee is calculated as a percentage of the agency's client-facing price:

```typescript
const PLATFORM_FEE_PERCENT = 20; // 20% platform fee — TBD final number

function calculatePlatformFee(agencyPriceInCents: number): number {
  return Math.round(agencyPriceInCents * (PLATFORM_FEE_PERCENT / 100));
}
```

Example with 20% platform fee:
- Client pays EUR 99 for 500 credits
- Platform fee: EUR 19.80 (to L4YERCAK3)
- Agency receives: EUR 79.20

### Agency pricing UI

A new section in the Agency management dashboard where the agency owner can:
1. Define credit packs (name, credits, price)
2. Enable/disable packs
3. Set auto-replenishment defaults
4. Preview what clients will see
5. See their margin per pack (client price minus estimated platform fee)

---

## 5. Auto-Replenishment

### Client opt-in

After a successful first purchase, offer the client auto-replenishment:

1. Client checks "Auto-replenish when balance drops below X credits"
2. Selects which pack to auto-purchase
3. Confirms stored payment method

### Storage

On the client org's credit balance record (extend `creditBalances` schema):

```typescript
// Add to creditBalances table:
autoReplenish: v.optional(v.object({
  enabled: v.boolean(),
  threshold: v.number(),          // Trigger when balance drops below this
  packId: v.string(),             // Which pack to buy
  stripeCustomerId: v.string(),   // Client's Stripe customer ID (for saved card)
  lastTriggered: v.optional(v.number()),
  consecutiveFailures: v.number(), // Stop after 3 consecutive failures
})),
```

### Trigger logic

In the credit deduction function (`convex/credits/index.ts:136`), after successful deduction:

```typescript
// After deducting credits, check if auto-replenish should trigger
const newTotal = balance.dailyCredits + balance.monthlyCredits + balance.purchasedCredits;
if (balance.autoReplenish?.enabled && newTotal < balance.autoReplenish.threshold) {
  // Schedule auto-replenish (don't block the deduction)
  ctx.scheduler.runAfter(0, internal.credits.autoReplenish.triggerPurchase, {
    organizationId,
    packId: balance.autoReplenish.packId,
  });
}
```

The `triggerPurchase` action creates a PaymentIntent using the stored payment method (off-session payment), fulfills credits on success, and notifies both client and agency.

---

## 6. Agency Dashboard Visibility

### Per-client view

Agency sees for each client org:
- Current credit balance
- Total credits purchased (lifetime)
- Total credits consumed (this period / lifetime)
- Revenue earned from this client (total payments minus platform fees)
- Purchase history with dates and amounts
- Current auto-replenishment status

### Aggregate view

Agency sees across all clients:
- Total credits sold (this month / all time)
- Total revenue earned (gross, after platform fee, after Stripe fees)
- Top clients by credit consumption
- Churn risk: clients with low balances and no auto-replenish
- Payout history from Stripe

### Data source

These views query:
- `creditBalances` — current balances per client org
- `creditTransactions` — consumption history per client org
- `creditPurchases` — purchase history per client org
- Stripe Connect API — payout history for the agency's connected account

---

## 7. Stripe Connect Configuration

### Connect type

**Recommendation: Express accounts**

Express accounts provide:
- Simplified onboarding (Stripe-hosted)
- Stripe manages compliance and identity verification
- Stripe dashboard lite for the agency
- L4YERCAK3 controls the payout schedule

Standard accounts give agencies full Stripe dashboard access but add complexity. Express is the right default for most agencies.

**Note:** The current implementation (`convex/stripeConnect.ts`) supports OAuth-based Standard accounts. Adding Express support requires the Stripe Connect Onboarding flow (embedded components or hosted).

### Application fee

| Config | Value | Notes |
|--------|-------|-------|
| Fee type | Percentage-based | Calculated on each transaction |
| Default rate | 20% | TBD — see open decisions below |
| Minimum fee | EUR 0.50 | Prevent micro-transactions from eroding margins |
| Maximum fee | None | No cap |

### Payout schedule

Stripe's standard payout schedule applies:
- **New accounts:** 7-14 day rolling
- **Established accounts:** 2-day rolling
- **Manual payouts:** Optional, if agency prefers

### Multi-currency

- Primary: EUR (German market)
- Secondary: USD (international agencies)
- Stripe handles currency conversion automatically
- Application fee is always calculated in the payment currency

### Receipts and invoicing

**Stripe-generated receipts:** Automatic for all successful charges. Shows agency branding (from connected account).

**German invoicing compliance (Rechnungsstellung):**
- German agencies must issue proper invoices with Rechnungsnummer
- The existing invoice system (`convex/invoicingOntology.ts`) can generate compliant invoices
- Trigger invoice creation on successful credit purchase webhook
- Include: Steuernummer/USt-IdNr, line items, 19% MwSt breakdown
- Store PDF in the objects table

---

## 8. Relationship to BYOK

BYOK and client credit purchases are complementary, not conflicting:

| Scenario | API Key | Billing |
|----------|---------|---------|
| Agency using BYOK internally | Agency's own OpenRouter key | No credit deduction (BYOK) |
| Agency's client using AI | Platform OpenRouter key | Credits deducted from client's balance |
| Agency's client using AI (BYOK agency) | Platform OpenRouter key | Credits deducted from client's balance |

**Key rule:** Client-facing AI always uses platform credits, regardless of whether the agency uses BYOK. The agency's BYOK key is never used for client requests. This ensures:
1. Clients always consume credits (agency earns revenue)
2. Platform always earns the application fee
3. BYOK only affects the agency's own internal AI usage

### Implementation

When processing an AI request, determine whether it's agency-internal or client-facing:

```typescript
const org = await getOrganization(organizationId);

if (org.parentOrganizationId) {
  // This is a client org (child) — always use platform key + deduct credits
  const apiKey = process.env.OPENROUTER_API_KEY;
  // ... deduct credits normally
} else {
  // This is the agency org — check BYOK setting
  const settings = await getAISettings(organizationId);
  const apiKey = settings.llm.openrouterApiKey || process.env.OPENROUTER_API_KEY;
  // ... skip credit deduction if BYOK
}
```

---

## 9. Open Technical Decisions

| Decision | Options | Recommendation |
|----------|---------|----------------|
| **Platform fee percentage** | 10%, 15%, 20%, 25% | Start at 20%. Competitive with Stripe's own marketplace fee (25%). Can be adjusted per tier or volume. |
| **Credit pack pricing (platform default)** | See Section 2 table | Provide defaults that agencies can customize |
| **Subscription-based credit plans** | Monthly auto-purchase vs one-time packs | Start with one-time packs + auto-replenishment. Subscriptions add billing complexity. |
| **Minimum purchase amount** | EUR 10, EUR 19, EUR 25 | EUR 19 (matches smallest platform pack) |
| **Agency volume discounts** | Reduced platform fee at volume | After launch. Track total client credits sold per agency. Offer reduced platform fee at thresholds (e.g., 18% above 50K credits/mo). |
| **Connect account type** | Standard vs Express | Express for new setup. Keep Standard support for existing connected accounts. |
| **Parent credit fallback** | When child org hits zero, check parent balance | Implement as optional agency setting. Default: off (client must buy their own credits). |

---

## 10. Implementation Phases

### Phase 1: Agency pricing configuration
- New object type `credit_pricing_config` in schema
- CRUD mutations for agency to define packs and pricing
- UI in agency management dashboard
- **Files:** New file for pricing config ontology, new UI component

### Phase 2: Client credit purchase checkout
- New `createClientCreditCheckout` action using destination charges
- Switch from `stripeAccount` to `transfer_data.destination` + `application_fee_amount`
- Webhook handler for `type: "client-credit-pack"` in `platformWebhooks.ts`
- **Files:** `convex/stripe/platformCheckout.ts`, `convex/stripe/platformWebhooks.ts`

### Phase 3: Client credit dashboard
- Credit balance display for child org users
- "Buy Credits" flow with agency's configured packs
- Purchase history and consumption breakdown
- **Files:** New UI component for client credit dashboard

### Phase 4: Auto-replenishment
- Extend `creditBalances` schema with auto-replenish config
- Off-session PaymentIntent creation with stored payment method
- Trigger logic in credit deduction path
- **Files:** `convex/schemas/creditSchemas.ts`, `convex/credits/index.ts`, new `convex/credits/autoReplenish.ts`

### Phase 5: Agency revenue dashboard
- Per-client and aggregate credit/revenue views
- Stripe Connect payout history
- Export for accounting
- **Files:** New UI component, new queries

### Phase 6: Invoicing integration
- Auto-generate German-compliant invoices on credit purchase
- Store PDF, link to transaction
- **Files:** `convex/invoicingOntology.ts` (extend existing)

---

## File Reference

### Existing (to modify or extend):
| File | Change |
|------|--------|
| `convex/stripe/platformCheckout.ts` | Add `createClientCreditCheckout` with destination charges |
| `convex/stripe/platformWebhooks.ts` | Handle `type: "client-credit-pack"` in webhook |
| `convex/credits/index.ts` | Add auto-replenish trigger after deduction |
| `convex/schemas/creditSchemas.ts` | Add `autoReplenish` to `creditBalances` |
| `convex/paymentProviders/stripe.ts` | Add destination charge support alongside existing direct charges |
| `convex/invoicingOntology.ts` | Add credit purchase invoice generation |

### New files:
| File | Purpose |
|------|---------|
| `convex/credits/pricingConfig.ts` | Agency credit pricing CRUD |
| `convex/credits/autoReplenish.ts` | Auto-replenishment logic |
| `convex/credits/clientPurchase.ts` | Client-facing purchase flow |
| Client credit dashboard component | UI for client to view balance and buy credits |
| Agency revenue dashboard component | UI for agency to see client credit revenue |
