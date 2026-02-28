import { describe, expect, it } from "vitest";
import { resolveTeamHandoffRoutingDecision } from "../../../convex/ai/teamHarness";

describe("team access mode routing", () => {
  it("routes direct mode to the tagged specialist", () => {
    const decision = resolveTeamHandoffRoutingDecision({
      teamAccessMode: "direct",
      fromAgentId: "agent_primary",
      toAgentId: "agent_specialist",
      specialistContract: {
        soulBlendId: "blend:closer",
        directAccessEnabled: true,
        meetingParticipant: true,
        activationHints: [],
      },
    });

    expect(decision).toEqual({
      allowed: true,
      teamAccessMode: "direct",
      authorityAgentId: "agent_primary",
      activeAgentId: "agent_specialist",
    });
  });

  it("keeps the primary agent active in invisible mode", () => {
    const decision = resolveTeamHandoffRoutingDecision({
      teamAccessMode: "invisible",
      fromAgentId: "agent_primary",
      toAgentId: "agent_specialist",
    });

    expect(decision).toEqual({
      allowed: true,
      teamAccessMode: "invisible",
      authorityAgentId: "agent_primary",
      activeAgentId: "agent_primary",
    });
  });

  it("keeps the primary agent active in meeting mode", () => {
    const decision = resolveTeamHandoffRoutingDecision({
      teamAccessMode: "meeting",
      fromAgentId: "agent_primary",
      toAgentId: "agent_specialist",
      specialistContract: {
        soulBlendId: "blend:strategist",
        directAccessEnabled: true,
        meetingParticipant: true,
        activationHints: [],
      },
    });

    expect(decision).toEqual({
      allowed: true,
      teamAccessMode: "meeting",
      authorityAgentId: "agent_primary",
      activeAgentId: "agent_primary",
    });
  });

  it("keeps authority on the primary agent when direct mode speaker is a specialist", () => {
    const decision = resolveTeamHandoffRoutingDecision({
      teamAccessMode: "direct",
      fromAgentId: "agent_specialist_a",
      toAgentId: "agent_specialist_b",
      primaryAgentId: "agent_primary",
    });

    expect(decision.allowed).toBe(true);
    expect(decision.authorityAgentId).toBe("agent_primary");
    expect(decision.activeAgentId).toBe("agent_specialist_b");
  });

  it("blocks direct mode when catalog contract disables direct access", () => {
    const decision = resolveTeamHandoffRoutingDecision({
      teamAccessMode: "direct",
      fromAgentId: "agent_primary",
      toAgentId: "agent_specialist",
      specialistContract: {
        soulBlendId: "blend:operator",
        directAccessEnabled: false,
        meetingParticipant: true,
        activationHints: [],
      },
    });

    expect(decision.allowed).toBe(false);
    expect(decision.error).toContain("Direct specialist access is disabled");
  });

  it("blocks meeting mode when catalog contract disables meeting participation", () => {
    const decision = resolveTeamHandoffRoutingDecision({
      teamAccessMode: "meeting",
      fromAgentId: "agent_primary",
      toAgentId: "agent_specialist",
      specialistContract: {
        soulBlendId: "blend:coach",
        directAccessEnabled: true,
        meetingParticipant: false,
        activationHints: [],
      },
    });

    expect(decision.allowed).toBe(false);
    expect(decision.error).toContain("Meeting participation is disabled");
  });
});
