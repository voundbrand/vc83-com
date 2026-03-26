import { describe, expect, it } from "vitest";
import type { Id } from "../../../convex/_generated/dataModel";
import { buildComplianceInboxPlanner } from "../../../convex/complianceControlPlane";
import type {
  ComplianceEvidenceVaultRow,
  ResolvedComplianceEvidenceRow,
} from "../../../convex/complianceEvidenceVault";

function makeRiskRows() {
  return [
    {
      riskId: "R-002",
      title: "Provider AVV approvals",
      severity: "high",
      status: "open",
      decisionStatus: "open",
      blocker: true,
      lastUpdatedAt: 1700000000000,
    },
    {
      riskId: "R-003",
      title: "Transfer impact evidence",
      severity: "high",
      status: "open",
      decisionStatus: "open",
      blocker: true,
      lastUpdatedAt: 1700000000000,
    },
    {
      riskId: "R-004",
      title: "Security evidence completeness",
      severity: "medium_high",
      status: "open",
      decisionStatus: "open",
      blocker: true,
      lastUpdatedAt: 1700000000000,
    },
    {
      riskId: "R-005",
      title: "Incident tabletop evidence",
      severity: "medium",
      status: "open",
      decisionStatus: "open",
      blocker: true,
      lastUpdatedAt: 1700000000000,
    },
  ] as const;
}

function makeResolvedEvidenceRow(overrides: Record<string, unknown>): ResolvedComplianceEvidenceRow {
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
    retentionDeleteAt: 1890000000000,
    reviewCadence: "annual",
    nextReviewAt: 1880000000000,
    tags: [],
    platformShareOrganizationIds: [],
    metadataVersion: 1,
    contractVersion: "compliance_evidence_metadata_v1",
    contractValid: true,
    validationErrors: [],
    updatedAt: 1700000000000,
    createdAt: 1690000000000,
    sourceMarker: "org_local",
    precedenceRank: 3,
    mergeKey: "local:default",
    ...overrides,
  } as ResolvedComplianceEvidenceRow;
}

function makeInvalidEvidenceRow(overrides: Record<string, unknown>): ComplianceEvidenceVaultRow {
  return {
    ...makeResolvedEvidenceRow(overrides),
    sourceMarker: undefined,
    precedenceRank: undefined,
    mergeKey: undefined,
  } as unknown as ComplianceEvidenceVaultRow;
}

describe("compliance inbox planner", () => {
  it("derives fail-closed actions from missing artifacts, due reviews, and invalid metadata", () => {
    const now = 1800000000000;
    const riskRows = makeRiskRows();
    const resolvedEvidenceRows: ResolvedComplianceEvidenceRow[] = [
      makeResolvedEvidenceRow({
        evidenceObjectId: "obj_avv" as Id<"objects">,
        title: "Signed AVV",
        subtype: "avv_provider",
        riskReferences: [{ riskId: "R-002", controlId: "provider_avv" }],
      }),
      makeResolvedEvidenceRow({
        evidenceObjectId: "obj_transfer_map" as Id<"objects">,
        title: "Transfer map",
        subtype: "transfer_impact",
        riskReferences: [{ riskId: "R-003", controlId: "transfer_map" }],
        nextReviewAt: now - 1000,
        sourceMarker: "platform_shared",
        precedenceRank: 1,
      }),
      makeResolvedEvidenceRow({
        evidenceObjectId: "obj_security_mfa" as Id<"objects">,
        title: "MFA policy evidence",
        subtype: "security_control",
        riskReferences: [{ riskId: "R-004", controlId: "mfa" }],
        retentionDeleteAt: now - 1000,
        sourceMarker: "org_inherited",
        precedenceRank: 2,
      }),
    ];
    const invalidEvidenceRows: ComplianceEvidenceVaultRow[] = [
      makeInvalidEvidenceRow({
        evidenceObjectId: "obj_invalid" as Id<"objects">,
        title: "Broken security packet",
        riskReferences: [{ riskId: "R-004", controlId: "rbac" }],
        contractValid: false,
        validationErrors: ["invalid_integrity_metadata"],
      }),
    ];

    const planner = buildComplianceInboxPlanner({
      now,
      riskRows: [...riskRows],
      resolvedEvidenceRows,
      invalidEvidenceRows,
    });

    expect(planner.nextAction?.type).toBe("invalid_evidence_metadata");
    expect(planner.actions[0].actionId).toContain("invalid:obj_invalid");
    expect(planner.summary.invalidEvidenceCount).toBe(1);
    expect(planner.summary.overdueRetentionCount).toBe(1);
    expect(planner.summary.dueReviewCount).toBe(1);
    expect(planner.summary.missingArtifactCount).toBe(7);
    expect(planner.actions.some((action) => action.type === "risk_blocker" && action.riskId === "R-002")).toBe(
      true,
    );
    expect(
      planner.riskCoverage.find((row) => row.riskId === "R-004")?.satisfiedArtifactCount,
    ).toBe(1);
    expect(
      planner.riskCoverage.find((row) => row.riskId === "R-004")?.missingArtifactIds,
    ).toEqual(["rbac", "encryption", "tenant_isolation", "key_rotation"]);
    expect(
      planner.riskCoverage.find((row) => row.riskId === "R-003")?.platformSharedSupportingCount,
    ).toBe(1);
    expect(
      planner.riskCoverage.find((row) => row.riskId === "R-004")?.orgInheritedSupportingCount,
    ).toBe(1);
    expect(
      planner.riskCoverage.find((row) => row.riskId === "R-003")?.inheritedSupportingTitles,
    ).toContain("Transfer map");
  });

  it("keeps deterministic action ordering independent of evidence input order", () => {
    const now = 1800000000000;
    const riskRows = makeRiskRows();
    const resolvedEvidenceRows: ResolvedComplianceEvidenceRow[] = [
      makeResolvedEvidenceRow({
        evidenceObjectId: "obj_security_mfa" as Id<"objects">,
        title: "MFA policy evidence",
        subtype: "security_control",
        riskReferences: [{ riskId: "R-004", controlId: "mfa" }],
      }),
      makeResolvedEvidenceRow({
        evidenceObjectId: "obj_avv" as Id<"objects">,
        title: "Signed AVV",
        subtype: "avv_provider",
        riskReferences: [{ riskId: "R-002", controlId: "provider_avv" }],
      }),
      makeResolvedEvidenceRow({
        evidenceObjectId: "obj_transfer_map" as Id<"objects">,
        title: "Transfer map",
        subtype: "transfer_impact",
        riskReferences: [{ riskId: "R-003", controlId: "transfer_map" }],
      }),
    ];

    const first = buildComplianceInboxPlanner({
      now,
      riskRows: [...riskRows],
      resolvedEvidenceRows: [...resolvedEvidenceRows],
      invalidEvidenceRows: [],
    });
    const second = buildComplianceInboxPlanner({
      now,
      riskRows: [...riskRows].reverse(),
      resolvedEvidenceRows: [...resolvedEvidenceRows].reverse(),
      invalidEvidenceRows: [],
    });

    expect(first.actions.map((action) => action.actionId)).toEqual(
      second.actions.map((action) => action.actionId),
    );
    expect(first.actions.map((action) => action.order)).toEqual(
      second.actions.map((action) => action.order),
    );
  });

  it("flags stale evidence references as review-due planner actions", () => {
    const now = 1800000000000;
    const planner = buildComplianceInboxPlanner({
      now,
      riskRows: [...makeRiskRows()],
      resolvedEvidenceRows: [
        makeResolvedEvidenceRow({
          evidenceObjectId: "obj_stale_review" as Id<"objects">,
          title: "Transfer map (stale)",
          subtype: "transfer_impact",
          riskReferences: [{ riskId: "R-003", controlId: "transfer_map" }],
          nextReviewAt: now - 1,
          retentionDeleteAt: now + 100_000,
        }),
      ],
      invalidEvidenceRows: [],
    });

    const reviewDueActions = planner.actions.filter(
      (action) => action.type === "evidence_review_due",
    );
    expect(reviewDueActions.length).toBeGreaterThan(0);
    expect(reviewDueActions.some((action) => action.evidenceObjectId === "obj_stale_review")).toBe(true);
    expect(planner.summary.dueReviewCount).toBeGreaterThan(0);
  });
});
