import { describe, expect, it } from "vitest";
import { calculateStorePricingEstimate } from "@/lib/store-pricing-calculator";
import { DEFAULT_STORE_PRICING_CONTRACT } from "@/lib/store-pricing-contract";

describe("store pricing calculator", () => {
  it("calculates annual Pro totals with VAT-inclusive output", () => {
    const estimate = calculateStorePricingEstimate(
      {
        plan: "pro",
        billingCycle: "annual",
        creditsPurchaseEur: 100,
        scaleSubOrgCount: 0,
        seatUserCount: 3,
        taxMode: "vat_included",
      },
      DEFAULT_STORE_PRICING_CONTRACT
    );

    expect(estimate.recurringAnnualTotalInCents).toBe(29000);
    expect(estimate.credits.credits).toBe(1200);
    expect(estimate.annualGrandTotalInCents).toBe(39000);
    expect(estimate.vatIncludedTotalInCents).toBe(39000);
    expect(estimate.lineItems.find((lineItem) => lineItem.key === "plan_base")?.source).toBe(
      "convex/stripe/stripePrices.ts"
    );
  });

  it("applies Scale sub-organization math on monthly billing", () => {
    const estimate = calculateStorePricingEstimate(
      {
        plan: "scale",
        billingCycle: "monthly",
        creditsPurchaseEur: 0,
        scaleSubOrgCount: 3,
        seatUserCount: 20,
        taxMode: "vat_included",
      },
      DEFAULT_STORE_PRICING_CONTRACT
    );

    expect(estimate.lineItems.find((lineItem) => lineItem.key === "scale_sub_org")?.monthlyInCents).toBe(23700);
    expect(estimate.recurringMonthlyTotalInCents).toBe(53600);
    expect(estimate.recurringAnnualTotalInCents).toBe(643200);
    expect(estimate.lineItems.find((lineItem) => lineItem.key === "seat_capacity")?.note).toContain(
      "5 over included capacity"
    );
  });

  it("handles very large input values deterministically via clamping", () => {
    const estimate = calculateStorePricingEstimate(
      {
        plan: "scale",
        billingCycle: "annual",
        creditsPurchaseEur: 999999,
        scaleSubOrgCount: 999,
        seatUserCount: 99999,
        taxMode: "vat_included",
      },
      DEFAULT_STORE_PRICING_CONTRACT
    );

    expect(estimate.input.creditsPurchaseEur).toBe(10000);
    expect(estimate.input.scaleSubOrgCount).toBe(200);
    expect(estimate.input.seatUserCount).toBe(5000);
    expect(estimate.credits.credits).toBeGreaterThan(0);
  });

  it("falls back to deterministic plan and add-on prices when contract values are missing", () => {
    const contractWithMissingPricing = {
      ...DEFAULT_STORE_PRICING_CONTRACT,
      tiers: DEFAULT_STORE_PRICING_CONTRACT.tiers.map((tier) =>
        tier.publicTier === "scale"
          ? {
              ...tier,
              pricing: {
                ...tier.pricing,
                monthlyPriceInCents: null,
                annualPriceInCents: null,
              },
            }
          : tier
      ),
      addOns: DEFAULT_STORE_PRICING_CONTRACT.addOns.map((addOn) =>
        addOn.key === "scale_sub_org"
          ? {
              ...addOn,
              monthlyPriceInCents: null,
            }
          : addOn
      ),
    };

    const estimate = calculateStorePricingEstimate(
      {
        plan: "scale",
        billingCycle: "annual",
        creditsPurchaseEur: 0,
        scaleSubOrgCount: 1,
        seatUserCount: 15,
        taxMode: "vat_reverse_charge_review",
      },
      contractWithMissingPricing
    );

    expect(estimate.fallbackSignals.planPricingFallbackUsed).toBe(true);
    expect(estimate.fallbackSignals.scaleAddOnFallbackUsed).toBe(true);
    expect(estimate.recurringAnnualTotalInCents).toBe(393800);
    expect(estimate.sourceAttributions).toContain("convex/stripe/stripePrices.ts");
  });
});
