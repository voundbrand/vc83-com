import { describe, expect, it } from "vitest";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  applyWorkflowSignalsToRiskRows,
  deriveGateBlockersFromRiskRows,
  deriveWorkflowCompletenessSignals,
} from "../../../convex/complianceControlPlane";

describe("compliance workflow gate signals", () => {
  it("fails closed when transfer/security workflow objects are missing", () => {
    const signals = deriveWorkflowCompletenessSignals({
      transferWorkflowObject: null,
      securityWorkflowObject: null,
    });

    expect(signals["R-003"].isComplete).toBe(false);
    expect(signals["R-003"].completenessScore).toBe(0);
    expect(signals["R-003"].blockers).toContain("transfer_workflow_record_missing");
    expect(signals["R-004"].isComplete).toBe(false);
    expect(signals["R-004"].completenessScore).toBe(0);
    expect(signals["R-004"].blockers).toContain("security_workflow_record_missing");
  });

  it("forces R-003/R-004 blockers when manual risk rows are closed but workflow completeness is unresolved", () => {
    const enrichedRows = applyWorkflowSignalsToRiskRows({
      riskRows: [
        {
          riskId: "R-003",
          title: "Transfer impact evidence",
          severity: "high",
          status: "closed",
          decisionStatus: "freigegeben",
          blocker: false,
          lastUpdatedAt: 1700000000000,
        },
        {
          riskId: "R-004",
          title: "Security evidence completeness",
          severity: "medium_high",
          status: "closed",
          decisionStatus: "freigegeben",
          blocker: false,
          lastUpdatedAt: 1700000000000,
        },
      ],
      workflowSignals: deriveWorkflowCompletenessSignals({
        transferWorkflowObject: null,
        securityWorkflowObject: null,
      }),
    });

    expect(enrichedRows[0].blocker).toBe(true);
    expect(enrichedRows[0].workflowBlockers).toContain("transfer_workflow_record_missing");
    expect(enrichedRows[1].blocker).toBe(true);
    expect(enrichedRows[1].workflowBlockers).toContain("security_workflow_record_missing");
  });

  it("keeps blockers cleared when workflow completeness is complete and risk row is already freigegeben", () => {
    const signals = deriveWorkflowCompletenessSignals({
      transferWorkflowObject: {
        _id: "obj_transfer_signal" as Id<"objects">,
        updatedAt: 1800000000000,
        customProperties: {
          exporterRegion: "DE",
          importerRegion: "US",
          transferMapRef: "vault://transfer_map",
          sccReference: "vault://scc",
          tiaReference: "vault://tia",
          supplementaryControls: "vault://controls",
        },
      },
      securityWorkflowObject: {
        _id: "obj_security_signal" as Id<"objects">,
        updatedAt: 1800000001000,
        customProperties: {
          rbacEvidenceRef: "vault://rbac",
          mfaEvidenceRef: "vault://mfa",
          encryptionEvidenceRef: "vault://encryption",
          tenantIsolationEvidenceRef: "vault://tenant",
          keyRotationEvidenceRef: "vault://rotation",
        },
      },
    });

    const enrichedRows = applyWorkflowSignalsToRiskRows({
      riskRows: [
        {
          riskId: "R-003",
          title: "Transfer impact evidence",
          severity: "high",
          status: "closed",
          decisionStatus: "freigegeben",
          blocker: false,
          lastUpdatedAt: 1700000000000,
        },
        {
          riskId: "R-004",
          title: "Security evidence completeness",
          severity: "medium_high",
          status: "closed",
          decisionStatus: "freigegeben",
          blocker: false,
          lastUpdatedAt: 1700000000000,
        },
      ],
      workflowSignals: signals,
    });

    expect(signals["R-003"].isComplete).toBe(true);
    expect(signals["R-003"].blockers).toEqual([]);
    expect(enrichedRows[0].blocker).toBe(false);
    expect(enrichedRows[0].workflowCompletenessScore).toBe(100);
    expect(enrichedRows[0].lastUpdatedAt).toBe(1800000000000);
    expect(signals["R-004"].isComplete).toBe(true);
    expect(signals["R-004"].blockers).toEqual([]);
    expect(enrichedRows[1].blocker).toBe(false);
    expect(enrichedRows[1].workflowCompletenessScore).toBe(100);
    expect(enrichedRows[1].lastUpdatedAt).toBe(1800000001000);
  });

  it("routes workflow revalidation advisory warnings into workflow warning fields without forcing blockers", () => {
    const signals = deriveWorkflowCompletenessSignals({
      transferWorkflowObject: {
        _id: "obj_transfer_signal" as Id<"objects">,
        updatedAt: 1800000000000,
        customProperties: {
          exporterRegion: "DE",
          importerRegion: "US",
          transferMapRef: "vault://transfer_map",
          sccReference: "vault://scc",
          tiaReference: "vault://tia",
          supplementaryControls: "vault://controls",
          revalidationAdvisoryWarnings: ["transfer_revalidation_review_due_soon"],
        },
      },
      securityWorkflowObject: {
        _id: "obj_security_signal" as Id<"objects">,
        updatedAt: 1800000001000,
        customProperties: {
          rbacEvidenceRef: "vault://rbac",
          mfaEvidenceRef: "vault://mfa",
          encryptionEvidenceRef: "vault://encryption",
          tenantIsolationEvidenceRef: "vault://tenant",
          keyRotationEvidenceRef: "vault://rotation",
        },
      },
    });

    const enrichedRows = applyWorkflowSignalsToRiskRows({
      riskRows: [
        {
          riskId: "R-003",
          title: "Transfer impact evidence",
          severity: "high",
          status: "closed",
          decisionStatus: "freigegeben",
          blocker: false,
          lastUpdatedAt: 1700000000000,
        },
      ],
      workflowSignals: signals,
    });

    expect(signals["R-003"].warnings).toContain("transfer_revalidation_review_due_soon");
    expect(enrichedRows[0].workflowWarnings).toContain("transfer_revalidation_review_due_soon");
    expect(enrichedRows[0].blocker).toBe(false);
  });

  it("fails closed when workflow revalidation blocking warnings are present", () => {
    const signals = deriveWorkflowCompletenessSignals({
      transferWorkflowObject: {
        _id: "obj_transfer_signal" as Id<"objects">,
        updatedAt: 1800000000000,
        customProperties: {
          exporterRegion: "DE",
          importerRegion: "US",
          transferMapRef: "vault://transfer_map",
          sccReference: "vault://scc",
          tiaReference: "vault://tia",
          supplementaryControls: "vault://controls",
          revalidationBlockingWarnings: ["transfer_revalidation_review_overdue"],
        },
      },
      securityWorkflowObject: null,
    });

    expect(signals["R-003"].isComplete).toBe(false);
    expect(signals["R-003"].blockers).toContain("transfer_revalidation_review_overdue");
  });

  it("derives explicit fail-closed blocker reasons for gate evaluation", () => {
    const blockers = deriveGateBlockersFromRiskRows({
      riskRows: [
        {
          riskId: "R-003",
          title: "Transfer impact evidence",
          severity: "high",
          status: "closed",
          decisionStatus: "freigegeben",
          blocker: true,
          workflowBlockers: ["transfer_workflow_record_missing", "transfer_map_required"],
          lastUpdatedAt: 1700000000000,
        },
        {
          riskId: "R-004",
          title: "Security evidence completeness",
          severity: "medium_high",
          status: "in_review",
          decisionStatus: "partial",
          blocker: true,
          workflowBlockers: ["mfa_evidence_required"],
          lastUpdatedAt: 1700000000000,
        },
      ],
    });

    expect(
      blockers.map((blocker) => `${blocker.riskId}:${blocker.code}`),
    ).toEqual(
      expect.arrayContaining([
        "R-003:transfer_workflow_record_missing",
        "R-003:transfer_map_required",
        "R-004:mfa_evidence_required",
        "R-004:risk_status_in_review",
        "R-004:risk_decision_partial",
      ]),
    );
    expect(blockers.every((blocker) => blocker.message.length > 0)).toBe(true);
  });
});
