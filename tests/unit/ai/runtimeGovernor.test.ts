import { describe, expect, it } from "vitest";
import {
  enforceRuntimeGovernorCost,
  enforceRuntimeGovernorStepAndTime,
  RUNTIME_GOVERNOR_CONTRACT_VERSION,
  formatRuntimeGovernorLimitMessage,
  resolveRuntimeGovernorContract,
} from "../../../convex/ai/runtimeGovernor";

describe("runtime governor contract", () => {
  it("returns deterministic defaults when no overrides exist", () => {
    const contract = resolveRuntimeGovernorContract({});
    expect(contract).toEqual({
      contract_version: RUNTIME_GOVERNOR_CONTRACT_VERSION,
      max_steps: 8,
      max_time_ms: 120_000,
      max_cost_usd: 2.5,
      source: "default",
    });
  });

  it("applies agent config overrides", () => {
    const contract = resolveRuntimeGovernorContract({
      agentConfig: {
        runtimeGovernor: {
          max_steps: 12,
          max_time_ms: 90_000,
          max_cost_usd: 1.25,
        },
      },
    });
    expect(contract.max_steps).toBe(12);
    expect(contract.max_time_ms).toBe(90_000);
    expect(contract.max_cost_usd).toBe(1.25);
    expect(contract.source).toBe("agent_config");
  });

  it("lets metadata overrides win over agent config", () => {
    const contract = resolveRuntimeGovernorContract({
      agentConfig: {
        runtimeGovernor: {
          max_steps: 12,
          max_time_ms: 90_000,
          max_cost_usd: 1.25,
        },
      },
      metadata: {
        runtime_governor: {
          maxSteps: 6,
          maxTimeMs: 45_000,
          maxCostUsd: 0.75,
        },
      },
    });
    expect(contract.max_steps).toBe(6);
    expect(contract.max_time_ms).toBe(45_000);
    expect(contract.max_cost_usd).toBe(0.75);
    expect(contract.source).toBe("metadata_override");
  });

  it("uses metadata override per-field and falls back to agent config for missing values", () => {
    const contract = resolveRuntimeGovernorContract({
      agentConfig: {
        runtimeGovernor: {
          max_steps: 16,
          max_time_ms: 95_000,
          max_cost_usd: 4.2,
        },
      },
      metadata: {
        runtimeGovernor: {
          max_steps: 6,
        },
      },
    });
    expect(contract.max_steps).toBe(6);
    expect(contract.max_time_ms).toBe(95_000);
    expect(contract.max_cost_usd).toBe(4.2);
    expect(contract.source).toBe("metadata_override");
  });

  it("normalizes bounded integer/number overrides deterministically", () => {
    const contract = resolveRuntimeGovernorContract({
      metadata: {
        runtimeGovernor: {
          max_steps: 12.9,
          max_time_ms: 45_123.99,
          max_cost_usd: 1.23456,
        },
      },
    });
    expect(contract.max_steps).toBe(12);
    expect(contract.max_time_ms).toBe(45_123);
    expect(contract.max_cost_usd).toBe(1.235);
  });

  it("ignores out-of-range override values", () => {
    const contract = resolveRuntimeGovernorContract({
      metadata: {
        runtimeGovernor: {
          max_steps: 0,
          max_time_ms: 999_999_999,
          max_cost_usd: -1,
        },
      },
    });
    expect(contract.max_steps).toBe(8);
    expect(contract.max_time_ms).toBe(120_000);
    expect(contract.max_cost_usd).toBe(2.5);
    expect(contract.source).toBe("default");
  });

  it("formats deterministic limit messages", () => {
    const contract = resolveRuntimeGovernorContract({});
    expect(
      formatRuntimeGovernorLimitMessage({
        limit: "max_steps",
        contract,
        observedValue: 9,
      }),
    ).toContain("max_steps");
    expect(
      formatRuntimeGovernorLimitMessage({
        limit: "max_time_ms",
        contract,
        observedValue: 150_000,
      }),
    ).toContain("max_time_ms");
    expect(
      formatRuntimeGovernorLimitMessage({
        limit: "max_cost_usd",
        contract,
        observedValue: 3,
      }),
    ).toContain("max_cost_usd");
  });

  it("enforces max_steps by trimming tool calls and appending message when no tool slots remain", () => {
    const contract = resolveRuntimeGovernorContract({
      metadata: {
        runtimeGovernor: {
          max_steps: 1,
        },
      },
    });
    const state = enforceRuntimeGovernorStepAndTime({
      contract,
      assistantContent: "Initial answer",
      toolCalls: [{ id: "t1" }, { id: "t2" }],
      elapsedMsBeforeTools: 500,
    });

    expect(state.toolCalls).toEqual([]);
    expect(state.toolCallsTrimmed).toBe(2);
    expect(state.limitTriggered).toBe("max_steps");
    expect(state.assistantContent).toContain("max_steps");
    expect(state.assistantContent).toContain("observed: 2");
  });

  it("enforces max_time_ms after step trimming and preserves first triggered limit", () => {
    const contract = resolveRuntimeGovernorContract({
      metadata: {
        runtimeGovernor: {
          max_steps: 3,
          max_time_ms: 1_000,
        },
      },
    });
    const state = enforceRuntimeGovernorStepAndTime({
      contract,
      assistantContent: "Initial answer",
      toolCalls: [{ id: "t1" }, { id: "t2" }, { id: "t3" }, { id: "t4" }],
      elapsedMsBeforeTools: 1_200,
    });

    expect(state.toolCalls).toEqual([]);
    expect(state.toolCallsTrimmed).toBe(2);
    expect(state.limitTriggered).toBe("max_steps");
    expect(state.assistantContent).toContain("max_time_ms");
  });

  it("does not trigger max_time_ms when no tool calls remain", () => {
    const contract = resolveRuntimeGovernorContract({
      metadata: {
        runtimeGovernor: {
          max_time_ms: 1_000,
        },
      },
    });
    const state = enforceRuntimeGovernorStepAndTime({
      contract,
      assistantContent: "Initial answer",
      toolCalls: [],
      elapsedMsBeforeTools: 2_000,
    });

    expect(state.toolCalls).toEqual([]);
    expect(state.limitTriggered).toBe("none");
    expect(state.assistantContent).toBe("Initial answer");
  });

  it("enforces max_cost_usd when estimated cost exceeds budget and tool calls are pending", () => {
    const contract = resolveRuntimeGovernorContract({
      metadata: {
        runtimeGovernor: {
          max_cost_usd: 0.5,
        },
      },
    });
    const state = enforceRuntimeGovernorCost({
      contract,
      assistantContent: "Initial answer",
      toolCalls: [{ id: "t1" }],
      toolCallsTrimmed: 0,
      estimatedCostUsd: 0.75,
      limitTriggered: "none",
    });

    expect(state.toolCalls).toEqual([]);
    expect(state.limitTriggered).toBe("max_cost_usd");
    expect(state.assistantContent).toContain("max_cost_usd");
    expect(state.assistantContent).toContain("observed: 0.75");
  });

  it("does not overwrite a previously triggered limit when cost gate also fires", () => {
    const contract = resolveRuntimeGovernorContract({
      metadata: {
        runtimeGovernor: {
          max_cost_usd: 0.5,
        },
      },
    });
    const state = enforceRuntimeGovernorCost({
      contract,
      assistantContent: "Initial answer",
      toolCalls: [{ id: "t1" }],
      toolCallsTrimmed: 1,
      estimatedCostUsd: 0.9,
      limitTriggered: "max_time_ms",
    });

    expect(state.limitTriggered).toBe("max_time_ms");
    expect(state.toolCalls).toEqual([]);
    expect(state.assistantContent).toContain("max_cost_usd");
  });

  it("does not trigger max_cost_usd when no tool calls are pending", () => {
    const contract = resolveRuntimeGovernorContract({
      metadata: {
        runtimeGovernor: {
          max_cost_usd: 0.5,
        },
      },
    });
    const state = enforceRuntimeGovernorCost({
      contract,
      assistantContent: "Initial answer",
      toolCalls: [],
      toolCallsTrimmed: 0,
      estimatedCostUsd: 0.9,
      limitTriggered: "none",
    });

    expect(state.toolCalls).toEqual([]);
    expect(state.limitTriggered).toBe("none");
    expect(state.assistantContent).toBe("Initial answer");
  });
});
