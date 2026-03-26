import { describe, expect, it } from "vitest";
import {
  ORG_AGENT_ACTIVITY_KIND_VALUES,
  ORG_AGENT_LINK_TYPE_VALUES,
  ORG_AGENT_OBJECT_ACTION_TYPE_VALUES,
} from "../../../convex/schemas/orgAgentActionRuntimeSchemas";
import {
  buildOrgAgentActivityArtifactRefs,
  buildOrgAgentActivityName,
  normalizeOrgAgentActivityKind,
} from "../../../convex/ai/orgAgentActivities";
import {
  buildSessionOutcomeActivityArtifactRefs,
} from "../../../convex/ai/agentSessions";
import {
  buildOrgAgentActivityProtocolDetailRefs,
} from "../../../convex/activityProtocol";

describe("org agent activity timeline contract", () => {
  it("keeps activity kinds deterministic and duplicate-free", () => {
    expect(ORG_AGENT_ACTIVITY_KIND_VALUES.length).toBeGreaterThanOrEqual(10);
    expect(new Set(ORG_AGENT_ACTIVITY_KIND_VALUES).size).toBe(
      ORG_AGENT_ACTIVITY_KIND_VALUES.length,
    );
    expect(ORG_AGENT_ACTIVITY_KIND_VALUES).toContain("session_outcome_captured");
    expect(ORG_AGENT_ACTIVITY_KIND_VALUES).toContain("execution_succeeded");
    expect(ORG_AGENT_ACTIVITY_KIND_VALUES).toContain("external_sync_failed");
  });

  it("defines required link and action catalogs for timeline correlation", () => {
    expect(ORG_AGENT_LINK_TYPE_VALUES).toContain(
      "org_agent_activity_source_session",
    );
    expect(ORG_AGENT_LINK_TYPE_VALUES).toContain(
      "org_agent_action_item_execution_receipt",
    );
    expect(ORG_AGENT_OBJECT_ACTION_TYPE_VALUES).toContain(
      "org_action_policy_snapshot_recorded",
    );
    expect(ORG_AGENT_OBJECT_ACTION_TYPE_VALUES).toContain(
      "org_action_item_state_changed",
    );
  });

  it("normalizes activity kind with fail-closed default", () => {
    expect(normalizeOrgAgentActivityKind("execution_succeeded")).toBe(
      "execution_succeeded",
    );
    expect(normalizeOrgAgentActivityKind("invalid_kind")).toBe(
      "session_outcome_captured",
    );
    expect(normalizeOrgAgentActivityKind(undefined)).toBe(
      "session_outcome_captured",
    );
  });

  it("builds deterministic activity names", () => {
    expect(
      buildOrgAgentActivityName({
        activityKind: "session_outcome_captured",
        capturedAt: 1735689600000,
      }),
    ).toBe(
      "Org agent activity - session_outcome_captured - 2025-01-01T00:00:00.000Z",
    );
  });

  it("builds immutable artifact refs for activity payload correlation", () => {
    expect(
      buildOrgAgentActivityArtifactRefs({
        sessionId: "session_123",
        crmContactId: " contact_456 ",
        crmOrganizationId: "org_789",
        actionItemObjectId: "action_item_1",
        policySnapshotId: " policy_2 ",
        executionReceiptId: "receipt_3",
        syncBindingId: "sync_4",
      }),
    ).toEqual({
      sessionId: "session_123",
      crmContactId: "contact_456",
      crmOrganizationId: "org_789",
      actionItemObjectId: "action_item_1",
      policySnapshotId: "policy_2",
      executionReceiptId: "receipt_3",
      syncBindingId: "sync_4",
    });
  });

  it("normalizes session/contact/org artifact refs from session context", () => {
    expect(
      buildSessionOutcomeActivityArtifactRefs({
        sessionId: "session_abc",
        externalContactIdentifier: " phone:+49123 ",
        crmContactId: "contact_xyz",
        crmOrganizationId: "org_xyz",
        actionItemObjectId: " ",
      }),
    ).toEqual({
      sessionId: "session_abc",
      externalContactIdentifier: "phone:+49123",
      crmContactId: "contact_xyz",
      crmOrganizationId: "org_xyz",
      actionItemObjectId: undefined,
    });
  });

  it("builds activity protocol detail refs with fail-closed normalization", () => {
    expect(
      buildOrgAgentActivityProtocolDetailRefs({
        sessionAnchorObjectId: " session_anchor_1 ",
        crmContactId: "contact_1",
        crmOrganizationId: "",
        actionItemObjectId: "action_item_1",
        policySnapshotId: null,
        executionReceiptId: "receipt_1",
        syncBindingId: undefined,
      }),
    ).toEqual({
      sessionAnchorObjectId: "session_anchor_1",
      crmContactId: "contact_1",
      crmOrganizationId: undefined,
      actionItemObjectId: "action_item_1",
      policySnapshotId: undefined,
      executionReceiptId: "receipt_1",
      syncBindingId: undefined,
    });
  });
});
