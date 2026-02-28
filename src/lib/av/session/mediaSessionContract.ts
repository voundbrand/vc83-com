export const MEDIA_SESSION_CAPTURE_FRAME_SCHEMA_VERSION =
  "media_session_capture_frame_v1" as const;

export const MEDIA_SESSION_SOURCE_CLASS_VALUES = [
  "desktop_screenshot",
  "desktop_record",
  "webcam",
  "digital_video_input",
  "mobile_stream_ios",
  "mobile_stream_android",
  "glasses_stream_meta",
  "usb_capture",
  "hdmi_capture",
  "ndi_capture",
] as const;
export type MediaSessionSourceClass =
  (typeof MEDIA_SESSION_SOURCE_CLASS_VALUES)[number];

export const MOBILE_GLASSES_SOURCE_CLASS_VALUES = [
  "mobile_stream_ios",
  "mobile_stream_android",
  "glasses_stream_meta",
] as const;
export type MobileGlassesSourceClass =
  (typeof MOBILE_GLASSES_SOURCE_CLASS_VALUES)[number];

export const MOBILE_GLASSES_TRANSPORT_VALUES = [
  "webrtc",
  "srt",
  "rtmp",
  "websocket",
  "unknown",
] as const;
export type MobileGlassesTransport = (typeof MOBILE_GLASSES_TRANSPORT_VALUES)[number];

export const MEDIA_SESSION_CAPTURE_MODE_VALUES = [
  "screenshot",
  "record",
  "stream",
] as const;
export type MediaSessionCaptureMode =
  (typeof MEDIA_SESSION_CAPTURE_MODE_VALUES)[number];

export const MEDIA_SESSION_RUNTIME_METADATA_CONTRACT_VERSION =
  "media_session_runtime_metadata_v1" as const;
export const MEDIA_SESSION_RUNTIME_METADATA_KEYS = {
  liveSessionId: "liveSessionId",
  interviewSessionId: "interviewSessionId",
  cameraRuntime: "cameraRuntime",
  voiceRuntime: "voiceRuntime",
  transportRuntime: "transportRuntime",
  sourceAttestation: "sourceAttestation",
} as const;

export interface MediaSessionCameraRuntimeMetadata {
  provider?: string;
  sessionState?: string;
  startedAt?: number;
  lastFrameCapturedAt?: number;
  frameCaptureCount?: number;
  fallbackReason?: string;
}

export interface MediaSessionVoiceRuntimeMetadata {
  voiceSessionId?: string;
  sessionState?: string;
  providerId?: string;
  language?: string;
  sampleRateHz?: number;
  runtimeError?: string;
  fallbackReason?: string;
}

export interface MediaSessionTransportSourceHealthMetadata {
  status?: string;
  deviceAvailable?: boolean;
  providerFailoverActive?: boolean;
  policyRestricted?: boolean;
}

export interface MediaSessionTransportObservabilityMetadata {
  sessionStartedAtMs?: number;
  sessionStoppedAtMs?: number;
  lifecycleState?: string;
  lastErrorCode?: string;
  lastErrorMessage?: string;
  frameCadenceMs?: number;
  frameCadenceFps?: number;
  jitterMsP95?: number;
  mouthToEarEstimateMs?: number;
  fallbackTransitionCount?: number;
  reconnectCount?: number;
  replayDuplicateCount?: number;
  sourceHealth?: MediaSessionTransportSourceHealthMetadata;
}

export interface MediaSessionTransportDiagnosticsMetadata {
  latencyMsP50?: number;
  latencyMsP95?: number;
  jitterMsP50?: number;
  jitterMsP95?: number;
  packetLossPct?: number;
  bitrateKbps?: number;
  reconnectCount?: number;
  fallbackTransitionCount?: number;
}

export interface MediaSessionTransportRuntimeMetadata {
  mode?: string;
  fallbackReason?: string;
  transportId?: string;
  protocol?: string;
  diagnostics?: MediaSessionTransportDiagnosticsMetadata;
  observability?: MediaSessionTransportObservabilityMetadata;
}

export interface MediaSessionSourceAttestationMetadata {
  contractVersion?: string;
  verificationStatus?: string;
  verified?: boolean;
  keyId?: string;
  challengeId?: string;
  nonce?: string;
  reasonCodes?: string[];
}

export interface MediaSessionRuntimeMetadata {
  contractVersion: typeof MEDIA_SESSION_RUNTIME_METADATA_CONTRACT_VERSION;
  liveSessionId: string;
  interviewSessionId?: string;
  cameraRuntime?: MediaSessionCameraRuntimeMetadata;
  voiceRuntime?: MediaSessionVoiceRuntimeMetadata;
  transportRuntime?: MediaSessionTransportRuntimeMetadata;
  sourceAttestation?: MediaSessionSourceAttestationMetadata;
}

export interface MediaSessionRuntimeMetadataInput {
  liveSessionId: string;
  interviewSessionId?: string;
  cameraRuntime?: MediaSessionCameraRuntimeMetadata;
  voiceRuntime?: MediaSessionVoiceRuntimeMetadata;
  transportRuntime?: MediaSessionTransportRuntimeMetadata;
  sourceAttestation?: MediaSessionSourceAttestationMetadata;
}

export type MediaSessionCaptureMetadataValue =
  | string
  | number
  | boolean
  | null;
export type MediaSessionCaptureMetadata = Record<
  string,
  MediaSessionCaptureMetadataValue
>;

export interface MediaSessionCaptureResolution {
  width: number;
  height: number;
}

export interface MediaSessionCaptureAudioRuntime {
  withMicAudio: boolean;
  withSystemAudio: boolean;
  sampleRateHz?: number;
  channels?: number;
  mimeType?: string;
}

export interface MediaSessionCaptureDiagnostics {
  requestedDurationMs?: number;
  boundedDurationMs?: number;
  frameCount?: number;
  droppedFrameCount?: number;
  lateFrameCount?: number;
  captureToIngressLatencyMs?: number;
}

export interface MediaSessionCaptureFrame {
  schemaVersion: typeof MEDIA_SESSION_CAPTURE_FRAME_SCHEMA_VERSION;
  liveSessionId: string;
  sourceClass: MediaSessionSourceClass;
  captureMode: MediaSessionCaptureMode;
  sourceId: string;
  sequence: number;
  frameTimestampMs: number;
  captureTimestampMs: number;
  mimeType: string;
  payloadRef?: string;
  sizeBytes?: number;
  resolution?: MediaSessionCaptureResolution;
  frameRate?: number;
  audioRuntime?: MediaSessionCaptureAudioRuntime;
  diagnostics?: MediaSessionCaptureDiagnostics;
  metadata?: MediaSessionCaptureMetadata;
}

export interface MediaSessionCaptureFrameInput {
  liveSessionId: string;
  sourceClass: MediaSessionSourceClass;
  captureMode: MediaSessionCaptureMode;
  sourceId: string;
  sequence?: number;
  frameTimestampMs?: number;
  captureTimestampMs?: number;
  mimeType?: string;
  payloadRef?: string;
  sizeBytes?: number;
  resolution?: {
    width?: number;
    height?: number;
  };
  frameRate?: number;
  audioRuntime?: MediaSessionCaptureAudioRuntime;
  diagnostics?: MediaSessionCaptureDiagnostics;
  metadata?: MediaSessionCaptureMetadata;
  now?: () => number;
}

export function normalizeMediaSessionRuntimeMetadata(
  input: MediaSessionRuntimeMetadataInput
): MediaSessionRuntimeMetadata {
  const metadata: MediaSessionRuntimeMetadata = {
    contractVersion: MEDIA_SESSION_RUNTIME_METADATA_CONTRACT_VERSION,
    liveSessionId: normalizeRequiredString(input.liveSessionId, "liveSessionId"),
  };
  const interviewSessionId = normalizeOptionalString(input.interviewSessionId);
  if (interviewSessionId) {
    metadata.interviewSessionId = interviewSessionId;
  }
  if (input.cameraRuntime) {
    metadata.cameraRuntime = {
      ...input.cameraRuntime,
      startedAt: normalizeOptionalPositiveNumber(input.cameraRuntime.startedAt),
      lastFrameCapturedAt: normalizeOptionalPositiveNumber(
        input.cameraRuntime.lastFrameCapturedAt
      ),
      frameCaptureCount: normalizeOptionalPositiveNumber(
        input.cameraRuntime.frameCaptureCount
      ),
    };
  }
  if (input.voiceRuntime) {
    metadata.voiceRuntime = {
      ...input.voiceRuntime,
      voiceSessionId: normalizeOptionalString(input.voiceRuntime.voiceSessionId),
      providerId: normalizeOptionalString(input.voiceRuntime.providerId),
      language: normalizeOptionalString(input.voiceRuntime.language),
      sampleRateHz: normalizeOptionalPositiveNumber(input.voiceRuntime.sampleRateHz),
      sessionState: normalizeOptionalString(input.voiceRuntime.sessionState),
      runtimeError: normalizeOptionalString(input.voiceRuntime.runtimeError),
      fallbackReason: normalizeOptionalString(input.voiceRuntime.fallbackReason),
    };
  }
  if (input.transportRuntime) {
    metadata.transportRuntime = {
      mode: normalizeOptionalString(input.transportRuntime.mode),
      fallbackReason: normalizeOptionalString(input.transportRuntime.fallbackReason),
      transportId: normalizeOptionalString(input.transportRuntime.transportId),
      protocol: normalizeOptionalString(input.transportRuntime.protocol),
      diagnostics: input.transportRuntime.diagnostics
        ? normalizeTransportDiagnostics(input.transportRuntime.diagnostics)
        : undefined,
      observability: input.transportRuntime.observability
        ? normalizeTransportObservability(input.transportRuntime.observability)
        : undefined,
    };
  }
  if (input.sourceAttestation) {
    const reasonCodes = normalizeOptionalStringArray(input.sourceAttestation.reasonCodes);
    metadata.sourceAttestation = {
      contractVersion: normalizeOptionalString(input.sourceAttestation.contractVersion),
      verificationStatus: normalizeOptionalString(
        input.sourceAttestation.verificationStatus
      ),
      verified: input.sourceAttestation.verified === true,
      keyId: normalizeOptionalString(input.sourceAttestation.keyId),
      challengeId: normalizeOptionalString(input.sourceAttestation.challengeId),
      nonce: normalizeOptionalString(input.sourceAttestation.nonce),
      reasonCodes: reasonCodes.length > 0 ? reasonCodes : undefined,
    };
  }
  return metadata;
}

export function toMediaSessionRuntimeEnvelopeMetadata(
  input: MediaSessionRuntimeMetadataInput
): Record<string, unknown> {
  const metadata = normalizeMediaSessionRuntimeMetadata(input);
  const envelope: Record<string, unknown> = {
    [MEDIA_SESSION_RUNTIME_METADATA_KEYS.liveSessionId]: metadata.liveSessionId,
  };
  if (metadata.interviewSessionId) {
    envelope[MEDIA_SESSION_RUNTIME_METADATA_KEYS.interviewSessionId] =
      metadata.interviewSessionId;
  }
  if (metadata.cameraRuntime) {
    envelope[MEDIA_SESSION_RUNTIME_METADATA_KEYS.cameraRuntime] =
      metadata.cameraRuntime;
  }
  if (metadata.voiceRuntime) {
    envelope[MEDIA_SESSION_RUNTIME_METADATA_KEYS.voiceRuntime] =
      metadata.voiceRuntime;
  }
  if (metadata.transportRuntime) {
    envelope[MEDIA_SESSION_RUNTIME_METADATA_KEYS.transportRuntime] =
      metadata.transportRuntime;
  }
  if (metadata.sourceAttestation) {
    envelope[MEDIA_SESSION_RUNTIME_METADATA_KEYS.sourceAttestation] =
      metadata.sourceAttestation;
  }
  return envelope;
}

export function assertMediaSessionRuntimeMetadata(
  metadata: MediaSessionRuntimeMetadata
) {
  normalizeRequiredString(metadata.liveSessionId, "liveSessionId");
  if (metadata.voiceRuntime) {
    const voiceSessionId = normalizeOptionalString(metadata.voiceRuntime.voiceSessionId);
    if (!voiceSessionId) {
      throw new Error(
        "Media session runtime metadata requires voiceRuntime.voiceSessionId when voiceRuntime is present."
      );
    }
  }
  if (metadata.transportRuntime?.observability?.fallbackTransitionCount !== undefined) {
    if (
      !Number.isFinite(metadata.transportRuntime.observability.fallbackTransitionCount) ||
      metadata.transportRuntime.observability.fallbackTransitionCount < 0
    ) {
      throw new Error(
        "Media session runtime metadata requires non-negative transportRuntime.observability.fallbackTransitionCount."
      );
    }
  }
  if (metadata.sourceAttestation?.verified) {
    const status = normalizeOptionalString(metadata.sourceAttestation.verificationStatus);
    if (status !== "verified") {
      throw new Error(
        "Media session runtime metadata sourceAttestation.verified=true requires verificationStatus=verified."
      );
    }
  }
}

export function isMobileGlassesSourceClass(
  sourceClass: MediaSessionSourceClass
): sourceClass is MobileGlassesSourceClass {
  return (MOBILE_GLASSES_SOURCE_CLASS_VALUES as readonly string[]).includes(
    sourceClass
  );
}

function normalizeRequiredString(value: string, fieldName: string): string {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) {
    throw new Error(`Media session capture frame requires ${fieldName}.`);
  }
  return normalized;
}

function normalizeOptionalPositiveNumber(value: number | undefined): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }
  if (value <= 0) {
    return undefined;
  }
  return value;
}

function normalizeOptionalString(value: string | undefined): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim();
  return normalized ? normalized : undefined;
}

function normalizeOptionalStringArray(values: string[] | undefined): string[] {
  if (!Array.isArray(values)) {
    return [];
  }
  return values
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter((value) => value.length > 0);
}

function normalizeTransportDiagnostics(
  diagnostics: MediaSessionTransportDiagnosticsMetadata
): MediaSessionTransportDiagnosticsMetadata {
  return {
    latencyMsP50: normalizeOptionalPositiveNumber(diagnostics.latencyMsP50),
    latencyMsP95: normalizeOptionalPositiveNumber(diagnostics.latencyMsP95),
    jitterMsP50: normalizeOptionalPositiveNumber(diagnostics.jitterMsP50),
    jitterMsP95: normalizeOptionalPositiveNumber(diagnostics.jitterMsP95),
    packetLossPct: normalizeOptionalPositiveNumber(diagnostics.packetLossPct),
    bitrateKbps: normalizeOptionalPositiveNumber(diagnostics.bitrateKbps),
    reconnectCount: normalizeOptionalPositiveNumber(diagnostics.reconnectCount),
    fallbackTransitionCount: normalizeOptionalPositiveNumber(
      diagnostics.fallbackTransitionCount
    ),
  };
}

function normalizeTransportObservability(
  observability: MediaSessionTransportObservabilityMetadata
): MediaSessionTransportObservabilityMetadata {
  return {
    sessionStartedAtMs: normalizeOptionalPositiveNumber(observability.sessionStartedAtMs),
    sessionStoppedAtMs: normalizeOptionalPositiveNumber(observability.sessionStoppedAtMs),
    lifecycleState: normalizeOptionalString(observability.lifecycleState),
    lastErrorCode: normalizeOptionalString(observability.lastErrorCode),
    lastErrorMessage: normalizeOptionalString(observability.lastErrorMessage),
    frameCadenceMs: normalizeOptionalPositiveNumber(observability.frameCadenceMs),
    frameCadenceFps: normalizeOptionalPositiveNumber(observability.frameCadenceFps),
    jitterMsP95: normalizeOptionalPositiveNumber(observability.jitterMsP95),
    mouthToEarEstimateMs: normalizeOptionalPositiveNumber(
      observability.mouthToEarEstimateMs
    ),
    fallbackTransitionCount: normalizeOptionalPositiveNumber(
      observability.fallbackTransitionCount
    ),
    reconnectCount: normalizeOptionalPositiveNumber(observability.reconnectCount),
    replayDuplicateCount: normalizeOptionalPositiveNumber(
      observability.replayDuplicateCount
    ),
    sourceHealth: observability.sourceHealth
      ? {
        status: normalizeOptionalString(observability.sourceHealth.status),
        deviceAvailable: observability.sourceHealth.deviceAvailable === true,
        providerFailoverActive:
            observability.sourceHealth.providerFailoverActive === true,
        policyRestricted: observability.sourceHealth.policyRestricted === true,
      }
      : undefined,
  };
}

function normalizeSequence(value: number | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 1;
  }
  if (value < 1) {
    return 1;
  }
  return Math.floor(value);
}

function normalizeTimestamp(
  value: number | undefined,
  fallback: number
): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.floor(value);
}

function normalizeResolution(resolution: {
  width?: number;
  height?: number;
} | undefined): MediaSessionCaptureResolution | undefined {
  if (!resolution) {
    return undefined;
  }
  const width = normalizeOptionalPositiveNumber(resolution.width);
  const height = normalizeOptionalPositiveNumber(resolution.height);
  if (!width || !height) {
    return undefined;
  }
  return {
    width: Math.round(width),
    height: Math.round(height),
  };
}

function defaultMimeTypeForMode(captureMode: MediaSessionCaptureMode): string {
  if (captureMode === "screenshot") {
    return "image/png";
  }
  if (captureMode === "record") {
    return "video/webm";
  }
  return "application/octet-stream";
}

export function normalizeMediaSessionCaptureFrame(
  input: MediaSessionCaptureFrameInput
): MediaSessionCaptureFrame {
  const now = input.now ?? Date.now;
  const fallbackTimestamp = Math.floor(now());
  const frameTimestampMs = normalizeTimestamp(
    input.frameTimestampMs,
    fallbackTimestamp
  );
  const captureTimestampMs = normalizeTimestamp(
    input.captureTimestampMs,
    frameTimestampMs
  );

  return {
    schemaVersion: MEDIA_SESSION_CAPTURE_FRAME_SCHEMA_VERSION,
    liveSessionId: normalizeRequiredString(input.liveSessionId, "liveSessionId"),
    sourceClass: input.sourceClass,
    captureMode: input.captureMode,
    sourceId: normalizeRequiredString(input.sourceId, "sourceId"),
    sequence: normalizeSequence(input.sequence),
    frameTimestampMs,
    captureTimestampMs,
    mimeType:
      normalizeRequiredString(
        input.mimeType ?? defaultMimeTypeForMode(input.captureMode),
        "mimeType"
      ),
    payloadRef: input.payloadRef,
    sizeBytes: normalizeOptionalPositiveNumber(input.sizeBytes),
    resolution: normalizeResolution(input.resolution),
    frameRate: normalizeOptionalPositiveNumber(input.frameRate),
    audioRuntime: input.audioRuntime,
    diagnostics: input.diagnostics,
    metadata: input.metadata,
  };
}

export function assertMediaSessionCaptureFrame(
  frame: MediaSessionCaptureFrame
) {
  normalizeRequiredString(frame.liveSessionId, "liveSessionId");
  normalizeRequiredString(frame.sourceId, "sourceId");
  normalizeRequiredString(frame.mimeType, "mimeType");
  if (!Number.isFinite(frame.frameTimestampMs)) {
    throw new Error("Media session capture frame requires frameTimestampMs.");
  }
  if (!Number.isFinite(frame.captureTimestampMs)) {
    throw new Error("Media session capture frame requires captureTimestampMs.");
  }
  if (!Number.isFinite(frame.sequence) || frame.sequence < 1) {
    throw new Error("Media session capture frame requires sequence >= 1.");
  }
}
