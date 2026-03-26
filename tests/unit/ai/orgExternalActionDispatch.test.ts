import { describe, expect, it } from "vitest";
import {
  ORG_EXTERNAL_ACTION_DISPATCH_COMPENSATION_CONTRACT_VERSION,
  ORG_EXTERNAL_ACTION_DISPATCH_CONTRACT_VERSION,
  buildOrgExternalActionDispatchIdentity,
  resolveOrgExternalActionRollbackDecision,
  resolveOrgExternalActionDispatchGate,
} from "../../../convex/ai/orgExternalActionDispatch";

describe("org external action dispatch gate", () => {
  it("publishes a stable contract version", () => {
    expect(ORG_EXTERNAL_ACTION_DISPATCH_CONTRACT_VERSION).toBe(
      "org_external_action_dispatch_v1",
    );
    expect(ORG_EXTERNAL_ACTION_DISPATCH_COMPENSATION_CONTRACT_VERSION).toBe(
      "org_external_action_compensation_v1",
    );
  });

  it("fails closed when org gate is missing", () => {
    expect(
      resolveOrgExternalActionDispatchGate({
        orgExternalExecutionEnabled: false,
        policyDecision: "approval_required",
        targetSystemClass: "external_connector",
        approvalState: "approved",
        connectorKey: "activecampaign",
        connectorAllowlist: ["activecampaign"],
      }),
    ).toBe("blocked_missing_org_gate");
  });

  it("requires approved work-item state for approval-required policies", () => {
    expect(
      resolveOrgExternalActionDispatchGate({
        orgExternalExecutionEnabled: true,
        policyDecision: "approval_required",
        targetSystemClass: "external_connector",
        approvalState: "pending",
        connectorKey: "activecampaign",
        connectorAllowlist: ["activecampaign"],
      }),
    ).toBe("blocked_unapproved_work_item");
  });

  it("requires target-system and connector allowlist compatibility", () => {
    expect(
      resolveOrgExternalActionDispatchGate({
        orgExternalExecutionEnabled: true,
        policyDecision: "agent_auto_allowed",
        targetSystemClass: "platform_internal",
        approvalState: "approved",
        connectorKey: "activecampaign",
        connectorAllowlist: ["activecampaign"],
      }),
    ).toBe("blocked_target_system");
    expect(
      resolveOrgExternalActionDispatchGate({
        orgExternalExecutionEnabled: true,
        policyDecision: "approval_required",
        targetSystemClass: "external_connector",
        approvalState: "approved",
        connectorKey: "hubspot",
        connectorAllowlist: ["activecampaign"],
      }),
    ).toBe("blocked_connector_not_allowlisted");
    expect(
      resolveOrgExternalActionDispatchGate({
        orgExternalExecutionEnabled: true,
        policyDecision: "approval_required",
        targetSystemClass: "external_connector",
        approvalState: "approved",
        connectorKey: "activecampaign",
        connectorAllowlist: ["activecampaign"],
      }),
    ).toBe("allowed");
  });

  it("builds deterministic external dispatch identities", () => {
    expect(
      buildOrgExternalActionDispatchIdentity({
        organizationId: "organizations_1",
        sessionId: "agentSessions_1",
        actionItemObjectId: "objects_action_1",
        connectorKey: "ActiveCampaign",
        attemptNumber: 2,
      }),
    ).toEqual({
      connectorKey: "activecampaign",
      attemptNumber: 2,
      correlationId:
        "org_action_external_dispatch_correlation:agentSessions_1:objects_action_1:activecampaign:2",
      idempotencyKey:
        "org_action_external_dispatch:organizations_1:objects_action_1:activecampaign:2",
    });
  });

  it("requires compensation when dispatch fails after canonical mutation", () => {
    expect(
      resolveOrgExternalActionRollbackDecision({
        dispatchGate: "allowed",
        dispatchStatus: "failed",
        canonicalMutationApplied: true,
        compensationMode: "log_only",
      }),
    ).toMatchObject({
      decision: "compensate",
      reasonCode: "dispatch_failed_compensation_required",
      compensation: {
        required: true,
        mode: "log_only",
      },
    });
  });

  it("fails closed when dispatch gate is blocked", () => {
    expect(
      resolveOrgExternalActionRollbackDecision({
        dispatchGate: "blocked_connector_not_allowlisted",
        dispatchStatus: "failed",
        canonicalMutationApplied: true,
      }),
    ).toMatchObject({
      decision: "rollback_fail_closed",
      reasonCode:
        "dispatch_gate_blocked:blocked_connector_not_allowlisted",
      compensation: {
        required: false,
      },
    });
  });
});
