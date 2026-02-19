import { describe, expect, it } from "vitest";
import {
  evaluateModelConformance,
  evaluateModelConformanceGate,
} from "../../../convex/ai/modelConformance";

describe("model conformance harness", () => {
  it("passes when all measurable thresholds are satisfied", () => {
    const summary = evaluateModelConformance({
      samples: [
        {
          scenarioId: "sample_1",
          toolCallParsed: true,
          schemaFidelity: true,
          refusalHandled: true,
          latencyMs: 800,
          totalTokens: 1500,
          costUsd: 0.12,
        },
        {
          scenarioId: "sample_2",
          toolCallParsed: true,
          schemaFidelity: true,
          refusalHandled: true,
          latencyMs: 1100,
          totalTokens: 1700,
          costUsd: 0.14,
        },
      ],
    });

    expect(summary.passed).toBe(true);
    expect(summary.failedMetrics).toEqual([]);
    expect(summary.latencyP95Ms).toBe(1100);
    expect(summary.costPer1kTokensUsd).not.toBeNull();
  });

  it("fails deterministically when required evidence is missing", () => {
    const summary = evaluateModelConformance({
      samples: [
        {
          scenarioId: "sample_no_refusal",
          toolCallParsed: true,
          schemaFidelity: true,
          latencyMs: 900,
          totalTokens: 1200,
          costUsd: 0.09,
        },
      ],
    });

    expect(summary.passed).toBe(false);
    expect(summary.failedMetrics).toContain("refusal_handling_rate");
  });

  it("evaluates persisted conformance summaries against thresholds", () => {
    const summary = evaluateModelConformance({
      samples: [
        {
          scenarioId: "sample_1",
          toolCallParsed: true,
          schemaFidelity: true,
          refusalHandled: true,
          latencyMs: 1000,
          totalTokens: 1000,
          costUsd: 0.1,
        },
      ],
    });

    const gate = evaluateModelConformanceGate({ summary });
    expect(gate.passed).toBe(true);
    expect(gate.failedMetrics).toEqual([]);
  });

  it("fails gate evaluation when summary is absent", () => {
    const gate = evaluateModelConformanceGate({ summary: null });
    expect(gate.passed).toBe(false);
    expect(gate.failedMetrics).toContain("conformance_summary_missing");
  });
});
