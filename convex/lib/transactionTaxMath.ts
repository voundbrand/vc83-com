export type TransactionTaxBehavior = "inclusive" | "exclusive" | "automatic"

export function normalizeRoundedQuantity(quantity: number): number {
  if (!Number.isFinite(quantity)) {
    return 1
  }
  return Math.max(1, Math.round(quantity))
}

export function calculateTransactionLineAmounts(args: {
  amountInCents: number
  quantity: number
  taxRatePercent: number
  taxBehavior: TransactionTaxBehavior
  pricePerUnitInCents?: number
}): {
  unitPriceInCents: number
  subtotalInCents: number
  taxAmountInCents: number
  totalPriceInCents: number
} {
  const quantity = normalizeRoundedQuantity(args.quantity)
  const amountInCents = Number.isFinite(args.amountInCents)
    ? Math.round(args.amountInCents)
    : 0
  const taxRatePercent = Number.isFinite(args.taxRatePercent)
    ? Math.max(0, args.taxRatePercent)
    : 0
  const pricePerUnitInCents = Number.isFinite(args.pricePerUnitInCents)
    ? Math.round(args.pricePerUnitInCents as number)
    : Math.round(amountInCents / quantity)

  if (args.taxBehavior === "inclusive" && taxRatePercent > 0) {
    const unitPriceInCents = Math.round(pricePerUnitInCents / (1 + taxRatePercent / 100))
    const subtotalInCents = unitPriceInCents * quantity
    const taxAmountInCents = amountInCents - subtotalInCents

    return {
      unitPriceInCents,
      subtotalInCents,
      taxAmountInCents,
      totalPriceInCents: amountInCents,
    }
  }

  const unitPriceInCents = Math.round(amountInCents / quantity)
  const subtotalInCents = amountInCents
  const taxAmountInCents = Math.round((amountInCents * taxRatePercent) / 100)

  return {
    unitPriceInCents,
    subtotalInCents,
    taxAmountInCents,
    totalPriceInCents: subtotalInCents + taxAmountInCents,
  }
}
