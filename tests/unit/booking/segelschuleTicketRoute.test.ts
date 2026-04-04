import { beforeEach, describe, expect, it, vi } from "vitest"

const resolveSegelschuleOrganizationIdMock = vi.fn()
const getConvexClientMock = vi.fn()
const queryInternalMock = vi.fn()

const checkRateLimitMock = vi.fn()
const resolveClientIpMock = vi.fn()

vi.mock("@/lib/server-convex", () => ({
  resolveSegelschuleOrganizationId: resolveSegelschuleOrganizationIdMock,
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
    resolveSegelschuleOrganizationIdMock.mockReset()
    getConvexClientMock.mockReset()
    queryInternalMock.mockReset()
    checkRateLimitMock.mockReset()
    resolveClientIpMock.mockReset()

    resolveSegelschuleOrganizationIdMock.mockResolvedValue("org_123")
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
      if (args.type === "invoice") {
        return []
      }
      if (args.type === "transaction") {
        return []
      }
      if (args.objectId === "booking_local_1") {
        return {
          _id: "booking_local_1",
          customProperties: {
            primaryTransactionId: "transaction_1",
            invoiceId: "invoice_1",
            courseName: "Schnupperkurs",
            courseDescription: "Erster Einstieg auf dem Wasser.",
            courseDurationLabel: "3 Stunden",
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
      if (args.objectId === "checkout_session_1") {
        return {
          _id: "checkout_session_1",
          status: "completed",
          customProperties: {
            paymentMethod: "invoice",
            totalAmount: 25_800,
            currency: "EUR",
          },
        }
      }
      if (args.objectId === "transaction_1") {
        return {
          _id: "transaction_1",
          status: "completed",
          subtype: "ticket_purchase",
          customProperties: {
            checkoutSessionId: "checkout_session_1",
            totalInCents: 25_800,
            currency: "EUR",
            lineItems: [
              {
                productId: "product_schnupper",
                productName: "Schnupperkurs",
                productSubtype: "ticket",
                quantity: 2,
                totalPriceInCents: 25_800,
              },
            ],
          },
        }
      }
      if (args.objectId === "invoice_1") {
        return {
          _id: "invoice_1",
          status: "sent",
          customProperties: {
            invoiceNumber: "SA-1001",
            pdfUrl: "https://example.com/invoices/sa-1001.pdf",
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
      courseDescription: "Erster Einstieg auf dem Wasser.",
      durationLabel: "3 Stunden",
      date: "2026-04-10",
      time: "09:00",
      totalSeats: 2,
    })
    expect(payload.commercial).toMatchObject({
      checkoutSessionId: "checkout_session_1",
      paymentMethod: "invoice",
      totalAmountCents: 25_800,
      currency: "EUR",
      transactionId: "transaction_1",
      transactionStatus: "completed",
      invoiceNumber: "SA-1001",
      invoicePdfUrl: "https://example.com/invoices/sa-1001.pdf",
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

  it("prefers the booking total when transaction aggregates drift by a cent", async () => {
    queryInternalMock.mockImplementation(async (_convex, _ref, args) => {
      if (args.type === "ticket" && args.organizationId === "org_123") {
        return [
          {
            _id: "ticket_1",
            organizationId: "org_123",
            type: "ticket",
            status: "issued",
            customProperties: {
              ticketCode: "SA-ABC1234",
              holderEmail: "ada@example.com",
              sourceBookingId: "booking_local_1",
              checkoutSessionId: "checkout_session_1",
            },
          },
        ]
      }
      if (args.objectId === "booking_local_1") {
        return {
          _id: "booking_local_1",
          customProperties: {
            primaryTransactionId: "transaction_1",
            invoiceId: "invoice_1",
            totalAmountCents: 25_800,
          },
        }
      }
      if (args.objectId === "checkout_session_1") {
        return {
          _id: "checkout_session_1",
          customProperties: {
            totalAmount: 25_799,
            currency: "EUR",
          },
        }
      }
      if (args.objectId === "transaction_1") {
        return {
          _id: "transaction_1",
          status: "completed",
          customProperties: {
            checkoutSessionId: "checkout_session_1",
            totalInCents: 25_799,
            currency: "EUR",
          },
        }
      }
      if (args.objectId === "invoice_1") {
        return {
          _id: "invoice_1",
          status: "sent",
          customProperties: {
            totalInCents: 25_799,
          },
        }
      }
      return null
    })

    const { GET } = await import(
      "../../../apps/segelschule-altwarp/app/api/ticket/route"
    )
    const response = await GET(
      new Request(
        "http://localhost/api/ticket?code=SA-ABC1234&email=ada%40example.com"
      )
    )

    expect(response.status).toBe(200)
    const payload = await response.json()
    expect(payload.commercial.totalAmountCents).toBe(25_800)
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
