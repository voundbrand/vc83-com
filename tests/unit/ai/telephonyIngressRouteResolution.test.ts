import { describe, expect, it } from "vitest";
import { resolveTelephonyWebhookIngressContext } from "../../../convex/channels/router";

type BindingRow = {
  _id: string;
  organizationId: string;
  type: "channel_provider_binding";
  customProperties: Record<string, unknown>;
};

function createCtx(bindings: BindingRow[]) {
  return {
    db: {
      query: (table: string) => {
        expect(table).toBe("objects");
        return {
          withIndex: (indexName: string) => {
            expect(indexName).toBe("by_type");
            return {
              collect: async () => bindings,
            };
          },
        };
      },
    },
  };
}

describe("telephony ingress route resolution", () => {
  it("resolves exactly one org from a deterministic route key", async () => {
    const result = await (resolveTelephonyWebhookIngressContext as any)._handler(
      createCtx([
        {
          _id: "binding_1",
          organizationId: "org_1",
          type: "channel_provider_binding",
          customProperties: {
            channel: "phone_call",
            enabled: true,
            providerId: "direct",
            providerConnectionId: "conn_1",
            providerInstallationId: "inst_1",
            providerProfileType: "organization",
            routeKey: "eleven:phone:conn_1:inst_1",
          },
        },
      ]),
      {
        providerId: "direct",
        routeKey: "eleven:phone:conn_1:inst_1",
      }
    );

    expect(result).toMatchObject({
      status: "resolved",
      organizationId: "org_1",
      providerId: "direct",
      providerConnectionId: "conn_1",
      providerInstallationId: "inst_1",
      providerProfileType: "organization",
      routeKey: "eleven:phone:conn_1:inst_1",
    });
  });

  it("fails closed when no route identity is provided", async () => {
    const result = await (resolveTelephonyWebhookIngressContext as any)._handler(
      createCtx([]),
      {}
    );

    expect(result).toMatchObject({
      status: "missing_route_identity",
    });
  });

  it("fails closed when more than one binding matches the route identity", async () => {
    const result = await (resolveTelephonyWebhookIngressContext as any)._handler(
      createCtx([
        {
          _id: "binding_1",
          organizationId: "org_1",
          type: "channel_provider_binding",
          customProperties: {
            channel: "phone_call",
            enabled: true,
            providerId: "direct",
            routeKey: "eleven:phone:shared:inst",
          },
        },
        {
          _id: "binding_2",
          organizationId: "org_2",
          type: "channel_provider_binding",
          customProperties: {
            channel: "phone_call",
            enabled: true,
            providerId: "direct",
            routeKey: "eleven:phone:shared:inst",
          },
        },
      ]),
      {
        providerId: "direct",
        routeKey: "eleven:phone:shared:inst",
      }
    );

    expect(result).toMatchObject({
      status: "ambiguous_route",
      matchCount: 2,
      routeKey: "eleven:phone:shared:inst",
    });
  });
});
