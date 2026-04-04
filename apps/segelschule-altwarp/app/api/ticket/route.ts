export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import type { Id } from "../../../../../convex/_generated/dataModel"
import {
  getConvexClient,
  queryInternal,
  resolveSegelschuleOrganizationId,
} from "@/lib/server-convex"
import { checkRateLimit, resolveClientIp } from "@/lib/email"

// Dynamic require avoids excessively deep Convex API type instantiation.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generatedInternalApi: any =
  require("../../../../../convex/_generated/api").internal

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const TICKET_CODE_RE = /^SA-[A-Z0-9]{7}$/
const MIN_LOOKUP_RESPONSE_MS = 250

interface RouterObjectRecord {
  _id: Id<"objects">
  organizationId?: Id<"organizations"> | string
  status?: string
  subtype?: string
  createdAt?: number
  updatedAt?: number
  customProperties?: Record<string, unknown>
}

interface TicketLookupInput {
  code: string
  email: string
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
  const lower = normalized.toLowerCase()
  return EMAIL_RE.test(lower) ? lower : null
}

function normalizeTicketCode(value: unknown): string | null {
  const normalized = normalizeOptionalString(value)
  if (!normalized) {
    return null
  }
  const upper = normalized.toUpperCase()
  return TICKET_CODE_RE.test(upper) ? upper : null
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((entry) => normalizeOptionalString(entry))
    .filter((entry): entry is string => Boolean(entry))
}

function toLookupInput(payload: {
  code: unknown
  email: unknown
}): TicketLookupInput | null {
  const code = normalizeTicketCode(payload.code)
  const email = normalizeEmail(payload.email)
  if (!code || !email) {
    return null
  }
  return { code, email }
}

function safeNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {}
  }
  return value as Record<string, unknown>
}

async function withLookupDelay<T>(startedAt: number, value: T): Promise<T> {
  const elapsedMs = Date.now() - startedAt
  if (elapsedMs < MIN_LOOKUP_RESPONSE_MS) {
    await new Promise((resolve) =>
      setTimeout(resolve, MIN_LOOKUP_RESPONSE_MS - elapsedMs)
    )
  }
  return value
}

async function getObjectById(args: {
  convex: ReturnType<typeof getConvexClient>
  objectId: string | null
}): Promise<RouterObjectRecord | null> {
  if (!args.objectId) {
    return null
  }

  try {
    return (await queryInternal(
      args.convex,
      generatedInternalApi.channels.router.getObjectByIdInternal,
      {
        objectId: args.objectId as Id<"objects">,
      }
    )) as RouterObjectRecord | null
  } catch (error) {
    console.warn("[Ticket Lookup] Failed to load object:", args.objectId, error)
    return null
  }
}

async function listObjectsByType(args: {
  convex: ReturnType<typeof getConvexClient>
  organizationId: string
  type: string
}): Promise<RouterObjectRecord[]> {
  return (await queryInternal(
    args.convex,
    generatedInternalApi.channels.router.listObjectsByOrgTypeInternal,
    {
      organizationId: args.organizationId as Id<"organizations">,
      type: args.type,
    }
  )) as RouterObjectRecord[]
}

async function handleLookup(
  request: Request,
  payload?: Record<string, unknown>
) {
  const startedAt = Date.now()

  try {
    const clientIp = resolveClientIp(request)
    if (!checkRateLimit(`ticket-lookup-ip:${clientIp}`, 15, 3_600_000)) {
      return withLookupDelay(
        startedAt,
        NextResponse.json({ error: "rate_limited" }, { status: 429 })
      )
    }

    const requestUrl = new URL(request.url)
    const lookup = toLookupInput({
      code: payload?.code ?? requestUrl.searchParams.get("code"),
      email: payload?.email ?? requestUrl.searchParams.get("email"),
    })

    if (!lookup) {
      return withLookupDelay(
        startedAt,
        NextResponse.json(
          { error: "ticket_lookup_invalid" },
          { status: 400 }
        )
      )
    }

    const organizationId = await resolveSegelschuleOrganizationId({
      requestHost: request.headers.get("host"),
    })
    if (!organizationId) {
      return withLookupDelay(
        startedAt,
        NextResponse.json(
          { error: "Platform organization is not configured" },
          { status: 503 }
        )
      )
    }

    const convex = getConvexClient()
    const allTickets = await listObjectsByType({
      convex,
      organizationId,
      type: "ticket",
    })

    const matchedTicket = allTickets
      .filter((ticket) => {
        const ticketProps = asRecord(ticket.customProperties)
        const ticketCode = normalizeTicketCode(ticketProps.ticketCode)
        const holderEmail = normalizeEmail(ticketProps.holderEmail)
        return (
          ticket.status !== "cancelled"
          && ticketCode === lookup.code
          && holderEmail === lookup.email
        )
      })
      .sort(
        (left, right) =>
          Number(right.updatedAt || right.createdAt || 0)
          - Number(left.updatedAt || left.createdAt || 0)
      )[0]

    if (!matchedTicket) {
      return withLookupDelay(
        startedAt,
        NextResponse.json({ error: "ticket_not_found" }, { status: 404 })
      )
    }

    const ticketProps = asRecord(matchedTicket.customProperties)
    const sourceBookingId = normalizeOptionalString(ticketProps.sourceBookingId)
    const bookingRecord = await getObjectById({
      convex,
      objectId: sourceBookingId,
    })
    const bookingProps = asRecord(bookingRecord?.customProperties)

    const checkoutSessionId =
      normalizeOptionalString(ticketProps.checkoutSessionId)
      || normalizeOptionalString(ticketProps.sourceCheckoutSessionId)
      || normalizeOptionalString(bookingProps.checkoutSessionId)
      || normalizeOptionalString(bookingProps.sourceCheckoutSessionId)
      || normalizeOptionalString(bookingProps.checkoutSessionObjectId)

    const transactionIds = [
      ...normalizeStringArray(bookingProps.transactionIds),
      ...normalizeStringArray(ticketProps.transactionIds),
      normalizeOptionalString(bookingProps.primaryTransactionId),
      normalizeOptionalString(ticketProps.transactionId),
    ].filter((entry): entry is string => Boolean(entry))

    const invoiceId =
      normalizeOptionalString(bookingProps.invoiceId)
      || normalizeOptionalString(ticketProps.invoiceId)

    const checkoutSessionRecord = await getObjectById({
      convex,
      objectId: checkoutSessionId,
    })
    const directTransactionRecord = await getObjectById({
      convex,
      objectId: transactionIds[0] || null,
    })
    const directInvoiceRecord = await getObjectById({
      convex,
      objectId: invoiceId,
    })

    let transactionRecord = directTransactionRecord
    let invoiceRecord = directInvoiceRecord

    if (!transactionRecord || (!invoiceRecord && checkoutSessionId)) {
      const [allTransactions, allInvoices] = await Promise.all([
        !transactionRecord
          ? listObjectsByType({
              convex,
              organizationId,
              type: "transaction",
            })
          : Promise.resolve([]),
        !invoiceRecord
          ? listObjectsByType({
              convex,
              organizationId,
              type: "invoice",
            })
          : Promise.resolve([]),
      ])

      if (!transactionRecord) {
        transactionRecord =
          allTransactions
            .filter((transaction) => {
              const transactionProps = asRecord(transaction.customProperties)
              return (
                String(transaction._id) === String(transactionIds[0] || "")
                || String(transactionProps.checkoutSessionId || "")
                  === String(checkoutSessionId || "")
              )
            })
            .sort(
              (left, right) =>
                Number(right.updatedAt || right.createdAt || 0)
                - Number(left.updatedAt || left.createdAt || 0)
            )[0] || null
      }

      if (!invoiceRecord) {
        invoiceRecord =
          allInvoices.find((invoice) => {
            const invoiceProps = asRecord(invoice.customProperties)
            return (
              String(invoice._id) === String(invoiceId || "")
              || String(invoiceProps.checkoutSessionId || "")
                === String(checkoutSessionId || "")
            )
          }) || null
      }
    }

    const checkoutSessionProps = asRecord(checkoutSessionRecord?.customProperties)
    const transactionProps = asRecord(transactionRecord?.customProperties)
    const invoiceProps = asRecord(invoiceRecord?.customProperties)

    const bookingSeats =
      (Array.isArray(bookingProps.seats)
        ? bookingProps.seats
        : Array.isArray(ticketProps.bookingSeatSelections)
          ? ticketProps.bookingSeatSelections
          : []) as Array<Record<string, unknown>>

    const lineItems = Array.isArray(transactionProps.lineItems)
      ? (transactionProps.lineItems as Array<Record<string, unknown>>).map(
          (lineItem) => ({
            productId: normalizeOptionalString(lineItem.productId),
            productName: normalizeOptionalString(lineItem.productName),
            productSubtype: normalizeOptionalString(lineItem.productSubtype),
            quantity: safeNumber(lineItem.quantity),
            unitPriceInCents:
              safeNumber(lineItem.unitPriceInCents)
              || safeNumber(lineItem.pricePerUnitInCents),
            totalPriceInCents: safeNumber(lineItem.totalPriceInCents),
            ticketId: normalizeOptionalString(lineItem.ticketId),
          })
        )
      : []

    const totalAmountCents =
      safeNumber(bookingProps.totalAmountCents)
      || safeNumber(ticketProps.bookingTotalAmountCents)
      || safeNumber(invoiceProps.totalInCents)
      || safeNumber(transactionProps.totalInCents)
      || safeNumber(checkoutSessionProps.totalAmount)

    const currency =
      normalizeOptionalString(transactionProps.currency)
      || normalizeOptionalString(bookingProps.courseCurrency)
      || normalizeOptionalString(ticketProps.bookingCourseCurrency)
      || normalizeOptionalString(checkoutSessionProps.currency)

    return withLookupDelay(
      startedAt,
      NextResponse.json(
        {
          ok: true,
          ticket: {
            ticketId: String(matchedTicket._id),
            ticketCode: normalizeTicketCode(ticketProps.ticketCode),
            status: matchedTicket.status || "issued",
            holderName: normalizeOptionalString(ticketProps.holderName),
            holderEmail: normalizeEmail(ticketProps.holderEmail),
            lookupUrl: normalizeOptionalString(ticketProps.ticketLookupUrl),
          },
          booking: {
            bookingId: sourceBookingId || null,
            platformBookingId:
              normalizeOptionalString(bookingProps.platformBookingId)
              || normalizeOptionalString(ticketProps.sourcePlatformBookingId),
            courseId:
              normalizeOptionalString(bookingProps.courseId)
              || normalizeOptionalString(ticketProps.bookingCourseId),
            courseName:
              normalizeOptionalString(bookingProps.courseName)
              || normalizeOptionalString(ticketProps.bookingCourseName),
            courseDescription:
              normalizeOptionalString(bookingProps.courseDescription)
              || normalizeOptionalString(ticketProps.bookingCourseDescription),
            durationLabel:
              normalizeOptionalString(bookingProps.courseDurationLabel)
              || normalizeOptionalString(ticketProps.bookingCourseDurationLabel),
            durationMinutes:
              safeNumber(bookingProps.courseDurationMinutes)
              || safeNumber(ticketProps.bookingCourseDurationMinutes),
            fulfillmentType:
              normalizeOptionalString(bookingProps.fulfillmentType)
              || normalizeOptionalString(ticketProps.bookingFulfillmentType),
            checkoutProductId:
              normalizeOptionalString(bookingProps.checkoutProductId)
              || normalizeOptionalString(ticketProps.bookingCheckoutProductId),
            bookingResourceId:
              normalizeOptionalString(bookingProps.bookingResourceId)
              || normalizeOptionalString(ticketProps.bookingResourceId),
            date:
              normalizeOptionalString(bookingProps.date)
              || normalizeOptionalString(ticketProps.bookingDate),
            time:
              normalizeOptionalString(bookingProps.time)
              || normalizeOptionalString(ticketProps.bookingTime),
            totalSeats:
              safeNumber(bookingProps.totalSeats)
              || safeNumber(ticketProps.bookingTotalSeats),
            seats: bookingSeats,
          },
          commercial: {
            checkoutSessionId: checkoutSessionId || null,
            checkoutSessionStatus: checkoutSessionRecord?.status || null,
            paymentMethod:
              normalizeOptionalString(checkoutSessionProps.paymentMethod)
              || "invoice",
            totalAmountCents,
            currency,
            transactionId: transactionRecord ? String(transactionRecord._id) : null,
            transactionStatus: transactionRecord?.status || null,
            transactionSubtype: transactionRecord?.subtype || null,
            lineItems,
            invoiceId: invoiceRecord ? String(invoiceRecord._id) : null,
            invoiceNumber: normalizeOptionalString(invoiceProps.invoiceNumber),
            invoiceStatus: invoiceRecord?.status || null,
            invoicePdfUrl: normalizeOptionalString(invoiceProps.pdfUrl),
          },
          notes: {
            packingList:
              normalizeOptionalString(ticketProps.packingList)
              || normalizeOptionalString(bookingProps.packingList),
            weatherInfo:
              normalizeOptionalString(ticketProps.weatherInfo)
              || normalizeOptionalString(bookingProps.weatherInfo),
          },
        },
        { status: 200, headers: { "Cache-Control": "no-store" } }
      )
    )
  } catch (error) {
    console.error("[Ticket Lookup] Failed:", error)
    return withLookupDelay(
      startedAt,
      NextResponse.json(
        {
          error:
            error instanceof Error ? error.message : "ticket_lookup_failed",
        },
        { status: 500 }
      )
    )
  }
}

export async function GET(request: Request) {
  return handleLookup(request)
}

export async function POST(request: Request) {
  const body = (await request.json()) as Record<string, unknown>
  return handleLookup(request, body)
}
