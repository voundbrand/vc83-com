import {
  type MediaSessionCaptureAudioRuntime,
  type MediaSessionCaptureDiagnostics,
  type MediaSessionCaptureFrame,
  type MediaSessionCaptureMetadata,
  normalizeMediaSessionCaptureFrame,
} from "../session/mediaSessionContract";

export const DEFAULT_DESKTOP_CAPTURE_SOURCE_ID = "desktop:primary";
export const DEFAULT_DESKTOP_CAPTURE_FRAME_RATE = 12;
export const DEFAULT_DESKTOP_CAPTURE_MIN_DURATION_MS = 250;
export const DEFAULT_DESKTOP_CAPTURE_MAX_DURATION_MS = 30_000;

export interface DesktopCaptureRawFrame {
  frameTimestampMs?: number;
  captureTimestampMs?: number;
  mimeType?: string;
  payloadRef?: string;
  sizeBytes?: number;
  width?: number;
  height?: number;
  metadata?: MediaSessionCaptureMetadata;
}

export interface DesktopCaptureRecordingAudioTrack {
  sampleRateHz?: number;
  channels?: number;
  mimeType?: string;
}

export interface DesktopCaptureRecordingPayload {
  startedAtMs?: number;
  endedAtMs?: number;
  captureToIngressLatencyMs?: number;
  droppedFrameCount?: number;
  lateFrameCount?: number;
  frames: DesktopCaptureRawFrame[];
  audioTrack?: DesktopCaptureRecordingAudioTrack;
}

export interface DesktopCaptureScreenshotProviderInput {
  sourceId: string;
  deviceId?: string;
}

export interface DesktopCaptureRecordingProviderInput {
  sourceId: string;
  durationMs: number;
  frameRate: number;
  withMicAudio: boolean;
  withSystemAudio: boolean;
}

export interface DesktopCaptureProvider {
  captureScreenshot(
    input: DesktopCaptureScreenshotProviderInput
  ): Promise<DesktopCaptureRawFrame>;
  captureRecording(
    input: DesktopCaptureRecordingProviderInput
  ): Promise<DesktopCaptureRecordingPayload>;
}

export interface DesktopCaptureScreenshotRequest {
  liveSessionId: string;
  sourceId?: string;
  deviceId?: string;
}

export interface DesktopCaptureRecordingRequest {
  liveSessionId: string;
  sourceId?: string;
  durationMs: number;
  frameRate?: number;
  withMicAudio?: boolean;
  withSystemAudio?: boolean;
}

export interface DesktopCaptureRecordingResult {
  requestedDurationMs: number;
  boundedDurationMs: number;
  frameRate: number;
  sourceId: string;
  withMicAudio: boolean;
  withSystemAudio: boolean;
  frames: MediaSessionCaptureFrame[];
  diagnostics: MediaSessionCaptureDiagnostics;
}

export interface DesktopCaptureAdapter {
  captureScreenshot(
    request: DesktopCaptureScreenshotRequest
  ): Promise<MediaSessionCaptureFrame>;
  captureRecording(
    request: DesktopCaptureRecordingRequest
  ): Promise<DesktopCaptureRecordingResult>;
}

export interface DesktopCaptureAdapterOptions {
  provider: DesktopCaptureProvider;
  now?: () => number;
  defaultSourceId?: string;
  defaultFrameRate?: number;
  minRecordingDurationMs?: number;
  maxRecordingDurationMs?: number;
}

interface DesktopCaptureAdapterSettings {
  provider: DesktopCaptureProvider;
  now: () => number;
  defaultSourceId: string;
  defaultFrameRate: number;
  minRecordingDurationMs: number;
  maxRecordingDurationMs: number;
}

function normalizeRequiredString(value: string, fieldName: string): string {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) {
    throw new Error(`Desktop capture requires ${fieldName}.`);
  }
  return normalized;
}

function normalizePositiveNumber(
  value: number | undefined,
  fallback: number
): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return fallback;
  }
  return Math.floor(value);
}

function clampDurationMs(
  requestedDurationMs: number,
  minDurationMs: number,
  maxDurationMs: number
): number {
  if (!Number.isFinite(requestedDurationMs) || requestedDurationMs <= 0) {
    return minDurationMs;
  }
  return Math.min(maxDurationMs, Math.max(minDurationMs, Math.floor(requestedDurationMs)));
}

function normalizeSourceId(
  sourceId: string | undefined,
  defaultSourceId: string
): string {
  if (!sourceId) {
    return defaultSourceId;
  }
  const normalized = sourceId.trim();
  return normalized || defaultSourceId;
}

function resolveSettings(
  options: DesktopCaptureAdapterOptions
): DesktopCaptureAdapterSettings {
  const minRecordingDurationMs = normalizePositiveNumber(
    options.minRecordingDurationMs,
    DEFAULT_DESKTOP_CAPTURE_MIN_DURATION_MS
  );
  const maxRecordingDurationMs = normalizePositiveNumber(
    options.maxRecordingDurationMs,
    DEFAULT_DESKTOP_CAPTURE_MAX_DURATION_MS
  );
  if (maxRecordingDurationMs < minRecordingDurationMs) {
    throw new Error(
      "Desktop capture maxRecordingDurationMs must be >= minRecordingDurationMs."
    );
  }

  return {
    provider: options.provider,
    now: options.now ?? Date.now,
    defaultSourceId: normalizeSourceId(
      options.defaultSourceId,
      DEFAULT_DESKTOP_CAPTURE_SOURCE_ID
    ),
    defaultFrameRate: normalizePositiveNumber(
      options.defaultFrameRate,
      DEFAULT_DESKTOP_CAPTURE_FRAME_RATE
    ),
    minRecordingDurationMs,
    maxRecordingDurationMs,
  };
}

function buildAudioRuntime(
  withMicAudio: boolean,
  withSystemAudio: boolean,
  audioTrack: DesktopCaptureRecordingAudioTrack | undefined
): MediaSessionCaptureAudioRuntime | undefined {
  if (!withMicAudio && !withSystemAudio && !audioTrack) {
    return undefined;
  }
  return {
    withMicAudio,
    withSystemAudio,
    sampleRateHz: audioTrack?.sampleRateHz,
    channels: audioTrack?.channels,
    mimeType: audioTrack?.mimeType,
  };
}

export function createDesktopCaptureAdapter(
  options: DesktopCaptureAdapterOptions
): DesktopCaptureAdapter {
  const settings = resolveSettings(options);

  return {
    async captureScreenshot(
      request: DesktopCaptureScreenshotRequest
    ): Promise<MediaSessionCaptureFrame> {
      const liveSessionId = normalizeRequiredString(
        request.liveSessionId,
        "liveSessionId"
      );
      const sourceId = normalizeSourceId(request.sourceId, settings.defaultSourceId);
      const rawFrame = await settings.provider.captureScreenshot({
        sourceId,
        deviceId: request.deviceId,
      });
      const fallbackTimestamp = settings.now();
      const metadata: MediaSessionCaptureMetadata | undefined = request.deviceId
        ? {
            ...(rawFrame.metadata ?? {}),
            deviceId: request.deviceId,
          }
        : rawFrame.metadata;

      return normalizeMediaSessionCaptureFrame({
        liveSessionId,
        sourceClass: "desktop_screenshot",
        captureMode: "screenshot",
        sourceId,
        sequence: 1,
        frameTimestampMs: rawFrame.frameTimestampMs ?? fallbackTimestamp,
        captureTimestampMs:
          rawFrame.captureTimestampMs ??
          rawFrame.frameTimestampMs ??
          fallbackTimestamp,
        mimeType: rawFrame.mimeType ?? "image/png",
        payloadRef: rawFrame.payloadRef,
        sizeBytes: rawFrame.sizeBytes,
        resolution: {
          width: rawFrame.width,
          height: rawFrame.height,
        },
        metadata,
      });
    },

    async captureRecording(
      request: DesktopCaptureRecordingRequest
    ): Promise<DesktopCaptureRecordingResult> {
      const liveSessionId = normalizeRequiredString(
        request.liveSessionId,
        "liveSessionId"
      );
      const sourceId = normalizeSourceId(request.sourceId, settings.defaultSourceId);
      const requestedDurationMs = normalizePositiveNumber(
        request.durationMs,
        settings.minRecordingDurationMs
      );
      const boundedDurationMs = clampDurationMs(
        requestedDurationMs,
        settings.minRecordingDurationMs,
        settings.maxRecordingDurationMs
      );
      const frameRate = normalizePositiveNumber(
        request.frameRate,
        settings.defaultFrameRate
      );
      const withMicAudio = request.withMicAudio === true;
      const withSystemAudio = request.withSystemAudio === true;

      const payload = await settings.provider.captureRecording({
        sourceId,
        durationMs: boundedDurationMs,
        frameRate,
        withMicAudio,
        withSystemAudio,
      });

      const startedAtMs = normalizePositiveNumber(payload.startedAtMs, settings.now());
      const frames = payload.frames.map((frame, index) =>
        normalizeMediaSessionCaptureFrame({
          liveSessionId,
          sourceClass: "desktop_record",
          captureMode: "record",
          sourceId,
          sequence: index + 1,
          frameTimestampMs: frame.frameTimestampMs ?? startedAtMs + index,
          captureTimestampMs: frame.captureTimestampMs ?? frame.frameTimestampMs,
          mimeType: frame.mimeType ?? "video/webm",
          payloadRef: frame.payloadRef,
          sizeBytes: frame.sizeBytes,
          resolution: {
            width: frame.width,
            height: frame.height,
          },
          frameRate,
          audioRuntime: buildAudioRuntime(
            withMicAudio,
            withSystemAudio,
            payload.audioTrack
          ),
          metadata: frame.metadata,
        })
      );

      const diagnostics: MediaSessionCaptureDiagnostics = {
        requestedDurationMs,
        boundedDurationMs,
        frameCount: frames.length,
        droppedFrameCount: normalizePositiveNumber(payload.droppedFrameCount, 0),
        lateFrameCount: normalizePositiveNumber(payload.lateFrameCount, 0),
        captureToIngressLatencyMs: normalizePositiveNumber(
          payload.captureToIngressLatencyMs,
          0
        ),
      };

      return {
        requestedDurationMs,
        boundedDurationMs,
        frameRate,
        sourceId,
        withMicAudio,
        withSystemAudio,
        frames,
        diagnostics,
      };
    },
  };
}
