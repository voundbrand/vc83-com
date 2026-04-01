import { describe, expect, it } from "vitest";
import {
  LEGACY_SESSION_ROUTING_KEY,
  SESSION_ROUTING_METADATA_CONTRACT_VERSION,
  buildSessionRoutingKey,
  normalizeSessionRoutingMetadata,
  resolveSessionRoutingMetadataConsistencyError,
  selectActiveSessionForRoute,
} from "../../../convex/ai/agentSessions";
import {
  resolveInboundChannelRouteIdentity,
  resolveInboundDispatchRouteSelectors,
} from "../../../convex/ai/kernel/agentExecution";

describe("session route identity", () => {
  it("uses explicit route keys as canonical routing keys", () => {
    expect(
      buildSessionRoutingKey({
        providerId: "slack",
        providerInstallationId: "T123",
        routeKey: "slack:T123",
      })
    ).toBe("route:slack:T123");
  });

  it("reuses exact route-scoped active sessions", () => {
    const selection = selectActiveSessionForRoute(
      [
        {
          _id: "s_legacy",
          agentId: "agent_a",
          status: "active",
          startedAt: 1,
          sessionRoutingKey: LEGACY_SESSION_ROUTING_KEY,
        },
        {
          _id: "s_route",
          agentId: "agent_a",
          status: "active",
          startedAt: 2,
          sessionRoutingKey: "route:slack:T123",
        },
      ],
      {
        agentId: "agent_a",
        incomingRouteIdentity: {
          providerId: "slack",
          providerInstallationId: "T123",
          routeKey: "slack:T123",
        },
      }
    );

    expect(selection.session?._id).toBe("s_route");
    expect(selection.promoteLegacy).toBe(false);
  });

  it("promotes a legacy active session when no route-scoped session exists", () => {
    const selection = selectActiveSessionForRoute(
      [
        {
          _id: "s_legacy",
          agentId: "agent_a",
          status: "active",
          startedAt: 1,
          sessionRoutingKey: LEGACY_SESSION_ROUTING_KEY,
        },
      ],
      {
        agentId: "agent_a",
        incomingRouteIdentity: {
          providerId: "slack",
          providerInstallationId: "T999",
          routeKey: "slack:T999",
        },
      }
    );

    expect(selection.session?._id).toBe("s_legacy");
    expect(selection.promoteLegacy).toBe(true);
    expect(selection.routingKey).toBe("route:slack:T999");
  });

  it("prevents collisions when another route-scoped active session already exists", () => {
    const selection = selectActiveSessionForRoute(
      [
        {
          _id: "s_route_a",
          agentId: "agent_a",
          status: "active",
          startedAt: 1,
          sessionRoutingKey: "route:slack:T111",
        },
      ],
      {
        agentId: "agent_a",
        incomingRouteIdentity: {
          providerId: "slack",
          providerInstallationId: "T222",
          routeKey: "slack:T222",
        },
      }
    );

    expect(selection.session).toBeNull();
    expect(selection.promoteLegacy).toBe(false);
  });

  it("derives inbound route identity from provider metadata aliases", () => {
    const routeIdentity = resolveInboundChannelRouteIdentity({
      providerId: "slack",
      slackTeamId: "T555",
      providerConnectionId: "oauthConnections:abc",
      providerProfileType: "organization",
    });

    expect(routeIdentity).toEqual({
      bindingId: undefined,
      providerId: "slack",
      providerConnectionId: "oauthConnections:abc",
      providerAccountId: "T555",
      providerInstallationId: "T555",
      providerProfileId: undefined,
      providerProfileType: "organization",
      routeKey: "slack:T555",
    });
  });

  it("derives dispatch route selectors for deterministic policy matching", () => {
    const selectors = resolveInboundDispatchRouteSelectors({
      channel: "slack",
      externalContactIdentifier: "slack:C555:user:U555",
      metadata: {
        providerId: "slack",
        providerAccountId: "A555",
        slackTeamId: "T555",
        slackChannelId: "C555",
        slackUserId: "U555",
      },
    });

    expect(selectors).toEqual({
      channel: "slack",
      providerId: "slack",
      account: "A555",
      team: "T555",
      peer: "U555",
      channelRef: "C555",
    });
  });

  it("normalizes operator routing metadata contract with canonical workflow key casing", () => {
    const normalized = normalizeSessionRoutingMetadata({
      contractVersion: SESSION_ROUTING_METADATA_CONTRACT_VERSION,
      tenantId: "org_123",
      lineageId: "lineage:desktop:1",
      threadId: "group_thread:1",
      workflowKey: "COMMIT",
      updatedAt: 1700000000000,
      updatedBy: "desktop_chat:user_1",
    });

    expect(normalized).toEqual({
      contractVersion: SESSION_ROUTING_METADATA_CONTRACT_VERSION,
      tenantId: "org_123",
      lineageId: "lineage:desktop:1",
      threadId: "group_thread:1",
      workflowKey: "commit",
      updatedAt: 1700000000000,
      updatedBy: "desktop_chat:user_1",
    });
  });

  it("fails closed when routing metadata and collaboration kernel identities mismatch", () => {
    const consistencyError = resolveSessionRoutingMetadataConsistencyError({
      routingMetadata: {
        contractVersion: SESSION_ROUTING_METADATA_CONTRACT_VERSION,
        tenantId: "org_123",
        lineageId: "lineage:desktop:1",
        threadId: "group_thread:1",
        workflowKey: "message_ingress",
        updatedAt: 1700000000000,
      },
      expectedTenantId: "org_123",
      collaborationKernel: {
        lineageId: "lineage:desktop:1",
        threadId: "group_thread:2",
      },
    });

    expect(consistencyError).toBe("collaboration_routing_identity_mismatch");
  });
});
