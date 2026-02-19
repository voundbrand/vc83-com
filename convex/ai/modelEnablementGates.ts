import { CRITICAL_TOOL_NAMES } from "./tools/contracts";
import type { AiCapability, AiCapabilityMatrix } from "../channels/types";
import {
  evaluateModelConformanceGate,
  type ModelConformanceSummary,
  type ModelConformanceThresholds,
} from "./modelConformance";

export const REQUIRED_CRITICAL_TOOL_CONTRACT_COUNT = 10;

const REQUIRED_HARD_GATE_CHECKS = [
  "basicChat",
  "toolCalling",
  "complexParams",
  "multiTurn",
  "edgeCases",
  "contractChecks",
] as const;

type RequiredHardGateCheck = (typeof REQUIRED_HARD_GATE_CHECKS)[number];

type ValidationStatus = "not_tested" | "validated" | "failed" | undefined;

type ModelHardGateResults = Partial<Record<RequiredHardGateCheck, boolean>>;

export interface ModelValidationTestResults extends ModelHardGateResults {
  conformance?: ModelConformanceSummary;
}

export interface ModelEnablementGateModel {
  modelId: string;
  validationStatus: ValidationStatus;
  testResults: ModelValidationTestResults | undefined;
}

export interface EvaluateModelEnablementReleaseGatesInput {
  model: ModelEnablementGateModel;
  operationalReviewAcknowledged: boolean;
  expectedCriticalToolContractCount?: number;
  conformanceThresholds?: Partial<ModelConformanceThresholds>;
}

export interface ModelEnablementReleaseGateResult {
  passed: boolean;
  reasons: string[];
  missingHardGateChecks: RequiredHardGateCheck[];
  failedConformanceMetrics: string[];
}

export interface EvaluateRoutingCapabilityRequirementsInput {
  capabilityMatrix?: Partial<AiCapabilityMatrix> | null;
  requiredCapabilities: AiCapability[];
}

export interface RoutingCapabilityRequirementsResult {
  passed: boolean;
  missingCapabilities: AiCapability[];
}

function getMissingHardGateChecks(
  testResults: ModelValidationTestResults | undefined
): RequiredHardGateCheck[] {
  return REQUIRED_HARD_GATE_CHECKS.filter((check) => testResults?.[check] !== true);
}

export function evaluateModelEnablementReleaseGates(
  input: EvaluateModelEnablementReleaseGatesInput
): ModelEnablementReleaseGateResult {
  const expectedCriticalToolContractCount =
    input.expectedCriticalToolContractCount ?? REQUIRED_CRITICAL_TOOL_CONTRACT_COUNT;
  const reasons: string[] = [];
  const missingHardGateChecks = getMissingHardGateChecks(input.model.testResults);
  const conformanceGateResult = evaluateModelConformanceGate({
    summary: input.model.testResults?.conformance ?? null,
    thresholds: input.conformanceThresholds,
  });

  if (input.model.validationStatus !== "validated") {
    reasons.push(
      `Model ${input.model.modelId} must have validationStatus=validated before enablement.`
    );
  }

  if (missingHardGateChecks.length > 0) {
    reasons.push(
      `Hard gate failed for ${input.model.modelId}; missing/failed checks: ${missingHardGateChecks.join(", ")}.`
    );
  }

  if (!conformanceGateResult.passed) {
    reasons.push(
      `Conformance gate failed for ${input.model.modelId}: ${conformanceGateResult.reasons.join(
        " "
      )}`
    );
  }

  if (CRITICAL_TOOL_NAMES.length !== expectedCriticalToolContractCount) {
    reasons.push(
      `Contract gate failed: expected ${expectedCriticalToolContractCount} critical tool contracts, found ${CRITICAL_TOOL_NAMES.length}.`
    );
  }

  if (!input.operationalReviewAcknowledged) {
    reasons.push(
      "Operational gate failed: explicit operational review acknowledgement is required before enablement."
    );
  }

  return {
    passed: reasons.length === 0,
    reasons,
    missingHardGateChecks,
    failedConformanceMetrics: conformanceGateResult.failedMetrics,
  };
}

export function evaluateRoutingCapabilityRequirements(
  input: EvaluateRoutingCapabilityRequirementsInput
): RoutingCapabilityRequirementsResult {
  const missingCapabilities = input.requiredCapabilities.filter(
    (capability) => input.capabilityMatrix?.[capability] !== true
  );

  return {
    passed: missingCapabilities.length === 0,
    missingCapabilities,
  };
}
