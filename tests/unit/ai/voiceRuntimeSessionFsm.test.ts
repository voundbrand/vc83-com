import { describe, expect, it } from "vitest";
import {
  VOICE_TRANSPORT_WEBSOCKET_INGEST_PHASE_ID,
  VOICE_RUNTIME_SESSION_FSM_STATE_VALUES,
  isAllowedVoiceRuntimeSessionTransition,
  isVoiceRuntimeSessionStale,
  resolveBrowserFallbackTranscriptText,
  resolveVoiceAssistantRelay,
  resolveVoiceAssistantStreamRelayState,
  resolveVoiceRealtimeTurnOrchestrationDecision,
  resolveVoiceTransportSequenceDecision,
} from "../../../convex/ai/voiceRuntime";
import type { VoiceTransportEnvelopeContract } from "../../../convex/schemas/aiSchemas";

describe("voice runtime session fsm", () => {
  it("locks canonical session lifecycle states", () => {
    expect(VOICE_RUNTIME_SESSION_FSM_STATE_VALUES).toEqual([
      "opening",
      "open",
      "degraded",
      "closing",
      "closed",
      "error",
    ]);
  });

  it("allows valid lifecycle transitions", () => {
    expect(
      isAllowedVoiceRuntimeSessionTransition({
        toState: "opening",
      })
    ).toBe(true);
    expect(
      isAllowedVoiceRuntimeSessionTransition({
        fromState: "opening",
        toState: "open",
      })
    ).toBe(true);
    expect(
      isAllowedVoiceRuntimeSessionTransition({
        fromState: "open",
        toState: "closing",
      })
    ).toBe(true);
    expect(
      isAllowedVoiceRuntimeSessionTransition({
        fromState: "closing",
        toState: "closed",
      })
    ).toBe(true);
  });

  it("rejects invalid lifecycle transitions", () => {
    expect(
      isAllowedVoiceRuntimeSessionTransition({
        fromState: "open",
        toState: "opening",
      })
    ).toBe(false);
    expect(
      isAllowedVoiceRuntimeSessionTransition({
        fromState: "closed",
        toState: "closing",
      })
    ).toBe(false);
    expect(
      isAllowedVoiceRuntimeSessionTransition({
        toState: "degraded",
      })
    ).toBe(false);
  });

  it("marks active sessions stale but never stale-closes closed sessions", () => {
    expect(
      isVoiceRuntimeSessionStale({
        snapshot: {
          voiceSessionId: "voice_1",
          state: "open",
          occurredAt: 1_000,
        },
        nowMs: 1_000 + 6 * 60 * 1000,
      })
    ).toBe(true);
    expect(
      isVoiceRuntimeSessionStale({
        snapshot: {
          voiceSessionId: "voice_1",
          state: "closed",
          occurredAt: 1_000,
        },
        nowMs: 1_000 + 20 * 60 * 1000,
      })
    ).toBe(false);
  });

  it("uses deterministic voice transport ingest sequence ordering decisions", () => {
    const accepted = new Set<number>([0, 1, 2]);
    expect(
      resolveVoiceTransportSequenceDecision({
        sequence: 3,
        acceptedSequences: accepted,
        lastAcceptedSequence: 2,
      })
    ).toEqual({
      decision: "accepted",
      expectedSequence: 3,
    });
    expect(
      resolveVoiceTransportSequenceDecision({
        sequence: 2,
        acceptedSequences: accepted,
        lastAcceptedSequence: 2,
      })
    ).toEqual({
      decision: "duplicate_replay",
      expectedSequence: 3,
    });
    expect(
      resolveVoiceTransportSequenceDecision({
        sequence: 5,
        acceptedSequences: accepted,
        lastAcceptedSequence: 2,
      })
    ).toEqual({
      decision: "gap_detected",
      expectedSequence: 3,
    });
  });

  it("locks websocket ingest adaptive phase identifier", () => {
    expect(VOICE_TRANSPORT_WEBSOCKET_INGEST_PHASE_ID).toBe(
      "voice_transport_websocket_ingest_v1"
    );
  });

  it("triggers realtime assistant turn only on accepted final transcript EOU", () => {
    expect(
      resolveVoiceRealtimeTurnOrchestrationDecision({
        sequenceDecision: "accepted",
        eventType: "final_transcript",
        transcriptText: "  hello world  ",
        idempotentReplay: false,
        persistedFinalTranscript: true,
      }),
    ).toEqual({
      shouldTriggerAssistantTurn: true,
      interrupted: false,
      reason: "final_transcript_eou",
      transcriptText: "hello world",
    });
  });

  it("suppresses realtime assistant turn on non-EOU, replay, and barge-in events", () => {
    expect(
      resolveVoiceRealtimeTurnOrchestrationDecision({
        sequenceDecision: "accepted",
        eventType: "partial_transcript",
        transcriptText: "partial",
        persistedFinalTranscript: false,
      }),
    ).toEqual({
      shouldTriggerAssistantTurn: false,
      interrupted: false,
      reason: "waiting_for_eou",
      transcriptText: null,
    });

    expect(
      resolveVoiceRealtimeTurnOrchestrationDecision({
        sequenceDecision: "accepted",
        eventType: "final_transcript",
        transcriptText: "final",
        idempotentReplay: true,
        persistedFinalTranscript: true,
      }),
    ).toEqual({
      shouldTriggerAssistantTurn: false,
      interrupted: false,
      reason: "idempotent_replay",
      transcriptText: null,
    });

    expect(
      resolveVoiceRealtimeTurnOrchestrationDecision({
        sequenceDecision: "accepted",
        eventType: "barge_in",
        persistedFinalTranscript: false,
      }),
    ).toEqual({
      shouldTriggerAssistantTurn: false,
      interrupted: true,
      reason: "barge_in_interrupt",
      transcriptText: null,
    });
  });

  it("uses client transcript hints for browser audio_chunk fallback", () => {
    expect(
      resolveBrowserFallbackTranscriptText({
        eventType: "audio_chunk",
        transcriptText: "  local partial from device  ",
      })
    ).toBe("local partial from device");
    expect(
      resolveBrowserFallbackTranscriptText({
        eventType: "audio_chunk",
        transcriptText: "   ",
      })
    ).toBeNull();
    expect(
      resolveBrowserFallbackTranscriptText({
        eventType: "final_transcript",
        transcriptText: "ignored",
      })
    ).toBeNull();
  });

  it("relays assistant audio chunks/final events in deterministic order", () => {
    const chunk: VoiceTransportEnvelopeContract = {
      contractVersion: "voice_transport_v1",
      transportMode: "websocket",
      eventType: "assistant_audio_chunk",
      liveSessionId: "live_voice_1",
      voiceSessionId: "voice_rt_1",
      interviewSessionId: "interview_rt_1",
      sequence: 5,
      previousSequence: 4,
      timestampMs: 1_710_000_000_005,
      assistantMessageId: "assistant_msg_1",
      audioChunkBase64: "AAAA",
      pcm: {
        encoding: "pcm_s16le",
        sampleRateHz: 16000,
        channels: 1,
        frameDurationMs: 20,
      },
    };

    const chunkRelay = resolveVoiceAssistantRelay({
      sourceEnvelope: chunk,
      relayEventsBySequence: {},
    });
    expect(chunkRelay.relayEvents).toEqual([chunk]);

    const finalEnvelope: VoiceTransportEnvelopeContract = {
      ...chunk,
      eventType: "assistant_audio_final",
      sequence: 6,
      previousSequence: 5,
      audioChunkBase64: undefined,
      pcm: undefined,
    };
    const finalRelay = resolveVoiceAssistantRelay({
      sourceEnvelope: finalEnvelope,
      relayEventsBySequence: {
        "5": chunkRelay.relayEvents,
      },
    });
    expect(finalRelay.relayEvents).toEqual([finalEnvelope]);
  });

  it("emits one terminal assistant finalization for barge-in and suppresses duplicates", () => {
    const activeChunk: VoiceTransportEnvelopeContract = {
      contractVersion: "voice_transport_v1",
      transportMode: "websocket",
      eventType: "assistant_audio_chunk",
      liveSessionId: "live_voice_1",
      voiceSessionId: "voice_rt_1",
      interviewSessionId: "interview_rt_1",
      sequence: 10,
      previousSequence: 9,
      timestampMs: 1_710_000_000_010,
      assistantMessageId: "assistant_msg_interrupt",
      audioChunkBase64: "BBBB",
      pcm: {
        encoding: "pcm_s16le",
        sampleRateHz: 16000,
        channels: 1,
        frameDurationMs: 20,
      },
    };
    const bargeIn: VoiceTransportEnvelopeContract = {
      contractVersion: "voice_transport_v1",
      transportMode: "websocket",
      eventType: "barge_in",
      liveSessionId: "live_voice_1",
      voiceSessionId: "voice_rt_1",
      interviewSessionId: "interview_rt_1",
      sequence: 11,
      previousSequence: 10,
      timestampMs: 1_710_000_000_011,
    };

    const firstCancel = resolveVoiceAssistantRelay({
      sourceEnvelope: bargeIn,
      relayEventsBySequence: {
        "10": [activeChunk],
      },
    });

    expect(firstCancel.relayEvents).toHaveLength(2);
    expect(firstCancel.relayEvents[0]?.eventType).toBe("barge_in");
    expect(firstCancel.relayEvents[1]?.eventType).toBe("assistant_audio_final");
    expect(firstCancel.cancellationAssistantMessageId).toBe("assistant_msg_interrupt");

    const secondCancel = resolveVoiceAssistantRelay({
      sourceEnvelope: {
        ...bargeIn,
        sequence: 12,
        previousSequence: 11,
        timestampMs: 1_710_000_000_012,
      },
      relayEventsBySequence: {
        "10": [activeChunk],
        "11": firstCancel.relayEvents,
      },
    });

    expect(secondCancel.relayEvents).toEqual([
      {
        ...bargeIn,
        sequence: 12,
        previousSequence: 11,
        timestampMs: 1_710_000_000_012,
      },
    ]);
    expect(secondCancel.cancellationAssistantMessageId).toBeNull();
  });

  it("drops assistant chunk replay when chunk arrives after finalization", () => {
    const finalizedStateRelay = resolveVoiceAssistantRelay({
      sourceEnvelope: {
        contractVersion: "voice_transport_v1",
        transportMode: "websocket",
        eventType: "assistant_audio_final",
        liveSessionId: "live_voice_1",
        voiceSessionId: "voice_rt_1",
        interviewSessionId: "interview_rt_1",
        sequence: 20,
        timestampMs: 1_710_000_000_020,
        assistantMessageId: "assistant_msg_done",
      },
      relayEventsBySequence: {
        "19": [
          {
            contractVersion: "voice_transport_v1",
            transportMode: "websocket",
            eventType: "assistant_audio_chunk",
            liveSessionId: "live_voice_1",
            voiceSessionId: "voice_rt_1",
            interviewSessionId: "interview_rt_1",
            sequence: 19,
            timestampMs: 1_710_000_000_019,
            assistantMessageId: "assistant_msg_done",
            audioChunkBase64: "CCCC",
            pcm: {
              encoding: "pcm_s16le",
              sampleRateHz: 16000,
              channels: 1,
              frameDurationMs: 20,
            },
          },
        ],
      },
    });
    expect(finalizedStateRelay.relayEvents).toHaveLength(1);

    const lateChunk = resolveVoiceAssistantRelay({
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
        assistantMessageId: "assistant_msg_done",
        audioChunkBase64: "DDDD",
        pcm: {
          encoding: "pcm_s16le",
          sampleRateHz: 16000,
          channels: 1,
          frameDurationMs: 20,
        },
      },
      relayEventsBySequence: {
        "19": [
          {
            contractVersion: "voice_transport_v1",
            transportMode: "websocket",
            eventType: "assistant_audio_chunk",
            liveSessionId: "live_voice_1",
            voiceSessionId: "voice_rt_1",
            interviewSessionId: "interview_rt_1",
            sequence: 19,
            timestampMs: 1_710_000_000_019,
            assistantMessageId: "assistant_msg_done",
            audioChunkBase64: "CCCC",
            pcm: {
              encoding: "pcm_s16le",
              sampleRateHz: 16000,
              channels: 1,
              frameDurationMs: 20,
            },
          },
        ],
        "20": finalizedStateRelay.relayEvents,
      },
    });

    expect(lateChunk.relayEvents).toHaveLength(0);
  });

  it("auto-heals assistant stream switch by finalizing prior stream first", () => {
    const switchedChunk = resolveVoiceAssistantRelay({
      sourceEnvelope: {
        contractVersion: "voice_transport_v1",
        transportMode: "websocket",
        eventType: "assistant_audio_chunk",
        liveSessionId: "live_voice_1",
        voiceSessionId: "voice_rt_1",
        interviewSessionId: "interview_rt_1",
        sequence: 41,
        previousSequence: 40,
        timestampMs: 1_710_000_000_041,
        assistantMessageId: "assistant_msg_new",
        audioChunkBase64: "FFFF",
        pcm: {
          encoding: "pcm_s16le",
          sampleRateHz: 16000,
          channels: 1,
          frameDurationMs: 20,
        },
      },
      relayEventsBySequence: {
        "40": [
          {
            contractVersion: "voice_transport_v1",
            transportMode: "websocket",
            eventType: "assistant_audio_chunk",
            liveSessionId: "live_voice_1",
            voiceSessionId: "voice_rt_1",
            interviewSessionId: "interview_rt_1",
            sequence: 40,
            timestampMs: 1_710_000_000_040,
            assistantMessageId: "assistant_msg_old",
            audioChunkBase64: "EEEE",
            pcm: {
              encoding: "pcm_s16le",
              sampleRateHz: 16000,
              channels: 1,
              frameDurationMs: 20,
            },
          },
        ],
      },
    });

    expect(switchedChunk.relayEvents.map((event) => event.eventType)).toEqual([
      "assistant_audio_final",
      "assistant_audio_chunk",
    ]);
    expect(switchedChunk.cancellationAssistantMessageId).toBe("assistant_msg_old");
  });

  it("rebuilds assistant stream state from replay events", () => {
    const state = resolveVoiceAssistantStreamRelayState({
      relayEventsBySequence: {
        "30": [
          {
            contractVersion: "voice_transport_v1",
            transportMode: "websocket",
            eventType: "assistant_audio_chunk",
            liveSessionId: "live_voice_1",
            voiceSessionId: "voice_rt_1",
            interviewSessionId: "interview_rt_1",
            sequence: 30,
            timestampMs: 1_710_000_000_030,
            assistantMessageId: "assistant_msg_state",
            audioChunkBase64: "EEEE",
            pcm: {
              encoding: "pcm_s16le",
              sampleRateHz: 16000,
              channels: 1,
              frameDurationMs: 20,
            },
          },
        ],
        "31": [
          {
            contractVersion: "voice_transport_v1",
            transportMode: "websocket",
            eventType: "barge_in",
            liveSessionId: "live_voice_1",
            voiceSessionId: "voice_rt_1",
            interviewSessionId: "interview_rt_1",
            sequence: 31,
            previousSequence: 30,
            timestampMs: 1_710_000_000_031,
          },
        ],
      },
    });

    expect(state.activeAssistantMessageId).toBeNull();
    expect(state.finalizedAssistantMessageIds).toContain("assistant_msg_state");
    expect(state.cancelledAssistantMessageIds).toContain("assistant_msg_state");
  });
});
