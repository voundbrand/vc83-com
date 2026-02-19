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
});
