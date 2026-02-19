/**
 * STRIPE PRICES API
 *
 * Fetches prices directly from Stripe using price IDs from environment variables.
 * This ensures the frontend always displays accurate, up-to-date prices.
 */

import { action } from "../_generated/server";
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
 *
 * Active runtime tiers: Pro and agency (customer-facing: Scale)
 * Credits use dynamic pricing (no fixed Price IDs)
 */
const PRICE_IDS = {
  // Platform Plans (Monthly)
  platformMonthly: {
    pro: process.env.STRIPE_PRO_MO_PRICE_ID,
    agency: process.env.STRIPE_AGENCY_MO_PRICE_ID,
  },
  // Platform Plans (Annual)
  platformAnnual: {
    pro: process.env.STRIPE_PRO_YR_PRICE_ID,
    agency: process.env.STRIPE_AGENCY_YR_PRICE_ID,
  },
  // Sub-Organization
  subOrg: {
    monthly: process.env.STRIPE_SUB_ORG_MO_PRICE_ID,
  },
};

/**
 * Deterministic fallback values used when Stripe prices are unavailable.
 * These mirror store-facing baseline plan rates in cents.
 */
export const STORE_PLATFORM_PRICE_FALLBACKS = {
  monthly: {
    pro: 2900,
    agency: 29900,
  },
  annual: {
    pro: 29000,
    agency: 299000,
  },
  subOrgMonthly: 7900,
  currency: "eur",
} as const;

export type StorePublicStripeTier = "pro" | "scale";
export type StoreRuntimeStripeTier = "pro" | "agency";

export const STORE_PUBLIC_TO_RUNTIME_STRIPE_TIER: Record<
  StorePublicStripeTier,
  StoreRuntimeStripeTier
> = {
  pro: "pro",
  scale: "agency",
};

export const STORE_RUNTIME_TO_PUBLIC_STRIPE_TIER: Record<
  StoreRuntimeStripeTier,
  StorePublicStripeTier
> = {
  pro: "pro",
  agency: "scale",
};

export function mapStorePublicTierToRuntimeStripeTier(
  tier: StorePublicStripeTier
): StoreRuntimeStripeTier {
  return STORE_PUBLIC_TO_RUNTIME_STRIPE_TIER[tier];
}

export function mapRuntimeStripeTierToStorePublicTier(
  tier: StoreRuntimeStripeTier
): StorePublicStripeTier {
  return STORE_RUNTIME_TO_PUBLIC_STRIPE_TIER[tier];
}

function withPublicTierAliases<T>(runtimeTiers: { pro: T; agency: T }) {
  return {
    ...runtimeTiers,
    scale: runtimeTiers.agency,
  };
}

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
 * Active runtime tiers: Pro and agency (customer-facing: Scale).
 */
export const getAllPrices = action({
  args: {},
  handler: async () => {
    const stripe = getStripe();

    const [
      proMonthly,
      agencyMonthly,
      proAnnual,
      agencyAnnual,
      subOrgMonthly,
    ] = await Promise.all([
      fetchPrice(stripe, PRICE_IDS.platformMonthly.pro),
      fetchPrice(stripe, PRICE_IDS.platformMonthly.agency),
      fetchPrice(stripe, PRICE_IDS.platformAnnual.pro),
      fetchPrice(stripe, PRICE_IDS.platformAnnual.agency),
      fetchPrice(stripe, PRICE_IDS.subOrg.monthly),
    ]);

    return {
      platform: {
        monthly: {
          pro: proMonthly,
          agency: agencyMonthly,
        },
        annual: {
          pro: proAnnual,
          agency: agencyAnnual,
        },
        public: {
          monthly: withPublicTierAliases({
            pro: proMonthly,
            agency: agencyMonthly,
          }),
          annual: withPublicTierAliases({
            pro: proAnnual,
            agency: agencyAnnual,
          }),
        },
      },
      subOrg: {
        monthly: subOrgMonthly,
      },
    };
  },
});

/**
 * GET PLATFORM PRICES ONLY
 *
 * Fetches only platform tier prices for the store display.
 */
export const getPlatformPrices = action({
  args: {},
  handler: async () => {
    const stripe = getStripe();

    const [
      proMonthly,
      agencyMonthly,
      proAnnual,
      agencyAnnual,
    ] = await Promise.all([
      fetchPrice(stripe, PRICE_IDS.platformMonthly.pro),
      fetchPrice(stripe, PRICE_IDS.platformMonthly.agency),
      fetchPrice(stripe, PRICE_IDS.platformAnnual.pro),
      fetchPrice(stripe, PRICE_IDS.platformAnnual.agency),
    ]);

    return {
      monthly: {
        pro: proMonthly,
        agency: agencyMonthly,
      },
      annual: {
        pro: proAnnual,
        agency: agencyAnnual,
      },
      public: {
        monthly: withPublicTierAliases({
          pro: proMonthly,
          agency: agencyMonthly,
        }),
        annual: withPublicTierAliases({
          pro: proAnnual,
          agency: agencyAnnual,
        }),
      },
    };
  },
});
