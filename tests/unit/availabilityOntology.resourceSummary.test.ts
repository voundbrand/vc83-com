import { describe, expect, it, vi } from "vitest";

vi.mock("../../convex/rbacHelpers", () => ({
  requireAuthenticatedUser: vi.fn(async () => ({
    userId: "users_availability_summary_test",
  })),
}));

import { getResourceAvailabilitySummary } from "../../convex/availabilityOntology";

function createDb(args: {
  objects: Record<string, Record<string, unknown>>;
  links: Array<Record<string, unknown>>;
}) {
  return {
    get: vi.fn(async (id: string) => args.objects[id] ?? null),
    query: vi.fn((tableName: string) => ({
      withIndex: vi.fn((_indexName: string, buildIndex: (q: { eq: (field: string, value: unknown) => unknown }) => void) => {
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
      }),
    })),
  };
}

describe("availability resource summary", () => {
  it("counts direct availability and linked schedule templates together", async () => {
    const resourceId = "objects_resource_summary";
    const scheduleId = "objects_schedule_summary";
    const exceptionId = "objects_exception_summary";
    const blockId = "objects_block_summary";
    const templateId = "objects_template_summary";
    const mondayEntryId = "objects_entry_monday";
    const tuesdayEntryId = "objects_entry_tuesday";

    const db = createDb({
      objects: {
        [resourceId]: {
          _id: resourceId,
          type: "product",
        },
        [scheduleId]: {
          _id: scheduleId,
          type: "availability",
          subtype: "schedule",
          status: "active",
        },
        [exceptionId]: {
          _id: exceptionId,
          type: "availability",
          subtype: "exception",
          status: "active",
        },
        [blockId]: {
          _id: blockId,
          type: "availability",
          subtype: "block",
          status: "active",
        },
        [templateId]: {
          _id: templateId,
          type: "availability",
          subtype: "schedule_template",
          status: "active",
          name: "Weekday Template",
        },
        [mondayEntryId]: {
          _id: mondayEntryId,
          type: "availability",
          subtype: "schedule_entry",
          status: "active",
          customProperties: {
            isAvailable: true,
            timeRanges: [
              { startTime: "09:00", endTime: "12:00" },
              { startTime: "13:00", endTime: "17:00" },
            ],
          },
        },
        [tuesdayEntryId]: {
          _id: tuesdayEntryId,
          type: "availability",
          subtype: "schedule_entry",
          status: "active",
          customProperties: {
            isAvailable: false,
            timeRanges: [],
          },
        },
      },
      links: [
        {
          _id: "link_schedule",
          fromObjectId: resourceId,
          toObjectId: scheduleId,
          linkType: "has_availability",
        },
        {
          _id: "link_exception",
          fromObjectId: resourceId,
          toObjectId: exceptionId,
          linkType: "has_availability",
        },
        {
          _id: "link_block",
          fromObjectId: resourceId,
          toObjectId: blockId,
          linkType: "has_availability",
        },
        {
          _id: "link_template",
          fromObjectId: resourceId,
          toObjectId: templateId,
          linkType: "uses_schedule",
        },
        {
          _id: "link_monday_entry",
          fromObjectId: templateId,
          toObjectId: mondayEntryId,
          linkType: "has_schedule_entry",
        },
        {
          _id: "link_tuesday_entry",
          fromObjectId: templateId,
          toObjectId: tuesdayEntryId,
          linkType: "has_schedule_entry",
        },
      ],
    });

    const summary = await (getResourceAvailabilitySummary as any)._handler(
      { db },
      {
        sessionId: "session_availability_summary",
        resourceId,
      }
    );

    expect(summary).toEqual({
      resourceId,
      hasAvailabilityConfigured: true,
      hasDirectAvailability: true,
      usesScheduleTemplate: true,
      scheduleSource: "mixed",
      directScheduleCount: 1,
      weeklyWindowCount: 3,
      exceptionCount: 1,
      blockCount: 1,
      scheduleTemplateCount: 1,
      scheduleTemplateNames: ["Weekday Template"],
    });
  });

  it("returns an explicit empty connection summary when nothing is linked", async () => {
    const resourceId = "objects_resource_without_availability";

    const db = createDb({
      objects: {
        [resourceId]: {
          _id: resourceId,
          type: "product",
        },
      },
      links: [],
    });

    const summary = await (getResourceAvailabilitySummary as any)._handler(
      { db },
      {
        sessionId: "session_availability_summary",
        resourceId,
      }
    );

    expect(summary).toEqual({
      resourceId,
      hasAvailabilityConfigured: false,
      hasDirectAvailability: false,
      usesScheduleTemplate: false,
      scheduleSource: "none",
      directScheduleCount: 0,
      weeklyWindowCount: 0,
      exceptionCount: 0,
      blockCount: 0,
      scheduleTemplateCount: 0,
      scheduleTemplateNames: [],
    });
  });
});
