import { beforeEach, describe, expect, it, vi } from "vitest"

const resolveSegelschuleOrganizationIdMock = vi.fn()
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

const resolveSegelschuleBookingCourseMock = vi.fn()
const normalizeSeatSelectionsMock = vi.fn()
const parseBookingStartTimestampMock = vi.fn()
const resolveSlotSeatInventoryMock = vi.fn()
const mapToResourceSeatSelectionsMock = vi.fn()

vi.mock("@/lib/server-convex", () => ({
  resolveSegelschuleOrganizationId: resolveSegelschuleOrganizationIdMock,
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
  resolveSegelschuleBookingCourse: resolveSegelschuleBookingCourseMock,
  normalizeSeatSelections: normalizeSeatSelectionsMock,
  parseBookingStartTimestamp: parseBookingStartTimestampMock,
}))

vi.mock("@/lib/booking-runtime-contracts", () => ({
  mapToResourceSeatSelections: mapToResourceSeatSelectionsMock,
}))

vi.mock("@/lib/seat-group-availability", () => ({
  resolveSlotSeatInventory: resolveSlotSeatInventoryMock,
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

function buildCourseResolution(args?: {
  courseId?: string
  aliases?: string[]
  title?: string
  description?: string
  durationLabel?: string
  durationMinutes?: number
  priceInCents?: number
  currency?: string
  isMultiDay?: boolean
  checkoutProductId?: string
  bookingResourceId?: string
  fulfillmentType?: string
  availableTimes?: string[]
  runtimeWarnings?: string[]
  courseWarnings?: string[]
  bindingId?: string
}) {
  const courseId = args?.courseId || "schnupper"
  const availableTimes = args?.availableTimes || ["09:00", "13:00"]
  const runtimeBoats = [
    { id: "fraukje", name: "Fraukje", seatCount: 4 },
    { id: "rose", name: "Rose", seatCount: 4 },
  ]

  return {
    runtimeResolution: {
      runtimeConfig: {
        timezone: "Europe/Berlin",
        defaultAvailableTimes: availableTimes,
        boats: runtimeBoats,
        courses: {},
      },
      source: "backend_surface_binding",
      bindingId: args?.bindingId || "binding_surface_1",
      identity: {
        appSlug: "segelschule-altwarp",
        surfaceType: "booking",
        surfaceKey: "default",
      },
      warnings: args?.runtimeWarnings || [],
    },
    boats: runtimeBoats,
    courses: [],
    requestedCourseId: courseId,
    resolvedCourseId: courseId,
    course: {
      courseId,
      aliases: args?.aliases || [courseId],
      title: args?.title || "Schnupperkurs",
      description: args?.description || "Erster Einstieg auf dem Wasser.",
      durationLabel: args?.durationLabel || "3 Stunden",
      durationMinutes: args?.durationMinutes || 180,
      priceInCents: args?.priceInCents || 12_900,
      currency: args?.currency || "EUR",
      isMultiDay: args?.isMultiDay || false,
      checkoutProductId: args?.checkoutProductId || "product_seed_ticket",
      bookingResourceId: args?.bookingResourceId || "resource_course_1",
      bookingResourceName: args?.title || "Schnupperkurs",
      bookingResourceSubtype: "class",
      fulfillmentType: args?.fulfillmentType || "ticket",
      availableTimes,
      checkoutPublicUrl: "https://checkout.example/public",
      warnings: args?.courseWarnings || [],
    },
  }
}

function buildTransactionRecord(args: {
  id: string
  checkoutSessionId: string
  productId?: string
  productName?: string
  quantity?: number
  totalInCents?: number
  currency?: string
  status?: string
  subtype?: string
}) {
  const quantity = args.quantity || 2
  const totalInCents = args.totalInCents || 25_800

  return {
    _id: args.id,
    organizationId: "org_123",
    type: "transaction",
    subtype: args.subtype || "ticket_purchase",
    status: args.status || "completed",
    customProperties: {
      checkoutSessionId: args.checkoutSessionId,
      totalInCents,
      currency: args.currency || "EUR",
      lineItems: [
        {
          productId: args.productId || "product_seed_ticket",
          productName: args.productName || "Schnupperkurs",
          productSubtype: "ticket",
          quantity,
          totalPriceInCents: totalInCents,
        },
      ],
    },
  }
}

describe("segelschule booking route", () => {
  beforeEach(() => {
    vi.resetModules()
    delete process.env.SEGELSCHULE_BOOKING_FIXTURE_TOKEN
    resolveSegelschuleOrganizationIdMock.mockReset()
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
    resolveSegelschuleBookingCourseMock.mockReset()
    normalizeSeatSelectionsMock.mockReset()
    parseBookingStartTimestampMock.mockReset()
    resolveSlotSeatInventoryMock.mockReset()
    mapToResourceSeatSelectionsMock.mockReset()

    resolveSegelschuleOrganizationIdMock.mockResolvedValue("org_123")
    getConvexClientMock.mockReturnValue({})
    checkRateLimitMock.mockReturnValue(true)
    resolveClientIpMock.mockReturnValue("127.0.0.1")
    escapeHtmlMock.mockImplementation((value: string) => value)
    buildBookingConfirmationHtmlMock.mockReturnValue("<p>ok</p>")
    buildBookingNotificationHtmlMock.mockReturnValue("<p>ok</p>")
    resendSendMock.mockReset()
    resendSendMock.mockResolvedValue({
      data: { id: "re_msg_default" },
      error: null,
    })
    createResendClientMock.mockReturnValue({
      emails: {
        send: resendSendMock,
      },
    })
    resolveSegelschuleBookingCourseMock.mockResolvedValue(buildCourseResolution())
    normalizeSeatSelectionsMock.mockReturnValue({
      selections: [
        { boatId: "fraukje", boatName: "Fraukje", seatNumbers: [1, 2] },
      ],
      totalSeats: 2,
      errors: [],
    })
    parseBookingStartTimestampMock.mockReturnValue(1_760_000_000_000)
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
    mapToResourceSeatSelectionsMock.mockImplementation((selections) =>
      (selections as Array<{ boatId: string; seatNumbers: number[] }>).map(
        (selection) => ({
          groupId: selection.boatId,
          seatNumbers: selection.seatNumbers,
        })
      )
    )
  })

  it("rejects checkout when the selected boat is unavailable for the slot", async () => {
    const bookingId = "booking_local_unavailable_boat"

    normalizeSeatSelectionsMock.mockReturnValue({
      selections: [
        { boatId: "rose", boatName: "Rose", seatNumbers: [1, 2] },
      ],
      totalSeats: 2,
      errors: [],
    })
    resolveSlotSeatInventoryMock.mockResolvedValue({
      availableBoats: [{ id: "fraukje", name: "Fraukje", seatCount: 4 }],
      seatInventory: {
        groups: [{ groupId: "fraukje", label: "Fraukje", capacity: 4 }],
        strictSeatSelection: true,
      },
      availableGroupIds: ["fraukje"],
      unavailableGroupIds: ["rose"],
      hasLinkedAvailabilityGroups: true,
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
      throw new Error(`Unexpected queryInternal args: ${JSON.stringify(args)}`)
    })

    mutateInternalMock.mockImplementation(async (_convex, _ref, args) => {
      if (args.type === "booking") {
        return bookingId
      }
      if (args.type === "crm_contact") {
        return "contact_local_unavailable_boat"
      }
      if (args.email && args.firstName && args.organizationId && !args.userId) {
        return "frontend_user_unavailable_boat"
      }
      if (args.userId && args.email && args.organizationId) {
        return { success: true }
      }
      if (args.objectId === bookingId && args.status === "cancelled") {
        return { success: true }
      }
      throw new Error(`Unexpected mutateInternal args: ${JSON.stringify(args)}`)
    })

    const { POST } = await import(
      "../../../apps/segelschule-altwarp/app/api/booking/route"
    )
    const response = await POST(createBookingRequest(basePayload))

    expect(response.status).toBe(409)
    const payload = await response.json()
    expect(payload.error).toBe("Rose is not available for the selected date/time.")
    expect(payload.bookingId).toBe(bookingId)

    const cancelCall = mutateInternalMock.mock.calls.find(
      (call) => call[2]?.objectId === bookingId && call[2]?.status === "cancelled"
    )
    expect(cancelCall).toBeTruthy()
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
      if (args.organizationId === "org_123" && args.type === "transaction") {
        return [
          buildTransactionRecord({
            id: "transaction_checkout_1",
            checkoutSessionId,
          }),
        ]
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
      if (args.checkoutSessionId === checkoutSessionId && Array.isArray(args.transactionIds)) {
        return {
          ok: true,
          checkedAt: 1_760_000_060_000,
          triggerType: "booking_created",
          dispatchedWorkflows: 1,
          workflows: [
            {
              workflowId: "workflow_booking_created_1",
              workflowName: "Booking Created",
              triggerNodeIds: ["trigger_booking_created_1"],
            },
          ],
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
    expect(payload.course).toEqual({
      requestedCourseId: "schnupper",
      courseId: "schnupper",
      title: "Schnupperkurs",
      description: "Erster Einstieg auf dem Wasser.",
      durationLabel: "3 Stunden",
      durationMinutes: 180,
      priceInCents: 12_900,
      currency: "EUR",
      isMultiDay: false,
      bookingResourceId: "resource_course_1",
      fulfillmentType: "ticket",
    })
    expect(payload.ticket).toEqual({
      ticketId: "ticket_checkout_1",
      ticketCode: "SA-ABC1234",
      holderEmail: "ada@example.com",
      holderName: "Ada Lovelace",
      lookupUrl: "http://localhost/ticket?code=SA-ABC1234&email=ada%40example.com",
    })
    expect(payload.transactions).toEqual([
      {
        transactionId: "transaction_checkout_1",
        status: "completed",
        subtype: "ticket_purchase",
      },
    ])
    expect(payload.workflowDispatch).toEqual({
      ok: true,
      checkedAt: 1_760_000_060_000,
      triggerType: "booking_created",
      dispatchedWorkflows: 1,
      workflows: [
        {
          workflowId: "workflow_booking_created_1",
          workflowName: "Booking Created",
          triggerNodeIds: ["trigger_booking_created_1"],
        },
      ],
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

    expect(resendSendMock).not.toHaveBeenCalled()
  })

  it("accepts a course product as the checkout product when ticket fulfillment is explicit", async () => {
    resolveSegelschuleBookingCourseMock.mockResolvedValueOnce(
      buildCourseResolution({
        checkoutProductId: "resource_course_1",
        bindingId: "binding_surface_course_product",
      })
    )

    const bookingId = "booking_course_product_1"
    const contactId = "contact_course_product_1"
    const frontendUserId = "frontend_course_product_1"
    const platformBookingId = "platform_booking_course_product_1"
    const checkoutSessionId = "checkout_session_course_product_1"

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
        return { bookingId: platformBookingId, calendarDiagnostics: null }
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
      if (args.objectId === "resource_course_1") {
        return {
          _id: "resource_course_1",
          organizationId: "org_123",
          type: "product",
          subtype: "class",
          status: "active",
          name: "Segelschule Schnupperkurs",
          customProperties: {
            fulfillmentType: "ticket",
            priceInCents: 12_900,
            currency: "EUR",
          },
        }
      }
      if (args.organizationId === "org_123" && args.type === "transaction") {
        return [
          buildTransactionRecord({
            id: "transaction_course_product_1",
            checkoutSessionId,
            productId: "resource_course_1",
          }),
        ]
      }
      if (args.organizationId === "org_123" && args.checkoutSessionId === checkoutSessionId) {
        return {
          _id: "invoice_course_product_1",
          organizationId: "org_123",
          type: "invoice",
          subtype: "manual_b2c",
          status: "sent",
          customProperties: {
            invoiceNumber: "SA-3001",
            pdfUrl: "https://example.com/invoices/sa-3001.pdf",
            crmContactId: "crm_contact_course_product_1",
          },
        }
      }
      if (args.checkoutSessionId === checkoutSessionId) {
        return {
          _id: checkoutSessionId,
          customProperties: {
            totalAmount: 25_800,
            currency: "EUR",
            expiresAt: 1_760_086_400_123,
          },
        }
      }
      if (args.organizationId === "org_123" && args.type === "organization_contact") {
        return []
      }
      if (args.organizationId === "org_123" && !args.type && !args.objectId) {
        return {
          _id: "booking_notifications_course_product_1",
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
            _id: "ticket_course_product_1",
            organizationId: "org_123",
            type: "ticket",
            subtype: "standard",
            status: "issued",
            customProperties: {
              productId: "resource_course_1",
              checkoutSessionId,
              holderEmail: "ada@example.com",
              holderName: "Ada Lovelace",
              ticketCode: "SA-COURSE1",
            },
          },
        ]
      }
      if (
        args.objectId === bookingId
        || args.objectId === platformBookingId
        || args.objectId === checkoutSessionId
        || args.objectId === "ticket_course_product_1"
      ) {
        return { customProperties: { existing: true } }
      }
      throw new Error(`Unexpected queryInternal args: ${JSON.stringify(args)}`)
    })

    actionInternalMock.mockImplementation(async (_convex, _ref, args) => {
      if (args.organizationId === "org_123" && !args.checkoutSessionId) {
        return {
          apiKey: "re_test_course_product",
        }
      }
      if (args.checkoutSessionId === checkoutSessionId && Array.isArray(args.transactionIds)) {
        return {
          ok: true,
          checkedAt: 1_760_000_060_001,
          paymentProvider: "lc_checkout",
          dispatchedWorkflows: 1,
          workflows: [
            {
              workflowId: "workflow_payment_received_course_product",
              workflowName: "Payment Received",
              triggerNodeIds: ["trigger_payment_course_product"],
            },
          ],
        }
      }
      if (args.checkoutSessionId && args.paymentIntentId && args.paymentMethod) {
        return {
          success: true,
          purchasedItemIds: ["purchase_item_course_product_1", "purchase_item_course_product_2"],
          crmContactId: "crm_contact_course_product_1",
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
          filename: "invoice-sa-3001.pdf",
          content: "YmFzZTY0",
          contentType: "application/pdf",
        }
      }
      throw new Error(`Unexpected actionInternal args: ${JSON.stringify(args)}`)
    })

    const { POST } = await import(
      "../../../apps/segelschule-altwarp/app/api/booking/route"
    )
    const response = await POST(createBookingRequest(basePayload))

    expect(response.status).toBe(200)
    const payload = await response.json()
    expect(payload.checkoutProductId).toBe("resource_course_1")
    expect(payload.warnings).not.toContain("checkout_product_not_ticket_subtype")

    const updateSessionCall = mutateInternalMock.mock.calls.find(
      (call) =>
        typeof call[2]?.checkoutSessionId === "string"
        && Boolean(call[2]?.updates?.selectedProducts)
    )
    expect(updateSessionCall?.[2]?.updates?.selectedProducts?.[0]).toMatchObject({
      productId: "resource_course_1",
      quantity: 2,
      totalPrice: 25_800,
    })
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
      if (args.organizationId === "org_123" && args.type === "transaction") {
        return [
          buildTransactionRecord({
            id: "transaction_fixture_1",
            checkoutSessionId,
          }),
        ]
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
      if (args.checkoutSessionId === checkoutSessionId && Array.isArray(args.transactionIds)) {
        return {
          ok: true,
          checkedAt: 1_760_000_060_002,
          paymentProvider: "lc_checkout",
          dispatchedWorkflows: 1,
          workflows: [
            {
              workflowId: "workflow_payment_received_fixture",
              workflowName: "Payment Received",
              triggerNodeIds: ["trigger_payment_fixture"],
            },
          ],
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
    expect(payload.emailDispatch.deliveries).toEqual([])
    expect(resendSendMock).not.toHaveBeenCalled()
    expect(
      actionInternalMock.mock.calls.find((call) =>
        Array.isArray(call[2]?.transactionIds)
      )
    ).toBeUndefined()
  })

  it("returns delivery evidence for authorized redirect-mode fixture sends", async () => {
    process.env.SEGELSCHULE_BOOKING_FIXTURE_TOKEN = "fixture-secret"

    const frontendUserId = "frontend_user_fixture_redirect"
    const bookingId = "booking_fixture_redirect"
    const platformBookingId = "platform_booking_fixture_redirect"
    const checkoutSessionId = "checkout_session_fixture_redirect"

    mutateInternalMock.mockImplementation(async (_convex, _ref, args) => {
      if (args.type === "booking") return bookingId
      if (args.type === "crm_contact") return "crm_contact_fixture_redirect"
      if (args.email && args.firstName && args.organizationId && !args.userId) {
        return frontendUserId
      }
      if (args.userId && args.email && args.organizationId) {
        return { success: true }
      }
      if (args.resourceId && args.startDateTime && args.endDateTime) {
        return { bookingId: platformBookingId, calendarDiagnostics: null }
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
      if (args.organizationId === "org_123" && args.type === "transaction") {
        return [
          buildTransactionRecord({
            id: "transaction_fixture_redirect",
            checkoutSessionId,
          }),
        ]
      }
      if (args.organizationId === "org_123" && args.checkoutSessionId === checkoutSessionId) {
        return {
          _id: "invoice_fixture_redirect",
          organizationId: "org_123",
          type: "invoice",
          subtype: "manual_b2c",
          status: "sent",
          customProperties: {
            invoiceNumber: "SA-2002",
            pdfUrl: "https://example.com/invoices/sa-2002.pdf",
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
            checkoutUrl: null,
            paymentMethod: "invoice",
            sourceBookingId: bookingId,
          },
        }
      }
      if (args.organizationId === "org_123" && args.type === "ticket") {
        return []
      }
      if (args.organizationId === "org_123" && args.type === "organization_contact") {
        return [
          {
            _id: "org_contact_fixture_redirect",
            organizationId: "org_123",
            type: "organization_contact",
            status: "active",
            customProperties: {
              contactEmail: "team@example.com",
            },
          },
        ]
      }
      if (args.objectId === bookingId || args.objectId === platformBookingId || args.objectId === checkoutSessionId) {
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
      if (args.checkoutSessionId === checkoutSessionId && Array.isArray(args.transactionIds)) {
        return {
          ok: true,
          checkedAt: 1_760_000_060_003,
          paymentProvider: "lc_checkout",
          dispatchedWorkflows: 1,
          workflows: [
            {
              workflowId: "workflow_payment_received_redirect",
              workflowName: "Payment Received",
              triggerNodeIds: ["trigger_payment_redirect"],
            },
          ],
        }
      }
      if (args.checkoutSessionId && args.paymentIntentId && args.paymentMethod) {
        return {
          success: true,
          purchasedItemIds: [],
          crmContactId: "crm_contact_fixture_redirect",
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
          filename: "invoice-sa-2002.pdf",
          content: "YmFzZTY0",
          contentType: "application/pdf",
        }
      }
      throw new Error(`Unexpected actionInternal args: ${JSON.stringify(args)}`)
    })

    resendSendMock
      .mockResolvedValueOnce({
        data: { id: "re_msg_customer" },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { id: "re_msg_operator" },
        error: null,
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
            mode: "redirect",
            capturePreviews: true,
            customerRecipients: ["delivered+customer@resend.dev"],
            operatorRecipients: ["delivered+operator@resend.dev"],
            fixtureKey: "fixture-redirect",
            fixtureLabel: "Codex redirect fixture",
          },
        }),
      })
    )

    expect(response.status).toBe(200)
    const payload = await response.json()
    expect(payload.ok).toBe(true)
    expect(payload.emailDispatch.previews).toHaveLength(2)
    expect(payload.emailDispatch.deliveries).toEqual([
      {
        kind: "customer_confirmation",
        to: ["delivered+customer@resend.dev"],
        subject: "Buchungsbestätigung - Schnupperkurs",
        transport: "resend_direct",
        success: true,
        messageId: "re_msg_customer",
        error: null,
      },
      {
        kind: "operator_notification",
        to: ["delivered+operator@resend.dev"],
        subject: "New Booking: Ada Lovelace - Schnupperkurs",
        transport: "resend_direct",
        success: true,
        messageId: "re_msg_operator",
        error: null,
      },
    ])
  })

  it("returns 503 when the resolved checkout product is not a valid commercial ticket product", async () => {
    resolveSegelschuleBookingCourseMock.mockResolvedValueOnce(
      buildCourseResolution({
        checkoutProductId: "product_wrong_kind",
        availableTimes: ["09:00"],
      })
    )

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
      if (args.checkoutSessionId === "checkout_session_2" && Array.isArray(args.transactionIds)) {
        return {
          ok: true,
          checkedAt: 1_760_000_060_004,
          paymentProvider: "lc_checkout",
          dispatchedWorkflows: 1,
          workflows: [
            {
              workflowId: "workflow_payment_received_fallback",
              workflowName: "Payment Received",
              triggerNodeIds: ["trigger_payment_fallback"],
            },
          ],
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

    expect(response.status).toBe(503)
    const payload = await response.json()
    expect(payload.error).toBe(
      "Selected course is missing its commercial checkout product."
    )
    expect(payload.warnings).toContain("checkout_product_not_ticket_subtype")
    expect(payload.warnings).not.toContain("checkout_product_fallback_to_ticket")
    expect(mutateInternalMock).not.toHaveBeenCalled()
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
      if (args.type === "transaction" && args.organizationId === "org_123") {
        return [
          buildTransactionRecord({
            id: "transaction_cal_1",
            checkoutSessionId: "checkout_session_cal_1",
          }),
        ]
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
      if (args.checkoutSessionId === "checkout_session_cal_1" && Array.isArray(args.transactionIds)) {
        return {
          ok: true,
          checkedAt: 1_760_000_060_005,
          paymentProvider: "lc_checkout",
          dispatchedWorkflows: 1,
          workflows: [
            {
              workflowId: "workflow_payment_received_cal",
              workflowName: "Payment Received",
              triggerNodeIds: ["trigger_payment_cal"],
            },
          ],
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
      if (args.type === "transaction" && args.organizationId === "org_123") {
        return [
          buildTransactionRecord({
            id: "transaction_link_fail_1",
            checkoutSessionId: "checkout_session_3",
          }),
        ]
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
      if (args.checkoutSessionId === "checkout_session_3" && Array.isArray(args.transactionIds)) {
        return {
          ok: true,
          checkedAt: 1_760_000_060_006,
          paymentProvider: "lc_checkout",
          dispatchedWorkflows: 1,
          workflows: [
            {
              workflowId: "workflow_payment_received_link_fail",
              workflowName: "Payment Received",
              triggerNodeIds: ["trigger_payment_link_fail"],
            },
          ],
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
      if (args.type === "transaction" && args.organizationId === "org_123") {
        return [
          buildTransactionRecord({
            id: "transaction_default_invoice_1",
            checkoutSessionId: "checkout_session_4",
          }),
        ]
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
      if (args.checkoutSessionId === "checkout_session_4" && Array.isArray(args.transactionIds)) {
        return {
          ok: true,
          checkedAt: 1_760_000_060_007,
          paymentProvider: "lc_checkout",
          dispatchedWorkflows: 1,
          workflows: [
            {
              workflowId: "workflow_payment_received_default_invoice",
              workflowName: "Payment Received",
              triggerNodeIds: ["trigger_payment_default_invoice"],
            },
          ],
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

  it("ignores client-authored course labels and totals in favor of backend commercial state", async () => {
    const checkoutSessionId = "checkout_session_tampered_1"

    mutateInternalMock.mockImplementation(async (_convex, _ref, args) => {
      if (args.type === "booking") return "booking_local_tampered_1"
      if (args.type === "crm_contact") return "contact_local_tampered_1"
      if (args.email && args.firstName && args.organizationId && !args.userId) {
        return "frontend_user_tampered_1"
      }
      if (args.userId && args.email && args.organizationId) {
        return { success: true }
      }
      if (args.resourceId && args.startDateTime && args.endDateTime) {
        return { bookingId: "platform_booking_tampered_1" }
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
            currency: "EUR",
          },
        }
      }
      if (args.type === "transaction" && args.organizationId === "org_123") {
        return [
          buildTransactionRecord({
            id: "transaction_tampered_1",
            checkoutSessionId,
          }),
        ]
      }
      if (args.organizationId === "org_123" && args.checkoutSessionId === checkoutSessionId) {
        return {
          _id: "invoice_tampered_1",
          organizationId: "org_123",
          type: "invoice",
          subtype: "manual_b2c",
          status: "sent",
          customProperties: {
            invoiceNumber: "SA-1999",
          },
        }
      }
      if (args.checkoutSessionId === checkoutSessionId) {
        return {
          _id: checkoutSessionId,
          customProperties: {
            totalAmount: 25_800,
            currency: "EUR",
            expiresAt: 1_760_086_499_999,
          },
        }
      }
      if (args.type === "ticket" && args.organizationId === "org_123") {
        return [
          {
            _id: "ticket_tampered_1",
            organizationId: "org_123",
            type: "ticket",
            subtype: "standard",
            status: "issued",
            customProperties: {
              checkoutSessionId,
              holderEmail: "ada@example.com",
              holderName: "Ada Lovelace",
              ticketCode: "SA-TMPRD99",
            },
          },
        ]
      }
      if (args.type === "organization_contact" && args.organizationId === "org_123") {
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
          apiKey: "re_test_tampered",
        }
      }
      if (args.checkoutSessionId === checkoutSessionId && Array.isArray(args.transactionIds)) {
        return {
          ok: true,
          checkedAt: 1_760_000_060_008,
          paymentProvider: "lc_checkout",
          dispatchedWorkflows: 1,
          workflows: [
            {
              workflowId: "workflow_payment_received_tampered",
              workflowName: "Payment Received",
              triggerNodeIds: ["trigger_payment_tampered"],
            },
          ],
        }
      }
      if (args.checkoutSessionId && args.paymentIntentId && args.paymentMethod) {
        return {
          success: true,
          purchasedItemIds: ["purchase_item_tampered_1", "purchase_item_tampered_2"],
          paymentId: args.paymentIntentId,
          amount: 25_800,
          currency: "EUR",
          isGuestRegistration: false,
          invoiceType: "manual_b2c",
        }
      }
      if (args.checkoutSessionId === checkoutSessionId && !args.paymentIntentId) {
        return {
          filename: "invoice-sa-1999.pdf",
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
      createBookingRequest({
        ...basePayload,
        course: {
          id: "schnupper",
          title: "Hacked Course",
          price: "€1",
          isMultiDay: true,
        },
        totalAmount: 2,
      })
    )

    expect(response.status).toBe(200)
    const payload = await response.json()
    expect(payload.course).toMatchObject({
      courseId: "schnupper",
      title: "Schnupperkurs",
      priceInCents: 12_900,
      isMultiDay: false,
    })

    const bookingInsertCall = mutateInternalMock.mock.calls.find(
      (call) => call[2]?.type === "booking"
    )
    expect(bookingInsertCall?.[2]?.customProperties).toMatchObject({
      courseName: "Schnupperkurs",
      coursePriceInCents: 12_900,
      courseCurrency: "EUR",
      isMultiDay: false,
    })

    const updateSessionCall = mutateInternalMock.mock.calls.find(
      (call) =>
        typeof call[2]?.checkoutSessionId === "string"
        && Boolean(call[2]?.updates?.selectedProducts)
    )
    expect(updateSessionCall?.[2]?.updates?.selectedProducts?.[0]).toMatchObject({
      productId: "product_seed_ticket",
      pricePerUnit: 12_900,
      totalPrice: 25_800,
    })
  })
})
