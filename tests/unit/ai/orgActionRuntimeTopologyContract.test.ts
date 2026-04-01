import { describe, expect, it } from "vitest";
import {
  AGENT_RUNTIME_TOPOLOGY_CONTRACT_VERSION,
  AGENT_RUNTIME_TOPOLOGY_PROFILE_DEFAULT,
  AGENT_RUNTIME_TOPOLOGY_PROFILE_VALUES,
  assertAgentRuntimeTopologyContract,
  isAgentRuntimeTopologyProfile,
  resolveAgentRuntimeTopologyAdapter,
} from "../../../convex/schemas/aiSchemas";
import {
  DER_TERMINMACHER_AGENT_RUNTIME_MODULE_KEY,
} from "../../../convex/ai/agents/der_terminmacher/runtimeModule";
import {
  resolveAgentRuntimeTopologyContractFromConfig,
} from "../../../convex/ai/kernel/agentExecution";
import {
  resolveInboundRuntimeTopologyAdapterSelection,
} from "../../../convex/ai/kernel/agentTurnOrchestration";

describe("org action runtime topology contract", () => {
  it("exposes canonical topology profile catalog with single-agent explicit default", () => {
    expect(AGENT_RUNTIME_TOPOLOGY_PROFILE_DEFAULT).toBe("single_agent_loop");
    expect(AGENT_RUNTIME_TOPOLOGY_PROFILE_VALUES).toEqual([
      "single_agent_loop",
      "pipeline_router",
      "multi_agent_dag",
      "evaluator_loop",
    ]);
    expect(isAgentRuntimeTopologyProfile("single_agent_loop")).toBe(true);
    expect(isAgentRuntimeTopologyProfile("pipeline_router")).toBe(true);
    expect(isAgentRuntimeTopologyProfile("unknown_profile")).toBe(false);
  });

  it("resolves deterministic adapter names for each topology profile", () => {
    expect(resolveAgentRuntimeTopologyAdapter("single_agent_loop")).toBe(
      "single_agent_loop_adapter_v1",
    );
    expect(resolveAgentRuntimeTopologyAdapter("pipeline_router")).toBe(
      "pipeline_router_adapter_v1",
    );
    expect(resolveAgentRuntimeTopologyAdapter("multi_agent_dag")).toBe(
      "multi_agent_dag_adapter_v1",
    );
    expect(resolveAgentRuntimeTopologyAdapter("evaluator_loop")).toBe(
      "evaluator_loop_adapter_v1",
    );
  });

  it("fails closed when no profile signal is available", () => {
    const contract = resolveAgentRuntimeTopologyContractFromConfig({
      config: {
        displayName: "Unclassified Runtime",
      },
      now: 1774465200000,
    });
    expect(contract.contractVersion).toBe(AGENT_RUNTIME_TOPOLOGY_CONTRACT_VERSION);
    expect(contract.enforcement).toBe("blocked");
    expect(contract.reasonCode).toBe("topology_profile_missing");
    expect(contract.profile).toBe(AGENT_RUNTIME_TOPOLOGY_PROFILE_DEFAULT);
    expect(contract.source).toBe("default_profile");
    expect(() => assertAgentRuntimeTopologyContract(contract)).not.toThrow();
  });

  it("fails closed when explicit profile is invalid", () => {
    const contract = resolveAgentRuntimeTopologyContractFromConfig({
      config: {
        runtimeTopologyProfile: "wild_west_mode",
      },
      now: 1774465200001,
    });
    expect(contract.enforcement).toBe("blocked");
    expect(contract.reasonCode).toBe("topology_profile_invalid");
  });

  it("enforces explicit profile and detects runtime-module mismatch", () => {
    const mismatch = resolveAgentRuntimeTopologyContractFromConfig({
      config: {
        runtimeTopologyProfile: "single_agent_loop",
      },
      runtimeModuleKey: DER_TERMINMACHER_AGENT_RUNTIME_MODULE_KEY,
      now: 1774465200002,
    });
    expect(mismatch.enforcement).toBe("blocked");
    expect(mismatch.reasonCode).toBe(
      "topology_profile_runtime_module_mismatch",
    );
  });

  it("selects explicit adapter path for valid profile contracts", () => {
    const contract = resolveAgentRuntimeTopologyContractFromConfig({
      config: {
        runtimeTopologyProfile: "pipeline_router",
      },
      now: 1774465200003,
    });
    expect(contract.enforcement).toBe("enforced");
    expect(contract.source).toBe("agent_config");
    expect(contract.adapter).toBe("pipeline_router_adapter_v1");

    const adapterSelection = resolveInboundRuntimeTopologyAdapterSelection(
      contract.profile,
    );
    expect(adapterSelection).toMatchObject({
      profile: "pipeline_router",
      adapter: "pipeline_router_adapter_v1",
    });
    expect(adapterSelection.stageOrder).toEqual([
      "ingress",
      "routing",
      "tool_dispatch",
      "delivery",
    ]);
  });

  it("fails closed when explicit adapter does not match the profile", () => {
    const contract = resolveAgentRuntimeTopologyContractFromConfig({
      config: {
        runtimeTopologyProfile: "pipeline_router",
        runtimeTopologyAdapter: "single_agent_loop_adapter_v1",
      },
      now: 1774465200004,
    });
    expect(contract.enforcement).toBe("blocked");
    expect(contract.reasonCode).toBe("topology_profile_adapter_mismatch");
  });

  it("fails closed when explicit adapter token is invalid", () => {
    const contract = resolveAgentRuntimeTopologyContractFromConfig({
      config: {
        runtimeTopologyProfile: "pipeline_router",
        runtimeTopologyAdapter: "unsupported_adapter",
      },
      now: 1774465200005,
    });
    expect(contract.enforcement).toBe("blocked");
    expect(contract.reasonCode).toBe("topology_adapter_invalid");
  });
});
