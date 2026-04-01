import { describe, expect, it } from "vitest";
import {
  resolveComplianceMigrationRolloutFlags,
  resolveLegalFrontOfficeComplianceEvaluatorGate,
  resolveComplianceShadowModeEvaluation,
} from "../../../convex/complianceControlPlane";
import { SYNTHETIC_LEGAL_FRONT_OFFICE_SCENARIOS } from "../../fixtures/legal-front-office-synthetic-org";

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

  it("blocks fail-closed when legal front-office commitments require evaluator but no evaluation is available", () => {
    const decision = resolveLegalFrontOfficeComplianceEvaluatorGate({
      evaluation: null,
      evaluatorRequired: true,
      evaluatedAt: 1774483200000,
    });

    expect(decision).toMatchObject({
      status: "blocked",
      failClosed: true,
      reasonCode: "compliance_evaluator_unavailable",
      effectiveGateStatus: "unknown",
      evaluationStatus: "unknown",
    });
  });

  it("passes legal front-office gate when evaluator is required and gate status is GO", () => {
    const flags = resolveComplianceMigrationRolloutFlags({
      shadowModeEvaluatorEnabled: true,
      strictEnforcementEnabled: true,
    });
    const evaluation = resolveComplianceShadowModeEvaluation({
      surface: "ai_chat",
      rolloutFlags: flags,
      effectiveGateStatus: "GO",
      blockerCount: 0,
      blockerIds: [],
      evaluatedAt: 1774483200000,
    });
    const decision = resolveLegalFrontOfficeComplianceEvaluatorGate({
      evaluation,
      evaluatorRequired: true,
      evaluatedAt: 1774483200000,
    });

    expect(decision).toMatchObject({
      status: "passed",
      failClosed: false,
      reasonCode: "compliance_gate_passed",
      effectiveGateStatus: "GO",
      evaluationStatus: "evaluated",
    });
  });

  it("keeps legal commitment scenarios fail-closed when evaluator resolves NO_GO", () => {
    const scenario =
      SYNTHETIC_LEGAL_FRONT_OFFICE_SCENARIOS.commitmentBlockedAtNoGo;
    const flags = resolveComplianceMigrationRolloutFlags({
      shadowModeEvaluatorEnabled: true,
      strictEnforcementEnabled: true,
    });
    const evaluation = resolveComplianceShadowModeEvaluation({
      surface: "ai_chat",
      rolloutFlags: flags,
      effectiveGateStatus: "NO_GO",
      blockerCount: 2,
      blockerIds: ["R-002", "R-003"],
      evaluatedAt: 1774483200000,
    });
    const decision = resolveLegalFrontOfficeComplianceEvaluatorGate({
      evaluation,
      evaluatorRequired: scenario.plannedToolNames.length > 0,
      evaluatedAt: 1774483200000,
    });

    expect(decision).toMatchObject({
      status: "blocked",
      failClosed: true,
      effectiveGateStatus: "NO_GO",
      evaluationStatus: "evaluated",
    });
  });

  it("keeps legal front-office gate matrix deterministic across evaluator outcomes", () => {
    const strictFlags = resolveComplianceMigrationRolloutFlags({
      shadowModeEvaluatorEnabled: true,
      strictEnforcementEnabled: true,
    });
    const goEvaluation = resolveComplianceShadowModeEvaluation({
      surface: "ai_chat",
      rolloutFlags: strictFlags,
      effectiveGateStatus: "GO",
      blockerCount: 0,
      blockerIds: [],
      evaluatedAt: 1774483200000,
    });
    const noGoEvaluation = resolveComplianceShadowModeEvaluation({
      surface: "ai_chat",
      rolloutFlags: strictFlags,
      effectiveGateStatus: "NO_GO",
      blockerCount: 2,
      blockerIds: ["R-002", "R-004"],
      evaluatedAt: 1774483200000,
    });

    const matrix = [
      {
        scenario:
          SYNTHETIC_LEGAL_FRONT_OFFICE_SCENARIOS.commitmentRequiresGate,
        evaluation: null,
      },
      {
        scenario:
          SYNTHETIC_LEGAL_FRONT_OFFICE_SCENARIOS.commitmentRequiresGate,
        evaluation: goEvaluation,
      },
      {
        scenario:
          SYNTHETIC_LEGAL_FRONT_OFFICE_SCENARIOS.commitmentBlockedAtNoGo,
        evaluation: noGoEvaluation,
      },
      {
        scenario:
          SYNTHETIC_LEGAL_FRONT_OFFICE_SCENARIOS.informationalOnlyNoGate,
        evaluation: noGoEvaluation,
      },
    ] as const;

    const results = matrix.map(({ scenario, evaluation }) => {
      const decision = resolveLegalFrontOfficeComplianceEvaluatorGate({
        evaluation,
        evaluatorRequired:
          scenario.plannedToolNames.length > 0
          || /(?:bestätigt|confirmed)/i.test(scenario.assistantContent),
        evaluatedAt: 1774483200000,
      });
      return {
        scenarioId: scenario.scenarioId,
        status: decision.status,
        failClosed: decision.failClosed,
        reasonCode: decision.reasonCode,
      };
    });

    expect(results).toEqual([
      {
        scenarioId: "urgent_callback_commitment",
        status: "blocked",
        failClosed: true,
        reasonCode: "compliance_evaluator_unavailable",
      },
      {
        scenarioId: "urgent_callback_commitment",
        status: "passed",
        failClosed: false,
        reasonCode: "compliance_gate_passed",
      },
      {
        scenarioId: "outbound_confirmation_with_blockers",
        status: "blocked",
        failClosed: true,
        reasonCode: noGoEvaluation.reasonCode,
      },
      {
        scenarioId: "informational_intake_only",
        status: "passed",
        failClosed: false,
        reasonCode: "no_gate_required",
      },
    ]);
  });
});
