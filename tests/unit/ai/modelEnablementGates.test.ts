import { describe, expect, it } from "vitest";
import {
  evaluateRoutingCapabilityRequirements,
  evaluateModelEnablementReleaseGates,
  REQUIRED_CRITICAL_TOOL_CONTRACT_COUNT,
} from "../../../convex/ai/modelEnablementGates";
import { evaluateModelConformance } from "../../../convex/ai/modelConformance";

const passingConformanceSummary = evaluateModelConformance({
  samples: [
    {
      scenarioId: "tooling_1",
      toolCallParsed: true,
      schemaFidelity: true,
      refusalHandled: true,
      latencyMs: 1200,
      totalTokens: 1800,
      costUsd: 0.21,
    },
    {
      scenarioId: "tooling_2",
      toolCallParsed: true,
      schemaFidelity: true,
      refusalHandled: true,
      latencyMs: 1400,
      totalTokens: 2200,
      costUsd: 0.24,
    },
  ],
});

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
    conformance: passingConformanceSummary,
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
    expect(result.failedConformanceMetrics).toEqual([]);
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

  it("fails when measurable conformance summary is missing", () => {
    const result = evaluateModelEnablementReleaseGates({
      model: {
        ...passingModel,
        testResults: {
          ...passingModel.testResults,
          conformance: undefined,
        },
      },
      operationalReviewAcknowledged: true,
    });

    expect(result.passed).toBe(false);
    expect(result.failedConformanceMetrics).toContain("conformance_summary_missing");
    expect(result.reasons.join(" ")).toContain("Conformance gate failed");
  });

  it("fails when measured conformance thresholds are not met", () => {
    const failingConformance = evaluateModelConformance({
      samples: [
        {
          scenarioId: "poor_tooling",
          toolCallParsed: false,
          schemaFidelity: false,
          refusalHandled: false,
          latencyMs: 20_000,
          totalTokens: 1000,
          costUsd: 2,
        },
      ],
    });

    const result = evaluateModelEnablementReleaseGates({
      model: {
        ...passingModel,
        testResults: {
          ...passingModel.testResults,
          conformance: failingConformance,
        },
      },
      operationalReviewAcknowledged: true,
    });

    expect(result.passed).toBe(false);
    expect(result.failedConformanceMetrics).toEqual(
      expect.arrayContaining([
        "tool_call_parse_rate",
        "schema_fidelity_rate",
        "refusal_handling_rate",
        "latency_p95_ms",
        "cost_per_1k_tokens_usd",
      ])
    );
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

  it("passes routing capability requirements when required capabilities are present", () => {
    const result = evaluateRoutingCapabilityRequirements({
      capabilityMatrix: {
        text: true,
        vision: true,
        audio_in: false,
        audio_out: false,
        tools: true,
        json: true,
      },
      requiredCapabilities: ["vision", "tools"],
    });

    expect(result.passed).toBe(true);
    expect(result.missingCapabilities).toEqual([]);
  });

  it("returns missing routing capabilities deterministically", () => {
    const result = evaluateRoutingCapabilityRequirements({
      capabilityMatrix: {
        text: true,
        vision: false,
        audio_in: false,
        audio_out: false,
        tools: false,
        json: false,
      },
      requiredCapabilities: ["vision", "tools", "json"],
    });

    expect(result.passed).toBe(false);
    expect(result.missingCapabilities).toEqual(["vision", "tools", "json"]);
  });
});
