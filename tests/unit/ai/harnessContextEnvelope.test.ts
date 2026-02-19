import { describe, expect, it } from "vitest";
import {
  buildHarnessContextEnvelope,
  normalizeHarnessContextEnvelope,
} from "../../../convex/ai/harnessContextEnvelope";

describe("harness context envelope contract", () => {
  it("builds a canonical approval envelope with layer/tools/handoff edge", () => {
    const envelope = buildHarnessContextEnvelope({
      source: "approval",
      organization: {
        _id: "org_child",
        slug: "client-org",
        parentOrganizationId: "org_parent",
      },
      agentSubtype: "pm",
      toolsUsed: [" send_file ", "send_file", "override_draft"],
      teamSession: {
        handoffHistory: [
          {
            fromAgentId: "agent_old",
            toAgentId: "agent_mid",
            reason: "first handoff",
            timestamp: 10,
          },
          {
            fromAgentId: "agent_mid",
            toAgentId: "agent_new",
            reason: "latest handoff",
            summary: "handoff summary",
            goal: "unblock operator",
            timestamp: 20,
          },
        ],
      },
    });

    expect(envelope.source).toBe("approval");
    expect(envelope.layer).toEqual({ index: 3, name: "Client" });
    expect(envelope.toolsUsed).toEqual(["send_file", "override_draft"]);
    expect(envelope.handoffEdge).toEqual({
      fromAgentId: "agent_mid",
      toAgentId: "agent_new",
      reason: "latest handoff",
      summary: "handoff summary",
      goal: "unblock operator",
      timestamp: 20,
    });
  });

  it("normalizes persisted payloads and applies safe defaults", () => {
    const normalized = normalizeHarnessContextEnvelope({
      source: "escalation",
      layer: { index: 4, name: "  " },
      toolsUsed: ["tool_a", "tool_a", "", 1],
      handoffEdge: {
        fromAgentId: "agent_a",
        toAgentId: "agent_b",
        reason: "handoff",
        contextSummary: "legacy summary",
        timestamp: 123,
      },
    });

    expect(normalized).toEqual({
      source: "escalation",
      layer: { index: 4, name: "End-Customer" },
      toolsUsed: ["tool_a"],
      handoffEdge: {
        fromAgentId: "agent_a",
        toAgentId: "agent_b",
        reason: "handoff",
        summary: "legacy summary",
        timestamp: 123,
      },
    });
  });

  it("rejects malformed envelopes", () => {
    expect(normalizeHarnessContextEnvelope(null)).toBeNull();
    expect(
      normalizeHarnessContextEnvelope({
        source: "approval",
        layer: { index: 9, name: "invalid" },
      }),
    ).toBeNull();
    expect(
      normalizeHarnessContextEnvelope({
        source: "invalid",
        layer: { index: 2, name: "Agency" },
      }),
    ).toBeNull();
  });
});

