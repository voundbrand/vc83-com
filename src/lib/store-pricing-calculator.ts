import { calculateCreditsFromAmount } from "@/lib/credit-pricing";
import {
  DEFAULT_STORE_PRICING_CONTRACT,
  getStoreTierByPublicTier,
  type StoreBillingCycle,
  type StorePricingContractSnapshot,
  type StorePricingTierSnapshot,
  type StorePublicTier,
  type StoreTaxMode,
} from "@/lib/store-pricing-contract";

export interface StoreCalculatorInput {
  plan: StorePublicTier;
  billingCycle: StoreBillingCycle;
  creditsPurchaseEur: number;
  scaleSubOrgCount: number;
  seatUserCount: number;
  taxMode: StoreTaxMode;
}

export interface StoreCalculatorLineItem {
  key: "plan_base" | "scale_sub_org" | "seat_capacity" | "credits";
  label: string;
  monthlyInCents: number;
  annualInCents: number;
  oneTimeInCents: number;
  source: string;
  note?: string;
}

export interface StoreCalculatorEstimate {
  input: StoreCalculatorInput;
  activeTier: StorePricingTierSnapshot;
  credits: ReturnType<typeof calculateCreditsFromAmount>;
  lineItems: StoreCalculatorLineItem[];
  recurringMonthlyTotalInCents: number;
  recurringAnnualTotalInCents: number;
  annualGrandTotalInCents: number;
  vatIncludedTotalInCents: number;
  vatEstimatedComponentInCents: number;
  sourceAttributions: string[];
  fallbackSignals: {
    planPricingFallbackUsed: boolean;
    scaleAddOnFallbackUsed: boolean;
  };
}

const STORE_PRICE_FALLBACKS: Record<StorePublicTier, { monthlyInCents: number; annualInCents: number }> = {
  free: { monthlyInCents: 0, annualInCents: 0 },
  pro: { monthlyInCents: 2900, annualInCents: 29000 },
  scale: { monthlyInCents: 29900, annualInCents: 299000 },
  enterprise: { monthlyInCents: 150000, annualInCents: 1500000 },
};

const SCALE_SUB_ORG_FALLBACK_PRICE_IN_CENTS = 7900;
const VAT_ESTIMATE_RATE = 0.19;

function clampWhole(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }
  const whole = Math.floor(value);
  if (whole < min) {
    return min;
  }
  if (whole > max) {
    return max;
  }
  return whole;
}

function resolvePlanPricing(
  tier: StorePricingTierSnapshot,
  billingCycle: StoreBillingCycle
): {
  monthlyEquivalentInCents: number;
  annualTotalInCents: number;
  fallbackUsed: boolean;
} {
  const fallback = STORE_PRICE_FALLBACKS[tier.publicTier];
  const monthlyBase = tier.pricing.monthlyPriceInCents;
  const annualBase = tier.pricing.annualPriceInCents;

  if (billingCycle === "monthly") {
    const monthly = monthlyBase ?? fallback.monthlyInCents;
    return {
      monthlyEquivalentInCents: monthly,
      annualTotalInCents: monthly * 12,
      fallbackUsed: monthlyBase === null,
    };
  }

  const annual =
    annualBase ??
    (monthlyBase !== null ? monthlyBase * tier.pricing.annualBillingMonths : fallback.annualInCents);

  return {
    monthlyEquivalentInCents: Math.round(annual / 12),
    annualTotalInCents: annual,
    fallbackUsed: annualBase === null && monthlyBase === null,
  };
}

function resolveScaleSubOrgPrice(contract: StorePricingContractSnapshot): {
  priceInCents: number;
  fallbackUsed: boolean;
  source: string;
} {
  const configuredAddOn = contract.addOns.find((addOn) => addOn.key === "scale_sub_org");
  const configuredPrice = configuredAddOn?.monthlyPriceInCents;

  if (typeof configuredPrice === "number") {
    return {
      priceInCents: configuredPrice,
      fallbackUsed: false,
      source: configuredAddOn?.source ?? "convex/stripe/stripePrices.ts",
    };
  }

  return {
    priceInCents: SCALE_SUB_ORG_FALLBACK_PRICE_IN_CENTS,
    fallbackUsed: true,
    source: "convex/stripe/stripePrices.ts",
  };
}

export function calculateStorePricingEstimate(
  input: StoreCalculatorInput,
  contract: StorePricingContractSnapshot = DEFAULT_STORE_PRICING_CONTRACT
): StoreCalculatorEstimate {
  const normalizedInput: StoreCalculatorInput = {
    plan: input.plan,
    billingCycle: input.billingCycle,
    creditsPurchaseEur: clampWhole(input.creditsPurchaseEur, 0, 10000),
    scaleSubOrgCount: clampWhole(input.scaleSubOrgCount, 0, 200),
    seatUserCount: clampWhole(input.seatUserCount, 1, 5000),
    taxMode: input.taxMode,
  };

  const activeTier =
    getStoreTierByPublicTier(contract, normalizedInput.plan) ||
    getStoreTierByPublicTier(DEFAULT_STORE_PRICING_CONTRACT, normalizedInput.plan) ||
    DEFAULT_STORE_PRICING_CONTRACT.tiers[0];

  const planPricing = resolvePlanPricing(activeTier, normalizedInput.billingCycle);
  const scaleSubOrgPricing = resolveScaleSubOrgPrice(contract);
  const scaleSubOrgMonthlyInCents =
    normalizedInput.plan === "scale"
      ? scaleSubOrgPricing.priceInCents * normalizedInput.scaleSubOrgCount
      : 0;
  const scaleSubOrgAnnualInCents = scaleSubOrgMonthlyInCents * 12;

  const credits = calculateCreditsFromAmount(normalizedInput.creditsPurchaseEur);
  const creditsOneTimeInCents = normalizedInput.creditsPurchaseEur * 100;

  const includedSeats = activeTier.limits.users;
  const additionalSeatCount = includedSeats === -1 ? 0 : Math.max(0, normalizedInput.seatUserCount - includedSeats);

  const lineItems: StoreCalculatorLineItem[] = [
    {
      key: "plan_base",
      label: `${activeTier.displayTier} plan base`,
      monthlyInCents: planPricing.monthlyEquivalentInCents,
      annualInCents: planPricing.annualTotalInCents,
      oneTimeInCents: 0,
      source: activeTier.pricing.source,
      note:
        normalizedInput.billingCycle === "annual"
          ? `${activeTier.pricing.annualBillingMonths} billed months per 12 months access.`
          : "Monthly billing cadence.",
    },
    {
      key: "scale_sub_org",
      label: "Scale sub-organization add-on",
      monthlyInCents: scaleSubOrgMonthlyInCents,
      annualInCents: scaleSubOrgAnnualInCents,
      oneTimeInCents: 0,
      source: scaleSubOrgPricing.source,
      note:
        normalizedInput.plan === "scale"
          ? `${normalizedInput.scaleSubOrgCount} additional sub-org(s).`
          : "Only applies to Scale.",
    },
    {
      key: "seat_capacity",
      label: "Seat/user capacity",
      monthlyInCents: 0,
      annualInCents: 0,
      oneTimeInCents: 0,
      source: activeTier.source,
      note:
        includedSeats === -1
          ? "Unlimited seats included."
          : `${normalizedInput.seatUserCount} seat(s) selected, ${includedSeats} included, ${additionalSeatCount} over included capacity (no per-seat charge in v1).`,
    },
    {
      key: "credits",
      label: "One-time credits",
      monthlyInCents: 0,
      annualInCents: 0,
      oneTimeInCents: creditsOneTimeInCents,
      source: "src/lib/credit-pricing.ts",
      note: `${credits.credits.toLocaleString("en-US")} credits total (${credits.bonus.toLocaleString("en-US")} bonus).`,
    },
  ];

  const recurringMonthlyTotalInCents =
    lineItems[0].monthlyInCents +
    lineItems[1].monthlyInCents +
    lineItems[2].monthlyInCents;

  const recurringAnnualTotalInCents =
    lineItems[0].annualInCents +
    lineItems[1].annualInCents +
    lineItems[2].annualInCents;

  const annualGrandTotalInCents = recurringAnnualTotalInCents + creditsOneTimeInCents;
  const vatIncludedTotalInCents = annualGrandTotalInCents;
  const vatEstimatedComponentInCents = Math.round(
    vatIncludedTotalInCents - vatIncludedTotalInCents / (1 + VAT_ESTIMATE_RATE)
  );

  const sourceAttributions = Array.from(
    new Set([
      ...lineItems.map((lineItem) => lineItem.source),
      ...contract.sourceHierarchy.map((entry) => entry.source),
    ])
  );

  return {
    input: normalizedInput,
    activeTier,
    credits,
    lineItems,
    recurringMonthlyTotalInCents,
    recurringAnnualTotalInCents,
    annualGrandTotalInCents,
    vatIncludedTotalInCents,
    vatEstimatedComponentInCents,
    sourceAttributions,
    fallbackSignals: {
      planPricingFallbackUsed: planPricing.fallbackUsed,
      scaleAddOnFallbackUsed: scaleSubOrgPricing.fallbackUsed,
    },
  };
}
