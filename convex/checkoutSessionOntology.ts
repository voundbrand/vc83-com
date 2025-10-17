/**
 * CHECKOUT SESSION ONTOLOGY - Shopping Cart/Basket System
 *
 * This is the ACTIVE SHOPPING SESSION - the customer's cart during checkout.
 * Different from checkout_instance (which is the published checkout PAGE).
 *
 * Think of it as:
 * - checkout_instance = The store (what org owner creates)
 * - checkout_session = The shopping cart (what customer uses)
 *
 * Object Types:
 * - checkout_session: Active shopping session with all customer data
 *
 * Lifecycle:
 * 1. Customer visits checkout page → create session (status: "active")
 * 2. Customer fills info/forms → update session
 * 3. Payment succeeds → complete session (status: "completed")
 * 4. Payment fails → mark failed (status: "failed")
 * 5. Customer abandons → expire session (status: "abandoned")
 *
 * Integration Points:
 * - CRM: Auto-create contacts when session completes
 * - Tickets: Generate tickets from completed session
 * - Analytics: Track conversion funnels, abandonment
 * - Email: Send cart abandonment reminders
 */

import { mutation, query, internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAuthenticatedUser } from "./rbacHelpers";
import type { MutationCtx } from "./_generated/server";
import { internal } from "./_generated/api";

/**
 * Helper: Get or create system user for anonymous actions
 */
async function getOrCreateSystemUser(ctx: MutationCtx) {
  let systemUser = await ctx.db
    .query("users")
    .filter((q) => q.eq(q.field("email"), "system@l4yercak3.com"))
    .first();

  if (!systemUser) {
    const systemUserId = await ctx.db.insert("users", {
      email: "system@l4yercak3.com",
      firstName: "System",
      lastName: "User",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    systemUser = await ctx.db.get(systemUserId);
  }

  if (!systemUser) {
    throw new Error("Failed to create system user");
  }

  return systemUser;
}

// ============================================================================
// CHECKOUT_SESSION OPERATIONS
// ============================================================================

/**
 * CHECKOUT_SESSION OBJECT TYPE
 *
 * The active shopping cart/basket during checkout.
 * Contains ALL data gathered during the checkout flow.
 *
 * Example:
 * {
 *   type: "checkout_session",
 *   status: "active" | "completed" | "failed" | "abandoned" | "expired",
 *   customProperties: {
 *     // Reference to checkout page being used
 *     checkoutInstanceId: "checkout_instance_id",
 *
 *     // Customer information
 *     customerEmail: "customer@example.com",
 *     customerName: "John Doe",
 *     customerPhone: "+1234567890",
 *     customerNotes: "Gate code: 1234",
 *
 *     // Shopping cart
 *     selectedProducts: [
 *       {
 *         productId: "product_id_1",
 *         quantity: 2,
 *         pricePerUnit: 5000, // cents
 *         totalPrice: 10000
 *       }
 *     ],
 *     subtotal: 10000, // cents
 *     taxAmount: 850, // cents
 *     totalAmount: 10850, // cents
 *     currency: "usd",
 *
 *     // Form responses (if products have registration forms)
 *     formResponses: [
 *       {
 *         productId: "product_id_1",
 *         ticketNumber: 1,
 *         formId: "form_id",
 *         responses: { name: "John", email: "...", dietary: "vegan" },
 *         addedCosts: 500, // Extra costs from form selections
 *         submittedAt: 1234567890
 *       }
 *     ],
 *
 *     // Payment information
 *     paymentProvider: "stripe-connect",
 *     paymentIntentId: "pi_...",
 *     paymentStatus: "pending" | "succeeded" | "failed",
 *
 *     // Lifecycle timestamps
 *     startedAt: 1234567890,
 *     completedAt: 1234567890,
 *     expiresAt: 1234567890, // Auto-expire after 24h
 *
 *     // Result tracking
 *     purchasedItemIds: ["purchase_item_1", "purchase_item_2"], // Generic purchase items created after completion
 *     crmContactId: "contact_id", // Auto-created CRM contact
 *
 *     // Analytics
 *     stepProgress: ["product-selection", "customer-info", "payment"],
 *     abandonedAtStep: "payment", // For analytics
 *   }
 * }
 */

/**
 * CREATE CHECKOUT SESSION
 *
 * Creates a new shopping session when customer starts checkout.
 * Called when customer first lands on checkout page.
 */
export const createCheckoutSession = mutation({
  args: {
    sessionId: v.string(), // User session ID for auth
    organizationId: v.id("organizations"),
    checkoutInstanceId: v.optional(v.id("objects")), // Which checkout page
    customerEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // Create session object
    const checkoutSessionId = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "checkout_session",
      subtype: "active",
      name: `Checkout ${new Date().toISOString()}`,
      status: "active",
      customProperties: {
        checkoutInstanceId: args.checkoutInstanceId,
        customerEmail: args.customerEmail,
        selectedProducts: [],
        subtotal: 0,
        taxAmount: 0,
        totalAmount: 0,
        currency: "usd",
        formResponses: [],
        stepProgress: ["started"],
        startedAt: Date.now(),
        expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
      },
      createdBy: userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Log action
    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: checkoutSessionId,
      actionType: "checkout_session_created",
      actionData: {
        checkoutInstanceId: args.checkoutInstanceId,
      },
      performedBy: userId,
      performedAt: Date.now(),
    });

    return { checkoutSessionId };
  },
});

/**
 * CREATE PUBLIC CHECKOUT SESSION
 *
 * Public version that doesn't require authentication.
 * Used for anonymous checkout flows (non-logged-in customers).
 */
export const createPublicCheckoutSession = mutation({
  args: {
    organizationId: v.id("organizations"),
    checkoutInstanceId: v.optional(v.id("objects")),
    customerEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // No authentication required for public checkouts
    // Get or create system user for tracking actions
    const systemUser = await getOrCreateSystemUser(ctx);

    // Create session object (use system user for createdBy)
    const checkoutSessionId = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "checkout_session",
      subtype: "active",
      name: `Public Checkout ${new Date().toISOString()}`,
      status: "active",
      customProperties: {
        checkoutInstanceId: args.checkoutInstanceId,
        customerEmail: args.customerEmail,
        selectedProducts: [],
        subtotal: 0,
        taxAmount: 0,
        totalAmount: 0,
        currency: "usd",
        formResponses: [],
        stepProgress: ["started"],
        startedAt: Date.now(),
        expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
        isPublic: true, // Mark as public checkout
      },
      createdBy: systemUser!._id, // Use system user for public checkouts
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Log action (use system user for performedBy)
    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: checkoutSessionId,
      actionType: "public_checkout_session_created",
      actionData: {
        checkoutInstanceId: args.checkoutInstanceId,
      },
      performedBy: systemUser!._id, // Use system user
      performedAt: Date.now(),
    });

    return { checkoutSessionId };
  },
});

/**
 * UPDATE CHECKOUT SESSION (PUBLIC)
 *
 * Public version - Updates checkout session without requiring authentication.
 * Used during multi-step anonymous checkout flow.
 */
export const updatePublicCheckoutSession = mutation({
  args: {
    checkoutSessionId: v.id("objects"),
    updates: v.object({
      // Customer info
      customerEmail: v.optional(v.string()),
      customerName: v.optional(v.string()),
      customerPhone: v.optional(v.string()),
      customerNotes: v.optional(v.string()),

      // Cart
      selectedProducts: v.optional(
        v.array(
          v.object({
            productId: v.id("objects"),
            quantity: v.number(),
            pricePerUnit: v.number(),
            totalPrice: v.number(),
          })
        )
      ),
      subtotal: v.optional(v.number()),
      taxAmount: v.optional(v.number()),
      taxDetails: v.optional(
        v.array(
          v.object({
            jurisdiction: v.string(),
            taxName: v.string(),
            taxRate: v.number(),
            taxAmount: v.number(),
          })
        )
      ),
      totalAmount: v.optional(v.number()),
      currency: v.optional(v.string()),

      // Form responses
      formResponses: v.optional(
        v.array(
          v.object({
            productId: v.id("objects"),
            ticketNumber: v.number(),
            formId: v.string(),
            responses: v.any(),
            addedCosts: v.number(),
            submittedAt: v.number(),
          })
        )
      ),

      // Payment
      paymentProvider: v.optional(v.string()),
      paymentIntentId: v.optional(v.string()),

      // Progress tracking
      stepProgress: v.optional(v.array(v.string())),
      currentStep: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    // Get or create system user for tracking actions
    const systemUser = await getOrCreateSystemUser(ctx);

    // Get session
    const session = await ctx.db.get(args.checkoutSessionId);
    if (!session || session.type !== "checkout_session") {
      throw new Error("Checkout session not found");
    }

    // Check if session expired
    const expiresAt = session.customProperties?.expiresAt as number;
    if (expiresAt && Date.now() > expiresAt) {
      throw new Error("Checkout session has expired");
    }

    // Update session
    await ctx.db.patch(args.checkoutSessionId, {
      customProperties: {
        ...(session.customProperties || {}),
        ...args.updates,
      },
      updatedAt: Date.now(),
    });

    // Log action
    await ctx.db.insert("objectActions", {
      organizationId: session.organizationId,
      objectId: args.checkoutSessionId,
      actionType: "checkout_session_updated",
      actionData: {
        updatedFields: Object.keys(args.updates),
      },
      performedBy: systemUser._id,
      performedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * UPDATE CHECKOUT SESSION
 *
 * Updates session as customer progresses through checkout.
 * Can update any part of the session data.
 */
export const updateCheckoutSession = mutation({
  args: {
    sessionId: v.string(),
    checkoutSessionId: v.id("objects"),
    updates: v.object({
      // Customer info
      customerEmail: v.optional(v.string()),
      customerName: v.optional(v.string()),
      customerPhone: v.optional(v.string()),
      customerNotes: v.optional(v.string()),

      // Cart
      selectedProducts: v.optional(
        v.array(
          v.object({
            productId: v.id("objects"),
            quantity: v.number(),
            pricePerUnit: v.number(),
            totalPrice: v.number(),
          })
        )
      ),
      subtotal: v.optional(v.number()),
      taxAmount: v.optional(v.number()),
      totalAmount: v.optional(v.number()),
      currency: v.optional(v.string()),

      // Form responses
      formResponses: v.optional(
        v.array(
          v.object({
            productId: v.id("objects"),
            ticketNumber: v.number(),
            formId: v.string(),
            responses: v.any(),
            addedCosts: v.number(),
            submittedAt: v.number(),
          })
        )
      ),

      // Payment
      paymentProvider: v.optional(v.string()),
      paymentIntentId: v.optional(v.string()),

      // Progress tracking
      stepProgress: v.optional(v.array(v.string())),
      currentStep: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // Get session
    const session = await ctx.db.get(args.checkoutSessionId);
    if (!session || session.type !== "checkout_session") {
      throw new Error("Checkout session not found");
    }

    // Check if session expired
    const expiresAt = session.customProperties?.expiresAt as number;
    if (expiresAt && Date.now() > expiresAt) {
      throw new Error("Checkout session has expired");
    }

    // Update session
    await ctx.db.patch(args.checkoutSessionId, {
      customProperties: {
        ...(session.customProperties || {}),
        ...args.updates,
      },
      updatedAt: Date.now(),
    });

    // Log action
    await ctx.db.insert("objectActions", {
      organizationId: session.organizationId,
      objectId: args.checkoutSessionId,
      actionType: "checkout_session_updated",
      actionData: {
        updatedFields: Object.keys(args.updates),
      },
      performedBy: userId,
      performedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * INTERNAL: Complete checkout session without authentication
 * Called from backend actions after payment verification
 */
export const completeCheckoutSessionInternal = internalMutation({
  args: {
    checkoutSessionId: v.id("objects"),
    paymentIntentId: v.string(),
    purchasedItemIds: v.optional(v.array(v.string())),
    crmContactId: v.optional(v.id("objects")),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    // Get session
    const session = await ctx.db.get(args.checkoutSessionId);
    if (!session || session.type !== "checkout_session") {
      throw new Error("Checkout session not found");
    }

    // Get userId - if not provided, use system user
    let userId = args.userId;
    if (!userId) {
      userId = (await getOrCreateSystemUser(ctx))._id;
    }

    // Update session to completed
    await ctx.db.patch(args.checkoutSessionId, {
      status: "completed",
      customProperties: {
        ...(session.customProperties || {}),
        paymentIntentId: args.paymentIntentId,
        paymentStatus: "succeeded",
        completedAt: Date.now(),
        purchasedItemIds: args.purchasedItemIds || [],
        crmContactId: args.crmContactId,
      },
      updatedAt: Date.now(),
    });

    // Log action
    await ctx.db.insert("objectActions", {
      organizationId: session.organizationId,
      objectId: args.checkoutSessionId,
      actionType: "checkout_session_completed",
      actionData: {
        paymentIntentId: args.paymentIntentId,
        totalAmount: session.customProperties?.totalAmount,
        purchasedItemCount: args.purchasedItemIds?.length || 0,
      },
      performedBy: userId,
      performedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * COMPLETE CHECKOUT SESSION (PUBLIC)
 *
 * Marks session as completed after successful payment.
 * Requires authentication via sessionId
 */
export const completeCheckoutSession = mutation({
  args: {
    sessionId: v.string(),
    checkoutSessionId: v.id("objects"),
    paymentIntentId: v.string(),
    purchasedItemIds: v.optional(v.array(v.string())), // Generic purchase items (not just tickets!)
    crmContactId: v.optional(v.id("objects")),
  },
  handler: async (ctx, args): Promise<{ success: boolean }> => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // Delegate to internal mutation
    return await ctx.runMutation(internal.checkoutSessionOntology.completeCheckoutSessionInternal, {
      checkoutSessionId: args.checkoutSessionId,
      paymentIntentId: args.paymentIntentId,
      purchasedItemIds: args.purchasedItemIds,
      crmContactId: args.crmContactId,
      userId,
    });
  },
});

/**
 * ABANDON CHECKOUT SESSION
 *
 * Marks session as abandoned (for analytics/email campaigns).
 */
export const abandonCheckoutSession = mutation({
  args: {
    sessionId: v.string(),
    checkoutSessionId: v.id("objects"),
    abandonedAtStep: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const session = await ctx.db.get(args.checkoutSessionId);
    if (!session || session.type !== "checkout_session") {
      throw new Error("Checkout session not found");
    }

    await ctx.db.patch(args.checkoutSessionId, {
      status: "abandoned",
      customProperties: {
        ...(session.customProperties || {}),
        abandonedAtStep: args.abandonedAtStep,
        abandonedAt: Date.now(),
      },
      updatedAt: Date.now(),
    });

    await ctx.db.insert("objectActions", {
      organizationId: session.organizationId,
      objectId: args.checkoutSessionId,
      actionType: "checkout_session_abandoned",
      actionData: {
        abandonedAtStep: args.abandonedAtStep,
      },
      performedBy: userId,
      performedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * FAIL CHECKOUT SESSION
 *
 * Marks session as failed after payment failure.
 */
export const failCheckoutSession = mutation({
  args: {
    sessionId: v.string(),
    checkoutSessionId: v.id("objects"),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const session = await ctx.db.get(args.checkoutSessionId);
    if (!session || session.type !== "checkout_session") {
      throw new Error("Checkout session not found");
    }

    await ctx.db.patch(args.checkoutSessionId, {
      status: "failed",
      customProperties: {
        ...(session.customProperties || {}),
        paymentStatus: "failed",
        errorMessage: args.errorMessage,
        failedAt: Date.now(),
      },
      updatedAt: Date.now(),
    });

    await ctx.db.insert("objectActions", {
      organizationId: session.organizationId,
      objectId: args.checkoutSessionId,
      actionType: "checkout_session_failed",
      actionData: {
        errorMessage: args.errorMessage,
      },
      performedBy: userId,
      performedAt: Date.now(),
    });

    return { success: true };
  },
});

// ============================================================================
// QUERIES
// ============================================================================

/**
 * GET CHECKOUT SESSION BY ID
 */
export const getCheckoutSession = query({
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

    return session;
  },
});

/**
 * GET ACTIVE SESSIONS FOR ORGANIZATION
 *
 * Returns all active (not completed/abandoned) sessions.
 * Useful for analytics and abandoned cart emails.
 */
export const getActiveSessions = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const sessions = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "checkout_session")
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    return sessions;
  },
});

/**
 * GET COMPLETED SESSIONS
 *
 * Returns completed sessions for analytics/reporting.
 */
export const getCompletedSessions = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    let sessions = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "checkout_session")
      )
      .filter((q) => q.eq(q.field("status"), "completed"))
      .collect();

    // Sort by completion time descending
    sessions.sort((a, b) => {
      const aTime = (a.customProperties?.completedAt as number) || 0;
      const bTime = (b.customProperties?.completedAt as number) || 0;
      return bTime - aTime;
    });

    // Limit if requested
    if (args.limit) {
      sessions = sessions.slice(0, args.limit);
    }

    return sessions;
  },
});

/**
 * GET CHECKOUT SESSION INTERNAL (for actions)
 *
 * Internal query for use in actions that need to read session data.
 */
export const getCheckoutSessionInternal = internalQuery({
  args: {
    checkoutSessionId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.checkoutSessionId);
  },
});
