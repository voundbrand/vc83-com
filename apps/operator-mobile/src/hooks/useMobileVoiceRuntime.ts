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
import { buildSignedMobileSourceAttestation } from '../lib/av/source-attestation';
import { MOBILE_VOICE_TRANSCRIBE_MIN_FRAME_BYTES } from '../lib/voice/runtimePolicy';

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

async function fileUriToBase64(uri: string): Promise<string> {
  const response = await fetch(uri);
  const blob = await response.blob();

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

  const stopPlayback = useCallback(async () => {
    Speech.stop();
    const player = playbackRef.current;
    playbackRef.current = null;
    if (player) {
      try {
        player.pause();
      } catch {
        // Ignore stop errors during interruption.
      }
      try {
        player.release();
      } catch {
        // Ignore release errors during interruption.
      }
    }
  }, []);

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

    const audioBase64 = await fileUriToBase64(transcribeArgs.uri);

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
        const active = await openSession();
        const audioBase64 = await fileUriToBase64(queueFrameArgs.uri);
        const estimatedAudioBytes = estimateBase64ByteLength(audioBase64);
        console.info(
          `[VoiceFrame] queue seq=${queueFrameArgs.sequence} bytes=${estimatedAudioBytes} final=${Boolean(queueFrameArgs.isFinal)}`
        );
        if (estimatedAudioBytes < MOBILE_VOICE_TRANSCRIBE_MIN_FRAME_BYTES) {
          console.warn(
            `Skipping short/silent voice frame seq=${queueFrameArgs.sequence} bytes=${estimatedAudioBytes}.`
          );
          return {
            sequence: queueFrameArgs.sequence,
            relayEventCount: 0,
          };
        }
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
            const transcriptText = typeof relayEvent.transcriptText === 'string'
              ? relayEvent.transcriptText
              : '';
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

        if (transcribeResult.text) {
          const merged = mergeTranscriptFrame(
            transcriptFramesRef.current,
            queueFrameArgs.sequence,
            transcribeResult.text
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
              ? (partialTranscriptRef.current || transcribeResult.text || '').trim()
              : (transcribeResult.text || '').trim()
          );
          if (transcriptText) {
            const shouldForceFinalTranscript =
              transportSelection.effectiveMode === 'chunked_fallback' && !queueFrameArgs.isFinal;
            const transcriptEventType =
              queueFrameArgs.isFinal || shouldForceFinalTranscript
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
                `[VoiceFrame] ingest transcript start seq=${queueFrameArgs.sequence} transportSeq=${transcriptSequence} type=${transcriptEnvelope.eventType} forcedFinal=${shouldForceFinalTranscript}`
              );
              const transcriptIngest = await ingestEnvelope(transcriptEnvelope);
              const relayEvents = Array.isArray(transcriptIngest.relayEvents)
                ? transcriptIngest.relayEvents
                : [];
              const orchestration = transcriptIngest.orchestration;
              const orchestrationTurn = orchestration?.turn;
              console.info(
                `[VoiceFrame] ingest transcript ok seq=${queueFrameArgs.sequence} transportSeq=${transcriptSequence} relayEvents=${relayEvents.length} status=${orchestrationTurn?.status || 'none'}`
              );
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
          finalTranscriptText: transcribeResult.text ?? realtimeIngestResult?.finalTranscriptText,
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
    const synthesis = await l4yercak3Client.ai.voice.synthesize({
      conversationId: active.conversationId,
      interviewSessionId: active.interviewSessionId,
      voiceSessionId: active.voiceSessionId,
      text,
      requestedProviderId: args.requestedProviderId,
      requestedVoiceId,
    });
    console.info(
      `[VoiceTTS] synth result provider=${synthesis.providerId} hasAudio=${Boolean(
        synthesis.audioBase64
      )} mimeType=${synthesis.mimeType || 'none'}`
    );

    if (!synthesis.success) {
      throw new Error(synthesis.error || 'Voice synthesis failed.');
    }

    if (synthesis.audioBase64 && synthesis.mimeType) {
      try {
        await setAudioModeAsync({
          allowsRecording: false,
          playsInSilentMode: true,
        });
        const player = createAudioPlayer({
          uri: `data:${synthesis.mimeType};base64,${synthesis.audioBase64}`,
        });
        player.volume = 1;
        playbackRef.current = player;
        player.play();
        console.info('[VoiceTTS] playback started provider_audio');
        return;
      } catch (error) {
        console.warn('Provider audio playback failed, falling back to speech synthesis:', error);
      }
    }

    const fallbackText = synthesis.fallbackText || text;
    try {
      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
      });
    } catch {
      // Continue with system speech fallback even if audio mode update fails.
    }
    Speech.stop();
    Speech.speak(fallbackText, { volume: 1 });
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
    clearPartialTranscript: () => {
      transcriptFramesRef.current.clear();
      setPartialTranscript('');
      partialTranscriptRef.current = '';
    },
    suspendSession: async () => closeSession('voice_mode_suspend'),
    finalizeStreamingUtterance: (args: { sequence: number }) => {
      const mergedText = Array.from(transcriptFramesRef.current.entries())
        .filter(([sequence]) => sequence <= args.sequence)
        .sort(([left], [right]) => left - right)
        .map(([, text]) => text)
        .join(' ')
        .trim();
      const text = mergedText || partialTranscriptRef.current.trim();
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
