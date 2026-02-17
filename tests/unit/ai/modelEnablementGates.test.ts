import { describe, expect, it } from "vitest";
import {
  evaluateModelEnablementReleaseGates,
  REQUIRED_CRITICAL_TOOL_CONTRACT_COUNT,
} from "../../../convex/ai/modelEnablementGates";

const passingModel = {
  modelId: "anthropic/claude-sonnet-4.5",
  validationStatus: "validated" as const,
  testResults: {
    basicChat: true,
    toolCalling: true,
    complexParams: true,
    multiTurn: true,
    edgeCases: true,
    contractChecks: true,
  },
};

describe("model enablement release gates", () => {
  it("passes when validation, hard gates, contract gate, and operational acknowledgement are satisfied", () => {
    const result = evaluateModelEnablementReleaseGates({
      model: passingModel,
      operationalReviewAcknowledged: true,
    });

    expect(result.passed).toBe(true);
    expect(result.reasons).toEqual([]);
    expect(result.missingHardGateChecks).toEqual([]);
  });

  it("fails when operational review acknowledgement is missing", () => {
    const result = evaluateModelEnablementReleaseGates({
      model: passingModel,
      operationalReviewAcknowledged: false,
    });

    expect(result.passed).toBe(false);
    expect(result.reasons.join(" ")).toContain("Operational gate failed");
  });

  it("fails when validation status is not validated", () => {
    const result = evaluateModelEnablementReleaseGates({
      model: {
        ...passingModel,
        validationStatus: "failed",
      },
      operationalReviewAcknowledged: true,
    });

    expect(result.passed).toBe(false);
    expect(result.reasons.join(" ")).toContain("validationStatus=validated");
  });

  it("fails when any hard gate check is missing or false", () => {
    const result = evaluateModelEnablementReleaseGates({
      model: {
        ...passingModel,
        testResults: {
          ...passingModel.testResults,
          contractChecks: false,
          multiTurn: undefined,
        },
      },
      operationalReviewAcknowledged: true,
    });

    expect(result.passed).toBe(false);
    expect(result.missingHardGateChecks).toEqual(["multiTurn", "contractChecks"]);
  });

  it("fails when the critical tool contract set size drifts from policy", () => {
    const result = evaluateModelEnablementReleaseGates({
      model: passingModel,
      operationalReviewAcknowledged: true,
      expectedCriticalToolContractCount:
        REQUIRED_CRITICAL_TOOL_CONTRACT_COUNT + 1,
    });

    expect(result.passed).toBe(false);
    expect(result.reasons.join(" ")).toContain("Contract gate failed");
  });
});
