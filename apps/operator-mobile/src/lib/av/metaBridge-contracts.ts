export type VisionSourceMode = 'iphone' | 'meta_glasses';

export type MetaBridgeConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'error';

export type MetaBridgeFailure = {
  reasonCode: string;
  message?: string;
  recoverable: boolean;
  atMs: number;
};

export type MetaBridgeActiveDevice = {
  sourceId: string;
  sourceClass: 'meta_glasses';
  providerId: string;
  deviceId: string;
  deviceLabel: string;
  connectedAtMs?: number;
};

export type MetaBridgeFrameIngressStats = {
  fps: number;
  totalFrames: number;
  droppedFrames: number;
  lastFrameTs?: number;
};

export type MetaBridgeAudioIngressStats = {
  sampleRate: number;
  packetCount: number;
  lastPacketTs?: number;
};

export type MetaBridgeSnapshot = {
  connectionState: MetaBridgeConnectionState;
  activeDevice: MetaBridgeActiveDevice | null;
  frameIngress: MetaBridgeFrameIngressStats;
  audioIngress: MetaBridgeAudioIngressStats;
  failure: MetaBridgeFailure | null;
  fallbackReason?: string;
  updatedAtMs: number;
};

export type VisionSourceReadiness = {
  ready: boolean;
  reasonCode: string;
};

const DEFAULT_SAMPLE_RATE = 16_000;

export function createDefaultMetaBridgeSnapshot(nowMs: number = Date.now()): MetaBridgeSnapshot {
  return {
    connectionState: 'disconnected',
    activeDevice: null,
    frameIngress: {
      fps: 0,
      totalFrames: 0,
      droppedFrames: 0,
    },
    audioIngress: {
      sampleRate: DEFAULT_SAMPLE_RATE,
      packetCount: 0,
    },
    failure: null,
    updatedAtMs: nowMs,
  };
}

export function evaluateVisionSourceReadiness(args: {
  sourceMode: VisionSourceMode;
  bridge: MetaBridgeSnapshot;
}): VisionSourceReadiness {
  if (args.sourceMode !== 'meta_glasses') {
    return { ready: true, reasonCode: 'iphone_source_ready' };
  }

  if (args.bridge.connectionState !== 'connected') {
    return { ready: false, reasonCode: 'meta_bridge_not_connected' };
  }

  if (!args.bridge.activeDevice) {
    return { ready: false, reasonCode: 'meta_bridge_missing_device' };
  }

  if (args.bridge.activeDevice.sourceClass !== 'meta_glasses') {
    return { ready: false, reasonCode: 'meta_bridge_source_class_mismatch' };
  }

  if (args.bridge.failure) {
    return {
      ready: false,
      reasonCode: `meta_bridge_failure:${args.bridge.failure.reasonCode}`,
    };
  }

  if (args.bridge.fallbackReason) {
    return {
      ready: false,
      reasonCode: `meta_bridge_fallback:${args.bridge.fallbackReason}`,
    };
  }

  return { ready: true, reasonCode: 'meta_bridge_healthy' };
}

export function buildMetaBridgeDiagnostics(bridge: MetaBridgeSnapshot): Record<string, unknown> {
  return {
    connectionState: bridge.connectionState,
    activeDevice: bridge.activeDevice || undefined,
    frameIngress: {
      fps: bridge.frameIngress.fps,
      totalFrames: bridge.frameIngress.totalFrames,
      droppedFrames: bridge.frameIngress.droppedFrames,
      lastFrameTs: bridge.frameIngress.lastFrameTs,
    },
    audioIngress: {
      sampleRate: bridge.audioIngress.sampleRate,
      packetCount: bridge.audioIngress.packetCount,
      lastPacketTs: bridge.audioIngress.lastPacketTs,
    },
    failure: bridge.failure || undefined,
    fallbackReason: bridge.fallbackReason,
    updatedAtMs: bridge.updatedAtMs,
  };
}

export function buildGeminiLiveMetadata(args: {
  sourceMode: VisionSourceMode;
  bridge: MetaBridgeSnapshot;
}): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    provider: 'gemini',
    mode: 'live_reference',
    sourceMode: args.sourceMode,
    bridgeConnectionState: args.bridge.connectionState,
    enabled: true,
  };

  if (args.sourceMode === 'meta_glasses') {
    payload.bridgeDiagnostics = buildMetaBridgeDiagnostics(args.bridge);
  }

  return payload;
}
