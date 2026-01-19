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
 *
 * Transaction Subtypes:
 * - "ticket_purchase"     - Event ticket purchase
 * - "product_purchase"    - Physical/digital product purchase
 * - "service_purchase"    - Service purchase
 * - "resource_booking"    - Full booking payment (Phase 4)
 * - "booking_deposit"     - Deposit payment for booking (Phase 4)
 * - "booking_balance"     - Remaining balance payment (Phase 4)
 * - "booking_refund"      - Refund for cancelled booking (Phase 4)
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
        currency: (props.currency as string) || "eur",
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
      currency: (props.currency as string) || "eur",
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

    const organizationCurrency = (localeSettings?.customProperties?.currency as string) || "EUR";

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
import { internal } from "./_generated/api";

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

    // ========================================================================
    // NEW STRUCTURE (v2): Multi-line Item Transactions
    // ========================================================================
    // Array of line items (one transaction per checkout)
    lineItems: v.optional(v.array(v.object({
      productId: v.id("objects"),
      productName: v.string(),
      productDescription: v.optional(v.string()),
      productSubtype: v.optional(v.string()),
      quantity: v.number(),
      unitPriceInCents: v.number(),
      totalPriceInCents: v.number(),
      taxRatePercent: v.number(),
      taxAmountInCents: v.number(),
      taxBehavior: v.optional(v.union(v.literal("inclusive"), v.literal("exclusive"), v.literal("automatic"))),
      // Ticket reference
      ticketId: v.optional(v.id("objects")),
      attendeeName: v.optional(v.string()),
      attendeeEmail: v.optional(v.string()),
      ticketNumber: v.optional(v.string()),
      // Event data (full snapshot for PDFs/emails)
      eventId: v.optional(v.id("objects")),
      eventName: v.optional(v.string()),
      eventLocation: v.optional(v.string()),
      eventFormattedAddress: v.optional(v.string()),
      eventGoogleMapsUrl: v.optional(v.string()),
      eventAppleMapsUrl: v.optional(v.string()),
      eventStartDate: v.optional(v.number()),
      eventEndDate: v.optional(v.number()),
      eventTimezone: v.optional(v.string()),
    }))),

    // Aggregate totals (for multi-line transactions)
    subtotalInCents: v.optional(v.number()),
    taxAmountInCents: v.optional(v.number()),
    totalInCents: v.optional(v.number()),

    // ========================================================================
    // LEGACY STRUCTURE (v1): Single Product Per Transaction (DEPRECATED)
    // ========================================================================
    // These fields are kept for backward compatibility with old transaction creation
    productId: v.optional(v.id("objects")),
    productName: v.optional(v.string()),
    productDescription: v.optional(v.string()),
    productSubtype: v.optional(v.string()),

    // Event context (for tickets) - legacy single product
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

    // Links - legacy single product
    ticketId: v.optional(v.id("objects")),

    // Financial - legacy single product
    amountInCents: v.optional(v.number()),
    quantity: v.optional(v.number()),
    taxRatePercent: v.optional(v.number()),

    // ========================================================================
    // COMMON FIELDS (both old and new)
    // ========================================================================
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

    // Currency and payment
    currency: v.string(),
    paymentMethod: v.optional(v.string()),
    paymentStatus: v.optional(v.string()),
    paymentIntentId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get system user for createdBy
    const systemUser = await ctx.db
      .query("users")
      .filter(q => q.eq(q.field("email"), "system@l4yercak3.com"))
      .first();

    if (!systemUser) {
      throw new Error("System user not found - run seed script first");
    }

    // ========================================================================
    // DETECT STRUCTURE: New (lineItems) vs Legacy (single product)
    // ========================================================================
    const isNewStructure = args.lineItems && args.lineItems.length > 0;

    if (isNewStructure) {
      // ====================================================================
      // NEW STRUCTURE (v2): Multi-line Item Transaction
      // ====================================================================
      console.log(`💰 [createTransactionInternal] Creating multi-line transaction with ${args.lineItems!.length} items`);
      console.log(`   Subtotal: €${((args.subtotalInCents || 0) / 100).toFixed(2)}`);
      console.log(`   Tax: €${((args.taxAmountInCents || 0) / 100).toFixed(2)}`);
      console.log(`   Total: €${((args.totalInCents || 0) / 100).toFixed(2)}`);

      // Build transaction name from line items
      const itemCount = args.lineItems!.length;
      const firstProduct = args.lineItems![0].productName;
      const transactionName = itemCount === 1
        ? `${firstProduct} - ${args.customerName}`
        : `${firstProduct} +${itemCount - 1} more - ${args.customerName}`;

      // Create transaction with lineItems array
      const transactionId = await ctx.db.insert("objects", {
        organizationId: args.organizationId,
        type: "transaction",
        subtype: args.subtype,
        name: transactionName,
        description: `Transaction for ${itemCount} product(s)`,
        status: "active",
        createdBy: systemUser._id,
        customProperties: {
          // NEW: Line items array
          lineItems: args.lineItems,

          // NEW: Aggregate totals
          subtotalInCents: args.subtotalInCents,
          taxAmountInCents: args.taxAmountInCents,
          totalInCents: args.totalInCents,

          // Common fields
          checkoutSessionId: args.checkoutSessionId,
          customerName: args.customerName,
          customerEmail: args.customerEmail,
          customerPhone: args.customerPhone,
          customerId: args.customerId,
          payerType: args.payerType,
          payerId: args.payerId,
          crmOrganizationId: args.crmOrganizationId,
          employerId: args.employerId,
          employerName: args.employerName,
          currency: args.currency,
          invoicingStatus: "pending" as const,
          paymentStatus: args.paymentStatus || "pending",
          paymentMethod: args.paymentMethod || "unknown",
          paymentIntentId: args.paymentIntentId,
          transactionDate: Date.now(),
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      console.log(`✅ [createTransactionInternal] Created multi-line transaction ${transactionId}`);
      return transactionId;

    } else {
      // ====================================================================
      // LEGACY STRUCTURE (v1): Single Product Transaction (DEPRECATED)
      // ====================================================================
      console.log(`⚠️  [createTransactionInternal] Using LEGACY single-product structure`);
      console.log(`   Product: ${args.productName}`);

      // Get product to check for product-level tax behavior override
      const product = args.productId ? await ctx.db.get(args.productId) : null;

      // Get organization tax settings as fallback
      const organizationLegal = await ctx.db
        .query("objects")
        .withIndex("by_org_type", (q) =>
          q.eq("organizationId", args.organizationId).eq("type", "organization_legal")
        )
        .first();

      const productTaxBehavior = product?.customProperties?.taxBehavior as "inclusive" | "exclusive" | "automatic" | undefined;
      const orgTaxBehavior = (organizationLegal?.customProperties?.defaultTaxBehavior as "inclusive" | "exclusive" | "automatic") || "exclusive";
      const taxBehavior = productTaxBehavior || orgTaxBehavior;
      const taxRatePercent = args.taxRatePercent || 0;

      // Calculate financial details based on tax behavior
      let unitPriceInCents: number;
      let taxAmountInCents: number;
      let totalPriceInCents: number;

      if (taxBehavior === "inclusive" && taxRatePercent > 0) {
        totalPriceInCents = args.amountInCents || 0;
        const unitGrossPriceInCents = Math.round(totalPriceInCents / (args.quantity || 1));
        const unitNetPriceInCents = Math.round(unitGrossPriceInCents / (1 + taxRatePercent / 100));
        unitPriceInCents = unitNetPriceInCents;
        taxAmountInCents = totalPriceInCents - (unitNetPriceInCents * (args.quantity || 1));
      } else {
        unitPriceInCents = Math.round((args.amountInCents || 0) / (args.quantity || 1));
        taxAmountInCents = Math.round(((args.amountInCents || 0) * taxRatePercent) / 100);
        totalPriceInCents = (args.amountInCents || 0) + taxAmountInCents;
      }

      // Create legacy transaction
      const transactionId = await ctx.db.insert("objects", {
        organizationId: args.organizationId,
        type: "transaction",
        subtype: args.subtype,
        name: `${args.productName} - ${args.customerName}`,
        description: args.productDescription,
        status: "active",
        createdBy: systemUser._id,
        customProperties: {
          // Legacy single product fields
          productId: args.productId,
          productName: args.productName,
          productDescription: args.productDescription,
          productSubtype: args.productSubtype,
          eventId: args.eventId,
          eventName: args.eventName,
          eventLocation: args.eventLocation,
          eventStartDate: args.eventStartDate,
          eventEndDate: args.eventEndDate,
          eventSponsors: args.eventSponsors,
          ticketId: args.ticketId,
          amountInCents: args.amountInCents,
          quantity: args.quantity,
          unitPriceInCents,
          totalPriceInCents,
          taxRatePercent,
          taxAmountInCents,

          // Common fields
          checkoutSessionId: args.checkoutSessionId,
          customerName: args.customerName,
          customerEmail: args.customerEmail,
          customerPhone: args.customerPhone,
          customerId: args.customerId,
          payerType: args.payerType,
          payerId: args.payerId,
          crmOrganizationId: args.crmOrganizationId,
          employerId: args.employerId,
          employerName: args.employerName,
          currency: args.currency,
          invoicingStatus: "pending" as const,
          paymentStatus: args.paymentStatus || "pending",
          paymentMethod: args.paymentMethod || "unknown",
          paymentIntentId: args.paymentIntentId,
          transactionDate: Date.now(),
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      console.log(`✅ [createTransactionInternal] Created legacy transaction ${transactionId}`);
      return transactionId;
    }
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
 * GET TRANSACTION BY CHECKOUT SESSION (INTERNAL)
 *
 * Finds the transaction associated with a checkout session.
 * Used by invoice PDF generation to read all data from transaction.
 */
export const getTransactionByCheckoutSessionInternal = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    checkoutSessionId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    // Query transactions for this organization
    const transactions = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "transaction")
      )
      .collect();

    // Find the one linked to this checkout session
    const transaction = transactions.find(
      (tx) => tx.customProperties?.checkoutSessionId === args.checkoutSessionId
    );

    return transaction || null;
  },
});

/**
 * UPDATE TRANSACTION CUSTOM PROPERTIES (INTERNAL)
 *
 * Internal mutation to add/update customProperties on a transaction.
 * Used to add additional context like seller info, branding, buyer data.
 * Merges with existing customProperties (doesn't replace).
 */
export const updateTransactionCustomProperties = internalMutation({
  args: {
    transactionId: v.id("objects"),
    customProperties: v.record(v.string(), v.any()),
  },
  handler: async (ctx, args) => {
    const transaction = await ctx.db.get(args.transactionId);
    if (!transaction || transaction.type !== "transaction") {
      throw new Error("Transaction not found");
    }

    // Merge new properties with existing
    const existingProps = transaction.customProperties || {};
    const mergedProps = {
      ...existingProps,
      ...args.customProperties,
    };

    await ctx.db.patch(args.transactionId, {
      customProperties: mergedProps,
      updatedAt: Date.now(),
    });

    console.log(`✅ [updateTransactionCustomProperties] Updated transaction ${args.transactionId}`);
    return { success: true };
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

      // Calculate amount - handle NEW format (totalInCents aggregate), lineItems array, or LEGACY format
      let amount = 0;

      // FIRST: Check for NEW aggregate total (fastest and most accurate)
      if (props.totalInCents) {
        amount = props.totalInCents as number;
      }
      // SECOND: Check for lineItems array and sum them
      else {
        const lineItems = props.lineItems;
        if (lineItems && Array.isArray(lineItems) && lineItems.length > 0) {
          amount = (lineItems as Array<{ totalPriceInCents: number }>)
            .reduce((sum, item) => sum + (item.totalPriceInCents || 0), 0);
        } else {
          // LEGACY format: direct field
          amount = (props.totalPriceInCents as number) || 0;
        }
      }

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

// ============================================================================
// PHASE 4: BOOKING TRANSACTION FUNCTIONS
// ============================================================================
// Added: 2026-01
// Purpose: Transaction handling for booking payments (deposits, full, balance, refunds)

/**
 * Booking transaction subtypes for validation
 */
export const BOOKING_TRANSACTION_SUBTYPES = [
  "resource_booking",  // Full booking payment
  "booking_deposit",   // Deposit payment
  "booking_balance",   // Remaining balance payment
  "booking_refund",    // Refund for cancelled booking
] as const;

export type BookingTransactionSubtype = typeof BOOKING_TRANSACTION_SUBTYPES[number];

/**
 * CREATE BOOKING TRANSACTION (INTERNAL)
 *
 * Creates a transaction record for booking payments.
 * Supports full payment, deposit, balance, and refund scenarios.
 *
 * @param ctx - Mutation context
 * @param args - Booking transaction details
 * @returns Transaction ID
 */
export const createBookingTransactionInternal = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    bookingId: v.id("objects"),

    // Transaction type
    subtype: v.union(
      v.literal("resource_booking"),
      v.literal("booking_deposit"),
      v.literal("booking_balance"),
      v.literal("booking_refund")
    ),

    // Resource info
    resourceId: v.id("objects"),
    resourceName: v.string(),
    resourceSubtype: v.optional(v.string()),

    // Booking info
    bookingSubtype: v.string(), // appointment, reservation, rental, class_enrollment
    startDateTime: v.number(),
    endDateTime: v.number(),
    duration: v.number(), // in minutes

    // Location (optional)
    locationId: v.optional(v.id("objects")),
    locationName: v.optional(v.string()),

    // Customer
    customerName: v.string(),
    customerEmail: v.string(),
    customerPhone: v.optional(v.string()),
    customerId: v.optional(v.id("objects")),

    // Financial
    amountInCents: v.number(),
    currency: v.string(),
    taxRatePercent: v.optional(v.number()),

    // Payment details
    paymentMethod: v.optional(v.string()),
    paymentStatus: v.optional(v.string()),
    paymentIntentId: v.optional(v.string()),

    // For refunds
    originalTransactionId: v.optional(v.id("objects")),
    refundReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get system user for createdBy
    const systemUser = await ctx.db
      .query("users")
      .filter(q => q.eq(q.field("email"), "system@l4yercak3.com"))
      .first();

    if (!systemUser) {
      throw new Error("System user not found - run seed script first");
    }

    // Calculate tax
    const taxRatePercent = args.taxRatePercent || 0;
    const taxAmountInCents = Math.round((args.amountInCents * taxRatePercent) / 100);
    const totalInCents = args.amountInCents + taxAmountInCents;

    // Build transaction name
    const subtypeLabels: Record<BookingTransactionSubtype, string> = {
      resource_booking: "Full Payment",
      booking_deposit: "Deposit",
      booking_balance: "Balance",
      booking_refund: "Refund",
    };
    const label = subtypeLabels[args.subtype];
    const transactionName = `${args.resourceName} - ${label} - ${args.customerName}`;

    // Format date for description
    const bookingDate = new Date(args.startDateTime);
    const dateStr = bookingDate.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const timeStr = bookingDate.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });

    console.log(`💰 [createBookingTransactionInternal] Creating ${args.subtype} transaction`);
    console.log(`   Resource: ${args.resourceName}`);
    console.log(`   Amount: €${(args.amountInCents / 100).toFixed(2)}`);
    console.log(`   Customer: ${args.customerName}`);

    const transactionId = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "transaction",
      subtype: args.subtype,
      name: transactionName,
      description: `${args.bookingSubtype} on ${dateStr} at ${timeStr}`,
      status: "active",
      createdBy: systemUser._id,
      customProperties: {
        // Booking reference
        bookingId: args.bookingId,
        bookingSubtype: args.bookingSubtype,
        startDateTime: args.startDateTime,
        endDateTime: args.endDateTime,
        duration: args.duration,

        // Resource
        resourceId: args.resourceId,
        resourceName: args.resourceName,
        resourceSubtype: args.resourceSubtype,

        // Location
        locationId: args.locationId,
        locationName: args.locationName,

        // Customer
        customerName: args.customerName,
        customerEmail: args.customerEmail,
        customerPhone: args.customerPhone,
        customerId: args.customerId,
        payerType: "individual" as const,

        // Financial
        amountInCents: args.amountInCents,
        taxRatePercent,
        taxAmountInCents,
        totalInCents,
        currency: args.currency,

        // Payment
        paymentMethod: args.paymentMethod || "pending",
        paymentStatus: args.paymentStatus || "pending",
        paymentIntentId: args.paymentIntentId,

        // Refund info (if applicable)
        originalTransactionId: args.originalTransactionId,
        refundReason: args.refundReason,

        // Invoicing
        invoicingStatus: "pending" as const,
        transactionDate: Date.now(),
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Link transaction to booking
    await ctx.db.insert("objectLinks", {
      organizationId: args.organizationId,
      fromObjectId: transactionId,
      toObjectId: args.bookingId,
      linkType: "payment_for_booking",
      createdBy: systemUser._id,
      createdAt: Date.now(),
    });

    // Link to original transaction if this is a refund
    if (args.originalTransactionId) {
      await ctx.db.insert("objectLinks", {
        organizationId: args.organizationId,
        fromObjectId: transactionId,
        toObjectId: args.originalTransactionId,
        linkType: "refunds_transaction",
        createdBy: systemUser._id,
        createdAt: Date.now(),
      });
    }

    console.log(`✅ [createBookingTransactionInternal] Created transaction ${transactionId}`);
    return transactionId;
  },
});

/**
 * GET BOOKING TRANSACTIONS
 *
 * Returns all transactions for a specific booking.
 */
export const getBookingTransactions = query({
  args: {
    sessionId: v.string(),
    bookingId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    // Find all transactions linked to this booking
    const links = await ctx.db
      .query("objectLinks")
      .withIndex("by_to_link_type", (q) =>
        q.eq("toObjectId", args.bookingId).eq("linkType", "payment_for_booking")
      )
      .collect();

    const transactions = await Promise.all(
      links.map(async (link) => {
        const tx = await ctx.db.get(link.fromObjectId);
        if (!tx || tx.type !== "transaction") return null;
        return tx;
      })
    );

    // Filter nulls and sort by date (newest first)
    return transactions
      .filter((tx): tx is NonNullable<typeof tx> => tx !== null)
      .sort((a, b) => b._creationTime - a._creationTime);
  },
});

/**
 * GET BOOKING PAYMENT SUMMARY
 *
 * Returns payment summary for a booking (total due, paid, remaining).
 */
export const getBookingPaymentSummary = query({
  args: {
    sessionId: v.string(),
    bookingId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const booking = await ctx.db.get(args.bookingId);
    if (!booking || booking.type !== "booking") {
      throw new Error("Booking not found");
    }

    const props = booking.customProperties as Record<string, unknown>;
    const totalAmountCents = (props.totalAmountCents as number) || 0;
    const depositAmountCents = (props.depositAmountCents as number) || 0;

    // Get all transactions for this booking
    const links = await ctx.db
      .query("objectLinks")
      .withIndex("by_to_link_type", (q) =>
        q.eq("toObjectId", args.bookingId).eq("linkType", "payment_for_booking")
      )
      .collect();

    let paidAmountCents = 0;
    let refundedAmountCents = 0;

    for (const link of links) {
      const tx = await ctx.db.get(link.fromObjectId);
      if (!tx || tx.type !== "transaction") continue;

      const txProps = tx.customProperties as Record<string, unknown>;
      const paymentStatus = txProps.paymentStatus as string;
      const amountInCents = (txProps.amountInCents as number) || 0;

      if (paymentStatus === "paid") {
        if (tx.subtype === "booking_refund") {
          refundedAmountCents += amountInCents;
        } else {
          paidAmountCents += amountInCents;
        }
      }
    }

    const netPaidAmountCents = paidAmountCents - refundedAmountCents;
    const remainingBalanceCents = Math.max(0, totalAmountCents - netPaidAmountCents);

    return {
      totalAmountCents,
      depositAmountCents,
      paidAmountCents: netPaidAmountCents,
      refundedAmountCents,
      remainingBalanceCents,
      isFullyPaid: remainingBalanceCents === 0,
      isDepositPaid: netPaidAmountCents >= depositAmountCents,
    };
  },
});

/**
 * PROCESS BOOKING REFUND (INTERNAL)
 *
 * Creates a refund transaction and updates booking payment status.
 */
export const processBookingRefundInternal = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    bookingId: v.id("objects"),
    refundAmountCents: v.number(),
    reason: v.optional(v.string()),
    originalTransactionId: v.optional(v.id("objects")),
  },
  handler: async (ctx, args): Promise<Id<"objects">> => {
    const booking = await ctx.db.get(args.bookingId);
    if (!booking || booking.type !== "booking") {
      throw new Error("Booking not found");
    }

    const props = booking.customProperties as Record<string, unknown>;

    // Get resource info
    const resourceLinks = await ctx.db
      .query("objectLinks")
      .withIndex("by_from_link_type", (q) =>
        q.eq("fromObjectId", args.bookingId).eq("linkType", "books_resource")
      )
      .first();

    let resourceName = "Resource";
    let resourceId: Id<"objects"> | undefined;
    let resourceSubtype: string | undefined;

    if (resourceLinks) {
      const resource = await ctx.db.get(resourceLinks.toObjectId);
      if (resource) {
        resourceName = resource.name || "Resource";
        resourceId = resource._id;
        resourceSubtype = resource.subtype || undefined;
      }
    }

    // Get location info
    let locationName: string | undefined;
    if (props.locationId) {
      const location = await ctx.db.get(props.locationId as Id<"objects">);
      if (location) {
        locationName = location.name || undefined;
      }
    }

    // Create refund transaction
    const refundTransactionId: Id<"objects"> = await ctx.runMutation(
      internal.transactionOntology.createBookingTransactionInternal,
      {
        organizationId: args.organizationId,
        bookingId: args.bookingId,
        subtype: "booking_refund",
        resourceId: resourceId!,
        resourceName,
        resourceSubtype,
        bookingSubtype: booking.subtype || "appointment",
        startDateTime: props.startDateTime as number,
        endDateTime: props.endDateTime as number,
        duration: props.duration as number,
        locationId: props.locationId as Id<"objects"> | undefined,
        locationName,
        customerName: props.customerName as string,
        customerEmail: props.customerEmail as string,
        customerPhone: props.customerPhone as string | undefined,
        customerId: props.customerId as Id<"objects"> | undefined,
        amountInCents: args.refundAmountCents,
        currency: "EUR", // TODO: Get from org settings
        paymentStatus: "paid", // Refunds are immediately marked as processed
        originalTransactionId: args.originalTransactionId,
        refundReason: args.reason,
      }
    );

    // Update booking's refund amount
    const currentRefundAmount = (props.refundAmountCents as number) || 0;
    await ctx.db.patch(args.bookingId, {
      customProperties: {
        ...props,
        refundAmountCents: currentRefundAmount + args.refundAmountCents,
      },
      updatedAt: Date.now(),
    });

    console.log(`💸 [processBookingRefundInternal] Processed refund of €${(args.refundAmountCents / 100).toFixed(2)} for booking ${args.bookingId}`);

    return refundTransactionId;
  },
});

/**
 * UPDATE BOOKING PAYMENT STATUS (INTERNAL)
 *
 * Updates the paidAmountCents on a booking after a successful payment.
 */
export const updateBookingPaymentInternal = internalMutation({
  args: {
    bookingId: v.id("objects"),
    paidAmountCents: v.number(),
    transactionId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const booking = await ctx.db.get(args.bookingId);
    if (!booking || booking.type !== "booking") {
      throw new Error("Booking not found");
    }

    const props = booking.customProperties as Record<string, unknown>;
    const currentPaid = (props.paidAmountCents as number) || 0;
    const newPaid = currentPaid + args.paidAmountCents;

    await ctx.db.patch(args.bookingId, {
      customProperties: {
        ...props,
        paidAmountCents: newPaid,
        transactionId: args.transactionId,
      },
      updatedAt: Date.now(),
    });

    console.log(`💳 [updateBookingPaymentInternal] Updated booking ${args.bookingId} paid amount to €${(newPaid / 100).toFixed(2)}`);

    return { bookingId: args.bookingId, paidAmountCents: newPaid };
  },
});
