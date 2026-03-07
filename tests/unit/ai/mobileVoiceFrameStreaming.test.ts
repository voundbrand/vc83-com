import { describe, expect, it, vi } from "vitest";

import {
  buildVoiceAudioFrameEnvelope,
  createDeterministicFrameQueue,
  mergeTranscriptFrame,
  resolveFrameStreamingPolicy,
} from "../../../apps/operator-mobile/src/lib/voice/frameStreaming";

describe("mobile voice frame streaming runtime", () => {
  it("builds voice_transport_v1 audio frame envelopes for streaming happy path", () => {
    const envelope = buildVoiceAudioFrameEnvelope({
      liveSessionId: "mobile_live_1",
      voiceSessionId: "voice_1",
      interviewSessionId: "interview_1",
      sequence: 3,
      audioChunkBase64: "AAAABBBB",
      frameDurationMs: 40,
    });

    expect(envelope.contractVersion).toBe("voice_transport_v1");
    expect(envelope.eventType).toBe("audio_chunk");
    expect(envelope.transportMode).toBe("websocket");
    expect(envelope.sequence).toBe(3);
    expect(envelope.previousSequence).toBe(2);
    expect(envelope.pcm.sampleRateHz).toBe(24_000);
    expect(envelope.pcm.frameDurationMs).toBe(40);
  });

  it("merges partial transcript updates with deterministic cadence and ordering", () => {
    const bySequence = new Map<number, string>();
    expect(mergeTranscriptFrame(bySequence, 2, "third")).toBe("third");
    expect(mergeTranscriptFrame(bySequence, 0, "first")).toBe("first third");
    expect(mergeTranscriptFrame(bySequence, 1, "second")).toBe("first second third");
  });

  it("preserves fallback behavior when realtime transport is unavailable", () => {
    const realtimeStreamingPolicy = resolveFrameStreamingPolicy({
      transportMode: "websocket",
      isRealtimeConnected: true,
      isFinalFrame: false,
    });
    expect(realtimeStreamingPolicy.shouldSendRealtimeEnvelope).toBe(true);
    expect(realtimeStreamingPolicy.shouldUseHttpTranscription).toBe(false);

    const realtimeFinalPolicy = resolveFrameStreamingPolicy({
      transportMode: "websocket",
      isRealtimeConnected: true,
      isFinalFrame: true,
    });
    expect(realtimeFinalPolicy.shouldSendRealtimeEnvelope).toBe(true);
    expect(realtimeFinalPolicy.shouldUseHttpTranscription).toBe(false);

    const websocketUnhealthyPolicy = resolveFrameStreamingPolicy({
      transportMode: "websocket",
      isRealtimeConnected: true,
      isRealtimeRelayHealthy: false,
      isFinalFrame: true,
    });
    expect(websocketUnhealthyPolicy.shouldSendRealtimeEnvelope).toBe(false);
    expect(websocketUnhealthyPolicy.shouldUseHttpTranscription).toBe(true);

    const webrtcPolicy = resolveFrameStreamingPolicy({
      transportMode: "webrtc",
      isRealtimeConnected: true,
      isFinalFrame: false,
    });
    expect(webrtcPolicy.shouldSendRealtimeEnvelope).toBe(false);
    expect(webrtcPolicy.shouldUseHttpTranscription).toBe(true);

    const fallbackPolicy = resolveFrameStreamingPolicy({
      transportMode: "chunked_fallback",
      isRealtimeConnected: false,
      isFinalFrame: false,
    });
    expect(fallbackPolicy.shouldSendRealtimeEnvelope).toBe(false);
    expect(fallbackPolicy.shouldUseHttpTranscription).toBe(true);
  });

  it("handles frame queue errors deterministically without blocking later frames", async () => {
    const calls: number[] = [];
    const handler = vi.fn(async (sequence: number) => {
      calls.push(sequence);
      if (sequence === 1) {
        throw new Error("frame_failed");
      }
    });
    const enqueue = createDeterministicFrameQueue(handler);

    await enqueue(0);
    await expect(enqueue(1)).rejects.toThrow("frame_failed");
    await enqueue(2);

    expect(calls).toEqual([0, 1, 2]);
  });
});
