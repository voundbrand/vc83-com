import { describe, expect, it } from "vitest";
import {
  applyKanzleiPromptInputMinimization,
  computeAgentSpecHash,
  isKanzleiExternalDispatchToolName,
  KANZLEI_PROMPT_INPUT_MINIMIZATION_CONTRACT_VERSION,
  normalizeAgentSpecV1,
  resolveKanzleiPromptInputMinimizationContract,
  resolveAgentRuntimeModuleCapabilities,
  resolveAgentRuntimeModuleMetadataFromConfig,
  HELENA_AGENT_RUNTIME_MODULE_KEY,
  SAMANTHA_AGENT_RUNTIME_MODULE_KEY,
} from "../../../convex/ai/agentSpecRegistry";

describe("agent spec registry contract", () => {
  it("normalizes agent_spec_v1 deterministically", () => {
    const normalized = normalizeAgentSpecV1({
      contractVersion: "agent_spec_v1",
      agent: {
        key: " one_of_one_samantha_warm ",
        identity: {
          displayName: " Samantha ",
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
        runtimeTopology: {
          contractVersion: "oar_runtime_topology_v1",
          profile: "evaluator_loop",
          adapter: "evaluator_loop_adapter_v1",
        },
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

    const b = normalizeAgentSpecV1({
      agent: {
        policyProfiles: {
          runtimePolicyRef: "runtime_fail_closed_v5",
          channelPolicyRef: "native_guest_policy_v2",
          orgPolicyRef: "org_policy_default_v3",
        },
        runtimeTopology: {
          contractVersion: "oar_runtime_topology_v1",
          profile: "evaluator_loop",
          adapter: "evaluator_loop_adapter_v1",
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
          runtimeTopology: {
            contractVersion: "oar_runtime_topology_v1",
            profile: "single_agent_loop",
            adapter: "single_agent_loop_adapter_v1",
          },
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
        runtimeTopology: {
          contractVersion: "oar_runtime_topology_v1",
          profile: "pipeline_router",
          adapter: "pipeline_router_adapter_v1",
        },
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
          runtimeTopology: {
            contractVersion: "oar_runtime_topology_v1",
            profile: "single_agent_loop",
            adapter: "single_agent_loop_adapter_v1",
          },
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

  it("fails closed when topology declaration is missing", () => {
    expect(() =>
      normalizeAgentSpecV1({
        contractVersion: "agent_spec_v1",
        agent: {
          key: "x",
          identity: { displayName: "S", role: "r" },
          channels: { allowed: ["webchat"], defaults: { primary: "webchat" } },
          capabilities: [],
          policyProfiles: {
            orgPolicyRef: "org_policy_default_v3",
            channelPolicyRef: "webchat_policy_v1",
            runtimePolicyRef: "runtime_fail_closed_v5",
          },
        },
      }),
    ).toThrow(/runtimeTopology/);
  });

  it("fails closed when topology adapter does not match profile", () => {
    expect(() =>
      normalizeAgentSpecV1({
        contractVersion: "agent_spec_v1",
        agent: {
          key: "x",
          identity: { displayName: "S", role: "r" },
          channels: { allowed: ["webchat"], defaults: { primary: "webchat" } },
          capabilities: [],
          runtimeTopology: {
            contractVersion: "oar_runtime_topology_v1",
            profile: "pipeline_router",
            adapter: "single_agent_loop_adapter_v1",
          },
          policyProfiles: {
            orgPolicyRef: "org_policy_default_v3",
            channelPolicyRef: "webchat_policy_v1",
            runtimePolicyRef: "runtime_fail_closed_v5",
          },
        },
      }),
    ).toThrow(/incompatible with profile/);
  });

  it("fails closed when topology profile is incompatible with runtime module contract", () => {
    expect(() =>
      normalizeAgentSpecV1({
        contractVersion: "agent_spec_v1",
        agent: {
          key: "one_of_one_samantha_warm",
          identity: { displayName: "Samantha", role: "consultant" },
          channels: {
            allowed: ["webchat", "native_guest"],
            defaults: { primary: "native_guest" },
          },
          capabilities: [],
          runtimeTopology: {
            contractVersion: "oar_runtime_topology_v1",
            profile: "single_agent_loop",
            adapter: "single_agent_loop_adapter_v1",
          },
          runtimeModule: {
            contractVersion: "agent_runtime_module_metadata_v1",
            key: SAMANTHA_AGENT_RUNTIME_MODULE_KEY,
            prompt: {
              profileRef: "samantha_lead_capture_prompt_v1",
              templateRoles: [],
            },
            hooks: {
              contractVersion: "agent_runtime_hooks_v1",
              enabled: ["preRoute"],
            },
            toolManifest: {
              contractVersion: "agent_runtime_tool_manifest_v1",
              requiredTools: ["generate_audit_workflow_deliverable"],
              optionalTools: [],
              deniedTools: [],
            },
            capabilities: [],
          },
          policyProfiles: {
            orgPolicyRef: "org_policy_default_v3",
            channelPolicyRef: "native_guest_policy_v2",
            runtimePolicyRef: "runtime_fail_closed_v5",
          },
        },
      }),
    ).toThrow(/runtimeTopology.profile does not match runtimeModule topology contract/);
  });

  it("resolves runtime module metadata from config declarations and legacy fallback", () => {
    const fromExplicitKey = resolveAgentRuntimeModuleMetadataFromConfig({
      runtimeModuleKey: SAMANTHA_AGENT_RUNTIME_MODULE_KEY,
    });
    expect(fromExplicitKey?.key).toBe(SAMANTHA_AGENT_RUNTIME_MODULE_KEY);

    const helenaModule = resolveAgentRuntimeModuleMetadataFromConfig({
      runtimeModuleKey: HELENA_AGENT_RUNTIME_MODULE_KEY,
    });
    expect(helenaModule?.key).toBe(HELENA_AGENT_RUNTIME_MODULE_KEY);
    expect(helenaModule?.toolManifest.requiredTools).toEqual([
      "create_contact",
      "search_contacts",
      "update_contact",
    ]);

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

  it("identifies Kanzlei external dispatch tool names deterministically", () => {
    expect(isKanzleiExternalDispatchToolName("manage_sequences")).toBe(true);
    expect(isKanzleiExternalDispatchToolName("request_audit_deliverable_email")).toBe(
      true,
    );
    expect(isKanzleiExternalDispatchToolName("create_form")).toBe(false);
  });

  it("resolves Kanzlei prompt-input minimization contract and trims non-required fields deterministically", () => {
    const contract = resolveKanzleiPromptInputMinimizationContract({
      modeTokens: ["kanzlei_mvp_customer_telephony_template"],
    });
    expect(contract).toMatchObject({
      contractVersion: KANZLEI_PROMPT_INPUT_MINIMIZATION_CONTRACT_VERSION,
      mode: "need_to_know",
      requiresExplicitFieldMapping: true,
      onDeniedField: "drop_and_audit",
    });

    const minimization = applyKanzleiPromptInputMinimization(
      {
        urgency: "hoch",
        matterType: "erstberatung",
        mandantName: "Max Mustermann",
        taxId: "DE123",
        freeFormNotes: "Bitte ruft nach 17 Uhr an.",
      },
      contract!,
    );

    expect(minimization.minimizedPayload).toEqual({
      matterType: "erstberatung",
      urgency: "hoch",
    });
    expect(minimization.retainedFields).toEqual(["matterType", "urgency"]);
    expect(minimization.droppedFields).toEqual([
      "freeFormNotes",
      "mandantName",
      "taxId",
    ]);
    expect(minimization.droppedDeniedFields).toEqual([
      "mandantName",
      "taxId",
    ]);
  });

  it("skips minimization contract outside Kanzlei policy modes", () => {
    expect(
      resolveKanzleiPromptInputMinimizationContract({
        modeTokens: ["customer_support"],
      }),
    ).toBeNull();
  });
});
