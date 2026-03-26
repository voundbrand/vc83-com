import { describe, expect, it, vi } from "vitest"
import { customerCheckoutInternal } from "../../../convex/api/v1/resourceBookingsInternal"

const ORG_ID = "org_1" as any
const RESOURCE_ID = "resource_1" as any
const USER_ID = "user_system" as any
const CONTACT_ID = "contact_1" as any
const BOOKING_ID = "booking_1" as any

function buildMockCtx(resultStatus: string) {
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

  const runQuery = vi
    .fn()
    .mockResolvedValueOnce(false)
    .mockResolvedValueOnce({ hasConflict: false })
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
    const ctx = buildMockCtx("confirmed")

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
    expect(ctx.scheduler.runAfter).not.toHaveBeenCalled()
  })
})
