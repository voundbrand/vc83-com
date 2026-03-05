import { describe, expect, it } from "vitest";
import {
  VOICE_TRANSPORT_EVENT_TYPE_VALUES,
  VOICE_TRANSPORT_MODE_VALUES,
  assertVoiceTransportEnvelope,
  type VoiceTransportEnvelopeContract,
} from "../../../convex/schemas/aiSchemas";

const baseEnvelope = {
  contractVersion: "voice_transport_v1" as const,
  transportMode: "websocket" as const,
  liveSessionId: "live_123",
  voiceSessionId: "voice_123",
  interviewSessionId: "interview_123",
  sequence: 2,
  previousSequence: 1,
  timestampMs: 1_700_000_000_000,
};

describe("voice transport envelope contract", () => {
  it("locks canonical event and transport mode enums", () => {
    expect(VOICE_TRANSPORT_MODE_VALUES).toEqual(["webrtc", "websocket"]);
    expect(VOICE_TRANSPORT_EVENT_TYPE_VALUES).toEqual([
      "session_open",
      "audio_chunk",
      "partial_transcript",
      "final_transcript",
      "assistant_audio_chunk",
      "assistant_audio_final",
      "barge_in",
      "session_close",
      "heartbeat",
      "error",
    ]);
  });

  it("accepts valid audio_chunk envelopes with explicit pcm contract", () => {
    const envelope: VoiceTransportEnvelopeContract = {
      ...baseEnvelope,
      eventType: "audio_chunk",
      pcm: {
        encoding: "pcm_s16le",
        sampleRateHz: 24_000,
        channels: 1,
        frameDurationMs: 20,
      },
      audioChunkBase64: "AAAABBBB",
    };

    expect(() => assertVoiceTransportEnvelope(envelope)).not.toThrow();
  });

  it("rejects audio_chunk envelopes with empty chunk payload", () => {
    const envelope = {
      ...baseEnvelope,
      eventType: "audio_chunk",
      pcm: {
        encoding: "pcm_s16le",
        sampleRateHz: 24_000,
        channels: 1,
        frameDurationMs: 20,
      },
      audioChunkBase64: "   ",
    } as unknown as VoiceTransportEnvelopeContract;

    expect(() => assertVoiceTransportEnvelope(envelope)).toThrow(/audioChunkBase64/);
  });

  it("rejects transcript envelopes with empty transcriptText", () => {
    const envelope = {
      ...baseEnvelope,
      eventType: "partial_transcript",
      transcriptText: " ",
    } as unknown as VoiceTransportEnvelopeContract;

    expect(() => assertVoiceTransportEnvelope(envelope)).toThrow(/transcriptText/);
  });

  it("rejects assistant_audio_final envelopes without assistantMessageId", () => {
    const envelope = {
      ...baseEnvelope,
      eventType: "assistant_audio_final",
      assistantMessageId: " ",
    } as unknown as VoiceTransportEnvelopeContract;

    expect(() => assertVoiceTransportEnvelope(envelope)).toThrow(/assistantMessageId/);
  });

  it("rejects invalid sequencing and pcm numeric constraints", () => {
    const invalidSequenceEnvelope = {
      ...baseEnvelope,
      eventType: "session_open",
      previousSequence: 2,
    } as unknown as VoiceTransportEnvelopeContract;
    expect(() => assertVoiceTransportEnvelope(invalidSequenceEnvelope)).toThrow(
      /previousSequence/
    );

    const invalidPcmEnvelope = {
      ...baseEnvelope,
      eventType: "assistant_audio_chunk",
      pcm: {
        encoding: "pcm_s16le",
        sampleRateHz: 0,
        channels: 1,
        frameDurationMs: 20,
      },
      audioChunkBase64: "AAAABBBB",
      assistantMessageId: "assistant_msg_1",
    } as unknown as VoiceTransportEnvelopeContract;
    expect(() => assertVoiceTransportEnvelope(invalidPcmEnvelope)).toThrow(/pcm/);
  });

  it("rejects non-contract pcm sampleRateHz values for voice_transport_v1 envelopes", () => {
    const nonContractSampleRateEnvelope = {
      ...baseEnvelope,
      eventType: "assistant_audio_chunk",
      pcm: {
        encoding: "pcm_s16le",
        sampleRateHz: 16_000,
        channels: 1,
        frameDurationMs: 20,
      },
      audioChunkBase64: "AAAABBBB",
      assistantMessageId: "assistant_msg_2",
    } as unknown as VoiceTransportEnvelopeContract;

    expect(() => assertVoiceTransportEnvelope(nonContractSampleRateEnvelope)).toThrow(
      /sampleRateHz=24000/
    );
  });
});
