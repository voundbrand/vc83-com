import { describe, expect, it } from "vitest";
import {
  CREDIT_TIERS as FRONTEND_CREDIT_TIERS,
  calculateCreditsFromAmount as calculateFrontendCredits,
} from "@/lib/credit-pricing";
import {
  CREDIT_TIERS as BACKEND_CREDIT_TIERS,
  calculateCreditsFromAmount as calculateBackendCredits,
} from "../../../convex/stripe/creditCheckout";

describe("credit pricing parity", () => {
  it("keeps frontend and backend tier tables in lockstep", () => {
    expect(FRONTEND_CREDIT_TIERS).toEqual(BACKEND_CREDIT_TIERS);
  });

  it("matches credit outputs at tier boundaries", () => {
    const sampleAmounts = [1, 29, 30, 99, 100, 249, 250, 499, 500, 10000];

    sampleAmounts.forEach((amount) => {
      expect(calculateFrontendCredits(amount)).toEqual(calculateBackendCredits(amount));
    });
  });

  it("returns zero credits below minimum purchase", () => {
    expect(calculateFrontendCredits(0)).toEqual({
      credits: 0,
      baseCredits: 0,
      bonus: 0,
      creditsPerEur: 0,
    });
  });
});
