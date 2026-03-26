import { describe, expect, it } from "vitest";
import {
  resolveComplianceMigrationRolloutFlags,
  resolveComplianceShadowModeEvaluation,
} from "../../../convex/complianceControlPlane";

describe("compliance shadow-mode evaluator contracts", () => {
  it("keeps evaluator and strict enforcement fail-closed by default", () => {
    const flags = resolveComplianceMigrationRolloutFlags();

    expect(flags.shadowModeEvaluatorEnabled).toBe(false);
    expect(flags.strictEnforcementEnabled).toBe(false);
    expect(flags.shadowModeSurfaceFlags).toEqual({
      finder: false,
      layers: false,
      aiChat: false,
      complianceCenter: false,
    });
  });

  it("enables non-compliance surfaces deterministically when shadow mode is on", () => {
    const flags = resolveComplianceMigrationRolloutFlags({
      shadowModeEvaluatorEnabled: true,
      strictEnforcementEnabled: true,
    });

    expect(flags.shadowModeEvaluatorEnabled).toBe(true);
    expect(flags.strictEnforcementEnabled).toBe(true);
    expect(flags.shadowModeSurfaceFlags).toEqual({
      finder: true,
      layers: true,
      aiChat: true,
      complianceCenter: false,
    });
  });

  it("evaluates non-compliance surfaces as would-block telemetry without blocking", () => {
    const flags = resolveComplianceMigrationRolloutFlags({
      shadowModeEvaluatorEnabled: true,
      strictEnforcementEnabled: false,
    });
    const evaluation = resolveComplianceShadowModeEvaluation({
      surface: "ai_chat",
      rolloutFlags: flags,
      effectiveGateStatus: "NO_GO",
      blockerCount: 2,
      blockerIds: ["R-002", "R-004"],
      evaluatedAt: 1774483200000,
    });

    expect(evaluation).toMatchObject({
      evaluationStatus: "evaluated",
      wouldBlock: true,
      reasonCode: "would_block_non_compliance_surface",
      nonComplianceSurface: true,
      surfaceEnabled: true,
      strictEnforcementEnabled: false,
      effectiveGateStatus: "NO_GO",
      blockerCount: 2,
    });
    expect(evaluation.blockerIds).toEqual(["R-002", "R-004"]);
  });

  it("skips compliance-center surfaces to keep compliance workflows authoritative", () => {
    const flags = resolveComplianceMigrationRolloutFlags({
      shadowModeEvaluatorEnabled: true,
      strictEnforcementEnabled: true,
    });
    const evaluation = resolveComplianceShadowModeEvaluation({
      surface: "compliance_center",
      rolloutFlags: flags,
      effectiveGateStatus: "NO_GO",
      blockerCount: 1,
      blockerIds: ["R-003"],
      evaluatedAt: 1774483200000,
    });

    expect(evaluation.evaluationStatus).toBe("skipped");
    expect(evaluation.wouldBlock).toBe(false);
    expect(evaluation.reasonCode).toBe("compliance_surface_exempt");
    expect(evaluation.nonComplianceSurface).toBe(false);
    expect(evaluation.surfaceEnabled).toBe(false);
  });
});
