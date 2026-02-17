export interface EvaluateSessionRoutingPinUpdateArgs {
  pinnedModelId?: string | null;
  pinnedAuthProfileId?: string | null;
  selectedModelId: string;
  usedModelId: string;
  selectedAuthProfileId?: string | null;
  usedAuthProfileId?: string | null;
  hasExplicitModelOverride: boolean;
}

export interface SessionRoutingPinDecision {
  shouldUpdateRoutingPin: boolean;
  pinReason?:
    | "pin_unavailable_or_unlocked"
    | "retry_failover"
    | "initial_selection"
    | "sticky_refresh";
  unlockReason?: "model_unavailable";
  usedAuthProfileFallback: boolean;
  pinnedModelMiss: boolean;
}

export function evaluateSessionRoutingPinUpdate(
  args: EvaluateSessionRoutingPinUpdateArgs
): SessionRoutingPinDecision {
  const pinnedModelId = args.pinnedModelId ?? null;
  const pinnedAuthProfileId = args.pinnedAuthProfileId ?? null;
  const usedAuthProfileId = args.usedAuthProfileId ?? null;
  const selectedAuthProfileId = args.selectedAuthProfileId ?? null;
  const usedAuthProfileFallback =
    Boolean(selectedAuthProfileId) &&
    Boolean(usedAuthProfileId) &&
    selectedAuthProfileId !== usedAuthProfileId;
  const pinnedModelMiss =
    Boolean(pinnedModelId) &&
    !args.hasExplicitModelOverride &&
    args.usedModelId !== pinnedModelId;
  const shouldUpdateRoutingPin =
    !pinnedModelId ||
    pinnedModelId !== args.usedModelId ||
    (Boolean(usedAuthProfileId) && pinnedAuthProfileId !== usedAuthProfileId);

  if (!shouldUpdateRoutingPin) {
    return {
      shouldUpdateRoutingPin: false,
      usedAuthProfileFallback,
      pinnedModelMiss,
    };
  }

  const pinReason = pinnedModelMiss
    ? "pin_unavailable_or_unlocked"
    : args.usedModelId !== args.selectedModelId || usedAuthProfileFallback
      ? "retry_failover"
      : !pinnedModelId && !pinnedAuthProfileId
        ? "initial_selection"
        : "sticky_refresh";

  return {
    shouldUpdateRoutingPin: true,
    pinReason,
    unlockReason: pinnedModelMiss ? "model_unavailable" : undefined,
    usedAuthProfileFallback,
    pinnedModelMiss,
  };
}
