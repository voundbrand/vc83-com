import {
  type MediaSessionCaptureAudioRuntime,
  type MediaSessionCaptureDiagnostics,
  type MediaSessionCaptureFrame,
  type MediaSessionCaptureMetadata,
  normalizeMediaSessionCaptureFrame,
} from "../session/mediaSessionContract";

export const DEVICE_INGEST_SOURCE_CLASS_VALUES = [
  "webcam",
  "usb_capture",
  "hdmi_capture",
  "ndi_capture",
] as const;
export type DeviceIngestSourceClass =
  (typeof DEVICE_INGEST_SOURCE_CLASS_VALUES)[number];

export const DEFAULT_DEVICE_INGEST_PROVIDER_ID = "native_capture_runtime";
export const DEFAULT_DEVICE_INGEST_SOURCE_DEVICE_ID = "primary";
export const DEFAULT_DEVICE_INGEST_FRAME_RATE = 30;

export interface DeviceIngestRawFrame {
  frameTimestampMs?: number;
  captureTimestampMs?: number;
  mimeType?: string;
  payloadRef?: string;
  sizeBytes?: number;
  width?: number;
  height?: number;
  captureToIngressLatencyMs?: number;
  droppedFrameCount?: number;
  lateFrameCount?: number;
  metadata?: MediaSessionCaptureMetadata;
}

export interface DeviceIngestProviderFrameInput {
  sourceClass: DeviceIngestSourceClass;
  sourceId: string;
  sequence: number;
  frameRate: number;
  withMicAudio: boolean;
  withSystemAudio: boolean;
}

export interface DeviceIngestProvider {
  captureFrame(input: DeviceIngestProviderFrameInput): Promise<DeviceIngestRawFrame>;
}

export interface DeviceIngestCaptureRequest {
  liveSessionId: string;
  sourceClass: DeviceIngestSourceClass;
  providerId?: string;
  deviceId?: string;
  streamId?: string;
  frameRate?: number;
  sequence?: number;
  withMicAudio?: boolean;
  withSystemAudio?: boolean;
}

export interface DeviceIngestAdapterOptions {
  provider: DeviceIngestProvider;
  now?: () => number;
  defaultProviderId?: string;
  defaultFrameRate?: number;
}

export interface DeviceIngestAdapter {
  captureFrame(request: DeviceIngestCaptureRequest): Promise<MediaSessionCaptureFrame>;
}

interface DeviceIngestAdapterSettings {
  provider: DeviceIngestProvider;
  now: () => number;
  defaultProviderId: string;
  defaultFrameRate: number;
}

interface SourceRuntimeState {
  nextSequence: number;
  lastFrameTimestampMs?: number;
}

export interface DeviceIngressSourceIdentityInput {
  sourceClass: DeviceIngestSourceClass;
  providerId?: string;
  deviceId?: string;
  streamId?: string;
}

function normalizeRequiredString(value: string, fieldName: string): string {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) {
    throw new Error(`Device ingest requires ${fieldName}.`);
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

function normalizeIdentityToken(value: string | undefined, fallback: string): string {
  if (!value) {
    return fallback;
  }
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return normalized || fallback;
}

export function buildDeviceIngressSourceId(
  input: DeviceIngressSourceIdentityInput
): string {
  const sourceClass = input.sourceClass;
  const providerId = normalizeIdentityToken(
    input.providerId,
    DEFAULT_DEVICE_INGEST_PROVIDER_ID
  );
  const deviceId = normalizeIdentityToken(
    input.deviceId,
    DEFAULT_DEVICE_INGEST_SOURCE_DEVICE_ID
  );
  const streamId = normalizeIdentityToken(input.streamId, "");
  if (streamId) {
    return `${sourceClass}:${providerId}:${deviceId}:${streamId}`;
  }
  return `${sourceClass}:${providerId}:${deviceId}`;
}

function resolveSettings(
  options: DeviceIngestAdapterOptions
): DeviceIngestAdapterSettings {
  const defaultProviderId = normalizeIdentityToken(
    options.defaultProviderId,
    DEFAULT_DEVICE_INGEST_PROVIDER_ID
  );
  return {
    provider: options.provider,
    now: options.now ?? Date.now,
    defaultProviderId,
    defaultFrameRate: normalizePositiveNumber(
      options.defaultFrameRate,
      DEFAULT_DEVICE_INGEST_FRAME_RATE
    ),
  };
}

function resolveSourceState(
  sourceRuntimeState: Map<string, SourceRuntimeState>,
  sourceId: string
): SourceRuntimeState {
  const existing = sourceRuntimeState.get(sourceId);
  if (existing) {
    return existing;
  }
  const created: SourceRuntimeState = {
    nextSequence: 1,
  };
  sourceRuntimeState.set(sourceId, created);
  return created;
}

function resolveSequence(
  sourceState: SourceRuntimeState,
  requestedSequence: number | undefined
): number {
  if (
    typeof requestedSequence === "number" &&
    Number.isFinite(requestedSequence) &&
    requestedSequence > 0
  ) {
    const normalized = Math.floor(requestedSequence);
    sourceState.nextSequence = Math.max(sourceState.nextSequence, normalized + 1);
    return normalized;
  }
  const sequence = sourceState.nextSequence;
  sourceState.nextSequence += 1;
  return sequence;
}

function resolveFrameTimestampMs(
  rawFrameTimestampMs: number | undefined,
  fallbackTimestampMs: number,
  sourceState: SourceRuntimeState
): number {
  let frameTimestampMs: number;
  if (typeof rawFrameTimestampMs === "number" && Number.isFinite(rawFrameTimestampMs)) {
    frameTimestampMs = Math.floor(rawFrameTimestampMs);
  } else {
    frameTimestampMs = Math.floor(fallbackTimestampMs);
  }
  if (
    typeof sourceState.lastFrameTimestampMs === "number" &&
    frameTimestampMs <= sourceState.lastFrameTimestampMs
  ) {
    frameTimestampMs = sourceState.lastFrameTimestampMs + 1;
  }
  sourceState.lastFrameTimestampMs = frameTimestampMs;
  return frameTimestampMs;
}

function resolveDiagnostics(
  frame: DeviceIngestRawFrame
): MediaSessionCaptureDiagnostics | undefined {
  const diagnostics: MediaSessionCaptureDiagnostics = {};
  if (
    typeof frame.captureToIngressLatencyMs === "number" &&
    Number.isFinite(frame.captureToIngressLatencyMs) &&
    frame.captureToIngressLatencyMs > 0
  ) {
    diagnostics.captureToIngressLatencyMs = Math.floor(frame.captureToIngressLatencyMs);
  }
  if (
    typeof frame.droppedFrameCount === "number" &&
    Number.isFinite(frame.droppedFrameCount) &&
    frame.droppedFrameCount >= 0
  ) {
    diagnostics.droppedFrameCount = Math.floor(frame.droppedFrameCount);
  }
  if (
    typeof frame.lateFrameCount === "number" &&
    Number.isFinite(frame.lateFrameCount) &&
    frame.lateFrameCount >= 0
  ) {
    diagnostics.lateFrameCount = Math.floor(frame.lateFrameCount);
  }
  if (Object.keys(diagnostics).length === 0) {
    return undefined;
  }
  return diagnostics;
}

function resolveAudioRuntime(
  withMicAudio: boolean,
  withSystemAudio: boolean
): MediaSessionCaptureAudioRuntime | undefined {
  if (!withMicAudio && !withSystemAudio) {
    return undefined;
  }
  return {
    withMicAudio,
    withSystemAudio,
  };
}

export function createDeviceIngestAdapter(
  options: DeviceIngestAdapterOptions
): DeviceIngestAdapter {
  const settings = resolveSettings(options);
  const sourceRuntimeState = new Map<string, SourceRuntimeState>();

  return {
    async captureFrame(
      request: DeviceIngestCaptureRequest
    ): Promise<MediaSessionCaptureFrame> {
      const liveSessionId = normalizeRequiredString(
        request.liveSessionId,
        "liveSessionId"
      );
      const sourceId = buildDeviceIngressSourceId({
        sourceClass: request.sourceClass,
        providerId: request.providerId ?? settings.defaultProviderId,
        deviceId: request.deviceId,
        streamId: request.streamId,
      });
      const sourceState = resolveSourceState(sourceRuntimeState, sourceId);
      const sequence = resolveSequence(sourceState, request.sequence);
      const frameRate = normalizePositiveNumber(
        request.frameRate,
        settings.defaultFrameRate
      );
      const withMicAudio = request.withMicAudio === true;
      const withSystemAudio = request.withSystemAudio === true;

      const rawFrame = await settings.provider.captureFrame({
        sourceClass: request.sourceClass,
        sourceId,
        sequence,
        frameRate,
        withMicAudio,
        withSystemAudio,
      });

      const fallbackTimestampMs = settings.now();
      const frameTimestampMs = resolveFrameTimestampMs(
        rawFrame.frameTimestampMs,
        fallbackTimestampMs,
        sourceState
      );
      const captureTimestampMs =
        typeof rawFrame.captureTimestampMs === "number" &&
        Number.isFinite(rawFrame.captureTimestampMs)
          ? Math.floor(rawFrame.captureTimestampMs)
          : frameTimestampMs;

      const metadata: MediaSessionCaptureMetadata = {
        providerId: normalizeIdentityToken(
          request.providerId ?? settings.defaultProviderId,
          settings.defaultProviderId
        ),
        ...(request.deviceId
          ? { deviceId: normalizeIdentityToken(request.deviceId, "primary") }
          : {}),
        ...(request.streamId
          ? { streamId: normalizeIdentityToken(request.streamId, "stream") }
          : {}),
        ...(rawFrame.metadata ?? {}),
      };

      return normalizeMediaSessionCaptureFrame({
        liveSessionId,
        sourceClass: request.sourceClass,
        captureMode: "stream",
        sourceId,
        sequence,
        frameTimestampMs,
        captureTimestampMs,
        mimeType: rawFrame.mimeType ?? "video/webm",
        payloadRef: rawFrame.payloadRef,
        sizeBytes: rawFrame.sizeBytes,
        resolution: {
          width: rawFrame.width,
          height: rawFrame.height,
        },
        frameRate,
        audioRuntime: resolveAudioRuntime(withMicAudio, withSystemAudio),
        diagnostics: resolveDiagnostics(rawFrame),
        metadata,
      });
    },
  };
}
