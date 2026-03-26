import type {
  SegelschuleBoatConfig,
  SegelschuleSeatSelection,
} from "./booking-platform-bridge"

export interface SeatInventoryGroup {
  groupId: string
  label: string
  capacity: number
}

export interface SeatInventoryConfig {
  groups: SeatInventoryGroup[]
  strictSeatSelection: boolean
}

export interface ResourceSeatSelection {
  groupId: string
  seatNumbers: number[]
}

export interface BuildCheckoutMetadataArgs {
  bookingId: string
  courseId: string
  courseName: string
  date: string
  time: string
  participants: number
  language: string
  seatSelections: SegelschuleSeatSelection[]
  frontendUserId?: string | null
  platformBookingId?: string | null
  source?: string
}

function normalizeSeatSelectionSignature(
  seatSelections: SegelschuleSeatSelection[]
): string {
  return seatSelections
    .map((selection) => ({
      boatId: selection.boatId.trim(),
      seatNumbers: [...selection.seatNumbers].sort((a, b) => a - b),
    }))
    .sort((a, b) => a.boatId.localeCompare(b.boatId))
    .map(
      (selection) => `${selection.boatId}:${selection.seatNumbers.join(",")}`
    )
    .join("|")
}

export function buildSeatInventoryFromBoats(args: {
  boats: SegelschuleBoatConfig[]
  strictSeatSelection?: boolean
}): SeatInventoryConfig {
  return {
    groups: args.boats.map((boat) => ({
      groupId: boat.id,
      label: boat.name,
      capacity: boat.seatCount,
    })),
    strictSeatSelection: args.strictSeatSelection !== false,
  }
}

export function mapToResourceSeatSelections(
  seatSelections: SegelschuleSeatSelection[]
): ResourceSeatSelection[] {
  return seatSelections.map((selection) => ({
    groupId: selection.boatId,
    seatNumbers: [...selection.seatNumbers].sort((a, b) => a - b),
  }))
}

export function buildCheckoutMetadata(
  args: BuildCheckoutMetadataArgs
): Record<string, string> {
  const metadata: Record<string, string> = {
    source: args.source || "segelschule_landing_booking",
    bookingId: args.bookingId,
    courseId: args.courseId,
    courseName: args.courseName,
    date: args.date,
    time: args.time,
    participants: String(Math.max(1, Math.round(args.participants))),
    language: args.language,
    seatSelections: normalizeSeatSelectionSignature(args.seatSelections),
  }

  if (args.frontendUserId) {
    metadata.frontendUserId = args.frontendUserId
  }
  if (args.platformBookingId) {
    metadata.platformBookingId = args.platformBookingId
  }

  return metadata
}

export const __testables = {
  normalizeSeatSelectionSignature,
}
