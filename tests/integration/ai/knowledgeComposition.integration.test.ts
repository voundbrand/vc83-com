import { describe, expect, it } from "vitest";
import { buildAgentSystemPrompt } from "../../../convex/ai/kernel/agentExecution";
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

  it("hydrates support-specific docs when support triggers are requested", () => {
    const composed = composeKnowledgeContract("customer", [
      "support_runtime",
      "support_billing",
    ]);

    const prompt = buildAgentSystemPrompt(
      {
        displayName: "Support Agent",
        autonomyLevel: "autonomous",
      },
      [],
      undefined,
      undefined,
      undefined,
      undefined,
      composed,
    );

    expect(composed.documents.some((doc) => doc.id === "support-troubleshooting-playbook")).toBe(true);
    expect(composed.documents.some((doc) => doc.id === "support-pricing-billing-reference")).toBe(true);
    expect(prompt).toContain("Support Troubleshooting Playbook");
    expect(prompt).toContain("Support Pricing and Billing Reference");
  });
});
