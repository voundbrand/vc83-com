import { describe, expect, it } from "vitest";
import {
  deriveGateBlockersFromRiskRows,
  extractMissingEvidenceGuardrailBlockers,
  isMissingEvidenceGuardrailCode,
} from "../../../convex/complianceControlPlane";

describe("compliance gate engine guardrails", () => {
  it("derives workflow and risk blockers for blocked rows", () => {
    const blockers = deriveGateBlockersFromRiskRows({
      riskRows: [
        {
          riskId: "R-003",
          status: "closed",
          decisionStatus: "freigegeben",
          blocker: true,
          workflowBlockers: ["transfer_workflow_record_missing"],
        },
      ],
    });

    expect(
      blockers.map((blocker) => `${blocker.riskId}:${blocker.source}:${blocker.code}`),
    ).toEqual(["R-003:workflow:transfer_workflow_record_missing"]);
  });

  it("flags missing-evidence blocker codes deterministically", () => {
    expect(isMissingEvidenceGuardrailCode("transfer_workflow_record_missing")).toBe(true);
    expect(isMissingEvidenceGuardrailCode("evidence_review_due")).toBe(true);
    expect(isMissingEvidenceGuardrailCode("risk_status_open")).toBe(false);
  });

  it("extracts only missing-evidence blockers for audit events", () => {
    const missing = extractMissingEvidenceGuardrailBlockers([
      {
        riskId: "R-003",
        code: "transfer_workflow_record_missing",
        message: "missing",
        source: "workflow",
      },
      {
        riskId: "R-004",
        code: "risk_decision_partial",
        message: "partial",
        source: "risk_assessment",
      },
      {
        riskId: "R-005",
        code: "incident_tabletop_expired",
        message: "expired",
        source: "risk_assessment",
      },
    ]);

    expect(missing.map((entry) => `${entry.riskId}:${entry.code}`)).toEqual([
      "R-003:transfer_workflow_record_missing",
      "R-005:incident_tabletop_expired",
    ]);
  });

  it("keeps GO decision fail-closed whenever blockers remain", () => {
    const blockers = deriveGateBlockersFromRiskRows({
      riskRows: [
        {
          riskId: "R-002",
          status: "open",
          decisionStatus: "open",
          blocker: true,
          workflowBlockers: [],
        },
      ],
    });

    const canSetGo = blockers.length === 0;
    expect(canSetGo).toBe(false);
    expect(blockers[0]).toMatchObject({
      riskId: "R-002",
      code: "risk_status_open",
      source: "risk_assessment",
    });
  });
});
