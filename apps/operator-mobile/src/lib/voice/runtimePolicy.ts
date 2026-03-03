export type MobileVoicePolicyProviderId = "browser" | "elevenlabs";

export const MOBILE_VOICE_RUNTIME_POLICY_VERSION = "voice_runtime_policy_v1" as const;

const DEFAULT_PROVIDER_ID: MobileVoicePolicyProviderId = "elevenlabs";

const LIVE_DUPLEX_SEGMENT_DURATION_MS: Record<MobileVoicePolicyProviderId, number> = {
  // ElevenLabs STT requires longer capture windows than sub-second chunks.
  elevenlabs: 3000,
  browser: 1000,
};

export const MOBILE_VOICE_TRANSCRIBE_MIN_FRAME_BYTES = 1600;

function normalizeProviderId(
  providerId?: MobileVoicePolicyProviderId | null
): MobileVoicePolicyProviderId {
  return providerId === "browser" ? "browser" : DEFAULT_PROVIDER_ID;
}

export function resolveMobileVoiceLiveDuplexSegmentDurationMs(
  providerId?: MobileVoicePolicyProviderId | null
): number {
  return LIVE_DUPLEX_SEGMENT_DURATION_MS[normalizeProviderId(providerId)];
}
