import { afterEach, describe, expect, it, vi } from "vitest";
import { OpenRouterClient } from "../../../convex/ai/openrouter";

describe("OpenRouter pricing fallback", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("warns and uses fallback rates when no resolved model pricing is provided", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const client = new OpenRouterClient("test-api-key");

    const cost = client.calculateCost(
      {
        prompt_tokens: 1000,
        completion_tokens: 1000,
      },
      "unknown/model"
    );

    expect(cost).toBeCloseTo(0.018, 8);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0]?.[0]).toContain(
      "Missing resolved pricing for model unknown/model"
    );
  });

  it("uses provided pricing without emitting fallback warning", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const client = new OpenRouterClient("test-api-key");

    const cost = client.calculateCost(
      {
        prompt_tokens: 1000,
        completion_tokens: 1000,
      },
      "openai/gpt-4o",
      {
        promptPerMToken: 2,
        completionPerMToken: 8,
      }
    );

    expect(cost).toBeCloseTo(0.01, 8);
    expect(warnSpy).not.toHaveBeenCalled();
  });
});
