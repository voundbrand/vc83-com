import type { Id } from "../../../convex/_generated/dataModel"
import type { SegelschuleBoatConfig } from "./booking-platform-bridge"

type QueryInternalFn = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  convex: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  queryRef: any,
  queryArgs: Record<string, unknown>
) => Promise<unknown>

type RouterObjectRecord = {
  _id?: Id<"objects"> | string
  customProperties?: Record<string, unknown> | null
}

type SeatInventoryGroupBinding = {
  groupId: string
  label: string
  capacity: number
  availabilityResourceId: string | null
}

export interface SlotSeatInventoryResolution {
  availableBoats: SegelschuleBoatConfig[]
  seatInventory: {
    groups: Array<{ groupId: string; label: string; capacity: number }>
    strictSeatSelection: true
  }
  availableGroupIds: string[]
  unavailableGroupIds: string[]
  hasLinkedAvailabilityGroups: boolean
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {}
  }
  return value as Record<string, unknown>
}

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null
  }
  const normalized = value.trim()
  return normalized.length > 0 ? normalized : null
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

function buildSeatInventoryGroupBindings(args: {
  boats: SegelschuleBoatConfig[]
  bookingResource: RouterObjectRecord | null
}): SeatInventoryGroupBinding[] {
  const seatInventory = asRecord(args.bookingResource?.customProperties?.seatInventory)
  const rawGroups = Array.isArray(seatInventory.groups) ? seatInventory.groups : []
  const rawGroupById = new Map<string, Record<string, unknown>>()

  for (const rawGroup of rawGroups) {
    if (!rawGroup || typeof rawGroup !== "object") {
      continue
    }
    const groupRecord = rawGroup as Record<string, unknown>
    const groupId = normalizeOptionalString(
      groupRecord.groupId || groupRecord.id || groupRecord.boatId
    )
    if (!groupId) {
      continue
    }
    rawGroupById.set(groupId, groupRecord)
  }

  return args.boats.map((boat) => {
    const rawGroup = rawGroupById.get(boat.id)
    const availabilityResourceId = normalizeOptionalString(
      rawGroup?.availabilityResourceId || rawGroup?.resourceId
    )
    return {
      groupId: boat.id,
      label:
        normalizeOptionalString(rawGroup?.label || rawGroup?.name) || boat.name,
      capacity:
        normalizePositiveInteger(rawGroup?.capacity) || Math.max(boat.seatCount, 1),
      availabilityResourceId,
    }
  })
}

async function isAvailabilityResourceOpenForSlot(args: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  convex: any
  queryInternalFn: QueryInternalFn
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  generatedInternalApi: any
  organizationId: string
  availabilityResourceId: string
  startDateTime: number
  endDateTime: number
  timezone: string
}): Promise<boolean> {
  try {
    const result = (await args.queryInternalFn(
      args.convex,
      args.generatedInternalApi.availabilityOntology.checkConflictByModel,
      {
        organizationId: args.organizationId as Id<"organizations">,
        resourceId: args.availabilityResourceId as Id<"objects">,
        startDateTime: args.startDateTime,
        endDateTime: args.endDateTime,
        timezone: args.timezone,
      }
    )) as { hasConflict?: boolean } | null

    return result?.hasConflict !== true
  } catch {
    return false
  }
}

export async function resolveSlotSeatInventory(args: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  convex: any
  queryInternalFn: QueryInternalFn
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  generatedInternalApi: any
  organizationId: string
  bookingResourceId: string
  boats: SegelschuleBoatConfig[]
  startDateTime: number
  endDateTime: number
  timezone: string
}): Promise<SlotSeatInventoryResolution> {
  const bookingResource = (await args.queryInternalFn(
    args.convex,
    args.generatedInternalApi.channels.router.getObjectByIdInternal,
    {
      objectId: args.bookingResourceId as Id<"objects">,
    }
  ).catch(() => null)) as RouterObjectRecord | null

  const groupBindings = buildSeatInventoryGroupBindings({
    boats: args.boats,
    bookingResource,
  })
  const hasLinkedAvailabilityGroups = groupBindings.some(
    (binding) => Boolean(binding.availabilityResourceId)
  )

  let availableBindings = groupBindings
  if (hasLinkedAvailabilityGroups) {
    const availabilityResults = await Promise.all(
      groupBindings.map(async (binding) => {
        if (!binding.availabilityResourceId) {
          return { groupId: binding.groupId, available: true }
        }
        return {
          groupId: binding.groupId,
          available: await isAvailabilityResourceOpenForSlot({
            convex: args.convex,
            queryInternalFn: args.queryInternalFn,
            generatedInternalApi: args.generatedInternalApi,
            organizationId: args.organizationId,
            availabilityResourceId: binding.availabilityResourceId,
            startDateTime: args.startDateTime,
            endDateTime: args.endDateTime,
            timezone: args.timezone,
          }),
        }
      })
    )

    const availableGroupIds = new Set(
      availabilityResults
        .filter((result) => result.available)
        .map((result) => result.groupId)
    )
    availableBindings = groupBindings.filter((binding) =>
      availableGroupIds.has(binding.groupId)
    )
  }

  const availableGroupIds = new Set(
    availableBindings.map((binding) => binding.groupId)
  )
  const availableBoats = args.boats
    .filter((boat) => availableGroupIds.has(boat.id))
    .map((boat) => {
      const binding = availableBindings.find(
        (candidate) => candidate.groupId === boat.id
      )
      return {
        ...boat,
        seatCount: binding?.capacity || boat.seatCount,
      }
    })

  return {
    availableBoats,
    seatInventory: {
      groups: availableBindings.map((binding) => ({
        groupId: binding.groupId,
        label: binding.label,
        capacity: binding.capacity,
      })),
      strictSeatSelection: true,
    },
    availableGroupIds: availableBindings.map((binding) => binding.groupId),
    unavailableGroupIds: groupBindings
      .filter((binding) => !availableGroupIds.has(binding.groupId))
      .map((binding) => binding.groupId),
    hasLinkedAvailabilityGroups,
  }
}
