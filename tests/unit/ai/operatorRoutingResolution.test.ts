import { describe, expect, it } from "vitest";
import {
  detectPlatformManagedChannelBindingOverride,
  resolveActiveAgentForOrgCandidates,
} from "../../../convex/agentOntology";

type Candidate = {
  _id: string;
  status: string;
  subtype: string;
  customProperties?: Record<string, unknown>;
};

describe("operator routing resolution", () => {
  it("prefers the orchestrator candidate for desktop when no explicit route match exists", () => {
    const specialist: Candidate = {
      _id: "agent_a",
      status: "active",
      subtype: "sales_assistant",
    };
    const orchestrator: Candidate = {
      _id: "agent_b",
      status: "active",
      subtype: "general",
    };

    const resolved = resolveActiveAgentForOrgCandidates(
      [specialist, orchestrator],
      { channel: "desktop" }
    );

    expect(resolved?._id).toBe(orchestrator._id);
  });

  it("fails closed for desktop when only specialist candidates are available", () => {
    const specialist: Candidate = {
      _id: "agent_a",
      status: "active",
      subtype: "sales_assistant",
      customProperties: {
        channelBindings: [{ channel: "desktop", enabled: true }],
      },
    };

    const resolved = resolveActiveAgentForOrgCandidates([specialist], {
      channel: "desktop",
    });

    expect(resolved).toBeNull();
  });

  it("honors explicit route policy matches even on operator channels", () => {
    const specialist: Candidate = {
      _id: "agent_a",
      status: "active",
      subtype: "sales_assistant",
      customProperties: {
        channelRoutePolicies: [
          {
            channel: "desktop",
            peer: "desktop:user_1:conv_1",
            enabled: true,
          },
        ],
      },
    };
    const orchestrator: Candidate = {
      _id: "agent_b",
      status: "active",
      subtype: "general",
    };

    const resolved = resolveActiveAgentForOrgCandidates(
      [specialist, orchestrator],
      {
        channel: "desktop",
        routeSelectors: {
          channel: "desktop",
          peer: "desktop:user_1:conv_1",
        },
      }
    );

    expect(resolved?._id).toBe(specialist._id);
  });

  it("keeps non-operator channel fallback behavior unchanged", () => {
    const specialist: Candidate = {
      _id: "agent_a",
      status: "active",
      subtype: "sales_assistant",
    };
    const orchestrator: Candidate = {
      _id: "agent_b",
      status: "active",
      subtype: "general",
    };

    const resolved = resolveActiveAgentForOrgCandidates(
      [specialist, orchestrator],
      { channel: "webchat" }
    );

    expect(resolved?._id).toBe(specialist._id);
  });

  it("detects platform-managed channel binding overrides", () => {
    const hasOverride = detectPlatformManagedChannelBindingOverride(
      [
        { channel: "desktop", enabled: false },
        { channel: "webchat", enabled: true },
      ],
      [
        { channel: "desktop", enabled: true },
        { channel: "webchat", enabled: true },
      ],
    );

    expect(hasOverride).toBe(true);
  });

  it("ignores non platform-managed channel binding changes", () => {
    const hasOverride = detectPlatformManagedChannelBindingOverride(
      [
        { channel: "desktop", enabled: false },
        { channel: "webchat", enabled: false },
      ],
      [
        { channel: "desktop", enabled: false },
        { channel: "webchat", enabled: true },
      ],
    );

    expect(hasOverride).toBe(false);
  });
});
