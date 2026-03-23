# Phase 2: Payment Providers

**Phase:** 2 of 5
**Duration:** 2 weeks
**Status:** Not Started
**Dependencies:** Phase 1 complete

---

## Objectives

1. Integrate Stripe Connect for commission payouts
2. Implement PayPal Commerce Platform
3. Add platform fee collection for all transactions
4. Build payment method selection UI
5. Implement payout workflow

---

## Deliverables

- [ ] Stripe Connect provider with application fees
- [ ] PayPal Commerce Platform provider
- [ ] Platform fee tracking in database
- [ ] Payment method selection in payout flow
- [ ] Webhook handlers for payment events
- [ ] Payout confirmation and receipts

---

## Week 1: Stripe Connect

### Day 1-2: Stripe Provider Updates

**Task 2.1: Add Application Fee Support**

Update existing Stripe Connect provider to include platform fees:

```typescript
// convex/paymentProviders/stripe.ts

// Update createCheckoutSession to include application fee
async createCheckoutSession(params: CheckoutSessionParams): Promise<CheckoutSessionResult> {
  const platformFee = this.calculatePlatformFee(params.priceInCents);

  const session = await this.stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card", "sepa_debit"],
    line_items: [{
      price_data: {
        currency: params.currency.toLowerCase(),
        product_data: {
          name: params.productName,
          description: `Commission payout to ${params.metadata?.affiliateName}`,
        },
        unit_amount: params.priceInCents,
      },
      quantity: params.quantity,
    }],
    payment_intent_data: {
      // Transfer to affiliate's Stripe account
      transfer_data: {
        destination: params.connectedAccountId!,
      },
      // Platform fee goes to L4YERCAK3
      application_fee_amount: platformFee,
      metadata: {
        commissionId: params.metadata?.commissionId,
        organizationId: params.organizationId,
        affiliateId: params.metadata?.affiliateId,
        merchantId: params.metadata?.merchantId,
        feeType: "commission_payout",
      },
    },
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
  });

  return {
    sessionId: session.id,
    providerSessionId: session.id,
    checkoutUrl: session.url!,
    expiresAt: session.expires_at * 1000,
  };
}

private calculatePlatformFee(amountInCents: number): number {
  const feePercent = 0.025; // 2.5%
  const minFee = 100;       // €1.00
  const maxFee = 5000;      // €50.00

  const calculatedFee = Math.round(amountInCents * feePercent);
  return Math.max(minFee, Math.min(maxFee, calculatedFee));
}
```

**Task 2.2: Stripe Account Connection for Members**

```typescript
// convex/gw/payments.ts

export const connectStripeAccount = mutation({
  args: {
    memberId: v.id("objects"),
    returnUrl: v.string(),
    refreshUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const member = await ctx.db.get(args.memberId);
    if (!member) throw new Error("Member not found");

    const email = member.customProperties?.email;
    if (!email) throw new Error("Member email required");

    // Create Stripe Express account
    const account = await stripe.accounts.create({
      type: "express",
      country: "DE",
      email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: "individual",
      metadata: {
        memberId: args.memberId,
        gwMembershipId: member.customProperties?.gwMembershipId,
      },
    });

    // Create onboarding link
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: args.refreshUrl,
      return_url: args.returnUrl,
      type: "account_onboarding",
    });

    // Store pending connection
    await ctx.db.patch(args.memberId, {
      customProperties: {
        ...member.customProperties,
        stripeAccountId: account.id,
        stripeAccountStatus: "pending",
      },
      updatedAt: Date.now(),
    });

    return {
      accountId: account.id,
      onboardingUrl: accountLink.url,
    };
  },
});

export const getPaymentMethods = query({
  args: { memberId: v.id("objects") },
  handler: async (ctx, { memberId }) => {
    const member = await ctx.db.get(memberId);
    if (!member) return [];

    const methods = [];

    // Check Stripe
    if (member.customProperties?.stripeAccountId) {
      const status = member.customProperties?.stripeAccountStatus;
      methods.push({
        provider: "stripe",
        accountId: member.customProperties.stripeAccountId,
        status,
        ready: status === "active",
        label: "Stripe (Kreditkarte, SEPA)",
      });
    }

    // Check PayPal
    if (member.customProperties?.paypalMerchantId) {
      methods.push({
        provider: "paypal",
        accountId: member.customProperties.paypalMerchantId,
        status: "active",
        ready: true,
        label: "PayPal",
      });
    }

    // Check Wallet
    const wallet = await ctx.db
      .query("gwMemberWallets")
      .withIndex("by_member", q =>
        q.eq("organizationId", member.organizationId)
          .eq("memberId", member.customProperties?.gwUserId)
      )
      .first();

    if (wallet) {
      methods.push({
        provider: "ethereum",
        accountId: wallet.walletAddress,
        status: "active",
        ready: true,
        label: "Crypto (USDC)",
      });
    }

    return methods;
  },
});
```

### Day 3-4: Stripe Webhook Handling

**Task 2.3: Handle Payment Events**

```typescript
// convex/gw/stripeWebhooks.ts

export const handleStripeWebhook = internalAction({
  args: {
    eventType: v.string(),
    eventData: v.string(),
  },
  handler: async (ctx, { eventType, eventData }) => {
    const data = JSON.parse(eventData);

    switch (eventType) {
      case "payment_intent.succeeded":
        await handlePaymentSucceeded(ctx, data);
        break;
      case "payment_intent.payment_failed":
        await handlePaymentFailed(ctx, data);
        break;
      case "account.updated":
        await handleAccountUpdated(ctx, data);
        break;
    }
  },
});

async function handlePaymentSucceeded(ctx, paymentIntent) {
  const { commissionId, organizationId } = paymentIntent.metadata;

  if (!commissionId) return;

  // Update commission payout status
  const payout = await ctx.runQuery(internal.gw.commissions.getPayoutByCommission, {
    commissionId,
  });

  if (payout) {
    await ctx.runMutation(internal.gw.commissions.updatePayoutStatus, {
      payoutId: payout._id,
      status: "paid",
      paymentReference: paymentIntent.id,
      paidAt: Date.now(),
    });

    // Record platform fee
    const applicationFee = paymentIntent.application_fee_amount;
    if (applicationFee) {
      await ctx.runMutation(internal.gw.platformFees.recordFee, {
        organizationId,
        transactionType: "commission_payout_stripe",
        transactionId: payout._id,
        grossAmount: paymentIntent.amount,
        feeAmount: applicationFee,
        paymentMethod: "stripe",
        paymentReference: paymentIntent.id,
        status: "collected", // Already collected via Stripe
      });
    }
  }
}
```

### Day 5: PayPal Provider

**Task 2.4: Implement PayPal Provider**

```typescript
// convex/paymentProviders/paypal.ts

import { IPaymentProvider } from "./types";

export class PayPalPaymentProvider implements IPaymentProvider {
  readonly providerCode = "paypal";
  readonly providerName = "PayPal";
  readonly providerIcon = "💳";

  private clientId: string;
  private clientSecret: string;
  private baseUrl: string;

  constructor() {
    this.clientId = process.env.PAYPAL_CLIENT_ID!;
    this.clientSecret = process.env.PAYPAL_CLIENT_SECRET!;
    this.baseUrl = process.env.PAYPAL_SANDBOX === "true"
      ? "https://api-m.sandbox.paypal.com"
      : "https://api-m.paypal.com";
  }

  private async getAccessToken(): Promise<string> {
    const response = await fetch(`${this.baseUrl}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString("base64")}`,
      },
      body: "grant_type=client_credentials",
    });

    const data = await response.json();
    return data.access_token;
  }

  async createCheckoutSession(params: CheckoutSessionParams): Promise<CheckoutSessionResult> {
    const accessToken = await this.getAccessToken();
    const platformFee = this.calculatePlatformFee(params.priceInCents);
    const amountValue = (params.priceInCents / 100).toFixed(2);
    const feeValue = (platformFee / 100).toFixed(2);

    const response = await fetch(`${this.baseUrl}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [{
          reference_id: params.metadata?.commissionId,
          description: params.productName,
          amount: {
            currency_code: params.currency.toUpperCase(),
            value: amountValue,
            breakdown: {
              item_total: { currency_code: params.currency.toUpperCase(), value: amountValue },
            },
          },
          payee: {
            merchant_id: params.connectedAccountId,
          },
          payment_instruction: {
            platform_fees: [{
              amount: {
                currency_code: params.currency.toUpperCase(),
                value: feeValue,
              },
            }],
          },
        }],
        application_context: {
          brand_name: "Gründungswerft Benefits",
          return_url: params.successUrl,
          cancel_url: params.cancelUrl,
        },
      }),
    });

    const order = await response.json();
    const approveLink = order.links.find((l: any) => l.rel === "approve");

    return {
      sessionId: order.id,
      providerSessionId: order.id,
      checkoutUrl: approveLink?.href,
      expiresAt: Date.now() + 3600000,
      metadata: {
        platformFee: platformFee,
      },
    };
  }

  async verifyCheckoutPayment(sessionId: string): Promise<PaymentVerificationResult> {
    const accessToken = await this.getAccessToken();

    // Capture the order
    const response = await fetch(`${this.baseUrl}/v2/checkout/orders/${sessionId}/capture`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
      },
    });

    const capture = await response.json();
    const isSuccess = capture.status === "COMPLETED";

    if (isSuccess) {
      const captureDetails = capture.purchase_units[0].payments.captures[0];
      return {
        verified: true,
        paymentIntentId: capture.id,
        amount: Math.round(parseFloat(captureDetails.amount.value) * 100),
        currency: captureDetails.amount.currency_code,
        status: "succeeded",
      };
    }

    return {
      verified: false,
      status: "failed",
      error: capture.details?.[0]?.description || "Payment failed",
    };
  }

  private calculatePlatformFee(amountInCents: number): number {
    const feePercent = 0.025;
    const minFee = 100;
    const maxFee = 5000;

    const calculatedFee = Math.round(amountInCents * feePercent);
    return Math.max(minFee, Math.min(maxFee, calculatedFee));
  }
}
```

---

## Week 2: Platform Fees & UI

### Day 6-7: Platform Fee Tracking

**Task 2.5: Platform Fee Mutations**

```typescript
// convex/gw/platformFees.ts

import { mutation, query, internalMutation } from "../_generated/server";
import { v } from "convex/values";

export const recordFee = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    transactionType: v.string(),
    transactionId: v.id("objects"),
    grossAmount: v.number(),
    feeAmount: v.number(),
    paymentMethod: v.string(),
    paymentReference: v.optional(v.string()),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    const feePercent = (args.feeAmount / args.grossAmount) * 100;

    return await ctx.db.insert("platformFees", {
      organizationId: args.organizationId,
      transactionType: args.transactionType,
      transactionId: args.transactionId,
      grossAmount: args.grossAmount,
      feePercent,
      feeAmount: args.feeAmount,
      currency: "EUR",
      paymentMethod: args.paymentMethod,
      paymentReference: args.paymentReference,
      status: args.status,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const getFeeSummary = query({
  args: {
    organizationId: v.id("organizations"),
    periodStart: v.number(),
    periodEnd: v.number(),
  },
  handler: async (ctx, { organizationId, periodStart, periodEnd }) => {
    const fees = await ctx.db
      .query("platformFees")
      .withIndex("by_org", q => q.eq("organizationId", organizationId))
      .filter(q =>
        q.and(
          q.gte(q.field("createdAt"), periodStart),
          q.lte(q.field("createdAt"), periodEnd)
        )
      )
      .collect();

    const summary = {
      benefitClaimCount: 0,
      benefitClaimFees: 0,
      stripePayoutCount: 0,
      stripePayoutFees: 0,
      paypalPayoutCount: 0,
      paypalPayoutFees: 0,
      cryptoPayoutCount: 0,
      cryptoPayoutFees: 0,
      escrowReleaseCount: 0,
      escrowReleaseFees: 0,
      totalFees: 0,
    };

    for (const fee of fees) {
      summary.totalFees += fee.feeAmount;

      switch (fee.transactionType) {
        case "benefit_claim":
          summary.benefitClaimCount++;
          summary.benefitClaimFees += fee.feeAmount;
          break;
        case "commission_payout_stripe":
          summary.stripePayoutCount++;
          summary.stripePayoutFees += fee.feeAmount;
          break;
        case "commission_payout_paypal":
          summary.paypalPayoutCount++;
          summary.paypalPayoutFees += fee.feeAmount;
          break;
        case "commission_payout_crypto":
          summary.cryptoPayoutCount++;
          summary.cryptoPayoutFees += fee.feeAmount;
          break;
        case "commission_escrow_release":
          summary.escrowReleaseCount++;
          summary.escrowReleaseFees += fee.feeAmount;
          break;
      }
    }

    // Calculate volume discount
    const discountPercent = calculateVolumeDiscount(summary.totalFees);
    const discountAmount = Math.round(summary.totalFees * (discountPercent / 100));

    return {
      ...summary,
      discountPercent,
      discountAmount,
      finalTotal: summary.totalFees - discountAmount,
    };
  },
});

function calculateVolumeDiscount(totalFees: number): number {
  if (totalFees >= 500000) return 25; // €5000+
  if (totalFees >= 250000) return 20; // €2500+
  if (totalFees >= 100000) return 15; // €1000+
  if (totalFees >= 50000) return 10;  // €500+
  return 0;
}
```

### Day 8-9: Commission Payout Flow

**Task 2.6: Payout Initiation**

```typescript
// convex/gw/commissions.ts

export const initiateCommissionPayout = mutation({
  args: {
    commissionId: v.id("objects"),
    affiliateId: v.id("objects"),
    merchantId: v.id("objects"),
    amount: v.number(),
    referralDetails: v.string(),
    paymentMethod: v.string(),
  },
  handler: async (ctx, args) => {
    const commission = await ctx.db.get(args.commissionId);
    if (!commission) throw new Error("Commission not found");

    const affiliate = await ctx.db.get(args.affiliateId);
    if (!affiliate) throw new Error("Affiliate not found");

    const merchant = await ctx.db.get(args.merchantId);
    if (!merchant) throw new Error("Merchant not found");

    // Create payout record
    const payoutId = await ctx.db.insert("gwCommissionPayouts", {
      organizationId: commission.organizationId,
      commissionId: args.commissionId,
      affiliateId: args.affiliateId,
      merchantId: args.merchantId,
      referralDetails: args.referralDetails,
      amountInCents: args.amount,
      currency: "EUR",
      status: "pending_verification",
      paymentMethod: args.paymentMethod,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return payoutId;
  },
});

export const verifyAndProcessPayout = mutation({
  args: {
    payoutId: v.id("gwCommissionPayouts"),
  },
  handler: async (ctx, { payoutId }) => {
    const payout = await ctx.db.get(payoutId);
    if (!payout) throw new Error("Payout not found");

    if (payout.status !== "pending_verification") {
      throw new Error("Payout already processed");
    }

    // Update to verified
    await ctx.db.patch(payoutId, {
      status: "verified",
      updatedAt: Date.now(),
    });

    // Get affiliate payment info
    const affiliate = await ctx.db.get(payout.affiliateId);
    if (!affiliate) throw new Error("Affiliate not found");

    // Return info needed for payment
    return {
      payoutId,
      amount: payout.amountInCents,
      currency: payout.currency,
      paymentMethod: payout.paymentMethod,
      affiliateId: payout.affiliateId,
      affiliateName: affiliate.name,
      affiliateEmail: affiliate.customProperties?.email,
      stripeAccountId: affiliate.customProperties?.stripeAccountId,
      paypalMerchantId: affiliate.customProperties?.paypalMerchantId,
      walletAddress: affiliate.customProperties?.linkedWallets?.[0],
    };
  },
});
```

### Day 10-12: Payment UI

**Task 2.7: Payment Method Selection**

```typescript
// src/app/(dashboard)/payments/payout/[id]/page.tsx
"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PayoutPage({ params }: { params: { id: string } }) {
  const payout = useQuery(api.gw.commissions.getPayout, { payoutId: params.id });
  const paymentMethods = useQuery(api.gw.payments.getPaymentMethods, {
    memberId: payout?.affiliateId,
  });

  const [selectedMethod, setSelectedMethod] = useState<string>("");
  const [processing, setProcessing] = useState(false);

  const processPayout = useMutation(api.gw.payments.processPayout);

  if (!payout || !paymentMethods) {
    return <div>Loading...</div>;
  }

  const handlePayout = async () => {
    setProcessing(true);
    try {
      const result = await processPayout({
        payoutId: params.id,
        paymentMethod: selectedMethod,
      });

      if (result.checkoutUrl) {
        // Redirect to Stripe/PayPal checkout
        window.location.href = result.checkoutUrl;
      } else if (result.txParams) {
        // Handle crypto transaction
        // ...
      }
    } catch (error) {
      console.error("Payout failed:", error);
    } finally {
      setProcessing(false);
    }
  };

  const formatAmount = (cents: number) => {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
    }).format(cents / 100);
  };

  const platformFee = calculatePlatformFee(payout.amountInCents, selectedMethod);

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Provision auszahlen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Amount summary */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between">
              <span>Provisionsbetrag</span>
              <span className="font-semibold">{formatAmount(payout.amountInCents)}</span>
            </div>
            {selectedMethod && (
              <>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Plattformgebühr ({getFeePercent(selectedMethod)}%)</span>
                  <span>-{formatAmount(platformFee)}</span>
                </div>
                <div className="flex justify-between font-bold mt-2 pt-2 border-t">
                  <span>Auszahlung an {payout.affiliateName}</span>
                  <span>{formatAmount(payout.amountInCents - platformFee)}</span>
                </div>
              </>
            )}
          </div>

          {/* Payment method selection */}
          <div>
            <h3 className="font-medium mb-3">Zahlungsmethode wählen</h3>
            <RadioGroup value={selectedMethod} onValueChange={setSelectedMethod}>
              {paymentMethods.map((method) => (
                <div
                  key={method.provider}
                  className={`flex items-center space-x-3 p-4 border rounded-lg ${
                    method.ready ? "cursor-pointer hover:bg-gray-50" : "opacity-50"
                  }`}
                >
                  <RadioGroupItem
                    value={method.provider}
                    disabled={!method.ready}
                    id={method.provider}
                  />
                  <label htmlFor={method.provider} className="flex-1">
                    <div className="font-medium">{method.label}</div>
                    <div className="text-sm text-gray-500">
                      {method.ready ? "Bereit" : "Nicht verbunden"}
                    </div>
                  </label>
                  <div className="text-sm text-gray-500">
                    {getFeePercent(method.provider)}% Gebühr
                  </div>
                </div>
              ))}
            </RadioGroup>
          </div>

          <Button
            onClick={handlePayout}
            disabled={!selectedMethod || processing}
            className="w-full"
          >
            {processing ? "Verarbeite..." : "Jetzt auszahlen"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function getFeePercent(method: string): number {
  switch (method) {
    case "stripe":
    case "paypal":
      return 2.5;
    case "ethereum":
      return 1.5;
    case "ethereum-escrow":
      return 1.0;
    default:
      return 2.5;
  }
}

function calculatePlatformFee(amount: number, method: string): number {
  const percent = getFeePercent(method) / 100;
  const fee = Math.round(amount * percent);
  const minFee = method.includes("ethereum") ? 50 : 100;
  const maxFee = method.includes("ethereum") ? 2500 : 5000;
  return Math.max(minFee, Math.min(maxFee, fee));
}
```

### Day 13-14: Testing & Integration

**Task 2.8: End-to-End Testing**

- [ ] Test Stripe payout flow with test account
- [ ] Verify platform fee is collected
- [ ] Test PayPal payout flow
- [ ] Test webhook handling
- [ ] Verify fee records in database
- [ ] Test payment method selection UI
- [ ] Test edge cases (failed payments, retries)

---

## Checklist

### Week 1
- [ ] Update Stripe provider with application fees
- [ ] Implement member Stripe account connection
- [ ] Handle Stripe webhooks for payments
- [ ] Implement PayPal provider
- [ ] Test PayPal order creation and capture
- [ ] Handle PayPal webhooks

### Week 2
- [ ] Add platformFees table to schema
- [ ] Implement fee recording mutations
- [ ] Implement fee summary queries
- [ ] Create commission payout workflow
- [ ] Build payment method selection UI
- [ ] Build payout confirmation page
- [ ] Test complete payout flows
- [ ] Verify platform fees collected correctly

---

## Success Criteria

1. ✅ Members can connect Stripe accounts
2. ✅ Merchants can pay commissions via Stripe
3. ✅ Merchants can pay commissions via PayPal
4. ✅ Platform fees are collected on all transactions
5. ✅ Fee records stored in database
6. ✅ Payment method selection works

---

## Next Phase

[Phase 3: Blockchain](./PHASE_3_BLOCKCHAIN.md) - Add MetaMask and smart contract escrow
