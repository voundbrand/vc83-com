import { toZonedTime } from "date-fns-tz"

export type BookingReminderKind = "weather" | "packing_list"

const DAY_MS = 24 * 60 * 60 * 1000

function splitCronField(field: string): string[] {
  return field
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
}

function parseRange(part: string): { start: number; end: number } | null {
  const match = /^(\d+)-(\d+)$/.exec(part)
  if (!match) {
    return null
  }

  const start = Number(match[1])
  const end = Number(match[2])
  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end) {
    return null
  }

  return { start, end }
}

function matchesCronPart(part: string, value: number): boolean {
  if (part === "*") {
    return true
  }

  const stepSeparatorIndex = part.indexOf("/")
  const basePart =
    stepSeparatorIndex >= 0 ? part.slice(0, stepSeparatorIndex) : part
  const stepPart =
    stepSeparatorIndex >= 0 ? part.slice(stepSeparatorIndex + 1) : null
  const step =
    stepPart && stepPart.length > 0 ? Number(stepPart) : null

  if (stepPart && (!Number.isFinite(step) || Number(step) <= 0)) {
    return false
  }

  if (basePart === "*") {
    return step ? value % step === 0 : true
  }

  const range = parseRange(basePart)
  if (range) {
    if (value < range.start || value > range.end) {
      return false
    }
    return step ? (value - range.start) % step === 0 : true
  }

  const numeric = Number(basePart)
  if (Number.isFinite(numeric) && numeric === value) {
    if (!step) {
      return true
    }
    return value % step === 0
  }

  return false
}

function matchesCronField(field: string, value: number): boolean {
  if (field === "*") {
    return true
  }

  for (const part of splitCronField(field)) {
    if (matchesCronPart(part, value)) {
      return true
    }
  }

  return false
}

function toLocalDateKey(timestamp: number, timezone: string): string {
  const zoned = toZonedTime(new Date(timestamp), timezone)
  const year = zoned.getFullYear()
  const month = String(zoned.getMonth() + 1).padStart(2, "0")
  const day = String(zoned.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function matchesSimpleCronExpression(args: {
  timestamp: number
  cronExpression: string
  timezone: string
}): boolean {
  const parts = args.cronExpression.trim().split(/\s+/)
  if (parts.length !== 5) {
    return false
  }

  const [minuteField, hourField, dayField, monthField, dayOfWeekField] = parts
  const zoned = toZonedTime(new Date(args.timestamp), args.timezone)
  const minute = zoned.getMinutes()
  const hour = zoned.getHours()
  const day = zoned.getDate()
  const month = zoned.getMonth() + 1
  const dayOfWeek = zoned.getDay()

  return (
    matchesCronField(minuteField, minute) &&
    matchesCronField(hourField, hour) &&
    matchesCronField(dayField, day) &&
    matchesCronField(monthField, month) &&
    matchesCronField(dayOfWeekField, dayOfWeek)
  )
}

export function isBookingReminderDue(args: {
  bookingStartAt: number
  now: number
  daysBeforeStart: number
  timezone: string
}): boolean {
  if (!Number.isFinite(args.bookingStartAt) || !Number.isFinite(args.now)) {
    return false
  }

  const daysBeforeStart = Math.max(0, Math.floor(args.daysBeforeStart))
  const reminderTarget = args.bookingStartAt - daysBeforeStart * DAY_MS

  return (
    toLocalDateKey(reminderTarget, args.timezone)
    === toLocalDateKey(args.now, args.timezone)
  )
}

export function buildReminderTrackingKey(kind: BookingReminderKind): string {
  return kind === "packing_list" ? "packingListReminder" : "weatherReminder"
}
