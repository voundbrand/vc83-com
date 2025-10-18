/**
 * TRANSACTION ONTOLOGY - Checkout Session Queries for Payments Window
 *
 * Provides queries for the transactions UI in the payments window.
 * Maps checkout_session data to transaction display format.
 *
 * Features:
 * - List all transactions (completed, pending, failed, abandoned)
 * - Filter by status, transaction type (B2B/B2C), date range
 * - Transaction detail view with full checkout info
 * - Transaction statistics and analytics
 */

import { query } from "./_generated/server";
import { v } from "convex/values";
import { requireAuthenticatedUser } from "./rbacHelpers";
import type { Id } from "./_generated/dataModel";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface TransactionListItem {
  _id: Id<"objects">;
  _creationTime: number;
  status: "completed" | "pending" | "failed" | "abandoned";

  // Customer info
  customerName: string;
  customerEmail: string;
  customerPhone?: string;

  // B2B info
  transactionType: "B2C" | "B2B";
  companyName?: string;
  vatNumber?: string;

  // Financial
  totalAmount: number;
  currency: string;
  subtotal: number;
  taxAmount: number;

  // Payment
  paymentMethod?: string;
  paymentIntentId?: string;

  // Metadata
  completedAt?: number;
  productCount: number;
}

export interface TransactionDetail extends TransactionListItem {
  // Full product list
  selectedProducts: Array<{
    productId: Id<"objects">;
    productName?: string;
    quantity: number;
    pricePerUnit: number;
    totalPrice: number;
  }>;

  // Tax breakdown
  taxDetails?: Array<{
    jurisdiction: string;
    taxName: string;
    taxRate: number;
    taxAmount: number;
  }>;

  // Billing address (B2B)
  billingStreet?: string;
  billingCity?: string;
  billingState?: string;
  billingPostalCode?: string;
  billingCountry?: string;

  // Purchase items (tickets, etc.)
  purchasedItemIds?: string[];

  // CRM integration
  crmContactId?: Id<"objects">;
  crmOrganizationId?: Id<"objects">;

  // Invoice
  invoiceUrl?: string;
}

export interface TransactionStats {
  totalRevenue: number;
  totalTransactions: number;
  completedRevenue: number;
  completedTransactions: number;
  pendingRevenue: number;
  pendingTransactions: number;
  failedTransactions: number;
  abandonedTransactions: number;
  averageTransactionValue: number;

  // B2B stats
  b2bRevenue: number;
  b2bTransactions: number;
  b2cRevenue: number;
  b2cTransactions: number;
}

// ============================================================================
// QUERIES
// ============================================================================

/**
 * GET ORGANIZATION TRANSACTIONS
 *
 * Returns paginated list of checkout sessions (transactions).
 * Supports filtering by status, transaction type, and date range.
 */
export const getOrganizationTransactions = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),

    // Filters
    status: v.optional(v.union(
      v.literal("all"),
      v.literal("completed"),
      v.literal("pending"),
      v.literal("failed"),
      v.literal("abandoned")
    )),
    transactionType: v.optional(v.union(
      v.literal("all"),
      v.literal("B2C"),
      v.literal("B2B")
    )),
    dateFrom: v.optional(v.number()), // Timestamp
    dateTo: v.optional(v.number()), // Timestamp

    // Pagination
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    // Get all checkout sessions for organization
    let sessions = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "checkout_session")
      )
      .collect();

    // Apply status filter
    if (args.status && args.status !== "all") {
      sessions = sessions.filter(s => s.status === args.status);
    }

    // Apply transaction type filter
    if (args.transactionType && args.transactionType !== "all") {
      sessions = sessions.filter(s => {
        const txType = s.customProperties?.transactionType as "B2C" | "B2B" | undefined;
        return txType === args.transactionType;
      });
    }

    // Apply date range filter
    if (args.dateFrom) {
      sessions = sessions.filter(s => s._creationTime >= args.dateFrom!);
    }
    if (args.dateTo) {
      sessions = sessions.filter(s => s._creationTime <= args.dateTo!);
    }

    // Sort by creation time descending (newest first)
    sessions.sort((a, b) => b._creationTime - a._creationTime);

    // Apply pagination
    const offset = args.offset || 0;
    const limit = args.limit || 50;
    const paginatedSessions = sessions.slice(offset, offset + limit);

    // Map to transaction list format
    const transactions: TransactionListItem[] = paginatedSessions.map(session => {
      const props = session.customProperties || {};
      const selectedProducts = (props.selectedProducts as unknown[]) || [];

      return {
        _id: session._id,
        _creationTime: session._creationTime,
        status: (session.status as "completed" | "pending" | "failed" | "abandoned") || "pending",

        customerName: (props.customerName as string) || "Unknown",
        customerEmail: (props.customerEmail as string) || "",
        customerPhone: props.customerPhone as string | undefined,

        transactionType: (props.transactionType as "B2C" | "B2B") || "B2C",
        companyName: props.companyName as string | undefined,
        vatNumber: props.vatNumber as string | undefined,

        totalAmount: (props.totalAmount as number) || 0,
        currency: (props.currency as string) || "usd",
        subtotal: (props.subtotal as number) || 0,
        taxAmount: (props.taxAmount as number) || 0,

        paymentMethod: (props.paymentMethod as string) || "card",
        paymentIntentId: props.paymentIntentId as string | undefined,

        completedAt: props.completedAt as number | undefined,
        productCount: selectedProducts.length,
      };
    });

    return {
      transactions,
      total: sessions.length,
      hasMore: offset + limit < sessions.length,
    };
  },
});

/**
 * GET TRANSACTION DETAIL
 *
 * Returns full details for a single transaction.
 * Includes product names, tax breakdown, billing address, etc.
 */
export const getTransactionDetail = query({
  args: {
    sessionId: v.string(),
    checkoutSessionId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const session = await ctx.db.get(args.checkoutSessionId);
    if (!session || session.type !== "checkout_session") {
      return null;
    }

    const props = session.customProperties || {};
    const selectedProducts = (props.selectedProducts as Array<{productId: Id<"objects">; quantity: number; pricePerUnit: number; totalPrice: number}>) || [];

    // Fetch product names
    const productsWithNames = await Promise.all(
      selectedProducts.map(async (sp) => {
        const product = await ctx.db.get(sp.productId as Id<"objects">);
        return {
          productId: sp.productId,
          productName: product?.name || "Unknown Product",
          quantity: sp.quantity,
          pricePerUnit: sp.pricePerUnit,
          totalPrice: sp.totalPrice,
        };
      })
    );

    const detail: TransactionDetail = {
      _id: session._id,
      _creationTime: session._creationTime,
      status: (session.status as "completed" | "pending" | "failed" | "abandoned") || "pending",

      customerName: (props.customerName as string) || "Unknown",
      customerEmail: (props.customerEmail as string) || "",
      customerPhone: props.customerPhone as string | undefined,

      transactionType: (props.transactionType as "B2C" | "B2B") || "B2C",
      companyName: props.companyName as string | undefined,
      vatNumber: props.vatNumber as string | undefined,

      totalAmount: (props.totalAmount as number) || 0,
      currency: (props.currency as string) || "usd",
      subtotal: (props.subtotal as number) || 0,
      taxAmount: (props.taxAmount as number) || 0,

      paymentMethod: (props.paymentMethod as string) || "card",
      paymentIntentId: props.paymentIntentId as string | undefined,

      completedAt: props.completedAt as number | undefined,
      productCount: selectedProducts.length,

      selectedProducts: productsWithNames,
      taxDetails: props.taxDetails as Array<{
        jurisdiction: string;
        taxName: string;
        taxRate: number;
        taxAmount: number;
      }> | undefined,

      billingStreet: props.billingStreet as string | undefined,
      billingCity: props.billingCity as string | undefined,
      billingState: props.billingState as string | undefined,
      billingPostalCode: props.billingPostalCode as string | undefined,
      billingCountry: props.billingCountry as string | undefined,

      purchasedItemIds: props.purchasedItemIds as string[] | undefined,
      crmContactId: props.crmContactId as Id<"objects"> | undefined,
      crmOrganizationId: props.crmOrganizationId as Id<"objects"> | undefined,
    };

    return detail;
  },
});

/**
 * GET TRANSACTION STATISTICS
 *
 * Returns aggregate statistics for all transactions.
 * Uses organization's currency setting for display.
 */
export const getTransactionStats = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    dateFrom: v.optional(v.number()),
    dateTo: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    // Get organization's currency setting from organization_settings with subtype "locale"
    const localeSettings = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "organization_settings")
      )
      .filter((q) => q.eq(q.field("subtype"), "locale"))
      .first();

    const organizationCurrency = (localeSettings?.customProperties?.currency as string) || "USD";

    // Get all checkout sessions
    let sessions = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "checkout_session")
      )
      .collect();

    // Apply date filter
    if (args.dateFrom) {
      sessions = sessions.filter(s => s._creationTime >= args.dateFrom!);
    }
    if (args.dateTo) {
      sessions = sessions.filter(s => s._creationTime <= args.dateTo!);
    }

    // Calculate stats
    const stats: TransactionStats = {
      totalRevenue: 0,
      totalTransactions: sessions.length,
      completedRevenue: 0,
      completedTransactions: 0,
      pendingRevenue: 0,
      pendingTransactions: 0,
      failedTransactions: 0,
      abandonedTransactions: 0,
      averageTransactionValue: 0,
      b2bRevenue: 0,
      b2bTransactions: 0,
      b2cRevenue: 0,
      b2cTransactions: 0,
    };

    for (const session of sessions) {
      const props = session.customProperties || {};
      const amount = (props.totalAmount as number) || 0;
      const txType = (props.transactionType as "B2C" | "B2B") || "B2C";

      // Total revenue (all statuses)
      stats.totalRevenue += amount;

      // Status-specific stats
      if (session.status === "completed") {
        stats.completedRevenue += amount;
        stats.completedTransactions++;
      } else if (session.status === "pending" || session.status === "active") {
        stats.pendingRevenue += amount;
        stats.pendingTransactions++;
      } else if (session.status === "failed") {
        stats.failedTransactions++;
      } else if (session.status === "abandoned") {
        stats.abandonedTransactions++;
      }

      // B2B/B2C stats (only for completed)
      if (session.status === "completed") {
        if (txType === "B2B") {
          stats.b2bRevenue += amount;
          stats.b2bTransactions++;
        } else {
          stats.b2cRevenue += amount;
          stats.b2cTransactions++;
        }
      }
    }

    // Calculate average
    if (stats.completedTransactions > 0) {
      stats.averageTransactionValue = stats.completedRevenue / stats.completedTransactions;
    }

    return {
      ...stats,
      currency: organizationCurrency, // Include org currency for stats display
    };
  },
});

/**
 * GET TRANSACTION INVOICE URL
 *
 * Returns the invoice PDF URL for a completed transaction.
 * Generates invoice on-demand if not already created.
 */
export const getTransactionInvoice = query({
  args: {
    sessionId: v.string(),
    checkoutSessionId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const session = await ctx.db.get(args.checkoutSessionId);
    if (!session || session.type !== "checkout_session") {
      return null;
    }

    // Check if invoice already generated
    const invoiceUrl = session.customProperties?.invoiceUrl as string | undefined;
    if (invoiceUrl) {
      return { invoiceUrl };
    }

    // TODO: Trigger invoice generation action
    // For now, return null (invoice generation will be added later)
    return null;
  },
});
