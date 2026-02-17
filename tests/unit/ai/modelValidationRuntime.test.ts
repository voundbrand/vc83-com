import { describe, expect, it } from "vitest";
import {
  formatModelMismatchMessage,
  getLatestAssistantModelResolution,
  resolveEffectiveValidationModel,
} from "../../../scripts/model-validation-runtime";

describe("model validation runtime helpers", () => {
  it("returns the latest assistant model resolution snapshot", () => {
    const resolution = getLatestAssistantModelResolution([
      {
        role: "assistant",
        timestamp: 1,
        modelResolution: {
          selectedModel: "openai/gpt-4o-mini",
          selectionSource: "preferred",
          fallbackUsed: false,
        },
      },
      {
        role: "assistant",
        timestamp: 2,
        modelResolution: {
          selectedModel: "anthropic/claude-sonnet-4.5",
          selectionSource: "preferred",
          fallbackUsed: false,
        },
      },
    ]);

    expect(resolution).toEqual({
      requestedModel: undefined,
      selectedModel: "anthropic/claude-sonnet-4.5",
      selectionSource: "preferred",
      fallbackUsed: false,
      fallbackReason: undefined,
    });
  });

  it("returns null when no valid assistant model resolution exists", () => {
    const resolution = getLatestAssistantModelResolution([
      {
        role: "assistant",
        timestamp: 1,
        modelResolution: {
          selectedModel: "",
          selectionSource: "preferred",
          fallbackUsed: false,
        },
      },
      {
        role: "user",
        timestamp: 2,
        modelResolution: {
          selectedModel: "openai/gpt-4o-mini",
          selectionSource: "preferred",
          fallbackUsed: false,
        },
      },
    ]);

    expect(resolution).toBeNull();
  });

  it("resolves requested model when it is org-allowed and platform-enabled", () => {
    const resolved = resolveEffectiveValidationModel({
      requestedModelId: "openai/gpt-4o-mini",
      settings: {
        llm: {
          enabledModels: [
            { modelId: "openai/gpt-4o-mini", isDefault: true },
            { modelId: "anthropic/claude-sonnet-4.5" },
          ],
          defaultModelId: "openai/gpt-4o-mini",
        },
      },
      platformEnabledModelIds: [
        "openai/gpt-4o-mini",
        "anthropic/claude-sonnet-4.5",
      ],
    });

    expect(resolved).toEqual({
      modelId: "openai/gpt-4o-mini",
      selectionSource: "preferred",
    });
  });

  it("resolves org-default model when requested model is disallowed", () => {
    const resolved = resolveEffectiveValidationModel({
      requestedModelId: "openai/gpt-4o-mini",
      settings: {
        llm: {
          enabledModels: [{ modelId: "anthropic/claude-sonnet-4.5", isDefault: true }],
          defaultModelId: "anthropic/claude-sonnet-4.5",
        },
      },
      platformEnabledModelIds: ["anthropic/claude-sonnet-4.5"],
    });

    expect(resolved).toEqual({
      modelId: "anthropic/claude-sonnet-4.5",
      selectionSource: "preferred",
    });
  });

  it("formats an explicit mismatch message", () => {
    const message = formatModelMismatchMessage({
      expectedModel: "openai/gpt-4o-mini",
      resolution: {
        selectedModel: "anthropic/claude-sonnet-4.5",
        selectionSource: "preferred",
        fallbackUsed: true,
        fallbackReason: "org_default",
      },
    });

    expect(message).toContain("expected=openai/gpt-4o-mini");
    expect(message).toContain("selected=anthropic/claude-sonnet-4.5");
    expect(message).toContain("fallbackReason=org_default");
  });
});
