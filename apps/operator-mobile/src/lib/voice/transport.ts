export type VoiceTransportMode = 'webrtc' | 'websocket' | 'chunked_fallback';
export type EffectiveVoiceTransportMode = VoiceTransportMode;
export type VoiceTransportFallbackReason =
  | 'webrtc_unavailable'
  | 'webrtc_not_implemented'
  | 'websocket_unavailable'
  | 'websocket_connect_failed'
  | 'websocket_runtime_error'
  | 'websocket_closed';

export type VoiceTransportSelection = {
  requestedMode: VoiceTransportMode;
  effectiveMode: EffectiveVoiceTransportMode;
  fallbackReason?: VoiceTransportFallbackReason;
};

export type VoiceTransportRuntimeSession = {
  interviewSessionId?: string;
  voiceSessionId?: string;
};

export function buildVoiceTransportRuntime(args: {
  selection: VoiceTransportSelection;
  liveSessionId?: string;
  activeSession?: VoiceTransportRuntimeSession | null;
  isRealtimeConnected: boolean;
  partialTranscript?: string;
  telemetry?: Record<string, unknown>;
}): Record<string, unknown> {
  return {
    mode: args.selection.effectiveMode,
    transport: args.selection.effectiveMode,
    requestedTransport: args.selection.requestedMode,
    fallbackReason: args.selection.fallbackReason || 'none',
    transportFallbackReason: args.selection.fallbackReason || 'none',
    realtimeConnected: args.isRealtimeConnected,
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
  return 'chunked_fallback';
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
