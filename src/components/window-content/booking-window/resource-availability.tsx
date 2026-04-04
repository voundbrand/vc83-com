"use client"

import { useEffect, useRef, useState } from "react"
import { useMutation, useQuery } from "convex/react"
import { Clock, Save, ChevronDown, ChevronRight, Plus, X, CalendarRange, Trash2 } from "lucide-react"
// Dynamic require avoids TS2589 deep type instantiation from generated API type expansion.
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
const { api } = require("../../../../convex/_generated/api") as { api: any }
import type { Id } from "../../../../convex/_generated/dataModel"
import {
  getAvailabilityStructureDefinition,
  resolveAvailabilityStructure,
} from "../../../../convex/lib/availabilityStructures"
import { AVAILABILITY_RESOURCE_SUBTYPES } from "../../../../convex/lib/availabilityResources"
import {
  buildBookableConfigForSubtype,
  buildBookableShadowProperties,
} from "../products-window/bookable-config-section"
import { useAuth, useCurrentOrganization } from "@/hooks/use-auth"
import { useNotification } from "@/hooks/use-notification"
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations"

interface ResourceAvailabilityProps {
  selectedResourceId: Id<"objects"> | null
  onSelectResource: (id: Id<"objects"> | null) => void
}

type DayKey =
  | "sunday"
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"

interface TimeRange {
  startTime: string
  endTime: string
}

interface DayScheduleState {
  isOpen: boolean
  timeRanges: TimeRange[]
}

type WeeklyScheduleState = Record<DayKey, DayScheduleState>
type OverrideMode = "closed" | "custom_hours"
type BookingTranslationFn = (
  key: string,
  fallback: string,
  values?: Record<string, string | number>
) => string

interface ExceptionEditorState {
  clientId: string
  exceptionId: Id<"objects"> | null
  date: string
  mode: OverrideMode
  startTime: string
  endTime: string
  reason: string
}

interface BlockEditorState {
  clientId: string
  blockId: Id<"objects"> | null
  startDate: string
  endDate: string
  reason: string
}

interface ProductRecord {
  _id: Id<"objects">
  name?: string | null
  subtype?: string | null
  status?: string | null
  customProperties?: Record<string, unknown> | null
}

interface AvailabilityRecord {
  _id: Id<"objects">
  status?: string | null
  customProperties?: Record<string, unknown> | null
}

interface ResourceAvailabilitySnapshot {
  schedules: AvailabilityRecord[]
  exceptions: AvailabilityRecord[]
  blocks: AvailabilityRecord[]
}

type BookableSubtype =
  | "room"
  | "staff"
  | "equipment"
  | "space"
  | "vehicle"
  | "accommodation"
  | "appointment"
  | "class"
  | "treatment"

interface NewResourceDraft {
  name: string
  subtype: BookableSubtype
  timezone: string
  slotDuration: number
  bufferTime: number
}

const DEFAULT_TIME_RANGE: TimeRange = { startTime: "09:00", endTime: "17:00" }

const DAYS_OF_WEEK: Array<{ key: DayKey; label: string; dayOfWeek: number }> = [
  { key: "sunday", label: "Sunday", dayOfWeek: 0 },
  { key: "monday", label: "Monday", dayOfWeek: 1 },
  { key: "tuesday", label: "Tuesday", dayOfWeek: 2 },
  { key: "wednesday", label: "Wednesday", dayOfWeek: 3 },
  { key: "thursday", label: "Thursday", dayOfWeek: 4 },
  { key: "friday", label: "Friday", dayOfWeek: 5 },
  { key: "saturday", label: "Saturday", dayOfWeek: 6 },
]

const COMMON_TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Berlin",
  "UTC",
]
const SLOT_DURATION_OPTIONS = [15, 30, 45, 60, 90, 120, 150, 180, 240, 300, 360, 480]

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {}
  }
  return value as Record<string, unknown>
}

function normalizePositiveInteger(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.round(value)
  }
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10)
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed
    }
  }
  return null
}

function normalizeNonNegativeInteger(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return Math.round(value)
  }
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10)
    if (Number.isFinite(parsed) && parsed >= 0) {
      return parsed
    }
  }
  return null
}

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null
  }
  const normalized = value.trim()
  return normalized.length > 0 ? normalized : null
}

function formatDateInput(value: unknown): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return ""
  }
  return new Date(value).toISOString().slice(0, 10)
}

function parseDateInput(value: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim())
  if (!match) {
    return null
  }

  const year = Number.parseInt(match[1], 10)
  const month = Number.parseInt(match[2], 10)
  const day = Number.parseInt(match[3], 10)
  return Date.UTC(year, month - 1, day)
}

function createTodayDateInput(): string {
  return new Date().toISOString().slice(0, 10)
}

function compareDateInputs(left: string, right: string): number {
  if (!left && !right) {
    return 0
  }
  if (!left) {
    return 1
  }
  if (!right) {
    return -1
  }
  return left.localeCompare(right)
}

function createWeeklySchedule(openDays: number[]): WeeklyScheduleState {
  const next = {} as WeeklyScheduleState

  for (const day of DAYS_OF_WEEK) {
    next[day.key] = {
      isOpen: openDays.includes(day.dayOfWeek),
      timeRanges: [{ ...DEFAULT_TIME_RANGE }],
    }
  }

  return next
}

function createEditorDefaultWeeklySchedule(): WeeklyScheduleState {
  return createWeeklySchedule([1, 2, 3, 4, 5])
}

function createClosedWeeklySchedule(): WeeklyScheduleState {
  return createWeeklySchedule([])
}

function createExceptionEditorState(clientId: string): ExceptionEditorState {
  return {
    clientId,
    exceptionId: null,
    date: createTodayDateInput(),
    mode: "custom_hours",
    startTime: DEFAULT_TIME_RANGE.startTime,
    endTime: DEFAULT_TIME_RANGE.endTime,
    reason: "",
  }
}

function createBlockEditorState(clientId: string): BlockEditorState {
  const today = createTodayDateInput()
  return {
    clientId,
    blockId: null,
    startDate: today,
    endDate: today,
    reason: "",
  }
}

function createNewResourceDraft(): NewResourceDraft {
  return {
    name: "",
    subtype: "space",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    slotDuration: 60,
    bufferTime: 0,
  }
}

function sortRanges(ranges: TimeRange[]): TimeRange[] {
  return [...ranges].sort((left, right) => left.startTime.localeCompare(right.startTime))
}

function sortExceptions(entries: ExceptionEditorState[]): ExceptionEditorState[] {
  return [...entries].sort((left, right) => compareDateInputs(left.date, right.date))
}

function sortBlocks(entries: BlockEditorState[]): BlockEditorState[] {
  return [...entries].sort((left, right) => {
    const startComparison = compareDateInputs(left.startDate, right.startDate)
    if (startComparison !== 0) {
      return startComparison
    }
    return compareDateInputs(left.endDate, right.endDate)
  })
}

function getDayLabel(dayKey: DayKey, tWithFallback: BookingTranslationFn): string {
  switch (dayKey) {
    case "sunday":
      return tWithFallback("ui.app.booking.days.sunday", "Sunday")
    case "monday":
      return tWithFallback("ui.app.booking.days.monday", "Monday")
    case "tuesday":
      return tWithFallback("ui.app.booking.days.tuesday", "Tuesday")
    case "wednesday":
      return tWithFallback("ui.app.booking.days.wednesday", "Wednesday")
    case "thursday":
      return tWithFallback("ui.app.booking.days.thursday", "Thursday")
    case "friday":
      return tWithFallback("ui.app.booking.days.friday", "Friday")
    case "saturday":
      return tWithFallback("ui.app.booking.days.saturday", "Saturday")
  }
}

function formatDurationLabel(minutes: number, tWithFallback: BookingTranslationFn): string {
  const minuteShort = tWithFallback(
    "ui.app.booking.availability.resource.duration.minute_short",
    "min"
  )

  if (minutes < 60) {
    return tWithFallback(
      "ui.app.booking.availability.resource.duration.option_minutes_only",
      "{minutes} {minuteShort}",
      { minutes, minuteShort }
    )
  }

  const hourShort = tWithFallback(
    "ui.app.booking.availability.resource.duration.hour_short",
    "h"
  )
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  const breakdown =
    remainder > 0 ? `${hours}${hourShort} ${remainder}${minuteShort}` : `${hours}${hourShort}`

  return tWithFallback(
    "ui.app.booking.availability.resource.duration.option_with_breakdown",
    "{minutes} {minuteShort} ({breakdown})",
    { minutes, minuteShort, breakdown }
  )
}

function formatCountLabel(args: {
  count: number
  singularKey: string
  singularFallback: string
  pluralKey: string
  pluralFallback: string
  tWithFallback: BookingTranslationFn
}): string {
  if (args.count === 1) {
    return args.tWithFallback(args.singularKey, args.singularFallback, { count: args.count })
  }
  return args.tWithFallback(args.pluralKey, args.pluralFallback, { count: args.count })
}

function getResourceSubtypeLabel(
  subtype: string | null | undefined,
  tWithFallback: BookingTranslationFn
): string | null {
  switch (subtype) {
    case "room":
      return tWithFallback("ui.app.booking.availability.resource.subtype.room", "Room")
    case "staff":
      return tWithFallback("ui.app.booking.availability.resource.subtype.staff", "Staff")
    case "equipment":
      return tWithFallback("ui.app.booking.availability.resource.subtype.equipment", "Equipment")
    case "space":
      return tWithFallback("ui.app.booking.availability.resource.subtype.space", "Space")
    case "vehicle":
      return tWithFallback("ui.app.booking.availability.resource.subtype.vehicle", "Vehicle")
    case "accommodation":
      return tWithFallback("ui.app.booking.availability.resource.subtype.accommodation", "Accommodation")
    case "appointment":
      return tWithFallback("ui.app.booking.availability.resource.subtype.appointment", "Appointment")
    case "class":
      return tWithFallback("ui.app.booking.availability.resource.subtype.class", "Class")
    case "treatment":
      return tWithFallback("ui.app.booking.availability.resource.subtype.treatment", "Treatment")
    default:
      return normalizeOptionalString(subtype)?.replace(/_/g, " ") || null
  }
}

function getResourceStatusLabel(
  status: string | null | undefined,
  tWithFallback: BookingTranslationFn
): string {
  switch (status) {
    case "active":
      return tWithFallback("ui.app.booking.availability.resource.status.active", "Active")
    case "inactive":
      return tWithFallback("ui.app.booking.availability.resource.status.inactive", "Inactive")
    case "archived":
      return tWithFallback("ui.app.booking.availability.resource.status.archived", "Archived")
    default:
      return tWithFallback("ui.app.booking.availability.resource.status.draft", "Draft")
  }
}

function getAvailabilityStructureLabel(
  structureKey: string,
  fallbackLabel: string,
  tWithFallback: BookingTranslationFn
): string {
  switch (structureKey) {
    case "resource_time_slot":
      return tWithFallback(
        "ui.app.booking.availability.resource.structure.resource_time_slot",
        fallbackLabel
      )
    case "one_on_one_meeting":
      return tWithFallback(
        "ui.app.booking.availability.resource.structure.one_on_one_meeting",
        fallbackLabel
      )
    case "course_session":
      return tWithFallback(
        "ui.app.booking.availability.resource.structure.course_session",
        fallbackLabel
      )
    case "event_session_seating":
      return tWithFallback(
        "ui.app.booking.availability.resource.structure.event_session_seating",
        fallbackLabel
      )
    case "hotel_room":
      return tWithFallback(
        "ui.app.booking.availability.resource.structure.hotel_room",
        fallbackLabel
      )
    case "house_rental":
      return tWithFallback(
        "ui.app.booking.availability.resource.structure.house_rental",
        fallbackLabel
      )
    case "boat_seat_departure":
      return tWithFallback(
        "ui.app.booking.availability.resource.structure.boat_seat_departure",
        fallbackLabel
      )
    case "boat_charter":
      return tWithFallback(
        "ui.app.booking.availability.resource.structure.boat_charter",
        fallbackLabel
      )
    case "fleet_departure":
      return tWithFallback(
        "ui.app.booking.availability.resource.structure.fleet_departure",
        fallbackLabel
      )
    default:
      return fallbackLabel
  }
}

function buildSlotDurationOptions(currentDuration: number): number[] {
  return [...new Set([...SLOT_DURATION_OPTIONS, currentDuration])]
    .filter((duration) => Number.isFinite(duration) && duration > 0)
    .sort((left, right) => left - right)
}

function getTimezoneList(): string[] {
  try {
    const supported = Intl.supportedValuesOf("timeZone")
    const rest = supported.filter((timezone) => !COMMON_TIMEZONES.includes(timezone))
    return [...COMMON_TIMEZONES, ...rest]
  } catch {
    return COMMON_TIMEZONES
  }
}

function resolveTimingSettings(resource: ProductRecord) {
  const resourceProps = asRecord(resource.customProperties)
  const bookableConfig = asRecord(resourceProps.bookableConfig)

  return {
    slotDuration:
      normalizePositiveInteger(resourceProps.minDuration)
      || normalizePositiveInteger(bookableConfig.minDuration)
      || 60,
    bufferTime:
      normalizeNonNegativeInteger(resourceProps.bufferAfter)
      || normalizeNonNegativeInteger(bookableConfig.bufferAfter)
      || 0,
    timezone:
      normalizeOptionalString(resourceProps.timezone)
      || normalizeOptionalString(bookableConfig.timezone)
      || Intl.DateTimeFormat().resolvedOptions().timeZone
      || "UTC",
  }
}

function buildHydratedSchedule(snapshot: ResourceAvailabilitySnapshot): {
  schedule: WeeklyScheduleState
  timezone: string | null
} {
  const nextSchedule = createClosedWeeklySchedule()
  let timezone: string | null = null

  for (const scheduleRecord of snapshot.schedules) {
    if (scheduleRecord.status && scheduleRecord.status !== "active") {
      continue
    }

    const props = asRecord(scheduleRecord.customProperties)
    const dayOfWeek = normalizeNonNegativeInteger(props.dayOfWeek)
    const day = DAYS_OF_WEEK.find((entry) => entry.dayOfWeek === dayOfWeek)
    if (!day) {
      continue
    }

    const scheduleTimezone = normalizeOptionalString(props.timezone)
    if (scheduleTimezone) {
      timezone = scheduleTimezone
    }

    if (props.isAvailable === false) {
      nextSchedule[day.key] = {
        ...nextSchedule[day.key],
        isOpen: false,
        timeRanges: [{ ...DEFAULT_TIME_RANGE }],
      }
      continue
    }

    const startTime = normalizeOptionalString(props.startTime)
    const endTime = normalizeOptionalString(props.endTime)
    if (!startTime || !endTime) {
      continue
    }

    if (!nextSchedule[day.key].isOpen) {
      nextSchedule[day.key] = {
        isOpen: true,
        timeRanges: [],
      }
    }

    nextSchedule[day.key].timeRanges.push({ startTime, endTime })
  }

  for (const day of DAYS_OF_WEEK) {
    const ranges = nextSchedule[day.key].timeRanges
    nextSchedule[day.key] = {
      isOpen: nextSchedule[day.key].isOpen && ranges.length > 0,
      timeRanges: ranges.length > 0 ? sortRanges(ranges) : [{ ...DEFAULT_TIME_RANGE }],
    }
  }

  return { schedule: nextSchedule, timezone }
}

function buildHydratedExceptions(
  snapshot: ResourceAvailabilitySnapshot,
  createClientId: () => string
): ExceptionEditorState[] {
  const next: ExceptionEditorState[] = []

  for (const record of snapshot.exceptions) {
    if (record.status && record.status !== "active") {
      continue
    }

    const props = asRecord(record.customProperties)
    const date = formatDateInput(props.date)
    if (!date) {
      continue
    }

    const customHours = asRecord(props.customHours)
    const startTime = normalizeOptionalString(customHours.startTime) || DEFAULT_TIME_RANGE.startTime
    const endTime = normalizeOptionalString(customHours.endTime) || DEFAULT_TIME_RANGE.endTime

    next.push({
      clientId: createClientId(),
      exceptionId: record._id,
      date,
      mode: props.isAvailable === false ? "closed" : "custom_hours",
      startTime,
      endTime,
      reason: normalizeOptionalString(props.reason) || "",
    })
  }

  return sortExceptions(next)
}

function buildHydratedBlocks(
  snapshot: ResourceAvailabilitySnapshot,
  createClientId: () => string
): BlockEditorState[] {
  const next: BlockEditorState[] = []

  for (const record of snapshot.blocks) {
    if (record.status && record.status !== "active") {
      continue
    }

    const props = asRecord(record.customProperties)
    const startDate = formatDateInput(props.startDate)
    const endDate = formatDateInput(props.endDate)
    if (!startDate || !endDate) {
      continue
    }

    next.push({
      clientId: createClientId(),
      blockId: record._id,
      startDate,
      endDate,
      reason: normalizeOptionalString(props.reason) || "",
    })
  }

  return sortBlocks(next)
}

function validateScheduleState(
  schedule: WeeklyScheduleState,
  tWithFallback: BookingTranslationFn,
  getDayLabelForKey: (dayKey: DayKey) => string
): string | null {
  for (const day of DAYS_OF_WEEK) {
    const dayState = schedule[day.key]
    if (!dayState.isOpen) {
      continue
    }

    if (dayState.timeRanges.length === 0) {
      return tWithFallback(
        "ui.app.booking.availability.resource.schedule.validation.range_required",
        "{day} needs at least one time range.",
        { day: getDayLabelForKey(day.key) }
      )
    }

    const sorted = sortRanges(dayState.timeRanges)
    for (let index = 0; index < sorted.length; index += 1) {
      const range = sorted[index]
      if (range.startTime >= range.endTime) {
        return tWithFallback(
          "ui.app.booking.availability.resource.schedule.validation.invalid_range",
          "{day} has an invalid time range.",
          { day: getDayLabelForKey(day.key) }
        )
      }
      if (index > 0 && range.startTime < sorted[index - 1].endTime) {
        return tWithFallback(
          "ui.app.booking.availability.resource.schedule.validation.overlap",
          "{day} has overlapping time ranges.",
          { day: getDayLabelForKey(day.key) }
        )
      }
    }
  }

  return null
}

function serializeSchedule(schedule: WeeklyScheduleState) {
  return DAYS_OF_WEEK.flatMap((day) => {
    const dayState = schedule[day.key]
    if (!dayState.isOpen) {
      return []
    }

    return sortRanges(dayState.timeRanges).map((range) => ({
      dayOfWeek: day.dayOfWeek,
      startTime: range.startTime,
      endTime: range.endTime,
      isAvailable: true,
    }))
  })
}

function countConfiguredWindows(schedule: WeeklyScheduleState): number {
  return DAYS_OF_WEEK.reduce((total, day) => {
    const dayState = schedule[day.key]
    return total + (dayState.isOpen ? dayState.timeRanges.length : 0)
  }, 0)
}

export function ResourceAvailability({
  selectedResourceId,
  onSelectResource,
}: ResourceAvailabilityProps) {
  const { sessionId } = useAuth()
  const currentOrganization = useCurrentOrganization()
  const notification = useNotification()
  const { tWithFallback } = useNamespaceTranslations("ui.app.booking")
  const timezoneList = getTimezoneList()

  const resources = (useQuery as any)(
    (api as any).availabilityOntology.listAvailabilityResources,
    sessionId && currentOrganization?.id
      ? {
          sessionId,
          organizationId: currentOrganization.id as Id<"organizations">,
        }
      : "skip"
  ) as ProductRecord[] | undefined

  const createProductMutation = useMutation((api as any).productOntology.createProduct)
  const [isCreatingResource, setIsCreatingResource] = useState(false)
  const [isCreatingResourcePending, setIsCreatingResourcePending] = useState(false)
  const [newResource, setNewResource] = useState<NewResourceDraft>(() => createNewResourceDraft())
  const newResourceSlotDurationOptions = buildSlotDurationOptions(newResource.slotDuration)

  const handleCreateResource = async () => {
    if (!sessionId || !currentOrganization?.id) {
      return
    }

    const trimmedName = newResource.name.trim()
    if (!trimmedName) {
      notification.error(
        tWithFallback("ui.app.booking.notifications.error_title", "Error"),
        tWithFallback(
          "ui.app.booking.availability.resource.create.validation.name_required",
          "Enter a resource name before creating it."
        )
      )
      return
    }

    setIsCreatingResourcePending(true)
    try {
      const bookableConfig = buildBookableConfigForSubtype(newResource.subtype, {
        minDuration: newResource.slotDuration,
        slotIncrement: newResource.slotDuration,
        bufferAfter: newResource.bufferTime,
      })
      const customProperties = {
        ...buildBookableShadowProperties(bookableConfig),
        timezone: newResource.timezone,
        minDuration: newResource.slotDuration,
        slotIncrement: newResource.slotDuration,
        bufferAfter: newResource.bufferTime,
        bookableConfig: {
          ...bookableConfig,
          timezone: newResource.timezone,
          minDuration: newResource.slotDuration,
          slotIncrement: newResource.slotDuration,
          bufferAfter: newResource.bufferTime,
        },
      }

      const productId = await createProductMutation({
        sessionId,
        organizationId: currentOrganization.id as Id<"organizations">,
        subtype: newResource.subtype,
        name: trimmedName,
        price: 0,
        currency: "EUR",
        customProperties,
      })

      setNewResource(createNewResourceDraft())
      setIsCreatingResource(false)
      onSelectResource(productId)
      notification.success(
        tWithFallback("ui.app.booking.notifications.success_title", "Success"),
        tWithFallback(
          "ui.app.booking.availability.resource.create.notifications.created",
          "Resource created. You can configure its availability inline."
        )
      )
    } catch (error) {
      notification.error(
        tWithFallback("ui.app.booking.notifications.error_title", "Error"),
        error instanceof Error
          ? error.message
          : tWithFallback(
              "ui.app.booking.availability.resource.create.notifications.failed",
              "Failed to create the resource."
            )
      )
    } finally {
      setIsCreatingResourcePending(false)
    }
  }

  if (!sessionId || !currentOrganization?.id) {
    return (
      <div className="p-4 text-center" style={{ color: "var(--window-document-text)" }}>
        <p className="font-pixel text-sm">
          {tWithFallback("ui.app.booking.auth.login_required_title", "Please log in")}
        </p>
        <p className="mt-2 text-xs opacity-70">
          {tWithFallback(
            "ui.app.booking.availability.resource.login_required_hint",
            "Login required to manage resource availability."
          )}
        </p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col" style={{ background: "var(--window-document-bg)" }}>
      <div
        className="border-b px-4 py-3"
        style={{ borderColor: "var(--window-document-border)" }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2
              className="font-pixel text-base"
              style={{ color: "var(--window-document-text)" }}
            >
              {tWithFallback("ui.app.booking.availability.title", "Availability")}
            </h2>
            <p
              className="mt-0.5 text-xs"
              style={{ color: "var(--window-document-text)", opacity: 0.65 }}
            >
              {tWithFallback(
                "ui.app.booking.availability.resource.subtitle",
                "Create and manage booking availability directly on each resource."
              )}
            </p>
          </div>
          <button
            type="button"
            className="desktop-interior-button flex items-center gap-1 text-xs"
            onClick={() => {
              setIsCreatingResource((current) => !current)
              if (isCreatingResource) {
                setNewResource(createNewResourceDraft())
              }
            }}
          >
            <Plus size={12} />
            {isCreatingResource
              ? tWithFallback("ui.app.booking.actions.cancel", "Cancel")
              : tWithFallback(
                  "ui.app.booking.availability.resource.create.actions.new_resource",
                  "Create resource"
                )}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {isCreatingResource ? (
          <div
            className="mb-4 rounded-xl border p-4"
            style={{
              borderColor: "var(--window-document-border)",
              background: "var(--desktop-shell-accent)",
            }}
          >
            <div className="grid gap-3 lg:grid-cols-2">
              <label className="block text-xs font-medium">
                {tWithFallback(
                  "ui.app.booking.availability.resource.create.fields.name",
                  "Resource name"
                )}
                <input
                  type="text"
                  value={newResource.name}
                  onChange={(event) =>
                    setNewResource((current) => ({ ...current, name: event.target.value }))
                  }
                  className="mt-1 w-full rounded-md border px-2 py-1.5 text-sm"
                  style={{
                    borderColor: "var(--window-document-border)",
                    background: "var(--window-document-bg)",
                    color: "var(--window-document-text)",
                  }}
                  placeholder={tWithFallback(
                    "ui.app.booking.availability.resource.create.fields.name_placeholder",
                    "Private room, Dr. Rivera, Event hall..."
                  )}
                />
              </label>

              <label className="block text-xs font-medium">
                {tWithFallback(
                  "ui.app.booking.availability.resource.create.fields.type",
                  "Resource type"
                )}
                <select
                  value={newResource.subtype}
                  onChange={(event) =>
                    setNewResource((current) => ({
                      ...current,
                      subtype: event.target.value as BookableSubtype,
                    }))
                  }
                  className="mt-1 w-full rounded-md border px-2 py-1.5 text-sm"
                  style={{
                    borderColor: "var(--window-document-border)",
                    background: "var(--window-document-bg)",
                    color: "var(--window-document-text)",
                  }}
                >
                  {AVAILABILITY_RESOURCE_SUBTYPES.map((subtype) => (
                    <option key={subtype} value={subtype}>
                      {getResourceSubtypeLabel(subtype, tWithFallback) || subtype}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-xs font-medium">
                {tWithFallback(
                  "ui.app.booking.availability.resource.settings.slot_duration",
                  "Slot duration"
                )}
                <select
                  value={newResource.slotDuration}
                  onChange={(event) => {
                    const nextDuration = Number.parseInt(event.target.value || "0", 10)
                    setNewResource((current) => ({
                      ...current,
                      slotDuration:
                        Number.isFinite(nextDuration) && nextDuration > 0 ? nextDuration : 60,
                    }))
                  }}
                  className="mt-1 w-full rounded-md border px-2 py-1.5 text-sm"
                  style={{
                    borderColor: "var(--window-document-border)",
                    background: "var(--window-document-bg)",
                    color: "var(--window-document-text)",
                  }}
                >
                  {newResourceSlotDurationOptions.map((durationOption) => (
                    <option key={durationOption} value={durationOption}>
                      {formatDurationLabel(durationOption, tWithFallback)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-xs font-medium">
                {tWithFallback(
                  "ui.app.booking.availability.resource.settings.buffer_after",
                  "Buffer after booking"
                )}
                <input
                  type="number"
                  min={0}
                  step={5}
                  value={newResource.bufferTime}
                  onChange={(event) =>
                    setNewResource((current) => ({
                      ...current,
                      bufferTime: Math.max(
                        0,
                        Number.parseInt(event.target.value || "0", 10) || 0
                      ),
                    }))
                  }
                  className="mt-1 w-full rounded-md border px-2 py-1.5 text-sm"
                  style={{
                    borderColor: "var(--window-document-border)",
                    background: "var(--window-document-bg)",
                    color: "var(--window-document-text)",
                  }}
                />
              </label>

              <label className="block text-xs font-medium lg:col-span-2">
                {tWithFallback("ui.app.booking.availability.editor.timezone", "Timezone")}
                <select
                  value={newResource.timezone}
                  onChange={(event) =>
                    setNewResource((current) => ({ ...current, timezone: event.target.value }))
                  }
                  className="mt-1 w-full rounded-md border px-2 py-1.5 text-sm"
                  style={{
                    borderColor: "var(--window-document-border)",
                    background: "var(--window-document-bg)",
                    color: "var(--window-document-text)",
                  }}
                >
                  {timezoneList.map((timezoneOption) => (
                    <option key={timezoneOption} value={timezoneOption}>
                      {timezoneOption}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="desktop-interior-button text-xs"
                onClick={() => {
                  setIsCreatingResource(false)
                  setNewResource(createNewResourceDraft())
                }}
                disabled={isCreatingResourcePending}
              >
                {tWithFallback("ui.app.booking.actions.cancel", "Cancel")}
              </button>
              <button
                type="button"
                className="desktop-interior-button desktop-interior-button-primary flex items-center gap-1 text-xs"
                onClick={handleCreateResource}
                disabled={isCreatingResourcePending}
              >
                <Plus size={12} />
                {isCreatingResourcePending
                  ? tWithFallback("ui.app.booking.actions.saving", "Saving...")
                  : tWithFallback(
                      "ui.app.booking.availability.resource.create.actions.create_resource",
                      "Create resource"
                    )}
              </button>
            </div>
          </div>
        ) : null}

        {resources === undefined ? (
          <div className="flex items-center justify-center py-12">
            <p
              className="font-pixel text-xs"
              style={{ color: "var(--window-document-text)", opacity: 0.5 }}
            >
              {tWithFallback(
                "ui.app.booking.availability.resource.loading_resources",
                "Loading resources..."
              )}
            </p>
          </div>
        ) : resources.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16">
            <Clock size={48} style={{ color: "var(--window-document-text)", opacity: 0.3 }} />
            <p
              className="font-pixel text-sm"
              style={{ color: "var(--window-document-text)" }}
            >
              {tWithFallback(
                "ui.app.booking.availability.resource.empty_title",
                "No bookable resources found"
              )}
            </p>
            <p
              className="max-w-xs text-center text-xs"
              style={{ color: "var(--window-document-text)", opacity: 0.6 }}
            >
              {tWithFallback(
                "ui.app.booking.availability.resource.empty_hint",
                "Create a bookable resource here, then configure its availability inline."
              )}
            </p>
            <button
              type="button"
              className="desktop-interior-button flex items-center gap-1 text-xs"
              onClick={() => setIsCreatingResource(true)}
            >
              <Plus size={12} />
              {tWithFallback(
                "ui.app.booking.availability.resource.create.actions.create_resource",
                "Create resource"
              )}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {resources.map((resource) => (
              <ResourceCard
                key={resource._id}
                resource={resource}
                isExpanded={selectedResourceId === resource._id}
                onToggle={() =>
                  onSelectResource(selectedResourceId === resource._id ? null : resource._id)
                }
                sessionId={sessionId}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

interface ResourceCardProps {
  resource: ProductRecord
  isExpanded: boolean
  onToggle: () => void
  sessionId: string
}

function ResourceCard({
  resource,
  isExpanded,
  onToggle,
  sessionId,
}: ResourceCardProps) {
  const notification = useNotification()
  const { tWithFallback } = useNamespaceTranslations("ui.app.booking")
  const timezoneList = getTimezoneList()
  const clientIdRef = useRef(0)

  const createClientId = () => {
    clientIdRef.current += 1
    return `${resource._id}-${clientIdRef.current}`
  }

  const [schedule, setSchedule] = useState<WeeklyScheduleState>(() =>
    createClosedWeeklySchedule()
  )
  const [resourceName, setResourceName] = useState(resource.name || "")
  const [slotDuration, setSlotDuration] = useState(() => resolveTimingSettings(resource).slotDuration)
  const [bufferTime, setBufferTime] = useState(() => resolveTimingSettings(resource).bufferTime)
  const [timezone, setTimezone] = useState(() => resolveTimingSettings(resource).timezone)
  const [exceptions, setExceptions] = useState<ExceptionEditorState[]>([])
  const [blocks, setBlocks] = useState<BlockEditorState[]>([])
  const [pendingRowKeys, setPendingRowKeys] = useState<string[]>([])
  const [isDirty, setIsDirty] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const existingAvailability = (useQuery as any)(
    (api as any).availabilityOntology.getResourceAvailability,
    sessionId ? { sessionId, resourceId: resource._id } : "skip"
  ) as ResourceAvailabilitySnapshot | undefined

  const setWeeklyScheduleMutation = useMutation((api as any).availabilityOntology.setWeeklySchedule)
  const updateProductMutation = useMutation((api as any).productOntology.updateProduct)
  const createExceptionMutation = useMutation((api as any).availabilityOntology.createException)
  const updateExceptionMutation = useMutation((api as any).availabilityOntology.updateException)
  const deleteExceptionMutation = useMutation((api as any).availabilityOntology.deleteException)
  const createBlockMutation = useMutation((api as any).availabilityOntology.createBlock)
  const updateBlockMutation = useMutation((api as any).availabilityOntology.updateBlock)
  const deleteBlockMutation = useMutation((api as any).availabilityOntology.deleteBlock)
  const archiveProductMutation = useMutation((api as any).productOntology.archiveProduct)

  const resourceProps = asRecord(resource.customProperties)
  const bookableConfig = asRecord(resourceProps.bookableConfig)
  const structureDefinition = getAvailabilityStructureDefinition(
    resolveAvailabilityStructure(resourceProps, bookableConfig)
  )
  const localizedStructureLabel = getAvailabilityStructureLabel(
    structureDefinition.key,
    structureDefinition.label,
    tWithFallback
  )
  const localizedSubtypeLabel = getResourceSubtypeLabel(resource.subtype, tWithFallback)
  const localizedStatusLabel = getResourceStatusLabel(resource.status, tWithFallback)
  const getLocalizedDayLabel = (dayKey: DayKey) => getDayLabel(dayKey, tWithFallback)
  const formatDuration = (minutes: number) => formatDurationLabel(minutes, tWithFallback)
  const slotDurationOptions = buildSlotDurationOptions(slotDuration)
  const fieldStyle = {
    borderColor: "var(--window-document-border)",
    background: "var(--window-document-bg)",
    color: "var(--window-document-text)",
  } as const
  const configuredWindowCount =
    existingAvailability === undefined ? null : countConfiguredWindows(schedule)
  const overrideCount = exceptions.length
  const blackoutCount = blocks.length
  const weeklyWindowSummary =
    configuredWindowCount === null
      ? tWithFallback(
          "ui.app.booking.availability.resource.summary.loading_schedule",
          "Loading schedule..."
        )
      : formatCountLabel({
          count: configuredWindowCount,
          singularKey: "ui.app.booking.availability.resource.summary.weekly_window_singular",
          singularFallback: "{count} weekly window",
          pluralKey: "ui.app.booking.availability.resource.summary.weekly_window_plural",
          pluralFallback: "{count} weekly windows",
          tWithFallback,
        })
  const overrideSummary = formatCountLabel({
    count: overrideCount,
    singularKey: "ui.app.booking.availability.resource.summary.override_singular",
    singularFallback: "{count} override",
    pluralKey: "ui.app.booking.availability.resource.summary.override_plural",
    pluralFallback: "{count} overrides",
    tWithFallback,
  })
  const blackoutSummary = formatCountLabel({
    count: blackoutCount,
    singularKey: "ui.app.booking.availability.resource.summary.blackout_singular",
    singularFallback: "{count} blackout window",
    pluralKey: "ui.app.booking.availability.resource.summary.blackout_plural",
    pluralFallback: "{count} blackout windows",
    tWithFallback,
  })

  const setRowPending = (key: string, isPending: boolean) => {
    setPendingRowKeys((current) => {
      if (isPending) {
        return current.includes(key) ? current : [...current, key]
      }
      return current.filter((entry) => entry !== key)
    })
  }

  const isRowPending = (key: string) => pendingRowKeys.includes(key)

  useEffect(() => {
    const timingSettings = resolveTimingSettings(resource)
    clientIdRef.current = 0
    setSchedule(createClosedWeeklySchedule())
    setResourceName(resource.name || "")
    setSlotDuration(timingSettings.slotDuration)
    setBufferTime(timingSettings.bufferTime)
    setTimezone(timingSettings.timezone)
    setExceptions([])
    setBlocks([])
    setPendingRowKeys([])
    setIsDirty(false)
  }, [resource])

  useEffect(() => {
    if (!existingAvailability) {
      return
    }

    const hasAvailabilityRecords =
      existingAvailability.schedules.length > 0
      || existingAvailability.exceptions.length > 0
      || existingAvailability.blocks.length > 0
    if (!hasAvailabilityRecords) {
      setSchedule(createEditorDefaultWeeklySchedule())
      setExceptions([])
      setBlocks([])
      setIsDirty(false)
      return
    }

    const hydrated = buildHydratedSchedule(existingAvailability)
    setSchedule(hydrated.schedule)
    if (hydrated.timezone) {
      setTimezone(hydrated.timezone)
    }
    setExceptions(buildHydratedExceptions(existingAvailability, createClientId))
    setBlocks(buildHydratedBlocks(existingAvailability, createClientId))
    setIsDirty(false)
  }, [existingAvailability])

  const updateDayOpen = (dayKey: DayKey, nextValue: boolean) => {
    setSchedule((current) => ({
      ...current,
      [dayKey]: {
        ...current[dayKey],
        isOpen: nextValue,
        timeRanges:
          current[dayKey].timeRanges.length > 0
            ? current[dayKey].timeRanges
            : [{ ...DEFAULT_TIME_RANGE }],
      },
    }))
    setIsDirty(true)
  }

  const updateTimeRange = (
    dayKey: DayKey,
    rangeIndex: number,
    field: keyof TimeRange,
    value: string
  ) => {
    setSchedule((current) => ({
      ...current,
      [dayKey]: {
        ...current[dayKey],
        timeRanges: current[dayKey].timeRanges.map((range, index) =>
          index === rangeIndex ? { ...range, [field]: value } : range
        ),
      },
    }))
    setIsDirty(true)
  }

  const addTimeRange = (dayKey: DayKey) => {
    setSchedule((current) => ({
      ...current,
      [dayKey]: {
        ...current[dayKey],
        isOpen: true,
        timeRanges: [
          ...current[dayKey].timeRanges,
          { ...DEFAULT_TIME_RANGE },
        ],
      },
    }))
    setIsDirty(true)
  }

  const removeTimeRange = (dayKey: DayKey, rangeIndex: number) => {
    setSchedule((current) => {
      const nextRanges = current[dayKey].timeRanges.filter((_, index) => index !== rangeIndex)
      return {
        ...current,
        [dayKey]: {
          ...current[dayKey],
          timeRanges: nextRanges.length > 0 ? nextRanges : [{ ...DEFAULT_TIME_RANGE }],
        },
      }
    })
    setIsDirty(true)
  }

  const updateExceptionField = (
    clientId: string,
    field: keyof Omit<ExceptionEditorState, "clientId" | "exceptionId">,
    value: string
  ) => {
    setExceptions((current) =>
      current.map((entry) =>
        entry.clientId === clientId ? { ...entry, [field]: value } : entry
      )
    )
  }

  const updateBlockField = (
    clientId: string,
    field: keyof Omit<BlockEditorState, "clientId" | "blockId">,
    value: string
  ) => {
    setBlocks((current) =>
      current.map((entry) =>
        entry.clientId === clientId ? { ...entry, [field]: value } : entry
      )
    )
  }

  const addException = () => {
    setExceptions((current) => sortExceptions([...current, createExceptionEditorState(createClientId())]))
  }

  const addBlock = () => {
    setBlocks((current) => sortBlocks([...current, createBlockEditorState(createClientId())]))
  }

  const validateException = (entry: ExceptionEditorState): string | null => {
    if (!entry.date) {
      return tWithFallback(
        "ui.app.booking.availability.resource.override.validation.date_required",
        "Choose a date for the override."
      )
    }
    if (
      exceptions.some(
        (candidate) => candidate.clientId !== entry.clientId && candidate.date === entry.date
      )
    ) {
      return tWithFallback(
        "ui.app.booking.availability.resource.override.validation.unique_date",
        "Each date can only have one override."
      )
    }
    if (entry.mode === "custom_hours" && entry.startTime >= entry.endTime) {
      return tWithFallback(
        "ui.app.booking.availability.resource.override.validation.invalid_range",
        "Override end time must be after start time."
      )
    }
    return null
  }

  const validateBlock = (entry: BlockEditorState): string | null => {
    if (!entry.startDate || !entry.endDate) {
      return tWithFallback(
        "ui.app.booking.availability.resource.blackout.validation.dates_required",
        "Choose both the start and end date for the blackout window."
      )
    }
    if (entry.endDate < entry.startDate) {
      return tWithFallback(
        "ui.app.booking.availability.resource.blackout.validation.invalid_range",
        "Blackout end date must be on or after the start date."
      )
    }
    return null
  }

  const handleSaveException = async (clientId: string) => {
    const entry = exceptions.find((candidate) => candidate.clientId === clientId)
    if (!entry) {
      return
    }

    const validationError = validateException(entry)
    if (validationError) {
      notification.error(
        tWithFallback(
          "ui.app.booking.availability.resource.override.notifications.invalid_title",
          "Invalid override"
        ),
        validationError
      )
      return
    }

    const date = parseDateInput(entry.date)
    if (date === null) {
      notification.error(
        tWithFallback(
          "ui.app.booking.availability.resource.override.notifications.invalid_title",
          "Invalid override"
        ),
        tWithFallback(
          "ui.app.booking.availability.resource.override.validation.valid_date",
          "Choose a valid override date."
        )
      )
      return
    }

    const pendingKey = `exception:${clientId}`
    const trimmedReason = entry.reason.trim()
    setRowPending(pendingKey, true)

    try {
      const customHours =
        entry.mode === "custom_hours"
          ? {
              startTime: entry.startTime,
              endTime: entry.endTime,
            }
          : undefined

      const result = entry.exceptionId
        ? await updateExceptionMutation({
            sessionId,
            exceptionId: entry.exceptionId,
            date,
            isAvailable: entry.mode === "custom_hours",
            ...(customHours ? { customHours } : {}),
            reason: trimmedReason,
          })
        : await createExceptionMutation({
            sessionId,
            resourceId: resource._id,
            date,
            isAvailable: entry.mode === "custom_hours",
            ...(customHours ? { customHours } : {}),
            ...(trimmedReason ? { reason: trimmedReason } : {}),
          })

      const exceptionId = entry.exceptionId || result?.exceptionId || null
      setExceptions((current) =>
        sortExceptions(
          current.map((candidate) =>
            candidate.clientId === clientId
              ? {
                  ...candidate,
                  exceptionId,
                  reason: trimmedReason,
                }
              : candidate
          )
        )
      )

      notification.success(
        entry.exceptionId
          ? tWithFallback(
              "ui.app.booking.availability.resource.override.notifications.updated_title",
              "Override updated"
            )
          : tWithFallback(
              "ui.app.booking.availability.resource.override.notifications.created_title",
              "Override created"
            ),
        entry.mode === "closed"
          ? tWithFallback(
              "ui.app.booking.availability.resource.override.notifications.closed_body",
              "The resource is unavailable for that date."
            )
          : tWithFallback(
              "ui.app.booking.availability.resource.override.notifications.hours_saved_body",
              "The date-specific hours have been saved."
            )
      )
    } catch (error) {
      notification.error(
        tWithFallback(
          "ui.app.booking.availability.resource.override.notifications.save_failed_title",
          "Override save failed"
        ),
        error instanceof Error
          ? error.message
          : tWithFallback(
              "ui.app.booking.availability.resource.override.notifications.save_failed_body",
              "Failed to save the date override."
            )
      )
    } finally {
      setRowPending(pendingKey, false)
    }
  }

  const handleDeleteException = async (clientId: string) => {
    const entry = exceptions.find((candidate) => candidate.clientId === clientId)
    if (!entry) {
      return
    }

    if (!entry.exceptionId) {
      setExceptions((current) => current.filter((candidate) => candidate.clientId !== clientId))
      return
    }

    const pendingKey = `exception:${clientId}`
    setRowPending(pendingKey, true)

    try {
      await deleteExceptionMutation({
        sessionId,
        exceptionId: entry.exceptionId,
      })
      setExceptions((current) => current.filter((candidate) => candidate.clientId !== clientId))
      notification.success(
        tWithFallback(
          "ui.app.booking.availability.resource.override.notifications.deleted_title",
          "Override removed"
        ),
        tWithFallback(
          "ui.app.booking.availability.resource.override.notifications.deleted_body",
          "The date-specific override has been deleted."
        )
      )
    } catch (error) {
      notification.error(
        tWithFallback(
          "ui.app.booking.availability.resource.override.notifications.delete_failed_title",
          "Override delete failed"
        ),
        error instanceof Error
          ? error.message
          : tWithFallback(
              "ui.app.booking.availability.resource.override.notifications.delete_failed_body",
              "Failed to delete the date override."
            )
      )
    } finally {
      setRowPending(pendingKey, false)
    }
  }

  const handleSaveBlock = async (clientId: string) => {
    const entry = blocks.find((candidate) => candidate.clientId === clientId)
    if (!entry) {
      return
    }

    const validationError = validateBlock(entry)
    if (validationError) {
      notification.error(
        tWithFallback(
          "ui.app.booking.availability.resource.blackout.notifications.invalid_title",
          "Invalid blackout window"
        ),
        validationError
      )
      return
    }

    const startDate = parseDateInput(entry.startDate)
    const endDate = parseDateInput(entry.endDate)
    if (startDate === null || endDate === null) {
      notification.error(
        tWithFallback(
          "ui.app.booking.availability.resource.blackout.notifications.invalid_title",
          "Invalid blackout window"
        ),
        tWithFallback(
          "ui.app.booking.availability.resource.blackout.validation.valid_dates",
          "Choose valid blackout dates."
        )
      )
      return
    }

    const pendingKey = `block:${clientId}`
    const reason =
      entry.reason.trim()
      || tWithFallback("ui.app.booking.availability.editor.unavailable", "Unavailable")
    setRowPending(pendingKey, true)

    try {
      const result = entry.blockId
        ? await updateBlockMutation({
            sessionId,
            blockId: entry.blockId,
            startDate,
            endDate,
            reason,
          })
        : await createBlockMutation({
            sessionId,
            resourceId: resource._id,
            startDate,
            endDate,
            reason,
          })

      const blockId = entry.blockId || result?.blockId || null
      setBlocks((current) =>
        sortBlocks(
          current.map((candidate) =>
            candidate.clientId === clientId
              ? {
                  ...candidate,
                  blockId,
                  reason,
                }
              : candidate
          )
        )
      )

      notification.success(
        entry.blockId
          ? tWithFallback(
              "ui.app.booking.availability.resource.blackout.notifications.updated_title",
              "Blackout updated"
            )
          : tWithFallback(
              "ui.app.booking.availability.resource.blackout.notifications.created_title",
              "Blackout created"
            ),
        tWithFallback(
          "ui.app.booking.availability.resource.blackout.notifications.saved_body",
          "The blackout window has been saved."
        )
      )
    } catch (error) {
      notification.error(
        tWithFallback(
          "ui.app.booking.availability.resource.blackout.notifications.save_failed_title",
          "Blackout save failed"
        ),
        error instanceof Error
          ? error.message
          : tWithFallback(
              "ui.app.booking.availability.resource.blackout.notifications.save_failed_body",
              "Failed to save the blackout window."
            )
      )
    } finally {
      setRowPending(pendingKey, false)
    }
  }

  const handleDeleteBlock = async (clientId: string) => {
    const entry = blocks.find((candidate) => candidate.clientId === clientId)
    if (!entry) {
      return
    }

    if (!entry.blockId) {
      setBlocks((current) => current.filter((candidate) => candidate.clientId !== clientId))
      return
    }

    const pendingKey = `block:${clientId}`
    setRowPending(pendingKey, true)

    try {
      await deleteBlockMutation({
        sessionId,
        blockId: entry.blockId,
      })
      setBlocks((current) => current.filter((candidate) => candidate.clientId !== clientId))
      notification.success(
        tWithFallback(
          "ui.app.booking.availability.resource.blackout.notifications.deleted_title",
          "Blackout removed"
        ),
        tWithFallback(
          "ui.app.booking.availability.resource.blackout.notifications.deleted_body",
          "The blackout window has been deleted."
        )
      )
    } catch (error) {
      notification.error(
        tWithFallback(
          "ui.app.booking.availability.resource.blackout.notifications.delete_failed_title",
          "Blackout delete failed"
        ),
        error instanceof Error
          ? error.message
          : tWithFallback(
              "ui.app.booking.availability.resource.blackout.notifications.delete_failed_body",
              "Failed to delete the blackout window."
            )
      )
    } finally {
      setRowPending(pendingKey, false)
    }
  }

  const handleSave = async () => {
    const validationError = validateScheduleState(schedule, tWithFallback, getLocalizedDayLabel)
    if (validationError) {
      notification.error(
        tWithFallback(
          "ui.app.booking.availability.resource.schedule.notifications.invalid_title",
          "Invalid schedule"
        ),
        validationError
      )
      return
    }

    setIsSaving(true)
    try {
      const nextSchedules = serializeSchedule(schedule)
      await setWeeklyScheduleMutation({
        sessionId,
        resourceId: resource._id,
        schedules: nextSchedules,
        timezone,
      })

      const nextCustomProperties = {
        ...resourceProps,
        timezone,
        minDuration: slotDuration,
        slotIncrement: slotDuration,
        bufferAfter: bufferTime,
        bookableConfig: {
          ...bookableConfig,
          timezone,
          minDuration: slotDuration,
          slotIncrement: slotDuration,
          bufferAfter: bufferTime,
        },
      }

      await updateProductMutation({
        sessionId,
        productId: resource._id,
        ...(resourceName.trim() !== (resource.name || "")
          ? { name: resourceName.trim() }
          : {}),
        customProperties: nextCustomProperties,
      })

      setIsDirty(false)
      notification.success(
        tWithFallback(
          "ui.app.booking.availability.resource.schedule.notifications.saved_title",
          "Availability saved"
        ),
        tWithFallback(
          "ui.app.booking.availability.resource.schedule.notifications.saved_body",
          "The resource schedule has been updated."
        )
      )
    } catch (error) {
      notification.error(
        tWithFallback(
          "ui.app.booking.availability.resource.schedule.notifications.save_failed_title",
          "Save failed"
        ),
        error instanceof Error
          ? error.message
          : tWithFallback(
              "ui.app.booking.availability.resource.schedule.notifications.save_failed_body",
              "Failed to save resource availability."
            )
      )
    } finally {
      setIsSaving(false)
    }
  }

  const handleArchiveResource = async () => {
    if (!window.confirm(
      tWithFallback(
        "ui.app.booking.availability.resource.actions.archive_confirm",
        "Archive this resource? It will be removed from the availability list."
      )
    )) {
      return
    }

    try {
      await archiveProductMutation({
        sessionId,
        productId: resource._id,
      })
      notification.success(
        tWithFallback("ui.app.booking.notifications.success_title", "Success"),
        tWithFallback(
          "ui.app.booking.availability.resource.actions.archived",
          "Resource archived."
        )
      )
    } catch (error) {
      notification.error(
        tWithFallback("ui.app.booking.notifications.error_title", "Error"),
        error instanceof Error
          ? error.message
          : tWithFallback(
              "ui.app.booking.availability.resource.actions.archive_failed",
              "Failed to archive the resource."
            )
      )
    }
  }

  return (
    <div
      className="overflow-hidden rounded-xl border"
      style={{
        borderColor: "var(--window-document-border)",
        background: "var(--desktop-shell-accent)",
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
        style={{ color: "var(--window-document-text)" }}
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            <span className="truncate font-pixel text-sm">
              {resource.name
                || tWithFallback(
                  "ui.app.booking.availability.resource.untitled_resource",
                  "Untitled resource"
                )}
            </span>
            <span
              className="rounded px-1.5 py-0.5 text-xs"
              style={{
                background: "var(--desktop-menu-hover)",
                color: "var(--window-document-text)",
              }}
            >
              {localizedStructureLabel}
            </span>
            {resource.subtype ? (
              <span
                className="rounded px-1.5 py-0.5 text-xs"
                style={{
                  background: "var(--window-document-bg)",
                  color: "var(--window-document-text)",
                }}
              >
                {localizedSubtypeLabel}
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-xs opacity-65">
            {`${weeklyWindowSummary} | ${overrideSummary} | ${blackoutSummary}`}
          </p>
        </div>

        <span
          className="rounded px-2 py-0.5 text-xs"
          style={{
            background: resource.status === "active" ? "var(--success-bg)" : "var(--warning-bg)",
            color: "white",
          }}
        >
          {localizedStatusLabel}
        </span>
      </button>

      {isExpanded ? (
        <div
          className="border-t px-4 py-4"
          style={{ borderColor: "var(--window-document-border)" }}
        >
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div className="space-y-4">
              <div
                className="rounded-xl border"
                style={{
                  borderColor: "var(--window-document-border)",
                  background: "var(--window-document-bg)",
                }}
              >
                <div
                  className="border-b px-4 py-3"
                  style={{ borderColor: "var(--window-document-border)" }}
                >
                  <p className="font-pixel text-xs" style={{ color: "var(--window-document-text)" }}>
                    {tWithFallback(
                      "ui.app.booking.availability.resource.schedule.title",
                      "Weekly Windows"
                    )}
                  </p>
                  <p
                    className="mt-1 text-xs"
                    style={{ color: "var(--window-document-text)", opacity: 0.65 }}
                  >
                    {tWithFallback(
                      "ui.app.booking.availability.resource.schedule.subtitle",
                      "Recurring booking hours that apply unless a date override or blackout window takes precedence."
                    )}
                  </p>
                </div>
                {DAYS_OF_WEEK.map((day, dayIndex) => (
                  <div
                    key={day.key}
                    className={`p-3 ${dayIndex < DAYS_OF_WEEK.length - 1 ? "border-b" : ""}`}
                    style={{ borderColor: "var(--window-document-border)" }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <label className="flex min-w-[110px] items-center gap-2 pt-1">
                        <input
                          type="checkbox"
                          checked={schedule[day.key].isOpen}
                          onChange={(event) => updateDayOpen(day.key, event.target.checked)}
                        />
                        <span className="text-sm font-medium">{getLocalizedDayLabel(day.key)}</span>
                      </label>

                      <div className="min-w-0 flex-1 space-y-2">
                        {schedule[day.key].isOpen ? (
                          <>
                            {schedule[day.key].timeRanges.map((range, rangeIndex) => (
                              <div key={`${day.key}-${rangeIndex}`} className="flex flex-wrap items-center gap-2">
                                <input
                                  type="time"
                                  value={range.startTime}
                                  onChange={(event) =>
                                    updateTimeRange(day.key, rangeIndex, "startTime", event.target.value)
                                  }
                                  className="rounded-md border px-2 py-1 text-xs"
                                  style={fieldStyle}
                                />
                                <span className="text-xs opacity-60">
                                  {tWithFallback(
                                    "ui.app.booking.availability.resource.schedule.range_separator",
                                    "to"
                                  )}
                                </span>
                                <input
                                  type="time"
                                  value={range.endTime}
                                  onChange={(event) =>
                                    updateTimeRange(day.key, rangeIndex, "endTime", event.target.value)
                                  }
                                  className="rounded-md border px-2 py-1 text-xs"
                                  style={fieldStyle}
                                />
                                <button
                                  type="button"
                                  className="desktop-interior-button p-1.5"
                                  onClick={() => removeTimeRange(day.key, rangeIndex)}
                                  disabled={schedule[day.key].timeRanges.length === 1}
                                  title={tWithFallback(
                                    "ui.app.booking.availability.editor.remove_time_range",
                                    "Remove time range"
                                  )}
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            ))}

                            <button
                              type="button"
                              className="desktop-interior-button flex items-center gap-1 text-xs"
                              onClick={() => addTimeRange(day.key)}
                            >
                              <Plus size={12} />
                              {tWithFallback(
                                "ui.app.booking.availability.resource.schedule.add_window",
                                "Add window"
                              )}
                            </button>
                          </>
                        ) : (
                          <p className="pt-1 text-xs opacity-55">
                            {tWithFallback(
                              "ui.app.booking.availability.resource.schedule.closed",
                              "Closed"
                            )}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <div
                  className="rounded-xl border"
                  style={{
                    borderColor: "var(--window-document-border)",
                    background: "var(--window-document-bg)",
                  }}
                >
                  <div
                    className="flex items-start justify-between gap-3 border-b px-4 py-3"
                    style={{ borderColor: "var(--window-document-border)" }}
                  >
                    <div>
                      <p className="font-pixel text-xs" style={{ color: "var(--window-document-text)" }}>
                        {tWithFallback(
                          "ui.app.booking.availability.resource.override.title",
                          "Date Overrides"
                        )}
                      </p>
                      <p
                        className="mt-1 text-xs"
                        style={{ color: "var(--window-document-text)", opacity: 0.65 }}
                      >
                        {tWithFallback(
                          "ui.app.booking.availability.resource.override.subtitle",
                          "Override a single date with custom hours or mark the date unavailable."
                        )}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="desktop-interior-button flex items-center gap-1 text-xs"
                      onClick={addException}
                      disabled={existingAvailability === undefined}
                    >
                      <Plus size={12} />
                      {tWithFallback("ui.app.booking.availability.editor.add_override", "Add an override")}
                    </button>
                  </div>

                  <div className="space-y-3 p-4">
                    {exceptions.length === 0 ? (
                      <p
                        className="text-xs"
                        style={{ color: "var(--window-document-text)", opacity: 0.6 }}
                      >
                        {tWithFallback(
                          "ui.app.booking.availability.resource.override.empty",
                          "No date overrides yet."
                        )}
                      </p>
                    ) : (
                      exceptions.map((entry) => {
                        const pendingKey = `exception:${entry.clientId}`
                        const isPending = isRowPending(pendingKey)

                        return (
                          <div
                            key={entry.clientId}
                            className="rounded-lg border p-3"
                            style={{ borderColor: "var(--window-document-border)" }}
                          >
                            <div className="grid gap-3 md:grid-cols-2">
                              <label className="block text-xs font-medium">
                                {tWithFallback(
                                  "ui.app.booking.availability.resource.override.fields.date",
                                  "Override date"
                                )}
                                <input
                                  type="date"
                                  value={entry.date}
                                  disabled={isPending}
                                  onChange={(event) =>
                                    updateExceptionField(entry.clientId, "date", event.target.value)
                                  }
                                  className="mt-1 w-full rounded-md border px-2 py-1.5 text-sm"
                                  style={fieldStyle}
                                />
                              </label>

                              <label className="block text-xs font-medium">
                                {tWithFallback(
                                  "ui.app.booking.availability.resource.override.fields.rule",
                                  "Override rule"
                                )}
                                <select
                                  value={entry.mode}
                                  disabled={isPending}
                                  onChange={(event) =>
                                    updateExceptionField(
                                      entry.clientId,
                                      "mode",
                                      event.target.value as OverrideMode
                                    )
                                  }
                                  className="mt-1 w-full rounded-md border px-2 py-1.5 text-sm"
                                  style={fieldStyle}
                                >
                                  <option value="custom_hours">
                                    {tWithFallback(
                                      "ui.app.booking.availability.resource.override.rule.custom_hours",
                                      "Custom hours"
                                    )}
                                  </option>
                                  <option value="closed">
                                    {tWithFallback(
                                      "ui.app.booking.availability.resource.override.rule.closed",
                                      "Unavailable all day"
                                    )}
                                  </option>
                                </select>
                              </label>
                            </div>

                            {entry.mode === "custom_hours" ? (
                              <div className="mt-3 grid gap-3 md:grid-cols-2">
                                <label className="block text-xs font-medium">
                                  {tWithFallback(
                                    "ui.app.booking.availability.resource.override.fields.start_time",
                                    "Start time"
                                  )}
                                  <input
                                    type="time"
                                    value={entry.startTime}
                                    disabled={isPending}
                                    onChange={(event) =>
                                      updateExceptionField(entry.clientId, "startTime", event.target.value)
                                    }
                                    className="mt-1 w-full rounded-md border px-2 py-1.5 text-sm"
                                    style={fieldStyle}
                                  />
                                </label>

                                <label className="block text-xs font-medium">
                                  {tWithFallback(
                                    "ui.app.booking.availability.resource.override.fields.end_time",
                                    "End time"
                                  )}
                                  <input
                                    type="time"
                                    value={entry.endTime}
                                    disabled={isPending}
                                    onChange={(event) =>
                                      updateExceptionField(entry.clientId, "endTime", event.target.value)
                                    }
                                    className="mt-1 w-full rounded-md border px-2 py-1.5 text-sm"
                                    style={fieldStyle}
                                  />
                                </label>
                              </div>
                            ) : null}

                            <label className="mt-3 block text-xs font-medium">
                              {tWithFallback(
                                "ui.app.booking.availability.resource.override.fields.reason",
                                "Reason"
                              )}
                              <input
                                type="text"
                                value={entry.reason}
                                disabled={isPending}
                                onChange={(event) =>
                                  updateExceptionField(entry.clientId, "reason", event.target.value)
                                }
                                placeholder={tWithFallback(
                                  "ui.app.booking.availability.resource.override.fields.reason_placeholder",
                                  "Holiday, special event, staff time-off..."
                                )}
                                className="mt-1 w-full rounded-md border px-2 py-1.5 text-sm"
                                style={fieldStyle}
                              />
                            </label>

                            <div className="mt-3 flex flex-wrap justify-end gap-2">
                              <button
                                type="button"
                                className="desktop-interior-button desktop-interior-button-primary flex items-center gap-1 text-xs"
                                onClick={() => handleSaveException(entry.clientId)}
                                disabled={isPending}
                              >
                                <Save size={12} />
                                {isPending
                                  ? tWithFallback("ui.app.booking.actions.saving", "Saving...")
                                  : entry.exceptionId
                                  ? tWithFallback(
                                      "ui.app.booking.availability.resource.override.actions.update",
                                      "Update override"
                                    )
                                  : tWithFallback(
                                      "ui.app.booking.availability.resource.override.actions.create",
                                      "Create override"
                                    )}
                              </button>
                              <button
                                type="button"
                                className="desktop-interior-button flex items-center gap-1 text-xs"
                                onClick={() => handleDeleteException(entry.clientId)}
                                disabled={isPending}
                              >
                                <Trash2 size={12} />
                                {entry.exceptionId
                                  ? tWithFallback(
                                      "ui.app.booking.availability.resource.override.actions.delete",
                                      "Delete override"
                                    )
                                  : tWithFallback(
                                      "ui.app.booking.availability.resource.override.actions.remove",
                                      "Remove override"
                                    )}
                              </button>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>

                <div
                  className="rounded-xl border"
                  style={{
                    borderColor: "var(--window-document-border)",
                    background: "var(--window-document-bg)",
                  }}
                >
                  <div
                    className="flex items-start justify-between gap-3 border-b px-4 py-3"
                    style={{ borderColor: "var(--window-document-border)" }}
                  >
                    <div>
                      <p className="font-pixel text-xs" style={{ color: "var(--window-document-text)" }}>
                        {tWithFallback(
                          "ui.app.booking.availability.resource.blackout.title",
                          "Blackout Windows"
                        )}
                      </p>
                      <p
                        className="mt-1 text-xs"
                        style={{ color: "var(--window-document-text)", opacity: 0.65 }}
                      >
                        {tWithFallback(
                          "ui.app.booking.availability.resource.blackout.subtitle",
                          "Block unavailable windows such as maintenance or travel."
                        )}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="desktop-interior-button flex items-center gap-1 text-xs"
                      onClick={addBlock}
                      disabled={existingAvailability === undefined}
                    >
                      <Plus size={12} />
                      {tWithFallback(
                        "ui.app.booking.availability.resource.blackout.actions.add",
                        "Add blackout"
                      )}
                    </button>
                  </div>

                  <div className="space-y-3 p-4">
                    {blocks.length === 0 ? (
                      <p
                        className="text-xs"
                        style={{ color: "var(--window-document-text)", opacity: 0.6 }}
                      >
                        {tWithFallback(
                          "ui.app.booking.availability.resource.blackout.empty",
                          "No blackout windows yet."
                        )}
                      </p>
                    ) : (
                      blocks.map((entry) => {
                        const pendingKey = `block:${entry.clientId}`
                        const isPending = isRowPending(pendingKey)

                        return (
                          <div
                            key={entry.clientId}
                            className="rounded-lg border p-3"
                            style={{ borderColor: "var(--window-document-border)" }}
                          >
                            <div className="grid gap-3 md:grid-cols-2">
                              <label className="block text-xs font-medium">
                                {tWithFallback(
                                  "ui.app.booking.availability.resource.blackout.fields.start_date",
                                  "Start date"
                                )}
                                <input
                                  type="date"
                                  value={entry.startDate}
                                  disabled={isPending}
                                  onChange={(event) =>
                                    updateBlockField(entry.clientId, "startDate", event.target.value)
                                  }
                                  className="mt-1 w-full rounded-md border px-2 py-1.5 text-sm"
                                  style={fieldStyle}
                                />
                              </label>

                              <label className="block text-xs font-medium">
                                {tWithFallback(
                                  "ui.app.booking.availability.resource.blackout.fields.end_date",
                                  "End date"
                                )}
                                <input
                                  type="date"
                                  value={entry.endDate}
                                  disabled={isPending}
                                  onChange={(event) =>
                                    updateBlockField(entry.clientId, "endDate", event.target.value)
                                  }
                                  className="mt-1 w-full rounded-md border px-2 py-1.5 text-sm"
                                  style={fieldStyle}
                                />
                              </label>
                            </div>

                            <label className="mt-3 block text-xs font-medium">
                              {tWithFallback(
                                "ui.app.booking.availability.resource.blackout.fields.reason",
                                "Reason"
                              )}
                              <input
                                type="text"
                                value={entry.reason}
                                disabled={isPending}
                                onChange={(event) =>
                                  updateBlockField(entry.clientId, "reason", event.target.value)
                                }
                                placeholder={tWithFallback(
                                  "ui.app.booking.availability.resource.blackout.fields.reason_placeholder",
                                  "Maintenance, chartered trip, seasonal closure..."
                                )}
                                className="mt-1 w-full rounded-md border px-2 py-1.5 text-sm"
                                style={fieldStyle}
                              />
                            </label>

                            <div className="mt-3 flex flex-wrap justify-end gap-2">
                              <button
                                type="button"
                                className="desktop-interior-button desktop-interior-button-primary flex items-center gap-1 text-xs"
                                onClick={() => handleSaveBlock(entry.clientId)}
                                disabled={isPending}
                              >
                                <Save size={12} />
                                {isPending
                                  ? tWithFallback("ui.app.booking.actions.saving", "Saving...")
                                  : entry.blockId
                                  ? tWithFallback(
                                      "ui.app.booking.availability.resource.blackout.actions.update",
                                      "Update blackout"
                                    )
                                  : tWithFallback(
                                      "ui.app.booking.availability.resource.blackout.actions.create",
                                      "Create blackout"
                                    )}
                              </button>
                              <button
                                type="button"
                                className="desktop-interior-button flex items-center gap-1 text-xs"
                                onClick={() => handleDeleteBlock(entry.clientId)}
                                disabled={isPending}
                              >
                                <Trash2 size={12} />
                                {entry.blockId
                                  ? tWithFallback(
                                      "ui.app.booking.availability.resource.blackout.actions.delete",
                                      "Delete blackout"
                                    )
                                  : tWithFallback(
                                      "ui.app.booking.availability.resource.blackout.actions.remove",
                                      "Remove blackout"
                                    )}
                              </button>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              </div>

              <div
                className="flex flex-wrap gap-3 text-xs"
                style={{ color: "var(--window-document-text)", opacity: 0.65 }}
              >
                <span className="inline-flex items-center gap-1">
                  <CalendarRange size={12} />
                  {overrideSummary}
                </span>
                <span>
                  {blackoutSummary}
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <div
                className="rounded-xl border p-4"
                style={{
                  borderColor: "var(--window-document-border)",
                  background: "var(--window-document-bg)",
                }}
              >
                <p className="font-pixel text-xs" style={{ color: "var(--window-document-text)" }}>
                  {tWithFallback(
                    "ui.app.booking.availability.resource.settings.title",
                    "Edit Resource"
                  )}
                </p>

                <label className="mt-3 block text-xs font-medium">
                  {tWithFallback(
                    "ui.app.booking.availability.resource.settings.resource_name",
                    "Resource name"
                  )}
                  <input
                    type="text"
                    value={resourceName}
                    onChange={(event) => {
                      setResourceName(event.target.value)
                      setIsDirty(true)
                    }}
                    className="mt-1 w-full rounded-md border px-2 py-1.5 text-sm"
                    style={fieldStyle}
                    placeholder={tWithFallback(
                      "ui.app.booking.availability.resource.settings.resource_name_placeholder",
                      "Enter a resource name"
                    )}
                  />
                </label>

                <label className="mt-3 block text-xs font-medium">
                  {tWithFallback(
                    "ui.app.booking.availability.resource.settings.slot_duration",
                    "Slot duration"
                  )}
                  <select
                    value={slotDuration}
                    onChange={(event) => {
                      const nextDuration = Number.parseInt(event.target.value || "0", 10)
                      setSlotDuration(Number.isFinite(nextDuration) && nextDuration > 0 ? nextDuration : 60)
                      setIsDirty(true)
                    }}
                    className="mt-1 w-full rounded-md border px-2 py-1.5 text-sm"
                    style={fieldStyle}
                  >
                    {slotDurationOptions.map((durationOption) => (
                      <option key={durationOption} value={durationOption}>
                        {formatDuration(durationOption)}
                      </option>
                    ))}
                  </select>
                  <span className="mt-1 block text-[11px] font-normal opacity-65">
                    {tWithFallback(
                      "ui.app.booking.availability.resource.settings.slot_duration_hint",
                      "Select the booking length in minutes. Each option also shows the hour breakdown."
                    )}
                  </span>
                </label>

                <label className="mt-3 block text-xs font-medium">
                  {tWithFallback(
                    "ui.app.booking.availability.resource.settings.buffer_after",
                    "Buffer after booking"
                  )}
                  <input
                    type="number"
                    min={0}
                    step={5}
                    value={bufferTime}
                    onChange={(event) => {
                      setBufferTime(Math.max(0, Number.parseInt(event.target.value || "0", 10) || 0))
                      setIsDirty(true)
                    }}
                    className="mt-1 w-full rounded-md border px-2 py-1.5 text-sm"
                    style={fieldStyle}
                  />
                </label>

                <label className="mt-3 block text-xs font-medium">
                  {tWithFallback("ui.app.booking.availability.editor.timezone", "Timezone")}
                  <select
                    value={timezone}
                    onChange={(event) => {
                      setTimezone(event.target.value)
                      setIsDirty(true)
                    }}
                    className="mt-1 w-full rounded-md border px-2 py-1.5 text-sm"
                    style={fieldStyle}
                  >
                    {timezoneList.map((timezoneOption) => (
                      <option key={timezoneOption} value={timezoneOption}>
                        {timezoneOption}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="mt-4 space-y-1 text-xs opacity-70">
                  <p>
                    {tWithFallback(
                      "ui.app.booking.availability.resource.settings.summary",
                      "Duration: {duration}. Buffer: {buffer}.",
                      {
                        duration: formatDuration(slotDuration),
                        buffer: formatDuration(bufferTime),
                      }
                    )}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving || existingAvailability === undefined}
                className="desktop-interior-button desktop-interior-button-primary flex w-full items-center justify-center gap-2 py-2 text-sm"
              >
                <Save size={14} />
                {isSaving
                  ? tWithFallback("ui.app.booking.actions.saving", "Saving...")
                  : isDirty
                  ? tWithFallback(
                      "ui.app.booking.availability.resource.actions.save_changes",
                      "Save Changes"
                    )
                  : tWithFallback(
                      "ui.app.booking.availability.resource.actions.saved",
                    "Saved"
                  )}
              </button>

              <button
                type="button"
                onClick={handleArchiveResource}
                className="desktop-interior-button desktop-interior-button-danger flex w-full items-center justify-center gap-2 py-2 text-sm"
              >
                <Trash2 size={14} />
                {tWithFallback(
                  "ui.app.booking.availability.resource.actions.archive_resource",
                  "Archive Resource"
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
