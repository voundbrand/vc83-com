import { describe, expect, it } from "vitest";
import {
  buildOrgActionApprovalPacket,
  ORG_ACTION_APPROVAL_PACKET_CONTRACT_VERSION,
  resolveOrgActionApprovalTransition,
} from "../../../convex/ai/orgAgentActionItems";

describe("org action approval transition contract", () => {
  it("allows approve from pending or assigned", () => {
    expect(
      resolveOrgActionApprovalTransition({
        currentStatus: "pending_review",
        event: "approve",
      }),
    ).toMatchObject({
      allowed: true,
      nextStatus: "approved",
      reasonCode: "approved",
    });
    expect(
      resolveOrgActionApprovalTransition({
        currentStatus: "assigned",
        event: "approve",
      }),
    ).toMatchObject({
      allowed: true,
      nextStatus: "approved",
    });
  });

  it("routes reject/expire into failed", () => {
    expect(
      resolveOrgActionApprovalTransition({
        currentStatus: "pending_review",
        event: "reject",
      }),
    ).toMatchObject({
      allowed: true,
      nextStatus: "failed",
      reasonCode: "rejected",
    });
    expect(
      resolveOrgActionApprovalTransition({
        currentStatus: "approved",
        event: "expire",
      }),
    ).toMatchObject({
      allowed: true,
      nextStatus: "failed",
      reasonCode: "expired",
    });
  });

  it("fails closed for terminal statuses", () => {
    expect(
      resolveOrgActionApprovalTransition({
        currentStatus: "completed",
        event: "approve",
      }),
    ).toMatchObject({
      allowed: false,
      nextStatus: "completed",
      reasonCode: "terminal_status_locked",
    });
  });

  it("builds deterministic approval packet envelopes", () => {
    const packet = buildOrgActionApprovalPacket({
      actionItemObjectId: "objects_action_1",
      organizationId: "organizations_1",
      sessionId: "agentSessions_1",
      sourceActivityObjectId: "objects_activity_1",
      requestedAt: 1735689600000,
      requestedBy: "objects_agent_1",
      policySnapshotId: "orgActionPolicySnapshots_1",
    });
    expect(packet).toEqual({
      contractVersion: ORG_ACTION_APPROVAL_PACKET_CONTRACT_VERSION,
      actionItemObjectId: "objects_action_1",
      organizationId: "organizations_1",
      sessionId: "agentSessions_1",
      sourceActivityObjectId: "objects_activity_1",
      requestedAt: 1735689600000,
      requestedBy: "objects_agent_1",
      policySnapshotId: "orgActionPolicySnapshots_1",
      state: "pending",
    });
  });
});
