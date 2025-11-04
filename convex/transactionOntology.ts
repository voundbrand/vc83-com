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

// ============================================================================
// PHASE 1: TRANSACTION CRUD OPERATIONS
// ============================================================================
// Added: 2025-10-31
// Purpose: Universal transaction system for ANY product type (tickets, products, services, etc.)
// replaces checkout-session-based approach with proper transaction records

import { internalMutation, internalQuery } from "./_generated/server";

/**
 * CREATE TRANSACTION (INTERNAL)
 *
 * Internal mutation for creating transactions from payment providers.
 * Stores complete context about the purchase for future invoicing.
 *
 * @param ctx - Mutation context
 * @param args - Transaction details with full product/event/customer context
 * @returns Transaction ID
 */
export const createTransactionInternal = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    subtype: v.string(), // Flexible: "ticket_purchase", "product_purchase", "service_purchase", etc.

    // Product context
    productId: v.id("objects"),
    productName: v.string(),
    productDescription: v.optional(v.string()),
    productSubtype: v.optional(v.string()),

    // Event context (for tickets)
    eventId: v.optional(v.id("objects")),
    eventName: v.optional(v.string()),
    eventLocation: v.optional(v.string()),
    eventStartDate: v.optional(v.number()),
    eventEndDate: v.optional(v.number()),
    eventSponsors: v.optional(v.array(v.object({
      name: v.string(),
      level: v.optional(v.string()),
      logoUrl: v.optional(v.string()),
    }))),

    // Links
    ticketId: v.optional(v.id("objects")),
    checkoutSessionId: v.optional(v.id("objects")),

    // Customer (who receives)
    customerName: v.string(),
    customerEmail: v.string(),
    customerPhone: v.optional(v.string()),
    customerId: v.optional(v.id("objects")),

    // Payer (who pays - may differ in B2B)
    payerType: v.union(v.literal("individual"), v.literal("organization")),
    payerId: v.optional(v.id("objects")),
    crmOrganizationId: v.optional(v.id("objects")),
    employerId: v.optional(v.string()),
    employerName: v.optional(v.string()),

    // Financial
    amountInCents: v.number(),
    currency: v.string(),
    quantity: v.number(),
    taxRatePercent: v.optional(v.number()),

    // Payment
    paymentMethod: v.optional(v.string()),
    paymentStatus: v.optional(v.string()),
    paymentIntentId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Calculate financial details
    const unitPriceInCents = Math.round(args.amountInCents / args.quantity);
    const taxRatePercent = args.taxRatePercent || 0;
    const taxAmountInCents = Math.round((args.amountInCents * taxRatePercent) / 100);
    const totalPriceInCents = args.amountInCents + taxAmountInCents;

    // Get system user for createdBy (transactions created by system, not a specific user)
    const systemUser = await ctx.db
      .query("users")
      .filter(q => q.eq(q.field("email"), "system@l4yercak3.com"))
      .first();

    if (!systemUser) {
      throw new Error("System user not found - run seed script first");
    }

    // Create transaction object
    const transactionId = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "transaction",
      subtype: args.subtype,
      name: `${args.productName} - ${args.customerName}`,
      description: args.productDescription,
      status: "active", // Transaction status (not payment status)
      createdBy: systemUser._id, // Required field for objects table
      customProperties: {
        // Product context
        productId: args.productId,
        productName: args.productName,
        productDescription: args.productDescription,
        productSubtype: args.productSubtype,

        // Event context (for tickets)
        eventId: args.eventId,
        eventName: args.eventName,
        eventLocation: args.eventLocation,
        eventStartDate: args.eventStartDate,
        eventEndDate: args.eventEndDate,
        eventSponsors: args.eventSponsors,

        // Links
        ticketId: args.ticketId,
        checkoutSessionId: args.checkoutSessionId,

        // Customer
        customerName: args.customerName,
        customerEmail: args.customerEmail,
        customerPhone: args.customerPhone,
        customerId: args.customerId,

        // Payer
        payerType: args.payerType,
        payerId: args.payerId,
        crmOrganizationId: args.crmOrganizationId,
        employerId: args.employerId,
        employerName: args.employerName,

        // Financial
        amountInCents: args.amountInCents,
        currency: args.currency,
        quantity: args.quantity,
        unitPriceInCents,
        totalPriceInCents,
        taxRatePercent,
        taxAmountInCents,

        // Status tracking
        invoicingStatus: "pending" as const, // pending | on_draft_invoice | invoiced
        paymentStatus: args.paymentStatus || "pending",
        paymentMethod: args.paymentMethod || "unknown",
        paymentIntentId: args.paymentIntentId,

        // Timestamps
        transactionDate: Date.now(),
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    console.log(`✅ [createTransactionInternal] Created transaction ${transactionId} for ${args.productName}`);

    return transactionId;
  },
});

/**
 * GET TRANSACTION (INTERNAL)
 *
 * Internal query for getting transaction by ID without auth check.
 */
export const getTransactionInternal = internalQuery({
  args: {
    transactionId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.transactionId);
  },
});

/**
 * LIST TRANSACTIONS
 *
 * Query transactions with comprehensive filtering.
 * Used for reporting, invoicing, and transaction management.
 */
export const listTransactions = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),

    // Filters
    invoicingStatus: v.optional(v.union(
      v.literal("pending"),
      v.literal("on_draft_invoice"),
      v.literal("invoiced")
    )),
    paymentStatus: v.optional(v.string()),
    productId: v.optional(v.id("objects")),
    eventId: v.optional(v.id("objects")),
    crmOrganizationId: v.optional(v.id("objects")),
    dateFrom: v.optional(v.number()),
    dateTo: v.optional(v.number()),

    // Pagination
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    // Get all transactions for organization
    let transactions = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "transaction")
      )
      .collect();

    // Apply filters
    if (args.invoicingStatus) {
      transactions = transactions.filter(t =>
        t.customProperties?.invoicingStatus === args.invoicingStatus
      );
    }

    if (args.paymentStatus) {
      transactions = transactions.filter(t =>
        t.customProperties?.paymentStatus === args.paymentStatus
      );
    }

    if (args.productId) {
      transactions = transactions.filter(t =>
        t.customProperties?.productId === args.productId
      );
    }

    if (args.eventId) {
      transactions = transactions.filter(t =>
        t.customProperties?.eventId === args.eventId
      );
    }

    if (args.crmOrganizationId) {
      transactions = transactions.filter(t =>
        t.customProperties?.crmOrganizationId === args.crmOrganizationId
      );
    }

    if (args.dateFrom) {
      transactions = transactions.filter(t =>
        (t.customProperties?.transactionDate as number) >= args.dateFrom!
      );
    }

    if (args.dateTo) {
      transactions = transactions.filter(t =>
        (t.customProperties?.transactionDate as number) <= args.dateTo!
      );
    }

    // Sort by transaction date descending
    transactions.sort((a, b) => {
      const dateA = (a.customProperties?.transactionDate as number) || 0;
      const dateB = (b.customProperties?.transactionDate as number) || 0;
      return dateB - dateA;
    });

    // Apply pagination
    const offset = args.offset || 0;
    const limit = args.limit || 100;
    const paginatedTransactions = transactions.slice(offset, offset + limit);

    return {
      transactions: paginatedTransactions,
      total: transactions.length,
      hasMore: offset + limit < transactions.length,
    };
  },
});

/**
 * MARK TRANSACTIONS AS INVOICED
 *
 * Update invoicing status when transactions are added to an invoice.
 * This mutation is called when sealing an invoice.
 */
export const markTransactionsAsInvoiced = internalMutation({
  args: {
    transactionIds: v.array(v.id("objects")),
    invoiceId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    for (const transactionId of args.transactionIds) {
      const transaction = await ctx.db.get(transactionId);

      if (!transaction || transaction.type !== "transaction") {
        console.error(`❌ [markTransactionsAsInvoiced] Transaction ${transactionId} not found`);
        continue;
      }

      await ctx.db.patch(transactionId, {
        customProperties: {
          ...transaction.customProperties,
          invoicingStatus: "invoiced",
          invoiceId: args.invoiceId,
          invoicedAt: Date.now(),
        },
        updatedAt: Date.now(),
      });

      console.log(`✅ [markTransactionsAsInvoiced] Marked transaction ${transactionId} as invoiced`);
    }
  },
});

/**
 * MARK TRANSACTIONS ON DRAFT INVOICE
 *
 * Update invoicing status when transactions are added to a draft invoice.
 * This is reversible (can be removed from draft).
 */
export const markTransactionsOnDraftInvoice = internalMutation({
  args: {
    transactionIds: v.array(v.id("objects")),
    draftInvoiceId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    for (const transactionId of args.transactionIds) {
      const transaction = await ctx.db.get(transactionId);

      if (!transaction || transaction.type !== "transaction") {
        console.error(`❌ [markTransactionsOnDraftInvoice] Transaction ${transactionId} not found`);
        continue;
      }

      await ctx.db.patch(transactionId, {
        customProperties: {
          ...transaction.customProperties,
          invoicingStatus: "on_draft_invoice",
          draftInvoiceId: args.draftInvoiceId,
        },
        updatedAt: Date.now(),
      });

      console.log(`✅ [markTransactionsOnDraftInvoice] Marked transaction ${transactionId} as on draft invoice`);
    }
  },
});

/**
 * REMOVE TRANSACTIONS FROM DRAFT INVOICE
 *
 * Remove transactions from a draft invoice (back to pending).
 * Used when editing draft invoices.
 */
export const removeTransactionsFromDraftInvoice = internalMutation({
  args: {
    transactionIds: v.array(v.id("objects")),
  },
  handler: async (ctx, args) => {
    for (const transactionId of args.transactionIds) {
      const transaction = await ctx.db.get(transactionId);

      if (!transaction || transaction.type !== "transaction") {
        console.error(`❌ [removeTransactionsFromDraftInvoice] Transaction ${transactionId} not found`);
        continue;
      }

      await ctx.db.patch(transactionId, {
        customProperties: {
          ...transaction.customProperties,
          invoicingStatus: "pending",
          draftInvoiceId: undefined,
        },
        updatedAt: Date.now(),
      });

      console.log(`✅ [removeTransactionsFromDraftInvoice] Removed transaction ${transactionId} from draft invoice`);
    }
  },
});

/**
 * UPDATE TRANSACTION PAYMENT STATUS
 *
 * Update payment status when payment is received/processed.
 */
export const updateTransactionPaymentStatus = internalMutation({
  args: {
    transactionId: v.id("objects"),
    paymentStatus: v.string(),
    paymentDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const transaction = await ctx.db.get(args.transactionId);

    if (!transaction || transaction.type !== "transaction") {
      throw new Error("Transaction not found");
    }

    await ctx.db.patch(args.transactionId, {
      customProperties: {
        ...transaction.customProperties,
        paymentStatus: args.paymentStatus,
        ...(args.paymentDate && { paymentDate: args.paymentDate }),
      },
      updatedAt: Date.now(),
    });

    console.log(`✅ [updateTransactionPaymentStatus] Updated transaction ${args.transactionId} payment status to ${args.paymentStatus}`);

    return args.transactionId;
  },
});

// ============================================================================
// PHASE 2: UI-FACING TRANSACTION QUERIES
// ============================================================================
// Added: 2025-10-31
// Purpose: Public queries for transaction UI (payments window)

/**
 * GET TRANSACTION
 *
 * Public query to get a single transaction by ID.
 * Returns full transaction details for transaction detail modal.
 */
export const getTransaction = query({
  args: {
    sessionId: v.string(),
    transactionId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const transaction = await ctx.db.get(args.transactionId);

    if (!transaction || transaction.type !== "transaction") {
      throw new Error("Transaction not found");
    }

    return transaction;
  },
});

/**
 * GET TRANSACTION STATISTICS (NEW!)
 *
 * Calculate statistics from actual transaction objects (not checkout sessions).
 * Shows revenue, counts, and breakdowns by payment/invoicing status.
 */
export const getTransactionStatsNew = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    dateFrom: v.optional(v.number()),
    dateTo: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    // Get organization's currency setting
    const localeSettings = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "organization_settings")
      )
      .filter((q) => q.eq(q.field("subtype"), "locale"))
      .first();

    const currency = (localeSettings?.customProperties?.currency as string) || "EUR";

    // Get all transactions
    let transactions = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "transaction")
      )
      .collect();

    // Apply date filter
    if (args.dateFrom) {
      transactions = transactions.filter(t =>
        (t.customProperties?.transactionDate as number) >= args.dateFrom!
      );
    }
    if (args.dateTo) {
      transactions = transactions.filter(t =>
        (t.customProperties?.transactionDate as number) <= args.dateTo!
      );
    }

    // Initialize stats
    const stats = {
      // Total
      totalTransactions: transactions.length,
      totalRevenue: 0,

      // By payment status
      completedTransactions: 0,
      completedRevenue: 0,
      pendingTransactions: 0,
      pendingRevenue: 0,

      // By invoicing status
      pendingInvoicing: 0,
      onDraftInvoice: 0,
      invoiced: 0,

      // B2B/B2C
      b2bTransactions: 0,
      b2bRevenue: 0,
      b2cTransactions: 0,
      b2cRevenue: 0,

      // Average
      averageTransactionValue: 0,

      // Currency
      currency,
    };

    // Calculate stats
    for (const tx of transactions) {
      const props = tx.customProperties || {};
      const amount = (props.totalPriceInCents as number) || 0;
      const paymentStatus = props.paymentStatus as string;
      const invoicingStatus = props.invoicingStatus as string;
      const payerType = props.payerType as string;

      // Total revenue
      stats.totalRevenue += amount;

      // Payment status stats
      if (paymentStatus === "paid") {
        stats.completedTransactions++;
        stats.completedRevenue += amount;
      } else if (paymentStatus === "pending" || paymentStatus === "awaiting_employer_payment") {
        stats.pendingTransactions++;
        stats.pendingRevenue += amount;
      }

      // Invoicing status stats
      if (invoicingStatus === "pending") {
        stats.pendingInvoicing++;
      } else if (invoicingStatus === "on_draft_invoice") {
        stats.onDraftInvoice++;
      } else if (invoicingStatus === "invoiced") {
        stats.invoiced++;
      }

      // B2B/B2C stats
      if (payerType === "organization") {
        stats.b2bTransactions++;
        stats.b2bRevenue += amount;
      } else {
        stats.b2cTransactions++;
        stats.b2cRevenue += amount;
      }
    }

    // Calculate average
    if (stats.completedTransactions > 0) {
      stats.averageTransactionValue = Math.round(
        stats.completedRevenue / stats.completedTransactions
      );
    }

    return stats;
  },
});
