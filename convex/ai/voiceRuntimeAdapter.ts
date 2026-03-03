import type { AiProviderId } from "../channels/types";

export type VoiceRuntimeProviderId = "browser" | "elevenlabs";
export type VoiceProviderHealthStatus = "healthy" | "degraded" | "offline";

export interface VoiceProviderHealth {
  providerId: VoiceRuntimeProviderId;
  status: VoiceProviderHealthStatus;
  checkedAt: number;
  reason?: string;
  fallbackProviderId?: VoiceRuntimeProviderId;
}

export interface VoiceRuntimeSessionOpenArgs {
  voiceSessionId: string;
  organizationId: string;
  interviewSessionId: string;
  voiceId?: string;
}

export interface VoiceRuntimeSessionCloseArgs {
  voiceSessionId: string;
  reason?: string;
}

export interface VoiceTranscriptionArgs {
  voiceSessionId: string;
  audioBytes: Uint8Array;
  mimeType: string;
  language?: string;
}

export interface VoiceSynthesisArgs {
  voiceSessionId: string;
  text: string;
  voiceId?: string;
}

export interface VoiceSynthesisCancelArgs {
  voiceSessionId: string;
  assistantMessageId: string;
}

export interface VoiceRuntimeSession {
  voiceSessionId: string;
  providerId: VoiceRuntimeProviderId;
  openedAt: number;
}

export type VoiceUsageCostSource =
  | "provider_reported"
  | "estimated_unit_pricing"
  | "not_available";

export interface VoiceUsageTelemetry {
  nativeUsageUnit: string;
  nativeUsageQuantity: number;
  nativeInputUnits?: number;
  nativeOutputUnits?: number;
  nativeTotalUnits?: number;
  nativeCostInCents?: number;
  nativeCostCurrency?: string;
  nativeCostSource: VoiceUsageCostSource;
  providerRequestId?: string;
  metadata?: Record<string, unknown>;
}

export interface VoiceTranscriptionResult {
  text: string;
  providerId: VoiceRuntimeProviderId;
  confidence?: number;
  usage?: VoiceUsageTelemetry;
  raw?: unknown;
}

export interface VoiceSynthesisResult {
  providerId: VoiceRuntimeProviderId;
  mimeType: string;
  audioBase64?: string;
  fallbackText?: string;
  usage?: VoiceUsageTelemetry;
  raw?: unknown;
}

export interface VoiceSynthesisCancelResult {
  providerId: VoiceRuntimeProviderId;
  cancelled: boolean;
  idempotent: boolean;
  reason?: string;
  raw?: unknown;
}

export interface VoiceRuntimeAdapter {
  readonly providerId: VoiceRuntimeProviderId;
  probeHealth(): Promise<VoiceProviderHealth>;
  openSession(args: VoiceRuntimeSessionOpenArgs): Promise<VoiceRuntimeSession>;
  closeSession(args: VoiceRuntimeSessionCloseArgs): Promise<void>;
  transcribe(args: VoiceTranscriptionArgs): Promise<VoiceTranscriptionResult>;
  synthesize(args: VoiceSynthesisArgs): Promise<VoiceSynthesisResult>;
  cancelSynthesis(
    args: VoiceSynthesisCancelArgs,
  ): Promise<VoiceSynthesisCancelResult>;
}

export interface ElevenLabsBinding {
  apiKey: string;
  baseUrl?: string;
  defaultVoiceId?: string;
}

export interface ResolveVoiceRuntimeAdapterArgs {
  requestedProviderId?: VoiceRuntimeProviderId | AiProviderId | string | null;
  elevenLabsBinding?: ElevenLabsBinding | null;
  fetchFn?: typeof fetch;
  now?: () => number;
}

export interface ResolvedVoiceRuntimeAdapter {
  adapter: VoiceRuntimeAdapter;
  requestedProviderId: VoiceRuntimeProviderId;
  health: VoiceProviderHealth;
  fallbackFromProviderId?: VoiceRuntimeProviderId;
}

export interface ElevenLabsVoiceRuntimeAdapterOptions {
  apiKey: string;
  baseUrl?: string;
  defaultVoiceId?: string;
  sttModelId?: string;
  ttsModelId?: string;
  fetchFn?: typeof fetch;
  now?: () => number;
}

type FetchLike = typeof fetch;
type NonBrowserVoiceRuntimeProviderId = Exclude<
  VoiceRuntimeProviderId,
  "browser"
>;

const ELEVENLABS_DEFAULT_BASE_URL = "https://api.elevenlabs.io/v1";
const ELEVENLABS_DEFAULT_STT_MODEL = "scribe_v1";
const ELEVENLABS_DEFAULT_TTS_MODEL = "eleven_multilingual_v2";
const ELEVENLABS_ESTIMATED_STT_USD_PER_HOUR = 0.4;
const ELEVENLABS_ESTIMATED_TTS_USD_PER_1K_CHAR = 0.3;
const ELEVENLABS_STT_ESTIMATED_BYTES_PER_SECOND = 4_000;
const BROWSER_ADAPTER_UNSUPPORTED_REASON =
  "browser_runtime_requires_client_side_voice_processing";
const BASE64_ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function encodeBytesToBase64(bytes: Uint8Array): string {
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

export interface VoicePcmContractLike {
  encoding: "pcm_s16le" | "pcm_f32le";
  sampleRateHz: number;
  channels: number;
  frameDurationMs: number;
}

function normalizeString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeTranscriptionMimeType(value: unknown): string {
  const normalized = normalizeString(value)?.toLowerCase();
  if (!normalized) {
    return "audio/webm";
  }
  const canonical = normalized.split(";", 1)[0]?.trim() ?? normalized;
  if (canonical === "audio/m4a" || canonical === "audio/x-m4a") {
    return "audio/mp4";
  }
  return canonical;
}

function resolveTranscriptionFilename(mimeType: string): string {
  switch (mimeType) {
    case "audio/mp4":
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

export function resolvePcmTranscriptionMimeType(
  pcm: VoicePcmContractLike,
): string {
  const channels = Number.isFinite(pcm.channels) ? Math.max(1, Math.floor(pcm.channels)) : 1;
  const sampleRateHz =
    Number.isFinite(pcm.sampleRateHz) && pcm.sampleRateHz > 0
      ? Math.floor(pcm.sampleRateHz)
      : 16000;
  const subtype = pcm.encoding === "pcm_f32le" ? "L32" : "L16";
  return `audio/${subtype};rate=${sampleRateHz};channels=${channels}`;
}

function normalizeBaseUrl(value: string | undefined): string {
  const normalized = normalizeString(value);
  return (normalized ?? ELEVENLABS_DEFAULT_BASE_URL).replace(/\/+$/, "");
}

function normalizeRequestedProviderId(
  value: ResolveVoiceRuntimeAdapterArgs["requestedProviderId"],
): VoiceRuntimeProviderId {
  if (typeof value !== "string") {
    return "browser";
  }
  const normalized = value.trim().toLowerCase();
  return normalized === "elevenlabs" ? "elevenlabs" : "browser";
}

function nowFrom(getNow?: () => number): number {
  return typeof getNow === "function" ? getNow() : Date.now();
}

function extractErrorMessage(payload: unknown): string | null {
  if (typeof payload !== "object" || payload === null) {
    return null;
  }

  const typed = payload as Record<string, unknown>;
  const direct = normalizeString(typed.message);
  if (direct) {
    return direct;
  }

  const nestedError = typed.error;
  if (typeof nestedError === "object" && nestedError !== null) {
    const nestedMessage = normalizeString(
      (nestedError as Record<string, unknown>).message,
    );
    if (nestedMessage) {
      return nestedMessage;
    }
  }

  return null;
}

function parseJsonSafely(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function parseNonNegativeNumber(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return null;
  }
  return value;
}

function readHeaderNumber(
  headers: Headers,
  names: string[],
): number | null {
  for (const name of names) {
    const value = normalizeString(headers.get(name));
    if (!value) {
      continue;
    }
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed) && parsed >= 0) {
      return parsed;
    }
  }
  return null;
}

function readProviderRequestId(headers: Headers): string | undefined {
  return (
    normalizeString(headers.get("x-request-id")) ??
    normalizeString(headers.get("request-id")) ??
    normalizeString(headers.get("xi-request-id")) ??
    undefined
  );
}

function roundToThree(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function readNestedNumber(
  root: Record<string, unknown>,
  path: string[],
): number | null {
  let current: unknown = root;
  for (const key of path) {
    if (typeof current !== "object" || current === null) {
      return null;
    }
    current = (current as Record<string, unknown>)[key];
  }
  return parseNonNegativeNumber(current);
}

function readDurationSeconds(payload: Record<string, unknown>): number | null {
  const directSeconds =
    parseNonNegativeNumber(payload.audio_duration_seconds) ??
    parseNonNegativeNumber(payload.duration_seconds);
  if (directSeconds !== null) {
    return directSeconds;
  }

  const msDuration =
    parseNonNegativeNumber(payload.audio_duration_ms) ??
    parseNonNegativeNumber(payload.duration_ms);
  if (msDuration !== null) {
    return msDuration / 1000;
  }

  const nestedSeconds =
    readNestedNumber(payload, ["usage", "duration_seconds"]) ??
    readNestedNumber(payload, ["metadata", "duration_seconds"]) ??
    readNestedNumber(payload, ["usage", "audio_duration_seconds"]);
  if (nestedSeconds !== null) {
    return nestedSeconds;
  }

  const nestedMs =
    readNestedNumber(payload, ["usage", "duration_ms"]) ??
    readNestedNumber(payload, ["metadata", "duration_ms"]) ??
    readNestedNumber(payload, ["usage", "audio_duration_ms"]);
  if (nestedMs !== null) {
    return nestedMs / 1000;
  }

  return null;
}

function readReportedCostUsd(payload: Record<string, unknown>): number | null {
  return (
    parseNonNegativeNumber(payload.cost_usd) ??
    parseNonNegativeNumber(payload.usage_cost_usd) ??
    readNestedNumber(payload, ["usage", "cost_usd"]) ??
    readNestedNumber(payload, ["usage", "total_cost_usd"])
  );
}

function ensureFetch(fetchFn?: FetchLike): FetchLike {
  if (fetchFn) {
    return fetchFn;
  }
  return fetch;
}

class BrowserVoiceRuntimeAdapter implements VoiceRuntimeAdapter {
  readonly providerId: VoiceRuntimeProviderId = "browser";

  private readonly now: () => number;

  constructor(now?: () => number) {
    this.now = now ?? Date.now;
  }

  async probeHealth(): Promise<VoiceProviderHealth> {
    return {
      providerId: this.providerId,
      status: "healthy",
      checkedAt: this.now(),
      reason: "browser_runtime_local_fallback",
    };
  }

  async openSession(args: VoiceRuntimeSessionOpenArgs): Promise<VoiceRuntimeSession> {
    return {
      voiceSessionId: args.voiceSessionId,
      providerId: this.providerId,
      openedAt: this.now(),
    };
  }

  async closeSession(args: VoiceRuntimeSessionCloseArgs): Promise<void> {
    void args;
    return;
  }

  async transcribe(args: VoiceTranscriptionArgs): Promise<VoiceTranscriptionResult> {
    return {
      text: "",
      providerId: this.providerId,
      usage: {
        nativeUsageUnit: "requests",
        nativeUsageQuantity: 1,
        nativeInputUnits: args.audioBytes.byteLength,
        nativeTotalUnits: args.audioBytes.byteLength,
        nativeCostSource: "not_available",
        metadata: {
          reason: BROWSER_ADAPTER_UNSUPPORTED_REASON,
          mimeType: normalizeString(args.mimeType) ?? "audio/webm",
        },
      },
      raw: { reason: BROWSER_ADAPTER_UNSUPPORTED_REASON },
    };
  }

  async synthesize(args: VoiceSynthesisArgs): Promise<VoiceSynthesisResult> {
    const characterCount = Math.max(0, args.text.length);
    return {
      providerId: this.providerId,
      mimeType: "text/plain",
      fallbackText: args.text,
      usage: {
        nativeUsageUnit: "characters",
        nativeUsageQuantity: characterCount,
        nativeInputUnits: characterCount,
        nativeTotalUnits: characterCount,
        nativeCostSource: "not_available",
        metadata: {
          reason: BROWSER_ADAPTER_UNSUPPORTED_REASON,
        },
      },
      raw: { reason: BROWSER_ADAPTER_UNSUPPORTED_REASON },
    };
  }

  async cancelSynthesis(
    args: VoiceSynthesisCancelArgs,
  ): Promise<VoiceSynthesisCancelResult> {
    void args;
    return {
      providerId: this.providerId,
      cancelled: true,
      idempotent: true,
      reason: "browser_runtime_local_cancellation",
    };
  }
}

class ElevenLabsVoiceRuntimeAdapter implements VoiceRuntimeAdapter {
  readonly providerId: VoiceRuntimeProviderId = "elevenlabs";

  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly defaultVoiceId?: string;
  private readonly sttModelId: string;
  private readonly ttsModelId: string;
  private readonly fetchFn: FetchLike;
  private readonly now: () => number;

  constructor(options: ElevenLabsVoiceRuntimeAdapterOptions) {
    const apiKey = normalizeString(options.apiKey);
    if (!apiKey) {
      throw new Error("ElevenLabs adapter requires an API key.");
    }

    this.apiKey = apiKey;
    this.baseUrl = normalizeBaseUrl(options.baseUrl);
    this.defaultVoiceId = normalizeString(options.defaultVoiceId) ?? undefined;
    this.sttModelId =
      normalizeString(options.sttModelId) ?? ELEVENLABS_DEFAULT_STT_MODEL;
    this.ttsModelId =
      normalizeString(options.ttsModelId) ?? ELEVENLABS_DEFAULT_TTS_MODEL;
    this.fetchFn = ensureFetch(options.fetchFn);
    this.now = options.now ?? Date.now;
  }

  async probeHealth(): Promise<VoiceProviderHealth> {
    const checkedAt = this.now();
    try {
      const response = await this.fetchFn(`${this.baseUrl}/voices?page_size=1`, {
        method: "GET",
        headers: {
          "xi-api-key": this.apiKey,
          accept: "application/json",
        },
      });

      if (response.ok) {
        return {
          providerId: this.providerId,
          status: "healthy",
          checkedAt,
        };
      }

      const payload = parseJsonSafely(await response.text());
      const message = extractErrorMessage(payload);
      const status = response.status >= 500 ? "degraded" : "offline";
      return {
        providerId: this.providerId,
        status,
        checkedAt,
        reason:
          message ??
          `elevenlabs_health_probe_http_${response.status}`,
      };
    } catch (error) {
      return {
        providerId: this.providerId,
        status: "degraded",
        checkedAt,
        reason:
          error instanceof Error
            ? error.message
            : "elevenlabs_health_probe_failed",
      };
    }
  }

  async openSession(args: VoiceRuntimeSessionOpenArgs): Promise<VoiceRuntimeSession> {
    return {
      voiceSessionId: args.voiceSessionId,
      providerId: this.providerId,
      openedAt: this.now(),
    };
  }

  async closeSession(args: VoiceRuntimeSessionCloseArgs): Promise<void> {
    void args;
    return;
  }

  async transcribe(args: VoiceTranscriptionArgs): Promise<VoiceTranscriptionResult> {
    const inputByteLength = args.audioBytes.byteLength;
    const normalizedMimeType = normalizeTranscriptionMimeType(args.mimeType);
    const formData = new FormData();
    const audioBuffer = Uint8Array.from(args.audioBytes).buffer;
    const blob = new Blob([audioBuffer], {
      type: normalizedMimeType,
    });
    formData.append("file", blob, resolveTranscriptionFilename(normalizedMimeType));
    formData.append("model_id", this.sttModelId);
    const language = normalizeString(args.language);
    if (language) {
      formData.append("language_code", language);
    }

    const endpoint = `${this.baseUrl}/speech-to-text`;
    const response = await this.fetchFn(endpoint, {
      method: "POST",
      headers: {
        "xi-api-key": this.apiKey,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      const payload = parseJsonSafely(errorBody);
      const message = extractErrorMessage(payload);
      throw new Error(
        message
          ? `ElevenLabs transcription failed (${response.status}) endpoint=${endpoint} model=${this.sttModelId} mimeType=${normalizedMimeType}: ${message}`
          : `ElevenLabs transcription failed (${response.status}) endpoint=${endpoint} model=${this.sttModelId} mimeType=${normalizedMimeType}: ${errorBody.trim() || "no response body"}`,
      );
    }

    const payload = (await response.json()) as Record<string, unknown>;
    const providerRequestId = readProviderRequestId(response.headers);
    const text =
      normalizeString(payload.text) ??
      normalizeString(payload.transcript) ??
      "";

    if (!text) {
      throw new Error("ElevenLabs transcription returned no transcript text.");
    }

    const headerDurationSeconds =
      readHeaderNumber(response.headers, [
        "x-audio-duration-seconds",
        "x-duration-seconds",
      ]);
    const payloadDurationSeconds = readDurationSeconds(payload);
    const durationSeconds =
      payloadDurationSeconds ??
      headerDurationSeconds ??
      inputByteLength / ELEVENLABS_STT_ESTIMATED_BYTES_PER_SECOND;
    const reportedCostUsd =
      readReportedCostUsd(payload) ??
      readHeaderNumber(response.headers, ["x-cost-usd", "x-billing-cost-usd"]);
    const estimatedCostUsd =
      (durationSeconds / 3600) * ELEVENLABS_ESTIMATED_STT_USD_PER_HOUR;
    const costUsd = reportedCostUsd ?? estimatedCostUsd;
    const nativeCostInCents =
      Number.isFinite(costUsd) && costUsd > 0
        ? Math.max(0, Math.round(costUsd * 100))
        : undefined;

    return {
      text,
      providerId: this.providerId,
      usage: {
        nativeUsageUnit: "audio_seconds",
        nativeUsageQuantity: roundToThree(durationSeconds),
        nativeInputUnits: roundToThree(durationSeconds),
        nativeTotalUnits: roundToThree(durationSeconds),
        nativeCostInCents,
        nativeCostCurrency: nativeCostInCents !== undefined ? "USD" : undefined,
        nativeCostSource:
          reportedCostUsd !== null ? "provider_reported" : "estimated_unit_pricing",
        providerRequestId,
        metadata: {
          modelId: this.sttModelId,
          mimeType: normalizedMimeType,
          inputBytes: inputByteLength,
          durationSource:
            payloadDurationSeconds !== null
              ? "provider_payload"
              : headerDurationSeconds !== null
              ? "provider_header"
              : "byte_estimate",
        },
      },
      raw: payload,
    };
  }

  async synthesize(args: VoiceSynthesisArgs): Promise<VoiceSynthesisResult> {
    const voiceId = normalizeString(args.voiceId) ?? this.defaultVoiceId;
    if (!voiceId) {
      throw new Error(
        "No ElevenLabs voice ID provided for TTS synthesis.",
      );
    }

    const response = await this.fetchFn(
      `${this.baseUrl}/text-to-speech/${encodeURIComponent(voiceId)}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": this.apiKey,
          "content-type": "application/json",
          accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text: args.text,
          model_id: this.ttsModelId,
        }),
      },
    );

    if (!response.ok) {
      const payload = parseJsonSafely(await response.text());
      const message = extractErrorMessage(payload);
      throw new Error(
        message ?? `ElevenLabs synthesis failed (${response.status}).`,
      );
    }

    const audioBuffer = await response.arrayBuffer();
    const audioBytes = new Uint8Array(audioBuffer);
    if (audioBytes.byteLength === 0) {
      throw new Error("ElevenLabs synthesis returned empty audio.");
    }

    const providerRequestId = readProviderRequestId(response.headers);
    const inputCharacterCount = Math.max(0, args.text.length);
    const reportedCharacterCount =
      readHeaderNumber(response.headers, [
        "x-characters-used",
        "x-character-count",
      ]) ?? parseNonNegativeNumber(inputCharacterCount);
    const reportedCostUsd = readHeaderNumber(response.headers, [
      "x-cost-usd",
      "x-billing-cost-usd",
    ]);
    const estimatedCostUsd =
      ((reportedCharacterCount ?? inputCharacterCount) / 1000) *
      ELEVENLABS_ESTIMATED_TTS_USD_PER_1K_CHAR;
    const costUsd = reportedCostUsd ?? estimatedCostUsd;
    const nativeCostInCents =
      Number.isFinite(costUsd) && costUsd > 0
        ? Math.max(0, Math.round(costUsd * 100))
        : undefined;
    const normalizedCharacterCount = reportedCharacterCount ?? inputCharacterCount;

    return {
      providerId: this.providerId,
      mimeType: response.headers.get("content-type") ?? "audio/mpeg",
      audioBase64: encodeBytesToBase64(audioBytes),
      usage: {
        nativeUsageUnit: "characters",
        nativeUsageQuantity: normalizedCharacterCount,
        nativeInputUnits: normalizedCharacterCount,
        nativeTotalUnits: normalizedCharacterCount,
        nativeCostInCents,
        nativeCostCurrency: nativeCostInCents !== undefined ? "USD" : undefined,
        nativeCostSource:
          reportedCostUsd !== null ? "provider_reported" : "estimated_unit_pricing",
        providerRequestId,
        metadata: {
          modelId: this.ttsModelId,
          voiceId,
          responseBytes: audioBytes.byteLength,
        },
      },
      raw: { voiceId },
    };
  }

  async cancelSynthesis(
    args: VoiceSynthesisCancelArgs,
  ): Promise<VoiceSynthesisCancelResult> {
    void args;
    return {
      providerId: this.providerId,
      cancelled: true,
      idempotent: true,
      reason: "best_effort_provider_cancel_not_supported",
    };
  }
}

export function createBrowserVoiceRuntimeAdapter(
  now?: () => number,
): VoiceRuntimeAdapter {
  return new BrowserVoiceRuntimeAdapter(now);
}

export function createElevenLabsVoiceRuntimeAdapter(
  options: ElevenLabsVoiceRuntimeAdapterOptions,
): VoiceRuntimeAdapter {
  return new ElevenLabsVoiceRuntimeAdapter(options);
}

export function normalizeVoiceRuntimeProviderId(
  value: ResolveVoiceRuntimeAdapterArgs["requestedProviderId"],
): VoiceRuntimeProviderId {
  return normalizeRequestedProviderId(value);
}

interface VoiceRuntimeProviderAdapterFactory {
  create(args: ResolveVoiceRuntimeAdapterArgs): VoiceRuntimeAdapter | null;
  missingCredentialReason: string;
}

const VOICE_RUNTIME_PROVIDER_FACTORIES: Record<
  NonBrowserVoiceRuntimeProviderId,
  VoiceRuntimeProviderAdapterFactory
> = {
  elevenlabs: {
    create: (args) => {
      const apiKey = normalizeString(args.elevenLabsBinding?.apiKey);
      if (!apiKey) {
        return null;
      }
      return createElevenLabsVoiceRuntimeAdapter({
        apiKey,
        baseUrl: args.elevenLabsBinding?.baseUrl,
        defaultVoiceId: args.elevenLabsBinding?.defaultVoiceId,
        fetchFn: args.fetchFn,
        now: args.now,
      });
    },
    missingCredentialReason: "missing_elevenlabs_api_key",
  },
};

export async function resolveVoiceRuntimeAdapter(
  args: ResolveVoiceRuntimeAdapterArgs,
): Promise<ResolvedVoiceRuntimeAdapter> {
  const requestedProviderId = normalizeRequestedProviderId(
    args.requestedProviderId,
  );
  const browserAdapter = createBrowserVoiceRuntimeAdapter(args.now);

  if (requestedProviderId === "browser") {
    return {
      adapter: browserAdapter,
      requestedProviderId,
      health: await browserAdapter.probeHealth(),
    };
  }

  const factory = VOICE_RUNTIME_PROVIDER_FACTORIES[requestedProviderId];
  if (!factory) {
    return {
      adapter: browserAdapter,
      requestedProviderId,
      fallbackFromProviderId: requestedProviderId,
      health: {
        providerId: requestedProviderId,
        status: "degraded",
        checkedAt: nowFrom(args.now),
        reason: "unsupported_voice_runtime_provider",
        fallbackProviderId: "browser",
      },
    };
  }

  const providerAdapter = factory.create(args);
  if (!providerAdapter) {
    return {
      adapter: browserAdapter,
      requestedProviderId,
      fallbackFromProviderId: requestedProviderId,
      health: {
        providerId: requestedProviderId,
        status: "degraded",
        checkedAt: nowFrom(args.now),
        reason: factory.missingCredentialReason,
        fallbackProviderId: "browser",
      },
    };
  }

  const providerHealth = await providerAdapter.probeHealth();

  if (providerHealth.status !== "healthy") {
    return {
      adapter: browserAdapter,
      requestedProviderId,
      fallbackFromProviderId: requestedProviderId,
      health: {
        ...providerHealth,
        fallbackProviderId: "browser",
      },
    };
  }

  return {
    adapter: providerAdapter,
    requestedProviderId,
    health: providerHealth,
  };
}
