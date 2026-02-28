import { useCallback, useMemo, useRef, useState } from 'react';
import { Audio } from 'expo-av';
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

type VoiceProviderId = 'browser' | 'elevenlabs';

type UseMobileVoiceRuntimeArgs = {
  conversationId?: string;
  liveSessionId?: string;
  requestedVoiceId?: string;
  requestedProviderId?: VoiceProviderId;
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
  onPartial?: (text: string) => void;
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

export function useMobileVoiceRuntime(args: UseMobileVoiceRuntimeArgs) {
  const [transportSelection, setTransportSelection] = useState<VoiceTransportSelection>(() =>
    resolveVoiceTransportSelection({
      configuredMode: ENV.VOICE_TRANSPORT_MODE,
      websocketUrl: ENV.VOICE_WEBSOCKET_URL,
      isWebRtcAvailable: supportsWebRtc(),
    })
  );
  const [partialTranscript, setPartialTranscript] = useState('');
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const activeSessionRef = useRef<ActiveVoiceSession | null>(null);
  const websocketRef = useRef<WebSocket | null>(null);
  const playbackRef = useRef<Audio.Sound | null>(null);
  const intentionalSocketCloseRef = useRef(false);
  const frameIngestQueueRef = useRef<((frameArgs: StreamFrameArgs) => Promise<void>) | null>(null);
  const transcriptFramesRef = useRef<Map<number, string>>(new Map());

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
            return;
          }
          if (payload.eventType === 'partial_transcript' && typeof payload.transcriptText === 'string') {
            setPartialTranscript(payload.transcriptText);
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
    const sound = playbackRef.current;
    playbackRef.current = null;
    if (sound) {
      try {
        await sound.stopAsync();
      } catch {
        // Ignore stop errors during interruption.
      }
      try {
        await sound.unloadAsync();
      } catch {
        // Ignore unload errors during interruption.
      }
    }
  }, []);

  const openSession = useCallback(async () => {
    const existing = activeSessionRef.current;
    if (existing) {
      return existing;
    }

    const backendConversationId = isLikelyBackendConversationId(args.conversationId)
      ? args.conversationId
      : undefined;
    const opened = await l4yercak3Client.ai.voice.openSession({
      conversationId: backendConversationId,
      requestedProviderId: args.requestedProviderId,
      requestedVoiceId: args.requestedVoiceId,
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
    activeSessionRef.current = nextSession;
    connectWebsocket(nextSession);
    return nextSession;
  }, [args.conversationId, args.requestedProviderId, args.requestedVoiceId, connectWebsocket]);

  const closeSession = useCallback(async (reason?: string) => {
    const active = activeSessionRef.current;
    activeSessionRef.current = null;
    disconnectRealtime();
    setPartialTranscript('');
    transcriptFramesRef.current.clear();
    await stopPlayback();
    if (!active) {
      return;
    }
    try {
      await l4yercak3Client.ai.voice.closeSession({
        conversationId: active.conversationId,
        interviewSessionId: active.interviewSessionId,
        voiceSessionId: active.voiceSessionId,
        activeProviderId: active.providerId,
        reason: reason || 'voice_mode_close',
      });
    } catch (error) {
      console.warn('Failed to close voice session:', error);
    }
  }, [disconnectRealtime, stopPlayback]);

  const transcribeRecording = useCallback(async (transcribeArgs: TranscribeArgs) => {
    const active = await openSession();
    setPartialTranscript('Listening...');
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
    transcribeArgs.onPartial?.(transcribeResult.text);

    return {
      text: transcribeResult.text,
      session: active,
      providerId: transcribeResult.providerId,
      nativeBridge: transcribeResult.nativeBridge,
      health: transcribeResult.health,
    };
  }, [args.requestedProviderId, args.requestedVoiceId, openSession, transportSelection.effectiveMode]);

  const ingestStreamingFrame = useCallback(async (frameArgs: StreamFrameArgs) => {
    if (!frameIngestQueueRef.current) {
      frameIngestQueueRef.current = createDeterministicFrameQueue<StreamFrameArgs>(async (queueFrameArgs) => {
        const active = await openSession();
        const audioBase64 = await fileUriToBase64(queueFrameArgs.uri);
        const policy = resolveFrameStreamingPolicy({
          transportMode: transportSelection.effectiveMode,
          isRealtimeConnected,
        });

        if (
          policy.shouldSendRealtimeEnvelope
          && websocketRef.current
          && websocketRef.current.readyState === WebSocket.OPEN
        ) {
          const envelope = buildVoiceAudioFrameEnvelope({
            liveSessionId: args.liveSessionId || `mobile_live_${Date.now().toString(36)}`,
            voiceSessionId: active.voiceSessionId,
            interviewSessionId: active.interviewSessionId,
            sequence: queueFrameArgs.sequence,
            audioChunkBase64: audioBase64,
            frameDurationMs: queueFrameArgs.frameDurationMs || 20,
          });
          websocketRef.current.send(
            JSON.stringify({
              ...envelope,
              type: 'audio_chunk',
              audioBase64,
              mimeType: queueFrameArgs.mimeType || 'audio/m4a',
            })
          );
        }

        if (!policy.shouldUseHttpTranscription) {
          return;
        }

        const transcribeResult = await l4yercak3Client.ai.voice.transcribe({
          conversationId: active.conversationId,
          interviewSessionId: active.interviewSessionId,
          voiceSessionId: active.voiceSessionId,
          audioBase64,
          mimeType: queueFrameArgs.mimeType || 'audio/m4a',
          requestedProviderId: args.requestedProviderId,
          requestedVoiceId: args.requestedVoiceId,
          language: queueFrameArgs.language,
        });

        if (!transcribeResult.success) {
          throw new Error(transcribeResult.error || 'Voice frame transcription failed.');
        }

        if (transcribeResult.text) {
          const merged = mergeTranscriptFrame(
            transcriptFramesRef.current,
            queueFrameArgs.sequence,
            transcribeResult.text
          );
          if (merged) {
            setPartialTranscript(merged);
            queueFrameArgs.onPartial?.(merged);
          }
        }
      });
    }

    try {
      await frameIngestQueueRef.current(frameArgs);
    } catch (error) {
      console.warn('Voice frame ingest failed:', error);
      throw error;
    }
  }, [
    args.liveSessionId,
    args.requestedProviderId,
    args.requestedVoiceId,
    isRealtimeConnected,
    openSession,
    transportSelection.effectiveMode,
  ]);

  const synthesizeAndPlay = useCallback(async (text: string) => {
    if (!text.trim()) {
      return;
    }
    const active = await openSession();
    await stopPlayback();
    const synthesis = await l4yercak3Client.ai.voice.synthesize({
      conversationId: active.conversationId,
      interviewSessionId: active.interviewSessionId,
      voiceSessionId: active.voiceSessionId,
      text,
      requestedProviderId: args.requestedProviderId,
      requestedVoiceId: args.requestedVoiceId,
    });

    if (!synthesis.success) {
      throw new Error(synthesis.error || 'Voice synthesis failed.');
    }

    if (synthesis.audioBase64 && synthesis.mimeType) {
      try {
        const { sound } = await Audio.Sound.createAsync(
          {
            uri: `data:${synthesis.mimeType};base64,${synthesis.audioBase64}`,
          },
          { shouldPlay: true }
        );
        playbackRef.current = sound;
        sound.setOnPlaybackStatusUpdate((status) => {
          if (!status.isLoaded || status.didJustFinish) {
            if (playbackRef.current === sound) {
              playbackRef.current = null;
            }
          }
        });
        return;
      } catch (error) {
        console.warn('Provider audio playback failed, falling back to speech synthesis:', error);
      }
    }

    const fallbackText = synthesis.fallbackText || text;
    Speech.stop();
    Speech.speak(fallbackText, {
      voice: args.requestedVoiceId,
    });
  }, [args.requestedProviderId, args.requestedVoiceId, openSession, stopPlayback]);

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
    clearPartialTranscript: () => {
      transcriptFramesRef.current.clear();
      setPartialTranscript('');
    },
    getActiveSession: () => activeSessionRef.current,
  };
}
