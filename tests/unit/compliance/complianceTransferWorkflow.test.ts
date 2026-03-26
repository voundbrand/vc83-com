import { describe, expect, it } from "vitest";
import {
  buildTransferImpactArtifactMatrix,
  computeTransferWorkflowCompleteness,
  computeTransferWorkflowRevalidationWarnings,
} from "../../../convex/complianceTransferWorkflow";

describe("compliance transfer workflow contracts", () => {
  it("builds deterministic artifact matrix with required blocker reasons", () => {
    const matrix = buildTransferImpactArtifactMatrix({
      transferMapRef: "vault://evidence/transfer-map.pdf",
      sccReference: null,
      tiaReference: "vault://evidence/tia.pdf",
      supplementaryControls: "",
    });

    expect(matrix).toHaveLength(3);
    expect(matrix[0]).toMatchObject({
      artifactId: "transfer_map",
      provided: true,
    });
    expect(matrix[1]).toMatchObject({
      artifactId: "scc_tia_package",
      provided: false,
      blockerReason: "scc_and_tia_required",
    });
    expect(matrix[2]).toMatchObject({
      artifactId: "supplementary_controls",
      provided: false,
      blockerReason: "supplementary_controls_required",
    });
  });

  it("computes fail-closed completeness when required regions are missing", () => {
    const completeness = computeTransferWorkflowCompleteness({
      exporterRegion: "",
      importerRegion: "US",
      transferMapRef: "map_ref",
      sccReference: "scc_ref",
      tiaReference: "tia_ref",
      supplementaryControls: "controls_ref",
    });

    expect(completeness.isComplete).toBe(false);
    expect(completeness.blockers).toContain("transfer_regions_required");
    expect(completeness.completenessScore).toBe(100);
  });

  it("marks workflow complete only when all artifacts and regions are present", () => {
    const completeness = computeTransferWorkflowCompleteness({
      exporterRegion: "DE",
      importerRegion: "US",
      transferMapRef: "map_ref",
      sccReference: "scc_ref",
      tiaReference: "tia_ref",
      supplementaryControls: "controls_ref",
    });

    expect(completeness.isComplete).toBe(true);
    expect(completeness.missingArtifactIds).toEqual([]);
    expect(completeness.blockers).toEqual([]);
    expect(completeness.completenessScore).toBe(100);
  });

  it("derives deterministic transfer revalidation warnings for overdue and expiring evidence", () => {
    const now = 1_800_000_000_000;
    const warnings = computeTransferWorkflowRevalidationWarnings({
      now,
      transferMapRef: "obj_transfer_map",
      sccReference: "obj_scc",
      tiaReference: "obj_missing_tia",
      supplementaryControls: "obj_controls",
      evidenceRows: [
        {
          evidenceObjectId: "obj_transfer_map",
          contractValid: true,
          lifecycleStatus: "active",
          nextReviewAt: now + 1_000,
          retentionDeleteAt: now + 30 * 24 * 60 * 60 * 1000,
        },
        {
          evidenceObjectId: "obj_scc",
          contractValid: true,
          lifecycleStatus: "active",
          nextReviewAt: now - 1_000,
          retentionDeleteAt: now + 2_000,
        },
        {
          evidenceObjectId: "obj_controls",
          contractValid: true,
          lifecycleStatus: "active",
          nextReviewAt: now + 2 * 24 * 60 * 60 * 1000,
          retentionDeleteAt: now + 2 * 24 * 60 * 60 * 1000,
        },
      ] as any,
    });

    expect(warnings.blockingWarnings).toEqual(
      expect.arrayContaining([
        "transfer_revalidation_reference_missing",
        "transfer_revalidation_review_overdue",
      ]),
    );
    expect(warnings.advisoryWarnings).toEqual(
      expect.arrayContaining([
        "transfer_revalidation_review_due_soon",
        "transfer_revalidation_retention_expiring_soon",
      ]),
    );
    expect(warnings.missingReferenceIds).toContain("obj_missing_tia");
  });
});
