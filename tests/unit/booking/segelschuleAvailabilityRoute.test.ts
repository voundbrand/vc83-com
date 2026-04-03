import { beforeEach, describe, expect, it, vi } from "vitest"

const getOrganizationIdMock = vi.fn()
const getConvexClientMock = vi.fn()
const queryInternalMock = vi.fn()

const resolveSegelschuleRuntimeConfigMock = vi.fn()
const parseBookingStartTimestampMock = vi.fn()
const buildSeatInventoryFromBoatsMock = vi.fn()

vi.mock("@/lib/server-convex", () => ({
  getOrganizationId: getOrganizationIdMock,
  getConvexClient: getConvexClientMock,
  queryInternal: queryInternalMock,
}))

vi.mock("@/lib/booking-platform-bridge", () => ({
  resolveSegelschuleRuntimeConfig: resolveSegelschuleRuntimeConfigMock,
  parseBookingStartTimestamp: parseBookingStartTimestampMock,
}))

vi.mock("@/lib/booking-runtime-contracts", () => ({
  buildSeatInventoryFromBoats: buildSeatInventoryFromBoatsMock,
}))

describe("segelschule availability route", () => {
  beforeEach(() => {
    vi.resetModules()
    getOrganizationIdMock.mockReset()
    getConvexClientMock.mockReset()
    queryInternalMock.mockReset()
    resolveSegelschuleRuntimeConfigMock.mockReset()
    parseBookingStartTimestampMock.mockReset()
    buildSeatInventoryFromBoatsMock.mockReset()
  })

  it("returns backend availability and seat map for selected time", async () => {
    const dayStart = 1_759_507_200_000
    const slot0900 = 1_759_539_600_000
    const slot1300 = 1_759_554_000_000

    getOrganizationIdMock.mockReturnValue("org_123")
    getConvexClientMock.mockReturnValue({})
    resolveSegelschuleRuntimeConfigMock.mockResolvedValue({
      runtimeConfig: {
        timezone: "Europe/Berlin",
        defaultAvailableTimes: ["09:00", "11:00", "13:00"],
        boats: [
          { id: "fraukje", name: "Fraukje", seatCount: 4 },
          { id: "rose", name: "Rose", seatCount: 4 },
        ],
        courses: {
          schnupper: {
            courseId: "schnupper",
            bookingResourceId: "obj_resource_taster",
            bookingDurationMinutes: 180,
            availableTimes: ["09:00", "11:00", "13:00"],
            isMultiDay: false,
          },
        },
      },
      source: "backend_surface_binding",
      bindingId: "binding_surface_1",
      identity: {
        appSlug: "segelschule-altwarp",
        surfaceType: "booking",
        surfaceKey: "default",
      },
      warnings: [],
    })
    buildSeatInventoryFromBoatsMock.mockReturnValue({
      groups: [
        { groupId: "fraukje", label: "Fraukje", capacity: 4 },
        { groupId: "rose", label: "Rose", capacity: 4 },
      ],
      strictSeatSelection: true,
    })
    parseBookingStartTimestampMock.mockImplementation((date: string, time: string) => {
      if (date !== "2026-04-10") {
        return null
      }
      if (time === "00:00") {
        return dayStart
      }
      if (time === "09:00") {
        return slot0900
      }
      if (time === "13:00") {
        return slot1300
      }
      return null
    })

    queryInternalMock.mockImplementation(async (_convex, _ref, args) => {
      if (
        args.organizationId === "org_123"
        && args.resourceId === "obj_resource_taster"
        && !("startDate" in args)
        && !("startDateTime" in args)
      ) {
        return {
          schedules: [
            {
              dayOfWeek: 5,
              startTime: "09:00",
              endTime: "12:00",
              isAvailable: true,
            },
            {
              dayOfWeek: 5,
              startTime: "13:00",
              endTime: "16:00",
              isAvailable: true,
            },
          ],
          exceptions: [],
          blocks: [],
        }
      }
      if (
        args.organizationId === "org_123"
        && args.resourceId === "obj_resource_taster"
        && "startDate" in args
      ) {
        return [
          {
            startTime: "09:00",
          },
        ]
      }
      if (args.resourceId === "obj_resource_taster" && args.startDateTime === slot0900) {
        return {
          totalCapacity: 8,
          bookedParticipants: 2,
          remainingCapacity: 6,
          unassignedParticipants: 0,
          groups: [
            {
              groupId: "fraukje",
              label: "Fraukje",
              capacity: 4,
              bookedSeatNumbers: [1],
              availableSeatNumbers: [2, 3, 4],
            },
            {
              groupId: "rose",
              label: "Rose",
              capacity: 4,
              bookedSeatNumbers: [4],
              availableSeatNumbers: [1, 2, 3],
            },
          ],
        }
      }
      if (args.resourceId === "obj_resource_taster" && args.startDateTime === slot1300) {
        return {
          totalCapacity: 8,
          bookedParticipants: 8,
          remainingCapacity: 0,
          unassignedParticipants: 0,
          groups: [
            {
              groupId: "fraukje",
              label: "Fraukje",
              capacity: 4,
              bookedSeatNumbers: [1, 2, 3, 4],
              availableSeatNumbers: [],
            },
            {
              groupId: "rose",
              label: "Rose",
              capacity: 4,
              bookedSeatNumbers: [1, 2, 3, 4],
              availableSeatNumbers: [],
            },
          ],
        }
      }
      throw new Error(`Unexpected queryInternal args: ${JSON.stringify(args)}`)
    })

    const { POST } = await import(
      "../../../apps/segelschule-altwarp/app/api/booking/availability/route"
    )
    const response = await POST(
      new Request("http://localhost/api/booking/availability", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          courseId: "schnupper",
          date: "2026-04-10",
          time: "09:00",
        }),
      })
    )

    expect(response.status).toBe(200)
    const payload = await response.json()
    expect(payload.ok).toBe(true)
    expect(payload.runtimeConfigSource).toBe("backend_surface_binding")
    expect(payload.runtimeConfigBindingId).toBe("binding_surface_1")
    expect(payload.runtimeConfigWarnings).toEqual([])
    expect(payload.availableTimes).toEqual([
      {
        time: "09:00",
        isAvailable: true,
        availableSeats: 6,
        totalSeats: 8,
      },
      {
        time: "13:00",
        isAvailable: false,
        availableSeats: 0,
        totalSeats: 8,
      },
    ])
    expect(payload.selectedBoatAvailability).toEqual([
      {
        boatId: "fraukje",
        boatName: "Fraukje",
        totalSeats: 4,
        availableSeats: 3,
        seats: [
          { seatNumber: 1, status: "booked" },
          { seatNumber: 2, status: "available" },
          { seatNumber: 3, status: "available" },
          { seatNumber: 4, status: "available" },
        ],
      },
      {
        boatId: "rose",
        boatName: "Rose",
        totalSeats: 4,
        availableSeats: 3,
        seats: [
          { seatNumber: 1, status: "available" },
          { seatNumber: 2, status: "available" },
          { seatNumber: 3, status: "available" },
          { seatNumber: 4, status: "booked" },
        ],
      },
    ])
  })

  it("derives weekday matching in the runtime timezone for Europe/Berlin dates", async () => {
    const berlinMidnightUtc = Date.parse("2026-04-09T22:00:00.000Z")
    const slot0900 = Date.parse("2026-04-10T07:00:00.000Z")

    getOrganizationIdMock.mockReturnValue("org_123")
    getConvexClientMock.mockReturnValue({})
    resolveSegelschuleRuntimeConfigMock.mockResolvedValue({
      runtimeConfig: {
        timezone: "Europe/Berlin",
        defaultAvailableTimes: ["09:00"],
        boats: [{ id: "fraukje", name: "Fraukje", seatCount: 4 }],
        courses: {
          grund: {
            courseId: "grund",
            bookingResourceId: "obj_resource_foundation",
            bookingDurationMinutes: 480,
            availableTimes: ["09:00"],
            isMultiDay: true,
          },
        },
      },
      source: "backend_surface_binding",
      bindingId: "binding_surface_1",
      identity: {
        appSlug: "segelschule-altwarp",
        surfaceType: "booking",
        surfaceKey: "default",
      },
      warnings: [],
    })
    buildSeatInventoryFromBoatsMock.mockReturnValue({
      groups: [{ groupId: "fraukje", label: "Fraukje", capacity: 4 }],
      strictSeatSelection: true,
    })
    parseBookingStartTimestampMock.mockImplementation((date: string, time: string) => {
      if (date !== "2026-04-10") {
        return null
      }
      if (time === "00:00") {
        return berlinMidnightUtc
      }
      if (time === "09:00") {
        return slot0900
      }
      return null
    })

    queryInternalMock.mockImplementation(async (_convex, _ref, args) => {
      if (
        args.organizationId === "org_123"
        && args.resourceId === "obj_resource_foundation"
        && !("startDate" in args)
        && !("startDateTime" in args)
      ) {
        return {
          schedules: [
            {
              dayOfWeek: 5,
              startTime: "09:00",
              endTime: "17:00",
              isAvailable: true,
            },
          ],
          exceptions: [],
          blocks: [],
        }
      }
      if (
        args.organizationId === "org_123"
        && args.resourceId === "obj_resource_foundation"
        && "startDate" in args
      ) {
        return [
          {
            startTime: "09:00",
          },
        ]
      }
      if (
        args.resourceId === "obj_resource_foundation"
        && args.startDateTime === slot0900
      ) {
        return {
          totalCapacity: 4,
          bookedParticipants: 0,
          remainingCapacity: 4,
          unassignedParticipants: 0,
          groups: [
            {
              groupId: "fraukje",
              label: "Fraukje",
              capacity: 4,
              bookedSeatNumbers: [],
              availableSeatNumbers: [1, 2, 3, 4],
            },
          ],
        }
      }
      throw new Error(`Unexpected queryInternal args: ${JSON.stringify(args)}`)
    })

    const { POST } = await import(
      "../../../apps/segelschule-altwarp/app/api/booking/availability/route"
    )
    const response = await POST(
      new Request("http://localhost/api/booking/availability", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          courseId: "grund",
          date: "2026-04-10",
          time: "09:00",
        }),
      })
    )

    expect(response.status).toBe(200)
    const payload = await response.json()
    expect(payload.ok).toBe(true)
    expect(payload.availableTimes).toEqual([
      {
        time: "09:00",
        isAvailable: true,
        availableSeats: 4,
        totalSeats: 4,
      },
    ])
  })

  it("returns 400 for invalid date format", async () => {
    const { POST } = await import(
      "../../../apps/segelschule-altwarp/app/api/booking/availability/route"
    )
    const response = await POST(
      new Request("http://localhost/api/booking/availability", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          courseId: "schnupper",
          date: "10-04-2026",
        }),
      })
    )

    expect(response.status).toBe(400)
    const payload = await response.json()
    expect(payload.error).toMatch(/date must be YYYY-MM-DD/i)
  })
})
