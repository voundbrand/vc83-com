#!/usr/bin/env npx tsx

import { ConvexHttpClient } from "convex/browser"

import { calculateTransactionLineAmounts, type TransactionTaxBehavior } from "../convex/lib/transactionTaxMath"
import { loadWorkspaceEnvCascade } from "./lib/load-workspace-env"

// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
const { api, internal } = require("../convex/_generated/api") as { api: any; internal: any }

type OrgObjectRecord = {
  _id: string
  organizationId: string
  type: string
  subtype?: string | null
  status?: string | null
  name?: string | null
  customProperties?: Record<string, unknown>
}

type TransactionLineItem = Record<string, unknown> & {
  productId?: string
  ticketId?: string
  quantity?: number
  unitPriceInCents?: number
  totalPriceInCents?: number
  taxAmountInCents?: number
  taxRatePercent?: number
  taxBehavior?: TransactionTaxBehavior
}

function getArg(flag: string): string | null {
  const argv = process.argv.slice(2)
  const exact = argv.find((entry) => entry.startsWith(`${flag}=`))
  if (exact) {
    return exact.slice(flag.length + 1)
  }
  const index = argv.indexOf(flag)
  if (index >= 0 && index + 1 < argv.length) {
    return argv[index + 1] || null
  }
  return null
}

function hasFlag(flag: string): boolean {
  return process.argv.slice(2).includes(flag)
}

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null
  }
  const normalized = value.trim()
  return normalized.length > 0 ? normalized : null
}

function normalizeNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.round(value)
  }
  if (typeof value === "string") {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) {
      return Math.round(parsed)
    }
  }
  return null
}

function normalizePositiveQuantity(value: unknown): number {
  const parsed = normalizeNumber(value)
  return parsed && parsed > 0 ? parsed : 1
}

function normalizeTaxBehavior(value: unknown): TransactionTaxBehavior {
  return value === "inclusive" || value === "exclusive" || value === "automatic"
    ? value
    : "exclusive"
}

function listLineItems(record: OrgObjectRecord): TransactionLineItem[] {
  const raw = record.customProperties?.lineItems
  return Array.isArray(raw) ? (raw as TransactionLineItem[]) : []
}

function repairTransactionLineItem(item: TransactionLineItem): TransactionLineItem {
  const quantity = normalizePositiveQuantity(item.quantity)
  const totalPriceInCents = normalizeNumber(item.totalPriceInCents) || 0
  const taxRatePercent = normalizeNumber(item.taxRatePercent) || 0
  const taxBehavior = normalizeTaxBehavior(item.taxBehavior)

  if (taxBehavior !== "inclusive" || taxRatePercent <= 0) {
    return {
      ...item,
      quantity,
      totalPriceInCents,
      taxRatePercent,
    }
  }

  const pricing = calculateTransactionLineAmounts({
    amountInCents: totalPriceInCents,
    quantity,
    taxRatePercent,
    taxBehavior,
    pricePerUnitInCents: Math.round(totalPriceInCents / quantity),
  })

  return {
    ...item,
    quantity,
    unitPriceInCents: pricing.unitPriceInCents,
    totalPriceInCents: pricing.totalPriceInCents,
    taxAmountInCents: pricing.taxAmountInCents,
    taxRatePercent,
    taxBehavior,
  }
}

function computeAggregateTotals(lineItems: TransactionLineItem[]): {
  subtotalInCents: number
  taxAmountInCents: number
  totalInCents: number
} {
  const subtotalInCents = lineItems.reduce(
    (sum, item) =>
      sum + (normalizeNumber(item.totalPriceInCents) || 0) - (normalizeNumber(item.taxAmountInCents) || 0),
    0
  )
  const taxAmountInCents = lineItems.reduce(
    (sum, item) => sum + (normalizeNumber(item.taxAmountInCents) || 0),
    0
  )
  const totalInCents = lineItems.reduce(
    (sum, item) => sum + (normalizeNumber(item.totalPriceInCents) || 0),
    0
  )

  return { subtotalInCents, taxAmountInCents, totalInCents }
}

function lineItemsChanged(
  before: TransactionLineItem[],
  after: TransactionLineItem[]
): boolean {
  return JSON.stringify(before) !== JSON.stringify(after)
}

async function main() {
  const envPath = getArg("--env") || "apps/segelschule-altwarp/.env.local"
  loadWorkspaceEnvCascade(envPath)

  const convexUrl = normalizeOptionalString(process.env.NEXT_PUBLIC_CONVEX_URL || process.env.CONVEX_URL)
  const deployKey = normalizeOptionalString(process.env.CONVEX_DEPLOY_KEY || process.env.DEPLOY_KEY)
  if (!convexUrl || !deployKey) {
    throw new Error("Missing Convex URL or deploy key")
  }

  const explicitOrganizationId =
    getArg("--organization-id")
    || process.env.ORG_ID
    || process.env.NEXT_PUBLIC_ORG_ID
    || null
  const organizationSlug =
    getArg("--organization-slug")
    || process.env.SEGELSCHULE_ORG_SLUG
    || "segelschule-altwarp"
  const apply = hasFlag("--apply")

  const client = new ConvexHttpClient(convexUrl)
  const maybeAdminClient = client as ConvexHttpClient & {
    setAdminAuth?: (token: string) => void
  }
  if (typeof maybeAdminClient.setAdminAuth === "function") {
    maybeAdminClient.setAdminAuth(deployKey)
  }

  const organization = explicitOrganizationId
    ? (await client.query(internal.organizations.getOrgById, {
        organizationId: explicitOrganizationId,
      })) as { _id: string; slug: string; name: string } | null
    : (await client.query(internal.organizations.getOrgBySlug, {
        slug: organizationSlug,
      })) as { _id: string; slug: string; name: string } | null

  if (!organization) {
    throw new Error(
      explicitOrganizationId
        ? `Organization not found for id "${explicitOrganizationId}"`
        : `Organization not found for slug "${organizationSlug}"`
    )
  }

  const transactions = (await client.query(api.ontologyHelpers.getObjects, {
    organizationId: organization._id,
    type: "transaction",
  })) as OrgObjectRecord[]
  const invoices = (await client.query(api.ontologyHelpers.getObjects, {
    organizationId: organization._id,
    type: "invoice",
  })) as OrgObjectRecord[]

  const patchedTransactions: Array<Record<string, unknown>> = []
  const transactionLineItemsById = new Map<string, TransactionLineItem[]>()

  for (const transaction of transactions) {
    const originalLineItems = listLineItems(transaction)
    if (originalLineItems.length === 0) {
      continue
    }

    const repairedLineItems = originalLineItems.map(repairTransactionLineItem)
    const totals = computeAggregateTotals(repairedLineItems)
    const currentSubtotal = normalizeNumber(transaction.customProperties?.subtotalInCents)
    const currentTax = normalizeNumber(transaction.customProperties?.taxAmountInCents)
    const currentTotal = normalizeNumber(transaction.customProperties?.totalInCents)

    const needsPatch =
      lineItemsChanged(originalLineItems, repairedLineItems)
      || currentSubtotal !== totals.subtotalInCents
      || currentTax !== totals.taxAmountInCents
      || currentTotal !== totals.totalInCents

    transactionLineItemsById.set(transaction._id, repairedLineItems)

    if (!needsPatch) {
      continue
    }

    if (apply) {
      await client.mutation(internal.channels.router.patchObjectInternal, {
        objectId: transaction._id,
        customProperties: {
          ...(transaction.customProperties || {}),
          lineItems: repairedLineItems,
          subtotalInCents: totals.subtotalInCents,
          taxAmountInCents: totals.taxAmountInCents,
          totalInCents: totals.totalInCents,
        },
        updatedAt: Date.now(),
      })
    }

    patchedTransactions.push({
      transactionId: transaction._id,
      name: transaction.name || null,
      before: {
        subtotalInCents: currentSubtotal,
        taxAmountInCents: currentTax,
        totalInCents: currentTotal,
      },
      after: totals,
    })
  }

  const patchedInvoices: Array<Record<string, unknown>> = []

  for (const invoice of invoices) {
    const originalLineItems = listLineItems(invoice)
    if (originalLineItems.length === 0) {
      continue
    }

    const repairedLineItems = originalLineItems.map((lineItem) => {
      const transactionId = normalizeOptionalString(lineItem.transactionId)
      const transactionLineItems = transactionId ? transactionLineItemsById.get(transactionId) || [] : []
      if (transactionLineItems.length === 0) {
        return lineItem
      }

      const targetTicketId = normalizeOptionalString(lineItem.ticketId)
      const targetProductId = normalizeOptionalString(lineItem.productId)
      const matchedLineItem =
        transactionLineItems.find((candidate) => (
          targetTicketId
          && normalizeOptionalString(candidate.ticketId) === targetTicketId
        ))
        || transactionLineItems.find((candidate) => (
          targetProductId
          && normalizeOptionalString(candidate.productId) === targetProductId
        ))
        || transactionLineItems[0]

      if (!matchedLineItem) {
        return lineItem
      }

      return {
        ...lineItem,
        quantity: normalizePositiveQuantity(matchedLineItem.quantity),
        unitPriceInCents: normalizeNumber(matchedLineItem.unitPriceInCents) || 0,
        totalPriceInCents: normalizeNumber(matchedLineItem.totalPriceInCents) || 0,
        taxAmountInCents: normalizeNumber(matchedLineItem.taxAmountInCents) || 0,
        taxRatePercent: normalizeNumber(matchedLineItem.taxRatePercent) || 0,
      }
    })

    const totals = computeAggregateTotals(repairedLineItems)
    const currentSubtotal = normalizeNumber(invoice.customProperties?.subtotalInCents)
    const currentTax = normalizeNumber(invoice.customProperties?.taxInCents)
    const currentTotal = normalizeNumber(invoice.customProperties?.totalInCents)
    const needsPatch =
      lineItemsChanged(originalLineItems, repairedLineItems)
      || currentSubtotal !== totals.subtotalInCents
      || currentTax !== totals.taxAmountInCents
      || currentTotal !== totals.totalInCents

    if (!needsPatch) {
      continue
    }

    if (apply) {
      await client.mutation(internal.channels.router.patchObjectInternal, {
        objectId: invoice._id,
        customProperties: {
          ...(invoice.customProperties || {}),
          lineItems: repairedLineItems,
          subtotalInCents: totals.subtotalInCents,
          taxInCents: totals.taxAmountInCents,
          totalInCents: totals.totalInCents,
        },
        updatedAt: Date.now(),
      })
    }

    patchedInvoices.push({
      invoiceId: invoice._id,
      name: invoice.name || null,
      before: {
        subtotalInCents: currentSubtotal,
        taxInCents: currentTax,
        totalInCents: currentTotal,
      },
      after: {
        subtotalInCents: totals.subtotalInCents,
        taxInCents: totals.taxAmountInCents,
        totalInCents: totals.totalInCents,
      },
    })
  }

  console.log(JSON.stringify({
    organization: {
      id: organization._id,
      slug: organization.slug,
      name: organization.name,
    },
    apply,
    patchedTransactions,
    patchedInvoices,
  }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
