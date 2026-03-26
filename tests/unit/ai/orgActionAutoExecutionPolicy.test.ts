import { describe, expect, it } from "vitest";
import { resolveOrgActionAutoExecutionDecision } from "../../../convex/ai/orgActionExecution";

describe("org action auto-execution policy", () => {
  it("fails closed when policy decision is not auto-allowed", () => {
    expect(
      resolveOrgActionAutoExecutionDecision({
        policyDecision: "approval_required",
        targetSystemClass: "platform_internal",
        riskLevel: "low",
        actionFamily: "create_crm_note",
        autoExecutionAllowlist: ["create_crm_note"],
      }),
    ).toBe("deny_policy");
  });

  it("fails closed for non-internal targets and elevated risk", () => {
    expect(
      resolveOrgActionAutoExecutionDecision({
        policyDecision: "agent_auto_allowed",
        targetSystemClass: "external_connector",
        riskLevel: "low",
        actionFamily: "create_crm_note",
        autoExecutionAllowlist: ["create_crm_note"],
      }),
    ).toBe("deny_target_system");
    expect(
      resolveOrgActionAutoExecutionDecision({
        policyDecision: "agent_auto_allowed",
        targetSystemClass: "platform_internal",
        riskLevel: "medium",
        actionFamily: "create_crm_note",
        autoExecutionAllowlist: ["create_crm_note"],
      }),
    ).toBe("deny_risk");
  });

  it("allows only allowlisted low-risk internal actions", () => {
    expect(
      resolveOrgActionAutoExecutionDecision({
        policyDecision: "agent_auto_allowed",
        targetSystemClass: "platform_internal",
        riskLevel: "low",
        actionFamily: "create_crm_note",
        autoExecutionAllowlist: ["create_crm_note"],
      }),
    ).toBe("allow");
    expect(
      resolveOrgActionAutoExecutionDecision({
        policyDecision: "agent_auto_allowed",
        targetSystemClass: "platform_internal",
        riskLevel: "low",
        actionFamily: "book_external_slot",
        autoExecutionAllowlist: ["create_crm_note"],
      }),
    ).toBe("deny_missing_allowlist");
  });
});

