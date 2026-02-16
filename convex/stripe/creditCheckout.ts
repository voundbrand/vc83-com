/**
 * DYNAMIC CREDIT CHECKOUT
 *
 * Creates Stripe Checkout sessions for one-time credit purchases
 * with tiered pricing (more EUR = better rate).
 *
 * Credit Tiers:
 * - €1-29:   10 credits per EUR
 * - €30-99:  11 credits per EUR
 * - €100-249: 11 credits per EUR + 100 bonus
 * - €250-499: 12 credits per EUR + 500 bonus
 * - €500+:    13 credits per EUR + 1,500 bonus
 *
 * Uses dynamic Stripe prices (created on-the-fly, no fixed Price IDs).
 */

import { action } from "../_generated/server";
import { api, internal } from "../_generated/api";
import { v } from "convex/values";
import Stripe from "stripe";

const getStripe = () => {
  const apiKey = process.env.STRIPE_SECRET_KEY;
  if (!apiKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  return new Stripe(apiKey, {
    apiVersion: "2025-10-29.clover",
  });
};

/**
 * Credit tier definitions
 * Shared logic - also used by frontend via src/lib/credit-pricing.ts
 */
export const CREDIT_TIERS = [
  { minEur: 1,   maxEur: 29,   creditsPerEur: 10, bonus: 0 },
  { minEur: 30,  maxEur: 99,   creditsPerEur: 11, bonus: 0 },
  { minEur: 100, maxEur: 249,  creditsPerEur: 11, bonus: 100 },
  { minEur: 250, maxEur: 499,  creditsPerEur: 12, bonus: 500 },
  { minEur: 500, maxEur: 10000, creditsPerEur: 13, bonus: 1500 },
] as const;

/**
 * Preset purchase amounts for quick selection
 */
export const PRESET_AMOUNTS = [30, 60, 100, 250, 500] as const;

/**
 * Calculate credits from a EUR amount
 * Pure function - used by both backend and frontend
 */
export function calculateCreditsFromAmount(amountEur: number): {
  credits: number;
  baseCredits: number;
  bonus: number;
  creditsPerEur: number;
} {
  if (amountEur < 1) {
    return { credits: 0, baseCredits: 0, bonus: 0, creditsPerEur: 0 };
  }

  const tier = CREDIT_TIERS.find(
    (t) => amountEur >= t.minEur && amountEur <= t.maxEur
  ) || CREDIT_TIERS[CREDIT_TIERS.length - 1];

  const baseCredits = Math.floor(amountEur * tier.creditsPerEur);
  const bonus = tier.bonus;

  return {
    credits: baseCredits + bonus,
    baseCredits,
    bonus,
    creditsPerEur: tier.creditsPerEur,
  };
}

/**
 * CREATE CREDIT CHECKOUT SESSION
 *
 * Creates a Stripe Checkout session for a one-time credit purchase.
 * Uses dynamic pricing - creates a Stripe price on the fly.
 */
export const createCreditCheckoutSession = action({
  args: {
    organizationId: v.id("organizations"),
    organizationName: v.string(),
    email: v.string(),
    amountEur: v.number(), // Amount in EUR (integer)
    successUrl: v.string(),
    cancelUrl: v.string(),
    isB2B: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const stripe = getStripe();

    // Validate amount
    if (args.amountEur < 1 || args.amountEur > 10000) {
      throw new Error("Credit purchase amount must be between €1 and €10,000");
    }

    // Calculate credits
    const { credits } = calculateCreditsFromAmount(args.amountEur);
    const amountCents = Math.round(args.amountEur * 100);

    // Get organization and existing billing details
    const org = await ctx.runQuery(api.organizations.get, { id: args.organizationId });

    const billingDetails = await ctx.runQuery(internal.stripe.platformCheckout.getOrganizationBillingDetails, {
      organizationId: args.organizationId,
    });

    // Prepare customer data
    const customerData: Stripe.CustomerCreateParams = {
      name: billingDetails?.billingName || args.organizationName,
      email: billingDetails?.billingEmail || args.email,
      metadata: {
        organizationId: args.organizationId,
        userEmail: args.email,
        platform: "l4yercak3",
      },
      ...(billingDetails?.billingAddress && {
        address: {
          line1: billingDetails.billingAddress.line1,
          line2: billingDetails.billingAddress.line2 || undefined,
          city: billingDetails.billingAddress.city,
          state: billingDetails.billingAddress.state || undefined,
          postal_code: billingDetails.billingAddress.postalCode,
          country: billingDetails.billingAddress.country,
        },
      }),
    };

    let customerId: string;
    if (org?.stripeCustomerId) {
      try {
        const customer = await stripe.customers.retrieve(org.stripeCustomerId);
        if (!customer.deleted) {
          customerId = org.stripeCustomerId;

          if (billingDetails?.billingAddress) {
            await stripe.customers.update(customerId, {
              name: billingDetails.billingName || args.organizationName,
              email: billingDetails.billingEmail || args.email,
              address: {
                line1: billingDetails.billingAddress.line1,
                line2: billingDetails.billingAddress.line2 || undefined,
                city: billingDetails.billingAddress.city,
                state: billingDetails.billingAddress.state || undefined,
                postal_code: billingDetails.billingAddress.postalCode,
                country: billingDetails.billingAddress.country,
              },
            });
          }
        } else {
          throw new Error("Customer deleted");
        }
      } catch {
        const customer = await stripe.customers.create(customerData);
        customerId = customer.id;
        await ctx.runMutation(internal.organizations.updateStripeCustomer, {
          organizationId: args.organizationId,
          stripeCustomerId: customer.id,
        });
      }
    } else {
      const customer = await stripe.customers.create(customerData);
      customerId = customer.id;
      await ctx.runMutation(internal.organizations.updateStripeCustomer, {
        organizationId: args.organizationId,
        stripeCustomerId: customer.id,
      });
    }

    // Create a dynamic price for this specific amount
    const price = await stripe.prices.create({
      unit_amount: amountCents,
      currency: "eur",
      product_data: {
        name: `${credits.toLocaleString()} Credits`,
        metadata: {
          type: "credit-purchase",
          platform: "l4yercak3",
        },
      },
    });

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "payment",
      line_items: [
        {
          price: price.id,
          quantity: 1,
        },
      ],
      success_url: args.successUrl,
      cancel_url: args.cancelUrl,
      billing_address_collection: "required",
      customer_update: {
        address: "auto",
        name: "auto",
      },
      automatic_tax: {
        enabled: true,
      },
      tax_id_collection: {
        enabled: true,
      },
      metadata: {
        organizationId: args.organizationId,
        type: "credit-purchase",
        credits: credits.toString(),
        amountEur: args.amountEur.toString(),
        platform: "l4yercak3",
        isB2B: args.isB2B ? "true" : "false",
      },
      payment_intent_data: {
        metadata: {
          organizationId: args.organizationId,
          type: "credit-purchase",
          credits: credits.toString(),
          amountEur: args.amountEur.toString(),
          platform: "l4yercak3",
        },
      },
    });

    return {
      checkoutUrl: session.url!,
      sessionId: session.id,
      credits,
    };
  },
});
