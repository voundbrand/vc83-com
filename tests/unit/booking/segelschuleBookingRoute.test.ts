import { beforeEach, describe, expect, it, vi } from "vitest"

const getOrganizationIdMock = vi.fn()
const getConvexClientMock = vi.fn()
const queryInternalMock = vi.fn()
const mutateInternalMock = vi.fn()
const actionInternalMock = vi.fn()

const checkRateLimitMock = vi.fn()
const resolveClientIpMock = vi.fn()
const createResendClientMock = vi.fn()
const resendSendMock = vi.fn()
const escapeHtmlMock = vi.fn()
const buildBookingConfirmationHtmlMock = vi.fn()
const buildBookingNotificationHtmlMock = vi.fn()

const resolveSegelschuleRuntimeConfigMock = vi.fn()
const normalizeSeatSelectionsMock = vi.fn()
const parseBookingStartTimestampMock = vi.fn()

const buildSeatInventoryFromBoatsMock = vi.fn()
const mapToResourceSeatSelectionsMock = vi.fn()

vi.mock("@/lib/server-convex", () => ({
  getOrganizationId: getOrganizationIdMock,
  getConvexClient: getConvexClientMock,
  queryInternal: queryInternalMock,
  mutateInternal: mutateInternalMock,
  actionInternal: actionInternalMock,
}))

vi.mock("@/lib/email", () => ({
  checkRateLimit: checkRateLimitMock,
  resolveClientIp: resolveClientIpMock,
  createResendClient: createResendClientMock,
  escapeHtml: escapeHtmlMock,
  buildBookingConfirmationHtml: buildBookingConfirmationHtmlMock,
  buildBookingNotificationHtml: buildBookingNotificationHtmlMock,
}))

vi.mock("@/lib/booking-platform-bridge", () => ({
  resolveSegelschuleRuntimeConfig: resolveSegelschuleRuntimeConfigMock,
  normalizeSeatSelections: normalizeSeatSelectionsMock,
  parseBookingStartTimestamp: parseBookingStartTimestampMock,
}))

vi.mock("@/lib/booking-runtime-contracts", () => ({
  buildSeatInventoryFromBoats: buildSeatInventoryFromBoatsMock,
  mapToResourceSeatSelections: mapToResourceSeatSelectionsMock,
}))

const basePayload = {
  course: {
    id: "schnupper",
    title: "Schnupperkurs",
    price: "\u20ac129",
    isMultiDay: false,
  },
  date: "2026-04-10",
  time: "09:00",
  seats: [{ boatId: "fraukje", boatName: "Fraukje", seatNumbers: [1, 2] }],
  totalSeats: 2,
  termsAccepted: true,
  formData: {
    name: "Ada Lovelace",
    email: "ada@example.com",
    phone: "+49 170 000000",
    message: "Bitte vegetarisch",
  },
  paymentMethod: "invoice",
  totalAmount: 258,
  language: "de",
}

function createBookingRequest(payload: Record<string, unknown>) {
  return new Request("http://localhost/api/booking", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  })
}

describe("segelschule booking route", () => {
  beforeEach(() => {
    vi.resetModules()
    delete process.env.SEGELSCHULE_BOOKING_FIXTURE_TOKEN
    getOrganizationIdMock.mockReset()
    getConvexClientMock.mockReset()
    queryInternalMock.mockReset()
    mutateInternalMock.mockReset()
    actionInternalMock.mockReset()
    checkRateLimitMock.mockReset()
    resolveClientIpMock.mockReset()
    createResendClientMock.mockReset()
    escapeHtmlMock.mockReset()
    buildBookingConfirmationHtmlMock.mockReset()
    buildBookingNotificationHtmlMock.mockReset()
    resolveSegelschuleRuntimeConfigMock.mockReset()
    normalizeSeatSelectionsMock.mockReset()
    parseBookingStartTimestampMock.mockReset()
    buildSeatInventoryFromBoatsMock.mockReset()
    mapToResourceSeatSelectionsMock.mockReset()

    getOrganizationIdMock.mockReturnValue("org_123")
    getConvexClientMock.mockReturnValue({})
    checkRateLimitMock.mockReturnValue(true)
    resolveClientIpMock.mockReturnValue("127.0.0.1")
    escapeHtmlMock.mockImplementation((value: string) => value)
    buildBookingConfirmationHtmlMock.mockReturnValue("<p>ok</p>")
    buildBookingNotificationHtmlMock.mockReturnValue("<p>ok</p>")
    resendSendMock.mockReset()
    resendSendMock.mockResolvedValue(undefined)
    createResendClientMock.mockReturnValue({
      emails: {
        send: resendSendMock,
      },
    })
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
            bookingResourceId: "resource_course_1",
            checkoutProductId: "product_seed_ticket",
            checkoutPublicUrl: "https://checkout.example/public",
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
    normalizeSeatSelectionsMock.mockReturnValue({
      selections: [
        { boatId: "fraukje", boatName: "Fraukje", seatNumbers: [1, 2] },
      ],
      totalSeats: 2,
      errors: [],
    })
    parseBookingStartTimestampMock.mockReturnValue(1_760_000_000_000)
    buildSeatInventoryFromBoatsMock.mockReturnValue({
      groups: [
        { groupId: "fraukje", label: "Fraukje", capacity: 4 },
        { groupId: "rose", label: "Rose", capacity: 4 },
      ],
      strictSeatSelection: true,
    })
    mapToResourceSeatSelectionsMock.mockImplementation((selections) =>
      (selections as Array<{ boatId: string; seatNumbers: number[] }>).map(
        (selection) => ({
          groupId: selection.boatId,
          seatNumbers: selection.seatNumbers,
        })
      )
    )
  })

  it("completes fulfillment-backed checkout and preserves compatibility payload keys", async () => {
    const bookingId = "booking_local_1"
    const contactId = "contact_local_1"
    const frontendUserId = "frontend_user_1"
    const platformBookingId = "platform_booking_1"
    const checkoutSessionId = "checkout_session_1"
    const calendarDiagnostics = {
      checkedAt: 1_760_000_050_000,
      linkedConnectionCount: 1,
      writeReadyConnectionCount: 1,
      writeReady: true,
      issues: [],
      recommendations: [],
      connections: [
        {
          connectionId: "oauth_google_1",
          provider: "google",
          status: "active",
          syncEnabled: true,
          canWriteCalendar: true,
          pushCalendarId: "primary",
          writeReady: true,
          issues: [],
        },
      ],
      bookingStatus: "confirmed",
      calendarPushScheduled: true,
      calendarPushScheduledAt: 1_760_000_050_100,
    }

    mutateInternalMock.mockImplementation(async (_convex, _ref, args) => {
      if (args.type === "booking") return bookingId
      if (args.type === "crm_contact") return contactId
      if (args.email && args.firstName && args.organizationId && !args.userId) {
        return frontendUserId
      }
      if (args.userId && args.email && args.organizationId) {
        return { success: true }
      }
      if (args.resourceId && args.startDateTime && args.endDateTime) {
        return { bookingId: platformBookingId, calendarDiagnostics }
      }
      if (args.customerEmail && args.preferredLanguage) {
        return { checkoutSessionId }
      }
      if (args.checkoutSessionId && args.updates) {
        return { success: true }
      }
      if (args.objectId && args.customProperties) {
        return { success: true }
      }
      throw new Error(`Unexpected mutateInternal args: ${JSON.stringify(args)}`)
    })

    queryInternalMock.mockImplementation(async (_convex, _ref, args) => {
      if (args.objectId === "product_seed_ticket") {
        return {
          _id: "product_seed_ticket",
          organizationId: "org_123",
          type: "product",
          subtype: "ticket",
          status: "active",
          customProperties: {
            priceInCents: 12_900,
            currency: "eur",
          },
        }
      }
      if (args.organizationId === "org_123" && args.checkoutSessionId === checkoutSessionId) {
        return {
          _id: "invoice_1",
          organizationId: "org_123",
          type: "invoice",
          subtype: "manual_b2c",
          status: "sent",
          customProperties: {
            invoiceNumber: "SA-1001",
            pdfUrl: "https://example.com/invoices/sa-1001.pdf",
            crmContactId: "crm_contact_checkout_1",
          },
        }
      }
      if (args.checkoutSessionId === checkoutSessionId) {
        return {
          _id: checkoutSessionId,
          customProperties: {
            totalAmount: 25_800,
            currency: "EUR",
            expiresAt: 1_760_086_400_000,
          },
        }
      }
      if (args.organizationId === "org_123" && args.type === "organization_contact") {
        return []
      }
      if (args.organizationId === "org_123" && !args.type && !args.objectId) {
        return {
          _id: "booking_notifications_1",
          organizationId: "org_123",
          type: "organization_settings",
          subtype: "booking_notifications",
          status: "active",
          customProperties: {
            operatorEmails: ["team@example.com"],
          },
        }
      }
      if (args.type === "ticket" && args.organizationId === "org_123") {
        return [
          {
            _id: "ticket_checkout_1",
            organizationId: "org_123",
            type: "ticket",
            subtype: "standard",
            status: "issued",
            createdAt: 1_760_000_100_000,
            updatedAt: 1_760_000_100_000,
            customProperties: {
              checkoutSessionId,
              holderEmail: "ada@example.com",
              holderName: "Ada Lovelace",
              ticketCode: "SA-ABC1234",
            },
          },
        ]
      }
      if (args.objectId === bookingId) {
        return { customProperties: { existing: true } }
      }
      if (args.objectId === platformBookingId) {
        return { customProperties: { existing: true } }
      }
      if (args.objectId === checkoutSessionId) {
        return { customProperties: { existing: true } }
      }
      if (args.objectId === "ticket_checkout_1") {
        return { customProperties: { existing: true } }
      }
      throw new Error(`Unexpected queryInternal args: ${JSON.stringify(args)}`)
    })

    actionInternalMock.mockImplementation(async (_convex, _ref, args) => {
      if (args.organizationId === "org_123" && !args.checkoutSessionId) {
        return {
          apiKey: "re_test_123",
        }
      }
      if (args.checkoutSessionId && args.paymentIntentId && args.paymentMethod) {
        return {
          success: true,
          purchasedItemIds: ["purchase_item_1", "purchase_item_2"],
          crmContactId: "crm_contact_checkout_1",
          paymentId: args.paymentIntentId,
          amount: 25_800,
          currency: "EUR",
          isGuestRegistration: true,
          frontendUserId,
          invoiceType: "manual_b2c",
        }
      }
      if (args.checkoutSessionId === checkoutSessionId && !args.paymentIntentId) {
        return {
          filename: "invoice-sa-1001.pdf",
          content: "YmFzZTY0",
          contentType: "application/pdf",
        }
      }
      throw new Error("resolver unavailable")
    })

    const { POST } = await import(
      "../../../apps/segelschule-altwarp/app/api/booking/route"
    )
    const response = await POST(createBookingRequest(basePayload))

    expect(response.status).toBe(200)
    const payload = await response.json()
    expect(payload.ok).toBe(true)
    expect(payload.bookingId).toBe(bookingId)
    expect(payload.platformBookingId).toBe(platformBookingId)
    expect(payload.calendarDiagnostics).toEqual(calendarDiagnostics)
    expect(payload.checkoutSession).toEqual({
      sessionId: checkoutSessionId,
      clientSecret: null,
      amount: 25_800,
      currency: "EUR",
      expiresAt: 1_760_086_400_000,
      checkoutUrl: null,
    })
    expect(payload.checkoutFulfillment).toEqual({
      success: true,
      purchasedItemIds: ["purchase_item_1", "purchase_item_2"],
      crmContactId: "crm_contact_checkout_1",
      paymentId: "on_site_booking_local_1",
      amount: 25_800,
      currency: "EUR",
      invoiceType: "manual_b2c",
      isGuestRegistration: true,
      frontendUserId: frontendUserId,
      completedInApi: true,
    })
    expect(payload.ticket).toEqual({
      ticketId: "ticket_checkout_1",
      ticketCode: "SA-ABC1234",
      holderEmail: "ada@example.com",
      holderName: "Ada Lovelace",
      lookupUrl: "http://localhost/ticket?code=SA-ABC1234&email=ada%40example.com",
    })
    expect(payload.invoice).toEqual({
      invoiceId: "invoice_1",
      invoiceNumber: "SA-1001",
      status: "sent",
      type: "manual_b2c",
      pdfUrl: "https://example.com/invoices/sa-1001.pdf",
      attachmentReady: true,
    })
    expect(payload.warnings).toEqual([])

    const updateSessionCall = mutateInternalMock.mock.calls.find(
      (call) =>
        typeof call[2]?.checkoutSessionId === "string"
        && Boolean(call[2]?.updates?.selectedProducts)
    )
    expect(updateSessionCall?.[2]?.updates?.selectedProducts?.[0]).toMatchObject({
      productId: "product_seed_ticket",
      quantity: 2,
      totalPrice: 25_800,
    })

    const completionCall = actionInternalMock.mock.calls.find(
      (call) =>
        call[2]?.checkoutSessionId === checkoutSessionId
        && call[2]?.paymentIntentId === "on_site_booking_local_1"
    )
    expect(completionCall?.[2]).toMatchObject({
      paymentMethod: "invoice",
      paymentIntentId: "on_site_booking_local_1",
      skipOrderConfirmationEmail: true,
      skipSalesNotificationEmail: true,
    })

    const customerEmailCall = resendSendMock.mock.calls.find(
      (call) => call[0]?.to === "ada@example.com"
    )
    expect(customerEmailCall?.[0]).toMatchObject({
      attachments: [
        {
          filename: "invoice-sa-1001.pdf",
          content: "YmFzZTY0",
          contentType: "application/pdf",
        },
      ],
    })

    const operatorEmailCall = resendSendMock.mock.calls.find(
      (call) => Array.isArray(call[0]?.to) && call[0].to.includes("team@example.com")
    )
    expect(operatorEmailCall?.[0]?.replyTo).toBe("ada@example.com")
  })

  it("rejects fixture email control requests without the configured secret", async () => {
    process.env.SEGELSCHULE_BOOKING_FIXTURE_TOKEN = "fixture-secret"

    const { POST } = await import(
      "../../../apps/segelschule-altwarp/app/api/booking/route"
    )
    const response = await POST(
      createBookingRequest({
        ...basePayload,
        emailExecutionControl: {
          mode: "capture",
          capturePreviews: true,
        },
      })
    )

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toEqual({
      error: "fixture_email_control_forbidden",
    })
    expect(mutateInternalMock).not.toHaveBeenCalled()
    expect(resendSendMock).not.toHaveBeenCalled()
  })

  it("captures confirmation and operator email previews without sending when fixture control is authorized", async () => {
    process.env.SEGELSCHULE_BOOKING_FIXTURE_TOKEN = "fixture-secret"

    const bookingId = "booking_fixture_1"
    const contactId = "contact_fixture_1"
    const frontendUserId = "frontend_fixture_1"
    const platformBookingId = "platform_fixture_1"
    const checkoutSessionId = "checkout_fixture_1"

    mutateInternalMock.mockImplementation(async (_convex, _ref, args) => {
      if (args.type === "booking") return bookingId
      if (args.type === "crm_contact") return contactId
      if (args.email && args.firstName && args.organizationId && !args.userId) {
        return frontendUserId
      }
      if (args.userId && args.email && args.organizationId) {
        return { success: true }
      }
      if (args.resourceId && args.startDateTime && args.endDateTime) {
        return { bookingId: platformBookingId }
      }
      if (args.customerEmail && args.preferredLanguage) {
        return { checkoutSessionId }
      }
      if (args.checkoutSessionId && args.updates) {
        return { success: true }
      }
      if (args.objectId && args.customProperties) {
        return { success: true }
      }
      throw new Error(`Unexpected mutateInternal args: ${JSON.stringify(args)}`)
    })

    queryInternalMock.mockImplementation(async (_convex, _ref, args) => {
      if (args.objectId === "product_seed_ticket") {
        return {
          _id: "product_seed_ticket",
          organizationId: "org_123",
          type: "product",
          subtype: "ticket",
          status: "active",
          customProperties: {
            priceInCents: 12_900,
            currency: "eur",
          },
        }
      }
      if (args.organizationId === "org_123" && args.checkoutSessionId === checkoutSessionId) {
        return {
          _id: "invoice_fixture_1",
          organizationId: "org_123",
          type: "invoice",
          subtype: "manual_b2c",
          status: "sent",
          customProperties: {
            invoiceNumber: "SA-2001",
            pdfUrl: "https://example.com/invoices/sa-2001.pdf",
            crmContactId: "crm_contact_fixture_1",
          },
        }
      }
      if (args.checkoutSessionId === checkoutSessionId) {
        return {
          _id: checkoutSessionId,
          customProperties: {
            totalAmount: 25_800,
            currency: "EUR",
            expiresAt: 1_760_086_400_000,
          },
        }
      }
      if (args.organizationId === "org_123" && args.type === "organization_contact") {
        return []
      }
      if (args.organizationId === "org_123" && !args.type && !args.objectId) {
        return {
          _id: "booking_notifications_fixture_1",
          organizationId: "org_123",
          type: "organization_settings",
          subtype: "booking_notifications",
          status: "active",
          customProperties: {
            operatorEmails: ["team@example.com"],
          },
        }
      }
      if (args.type === "ticket" && args.organizationId === "org_123") {
        return [
          {
            _id: "ticket_fixture_1",
            organizationId: "org_123",
            type: "ticket",
            subtype: "standard",
            status: "issued",
            createdAt: 1_760_000_100_000,
            updatedAt: 1_760_000_100_000,
            customProperties: {
              checkoutSessionId,
              holderEmail: "ada@example.com",
              holderName: "Ada Lovelace",
              ticketCode: "SA-FIXTURE1",
            },
          },
        ]
      }
      if (args.objectId === bookingId) {
        return { customProperties: { existing: true } }
      }
      if (args.objectId === platformBookingId) {
        return { customProperties: { existing: true } }
      }
      if (args.objectId === checkoutSessionId) {
        return { customProperties: { existing: true } }
      }
      if (args.objectId === "ticket_fixture_1") {
        return { customProperties: { existing: true } }
      }
      throw new Error(`Unexpected queryInternal args: ${JSON.stringify(args)}`)
    })

    actionInternalMock.mockImplementation(async (_convex, _ref, args) => {
      if (args.organizationId === "org_123" && !args.checkoutSessionId) {
        return {
          apiKey: "re_test_fixture",
        }
      }
      if (args.checkoutSessionId && args.paymentIntentId && args.paymentMethod) {
        return {
          success: true,
          purchasedItemIds: ["purchase_item_fixture_1", "purchase_item_fixture_2"],
          crmContactId: "crm_contact_fixture_1",
          paymentId: args.paymentIntentId,
          amount: 25_800,
          currency: "EUR",
          isGuestRegistration: true,
          frontendUserId,
          invoiceType: "manual_b2c",
        }
      }
      if (args.checkoutSessionId === checkoutSessionId && !args.paymentIntentId) {
        return {
          filename: "invoice-sa-2001.pdf",
          content: "YmFzZTY0",
          contentType: "application/pdf",
        }
      }
      throw new Error(`Unexpected actionInternal args: ${JSON.stringify(args)}`)
    })

    const { POST } = await import(
      "../../../apps/segelschule-altwarp/app/api/booking/route"
    )
    const response = await POST(
      new Request("http://localhost/api/booking", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-segelschule-fixture-token": "fixture-secret",
        },
        body: JSON.stringify({
          ...basePayload,
          emailExecutionControl: {
            mode: "capture",
            capturePreviews: true,
            fixtureKey: "fixture-123",
            fixtureLabel: "Codex fixture",
          },
        }),
      })
    )

    expect(response.status).toBe(200)
    const payload = await response.json()
    expect(payload.ok).toBe(true)
    expect(payload.emailDispatch).toMatchObject({
      mode: "capture",
      capturePreviews: true,
      fixtureKey: "fixture-123",
      fixtureLabel: "Codex fixture",
    })
    expect(payload.emailDispatch.previews).toHaveLength(2)
    expect(payload.emailDispatch.previews[0]).toMatchObject({
      kind: "customer_confirmation",
      to: ["ada@example.com"],
      subject: "Buchungsbestätigung - Schnupperkurs",
      html: "<p>ok</p>",
      attachments: [
        {
          filename: "invoice-sa-2001.pdf",
          contentType: "application/pdf",
          base64Length: 8,
        },
      ],
    })
    expect(payload.emailDispatch.previews[1]).toMatchObject({
      kind: "operator_notification",
      to: ["team@example.com"],
      subject: "New Booking: Ada Lovelace - Schnupperkurs",
      html: "<p>ok</p>",
      attachments: [],
    })
    expect(resendSendMock).not.toHaveBeenCalled()
  })

  it("falls back to first ticket product when configured checkout product is not a ticket", async () => {
    resolveSegelschuleRuntimeConfigMock.mockResolvedValueOnce({
      runtimeConfig: {
        timezone: "Europe/Berlin",
        defaultAvailableTimes: ["09:00"],
        boats: [{ id: "fraukje", name: "Fraukje", seatCount: 4 }],
        courses: {
          schnupper: {
            courseId: "schnupper",
            bookingResourceId: "resource_course_1",
            checkoutProductId: "product_wrong_kind",
            bookingDurationMinutes: 180,
            availableTimes: ["09:00"],
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

    mutateInternalMock.mockImplementation(async (_convex, _ref, args) => {
      if (args.type === "booking") return "booking_local_2"
      if (args.type === "crm_contact") return "contact_local_2"
      if (args.email && args.firstName && args.organizationId && !args.userId) {
        return "frontend_user_2"
      }
      if (args.userId && args.email && args.organizationId) {
        return { success: true }
      }
      if (args.resourceId && args.startDateTime && args.endDateTime) {
        return { bookingId: "platform_booking_2" }
      }
      if (args.customerEmail && args.preferredLanguage) {
        return { checkoutSessionId: "checkout_session_2" }
      }
      if (args.checkoutSessionId && args.updates) {
        return { success: true }
      }
      if (args.objectId && args.customProperties) {
        return { success: true }
      }
      throw new Error(`Unexpected mutateInternal args: ${JSON.stringify(args)}`)
    })

    queryInternalMock.mockImplementation(async (_convex, _ref, args) => {
      if (args.objectId === "product_wrong_kind") {
        return {
          _id: "product_wrong_kind",
          organizationId: "org_123",
          type: "product",
          subtype: "digital",
          status: "active",
          customProperties: {},
        }
      }
      if (args.type === "product" && args.organizationId === "org_123") {
        return [
          {
            _id: "product_wrong_kind",
            organizationId: "org_123",
            type: "product",
            subtype: "digital",
            status: "active",
            customProperties: {},
          },
          {
            _id: "product_ticket_fallback",
            organizationId: "org_123",
            type: "product",
            subtype: "ticket",
            status: "active",
            customProperties: {
              currency: "eur",
            },
          },
        ]
      }
      if (args.organizationId === "org_123" && args.checkoutSessionId === "checkout_session_2") {
        return {
          _id: "invoice_2",
          organizationId: "org_123",
          type: "invoice",
          subtype: "manual_b2c",
          status: "sent",
          customProperties: {
            invoiceNumber: "SA-1002",
          },
        }
      }
      if (args.checkoutSessionId === "checkout_session_2") {
        return {
          _id: "checkout_session_2",
          customProperties: {
            totalAmount: 25_800,
            currency: "eur",
            expiresAt: 1_760_086_400_001,
          },
        }
      }
      if (args.type === "ticket" && args.organizationId === "org_123") {
        return [
          {
            _id: "ticket_checkout_2",
            organizationId: "org_123",
            type: "ticket",
            subtype: "standard",
            status: "issued",
            customProperties: {
              checkoutSessionId: "checkout_session_2",
              holderEmail: "ada@example.com",
              holderName: "Ada Lovelace",
              ticketCode: "SA-FALLB42",
            },
          },
        ]
      }
      if (args.organizationId === "org_123" && args.type === "organization_contact") {
        return []
      }
      if (args.organizationId === "org_123" && !args.type && !args.objectId) {
        return null
      }
      if (args.objectId) {
        return { customProperties: {} }
      }
      throw new Error(`Unexpected queryInternal args: ${JSON.stringify(args)}`)
    })

    actionInternalMock.mockImplementation(async (_convex, _ref, args) => {
      if (args.organizationId === "org_123" && !args.checkoutSessionId) {
        return {
          apiKey: "re_test_234",
        }
      }
      if (args.checkoutSessionId && args.paymentIntentId && args.paymentMethod) {
        return {
          success: true,
          purchasedItemIds: ["purchase_item_3"],
          paymentId: args.paymentIntentId,
          amount: 25_800,
          currency: "EUR",
          isGuestRegistration: false,
          invoiceType: "manual_b2c",
        }
      }
      if (args.checkoutSessionId === "checkout_session_2" && !args.paymentIntentId) {
        return {
          filename: "invoice-sa-1002.pdf",
          content: "YmFzZTY0",
          contentType: "application/pdf",
        }
      }
      throw new Error("resolver unavailable")
    })

    const { POST } = await import(
      "../../../apps/segelschule-altwarp/app/api/booking/route"
    )
    const response = await POST(createBookingRequest(basePayload))

    expect(response.status).toBe(200)
    const payload = await response.json()
    expect(payload.checkoutProductId).toBe("product_ticket_fallback")
    expect(payload.ticket?.ticketCode).toBe("SA-FALLB42")
    expect(payload.warnings).toContain("checkout_product_not_ticket_subtype")
    expect(payload.warnings).toContain("checkout_product_fallback_to_ticket")

    const updateSessionCall = mutateInternalMock.mock.calls.find(
      (call) =>
        typeof call[2]?.checkoutSessionId === "string"
        && Boolean(call[2]?.updates?.selectedProducts)
    )
    expect(updateSessionCall?.[2]?.updates?.selectedProducts?.[0]?.productId).toBe(
      "product_ticket_fallback"
    )
  })

  it("returns calendar readiness diagnostics as warnings without failing booking", async () => {
    const calendarDiagnostics = {
      checkedAt: 1_760_000_070_000,
      linkedConnectionCount: 0,
      writeReadyConnectionCount: 0,
      writeReady: false,
      issues: ["calendar_links_missing", "calendar_links_not_write_ready"],
      recommendations: [
        "Link at least one Google or Microsoft calendar connection to this resource (or org default calendar settings) before go-live.",
      ],
      connections: [],
      bookingStatus: "confirmed",
      calendarPushScheduled: true,
      calendarPushScheduledAt: 1_760_000_070_111,
    }

    mutateInternalMock.mockImplementation(async (_convex, _ref, args) => {
      if (args.type === "booking") return "booking_local_cal_1"
      if (args.type === "crm_contact") return "contact_local_cal_1"
      if (args.email && args.firstName && args.organizationId && !args.userId) {
        return "frontend_user_cal_1"
      }
      if (args.userId && args.email && args.organizationId) {
        return { success: true }
      }
      if (args.resourceId && args.startDateTime && args.endDateTime) {
        return { bookingId: "platform_booking_cal_1", calendarDiagnostics }
      }
      if (args.customerEmail && args.preferredLanguage) {
        return { checkoutSessionId: "checkout_session_cal_1" }
      }
      if (args.checkoutSessionId && args.updates) {
        return { success: true }
      }
      if (args.objectId && args.customProperties) {
        return { success: true }
      }
      throw new Error(`Unexpected mutateInternal args: ${JSON.stringify(args)}`)
    })

    queryInternalMock.mockImplementation(async (_convex, _ref, args) => {
      if (args.objectId === "product_seed_ticket") {
        return {
          _id: "product_seed_ticket",
          organizationId: "org_123",
          type: "product",
          subtype: "ticket",
          status: "active",
          customProperties: {},
        }
      }
      if (args.organizationId === "org_123" && args.checkoutSessionId === "checkout_session_cal_1") {
        return {
          _id: "invoice_cal_1",
          organizationId: "org_123",
          type: "invoice",
          subtype: "manual_b2c",
          status: "sent",
          customProperties: {
            invoiceNumber: "SA-1003",
          },
        }
      }
      if (args.checkoutSessionId === "checkout_session_cal_1") {
        return {
          _id: "checkout_session_cal_1",
          customProperties: {
            totalAmount: 25_800,
            currency: "EUR",
            expiresAt: 1_760_086_400_003,
          },
        }
      }
      if (args.type === "ticket" && args.organizationId === "org_123") {
        return [
          {
            _id: "ticket_checkout_cal_1",
            organizationId: "org_123",
            type: "ticket",
            subtype: "standard",
            status: "issued",
            customProperties: {
              checkoutSessionId: "checkout_session_cal_1",
              holderEmail: "ada@example.com",
              holderName: "Ada Lovelace",
              ticketCode: "SA-CALN001",
            },
          },
        ]
      }
      if (args.organizationId === "org_123" && args.type === "organization_contact") {
        return []
      }
      if (args.organizationId === "org_123" && !args.type && !args.objectId) {
        return null
      }
      if (args.objectId) {
        return { customProperties: {} }
      }
      throw new Error(`Unexpected queryInternal args: ${JSON.stringify(args)}`)
    })

    actionInternalMock.mockImplementation(async (_convex, _ref, args) => {
      if (args.organizationId === "org_123" && !args.checkoutSessionId) {
        return {
          apiKey: "re_test_345",
        }
      }
      if (args.checkoutSessionId && args.paymentIntentId && args.paymentMethod) {
        return {
          success: true,
          purchasedItemIds: ["purchase_item_cal_1"],
          paymentId: args.paymentIntentId,
          amount: 25_800,
          currency: "EUR",
          isGuestRegistration: false,
          invoiceType: "manual_b2c",
        }
      }
      if (args.checkoutSessionId === "checkout_session_cal_1" && !args.paymentIntentId) {
        return {
          filename: "invoice-sa-1003.pdf",
          content: "YmFzZTY0",
          contentType: "application/pdf",
        }
      }
      throw new Error("resolver unavailable")
    })

    const { POST } = await import(
      "../../../apps/segelschule-altwarp/app/api/booking/route"
    )
    const response = await POST(createBookingRequest(basePayload))

    expect(response.status).toBe(200)
    const payload = await response.json()
    expect(payload.ok).toBe(true)
    expect(payload.calendarDiagnostics).toEqual(calendarDiagnostics)
    expect(payload.warnings).toContain("calendar_not_write_ready")
    expect(payload.warnings).toContain("calendar_links_missing")
    expect(payload.warnings).toContain("calendar_links_not_write_ready")
  })

  it("does not hard-fail when checkout-session linking patch fails", async () => {
    mutateInternalMock.mockImplementation(async (_convex, _ref, args) => {
      if (args.type === "booking") return "booking_local_3"
      if (args.type === "crm_contact") return "contact_local_3"
      if (args.email && args.firstName && args.organizationId && !args.userId) {
        return "frontend_user_3"
      }
      if (args.userId && args.email && args.organizationId) {
        return { success: true }
      }
      if (args.resourceId && args.startDateTime && args.endDateTime) {
        return { bookingId: "platform_booking_3" }
      }
      if (args.customerEmail && args.preferredLanguage) {
        return { checkoutSessionId: "checkout_session_3" }
      }
      if (args.checkoutSessionId && args.updates) {
        return { success: true }
      }
      if (args.objectId === "checkout_session_3" && args.customProperties) {
        throw new Error("simulated patch failure")
      }
      if (args.objectId && args.customProperties) {
        return { success: true }
      }
      throw new Error(`Unexpected mutateInternal args: ${JSON.stringify(args)}`)
    })

    queryInternalMock.mockImplementation(async (_convex, _ref, args) => {
      if (args.objectId === "product_seed_ticket") {
        return {
          _id: "product_seed_ticket",
          organizationId: "org_123",
          type: "product",
          subtype: "ticket",
          status: "active",
          customProperties: {},
        }
      }
      if (args.organizationId === "org_123" && args.checkoutSessionId === "checkout_session_3") {
        return {
          _id: "invoice_3",
          organizationId: "org_123",
          type: "invoice",
          subtype: "manual_b2c",
          status: "sent",
          customProperties: {
            invoiceNumber: "SA-1004",
          },
        }
      }
      if (args.checkoutSessionId === "checkout_session_3") {
        return {
          _id: "checkout_session_3",
          customProperties: {
            totalAmount: 25_800,
            currency: "EUR",
            expiresAt: 1_760_086_400_002,
          },
        }
      }
      if (args.type === "ticket" && args.organizationId === "org_123") {
        return [
          {
            _id: "ticket_checkout_3",
            organizationId: "org_123",
            type: "ticket",
            subtype: "standard",
            status: "issued",
            customProperties: {
              checkoutSessionId: "checkout_session_3",
              holderEmail: "ada@example.com",
              holderName: "Ada Lovelace",
              ticketCode: "SA-LINKF33",
            },
          },
        ]
      }
      if (args.organizationId === "org_123" && args.type === "organization_contact") {
        return []
      }
      if (args.organizationId === "org_123" && !args.type && !args.objectId) {
        return null
      }
      if (args.objectId) {
        return { customProperties: {} }
      }
      throw new Error(`Unexpected queryInternal args: ${JSON.stringify(args)}`)
    })

    actionInternalMock.mockImplementation(async (_convex, _ref, args) => {
      if (args.organizationId === "org_123" && !args.checkoutSessionId) {
        return {
          apiKey: "re_test_456",
        }
      }
      if (args.checkoutSessionId && args.paymentIntentId && args.paymentMethod) {
        return {
          success: true,
          purchasedItemIds: ["purchase_item_4"],
          paymentId: args.paymentIntentId,
          amount: 25_800,
          currency: "EUR",
          isGuestRegistration: false,
          invoiceType: "manual_b2c",
        }
      }
      if (args.checkoutSessionId === "checkout_session_3" && !args.paymentIntentId) {
        return {
          filename: "invoice-sa-1004.pdf",
          content: "YmFzZTY0",
          contentType: "application/pdf",
        }
      }
      throw new Error("resolver unavailable")
    })

    const { POST } = await import(
      "../../../apps/segelschule-altwarp/app/api/booking/route"
    )
    const response = await POST(createBookingRequest(basePayload))

    expect(response.status).toBe(200)
    const payload = await response.json()
    expect(payload.ok).toBe(true)
    expect(payload.warnings).toContain("checkout_session_context_link_failed")
  })

  it("requires terms acceptance for booking submission", async () => {
    const { POST } = await import(
      "../../../apps/segelschule-altwarp/app/api/booking/route"
    )
    const response = await POST(
      createBookingRequest({
        ...basePayload,
        termsAccepted: false,
      })
    )

    expect(response.status).toBe(400)
    const payload = await response.json()
    expect(payload.error).toMatch(/terms acceptance/i)
  })

  it("accepts payloads without paymentMethod and defaults fulfillment to invoice", async () => {
    mutateInternalMock.mockImplementation(async (_convex, _ref, args) => {
      if (args.type === "booking") return "booking_local_4"
      if (args.type === "crm_contact") return "contact_local_4"
      if (args.email && args.firstName && args.organizationId && !args.userId) {
        return "frontend_user_4"
      }
      if (args.userId && args.email && args.organizationId) {
        return { success: true }
      }
      if (args.resourceId && args.startDateTime && args.endDateTime) {
        return { bookingId: "platform_booking_4" }
      }
      if (args.customerEmail && args.preferredLanguage) {
        return { checkoutSessionId: "checkout_session_4" }
      }
      if (args.checkoutSessionId && args.updates) {
        return { success: true }
      }
      if (args.objectId && args.customProperties) {
        return { success: true }
      }
      throw new Error(`Unexpected mutateInternal args: ${JSON.stringify(args)}`)
    })

    queryInternalMock.mockImplementation(async (_convex, _ref, args) => {
      if (args.objectId === "product_seed_ticket") {
        return {
          _id: "product_seed_ticket",
          organizationId: "org_123",
          type: "product",
          subtype: "ticket",
          status: "active",
          customProperties: {},
        }
      }
      if (args.organizationId === "org_123" && args.checkoutSessionId === "checkout_session_4") {
        return {
          _id: "invoice_4",
          organizationId: "org_123",
          type: "invoice",
          subtype: "manual_b2c",
          status: "sent",
          customProperties: {
            invoiceNumber: "SA-1005",
          },
        }
      }
      if (args.checkoutSessionId === "checkout_session_4") {
        return {
          _id: "checkout_session_4",
          customProperties: {
            totalAmount: 25_800,
            currency: "EUR",
            expiresAt: 1_760_086_400_004,
          },
        }
      }
      if (args.type === "ticket" && args.organizationId === "org_123") {
        return [
          {
            _id: "ticket_checkout_4",
            organizationId: "org_123",
            type: "ticket",
            subtype: "standard",
            status: "issued",
            customProperties: {
              checkoutSessionId: "checkout_session_4",
              holderEmail: "ada@example.com",
              holderName: "Ada Lovelace",
              ticketCode: "SA-INVC444",
            },
          },
        ]
      }
      if (args.organizationId === "org_123" && args.type === "organization_contact") {
        return []
      }
      if (args.organizationId === "org_123" && !args.type && !args.objectId) {
        return null
      }
      if (args.objectId) {
        return { customProperties: {} }
      }
      throw new Error(`Unexpected queryInternal args: ${JSON.stringify(args)}`)
    })

    actionInternalMock.mockImplementation(async (_convex, _ref, args) => {
      if (args.organizationId === "org_123" && !args.checkoutSessionId) {
        return {
          apiKey: "re_test_567",
        }
      }
      if (args.checkoutSessionId && args.paymentIntentId && args.paymentMethod) {
        return {
          success: true,
          purchasedItemIds: ["purchase_item_5"],
          paymentId: args.paymentIntentId,
          amount: 25_800,
          currency: "EUR",
          isGuestRegistration: false,
          invoiceType: "manual_b2c",
        }
      }
      if (args.checkoutSessionId === "checkout_session_4" && !args.paymentIntentId) {
        return {
          filename: "invoice-sa-1005.pdf",
          content: "YmFzZTY0",
          contentType: "application/pdf",
        }
      }
      throw new Error("resolver unavailable")
    })

    const payloadWithoutPaymentMethod = { ...basePayload } as Record<
      string,
      unknown
    >
    delete payloadWithoutPaymentMethod.paymentMethod

    const { POST } = await import(
      "../../../apps/segelschule-altwarp/app/api/booking/route"
    )
    const response = await POST(createBookingRequest(payloadWithoutPaymentMethod))

    expect(response.status).toBe(200)
    const payload = await response.json()
    expect(payload.ok).toBe(true)

    const completionCall = actionInternalMock.mock.calls.find(
      (call) => call[2]?.checkoutSessionId === "checkout_session_4"
    )
    expect(completionCall?.[2]).toMatchObject({
      paymentMethod: "invoice",
      paymentIntentId: "on_site_booking_local_4",
    })
  })
})
