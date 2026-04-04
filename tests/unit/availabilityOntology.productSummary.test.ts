import { describe, expect, it, vi } from "vitest";

vi.mock("../../convex/rbacHelpers", () => ({
  requireAuthenticatedUser: vi.fn(async () => ({
    userId: "users_availability_summary_test",
  })),
}));

import { getProductAvailabilitySummary } from "../../convex/availabilityOntology";
import { checkProductAvailability } from "../../convex/productOntology";

function createDb(args: {
  objects: Record<string, Record<string, unknown>>;
  links: Array<Record<string, unknown>>;
}) {
  return {
    get: vi.fn(async (id: string) => args.objects[id] ?? null),
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
              if (tableName !== "objectLinks") {
                return [];
              }

              return args.links.filter((link) =>
                Object.entries(filters).every(([field, value]) => link[field] === value)
              );
            }),
          };
        }
      ),
    })),
  };
}

describe("product availability summary", () => {
  it("resolves an explicit linked availability resource", async () => {
    const productId = "objects_course_product";
    const resourceId = "objects_boat_resource";
    const scheduleId = "objects_schedule_summary";

    const db = createDb({
      objects: {
        [productId]: {
          _id: productId,
          organizationId: "org_1",
          type: "product",
          subtype: "class",
          status: "active",
          name: "Weekend course",
        },
        [resourceId]: {
          _id: resourceId,
          organizationId: "org_1",
          type: "product",
          subtype: "vehicle",
          status: "active",
          name: "Fraukje",
        },
        [scheduleId]: {
          _id: scheduleId,
          type: "availability",
          subtype: "schedule",
          status: "active",
        },
      },
      links: [
        {
          _id: "link_product_resource",
          fromObjectId: productId,
          toObjectId: resourceId,
          linkType: "uses_availability_of",
        },
        {
          _id: "link_resource_schedule",
          fromObjectId: resourceId,
          toObjectId: scheduleId,
          linkType: "has_availability",
        },
      ],
    });

    const summary = await (getProductAvailabilitySummary as any)._handler(
      { db },
      {
        sessionId: "session_availability_summary",
        productId,
      }
    );

    expect(summary).toMatchObject({
      productId,
      connectionMode: "linked",
      isConnectionValid: true,
      availabilityResourceId: resourceId,
      availabilityResourceName: "Fraukje",
      hasAvailabilityConfigured: true,
      directScheduleCount: 1,
    });
  });

  it("resolves explicit availability for non-legacy product subtypes when the backend state links a carrier", async () => {
    const productId = "objects_digital_product";
    const resourceId = "objects_shared_resource";
    const scheduleId = "objects_schedule_summary";

    const db = createDb({
      objects: {
        [productId]: {
          _id: productId,
          organizationId: "org_1",
          type: "product",
          subtype: "digital",
          status: "active",
          name: "Brand Guide Download",
          customProperties: {
            availabilityResourceId: resourceId,
          },
        },
        [resourceId]: {
          _id: resourceId,
          organizationId: "org_1",
          type: "product",
          subtype: "space",
          status: "active",
          name: "Shared Calendar",
        },
        [scheduleId]: {
          _id: scheduleId,
          type: "availability",
          subtype: "schedule",
          status: "active",
        },
      },
      links: [
        {
          _id: "link_product_resource",
          fromObjectId: productId,
          toObjectId: resourceId,
          linkType: "uses_availability_of",
        },
        {
          _id: "link_resource_schedule",
          fromObjectId: resourceId,
          toObjectId: scheduleId,
          linkType: "has_availability",
        },
      ],
    });

    const summary = await (getProductAvailabilitySummary as any)._handler(
      { db },
      {
        sessionId: "session_availability_summary",
        productId,
      }
    );

    expect(summary).toMatchObject({
      productId,
      isBookable: true,
      connectionMode: "linked",
      isConnectionValid: true,
      availabilityResourceId: resourceId,
      availabilityResourceName: "Shared Calendar",
      hasAvailabilityConfigured: true,
      directScheduleCount: 1,
    });
  });

  it("falls back to the product itself when no explicit resource is linked", async () => {
    const productId = "objects_appointment_product";
    const scheduleId = "objects_schedule_summary";

    const db = createDb({
      objects: {
        [productId]: {
          _id: productId,
          organizationId: "org_1",
          type: "product",
          subtype: "appointment",
          status: "active",
          name: "Initial consultation",
        },
        [scheduleId]: {
          _id: scheduleId,
          type: "availability",
          subtype: "schedule",
          status: "active",
        },
      },
      links: [
        {
          _id: "link_resource_schedule",
          fromObjectId: productId,
          toObjectId: scheduleId,
          linkType: "has_availability",
        },
      ],
    });

    const summary = await (getProductAvailabilitySummary as any)._handler(
      { db },
      {
        sessionId: "session_availability_summary",
        productId,
      }
    );

    expect(summary).toMatchObject({
      productId,
      connectionMode: "self",
      isConnectionValid: true,
      availabilityResourceId: productId,
      availabilityResourceName: "Initial consultation",
      hasAvailabilityConfigured: true,
      directScheduleCount: 1,
    });
  });

  it("allows explicit availabilityEnabled=false to disable legacy subtype fallback", async () => {
    const productId = "objects_room_product";

    const db = createDb({
      objects: {
        [productId]: {
          _id: productId,
          organizationId: "org_1",
          type: "product",
          subtype: "room",
          status: "active",
          name: "Conference Room",
          customProperties: {
            availabilityEnabled: false,
          },
        },
      },
      links: [],
    });

    const summary = await (getProductAvailabilitySummary as any)._handler(
      { db },
      {
        sessionId: "session_availability_summary",
        productId,
      }
    );

    expect(summary).toMatchObject({
      productId,
      isBookable: false,
      connectionMode: "none",
      isConnectionValid: false,
      availabilityResourceId: null,
      hasAvailabilityConfigured: false,
    });
  });
});

describe("checkProductAvailability", () => {
  it("marks a linked bookable product unavailable when the connected resource has no availability", async () => {
    const productId = "objects_course_product";
    const resourceId = "objects_resource_missing_schedule";

    const db = createDb({
      objects: {
        [productId]: {
          _id: productId,
          organizationId: "org_1",
          type: "product",
          subtype: "class",
          status: "active",
          name: "Weekend course",
          customProperties: {},
        },
        [resourceId]: {
          _id: resourceId,
          organizationId: "org_1",
          type: "product",
          subtype: "vehicle",
          status: "active",
          name: "Fraukje",
        },
      },
      links: [
        {
          _id: "link_product_resource",
          fromObjectId: productId,
          toObjectId: resourceId,
          linkType: "uses_availability_of",
        },
      ],
    });

    const verdict = await (checkProductAvailability as any)._handler(
      { db },
      { productId }
    );

    expect(verdict).toEqual({
      available: false,
      reason: "Availability is not configured for Fraukje.",
    });
  });

  it("requires configured availability for a non-legacy product subtype when explicit availability is enabled", async () => {
    const productId = "objects_digital_product";
    const resourceId = "objects_shared_resource";

    const db = createDb({
      objects: {
        [productId]: {
          _id: productId,
          organizationId: "org_1",
          type: "product",
          subtype: "digital",
          status: "active",
          name: "Brand Guide Download",
          customProperties: {
            availabilityResourceId: resourceId,
          },
        },
        [resourceId]: {
          _id: resourceId,
          organizationId: "org_1",
          type: "product",
          subtype: "space",
          status: "active",
          name: "Shared Calendar",
        },
      },
      links: [
        {
          _id: "link_product_resource",
          fromObjectId: productId,
          toObjectId: resourceId,
          linkType: "uses_availability_of",
        },
      ],
    });

    const verdict = await (checkProductAvailability as any)._handler(
      { db },
      { productId }
    );

    expect(verdict).toEqual({
      available: false,
      reason: "Availability is not configured for Shared Calendar.",
    });
  });
});
