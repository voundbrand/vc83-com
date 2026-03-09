import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const LAYER_WORKFLOW_ONTOLOGY_PATH = resolve(
  process.cwd(),
  "convex/layers/layerWorkflowOntology.ts",
);
const AI_CONVERSATIONS_PATH = resolve(process.cwd(), "convex/ai/conversations.ts");

describe("layered context workflow bundle contracts", () => {
  it("adds listWorkflowsForContextSwitcher with AI chat node metadata", () => {
    const source = readFileSync(LAYER_WORKFLOW_ONTOLOGY_PATH, "utf8");

    expect(source).toContain("export const listWorkflowsForContextSwitcher = query({");
    expect(source).toContain("hasAiChatNode");
    expect(source).toContain("aiChatPromptPreview");
    expect(source).toContain("activeConversationCount");
  });

  it("adds getLayeredContextBundle Tier 1/Tier 2 assembly query", () => {
    const source = readFileSync(LAYER_WORKFLOW_ONTOLOGY_PATH, "utf8");

    expect(source).toContain("export const getLayeredContextBundle = query({");
    expect(source).toContain("contractVersion: \"layered_context_bundle_v1\"");
    expect(source).toContain("tier1");
    expect(source).toContain("recentExecutions");
    expect(source).toContain("tier2");
    expect(source).toContain("connectedInputs");
    expect(source).toContain("connectedOutputs");
    expect(source).toContain("contextSnippets");
    expect(source).toContain("layerNodeExecutions");
  });

  it("aggregates active conversation counts through by_workflow index helper", () => {
    const source = readFileSync(AI_CONVERSATIONS_PATH, "utf8");

    expect(source).toContain("export const listActiveConversationCountsByWorkflow = internalQuery({");
    expect(source).toContain(".withIndex(\"by_workflow\"");
    expect(source).toContain("activeConversationCount");
  });
});
