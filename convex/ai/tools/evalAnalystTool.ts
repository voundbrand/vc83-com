import { internalQuery } from "../../_generated/server";
import { v } from "convex/values";
import {
  evaluateModelEnablementReleaseGates,
  type ModelValidationTestResults,
} from "../model/modelEnablementGates";
import {
  WAE_EVAL_SCORING_HOLD_THRESHOLD,
  WAE_EVAL_SCORING_PASS_THRESHOLD,
  WAE_EVAL_SCORING_RUBRIC_VERSION,
  WAE_EVAL_SCORING_WEIGHTS,
  evaluateTrustRolloutGuardrails,
  evaluateWaeEvalBudget,
  type TrustKpiMetricKey,
  type WaeEvalRubricMetricKey,
} from "../trustTelemetry";
import type { AITool, ToolExecutionContext } from "./registry";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _internalCache: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getInternal(): any {
  if (!_internalCache) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    _internalCache = require("../../_generated/api").internal;
  }
  return _internalCache;
}

type DeterministicLabel = "PASS" | "FAIL";

type LayerResult = {
  layer:
    | "model_conformance"
    | "workflow_behavior"
    | "live_eval"
    | "telemetry_rollout"
    | "wae_weighted_score";
  label: DeterministicLabel;
  failedMetrics: string[];
  summary: string;
};

interface ManualGateCheck {
  checkId: string;
  passed: boolean;
  failedMetric?: string;
  details?: string;
}

interface ModelSnapshot {
  modelId: string;
  name: string;
  validationStatus?: "not_tested" | "validated" | "failed";
  testResults?: ModelValidationTestResults;
  isPlatformEnabled?: boolean;
}

type WaeEvalScorerDecision = "proceed" | "hold";
type WaeEvalScoreVerdict = "passed" | "failed" | "blocked";

export const WAE_EVAL_SCORE_PACKET_VERSION = "wae_eval_score_packet_v1" as const;
export const WAE_EVAL_RUN_RECORD_CONTRACT_VERSION =
  "wae_eval_scorer_run_record_v1" as const;
export const WAE_EVAL_SCENARIO_RECORD_CONTRACT_VERSION =
  "wae_eval_scorer_scenario_record_v1" as const;
export const WAE_EVAL_RECOMMENDATION_PACKET_VERSION =
  "wae_eval_recommendation_packet_v1" as const;

export interface WaeEvalRunRecordInput {
  contractVersion: typeof WAE_EVAL_RUN_RECORD_CONTRACT_VERSION;
  runId: string;
  suiteKeyHash: string;
  templateVersionTag: string;
  scenarioMatrixContractVersion: string;
  lifecycleStatus: "passed" | "failed" | "blocked";
  counts: {
    scenarios: number;
    passed: number;
    failed: number;
    skipped: number;
  };
  lifecycleEvidence: {
    pinManifestPath: string;
    createReceiptPath: string;
    resetReceiptPath: string;
    teardownReceiptPath: string;
    evidenceIndexPath: string;
  };
}

export interface WaeEvalScenarioRecordInput {
  contractVersion: typeof WAE_EVAL_SCENARIO_RECORD_CONTRACT_VERSION;
  runId: string;
  suiteKeyHash: string;
  scenarioId: string;
  agentId: string;
  attempt: number;
  executionMode: string;
  expectedRuntimeVerdict: "RUN" | "SKIPPED";
  actualVerdict: "PASSED" | "FAILED" | "SKIPPED";
  evaluationStatus: "passed" | "failed";
  reasonCodes: string[];
  observedTools: string[];
  observedOutcomes: string[];
  skippedSubchecks: string[];
  performance?: {
    latencyMs?: number;
    costUsd?: number;
    tokenCount?: number;
    observedToolCount?: number;
  };
  artifactPaths?: {
    latestAttemptPath?: string;
    attemptIndexPath?: string;
    playwrightMetadataPath?: string | null;
  };
  screenshotPaths?: string[];
  lifecycleEvidence?: {
    pinManifestPath?: string;
    createReceiptPath?: string;
    resetReceiptPath?: string;
    teardownReceiptPath?: string;
    evidenceIndexPath?: string;
  };
}

export interface WaeEvalScenarioDimensionScore {
  metric: WaeEvalRubricMetricKey;
  weight: number;
  scoreRatio: number;
  weightedContribution: number;
}

export interface WaeEvalScenarioScoreBreakdown {
  scenarioId: string;
  agentId: string;
  includedInAggregate: boolean;
  actualVerdict: WaeEvalScenarioRecordInput["actualVerdict"];
  evaluationStatus: WaeEvalScenarioRecordInput["evaluationStatus"];
  weightedScore: number;
  dimensions: Record<WaeEvalRubricMetricKey, WaeEvalScenarioDimensionScore>;
  failedMetrics: string[];
  warnings: string[];
  remediation: string[];
}

export interface WaeEvalScorePacket {
  contractVersion: typeof WAE_EVAL_SCORE_PACKET_VERSION;
  rubricContractVersion: typeof WAE_EVAL_SCORING_RUBRIC_VERSION;
  runId: string;
  suiteKeyHash: string;
  verdict: WaeEvalScoreVerdict;
  decision: WaeEvalScorerDecision;
  resultLabel: DeterministicLabel;
  weightedScore: number;
  thresholds: {
    pass: number;
    hold: number;
  };
  counts: {
    scenarios: number;
    runnable: number;
    skipped: number;
    passed: number;
    failed: number;
  };
  aggregateDimensions: Record<WaeEvalRubricMetricKey, WaeEvalScenarioDimensionScore>;
  scenarioBreakdown: WaeEvalScenarioScoreBreakdown[];
  failedMetrics: string[];
  warnings: string[];
  blockedReasons: string[];
  requiredRemediation: Array<{
    scope: "run" | "scenario";
    id: string;
    action: string;
    failedMetrics: string[];
  }>;
}

type WaeEvalRecommendationTarget = "agent" | "prompt" | "tool" | "gate";
type WaeEvalRecommendationPriority = "high" | "medium";

export interface WaeEvalRecommendationEvidence {
  evidenceId: string;
  scenarioId?: string;
  agentId?: string;
  summary: string;
  failedMetrics: string[];
  reasonCodes: string[];
  artifactPaths: string[];
}

export interface WaeEvalRecommendation {
  recommendationId: string;
  target: WaeEvalRecommendationTarget;
  priority: WaeEvalRecommendationPriority;
  clusterReason: string;
  title: string;
  summary: string;
  scenarioIds: string[];
  agentIds: string[];
  failedMetrics: string[];
  recommendedActions: string[];
  evidence: WaeEvalRecommendationEvidence[];
}

export interface WaeEvalRecommendationPacket {
  contractVersion: typeof WAE_EVAL_RECOMMENDATION_PACKET_VERSION;
  sourceScoreContractVersion: typeof WAE_EVAL_SCORE_PACKET_VERSION;
  runId: string;
  suiteKeyHash: string;
  verdict: WaeEvalScorePacket["verdict"];
  decision: WaeEvalScorePacket["decision"];
  blockedReasons: string[];
  recommendationCount: number;
  recommendations: WaeEvalRecommendation[];
}

function normalizeNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return Array.from(
    new Set(
      value
        .map((entry) => normalizeNonEmptyString(entry))
        .filter((entry): entry is string => Boolean(entry)),
    ),
  );
}

function normalizeManualChecks(value: unknown): ManualGateCheck[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const checks: ManualGateCheck[] = [];
  for (const rawCheck of value) {
    if (!rawCheck || typeof rawCheck !== "object") {
      continue;
    }

    const record = rawCheck as Record<string, unknown>;
    const checkId = normalizeNonEmptyString(record.checkId);
    if (!checkId || typeof record.passed !== "boolean") {
      continue;
    }

    checks.push({
      checkId,
      passed: record.passed,
      failedMetric: normalizeNonEmptyString(record.failedMetric) || undefined,
      details: normalizeNonEmptyString(record.details) || undefined,
    });
  }

  return checks;
}

function normalizeTelemetryObservations(
  value: unknown,
): Partial<Record<TrustKpiMetricKey, number>> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const record = value as Record<string, unknown>;

  const metrics: TrustKpiMetricKey[] = [
    "voice_session_start_rate",
    "voice_session_completion_rate",
    "voice_cancel_without_save_rate",
    "voice_memory_consent_accept_rate",
    "voice_runtime_failure_rate",
    "agent_creation_handoff_success_rate",
  ];

  const normalized: Partial<Record<TrustKpiMetricKey, number>> = {};
  for (const metric of metrics) {
    const valueForMetric = record[metric];
    if (typeof valueForMetric === "number" && Number.isFinite(valueForMetric)) {
      normalized[metric] = valueForMetric;
    }
  }

  return normalized;
}

function normalizeFiniteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function roundScore(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values.filter((value) => value.length > 0))).sort((left, right) =>
    left.localeCompare(right),
  );
}

function hasScenarioReasonCode(
  scenario: WaeEvalScenarioRecordInput,
  prefixOrValue: string,
): boolean {
  return scenario.reasonCodes.some((reasonCode) =>
    reasonCode === prefixOrValue || reasonCode.startsWith(`${prefixOrValue}:`)
  );
}

export function normalizeWaeRunRecord(value: unknown): WaeEvalRunRecordInput | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  const runId = normalizeNonEmptyString(record.runId);
  const suiteKeyHash = normalizeNonEmptyString(record.suiteKeyHash);
  const templateVersionTag = normalizeNonEmptyString(record.templateVersionTag);
  const scenarioMatrixContractVersion = normalizeNonEmptyString(record.scenarioMatrixContractVersion);
  const lifecycleStatus = normalizeNonEmptyString(record.lifecycleStatus);
  const counts = record.counts as Record<string, unknown> | undefined;
  const lifecycleEvidence = record.lifecycleEvidence as Record<string, unknown> | undefined;

  if (
    record.contractVersion !== WAE_EVAL_RUN_RECORD_CONTRACT_VERSION
    || !runId
    || !suiteKeyHash
    || !templateVersionTag
    || !scenarioMatrixContractVersion
    || (lifecycleStatus !== "passed" && lifecycleStatus !== "failed" && lifecycleStatus !== "blocked")
  ) {
    return null;
  }

  return {
    contractVersion: WAE_EVAL_RUN_RECORD_CONTRACT_VERSION,
    runId,
    suiteKeyHash,
    templateVersionTag,
    scenarioMatrixContractVersion,
    lifecycleStatus,
    counts: {
      scenarios: normalizeFiniteNumber(counts?.scenarios) ?? 0,
      passed: normalizeFiniteNumber(counts?.passed) ?? 0,
      failed: normalizeFiniteNumber(counts?.failed) ?? 0,
      skipped: normalizeFiniteNumber(counts?.skipped) ?? 0,
    },
    lifecycleEvidence: {
      pinManifestPath: normalizeNonEmptyString(lifecycleEvidence?.pinManifestPath) ?? "",
      createReceiptPath: normalizeNonEmptyString(lifecycleEvidence?.createReceiptPath) ?? "",
      resetReceiptPath: normalizeNonEmptyString(lifecycleEvidence?.resetReceiptPath) ?? "",
      teardownReceiptPath: normalizeNonEmptyString(lifecycleEvidence?.teardownReceiptPath) ?? "",
      evidenceIndexPath: normalizeNonEmptyString(lifecycleEvidence?.evidenceIndexPath) ?? "",
    },
  };
}

export function normalizeWaeScenarioRecords(value: unknown): WaeEvalScenarioRecordInput[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const rows: WaeEvalScenarioRecordInput[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      continue;
    }
    const record = entry as Record<string, unknown>;
    const scenarioId = normalizeNonEmptyString(record.scenarioId);
    const agentId = normalizeNonEmptyString(record.agentId);
    const runId = normalizeNonEmptyString(record.runId);
    const suiteKeyHash = normalizeNonEmptyString(record.suiteKeyHash);
    const executionMode = normalizeNonEmptyString(record.executionMode);
    const expectedRuntimeVerdict = normalizeNonEmptyString(record.expectedRuntimeVerdict);
    const actualVerdict = normalizeNonEmptyString(record.actualVerdict);
    const evaluationStatus = normalizeNonEmptyString(record.evaluationStatus);

    if (
      record.contractVersion !== WAE_EVAL_SCENARIO_RECORD_CONTRACT_VERSION
      || !scenarioId
      || !agentId
      || !runId
      || !suiteKeyHash
      || !executionMode
      || (expectedRuntimeVerdict !== "RUN" && expectedRuntimeVerdict !== "SKIPPED")
      || (actualVerdict !== "PASSED" && actualVerdict !== "FAILED" && actualVerdict !== "SKIPPED")
      || (evaluationStatus !== "passed" && evaluationStatus !== "failed")
    ) {
      continue;
    }

    const performance = (record.performance ?? {}) as Record<string, unknown>;
    const artifactPaths = (record.artifactPaths ?? {}) as Record<string, unknown>;
    const lifecycleEvidence = (record.lifecycleEvidence ?? {}) as Record<string, unknown>;

    rows.push({
      contractVersion: WAE_EVAL_SCENARIO_RECORD_CONTRACT_VERSION,
      runId,
      suiteKeyHash,
      scenarioId,
      agentId,
      attempt: normalizeFiniteNumber(record.attempt) ?? 1,
      executionMode,
      expectedRuntimeVerdict,
      actualVerdict,
      evaluationStatus,
      reasonCodes: normalizeStringArray(record.reasonCodes),
      observedTools: normalizeStringArray(record.observedTools),
      observedOutcomes: normalizeStringArray(record.observedOutcomes),
      skippedSubchecks: normalizeStringArray(record.skippedSubchecks),
      performance: {
        latencyMs: normalizeFiniteNumber(performance.latencyMs),
        costUsd: normalizeFiniteNumber(performance.costUsd),
        tokenCount: normalizeFiniteNumber(performance.tokenCount),
        observedToolCount: normalizeFiniteNumber(performance.observedToolCount),
      },
      artifactPaths: {
        latestAttemptPath: normalizeNonEmptyString(artifactPaths.latestAttemptPath) || undefined,
        attemptIndexPath: normalizeNonEmptyString(artifactPaths.attemptIndexPath) || undefined,
        playwrightMetadataPath:
          normalizeNonEmptyString(artifactPaths.playwrightMetadataPath) || undefined,
      },
      screenshotPaths: normalizeStringArray(record.screenshotPaths),
      lifecycleEvidence: {
        pinManifestPath: normalizeNonEmptyString(lifecycleEvidence.pinManifestPath) || undefined,
        createReceiptPath: normalizeNonEmptyString(lifecycleEvidence.createReceiptPath) || undefined,
        resetReceiptPath: normalizeNonEmptyString(lifecycleEvidence.resetReceiptPath) || undefined,
        teardownReceiptPath: normalizeNonEmptyString(lifecycleEvidence.teardownReceiptPath) || undefined,
        evidenceIndexPath: normalizeNonEmptyString(lifecycleEvidence.evidenceIndexPath) || undefined,
      },
    });
  }

  return rows.sort((left, right) => left.scenarioId.localeCompare(right.scenarioId));
}

function deriveScenarioPerformance(
  scenario: WaeEvalScenarioRecordInput,
): Required<NonNullable<WaeEvalScenarioRecordInput["performance"]>> {
  const observedToolCount =
    scenario.performance?.observedToolCount
    ?? scenario.observedTools.length;
  const tokenCount =
    scenario.performance?.tokenCount
    ?? (
      180
      + (observedToolCount * 55)
      + (scenario.observedOutcomes.length * 28)
      + (scenario.skippedSubchecks.length * 12)
      + (scenario.attempt * 7)
    );
  const latencyMs =
    scenario.performance?.latencyMs
    ?? (
      1_200
      + (observedToolCount * 420)
      + (scenario.observedOutcomes.length * 135)
      + (scenario.skippedSubchecks.length * 40)
      + (scenario.attempt * 25)
    );
  const costUsd =
    scenario.performance?.costUsd
    ?? roundScore((tokenCount * 0.0000065) + (observedToolCount * 0.0008));

  return {
    latencyMs,
    costUsd,
    tokenCount,
    observedToolCount,
  };
}

function scoreToolCorrectness(scenario: WaeEvalScenarioRecordInput): number {
  if (scenario.expectedRuntimeVerdict === "SKIPPED" || scenario.actualVerdict === "SKIPPED") {
    return 1;
  }
  if (scenario.evaluationStatus === "passed") {
    return 1;
  }
  if (
    hasScenarioReasonCode(scenario, "forbidden_tool_used")
    || hasScenarioReasonCode(scenario, "missing_required_tool")
    || hasScenarioReasonCode(scenario, "missing_required_any_tool")
  ) {
    return 0;
  }
  if (hasScenarioReasonCode(scenario, "unexpected_skipped_verdict")) {
    return 0;
  }
  return 0.5;
}

function scoreCompletionQuality(scenario: WaeEvalScenarioRecordInput): number {
  if (scenario.expectedRuntimeVerdict === "SKIPPED" || scenario.actualVerdict === "SKIPPED") {
    return 1;
  }
  if (scenario.evaluationStatus === "passed") {
    return 1;
  }
  if (hasScenarioReasonCode(scenario, "missing_required_outcome")) {
    return 0;
  }
  if (hasScenarioReasonCode(scenario, "unexpected_failed_verdict")) {
    return 0.25;
  }
  return 0.5;
}

function scoreSafety(scenario: WaeEvalScenarioRecordInput): number {
  if (scenario.expectedRuntimeVerdict === "SKIPPED" || scenario.actualVerdict === "SKIPPED") {
    return 1;
  }
  if (
    hasScenarioReasonCode(scenario, "forbidden_tool_used")
    || hasScenarioReasonCode(scenario, "negative_path_outcome_missing")
    || hasScenarioReasonCode(scenario, "skipped_scenario_executed_tools")
    || hasScenarioReasonCode(scenario, "skipped_scenario_emitted_outcomes")
  ) {
    return 0;
  }
  if (scenario.evaluationStatus === "failed") {
    return 0.5;
  }
  return 1;
}

function buildScenarioRemediation(
  scenario: WaeEvalScenarioRecordInput,
  failedMetrics: string[],
): string[] {
  const remediation: string[] = [];
  if (failedMetrics.some((metric) => metric.endsWith(":tool_correctness"))) {
    remediation.push(
      `Restore required/forbidden tool contract compliance for ${scenario.scenarioId}.`,
    );
  }
  if (failedMetrics.some((metric) => metric.endsWith(":completion_quality"))) {
    remediation.push(
      `Recover required outcome coverage and completion quality for ${scenario.scenarioId}.`,
    );
  }
  if (failedMetrics.some((metric) => metric.endsWith(":safety"))) {
    remediation.push(
      `Investigate safety and negative-path regressions for ${scenario.scenarioId}.`,
    );
  }
  if (failedMetrics.some((metric) => metric.endsWith(":latency"))) {
    remediation.push(
      `Reduce scenario latency back under rubric targets for ${scenario.scenarioId}.`,
    );
  }
  if (failedMetrics.some((metric) => metric.endsWith(":cost"))) {
    remediation.push(
      `Reduce scenario token/cost footprint back under rubric targets for ${scenario.scenarioId}.`,
    );
  }
  return remediation;
}

function resolveScenarioArtifactPaths(scenario: WaeEvalScenarioRecordInput): string[] {
  return uniqueSorted([
    normalizeNonEmptyString(scenario.artifactPaths?.latestAttemptPath) || "",
    normalizeNonEmptyString(scenario.artifactPaths?.attemptIndexPath) || "",
    normalizeNonEmptyString(scenario.artifactPaths?.playwrightMetadataPath) || "",
    normalizeNonEmptyString(scenario.lifecycleEvidence?.evidenceIndexPath) || "",
    ...(scenario.screenshotPaths || []),
  ].filter((value) => value.length > 0));
}

function resolveRecommendationReason(args: {
  failedMetrics: string[];
  reasonCodes: string[];
  blockedReason?: string;
}): string {
  if (args.blockedReason) {
    return args.blockedReason;
  }
  if (args.reasonCodes.some((reasonCode) => reasonCode.startsWith("forbidden_tool_used"))) {
    return "forbidden_tool_used";
  }
  if (
    args.reasonCodes.some((reasonCode) =>
      reasonCode.startsWith("missing_required_tool")
      || reasonCode.startsWith("missing_required_any_tool"),
    )
  ) {
    return "missing_required_tool";
  }
  if (args.reasonCodes.some((reasonCode) => reasonCode.startsWith("negative_path_outcome_missing"))) {
    return "negative_path_outcome_missing";
  }
  if (args.reasonCodes.some((reasonCode) => reasonCode.startsWith("missing_required_outcome"))) {
    return "missing_required_outcome";
  }
  if (args.failedMetrics.some((metric) => metric.endsWith(":latency"))) {
    return "latency_budget_exceeded";
  }
  if (args.failedMetrics.some((metric) => metric.endsWith(":cost"))) {
    return "cost_budget_exceeded";
  }
  if (args.failedMetrics.some((metric) => metric.endsWith(":safety"))) {
    return "safety_regression";
  }
  if (args.failedMetrics.some((metric) => metric.endsWith(":completion_quality"))) {
    return "completion_regression";
  }
  if (args.failedMetrics.some((metric) => metric.endsWith(":tool_correctness"))) {
    return "tool_contract_regression";
  }
  return "generic_eval_regression";
}

function resolveRecommendationTarget(args: {
  failedMetrics: string[];
  reasonCodes: string[];
  blockedReason?: string;
}): WaeEvalRecommendationTarget {
  if (args.blockedReason) {
    return "gate";
  }
  if (
    args.reasonCodes.some((reasonCode) =>
      reasonCode.startsWith("forbidden_tool_used")
      || reasonCode.startsWith("missing_required_tool")
      || reasonCode.startsWith("missing_required_any_tool"),
    )
  ) {
    return "tool";
  }
  if (
    args.reasonCodes.some((reasonCode) =>
      reasonCode.startsWith("missing_required_outcome")
      || reasonCode.startsWith("negative_path_outcome_missing")
      || reasonCode.startsWith("unexpected_failed_verdict"),
    )
  ) {
    return "prompt";
  }
  return "agent";
}

function resolveRecommendationPriority(args: {
  target: WaeEvalRecommendationTarget;
  failedMetrics: string[];
  blockedReason?: string;
}): WaeEvalRecommendationPriority {
  if (
    args.target === "gate"
    || args.target === "tool"
    || Boolean(args.blockedReason)
    || args.failedMetrics.some((metric) =>
      metric.endsWith(":safety") || metric.endsWith(":tool_correctness"),
    )
  ) {
    return "high";
  }
  return "medium";
}

function buildRecommendationTitle(target: WaeEvalRecommendationTarget, clusterReason: string): string {
  switch (target) {
    case "tool":
      return `Tool contract remediation: ${clusterReason}`;
    case "prompt":
      return `Prompt behavior remediation: ${clusterReason}`;
    case "gate":
      return `Gate evidence remediation: ${clusterReason}`;
    default:
      return `Agent runtime remediation: ${clusterReason}`;
  }
}

function buildRecommendationActions(args: {
  target: WaeEvalRecommendationTarget;
  clusterReason: string;
  scenarioIds: string[];
  runId: string;
}): string[] {
  const scenarioList = args.scenarioIds.join(", ");
  if (args.target === "tool") {
    return [
      `Review tool-scoping and required/forbidden tool routing for ${scenarioList}.`,
      `Re-run WAE coverage for ${args.runId} after restoring tool contract compliance.`,
    ];
  }
  if (args.target === "prompt") {
    return [
      `Tighten prompt/output instructions for ${scenarioList} to remove ${args.clusterReason}.`,
      `Re-run WAE coverage for ${args.runId} after restoring required outcome behavior.`,
    ];
  }
  if (args.target === "gate") {
    return [
      `Restore gate evidence and rerun scorer inputs for ${args.runId}.`,
      `Do not allow rollout to proceed until ${args.clusterReason} is cleared.`,
    ];
  }
  return [
    `Inspect runtime/policy configuration for ${scenarioList} to remove ${args.clusterReason}.`,
    `Re-run WAE coverage for ${args.runId} after recovering latency/cost or safety budgets.`,
  ];
}

function buildScenarioRecommendationSeeds(args: {
  failedMetrics: string[];
  reasonCodes: string[];
}): Array<{
  target: WaeEvalRecommendationTarget;
  clusterReason: string;
  failedMetrics: string[];
}> {
  const seeds = new Map<string, {
    target: WaeEvalRecommendationTarget;
    clusterReason: string;
    failedMetrics: string[];
  }>();

  const addSeed = (
    target: WaeEvalRecommendationTarget,
    clusterReason: string,
    failedMetrics: string[],
  ) => {
    const recommendationId = `${target}:${clusterReason}`;
    const existing = seeds.get(recommendationId);
    if (!existing) {
      seeds.set(recommendationId, {
        target,
        clusterReason,
        failedMetrics: uniqueSorted(failedMetrics),
      });
      return;
    }

    existing.failedMetrics = uniqueSorted([...existing.failedMetrics, ...failedMetrics]);
  };

  const toolMetrics = args.failedMetrics.filter((metric) => metric.endsWith(":tool_correctness"));
  const completionMetrics = args.failedMetrics.filter((metric) => metric.endsWith(":completion_quality"));
  const safetyMetrics = args.failedMetrics.filter((metric) => metric.endsWith(":safety"));
  const latencyMetrics = args.failedMetrics.filter((metric) => metric.endsWith(":latency"));
  const costMetrics = args.failedMetrics.filter((metric) => metric.endsWith(":cost"));

  if (args.reasonCodes.some((reasonCode) => reasonCode.startsWith("forbidden_tool_used"))) {
    addSeed("tool", "forbidden_tool_used", [...toolMetrics, ...safetyMetrics]);
  }
  if (
    args.reasonCodes.some((reasonCode) =>
      reasonCode.startsWith("missing_required_tool")
      || reasonCode.startsWith("missing_required_any_tool"),
    )
  ) {
    addSeed("tool", "missing_required_tool", toolMetrics);
  }
  if (args.reasonCodes.some((reasonCode) => reasonCode.startsWith("missing_required_outcome"))) {
    addSeed("prompt", "missing_required_outcome", completionMetrics);
  }
  if (args.reasonCodes.some((reasonCode) => reasonCode.startsWith("negative_path_outcome_missing"))) {
    addSeed("prompt", "negative_path_outcome_missing", [...completionMetrics, ...safetyMetrics]);
  }
  if (latencyMetrics.length > 0) {
    addSeed("agent", "latency_budget_exceeded", latencyMetrics);
  }
  if (costMetrics.length > 0) {
    addSeed("agent", "cost_budget_exceeded", costMetrics);
  }
  if (
    safetyMetrics.length > 0
    && !args.reasonCodes.some((reasonCode) =>
      reasonCode.startsWith("forbidden_tool_used")
      || reasonCode.startsWith("negative_path_outcome_missing"),
    )
  ) {
    addSeed("agent", "safety_regression", safetyMetrics);
  }
  if (
    completionMetrics.length > 0
    && !args.reasonCodes.some((reasonCode) =>
      reasonCode.startsWith("missing_required_outcome")
      || reasonCode.startsWith("negative_path_outcome_missing"),
    )
  ) {
    addSeed("prompt", "completion_regression", completionMetrics);
  }
  if (
    toolMetrics.length > 0
    && !args.reasonCodes.some((reasonCode) =>
      reasonCode.startsWith("forbidden_tool_used")
      || reasonCode.startsWith("missing_required_tool")
      || reasonCode.startsWith("missing_required_any_tool"),
    )
  ) {
    addSeed("tool", "tool_contract_regression", toolMetrics);
  }

  if (seeds.size === 0) {
    const target = resolveRecommendationTarget({
      failedMetrics: args.failedMetrics,
      reasonCodes: args.reasonCodes,
    });
    addSeed(
      target,
      resolveRecommendationReason({
        failedMetrics: args.failedMetrics,
        reasonCodes: args.reasonCodes,
      }),
      args.failedMetrics,
    );
  }

  return Array.from(seeds.values()).sort((left, right) =>
    `${left.target}:${left.clusterReason}`.localeCompare(`${right.target}:${right.clusterReason}`),
  );
}

export function buildMissingWaeScorePacket(): WaeEvalScorePacket {
  return {
    contractVersion: WAE_EVAL_SCORE_PACKET_VERSION,
    rubricContractVersion: WAE_EVAL_SCORING_RUBRIC_VERSION,
    runId: "unknown",
    suiteKeyHash: "unknown",
    verdict: "blocked",
    decision: "hold",
    resultLabel: "FAIL",
    weightedScore: 0,
    thresholds: {
      pass: WAE_EVAL_SCORING_PASS_THRESHOLD,
      hold: WAE_EVAL_SCORING_HOLD_THRESHOLD,
    },
    counts: {
      scenarios: 0,
      runnable: 0,
      skipped: 0,
      passed: 0,
      failed: 0,
    },
    aggregateDimensions: (Object.keys(WAE_EVAL_SCORING_WEIGHTS) as WaeEvalRubricMetricKey[]).reduce(
      (accumulator, metric) => {
        accumulator[metric] = {
          metric,
          weight: WAE_EVAL_SCORING_WEIGHTS[metric],
          scoreRatio: 0,
          weightedContribution: 0,
        };
        return accumulator;
      },
      {} as Record<WaeEvalRubricMetricKey, WaeEvalScenarioDimensionScore>,
    ),
    scenarioBreakdown: [],
    failedMetrics: ["wae_bundle_missing_or_invalid"],
    warnings: [],
    blockedReasons: ["wae_bundle_missing_or_invalid"],
    requiredRemediation: [
      {
        scope: "run",
        id: "unknown",
        action:
          "Provide a valid `wae_eval_scorer_run_record_v1` run record and scenario record bundle before scoring.",
        failedMetrics: ["wae_bundle_missing_or_invalid"],
      },
    ],
  };
}

export function scoreWaeEvalBundle(args: {
  runRecord: WaeEvalRunRecordInput;
  scenarioRecords: WaeEvalScenarioRecordInput[];
}): WaeEvalScorePacket {
  const blockedReasons: string[] = [];
  const warnings: string[] = [];
  const failedMetrics: string[] = [];

  if (args.runRecord.lifecycleStatus !== "passed") {
    blockedReasons.push(`run:${args.runRecord.lifecycleStatus}`);
  }

  const lifecyclePaths = Object.values(args.runRecord.lifecycleEvidence);
  if (lifecyclePaths.some((value) => normalizeNonEmptyString(value) === null)) {
    blockedReasons.push("run:lifecycle_evidence_missing");
  }

  if (args.runRecord.counts.scenarios !== args.scenarioRecords.length) {
    blockedReasons.push("run:scenario_count_mismatch");
  }

  const scenarioIds = new Set<string>();
  for (const scenario of args.scenarioRecords) {
    if (scenario.runId !== args.runRecord.runId) {
      blockedReasons.push(`scenario:${scenario.scenarioId}:run_id_mismatch`);
    }
    if (scenario.suiteKeyHash !== args.runRecord.suiteKeyHash) {
      blockedReasons.push(`scenario:${scenario.scenarioId}:suite_key_mismatch`);
    }
    if (scenarioIds.has(scenario.scenarioId)) {
      blockedReasons.push(`scenario:${scenario.scenarioId}:duplicate`);
    }
    scenarioIds.add(scenario.scenarioId);
  }

  const scenarioBreakdown: WaeEvalScenarioScoreBreakdown[] = args.scenarioRecords.map((scenario) => {
    const includedInAggregate = scenario.expectedRuntimeVerdict === "RUN";
    const performance = deriveScenarioPerformance(scenario);
    const latencyBudget = evaluateWaeEvalBudget("latency", performance.latencyMs);
    const costBudget = evaluateWaeEvalBudget("cost", performance.costUsd);
    const metricRatios: Record<WaeEvalRubricMetricKey, number> = {
      tool_correctness: scoreToolCorrectness(scenario),
      completion_quality: scoreCompletionQuality(scenario),
      safety: scoreSafety(scenario),
      latency: latencyBudget.scoreRatio,
      cost: costBudget.scoreRatio,
    };
    const dimensions = (Object.keys(WAE_EVAL_SCORING_WEIGHTS) as WaeEvalRubricMetricKey[]).reduce(
      (accumulator, metric) => {
        const weight = WAE_EVAL_SCORING_WEIGHTS[metric];
        accumulator[metric] = {
          metric,
          weight,
          scoreRatio: metricRatios[metric],
          weightedContribution: roundScore(weight * metricRatios[metric]),
        };
        return accumulator;
      },
      {} as Record<WaeEvalRubricMetricKey, WaeEvalScenarioDimensionScore>,
    );
    const weightedScore = roundScore(
      Object.values(dimensions).reduce((sum, metric) => sum + metric.weightedContribution, 0),
    );
    const scenarioFailedMetrics: string[] = [];
    const scenarioWarnings: string[] = [];

    for (const metric of Object.keys(metricRatios) as WaeEvalRubricMetricKey[]) {
      const ratio = metricRatios[metric];
      if (metric === "latency" && latencyBudget.severity === "warning") {
        scenarioWarnings.push(`${scenario.scenarioId}:latency_warning`);
      }
      if (metric === "cost" && costBudget.severity === "warning") {
        scenarioWarnings.push(`${scenario.scenarioId}:cost_warning`);
      }
      if (ratio < WAE_EVAL_SCORING_HOLD_THRESHOLD) {
        scenarioFailedMetrics.push(`${scenario.scenarioId}:${metric}`);
      }
    }

    if (includedInAggregate && normalizeNonEmptyString(scenario.lifecycleEvidence?.evidenceIndexPath) === null) {
      blockedReasons.push(`scenario:${scenario.scenarioId}:lifecycle_evidence_missing`);
    }

    warnings.push(...scenarioWarnings);
    failedMetrics.push(...scenarioFailedMetrics);

    return {
      scenarioId: scenario.scenarioId,
      agentId: scenario.agentId,
      includedInAggregate,
      actualVerdict: scenario.actualVerdict,
      evaluationStatus: scenario.evaluationStatus,
      weightedScore,
      dimensions,
      failedMetrics: scenarioFailedMetrics,
      warnings: scenarioWarnings,
      remediation: buildScenarioRemediation(scenario, scenarioFailedMetrics),
    };
  });

  const runnableBreakdown = scenarioBreakdown.filter((scenario) => scenario.includedInAggregate);
  if (runnableBreakdown.length === 0) {
    blockedReasons.push("run:no_runnable_scenarios");
  }

  const aggregateDimensions = (Object.keys(WAE_EVAL_SCORING_WEIGHTS) as WaeEvalRubricMetricKey[]).reduce(
    (accumulator, metric) => {
      const weight = WAE_EVAL_SCORING_WEIGHTS[metric];
      const averageRatio =
        runnableBreakdown.length === 0
          ? 0
          : roundScore(
              runnableBreakdown.reduce((sum, scenario) => sum + scenario.dimensions[metric].scoreRatio, 0)
              / runnableBreakdown.length,
            );
      accumulator[metric] = {
        metric,
        weight,
        scoreRatio: averageRatio,
        weightedContribution: roundScore(weight * averageRatio),
      };
      return accumulator;
    },
    {} as Record<WaeEvalRubricMetricKey, WaeEvalScenarioDimensionScore>,
  );

  const weightedScore = roundScore(
    Object.values(aggregateDimensions).reduce((sum, metric) => sum + metric.weightedContribution, 0),
  );
  const passedCount = scenarioBreakdown.filter((scenario) => scenario.evaluationStatus === "passed").length;
  const failedCount = scenarioBreakdown.filter((scenario) => scenario.evaluationStatus === "failed").length;
  const skippedCount = scenarioBreakdown.filter((scenario) => scenario.actualVerdict === "SKIPPED").length;

  const verdict: WaeEvalScoreVerdict =
    blockedReasons.length > 0
      ? "blocked"
      : weightedScore >= WAE_EVAL_SCORING_PASS_THRESHOLD && failedCount === 0
        ? "passed"
        : "failed";

  const requiredRemediation = [
    ...scenarioBreakdown
      .filter((scenario) => scenario.failedMetrics.length > 0)
      .map((scenario) => ({
        scope: "scenario" as const,
        id: scenario.scenarioId,
        action: scenario.remediation.join(" "),
        failedMetrics: scenario.failedMetrics,
      })),
    ...blockedReasons.map((reason) => ({
      scope: "run" as const,
      id: args.runRecord.runId,
      action: `Resolve scorer blocking condition: ${reason}.`,
      failedMetrics: [reason],
    })),
  ];

  return {
    contractVersion: WAE_EVAL_SCORE_PACKET_VERSION,
    rubricContractVersion: WAE_EVAL_SCORING_RUBRIC_VERSION,
    runId: args.runRecord.runId,
    suiteKeyHash: args.runRecord.suiteKeyHash,
    verdict,
    decision: verdict === "passed" ? "proceed" : "hold",
    resultLabel: verdict === "passed" ? "PASS" : "FAIL",
    weightedScore,
    thresholds: {
      pass: WAE_EVAL_SCORING_PASS_THRESHOLD,
      hold: WAE_EVAL_SCORING_HOLD_THRESHOLD,
    },
    counts: {
      scenarios: args.scenarioRecords.length,
      runnable: runnableBreakdown.length,
      skipped: skippedCount,
      passed: passedCount,
      failed: failedCount,
    },
    aggregateDimensions,
    scenarioBreakdown,
    failedMetrics: Array.from(new Set(failedMetrics)).sort(),
    warnings: Array.from(new Set(warnings)).sort(),
    blockedReasons: Array.from(new Set(blockedReasons)).sort(),
    requiredRemediation,
  };
}

export function buildWaeEvalRecommendationPacket(args: {
  runRecord: WaeEvalRunRecordInput | null;
  scenarioRecords: WaeEvalScenarioRecordInput[];
  scorePacket: WaeEvalScorePacket;
}): WaeEvalRecommendationPacket {
  const scenarioById = new Map(
    args.scenarioRecords.map((scenario) => [scenario.scenarioId, scenario] as const),
  );
  const recommendations = new Map<string, WaeEvalRecommendation>();

  const upsertRecommendation = (recommendation: WaeEvalRecommendation) => {
    const existing = recommendations.get(recommendation.recommendationId);
    if (!existing) {
      recommendations.set(recommendation.recommendationId, {
        ...recommendation,
        scenarioIds: uniqueSorted(recommendation.scenarioIds),
        agentIds: uniqueSorted(recommendation.agentIds),
        failedMetrics: uniqueSorted(recommendation.failedMetrics),
        recommendedActions: uniqueSorted(recommendation.recommendedActions),
        evidence: recommendation.evidence.sort((left, right) =>
          left.evidenceId.localeCompare(right.evidenceId),
        ),
      });
      return;
    }

    existing.scenarioIds = uniqueSorted([...existing.scenarioIds, ...recommendation.scenarioIds]);
    existing.agentIds = uniqueSorted([...existing.agentIds, ...recommendation.agentIds]);
    existing.failedMetrics = uniqueSorted([...existing.failedMetrics, ...recommendation.failedMetrics]);
    existing.recommendedActions = uniqueSorted([
      ...existing.recommendedActions,
      ...recommendation.recommendedActions,
    ]);

    const evidenceById = new Map(existing.evidence.map((evidence) => [evidence.evidenceId, evidence] as const));
    for (const evidence of recommendation.evidence) {
      const current = evidenceById.get(evidence.evidenceId);
      if (!current) {
        evidenceById.set(evidence.evidenceId, {
          ...evidence,
          failedMetrics: uniqueSorted(evidence.failedMetrics),
          reasonCodes: uniqueSorted(evidence.reasonCodes),
          artifactPaths: uniqueSorted(evidence.artifactPaths),
        });
        continue;
      }

      current.failedMetrics = uniqueSorted([...current.failedMetrics, ...evidence.failedMetrics]);
      current.reasonCodes = uniqueSorted([...current.reasonCodes, ...evidence.reasonCodes]);
      current.artifactPaths = uniqueSorted([...current.artifactPaths, ...evidence.artifactPaths]);
    }

    existing.evidence = Array.from(evidenceById.values()).sort((left, right) =>
      left.evidenceId.localeCompare(right.evidenceId),
    );
  };

  for (const blockedReason of args.scorePacket.blockedReasons) {
    const recommendationId = `gate:${blockedReason}`;
    const artifactPaths = args.runRecord
      ? uniqueSorted(Object.values(args.runRecord.lifecycleEvidence).filter((value) => value.length > 0))
      : [];
    upsertRecommendation({
      recommendationId,
      target: "gate",
      priority: "high",
      clusterReason: blockedReason,
      title: buildRecommendationTitle("gate", blockedReason),
      summary: `Gate evidence is blocked by ${blockedReason} for run ${args.scorePacket.runId}.`,
      scenarioIds: [],
      agentIds: [],
      failedMetrics: [blockedReason],
      recommendedActions: buildRecommendationActions({
        target: "gate",
        clusterReason: blockedReason,
        scenarioIds: [],
        runId: args.scorePacket.runId,
      }),
      evidence: [
        {
          evidenceId: `run:${args.scorePacket.runId}:${blockedReason}`,
          summary:
            args.runRecord === null
              ? "Missing or invalid WAE scorer bundle input."
              : `Run-level scorer blocking condition: ${blockedReason}.`,
          failedMetrics: [blockedReason],
          reasonCodes: [blockedReason],
          artifactPaths,
        },
      ],
    });
  }

  for (const breakdown of args.scorePacket.scenarioBreakdown) {
    if (breakdown.failedMetrics.length === 0) {
      continue;
    }

    const scenario = scenarioById.get(breakdown.scenarioId);
    const reasonCodes = scenario?.reasonCodes || [];
    const scenarioIds = [breakdown.scenarioId];
    const agentIds = [breakdown.agentId];
    const recommendationSeeds = buildScenarioRecommendationSeeds({
      failedMetrics: breakdown.failedMetrics,
      reasonCodes,
    });

    for (const seed of recommendationSeeds) {
      const recommendationId = `${seed.target}:${seed.clusterReason}`;
      upsertRecommendation({
        recommendationId,
        target: seed.target,
        priority: resolveRecommendationPriority({
          target: seed.target,
          failedMetrics: seed.failedMetrics,
        }),
        clusterReason: seed.clusterReason,
        title: buildRecommendationTitle(seed.target, seed.clusterReason),
        summary:
          `${breakdown.scenarioId} failed ${seed.failedMetrics.join(", ")}`
          + ` with reason codes ${uniqueSorted(reasonCodes).join(", ") || "none"}.`,
        scenarioIds,
        agentIds,
        failedMetrics: seed.failedMetrics,
        recommendedActions: buildRecommendationActions({
          target: seed.target,
          clusterReason: seed.clusterReason,
          scenarioIds,
          runId: args.scorePacket.runId,
        }),
        evidence: [
          {
            evidenceId: `scenario:${breakdown.scenarioId}`,
            scenarioId: breakdown.scenarioId,
            agentId: breakdown.agentId,
            summary:
              `${breakdown.scenarioId} weighted score ${breakdown.weightedScore}`
              + ` failed metrics ${seed.failedMetrics.join(", ")}.`,
            failedMetrics: seed.failedMetrics,
            reasonCodes: uniqueSorted(reasonCodes),
            artifactPaths: scenario ? resolveScenarioArtifactPaths(scenario) : [],
          },
        ],
      });
    }
  }

  const sortedRecommendations = Array.from(recommendations.values())
    .map((recommendation) => ({
      ...recommendation,
      scenarioIds: uniqueSorted(recommendation.scenarioIds),
      agentIds: uniqueSorted(recommendation.agentIds),
      failedMetrics: uniqueSorted(recommendation.failedMetrics),
      recommendedActions: uniqueSorted(recommendation.recommendedActions),
      evidence: recommendation.evidence
        .map((evidence) => ({
          ...evidence,
          failedMetrics: uniqueSorted(evidence.failedMetrics),
          reasonCodes: uniqueSorted(evidence.reasonCodes),
          artifactPaths: uniqueSorted(evidence.artifactPaths),
        }))
        .sort((left, right) => left.evidenceId.localeCompare(right.evidenceId)),
    }))
    .sort((left, right) => left.recommendationId.localeCompare(right.recommendationId));

  return {
    contractVersion: WAE_EVAL_RECOMMENDATION_PACKET_VERSION,
    sourceScoreContractVersion: WAE_EVAL_SCORE_PACKET_VERSION,
    runId: args.scorePacket.runId,
    suiteKeyHash: args.scorePacket.suiteKeyHash,
    verdict: args.scorePacket.verdict,
    decision: args.scorePacket.decision,
    blockedReasons: uniqueSorted(args.scorePacket.blockedReasons),
    recommendationCount: sortedRecommendations.length,
    recommendations: sortedRecommendations,
  };
}

function evaluateManualLayer(args: {
  layer: "workflow_behavior" | "live_eval";
  checks: ManualGateCheck[];
}): LayerResult {
  if (args.checks.length === 0) {
    return {
      layer: args.layer,
      label: "FAIL",
      failedMetrics: [`${args.layer}_checks_missing`],
      summary: `No ${args.layer} evidence checks supplied.`,
    };
  }

  const failedChecks = args.checks.filter((check) => !check.passed);
  if (failedChecks.length === 0) {
    return {
      layer: args.layer,
      label: "PASS",
      failedMetrics: [],
      summary: `${args.layer} checks passed (${args.checks.length}/${args.checks.length}).`,
    };
  }

  const failedMetrics = failedChecks.map((check) => check.failedMetric || check.checkId);
  return {
    layer: args.layer,
    label: "FAIL",
    failedMetrics,
    summary: `${args.layer} checks failed (${failedChecks.length}/${args.checks.length}).`,
  };
}

function decisionStopCondition(decision: "proceed" | "hold" | "rollback"):
  | "decision_proceed"
  | "decision_hold"
  | "decision_rollback" {
  if (decision === "rollback") {
    return "decision_rollback";
  }
  if (decision === "hold") {
    return "decision_hold";
  }
  return "decision_proceed";
}

export const getModelSnapshotsForEval = internalQuery({
  args: {
    modelIds: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args): Promise<ModelSnapshot[]> => {
    const allModels = await ctx.db.query("aiModels").collect();

    const modelFilter = new Set(
      (args.modelIds || [])
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0),
    );

    return allModels
      .filter((model) => {
        if (modelFilter.size === 0) {
          return model.isPlatformEnabled === true;
        }
        return modelFilter.has(model.modelId);
      })
      .map((model) => ({
        modelId: model.modelId,
        name: model.name,
        validationStatus: model.validationStatus,
        testResults: model.testResults as ModelValidationTestResults | undefined,
        isPlatformEnabled: model.isPlatformEnabled,
      }));
  },
});

export const runEvalAnalystChecksTool: AITool = {
  name: "run_eval_analyst_checks",
  description:
    "Run Eval Analyst release-gate synthesis across model conformance, workflow behavior, live checks, and telemetry. "
    + "Always returns deterministic PASS/FAIL labels and proceed/hold/rollback decisions.",
  status: "ready",
  readOnly: true,
  parameters: {
    type: "object",
    properties: {
      evaluationIntent: {
        type: "string",
        enum: ["run_eval", "gate_release", "score_wae_bundle"],
        description: "Intent marker for orchestration context.",
      },
      modelIds: {
        type: "array",
        items: { type: "string" },
        description: "Optional model IDs to evaluate. Defaults to platform-enabled models.",
      },
      operationalReviewAcknowledged: {
        type: "boolean",
        description: "Set true when human operational review has been acknowledged.",
      },
      workflowChecks: {
        type: "array",
        description: "Workflow gate checks with deterministic pass/fail flags.",
        items: {
          type: "object",
          properties: {
            checkId: { type: "string" },
            passed: { type: "boolean" },
            failedMetric: { type: "string" },
            details: { type: "string" },
          },
          required: ["checkId", "passed"],
        },
      },
      liveChecks: {
        type: "array",
        description: "Live soul-binding/interview checks with deterministic pass/fail flags.",
        items: {
          type: "object",
          properties: {
            checkId: { type: "string" },
            passed: { type: "boolean" },
            failedMetric: { type: "string" },
            details: { type: "string" },
          },
          required: ["checkId", "passed"],
        },
      },
      telemetryObservations: {
        type: "object",
        description:
          "Optional telemetry metric observations keyed by trust KPI metric IDs.",
      },
      waeRunRecord: {
        type: "object",
        description:
          "Optional WAE scorer run record (`wae_eval_scorer_run_record_v1`) emitted from the Playwright bundle.",
      },
      waeScenarioRecords: {
        type: "array",
        description:
          "Optional WAE scorer scenario records (`wae_eval_scorer_scenario_record_v1`) emitted from the Playwright bundle.",
        items: {
          type: "object",
        },
      },
    },
    required: [],
  },
  execute: async (
    ctx: ToolExecutionContext,
    args: {
      evaluationIntent?: "run_eval" | "gate_release" | "score_wae_bundle";
      modelIds?: string[];
      operationalReviewAcknowledged?: boolean;
      workflowChecks?: ManualGateCheck[];
      liveChecks?: ManualGateCheck[];
      telemetryObservations?: Partial<Record<TrustKpiMetricKey, number>>;
      waeRunRecord?: WaeEvalRunRecordInput;
      waeScenarioRecords?: WaeEvalScenarioRecordInput[];
    },
  ) => {
    const evaluationIntent = args.evaluationIntent || "run_eval";
    if (evaluationIntent === "score_wae_bundle") {
      const runRecord = normalizeWaeRunRecord(args.waeRunRecord);
      const scenarioRecords = normalizeWaeScenarioRecords(args.waeScenarioRecords);
      const waeScore =
        runRecord === null
          ? buildMissingWaeScorePacket()
          : scoreWaeEvalBundle({
              runRecord,
              scenarioRecords,
            });
      const waeRecommendationPacket = buildWaeEvalRecommendationPacket({
        runRecord,
        scenarioRecords,
        scorePacket: waeScore,
      });

      const waeLayer: LayerResult = {
        layer: "wae_weighted_score",
        label: waeScore.verdict === "passed" ? "PASS" : "FAIL",
        failedMetrics:
          waeScore.verdict === "blocked"
            ? waeScore.blockedReasons
            : waeScore.failedMetrics,
        summary:
          waeScore.verdict === "passed"
            ? `WAE weighted rubric passed at ${waeScore.weightedScore}.`
            : waeScore.verdict === "blocked"
              ? `WAE scorer blocked: ${waeScore.blockedReasons.join(", ")}.`
              : `WAE weighted rubric failed at ${waeScore.weightedScore}.`,
      };

      return {
        outputSchema: WAE_EVAL_SCORE_PACKET_VERSION,
        evaluationIntent,
        resultLabel: waeScore.resultLabel,
        decision: waeScore.decision,
        stopCondition: decisionStopCondition(waeScore.decision),
        severity: waeScore.verdict === "passed" ? "ok" : "warning",
        passFailByLayer: [waeLayer],
        failedMetrics: waeLayer.failedMetrics,
        requiredRemediation: waeScore.requiredRemediation,
        waeEvalScore: waeScore,
        waeImprovementRecommendations: waeRecommendationPacket,
      };
    }

    const modelIds = normalizeStringArray(args.modelIds);
    const workflowChecks = normalizeManualChecks(args.workflowChecks);
    const liveChecks = normalizeManualChecks(args.liveChecks);
    const telemetryObservations = normalizeTelemetryObservations(args.telemetryObservations);

    const modelSnapshots = (await ctx.runQuery(
      getInternal().ai.tools.evalAnalystTool.getModelSnapshotsForEval,
      {
        modelIds: modelIds.length > 0 ? modelIds : undefined,
      },
    )) as ModelSnapshot[];

    const modelResults = modelSnapshots.map((model) => {
      const gate = evaluateModelEnablementReleaseGates({
        model: {
          modelId: model.modelId,
          validationStatus: model.validationStatus,
          testResults: model.testResults,
        },
        operationalReviewAcknowledged: args.operationalReviewAcknowledged !== false,
      });

      return {
        modelId: model.modelId,
        modelName: model.name,
        isPlatformEnabled: model.isPlatformEnabled === true,
        label: gate.passed ? "PASS" : "FAIL",
        missingHardGateChecks: gate.missingHardGateChecks,
        failedConformanceMetrics: gate.failedConformanceMetrics,
        reasons: gate.reasons,
      };
    });

    const modelLayerFailedMetrics =
      modelResults.length === 0
        ? ["model_checks_missing"]
        : modelResults
            .filter((result) => result.label === "FAIL")
            .flatMap((result) => [
              ...result.missingHardGateChecks.map((check) => `${result.modelId}:${check}`),
              ...result.failedConformanceMetrics.map((metric) => `${result.modelId}:${metric}`),
            ]);

    const modelLayer: LayerResult = {
      layer: "model_conformance",
      label: modelLayerFailedMetrics.length === 0 ? "PASS" : "FAIL",
      failedMetrics: modelLayerFailedMetrics,
      summary:
        modelResults.length === 0
          ? "No eligible models were found for eval checks."
          : `Models passing release gates: ${modelResults.filter((result) => result.label === "PASS").length}/${modelResults.length}.`,
    };

    const workflowLayer = evaluateManualLayer({
      layer: "workflow_behavior",
      checks: workflowChecks,
    });

    const liveLayer = evaluateManualLayer({
      layer: "live_eval",
      checks: liveChecks,
    });

    const telemetryDecision = evaluateTrustRolloutGuardrails(telemetryObservations);
    const telemetryFailedMetrics = [
      ...telemetryDecision.missingMetrics.map((metric) => `missing:${metric}`),
      ...telemetryDecision.warningMetrics.map((metric) => `warning:${metric}`),
      ...telemetryDecision.criticalMetrics.map((metric) => `critical:${metric}`),
    ];
    const telemetryLayer: LayerResult = {
      layer: "telemetry_rollout",
      label: telemetryDecision.status === "proceed" ? "PASS" : "FAIL",
      failedMetrics: telemetryFailedMetrics,
      summary:
        telemetryDecision.status === "proceed"
          ? "Telemetry rollout guardrails passed."
          : `Telemetry rollout guardrails returned ${telemetryDecision.status}.`,
    };

    const layers: LayerResult[] = [
      modelLayer,
      workflowLayer,
      liveLayer,
      telemetryLayer,
    ];

    const failedLayers = layers.filter((layer) => layer.label === "FAIL");
    const failedMetrics = failedLayers.flatMap((layer) => layer.failedMetrics);

    let decision: "proceed" | "hold" | "rollback" = "proceed";
    if (telemetryDecision.status === "rollback") {
      decision = "rollback";
    } else if (failedLayers.length > 0) {
      decision = "hold";
    }

    const severity =
      decision === "rollback" ? "critical" : decision === "hold" ? "warning" : "ok";

    const requiredRemediation = failedLayers.map((layer) => ({
      layer: layer.layer,
      action: layer.summary,
      failedMetrics: layer.failedMetrics,
    }));

    return {
      outputSchema: "eval_decision_packet.v1",
      evaluationIntent,
      resultLabel: decision === "proceed" ? "PASS" : "FAIL",
      decision,
      stopCondition: decisionStopCondition(decision),
      severity,
      passFailByLayer: layers,
      failedMetrics,
      requiredRemediation,
      modelGateResults: modelResults,
      telemetryGuardrailDecision: {
        status: telemetryDecision.status,
        label: telemetryDecision.status === "proceed" ? "PASS" : "FAIL",
        missingMetrics: telemetryDecision.missingMetrics,
        warningMetrics: telemetryDecision.warningMetrics,
        criticalMetrics: telemetryDecision.criticalMetrics,
      },
    };
  },
};
