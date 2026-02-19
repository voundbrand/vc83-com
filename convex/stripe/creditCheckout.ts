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
import { v } from "convex/values";
import Stripe from "stripe";
import { resolvePublicAppUrl } from "./platformCheckout";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const generatedApi: any = require("../_generated/api");

type FunnelAttribution = {
  channel?: "webchat" | "native_guest" | "telegram" | "platform_web" | "unknown";
  campaign?: {
    source?: string;
    medium?: string;
    campaign?: string;
    content?: string;
    term?: string;
    referrer?: string;
    landingPath?: string;
  };
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

export function buildCreditCheckoutRedirectUrls(args: {
  appBaseUrl?: string;
  amountEur: number;
  credits: number;
  attribution?: FunnelAttribution;
}): { successUrl: string; cancelUrl: string } {
  const baseUrl = (args.appBaseUrl || resolvePublicAppUrl()).replace(/\/+$/, "");
  const params = new URLSearchParams({
    purchase: "success",
    type: "credits",
    amount: String(Math.round(args.amountEur * 100)),
    credits: String(args.credits),
  });

  const attribution = args.attribution;
  if (attribution?.channel) params.set("onboardingChannel", attribution.channel);
  if (attribution?.campaign?.source) params.set("utm_source", attribution.campaign.source);
  if (attribution?.campaign?.medium) params.set("utm_medium", attribution.campaign.medium);
  if (attribution?.campaign?.campaign) params.set("utm_campaign", attribution.campaign.campaign);
  if (attribution?.campaign?.content) params.set("utm_content", attribution.campaign.content);
  if (attribution?.campaign?.term) params.set("utm_term", attribution.campaign.term);
  if (attribution?.campaign?.referrer) params.set("referrer", attribution.campaign.referrer);
  if (attribution?.campaign?.landingPath) params.set("landingPath", attribution.campaign.landingPath);

  return {
    successUrl: `${baseUrl}/?${params.toString()}`,
    cancelUrl: `${baseUrl}/?purchase=canceled&type=credits`,
  };
}

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
    funnelChannel: v.optional(
      v.union(
        v.literal("webchat"),
        v.literal("native_guest"),
        v.literal("telegram"),
        v.literal("platform_web"),
        v.literal("unknown")
      )
    ),
    funnelCampaign: v.optional(
      v.object({
        source: v.optional(v.string()),
        medium: v.optional(v.string()),
        campaign: v.optional(v.string()),
        content: v.optional(v.string()),
        term: v.optional(v.string()),
        referrer: v.optional(v.string()),
        landingPath: v.optional(v.string()),
      })
    ),
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
    const org = await (ctx as any).runQuery(generatedApi.api.organizations.get, { id: args.organizationId });

    const billingDetails = await (ctx as any).runQuery(generatedApi.internal.stripe.platformCheckout.getOrganizationBillingDetails, {
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
        await (ctx as any).runMutation(generatedApi.internal.organizations.updateStripeCustomer, {
          organizationId: args.organizationId,
          stripeCustomerId: customer.id,
        });
      }
    } else {
      const customer = await stripe.customers.create(customerData);
      customerId = customer.id;
      await (ctx as any).runMutation(generatedApi.internal.organizations.updateStripeCustomer, {
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
        ...(args.funnelChannel ? { funnelChannel: args.funnelChannel } : {}),
        ...(args.funnelCampaign?.source ? { utmSource: args.funnelCampaign.source } : {}),
        ...(args.funnelCampaign?.medium ? { utmMedium: args.funnelCampaign.medium } : {}),
        ...(args.funnelCampaign?.campaign ? { utmCampaign: args.funnelCampaign.campaign } : {}),
        ...(args.funnelCampaign?.content ? { utmContent: args.funnelCampaign.content } : {}),
        ...(args.funnelCampaign?.term ? { utmTerm: args.funnelCampaign.term } : {}),
        ...(args.funnelCampaign?.referrer ? { funnelReferrer: args.funnelCampaign.referrer } : {}),
        ...(args.funnelCampaign?.landingPath ? { funnelLandingPath: args.funnelCampaign.landingPath } : {}),
      },
      payment_intent_data: {
        metadata: {
          organizationId: args.organizationId,
          type: "credit-purchase",
          credits: credits.toString(),
          amountEur: args.amountEur.toString(),
          platform: "l4yercak3",
          ...(args.funnelChannel ? { funnelChannel: args.funnelChannel } : {}),
          ...(args.funnelCampaign?.source ? { utmSource: args.funnelCampaign.source } : {}),
          ...(args.funnelCampaign?.medium ? { utmMedium: args.funnelCampaign.medium } : {}),
          ...(args.funnelCampaign?.campaign ? { utmCampaign: args.funnelCampaign.campaign } : {}),
          ...(args.funnelCampaign?.content ? { utmContent: args.funnelCampaign.content } : {}),
          ...(args.funnelCampaign?.term ? { utmTerm: args.funnelCampaign.term } : {}),
          ...(args.funnelCampaign?.referrer ? { funnelReferrer: args.funnelCampaign.referrer } : {}),
          ...(args.funnelCampaign?.landingPath ? { funnelLandingPath: args.funnelCampaign.landingPath } : {}),
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
