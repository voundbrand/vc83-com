import { describe, expect, it } from "vitest";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  validateComplianceEvidenceMetadataContract,
  normalizeComplianceEvidenceRiskReferences,
  normalizeComplianceEvidenceIntegrityMetadata,
  isPlatformSharedEvidenceVisibleForOrganization,
  resolveEffectiveEvidenceRows,
} from "../../../convex/complianceEvidenceVault";

describe("compliance evidence vault metadata contracts", () => {
  const makeRow = (overrides: Record<string, unknown> = {}) => ({
    evidenceObjectId: "obj_default" as Id<"objects">,
    organizationId: "org_default" as Id<"organizations">,
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
    retentionDeleteAt: 1880000000000,
    reviewCadence: "annual",
    nextReviewAt: 1770000000000,
    tags: [],
    platformShareOrganizationIds: [],
    metadataVersion: 1,
    contractVersion: "compliance_evidence_metadata_v1",
    contractValid: true,
    validationErrors: [],
    updatedAt: 1700000000000,
    createdAt: 1690000000000,
    ...overrides,
  });

  it("normalizes and deduplicates risk references", () => {
    const normalized = normalizeComplianceEvidenceRiskReferences([
      { riskId: "R-004", controlId: "mfa", note: "Required for operator access" },
      { riskId: "R-004", controlId: "mfa", note: "duplicate row should collapse" },
      { riskId: "R-003", controlId: "scc", note: "SCC packet" },
      { riskId: "R-999", controlId: "bad" },
    ]);

    expect(normalized).toEqual([
      { riskId: "R-003", controlId: "scc", note: "SCC packet" },
      { riskId: "R-004", controlId: "mfa", note: "duplicate row should collapse" },
    ]);
  });

  it("fails closed for malformed integrity metadata", () => {
    expect(
      normalizeComplianceEvidenceIntegrityMetadata({
        checksumSha256: "abc",
        storagePointer: "vault://bad",
        storageProvider: "organizationMedia",
      }),
    ).toBeNull();
  });

  it("normalizes integrity metadata to encrypted-at-rest defaults", () => {
    const normalized = normalizeComplianceEvidenceIntegrityMetadata({
      checksumSha256: "f46f7c5f4f5cbca986f62fbdaf22e7f302c1ce6cabf7f8ba6fb5a3f9bd211fea",
      storagePointer: "convex_storage:storage_123",
      storageProvider: "convex_storage_encrypted",
      mediaId: "media_456",
    });

    expect(normalized).toEqual({
      checksumSha256: "f46f7c5f4f5cbca986f62fbdaf22e7f302c1ce6cabf7f8ba6fb5a3f9bd211fea",
      storagePointer: "convex_storage:storage_123",
      storageProvider: "convex_storage_encrypted",
      encryptionState: "encrypted_at_rest",
      mediaId: "media_456",
    });
  });

  it("enforces inheritance constraints for platform-inherited evidence", () => {
    const result = validateComplianceEvidenceMetadataContract({
      title: "Inherited AVV",
      subtype: "avv_provider",
      sourceType: "platform_inherited",
      sensitivity: "confidential",
      lifecycleStatus: "active",
      inheritanceScope: "org_inherited",
      inheritanceEligible: false,
      inheritedFromOrganizationId: "org123" as Id<"organizations">,
      riskReferences: [{ riskId: "R-002" }],
      integrity: {
        checksumSha256: "3f9f3076ea4e89f3de84f2f08a1adf6dce7ab26aeb6f714ba74a24b4f81f28f6",
        storagePointer: "vault://org123/evidence/avv.pdf",
        storageProvider: "organizationMedia",
      },
      retentionClass: "3_years",
      retentionDeleteAt: 1800000000000,
      reviewCadence: "annual",
      nextReviewAt: 1700000000000,
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("Expected validation to fail closed.");
    }
    expect(result.error).toContain("requires source organization and source evidence");
  });

  it("fails closed when platform-shared evidence omits explicit scope", () => {
    const result = validateComplianceEvidenceMetadataContract({
      title: "Shared security baseline",
      subtype: "security_control",
      sourceType: "system_generated",
      sensitivity: "internal",
      lifecycleStatus: "active",
      inheritanceScope: "platform_shared",
      inheritanceEligible: true,
      riskReferences: [{ riskId: "R-004" }],
      integrity: {
        checksumSha256: "5e03f41c7de6d4f6a0dbe04162dc9fc74a7db6f37f8bd2af0f77e6cb6176f804",
        storagePointer: "convex_storage:storage_shared_1",
        storageProvider: "convex_storage_encrypted",
      },
      retentionClass: "3_years",
      retentionDeleteAt: 1880000000000,
      reviewCadence: "annual",
      nextReviewAt: 1770000000000,
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("Expected platform scope validation to fail.");
    }
    expect(result.error).toContain("requires an explicit platform share scope");
  });

  it("accepts valid metadata contracts and produces normalized output", () => {
    const result = validateComplianceEvidenceMetadataContract({
      title: "  Transfer Impact Assessment Q1 2026 ",
      description: "  EU-US transfer safeguards package ",
      subtype: "transfer_impact",
      sourceType: "org_uploaded",
      sensitivity: "strictly_confidential",
      lifecycleStatus: "active",
      inheritanceScope: "none",
      inheritanceEligible: false,
      riskReferences: [
        { riskId: "R-003", controlId: "tia", note: "Transfer map + SCC appendix" },
      ],
      integrity: {
        checksumSha256: "f46f7c5f4f5cbca986f62fbdaf22e7f302c1ce6cabf7f8ba6fb5a3f9bd211fea",
        storagePointer: "vault://org_42/transfers/tia-q1-2026.pdf",
        storageProvider: "organizationMedia",
        contentLengthBytes: 145892,
      },
      retentionClass: "7_years",
      retentionDeleteAt: 1870000000000,
      reviewCadence: "quarterly",
      nextReviewAt: 1760000000000,
      tags: ["TIA", "  SCC ", "tia"],
      notes: "  Reviewed by DPO ",
      providerName: "  US Processor Inc ",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error(`Expected valid contract, received: ${result.error}`);
    }

    expect(result.normalized.title).toBe("Transfer Impact Assessment Q1 2026");
    expect(result.normalized.tags).toEqual(["scc", "tia"]);
    expect(result.normalized.integrity.encryptionState).toBe("encrypted_at_rest");
    expect(result.normalized.riskReferences).toEqual([
      { riskId: "R-003", controlId: "tia", note: "Transfer map + SCC appendix" },
    ]);
  });

  it("accepts platform-shared contracts with explicit scope and org targets", () => {
    const result = validateComplianceEvidenceMetadataContract({
      title: "Platform SOC2 packet",
      subtype: "security_control",
      sourceType: "system_generated",
      sensitivity: "confidential",
      lifecycleStatus: "active",
      inheritanceScope: "platform_shared",
      inheritanceEligible: true,
      riskReferences: [{ riskId: "R-004", controlId: "soc2" }],
      integrity: {
        checksumSha256: "37f58f2d2ca1ad0c1f1ddf87afeb9d313da9bd9a95f4ad95b5de9813c6f2f145",
        storagePointer: "convex_storage:storage_soc2_packet",
        storageProvider: "convex_storage_encrypted",
      },
      retentionClass: "7_years",
      retentionDeleteAt: 1890000000000,
      reviewCadence: "annual",
      nextReviewAt: 1780000000000,
      platformShareScope: "org_allowlist",
      platformShareOrganizationIds: [
        "org_a" as Id<"organizations">,
        "org_b" as Id<"organizations">,
      ],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error(`Expected valid platform shared contract, received: ${result.error}`);
    }
    expect(result.normalized.platformShareScope).toBe("org_allowlist");
    expect(result.normalized.platformShareOrganizationIds).toHaveLength(2);
  });

  it("resolves inheritance precedence as org_local > org_inherited > platform_shared", () => {
    const sharedRow = makeRow({
      evidenceObjectId: "obj_shared" as Id<"objects">,
      organizationId: "org_platform" as Id<"organizations">,
      sourceType: "system_generated",
      inheritanceScope: "platform_shared",
      inheritanceEligible: true,
      platformShareScope: "fleet_all_orgs",
      updatedAt: 1700000000000,
    });
    const inheritedRow = makeRow({
      evidenceObjectId: "obj_inherited" as Id<"objects">,
      organizationId: "org_target" as Id<"organizations">,
      sourceType: "platform_inherited",
      inheritanceScope: "org_inherited",
      inheritedFromEvidenceObjectId: "obj_shared",
      updatedAt: 1700000001000,
    });
    const localOverride = makeRow({
      evidenceObjectId: "obj_local" as Id<"objects">,
      organizationId: "org_target" as Id<"organizations">,
      sourceType: "org_uploaded",
      inheritanceScope: "none",
      supersedesEvidenceObjectId: "obj_shared",
      updatedAt: 1700000002000,
    });

    const resolved = resolveEffectiveEvidenceRows({
      organizationRows: [inheritedRow as never, localOverride as never],
      platformSharedRows: [sharedRow as never],
    });

    expect(resolved.rows).toHaveLength(1);
    expect(resolved.rows[0].sourceMarker).toBe("org_local");
    expect(resolved.rows[0].evidenceObjectId).toBe("obj_local");
    expect(resolved.hiddenRows).toBe(2);
  });

  it("fails closed for cross-org visibility when platform share scope excludes target org", () => {
    const allowlistRow = makeRow({
      organizationId: "org_platform" as Id<"organizations">,
      sourceType: "system_generated",
      inheritanceScope: "platform_shared",
      inheritanceEligible: true,
      platformShareScope: "org_allowlist",
      platformShareOrganizationIds: ["org_allowed" as Id<"organizations">],
    });
    expect(
      isPlatformSharedEvidenceVisibleForOrganization({
        row: allowlistRow as never,
        organizationId: "org_denied" as Id<"organizations">,
      }),
    ).toBe(false);

    const denylistRow = makeRow({
      organizationId: "org_platform" as Id<"organizations">,
      sourceType: "system_generated",
      inheritanceScope: "platform_shared",
      inheritanceEligible: true,
      platformShareScope: "org_denylist",
      platformShareOrganizationIds: ["org_denied" as Id<"organizations">],
    });
    expect(
      isPlatformSharedEvidenceVisibleForOrganization({
        row: denylistRow as never,
        organizationId: "org_denied" as Id<"organizations">,
      }),
    ).toBe(false);
  });
});
