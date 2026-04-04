#!/usr/bin/env npx tsx

import { randomBytes } from "node:crypto"

import { ConvexHttpClient } from "convex/browser"
import { Resend } from "resend"

import * as generatedApiModule from "../convex/_generated/api.js"
import { loadWorkspaceEnvCascade } from "./lib/load-workspace-env"
import { localDateTimeToTimestamp } from "../src/lib/timezone-utils"

const generated =
  (generatedApiModule as { default?: Record<string, unknown> }).default
  || (generatedApiModule as Record<string, unknown>)
const { internal } = generated as {
  internal: Record<string, unknown>
}

type RouterObjectRecord = {
  _id: string
  organizationId: string
  type: string
  subtype?: string
  status?: string
  name?: string
  customProperties?: Record<string, unknown>
}

type FixtureEmailMode = "capture" | "redirect" | "live"

type DeliveryStatusSummary = {
  id: string
  lastEvent: string | null
  to: string[]
  subject: string | null
  createdAt: string | null
}

type BoatSeatAvailability = {
  boatId: string
  boatName: string
  totalSeats: number
  availableSeats: number
  seats: Array<{
    seatNumber: number
    status: string
  }>
}

type CatalogCoursePayload = {
  courseId: string
  aliases?: string[]
  title?: string | null
  description?: string | null
  durationLabel?: string | null
  durationMinutes?: number | null
  priceInCents?: number | null
  currency?: string | null
  isMultiDay?: boolean
}

type CatalogApiPayload = {
  ok?: boolean
  courses?: CatalogCoursePayload[]
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

function getCommaSeparatedArg(flag: string): string[] {
  const raw = getArg(flag)
  if (!raw) {
    return []
  }

  return raw
    .split(",")
    .map((entry) => normalizeOptionalString(entry))
    .filter((entry): entry is string => Boolean(entry))
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

function findCatalogCourse(
  courses: CatalogCoursePayload[],
  requestedCourseId: string | null
): CatalogCoursePayload | null {
  if (!requestedCourseId) {
    return null
  }

  return (
    courses.find(
      (course) =>
        course.courseId === requestedCourseId
        || (Array.isArray(course.aliases) && course.aliases.includes(requestedCourseId))
    ) || null
  )
}

function resolveFixtureEmailMode(value: string | undefined): FixtureEmailMode {
  return value === "live" || value === "redirect" ? value : "capture"
}

function collectDeliveryMessageIds(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((entry) =>
      normalizeOptionalString(
        (entry as { messageId?: unknown } | null | undefined)?.messageId
      )
    )
    .filter((entry): entry is string => Boolean(entry))
}

async function fetchResendDeliveryStatus(args: {
  resendApiKey: string
  messageId: string
}): Promise<DeliveryStatusSummary> {
  const resend = new Resend(args.resendApiKey)
  const result = await resend.emails.get(args.messageId)
  if (result.error || !result.data) {
    throw new Error(
      result.error?.message
      || `Unable to fetch Resend delivery status for ${args.messageId}`
    )
  }

  return {
    id: result.data.id,
    lastEvent: normalizeOptionalString(result.data.last_event),
    to: Array.isArray(result.data.to) ? result.data.to : [],
    subject: normalizeOptionalString(result.data.subject),
    createdAt: normalizeOptionalString(result.data.created_at),
  }
}

async function pollResendDeliveryStatuses(args: {
  resendApiKey: string
  messageIds: string[]
  timeoutMs: number
  intervalMs: number
}): Promise<DeliveryStatusSummary[]> {
  const uniqueIds = Array.from(new Set(args.messageIds))
  const deadline = Date.now() + args.timeoutMs
  const statuses = new Map<string, DeliveryStatusSummary>()

  while (Date.now() <= deadline) {
    for (const messageId of uniqueIds) {
      const status = await fetchResendDeliveryStatus({
        resendApiKey: args.resendApiKey,
        messageId,
      })
      statuses.set(messageId, status)
    }

    const pending = Array.from(statuses.values()).some((status) =>
      ["queued", "scheduled", "sent"].includes(status.lastEvent || "")
    )
    if (!pending) {
      break
    }

    await new Promise((resolve) => setTimeout(resolve, args.intervalMs))
  }

  return uniqueIds
    .map((messageId) => statuses.get(messageId))
    .filter((status): status is DeliveryStatusSummary => Boolean(status))
}

function formatDateInTimezone(date: Date, timezone: string): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
  const parts = formatter.formatToParts(date)
  const year = parts.find((part) => part.type === "year")?.value
  const month = parts.find((part) => part.type === "month")?.value
  const day = parts.find((part) => part.type === "day")?.value
  if (!year || !month || !day) {
    throw new Error(`Unable to format date for timezone ${timezone}`)
  }
  return `${year}-${month}-${day}`
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000)
}

function selectAvailableSeats(args: {
  selectedBoatAvailability: unknown
  participants: number
}): Array<{
  boatId: string
  boatName: string
  seatNumbers: number[]
}> {
  if (!Array.isArray(args.selectedBoatAvailability)) {
    throw new Error("Selected boat availability is not available for seat allocation.")
  }

  let remainingParticipants = args.participants
  const selections: Array<{
    boatId: string
    boatName: string
    seatNumbers: number[]
  }> = []

  for (const boat of args.selectedBoatAvailability as BoatSeatAvailability[]) {
    const availableSeatNumbers = Array.isArray(boat.seats)
      ? boat.seats
          .filter((seat) => seat?.status === "available")
          .map((seat) => seat.seatNumber)
          .filter((seatNumber) => Number.isFinite(seatNumber))
      : []

    if (availableSeatNumbers.length === 0) {
      continue
    }

    const allocatedSeatNumbers = availableSeatNumbers.slice(0, remainingParticipants)
    if (allocatedSeatNumbers.length === 0) {
      continue
    }

    selections.push({
      boatId: boat.boatId,
      boatName: boat.boatName,
      seatNumbers: allocatedSeatNumbers,
    })
    remainingParticipants -= allocatedSeatNumbers.length

    if (remainingParticipants <= 0) {
      break
    }
  }

  if (remainingParticipants > 0) {
    throw new Error(
      `Unable to allocate ${args.participants} seat(s) from selected boat availability.`
    )
  }

  return selections
}

async function listOrgObjectsByType(
  client: ConvexHttpClient,
  organizationId: string,
  type: string
) {
  return (await client.query(internal.channels.router.listObjectsByOrgTypeInternal as any, {
    organizationId,
    type,
  })) as RouterObjectRecord[]
}

async function main() {
  const envPath = getArg("--env") || "apps/segelschule-altwarp/.env.local"
  const { resolvedEnvPath, loadedEnvPaths } = loadWorkspaceEnvCascade(envPath)

  const organizationId = required(
    getArg("--organization-id")
    || process.env.ORG_ID
    || process.env.PLATFORM_ORG_ID
    || process.env.NEXT_PUBLIC_PLATFORM_ORG_ID
    || process.env.NEXT_PUBLIC_ORG_ID,
    "Pass --organization-id or set ORG_ID/PLATFORM_ORG_ID/NEXT_PUBLIC_PLATFORM_ORG_ID/NEXT_PUBLIC_ORG_ID."
  )
  process.env.ORG_ID = organizationId
  process.env.PLATFORM_ORG_ID = organizationId
  process.env.NEXT_PUBLIC_PLATFORM_ORG_ID = organizationId

  const convexUrl = required(
    process.env.NEXT_PUBLIC_CONVEX_URL,
    `NEXT_PUBLIC_CONVEX_URL is required. Checked ${resolvedEnvPath}.`
  )
  const deployKey = required(
    process.env.CONVEX_DEPLOY_KEY,
    `CONVEX_DEPLOY_KEY is required. Checked ${resolvedEnvPath}.`
  )

  const timezone = getArg("--timezone") || "Europe/Berlin"
  const requestedCourseId = getArg("--course-id") || "auto"
  const requestedTime = getArg("--time") || "09:00"
  const now = new Date()
  const defaultDate = formatDateInTimezone(addDays(now, 7), timezone)
  const requestedDate = getArg("--date") || defaultDate
  const searchDays = Number.parseInt(getArg("--search-days") || "21", 10)
  const language = getArg("--language") || "de"
  const ignoreOutsideAvailability = hasFlag("--ignore-outside-availability")
  const emailMode = resolveFixtureEmailMode(getArg("--email-mode"))
  const capturePreviews = hasFlag("--no-capture-previews") ? false : true
  const customerRecipients = getCommaSeparatedArg("--customer-recipient")
  const operatorRecipients = getCommaSeparatedArg("--operator-recipient")
  const pollEmailDelivery = hasFlag("--poll-email-delivery")
  const deliveryTimeoutMs = Number.parseInt(
    getArg("--delivery-timeout-ms") || "30000",
    10
  )
  const deliveryIntervalMs = Number.parseInt(
    getArg("--delivery-poll-interval-ms") || "2000",
    10
  )
  const fixtureKey = getArg("--fixture-key")
    || `segelschule-live-fixture-${Date.now()}`
  const fixtureLabel =
    getArg("--fixture-label")
    || "Codex Segelschule live fixture"
  const participants = Number.parseInt(getArg("--participants") || "2", 10)
  if (!Number.isFinite(participants) || participants < 1 || participants > 4) {
    throw new Error("--participants must be between 1 and 4")
  }

  const customerEmail =
    getArg("--customer-email")
    || `segelschule.fixture+${Date.now()}@example.com`
  const customerName = getArg("--customer-name") || "Codex Live Fixture"
  const customerPhone = getArg("--customer-phone") || "+49 170 000000"
  const fixtureToken = randomBytes(18).toString("hex")
  process.env.SEGELSCHULE_BOOKING_FIXTURE_TOKEN = fixtureToken

  const client = new ConvexHttpClient(convexUrl)
  const maybeAdminClient = client as ConvexHttpClient & {
    setAdminAuth?: (token: string) => void
  }
  maybeAdminClient.setAdminAuth?.(deployKey)

  const catalogRoute = await import(
    "../apps/segelschule-altwarp/app/api/booking/catalog/route"
  )
  const availabilityRoute = await import(
    "../apps/segelschule-altwarp/app/api/booking/availability/route"
  )
  const catalogResponse = await catalogRoute.GET(
    new Request(
      `http://localhost/api/booking/catalog?lang=${encodeURIComponent(language)}`
    )
  )
  const catalogPayload = (await catalogResponse.json()) as CatalogApiPayload
  if (!catalogResponse.ok || catalogPayload.ok !== true) {
    throw new Error(
      `Booking catalog lookup failed: ${JSON.stringify(catalogPayload)}`
    )
  }

  const catalogCourses = Array.isArray(catalogPayload.courses)
    ? catalogPayload.courses
    : []
  if (catalogCourses.length === 0) {
    throw new Error("Booking catalog returned no courses.")
  }

  const requestedCatalogCourse =
    requestedCourseId === "auto"
      ? null
      : findCatalogCourse(catalogCourses, requestedCourseId)
  if (requestedCourseId !== "auto" && !requestedCatalogCourse) {
    throw new Error(
      `Requested course '${requestedCourseId}' is not available in the backend booking catalog.`
    )
  }

  const courseCandidates =
    requestedCourseId === "auto"
      ? catalogCourses.map((course) => course.courseId)
      : [requestedCatalogCourse!.courseId]
  let selectedCourse: CatalogCoursePayload | null = null
  let selectedCourseId: string | null = null
  let selectedDate: string | null = null
  let availabilityPayload: Record<string, any> | null = null
  let selectedTime: string | null = null
  let selectedSeatAvailability: Record<string, any> | null = null

  for (let dayOffset = 0; dayOffset <= searchDays; dayOffset += 1) {
    const candidateDate = formatDateInTimezone(
      addDays(new Date(`${requestedDate}T00:00:00.000Z`), dayOffset),
      timezone
    )

    for (const courseId of courseCandidates) {
      const availabilityResponse = await availabilityRoute.POST(
        new Request("http://localhost/api/booking/availability", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            courseId,
            date: candidateDate,
            language,
          }),
        })
      )

      const nextAvailabilityPayload = await availabilityResponse.json()
      if (!availabilityResponse.ok || nextAvailabilityPayload.ok !== true) {
        throw new Error(
          `Availability lookup failed for ${courseId}: ${JSON.stringify(nextAvailabilityPayload)}`
        )
      }

      const availableTimeEntry =
        nextAvailabilityPayload.availableTimes.find(
          (entry: { time: string; isAvailable: boolean }) =>
            entry.time === requestedTime && entry.isAvailable
        )
        || nextAvailabilityPayload.availableTimes.find(
          (entry: { time: string; isAvailable: boolean }) => entry.isAvailable
        )

      if (!availableTimeEntry) {
        continue
      }

      const resolvedCourseId =
        normalizeOptionalString(nextAvailabilityPayload.courseId) || courseId
      selectedCourseId = resolvedCourseId
      selectedCourse = findCatalogCourse(catalogCourses, resolvedCourseId)
      selectedDate = candidateDate
      availabilityPayload = nextAvailabilityPayload
      selectedTime = String(availableTimeEntry.time)
      break
    }

    if (
      selectedCourseId
      && selectedCourse
      && availabilityPayload
      && selectedTime
      && selectedDate
    ) {
      break
    }
  }

  if (
    (!selectedCourseId
      || !selectedCourse
      || !availabilityPayload
      || !selectedTime
      || !selectedDate)
    && ignoreOutsideAvailability
  ) {
    selectedCourse =
      requestedCatalogCourse
      || findCatalogCourse(catalogCourses, "grund")
      || catalogCourses[0]
      || null
    selectedCourseId = selectedCourse?.courseId || null
    selectedDate = requestedDate
    selectedTime = requestedTime
    availabilityPayload = {
      ok: false,
      forcedFixtureSlot: true,
      searchedFrom: requestedDate,
      searchedDays: searchDays,
      courseCandidates,
    }
  }

  if (
    !selectedCourseId
    || !selectedCourse
    || !availabilityPayload
    || !selectedTime
    || !selectedDate
  ) {
    throw new Error(
      `No available Segelschule slot found from ${requestedDate} through +${searchDays}d across courses: ${courseCandidates.join(", ")}.`
    )
  }

  if (availabilityPayload?.ok === true && selectedTime && selectedDate) {
    const seatAvailabilityResponse = await availabilityRoute.POST(
      new Request("http://localhost/api/booking/availability", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          courseId: selectedCourseId,
          date: selectedDate,
          time: selectedTime,
          language,
        }),
      })
    )

    const nextSeatAvailabilityPayload = await seatAvailabilityResponse.json()
    if (!seatAvailabilityResponse.ok || nextSeatAvailabilityPayload.ok !== true) {
      throw new Error(
        `Seat availability lookup failed for ${selectedCourseId} ${selectedDate} ${selectedTime}: ${JSON.stringify(nextSeatAvailabilityPayload)}`
      )
    }
    selectedSeatAvailability = nextSeatAvailabilityPayload
  }

  const seatSelections =
    selectedSeatAvailability?.selectedBoatAvailability
      ? selectAvailableSeats({
          selectedBoatAvailability: selectedSeatAvailability.selectedBoatAvailability,
          participants,
        })
      : [
          {
            boatId: "fraukje",
            boatName: "Fraukje",
            seatNumbers: Array.from({ length: participants }, (_, index) => index + 1),
          },
        ]

  const todayLocalDate = formatDateInTimezone(now, timezone)
  const reminderDaysBeforeStart = Math.max(
    0,
    Math.round(
      (
        localDateTimeToTimestamp(selectedDate, "00:00", timezone)
        - localDateTimeToTimestamp(todayLocalDate, "00:00", timezone)
      )
      / (24 * 60 * 60 * 1000)
    )
  )
  const bookingRoute = await import(
    "../apps/segelschule-altwarp/app/api/booking/route"
  )
  const bookingResponse = await bookingRoute.POST(
    new Request("http://localhost/api/booking", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-segelschule-fixture-token": fixtureToken,
      },
      body: JSON.stringify({
        courseId: selectedCourseId,
        date: selectedDate,
        time: selectedTime,
        seats: seatSelections,
        totalSeats: participants,
        termsAccepted: true,
        formData: {
          name: customerName,
          email: customerEmail,
          phone: customerPhone,
          message: `${fixtureLabel} (${fixtureKey})`,
        },
        paymentMethod: "invoice",
        language,
        emailExecutionControl: {
          mode: emailMode,
          capturePreviews,
          ...(customerRecipients.length > 0
            ? { customerRecipients }
            : {}),
          ...(operatorRecipients.length > 0
            ? { operatorRecipients }
            : {}),
          fixtureKey,
          fixtureLabel,
        },
        ...(ignoreOutsideAvailability
          ? {
              fixtureOptions: {
                ignoreOutsideAvailability: true,
              },
            }
          : {}),
      }),
    })
  )

  const bookingPayload = await bookingResponse.json()
  if (!bookingResponse.ok || bookingPayload.ok !== true) {
    throw new Error(
      `Fixture booking failed for ${selectedCourseId} on ${selectedDate} ${selectedTime}: ${JSON.stringify(
        {
          availability: availabilityPayload,
          bookingResponse: bookingPayload,
        },
        null,
        2
      )}`
    )
  }

  const bookingId = required(
    normalizeOptionalString(bookingPayload.bookingId) || undefined,
    "Fixture booking did not return bookingId."
  )

  const reminderResults: Record<string, unknown> = {}
  if (!hasFlag("--skip-reminders")) {
    const workflows = await listOrgObjectsByType(client, organizationId, "layer_workflow")
    const workflowKeys = [
      "segelschule_weather_reminder",
      "segelschule_packing_list_reminder",
    ]

    for (const workflowKey of workflowKeys) {
      const workflow = workflows.find(
        (candidate) =>
          normalizeOptionalString(
            candidate.customProperties?.segelschuleWorkflowKey
          ) === workflowKey
      )
      if (!workflow) {
        reminderResults[workflowKey] = { error: "workflow_not_found" }
        continue
      }

      const nodes = Array.isArray(workflow.customProperties?.nodes)
        ? (workflow.customProperties?.nodes as Array<Record<string, unknown>>)
        : []
      const reminderNode =
        nodes.find((node) => node.type === "lc_booking_notifications") || null
      if (!reminderNode || typeof reminderNode.config !== "object") {
        reminderResults[workflowKey] = { error: "reminder_node_missing" }
        continue
      }

      const baseNodeConfig = reminderNode.config as Record<string, unknown>
      const firstRun = await client.action(
        internal.bookingWorkflowAutomation.executeBookingNotificationNode as any,
        {
          organizationId,
          nodeConfig: {
            ...baseNodeConfig,
            bookingIds: [bookingId],
            daysBeforeStart: reminderDaysBeforeStart,
            emailExecutionControl: {
              mode: emailMode,
              capturePreviews,
              markAsSent: true,
              ...(customerRecipients.length > 0
                ? { customerRecipients }
                : {}),
              ...(operatorRecipients.length > 0
                ? { operatorRecipients }
                : {}),
              fixtureKey,
              fixtureLabel,
            },
          },
          inputData: {
            fixtureKey,
            bookingId,
          },
        }
      )

      const secondRun = await client.action(
        internal.bookingWorkflowAutomation.executeBookingNotificationNode as any,
        {
          organizationId,
          nodeConfig: {
            ...baseNodeConfig,
            bookingIds: [bookingId],
            daysBeforeStart: reminderDaysBeforeStart,
            emailExecutionControl: {
              mode: emailMode,
              capturePreviews: false,
              markAsSent: true,
              ...(customerRecipients.length > 0
                ? { customerRecipients }
                : {}),
              ...(operatorRecipients.length > 0
                ? { operatorRecipients }
                : {}),
              fixtureKey,
              fixtureLabel,
            },
          },
          inputData: {
            fixtureKey,
            bookingId,
            rerun: true,
          },
        }
      )

      reminderResults[workflowKey] = {
        workflowId: workflow._id,
        workflowName: workflow.name || null,
        firstRun,
        secondRun,
      }
    }
  }

  const routeDeliveryIds = collectDeliveryMessageIds(
    (bookingPayload as { emailDispatch?: { deliveries?: unknown } }).emailDispatch?.deliveries
  )
  const reminderDeliveryIds = Object.values(reminderResults).flatMap((result) => {
    if (!result || typeof result !== "object") {
      return []
    }
    const record = result as {
      firstRun?: { data?: { deliveries?: unknown } }
      secondRun?: { data?: { deliveries?: unknown } }
    }
    return [
      ...collectDeliveryMessageIds(record.firstRun?.data?.deliveries),
      ...collectDeliveryMessageIds(record.secondRun?.data?.deliveries),
    ]
  })
  const deliveryStatuses =
    pollEmailDelivery && emailMode !== "capture"
      ? await pollResendDeliveryStatuses({
          resendApiKey: required(
            process.env.RESEND_API_KEY,
            `RESEND_API_KEY is required to poll delivery status. Checked ${resolvedEnvPath}.`
          ),
          messageIds: [...routeDeliveryIds, ...reminderDeliveryIds],
          timeoutMs: deliveryTimeoutMs,
          intervalMs: deliveryIntervalMs,
        })
      : []

  console.log(
    JSON.stringify(
      {
        envPath: resolvedEnvPath,
        loadedEnvPaths,
        organizationId,
        fixtureKey,
        fixtureLabel,
        selectedCourseId,
        selectedCourseTitle: selectedCourse.title || selectedCourse.courseId,
        selectedCoursePriceInCents: selectedCourse.priceInCents || null,
        selectedCourseDurationMinutes: selectedCourse.durationMinutes || null,
        requestedDate,
        selectedDate,
        requestedTime,
        selectedTime,
        reminderDaysBeforeStart,
        participants,
        emailMode,
        customerRecipients,
        operatorRecipients,
        seatSelections,
        bookingId,
        availability: availabilityPayload,
        selectedSeatAvailability,
        bookingResponse: bookingPayload,
        reminderResults,
        deliveryStatuses,
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
