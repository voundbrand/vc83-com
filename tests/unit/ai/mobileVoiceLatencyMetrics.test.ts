import { describe, expect, it } from "vitest";

import {
  MOBILE_VOICE_LATENCY_METRICS_CONTRACT_VERSION,
  createMobileVoiceLatencyMetricsCollector,
} from "../../../apps/operator-mobile/src/lib/voice/latencyMetrics";
import { evaluateMobileRealtimeRelayHealth } from "../../../apps/operator-mobile/src/lib/voice/realtimeHealth";

describe("mobile voice latency metrics collector", () => {
  it("computes p50/p95 for interrupt and transcript metrics", () => {
    const collector = createMobileVoiceLatencyMetricsCollector({
      maxSamplesPerMetric: 64,
    });

    collector.record("interrupt_to_silence", 120);
    collector.record("interrupt_to_silence", 180);
    collector.record("interrupt_to_silence", 260);
    collector.record("live_transcript_lag", 220);
    collector.record("live_transcript_lag", 360);
    collector.record("live_transcript_lag", 410);

    const snapshot = collector.snapshot();
    expect(snapshot.contractVersion).toBe(
      MOBILE_VOICE_LATENCY_METRICS_CONTRACT_VERSION
    );
    expect(snapshot.metrics.interrupt_to_silence.sampleCount).toBe(3);
    expect(snapshot.metrics.interrupt_to_silence.p50Ms).toBe(180);
    expect(snapshot.metrics.interrupt_to_silence.p95Ms).toBe(260);
    expect(snapshot.metrics.live_transcript_lag.sampleCount).toBe(3);
    expect(snapshot.metrics.live_transcript_lag.p50Ms).toBe(360);
    expect(snapshot.metrics.live_transcript_lag.p95Ms).toBe(410);
  });

  it("keeps sample windows bounded for deterministic rolling summaries", () => {
    const collector = createMobileVoiceLatencyMetricsCollector({
      maxSamplesPerMetric: 3,
    });

    collector.record("time_to_first_assistant_audio", 900);
    collector.record("time_to_first_assistant_audio", 1_100);
    collector.record("time_to_first_assistant_audio", 1_300);
    collector.record("time_to_first_assistant_audio", 1_500);

    const snapshot = collector.snapshot();
    expect(snapshot.metrics.time_to_first_assistant_audio.sampleCount).toBe(3);
    expect(snapshot.metrics.time_to_first_assistant_audio.minMs).toBe(1_100);
    expect(snapshot.metrics.time_to_first_assistant_audio.maxMs).toBe(1_500);
  });

  it("flags deterministic relay heartbeat sequence-gap failures", () => {
    const health = evaluateMobileRealtimeRelayHealth({
      nowMs: 90_000,
      isSocketConnected: true,
      lastIngestAttemptAtMs: 89_000,
      lastIngestAckAtMs: 89_700,
      consecutiveIngestFailures: 0,
      ingestAckGraceMs: 400,
      serverRelayQos: {
        contractVersion: "voice_relay_qos_v1",
        observedAtMs: 89_800,
        healthy: true,
        reasonCode: "relay_gap_detected",
        heartbeat: {
          contractVersion: "voice_relay_heartbeat_v1",
          status: "missing",
          expectedSequence: 22,
          ackSequence: 20,
          acknowledgedAtMs: 89_700,
        },
      },
      serverHeartbeatSequenceGapTolerance: 0,
    });

    expect(health.healthy).toBe(false);
    expect(health.reasonCode).toBe("relay_server_heartbeat_sequence_gap");
    expect(health.serverRelayHeartbeatSequenceGap).toBe(2);
  });

  it("flags deterministic relay heartbeat stall-timeout failures", () => {
    const health = evaluateMobileRealtimeRelayHealth({
      nowMs: 100_000,
      isSocketConnected: true,
      lastIngestAttemptAtMs: 99_000,
      lastIngestAckAtMs: 99_500,
      consecutiveIngestFailures: 0,
      ingestAckGraceMs: 400,
      serverRelayQos: {
        contractVersion: "voice_relay_qos_v1",
        observedAtMs: 99_900,
        healthy: true,
        reasonCode: "relay_healthy",
        heartbeat: {
          contractVersion: "voice_relay_heartbeat_v1",
          status: "acknowledged",
          expectedSequence: 30,
          ackSequence: 30,
          acknowledgedAtMs: 91_000,
        },
      },
      serverHeartbeatStallTimeoutMs: 7_500,
    });

    expect(health.healthy).toBe(false);
    expect(health.reasonCode).toBe("relay_server_heartbeat_stall_timeout");
    expect(health.serverRelayHeartbeatAckAgeMs).toBe(9_000);
  });
});
