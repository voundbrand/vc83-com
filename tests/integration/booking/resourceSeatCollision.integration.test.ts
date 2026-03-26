import { describe, expect, it } from "vitest"
import { __testables } from "../../../convex/api/v1/resourceBookingsInternal"

describe("resource seat collision integration", () => {
  it("rejects a second booking attempt for the same seat and slot", () => {
    const groups = [
      { groupId: "fraukje", label: "Fraukje", capacity: 4 },
      { groupId: "rose", label: "Rose", capacity: 4 },
    ]

    const firstBooking = {
      _id: "booking_first" as any,
      status: "confirmed",
      customProperties: {
        participants: 1,
        seatSelections: [{ groupId: "fraukje", seatNumbers: [2] }],
      },
    }

    const snapshotAfterFirst = __testables.buildSeatAvailabilitySnapshot({
      groups,
      bookings: [firstBooking],
    })

    expect(() =>
      __testables.validateRequestedSeatSelection({
        selections: [{ groupId: "fraukje", seatNumbers: [2] }],
        groups,
        bookedSeatsByGroup: snapshotAfterFirst.bookedSeatsByGroup,
        participants: 1,
        strictSeatSelection: true,
      })
    ).toThrow(/no longer available/i)

    expect(() =>
      __testables.validateRequestedSeatSelection({
        selections: [{ groupId: "fraukje", seatNumbers: [3] }],
        groups,
        bookedSeatsByGroup: snapshotAfterFirst.bookedSeatsByGroup,
        participants: 1,
        strictSeatSelection: true,
      })
    ).not.toThrow()
  })
})
