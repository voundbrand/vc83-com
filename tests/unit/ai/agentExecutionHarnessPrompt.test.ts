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
        unifiedPersonality: true,
        teamAccessMode: "invisible",
        dreamTeamSpecialists: [
          {
            soulBlendId: "blend:strategist",
            specialistSubtype: "general",
            directAccessEnabled: true,
            meetingParticipant: true,
          },
        ],
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
    expect(prompt).toContain("Unified personality enabled");
    expect(prompt).toContain("specialist access mode is `invisible`");
    expect(prompt).toContain("Dream Team catalog contract loaded (1 specialist entries");
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

  it("surfaces mode/archetype overlays and sensitive guardrails in harness context", () => {
    const harnessContext = buildHarnessContext(
      {
        displayName: "Private Coach",
        autonomyLevel: "autonomous",
        activeSoulMode: "private",
        activeArchetype: "life_coach",
      },
      ["search_contacts"],
      {
        messageCount: 2,
        channel: "telegram_private",
        hasCrmContact: false,
      },
    );

    expect(harnessContext).toContain("**Soul mode:** private");
    expect(harnessContext).toContain("**Active archetype:** The Life Coach");
    expect(harnessContext).toContain("Identity invariant");
    expect(harnessContext).toContain("Sensitive archetype runtime guardrails active");
  });

  it("renders personal-workspace cross-org read-only enrichment context", () => {
    const harnessContext = buildHarnessContext(
      {
        displayName: "Personal Operator",
        autonomyLevel: "supervised",
      },
      ["list_team_agents"],
      {
        messageCount: 1,
        channel: "desktop",
        hasCrmContact: false,
      },
      undefined,
      undefined,
      { name: "Alex Personal", slug: "alex", planTier: "free" },
      undefined,
      [
        {
          organizationName: "Acme Agency",
          roleName: "org_owner",
          workspaceType: "business",
          primaryAgentName: "Acme Operator",
          primaryAgentSubtype: "general",
          dreamTeamContractCount: 6,
        },
      ],
    );

    expect(harnessContext).toContain("Cross-org read-only soul enrichment active");
    expect(harnessContext).toContain("explicit personal-workspace opt-in is enabled");
    expect(harnessContext).toContain("Acme Agency");
    expect(harnessContext).toContain("Dream Team contracts 6");
    expect(harnessContext).toContain("Never perform cross-org writes");
  });

  it("renders autonomy domain defaults and trust progression guidance", () => {
    const harnessContext = buildHarnessContext(
      {
        displayName: "Ops Controller",
        autonomyLevel: "autonomous",
        domainAutonomy: {
          appointment_booking: {
            level: "live",
            promotedAt: 1_739_900_000_000,
            promotedBy: "ops_lead",
          },
        },
        autonomyTrust: {
          trustScore: 0.94,
          signalCount: 35,
          successfulActionCount: 44,
          policyViolationCount: 0,
          recentFailureCount: 0,
          delegationOptIn: true,
        },
      },
      [],
      {
        messageCount: 1,
        channel: "webchat",
        hasCrmContact: false,
      },
    );

    expect(harnessContext).toContain("**Domain autonomy:** appointment_booking defaults to `live`");
    expect(harnessContext).toContain("**Trust progression:** promote autonomous -> delegation");
  });

  it("renders privacy and quality firewall guardrails in harness context", () => {
    const harnessContext = buildHarnessContext(
      {
        displayName: "Private Operator",
        autonomyLevel: "supervised",
        modelId: "local/phi-4-mini",
        modelProvider: "openai_compatible",
        privacyMode: "local_only",
        qualityTierFloor: "silver",
        localModelIds: ["local/phi-4-mini", "local/qwen2.5"],
        localConnection: {
          connectorId: "ollama",
          status: "connected",
          modelIds: ["local/phi-4-mini", "local/qwen2.5"],
          capabilityLimits: {
            tools: false,
            vision: false,
            audio_in: false,
            audio_out: false,
            json: true,
            networkEgress: "blocked",
          },
        },
        selectedModelQualityTier: "bronze",
        selectedRouteIsLocal: true,
        selectedPolicyGuardrail:
          "Privacy mode local-only blocks cloud model routes.",
        selectedModelDriftWarning:
          "Model switch may reduce response quality consistency.",
      },
      [],
      {
        messageCount: 1,
        channel: "desktop",
        hasCrmContact: false,
      },
    );

    expect(harnessContext).toContain("**Privacy mode:** local_only.");
    expect(harnessContext).toContain("**Quality firewall floor:** silver.");
    expect(harnessContext).toContain("network_egress=blocked");
    expect(harnessContext).toContain("Selected route quality tier: bronze.");
    expect(harnessContext).toContain("Selected route locality: local.");
    expect(harnessContext).toContain("Active privacy safeguard");
    expect(harnessContext).toContain("Active drift safeguard");
  });
});
