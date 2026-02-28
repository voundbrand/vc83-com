import {
  type MediaSessionCaptureAudioRuntime,
  type MediaSessionCaptureDiagnostics,
  type MediaSessionCaptureFrame,
  type MediaSessionCaptureMetadata,
  type MobileGlassesSourceClass,
  type MobileGlassesTransport,
  normalizeMediaSessionCaptureFrame,
} from "../session/mediaSessionContract";

export const DEFAULT_MOBILE_GLASSES_PROVIDER_ID = "native_mobile_bridge";
export const DEFAULT_MOBILE_GLASSES_DEVICE_PROFILE = "generic_device";
export const DEFAULT_MOBILE_GLASSES_STREAM_ID = "primary";
export const DEFAULT_MOBILE_GLASSES_TRANSPORT: MobileGlassesTransport = "webrtc";
export const DEFAULT_MOBILE_GLASSES_FRAME_RATE = 24;
export const DEFAULT_MOBILE_GLASSES_TARGET_LATENCY_MS = 180;
export const DEFAULT_MOBILE_GLASSES_MAX_LATENCY_MS = 450;

export const MOBILE_GLASSES_SESSION_STATUS_VALUES = [
  "running",
  "paused",
  "stopped",
] as const;
export type MobileGlassesSessionStatus =
  (typeof MOBILE_GLASSES_SESSION_STATUS_VALUES)[number];

export interface MobileGlassesSessionControlRequest {
  liveSessionId: string;
  sourceClass: MobileGlassesSourceClass;
  providerId?: string;
  deviceProfile?: string;
  streamId?: string;
  sourceId?: string;
  transport?: MobileGlassesTransport;
  frameRate?: number;
  targetLatencyMs?: number;
  maxLatencyMs?: number;
  withMicAudio?: boolean;
  withSystemAudio?: boolean;
  metadata?: MediaSessionCaptureMetadata;
}

export interface MobileGlassesFrameIngestRequest {
  sourceId: string;
  sequence?: number;
  frameTimestampMs?: number;
  captureTimestampMs?: number;
  mimeType?: string;
  payloadRef?: string;
  sizeBytes?: number;
  width?: number;
  height?: number;
  frameRate?: number;
  withMicAudio?: boolean;
  withSystemAudio?: boolean;
  captureToIngressLatencyMs?: number;
  droppedFrameCount?: number;
  lateFrameCount?: number;
  metadata?: MediaSessionCaptureMetadata;
}

export interface MobileGlassesSessionSnapshot {
  liveSessionId: string;
  sourceClass: MobileGlassesSourceClass;
  sourceId: string;
  providerId: string;
  deviceProfile: string;
  streamId: string;
  transport: MobileGlassesTransport;
  status: MobileGlassesSessionStatus;
  frameRate: number;
  targetLatencyMs: number;
  maxLatencyMs: number;
  withMicAudio: boolean;
  withSystemAudio: boolean;
  frameCount: number;
  droppedFrameCount: number;
  lateFrameCount: number;
  lastSequence?: number;
  lastFrameTimestampMs?: number;
  lastCaptureToIngressLatencyMs?: number;
  startedAtMs: number;
  pausedAtMs?: number;
  stoppedAtMs?: number;
  updatedAtMs: number;
  metadata?: MediaSessionCaptureMetadata;
}

export interface MobileGlassesIngressBridgeOptions {
  now?: () => number;
  defaultProviderId?: string;
  defaultDeviceProfile?: string;
  defaultStreamId?: string;
  defaultTransport?: MobileGlassesTransport;
  defaultFrameRate?: number;
  defaultTargetLatencyMs?: number;
  defaultMaxLatencyMs?: number;
}

export interface MobileGlassesIngressBridge {
  startSession(request: MobileGlassesSessionControlRequest): MobileGlassesSessionSnapshot;
  pauseSession(sourceId: string): MobileGlassesSessionSnapshot;
  resumeSession(sourceId: string): MobileGlassesSessionSnapshot;
  stopSession(sourceId: string): MobileGlassesSessionSnapshot;
  ingestFrame(request: MobileGlassesFrameIngestRequest): MediaSessionCaptureFrame;
  getSessionSnapshot(sourceId: string): MobileGlassesSessionSnapshot | undefined;
  listSessionSnapshots(): MobileGlassesSessionSnapshot[];
}

interface MobileGlassesIngressBridgeSettings {
  now: () => number;
  defaultProviderId: string;
  defaultDeviceProfile: string;
  defaultStreamId: string;
  defaultTransport: MobileGlassesTransport;
  defaultFrameRate: number;
  defaultTargetLatencyMs: number;
  defaultMaxLatencyMs: number;
}

interface MobileGlassesSessionState {
  liveSessionId: string;
  sourceClass: MobileGlassesSourceClass;
  sourceId: string;
  providerId: string;
  deviceProfile: string;
  streamId: string;
  transport: MobileGlassesTransport;
  status: MobileGlassesSessionStatus;
  frameRate: number;
  targetLatencyMs: number;
  maxLatencyMs: number;
  withMicAudio: boolean;
  withSystemAudio: boolean;
  frameCount: number;
  droppedFrameCount: number;
  lateFrameCount: number;
  nextSequence: number;
  lastSequence?: number;
  lastFrameTimestampMs?: number;
  lastCaptureToIngressLatencyMs?: number;
  startedAtMs: number;
  pausedAtMs?: number;
  stoppedAtMs?: number;
  updatedAtMs: number;
  metadata?: MediaSessionCaptureMetadata;
}

function normalizeRequiredString(value: string, fieldName: string): string {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) {
    throw new Error(`Mobile/glasses bridge requires ${fieldName}.`);
  }
  return normalized;
}

function normalizeIdentityToken(value: string, fallback: string): string {
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

function normalizeOptionalIdentityToken(
  value: string | undefined,
  fallback: string
): string {
  if (!value) {
    return fallback;
  }
  return normalizeIdentityToken(value, fallback);
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

function normalizeNonNegativeNumber(value: number | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return 0;
  }
  return Math.floor(value);
}

function normalizeTransport(
  transport: MobileGlassesTransport | undefined,
  fallback: MobileGlassesTransport
): MobileGlassesTransport {
  if (!transport) {
    return fallback;
  }
  return transport;
}

function resolveSettings(
  options: MobileGlassesIngressBridgeOptions
): MobileGlassesIngressBridgeSettings {
  const defaultTargetLatencyMs = normalizePositiveNumber(
    options.defaultTargetLatencyMs,
    DEFAULT_MOBILE_GLASSES_TARGET_LATENCY_MS
  );
  const defaultMaxLatencyMs = normalizePositiveNumber(
    options.defaultMaxLatencyMs,
    DEFAULT_MOBILE_GLASSES_MAX_LATENCY_MS
  );

  return {
    now: options.now ?? Date.now,
    defaultProviderId: normalizeOptionalIdentityToken(
      options.defaultProviderId,
      DEFAULT_MOBILE_GLASSES_PROVIDER_ID
    ),
    defaultDeviceProfile: normalizeOptionalIdentityToken(
      options.defaultDeviceProfile,
      DEFAULT_MOBILE_GLASSES_DEVICE_PROFILE
    ),
    defaultStreamId: normalizeOptionalIdentityToken(
      options.defaultStreamId,
      DEFAULT_MOBILE_GLASSES_STREAM_ID
    ),
    defaultTransport: normalizeTransport(
      options.defaultTransport,
      DEFAULT_MOBILE_GLASSES_TRANSPORT
    ),
    defaultFrameRate: normalizePositiveNumber(
      options.defaultFrameRate,
      DEFAULT_MOBILE_GLASSES_FRAME_RATE
    ),
    defaultTargetLatencyMs,
    defaultMaxLatencyMs: Math.max(defaultMaxLatencyMs, defaultTargetLatencyMs),
  };
}

export function buildMobileGlassesSourceId(args: {
  sourceClass: MobileGlassesSourceClass;
  providerId?: string;
  deviceProfile?: string;
  streamId?: string;
}): string {
  const providerId = normalizeOptionalIdentityToken(
    args.providerId,
    DEFAULT_MOBILE_GLASSES_PROVIDER_ID
  );
  const deviceProfile = normalizeOptionalIdentityToken(
    args.deviceProfile,
    DEFAULT_MOBILE_GLASSES_DEVICE_PROFILE
  );
  const streamId = normalizeOptionalIdentityToken(
    args.streamId,
    DEFAULT_MOBILE_GLASSES_STREAM_ID
  );
  return `${args.sourceClass}:${providerId}:${deviceProfile}:${streamId}`;
}

function resolveSessionAudioRuntime(
  state: MobileGlassesSessionState,
  request: MobileGlassesFrameIngestRequest
): MediaSessionCaptureAudioRuntime | undefined {
  const withMicAudio =
    request.withMicAudio === true || state.withMicAudio === true;
  const withSystemAudio =
    request.withSystemAudio === true || state.withSystemAudio === true;
  if (!withMicAudio && !withSystemAudio) {
    return undefined;
  }
  return {
    withMicAudio,
    withSystemAudio,
  };
}

function resolveSessionDiagnostics(args: {
  nowMs: number;
  frameTimestampMs: number;
  request: MobileGlassesFrameIngestRequest;
  state: MobileGlassesSessionState;
}): {
  diagnostics: MediaSessionCaptureDiagnostics;
  latencyBudgetBreached: boolean;
  droppedFrameCount: number;
  lateFrameCount: number;
} {
  const measuredLatencyMs =
    typeof args.request.captureToIngressLatencyMs === "number" &&
    Number.isFinite(args.request.captureToIngressLatencyMs) &&
    args.request.captureToIngressLatencyMs >= 0
      ? Math.floor(args.request.captureToIngressLatencyMs)
      : Math.max(0, Math.floor(args.nowMs - args.frameTimestampMs));

  const droppedFrameCount = normalizeNonNegativeNumber(
    args.request.droppedFrameCount
  );
  let lateFrameCount = normalizeNonNegativeNumber(args.request.lateFrameCount);
  const latencyBudgetBreached = measuredLatencyMs > args.state.maxLatencyMs;
  if (latencyBudgetBreached) {
    lateFrameCount += 1;
  }

  return {
    diagnostics: {
      captureToIngressLatencyMs: measuredLatencyMs,
      droppedFrameCount: droppedFrameCount > 0 ? droppedFrameCount : undefined,
      lateFrameCount: lateFrameCount > 0 ? lateFrameCount : undefined,
    },
    latencyBudgetBreached,
    droppedFrameCount,
    lateFrameCount,
  };
}

function cloneMetadata(
  metadata: MediaSessionCaptureMetadata | undefined
): MediaSessionCaptureMetadata | undefined {
  if (!metadata) {
    return undefined;
  }
  return { ...metadata };
}

function toSessionSnapshot(
  state: MobileGlassesSessionState
): MobileGlassesSessionSnapshot {
  return {
    liveSessionId: state.liveSessionId,
    sourceClass: state.sourceClass,
    sourceId: state.sourceId,
    providerId: state.providerId,
    deviceProfile: state.deviceProfile,
    streamId: state.streamId,
    transport: state.transport,
    status: state.status,
    frameRate: state.frameRate,
    targetLatencyMs: state.targetLatencyMs,
    maxLatencyMs: state.maxLatencyMs,
    withMicAudio: state.withMicAudio,
    withSystemAudio: state.withSystemAudio,
    frameCount: state.frameCount,
    droppedFrameCount: state.droppedFrameCount,
    lateFrameCount: state.lateFrameCount,
    lastSequence: state.lastSequence,
    lastFrameTimestampMs: state.lastFrameTimestampMs,
    lastCaptureToIngressLatencyMs: state.lastCaptureToIngressLatencyMs,
    startedAtMs: state.startedAtMs,
    pausedAtMs: state.pausedAtMs,
    stoppedAtMs: state.stoppedAtMs,
    updatedAtMs: state.updatedAtMs,
    metadata: cloneMetadata(state.metadata),
  };
}

function resolveSequence(
  state: MobileGlassesSessionState,
  requestedSequence: number | undefined
): number {
  if (
    typeof requestedSequence === "number" &&
    Number.isFinite(requestedSequence) &&
    requestedSequence > 0
  ) {
    const normalized = Math.floor(requestedSequence);
    state.nextSequence = Math.max(state.nextSequence, normalized + 1);
    state.lastSequence = normalized;
    return normalized;
  }
  const sequence = state.nextSequence;
  state.nextSequence += 1;
  state.lastSequence = sequence;
  return sequence;
}

function resolveFrameTimestampMs(
  state: MobileGlassesSessionState,
  frameTimestampMs: number | undefined,
  fallbackTimestampMs: number
): number {
  let timestamp =
    typeof frameTimestampMs === "number" && Number.isFinite(frameTimestampMs)
      ? Math.floor(frameTimestampMs)
      : Math.floor(fallbackTimestampMs);

  if (
    typeof state.lastFrameTimestampMs === "number" &&
    timestamp <= state.lastFrameTimestampMs
  ) {
    timestamp = state.lastFrameTimestampMs + 1;
  }
  state.lastFrameTimestampMs = timestamp;
  return timestamp;
}

export function createMobileGlassesIngressBridge(
  options: MobileGlassesIngressBridgeOptions = {}
): MobileGlassesIngressBridge {
  const settings = resolveSettings(options);
  const sessions = new Map<string, MobileGlassesSessionState>();

  return {
    startSession(
      request: MobileGlassesSessionControlRequest
    ): MobileGlassesSessionSnapshot {
      const nowMs = settings.now();
      const liveSessionId = normalizeRequiredString(
        request.liveSessionId,
        "liveSessionId"
      );
      const providerId = normalizeOptionalIdentityToken(
        request.providerId,
        settings.defaultProviderId
      );
      const deviceProfile = normalizeOptionalIdentityToken(
        request.deviceProfile,
        settings.defaultDeviceProfile
      );
      const streamId = normalizeOptionalIdentityToken(
        request.streamId,
        settings.defaultStreamId
      );
      const sourceId =
        request.sourceId?.trim()
        || buildMobileGlassesSourceId({
          sourceClass: request.sourceClass,
          providerId,
          deviceProfile,
          streamId,
        });
      const frameRate = normalizePositiveNumber(
        request.frameRate,
        settings.defaultFrameRate
      );
      const targetLatencyMs = normalizePositiveNumber(
        request.targetLatencyMs,
        settings.defaultTargetLatencyMs
      );
      const maxLatencyMs = Math.max(
        normalizePositiveNumber(request.maxLatencyMs, settings.defaultMaxLatencyMs),
        targetLatencyMs
      );

      const nextState: MobileGlassesSessionState = {
        liveSessionId,
        sourceClass: request.sourceClass,
        sourceId,
        providerId,
        deviceProfile,
        streamId,
        transport: normalizeTransport(request.transport, settings.defaultTransport),
        status: "running",
        frameRate,
        targetLatencyMs,
        maxLatencyMs,
        withMicAudio: request.withMicAudio === true,
        withSystemAudio: request.withSystemAudio === true,
        frameCount: 0,
        droppedFrameCount: 0,
        lateFrameCount: 0,
        nextSequence: 1,
        startedAtMs: nowMs,
        updatedAtMs: nowMs,
        metadata: cloneMetadata(request.metadata),
      };

      sessions.set(sourceId, nextState);
      return toSessionSnapshot(nextState);
    },

    pauseSession(sourceId: string): MobileGlassesSessionSnapshot {
      const normalizedSourceId = normalizeRequiredString(sourceId, "sourceId");
      const session = sessions.get(normalizedSourceId);
      if (!session) {
        throw new Error(`Mobile/glasses bridge session not found: ${normalizedSourceId}`);
      }
      if (session.status === "running") {
        session.status = "paused";
        session.pausedAtMs = settings.now();
        session.updatedAtMs = session.pausedAtMs;
      }
      return toSessionSnapshot(session);
    },

    resumeSession(sourceId: string): MobileGlassesSessionSnapshot {
      const normalizedSourceId = normalizeRequiredString(sourceId, "sourceId");
      const session = sessions.get(normalizedSourceId);
      if (!session) {
        throw new Error(`Mobile/glasses bridge session not found: ${normalizedSourceId}`);
      }
      if (session.status === "paused") {
        session.status = "running";
        session.updatedAtMs = settings.now();
      }
      return toSessionSnapshot(session);
    },

    stopSession(sourceId: string): MobileGlassesSessionSnapshot {
      const normalizedSourceId = normalizeRequiredString(sourceId, "sourceId");
      const session = sessions.get(normalizedSourceId);
      if (!session) {
        throw new Error(`Mobile/glasses bridge session not found: ${normalizedSourceId}`);
      }
      if (session.status !== "stopped") {
        session.status = "stopped";
        session.stoppedAtMs = settings.now();
        session.updatedAtMs = session.stoppedAtMs;
      }
      return toSessionSnapshot(session);
    },

    ingestFrame(request: MobileGlassesFrameIngestRequest): MediaSessionCaptureFrame {
      const sourceId = normalizeRequiredString(request.sourceId, "sourceId");
      const session = sessions.get(sourceId);
      if (!session) {
        throw new Error(`Mobile/glasses bridge session not found: ${sourceId}`);
      }
      if (session.status !== "running") {
        throw new Error(
          `Mobile/glasses bridge session ${sourceId} is ${session.status}; ingest requires running session.`
        );
      }

      const nowMs = settings.now();
      const sequence = resolveSequence(session, request.sequence);
      const frameTimestampMs = resolveFrameTimestampMs(
        session,
        request.frameTimestampMs,
        nowMs
      );
      const captureTimestampMs =
        typeof request.captureTimestampMs === "number" &&
        Number.isFinite(request.captureTimestampMs)
          ? Math.floor(request.captureTimestampMs)
          : frameTimestampMs;

      const diagnosticsResolution = resolveSessionDiagnostics({
        nowMs,
        frameTimestampMs,
        request,
        state: session,
      });
      session.frameCount += 1;
      session.droppedFrameCount += diagnosticsResolution.droppedFrameCount;
      session.lateFrameCount += diagnosticsResolution.lateFrameCount;
      session.lastCaptureToIngressLatencyMs =
        diagnosticsResolution.diagnostics.captureToIngressLatencyMs;
      session.updatedAtMs = nowMs;

      const metadata: MediaSessionCaptureMetadata = {
        providerId: session.providerId,
        deviceProfile: session.deviceProfile,
        streamId: session.streamId,
        transport: session.transport,
        targetLatencyMs: session.targetLatencyMs,
        maxLatencyMs: session.maxLatencyMs,
        latencyBudgetBreached: diagnosticsResolution.latencyBudgetBreached,
        ...(session.metadata ?? {}),
        ...(request.metadata ?? {}),
      };

      return normalizeMediaSessionCaptureFrame({
        liveSessionId: session.liveSessionId,
        sourceClass: session.sourceClass,
        captureMode: "stream",
        sourceId,
        sequence,
        frameTimestampMs,
        captureTimestampMs,
        mimeType: request.mimeType ?? "video/webm",
        payloadRef: request.payloadRef,
        sizeBytes: request.sizeBytes,
        resolution: {
          width: request.width,
          height: request.height,
        },
        frameRate: normalizePositiveNumber(request.frameRate, session.frameRate),
        audioRuntime: resolveSessionAudioRuntime(session, request),
        diagnostics: diagnosticsResolution.diagnostics,
        metadata,
      });
    },

    getSessionSnapshot(sourceId: string): MobileGlassesSessionSnapshot | undefined {
      const normalizedSourceId = normalizeRequiredString(sourceId, "sourceId");
      const session = sessions.get(normalizedSourceId);
      return session ? toSessionSnapshot(session) : undefined;
    },

    listSessionSnapshots(): MobileGlassesSessionSnapshot[] {
      return [...sessions.values()].map((session) => toSessionSnapshot(session));
    },
  };
}
