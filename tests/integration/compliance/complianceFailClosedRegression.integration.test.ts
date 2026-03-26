import { describe, expect, it } from "vitest";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  buildComplianceOperationalTelemetry,
  deriveGateBlockersFromRiskRows,
} from "../../../convex/complianceControlPlane";
import { isPlatformSharedEvidenceVisibleForOrganization } from "../../../convex/complianceEvidenceVault";

const NOW = 1_800_000_300_000;

describe("compliance fail-closed regression matrix", () => {
  it("blocks GO posture while any blocker remains", () => {
    const blockers = deriveGateBlockersFromRiskRows({
      riskRows: [
        {
          riskId: "R-003",
          status: "open",
          decisionStatus: "open",
          blocker: true,
          workflowBlockers: ["transfer_workflow_record_missing"],
        },
      ],
    });
    const canSetGo = blockers.length === 0;

    expect(canSetGo).toBe(false);
    expect(blockers[0]).toMatchObject({
      riskId: "R-003",
      code: "transfer_workflow_record_missing",
    });
  });

  it("rejects cross-org platform-shared evidence visibility when org is not allowlisted", () => {
    const visible = isPlatformSharedEvidenceVisibleForOrganization({
      organizationId: "org_denied" as Id<"organizations">,
      row: {
        sourceType: "system_generated",
        inheritanceScope: "platform_shared",
        platformShareScope: "org_allowlist",
        platformShareOrganizationIds: ["org_allowed"],
      } as never,
    });
    expect(visible).toBe(false);
  });

  it("keeps stale evidence references fail-closed in operational telemetry", () => {
    const telemetry = buildComplianceOperationalTelemetry({
      now: NOW,
      gate: {
        effectiveGateStatus: "GO",
        ownerGateDecision: "GO",
        blockerCount: 0,
        blockerIds: [],
      },
      avvOutreachRows: [],
      resolvedEvidenceRows: [
        {
          evidenceObjectId: "obj_stale" as Id<"objects">,
          organizationId: "org_target" as Id<"organizations">,
          title: "Stale transfer map",
          subtype: "transfer_impact",
          sourceType: "org_uploaded",
          sensitivity: "confidential",
          lifecycleStatus: "active",
          inheritanceScope: "none",
          inheritanceEligible: false,
          riskReferences: [{ riskId: "R-003", controlId: "transfer_map" }],
          integrity: {
            checksumSha256: "f46f7c5f4f5cbca986f62fbdaf22e7f302c1ce6cabf7f8ba6fb5a3f9bd211fea",
            storagePointer: "convex_storage:stale",
            storageProvider: "convex_storage_encrypted",
            encryptionState: "encrypted_at_rest",
          },
          retentionClass: "3_years",
          retentionDeleteAt: NOW + 1_000_000,
          reviewCadence: "annual",
          nextReviewAt: NOW - 1,
          tags: [],
          platformShareOrganizationIds: [],
          metadataVersion: 1,
          contractVersion: "compliance_evidence_metadata_v1",
          contractValid: true,
          validationErrors: [],
          updatedAt: NOW - 2_000,
          createdAt: NOW - 3_000,
          sourceMarker: "org_local",
          precedenceRank: 3,
          mergeKey: "local:stale_transfer_map",
        },
      ],
    });

    expect(telemetry.failClosed).toBe(true);
    expect(telemetry.evidence.reviewOverdueCount).toBeGreaterThan(0);
  });
});
