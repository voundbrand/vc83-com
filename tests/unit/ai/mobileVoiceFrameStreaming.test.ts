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
    expect(envelope.pcm.frameDurationMs).toBe(40);
  });

  it("merges partial transcript updates with deterministic cadence and ordering", () => {
    const bySequence = new Map<number, string>();
    expect(mergeTranscriptFrame(bySequence, 2, "third")).toBe("third");
    expect(mergeTranscriptFrame(bySequence, 0, "first")).toBe("first third");
    expect(mergeTranscriptFrame(bySequence, 1, "second")).toBe("first second third");
  });

  it("preserves fallback behavior when realtime transport is unavailable", () => {
    const realtimePolicy = resolveFrameStreamingPolicy({
      transportMode: "websocket",
      isRealtimeConnected: true,
    });
    expect(realtimePolicy.shouldSendRealtimeEnvelope).toBe(true);
    expect(realtimePolicy.shouldUseHttpTranscription).toBe(true);

    const fallbackPolicy = resolveFrameStreamingPolicy({
      transportMode: "chunked_fallback",
      isRealtimeConnected: false,
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
