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
    getOrganizationIdMock.mockReturnValue("org_123")
    getConvexClientMock.mockReturnValue({})
    resolveSegelschuleRuntimeConfigMock.mockResolvedValue({
      runtimeConfig: {
        timezone: "Europe/Berlin",
        defaultAvailableTimes: ["09:00", "13:00"],
        boats: [
          { id: "fraukje", name: "Fraukje", seatCount: 4 },
          { id: "rose", name: "Rose", seatCount: 4 },
        ],
        courses: {
          schnupper: {
            courseId: "schnupper",
            bookingResourceId: "obj_resource_taster",
            bookingDurationMinutes: 180,
            availableTimes: ["09:00", "13:00"],
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
    parseBookingStartTimestampMock
      .mockReturnValueOnce(1_760_000_000_000)
      .mockReturnValueOnce(1_760_010_000_000)

    queryInternalMock
      .mockResolvedValueOnce({
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
      })
      .mockResolvedValueOnce({
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
