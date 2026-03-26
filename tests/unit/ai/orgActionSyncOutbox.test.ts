import { describe, expect, it } from "vitest";
import {
  ORG_ACTION_SYNC_OUTBOX_CONTRACT_VERSION,
  buildOrgActionSyncReceiptCorrelationId,
  buildOrgActionSyncReceiptIdempotencyKey,
  normalizeOrgCrmSyncCandidateEnvelope,
  resolveOrgActionSyncBindingStatus,
  resolveOrgActionSyncBindingWriteMode,
  resolveOrgActionSyncDispatchMode,
  resolveOrgActionSyncOutboxStatus,
} from "../../../convex/ai/orgActionSyncOutbox";

describe("org action sync outbox contract", () => {
  it("publishes a stable contract version", () => {
    expect(ORG_ACTION_SYNC_OUTBOX_CONTRACT_VERSION).toBe(
      "org_action_sync_outbox_v1",
    );
  });

  it("fails closed to enqueue-only when external writes are disabled", () => {
    expect(
      resolveOrgActionSyncDispatchMode({
        externalWritesEnabled: false,
        targetSystemClass: "external_connector",
      }),
    ).toBe("enqueue_only");
  });

  it("dispatches only for external_connector with enabled gate", () => {
    expect(
      resolveOrgActionSyncDispatchMode({
        externalWritesEnabled: true,
        targetSystemClass: "external_connector",
      }),
    ).toBe("dispatch");
    expect(
      resolveOrgActionSyncDispatchMode({
        externalWritesEnabled: true,
        targetSystemClass: "platform_internal",
      }),
    ).toBe("enqueue_only");
  });

  it("normalizes sync candidate envelope from canonical projection object properties", () => {
    const normalized = normalizeOrgCrmSyncCandidateEnvelope({
      projectionObjectId: "objects_projection_1",
      sourceActivityObjectId: "objects_activity_1",
      targetContactObjectId: "objects_contact_1",
      targetOrganizationObjectId: "objects_org_1",
      sessionId: "agentSessions_1",
      turnId: "agentTurns_1",
      correlationId: "corr_1",
      targetSystemClasses: ["external_connector", "platform_internal", ""],
      actionCandidates: [{ id: "1" }, { id: "2" }],
      checkpoints: [{ id: "c1" }],
    });

    expect(normalized).toEqual({
      projectionObjectId: "objects_projection_1",
      sourceActivityObjectId: "objects_activity_1",
      targetContactObjectId: "objects_contact_1",
      targetOrganizationObjectId: "objects_org_1",
      sessionId: "agentSessions_1",
      turnId: "agentTurns_1",
      correlationId: "corr_1",
      targetSystemClasses: ["external_connector", "platform_internal"],
      actionCandidateCount: 2,
      checkpointCount: 1,
    });
  });

  it("fails closed when required sync candidate fields are missing", () => {
    expect(normalizeOrgCrmSyncCandidateEnvelope(undefined)).toBeNull();
    expect(normalizeOrgCrmSyncCandidateEnvelope({})).toBeNull();
    expect(
      normalizeOrgCrmSyncCandidateEnvelope({
        projectionObjectId: "   ",
      }),
    ).toBeNull();
  });

  it("maps dispatch status to outbox lifecycle status", () => {
    expect(resolveOrgActionSyncOutboxStatus({ dispatchStatus: "queued" })).toBe(
      "processing",
    );
    expect(
      resolveOrgActionSyncOutboxStatus({ dispatchStatus: "succeeded" }),
    ).toBe("synced");
    expect(resolveOrgActionSyncOutboxStatus({ dispatchStatus: "failed" })).toBe(
      "failed",
    );
    expect(resolveOrgActionSyncOutboxStatus({ dispatchStatus: "skipped" })).toBe(
      "pending",
    );
  });

  it("maps dispatch + conflict to sync binding status", () => {
    expect(
      resolveOrgActionSyncBindingStatus({
        dispatchStatus: "succeeded",
        conflictDetected: false,
      }),
    ).toBe("active");
    expect(
      resolveOrgActionSyncBindingStatus({
        dispatchStatus: "failed",
        conflictDetected: false,
      }),
    ).toBe("stale");
    expect(
      resolveOrgActionSyncBindingStatus({
        dispatchStatus: "succeeded",
        conflictDetected: true,
      }),
    ).toBe("conflict");
  });

  it("resolves deterministic binding write modes", () => {
    expect(
      resolveOrgActionSyncBindingWriteMode({
        hasExistingCanonicalBinding: false,
        hasConflictingExternalBinding: false,
      }),
    ).toBe("insert_new");
    expect(
      resolveOrgActionSyncBindingWriteMode({
        hasExistingCanonicalBinding: true,
        hasConflictingExternalBinding: false,
      }),
    ).toBe("update_existing_canonical");
    expect(
      resolveOrgActionSyncBindingWriteMode({
        hasExistingCanonicalBinding: true,
        hasConflictingExternalBinding: true,
      }),
    ).toBe("conflict_existing_external");
  });

  it("builds deterministic idempotency and correlation keys", () => {
    expect(
      buildOrgActionSyncReceiptIdempotencyKey({
        organizationId: "organizations_1",
        syncCandidateObjectId: "objects_sync_candidate_1",
        connectorKey: "hubspot",
        attemptNumber: 3,
      }),
    ).toBe(
      "org_action_sync_receipt:organizations_1:objects_sync_candidate_1:hubspot:3",
    );
    expect(
      buildOrgActionSyncReceiptIdempotencyKey({
        organizationId: "organizations_1",
        syncCandidateObjectId: "objects_sync_candidate_1",
        connectorKey: "hubspot",
        attemptNumber: -12,
      }),
    ).toBe(
      "org_action_sync_receipt:organizations_1:objects_sync_candidate_1:hubspot:1",
    );

    expect(
      buildOrgActionSyncReceiptCorrelationId({
        organizationId: "organizations_1",
        syncCandidateObjectId: "objects_sync_candidate_1",
        attemptNumber: 5,
      }),
    ).toBe(
      "org_action_sync_correlation:organizations_1:objects_sync_candidate_1:5",
    );
  });
});
