import { describe, expect, it, vi } from "vitest";

vi.mock("../../../convex/rbacHelpers", () => ({
  requireAuthenticatedUser: vi.fn(async () => ({ userId: "user_seed" })),
}));

import {
  createDeparture,
  getFleetDepartures,
} from "../../../convex/departureOntology";

type TestObject = {
  _id: string;
  organizationId: string;
  type: string;
  subtype?: string;
  name?: string;
  status?: string;
  customProperties?: Record<string, unknown>;
  createdBy?: string;
  createdAt?: number;
  updatedAt?: number;
};

type TestLink = {
  _id: string;
  organizationId: string;
  fromObjectId: string;
  toObjectId: string;
  linkType: string;
  createdBy?: string;
  createdAt?: number;
};

function buildCtx(args: {
  objects: TestObject[];
  links: TestLink[];
}) {
  const objects = new Map(args.objects.map((record) => [record._id, record]));
  const links = [...args.links];
  let objectCounter = 0;
  let linkCounter = 0;

  const db = {
    get: vi.fn(async (id: string) => objects.get(id) || null),
    insert: vi.fn(async (table: string, value: Record<string, unknown>) => {
      if (table === "objects") {
        const id = `departure_generated_${++objectCounter}`;
        objects.set(id, { _id: id, ...(value as TestObject) });
        return id;
      }
      if (table === "objectLinks") {
        const id = `link_generated_${++linkCounter}`;
        links.push({ _id: id, ...(value as TestLink) });
        return id;
      }
      throw new Error(`Unexpected table insert: ${table}`);
    }),
    patch: vi.fn(async (id: string, value: Record<string, unknown>) => {
      const current = objects.get(id);
      if (!current) {
        throw new Error(`Object ${id} not found`);
      }
      objects.set(id, {
        ...current,
        ...value,
        customProperties: {
          ...(current.customProperties || {}),
          ...((value.customProperties as Record<string, unknown> | undefined) || {}),
        },
      });
    }),
    delete: vi.fn(async (id: string) => {
      if (objects.has(id)) {
        objects.delete(id);
        return;
      }
      const linkIndex = links.findIndex((link) => link._id === id);
      if (linkIndex >= 0) {
        links.splice(linkIndex, 1);
      }
    }),
    query: vi.fn((table: string) => {
      if (table !== "objectLinks") {
        throw new Error(`Unexpected query table: ${table}`);
      }

      return {
        withIndex: vi.fn((_indexName: string, build: (q: { eq: (field: string, value: unknown) => unknown }) => unknown) => {
          const filters: Record<string, unknown> = {};
          const chain = {
            eq(field: string, value: unknown) {
              filters[field] = value;
              return chain;
            },
          };
          build(chain);

          return {
            collect: vi.fn(async () =>
              links.filter((link) =>
                Object.entries(filters).every(
                  ([field, value]) => (link as Record<string, unknown>)[field] === value
                )
              )
            ),
          };
        }),
      };
    }),
  };

  return {
    db,
    objects,
    links,
  };
}

describe("departure ontology", () => {
  it("creates departures that inherit vessel and fleet relationships", async () => {
    const ctx = buildCtx({
      objects: [
        {
          _id: "route_1",
          organizationId: "org_1",
          type: "route",
          subtype: "one_way",
          name: "Altwarp -> Ueckermuende",
          status: "active",
          customProperties: {},
        },
        {
          _id: "fleet_1",
          organizationId: "org_1",
          type: "fleet",
          subtype: "marine",
          name: "Baltic Training Fleet",
          status: "active",
          customProperties: {},
        },
        {
          _id: "vessel_1",
          organizationId: "org_1",
          type: "product",
          subtype: "vehicle",
          name: "Fraukje",
          status: "active",
          customProperties: {},
        },
      ],
      links: [
        {
          _id: "fleet_link_1",
          organizationId: "org_1",
          fromObjectId: "fleet_1",
          toObjectId: "vessel_1",
          linkType: "has_vessel",
        },
      ],
    });

    const result = await (createDeparture as any)._handler(ctx, {
      sessionId: "session_1",
      organizationId: "org_1",
      routeId: "route_1",
      name: "Morning Sailing",
      subtype: "scheduled",
      vesselId: "vessel_1",
      departureDateTime: 1_760_000_000_000,
      arrivalDateTime: 1_760_000_000_000 + 90 * 60_000,
      totalSeats: 12,
      priceCentsPerSeat: 4900,
    });

    const departure = ctx.objects.get(result.departureId);
    expect(departure?.customProperties).toMatchObject({
      routeId: "route_1",
      vehicleProductId: "vessel_1",
      vesselId: "vessel_1",
      fleetId: "fleet_1",
      totalSeats: 12,
      priceCentsPerSeat: 4900,
    });

    expect(
      ctx.links.some(
        (link) =>
          link.linkType === "has_departure"
          && link.fromObjectId === "route_1"
          && link.toObjectId === result.departureId
      )
    ).toBe(true);
    expect(
      ctx.links.some(
        (link) =>
          link.linkType === "operates_departure"
          && link.fromObjectId === "vessel_1"
          && link.toObjectId === result.departureId
      )
    ).toBe(true);
  });

  it("lists fleet departures across vessels using shared departure summaries", async () => {
    const ctx = buildCtx({
      objects: [
        {
          _id: "fleet_1",
          organizationId: "org_1",
          type: "fleet",
          subtype: "marine",
          name: "Fleet",
          status: "active",
          customProperties: {},
        },
        {
          _id: "vessel_1",
          organizationId: "org_1",
          type: "product",
          subtype: "vehicle",
          name: "Fraukje",
          status: "active",
          customProperties: {},
        },
        {
          _id: "departure_1",
          organizationId: "org_1",
          type: "departure",
          subtype: "scheduled",
          name: "Harbor Run",
          status: "scheduled",
          customProperties: {
            routeId: "route_1",
            vesselId: "vessel_1",
            fleetId: "fleet_1",
            departureDateTime: 1_760_000_000_000,
            arrivalDateTime: 1_760_000_000_000 + 90 * 60_000,
            totalSeats: 20,
            bookedCount: 5,
            priceCentsPerSeat: 5900,
          },
        },
      ],
      links: [
        {
          _id: "fleet_link_1",
          organizationId: "org_1",
          fromObjectId: "fleet_1",
          toObjectId: "vessel_1",
          linkType: "has_vessel",
        },
        {
          _id: "departure_link_1",
          organizationId: "org_1",
          fromObjectId: "vessel_1",
          toObjectId: "departure_1",
          linkType: "operates_departure",
        },
      ],
    });

    const departures = await (getFleetDepartures as any)._handler(ctx, {
      sessionId: "session_1",
      fleetId: "fleet_1",
    });

    expect(departures).toEqual([
      expect.objectContaining({
        _id: "departure_1",
        vesselId: "vessel_1",
        fleetId: "fleet_1",
        totalSeats: 20,
        bookedCount: 5,
        availableSeats: 15,
        priceCentsPerSeat: 5900,
      }),
    ]);
  });
});
