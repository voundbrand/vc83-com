import { describe, expect, it } from "vitest";
import { resolveActiveTools } from "../../../convex/ai/toolScoping";

const ALL_TOOLS = [
  { name: "propose_soul_update" },
  { name: "review_own_soul", readOnly: true },
  { name: "view_pending_proposals", readOnly: true },
  { name: "query_org_data", readOnly: true },
];

describe("tool scoping for soul evolution tools", () => {
  it("includes soul evolution tools in the general profile for autonomous mode", () => {
    const active = resolveActiveTools({
      allTools: ALL_TOOLS,
      platformBlocked: [],
      orgEnabled: [],
      orgDisabled: [],
      connectedIntegrations: [],
      agentProfile: "general",
      agentEnabled: [],
      agentDisabled: [],
      autonomyLevel: "autonomous",
      sessionDisabled: [],
      channel: "whatsapp",
    });
    const names = active.map((tool) => tool.name);

    expect(names).toContain("propose_soul_update");
    expect(names).toContain("review_own_soul");
    expect(names).toContain("view_pending_proposals");
  });

  it("keeps read-only soul tools and removes proposal mutation in draft-only mode", () => {
    const active = resolveActiveTools({
      allTools: ALL_TOOLS,
      platformBlocked: [],
      orgEnabled: [],
      orgDisabled: [],
      connectedIntegrations: [],
      agentProfile: "general",
      agentEnabled: [],
      agentDisabled: [],
      autonomyLevel: "draft_only",
      sessionDisabled: [],
      channel: "whatsapp",
    });
    const names = active.map((tool) => tool.name);

    expect(names).not.toContain("propose_soul_update");
    expect(names).toContain("review_own_soul");
    expect(names).toContain("view_pending_proposals");
  });
});
