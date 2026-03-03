import { describe, expect, it } from "vitest";
import {
  computeAgentSpecHash,
  normalizeAgentSpecV1,
} from "../../../convex/ai/agentSpecRegistry";

describe("agent spec registry contract", () => {
  it("normalizes agent_spec_v1 deterministically", () => {
    const normalized = normalizeAgentSpecV1({
      contractVersion: "agent_spec_v1",
      agent: {
        key: " one_of_one_samantha_warm ",
        identity: {
          displayName: " Samantha Warm ",
          role: " lead_capture_consultant ",
          templateRole: " one_of_one_warm_template ",
        },
        channels: {
          allowed: ["webchat", "native_guest", "webchat"],
          defaults: {
            primary: " native_guest ",
            deploymentMode: " direct_agent_entry ",
          },
        },
        capabilities: [
          {
            key: "audit_delivery",
            outcomes: [
              {
                outcomeKey: "audit_workflow_deliverable_pdf",
                requiredTools: [
                  "generate_audit_workflow_deliverable",
                  "generate_audit_workflow_deliverable",
                ],
                preconditions: {
                  requiredFields: ["email", "firstName", "email"],
                },
              },
            ],
          },
        ],
        policyProfiles: {
          orgPolicyRef: " org_policy_default_v3 ",
          channelPolicyRef: " native_guest_policy_v2 ",
          runtimePolicyRef: " runtime_fail_closed_v5 ",
        },
      },
    });

    expect(normalized.agent.channels.allowed).toEqual([
      "native_guest",
      "webchat",
    ]);
    expect(normalized.agent.capabilities[0].outcomes[0].requiredTools).toEqual([
      "generate_audit_workflow_deliverable",
    ]);
    expect(
      normalized.agent.capabilities[0].outcomes[0].preconditions?.requiredFields,
    ).toEqual(["email", "firstName"]);
    expect(normalized.agent.policyProfiles).toEqual({
      orgPolicyRef: "org_policy_default_v3",
      channelPolicyRef: "native_guest_policy_v2",
      runtimePolicyRef: "runtime_fail_closed_v5",
    });
  });

  it("produces stable hashes for logically equivalent specs", () => {
    const a = normalizeAgentSpecV1({
      contractVersion: "agent_spec_v1",
      agent: {
        key: "one_of_one_samantha_warm",
        identity: { displayName: "Samantha", role: "consultant" },
        channels: {
          allowed: ["webchat", "native_guest"],
          defaults: { primary: "native_guest" },
        },
        capabilities: [
          {
            key: "audit_delivery",
            outcomes: [
              {
                outcomeKey: "audit_workflow_deliverable_pdf",
                requiredTools: ["generate_audit_workflow_deliverable"],
              },
            ],
          },
        ],
        policyProfiles: {
          orgPolicyRef: "org_policy_default_v3",
          channelPolicyRef: "native_guest_policy_v2",
          runtimePolicyRef: "runtime_fail_closed_v5",
        },
      },
    });

    const b = normalizeAgentSpecV1({
      agent: {
        policyProfiles: {
          runtimePolicyRef: "runtime_fail_closed_v5",
          channelPolicyRef: "native_guest_policy_v2",
          orgPolicyRef: "org_policy_default_v3",
        },
        capabilities: [
          {
            outcomes: [
              {
                requiredTools: ["generate_audit_workflow_deliverable"],
                outcomeKey: "audit_workflow_deliverable_pdf",
              },
            ],
            key: "audit_delivery",
          },
        ],
        channels: {
          defaults: { primary: "native_guest" },
          allowed: ["native_guest", "webchat"],
        },
        identity: { role: "consultant", displayName: "Samantha" },
        key: "one_of_one_samantha_warm",
      },
      contractVersion: "agent_spec_v1",
    });

    expect(computeAgentSpecHash(a)).toBe(computeAgentSpecHash(b));
  });

  it("fails closed on unsupported keys", () => {
    expect(() =>
      normalizeAgentSpecV1({
        contractVersion: "agent_spec_v1",
        agent: {
          key: "x",
          identity: { displayName: "S", role: "r", bad: true },
          channels: { allowed: ["webchat"], defaults: { primary: "webchat" } },
          capabilities: [],
          policyProfiles: {
            orgPolicyRef: "org",
            channelPolicyRef: "channel",
            runtimePolicyRef: "runtime",
          },
        },
      }),
    ).toThrow(/unsupported keys/);
  });
});
