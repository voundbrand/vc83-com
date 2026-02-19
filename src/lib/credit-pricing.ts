/**
 * SHARED CREDIT PRICING
 *
 * Credit tier constants and calculation function.
 * Used by frontend store components to display pricing.
 * Must stay in sync with convex/stripe/creditCheckout.ts
 *
 * Store pricing contract freeze (SPT-003):
 * - External tier naming: scale
 * - Runtime tier key: agency
 * - Store-facing pricing/totals are VAT-inclusive
 */

export type StorePublicTier = "free" | "pro" | "scale" | "enterprise";
export type StoreRuntimeTier = "free" | "pro" | "agency" | "enterprise";

export const STORE_PUBLIC_TO_RUNTIME_TIER: Record<StorePublicTier, StoreRuntimeTier> = {
  free: "free",
  pro: "pro",
  scale: "agency",
  enterprise: "enterprise",
};

export const STORE_RUNTIME_TO_PUBLIC_TIER: Record<StoreRuntimeTier, StorePublicTier> = {
  free: "free",
  pro: "pro",
  agency: "scale",
  enterprise: "enterprise",
};

export const STORE_PRICING_SOURCE_HIERARCHY = [
  { order: 1, key: "runtime_entitlements", source: "convex/licensing/tierConfigs.ts" },
  { order: 2, key: "checkout_billing_truth", source: "convex/stripe/platformCheckout.ts" },
  { order: 3, key: "stripe_price_truth", source: "convex/stripe/stripePrices.ts" },
  { order: 4, key: "credits_math_truth", source: "src/lib/credit-pricing.ts" },
  { order: 5, key: "trial_policy_truth", source: "convex/stripe/trialCheckout.ts" },
  { order: 6, key: "tax_policy_truth", source: "docs/reference_docs/billing/tax-system.md" },
] as const;

export const STORE_TAX_DISPLAY_MODE = "vat_included" as const;

export const STORE_SCALE_TRIAL_POLICY = {
  publicTier: "scale",
  runtimeTier: "agency",
  trialDays: 14,
  source: "convex/stripe/trialCheckout.ts",
} as const;

export function mapStorePublicTierToRuntime(tier: StorePublicTier): StoreRuntimeTier {
  return STORE_PUBLIC_TO_RUNTIME_TIER[tier];
}

export function mapStoreRuntimeTierToPublic(tier: StoreRuntimeTier): StorePublicTier {
  return STORE_RUNTIME_TO_PUBLIC_TIER[tier];
}

export const CREDIT_TIERS = [
  { minEur: 1,   maxEur: 29,   creditsPerEur: 10, bonus: 0 },
  { minEur: 30,  maxEur: 99,   creditsPerEur: 11, bonus: 0 },
  { minEur: 100, maxEur: 249,  creditsPerEur: 11, bonus: 100 },
  { minEur: 250, maxEur: 499,  creditsPerEur: 12, bonus: 500 },
  { minEur: 500, maxEur: 10000, creditsPerEur: 13, bonus: 1500 },
] as const;

export const PRESET_AMOUNTS = [30, 60, 100, 250, 500] as const;

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
