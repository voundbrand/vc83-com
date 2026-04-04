import { describe, expect, it } from "vitest"

import { deriveInvoiceFromTransaction } from "../../convex/lib/invoiceFromTransaction"

describe("deriveInvoiceFromTransaction", () => {
  it("recomputes invoice totals from transaction line items for inclusive VAT rounding cases", () => {
    const result = deriveInvoiceFromTransaction({
      transactionId: "tx_123" as never,
      customerInfo: {
        name: "Ada Lovelace",
        email: "ada@example.com",
      },
      transactionProps: {
        currency: "EUR",
        subtotalInCents: 21_680,
        taxAmountInCents: 4_119,
        totalInCents: 25_799,
        lineItems: [
          {
            productId: "product_123" as never,
            productName: "Segelschule Schnupperkurs Ticket",
            quantity: 2,
            unitPriceInCents: 10_840,
            taxAmountInCents: 4_120,
            totalPriceInCents: 25_800,
            taxRatePercent: 19,
          },
        ],
      },
    })

    expect(result.source).toBe("line_items")
    expect(result.subtotalInCents).toBe(21_680)
    expect(result.taxInCents).toBe(4_120)
    expect(result.totalInCents).toBe(25_800)
    expect(result.lineItems).toHaveLength(1)
    expect(result.lineItems[0]).toMatchObject({
      quantity: 2,
      unitPriceInCents: 10_840,
      taxAmountInCents: 4_120,
      totalPriceInCents: 25_800,
    })
  })

  it("falls back to legacy single-line transaction fields when line items are absent", () => {
    const result = deriveInvoiceFromTransaction({
      transactionId: "tx_legacy" as never,
      customerInfo: {
        name: "Ada Lovelace",
        email: "ada@example.com",
      },
      transactionProps: {
        currency: "EUR",
        productName: "Legacy Ticket",
        quantity: 1,
        unitPriceInCents: 6_639,
        taxAmountInCents: 1_261,
        totalPriceInCents: 7_900,
        taxRatePercent: 19,
      },
    })

    expect(result.source).toBe("legacy")
    expect(result.subtotalInCents).toBe(6_639)
    expect(result.taxInCents).toBe(1_261)
    expect(result.totalInCents).toBe(7_900)
    expect(result.lineItems[0]).toMatchObject({
      description: "Legacy Ticket",
      quantity: 1,
      unitPriceInCents: 6_639,
      taxAmountInCents: 1_261,
      totalPriceInCents: 7_900,
    })
  })
})
