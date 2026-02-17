import { CRITICAL_TOOL_NAMES } from "./tools/contracts";

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

type ModelTestResults = Partial<Record<RequiredHardGateCheck, boolean>> | undefined;

export interface ModelEnablementGateModel {
  modelId: string;
  validationStatus: ValidationStatus;
  testResults: ModelTestResults;
}

export interface EvaluateModelEnablementReleaseGatesInput {
  model: ModelEnablementGateModel;
  operationalReviewAcknowledged: boolean;
  expectedCriticalToolContractCount?: number;
}

export interface ModelEnablementReleaseGateResult {
  passed: boolean;
  reasons: string[];
  missingHardGateChecks: RequiredHardGateCheck[];
}

function getMissingHardGateChecks(
  testResults: ModelTestResults
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
  };
}
