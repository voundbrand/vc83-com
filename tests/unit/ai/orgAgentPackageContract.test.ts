import { describe, expect, it } from "vitest";
import { normalizeAgentSpecV1 } from "../../../convex/ai/agentSpecRegistry";
import { AGENT_PACKAGE_CONTRACT_VERSION } from "../../../convex/schemas/aiSchemas";

function buildValidPackageContract() {
  return {
    contractVersion: AGENT_PACKAGE_CONTRACT_VERSION,
    goal: {
      primaryOutcome: "audit_workflow_deliverable_email",
      successMetric: "completion_rate",
    },
    tools: {
      required: ["generate_audit_workflow_deliverable"],
      optional: ["send_email_from_template"],
      denied: ["request_audit_deliverable_email"],
    },
    policy: {
      orgPolicyRef: "org_policy_default_v3",
      channelPolicyRef: "native_guest_policy_v2",
      runtimePolicyRef: "runtime_fail_closed_v5",
    },
    memory: {
      mode: "session_context",
      retentionPolicyRef: "memory_retention_default_v1",
    },
    eval: {
      suiteRef: "agent_eval_suite:one_of_one_samantha_warm:v1",
      passThreshold: 0.9,
      holdThreshold: 0.75,
    },
    rollout: {
      stage: "internal",
      owner: "runtime_oncall",
      enableFlag: "agent_package_one_of_one_samantha_warm_enabled",
    },
  };
}

function buildSpec(args?: { packageContract?: unknown }) {
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
      ...(typeof args?.packageContract === "undefined"
        ? {}
        : { packageContract: args.packageContract }),
    },
  };
}

describe("org agent package contract", () => {
  it("derives a deterministic default package contract when packageContract is omitted", () => {
    const normalized = normalizeAgentSpecV1(buildSpec());
    expect(normalized.agent.packageContract).toEqual({
      contractVersion: AGENT_PACKAGE_CONTRACT_VERSION,
      goal: {
        primaryOutcome: "audit_workflow_deliverable_email",
        successMetric: "agent_success_rate",
      },
      tools: {
        required: ["generate_audit_workflow_deliverable"],
        optional: [],
        denied: [],
      },
      policy: {
        orgPolicyRef: "org_policy_default_v3",
        channelPolicyRef: "native_guest_policy_v2",
        runtimePolicyRef: "runtime_fail_closed_v5",
      },
      memory: {
        mode: "session_context",
        retentionPolicyRef: "memory_retention_default_v1",
      },
      eval: {
        suiteRef: "agent_eval_suite:one_of_one_samantha_warm:v1",
        passThreshold: 0.85,
        holdThreshold: 0.7,
      },
      rollout: {
        stage: "internal",
        owner: "runtime_oncall",
        enableFlag: "agent_package_one_of_one_samantha_warm_enabled",
      },
    });
  });

  it("normalizes explicit package contract fields deterministically", () => {
    const packageContract = buildValidPackageContract();
    packageContract.goal.primaryOutcome = " audit_workflow_deliverable_email ";
    packageContract.goal.successMetric = " completion_rate ";
    packageContract.tools.required = [
      "generate_audit_workflow_deliverable",
      "generate_audit_workflow_deliverable",
    ];
    packageContract.tools.optional = [
      "send_email_from_template",
      "generate_audit_workflow_deliverable",
      "send_email_from_template",
    ];
    packageContract.tools.denied = ["request_audit_deliverable_email"];
    packageContract.eval.suiteRef = " agent_eval_suite:one_of_one_samantha_warm:v2 ";
    packageContract.rollout.stage = "canary";
    packageContract.rollout.owner = " runtime_oncall ";
    packageContract.rollout.enableFlag = " agent_package_one_of_one_samantha_warm_canary ";

    const normalized = normalizeAgentSpecV1(buildSpec({ packageContract }));
    expect(normalized.agent.packageContract).toEqual({
      contractVersion: AGENT_PACKAGE_CONTRACT_VERSION,
      goal: {
        primaryOutcome: "audit_workflow_deliverable_email",
        successMetric: "completion_rate",
      },
      tools: {
        required: ["generate_audit_workflow_deliverable"],
        optional: [
          "generate_audit_workflow_deliverable",
          "send_email_from_template",
        ],
        denied: ["request_audit_deliverable_email"],
      },
      policy: {
        orgPolicyRef: "org_policy_default_v3",
        channelPolicyRef: "native_guest_policy_v2",
        runtimePolicyRef: "runtime_fail_closed_v5",
      },
      memory: {
        mode: "session_context",
        retentionPolicyRef: "memory_retention_default_v1",
      },
      eval: {
        suiteRef: "agent_eval_suite:one_of_one_samantha_warm:v2",
        passThreshold: 0.9,
        holdThreshold: 0.75,
      },
      rollout: {
        stage: "canary",
        owner: "runtime_oncall",
        enableFlag: "agent_package_one_of_one_samantha_warm_canary",
      },
    });
  });

  it("fails closed when hold threshold exceeds pass threshold", () => {
    const packageContract = buildValidPackageContract();
    packageContract.eval.passThreshold = 0.6;
    packageContract.eval.holdThreshold = 0.7;

    expect(() => normalizeAgentSpecV1(buildSpec({ packageContract }))).toThrow(
      /holdThreshold cannot exceed passThreshold/,
    );
  });

  it("fails closed on unsupported rollout stage", () => {
    const packageContract = buildValidPackageContract();
    packageContract.rollout.stage = "beta";

    expect(() => normalizeAgentSpecV1(buildSpec({ packageContract }))).toThrow(
      /rollout.stage is unsupported/,
    );
  });

  it("fails closed on required and denied tool overlap", () => {
    const packageContract = buildValidPackageContract();
    packageContract.tools.denied = ["generate_audit_workflow_deliverable"];

    expect(() => normalizeAgentSpecV1(buildSpec({ packageContract }))).toThrow(
      /tools.denied cannot include required tool/,
    );
  });

  it("fails closed on package policy/profile mismatch", () => {
    const packageContract = buildValidPackageContract();
    packageContract.policy.channelPolicyRef = "webchat_policy_v1";

    expect(() => normalizeAgentSpecV1(buildSpec({ packageContract }))).toThrow(
      /policy refs must match agent_spec_v1.agent.policyProfiles/,
    );
  });

  it("fails closed on unknown package tool references", () => {
    const packageContract = buildValidPackageContract();
    packageContract.tools.optional = ["unknown_tool_reference"];

    expect(() => normalizeAgentSpecV1(buildSpec({ packageContract }))).toThrow(
      /unknown tool references/,
    );
  });
});
