import { describe, expect, it } from "vitest";

import {
  MOBILE_VOICE_LATENCY_METRICS_CONTRACT_VERSION,
  createMobileVoiceLatencyMetricsCollector,
} from "../../../apps/operator-mobile/src/lib/voice/latencyMetrics";

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
});
