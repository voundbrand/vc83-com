import { useCallback, useMemo, useRef, useState } from 'react';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import * as Speech from 'expo-speech';

import { ENV } from '../config/env';
import { l4yercak3Client } from '../api/client';
import {
  buildVoiceTransportRuntime,
  downgradeVoiceTransportSelection,
  resolveVoiceTransportSelection,
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

type VoiceProviderId = 'browser' | 'elevenlabs';
type ResolvedVoiceIdSource =
  | 'requested_voice_id'
  | 'env_expo_public'
  | 'catalog_selected'
  | 'catalog_first_voice';

type UseMobileVoiceRuntimeArgs = {
  conversationId?: string;
  liveSessionId?: string;
  requestedVoiceId?: string;
  requestedProviderId?: VoiceProviderId;
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
  const initialRequestedVoiceId = normalizeOptionalToken(args.requestedVoiceId);
  const initialEnvVoiceId = normalizeOptionalToken(ENV.ELEVENLABS_VOICE_ID);
  const [transportSelection, setTransportSelection] = useState<VoiceTransportSelection>(() =>
    resolveVoiceTransportSelection({
      configuredMode: ENV.VOICE_TRANSPORT_MODE,
      websocketUrl: ENV.VOICE_WEBSOCKET_URL,
      isWebRtcAvailable: supportsWebRtc(),
    })
  );
  const [partialTranscript, setPartialTranscript] = useState('');
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const [isSessionOpening, setIsSessionOpening] = useState(false);
  const [lastSessionErrorReason, setLastSessionErrorReason] = useState<string | undefined>(undefined);
  const activeSessionRef = useRef<ActiveVoiceSession | null>(null);
  const websocketRef = useRef<WebSocket | null>(null);
  const playbackRef = useRef<ReturnType<typeof createAudioPlayer> | null>(null);
  const synthAbortControllerRef = useRef<AbortController | null>(null);
  const intentionalSocketCloseRef = useRef(false);
  const frameIngestQueueRef = useRef<((frameArgs: StreamFrameArgs) => Promise<StreamFrameIngestResult>) | null>(null);
  const transcriptFramesRef = useRef<Map<number, string>>(new Map());
  const transcriptIngestSequenceRef = useRef(0);
  const partialTranscriptRef = useRef('');
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

  const applyTransportDowngrade = useCallback(
    (
      reason:
        | 'webrtc_not_implemented'
        | 'websocket_connect_failed'
        | 'websocket_runtime_error'
        | 'websocket_closed'
    ) => {
      setTransportSelection((previous) =>
        downgradeVoiceTransportSelection({
          current: previous,
          websocketUrl: ENV.VOICE_WEBSOCKET_URL,
          reason,
        })
      );
      setIsRealtimeConnected(false);
    },
    []
  );

  const connectWebsocket = useCallback((session: ActiveVoiceSession) => {
    const baseSelection = resolveVoiceTransportSelection({
      configuredMode: ENV.VOICE_TRANSPORT_MODE,
      websocketUrl: ENV.VOICE_WEBSOCKET_URL,
      isWebRtcAvailable: supportsWebRtc(),
    });
    const selection =
      baseSelection.effectiveMode === 'webrtc'
        ? downgradeVoiceTransportSelection({
            current: baseSelection,
            websocketUrl: ENV.VOICE_WEBSOCKET_URL,
            reason: 'webrtc_not_implemented',
          })
        : baseSelection;
    setTransportSelection(selection);

    if (selection.effectiveMode !== 'websocket' || !ENV.VOICE_WEBSOCKET_URL) {
      return;
    }

    try {
      const socket = new WebSocket(ENV.VOICE_WEBSOCKET_URL);
      intentionalSocketCloseRef.current = false;
      websocketRef.current = socket;
      socket.onopen = () => {
        setIsRealtimeConnected(true);
        socket.send(
          JSON.stringify({
            type: 'voice_session_open',
            voiceSessionId: session.voiceSessionId,
            interviewSessionId: session.interviewSessionId,
            conversationId: session.conversationId,
          })
        );
      };
      socket.onclose = () => {
        websocketRef.current = null;
        setIsRealtimeConnected(false);
        if (!intentionalSocketCloseRef.current) {
          applyTransportDowngrade('websocket_closed');
        }
      };
      socket.onerror = () => {
        websocketRef.current = null;
        setIsRealtimeConnected(false);
        if (!intentionalSocketCloseRef.current) {
          applyTransportDowngrade('websocket_runtime_error');
        }
      };
      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data as string) as {
            type?: string;
            partialTranscript?: string;
            eventType?: string;
            transcriptText?: string;
          };
          if (payload.type === 'partial_transcript' && typeof payload.partialTranscript === 'string') {
            setPartialTranscript(payload.partialTranscript);
            partialTranscriptRef.current = payload.partialTranscript;
            return;
          }
          if (payload.eventType === 'partial_transcript' && typeof payload.transcriptText === 'string') {
            setPartialTranscript(payload.transcriptText);
            partialTranscriptRef.current = payload.transcriptText;
          }
        } catch {
          // Ignore malformed transport payloads.
        }
      };
    } catch (error) {
      console.warn('Voice websocket setup failed:', error);
      applyTransportDowngrade('websocket_connect_failed');
    }
  }, [applyTransportDowngrade]);

  const disconnectRealtime = useCallback(() => {
    const socket = websocketRef.current;
    websocketRef.current = null;
    if (socket) {
      intentionalSocketCloseRef.current = true;
      socket.close();
    }
    setIsRealtimeConnected(false);
  }, []);

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

    const explicitVoiceId = normalizeOptionalToken(args.requestedVoiceId);
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
        const selectedVoiceId = normalizeOptionalToken(catalog.selectedVoiceId ?? undefined);
        const voices = Array.isArray(catalog.voices) ? catalog.voices : [];
        const firstVoiceId = voices
          .map((voice) => normalizeOptionalToken(voice?.id))
          .find((voiceId): voiceId is string => Boolean(voiceId));
        console.info('[VoiceRuntime] voice_catalog_snapshot', {
          provider: catalog.provider,
          providerStatus: catalog.providerStatus,
          selectedVoiceId: selectedVoiceId || null,
          voicesCount: voices.length,
          firstVoiceId: firstVoiceId || null,
          warning: catalog.warning || null,
        });
        const resolved = selectedVoiceId || firstVoiceId;
        if (resolved) {
          return commitResolvedVoiceId(
            resolved,
            selectedVoiceId ? 'catalog_selected' : 'catalog_first_voice'
          );
        }
        console.warn('[VoiceRuntime] resolve_elevenlabs_voice_id_empty_catalog', {
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
  }, [args.requestedVoiceId]);

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
        activeSessionRef.current = nextSession;
        connectWebsocket(nextSession);
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
    connectWebsocket,
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
  }, [disconnectRealtime, stopPlayback]);

  const transcribeRecording = useCallback(async (transcribeArgs: TranscribeArgs) => {
    const active = await openSession();
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
      requestedVoiceId: args.requestedVoiceId,
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
  }, [args.requestedProviderId, args.requestedVoiceId, openSession, transportSelection.effectiveMode]);

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
        const policy = resolveFrameStreamingPolicy({
          transportMode: transportSelection.effectiveMode,
          isRealtimeConnected,
          isFinalFrame: Boolean(queueFrameArgs.isFinal),
        });
        if (!policy.shouldSendRealtimeEnvelope) {
          console.info(
            `[VoiceFrame] ingest deferred seq=${queueFrameArgs.sequence} mode=${transportSelection.effectiveMode} realtime=${isRealtimeConnected}`
          );
        }

        let realtimeIngestResult: StreamFrameIngestResult | null = null;
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
            ingestResult = await ingestEnvelope(envelope);
          } catch (error) {
            const message = error instanceof Error ? error.message : 'voice_frame_ingest_failed';
            if (isRecoverableFrameTranscriptionMessage(message)) {
              console.warn(
                `Skipping realtime frame seq=${queueFrameArgs.sequence} due to recoverable ingest error: ${message}`
              );
              ingestResult = { relayEvents: [], orchestration: undefined };
            } else {
              throw error;
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

        if (!policy.shouldUseHttpTranscription) {
          return realtimeIngestResult ?? {
            sequence: queueFrameArgs.sequence,
            relayEventCount: 0,
          };
        }

        let transcribeResult;
        try {
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
            requestedVoiceId: args.requestedVoiceId,
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
        if (!policy.shouldSendRealtimeEnvelope) {
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
    args.liveSessionId,
    args.requestedProviderId,
    args.requestedVoiceId,
    args.sourceMode,
    args.sourceRuntime?.providerId,
    args.sourceRuntime?.sourceClass,
    args.sourceRuntime?.sourceId,
    isRealtimeConnected,
    openSession,
    transportSelection.effectiveMode,
    transportSelection.fallbackReason,
    transportSelection.requestedMode,
  ]);

  const synthesizeAndPlay = useCallback(async (text: string) => {
    if (!text.trim()) {
      return;
    }
    const active = await openSession();
    const requestedVoiceId = await resolveRequestedVoiceId();
    if (!requestedVoiceId) {
      throw new Error(
        'No ElevenLabs voice ID configured. Set an operator voice in Settings or configure organization defaultVoiceId.'
      );
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
        return;
      }
      throw error;
    } finally {
      if (synthAbortControllerRef.current === synthController) {
        synthAbortControllerRef.current = null;
      }
    }
    if (synthController?.signal.aborted) {
      emitVoiceTelemetry('tts_synthesize_request_aborted', { reason: 'response_aborted' });
      return;
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
          return;
        }
        player = createAudioPlayer({
          uri: `data:${synthesis.mimeType};base64,${synthesis.audioBase64}`,
        });
        player.volume = 1;
        playbackRef.current = player;
        await waitForAudioPlayerCompletion(player);
        console.info('[VoiceTTS] playback started provider_audio');
        return;
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
      return;
    }
    await speakWithSystemFallbackVoice(fallbackText);
    console.info('[VoiceTTS] playback started system_fallback');
  }, [args.requestedProviderId, openSession, resolveRequestedVoiceId, stopPlayback]);

  const transportRuntime = useMemo(() => {
    const active = activeSessionRef.current;
    return buildVoiceTransportRuntime({
      selection: transportSelection,
      liveSessionId: args.liveSessionId,
      activeSession: active,
      isRealtimeConnected,
      partialTranscript,
    });
  }, [args.liveSessionId, isRealtimeConnected, partialTranscript, transportSelection]);

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
