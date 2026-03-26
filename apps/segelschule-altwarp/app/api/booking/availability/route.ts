export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import type { Id } from "../../../../../../convex/_generated/dataModel"
import {
  getConvexClient,
  getOrganizationId,
  queryInternal,
} from "@/lib/server-convex"
import {
  parseBookingStartTimestamp,
  resolveSegelschuleRuntimeConfig,
} from "@/lib/booking-platform-bridge"
import { buildSeatInventoryFromBoats } from "@/lib/booking-runtime-contracts"

// Dynamic require avoids excessively deep Convex API type instantiation.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generatedInternalApi: any =
  require("../../../../../../convex/_generated/api").internal

interface AvailabilityRequestPayload {
  courseId?: string
  date?: string
  time?: string
  isMultiDayCourse?: boolean
}

interface SeatAvailabilitySnapshot {
  totalCapacity: number
  bookedParticipants: number
  remainingCapacity: number
  unassignedParticipants: number
  groups: Array<{
    groupId: string
    label?: string
    capacity: number
    bookedSeatNumbers: number[]
    availableSeatNumbers: number[]
  }>
}

function isValidDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())
}

function isValidTime(value: unknown): value is string {
  return typeof value === "string" && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value.trim())
}

function extractPayload(body: Record<string, unknown>): {
  valid: true
  data: Required<Pick<AvailabilityRequestPayload, "courseId" | "date">> &
    Pick<AvailabilityRequestPayload, "time" | "isMultiDayCourse">
} | { valid: false; error: string } {
  const courseId = typeof body.courseId === "string" ? body.courseId.trim() : ""
  const date = typeof body.date === "string" ? body.date.trim() : ""
  const time = typeof body.time === "string" ? body.time.trim() : undefined

  if (!courseId) {
    return { valid: false, error: "courseId is required" }
  }
  if (!isValidDate(date)) {
    return { valid: false, error: "date must be YYYY-MM-DD" }
  }
  if (typeof time !== "undefined" && !isValidTime(time)) {
    return { valid: false, error: "time must be HH:MM" }
  }

  return {
    valid: true,
    data: {
      courseId,
      date,
      time,
      isMultiDayCourse: body.isMultiDayCourse === true,
    },
  }
}

function mapSelectedBoatAvailability(args: {
  snapshot: SeatAvailabilitySnapshot
  boats: Array<{ id: string; name: string; seatCount: number }>
}) {
  return args.boats.map((boat) => {
    const groupSnapshot = args.snapshot.groups.find((group) => group.groupId === boat.id)
    const bookedSeatSet = new Set<number>(groupSnapshot?.bookedSeatNumbers || [])

    return {
      boatId: boat.id,
      boatName: boat.name,
      totalSeats: boat.seatCount,
      availableSeats: Math.max(0, boat.seatCount - bookedSeatSet.size),
      seats: Array.from({ length: boat.seatCount }, (_, index) => {
        const seatNumber = index + 1
        return {
          seatNumber,
          status: bookedSeatSet.has(seatNumber) ? "booked" : "available",
        }
      }),
    }
  })
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>
    const parsedPayload = extractPayload(body)
    if (!parsedPayload.valid) {
      return NextResponse.json(
        { error: parsedPayload.error },
        { status: 400 }
      )
    }

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
    const runtime = runtimeResolution.runtimeConfig
    const selectedCourse = runtime.courses[parsedPayload.data.courseId]
    if (!selectedCourse) {
      return NextResponse.json(
        { error: "Unknown course for selected booking surface" },
        { status: 404 }
      )
    }
    if (!selectedCourse.bookingResourceId) {
      return NextResponse.json(
        { error: "No booking resource configured for selected course" },
        { status: 503 }
      )
    }

    const durationMinutes = selectedCourse.bookingDurationMinutes
    const availableTimes =
      selectedCourse.availableTimes.length > 0
        ? selectedCourse.availableTimes
        : runtime.defaultAvailableTimes
    const seatInventory = buildSeatInventoryFromBoats({
      boats: runtime.boats,
      strictSeatSelection: true,
    })

    const slotResults = await Promise.all(
      availableTimes.map(async (time) => {
        const startDateTime = parseBookingStartTimestamp(parsedPayload.data.date, time)
        if (!startDateTime) {
          return {
            time,
            isAvailable: false,
            totalSeats: 0,
            availableSeats: 0,
            snapshot: null as SeatAvailabilitySnapshot | null,
          }
        }

        const snapshot = (await queryInternal(
          convex,
          generatedInternalApi.api.v1.resourceBookingsInternal.getSeatAvailabilityInternal,
          {
            organizationId: organizationId as Id<"organizations">,
            resourceId: selectedCourse.bookingResourceId as Id<"objects">,
            startDateTime,
            endDateTime: startDateTime + durationMinutes * 60_000,
            seatInventory,
          }
        )) as SeatAvailabilitySnapshot

        return {
          time,
          isAvailable: snapshot.remainingCapacity > 0,
          totalSeats: snapshot.totalCapacity,
          availableSeats: snapshot.remainingCapacity,
          snapshot,
        }
      })
    )

    const selectedSlot =
      parsedPayload.data.time
        ? slotResults.find((slot) => slot.time === parsedPayload.data.time)
        : null

    const selectedBoatAvailability =
      selectedSlot?.snapshot
        ? mapSelectedBoatAvailability({
            snapshot: selectedSlot.snapshot,
            boats: runtime.boats,
          })
        : null

    return NextResponse.json(
      {
        ok: true,
        courseId: parsedPayload.data.courseId,
        date: parsedPayload.data.date,
        timezone: runtime.timezone,
        runtimeConfigSource: runtimeResolution.source,
        runtimeConfigBindingId: runtimeResolution.bindingId,
        runtimeConfigWarnings: runtimeResolution.warnings,
        durationMinutes,
        availableTimes: slotResults.map((slot) => ({
          time: slot.time,
          isAvailable: slot.isAvailable,
          availableSeats: slot.availableSeats,
          totalSeats: slot.totalSeats,
        })),
        selectedTime: parsedPayload.data.time || null,
        selectedBoatAvailability,
      },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    )
  } catch (error) {
    console.error("[Booking Availability] Failed:", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to load availability",
      },
      { status: 500 }
    )
  }
}
