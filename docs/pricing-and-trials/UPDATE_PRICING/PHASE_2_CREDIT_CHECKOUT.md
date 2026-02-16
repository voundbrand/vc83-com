# Phase 2: Dynamic Credit Checkout

> **Priority:** HIGH
> **Dependencies:** Phase 1 (backend tiers must be updated)
> **Files touched:** 2

## Goal

Create a dynamic credit purchasing system where users pick a EUR amount and credits are calculated at a tiered rate. No fixed Stripe Price IDs needed — prices are created on-the-fly.

---

## Design: v0-Style Credit Purchasing

Based on the v0 screenshot and `.env.local` configuration:

```
# Credit Purchases — Dynamic pricing (no fixed Stripe Price IDs needed)
# Users pick any EUR amount, credits calculated at tiered rate.
```

### Preset Amounts

| Button | EUR Amount | Credits (at tiered rate) |
|--------|-----------|------------------------|
| €30 | 3,000 cents | ~300 credits |
| €60 | 6,000 cents | ~660 credits |
| €100 | 10,000 cents | ~1,100 credits |
| €250 | 25,000 cents | ~3,000 credits |
| €500 | 50,000 cents | ~6,500 credits |
| Custom | User input | Calculated live |

### Tiered Credit Rate

| EUR Spent | Rate (credits per EUR) | Bonus |
|-----------|----------------------|-------|
| €1-29 | 10 credits/EUR | — |
| €30-99 | 11 credits/EUR | +10% |
| €100-249 | 12 credits/EUR | +20% |
| €250-499 | 13 credits/EUR | +30% |
| €500+ | 15 credits/EUR | +50% |

---

## 2A. CREATE `convex/stripe/creditCheckout.ts`

**Target:** ~150 lines

### Exports

```typescript
// Tiered rate configuration
export const CREDIT_TIERS = [
  { minCents: 0,     rate: 10 }, // Base rate
  { minCents: 3000,  rate: 11 }, // €30+: +10%
  { minCents: 10000, rate: 12 }, // €100+: +20%
  { minCents: 25000, rate: 13 }, // €250+: +30%
  { minCents: 50000, rate: 15 }, // €500+: +50%
];

// Pure function — also used by frontend for live preview
export function calculateCreditsFromAmount(amountInCents: number): number {
  const tier = [...CREDIT_TIERS].reverse().find(t => amountInCents >= t.minCents);
  const rate = tier?.rate ?? 10;
  return Math.floor((amountInCents / 100) * rate);
}

// Convex action: create Stripe checkout session for credit purchase
export const createCreditCheckoutSession = internalAction({
  args: {
    organizationId: v.id("organizations"),
    organizationName: v.string(),
    email: v.string(),
    amountInCents: v.number(), // EUR amount in cents (min 500 = €5)
    successUrl: v.string(),
    cancelUrl: v.string(),
  },
  handler: async (ctx, args) => {
    // 1. Validate minimum amount
    if (args.amountInCents < 500) throw new Error("Minimum credit purchase is €5");

    // 2. Calculate credits
    const credits = calculateCreditsFromAmount(args.amountInCents);

    // 3. Get/create Stripe customer
    const customer = await getOrCreateCustomer(stripe, args);

    // 4. Create dynamic Stripe price (one-time)
    const price = await stripe.prices.create({
      unit_amount: args.amountInCents,
      currency: "eur",
      product_data: {
        name: `${credits} Platform Credits`,
        metadata: { type: "credit-purchase" },
      },
    });

    // 5. Create checkout session
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer: customer.id,
      line_items: [{ price: price.id, quantity: 1 }],
      success_url: args.successUrl,
      cancel_url: args.cancelUrl,
      metadata: {
        type: "credit-purchase",
        organizationId: args.organizationId,
        credits: credits.toString(),
        amountInCents: args.amountInCents.toString(),
      },
      automatic_tax: { enabled: true },
      billing_address_collection: "required",
    });

    return { checkoutUrl: session.url, sessionId: session.id, credits };
  },
});
```

### Pattern Reference

Follow `convex/stripe/smsCheckout.ts` for:
- Dynamic Stripe price creation
- Customer lookup/creation
- Checkout session with metadata
- Webhook handling pattern

---

## 2B. Wire Webhook — `convex/stripe/platformWebhooks.ts`

**Action:** MODIFY

In `handleCheckoutCompleted` (or equivalent), add credit purchase handling:

```typescript
// Inside checkout.session.completed handler
const metadata = session.metadata;

if (metadata?.type === "credit-purchase") {
  const credits = parseInt(metadata.credits);
  const organizationId = metadata.organizationId as Id<"organizations">;
  const amountInCents = parseInt(metadata.amountInCents);

  // Add credits to organization balance
  await ctx.runMutation(internal.credits.index.addPurchasedCredits, {
    organizationId,
    userId: undefined, // System-initiated
    credits,
    packId: `dynamic_${amountInCents}`,
    stripePaymentIntentId: session.payment_intent as string,
  });

  // Send confirmation email (Phase 5)
  // await ctx.runAction(internal.actions.subscriptionEmails.sendSubscriptionEmail, {
  //   organizationId,
  //   event: "credit_purchase",
  //   details: { credits, amountInCents },
  // });

  return;
}
```

### Existing Infrastructure

The credit system is already built in `convex/credits/index.ts`:
- `addPurchasedCredits(organizationId, userId, credits, packId, stripePaymentIntentId)` — adds to purchased pool
- Creates `creditTransactions` audit entry with type `"purchase"`
- Creates `creditPurchases` record linked to Stripe payment

---

## Verification

1. TypeScript check:
```bash
npx tsc --noEmit --pretty -- convex/stripe/creditCheckout.ts
```

2. Manual test flow:
   - Call `createCreditCheckoutSession` with test org + €100 amount
   - Verify Stripe dashboard shows dynamic price "1,100 Platform Credits — €100.00"
   - Complete test payment with card `4242 4242 4242 4242`
   - Verify webhook fires and credits appear in `creditBalances` table
