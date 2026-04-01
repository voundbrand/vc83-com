import { beforeEach, describe, expect, it, vi } from "vitest"

const getOrganizationIdMock = vi.fn()
const getConvexClientMock = vi.fn()
const queryInternalMock = vi.fn()

const checkRateLimitMock = vi.fn()
const resolveClientIpMock = vi.fn()

vi.mock("@/lib/server-convex", () => ({
  getOrganizationId: getOrganizationIdMock,
  getConvexClient: getConvexClientMock,
  queryInternal: queryInternalMock,
}))

vi.mock("@/lib/email", () => ({
  checkRateLimit: checkRateLimitMock,
  resolveClientIp: resolveClientIpMock,
}))

describe("segelschule ticket lookup route", () => {
  beforeEach(() => {
    vi.resetModules()
    getOrganizationIdMock.mockReset()
    getConvexClientMock.mockReset()
    queryInternalMock.mockReset()
    checkRateLimitMock.mockReset()
    resolveClientIpMock.mockReset()

    getOrganizationIdMock.mockReturnValue("org_123")
    getConvexClientMock.mockReturnValue({})
    checkRateLimitMock.mockReturnValue(true)
    resolveClientIpMock.mockReturnValue("127.0.0.1")
  })

  it("returns ticket and booking context for matching code/email", async () => {
    queryInternalMock.mockImplementation(async (_convex, _ref, args) => {
      if (args.type === "ticket" && args.organizationId === "org_123") {
        return [
          {
            _id: "ticket_1",
            organizationId: "org_123",
            type: "ticket",
            status: "issued",
            createdAt: 1_760_000_000_000,
            updatedAt: 1_760_000_000_001,
            customProperties: {
              ticketCode: "SA-ABC1234",
              holderEmail: "ada@example.com",
              holderName: "Ada Lovelace",
              sourceBookingId: "booking_local_1",
              checkoutSessionId: "checkout_session_1",
              packingList: "Segeljacke, Sonnencreme, Wasser",
            },
          },
        ]
      }
      if (args.objectId === "booking_local_1") {
        return {
          _id: "booking_local_1",
          customProperties: {
            courseName: "Schnupperkurs",
            date: "2026-04-10",
            time: "09:00",
            totalSeats: 2,
            seats: [
              {
                boatName: "Fraukje",
                seatNumbers: [1, 2],
              },
            ],
            weatherInfo: "Leichter Wind aus Nordwest.",
          },
        }
      }
      throw new Error(`Unexpected query args: ${JSON.stringify(args)}`)
    })

    const { GET } = await import(
      "../../../apps/segelschule-altwarp/app/api/ticket/route"
    )
    const response = await GET(
      new Request(
        "http://localhost/api/ticket?code=sa-abc1234&email=ADA%40example.com"
      )
    )

    expect(response.status).toBe(200)
    const payload = await response.json()
    expect(payload.ok).toBe(true)
    expect(payload.ticket).toMatchObject({
      ticketCode: "SA-ABC1234",
      holderEmail: "ada@example.com",
      holderName: "Ada Lovelace",
    })
    expect(payload.booking).toMatchObject({
      bookingId: "booking_local_1",
      courseName: "Schnupperkurs",
      date: "2026-04-10",
      time: "09:00",
      totalSeats: 2,
    })
    expect(payload.notes).toMatchObject({
      packingList: "Segeljacke, Sonnencreme, Wasser",
      weatherInfo: "Leichter Wind aus Nordwest.",
    })
  })

  it("returns 404 when no matching ticket exists", async () => {
    queryInternalMock.mockResolvedValueOnce([
      {
        _id: "ticket_2",
        organizationId: "org_123",
        type: "ticket",
        status: "issued",
        customProperties: {
          ticketCode: "SA-XYZ9876",
          holderEmail: "someone@example.com",
        },
      },
    ])

    const { GET } = await import(
      "../../../apps/segelschule-altwarp/app/api/ticket/route"
    )
    const response = await GET(
      new Request(
        "http://localhost/api/ticket?code=SA-ABC1234&email=ada%40example.com"
      )
    )

    expect(response.status).toBe(404)
    const payload = await response.json()
    expect(payload.error).toBe("ticket_not_found")
  })

  it("returns 429 when lookup rate limit is exceeded", async () => {
    checkRateLimitMock.mockReturnValueOnce(false)
    const { GET } = await import(
      "../../../apps/segelschule-altwarp/app/api/ticket/route"
    )
    const response = await GET(
      new Request(
        "http://localhost/api/ticket?code=SA-ABC1234&email=ada%40example.com"
      )
    )

    expect(response.status).toBe(429)
    const payload = await response.json()
    expect(payload.error).toBe("rate_limited")
  })
})
