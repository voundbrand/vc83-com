import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { l4yercak3Client } from '../api/client';
import { ENV } from '../config/env';
import type { VoiceTransportSelection } from '../lib/voice/transport';
import {
  buildVideoFrameIngressEnvelope,
  resolveVideoTransportRuntimeSelection,
  shouldThrottleVideoCapture,
  type MediaSessionTransportFallbackReason,
  type VideoFrameIngressDecision,
} from '../lib/av/videoTransport';

type VideoSourceMode = 'iphone' | 'meta_glasses';

type VideoRuntimeSnapshot = {
  videoSessionId: string;
  packetSequence: number;
  sessionState: 'idle' | 'capturing' | 'throttled' | 'ingesting' | 'streaming' | 'degraded';
  mode: 'realtime' | 'buffered' | 'batch_replay';
  fallbackReason: MediaSessionTransportFallbackReason;
  fallbackTransitionCount: number;
  reconnectCount: number;
  acceptedFrames: number;
  droppedFrames: number;
  duplicateFrames: number;
  gapDetectedCount: number;
  rateLimitedCount: number;
  cadenceMs: number;
  lastCaptureAtMs?: number;
  lastIngressAtMs?: number;
  lastDecision?: VideoFrameIngressDecision;
  lastErrorCode?: string;
  lastErrorMessage?: string;
  retryAfterMs?: number;
  uplinkMode: 'http_bridge' | 'websocket_preferred';
  uplinkChannel: 'http_bridge' | 'websocket' | 'none';
  websocketConnected: boolean;
};

type UseMobileVideoRuntimeArgs = {
  conversationId?: string;
  liveSessionId?: string;
};

type IngestVideoFrameArgs = {
  sourceId: string;
  sourceProviderId: string;
  sourceMode: VideoSourceMode;
  voiceTransportSelection: VoiceTransportSelection;
  voiceRealtimeConnected: boolean;
  interviewSessionId?: string;
  frameRate?: number;
  width?: number;
  height?: number;
  mimeType?: string;
  framePayloadBase64?: string;
  policyRestricted: boolean;
  deviceAvailable: boolean;
};

type IngestVideoFrameResult = {
  accepted: boolean;
  throttled: boolean;
  decision?: VideoFrameIngressDecision;
  retryAfterMs?: number;
};

const VIDEO_SESSION_PREFIX = 'mobile_video';

function buildVideoSessionId(liveSessionId: string): string {
  return `${VIDEO_SESSION_PREFIX}_${liveSessionId}`;
}

export function useMobileVideoRuntime(args: UseMobileVideoRuntimeArgs) {
  const liveSessionIdRef = useRef(args.liveSessionId || `mobile_live_${Date.now().toString(36)}`);
  const packetSequenceRef = useRef(0);
  const lastCaptureAtMsRef = useRef<number | undefined>(undefined);
  const lastFallbackReasonRef = useRef<MediaSessionTransportFallbackReason>('none');
  const fallbackTransitionCountRef = useRef(0);
  const reconnectCountRef = useRef(0);
  const acceptedFramesRef = useRef(0);
  const droppedFramesRef = useRef(0);
  const duplicateFramesRef = useRef(0);
  const gapDetectedCountRef = useRef(0);
  const rateLimitedCountRef = useRef(0);
  const videoSocketRef = useRef<WebSocket | null>(null);
  const intentionalSocketCloseRef = useRef(false);
  const [isVideoWebsocketConnected, setIsVideoWebsocketConnected] = useState(false);
  const [runtimeSnapshot, setRuntimeSnapshot] = useState<VideoRuntimeSnapshot>(() => ({
    videoSessionId: buildVideoSessionId(liveSessionIdRef.current),
    packetSequence: 0,
    sessionState: 'idle',
    mode: 'buffered',
    fallbackReason: 'none',
    fallbackTransitionCount: 0,
    reconnectCount: 0,
    acceptedFrames: 0,
    droppedFrames: 0,
    duplicateFrames: 0,
    gapDetectedCount: 0,
    rateLimitedCount: 0,
    cadenceMs: Math.max(100, ENV.VIDEO_CAPTURE_CADENCE_MS),
    uplinkMode: ENV.VIDEO_TRANSPORT_MODE === 'websocket_preferred'
      ? 'websocket_preferred'
      : 'http_bridge',
    uplinkChannel: 'none',
    websocketConnected: false,
  }));

  const resolveUplinkMode = useCallback((): 'http_bridge' | 'websocket_preferred' => (
    ENV.VIDEO_TRANSPORT_MODE === 'websocket_preferred'
      ? 'websocket_preferred'
      : 'http_bridge'
  ), []);

  const closeVideoWebsocket = useCallback(() => {
    const socket = videoSocketRef.current;
    videoSocketRef.current = null;
    if (socket) {
      intentionalSocketCloseRef.current = true;
      socket.close();
    }
    setIsVideoWebsocketConnected(false);
  }, []);

  const ensureVideoWebsocket = useCallback(() => {
    if (
      resolveUplinkMode() !== 'websocket_preferred'
      || !ENV.VIDEO_WEBSOCKET_URL
      || !ENV.VIDEO_WEBSOCKET_URL.trim()
    ) {
      return null;
    }
    if (videoSocketRef.current && videoSocketRef.current.readyState !== WebSocket.CLOSED) {
      return videoSocketRef.current;
    }

    try {
      const socket = new WebSocket(ENV.VIDEO_WEBSOCKET_URL);
      intentionalSocketCloseRef.current = false;
      videoSocketRef.current = socket;
      socket.onopen = () => {
        setIsVideoWebsocketConnected(true);
      };
      socket.onclose = () => {
        videoSocketRef.current = null;
        setIsVideoWebsocketConnected(false);
      };
      socket.onerror = () => {
        if (!intentionalSocketCloseRef.current) {
          setIsVideoWebsocketConnected(false);
        }
      };
      return socket;
    } catch {
      setIsVideoWebsocketConnected(false);
      return null;
    }
  }, [resolveUplinkMode]);

  useEffect(() => () => {
    closeVideoWebsocket();
  }, [closeVideoWebsocket]);

  const resolveLiveSessionId = useCallback(() => {
    const normalized = typeof args.liveSessionId === 'string' ? args.liveSessionId.trim() : '';
    if (normalized) {
      if (liveSessionIdRef.current !== normalized) {
        liveSessionIdRef.current = normalized;
      }
      return normalized;
    }
    return liveSessionIdRef.current;
  }, [args.liveSessionId]);

  const ingestCapturedFrame = useCallback(async (
    frameArgs: IngestVideoFrameArgs
  ): Promise<IngestVideoFrameResult> => {
    const nowMs = Date.now();
    const liveSessionId = resolveLiveSessionId();
    const videoSessionId = buildVideoSessionId(liveSessionId);
    const uplinkMode = resolveUplinkMode();
    const cadenceCheck = shouldThrottleVideoCapture({
      nowMs,
      lastCaptureAtMs: lastCaptureAtMsRef.current,
      cadenceMs: ENV.VIDEO_CAPTURE_CADENCE_MS,
    });
    if (cadenceCheck.throttled) {
      droppedFramesRef.current += 1;
      setRuntimeSnapshot((previous) => ({
        ...previous,
        videoSessionId,
        sessionState: 'throttled',
        droppedFrames: droppedFramesRef.current,
        cadenceMs: cadenceCheck.cadenceMs,
        retryAfterMs: cadenceCheck.retryAfterMs,
        lastErrorCode: 'capture_cadence_throttled',
        mode: previous.mode,
        fallbackReason: 'capture_backpressure',
        uplinkMode,
        uplinkChannel: 'none',
        websocketConnected: isVideoWebsocketConnected,
      }));
      return {
        accepted: false,
        throttled: true,
        decision: undefined,
        retryAfterMs: cadenceCheck.retryAfterMs,
      };
    }

    const transport = resolveVideoTransportRuntimeSelection({
      voiceSelection: frameArgs.voiceTransportSelection,
      isVoiceRealtimeConnected: frameArgs.voiceRealtimeConnected,
      policyRestricted: frameArgs.policyRestricted,
      deviceAvailable: frameArgs.deviceAvailable,
    });
    if (lastFallbackReasonRef.current !== transport.fallbackReason) {
      fallbackTransitionCountRef.current += 1;
      lastFallbackReasonRef.current = transport.fallbackReason;
    }
    if (transport.fallbackReason === 'network_degraded') {
      reconnectCountRef.current += 1;
    }

    const packetSequence = packetSequenceRef.current;
    packetSequenceRef.current += 1;
    const envelope = buildVideoFrameIngressEnvelope({
      liveSessionId,
      sourceMode: frameArgs.sourceMode,
      sourceId: frameArgs.sourceId,
      sourceProviderId: frameArgs.sourceProviderId,
      videoSessionId,
      packetSequence,
      frameTimestampMs: nowMs,
      captureTimestampMs: nowMs,
      mimeType: frameArgs.mimeType,
      frameRate: frameArgs.frameRate,
      width: frameArgs.width,
      height: frameArgs.height,
      transportRuntime: transport,
      reconnectCount: reconnectCountRef.current,
      fallbackTransitionCount: fallbackTransitionCountRef.current,
      requestedProviderId: frameArgs.voiceTransportSelection.requestedMode,
      captureLatencyMs: 0,
      framePayloadBase64: frameArgs.framePayloadBase64,
    });

    if (!envelope.videoRuntime.framePayloadBase64?.trim()) {
      droppedFramesRef.current += 1;
      setRuntimeSnapshot((previous) => ({
        ...previous,
        videoSessionId,
        sessionState: 'degraded',
        mode: transport.mode,
        fallbackReason: transport.fallbackReason,
        packetSequence,
        droppedFrames: droppedFramesRef.current,
        fallbackTransitionCount: fallbackTransitionCountRef.current,
        reconnectCount: reconnectCountRef.current,
        lastDecision: previous.lastDecision,
        lastErrorCode: 'video_frame_payload_missing',
        lastErrorMessage:
          'Missing frame payload bytes for realtime ingest envelope.',
        uplinkMode,
        uplinkChannel: 'none',
        websocketConnected: isVideoWebsocketConnected,
      }));
      return {
        accepted: false,
        throttled: false,
      };
    }

    setRuntimeSnapshot((previous) => ({
      ...previous,
      videoSessionId,
      sessionState: 'ingesting',
      packetSequence,
      mode: transport.mode,
      fallbackReason: transport.fallbackReason,
      fallbackTransitionCount: fallbackTransitionCountRef.current,
      reconnectCount: reconnectCountRef.current,
      cadenceMs: cadenceCheck.cadenceMs,
      retryAfterMs: undefined,
      lastErrorCode: undefined,
      lastErrorMessage: undefined,
      lastCaptureAtMs: nowMs,
      uplinkMode,
      uplinkChannel: 'none',
      websocketConnected: isVideoWebsocketConnected,
    }));

    const websocket = ensureVideoWebsocket();
    const canUseWebsocketUplink = Boolean(
      uplinkMode === 'websocket_preferred'
      && websocket
      && websocket.readyState === WebSocket.OPEN
    );
    if (canUseWebsocketUplink && websocket) {
      try {
        websocket.send(
          JSON.stringify({
            type: 'video_frame_ingress',
            conversationId: args.conversationId,
            interviewSessionId: frameArgs.interviewSessionId,
            mediaSessionEnvelope: envelope,
            maxFramesPerWindow: ENV.VIDEO_MAX_FRAMES_PER_WINDOW,
            windowMs: ENV.VIDEO_FRAME_WINDOW_MS,
          }),
        );
        acceptedFramesRef.current += 1;
        lastCaptureAtMsRef.current = nowMs;
        setRuntimeSnapshot((previous) => ({
          ...previous,
          videoSessionId,
          sessionState: 'streaming',
          packetSequence,
          mode: transport.mode,
          fallbackReason: transport.fallbackReason,
          acceptedFrames: acceptedFramesRef.current,
          droppedFrames: droppedFramesRef.current,
          fallbackTransitionCount: fallbackTransitionCountRef.current,
          reconnectCount: reconnectCountRef.current,
          lastDecision: 'accepted',
          lastIngressAtMs: nowMs,
          lastCaptureAtMs: lastCaptureAtMsRef.current,
          retryAfterMs: undefined,
          lastErrorCode: undefined,
          lastErrorMessage: undefined,
          uplinkMode,
          uplinkChannel: 'websocket',
          websocketConnected: true,
        }));
        return {
          accepted: true,
          throttled: false,
          decision: 'accepted',
        };
      } catch {
        // Fall through to HTTP bridge path below.
      }
    }

    try {
      const result = await l4yercak3Client.ai.voice.ingestVideoFrame({
        conversationId: args.conversationId,
        interviewSessionId: frameArgs.interviewSessionId,
        mediaSessionEnvelope: envelope as Record<string, unknown>,
        maxFramesPerWindow: ENV.VIDEO_MAX_FRAMES_PER_WINDOW,
        windowMs: ENV.VIDEO_FRAME_WINDOW_MS,
      });
      const decision = result.ordering?.decision as VideoFrameIngressDecision | undefined;
      if (decision === 'accepted') {
        acceptedFramesRef.current += 1;
      } else if (decision === 'duplicate_replay') {
        duplicateFramesRef.current += 1;
      } else if (decision === 'gap_detected') {
        gapDetectedCountRef.current += 1;
      } else if (decision === 'rate_limited') {
        rateLimitedCountRef.current += 1;
      }
      if (decision === 'accepted' || decision === 'duplicate_replay') {
        lastCaptureAtMsRef.current = nowMs;
      } else {
        droppedFramesRef.current += 1;
      }
      setRuntimeSnapshot((previous) => ({
        ...previous,
        videoSessionId,
        sessionState: decision === 'rate_limited' || decision === 'gap_detected' ? 'degraded' : 'streaming',
        mode: transport.mode,
        fallbackReason: transport.fallbackReason,
        packetSequence,
        acceptedFrames: acceptedFramesRef.current,
        duplicateFrames: duplicateFramesRef.current,
        gapDetectedCount: gapDetectedCountRef.current,
        rateLimitedCount: rateLimitedCountRef.current,
        droppedFrames: droppedFramesRef.current,
        fallbackTransitionCount: fallbackTransitionCountRef.current,
        reconnectCount: reconnectCountRef.current,
        lastDecision: decision,
        lastIngressAtMs: nowMs,
        lastCaptureAtMs: lastCaptureAtMsRef.current,
        retryAfterMs: result.rateControl?.retryAfterMs,
        lastErrorCode:
          decision === 'gap_detected'
            ? 'video_frame_sequence_gap'
            : decision === 'rate_limited'
              ? 'video_frame_rate_limited'
              : undefined,
        lastErrorMessage: undefined,
        uplinkMode,
        uplinkChannel: 'http_bridge',
        websocketConnected: isVideoWebsocketConnected,
      }));
      return {
        accepted: decision === 'accepted' || decision === 'duplicate_replay',
        throttled: false,
        decision,
        retryAfterMs: result.rateControl?.retryAfterMs,
      };
    } catch (error) {
      droppedFramesRef.current += 1;
      const message = error instanceof Error ? error.message : String(error);
      setRuntimeSnapshot((previous) => ({
        ...previous,
        sessionState: 'degraded',
        droppedFrames: droppedFramesRef.current,
        mode: transport.mode,
        fallbackReason: transport.fallbackReason,
        packetSequence,
        lastDecision: previous.lastDecision,
        lastErrorCode: 'video_frame_ingest_failed',
        lastErrorMessage: message,
        uplinkMode,
        uplinkChannel: 'http_bridge',
        websocketConnected: isVideoWebsocketConnected,
      }));
      return {
        accepted: false,
        throttled: false,
      };
    }
  }, [
    args.conversationId,
    ensureVideoWebsocket,
    isVideoWebsocketConnected,
    resolveLiveSessionId,
    resolveUplinkMode,
  ]);

  const resetSession = useCallback((nextLiveSessionIdArg?: string) => {
    const explicitLiveSessionId =
      typeof nextLiveSessionIdArg === 'string' ? nextLiveSessionIdArg.trim() : '';
    const nextLiveSessionId = explicitLiveSessionId || resolveLiveSessionId();
    if (explicitLiveSessionId) {
      liveSessionIdRef.current = explicitLiveSessionId;
    }
    const nextVideoSessionId = buildVideoSessionId(nextLiveSessionId);
    packetSequenceRef.current = 0;
    lastCaptureAtMsRef.current = undefined;
    lastFallbackReasonRef.current = 'none';
    fallbackTransitionCountRef.current = 0;
    reconnectCountRef.current = 0;
    acceptedFramesRef.current = 0;
    droppedFramesRef.current = 0;
    duplicateFramesRef.current = 0;
    gapDetectedCountRef.current = 0;
    rateLimitedCountRef.current = 0;
    closeVideoWebsocket();
    setIsVideoWebsocketConnected(false);
    setRuntimeSnapshot({
      videoSessionId: nextVideoSessionId,
      packetSequence: 0,
      sessionState: 'idle',
      mode: 'buffered',
      fallbackReason: 'none',
      fallbackTransitionCount: 0,
      reconnectCount: 0,
      acceptedFrames: 0,
      droppedFrames: 0,
      duplicateFrames: 0,
      gapDetectedCount: 0,
      rateLimitedCount: 0,
      cadenceMs: Math.max(100, ENV.VIDEO_CAPTURE_CADENCE_MS),
      uplinkMode: resolveUplinkMode(),
      uplinkChannel: 'none',
      websocketConnected: false,
    });
  }, [closeVideoWebsocket, resolveLiveSessionId, resolveUplinkMode]);

  const transportRuntime = useMemo(() => ({
    videoSessionId: runtimeSnapshot.videoSessionId,
    sessionState: runtimeSnapshot.sessionState,
    packetSequence: runtimeSnapshot.packetSequence,
    mode: runtimeSnapshot.mode,
    fallbackReason: runtimeSnapshot.fallbackReason,
    fallbackTransitionCount: runtimeSnapshot.fallbackTransitionCount,
    reconnectCount: runtimeSnapshot.reconnectCount,
    acceptedFrames: runtimeSnapshot.acceptedFrames,
    droppedFrames: runtimeSnapshot.droppedFrames,
    duplicateFrames: runtimeSnapshot.duplicateFrames,
    gapDetectedCount: runtimeSnapshot.gapDetectedCount,
    rateLimitedCount: runtimeSnapshot.rateLimitedCount,
    cadenceMs: runtimeSnapshot.cadenceMs,
    lastIngressAtMs: runtimeSnapshot.lastIngressAtMs,
    lastCaptureAtMs: runtimeSnapshot.lastCaptureAtMs,
    lastDecision: runtimeSnapshot.lastDecision,
    lastErrorCode: runtimeSnapshot.lastErrorCode,
    lastErrorMessage: runtimeSnapshot.lastErrorMessage,
    retryAfterMs: runtimeSnapshot.retryAfterMs,
    uplinkMode: runtimeSnapshot.uplinkMode,
    uplinkChannel: runtimeSnapshot.uplinkChannel,
    websocketConnected: runtimeSnapshot.websocketConnected,
  }), [runtimeSnapshot]);

  return {
    ingestCapturedFrame,
    resetSession,
    runtimeSnapshot,
    transportRuntime,
  };
}
