import { describe, expect, it } from "vitest";
import type { Id } from "../../../convex/_generated/dataModel";
import { resolveInboundRuntimeContracts } from "../../../convex/ai/kernel/agentExecution";
import {
  ORG_ACTION_FOLLOW_UP_REENTRY_CONTRACT_VERSION,
} from "../../../convex/ai/kernel/agentTurnOrchestration";
import {
  ORG_ACTION_FOLLOW_UP_RUNTIME_SOURCE,
  buildOrgActionFollowUpRuntimeMetadata,
  buildOrgActionFollowUpRuntimeMessage,
  resolveOrgActionFollowUpDispatchIdentity,
  resolveOrgActionFollowUpRuntimeGate,
} from "../../../convex/ai/orgAgentFollowUpRuntime";

const ORG_ID = "org_1" as Id<"organizations">;

describe("org agent follow-up runtime gate", () => {
  it("allows approved action items with approval-required policy", () => {
    const gate = resolveOrgActionFollowUpRuntimeGate({
      actionItemStatus: "approved",
      policyDecision: "approval_required",
      latestReceiptExecutionStatus: null,
      sourceSessionId: "agentSessions_1",
      sourceChannel: "webchat",
      sourceExternalContactIdentifier: "contact:1",
    });

    expect(gate).toEqual({
      allowed: true,
      reasonCode: "eligible_approved_or_queued",
    });
  });

  it("allows queued receipts to re-enter execution even if item status is failed", () => {
    const gate = resolveOrgActionFollowUpRuntimeGate({
      actionItemStatus: "failed",
      policyDecision: "agent_auto_allowed",
      latestReceiptExecutionStatus: "queued",
      sourceSessionId: "agentSessions_1",
      sourceChannel: "phone_call",
      sourceExternalContactIdentifier: "phone:+49123456789",
    });

    expect(gate).toEqual({
      allowed: true,
      reasonCode: "eligible_approved_or_queued",
    });
  });

  it("fails closed for owner-only policy and missing source context", () => {
    expect(
      resolveOrgActionFollowUpRuntimeGate({
        actionItemStatus: "approved",
        policyDecision: "owner_only",
        latestReceiptExecutionStatus: null,
        sourceSessionId: "agentSessions_1",
        sourceChannel: "webchat",
        sourceExternalContactIdentifier: "contact:1",
      }),
    ).toEqual({
      allowed: false,
      reasonCode: "blocked_owner_only_policy",
    });

    expect(
      resolveOrgActionFollowUpRuntimeGate({
        actionItemStatus: "approved",
        policyDecision: "approval_required",
        latestReceiptExecutionStatus: null,
        sourceSessionId: null,
        sourceChannel: "webchat",
        sourceExternalContactIdentifier: "contact:1",
      }),
    ).toEqual({
      allowed: false,
      reasonCode: "blocked_missing_source_session",
    });
  });
});

describe("org agent follow-up runtime dispatch identity", () => {
  it("reuses queued receipt identity when available", () => {
    const identity = resolveOrgActionFollowUpDispatchIdentity({
      organizationId: "organizations_1",
      actionItemObjectId: "objects_action_1",
      actionFamily: "crm_follow_up",
      sourceSessionId: "agentSessions_1",
      latestReceipt: {
        attemptNumber: 4,
        executionStatus: "queued",
        correlationId: "org_action_correlation:agentSessions_1:objects_action_1:4",
        idempotencyKey: "org_action_receipt:organizations_1:objects_action_1:crm_follow_up:4",
      },
    });

    expect(identity).toEqual({
      attemptNumber: 4,
      correlationId: "org_action_correlation:agentSessions_1:objects_action_1:4",
      idempotencyKey:
        "org_action_receipt:organizations_1:objects_action_1:crm_follow_up:4",
      reusedQueuedReceipt: true,
    });
  });

  it("builds a deterministic next-attempt identity when queued receipt identity is missing", () => {
    const identity = resolveOrgActionFollowUpDispatchIdentity({
      organizationId: "organizations_1",
      actionItemObjectId: "objects_action_1",
      actionFamily: "crm_follow_up",
      sourceSessionId: "agentSessions_1",
      latestReceipt: {
        attemptNumber: 2,
        executionStatus: "failed",
      },
    });

    expect(identity).toEqual({
      attemptNumber: 3,
      correlationId: "org_action_correlation:agentSessions_1:objects_action_1:3",
      idempotencyKey:
        "org_action_receipt:organizations_1:objects_action_1:crm_follow_up:3",
      reusedQueuedReceipt: false,
    });
  });
});

describe("org agent follow-up runtime metadata", () => {
  it("builds deterministic message + metadata with re-entry contract payload", () => {
    const metadata = buildOrgActionFollowUpRuntimeMetadata({
      actionItemObjectId: "objects_action_1",
      sourceSessionId: "agentSessions_1",
      trigger: "queued_retry",
      attemptNumber: 2,
      correlationId: "org_action_correlation:agentSessions_1:objects_action_1:2",
      idempotencyKey: "org_action_receipt:organizations_1:objects_action_1:crm_follow_up:2",
      actionFamily: "crm_follow_up",
      policyDecision: "approval_required",
    });

    expect(
      buildOrgActionFollowUpRuntimeMessage({
        actionItemObjectId: "objects_action_1",
        actionFamily: "crm_follow_up",
        trigger: "queued_retry",
        attemptNumber: 2,
      }),
    ).toBe(
      "[org_action_follow_up_runtime] action_item=objects_action_1 action_family=crm_follow_up trigger=queued_retry attempt=2",
    );
    expect(metadata.source).toBe(ORG_ACTION_FOLLOW_UP_RUNTIME_SOURCE);
    expect(metadata.workflowKey).toBe("follow_up_execution");
    expect(metadata.intentType).toBe("orchestration");
    expect(metadata.orgActionFollowUpReentryContractVersion).toBe(
      ORG_ACTION_FOLLOW_UP_REENTRY_CONTRACT_VERSION,
    );
    expect(metadata.orgActionFollowUpReentry).toMatchObject({
      contractVersion: ORG_ACTION_FOLLOW_UP_REENTRY_CONTRACT_VERSION,
      actionItemObjectId: "objects_action_1",
      sourceSessionId: "agentSessions_1",
      trigger: "queued_retry",
      attemptNumber: 2,
    });
  });

  it("routes follow-up runtime ingress contracts through dedicated workflow + orchestration intent", () => {
    const contracts = resolveInboundRuntimeContracts({
      organizationId: ORG_ID,
      channel: "webchat",
      message: "follow-up execution request",
      metadata: {
        source: ORG_ACTION_FOLLOW_UP_RUNTIME_SOURCE,
      },
      routeIdentity: {
        providerId: "webchat",
        routeKey: "webchat:org_1",
      },
      collaboration: {},
    });

    expect(contracts.queueContract.workflowKey).toBe("follow_up_execution");
    expect(contracts.idempotencyContract.intentType).toBe("orchestration");
  });
});
