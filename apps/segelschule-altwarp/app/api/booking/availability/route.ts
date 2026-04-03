export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { toZonedTime } from "date-fns-tz"
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

interface ResourceAvailabilitySnapshot {
  schedules: Array<{
    dayOfWeek?: unknown
    startTime?: unknown
    endTime?: unknown
    isAvailable?: unknown
    timezone?: unknown
  }>
  exceptions: Array<{
    date?: unknown
    isAvailable?: unknown
    customHours?: unknown
  }>
  blocks: Array<{
    startDate?: unknown
    endDate?: unknown
  }>
}

interface AvailableSlotSnapshot {
  startTime?: unknown
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

function normalizeTimeValue(value: unknown): string | null {
  return isValidTime(value) ? value.trim() : null
}

function timeToMinutes(value: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value)
  if (!match) {
    return null
  }
  return Number(match[1]) * 60 + Number(match[2])
}

function formatDateKey(value: unknown, timezone: string): string | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null
  }
  const zoned = toZonedTime(new Date(value), timezone)
  const year = zoned.getFullYear().toString().padStart(4, "0")
  const month = String(zoned.getMonth() + 1).padStart(2, "0")
  const day = String(zoned.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function blockIncludesDate(
  block: { startDate?: unknown; endDate?: unknown },
  date: string,
  timezone: string
): boolean {
  const startDate = formatDateKey(block.startDate, timezone)
  const endDate = formatDateKey(block.endDate, timezone)
  if (!startDate || !endDate) {
    return false
  }
  return date >= startDate && date <= endDate
}

function rangeCanFitDuration(args: {
  startTime: string
  endTime: string
  durationMinutes: number
}): boolean {
  const startMinutes = timeToMinutes(args.startTime)
  const endMinutes = timeToMinutes(args.endTime)
  if (startMinutes === null || endMinutes === null) {
    return false
  }
  return endMinutes - startMinutes >= args.durationMinutes
}

function uniqueSortedTimes(values: string[]): string[] {
  return Array.from(new Set(values)).sort((left, right) => left.localeCompare(right))
}

function hasResourceAvailability(snapshot: ResourceAvailabilitySnapshot | null): boolean {
  return Boolean(
    snapshot
    && (
      snapshot.schedules.length > 0
      || snapshot.exceptions.length > 0
      || snapshot.blocks.length > 0
    )
  )
}

function buildCandidateTimes(args: {
  date: string
  durationMinutes: number
  fallbackTimes: string[]
  availability: ResourceAvailabilitySnapshot | null
  timezone: string
}): string[] {
  if (!hasResourceAvailability(args.availability)) {
    return args.fallbackTimes
  }

  for (const block of args.availability!.blocks) {
    if (blockIncludesDate(block, args.date, args.timezone)) {
      return []
    }
  }

  const matchingException = args.availability!.exceptions.find(
    (exception) => formatDateKey(exception.date, args.timezone) === args.date
  )
  if (matchingException?.isAvailable === false) {
    return []
  }

  const exceptionHours =
    matchingException?.customHours && typeof matchingException.customHours === "object"
      ? (matchingException.customHours as Record<string, unknown>)
      : null
  const exceptionStart = normalizeTimeValue(exceptionHours?.startTime)
  const exceptionEnd = normalizeTimeValue(exceptionHours?.endTime)
  if (
    exceptionStart
    && exceptionEnd
    && rangeCanFitDuration({
      startTime: exceptionStart,
      endTime: exceptionEnd,
      durationMinutes: args.durationMinutes,
    })
  ) {
    return [exceptionStart]
  }

  const dayStart = parseBookingStartTimestamp(args.date, "00:00", args.timezone)
  if (!dayStart) {
    return []
  }

  const dayOfWeek = toZonedTime(new Date(dayStart), args.timezone).getDay()
  const scheduleTimes = args.availability!.schedules
    .filter((schedule) => schedule.dayOfWeek === dayOfWeek && schedule.isAvailable !== false)
    .map((schedule) => {
      const startTime = normalizeTimeValue(schedule.startTime)
      const endTime = normalizeTimeValue(schedule.endTime)
      if (
        !startTime
        || !endTime
        || !rangeCanFitDuration({
          startTime,
          endTime,
          durationMinutes: args.durationMinutes,
        })
      ) {
        return null
      }
      return startTime
    })
    .filter((time): time is string => Boolean(time))

  return uniqueSortedTimes(scheduleTimes)
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
    const fallbackTimes =
      selectedCourse.availableTimes.length > 0
        ? selectedCourse.availableTimes
        : runtime.defaultAvailableTimes
    const resourceAvailability = (await queryInternal(
      convex,
      generatedInternalApi.availabilityOntology.getResourceAvailabilityInternal,
      {
        organizationId: organizationId as Id<"organizations">,
        resourceId: selectedCourse.bookingResourceId as Id<"objects">,
      }
    )) as ResourceAvailabilitySnapshot
    const candidateTimes = buildCandidateTimes({
      date: parsedPayload.data.date,
      durationMinutes,
      fallbackTimes,
      availability: resourceAvailability,
      timezone: runtime.timezone,
    })
    const seatInventory = buildSeatInventoryFromBoats({
      boats: runtime.boats,
      strictSeatSelection: true,
    })
    let availableStartTimes = new Set<string>()

    if (hasResourceAvailability(resourceAvailability) && candidateTimes.length > 0) {
      const dayStart = parseBookingStartTimestamp(
        parsedPayload.data.date,
        "00:00",
        runtime.timezone
      )
      if (dayStart) {
        const availableSlots = (await queryInternal(
          convex,
          generatedInternalApi.availabilityOntology.getAvailableSlotsInternal,
          {
            organizationId: organizationId as Id<"organizations">,
            resourceId: selectedCourse.bookingResourceId as Id<"objects">,
            startDate: dayStart,
            endDate: dayStart + 24 * 60 * 60 * 1000 - 1,
            duration: durationMinutes,
            timezone: runtime.timezone,
          }
        )) as AvailableSlotSnapshot[]
        availableStartTimes = new Set(
          availableSlots
            .map((slot) => normalizeTimeValue(slot.startTime))
            .filter((time): time is string => Boolean(time))
        )
      }
    }

    const slotResults = await Promise.all(
      candidateTimes.map(async (time) => {
        const startDateTime = parseBookingStartTimestamp(
          parsedPayload.data.date,
          time,
          runtime.timezone
        )
        if (!startDateTime) {
          return {
            time,
            isAvailable: false,
            totalSeats: 0,
            availableSeats: 0,
            snapshot: null as SeatAvailabilitySnapshot | null,
          }
        }

        const slotAllowedBySchedule =
          !hasResourceAvailability(resourceAvailability) || availableStartTimes.has(time)
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
          isAvailable: slotAllowedBySchedule && snapshot.remainingCapacity > 0,
          totalSeats: snapshot.totalCapacity,
          availableSeats: slotAllowedBySchedule ? snapshot.remainingCapacity : 0,
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
