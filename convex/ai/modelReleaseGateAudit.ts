import {
  evaluateModelEnablementReleaseGates,
  type ModelValidationTestResults,
} from "./modelEnablementGates";
import type { ModelConformanceThresholds } from "./modelConformance";

export type ModelReleaseGateAuditMode = "audit" | "enforce";

export interface ModelReleaseGateSnapshot {
  modelId: string;
  name?: string;
  provider?: string;
  lifecycleStatus?: string;
  isPlatformEnabled: boolean;
  validationStatus?: "not_tested" | "validated" | "failed";
  testResults?: ModelValidationTestResults;
  operationalReviewAcknowledgedAt?: number;
}

export interface ModelReleaseGatePolicy {
  requireOperationalReviewForEnabledModels: boolean;
  expectedCriticalToolContractCount?: number;
  conformanceThresholds?: Partial<ModelConformanceThresholds>;
}

export interface ModelReleaseGateEvaluation {
  modelId: string;
  name?: string;
  provider?: string;
  lifecycleStatus?: string;
  isPlatformEnabled: boolean;
  releaseReady: boolean;
  releaseReadyForToolCalling: boolean;
  operationalReviewRequired: boolean;
  operationalReviewAcknowledged: boolean;
  reasons: string[];
  missingHardGateChecks: string[];
  failedConformanceMetrics: string[];
}

export interface ModelReleaseGateAuditReport {
  generatedAt: number;
  policy: ModelReleaseGatePolicy;
  totalModels: number;
  platformEnabledModels: number;
  releaseReadyPlatformEnabledModels: number;
  blockingModelCount: number;
  blockingModelIds: string[];
  models: ModelReleaseGateEvaluation[];
}

export const DEFAULT_MODEL_RELEASE_GATE_POLICY: ModelReleaseGatePolicy = {
  requireOperationalReviewForEnabledModels: true,
};

export function normalizeModelReleaseGateAuditMode(
  value?: string | null
): ModelReleaseGateAuditMode {
  return value === "enforce" ? "enforce" : "audit";
}

export function normalizeBooleanReleaseGateFlag(
  value: string | undefined,
  fallback: boolean
): boolean {
  if (typeof value !== "string") {
    return fallback;
  }
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }
  return fallback;
}

function resolvePolicy(
  overrides?: Partial<ModelReleaseGatePolicy>
): ModelReleaseGatePolicy {
  return {
    requireOperationalReviewForEnabledModels:
      overrides?.requireOperationalReviewForEnabledModels
      ?? DEFAULT_MODEL_RELEASE_GATE_POLICY.requireOperationalReviewForEnabledModels,
    ...(typeof overrides?.expectedCriticalToolContractCount === "number"
      ? {
          expectedCriticalToolContractCount:
            overrides.expectedCriticalToolContractCount,
        }
      : {}),
    ...(overrides?.conformanceThresholds
      ? { conformanceThresholds: overrides.conformanceThresholds }
      : {}),
  };
}

export function evaluateModelReleaseGateSnapshot(args: {
  snapshot: ModelReleaseGateSnapshot;
  policy?: Partial<ModelReleaseGatePolicy>;
}): ModelReleaseGateEvaluation {
  const policy = resolvePolicy(args.policy);
  const snapshot = args.snapshot;
  const operationalReviewRequired =
    policy.requireOperationalReviewForEnabledModels && snapshot.isPlatformEnabled;
  const operationalReviewAcknowledged =
    !operationalReviewRequired ||
    typeof snapshot.operationalReviewAcknowledgedAt === "number";

  const gate = evaluateModelEnablementReleaseGates({
    model: {
      modelId: snapshot.modelId,
      validationStatus: snapshot.validationStatus,
      testResults: snapshot.testResults,
    },
    operationalReviewAcknowledged,
    expectedCriticalToolContractCount: policy.expectedCriticalToolContractCount,
    conformanceThresholds: policy.conformanceThresholds,
  });

  return {
    modelId: snapshot.modelId,
    name: snapshot.name,
    provider: snapshot.provider,
    lifecycleStatus: snapshot.lifecycleStatus,
    isPlatformEnabled: snapshot.isPlatformEnabled,
    releaseReady: gate.passed,
    releaseReadyForToolCalling: gate.passed,
    operationalReviewRequired,
    operationalReviewAcknowledged,
    reasons: gate.reasons,
    missingHardGateChecks: gate.missingHardGateChecks,
    failedConformanceMetrics: gate.failedConformanceMetrics,
  };
}

export function buildModelReleaseGateAuditReport(args: {
  models: ModelReleaseGateSnapshot[];
  policy?: Partial<ModelReleaseGatePolicy>;
}): ModelReleaseGateAuditReport {
  const policy = resolvePolicy(args.policy);
  const models = [...args.models]
    .sort((left, right) => left.modelId.localeCompare(right.modelId))
    .map((snapshot) =>
      evaluateModelReleaseGateSnapshot({
        snapshot,
        policy,
      })
    );

  const platformEnabledModels = models.filter(
    (model) => model.isPlatformEnabled
  );
  const blockingModels = platformEnabledModels.filter(
    (model) => !model.releaseReady
  );

  return {
    generatedAt: Date.now(),
    policy,
    totalModels: models.length,
    platformEnabledModels: platformEnabledModels.length,
    releaseReadyPlatformEnabledModels: platformEnabledModels.filter(
      (model) => model.releaseReady
    ).length,
    blockingModelCount: blockingModels.length,
    blockingModelIds: blockingModels.map((model) => model.modelId),
    models,
  };
}

export function shouldFailModelReleaseGateAudit(args: {
  mode: ModelReleaseGateAuditMode;
  report: Pick<ModelReleaseGateAuditReport, "blockingModelCount">;
}): boolean {
  return args.mode === "enforce" && args.report.blockingModelCount > 0;
}

export function formatModelReleaseGateAuditSummary(args: {
  mode: ModelReleaseGateAuditMode;
  report: ModelReleaseGateAuditReport;
}): string {
  const { report } = args;
  const lines = [
    `mode: ${args.mode}`,
    `models: total=${report.totalModels}, platform_enabled=${report.platformEnabledModels}, release_ready_platform_enabled=${report.releaseReadyPlatformEnabledModels}, blocking=${report.blockingModelCount}`,
  ];

  if (report.blockingModelCount === 0) {
    lines.push("blocking models: none");
    return lines.join("\n");
  }

  lines.push("blocking models:");
  for (const model of report.models) {
    if (!model.isPlatformEnabled || model.releaseReady) {
      continue;
    }
    const reasons = model.reasons.length > 0
      ? model.reasons.join(" ")
      : "unknown release gate failure";
    lines.push(`- ${model.modelId}: ${reasons}`);
  }

  return lines.join("\n");
}
