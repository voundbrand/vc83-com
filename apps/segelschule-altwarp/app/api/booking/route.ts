export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import type { Id } from "../../../../../convex/_generated/dataModel"
import {
  getConvexClient,
  getOrganizationId,
  queryInternal,
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
import {
  normalizeSeatSelections,
  parseBookingStartTimestamp,
  resolveSegelschuleRuntimeConfig,
} from "@/lib/booking-platform-bridge"
import {
  buildCheckoutMetadata,
  buildSeatInventoryFromBoats,
  mapToResourceSeatSelections,
} from "@/lib/booking-runtime-contracts"

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
  seats: { boatId?: string; boatName: string; seatNumbers: number[] }[]
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

interface BridgeCheckoutSessionResult {
  sessionId: string
  clientSecret: string | null
  amount: number
  currency: string
  expiresAt: number
  checkoutUrl: string | null
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
    const runtimeResolution = await resolveSegelschuleRuntimeConfig({
      convex,
      queryInternalFn: queryInternal,
      generatedInternalApi,
      organizationId,
    })
    const bookingRuntimeConfig = runtimeResolution.runtimeConfig
    const selectedCourseRuntime = bookingRuntimeConfig.courses[data.course.id]
    if (!selectedCourseRuntime) {
      return NextResponse.json(
        { error: "Unknown course for selected booking surface" },
        { status: 404 }
      )
    }

    const normalizedSeatSelection = normalizeSeatSelections({
      selections: data.seats,
      boats: bookingRuntimeConfig.boats,
    })
    if (normalizedSeatSelection.errors.length > 0) {
      return NextResponse.json(
        { error: normalizedSeatSelection.errors[0] },
        { status: 400 }
      )
    }
    if (normalizedSeatSelection.totalSeats < 1) {
      return NextResponse.json(
        { error: "At least one seat must be selected." },
        { status: 400 }
      )
    }
    if (normalizedSeatSelection.totalSeats !== data.totalSeats) {
      return NextResponse.json(
        { error: "Selected seats do not match participant count." },
        { status: 400 }
      )
    }

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
          seats: normalizedSeatSelection.selections,
          totalSeats: normalizedSeatSelection.totalSeats,
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
          notes: `Booked ${data.course.title} on ${data.date} at ${data.time}. ${normalizedSeatSelection.totalSeats} seat(s).`,
        },
        createdAt: now,
        updatedAt: now,
      }
    )

    // -----------------------------------------------------------------
    // Mother repo bridge: frontend account + optional booking/checkout
    // -----------------------------------------------------------------
    const bridgeWarnings: string[] = [...runtimeResolution.warnings]
    let frontendUserId: Id<"objects"> | null = null
    let platformBookingId: Id<"objects"> | null = null
    let checkoutSession: BridgeCheckoutSessionResult | null = null
    let resourceBookingBridgeError: string | null = null

    try {
      frontendUserId = await mutateInternal(
        convex,
        generatedInternalApi.auth.createOrGetGuestUser,
        {
          email: data.formData.email.toLowerCase(),
          firstName,
          lastName: lastName || undefined,
          organizationId: organizationId as Id<"organizations">,
        }
      )

      await mutateInternal(
        convex,
        generatedInternalApi.auth.linkFrontendUserToCRM,
        {
          userId: frontendUserId,
          email: data.formData.email.toLowerCase(),
          organizationId: organizationId as Id<"organizations">,
        }
      )
    } catch (bridgeError) {
      bridgeWarnings.push("frontend_account_bridge_failed")
      console.error("[Booking Bridge] frontend account wiring failed:", bridgeError)
    }

    if (selectedCourseRuntime.bookingResourceId) {
      const startDateTime = parseBookingStartTimestamp(data.date, data.time)
      if (!startDateTime) {
        bridgeWarnings.push("invalid_booking_datetime")
      } else {
        const bookingDurationMinutes =
          selectedCourseRuntime.bookingDurationMinutes

        try {
          const resourceSeatSelections = mapToResourceSeatSelections(
            normalizedSeatSelection.selections
          )
          const platformBookingResult = await mutateInternal(
            convex,
            generatedInternalApi.api.v1.resourceBookingsInternal
              .customerCheckoutInternal,
            {
              organizationId: organizationId as Id<"organizations">,
              resourceId: selectedCourseRuntime.bookingResourceId as Id<"objects">,
              startDateTime,
              endDateTime:
                startDateTime + bookingDurationMinutes * 60_000,
              timezone: bookingRuntimeConfig.timezone,
              customer: {
                firstName,
                lastName: lastName || firstName,
                email: data.formData.email,
                phone: data.formData.phone,
              },
              participants: normalizedSeatSelection.totalSeats,
              notes: data.formData.message,
              source: "segelschule_landing",
              seatSelections: resourceSeatSelections,
              seatInventory: buildSeatInventoryFromBoats({
                boats: bookingRuntimeConfig.boats,
                strictSeatSelection: true,
              }),
            }
          )

          platformBookingId = (platformBookingResult?.bookingId ||
            null) as Id<"objects"> | null
        } catch (bridgeError) {
          bridgeWarnings.push("resource_booking_bridge_failed")
          resourceBookingBridgeError =
            bridgeError instanceof Error
              ? bridgeError.message
              : "No availability for the selected slot"
          console.error(
            "[Booking Bridge] resource booking checkout failed:",
            bridgeError
          )
        }
      }
    }

    if (selectedCourseRuntime.bookingResourceId && !platformBookingId) {
      try {
        await mutateInternal(
          convex,
          generatedInternalApi.channels.router.patchObjectInternal,
          {
            objectId: bookingId,
            status: "cancelled",
            updatedAt: Date.now(),
          }
        )
      } catch (patchError) {
        console.error(
          "[Booking Bridge] failed to cancel local booking after resource booking failure:",
          patchError
        )
      }

      return NextResponse.json(
        {
          error:
            resourceBookingBridgeError ||
            "No availability for the selected date/time and seats.",
          bookingId,
          warnings: bridgeWarnings,
        },
        { status: 409 }
      )
    }

    if (selectedCourseRuntime.checkoutProductId) {
      try {
        const checkoutMetadata = buildCheckoutMetadata({
          bookingId: String(bookingId),
          courseId: data.course.id,
          courseName: data.course.title,
          date: data.date,
          time: data.time,
          participants: normalizedSeatSelection.totalSeats,
          language: data.language,
          seatSelections: normalizedSeatSelection.selections,
          frontendUserId: frontendUserId ? String(frontendUserId) : null,
          platformBookingId: platformBookingId ? String(platformBookingId) : null,
        })

        const checkoutResult = (await actionInternal(
          convex,
          generatedInternalApi.api.v1.checkoutInternal
            .createCheckoutSessionInternal,
          {
            organizationId: organizationId as Id<"organizations">,
            productId: selectedCourseRuntime.checkoutProductId as Id<"objects">,
            quantity: Math.max(1, normalizedSeatSelection.totalSeats),
            customerEmail: data.formData.email,
            customerName: data.formData.name,
            customerPhone: data.formData.phone,
            metadata: checkoutMetadata,
          }
        )) as {
          sessionId: unknown
          clientSecret?: unknown
          amount?: unknown
          currency?: unknown
          expiresAt?: unknown
          checkoutUrl?: unknown
        }

        const checkoutUrlFromSession =
          typeof checkoutResult.checkoutUrl === "string" &&
          checkoutResult.checkoutUrl.trim().length > 0
            ? checkoutResult.checkoutUrl.trim()
            : null

        checkoutSession = {
          sessionId: String(checkoutResult.sessionId),
          clientSecret:
            typeof checkoutResult.clientSecret === "string" &&
            checkoutResult.clientSecret.trim().length > 0
              ? checkoutResult.clientSecret
              : null,
          amount:
            typeof checkoutResult.amount === "number"
              ? checkoutResult.amount
              : 0,
          currency:
            typeof checkoutResult.currency === "string"
              ? checkoutResult.currency
              : "eur",
          expiresAt:
            typeof checkoutResult.expiresAt === "number"
              ? checkoutResult.expiresAt
              : Date.now() + 24 * 60 * 60 * 1000,
          checkoutUrl:
            checkoutUrlFromSession
            || selectedCourseRuntime.checkoutPublicUrl
            || null,
        }
        if (!checkoutSession.checkoutUrl) {
          bridgeWarnings.push("checkout_url_missing")
        }
      } catch (bridgeError) {
        bridgeWarnings.push("checkout_bridge_failed")
        console.error(
          "[Booking Bridge] checkout session creation failed:",
          bridgeError
        )
      }
    }

    try {
      const localBooking = (await queryInternal(
        convex,
        generatedInternalApi.channels.router.getObjectByIdInternal,
        { objectId: bookingId }
      )) as { customProperties?: Record<string, unknown> } | null
      const localBookingProps = localBooking?.customProperties || {}
      await mutateInternal(
        convex,
        generatedInternalApi.channels.router.patchObjectInternal,
        {
          objectId: bookingId,
          customProperties: {
            ...localBookingProps,
            seats: normalizedSeatSelection.selections,
            totalSeats: normalizedSeatSelection.totalSeats,
            frontendUserId: frontendUserId ? String(frontendUserId) : null,
            platformBookingId: platformBookingId
              ? String(platformBookingId)
              : null,
            checkoutSessionId: checkoutSession
              ? String(checkoutSession.sessionId)
              : null,
            checkoutSessionUrl: checkoutSession?.checkoutUrl || null,
            runtimeConfigSource: runtimeResolution.source,
            runtimeConfigBindingId: runtimeResolution.bindingId,
            runtimeSurfaceAppSlug: runtimeResolution.identity.appSlug,
            runtimeSurfaceType: runtimeResolution.identity.surfaceType,
            runtimeSurfaceKey: runtimeResolution.identity.surfaceKey,
            bridgeWarnings,
          },
          updatedAt: Date.now(),
        }
      )
    } catch (linkingError) {
      bridgeWarnings.push("local_booking_context_link_failed")
      console.error(
        "[Booking Bridge] local booking context link failed:",
        linkingError
      )
    }

    if (platformBookingId) {
      try {
        const platformBooking = (await queryInternal(
          convex,
          generatedInternalApi.channels.router.getObjectByIdInternal,
          { objectId: platformBookingId }
        )) as { customProperties?: Record<string, unknown> } | null
        const platformBookingProps = platformBooking?.customProperties || {}

        await mutateInternal(
          convex,
          generatedInternalApi.channels.router.patchObjectInternal,
          {
            objectId: platformBookingId,
            customProperties: {
              ...platformBookingProps,
              source: "segelschule_landing_booking",
              sourceBookingId: String(bookingId),
              linkedFrontendUserId: frontendUserId
                ? String(frontendUserId)
                : null,
              seatSelections: mapToResourceSeatSelections(
                normalizedSeatSelection.selections
              ),
              checkoutSessionId: checkoutSession
                ? String(checkoutSession.sessionId)
                : null,
              runtimeConfigSource: runtimeResolution.source,
              runtimeConfigBindingId: runtimeResolution.bindingId,
            },
            updatedAt: Date.now(),
          }
        )
      } catch (linkingError) {
        bridgeWarnings.push("platform_booking_context_link_failed")
        console.error(
          "[Booking Bridge] platform booking context link failed:",
          linkingError
        )
      }
    }

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
      seats: normalizedSeatSelection.selections,
      totalSeats: normalizedSeatSelection.totalSeats,
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
      {
        ok: true,
        bookingId,
        contactId,
        frontendUserId,
        platformBookingId,
        checkoutSession,
        runtimeConfigSource: runtimeResolution.source,
        runtimeConfigBindingId: runtimeResolution.bindingId,
        runtimeSurfaceIdentity: runtimeResolution.identity,
        warnings: bridgeWarnings,
      },
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
