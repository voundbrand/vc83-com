/**
 * PURCHASE ONTOLOGY - Generic Purchase/Order Items
 *
 * Product-agnostic purchase records. This is the unified way to track
 * what customers bought, regardless of product type (ticket, service, download, etc.)
 *
 * Object Types:
 * - purchase_item: A single purchased item (quantity 1)
 *
 * Architecture:
 * checkout_session (cart)
 *   └─> purchase_item (generic purchase record)
 *         └─> fulfillment hooks (product-specific):
 *             ├─> ticket (for events - grants access)
 *             ├─> subscription (for services - ongoing access)
 *             ├─> download_link (for digital - generate download)
 *             └─> shipment_order (for physical - create shipping)
 *
 * Workflow:
 * 1. Payment succeeds → Create purchase_item(s) from checkout_session
 * 2. Based on product.subtype, trigger fulfillment:
 *    - ticket → Create event ticket for access control
 *    - service → Create subscription with billing cycle
 *    - download → Generate secure download link
 *    - physical → Create shipment order
 * 3. Link purchase_item to fulfillment object
 * 4. Track fulfillment status (pending → fulfilled → delivered)
 */

import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAuthenticatedUser } from "./rbacHelpers";
import type { Id } from "./_generated/dataModel";

// ============================================================================
// PURCHASE_ITEM OPERATIONS
// ============================================================================

/**
 * PURCHASE_ITEM OBJECT TYPE
 *
 * Generic purchase record that works for ANY product type.
 *
 * Example (Event Ticket):
 * {
 *   type: "purchase_item",
 *   subtype: "ticket",
 *   organizationId,
 *   name: "General Admission - L4YERCAK3 Live 2024",
 *
 *   // Purchase context
 *   checkoutSessionId: "checkout_session_id",
 *   productId: "product_id",
 *   quantity: 1, // Always 1 per purchase_item
 *   pricePerUnit: 5000, // cents
 *   totalPrice: 5000,
 *
 *   // Buyer info (copied from checkout_session for convenience)
 *   buyerEmail: "customer@example.com",
 *   buyerName: "John Doe",
 *   buyerPhone: "+1234567890",
 *
 *   // Fulfillment tracking
 *   fulfillmentType: "ticket", // ticket | subscription | download | shipment
 *   fulfillmentStatus: "fulfilled", // pending | fulfilled | failed | cancelled
 *   fulfillmentData: {
 *     ticketId: "ticket_id", // Link to fulfillment object
 *     ticketCode: "ABC-123-XYZ",
 *     eventId: "event_id",
 *     eventDate: 1234567890,
 *   },
 *
 *   // Dates
 *   purchasedAt: 1234567890,
 *   fulfilledAt: 1234567890,
 *   expiresAt: 1234567890, // If applicable
 * }
 *
 * Example (Service Subscription):
 * {
 *   type: "purchase_item",
 *   subtype: "subscription",
 *   fulfillmentType: "subscription",
 *   fulfillmentData: {
 *     subscriptionId: "subscription_id",
 *     billingCycle: "monthly",
 *     nextBillingDate: 1234567890,
 *     autoRenew: true,
 *   }
 * }
 *
 * Example (Digital Download):
 * {
 *   type: "purchase_item",
 *   subtype: "download",
 *   fulfillmentType: "download",
 *   fulfillmentData: {
 *     downloadUrl: "https://...",
 *     downloadToken: "secure_token",
 *     downloadLimit: 5,
 *     downloadCount: 0,
 *     expiresAt: 1234567890,
 *   }
 * }
 */

/**
 * CREATE PURCHASE ITEM
 *
 * Creates a generic purchase record after successful payment.
 * This is called by completeCheckout for each product × quantity.
 */
export const createPurchaseItem = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    checkoutSessionId: v.id("objects"),
    productId: v.id("objects"),
    quantity: v.number(), // Note: Will create this many separate purchase_items
    pricePerUnit: v.number(), // cents
    totalPrice: v.number(), // cents (quantity × pricePerUnit)
    buyerEmail: v.string(),
    buyerName: v.string(),
    buyerPhone: v.optional(v.string()),
    fulfillmentType: v.string(), // "ticket" | "subscription" | "download" | "shipment"
    registrationData: v.optional(v.any()), // Form data if applicable
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // Get product details for naming
    const product = await ctx.db.get(args.productId);
    if (!product || product.type !== "product") {
      throw new Error("Invalid product");
    }

    const purchaseItemIds: Id<"objects">[] = [];

    // Create one purchase_item per quantity
    // This allows individual tracking (important for tickets, subscriptions, etc.)
    for (let i = 0; i < args.quantity; i++) {
      const itemNumber = i + 1;

      const purchaseItemId = await ctx.db.insert("objects", {
        organizationId: args.organizationId,
        type: "purchase_item",
        subtype: args.fulfillmentType, // ticket, subscription, download, shipment
        name: `${product.name} - Item ${itemNumber}`,
        description: `Purchase from ${new Date().toLocaleDateString()}`,
        status: "pending", // pending → fulfilled → delivered/completed

        customProperties: {
          // Purchase context
          checkoutSessionId: args.checkoutSessionId,
          productId: args.productId,
          productName: product.name,
          quantity: 1, // Each purchase_item is quantity 1
          itemNumber, // Which item in a multi-quantity purchase (1, 2, 3...)
          totalItemsInOrder: args.quantity,
          pricePerUnit: args.pricePerUnit,
          totalPrice: args.pricePerUnit, // Always pricePerUnit since quantity=1

          // Buyer info (denormalized for convenience)
          buyerEmail: args.buyerEmail,
          buyerName: args.buyerName,
          buyerPhone: args.buyerPhone,

          // Registration data (if product had form)
          registrationData: args.registrationData,

          // Fulfillment tracking
          fulfillmentType: args.fulfillmentType,
          fulfillmentStatus: "pending",
          fulfillmentData: null, // Will be filled by fulfillment hook

          // Dates
          purchasedAt: Date.now(),
          fulfilledAt: null,
          expiresAt: null,
        },

        createdBy: userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      purchaseItemIds.push(purchaseItemId);

      // Log action
      await ctx.db.insert("objectActions", {
        organizationId: args.organizationId,
        objectId: purchaseItemId,
        actionType: "purchase_item_created",
        actionData: {
          checkoutSessionId: args.checkoutSessionId,
          productId: args.productId,
          pricePerUnit: args.pricePerUnit,
        },
        performedBy: userId,
        performedAt: Date.now(),
      });
    }

    return { purchaseItemIds };
  },
});

/**
 * UPDATE FULFILLMENT STATUS
 *
 * Updates fulfillment status and data after product-specific fulfillment.
 * Called by fulfillment hooks (ticket creation, subscription setup, etc.)
 */
export const updateFulfillmentStatus = mutation({
  args: {
    sessionId: v.string(),
    purchaseItemId: v.id("objects"),
    fulfillmentStatus: v.string(), // "pending" | "fulfilled" | "failed" | "cancelled"
    fulfillmentData: v.optional(v.any()),
    fulfilledAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const purchaseItem = await ctx.db.get(args.purchaseItemId);
    if (!purchaseItem || purchaseItem.type !== "purchase_item") {
      throw new Error("Purchase item not found");
    }

    // Update fulfillment status
    await ctx.db.patch(args.purchaseItemId, {
      status: args.fulfillmentStatus === "fulfilled" ? "fulfilled" : "pending",
      customProperties: {
        ...(purchaseItem.customProperties || {}),
        fulfillmentStatus: args.fulfillmentStatus,
        fulfillmentData: args.fulfillmentData || purchaseItem.customProperties?.fulfillmentData,
        fulfilledAt: args.fulfilledAt || Date.now(),
      },
      updatedAt: Date.now(),
    });

    // Log action
    await ctx.db.insert("objectActions", {
      organizationId: purchaseItem.organizationId,
      objectId: args.purchaseItemId,
      actionType: "purchase_item_fulfilled",
      actionData: {
        fulfillmentStatus: args.fulfillmentStatus,
        fulfillmentType: purchaseItem.customProperties?.fulfillmentType,
      },
      performedBy: userId,
      performedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * LINK FULFILLMENT OBJECT
 *
 * Creates a link between purchase_item and its fulfillment object.
 * Examples: purchase_item → ticket, purchase_item → subscription
 */
export const linkFulfillmentObject = internalMutation({
  args: {
    purchaseItemId: v.id("objects"),
    fulfillmentObjectId: v.id("objects"),
    linkType: v.string(), // "fulfilled_by_ticket" | "fulfilled_by_subscription" | etc.
    performedBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    const purchaseItem = await ctx.db.get(args.purchaseItemId);
    if (!purchaseItem) {
      throw new Error("Purchase item not found");
    }

    // Create link
    await ctx.db.insert("objectLinks", {
      organizationId: purchaseItem.organizationId,
      fromObjectId: args.purchaseItemId,
      toObjectId: args.fulfillmentObjectId,
      linkType: args.linkType,
      createdBy: args.performedBy,
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

// ============================================================================
// QUERIES
// ============================================================================

/**
 * GET PURCHASE ITEMS BY CHECKOUT SESSION
 *
 * Returns all purchase items for a specific checkout.
 */
export const getPurchaseItemsByCheckout = query({
  args: {
    sessionId: v.string(),
    checkoutSessionId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    // Get checkout session to find organizationId
    const checkoutSession = await ctx.db.get(args.checkoutSessionId);
    if (!checkoutSession) return [];

    // Get all purchase items for this checkout
    const purchaseItems = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q
          .eq("organizationId", checkoutSession.organizationId)
          .eq("type", "purchase_item")
      )
      .collect();

    // Filter by checkoutSessionId
    return purchaseItems.filter(
      (item) => item.customProperties?.checkoutSessionId === args.checkoutSessionId
    );
  },
});

/**
 * GET PURCHASE ITEMS BY BUYER EMAIL
 *
 * Returns all purchases for a specific buyer (for customer portal, order history).
 */
export const getPurchaseItemsByBuyer = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    buyerEmail: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const purchaseItems = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "purchase_item")
      )
      .collect();

    // Filter by buyer email
    const filtered = purchaseItems.filter(
      (item) => item.customProperties?.buyerEmail === args.buyerEmail
    );

    // Sort by purchase date descending
    filtered.sort((a, b) => {
      const aDate = (a.customProperties?.purchasedAt as number) || 0;
      const bDate = (b.customProperties?.purchasedAt as number) || 0;
      return bDate - aDate;
    });

    return filtered;
  },
});

/**
 * GET PURCHASE ITEM INTERNAL (for actions/mutations)
 */
export const getPurchaseItemInternal = query({
  args: {
    purchaseItemId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.purchaseItemId);
  },
});
