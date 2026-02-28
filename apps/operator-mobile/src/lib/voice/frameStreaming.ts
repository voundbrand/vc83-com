import type { EffectiveVoiceTransportMode } from './transport';

export type VoiceAudioFrameEnvelope = {
  contractVersion: 'voice_transport_v1';
  transportMode: 'webrtc' | 'websocket';
  eventType: 'audio_chunk';
  liveSessionId: string;
  voiceSessionId: string;
  interviewSessionId: string;
  sequence: number;
  previousSequence?: number;
  timestampMs: number;
  pcm: {
    encoding: 'pcm_s16le';
    sampleRateHz: number;
    channels: number;
    frameDurationMs: number;
  };
  audioChunkBase64: string;
  transcriptText?: string;
};

export function buildVoiceAudioFrameEnvelope(args: {
  liveSessionId: string;
  voiceSessionId: string;
  interviewSessionId: string;
  sequence: number;
  audioChunkBase64: string;
  frameDurationMs: number;
  transcriptText?: string;
}): VoiceAudioFrameEnvelope {
  return {
    contractVersion: 'voice_transport_v1',
    transportMode: 'websocket',
    eventType: 'audio_chunk',
    liveSessionId: args.liveSessionId,
    voiceSessionId: args.voiceSessionId,
    interviewSessionId: args.interviewSessionId,
    sequence: args.sequence,
    previousSequence: args.sequence > 0 ? args.sequence - 1 : undefined,
    timestampMs: Date.now(),
    pcm: {
      encoding: 'pcm_s16le',
      sampleRateHz: 16_000,
      channels: 1,
      frameDurationMs: Math.max(20, Math.floor(args.frameDurationMs || 20)),
    },
    audioChunkBase64: args.audioChunkBase64,
    transcriptText: args.transcriptText?.trim() || undefined,
  };
}

export function mergeTranscriptFrame(
  transcriptFramesBySequence: Map<number, string>,
  sequence: number,
  partialText: string
): string {
  const normalized = partialText.trim();
  if (!normalized) {
    return Array.from(transcriptFramesBySequence.entries())
      .sort(([a], [b]) => a - b)
      .map(([, text]) => text)
      .join(' ')
      .trim();
  }

  transcriptFramesBySequence.set(sequence, normalized);
  return Array.from(transcriptFramesBySequence.entries())
    .sort(([a], [b]) => a - b)
    .map(([, text]) => text)
    .join(' ')
    .trim();
}

export function resolveFrameStreamingPolicy(args: {
  transportMode: EffectiveVoiceTransportMode;
  isRealtimeConnected: boolean;
}) {
  if (args.transportMode === 'websocket' && args.isRealtimeConnected) {
    return {
      shouldSendRealtimeEnvelope: true,
      shouldUseHttpTranscription: true,
    };
  }
  if (args.transportMode === 'webrtc') {
    return {
      shouldSendRealtimeEnvelope: false,
      shouldUseHttpTranscription: true,
    };
  }
  return {
    shouldSendRealtimeEnvelope: false,
    shouldUseHttpTranscription: true,
  };
}

export function createDeterministicFrameQueue<TArgs>(
  handler: (args: TArgs) => Promise<void>
) {
  let chain: Promise<void> = Promise.resolve();
  return (args: TArgs) => {
    const task = chain.then(() => handler(args));
    chain = task.catch(() => undefined);
    return task;
  };
}
