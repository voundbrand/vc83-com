import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../convex/rbacHelpers", () => ({
  requireAuthenticatedUser: vi.fn(),
}));

import {
  checkConflict,
  getAvailableSlots,
} from "../../convex/availabilityOntology";
import { requireAuthenticatedUser } from "../../convex/rbacHelpers";

type Row = Record<string, unknown> & { _id: string };

const DAY_START = Date.UTC(2026, 2, 18, 0, 0, 0, 0);
const DAY_END = Date.UTC(2026, 2, 18, 23, 59, 59, 999);
const SLOT_START = Date.UTC(2026, 2, 18, 9, 0, 0, 0);
const RESOURCE_ID = "objects_resource_google_availability";
const GOOGLE_CONNECTION_ID = "oauthConnections_google_availability";
const MICROSOFT_CONNECTION_ID = "oauthConnections_microsoft_availability";
const SCHEDULE_ID = "objects_resource_schedule";
const DAY_OF_WEEK = new Date(DAY_START).getUTCDay();

function deepClone<T>(value: T): T {
  return structuredClone(value);
}

class FakeQuery {
  private filters: Array<{ field: string; value: unknown }> = [];

  constructor(private readonly rows: Row[]) {}

  withIndex(
    _indexName: string,
    build?: (q: { eq: (field: string, value: unknown) => unknown }) => unknown
  ) {
    const query = {
      eq: (field: string, value: unknown) => {
        this.filters.push({ field, value });
        return query;
      },
    };
    if (build) {
      build(query);
    }
    return this;
  }

  async collect() {
    return deepClone(
      this.rows.filter((row) =>
        this.filters.every((filter) => row[filter.field] === filter.value)
      )
    );
  }
}

class FakeDb {
  private readonly byId = new Map<string, Row>();

  constructor(
    private readonly tables: {
      objects: Row[];
      objectLinks: Row[];
      oauthConnections: Row[];
    }
  ) {
    for (const row of [
      ...tables.objects,
      ...tables.objectLinks,
      ...tables.oauthConnections,
    ]) {
      this.byId.set(String(row._id), deepClone(row));
    }
  }

  async get(id: string) {
    return deepClone(this.byId.get(String(id)) || null);
  }

  query(tableName: "objects" | "objectLinks" | "oauthConnections") {
    return new FakeQuery(this.tables[tableName].map((row) => deepClone(row)));
  }
}

const requireAuthenticatedUserMock = vi.mocked(requireAuthenticatedUser);

function createCtx(tables: {
  objects: Row[];
  objectLinks: Row[];
  oauthConnections: Row[];
}) {
  return { db: new FakeDb(tables) } as any;
}

function buildResource(): Row {
  return {
    _id: RESOURCE_ID,
    organizationId: "organizations_availability",
    type: "product",
    subtype: "service",
    status: "active",
    customProperties: {
      timezone: "UTC",
      minDuration: 60,
      slotIncrement: 60,
      capacity: 1,
    },
  };
}

function buildBerlinResource(): Row {
  return {
    _id: RESOURCE_ID,
    organizationId: "organizations_availability",
    type: "product",
    subtype: "service",
    status: "active",
    customProperties: {
      timezone: "Europe/Berlin",
      minDuration: 60,
      slotIncrement: 60,
      capacity: 1,
    },
  };
}

function buildSchedule(): Row {
  return {
    _id: SCHEDULE_ID,
    organizationId: "organizations_availability",
    type: "availability",
    subtype: "schedule",
    status: "active",
    customProperties: {
      dayOfWeek: DAY_OF_WEEK,
      startTime: "09:00",
      endTime: "13:00",
      isAvailable: true,
    },
  };
}

function buildCalendarConnection(
  id: string,
  provider: "google" | "microsoft",
  overrides: Partial<Row> = {}
): Row {
  return {
    _id: id,
    organizationId: "organizations_availability",
    provider,
    status: "active",
    syncSettings: {
      calendar: true,
    },
    scopes:
      provider === "google"
        ? ["https://www.googleapis.com/auth/calendar.readonly"]
        : ["Calendars.Read"],
    customProperties: {},
    ...overrides,
  };
}

function buildExternalEvent(
  id: string,
  provider: "external_google" | "external_microsoft",
  connectionId: string,
  startDateTime: number,
  endDateTime: number
): Row {
  return {
    _id: id,
    organizationId: "organizations_availability",
    type: "calendar_event",
    subtype: provider,
    status: "active",
    customProperties: {
      connectionId,
      startDateTime,
      endDateTime,
      isBusy: true,
    },
  };
}

function buildBaseTables() {
  return {
    objects: [buildResource(), buildSchedule()],
    oauthConnections: [
      buildCalendarConnection(GOOGLE_CONNECTION_ID, "google"),
      buildCalendarConnection(MICROSOFT_CONNECTION_ID, "microsoft"),
    ],
    objectLinks: [
      {
        _id: "link_schedule",
        fromObjectId: RESOURCE_ID,
        toObjectId: SCHEDULE_ID,
        linkType: "has_availability",
      },
      {
        _id: "link_google_calendar",
        fromObjectId: GOOGLE_CONNECTION_ID,
        toObjectId: RESOURCE_ID,
        linkType: "calendar_linked_to",
        properties: {
          connectionId: GOOGLE_CONNECTION_ID,
        },
      },
      {
        _id: "link_microsoft_calendar",
        fromObjectId: MICROSOFT_CONNECTION_ID,
        toObjectId: RESOURCE_ID,
        linkType: "calendar_linked_to",
        properties: {
          connectionId: MICROSOFT_CONNECTION_ID,
        },
      },
    ],
  };
}

describe("availability external busy-time handling", () => {
  beforeEach(() => {
    requireAuthenticatedUserMock.mockResolvedValue({
      userId: "users_availability",
    } as any);
  });

  it("merges linked external busy windows across ready connections before exposing slots", async () => {
    const tables = buildBaseTables();
    tables.objects.push(
      buildExternalEvent(
        "event_google_busy",
        "external_google",
        GOOGLE_CONNECTION_ID,
        Date.UTC(2026, 2, 18, 9, 30, 0, 0),
        Date.UTC(2026, 2, 18, 10, 30, 0, 0)
      ),
      buildExternalEvent(
        "event_microsoft_busy",
        "external_microsoft",
        MICROSOFT_CONNECTION_ID,
        Date.UTC(2026, 2, 18, 11, 0, 0, 0),
        Date.UTC(2026, 2, 18, 11, 30, 0, 0)
      )
    );
    tables.objectLinks.push(
      {
        _id: "link_google_blocks",
        fromObjectId: "event_google_busy",
        toObjectId: RESOURCE_ID,
        linkType: "blocks_resource",
      },
      {
        _id: "link_microsoft_blocks",
        fromObjectId: "event_microsoft_busy",
        toObjectId: RESOURCE_ID,
        linkType: "blocks_resource",
      }
    );

    const slots = await (getAvailableSlots as any)._handler(createCtx(tables), {
      sessionId: "session_availability",
      resourceId: RESOURCE_ID,
      startDate: DAY_START,
      endDate: DAY_END,
    });

    expect(slots).toHaveLength(1);
    expect(slots[0]).toMatchObject({
      startTime: "12:00",
      endTime: "13:00",
      remainingCapacity: 1,
      totalCapacity: 1,
    });
  });

  it("falls back to schedule availability when the linked Google connection is missing read scope", async () => {
    const tables = buildBaseTables();
    tables.oauthConnections[0] = buildCalendarConnection(
      GOOGLE_CONNECTION_ID,
      "google",
      {
        scopes: [],
      }
    );

    const ctx = createCtx(tables);
    const slots = await (getAvailableSlots as any)._handler(ctx, {
      sessionId: "session_availability",
      resourceId: RESOURCE_ID,
      startDate: DAY_START,
      endDate: DAY_END,
    });
    const hasConflict = await (checkConflict as any)._handler(ctx, {
      resourceId: RESOURCE_ID,
      startDateTime: SLOT_START,
      endDateTime: SLOT_START + 60 * 60_000,
    });

    expect(slots).toHaveLength(4);
    expect(hasConflict).toBe(false);
  });

  it("falls back to schedule availability when a linked calendar connection is inactive", async () => {
    const tables = buildBaseTables();
    tables.oauthConnections[0] = buildCalendarConnection(
      GOOGLE_CONNECTION_ID,
      "google",
      {
        status: "inactive",
      }
    );

    const ctx = createCtx(tables);
    const slots = await (getAvailableSlots as any)._handler(ctx, {
      sessionId: "session_availability",
      resourceId: RESOURCE_ID,
      startDate: DAY_START,
      endDate: DAY_END,
    });
    const hasConflict = await (checkConflict as any)._handler(ctx, {
      resourceId: RESOURCE_ID,
      startDateTime: SLOT_START,
      endDateTime: SLOT_START + 60 * 60_000,
    });

    expect(slots).toHaveLength(4);
    expect(hasConflict).toBe(false);
  });

  it("falls back to schedule availability when linked calendar sync is disabled", async () => {
    const tables = buildBaseTables();
    tables.oauthConnections[0] = buildCalendarConnection(
      GOOGLE_CONNECTION_ID,
      "google",
      {
        syncSettings: {
          calendar: false,
        },
      }
    );

    const ctx = createCtx(tables);
    const slots = await (getAvailableSlots as any)._handler(ctx, {
      sessionId: "session_availability",
      resourceId: RESOURCE_ID,
      startDate: DAY_START,
      endDate: DAY_END,
    });
    const hasConflict = await (checkConflict as any)._handler(ctx, {
      resourceId: RESOURCE_ID,
      startDateTime: SLOT_START,
      endDateTime: SLOT_START + 60 * 60_000,
    });

    expect(slots).toHaveLength(4);
    expect(hasConflict).toBe(false);
  });

  it("serializes slot date and time in the requested timezone", async () => {
    const berlinDayStart = Date.parse("2026-03-17T23:00:00.000Z");
    const berlinDayEnd = Date.parse("2026-03-18T22:59:59.999Z");
    const berlinDayOfWeek = 3;
    const ctx = createCtx({
      objects: [
        buildBerlinResource(),
        buildSchedule(),
      ].map((row) =>
        row._id === SCHEDULE_ID
          ? {
              ...row,
              customProperties: {
                ...(row.customProperties as Record<string, unknown>),
                dayOfWeek: berlinDayOfWeek,
              },
            }
          : row
      ),
      oauthConnections: [],
      objectLinks: [
        {
          _id: "link_schedule_berlin",
          fromObjectId: RESOURCE_ID,
          toObjectId: SCHEDULE_ID,
          linkType: "has_availability",
        },
      ],
    });

    const slots = await (getAvailableSlots as any)._handler(ctx, {
      sessionId: "session_availability",
      resourceId: RESOURCE_ID,
      startDate: berlinDayStart,
      endDate: berlinDayEnd,
      duration: 60,
      timezone: "Europe/Berlin",
    });

    expect(slots[0]).toMatchObject({
      date: "2026-03-18",
      startTime: "09:00",
      endTime: "10:00",
    });
  });
});
