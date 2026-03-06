import { describe, expect, it } from "vitest";
import {
  computeAgentSpecHash,
  normalizeAgentSpecV1,
  resolveAgentRuntimeModuleCapabilities,
  resolveAgentRuntimeModuleMetadataFromConfig,
  SAMANTHA_AGENT_RUNTIME_MODULE_KEY,
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
                outcomeKey: "audit_workflow_deliverable_email",
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
                outcomeKey: "audit_workflow_deliverable_email",
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
                outcomeKey: "audit_workflow_deliverable_email",
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

  it("normalizes runtime module metadata deterministically", () => {
    const normalized = normalizeAgentSpecV1({
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
                outcomeKey: "audit_workflow_deliverable_email",
                requiredTools: ["generate_audit_workflow_deliverable"],
              },
            ],
          },
        ],
        runtimeModule: {
          contractVersion: "agent_runtime_module_metadata_v1",
          key: " concierge_runtime_module_v1 ",
          prompt: {
            profileRef: " concierge_prompt_v1 ",
            templateRoles: [" concierge_warm ", "concierge_core", "concierge_warm"],
          },
          hooks: {
            contractVersion: "agent_runtime_hooks_v1",
            enabled: ["postTool", "preRoute", "preTool"],
          },
          toolManifest: {
            contractVersion: "agent_runtime_tool_manifest_v1",
            requiredTools: ["send_email_from_template", "generate_audit_workflow_deliverable"],
            optionalTools: ["generate_audit_workflow_deliverable"],
            deniedTools: ["request_audit_deliverable_email"],
          },
          capabilities: [
            {
              key: "delivery_followup",
              outcomes: [
                {
                  outcomeKey: "email_sent",
                  requiredTools: ["send_email_from_template"],
                  preconditions: { requiredFields: ["email"] },
                },
              ],
            },
          ],
        },
        policyProfiles: {
          orgPolicyRef: "org_policy_default_v3",
          channelPolicyRef: "native_guest_policy_v2",
          runtimePolicyRef: "runtime_fail_closed_v5",
        },
      },
    });

    expect(normalized.agent.runtimeModule?.key).toBe("concierge_runtime_module_v1");
    expect(normalized.agent.runtimeModule?.prompt.templateRoles).toEqual([
      "concierge_core",
      "concierge_warm",
    ]);
    expect(normalized.agent.runtimeModule?.hooks.enabled).toEqual([
      "postTool",
      "preRoute",
      "preTool",
    ]);
    expect(normalized.agent.runtimeModule?.toolManifest.requiredTools).toEqual([
      "generate_audit_workflow_deliverable",
      "send_email_from_template",
    ]);
    expect(resolveAgentRuntimeModuleCapabilities(normalized)).toEqual([
      {
        key: "delivery_followup",
        outcomes: [
          {
            outcomeKey: "email_sent",
            requiredTools: ["send_email_from_template"],
            preconditions: { requiredFields: ["email"] },
          },
        ],
      },
    ]);
  });

  it("fails closed on unsupported runtime module hook names", () => {
    expect(() =>
      normalizeAgentSpecV1({
        contractVersion: "agent_spec_v1",
        agent: {
          key: "x",
          identity: { displayName: "S", role: "r" },
          channels: { allowed: ["webchat"], defaults: { primary: "webchat" } },
          capabilities: [],
          runtimeModule: {
            contractVersion: "agent_runtime_module_metadata_v1",
            key: "custom_runtime_module_v1",
            prompt: { profileRef: "custom_prompt_v1", templateRoles: [] },
            hooks: {
              contractVersion: "agent_runtime_hooks_v1",
              enabled: ["beforeEverything"],
            },
            toolManifest: {
              contractVersion: "agent_runtime_tool_manifest_v1",
              requiredTools: [],
              optionalTools: [],
              deniedTools: [],
            },
            capabilities: [],
          },
          policyProfiles: {
            orgPolicyRef: "org_policy_default_v3",
            channelPolicyRef: "webchat_policy_v1",
            runtimePolicyRef: "runtime_fail_closed_v5",
          },
        },
      }),
    ).toThrow(/unsupported hook name/);
  });

  it("resolves runtime module metadata from config declarations and legacy fallback", () => {
    const fromExplicitKey = resolveAgentRuntimeModuleMetadataFromConfig({
      runtimeModuleKey: SAMANTHA_AGENT_RUNTIME_MODULE_KEY,
    });
    expect(fromExplicitKey?.key).toBe(SAMANTHA_AGENT_RUNTIME_MODULE_KEY);

    const fromInlineMetadata = resolveAgentRuntimeModuleMetadataFromConfig({
      runtimeModule: {
        contractVersion: "agent_runtime_module_metadata_v1",
        key: "custom_runtime_module_v1",
        prompt: { profileRef: "custom_prompt_v1", templateRoles: ["custom_template"] },
        hooks: {
          contractVersion: "agent_runtime_hooks_v1",
          enabled: ["preRoute"],
        },
        toolManifest: {
          contractVersion: "agent_runtime_tool_manifest_v1",
          requiredTools: ["send_email_from_template"],
          optionalTools: [],
          deniedTools: [],
        },
        capabilities: [
          {
            key: "delivery_followup",
            outcomes: [
              {
                outcomeKey: "email_sent",
                requiredTools: ["send_email_from_template"],
              },
            ],
          },
        ],
      },
    });
    expect(fromInlineMetadata?.key).toBe("custom_runtime_module_v1");

    const fromLegacyFallback = resolveAgentRuntimeModuleMetadataFromConfig({
      templateRole: "one_of_one_lead_capture_consultant_template",
    });
    expect(fromLegacyFallback?.key).toBe(SAMANTHA_AGENT_RUNTIME_MODULE_KEY);

    const unknownModule = resolveAgentRuntimeModuleMetadataFromConfig({
      runtimeModuleKey: "unknown_runtime_module_v1",
    });
    expect(unknownModule).toBeNull();
  });
});
