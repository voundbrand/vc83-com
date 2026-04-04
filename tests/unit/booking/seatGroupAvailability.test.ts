import { describe, expect, it } from "vitest"
import { resolveSlotSeatInventory } from "../../../apps/segelschule-altwarp/lib/seat-group-availability"

describe("seat-group availability", () => {
  it("filters seat groups down to the linked availability carriers that are open for the slot", async () => {
    const queryInternalFn = async (
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      _convex: any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      _queryRef: any,
      args: Record<string, unknown>
    ) => {
      if (args.objectId === "resource_course_1") {
        return {
          _id: "resource_course_1",
          customProperties: {
            seatInventory: {
              groups: [
                {
                  groupId: "fraukje",
                  label: "Fraukje",
                  capacity: 4,
                  availabilityResourceId: "boat_fraukje",
                },
                {
                  groupId: "rose",
                  label: "Rose",
                  capacity: 4,
                  availabilityResourceId: "boat_rose",
                },
              ],
            },
          },
        }
      }
      if (args.resourceId === "boat_fraukje") {
        return { hasConflict: true, reason: "Outside configured availability" }
      }
      if (args.resourceId === "boat_rose") {
        return { hasConflict: false, reason: null }
      }
      throw new Error(`Unexpected query args: ${JSON.stringify(args)}`)
    }

    const resolution = await resolveSlotSeatInventory({
      convex: {},
      queryInternalFn,
      generatedInternalApi: {
        channels: { router: { getObjectByIdInternal: "getObjectByIdInternal" } },
        availabilityOntology: { checkConflictByModel: "checkConflictByModel" },
      },
      organizationId: "org_123",
      bookingResourceId: "resource_course_1",
      boats: [
        { id: "fraukje", name: "Fraukje", seatCount: 4 },
        { id: "rose", name: "Rose", seatCount: 4 },
      ],
      startDateTime: Date.parse("2026-04-10T09:00:00.000Z"),
      endDateTime: Date.parse("2026-04-10T12:00:00.000Z"),
      timezone: "Europe/Berlin",
    })

    expect(resolution.availableBoats).toEqual([
      { id: "rose", name: "Rose", seatCount: 4 },
    ])
    expect(resolution.seatInventory).toEqual({
      groups: [{ groupId: "rose", label: "Rose", capacity: 4 }],
      strictSeatSelection: true,
    })
    expect(resolution.availableGroupIds).toEqual(["rose"])
    expect(resolution.unavailableGroupIds).toEqual(["fraukje"])
    expect(resolution.hasLinkedAvailabilityGroups).toBe(true)
  })

  it("falls back to all runtime boats when no seat groups carry linked availability resources", async () => {
    const queryInternalFn = async (
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      _convex: any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      _queryRef: any,
      args: Record<string, unknown>
    ) => {
      if (args.objectId === "resource_course_1") {
        return {
          _id: "resource_course_1",
          customProperties: {
            seatInventory: {
              groups: [
                { groupId: "fraukje", label: "Fraukje", capacity: 4 },
                { groupId: "rose", label: "Rose", capacity: 4 },
              ],
            },
          },
        }
      }
      throw new Error(`Unexpected query args: ${JSON.stringify(args)}`)
    }

    const resolution = await resolveSlotSeatInventory({
      convex: {},
      queryInternalFn,
      generatedInternalApi: {
        channels: { router: { getObjectByIdInternal: "getObjectByIdInternal" } },
        availabilityOntology: { checkConflictByModel: "checkConflictByModel" },
      },
      organizationId: "org_123",
      bookingResourceId: "resource_course_1",
      boats: [
        { id: "fraukje", name: "Fraukje", seatCount: 4 },
        { id: "rose", name: "Rose", seatCount: 4 },
      ],
      startDateTime: Date.parse("2026-04-10T09:00:00.000Z"),
      endDateTime: Date.parse("2026-04-10T12:00:00.000Z"),
      timezone: "Europe/Berlin",
    })

    expect(resolution.availableBoats).toEqual([
      { id: "fraukje", name: "Fraukje", seatCount: 4 },
      { id: "rose", name: "Rose", seatCount: 4 },
    ])
    expect(resolution.availableGroupIds).toEqual(["fraukje", "rose"])
    expect(resolution.unavailableGroupIds).toEqual([])
    expect(resolution.hasLinkedAvailabilityGroups).toBe(false)
  })
})
