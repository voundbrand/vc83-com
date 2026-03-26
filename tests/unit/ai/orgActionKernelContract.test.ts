import { describe, expect, it } from "vitest";
import {
  INBOUND_RUNTIME_KERNEL_CONTRACT_VERSION,
  INBOUND_RUNTIME_KERNEL_STAGE_ORDER,
  INBOUND_RUNTIME_KERNEL_TERMINAL_PHASE_VALUES,
  assertInboundRuntimeKernelContract,
  resolveInboundRuntimeKernelContract,
} from "../../../convex/ai/agentTurnOrchestration";

describe("org action kernel contract", () => {
  it("resolves frozen kernel contract with canonical stage + terminal phases", () => {
    const contract = resolveInboundRuntimeKernelContract("single_agent_loop");

    expect(contract).toMatchObject({
      contractVersion: INBOUND_RUNTIME_KERNEL_CONTRACT_VERSION,
      topologyProfile: "single_agent_loop",
      topologyAdapter: "single_agent_loop_adapter_v1",
      adapterCompatibility: {
        compatible: true,
        reasonCode: "adapter_profile_match",
      },
    });
    expect(contract.stageOrder).toEqual(INBOUND_RUNTIME_KERNEL_STAGE_ORDER);
    expect(contract.terminalPhases).toEqual(
      INBOUND_RUNTIME_KERNEL_TERMINAL_PHASE_VALUES,
    );
    expect(() => assertInboundRuntimeKernelContract(contract)).not.toThrow();
  });

  it("fails closed when kernel stage order drifts from frozen contract", () => {
    const contract = resolveInboundRuntimeKernelContract("pipeline_router");
    const invalidContract = {
      ...contract,
      stageOrder: ["routing", "ingress", "tool_dispatch", "delivery"] as const,
    };

    expect(() => assertInboundRuntimeKernelContract(invalidContract)).toThrow(
      /inbound_runtime_kernel_stage_order_mismatch/,
    );
  });

  it("fails closed when adapter compatibility evidence is negative", () => {
    const contract = resolveInboundRuntimeKernelContract("multi_agent_dag");
    const invalidContract = {
      ...contract,
      topologyAdapter: "single_agent_loop_adapter_v1" as const,
      adapterCompatibility: {
        compatible: false,
        reasonCode: "adapter_profile_mismatch",
      },
    };

    expect(() => assertInboundRuntimeKernelContract(invalidContract)).toThrow(
      /inbound_runtime_kernel_adapter_incompatible/,
    );
  });
});
