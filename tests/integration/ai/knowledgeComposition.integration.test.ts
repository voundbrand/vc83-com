import { describe, expect, it } from "vitest";
import { buildAgentSystemPrompt } from "../../../convex/ai/agentExecution";
import { composeKnowledgeContract } from "../../../convex/ai/systemKnowledge";

describe("knowledge composition integration", () => {
  it("injects precomputed composed knowledge into agent prompt", () => {
    const composed = composeKnowledgeContract("customer");

    const prompt = buildAgentSystemPrompt(
      {
        displayName: "Ops Agent",
        autonomyLevel: "autonomous",
      },
      [],
      undefined,
      undefined,
      undefined,
      undefined,
      composed,
    );

    const firstDocSnippet = composed.documents[0]?.content
      .split("\n")
      .find((line) => line.trim().length > 20);

    expect(prompt).toContain("=== SYSTEM KNOWLEDGE ===");
    expect(firstDocSnippet).toBeDefined();
    expect(prompt).toContain(firstDocSnippet!);
  });

  it("keeps telemetry aligned with composed setup documents", () => {
    const composed = composeKnowledgeContract("setup");

    expect(composed.telemetry.mode).toBe("setup");
    expect(composed.telemetry.documentCount).toBe(composed.documents.length);
    expect(composed.telemetry.totalBytes).toBeGreaterThan(0);
  });
});
