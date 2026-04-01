#!/usr/bin/env npx tsx

import path from "node:path"
import { randomBytes } from "node:crypto"

import { ConvexHttpClient } from "convex/browser"
import { config as loadEnv } from "dotenv"

import * as generatedApiModule from "../convex/_generated/api.js"
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

const COURSE_FIXTURE_CONFIG: Record<
  string,
  { title: string; price: number; isMultiDay: boolean }
> = {
  schnupper: {
    title: "Schnupperkurs",
    price: 129,
    isMultiDay: false,
  },
  grund: {
    title: "Grundkurs",
    price: 299,
    isMultiDay: true,
  },
  intensiv: {
    title: "Intensivkurs",
    price: 349,
    isMultiDay: true,
  },
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
  const resolvedEnvPath = path.resolve(process.cwd(), envPath)
  loadEnv({ path: resolvedEnvPath, override: false })

  const organizationId = required(
    getArg("--organization-id")
    || process.env.ORG_ID
    || process.env.NEXT_PUBLIC_ORG_ID,
    "Pass --organization-id or set ORG_ID/NEXT_PUBLIC_ORG_ID."
  )
  process.env.ORG_ID = organizationId

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
  const seatNumbers = Array.from({ length: participants }, (_, index) => index + 1)
  const fixtureToken = randomBytes(18).toString("hex")
  process.env.SEGELSCHULE_BOOKING_FIXTURE_TOKEN = fixtureToken

  const client = new ConvexHttpClient(convexUrl)
  const maybeAdminClient = client as ConvexHttpClient & {
    setAdminAuth?: (token: string) => void
  }
  maybeAdminClient.setAdminAuth?.(deployKey)

  const availabilityRoute = await import(
    "../apps/segelschule-altwarp/app/api/booking/availability/route"
  )
  const courseCandidates =
    requestedCourseId === "auto"
      ? Object.keys(COURSE_FIXTURE_CONFIG)
      : [requestedCourseId]
  let selectedCourseId: string | null = null
  let selectedDate: string | null = null
  let availabilityPayload: Record<string, any> | null = null
  let selectedTime: string | null = null

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
            timezone,
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

      selectedCourseId = courseId
      selectedDate = candidateDate
      availabilityPayload = nextAvailabilityPayload
      selectedTime = String(availableTimeEntry.time)
      break
    }

    if (selectedCourseId && availabilityPayload && selectedTime && selectedDate) {
      break
    }
  }

  if (
    (!selectedCourseId || !availabilityPayload || !selectedTime || !selectedDate)
    && ignoreOutsideAvailability
  ) {
    selectedCourseId =
      requestedCourseId !== "auto"
        ? requestedCourseId
        : (courseCandidates.includes("grund") ? "grund" : courseCandidates[0] || null)
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

  if (!selectedCourseId || !availabilityPayload || !selectedTime || !selectedDate) {
    throw new Error(
      `No available Segelschule slot found from ${requestedDate} through +${searchDays}d across courses: ${courseCandidates.join(", ")}.`
    )
  }

  const selectedCourseConfig = COURSE_FIXTURE_CONFIG[selectedCourseId] || {
    title: selectedCourseId,
    price: 129,
    isMultiDay: false,
  }
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
        course: {
          id: selectedCourseId,
          title: selectedCourseConfig.title,
          price: `EUR ${selectedCourseConfig.price.toFixed(2)}`,
          isMultiDay: selectedCourseConfig.isMultiDay,
        },
        date: selectedDate,
        time: selectedTime,
        seats: [
          {
            boatId: "fraukje",
            boatName: "Fraukje",
            seatNumbers,
          },
        ],
        totalSeats: participants,
        termsAccepted: true,
        formData: {
          name: customerName,
          email: customerEmail,
          phone: customerPhone,
          message: `${fixtureLabel} (${fixtureKey})`,
        },
        paymentMethod: "invoice",
        totalAmount: selectedCourseConfig.price * participants,
        language,
        emailExecutionControl: {
          mode: "capture",
          capturePreviews: true,
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
              mode: "capture",
              capturePreviews: true,
              markAsSent: true,
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
              mode: "capture",
              capturePreviews: false,
              markAsSent: true,
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

  console.log(
    JSON.stringify(
      {
        envPath: resolvedEnvPath,
        organizationId,
        fixtureKey,
        fixtureLabel,
        selectedCourseId,
        selectedCourseTitle: selectedCourseConfig.title,
        requestedDate,
        selectedDate,
        requestedTime,
        selectedTime,
        reminderDaysBeforeStart,
        participants,
        bookingId,
        availability: availabilityPayload,
        bookingResponse: bookingPayload,
        reminderResults,
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
