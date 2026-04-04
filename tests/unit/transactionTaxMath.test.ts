import { describe, expect, it } from "vitest"

import { calculateTransactionLineAmounts } from "../../convex/lib/transactionTaxMath"

describe("calculateTransactionLineAmounts", () => {
  it("keeps inclusive per-unit rounding internally coherent for 129 EUR x 2", () => {
    const result = calculateTransactionLineAmounts({
      amountInCents: 25_800,
      quantity: 2,
      taxRatePercent: 19,
      taxBehavior: "inclusive",
      pricePerUnitInCents: 12_900,
    })

    expect(result.unitPriceInCents).toBe(10_840)
    expect(result.subtotalInCents).toBe(21_680)
    expect(result.taxAmountInCents).toBe(4_120)
    expect(result.totalPriceInCents).toBe(25_800)
    expect(result.subtotalInCents + result.taxAmountInCents).toBe(result.totalPriceInCents)
  })

  it("preserves standard inclusive pricing for a single item", () => {
    const result = calculateTransactionLineAmounts({
      amountInCents: 7_900,
      quantity: 1,
      taxRatePercent: 19,
      taxBehavior: "inclusive",
      pricePerUnitInCents: 7_900,
    })

    expect(result.unitPriceInCents).toBe(6_639)
    expect(result.subtotalInCents).toBe(6_639)
    expect(result.taxAmountInCents).toBe(1_261)
    expect(result.totalPriceInCents).toBe(7_900)
  })

  it("adds exclusive tax on top of the net subtotal", () => {
    const result = calculateTransactionLineAmounts({
      amountInCents: 13_278,
      quantity: 2,
      taxRatePercent: 19,
      taxBehavior: "exclusive",
      pricePerUnitInCents: 6_639,
    })

    expect(result.unitPriceInCents).toBe(6_639)
    expect(result.subtotalInCents).toBe(13_278)
    expect(result.taxAmountInCents).toBe(2_523)
    expect(result.totalPriceInCents).toBe(15_801)
  })
})
