import { describe, expect, it } from "vitest";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import { mapComplianceInboxWizardDraftObjectToSnapshot } from "../../../convex/complianceControlPlane";

function makeDraftObject(
  overrides: Record<string, unknown> = {},
): Doc<"objects"> {
  return {
    _id: "obj_draft_1" as Id<"objects">,
    organizationId: "org_1" as Id<"organizations">,
    type: "compliance_inbox_wizard_draft",
    subtype: "org_owner_session",
    name: "compliance_inbox_wizard_checkpoint",
    description: "draft",
    status: "draft",
    customProperties: {
      sessionId: "session_abc",
      userId: "user_abc",
      actionId: "missing:R-003:transfer_map",
      riskId: "R-003",
      workflow: "transfer",
      stepIndex: 2.9,
      stepLabel: "Supplementary controls",
      checkpointUpdatedAt: 1890000000000,
      avvDraft: {
        providerName: "Provider GmbH",
      },
      transferDraft: {
        exporterRegion: "DE",
        importerRegion: "US",
        transferMapRef: "obj_transfer_map",
        sccReference: "obj_scc",
        tiaReference: "obj_tia",
        supplementaryControls: "appendix-a",
      },
      securityDraft: {
        rbacEvidenceRef: "obj_rbac",
      },
    },
    createdBy: "user_abc" as Id<"users">,
    createdAt: 1880000000000,
    updatedAt: 1891000000000,
    ...overrides,
  } as Doc<"objects">;
}

describe("compliance inbox wizard draft mapping", () => {
  it("maps persisted checkpoint payload into deterministic snapshot shape", () => {
    const snapshot = mapComplianceInboxWizardDraftObjectToSnapshot(
      makeDraftObject(),
    );

    expect(snapshot.sessionId).toBe("session_abc");
    expect(snapshot.userId).toBe("user_abc");
    expect(snapshot.workflow).toBe("transfer");
    expect(snapshot.riskId).toBe("R-003");
    expect(snapshot.stepIndex).toBe(2);
    expect(snapshot.stepLabel).toBe("Supplementary controls");
    expect(snapshot.checkpointUpdatedAt).toBe(1890000000000);
    expect(snapshot.transferDraft.exporterRegion).toBe("DE");
    expect(snapshot.transferDraft.importerRegion).toBe("US");
    expect(snapshot.transferDraft.transferMapRef).toBe("obj_transfer_map");
    expect(snapshot.securityDraft.rbacEvidenceRef).toBe("obj_rbac");
  });

  it("fails closed for malformed metadata and normalizes to safe defaults", () => {
    const snapshot = mapComplianceInboxWizardDraftObjectToSnapshot(
      makeDraftObject({
        customProperties: {
          sessionId: "   ",
          userId: null,
          riskId: "R-999",
          workflow: "unexpected",
          stepIndex: -4,
          checkpointUpdatedAt: "bad",
          avvDraft: {
            providerName: "   ",
          },
        },
        updatedAt: 2000,
      }),
    );

    expect(snapshot.sessionId).toBe("");
    expect(snapshot.userId).toBe("");
    expect(snapshot.riskId).toBeNull();
    expect(snapshot.workflow).toBeNull();
    expect(snapshot.stepIndex).toBe(0);
    expect(snapshot.checkpointUpdatedAt).toBe(2000);
    expect(snapshot.avvDraft.providerName).toBeNull();
    expect(snapshot.transferDraft.transferMapRef).toBeNull();
    expect(snapshot.securityDraft.keyRotationEvidenceRef).toBeNull();
  });
});
