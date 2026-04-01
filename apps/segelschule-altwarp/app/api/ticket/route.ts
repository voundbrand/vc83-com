export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import type { Id } from "../../../../../convex/_generated/dataModel"
import {
  getConvexClient,
  getOrganizationId,
  queryInternal,
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

async function withLookupDelay<T>(startedAt: number, value: T): Promise<T> {
  const elapsedMs = Date.now() - startedAt
  if (elapsedMs < MIN_LOOKUP_RESPONSE_MS) {
    await new Promise((resolve) =>
      setTimeout(resolve, MIN_LOOKUP_RESPONSE_MS - elapsedMs)
    )
  }
  return value
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

    const organizationId = getOrganizationId()
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
    const allTickets = (await queryInternal(
      convex,
      generatedInternalApi.channels.router.listObjectsByOrgTypeInternal,
      {
        organizationId: organizationId as Id<"organizations">,
        type: "ticket",
      }
    )) as RouterObjectRecord[]

    const matchedTicket = allTickets
      .filter((ticket) => {
        const ticketProps = (ticket.customProperties || {}) as Record<
          string,
          unknown
        >
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

    const ticketProps = (matchedTicket.customProperties || {}) as Record<
      string,
      unknown
    >
    const sourceBookingId = normalizeOptionalString(ticketProps.sourceBookingId)
    let bookingRecord: RouterObjectRecord | null = null

    if (sourceBookingId) {
      try {
        bookingRecord = (await queryInternal(
          convex,
          generatedInternalApi.channels.router.getObjectByIdInternal,
          {
            objectId: sourceBookingId as Id<"objects">,
          }
        )) as RouterObjectRecord | null
      } catch (error) {
        console.warn("[Ticket Lookup] Failed to resolve source booking:", error)
      }
    }

    const bookingProps = (bookingRecord?.customProperties || {}) as Record<
      string,
      unknown
    >
    const bookingSeats =
      (Array.isArray(bookingProps.seats)
        ? bookingProps.seats
        : Array.isArray(ticketProps.bookingSeatSelections)
          ? ticketProps.bookingSeatSelections
          : []) as Array<Record<string, unknown>>

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
            totalAmountCents:
              safeNumber(bookingProps.totalAmountCents)
              || safeNumber(ticketProps.bookingTotalAmountCents),
          },
          notes: {
            packingList:
              normalizeOptionalString(ticketProps.packingList)
              || normalizeOptionalString(bookingProps.packingList),
            weatherInfo:
              normalizeOptionalString(ticketProps.weatherInfo)
              || normalizeOptionalString(bookingProps.weatherInfo),
          },
          payment: {
            method: "invoice",
            status: "pending_on_site",
          },
          checkoutSessionId:
            normalizeOptionalString(ticketProps.checkoutSessionId)
            || normalizeOptionalString(ticketProps.sourceCheckoutSessionId),
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
