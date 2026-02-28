import { describe, expect, it } from "vitest";
import { resolveTeamSpecialistSelection } from "../../../convex/ai/tools/teamTools";

describe("resolveTeamSpecialistSelection", () => {
  it("uses Dream Team contract specialistId when subtype has multiple active agents", () => {
    const selection = resolveTeamSpecialistSelection({
      requestedSpecialistType: "customer_support",
      activeAgents: [
        { _id: "agent_primary", subtype: "general" },
        { _id: "agent_cs_1", subtype: "customer_support" },
        { _id: "agent_cs_2", subtype: "customer_support" },
      ],
      authorityAgentId: "agent_primary",
      dreamTeamSpecialists: [
        {
          soulBlendId: "blend:care",
          specialistSubtype: "customer_support",
          specialistId: "agent_cs_2",
          directAccessEnabled: true,
          meetingParticipant: true,
          activationHints: [],
        },
      ],
    });

    expect(selection.error).toBeUndefined();
    expect(selection.targetAgent?._id).toBe("agent_cs_2");
    expect(selection.provenance?.selectionStrategy).toBe("contract");
    expect(selection.provenance?.matchedBy).toBe("specialist_id");
  });

  it("blocks handoff when requested subtype is not in Dream Team contract catalog", () => {
    const selection = resolveTeamSpecialistSelection({
      requestedSpecialistType: "booking_agent",
      activeAgents: [
        { _id: "agent_primary", subtype: "general" },
        { _id: "agent_booking", subtype: "booking_agent" },
      ],
      authorityAgentId: "agent_primary",
      dreamTeamSpecialists: [
        {
          soulBlendId: "blend:care",
          specialistSubtype: "customer_support",
          specialistId: "agent_cs_2",
          directAccessEnabled: true,
          meetingParticipant: true,
          activationHints: [],
        },
      ],
    });

    expect(selection.targetAgent).toBeUndefined();
    expect(selection.error).toContain("No Dream Team specialist contract");
  });

  it("blocks scoped specialist handoff when contract is out of workspace scope", () => {
    const selection = resolveTeamSpecialistSelection({
      requestedSpecialistType: "sales_assistant",
      activeAgents: [
        { _id: "agent_primary", subtype: "general" },
        { _id: "agent_sales", subtype: "sales_assistant" },
      ],
      authorityAgentId: "agent_primary",
      workspaceType: "personal",
      dreamTeamSpecialists: [
        {
          soulBlendId: "blend:sales",
          specialistSubtype: "sales_assistant",
          specialistId: "agent_sales",
          directAccessEnabled: true,
          meetingParticipant: true,
          activationHints: [],
          workspaceTypes: ["business"],
        },
      ],
    });

    expect(selection.targetAgent).toBeUndefined();
    expect(selection.error).toContain("out of scope for personal workspace");
  });

  it("blocks subtype-only fallback when multiple active subtype matches exist", () => {
    const selection = resolveTeamSpecialistSelection({
      requestedSpecialistType: "sales_assistant",
      activeAgents: [
        { _id: "agent_primary", subtype: "general" },
        { _id: "agent_sales_1", subtype: "sales_assistant" },
        { _id: "agent_sales_2", subtype: "sales_assistant" },
      ],
      authorityAgentId: "agent_primary",
      dreamTeamSpecialists: [],
    });

    expect(selection.targetAgent).toBeUndefined();
    expect(selection.error).toContain("Multiple active sales_assistant agents found");
  });

  it("keeps deterministic subtype fallback when there is exactly one active match", () => {
    const selection = resolveTeamSpecialistSelection({
      requestedSpecialistType: "sales_assistant",
      activeAgents: [
        { _id: "agent_primary", subtype: "general" },
        { _id: "agent_sales", subtype: "sales_assistant" },
      ],
      authorityAgentId: "agent_primary",
      dreamTeamSpecialists: [],
    });

    expect(selection.error).toBeUndefined();
    expect(selection.targetAgent?._id).toBe("agent_sales");
    expect(selection.provenance?.selectionStrategy).toBe("fallback_subtype");
    expect(selection.provenance?.matchedBy).toBe("fallback_subtype");
  });
});
