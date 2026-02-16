/**
 * SHARED CREDIT PRICING
 *
 * Credit tier constants and calculation function.
 * Used by frontend store components to display pricing.
 * Must stay in sync with convex/stripe/creditCheckout.ts
 */

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
