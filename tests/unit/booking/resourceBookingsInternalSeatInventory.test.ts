import { describe, expect, it } from "vitest"
import { __testables } from "../../../convex/api/v1/resourceBookingsInternal"

describe("resourceBookingsInternal seat inventory helpers", () => {
  it("normalizes seat selections by group and de-duplicates seats", () => {
    const selections = __testables.normalizeSeatSelections([
      { groupId: "fraukje", seatNumbers: [1, 2, 2] },
      { groupId: "fraukje", seatNumbers: [3] },
      { groupId: "rose", seatNumbers: [1, 4] },
    ])

    expect(selections).toEqual([
      { groupId: "fraukje", seatNumbers: [1, 2, 3] },
      { groupId: "rose", seatNumbers: [1, 4] },
    ])
    expect(__testables.countSelectedSeats(selections)).toBe(5)
  })

  it("builds seat snapshots using participants with deterministic assignment", () => {
    const snapshot = __testables.buildSeatAvailabilitySnapshot({
      groups: [
        { groupId: "fraukje", capacity: 4, label: "Fraukje" },
        { groupId: "rose", capacity: 4, label: "Rose" },
      ],
      bookings: [
        {
          _id: "booking-1" as any,
          status: "confirmed",
          customProperties: {
            participants: 3,
            seatSelections: [{ groupId: "fraukje", seatNumbers: [1, 2] }],
          },
        },
        {
          _id: "booking-2" as any,
          status: "confirmed",
          customProperties: {
            participants: 2,
            seatSelections: [{ groupId: "rose", seatNumbers: [1] }],
          },
        },
      ],
    })

    expect(snapshot.totalCapacity).toBe(8)
    expect(snapshot.bookedParticipants).toBe(5)
    expect(snapshot.remainingCapacity).toBe(3)
    expect(Array.from(snapshot.bookedSeatsByGroup.get("fraukje") || []).sort()).toEqual([1, 2, 3])
    expect(Array.from(snapshot.bookedSeatsByGroup.get("rose") || []).sort()).toEqual([1, 2])
    expect(snapshot.unassignedParticipants).toBe(0)
  })

  it("rejects unavailable seats and strict participant mismatches", () => {
    const bookedSeatsByGroup = new Map<string, Set<number>>([
      ["fraukje", new Set([1])],
      ["rose", new Set<number>()],
    ])
    const groups = [
      { groupId: "fraukje", capacity: 4, label: "Fraukje" },
      { groupId: "rose", capacity: 4, label: "Rose" },
    ]

    expect(() =>
      __testables.validateRequestedSeatSelection({
        selections: [{ groupId: "fraukje", seatNumbers: [1] }],
        groups,
        bookedSeatsByGroup,
        participants: 1,
        strictSeatSelection: true,
      })
    ).toThrow(/no longer available/i)

    expect(() =>
      __testables.validateRequestedSeatSelection({
        selections: [{ groupId: "rose", seatNumbers: [2] }],
        groups,
        bookedSeatsByGroup,
        participants: 2,
        strictSeatSelection: true,
      })
    ).toThrow(/must match participant count/i)

    expect(() =>
      __testables.validateRequestedSeatSelection({
        selections: [{ groupId: "rose", seatNumbers: [2] }],
        groups,
        bookedSeatsByGroup,
        participants: 1,
        strictSeatSelection: true,
      })
    ).not.toThrow()
  })
})
