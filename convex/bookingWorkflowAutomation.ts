import { v } from "convex/values"
import { internalAction, internalMutation, internalQuery } from "./_generated/server"
import type { Id } from "./_generated/dataModel"
import {
  buildBookingReminderCustomerHtml,
  buildBookingReminderOperatorHtml,
  type BookingReminderEmailData,
} from "../src/lib/booking-email-templates"
import {
  buildReminderTrackingKey,
  isBookingReminderDue,
  matchesSimpleCronExpression,
  type BookingReminderKind,
} from "../src/lib/booking-workflow-utils"
import {
  normalizeBookingEmailExecutionControl,
  normalizeBookingEmailRecipients,
  resolveBookingEmailRecipients,
  type BookingEmailExecutionControl,
} from "../src/lib/booking-email-execution"
import { localDateTimeToTimestamp } from "../src/lib/timezone-utils"

// eslint-disable-next-line @typescript-eslint/no-var-requires
const generatedApi: any = require("./_generated/api")

type RouterObjectRecord = {
  _id: Id<"objects">
  organizationId: Id<"organizations">
  type: string
  subtype?: string
  status?: string
  name?: string
  customProperties?: Record<string, unknown>
}

type CapturedReminderPreview = {
  bookingId: string
  reminderKind: BookingReminderKind
  deliveryMode: BookingEmailExecutionControl["mode"]
  markedAsSent: boolean
  customer: {
    to: string[]
    subject: string
    html: string
  } | null
  operator: {
    to: string[]
    subject: string
    html: string
  } | null
}

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null
  }
  const normalized = value.trim()
  return normalized.length > 0 ? normalized : null
}

function normalizeEmail(value: unknown): string | null {
  const normalized = normalizeOptionalString(value)
  if (!normalized) {
    return null
  }
  const lowered = normalized.toLowerCase()
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lowered) ? lowered : null
}

function normalizeNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

function normalizeStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((entry) => normalizeOptionalString(entry))
      .filter((entry): entry is string => Boolean(entry))
  }

  const normalized = normalizeOptionalString(value)
  if (!normalized) {
    return []
  }

  try {
    const parsed = JSON.parse(normalized) as unknown
    if (Array.isArray(parsed)) {
      return parsed
        .map((entry) => normalizeOptionalString(entry))
        .filter((entry): entry is string => Boolean(entry))
    }
  } catch {
    // fall through to comma-separated parsing
  }

  return normalized
    .split(",")
    .map((entry) => normalizeOptionalString(entry))
    .filter((entry): entry is string => Boolean(entry))
}

function uniqueEmails(values: Array<string | null | undefined>): string[] {
  const seen = new Set<string>()
  const emails: string[] = []

  for (const value of values) {
    const normalized = normalizeEmail(value)
    if (!normalized || seen.has(normalized)) {
      continue
    }
    seen.add(normalized)
    emails.push(normalized)
  }

  return emails
}

function resolveLocalizedString(
  value: unknown,
  language: string,
  fallback: string
): string {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim()
  }

  if (value && typeof value === "object" && !Array.isArray(value)) {
    const record = value as Record<string, unknown>
    const exact =
      normalizeOptionalString(record[language])
      || normalizeOptionalString(record[language.toLowerCase()])
      || normalizeOptionalString(record.de)
      || normalizeOptionalString(record.en)
    if (exact) {
      return exact
    }
  }

  return fallback
}

function parseStoredList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((entry) => normalizeOptionalString(entry))
      .filter((entry): entry is string => Boolean(entry))
  }

  const normalized = normalizeOptionalString(value)
  if (!normalized) {
    return []
  }

  return normalized
    .split(/\r?\n|,/)
    .map((entry) => normalizeOptionalString(entry))
    .filter((entry): entry is string => Boolean(entry))
}

function resolveBookingStartAt(
  props: Record<string, unknown>,
  defaultTimezone: string
): { bookingStartAt: number | null; timezone: string } {
  const timezone =
    normalizeOptionalString(props.bookingTimezone)
    || normalizeOptionalString(props.timezone)
    || defaultTimezone

  const directTimestamp =
    normalizeNumber(props.bookingStartAt)
    || normalizeNumber(props.startDateTime)
    || normalizeNumber(props.courseStartAt)

  if (directTimestamp) {
    return { bookingStartAt: directTimestamp, timezone }
  }

  const date = normalizeOptionalString(props.date)
  const time = normalizeOptionalString(props.time)
  if (date && time) {
    return {
      bookingStartAt: localDateTimeToTimestamp(date, time, timezone),
      timezone,
    }
  }

  return { bookingStartAt: null, timezone }
}

function resolveReminderKind(value: unknown): BookingReminderKind {
  return value === "packing_list" ? "packing_list" : "weather"
}

function buildCustomerReminderSubject(args: {
  reminderKind: BookingReminderKind
  language: string
  courseName: string
}): string {
  if (args.reminderKind === "packing_list") {
    if (args.language === "de") {
      return `Packliste zu Ihrer Buchung: ${args.courseName}`
    }
    if (args.language === "nl") {
      return `Paklijst voor uw boeking: ${args.courseName}`
    }
    return `Packing list for your booking: ${args.courseName}`
  }

  if (args.language === "de") {
    return `Wetter-Info zu Ihrer Buchung: ${args.courseName}`
  }
  if (args.language === "nl") {
    return `Weerinfo voor uw boeking: ${args.courseName}`
  }
  return `Weather update for your booking: ${args.courseName}`
}

function buildOperatorReminderSubject(args: {
  reminderKind: BookingReminderKind
  courseName: string
}): string {
  return args.reminderKind === "packing_list"
    ? `Packing reminder sent: ${args.courseName}`
    : `Weather reminder sent: ${args.courseName}`
}

async function resolvePrimaryDomainConfigId(
  ctx: any,
  organizationId: Id<"organizations">
): Promise<Id<"objects"> | null> {
  const orgDomainConfigs = await ctx.runQuery(
    generatedApi.internal.domainConfigOntology.listDomainConfigsForOrg,
    { organizationId }
  ) as RouterObjectRecord[]

  const activeOrgDomain =
    orgDomainConfigs.find((config) => config.status === "active")
    || orgDomainConfigs[0]

  if (activeOrgDomain?._id) {
    return activeOrgDomain._id
  }

  const systemOrg = await ctx.runQuery(
    generatedApi.internal.helpers.backendTranslationQueries.getSystemOrganization,
    {}
  ) as { _id?: Id<"organizations"> } | null

  if (!systemOrg?._id) {
    return null
  }

  const systemDomainConfigs = await ctx.runQuery(
    generatedApi.internal.domainConfigOntology.listDomainConfigsForOrg,
    { organizationId: systemOrg._id }
  ) as RouterObjectRecord[]

  return (
    systemDomainConfigs.find((config) => config.status === "active")?._id
    || systemDomainConfigs[0]?._id
    || null
  )
}

async function sendHandBuiltEmail(args: {
  ctx: any
  domainConfigId: Id<"objects"> | null
  to: string
  subject: string
  html: string
}) {
  if (args.domainConfigId) {
    return await args.ctx.runAction(generatedApi.internal.emailDelivery.sendEmail, {
      domainConfigId: args.domainConfigId,
      to: args.to,
      subject: args.subject,
      html: args.html,
    })
  }

  return await args.ctx.runAction(generatedApi.internal.emailDelivery.sendEmailWithDefaultSender, {
    to: args.to,
    subject: args.subject,
    html: args.html,
  })
}

export const listActiveLayerWorkflowsByTrigger = internalQuery({
  args: {
    triggerNodeType: v.string(),
  },
  handler: async (ctx, args) => {
    const workflows = await ctx.db
      .query("objects")
      .filter((q) => q.eq(q.field("type"), "layer_workflow"))
      .collect()

    return workflows.filter((workflow) => {
      if (workflow.status !== "active") {
        return false
      }
      const customProperties = (workflow.customProperties || {}) as Record<string, unknown>
      const nodes = Array.isArray(customProperties.nodes) ? customProperties.nodes : []
      return nodes.some(
        (node) =>
          node
          && typeof node === "object"
          && (node as Record<string, unknown>).type === args.triggerNodeType
      )
    })
  },
})

export const getBookingNotificationSettingsInternal = internalQuery({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const settings = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "organization_settings")
      )
      .collect()

    return settings.find((setting) => setting.subtype === "booking_notifications") || null
  },
})

export const markBookingReminderSentInternal = internalMutation({
  args: {
    bookingId: v.id("objects"),
    reminderKind: v.string(),
    sentAt: v.number(),
    customerRecipients: v.optional(v.array(v.string())),
    operatorRecipients: v.optional(v.array(v.string())),
    packingListItems: v.optional(v.array(v.string())),
    weatherInfo: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const booking = await ctx.db.get(args.bookingId)
    if (!booking || booking.type !== "booking") {
      throw new Error("Booking not found")
    }

    const customProperties = (booking.customProperties || {}) as Record<string, unknown>
    const notifications =
      customProperties.notifications && typeof customProperties.notifications === "object"
        ? (customProperties.notifications as Record<string, unknown>)
        : {}
    const reminders =
      notifications.reminders && typeof notifications.reminders === "object"
        ? (notifications.reminders as Record<string, unknown>)
        : {}

    const trackingKey = buildReminderTrackingKey(resolveReminderKind(args.reminderKind))

    await ctx.db.patch(args.bookingId, {
      customProperties: {
        ...customProperties,
        ...(args.packingListItems && args.packingListItems.length > 0
          ? {
              packingList: args.packingListItems.join("\n"),
              packingListItems: args.packingListItems,
            }
          : {}),
        ...(args.weatherInfo ? { weatherInfo: args.weatherInfo } : {}),
        notifications: {
          ...notifications,
          reminders: {
            ...reminders,
            [trackingKey]: {
              sentAt: args.sentAt,
              customerRecipients: args.customerRecipients || [],
              operatorRecipients: args.operatorRecipients || [],
            },
          },
        },
      },
      updatedAt: Date.now(),
    })

    return { success: true }
  },
})

export const dispatchScheduledLayerWorkflows = internalAction({
  args: {},
  handler: async (ctx) => {
    const now = Date.now()
    const workflows = await ctx.runQuery(
      generatedApi.internal.bookingWorkflowAutomation.listActiveLayerWorkflowsByTrigger,
      { triggerNodeType: "trigger_schedule" }
    ) as Array<RouterObjectRecord & { customProperties?: Record<string, unknown> }>

    const dispatchResults: Array<{
      workflowId: string
      workflowName: string
      executed: number
    }> = []

    for (const workflow of workflows) {
      const customProperties = (workflow.customProperties || {}) as Record<string, unknown>
      const nodes = Array.isArray(customProperties.nodes) ? customProperties.nodes : []
      const scheduleNodes = nodes.filter(
        (node) =>
          node
          && typeof node === "object"
          && (node as Record<string, unknown>).type === "trigger_schedule"
      ) as Array<Record<string, unknown>>

      let executed = 0

      for (const scheduleNode of scheduleNodes) {
        const nodeConfig =
          scheduleNode.config && typeof scheduleNode.config === "object"
            ? (scheduleNode.config as Record<string, unknown>)
            : {}
        const cronExpression = normalizeOptionalString(nodeConfig.cronExpression)
        const timezone = normalizeOptionalString(nodeConfig.timezone) || "UTC"
        const nodeId = normalizeOptionalString(scheduleNode.id)

        if (!cronExpression || !nodeId) {
          continue
        }

        if (
          !matchesSimpleCronExpression({
            timestamp: now,
            cronExpression,
            timezone,
          })
        ) {
          continue
        }

        await ctx.runAction(generatedApi.internal.layers.graphEngine.startExecution, {
          workflowId: workflow._id,
          organizationId: workflow.organizationId,
          sessionId: "system:schedule",
          triggerType: "schedule_cron",
          triggerNodeId: nodeId,
          triggerData: {
            scheduledAt: now,
            cronExpression,
            timezone,
          },
          mode: "live",
        })
        executed += 1
      }

      if (executed > 0) {
        dispatchResults.push({
          workflowId: String(workflow._id),
          workflowName: workflow.name || "Unnamed workflow",
          executed,
        })
      }
    }

    return {
      ok: true,
      checkedAt: now,
      dispatchedWorkflows: dispatchResults.length,
      workflows: dispatchResults,
    }
  },
})

export const executeBookingNotificationNode = internalAction({
  args: {
    organizationId: v.id("organizations"),
    nodeConfig: v.any(),
    inputData: v.any(),
  },
  handler: async (ctx, args) => {
    const nodeConfig =
      args.nodeConfig && typeof args.nodeConfig === "object"
        ? (args.nodeConfig as Record<string, unknown>)
        : {}
    const action = normalizeOptionalString(nodeConfig.action)

    if (action !== "send-booking-reminders") {
      return {
        success: false,
        error: "Unsupported booking notification action",
      }
    }

    const settings = await ctx.runQuery(
      generatedApi.internal.bookingWorkflowAutomation.getBookingNotificationSettingsInternal,
      { organizationId: args.organizationId }
    ) as RouterObjectRecord | null
    const settingsProps = (settings?.customProperties || {}) as Record<string, unknown>

    const reminderKind = resolveReminderKind(nodeConfig.reminderKind)
    const defaultTimezone =
      normalizeOptionalString(nodeConfig.timezone)
      || normalizeOptionalString(settingsProps.timezone)
      || "Europe/Berlin"
    const daysBeforeStart =
      normalizeNumber(nodeConfig.daysBeforeStart)
      || normalizeNumber(settingsProps.reminderLeadDays)
      || 7
    const recipientKinds = normalizeStringArray(nodeConfig.recipientKinds)
    const shouldSendCustomer =
      recipientKinds.length === 0 || recipientKinds.includes("customer")
    const shouldSendOperator =
      recipientKinds.includes("operator")
      || normalizeStringArray(settingsProps.operatorReminderKinds).includes(reminderKind)
    const allowedSubtypes = normalizeStringArray(nodeConfig.bookingSubtypes)
    const allowedSources = normalizeStringArray(nodeConfig.bookingSources)
    const allowedBookingIds = new Set(normalizeStringArray(nodeConfig.bookingIds))
    const emailExecutionControl = normalizeBookingEmailExecutionControl(
      nodeConfig.emailExecutionControl,
      { defaultMarkAsSent: false }
    )

    const bookings = await ctx.runQuery(
      generatedApi.internal.channels.router.listObjectsByOrgTypeInternal,
      {
        organizationId: args.organizationId,
        type: "booking",
      }
    ) as RouterObjectRecord[]

    const contacts = await ctx.runQuery(
      generatedApi.internal.channels.router.listObjectsByOrgTypeInternal,
      {
        organizationId: args.organizationId,
        type: "organization_contact",
      }
    ) as RouterObjectRecord[]

    const operatorRecipients = uniqueEmails([
      ...normalizeStringArray(nodeConfig.operatorEmails),
      ...normalizeStringArray(settingsProps.operatorEmails),
      ...contacts.flatMap((contact) => {
        const props = (contact.customProperties || {}) as Record<string, unknown>
        return [
          normalizeOptionalString(props.contactEmail),
          normalizeOptionalString(props.primaryEmail),
        ]
      }),
    ])

    const domainConfigId = await resolvePrimaryDomainConfigId(ctx, args.organizationId)
    const now = Date.now()

    let bookingsChecked = 0
    let remindersSent = 0
    const errors: string[] = []
    const capturedPreviews: CapturedReminderPreview[] = []

    for (const booking of bookings) {
      const props = (booking.customProperties || {}) as Record<string, unknown>

      if (booking.status === "cancelled") {
        continue
      }
      if (
        allowedBookingIds.size > 0
        && !allowedBookingIds.has(String(booking._id))
      ) {
        continue
      }
      if (allowedSubtypes.length > 0 && !allowedSubtypes.includes(booking.subtype || "")) {
        continue
      }
      const bookingSource = normalizeOptionalString(props.source)
      if (allowedSources.length > 0 && (!bookingSource || !allowedSources.includes(bookingSource))) {
        continue
      }

      bookingsChecked += 1

      const trackingKey = buildReminderTrackingKey(reminderKind)
      const reminderState = (
        ((props.notifications as Record<string, unknown> | undefined)?.reminders as Record<string, unknown> | undefined)
        || {}
      )[trackingKey] as Record<string, unknown> | undefined

      if (normalizeNumber(reminderState?.sentAt)) {
        continue
      }

      const { bookingStartAt, timezone } = resolveBookingStartAt(props, defaultTimezone)
      if (
        !bookingStartAt
        || !isBookingReminderDue({
          bookingStartAt,
          now,
          daysBeforeStart,
          timezone,
        })
      ) {
        continue
      }

      const language = normalizeOptionalString(props.language) || "de"
      const packingListItems = parseStoredList(props.packingListItems)
      const storedPackingList = packingListItems.length > 0
        ? packingListItems
        : parseStoredList(props.packingList)
      const fallbackPackingList = normalizeStringArray(settingsProps.defaultPackingList)
      const finalPackingList = storedPackingList.length > 0 ? storedPackingList : fallbackPackingList

      const weatherInfo =
        normalizeOptionalString(props.weatherInfo)
        || resolveLocalizedString(
          nodeConfig.weatherFallback || settingsProps.defaultWeatherInfo,
          language,
          "Bitte pruefen Sie die Wetterlage 48 bis 24 Stunden vor Kursbeginn erneut."
        )

      const reminderData: BookingReminderEmailData = {
        reminderKind,
        bookingId: String(booking._id),
        customerName:
          normalizeOptionalString(props.customerName)
          || normalizeOptionalString(props.holderName)
          || "Guest",
        customerEmail: normalizeEmail(props.customerEmail) || undefined,
        courseName:
          normalizeOptionalString(props.courseName)
          || normalizeOptionalString(props.productName)
          || booking.name
          || "Booking",
        date: normalizeOptionalString(props.date) || "TBD",
        time: normalizeOptionalString(props.time) || "TBD",
        language,
        ticketLookupUrl: normalizeOptionalString(props.primaryTicketLookupUrl) || undefined,
        ticketCode: normalizeOptionalString(props.primaryTicketCode) || undefined,
        weatherInfo,
        packingListItems: finalPackingList,
        operatorLabel: "A seeded Layers reminder workflow sent this message.",
      }

      const baseCustomerRecipients = shouldSendCustomer
        ? normalizeBookingEmailRecipients([reminderData.customerEmail])
        : []
      const baseOperatorRecipients = shouldSendOperator ? operatorRecipients : []
      const customerRecipients = resolveBookingEmailRecipients({
        baseRecipients: baseCustomerRecipients,
        overrideRecipients: emailExecutionControl.customerRecipients,
        mode: emailExecutionControl.mode,
      })
      const eligibleOperatorRecipients = resolveBookingEmailRecipients({
        baseRecipients: baseOperatorRecipients,
        overrideRecipients: emailExecutionControl.operatorRecipients,
        mode: emailExecutionControl.mode,
      })
      const customerSubject = buildCustomerReminderSubject({
        reminderKind,
        language,
        courseName: reminderData.courseName,
      })
      const operatorSubject = buildOperatorReminderSubject({
        reminderKind,
        courseName: reminderData.courseName,
      })
      const customerHtml = customerRecipients.length > 0
        ? buildBookingReminderCustomerHtml(reminderData)
        : null
      const operatorHtml = eligibleOperatorRecipients.length > 0
        ? buildBookingReminderOperatorHtml(reminderData)
        : null
      const shouldMarkReminder =
        emailExecutionControl.mode !== "capture"
        || emailExecutionControl.markAsSent

      if (
        customerRecipients.length === 0
        && eligibleOperatorRecipients.length === 0
      ) {
        errors.push(`${booking._id}:no_recipients_configured`)
        continue
      }

      try {
        if (emailExecutionControl.capturePreviews) {
          capturedPreviews.push({
            bookingId: String(booking._id),
            reminderKind,
            deliveryMode: emailExecutionControl.mode,
            markedAsSent: shouldMarkReminder,
            customer: customerHtml
              ? {
                  to: customerRecipients,
                  subject: customerSubject,
                  html: customerHtml,
                }
              : null,
            operator: operatorHtml
              ? {
                  to: eligibleOperatorRecipients,
                  subject: operatorSubject,
                  html: operatorHtml,
                }
              : null,
          })
        }

        if (emailExecutionControl.mode !== "capture") {
          for (const recipient of customerRecipients) {
            await sendHandBuiltEmail({
              ctx,
              domainConfigId,
              to: recipient,
              subject: customerSubject,
              html: customerHtml || buildBookingReminderCustomerHtml(reminderData),
            })
          }

          for (const recipient of eligibleOperatorRecipients) {
              await sendHandBuiltEmail({
                ctx,
                domainConfigId,
                to: recipient,
                subject: operatorSubject,
                html: operatorHtml || buildBookingReminderOperatorHtml(reminderData),
              })
          }
        }

        if (shouldMarkReminder) {
          await ctx.runMutation(
            generatedApi.internal.bookingWorkflowAutomation.markBookingReminderSentInternal,
            {
              bookingId: booking._id,
              reminderKind,
              sentAt: now,
              customerRecipients,
              operatorRecipients: eligibleOperatorRecipients,
              ...(reminderKind === "packing_list" && finalPackingList.length > 0
                ? { packingListItems: finalPackingList }
                : {}),
              ...(reminderKind === "weather" && weatherInfo
                ? { weatherInfo }
                : {}),
            }
          )
          remindersSent += 1
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        errors.push(`${booking._id}:${message}`)
      }
    }

    return {
      success: errors.length === 0,
      data: {
        bookingsChecked,
        remindersSent,
        reminderKind,
        errors,
        emailDeliveryMode: emailExecutionControl.mode,
        capturedPreviews,
      },
      ...(errors.length > 0 ? { error: errors.join("; ") } : {}),
    }
  },
})
