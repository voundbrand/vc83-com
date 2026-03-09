import { describe, expect, it } from "vitest";
import { buildLayeredContextSystemPrompt } from "../../../convex/ai/prompts/layeredContextSystem";
import type { LayeredContextBundle } from "../../../convex/layers/types";

function makeBundle(overrides?: Partial<LayeredContextBundle>): LayeredContextBundle {
  return {
    contractVersion: "layered_context_bundle_v1",
    tier1: {
      workflow: {
        workflowId: "wf_123" as never,
        workflowName: "Client Intake Workflow",
        workflowStatus: "active",
        workflowUpdatedAt: 1700000000000,
        nodeCount: 6,
        edgeCount: 7,
        workflowMode: "live",
      },
      recentExecutions: [
        {
          executionId: "exec_1" as never,
          status: "completed",
          startedAt: 1700000000001,
          completedAt: 1700000001001,
          triggerNodeId: "trigger_a",
          summary: "3 succeeded, 0 failed",
        },
      ],
    },
    tier2: {
      aiChatNodeId: "lc_chat_1",
      aiChatPrompt: "Use warm and concise tone.",
      aiChatModel: "gpt-5-mini",
      connectedInputs: [
        {
          nodeId: "n_in_1",
          nodeType: "trigger_form_submitted",
          nodeLabel: "Form Trigger",
          description: "Collects lead payload",
        },
      ],
      connectedOutputs: [
        {
          nodeId: "n_out_1",
          nodeType: "lc_crm",
          nodeLabel: "CRM Update",
          description: "Upserts contact record",
        },
      ],
    },
    ...overrides,
  };
}

describe("layered context prompt builder", () => {
  it("formats Tier 1 and Tier 2 sections with deterministic action contract", () => {
    const prompt = buildLayeredContextSystemPrompt(makeBundle());

    expect(prompt).toContain("[LAYERED_CONTEXT_SYSTEM_V1]");
    expect(prompt).toContain("## TIER 1 (Workflow Summary)");
    expect(prompt).toContain("workflowName: Client Intake Workflow");
    expect(prompt).toContain("## TIER 2 (AI Chat Node Enrichment)");
    expect(prompt).toContain("aiChatNodeId: lc_chat_1");
    expect(prompt).toContain("n_in_1: trigger_form_submitted (Form Trigger) - Collects lead payload");
    expect(prompt).toContain("n_out_1: lc_crm (CRM Update) - Upserts contact record");
    expect(prompt).toContain("\"kind\":\"layered_context_action_proposal\"");
    expect(prompt).toContain("All layered context actions require explicit human approval");
  });

  it("handles missing Tier 2 by emitting explicit absence marker", () => {
    const bundle = makeBundle();
    const prompt = buildLayeredContextSystemPrompt({ ...bundle, tier2: undefined });

    expect(prompt).toContain("## TIER 2 (AI Chat Node Enrichment)");
    expect(prompt).toContain("not available (workflow has no lc_ai_chat node)");
  });

  it("handles empty recent executions and connected surfaces deterministically", () => {
    const bundle = makeBundle({
      tier1: {
        ...makeBundle().tier1,
        recentExecutions: [],
      },
      tier2: {
        ...makeBundle().tier2!,
        connectedInputs: [],
        connectedOutputs: [],
      },
    });

    const prompt = buildLayeredContextSystemPrompt(bundle);
    expect(prompt).toContain("- recentExecutions:\n- none");
    expect(prompt).toContain("- connectedInputs:\n- none");
    expect(prompt).toContain("- connectedOutputs:\n- none");
  });
});
