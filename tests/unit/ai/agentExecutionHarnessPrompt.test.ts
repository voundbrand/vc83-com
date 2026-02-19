import { describe, expect, it } from "vitest";
import { buildAgentSystemPrompt } from "../../../convex/ai/agentExecution";
import { buildHarnessContext, determineAgentLayer } from "../../../convex/ai/harness";

describe("agent execution harness wiring", () => {
  it("injects harness context with resolved layer metadata into system prompt", () => {
    const layer = determineAgentLayer(
      { _id: "org_client", parentOrganizationId: "org_parent" },
      "pm",
      false,
    );

    const harnessContext = buildHarnessContext(
      {
        displayName: "Operations PM",
        autonomyLevel: "autonomous",
        modelProvider: "openrouter",
        modelId: "anthropic/claude-sonnet-4.5",
      },
      ["list_team_agents", "tag_in_specialist"],
      {
        messageCount: 8,
        channel: "whatsapp",
        hasCrmContact: true,
        startedAt: 1_700_000_000_000,
        lastMessageAt: 1_700_000_600_000,
      },
      [
        { _id: "agent_pm", name: "PM", subtype: "pm", customProperties: { displayName: "PM" } },
        {
          _id: "agent_sales",
          name: "Sales Specialist",
          subtype: "sales_assistant",
          customProperties: { displayName: "Sales Specialist" },
        },
      ],
      "agent_pm",
      { name: "Client Org", slug: "client-org", planTier: "agency" },
      {
        layer,
        parentOrgName: "Parent Agency",
        parentOrgPlanTier: "enterprise",
        testingMode: false,
      },
    );

    const prompt = buildAgentSystemPrompt(
      { displayName: "Operations PM", autonomyLevel: "autonomous" },
      [],
      undefined,
      undefined,
      undefined,
      undefined,
      harnessContext,
    );

    expect(prompt).toContain("=== YOUR HARNESS (Self-Awareness) ===");
    expect(prompt).toContain("**Layer:** 3 of 4");
    expect(prompt).toContain("**Layer name:** Client");
    expect(prompt).toContain("**Available tools (2):**");
    expect(prompt).toContain("- list_team_agents");
    expect(prompt).toContain("- tag_in_specialist");
  });

  it("keeps harness block before handoff instructions in prompt assembly", () => {
    const prompt = buildAgentSystemPrompt(
      { displayName: "Specialist", autonomyLevel: "autonomous" },
      [],
      undefined,
      undefined,
      undefined,
      {
        sharedContext: "Customer needs checkout setup help",
        lastHandoff: {
          fromAgent: "PM",
          reason: "Checkout support escalation",
          contextSummary: "User asked for Stripe setup guidance",
        },
      },
      "=== YOUR HARNESS (Self-Awareness) ===\nHarness marker\n=== END HARNESS ===",
    );

    const harnessIndex = prompt.indexOf("Harness marker");
    const handoffIndex = prompt.indexOf("--- TEAM HANDOFF ---");
    expect(harnessIndex).toBeGreaterThan(-1);
    expect(handoffIndex).toBeGreaterThan(-1);
    expect(harnessIndex).toBeLessThan(handoffIndex);
  });
});
