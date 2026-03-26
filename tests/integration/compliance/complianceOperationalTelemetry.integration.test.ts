import { describe, expect, it } from "vitest";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  buildComplianceOperationalTelemetry,
  COMPLIANCE_OPERATIONAL_TELEMETRY_CONTRACT_VERSION,
} from "../../../convex/complianceControlPlane";
import type { ComplianceAvvOutreachRow } from "../../../convex/complianceOutreachAgent";
import type { ResolvedComplianceEvidenceRow } from "../../../convex/complianceEvidenceVault";

const NOW = 1_800_000_200_000;

function makeOutreachRow(overrides: Partial<ComplianceAvvOutreachRow> = {}): ComplianceAvvOutreachRow {
  return {
    dossierObjectId: "obj_dossier" as Id<"objects">,
    organizationId: "org_target" as Id<"organizations">,
    providerName: "Processor Inc",
    providerEmail: "ops@processor.test",
    ownerUserId: "users_owner",
    backupOwnerUserId: null,
    serviceCategory: "processor",
    state: "awaiting_response",
    stateReason: null,
    slaFirstDueAt: NOW - 4 * 24 * 60 * 60 * 1000,
    slaReminderAt: NOW - 3 * 24 * 60 * 60 * 1000,
    slaEscalationAt: NOW - 2 * 24 * 60 * 60 * 1000,
    lastContactedAt: NOW - 4 * 24 * 60 * 60 * 1000,
    respondedAt: null,
    approvedAt: null,
    rejectedAt: null,
    linkedEvidenceObjectIds: [],
    notes: null,
    contractValid: true,
    validationErrors: [],
    updatedAt: NOW - 4 * 24 * 60 * 60 * 1000,
    createdAt: NOW - 5 * 24 * 60 * 60 * 1000,
    ...overrides,
  };
}

function makeResolvedEvidenceRow(
  overrides: Partial<ResolvedComplianceEvidenceRow> = {},
): ResolvedComplianceEvidenceRow {
  return {
    evidenceObjectId: "obj_evidence" as Id<"objects">,
    organizationId: "org_target" as Id<"organizations">,
    title: "Evidence",
    subtype: "transfer_impact",
    sourceType: "org_uploaded",
    sensitivity: "confidential",
    lifecycleStatus: "active",
    inheritanceScope: "none",
    inheritanceEligible: false,
    riskReferences: [{ riskId: "R-003", controlId: "transfer_map" }],
    integrity: {
      checksumSha256: "f46f7c5f4f5cbca986f62fbdaf22e7f302c1ce6cabf7f8ba6fb5a3f9bd211fea",
      storagePointer: "convex_storage:storage_1",
      storageProvider: "convex_storage_encrypted",
      encryptionState: "encrypted_at_rest",
    },
    retentionClass: "3_years",
    retentionDeleteAt: NOW - 10,
    reviewCadence: "annual",
    nextReviewAt: NOW - 10,
    tags: [],
    platformShareOrganizationIds: [],
    metadataVersion: 1,
    contractVersion: "compliance_evidence_metadata_v1",
    contractValid: true,
    validationErrors: [],
    updatedAt: NOW - 1_000,
    createdAt: NOW - 100_000,
    sourceMarker: "org_local",
    precedenceRank: 3,
    mergeKey: "local:transfer_map",
    ...overrides,
  };
}

describe("compliance operational telemetry integration", () => {
  it("raises outreach stall and evidence expiry alerts with fail-closed semantics", () => {
    const telemetry = buildComplianceOperationalTelemetry({
      now: NOW,
      gate: {
        effectiveGateStatus: "GO",
        ownerGateDecision: "GO",
        blockerCount: 0,
        blockerIds: [],
      },
      avvOutreachRows: [makeOutreachRow()],
      resolvedEvidenceRows: [makeResolvedEvidenceRow()],
    });

    expect(telemetry.contractVersion).toBe(COMPLIANCE_OPERATIONAL_TELEMETRY_CONTRACT_VERSION);
    expect(telemetry.outreach.stalledCount).toBe(1);
    expect(telemetry.evidence.reviewOverdueCount).toBe(1);
    expect(telemetry.evidence.retentionExpiredCount).toBe(1);
    expect(telemetry.alerts.map((alert) => alert.code)).toEqual(
      expect.arrayContaining([
        "outreach_stalled",
        "evidence_review_overdue",
        "evidence_retention_expired",
      ]),
    );
    expect(telemetry.failClosed).toBe(true);
  });

  it("maps gate transition alert severity to target status", () => {
    const promote = buildComplianceOperationalTelemetry({
      now: NOW,
      gate: {
        effectiveGateStatus: "GO",
        ownerGateDecision: "GO",
        blockerCount: 0,
        blockerIds: [],
      },
      gateTransition: {
        occurredAt: NOW - 1,
        fromEffectiveGateStatus: "NO_GO",
        toEffectiveGateStatus: "GO",
        fromOwnerGateDecision: "NO_GO",
        toOwnerGateDecision: "GO",
      },
      avvOutreachRows: [],
      resolvedEvidenceRows: [],
    });

    const promoteAlert = promote.alerts.find((alert) => alert.code === "gate_transition");
    expect(promoteAlert?.severity).toBe("info");
    expect(promote.failClosed).toBe(false);

    const demote = buildComplianceOperationalTelemetry({
      now: NOW,
      gate: {
        effectiveGateStatus: "NO_GO",
        ownerGateDecision: "NO_GO",
        blockerCount: 1,
        blockerIds: ["R-003"],
      },
      gateTransition: {
        occurredAt: NOW - 1,
        fromEffectiveGateStatus: "GO",
        toEffectiveGateStatus: "NO_GO",
        fromOwnerGateDecision: "GO",
        toOwnerGateDecision: "NO_GO",
      },
      avvOutreachRows: [],
      resolvedEvidenceRows: [],
    });

    const demoteAlert = demote.alerts.find((alert) => alert.code === "gate_transition");
    expect(demoteAlert?.severity).toBe("critical");
    expect(demote.failClosed).toBe(true);
  });

  it("fails closed for invalid active evidence metadata", () => {
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
        makeResolvedEvidenceRow({
          evidenceObjectId: "obj_invalid" as Id<"objects">,
          contractValid: false,
          validationErrors: ["invalid_contract_version"],
        }),
      ],
    });

    expect(telemetry.evidence.invalidCount).toBe(1);
    expect(
      telemetry.alerts.some(
        (alert) => alert.code === "invalid_evidence_metadata" && alert.severity === "critical",
      ),
    ).toBe(true);
    expect(telemetry.failClosed).toBe(true);
  });
});
