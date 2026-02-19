import { describe, expect, it } from "vitest";
import { resolveActiveAgentForOrgCandidates } from "../../../convex/agentOntology";

type Candidate = {
  _id: string;
  status: string;
  subtype: string;
  customProperties?: Record<string, unknown>;
};

describe("resolveActiveAgentForOrgCandidates", () => {
  it("returns the active agent matching requested subtype", () => {
    const selected = resolveActiveAgentForOrgCandidates<Candidate>(
      [
        { _id: "sales_1", status: "active", subtype: "sales_assistant" },
        { _id: "pm_1", status: "active", subtype: "pm" },
      ],
      { subtype: "pm" }
    );

    expect(selected?._id).toBe("pm_1");
  });

  it("returns null when requested subtype has no active match", () => {
    const selected = resolveActiveAgentForOrgCandidates<Candidate>(
      [
        { _id: "sales_1", status: "active", subtype: "sales_assistant" },
        { _id: "pm_1", status: "paused", subtype: "pm" },
      ],
      { subtype: "pm" }
    );

    expect(selected).toBeNull();
  });

  it("prefers channel-enabled agent within subtype candidates", () => {
    const selected = resolveActiveAgentForOrgCandidates<Candidate>(
      [
        {
          _id: "pm_default",
          status: "active",
          subtype: "pm",
          customProperties: {
            channelBindings: [{ channel: "webchat", enabled: false }],
          },
        },
        {
          _id: "pm_bound",
          status: "active",
          subtype: "pm",
          customProperties: {
            channelBindings: [{ channel: "webchat", enabled: true }],
          },
        },
      ],
      { subtype: "pm", channel: "webchat" }
    );

    expect(selected?._id).toBe("pm_bound");
  });

  it("does not route to another subtype when subtype is requested with channel", () => {
    const selected = resolveActiveAgentForOrgCandidates<Candidate>(
      [
        {
          _id: "pm_unbound",
          status: "active",
          subtype: "pm",
          customProperties: {
            channelBindings: [{ channel: "webchat", enabled: false }],
          },
        },
        {
          _id: "general_bound",
          status: "active",
          subtype: "general",
          customProperties: {
            channelBindings: [{ channel: "webchat", enabled: true }],
          },
        },
      ],
      { subtype: "pm", channel: "webchat" }
    );

    expect(selected?._id).toBe("pm_unbound");
  });

  it("keeps first-active fallback when subtype is not requested", () => {
    const selected = resolveActiveAgentForOrgCandidates<Candidate>(
      [
        { _id: "general_1", status: "active", subtype: "general" },
        { _id: "pm_1", status: "active", subtype: "pm" },
      ],
      {}
    );

    expect(selected?._id).toBe("general_1");
  });

  it("allows native_guest routing to reuse webchat bindings", () => {
    const selected = resolveActiveAgentForOrgCandidates<Candidate>(
      [
        {
          _id: "webchat_pm",
          status: "active",
          subtype: "pm",
          customProperties: {
            channelBindings: [{ channel: "webchat", enabled: true }],
          },
        },
      ],
      { subtype: "pm", channel: "native_guest" }
    );

    expect(selected?._id).toBe("webchat_pm");
  });

  it("prefers deterministic route-policy matches before channel fallback", () => {
    const selected = resolveActiveAgentForOrgCandidates<Candidate>(
      [
        {
          _id: "general_default",
          status: "active",
          subtype: "general",
          customProperties: {
            channelBindings: [{ channel: "slack", enabled: true }],
          },
        },
        {
          _id: "general_team_router",
          status: "active",
          subtype: "general",
          customProperties: {
            channelBindings: [{ channel: "slack", enabled: true }],
            channelRoutePolicies: [
              {
                id: "team-route",
                channel: "slack",
                team: "T123",
                channelRef: "C123",
                priority: 10,
              },
            ],
          },
        },
      ],
      {
        channel: "slack",
        routeSelectors: {
          channel: "slack",
          team: "T123",
          channelRef: "C123",
        },
      }
    );

    expect(selected?._id).toBe("general_team_router");
  });

  it("uses deterministic tie-breakers for equally specific route policies", () => {
    const selected = resolveActiveAgentForOrgCandidates<Candidate>(
      [
        {
          _id: "agent_b",
          status: "active",
          subtype: "general",
          customProperties: {
            channelRoutePolicies: [{ id: "b", team: "T123", priority: 20 }],
          },
        },
        {
          _id: "agent_a",
          status: "active",
          subtype: "general",
          customProperties: {
            channelRoutePolicies: [{ id: "a", team: "T123", priority: 10 }],
          },
        },
      ],
      {
        channel: "slack",
        routeSelectors: { team: "T123" },
      }
    );

    expect(selected?._id).toBe("agent_a");
  });
});
