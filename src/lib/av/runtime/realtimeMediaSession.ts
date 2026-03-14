import type { MediaSessionCaptureMetadata } from "../session/mediaSessionContract";
import {
  AV_APPROVAL_INVARIANT,
  AV_RUNTIME_AUTHORITY_PRECEDENCE,
} from "./avFallbackPolicy";
import {
  type MediaSessionTransportDiagnostics,
  type MediaSessionTransportFallbackReason,
  type MediaSessionTransportMode,
  type RealtimeMediaDirection,
  type RealtimeTransportAdapter,
  type TransportHealthState,
  type TransportMetricSample,
  type TransportRuntimeThresholds,
  evaluateTransportFallback,
  normalizeTransportHealthState,
  summarizeTransportDiagnostics,
} from "./transportAdapters";
import {
  type TransportDowngradeProfile,
  type TransportOperatorReasonCode,
  evaluateTransportDowngradePolicy,
} from "./transportFallbackPolicy";

export const DEFAULT_REALTIME_SESSION_WINDOW_SAMPLE_LIMIT = 120;
export const DEFAULT_REALTIME_SESSION_MIN_BUFFER_MS = 40;
export const DEFAULT_REALTIME_SESSION_MAX_BUFFER_MS = 260;
export const DEFAULT_REALTIME_SESSION_BUFFER_STEP_MS = 20;
export const DEFAULT_REALTIME_SESSION_LEASE_TIMEOUT_MS = 15_000;
export const DEFAULT_REALTIME_SESSION_RECONNECT_GAP_MS = 2_500;
export const DEFAULT_REALTIME_SESSION_REPLAY_CACHE_LIMIT = 512;
export const DEFAULT_REALTIME_VISION_FORWARDING_CADENCE_MS = 1_000;
export const MIN_REALTIME_VISION_FORWARDING_CADENCE_MS = 250;
export const MAX_REALTIME_VISION_FORWARDING_CADENCE_MS = 5_000;
export const DEFAULT_REALTIME_VISION_FORWARDING_WINDOW_MS = 10_000;
export const DEFAULT_REALTIME_VISION_FORWARDING_MAX_FRAMES_PER_WINDOW = 8;

export interface RealtimeConversationVadPolicy {
  mode: "client_energy_gate";
  frameDurationMs: 20;
  energyThresholdRms: number;
  minSpeechFrames: number;
  endpointSilenceMs: number;
}

export const DEFAULT_REALTIME_CONVERSATION_VAD_POLICY: RealtimeConversationVadPolicy =
  Object.freeze({
    mode: "client_energy_gate",
    frameDurationMs: 20,
    energyThresholdRms: 0.015,
    minSpeechFrames: 2,
    endpointSilenceMs: 320,
  });

export interface RealtimeVisionForwardingThrottleResolution {
  cadenceMs: number;
  throttled: boolean;
  retryAfterMs?: number;
}

export type RealtimeEchoCancellationStrategy =
  | "hardware_aec_capture_path"
  | "mute_mic_during_tts";

export type RealtimeEchoCancellationReason =
  | "hardware_aec_enabled"
  | "hardware_aec_not_enabled"
  | "operator_forced_mute";

export interface RealtimeEchoCancellationSelection {
  strategy: RealtimeEchoCancellationStrategy;
  reason: RealtimeEchoCancellationReason;
  hardwareAecSupported: boolean;
  hardwareAecEnabled: boolean;
}

export function resolveRealtimeEchoCancellationSelection(args: {
  hardwareAecSupported?: boolean;
  hardwareAecEnabled?: boolean;
  forceMuteDuringTts?: boolean;
}): RealtimeEchoCancellationSelection {
  const hardwareAecSupported = args.hardwareAecSupported === true;
  const hardwareAecEnabled = args.hardwareAecEnabled === true;
  if (args.forceMuteDuringTts === true) {
    return {
      strategy: "mute_mic_during_tts",
      reason: "operator_forced_mute",
      hardwareAecSupported,
      hardwareAecEnabled,
    };
  }
  if (hardwareAecSupported && hardwareAecEnabled) {
    return {
      strategy: "hardware_aec_capture_path",
      reason: "hardware_aec_enabled",
      hardwareAecSupported: true,
      hardwareAecEnabled: true,
    };
  }
  return {
    strategy: "mute_mic_during_tts",
    reason: "hardware_aec_not_enabled",
    hardwareAecSupported,
    hardwareAecEnabled,
  };
}

export function computePcm16FrameRms(samples: Int16Array): number {
  if (!samples.length) {
    return 0;
  }
  let sumSquares = 0;
  for (let index = 0; index < samples.length; index += 1) {
    const normalizedSample = (samples[index] ?? 0) / 32768;
    sumSquares += normalizedSample * normalizedSample;
  }
  return Math.sqrt(sumSquares / samples.length);
}

export function detectVadSpeechFrame(args: {
  samples: Int16Array;
  vadPolicy?: RealtimeConversationVadPolicy;
}): boolean {
  const policy = args.vadPolicy ?? DEFAULT_REALTIME_CONVERSATION_VAD_POLICY;
  return computePcm16FrameRms(args.samples) >= policy.energyThresholdRms;
}

export function shouldTriggerConversationVadEndpoint(args: {
  hasDetectedSpeechSinceCaptureStart: boolean;
  consecutiveSilentFrames: number;
  frameDurationMs: number;
  vadPolicy?: RealtimeConversationVadPolicy;
}): boolean {
  if (!args.hasDetectedSpeechSinceCaptureStart) {
    return false;
  }
  const policy = args.vadPolicy ?? DEFAULT_REALTIME_CONVERSATION_VAD_POLICY;
  const silentDurationMs = Math.max(
    0,
    Math.floor(args.consecutiveSilentFrames * args.frameDurationMs),
  );
  return silentDurationMs >= policy.endpointSilenceMs;
}

export function shouldThrottleRealtimeVisionForwarding(args: {
  nowMs: number;
  lastForwardAtMs?: number;
  cadenceMs?: number;
}): RealtimeVisionForwardingThrottleResolution {
  const cadenceMs = Math.max(
    MIN_REALTIME_VISION_FORWARDING_CADENCE_MS,
    Math.min(
      MAX_REALTIME_VISION_FORWARDING_CADENCE_MS,
      Math.floor(args.cadenceMs ?? DEFAULT_REALTIME_VISION_FORWARDING_CADENCE_MS),
    ),
  );
  if (typeof args.lastForwardAtMs !== "number") {
    return { cadenceMs, throttled: false };
  }
  const elapsedMs = Math.max(0, Math.floor(args.nowMs - args.lastForwardAtMs));
  if (elapsedMs >= cadenceMs) {
    return { cadenceMs, throttled: false };
  }
  return {
    cadenceMs,
    throttled: true,
    retryAfterMs: Math.max(1, cadenceMs - elapsedMs),
  };
}

export type RealtimeMediaSessionStatus = "idle" | "running" | "stopped";

export interface RealtimeMediaPacketInput {
  liveSessionId?: string;
  direction: RealtimeMediaDirection;
  sequence?: number;
  timestampMs?: number;
  receivedAtMs?: number;
  sizeBytes?: number;
  queueDepth?: number;
  captureDroppedFrameCount?: number;
  captureLateFrameCount?: number;
  metadata?: MediaSessionCaptureMetadata;
}

export interface RealtimeMediaDirectionStats {
  packetCount: number;
  droppedPacketCount: number;
  latePacketCount: number;
  lastSequence?: number;
}

export interface RealtimeMediaSessionClockSnapshot {
  startedAtMs?: number;
  lastIngressAtMs?: number;
  tickCount: number;
  uptimeMs: number;
}

export interface RealtimeMediaSessionTransportSnapshot {
  mode: MediaSessionTransportMode;
  fallbackReason: MediaSessionTransportFallbackReason;
  downgradeProfile: TransportDowngradeProfile;
  operatorReasonCode: TransportOperatorReasonCode;
  nativePolicyPrecedence: typeof AV_RUNTIME_AUTHORITY_PRECEDENCE;
  approvalInvariant: typeof AV_APPROVAL_INVARIANT;
  targetBufferMs: number;
  diagnostics: MediaSessionTransportDiagnostics;
  observability: RealtimeMediaSessionObservabilitySnapshot;
}

export interface RealtimeMediaSessionSnapshot {
  liveSessionId: string;
  status: RealtimeMediaSessionStatus;
  clock: RealtimeMediaSessionClockSnapshot;
  directions: Record<RealtimeMediaDirection, RealtimeMediaDirectionStats>;
  transportRuntime: RealtimeMediaSessionTransportSnapshot;
}

export interface RealtimeMediaSessionOptions {
  liveSessionId: string;
  transportAdapter: RealtimeTransportAdapter;
  now?: () => number;
  windowSampleLimit?: number;
  minBufferMs?: number;
  maxBufferMs?: number;
  bufferStepMs?: number;
  leaseTimeoutMs?: number;
  reconnectGapMs?: number;
  replayCacheLimit?: number;
  thresholds?: Partial<TransportRuntimeThresholds>;
}

export interface RealtimeMediaSession {
  start(): RealtimeMediaSessionSnapshot;
  stop(): RealtimeMediaSessionSnapshot;
  heartbeat(timestampMs?: number): RealtimeMediaSessionSnapshot;
  ingestPacket(input: RealtimeMediaPacketInput): Promise<RealtimeMediaSessionSnapshot>;
  getSnapshot(): RealtimeMediaSessionSnapshot;
}

export type RealtimeMediaSessionLifecycleState =
  | "idle"
  | "session_started"
  | "reconnecting"
  | "resumed"
  | "lease_expired"
  | "running"
  | "session_stopped";

export const REALTIME_MEDIA_SESSION_ERROR_CODE_VALUES = [
  "none",
  "live_session_mismatch",
  "session_stopped",
  "lease_expired",
  "duplicate_packet_replay",
  "transport_publish_failed",
] as const;
export type RealtimeMediaSessionErrorCode =
  (typeof REALTIME_MEDIA_SESSION_ERROR_CODE_VALUES)[number];

export type RealtimeMediaSessionSourceHealthStatus =
  | "healthy"
  | "provider_failover"
  | "device_unavailable"
  | "policy_restricted";

export interface RealtimeMediaSessionSourceHealthSnapshot extends TransportHealthState {
  status: RealtimeMediaSessionSourceHealthStatus;
}

export interface RealtimeMediaSessionObservabilitySnapshot {
  sessionStartedAtMs?: number;
  sessionStoppedAtMs?: number;
  lifecycleState: RealtimeMediaSessionLifecycleState;
  sessionLeaseTimeoutMs: number;
  sessionLeaseExpired: boolean;
  lastHeartbeatAtMs?: number;
  frameCadenceMs?: number;
  frameCadenceFps?: number;
  jitterMsP95?: number;
  mouthToEarEstimateMs?: number;
  fallbackTransitionCount: number;
  reconnectCount: number;
  replayDuplicateCount: number;
  lastErrorCode: RealtimeMediaSessionErrorCode;
  lastErrorMessage?: string;
  lastErrorAtMs?: number;
  sourceHealth: RealtimeMediaSessionSourceHealthSnapshot;
}

interface RealtimeMediaSessionSettings {
  liveSessionId: string;
  transportAdapter: RealtimeTransportAdapter;
  now: () => number;
  windowSampleLimit: number;
  minBufferMs: number;
  maxBufferMs: number;
  bufferStepMs: number;
  leaseTimeoutMs: number;
  reconnectGapMs: number;
  replayCacheLimit: number;
  thresholds?: Partial<TransportRuntimeThresholds>;
}

interface RealtimeMediaSessionState {
  status: RealtimeMediaSessionStatus;
  lifecycleState: RealtimeMediaSessionLifecycleState;
  startedAtMs?: number;
  stoppedAtMs?: number;
  lastIngressAtMs?: number;
  lastHeartbeatAtMs?: number;
  leaseExpired: boolean;
  tickCount: number;
  mode: MediaSessionTransportMode;
  fallbackReason: MediaSessionTransportFallbackReason;
  downgradeProfile: TransportDowngradeProfile;
  operatorReasonCode: TransportOperatorReasonCode;
  nativePolicyPrecedence: typeof AV_RUNTIME_AUTHORITY_PRECEDENCE;
  approvalInvariant: typeof AV_APPROVAL_INVARIANT;
  targetBufferMs: number;
  reconnectCount: number;
  fallbackTransitionCount: number;
  downgradeTransitionCount: number;
  replayDuplicateCount: number;
  lastErrorCode: RealtimeMediaSessionErrorCode;
  lastErrorMessage?: string;
  lastErrorAtMs?: number;
  lastLatencyMs?: number;
  totalPacketCount: number;
  totalDroppedPacketCount: number;
  captureDroppedFrameCountTotal: number;
  captureLateFrameCountTotal: number;
  videoCadenceSamplesMs: number[];
  lastVideoTimestampByDirection: {
    video_in?: number;
    video_out?: number;
  };
  audioInLatencySamplesMs: number[];
  audioOutLatencySamplesMs: number[];
  sourceHealth: TransportHealthState;
  samples: TransportMetricSample[];
  diagnostics: MediaSessionTransportDiagnostics;
  directions: Record<RealtimeMediaDirection, RealtimeMediaDirectionStats>;
}

function normalizeRequiredString(value: string, fieldName: string): string {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) {
    throw new Error(`Realtime media session requires ${fieldName}.`);
  }
  return normalized;
}

function normalizePositiveNumber(value: number | undefined): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }
  if (value <= 0) {
    return undefined;
  }
  return Math.floor(value);
}

function normalizeNonNegativeNumber(value: number | undefined): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }
  if (value < 0) {
    return undefined;
  }
  return Math.floor(value);
}

function normalizeTimestamp(value: number | undefined, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return Math.floor(fallback);
  }
  return Math.floor(value);
}

function createDirectionStatsRecord(): Record<RealtimeMediaDirection, RealtimeMediaDirectionStats> {
  return {
    audio_in: { packetCount: 0, droppedPacketCount: 0, latePacketCount: 0 },
    audio_out: { packetCount: 0, droppedPacketCount: 0, latePacketCount: 0 },
    video_in: { packetCount: 0, droppedPacketCount: 0, latePacketCount: 0 },
    video_out: { packetCount: 0, droppedPacketCount: 0, latePacketCount: 0 },
  };
}

function cloneDirectionStatsRecord(
  directions: Record<RealtimeMediaDirection, RealtimeMediaDirectionStats>
): Record<RealtimeMediaDirection, RealtimeMediaDirectionStats> {
  return {
    audio_in: { ...directions.audio_in },
    audio_out: { ...directions.audio_out },
    video_in: { ...directions.video_in },
    video_out: { ...directions.video_out },
  };
}

function resolveSettings(
  options: RealtimeMediaSessionOptions
): RealtimeMediaSessionSettings {
  const minBufferMs =
    normalizePositiveNumber(options.minBufferMs)
    ?? DEFAULT_REALTIME_SESSION_MIN_BUFFER_MS;
  const maxBufferMs =
    normalizePositiveNumber(options.maxBufferMs)
    ?? DEFAULT_REALTIME_SESSION_MAX_BUFFER_MS;
  if (maxBufferMs < minBufferMs) {
    throw new Error(
      "Realtime media session maxBufferMs must be >= minBufferMs."
    );
  }

  return {
    liveSessionId: normalizeRequiredString(options.liveSessionId, "liveSessionId"),
    transportAdapter: options.transportAdapter,
    now: options.now ?? Date.now,
    windowSampleLimit:
      normalizePositiveNumber(options.windowSampleLimit)
      ?? DEFAULT_REALTIME_SESSION_WINDOW_SAMPLE_LIMIT,
    minBufferMs,
    maxBufferMs,
    bufferStepMs:
      normalizePositiveNumber(options.bufferStepMs)
      ?? DEFAULT_REALTIME_SESSION_BUFFER_STEP_MS,
    leaseTimeoutMs:
      normalizePositiveNumber(options.leaseTimeoutMs)
      ?? DEFAULT_REALTIME_SESSION_LEASE_TIMEOUT_MS,
    reconnectGapMs:
      normalizePositiveNumber(options.reconnectGapMs)
      ?? DEFAULT_REALTIME_SESSION_RECONNECT_GAP_MS,
    replayCacheLimit:
      normalizePositiveNumber(options.replayCacheLimit)
      ?? DEFAULT_REALTIME_SESSION_REPLAY_CACHE_LIMIT,
    thresholds: options.thresholds,
  };
}

function resolveAdaptiveBufferMs(args: {
  currentBufferMs: number;
  mode: MediaSessionTransportMode;
  fallbackReason: MediaSessionTransportFallbackReason;
  minBufferMs: number;
  maxBufferMs: number;
  bufferStepMs: number;
}): number {
  let nextBufferMs = args.currentBufferMs;
  if (args.mode === "batch_replay") {
    nextBufferMs += args.bufferStepMs * 2;
  } else if (args.mode === "buffered" || args.fallbackReason !== "none") {
    nextBufferMs += args.bufferStepMs;
  } else {
    nextBufferMs -= args.bufferStepMs;
  }
  return Math.max(args.minBufferMs, Math.min(args.maxBufferMs, nextBufferMs));
}

function resolveUptimeMs(
  state: RealtimeMediaSessionState,
  now: () => number
): number {
  if (typeof state.startedAtMs !== "number") {
    return 0;
  }
  const referenceTimestamp =
    state.status === "stopped"
      ? state.stoppedAtMs ?? state.lastIngressAtMs ?? state.startedAtMs
      : state.lastIngressAtMs ?? now();
  return Math.max(0, referenceTimestamp - state.startedAtMs);
}

function resolvePacketSequence(args: {
  directionState: RealtimeMediaDirectionStats;
  requestedSequence?: number;
}): {
  sequence: number;
  droppedPacketCount: number;
  latePacketCount: number;
} {
  const lastSequence = args.directionState.lastSequence ?? 0;
  const expectedSequence = lastSequence + 1;
  const normalizedSequence = normalizePositiveNumber(args.requestedSequence) ?? expectedSequence;

  let droppedPacketCount = 0;
  let latePacketCount = 0;

  if (normalizedSequence > expectedSequence) {
    droppedPacketCount = normalizedSequence - expectedSequence;
  } else if (normalizedSequence < expectedSequence) {
    latePacketCount = 1;
  }

  return {
    sequence: normalizedSequence,
    droppedPacketCount,
    latePacketCount,
  };
}

function pushTransportSample(
  samples: TransportMetricSample[],
  sample: TransportMetricSample,
  limit: number
) {
  samples.push(sample);
  if (samples.length > limit) {
    samples.splice(0, samples.length - limit);
  }
}

function pushNumericSample(samples: number[], sample: number, limit: number) {
  if (!Number.isFinite(sample) || sample < 0) {
    return;
  }
  samples.push(sample);
  if (samples.length > limit) {
    samples.splice(0, samples.length - limit);
  }
}

function roundTo3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function resolveAverage(samples: number[]): number | undefined {
  if (samples.length === 0) {
    return undefined;
  }
  const total = samples.reduce((sum, sample) => sum + sample, 0);
  return roundTo3(total / samples.length);
}

function resolveFrameCadenceSnapshot(samples: number[]): {
  frameCadenceMs?: number;
  frameCadenceFps?: number;
} {
  const cadenceMs = resolveAverage(samples);
  if (cadenceMs === undefined || cadenceMs <= 0) {
    return {};
  }
  return {
    frameCadenceMs: cadenceMs,
    frameCadenceFps: roundTo3(1000 / cadenceMs),
  };
}

function resolveMouthToEarEstimateMs(args: {
  audioInLatencySamplesMs: number[];
  audioOutLatencySamplesMs: number[];
}): number | undefined {
  const audioInMeanMs = resolveAverage(args.audioInLatencySamplesMs);
  const audioOutMeanMs = resolveAverage(args.audioOutLatencySamplesMs);
  if (
    typeof audioInMeanMs !== "number" ||
    typeof audioOutMeanMs !== "number"
  ) {
    return undefined;
  }
  return roundTo3(audioInMeanMs + audioOutMeanMs);
}

function resolveSourceHealthStatus(
  sourceHealth: TransportHealthState
): RealtimeMediaSessionSourceHealthStatus {
  if (sourceHealth.policyRestricted) {
    return "policy_restricted";
  }
  if (!sourceHealth.deviceAvailable) {
    return "device_unavailable";
  }
  if (sourceHealth.providerFailoverActive) {
    return "provider_failover";
  }
  return "healthy";
}

function resolveMetadataNumber(
  metadata: MediaSessionCaptureMetadata | undefined,
  key: string
): number | undefined {
  if (!metadata) {
    return undefined;
  }
  const value = metadata[key];
  return normalizeNonNegativeNumber(
    typeof value === "number" ? value : undefined
  );
}

function resolveInputQueueDepth(input: RealtimeMediaPacketInput): number | undefined {
  const directQueueDepth = normalizeNonNegativeNumber(input.queueDepth);
  if (typeof directQueueDepth === "number") {
    return directQueueDepth;
  }
  const metadataQueueDepth = resolveMetadataNumber(input.metadata, "queueDepth")
    ?? resolveMetadataNumber(input.metadata, "bufferQueueDepth")
    ?? resolveMetadataNumber(input.metadata, "backpressureQueueDepth");
  return metadataQueueDepth;
}

function buildDiagnostics(state: RealtimeMediaSessionState): MediaSessionTransportDiagnostics {
  return summarizeTransportDiagnostics({
    samples: state.samples,
    totalPacketCount: state.totalPacketCount,
    droppedPacketCount: state.totalDroppedPacketCount,
    reconnectCount: state.reconnectCount,
    fallbackTransitionCount: state.fallbackTransitionCount,
    downgradeTransitionCount: state.downgradeTransitionCount,
    replayDuplicateCount: state.replayDuplicateCount,
    lastErrorCode: state.lastErrorCode !== "none" ? state.lastErrorCode : undefined,
  });
}

export function createRealtimeMediaSession(
  options: RealtimeMediaSessionOptions
): RealtimeMediaSession {
  const settings = resolveSettings(options);

  const state: RealtimeMediaSessionState = {
    status: "idle",
    lifecycleState: "idle",
    leaseExpired: false,
    tickCount: 0,
    mode: "realtime",
    fallbackReason: "none",
    downgradeProfile: "full_av",
    operatorReasonCode: "stable_full_av",
    nativePolicyPrecedence: AV_RUNTIME_AUTHORITY_PRECEDENCE,
    approvalInvariant: AV_APPROVAL_INVARIANT,
    targetBufferMs: settings.minBufferMs,
    reconnectCount: 0,
    fallbackTransitionCount: 0,
    downgradeTransitionCount: 0,
    replayDuplicateCount: 0,
    lastErrorCode: "none",
    totalPacketCount: 0,
    totalDroppedPacketCount: 0,
    captureDroppedFrameCountTotal: 0,
    captureLateFrameCountTotal: 0,
    videoCadenceSamplesMs: [],
    lastVideoTimestampByDirection: {},
    audioInLatencySamplesMs: [],
    audioOutLatencySamplesMs: [],
    sourceHealth: normalizeTransportHealthState(),
    samples: [],
    diagnostics: {
      reconnectCount: 0,
      fallbackTransitionCount: 0,
      downgradeTransitionCount: 0,
      replayDuplicateCount: 0,
      packetLossPct: 0,
    },
    directions: createDirectionStatsRecord(),
  };

  const replayPacketCacheByDirection: Record<RealtimeMediaDirection, Set<string>> = {
    audio_in: new Set<string>(),
    audio_out: new Set<string>(),
    video_in: new Set<string>(),
    video_out: new Set<string>(),
  };
  const replayPacketOrderByDirection: Record<RealtimeMediaDirection, string[]> = {
    audio_in: [],
    audio_out: [],
    video_in: [],
    video_out: [],
  };

  const setRuntimeError = (args: {
    code: RealtimeMediaSessionErrorCode;
    message?: string;
    atMs: number;
  }) => {
    state.lastErrorCode = args.code;
    state.lastErrorMessage = args.message;
    state.lastErrorAtMs = args.atMs;
  };

  const clearRuntimeError = () => {
    state.lastErrorCode = "none";
    state.lastErrorMessage = undefined;
    state.lastErrorAtMs = undefined;
  };

  const recordReplayPacket = (
    direction: RealtimeMediaDirection,
    replayKey: string
  ) => {
    const cache = replayPacketCacheByDirection[direction];
    const order = replayPacketOrderByDirection[direction];
    cache.add(replayKey);
    order.push(replayKey);
    if (order.length > settings.replayCacheLimit) {
      const overflow = order.splice(0, order.length - settings.replayCacheLimit);
      for (const replayId of overflow) {
        cache.delete(replayId);
      }
    }
  };

  const hasReplayDuplicate = (
    direction: RealtimeMediaDirection,
    replayKey: string
  ): boolean => replayPacketCacheByDirection[direction].has(replayKey);

  const resolveLeaseReferenceTimestamp = (fallbackNowMs: number): number =>
    state.lastHeartbeatAtMs
    ?? state.lastIngressAtMs
    ?? state.startedAtMs
    ?? fallbackNowMs;

  const evaluateRuntimeFallback = (args?: {
    captureDroppedFrameCount?: number;
    captureLateFrameCount?: number;
    queueDepth?: number;
    relayPublishError?: boolean;
  }) => {
    const currentDiagnostics = buildDiagnostics(state);
    const fallbackResolution = evaluateTransportFallback({
      healthState: state.sourceHealth,
      diagnostics: currentDiagnostics,
      captureDroppedFrameCount:
        normalizeNonNegativeNumber(args?.captureDroppedFrameCount) ?? 0,
      captureLateFrameCount:
        normalizeNonNegativeNumber(args?.captureLateFrameCount) ?? 0,
      queueDepth: normalizeNonNegativeNumber(args?.queueDepth),
      relayPublishError: args?.relayPublishError === true,
      leaseExpired: state.leaseExpired,
      thresholds: settings.thresholds,
    });

    if (fallbackResolution.fallbackReason !== state.fallbackReason) {
      state.fallbackTransitionCount += 1;
      if (
        fallbackResolution.fallbackReason === "device_unavailable"
        || fallbackResolution.fallbackReason === "provider_failover"
      ) {
        state.reconnectCount += 1;
      }
    }

    const downgradeResolution = evaluateTransportDowngradePolicy({
      fallbackReason: fallbackResolution.fallbackReason,
      diagnostics: currentDiagnostics,
      captureDroppedFrameCount:
        normalizeNonNegativeNumber(args?.captureDroppedFrameCount) ?? 0,
      captureLateFrameCount:
        normalizeNonNegativeNumber(args?.captureLateFrameCount) ?? 0,
      previousProfile: state.downgradeProfile,
      runtimeAuthorityPrecedence: state.nativePolicyPrecedence,
      approvalInvariant: state.approvalInvariant,
    });
    if (downgradeResolution.changed) {
      state.downgradeTransitionCount += 1;
    }

    state.mode = fallbackResolution.mode;
    state.fallbackReason = fallbackResolution.fallbackReason;
    state.downgradeProfile = downgradeResolution.profile;
    state.operatorReasonCode = downgradeResolution.operatorReasonCode;
    state.nativePolicyPrecedence = downgradeResolution.nativePolicyPrecedence;
    state.approvalInvariant = downgradeResolution.approvalInvariant;
    state.targetBufferMs = resolveAdaptiveBufferMs({
      currentBufferMs: state.targetBufferMs,
      mode: state.mode,
      fallbackReason: state.fallbackReason,
      minBufferMs: settings.minBufferMs,
      maxBufferMs: settings.maxBufferMs,
      bufferStepMs: settings.bufferStepMs,
    });
    state.diagnostics = buildDiagnostics(state);
  };

  const syncLeaseState = (nowMs: number) => {
    if (state.status !== "running") {
      return;
    }
    const leaseReferenceMs = resolveLeaseReferenceTimestamp(nowMs);
    const leaseExpiredNow = nowMs - leaseReferenceMs > settings.leaseTimeoutMs;
    if (leaseExpiredNow && !state.leaseExpired) {
      state.leaseExpired = true;
      state.lifecycleState = "lease_expired";
      setRuntimeError({
        code: "lease_expired",
        message: "Realtime session lease expired while waiting for heartbeat.",
        atMs: nowMs,
      });
      evaluateRuntimeFallback();
      return;
    }
    if (!leaseExpiredNow && state.leaseExpired) {
      state.leaseExpired = false;
      if (state.lastErrorCode === "lease_expired") {
        clearRuntimeError();
      }
      evaluateRuntimeFallback();
    }
  };

  const buildSnapshot = (): RealtimeMediaSessionSnapshot => {
    const frameCadenceSnapshot = resolveFrameCadenceSnapshot(
      state.videoCadenceSamplesMs
    );
    return {
      liveSessionId: settings.liveSessionId,
      status: state.status,
      clock: {
        startedAtMs: state.startedAtMs,
        lastIngressAtMs: state.lastIngressAtMs,
        tickCount: state.tickCount,
        uptimeMs: resolveUptimeMs(state, settings.now),
      },
      directions: cloneDirectionStatsRecord(state.directions),
      transportRuntime: {
        mode: state.mode,
        fallbackReason: state.fallbackReason,
        downgradeProfile: state.downgradeProfile,
        operatorReasonCode: state.operatorReasonCode,
        nativePolicyPrecedence: state.nativePolicyPrecedence,
        approvalInvariant: state.approvalInvariant,
        targetBufferMs: state.targetBufferMs,
        diagnostics: { ...state.diagnostics },
        observability: {
          sessionStartedAtMs: state.startedAtMs,
          sessionStoppedAtMs: state.stoppedAtMs,
          lifecycleState: state.lifecycleState,
          sessionLeaseTimeoutMs: settings.leaseTimeoutMs,
          sessionLeaseExpired: state.leaseExpired,
          lastHeartbeatAtMs: state.lastHeartbeatAtMs,
          frameCadenceMs: frameCadenceSnapshot.frameCadenceMs,
          frameCadenceFps: frameCadenceSnapshot.frameCadenceFps,
          jitterMsP95: state.diagnostics.jitterMsP95,
          mouthToEarEstimateMs: resolveMouthToEarEstimateMs({
            audioInLatencySamplesMs: state.audioInLatencySamplesMs,
            audioOutLatencySamplesMs: state.audioOutLatencySamplesMs,
          }),
          fallbackTransitionCount: state.fallbackTransitionCount,
          reconnectCount: state.reconnectCount,
          replayDuplicateCount: state.replayDuplicateCount,
          lastErrorCode: state.lastErrorCode,
          lastErrorMessage: state.lastErrorMessage,
          lastErrorAtMs: state.lastErrorAtMs,
          sourceHealth: {
            ...state.sourceHealth,
            status: resolveSourceHealthStatus(state.sourceHealth),
          },
        },
      },
    };
  };

  return {
    start(): RealtimeMediaSessionSnapshot {
      if (state.status === "running") {
        syncLeaseState(settings.now());
        return buildSnapshot();
      }
      if (state.status === "stopped") {
        throw new Error("Realtime media session cannot be restarted after stop.");
      }
      const startedAtMs = settings.now();
      state.status = "running";
      state.lifecycleState = "session_started";
      state.startedAtMs = startedAtMs;
      state.stoppedAtMs = undefined;
      state.lastHeartbeatAtMs = startedAtMs;
      state.leaseExpired = false;
      clearRuntimeError();
      evaluateRuntimeFallback();
      return buildSnapshot();
    },

    stop(): RealtimeMediaSessionSnapshot {
      if (state.status === "stopped") {
        return buildSnapshot();
      }
      const stoppedAtMs = settings.now();
      if (state.status === "idle") {
        state.startedAtMs = stoppedAtMs;
      }
      state.status = "stopped";
      state.lifecycleState = "session_stopped";
      state.stoppedAtMs = stoppedAtMs;
      state.lastHeartbeatAtMs = stoppedAtMs;
      state.leaseExpired = false;
      return buildSnapshot();
    },

    heartbeat(timestampMs?: number): RealtimeMediaSessionSnapshot {
      if (state.status === "stopped") {
        setRuntimeError({
          code: "session_stopped",
          message: "Cannot heartbeat a stopped realtime media session.",
          atMs: settings.now(),
        });
        throw new Error("Realtime media session is stopped.");
      }
      if (state.status === "idle") {
        this.start();
      }

      const heartbeatAtMs = normalizeTimestamp(timestampMs, settings.now());
      const wasLeaseExpired = state.leaseExpired;
      state.lastHeartbeatAtMs = heartbeatAtMs;
      if (wasLeaseExpired) {
        state.leaseExpired = false;
        state.lifecycleState = "resumed";
        state.reconnectCount += 1;
        if (state.lastErrorCode === "lease_expired") {
          clearRuntimeError();
        }
      } else if (state.status === "running") {
        state.lifecycleState = "running";
      }
      syncLeaseState(heartbeatAtMs);
      evaluateRuntimeFallback();
      return buildSnapshot();
    },

    async ingestPacket(
      input: RealtimeMediaPacketInput
    ): Promise<RealtimeMediaSessionSnapshot> {
      const nowMs = settings.now();
      if (
        typeof input.liveSessionId === "string" &&
        input.liveSessionId.trim() &&
        input.liveSessionId.trim() !== settings.liveSessionId
      ) {
        setRuntimeError({
          code: "live_session_mismatch",
          message: "Realtime media packet liveSessionId does not match session.",
          atMs: nowMs,
        });
        throw new Error("Realtime media packet liveSessionId does not match session.");
      }
      if (state.status === "stopped") {
        setRuntimeError({
          code: "session_stopped",
          message: "Cannot ingest packet after session stop.",
          atMs: nowMs,
        });
        throw new Error("Realtime media session is stopped.");
      }
      if (state.status === "idle") {
        this.start();
      }

      const receivedAtMs = normalizeTimestamp(input.receivedAtMs, nowMs);
      syncLeaseState(receivedAtMs);
      const lastActivityAtMs = state.lastHeartbeatAtMs ?? state.lastIngressAtMs;
      const ingressGapMs =
        typeof lastActivityAtMs === "number"
          ? Math.max(0, receivedAtMs - lastActivityAtMs)
          : 0;
      const resumeRequired =
        state.leaseExpired || ingressGapMs > settings.reconnectGapMs;
      if (resumeRequired) {
        state.leaseExpired = false;
        state.lifecycleState = "reconnecting";
        state.reconnectCount += 1;
        if (state.lastErrorCode === "lease_expired") {
          clearRuntimeError();
        }
      }

      const timestampMs = normalizeTimestamp(input.timestampMs, receivedAtMs);
      const requestedSequence = normalizePositiveNumber(input.sequence);
      const replayKey =
        typeof requestedSequence === "number"
          ? `${requestedSequence}:${timestampMs}`
          : "";
      if (replayKey && hasReplayDuplicate(input.direction, replayKey)) {
        state.replayDuplicateCount += 1;
        state.lastIngressAtMs = receivedAtMs;
        state.lastHeartbeatAtMs = receivedAtMs;
        setRuntimeError({
          code: "duplicate_packet_replay",
          message: `Duplicate replay packet ignored for ${input.direction} sequence ${requestedSequence}.`,
          atMs: receivedAtMs,
        });
        evaluateRuntimeFallback({
          queueDepth: resolveInputQueueDepth(input),
        });
        return buildSnapshot();
      }

      const directionState = state.directions[input.direction];
      const sequenceResolution = resolvePacketSequence({
        directionState,
        requestedSequence,
      });
      const sequence = sequenceResolution.sequence;
      directionState.packetCount += 1;
      directionState.droppedPacketCount += sequenceResolution.droppedPacketCount;
      directionState.latePacketCount += sequenceResolution.latePacketCount;
      directionState.lastSequence = Math.max(directionState.lastSequence ?? 0, sequence);

      state.totalPacketCount += 1;
      state.totalDroppedPacketCount += sequenceResolution.droppedPacketCount;

      const latencyMs = Math.max(0, receivedAtMs - timestampMs);
      const jitterMs =
        typeof state.lastLatencyMs === "number"
          ? Math.abs(latencyMs - state.lastLatencyMs)
          : 0;
      state.lastLatencyMs = latencyMs;
      state.lastIngressAtMs = receivedAtMs;
      state.lastHeartbeatAtMs = receivedAtMs;
      state.tickCount += 1;
      if (state.status === "running") {
        state.lifecycleState = resumeRequired ? "resumed" : "running";
      }

      if (input.direction === "video_in" || input.direction === "video_out") {
        const previousTimestampMs = state.lastVideoTimestampByDirection[input.direction];
        if (
          typeof previousTimestampMs === "number" &&
          timestampMs > previousTimestampMs
        ) {
          pushNumericSample(
            state.videoCadenceSamplesMs,
            timestampMs - previousTimestampMs,
            settings.windowSampleLimit
          );
        }
        state.lastVideoTimestampByDirection[input.direction] = timestampMs;
      }
      if (input.direction === "audio_in") {
        pushNumericSample(
          state.audioInLatencySamplesMs,
          latencyMs,
          settings.windowSampleLimit
        );
      }
      if (input.direction === "audio_out") {
        pushNumericSample(
          state.audioOutLatencySamplesMs,
          latencyMs,
          settings.windowSampleLimit
        );
      }

      const sizeBytes = normalizeNonNegativeNumber(input.sizeBytes) ?? 0;
      const queueDepth = resolveInputQueueDepth(input);
      const captureDroppedFrameCount =
        normalizeNonNegativeNumber(input.captureDroppedFrameCount) ?? 0;
      const captureLateFrameCount =
        normalizeNonNegativeNumber(input.captureLateFrameCount) ?? 0;
      state.captureDroppedFrameCountTotal += captureDroppedFrameCount;
      state.captureLateFrameCountTotal += captureLateFrameCount;

      pushTransportSample(
        state.samples,
        {
          receivedAtMs,
          latencyMs,
          jitterMs,
          sizeBytes,
          queueDepth,
        },
        settings.windowSampleLimit
      );

      try {
        await settings.transportAdapter.publishPacket({
          liveSessionId: settings.liveSessionId,
          direction: input.direction,
          sequence,
          timestampMs,
          receivedAtMs,
          sizeBytes,
          captureDroppedFrameCount:
            captureDroppedFrameCount > 0 ? captureDroppedFrameCount : undefined,
          captureLateFrameCount:
            captureLateFrameCount > 0 ? captureLateFrameCount : undefined,
          metadata: input.metadata,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        setRuntimeError({
          code: "transport_publish_failed",
          message: errorMessage,
          atMs: receivedAtMs,
        });
        const healthState = settings.transportAdapter.getHealthState
          ? await settings.transportAdapter.getHealthState()
          : undefined;
        state.sourceHealth = normalizeTransportHealthState(healthState);
        evaluateRuntimeFallback({
          captureDroppedFrameCount,
          captureLateFrameCount,
          queueDepth,
          relayPublishError: true,
        });
        return buildSnapshot();
      }

      if (replayKey) {
        recordReplayPacket(input.direction, replayKey);
      }
      if (
        state.lastErrorCode === "transport_publish_failed"
        || state.lastErrorCode === "duplicate_packet_replay"
      ) {
        clearRuntimeError();
      }

      const healthState = settings.transportAdapter.getHealthState
        ? await settings.transportAdapter.getHealthState()
        : undefined;
      state.sourceHealth = normalizeTransportHealthState(healthState);
      evaluateRuntimeFallback({
        captureDroppedFrameCount,
        captureLateFrameCount,
        queueDepth,
      });
      return buildSnapshot();
    },

    getSnapshot(): RealtimeMediaSessionSnapshot {
      syncLeaseState(settings.now());
      return buildSnapshot();
    },
  };
}
