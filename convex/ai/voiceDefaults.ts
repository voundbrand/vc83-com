const DEFAULT_ELEVENLABS_HARD_FALLBACK_VOICE_ID = "21m00Tcm4TlvDq8ikWAM";

export type VoiceResolutionSource =
  | "requested"
  | "agent"
  | "org_default"
  | "platform_default"
  | "hard_fallback";

function normalizeString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

export function resolvePlatformDefaultVoiceIdFromEnv(): string | null {
  return (
    normalizeString(process.env.VOICE_RUNTIME_PLATFORM_DEFAULT_VOICE_ID) ??
    normalizeString(process.env.ELEVENLABS_DEFAULT_VOICE_ID)
  );
}

export function resolveDeterministicVoiceDefaults(args: {
  requestedVoiceId?: unknown;
  agentVoiceId?: unknown;
  orgDefaultVoiceId?: unknown;
  platformDefaultVoiceId?: unknown;
  hardFallbackVoiceId?: string;
}): {
  resolvedVoiceId: string;
  voiceResolutionSource: VoiceResolutionSource;
  requestedVoiceId: string | null;
  agentVoiceId: string | null;
  orgDefaultVoiceId: string | null;
  platformDefaultVoiceId: string | null;
  hardFallbackVoiceId: string;
} {
  const requestedVoiceId = normalizeString(args.requestedVoiceId);
  if (requestedVoiceId) {
    return {
      resolvedVoiceId: requestedVoiceId,
      voiceResolutionSource: "requested",
      requestedVoiceId,
      agentVoiceId: normalizeString(args.agentVoiceId),
      orgDefaultVoiceId: normalizeString(args.orgDefaultVoiceId),
      platformDefaultVoiceId:
        normalizeString(args.platformDefaultVoiceId) ??
        resolvePlatformDefaultVoiceIdFromEnv(),
      hardFallbackVoiceId:
        normalizeString(args.hardFallbackVoiceId) ??
        DEFAULT_ELEVENLABS_HARD_FALLBACK_VOICE_ID,
    };
  }

  const agentVoiceId = normalizeString(args.agentVoiceId);
  if (agentVoiceId) {
    return {
      resolvedVoiceId: agentVoiceId,
      voiceResolutionSource: "agent",
      requestedVoiceId,
      agentVoiceId,
      orgDefaultVoiceId: normalizeString(args.orgDefaultVoiceId),
      platformDefaultVoiceId:
        normalizeString(args.platformDefaultVoiceId) ??
        resolvePlatformDefaultVoiceIdFromEnv(),
      hardFallbackVoiceId:
        normalizeString(args.hardFallbackVoiceId) ??
        DEFAULT_ELEVENLABS_HARD_FALLBACK_VOICE_ID,
    };
  }

  const orgDefaultVoiceId = normalizeString(args.orgDefaultVoiceId);
  if (orgDefaultVoiceId) {
    return {
      resolvedVoiceId: orgDefaultVoiceId,
      voiceResolutionSource: "org_default",
      requestedVoiceId,
      agentVoiceId,
      orgDefaultVoiceId,
      platformDefaultVoiceId:
        normalizeString(args.platformDefaultVoiceId) ??
        resolvePlatformDefaultVoiceIdFromEnv(),
      hardFallbackVoiceId:
        normalizeString(args.hardFallbackVoiceId) ??
        DEFAULT_ELEVENLABS_HARD_FALLBACK_VOICE_ID,
    };
  }

  const platformDefaultVoiceId =
    normalizeString(args.platformDefaultVoiceId) ??
    resolvePlatformDefaultVoiceIdFromEnv();
  if (platformDefaultVoiceId) {
    return {
      resolvedVoiceId: platformDefaultVoiceId,
      voiceResolutionSource: "platform_default",
      requestedVoiceId,
      agentVoiceId,
      orgDefaultVoiceId,
      platformDefaultVoiceId,
      hardFallbackVoiceId:
        normalizeString(args.hardFallbackVoiceId) ??
        DEFAULT_ELEVENLABS_HARD_FALLBACK_VOICE_ID,
    };
  }

  const hardFallbackVoiceId =
    normalizeString(args.hardFallbackVoiceId) ??
    DEFAULT_ELEVENLABS_HARD_FALLBACK_VOICE_ID;
  return {
    resolvedVoiceId: hardFallbackVoiceId,
    voiceResolutionSource: "hard_fallback",
    requestedVoiceId,
    agentVoiceId,
    orgDefaultVoiceId,
    platformDefaultVoiceId,
    hardFallbackVoiceId,
  };
}

export function resolveDeterministicOrgDefaultVoiceId(): string {
  return (
    resolvePlatformDefaultVoiceIdFromEnv() ??
    DEFAULT_ELEVENLABS_HARD_FALLBACK_VOICE_ID
  );
}

export const ELEVENLABS_HARD_FALLBACK_VOICE_ID =
  DEFAULT_ELEVENLABS_HARD_FALLBACK_VOICE_ID;
