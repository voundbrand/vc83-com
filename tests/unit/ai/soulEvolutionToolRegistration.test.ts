import { describe, expect, it } from "vitest";
import { TOOL_REGISTRY, getToolSchemas } from "../../../convex/ai/tools/registry";

describe("soul evolution tool registration", () => {
  it("registers soul-evolution tools in the central tool registry", () => {
    expect(TOOL_REGISTRY.propose_soul_update).toBeDefined();
    expect(TOOL_REGISTRY.review_own_soul).toBeDefined();
    expect(TOOL_REGISTRY.view_pending_proposals).toBeDefined();

    expect(TOOL_REGISTRY.review_own_soul.readOnly).toBe(true);
    expect(TOOL_REGISTRY.view_pending_proposals.readOnly).toBe(true);
    expect(TOOL_REGISTRY.propose_soul_update.readOnly).not.toBe(true);
  });

  it("exposes soul-evolution tools through OpenAI tool schema output", () => {
    const names = getToolSchemas().map((tool) => tool.function.name);
    expect(names).toContain("propose_soul_update");
    expect(names).toContain("review_own_soul");
    expect(names).toContain("view_pending_proposals");
  });
});
