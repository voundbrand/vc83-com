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
import type { MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { requireAuthenticatedUser } from "./rbacHelpers";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

/**
 * Helper: Get organization currency from locale settings
 * Defaults to "eur" if not set
 */
async function getOrganizationCurrency(
  ctx: MutationCtx,
  organizationId: Id<"organizations">
): Promise<string> {
  try {
    const localeSettings = await ctx.runQuery(
      internal.checkoutSessions.getOrgLocaleSettings,
      { organizationId }
    );

    const currency = localeSettings?.customProperties?.currency
      ? String(localeSettings.customProperties.currency).toLowerCase()
      : "eur";

    return currency;
  } catch (error) {
    console.error("[getOrganizationCurrency] Error fetching locale settings:", error);
    return "eur"; // Fallback to EUR
  }
}

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

    // Get organization currency from locale settings
    const currency = await getOrganizationCurrency(ctx, args.organizationId);

    // Get checkout configuration to extract defaultLanguage
    let defaultLanguage = "en"; // Fallback
    let pdfTemplateCode: string | undefined;

    if (args.checkoutInstanceId) {
      const checkoutInstance = await ctx.db.get(args.checkoutInstanceId);
      if (checkoutInstance?.customProperties?.configuration) {
        const config = checkoutInstance.customProperties.configuration as Record<string, unknown>;
        defaultLanguage = (config.defaultLanguage as string) || "en";
        pdfTemplateCode = config.pdfTemplateCode as string | undefined;
      }
    }

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
        currency,
        defaultLanguage,        // ← Store checkout's language
        pdfTemplateCode,        // ← Store checkout's PDF template choice
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
    preferredLanguage: v.optional(v.string()), // Browser-detected language from frontend
  },
  handler: async (ctx, args) => {
    // No authentication required for public checkouts
    // Get or create system user for tracking actions
    const systemUser = await getOrCreateSystemUser(ctx);

    // Get organization currency from locale settings
    const currency = await getOrganizationCurrency(ctx, args.organizationId);

    // Determine default language (cascade priority):
    // 1. Checkout instance configuration (if set)
    // 2. Browser-detected language from frontend (preferredLanguage)
    // 3. Fallback to English
    let defaultLanguage = "en"; // Fallback
    let pdfTemplateCode: string | undefined;

    if (args.checkoutInstanceId) {
      const checkoutInstance = await ctx.db.get(args.checkoutInstanceId);
      if (checkoutInstance?.customProperties?.configuration) {
        const config = checkoutInstance.customProperties.configuration as Record<string, unknown>;
        defaultLanguage = (config.defaultLanguage as string) || defaultLanguage;
        pdfTemplateCode = config.pdfTemplateCode as string | undefined;
      }
    }

    // If no checkout instance language, use browser-detected language
    if (defaultLanguage === "en" && args.preferredLanguage) {
      const supportedLanguages = ["en", "de", "pl", "es", "fr", "ja"];
      const langCode = args.preferredLanguage.split("-")[0].toLowerCase();
      if (supportedLanguages.includes(langCode)) {
        defaultLanguage = langCode;
      }
    }

    // Get default domain config for the organization (for email sending)
    const domainConfigs = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "configuration")
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("subtype"), "domain"),
          q.eq(q.field("status"), "active")
        )
      )
      .take(1);

    const domainConfigId = domainConfigs[0]?._id;

    // Create session object (use system user for createdBy)
    const checkoutSessionId = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "checkout_session",
      subtype: "active",
      name: `Public Checkout ${new Date().toISOString()}`,
      status: "active",
      customProperties: {
        checkoutInstanceId: args.checkoutInstanceId,
        domainConfigId, // Store domain config for email sending
        customerEmail: args.customerEmail,
        selectedProducts: [],
        subtotal: 0,
        taxAmount: 0,
        totalAmount: 0,
        currency,
        defaultLanguage, // Store language for invoices/PDFs
        pdfTemplateCode, // Store PDF template choice
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

      // B2B fields
      transactionType: v.optional(v.union(v.literal("B2C"), v.literal("B2B"))),
      companyName: v.optional(v.string()),
      vatNumber: v.optional(v.string()),

      // Billing address (matches BillingAddress interface)
      billingLine1: v.optional(v.string()),
      billingLine2: v.optional(v.string()),
      billingCity: v.optional(v.string()),
      billingState: v.optional(v.string()),
      billingPostalCode: v.optional(v.string()),
      billingCountry: v.optional(v.string()),

      // Cart
      selectedProducts: v.optional(
        v.array(
          v.object({
            productId: v.id("objects"),
            quantity: v.number(),
            pricePerUnit: v.number(),
            totalPrice: v.number(),
            ticketTemplateId: v.optional(v.id("objects")), // PDF template for tickets
          })
        )
      ),
      // IMPORTANT: 'items' field for invoice provider compatibility
      // Simpler format used by invoice.ts to read products
      items: v.optional(
        v.array(
          v.object({
            productId: v.id("objects"),
            quantity: v.number(),
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
            formId: v.optional(v.string()), // Optional - only set when ticket has a custom form
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

      // ✅ Behavior context - CRITICAL for passing behavior results to backend
      behaviorContext: v.optional(v.any()),

      // Event information (from product->event link)
      eventName: v.optional(v.string()),
      eventDescription: v.optional(v.string()),
      eventLocation: v.optional(v.string()),
      eventStartDate: v.optional(v.number()),
      eventEndDate: v.optional(v.number()),
      eventAgenda: v.optional(v.array(v.object({
        time: v.string(),
        title: v.string(),
        description: v.optional(v.string()),
      }))),
      eventSponsors: v.optional(v.array(v.object({
        name: v.string(),
        level: v.optional(v.string()), // platinum, gold, silver, bronze, community - optional
      }))),
      // Legacy field for backwards compatibility
      eventDate: v.optional(v.number()),
    }),
  },
  handler: async (ctx, args) => {
    // 🔍 DEBUG: Log B2B fields to trace space-stripping bug
    if (args.updates.companyName || args.updates.billingLine1) {
      console.log("🔍 [updatePublicCheckoutSession DEBUG] B2B fields received:", {
        companyName_raw: args.updates.companyName,
        companyName_has_space: args.updates.companyName?.includes(" "),
        companyName_length: args.updates.companyName?.length,
        billingLine1_raw: args.updates.billingLine1,
        billingLine1_has_space: args.updates.billingLine1?.includes(" "),
        customerName_raw: args.updates.customerName,
        customerName_has_space: args.updates.customerName?.includes(" "),
      });
    }

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

      // B2B fields
      transactionType: v.optional(v.union(v.literal("B2C"), v.literal("B2B"))),
      companyName: v.optional(v.string()),
      vatNumber: v.optional(v.string()),

      // Billing address (matches BillingAddress interface)
      billingLine1: v.optional(v.string()),
      billingLine2: v.optional(v.string()),
      billingCity: v.optional(v.string()),
      billingState: v.optional(v.string()),
      billingPostalCode: v.optional(v.string()),
      billingCountry: v.optional(v.string()),

      // Cart
      selectedProducts: v.optional(
        v.array(
          v.object({
            productId: v.id("objects"),
            quantity: v.number(),
            pricePerUnit: v.number(),
            totalPrice: v.number(),
            ticketTemplateId: v.optional(v.id("objects")), // PDF template for tickets
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
            formId: v.optional(v.string()), // Optional - only set when ticket has a custom form
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

      // ✅ Behavior context - CRITICAL for passing behavior results to backend
      behaviorContext: v.optional(v.any()),

      // Event information (from product->event link)
      eventName: v.optional(v.string()),
      eventDescription: v.optional(v.string()),
      eventLocation: v.optional(v.string()),
      eventStartDate: v.optional(v.number()),
      eventEndDate: v.optional(v.number()),
      eventAgenda: v.optional(v.array(v.object({
        time: v.string(),
        title: v.string(),
        description: v.optional(v.string()),
      }))),
      eventSponsors: v.optional(v.array(v.object({
        name: v.string(),
        level: v.optional(v.string()), // platinum, gold, silver, bronze, community - optional
      }))),
      // Legacy field for backwards compatibility
      eventDate: v.optional(v.number()),
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
    crmOrganizationId: v.optional(v.id("objects")), // B2B organization
    userId: v.optional(v.union(v.id("users"), v.id("objects"))), // Platform user or frontend_user
    paymentMethod: v.optional(v.union(v.literal("stripe"), v.literal("invoice"), v.literal("free"))), // Payment method used
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
        paymentMethod: args.paymentMethod || "stripe", // Store payment method for invoice creation
        paymentStatus: "succeeded",
        completedAt: Date.now(),
        purchasedItemIds: args.purchasedItemIds || [],
        crmContactId: args.crmContactId,
        crmOrganizationId: args.crmOrganizationId, // Store B2B organization ID
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

    // 🔥 PHASE 3A: Transaction creation moved to completeCheckoutAndFulfill
    // Previously scheduled here asynchronously, but this caused race condition where
    // emails/PDFs were generated before transactions were linked to tickets.
    // Now transactions are created synchronously in completeCheckoutAndFulfill BEFORE
    // email/PDF generation to ensure tax data is available.
    // See: convex/checkoutSessions.ts lines 1021-1034

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
    crmOrganizationId: v.optional(v.id("objects")), // B2B organization
  },
  handler: async (ctx, args): Promise<{ success: boolean }> => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // Delegate to internal mutation
    return await ctx.runMutation(internal.checkoutSessionOntology.completeCheckoutSessionInternal, {
      checkoutSessionId: args.checkoutSessionId,
      paymentIntentId: args.paymentIntentId,
      purchasedItemIds: args.purchasedItemIds,
      crmContactId: args.crmContactId,
      crmOrganizationId: args.crmOrganizationId,
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

/**
 * INTERNAL: Patch checkout session custom properties
 *
 * Simple patch operation for updating customProperties from actions.
 * Used by payment providers to update session data after ticket generation.
 */
export const patchCheckoutSessionInternal = internalMutation({
  args: {
    checkoutSessionId: v.id("objects"),
    customProperties: v.any(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.checkoutSessionId);
    if (!session || session.type !== "checkout_session") {
      throw new Error("Checkout session not found");
    }

    await ctx.db.patch(args.checkoutSessionId, {
      customProperties: args.customProperties,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// ============================================================================
// CHECKOUT PROGRESS TRACKING (for real-time UI updates)
// ============================================================================

/**
 * Session status values:
 * - "active": Shopping in progress
 * - "payment_confirmed": Payment succeeded, fulfillment starting
 * - "fulfilling": Async fulfillment in progress (creating tickets, etc.)
 * - "completed": All done
 * - "failed": Payment or fulfillment failed
 * - "abandoned": Customer left
 * - "expired": Session timed out
 */

/**
 * Fulfillment steps (tracked via fulfillmentStep field):
 * 0: Not started
 * 1: Creating CRM records
 * 2: Creating purchase items & tickets
 * 3: Creating transactions
 * 4: Sending emails
 * 5: Complete
 */

/**
 * GET CHECKOUT PROGRESS (Public Query)
 *
 * Returns real-time progress of a checkout session.
 * Used by ProcessingModal to show actual fulfillment status.
 */
export const getCheckoutProgress = query({
  args: {
    checkoutSessionId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.checkoutSessionId);

    if (!session || session.type !== "checkout_session") {
      return null;
    }

    return {
      status: session.status as string,
      fulfillmentStep: (session.customProperties?.fulfillmentStep as number) ?? 0,
      fulfillmentStatus: (session.customProperties?.fulfillmentStatus as string) ?? "not_started",
      totalSteps: 5, // CRM, Tickets, Transactions, Emails, Complete
      errorMessage: session.customProperties?.errorMessage as string | undefined,
    };
  },
});

/**
 * INTERNAL: Update fulfillment progress
 *
 * Called during async fulfillment to update progress.
 * Allows ProcessingModal to show real status.
 */
export const updateFulfillmentProgress = internalMutation({
  args: {
    checkoutSessionId: v.id("objects"),
    fulfillmentStep: v.number(),
    fulfillmentStatus: v.optional(v.union(
      v.literal("not_started"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("failed")
    )),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.checkoutSessionId);
    if (!session || session.type !== "checkout_session") {
      throw new Error("Checkout session not found");
    }

    // Determine the session status based on fulfillment state
    let newStatus = session.status;
    if (args.fulfillmentStatus === "in_progress" && session.status === "active") {
      newStatus = "fulfilling";
    } else if (args.fulfillmentStatus === "completed") {
      newStatus = "completed";
    } else if (args.fulfillmentStatus === "failed") {
      newStatus = "failed";
    }

    await ctx.db.patch(args.checkoutSessionId, {
      status: newStatus,
      customProperties: {
        ...(session.customProperties || {}),
        fulfillmentStep: args.fulfillmentStep,
        fulfillmentStatus: args.fulfillmentStatus || session.customProperties?.fulfillmentStatus,
        ...(args.errorMessage && { errorMessage: args.errorMessage }),
      },
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * INTERNAL: Mark payment confirmed and start fulfillment
 *
 * Called after payment verification succeeds.
 * Sets status to "payment_confirmed" and prepares for async fulfillment.
 */
export const markPaymentConfirmed = internalMutation({
  args: {
    checkoutSessionId: v.id("objects"),
    paymentIntentId: v.string(),
    paymentMethod: v.optional(v.union(v.literal("stripe"), v.literal("invoice"), v.literal("free"))),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.checkoutSessionId);
    if (!session || session.type !== "checkout_session") {
      throw new Error("Checkout session not found");
    }

    // Check idempotency - don't process if already confirmed or beyond
    const currentStatus = session.status;
    if (currentStatus !== "active") {
      console.log(`[markPaymentConfirmed] Session already in status: ${currentStatus}, skipping`);
      return {
        success: true,
        alreadyProcessed: true,
        currentStatus,
      };
    }

    await ctx.db.patch(args.checkoutSessionId, {
      status: "payment_confirmed",
      customProperties: {
        ...(session.customProperties || {}),
        paymentIntentId: args.paymentIntentId,
        paymentMethod: args.paymentMethod || "stripe",
        paymentConfirmedAt: Date.now(),
        fulfillmentStatus: "not_started",
        fulfillmentStep: 0,
      },
      updatedAt: Date.now(),
    });

    return { success: true, alreadyProcessed: false };
  },
});
