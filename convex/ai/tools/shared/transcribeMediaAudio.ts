const OPENAI_TRANSCRIPTION_ENDPOINT = "https://api.openai.com/v1/audio/transcriptions";
export const OPENAI_TRANSCRIPTION_MODEL = "whisper-1";
export const OPENAI_MAX_AUDIO_BYTES = 25 * 1024 * 1024;

const EXTENSION_TO_MIME_TYPE: Record<string, string> = {
  mp3: "audio/mpeg",
  mpeg: "audio/mpeg",
  ogg: "audio/ogg",
  opus: "audio/ogg",
  wav: "audio/wav",
  m4a: "audio/mp4",
  mp4: "audio/mp4",
  webm: "audio/webm",
};

const MIME_TYPE_TO_EXTENSION: Record<string, string> = {
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/ogg": "ogg",
  "audio/opus": "ogg",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/mp4": "m4a",
  "audio/m4a": "m4a",
  "video/mp4": "m4a",
  "audio/webm": "webm",
};

const MIME_TYPE_ALIASES: Record<string, string> = {
  "audio/mp3": "audio/mpeg",
  "audio/opus": "audio/ogg",
  "audio/x-wav": "audio/wav",
  "audio/m4a": "audio/mp4",
  "video/mp4": "audio/mp4",
};

export type TranscribeMediaAudioTimestampMode = "none" | "segment";

export type TranscribeMediaAudioErrorCode =
  | "AUDIO_URL_MISSING"
  | "OPENAI_API_KEY_MISSING"
  | "AUDIO_DOWNLOAD_FAILED"
  | "AUDIO_TOO_LARGE"
  | "AUDIO_TRANSCRIPTION_FAILED"
  | "AUDIO_TRANSCRIPT_EMPTY";

export interface TranscribeMediaAudioSegment {
  startMs: number;
  durationMs: number;
  text: string;
}

export interface TranscribeMediaAudioSuccessResult {
  success: true;
  code: "TRANSCRIPTION_SUCCESS";
  message: string;
  text: string;
  detectedLanguage?: string;
  durationSeconds?: number;
  segments: TranscribeMediaAudioSegment[];
  audioBytes: number;
  audioContentType: string;
  model: typeof OPENAI_TRANSCRIPTION_MODEL;
}

export interface TranscribeMediaAudioFailureResult {
  success: false;
  code: TranscribeMediaAudioErrorCode;
  message: string;
  userMessage: string;
  statusCode?: number;
}

export type TranscribeMediaAudioResult =
  | TranscribeMediaAudioSuccessResult
  | TranscribeMediaAudioFailureResult;

interface TranscribeMediaAudioInput {
  audioUrl: string;
  language?: string;
  preferredMimeType?: string;
  timestamps?: TranscribeMediaAudioTimestampMode;
  filenameBase?: string;
}

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeTranscriptText(value: string): string {
  return value
    .replace(/\r/g, " ")
    .replace(/\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toFiniteNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return undefined;
}

function normalizeMimeType(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  const normalized = value.split(";")[0]?.trim().toLowerCase() || "";
  if (!normalized) {
    return null;
  }
  return MIME_TYPE_ALIASES[normalized] || normalized;
}

function inferMimeTypeFromUrl(audioUrl: string): string | null {
  try {
    const parsed = new URL(audioUrl);
    const filename = parsed.pathname.split("/").pop() || "";
    const extMatch = filename.toLowerCase().match(/\.([a-z0-9]+)$/);
    const extension = extMatch?.[1];
    if (!extension) {
      return null;
    }
    return EXTENSION_TO_MIME_TYPE[extension] || null;
  } catch {
    return null;
  }
}

function resolveAudioMimeType(args: {
  responseContentType: string | null;
  preferredMimeType?: string;
  audioUrl: string;
}): string {
  const responseMimeType = normalizeMimeType(args.responseContentType);
  if (responseMimeType && responseMimeType.startsWith("audio/")) {
    return responseMimeType;
  }

  const preferredMimeType = normalizeMimeType(args.preferredMimeType);
  if (preferredMimeType && preferredMimeType.startsWith("audio/")) {
    return preferredMimeType;
  }

  const inferredMimeType = normalizeMimeType(inferMimeTypeFromUrl(args.audioUrl));
  if (inferredMimeType) {
    return inferredMimeType;
  }

  return "audio/mpeg";
}

function resolveAudioExtension(args: {
  contentType: string;
  audioUrl: string;
}): string {
  const normalizedContentType = normalizeMimeType(args.contentType);
  if (normalizedContentType && MIME_TYPE_TO_EXTENSION[normalizedContentType]) {
    return MIME_TYPE_TO_EXTENSION[normalizedContentType];
  }

  try {
    const parsed = new URL(args.audioUrl);
    const filename = parsed.pathname.split("/").pop() || "";
    const extMatch = filename.toLowerCase().match(/\.([a-z0-9]+)$/);
    const extension = extMatch?.[1];
    if (extension && EXTENSION_TO_MIME_TYPE[extension]) {
      return extension;
    }
  } catch {
    // Ignore URL parse errors and fall back to default extension.
  }

  return "mp3";
}

function formatMegabytes(bytes: number): string {
  const megabytes = bytes / (1024 * 1024);
  return `${megabytes.toFixed(1)}MB`;
}

function normalizeOpenAiSegments(value: unknown): TranscribeMediaAudioSegment[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const segments: TranscribeMediaAudioSegment[] = [];
  for (const rawSegment of value) {
    if (!rawSegment || typeof rawSegment !== "object") {
      continue;
    }

    const segment = rawSegment as Record<string, unknown>;
    const text = normalizeTranscriptText(normalizeOptionalString(segment.text) || "");
    if (!text) {
      continue;
    }

    const startSeconds = toFiniteNumber(segment.start) || 0;
    const endSeconds = toFiniteNumber(segment.end);
    const startMs = Math.max(0, Math.floor(startSeconds * 1000));
    const durationMs = endSeconds && endSeconds > startSeconds
      ? Math.max(0, Math.floor((endSeconds - startSeconds) * 1000))
      : 0;

    segments.push({
      startMs,
      durationMs,
      text,
    });
  }

  return segments;
}

function buildFailureResult(args: {
  code: TranscribeMediaAudioErrorCode;
  message: string;
  userMessage: string;
  statusCode?: number;
}): TranscribeMediaAudioFailureResult {
  return {
    success: false,
    code: args.code,
    message: args.message,
    userMessage: args.userMessage,
    statusCode: args.statusCode,
  };
}

export async function transcribeMediaAudio(
  input: TranscribeMediaAudioInput
): Promise<TranscribeMediaAudioResult> {
  const audioUrl = normalizeOptionalString(input.audioUrl);
  if (!audioUrl) {
    return buildFailureResult({
      code: "AUDIO_URL_MISSING",
      message: "No audio URL was provided for transcription.",
      userMessage: "Provide a valid audio URL before requesting transcription.",
    });
  }

  const openAiApiKey = normalizeOptionalString(process.env.OPENAI_API_KEY);
  if (!openAiApiKey) {
    return buildFailureResult({
      code: "OPENAI_API_KEY_MISSING",
      message: "Missing OPENAI_API_KEY environment variable.",
      userMessage:
        "Audio transcription is not configured yet. Add OPENAI_API_KEY to enable it.",
    });
  }

  let audioResponse: Response;
  try {
    audioResponse = await fetch(audioUrl);
  } catch (error) {
    return buildFailureResult({
      code: "AUDIO_DOWNLOAD_FAILED",
      message:
        `Audio download request failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      userMessage:
        "Could not download the audio source. Ask for a reachable direct audio URL or upload the file.",
    });
  }

  if (!audioResponse.ok) {
    return buildFailureResult({
      code: "AUDIO_DOWNLOAD_FAILED",
      message: `Audio download failed with HTTP ${audioResponse.status}.`,
      userMessage:
        `Could not download the audio source (HTTP ${audioResponse.status}). Confirm the link is still accessible.`,
      statusCode: audioResponse.status,
    });
  }

  const contentLength = toFiniteNumber(audioResponse.headers.get("content-length"));
  if (contentLength && contentLength > OPENAI_MAX_AUDIO_BYTES) {
    return buildFailureResult({
      code: "AUDIO_TOO_LARGE",
      message:
        `Audio content-length ${contentLength} bytes exceeds ${OPENAI_MAX_AUDIO_BYTES} byte limit.`,
      userMessage:
        `Audio file is too large (${formatMegabytes(contentLength)}). OpenAI Whisper supports up to 25MB per request.`,
    });
  }

  let audioBuffer: ArrayBuffer;
  try {
    audioBuffer = await audioResponse.arrayBuffer();
  } catch (error) {
    return buildFailureResult({
      code: "AUDIO_DOWNLOAD_FAILED",
      message:
        `Unable to read downloaded audio body: ${
          error instanceof Error ? error.message : String(error)
        }`,
      userMessage: "Downloaded audio could not be read. Ask the user to resend the file.",
    });
  }

  if (audioBuffer.byteLength > OPENAI_MAX_AUDIO_BYTES) {
    return buildFailureResult({
      code: "AUDIO_TOO_LARGE",
      message:
        `Audio body ${audioBuffer.byteLength} bytes exceeds ${OPENAI_MAX_AUDIO_BYTES} byte limit.`,
      userMessage:
        `Audio file is too large (${formatMegabytes(audioBuffer.byteLength)}). OpenAI Whisper supports up to 25MB per request.`,
    });
  }

  const audioContentType = resolveAudioMimeType({
    responseContentType: audioResponse.headers.get("content-type"),
    preferredMimeType: input.preferredMimeType,
    audioUrl,
  });
  const fileExtension = resolveAudioExtension({
    contentType: audioContentType,
    audioUrl,
  });
  const filenameBase = normalizeOptionalString(input.filenameBase) || "audio";

  const formData = new FormData();
  formData.append(
    "file",
    new Blob([audioBuffer], { type: audioContentType }),
    `${filenameBase}.${fileExtension}`
  );
  formData.append("model", OPENAI_TRANSCRIPTION_MODEL);

  const language = normalizeOptionalString(input.language);
  if (language) {
    formData.append("language", language);
  }

  formData.append("response_format", "verbose_json");

  const timestampMode = input.timestamps || "segment";
  if (timestampMode === "segment") {
    formData.append("timestamp_granularities[]", "segment");
  }

  let transcriptionResponse: Response;
  try {
    transcriptionResponse = await fetch(OPENAI_TRANSCRIPTION_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAiApiKey}`,
      },
      body: formData,
    });
  } catch (error) {
    return buildFailureResult({
      code: "AUDIO_TRANSCRIPTION_FAILED",
      message:
        `OpenAI transcription request failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      userMessage:
        "OpenAI transcription request failed before a response was received. Try again in a moment.",
    });
  }

  if (!transcriptionResponse.ok) {
    const errorText = await transcriptionResponse.text();
    return buildFailureResult({
      code: "AUDIO_TRANSCRIPTION_FAILED",
      message:
        `OpenAI transcription request failed with HTTP ${transcriptionResponse.status}: ${errorText}`,
      userMessage:
        `OpenAI transcription failed (HTTP ${transcriptionResponse.status}). Retry with a shorter clip or a clearer recording.`,
      statusCode: transcriptionResponse.status,
    });
  }

  let payload: Record<string, unknown>;
  try {
    const jsonPayload = await transcriptionResponse.json();
    payload =
      jsonPayload && typeof jsonPayload === "object"
        ? (jsonPayload as Record<string, unknown>)
        : {};
  } catch (error) {
    return buildFailureResult({
      code: "AUDIO_TRANSCRIPTION_FAILED",
      message:
        `OpenAI transcription response was not valid JSON: ${
          error instanceof Error ? error.message : String(error)
        }`,
      userMessage: "Transcription response was unreadable. Retry the request.",
    });
  }

  const text = normalizeTranscriptText(normalizeOptionalString(payload.text) || "");
  if (!text) {
    return buildFailureResult({
      code: "AUDIO_TRANSCRIPT_EMPTY",
      message: "OpenAI transcription completed but returned an empty transcript.",
      userMessage:
        "Transcription finished but returned no text. Ask for a clearer recording or use captions if available.",
    });
  }

  return {
    success: true,
    code: "TRANSCRIPTION_SUCCESS",
    message: "Audio transcribed successfully.",
    text,
    detectedLanguage: normalizeOptionalString(payload.language) || undefined,
    durationSeconds: toFiniteNumber(payload.duration),
    segments: timestampMode === "segment" ? normalizeOpenAiSegments(payload.segments) : [],
    audioBytes: audioBuffer.byteLength,
    audioContentType,
    model: OPENAI_TRANSCRIPTION_MODEL,
  };
}
