import { describe, expect, it } from "vitest";
import { buildModelResolutionPayload } from "../../../convex/ai/chat";

describe("chat model resolution payload", () => {
  it("does not mark fallback when preferred model/auth profile succeeds", () => {
    const payload = buildModelResolutionPayload({
      requestedModel: "openai/gpt-4o-mini",
      selectedModel: "openai/gpt-4o-mini",
      selectionSource: "preferred",
      selectedAuthProfileId: "primary",
      usedAuthProfileId: "primary",
    });

    expect(payload.fallbackUsed).toBe(false);
    expect(payload.fallbackReason).toBeUndefined();
    expect(payload.selectedModel).toBe("openai/gpt-4o-mini");
  });

  it("uses selectionSource taxonomy when model selection already fell back", () => {
    const payload = buildModelResolutionPayload({
      selectedModel: "anthropic/claude-sonnet-4.5",
      selectionSource: "org_default",
      selectedAuthProfileId: "primary",
      usedAuthProfileId: "primary",
    });

    expect(payload.fallbackUsed).toBe(true);
    expect(payload.fallbackReason).toBe("org_default");
  });

  it("marks auth profile rotation when model is unchanged but profile rotates", () => {
    const payload = buildModelResolutionPayload({
      selectedModel: "anthropic/claude-sonnet-4.5",
      selectionSource: "preferred",
      selectedAuthProfileId: "primary",
      usedAuthProfileId: "secondary",
    });

    expect(payload.fallbackUsed).toBe(true);
    expect(payload.fallbackReason).toBe("auth_profile_rotation");
    expect(payload.selectedModel).toBe("anthropic/claude-sonnet-4.5");
  });

  it("marks retry-chain reason when model failover occurs", () => {
    const payload = buildModelResolutionPayload({
      selectedModel: "openai/gpt-4o-mini",
      usedModel: "anthropic/claude-sonnet-4.5",
      selectionSource: "preferred",
      selectedAuthProfileId: "primary",
      usedAuthProfileId: "secondary",
    });

    expect(payload.fallbackUsed).toBe(true);
    expect(payload.fallbackReason).toBe("retry_chain");
    expect(payload.selectedModel).toBe("anthropic/claude-sonnet-4.5");
  });
});
