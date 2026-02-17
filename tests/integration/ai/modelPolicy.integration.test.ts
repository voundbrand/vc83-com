import { describe, expect, it } from "vitest";
import {
  SAFE_FALLBACK_MODEL_ID,
  determineModelSelectionSource,
  resolveOrgDefaultModel,
  resolveRequestedModel,
  selectFirstPlatformEnabledModel,
} from "../../../convex/ai/modelPolicy";

describe("model policy integration scenarios", () => {
  it("prefers explicit model request when enabled for the org", () => {
    const settings = {
      llm: {
        enabledModels: [
          { modelId: "anthropic/claude-3-5-sonnet", isDefault: true },
          { modelId: "openai/gpt-4o-mini", isDefault: false },
        ],
      },
    };

    expect(resolveRequestedModel(settings, "openai/gpt-4o-mini")).toBe(
      "openai/gpt-4o-mini"
    );
  });

  it("falls back to org default when requested model is not enabled", () => {
    const settings = {
      llm: {
        enabledModels: [
          { modelId: "anthropic/claude-3-5-sonnet", isDefault: true },
          { modelId: "openai/gpt-4o-mini", isDefault: false },
        ],
        defaultModelId: "anthropic/claude-3-5-sonnet",
      },
    };

    expect(resolveRequestedModel(settings, "google/gemini-2.0-flash")).toBe(
      "anthropic/claude-3-5-sonnet"
    );
  });

  it("supports legacy settings without enabledModels", () => {
    const settings = {
      llm: {
        model: "anthropic/claude-3-5-sonnet",
      },
    };

    expect(resolveRequestedModel(settings)).toBe("anthropic/claude-3-5-sonnet");
  });

  it("falls back to a platform-enabled default when requested model is disabled", () => {
    const settings = {
      llm: {
        enabledModels: [
          { modelId: "anthropic/claude-3-5-sonnet", isDefault: true },
          { modelId: "openai/gpt-4o-mini", isDefault: false },
        ],
        defaultModelId: "anthropic/claude-3-5-sonnet",
      },
    };

    const selected = selectFirstPlatformEnabledModel(
      [
        resolveRequestedModel(settings, "openai/gpt-4o-mini"),
        resolveOrgDefaultModel(settings),
        SAFE_FALLBACK_MODEL_ID,
      ],
      ["anthropic/claude-3-5-sonnet"]
    );

    expect(selected).toBe("anthropic/claude-3-5-sonnet");
    expect(
      determineModelSelectionSource({
        selectedModel: selected!,
        preferredModel: "openai/gpt-4o-mini",
        orgDefaultModel: "anthropic/claude-3-5-sonnet",
        platformFirstEnabledModelId: "anthropic/claude-3-5-sonnet",
      })
    ).toBe("org_default");
  });
});
