import { expect, test } from "@playwright/test";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  buildComplianceInboxPlanner,
  deriveGateBlockersFromRiskRows,
  extractMissingEvidenceGuardrailBlockers,
} from "../../../convex/complianceControlPlane";
import {
  isPlatformSharedEvidenceVisibleForOrganization,
  resolveEffectiveEvidenceRows,
  type ComplianceEvidenceVaultRow,
} from "../../../convex/complianceEvidenceVault";

const NOW = 1_800_000_100_000;

function makeEvidenceRow(overrides: Record<string, unknown> = {}): ComplianceEvidenceVaultRow {
  return {
    evidenceObjectId: "obj_default" as Id<"objects">,
    organizationId: "org_target" as Id<"organizations">,
    title: "Evidence",
    subtype: "security_control",
    sourceType: "org_uploaded",
    sensitivity: "confidential",
    lifecycleStatus: "active",
    inheritanceScope: "none",
    inheritanceEligible: false,
    riskReferences: [{ riskId: "R-004", controlId: "mfa" }],
    integrity: {
      checksumSha256: "f46f7c5f4f5cbca986f62fbdaf22e7f302c1ce6cabf7f8ba6fb5a3f9bd211fea",
      storagePointer: "convex_storage:storage_1",
      storageProvider: "convex_storage_encrypted",
      encryptionState: "encrypted_at_rest",
    },
    retentionClass: "3_years",
    retentionDeleteAt: NOW + 100_000,
    reviewCadence: "annual",
    nextReviewAt: NOW + 50_000,
    tags: [],
    platformShareOrganizationIds: [],
    metadataVersion: 1,
    contractVersion: "compliance_evidence_metadata_v1",
    contractValid: true,
    validationErrors: [],
    updatedAt: NOW - 1_000,
    createdAt: NOW - 100_000,
    ...overrides,
  } as ComplianceEvidenceVaultRow;
}

test.describe("Compliance Evidence Vault inheritance", () => {
  test("applies platform visibility and org-local precedence deterministically", async () => {
    const targetOrg = "org_target" as Id<"organizations">;

    const sharedAllowlisted = makeEvidenceRow({
      evidenceObjectId: "obj_shared_allow" as Id<"objects">,
      organizationId: "org_platform" as Id<"organizations">,
      sourceType: "system_generated",
      inheritanceScope: "platform_shared",
      inheritanceEligible: true,
      platformShareScope: "org_allowlist",
      platformShareOrganizationIds: [String(targetOrg)],
      riskReferences: [{ riskId: "R-004", controlId: "mfa" }],
      updatedAt: NOW - 3_000,
    });

    const sharedDenylisted = makeEvidenceRow({
      evidenceObjectId: "obj_shared_deny" as Id<"objects">,
      organizationId: "org_platform" as Id<"organizations">,
      sourceType: "system_generated",
      inheritanceScope: "platform_shared",
      inheritanceEligible: true,
      platformShareScope: "org_denylist",
      platformShareOrganizationIds: [String(targetOrg)],
      riskReferences: [{ riskId: "R-004", controlId: "mfa" }],
      updatedAt: NOW - 2_500,
    });

    expect(isPlatformSharedEvidenceVisibleForOrganization(sharedAllowlisted, targetOrg)).toBe(true);
    expect(isPlatformSharedEvidenceVisibleForOrganization(sharedDenylisted, targetOrg)).toBe(false);

    const inheritedRow = makeEvidenceRow({
      evidenceObjectId: "obj_inherited" as Id<"objects">,
      organizationId: targetOrg,
      sourceType: "platform_inherited",
      inheritanceScope: "org_inherited",
      inheritanceEligible: false,
      inheritedFromOrganizationId: "org_platform",
      inheritedFromEvidenceObjectId: "obj_shared_allow",
      riskReferences: [{ riskId: "R-004", controlId: "mfa" }],
      updatedAt: NOW - 2_000,
    });

    const localOverride = makeEvidenceRow({
      evidenceObjectId: "obj_local_override" as Id<"objects">,
      organizationId: targetOrg,
      sourceType: "org_uploaded",
      inheritanceScope: "none",
      supersedesEvidenceObjectId: "obj_shared_allow",
      riskReferences: [{ riskId: "R-004", controlId: "mfa" }],
      updatedAt: NOW - 1_000,
    });

    const resolved = resolveEffectiveEvidenceRows({
      organizationRows: [inheritedRow, localOverride],
      platformSharedRows: [sharedAllowlisted],
    });

    expect(resolved.rows).toHaveLength(1);
    expect(resolved.rows[0].sourceMarker).toBe("org_local");
    expect(resolved.rows[0].evidenceObjectId).toBe("obj_local_override");
    expect(resolved.hiddenRows).toBe(2);
  });

  test("stays fail-closed when inherited transfer evidence is incomplete", async () => {
    const targetOrg = "org_target" as Id<"organizations">;

    const sharedTransferMap = makeEvidenceRow({
      evidenceObjectId: "obj_shared_transfer_map" as Id<"objects">,
      organizationId: "org_platform" as Id<"organizations">,
      title: "Platform transfer map baseline",
      subtype: "transfer_impact",
      sourceType: "system_generated",
      inheritanceScope: "platform_shared",
      inheritanceEligible: true,
      platformShareScope: "fleet_all_orgs",
      riskReferences: [{ riskId: "R-003", controlId: "transfer_map" }],
      updatedAt: NOW - 4_000,
    });

    const inheritedTransferMap = makeEvidenceRow({
      evidenceObjectId: "obj_inherited_transfer_map" as Id<"objects">,
      organizationId: targetOrg,
      title: "Inherited transfer map",
      subtype: "transfer_impact",
      sourceType: "platform_inherited",
      inheritanceScope: "org_inherited",
      inheritanceEligible: false,
      inheritedFromOrganizationId: "org_platform",
      inheritedFromEvidenceObjectId: "obj_shared_transfer_map",
      riskReferences: [{ riskId: "R-003", controlId: "transfer_map" }],
      updatedAt: NOW - 3_000,
    });

    const localAvv = makeEvidenceRow({
      evidenceObjectId: "obj_local_avv" as Id<"objects">,
      organizationId: targetOrg,
      title: "Signed AVV",
      subtype: "avv_provider",
      sourceType: "org_uploaded",
      inheritanceScope: "none",
      riskReferences: [{ riskId: "R-002", controlId: "provider_avv" }],
      updatedAt: NOW - 2_000,
    });

    const localSecurityControl = makeEvidenceRow({
      evidenceObjectId: "obj_local_mfa" as Id<"objects">,
      organizationId: targetOrg,
      title: "MFA control evidence",
      subtype: "security_control",
      sourceType: "org_uploaded",
      inheritanceScope: "none",
      riskReferences: [{ riskId: "R-004", controlId: "mfa" }],
      updatedAt: NOW - 1_500,
    });

    const resolved = resolveEffectiveEvidenceRows({
      organizationRows: [inheritedTransferMap, localAvv, localSecurityControl],
      platformSharedRows: [sharedTransferMap],
    });

    const riskRows = [
      {
        riskId: "R-002",
        title: "Provider AVV approvals",
        severity: "high",
        status: "closed",
        decisionStatus: "freigegeben",
        blocker: false,
        lastUpdatedAt: NOW - 1_000,
      },
      {
        riskId: "R-003",
        title: "Transfer impact evidence",
        severity: "high",
        status: "closed",
        decisionStatus: "freigegeben",
        blocker: true,
        workflowBlockers: ["transfer_workflow_record_missing"],
        lastUpdatedAt: NOW - 1_000,
      },
      {
        riskId: "R-004",
        title: "Security evidence completeness",
        severity: "medium_high",
        status: "closed",
        decisionStatus: "freigegeben",
        blocker: false,
        lastUpdatedAt: NOW - 1_000,
      },
      {
        riskId: "R-005",
        title: "Incident tabletop evidence",
        severity: "medium",
        status: "closed",
        decisionStatus: "freigegeben",
        blocker: false,
        lastUpdatedAt: NOW - 1_000,
      },
    ] as const;

    const planner = buildComplianceInboxPlanner({
      now: NOW,
      riskRows: [...riskRows],
      resolvedEvidenceRows: resolved.rows,
      invalidEvidenceRows: [],
    });

    expect(
      planner.actions.some(
        (action) =>
          action.type === "missing_evidence"
          && action.riskId === "R-003"
          && action.requiredArtifactId === "scc_tia",
      ),
    ).toBe(true);
    expect(planner.summary.blockerRiskIds).toContain("R-003");

    const transferCoverage = planner.riskCoverage.find((row) => row.riskId === "R-003");
    expect(transferCoverage?.inheritedSupportingCount).toBe(1);
    expect(transferCoverage?.orgInheritedSupportingCount).toBe(1);

    const gateBlockers = deriveGateBlockersFromRiskRows({
      riskRows: riskRows.map((row) => ({
        riskId: row.riskId,
        status: row.status,
        decisionStatus: row.decisionStatus,
        blocker: row.blocker,
        workflowBlockers: row.workflowBlockers,
      })),
    });

    const missingEvidence = extractMissingEvidenceGuardrailBlockers(gateBlockers);
    expect(missingEvidence.map((entry) => entry.code)).toContain("transfer_workflow_record_missing");
  });
});
