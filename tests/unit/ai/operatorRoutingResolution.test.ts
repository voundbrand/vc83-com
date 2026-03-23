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

  it("keeps desktop authority on the orchestrator even when only a specialist is channel-bound", () => {
    const specialist: Candidate = {
      _id: "agent_a",
      status: "active",
      subtype: "sales_assistant",
      customProperties: {
        channelBindings: [{ channel: "desktop", enabled: true }],
      },
    };
    const orchestrator: Candidate = {
      _id: "agent_b",
      status: "active",
      subtype: "general",
      customProperties: {
        channelBindings: [{ channel: "webchat", enabled: true }],
      },
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

  it("routes phone_call to external customer-facing agents only", () => {
    const internalAgent: Candidate = {
      _id: "agent_a",
      status: "active",
      subtype: "general",
      customProperties: {
        agentClass: "internal_operator",
      },
    };
    const externalAgent: Candidate = {
      _id: "agent_b",
      status: "active",
      subtype: "general",
      customProperties: {
        agentClass: "external_customer_facing",
      },
    };

    const resolved = resolveActiveAgentForOrgCandidates(
      [internalAgent, externalAgent],
      { channel: "phone_call" }
    );

    expect(resolved?._id).toBe(externalAgent._id);
  });

  it("fails closed for phone_call when no external-class agent exists", () => {
    const internalAgent: Candidate = {
      _id: "agent_a",
      status: "active",
      subtype: "general",
      customProperties: {
        agentClass: "internal_operator",
      },
    };

    const resolved = resolveActiveAgentForOrgCandidates(
      [internalAgent],
      { channel: "phone_call" }
    );

    expect(resolved).toBeNull();
  });

  it("fails closed for desktop when only external-class agent exists", () => {
    const externalAgent: Candidate = {
      _id: "agent_a",
      status: "active",
      subtype: "general",
      customProperties: {
        agentClass: "external_customer_facing",
      },
    };

    const resolved = resolveActiveAgentForOrgCandidates(
      [externalAgent],
      { channel: "desktop" }
    );

    expect(resolved).toBeNull();
  });

  it("keeps desktop authority on the strict default operator when PM and customer_service specialists coexist", () => {
    const operator: Candidate = {
      _id: "agent_operator",
      status: "active",
      subtype: "general",
      customProperties: {
        agentClass: "internal_operator",
        isPrimary: true,
        channelBindings: [{ channel: "desktop", enabled: true }],
      },
    };
    const pmSpecialist: Candidate = {
      _id: "agent_pm",
      status: "active",
      subtype: "pm",
      customProperties: {
        agentClass: "internal_operator",
        channelBindings: [{ channel: "desktop", enabled: false }],
      },
    };
    const customerService: Candidate = {
      _id: "agent_customer",
      status: "active",
      subtype: "customer_service",
      customProperties: {
        agentClass: "external_customer_facing",
        channelBindings: [{ channel: "telegram", enabled: true }],
      },
    };

    const resolved = resolveActiveAgentForOrgCandidates(
      [customerService, pmSpecialist, operator],
      { channel: "desktop" }
    );

    expect(resolved?._id).toBe(operator._id);
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
