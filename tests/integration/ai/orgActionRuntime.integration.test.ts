import { describe, expect, it } from "vitest";
import {
  buildOrgActionApprovalCorrelationId,
  buildOrgActionApprovalIdempotencyKey,
  buildOrgActionExternalDispatchCorrelationId,
  buildOrgActionExternalDispatchIdempotencyKey,
  buildOrgActionExecutionReceiptIdempotencyKey,
  buildOrgActionReceiptCorrelationId,
} from "../../../convex/ai/orgActionExecution";
import {
  buildOrgActionSyncReceiptCorrelationId,
  buildOrgActionSyncReceiptIdempotencyKey,
} from "../../../convex/ai/orgActionSyncOutbox";
import {
  buildOrgExternalActionDispatchIdentity,
  resolveOrgExternalActionDispatchGate,
  resolveOrgExternalActionRollbackDecision,
} from "../../../convex/ai/orgExternalActionDispatch";

describe("org action runtime correlation/idempotency integration", () => {
  it("keeps approval, execution, and sync keys deterministic across one attempt chain", () => {
    const approvalCorrelation = buildOrgActionApprovalCorrelationId({
      sessionId: "agentSessions_1",
      actionItemObjectId: "objects_action_1",
      transition: "approve",
      transitionNumber: 1,
    });
    const approvalIdempotency = buildOrgActionApprovalIdempotencyKey({
      organizationId: "organizations_1",
      actionItemObjectId: "objects_action_1",
      transition: "approve",
      transitionNumber: 1,
    });

    const executionCorrelation = buildOrgActionReceiptCorrelationId({
      sessionId: "agentSessions_1",
      actionItemObjectId: "objects_action_1",
      attemptNumber: 1,
    });
    const executionIdempotency = buildOrgActionExecutionReceiptIdempotencyKey({
      organizationId: "organizations_1",
      actionItemObjectId: "objects_action_1",
      actionFamily: "create_crm_note",
      attemptNumber: 1,
    });

    const syncCorrelation = buildOrgActionSyncReceiptCorrelationId({
      organizationId: "organizations_1",
      syncCandidateObjectId: "objects_sync_1",
      attemptNumber: 1,
    });
    const syncIdempotency = buildOrgActionSyncReceiptIdempotencyKey({
      organizationId: "organizations_1",
      syncCandidateObjectId: "objects_sync_1",
      connectorKey: "activecampaign",
      attemptNumber: 1,
    });

    expect(approvalCorrelation).toBe(
      "org_action_approval_correlation:agentSessions_1:objects_action_1:approve:1",
    );
    expect(approvalIdempotency).toBe(
      "org_action_approval:organizations_1:objects_action_1:approve:1",
    );
    expect(executionCorrelation).toBe(
      "org_action_correlation:agentSessions_1:objects_action_1:1",
    );
    expect(executionIdempotency).toBe(
      "org_action_receipt:organizations_1:objects_action_1:create_crm_note:1",
    );
    expect(syncCorrelation).toBe(
      "org_action_sync_correlation:organizations_1:objects_sync_1:1",
    );
    expect(syncIdempotency).toBe(
      "org_action_sync_receipt:organizations_1:objects_sync_1:activecampaign:1",
    );
  });

  it("keeps approved external dispatch fail-closed with deterministic compensation evidence", () => {
    const blockedByAllowlist = resolveOrgExternalActionDispatchGate({
      orgExternalExecutionEnabled: true,
      policyDecision: "approval_required",
      targetSystemClass: "external_connector",
      approvalState: "approved",
      connectorKey: "hubspot",
      connectorAllowlist: ["activecampaign"],
    });
    expect(blockedByAllowlist).toBe("blocked_connector_not_allowlisted");

    const allowedGate = resolveOrgExternalActionDispatchGate({
      orgExternalExecutionEnabled: true,
      policyDecision: "approval_required",
      targetSystemClass: "external_connector",
      approvalState: "approved",
      connectorKey: "activecampaign",
      connectorAllowlist: ["activecampaign"],
    });
    expect(allowedGate).toBe("allowed");

    const identity = buildOrgExternalActionDispatchIdentity({
      organizationId: "organizations_1",
      sessionId: "agentSessions_1",
      actionItemObjectId: "objects_action_1",
      connectorKey: "activecampaign",
      attemptNumber: 2,
    });
    const externalCorrelation = buildOrgActionExternalDispatchCorrelationId({
      sessionId: "agentSessions_1",
      actionItemObjectId: "objects_action_1",
      connectorKey: "activecampaign",
      attemptNumber: 2,
    });
    const externalIdempotency = buildOrgActionExternalDispatchIdempotencyKey({
      organizationId: "organizations_1",
      actionItemObjectId: "objects_action_1",
      connectorKey: "activecampaign",
      attemptNumber: 2,
    });

    expect(identity.correlationId).toBe(externalCorrelation);
    expect(identity.idempotencyKey).toBe(externalIdempotency);

    const rollbackDecision = resolveOrgExternalActionRollbackDecision({
      dispatchGate: allowedGate,
      dispatchStatus: "failed",
      canonicalMutationApplied: true,
      compensationMode: "reverse_canonical_mutation",
    });
    expect(rollbackDecision).toMatchObject({
      decision: "compensate",
      reasonCode: "dispatch_failed_compensation_required",
      compensation: {
        required: true,
        mode: "reverse_canonical_mutation",
      },
    });
  });
});
