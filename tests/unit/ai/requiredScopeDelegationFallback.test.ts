import { describe, expect, it } from "vitest";
import { selectRequiredScopeFallbackSpecialistType } from "../../../convex/ai/kernel/agentExecution";

describe("required scope delegation fallback selection", () => {
  it("selects an in-scope specialist subtype with highest missing-tool profile coverage", () => {
    const decision = selectRequiredScopeFallbackSpecialistType({
      requiredScopeContract: {
        enforced: true,
        requiredTools: ["create_invoice", "send_invoice"],
        requiredCapabilities: [],
      },
      requiredScopeGap: {
        reasonCode: "required_scope_contract_missing",
        missingTools: ["create_invoice", "send_invoice"],
        missingCapabilities: [],
        missingCapabilityKinds: ["tool"],
        missingByLayer: {
          platform: [],
          orgAllow: [],
          orgDeny: ["create_invoice", "send_invoice"],
          integration: [],
          agentProfile: [],
          agentEnable: [],
          agentDisable: [],
          autonomy: [],
          session: [],
          channel: [],
        },
      },
      dreamTeamSpecialists: [
        { specialistSubtype: "booking_agent" },
        { specialistSubtype: "sales_assistant" },
      ],
      activeAgents: [
        { _id: "agent_primary", subtype: "general" },
        { _id: "agent_sales", subtype: "sales_assistant" },
        { _id: "agent_booking", subtype: "booking_agent" },
      ],
      authorityAgentId: "agent_primary",
    });

    expect(decision.selectedSpecialistType).toBe("sales_assistant");
    expect(decision.reasonCode).toBeUndefined();
  });

  it("fails closed when no subtype has deterministic profile coverage for missing tools", () => {
    const decision = selectRequiredScopeFallbackSpecialistType({
      requiredScopeContract: {
        enforced: true,
        requiredTools: ["unknown_tool_xyz"],
        requiredCapabilities: [],
      },
      requiredScopeGap: {
        reasonCode: "required_scope_contract_missing",
        missingTools: ["unknown_tool_xyz"],
        missingCapabilities: [],
        missingCapabilityKinds: ["tool"],
        missingByLayer: {
          platform: [],
          orgAllow: [],
          orgDeny: [],
          integration: [],
          agentProfile: [],
          agentEnable: [],
          agentDisable: [],
          autonomy: [],
          session: [],
          channel: [],
        },
      },
      dreamTeamSpecialists: [{ specialistSubtype: "sales_assistant" }],
      activeAgents: [
        { _id: "agent_primary", subtype: "general" },
        { _id: "agent_sales", subtype: "sales_assistant" },
      ],
      authorityAgentId: "agent_primary",
    });

    expect(decision.selectedSpecialistType).toBeUndefined();
    expect(decision.reasonCode).toBe("fallback_no_specialist_candidate");
  });

  it("keeps tie-breaking deterministic by subtype name", () => {
    const decision = selectRequiredScopeFallbackSpecialistType({
      requiredScopeContract: {
        enforced: true,
        requiredTools: ["list_events"],
        requiredCapabilities: [],
      },
      requiredScopeGap: {
        reasonCode: "required_scope_contract_missing",
        missingTools: ["list_events"],
        missingCapabilities: [],
        missingCapabilityKinds: ["tool"],
        missingByLayer: {
          platform: [],
          orgAllow: [],
          orgDeny: [],
          integration: [],
          agentProfile: [],
          agentEnable: [],
          agentDisable: [],
          autonomy: [],
          session: [],
          channel: [],
        },
      },
      dreamTeamSpecialists: [
        { specialistSubtype: "customer_support" },
        { specialistSubtype: "general" },
      ],
      activeAgents: [
        { _id: "agent_primary", subtype: "general" },
        { _id: "agent_support", subtype: "customer_support" },
      ],
      authorityAgentId: "agent_primary",
    });

    expect(decision.selectedSpecialistType).toBe("customer_support");
  });
});
