import { describe, expect, it, vi } from "vitest"
import { customerCheckoutInternal } from "../../../convex/api/v1/resourceBookingsInternal"

const ORG_ID = "org_1" as any
const RESOURCE_ID = "resource_1" as any
const USER_ID = "user_system" as any
const CONTACT_ID = "contact_1" as any
const BOOKING_ID = "booking_1" as any

function buildMockCtx(
  resultStatus: string,
  options?: {
    calendarConnections?: Array<{
      connectionId: string
      provider: string
      pushCalendarId: string | null
    }>
    connectionDocs?: Record<string, Record<string, unknown>>
  }
) {
  const resource = {
    _id: RESOURCE_ID,
    type: "product",
    subtype: "class",
    organizationId: ORG_ID,
    customProperties: {
      availabilityModel: "time_slot",
      capacity: 8,
      pricePerUnit: 12000,
      priceUnit: "session",
      bookableConfig: {
        capacity: 8,
        confirmationRequired: false,
      },
    },
  }

  const calendarConnections = options?.calendarConnections || []
  const connectionDocs = options?.connectionDocs || {}

  const runQuery = vi.fn(async (_ref: unknown, args: Record<string, unknown>) => {
    if (
      args.resourceId === RESOURCE_ID
      && args.organizationId === ORG_ID
      && !("startDateTime" in args)
      && !("endDateTime" in args)
    ) {
      return calendarConnections
    }
    if (
      args.resourceId === RESOURCE_ID
      && typeof args.startDateTime === "number"
      && typeof args.endDateTime === "number"
      && !("seatCount" in args)
    ) {
      return false
    }
    if (
      args.resourceId === RESOURCE_ID
      && typeof args.startDateTime === "number"
      && typeof args.endDateTime === "number"
      && typeof args.seatCount === "number"
    ) {
      return { hasConflict: false }
    }
    return null
  })
  const runMutation = vi.fn().mockResolvedValue({
    bookingId: BOOKING_ID,
    status: resultStatus,
  })
  const schedulerRunAfter = vi.fn()

  const db = {
    get: vi.fn(async (id: unknown) => {
      if (id === RESOURCE_ID) {
        return resource
      }
      if (id === BOOKING_ID) {
        return {
          _id: BOOKING_ID,
          customProperties: {},
        }
      }
      if (typeof id === "string" && connectionDocs[id]) {
        return connectionDocs[id]
      }
      return null
    }),
    query: vi.fn((table: string) => {
      if (table === "objects") {
        return {
          withIndex: () => ({
            filter: () => ({
              collect: async () => [],
            }),
          }),
        }
      }
      if (table === "users") {
        return {
          filter: () => ({
            first: async () => ({
              _id: USER_ID,
              email: "system@l4yercak3.com",
            }),
          }),
        }
      }
      throw new Error(`Unexpected query table: ${table}`)
    }),
    insert: vi.fn(async () => CONTACT_ID),
    patch: vi.fn(async () => undefined),
  }

  return {
    db,
    runQuery,
    runMutation,
    scheduler: {
      runAfter: schedulerRunAfter,
    },
  }
}

describe("resource booking checkout calendar handoff", () => {
  it("schedules calendar push when booking is confirmed", async () => {
    const ctx = buildMockCtx("confirmed", {
      calendarConnections: [
        {
          connectionId: "oauth_google_1",
          provider: "google",
          pushCalendarId: "primary",
        },
      ],
      connectionDocs: {
        oauth_google_1: {
          _id: "oauth_google_1",
          provider: "google",
          status: "active",
          scopes: ["https://www.googleapis.com/auth/calendar.events"],
          syncSettings: { calendar: true },
        },
      },
    })

    const result = await (customerCheckoutInternal as any)._handler(ctx, {
      organizationId: ORG_ID,
      resourceId: RESOURCE_ID,
      startDateTime: 1_760_000_000_000,
      endDateTime: 1_760_000_360_000,
      timezone: "Europe/Berlin",
      customer: {
        firstName: "Max",
        lastName: "Muster",
        email: "max@example.com",
        phone: "+49123456789",
      },
      participants: 1,
      source: "segelschule_landing",
    })

    expect(result.success).toBe(true)
    expect(result.status).toBe("confirmed")
    expect(result.calendarDiagnostics.writeReady).toBe(true)
    expect(result.calendarDiagnostics.writeReadyConnectionCount).toBe(1)
    expect(result.calendarDiagnostics.issues).toEqual([])
    expect(ctx.scheduler.runAfter).toHaveBeenCalledTimes(1)
    expect(ctx.scheduler.runAfter).toHaveBeenCalledWith(
      0,
      expect.anything(),
      {
        bookingId: BOOKING_ID,
        organizationId: ORG_ID,
      }
    )
  })

  it("does not schedule calendar push when booking is not confirmed", async () => {
    const ctx = buildMockCtx("pending_confirmation")

    const result = await (customerCheckoutInternal as any)._handler(ctx, {
      organizationId: ORG_ID,
      resourceId: RESOURCE_ID,
      startDateTime: 1_760_000_000_000,
      endDateTime: 1_760_000_360_000,
      timezone: "Europe/Berlin",
      customer: {
        firstName: "Max",
        lastName: "Muster",
        email: "max@example.com",
      },
      participants: 1,
    })

    expect(result.success).toBe(true)
    expect(result.status).toBe("pending_confirmation")
    expect(result.calendarDiagnostics.writeReady).toBe(false)
    expect(result.calendarDiagnostics.issues).toContain("calendar_links_missing")
    expect(result.calendarDiagnostics.calendarPushScheduled).toBe(false)
    expect(ctx.scheduler.runAfter).not.toHaveBeenCalled()
  })
})
