import { describe, expect, it } from "vitest";
import {
  SAFE_FALLBACK_MODEL_ID,
  determineModelSelectionSource,
  isModelAllowedForOrg,
  resolveOrgDefaultModel,
  resolveRequestedModel,
  selectFirstPlatformEnabledModel,
} from "../../../convex/ai/modelPolicy";

describe("modelPolicy", () => {
  it("resolves default model from llm.defaultModelId when present in enabled list", () => {
    const settings = {
      llm: {
        enabledModels: [
          { modelId: "anthropic/claude-3-5-sonnet", isDefault: false },
          { modelId: "openai/gpt-4o-mini", isDefault: true },
        ],
        defaultModelId: "openai/gpt-4o-mini",
      },
    };
    expect(resolveOrgDefaultModel(settings)).toBe("openai/gpt-4o-mini");
  });

  it("falls back to enabled model flagged isDefault when defaultModelId is missing", () => {
    const settings = {
      llm: {
        enabledModels: [
          { modelId: "anthropic/claude-3-5-sonnet", isDefault: false },
          { modelId: "openai/gpt-4o-mini", isDefault: true },
        ],
      },
    };
    expect(resolveOrgDefaultModel(settings)).toBe("openai/gpt-4o-mini");
  });

  it("falls back to first enabled model when no defaults are specified", () => {
    const settings = {
      llm: {
        enabledModels: [
          { modelId: "anthropic/claude-3-5-sonnet", isDefault: false },
          { modelId: "openai/gpt-4o-mini", isDefault: false },
        ],
      },
    };
    expect(resolveOrgDefaultModel(settings)).toBe("anthropic/claude-3-5-sonnet");
  });

  it("falls back to legacy llm.model when multi-model settings are absent", () => {
    const settings = {
      llm: {
        model: "openai/gpt-4o",
      },
    };
    expect(resolveOrgDefaultModel(settings)).toBe("openai/gpt-4o");
  });

  it("returns null when no org default model can be resolved", () => {
    expect(resolveOrgDefaultModel({})).toBeNull();
  });

  it("allows requested model when org has no model restriction", () => {
    const model = resolveRequestedModel({}, "openai/gpt-4o");
    expect(model).toBe("openai/gpt-4o");
  });

  it("uses requested model when it is in the enabled model list", () => {
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

  it("rejects non-enabled requested models and falls back to org default", () => {
    const settings = {
      llm: {
        enabledModels: [
          { modelId: "anthropic/claude-3-5-sonnet", isDefault: true },
          { modelId: "openai/gpt-4o-mini", isDefault: false },
        ],
      },
    };
    expect(resolveRequestedModel(settings, "google/gemini-2.0-flash")).toBe(
      "anthropic/claude-3-5-sonnet"
    );
  });

  it("uses system default when org has no configured model defaults", () => {
    expect(
      resolveRequestedModel(
        {},
        undefined,
        { systemDefaultModelId: "openai/gpt-4o-mini" }
      )
    ).toBe("openai/gpt-4o-mini");
  });

  it("uses caller-provided safe fallback when no defaults are available", () => {
    expect(
      resolveRequestedModel(
        {},
        undefined,
        { safeFallbackModelId: "google/gemini-2.0-flash-lite" }
      )
    ).toBe("google/gemini-2.0-flash-lite");
  });

  it("uses global safe fallback as final fallback", () => {
    expect(resolveRequestedModel({})).toBe(SAFE_FALLBACK_MODEL_ID);
  });

  it("matches allow-list behavior for multi-model settings", () => {
    const settings = {
      llm: {
        enabledModels: [{ modelId: "openai/gpt-4o", isDefault: true }],
      },
    };

    expect(isModelAllowedForOrg(settings, "openai/gpt-4o")).toBe(true);
    expect(isModelAllowedForOrg(settings, "anthropic/claude-3-5-sonnet")).toBe(
      false
    );
  });

  it("matches allow-list behavior for legacy single-model settings", () => {
    const settings = {
      llm: {
        model: "openai/gpt-4o",
      },
    };

    expect(isModelAllowedForOrg(settings, "openai/gpt-4o")).toBe(true);
    expect(isModelAllowedForOrg(settings, "openai/gpt-4o-mini")).toBe(false);
  });

  it("trims model IDs before resolving", () => {
    const settings = {
      llm: {
        enabledModels: [
          { modelId: " openai/gpt-4o ", isDefault: true },
        ],
      },
    };

    expect(resolveOrgDefaultModel(settings)).toBe("openai/gpt-4o");
    expect(resolveRequestedModel(settings, " openai/gpt-4o ")).toBe("openai/gpt-4o");
  });

  it("selects the first candidate that is platform-enabled", () => {
    const selected = selectFirstPlatformEnabledModel(
      [
        "google/gemini-2.0-flash",
        "openai/gpt-4o-mini",
        "anthropic/claude-3-5-sonnet",
      ],
      [
        "openai/gpt-4o-mini",
        "anthropic/claude-3-5-sonnet",
      ]
    );

    expect(selected).toBe("openai/gpt-4o-mini");
  });

  it("returns null when no candidate is platform-enabled", () => {
    const selected = selectFirstPlatformEnabledModel(
      ["google/gemini-2.0-flash"],
      ["anthropic/claude-3-5-sonnet"]
    );

    expect(selected).toBeNull();
  });

  it("classifies selection source as preferred when no fallback is needed", () => {
    expect(
      determineModelSelectionSource({
        selectedModel: "openai/gpt-4o",
        preferredModel: "openai/gpt-4o",
      })
    ).toBe("preferred");
  });

  it("classifies selection source as org_default when selected model matches org default", () => {
    expect(
      determineModelSelectionSource({
        selectedModel: "openai/gpt-4o-mini",
        preferredModel: "google/gemini-2.0-flash",
        orgDefaultModel: "openai/gpt-4o-mini",
      })
    ).toBe("org_default");
  });

  it("classifies selection source as safe_fallback when safe fallback is used", () => {
    expect(
      determineModelSelectionSource({
        selectedModel: SAFE_FALLBACK_MODEL_ID,
        preferredModel: "google/gemini-2.0-flash",
      })
    ).toBe("safe_fallback");
  });

  it("classifies selection source as platform_first_enabled when first enabled platform model is used", () => {
    expect(
      determineModelSelectionSource({
        selectedModel: "openai/gpt-4o-mini",
        preferredModel: "google/gemini-2.0-flash",
        orgDefaultModel: "anthropic/claude-3-5-sonnet",
        platformFirstEnabledModelId: "openai/gpt-4o-mini",
      })
    ).toBe("platform_first_enabled");
  });
});
