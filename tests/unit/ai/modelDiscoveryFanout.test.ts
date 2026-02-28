import { describe, expect, it } from "vitest";
import {
  mergeDiscoveredModelCandidates,
  normalizeDiscoveredModelId,
  type OpenRouterModel,
} from "../../../convex/ai/modelDiscovery";

function mockModel(id: string, name = id): OpenRouterModel {
  return {
    id,
    name,
    created: 1,
    context_length: 0,
    pricing: {
      prompt: "0",
      completion: "0",
    },
    top_provider: {
      context_length: 0,
      is_moderated: false,
    },
  };
}

describe("model discovery fanout helpers", () => {
  it("normalizes discovered model ids per provider deterministically", () => {
    expect(
      normalizeDiscoveredModelId({
        providerId: "openrouter",
        modelId: "openai/gpt-4o-mini",
      })
    ).toBe("openai/gpt-4o-mini");

    expect(
      normalizeDiscoveredModelId({
        providerId: "openai",
        modelId: "openai/gpt-4o-mini",
      })
    ).toBe("openai/gpt-4o-mini");

    expect(
      normalizeDiscoveredModelId({
        providerId: "openai",
        modelId: "gpt-4o-mini",
      })
    ).toBe("openai/gpt-4o-mini");
  });

  it("dedupes fanout candidates by provider order fallback", () => {
    const merged = mergeDiscoveredModelCandidates([
      {
        providerId: "openai",
        providerOrder: 2,
        model: mockModel("openai/gpt-4o-mini", "OpenAI fallback"),
      },
      {
        providerId: "openrouter",
        providerOrder: 0,
        model: mockModel("openai/gpt-4o-mini", "OpenRouter canonical"),
      },
      {
        providerId: "anthropic",
        providerOrder: 1,
        model: mockModel("anthropic/claude-sonnet-4.5"),
      },
    ]);

    expect(merged.map((model) => model.id)).toEqual([
      "anthropic/claude-sonnet-4.5",
      "openai/gpt-4o-mini",
    ]);
    expect(
      merged.find((model) => model.id === "openai/gpt-4o-mini")?.name
    ).toBe("OpenRouter canonical");
  });
});
