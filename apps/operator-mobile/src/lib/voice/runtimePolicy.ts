export type MobileVoicePolicyProviderId = "browser" | "elevenlabs";

export const MOBILE_VOICE_RUNTIME_POLICY_VERSION = "voice_runtime_policy_v1" as const;

const DEFAULT_PROVIDER_ID: MobileVoicePolicyProviderId = "elevenlabs";

const LIVE_DUPLEX_SEGMENT_DURATION_MS: Record<MobileVoicePolicyProviderId, number> = {
  // Keep segment cadence aggressive to reduce conversational dead-air.
  elevenlabs: 420,
  browser: 360,
};

export const MOBILE_VOICE_TRANSCRIBE_MIN_FRAME_BYTES = 8000;
export const MOBILE_VOICE_TRANSCRIBE_MIN_FINAL_FRAME_BYTES = 6000;
export const MOBILE_VOICE_TRANSCRIBE_MIN_FRAME_DURATION_MS = 300;
export const MOBILE_VOICE_TRANSCRIBE_MIN_FINAL_FRAME_DURATION_MS = 340;
export const MOBILE_VOICE_STRUCTURED_TELEMETRY_WINDOW_HOURS = 48;

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
