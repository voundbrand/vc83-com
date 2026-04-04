import { ConvexHttpClient } from "convex/browser"

import * as generatedApiModule from "../convex/_generated/api.js"
import { loadWorkspaceEnvCascade } from "./lib/load-workspace-env"
import {
  buildReminderTrackingKey,
  isBookingReminderDue,
  type BookingReminderKind,
} from "../src/lib/booking-workflow-utils"
import { localDateTimeToTimestamp } from "../src/lib/timezone-utils"

const generated =
  (generatedApiModule as { default?: Record<string, unknown> }).default
  || (generatedApiModule as Record<string, unknown>)
const { api, internal } = generated as {
  api: Record<string, unknown>
  internal: Record<string, unknown>
}

type RouterObjectRecord = {
  _id: string
  organizationId: string
  type: string
  subtype?: string
  status?: string
  name?: string
  createdAt?: number
  updatedAt?: number
  customProperties?: Record<string, unknown>
}

function getArg(flag: string): string | undefined {
  const index = process.argv.indexOf(flag)
  if (index < 0) {
    return undefined
  }
  return process.argv[index + 1]
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag)
}

function required(value: string | undefined, message: string): string {
  if (!value || value.trim().length === 0) {
    throw new Error(message)
  }
  return value.trim()
}

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null
  }
  const normalized = value.trim()
  return normalized.length > 0 ? normalized : null
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
  return []
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

function summarizeBookingForReminder(
  booking: RouterObjectRecord,
  reminderKind: BookingReminderKind,
  defaultTimezone: string,
  leadDays: number,
  now: number
) {
  const props = booking.customProperties || {}
  const { bookingStartAt, timezone } = resolveBookingStartAt(props, defaultTimezone)
  const trackingKey = buildReminderTrackingKey(reminderKind)
  const reminderState =
    (
      ((props.notifications as Record<string, unknown> | undefined)?.reminders
        || {}) as Record<string, unknown>
    )[trackingKey] as Record<string, unknown> | undefined

  return {
    bookingId: String(booking._id),
    status: booking.status || null,
    subtype: booking.subtype || null,
    source: normalizeOptionalString(props.source),
    customerEmail: normalizeOptionalString(props.customerEmail),
    courseName:
      normalizeOptionalString(props.courseName)
      || normalizeOptionalString(props.productName)
      || booking.name
      || null,
    date: normalizeOptionalString(props.date),
    time: normalizeOptionalString(props.time),
    timezone,
    bookingStartAt,
    dueNow:
      bookingStartAt !== null
      && isBookingReminderDue({
        bookingStartAt,
        now,
        daysBeforeStart: leadDays,
        timezone,
      }),
    alreadySentAt: normalizeNumber(reminderState?.sentAt),
    primaryTicketCode: normalizeOptionalString(props.primaryTicketCode),
    primaryTicketLookupUrl: normalizeOptionalString(props.primaryTicketLookupUrl),
    invoiceId: normalizeOptionalString(props.invoiceId),
    invoiceNumber: normalizeOptionalString(props.invoiceNumber),
    invoicePdfUrl: normalizeOptionalString(props.invoicePdfUrl),
    weatherInfo: normalizeOptionalString(props.weatherInfo),
    packingListItems: normalizeStringArray(props.packingListItems),
  }
}

async function listOrgObjectsByType(
  client: ConvexHttpClient,
  organizationId: string,
  type: string
) {
  return (await client.query(internal.channels.router.listObjectsByOrgTypeInternal, {
    organizationId,
    type,
  })) as RouterObjectRecord[]
}

async function main() {
  const envPath = getArg("--env") || "apps/segelschule-altwarp/.env.local"
  const { resolvedEnvPath, loadedEnvPaths } = loadWorkspaceEnvCascade(envPath)

  const convexUrl = required(
    process.env.NEXT_PUBLIC_CONVEX_URL,
    `NEXT_PUBLIC_CONVEX_URL is required. Checked ${resolvedEnvPath}.`
  )
  const deployKey = required(
    process.env.CONVEX_DEPLOY_KEY,
    `CONVEX_DEPLOY_KEY is required. Checked ${resolvedEnvPath}.`
  )
  const organizationId = required(
    getArg("--organization-id")
    || process.env.ORG_ID
    || process.env.PLATFORM_ORG_ID
    || process.env.NEXT_PUBLIC_PLATFORM_ORG_ID
    || process.env.NEXT_PUBLIC_ORG_ID,
    "Pass --organization-id or set ORG_ID/PLATFORM_ORG_ID/NEXT_PUBLIC_PLATFORM_ORG_ID/NEXT_PUBLIC_ORG_ID."
  )
  const requestedBookingId = normalizeOptionalString(getArg("--booking-id"))
  const includeInvoicePdf = hasFlag("--include-invoice-pdf")
  const now = Date.now()

  const client = new ConvexHttpClient(convexUrl)
  const maybeAdminClient = client as ConvexHttpClient & {
    setAdminAuth?: (token: string) => void
  }
  maybeAdminClient.setAdminAuth?.(deployKey)

  const [
    settings,
    workflows,
    bookings,
    tickets,
    invoices,
    transactions,
    checkoutSessions,
    contacts,
    surfaceBindings,
  ] = await Promise.all([
    listOrgObjectsByType(client, organizationId, "organization_settings"),
    listOrgObjectsByType(client, organizationId, "layer_workflow"),
    listOrgObjectsByType(client, organizationId, "booking"),
    listOrgObjectsByType(client, organizationId, "ticket"),
    listOrgObjectsByType(client, organizationId, "invoice"),
    listOrgObjectsByType(client, organizationId, "transaction"),
    listOrgObjectsByType(client, organizationId, "checkout_session"),
    listOrgObjectsByType(client, organizationId, "organization_contact"),
    client.query(internal.frontendSurfaceBindings.listBookingSurfaceBindingsInternal, {
      organizationId,
      appSlug: "segelschule-altwarp",
      surfaceType: "booking",
    }) as Promise<Array<Record<string, unknown>>>,
  ])

  const bookingSettings =
    settings.find((setting) => setting.subtype === "booking_notifications") || null
  const bookingSettingsProps = (bookingSettings?.customProperties || {}) as Record<string, unknown>
  const defaultTimezone =
    normalizeOptionalString(bookingSettingsProps.timezone) || "Europe/Berlin"
  const leadDays = normalizeNumber(bookingSettingsProps.reminderLeadDays) || 7

  const segelschuleBookings = bookings
    .filter((booking) => {
      const props = booking.customProperties || {}
      if (requestedBookingId) {
        return String(booking._id) === requestedBookingId
      }
      return normalizeOptionalString(props.source) === "segelschule_landing"
    })
    .sort(
      (left, right) =>
        Number(right.updatedAt || right.createdAt || 0)
        - Number(left.updatedAt || left.createdAt || 0)
    )

  const latestBooking = segelschuleBookings[0] || null
  const latestBookingProps = (latestBooking?.customProperties || {}) as Record<string, unknown>
  const latestBookingTicketIds = Array.isArray(latestBookingProps.ticketIds)
    ? latestBookingProps.ticketIds.map(String)
    : []
  const linkedTickets = tickets
    .filter((ticket) => {
      const props = ticket.customProperties || {}
      return (
        latestBookingTicketIds.includes(String(ticket._id))
        || String(props.sourceBookingId || "") === String(latestBooking?._id || "")
      )
    })
    .sort(
      (left, right) =>
        Number(right.updatedAt || right.createdAt || 0)
        - Number(left.updatedAt || left.createdAt || 0)
    )
  const linkedCheckoutSessionId =
    normalizeOptionalString(latestBookingProps.sourceCheckoutSessionId)
    || normalizeOptionalString(latestBookingProps.checkoutSessionId)
    || normalizeOptionalString(latestBookingProps.checkoutSessionObjectId)
  const linkedCheckoutSession = checkoutSessions.find(
    (session) => String(session._id) === String(linkedCheckoutSessionId || "")
  ) || null
  const linkedInvoiceId =
    normalizeOptionalString(latestBookingProps.invoiceId)
    || normalizeOptionalString(linkedTickets[0]?.customProperties?.invoiceId)
  const linkedInvoice = invoices.find(
    (invoice) =>
      String(invoice._id) === String(linkedInvoiceId || "")
      || String(invoice.customProperties?.checkoutSessionId || "")
        === String(linkedCheckoutSession?._id || "")
  ) || null
  const linkedTransactions = transactions
    .filter((transaction) => {
      const props = transaction.customProperties || {}
      return (
        String(props.checkoutSessionId || "") === String(linkedCheckoutSession?._id || "")
        || linkedTickets.some(
          (ticket) =>
            String(ticket.customProperties?.transactionId || "")
            === String(transaction._id)
        )
      )
    })
    .sort(
      (left, right) =>
        Number(right.updatedAt || right.createdAt || 0)
        - Number(left.updatedAt || left.createdAt || 0)
    )

  let invoicePdfSummary: Record<string, unknown> | null = null
  if (includeInvoicePdf && linkedCheckoutSession?._id) {
    const pdf = (await client.action(api.pdfGeneration.generateInvoicePDF, {
      checkoutSessionId: linkedCheckoutSession._id as any,
    })) as
      | {
          filename: string
          content: string
          contentType: string
        }
      | null

    invoicePdfSummary = pdf
      ? {
          filename: pdf.filename,
          contentType: pdf.contentType,
          base64Length: pdf.content.length,
          magicBytes: Buffer.from(pdf.content, "base64").subarray(0, 5).toString(),
        }
      : null
  }

  const reminderWorkflowSummaries = workflows
    .filter(
      (workflow) =>
        workflow.status === "active"
        && workflow.customProperties?.segelschuleWorkflowKey
    )
    .map((workflow) => {
      const workflowProps = (workflow.customProperties || {}) as Record<string, unknown>
      const nodes = Array.isArray(workflowProps.nodes)
        ? (workflowProps.nodes as Array<Record<string, unknown>>)
        : []
      const triggerNode =
        nodes.find(
          (node) =>
            node.type === "trigger_schedule"
            || node.type === "trigger_booking_created"
        ) || null
      const reminderNode =
        nodes.find((node) => node.type === "lc_booking_notifications") || null

      return {
        id: String(workflow._id),
        name: workflow.name || null,
        workflowKey: normalizeOptionalString(workflowProps.segelschuleWorkflowKey),
        status: workflow.status || null,
        triggerNode,
        reminderNode,
        metadata:
          workflowProps.metadata && typeof workflowProps.metadata === "object"
            ? workflowProps.metadata
            : null,
      }
    })

  const weatherCandidates = segelschuleBookings.map((booking) =>
    summarizeBookingForReminder(booking, "weather", defaultTimezone, leadDays, now)
  )
  const packingCandidates = segelschuleBookings.map((booking) =>
    summarizeBookingForReminder(booking, "packing_list", defaultTimezone, leadDays, now)
  )

  console.log(
    JSON.stringify(
      {
        envPath: resolvedEnvPath,
        loadedEnvPaths,
        inspectedAt: now,
        organizationId,
        surfaceBindings,
        bookingNotificationSettings: bookingSettings
          ? {
              id: String(bookingSettings._id),
              status: bookingSettings.status || null,
              subtype: bookingSettings.subtype || null,
              customProperties: bookingSettingsProps,
            }
          : null,
        reminderWorkflows: reminderWorkflowSummaries,
        organizationContacts: contacts.map((contact) => ({
          id: String(contact._id),
          name: contact.name || null,
          status: contact.status || null,
          contactEmail: normalizeOptionalString(contact.customProperties?.contactEmail),
          primaryEmail: normalizeOptionalString(contact.customProperties?.primaryEmail),
        })),
        bookingCounts: {
          all: bookings.length,
          segelschuleSource: segelschuleBookings.length,
          tickets: tickets.filter((ticket) =>
            normalizeOptionalString(ticket.customProperties?.sourceBookingId)
          ).length,
          invoices: invoices.length,
          transactions: transactions.length,
          checkoutSessions: checkoutSessions.length,
        },
        latestSegelschuleBooking: latestBooking
          ? {
              id: String(latestBooking._id),
              status: latestBooking.status || null,
              subtype: latestBooking.subtype || null,
              customProperties: latestBooking.customProperties || {},
            }
          : null,
        linkedTickets: linkedTickets.map((ticket) => ({
          id: String(ticket._id),
          status: ticket.status || null,
          productId: normalizeOptionalString(ticket.customProperties?.productId),
          ticketCode: normalizeOptionalString(ticket.customProperties?.ticketCode),
          holderEmail: normalizeOptionalString(ticket.customProperties?.holderEmail),
          ticketLookupUrl: normalizeOptionalString(ticket.customProperties?.ticketLookupUrl),
          sourceBookingId: normalizeOptionalString(ticket.customProperties?.sourceBookingId),
          sourceCheckoutSessionId: normalizeOptionalString(
            ticket.customProperties?.sourceCheckoutSessionId
          ),
          invoiceId: normalizeOptionalString(ticket.customProperties?.invoiceId),
          invoiceNumber: normalizeOptionalString(ticket.customProperties?.invoiceNumber),
        })),
        linkedCheckoutSession: linkedCheckoutSession
          ? {
              id: String(linkedCheckoutSession._id),
              status: linkedCheckoutSession.status || null,
              customerEmail: normalizeOptionalString(
                linkedCheckoutSession.customProperties?.customerEmail
              ),
              paymentMethod: normalizeOptionalString(
                linkedCheckoutSession.customProperties?.paymentMethod
              ),
              pdfTemplateCode: normalizeOptionalString(
                linkedCheckoutSession.customProperties?.pdfTemplateCode
              ),
              emailTemplateCode: normalizeOptionalString(
                linkedCheckoutSession.customProperties?.emailTemplateCode
              ),
              selectedProducts: Array.isArray(
                linkedCheckoutSession.customProperties?.selectedProducts
              )
                ? linkedCheckoutSession.customProperties?.selectedProducts
                : [],
              sourceBookingId: normalizeOptionalString(
                linkedCheckoutSession.customProperties?.sourceBookingId
              ),
            }
          : null,
        linkedTransactions: linkedTransactions.map((transaction) => ({
          id: String(transaction._id),
          status: transaction.status || null,
          subtype: transaction.subtype || null,
          checkoutSessionId: normalizeOptionalString(
            transaction.customProperties?.checkoutSessionId
          ),
          lineItems: Array.isArray(transaction.customProperties?.lineItems)
            ? (transaction.customProperties?.lineItems as Array<Record<string, unknown>>).map(
                (lineItem) => ({
                  productId: normalizeOptionalString(lineItem.productId),
                  productName: normalizeOptionalString(lineItem.productName),
                  productSubtype: normalizeOptionalString(lineItem.productSubtype),
                  quantity: normalizeNumber(lineItem.quantity),
                  ticketId: normalizeOptionalString(lineItem.ticketId),
                })
              )
            : [],
        })),
        linkedInvoice: linkedInvoice
          ? {
              id: String(linkedInvoice._id),
              status: linkedInvoice.status || null,
              subtype: linkedInvoice.subtype || null,
              invoiceNumber: normalizeOptionalString(
                linkedInvoice.customProperties?.invoiceNumber
              ),
              pdfUrl: normalizeOptionalString(linkedInvoice.customProperties?.pdfUrl),
              checkoutSessionId: normalizeOptionalString(
                linkedInvoice.customProperties?.checkoutSessionId
              ),
            }
          : null,
        invoicePdf: invoicePdfSummary,
        reminderCandidates: {
          weather: weatherCandidates,
          packingList: packingCandidates,
        },
        notes: {
          reminderTriggeringSkipped:
            "This script is read-only. It does not execute reminder workflows or send emails.",
        },
      },
      null,
      2
    )
  )
}

void main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
