import crypto from "node:crypto";
import fsPromises from "node:fs/promises";
import path from "node:path";
import {
  buildWaeRolloutGateDecisionArtifact,
  type WaeRolloutGateDecisionArtifact,
} from "../../../convex/ai/agentCatalogAdmin";
import { evaluateWaeImprovementVerificationResult } from "../../../convex/ai/selfImprovement";
import {
  buildMissingWaeScorePacket,
  normalizeWaeRunRecord,
  normalizeWaeScenarioRecords,
  scoreWaeEvalBundle,
  type WaeEvalRunRecordInput,
  type WaeEvalScenarioRecordInput,
  type WaeEvalScorePacket,
} from "../../../convex/ai/tools/evalAnalystTool";
import type { WaeEvalArtifactBundleResult } from "./wae-eval-artifact-bundle";
import {
  collectLexicalReasonCodes,
  refreshWaeLifecycleEvidenceIndex,
  type WaeLifecycleEvidenceIndex,
} from "./wae-eval-fixture";

export const WAE_EVAL_CANARY_DECISION_CONTRACT_VERSION =
  "wae_eval_canary_decision_v1" as const;
export const WAE_EVAL_CANARY_SCENARIO_DIFF_CONTRACT_VERSION =
  "wae_eval_canary_scenario_diff_v1" as const;
export const WAE_EVAL_CANARY_EVIDENCE_BUNDLE_CONTRACT_VERSION =
  "wae_eval_canary_evidence_bundle_v1" as const;

type WaeCanaryDecision = "promote" | "rollback";
type WaeCanaryScenarioDeltaStatus =
  | "unchanged"
  | "improved"
  | "regressed"
  | "coverage_mismatch";

type WaeCanaryVerificationDecision = ReturnType<typeof evaluateWaeImprovementVerificationResult>;

export interface WaeCanaryRunContext {
  runId: string;
  suiteKeyHash: string;
  organizationId: string;
  organizationSlug: string;
  templateVersionTag: string;
}

interface WaeCanaryNormalizedBundle {
  valid: boolean;
  invalidReasonCodes: string[];
  runRecord: WaeEvalRunRecordInput | null;
  scenarioRecords: WaeEvalScenarioRecordInput[];
  scorePacket: WaeEvalScorePacket;
  rolloutGate: WaeRolloutGateDecisionArtifact | null;
}

interface WaeCanaryScenarioSnapshot {
  runId: string;
  actualVerdict: WaeEvalScenarioRecordInput["actualVerdict"] | "MISSING";
  evaluationStatus: WaeEvalScenarioRecordInput["evaluationStatus"] | "missing";
  weightedScore: number;
  reasonCodes: string[];
  failedMetrics: string[];
  artifactPaths: string[];
}

export interface WaeCanaryScenarioDiffRecord {
  contractVersion: typeof WAE_EVAL_CANARY_SCENARIO_DIFF_CONTRACT_VERSION;
  comparisonId: string;
  scenarioId: string;
  agentId: string;
  status: WaeCanaryScenarioDeltaStatus;
  baseline: WaeCanaryScenarioSnapshot;
  candidate: WaeCanaryScenarioSnapshot;
  delta: {
    weightedScore: number;
    addedReasonCodes: string[];
    clearedReasonCodes: string[];
    addedFailedMetrics: string[];
    clearedFailedMetrics: string[];
  };
}

export interface WaeCanaryDecisionRecord {
  contractVersion: typeof WAE_EVAL_CANARY_DECISION_CONTRACT_VERSION;
  comparisonId: string;
  generatedAtMs: number;
  decision: WaeCanaryDecision;
  reasonCodes: string[];
  summary: string;
  isolation: {
    sameOrganization: boolean;
    sameOrganizationSlug: boolean;
    sameSuiteKeyHash: boolean;
    deterministicReplay: boolean;
  };
  baseline: {
    runId: string;
    bundleIndexPath: string;
    scorePacket: WaeEvalScorePacket;
    rolloutGate: WaeRolloutGateDecisionArtifact | null;
  };
  candidate: {
    runId: string;
    bundleIndexPath: string;
    scorePacket: WaeEvalScorePacket;
    rolloutGate: WaeRolloutGateDecisionArtifact | null;
    verification: WaeCanaryVerificationDecision;
  };
  delta: {
    weightedScore: number;
    failedScenarios: number;
    skippedScenarios: number;
    criticalReasonCodes: number;
  };
  counts: {
    regressions: number;
    improvements: number;
    coverageMismatches: number;
  };
  evidencePaths: {
    scenarioDiffsJsonl: string;
    decisionPath: string;
    bundleIndexPath: string;
    baselineBundleIndexPath: string;
    candidateBundleIndexPath: string;
  };
}

interface WaeCanaryBundleIndex {
  contractVersion: typeof WAE_EVAL_CANARY_EVIDENCE_BUNDLE_CONTRACT_VERSION;
  comparisonId: string;
  generatedAtMs: number;
  decision: WaeCanaryDecision;
  files: {
    scenarioDiffsJsonl: string;
    decisionPath: string;
    bundleIndexPath: string;
  };
  checksums: Record<string, string | null>;
  inputs: {
    baselineBundleIndexPath: string;
    candidateBundleIndexPath: string;
  };
}

export interface WaeCanaryEvidenceBundleResult {
  comparisonId: string;
  scenarioDiffsPath: string;
  decisionPath: string;
  bundleIndexPath: string;
  decision: WaeCanaryDecisionRecord;
  scenarioDiffs: WaeCanaryScenarioDiffRecord[];
  lifecycleEvidenceIndex: WaeLifecycleEvidenceIndex;
}

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function toRelativePath(filePath: string): string {
  return path.relative(process.cwd(), filePath) || path.basename(filePath);
}

function roundTo(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function uniqueSorted(values: Array<string | null | undefined>): string[] {
  return collectLexicalReasonCodes(values);
}

async function writeJsonFile(filePath: string, value: unknown): Promise<string> {
  const body = `${JSON.stringify(value, null, 2)}\n`;
  await fsPromises.writeFile(filePath, body, "utf8");
  return sha256(body);
}

async function writeJsonLinesFile(filePath: string, rows: unknown[]): Promise<string> {
  const body = rows.map((row) => JSON.stringify(row)).join("\n");
  const normalized = `${body}${rows.length > 0 ? "\n" : ""}`;
  await fsPromises.writeFile(filePath, normalized, "utf8");
  return sha256(normalized);
}

function buildDeterministicTemplateId(suiteKeyHash: string): string {
  return `wae_canary_template_${suiteKeyHash}`;
}

function buildDeterministicTemplateVersionId(runId: string): string {
  return `wae_canary_template_version_${runId}`;
}

function resolveScenarioArtifactPaths(scenario: WaeEvalScenarioRecordInput | null): string[] {
  if (!scenario) {
    return [];
  }
  return uniqueSorted([
    scenario.artifactPaths?.latestAttemptPath,
    scenario.artifactPaths?.attemptIndexPath,
    scenario.artifactPaths?.playwrightMetadataPath ?? undefined,
    scenario.lifecycleEvidence?.evidenceIndexPath,
    ...(scenario.screenshotPaths ?? []),
  ]);
}

function buildScenarioSnapshot(args: {
  runId: string;
  record: WaeEvalScenarioRecordInput | null;
  scorePacket: WaeEvalScorePacket;
}): WaeCanaryScenarioSnapshot {
  const breakdown =
    args.record
      ? args.scorePacket.scenarioBreakdown.find((candidate) => candidate.scenarioId === args.record?.scenarioId)
      : null;
  if (!args.record) {
    return {
      runId: args.runId,
      actualVerdict: "MISSING",
      evaluationStatus: "missing",
      weightedScore: 0,
      reasonCodes: [],
      failedMetrics: [],
      artifactPaths: [],
    };
  }

  return {
    runId: args.runId,
    actualVerdict: args.record.actualVerdict,
    evaluationStatus: args.record.evaluationStatus,
    weightedScore: breakdown ? breakdown.weightedScore : 0,
    reasonCodes: uniqueSorted(args.record.reasonCodes),
    failedMetrics: uniqueSorted(breakdown?.failedMetrics ?? []),
    artifactPaths: resolveScenarioArtifactPaths(args.record),
  };
}

function normalizeBundle(args: {
  bundle: WaeEvalArtifactBundleResult;
  generatedAtMs: number;
  recordedByUserId: string;
}): WaeCanaryNormalizedBundle {
  const invalidReasonCodes: string[] = [];
  const runRecord = normalizeWaeRunRecord(args.bundle.runRecord);
  const scenarioRecords = normalizeWaeScenarioRecords(args.bundle.scenarioRecords);

  if (!runRecord) {
    invalidReasonCodes.push("bundle_run_record_invalid");
  }
  if (scenarioRecords.length === 0) {
    invalidReasonCodes.push("bundle_scenario_records_missing");
  }
  if (runRecord && scenarioRecords.length !== runRecord.counts.scenarios) {
    invalidReasonCodes.push("bundle_scenario_count_mismatch");
  }

  const scorePacket =
    runRecord && scenarioRecords.length > 0
      ? scoreWaeEvalBundle({
          runRecord,
          scenarioRecords,
        })
      : buildMissingWaeScorePacket();

  const rolloutGate =
    runRecord && scenarioRecords.length > 0
      ? buildWaeRolloutGateDecisionArtifact({
          templateId: buildDeterministicTemplateId(runRecord.suiteKeyHash),
          templateVersionId: buildDeterministicTemplateVersionId(runRecord.runId),
          templateVersionTag: runRecord.templateVersionTag,
          runRecord,
          scenarioRecords,
          score: scorePacket,
          recordedAt: args.generatedAtMs,
          completedAt: args.generatedAtMs,
          recordedByUserId: args.recordedByUserId,
        })
      : null;

  return {
    valid: invalidReasonCodes.length === 0,
    invalidReasonCodes: uniqueSorted(invalidReasonCodes),
    runRecord,
    scenarioRecords,
    scorePacket,
    rolloutGate,
  };
}

function buildScenarioDiffs(args: {
  comparisonId: string;
  baseline: WaeCanaryNormalizedBundle;
  candidate: WaeCanaryNormalizedBundle;
}): WaeCanaryScenarioDiffRecord[] {
  const baselineById = new Map(
    args.baseline.scenarioRecords.map((scenario) => [scenario.scenarioId, scenario]),
  );
  const candidateById = new Map(
    args.candidate.scenarioRecords.map((scenario) => [scenario.scenarioId, scenario]),
  );
  const scenarioIds = Array.from(
    new Set([...baselineById.keys(), ...candidateById.keys()]),
  ).sort((left, right) => left.localeCompare(right));

  return scenarioIds.map((scenarioId) => {
    const baselineRecord = baselineById.get(scenarioId) ?? null;
    const candidateRecord = candidateById.get(scenarioId) ?? null;
    const baselineSnapshot = buildScenarioSnapshot({
      runId: args.baseline.runRecord?.runId ?? "baseline_missing",
      record: baselineRecord,
      scorePacket: args.baseline.scorePacket,
    });
    const candidateSnapshot = buildScenarioSnapshot({
      runId: args.candidate.runRecord?.runId ?? "candidate_missing",
      record: candidateRecord,
      scorePacket: args.candidate.scorePacket,
    });
    const addedReasonCodes = candidateSnapshot.reasonCodes.filter(
      (reasonCode) => !baselineSnapshot.reasonCodes.includes(reasonCode),
    );
    const clearedReasonCodes = baselineSnapshot.reasonCodes.filter(
      (reasonCode) => !candidateSnapshot.reasonCodes.includes(reasonCode),
    );
    const addedFailedMetrics = candidateSnapshot.failedMetrics.filter(
      (metric) => !baselineSnapshot.failedMetrics.includes(metric),
    );
    const clearedFailedMetrics = baselineSnapshot.failedMetrics.filter(
      (metric) => !candidateSnapshot.failedMetrics.includes(metric),
    );
    const weightedScoreDelta = roundTo(
      candidateSnapshot.weightedScore - baselineSnapshot.weightedScore,
      6,
    );

    let status: WaeCanaryScenarioDeltaStatus = "unchanged";
    if (!baselineRecord || !candidateRecord) {
      status = "coverage_mismatch";
    } else if (
      addedReasonCodes.length > 0
      || addedFailedMetrics.length > 0
      || weightedScoreDelta < 0
      || baselineSnapshot.actualVerdict !== candidateSnapshot.actualVerdict
      || baselineSnapshot.evaluationStatus !== candidateSnapshot.evaluationStatus
    ) {
      status = "regressed";
    } else if (
      clearedReasonCodes.length > 0
      || clearedFailedMetrics.length > 0
      || weightedScoreDelta > 0
    ) {
      status = "improved";
    }

    return {
      contractVersion: WAE_EVAL_CANARY_SCENARIO_DIFF_CONTRACT_VERSION,
      comparisonId: args.comparisonId,
      scenarioId,
      agentId: candidateRecord?.agentId ?? baselineRecord?.agentId ?? "missing_agent",
      status,
      baseline: baselineSnapshot,
      candidate: candidateSnapshot,
      delta: {
        weightedScore: weightedScoreDelta,
        addedReasonCodes,
        clearedReasonCodes,
        addedFailedMetrics,
        clearedFailedMetrics,
      },
    };
  });
}

function buildDecisionSummary(args: {
  decision: WaeCanaryDecision;
  candidateRunId: string;
  baselineRunId: string;
  organizationSlug: string;
  reasonCodes: string[];
}): string {
  if (args.decision === "promote") {
    return (
      `Candidate ${args.candidateRunId} matched or exceeded baseline ${args.baselineRunId} `
      + `in isolated org ${args.organizationSlug}.`
    );
  }
  return (
    `Candidate ${args.candidateRunId} regressed against baseline ${args.baselineRunId} `
    + `in isolated org ${args.organizationSlug}: ${args.reasonCodes.join(", ")}.`
  );
}

export function buildDeterministicWaeCanaryTimestampMs(args: {
  baselineRunId: string;
  candidateRunId: string;
  phase: string;
}): number {
  const hash = sha256(
    `${args.baselineRunId}|${args.candidateRunId}|${args.phase}|wae_canary`,
  ).slice(0, 12);
  const offset = Number.parseInt(hash, 16) % 100_000_000;
  return 1_760_100_000_000 + offset;
}

export async function emitWaeCanaryEvidenceBundle(args: {
  baselineContext: WaeCanaryRunContext;
  baselineBundle: WaeEvalArtifactBundleResult;
  candidateContext: WaeCanaryRunContext;
  candidateBundle: WaeEvalArtifactBundleResult;
  reportsRoot?: string;
  generatedAtMs?: number;
  recordedByUserId?: string;
}): Promise<WaeCanaryEvidenceBundleResult> {
  const reportsRoot = args.reportsRoot ?? path.join(process.cwd(), "tmp", "reports", "wae");
  const generatedAtMs =
    args.generatedAtMs
    ?? buildDeterministicWaeCanaryTimestampMs({
      baselineRunId: args.baselineContext.runId,
      candidateRunId: args.candidateContext.runId,
      phase: "bundle",
    });
  const recordedByUserId = args.recordedByUserId ?? "wae_canary_runner";
  const comparisonId = `${args.candidateContext.runId}--vs--${args.baselineContext.runId}`;
  const canaryDir = path.join(reportsRoot, args.candidateContext.runId, "canary");
  await fsPromises.mkdir(canaryDir, { recursive: true });

  const baseline = normalizeBundle({
    bundle: args.baselineBundle,
    generatedAtMs,
    recordedByUserId,
  });
  const candidate = normalizeBundle({
    bundle: args.candidateBundle,
    generatedAtMs,
    recordedByUserId,
  });

  const sameOrganization =
    args.baselineContext.organizationId === args.candidateContext.organizationId;
  const sameOrganizationSlug =
    args.baselineContext.organizationSlug === args.candidateContext.organizationSlug;
  const sameSuiteKeyHash =
    args.baselineContext.suiteKeyHash === args.candidateContext.suiteKeyHash;
  const deterministicReplay =
    baseline.runRecord?.scenarioMatrixContractVersion !== null
    && baseline.runRecord?.scenarioMatrixContractVersion !== undefined
    && baseline.runRecord?.scenarioMatrixContractVersion
      === candidate.runRecord?.scenarioMatrixContractVersion
    && baseline.runRecord?.templateVersionTag === candidate.runRecord?.templateVersionTag;

  const scenarioDiffs = buildScenarioDiffs({
    comparisonId,
    baseline,
    candidate,
  });
  const regressions = scenarioDiffs.filter((scenario) => scenario.status === "regressed");
  const improvements = scenarioDiffs.filter((scenario) => scenario.status === "improved");
  const coverageMismatches = scenarioDiffs.filter(
    (scenario) => scenario.status === "coverage_mismatch",
  );

  const candidateVerification = evaluateWaeImprovementVerificationResult(
    candidate.scorePacket,
  );
  const reasonCodes: string[] = [];

  if (!sameOrganization) {
    reasonCodes.push("org_isolation_mismatch");
  }
  if (!sameOrganizationSlug) {
    reasonCodes.push("org_slug_mismatch");
  }
  if (!sameSuiteKeyHash) {
    reasonCodes.push("suite_key_mismatch");
  }
  if (!deterministicReplay) {
    reasonCodes.push("deterministic_replay_mismatch");
  }
  if (!baseline.valid) {
    reasonCodes.push(...baseline.invalidReasonCodes.map((reasonCode) => `baseline:${reasonCode}`));
  }
  if (!candidate.valid) {
    reasonCodes.push(...candidate.invalidReasonCodes.map((reasonCode) => `candidate:${reasonCode}`));
  }
  if (coverageMismatches.length > 0) {
    reasonCodes.push("scenario_coverage_mismatch");
  }
  if (candidateVerification.workflowState === "blocked") {
    reasonCodes.push("candidate_verification_blocked");
    if (candidateVerification.blockedReason) {
      reasonCodes.push(candidateVerification.blockedReason);
    }
  }
  if (candidateVerification.rollbackRequired) {
    reasonCodes.push("candidate_verification_regressed");
    if (candidateVerification.blockedReason) {
      reasonCodes.push(candidateVerification.blockedReason);
    }
  }

  const weightedScoreDelta = roundTo(
    candidate.scorePacket.weightedScore - baseline.scorePacket.weightedScore,
    6,
  );
  const failedScenarioDelta =
    candidate.scorePacket.counts.failed - baseline.scorePacket.counts.failed;
  const skippedScenarioDelta =
    candidate.scorePacket.counts.skipped - baseline.scorePacket.counts.skipped;
  const criticalReasonCodeDelta =
    (candidate.rolloutGate?.criticalReasonCodeBudget.observedCount ?? 0)
    - (baseline.rolloutGate?.criticalReasonCodeBudget.observedCount ?? 0);

  if (weightedScoreDelta < 0) {
    reasonCodes.push("candidate_weighted_score_regressed");
  }
  if (failedScenarioDelta > 0) {
    reasonCodes.push("candidate_failed_scenarios_increased");
  }
  if (criticalReasonCodeDelta > 0) {
    reasonCodes.push("candidate_critical_reason_codes_increased");
  }
  if (regressions.length > 0) {
    reasonCodes.push("candidate_scenario_regression");
  }
  if (candidate.rolloutGate?.status === "fail") {
    reasonCodes.push("candidate_rollout_gate_failed");
  }

  const decision: WaeCanaryDecision =
    uniqueSorted(reasonCodes).length === 0 ? "promote" : "rollback";

  const scenarioDiffsPath = path.join(canaryDir, "scenario-diffs.jsonl");
  const decisionPath = path.join(canaryDir, "decision.json");
  const bundleIndexPath = path.join(canaryDir, "bundle-index.json");

  const decisionRecord: WaeCanaryDecisionRecord = {
    contractVersion: WAE_EVAL_CANARY_DECISION_CONTRACT_VERSION,
    comparisonId,
    generatedAtMs,
    decision,
    reasonCodes: uniqueSorted(reasonCodes),
    summary: buildDecisionSummary({
      decision,
      candidateRunId: args.candidateContext.runId,
      baselineRunId: args.baselineContext.runId,
      organizationSlug: args.candidateContext.organizationSlug,
      reasonCodes: uniqueSorted(reasonCodes),
    }),
    isolation: {
      sameOrganization,
      sameOrganizationSlug,
      sameSuiteKeyHash,
      deterministicReplay,
    },
    baseline: {
      runId: args.baselineContext.runId,
      bundleIndexPath: toRelativePath(args.baselineBundle.bundleIndexPath),
      scorePacket: baseline.scorePacket,
      rolloutGate: baseline.rolloutGate,
    },
    candidate: {
      runId: args.candidateContext.runId,
      bundleIndexPath: toRelativePath(args.candidateBundle.bundleIndexPath),
      scorePacket: candidate.scorePacket,
      rolloutGate: candidate.rolloutGate,
      verification: candidateVerification,
    },
    delta: {
      weightedScore: weightedScoreDelta,
      failedScenarios: failedScenarioDelta,
      skippedScenarios: skippedScenarioDelta,
      criticalReasonCodes: criticalReasonCodeDelta,
    },
    counts: {
      regressions: regressions.length,
      improvements: improvements.length,
      coverageMismatches: coverageMismatches.length,
    },
    evidencePaths: {
      scenarioDiffsJsonl: toRelativePath(scenarioDiffsPath),
      decisionPath: toRelativePath(decisionPath),
      bundleIndexPath: toRelativePath(bundleIndexPath),
      baselineBundleIndexPath: toRelativePath(args.baselineBundle.bundleIndexPath),
      candidateBundleIndexPath: toRelativePath(args.candidateBundle.bundleIndexPath),
    },
  };

  const scenarioDiffsSha = await writeJsonLinesFile(scenarioDiffsPath, scenarioDiffs);
  const decisionSha = await writeJsonFile(decisionPath, decisionRecord);
  const bundleIndex: WaeCanaryBundleIndex = {
    contractVersion: WAE_EVAL_CANARY_EVIDENCE_BUNDLE_CONTRACT_VERSION,
    comparisonId,
    generatedAtMs,
    decision,
    files: {
      scenarioDiffsJsonl: toRelativePath(scenarioDiffsPath),
      decisionPath: toRelativePath(decisionPath),
      bundleIndexPath: toRelativePath(bundleIndexPath),
    },
    checksums: {
      "scenario-diffs.jsonl": scenarioDiffsSha,
      "decision.json": decisionSha,
      "bundle-index.json": null,
    },
    inputs: {
      baselineBundleIndexPath: toRelativePath(args.baselineBundle.bundleIndexPath),
      candidateBundleIndexPath: toRelativePath(args.candidateBundle.bundleIndexPath),
    },
  };
  await writeJsonFile(bundleIndexPath, bundleIndex);

  const lifecycleEvidenceIndex = await refreshWaeLifecycleEvidenceIndex({
    runId: args.candidateContext.runId,
    reportsRoot,
    playwrightArtifacts: args.candidateBundle.lifecycleEvidenceIndex.artifacts.playwright,
    bundleArtifacts: uniqueSorted([
      ...args.candidateBundle.lifecycleEvidenceIndex.artifacts.bundle,
      toRelativePath(scenarioDiffsPath),
      toRelativePath(decisionPath),
      toRelativePath(bundleIndexPath),
    ]),
    generatedAt: generatedAtMs,
  });

  return {
    comparisonId,
    scenarioDiffsPath,
    decisionPath,
    bundleIndexPath,
    decision: decisionRecord,
    scenarioDiffs,
    lifecycleEvidenceIndex,
  };
}
