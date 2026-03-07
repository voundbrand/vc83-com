import { describe, expect, it } from "vitest";

import { __test } from "../../../convex/ai/postCaptureDispatcher";

function buildConnection(overrides?: Record<string, unknown>): Record<string, unknown> {
  return {
    _id: "conn_1",
    providerAccountId: "team_1",
    providerProfileType: "organization",
    customProperties: {
      providerRouteKey: "slack:team_1",
    },
    ...overrides,
  };
}

describe("postCaptureDispatcher slack routing", () => {
  it("fails closed when channel ID is missing", () => {
    const result = __test.resolveSlackRoutingIdentityFromActiveConnections({
      routingInput: {},
      activeConnections: [buildConnection()],
      requireExplicitWorkspaceIdentity: true,
    });

    expect(result).toEqual({
      ok: false,
      reasonCode: "slack_routing_missing_channel",
      error: "Slack routing channelId is required",
    });
  });

  it("fails closed in production when workspace identity hints are omitted", () => {
    const result = __test.resolveSlackRoutingIdentityFromActiveConnections({
      routingInput: {
        channelId: "C123",
      },
      activeConnections: [buildConnection()],
      requireExplicitWorkspaceIdentity: true,
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.reasonCode).toBe("slack_routing_missing_workspace_identity");
  });

  it("rejects ambiguous routing when identity hints are absent in non-production", () => {
    const result = __test.resolveSlackRoutingIdentityFromActiveConnections({
      routingInput: {
        channelId: "C123",
      },
      activeConnections: [
        buildConnection({ _id: "conn_1", providerAccountId: "team_1" }),
        buildConnection({ _id: "conn_2", providerAccountId: "team_2" }),
      ],
      requireExplicitWorkspaceIdentity: false,
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.reasonCode).toBe("slack_routing_ambiguous_workspace_identity");
  });

  it("resolves to a single explicit organization-scoped OAuth connection", () => {
    const result = __test.resolveSlackRoutingIdentityFromActiveConnections({
      routingInput: {
        channelId: "C123",
        providerConnectionId: "conn_1",
      },
      activeConnections: [
        buildConnection({
          _id: "conn_1",
          providerAccountId: "team_1",
          customProperties: { providerRouteKey: "slack:team_1" },
        }),
        buildConnection({
          _id: "conn_2",
          providerAccountId: "team_2",
          customProperties: { providerRouteKey: "slack:team_2" },
        }),
      ],
      requireExplicitWorkspaceIdentity: true,
    });

    expect(result).toEqual({
      ok: true,
      providerConnectionId: "conn_1",
      providerAccountId: "team_1",
      routeKey: "slack:team_1",
      channelId: "C123",
    });
  });

  it("returns scope-mismatch when selected connection lacks deterministic route identity", () => {
    const result = __test.resolveSlackRoutingIdentityFromActiveConnections({
      routingInput: {
        channelId: "C123",
        providerConnectionId: "conn_1",
      },
      activeConnections: [
        buildConnection({
          _id: "conn_1",
          providerAccountId: undefined,
          customProperties: {},
        }),
      ],
      requireExplicitWorkspaceIdentity: true,
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.reasonCode).toBe("slack_routing_connection_scope_mismatch");
  });
});
