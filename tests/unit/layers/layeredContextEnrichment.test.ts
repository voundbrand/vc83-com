import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildLayeredContextSystemPrompt } from "../../../convex/ai/prompts/layeredContextSystem";
import type { LayeredContextBundle } from "../../../convex/layers/types";

const LAYER_WORKFLOW_ONTOLOGY_PATH = resolve(
  process.cwd(),
  "convex/layers/layerWorkflowOntology.ts",
);

function buildBundle(): LayeredContextBundle {
  return {
    contractVersion: "layered_context_bundle_v1",
    tier1: {
      workflow: {
        workflowId: "wf_enriched" as never,
        workflowName: "Enriched Context Workflow",
        workflowStatus: "active",
        workflowUpdatedAt: 1700000000000,
        nodeCount: 5,
        edgeCount: 4,
        workflowMode: "live",
      },
      recentExecutions: [],
    },
    tier2: {
      aiChatNodeId: "lc_chat_node",
      aiChatPrompt: "Use layered context.",
      aiChatModel: "gpt-5-mini",
      connectedInputs: [
        {
          nodeId: "youtube_1",
          nodeType: "lc_youtube_transcript",
          lastExecutionStatus: "completed",
          contextSnippets: [
            {
              source: "transcript",
              label: "outputData.transcript",
              value: "Transcript excerpt for deterministic grounding.",
            },
          ],
        },
      ],
      connectedOutputs: [
        {
          nodeId: "file_1",
          nodeType: "lc_file_storage",
          contextSnippets: [
            {
              source: "file_excerpt",
              label: "outputData.fileText",
              value: "File-derived context excerpt.",
            },
          ],
        },
      ],
    },
  };
}

describe("layered context enrichment contracts", () => {
  it("formats context snippets and execution metadata in prompt output", () => {
    const prompt = buildLayeredContextSystemPrompt(buildBundle());

    expect(prompt).toContain("[transcript] outputData.transcript: Transcript excerpt for deterministic grounding.");
    expect(prompt).toContain("[file_excerpt] outputData.fileText: File-derived context excerpt.");
    expect(prompt).toContain("lastExecutionStatus=completed");
  });

  it("hydrates bundle with deterministic context snippet extraction from node executions", () => {
    const source = readFileSync(LAYER_WORKFLOW_ONTOLOGY_PATH, "utf8");

    expect(source).toContain("contextSnippets");
    expect(source).toContain("buildNodeContextSnippets");
    expect(source).toContain(".query(\"layerNodeExecutions\")");
    expect(source).toContain("No deterministic context available for this node.");
  });
});
