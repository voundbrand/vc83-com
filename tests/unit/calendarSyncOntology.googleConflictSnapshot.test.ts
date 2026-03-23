import { describe, expect, it } from "vitest";
import { getGoogleCalendarConflictSnapshotInternal } from "../../convex/calendarSyncOntology";

type Row = Record<string, unknown> & { _id: string };

type Expression =
  | { kind: "eq"; field: string; value: unknown }
  | { kind: "neq"; field: string; value: unknown }
  | { kind: "and"; expressions: Expression[] };

type FilterApi = {
  field: (name: string) => { __field: string };
  eq: (lhs: unknown, value: unknown) => Expression;
  neq: (lhs: unknown, value: unknown) => Expression;
  and: (...expressions: Expression[]) => Expression;
};

const ORG_ID = "organizations_google_conflict";
const CONNECTION_ID = "oauthConnections_google_conflict";
const RANGE_START = Date.UTC(2026, 2, 18, 9, 0, 0, 0);
const RANGE_END = Date.UTC(2026, 2, 18, 12, 0, 0, 0);

function deepClone<T>(value: T): T {
  return structuredClone(value);
}

function resolveFieldName(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (
    value &&
    typeof value === "object" &&
    "__field" in (value as Record<string, unknown>)
  ) {
    return String((value as Record<string, unknown>).__field);
  }
  return String(value);
}

function evaluateExpression(row: Row, expression: Expression): boolean {
  if (expression.kind === "and") {
    return expression.expressions.every((entry) =>
      evaluateExpression(row, entry)
    );
  }
  if (expression.kind === "eq") {
    return row[expression.field] === expression.value;
  }
  return row[expression.field] !== expression.value;
}

function createFilterApi(): FilterApi {
  return {
    field: (name) => ({ __field: name }),
    eq: (lhs, value) => ({
      kind: "eq",
      field: resolveFieldName(lhs),
      value,
    }),
    neq: (lhs, value) => ({
      kind: "neq",
      field: resolveFieldName(lhs),
      value,
    }),
    and: (...expressions) => ({
      kind: "and",
      expressions,
    }),
  };
}

class FakeQuery {
  private readonly indexFilters: Array<{ field: string; value: unknown }> = [];
  private readonly filterExpressions: Expression[] = [];

  constructor(private readonly rows: Row[]) {}

  withIndex(
    _indexName: string,
    build?: (q: { eq: (field: string, value: unknown) => unknown }) => unknown
  ) {
    const query = {
      eq: (field: string, value: unknown) => {
        this.indexFilters.push({ field, value });
        return query;
      },
    };
    if (build) {
      build(query);
    }
    return this;
  }

  filter(build: (q: FilterApi) => Expression) {
    this.filterExpressions.push(build(createFilterApi()));
    return this;
  }

  async collect() {
    return deepClone(this.apply());
  }

  private apply() {
    return this.rows.filter((row) => {
      const matchesIndex = this.indexFilters.every(
        (filter) => row[filter.field] === filter.value
      );
      if (!matchesIndex) {
        return false;
      }
      return this.filterExpressions.every((expression) =>
        evaluateExpression(row, expression)
      );
    });
  }
}

class FakeDb {
  private readonly byId = new Map<string, Row>();

  constructor(
    private readonly tables: {
      objects: Row[];
      oauthConnections: Row[];
    }
  ) {
    for (const row of [...tables.objects, ...tables.oauthConnections]) {
      this.byId.set(String(row._id), deepClone(row));
    }
  }

  async get(id: string) {
    return deepClone(this.byId.get(String(id)) || null);
  }

  query(tableName: "objects" | "oauthConnections") {
    return new FakeQuery(this.tables[tableName].map((row) => deepClone(row)));
  }
}

function createCtx(tables: {
  objects: Row[];
  oauthConnections: Row[];
}) {
  return { db: new FakeDb(tables) } as any;
}

function buildGoogleConnection(
  overrides: Partial<Row> = {},
  customProperties: Record<string, unknown> = {}
): Row {
  return {
    _id: CONNECTION_ID,
    organizationId: ORG_ID,
    provider: "google",
    status: "active",
    syncSettings: {
      calendar: true,
    },
    scopes: [
      "https://www.googleapis.com/auth/calendar.readonly",
      "https://www.googleapis.com/auth/calendar.events",
    ],
    customProperties: {
      subCalendars: [
        { calendarId: "primary@example.com", primary: true },
        { calendarId: "team@example.com" },
      ],
      ...customProperties,
    },
    ...overrides,
  };
}

function buildCalendarEvent(
  id: string,
  overrides: Partial<Row> = {},
  customProperties: Record<string, unknown> = {}
): Row {
  return {
    _id: id,
    organizationId: ORG_ID,
    type: "calendar_event",
    subtype: "external_google",
    status: "active",
    customProperties: {
      connectionId: CONNECTION_ID,
      isBusy: true,
      startDateTime: RANGE_START,
      endDateTime: RANGE_END,
      sourceCalendarId: "primary",
      ...customProperties,
    },
    ...overrides,
  };
}

describe("Google calendar conflict snapshots", () => {
  it("normalizes primary calendar selection and only returns overlapping busy conflicts", async () => {
    const ctx = createCtx({
      oauthConnections: [buildGoogleConnection()],
      objects: [
        buildCalendarEvent("event_primary_overlap", {}, {
          startDateTime: RANGE_START + 15 * 60_000,
          endDateTime: RANGE_START + 75 * 60_000,
          sourceCalendarId: "primary",
        }),
        buildCalendarEvent("event_team_overlap", {}, {
          startDateTime: RANGE_START + 30 * 60_000,
          endDateTime: RANGE_START + 90 * 60_000,
          sourceCalendarId: "team@example.com",
        }),
        buildCalendarEvent("event_not_busy", {}, {
          isBusy: false,
          startDateTime: RANGE_START + 10 * 60_000,
          endDateTime: RANGE_START + 40 * 60_000,
        }),
        buildCalendarEvent("event_outside_range", {}, {
          startDateTime: RANGE_END + 5 * 60_000,
          endDateTime: RANGE_END + 65 * 60_000,
        }),
        buildCalendarEvent("event_deleted", { status: "deleted" }, {}),
      ],
    });

    const result = await (getGoogleCalendarConflictSnapshotInternal as any)._handler(
      ctx,
      {
        organizationId: ORG_ID,
        connectionId: CONNECTION_ID,
        startDateTime: RANGE_START,
        endDateTime: RANGE_END,
        blockingCalendarIds: ["primary"],
      }
    );

    expect(result.status).toBe("resolved");
    expect(result.blockedReasons).toEqual([]);
    expect(result.blockingCalendarIds).toEqual(["primary@example.com"]);
    expect(result.scopeReadiness).toEqual({
      canAccessCalendar: true,
      canWriteCalendar: true,
    });
    expect(result.conflicts).toEqual([
      {
        eventId: "event_primary_overlap",
        calendarId: "primary@example.com",
        startDateTime: RANGE_START + 15 * 60_000,
        endDateTime: RANGE_START + 75 * 60_000,
        source: "external_calendar",
      },
    ]);
  });

  it("fails closed when the Google read scope is missing", async () => {
    const ctx = createCtx({
      oauthConnections: [
        buildGoogleConnection({
          scopes: [],
        }),
      ],
      objects: [
        buildCalendarEvent("event_should_not_resolve"),
      ],
    });

    const result = await (getGoogleCalendarConflictSnapshotInternal as any)._handler(
      ctx,
      {
        organizationId: ORG_ID,
        connectionId: CONNECTION_ID,
        startDateTime: RANGE_START,
        endDateTime: RANGE_END,
      }
    );

    expect(result.status).toBe("blocked");
    expect(result.blockedReasons).toContain("missing_google_calendar_read_scope");
    expect(result.conflicts).toEqual([]);
  });

  it("fails closed when the Google connection is inactive", async () => {
    const ctx = createCtx({
      oauthConnections: [
        buildGoogleConnection({
          status: "inactive",
        }),
      ],
      objects: [buildCalendarEvent("event_should_not_resolve")],
    });

    const result = await (getGoogleCalendarConflictSnapshotInternal as any)._handler(
      ctx,
      {
        organizationId: ORG_ID,
        connectionId: CONNECTION_ID,
        startDateTime: RANGE_START,
        endDateTime: RANGE_END,
      }
    );

    expect(result.status).toBe("blocked");
    expect(result.blockedReasons).toContain(
      "google_calendar_connection_inactive"
    );
    expect(result.conflicts).toEqual([]);
  });

  it("fails closed when calendar sync is disabled", async () => {
    const ctx = createCtx({
      oauthConnections: [
        buildGoogleConnection({
          syncSettings: {
            calendar: false,
          },
        }),
      ],
      objects: [buildCalendarEvent("event_should_not_resolve")],
    });

    const result = await (getGoogleCalendarConflictSnapshotInternal as any)._handler(
      ctx,
      {
        organizationId: ORG_ID,
        connectionId: CONNECTION_ID,
        startDateTime: RANGE_START,
        endDateTime: RANGE_END,
      }
    );

    expect(result.status).toBe("blocked");
    expect(result.blockedReasons).toContain("google_calendar_sync_disabled");
    expect(result.conflicts).toEqual([]);
  });
});
