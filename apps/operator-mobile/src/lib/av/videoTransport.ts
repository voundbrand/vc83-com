import type { VoiceTransportSelection } from '../voice/transport';

export const MEDIA_SESSION_INGRESS_CONTRACT_VERSION = 'avr_media_session_ingress_v1' as const;

export type MediaSessionSourceClass = 'mobile_stream_ios' | 'glasses_stream_meta';

export type MediaSessionTransportFallbackReason =
  | 'none'
  | 'network_degraded'
  | 'capture_backpressure'
  | 'device_unavailable'
  | 'provider_failover'
  | 'policy_restricted';

export type VideoFrameIngressDecision =
  | 'accepted'
  | 'duplicate_replay'
  | 'gap_detected'
  | 'rate_limited';

export type VideoTransportRuntimeSelection = {
  mode: 'realtime' | 'buffered' | 'batch_replay';
  fallbackReason: MediaSessionTransportFallbackReason;
  protocol: 'https';
};

type VideoTransportSourceMode = 'iphone' | 'meta_glasses';

export type VideoFrameIngressEnvelope = {
  contractVersion: typeof MEDIA_SESSION_INGRESS_CONTRACT_VERSION;
  liveSessionId: string;
  ingressTimestampMs: number;
  cameraRuntime: {
    provider: string;
    sourceClass: MediaSessionSourceClass;
    sourceId: string;
    frameTimestampMs: number;
    sequence: number;
    transport?: string;
    frameRate?: number;
    resolution?: {
      width: number;
      height: number;
    };
  };
  videoRuntime: {
    videoSessionId: string;
    requestedProviderId?: string;
    providerId: string;
    mimeType?: string;
    codec?: string;
    frameRate?: number;
    width?: number;
    height?: number;
    packetSequence: number;
    packetTimestampMs: number;
    framePayloadBase64?: string;
  };
  captureRuntime: {
    sourceClass: MediaSessionSourceClass;
    sourceId: string;
    captureMode: 'stream';
    captureTimestampMs: number;
    frameTimestampMs: number;
    sequence: number;
    frameRate?: number;
    resolution?: {
      width: number;
      height: number;
    };
    withSystemAudio: false;
    withMicAudio: boolean;
    diagnostics?: {
      captureToIngressLatencyMs?: number;
      droppedFrameCount?: number;
      lateFrameCount?: number;
      captureErrorCode?: string;
    };
  };
  transportRuntime: {
    mode: 'realtime' | 'buffered' | 'batch_replay';
    fallbackReason: MediaSessionTransportFallbackReason;
    ingressTimestampMs: number;
    transportId?: string;
    protocol: 'https';
    diagnostics?: {
      reconnectCount?: number;
      fallbackTransitionCount?: number;
    };
  };
  authority: {
    nativePolicyPrecedence: 'vc83_runtime_policy';
    mutatingIntentGate: 'native_tool_registry';
    approvalInvariant: 'non_bypassable';
    directDeviceMutation: 'fail_closed';
  };
};

export type VideoTransportObservabilityRuntime = {
  videoSessionId: string;
  packetSequence: number;
  acceptedFrames: number;
  droppedFrames: number;
  duplicateFrames: number;
  gapDetectedCount: number;
  rateLimitedCount: number;
  fallbackTransitionCount: number;
  fallbackReason: MediaSessionTransportFallbackReason;
  mode: 'realtime' | 'buffered' | 'batch_replay';
  lastIngressAtMs?: number;
  lastCaptureAtMs?: number;
  lastDecision?: VideoFrameIngressDecision;
  lastErrorCode?: string;
  cadenceMs: number;
};

function normalizePositiveInteger(value: number, fallback: number): number {
  if (!Number.isFinite(value)) {
    return fallback;
  }
  const rounded = Math.floor(value);
  if (rounded <= 0) {
    return fallback;
  }
  return rounded;
}

function resolveSourceClass(mode: VideoTransportSourceMode): MediaSessionSourceClass {
  return mode === 'meta_glasses' ? 'glasses_stream_meta' : 'mobile_stream_ios';
}

export function resolveVideoTransportRuntimeSelection(args: {
  voiceSelection: VoiceTransportSelection;
  isVoiceRealtimeConnected: boolean;
  policyRestricted: boolean;
  deviceAvailable: boolean;
}): VideoTransportRuntimeSelection {
  if (args.policyRestricted) {
    return {
      mode: 'buffered',
      fallbackReason: 'policy_restricted',
      protocol: 'https',
    };
  }
  if (!args.deviceAvailable) {
    return {
      mode: 'buffered',
      fallbackReason: 'device_unavailable',
      protocol: 'https',
    };
  }
  if (args.voiceSelection.effectiveMode === 'websocket') {
    return {
      mode: args.isVoiceRealtimeConnected ? 'realtime' : 'buffered',
      fallbackReason: args.isVoiceRealtimeConnected ? 'none' : 'network_degraded',
      protocol: 'https',
    };
  }
  if (args.voiceSelection.effectiveMode === 'webrtc') {
    return {
      mode: 'buffered',
      fallbackReason: 'provider_failover',
      protocol: 'https',
    };
  }
  return {
    mode: 'batch_replay',
    fallbackReason: args.voiceSelection.fallbackReason ? 'provider_failover' : 'none',
    protocol: 'https',
  };
}

export function shouldThrottleVideoCapture(args: {
  nowMs: number;
  lastCaptureAtMs?: number;
  cadenceMs: number;
}) {
  const cadenceMs = normalizePositiveInteger(args.cadenceMs, 750);
  const lastCaptureAtMs = typeof args.lastCaptureAtMs === 'number' ? args.lastCaptureAtMs : undefined;
  if (typeof lastCaptureAtMs !== 'number') {
    return {
      throttled: false,
      cadenceMs,
      retryAfterMs: 0,
    };
  }
  const elapsed = args.nowMs - lastCaptureAtMs;
  if (elapsed >= cadenceMs) {
    return {
      throttled: false,
      cadenceMs,
      retryAfterMs: 0,
    };
  }
  return {
    throttled: true,
    cadenceMs,
    retryAfterMs: Math.max(0, cadenceMs - elapsed),
  };
}

export function buildVideoFrameIngressEnvelope(args: {
  liveSessionId: string;
  sourceMode: VideoTransportSourceMode;
  sourceId: string;
  sourceProviderId: string;
  videoSessionId: string;
  packetSequence: number;
  frameTimestampMs: number;
  captureTimestampMs: number;
  mimeType?: string;
  frameRate?: number;
  width?: number;
  height?: number;
  transportRuntime: VideoTransportRuntimeSelection;
  fallbackTransitionCount: number;
  reconnectCount: number;
  requestedProviderId?: string;
  captureLatencyMs?: number;
  droppedFrameCount?: number;
  captureErrorCode?: string;
  framePayloadBase64?: string;
}): VideoFrameIngressEnvelope {
  const sourceClass = resolveSourceClass(args.sourceMode);
  const normalizedFrameRate = normalizePositiveInteger(args.frameRate || 0, 0) || undefined;
  const width = normalizePositiveInteger(args.width || 0, 0) || undefined;
  const height = normalizePositiveInteger(args.height || 0, 0) || undefined;
  const resolution =
    width && height
      ? {
          width,
          height,
        }
      : undefined;

  return {
    contractVersion: MEDIA_SESSION_INGRESS_CONTRACT_VERSION,
    liveSessionId: args.liveSessionId,
    ingressTimestampMs: Date.now(),
    cameraRuntime: {
      provider: args.sourceProviderId,
      sourceClass,
      sourceId: args.sourceId,
      frameTimestampMs: args.frameTimestampMs,
      sequence: args.packetSequence,
      transport: args.transportRuntime.protocol,
      frameRate: normalizedFrameRate,
      resolution,
    },
    videoRuntime: {
      videoSessionId: args.videoSessionId,
      requestedProviderId: args.requestedProviderId,
      providerId: 'operator_mobile_video_feed',
      mimeType: args.mimeType || undefined,
      codec: args.mimeType?.includes('png') ? 'png' : 'jpeg',
      frameRate: normalizedFrameRate,
      width,
      height,
      packetSequence: args.packetSequence,
      packetTimestampMs: args.frameTimestampMs,
      framePayloadBase64: args.framePayloadBase64?.trim() || undefined,
    },
    captureRuntime: {
      sourceClass,
      sourceId: args.sourceId,
      captureMode: 'stream',
      captureTimestampMs: args.captureTimestampMs,
      frameTimestampMs: args.frameTimestampMs,
      sequence: args.packetSequence,
      frameRate: normalizedFrameRate,
      resolution,
      withSystemAudio: false,
      withMicAudio: args.sourceMode === 'meta_glasses',
      diagnostics: {
        captureToIngressLatencyMs: normalizePositiveInteger(args.captureLatencyMs || 0, 0) || undefined,
        droppedFrameCount: normalizePositiveInteger(args.droppedFrameCount || 0, 0) || undefined,
        captureErrorCode: args.captureErrorCode,
      },
    },
    transportRuntime: {
      mode: args.transportRuntime.mode,
      fallbackReason: args.transportRuntime.fallbackReason,
      ingressTimestampMs: Date.now(),
      transportId: `operator_mobile_video:${args.videoSessionId}`,
      protocol: args.transportRuntime.protocol,
      diagnostics: {
        reconnectCount: normalizePositiveInteger(args.reconnectCount, 0) || 0,
        fallbackTransitionCount: normalizePositiveInteger(args.fallbackTransitionCount, 0) || 0,
      },
    },
    authority: {
      nativePolicyPrecedence: 'vc83_runtime_policy',
      mutatingIntentGate: 'native_tool_registry',
      approvalInvariant: 'non_bypassable',
      directDeviceMutation: 'fail_closed',
    },
  };
}
