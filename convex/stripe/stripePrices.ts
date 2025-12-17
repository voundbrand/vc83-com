/**
 * STRIPE PRICES API
 *
 * Fetches prices directly from Stripe using price IDs from environment variables.
 * This ensures the frontend always displays accurate, up-to-date prices.
 */

import { action } from "../_generated/server";
import { v } from "convex/values";
import Stripe from "stripe";

// Initialize Stripe with API key from environment
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
 * Price ID mapping from environment variables
 */
const PRICE_IDS = {
  // Platform Plans (Monthly)
  platformMonthly: {
    free: process.env.STRIPE_FREE_MO_PRICE_ID,
    community: process.env.STRIPE_COMMUNITY_MO_PRICE_ID,
    starter: process.env.STRIPE_STARTER_MO_PRICE_ID,
    professional: process.env.STRIPE_PROFESSIONAL_MO_PRICE_ID,
    agency: process.env.STRIPE_AGENCY_MO_PRICE_ID,
    enterprise: process.env.STRIPE_ENTERPRISE_MO_PRICE_ID,
  },
  // Platform Plans (Annual)
  platformAnnual: {
    community: process.env.STRIPE_COMMUNITY_YR_PRICE_ID,
    starter: process.env.STRIPE_STARTER_YR_PRICE_ID,
    professional: process.env.STRIPE_PROFESSIONAL_YR_PRICE_ID,
    agency: process.env.STRIPE_AGENCY_YR_PRICE_ID,
    enterprise: process.env.STRIPE_ENTERPRISE_YR_PRICE_ID,
  },
  // AI Subscriptions
  ai: {
    standard: process.env.STRIPE_AI_STANDARD_PRICE_ID,
    privacy: process.env.STRIPE_AI_PRIVACY_PRICE_ID,
  },
  // Private LLM
  privateLlm: {
    starter: process.env.STRIPE_PRIVATE_LLM_STARTER_PRICE_ID,
    pro: process.env.STRIPE_PRIVATE_LLM_PRO_PRICE_ID,
    enterprise: process.env.STRIPE_PRIVATE_LLM_ENT_PRICE_ID,
  },
  // Token Packs
  tokens: {
    starter: process.env.STRIPE_TOKENS_STARTER_PRICE_ID,
    standard: process.env.STRIPE_TOKENS_STANDARD_PRICE_ID,
    professional: process.env.STRIPE_TOKENS_PRO_PRICE_ID,
    enterprise: process.env.STRIPE_TOKENS_ENT_PRICE_ID,
  },
};

/**
 * Price data returned from Stripe
 */
interface PriceData {
  id: string;
  unitAmount: number | null; // in cents
  currency: string;
  interval: string | null; // "month", "year", or null for one-time
  intervalCount: number | null;
  productName: string | null;
  active: boolean;
}

/**
 * Fetch a single price from Stripe
 */
async function fetchPrice(stripe: Stripe, priceId: string | undefined): Promise<PriceData | null> {
  if (!priceId) return null;

  try {
    const price = await stripe.prices.retrieve(priceId, {
      expand: ["product"],
    });

    const product = price.product as Stripe.Product | null;

    return {
      id: price.id,
      unitAmount: price.unit_amount,
      currency: price.currency,
      interval: price.recurring?.interval || null,
      intervalCount: price.recurring?.interval_count || null,
      productName: product?.name || null,
      active: price.active,
    };
  } catch (error) {
    console.error(`Failed to fetch price ${priceId}:`, error);
    return null;
  }
}

/**
 * GET ALL PRICES
 *
 * Fetches all configured prices from Stripe.
 * Returns a structured object with prices for all product categories.
 */
export const getAllPrices = action({
  args: {},
  handler: async () => {
    const stripe = getStripe();

    // Fetch all prices in parallel
    const [
      // Platform Monthly
      freeMonthly,
      communityMonthly,
      starterMonthly,
      professionalMonthly,
      agencyMonthly,
      enterpriseMonthly,
      // Platform Annual
      communityAnnual,
      starterAnnual,
      professionalAnnual,
      agencyAnnual,
      enterpriseAnnual,
      // AI
      aiStandard,
      aiPrivacy,
      // Private LLM
      privateLlmStarter,
      privateLlmPro,
      privateLlmEnterprise,
      // Token Packs
      tokensStarter,
      tokensStandard,
      tokensProfessional,
      tokensEnterprise,
    ] = await Promise.all([
      // Platform Monthly
      fetchPrice(stripe, PRICE_IDS.platformMonthly.free),
      fetchPrice(stripe, PRICE_IDS.platformMonthly.community),
      fetchPrice(stripe, PRICE_IDS.platformMonthly.starter),
      fetchPrice(stripe, PRICE_IDS.platformMonthly.professional),
      fetchPrice(stripe, PRICE_IDS.platformMonthly.agency),
      fetchPrice(stripe, PRICE_IDS.platformMonthly.enterprise),
      // Platform Annual
      fetchPrice(stripe, PRICE_IDS.platformAnnual.community),
      fetchPrice(stripe, PRICE_IDS.platformAnnual.starter),
      fetchPrice(stripe, PRICE_IDS.platformAnnual.professional),
      fetchPrice(stripe, PRICE_IDS.platformAnnual.agency),
      fetchPrice(stripe, PRICE_IDS.platformAnnual.enterprise),
      // AI
      fetchPrice(stripe, PRICE_IDS.ai.standard),
      fetchPrice(stripe, PRICE_IDS.ai.privacy),
      // Private LLM
      fetchPrice(stripe, PRICE_IDS.privateLlm.starter),
      fetchPrice(stripe, PRICE_IDS.privateLlm.pro),
      fetchPrice(stripe, PRICE_IDS.privateLlm.enterprise),
      // Token Packs
      fetchPrice(stripe, PRICE_IDS.tokens.starter),
      fetchPrice(stripe, PRICE_IDS.tokens.standard),
      fetchPrice(stripe, PRICE_IDS.tokens.professional),
      fetchPrice(stripe, PRICE_IDS.tokens.enterprise),
    ]);

    return {
      platform: {
        monthly: {
          free: freeMonthly,
          community: communityMonthly,
          starter: starterMonthly,
          professional: professionalMonthly,
          agency: agencyMonthly,
          enterprise: enterpriseMonthly,
        },
        annual: {
          community: communityAnnual,
          starter: starterAnnual,
          professional: professionalAnnual,
          agency: agencyAnnual,
          enterprise: enterpriseAnnual,
        },
      },
      ai: {
        standard: aiStandard,
        privacy: aiPrivacy,
      },
      privateLlm: {
        starter: privateLlmStarter,
        pro: privateLlmPro,
        enterprise: privateLlmEnterprise,
      },
      tokens: {
        starter: tokensStarter,
        standard: tokensStandard,
        professional: tokensProfessional,
        enterprise: tokensEnterprise,
      },
    };
  },
});

/**
 * GET PLATFORM PRICES ONLY
 *
 * Fetches only platform tier prices for the store display.
 * More efficient than fetching all prices.
 */
export const getPlatformPrices = action({
  args: {},
  handler: async () => {
    const stripe = getStripe();

    const [
      // Monthly
      freeMonthly,
      communityMonthly,
      starterMonthly,
      professionalMonthly,
      agencyMonthly,
      enterpriseMonthly,
      // Annual
      communityAnnual,
      starterAnnual,
      professionalAnnual,
      agencyAnnual,
      enterpriseAnnual,
    ] = await Promise.all([
      fetchPrice(stripe, PRICE_IDS.platformMonthly.free),
      fetchPrice(stripe, PRICE_IDS.platformMonthly.community),
      fetchPrice(stripe, PRICE_IDS.platformMonthly.starter),
      fetchPrice(stripe, PRICE_IDS.platformMonthly.professional),
      fetchPrice(stripe, PRICE_IDS.platformMonthly.agency),
      fetchPrice(stripe, PRICE_IDS.platformMonthly.enterprise),
      fetchPrice(stripe, PRICE_IDS.platformAnnual.community),
      fetchPrice(stripe, PRICE_IDS.platformAnnual.starter),
      fetchPrice(stripe, PRICE_IDS.platformAnnual.professional),
      fetchPrice(stripe, PRICE_IDS.platformAnnual.agency),
      fetchPrice(stripe, PRICE_IDS.platformAnnual.enterprise),
    ]);

    return {
      monthly: {
        free: freeMonthly,
        community: communityMonthly,
        starter: starterMonthly,
        professional: professionalMonthly,
        agency: agencyMonthly,
        enterprise: enterpriseMonthly,
      },
      annual: {
        community: communityAnnual,
        starter: starterAnnual,
        professional: professionalAnnual,
        agency: agencyAnnual,
        enterprise: enterpriseAnnual,
      },
    };
  },
});

/**
 * GET AI AND ADDON PRICES
 *
 * Fetches AI subscriptions, token packs, and private LLM prices.
 */
export const getAIAndAddonPrices = action({
  args: {},
  handler: async () => {
    const stripe = getStripe();

    const [
      // AI
      aiStandard,
      aiPrivacy,
      // Private LLM
      privateLlmStarter,
      privateLlmPro,
      privateLlmEnterprise,
      // Token Packs
      tokensStarter,
      tokensStandard,
      tokensProfessional,
      tokensEnterprise,
    ] = await Promise.all([
      fetchPrice(stripe, PRICE_IDS.ai.standard),
      fetchPrice(stripe, PRICE_IDS.ai.privacy),
      fetchPrice(stripe, PRICE_IDS.privateLlm.starter),
      fetchPrice(stripe, PRICE_IDS.privateLlm.pro),
      fetchPrice(stripe, PRICE_IDS.privateLlm.enterprise),
      fetchPrice(stripe, PRICE_IDS.tokens.starter),
      fetchPrice(stripe, PRICE_IDS.tokens.standard),
      fetchPrice(stripe, PRICE_IDS.tokens.professional),
      fetchPrice(stripe, PRICE_IDS.tokens.enterprise),
    ]);

    return {
      ai: {
        standard: aiStandard,
        privacy: aiPrivacy,
      },
      privateLlm: {
        starter: privateLlmStarter,
        pro: privateLlmPro,
        enterprise: privateLlmEnterprise,
      },
      tokens: {
        starter: tokensStarter,
        standard: tokensStandard,
        professional: tokensProfessional,
        enterprise: tokensEnterprise,
      },
    };
  },
});
