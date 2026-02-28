export type UnifiedTimelineMarkerType =
  | "group"
  | "dm"
  | "handoff"
  | "proposal"
  | "commit"

export interface UnifiedTimelineMarkerSource {
  kind?: string | null
  threadType?: string | null
  dmThreadId?: string | null
  groupThreadId?: string | null
}

export interface DeterministicTimelineOrdering {
  eventOrdinal: number
  occurredAt: number
  eventId: string
}

function normalizeTimelineToken(value: string | null | undefined): string | undefined {
  if (typeof value !== "string") {
    return undefined
  }
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

export function resolveUnifiedTimelineMarkerType(
  source: UnifiedTimelineMarkerSource
): UnifiedTimelineMarkerType | null {
  if (source.kind === "handoff") {
    return "handoff"
  }
  if (source.kind === "proposal") {
    return "proposal"
  }
  if (source.kind === "commit") {
    return "commit"
  }
  if (source.threadType === "dm_thread" || normalizeTimelineToken(source.dmThreadId)) {
    return "dm"
  }
  if (source.threadType === "group_thread" || normalizeTimelineToken(source.groupThreadId)) {
    return "group"
  }
  return null
}

export function resolveUnifiedTimelineMarkerLabel(markerType: UnifiedTimelineMarkerType): string {
  if (markerType === "handoff") {
    return "Handoff"
  }
  if (markerType === "proposal") {
    return "Proposal"
  }
  if (markerType === "commit") {
    return "Commit"
  }
  if (markerType === "dm") {
    return "DM"
  }
  return "Group"
}

export function compactUnifiedCorrelationId(correlationId: string): string {
  if (correlationId.length <= 36) {
    return correlationId
  }
  return `${correlationId.slice(0, 16)}...${correlationId.slice(-12)}`
}

export function compareTimelineEventsDeterministically(
  left: DeterministicTimelineOrdering,
  right: DeterministicTimelineOrdering
): number {
  if (left.eventOrdinal !== right.eventOrdinal) {
    return right.eventOrdinal - left.eventOrdinal
  }
  if (left.occurredAt !== right.occurredAt) {
    return right.occurredAt - left.occurredAt
  }
  return left.eventId.localeCompare(right.eventId)
}
