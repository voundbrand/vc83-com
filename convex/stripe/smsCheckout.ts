/**
 * STRIPE SMS NUMBER CHECKOUT
 *
 * Creates Stripe Checkout sessions for VLN (dedicated number) purchases.
 * Dynamic pricing — each number has different setup/monthly fees from Infobip.
 *
 * Flow:
 * 1. Frontend calls Next.js route `/api/stripe/create-sms-checkout`
 * 2. Route calls this Convex action
 * 3. Action reads org's platform_sms_config for VLN pricing
 * 4. Creates dynamic Stripe prices + checkout session
 * 5. Returns checkout URL for redirect
 */

import { action } from "../_generated/server";
import { v } from "convex/values";
import Stripe from "stripe";

// Dynamic require to avoid TS2589 deep type instantiation
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { api: apiRef, internal: internalRef } = require("../_generated/api") as {
  api: Record<string, Record<string, Record<string, unknown>>>;
  internal: Record<string, Record<string, Record<string, unknown>>>;
};

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
 * CREATE SMS NUMBER CHECKOUT SESSION
 *
 * Reads VLN pricing from the org's platform_sms_config,
 * creates dynamic Stripe prices, and returns a Checkout Session URL.
 */
export const createSmsCheckoutSession = action({
  args: {
    organizationId: v.id("organizations"),
    organizationName: v.string(),
    email: v.string(),
    successUrl: v.string(),
    cancelUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const stripe = getStripe();

    // 1. Read the org's VLN config for pricing
    const vlnConfig = await (ctx.runQuery as Function)(
      internalRef.channels.platformSms.getVlnConfigInternal,
      { organizationId: args.organizationId }
    ) as Record<string, unknown> | null;

    if (!vlnConfig) {
      throw new Error("No VLN order found. Please complete the number selection wizard first.");
    }

    const vlnStatus = vlnConfig.vlnStatus as string;
    if (vlnStatus !== "pending_payment") {
      throw new Error(`VLN order is not pending payment (status: ${vlnStatus})`);
    }

    const ourSetupFee = vlnConfig.vlnOurSetupFee as number;
    const ourMonthlyFee = vlnConfig.vlnOurMonthlyFee as number;
    const vlnNumber = vlnConfig.vlnNumber as string;
    const vlnCountry = vlnConfig.vlnCountry as string;

    if (!ourSetupFee || !ourMonthlyFee) {
      throw new Error("VLN pricing not set in config");
    }

    // 2. Get or create Stripe customer
    const org = await (ctx.runQuery as Function)(
      internalRef.stripe.platformWebhooks.getOrganizationInternal,
      { organizationId: args.organizationId }
    ) as Record<string, unknown> | null;

    let customerId = org?.stripeCustomerId as string | undefined;

    if (customerId) {
      try {
        const customer = await stripe.customers.retrieve(customerId);
        if (customer.deleted) {
          customerId = undefined;
        }
      } catch {
        customerId = undefined;
      }
    }

    if (!customerId) {
      const customer = await stripe.customers.create({
        name: args.organizationName,
        email: args.email,
        metadata: {
          organizationId: args.organizationId,
          platform: "l4yercak3",
        },
      });
      customerId = customer.id;

      // Store customer ID on org
      await (ctx.runMutation as Function)(
        internalRef.organizations.updateStripeCustomer,
        {
          organizationId: args.organizationId,
          stripeCustomerId: customer.id,
        }
      );
    }

    // 3. Create dynamic Stripe prices
    const setupPrice = await stripe.prices.create({
      unit_amount: Math.round(ourSetupFee * 100),
      currency: "eur",
      product_data: {
        name: `SMS Number Setup — ${vlnNumber} (${vlnCountry})`,
      },
    });

    const monthlyPrice = await stripe.prices.create({
      unit_amount: Math.round(ourMonthlyFee * 100),
      currency: "eur",
      recurring: { interval: "month" },
      product_data: {
        name: `SMS Number Monthly — ${vlnNumber} (${vlnCountry})`,
      },
    });

    // 4. Create Checkout Session (subscription + one-time setup fee)
    // add_invoice_items is supported by the Stripe API for checkout subscription_data
    // but not in the TS types for this version, so we extend the type.
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      mode: "subscription",
      line_items: [
        { price: monthlyPrice.id, quantity: 1 },
      ],
      subscription_data: {
        metadata: {
          type: "sms-number",
          organizationId: args.organizationId,
          platform: "l4yercak3",
          vlnNumber,
          vlnCountry,
        },
      },
      metadata: {
        type: "sms-number",
        organizationId: args.organizationId,
        platform: "l4yercak3",
      },
      success_url: args.successUrl,
      cancel_url: args.cancelUrl,
      billing_address_collection: "required",
      automatic_tax: { enabled: true },
      tax_id_collection: { enabled: true },
    };

    // Inject add_invoice_items for the one-time setup fee
    (sessionParams.subscription_data as Record<string, unknown>).add_invoice_items = [
      { price: setupPrice.id, quantity: 1 },
    ];

    const session = await stripe.checkout.sessions.create(sessionParams);

    return {
      checkoutUrl: session.url!,
      sessionId: session.id,
    };
  },
});
