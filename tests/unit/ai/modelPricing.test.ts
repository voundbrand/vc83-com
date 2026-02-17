import { describe, expect, it } from "vitest";
import {
  CREDITS_PER_USD,
  DEFAULT_MODEL_PRICING_RATES,
  calculateCostFromUsage,
  convertUsdToCredits,
  estimateCreditsFromPricing,
  normalizeOpenRouterPricingToPerMillion,
  resolveModelPricingFromRecord,
} from "../../../convex/ai/modelPricing";

describe("modelPricing", () => {
  it("resolves pricing from aiModels records when present", () => {
    const resolved = resolveModelPricingFromRecord("openai/gpt-4o", {
      promptPerMToken: 2.5,
      completionPerMToken: 10,
    });

    expect(resolved.source).toBe("aiModels");
    expect(resolved.usedFallback).toBe(false);
    expect(resolved.promptPerMToken).toBe(2.5);
    expect(resolved.completionPerMToken).toBe(10);
  });

  it("uses fallback pricing when aiModels pricing is missing", () => {
    const resolved = resolveModelPricingFromRecord("openai/gpt-4o", null);

    expect(resolved.source).toBe("fallback");
    expect(resolved.usedFallback).toBe(true);
    expect(resolved.promptPerMToken).toBe(
      DEFAULT_MODEL_PRICING_RATES.promptPerMToken
    );
    expect(resolved.completionPerMToken).toBe(
      DEFAULT_MODEL_PRICING_RATES.completionPerMToken
    );
    expect(resolved.warning).toContain("fallback rates applied");
  });

  it("normalizes OpenRouter per-token pricing strings to per-million rates", () => {
    const normalized = normalizeOpenRouterPricingToPerMillion({
      prompt: "0.000003",
      completion: "0.000015",
    });

    expect(normalized.promptPerMToken).toBe(3);
    expect(normalized.completionPerMToken).toBe(15);
    expect(normalized.usedFallback).toBe(false);
  });

  it("applies fallback rates when OpenRouter pricing payload is invalid", () => {
    const normalized = normalizeOpenRouterPricingToPerMillion({
      prompt: "not-a-number",
      completion: null,
    });

    expect(normalized.usedFallback).toBe(true);
    expect(normalized.promptPerMToken).toBe(
      DEFAULT_MODEL_PRICING_RATES.promptPerMToken
    );
    expect(normalized.completionPerMToken).toBe(
      DEFAULT_MODEL_PRICING_RATES.completionPerMToken
    );
  });

  it("calculates usage cost from resolved per-million pricing", () => {
    const cost = calculateCostFromUsage(
      {
        prompt_tokens: 1500,
        completion_tokens: 500,
      },
      {
        promptPerMToken: 2,
        completionPerMToken: 8,
      }
    );

    expect(cost).toBeCloseTo(0.007, 8);
  });

  it("converts USD spend to credits with minimum floor", () => {
    expect(convertUsdToCredits(0)).toBe(1);
    expect(convertUsdToCredits(0.015)).toBe(Math.ceil(0.015 * CREDITS_PER_USD));
  });

  it("estimates credits from pricing using default agent token estimate", () => {
    const credits = estimateCreditsFromPricing({
      promptPerMToken: 3,
      completionPerMToken: 15,
    });

    expect(credits).toBeGreaterThanOrEqual(1);
  });
});
