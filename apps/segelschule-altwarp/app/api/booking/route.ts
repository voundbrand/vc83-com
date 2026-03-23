export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import type { Id } from "../../../../../convex/_generated/dataModel"
import {
  getConvexClient,
  getOrganizationId,
  mutateInternal,
  actionInternal,
} from "@/lib/server-convex"
import {
  checkRateLimit,
  resolveClientIp,
  createResendClient,
  escapeHtml,
  buildBookingConfirmationHtml,
  buildBookingNotificationHtml,
  type BookingEmailData,
} from "@/lib/email"

// Dynamic require avoids excessively deep Convex API type instantiation.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generatedInternalApi: any =
  require("../../../../../convex/_generated/api").internal

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface BookingPayload {
  course: { id: string; title: string; price: string; isMultiDay: boolean }
  date: string
  time: string
  seats: { boatName: string; seatNumbers: number[] }[]
  totalSeats: number
  formData: {
    name: string
    email: string
    phone: string
    message?: string
    tshirtSize?: string
    needsAccommodation?: boolean
  }
  paymentMethod: string
  totalAmount: number
  language: string
}

function validateBookingPayload(
  body: Record<string, unknown>
): { valid: true; data: BookingPayload } | { valid: false; error: string } {
  const course = body.course as BookingPayload["course"] | undefined
  const date = typeof body.date === "string" ? body.date.trim() : ""
  const time = typeof body.time === "string" ? body.time.trim() : ""
  const seats = body.seats as BookingPayload["seats"] | undefined
  const totalSeats = typeof body.totalSeats === "number" ? body.totalSeats : 0
  const formData = body.formData as BookingPayload["formData"] | undefined
  const paymentMethod =
    typeof body.paymentMethod === "string" ? body.paymentMethod.trim() : ""
  const totalAmount =
    typeof body.totalAmount === "number" ? body.totalAmount : 0
  const language =
    typeof body.language === "string" ? body.language.trim() : "de"

  if (!course?.id || !course?.title || !course?.price) {
    return { valid: false, error: "Course selection is required." }
  }
  if (!date) {
    return { valid: false, error: "Date is required." }
  }
  if (!time) {
    return { valid: false, error: "Time is required." }
  }
  if (!seats || !Array.isArray(seats) || seats.length === 0) {
    return { valid: false, error: "At least one seat must be selected." }
  }
  if (totalSeats < 1) {
    return { valid: false, error: "At least one participant is required." }
  }
  if (!formData?.name?.trim()) {
    return { valid: false, error: "Name is required." }
  }
  if (!formData?.email?.trim() || !EMAIL_RE.test(formData.email)) {
    return { valid: false, error: "A valid email is required." }
  }
  if (!formData?.phone?.trim()) {
    return { valid: false, error: "Phone number is required." }
  }
  if (!paymentMethod) {
    return { valid: false, error: "Payment method is required." }
  }
  if (totalAmount <= 0) {
    return { valid: false, error: "Invalid total amount." }
  }

  return {
    valid: true,
    data: {
      course,
      date,
      time,
      seats,
      totalSeats,
      formData: {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        message: formData.message?.trim() || undefined,
        tshirtSize: formData.tshirtSize?.trim() || undefined,
        needsAccommodation: formData.needsAccommodation || false,
      },
      paymentMethod,
      totalAmount,
      language,
    },
  }
}

// ---------------------------------------------------------------------------
// Resend credential resolution (org settings first, env fallback)
// ---------------------------------------------------------------------------

async function resolveResendApiKey(
  convex: ReturnType<typeof getConvexClient>,
  organizationId: string
): Promise<string> {
  try {
    const creds = await actionInternal(
      convex,
      generatedInternalApi.integrations.resend.resolveCredentials,
      { organizationId: organizationId as Id<"organizations"> }
    )
    if (creds?.apiKey) return creds.apiKey
  } catch (err) {
    console.warn(
      "[Booking] Resend resolver failed, falling back to env:",
      err
    )
  }

  const envKey = process.env.RESEND_API_KEY
  if (!envKey) throw new Error("RESEND_API_KEY is not configured")
  return envKey
}

// ---------------------------------------------------------------------------
// POST /api/booking
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  try {
    const clientIp = resolveClientIp(request)

    // Rate limit: 3 bookings per IP per hour
    if (!checkRateLimit(`booking-ip:${clientIp}`, 3, 3_600_000)) {
      return NextResponse.json(
        { error: "rate_limited" },
        { status: 429 }
      )
    }

    const body = (await request.json()) as Record<string, unknown>
    const validation = validateBookingPayload(body)

    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      )
    }

    const { data } = validation

    // Resolve org
    const organizationId = getOrganizationId()
    if (!organizationId) {
      return NextResponse.json(
        { error: "Platform organization is not configured" },
        { status: 503 }
      )
    }

    const convex = getConvexClient()
    const now = Date.now()

    // Split name for CRM (first word → firstName, rest → lastName)
    const nameParts = data.formData.name.split(/\s+/)
    const firstName = nameParts[0] || data.formData.name
    const lastName = nameParts.slice(1).join(" ") || ""

    // -----------------------------------------------------------------
    // Create booking object
    // -----------------------------------------------------------------
    const bookingId = await mutateInternal(
      convex,
      generatedInternalApi.channels.router.insertObjectInternal,
      {
        organizationId: organizationId as Id<"organizations">,
        type: "booking",
        subtype: "class_enrollment",
        name: `${data.course.title} - ${data.formData.name} - ${data.date}`,
        status: "pending_confirmation",
        customProperties: {
          source: "segelschule_landing",
          courseId: data.course.id,
          courseName: data.course.title,
          coursePrice: data.course.price,
          isMultiDay: data.course.isMultiDay,
          date: data.date,
          time: data.time,
          seats: data.seats,
          totalSeats: data.totalSeats,
          customerName: data.formData.name,
          customerEmail: data.formData.email,
          customerPhone: data.formData.phone,
          firstName,
          lastName,
          message: data.formData.message,
          tshirtSize: data.formData.tshirtSize,
          needsAccommodation: data.formData.needsAccommodation,
          paymentMethod: data.paymentMethod,
          totalAmountCents: Math.round(data.totalAmount * 100),
          language: data.language,
          createdAt: now,
          updatedAt: now,
        },
        createdAt: now,
        updatedAt: now,
      }
    )

    // -----------------------------------------------------------------
    // Create CRM contact
    // -----------------------------------------------------------------
    const contactId = await mutateInternal(
      convex,
      generatedInternalApi.channels.router.insertObjectInternal,
      {
        organizationId: organizationId as Id<"organizations">,
        type: "crm_contact",
        subtype: "customer",
        name: data.formData.name,
        status: "active",
        customProperties: {
          firstName,
          lastName,
          email: data.formData.email,
          phone: data.formData.phone,
          source: "segelschule_landing",
          sourceRef: `booking:${data.course.id}`,
          tags: ["segelschule_landing", "booking", data.course.id],
          notes: `Booked ${data.course.title} on ${data.date} at ${data.time}. ${data.totalSeats} seat(s).`,
        },
        createdAt: now,
        updatedAt: now,
      }
    )

    // -----------------------------------------------------------------
    // Emails (non-fatal, parallel)
    // -----------------------------------------------------------------
    const emailPromises: Promise<unknown>[] = []

    let resendApiKey: string | null = null
    try {
      resendApiKey = await resolveResendApiKey(convex, organizationId)
    } catch (err) {
      console.error("[Booking] Resend key resolution failed:", err)
    }

    const fromEmail =
      process.env.BOOKING_FROM_EMAIL?.trim() ||
      "Segelschule Altwarp <noreply@segelschule-altwarp.de>"

    const emailData: BookingEmailData = {
      customerName: data.formData.name,
      customerEmail: data.formData.email,
      customerPhone: data.formData.phone,
      courseName: data.course.title,
      coursePrice: data.course.price,
      date: data.date,
      time: data.time,
      seats: data.seats,
      totalSeats: data.totalSeats,
      totalAmount: data.totalAmount,
      tshirtSize: data.formData.tshirtSize,
      needsAccommodation: data.formData.needsAccommodation,
      message: data.formData.message,
      bookingId: String(bookingId),
      language: data.language,
    }

    // Booking confirmation to customer
    if (resendApiKey) {
      emailPromises.push(
        (async () => {
          const resend = createResendClient(resendApiKey!)
          await resend.emails.send({
            from: fromEmail,
            to: data.formData.email,
            subject:
              data.language === "de"
                ? `Buchungsbest\u00e4tigung - ${data.course.title}`
                : data.language === "nl"
                  ? `Boekingsbevestiging - ${data.course.title}`
                  : `Booking Confirmation - ${data.course.title}`,
            html: buildBookingConfirmationHtml(emailData),
            headers: {
              "X-Entity-Ref-ID": `booking-confirm-${Date.now()}`,
            },
          })
        })().catch((err) =>
          console.error("[Booking] Confirmation email failed:", err)
        )
      )
    }

    // Booking notification to team
    const notificationEmail =
      process.env.BOOKING_NOTIFICATION_EMAIL?.trim()
    if (resendApiKey && notificationEmail) {
      emailPromises.push(
        (async () => {
          const resend = createResendClient(resendApiKey!)
          await resend.emails.send({
            from: fromEmail,
            to: notificationEmail,
            replyTo: data.formData.email,
            subject: `New Booking: ${escapeHtml(data.formData.name)} - ${data.course.title}`,
            html: buildBookingNotificationHtml(emailData),
            headers: {
              "X-Entity-Ref-ID": `booking-notify-${Date.now()}`,
            },
          })
        })().catch((err) =>
          console.error("[Booking] Notification email failed:", err)
        )
      )
    }

    await Promise.all(emailPromises)

    return NextResponse.json(
      { ok: true, bookingId, contactId },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    )
  } catch (error) {
    console.error("[Booking] Failed:", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Booking failed",
      },
      { status: 500 }
    )
  }
}
