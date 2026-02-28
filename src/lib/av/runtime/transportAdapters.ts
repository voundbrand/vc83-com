import type { MediaSessionCaptureMetadata } from "../session/mediaSessionContract";

export const MEDIA_SESSION_TRANSPORT_MODE_VALUES = [
  "realtime",
  "buffered",
  "batch_replay",
] as const;
export type MediaSessionTransportMode =
  (typeof MEDIA_SESSION_TRANSPORT_MODE_VALUES)[number];

export const MEDIA_SESSION_TRANSPORT_FALLBACK_REASON_VALUES = [
  "none",
  "network_degraded",
  "capture_backpressure",
  "device_unavailable",
  "provider_failover",
  "policy_restricted",
  "session_lease_expired",
  "relay_publish_error",
] as const;
export type MediaSessionTransportFallbackReason =
  (typeof MEDIA_SESSION_TRANSPORT_FALLBACK_REASON_VALUES)[number];

export const REALTIME_MEDIA_DIRECTION_VALUES = [
  "audio_in",
  "audio_out",
  "video_in",
  "video_out",
] as const;
export type RealtimeMediaDirection = (typeof REALTIME_MEDIA_DIRECTION_VALUES)[number];

export interface RealtimeMediaPacket {
  liveSessionId: string;
  direction: RealtimeMediaDirection;
  sequence: number;
  timestampMs: number;
  receivedAtMs: number;
  sizeBytes: number;
  captureDroppedFrameCount?: number;
  captureLateFrameCount?: number;
  metadata?: MediaSessionCaptureMetadata;
}

export interface TransportHealthState {
  deviceAvailable: boolean;
  providerFailoverActive: boolean;
  policyRestricted: boolean;
}

export interface MediaSessionTransportDiagnostics {
  latencyMsP50?: number;
  latencyMsP95?: number;
  jitterMsP50?: number;
  jitterMsP95?: number;
  queueDepthP50?: number;
  queueDepthP95?: number;
  packetLossPct?: number;
  bitrateKbps?: number;
  reconnectCount?: number;
  fallbackTransitionCount?: number;
  downgradeTransitionCount?: number;
  replayDuplicateCount?: number;
  lastErrorCode?: string;
}

export interface TransportMetricSample {
  receivedAtMs: number;
  latencyMs: number;
  jitterMs: number;
  sizeBytes: number;
  queueDepth?: number;
}

export interface TransportRuntimeThresholds {
  latencyMsP95Threshold: number;
  jitterMsP95Threshold: number;
  packetLossPctThreshold: number;
  queueDepthThreshold: number;
}

export const DEFAULT_TRANSPORT_RUNTIME_THRESHOLDS: TransportRuntimeThresholds = {
  latencyMsP95Threshold: 350,
  jitterMsP95Threshold: 90,
  packetLossPctThreshold: 5,
  queueDepthThreshold: 12,
};

export interface RealtimeTransportAdapter {
  publishPacket(packet: RealtimeMediaPacket): Promise<void>;
  getHealthState?(): Promise<Partial<TransportHealthState> | undefined>;
}

export interface InMemoryTransportAdapter extends RealtimeTransportAdapter {
  getPackets(): RealtimeMediaPacket[];
  setHealthState(healthState: Partial<TransportHealthState>): void;
}

export function normalizeTransportHealthState(
  healthState?: Partial<TransportHealthState>
): TransportHealthState {
  return {
    deviceAvailable: healthState?.deviceAvailable !== false,
    providerFailoverActive: healthState?.providerFailoverActive === true,
    policyRestricted: healthState?.policyRestricted === true,
  };
}

function normalizePositiveNumber(value: number | undefined): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }
  if (value <= 0) {
    return undefined;
  }
  return value;
}

function normalizeNonNegativeNumber(value: number | undefined): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }
  if (value < 0) {
    return undefined;
  }
  return value;
}

function roundTo3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function resolveThresholds(
  thresholds: Partial<TransportRuntimeThresholds> | undefined
): TransportRuntimeThresholds {
  return {
    latencyMsP95Threshold:
      normalizePositiveNumber(thresholds?.latencyMsP95Threshold)
      ?? DEFAULT_TRANSPORT_RUNTIME_THRESHOLDS.latencyMsP95Threshold,
    jitterMsP95Threshold:
      normalizePositiveNumber(thresholds?.jitterMsP95Threshold)
      ?? DEFAULT_TRANSPORT_RUNTIME_THRESHOLDS.jitterMsP95Threshold,
    packetLossPctThreshold:
      normalizePositiveNumber(thresholds?.packetLossPctThreshold)
      ?? DEFAULT_TRANSPORT_RUNTIME_THRESHOLDS.packetLossPctThreshold,
    queueDepthThreshold:
      normalizePositiveNumber(thresholds?.queueDepthThreshold)
      ?? DEFAULT_TRANSPORT_RUNTIME_THRESHOLDS.queueDepthThreshold,
  };
}

export function calculatePercentile(
  samples: number[],
  percentile: number
): number | undefined {
  if (!Number.isFinite(percentile)) {
    return undefined;
  }
  const boundedPercentile = Math.min(100, Math.max(0, percentile));
  const normalized = samples
    .filter((sample) => Number.isFinite(sample))
    .map((sample) => Math.max(0, sample))
    .sort((left, right) => left - right);
  if (normalized.length === 0) {
    return undefined;
  }
  const rankIndex = Math.min(
    normalized.length - 1,
    Math.max(0, Math.ceil((boundedPercentile / 100) * normalized.length) - 1)
  );
  return roundTo3(normalized[rankIndex] ?? 0);
}

export function summarizeTransportDiagnostics(args: {
  samples: TransportMetricSample[];
  totalPacketCount: number;
  droppedPacketCount: number;
  reconnectCount: number;
  fallbackTransitionCount: number;
  downgradeTransitionCount?: number;
  replayDuplicateCount?: number;
  lastErrorCode?: string;
}): MediaSessionTransportDiagnostics {
  const latencySamples = args.samples.map((sample) => sample.latencyMs);
  const jitterSamples = args.samples.map((sample) => sample.jitterMs);
  const queueDepthSamples = args.samples
    .map((sample) => normalizeNonNegativeNumber(sample.queueDepth))
    .filter((sample): sample is number => typeof sample === "number");

  const totalExpectedPackets = args.totalPacketCount + args.droppedPacketCount;
  const packetLossPct = totalExpectedPackets > 0
    ? roundTo3((args.droppedPacketCount / totalExpectedPackets) * 100)
    : 0;

  let bitrateKbps: number | undefined;
  if (args.samples.length >= 2) {
    const firstSample = args.samples[0];
    const lastSample = args.samples[args.samples.length - 1];
    if (firstSample && lastSample) {
      const spanMs = Math.max(1, lastSample.receivedAtMs - firstSample.receivedAtMs);
      const totalBytes = args.samples.reduce((sum, sample) => sum + sample.sizeBytes, 0);
      bitrateKbps = roundTo3((totalBytes * 8) / (spanMs / 1000) / 1000);
    }
  }

  return {
    latencyMsP50: calculatePercentile(latencySamples, 50),
    latencyMsP95: calculatePercentile(latencySamples, 95),
    jitterMsP50: calculatePercentile(jitterSamples, 50),
    jitterMsP95: calculatePercentile(jitterSamples, 95),
    queueDepthP50: calculatePercentile(queueDepthSamples, 50),
    queueDepthP95: calculatePercentile(queueDepthSamples, 95),
    packetLossPct,
    bitrateKbps,
    reconnectCount: args.reconnectCount,
    fallbackTransitionCount: args.fallbackTransitionCount,
    downgradeTransitionCount: args.downgradeTransitionCount ?? 0,
    replayDuplicateCount: args.replayDuplicateCount ?? 0,
    lastErrorCode: args.lastErrorCode,
  };
}

function isNetworkDegraded(args: {
  diagnostics: MediaSessionTransportDiagnostics;
  thresholds: TransportRuntimeThresholds;
}): boolean {
  const latencyMsP95 = normalizePositiveNumber(args.diagnostics.latencyMsP95);
  if (
    typeof latencyMsP95 === "number" &&
    latencyMsP95 > args.thresholds.latencyMsP95Threshold
  ) {
    return true;
  }

  const jitterMsP95 = normalizePositiveNumber(args.diagnostics.jitterMsP95);
  if (
    typeof jitterMsP95 === "number" &&
    jitterMsP95 > args.thresholds.jitterMsP95Threshold
  ) {
    return true;
  }

  const packetLossPct = normalizeNonNegativeNumber(args.diagnostics.packetLossPct);
  if (
    typeof packetLossPct === "number" &&
    packetLossPct > args.thresholds.packetLossPctThreshold
  ) {
    return true;
  }

  const queueDepthP95 = normalizeNonNegativeNumber(args.diagnostics.queueDepthP95);
  if (
    typeof queueDepthP95 === "number" &&
    queueDepthP95 > args.thresholds.queueDepthThreshold
  ) {
    return true;
  }

  return false;
}

export function evaluateTransportFallback(args: {
  healthState?: Partial<TransportHealthState>;
  diagnostics: MediaSessionTransportDiagnostics;
  captureDroppedFrameCount?: number;
  captureLateFrameCount?: number;
  thresholds?: Partial<TransportRuntimeThresholds>;
  queueDepth?: number;
  relayPublishError?: boolean;
  leaseExpired?: boolean;
}): {
  mode: MediaSessionTransportMode;
  fallbackReason: MediaSessionTransportFallbackReason;
} {
  const healthState = normalizeTransportHealthState(args.healthState);
  const thresholds = resolveThresholds(args.thresholds);
  const captureDroppedFrameCount =
    normalizeNonNegativeNumber(args.captureDroppedFrameCount) ?? 0;
  const captureLateFrameCount =
    normalizeNonNegativeNumber(args.captureLateFrameCount) ?? 0;
  const queueDepth = normalizeNonNegativeNumber(args.queueDepth) ?? 0;

  if (args.leaseExpired === true) {
    return {
      mode: "batch_replay",
      fallbackReason: "session_lease_expired",
    };
  }

  if (healthState.policyRestricted) {
    return {
      mode: "batch_replay",
      fallbackReason: "policy_restricted",
    };
  }

  if (!healthState.deviceAvailable) {
    return {
      mode: "batch_replay",
      fallbackReason: "device_unavailable",
    };
  }

  if (healthState.providerFailoverActive) {
    return {
      mode: "buffered",
      fallbackReason: "provider_failover",
    };
  }

  if (args.relayPublishError === true) {
    return {
      mode: "batch_replay",
      fallbackReason: "relay_publish_error",
    };
  }

  if (captureDroppedFrameCount > 0 || captureLateFrameCount > 0) {
    return {
      mode: "buffered",
      fallbackReason: "capture_backpressure",
    };
  }

  if (queueDepth > thresholds.queueDepthThreshold) {
    return {
      mode: "buffered",
      fallbackReason: "capture_backpressure",
    };
  }

  if (isNetworkDegraded({ diagnostics: args.diagnostics, thresholds })) {
    return {
      mode: "buffered",
      fallbackReason: "network_degraded",
    };
  }

  return {
    mode: "realtime",
    fallbackReason: "none",
  };
}

export function createInMemoryTransportAdapter(args?: {
  initialHealthState?: Partial<TransportHealthState>;
}): InMemoryTransportAdapter {
  const packets: RealtimeMediaPacket[] = [];
  let healthState = normalizeTransportHealthState(args?.initialHealthState);

  return {
    async publishPacket(packet: RealtimeMediaPacket): Promise<void> {
      packets.push({
        ...packet,
        metadata: packet.metadata ? { ...packet.metadata } : undefined,
      });
    },
    async getHealthState(): Promise<Partial<TransportHealthState>> {
      return { ...healthState };
    },
    getPackets(): RealtimeMediaPacket[] {
      return packets.map((packet) => ({
        ...packet,
        metadata: packet.metadata ? { ...packet.metadata } : undefined,
      }));
    },
    setHealthState(nextHealthState: Partial<TransportHealthState>) {
      healthState = normalizeTransportHealthState({
        ...healthState,
        ...nextHealthState,
      });
    },
  };
}
