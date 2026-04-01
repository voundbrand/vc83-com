import { expect, test } from "@playwright/test";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  buildComplianceInboxPlanner,
  deriveGateBlockersFromRiskRows,
  extractMissingEvidenceGuardrailBlockers,
  hasOrgOwnerDecisionAuthority,
} from "../../../convex/complianceControlPlane";
import { summarizeAvvOutreachRows } from "../../../convex/complianceOutreachAgent";
import type { ResolvedComplianceEvidenceRow } from "../../../convex/complianceEvidenceVault";

const NOW = 1_800_000_000_000;

function makeResolvedEvidenceRow(
  overrides: Record<string, unknown> = {},
): ResolvedComplianceEvidenceRow {
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
    retentionDeleteAt: NOW + 10_000,
    reviewCadence: "annual",
    nextReviewAt: NOW + 5_000,
    tags: [],
    platformShareOrganizationIds: [],
    metadataVersion: 1,
    contractVersion: "compliance_evidence_metadata_v1",
    contractValid: true,
    validationErrors: [],
    updatedAt: NOW - 2_000,
    createdAt: NOW - 20_000,
    sourceMarker: "org_local",
    precedenceRank: 3,
    mergeKey: "local:default",
    ...overrides,
  } as ResolvedComplianceEvidenceRow;
}

test.describe("Compliance Inbox -> Gate flow", () => {
  test("stays fail-closed with missing workflow evidence and preserves org-owner decision authority", async () => {
    const riskRows = [
      {
        riskId: "R-002",
        title: "Provider AVV approvals",
        severity: "high",
        status: "open",
        decisionStatus: "open",
        blocker: true,
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
        status: "open",
        decisionStatus: "partial",
        blocker: true,
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
      resolvedEvidenceRows: [
        makeResolvedEvidenceRow({
          evidenceObjectId: "obj_avv",
          title: "Signed AVV",
          subtype: "avv_provider",
          riskReferences: [{ riskId: "R-002", controlId: "provider_avv" }],
        }),
      ],
      invalidEvidenceRows: [],
    });

    expect(
      planner.actions.some(
        (action) => action.type === "missing_evidence" && action.riskId === "R-003",
      ),
    ).toBe(true);
    expect(planner.summary.blockerRiskIds).toContain("R-003");

    const gateBlockers = deriveGateBlockersFromRiskRows({
      riskRows: riskRows.map((row) => ({
        riskId: row.riskId,
        status: row.status,
        decisionStatus: row.decisionStatus,
        blocker: row.blocker,
        workflowBlockers: row.workflowBlockers,
      })),
    });

    expect(gateBlockers.map((row) => row.code)).toContain("transfer_workflow_record_missing");

    const missingEvidenceBlockers = extractMissingEvidenceGuardrailBlockers(gateBlockers);
    expect(missingEvidenceBlockers.map((row) => row.code)).toContain(
      "transfer_workflow_record_missing",
    );

    const outreachSummary = summarizeAvvOutreachRows({
      rows: [
        {
          dossierObjectId: "obj_dossier" as Id<"objects">,
          organizationId: "org_target" as Id<"organizations">,
          providerName: "Processor Inc",
          providerEmail: "ops@processor.test",
          ownerUserId: "users_owner",
          backupOwnerUserId: null,
          serviceCategory: "processor",
          state: "awaiting_response",
          stateReason: null,
          slaFirstDueAt: NOW - 5_000,
          slaReminderAt: NOW - 2_000,
          slaEscalationAt: NOW - 1_000,
          lastContactedAt: NOW - 9_000,
          respondedAt: null,
          approvedAt: null,
          rejectedAt: null,
          linkedEvidenceObjectIds: [],
          notes: null,
          contractValid: true,
          validationErrors: [],
          updatedAt: NOW - 500,
          createdAt: NOW - 20_000,
        },
      ],
      now: NOW,
    });

    expect(outreachSummary.overdueCount).toBe(1);
    expect(outreachSummary.openCount).toBe(1);

    expect(
      hasOrgOwnerDecisionAuthority({
        isOrgOwner: true,
        isSuperAdmin: false,
        isPlatformOrg: false,
      }),
    ).toBe(true);
    expect(
      hasOrgOwnerDecisionAuthority({
        isOrgOwner: false,
        isSuperAdmin: true,
        isPlatformOrg: false,
      }),
    ).toBe(false);
  });
});
