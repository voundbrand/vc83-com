import { describe, expect, it } from "vitest";
import {
  composeKnowledgeContract,
  getKnowledgeContent,
} from "../../../convex/ai/systemKnowledge";

describe("system knowledge composition contract", () => {
  it("returns a typed composition bundle with telemetry", () => {
    const bundle = composeKnowledgeContract("customer");

    expect(bundle.mode).toBe("customer");
    expect(bundle.documents.length).toBeGreaterThan(0);
    expect(bundle.telemetry.documentCount).toBe(bundle.documents.length);
    expect(bundle.telemetry.totalBytes).toBeGreaterThan(0);
    expect(bundle.telemetry.documentIds).toEqual(
      bundle.documents.map((doc) => doc.id)
    );
  });

  it("preserves getKnowledgeContent projection for legacy callers", () => {
    const bundle = composeKnowledgeContract("setup");
    const legacy = getKnowledgeContent("setup");

    expect(legacy).toEqual(
      bundle.documents.map(({ id, name, content }) => ({
        id,
        name,
        content,
      }))
    );
  });

  it("adds trigger-only knowledge and records matched triggers", () => {
    const bundle = composeKnowledgeContract("builder", ["lead_generation"]);

    expect(bundle.documents.some((doc) => doc.id === "skill-lead-generation")).toBe(
      true
    );
    expect(bundle.telemetry.requestedTriggers).toEqual(["lead_generation"]);
    expect(bundle.telemetry.matchedTriggers).toContain("lead_generation");
  });

  it("loads support troubleshooting and billing docs for support triggers", () => {
    const bundle = composeKnowledgeContract("customer", [
      "support_runtime",
      "support_billing",
    ]);

    const ids = bundle.documents.map((doc) => doc.id);
    expect(ids).toContain("support-troubleshooting-playbook");
    expect(ids).toContain("support-pricing-billing-reference");
    expect(bundle.telemetry.requestedTriggers).toEqual([
      "support_runtime",
      "support_billing",
    ]);
    expect(bundle.telemetry.matchedTriggers).toContain("support_runtime");
    expect(bundle.telemetry.matchedTriggers).toContain("support_billing");
  });

  it("loads agent recommender playbook for agent-selection triggers", () => {
    const bundle = composeKnowledgeContract("customer", ["agent_selection"]);
    const ids = bundle.documents.map((doc) => doc.id);

    expect(ids).toContain("support-agent-selection-recommender");
    expect(bundle.telemetry.matchedTriggers).toContain("agent_selection");
  });
});
