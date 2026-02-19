import { describe, expect, it } from "vitest";
import { evaluateModelConformance } from "../../../convex/ai/modelConformance";
import { evaluateModelEnablementReleaseGates } from "../../../convex/ai/modelEnablementGates";

describe("model conformance + enablement integration", () => {
  it("blocks release enablement when conformance metrics breach thresholds", () => {
    const failingConformance = evaluateModelConformance({
      samples: [
        {
          scenarioId: "bad_case",
          toolCallParsed: false,
          schemaFidelity: false,
          refusalHandled: false,
          latencyMs: 25_000,
          totalTokens: 500,
          costUsd: 1.2,
        },
      ],
    });

    const gate = evaluateModelEnablementReleaseGates({
      model: {
        modelId: "openai/gpt-4o-mini",
        validationStatus: "validated",
        testResults: {
          basicChat: true,
          toolCalling: true,
          complexParams: true,
          multiTurn: true,
          edgeCases: true,
          contractChecks: true,
          conformance: failingConformance,
        },
      },
      operationalReviewAcknowledged: true,
    });

    expect(gate.passed).toBe(false);
    expect(gate.failedConformanceMetrics).toContain("latency_p95_ms");
    expect(gate.failedConformanceMetrics).toContain("cost_per_1k_tokens_usd");
  });

  it("allows release enablement when hard gates and conformance gates pass", () => {
    const passingConformance = evaluateModelConformance({
      samples: [
        {
          scenarioId: "good_case_1",
          toolCallParsed: true,
          schemaFidelity: true,
          refusalHandled: true,
          latencyMs: 900,
          totalTokens: 1800,
          costUsd: 0.12,
        },
        {
          scenarioId: "good_case_2",
          toolCallParsed: true,
          schemaFidelity: true,
          refusalHandled: true,
          latencyMs: 1000,
          totalTokens: 2200,
          costUsd: 0.15,
        },
      ],
    });

    const gate = evaluateModelEnablementReleaseGates({
      model: {
        modelId: "openai/gpt-4o-mini",
        validationStatus: "validated",
        testResults: {
          basicChat: true,
          toolCalling: true,
          complexParams: true,
          multiTurn: true,
          edgeCases: true,
          contractChecks: true,
          conformance: passingConformance,
        },
      },
      operationalReviewAcknowledged: true,
    });

    expect(gate.passed).toBe(true);
    expect(gate.reasons).toEqual([]);
  });
});
