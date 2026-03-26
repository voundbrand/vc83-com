import { describe, expect, it } from "vitest";
import { normalizeAgentSpecV1 } from "../../../convex/ai/agentSpecRegistry";
import { compileRuntimeCapabilityManifest } from "../../../convex/ai/policyCompiler";

function buildSpecA() {
  return normalizeAgentSpecV1({
    contractVersion: "agent_spec_v1",
    agent: {
      key: "one_of_one_samantha_warm",
      identity: {
        displayName: "Samantha",
        role: "lead_capture_consultant",
      },
      channels: {
        allowed: ["webchat", "native_guest"],
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
                requiredFields: ["lastName", "firstName", "email"],
              },
            },
            {
              outcomeKey: "email_sent",
              requiredTools: ["send_email_from_template"],
              preconditions: {
                requiredFields: ["email"],
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
  });
}

function buildSpecB() {
  return normalizeAgentSpecV1({
    contractVersion: "agent_spec_v1",
    agent: {
      key: "one_of_one_samantha_warm",
      identity: {
        role: "lead_capture_consultant",
        displayName: "Samantha",
      },
      channels: {
        allowed: ["native_guest", "webchat"],
        defaults: {
          primary: "native_guest",
        },
      },
      capabilities: [
        {
          outcomes: [
            {
              outcomeKey: "email_sent",
              requiredTools: ["send_email_from_template"],
              preconditions: { requiredFields: ["email"] },
            },
            {
              outcomeKey: "audit_workflow_deliverable_email",
              requiredTools: ["generate_audit_workflow_deliverable"],
              preconditions: { requiredFields: ["email", "firstName", "lastName"] },
            },
          ],
          key: "audit_delivery",
        },
      ],
      runtimeTopology: {
        contractVersion: "oar_runtime_topology_v1",
        profile: "evaluator_loop",
        adapter: "evaluator_loop_adapter_v1",
      },
      policyProfiles: {
        runtimePolicyRef: "runtime_fail_closed_v5",
        orgPolicyRef: "org_policy_default_v3",
        channelPolicyRef: "native_guest_policy_v2",
      },
    },
  });
}

describe("policy compiler determinism", () => {
  it("emits identical manifest and hash for logically equivalent inputs", () => {
    const inputA = {
      agentSpec: buildSpecA(),
      orgPolicyProfile: {
        ref: "org_policy_default_v3",
        allowedTools: ["send_email_from_template", "generate_audit_workflow_deliverable"],
        deniedTools: [],
      },
      channelPolicyProfile: {
        ref: "native_guest_policy_v2",
        allowedChannels: ["native_guest", "webchat"],
        deniedTools: [],
      },
      runtimeDefaultsProfile: {
        ref: "runtime_fail_closed_v5",
        denyCatalog: ["tool_unavailable", "context_invalid"],
      },
      compiledAtMs: 1772448000000,
    } as const;

    const inputB = {
      agentSpec: buildSpecB(),
      orgPolicyProfile: {
        ref: "org_policy_default_v3",
        allowedTools: ["generate_audit_workflow_deliverable", "send_email_from_template"],
        deniedTools: [],
      },
      channelPolicyProfile: {
        ref: "native_guest_policy_v2",
        allowedChannels: ["webchat", "native_guest"],
        deniedTools: [],
      },
      runtimeDefaultsProfile: {
        ref: "runtime_fail_closed_v5",
        denyCatalog: ["context_invalid", "tool_unavailable"],
      },
      compiledAtMs: 1772448000000,
    } as const;

    const manifestA = compileRuntimeCapabilityManifest(inputA);
    const manifestB = compileRuntimeCapabilityManifest(inputB);

    expect(manifestA).toEqual(manifestB);
    expect(manifestA.contractVersion).toBe("runtime_capability_manifest_v1");
    expect(manifestA.manifestHash).toMatch(/^[0-9a-f]{8}$/);
    expect(Object.keys(manifestA.toolDecisions)).toEqual([
      "generate_audit_workflow_deliverable",
      "send_email_from_template",
    ]);
  });

  it("captures deterministic deny reasons when policy denies required tools", () => {
    const manifest = compileRuntimeCapabilityManifest({
      agentSpec: buildSpecA(),
      orgPolicyProfile: {
        ref: "org_policy_default_v3",
        allowedTools: ["generate_audit_workflow_deliverable"],
        deniedTools: ["send_email_from_template"],
      },
      channelPolicyProfile: {
        ref: "native_guest_policy_v2",
        allowedChannels: ["native_guest"],
        deniedTools: [],
      },
      runtimeDefaultsProfile: {
        ref: "runtime_fail_closed_v5",
      },
      compiledAtMs: 1772448000000,
    });

    expect(manifest.toolDecisions.send_email_from_template).toEqual({
      allowed: false,
      sourceLayer: "org",
      denials: ["tool_denied_org", "tool_not_allowlisted_org"],
    });
    expect(manifest.channelDecisions.webchat).toEqual({
      allowed: false,
      reasonCode: "channel_not_allowed",
    });
  });
});
