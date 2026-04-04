import type { Id } from "../_generated/dataModel"

export type InvoiceTransactionLineItem = {
  ticketId?: Id<"objects">
  productId?: Id<"objects">
  productName?: string
  eventName?: string
  eventLocation?: string
  quantity?: number
  unitPriceInCents?: number
  totalPriceInCents?: number
  taxRatePercent?: number
  taxAmountInCents?: number
}

export type InvoiceTransactionProps = {
  lineItems?: InvoiceTransactionLineItem[]
  subtotalInCents?: number
  taxAmountInCents?: number
  totalInCents?: number
  ticketId?: Id<"objects">
  productId?: Id<"objects">
  productName?: string
  eventName?: string
  eventLocation?: string
  customerId?: Id<"objects">
  quantity?: number
  unitPriceInCents?: number
  totalPriceInCents?: number
  taxRatePercent?: number
  currency?: string
}

export type DerivedInvoiceLineItem = {
  transactionId: Id<"objects">
  ticketId?: Id<"objects">
  productId?: Id<"objects">
  description: string
  productName?: string
  eventName?: string
  eventLocation?: string
  customerName?: string
  customerEmail?: string
  customerId?: Id<"objects">
  quantity: number
  unitPriceInCents: number
  totalPriceInCents: number
  taxRatePercent: number
  taxAmountInCents: number
  canEdit: false
  canRemove: false
}

export function deriveInvoiceFromTransaction(args: {
  transactionId: Id<"objects">
  transactionProps: InvoiceTransactionProps
  customerInfo: {
    name: string
    email: string
  }
}): {
  lineItems: DerivedInvoiceLineItem[]
  subtotalInCents: number
  taxInCents: number
  totalInCents: number
  currency: string
  source: "line_items" | "legacy"
} {
  const txProps = args.transactionProps

  if (Array.isArray(txProps.lineItems) && txProps.lineItems.length > 0) {
    const lineItems = txProps.lineItems.map((item) => ({
      transactionId: args.transactionId,
      ticketId: item.ticketId,
      productId: item.productId,
      description: item.productName
        ? `${item.productName}${item.eventName ? ` - ${item.eventName}` : ""}`
        : "Product",
      productName: item.productName,
      eventName: item.eventName,
      eventLocation: item.eventLocation,
      customerName: args.customerInfo.name,
      customerEmail: args.customerInfo.email,
      customerId: txProps.customerId,
      quantity: item.quantity || 1,
      unitPriceInCents: item.unitPriceInCents || 0,
      totalPriceInCents: item.totalPriceInCents || 0,
      taxRatePercent: item.taxRatePercent || 0,
      taxAmountInCents: item.taxAmountInCents || 0,
      canEdit: false as const,
      canRemove: false as const,
    }))

    const subtotalInCents = lineItems.reduce(
      (sum, item) => sum + item.unitPriceInCents * item.quantity,
      0
    )
    const taxInCents = lineItems.reduce(
      (sum, item) => sum + item.taxAmountInCents,
      0
    )
    const totalInCents = lineItems.reduce(
      (sum, item) => sum + item.totalPriceInCents,
      0
    )

    return {
      lineItems,
      subtotalInCents,
      taxInCents,
      totalInCents,
      currency: txProps.currency || "EUR",
      source: "line_items",
    }
  }

  const quantity = txProps.quantity || 1
  const unitPriceInCents = txProps.unitPriceInCents || 0
  const taxAmountInCents = txProps.taxAmountInCents || 0
  const totalPriceInCents = txProps.totalPriceInCents || 0

  const lineItems = [
    {
      transactionId: args.transactionId,
      ticketId: txProps.ticketId,
      productId: txProps.productId,
      description: txProps.productName
        ? `${txProps.productName}${txProps.eventName ? ` - ${txProps.eventName}` : ""}`
        : "Product",
      productName: txProps.productName,
      eventName: txProps.eventName,
      eventLocation: txProps.eventLocation,
      customerName: args.customerInfo.name,
      customerEmail: args.customerInfo.email,
      customerId: txProps.customerId,
      quantity,
      unitPriceInCents,
      totalPriceInCents,
      taxRatePercent: txProps.taxRatePercent || 0,
      taxAmountInCents,
      canEdit: false as const,
      canRemove: false as const,
    },
  ]

  return {
    lineItems,
    subtotalInCents: unitPriceInCents * quantity,
    taxInCents: taxAmountInCents,
    totalInCents: totalPriceInCents,
    currency: txProps.currency || "EUR",
    source: "legacy",
  }
}
