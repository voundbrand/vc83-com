import { describe, expect, it } from "vitest"
import {
  buildCheckoutMetadata,
  buildSeatInventoryFromBoats,
  mapToResourceSeatSelections,
  __testables,
} from "../../../apps/segelschule-altwarp/lib/booking-runtime-contracts"

describe("segelschule booking runtime contracts", () => {
  it("builds strict seat inventory from boats", () => {
    const seatInventory = buildSeatInventoryFromBoats({
      boats: [
        { id: "fraukje", name: "Fraukje", seatCount: 4 },
        { id: "rose", name: "Rose", seatCount: 4 },
      ],
    })

    expect(seatInventory).toEqual({
      groups: [
        { groupId: "fraukje", label: "Fraukje", capacity: 4 },
        { groupId: "rose", label: "Rose", capacity: 4 },
      ],
      strictSeatSelection: true,
    })
  })

  it("maps boat seat selections to resource seat selections", () => {
    const mapped = mapToResourceSeatSelections([
      { boatId: "rose", boatName: "Rose", seatNumbers: [4, 1] },
      { boatId: "fraukje", boatName: "Fraukje", seatNumbers: [2] },
    ])

    expect(mapped).toEqual([
      { groupId: "rose", seatNumbers: [1, 4] },
      { groupId: "fraukje", seatNumbers: [2] },
    ])
  })

  it("builds deterministic checkout metadata including seat signature", () => {
    const metadata = buildCheckoutMetadata({
      bookingId: "booking_123",
      courseId: "schnupper",
      courseName: "Taster course",
      date: "2026-04-10",
      time: "09:00",
      participants: 3,
      language: "de",
      seatSelections: [
        { boatId: "rose", boatName: "Rose", seatNumbers: [3, 1] },
        { boatId: "fraukje", boatName: "Fraukje", seatNumbers: [2] },
      ],
      frontendUserId: "frontend_1",
      platformBookingId: "booking_platform_1",
    })

    expect(metadata).toEqual({
      source: "segelschule_landing_booking",
      bookingId: "booking_123",
      courseId: "schnupper",
      courseName: "Taster course",
      date: "2026-04-10",
      time: "09:00",
      participants: "3",
      language: "de",
      seatSelections: "fraukje:2|rose:1,3",
      frontendUserId: "frontend_1",
      platformBookingId: "booking_platform_1",
    })
  })

  it("creates stable seat signatures independent of source order", () => {
    const signatureA = __testables.normalizeSeatSelectionSignature([
      { boatId: "rose", boatName: "Rose", seatNumbers: [4, 2] },
      { boatId: "fraukje", boatName: "Fraukje", seatNumbers: [1] },
    ])
    const signatureB = __testables.normalizeSeatSelectionSignature([
      { boatId: "fraukje", boatName: "Fraukje", seatNumbers: [1] },
      { boatId: "rose", boatName: "Rose", seatNumbers: [2, 4] },
    ])

    expect(signatureA).toBe("fraukje:1|rose:2,4")
    expect(signatureB).toBe("fraukje:1|rose:2,4")
  })
})
