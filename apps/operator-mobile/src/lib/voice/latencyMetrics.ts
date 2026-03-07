export const MOBILE_VOICE_LATENCY_METRICS_CONTRACT_VERSION =
  'mobile_voice_latency_metrics_v1' as const;

export const MOBILE_VOICE_LATENCY_METRIC_KEYS = [
  'interrupt_to_silence',
  'time_to_first_assistant_audio',
  'live_transcript_lag',
] as const;

export type MobileVoiceLatencyMetricKey = (typeof MOBILE_VOICE_LATENCY_METRIC_KEYS)[number];

export type MobileVoiceLatencyMetricSummary = {
  sampleCount: number;
  lastMs?: number;
  minMs?: number;
  maxMs?: number;
  p50Ms?: number;
  p95Ms?: number;
};

export type MobileVoiceLatencyMetricsSnapshot = {
  contractVersion: typeof MOBILE_VOICE_LATENCY_METRICS_CONTRACT_VERSION;
  capturedAtMs: number;
  metrics: Record<MobileVoiceLatencyMetricKey, MobileVoiceLatencyMetricSummary>;
};

export type MobileVoiceLatencyMetricsCollector = {
  record: (key: MobileVoiceLatencyMetricKey, latencyMs: number) => MobileVoiceLatencyMetricsSnapshot;
  snapshot: () => MobileVoiceLatencyMetricsSnapshot;
  clear: () => void;
};

function normalizeLatencyMs(value: number): number | null {
  if (!Number.isFinite(value)) {
    return null;
  }
  return Math.max(0, Math.floor(value));
}

function percentile(sortedValues: number[], ratio: number): number | undefined {
  if (sortedValues.length === 0) {
    return undefined;
  }
  const clampedRatio = Math.max(0, Math.min(1, ratio));
  const index = Math.ceil(clampedRatio * sortedValues.length) - 1;
  return sortedValues[Math.max(0, Math.min(sortedValues.length - 1, index))];
}

function summarize(values: number[]): MobileVoiceLatencyMetricSummary {
  if (values.length === 0) {
    return {
      sampleCount: 0,
    };
  }
  const sorted = [...values].sort((left, right) => left - right);
  return {
    sampleCount: values.length,
    lastMs: values[values.length - 1],
    minMs: sorted[0],
    maxMs: sorted[sorted.length - 1],
    p50Ms: percentile(sorted, 0.5),
    p95Ms: percentile(sorted, 0.95),
  };
}

export function createMobileVoiceLatencyMetricsCollector(args?: {
  maxSamplesPerMetric?: number;
}): MobileVoiceLatencyMetricsCollector {
  const maxSamplesPerMetric = Number.isFinite(args?.maxSamplesPerMetric)
    ? Math.max(1, Math.floor(args?.maxSamplesPerMetric || 0))
    : 256;
  const samples: Record<MobileVoiceLatencyMetricKey, number[]> = {
    interrupt_to_silence: [],
    time_to_first_assistant_audio: [],
    live_transcript_lag: [],
  };

  const snapshot = (): MobileVoiceLatencyMetricsSnapshot => {
    return {
      contractVersion: MOBILE_VOICE_LATENCY_METRICS_CONTRACT_VERSION,
      capturedAtMs: Date.now(),
      metrics: {
        interrupt_to_silence: summarize(samples.interrupt_to_silence),
        time_to_first_assistant_audio: summarize(samples.time_to_first_assistant_audio),
        live_transcript_lag: summarize(samples.live_transcript_lag),
      },
    };
  };

  return {
    record(key, latencyMs) {
      const normalizedLatencyMs = normalizeLatencyMs(latencyMs);
      if (normalizedLatencyMs === null) {
        return snapshot();
      }
      const target = samples[key];
      target.push(normalizedLatencyMs);
      if (target.length > maxSamplesPerMetric) {
        target.splice(0, target.length - maxSamplesPerMetric);
      }
      return snapshot();
    },
    snapshot,
    clear() {
      for (const metricKey of MOBILE_VOICE_LATENCY_METRIC_KEYS) {
        samples[metricKey].length = 0;
      }
    },
  };
}
