import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import * as Speech from 'expo-speech';

import { ENV } from '../config/env';
import { l4yercak3Client } from '../api/client';
import {
  buildVoiceTransportRuntime,
  consumeMobileVoiceWebsocketReconnectBudget,
  createMobileVoiceWebsocketReconnectBudgetState,
  downgradeVoiceTransportSelection,
  resolveGatewayReadyPolicyCompatibility,
  resolveVoiceTransportSelection,
  resolveVoiceTransportDegradationState,
  type MobileVoiceWebsocketReconnectBudgetState,
  type VoiceTransportDegradationState,
  type VoiceTransportSelection,
} from '../lib/voice/transport';
import {
  buildVoiceAudioFrameEnvelope,
  createDeterministicFrameQueue,
  mergeTranscriptFrame,
  resolveFrameStreamingPolicy,
} from '../lib/voice/frameStreaming';
import { sanitizeTranscriptForVoiceTurn } from '../lib/voice/transcriptGuard';
import { buildSignedMobileSourceAttestation } from '../lib/av/source-attestation';
import {
  MOBILE_VOICE_STRUCTURED_TELEMETRY_WINDOW_HOURS,
  MOBILE_VOICE_TRANSCRIBE_MIN_FINAL_FRAME_BYTES,
  MOBILE_VOICE_TRANSCRIBE_MIN_FINAL_FRAME_DURATION_MS,
  MOBILE_VOICE_TRANSCRIBE_MIN_FRAME_BYTES,
  MOBILE_VOICE_TRANSCRIBE_MIN_FRAME_DURATION_MS,
} from '../lib/voice/runtimePolicy';
import {
  isVoiceCompatibleWithLanguage,
  normalizeVoiceLanguageCode,
} from '../lib/voice/catalogLanguage';
import {
  evaluateMobileRealtimeRelayHealth,
  type MobileRealtimeRelayHealth,
  type MobileRealtimeRelayServerQosSnapshot,
} from '../lib/voice/realtimeHealth';

type VoiceProviderId = 'browser' | 'elevenlabs';
type ResolvedVoiceIdSource =
  | 'requested_voice_id'
  | 'env_expo_public'
  | 'catalog_selected'
  | 'catalog_language_match'
  | 'catalog_first_voice';

type UseMobileVoiceRuntimeArgs = {
  conversationId?: string;
  liveSessionId?: string;
  requestedVoiceId?: string;
  requestedProviderId?: VoiceProviderId;
  language?: string;
  sourceMode?: 'iphone' | 'meta_glasses';
  sourceRuntime?: {
    sourceId?: string;
    sourceClass?: string;
    providerId?: string;
    sourceScope?: Record<string, unknown>;
  };
  avObservability?: Record<string, unknown>;
  attestationProofToken?: string;
};

type ActiveVoiceSession = {
  conversationId?: string;
  interviewSessionId: string;
  voiceSessionId: string;
  providerId: VoiceProviderId;
};

type TranscribeArgs = {
  uri: string;
  mimeType?: string;
  language?: string;
  onPartial?: (text: string) => void;
};

type StreamFrameArgs = {
  uri: string;
  mimeType?: string;
  language?: string;
  frameDurationMs?: number;
  sequence: number;
  isFinal?: boolean;
  onPartial?: (text: string) => void;
};

type StreamFrameIngestResult = {
  sequence: number;
  relayEventCount: number;
  finalTranscriptText?: string;
  orchestration?: {
    shouldTriggerAssistantTurn: boolean;
    interrupted: boolean;
    reason: string;
    status?: 'triggered' | 'suppressed' | 'failed';
    assistantText?: string;
  };
};

type EncodedAudioPayload = {
  base64Payload: string;
  byteLength: number;
  headerHex: string;
  hasHeaderInspection: boolean;
  hasMp4FtypHeader: boolean;
};

type FrameTranscriptionGateDecision = {
  shouldTranscribe: boolean;
  reason?: string;
  minBytes: number;
  minDurationMs: number;
  durationGateBypassed?: boolean;
};

const MOBILE_VOICE_RELAY_SERVER_MONITORING_CONTRACT_VERSION =
  'mobile_voice_relay_server_monitoring_v1' as const;

type MobileVoiceRelayServerMonitoringSnapshot = {
  monitoringContractVersion: typeof MOBILE_VOICE_RELAY_SERVER_MONITORING_CONTRACT_VERSION;
  missingPayloadCount: number;
  qosContractMismatchCount: number;
  heartbeatContractMismatchCount: number;
  heartbeatSequenceGapCount: number;
  heartbeatStallTimeoutCount: number;
  lastMissingPayloadAtMs?: number;
  lastQosContractMismatchAtMs?: number;
  lastHeartbeatContractMismatchAtMs?: number;
  lastHeartbeatSequenceGapAtMs?: number;
  lastHeartbeatStallTimeoutAtMs?: number;
};

function buildInitialRelayServerMonitoringSnapshot(): MobileVoiceRelayServerMonitoringSnapshot {
  return {
    monitoringContractVersion: MOBILE_VOICE_RELAY_SERVER_MONITORING_CONTRACT_VERSION,
    missingPayloadCount: 0,
    qosContractMismatchCount: 0,
    heartbeatContractMismatchCount: 0,
    heartbeatSequenceGapCount: 0,
    heartbeatStallTimeoutCount: 0,
  };
}

function isLikelyBackendConversationId(value: string | null | undefined): value is string {
  if (typeof value !== 'string') {
    return false;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }
  return !/^\d+$/.test(trimmed);
}

function emitVoiceTelemetry(event: string, details?: Record<string, unknown>) {
  console.info('[VoiceTelemetry]', {
    event,
    timestampMs: Date.now(),
    telemetryWindowHours: MOBILE_VOICE_STRUCTURED_TELEMETRY_WINDOW_HOURS,
    ...(details || {}),
  });
}

function normalizeTranscriptionMimeType(value: string | undefined): string {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (!normalized) {
    return 'audio/webm';
  }
  const canonical = normalized.split(';', 1)[0]?.trim() ?? normalized;
  if (canonical === 'audio/m4a' || canonical === 'audio/x-m4a') {
    return 'audio/mp4';
  }
  return canonical;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('');
}

function hasMp4FtypHeader(bytes: Uint8Array): boolean {
  if (bytes.length < 8) {
    return false;
  }
  return (
    bytes[4] === 0x66 // f
    && bytes[5] === 0x74 // t
    && bytes[6] === 0x79 // y
    && bytes[7] === 0x70 // p
  );
}

async function blobToBase64Payload(blob: Blob): Promise<string> {
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const base64Payload = result.includes(',') ? result.split(',', 2)[1] || '' : result;
      if (!base64Payload) {
        reject(new Error('Failed to encode audio payload.'));
        return;
      }
      resolve(base64Payload);
    };
    reader.onerror = () => reject(new Error('Failed to read local audio payload.'));
    reader.readAsDataURL(blob);
  });
}

async function readEncodedAudioPayload(uri: string): Promise<EncodedAudioPayload> {
  const response = await fetch(uri);
  const blob = await response.blob();
  const byteLength = typeof blob.size === 'number' ? Math.max(0, Math.floor(blob.size)) : 0;
  let headerBytes = new Uint8Array(0);
  let hasHeaderInspection = false;
  try {
    const buffer = await blob.slice(0, 16).arrayBuffer();
    headerBytes = new Uint8Array(buffer);
    hasHeaderInspection = true;
  } catch {
    headerBytes = new Uint8Array(0);
  }

  return {
    base64Payload: await blobToBase64Payload(blob),
    byteLength,
    headerHex: bytesToHex(headerBytes),
    hasHeaderInspection,
    hasMp4FtypHeader: hasMp4FtypHeader(headerBytes),
  };
}

function evaluateFrameTranscriptionGate(args: {
  frameArgs: StreamFrameArgs;
  mimeType: string;
  estimatedAudioBytes: number;
  hasHeaderInspection: boolean;
  hasMp4FtypHeader: boolean;
}): FrameTranscriptionGateDecision {
  const isFinalFrame = Boolean(args.frameArgs.isFinal);
  const minBytes = isFinalFrame
    ? MOBILE_VOICE_TRANSCRIBE_MIN_FINAL_FRAME_BYTES
    : MOBILE_VOICE_TRANSCRIBE_MIN_FRAME_BYTES;
  const minDurationMs = isFinalFrame
    ? MOBILE_VOICE_TRANSCRIBE_MIN_FINAL_FRAME_DURATION_MS
    : MOBILE_VOICE_TRANSCRIBE_MIN_FRAME_DURATION_MS;
  const frameDurationMs = Number.isFinite(args.frameArgs.frameDurationMs)
    ? Math.max(0, Math.floor(args.frameArgs.frameDurationMs || 0))
    : 0;

  if (args.estimatedAudioBytes < minBytes) {
    return {
      shouldTranscribe: false,
      reason: 'frame_bytes_below_threshold',
      minBytes,
      minDurationMs,
    };
  }
  if (frameDurationMs > 0 && frameDurationMs < minDurationMs) {
    // iOS HAL occasionally reports short final frame durations despite large payload bytes.
    // Keep the final transcription attempt when payload size indicates substantial audio.
    const canBypassFinalDurationGate = isFinalFrame
      && args.estimatedAudioBytes >= Math.max(minBytes * 4, 32_000);
    if (canBypassFinalDurationGate) {
      return {
        shouldTranscribe: true,
        minBytes,
        minDurationMs,
        durationGateBypassed: true,
      };
    }
    return {
      shouldTranscribe: false,
      reason: 'frame_duration_below_threshold',
      minBytes,
      minDurationMs,
    };
  }
  if (
    args.hasHeaderInspection
    && (args.mimeType === 'audio/mp4' || args.mimeType === 'audio/m4a')
    && !args.hasMp4FtypHeader
  ) {
    return {
      shouldTranscribe: false,
      reason: 'invalid_mp4_container_header',
      minBytes,
      minDurationMs,
    };
  }

  return {
    shouldTranscribe: true,
    minBytes,
    minDurationMs,
  };
}

function supportsWebRtc(): boolean {
  return typeof globalThis !== 'undefined' && typeof (globalThis as { RTCPeerConnection?: unknown }).RTCPeerConnection === 'function';
}

function normalizeOptionalToken(value: string | undefined): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function parseOpenSessionRetryAfterMs(error: unknown): number | null {
  if (!(error instanceof Error)) {
    return null;
  }
  const { message } = error;
  if (!message) {
    return null;
  }
  if (message.startsWith('voice_session_open_rate_limited:')) {
    const parsed = Number(message.split(':', 2)[1] ?? '0');
    if (Number.isFinite(parsed) && parsed > 0) {
      return Math.max(250, Math.floor(parsed));
    }
    return null;
  }
  const match = message.match(/retry after (\d+)ms/i);
  if (!match) {
    return null;
  }
  const parsed = Number(match[1]);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return Math.max(250, Math.floor(parsed));
}

function normalizeGatewayHttpBaseFromWebsocketUrl(websocketUrl: string): string | undefined {
  try {
    const parsed = new URL(websocketUrl);
    parsed.protocol = parsed.protocol === 'wss:' ? 'https:' : 'http:';
    parsed.pathname = '';
    parsed.search = '';
    parsed.hash = '';
    return parsed.toString().replace(/\/+$/, '');
  } catch {
    return undefined;
  }
}

function appendWebsocketTicket(websocketUrl: string, ticket: string): string {
  const parsed = new URL(websocketUrl);
  parsed.searchParams.set('ticket', ticket);
  return parsed.toString();
}

function estimateBase64ByteLength(base64Payload: string): number {
  const sanitized = base64Payload.replace(/\s+/g, '');
  if (!sanitized) {
    return 0;
  }
  const paddingChars = sanitized.endsWith('==')
    ? 2
    : sanitized.endsWith('=')
      ? 1
      : 0;
  return Math.max(0, Math.floor((sanitized.length * 3) / 4) - paddingChars);
}

function parseServerRelayQosSnapshot(
  value: unknown
): MobileRealtimeRelayServerQosSnapshot | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }
  const parsed = value as {
    contractVersion?: unknown;
    observedAtMs?: unknown;
    healthy?: unknown;
    reasonCode?: unknown;
    heartbeat?: {
      contractVersion?: unknown;
      status?: unknown;
      expectedSequence?: unknown;
      ackSequence?: unknown;
      acknowledgedAtMs?: unknown;
    };
    qos?: {
      orderingDecision?: unknown;
      relayEventCount?: unknown;
      idempotentReplay?: unknown;
      persistedFinalTranscript?: unknown;
    };
  };
  const heartbeatStatus = parsed.heartbeat?.status;
  if (heartbeatStatus !== 'acknowledged' && heartbeatStatus !== 'missing') {
    return undefined;
  }
  const observedAtMs = Number(parsed.observedAtMs);
  const expectedSequence = Number(parsed.heartbeat?.expectedSequence);
  if (
    !Number.isFinite(observedAtMs)
    || observedAtMs < 0
    || !Number.isFinite(expectedSequence)
    || expectedSequence < 0
  ) {
    return undefined;
  }
  const ackSequence = Number(parsed.heartbeat?.ackSequence);
  const acknowledgedAtMs = Number(parsed.heartbeat?.acknowledgedAtMs);
  const relayEventCount = Number(parsed.qos?.relayEventCount);
  return {
    contractVersion:
      typeof parsed.contractVersion === 'string' && parsed.contractVersion.trim().length > 0
        ? parsed.contractVersion.trim()
        : 'missing',
    observedAtMs: Math.floor(observedAtMs),
    healthy: parsed.healthy === true,
    reasonCode:
      typeof parsed.reasonCode === 'string' && parsed.reasonCode.trim().length > 0
        ? parsed.reasonCode.trim()
        : 'relay_unknown',
    heartbeat: {
      contractVersion:
        typeof parsed.heartbeat?.contractVersion === 'string'
          ? parsed.heartbeat.contractVersion.trim()
          : undefined,
      status: heartbeatStatus,
      expectedSequence: Math.max(0, Math.floor(expectedSequence)),
      ackSequence:
        Number.isFinite(ackSequence) && ackSequence >= 0
          ? Math.floor(ackSequence)
          : undefined,
      acknowledgedAtMs:
        Number.isFinite(acknowledgedAtMs) && acknowledgedAtMs >= 0
          ? Math.floor(acknowledgedAtMs)
          : undefined,
    },
    qos: {
      orderingDecision:
        typeof parsed.qos?.orderingDecision === 'string'
          ? parsed.qos.orderingDecision
          : undefined,
      relayEventCount:
        Number.isFinite(relayEventCount) && relayEventCount >= 0
          ? Math.floor(relayEventCount)
          : undefined,
      idempotentReplay: parsed.qos?.idempotentReplay === true,
      persistedFinalTranscript: parsed.qos?.persistedFinalTranscript === true,
    },
  };
}

const MOBILE_VOICE_REALTIME_RELAY_ACK_STALE_MS = 2_500;
const MOBILE_VOICE_REALTIME_RELAY_ACK_GRACE_MS = 3_000;
const MOBILE_VOICE_REALTIME_RELAY_MAX_CONSECUTIVE_FAILURES = 2;
const MOBILE_VOICE_REALTIME_SERVER_QOS_GRACE_MS = 3_500;
const MOBILE_VOICE_REALTIME_SERVER_HEARTBEAT_STALE_MS = 5_000;
const MOBILE_VOICE_REALTIME_SERVER_HEARTBEAT_SEQUENCE_GAP_TOLERANCE = 0;
const MOBILE_VOICE_REALTIME_SERVER_HEARTBEAT_STALL_TIMEOUT_MS = 7_500;

function isNoTranscriptTextMessage(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes('no transcript text') ||
    normalized.includes('transcription returned no')
  );
}

function isRecoverableFrameTranscriptionMessage(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    isNoTranscriptTextMessage(message) ||
    (normalized.includes('elevenlabs transcription failed') && normalized.includes('(400'))
  );
}

function isAbortRequestError(error: unknown): boolean {
  if (!error) {
    return false;
  }
  if (error instanceof DOMException && error.name === 'AbortError') {
    return true;
  }
  if (!(error instanceof Error)) {
    return false;
  }
  const normalizedMessage = error.message.trim().toLowerCase();
  return normalizedMessage.includes('abort');
}

function disposeAudioPlayer(player: ReturnType<typeof createAudioPlayer> | null) {
  if (!player) {
    return;
  }
  try {
    player.pause();
  } catch {
    // Ignore stop errors during interruption.
  }
  try {
    if (typeof (player as { remove?: () => void }).remove === 'function') {
      (player as { remove: () => void }).remove();
      return;
    }
  } catch {
    // Ignore remove errors.
  }
  try {
    const legacyRelease = (player as { release?: () => void }).release;
    if (typeof legacyRelease === 'function') {
      legacyRelease.call(player);
    }
  } catch {
    // Ignore legacy release errors.
  }
}

async function setPlaybackAudioMode() {
  try {
    await setAudioModeAsync({
      allowsRecording: false,
      playsInSilentMode: true,
      interruptionMode: 'doNotMix',
      interruptionModeAndroid: 'doNotMix',
      shouldRouteThroughEarpiece: false,
    });
  } catch {
    // Continue with playback best effort.
  }
}

async function speakWithSystemFallbackVoice(text: string) {
  const fallbackText = text.trim();
  if (!fallbackText) {
    return;
  }
  await setPlaybackAudioMode();
  Speech.stop();
  await new Promise<void>((resolve) => {
    let settled = false;
    const finalize = () => {
      if (settled) {
        return;
      }
      settled = true;
      resolve();
    };
    Speech.speak(fallbackText, {
      volume: 1,
      onDone: finalize,
      onStopped: finalize,
      onError: finalize,
    });
  });
}

async function waitForAudioPlayerCompletion(
  player: ReturnType<typeof createAudioPlayer>,
) {
  await new Promise<void>((resolve) => {
    let settled = false;
    let sawPlayback = false;
    let statusSubscription: { remove?: () => void } | null = null;
    let pollHandle: ReturnType<typeof setInterval> | null = null;
    let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
    const finalize = () => {
      if (settled) {
        return;
      }
      settled = true;
      if (statusSubscription?.remove) {
        try {
          statusSubscription.remove();
        } catch {
          // Ignore listener cleanup errors.
        }
      }
      if (pollHandle) {
        clearInterval(pollHandle);
      }
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }
      resolve();
    };

    timeoutHandle = setTimeout(finalize, 45_000);

    try {
      statusSubscription = (
        player as unknown as {
          addListener?: (
            event: 'playbackStatusUpdate',
            listener: (status: {
              playing?: boolean;
              didJustFinish?: boolean;
            }) => void,
          ) => { remove?: () => void };
        }
      ).addListener?.('playbackStatusUpdate', (status) => {
        if (status.playing) {
          sawPlayback = true;
        }
        if (status.didJustFinish || (sawPlayback && status.playing === false)) {
          finalize();
        }
      }) ?? null;
    } catch {
      statusSubscription = null;
    }

    if (!statusSubscription) {
      pollHandle = setInterval(() => {
        const isPlaying = Boolean(
          (player as unknown as { playing?: boolean }).playing,
        );
        if (isPlaying) {
          sawPlayback = true;
        }
        if (sawPlayback && !isPlaying) {
          finalize();
        }
      }, 120);
    }

    try {
      player.play();
    } catch {
      finalize();
    }
  });
}

export function useMobileVoiceRuntime(args: UseMobileVoiceRuntimeArgs) {
  const configuredVoiceWebsocketUrl = normalizeOptionalToken(ENV.VOICE_WEBSOCKET_URL);
  const configuredVoiceWebsocketTicketUrl = normalizeOptionalToken(
    ENV.VOICE_WEBSOCKET_TICKET_URL
  );
  const initialRequestedVoiceId = normalizeOptionalToken(args.requestedVoiceId);
  const initialEnvVoiceId = normalizeOptionalToken(ENV.ELEVENLABS_VOICE_ID);
  const normalizedRequestedVoiceId = normalizeOptionalToken(args.requestedVoiceId);
  const normalizedConfiguredLanguage =
    normalizeVoiceLanguageCode(args.language) || undefined;
  const [transportSelection, setTransportSelection] = useState<VoiceTransportSelection>(() =>
    resolveVoiceTransportSelection({
      configuredMode: ENV.VOICE_TRANSPORT_MODE,
      websocketUrl: configuredVoiceWebsocketUrl,
      isWebRtcAvailable: supportsWebRtc(),
    })
  );
  const [partialTranscript, setPartialTranscript] = useState('');
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const [realtimeRelayHealth, setRealtimeRelayHealth] = useState<MobileRealtimeRelayHealth>(() =>
    evaluateMobileRealtimeRelayHealth({
      isSocketConnected: false,
    })
  );
  const [isSessionOpening, setIsSessionOpening] = useState(false);
  const [lastSessionErrorReason, setLastSessionErrorReason] = useState<string | undefined>(undefined);
  const activeSessionRef = useRef<ActiveVoiceSession | null>(null);
  const websocketRef = useRef<WebSocket | null>(null);
  const websocketReconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const websocketReconnectBudgetRef = useRef<MobileVoiceWebsocketReconnectBudgetState>(
    createMobileVoiceWebsocketReconnectBudgetState()
  );
  const playbackRef = useRef<ReturnType<typeof createAudioPlayer> | null>(null);
  const synthAbortControllerRef = useRef<AbortController | null>(null);
  const intentionalSocketCloseRef = useRef(false);
  const frameIngestQueueRef = useRef<((frameArgs: StreamFrameArgs) => Promise<StreamFrameIngestResult>) | null>(null);
  const transcriptFramesRef = useRef<Map<number, string>>(new Map());
  const transcriptIngestSequenceRef = useRef(0);
  const partialTranscriptRef = useRef('');
  const lastRealtimeIngestAttemptAtMsRef = useRef<number | undefined>(undefined);
  const lastRealtimeIngestAckAtMsRef = useRef<number | undefined>(undefined);
  const consecutiveRealtimeIngestFailuresRef = useRef(0);
  const relayHeartbeatSequenceGapToleranceRef = useRef(
    MOBILE_VOICE_REALTIME_SERVER_HEARTBEAT_SEQUENCE_GAP_TOLERANCE
  );
  const relayHeartbeatStallTimeoutMsRef = useRef(
    MOBILE_VOICE_REALTIME_SERVER_HEARTBEAT_STALL_TIMEOUT_MS
  );
  const latestServerRelayQosRef = useRef<MobileRealtimeRelayServerQosSnapshot | undefined>(
    undefined
  );
  const lastRelayHealthReasonCodeRef = useRef<string | undefined>(undefined);
  const relayServerMonitoringRef = useRef<MobileVoiceRelayServerMonitoringSnapshot>(
    buildInitialRelayServerMonitoringSnapshot()
  );
  const [relayServerMonitoring, setRelayServerMonitoring] = useState<
    MobileVoiceRelayServerMonitoringSnapshot
  >(() => buildInitialRelayServerMonitoringSnapshot());
  const resolvedRequestedVoiceIdRef = useRef<string | undefined>(
    initialRequestedVoiceId ?? initialEnvVoiceId
  );
  const resolvedRequestedVoiceSourceRef = useRef<ResolvedVoiceIdSource | undefined>(
    initialRequestedVoiceId
      ? 'requested_voice_id'
      : initialEnvVoiceId
        ? 'env_expo_public'
        : undefined
  );
  const voiceCatalogLookupPromiseRef = useRef<Promise<string | undefined> | null>(
    null
  );
  const requestedVoiceIdRef = useRef<string | undefined>(normalizedRequestedVoiceId);
  const resolvedRequestedVoiceLanguageRef = useRef<string | undefined>(
    normalizedConfiguredLanguage
  );
  const sessionOpenPromiseRef = useRef<Promise<ActiveVoiceSession> | null>(null);
  const sessionOpenCooldownUntilRef = useRef(0);
  const sessionOpenAttestationProofRef = useRef<{
    token: string;
    expiresAt: number;
    liveSessionId: string;
    sourceId: string;
    sourceClass: string;
    providerId: string;
  } | null>(null);

  useEffect(() => {
    if (requestedVoiceIdRef.current === normalizedRequestedVoiceId) {
      return;
    }
    const previousRequestedVoiceId = requestedVoiceIdRef.current;
    requestedVoiceIdRef.current = normalizedRequestedVoiceId;
    if (normalizedRequestedVoiceId) {
      resolvedRequestedVoiceIdRef.current = normalizedRequestedVoiceId;
      resolvedRequestedVoiceSourceRef.current = 'requested_voice_id';
      voiceCatalogLookupPromiseRef.current = null;
      return;
    }
    if (previousRequestedVoiceId) {
      resolvedRequestedVoiceIdRef.current = undefined;
      resolvedRequestedVoiceSourceRef.current = undefined;
      voiceCatalogLookupPromiseRef.current = null;
    }
  }, [normalizedRequestedVoiceId]);

  useEffect(() => {
    if (resolvedRequestedVoiceLanguageRef.current === normalizedConfiguredLanguage) {
      return;
    }
    const previousLanguage = resolvedRequestedVoiceLanguageRef.current;
    resolvedRequestedVoiceLanguageRef.current = normalizedConfiguredLanguage;
    if (normalizedRequestedVoiceId) {
      return;
    }
    resolvedRequestedVoiceIdRef.current = undefined;
    resolvedRequestedVoiceSourceRef.current = undefined;
    voiceCatalogLookupPromiseRef.current = null;
    console.info('[VoiceRuntime] invalidate_cached_voice_on_language_change', {
      previousLanguage: previousLanguage || null,
      nextLanguage: normalizedConfiguredLanguage || null,
    });
  }, [normalizedConfiguredLanguage, normalizedRequestedVoiceId]);

  const captureRealtimeRelayHealth = useCallback((overrideSocketConnected?: boolean) => {
    const snapshot = evaluateMobileRealtimeRelayHealth({
      isSocketConnected:
        typeof overrideSocketConnected === 'boolean'
          ? overrideSocketConnected
          : isRealtimeConnected,
      lastIngestAttemptAtMs: lastRealtimeIngestAttemptAtMsRef.current,
      lastIngestAckAtMs: lastRealtimeIngestAckAtMsRef.current,
      consecutiveIngestFailures: consecutiveRealtimeIngestFailuresRef.current,
      ackStaleMs: MOBILE_VOICE_REALTIME_RELAY_ACK_STALE_MS,
      ingestAckGraceMs: MOBILE_VOICE_REALTIME_RELAY_ACK_GRACE_MS,
      maxConsecutiveFailures: MOBILE_VOICE_REALTIME_RELAY_MAX_CONSECUTIVE_FAILURES,
      serverRelayQos: latestServerRelayQosRef.current,
      serverQosGraceMs: MOBILE_VOICE_REALTIME_SERVER_QOS_GRACE_MS,
      serverHeartbeatStaleMs: MOBILE_VOICE_REALTIME_SERVER_HEARTBEAT_STALE_MS,
      serverHeartbeatSequenceGapTolerance:
        relayHeartbeatSequenceGapToleranceRef.current,
      serverHeartbeatStallTimeoutMs: relayHeartbeatStallTimeoutMsRef.current,
    });
    const previousReasonCode = lastRelayHealthReasonCodeRef.current;
    const transitionedReasonCode = previousReasonCode !== snapshot.reasonCode;
    if (transitionedReasonCode) {
      lastRelayHealthReasonCodeRef.current = snapshot.reasonCode;
      let monitoringChanged = false;
      const nextMonitoring = { ...relayServerMonitoringRef.current };
      if (snapshot.reasonCode === 'relay_server_qos_missing') {
        nextMonitoring.missingPayloadCount += 1;
        nextMonitoring.lastMissingPayloadAtMs = snapshot.evaluatedAtMs;
        monitoringChanged = true;
      } else if (snapshot.reasonCode === 'relay_server_qos_contract_mismatch') {
        nextMonitoring.qosContractMismatchCount += 1;
        nextMonitoring.lastQosContractMismatchAtMs = snapshot.evaluatedAtMs;
        monitoringChanged = true;
      } else if (snapshot.reasonCode === 'relay_server_heartbeat_contract_mismatch') {
        nextMonitoring.heartbeatContractMismatchCount += 1;
        nextMonitoring.lastHeartbeatContractMismatchAtMs = snapshot.evaluatedAtMs;
        monitoringChanged = true;
      } else if (snapshot.reasonCode === 'relay_server_heartbeat_sequence_gap') {
        nextMonitoring.heartbeatSequenceGapCount += 1;
        nextMonitoring.lastHeartbeatSequenceGapAtMs = snapshot.evaluatedAtMs;
        monitoringChanged = true;
      } else if (snapshot.reasonCode === 'relay_server_heartbeat_stall_timeout') {
        nextMonitoring.heartbeatStallTimeoutCount += 1;
        nextMonitoring.lastHeartbeatStallTimeoutAtMs = snapshot.evaluatedAtMs;
        monitoringChanged = true;
      }
      if (monitoringChanged) {
        relayServerMonitoringRef.current = nextMonitoring;
        setRelayServerMonitoring(nextMonitoring);
        emitVoiceTelemetry('relay_server_contract_monitoring_checkpoint', {
          reasonCode: snapshot.reasonCode,
          serverRelayReasonCode: snapshot.serverRelayReasonCode,
          serverRelayContractVersionStatus: snapshot.serverRelayContractVersionStatus,
          serverRelayHeartbeatContractVersionStatus:
            snapshot.serverRelayHeartbeatContractVersionStatus,
          missingPayloadCount: nextMonitoring.missingPayloadCount,
          qosContractMismatchCount: nextMonitoring.qosContractMismatchCount,
          heartbeatContractMismatchCount:
            nextMonitoring.heartbeatContractMismatchCount,
          heartbeatSequenceGapCount: nextMonitoring.heartbeatSequenceGapCount,
          heartbeatStallTimeoutCount: nextMonitoring.heartbeatStallTimeoutCount,
          heartbeatSequenceGap: snapshot.serverRelayHeartbeatSequenceGap,
          heartbeatAckAgeMs: snapshot.serverRelayHeartbeatAckAgeMs,
        });
      }
    }
    setRealtimeRelayHealth(snapshot);
    return snapshot;
  }, [isRealtimeConnected]);

  const captureServerRelayQosFromIngestResult = useCallback((
    relayPayload: unknown,
    overrideSocketConnected?: boolean
  ) => {
    latestServerRelayQosRef.current = parseServerRelayQosSnapshot(relayPayload);
    return captureRealtimeRelayHealth(overrideSocketConnected);
  }, [captureRealtimeRelayHealth]);

  const resetRelayHeartbeatPolicyThresholds = useCallback(() => {
    relayHeartbeatSequenceGapToleranceRef.current =
      MOBILE_VOICE_REALTIME_SERVER_HEARTBEAT_SEQUENCE_GAP_TOLERANCE;
    relayHeartbeatStallTimeoutMsRef.current =
      MOBILE_VOICE_REALTIME_SERVER_HEARTBEAT_STALL_TIMEOUT_MS;
  }, []);

  const clearWebsocketReconnectTimer = useCallback(() => {
    const reconnectTimer = websocketReconnectTimerRef.current;
    if (!reconnectTimer) {
      return;
    }
    clearTimeout(reconnectTimer);
    websocketReconnectTimerRef.current = null;
  }, []);

  const resetWebsocketReconnectBudget = useCallback(() => {
    websocketReconnectBudgetRef.current = createMobileVoiceWebsocketReconnectBudgetState();
    clearWebsocketReconnectTimer();
  }, [clearWebsocketReconnectTimer]);

  const applyTransportDowngrade = useCallback(
    (
      reason:
        | 'webrtc_not_implemented'
        | 'websocket_connect_failed'
        | 'websocket_runtime_error'
        | 'websocket_closed'
    ) => {
      resetWebsocketReconnectBudget();
      resetRelayHeartbeatPolicyThresholds();
      setTransportSelection((previous) =>
        downgradeVoiceTransportSelection({
          current: previous,
          websocketUrl: configuredVoiceWebsocketUrl,
          reason,
        })
      );
      setIsRealtimeConnected(false);
      captureRealtimeRelayHealth(false);
    },
    [
      captureRealtimeRelayHealth,
      configuredVoiceWebsocketUrl,
      resetRelayHeartbeatPolicyThresholds,
      resetWebsocketReconnectBudget,
    ]
  );

  const resolveRealtimeWebsocketConnectUrl = useCallback(async (
    session: ActiveVoiceSession
  ): Promise<string | undefined> => {
    if (!configuredVoiceWebsocketUrl) {
      return undefined;
    }
    const hasAuth = l4yercak3Client.hasAuth();
    if (!hasAuth) {
      return configuredVoiceWebsocketUrl;
    }
    const ticketEndpoint = configuredVoiceWebsocketTicketUrl
      || (() => {
        const gatewayHttpBase = normalizeGatewayHttpBaseFromWebsocketUrl(
          configuredVoiceWebsocketUrl
        );
        return gatewayHttpBase ? `${gatewayHttpBase}/v1/ws-ticket` : undefined;
      })();
    if (!ticketEndpoint) {
      return configuredVoiceWebsocketUrl;
    }
    try {
      const response = await fetch(ticketEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...l4yercak3Client.getAuthHeaders(),
        },
        body: JSON.stringify({
          conversationId: session.conversationId,
          interviewSessionId: session.interviewSessionId,
          voiceSessionId: session.voiceSessionId,
        }),
      });
      const payload = (await response.json()) as {
        success?: boolean;
        ticket?: string;
        error?: string;
      };
      if (!response.ok || !payload?.success || typeof payload.ticket !== 'string') {
        emitVoiceTelemetry('realtime_ws_ticket_issue_failed', {
          status: response.status,
          error: payload?.error || 'ticket_issue_failed',
        });
        return configuredVoiceWebsocketUrl;
      }
      emitVoiceTelemetry('realtime_ws_ticket_issue_ok', {
        ttlMode: 'short_lived',
      });
      return appendWebsocketTicket(configuredVoiceWebsocketUrl, payload.ticket);
    } catch (error) {
      emitVoiceTelemetry('realtime_ws_ticket_issue_error', {
        error: error instanceof Error ? error.message : String(error),
      });
      return configuredVoiceWebsocketUrl;
    }
  }, [
    configuredVoiceWebsocketTicketUrl,
    configuredVoiceWebsocketUrl,
  ]);

  const connectWebsocket = useCallback(async (session: ActiveVoiceSession) => {
    const resolvedWebsocketUrl = await resolveRealtimeWebsocketConnectUrl(session);
    const baseSelection = resolveVoiceTransportSelection({
      configuredMode: ENV.VOICE_TRANSPORT_MODE,
      websocketUrl: resolvedWebsocketUrl,
      isWebRtcAvailable: supportsWebRtc(),
    });
    const selection =
      baseSelection.effectiveMode === 'webrtc'
        ? downgradeVoiceTransportSelection({
            current: baseSelection,
            websocketUrl: resolvedWebsocketUrl,
            reason: 'webrtc_not_implemented',
          })
        : baseSelection;
    setTransportSelection(selection);

    if (selection.effectiveMode !== 'websocket' || !resolvedWebsocketUrl) {
      return;
    }

    let disconnectHandled = false;
    const handleSocketFailure = (
      reason: 'websocket_connect_failed' | 'websocket_runtime_error' | 'websocket_closed',
      failClosed: boolean = false
    ) => {
      if (disconnectHandled) {
        return;
      }
      disconnectHandled = true;
      websocketRef.current = null;
      setIsRealtimeConnected(false);
      captureRealtimeRelayHealth(false);

      if (failClosed) {
        applyTransportDowngrade(reason);
        return;
      }
      if (intentionalSocketCloseRef.current) {
        return;
      }

      const activeSession = activeSessionRef.current;
      if (!activeSession || activeSession.voiceSessionId !== session.voiceSessionId) {
        return;
      }
      const reconnectDecision = consumeMobileVoiceWebsocketReconnectBudget({
        state: websocketReconnectBudgetRef.current,
      });
      if (!reconnectDecision.shouldRetry) {
        emitVoiceTelemetry('realtime_ws_reconnect_budget_exhausted', {
          voiceSessionId: session.voiceSessionId,
          reasonCode: reason,
          attemptsUsed: websocketReconnectBudgetRef.current.attemptsUsed,
          consumedBackoffMs: websocketReconnectBudgetRef.current.consumedBackoffMs,
          budgetRemainingMs: reconnectDecision.budgetRemainingMs,
        });
        applyTransportDowngrade(reason);
        return;
      }
      websocketReconnectBudgetRef.current = reconnectDecision.nextState;
      emitVoiceTelemetry('realtime_ws_reconnect_scheduled', {
        voiceSessionId: session.voiceSessionId,
        reasonCode: reason,
        attemptNumber: reconnectDecision.attemptNumber,
        retryDelayMs: reconnectDecision.retryDelayMs,
        budgetRemainingMs: reconnectDecision.budgetRemainingMs,
      });
      clearWebsocketReconnectTimer();
      websocketReconnectTimerRef.current = setTimeout(() => {
        websocketReconnectTimerRef.current = null;
        const latestActiveSession = activeSessionRef.current;
        if (!latestActiveSession || latestActiveSession.voiceSessionId !== session.voiceSessionId) {
          return;
        }
        if (intentionalSocketCloseRef.current) {
          return;
        }
        void connectWebsocket(session);
      }, reconnectDecision.retryDelayMs);
    };

    try {
      const socket = new WebSocket(resolvedWebsocketUrl);
      const connectionHandshake = {
        policyAccepted: false,
        sessionOpenSent: false,
      };
      intentionalSocketCloseRef.current = false;
      websocketRef.current = socket;
      socket.onopen = () => {
        consecutiveRealtimeIngestFailuresRef.current = 0;
        setIsRealtimeConnected(false);
        captureRealtimeRelayHealth(false);
      };
      socket.onclose = () => {
        handleSocketFailure('websocket_closed');
      };
      socket.onerror = () => {
        handleSocketFailure('websocket_runtime_error');
      };
      socket.onmessage = (event) => {
        try {
          const rawData = typeof event.data === 'string' ? event.data : String(event.data ?? '');
          const payload = JSON.parse(rawData) as {
            type?: string;
            partialTranscript?: string;
            eventType?: string;
            transcriptText?: string;
            policy?: unknown;
          };

          if (!connectionHandshake.policyAccepted) {
            if (payload.type !== 'gateway_ready') {
              emitVoiceTelemetry('realtime_ws_gateway_policy_missing', {
                messageType: payload.type || 'unknown',
              });
              intentionalSocketCloseRef.current = true;
              socket.close(1008, 'gateway_policy_missing');
              handleSocketFailure('websocket_closed', true);
              return;
            }
            const compatibility = resolveGatewayReadyPolicyCompatibility({
              policy: payload.policy,
            });
            if (!compatibility.compatible) {
              emitVoiceTelemetry('realtime_ws_gateway_policy_incompatible', {
                reasonCode: compatibility.reasonCode,
              });
              intentionalSocketCloseRef.current = true;
              socket.close(1008, 'gateway_policy_incompatible');
              handleSocketFailure('websocket_closed', true);
              return;
            }
            connectionHandshake.policyAccepted = true;
            relayHeartbeatSequenceGapToleranceRef.current =
              Number.isFinite(compatibility.policy.heartbeat.sequenceGapTolerance)
                ? Math.max(
                    0,
                    Math.floor(
                      compatibility.policy.heartbeat.sequenceGapTolerance || 0
                    )
                  )
                : MOBILE_VOICE_REALTIME_SERVER_HEARTBEAT_SEQUENCE_GAP_TOLERANCE;
            relayHeartbeatStallTimeoutMsRef.current =
              Number.isFinite(compatibility.policy.heartbeat.stallTimeoutMs)
                ? Math.max(
                    250,
                    Math.floor(compatibility.policy.heartbeat.stallTimeoutMs || 0)
                  )
                : Math.max(
                    MOBILE_VOICE_REALTIME_SERVER_HEARTBEAT_STALL_TIMEOUT_MS,
                    compatibility.policy.heartbeat.cadenceMs * 3
                  );
            resetWebsocketReconnectBudget();
            setIsRealtimeConnected(true);
            captureRealtimeRelayHealth(true);
            emitVoiceTelemetry('realtime_ws_gateway_policy_compatible', {
              policyVersion: compatibility.policy.version,
              maxPayloadBytes: compatibility.policy.maxPayloadBytes,
              maxBufferedBytes: compatibility.policy.maxBufferedBytes,
              heartbeatCadenceMs: compatibility.policy.heartbeat.cadenceMs,
              heartbeatContractVersion:
                compatibility.policy.heartbeat.contractVersion,
              heartbeatSequenceGapTolerance:
                relayHeartbeatSequenceGapToleranceRef.current,
              heartbeatStallTimeoutMs:
                relayHeartbeatStallTimeoutMsRef.current,
            });
            if (!connectionHandshake.sessionOpenSent) {
              socket.send(
                JSON.stringify({
                  type: 'voice_session_open',
                  voiceSessionId: session.voiceSessionId,
                  interviewSessionId: session.interviewSessionId,
                  conversationId: session.conversationId,
                })
              );
              connectionHandshake.sessionOpenSent = true;
            }
            return;
          }

          if (payload.type === 'gateway_ready') {
            return;
          }
          if (payload.type === 'partial_transcript' && typeof payload.partialTranscript === 'string') {
            setPartialTranscript(payload.partialTranscript);
            partialTranscriptRef.current = payload.partialTranscript;
            lastRealtimeIngestAckAtMsRef.current = Date.now();
            consecutiveRealtimeIngestFailuresRef.current = 0;
            captureRealtimeRelayHealth(true);
            return;
          }
          if (payload.eventType === 'partial_transcript' && typeof payload.transcriptText === 'string') {
            setPartialTranscript(payload.transcriptText);
            partialTranscriptRef.current = payload.transcriptText;
            lastRealtimeIngestAckAtMsRef.current = Date.now();
            consecutiveRealtimeIngestFailuresRef.current = 0;
            captureRealtimeRelayHealth(true);
          }
        } catch {
          // Ignore malformed transport payloads.
        }
      };
    } catch (error) {
      console.warn('Voice websocket setup failed:', error);
      handleSocketFailure('websocket_connect_failed');
    }
  }, [
    applyTransportDowngrade,
    captureRealtimeRelayHealth,
    clearWebsocketReconnectTimer,
    resetWebsocketReconnectBudget,
    resolveRealtimeWebsocketConnectUrl,
  ]);

  const disconnectRealtime = useCallback(() => {
    resetWebsocketReconnectBudget();
    resetRelayHeartbeatPolicyThresholds();
    const socket = websocketRef.current;
    websocketRef.current = null;
    if (socket) {
      intentionalSocketCloseRef.current = true;
      socket.close();
    }
    setIsRealtimeConnected(false);
    captureRealtimeRelayHealth(false);
  }, [
    captureRealtimeRelayHealth,
    resetRelayHeartbeatPolicyThresholds,
    resetWebsocketReconnectBudget,
  ]);

  useEffect(() => {
    captureRealtimeRelayHealth();
  }, [captureRealtimeRelayHealth]);

  useEffect(() => {
    return () => {
      clearWebsocketReconnectTimer();
    };
  }, [clearWebsocketReconnectTimer]);

  const abortInFlightSynthesizeRequest = useCallback((reason: string) => {
    const controller = synthAbortControllerRef.current;
    if (!controller) {
      return false;
    }
    synthAbortControllerRef.current = null;
    if (!controller.signal.aborted) {
      controller.abort();
      emitVoiceTelemetry('tts_synthesize_request_aborted', { reason });
      return true;
    }
    return false;
  }, []);

  const stopPlayback = useCallback(async () => {
    abortInFlightSynthesizeRequest('stop_playback');
    Speech.stop();
    const player = playbackRef.current;
    playbackRef.current = null;
    disposeAudioPlayer(player);
  }, [abortInFlightSynthesizeRequest]);

  const resolveRequestedVoiceId = useCallback(async (): Promise<string | undefined> => {
    const commitResolvedVoiceId = (
      voiceId: string,
      source: ResolvedVoiceIdSource
    ): string => {
      const changed =
        resolvedRequestedVoiceIdRef.current !== voiceId
        || resolvedRequestedVoiceSourceRef.current !== source;
      resolvedRequestedVoiceIdRef.current = voiceId;
      resolvedRequestedVoiceSourceRef.current = source;
      if (changed) {
        console.info('[VoiceRuntime] resolved_elevenlabs_voice_id', {
          source,
          voiceId,
        });
      }
      return voiceId;
    };

    const explicitVoiceId = normalizedRequestedVoiceId;
    if (explicitVoiceId) {
      return commitResolvedVoiceId(explicitVoiceId, 'requested_voice_id');
    }

    if (resolvedRequestedVoiceSourceRef.current === 'requested_voice_id') {
      resolvedRequestedVoiceIdRef.current = undefined;
      resolvedRequestedVoiceSourceRef.current = undefined;
    }

    if (resolvedRequestedVoiceIdRef.current) {
      return resolvedRequestedVoiceIdRef.current;
    }

    const envVoiceId = normalizeOptionalToken(ENV.ELEVENLABS_VOICE_ID);
    if (envVoiceId) {
      return commitResolvedVoiceId(envVoiceId, 'env_expo_public');
    }

    if (!l4yercak3Client.hasAuth()) {
      return undefined;
    }

    if (voiceCatalogLookupPromiseRef.current) {
      return await voiceCatalogLookupPromiseRef.current;
    }

    const lookupPromise = (async () => {
      try {
        const catalog = await l4yercak3Client.ai.voice.listCatalog();
        const configuredLanguage = normalizedConfiguredLanguage;
        const preferenceLanguage = normalizeVoiceLanguageCode(
          catalog.selectedLanguage ?? undefined
        );
        const effectiveLanguage = configuredLanguage || preferenceLanguage || undefined;
        const selectedVoiceId = normalizeOptionalToken(catalog.selectedVoiceId ?? undefined);
        const voices = Array.isArray(catalog.voices) ? catalog.voices : [];
        const selectedVoice =
          selectedVoiceId
            ? voices.find((voice) => normalizeOptionalToken(voice?.id) === selectedVoiceId) || null
            : null;
        const selectedVoiceMatchesLanguage = Boolean(
          selectedVoice && isVoiceCompatibleWithLanguage(selectedVoice, effectiveLanguage)
        );
        const languageMatchedVoiceId = voices
          .map((voice) => ({
            voiceId: normalizeOptionalToken(voice?.id),
            voice,
          }))
          .find(
            (entry): entry is { voiceId: string; voice: (typeof voices)[number] } =>
              Boolean(entry.voiceId)
              && isVoiceCompatibleWithLanguage(entry.voice, effectiveLanguage)
          )?.voiceId;
        const firstVoiceId = voices
          .map((voice) => normalizeOptionalToken(voice?.id))
          .find((voiceId): voiceId is string => Boolean(voiceId));
        console.info('[VoiceRuntime] voice_catalog_snapshot', {
          provider: catalog.provider,
          providerStatus: catalog.providerStatus,
          configuredLanguage: configuredLanguage || null,
          preferenceLanguage: preferenceLanguage || null,
          effectiveLanguage: effectiveLanguage || null,
          selectedVoiceId: selectedVoiceId || null,
          selectedVoiceMatchesLanguage,
          voicesCount: voices.length,
          languageMatchedVoiceId: languageMatchedVoiceId || null,
          firstVoiceId: firstVoiceId || null,
          warning: catalog.warning || null,
        });
        const resolved = selectedVoiceMatchesLanguage
          ? selectedVoiceId
          : languageMatchedVoiceId || firstVoiceId;
        if (resolved) {
          return commitResolvedVoiceId(
            resolved,
            selectedVoiceMatchesLanguage
              ? 'catalog_selected'
              : languageMatchedVoiceId
                ? 'catalog_language_match'
                : 'catalog_first_voice'
          );
        }
        console.warn('[VoiceRuntime] resolve_elevenlabs_voice_id_empty_catalog', {
          configuredLanguage: configuredLanguage || null,
          preferenceLanguage: preferenceLanguage || null,
          effectiveLanguage: effectiveLanguage || null,
          selectedVoiceId: selectedVoiceId || null,
          voicesCount: voices.length,
          warning: catalog.warning || null,
        });
      } catch (error) {
        console.warn('[VoiceRuntime] resolve_elevenlabs_voice_id_failed', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
      return undefined;
    })();

    voiceCatalogLookupPromiseRef.current = lookupPromise;
    try {
      return await lookupPromise;
    } finally {
      if (voiceCatalogLookupPromiseRef.current === lookupPromise) {
        voiceCatalogLookupPromiseRef.current = null;
      }
    }
  }, [normalizedConfiguredLanguage, normalizedRequestedVoiceId]);

  const openSession = useCallback(async () => {
    const existing = activeSessionRef.current;
    if (existing) {
      return existing;
    }
    const now = Date.now();
    if (sessionOpenCooldownUntilRef.current > now) {
      const retryAfterMs = sessionOpenCooldownUntilRef.current - now;
      throw new Error(
        `voice_session_open_rate_limited:${Math.max(0, Math.floor(retryAfterMs))}`
      );
    }
    if (sessionOpenPromiseRef.current) {
      return await sessionOpenPromiseRef.current;
    }

    const openPromise = (async (): Promise<ActiveVoiceSession> => {
      setIsSessionOpening(true);
      setLastSessionErrorReason(undefined);

      const backendConversationId = isLikelyBackendConversationId(args.conversationId)
        ? args.conversationId
        : undefined;
      const liveSessionId = normalizeOptionalToken(args.liveSessionId);
      const sourceId = normalizeOptionalToken(args.sourceRuntime?.sourceId);
      const sourceClass = normalizeOptionalToken(args.sourceRuntime?.sourceClass);
      const providerId = normalizeOptionalToken(args.sourceRuntime?.providerId);
      const sourceAttestation =
        liveSessionId && sourceId && sourceClass && providerId
          ? buildSignedMobileSourceAttestation({
              secret: ENV.AV_ATTESTATION_SECRET,
              liveSessionId,
              sourceId,
              sourceClass,
              providerId,
            })
          : undefined;
      let attestationProofToken = normalizeOptionalToken(args.attestationProofToken);
      const requestedVoiceId = await resolveRequestedVoiceId();
      console.info('[VoiceRuntime] mobile_open_session_outbound_request', {
        requestedProviderId: args.requestedProviderId,
        requestedVoiceId: requestedVoiceId || null,
        requestedVoiceSource:
          requestedVoiceId
            ? (resolvedRequestedVoiceSourceRef.current || 'unknown')
            : 'backend_resolution',
        configuredLanguage: normalizedConfiguredLanguage || null,
      });
      if (!attestationProofToken && liveSessionId && sourceId && sourceClass && providerId) {
        const cachedProof = sessionOpenAttestationProofRef.current;
        const proofStillValid = Boolean(
          cachedProof
            && cachedProof.expiresAt > Date.now() + 5_000
            && cachedProof.liveSessionId === liveSessionId
            && cachedProof.sourceId === sourceId
            && cachedProof.sourceClass === sourceClass
            && cachedProof.providerId === providerId
        );
        if (proofStillValid && cachedProof) {
          attestationProofToken = cachedProof.token;
        } else {
          const resolved = await l4yercak3Client.ai.voice.resolveSession({
            conversationId: backendConversationId,
            liveSessionId,
            sourceMode: args.sourceMode,
            voiceRuntime: {
              sourceId,
              sourceClass,
              providerId,
              sourceMode: args.sourceMode,
              sourceScope: args.sourceRuntime?.sourceScope,
              liveSessionId,
              sourceAttestation,
            },
          });
          const issuedToken = normalizeOptionalToken(
            resolved.sessionOpenAttestationProof?.token
          );
          const expiresAt =
            typeof resolved.sessionOpenAttestationProof?.expiresAt === 'number'
              ? resolved.sessionOpenAttestationProof.expiresAt
              : 0;
          if (!issuedToken || expiresAt <= Date.now()) {
            throw new Error('Failed to issue voice session attestation proof token.');
          }
          sessionOpenAttestationProofRef.current = {
            token: issuedToken,
            expiresAt,
            liveSessionId,
            sourceId,
            sourceClass,
            providerId,
          };
          attestationProofToken = issuedToken;
        }
      }
      try {
        const opened = await l4yercak3Client.ai.voice.openSession({
          conversationId: backendConversationId,
          requestedProviderId: args.requestedProviderId,
          requestedVoiceId,
          liveSessionId,
          sourceMode: args.sourceMode,
          voiceRuntime: {
            sourceId,
            sourceClass,
            providerId,
            sourceMode: args.sourceMode,
            sourceScope: args.sourceRuntime?.sourceScope,
            liveSessionId,
            sourceAttestation,
          },
          transportRuntime: {
            transport: transportSelection.effectiveMode,
            requestedTransport: transportSelection.requestedMode,
            sourceMode: args.sourceMode,
            liveSessionId,
          },
          avObservability: {
            ingressSurface: 'operator_mobile_voice_mode',
            sourceMode: args.sourceMode,
            liveSessionId,
            ...(args.avObservability || {}),
          },
          attestationProofToken,
        });
        if (!opened.success) {
          throw new Error(opened.error || 'Failed to open voice session.');
        }

        const nextSession: ActiveVoiceSession = {
          conversationId: opened.conversationId || backendConversationId,
          interviewSessionId: opened.interviewSessionId,
          voiceSessionId: opened.voiceSessionId,
          providerId: opened.providerId,
        };
        sessionOpenCooldownUntilRef.current = 0;
        transcriptIngestSequenceRef.current = 0;
        lastRealtimeIngestAttemptAtMsRef.current = undefined;
        lastRealtimeIngestAckAtMsRef.current = undefined;
        consecutiveRealtimeIngestFailuresRef.current = 0;
        latestServerRelayQosRef.current = undefined;
        captureRealtimeRelayHealth(false);
        resetWebsocketReconnectBudget();
        resetRelayHeartbeatPolicyThresholds();
        activeSessionRef.current = nextSession;
        void connectWebsocket(nextSession);
        return nextSession;
      } catch (error) {
        const retryAfterMs = parseOpenSessionRetryAfterMs(error);
        if (retryAfterMs) {
          sessionOpenCooldownUntilRef.current = Date.now() + retryAfterMs;
        }
        const errorReason = error instanceof Error ? error.message : 'voice_runtime_open_session_failed';
        setLastSessionErrorReason(errorReason);
        throw error;
      } finally {
        setIsSessionOpening(false);
      }
    })();

    sessionOpenPromiseRef.current = openPromise;
    try {
      return await openPromise;
    } finally {
      if (sessionOpenPromiseRef.current === openPromise) {
        sessionOpenPromiseRef.current = null;
      }
    }
  }, [
    args.attestationProofToken,
    args.avObservability,
    args.conversationId,
    args.liveSessionId,
    args.requestedProviderId,
    args.requestedVoiceId,
    args.sourceMode,
    args.sourceRuntime?.providerId,
    args.sourceRuntime?.sourceClass,
    args.sourceRuntime?.sourceId,
    args.sourceRuntime?.sourceScope,
    captureRealtimeRelayHealth,
    connectWebsocket,
    resetRelayHeartbeatPolicyThresholds,
    resetWebsocketReconnectBudget,
    resolveRequestedVoiceId,
    transportSelection.effectiveMode,
    transportSelection.requestedMode,
  ]);

  const closeSession = useCallback(async (reason?: string) => {
    const active = activeSessionRef.current;
    const resolvedReason = reason || 'voice_mode_close';
    console.info('[VoiceRuntime] close_session_requested', {
      reason: resolvedReason,
      hasActiveSession: Boolean(active),
      conversationId: active?.conversationId,
      interviewSessionId: active?.interviewSessionId,
      voiceSessionId: active?.voiceSessionId,
    });
    activeSessionRef.current = null;
    disconnectRealtime();
    setPartialTranscript('');
    partialTranscriptRef.current = '';
    transcriptFramesRef.current.clear();
    transcriptIngestSequenceRef.current = 0;
    lastRealtimeIngestAttemptAtMsRef.current = undefined;
    lastRealtimeIngestAckAtMsRef.current = undefined;
    consecutiveRealtimeIngestFailuresRef.current = 0;
    latestServerRelayQosRef.current = undefined;
    captureRealtimeRelayHealth(false);
    await stopPlayback();
    try {
      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
      });
    } catch {
      // Best-effort session teardown for playback routing reset.
    }
    if (!active) {
      return;
    }
    try {
      await l4yercak3Client.ai.voice.closeSession({
        conversationId: active.conversationId,
        interviewSessionId: active.interviewSessionId,
        voiceSessionId: active.voiceSessionId,
        activeProviderId: active.providerId,
        reason: resolvedReason,
      });
      console.info('[VoiceRuntime] close_session_ok', {
        reason: resolvedReason,
        conversationId: active.conversationId,
        interviewSessionId: active.interviewSessionId,
        voiceSessionId: active.voiceSessionId,
      });
    } catch (error) {
      console.warn('[VoiceRuntime] close_session_failed', {
        reason: resolvedReason,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }, [captureRealtimeRelayHealth, disconnectRealtime, stopPlayback]);

  const transcribeRecording = useCallback(async (transcribeArgs: TranscribeArgs) => {
    const active = await openSession();
    const requestedVoiceId = await resolveRequestedVoiceId();
    setPartialTranscript('Listening...');
    partialTranscriptRef.current = 'Listening...';
    transcribeArgs.onPartial?.('Listening...');

    const transcriptionMimeType = normalizeTranscriptionMimeType(
      transcribeArgs.mimeType || 'audio/m4a'
    );
    const encodedPayload = await readEncodedAudioPayload(transcribeArgs.uri);
    const estimatedAudioBytes = encodedPayload.byteLength > 0
      ? encodedPayload.byteLength
      : estimateBase64ByteLength(encodedPayload.base64Payload);
    if (estimatedAudioBytes < MOBILE_VOICE_TRANSCRIBE_MIN_FINAL_FRAME_BYTES) {
      emitVoiceTelemetry('recording_transcription_rejected', {
        reason: 'frame_bytes_below_threshold',
        bytes: estimatedAudioBytes,
        minBytes: MOBILE_VOICE_TRANSCRIBE_MIN_FINAL_FRAME_BYTES,
        mimeType: transcriptionMimeType,
      });
      throw new Error('Voice recording too short to transcribe reliably.');
    }
    if (
      transcriptionMimeType === 'audio/mp4'
      && encodedPayload.hasHeaderInspection
      && !encodedPayload.hasMp4FtypHeader
    ) {
      emitVoiceTelemetry('recording_transcription_rejected', {
        reason: 'invalid_mp4_container_header',
        bytes: estimatedAudioBytes,
        mimeType: transcriptionMimeType,
        headerHex: encodedPayload.headerHex,
      });
      throw new Error('Voice recording container is invalid. Please retry.');
    }
    emitVoiceTelemetry('recording_transcription_ready', {
      voiceSessionId: active.voiceSessionId,
      bytes: estimatedAudioBytes,
      mimeType: transcriptionMimeType,
    });
    const audioBase64 = encodedPayload.base64Payload;

    if (
      transportSelection.effectiveMode === 'websocket' &&
      websocketRef.current &&
      websocketRef.current.readyState === WebSocket.OPEN
    ) {
      websocketRef.current.send(
        JSON.stringify({
          type: 'audio_chunk',
          voiceSessionId: active.voiceSessionId,
          interviewSessionId: active.interviewSessionId,
          mimeType: transcribeArgs.mimeType || 'audio/m4a',
          audioBase64,
        })
      );
      setPartialTranscript('Processing...');
      partialTranscriptRef.current = 'Processing...';
      transcribeArgs.onPartial?.('Processing...');
    }

    const transcribeResult = await l4yercak3Client.ai.voice.transcribe({
      conversationId: active.conversationId,
      interviewSessionId: active.interviewSessionId,
      voiceSessionId: active.voiceSessionId,
      audioBase64,
      mimeType: transcribeArgs.mimeType || 'audio/m4a',
      requestedProviderId: args.requestedProviderId,
      requestedVoiceId,
      language: transcribeArgs.language,
    });

    if (!transcribeResult.success || !transcribeResult.text) {
      throw new Error(transcribeResult.error || 'Voice transcription failed.');
    }

    setPartialTranscript(transcribeResult.text);
    partialTranscriptRef.current = transcribeResult.text;
    transcribeArgs.onPartial?.(transcribeResult.text);

    return {
      text: transcribeResult.text,
      session: active,
      providerId: transcribeResult.providerId,
      nativeBridge: transcribeResult.nativeBridge,
      health: transcribeResult.health,
    };
  }, [args.requestedProviderId, openSession, resolveRequestedVoiceId, transportSelection.effectiveMode]);

  const ingestStreamingFrame = useCallback(async (frameArgs: StreamFrameArgs): Promise<StreamFrameIngestResult> => {
    if (!frameIngestQueueRef.current) {
      frameIngestQueueRef.current = createDeterministicFrameQueue<StreamFrameArgs, StreamFrameIngestResult>(async (queueFrameArgs) => {
        if (queueFrameArgs.sequence === 0) {
          transcriptFramesRef.current.clear();
          setPartialTranscript('');
          partialTranscriptRef.current = '';
          emitVoiceTelemetry('utterance_boundary_started', {
            sequence: queueFrameArgs.sequence,
          });
        }
        const active = await openSession();
        const encodedPayload = await readEncodedAudioPayload(queueFrameArgs.uri);
        const normalizedMimeType = normalizeTranscriptionMimeType(
          queueFrameArgs.mimeType || 'audio/m4a'
        );
        const audioBase64 = encodedPayload.base64Payload;
        const estimatedAudioBytes = encodedPayload.byteLength > 0
          ? encodedPayload.byteLength
          : estimateBase64ByteLength(audioBase64);
        console.info(
          `[VoiceFrame] queue seq=${queueFrameArgs.sequence} bytes=${estimatedAudioBytes} final=${Boolean(queueFrameArgs.isFinal)}`
        );
        const gate = evaluateFrameTranscriptionGate({
          frameArgs: queueFrameArgs,
          mimeType: normalizedMimeType,
          estimatedAudioBytes,
          hasHeaderInspection: encodedPayload.hasHeaderInspection,
          hasMp4FtypHeader: encodedPayload.hasMp4FtypHeader,
        });
        if (!gate.shouldTranscribe) {
          emitVoiceTelemetry('frame_transcription_rejected', {
            sequence: queueFrameArgs.sequence,
            isFinal: Boolean(queueFrameArgs.isFinal),
            reason: gate.reason,
            bytes: estimatedAudioBytes,
            minBytes: gate.minBytes,
            durationMs: queueFrameArgs.frameDurationMs,
            minDurationMs: gate.minDurationMs,
            mimeType: normalizedMimeType,
            headerHex: encodedPayload.headerHex,
          });
          console.warn(
            `Skipping voice frame seq=${queueFrameArgs.sequence} reason=${gate.reason || 'rejected'} bytes=${estimatedAudioBytes}.`
          );
          return {
            sequence: queueFrameArgs.sequence,
            relayEventCount: 0,
          };
        }
        emitVoiceTelemetry('frame_transcription_ready', {
          voiceSessionId: active.voiceSessionId,
          sequence: queueFrameArgs.sequence,
          isFinal: Boolean(queueFrameArgs.isFinal),
          bytes: estimatedAudioBytes,
          durationMs: queueFrameArgs.frameDurationMs,
          mimeType: normalizedMimeType,
          durationGateBypassed: Boolean(gate.durationGateBypassed),
        });
        const relayHealthAtDecision = captureRealtimeRelayHealth();
        const policy = resolveFrameStreamingPolicy({
          transportMode: transportSelection.effectiveMode,
          isRealtimeConnected,
          isRealtimeRelayHealthy: relayHealthAtDecision.healthy,
          isFinalFrame: Boolean(queueFrameArgs.isFinal),
        });
        if (!policy.shouldSendRealtimeEnvelope) {
          console.info(
            `[VoiceFrame] ingest deferred seq=${queueFrameArgs.sequence} mode=${transportSelection.effectiveMode} realtime=${isRealtimeConnected} relayHealthy=${relayHealthAtDecision.healthy} relayReason=${relayHealthAtDecision.reasonCode}`
          );
        }

        let realtimeIngestResult: StreamFrameIngestResult | null = null;
        let forceHttpTranscription = false;
        const liveSessionId = args.liveSessionId || `mobile_live_${active.voiceSessionId}`;
        const ingestEnvelope = async (envelope: Record<string, unknown>) => {
          return await l4yercak3Client.ai.voice.ingestVoiceFrame({
            conversationId: active.conversationId,
            interviewSessionId: active.interviewSessionId,
            requestedProviderId: args.requestedProviderId,
            conversationRuntime: {
              mode: args.sourceMode === 'meta_glasses' ? 'voice_with_eyes' : 'voice',
              requestedEyesSource: args.sourceMode,
              sourceMode: args.sourceMode,
            },
            voiceRuntime: {
              sourceId: args.sourceRuntime?.sourceId,
              sourceClass: args.sourceRuntime?.sourceClass,
              providerId: args.sourceRuntime?.providerId,
              sourceMode: args.sourceMode,
              liveSessionId: args.liveSessionId,
            },
            transportRuntime: {
              transport: transportSelection.effectiveMode,
              requestedTransport: transportSelection.requestedMode,
              fallbackReason: transportSelection.fallbackReason || 'none',
            },
            avObservability: args.avObservability || undefined,
            envelope,
          });
        };
        if (policy.shouldSendRealtimeEnvelope) {
          const envelope = buildVoiceAudioFrameEnvelope({
            liveSessionId,
            voiceSessionId: active.voiceSessionId,
            interviewSessionId: active.interviewSessionId,
            sequence: queueFrameArgs.sequence,
            audioChunkBase64: audioBase64,
            frameDurationMs: queueFrameArgs.frameDurationMs || 20,
            transcriptionMimeType: queueFrameArgs.mimeType || 'audio/m4a',
            transportMode:
              transportSelection.effectiveMode === 'webrtc' ? 'webrtc' : 'websocket',
          });
          let ingestResult;
          try {
            console.info(
              `[VoiceFrame] ingest start seq=${queueFrameArgs.sequence} mode=${transportSelection.effectiveMode}`
            );
            lastRealtimeIngestAttemptAtMsRef.current = Date.now();
            captureRealtimeRelayHealth(true);
            ingestResult = await ingestEnvelope(envelope);
            lastRealtimeIngestAckAtMsRef.current = Date.now();
            consecutiveRealtimeIngestFailuresRef.current = 0;
            captureServerRelayQosFromIngestResult(
              (ingestResult as { relay?: unknown })?.relay,
              true
            );
          } catch (error) {
            const message = error instanceof Error ? error.message : 'voice_frame_ingest_failed';
            consecutiveRealtimeIngestFailuresRef.current += 1;
            captureRealtimeRelayHealth(true);
            if (isRecoverableFrameTranscriptionMessage(message)) {
              console.warn(
                `Skipping realtime frame seq=${queueFrameArgs.sequence} due to recoverable ingest error: ${message}`
              );
              ingestResult = { relayEvents: [], orchestration: undefined };
              forceHttpTranscription = true;
            } else {
              console.warn(
                `Realtime ingest failed seq=${queueFrameArgs.sequence}; falling back to HTTP transcription for this frame: ${message}`
              );
              ingestResult = { relayEvents: [], orchestration: undefined };
              forceHttpTranscription = true;
            }
          }
          const relayEvents = Array.isArray(ingestResult.relayEvents)
            ? ingestResult.relayEvents
            : [];
          console.info(
            `[VoiceFrame] ingest ok seq=${queueFrameArgs.sequence} relayEvents=${relayEvents.length}`
          );
          for (const relayEvent of relayEvents) {
            const eventType = typeof relayEvent.eventType === 'string'
              ? relayEvent.eventType
              : undefined;
            const transcriptText = sanitizeTranscriptForVoiceTurn(
              typeof relayEvent.transcriptText === 'string'
                ? relayEvent.transcriptText
                : undefined
            );
            if (!transcriptText) {
              continue;
            }
            if (eventType === 'partial_transcript' || eventType === 'final_transcript') {
              const merged = mergeTranscriptFrame(
                transcriptFramesRef.current,
                queueFrameArgs.sequence,
                transcriptText
              );
              if (merged) {
                setPartialTranscript(merged);
                partialTranscriptRef.current = merged;
                queueFrameArgs.onPartial?.(merged);
              }
            }
          }
          const orchestration = ingestResult.orchestration;
          const orchestrationTurn = orchestration?.turn;
          realtimeIngestResult = {
            sequence: queueFrameArgs.sequence,
            relayEventCount: relayEvents.length,
            finalTranscriptText:
              typeof orchestration?.transcriptText === 'string'
                ? orchestration.transcriptText
                : undefined,
            orchestration: orchestration
              ? {
                  shouldTriggerAssistantTurn: orchestration.shouldTriggerAssistantTurn === true,
                  interrupted: orchestration.interrupted === true,
                  reason: orchestration.reason || 'unknown',
                  status: orchestrationTurn?.status,
                  assistantText: orchestrationTurn?.assistantText,
                }
              : undefined,
          };
        }

        const shouldUseHttpTranscription =
          policy.shouldUseHttpTranscription || forceHttpTranscription;
        if (!shouldUseHttpTranscription) {
          return realtimeIngestResult ?? {
            sequence: queueFrameArgs.sequence,
            relayEventCount: 0,
          };
        }
        if (forceHttpTranscription) {
          emitVoiceTelemetry('frame_transcribe_fallback_from_realtime', {
            voiceSessionId: active.voiceSessionId,
            sequence: queueFrameArgs.sequence,
            relayHealthReasonCode: captureRealtimeRelayHealth(true).reasonCode,
            consecutiveRealtimeIngestFailures: consecutiveRealtimeIngestFailuresRef.current,
          });
        }

        let transcribeResult;
        try {
          const requestedVoiceId = await resolveRequestedVoiceId();
          console.info(`[VoiceFrame] transcribe start seq=${queueFrameArgs.sequence}`);
          emitVoiceTelemetry('frame_transcribe_attempt', {
            voiceSessionId: active.voiceSessionId,
            sequence: queueFrameArgs.sequence,
            isFinal: Boolean(queueFrameArgs.isFinal),
            bytes: estimatedAudioBytes,
            mimeType: normalizedMimeType,
          });
          transcribeResult = await l4yercak3Client.ai.voice.transcribe({
            conversationId: active.conversationId,
            interviewSessionId: active.interviewSessionId,
            voiceSessionId: active.voiceSessionId,
            audioBase64,
            mimeType: queueFrameArgs.mimeType || 'audio/m4a',
            requestedProviderId: args.requestedProviderId,
            requestedVoiceId,
            language: queueFrameArgs.language,
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'voice_frame_transcription_failed';
          if (isRecoverableFrameTranscriptionMessage(message)) {
            emitVoiceTelemetry('frame_transcribe_recoverable_error', {
              voiceSessionId: active.voiceSessionId,
              sequence: queueFrameArgs.sequence,
              isFinal: Boolean(queueFrameArgs.isFinal),
              reason: message,
            });
            console.warn(
              `Skipping transcription frame seq=${queueFrameArgs.sequence} due to recoverable transcription error: ${message}`
            );
            return {
              sequence: queueFrameArgs.sequence,
              relayEventCount: realtimeIngestResult?.relayEventCount ?? 0,
              finalTranscriptText: realtimeIngestResult?.finalTranscriptText,
              orchestration: realtimeIngestResult?.orchestration,
            };
          }
          throw error;
        }

        if (!transcribeResult.success) {
          if (isRecoverableFrameTranscriptionMessage(transcribeResult.error || '')) {
            emitVoiceTelemetry('frame_transcribe_recoverable_response_error', {
              voiceSessionId: active.voiceSessionId,
              sequence: queueFrameArgs.sequence,
              isFinal: Boolean(queueFrameArgs.isFinal),
              reason: transcribeResult.error || 'voice_frame_transcription_failed',
            });
            console.warn(
              `Skipping transcription frame seq=${queueFrameArgs.sequence} due to recoverable transcription response error.`
            );
            return {
              sequence: queueFrameArgs.sequence,
              relayEventCount: realtimeIngestResult?.relayEventCount ?? 0,
              finalTranscriptText: realtimeIngestResult?.finalTranscriptText,
              orchestration: realtimeIngestResult?.orchestration,
            };
          }
          throw new Error(transcribeResult.error || 'Voice frame transcription failed.');
        }
        console.info(
          `[VoiceFrame] transcribe ok seq=${queueFrameArgs.sequence} text=${(transcribeResult.text || '').length}`
        );
        emitVoiceTelemetry('frame_transcribe_ok', {
          voiceSessionId: active.voiceSessionId,
          sequence: queueFrameArgs.sequence,
          isFinal: Boolean(queueFrameArgs.isFinal),
          textLength: (transcribeResult.text || '').length,
          providerId: transcribeResult.providerId,
        });

        const sanitizedTranscriptText = sanitizeTranscriptForVoiceTurn(transcribeResult.text);
        if (!sanitizedTranscriptText && transcribeResult.text?.trim()) {
          emitVoiceTelemetry('frame_transcribe_ambient_filtered', {
            voiceSessionId: active.voiceSessionId,
            sequence: queueFrameArgs.sequence,
            rawTextLength: transcribeResult.text.trim().length,
          });
          console.info(
            `[VoiceFrame] transcribe ignored seq=${queueFrameArgs.sequence} reason=ambient_non_speech`
          );
        }

        if (sanitizedTranscriptText) {
          const merged = mergeTranscriptFrame(
            transcriptFramesRef.current,
            queueFrameArgs.sequence,
            sanitizedTranscriptText
          );
          if (merged) {
            setPartialTranscript(merged);
            partialTranscriptRef.current = merged;
            queueFrameArgs.onPartial?.(merged);
          }
        }
        if (!policy.shouldSendRealtimeEnvelope || forceHttpTranscription) {
          const transcriptText = (
            queueFrameArgs.isFinal
              ? (partialTranscriptRef.current || sanitizedTranscriptText || '').trim()
              : (sanitizedTranscriptText || '').trim()
          );
          if (transcriptText) {
            const transcriptEventType =
              queueFrameArgs.isFinal
                ? 'final_transcript'
                : 'partial_transcript';
            const transcriptSequence = transcriptIngestSequenceRef.current;
            transcriptIngestSequenceRef.current += 1;
            const transcriptEnvelope = {
              contractVersion: 'voice_transport_v1',
              transportMode:
                transportSelection.effectiveMode === 'webrtc' ? 'webrtc' : 'websocket',
              eventType: transcriptEventType,
              liveSessionId,
              voiceSessionId: active.voiceSessionId,
              interviewSessionId: active.interviewSessionId,
              sequence: transcriptSequence,
              previousSequence:
                transcriptSequence > 0 ? transcriptSequence - 1 : undefined,
              timestampMs: Date.now(),
              transcriptText,
            };
            try {
              console.info(
                `[VoiceFrame] ingest transcript start seq=${queueFrameArgs.sequence} transportSeq=${transcriptSequence} type=${transcriptEnvelope.eventType}`
              );
              emitVoiceTelemetry('frame_transcript_ingest_attempt', {
                voiceSessionId: active.voiceSessionId,
                sequence: queueFrameArgs.sequence,
                transcriptSequence,
                eventType: transcriptEnvelope.eventType,
                transcriptLength: transcriptText.length,
              });
              const transcriptIngest = await ingestEnvelope(transcriptEnvelope);
              captureServerRelayQosFromIngestResult(
                (transcriptIngest as { relay?: unknown })?.relay,
                true
              );
              const relayEvents = Array.isArray(transcriptIngest.relayEvents)
                ? transcriptIngest.relayEvents
                : [];
              const orchestration = transcriptIngest.orchestration;
              const orchestrationTurn = orchestration?.turn;
              console.info(
                `[VoiceFrame] ingest transcript ok seq=${queueFrameArgs.sequence} transportSeq=${transcriptSequence} relayEvents=${relayEvents.length} status=${orchestrationTurn?.status || 'none'}`
              );
              emitVoiceTelemetry('frame_transcript_ingest_ok', {
                voiceSessionId: active.voiceSessionId,
                sequence: queueFrameArgs.sequence,
                transcriptSequence,
                relayEvents: relayEvents.length,
                orchestrationStatus: orchestrationTurn?.status || 'none',
              });
              realtimeIngestResult = {
                sequence: queueFrameArgs.sequence,
                relayEventCount:
                  (realtimeIngestResult?.relayEventCount ?? 0) + relayEvents.length,
                finalTranscriptText:
                  typeof orchestration?.transcriptText === 'string'
                    ? orchestration.transcriptText
                    : transcriptText,
                orchestration: orchestration
                  ? {
                      shouldTriggerAssistantTurn:
                        orchestration.shouldTriggerAssistantTurn === true,
                      interrupted: orchestration.interrupted === true,
                      reason: orchestration.reason || 'unknown',
                      status: orchestrationTurn?.status,
                      assistantText: orchestrationTurn?.assistantText,
                    }
                  : realtimeIngestResult?.orchestration,
              };
            } catch (error) {
              const message =
                error instanceof Error ? error.message : 'voice_frame_ingest_failed';
              if (isRecoverableFrameTranscriptionMessage(message)) {
                emitVoiceTelemetry('frame_transcript_ingest_recoverable_error', {
                  voiceSessionId: active.voiceSessionId,
                  sequence: queueFrameArgs.sequence,
                  transcriptSequence,
                  reason: message,
                });
                console.warn(
                  `Skipping transcript ingest seq=${queueFrameArgs.sequence} due to recoverable ingest error: ${message}`
                );
              } else {
                throw error;
              }
            }
          }
        }
        return {
          sequence: queueFrameArgs.sequence,
          relayEventCount: realtimeIngestResult?.relayEventCount ?? 0,
          finalTranscriptText: sanitizedTranscriptText ?? realtimeIngestResult?.finalTranscriptText,
          orchestration: realtimeIngestResult?.orchestration,
        };
      });
    }

    try {
      return await frameIngestQueueRef.current(frameArgs);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'voice_frame_ingest_failed';
      if (isRecoverableFrameTranscriptionMessage(message)) {
        console.warn(
          `Voice frame ingest recovered seq=${frameArgs.sequence} error=${message}`
        );
        return {
          sequence: frameArgs.sequence,
          relayEventCount: 0,
        };
      }
      console.warn('Voice frame ingest failed:', error);
      throw error;
    }
  }, [
    args.avObservability,
    args.language,
    args.liveSessionId,
    args.requestedProviderId,
    args.sourceMode,
    args.sourceRuntime?.providerId,
    args.sourceRuntime?.sourceClass,
    args.sourceRuntime?.sourceId,
    captureServerRelayQosFromIngestResult,
    captureRealtimeRelayHealth,
    isRealtimeConnected,
    openSession,
    resolveRequestedVoiceId,
    transportSelection.effectiveMode,
    transportSelection.fallbackReason,
    transportSelection.requestedMode,
  ]);

  const synthesizeAndPlay = useCallback(async (text: string): Promise<{
    playbackPath: 'provider_audio' | 'system_fallback' | 'none';
    playbackStartedAtMs?: number;
  }> => {
    if (!text.trim()) {
      return { playbackPath: 'none' };
    }
    const active = await openSession();
    const requestedVoiceId = await resolveRequestedVoiceId();
    if (!requestedVoiceId) {
      emitVoiceTelemetry('tts_requested_voice_missing_backend_resolution', {
        voiceSessionId: active.voiceSessionId,
      });
    }
    await stopPlayback();
    const synthController = typeof AbortController === 'function'
      ? new AbortController()
      : null;
    if (synthController) {
      synthAbortControllerRef.current = synthController;
    }
    let synthesis: Awaited<ReturnType<typeof l4yercak3Client.ai.voice.synthesize>>;
    try {
      synthesis = await l4yercak3Client.ai.voice.synthesize(
        {
          conversationId: active.conversationId,
          interviewSessionId: active.interviewSessionId,
          voiceSessionId: active.voiceSessionId,
          text,
          requestedProviderId: args.requestedProviderId,
          requestedVoiceId,
        },
        synthController ? { signal: synthController.signal } : undefined
      );
    } catch (error) {
      if (isAbortRequestError(error)) {
        emitVoiceTelemetry('tts_synthesize_request_aborted', { reason: 'request_aborted' });
        return { playbackPath: 'none' };
      }
      throw error;
    } finally {
      if (synthAbortControllerRef.current === synthController) {
        synthAbortControllerRef.current = null;
      }
    }
    if (synthController?.signal.aborted) {
      emitVoiceTelemetry('tts_synthesize_request_aborted', { reason: 'response_aborted' });
      return { playbackPath: 'none' };
    }
    console.info(
      `[VoiceTTS] synth result provider=${synthesis.providerId} hasAudio=${Boolean(
        synthesis.audioBase64
      )} mimeType=${synthesis.mimeType || 'none'}`
    );

    if (!synthesis.success) {
      throw new Error(synthesis.error || 'Voice synthesis failed.');
    }

    if (synthesis.audioBase64 && synthesis.mimeType) {
      let player: ReturnType<typeof createAudioPlayer> | null = null;
      try {
        await setPlaybackAudioMode();
        if (synthController?.signal.aborted) {
          return { playbackPath: 'none' };
        }
        player = createAudioPlayer({
          uri: `data:${synthesis.mimeType};base64,${synthesis.audioBase64}`,
        });
        player.volume = 1;
        playbackRef.current = player;
        const playbackStartedAtMs = Date.now();
        await waitForAudioPlayerCompletion(player);
        console.info('[VoiceTTS] playback started provider_audio');
        return {
          playbackPath: 'provider_audio',
          playbackStartedAtMs,
        };
      } catch (error) {
        console.warn('Provider audio playback failed, falling back to speech synthesis:', error);
      } finally {
        if (player && playbackRef.current === player) {
          playbackRef.current = null;
        }
        disposeAudioPlayer(player);
      }
    }

    const fallbackText = synthesis.fallbackText || text;
    if (synthController?.signal.aborted) {
      return { playbackPath: 'none' };
    }
    const playbackStartedAtMs = Date.now();
    await speakWithSystemFallbackVoice(fallbackText);
    console.info('[VoiceTTS] playback started system_fallback');
    return {
      playbackPath: 'system_fallback',
      playbackStartedAtMs,
    };
  }, [args.requestedProviderId, openSession, resolveRequestedVoiceId, stopPlayback]);

  const transportRuntime = useMemo(() => {
    const active = activeSessionRef.current;
    return buildVoiceTransportRuntime({
      selection: transportSelection,
      liveSessionId: args.liveSessionId,
      activeSession: active,
      isRealtimeConnected,
      realtimeRelayHealth,
      relayServerMonitoring,
      partialTranscript,
    });
  }, [
    args.liveSessionId,
    isRealtimeConnected,
    partialTranscript,
    realtimeRelayHealth,
    relayServerMonitoring,
    transportSelection,
  ]);
  const transportDegradation = useMemo<VoiceTransportDegradationState>(
    () => resolveVoiceTransportDegradationState(transportSelection),
    [transportSelection]
  );

  const getActiveSession = useCallback(() => activeSessionRef.current, []);
  const clearPartialTranscript = useCallback((reason: string = 'manual') => {
    transcriptFramesRef.current.clear();
    setPartialTranscript('');
    partialTranscriptRef.current = '';
    emitVoiceTelemetry('utterance_boundary_cleared', { reason });
  }, []);

  return {
    openSession,
    closeSession,
    transcribeRecording,
    ingestStreamingFrame,
    synthesizeAndPlay,
    stopPlayback,
    transportSelection,
    transportDegradation,
    transportRuntime,
    partialTranscript,
    isSessionOpening,
    lastSessionErrorReason,
    clearPartialTranscript,
    suspendSession: async () => closeSession('voice_mode_suspend'),
    finalizeStreamingUtterance: (args: { sequence: number }) => {
      const mergedText = Array.from(transcriptFramesRef.current.entries())
        .filter(([sequence]) => sequence <= args.sequence)
        .sort(([left], [right]) => left - right)
        .map(([, text]) => text)
        .join(' ')
        .trim();
      const text = mergedText || partialTranscriptRef.current.trim();
      clearPartialTranscript('finalize_streaming_utterance');
      emitVoiceTelemetry('utterance_boundary_finalized', {
        sequence: args.sequence,
        textLength: text.length,
      });
      return text
        ? {
            sequence: args.sequence,
            text,
          }
        : null;
    },
    getActiveSession,
  };
}
