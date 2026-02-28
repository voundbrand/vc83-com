import { describe, expect, it } from "vitest";
import {
  buildCreditConsumptionPlan,
  getGiftedCreditsBalance,
  normalizeCreditIdempotencyKey,
} from "../../../convex/credits/index";

describe("credit ledger primitives", () => {
  it("consumes gifted-equivalent balance before monthly/purchased", () => {
    const plan = buildCreditConsumptionPlan({
      amount: 9,
      giftedCredits: 3,
      legacyDailyCredits: 2,
      monthlyCredits: 4,
      purchasedCredits: 7,
    });

    expect(plan).toEqual({
      giftedUsed: 5,
      giftedFromLegacyDailyUsed: 2,
      giftedFromGiftedPoolUsed: 3,
      monthlyUsed: 4,
      purchasedUsed: 0,
    });
  });

  it("falls back to purchased only after gifted and monthly pools", () => {
    const plan = buildCreditConsumptionPlan({
      amount: 12,
      giftedCredits: 4,
      legacyDailyCredits: 1,
      monthlyCredits: 2,
      purchasedCredits: 20,
    });

    expect(plan.giftedUsed).toBe(5);
    expect(plan.monthlyUsed).toBe(2);
    expect(plan.purchasedUsed).toBe(5);
  });

  it("normalizes idempotency keys deterministically", () => {
    expect(normalizeCreditIdempotencyKey("  key-123  ")).toBe("key-123");
    expect(normalizeCreditIdempotencyKey("   ")).toBeNull();
    expect(normalizeCreditIdempotencyKey(undefined)).toBeNull();
  });

  it("computes canonical gifted balance with legacy compatibility", () => {
    expect(
      getGiftedCreditsBalance({
        dailyCredits: 2,
        giftedCredits: 5,
      })
    ).toBe(7);

    expect(
      getGiftedCreditsBalance({
        dailyCredits: -2,
        giftedCredits: 5,
      })
    ).toBe(5);
  });
});
