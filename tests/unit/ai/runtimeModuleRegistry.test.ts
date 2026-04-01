import { describe, expect, it } from "vitest";

import {
  OAR_EXISTING_AGENT_TOPOLOGY_MIGRATION_EVIDENCE_VERSION,
  buildExistingAgentTopologyMigrationEvidence,
  resolveAgentModuleFromConfig,
  resolveKnownRuntimeModuleContractFromConfig,
} from "../../../convex/ai/agents/runtimeModuleRegistry";
import {
  DAVID_OGILVY_AGENT_RUNTIME_MODULE_KEY,
  resolveDavidOgilvyRuntimeContract,
} from "../../../convex/ai/agents/david_ogilvy/runtimeModule";
import {
  DER_TERMINMACHER_AGENT_RUNTIME_MODULE_KEY,
} from "../../../convex/ai/agents/der_terminmacher/runtimeModule";
import {
  QUINN_AGENT_RUNTIME_MODULE_KEY,
} from "../../../convex/ai/agents/quinn/runtimeModule";
import {
  HELENA_AGENT_RUNTIME_MODULE_KEY,
} from "../../../convex/ai/agentSpecRegistry";

describe("runtime module registry", () => {
  it("resolves Der Terminmacher contract by runtime module key", () => {
    const resolved = resolveKnownRuntimeModuleContractFromConfig({
      runtimeModuleKey: DER_TERMINMACHER_AGENT_RUNTIME_MODULE_KEY,
    });

    expect(resolved?.moduleKey).toBe(DER_TERMINMACHER_AGENT_RUNTIME_MODULE_KEY);
    expect(resolved?.contract).toMatchObject({
      moduleKey: DER_TERMINMACHER_AGENT_RUNTIME_MODULE_KEY,
    });
  });

  it("resolves David Ogilvy contract by template role", () => {
    const resolved = resolveKnownRuntimeModuleContractFromConfig({
      templateRole: "david_ogilvy_copywriter_template",
    });

    expect(resolved?.moduleKey).toBe(DAVID_OGILVY_AGENT_RUNTIME_MODULE_KEY);
    expect(resolved?.contract).toMatchObject({
      moduleKey: DAVID_OGILVY_AGENT_RUNTIME_MODULE_KEY,
    });
  });

  it("resolves preferred module key via AgentModule registry routing", () => {
    const resolved = resolveAgentModuleFromConfig({
      config: {
        runtimeModuleKey: DER_TERMINMACHER_AGENT_RUNTIME_MODULE_KEY,
      },
      preferredModuleKey: DER_TERMINMACHER_AGENT_RUNTIME_MODULE_KEY,
    });

    expect(resolved?.module.key).toBe(DER_TERMINMACHER_AGENT_RUNTIME_MODULE_KEY);
    expect((resolved?.contract as { moduleKey?: string } | undefined)?.moduleKey).toBe(
      DER_TERMINMACHER_AGENT_RUNTIME_MODULE_KEY,
    );
  });

  it("resolves Quinn contract only when explicit runtime module key is set", () => {
    const unresolved = resolveKnownRuntimeModuleContractFromConfig({
      displayName: "Quinn",
    });
    expect(unresolved).toBeNull();

    const resolved = resolveKnownRuntimeModuleContractFromConfig({
      runtimeModuleKey: QUINN_AGENT_RUNTIME_MODULE_KEY,
    });
    expect(resolved?.moduleKey).toBe(QUINN_AGENT_RUNTIME_MODULE_KEY);
    expect((resolved?.contract as { moduleKey?: string } | undefined)?.moduleKey).toBe(
      QUINN_AGENT_RUNTIME_MODULE_KEY,
    );
  });

  it("resolves Helena contract only when explicit runtime module key is set", () => {
    const unresolved = resolveKnownRuntimeModuleContractFromConfig({
      displayName: "Helena",
    });
    expect(unresolved).toBeNull();

    const resolved = resolveKnownRuntimeModuleContractFromConfig({
      runtimeModuleKey: HELENA_AGENT_RUNTIME_MODULE_KEY,
    });
    expect(resolved?.moduleKey).toBe(HELENA_AGENT_RUNTIME_MODULE_KEY);
    expect((resolved?.contract as { moduleKey?: string } | undefined)?.moduleKey).toBe(
      HELENA_AGENT_RUNTIME_MODULE_KEY,
    );
  });
});

describe("david ogilvy runtime contract resolver", () => {
  it("returns null when config does not match any Ogilvy signal", () => {
    expect(
      resolveDavidOgilvyRuntimeContract({
        templateRole: "some_other_template",
        displayName: "Operations Assistant",
      }),
    ).toBeNull();
  });

  it("enables Ogilvy runtime by explicit module key", () => {
    const contract = resolveDavidOgilvyRuntimeContract({
      runtimeModuleKey: DAVID_OGILVY_AGENT_RUNTIME_MODULE_KEY,
    });
    expect(contract?.moduleKey).toBe(DAVID_OGILVY_AGENT_RUNTIME_MODULE_KEY);
    expect(contract?.stylePolicy.evidenceRequired).toBe(true);
    expect(contract?.outputPolicy.requireCta).toBe(true);
  });
});

describe("existing-agent topology migration evidence", () => {
  it("builds deterministic compatibility and remediation queue snapshots", () => {
    const evidence = buildExistingAgentTopologyMigrationEvidence({
      generatedAt: 1_739_900_000_555,
      agents: [
        {
          agentKey: "samantha_core",
          displayName: "Samantha",
          runtimeModuleKey: "one_of_one_samantha_runtime_module_v1",
          declaredProfile: "evaluator_loop",
          declaredAdapter: "evaluator_loop_adapter_v1",
        },
        {
          agentKey: "terminmacher_concierge",
          displayName: "Der Terminmacher",
          runtimeModuleKey: DER_TERMINMACHER_AGENT_RUNTIME_MODULE_KEY,
          declaredProfile: "pipeline_router",
          declaredAdapter: "pipeline_router_adapter_v1",
        },
        {
          agentKey: "operator_missing_profile",
          displayName: "One-of-One Operator",
          runtimeModuleKey: DER_TERMINMACHER_AGENT_RUNTIME_MODULE_KEY,
          declaredAdapter: "pipeline_router_adapter_v1",
        },
        {
          agentKey: "ogilvy_bad_adapter",
          displayName: "David Ogilvy",
          runtimeModuleKey: DAVID_OGILVY_AGENT_RUNTIME_MODULE_KEY,
          declaredProfile: "single_agent_loop",
          declaredAdapter: "pipeline_router_adapter_v1",
        },
      ],
    });

    expect(evidence.contractVersion).toBe(
      OAR_EXISTING_AGENT_TOPOLOGY_MIGRATION_EVIDENCE_VERSION,
    );
    expect(evidence.generatedAt).toBe(1_739_900_000_555);
    expect(evidence.totals).toEqual({
      totalAgents: 4,
      migratedAgents: 2,
      blockedAgents: 2,
    });
    expect(evidence.entries.map((entry) => entry.agentKey)).toEqual([
      "ogilvy_bad_adapter",
      "operator_missing_profile",
      "samantha_core",
      "terminmacher_concierge",
    ]);
    expect(evidence.blockedQueue).toEqual([
      {
        agentKey: "ogilvy_bad_adapter",
        reasonCode: "profile_adapter_mismatch",
        remediation:
          "Update runtimeTopology.adapter to match resolveAgentRuntimeTopologyAdapter(profile).",
      },
      {
        agentKey: "operator_missing_profile",
        reasonCode: "missing_topology_profile",
        remediation:
          "Declare runtimeTopology.profile in agent package contract before rollout.",
      },
    ]);
  });
});
