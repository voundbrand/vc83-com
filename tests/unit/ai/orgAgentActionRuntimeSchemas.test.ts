import { describe, expect, it } from "vitest";
import {
  COMPLIANCE_SHADOW_MODE_EVALUATION_STATUS_VALUES,
  COMPLIANCE_SHADOW_MODE_SURFACE_VALUES,
  ORG_AGENT_ACTION_ITEM_OBJECT_TYPE,
  ORG_AGENT_ACTION_ITEM_STATUS_VALUES,
  ORG_AGENT_ACTIVITY_OBJECT_TYPE,
  ORG_AGENT_LINK_TYPE_VALUES,
  ORG_AGENT_OBJECT_ACTION_TYPE_VALUES,
  ORG_ACTION_POLICY_DECISION_VALUES,
  ORG_ACTION_POLICY_SNAPSHOT_CONTRACT_VERSION,
  isComplianceShadowModeSurface,
  isOrgActionPolicyDecision,
  isOrgAgentActionItemStatus,
  normalizeOrgActionPolicySnapshot,
} from "../../../convex/schemas/orgAgentActionRuntimeSchemas";

describe("org agent action runtime schema contracts", () => {
  it("exposes canonical object taxonomy for activity and action items", () => {
    expect(ORG_AGENT_ACTIVITY_OBJECT_TYPE).toBe("org_agent_activity");
    expect(ORG_AGENT_ACTION_ITEM_OBJECT_TYPE).toBe("org_agent_action_item");
    expect(ORG_AGENT_LINK_TYPE_VALUES).toContain(
      "org_agent_activity_action_item",
    );
    expect(ORG_AGENT_OBJECT_ACTION_TYPE_VALUES).toContain(
      "org_action_execution_receipt_recorded",
    );
  });

  it("enforces fail-closed status and policy-decision classifiers", () => {
    for (const status of ORG_AGENT_ACTION_ITEM_STATUS_VALUES) {
      expect(isOrgAgentActionItemStatus(status)).toBe(true);
    }
    expect(isOrgAgentActionItemStatus("queued")).toBe(false);

    for (const decision of ORG_ACTION_POLICY_DECISION_VALUES) {
      expect(isOrgActionPolicyDecision(decision)).toBe(true);
    }
    expect(isOrgActionPolicyDecision("manual_override")).toBe(false);
  });

  it("keeps shadow-mode evaluator surface/status contracts deterministic", () => {
    expect(COMPLIANCE_SHADOW_MODE_SURFACE_VALUES).toEqual([
      "finder",
      "layers",
      "ai_chat",
      "compliance_center",
      "unknown",
    ]);
    expect(COMPLIANCE_SHADOW_MODE_EVALUATION_STATUS_VALUES).toEqual([
      "disabled",
      "skipped",
      "evaluated",
    ]);
    expect(isComplianceShadowModeSurface("finder")).toBe(true);
    expect(isComplianceShadowModeSurface("compliance_center")).toBe(true);
    expect(isComplianceShadowModeSurface("dashboard")).toBe(false);
  });

  it("normalizes valid policy snapshot payloads deterministically", () => {
    const normalized = normalizeOrgActionPolicySnapshot({
      contractVersion: ORG_ACTION_POLICY_SNAPSHOT_CONTRACT_VERSION,
      decision: " approval_required ",
      actionFamily: " crm_follow_up ",
      riskLevel: " medium ",
      channel: " telephony ",
      targetSystemClass: " platform_internal ",
      decisionReason: "Owner approval needed for first outreach",
      resolvedAt: 1772467200000,
      resolverRef: " org_policy_default_v1 ",
    });

    expect(normalized).toEqual({
      contractVersion: ORG_ACTION_POLICY_SNAPSHOT_CONTRACT_VERSION,
      decision: "approval_required",
      actionFamily: "crm_follow_up",
      riskLevel: "medium",
      channel: "telephony",
      targetSystemClass: "platform_internal",
      decisionReason: "Owner approval needed for first outreach",
      resolvedAt: 1772467200000,
      resolverRef: "org_policy_default_v1",
    });
  });

  it("fails closed for invalid or incomplete policy snapshots", () => {
    expect(
      normalizeOrgActionPolicySnapshot({
        contractVersion: ORG_ACTION_POLICY_SNAPSHOT_CONTRACT_VERSION,
        decision: "approval_required",
        actionFamily: "crm_follow_up",
        riskLevel: "medium",
        channel: "webchat",
        targetSystemClass: "external_connector",
      }),
    ).toBeNull();

    expect(
      normalizeOrgActionPolicySnapshot({
        contractVersion: ORG_ACTION_POLICY_SNAPSHOT_CONTRACT_VERSION,
        decision: "approval_required",
        actionFamily: "crm_follow_up",
        riskLevel: "medium",
        channel: "webchat",
        targetSystemClass: "external_connector",
        resolvedAt: 1772467200000,
      }),
    ).not.toBeNull();

    expect(
      normalizeOrgActionPolicySnapshot({
        contractVersion: ORG_ACTION_POLICY_SNAPSHOT_CONTRACT_VERSION,
        decision: "open_by_default",
        actionFamily: "crm_follow_up",
        riskLevel: "medium",
        channel: "webchat",
        targetSystemClass: "external_connector",
        resolvedAt: 1772467200000,
      }),
    ).toBeNull();
  });
});
