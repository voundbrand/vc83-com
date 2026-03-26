import { describe, expect, it, vi } from "vitest";

import { SAMANTHA_AGENT_RUNTIME_MODULE_KEY } from "../../../convex/ai/agentSpecRegistry";
import { createSamanthaDispatchTraceScaffolding } from "../../../convex/ai/agents/samantha/trace";

describe("Samantha dispatch trace scaffolding", () => {
  it("records trace events with correlation updates and console payload parity", () => {
    const ticks = [1000, 1015, 1040];
    const now = () => ticks.shift() ?? 1040;
    const emitConsoleTrace = vi.fn();
    const trace = createSamanthaDispatchTraceScaffolding({
      organizationId: "org_1",
      channel: "webchat",
      shouldEmitConsoleTrace: true,
      now,
      emitConsoleTrace,
    });

    trace.recordSamanthaDispatchEvent({
      stage: "router_entry",
      status: "pass",
      reasonCode: "router_reached",
    });
    trace.setSamanthaDispatchTraceCorrelationId("corr_1");
    trace.recordSamanthaDispatchEvent({
      stage: "router_correlation",
      status: "pass",
      reasonCode: "correlation_established",
      detail: {
        correlationId: "corr_1",
      },
    });

    expect(trace.samanthaDispatchTraceEvents).toEqual([
      {
        stage: "router_entry",
        status: "pass",
        reasonCode: "router_reached",
        atMs: 15,
      },
      {
        stage: "router_correlation",
        status: "pass",
        reasonCode: "correlation_established",
        detail: {
          correlationId: "corr_1",
        },
        atMs: 40,
      },
    ]);
    expect(trace.getSamanthaDispatchTraceCorrelationId()).toBe("corr_1");
    expect(emitConsoleTrace).toHaveBeenCalledTimes(2);
    expect(emitConsoleTrace.mock.calls[0]?.[0]).toBe(
      "[AgentExecution][SamanthaDispatchTrace]",
    );
    expect(emitConsoleTrace.mock.calls[0]?.[1]).toMatchObject({
      correlationId: null,
      organizationId: "org_1",
      channel: "webchat",
      stage: "router_entry",
      status: "pass",
      reasonCode: "router_reached",
    });
    expect(emitConsoleTrace.mock.calls[1]?.[1]).toMatchObject({
      correlationId: "corr_1",
      stage: "router_correlation",
      status: "pass",
      reasonCode: "correlation_established",
      detail: {
        correlationId: "corr_1",
      },
    });
  });

  it("records router selection snapshots and unresolved skip reasons", () => {
    const trace = createSamanthaDispatchTraceScaffolding({
      organizationId: "org_1",
      channel: "webchat",
      shouldEmitConsoleTrace: false,
    });

    trace.recordSamanthaRouterSelectionStage(
      "router_lookup",
      "active_agent_lookup",
      {
        _id: "agent_1",
        name: "Samantha",
        subtype: "org_agent",
        customProperties: {
          templateRole: "one_of_one_lead_capture_consultant_template",
          runtimeModuleKey: SAMANTHA_AGENT_RUNTIME_MODULE_KEY,
        },
      },
    );
    trace.recordSamanthaRouterSelectionStage(
      "router_qa_override",
      "qa_target_agent_override",
      null,
    );

    expect(trace.samanthaDispatchRouterSelectionPath).toHaveLength(2);
    expect(trace.samanthaDispatchRouterSelectionPath[0]).toMatchObject({
      stage: "router_lookup",
      source: "active_agent_lookup",
      agentId: "agent_1",
      displayName: "Samantha",
      runtimeModuleKey: SAMANTHA_AGENT_RUNTIME_MODULE_KEY,
      isSamanthaRuntime: true,
    });
    expect(trace.samanthaDispatchRouterSelectionPath[1]).toMatchObject({
      stage: "router_qa_override",
      source: "qa_target_agent_override",
      agentId: null,
      displayName: null,
      runtimeModuleKey: null,
      isSamanthaRuntime: false,
    });

    expect(trace.samanthaDispatchTraceEvents).toHaveLength(2);
    expect(trace.samanthaDispatchTraceEvents[0]).toMatchObject({
      stage: "router_lookup",
      status: "pass",
      reasonCode: "active_agent_lookup",
      detail: {
        agentId: "agent_1",
        runtimeModuleKey: SAMANTHA_AGENT_RUNTIME_MODULE_KEY,
        isSamanthaRuntime: true,
      },
    });
    expect(trace.samanthaDispatchTraceEvents[1]).toMatchObject({
      stage: "router_qa_override",
      status: "skip",
      reasonCode: "qa_target_agent_override_unresolved",
      detail: {
        agentId: null,
        runtimeModuleKey: null,
        isSamanthaRuntime: false,
      },
    });
  });
});
