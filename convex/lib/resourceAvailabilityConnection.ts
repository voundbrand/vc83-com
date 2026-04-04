import type { Id } from "../_generated/dataModel"

export type ResourceAvailabilitySource = "none" | "direct" | "template" | "mixed"

export interface ResourceAvailabilityConnectionSummary {
  resourceId: Id<"objects">
  hasAvailabilityConfigured: boolean
  hasDirectAvailability: boolean
  usesScheduleTemplate: boolean
  scheduleSource: ResourceAvailabilitySource
  directScheduleCount: number
  weeklyWindowCount: number
  exceptionCount: number
  blockCount: number
  scheduleTemplateCount: number
  scheduleTemplateNames: string[]
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {}
  }
  return value as Record<string, unknown>
}

function asTimeRanges(value: unknown): Array<{ startTime: string; endTime: string }> {
  if (!Array.isArray(value)) {
    return []
  }

  return value.flatMap((entry) => {
    const record = asRecord(entry)
    if (typeof record.startTime !== "string" || typeof record.endTime !== "string") {
      return []
    }
    return [{ startTime: record.startTime, endTime: record.endTime }]
  })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getResourceAvailabilityConnectionSummary(ctx: any, resourceId: Id<"objects">): Promise<ResourceAvailabilityConnectionSummary> {
  const directLinks = await ctx.db
    .query("objectLinks")
    .withIndex("by_from_link_type", (q: any) =>
      q.eq("fromObjectId", resourceId).eq("linkType", "has_availability")
    )
    .collect()

  let directScheduleCount = 0
  let weeklyWindowCount = 0
  let exceptionCount = 0
  let blockCount = 0

  for (const link of directLinks) {
    const availability = await ctx.db.get(link.toObjectId)
    if (!availability || availability.type !== "availability" || availability.status !== "active") {
      continue
    }

    switch (availability.subtype) {
      case "schedule":
        directScheduleCount += 1
        weeklyWindowCount += 1
        break
      case "exception":
        exceptionCount += 1
        break
      case "block":
        blockCount += 1
        break
    }
  }

  const scheduleLinks = await ctx.db
    .query("objectLinks")
    .withIndex("by_from_link_type", (q: any) =>
      q.eq("fromObjectId", resourceId).eq("linkType", "uses_schedule")
    )
    .collect()

  let scheduleTemplateCount = 0
  const scheduleTemplateNames: string[] = []

  for (const scheduleLink of scheduleLinks) {
    const template = await ctx.db.get(scheduleLink.toObjectId)
    if (!template || template.type !== "availability" || template.subtype !== "schedule_template" || template.status !== "active") {
      continue
    }

    scheduleTemplateCount += 1
    if (typeof template.name === "string" && template.name.trim().length > 0) {
      scheduleTemplateNames.push(template.name.trim())
    }

    const entryLinks = await ctx.db
      .query("objectLinks")
      .withIndex("by_from_link_type", (q: any) =>
        q.eq("fromObjectId", template._id).eq("linkType", "has_schedule_entry")
      )
      .collect()

    for (const entryLink of entryLinks) {
      const entry = await ctx.db.get(entryLink.toObjectId)
      if (!entry || entry.type !== "availability" || entry.subtype !== "schedule_entry" || entry.status !== "active") {
        continue
      }

      const entryProps = asRecord(entry.customProperties)
      if (entryProps.isAvailable !== true) {
        continue
      }

      weeklyWindowCount += asTimeRanges(entryProps.timeRanges).length
    }
  }

  const hasDirectAvailability = directScheduleCount > 0 || exceptionCount > 0 || blockCount > 0
  const usesScheduleTemplate = scheduleTemplateCount > 0
  const hasAvailabilityConfigured = weeklyWindowCount > 0 || exceptionCount > 0 || blockCount > 0

  let scheduleSource: ResourceAvailabilitySource = "none"
  if (hasDirectAvailability && usesScheduleTemplate) {
    scheduleSource = "mixed"
  } else if (usesScheduleTemplate) {
    scheduleSource = "template"
  } else if (hasDirectAvailability) {
    scheduleSource = "direct"
  }

  return {
    resourceId,
    hasAvailabilityConfigured,
    hasDirectAvailability,
    usesScheduleTemplate,
    scheduleSource,
    directScheduleCount,
    weeklyWindowCount,
    exceptionCount,
    blockCount,
    scheduleTemplateCount,
    scheduleTemplateNames,
  }
}
