import { describe, expect, it } from "vitest"
import { checkConflictByModel } from "../../convex/availabilityOntology"

type Row = Record<string, unknown> & { _id: string }

class FakeQuery {
  private filters: Array<{ field: string; value: unknown }> = []

  constructor(private readonly rows: Row[]) {}

  withIndex(
    _indexName: string,
    build?: (q: { eq: (field: string, value: unknown) => unknown }) => unknown
  ) {
    const query = {
      eq: (field: string, value: unknown) => {
        this.filters.push({ field, value })
        return query
      },
    }

    if (build) {
      build(query)
    }

    return this
  }

  async collect() {
    return structuredClone(
      this.rows.filter((row) =>
        this.filters.every((filter) => row[filter.field] === filter.value)
      )
    )
  }
}

class FakeDb {
  private readonly byId = new Map<string, Row>()

  constructor(
    private readonly tables: {
      objects: Row[]
      objectLinks: Row[]
      oauthConnections: Row[]
    }
  ) {
    for (const row of [
      ...tables.objects,
      ...tables.objectLinks,
      ...tables.oauthConnections,
    ]) {
      this.byId.set(String(row._id), structuredClone(row))
    }
  }

  async get(id: string) {
    return structuredClone(this.byId.get(String(id)) || null)
  }

  query(tableName: "objects" | "objectLinks" | "oauthConnections") {
    return new FakeQuery(this.tables[tableName].map((row) => structuredClone(row)))
  }
}

const ORGANIZATION_ID = "organizations_model_conflict"
const RESOURCE_ID = "objects_resource_model_conflict"
const SCHEDULE_ID = "objects_schedule_model_conflict"

function createCtx(args: { objects: Row[]; objectLinks: Row[] }) {
  return {
    db: new FakeDb({
      objects: args.objects,
      objectLinks: args.objectLinks,
      oauthConnections: [],
    }),
  } as any
}

function buildResource(): Row {
  return {
    _id: RESOURCE_ID,
    organizationId: ORGANIZATION_ID,
    type: "product",
    subtype: "class",
    status: "active",
    customProperties: {
      availabilityModel: "time_slot",
      capacity: 8,
    },
  }
}

function buildSchedule(args: {
  dayOfWeek: number
  startTime: string
  endTime: string
}): Row {
  return {
    _id: SCHEDULE_ID,
    organizationId: ORGANIZATION_ID,
    type: "availability",
    subtype: "schedule",
    status: "active",
    customProperties: {
      dayOfWeek: args.dayOfWeek,
      startTime: args.startTime,
      endTime: args.endTime,
      isAvailable: true,
    },
  }
}

describe("availability model-aware conflict checks", () => {
  it("rejects time-slot bookings outside a seeded schedule window", async () => {
    const scheduledDay = Date.UTC(2026, 3, 10, 13, 0, 0, 0)
    const ctx = createCtx({
      objects: [
        buildResource(),
        buildSchedule({
          dayOfWeek: new Date(scheduledDay).getUTCDay(),
          startTime: "09:00",
          endTime: "12:00",
        }),
      ],
      objectLinks: [
        {
          _id: "link_schedule_to_resource",
          fromObjectId: RESOURCE_ID,
          toObjectId: SCHEDULE_ID,
          linkType: "has_availability",
        },
      ],
    })

    const result = await (checkConflictByModel as any)._handler(ctx, {
      organizationId: ORGANIZATION_ID,
      resourceId: RESOURCE_ID,
      startDateTime: scheduledDay,
      endDateTime: scheduledDay + 180 * 60_000,
    })

    expect(result).toEqual({
      hasConflict: true,
      reason: "Outside configured availability",
    })
  })

  it("keeps legacy overlap-only behavior when no resource availability exists", async () => {
    const scheduledDay = Date.UTC(2026, 3, 10, 13, 0, 0, 0)
    const ctx = createCtx({
      objects: [buildResource()],
      objectLinks: [],
    })

    const result = await (checkConflictByModel as any)._handler(ctx, {
      organizationId: ORGANIZATION_ID,
      resourceId: RESOURCE_ID,
      startDateTime: scheduledDay,
      endDateTime: scheduledDay + 180 * 60_000,
    })

    expect(result).toEqual({
      hasConflict: false,
      reason: null,
    })
  })
})
