import { describe, expect, it, vi } from "vitest";

vi.mock("../../convex/rbacHelpers", () => ({
  requireAuthenticatedUser: vi.fn(async () => ({
    userId: "users_availability_resources_test",
  })),
}));

import { listAvailabilityResources } from "../../convex/availabilityOntology";

function createDb(args: {
  objects: Record<string, Record<string, unknown>>;
  links: Array<Record<string, unknown>>;
}) {
  return {
    query: vi.fn((tableName: string) => ({
      withIndex: vi.fn(
        (
          _indexName: string,
          buildIndex: (q: { eq: (field: string, value: unknown) => unknown }) => void
        ) => {
          const filters: Record<string, unknown> = {};
          const chain = {
            eq: (field: string, value: unknown) => {
              filters[field] = value;
              return chain;
            },
          };
          buildIndex(chain);

          return {
            collect: vi.fn(async () => {
              if (tableName === "objects") {
                return Object.values(args.objects).filter((object) =>
                  Object.entries(filters).every(([field, value]) => object[field] === value)
                );
              }

              if (tableName === "objectLinks") {
                return args.links.filter((link) =>
                  Object.entries(filters).every(([field, value]) => link[field] === value)
                );
              }

              return [];
            }),
          };
        }
      ),
    })),
  };
}

describe("listAvailabilityResources", () => {
  it("returns actual carrier resources and excludes products that point at a distinct carrier", async () => {
    const organizationId = "org_availability_resources";
    const linkedProductId = "objects_linked_product";
    const linkedResourceId = "objects_linked_resource";
    const selfManagedResourceId = "objects_self_managed_resource";
    const directAvailabilityCarrierId = "objects_direct_availability_carrier";
    const scheduleId = "objects_schedule";

    const db = createDb({
      objects: {
        [linkedProductId]: {
          _id: linkedProductId,
          organizationId,
          type: "product",
          subtype: "appointment",
          status: "active",
          name: "Consultation product",
          customProperties: {
            availabilityResourceId: linkedResourceId,
          },
        },
        [linkedResourceId]: {
          _id: linkedResourceId,
          organizationId,
          type: "product",
          subtype: "staff",
          status: "active",
          name: "Dr. Marina",
          customProperties: {},
        },
        [selfManagedResourceId]: {
          _id: selfManagedResourceId,
          organizationId,
          type: "product",
          subtype: "room",
          status: "active",
          name: "Harbor Room",
          customProperties: {},
        },
        [directAvailabilityCarrierId]: {
          _id: directAvailabilityCarrierId,
          organizationId,
          type: "product",
          subtype: "digital",
          status: "active",
          name: "Legacy Carrier",
          customProperties: {},
        },
        [scheduleId]: {
          _id: scheduleId,
          organizationId,
          type: "availability",
          subtype: "schedule",
          status: "active",
        },
      },
      links: [
        {
          _id: "link_product_resource",
          fromObjectId: linkedProductId,
          toObjectId: linkedResourceId,
          linkType: "uses_availability_of",
        },
        {
          _id: "link_direct_schedule",
          fromObjectId: directAvailabilityCarrierId,
          toObjectId: scheduleId,
          linkType: "has_availability",
        },
      ],
    });

    const resources = await (listAvailabilityResources as any)._handler(
      { db },
      {
        sessionId: "session_availability_resources",
        organizationId,
      }
    );

    const resourceIds = resources.map((resource: { _id: string }) => resource._id);

    expect(resourceIds).toContain(linkedResourceId);
    expect(resourceIds).toContain(selfManagedResourceId);
    expect(resourceIds).toContain(directAvailabilityCarrierId);
    expect(resourceIds).not.toContain(linkedProductId);
  });

  it("honors legacy shadow availabilityResourceId references even without an explicit object link", async () => {
    const organizationId = "org_availability_resources_shadow";
    const legacyProductId = "objects_legacy_product";
    const resourceId = "objects_legacy_resource";

    const db = createDb({
      objects: {
        [legacyProductId]: {
          _id: legacyProductId,
          organizationId,
          type: "product",
          subtype: "class",
          status: "active",
          name: "Weekend Course Product",
          customProperties: {
            availabilityResourceId: resourceId,
          },
        },
        [resourceId]: {
          _id: resourceId,
          organizationId,
          type: "product",
          subtype: "space",
          status: "active",
          name: "Dock Classroom",
          customProperties: {},
        },
      },
      links: [],
    });

    const resources = await (listAvailabilityResources as any)._handler(
      { db },
      {
        sessionId: "session_availability_resources",
        organizationId,
      }
    );

    const resourceIds = resources.map((resource: { _id: string }) => resource._id);

    expect(resourceIds).toContain(resourceId);
    expect(resourceIds).not.toContain(legacyProductId);
  });

  it("honors an explicit availabilityEnabled=false override even on legacy availability subtypes", async () => {
    const organizationId = "org_availability_resources_disabled";
    const disabledLegacyResourceId = "objects_disabled_legacy_resource";

    const db = createDb({
      objects: {
        [disabledLegacyResourceId]: {
          _id: disabledLegacyResourceId,
          organizationId,
          type: "product",
          subtype: "room",
          status: "active",
          name: "Disabled Room",
          customProperties: {
            availabilityEnabled: false,
          },
        },
      },
      links: [],
    });

    const resources = await (listAvailabilityResources as any)._handler(
      { db },
      {
        sessionId: "session_availability_resources",
        organizationId,
      }
    );

    expect(resources).toEqual([]);
  });
});
