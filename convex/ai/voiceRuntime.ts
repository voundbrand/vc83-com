import { action, internalMutation, internalQuery } from "../_generated/server";
import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { requireAuthenticatedUser } from "../rbacHelpers";
import { getLicenseInternal } from "../licensing/helpers";
import { resolveOrganizationProviderBindingForProvider } from "./providerRegistry";
import { convertUsdToCredits } from "./model/modelPricing";
import {
  assertMediaSessionIngressContract,
  mediaSessionIngressContractValidator,
  assertVoiceTransportEnvelope,
  trustEventPayloadValidator,
  WEB_CHAT_VISION_FRAME_BUFFER_CONTRACT_VERSION,
  WEB_CHAT_VISION_FRAME_BUFFER_IDEMPOTENCY_WINDOW_LIMIT,
  WEB_CHAT_VISION_FRAME_BUFFER_MAX_FRAMES,
  type MediaSessionIngressContract,
  type VoiceTransportEnvelopeContract,
  voiceTransportEnvelopeValidator,
  VOICE_TRANSPORT_ENVELOPE_CONTRACT_VERSION,
} from "../schemas/aiSchemas";
import {
  TRUST_EVENT_TAXONOMY_VERSION,
  trustEventNameValidator,
  type TrustEventPayload,
  validateTrustEventPayload,
} from "./trustEvents";
import {
  normalizeVoiceRuntimeProviderId,
  resolvePersistentRealtimeMultimodalAdapter,
  resolvePcmTranscriptionMimeType,
  resolveVoiceRuntimeAdapter,
  type PersistentRealtimeMultimodalProviderId,
  type VoiceProviderHealth,
  type VoiceRuntimeProviderId,
  type VoiceUsageTelemetry,
} from "./voiceRuntimeAdapter";
import {
  buildWebChatVisionAttachmentTelemetrySnapshot,
  type WebChatVisionAttachReason,
} from "./trustTelemetry";
import {
  buildOperatorMediaRetentionWriteRequest,
  resolveEffectiveOperatorMediaRetentionMode,
  resolveOperatorMediaRetentionConfig,
  resolveWebChatVisionAttachmentAuthIsolationDecision,
  resolveWebChatVisionFrameDecision,
  resolveWebChatVisionFrameMaxAgeMs,
  type OperatorRetainedMediaType,
  type WebChatVisionFrameCandidate,
} from "./mediaRetention";
import { resolveMobileSourceAttestationContract } from "./mobileRuntimeHardening";
import {
  resolveDeterministicVoiceDefaults,
} from "./voiceDefaults";

// Dynamic require keeps action contexts ergonomic for internal runQuery/runMutation.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generatedApi: any = require("../_generated/api");

const VOICE_CHANNEL = "voice_runtime";
export const VOICE_EDGE_BRIDGE_CONTRACT_VERSION =
  "tcg_voice_edge_bridge_v1" as const;
export const VOICE_EDGE_RUNTIME_AUTHORITY_PRECEDENCE =
  "vc83_runtime_policy" as const;
const VOICE_REALTIME_STT_PRIMARY_ROUTE =
  "scribe_v2_realtime_primary" as const;
const VOICE_REALTIME_STT_FAILOVER_ROUTE =
  "gemini_native_audio_failover" as const;
const GEMINI_NATIVE_AUDIO_TRANSCRIBE_MODEL = "gemini-2.0-flash";
const PERSISTENT_REALTIME_MULTIMODAL_CONTRACT_VERSION =
  "web_chat_persistent_realtime_multimodal_v1" as const;
export const GEMINI_LIVE_REALTIME_INPUT_SETUP_CONTRACT_VERSION =
  "gemini_live_realtime_input_setup_v1" as const;
export const GEMINI_LIVE_ACTIVITY_HANDLING_CONTRACT =
  "START_OF_ACTIVITY_INTERRUPTS" as const;
export const GEMINI_LIVE_TURN_COVERAGE_CONTRACT =
  "TURN_INCLUDES_ALL_INPUT" as const;

export interface GeminiLiveRealtimeInputSetupContract {
  contractVersion: typeof GEMINI_LIVE_REALTIME_INPUT_SETUP_CONTRACT_VERSION;
  automaticActivityDetection: {
    disabled: false;
    startOfSpeechSensitivity: "START_SENSITIVITY_HIGH";
    endOfSpeechSensitivity: "END_SENSITIVITY_LOW";
    silenceDurationMs: 500;
    prefixPaddingMs: 40;
  };
  activityHandling: typeof GEMINI_LIVE_ACTIVITY_HANDLING_CONTRACT;
  turnCoverage: typeof GEMINI_LIVE_TURN_COVERAGE_CONTRACT;
  inputAudioTranscriptionEnabled: true;
  outputAudioTranscriptionEnabled: true;
}

type PersistentRealtimeFallbackReason =
  | "feature_flag_disabled"
  | "provider_capability_unsupported"
  | "session_handshake_failed";

type PersistentRealtimeMode = "persistent_realtime_multimodal" | "turn_stitch";

type VoiceTrustEventName =
  | "trust.voice.session_transition.v1"
  | "trust.voice.adaptive_flow_decision.v1"
  | "trust.voice.runtime_failover_triggered.v1";

type VoiceRuntimeContext = {
  organizationId: Id<"organizations">;
  actorId: string;
  interviewSessionId: Id<"agentSessions">;
  agentVoiceId: string | null;
  agentVoiceLanguage: string | null;
  elevenLabsBinding: {
    apiKey: string;
    baseUrl?: string;
    defaultVoiceId?: string;
    profileId: string;
    billingSource: "platform" | "byok" | "private";
  } | null;
  geminiBinding: {
    apiKey: string;
    baseUrl?: string;
    profileId: string;
    billingSource: "platform" | "byok" | "private";
  } | null;
};

export const VOICE_RUNTIME_SESSION_FSM_STATE_VALUES = [
  "opening",
  "open",
  "degraded",
  "closing",
  "closed",
  "error",
] as const;
export type VoiceRuntimeSessionFsmState =
  (typeof VOICE_RUNTIME_SESSION_FSM_STATE_VALUES)[number];

const VOICE_RUNTIME_SESSION_STALE_TIMEOUT_MS = 5 * 60 * 1000;
const VOICE_SESSION_OPEN_RATE_LIMIT_WINDOW_MS = 60 * 1000;
const VOICE_SESSION_OPEN_RATE_LIMIT_MAX_REQUESTS = 6;
const VOICE_RUNTIME_ATTESTATION_PROOF_TTL_MS = 60 * 1000;
const VOICE_STRUCTURED_TELEMETRY_WINDOW_HOURS = 48;
const VOICE_SESSION_OPEN_PROTECTED_SOURCE_CLASS_PREFIXES = [
  "iphone_camera",
  "iphone_microphone",
  "meta_glasses",
  "mobile_stream_ios",
  "mobile_stream_android",
  "glasses_stream_meta",
] as const;

const TRUST_EVENT_ALLOWED_PAYLOAD_KEYS = new Set(
  Object.keys(
    ((trustEventPayloadValidator as unknown as { fields?: Record<string, unknown> })
      .fields ?? {}) as Record<string, unknown>,
  ),
);

interface VoiceRuntimeSessionSnapshot {
  voiceSessionId: string;
  state: VoiceRuntimeSessionFsmState;
  fromState?: VoiceRuntimeSessionFsmState;
  providerId?: VoiceRuntimeProviderId;
  requestedProviderId?: VoiceRuntimeProviderId;
  reason?: string;
  occurredAt: number;
}

function normalizeVoiceRuntimeSessionFsmState(
  value: unknown
): VoiceRuntimeSessionFsmState | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim();
  return (VOICE_RUNTIME_SESSION_FSM_STATE_VALUES as readonly string[]).includes(
    normalized
  )
    ? (normalized as VoiceRuntimeSessionFsmState)
    : undefined;
}

function parseEnvBooleanFlag(value: string | undefined): boolean {
  if (typeof value !== "string") {
    return false;
  }
  const normalized = value.trim().toLowerCase();
  return normalized === "1"
    || normalized === "true"
    || normalized === "yes"
    || normalized === "on";
}

function isPersistentRealtimeMultimodalEnabled(): boolean {
  return parseEnvBooleanFlag(process.env.VR_PERSISTENT_MM_ENABLED);
}

type PersistentRealtimeLifecycleSnapshot = {
  contractVersion: typeof PERSISTENT_REALTIME_MULTIMODAL_CONTRACT_VERSION;
  mode: PersistentRealtimeMode;
  enabled: boolean;
  featureFlagEnabled: boolean;
  providerId: PersistentRealtimeMultimodalProviderId | null;
  providerSessionId: string | null;
  transport: "native_realtime_audio_video" | null;
  fallbackReason: PersistentRealtimeFallbackReason | null;
  healthStatus: "healthy" | "degraded" | "offline" | null;
  providerSetupContract: GeminiLiveRealtimeInputSetupContract;
};

export function buildGeminiLiveRealtimeInputSetupContract():
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

function buildPersistentRealtimeLifecycleSnapshot(args: {
  mode: PersistentRealtimeMode;
  featureFlagEnabled: boolean;
  providerId?: PersistentRealtimeMultimodalProviderId | null;
  providerSessionId?: string | null;
  transport?: "native_realtime_audio_video" | null;
  fallbackReason?: PersistentRealtimeFallbackReason | null;
  healthStatus?: "healthy" | "degraded" | "offline" | null;
}): PersistentRealtimeLifecycleSnapshot {
  const mode = args.mode;
  return {
    contractVersion: PERSISTENT_REALTIME_MULTIMODAL_CONTRACT_VERSION,
    mode,
    enabled: mode === "persistent_realtime_multimodal",
    featureFlagEnabled: args.featureFlagEnabled,
    providerId: args.providerId ?? null,
    providerSessionId: normalizeString(args.providerSessionId) ?? null,
    transport: args.transport ?? null,
    fallbackReason: args.fallbackReason ?? null,
    healthStatus: args.healthStatus ?? null,
    providerSetupContract: buildGeminiLiveRealtimeInputSetupContract(),
  };
}

export function isAllowedVoiceRuntimeSessionTransition(args: {
  fromState?: VoiceRuntimeSessionFsmState;
  toState: VoiceRuntimeSessionFsmState;
}): boolean {
  if (!args.fromState) {
    return args.toState === "opening" || args.toState === "closed";
  }
  if (args.fromState === args.toState) {
    return true;
  }
  const transitions: Record<
    VoiceRuntimeSessionFsmState,
    ReadonlyArray<VoiceRuntimeSessionFsmState>
  > = {
    opening: ["open", "degraded", "closing", "error"],
    open: ["degraded", "closing", "error"],
    degraded: ["open", "closing", "error"],
    closing: ["closed", "error"],
    closed: ["opening"],
    error: ["opening", "closing", "closed"],
  };
  return transitions[args.fromState].includes(args.toState);
}

function assertAllowedVoiceRuntimeSessionTransition(args: {
  fromState?: VoiceRuntimeSessionFsmState;
  toState: VoiceRuntimeSessionFsmState;
}) {
  if (!isAllowedVoiceRuntimeSessionTransition(args)) {
    throw new Error(
      `Invalid voice runtime session transition from ${args.fromState ?? "none"} to ${args.toState}.`
    );
  }
}

export function isVoiceRuntimeSessionStale(args: {
  snapshot?: VoiceRuntimeSessionSnapshot | null;
  nowMs: number;
  staleTimeoutMs?: number;
}): boolean {
  if (!args.snapshot) {
    return false;
  }
  if (args.snapshot.state === "closed") {
    return false;
  }
  const staleTimeoutMs = args.staleTimeoutMs ?? VOICE_RUNTIME_SESSION_STALE_TIMEOUT_MS;
  return args.nowMs - args.snapshot.occurredAt > staleTimeoutMs;
}

interface VoiceRuntimeNativeBridgeMetadata {
  contractVersion: typeof VOICE_EDGE_BRIDGE_CONTRACT_VERSION;
  runtimeAuthorityPrecedence: typeof VOICE_EDGE_RUNTIME_AUTHORITY_PRECEDENCE;
  routeTarget: "vc83_voice_runtime";
  providerPattern: "gemini_live_reference" | "generic_voice_runtime";
  voiceSessionId: string;
  sessionState: "open" | "closed" | "stt" | "tts" | "probe";
  requestedProviderId: VoiceRuntimeProviderId;
  providerId: VoiceRuntimeProviderId;
  fallbackProviderId: VoiceRuntimeProviderId | null;
  fallbackReason?: string | null;
}

interface VoiceSessionOpenAttestationProofPayload {
  v: "voice_session_open_attestation_proof_v1";
  org: string;
  user: string;
  interview: string;
  live: string;
  sourceId: string;
  sourceClass: string;
  providerId: string;
  surface: string;
  iat: number;
  exp: number;
}

function normalizeString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeRealtimeTranscriptionLanguageHint(
  value: unknown,
): string | null {
  const normalized = normalizeString(value)?.toLowerCase().replace(/_/g, "-");
  if (!normalized) {
    return null;
  }
  if (normalized === "english" || normalized === "englisch") {
    return "en";
  }
  if (normalized === "german" || normalized === "deutsch") {
    return "de";
  }
  if (normalized === "hindi") {
    return "hi";
  }
  if (/^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/.test(normalized)) {
    return normalized;
  }
  return null;
}

export function resolveRealtimeTranscriptionLanguageHint(args: {
  conversationRuntime?: Record<string, unknown>;
  voiceRuntime?: Record<string, unknown>;
  runtimeFallbackLanguage?: string | null;
}): string | undefined {
  return (
    normalizeRealtimeTranscriptionLanguageHint(
      args.conversationRuntime?.languageLock,
    ) ??
    normalizeRealtimeTranscriptionLanguageHint(
      args.voiceRuntime?.languageLock,
    ) ??
    normalizeRealtimeTranscriptionLanguageHint(args.voiceRuntime?.language) ??
    normalizeRealtimeTranscriptionLanguageHint(
      args.conversationRuntime?.language,
    ) ??
    normalizeRealtimeTranscriptionLanguageHint(args.runtimeFallbackLanguage) ??
    undefined
  );
}

const AMBIENT_TRANSCRIPT_BRACKETED_DESCRIPTOR_PATTERN =
  /\([^()]+\)|\[[^[\]]+\]|\{[^{}]+\}/g;
const AMBIENT_TRANSCRIPT_NON_SPEECH_TERMS = [
  "noise",
  "background",
  "humming",
  "buzzing",
  "click",
  "clicking",
  "jingle",
  "outro",
  "intro",
  "beep",
  "beeping",
  "chime",
  "ringing",
  "ringtone",
  "tone",
  "ding",
  "static",
  "silence",
  "inaudible",
  "unintelligible",
  "clatter",
  "clattering",
  "thud",
  "thudding",
  "traffic",
  "engine",
  "door slam",
  "door slams",
  "passing",
  "wind",
  "rain",
  "siren",
  "footsteps",
  "coughing",
  "breathing",
  "laughter",
  "applause",
  "music",
] as const;
const AMBIENT_TRANSCRIPT_SPEECH_HINT_PATTERN =
  /\b(hello|hi|hey|yes|no|please|thanks|thank\s+you|can\s+you|could\s+you|i|we|you)\b/i;

function containsAmbientTerm(text: string, terms: readonly string[]): boolean {
  return terms.some((term) => text.includes(term));
}

export function isLikelyAmbientTranscriptText(
  value: string | null | undefined
): boolean {
  const normalized = normalizeString(value);
  if (!normalized) {
    return true;
  }
  const lower = normalized.toLowerCase();
  if (AMBIENT_TRANSCRIPT_SPEECH_HINT_PATTERN.test(lower)) {
    return false;
  }
  const descriptorMatches =
    lower.match(AMBIENT_TRANSCRIPT_BRACKETED_DESCRIPTOR_PATTERN) ?? [];
  if (descriptorMatches.length === 0) {
    return false;
  }
  const remainder = lower
    .replace(AMBIENT_TRANSCRIPT_BRACKETED_DESCRIPTOR_PATTERN, " ")
    .replace(/[.,!?;:/|\\_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (remainder) {
    return false;
  }
  const descriptorBody = descriptorMatches
    .map((segment) => segment.slice(1, -1).trim())
    .join(" ");
  if (!descriptorBody) {
    return true;
  }
  if (containsAmbientTerm(descriptorBody, AMBIENT_TRANSCRIPT_NON_SPEECH_TERMS)) {
    return true;
  }
  const descriptorWordCount = descriptorBody
    .split(/\s+/)
    .filter((segment) => segment.length > 0).length;
  return descriptorWordCount <= 4;
}

function sanitizeTranscriptForVoiceTurn(value: unknown): string | null {
  const normalized = normalizeString(value);
  if (!normalized) {
    return null;
  }
  if (isLikelyAmbientTranscriptText(normalized)) {
    return null;
  }
  return normalized;
}

function buildAmbientTranscriptDebugSnapshot(value: unknown): {
  transcriptPreview: string;
  transcriptLength: number;
  speechHintDetected: boolean;
  descriptorMatchCount: number;
  descriptorOnly: boolean;
} {
  const normalized = normalizeString(value) ?? "";
  const lower = normalized.toLowerCase();
  const descriptorMatches =
    lower.match(AMBIENT_TRANSCRIPT_BRACKETED_DESCRIPTOR_PATTERN) ?? [];
  const remainder = lower
    .replace(AMBIENT_TRANSCRIPT_BRACKETED_DESCRIPTOR_PATTERN, " ")
    .replace(/[.,!?;:/|\\_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return {
    transcriptPreview: normalized.slice(0, 180),
    transcriptLength: normalized.length,
    speechHintDetected: AMBIENT_TRANSCRIPT_SPEECH_HINT_PATTERN.test(lower),
    descriptorMatchCount: descriptorMatches.length,
    descriptorOnly: descriptorMatches.length > 0 && remainder.length === 0,
  };
}

function normalizeObject(
  value: unknown,
): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  return value as Record<string, unknown>;
}

function normalizeTelemetryInteger(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }
  if (value < 0) {
    return undefined;
  }
  return Math.floor(value);
}

function emitVoiceTelemetry(event: string, details?: Record<string, unknown>) {
  console.info("[VoiceTelemetry]", {
    event,
    timestampMs: Date.now(),
    telemetryWindowHours: VOICE_STRUCTURED_TELEMETRY_WINDOW_HOURS,
    ...(details ?? {}),
  });
}

function normalizeTranscriptionMimeType(value: unknown): string | undefined {
  const normalized = normalizeString(value)?.toLowerCase();
  if (!normalized) {
    return undefined;
  }
  return normalized;
}

type VoiceRealtimeSttRoute =
  | typeof VOICE_REALTIME_STT_PRIMARY_ROUTE
  | typeof VOICE_REALTIME_STT_FAILOVER_ROUTE;

interface RealtimeSttTranscriptionResult {
  transcriptText: string;
  providerId: VoiceRuntimeProviderId;
  usage?: VoiceUsageTelemetry;
  route: VoiceRealtimeSttRoute;
  routeProvider: "elevenlabs" | "gemini";
}

function resolveTranscriptionFilenameForMimeType(mimeType: string): string {
  const canonical = mimeType.split(";", 1)[0]?.trim().toLowerCase() ?? mimeType;
  switch (canonical) {
    case "audio/mp4":
    case "audio/m4a":
      return "voice-input.m4a";
    case "audio/mpeg":
    case "audio/mp3":
      return "voice-input.mp3";
    case "audio/wav":
    case "audio/x-wav":
      return "voice-input.wav";
    case "audio/webm":
      return "voice-input.webm";
    case "audio/ogg":
      return "voice-input.ogg";
    case "audio/flac":
      return "voice-input.flac";
    default:
      return "voice-input.audio";
  }
}

function resolveGeminiNativeAudioTranscriptionEndpoint(baseUrl?: string): string {
  const normalizedBaseUrl =
    normalizeString(baseUrl)?.replace(/\/+$/, "")
    || "https://generativelanguage.googleapis.com/v1beta/openai";
  return `${normalizedBaseUrl}/audio/transcriptions`;
}

function extractTranscriptionTextFromGeminiPayload(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const typed = payload as Record<string, unknown>;
  const directText = normalizeString(typed.text);
  if (directText) {
    return directText;
  }
  const directTranscript = normalizeString(typed.transcript);
  if (directTranscript) {
    return directTranscript;
  }
  const choices = typed.choices;
  if (!Array.isArray(choices) || choices.length === 0) {
    return null;
  }
  const firstChoice = choices[0];
  if (!firstChoice || typeof firstChoice !== "object") {
    return null;
  }
  const message = (firstChoice as Record<string, unknown>).message;
  if (!message || typeof message !== "object") {
    return null;
  }
  return normalizeString((message as Record<string, unknown>).content);
}

function extractErrorMessageFromTranscriptionPayload(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const typed = payload as Record<string, unknown>;
  const direct = normalizeString(typed.message);
  if (direct) {
    return direct;
  }
  const error = typed.error;
  if (!error || typeof error !== "object") {
    return null;
  }
  return normalizeString((error as Record<string, unknown>).message);
}

async function transcribeWithGeminiNativeAudioFailover(args: {
  voiceSessionId: string;
  binding: NonNullable<VoiceRuntimeContext["geminiBinding"]>;
  audioBytes: Uint8Array;
  mimeType: string;
  language?: string;
}): Promise<RealtimeSttTranscriptionResult> {
  const endpoint = resolveGeminiNativeAudioTranscriptionEndpoint(
    args.binding.baseUrl,
  );
  const normalizedMimeType = normalizeTranscriptionMimeType(args.mimeType)
    ?? "audio/wav";
  const formData = new FormData();
  formData.append(
    "file",
    new Blob([Uint8Array.from(args.audioBytes).buffer], {
      type: normalizedMimeType,
    }),
    resolveTranscriptionFilenameForMimeType(normalizedMimeType),
  );
  formData.append("model", GEMINI_NATIVE_AUDIO_TRANSCRIBE_MODEL);
  const normalizedLanguage = normalizeString(args.language);
  if (normalizedLanguage) {
    formData.append("language", normalizedLanguage);
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${args.binding.apiKey}`,
    },
    body: formData,
  });

  const rawResponseText = await response.text();
  let payload: unknown = null;
  try {
    payload = rawResponseText ? JSON.parse(rawResponseText) : null;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const responseError =
      extractErrorMessageFromTranscriptionPayload(payload)
      || normalizeString(rawResponseText)
      || `gemini_native_audio_transcription_http_${response.status}`;
    throw new Error(responseError);
  }

  const transcriptText = extractTranscriptionTextFromGeminiPayload(payload);
  if (!transcriptText) {
    throw new Error("Gemini native audio failover returned no transcript text.");
  }

  return {
    transcriptText,
    providerId: "elevenlabs",
    route: VOICE_REALTIME_STT_FAILOVER_ROUTE,
    routeProvider: "gemini",
    usage: {
      nativeUsageUnit: "requests",
      nativeUsageQuantity: 1,
      nativeInputUnits: args.audioBytes.byteLength,
      nativeTotalUnits: args.audioBytes.byteLength,
      nativeCostSource: "not_available",
      metadata: {
        sttRoute: VOICE_REALTIME_STT_FAILOVER_ROUTE,
        sttProvider: "gemini",
        modelId: GEMINI_NATIVE_AUDIO_TRANSCRIBE_MODEL,
        endpoint,
      },
    },
  };
}

function normalizeSourceClassToken(value: unknown): string | undefined {
  const normalized = normalizeString(value)?.toLowerCase();
  if (!normalized) {
    return undefined;
  }
  return normalized.replace(/[^a-z0-9._:-]+/g, "_");
}

function isProtectedSourceClass(sourceClass?: string): boolean {
  if (!sourceClass) {
    return false;
  }
  return VOICE_SESSION_OPEN_PROTECTED_SOURCE_CLASS_PREFIXES.includes(
    sourceClass as (typeof VOICE_SESSION_OPEN_PROTECTED_SOURCE_CLASS_PREFIXES)[number],
  );
}

function isMetaSourceClass(sourceClass?: string): boolean {
  return sourceClass === "meta_glasses" || sourceClass === "glasses_stream_meta";
}

function normalizeSessionToken(value: unknown): string | undefined {
  const normalized = normalizeString(value);
  return normalized ?? undefined;
}

function normalizeIdentityToken(value: unknown): string | undefined {
  const normalized = normalizeString(value)?.toLowerCase();
  if (!normalized) {
    return undefined;
  }
  return normalized
    .replace(/[^a-z0-9._:-]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizeHex32(value: number): string {
  return (value >>> 0).toString(16).padStart(8, "0");
}

const BASE64_ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const BASE64_CHAR_MAP = new Map<string, number>(
  Array.from(BASE64_ALPHABET).map((char, index) => [char, index]),
);

function encodeBase64(bytes: Uint8Array): string {
  if (bytes.length === 0) {
    return "";
  }
  let encoded = "";
  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index] ?? 0;
    const second = bytes[index + 1] ?? 0;
    const third = bytes[index + 2] ?? 0;
    const chunk = (first << 16) | (second << 8) | third;

    encoded += BASE64_ALPHABET[(chunk >> 18) & 0x3f] ?? "";
    encoded += BASE64_ALPHABET[(chunk >> 12) & 0x3f] ?? "";
    encoded +=
      index + 1 < bytes.length
        ? (BASE64_ALPHABET[(chunk >> 6) & 0x3f] ?? "")
        : "=";
    encoded += index + 2 < bytes.length ? (BASE64_ALPHABET[chunk & 0x3f] ?? "") : "=";
  }
  return encoded;
}

function decodeBase64(payload: string): Uint8Array {
  const normalized = payload.replace(/[\s\r\n\t]/g, "");
  if (!normalized) {
    return new Uint8Array(0);
  }

  const standard = normalized.replace(/-/g, "+").replace(/_/g, "/");
  const padded = `${standard}${"=".repeat((4 - (standard.length % 4)) % 4)}`;
  const bytes: number[] = [];

  for (let index = 0; index < padded.length; index += 4) {
    const a = padded[index];
    const b = padded[index + 1];
    const c = padded[index + 2];
    const d = padded[index + 3];
    if (!a || !b || !c || !d) {
      throw new Error("Invalid base64 payload length.");
    }
    const valueA = BASE64_CHAR_MAP.get(a);
    const valueB = BASE64_CHAR_MAP.get(b);
    const valueC = c === "=" ? 0 : BASE64_CHAR_MAP.get(c);
    const valueD = d === "=" ? 0 : BASE64_CHAR_MAP.get(d);
    if (
      valueA === undefined
      || valueB === undefined
      || valueC === undefined
      || valueD === undefined
    ) {
      throw new Error("Invalid base64 payload characters.");
    }

    const chunk = (valueA << 18) | (valueB << 12) | (valueC << 6) | valueD;
    bytes.push((chunk >> 16) & 0xff);
    if (c !== "=") {
      bytes.push((chunk >> 8) & 0xff);
    }
    if (d !== "=") {
      bytes.push(chunk & 0xff);
    }
  }

  return new Uint8Array(bytes);
}

function encodeBase64UrlUtf8(value: string): string {
  return encodeBase64(new TextEncoder().encode(value))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function decodeBase64UrlUtf8(value: string): string {
  const decoded = decodeBase64(value);
  return new TextDecoder().decode(decoded);
}

function hashDeterministic(seed: string): string {
  let hashA = 0x811c9dc5;
  let hashB = 0x811c9dc5;
  for (let index = 0; index < seed.length; index += 1) {
    const charCode = seed.charCodeAt(index);
    hashA ^= charCode;
    hashA = Math.imul(hashA, 0x01000193);
    hashB ^= charCode + ((index + 1) * 17);
    hashB = Math.imul(hashB, 0x01000193);
  }
  return `${normalizeHex32(hashA)}${normalizeHex32(hashB)}`;
}

function resolveVoiceRuntimeAttestationSecret(): string {
  return (
    normalizeString(process.env.VOICE_RUNTIME_ATTESTATION_SECRET) ??
    "voice_runtime_attestation_secret_dev_v1"
  );
}

function encodeAttestationPayload(
  payload: VoiceSessionOpenAttestationProofPayload,
): string {
  return encodeBase64UrlUtf8(JSON.stringify(payload));
}

function decodeAttestationPayload(
  encodedPayload: string,
): VoiceSessionOpenAttestationProofPayload | null {
  try {
    const raw = decodeBase64UrlUtf8(encodedPayload);
    const parsed = JSON.parse(raw) as VoiceSessionOpenAttestationProofPayload;
    if (parsed?.v !== "voice_session_open_attestation_proof_v1") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function signAttestationPayload(encodedPayload: string): string {
  const secret = resolveVoiceRuntimeAttestationSecret();
  return `sigv1_${hashDeterministic(`${secret}|${encodedPayload}`)}`;
}

function buildVoiceSessionOpenAttestationProofToken(
  payload: VoiceSessionOpenAttestationProofPayload,
): string {
  const encodedPayload = encodeAttestationPayload(payload);
  const signature = signAttestationPayload(encodedPayload);
  return `vrsat1.${encodedPayload}.${signature}`;
}

function verifyVoiceSessionOpenAttestationProofToken(args: {
  token?: string | null;
  nowMs: number;
  organizationId: string;
  userId: string;
  interviewSessionId: string;
  liveSessionId: string;
  sourceId: string;
  sourceClass: string;
  providerId: string;
  clientSurface: string;
}): { ok: boolean; reasonCodes: string[] } {
  const token = normalizeString(args.token);
  if (!token) {
    return { ok: false, reasonCodes: ["missing_attestation_proof_token"] };
  }
  const [version, encodedPayload, signature] = token.split(".", 3);
  if (version !== "vrsat1" || !encodedPayload || !signature) {
    return { ok: false, reasonCodes: ["malformed_attestation_proof_token"] };
  }
  const expectedSignature = signAttestationPayload(encodedPayload);
  if (signature !== expectedSignature) {
    return { ok: false, reasonCodes: ["invalid_attestation_proof_signature"] };
  }
  const payload = decodeAttestationPayload(encodedPayload);
  if (!payload) {
    return { ok: false, reasonCodes: ["invalid_attestation_proof_payload"] };
  }
  if (payload.exp <= args.nowMs) {
    return { ok: false, reasonCodes: ["attestation_proof_expired"] };
  }
  const matches =
    payload.org === String(args.organizationId) &&
    payload.user === String(args.userId) &&
    payload.interview === String(args.interviewSessionId) &&
    payload.live === String(args.liveSessionId) &&
    payload.sourceId === String(args.sourceId) &&
    payload.sourceClass === String(args.sourceClass) &&
    payload.providerId === String(args.providerId) &&
    payload.surface === String(args.clientSurface);
  if (!matches) {
    return { ok: false, reasonCodes: ["attestation_proof_context_mismatch"] };
  }
  return { ok: true, reasonCodes: [] };
}

export interface VoiceSessionOpenSecurityDecision {
  protectedPath: boolean;
  allowed: boolean;
  reasonCodes: string[];
  canonicalLiveSessionId?: string;
  sourceAttestation: {
    required: boolean;
    verified: boolean;
    reasonCodes: string[];
  };
  transportSessionAttestation: {
    required: boolean;
    verified: boolean;
    reasonCodes: string[];
  };
}

export function resolveVoiceSessionOpenSecurityDecision(args: {
  nowMs: number;
  clientSurface?: string | null;
  enforceSourceAttestation?: boolean;
  liveSessionId?: string | null;
  sourceMode?: string | null;
  voiceRuntime?: Record<string, unknown>;
  transportRuntime?: Record<string, unknown>;
  avObservability?: Record<string, unknown>;
}): VoiceSessionOpenSecurityDecision {
  const voiceRuntime = normalizeObject(args.voiceRuntime);
  const transportRuntime = normalizeObject(args.transportRuntime);
  const avObservability = normalizeObject(args.avObservability);
  const clientSurface = normalizeString(args.clientSurface) ?? "unknown_surface";
  const sourceMode = normalizeSourceClassToken(args.sourceMode);
  const sourceId = normalizeIdentityToken(voiceRuntime?.sourceId);
  const providerId = normalizeIdentityToken(voiceRuntime?.providerId);
  const voiceSourceClass = normalizeSourceClassToken(
    voiceRuntime?.sourceClass ?? voiceRuntime?.sourceId,
  );
  const sourceModeProtected = isProtectedSourceClass(sourceMode);
  const voiceSourceProtected = isProtectedSourceClass(voiceSourceClass);
  const metaSourceDetected =
    isMetaSourceClass(sourceMode) || isMetaSourceClass(voiceSourceClass);

  const observedLiveSessionIds = Array.from(
    new Set(
      [
        normalizeSessionToken(args.liveSessionId),
        normalizeSessionToken(voiceRuntime?.liveSessionId),
        normalizeSessionToken(transportRuntime?.liveSessionId),
        normalizeSessionToken(avObservability?.liveSessionId),
      ].filter((value): value is string => Boolean(value)),
    ),
  );
  const canonicalLiveSessionId = observedLiveSessionIds[0];
  const protectedPath =
    clientSurface === "mobile_api_v1" ||
    sourceModeProtected ||
    voiceSourceProtected ||
    observedLiveSessionIds.length > 0;
  const strictProtectedPath = clientSurface === "mobile_api_v1";
  const enforceSourceAttestation = args.enforceSourceAttestation !== false;

  const sourceAttestationMetadata: Record<string, unknown> = {
    liveSessionId: canonicalLiveSessionId,
    voiceRuntime,
  };
  const sourceAttestation = resolveMobileSourceAttestationContract({
    metadata: sourceAttestationMetadata,
    nowMs: args.nowMs,
  });
  const sourceAttestationRequired =
    protectedPath && sourceAttestation.verificationRequired && enforceSourceAttestation;
  const sourceAttestationVerified =
    !sourceAttestationRequired || sourceAttestation.verified === true;

  const transportReasonCodes = new Set<string>();
  const transportMode = normalizeString(
    transportRuntime?.transport ??
      transportRuntime?.mode ??
      voiceRuntime?.transport,
  )?.toLowerCase();
  if (observedLiveSessionIds.length > 1) {
    transportReasonCodes.add("live_session_id_mismatch");
  }
  if (metaSourceDetected && transportMode !== "webrtc") {
    transportReasonCodes.add("meta_transport_must_be_webrtc");
  }
  const providerToken = normalizeString(voiceRuntime?.providerId)?.toLowerCase();
  if (metaSourceDetected && (!providerToken || !providerToken.startsWith("meta_"))) {
    transportReasonCodes.add("meta_provider_contract_required");
  }
  const transportSessionAttestationRequired = protectedPath;
  const transportSessionAttestationVerified =
    !transportSessionAttestationRequired || transportReasonCodes.size === 0;

  const reasonCodes = new Set<string>();
  if (strictProtectedPath && !canonicalLiveSessionId) {
    reasonCodes.add("missing_live_session_id");
  }
  if (strictProtectedPath && (!sourceId || !voiceSourceClass || !providerId)) {
    reasonCodes.add("missing_source_runtime_identity");
  }
  if (sourceAttestationRequired && !sourceAttestationVerified) {
    reasonCodes.add("source_attestation_verification_failed");
    for (const reasonCode of sourceAttestation.reasonCodes) {
      reasonCodes.add(`source_attestation:${reasonCode}`);
    }
  }
  if (transportSessionAttestationRequired && !transportSessionAttestationVerified) {
    reasonCodes.add("transport_session_attestation_verification_failed");
    for (const reasonCode of transportReasonCodes) {
      reasonCodes.add(`transport_session_attestation:${reasonCode}`);
    }
  }

  return {
    protectedPath,
    allowed: reasonCodes.size === 0,
    reasonCodes: Array.from(reasonCodes).sort(),
    canonicalLiveSessionId,
    sourceAttestation: {
      required: sourceAttestationRequired,
      verified: sourceAttestationVerified,
      reasonCodes: sourceAttestation.reasonCodes,
    },
    transportSessionAttestation: {
      required: transportSessionAttestationRequired,
      verified: transportSessionAttestationVerified,
      reasonCodes: Array.from(transportReasonCodes).sort(),
    },
  };
}

export function resolveVoiceSessionOpenRateLimitProfileFromTier(planTier?: string): {
  windowMs: number;
  maxRequests: number;
} {
  const normalizedTier = normalizeString(planTier)?.toLowerCase() ?? "free";
  switch (normalizedTier) {
    case "enterprise":
      return { windowMs: 60 * 1000, maxRequests: 20 };
    case "agency":
      return { windowMs: 60 * 1000, maxRequests: 12 };
    case "professional":
    case "pro":
    case "starter":
      return { windowMs: 60 * 1000, maxRequests: 8 };
    case "free":
    default:
      return { windowMs: 60 * 1000, maxRequests: 4 };
  }
}

interface VoiceSessionOpenRateLimitWindowState {
  windowStartMs: number;
  openCount: number;
}

export function resolveVoiceSessionOpenRateLimitDecision(args: {
  nowMs: number;
  windowMs?: number;
  maxRequests?: number;
  state?: VoiceSessionOpenRateLimitWindowState | null;
}): {
  allowed: boolean;
  retryAfterMs: number;
  nextState: VoiceSessionOpenRateLimitWindowState;
} {
  const windowMs = args.windowMs ?? VOICE_SESSION_OPEN_RATE_LIMIT_WINDOW_MS;
  const maxRequests = args.maxRequests ?? VOICE_SESSION_OPEN_RATE_LIMIT_MAX_REQUESTS;
  const activeState =
    args.state &&
    args.nowMs - args.state.windowStartMs < windowMs &&
    args.nowMs >= args.state.windowStartMs
      ? args.state
      : {
          windowStartMs: args.nowMs,
          openCount: 0,
        };
  const nextCount = activeState.openCount + 1;
  const windowEndMs = activeState.windowStartMs + windowMs;
  if (nextCount > maxRequests) {
    return {
      allowed: false,
      retryAfterMs: Math.max(0, windowEndMs - args.nowMs),
      nextState: {
        windowStartMs: activeState.windowStartMs,
        openCount: activeState.openCount,
      },
    };
  }
  return {
    allowed: true,
    retryAfterMs: 0,
    nextState: {
      windowStartMs: activeState.windowStartMs,
      openCount: nextCount,
    },
  };
}

function decodeBase64Audio(payload: string): Uint8Array {
  const base64Payload = payload.includes(",")
    ? payload.split(",", 2)[1] ?? ""
    : payload;
  return decodeBase64(base64Payload);
}

function parsePcmL16ContractFromMimeType(
  mimeType: string,
): { sampleRateHz: number; channels: number } | null {
  const normalized = mimeType.trim().toLowerCase();
  if (!normalized.startsWith("audio/l16")) {
    return null;
  }
  const sampleRateMatch = normalized.match(/(?:^|[;,\s])rate=(\d+)/);
  const channelsMatch = normalized.match(/(?:^|[;,\s])channels=(\d+)/);
  const sampleRateHz = sampleRateMatch
    ? Math.max(8000, Math.floor(Number(sampleRateMatch[1] ?? "24000")))
    : 24_000;
  const channels = channelsMatch
    ? Math.max(1, Math.floor(Number(channelsMatch[1] ?? "1")))
    : 1;
  if (!Number.isFinite(sampleRateHz) || !Number.isFinite(channels)) {
    return null;
  }
  return { sampleRateHz, channels };
}

function encodePcm16MonoWav(args: {
  audioBytes: Uint8Array;
  sampleRateHz: number;
}): Uint8Array {
  const dataByteLength = Math.max(0, args.audioBytes.byteLength);
  const bytesPerSample = 2;
  const channels = 1;
  const blockAlign = channels * bytesPerSample;
  const byteRate = args.sampleRateHz * blockAlign;
  const wavBuffer = new ArrayBuffer(44 + dataByteLength);
  const view = new DataView(wavBuffer);
  const wavBytes = new Uint8Array(wavBuffer);

  const writeAscii = (offset: number, text: string) => {
    for (let index = 0; index < text.length; index += 1) {
      view.setUint8(offset + index, text.charCodeAt(index));
    }
  };

  writeAscii(0, "RIFF");
  view.setUint32(4, 36 + dataByteLength, true);
  writeAscii(8, "WAVE");
  writeAscii(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, args.sampleRateHz, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeAscii(36, "data");
  view.setUint32(40, dataByteLength, true);
  wavBytes.set(args.audioBytes, 44);
  return wavBytes;
}

function normalizeRealtimeTranscriptionInput(args: {
  audioBytes: Uint8Array;
  mimeType: string;
}): {
  audioBytes: Uint8Array;
  mimeType: string;
  transcodedFromPcmL16: boolean;
} {
  const pcmContract = parsePcmL16ContractFromMimeType(args.mimeType);
  if (!pcmContract || pcmContract.channels !== 1) {
    return {
      audioBytes: args.audioBytes,
      mimeType: args.mimeType,
      transcodedFromPcmL16: false,
    };
  }
  if (args.audioBytes.byteLength === 0 || args.audioBytes.byteLength % 2 !== 0) {
    return {
      audioBytes: args.audioBytes,
      mimeType: args.mimeType,
      transcodedFromPcmL16: false,
    };
  }
  return {
    audioBytes: encodePcm16MonoWav({
      audioBytes: args.audioBytes,
      sampleRateHz: pcmContract.sampleRateHz,
    }),
    mimeType: "audio/wav",
    transcodedFromPcmL16: true,
  };
}

const FIXED_PCM_SAMPLE_RATE_HZ = 24_000;
const FIXED_PCM_FRAME_DURATION_MS = 20;
const FIXED_PCM_FRAME_BYTES = 960;

function hasFixedPcmCaptureContract(args: {
  pcm?: VoiceTransportEnvelopeContract["pcm"];
  decodedAudioBytes: Uint8Array;
}): boolean {
  const pcm = args.pcm;
  if (!pcm) {
    return false;
  }
  return (
    pcm.encoding === "pcm_s16le"
    && pcm.sampleRateHz === FIXED_PCM_SAMPLE_RATE_HZ
    && pcm.channels === 1
    && pcm.frameDurationMs === FIXED_PCM_FRAME_DURATION_MS
    && args.decodedAudioBytes.byteLength === FIXED_PCM_FRAME_BYTES
  );
}

export const VOICE_TRANSPORT_WEBSOCKET_INGEST_PHASE_ID =
  "voice_transport_websocket_ingest_v1" as const;
export const VIDEO_TRANSPORT_FRAME_INGEST_PHASE_ID =
  "video_transport_frame_ingest_v1" as const;
const VIDEO_TRANSPORT_RATE_LIMIT_WINDOW_MS = 60 * 1000;
const VIDEO_TRANSPORT_MAX_FRAMES_PER_WINDOW = 1_800;
const VIDEO_TRANSPORT_SEQUENCE_WINDOW_LIMIT = 1_024;

type VoiceTransportSequenceDecision =
  | "accepted"
  | "duplicate_replay"
  | "gap_detected";

export const VOICE_RELAY_QOS_CONTRACT_VERSION =
  "voice_relay_qos_v1" as const;
export const VOICE_RELAY_HEARTBEAT_CONTRACT_VERSION =
  "voice_relay_heartbeat_v1" as const;

export type VoiceRelayHeartbeatStatus =
  | "acknowledged"
  | "missing";

export type VoiceRelayQosReasonCode =
  | "relay_healthy"
  | "relay_gap_detected"
  | "relay_duplicate_replay"
  | "relay_error";

export interface VoiceRelayQosSnapshot {
  contractVersion: typeof VOICE_RELAY_QOS_CONTRACT_VERSION;
  observedAtMs: number;
  healthy: boolean;
  reasonCode: VoiceRelayQosReasonCode;
  heartbeat: {
    contractVersion: typeof VOICE_RELAY_HEARTBEAT_CONTRACT_VERSION;
    status: VoiceRelayHeartbeatStatus;
    expectedSequence: number;
    ackSequence?: number;
    acknowledgedAtMs?: number;
  };
  qos: {
    orderingDecision: VoiceTransportSequenceDecision;
    relayEventCount: number;
    idempotentReplay: boolean;
    persistedFinalTranscript: boolean;
  };
}

export function resolveVoiceRelayQosSnapshot(args: {
  nowMs: number;
  sequence: number;
  expectedSequence: number;
  sequenceDecision: VoiceTransportSequenceDecision;
  idempotentReplay: boolean;
  relayEventCount: number;
  relayErrorMessage?: string | null;
  persistedFinalTranscript: boolean;
  lastAcceptedSequence: number | null;
}): VoiceRelayQosSnapshot {
  const normalizedNowMs = Math.max(0, Math.floor(args.nowMs));
  const normalizedSequence = Math.max(0, Math.floor(args.sequence));
  const normalizedExpectedSequence = Math.max(
    0,
    Math.floor(args.expectedSequence),
  );
  const normalizedRelayEventCount = Math.max(
    0,
    Math.floor(args.relayEventCount),
  );
  const relayErrorMessage = normalizeString(args.relayErrorMessage);

  let reasonCode: VoiceRelayQosReasonCode = "relay_healthy";
  if (args.sequenceDecision === "gap_detected") {
    reasonCode = "relay_gap_detected";
  } else if (
    args.sequenceDecision === "duplicate_replay"
    || args.idempotentReplay
  ) {
    reasonCode = "relay_duplicate_replay";
  }
  if (relayErrorMessage) {
    reasonCode = "relay_error";
  }

  const heartbeatStatus: VoiceRelayHeartbeatStatus =
    args.sequenceDecision === "gap_detected"
      ? "missing"
      : "acknowledged";

  const ackSequence = heartbeatStatus === "acknowledged"
    ? normalizedSequence
    : typeof args.lastAcceptedSequence === "number"
      ? Math.max(0, Math.floor(args.lastAcceptedSequence))
      : undefined;

  return {
    contractVersion: VOICE_RELAY_QOS_CONTRACT_VERSION,
    observedAtMs: normalizedNowMs,
    healthy: reasonCode === "relay_healthy" || reasonCode === "relay_duplicate_replay",
    reasonCode,
    heartbeat: {
      contractVersion: VOICE_RELAY_HEARTBEAT_CONTRACT_VERSION,
      status: heartbeatStatus,
      expectedSequence: normalizedExpectedSequence,
      ackSequence,
      acknowledgedAtMs:
        heartbeatStatus === "acknowledged" ? normalizedNowMs : undefined,
    },
    qos: {
      orderingDecision: args.sequenceDecision,
      relayEventCount: normalizedRelayEventCount,
      idempotentReplay: args.idempotentReplay,
      persistedFinalTranscript: args.persistedFinalTranscript,
    },
  };
}

interface VoiceTransportAcceptedReplaySnapshot {
  relayEvents: VoiceTransportEnvelopeContract[];
}

interface VoiceTransportIngestCheckpointState {
  acceptedSequences: Set<number>;
  acceptedReplaysBySequence: Map<number, VoiceTransportAcceptedReplaySnapshot>;
  lastAcceptedSequence: number | null;
}

interface VoiceTransportIngestCheckpointSnapshot {
  acceptedSequences: number[];
  acceptedReplayEventsBySequence: Record<string, VoiceTransportEnvelopeContract[]>;
  lastAcceptedSequence: number | null;
}

const VOICE_TRANSPORT_SEQUENCE_WINDOW_LIMIT = 256;

interface ResolveVoiceTransportSequenceDecisionArgs {
  sequence: number;
  acceptedSequences: ReadonlySet<number>;
  lastAcceptedSequence: number | null;
}

interface ResolveVoiceTransportSequenceDecisionResult {
  decision: VoiceTransportSequenceDecision;
  expectedSequence: number;
}

export function resolveVoiceTransportSequenceDecision(
  args: ResolveVoiceTransportSequenceDecisionArgs,
): ResolveVoiceTransportSequenceDecisionResult {
  const expectedSequence =
    typeof args.lastAcceptedSequence === "number"
      ? args.lastAcceptedSequence + 1
      : 0;
  if (args.acceptedSequences.has(args.sequence)) {
    return {
      decision: "duplicate_replay",
      expectedSequence,
    };
  }
  if (args.sequence < expectedSequence) {
    return {
      decision: "duplicate_replay",
      expectedSequence,
    };
  }
  if (args.sequence > expectedSequence) {
    return {
      decision: "gap_detected",
      expectedSequence,
    };
  }
  return {
    decision: "accepted",
    expectedSequence,
  };
}

interface ResolveVideoTransportFrameRateDecisionArgs {
  nowMs: number;
  windowMs?: number;
  maxFramesPerWindow?: number;
  state?: {
    windowStartMs: number;
    frameCountInWindow: number;
  } | null;
}

interface ResolveVideoTransportFrameRateDecisionResult {
  allowed: boolean;
  retryAfterMs: number;
  windowStartMs: number;
  nextFrameCount: number;
}

export function resolveVideoTransportFrameRateDecision(
  args: ResolveVideoTransportFrameRateDecisionArgs,
): ResolveVideoTransportFrameRateDecisionResult {
  const windowMs =
    typeof args.windowMs === "number" && Number.isFinite(args.windowMs) && args.windowMs > 0
      ? Math.floor(args.windowMs)
      : VIDEO_TRANSPORT_RATE_LIMIT_WINDOW_MS;
  const maxFramesPerWindow =
    typeof args.maxFramesPerWindow === "number" &&
    Number.isFinite(args.maxFramesPerWindow) &&
    args.maxFramesPerWindow > 0
      ? Math.floor(args.maxFramesPerWindow)
      : VIDEO_TRANSPORT_MAX_FRAMES_PER_WINDOW;
  const previousWindowStart =
    args.state &&
    Number.isFinite(args.state.windowStartMs) &&
    args.state.windowStartMs >= 0
      ? Math.floor(args.state.windowStartMs)
      : args.nowMs;
  const previousFrameCount =
    args.state &&
    Number.isFinite(args.state.frameCountInWindow) &&
    args.state.frameCountInWindow >= 0
      ? Math.floor(args.state.frameCountInWindow)
      : 0;

  const windowExpired = args.nowMs >= previousWindowStart + windowMs;
  const windowStartMs = windowExpired ? args.nowMs : previousWindowStart;
  const activeFrameCount = windowExpired ? 0 : previousFrameCount;
  if (activeFrameCount >= maxFramesPerWindow) {
    return {
      allowed: false,
      retryAfterMs: Math.max(0, windowStartMs + windowMs - args.nowMs),
      windowStartMs,
      nextFrameCount: activeFrameCount,
    };
  }
  return {
    allowed: true,
    retryAfterMs: 0,
    windowStartMs,
    nextFrameCount: activeFrameCount + 1,
  };
}

function asVoiceTransportEnvelopeArray(
  value: unknown,
): VoiceTransportEnvelopeContract[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const envelopes: VoiceTransportEnvelopeContract[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") {
      continue;
    }
    try {
      assertVoiceTransportEnvelope(entry as VoiceTransportEnvelopeContract);
      envelopes.push(entry as VoiceTransportEnvelopeContract);
    } catch {
      continue;
    }
  }
  return envelopes;
}

function extractVoiceTransportIngestCheckpointStateFromEvents(args: {
  events: Array<{ payload?: Record<string, unknown> }>;
  organizationId: Id<"organizations">;
  interviewSessionId: Id<"agentSessions">;
  voiceSessionId: string;
}): VoiceTransportIngestCheckpointState {
  const acceptedSequences = new Set<number>();
  const acceptedReplaysBySequence = new Map<
    number,
    VoiceTransportAcceptedReplaySnapshot
  >();
  let lastAcceptedSequence: number | null = null;

  for (const event of args.events) {
    const payload =
      event && typeof event.payload === "object" && event.payload !== null
        ? (event.payload as Record<string, unknown>)
        : null;
    if (!payload) {
      continue;
    }
    if (normalizeString(payload.org_id) !== String(args.organizationId)) {
      continue;
    }
    if (normalizeString(payload.session_id) !== String(args.interviewSessionId)) {
      continue;
    }
    if (
      normalizeString(payload.voice_session_id) !==
      normalizeString(args.voiceSessionId)
    ) {
      continue;
    }
    if (
      normalizeString(payload.adaptive_phase_id) !==
      VOICE_TRANSPORT_WEBSOCKET_INGEST_PHASE_ID
    ) {
      continue;
    }
    const sequence = Number(
      (payload as Record<string, unknown>).voice_transport_sequence,
    );
    if (!Number.isInteger(sequence) || sequence < 0) {
      continue;
    }
    const orderingDecision = normalizeString(
      (payload as Record<string, unknown>).voice_transport_ordering_decision,
    );
    if (orderingDecision !== "accepted") {
      continue;
    }
    acceptedSequences.add(sequence);
    if (lastAcceptedSequence === null || sequence > lastAcceptedSequence) {
      lastAcceptedSequence = sequence;
    }
    if (!acceptedReplaysBySequence.has(sequence)) {
      acceptedReplaysBySequence.set(sequence, {
        relayEvents: asVoiceTransportEnvelopeArray(
          (payload as Record<string, unknown>).voice_transport_relay_events,
        ),
      });
    }
  }

  return {
    acceptedSequences,
    acceptedReplaysBySequence,
    lastAcceptedSequence,
  };
}

function serializeVoiceTransportIngestCheckpointState(
  state: VoiceTransportIngestCheckpointState,
): VoiceTransportIngestCheckpointSnapshot {
  const acceptedReplayEventsBySequence: Record<
    string,
    VoiceTransportEnvelopeContract[]
  > = {};
  for (const [sequence, snapshot] of state.acceptedReplaysBySequence.entries()) {
    acceptedReplayEventsBySequence[String(sequence)] = snapshot.relayEvents;
  }
  return {
    acceptedSequences: Array.from(state.acceptedSequences.values()).sort(
      (left, right) => left - right,
    ),
    acceptedReplayEventsBySequence,
    lastAcceptedSequence: state.lastAcceptedSequence,
  };
}

function mergeVoiceTransportAcceptedSequenceWindow(args: {
  previous: number[];
  nextAcceptedSequence: number;
  windowLimit?: number;
}): number[] {
  const next = new Set<number>();
  for (const sequence of args.previous) {
    if (Number.isInteger(sequence) && sequence >= 0) {
      next.add(sequence);
    }
  }
  next.add(args.nextAcceptedSequence);
  const ordered = Array.from(next.values()).sort((left, right) => left - right);
  const windowLimit = args.windowLimit ?? VOICE_TRANSPORT_SEQUENCE_WINDOW_LIMIT;
  return ordered.slice(Math.max(0, ordered.length - windowLimit));
}

function trimVoiceTransportRelayEventsBySequence(args: {
  relayEventsBySequence: Record<string, VoiceTransportEnvelopeContract[]>;
  acceptedSequenceWindow: number[];
}): Record<string, VoiceTransportEnvelopeContract[]> {
  const allowedSequenceSet = new Set(
    args.acceptedSequenceWindow.map((sequence) => String(sequence)),
  );
  const trimmed: Record<string, VoiceTransportEnvelopeContract[]> = {};
  for (const [sequence, relayEvents] of Object.entries(args.relayEventsBySequence)) {
    if (!allowedSequenceSet.has(sequence)) {
      continue;
    }
    trimmed[sequence] = relayEvents;
  }
  return trimmed;
}

type WebChatVisionFrameBufferMediaType = "video_frame" | "video_keyframe";

interface WebChatVisionFrameBufferEntry {
  retentionId: Id<"operatorMediaRetention">;
  capturedAt: number;
  mediaType: WebChatVisionFrameBufferMediaType;
  mimeType: string;
  sizeBytes: number;
  storageId: Id<"_storage">;
  videoSessionId?: string;
  sourceSequence?: number;
  ttlExpiresAt: number;
  idempotencyKey: string;
  insertedAt: number;
}

interface WebChatVisionFrameBufferSnapshot {
  contractVersion: typeof WEB_CHAT_VISION_FRAME_BUFFER_CONTRACT_VERSION;
  maxFrames: number;
  idempotencyWindowLimit: number;
  entries: WebChatVisionFrameBufferEntry[];
  idempotencyWindow: string[];
}

function normalizeVisionFrameSourceSequence(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return -1;
  }
  return Math.max(0, Math.floor(value));
}

function compareVisionFrameBufferEntriesDesc(
  left: WebChatVisionFrameBufferEntry,
  right: WebChatVisionFrameBufferEntry,
): number {
  const capturedAtDelta = Math.floor(right.capturedAt) - Math.floor(left.capturedAt);
  if (capturedAtDelta !== 0) {
    return capturedAtDelta;
  }
  const sequenceDelta =
    normalizeVisionFrameSourceSequence(right.sourceSequence)
    - normalizeVisionFrameSourceSequence(left.sourceSequence);
  if (sequenceDelta !== 0) {
    return sequenceDelta;
  }
  return String(right.retentionId).localeCompare(String(left.retentionId));
}

function compareWebChatVisionFrameCandidatesDesc(
  left: WebChatVisionFrameCandidate,
  right: WebChatVisionFrameCandidate,
): number {
  const capturedAtDelta = Math.floor(right.capturedAt) - Math.floor(left.capturedAt);
  if (capturedAtDelta !== 0) {
    return capturedAtDelta;
  }
  const sequenceDelta =
    normalizeVisionFrameSourceSequence(right.sourceSequence)
    - normalizeVisionFrameSourceSequence(left.sourceSequence);
  if (sequenceDelta !== 0) {
    return sequenceDelta;
  }
  return String(right.retentionId).localeCompare(String(left.retentionId));
}

function sanitizeVisionFrameBufferEntries(args: {
  entries: WebChatVisionFrameBufferEntry[];
  nowMs: number;
}): WebChatVisionFrameBufferEntry[] {
  return args.entries
    .filter((entry) =>
      typeof entry.capturedAt === "number" &&
      Number.isFinite(entry.capturedAt) &&
      entry.capturedAt > 0 &&
      typeof entry.sizeBytes === "number" &&
      Number.isFinite(entry.sizeBytes) &&
      entry.sizeBytes > 0 &&
      typeof entry.ttlExpiresAt === "number" &&
      Number.isFinite(entry.ttlExpiresAt) &&
      entry.ttlExpiresAt > args.nowMs &&
      typeof entry.idempotencyKey === "string" &&
      entry.idempotencyKey.trim().length > 0 &&
      typeof entry.mimeType === "string" &&
      entry.mimeType.toLowerCase().startsWith("image/")
    )
    .sort(compareVisionFrameBufferEntriesDesc);
}

function toVisionFrameBufferWebChatCandidates(args: {
  entries: WebChatVisionFrameBufferEntry[];
  liveSessionId: string;
}): WebChatVisionFrameCandidate[] {
  return args.entries.map((entry) => ({
    retentionId: entry.retentionId,
    capturedAt: Math.floor(entry.capturedAt),
    mediaType: entry.mediaType,
    mimeType: entry.mimeType,
    sizeBytes: Math.max(0, Math.floor(entry.sizeBytes)),
    storageId: entry.storageId,
    liveSessionId: args.liveSessionId,
    videoSessionId: entry.videoSessionId,
    sourceSequence:
      typeof entry.sourceSequence === "number" && Number.isFinite(entry.sourceSequence)
        ? Math.floor(entry.sourceSequence)
        : undefined,
  }));
}

export function resolveBrowserFallbackTranscriptText(args: {
  eventType: VoiceTransportEnvelopeContract["eventType"];
  transcriptText?: string;
}): string | null {
  if (args.eventType !== "audio_chunk") {
    return null;
  }
  return sanitizeTranscriptForVoiceTurn(args.transcriptText);
}

function resolveVoiceEnvelopeRetainedMediaType(
  eventType: VoiceTransportEnvelopeContract["eventType"],
): OperatorRetainedMediaType | null {
  switch (eventType) {
    case "audio_chunk":
      return "audio_chunk";
    case "assistant_audio_chunk":
      return "assistant_audio_chunk";
    default:
      return null;
  }
}

function resolveVideoEnvelopeRetainedMediaType(args: {
  keyframeHint?: unknown;
}): OperatorRetainedMediaType {
  return args.keyframeHint === true ? "video_keyframe" : "video_frame";
}

export type DesktopTranscriptForwardingEventType =
  | "partial_transcript"
  | "final_transcript";

export type DesktopTranscriptForwardingRejectReason =
  | "missing_live_session_id"
  | "missing_voice_session_id"
  | "missing_transcript"
  | "invalid_transcript_event";

export interface DesktopTranscriptForwardingEnvelope {
  liveSessionId: string;
  voiceRuntime: Record<string, unknown>;
  transcriptText: string;
  transcriptEvent: DesktopTranscriptForwardingEventType;
}

export interface DesktopTranscriptForwardingEnvelopeResolution {
  accepted: boolean;
  reason: "accepted" | DesktopTranscriptForwardingRejectReason;
  envelope: DesktopTranscriptForwardingEnvelope | null;
}

export function resolveDesktopTranscriptForwardingEnvelope(args: {
  liveSessionId?: string | null;
  voiceRuntime?: Record<string, unknown> | null;
  transcriptText?: string | null;
  transcriptEvent?: string | null;
}): DesktopTranscriptForwardingEnvelopeResolution {
  const liveSessionId = normalizeSessionToken(args.liveSessionId);
  if (!liveSessionId) {
    return {
      accepted: false,
      reason: "missing_live_session_id",
      envelope: null,
    };
  }

  const voiceRuntime = normalizeObject(args.voiceRuntime);
  const voiceSessionId = normalizeSessionToken(voiceRuntime?.voiceSessionId);
  if (!voiceSessionId) {
    return {
      accepted: false,
      reason: "missing_voice_session_id",
      envelope: null,
    };
  }

  const transcriptText = sanitizeTranscriptForVoiceTurn(args.transcriptText);
  if (!transcriptText) {
    return {
      accepted: false,
      reason: "missing_transcript",
      envelope: null,
    };
  }

  const transcriptEvent = normalizeDesktopTranscriptEventType(args.transcriptEvent);
  if (!transcriptEvent) {
    return {
      accepted: false,
      reason: "invalid_transcript_event",
      envelope: null,
    };
  }

  const normalizedVoiceRuntime: Record<string, unknown> = {
    ...voiceRuntime,
    liveSessionId,
    voiceSessionId,
    transcript: transcriptText,
    transcriptEvent,
  };

  return {
    accepted: true,
    reason: "accepted",
    envelope: {
      liveSessionId,
      transcriptText,
      transcriptEvent,
      voiceRuntime: normalizedVoiceRuntime,
    },
  };
}

function normalizeDesktopTranscriptEventType(
  value: string | null | undefined,
): DesktopTranscriptForwardingEventType | null {
  const normalized = normalizeString(value)?.toLowerCase();
  if (!normalized) {
    return null;
  }
  if (normalized === "partial_transcript" || normalized === "final_transcript") {
    return normalized;
  }
  return null;
}

export interface VoiceAssistantStreamRelayState {
  activeAssistantMessageId: string | null;
  finalizedAssistantMessageIds: string[];
  cancelledAssistantMessageIds: string[];
}

function toSortedSequenceKeys(
  relayEventsBySequence: Record<string, VoiceTransportEnvelopeContract[]>,
): number[] {
  return Object.keys(relayEventsBySequence)
    .map((key) => Number(key))
    .filter((sequence) => Number.isInteger(sequence) && sequence >= 0)
    .sort((left, right) => left - right);
}

export function resolveVoiceAssistantStreamRelayState(args: {
  relayEventsBySequence: Record<string, VoiceTransportEnvelopeContract[]>;
}): VoiceAssistantStreamRelayState {
  const finalized = new Set<string>();
  const cancelled = new Set<string>();
  let activeAssistantMessageId: string | null = null;

  for (const sequence of toSortedSequenceKeys(args.relayEventsBySequence)) {
    const relayEvents = args.relayEventsBySequence[String(sequence)] ?? [];
    for (const relayEvent of relayEvents) {
      if (relayEvent.eventType === "assistant_audio_chunk") {
        const assistantMessageId = normalizeString(relayEvent.assistantMessageId);
        if (!assistantMessageId) {
          continue;
        }
        if (finalized.has(assistantMessageId) || cancelled.has(assistantMessageId)) {
          continue;
        }
        activeAssistantMessageId = assistantMessageId;
        continue;
      }
      if (relayEvent.eventType === "assistant_audio_final") {
        const assistantMessageId = normalizeString(relayEvent.assistantMessageId);
        if (!assistantMessageId) {
          continue;
        }
        finalized.add(assistantMessageId);
        if (activeAssistantMessageId === assistantMessageId) {
          activeAssistantMessageId = null;
        }
        continue;
      }
      if (relayEvent.eventType === "barge_in" && activeAssistantMessageId) {
        cancelled.add(activeAssistantMessageId);
        finalized.add(activeAssistantMessageId);
        activeAssistantMessageId = null;
      }
    }
  }

  return {
    activeAssistantMessageId,
    finalizedAssistantMessageIds: Array.from(finalized.values()).sort(),
    cancelledAssistantMessageIds: Array.from(cancelled.values()).sort(),
  };
}

function buildVoiceTransportAssistantAudioFinalEnvelope(args: {
  sourceEnvelope: VoiceTransportEnvelopeContract;
  assistantMessageId: string;
}): VoiceTransportEnvelopeContract {
  return {
    contractVersion: VOICE_TRANSPORT_ENVELOPE_CONTRACT_VERSION,
    transportMode: args.sourceEnvelope.transportMode,
    eventType: "assistant_audio_final",
    liveSessionId: args.sourceEnvelope.liveSessionId,
    voiceSessionId: args.sourceEnvelope.voiceSessionId,
    interviewSessionId: args.sourceEnvelope.interviewSessionId,
    sequence: args.sourceEnvelope.sequence,
    previousSequence: args.sourceEnvelope.previousSequence,
    timestampMs: Date.now(),
    assistantMessageId: args.assistantMessageId,
  };
}

interface ResolveVoiceAssistantRelayArgs {
  sourceEnvelope: VoiceTransportEnvelopeContract;
  relayEventsBySequence: Record<string, VoiceTransportEnvelopeContract[]>;
}

interface ResolveVoiceAssistantRelayResult {
  relayEvents: VoiceTransportEnvelopeContract[];
  relayErrorMessage: string | null;
  cancellationAssistantMessageId: string | null;
}

export type VoiceRealtimeTurnOrchestrationReason =
  | "final_transcript_eou"
  | "waiting_for_eou"
  | "sequence_not_accepted"
  | "idempotent_replay"
  | "empty_transcript"
  | "transcript_not_persisted"
  | "barge_in_interrupt";

export interface VoiceRealtimeTurnOrchestrationDecision {
  shouldTriggerAssistantTurn: boolean;
  interrupted: boolean;
  reason: VoiceRealtimeTurnOrchestrationReason;
  transcriptText: string | null;
}

export function resolveVoiceRealtimeTurnOrchestrationDecision(args: {
  sequenceDecision: VoiceTransportSequenceDecision;
  eventType: VoiceTransportEnvelopeContract["eventType"];
  transcriptText?: string;
  idempotentReplay?: boolean;
  persistedFinalTranscript?: boolean;
}): VoiceRealtimeTurnOrchestrationDecision {
  if (args.sequenceDecision !== "accepted") {
    return {
      shouldTriggerAssistantTurn: false,
      interrupted: false,
      reason: "sequence_not_accepted",
      transcriptText: null,
    };
  }
  if (args.idempotentReplay) {
    return {
      shouldTriggerAssistantTurn: false,
      interrupted: false,
      reason: "idempotent_replay",
      transcriptText: null,
    };
  }
  if (args.eventType === "barge_in") {
    return {
      shouldTriggerAssistantTurn: false,
      interrupted: true,
      reason: "barge_in_interrupt",
      transcriptText: null,
    };
  }
  if (args.eventType !== "final_transcript") {
    return {
      shouldTriggerAssistantTurn: false,
      interrupted: false,
      reason: "waiting_for_eou",
      transcriptText: null,
    };
  }
  const transcriptText = normalizeString(args.transcriptText) ?? null;
  if (!transcriptText) {
    return {
      shouldTriggerAssistantTurn: false,
      interrupted: false,
      reason: "empty_transcript",
      transcriptText: null,
    };
  }
  if (!args.persistedFinalTranscript) {
    return {
      shouldTriggerAssistantTurn: false,
      interrupted: false,
      reason: "transcript_not_persisted",
      transcriptText,
    };
  }
  return {
    shouldTriggerAssistantTurn: true,
    interrupted: false,
    reason: "final_transcript_eou",
    transcriptText,
  };
}

export function resolveVoiceAssistantRelay(args: ResolveVoiceAssistantRelayArgs): ResolveVoiceAssistantRelayResult {
  const sourceEnvelope = args.sourceEnvelope;
  const streamState = resolveVoiceAssistantStreamRelayState({
    relayEventsBySequence: args.relayEventsBySequence,
  });
  const finalizedIds = new Set(streamState.finalizedAssistantMessageIds);
  const cancelledIds = new Set(streamState.cancelledAssistantMessageIds);

  if (sourceEnvelope.eventType === "assistant_audio_chunk") {
    const assistantMessageId = normalizeString(sourceEnvelope.assistantMessageId);
    if (!assistantMessageId) {
      return {
        relayEvents: [
          buildVoiceTransportErrorEnvelope({
            sourceEnvelope,
            code: "vt_upstream_provider_error",
            message:
              "Assistant audio chunk relay requires assistantMessageId.",
            retryable: false,
          }),
        ],
        relayErrorMessage: "assistant_audio_chunk_missing_message_id",
        cancellationAssistantMessageId: null,
      };
    }
    if (finalizedIds.has(assistantMessageId) || cancelledIds.has(assistantMessageId)) {
      return {
        relayEvents: [],
        relayErrorMessage: null,
        cancellationAssistantMessageId: null,
      };
    }
    if (
      streamState.activeAssistantMessageId &&
      streamState.activeAssistantMessageId !== assistantMessageId
    ) {
      return {
        relayEvents: [
          buildVoiceTransportAssistantAudioFinalEnvelope({
            sourceEnvelope,
            assistantMessageId: streamState.activeAssistantMessageId,
          }),
          sourceEnvelope,
        ],
        relayErrorMessage: null,
        cancellationAssistantMessageId: streamState.activeAssistantMessageId,
      };
    }
    return {
      relayEvents: [sourceEnvelope],
      relayErrorMessage: null,
      cancellationAssistantMessageId: null,
    };
  }

  if (sourceEnvelope.eventType === "assistant_audio_final") {
    const assistantMessageId = normalizeString(sourceEnvelope.assistantMessageId);
    if (!assistantMessageId) {
      return {
        relayEvents: [
          buildVoiceTransportErrorEnvelope({
            sourceEnvelope,
            code: "vt_upstream_provider_error",
            message:
              "Assistant audio final relay requires assistantMessageId.",
            retryable: false,
          }),
        ],
        relayErrorMessage: "assistant_audio_final_missing_message_id",
        cancellationAssistantMessageId: null,
      };
    }
    if (finalizedIds.has(assistantMessageId) || cancelledIds.has(assistantMessageId)) {
      return {
        relayEvents: [],
        relayErrorMessage: null,
        cancellationAssistantMessageId: null,
      };
    }
    if (
      streamState.activeAssistantMessageId &&
      streamState.activeAssistantMessageId !== assistantMessageId
    ) {
      return {
        relayEvents: [
          buildVoiceTransportAssistantAudioFinalEnvelope({
            sourceEnvelope,
            assistantMessageId: streamState.activeAssistantMessageId,
          }),
          sourceEnvelope,
        ],
        relayErrorMessage: null,
        cancellationAssistantMessageId: streamState.activeAssistantMessageId,
      };
    }
    return {
      relayEvents: [sourceEnvelope],
      relayErrorMessage: null,
      cancellationAssistantMessageId: null,
    };
  }

  if (sourceEnvelope.eventType === "barge_in") {
    if (!streamState.activeAssistantMessageId) {
      return {
        relayEvents: [sourceEnvelope],
        relayErrorMessage: null,
        cancellationAssistantMessageId: null,
      };
    }
    return {
      relayEvents: [
        sourceEnvelope,
        buildVoiceTransportAssistantAudioFinalEnvelope({
          sourceEnvelope,
          assistantMessageId: streamState.activeAssistantMessageId,
        }),
      ],
      relayErrorMessage: null,
      cancellationAssistantMessageId: streamState.activeAssistantMessageId,
    };
  }

  return {
    relayEvents: [sourceEnvelope],
    relayErrorMessage: null,
    cancellationAssistantMessageId: null,
  };
}

function buildVoiceTransportErrorEnvelope(args: {
  sourceEnvelope: VoiceTransportEnvelopeContract;
  code:
    | "vt_sequence_gap_detected"
    | "vt_sequence_replay_detected"
    | "vt_upstream_provider_error";
  message: string;
  retryable: boolean;
}): VoiceTransportEnvelopeContract {
  return {
    contractVersion: VOICE_TRANSPORT_ENVELOPE_CONTRACT_VERSION,
    transportMode: args.sourceEnvelope.transportMode,
    eventType: "error",
    liveSessionId: args.sourceEnvelope.liveSessionId,
    voiceSessionId: args.sourceEnvelope.voiceSessionId,
    interviewSessionId: args.sourceEnvelope.interviewSessionId,
    sequence: args.sourceEnvelope.sequence,
    previousSequence: args.sourceEnvelope.previousSequence,
    timestampMs: Date.now(),
    error: {
      code: args.code,
      message: args.message,
      retryable: args.retryable,
    },
  };
}

function buildVoiceRuntimeNativeBridgeMetadata(args: {
  voiceSessionId: string;
  sessionState: "open" | "closed" | "stt" | "tts" | "probe";
  requestedProviderId: VoiceRuntimeProviderId;
  providerId: VoiceRuntimeProviderId;
  fallbackProviderId?: VoiceRuntimeProviderId | null;
  fallbackReason?: string | null;
}): VoiceRuntimeNativeBridgeMetadata {
  return {
    contractVersion: VOICE_EDGE_BRIDGE_CONTRACT_VERSION,
    runtimeAuthorityPrecedence: VOICE_EDGE_RUNTIME_AUTHORITY_PRECEDENCE,
    routeTarget: "vc83_voice_runtime",
    providerPattern:
      args.providerId === "elevenlabs"
        ? "gemini_live_reference"
        : "generic_voice_runtime",
    voiceSessionId: args.voiceSessionId,
    sessionState: args.sessionState,
    requestedProviderId: args.requestedProviderId,
    providerId: args.providerId,
    fallbackProviderId: args.fallbackProviderId ?? null,
    fallbackReason: normalizeString(args.fallbackReason) ?? null,
  };
}

function resolveVoiceBillingSource(args: {
  providerId: VoiceRuntimeProviderId;
  elevenLabsBinding: VoiceRuntimeContext["elevenLabsBinding"];
}): "platform" | "byok" | "private" {
  if (args.providerId === "elevenlabs") {
    return args.elevenLabsBinding?.billingSource ?? "platform";
  }
  return "private";
}

function resolveVoiceUsageModelId(args: {
  providerId: VoiceRuntimeProviderId;
  usage?: VoiceUsageTelemetry | null;
}): string {
  const metadata = args.usage?.metadata;
  if (metadata && typeof metadata === "object") {
    const modelId = normalizeString((metadata as Record<string, unknown>).modelId);
    if (modelId) {
      return modelId;
    }
  }
  return args.providerId === "elevenlabs"
    ? "elevenlabs_voice_runtime"
    : "browser_voice_runtime";
}

async function recordVoiceUsage(args: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any;
  runtimeContext: VoiceRuntimeContext;
  voiceSessionId: string;
  requestType: "voice_session" | "voice_stt" | "voice_tts";
  action: string;
  creditLedgerAction: string;
  providerId: VoiceRuntimeProviderId;
  success: boolean;
  errorMessage?: string;
  usage?: VoiceUsageTelemetry | null;
  metadata?: Record<string, unknown>;
}) {
  const billingSource = resolveVoiceBillingSource({
    providerId: args.providerId,
    elevenLabsBinding: args.runtimeContext.elevenLabsBinding,
  });
  const nativeCostInCents =
    typeof args.usage?.nativeCostInCents === "number" &&
    Number.isFinite(args.usage.nativeCostInCents) &&
    args.usage.nativeCostInCents > 0
      ? Math.floor(args.usage.nativeCostInCents)
      : 0;
  const creditsToCharge =
    nativeCostInCents > 0 ? convertUsdToCredits(nativeCostInCents / 100) : 0;
  let creditsCharged = 0;
  let creditChargeStatus:
    | "charged"
    | "skipped_unmetered"
    | "skipped_insufficient_credits"
    | "skipped_not_required"
    | "failed" =
    billingSource === "platform" ? "skipped_unmetered" : "skipped_not_required";

  if (args.success && billingSource === "platform" && creditsToCharge > 0) {
    try {
      const deduction = await args.ctx.runMutation(
        generatedApi.internal.credits.index.deductCreditsInternalMutation,
        {
          organizationId: args.runtimeContext.organizationId,
          amount: creditsToCharge,
          action: args.creditLedgerAction,
          relatedEntityType: "agent_session",
          relatedEntityId: args.runtimeContext.interviewSessionId,
          billingSource,
          requestSource: "llm",
          softFailOnExhausted: true,
        }
      );

      if (deduction.success && !deduction.skipped) {
        creditsCharged = creditsToCharge;
        creditChargeStatus = "charged";
      } else if (deduction.success && deduction.skipped) {
        creditChargeStatus = "skipped_not_required";
      } else {
        creditChargeStatus = "skipped_insufficient_credits";
      }
    } catch (error) {
      creditChargeStatus = "failed";
      console.error("[VoiceRuntime] Voice credit deduction failed:", error);
    }
  }

  await args.ctx.runMutation(generatedApi.api.ai.billing.recordUsage, {
    organizationId: args.runtimeContext.organizationId,
    requestType: args.requestType,
    provider: args.providerId,
    model: resolveVoiceUsageModelId({
      providerId: args.providerId,
      usage: args.usage ?? null,
    }),
    action: args.action,
    requestCount: 1,
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    costInCents: nativeCostInCents,
    nativeUsageUnit: args.usage?.nativeUsageUnit,
    nativeUsageQuantity: args.usage?.nativeUsageQuantity,
    nativeInputUnits: args.usage?.nativeInputUnits,
    nativeOutputUnits: args.usage?.nativeOutputUnits,
    nativeTotalUnits: args.usage?.nativeTotalUnits,
    nativeCostInCents: nativeCostInCents > 0 ? nativeCostInCents : undefined,
    nativeCostCurrency: args.usage?.nativeCostCurrency,
    nativeCostSource: args.usage?.nativeCostSource ?? "not_available",
    providerRequestId: args.usage?.providerRequestId,
    usageMetadata: {
      voiceSessionId: args.voiceSessionId,
      interviewSessionId: args.runtimeContext.interviewSessionId,
      ...(args.metadata ?? {}),
      ...(args.usage?.metadata && typeof args.usage.metadata === "object"
        ? { providerUsage: args.usage.metadata }
        : {}),
    },
    creditsCharged,
    creditChargeStatus,
    success: args.success,
    errorMessage: args.errorMessage,
    billingSource,
    requestSource: "llm",
    ledgerMode: "credits_ledger",
    creditLedgerAction: args.creditLedgerAction,
  });
}

function extractDefaultVoiceId(
  providerAuthProfiles: unknown,
  profileId: string,
): string | undefined {
  if (!Array.isArray(providerAuthProfiles)) {
    return undefined;
  }

  for (const profile of providerAuthProfiles) {
    if (typeof profile !== "object" || profile === null) {
      continue;
    }
    const typedProfile = profile as Record<string, unknown>;
    if (typedProfile.providerId !== "elevenlabs") {
      continue;
    }
    if (normalizeString(typedProfile.profileId) !== profileId) {
      continue;
    }
    const metadata = typedProfile.metadata;
    if (typeof metadata !== "object" || metadata === null) {
      continue;
    }
    const defaultVoiceId = normalizeString(
      (metadata as Record<string, unknown>).defaultVoiceId,
    );
    if (defaultVoiceId) {
      return defaultVoiceId;
    }
  }

  return undefined;
}

async function emitVoiceTrustEvent(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any,
  args: {
    eventName: VoiceTrustEventName;
    organizationId: Id<"organizations">;
    interviewSessionId: Id<"agentSessions">;
    actorId: string;
    mode: "lifecycle" | "runtime";
    additionalPayload: Record<string, unknown>;
  },
) {
  const occurredAt = Date.now();
  const basePayload: TrustEventPayload = {
    event_id: `${args.eventName}:${args.interviewSessionId}:${occurredAt}`,
    event_version: TRUST_EVENT_TAXONOMY_VERSION,
    occurred_at: occurredAt,
    org_id: args.organizationId,
    mode: args.mode,
    channel: VOICE_CHANNEL,
    session_id: String(args.interviewSessionId),
    actor_type: "system",
    actor_id: args.actorId,
  };
  const payload = Object.assign({}, basePayload, args.additionalPayload) as TrustEventPayload;
  const strippedKeys: string[] = [];
  const sanitizedPayloadEntries = Object.entries(payload).filter(([key]) => {
    if (!TRUST_EVENT_ALLOWED_PAYLOAD_KEYS.has(key)) {
      strippedKeys.push(key);
      return false;
    }
    return true;
  });
  if (strippedKeys.length > 0) {
    console.warn(
      `[VoiceRuntime] Trust payload stripped unknown keys for ${args.eventName}: ${strippedKeys.sort().join(",")}`,
    );
  }
  const sanitizedPayload = Object.fromEntries(
    sanitizedPayloadEntries,
  ) as TrustEventPayload;

  await ctx.runMutation(generatedApi.internal.ai.voiceRuntime.recordVoiceTrustEvent, {
    eventName: args.eventName,
    payload: sanitizedPayload,
  });
}

async function emitVoiceFailoverEvent(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any,
  args: {
    organizationId: Id<"organizations">;
    interviewSessionId: Id<"agentSessions">;
    actorId: string;
    voiceSessionId: string;
    requestedProviderId: VoiceRuntimeProviderId;
    fallbackProviderId: VoiceRuntimeProviderId;
    health: VoiceProviderHealth;
    reason: string;
  },
) {
  await emitVoiceTrustEvent(ctx, {
    eventName: "trust.voice.runtime_failover_triggered.v1",
    organizationId: args.organizationId,
    interviewSessionId: args.interviewSessionId,
    actorId: args.actorId,
    mode: "runtime",
    additionalPayload: {
      voice_session_id: args.voiceSessionId,
      voice_runtime_provider: args.requestedProviderId,
      voice_failover_provider: args.fallbackProviderId,
      voice_failover_reason: args.reason,
      voice_provider_health_status: args.health.status,
    },
  });
}

function toVoiceRuntimeSessionSnapshot(args: {
  event: {
    payload?: Record<string, unknown>;
  };
  voiceSessionId: string;
}): VoiceRuntimeSessionSnapshot | null {
  const payload = args.event.payload;
  if (!payload) {
    return null;
  }
  const state =
    normalizeVoiceRuntimeSessionFsmState(payload.voice_runtime_fsm_state) ??
    normalizeVoiceRuntimeSessionFsmState(payload.voice_state_to);
  if (!state) {
    return null;
  }
  const occurredAt =
    typeof payload.occurred_at === "number" && Number.isFinite(payload.occurred_at)
      ? Math.floor(payload.occurred_at)
      : Date.now();

  return {
    voiceSessionId: args.voiceSessionId,
    state,
    fromState:
      normalizeVoiceRuntimeSessionFsmState(payload.voice_runtime_fsm_state_from) ??
      normalizeVoiceRuntimeSessionFsmState(payload.voice_state_from),
    providerId: normalizeVoiceRuntimeProviderId(
      payload.voice_runtime_provider as any
    ),
    requestedProviderId: normalizeVoiceRuntimeProviderId(
      payload.voice_requested_provider as any,
    ),
    reason: normalizeString(payload.voice_transition_reason) ?? undefined,
    occurredAt,
  };
}

async function resolveLatestVoiceRuntimeSessionSnapshot(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any,
  args: {
    organizationId: Id<"organizations">;
    interviewSessionId: Id<"agentSessions">;
    voiceSessionId?: string | null;
  },
): Promise<VoiceRuntimeSessionSnapshot | null> {
  const targetVoiceSessionId = normalizeString(args.voiceSessionId ?? undefined);
  const events =
    typeof ctx?.runQuery === "function"
      ? await ctx.runQuery(
          generatedApi.internal.ai.voiceRuntime.listRecentVoiceSessionTransitionEvents,
          { limit: 256 },
        )
      : ctx?.db?.query
        ? await ctx.db
            .query("aiTrustEvents")
            .withIndex("by_event_name_occurred_at", (q: any) =>
              q.eq("event_name", "trust.voice.session_transition.v1")
            )
            .order("desc")
            .take(256)
        : null;
  if (!events) {
    throw new Error(
      "voice_runtime_snapshot_resolution_context_missing: expected runQuery or db.query context",
    );
  }

  for (const event of events) {
    const payload =
      event && typeof event.payload === "object" && event.payload !== null
        ? (event.payload as Record<string, unknown>)
        : null;
    if (!payload) {
      continue;
    }
    const orgId = normalizeString(payload.org_id);
    const sessionId = normalizeString(payload.session_id);
    if (orgId !== String(args.organizationId)) {
      continue;
    }
    if (sessionId !== String(args.interviewSessionId)) {
      continue;
    }
    const voiceSessionId = normalizeString(payload.voice_session_id);
    if (!voiceSessionId) {
      continue;
    }
    if (targetVoiceSessionId && voiceSessionId !== targetVoiceSessionId) {
      continue;
    }
    return toVoiceRuntimeSessionSnapshot({ event, voiceSessionId });
  }

  return null;
}

export const listRecentVoiceSessionTransitionEvents = internalQuery({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const resolvedLimit =
      typeof args.limit === "number" && Number.isFinite(args.limit)
        ? Math.max(1, Math.min(512, Math.floor(args.limit)))
        : 256;
    return await ctx.db
      .query("aiTrustEvents")
      .withIndex("by_event_name_occurred_at", (q: any) =>
        q.eq("event_name", "trust.voice.session_transition.v1"),
      )
      .order("desc")
      .take(resolvedLimit);
  },
});

async function emitVoiceSessionTransitionEvent(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any,
  args: {
    runtimeContext: VoiceRuntimeContext;
    voiceSessionId: string;
    fromState?: VoiceRuntimeSessionFsmState;
    toState: VoiceRuntimeSessionFsmState;
    reason: string;
    providerId?: VoiceRuntimeProviderId;
    requestedProviderId?: VoiceRuntimeProviderId;
    fallbackProviderId?: VoiceRuntimeProviderId | null;
  },
) {
  assertAllowedVoiceRuntimeSessionTransition({
    fromState: args.fromState,
    toState: args.toState,
  });
  await emitVoiceTrustEvent(ctx, {
    eventName: "trust.voice.session_transition.v1",
    organizationId: args.runtimeContext.organizationId,
    interviewSessionId: args.runtimeContext.interviewSessionId,
    actorId: args.runtimeContext.actorId,
    mode: "lifecycle",
    additionalPayload: {
      voice_session_id: args.voiceSessionId,
      voice_state_from: args.fromState ?? "created",
      voice_state_to: args.toState,
      voice_runtime_fsm_state_from: args.fromState ?? "created",
      voice_runtime_fsm_state: args.toState,
      voice_transition_reason: args.reason,
      voice_runtime_provider: args.providerId ?? "browser",
      voice_requested_provider: args.requestedProviderId ?? "browser",
      voice_failover_provider: args.fallbackProviderId ?? null,
    },
  });
}

function resolveOpenSessionTargetState(args: {
  health: VoiceProviderHealth;
}): VoiceRuntimeSessionFsmState {
  return args.health.status === "healthy" ? "open" : "degraded";
}

async function applyStaleSessionCleanupIfNeeded(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any,
  args: {
    runtimeContext: VoiceRuntimeContext;
    snapshot: VoiceRuntimeSessionSnapshot | null;
    nowMs: number;
  },
): Promise<VoiceRuntimeSessionSnapshot | null> {
  if (
    !isVoiceRuntimeSessionStale({
      snapshot: args.snapshot,
      nowMs: args.nowMs,
    })
  ) {
    return args.snapshot;
  }
  if (!args.snapshot) {
    return null;
  }
  if (args.snapshot.state === "closed") {
    return args.snapshot;
  }
  const staleReason = "voice_session_stale_timeout_cleanup";
  let transitionFrom = args.snapshot.state;
  if (transitionFrom !== "closing" && transitionFrom !== "error") {
    await emitVoiceSessionTransitionEvent(ctx, {
      runtimeContext: args.runtimeContext,
      voiceSessionId: args.snapshot.voiceSessionId,
      fromState: transitionFrom,
      toState: "closing",
      reason: staleReason,
      providerId: args.snapshot.providerId,
      requestedProviderId: args.snapshot.requestedProviderId,
      fallbackProviderId: null,
    });
    transitionFrom = "closing";
  }
  await emitVoiceSessionTransitionEvent(ctx, {
    runtimeContext: args.runtimeContext,
    voiceSessionId: args.snapshot.voiceSessionId,
    fromState: transitionFrom,
    toState: "closed",
    reason: staleReason,
    providerId: args.snapshot.providerId,
    requestedProviderId: args.snapshot.requestedProviderId,
    fallbackProviderId: null,
  });
  return {
    ...args.snapshot,
    fromState: transitionFrom,
    state: "closed",
    reason: staleReason,
    occurredAt: args.nowMs,
  };
}

function isAlreadyClosedRemoteError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  const message = error.message.toLowerCase();
  return (
    message.includes("not found") ||
    message.includes("already closed") ||
    message.includes("unknown session")
  );
}

function isNoTranscriptTextError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  const message = error.message.toLowerCase();
  return (
    message.includes("no transcript text") ||
    message.includes("transcription returned no")
  );
}

function isIgnorableVoiceSessionCloseAuthError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  const message = error.message.toLowerCase();
  return (
    message.includes("ungültige sitzung") ||
    message.includes("sitzung abgelaufen") ||
    message.includes("invalid session") ||
    message.includes("session expired")
  );
}

async function transcribeWithRealtimeSttPrecedence(args: {
  voiceSessionId: string;
  resolvedAdapter: Awaited<ReturnType<typeof resolveVoiceRuntimeAdapter>>;
  audioBytes: Uint8Array;
  mimeType: string;
  language?: string;
  geminiBinding: VoiceRuntimeContext["geminiBinding"];
}): Promise<RealtimeSttTranscriptionResult> {
  const normalizedMimeType = normalizeTranscriptionMimeType(args.mimeType)
    ?? "audio/wav";
  const normalizedInput = normalizeRealtimeTranscriptionInput({
    audioBytes: args.audioBytes,
    mimeType: normalizedMimeType,
  });
  const transcriptionMimeType = normalizedInput.mimeType;
  const transcriptionAudioBytes = normalizedInput.audioBytes;
  try {
    const primaryTranscription = await args.resolvedAdapter.adapter.transcribe({
      voiceSessionId: args.voiceSessionId,
      audioBytes: transcriptionAudioBytes,
      mimeType: transcriptionMimeType,
      language: normalizeString(args.language) ?? undefined,
    });
    return {
      transcriptText: primaryTranscription.text,
      providerId: primaryTranscription.providerId,
      route: VOICE_REALTIME_STT_PRIMARY_ROUTE,
      routeProvider: "elevenlabs",
      usage: primaryTranscription.usage
        ? {
            ...primaryTranscription.usage,
            metadata: {
              ...(typeof primaryTranscription.usage.metadata === "object"
                ? (primaryTranscription.usage.metadata as Record<string, unknown>)
                : {}),
              sttRoute: VOICE_REALTIME_STT_PRIMARY_ROUTE,
              sttProvider: "elevenlabs",
              sttInputMimeType: transcriptionMimeType,
              sttInputTranscodedFromPcmL16: normalizedInput.transcodedFromPcmL16,
            },
          }
        : {
            nativeUsageUnit: "requests",
            nativeUsageQuantity: 1,
            nativeInputUnits: transcriptionAudioBytes.byteLength,
            nativeTotalUnits: transcriptionAudioBytes.byteLength,
            nativeCostSource: "not_available",
            metadata: {
              sttRoute: VOICE_REALTIME_STT_PRIMARY_ROUTE,
              sttProvider: "elevenlabs",
              sttInputMimeType: transcriptionMimeType,
              sttInputTranscodedFromPcmL16: normalizedInput.transcodedFromPcmL16,
            },
          },
    };
  } catch (primaryError) {
    if (isNoTranscriptTextError(primaryError)) {
      throw primaryError;
    }
    if (!args.geminiBinding) {
      const primaryErrorMessage =
        primaryError instanceof Error
          ? primaryError.message
          : "scribe_v2_realtime_primary_failed";
      throw new Error(
        `${primaryErrorMessage}; failover_unavailable=gemini_binding_missing`,
      );
    }
    try {
      return await transcribeWithGeminiNativeAudioFailover({
        voiceSessionId: args.voiceSessionId,
        binding: args.geminiBinding,
        audioBytes: transcriptionAudioBytes,
        mimeType: transcriptionMimeType,
        language: args.language,
      });
    } catch (failoverError) {
      const primaryErrorMessage =
        primaryError instanceof Error
          ? primaryError.message
          : "scribe_v2_realtime_primary_failed";
      const failoverErrorMessage =
        failoverError instanceof Error
          ? failoverError.message
          : "gemini_native_audio_failover_failed";
      throw new Error(
        `${VOICE_REALTIME_STT_PRIMARY_ROUTE}=${primaryErrorMessage}; ${VOICE_REALTIME_STT_FAILOVER_ROUTE}=${failoverErrorMessage}`,
      );
    }
  }
}

export const resolveVoiceRuntimeContext = internalQuery({
  args: {
    sessionId: v.string(),
    interviewSessionId: v.id("agentSessions"),
  },
  handler: async (ctx, args): Promise<VoiceRuntimeContext> => {
    const { userId, organizationId } = await requireAuthenticatedUser(
      ctx,
      args.sessionId,
    );
    const interviewSession = await ctx.db.get(args.interviewSessionId);

    if (!interviewSession) {
      throw new Error("Interview session not found.");
    }
    if (interviewSession.organizationId !== organizationId) {
      throw new Error("Interview session does not belong to your organization.");
    }
    const agentRecord = await ctx.db.get(interviewSession.agentId);
    const agentCustomProperties =
      agentRecord &&
      typeof agentRecord.customProperties === "object" &&
      agentRecord.customProperties !== null
        ? (agentRecord.customProperties as Record<string, unknown>)
        : {};
    const agentVoiceId =
      normalizeString(agentCustomProperties.elevenLabsVoiceId) ?? null;
    const agentVoiceLanguage =
      normalizeString(agentCustomProperties.voiceLanguage)
      ?? normalizeString(agentCustomProperties.language)
      ?? null;

    const aiSettings = await ctx.db
      .query("organizationAiSettings")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", organizationId),
      )
      .first();

    const elevenLabsBinding = aiSettings?.llm
      ? resolveOrganizationProviderBindingForProvider({
          providerId: "elevenlabs",
          llmSettings: aiSettings.llm,
          defaultBillingSource:
            aiSettings.billingSource ??
            (aiSettings.billingMode === "byok" ? "byok" : "platform"),
          now: Date.now(),
        })
      : null;
    const geminiBinding = aiSettings?.llm
      ? resolveOrganizationProviderBindingForProvider({
          providerId: "gemini",
          llmSettings: aiSettings.llm,
          defaultBillingSource:
            aiSettings.billingSource ??
            (aiSettings.billingMode === "byok" ? "byok" : "platform"),
          now: Date.now(),
        })
      : null;

    const defaultVoiceId = elevenLabsBinding?.profileId
      ? extractDefaultVoiceId(
          aiSettings?.llm?.providerAuthProfiles,
          elevenLabsBinding.profileId,
        )
      : undefined;

    return {
      organizationId,
      actorId: String(userId),
      interviewSessionId: args.interviewSessionId,
      agentVoiceId,
      agentVoiceLanguage,
      elevenLabsBinding: elevenLabsBinding
        ? {
            apiKey: elevenLabsBinding.apiKey,
            baseUrl: elevenLabsBinding.baseUrl,
            defaultVoiceId,
            profileId: elevenLabsBinding.profileId,
            billingSource: elevenLabsBinding.billingSource,
          }
        : null,
      geminiBinding: geminiBinding
        ? {
            apiKey: geminiBinding.apiKey,
            baseUrl: geminiBinding.baseUrl,
            profileId: geminiBinding.profileId,
            billingSource: geminiBinding.billingSource,
          }
        : null,
    };
  },
});

export const recordVoiceTrustEvent = internalMutation({
  args: {
    eventName: trustEventNameValidator,
    payload: v.any(),
  },
  handler: async (ctx, args) => {
    const payload = args.payload as TrustEventPayload;
    const validation = validateTrustEventPayload(args.eventName, payload);
    await ctx.db.insert("aiTrustEvents", {
      event_name: args.eventName,
      payload,
      schema_validation_status: validation.ok ? "passed" : "failed",
      schema_errors: validation.ok ? undefined : validation.errors,
      created_at: Date.now(),
    });
  },
});

export const resolveVoiceTransportIngestCheckpoint = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    interviewSessionId: v.id("agentSessions"),
    voiceSessionId: v.string(),
  },
  handler: async (ctx, args): Promise<VoiceTransportIngestCheckpointSnapshot> => {
    const persisted = await ctx.db
      .query("voiceTransportSessionState")
      .withIndex("by_org_session_voice", (q: any) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("interviewSessionId", args.interviewSessionId)
          .eq("voiceSessionId", args.voiceSessionId),
      )
      .first();

    if (persisted) {
      const acceptedSequenceWindow = Array.isArray(persisted.acceptedSequenceWindow)
        ? persisted.acceptedSequenceWindow
        : [];
      const relayEventsBySequence =
        persisted.relayEventsBySequence &&
        typeof persisted.relayEventsBySequence === "object"
          ? (persisted.relayEventsBySequence as Record<
              string,
              VoiceTransportEnvelopeContract[]
            >)
          : {};
      return {
        acceptedSequences: acceptedSequenceWindow,
        acceptedReplayEventsBySequence: relayEventsBySequence,
        lastAcceptedSequence:
          typeof persisted.lastAcceptedSequence === "number"
            ? persisted.lastAcceptedSequence
            : null,
      };
    }

    // Backward-compatible bootstrap path for sessions created before keyed checkpoint persistence.
    const recentIngestEvents = await ctx.db
      .query("aiTrustEvents")
      .withIndex("by_event_name_occurred_at", (q: any) =>
        q.eq("event_name", "trust.voice.adaptive_flow_decision.v1"),
      )
      .order("desc")
      .take(512);
    const fallbackIngestCheckpoint = extractVoiceTransportIngestCheckpointStateFromEvents({
      events: recentIngestEvents,
      organizationId: args.organizationId,
      interviewSessionId: args.interviewSessionId,
      voiceSessionId: args.voiceSessionId,
    });
    return serializeVoiceTransportIngestCheckpointState(fallbackIngestCheckpoint);
  },
});

export const commitVoiceTransportIngestCheckpoint = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    interviewSessionId: v.id("agentSessions"),
    voiceSessionId: v.string(),
    acceptedSequence: v.number(),
    relayEvents: v.array(voiceTransportEnvelopeValidator),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("voiceTransportSessionState")
      .withIndex("by_org_session_voice", (q: any) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("interviewSessionId", args.interviewSessionId)
          .eq("voiceSessionId", args.voiceSessionId),
      )
      .first();

    const previousWindow = Array.isArray(existing?.acceptedSequenceWindow)
      ? existing.acceptedSequenceWindow
      : [];
    const acceptedSequenceWindow = mergeVoiceTransportAcceptedSequenceWindow({
      previous: previousWindow,
      nextAcceptedSequence: args.acceptedSequence,
      windowLimit: VOICE_TRANSPORT_SEQUENCE_WINDOW_LIMIT,
    });

    const previousRelayEventsBySequence =
      existing?.relayEventsBySequence &&
      typeof existing.relayEventsBySequence === "object"
        ? (existing.relayEventsBySequence as Record<
            string,
            VoiceTransportEnvelopeContract[]
          >)
        : {};
    const existingRelayEventsForSequence =
      previousRelayEventsBySequence[String(args.acceptedSequence)];
    if (existing && Array.isArray(existingRelayEventsForSequence)) {
      return {
        stateId: existing._id,
        created: false,
        alreadyAccepted: true,
        relayEvents: existingRelayEventsForSequence,
      };
    }
    const relayEventsBySequence = trimVoiceTransportRelayEventsBySequence({
      relayEventsBySequence: {
        ...previousRelayEventsBySequence,
        [String(args.acceptedSequence)]: args.relayEvents,
      },
      acceptedSequenceWindow,
    });

    const lastAcceptedSequence =
      typeof existing?.lastAcceptedSequence === "number"
        ? Math.max(existing.lastAcceptedSequence, args.acceptedSequence)
        : args.acceptedSequence;

    if (existing) {
      await ctx.db.patch(existing._id, {
        lastAcceptedSequence,
        acceptedSequenceWindow,
        relayEventsBySequence,
        updatedAt: now,
      });
      return {
        stateId: existing._id,
        created: false,
        alreadyAccepted: false,
        relayEvents: args.relayEvents,
      };
    }

    const stateId = await ctx.db.insert("voiceTransportSessionState", {
      organizationId: args.organizationId,
      interviewSessionId: args.interviewSessionId,
      voiceSessionId: args.voiceSessionId,
      lastAcceptedSequence,
      acceptedSequenceWindow,
      relayEventsBySequence,
      createdAt: now,
      updatedAt: now,
    });
    return {
      stateId,
      created: true,
      alreadyAccepted: false,
      relayEvents: args.relayEvents,
    };
  },
});

type VideoTransportFrameOrderingDecision =
  | "accepted"
  | "duplicate_replay"
  | "gap_detected"
  | "rate_limited";

interface IngestVideoTransportFrameCheckpointResult {
  decision: VideoTransportFrameOrderingDecision;
  expectedSequence: number;
  lastAcceptedSequence: number | null;
  retryAfterMs: number;
  frameCountInWindow: number;
  windowStartMs: number;
}

export const ingestVideoTransportFrameCheckpoint = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    interviewSessionId: v.id("agentSessions"),
    liveSessionId: v.string(),
    videoSessionId: v.string(),
    sequence: v.number(),
    nowMs: v.number(),
    maxFramesPerWindow: v.optional(v.number()),
    windowMs: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<IngestVideoTransportFrameCheckpointResult> => {
    const existing = await ctx.db
      .query("videoTransportSessionState")
      .withIndex("by_org_session_live_video", (q: any) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("interviewSessionId", args.interviewSessionId)
          .eq("liveSessionId", args.liveSessionId)
          .eq("videoSessionId", args.videoSessionId),
      )
      .first();

    const acceptedSequenceWindow = Array.isArray(existing?.acceptedSequenceWindow)
      ? existing.acceptedSequenceWindow
      : [];
    const acceptedSequenceSet = new Set(
      acceptedSequenceWindow
        .filter((value) => Number.isInteger(value) && value >= 0)
        .map((value) => Math.floor(value)),
    );
    const lastAcceptedSequence =
      typeof existing?.lastAcceptedSequence === "number"
        ? Math.floor(existing.lastAcceptedSequence)
        : null;
    const expectedSequence =
      typeof lastAcceptedSequence === "number" ? lastAcceptedSequence + 1 : 0;
    const now = args.nowMs;

    if (acceptedSequenceSet.has(args.sequence) || args.sequence < expectedSequence) {
      if (existing) {
        await ctx.db.patch(existing._id, {
          updatedAt: now,
        });
      }
      return {
        decision: "duplicate_replay",
        expectedSequence,
        lastAcceptedSequence,
        retryAfterMs: 0,
        frameCountInWindow:
          typeof existing?.frameCountInWindow === "number"
            ? existing.frameCountInWindow
            : 0,
        windowStartMs:
          typeof existing?.windowStartMs === "number" ? existing.windowStartMs : now,
      };
    }

    if (args.sequence > expectedSequence) {
      if (existing) {
        await ctx.db.patch(existing._id, {
          updatedAt: now,
        });
      }
      return {
        decision: "gap_detected",
        expectedSequence,
        lastAcceptedSequence,
        retryAfterMs: 0,
        frameCountInWindow:
          typeof existing?.frameCountInWindow === "number"
            ? existing.frameCountInWindow
            : 0,
        windowStartMs:
          typeof existing?.windowStartMs === "number" ? existing.windowStartMs : now,
      };
    }

    const rateDecision = resolveVideoTransportFrameRateDecision({
      nowMs: now,
      windowMs: args.windowMs,
      maxFramesPerWindow: args.maxFramesPerWindow,
      state: existing
        ? {
            windowStartMs: existing.windowStartMs,
            frameCountInWindow: existing.frameCountInWindow,
          }
        : null,
    });

    if (!rateDecision.allowed) {
      if (existing) {
        await ctx.db.patch(existing._id, {
          windowStartMs: rateDecision.windowStartMs,
          frameCountInWindow: rateDecision.nextFrameCount,
          blockedCount: (existing.blockedCount ?? 0) + 1,
          lastBlockedAt: now,
          updatedAt: now,
        });
      } else {
        await ctx.db.insert("videoTransportSessionState", {
          organizationId: args.organizationId,
          interviewSessionId: args.interviewSessionId,
          liveSessionId: args.liveSessionId,
          videoSessionId: args.videoSessionId,
          lastAcceptedSequence: undefined,
          acceptedSequenceWindow: [],
          windowStartMs: rateDecision.windowStartMs,
          frameCountInWindow: rateDecision.nextFrameCount,
          blockedCount: 1,
          lastBlockedAt: now,
          createdAt: now,
          updatedAt: now,
        });
      }
      return {
        decision: "rate_limited",
        expectedSequence,
        lastAcceptedSequence,
        retryAfterMs: rateDecision.retryAfterMs,
        frameCountInWindow: rateDecision.nextFrameCount,
        windowStartMs: rateDecision.windowStartMs,
      };
    }

    const nextAcceptedSequenceWindow = mergeVoiceTransportAcceptedSequenceWindow({
      previous: acceptedSequenceWindow,
      nextAcceptedSequence: args.sequence,
      windowLimit: VIDEO_TRANSPORT_SEQUENCE_WINDOW_LIMIT,
    });
    const nextLastAcceptedSequence =
      typeof lastAcceptedSequence === "number"
        ? Math.max(lastAcceptedSequence, args.sequence)
        : args.sequence;

    if (existing) {
      await ctx.db.patch(existing._id, {
        lastAcceptedSequence: nextLastAcceptedSequence,
        acceptedSequenceWindow: nextAcceptedSequenceWindow,
        windowStartMs: rateDecision.windowStartMs,
        frameCountInWindow: rateDecision.nextFrameCount,
        lastAcceptedAt: now,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("videoTransportSessionState", {
        organizationId: args.organizationId,
        interviewSessionId: args.interviewSessionId,
        liveSessionId: args.liveSessionId,
        videoSessionId: args.videoSessionId,
        lastAcceptedSequence: nextLastAcceptedSequence,
        acceptedSequenceWindow: nextAcceptedSequenceWindow,
        windowStartMs: rateDecision.windowStartMs,
        frameCountInWindow: rateDecision.nextFrameCount,
        lastAcceptedAt: now,
        createdAt: now,
        updatedAt: now,
      });
    }

    return {
      decision: "accepted",
      expectedSequence,
      lastAcceptedSequence: nextLastAcceptedSequence,
      retryAfterMs: 0,
      frameCountInWindow: rateDecision.nextFrameCount,
      windowStartMs: rateDecision.windowStartMs,
    };
  },
});

export const appendWebChatVisionFrameBufferEntry = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    interviewSessionId: v.id("agentSessions"),
    conversationId: v.id("aiConversations"),
    liveSessionId: v.string(),
    retentionId: v.id("operatorMediaRetention"),
    capturedAt: v.number(),
    mediaType: v.union(v.literal("video_frame"), v.literal("video_keyframe")),
    mimeType: v.string(),
    sizeBytes: v.number(),
    storageId: v.id("_storage"),
    videoSessionId: v.optional(v.string()),
    sourceSequence: v.optional(v.number()),
    ttlExpiresAt: v.number(),
    idempotencyKey: v.string(),
    idempotentReplay: v.optional(v.boolean()),
    nowMs: v.number(),
  },
  handler: async (ctx, args) => {
    const nowMs = Math.max(0, Math.floor(args.nowMs));
    const existing = await ctx.db
      .query("webChatVisionFrameBufferState")
      .withIndex("by_org_interview_conversation_live", (q: any) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("interviewSessionId", args.interviewSessionId)
          .eq("conversationId", args.conversationId)
          .eq("liveSessionId", args.liveSessionId),
      )
      .first();

    const priorBuffer = existing?.entries && Array.isArray(existing.entries)
      ? sanitizeVisionFrameBufferEntries({
          entries: existing.entries as WebChatVisionFrameBufferEntry[],
          nowMs,
        })
      : [];

    const nextEntry: WebChatVisionFrameBufferEntry = {
      retentionId: args.retentionId,
      capturedAt: Math.floor(args.capturedAt),
      mediaType: args.mediaType,
      mimeType: args.mimeType,
      sizeBytes: Math.max(0, Math.floor(args.sizeBytes)),
      storageId: args.storageId,
      videoSessionId: normalizeSessionToken(args.videoSessionId) ?? undefined,
      sourceSequence:
        typeof args.sourceSequence === "number" && Number.isFinite(args.sourceSequence)
          ? Math.floor(args.sourceSequence)
          : undefined,
      ttlExpiresAt: Math.floor(args.ttlExpiresAt),
      idempotencyKey: args.idempotencyKey,
      insertedAt: nowMs,
    };

    const priorIdempotencyWindow = Array.isArray(existing?.idempotencyWindow)
      ? existing.idempotencyWindow.filter((value) =>
          typeof value === "string" && value.trim().length > 0
        )
      : [];
    const idempotencyWindowLimit =
      typeof existing?.idempotencyWindowLimit === "number" &&
      Number.isFinite(existing.idempotencyWindowLimit) &&
      existing.idempotencyWindowLimit > 0
        ? Math.floor(existing.idempotencyWindowLimit)
        : WEB_CHAT_VISION_FRAME_BUFFER_IDEMPOTENCY_WINDOW_LIMIT;
    const idempotencyWindow = Array.from(
      new Set([...priorIdempotencyWindow, args.idempotencyKey]),
    ).slice(-idempotencyWindowLimit);

    const duplicateByRetentionId = priorBuffer.some(
      (entry) => String(entry.retentionId) === String(nextEntry.retentionId),
    );
    const duplicateByIdempotencyKey = priorBuffer.some(
      (entry) => entry.idempotencyKey === nextEntry.idempotencyKey,
    );
    const shouldAppend =
      !duplicateByRetentionId &&
      !duplicateByIdempotencyKey &&
      !(args.idempotentReplay === true && priorIdempotencyWindow.includes(args.idempotencyKey));

    const maxFrames =
      typeof existing?.maxFrames === "number" &&
      Number.isFinite(existing.maxFrames) &&
      existing.maxFrames > 0
        ? Math.floor(existing.maxFrames)
        : WEB_CHAT_VISION_FRAME_BUFFER_MAX_FRAMES;
    const mergedEntries = sanitizeVisionFrameBufferEntries({
      entries: shouldAppend ? [...priorBuffer, nextEntry] : priorBuffer,
      nowMs,
    }).slice(0, maxFrames);

    const patchPayload: WebChatVisionFrameBufferSnapshot = {
      contractVersion: WEB_CHAT_VISION_FRAME_BUFFER_CONTRACT_VERSION,
      maxFrames,
      idempotencyWindowLimit,
      entries: mergedEntries,
      idempotencyWindow,
    };

    if (existing) {
      await ctx.db.patch(existing._id, {
        contractVersion: patchPayload.contractVersion,
        maxFrames: patchPayload.maxFrames,
        idempotencyWindowLimit: patchPayload.idempotencyWindowLimit,
        entries: patchPayload.entries,
        idempotencyWindow: patchPayload.idempotencyWindow,
        updatedAt: nowMs,
      });
      return {
        created: false,
        appended: shouldAppend,
        frameCount: mergedEntries.length,
      };
    }

    await ctx.db.insert("webChatVisionFrameBufferState", {
      organizationId: args.organizationId,
      interviewSessionId: args.interviewSessionId,
      conversationId: args.conversationId,
      liveSessionId: args.liveSessionId,
      contractVersion: patchPayload.contractVersion,
      maxFrames: patchPayload.maxFrames,
      idempotencyWindowLimit: patchPayload.idempotencyWindowLimit,
      entries: patchPayload.entries,
      idempotencyWindow: patchPayload.idempotencyWindow,
      createdAt: nowMs,
      updatedAt: nowMs,
    });
    return {
      created: true,
      appended: shouldAppend,
      frameCount: mergedEntries.length,
    };
  },
});

export const resolveWebChatVisionFrameBufferCandidates = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    interviewSessionId: v.id("agentSessions"),
    conversationId: v.id("aiConversations"),
    liveSessionId: v.optional(v.string()),
    nowMs: v.number(),
  },
  handler: async (ctx, args): Promise<WebChatVisionFrameCandidate[]> => {
    const nowMs = Math.max(0, Math.floor(args.nowMs));
    const normalizedLiveSessionId = normalizeSessionToken(args.liveSessionId);

    const rows = normalizedLiveSessionId
      ? await ctx.db
          .query("webChatVisionFrameBufferState")
          .withIndex("by_org_interview_conversation_live", (q: any) =>
            q
              .eq("organizationId", args.organizationId)
              .eq("interviewSessionId", args.interviewSessionId)
              .eq("conversationId", args.conversationId)
              .eq("liveSessionId", normalizedLiveSessionId),
          )
          .collect()
      : await ctx.db
          .query("webChatVisionFrameBufferState")
          .withIndex("by_org_interview_conversation_updated", (q: any) =>
            q
              .eq("organizationId", args.organizationId)
              .eq("interviewSessionId", args.interviewSessionId)
              .eq("conversationId", args.conversationId),
          )
          .order("desc")
          .take(4);

    const candidates: WebChatVisionFrameCandidate[] = [];
    for (const row of rows) {
      const normalizedLiveSession = normalizeSessionToken(row.liveSessionId);
      if (!normalizedLiveSession) {
        continue;
      }
      const entries = sanitizeVisionFrameBufferEntries({
        entries: Array.isArray(row.entries)
          ? (row.entries as WebChatVisionFrameBufferEntry[])
          : [],
        nowMs,
      });
      candidates.push(
        ...toVisionFrameBufferWebChatCandidates({
          entries,
          liveSessionId: normalizedLiveSession,
        }),
      );
    }

    const dedupedCandidates: WebChatVisionFrameCandidate[] = [];
    const seenRetentionIds = new Set<string>();
    for (const candidate of candidates.sort(compareWebChatVisionFrameCandidatesDesc)) {
      const retentionId = String(candidate.retentionId);
      if (seenRetentionIds.has(retentionId)) {
        continue;
      }
      seenRetentionIds.add(retentionId);
      dedupedCandidates.push(candidate);
    }
    return dedupedCandidates;
  },
});

export const enforceVoiceSessionOpenRateLimit = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    interviewSessionId: v.id("agentSessions"),
    liveSessionId: v.string(),
    nowMs: v.number(),
    windowMs: v.optional(v.number()),
    maxRequests: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("voiceRuntimeSessionOpenRateState")
      .withIndex("by_org_session_live", (q: any) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("interviewSessionId", args.interviewSessionId)
          .eq("liveSessionId", args.liveSessionId),
      )
      .first();

    const decision = resolveVoiceSessionOpenRateLimitDecision({
      nowMs: args.nowMs,
      windowMs:
        typeof args.windowMs === "number" && args.windowMs > 0
          ? Math.floor(args.windowMs)
          : undefined,
      maxRequests:
        typeof args.maxRequests === "number" && args.maxRequests > 0
          ? Math.floor(args.maxRequests)
          : undefined,
      state: existing
        ? {
            windowStartMs: existing.windowStartMs,
            openCount: existing.openCount,
          }
        : null,
    });

    const now = args.nowMs;
    if (existing) {
      if (decision.allowed) {
        await ctx.db.patch(existing._id, {
          windowStartMs: decision.nextState.windowStartMs,
          openCount: decision.nextState.openCount,
          lastOpenAt: now,
          updatedAt: now,
        });
      } else {
        await ctx.db.patch(existing._id, {
          blockedCount: (existing.blockedCount ?? 0) + 1,
          lastBlockedAt: now,
          updatedAt: now,
        });
      }
    } else {
      await ctx.db.insert("voiceRuntimeSessionOpenRateState", {
        organizationId: args.organizationId,
        interviewSessionId: args.interviewSessionId,
        liveSessionId: args.liveSessionId,
        windowStartMs: decision.nextState.windowStartMs,
        openCount: decision.allowed ? decision.nextState.openCount : 0,
        blockedCount: decision.allowed ? 0 : 1,
        lastOpenAt: decision.allowed ? now : undefined,
        lastBlockedAt: decision.allowed ? undefined : now,
        createdAt: now,
        updatedAt: now,
      });
    }

    return {
      allowed: decision.allowed,
      retryAfterMs: decision.retryAfterMs,
      windowStartMs: decision.nextState.windowStartMs,
      openCount: decision.nextState.openCount,
    };
  },
});

export const resolveVoiceSessionOpenRateLimitProfile = internalQuery({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const license = await getLicenseInternal(ctx, args.organizationId);
    const tierProfile = resolveVoiceSessionOpenRateLimitProfileFromTier(
      license.planTier,
    );
    return {
      planTier: license.planTier,
      windowMs: tierProfile.windowMs,
      maxRequests: tierProfile.maxRequests,
    };
  },
});

export const issueVoiceSessionOpenAttestationProof = action({
  args: {
    sessionId: v.string(),
    interviewSessionId: v.id("agentSessions"),
    liveSessionId: v.string(),
    sourceMode: v.optional(v.string()),
    voiceRuntime: v.any(),
    clientSurface: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const runtimeContext = (await ctx.runQuery(
      generatedApi.internal.ai.voiceRuntime.resolveVoiceRuntimeContext,
      {
        sessionId: args.sessionId,
        interviewSessionId: args.interviewSessionId,
      },
    )) as VoiceRuntimeContext;
    const nowMs = Date.now();
    const voiceRuntime = normalizeObject(args.voiceRuntime);
    const sourceId = normalizeIdentityToken(voiceRuntime?.sourceId);
    const sourceClass = normalizeSourceClassToken(
      voiceRuntime?.sourceClass ?? voiceRuntime?.sourceId,
    );
    const providerId = normalizeIdentityToken(voiceRuntime?.providerId);
    const liveSessionId = normalizeSessionToken(args.liveSessionId);
    const clientSurface =
      normalizeString(args.clientSurface) ?? "mobile_api_v1";
    if (!sourceId || !sourceClass || !providerId || !liveSessionId) {
      throw new Error(
        "voice_session_open_attestation_proof_issue_failed:missing_source_context",
      );
    }
    const securityDecision = resolveVoiceSessionOpenSecurityDecision({
      nowMs,
      enforceSourceAttestation: false,
      clientSurface,
      liveSessionId,
      sourceMode: normalizeString(args.sourceMode),
      voiceRuntime,
    });
    if (!securityDecision.protectedPath || !securityDecision.allowed) {
      throw new Error(
        `voice_session_open_attestation_proof_issue_failed:${securityDecision.reasonCodes.join(",")}`,
      );
    }
    const token = buildVoiceSessionOpenAttestationProofToken({
      v: "voice_session_open_attestation_proof_v1",
      org: String(runtimeContext.organizationId),
      user: String(runtimeContext.actorId),
      interview: String(runtimeContext.interviewSessionId),
      live: liveSessionId,
      sourceId,
      sourceClass,
      providerId,
      surface: clientSurface,
      iat: nowMs,
      exp: nowMs + VOICE_RUNTIME_ATTESTATION_PROOF_TTL_MS,
    });
    return {
      token,
      expiresAt: nowMs + VOICE_RUNTIME_ATTESTATION_PROOF_TTL_MS,
    };
  },
});

export const resolveVoiceSessionState = action({
  args: {
    sessionId: v.string(),
    interviewSessionId: v.id("agentSessions"),
    voiceSessionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const runtimeContext = (await ctx.runQuery(
      generatedApi.internal.ai.voiceRuntime.resolveVoiceRuntimeContext,
      {
        sessionId: args.sessionId,
        interviewSessionId: args.interviewSessionId,
      },
    )) as VoiceRuntimeContext;
    const normalizedVoiceSessionId = normalizeString(args.voiceSessionId) ?? null;
    const nowMs = Date.now();
    const latestSession = await resolveLatestVoiceRuntimeSessionSnapshot(ctx, {
      organizationId: runtimeContext.organizationId,
      interviewSessionId: runtimeContext.interviewSessionId,
      voiceSessionId: normalizedVoiceSessionId,
    });
    const cleanedSession = await applyStaleSessionCleanupIfNeeded(ctx, {
      runtimeContext,
      snapshot: latestSession,
      nowMs,
    });

    return {
      success: true,
      voiceSession: cleanedSession
        ? {
          voiceSessionId: cleanedSession.voiceSessionId,
          state: cleanedSession.state,
          fromState: cleanedSession.fromState ?? null,
          providerId: cleanedSession.providerId ?? null,
          requestedProviderId: cleanedSession.requestedProviderId ?? null,
          reason: cleanedSession.reason ?? null,
          occurredAt: cleanedSession.occurredAt,
          stale: isVoiceRuntimeSessionStale({
            snapshot: cleanedSession,
            nowMs,
          }),
        }
        : null,
    };
  },
});

export const resolvePersistentRealtimeMultimodalSessionLifecycle = action({
  args: {
    sessionId: v.string(),
    interviewSessionId: v.id("agentSessions"),
    requestedProviderId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const runtimeContext = (await ctx.runQuery(
      generatedApi.internal.ai.voiceRuntime.resolveVoiceRuntimeContext,
      {
        sessionId: args.sessionId,
        interviewSessionId: args.interviewSessionId,
      },
    )) as VoiceRuntimeContext;
    const featureFlagEnabled = isPersistentRealtimeMultimodalEnabled();
    if (!featureFlagEnabled) {
      return buildPersistentRealtimeLifecycleSnapshot({
        mode: "turn_stitch",
        featureFlagEnabled,
        fallbackReason: "feature_flag_disabled",
      });
    }
    const persistentAdapter = await resolvePersistentRealtimeMultimodalAdapter({
      requestedProviderId: normalizeString(args.requestedProviderId) ?? undefined,
      geminiBinding: runtimeContext.geminiBinding,
    });
    if (!persistentAdapter.adapter) {
      return buildPersistentRealtimeLifecycleSnapshot({
        mode: "turn_stitch",
        featureFlagEnabled,
        providerId: persistentAdapter.requestedProviderId,
        fallbackReason: "provider_capability_unsupported",
        healthStatus: persistentAdapter.health.status,
      });
    }
    return buildPersistentRealtimeLifecycleSnapshot({
      mode: "persistent_realtime_multimodal",
      featureFlagEnabled,
      providerId: persistentAdapter.adapter.providerId,
      transport: "native_realtime_audio_video",
      healthStatus: persistentAdapter.health.status,
    });
  },
});

export const resolveFreshestVisionFrameForVoiceTurn = action({
  args: {
    sessionId: v.string(),
    interviewSessionId: v.id("agentSessions"),
    conversationId: v.id("aiConversations"),
    liveSessionId: v.optional(v.string()),
    nowMs: v.optional(v.number()),
    maxFrameAgeMs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const runtimeContext = (await ctx.runQuery(
      generatedApi.internal.ai.voiceRuntime.resolveVoiceRuntimeContext,
      {
        sessionId: args.sessionId,
        interviewSessionId: args.interviewSessionId,
      },
    )) as VoiceRuntimeContext;
    const nowMs =
      typeof args.nowMs === "number" && Number.isFinite(args.nowMs)
        ? Math.floor(args.nowMs)
        : Date.now();
    const maxFrameAgeMs = resolveWebChatVisionFrameMaxAgeMs(args.maxFrameAgeMs);
    const buildVisionTelemetry = (input: {
      reason: WebChatVisionAttachReason;
      source: "auth_gate" | "buffer" | "retention";
      frameAgeMs?: unknown;
    }) =>
      buildWebChatVisionAttachmentTelemetrySnapshot({
        reason: input.reason,
        source: input.source,
        maxFrameAgeMs,
        frameAgeMs: input.frameAgeMs,
      });
    const retentionConfig = resolveOperatorMediaRetentionConfig();
    const effectiveRetentionMode = resolveEffectiveOperatorMediaRetentionMode(
      retentionConfig,
    );
    const conversationScope = (await ctx.runQuery(
      generatedApi.internal.ai.mediaRetention.resolveVisionAttachmentConversationScope,
      {
        conversationId: args.conversationId,
      },
    )) as {
      organizationId: Id<"organizations">;
      userId: Id<"users">;
    } | null;
    const authIsolationDecision = resolveWebChatVisionAttachmentAuthIsolationDecision({
      authenticatedOrganizationId: runtimeContext.organizationId,
      authenticatedUserId: runtimeContext.actorId as Id<"users">,
      requestedInterviewSessionId: args.interviewSessionId,
      resolvedInterviewSessionId: runtimeContext.interviewSessionId,
      conversationOrganizationId: conversationScope?.organizationId,
      conversationUserId: conversationScope?.userId,
    });
    if (!authIsolationDecision.allowed) {
      const telemetry = buildVisionTelemetry({
        reason: "vision_frame_dropped_auth_isolation",
        source: "auth_gate",
      });
      return {
        status: "degraded" as const,
        reason: "vision_policy_blocked" as const,
        maxFrameAgeMs,
        telemetry,
      };
    }
    const bufferedCandidates = (await ctx.runQuery(
      generatedApi.internal.ai.voiceRuntime.resolveWebChatVisionFrameBufferCandidates,
      {
        organizationId: runtimeContext.organizationId,
        interviewSessionId: runtimeContext.interviewSessionId,
        conversationId: args.conversationId,
        liveSessionId: normalizeString(args.liveSessionId) ?? undefined,
        nowMs,
      },
    )) as WebChatVisionFrameCandidate[];

    if (bufferedCandidates.length > 0 || effectiveRetentionMode !== "full") {
      const bufferedDecision = resolveWebChatVisionFrameDecision({
        retentionMode: effectiveRetentionMode,
        nowMs,
        maxFrameAgeMs,
        candidates: bufferedCandidates,
      });
      if (bufferedDecision.status === "attached") {
        const bufferedStorageUrl = await ctx.storage.getUrl(
          bufferedDecision.frame.storageId,
        );
        if (bufferedStorageUrl) {
          const telemetry = buildVisionTelemetry({
            reason: "attached",
            source: "buffer",
            frameAgeMs: bufferedDecision.frame.ageMs,
          });
          return {
            ...bufferedDecision,
            frame: {
              ...bufferedDecision.frame,
              storageUrl: bufferedStorageUrl,
            },
            telemetry,
          };
        }
      } else if (bufferedDecision.reason === "vision_policy_blocked") {
        const telemetry = buildVisionTelemetry({
          reason: "vision_policy_blocked",
          source: "buffer",
          frameAgeMs: bufferedDecision.freshestCandidateAgeMs,
        });
        return {
          ...bufferedDecision,
          telemetry,
        };
      }
    }

    const resolution = await ctx.runQuery(
      generatedApi.internal.ai.mediaRetention.resolveFreshestVisionFrameForVoiceTurn,
      {
        organizationId: runtimeContext.organizationId,
        interviewSessionId: runtimeContext.interviewSessionId,
        conversationId: args.conversationId,
        liveSessionId: normalizeString(args.liveSessionId) ?? undefined,
        nowMs,
        maxFrameAgeMs,
      },
    ) as
      | {
          status: "attached";
          maxFrameAgeMs: number;
          frame: {
            retentionId: Id<"operatorMediaRetention">;
            capturedAt: number;
            mediaType: "video_frame" | "video_keyframe";
            mimeType: string;
            sizeBytes: number;
            storageId: Id<"_storage">;
            liveSessionId: string;
            videoSessionId?: string;
            sourceSequence?: number;
            ageMs: number;
          };
        }
      | {
          status: "degraded";
          maxFrameAgeMs: number;
          reason: "vision_frame_missing" | "vision_frame_stale" | "vision_policy_blocked";
          freshestCandidateCapturedAt?: number;
          freshestCandidateAgeMs?: number;
        };

    if (resolution.status !== "attached") {
      const telemetry = buildVisionTelemetry({
        reason: resolution.reason,
        source: "retention",
        frameAgeMs: resolution.freshestCandidateAgeMs,
      });
      return {
        ...resolution,
        telemetry,
      };
    }

    const storageUrl = await ctx.storage.getUrl(resolution.frame.storageId);
    const telemetry = buildVisionTelemetry({
      reason: "attached",
      source: "retention",
      frameAgeMs: resolution.frame.ageMs,
    });
    return {
      ...resolution,
      frame: {
        ...resolution.frame,
        storageUrl,
      },
      telemetry,
    };
  },
});

export const openVoiceSession = action({
  args: {
    sessionId: v.string(),
    interviewSessionId: v.id("agentSessions"),
    conversationId: v.optional(v.id("aiConversations")),
    expectedOrganizationId: v.optional(v.id("organizations")),
    expectedUserId: v.optional(v.id("users")),
    requestedProviderId: v.optional(
      v.union(v.literal("browser"), v.literal("elevenlabs")),
    ),
    requestedVoiceId: v.optional(v.string()),
    voiceSessionId: v.optional(v.string()),
    liveSessionId: v.optional(v.string()),
    sourceMode: v.optional(v.string()),
    voiceRuntime: v.optional(v.any()),
    transportRuntime: v.optional(v.any()),
    avObservability: v.optional(v.any()),
    clientSurface: v.optional(v.string()),
    attestationProofToken: v.optional(v.string()),
    persistentRequestedProviderId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const runtimeContext = (await ctx.runQuery(
      generatedApi.internal.ai.voiceRuntime.resolveVoiceRuntimeContext,
      {
        sessionId: args.sessionId,
        interviewSessionId: args.interviewSessionId,
      },
    )) as VoiceRuntimeContext;
    if (
      args.expectedOrganizationId &&
      String(args.expectedOrganizationId) !== String(runtimeContext.organizationId)
    ) {
      throw new Error("voice_session_open_authz_failed:organization_mismatch");
    }
    if (
      args.expectedUserId &&
      String(args.expectedUserId) !== String(runtimeContext.actorId)
    ) {
      throw new Error("voice_session_open_authz_failed:user_mismatch");
    }
    const requestedProviderId = normalizeVoiceRuntimeProviderId(
      args.requestedProviderId,
    );
    const securityDecision = resolveVoiceSessionOpenSecurityDecision({
      nowMs: Date.now(),
      enforceSourceAttestation: !normalizeString(args.attestationProofToken),
      clientSurface: normalizeString(args.clientSurface),
      liveSessionId: normalizeString(args.liveSessionId),
      sourceMode: normalizeString(args.sourceMode),
      voiceRuntime: normalizeObject(args.voiceRuntime),
      transportRuntime: normalizeObject(args.transportRuntime),
      avObservability: normalizeObject(args.avObservability),
    });
    const clientSurface = normalizeString(args.clientSurface) ?? "mobile_api_v1";
    const voiceRuntimeMetadata = normalizeObject(args.voiceRuntime);
    const sourceId = normalizeIdentityToken(voiceRuntimeMetadata?.sourceId);
    const sourceClass = normalizeSourceClassToken(
      voiceRuntimeMetadata?.sourceClass ?? voiceRuntimeMetadata?.sourceId,
    );
    const providerId = normalizeIdentityToken(voiceRuntimeMetadata?.providerId);
    if (
      securityDecision.protectedPath &&
      securityDecision.allowed &&
      securityDecision.canonicalLiveSessionId &&
      sourceId &&
      sourceClass &&
      providerId
    ) {
      const tokenCheck = verifyVoiceSessionOpenAttestationProofToken({
        token: normalizeString(args.attestationProofToken),
        nowMs: Date.now(),
        organizationId: String(runtimeContext.organizationId),
        userId: String(runtimeContext.actorId),
        interviewSessionId: String(runtimeContext.interviewSessionId),
        liveSessionId: securityDecision.canonicalLiveSessionId,
        sourceId,
        sourceClass,
        providerId,
        clientSurface,
      });
      if (!tokenCheck.ok) {
        throw new Error(
          `voice_session_open_attestation_failed:${tokenCheck.reasonCodes.join(",")}`,
        );
      }
    }
    if (securityDecision.protectedPath && !securityDecision.allowed) {
      throw new Error(
        `voice_session_open_attestation_failed:${securityDecision.reasonCodes.join(",")}`,
      );
    }
    const voiceResolution = resolveDeterministicVoiceDefaults({
      requestedVoiceId: args.requestedVoiceId,
      agentVoiceId: runtimeContext.agentVoiceId,
      orgDefaultVoiceId: runtimeContext.elevenLabsBinding?.defaultVoiceId,
    });
    const agentVoiceLanguage = runtimeContext.agentVoiceLanguage;
    console.info("[VoiceRuntime] open_session_voice_resolution", {
      requestedProviderId,
      requestedVoiceId: voiceResolution.requestedVoiceId,
      agentVoiceId: voiceResolution.agentVoiceId,
      agentVoiceLanguage: agentVoiceLanguage ?? null,
      bindingDefaultVoiceId: voiceResolution.orgDefaultVoiceId,
      platformDefaultVoiceId: voiceResolution.platformDefaultVoiceId,
      hardFallbackVoiceId: voiceResolution.hardFallbackVoiceId,
      resolvedVoiceId: voiceResolution.resolvedVoiceId,
      voiceResolutionSource: voiceResolution.voiceResolutionSource,
      hasElevenLabsBinding: Boolean(runtimeContext.elevenLabsBinding),
    });
    const voiceSessionId =
      normalizeString(args.voiceSessionId) ??
      `voice:${args.interviewSessionId}:${Date.now()}`;
    const nowMs = Date.now();
    const latestSession = await resolveLatestVoiceRuntimeSessionSnapshot(ctx, {
      organizationId: runtimeContext.organizationId,
      interviewSessionId: runtimeContext.interviewSessionId,
      voiceSessionId,
    });
    const cleanedSession = await applyStaleSessionCleanupIfNeeded(ctx, {
      runtimeContext,
      snapshot: latestSession,
      nowMs,
    });
    if (
      cleanedSession &&
      (cleanedSession.state === "opening" ||
        cleanedSession.state === "open" ||
        cleanedSession.state === "degraded")
    ) {
      const persistentMultimodal = await ctx.runAction(
        generatedApi.api.ai.voiceRuntime.resolvePersistentRealtimeMultimodalSessionLifecycle,
        {
          sessionId: args.sessionId,
          interviewSessionId: args.interviewSessionId,
          requestedProviderId: normalizeString(args.persistentRequestedProviderId) ?? undefined,
        },
      ) as PersistentRealtimeLifecycleSnapshot;
      return {
        success: true,
        voiceSessionId,
        providerId: cleanedSession.providerId ?? requestedProviderId,
        requestedProviderId,
        voiceResolutionSource: voiceResolution.voiceResolutionSource,
        fallbackProviderId: null,
        health: {
          providerId: cleanedSession.providerId ?? requestedProviderId,
          status: cleanedSession.state === "degraded" ? "degraded" : "healthy",
          checkedAt: nowMs,
          reason:
            cleanedSession.reason ??
            "voice_session_already_active",
        },
        nativeBridge: buildVoiceRuntimeNativeBridgeMetadata({
          voiceSessionId,
          sessionState: "open",
          requestedProviderId,
          providerId: cleanedSession.providerId ?? requestedProviderId,
          fallbackProviderId: null,
          fallbackReason: cleanedSession.reason ?? "voice_session_already_active",
        }),
        fsmState: cleanedSession.state,
        idempotent: true,
        persistentMultimodal,
      };
    }
    const rateLimitLiveSessionId =
      securityDecision.canonicalLiveSessionId ??
      normalizeString(args.liveSessionId) ??
      `interview:${runtimeContext.interviewSessionId}`;
    const rateLimitProfile = await ctx.runQuery(
      generatedApi.internal.ai.voiceRuntime.resolveVoiceSessionOpenRateLimitProfile,
      {
        organizationId: runtimeContext.organizationId,
      },
    );
    const rateLimit = await ctx.runMutation(
      generatedApi.internal.ai.voiceRuntime.enforceVoiceSessionOpenRateLimit,
      {
        organizationId: runtimeContext.organizationId,
        interviewSessionId: runtimeContext.interviewSessionId,
        liveSessionId: rateLimitLiveSessionId,
        nowMs,
        windowMs: rateLimitProfile.windowMs,
        maxRequests: rateLimitProfile.maxRequests,
      },
    );
    if (!rateLimit.allowed) {
      throw new Error(
        `voice_session_open_rate_limited:${rateLimit.retryAfterMs}`,
      );
    }

    await emitVoiceSessionTransitionEvent(ctx, {
      runtimeContext,
      voiceSessionId,
      fromState: cleanedSession?.state,
      toState: "opening",
      reason: "voice_session_open_requested",
      providerId: cleanedSession?.providerId ?? requestedProviderId,
      requestedProviderId,
      fallbackProviderId: null,
    });

    const resolved = await resolveVoiceRuntimeAdapter({
      requestedProviderId,
      elevenLabsBinding: runtimeContext.elevenLabsBinding,
      fetchFn: fetch,
    });
    const persistentFeatureFlagEnabled = isPersistentRealtimeMultimodalEnabled();
    const persistentAdapter = persistentFeatureFlagEnabled
      ? await resolvePersistentRealtimeMultimodalAdapter({
          requestedProviderId:
            normalizeString(args.persistentRequestedProviderId) ?? undefined,
          geminiBinding: runtimeContext.geminiBinding,
        })
      : null;
    let persistentMultimodal = buildPersistentRealtimeLifecycleSnapshot({
      mode: "turn_stitch",
      featureFlagEnabled: persistentFeatureFlagEnabled,
      fallbackReason: persistentFeatureFlagEnabled
        ? "provider_capability_unsupported"
        : "feature_flag_disabled",
      providerId: persistentAdapter?.requestedProviderId ?? null,
      healthStatus: persistentAdapter?.health.status ?? null,
    });
    let session;
    try {
      session = await resolved.adapter.openSession({
        voiceSessionId,
        organizationId: String(runtimeContext.organizationId),
        interviewSessionId: String(runtimeContext.interviewSessionId),
        voiceId: voiceResolution.resolvedVoiceId,
      });
      if (persistentFeatureFlagEnabled && persistentAdapter?.adapter) {
        try {
          const persistentSession = await persistentAdapter.adapter.openSession({
            voiceSessionId,
            organizationId: String(runtimeContext.organizationId),
            interviewSessionId: String(runtimeContext.interviewSessionId),
            conversationId: args.conversationId
              ? String(args.conversationId)
              : undefined,
            liveSessionId: normalizeString(args.liveSessionId) ?? undefined,
          });
          persistentMultimodal = buildPersistentRealtimeLifecycleSnapshot({
            mode: "persistent_realtime_multimodal",
            featureFlagEnabled: persistentFeatureFlagEnabled,
            providerId: persistentSession.providerId,
            providerSessionId: persistentSession.providerSessionId,
            transport: persistentSession.transport,
            healthStatus: persistentAdapter.health.status,
          });
        } catch (persistentError) {
          console.warn(
            "[VoiceRuntime] persistent_realtime_multimodal_open_failed",
            persistentError,
          );
          persistentMultimodal = buildPersistentRealtimeLifecycleSnapshot({
            mode: "turn_stitch",
            featureFlagEnabled: persistentFeatureFlagEnabled,
            providerId: persistentAdapter.requestedProviderId,
            fallbackReason: "session_handshake_failed",
            healthStatus: persistentAdapter.health.status,
          });
        }
      }
    } catch (error) {
      await emitVoiceSessionTransitionEvent(ctx, {
        runtimeContext,
        voiceSessionId,
        fromState: "opening",
        toState: "error",
        reason:
          normalizeString(error instanceof Error ? error.message : undefined) ??
          "voice_session_open_failed",
        providerId: resolved.adapter.providerId,
        requestedProviderId,
        fallbackProviderId: resolved.fallbackFromProviderId ?? null,
      });
      throw error;
    }
    const targetState = resolveOpenSessionTargetState({ health: resolved.health });
    await emitVoiceSessionTransitionEvent(ctx, {
      runtimeContext,
      voiceSessionId,
      fromState: "opening",
      toState: targetState,
      reason: "voice_session_open",
      providerId: session.providerId,
      requestedProviderId,
      fallbackProviderId: resolved.fallbackFromProviderId ?? null,
    });
    const nativeBridge = buildVoiceRuntimeNativeBridgeMetadata({
      voiceSessionId,
      sessionState: "open",
      requestedProviderId,
      providerId: session.providerId,
      fallbackProviderId: resolved.fallbackFromProviderId ?? null,
      fallbackReason: resolved.health.reason ?? null,
    });

    if (resolved.fallbackFromProviderId) {
      await emitVoiceFailoverEvent(ctx, {
        organizationId: runtimeContext.organizationId,
        interviewSessionId: runtimeContext.interviewSessionId,
        actorId: runtimeContext.actorId,
        voiceSessionId,
        requestedProviderId,
        fallbackProviderId: resolved.adapter.providerId,
        health: resolved.health,
        reason: resolved.health.reason ?? "provider_health_degraded",
      });
    }

    try {
      await recordVoiceUsage({
        ctx,
        runtimeContext,
        voiceSessionId,
        requestType: "voice_session",
        action: "voice_session_open",
        creditLedgerAction: "voice_session_open",
        providerId: session.providerId,
        success: true,
        usage: {
          nativeUsageUnit: "sessions",
          nativeUsageQuantity: 1,
          nativeTotalUnits: 1,
          nativeCostSource: "not_available",
        },
        metadata: {
          requestedProviderId,
          fallbackProviderId: resolved.fallbackFromProviderId ?? null,
          healthStatus: resolved.health.status,
          nativeBridge,
        },
      });
    } catch (error) {
      console.error("[VoiceRuntime] Failed to record voice session open usage:", error);
    }

    return {
      success: true,
      voiceSessionId,
      providerId: session.providerId,
      requestedProviderId,
      fallbackProviderId: resolved.fallbackFromProviderId ?? null,
      health: resolved.health,
      nativeBridge,
      fsmState: targetState,
      idempotent: false,
      persistentMultimodal,
    };
  },
});

export const closeVoiceSession = action({
  args: {
    sessionId: v.string(),
    interviewSessionId: v.id("agentSessions"),
    voiceSessionId: v.string(),
    activeProviderId: v.optional(
      v.union(v.literal("browser"), v.literal("elevenlabs")),
    ),
    reason: v.optional(v.string()),
    persistentRequestedProviderId: v.optional(v.string()),
    persistentProviderSessionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const nowMs = Date.now();
    let runtimeContext: VoiceRuntimeContext;
    try {
      runtimeContext = (await ctx.runQuery(
        generatedApi.internal.ai.voiceRuntime.resolveVoiceRuntimeContext,
        {
          sessionId: args.sessionId,
          interviewSessionId: args.interviewSessionId,
        },
      )) as VoiceRuntimeContext;
    } catch (error) {
      if (!isIgnorableVoiceSessionCloseAuthError(error)) {
        throw error;
      }
      const requestedProviderId = normalizeVoiceRuntimeProviderId(
        args.activeProviderId,
      );
      return {
        success: true,
        providerId: requestedProviderId,
        health: {
          providerId: requestedProviderId,
          status: "healthy",
          checkedAt: nowMs,
          reason: "voice_session_close_auth_session_invalid_ignored",
        },
        nativeBridge: buildVoiceRuntimeNativeBridgeMetadata({
          voiceSessionId: args.voiceSessionId,
          sessionState: "closed",
          requestedProviderId,
          providerId: requestedProviderId,
          fallbackProviderId: null,
          fallbackReason: "voice_session_close_auth_session_invalid_ignored",
        }),
        fsmState: "closed" as const,
        idempotent: true,
        persistentMultimodal: buildPersistentRealtimeLifecycleSnapshot({
          mode: "turn_stitch",
          featureFlagEnabled: isPersistentRealtimeMultimodalEnabled(),
        }),
      };
    }
    const latestSession = await resolveLatestVoiceRuntimeSessionSnapshot(ctx, {
      organizationId: runtimeContext.organizationId,
      interviewSessionId: runtimeContext.interviewSessionId,
      voiceSessionId: args.voiceSessionId,
    });
    const cleanedSession = await applyStaleSessionCleanupIfNeeded(ctx, {
      runtimeContext,
      snapshot: latestSession,
      nowMs,
    });
    if (cleanedSession?.state === "closed") {
      return {
        success: true,
        providerId: cleanedSession.providerId ?? "browser",
        health: {
          providerId: cleanedSession.providerId ?? "browser",
          status: "healthy",
          checkedAt: nowMs,
          reason:
            cleanedSession.reason ??
            "voice_session_already_closed",
        },
        nativeBridge: buildVoiceRuntimeNativeBridgeMetadata({
          voiceSessionId: args.voiceSessionId,
          sessionState: "closed",
          requestedProviderId:
            cleanedSession.requestedProviderId ?? "browser",
          providerId: cleanedSession.providerId ?? "browser",
          fallbackProviderId: null,
          fallbackReason: cleanedSession.reason ?? "voice_session_already_closed",
        }),
        fsmState: "closed" as const,
        idempotent: true,
        persistentMultimodal: buildPersistentRealtimeLifecycleSnapshot({
          mode: "turn_stitch",
          featureFlagEnabled: isPersistentRealtimeMultimodalEnabled(),
        }),
      };
    }
    if (!cleanedSession) {
      const requestedProviderId = normalizeVoiceRuntimeProviderId(
        args.activeProviderId,
      );
      return {
        success: true,
        providerId: requestedProviderId,
        health: {
          providerId: requestedProviderId,
          status: "healthy",
          checkedAt: nowMs,
          reason: "voice_session_not_found_already_closed",
        },
        nativeBridge: buildVoiceRuntimeNativeBridgeMetadata({
          voiceSessionId: args.voiceSessionId,
          sessionState: "closed",
          requestedProviderId,
          providerId: requestedProviderId,
          fallbackProviderId: null,
          fallbackReason: "voice_session_not_found_already_closed",
        }),
        fsmState: "closed" as const,
        idempotent: true,
        persistentMultimodal: buildPersistentRealtimeLifecycleSnapshot({
          mode: "turn_stitch",
          featureFlagEnabled: isPersistentRealtimeMultimodalEnabled(),
        }),
      };
    }

    const requestedProviderId = normalizeVoiceRuntimeProviderId(
      args.activeProviderId ??
        cleanedSession?.requestedProviderId ??
        cleanedSession?.providerId,
    );
    const resolved = await resolveVoiceRuntimeAdapter({
      requestedProviderId,
      elevenLabsBinding: runtimeContext.elevenLabsBinding,
      fetchFn: fetch,
    });
    const persistentFeatureFlagEnabled = isPersistentRealtimeMultimodalEnabled();
    let persistentMultimodal = buildPersistentRealtimeLifecycleSnapshot({
      mode: "turn_stitch",
      featureFlagEnabled: persistentFeatureFlagEnabled,
      fallbackReason: persistentFeatureFlagEnabled
        ? "provider_capability_unsupported"
        : "feature_flag_disabled",
    });
    if (persistentFeatureFlagEnabled) {
      const persistentAdapter = await resolvePersistentRealtimeMultimodalAdapter({
        requestedProviderId:
          normalizeString(args.persistentRequestedProviderId) ?? undefined,
        geminiBinding: runtimeContext.geminiBinding,
      });
      if (persistentAdapter.adapter) {
        const providerSessionId = normalizeString(args.persistentProviderSessionId);
        if (providerSessionId) {
          try {
            await persistentAdapter.adapter.closeSession({
              providerSessionId,
              reason: normalizeString(args.reason) ?? "voice_session_close",
            });
          } catch (persistentCloseError) {
            console.warn(
              "[VoiceRuntime] persistent_realtime_multimodal_close_failed",
              persistentCloseError,
            );
          }
          persistentMultimodal = buildPersistentRealtimeLifecycleSnapshot({
            mode: "persistent_realtime_multimodal",
            featureFlagEnabled: persistentFeatureFlagEnabled,
            providerId: persistentAdapter.adapter.providerId,
            providerSessionId,
            transport: "native_realtime_audio_video",
            healthStatus: persistentAdapter.health.status,
          });
        } else {
          persistentMultimodal = buildPersistentRealtimeLifecycleSnapshot({
            mode: "turn_stitch",
            featureFlagEnabled: persistentFeatureFlagEnabled,
            providerId: persistentAdapter.adapter.providerId,
            fallbackReason: "session_handshake_failed",
            healthStatus: persistentAdapter.health.status,
          });
        }
      }
    }
    const nativeBridge = buildVoiceRuntimeNativeBridgeMetadata({
      voiceSessionId: args.voiceSessionId,
      sessionState: "closed",
      requestedProviderId,
      providerId: resolved.adapter.providerId,
      fallbackProviderId: resolved.fallbackFromProviderId ?? null,
      fallbackReason: normalizeString(args.reason) ?? resolved.health.reason ?? null,
    });
    await emitVoiceSessionTransitionEvent(ctx, {
      runtimeContext,
      voiceSessionId: args.voiceSessionId,
      fromState: cleanedSession?.state,
      toState: "closing",
      reason: normalizeString(args.reason) ?? "voice_session_close_requested",
      providerId: resolved.adapter.providerId,
      requestedProviderId,
      fallbackProviderId: resolved.fallbackFromProviderId ?? null,
    });
    try {
      await resolved.adapter.closeSession({
        voiceSessionId: args.voiceSessionId,
        reason: normalizeString(args.reason) ?? "voice_session_close",
      });
    } catch (error) {
      if (isAlreadyClosedRemoteError(error)) {
        await emitVoiceSessionTransitionEvent(ctx, {
          runtimeContext,
          voiceSessionId: args.voiceSessionId,
          fromState: "closing",
          toState: "closed",
          reason: "voice_session_close_remote_already_closed",
          providerId: resolved.adapter.providerId,
          requestedProviderId,
          fallbackProviderId: resolved.fallbackFromProviderId ?? null,
        });
        return {
          success: true,
          providerId: resolved.adapter.providerId,
          health: resolved.health,
          nativeBridge,
          fsmState: "closed" as const,
          idempotent: true,
          persistentMultimodal,
        };
      }
      await emitVoiceSessionTransitionEvent(ctx, {
        runtimeContext,
        voiceSessionId: args.voiceSessionId,
        fromState: "closing",
        toState: "error",
        reason:
          normalizeString(error instanceof Error ? error.message : undefined) ??
          "voice_session_close_failed",
        providerId: resolved.adapter.providerId,
        requestedProviderId,
        fallbackProviderId: resolved.fallbackFromProviderId ?? null,
      });
      throw error;
    }
    await emitVoiceSessionTransitionEvent(ctx, {
      runtimeContext,
      voiceSessionId: args.voiceSessionId,
      fromState: "closing",
      toState: "closed",
      reason: normalizeString(args.reason) ?? "voice_session_close",
      providerId: resolved.adapter.providerId,
      requestedProviderId,
      fallbackProviderId: resolved.fallbackFromProviderId ?? null,
    });

    try {
      await recordVoiceUsage({
        ctx,
        runtimeContext,
        voiceSessionId: args.voiceSessionId,
        requestType: "voice_session",
        action: "voice_session_close",
        creditLedgerAction: "voice_session_close",
        providerId: resolved.adapter.providerId,
        success: true,
        usage: {
          nativeUsageUnit: "sessions",
          nativeUsageQuantity: 1,
          nativeTotalUnits: 1,
          nativeCostSource: "not_available",
        },
        metadata: {
          requestedProviderId,
          healthStatus: resolved.health.status,
          reason: normalizeString(args.reason) ?? "voice_session_close",
          nativeBridge,
        },
      });
    } catch (error) {
      console.error("[VoiceRuntime] Failed to record voice session close usage:", error);
    }

    return {
      success: true,
      providerId: resolved.adapter.providerId,
      health: resolved.health,
      nativeBridge,
      fsmState: "closed" as const,
      idempotent: false,
      persistentMultimodal,
    };
  },
});

export const transcribeVoiceAudio = action({
  args: {
    sessionId: v.string(),
    interviewSessionId: v.id("agentSessions"),
    voiceSessionId: v.string(),
    audioBase64: v.string(),
    mimeType: v.optional(v.string()),
    requestedProviderId: v.optional(
      v.union(v.literal("browser"), v.literal("elevenlabs")),
    ),
    requestedVoiceId: v.optional(v.string()),
    language: v.optional(v.string()),
    transcriptionTelemetry: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const runtimeContext = (await ctx.runQuery(
      generatedApi.internal.ai.voiceRuntime.resolveVoiceRuntimeContext,
      {
        sessionId: args.sessionId,
        interviewSessionId: args.interviewSessionId,
      },
    )) as VoiceRuntimeContext;
    const requestedProviderId = normalizeVoiceRuntimeProviderId(
      args.requestedProviderId,
    );
    const resolved = await resolveVoiceRuntimeAdapter({
      requestedProviderId,
      elevenLabsBinding: runtimeContext.elevenLabsBinding,
      fetchFn: fetch,
    });
    const nativeBridge = buildVoiceRuntimeNativeBridgeMetadata({
      voiceSessionId: args.voiceSessionId,
      sessionState: "stt",
      requestedProviderId,
      providerId: resolved.adapter.providerId,
      fallbackProviderId: resolved.fallbackFromProviderId ?? null,
      fallbackReason: resolved.health.reason ?? null,
    });
    const normalizedMimeType = normalizeString(args.mimeType) ?? "audio/webm";
    const transcriptionTelemetry = normalizeObject(args.transcriptionTelemetry);
    const recorderMimeType = normalizeString(
      transcriptionTelemetry?.recorderMimeType,
    );
    const blobMimeType = normalizeString(transcriptionTelemetry?.blobMimeType);
    const blobSizeBytes = normalizeTelemetryInteger(
      transcriptionTelemetry?.blobSizeBytes,
    );
    const retryPath = normalizeString(transcriptionTelemetry?.retryPath);
    const sourceBlobMimeType = normalizeString(
      transcriptionTelemetry?.sourceBlobMimeType,
    );
    const sourceBlobSizeBytes = normalizeTelemetryInteger(
      transcriptionTelemetry?.sourceBlobSizeBytes,
    );
    const captureChunkCount = normalizeTelemetryInteger(
      transcriptionTelemetry?.captureChunkCount,
    );
    const captureChunkBytes = normalizeTelemetryInteger(
      transcriptionTelemetry?.captureChunkBytes,
    );
    const realtimeFrameCount = normalizeTelemetryInteger(
      transcriptionTelemetry?.realtimeFrameCount,
    );
    const realtimeFrameBytes = normalizeTelemetryInteger(
      transcriptionTelemetry?.realtimeFrameBytes,
    );
    const realtimeTransportRoute = normalizeString(
      transcriptionTelemetry?.realtimeTransportRoute,
    );
    const realtimeFallbackReason = normalizeString(
      transcriptionTelemetry?.realtimeFallbackReason,
    );
    const retentionConfig = resolveOperatorMediaRetentionConfig();
    let finalAudioRetention:
      | {
          attempted: boolean;
          persisted: boolean;
          idempotent: boolean;
          retentionMode?: "metadata_only" | "full";
          retentionId?: string;
          reason?: string;
          error?: string;
        }
      | undefined;
    const finalAudioRetentionWriteRequest = buildOperatorMediaRetentionWriteRequest({
      config: retentionConfig,
      organizationId: runtimeContext.organizationId,
      interviewSessionId: runtimeContext.interviewSessionId,
      liveSessionId:
        normalizeString(transcriptionTelemetry?.liveSessionId) ?? args.voiceSessionId,
      mediaType: "audio_final",
      mimeType: normalizedMimeType,
      capturedAt:
        normalizeTelemetryInteger(transcriptionTelemetry?.capturedAtMs) ?? Date.now(),
      sourceClass: normalizeString(transcriptionTelemetry?.sourceClass) ?? undefined,
      sourceId: normalizeString(transcriptionTelemetry?.sourceId) ?? undefined,
      sourceSequence: normalizeTelemetryInteger(transcriptionTelemetry?.packetSequence),
      voiceSessionId: args.voiceSessionId,
      payloadBase64: args.audioBase64,
      metadata: {
        recorderMimeType,
        blobMimeType,
        blobSizeBytes,
        sourceBlobMimeType,
        sourceBlobSizeBytes,
        retryPath,
        realtimeTransportRoute,
        realtimeFallbackReason,
      },
    });
    if (finalAudioRetentionWriteRequest) {
      try {
        const retained = (await ctx.runAction(
          generatedApi.internal.ai.mediaRetention.persistRetainedMediaPayload,
          finalAudioRetentionWriteRequest,
        )) as {
          retentionId: Id<"operatorMediaRetention">;
          storageId: Id<"_storage"> | null;
          idempotent: boolean;
        };
        finalAudioRetention = {
          attempted: true,
          persisted: true,
          idempotent: Boolean(retained.idempotent),
          retentionMode: finalAudioRetentionWriteRequest.retentionMode,
          retentionId: String(retained.retentionId),
          reason: finalAudioRetentionWriteRequest.policy.reason,
        };
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "operator_final_audio_retention_failed";
        finalAudioRetention = {
          attempted: true,
          persisted: false,
          idempotent: false,
          retentionMode: finalAudioRetentionWriteRequest.retentionMode,
          reason: finalAudioRetentionWriteRequest.policy.reason,
          error: message,
        };
        if (finalAudioRetentionWriteRequest.policy.failClosed) {
          throw new Error(`operator_media_retention_fail_closed:${message}`);
        }
        console.error("[VoiceRuntime] operator_final_audio_retention_non_blocking_failure", {
          error: message,
          voiceSessionId: args.voiceSessionId,
        });
      }
    }
    emitVoiceTelemetry("stt_request_received", {
      voiceSessionId: args.voiceSessionId,
      interviewSessionId: String(args.interviewSessionId),
      requestedProviderId,
      resolvedProviderId: resolved.adapter.providerId,
      fallbackProviderId: resolved.fallbackFromProviderId ?? null,
      mimeType: normalizedMimeType,
      base64Length: args.audioBase64.length,
      language: normalizeString(args.language) ?? null,
      recorderMimeType,
      blobMimeType,
      blobSizeBytes,
      retryPath,
      sourceBlobMimeType,
      sourceBlobSizeBytes,
      captureChunkCount,
      captureChunkBytes,
      realtimeFrameCount,
      realtimeFrameBytes,
      realtimeTransportRoute,
      realtimeFallbackReason,
      mediaRetentionAttempted: finalAudioRetention?.attempted ?? false,
      mediaRetentionPersisted: finalAudioRetention?.persisted ?? false,
      mediaRetentionMode: finalAudioRetention?.retentionMode ?? null,
      sttRoutePrecedence: [
        VOICE_REALTIME_STT_PRIMARY_ROUTE,
        VOICE_REALTIME_STT_FAILOVER_ROUTE,
      ],
    });
    if (resolved.fallbackFromProviderId) {
      await emitVoiceFailoverEvent(ctx, {
        organizationId: runtimeContext.organizationId,
        interviewSessionId: runtimeContext.interviewSessionId,
        actorId: runtimeContext.actorId,
        voiceSessionId: args.voiceSessionId,
        requestedProviderId,
        fallbackProviderId: resolved.adapter.providerId,
        health: resolved.health,
        reason: resolved.health.reason ?? "provider_health_degraded",
      });
    }

    if (resolved.adapter.providerId === "browser") {
      emitVoiceTelemetry("stt_request_rejected_browser_runtime", {
        voiceSessionId: args.voiceSessionId,
        requestedProviderId,
        resolvedProviderId: resolved.adapter.providerId,
      });
      try {
        await recordVoiceUsage({
          ctx,
          runtimeContext,
          voiceSessionId: args.voiceSessionId,
          requestType: "voice_stt",
          action: "voice_transcription",
          creditLedgerAction: "voice_transcription",
          providerId: resolved.adapter.providerId,
          success: false,
          errorMessage: "browser_runtime_requires_client_side_voice_processing",
          usage: null,
          metadata: {
            requestedProviderId,
            fallbackProviderId: resolved.fallbackFromProviderId ?? "browser",
            nativeBridge,
          },
        });
      } catch (error) {
        console.error("[VoiceRuntime] Failed to record browser STT usage:", error);
      }
      return {
        success: false,
        providerId: resolved.adapter.providerId,
        requestedProviderId,
        fallbackProviderId: resolved.fallbackFromProviderId ?? "browser",
        health: resolved.health,
        error: "browser_runtime_requires_client_side_voice_processing",
        nativeBridge,
        retention: finalAudioRetention ?? null,
      };
    }

    try {
      const decodedAudioBytes = decodeBase64Audio(args.audioBase64);
      const decodedVsBlobSizeDelta =
        blobSizeBytes !== undefined
          ? decodedAudioBytes.byteLength - blobSizeBytes
          : undefined;
      emitVoiceTelemetry("stt_request_decoded", {
        voiceSessionId: args.voiceSessionId,
        mimeType: normalizedMimeType,
        decodedBytes: decodedAudioBytes.byteLength,
        decodedVsBlobSizeDelta,
        decodedMatchesBlobSize:
          blobSizeBytes !== undefined
            ? decodedAudioBytes.byteLength === blobSizeBytes
            : undefined,
      });
      const transcript = await transcribeWithRealtimeSttPrecedence({
        voiceSessionId: args.voiceSessionId,
        resolvedAdapter: resolved,
        geminiBinding: runtimeContext.geminiBinding,
        audioBytes: decodedAudioBytes,
        mimeType: normalizedMimeType,
        language: normalizeString(args.language) ?? undefined,
      });
      const sanitizedTranscriptText = sanitizeTranscriptForVoiceTurn(
        transcript.transcriptText,
      );
      const loggedTranscriptText = sanitizedTranscriptText ?? "";
      if (loggedTranscriptText) {
        console.info(
          `[VoiceRuntime] Transcription result: "${loggedTranscriptText.slice(0, 240)}"`,
        );
      } else if (normalizeString(transcript.transcriptText)) {
        console.info(
          `[VoiceRuntime] Ignored ambient transcript session=${args.voiceSessionId}.`,
          buildAmbientTranscriptDebugSnapshot(transcript.transcriptText),
        );
      }
      emitVoiceTelemetry("stt_result_success", {
        voiceSessionId: args.voiceSessionId,
        providerId: transcript.providerId,
        textLength: (transcript.transcriptText || "").trim().length,
        sanitizedTextLength: sanitizedTranscriptText?.length ?? 0,
        ambientFiltered: Boolean(
          !sanitizedTranscriptText && normalizeString(transcript.transcriptText)
        ),
        retryPath,
        recorderMimeType,
        blobMimeType,
        blobSizeBytes,
        sttRoute: transcript.route,
        sttRouteProvider: transcript.routeProvider,
        sttRoutePrecedence: [
          VOICE_REALTIME_STT_PRIMARY_ROUTE,
          VOICE_REALTIME_STT_FAILOVER_ROUTE,
        ],
      });

      await emitVoiceTrustEvent(ctx, {
        eventName: "trust.voice.adaptive_flow_decision.v1",
        organizationId: runtimeContext.organizationId,
        interviewSessionId: runtimeContext.interviewSessionId,
        actorId: runtimeContext.actorId,
        mode: "runtime",
        additionalPayload: {
          voice_session_id: args.voiceSessionId,
          adaptive_phase_id: "stt_transport",
          adaptive_decision: "provider_transcription",
          adaptive_confidence: 1,
          consent_checkpoint_id: "cp0_capture_notice",
          stt_route: transcript.route,
          stt_route_provider: transcript.routeProvider,
        },
      });

      try {
        const transcriptBridge = buildVoiceRuntimeNativeBridgeMetadata({
          voiceSessionId: args.voiceSessionId,
          sessionState: "stt",
          requestedProviderId,
          providerId: transcript.providerId,
          fallbackProviderId: resolved.fallbackFromProviderId ?? null,
          fallbackReason: resolved.health.reason ?? null,
        });
        await recordVoiceUsage({
          ctx,
          runtimeContext,
          voiceSessionId: args.voiceSessionId,
          requestType: "voice_stt",
          action: "voice_transcription",
          creditLedgerAction: "voice_transcription",
          providerId: transcript.providerId,
          success: true,
          usage: transcript.usage ?? null,
          metadata: {
            requestedProviderId,
            fallbackProviderId: resolved.fallbackFromProviderId ?? null,
            healthStatus: resolved.health.status,
            nativeBridge: transcriptBridge,
            sttRoute: transcript.route,
            sttRouteProvider: transcript.routeProvider,
          },
        });
      } catch (recordError) {
        console.error("[VoiceRuntime] Failed to record successful STT usage:", recordError);
      }

      return {
        success: true,
        text: sanitizedTranscriptText ?? "",
        noSpeechDetected: sanitizedTranscriptText ? undefined : true,
        providerId: transcript.providerId,
        requestedProviderId,
        fallbackProviderId: resolved.fallbackFromProviderId ?? null,
        health: resolved.health,
        nativeBridge: buildVoiceRuntimeNativeBridgeMetadata({
          voiceSessionId: args.voiceSessionId,
          sessionState: "stt",
          requestedProviderId,
          providerId: transcript.providerId,
          fallbackProviderId: resolved.fallbackFromProviderId ?? null,
          fallbackReason: resolved.health.reason ?? null,
        }),
        sttRoute: transcript.route,
        sttRouteProvider: transcript.routeProvider,
        retention: finalAudioRetention ?? null,
      };
    } catch (error) {
      if (isNoTranscriptTextError(error)) {
        emitVoiceTelemetry("stt_result_no_speech", {
          voiceSessionId: args.voiceSessionId,
          providerId: resolved.adapter.providerId,
        });
        console.warn(
          "[VoiceRuntime] Empty transcript from provider; treating frame as no speech.",
        );
        return {
          success: true,
          text: "",
          noSpeechDetected: true,
          providerId: resolved.adapter.providerId,
          requestedProviderId,
          fallbackProviderId: resolved.fallbackFromProviderId ?? null,
          health: resolved.health,
          nativeBridge,
          retention: finalAudioRetention ?? null,
        };
      }
      const transcriptionError =
        error instanceof Error
          ? error.message
          : "Voice transcription failed.";
      emitVoiceTelemetry("stt_result_failed", {
        voiceSessionId: args.voiceSessionId,
        providerId: resolved.adapter.providerId,
        error: transcriptionError,
        probableContainerCorruption: transcriptionError.toLowerCase().includes("corrupt"),
        retryPath,
        recorderMimeType,
        blobMimeType,
        blobSizeBytes,
        sourceBlobMimeType,
        sourceBlobSizeBytes,
        captureChunkCount,
        captureChunkBytes,
        sttRoutePrecedence: [
          VOICE_REALTIME_STT_PRIMARY_ROUTE,
          VOICE_REALTIME_STT_FAILOVER_ROUTE,
        ],
      });
      try {
        await recordVoiceUsage({
          ctx,
          runtimeContext,
          voiceSessionId: args.voiceSessionId,
          requestType: "voice_stt",
          action: "voice_transcription",
          creditLedgerAction: "voice_transcription",
          providerId: resolved.adapter.providerId,
          success: false,
          errorMessage: transcriptionError,
          usage: null,
          metadata: {
            requestedProviderId,
            fallbackProviderId: resolved.fallbackFromProviderId ?? null,
            healthStatus: resolved.health.status,
            nativeBridge,
          },
        });
      } catch (recordError) {
        console.error("[VoiceRuntime] Failed to record failed STT usage:", recordError);
      }
      return {
        success: false,
        providerId: resolved.adapter.providerId,
        requestedProviderId,
        fallbackProviderId: resolved.fallbackFromProviderId ?? null,
        health: resolved.health,
        error: transcriptionError,
        nativeBridge,
        retention: finalAudioRetention ?? null,
      };
    }
  },
});

export const ingestVoiceTransportEnvelope = action({
  args: {
    sessionId: v.string(),
    interviewSessionId: v.id("agentSessions"),
    conversationId: v.optional(v.id("aiConversations")),
    requestedProviderId: v.optional(
      v.union(v.literal("browser"), v.literal("elevenlabs")),
    ),
    conversationRuntime: v.optional(v.any()),
    voiceRuntime: v.optional(v.any()),
    transportRuntime: v.optional(v.any()),
    avObservability: v.optional(v.any()),
    envelope: voiceTransportEnvelopeValidator,
  },
  handler: async (ctx, args) => {
    const runtimeContext = (await ctx.runQuery(
      generatedApi.internal.ai.voiceRuntime.resolveVoiceRuntimeContext,
      {
        sessionId: args.sessionId,
        interviewSessionId: args.interviewSessionId,
      },
    )) as VoiceRuntimeContext;
    const envelope = args.envelope as VoiceTransportEnvelopeContract;
    assertVoiceTransportEnvelope(envelope);
    emitVoiceTelemetry("transport_ingest_received", {
      voiceSessionId: envelope.voiceSessionId,
      interviewSessionId: envelope.interviewSessionId,
      eventType: envelope.eventType,
      sequence: envelope.sequence,
      transportMode: envelope.transportMode,
      audioChunkBase64Length:
        typeof envelope.audioChunkBase64 === "string"
          ? envelope.audioChunkBase64.length
          : 0,
    });

    if (
      normalizeString(envelope.interviewSessionId) !==
      String(runtimeContext.interviewSessionId)
    ) {
      throw new Error("Voice transport envelope interviewSessionId mismatch.");
    }

    const ingestCheckpointSnapshot = (await ctx.runQuery(
      generatedApi.internal.ai.voiceRuntime.resolveVoiceTransportIngestCheckpoint,
      {
        organizationId: runtimeContext.organizationId,
        interviewSessionId: runtimeContext.interviewSessionId,
        voiceSessionId: envelope.voiceSessionId,
      },
    )) as VoiceTransportIngestCheckpointSnapshot;
    const acceptedReplaysBySequence = new Map<
      number,
      VoiceTransportAcceptedReplaySnapshot
    >();
    for (const [sequenceKey, replayEvents] of Object.entries(
      ingestCheckpointSnapshot.acceptedReplayEventsBySequence ?? {},
    )) {
      const sequence = Number(sequenceKey);
      if (!Number.isInteger(sequence) || sequence < 0) {
        continue;
      }
      acceptedReplaysBySequence.set(sequence, { relayEvents: replayEvents });
    }
    const ingestCheckpoint: VoiceTransportIngestCheckpointState = {
      acceptedSequences: new Set(ingestCheckpointSnapshot.acceptedSequences),
      acceptedReplaysBySequence,
      lastAcceptedSequence: ingestCheckpointSnapshot.lastAcceptedSequence,
    };
    const sequenceDecision = resolveVoiceTransportSequenceDecision({
      sequence: envelope.sequence,
      acceptedSequences: ingestCheckpoint.acceptedSequences,
      lastAcceptedSequence: ingestCheckpoint.lastAcceptedSequence,
    });
    const requestedProviderId = normalizeVoiceRuntimeProviderId(
      args.requestedProviderId,
    );
    const normalizedConversationRuntime = normalizeObject(args.conversationRuntime);
    const normalizedVoiceRuntime = normalizeObject(args.voiceRuntime);
    const normalizedTransportRuntime = normalizeObject(args.transportRuntime);
    const normalizedAvObservability = normalizeObject(args.avObservability);
    const realtimeTranscriptionLanguage = resolveRealtimeTranscriptionLanguageHint({
      conversationRuntime: normalizedConversationRuntime,
      voiceRuntime: normalizedVoiceRuntime,
      runtimeFallbackLanguage: runtimeContext.agentVoiceLanguage,
    });
    const retentionConfig = resolveOperatorMediaRetentionConfig();
    const retainedVoiceMediaType = resolveVoiceEnvelopeRetainedMediaType(envelope.eventType);
    let retentionIngest:
      | {
          attempted: boolean;
          persisted: boolean;
          idempotent: boolean;
          retentionMode?: "metadata_only" | "full";
          retentionId?: string;
          reason?: string;
          error?: string;
        }
      | undefined;
    if (sequenceDecision.decision === "accepted" && retainedVoiceMediaType) {
      const retentionWriteRequest = buildOperatorMediaRetentionWriteRequest({
        config: retentionConfig,
        organizationId: runtimeContext.organizationId,
        conversationId: args.conversationId,
        interviewSessionId: runtimeContext.interviewSessionId,
        liveSessionId: envelope.liveSessionId,
        mediaType: retainedVoiceMediaType,
        mimeType:
          normalizeTranscriptionMimeType(envelope.transcriptionMimeType) ??
          (envelope.pcm
            ? resolvePcmTranscriptionMimeType(envelope.pcm)
            : "audio/wav"),
        capturedAt: envelope.timestampMs,
        sourceClass: normalizeString(normalizedVoiceRuntime?.sourceClass) ?? undefined,
        sourceId: normalizeString(normalizedVoiceRuntime?.sourceId) ?? undefined,
        sourceSequence: envelope.sequence,
        voiceSessionId: envelope.voiceSessionId,
        payloadBase64: envelope.audioChunkBase64,
        metadata: {
          transportMode: envelope.transportMode,
          eventType: envelope.eventType,
          previousSequence: envelope.previousSequence,
        },
      });
      if (retentionWriteRequest) {
        try {
          const retained = (await ctx.runAction(
            generatedApi.internal.ai.mediaRetention.persistRetainedMediaPayload,
            retentionWriteRequest,
          )) as {
            retentionId: Id<"operatorMediaRetention">;
            storageId: Id<"_storage"> | null;
            idempotent: boolean;
          };
          retentionIngest = {
            attempted: true,
            persisted: true,
            idempotent: Boolean(retained.idempotent),
            retentionMode: retentionWriteRequest.retentionMode,
            retentionId: String(retained.retentionId),
            reason: retentionWriteRequest.policy.reason,
          };
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : "operator_media_retention_failed";
          retentionIngest = {
            attempted: true,
            persisted: false,
            idempotent: false,
            retentionMode: retentionWriteRequest.retentionMode,
            reason: retentionWriteRequest.policy.reason,
            error: message,
          };
          if (retentionWriteRequest.policy.failClosed) {
            throw new Error(`operator_media_retention_fail_closed:${message}`);
          }
          console.error("[VoiceRuntime] operator_media_retention_non_blocking_failure", {
            error: message,
            voiceSessionId: envelope.voiceSessionId,
            sequence: envelope.sequence,
          });
        }
      } else if (retentionConfig.enabled) {
        retentionIngest = {
          attempted: false,
          persisted: false,
          idempotent: false,
          reason: "policy_skip",
        };
      }
    }

    let relayEvents: VoiceTransportEnvelopeContract[] = [];
    let persistedFinalTranscript = false;
    let sanitizedFinalTranscriptText: string | null = null;
    let relayErrorMessage: string | null = null;
    let cancellationAssistantMessageId: string | null = null;

    if (sequenceDecision.decision === "duplicate_replay") {
      relayEvents =
        ingestCheckpoint.acceptedReplaysBySequence.get(envelope.sequence)?.relayEvents ??
        [
          buildVoiceTransportErrorEnvelope({
            sourceEnvelope: envelope,
            code: "vt_sequence_replay_detected",
            message:
              "Voice transport envelope sequence replay detected; idempotent replay skipped.",
            retryable: true,
          }),
        ];
    } else if (sequenceDecision.decision === "gap_detected") {
      relayEvents = [
        buildVoiceTransportErrorEnvelope({
          sourceEnvelope: envelope,
          code: "vt_sequence_gap_detected",
          message: `Voice transport sequence gap detected (expected ${sequenceDecision.expectedSequence}, received ${envelope.sequence}).`,
          retryable: true,
        }),
      ];
    } else {
      if (envelope.eventType === "audio_chunk") {
        const resolved = await resolveVoiceRuntimeAdapter({
          requestedProviderId,
          elevenLabsBinding: runtimeContext.elevenLabsBinding,
          fetchFn: fetch,
        });
        if (resolved.adapter.providerId === "browser") {
          const browserTranscriptHint = resolveBrowserFallbackTranscriptText({
            eventType: envelope.eventType,
            transcriptText: envelope.transcriptText,
          });
          if (browserTranscriptHint) {
            relayEvents = [
              {
                contractVersion: VOICE_TRANSPORT_ENVELOPE_CONTRACT_VERSION,
                transportMode: envelope.transportMode,
                eventType: "partial_transcript",
                liveSessionId: envelope.liveSessionId,
                voiceSessionId: envelope.voiceSessionId,
                interviewSessionId: envelope.interviewSessionId,
                sequence: envelope.sequence,
                previousSequence: envelope.previousSequence,
                timestampMs: Date.now(),
                transcriptText: browserTranscriptHint,
              },
            ];
          } else {
            relayEvents = [
              buildVoiceTransportErrorEnvelope({
                sourceEnvelope: envelope,
                code: "vt_upstream_provider_error",
                message:
                  "Realtime PCM ingest relay cannot transcribe without a provider-backed runtime or client transcript hint.",
                retryable: true,
              }),
            ];
          }
        } else {
          try {
            const transcriptionMimeType =
              normalizeTranscriptionMimeType(envelope.transcriptionMimeType) ??
              resolvePcmTranscriptionMimeType(envelope.pcm);
            const decodedAudioBytes = decodeBase64Audio(envelope.audioChunkBase64);
            const enforceFixedPcmContract =
              normalizeString(normalizedVoiceRuntime?.captureMethod)
                === "pcm_fixed_frame_streaming"
              || Boolean(
                normalizeString(normalizedTransportRuntime?.realtimeTransportRoute),
              );
            if (
              enforceFixedPcmContract
              && !hasFixedPcmCaptureContract({
                pcm: envelope.pcm,
                decodedAudioBytes,
              })
            ) {
              relayErrorMessage =
                "voice_pcm_contract_mismatch_expected_24khz_20ms_960b_int16_mono";
              relayEvents.push(
                buildVoiceTransportErrorEnvelope({
                  sourceEnvelope: envelope,
                  code: "vt_upstream_provider_error",
                  message:
                    "Voice PCM capture contract mismatch. Expected Int16 mono 24kHz 20ms 960-byte frames.",
                  retryable: false,
                }),
              );
              emitVoiceTelemetry("transport_ingest_pcm_contract_mismatch", {
                voiceSessionId: envelope.voiceSessionId,
                sequence: envelope.sequence,
                frameBytes: decodedAudioBytes.byteLength,
                sampleRateHz: envelope.pcm?.sampleRateHz,
                frameDurationMs: envelope.pcm?.frameDurationMs,
                channels: envelope.pcm?.channels,
              });
            } else {
              console.info(
                `[VoiceRuntime] Realtime frame transcription seq=${envelope.sequence} provider=${resolved.adapter.providerId} mimeType=${transcriptionMimeType}`,
              );
              const transcript = await transcribeWithRealtimeSttPrecedence({
                voiceSessionId: envelope.voiceSessionId,
                resolvedAdapter: resolved,
                geminiBinding: runtimeContext.geminiBinding,
                audioBytes: decodedAudioBytes,
                mimeType: transcriptionMimeType,
                language: realtimeTranscriptionLanguage,
              });
              const transcriptText = sanitizeTranscriptForVoiceTurn(
                transcript.transcriptText,
              );
              if (transcriptText) {
                console.info(
                  `[VoiceRuntime] Transcription result: "${transcriptText.slice(0, 240)}"`,
                );
                console.info(
                  `[VoiceRuntime] Frame processed seq=${envelope.sequence} transcript="${transcriptText.slice(0, 120)}" route=${transcript.route}`,
                );
                const partialEnvelope: VoiceTransportEnvelopeContract = {
                  contractVersion: VOICE_TRANSPORT_ENVELOPE_CONTRACT_VERSION,
                  transportMode: envelope.transportMode,
                  eventType: "partial_transcript",
                  liveSessionId: envelope.liveSessionId,
                  voiceSessionId: envelope.voiceSessionId,
                  interviewSessionId: envelope.interviewSessionId,
                  sequence: envelope.sequence,
                  previousSequence: envelope.previousSequence,
                  timestampMs: Date.now(),
                  transcriptText,
                };
                assertVoiceTransportEnvelope(partialEnvelope);
                relayEvents.push(partialEnvelope);
              } else if (normalizeString(transcript.transcriptText)) {
                relayErrorMessage = "voice_non_speech_transcript_filtered";
                console.info(
                  `[VoiceRuntime] Ignored ambient transcript seq=${envelope.sequence}.`,
                  buildAmbientTranscriptDebugSnapshot(transcript.transcriptText),
                );
              }
            }
          } catch (error) {
            if (isNoTranscriptTextError(error)) {
              relayErrorMessage = "voice_no_speech_detected";
              console.warn(
                "[VoiceRuntime] Empty transcript for realtime frame; skipping relay event.",
              );
            } else {
              relayErrorMessage =
                error instanceof Error
                  ? error.message
                  : "Voice realtime PCM transcription failed.";
              relayEvents.push(
                buildVoiceTransportErrorEnvelope({
                  sourceEnvelope: envelope,
                  code: "vt_upstream_provider_error",
                  message: relayErrorMessage,
                  retryable: true,
                }),
              );
            }
          }
        }
      } else if (envelope.eventType === "partial_transcript") {
        const partialTranscriptText = sanitizeTranscriptForVoiceTurn(
          envelope.transcriptText,
        );
        if (partialTranscriptText) {
          console.info(
            `[VoiceRuntime] Frame processed seq=${envelope.sequence} transcript="${partialTranscriptText.slice(0, 120)}"`,
          );
          relayEvents = [{ ...envelope, transcriptText: partialTranscriptText }];
        } else if (normalizeString(envelope.transcriptText)) {
          relayErrorMessage = "voice_non_speech_transcript_filtered";
          relayEvents = [];
          console.info(
            `[VoiceRuntime] Ignored ambient partial transcript seq=${envelope.sequence}.`,
            buildAmbientTranscriptDebugSnapshot(envelope.transcriptText),
          );
        } else {
          relayEvents = [envelope];
        }
      } else if (envelope.eventType === "final_transcript") {
        const finalTranscriptText = sanitizeTranscriptForVoiceTurn(
          envelope.transcriptText,
        );
        if (finalTranscriptText) {
          sanitizedFinalTranscriptText = finalTranscriptText;
          relayEvents = [{ ...envelope, transcriptText: finalTranscriptText }];
          console.info(
            `[VoiceRuntime] Frame processed seq=${envelope.sequence} transcript="${finalTranscriptText.slice(0, 120)}"`,
          );
          await ctx.runMutation(
            generatedApi.internal.ai.agentSessions.addSessionMessage,
            {
              sessionId: runtimeContext.interviewSessionId,
              role: "user",
              content: finalTranscriptText,
            },
          );
          persistedFinalTranscript = true;
        } else if (normalizeString(envelope.transcriptText)) {
          relayErrorMessage = "voice_non_speech_transcript_filtered";
          relayEvents = [];
          console.info(
            `[VoiceRuntime] Ignored ambient final transcript seq=${envelope.sequence}.`,
            buildAmbientTranscriptDebugSnapshot(envelope.transcriptText),
          );
        } else {
          relayEvents = [envelope];
        }
      } else if (
        envelope.eventType === "assistant_audio_chunk" ||
        envelope.eventType === "assistant_audio_final" ||
        envelope.eventType === "barge_in"
      ) {
        const assistantRelayResult = resolveVoiceAssistantRelay({
          sourceEnvelope: envelope,
          relayEventsBySequence:
            ingestCheckpointSnapshot.acceptedReplayEventsBySequence ?? {},
        });
        relayEvents = assistantRelayResult.relayEvents;
        relayErrorMessage = assistantRelayResult.relayErrorMessage;
        cancellationAssistantMessageId =
          assistantRelayResult.cancellationAssistantMessageId;
      }
    }

    await emitVoiceTrustEvent(ctx, {
      eventName: "trust.voice.adaptive_flow_decision.v1",
      organizationId: runtimeContext.organizationId,
      interviewSessionId: runtimeContext.interviewSessionId,
      actorId: runtimeContext.actorId,
      mode: "runtime",
      additionalPayload: {
        voice_session_id: envelope.voiceSessionId,
        adaptive_phase_id: VOICE_TRANSPORT_WEBSOCKET_INGEST_PHASE_ID,
        adaptive_decision:
          sequenceDecision.decision === "accepted"
            ? "relay_accepted"
            : sequenceDecision.decision === "gap_detected"
              ? "relay_gap_detected"
              : "relay_duplicate_replay",
        adaptive_confidence: 1,
        consent_checkpoint_id: "cp0_capture_notice",
        decision_reason:
          relayErrorMessage ??
          (sequenceDecision.decision === "gap_detected"
            ? `expected_sequence_${sequenceDecision.expectedSequence}`
            : sequenceDecision.decision),
        voice_transport_sequence: envelope.sequence,
        voice_transport_event_type: envelope.eventType,
        voice_transport_ordering_decision: sequenceDecision.decision,
        voice_transport_expected_sequence: sequenceDecision.expectedSequence,
        voice_transport_relay_events: relayEvents,
        voice_transport_final_persisted: persistedFinalTranscript,
        media_retention_attempted: retentionIngest?.attempted ?? false,
        media_retention_persisted: retentionIngest?.persisted ?? false,
        media_retention_idempotent: retentionIngest?.idempotent ?? false,
        media_retention_mode: retentionIngest?.retentionMode ?? null,
        media_retention_reason: retentionIngest?.reason ?? null,
        media_retention_error: retentionIngest?.error ?? null,
      },
    });

    let writeIdempotentReplay = sequenceDecision.decision === "duplicate_replay";
    if (sequenceDecision.decision === "accepted") {
      const checkpointCommit = await ctx.runMutation(
        generatedApi.internal.ai.voiceRuntime.commitVoiceTransportIngestCheckpoint,
        {
          organizationId: runtimeContext.organizationId,
          interviewSessionId: runtimeContext.interviewSessionId,
          voiceSessionId: envelope.voiceSessionId,
          acceptedSequence: envelope.sequence,
          relayEvents,
        },
      );
      const commitResult = checkpointCommit as {
        alreadyAccepted?: boolean;
        relayEvents?: VoiceTransportEnvelopeContract[];
      };
      if (commitResult.alreadyAccepted) {
        writeIdempotentReplay = true;
        relayEvents = Array.isArray(commitResult.relayEvents)
          ? commitResult.relayEvents
          : relayEvents;
      } else if (cancellationAssistantMessageId) {
        try {
          const resolved = await resolveVoiceRuntimeAdapter({
            requestedProviderId,
            elevenLabsBinding: runtimeContext.elevenLabsBinding,
            fetchFn: fetch,
          });
          await resolved.adapter.cancelSynthesis({
            voiceSessionId: envelope.voiceSessionId,
            assistantMessageId: cancellationAssistantMessageId,
          });
        } catch (error) {
          console.error("[VoiceRuntime] Voice synthesis cancel failed:", error);
        }
      }
    }

    const turnOrchestrationDecision = resolveVoiceRealtimeTurnOrchestrationDecision({
      sequenceDecision: sequenceDecision.decision,
      eventType: envelope.eventType,
      transcriptText: envelope.eventType === "final_transcript"
        ? (sanitizedFinalTranscriptText ?? undefined)
        : undefined,
      idempotentReplay: writeIdempotentReplay,
      persistedFinalTranscript,
    });
    console.info("[VoiceRuntime] realtime_turn_orchestration_decision", {
      voiceSessionId: envelope.voiceSessionId,
      liveSessionId: envelope.liveSessionId,
      eventType: envelope.eventType,
      sequence: envelope.sequence,
      orderingDecision: sequenceDecision.decision,
      expectedSequence: sequenceDecision.expectedSequence,
      persistedFinalTranscript,
      idempotentReplay: writeIdempotentReplay,
      relayEventCount: relayEvents.length,
      shouldTriggerAssistantTurn:
        turnOrchestrationDecision.shouldTriggerAssistantTurn,
      orchestrationReason: turnOrchestrationDecision.reason,
      conversationId: args.conversationId ?? null,
      transcriptLength:
        turnOrchestrationDecision.transcriptText?.length ?? 0,
      relayErrorMessage: relayErrorMessage ?? null,
    });

    let realtimeTurn:
      | {
          status: "triggered" | "suppressed" | "failed";
          reason: string;
          transcriptText?: string;
          assistantText?: string;
          conversationId?: Id<"aiConversations">;
          toolCallCount?: number;
        }
      | undefined;
    if (turnOrchestrationDecision.shouldTriggerAssistantTurn) {
      console.info(
        `[VoiceRuntime] Agent response triggered, transcript length=${turnOrchestrationDecision.transcriptText?.length ?? 0}`,
      );
      if (!args.conversationId) {
        console.warn(
          "[VoiceRuntime] realtime_turn_suppressed_missing_conversation_id",
          {
            voiceSessionId: envelope.voiceSessionId,
            liveSessionId: envelope.liveSessionId,
            eventType: envelope.eventType,
            sequence: envelope.sequence,
            orchestrationReason: turnOrchestrationDecision.reason,
          },
        );
        realtimeTurn = {
          status: "suppressed",
          reason: "missing_conversation_id",
          transcriptText: turnOrchestrationDecision.transcriptText ?? undefined,
        };
      } else {
        try {
          console.info("[VoiceRuntime] realtime_turn_send_message_start", {
            voiceSessionId: envelope.voiceSessionId,
            liveSessionId: envelope.liveSessionId,
            eventType: envelope.eventType,
            sequence: envelope.sequence,
            conversationId: args.conversationId,
            transcriptLength:
              turnOrchestrationDecision.transcriptText?.length ?? 0,
          });
          const sendMessageResult = await (ctx as any).runAction(
            generatedApi.api.ai.chat.sendMessage,
            {
              organizationId: runtimeContext.organizationId,
              userId: runtimeContext.actorId as Id<"users">,
              sessionId: args.sessionId,
              conversationId: args.conversationId,
              message: turnOrchestrationDecision.transcriptText,
              liveSessionId: envelope.liveSessionId,
              conversationRuntime: {
                ...(normalizedConversationRuntime ?? {}),
                source: "voice_transport_ingest",
                mode:
                  normalizeString(normalizedConversationRuntime?.mode) ?? "voice",
                turnPolicy: "final_transcript_eou",
                eventType: envelope.eventType,
                sequence: envelope.sequence,
              },
              voiceRuntime: {
                ...(normalizedVoiceRuntime ?? {}),
                source: "voice_transport_ingest",
                voiceSessionId: envelope.voiceSessionId,
                liveSessionId: envelope.liveSessionId,
                phaseId: VOICE_TRANSPORT_WEBSOCKET_INGEST_PHASE_ID,
                eventType: envelope.eventType,
                sequence: envelope.sequence,
                contractVersion: envelope.contractVersion,
                transportMode: envelope.transportMode,
              },
              transportRuntime: {
                ...(normalizedTransportRuntime ?? {}),
                source: "voice_transport_ingest",
                transport: envelope.transportMode,
                mode: envelope.transportMode,
                eventType: envelope.eventType,
                sequence: envelope.sequence,
                orderingDecision: sequenceDecision.decision,
                expectedSequence: sequenceDecision.expectedSequence,
              },
              avObservability: {
                ...(normalizedAvObservability ?? {}),
                source: "voice_transport_ingest",
                liveSessionId: envelope.liveSessionId,
                voiceSessionId: envelope.voiceSessionId,
                interviewSessionId: envelope.interviewSessionId,
                eventType: envelope.eventType,
                sequence: envelope.sequence,
              },
            },
          ) as {
            message?: string;
            toolCalls?: Array<unknown>;
          };
          realtimeTurn = {
            status: "triggered",
            reason: turnOrchestrationDecision.reason,
            transcriptText: turnOrchestrationDecision.transcriptText ?? undefined,
            assistantText: normalizeString(sendMessageResult.message) ?? undefined,
            conversationId: args.conversationId,
            toolCallCount: Array.isArray(sendMessageResult.toolCalls)
              ? sendMessageResult.toolCalls.length
              : 0,
          };
          console.info("[VoiceRuntime] realtime_turn_send_message_success", {
            voiceSessionId: envelope.voiceSessionId,
            liveSessionId: envelope.liveSessionId,
            conversationId: args.conversationId,
            assistantTextLength: realtimeTurn.assistantText?.length ?? 0,
            toolCallCount: realtimeTurn.toolCallCount ?? 0,
          });
          if (realtimeTurn.assistantText) {
            console.info(
              `[VoiceRuntime] Agent LLM response: "${realtimeTurn.assistantText.slice(0, 50)}..."`,
            );
            console.info(
              `[VoiceRuntime] Playback event emitted for session=${envelope.voiceSessionId}`,
            );
          }
        } catch (error) {
          realtimeTurn = {
            status: "failed",
            reason:
              normalizeString(error instanceof Error ? error.message : undefined)
                ?? "realtime_turn_orchestration_failed",
            transcriptText: turnOrchestrationDecision.transcriptText ?? undefined,
            conversationId: args.conversationId,
          };
          console.error("[VoiceRuntime] realtime_turn_send_message_failed", {
            voiceSessionId: envelope.voiceSessionId,
            liveSessionId: envelope.liveSessionId,
            eventType: envelope.eventType,
            sequence: envelope.sequence,
            conversationId: args.conversationId,
            error:
              error instanceof Error ? error.message : "unknown_send_message_error",
          });
        }
      }
    } else {
      realtimeTurn = {
        status: "suppressed",
        reason: turnOrchestrationDecision.reason,
        transcriptText: turnOrchestrationDecision.transcriptText ?? undefined,
      };
    }

    const relayQos = resolveVoiceRelayQosSnapshot({
      nowMs: Date.now(),
      sequence: envelope.sequence,
      expectedSequence: sequenceDecision.expectedSequence,
      sequenceDecision: sequenceDecision.decision,
      idempotentReplay: writeIdempotentReplay,
      relayEventCount: relayEvents.length,
      relayErrorMessage,
      persistedFinalTranscript,
      lastAcceptedSequence:
        sequenceDecision.decision === "accepted" || writeIdempotentReplay
          ? envelope.sequence
          : ingestCheckpoint.lastAcceptedSequence,
    });

    const response = {
      success: sequenceDecision.decision !== "gap_detected",
      ordering: {
        decision: sequenceDecision.decision,
        expectedSequence: sequenceDecision.expectedSequence,
        lastAcceptedSequence: ingestCheckpoint.lastAcceptedSequence,
      },
      idempotent: writeIdempotentReplay,
      persistedFinalTranscript,
      relayEvents,
      relay: relayQos,
      orchestration: {
        ...turnOrchestrationDecision,
        turn: realtimeTurn,
      },
      retention: retentionIngest ?? null,
      nativeBridge: buildVoiceRuntimeNativeBridgeMetadata({
        voiceSessionId: envelope.voiceSessionId,
        sessionState: "stt",
        requestedProviderId,
        providerId: requestedProviderId,
      }),
    };
    emitVoiceTelemetry("transport_ingest_result", {
      voiceSessionId: envelope.voiceSessionId,
      eventType: envelope.eventType,
      sequence: envelope.sequence,
      orderingDecision: sequenceDecision.decision,
      relayEventCount: relayEvents.length,
      relayQosReasonCode: relayQos.reasonCode,
      relayHeartbeatStatus: relayQos.heartbeat.status,
      persistedFinalTranscript,
      orchestrationStatus: realtimeTurn?.status ?? "none",
      orchestrationReason: turnOrchestrationDecision.reason,
      shouldTriggerAssistantTurn: turnOrchestrationDecision.shouldTriggerAssistantTurn,
      mediaRetentionAttempted: retentionIngest?.attempted ?? false,
      mediaRetentionPersisted: retentionIngest?.persisted ?? false,
      mediaRetentionMode: retentionIngest?.retentionMode ?? null,
      mediaRetentionReason: retentionIngest?.reason ?? null,
    });
    return response;
  },
});

export const ingestVideoFrameEnvelope = action({
  args: {
    sessionId: v.string(),
    interviewSessionId: v.id("agentSessions"),
    conversationId: v.optional(v.id("aiConversations")),
    envelope: mediaSessionIngressContractValidator,
    maxFramesPerWindow: v.optional(v.number()),
    windowMs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const runtimeContext = (await ctx.runQuery(
      generatedApi.internal.ai.voiceRuntime.resolveVoiceRuntimeContext,
      {
        sessionId: args.sessionId,
        interviewSessionId: args.interviewSessionId,
      },
    )) as VoiceRuntimeContext;

    const envelope = args.envelope as MediaSessionIngressContract;
    assertMediaSessionIngressContract(envelope);

    const videoRuntime = normalizeObject(envelope.videoRuntime);
    const cameraRuntime = normalizeObject(envelope.cameraRuntime);
    const captureRuntime = normalizeObject(envelope.captureRuntime);
    const videoSessionId = normalizeSessionToken(videoRuntime?.videoSessionId);
    if (!videoSessionId) {
      throw new Error(
        "Media session video frame ingress requires videoRuntime.videoSessionId.",
      );
    }

    const sequence = Number(videoRuntime?.packetSequence);
    if (!Number.isInteger(sequence) || sequence < 0) {
      throw new Error(
        "Media session video frame ingress requires non-negative integer videoRuntime.packetSequence.",
      );
    }

    const checkpoint = (await ctx.runMutation(
      generatedApi.internal.ai.voiceRuntime.ingestVideoTransportFrameCheckpoint,
      {
        organizationId: runtimeContext.organizationId,
        interviewSessionId: runtimeContext.interviewSessionId,
        liveSessionId: envelope.liveSessionId,
        videoSessionId,
        sequence,
        nowMs: envelope.ingressTimestampMs,
        maxFramesPerWindow:
          typeof args.maxFramesPerWindow === "number"
            ? args.maxFramesPerWindow
            : undefined,
        windowMs:
          typeof args.windowMs === "number" ? args.windowMs : undefined,
      },
    )) as IngestVideoTransportFrameCheckpointResult;

    const retentionConfig = resolveOperatorMediaRetentionConfig();
    let retentionIngest:
      | {
          attempted: boolean;
          persisted: boolean;
          idempotent: boolean;
          retentionMode?: "metadata_only" | "full";
          retentionId?: string;
          reason?: string;
          error?: string;
        }
      | undefined;
    if (checkpoint.decision === "accepted") {
      const retainedMediaType = resolveVideoEnvelopeRetainedMediaType({
        keyframeHint: undefined,
      });
      const framePayloadBase64 =
        normalizeString(videoRuntime?.framePayloadBase64) ?? undefined;
      const retentionWriteRequest = buildOperatorMediaRetentionWriteRequest({
        config: retentionConfig,
        organizationId: runtimeContext.organizationId,
        conversationId: args.conversationId,
        interviewSessionId: runtimeContext.interviewSessionId,
        liveSessionId: envelope.liveSessionId,
        mediaType: retainedMediaType,
        mimeType: normalizeString(videoRuntime?.mimeType) ?? "image/jpeg",
        capturedAt: normalizeTelemetryInteger(videoRuntime?.packetTimestampMs)
          ?? envelope.ingressTimestampMs,
        sourceClass:
          normalizeString(captureRuntime?.sourceClass)
          ?? normalizeString(cameraRuntime?.sourceClass)
          ?? undefined,
        sourceId:
          normalizeString(captureRuntime?.sourceId)
          ?? normalizeString(cameraRuntime?.sourceId)
          ?? undefined,
        sourceSequence: sequence,
        videoSessionId,
        payloadBase64: framePayloadBase64,
        metadata: {
          transportMode: normalizeString(envelope.transportRuntime?.mode) ?? null,
          fallbackReason: normalizeString(envelope.transportRuntime?.fallbackReason) ?? null,
          frameRate: normalizeTelemetryInteger(videoRuntime?.frameRate),
          width: normalizeTelemetryInteger(videoRuntime?.width),
          height: normalizeTelemetryInteger(videoRuntime?.height),
          codec: normalizeString(videoRuntime?.codec) ?? null,
        },
      });
      if (retentionWriteRequest) {
        try {
          const retained = (await ctx.runAction(
            generatedApi.internal.ai.mediaRetention.persistRetainedMediaPayload,
            retentionWriteRequest,
          )) as {
            retentionId: Id<"operatorMediaRetention">;
            storageId: Id<"_storage"> | null;
            idempotent: boolean;
          };
          retentionIngest = {
            attempted: true,
            persisted: true,
            idempotent: Boolean(retained.idempotent),
            retentionMode: retentionWriteRequest.retentionMode,
            retentionId: String(retained.retentionId),
            reason: retentionWriteRequest.policy.reason,
          };
          const isVisionMediaType =
            retentionWriteRequest.mediaType === "video_frame" ||
            retentionWriteRequest.mediaType === "video_keyframe";
          if (
            args.conversationId &&
            retained.storageId &&
            retentionWriteRequest.retentionMode === "full" &&
            isVisionMediaType
          ) {
            await ctx.runMutation(
              generatedApi.internal.ai.voiceRuntime.appendWebChatVisionFrameBufferEntry,
              {
                organizationId: runtimeContext.organizationId,
                interviewSessionId: runtimeContext.interviewSessionId,
                conversationId: args.conversationId,
                liveSessionId: envelope.liveSessionId,
                retentionId: retained.retentionId,
                capturedAt: retentionWriteRequest.capturedAt,
                mediaType: retentionWriteRequest.mediaType,
                mimeType: retentionWriteRequest.mimeType,
                sizeBytes: Math.max(
                  1,
                  Math.floor((framePayloadBase64?.length ?? 0) * 0.75),
                ),
                storageId: retained.storageId,
                videoSessionId,
                sourceSequence: retentionWriteRequest.sourceSequence,
                ttlExpiresAt: retentionWriteRequest.ttlExpiresAt,
                idempotencyKey: retentionWriteRequest.idempotencyKey,
                idempotentReplay: Boolean(retained.idempotent),
                nowMs: envelope.ingressTimestampMs,
              },
            );
          }
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : "operator_video_media_retention_failed";
          retentionIngest = {
            attempted: true,
            persisted: false,
            idempotent: false,
            retentionMode: retentionWriteRequest.retentionMode,
            reason: retentionWriteRequest.policy.reason,
            error: message,
          };
          if (retentionWriteRequest.policy.failClosed) {
            throw new Error(`operator_media_retention_fail_closed:${message}`);
          }
          console.error("[VoiceRuntime] operator_video_media_retention_non_blocking_failure", {
            error: message,
            liveSessionId: envelope.liveSessionId,
            videoSessionId,
            sequence,
          });
        }
      } else if (retentionConfig.enabled) {
        retentionIngest = {
          attempted: false,
          persisted: false,
          idempotent: false,
          reason: "policy_skip",
        };
      }
    }

    return {
      success:
        checkpoint.decision === "accepted" ||
        checkpoint.decision === "duplicate_replay",
      phaseId: VIDEO_TRANSPORT_FRAME_INGEST_PHASE_ID,
      liveSessionId: envelope.liveSessionId,
      videoSessionId,
      ordering: {
        decision: checkpoint.decision,
        expectedSequence: checkpoint.expectedSequence,
        receivedSequence: sequence,
        lastAcceptedSequence: checkpoint.lastAcceptedSequence,
      },
      rateControl: {
        frameCountInWindow: checkpoint.frameCountInWindow,
        windowStartMs: checkpoint.windowStartMs,
        retryAfterMs: checkpoint.retryAfterMs,
      },
      relay: {
        accepted:
          checkpoint.decision === "accepted" ||
          checkpoint.decision === "duplicate_replay",
        reason:
          checkpoint.decision === "accepted"
            ? "video_frame_relay_accepted"
            : checkpoint.decision === "duplicate_replay"
              ? "video_frame_duplicate_replay"
              : checkpoint.decision === "gap_detected"
                ? "video_frame_sequence_gap"
                : "video_frame_rate_limited",
      },
      payload: {
        framePayloadBytes: Math.floor(
          (normalizeString(videoRuntime?.framePayloadBase64)?.length ?? 0) *
            0.75,
        ),
      },
      retention: retentionIngest ?? null,
    };
  },
});

export const synthesizeVoicePreview = action({
  args: {
    sessionId: v.string(),
    interviewSessionId: v.id("agentSessions"),
    voiceSessionId: v.string(),
    text: v.string(),
    requestedProviderId: v.optional(
      v.union(v.literal("browser"), v.literal("elevenlabs")),
    ),
    requestedVoiceId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const runtimeContext = (await ctx.runQuery(
      generatedApi.internal.ai.voiceRuntime.resolveVoiceRuntimeContext,
      {
        sessionId: args.sessionId,
        interviewSessionId: args.interviewSessionId,
      },
    )) as VoiceRuntimeContext;
    const requestedProviderId = normalizeVoiceRuntimeProviderId(
      args.requestedProviderId,
    );
    const resolved = await resolveVoiceRuntimeAdapter({
      requestedProviderId,
      elevenLabsBinding: runtimeContext.elevenLabsBinding,
      fetchFn: fetch,
    });
    const nativeBridge = buildVoiceRuntimeNativeBridgeMetadata({
      voiceSessionId: args.voiceSessionId,
      sessionState: "tts",
      requestedProviderId,
      providerId: resolved.adapter.providerId,
      fallbackProviderId: resolved.fallbackFromProviderId ?? null,
      fallbackReason: resolved.health.reason ?? null,
    });
    if (resolved.fallbackFromProviderId) {
      await emitVoiceFailoverEvent(ctx, {
        organizationId: runtimeContext.organizationId,
        interviewSessionId: runtimeContext.interviewSessionId,
        actorId: runtimeContext.actorId,
        voiceSessionId: args.voiceSessionId,
        requestedProviderId,
        fallbackProviderId: resolved.adapter.providerId,
        health: resolved.health,
        reason: resolved.health.reason ?? "provider_health_degraded",
      });
    }

    try {
      const voiceResolution = resolveDeterministicVoiceDefaults({
        requestedVoiceId: args.requestedVoiceId,
        agentVoiceId: runtimeContext.agentVoiceId,
        orgDefaultVoiceId: runtimeContext.elevenLabsBinding?.defaultVoiceId,
      });
      const agentVoiceLanguage = runtimeContext.agentVoiceLanguage;
      console.info("[VoiceRuntime] tts_voice_resolution", {
        requestedProviderId,
        requestedVoiceId: voiceResolution.requestedVoiceId,
        agentVoiceId: voiceResolution.agentVoiceId,
        agentVoiceLanguage: agentVoiceLanguage ?? null,
        bindingDefaultVoiceId: voiceResolution.orgDefaultVoiceId,
        platformDefaultVoiceId: voiceResolution.platformDefaultVoiceId,
        hardFallbackVoiceId: voiceResolution.hardFallbackVoiceId,
        resolvedVoiceId: voiceResolution.resolvedVoiceId,
        voiceResolutionSource: voiceResolution.voiceResolutionSource,
        hasElevenLabsBinding: Boolean(runtimeContext.elevenLabsBinding),
      });
      console.info(
        `[VoiceRuntime] TTS request: voice_id=${voiceResolution.resolvedVoiceId} text_length=${args.text.length}`,
      );
      const synthesis = await resolved.adapter.synthesize({
        voiceSessionId: args.voiceSessionId,
        text: args.text,
        voiceId: voiceResolution.resolvedVoiceId,
      });
      const synthesizedBytes = synthesis.audioBase64
        ? Math.floor((synthesis.audioBase64.length * 3) / 4)
        : 0;
      console.info(
        `[VoiceRuntime] TTS response: audio_bytes=${synthesizedBytes}`,
      );

      try {
        const synthesisBridge = buildVoiceRuntimeNativeBridgeMetadata({
          voiceSessionId: args.voiceSessionId,
          sessionState: "tts",
          requestedProviderId,
          providerId: synthesis.providerId,
          fallbackProviderId: resolved.fallbackFromProviderId ?? null,
          fallbackReason: resolved.health.reason ?? null,
        });
        await recordVoiceUsage({
          ctx,
          runtimeContext,
          voiceSessionId: args.voiceSessionId,
          requestType: "voice_tts",
          action: "voice_synthesis",
          creditLedgerAction: "voice_synthesis",
          providerId: synthesis.providerId,
          success: true,
          usage: synthesis.usage ?? null,
          metadata: {
            requestedProviderId,
            fallbackProviderId: resolved.fallbackFromProviderId ?? null,
            healthStatus: resolved.health.status,
            nativeBridge: synthesisBridge,
          },
        });
      } catch (recordError) {
        console.error("[VoiceRuntime] Failed to record successful TTS usage:", recordError);
      }

      return {
        success: true,
        providerId: synthesis.providerId,
        requestedProviderId,
        voiceResolutionSource: voiceResolution.voiceResolutionSource,
        fallbackProviderId: resolved.fallbackFromProviderId ?? null,
        health: resolved.health,
        mimeType: synthesis.mimeType,
        audioBase64: synthesis.audioBase64 ?? null,
        fallbackText: synthesis.fallbackText ?? null,
        nativeBridge: buildVoiceRuntimeNativeBridgeMetadata({
          voiceSessionId: args.voiceSessionId,
          sessionState: "tts",
          requestedProviderId,
          providerId: synthesis.providerId,
          fallbackProviderId: resolved.fallbackFromProviderId ?? null,
          fallbackReason: resolved.health.reason ?? null,
        }),
      };
    } catch (error) {
      const synthesisError =
        error instanceof Error
          ? error.message
          : "Voice synthesis failed.";
      try {
        await recordVoiceUsage({
          ctx,
          runtimeContext,
          voiceSessionId: args.voiceSessionId,
          requestType: "voice_tts",
          action: "voice_synthesis",
          creditLedgerAction: "voice_synthesis",
          providerId: resolved.adapter.providerId,
          success: false,
          errorMessage: synthesisError,
          usage: null,
          metadata: {
            requestedProviderId,
            fallbackProviderId: resolved.fallbackFromProviderId ?? null,
            healthStatus: resolved.health.status,
            nativeBridge,
          },
        });
      } catch (recordError) {
        console.error("[VoiceRuntime] Failed to record failed TTS usage:", recordError);
      }
      return {
        success: false,
        providerId: resolved.adapter.providerId,
        requestedProviderId,
        fallbackProviderId: resolved.fallbackFromProviderId ?? null,
        health: resolved.health,
        error: synthesisError,
        nativeBridge,
      };
    }
  },
});

export const probeVoiceProviderHealth = action({
  args: {
    sessionId: v.string(),
    interviewSessionId: v.id("agentSessions"),
    requestedProviderId: v.optional(
      v.union(v.literal("browser"), v.literal("elevenlabs")),
    ),
  },
  handler: async (ctx, args) => {
    const runtimeContext = (await ctx.runQuery(
      generatedApi.internal.ai.voiceRuntime.resolveVoiceRuntimeContext,
      {
        sessionId: args.sessionId,
        interviewSessionId: args.interviewSessionId,
      },
    )) as VoiceRuntimeContext;
    const requestedProviderId = normalizeVoiceRuntimeProviderId(
      args.requestedProviderId,
    );
    const resolved = await resolveVoiceRuntimeAdapter({
      requestedProviderId,
      elevenLabsBinding: runtimeContext.elevenLabsBinding,
      fetchFn: fetch,
    });
    const nativeBridge = buildVoiceRuntimeNativeBridgeMetadata({
      voiceSessionId: `probe:${args.interviewSessionId}`,
      sessionState: "probe",
      requestedProviderId,
      providerId: resolved.adapter.providerId,
      fallbackProviderId: resolved.fallbackFromProviderId ?? null,
      fallbackReason: resolved.health.reason ?? null,
    });

    return {
      requestedProviderId,
      providerId: resolved.adapter.providerId,
      fallbackProviderId: resolved.fallbackFromProviderId ?? null,
      health: resolved.health,
      nativeBridge,
    };
  },
});
