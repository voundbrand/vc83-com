import { v } from "convex/values"
import { internalAction, internalMutation, internalQuery } from "./_generated/server"
import type { Id } from "./_generated/dataModel"
import {
  buildBookingConfirmationHtml,
  buildBookingNotificationHtml,
  buildBookingReminderCustomerHtml,
  buildBookingReminderOperatorHtml,
  type BookingEmailData,
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

type CapturedBookingConfirmationPreview = {
  bookingId: string
  deliveryMode: BookingEmailExecutionControl["mode"]
  markedAsSent: boolean
  customer: {
    to: string[]
    subject: string
    html: string
    attachments: Array<{
      filename: string
      contentType: string
      base64Length: number
    }>
  } | null
  operator: {
    to: string[]
    subject: string
    html: string
  } | null
}

type ReminderEmailSendResult = {
  success: boolean
  messageId?: string
  error?: string
  attempts?: number
}

type ReminderEmailDeliveryRecord = {
  bookingId: string
  reminderKind: BookingReminderKind
  recipientKind: "customer" | "operator"
  to: string
  subject: string
  success: boolean
  messageId: string | null
  error: string | null
}

type BookingConfirmationDeliveryRecord = {
  bookingId: string
  recipientKind: "customer" | "operator"
  to: string
  subject: string
  success: boolean
  messageId: string | null
  error: string | null
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

function normalizePaymentProvider(value: unknown): string {
  const normalized = normalizeOptionalString(value)?.toLowerCase()
  if (!normalized) {
    return "lc_checkout"
  }
  return normalized
}

function paymentProviderMatches(configuredProvider: unknown, actualProvider: string): boolean {
  const normalizedConfigured = normalizeOptionalString(configuredProvider)?.toLowerCase()
  if (!normalizedConfigured || normalizedConfigured === "any") {
    return true
  }
  return normalizedConfigured === actualProvider
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

function resolveLocaleFromLanguage(language: string): string {
  if (language === "de" || language === "ch") {
    return "de-DE"
  }
  if (language === "nl") {
    return "nl-NL"
  }
  return "en-US"
}

function formatCurrencyAmount(args: {
  amountInCents: number
  currency: string
  language: string
}): string {
  try {
    return new Intl.NumberFormat(resolveLocaleFromLanguage(args.language), {
      style: "currency",
      currency: args.currency || "EUR",
    }).format(args.amountInCents / 100)
  } catch {
    return `${args.currency || "EUR"} ${(args.amountInCents / 100).toFixed(2)}`
  }
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
  replyTo?: string
  attachments?: Array<{
    filename: string
    content: string
    contentType: string
  }>
}): Promise<ReminderEmailSendResult> {
  if (args.domainConfigId) {
    return await args.ctx.runAction(generatedApi.internal.emailDelivery.sendEmail, {
      domainConfigId: args.domainConfigId,
      to: args.to,
      subject: args.subject,
      html: args.html,
      ...(args.replyTo ? { replyTo: args.replyTo } : {}),
      ...(args.attachments ? { attachments: args.attachments } : {}),
    })
  }

  return await args.ctx.runAction(generatedApi.internal.emailDelivery.sendEmailWithDefaultSender, {
    to: args.to,
    subject: args.subject,
    html: args.html,
    ...(args.replyTo ? { replyTo: args.replyTo } : {}),
    ...(args.attachments ? { attachments: args.attachments } : {}),
  })
}

export const listActiveLayerWorkflowsByTrigger = internalQuery({
  args: {
    triggerNodeType: v.string(),
  },
  handler: async (ctx, args) => {
    const workflows = await ctx.db
      .query("objects")
      .withIndex("by_type", (q) => q.eq("type", "layer_workflow"))
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
    const activeSettings = await ctx.db
      .query("objects")
      .withIndex("by_org_type_subtype_status", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("type", "organization_settings")
          .eq("subtype", "booking_notifications")
          .eq("status", "active")
      )
      .first()

    if (activeSettings) {
      return activeSettings
    }

    return await ctx.db
      .query("objects")
      .withIndex("by_org_type_subtype", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("type", "organization_settings")
          .eq("subtype", "booking_notifications")
      )
      .first()
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

export const markBookingConfirmationSentInternal = internalMutation({
  args: {
    bookingId: v.id("objects"),
    sentAt: v.number(),
    customerRecipients: v.optional(v.array(v.string())),
    operatorRecipients: v.optional(v.array(v.string())),
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

    await ctx.db.patch(args.bookingId, {
      customProperties: {
        ...customProperties,
        notifications: {
          ...notifications,
          confirmation: {
            sentAt: args.sentAt,
            customerRecipients: args.customerRecipients || [],
            operatorRecipients: args.operatorRecipients || [],
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
    console.log(
      `[BookingWorkflowAutomation] dispatchScheduledLayerWorkflows checked ${workflows.length} active schedule workflows at ${new Date(now).toISOString()}`
    )

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

    console.log(
      `[BookingWorkflowAutomation] dispatchScheduledLayerWorkflows dispatched ${dispatchResults.length} workflow(s) at ${new Date(now).toISOString()}`
    )

    return {
      ok: true,
      checkedAt: now,
      dispatchedWorkflows: dispatchResults.length,
      workflows: dispatchResults,
    }
  },
})

export const dispatchPaymentReceivedLayerWorkflows = internalAction({
  args: {
    organizationId: v.id("organizations"),
    checkoutSessionId: v.id("objects"),
    bookingId: v.optional(v.id("objects")),
    contactId: v.optional(v.id("objects")),
    platformBookingId: v.optional(v.id("objects")),
    frontendUserId: v.optional(v.id("objects")),
    transactionIds: v.optional(v.array(v.id("objects"))),
    ticketIds: v.optional(v.array(v.id("objects"))),
    paymentProvider: v.optional(v.string()),
    paymentMethod: v.optional(v.string()),
    source: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    const paymentProvider = normalizePaymentProvider(args.paymentProvider)
    const workflows = await ctx.runQuery(
      generatedApi.internal.bookingWorkflowAutomation.listActiveLayerWorkflowsByTrigger,
      { triggerNodeType: "trigger_payment_received" }
    ) as Array<RouterObjectRecord & { customProperties?: Record<string, unknown> }>

    const dispatchResults: Array<{
      workflowId: string
      workflowName: string
      triggerNodeIds: string[]
    }> = []
    const errors: string[] = []

    for (const workflow of workflows) {
      if (workflow.organizationId !== args.organizationId) {
        continue
      }

      const workflowProps = (workflow.customProperties || {}) as Record<string, unknown>
      const nodes = Array.isArray(workflowProps.nodes)
        ? (workflowProps.nodes as Array<Record<string, unknown>>)
        : []
      const matchingTriggerNodes = nodes.filter((node) => {
        if (!node || typeof node !== "object" || node.type !== "trigger_payment_received") {
          return false
        }
        const nodeConfig =
          node.config && typeof node.config === "object"
            ? (node.config as Record<string, unknown>)
            : {}
        return paymentProviderMatches(nodeConfig.paymentProvider, paymentProvider)
      })

      if (matchingTriggerNodes.length === 0) {
        continue
      }

      const executedTriggerNodeIds: string[] = []

      for (const triggerNode of matchingTriggerNodes) {
        const triggerNodeId = normalizeOptionalString(triggerNode.id)
        if (!triggerNodeId) {
          continue
        }

        try {
          await ctx.runAction(generatedApi.internal.layers.graphEngine.startExecution, {
            workflowId: workflow._id,
            organizationId: workflow.organizationId,
            sessionId: `system:payment:${String(args.checkoutSessionId)}`,
            triggerType: "payment_received",
            triggerNodeId,
            triggerData: {
              occurredAt: now,
              paymentProvider,
              paymentMethod: normalizeOptionalString(args.paymentMethod) || "invoice",
              checkoutSessionId: args.checkoutSessionId,
              bookingId: args.bookingId || null,
              contactId: args.contactId || null,
              platformBookingId: args.platformBookingId || null,
              frontendUserId: args.frontendUserId || null,
              transactionIds: args.transactionIds || [],
              ticketIds: args.ticketIds || [],
              source: normalizeOptionalString(args.source) || "booking_payment_received",
            },
            mode: "live",
            ...(args.contactId ? { triggeredBy: args.contactId } : {}),
          })
          executedTriggerNodeIds.push(triggerNodeId)
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          errors.push(`${String(workflow._id)}:${triggerNodeId}:${message}`)
        }
      }

      if (executedTriggerNodeIds.length > 0) {
        dispatchResults.push({
          workflowId: String(workflow._id),
          workflowName: workflow.name || "Unnamed workflow",
          triggerNodeIds: executedTriggerNodeIds,
        })
      }
    }

    return {
      ok: errors.length === 0,
      checkedAt: now,
      paymentProvider,
      dispatchedWorkflows: dispatchResults.length,
      workflows: dispatchResults,
      ...(errors.length > 0 ? { errors } : {}),
    }
  },
})

export const dispatchBookingCreatedLayerWorkflows = internalAction({
  args: {
    organizationId: v.id("organizations"),
    bookingId: v.id("objects"),
    checkoutSessionId: v.optional(v.id("objects")),
    contactId: v.optional(v.id("objects")),
    platformBookingId: v.optional(v.id("objects")),
    frontendUserId: v.optional(v.id("objects")),
    transactionIds: v.optional(v.array(v.id("objects"))),
    ticketIds: v.optional(v.array(v.id("objects"))),
    invoiceId: v.optional(v.id("objects")),
    paymentMethod: v.optional(v.string()),
    source: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    const workflows = await ctx.runQuery(
      generatedApi.internal.bookingWorkflowAutomation.listActiveLayerWorkflowsByTrigger,
      { triggerNodeType: "trigger_booking_created" }
    ) as Array<RouterObjectRecord & { customProperties?: Record<string, unknown> }>

    const dispatchResults: Array<{
      workflowId: string
      workflowName: string
      triggerNodeIds: string[]
    }> = []
    const errors: string[] = []

    for (const workflow of workflows) {
      if (workflow.organizationId !== args.organizationId) {
        continue
      }

      const workflowProps = (workflow.customProperties || {}) as Record<string, unknown>
      const nodes = Array.isArray(workflowProps.nodes)
        ? (workflowProps.nodes as Array<Record<string, unknown>>)
        : []
      const matchingTriggerNodes = nodes.filter(
        (node) =>
          node
          && typeof node === "object"
          && node.type === "trigger_booking_created"
      )

      if (matchingTriggerNodes.length === 0) {
        continue
      }

      const executedTriggerNodeIds: string[] = []

      for (const triggerNode of matchingTriggerNodes) {
        const triggerNodeId = normalizeOptionalString(triggerNode.id)
        if (!triggerNodeId) {
          continue
        }

        try {
          await ctx.runAction(generatedApi.internal.layers.graphEngine.startExecution, {
            workflowId: workflow._id,
            organizationId: workflow.organizationId,
            sessionId: `system:booking:${String(args.bookingId)}`,
            triggerType: "booking_created",
            triggerNodeId,
            triggerData: {
              occurredAt: now,
              bookingId: args.bookingId,
              checkoutSessionId: args.checkoutSessionId || null,
              contactId: args.contactId || null,
              platformBookingId: args.platformBookingId || null,
              frontendUserId: args.frontendUserId || null,
              transactionIds: args.transactionIds || [],
              ticketIds: args.ticketIds || [],
              invoiceId: args.invoiceId || null,
              paymentMethod: normalizeOptionalString(args.paymentMethod) || "invoice",
              source: normalizeOptionalString(args.source) || "booking_created",
            },
            mode: "live",
            ...(args.contactId ? { triggeredBy: args.contactId } : {}),
          })
          executedTriggerNodeIds.push(triggerNodeId)
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          errors.push(`${String(workflow._id)}:${triggerNodeId}:${message}`)
        }
      }

      if (executedTriggerNodeIds.length > 0) {
        dispatchResults.push({
          workflowId: String(workflow._id),
          workflowName: workflow.name || "Unnamed workflow",
          triggerNodeIds: executedTriggerNodeIds,
        })
      }
    }

    return {
      ok: errors.length === 0,
      checkedAt: now,
      triggerType: "booking_created",
      dispatchedWorkflows: dispatchResults.length,
      workflows: dispatchResults,
      ...(errors.length > 0 ? { errors } : {}),
    }
  },
})

function buildCustomerConfirmationSubject(args: {
  language: string
  courseName: string
}): string {
  if (args.language === "de") {
    return `Buchungsbestätigung - ${args.courseName}`
  }
  if (args.language === "nl") {
    return `Boekingsbevestiging - ${args.courseName}`
  }
  return `Booking Confirmation - ${args.courseName}`
}

function buildOperatorConfirmationSubject(args: {
  customerName: string
  courseName: string
}): string {
  return `New Booking: ${args.customerName} - ${args.courseName}`
}

function normalizeSeatSelections(
  value: unknown
): BookingEmailData["seats"] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") {
      return []
    }
    const seat = entry as Record<string, unknown>
    const boatName = normalizeOptionalString(seat.boatName) || "Boat"
    const seatNumbers = Array.isArray(seat.seatNumbers)
      ? seat.seatNumbers.filter(
          (seatNumber): seatNumber is number =>
            typeof seatNumber === "number" && Number.isFinite(seatNumber)
        )
      : []
    return [{ boatName, seatNumbers }]
  })
}

async function buildBookingInvoiceAttachment(args: {
  ctx: any
  organizationId: Id<"organizations">
  checkoutSessionId: Id<"objects"> | null
  invoiceId: Id<"objects"> | null
}): Promise<{
  filename: string
  content: string
  contentType: string
} | null> {
  if (!args.checkoutSessionId) {
    return null
  }

  let invoice: RouterObjectRecord | null = null
  if (args.invoiceId) {
    const maybeInvoice = await args.ctx.db.get(args.invoiceId)
    if (maybeInvoice && maybeInvoice.type === "invoice") {
      invoice = maybeInvoice
    }
  }

  if (!invoice) {
    invoice = await args.ctx.runQuery(
      generatedApi.internal.invoicingOntology.getInvoiceByCheckoutSessionInternal,
      {
        organizationId: args.organizationId,
        checkoutSessionId: args.checkoutSessionId,
      }
    ) as RouterObjectRecord | null
  }

  if (!invoice || invoice.type !== "invoice") {
    return null
  }
  if (invoice.subtype === "none" || invoice.subtype === "employer") {
    return null
  }

  const invoiceProps = (invoice.customProperties || {}) as Record<string, unknown>
  const pdf = await args.ctx.runAction(generatedApi.api.pdfGeneration.generateInvoicePDF, {
    checkoutSessionId: args.checkoutSessionId,
    ...(invoiceProps.crmOrganizationId
      ? { crmOrganizationId: invoiceProps.crmOrganizationId as Id<"objects"> }
      : {}),
    ...(invoiceProps.crmContactId
      ? { crmContactId: invoiceProps.crmContactId as Id<"objects"> }
      : {}),
  }) as
    | {
        filename?: string
        content?: string
        contentType?: string
      }
    | null

  const filename = normalizeOptionalString(pdf?.filename)
  const content = normalizeOptionalString(pdf?.content)
  const contentType =
    normalizeOptionalString(pdf?.contentType) || "application/pdf"

  if (!filename || !content) {
    return null
  }

  return {
    filename,
    content,
    contentType,
  }
}

async function executeBookingConfirmationAction(
  ctx: any,
  args: {
    organizationId: Id<"organizations">
    nodeConfig: Record<string, unknown>
    inputData: Record<string, unknown>
  }
) {
  const settings = await ctx.runQuery(
    generatedApi.internal.bookingWorkflowAutomation.getBookingNotificationSettingsInternal,
    { organizationId: args.organizationId }
  ) as RouterObjectRecord | null
  const settingsProps = (settings?.customProperties || {}) as Record<string, unknown>

  const bookingId =
    normalizeOptionalString(args.inputData.bookingId)
    || normalizeOptionalString(args.nodeConfig.bookingId)
  if (!bookingId) {
    return {
      success: false,
      error: "bookingId is required for booking confirmation notifications",
    }
  }

  const booking = await ctx.db.get(bookingId as Id<"objects">)
  if (!booking || booking.type !== "booking" || booking.organizationId !== args.organizationId) {
    return {
      success: false,
      error: "Booking not found",
    }
  }

  const props = (booking.customProperties || {}) as Record<string, unknown>
  const confirmationState =
    ((props.notifications as Record<string, unknown> | undefined)?.confirmation
      || null) as Record<string, unknown> | null
  const alreadySentAt = normalizeNumber(confirmationState?.sentAt)
  if (alreadySentAt) {
    return {
      success: true,
      data: {
        bookingId: String(booking._id),
        skippedAlreadySent: true,
        sentAt: alreadySentAt,
        emailDeliveryMode: "live",
        capturedPreviews: [],
        deliveries: [],
        errors: [],
      },
    }
  }

  const allowedSubtypes = normalizeStringArray(args.nodeConfig.bookingSubtypes)
  if (allowedSubtypes.length > 0 && !allowedSubtypes.includes(booking.subtype || "")) {
    return {
      success: true,
      data: {
        bookingId: String(booking._id),
        skipped: "booking_subtype_filtered",
        emailDeliveryMode: "live",
        capturedPreviews: [],
        deliveries: [],
        errors: [],
      },
    }
  }

  const bookingSource = normalizeOptionalString(props.source)
  const allowedSources = normalizeStringArray(args.nodeConfig.bookingSources)
  if (allowedSources.length > 0 && (!bookingSource || !allowedSources.includes(bookingSource))) {
    return {
      success: true,
      data: {
        bookingId: String(booking._id),
        skipped: "booking_source_filtered",
        emailDeliveryMode: "live",
        capturedPreviews: [],
        deliveries: [],
        errors: [],
      },
    }
  }

  const contacts = await ctx.runQuery(
    generatedApi.internal.channels.router.listObjectsByOrgTypeInternal,
    {
      organizationId: args.organizationId,
      type: "organization_contact",
    }
  ) as RouterObjectRecord[]

  const operatorRecipients = uniqueEmails([
    ...normalizeStringArray(args.nodeConfig.operatorEmails),
    ...normalizeStringArray(settingsProps.operatorEmails),
    ...contacts.flatMap((contact) => {
      const contactProps = (contact.customProperties || {}) as Record<string, unknown>
      return [
        normalizeOptionalString(contactProps.contactEmail),
        normalizeOptionalString(contactProps.primaryEmail),
      ]
    }),
  ])

  const emailExecutionControl = normalizeBookingEmailExecutionControl(
    args.nodeConfig.emailExecutionControl,
    { defaultMarkAsSent: false }
  )
  const recipientKinds = normalizeStringArray(args.nodeConfig.recipientKinds)
  const shouldSendCustomer =
    recipientKinds.length === 0 || recipientKinds.includes("customer")
  const shouldSendOperator =
    recipientKinds.length === 0 || recipientKinds.includes("operator")

  const language = normalizeOptionalString(props.language) || "de"
  const customerName = normalizeOptionalString(props.customerName) || "Guest"
  const customerEmail = normalizeEmail(props.customerEmail) || ""
  const customerPhone = normalizeOptionalString(props.customerPhone) || ""
  const courseName =
    normalizeOptionalString(props.courseName)
    || normalizeOptionalString(props.productName)
    || booking.name
    || "Booking"
  const currency =
    normalizeOptionalString(props.courseCurrency)
    || normalizeOptionalString(props.currency)
    || "EUR"
  const coursePriceInCents = normalizeNumber(props.coursePriceInCents) || 0
  const totalAmountCents =
    normalizeNumber(props.totalAmountCents)
    || normalizeNumber(props.totalAmount)
    || 0
  const totalSeats =
    normalizeNumber(props.totalSeats)
    || normalizeSeatSelections(props.seats).reduce(
      (count, seat) => count + seat.seatNumbers.length,
      0
    )

  const checkoutSessionId = normalizeOptionalString(
    args.inputData.checkoutSessionId || props.checkoutSessionId || props.sourceCheckoutSessionId
  ) as Id<"objects"> | null
  const invoiceId = normalizeOptionalString(
    args.inputData.invoiceId || props.invoiceId
  ) as Id<"objects"> | null
  const invoiceAttachment =
    emailExecutionControl.mode === "capture"
      ? null
      : await buildBookingInvoiceAttachment({
          ctx,
          organizationId: args.organizationId,
          checkoutSessionId,
          invoiceId,
        })

  const emailData: BookingEmailData = {
    customerName,
    customerEmail,
    customerPhone,
    courseName,
    coursePrice: formatCurrencyAmount({
      amountInCents: coursePriceInCents,
      currency,
      language,
    }),
    date: normalizeOptionalString(props.date) || "TBD",
    time: normalizeOptionalString(props.time) || "TBD",
    seats: normalizeSeatSelections(props.seats),
    totalSeats,
    totalAmount: totalAmountCents / 100,
    tshirtSize: normalizeOptionalString(props.tshirtSize) || undefined,
    needsAccommodation: props.needsAccommodation === true,
    message: normalizeOptionalString(props.message) || undefined,
    bookingId: String(booking._id),
    language,
    paymentMethod: normalizeOptionalString(props.paymentMethod) || "invoice",
    ticketCode: normalizeOptionalString(props.primaryTicketCode) || undefined,
    ticketLookupUrl: normalizeOptionalString(props.primaryTicketLookupUrl) || undefined,
    invoiceAttachmentIncluded: Boolean(invoiceAttachment || invoiceId),
    bookingStatusLabel:
      normalizeOptionalString(props.paymentMethod) === "invoice"
        ? "Invoice issued - payment pending on site"
        : "Pending Confirmation",
  }

  const customerRecipients = resolveBookingEmailRecipients({
    baseRecipients: shouldSendCustomer ? normalizeBookingEmailRecipients([customerEmail]) : [],
    overrideRecipients: emailExecutionControl.customerRecipients,
    mode: emailExecutionControl.mode,
  })
  const eligibleOperatorRecipients = resolveBookingEmailRecipients({
    baseRecipients: shouldSendOperator ? operatorRecipients : [],
    overrideRecipients: emailExecutionControl.operatorRecipients,
    mode: emailExecutionControl.mode,
  })

  if (customerRecipients.length === 0 && eligibleOperatorRecipients.length === 0) {
    return {
      success: false,
      error: "No recipients configured for booking confirmation",
    }
  }

  const customerSubject = buildCustomerConfirmationSubject({
    language,
    courseName,
  })
  const operatorSubject = buildOperatorConfirmationSubject({
    customerName,
    courseName,
  })
  const customerHtml = customerRecipients.length > 0
    ? buildBookingConfirmationHtml(emailData)
    : null
  const operatorHtml = eligibleOperatorRecipients.length > 0
    ? buildBookingNotificationHtml(emailData)
    : null
  const domainConfigId = await resolvePrimaryDomainConfigId(ctx, args.organizationId)
  const shouldMarkConfirmation =
    emailExecutionControl.mode !== "capture" || emailExecutionControl.markAsSent
  const now = Date.now()
  const capturedPreviews: CapturedBookingConfirmationPreview[] = []
  const deliveries: BookingConfirmationDeliveryRecord[] = []
  const errors: string[] = []

  try {
    if (emailExecutionControl.capturePreviews) {
      capturedPreviews.push({
        bookingId: String(booking._id),
        deliveryMode: emailExecutionControl.mode,
        markedAsSent: shouldMarkConfirmation,
        customer: customerHtml
          ? {
              to: customerRecipients,
              subject: customerSubject,
              html: customerHtml,
              attachments: invoiceAttachment
                ? [
                    {
                      filename: invoiceAttachment.filename,
                      contentType: invoiceAttachment.contentType,
                      base64Length: invoiceAttachment.content.length,
                    },
                  ]
                : [],
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
        const sendResult = await sendHandBuiltEmail({
          ctx,
          domainConfigId,
          to: recipient,
          subject: customerSubject,
          html: customerHtml || buildBookingConfirmationHtml(emailData),
          attachments: invoiceAttachment ? [invoiceAttachment] : undefined,
        })
        deliveries.push({
          bookingId: String(booking._id),
          recipientKind: "customer",
          to: recipient,
          subject: customerSubject,
          success: sendResult.success === true,
          messageId: normalizeOptionalString(sendResult.messageId),
          error: sendResult.success === true
            ? null
            : normalizeOptionalString(sendResult.error) || "email_delivery_failed",
        })
        if (sendResult.success !== true) {
          throw new Error(sendResult.error || `Customer confirmation delivery failed for ${recipient}`)
        }
      }

      for (const recipient of eligibleOperatorRecipients) {
        const sendResult = await sendHandBuiltEmail({
          ctx,
          domainConfigId,
          to: recipient,
          subject: operatorSubject,
          html: operatorHtml || buildBookingNotificationHtml(emailData),
          replyTo: customerEmail || undefined,
        })
        deliveries.push({
          bookingId: String(booking._id),
          recipientKind: "operator",
          to: recipient,
          subject: operatorSubject,
          success: sendResult.success === true,
          messageId: normalizeOptionalString(sendResult.messageId),
          error: sendResult.success === true
            ? null
            : normalizeOptionalString(sendResult.error) || "email_delivery_failed",
        })
        if (sendResult.success !== true) {
          throw new Error(sendResult.error || `Operator notification delivery failed for ${recipient}`)
        }
      }
    }

    if (shouldMarkConfirmation) {
      await ctx.runMutation(
        generatedApi.internal.bookingWorkflowAutomation.markBookingConfirmationSentInternal,
        {
          bookingId: booking._id,
          sentAt: now,
          customerRecipients,
          operatorRecipients: eligibleOperatorRecipients,
        }
      )
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error))
  }

  return {
    success: errors.length === 0,
    data: {
      bookingId: String(booking._id),
      sent: errors.length === 0 && shouldMarkConfirmation ? 1 : 0,
      skippedAlreadySent: false,
      emailDeliveryMode: emailExecutionControl.mode,
      capturedPreviews,
      deliveries,
      errors,
    },
    ...(errors.length > 0 ? { error: errors.join("; ") } : {}),
  }
}

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

    if (action === "send-booking-confirmations") {
      return await executeBookingConfirmationAction(ctx, {
        organizationId: args.organizationId,
        nodeConfig,
        inputData:
          args.inputData && typeof args.inputData === "object"
            ? (args.inputData as Record<string, unknown>)
            : {},
      })
    }

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
    const deliveries: ReminderEmailDeliveryRecord[] = []

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
            const sendResult = await sendHandBuiltEmail({
              ctx,
              domainConfigId,
              to: recipient,
              subject: customerSubject,
              html: customerHtml || buildBookingReminderCustomerHtml(reminderData),
            })
            deliveries.push({
              bookingId: String(booking._id),
              reminderKind,
              recipientKind: "customer",
              to: recipient,
              subject: customerSubject,
              success: sendResult.success === true,
              messageId: normalizeOptionalString(sendResult.messageId),
              error: sendResult.success === true
                ? null
                : normalizeOptionalString(sendResult.error) || "email_delivery_failed",
            })
            if (sendResult.success !== true) {
              throw new Error(sendResult.error || `Customer reminder delivery failed for ${recipient}`)
            }
          }

          for (const recipient of eligibleOperatorRecipients) {
            const sendResult = await sendHandBuiltEmail({
              ctx,
              domainConfigId,
              to: recipient,
              subject: operatorSubject,
              html: operatorHtml || buildBookingReminderOperatorHtml(reminderData),
            })
            deliveries.push({
              bookingId: String(booking._id),
              reminderKind,
              recipientKind: "operator",
              to: recipient,
              subject: operatorSubject,
              success: sendResult.success === true,
              messageId: normalizeOptionalString(sendResult.messageId),
              error: sendResult.success === true
                ? null
                : normalizeOptionalString(sendResult.error) || "email_delivery_failed",
            })
            if (sendResult.success !== true) {
              throw new Error(sendResult.error || `Operator reminder delivery failed for ${recipient}`)
            }
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
        deliveries,
      },
      ...(errors.length > 0 ? { error: errors.join("; ") } : {}),
    }
  },
})
