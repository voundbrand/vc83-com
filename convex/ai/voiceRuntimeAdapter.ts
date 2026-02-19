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

export interface VoiceRuntimeSession {
  voiceSessionId: string;
  providerId: VoiceRuntimeProviderId;
  openedAt: number;
}

export interface VoiceTranscriptionResult {
  text: string;
  providerId: VoiceRuntimeProviderId;
  confidence?: number;
  raw?: unknown;
}

export interface VoiceSynthesisResult {
  providerId: VoiceRuntimeProviderId;
  mimeType: string;
  audioBase64?: string;
  fallbackText?: string;
  raw?: unknown;
}

export interface VoiceRuntimeAdapter {
  readonly providerId: VoiceRuntimeProviderId;
  probeHealth(): Promise<VoiceProviderHealth>;
  openSession(args: VoiceRuntimeSessionOpenArgs): Promise<VoiceRuntimeSession>;
  closeSession(args: VoiceRuntimeSessionCloseArgs): Promise<void>;
  transcribe(args: VoiceTranscriptionArgs): Promise<VoiceTranscriptionResult>;
  synthesize(args: VoiceSynthesisArgs): Promise<VoiceSynthesisResult>;
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
const BROWSER_ADAPTER_UNSUPPORTED_REASON =
  "browser_runtime_requires_client_side_voice_processing";

function normalizeString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
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
    void args;
    return {
      text: "",
      providerId: this.providerId,
      raw: { reason: BROWSER_ADAPTER_UNSUPPORTED_REASON },
    };
  }

  async synthesize(args: VoiceSynthesisArgs): Promise<VoiceSynthesisResult> {
    return {
      providerId: this.providerId,
      mimeType: "text/plain",
      fallbackText: args.text,
      raw: { reason: BROWSER_ADAPTER_UNSUPPORTED_REASON },
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
    const formData = new FormData();
    const audioBuffer = Uint8Array.from(args.audioBytes).buffer;
    const blob = new Blob([audioBuffer], {
      type: normalizeString(args.mimeType) ?? "audio/webm",
    });
    formData.append("file", blob, "voice-input.webm");
    formData.append("model_id", this.sttModelId);
    const language = normalizeString(args.language);
    if (language) {
      formData.append("language_code", language);
    }

    const response = await this.fetchFn(`${this.baseUrl}/speech-to-text`, {
      method: "POST",
      headers: {
        "xi-api-key": this.apiKey,
      },
      body: formData,
    });

    if (!response.ok) {
      const payload = parseJsonSafely(await response.text());
      const message = extractErrorMessage(payload);
      throw new Error(
        message ??
          `ElevenLabs transcription failed (${response.status}).`,
      );
    }

    const payload = (await response.json()) as Record<string, unknown>;
    const text =
      normalizeString(payload.text) ??
      normalizeString(payload.transcript) ??
      "";

    if (!text) {
      throw new Error("ElevenLabs transcription returned no transcript text.");
    }

    return {
      text,
      providerId: this.providerId,
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
    if (audioBuffer.byteLength === 0) {
      throw new Error("ElevenLabs synthesis returned empty audio.");
    }

    return {
      providerId: this.providerId,
      mimeType: response.headers.get("content-type") ?? "audio/mpeg",
      audioBase64: Buffer.from(audioBuffer).toString("base64"),
      raw: { voiceId },
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
