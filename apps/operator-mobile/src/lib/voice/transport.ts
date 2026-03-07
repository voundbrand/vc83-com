export type VoiceTransportMode = 'webrtc' | 'websocket' | 'chunked_fallback';
export type EffectiveVoiceTransportMode = VoiceTransportMode;
export type VoiceTransportFallbackReason =
  | 'webrtc_unavailable'
  | 'webrtc_not_implemented'
  | 'websocket_unavailable'
  | 'websocket_connect_failed'
  | 'websocket_runtime_error'
  | 'websocket_closed';
export type VoiceTransportDegradationReasonCode =
  | VoiceTransportFallbackReason
  | 'none';

export type VoiceTransportSelection = {
  requestedMode: VoiceTransportMode;
  effectiveMode: EffectiveVoiceTransportMode;
  fallbackReason?: VoiceTransportFallbackReason;
};

export type VoiceTransportDegradationState = {
  isDegraded: boolean;
  reasonCode: VoiceTransportDegradationReasonCode;
  reasonLabel: string;
  reasonLabelKey: VoiceTransportDegradationReasonLabelKey;
  transitionLabel: string;
};

export type VoiceTransportRuntimeSession = {
  interviewSessionId?: string;
  voiceSessionId?: string;
};

export type VoiceTransportDegradationReasonLabelKey =
  | 'chat.voiceTransportReason.none'
  | 'chat.voiceTransportReason.webrtc_unavailable'
  | 'chat.voiceTransportReason.webrtc_not_implemented'
  | 'chat.voiceTransportReason.websocket_unavailable'
  | 'chat.voiceTransportReason.websocket_connect_failed'
  | 'chat.voiceTransportReason.websocket_runtime_error'
  | 'chat.voiceTransportReason.websocket_closed';

const VOICE_TRANSPORT_DEGRADATION_REASON_LABEL_KEYS: Record<
  VoiceTransportFallbackReason,
  VoiceTransportDegradationReasonLabelKey
> = {
  webrtc_unavailable: 'chat.voiceTransportReason.webrtc_unavailable',
  webrtc_not_implemented: 'chat.voiceTransportReason.webrtc_not_implemented',
  websocket_unavailable: 'chat.voiceTransportReason.websocket_unavailable',
  websocket_connect_failed: 'chat.voiceTransportReason.websocket_connect_failed',
  websocket_runtime_error: 'chat.voiceTransportReason.websocket_runtime_error',
  websocket_closed: 'chat.voiceTransportReason.websocket_closed',
};

export function resolveVoiceTransportDegradationState(
  selection: VoiceTransportSelection
): VoiceTransportDegradationState {
  const transitionLabel = `${selection.requestedMode}->${selection.effectiveMode}`;
  const reasonCode: VoiceTransportDegradationReasonCode = selection.fallbackReason ?? 'none';
  if (reasonCode === 'none') {
    return {
      isDegraded: false,
      reasonCode,
      reasonLabel: 'none',
      reasonLabelKey: 'chat.voiceTransportReason.none',
      transitionLabel,
    };
  }
  return {
    isDegraded: true,
    reasonCode,
    reasonLabel: `${reasonCode}; ${transitionLabel}`,
    reasonLabelKey: VOICE_TRANSPORT_DEGRADATION_REASON_LABEL_KEYS[reasonCode],
    transitionLabel,
  };
}

export function buildVoiceTransportRuntime(args: {
  selection: VoiceTransportSelection;
  liveSessionId?: string;
  activeSession?: VoiceTransportRuntimeSession | null;
  isRealtimeConnected: boolean;
  realtimeRelayHealth?: {
    healthy: boolean;
    reasonCode: string;
    lastIngestAttemptAtMs?: number;
    lastIngestAckAtMs?: number;
    consecutiveIngestFailures: number;
    serverRelayReasonCode?: string;
    serverRelayQosAgeMs?: number;
    serverRelayContractVersionStatus?: 'ok' | 'missing' | 'mismatch';
    serverRelayHeartbeatContractVersionStatus?: 'ok' | 'missing' | 'mismatch';
    serverRelayQos?: {
      contractVersion: string;
      observedAtMs: number;
      healthy: boolean;
      reasonCode: string;
      heartbeat: {
        contractVersion?: string;
        status: 'acknowledged' | 'missing';
        expectedSequence: number;
        ackSequence?: number;
        acknowledgedAtMs?: number;
      };
      qos?: {
        orderingDecision?: string;
        relayEventCount?: number;
        idempotentReplay?: boolean;
        persistedFinalTranscript?: boolean;
      };
    };
  };
  relayServerMonitoring?: {
    monitoringContractVersion: 'mobile_voice_relay_server_monitoring_v1';
    missingPayloadCount: number;
    qosContractMismatchCount: number;
    heartbeatContractMismatchCount: number;
    lastMissingPayloadAtMs?: number;
    lastQosContractMismatchAtMs?: number;
    lastHeartbeatContractMismatchAtMs?: number;
  };
  partialTranscript?: string;
  telemetry?: Record<string, unknown>;
}): Record<string, unknown> {
  const degradation = resolveVoiceTransportDegradationState(args.selection);
  const realtimeRelayHealth = args.realtimeRelayHealth;
  return {
    mode: args.selection.effectiveMode,
    transport: args.selection.effectiveMode,
    requestedTransport: args.selection.requestedMode,
    fallbackReason: args.selection.fallbackReason || 'none',
    transportFallbackReason: args.selection.fallbackReason || 'none',
    degraded: degradation.isDegraded,
    degradationReasonCode: degradation.reasonCode,
    degradationReasonLabel: degradation.reasonLabel,
    degradationReasonLabelKey: degradation.reasonLabelKey,
    degradationTransition: degradation.transitionLabel,
    realtimeConnected: args.isRealtimeConnected,
    realtimeRelayHealthy: realtimeRelayHealth?.healthy ?? false,
    realtimeRelayReasonCode: realtimeRelayHealth?.reasonCode ?? 'socket_disconnected',
    realtimeRelayLastIngestAttemptAtMs: realtimeRelayHealth?.lastIngestAttemptAtMs,
    realtimeRelayLastIngestAckAtMs: realtimeRelayHealth?.lastIngestAckAtMs,
    realtimeRelayConsecutiveIngestFailures:
      realtimeRelayHealth?.consecutiveIngestFailures ?? 0,
    realtimeRelayServerContractVersion:
      realtimeRelayHealth?.serverRelayQos?.contractVersion ?? undefined,
    realtimeRelayServerObservedAtMs:
      realtimeRelayHealth?.serverRelayQos?.observedAtMs ?? undefined,
    realtimeRelayServerHealthy:
      realtimeRelayHealth?.serverRelayQos?.healthy ?? undefined,
    realtimeRelayServerReasonCode:
      realtimeRelayHealth?.serverRelayReasonCode
      ?? realtimeRelayHealth?.serverRelayQos?.reasonCode
      ?? 'none',
    realtimeRelayServerContractVersionStatus:
      realtimeRelayHealth?.serverRelayContractVersionStatus ?? undefined,
    realtimeRelayServerHeartbeatContractVersionStatus:
      realtimeRelayHealth?.serverRelayHeartbeatContractVersionStatus ?? undefined,
    realtimeRelayServerQosAgeMs:
      realtimeRelayHealth?.serverRelayQosAgeMs ?? undefined,
    realtimeRelayServerHeartbeatStatus:
      realtimeRelayHealth?.serverRelayQos?.heartbeat.status ?? undefined,
    realtimeRelayServerHeartbeatExpectedSequence:
      realtimeRelayHealth?.serverRelayQos?.heartbeat.expectedSequence ?? undefined,
    realtimeRelayServerHeartbeatAckSequence:
      realtimeRelayHealth?.serverRelayQos?.heartbeat.ackSequence ?? undefined,
    realtimeRelayServerHeartbeatAckAtMs:
      realtimeRelayHealth?.serverRelayQos?.heartbeat.acknowledgedAtMs ?? undefined,
    realtimeRelayServerOrderingDecision:
      realtimeRelayHealth?.serverRelayQos?.qos?.orderingDecision ?? undefined,
    realtimeRelayServerRelayEventCount:
      realtimeRelayHealth?.serverRelayQos?.qos?.relayEventCount ?? undefined,
    realtimeRelayServerMonitoringContractVersion:
      args.relayServerMonitoring?.monitoringContractVersion ?? undefined,
    realtimeRelayServerMissingPayloadCount:
      args.relayServerMonitoring?.missingPayloadCount ?? undefined,
    realtimeRelayServerQosContractMismatchCount:
      args.relayServerMonitoring?.qosContractMismatchCount ?? undefined,
    realtimeRelayServerHeartbeatContractMismatchCount:
      args.relayServerMonitoring?.heartbeatContractMismatchCount ?? undefined,
    realtimeRelayServerLastMissingPayloadAtMs:
      args.relayServerMonitoring?.lastMissingPayloadAtMs ?? undefined,
    realtimeRelayServerLastQosContractMismatchAtMs:
      args.relayServerMonitoring?.lastQosContractMismatchAtMs ?? undefined,
    realtimeRelayServerLastHeartbeatContractMismatchAtMs:
      args.relayServerMonitoring?.lastHeartbeatContractMismatchAtMs ?? undefined,
    liveSessionId: args.liveSessionId,
    interviewSessionId: args.activeSession?.interviewSessionId,
    voiceSessionId: args.activeSession?.voiceSessionId,
    sessionState: args.activeSession ? 'open' : 'idle',
    partialTranscript: args.partialTranscript || undefined,
    telemetry: args.telemetry || undefined,
  };
}

function normalizeMode(value: string | undefined): VoiceTransportMode {
  if (value === 'webrtc' || value === 'websocket' || value === 'chunked_fallback') {
    return value;
  }
  return 'websocket';
}

export function resolveVoiceTransportSelection(args: {
  configuredMode?: string;
  websocketUrl?: string;
  isWebRtcAvailable: boolean;
}): VoiceTransportSelection {
  const requestedMode = normalizeMode(args.configuredMode);
  const hasWebSocketUrl = Boolean(args.websocketUrl && args.websocketUrl.trim().length > 0);

  if (requestedMode === 'webrtc') {
    if (args.isWebRtcAvailable) {
      return {
        requestedMode,
        effectiveMode: 'webrtc',
      };
    }
    if (hasWebSocketUrl) {
      return {
        requestedMode,
        effectiveMode: 'websocket',
        fallbackReason: 'webrtc_unavailable',
      };
    }
    return {
      requestedMode,
      effectiveMode: 'chunked_fallback',
      fallbackReason: 'webrtc_unavailable',
    };
  }

  if (requestedMode === 'websocket') {
    if (hasWebSocketUrl) {
      return {
        requestedMode,
        effectiveMode: 'websocket',
      };
    }
    return {
      requestedMode,
      effectiveMode: 'chunked_fallback',
      fallbackReason: 'websocket_unavailable',
    };
  }

  return {
    requestedMode,
    effectiveMode: 'chunked_fallback',
  };
}

export function downgradeVoiceTransportSelection(args: {
  current: VoiceTransportSelection;
  websocketUrl?: string;
  reason:
    | 'webrtc_not_implemented'
    | 'websocket_connect_failed'
    | 'websocket_runtime_error'
    | 'websocket_closed';
}): VoiceTransportSelection {
  const hasWebSocketUrl = Boolean(args.websocketUrl && args.websocketUrl.trim().length > 0);

  if (args.current.effectiveMode === 'webrtc') {
    if (hasWebSocketUrl) {
      return {
        ...args.current,
        effectiveMode: 'websocket',
        fallbackReason: args.reason,
      };
    }
    return {
      ...args.current,
      effectiveMode: 'chunked_fallback',
      fallbackReason: args.reason,
    };
  }

  if (args.current.effectiveMode === 'websocket') {
    return {
      ...args.current,
      effectiveMode: 'chunked_fallback',
      fallbackReason: args.reason,
    };
  }

  return {
    ...args.current,
    effectiveMode: 'chunked_fallback',
    fallbackReason: args.current.fallbackReason ?? args.reason,
  };
}
