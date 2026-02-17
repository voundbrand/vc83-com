import { describe, expect, it } from "vitest";
import { evaluateSessionRoutingPinUpdate } from "../../../convex/ai/sessionRoutingPolicy";

type RoutingPinState = {
  modelId?: string;
  authProfileId?: string;
};

function applyRoutingTurn(args: {
  state: RoutingPinState;
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

  const nextState: RoutingPinState = decision.shouldUpdateRoutingPin
    ? {
        modelId: args.usedModelId,
        authProfileId: args.usedAuthProfileId ?? undefined,
      }
    : args.state;

  return { decision, nextState };
}

describe("session routing pin multi-turn integration", () => {
  it("pins on first turn, stays stable, and refreshes when auth profile rotates", () => {
    const turn1 = applyRoutingTurn({
      state: {},
      selectedModelId: "anthropic/claude-sonnet-4.5",
      usedModelId: "anthropic/claude-sonnet-4.5",
      selectedAuthProfileId: "primary",
      usedAuthProfileId: "primary",
    });
    expect(turn1.decision.shouldUpdateRoutingPin).toBe(true);
    expect(turn1.decision.pinReason).toBe("initial_selection");

    const turn2 = applyRoutingTurn({
      state: turn1.nextState,
      selectedModelId: "anthropic/claude-sonnet-4.5",
      usedModelId: "anthropic/claude-sonnet-4.5",
      selectedAuthProfileId: "primary",
      usedAuthProfileId: "primary",
    });
    expect(turn2.decision.shouldUpdateRoutingPin).toBe(false);

    const turn3 = applyRoutingTurn({
      state: turn2.nextState,
      selectedModelId: "anthropic/claude-sonnet-4.5",
      usedModelId: "anthropic/claude-sonnet-4.5",
      selectedAuthProfileId: "primary",
      usedAuthProfileId: "secondary",
    });
    expect(turn3.decision.shouldUpdateRoutingPin).toBe(true);
    expect(turn3.decision.pinReason).toBe("retry_failover");
    expect(turn3.decision.usedAuthProfileFallback).toBe(true);
    expect(turn3.decision.unlockReason).toBeUndefined();

    const turn4 = applyRoutingTurn({
      state: turn3.nextState,
      selectedModelId: "anthropic/claude-sonnet-4.5",
      usedModelId: "anthropic/claude-sonnet-4.5",
      selectedAuthProfileId: "secondary",
      usedAuthProfileId: "secondary",
    });
    expect(turn4.decision.shouldUpdateRoutingPin).toBe(false);
  });

  it("unlocks unavailable pin and avoids unlock reason when explicit override changes model", () => {
    const pinnedState: RoutingPinState = {
      modelId: "anthropic/claude-sonnet-4.5",
      authProfileId: "primary",
    };

    const unavailableTurn = applyRoutingTurn({
      state: pinnedState,
      selectedModelId: "anthropic/claude-sonnet-4.5",
      usedModelId: "openai/gpt-4o-mini",
      selectedAuthProfileId: "primary",
      usedAuthProfileId: "primary",
      hasExplicitModelOverride: false,
    });
    expect(unavailableTurn.decision.shouldUpdateRoutingPin).toBe(true);
    expect(unavailableTurn.decision.pinReason).toBe("pin_unavailable_or_unlocked");
    expect(unavailableTurn.decision.unlockReason).toBe("model_unavailable");

    const explicitOverrideTurn = applyRoutingTurn({
      state: unavailableTurn.nextState,
      selectedModelId: "google/gemini-2.5-pro",
      usedModelId: "google/gemini-2.5-pro",
      selectedAuthProfileId: "primary",
      usedAuthProfileId: "primary",
      hasExplicitModelOverride: true,
    });
    expect(explicitOverrideTurn.decision.shouldUpdateRoutingPin).toBe(true);
    expect(explicitOverrideTurn.decision.pinReason).toBe("sticky_refresh");
    expect(explicitOverrideTurn.decision.unlockReason).toBeUndefined();
  });
});
