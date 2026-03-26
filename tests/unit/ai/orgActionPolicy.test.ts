import { describe, expect, it } from "vitest";
import {
  COMPLIANCE_ACTION_RUNTIME_CONTRACT_VERSION,
  buildComplianceActionLifecycleAuditSnapshot,
  ORG_ACTION_POLICY_RESOLVER_CONTRACT_VERSION,
  resolveComplianceActionPolicyMapEntry,
  resolveComplianceActionRuntimeGate,
  buildOrgActionPolicySnapshot,
  resolveOrgActionPolicyDecision,
} from "../../../convex/ai/orgActionPolicy";

describe("org action policy resolver", () => {
  it("fails closed when action family is missing", () => {
    const result = resolveOrgActionPolicyDecision({
      actionFamily: "",
      riskLevel: "low",
      channel: "webchat",
      targetSystemClass: "platform_internal",
    });
    expect(result.contractVersion).toBe(ORG_ACTION_POLICY_RESOLVER_CONTRACT_VERSION);
    expect(result.decision).toBe("owner_only");
    expect(result.reasonCode).toBe("missing_action_family");
  });

  it("fails closed for external connector targets", () => {
    const result = resolveOrgActionPolicyDecision({
      actionFamily: "update_external_contact",
      riskLevel: "low",
      channel: "webchat",
      targetSystemClass: "external_connector",
    });
    expect(result.decision).toBe("owner_only");
    expect(result.reasonCode).toBe("external_connector_fail_closed");
  });

  it("allows low-risk, in-scope auto decisions", () => {
    const result = resolveOrgActionPolicyDecision({
      actionFamily: "create_crm_note",
      riskLevel: "low",
      channel: "webchat",
      targetSystemClass: "platform_internal",
      orgScope: {
        autoAllowedActionFamilies: ["create_crm_note"],
      },
    });
    expect(result.decision).toBe("agent_auto_allowed");
    expect(result.reasonCode).toBe("auto_scope_override");
  });

  it("builds durable policy snapshots with resolver metadata", () => {
    const result = resolveOrgActionPolicyDecision({
      actionFamily: "create_crm_note",
      riskLevel: "medium",
      channel: "webchat",
      targetSystemClass: "platform_internal",
    });
    const snapshot = buildOrgActionPolicySnapshot({
      decisionResult: result,
      resolvedAt: 1735689600000,
      resolverRef: "policy:test",
    });
    expect(snapshot).toMatchObject({
      contractVersion: "org_action_policy_snapshot_v1",
      decision: "owner_only",
      actionFamily: "create_crm_note",
      riskLevel: "medium",
      channel: "webchat",
      targetSystemClass: "platform_internal",
      decisionReason: "default_high_risk_owner_only",
      resolvedAt: 1735689600000,
      resolverRef: "policy:test",
    });
  });

  it("requires explicit owner checkpoint before outbound compliance actions", () => {
    const blocked = resolveComplianceActionRuntimeGate({
      actionFamily: "compliance_queue_avv_outreach_email",
      riskLevel: "high",
      channel: "compliance_outbound_email",
      targetSystemClass: "external_connector",
      requiresExplicitOutboundConfirmation: true,
      humanApprovalGranted: false,
    });
    expect(blocked.contractVersion).toBe(COMPLIANCE_ACTION_RUNTIME_CONTRACT_VERSION);
    expect(blocked.approval.required).toBe(true);
    expect(blocked.approval.checkpoint).toBe("org_owner_outbound_confirmation");
    expect(blocked.gate.status).toBe("blocked");
    expect(blocked.gate.reasonCode).toBe(
      "approval_checkpoint_pending:org_owner_outbound_confirmation",
    );

    const passed = resolveComplianceActionRuntimeGate({
      actionFamily: "compliance_queue_avv_outreach_email",
      riskLevel: "high",
      channel: "compliance_outbound_email",
      targetSystemClass: "external_connector",
      requiresExplicitOutboundConfirmation: true,
      humanApprovalGranted: true,
    });
    expect(passed.gate.status).toBe("passed");
    expect(passed.gate.reasonCode).toBe(
      "approval_checkpoint_satisfied:org_owner_outbound_confirmation",
    );
  });

  it("builds deterministic lifecycle audit snapshots for plan->gate->execute->verify->audit", () => {
    const gate = resolveComplianceActionRuntimeGate({
      actionFamily: "compliance_save_risk_assessment",
      riskLevel: "medium",
      channel: "compliance_center",
      targetSystemClass: "platform_internal",
      humanApprovalGranted: true,
    });
    const snapshot = buildComplianceActionLifecycleAuditSnapshot({
      gateResult: gate,
      plannedAt: 1735689600000,
      executeAt: 1735689601000,
      verifyAt: 1735689602000,
      verifyPassed: true,
      auditAt: 1735689603000,
      auditRef: "objectActions:obj_1",
    });

    expect(snapshot.contractVersion).toBe(COMPLIANCE_ACTION_RUNTIME_CONTRACT_VERSION);
    expect(snapshot.stageOrder).toEqual(["plan", "gate", "execute", "verify", "audit"]);
    expect(snapshot.stages.plan.status).toBe("completed");
    expect(snapshot.stages.gate.status).toBe("passed");
    expect(snapshot.stages.execute.status).toBe("completed");
    expect(snapshot.stages.verify.status).toBe("passed");
    expect(snapshot.stages.audit).toEqual({
      status: "recorded",
      at: 1735689603000,
      auditRef: "objectActions:obj_1",
    });
    expect(snapshot.failClosed).toBe(false);
  });

  it("fails closed lifecycle snapshots when verify/audit stages are missing", () => {
    const gate = resolveComplianceActionRuntimeGate({
      actionFamily: "compliance_add_risk_evidence",
      riskLevel: "medium",
      channel: "compliance_vault",
      targetSystemClass: "platform_internal",
      humanApprovalGranted: true,
    });
    const snapshot = buildComplianceActionLifecycleAuditSnapshot({
      gateResult: gate,
      plannedAt: 1735689600000,
      executeAt: 1735689601000,
    });

    expect(snapshot.stages.execute.status).toBe("completed");
    expect(snapshot.stages.verify.status).toBe("skipped");
    expect(snapshot.stages.audit.status).toBe("missing");
    expect(snapshot.failClosed).toBe(true);
  });

  it("resolves deterministic compliance policy map entries for inbox/vault/governance", () => {
    expect(resolveComplianceActionPolicyMapEntry("compliance_queue_avv_outreach_email")).toMatchObject({
      actionFamily: "compliance_queue_avv_outreach_email",
      surface: "inbox",
      decision: "owner_only",
    });
    expect(resolveComplianceActionPolicyMapEntry("compliance_add_risk_evidence")).toMatchObject({
      actionFamily: "compliance_add_risk_evidence",
      surface: "vault",
      decision: "approval_required",
    });
    expect(resolveComplianceActionPolicyMapEntry("compliance_set_owner_gate_decision")).toMatchObject({
      actionFamily: "compliance_set_owner_gate_decision",
      surface: "governance",
      decision: "owner_only",
    });
    expect(resolveComplianceActionPolicyMapEntry("create_crm_note")).toBeNull();
  });

  it("applies deterministic compliance policy mapping before generic fallback logic", () => {
    const vaultPolicy = resolveOrgActionPolicyDecision({
      actionFamily: "compliance_add_risk_evidence",
      riskLevel: "low",
      channel: "compliance_vault",
      targetSystemClass: "platform_internal",
      orgScope: {
        autoAllowedActionFamilies: ["compliance_add_risk_evidence"],
      },
    });
    expect(vaultPolicy.decision).toBe("approval_required");
    expect(vaultPolicy.reasonCode).toBe("compliance_surface_vault_approval_required");
    expect(vaultPolicy.riskLevel).toBe("medium");

    const governancePolicy = resolveOrgActionPolicyDecision({
      actionFamily: "compliance_set_owner_gate_decision",
      riskLevel: "low",
      channel: "compliance_governance",
      targetSystemClass: "platform_internal",
      orgScope: {
        autoAllowedActionFamilies: ["compliance_set_owner_gate_decision"],
      },
    });
    expect(governancePolicy.decision).toBe("owner_only");
    expect(governancePolicy.reasonCode).toBe("compliance_surface_governance_owner_only");
    expect(governancePolicy.riskLevel).toBe("critical");
  });
});
