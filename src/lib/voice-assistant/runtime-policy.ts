export type VoiceRuntimePolicyProviderId = "browser" | "elevenlabs";

export const VOICE_RUNTIME_POLICY_VERSION = "voice_runtime_policy_v1" as const;

const DEFAULT_PROVIDER_ID: VoiceRuntimePolicyProviderId = "elevenlabs";

const PREFERRED_CAPTURE_MIME_TYPES: Record<
  VoiceRuntimePolicyProviderId,
  readonly string[]
> = {
  elevenlabs: Object.freeze([
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
  ]),
  browser: Object.freeze([
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
  ]),
};

const FALLBACK_CAPTURE_MIME_TYPE: Record<
  VoiceRuntimePolicyProviderId,
  string
> = {
  elevenlabs: "audio/webm",
  browser: "audio/webm",
};

const LIVE_DUPLEX_SEGMENT_DURATION_MS: Record<
  VoiceRuntimePolicyProviderId,
  number
> = {
  // ElevenLabs STT rejects sub-second segments as `audio_too_short`.
  elevenlabs: 3000,
  browser: 1000,
};

const MIN_TRANSCRIPTION_DURATION_MS: Record<
  VoiceRuntimePolicyProviderId,
  number
> = {
  elevenlabs: 2000,
  browser: 500,
};

function normalizeProviderId(
  providerId?: VoiceRuntimePolicyProviderId | null,
): VoiceRuntimePolicyProviderId {
  return providerId === "browser" ? "browser" : DEFAULT_PROVIDER_ID;
}

export function resolveVoiceCapturePreferredMimeTypes(
  providerId?: VoiceRuntimePolicyProviderId | null,
): readonly string[] {
  return PREFERRED_CAPTURE_MIME_TYPES[normalizeProviderId(providerId)];
}

export function resolveVoiceCaptureFallbackMimeType(
  providerId?: VoiceRuntimePolicyProviderId | null,
): string {
  return FALLBACK_CAPTURE_MIME_TYPE[normalizeProviderId(providerId)];
}

export function resolveVoiceLiveDuplexSegmentDurationMs(
  providerId?: VoiceRuntimePolicyProviderId | null,
): number {
  return LIVE_DUPLEX_SEGMENT_DURATION_MS[normalizeProviderId(providerId)];
}

export function resolveVoiceMinimumTranscriptionDurationMs(
  providerId?: VoiceRuntimePolicyProviderId | null,
): number {
  return MIN_TRANSCRIPTION_DURATION_MS[normalizeProviderId(providerId)];
}
