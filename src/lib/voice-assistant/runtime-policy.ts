export type VoiceRuntimePolicyProviderId = "browser" | "elevenlabs";
export type VoiceRuntimePcmEncoding = "pcm_s16le";
export type VoiceRealtimeTransportRoute =
  | "websocket_primary"
  | "webrtc_fallback";
export type VoiceRealtimeSttRoute =
  | "scribe_v2_realtime_primary"
  | "gemini_native_audio_failover";
export type GeminiLiveActivityHandlingContract =
  "START_OF_ACTIVITY_INTERRUPTS";
export type GeminiLiveTurnCoverageContract =
  "TURN_INCLUDES_ALL_INPUT";

export interface GeminiLiveRealtimeInputSetupContract {
  contractVersion: typeof GEMINI_LIVE_REALTIME_INPUT_SETUP_CONTRACT_VERSION;
  automaticActivityDetection: {
    disabled: false;
    startOfSpeechSensitivity: "START_SENSITIVITY_HIGH";
    endOfSpeechSensitivity: "END_SENSITIVITY_LOW";
    silenceDurationMs: 500;
    prefixPaddingMs: 40;
  };
  activityHandling: GeminiLiveActivityHandlingContract;
  turnCoverage: GeminiLiveTurnCoverageContract;
  inputAudioTranscriptionEnabled: true;
  outputAudioTranscriptionEnabled: true;
}

export const VOICE_RUNTIME_POLICY_VERSION = "voice_runtime_policy_v1" as const;
export const GEMINI_LIVE_REALTIME_INPUT_SETUP_CONTRACT_VERSION =
  "gemini_live_realtime_input_setup_v1" as const;
export const GEMINI_LIVE_ACTIVITY_HANDLING_CONTRACT:
  GeminiLiveActivityHandlingContract = "START_OF_ACTIVITY_INTERRUPTS";
export const GEMINI_LIVE_TURN_COVERAGE_CONTRACT:
  GeminiLiveTurnCoverageContract = "TURN_INCLUDES_ALL_INPUT";

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

export interface VoiceRuntimePcmCaptureContract {
  encoding: VoiceRuntimePcmEncoding;
  sampleRateHz: number;
  channels: 1;
  frameDurationMs: number;
  frameBytes: number;
  samplesPerFrame: number;
}

const PCM_CAPTURE_CONTRACT: Record<
  VoiceRuntimePolicyProviderId,
  VoiceRuntimePcmCaptureContract
> = {
  // ORV-041 lock: Int16 mono, 24kHz, 20ms, 960-byte frames.
  elevenlabs: {
    encoding: "pcm_s16le",
    sampleRateHz: 24000,
    channels: 1,
    frameDurationMs: 20,
    frameBytes: 960,
    samplesPerFrame: 480,
  },
  browser: {
    encoding: "pcm_s16le",
    sampleRateHz: 24000,
    channels: 1,
    frameDurationMs: 20,
    frameBytes: 960,
    samplesPerFrame: 480,
  },
};

const REALTIME_TRANSPORT_ROUTE_PRECEDENCE: readonly VoiceRealtimeTransportRoute[] =
  Object.freeze(["websocket_primary", "webrtc_fallback"]);
const REALTIME_STT_ROUTE_PRECEDENCE: readonly VoiceRealtimeSttRoute[] =
  Object.freeze([
    "scribe_v2_realtime_primary",
    "gemini_native_audio_failover",
  ]);

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

export function resolveVoicePcmCaptureContract(
  providerId?: VoiceRuntimePolicyProviderId | null,
): VoiceRuntimePcmCaptureContract {
  return PCM_CAPTURE_CONTRACT[normalizeProviderId(providerId)];
}

export function resolveVoiceRealtimeTransportRoutePrecedence(): readonly VoiceRealtimeTransportRoute[] {
  return REALTIME_TRANSPORT_ROUTE_PRECEDENCE;
}

export function resolveVoiceRealtimeSttRoutePrecedence(): readonly VoiceRealtimeSttRoute[] {
  return REALTIME_STT_ROUTE_PRECEDENCE;
}

export function resolveGeminiLiveRealtimeInputSetupContract():
  GeminiLiveRealtimeInputSetupContract {
  return {
    contractVersion: GEMINI_LIVE_REALTIME_INPUT_SETUP_CONTRACT_VERSION,
    automaticActivityDetection: {
      disabled: false,
      startOfSpeechSensitivity: "START_SENSITIVITY_HIGH",
      endOfSpeechSensitivity: "END_SENSITIVITY_LOW",
      silenceDurationMs: 500,
      prefixPaddingMs: 40,
    },
    activityHandling: GEMINI_LIVE_ACTIVITY_HANDLING_CONTRACT,
    turnCoverage: GEMINI_LIVE_TURN_COVERAGE_CONTRACT,
    inputAudioTranscriptionEnabled: true,
    outputAudioTranscriptionEnabled: true,
  };
}
