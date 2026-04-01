import { describe, expect, it } from "vitest";
import { evaluateModelConformance } from "../../../convex/ai/model/modelConformance";
import {
  buildModelReleaseGateAuditReport,
  evaluateModelReleaseGateSnapshot,
  formatModelReleaseGateAuditSummary,
  shouldFailModelReleaseGateAudit,
} from "../../../convex/ai/modelReleaseGateAudit";

const passingConformance = evaluateModelConformance({
  samples: [
    {
      scenarioId: "pass_1",
      toolCallParsed: true,
      schemaFidelity: true,
      refusalHandled: true,
      latencyMs: 900,
      totalTokens: 2000,
      costUsd: 0.12,
    },
    {
      scenarioId: "pass_2",
      toolCallParsed: true,
      schemaFidelity: true,
      refusalHandled: true,
      latencyMs: 1000,
      totalTokens: 1800,
      costUsd: 0.11,
    },
  ],
});

describe("model release gate audit", () => {
  it("marks a validated, acknowledged platform model as release-ready", () => {
    const evaluation = evaluateModelReleaseGateSnapshot({
      snapshot: {
        modelId: "openai/gpt-4o-mini",
        isPlatformEnabled: true,
        validationStatus: "validated",
        operationalReviewAcknowledgedAt: Date.now(),
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
    });

    expect(evaluation.releaseReady).toBe(true);
    expect(evaluation.releaseReadyForToolCalling).toBe(true);
    expect(evaluation.reasons).toEqual([]);
  });

  it("blocks release readiness when operational review acknowledgement is missing for enabled models", () => {
    const evaluation = evaluateModelReleaseGateSnapshot({
      snapshot: {
        modelId: "openai/gpt-4o-mini",
        isPlatformEnabled: true,
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
    });

    expect(evaluation.releaseReady).toBe(false);
    expect(evaluation.reasons.join(" ")).toContain("Operational gate failed");
  });

  it("builds deterministic blocking model lists for platform-enabled failures", () => {
    const report = buildModelReleaseGateAuditReport({
      models: [
        {
          modelId: "zeta/model",
          isPlatformEnabled: false,
          validationStatus: "failed",
        },
        {
          modelId: "alpha/model",
          isPlatformEnabled: true,
          validationStatus: "failed",
        },
      ],
      policy: {
        requireOperationalReviewForEnabledModels: false,
      },
    });

    expect(report.blockingModelCount).toBe(1);
    expect(report.blockingModelIds).toEqual(["alpha/model"]);
  });

  it("fails only in enforce mode when blocking models exist", () => {
    const report = buildModelReleaseGateAuditReport({
      models: [
        {
          modelId: "openai/gpt-4o-mini",
          isPlatformEnabled: true,
          validationStatus: "failed",
        },
      ],
      policy: {
        requireOperationalReviewForEnabledModels: false,
      },
    });

    expect(
      shouldFailModelReleaseGateAudit({
        mode: "audit",
        report,
      })
    ).toBe(false);
    expect(
      shouldFailModelReleaseGateAudit({
        mode: "enforce",
        report,
      })
    ).toBe(true);
  });

  it("formats blocking model summaries with IDs and reasons", () => {
    const report = buildModelReleaseGateAuditReport({
      models: [
        {
          modelId: "anthropic/claude-sonnet-4.5",
          isPlatformEnabled: true,
          validationStatus: "not_tested",
        },
      ],
      policy: {
        requireOperationalReviewForEnabledModels: false,
      },
    });

    const summary = formatModelReleaseGateAuditSummary({
      mode: "enforce",
      report,
    });

    expect(summary).toContain("blocking models:");
    expect(summary).toContain("anthropic/claude-sonnet-4.5");
    expect(summary).toContain("validationStatus=validated");
  });
});
