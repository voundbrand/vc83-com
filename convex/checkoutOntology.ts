/**
 * CHECKOUT ONTOLOGY - Checkout Instance System
 *
 * Similar to Web Publishing's page instances, this manages user-created
 * checkout experiences using templates.
 *
 * Object Types:
 * - checkout_instance: A configured checkout page (like a web page instance)
 * - checkout_template: Templates for different checkout types (stored in system org)
 * - checkout_session: Payment sessions (Stripe integration)
 * - payment_transaction: Completed payments
 *
 * Workflow:
 * 1. User selects checkout template
 * 2. Creates checkout_instance with configuration
 * 3. Links products to checkout
 * 4. Publishes checkout
 * 5. Can embed in web pages or use standalone
 */

import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { requireAuthenticatedUser, checkPermission } from "./rbacHelpers";
import { checkResourceLimit, checkFeatureAccess } from "./licensing/helpers";
import { internal } from "./_generated/api";

// ============================================================================
// CHECKOUT_INSTANCE OPERATIONS
// ============================================================================

/**
 * CHECKOUT_INSTANCE OBJECT TYPE
 *
 * Represents a user-created checkout page using a template.
 *
 * Example:
 * {
 *   type: "checkout_instance",
 *   subtype: "ticket", // From template
 *   name: "l4yercak3 Live 2024 Ticket Sales",
 *   status: "published" | "draft" | "archived",
 *   customProperties: {
 *     // Template reference
 *     templateCode: "event-ticket-checkout",
 *     templateId: "checkout_template_id",
 *
 *     // Payment configuration
 *     paymentProvider: "stripe",
 *     stripeConfig: {
 *       publishableKey: "pk_...",
 *       accountId: "acct_...",
 *     },
 *
 *     // Linked products (tickets, services, etc.)
 *     linkedProducts: ["product_id_1", "product_id_2"],
 *
 *     // Branding/Theme
 *     customBranding: {
 *       primaryColor: "#6B46C1",
 *       buttonText: "Get Tickets",
 *       headerImage: "https://...",
 *     },
 *
 *     // Publishing
 *     publicSlug: "l4yercak3-live-2024",
 *     publishedAt: 1234567890,
 *
 *     // Settings
 *     settings: {
 *       maxQuantityPerOrder: 10,
 *       requiresAccount: false,
 *       collectShipping: false,
 *       taxEnabled: false,
 *     }
 *   }
 * }
 */

/**
 * CREATE CHECKOUT INSTANCE
 *
 * Creates a new checkout using a template.
 */
export const createCheckoutInstance = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    templateCode: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    configuration: v.optional(v.object({
      paymentProvider: v.optional(v.string()), // Legacy: single provider
      paymentProviders: v.optional(v.array(v.string())), // NEW: multiple providers
      providerConfig: v.optional(v.any()),
      linkedProducts: v.optional(v.array(v.id("objects"))),
      customBranding: v.optional(v.any()),
      publicSlug: v.optional(v.string()),
      publishedAt: v.optional(v.number()), // Timestamp when published
      settings: v.optional(v.any()),
      themeCode: v.optional(v.string()), // Theme code (e.g., "modern-gradient")
      templateId: v.optional(v.id("objects")), // Template reference (checkout page template)
      forceB2B: v.optional(v.boolean()), // Force B2B mode (require organization info)
      defaultLanguage: v.optional(v.string()), // Default language code (en, de, pl, es, fr, ja)

      // PDF TEMPLATE REFERENCES (for generated PDFs)
      invoiceTemplateId: v.optional(v.id("objects")), // Reference to PDF invoice template
      ticketTemplateId: v.optional(v.id("objects")), // Reference to PDF ticket template
      certificateTemplateId: v.optional(v.id("objects")), // Reference to PDF certificate template

      // EMAIL TEMPLATE REFERENCES (for transactional emails)
      confirmationEmailTemplateId: v.optional(v.id("objects")), // Order confirmation email template
      salesNotificationEmailTemplateId: v.optional(v.id("objects")), // Internal sales notification template
      salesNotificationRecipientEmail: v.optional(v.string()), // Email to receive sales notifications (defaults to support@l4yercak3.com)

      // DEPRECATED: Old template code system (kept for backward compatibility)
      pdfTemplateCode: v.optional(v.union(
        v.literal("invoice_b2c_receipt_v1"),
        v.literal("invoice_b2b_single_v1"),
        v.literal("invoice_b2b_consolidated_v1"),
        v.literal("invoice_b2b_consolidated_detailed_v1")
      )), // DEPRECATED: Use invoiceTemplateId instead

      // NEW: Template Set Override (simplifies configuration)
      templateSetId: v.optional(v.id("objects")), // Checkout-specific template set (ticket + invoice + email)

      // Behavior execution settings
      allowBackNavigation: v.optional(v.boolean()), // Allow users to go back to previous steps
      behaviorExecutionTiming: v.optional(v.string()), // "eager" or "lazy" execution
      debugMode: v.optional(v.boolean()), // Enable debug logging
      executeBehaviorsOnStepChange: v.optional(v.boolean()), // Execute behaviors when changing steps
      showProgressBar: v.optional(v.boolean()), // Show progress indicator

      // Behavior-driven checkout configuration
      behaviors: v.optional(v.array(v.object({
        type: v.string(),
        config: v.optional(v.any()),
        priority: v.optional(v.number()),
      }))),
      branding: v.optional(v.any()), // Custom branding configuration
      checkoutFlow: v.optional(v.object({
        steps: v.optional(v.array(v.object({
          id: v.string(),
          name: v.string(),
          enabled: v.optional(v.boolean()),
        }))),
      })),
      createdVia: v.optional(v.string()), // How the checkout was created (e.g., "ai_tool", "manual")
      linkedEventId: v.optional(v.id("objects")), // Linked event
      linkedFormId: v.optional(v.id("objects")), // Linked form for registration
      paymentMode: v.optional(v.string()), // Payment mode (e.g., "hybrid", "stripe-only", "invoice-only")
    })),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // Check permission - use manage_operations for creating checkout instances
    const hasPermission = await checkPermission(
      ctx,
      userId,
      "manage_operations",
      args.organizationId
    );

    if (!hasPermission) {
      throw new Error("Permission denied: manage_operations required to create checkouts");
    }

    // CHECK LICENSE LIMIT: Enforce checkout instance limit for organization's tier
    // Free: 1, Starter: 5, Pro: 20, Agency: 100, Enterprise: Unlimited
    await checkResourceLimit(ctx, args.organizationId, "checkout_instance", "maxCheckoutInstances");

    // Get template to determine subtype
    const systemOrg = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", "system"))
      .first();

    if (!systemOrg) {
      throw new Error("System organization not found");
    }

    const template = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", systemOrg._id).eq("type", "template")
      )
      .filter((q) => q.eq(q.field("subtype"), "checkout"))
      .filter((q) =>
        q.eq(q.field("customProperties.code"), args.templateCode)
      )
      .first();

    if (!template) {
      throw new Error(`Template ${args.templateCode} not found`);
    }

    // Create checkout instance
    const instanceId = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "checkout_instance",
      subtype: template.subtype, // "ticket", "product", "service"
      name: args.name,
      description: args.description,
      status: "draft",
      customProperties: {
        templateCode: args.templateCode,
        templateId: template._id,
        ...(args.configuration || {}),
      },
      createdBy: userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Create link from instance → template
    await ctx.db.insert("objectLinks", {
      organizationId: args.organizationId,
      fromObjectId: instanceId,
      toObjectId: template._id,
      linkType: "uses_template",
      createdBy: userId,
      createdAt: Date.now(),
    });

    // Log action
    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: instanceId,
      actionType: "checkout_instance_created",
      actionData: {
        templateCode: args.templateCode,
      },
      performedBy: userId,
      performedAt: Date.now(),
    });

    return { instanceId };
  },
});

/**
 * UPDATE CHECKOUT INSTANCE
 *
 * Updates an existing checkout instance.
 */
export const updateCheckoutInstance = mutation({
  args: {
    sessionId: v.string(),
    instanceId: v.id("objects"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(v.string()),
    configuration: v.optional(v.object({
      paymentProvider: v.optional(v.string()), // Legacy: single provider
      paymentProviders: v.optional(v.array(v.string())), // NEW: multiple providers
      providerConfig: v.optional(v.any()),
      linkedProducts: v.optional(v.array(v.id("objects"))),
      customBranding: v.optional(v.any()),
      publicSlug: v.optional(v.string()),
      publishedAt: v.optional(v.number()), // Timestamp when published
      settings: v.optional(v.any()),
      themeCode: v.optional(v.string()), // Theme code (e.g., "modern-gradient")
      templateCode: v.optional(v.string()), // Template code reference
      templateId: v.optional(v.id("objects")), // Template reference (checkout page template)
      forceB2B: v.optional(v.boolean()), // Force B2B mode (require organization info)
      defaultLanguage: v.optional(v.string()), // Default language code (en, de, pl, es, fr, ja)

      // PDF TEMPLATE REFERENCES (for generated PDFs)
      invoiceTemplateId: v.optional(v.id("objects")), // Reference to PDF invoice template
      ticketTemplateId: v.optional(v.id("objects")), // Reference to PDF ticket template
      certificateTemplateId: v.optional(v.id("objects")), // Reference to PDF certificate template

      // EMAIL TEMPLATE REFERENCES (for transactional emails)
      confirmationEmailTemplateId: v.optional(v.id("objects")), // Order confirmation email template
      salesNotificationEmailTemplateId: v.optional(v.id("objects")), // Internal sales notification template
      salesNotificationRecipientEmail: v.optional(v.string()), // Email to receive sales notifications (defaults to support@l4yercak3.com)

      // DEPRECATED: Old template code system (kept for backward compatibility)
      pdfTemplateCode: v.optional(v.union(
        v.literal("invoice_b2c_receipt_v1"),
        v.literal("invoice_b2b_single_v1"),
        v.literal("invoice_b2b_consolidated_v1"),
        v.literal("invoice_b2b_consolidated_detailed_v1")
      )), // DEPRECATED: Use invoiceTemplateId instead

      // NEW: Template Set Override (simplifies configuration)
      templateSetId: v.optional(v.id("objects")), // Checkout-specific template set (ticket + invoice + email)

      // Behavior execution settings
      allowBackNavigation: v.optional(v.boolean()), // Allow users to go back to previous steps
      behaviorExecutionTiming: v.optional(v.string()), // "eager" or "lazy" execution
      debugMode: v.optional(v.boolean()), // Enable debug logging
      executeBehaviorsOnStepChange: v.optional(v.boolean()), // Execute behaviors when changing steps
      showProgressBar: v.optional(v.boolean()), // Show progress indicator

      // Behavior-driven checkout configuration
      behaviors: v.optional(v.array(v.object({
        type: v.string(),
        config: v.optional(v.any()),
        priority: v.optional(v.number()),
      }))),
      branding: v.optional(v.any()), // Custom branding configuration
      checkoutFlow: v.optional(v.object({
        steps: v.optional(v.array(v.object({
          id: v.string(),
          name: v.string(),
          enabled: v.optional(v.boolean()),
        }))),
      })),
      createdVia: v.optional(v.string()), // How the checkout was created (e.g., "ai_tool", "manual")
      linkedEventId: v.optional(v.id("objects")), // Linked event
      linkedFormId: v.optional(v.id("objects")), // Linked form for registration
      paymentMode: v.optional(v.string()), // Payment mode (e.g., "hybrid", "stripe-only", "invoice-only")
    })),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // Get instance
    const instance = await ctx.db.get(args.instanceId);
    if (!instance || instance.type !== "checkout_instance") {
      throw new Error("Checkout instance not found");
    }

    // CHECK FEATURE ACCESS: Custom branding requires Professional+
    if (args.configuration?.customBranding) {
      await checkFeatureAccess(ctx, instance.organizationId, "customBrandingEnabled");
    }

    // CHECK FEATURE ACCESS: Template set overrides require Professional+
    if (args.configuration?.templateSetId) {
      await checkFeatureAccess(ctx, instance.organizationId, "templateSetOverridesEnabled");
    }

    // Check permission
    const hasPermission = await checkPermission(
      ctx,
      userId,
      "manage_operations",
      instance.organizationId
    );

    if (!hasPermission) {
      throw new Error("Permission denied: manage_operations required");
    }

    // Build updates
    const updates: Record<string, unknown> = {
      updatedAt: Date.now(),
    };

    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;
    if (args.status !== undefined) updates.status = args.status;

    if (args.configuration) {
      // CHECK FEATURE ACCESS: Payment providers require Starter tier or higher
      const providers = args.configuration.paymentProviders || (args.configuration.paymentProvider ? [args.configuration.paymentProvider] : []);

      for (const provider of providers) {
        if (provider === "stripe-connect") {
          await checkFeatureAccess(ctx, instance.organizationId, "stripeConnectEnabled");
        } else if (provider === "invoice") {
          await checkFeatureAccess(ctx, instance.organizationId, "invoicePaymentEnabled");
        } else if (provider === "manual") {
          await checkFeatureAccess(ctx, instance.organizationId, "manualPaymentEnabled");
        }
      }

      // CHECK FEATURE ACCESS: Multi-language checkout requires Starter tier or higher
      if (args.configuration.defaultLanguage && args.configuration.defaultLanguage !== "en") {
        await checkFeatureAccess(ctx, instance.organizationId, "multiLanguageEnabled");
      }

      // CHECK FEATURE ACCESS: Stripe Tax requires Starter tier or higher (checking settings object)
      if (args.configuration.settings && typeof args.configuration.settings === "object") {
        const settings = args.configuration.settings as { stripeTaxEnabled?: boolean };
        if (settings.stripeTaxEnabled === true) {
          await checkFeatureAccess(ctx, instance.organizationId, "stripeTaxEnabled");
        }
      }

      const customProperties: Record<string, unknown> = {
        ...(instance.customProperties || {}),
        ...args.configuration,
      };

      // Set publishedAt when publishing
      if (args.status === "published" && instance.status !== "published") {
        customProperties.publishedAt = Date.now();
      }

      updates.customProperties = customProperties;
    }

    await ctx.db.patch(args.instanceId, updates);

    // Log action
    await ctx.db.insert("objectActions", {
      organizationId: instance.organizationId,
      objectId: args.instanceId,
      actionType: "checkout_instance_updated",
      actionData: {
        updates: Object.keys(updates),
      },
      performedBy: userId,
      performedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * DELETE CHECKOUT INSTANCE
 *
 * Soft deletes a checkout instance.
 */
export const deleteCheckoutInstance = mutation({
  args: {
    sessionId: v.string(),
    instanceId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const instance = await ctx.db.get(args.instanceId);
    if (!instance || instance.type !== "checkout_instance") {
      throw new Error("Checkout instance not found");
    }

    const hasPermission = await checkPermission(
      ctx,
      userId,
      "manage_operations",
      instance.organizationId
    );

    if (!hasPermission) {
      throw new Error("Permission denied: manage_operations required");
    }

    await ctx.db.patch(args.instanceId, {
      status: "deleted",
      updatedAt: Date.now(),
    });

    await ctx.db.insert("objectActions", {
      organizationId: instance.organizationId,
      objectId: args.instanceId,
      actionType: "checkout_instance_deleted",
      actionData: {},
      performedBy: userId,
      performedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * GET CHECKOUT INSTANCES
 *
 * Lists all checkout instances for an organization.
 */
export const getCheckoutInstances = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    let instances = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "checkout_instance")
      )
      .collect();

    // Filter by status if provided
    if (args.status) {
      instances = instances.filter((i) => i.status === args.status);
    } else {
      // Exclude deleted by default
      instances = instances.filter((i) => i.status !== "deleted");
    }

    // Sort by update time descending
    instances.sort((a, b) => b.updatedAt - a.updatedAt);

    return instances;
  },
});

/**
 * GET CHECKOUT INSTANCE BY ID
 *
 * Returns full details for a single checkout instance.
 */
export const getCheckoutInstanceById = query({
  args: {
    sessionId: v.string(),
    instanceId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const instance = await ctx.db.get(args.instanceId);
    if (!instance || instance.type !== "checkout_instance") {
      throw new Error("Checkout instance not found");
    }

    return instance;
  },
});

/**
 * GET CHECKOUT INSTANCE BY SLUG
 *
 * Public query for embedded/standalone checkout pages.
 */
export const getCheckoutInstanceBySlug = query({
  args: {
    organizationId: v.id("organizations"),
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    const instances = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "checkout_instance")
      )
      .filter((q) => q.eq(q.field("status"), "published"))
      .collect();

    return instances.find(
      (i) => i.customProperties?.publicSlug === args.slug
    );
  },
});

/**
 * PUBLISH CHECKOUT INSTANCE
 *
 * Publishes a draft checkout instance.
 */
export const publishCheckoutInstance = mutation({
  args: {
    sessionId: v.string(),
    instanceId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const instance = await ctx.db.get(args.instanceId);
    if (!instance || instance.type !== "checkout_instance") {
      throw new Error("Checkout instance not found");
    }

    const hasPermission = await checkPermission(
      ctx,
      userId,
      "manage_operations",
      instance.organizationId
    );

    if (!hasPermission) {
      throw new Error("Permission denied: manage_operations required to publish checkouts");
    }

    await ctx.db.patch(args.instanceId, {
      status: "published",
      customProperties: {
        ...instance.customProperties,
        publishedAt: Date.now(),
      },
      updatedAt: Date.now(),
    });

    await ctx.db.insert("objectActions", {
      organizationId: instance.organizationId,
      objectId: args.instanceId,
      actionType: "checkout_instance_published",
      actionData: {},
      performedBy: userId,
      performedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * UNPUBLISH CHECKOUT INSTANCE
 *
 * Reverts a published checkout back to draft.
 */
export const unpublishCheckoutInstance = mutation({
  args: {
    sessionId: v.string(),
    instanceId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const instance = await ctx.db.get(args.instanceId);
    if (!instance || instance.type !== "checkout_instance") {
      throw new Error("Checkout instance not found");
    }

    const hasPermission = await checkPermission(
      ctx,
      userId,
      "manage_operations",
      instance.organizationId
    );

    if (!hasPermission) {
      throw new Error("Permission denied: manage_operations required to publish checkouts");
    }

    await ctx.db.patch(args.instanceId, {
      status: "draft",
      updatedAt: Date.now(),
    });

    await ctx.db.insert("objectActions", {
      organizationId: instance.organizationId,
      objectId: args.instanceId,
      actionType: "checkout_instance_unpublished",
      actionData: {},
      performedBy: userId,
      performedAt: Date.now(),
    });

    return { success: true };
  },
});

// ============================================================================
// PUBLIC QUERIES (NO AUTH REQUIRED)
// ============================================================================

/**
 * GET PUBLIC CHECKOUT INSTANCE
 *
 * Fetches a published checkout instance by organization slug and public slug.
 * This is a public query - no authentication required.
 * Used by the public checkout page at /checkout/[orgSlug]/[publicSlug]
 */
export const getPublicCheckoutInstance = query({
  args: {
    orgSlug: v.string(),
    publicSlug: v.string(),
  },
  handler: async (ctx, args) => {
    console.log("🔍 [getPublicCheckoutInstance] Args:", args);

    // Get organization by slug
    const organization = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", args.orgSlug))
      .first();

    console.log("🔍 [getPublicCheckoutInstance] Organization:", organization?._id);

    if (!organization) {
      console.log("❌ [getPublicCheckoutInstance] Organization not found");
      return null;
    }

    // Get checkout instance by publicSlug
    const checkoutInstances = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", organization._id).eq("type", "checkout_instance")
      )
      .filter((q) => q.eq(q.field("status"), "published"))
      .collect();

    console.log("🔍 [getPublicCheckoutInstance] Published checkouts:", checkoutInstances.length);
    console.log("🔍 [getPublicCheckoutInstance] Looking for publicSlug:", args.publicSlug);

    // Find the one with matching publicSlug in customProperties
    const instance = checkoutInstances.find((obj) => {
      const config = obj.customProperties as Record<string, unknown>;
      const objPublicSlug = config?.publicSlug;
      console.log("🔍 [getPublicCheckoutInstance] Checking:", {
        name: obj.name,
        publicSlug: objPublicSlug,
        matches: objPublicSlug === args.publicSlug,
      });
      return objPublicSlug === args.publicSlug;
    });

    console.log("🔍 [getPublicCheckoutInstance] Result:", instance ? "Found" : "Not found");

    return instance || null;
  },
});

/**
 * GET PUBLIC CHECKOUT INSTANCE BY ID
 * Fetches a checkout instance by its ID for public pages
 * No auth required - public query
 */
export const getPublicCheckoutInstanceById = query({
  args: {
    instanceId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const instance = await ctx.db.get(args.instanceId);

    if (!instance || instance.type !== "checkout_instance") {
      return null;
    }

    // Only return published checkouts for public access
    if (instance.status !== "published") {
      return null;
    }

    return instance;
  },
});

/**
 * GET PUBLIC CHECKOUT PRODUCTS
 * Fetches linked products for a public checkout instance
 * No auth required - public query
 */
export const getPublicCheckoutProducts = query({
  args: {
    checkoutInstanceId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    console.log("🔍 [getPublicCheckoutProducts] Fetching products for:", args.checkoutInstanceId);

    // Get the checkout instance
    const checkout = await ctx.db.get(args.checkoutInstanceId);
    if (!checkout || checkout.type !== "checkout_instance") {
      console.log("❌ [getPublicCheckoutProducts] Checkout not found");
      return [];
    }

    // 🎯 Read linked products from customProperties (single source of truth)
    const linkedProductIds = (checkout.customProperties?.linkedProducts as string[]) || [];
    console.log("🔍 [getPublicCheckoutProducts] Found linkedProducts:", linkedProductIds.length);

    if (linkedProductIds.length === 0) {
      return [];
    }

    // Fetch all products WITH event data and sponsors
    const products = await Promise.all(
      linkedProductIds.map(async (productId) => {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const productRecord = await ctx.db.get(productId as any);
          if (!productRecord || !("type" in productRecord) || productRecord.type !== "product") return null;

          // Type assertion: we've verified this is from the objects table
          const product = productRecord as typeof productRecord & {
            _id: Id<"objects">;
            type: "product";
            subtype: string;
            customProperties?: Record<string, unknown>;
          };

          // For products with forms, fetch the form data
          let formData = null;
          const formId = product.customProperties?.formId as string | undefined;

        if (formId) {
          console.log("🔍 [getPublicCheckoutProducts] Product has formId:", formId);

          // Find the form object
          const formLinks = await ctx.db
            .query("objectLinks")
            .withIndex("by_from_object", (q) => q.eq("fromObjectId", product._id))
            .filter((q) => q.eq(q.field("linkType"), "requiresForm"))
            .collect();

          if (formLinks.length > 0) {
            const form = await ctx.db.get(formLinks[0].toObjectId);
            if (form) {
              console.log("🔍 [getPublicCheckoutProducts] Found form:", form.name);
              formData = form;
            }
          }
        }

        // 🎯 LOAD EVENT DATA AND SPONSORS (same logic as getProductsByIds)
        let eventData = null;
        let eventSponsors: Array<{ name: string; level?: string }> = [];

        // Find event link (event->product "offers")
        const eventLinks = await ctx.db
          .query("objectLinks")
          .withIndex("by_to_object", (q) => q.eq("toObjectId", product._id))
          .filter((q) => q.eq(q.field("linkType"), "offers"))
          .collect();

        if (eventLinks.length > 0) {
          const event = await ctx.db.get(eventLinks[0].fromObjectId);
          if (event && event.type === "event") {
            console.log("🎉 [getPublicCheckoutProducts] Found event:", event.name);
            eventData = event;

            // Load ALL sponsors for this event
            const sponsorLinks = await ctx.db
              .query("objectLinks")
              .withIndex("by_from_object", (q) => q.eq("fromObjectId", event._id))
              .filter((q) => q.eq(q.field("linkType"), "sponsored_by"))
              .collect();

            console.log(`🏢 [getPublicCheckoutProducts] Found ${sponsorLinks.length} sponsor links`);

            // Fetch all sponsor organizations
            const sponsorResults = await Promise.all(
              sponsorLinks.map(async (link) => {
                const sponsor = await ctx.db.get(link.toObjectId);
                if (sponsor && sponsor.type === "crm_organization") {
                  const level = (link.properties as Record<string, unknown> | undefined)?.sponsorLevel as string | undefined;
                  console.log(`🏢 [getPublicCheckoutProducts] Sponsor: ${sponsor.name}${level ? ` (${level})` : ""}`);
                  return {
                    name: sponsor.name,
                    ...(level && { level }), // Only include level if defined
                  };
                }
                return null;
              })
            );
            eventSponsors = sponsorResults.filter((s): s is { name: string; level?: string } => s !== null);
          }
        }

        // Extract event details from customProperties
        const eventProps = eventData?.customProperties as Record<string, unknown> | undefined;
        const eventDetails = eventData ? {
          eventName: eventData.name,
          eventDescription: eventData.description || "",
          eventLocation: eventProps?.location as string | undefined,
          eventStartDate: eventProps?.startDate as number | undefined,
          eventEndDate: eventProps?.endDate as number | undefined,
          eventAgenda: eventProps?.agenda as Array<{ time: string; title: string; description?: string }> | undefined,
          eventSponsors,
        } : {};

        // DEBUG: Log product structure
        console.log("📦 [Product Structure]:", {
          id: product._id,
          name: 'name' in product ? product.name : undefined,
          type: 'type' in product ? product.type : undefined,
          subtype: 'subtype' in product ? product.subtype : undefined,
          hasSubtype: 'subtype' in product,
          eventName: eventData?.name,
          eventLocation: eventProps?.location,
          eventStartDate: eventProps?.startDate,
          sponsorCount: eventSponsors.length,
          allKeys: Object.keys(product)
        });

        return {
          ...product,
          linkedForm: formData,
          ...eventDetails, // Spread all event details at top level
        };
        } catch (error) {
          console.error("Error fetching product:", productId, error);
          return null;
        }
      })
    );

    // Filter out nulls and validate product availability
    type ProductWithAvailability = {
      product: typeof products[number] | null;
      available: boolean;
    };

    const availabilityChecks: ProductWithAvailability[] = await Promise.all(
      products.map(async (p): Promise<ProductWithAvailability> => {
        if (p === null || !("status" in p)) {
          return { product: p, available: false };
        }

        // Use shared validation function from productOntology
        const availability = await ctx.runQuery(
          internal.productOntology.checkProductAvailability,
          { productId: p._id }
        );

        if (!availability.available) {
          console.log(`⏸️ [getPublicCheckoutProducts] Product ${p._id} not available: ${availability.reason}`);
        }

        return { product: p, available: availability.available };
      })
    );

    const availableProducts = availabilityChecks
      .filter((check: ProductWithAvailability) => check.available && check.product !== null)
      .map((check: ProductWithAvailability) => check.product);

    console.log("🔍 [getPublicCheckoutProducts] Returning products:", availableProducts.length);

    return availableProducts;
  },
});
