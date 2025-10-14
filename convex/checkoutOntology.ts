/**
 * CHECKOUT SYSTEM - ONTOLOGY OBJECTS
 *
 * Phase 1: Core checkout backend using the ontology pattern
 *
 * This file defines the checkout_product pattern and related helpers.
 * All checkout data is stored as ontology objects for maximum flexibility.
 */

import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * CHECKOUT_PRODUCT OBJECT TYPE
 *
 * Makes ANY ontology object sellable by wrapping it with payment configuration.
 *
 * Example for Event Tickets:
 * {
 *   type: "checkout_product",
 *   subtype: "ticket",
 *   name: "VIP Pass - L4YERCAK3 Live 2024",
 *   status: "published",
 *   customProperties: {
 *     linkedObjectId: "ticket_type_id",
 *     linkedObjectType: "ticket_type",
 *
 *     // Pricing
 *     priceInCents: 49900,  // $499.00
 *     currency: "usd",
 *     taxBehavior: "exclusive",
 *
 *     // Publishing
 *     publicSlug: "vip-pass-2024",
 *     isPublished: true,
 *     publishedAt: 1234567890,
 *
 *     // Stock/Limits
 *     stockEnabled: true,
 *     stockQuantity: 100,
 *     stockRemaining: 42,
 *
 *     // Behavior
 *     fulfillmentType: "ticket",  // Routes to ticket creation handler
 *     requiresShipping: false,
 *     digitalDelivery: true,
 *
 *     // SEO/Marketing
 *     metaTitle: "VIP Pass - Exclusive Access",
 *     metaDescription: "Get VIP access to L4YERCAK3 Live 2024",
 *     previewImageUrl: "https://...",
 *   }
 * }
 */

/**
 * CHECKOUT_SESSION OBJECT TYPE
 *
 * Tracks a specific checkout attempt/payment.
 *
 * Example:
 * {
 *   type: "checkout_session",
 *   subtype: "stripe",
 *   name: "Session for VIP Pass",
 *   status: "pending" | "completed" | "expired" | "cancelled",
 *   customProperties: {
 *     checkoutProductId: "checkout_product_id",
 *
 *     // Stripe integration
 *     stripeSessionId: "cs_test_...",
 *     stripePaymentIntentId: "pi_...",
 *
 *     // Customer info
 *     customerEmail: "customer@example.com",
 *     customerName: "John Doe",
 *
 *     // Payment details
 *     amountTotal: 49900,
 *     amountSubtotal: 49900,
 *     currency: "usd",
 *
 *     // Session lifecycle
 *     expiresAt: 1234567890,
 *     completedAt: 1234567890,
 *
 *     // Fulfillment tracking
 *     fulfilledAt: 1234567890,
 *     fulfillmentStatus: "pending" | "fulfilled" | "failed",
 *     createdObjectId: "ticket_id",  // The created ticket/invoice/etc.
 *   }
 * }
 */

/**
 * PAYMENT_TRANSACTION OBJECT TYPE
 *
 * Records completed payments for accounting/reporting.
 *
 * Example:
 * {
 *   type: "payment_transaction",
 *   subtype: "stripe",
 *   name: "Payment for VIP Pass",
 *   status: "succeeded" | "refunded" | "disputed",
 *   customProperties: {
 *     checkoutSessionId: "checkout_session_id",
 *     checkoutProductId: "checkout_product_id",
 *
 *     // Stripe details
 *     stripeChargeId: "ch_...",
 *     stripePaymentIntentId: "pi_...",
 *
 *     // Money details
 *     amountTotal: 49900,
 *     currency: "usd",
 *     netAmount: 47900,  // After Stripe fees
 *     feeAmount: 2000,
 *
 *     // Payment method
 *     paymentMethodType: "card",
 *     cardLast4: "4242",
 *     cardBrand: "visa",
 *
 *     // Accounting
 *     paidAt: 1234567890,
 *     refundedAt: 1234567890,
 *     refundAmount: 0,
 *   }
 * }
 */

// ============================================================================
// CHECKOUT_PRODUCT OPERATIONS
// ============================================================================

/**
 * CREATE CHECKOUT PRODUCT
 * Wrap an existing object to make it sellable
 */
export const createCheckoutProduct = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    linkedObjectId: v.id("objects"),
    linkedObjectType: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    priceInCents: v.number(),
    currency: v.string(),
    publicSlug: v.string(),
    isPublished: v.optional(v.boolean()),
    customProperties: v.optional(v.record(v.string(), v.any())),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .filter(q => q.eq(q.field("_id"), args.sessionId))
      .first();

    if (!session) throw new Error("Invalid session");

    // Check if linked object exists
    const linkedObject = await ctx.db.get(args.linkedObjectId);
    if (!linkedObject) throw new Error("Linked object not found");

    // Determine fulfillment type from linked object
    const fulfillmentType = linkedObject.type; // e.g., "ticket_type" → "ticket"

    // Create checkout_product object
    const productId = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "checkout_product",
      subtype: args.linkedObjectType,
      name: args.name,
      description: args.description,
      status: args.isPublished ? "published" : "draft",
      customProperties: {
        linkedObjectId: args.linkedObjectId,
        linkedObjectType: args.linkedObjectType,
        priceInCents: args.priceInCents,
        currency: args.currency,
        publicSlug: args.publicSlug,
        isPublished: args.isPublished ?? false,
        publishedAt: args.isPublished ? Date.now() : undefined,
        fulfillmentType,
        ...args.customProperties,
      },
      createdBy: session.userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Create link from checkout_product → template object
    await ctx.db.insert("objectLinks", {
      organizationId: args.organizationId,
      fromObjectId: productId,
      toObjectId: args.linkedObjectId,
      linkType: "sells",
      createdBy: session.userId,
      createdAt: Date.now(),
    });

    return productId;
  },
});

/**
 * GET CHECKOUT PRODUCTS
 * List all checkout products for an organization
 */
export const getCheckoutProducts = query({
  args: {
    organizationId: v.id("organizations"),
    status: v.optional(v.string()),
  },
  handler: async (ctx, { organizationId, status }) => {
    const query = ctx.db
      .query("objects")
      .withIndex("by_org_type", q =>
        q.eq("organizationId", organizationId)
         .eq("type", "checkout_product")
      );

    let products = await query.collect();

    if (status) {
      products = products.filter(p => p.status === status);
    }

    return products;
  },
});

/**
 * GET CHECKOUT PRODUCT BY SLUG
 * For public checkout pages
 */
export const getCheckoutProductBySlug = query({
  args: {
    organizationId: v.id("organizations"),
    slug: v.string(),
  },
  handler: async (ctx, { organizationId, slug }) => {
    const products = await ctx.db
      .query("objects")
      .withIndex("by_org_type", q =>
        q.eq("organizationId", organizationId)
         .eq("type", "checkout_product")
      )
      .collect();

    return products.find(p =>
      p.customProperties?.publicSlug === slug &&
      p.status === "published"
    );
  },
});

/**
 * UPDATE CHECKOUT PRODUCT
 * Modify pricing, publishing status, etc.
 */
export const updateCheckoutProduct = mutation({
  args: {
    sessionId: v.string(),
    productId: v.id("objects"),
    updates: v.object({
      name: v.optional(v.string()),
      description: v.optional(v.string()),
      status: v.optional(v.string()),
      customProperties: v.optional(v.record(v.string(), v.any())),
    }),
  },
  handler: async (ctx, { productId, updates }) => {
    const product = await ctx.db.get(productId);
    if (!product || product.type !== "checkout_product") {
      throw new Error("Invalid checkout product");
    }

    await ctx.db.patch(productId, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});

// ============================================================================
// CHECKOUT_SESSION OPERATIONS
// ============================================================================

/**
 * CREATE CHECKOUT SESSION
 * Start a new payment flow
 */
export const createCheckoutSession = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    checkoutProductId: v.id("objects"),
    customerEmail: v.optional(v.string()),
    customerName: v.optional(v.string()),
    metadata: v.optional(v.record(v.string(), v.any())),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .filter(q => q.eq(q.field("_id"), args.sessionId))
      .first();

    if (!session) throw new Error("Invalid session");

    // Get checkout product
    const product = await ctx.db.get(args.checkoutProductId);
    if (!product || product.type !== "checkout_product") {
      throw new Error("Invalid checkout product");
    }

    // Calculate expiration (30 minutes from now)
    const expiresAt = Date.now() + 30 * 60 * 1000;

    // Create checkout_session object
    const checkoutSessionId = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "checkout_session",
      subtype: "stripe",
      name: `Session for ${product.name}`,
      status: "pending",
      customProperties: {
        checkoutProductId: args.checkoutProductId,
        customerEmail: args.customerEmail,
        customerName: args.customerName,
        amountTotal: product.customProperties?.priceInCents,
        currency: product.customProperties?.currency ?? "usd",
        expiresAt,
        fulfillmentStatus: "pending",
        ...args.metadata,
      },
      createdBy: session.userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Create link from session → product
    await ctx.db.insert("objectLinks", {
      organizationId: args.organizationId,
      fromObjectId: checkoutSessionId,
      toObjectId: args.checkoutProductId,
      linkType: "purchases",
      createdBy: session.userId,
      createdAt: Date.now(),
    });

    return checkoutSessionId;
  },
});

/**
 * GET CHECKOUT SESSIONS
 * List sessions for a product or organization
 */
export const getCheckoutSessions = query({
  args: {
    organizationId: v.id("organizations"),
    productId: v.optional(v.id("objects")),
    status: v.optional(v.string()),
  },
  handler: async (ctx, { organizationId, productId, status }) => {
    const query = ctx.db
      .query("objects")
      .withIndex("by_org_type", q =>
        q.eq("organizationId", organizationId)
         .eq("type", "checkout_session")
      );

    let sessions = await query.collect();

    if (productId) {
      sessions = sessions.filter(s =>
        s.customProperties?.checkoutProductId === productId
      );
    }

    if (status) {
      sessions = sessions.filter(s => s.status === status);
    }

    return sessions;
  },
});

/**
 * COMPLETE CHECKOUT SESSION
 * Mark session as completed after successful payment
 */
export const completeCheckoutSession = mutation({
  args: {
    sessionId: v.string(),
    checkoutSessionId: v.id("objects"),
    stripePaymentIntentId: v.string(),
    metadata: v.optional(v.record(v.string(), v.any())),
  },
  handler: async (ctx, { checkoutSessionId, stripePaymentIntentId, metadata }) => {
    const checkoutSession = await ctx.db.get(checkoutSessionId);
    if (!checkoutSession || checkoutSession.type !== "checkout_session") {
      throw new Error("Invalid checkout session");
    }

    await ctx.db.patch(checkoutSessionId, {
      status: "completed",
      customProperties: {
        ...checkoutSession.customProperties,
        stripePaymentIntentId,
        completedAt: Date.now(),
        ...metadata,
      },
      updatedAt: Date.now(),
    });

    return checkoutSessionId;
  },
});

// ============================================================================
// PAYMENT_TRANSACTION OPERATIONS
// ============================================================================

/**
 * CREATE PAYMENT TRANSACTION
 * Record a completed payment
 */
export const createPaymentTransaction = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    checkoutSessionId: v.id("objects"),
    stripeChargeId: v.string(),
    amountTotal: v.number(),
    currency: v.string(),
    paymentMethodType: v.string(),
    metadata: v.optional(v.record(v.string(), v.any())),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .filter(q => q.eq(q.field("_id"), args.sessionId))
      .first();

    if (!session) throw new Error("Invalid session");

    // Get checkout session
    const checkoutSession = await ctx.db.get(args.checkoutSessionId);
    if (!checkoutSession || checkoutSession.type !== "checkout_session") {
      throw new Error("Invalid checkout session");
    }

    // Create transaction object
    const transactionId = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "payment_transaction",
      subtype: "stripe",
      name: `Payment for ${checkoutSession.name}`,
      status: "succeeded",
      customProperties: {
        checkoutSessionId: args.checkoutSessionId,
        checkoutProductId: checkoutSession.customProperties?.checkoutProductId,
        stripeChargeId: args.stripeChargeId,
        amountTotal: args.amountTotal,
        currency: args.currency,
        paymentMethodType: args.paymentMethodType,
        paidAt: Date.now(),
        ...args.metadata,
      },
      createdBy: session.userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Create link from transaction → session
    await ctx.db.insert("objectLinks", {
      organizationId: args.organizationId,
      fromObjectId: transactionId,
      toObjectId: args.checkoutSessionId,
      linkType: "pays_for",
      createdBy: session.userId,
      createdAt: Date.now(),
    });

    return transactionId;
  },
});

/**
 * GET PAYMENT TRANSACTIONS
 * List transactions for reporting
 */
export const getPaymentTransactions = query({
  args: {
    organizationId: v.id("organizations"),
    status: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { organizationId, status, limit }) => {
    const query = ctx.db
      .query("objects")
      .withIndex("by_org_type", q =>
        q.eq("organizationId", organizationId)
         .eq("type", "payment_transaction")
      );

    let transactions = await query.collect();

    if (status) {
      transactions = transactions.filter(t => t.status === status);
    }

    // Sort by creation date descending
    transactions.sort((a, b) => b.createdAt - a.createdAt);

    if (limit) {
      transactions = transactions.slice(0, limit);
    }

    return transactions;
  },
});

// ============================================================================
// FULFILLMENT ROUTING
// ============================================================================

/**
 * FULFILL CHECKOUT
 * Routes to type-specific fulfillment handler
 *
 * This is called after payment succeeds to create the actual deliverable
 * (ticket, mark invoice paid, send digital download, etc.)
 */
export const fulfillCheckout = mutation({
  args: {
    sessionId: v.string(),
    checkoutSessionId: v.id("objects"),
  },
  handler: async (ctx, { checkoutSessionId }) => {
    const checkoutSession = await ctx.db.get(checkoutSessionId);
    if (!checkoutSession || checkoutSession.type !== "checkout_session") {
      throw new Error("Invalid checkout session");
    }

    // Get the checkout product
    const productId = checkoutSession.customProperties?.checkoutProductId as string;
    const product = await ctx.db
      .query("objects")
      .filter(q => q.eq(q.field("_id"), productId))
      .first();

    if (!product || product.type !== "checkout_product") {
      throw new Error("Invalid checkout product");
    }

    const fulfillmentType = product.customProperties?.fulfillmentType;

    // Route to type-specific handler
    // TODO: Implement actual fulfillment handlers in Phase 5
    switch (fulfillmentType) {
      case "ticket_type":
        // Create ticket object with QR code, ticket number, etc.
        throw new Error("Ticket fulfillment not yet implemented");

      case "invoice":
        // Mark invoice as paid
        throw new Error("Invoice fulfillment not yet implemented");

      case "digital_product":
        // Send download link
        throw new Error("Digital product fulfillment not yet implemented");

      default:
        throw new Error(`Unknown fulfillment type: ${fulfillmentType}`);
    }
  },
});
