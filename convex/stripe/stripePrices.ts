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

export const STORE_COMMERCIAL_CATALOG_VERSION = "cpmu_v1" as const;

export const STORE_SUBSCRIPTION_COEXISTENCE_OFFERS = {
  pro: "plan_pro_subscription",
  scale: "plan_scale_subscription",
  credits: "credits_pack",
} as const;

export type CommercialOfferCode =
  | "layer1_foundation"
  | "layer2_dream_team"
  | "layer3_sovereign"
  | "layer3_sovereign_pro"
  | "layer3_sovereign_max"
  | "layer4_nvidia_private"
  | "consult_done_with_you"
  | "consult_full_build_scoping"
  | "plan_pro_subscription"
  | "plan_scale_subscription"
  | "credits_pack";

export type CommercialOfferMotion = "checkout_now" | "inquiry_first" | "invoice_only";

export const COMMERCIAL_OFFER_CATALOG: ReadonlyArray<{
  offerCode: CommercialOfferCode;
  label: string;
  motion: CommercialOfferMotion;
  setupFeeCents: number | null;
  monthlyPlatformFeeCents: number | null;
  stripePriceId: string | null;
}> = [
  {
    offerCode: "layer1_foundation",
    label: "Layer 1 Foundation",
    motion: "checkout_now",
    setupFeeCents: 700_000,
    monthlyPlatformFeeCents: 49_900,
    stripePriceId: process.env.STRIPE_LAYER1_FOUNDATION_SETUP_PRICE_ID || null,
  },
  {
    offerCode: "layer2_dream_team",
    label: "Layer 2 Dream Team",
    motion: "inquiry_first",
    setupFeeCents: 3_500_000,
    monthlyPlatformFeeCents: 99_900,
    stripePriceId: null,
  },
  {
    offerCode: "layer3_sovereign",
    label: "Layer 3 Sovereign",
    motion: "inquiry_first",
    setupFeeCents: 13_500_000,
    monthlyPlatformFeeCents: 199_900,
    stripePriceId: null,
  },
  {
    offerCode: "layer3_sovereign_pro",
    label: "Layer 3 Sovereign Pro",
    motion: "inquiry_first",
    setupFeeCents: 16_500_000,
    monthlyPlatformFeeCents: 249_900,
    stripePriceId: null,
  },
  {
    offerCode: "layer3_sovereign_max",
    label: "Layer 3 Sovereign Max",
    motion: "inquiry_first",
    setupFeeCents: 19_500_000,
    monthlyPlatformFeeCents: 299_900,
    stripePriceId: null,
  },
  {
    offerCode: "layer4_nvidia_private",
    label: "Layer 4 NVIDIA Private",
    motion: "invoice_only",
    setupFeeCents: 25_000_000,
    monthlyPlatformFeeCents: null,
    stripePriceId: null,
  },
  {
    offerCode: "consult_done_with_you",
    label: "Consulting Sprint (Strategy & Scope)",
    motion: "checkout_now",
    setupFeeCents: 350_000,
    monthlyPlatformFeeCents: null,
    stripePriceId: process.env.STRIPE_CONSULT_DONE_WITH_YOU_PRICE_ID || null,
  },
  {
    offerCode: "consult_full_build_scoping",
    label: "Implementation Start Scoping",
    motion: "inquiry_first",
    setupFeeCents: 700_000,
    monthlyPlatformFeeCents: null,
    stripePriceId: null,
  },
  {
    offerCode: "plan_pro_subscription",
    label: "Pro Subscription",
    motion: "checkout_now",
    setupFeeCents: null,
    monthlyPlatformFeeCents: 2_900,
    stripePriceId: null,
  },
  {
    offerCode: "plan_scale_subscription",
    label: "Scale Subscription",
    motion: "checkout_now",
    setupFeeCents: null,
    monthlyPlatformFeeCents: 29_900,
    stripePriceId: null,
  },
  {
    offerCode: "credits_pack",
    label: "Credits Pack",
    motion: "checkout_now",
    setupFeeCents: null,
    monthlyPlatformFeeCents: null,
    stripePriceId: null,
  },
] as const;

export const STRIPE_COMMERCIAL_METADATA_CONTINUITY_KEYS = [
  "offer_code",
  "intent_code",
  "surface",
  "routing_hint",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "referrer",
  "landingPath",
] as const;

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
