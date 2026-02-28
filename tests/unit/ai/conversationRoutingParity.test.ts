import { describe, expect, it } from "vitest";
import {
  normalizeConversationModelResolution,
  normalizeConversationRoutingPin,
} from "../../../convex/ai/conversations";
import { evaluateSessionRoutingPinUpdate } from "../../../convex/ai/sessionRoutingPolicy";

type ConversationRoutingPinState = {
  modelId?: string;
  authProfileId?: string;
};

function applyConversationTurn(args: {
  state: ConversationRoutingPinState;
  selectedModelId: string;
  usedModelId: string;
  selectedAuthProfileId?: string | null;
  usedAuthProfileId?: string | null;
  hasExplicitModelOverride?: boolean;
}) {
  const decision = evaluateSessionRoutingPinUpdate({
    pinnedModelId: args.state.modelId ?? null,
    pinnedAuthProfileId: args.state.authProfileId ?? null,
    selectedModelId: args.selectedModelId,
    usedModelId: args.usedModelId,
    selectedAuthProfileId: args.selectedAuthProfileId,
    usedAuthProfileId: args.usedAuthProfileId,
    hasExplicitModelOverride: args.hasExplicitModelOverride ?? false,
  });

  const nextState: ConversationRoutingPinState = decision.shouldUpdateRoutingPin
    ? {
        modelId: args.usedModelId,
        authProfileId: args.usedAuthProfileId ?? undefined,
      }
    : args.state;

  return { decision, nextState };
}

describe("conversation model-resolution normalization", () => {
  it("keeps legacy records readable while accepting new auth/profile fields", () => {
    const legacy = normalizeConversationModelResolution({
      requestedModel: "openai/gpt-4o-mini",
      selectedModel: "openai/gpt-4o-mini",
      selectionSource: "preferred",
      fallbackUsed: false,
    });

    expect(legacy).toEqual({
      requestedModel: "openai/gpt-4o-mini",
      selectedModel: "openai/gpt-4o-mini",
      usedModel: undefined,
      selectedAuthProfileId: undefined,
      usedAuthProfileId: undefined,
      selectionSource: "preferred",
      fallbackUsed: false,
      fallbackReason: undefined,
    });

    const modern = normalizeConversationModelResolution({
      requestedModel: "anthropic/claude-sonnet-4.5",
      selectedModel: "anthropic/claude-sonnet-4.5",
      usedModel: "openai/gpt-4o-mini",
      selectedAuthProfileId: "primary",
      usedAuthProfileId: "secondary",
      selectionSource: "preferred",
      fallbackUsed: true,
      fallbackReason: "retry_chain",
    });

    expect(modern).toEqual({
      requestedModel: "anthropic/claude-sonnet-4.5",
      selectedModel: "anthropic/claude-sonnet-4.5",
      usedModel: "openai/gpt-4o-mini",
      selectedAuthProfileId: "primary",
      usedAuthProfileId: "secondary",
      selectionSource: "preferred",
      fallbackUsed: true,
      fallbackReason: "retry_chain",
    });
  });

  it("returns null for malformed resolution records", () => {
    expect(
      normalizeConversationModelResolution({
        selectionSource: "preferred",
        fallbackUsed: false,
      })
    ).toBeNull();
  });
});

describe("conversation routing pin normalization", () => {
  it("returns null for missing or incomplete pin payloads", () => {
    expect(normalizeConversationRoutingPin(undefined)).toBeNull();
    expect(
      normalizeConversationRoutingPin({
        modelId: "openai/gpt-4o-mini",
      })
    ).toBeNull();
  });

  it("parses valid pin payloads", () => {
    const pin = normalizeConversationRoutingPin({
      modelId: "openai/gpt-4o-mini",
      authProfileId: "secondary",
      pinReason: "retry_failover",
      pinnedAt: 10,
      updatedAt: 20,
      unlockReason: "model_unavailable",
      unlockedAt: 30,
    });

    expect(pin).toEqual({
      modelId: "openai/gpt-4o-mini",
      authProfileId: "secondary",
      pinReason: "retry_failover",
      pinnedAt: 10,
      updatedAt: 20,
      unlockReason: "model_unavailable",
      unlockedAt: 30,
    });
  });
});

describe("conversation routing pin multi-turn parity", () => {
  it("keeps deterministic pin and unlock reasons across turns", () => {
    const turn1 = applyConversationTurn({
      state: {},
      selectedModelId: "anthropic/claude-sonnet-4.5",
      usedModelId: "anthropic/claude-sonnet-4.5",
      selectedAuthProfileId: "primary",
      usedAuthProfileId: "primary",
    });
    expect(turn1.decision.shouldUpdateRoutingPin).toBe(true);
    expect(turn1.decision.pinReason).toBe("initial_selection");

    const turn2 = applyConversationTurn({
      state: turn1.nextState,
      selectedModelId: "anthropic/claude-sonnet-4.5",
      usedModelId: "anthropic/claude-sonnet-4.5",
      selectedAuthProfileId: "primary",
      usedAuthProfileId: "primary",
    });
    expect(turn2.decision.shouldUpdateRoutingPin).toBe(false);

    const turn3 = applyConversationTurn({
      state: turn2.nextState,
      selectedModelId: "anthropic/claude-sonnet-4.5",
      usedModelId: "anthropic/claude-sonnet-4.5",
      selectedAuthProfileId: "primary",
      usedAuthProfileId: "secondary",
    });
    expect(turn3.decision.shouldUpdateRoutingPin).toBe(true);
    expect(turn3.decision.pinReason).toBe("retry_failover");
    expect(turn3.decision.unlockReason).toBeUndefined();

    const turn4 = applyConversationTurn({
      state: turn3.nextState,
      selectedModelId: "anthropic/claude-sonnet-4.5",
      usedModelId: "openai/gpt-4o-mini",
      selectedAuthProfileId: "secondary",
      usedAuthProfileId: "secondary",
      hasExplicitModelOverride: false,
    });
    expect(turn4.decision.shouldUpdateRoutingPin).toBe(true);
    expect(turn4.decision.pinReason).toBe("pin_unavailable_or_unlocked");
    expect(turn4.decision.unlockReason).toBe("model_unavailable");
  });
});
