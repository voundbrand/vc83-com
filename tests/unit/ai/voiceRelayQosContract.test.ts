import { describe, expect, it } from "vitest";

import {
  VOICE_RELAY_HEARTBEAT_CONTRACT_VERSION,
  VOICE_RELAY_QOS_CONTRACT_VERSION,
  resolveVoiceRelayQosSnapshot,
} from "../../../convex/ai/voiceRuntime";

describe("voice relay qos contract", () => {
  it("marks accepted relay ingest as healthy with acknowledged heartbeat", () => {
    const snapshot = resolveVoiceRelayQosSnapshot({
      nowMs: 1_000,
      sequence: 5,
      expectedSequence: 5,
      sequenceDecision: "accepted",
      idempotentReplay: false,
      relayEventCount: 2,
      relayErrorMessage: null,
      persistedFinalTranscript: false,
      lastAcceptedSequence: 4,
    });

    expect(snapshot.contractVersion).toBe(VOICE_RELAY_QOS_CONTRACT_VERSION);
    expect(snapshot.healthy).toBe(true);
    expect(snapshot.reasonCode).toBe("relay_healthy");
    expect(snapshot.heartbeat.contractVersion).toBe(
      VOICE_RELAY_HEARTBEAT_CONTRACT_VERSION
    );
    expect(snapshot.heartbeat.status).toBe("acknowledged");
    expect(snapshot.heartbeat.expectedSequence).toBe(5);
    expect(snapshot.heartbeat.ackSequence).toBe(5);
    expect(snapshot.qos.orderingDecision).toBe("accepted");
    expect(snapshot.qos.relayEventCount).toBe(2);
  });

  it("keeps duplicate replay deterministic and healthy for idempotent re-acks", () => {
    const snapshot = resolveVoiceRelayQosSnapshot({
      nowMs: 2_000,
      sequence: 7,
      expectedSequence: 8,
      sequenceDecision: "duplicate_replay",
      idempotentReplay: true,
      relayEventCount: 0,
      relayErrorMessage: null,
      persistedFinalTranscript: true,
      lastAcceptedSequence: 7,
    });

    expect(snapshot.healthy).toBe(true);
    expect(snapshot.reasonCode).toBe("relay_duplicate_replay");
    expect(snapshot.heartbeat.status).toBe("acknowledged");
    expect(snapshot.heartbeat.expectedSequence).toBe(8);
    expect(snapshot.heartbeat.ackSequence).toBe(7);
    expect(snapshot.qos.idempotentReplay).toBe(true);
    expect(snapshot.qos.persistedFinalTranscript).toBe(true);
  });

  it("fails closed for ordering gaps or relay error telemetry", () => {
    const gapSnapshot = resolveVoiceRelayQosSnapshot({
      nowMs: 3_000,
      sequence: 12,
      expectedSequence: 10,
      sequenceDecision: "gap_detected",
      idempotentReplay: false,
      relayEventCount: 1,
      relayErrorMessage: null,
      persistedFinalTranscript: false,
      lastAcceptedSequence: 9,
    });
    expect(gapSnapshot.healthy).toBe(false);
    expect(gapSnapshot.reasonCode).toBe("relay_gap_detected");
    expect(gapSnapshot.heartbeat.status).toBe("missing");
    expect(gapSnapshot.heartbeat.ackSequence).toBe(9);

    const relayErrorSnapshot = resolveVoiceRelayQosSnapshot({
      nowMs: 3_500,
      sequence: 13,
      expectedSequence: 13,
      sequenceDecision: "accepted",
      idempotentReplay: false,
      relayEventCount: 1,
      relayErrorMessage: "voice_provider_timeout",
      persistedFinalTranscript: false,
      lastAcceptedSequence: 12,
    });
    expect(relayErrorSnapshot.healthy).toBe(false);
    expect(relayErrorSnapshot.reasonCode).toBe("relay_error");
    expect(relayErrorSnapshot.heartbeat.status).toBe("acknowledged");
  });
});
