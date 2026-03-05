import { describe, expect, it } from "vitest";
import {
  assertVoiceTransportEnvelope,
  type VoiceTransportEnvelopeContract,
} from "../../../convex/schemas/aiSchemas";
import {
  resolveBrowserFallbackTranscriptText,
  resolveVoiceAssistantRelay,
  resolveVoiceTransportSequenceDecision,
} from "../../../convex/ai/voiceRuntime";

function baseEnvelope(sequence: number): VoiceTransportEnvelopeContract {
  return {
    contractVersion: "voice_transport_v1",
    transportMode: "websocket",
    eventType: "partial_transcript",
    liveSessionId: "live_voice_1",
    voiceSessionId: "voice_rt_1",
    interviewSessionId: "interview_rt_1",
    sequence,
    timestampMs: 1_710_000_000_000 + sequence,
    transcriptText: "partial text",
  };
}

describe("voice runtime websocket ingest sequencing", () => {
  it("accepts ordered partial/final transcript event flow", () => {
    const acceptedSequences = new Set<number>();
    let lastAcceptedSequence: number | null = null;

    const partialEnvelope = baseEnvelope(0);
    assertVoiceTransportEnvelope(partialEnvelope);
    const partialDecision = resolveVoiceTransportSequenceDecision({
      sequence: partialEnvelope.sequence,
      acceptedSequences,
      lastAcceptedSequence,
    });
    expect(partialDecision.decision).toBe("accepted");
    acceptedSequences.add(partialEnvelope.sequence);
    lastAcceptedSequence = partialEnvelope.sequence;

    const finalEnvelope: VoiceTransportEnvelopeContract = {
      ...baseEnvelope(1),
      eventType: "final_transcript",
      transcriptText: "final text commit",
      previousSequence: 0,
    };
    assertVoiceTransportEnvelope(finalEnvelope);
    const finalDecision = resolveVoiceTransportSequenceDecision({
      sequence: finalEnvelope.sequence,
      acceptedSequences,
      lastAcceptedSequence,
    });
    expect(finalDecision.decision).toBe("accepted");
  });

  it("handles duplicate/replay and gap failure paths deterministically", () => {
    const acceptedSequences = new Set<number>([0, 1, 2]);
    const duplicate = resolveVoiceTransportSequenceDecision({
      sequence: 2,
      acceptedSequences,
      lastAcceptedSequence: 2,
    });
    expect(duplicate.decision).toBe("duplicate_replay");

    const replay = resolveVoiceTransportSequenceDecision({
      sequence: 1,
      acceptedSequences,
      lastAcceptedSequence: 2,
    });
    expect(replay.decision).toBe("duplicate_replay");

    const gap = resolveVoiceTransportSequenceDecision({
      sequence: 4,
      acceptedSequences,
      lastAcceptedSequence: 2,
    });
    expect(gap).toEqual({
      decision: "gap_detected",
      expectedSequence: 3,
    });
  });

  it("normalizes browser fallback transcript hints for websocket audio chunks", () => {
    expect(
      resolveBrowserFallbackTranscriptText({
        eventType: "audio_chunk",
        transcriptText: " local fallback ",
      })
    ).toBe("local fallback");
    expect(
      resolveBrowserFallbackTranscriptText({
        eventType: "audio_chunk",
        transcriptText: " ",
      })
    ).toBeNull();
  });

  it("keeps assistant audio chunk/final relay ordering deterministic", () => {
    const acceptedSequences = new Set<number>();
    let lastAcceptedSequence: number | null = null;

    const chunkEnvelope: VoiceTransportEnvelopeContract = {
      contractVersion: "voice_transport_v1",
      transportMode: "websocket",
      eventType: "assistant_audio_chunk",
      liveSessionId: "live_voice_1",
      voiceSessionId: "voice_rt_1",
      interviewSessionId: "interview_rt_1",
      sequence: 0,
      timestampMs: 1_710_000_000_000,
      assistantMessageId: "assistant_msg_order_1",
      audioChunkBase64: "AAAA",
      pcm: {
        encoding: "pcm_s16le",
        sampleRateHz: 24000,
        channels: 1,
        frameDurationMs: 20,
      },
    };
    assertVoiceTransportEnvelope(chunkEnvelope);

    const chunkDecision = resolveVoiceTransportSequenceDecision({
      sequence: chunkEnvelope.sequence,
      acceptedSequences,
      lastAcceptedSequence,
    });
    expect(chunkDecision.decision).toBe("accepted");
    const chunkRelay = resolveVoiceAssistantRelay({
      sourceEnvelope: chunkEnvelope,
      relayEventsBySequence: {},
    });
    expect(chunkRelay.relayEvents).toEqual([chunkEnvelope]);
    acceptedSequences.add(chunkEnvelope.sequence);
    lastAcceptedSequence = chunkEnvelope.sequence;

    const finalEnvelope: VoiceTransportEnvelopeContract = {
      ...chunkEnvelope,
      eventType: "assistant_audio_final",
      sequence: 1,
      previousSequence: 0,
      timestampMs: 1_710_000_000_001,
      audioChunkBase64: undefined,
      pcm: undefined,
    };
    assertVoiceTransportEnvelope(finalEnvelope);
    const finalDecision = resolveVoiceTransportSequenceDecision({
      sequence: finalEnvelope.sequence,
      acceptedSequences,
      lastAcceptedSequence,
    });
    expect(finalDecision.decision).toBe("accepted");
    const finalRelay = resolveVoiceAssistantRelay({
      sourceEnvelope: finalEnvelope,
      relayEventsBySequence: {
        "0": chunkRelay.relayEvents,
      },
    });
    expect(finalRelay.relayEvents).toEqual([finalEnvelope]);
  });

  it("handles barge-in cancellation replay paths without duplicate finalization events", () => {
    const baseChunk: VoiceTransportEnvelopeContract = {
      contractVersion: "voice_transport_v1",
      transportMode: "websocket",
      eventType: "assistant_audio_chunk",
      liveSessionId: "live_voice_1",
      voiceSessionId: "voice_rt_1",
      interviewSessionId: "interview_rt_1",
      sequence: 12,
      previousSequence: 11,
      timestampMs: 1_710_000_000_012,
      assistantMessageId: "assistant_msg_cancel_1",
      audioChunkBase64: "BBBB",
      pcm: {
        encoding: "pcm_s16le",
        sampleRateHz: 24000,
        channels: 1,
        frameDurationMs: 20,
      },
    };
    assertVoiceTransportEnvelope(baseChunk);
    const bargeInEnvelope: VoiceTransportEnvelopeContract = {
      contractVersion: "voice_transport_v1",
      transportMode: "websocket",
      eventType: "barge_in",
      liveSessionId: "live_voice_1",
      voiceSessionId: "voice_rt_1",
      interviewSessionId: "interview_rt_1",
      sequence: 13,
      previousSequence: 12,
      timestampMs: 1_710_000_000_013,
    };
    assertVoiceTransportEnvelope(bargeInEnvelope);

    const firstRelay = resolveVoiceAssistantRelay({
      sourceEnvelope: bargeInEnvelope,
      relayEventsBySequence: {
        "12": [baseChunk],
      },
    });
    expect(firstRelay.relayEvents.map((event) => event.eventType)).toEqual([
      "barge_in",
      "assistant_audio_final",
    ]);

    const secondRelay = resolveVoiceAssistantRelay({
      sourceEnvelope: {
        ...bargeInEnvelope,
        sequence: 14,
        previousSequence: 13,
        timestampMs: 1_710_000_000_014,
      },
      relayEventsBySequence: {
        "12": [baseChunk],
        "13": firstRelay.relayEvents,
      },
    });
    expect(secondRelay.relayEvents.map((event) => event.eventType)).toEqual([
      "barge_in",
    ]);
  });

  it("auto-heals unconventional assistant stream ordering by finalizing previous stream", () => {
    const switchedRelay = resolveVoiceAssistantRelay({
      sourceEnvelope: {
        contractVersion: "voice_transport_v1",
        transportMode: "websocket",
        eventType: "assistant_audio_chunk",
        liveSessionId: "live_voice_1",
        voiceSessionId: "voice_rt_1",
        interviewSessionId: "interview_rt_1",
        sequence: 21,
        previousSequence: 20,
        timestampMs: 1_710_000_000_021,
        assistantMessageId: "assistant_msg_next",
        audioChunkBase64: "CCCC",
        pcm: {
          encoding: "pcm_s16le",
          sampleRateHz: 24000,
          channels: 1,
          frameDurationMs: 20,
        },
      },
      relayEventsBySequence: {
        "20": [
          {
            contractVersion: "voice_transport_v1",
            transportMode: "websocket",
            eventType: "assistant_audio_chunk",
            liveSessionId: "live_voice_1",
            voiceSessionId: "voice_rt_1",
            interviewSessionId: "interview_rt_1",
            sequence: 20,
            timestampMs: 1_710_000_000_020,
            assistantMessageId: "assistant_msg_prev",
            audioChunkBase64: "BBBB",
            pcm: {
              encoding: "pcm_s16le",
              sampleRateHz: 24000,
              channels: 1,
              frameDurationMs: 20,
            },
          },
        ],
      },
    });

    expect(switchedRelay.relayEvents.map((event) => event.eventType)).toEqual([
      "assistant_audio_final",
      "assistant_audio_chunk",
    ]);
    expect(switchedRelay.cancellationAssistantMessageId).toBe("assistant_msg_prev");
  });
});
