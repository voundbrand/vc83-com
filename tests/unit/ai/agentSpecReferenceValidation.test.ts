import { describe, expect, it } from "vitest";
import { normalizeAgentSpecV1 } from "../../../convex/ai/agentSpecRegistry";

function buildValidSpec() {
  return {
    contractVersion: "agent_spec_v1",
    agent: {
      key: "one_of_one_samantha_warm",
      identity: {
        displayName: "Samantha",
        role: "lead_capture_consultant",
      },
      channels: {
        allowed: ["native_guest", "webchat"],
        defaults: {
          primary: "native_guest",
        },
      },
      capabilities: [
        {
          key: "audit_delivery",
          outcomes: [
            {
              outcomeKey: "audit_workflow_deliverable_email",
              requiredTools: ["generate_audit_workflow_deliverable"],
              preconditions: {
                requiredFields: ["firstName", "lastName", "email", "phone"],
              },
            },
          ],
        },
      ],
      runtimeTopology: {
        contractVersion: "oar_runtime_topology_v1",
        profile: "evaluator_loop",
        adapter: "evaluator_loop_adapter_v1",
      },
      policyProfiles: {
        orgPolicyRef: "org_policy_default_v3",
        channelPolicyRef: "native_guest_policy_v2",
        runtimePolicyRef: "runtime_fail_closed_v5",
      },
    },
  };
}

describe("agent spec reference validation", () => {
  it("accepts known tool/outcome/policy references", () => {
    expect(() => normalizeAgentSpecV1(buildValidSpec())).not.toThrow();
  });

  it("fails closed on unknown required tool references", () => {
    const spec = buildValidSpec();
    spec.agent.capabilities[0].outcomes[0].requiredTools = ["nonexistent_tool"];
    expect(() => normalizeAgentSpecV1(spec)).toThrow(/unknown tool references/);
  });

  it("fails closed on unknown outcome references", () => {
    const spec = buildValidSpec();
    spec.agent.capabilities[0].outcomes[0].outcomeKey = "unknown_outcome";
    expect(() => normalizeAgentSpecV1(spec)).toThrow(/unknown outcome references/);
  });

  it("fails closed on unknown org policy profile references", () => {
    const spec = buildValidSpec();
    spec.agent.policyProfiles.orgPolicyRef = "org_policy_missing";
    expect(() => normalizeAgentSpecV1(spec)).toThrow(/unknown org policy profile/);
  });

  it("fails closed on unknown channel policy profile references", () => {
    const spec = buildValidSpec();
    spec.agent.policyProfiles.channelPolicyRef = "channel_policy_missing";
    expect(() => normalizeAgentSpecV1(spec)).toThrow(/unknown channel policy profile/);
  });

  it("fails closed on unknown runtime policy profile references", () => {
    const spec = buildValidSpec();
    spec.agent.policyProfiles.runtimePolicyRef = "runtime_policy_missing";
    expect(() => normalizeAgentSpecV1(spec)).toThrow(/unknown runtime policy profile/);
  });
});
