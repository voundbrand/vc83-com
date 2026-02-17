import { describe, expect, it } from "vitest";
import { buildModelFailoverCandidates } from "../../../convex/ai/modelFailoverPolicy";

describe("model failover policy", () => {
  it("builds a deterministic fallback chain from dynamic inputs", () => {
    const candidates = buildModelFailoverCandidates({
      primaryModelId: "anthropic/claude-sonnet-4.5",
      orgEnabledModelIds: [
        "anthropic/claude-sonnet-4.5",
        "openai/gpt-4o",
        "openai/gpt-4o-mini",
      ],
      orgDefaultModelId: "openai/gpt-4o",
      platformEnabledModelIds: [
        "anthropic/claude-sonnet-4.5",
        "openai/gpt-4o",
        "openai/gpt-4o-mini",
      ],
      safeFallbackModelId: "openai/gpt-4o-mini",
    });

    expect(candidates).toEqual([
      "anthropic/claude-sonnet-4.5",
      "openai/gpt-4o",
      "openai/gpt-4o-mini",
    ]);
  });

  it("prioritizes session-pinned model when eligible", () => {
    const candidates = buildModelFailoverCandidates({
      primaryModelId: "openai/gpt-4o",
      sessionPinnedModelId: "anthropic/claude-sonnet-4.5",
      orgEnabledModelIds: ["openai/gpt-4o", "anthropic/claude-sonnet-4.5"],
      orgDefaultModelId: "openai/gpt-4o",
      platformEnabledModelIds: [
        "openai/gpt-4o",
        "anthropic/claude-sonnet-4.5",
      ],
    });

    expect(candidates[0]).toBe("openai/gpt-4o");
    expect(candidates[1]).toBe("anthropic/claude-sonnet-4.5");
  });

  it("filters out models that are not platform-enabled", () => {
    const candidates = buildModelFailoverCandidates({
      primaryModelId: "openai/gpt-4o",
      orgEnabledModelIds: ["openai/gpt-4o", "openai/gpt-4o-mini"],
      orgDefaultModelId: "openai/gpt-4o-mini",
      platformEnabledModelIds: ["openai/gpt-4o"],
    });

    expect(candidates).toEqual(["openai/gpt-4o"]);
  });
});
