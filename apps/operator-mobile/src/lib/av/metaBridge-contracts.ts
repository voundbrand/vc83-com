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

export type MetaBridgeLifecycleStage =
  | 'status'
  | 'initiated'
  | 'discovering'
  | 'connecting'
  | 'handshake'
  | 'success'
  | 'failure'
  | 'disconnecting'
  | 'disconnected';

export type MetaBridgeDebugSeverity = 'info' | 'warn' | 'error';

export type MetaBridgeDebugEvent = {
  id: string;
  atMs: number;
  stage: MetaBridgeLifecycleStage;
  severity: MetaBridgeDebugSeverity;
  code: string;
  message: string;
  details?: Record<string, unknown>;
};

export type MetaBridgeDeviceListEntry = {
  deviceId: string;
  deviceLabel: string;
  sourceClass?: string;
  providerId?: string;
  connected?: boolean;
};

export type MetaBridgePermissionSnapshot = {
  bluetooth?: string;
  camera?: string;
  microphone?: string;
  location?: string;
  bluetoothConnect?: string;
  bluetoothScan?: string;
};

export type MetaBridgeRuntimeDiagnostics = {
  platform: 'ios' | 'android' | 'unknown';
  registrationState?: string;
  bluetoothAdapterState?: string;
  bluetoothAuthorization?: string;
  permissions?: MetaBridgePermissionSnapshot;
  discoveredDevices?: MetaBridgeDeviceListEntry[];
  pairedDevices?: MetaBridgeDeviceListEntry[];
};

export type MetaBridgeSnapshot = {
  connectionState: MetaBridgeConnectionState;
  datSdkAvailable: boolean;
  activeDevice: MetaBridgeActiveDevice | null;
  frameIngress: MetaBridgeFrameIngressStats;
  audioIngress: MetaBridgeAudioIngressStats;
  failure: MetaBridgeFailure | null;
  fallbackReason?: string;
  diagnostics: MetaBridgeRuntimeDiagnostics;
  debugEvents: MetaBridgeDebugEvent[];
  updatedAtMs: number;
};

export type VisionSourceReadiness = {
  ready: boolean;
  reasonCode: string;
};

export type ConversationCapabilityReasonCode =
  | 'permission_denied_mic'
  | 'permission_denied_camera'
  | 'device_unavailable'
  | 'dat_sdk_unavailable'
  | 'transport_failed'
  | 'session_auth_failed'
  | 'session_open_failed'
  | 'provider_unavailable';

export type VisionSourceNegotiation = {
  selectedSourceMode: VisionSourceMode | null;
  ready: boolean;
  readinessReasonCode: string;
  conversationReasonCode?: ConversationCapabilityReasonCode;
};

const DEFAULT_SAMPLE_RATE = 24_000;

export function createDefaultMetaBridgeDiagnostics(): MetaBridgeRuntimeDiagnostics {
  return {
    platform: 'unknown',
    permissions: {},
    discoveredDevices: [],
    pairedDevices: [],
  };
}

export function createDefaultMetaBridgeSnapshot(nowMs: number = Date.now()): MetaBridgeSnapshot {
  return {
    connectionState: 'disconnected',
    datSdkAvailable: false,
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
    diagnostics: createDefaultMetaBridgeDiagnostics(),
    debugEvents: [],
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

  if (!args.bridge.datSdkAvailable) {
    return { ready: false, reasonCode: 'meta_bridge_dat_sdk_unavailable' };
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

export function mapVisionReadinessReasonToConversationReason(
  reasonCode: string
): ConversationCapabilityReasonCode {
  const normalized = reasonCode.trim().toLowerCase();
  if (
    normalized.includes('dat_sdk_unavailable')
    || normalized.includes('meta_bridge_dat_sdk_unavailable')
  ) {
    return 'dat_sdk_unavailable';
  }
  if (
    normalized.includes('meta_bridge_not_connected')
    || normalized.includes('meta_bridge_missing_device')
    || normalized.includes('meta_bridge_source_class_mismatch')
    || normalized.includes('meta_bridge_failure')
    || normalized.includes('meta_bridge_fallback')
  ) {
    return 'device_unavailable';
  }
  if (normalized.includes('camera')) {
    return 'permission_denied_camera';
  }
  if (normalized.includes('notallowederror') || normalized.includes('permission') || normalized.includes('mic')) {
    return 'permission_denied_mic';
  }
  if (normalized.includes('auth')) {
    return 'session_auth_failed';
  }
  if (normalized.includes('transport') || normalized.includes('websocket')) {
    return 'transport_failed';
  }
  if (normalized.includes('provider')) {
    return 'provider_unavailable';
  }
  if (normalized.includes('unavailable')) {
    return 'device_unavailable';
  }
  return 'session_open_failed';
}

export function requiresMetaAiAppConnection(reasonCode: string | null | undefined): boolean {
  if (typeof reasonCode !== 'string' || reasonCode.trim().length === 0) {
    return false;
  }

  const normalized = reasonCode.trim().toLowerCase();
  const connectionReasons = [
    'meta_bridge_not_connected',
    'meta_bridge_missing_device',
    'dat_device_identity_unavailable',
    'awaiting_dat_device_identity',
    'dat_device_not_connected',
    'dat_device_disconnected',
    'dat_device_not_found',
    'bridge_unavailable',
  ];

  return connectionReasons.some((reason) => normalized.includes(reason));
}

export function negotiateVisionSource(args: {
  preferredSourceMode: VisionSourceMode;
  bridge: MetaBridgeSnapshot;
}): VisionSourceNegotiation {
  const preferredReadiness = evaluateVisionSourceReadiness({
    sourceMode: args.preferredSourceMode,
    bridge: args.bridge,
  });
  if (preferredReadiness.ready) {
    return {
      selectedSourceMode: args.preferredSourceMode,
      ready: true,
      readinessReasonCode: preferredReadiness.reasonCode,
    };
  }

  const fallbackReadiness = evaluateVisionSourceReadiness({
    sourceMode: args.preferredSourceMode === 'meta_glasses' ? 'iphone' : 'meta_glasses',
    bridge: args.bridge,
  });
  if (fallbackReadiness.ready) {
    return {
      selectedSourceMode: args.preferredSourceMode === 'meta_glasses' ? 'iphone' : 'meta_glasses',
      ready: true,
      readinessReasonCode: fallbackReadiness.reasonCode,
      conversationReasonCode: mapVisionReadinessReasonToConversationReason(
        preferredReadiness.reasonCode
      ),
    };
  }

  return {
    selectedSourceMode: null,
    ready: false,
    readinessReasonCode: preferredReadiness.reasonCode,
    conversationReasonCode: mapVisionReadinessReasonToConversationReason(
      preferredReadiness.reasonCode
    ),
  };
}

export function buildMetaBridgeDiagnostics(bridge: MetaBridgeSnapshot): Record<string, unknown> {
  return {
    connectionState: bridge.connectionState,
    datSdkAvailable: bridge.datSdkAvailable,
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
    runtime: bridge.diagnostics,
    recentDebugEvents: bridge.debugEvents.slice(-40),
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
