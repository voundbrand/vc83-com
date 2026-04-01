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

const BOOKABLE_SUBTYPES = new Set([
  "room",
  "staff",
  "equipment",
  "space",
  "vehicle",
  "accommodation",
  "appointment",
  "class",
  "treatment",
])

const COMMON_TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Berlin",
  "UTC",
]

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

function validateScheduleState(schedule: WeeklyScheduleState): string | null {
  for (const day of DAYS_OF_WEEK) {
    const dayState = schedule[day.key]
    if (!dayState.isOpen) {
      continue
    }

    if (dayState.timeRanges.length === 0) {
      return `${day.label} needs at least one time range.`
    }

    const sorted = sortRanges(dayState.timeRanges)
    for (let index = 0; index < sorted.length; index += 1) {
      const range = sorted[index]
      if (range.startTime >= range.endTime) {
        return `${day.label} has an invalid time range.`
      }
      if (index > 0 && range.startTime < sorted[index - 1].endTime) {
        return `${day.label} has overlapping time ranges.`
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

function formatMinutesLabel(minutes: number): string {
  if (minutes % 60 === 0) {
    const hours = minutes / 60
    return hours === 1 ? "1 hour" : `${hours} hours`
  }
  return `${minutes} min`
}

export function ResourceAvailability({
  selectedResourceId,
  onSelectResource,
}: ResourceAvailabilityProps) {
  const { sessionId } = useAuth()
  const currentOrganization = useCurrentOrganization()
  const { tWithFallback } = useNamespaceTranslations("ui.app.booking")

  const products = (useQuery as any)(
    (api as any).productOntology.getProducts,
    sessionId && currentOrganization?.id
      ? {
          sessionId,
          organizationId: currentOrganization.id as Id<"organizations">,
        }
      : "skip"
  ) as ProductRecord[] | undefined

  const resources = (products as ProductRecord[] | undefined)?.filter((product) => {
    const resourceProps = asRecord(product.customProperties)
    return (
      BOOKABLE_SUBTYPES.has(product.subtype || "")
      || Object.keys(asRecord(resourceProps.bookableConfig)).length > 0
      || Boolean(normalizeOptionalString(resourceProps.availabilityStructure))
    )
  }).sort((left, right) => {
    if (left.status === right.status) {
      return (left.name || "").localeCompare(right.name || "")
    }
    return left.status === "active" ? -1 : 1
  }) || []

  if (!sessionId || !currentOrganization?.id) {
    return (
      <div className="p-4 text-center" style={{ color: "var(--window-document-text)" }}>
        <p className="font-pixel text-sm">Please log in</p>
        <p className="mt-2 text-xs opacity-70">Login required to manage availability.</p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col" style={{ background: "var(--window-document-bg)" }}>
      <div
        className="border-b px-4 py-3"
        style={{ borderColor: "var(--window-document-border)" }}
      >
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
          Configure recurring booking windows, date overrides, and blackout windows directly on each resource.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {products === undefined ? (
          <div className="flex items-center justify-center py-12">
            <p
              className="font-pixel text-xs"
              style={{ color: "var(--window-document-text)", opacity: 0.5 }}
            >
              Loading resources...
            </p>
          </div>
        ) : resources.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16">
            <Clock size={48} style={{ color: "var(--window-document-text)", opacity: 0.3 }} />
            <p
              className="font-pixel text-sm"
              style={{ color: "var(--window-document-text)" }}
            >
              No bookable resources found
            </p>
            <p
              className="max-w-xs text-center text-xs"
              style={{ color: "var(--window-document-text)", opacity: 0.6 }}
            >
              Create or configure a bookable product before managing availability.
            </p>
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
  const timezoneList = getTimezoneList()
  const clientIdRef = useRef(0)

  const createClientId = () => {
    clientIdRef.current += 1
    return `${resource._id}-${clientIdRef.current}`
  }

  const [schedule, setSchedule] = useState<WeeklyScheduleState>(() =>
    createClosedWeeklySchedule()
  )
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

  const resourceProps = asRecord(resource.customProperties)
  const bookableConfig = asRecord(resourceProps.bookableConfig)
  const structureDefinition = getAvailabilityStructureDefinition(
    resolveAvailabilityStructure(resourceProps, bookableConfig)
  )
  const fieldStyle = {
    borderColor: "var(--window-document-border)",
    background: "var(--window-document-bg)",
    color: "var(--window-document-text)",
  } as const
  const configuredWindowCount =
    existingAvailability === undefined ? null : countConfiguredWindows(schedule)
  const overrideCount = exceptions.length
  const blackoutCount = blocks.length

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
      return "Choose a date for the override."
    }
    if (
      exceptions.some(
        (candidate) => candidate.clientId !== entry.clientId && candidate.date === entry.date
      )
    ) {
      return "Each date can only have one override."
    }
    if (entry.mode === "custom_hours" && entry.startTime >= entry.endTime) {
      return "Override end time must be after start time."
    }
    return null
  }

  const validateBlock = (entry: BlockEditorState): string | null => {
    if (!entry.startDate || !entry.endDate) {
      return "Choose both the start and end date for the blackout window."
    }
    if (entry.endDate < entry.startDate) {
      return "Blackout end date must be on or after the start date."
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
      notification.error("Invalid override", validationError)
      return
    }

    const date = parseDateInput(entry.date)
    if (date === null) {
      notification.error("Invalid override", "Choose a valid override date.")
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
        entry.exceptionId ? "Override updated" : "Override created",
        entry.mode === "closed"
          ? "The resource is unavailable for that date."
          : "The date-specific hours have been saved."
      )
    } catch (error) {
      notification.error(
        "Override save failed",
        error instanceof Error ? error.message : "Failed to save the date override."
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
      notification.success("Override removed", "The date-specific override has been deleted.")
    } catch (error) {
      notification.error(
        "Override delete failed",
        error instanceof Error ? error.message : "Failed to delete the date override."
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
      notification.error("Invalid blackout window", validationError)
      return
    }

    const startDate = parseDateInput(entry.startDate)
    const endDate = parseDateInput(entry.endDate)
    if (startDate === null || endDate === null) {
      notification.error("Invalid blackout window", "Choose valid blackout dates.")
      return
    }

    const pendingKey = `block:${clientId}`
    const reason = entry.reason.trim() || "Unavailable"
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
        entry.blockId ? "Blackout updated" : "Blackout created",
        "The blackout window has been saved."
      )
    } catch (error) {
      notification.error(
        "Blackout save failed",
        error instanceof Error ? error.message : "Failed to save the blackout window."
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
      notification.success("Blackout removed", "The blackout window has been deleted.")
    } catch (error) {
      notification.error(
        "Blackout delete failed",
        error instanceof Error ? error.message : "Failed to delete the blackout window."
      )
    } finally {
      setRowPending(pendingKey, false)
    }
  }

  const handleSave = async () => {
    const validationError = validateScheduleState(schedule)
    if (validationError) {
      notification.error("Invalid schedule", validationError)
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
        customProperties: nextCustomProperties,
      })

      setIsDirty(false)
      notification.success("Availability saved", "The resource schedule has been updated.")
    } catch (error) {
      notification.error(
        "Save failed",
        error instanceof Error ? error.message : "Failed to save resource availability."
      )
    } finally {
      setIsSaving(false)
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
            <span className="truncate font-pixel text-sm">{resource.name || "Untitled resource"}</span>
            <span
              className="rounded px-1.5 py-0.5 text-xs"
              style={{
                background: "var(--desktop-menu-hover)",
                color: "var(--window-document-text)",
              }}
            >
              {structureDefinition.label}
            </span>
            {resource.subtype ? (
              <span
                className="rounded px-1.5 py-0.5 text-xs"
                style={{
                  background: "var(--window-document-bg)",
                  color: "var(--window-document-text)",
                }}
              >
                {resource.subtype.replace(/_/g, " ")}
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-xs opacity-65">
            {configuredWindowCount === null
              ? "Loading schedule..."
              : `${configuredWindowCount} weekly window${configuredWindowCount === 1 ? "" : "s"} | ${overrideCount} override${overrideCount === 1 ? "" : "s"} | ${blackoutCount} blackout window${blackoutCount === 1 ? "" : "s"}`}
          </p>
        </div>

        <span
          className="rounded px-2 py-0.5 text-xs"
          style={{
            background: resource.status === "active" ? "var(--success-bg)" : "var(--warning-bg)",
            color: "white",
          }}
        >
          {resource.status || "draft"}
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
                    Weekly Windows
                  </p>
                  <p
                    className="mt-1 text-xs"
                    style={{ color: "var(--window-document-text)", opacity: 0.65 }}
                  >
                    Recurring booking hours that apply unless a date override or blackout window takes precedence.
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
                        <span className="text-sm font-medium">{day.label}</span>
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
                                <span className="text-xs opacity-60">to</span>
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
                                  title="Remove time range"
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
                              Add window
                            </button>
                          </>
                        ) : (
                          <p className="pt-1 text-xs opacity-55">Closed</p>
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
                        Date Overrides
                      </p>
                      <p
                        className="mt-1 text-xs"
                        style={{ color: "var(--window-document-text)", opacity: 0.65 }}
                      >
                        Override a single date with custom hours or mark the date unavailable.
                      </p>
                    </div>
                    <button
                      type="button"
                      className="desktop-interior-button flex items-center gap-1 text-xs"
                      onClick={addException}
                      disabled={existingAvailability === undefined}
                    >
                      <Plus size={12} />
                      Add override
                    </button>
                  </div>

                  <div className="space-y-3 p-4">
                    {exceptions.length === 0 ? (
                      <p
                        className="text-xs"
                        style={{ color: "var(--window-document-text)", opacity: 0.6 }}
                      >
                        No date overrides yet.
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
                                Override date
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
                                Override rule
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
                                  <option value="custom_hours">Custom hours</option>
                                  <option value="closed">Unavailable all day</option>
                                </select>
                              </label>
                            </div>

                            {entry.mode === "custom_hours" ? (
                              <div className="mt-3 grid gap-3 md:grid-cols-2">
                                <label className="block text-xs font-medium">
                                  Start time
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
                                  End time
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
                              Reason
                              <input
                                type="text"
                                value={entry.reason}
                                disabled={isPending}
                                onChange={(event) =>
                                  updateExceptionField(entry.clientId, "reason", event.target.value)
                                }
                                placeholder="Holiday, special event, staff time-off..."
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
                                  ? "Saving..."
                                  : entry.exceptionId
                                  ? "Update override"
                                  : "Create override"}
                              </button>
                              <button
                                type="button"
                                className="desktop-interior-button flex items-center gap-1 text-xs"
                                onClick={() => handleDeleteException(entry.clientId)}
                                disabled={isPending}
                              >
                                <Trash2 size={12} />
                                {entry.exceptionId ? "Delete override" : "Remove override"}
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
                        Blackout Windows
                      </p>
                      <p
                        className="mt-1 text-xs"
                        style={{ color: "var(--window-document-text)", opacity: 0.65 }}
                      >
                        Block multi-day unavailable windows such as maintenance or travel.
                      </p>
                    </div>
                    <button
                      type="button"
                      className="desktop-interior-button flex items-center gap-1 text-xs"
                      onClick={addBlock}
                      disabled={existingAvailability === undefined}
                    >
                      <Plus size={12} />
                      Add blackout
                    </button>
                  </div>

                  <div className="space-y-3 p-4">
                    {blocks.length === 0 ? (
                      <p
                        className="text-xs"
                        style={{ color: "var(--window-document-text)", opacity: 0.6 }}
                      >
                        No blackout windows yet.
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
                                Start date
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
                                End date
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
                              Reason
                              <input
                                type="text"
                                value={entry.reason}
                                disabled={isPending}
                                onChange={(event) =>
                                  updateBlockField(entry.clientId, "reason", event.target.value)
                                }
                                placeholder="Maintenance, chartered trip, seasonal closure..."
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
                                  ? "Saving..."
                                  : entry.blockId
                                  ? "Update blackout"
                                  : "Create blackout"}
                              </button>
                              <button
                                type="button"
                                className="desktop-interior-button flex items-center gap-1 text-xs"
                                onClick={() => handleDeleteBlock(entry.clientId)}
                                disabled={isPending}
                              >
                                <Trash2 size={12} />
                                {entry.blockId ? "Delete blackout" : "Remove blackout"}
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
                  {overrideCount} override{overrideCount === 1 ? "" : "s"}
                </span>
                <span>
                  {blackoutCount} blackout window{blackoutCount === 1 ? "" : "s"}
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
                  Resource Settings
                </p>

                <label className="mt-3 block text-xs font-medium">
                  Slot duration
                  <input
                    type="number"
                    min={15}
                    step={15}
                    value={slotDuration}
                    onChange={(event) => {
                      setSlotDuration(Math.max(15, Number.parseInt(event.target.value || "0", 10) || 60))
                      setIsDirty(true)
                    }}
                    className="mt-1 w-full rounded-md border px-2 py-1.5 text-sm"
                    style={fieldStyle}
                  />
                </label>

                <label className="mt-3 block text-xs font-medium">
                  Buffer after booking
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
                  Timezone
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
                  <p>{structureDefinition.description}</p>
                  <p>
                    Duration: {formatMinutesLabel(slotDuration)}. Buffer: {formatMinutesLabel(bufferTime)}.
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
                {isSaving ? "Saving..." : isDirty ? "Save Changes" : "Saved"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
