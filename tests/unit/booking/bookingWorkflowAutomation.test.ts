import { afterEach, describe, expect, it, vi } from "vitest"

import * as bookingWorkflowAutomationModule from "../../../convex/bookingWorkflowAutomation"

const bookingWorkflowAutomation =
  (bookingWorkflowAutomationModule as { default?: Record<string, unknown> }).default
  || (bookingWorkflowAutomationModule as Record<string, unknown>)

type RouterObjectRecord = {
  _id: string
  organizationId: string
  type: string
  subtype?: string
  status?: string
  name?: string
  customProperties?: Record<string, unknown>
  createdAt?: number
  updatedAt?: number
}

function getHandler<TArgs, TResult>(fn: unknown) {
  return (fn as { _handler: (ctx: any, args: TArgs) => Promise<TResult> })._handler
}

function createBookingRecord(args: {
  id: string
  date: string
  time: string
  bookingStartAt: number
  timezone?: string
  source?: string
  subtype?: string
  status?: string
  language?: string
  customerEmail?: string
  courseName?: string
  notifications?: Record<string, unknown>
  weatherInfo?: string
  packingList?: string
  packingListItems?: string[]
  checkoutSessionId?: string
  invoiceId?: string
  paymentMethod?: string
  totalAmountCents?: number
  coursePriceInCents?: number
  seats?: Array<{ boatName: string; seatNumbers: number[] }>
}): RouterObjectRecord {
  return {
    _id: args.id,
    organizationId: "org_segelschule",
    type: "booking",
    subtype: args.subtype || "class_enrollment",
    status: args.status || "pending_confirmation",
    name: args.courseName || "Schnupperkurs",
    customProperties: {
      source: args.source || "segelschule_landing",
      courseName: args.courseName || "Schnupperkurs",
      customerName: "Ada Lovelace",
      customerEmail: args.customerEmail || "ada@example.com",
      date: args.date,
      time: args.time,
      bookingStartAt: args.bookingStartAt,
      bookingTimezone: args.timezone || "Europe/Berlin",
      language: args.language || "de",
      paymentMethod: args.paymentMethod || "invoice",
      checkoutSessionId: args.checkoutSessionId || "checkout_segelschule_1",
      invoiceId: args.invoiceId || "invoice_segelschule_1",
      totalAmountCents: args.totalAmountCents || 25_800,
      coursePriceInCents: args.coursePriceInCents || 12_900,
      courseCurrency: "EUR",
      seats: args.seats || [{ boatName: "Fraukje", seatNumbers: [1, 2] }],
      ticketCode: "SA-ABC1234",
      primaryTicketCode: "SA-ABC1234",
      primaryTicketLookupUrl: "https://segelschule.example/ticket?code=SA-ABC1234",
      ...(args.notifications ? { notifications: args.notifications } : {}),
      ...(args.weatherInfo ? { weatherInfo: args.weatherInfo } : {}),
      ...(args.packingList ? { packingList: args.packingList } : {}),
      ...(args.packingListItems ? { packingListItems: args.packingListItems } : {}),
    },
    createdAt: args.bookingStartAt - 3 * 24 * 60 * 60 * 1000,
    updatedAt: args.bookingStartAt - 3 * 24 * 60 * 60 * 1000,
  }
}

function createHarness(args: {
  bookings: RouterObjectRecord[]
  extraRecords?: RouterObjectRecord[]
  settings?: RouterObjectRecord | null
  contacts?: RouterObjectRecord[]
  domainConfigs?: RouterObjectRecord[]
  systemOrg?: { _id: string } | null
}) {
  const records = new Map<string, RouterObjectRecord>(
    [...args.bookings, ...(args.extraRecords || [])].map((record) => [
      String(record._id),
      structuredClone(record),
    ])
  )
  const sentEmails: Array<Record<string, unknown>> = []
  let orgOnlyQueryPhase: "settings" | "domain_configs" = "settings"

  const db = {
    get: vi.fn(async (id: string) => structuredClone(records.get(String(id)) || null)),
    patch: vi.fn(async (id: string, patch: Partial<RouterObjectRecord>) => {
      const current = records.get(String(id))
      if (!current) {
        throw new Error(`Missing record for ${id}`)
      }
      const next: RouterObjectRecord = {
        ...current,
        ...patch,
        customProperties: patch.customProperties || current.customProperties,
      }
      records.set(String(id), next)
    }),
  }

  const ctx = {
    db,
    runQuery: vi.fn(async (_ref: unknown, queryArgs: Record<string, unknown>) => {
      if (typeof queryArgs.type === "string") {
        if (queryArgs.type === "booking") {
          return Array.from(records.values())
        }
        if (queryArgs.type === "organization_contact") {
          return args.contacts || []
        }
      }

      if (typeof queryArgs.organizationId === "string") {
        if (orgOnlyQueryPhase === "settings") {
          orgOnlyQueryPhase = "domain_configs"
          return args.settings || null
        }
        orgOnlyQueryPhase = "settings"
        return args.domainConfigs || []
      }

      if (Object.keys(queryArgs).length === 0) {
        return args.systemOrg || null
      }

      throw new Error(`Unexpected runQuery args: ${JSON.stringify(queryArgs)}`)
    }),
    runAction: vi.fn(async (_ref: unknown, actionArgs: Record<string, unknown>) => {
      sentEmails.push(actionArgs)
      return { success: true }
    }),
    runMutation: vi.fn(async (_ref: unknown, mutationArgs: Record<string, unknown>) => {
      const target =
        typeof mutationArgs.reminderKind === "undefined"
          ? bookingWorkflowAutomation.markBookingConfirmationSentInternal
          : bookingWorkflowAutomation.markBookingReminderSentInternal
      return getHandler<Record<string, unknown>, { success: boolean }>(
        target
      )({ db } as any, mutationArgs)
    }),
  }

  return {
    ctx,
    db,
    records,
    sentEmails,
  }
}

describe("booking workflow automation", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("sends the weather reminder to the due customer and deduped operators, then marks it sent", async () => {
    const now = Date.parse("2026-04-01T06:00:00.000Z")
    vi.spyOn(Date, "now").mockReturnValue(now)

    const harness = createHarness({
      bookings: [
        createBookingRecord({
          id: "booking_due_weather",
          date: "2026-04-08",
          time: "09:00",
          bookingStartAt: Date.parse("2026-04-08T07:00:00.000Z"),
          courseName: "Schnupperkurs",
        }),
        createBookingRecord({
          id: "booking_already_sent",
          date: "2026-04-08",
          time: "13:00",
          bookingStartAt: Date.parse("2026-04-08T11:00:00.000Z"),
          notifications: {
            reminders: {
              weatherReminder: {
                sentAt: now - 1000,
                customerRecipients: ["ada@example.com"],
                operatorRecipients: ["team@example.com"],
              },
            },
          },
        }),
        createBookingRecord({
          id: "booking_not_due",
          date: "2026-04-09",
          time: "09:00",
          bookingStartAt: Date.parse("2026-04-09T07:00:00.000Z"),
        }),
        createBookingRecord({
          id: "booking_wrong_source",
          date: "2026-04-08",
          time: "09:00",
          bookingStartAt: Date.parse("2026-04-08T07:00:00.000Z"),
          source: "manual_backoffice",
        }),
        createBookingRecord({
          id: "booking_cancelled",
          date: "2026-04-08",
          time: "09:00",
          bookingStartAt: Date.parse("2026-04-08T07:00:00.000Z"),
          status: "cancelled",
        }),
      ],
      settings: {
        _id: "booking_notifications_1",
        organizationId: "org_segelschule",
        type: "organization_settings",
        subtype: "booking_notifications",
        status: "active",
        customProperties: {
          timezone: "Europe/Berlin",
          reminderLeadDays: 7,
          operatorEmails: ["TEAM@example.com", "captain@example.com"],
          operatorReminderKinds: ["weather", "packing_list"],
          defaultWeatherInfo: {
            de: "Bitte pruefen Sie Wind, Temperatur und Regenwahrscheinlichkeit 48 bis 24 Stunden vor Kursbeginn erneut.",
          },
        },
      },
      contacts: [
        {
          _id: "contact_1",
          organizationId: "org_segelschule",
          type: "organization_contact",
          status: "active",
          customProperties: {
            primaryEmail: "captain@example.com",
          },
        },
        {
          _id: "contact_2",
          organizationId: "org_segelschule",
          type: "organization_contact",
          status: "active",
          customProperties: {
            contactEmail: "harbor@example.com",
          },
        },
      ],
      domainConfigs: [
        {
          _id: "domain_config_1",
          organizationId: "org_segelschule",
          type: "domain_config",
          status: "active",
        },
      ],
    })

    const result = await getHandler<
      {
        organizationId: string
        nodeConfig: Record<string, unknown>
        inputData: Record<string, unknown>
      },
      {
        success: boolean
        data: {
          bookingsChecked: number
          remindersSent: number
          reminderKind: string
          errors: string[]
        }
      }
    >(bookingWorkflowAutomation.executeBookingNotificationNode)(harness.ctx as any, {
      organizationId: "org_segelschule",
      nodeConfig: {
        action: "send-booking-reminders",
        reminderKind: "weather",
        daysBeforeStart: 7,
        recipientKinds: ["customer", "operator"],
        bookingSubtypes: ["class_enrollment"],
        bookingSources: ["segelschule_landing"],
        operatorEmails: ["team@example.com"],
        timezone: "Europe/Berlin",
      },
      inputData: {},
    })

    expect(result.success).toBe(true)
    expect(result.data.bookingsChecked).toBe(3)
    expect(result.data.remindersSent).toBe(1)
    expect(result.data.errors).toEqual([])

    expect(harness.sentEmails).toHaveLength(4)
    expect(harness.sentEmails.map((email) => email.to)).toEqual([
      "ada@example.com",
      "team@example.com",
      "captain@example.com",
      "harbor@example.com",
    ])
    expect(harness.sentEmails[0]?.subject).toBe(
      "Wetter-Info zu Ihrer Buchung: Schnupperkurs"
    )
    expect(harness.sentEmails[0]?.domainConfigId).toBe("domain_config_1")
    expect(String(harness.sentEmails[0]?.html || "")).toContain(
      "Bitte pruefen Sie Wind, Temperatur und Regenwahrscheinlichkeit 48 bis 24 Stunden vor Kursbeginn erneut."
    )
    expect(harness.sentEmails.slice(1).every((email) => email.subject === "Weather reminder sent: Schnupperkurs")).toBe(true)

    const updatedBooking = harness.records.get("booking_due_weather")
    expect(updatedBooking?.customProperties?.weatherInfo).toBe(
      "Bitte pruefen Sie Wind, Temperatur und Regenwahrscheinlichkeit 48 bis 24 Stunden vor Kursbeginn erneut."
    )
    expect(updatedBooking?.customProperties?.notifications).toMatchObject({
      reminders: {
        weatherReminder: {
          sentAt: now,
          customerRecipients: ["ada@example.com"],
          operatorRecipients: [
            "team@example.com",
            "captain@example.com",
            "harbor@example.com",
          ],
        },
      },
    })

    const rerun = await getHandler<any, any>(
      bookingWorkflowAutomation.executeBookingNotificationNode
    )(harness.ctx as any, {
      organizationId: "org_segelschule",
      nodeConfig: {
        action: "send-booking-reminders",
        reminderKind: "weather",
        daysBeforeStart: 7,
        recipientKinds: ["customer", "operator"],
        bookingSubtypes: ["class_enrollment"],
        bookingSources: ["segelschule_landing"],
        operatorEmails: ["team@example.com"],
        timezone: "Europe/Berlin",
      },
      inputData: {},
    })

    expect(rerun.success).toBe(true)
    expect(rerun.data.remindersSent).toBe(0)
    expect(harness.sentEmails).toHaveLength(4)
  })

  it("uses fallback packing list items and default sender when no domain config is available", async () => {
    const now = Date.parse("2026-04-01T06:00:00.000Z")
    vi.spyOn(Date, "now").mockReturnValue(now)

    const harness = createHarness({
      bookings: [
        createBookingRecord({
          id: "booking_due_packing",
          date: "2026-04-08",
          time: "09:00",
          bookingStartAt: Date.parse("2026-04-08T07:00:00.000Z"),
          courseName: "Grundkurs",
          language: "en",
        }),
      ],
      settings: {
        _id: "booking_notifications_2",
        organizationId: "org_segelschule",
        type: "organization_settings",
        subtype: "booking_notifications",
        status: "active",
        customProperties: {
          timezone: "Europe/Berlin",
          reminderLeadDays: 7,
          defaultPackingList: [
            "Bring water",
            "Wear non-slip shoes",
            "Pack weatherproof clothing",
          ],
        },
      },
      contacts: [],
      domainConfigs: [],
      systemOrg: null,
    })

    const result = await getHandler<any, any>(
      bookingWorkflowAutomation.executeBookingNotificationNode
    )(harness.ctx as any, {
      organizationId: "org_segelschule",
      nodeConfig: {
        action: "send-booking-reminders",
        reminderKind: "packing_list",
        daysBeforeStart: 7,
        recipientKinds: ["customer"],
        bookingSubtypes: ["class_enrollment"],
        bookingSources: ["segelschule_landing"],
        timezone: "Europe/Berlin",
      },
      inputData: {},
    })

    expect(result.success).toBe(true)
    expect(result.data.remindersSent).toBe(1)
    expect(harness.sentEmails).toHaveLength(1)
    expect(harness.sentEmails[0]?.to).toBe("ada@example.com")
    expect(harness.sentEmails[0]?.subject).toBe(
      "Packing list for your booking: Grundkurs"
    )
    expect(harness.sentEmails[0]?.domainConfigId).toBeUndefined()
    expect(String(harness.sentEmails[0]?.html || "")).toContain("Bring water")
    expect(String(harness.sentEmails[0]?.html || "")).toContain(
      "Wear non-slip shoes"
    )

    const updatedBooking = harness.records.get("booking_due_packing")
    expect(updatedBooking?.customProperties?.packingListItems).toEqual([
      "Bring water",
      "Wear non-slip shoes",
      "Pack weatherproof clothing",
    ])
    expect(updatedBooking?.customProperties?.packingList).toBe(
      "Bring water\nWear non-slip shoes\nPack weatherproof clothing"
    )
    expect(updatedBooking?.customProperties?.notifications).toMatchObject({
      reminders: {
        packingListReminder: {
          sentAt: now,
          customerRecipients: ["ada@example.com"],
          operatorRecipients: [],
        },
      },
    })
  })

  it("captures reminder previews and still marks the booking sent in capture mode when requested", async () => {
    const now = Date.parse("2026-04-01T06:00:00.000Z")
    vi.spyOn(Date, "now").mockReturnValue(now)

    const harness = createHarness({
      bookings: [
        createBookingRecord({
          id: "booking_capture_weather",
          date: "2026-04-08",
          time: "09:00",
          bookingStartAt: Date.parse("2026-04-08T07:00:00.000Z"),
          courseName: "Schnupperkurs",
        }),
      ],
      settings: {
        _id: "booking_notifications_capture",
        organizationId: "org_segelschule",
        type: "organization_settings",
        subtype: "booking_notifications",
        status: "active",
        customProperties: {
          timezone: "Europe/Berlin",
          reminderLeadDays: 7,
          operatorEmails: ["ops@example.com"],
          operatorReminderKinds: ["weather"],
          defaultWeatherInfo: {
            de: "Bitte Wind und Regen 48 Stunden vorher noch einmal pruefen.",
          },
        },
      },
      contacts: [],
      domainConfigs: [
        {
          _id: "domain_config_capture",
          organizationId: "org_segelschule",
          type: "domain_config",
          status: "active",
        },
      ],
    })

    const result = await getHandler<any, any>(
      bookingWorkflowAutomation.executeBookingNotificationNode
    )(harness.ctx as any, {
      organizationId: "org_segelschule",
      nodeConfig: {
        action: "send-booking-reminders",
        reminderKind: "weather",
        daysBeforeStart: 7,
        recipientKinds: ["customer", "operator"],
        bookingIds: ["booking_capture_weather"],
        timezone: "Europe/Berlin",
        emailExecutionControl: {
          mode: "capture",
          capturePreviews: true,
          markAsSent: true,
          operatorRecipients: ["fixture-ops@example.com"],
        },
      },
      inputData: {},
    })

    expect(result.success).toBe(true)
    expect(result.data.remindersSent).toBe(1)
    expect(result.data.emailDeliveryMode).toBe("capture")
    expect(result.data.capturedPreviews).toHaveLength(1)
    expect(result.data.capturedPreviews[0]).toMatchObject({
      bookingId: "booking_capture_weather",
      reminderKind: "weather",
      deliveryMode: "capture",
      markedAsSent: true,
      customer: {
        to: ["ada@example.com"],
        subject: "Wetter-Info zu Ihrer Buchung: Schnupperkurs",
      },
      operator: {
        to: ["ops@example.com"],
        subject: "Weather reminder sent: Schnupperkurs",
      },
    })
    expect(String(result.data.capturedPreviews[0]?.customer?.html || "")).toContain(
      "Bitte Wind und Regen 48 Stunden vorher noch einmal pruefen."
    )
    expect(harness.sentEmails).toHaveLength(0)

    const updatedBooking = harness.records.get("booking_capture_weather")
    expect(updatedBooking?.customProperties?.notifications).toMatchObject({
      reminders: {
        weatherReminder: {
          sentAt: now,
          customerRecipients: ["ada@example.com"],
          operatorRecipients: ["ops@example.com"],
        },
      },
    })
  })

  it("captures booking confirmation previews from persisted booking data and marks confirmation sent when requested", async () => {
    const now = Date.parse("2026-04-01T06:00:00.000Z")
    vi.spyOn(Date, "now").mockReturnValue(now)

    const harness = createHarness({
      bookings: [
        createBookingRecord({
          id: "booking_confirmation_capture",
          date: "2026-04-08",
          time: "09:00",
          bookingStartAt: Date.parse("2026-04-08T07:00:00.000Z"),
          courseName: "Grundkurs",
          checkoutSessionId: "checkout_confirmation_capture",
          invoiceId: "invoice_confirmation_capture",
          totalAmountCents: 59_800,
          coursePriceInCents: 29_900,
        }),
      ],
      extraRecords: [
        {
          _id: "invoice_confirmation_capture",
          organizationId: "org_segelschule",
          type: "invoice",
          subtype: "manual_b2c",
          status: "sent",
          customProperties: {
            invoiceNumber: "SA-4001",
          },
        },
      ],
      settings: {
        _id: "booking_notifications_confirmation",
        organizationId: "org_segelschule",
        type: "organization_settings",
        subtype: "booking_notifications",
        status: "active",
        customProperties: {
          operatorEmails: ["ops@example.com"],
        },
      },
      contacts: [],
      domainConfigs: [
        {
          _id: "domain_config_confirmation",
          organizationId: "org_segelschule",
          type: "domain_config",
          status: "active",
        },
      ],
    })

    const result = await getHandler<any, any>(
      bookingWorkflowAutomation.executeBookingNotificationNode
    )(harness.ctx as any, {
      organizationId: "org_segelschule",
      nodeConfig: {
        action: "send-booking-confirmations",
        recipientKinds: ["customer", "operator"],
        bookingSubtypes: ["class_enrollment"],
        bookingSources: ["segelschule_landing"],
        operatorEmails: ["ops@example.com"],
        emailExecutionControl: {
          mode: "capture",
          capturePreviews: true,
          markAsSent: true,
        },
      },
      inputData: {
        bookingId: "booking_confirmation_capture",
        checkoutSessionId: "checkout_confirmation_capture",
      },
    })

    expect(result.success).toBe(true)
    expect(result.data.sent).toBe(1)
    expect(result.data.skippedAlreadySent).toBe(false)
    expect(result.data.capturedPreviews).toHaveLength(1)
    expect(result.data.capturedPreviews[0]).toMatchObject({
      bookingId: "booking_confirmation_capture",
      deliveryMode: "capture",
      markedAsSent: true,
      customer: {
        to: ["ada@example.com"],
        subject: "Buchungsbestätigung - Grundkurs",
        attachments: [],
      },
      operator: {
        to: ["ops@example.com"],
        subject: "New Booking: Ada Lovelace - Grundkurs",
      },
    })
    expect(String(result.data.capturedPreviews[0]?.customer?.html || "")).toContain(
      "Ticket ansehen"
    )
    expect(harness.sentEmails).toHaveLength(0)

    const updatedBooking = harness.records.get("booking_confirmation_capture")
    expect(updatedBooking?.customProperties?.notifications).toMatchObject({
      confirmation: {
        sentAt: now,
        customerRecipients: ["ada@example.com"],
        operatorRecipients: ["ops@example.com"],
      },
    })
  })

  it("dispatches only scheduled workflows whose cron matches the current local time", async () => {
    const now = Date.parse("2026-04-01T06:00:00.000Z")
    vi.spyOn(Date, "now").mockReturnValue(now)

    const startedExecutions: Array<Record<string, unknown>> = []

    const result = await getHandler<any, any>(
      bookingWorkflowAutomation.dispatchScheduledLayerWorkflows
    )(
      {
        runQuery: vi.fn(async () => [
          {
            _id: "workflow_weather",
            organizationId: "org_segelschule",
            name: "Segelschule Weather Reminder",
            status: "active",
            customProperties: {
              nodes: [
                {
                  id: "weather_schedule_trigger",
                  type: "trigger_schedule",
                  config: {
                    cronExpression: "0 8 * * *",
                    timezone: "Europe/Berlin",
                  },
                },
              ],
            },
          },
          {
            _id: "workflow_skip",
            organizationId: "org_segelschule",
            name: "Skip Later",
            status: "active",
            customProperties: {
              nodes: [
                {
                  id: "skip_schedule_trigger",
                  type: "trigger_schedule",
                  config: {
                    cronExpression: "30 8 * * *",
                    timezone: "Europe/Berlin",
                  },
                },
              ],
            },
          },
        ]),
        runAction: vi.fn(async (_ref: unknown, actionArgs: Record<string, unknown>) => {
          startedExecutions.push(actionArgs)
          return { success: true }
        }),
      } as any,
      {}
    )

    expect(result.ok).toBe(true)
    expect(result.dispatchedWorkflows).toBe(1)
    expect(result.workflows).toEqual([
      {
        workflowId: "workflow_weather",
        workflowName: "Segelschule Weather Reminder",
        executed: 1,
      },
    ])
    expect(startedExecutions).toHaveLength(1)
    expect(startedExecutions[0]).toMatchObject({
      workflowId: "workflow_weather",
      organizationId: "org_segelschule",
      triggerNodeId: "weather_schedule_trigger",
      triggerType: "schedule_cron",
      mode: "live",
    })
  })

  it("dispatches payment-received workflows only for matching provider and organization", async () => {
    const now = Date.parse("2026-04-01T08:00:00.000Z")
    vi.spyOn(Date, "now").mockReturnValue(now)

    const startedExecutions: Array<Record<string, unknown>> = []

    const result = await getHandler<any, any>(
      bookingWorkflowAutomation.dispatchPaymentReceivedLayerWorkflows
    )(
      {
        runQuery: vi.fn(async (_ref: unknown, args: Record<string, unknown>) => {
          if (args.triggerNodeType === "trigger_payment_received") {
            return [
              {
                _id: "workflow_lc_checkout",
                organizationId: "org_segelschule",
                name: "LC Checkout Payment Workflow",
                status: "active",
                customProperties: {
                  nodes: [
                    {
                      id: "payment_trigger_lc_checkout",
                      type: "trigger_payment_received",
                      config: {
                        paymentProvider: "lc_checkout",
                      },
                    },
                  ],
                },
              },
              {
                _id: "workflow_stripe_only",
                organizationId: "org_segelschule",
                name: "Stripe Payment Workflow",
                status: "active",
                customProperties: {
                  nodes: [
                    {
                      id: "payment_trigger_stripe",
                      type: "trigger_payment_received",
                      config: {
                        paymentProvider: "stripe",
                      },
                    },
                  ],
                },
              },
              {
                _id: "workflow_other_org",
                organizationId: "org_other",
                name: "Other Org Workflow",
                status: "active",
                customProperties: {
                  nodes: [
                    {
                      id: "payment_trigger_other_org",
                      type: "trigger_payment_received",
                      config: {
                        paymentProvider: "any",
                      },
                    },
                  ],
                },
              },
            ]
          }
          throw new Error(`Unexpected runQuery args: ${JSON.stringify(args)}`)
        }),
        runAction: vi.fn(async (_ref: unknown, args: Record<string, unknown>) => {
          startedExecutions.push(args)
          return { success: true }
        }),
      } as any,
      {
        organizationId: "org_segelschule",
        bookingId: "booking_1",
        checkoutSessionId: "checkout_1",
        transactionIds: ["transaction_1"],
        ticketIds: ["ticket_1"],
        contactId: "contact_1",
        paymentProvider: "lc_checkout",
        paymentMethod: "invoice",
        source: "segelschule_landing_booking",
      }
    )

    expect(result.ok).toBe(true)
    expect(result.dispatchedWorkflows).toBe(1)
    expect(result.workflows).toEqual([
      {
        workflowId: "workflow_lc_checkout",
        workflowName: "LC Checkout Payment Workflow",
        triggerNodeIds: ["payment_trigger_lc_checkout"],
      },
    ])
    expect(startedExecutions).toHaveLength(1)
    expect(startedExecutions[0]).toMatchObject({
      workflowId: "workflow_lc_checkout",
      organizationId: "org_segelschule",
      triggerNodeId: "payment_trigger_lc_checkout",
      triggerType: "payment_received",
      sessionId: "system:payment:checkout_1",
      mode: "live",
      triggerData: {
        occurredAt: now,
        paymentProvider: "lc_checkout",
        paymentMethod: "invoice",
        checkoutSessionId: "checkout_1",
        bookingId: "booking_1",
        transactionIds: ["transaction_1"],
        ticketIds: ["ticket_1"],
        source: "segelschule_landing_booking",
      },
      triggeredBy: "contact_1",
    })
  })

  it("dispatches booking-created workflows for the matching organization", async () => {
    const now = Date.parse("2026-04-01T08:30:00.000Z")
    vi.spyOn(Date, "now").mockReturnValue(now)

    const startedExecutions: Array<Record<string, unknown>> = []

    const result = await getHandler<any, any>(
      bookingWorkflowAutomation.dispatchBookingCreatedLayerWorkflows
    )(
      {
        runQuery: vi.fn(async (_ref: unknown, args: Record<string, unknown>) => {
          if (args.triggerNodeType === "trigger_booking_created") {
            return [
              {
                _id: "workflow_booking_created",
                organizationId: "org_segelschule",
                name: "Segelschule Booking Confirmation",
                status: "active",
                customProperties: {
                  nodes: [
                    {
                      id: "booking_created_trigger",
                      type: "trigger_booking_created",
                      config: {},
                    },
                  ],
                },
              },
              {
                _id: "workflow_other_org_booking",
                organizationId: "org_other",
                name: "Other Org Booking Workflow",
                status: "active",
                customProperties: {
                  nodes: [
                    {
                      id: "booking_created_trigger_other",
                      type: "trigger_booking_created",
                      config: {},
                    },
                  ],
                },
              },
            ]
          }
          throw new Error(`Unexpected runQuery args: ${JSON.stringify(args)}`)
        }),
        runAction: vi.fn(async (_ref: unknown, args: Record<string, unknown>) => {
          startedExecutions.push(args)
          return { success: true }
        }),
      } as any,
      {
        organizationId: "org_segelschule",
        bookingId: "booking_1",
        checkoutSessionId: "checkout_1",
        transactionIds: ["transaction_1"],
        ticketIds: ["ticket_1"],
        invoiceId: "invoice_1",
        contactId: "contact_1",
        paymentMethod: "invoice",
        source: "segelschule_landing_booking",
      }
    )

    expect(result.ok).toBe(true)
    expect(result.triggerType).toBe("booking_created")
    expect(result.dispatchedWorkflows).toBe(1)
    expect(result.workflows).toEqual([
      {
        workflowId: "workflow_booking_created",
        workflowName: "Segelschule Booking Confirmation",
        triggerNodeIds: ["booking_created_trigger"],
      },
    ])
    expect(startedExecutions).toHaveLength(1)
    expect(startedExecutions[0]).toMatchObject({
      workflowId: "workflow_booking_created",
      organizationId: "org_segelschule",
      triggerNodeId: "booking_created_trigger",
      triggerType: "booking_created",
      sessionId: "system:booking:booking_1",
      mode: "live",
      triggerData: {
        occurredAt: now,
        bookingId: "booking_1",
        checkoutSessionId: "checkout_1",
        transactionIds: ["transaction_1"],
        ticketIds: ["ticket_1"],
        invoiceId: "invoice_1",
        paymentMethod: "invoice",
        source: "segelschule_landing_booking",
      },
      triggeredBy: "contact_1",
    })
  })
})
