import { describe, expect, it } from "vitest";
import {
  buildOrgActionApprovalCorrelationId,
  buildOrgActionApprovalIdempotencyKey,
  buildOrgActionReceiptCorrelationId,
} from "../../../convex/ai/orgActionExecution";
import { buildOrgActionSyncReceiptCorrelationId } from "../../../convex/ai/orgActionSyncOutbox";
import { resolveRuntimeReceiptRetryDisposition } from "../../../convex/ai/trustTelemetry";

describe("org action receipt correlation contract", () => {
  it("builds deterministic correlation identifiers", () => {
    expect(
      buildOrgActionReceiptCorrelationId({
        sessionId: "agentSessions_1",
        actionItemObjectId: "objects_action_1",
        attemptNumber: 2,
      }),
    ).toBe("org_action_correlation:agentSessions_1:objects_action_1:2");
  });

  it("normalizes invalid attempt numbers to 1", () => {
    expect(
      buildOrgActionReceiptCorrelationId({
        sessionId: "agentSessions_1",
        actionItemObjectId: "objects_action_1",
        attemptNumber: Number.NaN,
      }),
    ).toBe("org_action_correlation:agentSessions_1:objects_action_1:1");
  });

  it("builds deterministic approval idempotency keys", () => {
    expect(
      buildOrgActionApprovalIdempotencyKey({
        organizationId: "organizations_1",
        actionItemObjectId: "objects_action_1",
        transition: "approve",
        transitionNumber: 3,
      }),
    ).toBe("org_action_approval:organizations_1:objects_action_1:approve:3");
  });

  it("builds deterministic approval correlation identifiers", () => {
    expect(
      buildOrgActionApprovalCorrelationId({
        sessionId: "agentSessions_1",
        actionItemObjectId: "objects_action_1",
        transition: "assign",
        transitionNumber: 2,
      }),
    ).toBe("org_action_approval_correlation:agentSessions_1:objects_action_1:assign:2");
  });

  it("normalizes invalid approval transition ordinals to 1", () => {
    expect(
      buildOrgActionApprovalCorrelationId({
        sessionId: "agentSessions_1",
        actionItemObjectId: "objects_action_1",
        transition: "approve",
        transitionNumber: Number.NaN,
      }),
    ).toBe("org_action_approval_correlation:agentSessions_1:objects_action_1:approve:1");
    expect(
      buildOrgActionApprovalIdempotencyKey({
        organizationId: "organizations_1",
        actionItemObjectId: "objects_action_1",
        transition: "approve",
        transitionNumber: -9,
      }),
    ).toBe("org_action_approval:organizations_1:objects_action_1:approve:1");
  });

  it("keeps execution and sync correlation spaces deterministic but stage-specific", () => {
    const executionCorrelation = buildOrgActionReceiptCorrelationId({
      sessionId: "agentSessions_1",
      actionItemObjectId: "objects_action_1",
      attemptNumber: 4,
    });
    const syncCorrelation = buildOrgActionSyncReceiptCorrelationId({
      organizationId: "organizations_1",
      syncCandidateObjectId: "objects_sync_candidate_1",
      attemptNumber: 4,
    });

    expect(executionCorrelation).toBe(
      "org_action_correlation:agentSessions_1:objects_action_1:4",
    );
    expect(syncCorrelation).toBe(
      "org_action_sync_correlation:organizations_1:objects_sync_candidate_1:4",
    );
    expect(executionCorrelation).not.toBe(syncCorrelation);
  });
});

describe("runtime receipt retry disposition contract", () => {
  it("marks processing receipts as blocked", () => {
    expect(
      resolveRuntimeReceiptRetryDisposition({
        status: "processing",
        duplicateCount: 0,
      }),
    ).toBe("blocked_processing");
  });

  it("marks completed receipts as terminal", () => {
    expect(
      resolveRuntimeReceiptRetryDisposition({
        status: "completed",
        duplicateCount: 0,
      }),
    ).toBe("terminal_completed");
  });

  it("keeps failed and duplicate receipts retry-safe", () => {
    expect(
      resolveRuntimeReceiptRetryDisposition({
        status: "failed",
        duplicateCount: 0,
      }),
    ).toBe("safe_retry");
    expect(
      resolveRuntimeReceiptRetryDisposition({
        status: "duplicate",
        duplicateCount: 2,
      }),
    ).toBe("safe_retry");
  });
});
