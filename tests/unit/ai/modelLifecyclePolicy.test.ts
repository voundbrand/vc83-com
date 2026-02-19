import { describe, expect, it } from "vitest";
import {
  deriveLifecycleState,
  validateRetirementSafety,
} from "../../../convex/ai/platformModelManagement";

describe("model lifecycle policy", () => {
  it("derives lifecycle state for enable/default/deprecate/retire transitions", () => {
    expect(deriveLifecycleState({ isPlatformEnabled: true, isSystemDefault: false })).toBe(
      "enabled"
    );
    expect(deriveLifecycleState({ isPlatformEnabled: true, isSystemDefault: true })).toBe(
      "default"
    );
    expect(
      deriveLifecycleState({
        isPlatformEnabled: true,
        isSystemDefault: false,
        deprecatedAt: Date.now(),
      })
    ).toBe("deprecated");
    expect(
      deriveLifecycleState({
        isPlatformEnabled: false,
        isSystemDefault: false,
        retiredAt: Date.now(),
      })
    ).toBe("retired");
  });

  it("requires replacement when retiring a default model", () => {
    const result = validateRetirementSafety({
      modelId: "anthropic/claude-sonnet-4.5",
      isSystemDefault: true,
      replacementModel: null,
    });

    expect(result.ok).toBe(false);
    expect(result.reasons.join(" ")).toContain("replacement model");
  });

  it("requires replacement model to be enabled and not retired", () => {
    const result = validateRetirementSafety({
      modelId: "anthropic/claude-sonnet-4.5",
      isSystemDefault: false,
      replacementModel: {
        modelId: "openai/gpt-4o",
        isPlatformEnabled: false,
        lifecycleStatus: "retired",
      },
    });

    expect(result.ok).toBe(false);
    expect(result.reasons.join(" ")).toContain("platform-enabled");
    expect(result.reasons.join(" ")).toContain("retired");
  });

  it("passes retirement safety when replacement is active", () => {
    const result = validateRetirementSafety({
      modelId: "anthropic/claude-sonnet-4.5",
      isSystemDefault: true,
      replacementModel: {
        modelId: "openai/gpt-4o",
        isPlatformEnabled: true,
        lifecycleStatus: "enabled",
      },
    });

    expect(result.ok).toBe(true);
    expect(result.reasons).toEqual([]);
  });
});
