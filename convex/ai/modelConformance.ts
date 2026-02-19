/**
 * Provider/model conformance harness scoring.
 *
 * Captures measurable release-gate metrics for:
 * - tool-call parsing reliability,
 * - schema fidelity,
 * - refusal handling behavior,
 * - latency reliability,
 * - cost reliability.
 */

export interface ModelConformanceThresholds {
  minToolCallParseRate: number;
  minSchemaFidelityRate: number;
  minRefusalHandlingRate: number;
  maxLatencyP95Ms: number;
  maxCostPer1kTokensUsd: number;
}

export interface ModelConformanceSample {
  scenarioId?: string;
  toolCallParsed?: boolean | null;
  schemaFidelity?: boolean | null;
  refusalHandled?: boolean | null;
  latencyMs?: number | null;
  totalTokens?: number | null;
  costUsd?: number | null;
}

export interface ModelConformanceMetricScore {
  passed: number;
  total: number;
  rate: number;
}

export interface ModelConformanceSummary {
  sampleCount: number;
  toolCallParsing: ModelConformanceMetricScore;
  schemaFidelity: ModelConformanceMetricScore;
  refusalHandling: ModelConformanceMetricScore;
  latencyP95Ms: number | null;
  costPer1kTokensUsd: number | null;
  thresholds: ModelConformanceThresholds;
  passed: boolean;
  failedMetrics: string[];
}

export interface ModelConformanceGateResult {
  passed: boolean;
  failedMetrics: string[];
  reasons: string[];
  thresholds: ModelConformanceThresholds;
}

export const DEFAULT_MODEL_CONFORMANCE_THRESHOLDS: ModelConformanceThresholds =
  {
    minToolCallParseRate: 0.9,
    minSchemaFidelityRate: 0.9,
    minRefusalHandlingRate: 0.85,
    maxLatencyP95Ms: 12_000,
    maxCostPer1kTokensUsd: 0.5,
  };

function roundRate(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Number(value.toFixed(4));
}

function normalizeThresholds(
  overrides?: Partial<ModelConformanceThresholds>
): ModelConformanceThresholds {
  const defaults = DEFAULT_MODEL_CONFORMANCE_THRESHOLDS;
  return {
    minToolCallParseRate:
      overrides?.minToolCallParseRate ?? defaults.minToolCallParseRate,
    minSchemaFidelityRate:
      overrides?.minSchemaFidelityRate ?? defaults.minSchemaFidelityRate,
    minRefusalHandlingRate:
      overrides?.minRefusalHandlingRate ?? defaults.minRefusalHandlingRate,
    maxLatencyP95Ms: overrides?.maxLatencyP95Ms ?? defaults.maxLatencyP95Ms,
    maxCostPer1kTokensUsd:
      overrides?.maxCostPer1kTokensUsd ?? defaults.maxCostPer1kTokensUsd,
  };
}

function metricScore(
  samples: ModelConformanceSample[],
  selector: (sample: ModelConformanceSample) => boolean | null | undefined
): ModelConformanceMetricScore {
  let total = 0;
  let passed = 0;

  for (const sample of samples) {
    const value = selector(sample);
    if (typeof value !== "boolean") {
      continue;
    }
    total += 1;
    if (value) {
      passed += 1;
    }
  }

  return {
    passed,
    total,
    rate: total > 0 ? roundRate(passed / total) : 0,
  };
}

function resolveP95LatencyMs(samples: ModelConformanceSample[]): number | null {
  const latencies = samples
    .map((sample) => sample.latencyMs)
    .filter(
      (latency): latency is number =>
        typeof latency === "number" && Number.isFinite(latency) && latency >= 0
    )
    .sort((left, right) => left - right);

  if (latencies.length === 0) {
    return null;
  }

  const p95Index = Math.max(0, Math.ceil(latencies.length * 0.95) - 1);
  return Math.round(latencies[p95Index]);
}

function resolveCostPer1kTokensUsd(
  samples: ModelConformanceSample[]
): number | null {
  let totalCostUsd = 0;
  let totalTokens = 0;

  for (const sample of samples) {
    const costUsd = sample.costUsd;
    const tokens = sample.totalTokens;
    if (
      typeof costUsd !== "number" ||
      !Number.isFinite(costUsd) ||
      costUsd < 0
    ) {
      continue;
    }
    if (
      typeof tokens !== "number" ||
      !Number.isFinite(tokens) ||
      tokens <= 0
    ) {
      continue;
    }
    totalCostUsd += costUsd;
    totalTokens += tokens;
  }

  if (totalTokens <= 0) {
    return null;
  }

  const per1k = totalCostUsd / (totalTokens / 1000);
  return Number(per1k.toFixed(6));
}

function buildConformanceFailureReasons(args: {
  summary: Omit<ModelConformanceSummary, "failedMetrics" | "passed">;
  thresholds: ModelConformanceThresholds;
}): { failedMetrics: string[]; reasons: string[] } {
  const failedMetrics: string[] = [];
  const reasons: string[] = [];

  const toolCallRate = args.summary.toolCallParsing.rate;
  const toolCallTotal = args.summary.toolCallParsing.total;
  if (toolCallTotal === 0 || toolCallRate < args.thresholds.minToolCallParseRate) {
    failedMetrics.push("tool_call_parse_rate");
    reasons.push(
      `Tool-call parsing rate ${toolCallRate} below threshold ${args.thresholds.minToolCallParseRate} (samples=${toolCallTotal}).`
    );
  }

  const schemaRate = args.summary.schemaFidelity.rate;
  const schemaTotal = args.summary.schemaFidelity.total;
  if (schemaTotal === 0 || schemaRate < args.thresholds.minSchemaFidelityRate) {
    failedMetrics.push("schema_fidelity_rate");
    reasons.push(
      `Schema fidelity rate ${schemaRate} below threshold ${args.thresholds.minSchemaFidelityRate} (samples=${schemaTotal}).`
    );
  }

  const refusalRate = args.summary.refusalHandling.rate;
  const refusalTotal = args.summary.refusalHandling.total;
  if (
    refusalTotal === 0 ||
    refusalRate < args.thresholds.minRefusalHandlingRate
  ) {
    failedMetrics.push("refusal_handling_rate");
    reasons.push(
      `Refusal handling rate ${refusalRate} below threshold ${args.thresholds.minRefusalHandlingRate} (samples=${refusalTotal}).`
    );
  }

  const latencyP95Ms = args.summary.latencyP95Ms;
  if (
    latencyP95Ms === null ||
    latencyP95Ms > args.thresholds.maxLatencyP95Ms
  ) {
    failedMetrics.push("latency_p95_ms");
    reasons.push(
      `Latency p95 ${latencyP95Ms ?? "missing"} exceeds threshold ${args.thresholds.maxLatencyP95Ms}.`
    );
  }

  const costPer1kTokensUsd = args.summary.costPer1kTokensUsd;
  if (
    costPer1kTokensUsd === null ||
    costPer1kTokensUsd > args.thresholds.maxCostPer1kTokensUsd
  ) {
    failedMetrics.push("cost_per_1k_tokens_usd");
    reasons.push(
      `Cost/1K tokens ${costPer1kTokensUsd ?? "missing"} exceeds threshold ${args.thresholds.maxCostPer1kTokensUsd}.`
    );
  }

  return { failedMetrics, reasons };
}

export function evaluateModelConformance(args: {
  samples: ModelConformanceSample[];
  thresholds?: Partial<ModelConformanceThresholds>;
}): ModelConformanceSummary {
  const thresholds = normalizeThresholds(args.thresholds);
  const summaryBase = {
    sampleCount: args.samples.length,
    toolCallParsing: metricScore(args.samples, (sample) => sample.toolCallParsed),
    schemaFidelity: metricScore(args.samples, (sample) => sample.schemaFidelity),
    refusalHandling: metricScore(args.samples, (sample) => sample.refusalHandled),
    latencyP95Ms: resolveP95LatencyMs(args.samples),
    costPer1kTokensUsd: resolveCostPer1kTokensUsd(args.samples),
    thresholds,
  };
  const failureResult = buildConformanceFailureReasons({
    summary: summaryBase,
    thresholds,
  });

  return {
    ...summaryBase,
    passed: failureResult.failedMetrics.length === 0,
    failedMetrics: failureResult.failedMetrics,
  };
}

export function evaluateModelConformanceGate(args: {
  summary?: ModelConformanceSummary | null;
  thresholds?: Partial<ModelConformanceThresholds>;
}): ModelConformanceGateResult {
  const thresholds = normalizeThresholds(args.thresholds);
  const summary = args.summary;

  if (!summary) {
    return {
      passed: false,
      failedMetrics: ["conformance_summary_missing"],
      reasons: [
        "Measured conformance summary is required before model enablement.",
      ],
      thresholds,
    };
  }

  const failureResult = buildConformanceFailureReasons({
    summary: {
      sampleCount: summary.sampleCount,
      toolCallParsing: summary.toolCallParsing,
      schemaFidelity: summary.schemaFidelity,
      refusalHandling: summary.refusalHandling,
      latencyP95Ms: summary.latencyP95Ms,
      costPer1kTokensUsd: summary.costPer1kTokensUsd,
      thresholds,
    },
    thresholds,
  });

  return {
    passed: failureResult.failedMetrics.length === 0,
    failedMetrics: failureResult.failedMetrics,
    reasons: failureResult.reasons,
    thresholds,
  };
}
