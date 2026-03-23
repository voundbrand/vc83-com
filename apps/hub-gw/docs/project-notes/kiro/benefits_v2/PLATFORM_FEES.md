# Platform Fee Model

**Document:** Platform Fees & GW Organization Billing
**Status:** Draft
**Updated:** January 2025

---

## Overview

L4YERCAK3 charges Gründungswerft (the organization) a platform fee for all transactions processed through the Benefits Platform. This creates a sustainable revenue model while keeping the platform free for individual members.

---

## Fee Structure

### Transaction Fees

| Transaction Type | Fee | Min | Max | Notes |
|-----------------|-----|-----|-----|-------|
| **Benefit Claim** | €0.50 flat | - | - | Per claim, regardless of value |
| **Commission Payout (Stripe)** | 2.5% | €1.00 | €50.00 | Includes Stripe fees passthrough |
| **Commission Payout (PayPal)** | 2.5% | €1.00 | €50.00 | Includes PayPal fees passthrough |
| **Commission Payout (Crypto)** | 1.5% | €0.50 | €25.00 | Lower due to no intermediary |
| **Commission Escrow** | 1.0% | €0.50 | €25.00 | Only on successful release |
| **Invoice Payment** | 1.0% | €1.00 | €25.00 | B2B invoice tracking |

### Why Different Rates?

```
Traditional Payment (Stripe/PayPal):
├── Payment processor fee: ~2.9% + €0.30
├── Platform processing: included
├── Risk/fraud protection: included
└── Total to GW: 2.5% (we absorb some processor cost)

Crypto Payment (MetaMask/Direct):
├── Gas fee: ~€0.01-0.10 (paid by sender)
├── No processor fee
├── Platform processing: included
└── Total to GW: 1.5% (lower cost, lower fee)

Smart Contract Escrow:
├── Gas fee: ~€0.05-0.20 (paid by funder)
├── Contract handles trust
├── Platform only resolves disputes
└── Total to GW: 1.0% (minimal platform involvement)
```

---

## Billing Model

### Monthly Aggregation

Platform fees are aggregated and invoiced monthly to the GW organization.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    MONTHLY PLATFORM FEE INVOICE                              │
│                    Gründungswerft e.V.                                       │
│                    Invoice Period: January 2025                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  BENEFIT CLAIMS                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│  │ Date       │ Benefit                      │ Claimed By    │ Fee      │  │
│  ├────────────┼──────────────────────────────┼───────────────┼──────────┤  │
│  │ 2025-01-05 │ 20% Web Development Discount │ Max M.        │ €0.50    │  │
│  │ 2025-01-07 │ Free Legal Consultation      │ Anna S.       │ €0.50    │  │
│  │ ...        │ ...                          │ ...           │ ...      │  │
│  │            │                              │ Subtotal      │ €75.00   │  │
│                                                                             │
│  COMMISSION PAYOUTS                                                         │
│  ─────────────────────────────────────────────────────────────────────────  │
│  │ Date       │ Commission          │ Amount   │ Method  │ Fee (2.5%) │   │
│  ├────────────┼─────────────────────┼──────────┼─────────┼────────────┤   │
│  │ 2025-01-10 │ Customer Referral   │ €500.00  │ Stripe  │ €12.50     │   │
│  │ 2025-01-15 │ Partnership Deal    │ €2,000   │ Stripe  │ €50.00*    │   │
│  │ 2025-01-20 │ Lead Generation     │ €150.00  │ PayPal  │ €3.75      │   │
│  │            │                     │          │Subtotal │ €562.50    │   │
│  │            │                     │          │         │            │   │
│  │ * Capped at €50.00 maximum                                         │   │
│                                                                             │
│  CRYPTO PAYOUTS                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│  │ Date       │ Commission          │ Amount   │ Token   │ Fee (1.5%) │   │
│  ├────────────┼─────────────────────┼──────────┼─────────┼────────────┤   │
│  │ 2025-01-12 │ Tech Partnership    │ €1,000   │ USDC    │ €15.00     │   │
│  │ 2025-01-25 │ Investor Intro      │ €5,000   │ USDC    │ €25.00*    │   │
│  │            │                     │          │Subtotal │ €150.00    │   │
│                                                                             │
│  ESCROW RELEASES                                                            │
│  ─────────────────────────────────────────────────────────────────────────  │
│  │ Date       │ Commission          │ Amount   │ Status  │ Fee (1.0%) │   │
│  ├────────────┼─────────────────────┼──────────┼─────────┼────────────┤   │
│  │ 2025-01-18 │ Enterprise Deal     │ €2,500   │Released │ €25.00     │   │
│  │            │                     │          │Subtotal │ €25.00     │   │
│                                                                             │
│  ═══════════════════════════════════════════════════════════════════════   │
│                                                                             │
│  SUMMARY                                                                    │
│  ─────────────────────────────────────────────────────────────────────────  │
│  Benefit Claims (150)                                          €75.00      │
│  Commission Payouts - Stripe (45)                              €562.50     │
│  Commission Payouts - Crypto (20)                              €150.00     │
│  Escrow Releases (5)                                           €25.00      │
│  ─────────────────────────────────────────────────────────────────────────  │
│  Subtotal                                                      €812.50     │
│  Volume Discount (>€500/month = 10% off)                       -€81.25     │
│  ─────────────────────────────────────────────────────────────────────────  │
│  TOTAL DUE                                                     €731.25     │
│                                                                             │
│  Payment Terms: Net 30                                                      │
│  Due Date: February 28, 2025                                                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Volume Discounts

| Monthly Fee Volume | Discount |
|-------------------|----------|
| €0 - €499 | 0% |
| €500 - €999 | 10% |
| €1,000 - €2,499 | 15% |
| €2,500 - €4,999 | 20% |
| €5,000+ | 25% |

---

## Implementation: Stripe Connect Application Fees

For Stripe payments, we use Stripe Connect's **application_fee_amount** feature.

### How It Works

```
Member A pays €500 commission to Member B via Stripe:

1. Payment initiated: €500
2. Stripe processing fee: €14.80 (2.9% + €0.30)
3. Platform fee: €12.50 (2.5% of €500)
4. Member B receives: €500 - €14.80 = €485.20
5. Platform receives: €12.50 (from application fee)
6. GW billed: €12.50 at end of month

Note: Stripe fees are paid by the recipient (Member B)
Platform fees are billed to GW organization
```

### Stripe Connect Code

```typescript
// When creating a PaymentIntent for commission payout
const paymentIntent = await stripe.paymentIntents.create({
  amount: commissionAmountInCents,    // €500.00 = 50000
  currency: "eur",

  // This goes to the affiliate (commission recipient)
  transfer_data: {
    destination: affiliateStripeAccountId,
  },

  // This is the platform fee - goes to L4YERCAK3's Stripe account
  application_fee_amount: calculatePlatformFee(commissionAmountInCents),

  metadata: {
    commissionId: commission._id,
    organizationId: "gruendungswerft",
    feeType: "commission_payout",
  },
});

function calculatePlatformFee(amountInCents: number): number {
  const feePercent = 0.025; // 2.5%
  const minFee = 100;       // €1.00
  const maxFee = 5000;      // €50.00

  const calculatedFee = Math.round(amountInCents * feePercent);
  return Math.max(minFee, Math.min(maxFee, calculatedFee));
}
```

---

## Implementation: PayPal Partner Fees

For PayPal, we use PayPal Commerce Platform with **partner_fee**.

```typescript
// PayPal order with partner fee
const order = await paypal.orders.create({
  intent: "CAPTURE",
  purchase_units: [{
    amount: {
      currency_code: "EUR",
      value: "500.00",
    },
    payee: {
      merchant_id: affiliatePayPalMerchantId,
    },
    payment_instruction: {
      platform_fees: [{
        amount: {
          currency_code: "EUR",
          value: "12.50", // 2.5% platform fee
        },
        payee: {
          merchant_id: L4YERCAK3_PAYPAL_MERCHANT_ID,
        },
      }],
    },
  }],
});
```

---

## Implementation: Crypto Platform Fees

For crypto payments, platform fee is collected separately.

### Option A: Deduct from Payment (Recommended)

```typescript
// When processing crypto commission payout
const commissionAmount = 500_000000n; // 500 USDC (6 decimals)
const platformFeePercent = 0.015;     // 1.5%
const platformFee = (commissionAmount * 15n) / 1000n; // 7.5 USDC
const affiliateReceives = commissionAmount - platformFee;

// Transfer to affiliate
await usdcContract.transfer(affiliateWallet, affiliateReceives);

// Transfer fee to platform
await usdcContract.transfer(platformWallet, platformFee);
```

### Option B: Bill to GW Monthly

```typescript
// Track crypto fees for monthly billing
await ctx.db.insert("platformFees", {
  organizationId: gwOrgId,
  transactionType: "commission_payout_crypto",
  transactionId: commissionId,
  grossAmount: 50000,        // €500.00 in cents
  feePercent: 1.5,
  feeAmount: 750,            // €7.50 in cents
  currency: "EUR",
  paymentMethod: "ethereum",
  txHash: txHash,
  status: "pending_billing",
  createdAt: Date.now(),
});
```

---

## Implementation: Smart Contract Fees

For escrow, fees are built into the contract.

```solidity
// In GWCommissionEscrow.sol
uint256 public platformFeeBps = 100; // 1% = 100 basis points

function _release(uint256 escrowId) internal {
    Escrow storage escrow = escrows[escrowId];

    // Calculate platform fee
    uint256 feeAmount = (escrow.amount * platformFeeBps) / 10000;
    uint256 affiliateAmount = escrow.amount - feeAmount;

    // Transfer fee to platform
    usdc.safeTransfer(platformFeeRecipient, feeAmount);

    // Transfer remainder to affiliate
    usdc.safeTransfer(escrow.affiliate, affiliateAmount);
}
```

---

## Database Schema: Platform Fees

```typescript
// convex/schemas/platformFeeSchemas.ts

export const platformFeeSchemas = {
  // Individual fee records
  platformFees: defineTable({
    organizationId: v.id("organizations"),

    // Transaction reference
    transactionType: v.union(
      v.literal("benefit_claim"),
      v.literal("commission_payout_stripe"),
      v.literal("commission_payout_paypal"),
      v.literal("commission_payout_crypto"),
      v.literal("commission_escrow_release"),
      v.literal("invoice_payment")
    ),
    transactionId: v.id("objects"),       // Reference to benefit, commission, etc.

    // Amounts
    grossAmount: v.number(),              // Transaction amount in cents
    feePercent: v.number(),               // Fee percentage applied
    feeAmount: v.number(),                // Calculated fee in cents
    currency: v.string(),                 // EUR, USD

    // Payment details
    paymentMethod: v.string(),            // stripe, paypal, ethereum, escrow
    paymentReference: v.optional(v.string()), // Stripe PI, PayPal order, tx hash

    // Billing status
    status: v.union(
      v.literal("collected"),             // Fee already collected (Stripe/PayPal)
      v.literal("pending_billing"),       // To be invoiced to org
      v.literal("invoiced"),              // Added to monthly invoice
      v.literal("paid"),                  // Invoice paid
      v.literal("waived")                 // Fee waived (promo, error correction)
    ),

    // Invoice reference
    invoiceId: v.optional(v.id("objects")),

    // Metadata
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_org_status", ["organizationId", "status"])
    .index("by_transaction", ["transactionId"])
    .index("by_invoice", ["invoiceId"]),

  // Monthly fee summaries for billing
  platformFeeSummaries: defineTable({
    organizationId: v.id("organizations"),

    // Period
    periodStart: v.number(),              // First day of month
    periodEnd: v.number(),                // Last day of month

    // Aggregated counts
    benefitClaimCount: v.number(),
    stripePayoutCount: v.number(),
    paypalPayoutCount: v.number(),
    cryptoPayoutCount: v.number(),
    escrowReleaseCount: v.number(),

    // Aggregated fees
    benefitClaimFees: v.number(),
    stripePayoutFees: v.number(),
    paypalPayoutFees: v.number(),
    cryptoPayoutFees: v.number(),
    escrowReleaseFees: v.number(),

    // Totals
    subtotal: v.number(),
    discountPercent: v.number(),
    discountAmount: v.number(),
    total: v.number(),

    // Status
    status: v.union(
      v.literal("accumulating"),          // Current month
      v.literal("finalized"),             // Month ended, ready to invoice
      v.literal("invoiced"),              // Invoice created
      v.literal("paid")                   // Invoice paid
    ),
    invoiceId: v.optional(v.id("objects")),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_org_period", ["organizationId", "periodStart"])
    .index("by_status", ["status"]),
};
```

---

## API Endpoints

```typescript
// Platform fee management endpoints

// Record a new platform fee (internal)
POST /api/internal/platform-fees
{
  organizationId: string,
  transactionType: string,
  transactionId: string,
  grossAmount: number,
  paymentMethod: string,
}

// Get fee summary for organization
GET /api/v1/platform-fees/summary?organizationId=xxx&period=2025-01

// Get detailed fee breakdown
GET /api/v1/platform-fees?organizationId=xxx&period=2025-01

// Generate monthly invoice (admin)
POST /api/internal/platform-fees/generate-invoice
{
  organizationId: string,
  periodStart: number,
  periodEnd: number,
}

// Apply discount or waive fee (admin)
POST /api/internal/platform-fees/:feeId/waive
{
  reason: string,
}
```

---

## Cron Jobs

```typescript
// convex/crons.ts

export default cronJobs()
  // Aggregate daily fees at midnight
  .daily(
    "aggregate platform fees",
    { hourUTC: 0, minuteUTC: 5 },
    internal.platformFees.aggregateDailyFees
  )

  // Finalize and invoice on 1st of each month
  .monthly(
    "generate platform fee invoices",
    { day: 1, hourUTC: 6, minuteUTC: 0 },
    internal.platformFees.generateMonthlyInvoices
  )

  // Send payment reminders on 15th
  .monthly(
    "send fee invoice reminders",
    { day: 15, hourUTC: 9, minuteUTC: 0 },
    internal.platformFees.sendPaymentReminders
  );
```

---

## Reporting Dashboard

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  PLATFORM FEES DASHBOARD - Gründungswerft                                   │
│  Period: January 2025                                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐             │
│  │  TOTAL FEES     │  │  TRANSACTIONS   │  │  VOLUME         │             │
│  │  €731.25        │  │  220            │  │  €45,750        │             │
│  │  ▲ 12% vs Dec   │  │  ▲ 8% vs Dec    │  │  ▲ 15% vs Dec   │             │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘             │
│                                                                             │
│  FEE BREAKDOWN                          PAYMENT METHODS                     │
│  ─────────────────────                  ─────────────────────               │
│  ██████████████░░░░ Stripe    69%       Stripe   ████████████░  65         │
│  ████░░░░░░░░░░░░░░ Crypto    18%       PayPal   ████░░░░░░░░░  25         │
│  ███░░░░░░░░░░░░░░░ Benefits   9%       Crypto   ███░░░░░░░░░░  20         │
│  █░░░░░░░░░░░░░░░░░ Escrow     3%       Escrow   █░░░░░░░░░░░░   5         │
│                                         Invoice  █░░░░░░░░░░░░   5         │
│                                                                             │
│  BILLING STATUS                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│  ✅ December 2024: €652.00 - PAID (Jan 15)                                  │
│  📄 January 2025: €731.25 - INVOICED (Due Feb 28)                           │
│  ⏳ February 2025: €245.00 - ACCUMULATING                                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Configuration

```typescript
// Platform fee configuration per organization
interface PlatformFeeConfig {
  organizationId: Id<"organizations">;

  // Fee rates (can be customized per org)
  benefitClaimFee: number;              // Flat fee in cents (default: 50)
  commissionFeePercent: number;         // Default: 2.5
  cryptoFeePercent: number;             // Default: 1.5
  escrowFeePercent: number;             // Default: 1.0
  invoiceFeePercent: number;            // Default: 1.0

  // Caps
  minCommissionFee: number;             // Default: 100 (€1.00)
  maxCommissionFee: number;             // Default: 5000 (€50.00)

  // Discounts
  volumeDiscountTiers: {
    threshold: number;                   // Monthly fee volume
    discountPercent: number;
  }[];

  // Special
  freeTrialEndDate?: number;            // No fees until this date
  customDiscountPercent?: number;       // Override volume discount

  // Billing
  paymentTermsDays: number;             // Default: 30
  billingEmail: string;
  billingContact: string;
}
```

---

## Next Steps

1. Implement `platformFees` schema in Convex
2. Add fee calculation to all payment flows
3. Integrate with Stripe Connect application fees
4. Build monthly aggregation cron job
5. Create admin dashboard for fee management
6. Generate monthly invoices via existing invoicing system
