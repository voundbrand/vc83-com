import { describe, expect, it } from "vitest";
import {
  buildSecurityWorkflowArtifactMatrix,
  computeSecurityWorkflowCompleteness,
  computeSecurityWorkflowRevalidationWarnings,
} from "../../../convex/complianceSecurityWorkflow";

describe("compliance security workflow contracts", () => {
  it("builds deterministic R-004 artifact matrix with explicit blockers", () => {
    const matrix = buildSecurityWorkflowArtifactMatrix({
      rbacEvidenceRef: "rbac_ref",
      mfaEvidenceRef: "",
      encryptionEvidenceRef: "enc_ref",
      tenantIsolationEvidenceRef: null,
      keyRotationEvidenceRef: "rotation_ref",
    });

    expect(matrix).toHaveLength(5);
    expect(matrix.find((item) => item.artifactId === "rbac_evidence")?.provided).toBe(true);
    expect(matrix.find((item) => item.artifactId === "mfa_evidence")?.blockerReason).toBe(
      "mfa_evidence_required",
    );
    expect(
      matrix.find((item) => item.artifactId === "tenant_isolation_evidence")?.blockerReason,
    ).toBe("tenant_isolation_evidence_required");
  });

  it("keeps workflow fail-closed when required controls are missing", () => {
    const completeness = computeSecurityWorkflowCompleteness({
      rbacEvidenceRef: "rbac_ref",
      mfaEvidenceRef: "mfa_ref",
      encryptionEvidenceRef: "",
      tenantIsolationEvidenceRef: "tenant_ref",
      keyRotationEvidenceRef: "",
    });

    expect(completeness.isComplete).toBe(false);
    expect(completeness.missingArtifactIds).toEqual(
      expect.arrayContaining(["encryption_evidence", "key_rotation_evidence"]),
    );
    expect(completeness.blockers).toEqual(
      expect.arrayContaining(["encryption_evidence_required", "key_rotation_evidence_required"]),
    );
  });

  it("marks workflow complete only with all required R-004 evidence refs", () => {
    const completeness = computeSecurityWorkflowCompleteness({
      rbacEvidenceRef: "rbac_ref",
      mfaEvidenceRef: "mfa_ref",
      encryptionEvidenceRef: "enc_ref",
      tenantIsolationEvidenceRef: "tenant_ref",
      keyRotationEvidenceRef: "rotation_ref",
    });

    expect(completeness.isComplete).toBe(true);
    expect(completeness.blockers).toEqual([]);
    expect(completeness.missingArtifactIds).toEqual([]);
    expect(completeness.completenessScore).toBe(100);
  });

  it("derives deterministic security revalidation warnings for overdue and expiring evidence", () => {
    const now = 1_800_000_000_000;
    const warnings = computeSecurityWorkflowRevalidationWarnings({
      now,
      rbacEvidenceRef: "obj_rbac",
      mfaEvidenceRef: "obj_mfa",
      encryptionEvidenceRef: "obj_missing_encryption",
      tenantIsolationEvidenceRef: "obj_tenant",
      keyRotationEvidenceRef: "obj_key_rotation",
      evidenceRows: [
        {
          evidenceObjectId: "obj_rbac",
          contractValid: true,
          lifecycleStatus: "active",
          nextReviewAt: now - 1_000,
          retentionDeleteAt: now + 1_000,
        },
        {
          evidenceObjectId: "obj_mfa",
          contractValid: true,
          lifecycleStatus: "active",
          nextReviewAt: now + 2 * 24 * 60 * 60 * 1000,
          retentionDeleteAt: now + 2 * 24 * 60 * 60 * 1000,
        },
        {
          evidenceObjectId: "obj_tenant",
          contractValid: false,
          lifecycleStatus: "active",
        },
        {
          evidenceObjectId: "obj_key_rotation",
          contractValid: true,
          lifecycleStatus: "active",
          nextReviewAt: now + 20 * 24 * 60 * 60 * 1000,
          retentionDeleteAt: now + 40 * 24 * 60 * 60 * 1000,
        },
      ] as any,
    });

    expect(warnings.blockingWarnings).toEqual(
      expect.arrayContaining([
        "security_revalidation_reference_missing",
        "security_revalidation_review_overdue",
        "security_revalidation_evidence_invalid",
      ]),
    );
    expect(warnings.advisoryWarnings).toEqual(
      expect.arrayContaining([
        "security_revalidation_review_due_soon",
        "security_revalidation_retention_expiring_soon",
      ]),
    );
    expect(warnings.missingReferenceIds).toContain("obj_missing_encryption");
  });
});
