export type VoiceRuntimeChaosProfile = {
  enabled: boolean;
  dropEveryN: number;
  reorderWindowSize: number;
  jitterMs: number;
  forceProviderTimeout: boolean;
};

export type VoiceChaosOutboundDecision<TPayload> = {
  payload: TPayload;
  delayMs: number;
};

export type VoiceChaosHarness<TPayload> = {
  planOutbound: (args: { sequence: number; payload: TPayload }) => VoiceChaosOutboundDecision<TPayload>[];
  flushOutbound: () => VoiceChaosOutboundDecision<TPayload>[];
  shouldForceProviderTimeout: () => boolean;
};

function normalizeNonNegativeInteger(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.floor(value));
}

function normalizeBoolean(value: unknown): boolean {
  return value === true;
}

export function createVoiceRuntimeChaosHarness<TPayload>(
  profile: VoiceRuntimeChaosProfile
): VoiceChaosHarness<TPayload> {
  const normalizedProfile: VoiceRuntimeChaosProfile = {
    enabled: normalizeBoolean(profile.enabled),
    dropEveryN: normalizeNonNegativeInteger(profile.dropEveryN),
    reorderWindowSize: Math.max(1, normalizeNonNegativeInteger(profile.reorderWindowSize)),
    jitterMs: normalizeNonNegativeInteger(profile.jitterMs),
    forceProviderTimeout: normalizeBoolean(profile.forceProviderTimeout),
  };
  const reorderBuffer: VoiceChaosOutboundDecision<TPayload>[] = [];

  function withDelay(payload: TPayload): VoiceChaosOutboundDecision<TPayload> {
    return {
      payload,
      delayMs: normalizedProfile.jitterMs,
    };
  }

  return {
    planOutbound(args) {
      if (!normalizedProfile.enabled) {
        return [{ payload: args.payload, delayMs: 0 }];
      }

      if (
        normalizedProfile.dropEveryN > 0
        && args.sequence >= 0
        && (args.sequence + 1) % normalizedProfile.dropEveryN === 0
      ) {
        return [];
      }

      const next = withDelay(args.payload);
      if (normalizedProfile.reorderWindowSize <= 1) {
        return [next];
      }

      reorderBuffer.push(next);
      if (reorderBuffer.length < normalizedProfile.reorderWindowSize) {
        return [];
      }

      return reorderBuffer.splice(0, reorderBuffer.length).reverse();
    },
    flushOutbound() {
      if (reorderBuffer.length === 0) {
        return [];
      }
      return reorderBuffer.splice(0, reorderBuffer.length);
    },
    shouldForceProviderTimeout() {
      return normalizedProfile.enabled && normalizedProfile.forceProviderTimeout;
    },
  };
}
