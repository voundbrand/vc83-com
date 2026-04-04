import { beforeEach, describe, expect, it, vi } from "vitest"

const resolveSegelschuleOrganizationIdMock = vi.fn()
const getConvexClientMock = vi.fn()
const queryInternalMock = vi.fn()

const resolveSegelschuleBookingCourseMock = vi.fn()
const parseBookingStartTimestampMock = vi.fn()
const resolveSlotSeatInventoryMock = vi.fn()

vi.mock("@/lib/server-convex", () => ({
  resolveSegelschuleOrganizationId: resolveSegelschuleOrganizationIdMock,
  getConvexClient: getConvexClientMock,
  queryInternal: queryInternalMock,
}))

vi.mock("@/lib/booking-platform-bridge", () => ({
  resolveSegelschuleBookingCourse: resolveSegelschuleBookingCourseMock,
  parseBookingStartTimestamp: parseBookingStartTimestampMock,
}))

vi.mock("@/lib/seat-group-availability", () => ({
  resolveSlotSeatInventory: resolveSlotSeatInventoryMock,
}))

describe("segelschule availability route", () => {
  beforeEach(() => {
    vi.resetModules()
    resolveSegelschuleOrganizationIdMock.mockReset()
    getConvexClientMock.mockReset()
    queryInternalMock.mockReset()
    resolveSegelschuleBookingCourseMock.mockReset()
    parseBookingStartTimestampMock.mockReset()
    resolveSlotSeatInventoryMock.mockReset()
  })

  it("returns backend availability and seat map for selected time", async () => {
    const dayStart = 1_759_507_200_000
    const slot0900 = 1_759_539_600_000
    const slot1300 = 1_759_554_000_000

    resolveSegelschuleOrganizationIdMock.mockResolvedValue("org_123")
    getConvexClientMock.mockReturnValue({})
    resolveSegelschuleBookingCourseMock.mockResolvedValue({
      runtimeResolution: {
        runtimeConfig: {
          timezone: "Europe/Berlin",
          defaultAvailableTimes: ["09:00", "11:00", "13:00"],
          boats: [
            { id: "fraukje", name: "Fraukje", seatCount: 4 },
            { id: "rose", name: "Rose", seatCount: 4 },
          ],
          courses: {},
        },
        source: "backend_surface_binding",
        bindingId: "binding_surface_1",
        identity: {
          appSlug: "segelschule-altwarp",
          surfaceType: "booking",
          surfaceKey: "default",
        },
        warnings: [],
      },
      boats: [
        { id: "fraukje", name: "Fraukje", seatCount: 4 },
        { id: "rose", name: "Rose", seatCount: 4 },
      ],
      courses: [],
      requestedCourseId: "schnupper",
      resolvedCourseId: "schnupper",
      course: {
        courseId: "schnupper",
        aliases: ["schnupper"],
        title: "Schnupperkurs",
        description: "Intro course",
        durationLabel: "3 Stunden",
        durationMinutes: 180,
        priceInCents: 12_900,
        currency: "EUR",
        isMultiDay: false,
        checkoutProductId: "obj_checkout_taster",
        bookingResourceId: "obj_resource_taster",
        bookingResourceName: "Schnupperkurs",
        bookingResourceSubtype: "class",
        fulfillmentType: "ticket",
        availableTimes: ["09:00", "11:00", "13:00"],
        checkoutPublicUrl: null,
        warnings: [],
      },
    })
    resolveSlotSeatInventoryMock.mockResolvedValue({
      availableBoats: [
        { id: "fraukje", name: "Fraukje", seatCount: 4 },
        { id: "rose", name: "Rose", seatCount: 4 },
      ],
      seatInventory: {
        groups: [
          { groupId: "fraukje", label: "Fraukje", capacity: 4 },
          { groupId: "rose", label: "Rose", capacity: 4 },
        ],
        strictSeatSelection: true,
      },
      availableGroupIds: ["fraukje", "rose"],
      unavailableGroupIds: [],
      hasLinkedAvailabilityGroups: true,
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

    resolveSegelschuleOrganizationIdMock.mockResolvedValue("org_123")
    getConvexClientMock.mockReturnValue({})
    resolveSegelschuleBookingCourseMock.mockResolvedValue({
      runtimeResolution: {
        runtimeConfig: {
          timezone: "Europe/Berlin",
          defaultAvailableTimes: ["09:00"],
          boats: [{ id: "fraukje", name: "Fraukje", seatCount: 4 }],
          courses: {},
        },
        source: "backend_surface_binding",
        bindingId: "binding_surface_1",
        identity: {
          appSlug: "segelschule-altwarp",
          surfaceType: "booking",
          surfaceKey: "default",
        },
        warnings: [],
      },
      boats: [{ id: "fraukje", name: "Fraukje", seatCount: 4 }],
      courses: [],
      requestedCourseId: "grund",
      resolvedCourseId: "grund",
      course: {
        courseId: "grund",
        aliases: ["grund", "wochenende"],
        title: "Wochenendkurs",
        description: "Foundation course",
        durationLabel: "2 Tage",
        durationMinutes: 480,
        priceInCents: 19_900,
        currency: "EUR",
        isMultiDay: true,
        checkoutProductId: "obj_checkout_foundation",
        bookingResourceId: "obj_resource_foundation",
        bookingResourceName: "Wochenendkurs",
        bookingResourceSubtype: "class",
        fulfillmentType: "ticket",
        availableTimes: ["09:00"],
        checkoutPublicUrl: null,
        warnings: [],
      },
    })
    resolveSlotSeatInventoryMock.mockResolvedValue({
      availableBoats: [{ id: "fraukje", name: "Fraukje", seatCount: 4 }],
      seatInventory: {
        groups: [{ groupId: "fraukje", label: "Fraukje", capacity: 4 }],
        strictSeatSelection: true,
      },
      availableGroupIds: ["fraukje"],
      unavailableGroupIds: [],
      hasLinkedAvailabilityGroups: true,
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

  it("collapses the slot to one boat when the second linked boat is unavailable", async () => {
    const dayStart = Date.parse("2026-04-10T00:00:00.000Z")
    const slot0900 = Date.parse("2026-04-10T09:00:00.000Z")

    resolveSegelschuleOrganizationIdMock.mockResolvedValue("org_123")
    getConvexClientMock.mockReturnValue({})
    resolveSegelschuleBookingCourseMock.mockResolvedValue({
      runtimeResolution: {
        runtimeConfig: {
          timezone: "Europe/Berlin",
          defaultAvailableTimes: ["09:00"],
          boats: [
            { id: "fraukje", name: "Fraukje", seatCount: 4 },
            { id: "rose", name: "Rose", seatCount: 4 },
          ],
          courses: {},
        },
        source: "backend_surface_binding",
        bindingId: "binding_surface_1",
        identity: {
          appSlug: "segelschule-altwarp",
          surfaceType: "booking",
          surfaceKey: "default",
        },
        warnings: [],
      },
      boats: [
        { id: "fraukje", name: "Fraukje", seatCount: 4 },
        { id: "rose", name: "Rose", seatCount: 4 },
      ],
      courses: [],
      requestedCourseId: "schnupper",
      resolvedCourseId: "schnupper",
      course: {
        courseId: "schnupper",
        aliases: ["schnupper"],
        title: "Schnupperkurs",
        description: "Intro course",
        durationLabel: "3 Stunden",
        durationMinutes: 180,
        priceInCents: 12_900,
        currency: "EUR",
        isMultiDay: false,
        checkoutProductId: "obj_checkout_taster",
        bookingResourceId: "obj_resource_taster",
        bookingResourceName: "Schnupperkurs",
        bookingResourceSubtype: "class",
        fulfillmentType: "ticket",
        availableTimes: ["09:00"],
        checkoutPublicUrl: null,
        warnings: [],
      },
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
      return null
    })
    resolveSlotSeatInventoryMock.mockResolvedValue({
      availableBoats: [{ id: "rose", name: "Rose", seatCount: 4 }],
      seatInventory: {
        groups: [{ groupId: "rose", label: "Rose", capacity: 4 }],
        strictSeatSelection: true,
      },
      availableGroupIds: ["rose"],
      unavailableGroupIds: ["fraukje"],
      hasLinkedAvailabilityGroups: true,
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
        return [{ startTime: "09:00" }]
      }
      if (args.resourceId === "obj_resource_taster" && args.startDateTime === slot0900) {
        return {
          totalCapacity: 4,
          bookedParticipants: 0,
          remainingCapacity: 4,
          unassignedParticipants: 0,
          groups: [
            {
              groupId: "rose",
              label: "Rose",
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
          courseId: "schnupper",
          date: "2026-04-10",
          time: "09:00",
        }),
      })
    )

    expect(response.status).toBe(200)
    const payload = await response.json()
    expect(payload.availableTimes).toEqual([
      {
        time: "09:00",
        isAvailable: true,
        availableSeats: 4,
        totalSeats: 4,
      },
    ])
    expect(payload.selectedBoatAvailability).toEqual([
      {
        boatId: "rose",
        boatName: "Rose",
        totalSeats: 4,
        availableSeats: 4,
        seats: [
          { seatNumber: 1, status: "available" },
          { seatNumber: 2, status: "available" },
          { seatNumber: 3, status: "available" },
          { seatNumber: 4, status: "available" },
        ],
      },
    ])
  })
})
