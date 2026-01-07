/**
 * API V1: CHECKOUT CRUD INTERNAL HANDLERS
 *
 * Internal mutations/queries for MCP checkout instance management.
 * Handles checkout instance CRUD operations without requiring sessionId authentication.
 *
 * NOTE: The existing checkoutInternal.ts handles payment sessions and processing.
 * This file handles checkout instance configuration for MCP/AI skill usage.
 */

import { v } from "convex/values";
import { internalQuery, internalMutation } from "../../_generated/server";
import type { Id } from "../../_generated/dataModel";
import { checkResourceLimit, checkFeatureAccess } from "../../licensing/helpers";

// ============================================================================
// INTERNAL QUERIES
// ============================================================================

/**
 * LIST CHECKOUT INSTANCES (Internal)
 * Returns all checkout instances for an organization
 */
export const listCheckoutInstancesInternal = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let instances = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "checkout_instance")
      )
      .collect();

    // Apply status filter
    if (args.status) {
      instances = instances.filter((i) => i.status === args.status);
    } else {
      // Exclude deleted by default
      instances = instances.filter((i) => i.status !== "deleted");
    }

    // Sort by update time descending
    instances.sort((a, b) => b.updatedAt - a.updatedAt);

    return instances.map((i) => ({
      _id: i._id,
      name: i.name,
      description: i.description,
      status: i.status,
      publicSlug: i.customProperties?.publicSlug,
      templateCode: i.customProperties?.templateCode,
      linkedProductCount: (i.customProperties?.linkedProducts as string[] | undefined)?.length || 0,
      publishedAt: i.customProperties?.publishedAt,
      createdAt: i.createdAt,
      updatedAt: i.updatedAt,
    }));
  },
});

/**
 * GET CHECKOUT INSTANCE (Internal)
 * Returns a single checkout instance by ID
 */
export const getCheckoutInstanceInternal = internalQuery({
  args: {
    instanceId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const instance = await ctx.db.get(args.instanceId);

    if (!instance || instance.type !== "checkout_instance") {
      return null;
    }

    return instance;
  },
});

/**
 * GET CHECKOUT INSTANCE BY SLUG (Internal)
 * Returns a checkout instance by its public slug
 */
export const getCheckoutInstanceBySlugInternal = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    publicSlug: v.string(),
  },
  handler: async (ctx, args) => {
    const instances = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "checkout_instance")
      )
      .collect();

    return instances.find((i) => i.customProperties?.publicSlug === args.publicSlug) || null;
  },
});

/**
 * GET CHECKOUT PRODUCTS (Internal)
 * Returns products linked to a checkout instance
 */
export const getCheckoutProductsInternal = internalQuery({
  args: {
    instanceId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const instance = await ctx.db.get(args.instanceId);

    if (!instance || instance.type !== "checkout_instance") {
      return [];
    }

    const linkedProductIds = (instance.customProperties?.linkedProducts as string[]) || [];

    if (linkedProductIds.length === 0) {
      return [];
    }

    const products = await Promise.all(
      linkedProductIds.map(async (productId) => {
        try {
          const product = await ctx.db.get(productId as Id<"objects">);
          if (!product || product.type !== "product") return null;
          return {
            _id: product._id,
            name: product.name,
            description: product.description,
            subtype: product.subtype,
            status: product.status,
            priceInCents: product.customProperties?.priceInCents,
            currency: product.customProperties?.currency,
            maxQuantity: product.customProperties?.maxQuantity,
            soldCount: product.customProperties?.soldCount,
          };
        } catch {
          return null;
        }
      })
    );

    return products.filter((p) => p !== null);
  },
});

// ============================================================================
// INTERNAL MUTATIONS
// ============================================================================

/**
 * CREATE CHECKOUT INSTANCE (Internal)
 * Creates a new checkout instance
 */
export const createCheckoutInstanceInternal = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    name: v.string(),
    description: v.optional(v.string()),
    templateCode: v.string(),
    publicSlug: v.optional(v.string()),
    linkedProducts: v.optional(v.array(v.id("objects"))),
    paymentProviders: v.optional(v.array(v.string())),
    forceB2B: v.optional(v.boolean()),
    defaultLanguage: v.optional(v.string()),
    settings: v.optional(v.any()),
    customBranding: v.optional(v.any()),
  },
  handler: async (ctx, args): Promise<Id<"objects">> => {
    // Check license limit
    await checkResourceLimit(ctx, args.organizationId, "checkout_instance", "maxCheckoutInstances");

    // Get template to determine subtype
    const systemOrg = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", "system"))
      .first();

    if (!systemOrg) {
      throw new Error("System organization not found");
    }

    const templates = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", systemOrg._id).eq("type", "template")
      )
      .filter((q) => q.eq(q.field("subtype"), "checkout"))
      .collect();

    const template = templates.find(
      (t) => t.customProperties?.code === args.templateCode
    );

    if (!template) {
      throw new Error(`Checkout template "${args.templateCode}" not found`);
    }

    // Generate public slug if not provided
    const publicSlug = args.publicSlug ||
      args.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") +
      "-" +
      Math.random().toString(36).substring(2, 8);

    // Check slug uniqueness
    const existingSlug = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "checkout_instance")
      )
      .collect();

    if (existingSlug.some((i) => i.customProperties?.publicSlug === publicSlug)) {
      throw new Error(`Public slug "${publicSlug}" is already in use`);
    }

    // Create checkout instance
    const instanceId = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "checkout_instance",
      subtype: template.subtype || "checkout",
      name: args.name,
      description: args.description,
      status: "draft",
      customProperties: {
        templateCode: args.templateCode,
        templateId: template._id,
        publicSlug,
        linkedProducts: args.linkedProducts || [],
        paymentProviders: args.paymentProviders || ["stripe-connect"],
        forceB2B: args.forceB2B || false,
        defaultLanguage: args.defaultLanguage || "en",
        settings: args.settings || {
          maxQuantityPerOrder: 10,
          requiresAccount: false,
          collectShipping: false,
        },
        customBranding: args.customBranding || {},
      },
      createdBy: args.userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Create link from instance → template
    await ctx.db.insert("objectLinks", {
      organizationId: args.organizationId,
      fromObjectId: instanceId,
      toObjectId: template._id,
      linkType: "uses_template",
      createdBy: args.userId,
      createdAt: Date.now(),
    });

    // Log action
    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: instanceId,
      actionType: "checkout_instance_created",
      actionData: {
        templateCode: args.templateCode,
        publicSlug,
        source: "mcp",
      },
      performedBy: args.userId,
      performedAt: Date.now(),
    });

    return instanceId;
  },
});

/**
 * UPDATE CHECKOUT INSTANCE (Internal)
 * Updates an existing checkout instance
 */
export const updateCheckoutInstanceInternal = internalMutation({
  args: {
    instanceId: v.id("objects"),
    userId: v.id("users"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    publicSlug: v.optional(v.string()),
    linkedProducts: v.optional(v.array(v.id("objects"))),
    paymentProviders: v.optional(v.array(v.string())),
    forceB2B: v.optional(v.boolean()),
    defaultLanguage: v.optional(v.string()),
    settings: v.optional(v.any()),
    customBranding: v.optional(v.any()),
    // Template references
    invoiceTemplateId: v.optional(v.id("objects")),
    ticketTemplateId: v.optional(v.id("objects")),
    confirmationEmailTemplateId: v.optional(v.id("objects")),
    templateSetId: v.optional(v.id("objects")),
  },
  handler: async (ctx, args) => {
    const instance = await ctx.db.get(args.instanceId);
    if (!instance || instance.type !== "checkout_instance") {
      throw new Error("Checkout instance not found");
    }

    // Check feature access for custom branding
    if (args.customBranding) {
      await checkFeatureAccess(ctx, instance.organizationId, "customBrandingEnabled");
    }

    // Check feature access for template set overrides
    if (args.templateSetId) {
      await checkFeatureAccess(ctx, instance.organizationId, "templateSetOverridesEnabled");
    }

    // Check feature access for multi-language
    if (args.defaultLanguage && args.defaultLanguage !== "en") {
      await checkFeatureAccess(ctx, instance.organizationId, "multiLanguageEnabled");
    }

    // Check slug uniqueness if changing
    if (args.publicSlug && args.publicSlug !== instance.customProperties?.publicSlug) {
      const existingSlug = await ctx.db
        .query("objects")
        .withIndex("by_org_type", (q) =>
          q.eq("organizationId", instance.organizationId).eq("type", "checkout_instance")
        )
        .collect();

      if (existingSlug.some((i) => i._id !== args.instanceId && i.customProperties?.publicSlug === args.publicSlug)) {
        throw new Error(`Public slug "${args.publicSlug}" is already in use`);
      }
    }

    const existingProps = instance.customProperties as Record<string, unknown>;
    const updatedProps: Record<string, unknown> = { ...existingProps };

    // Update provided fields
    if (args.publicSlug !== undefined) updatedProps.publicSlug = args.publicSlug;
    if (args.linkedProducts !== undefined) updatedProps.linkedProducts = args.linkedProducts;
    if (args.paymentProviders !== undefined) updatedProps.paymentProviders = args.paymentProviders;
    if (args.forceB2B !== undefined) updatedProps.forceB2B = args.forceB2B;
    if (args.defaultLanguage !== undefined) updatedProps.defaultLanguage = args.defaultLanguage;
    if (args.settings !== undefined) updatedProps.settings = args.settings;
    if (args.customBranding !== undefined) updatedProps.customBranding = args.customBranding;
    if (args.invoiceTemplateId !== undefined) updatedProps.invoiceTemplateId = args.invoiceTemplateId;
    if (args.ticketTemplateId !== undefined) updatedProps.ticketTemplateId = args.ticketTemplateId;
    if (args.confirmationEmailTemplateId !== undefined) updatedProps.confirmationEmailTemplateId = args.confirmationEmailTemplateId;
    if (args.templateSetId !== undefined) updatedProps.templateSetId = args.templateSetId;

    await ctx.db.patch(args.instanceId, {
      ...(args.name && { name: args.name }),
      ...(args.description !== undefined && { description: args.description }),
      customProperties: updatedProps,
      updatedAt: Date.now(),
    });

    // Log action
    await ctx.db.insert("objectActions", {
      organizationId: instance.organizationId,
      objectId: args.instanceId,
      actionType: "checkout_instance_updated",
      actionData: {
        updatedFields: Object.keys(args).filter((k) => k !== "instanceId" && k !== "userId"),
        source: "mcp",
      },
      performedBy: args.userId,
      performedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * DELETE CHECKOUT INSTANCE (Internal)
 * Soft-deletes a checkout instance
 */
export const deleteCheckoutInstanceInternal = internalMutation({
  args: {
    instanceId: v.id("objects"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const instance = await ctx.db.get(args.instanceId);
    if (!instance || instance.type !== "checkout_instance") {
      throw new Error("Checkout instance not found");
    }

    await ctx.db.patch(args.instanceId, {
      status: "deleted",
      updatedAt: Date.now(),
    });

    // Log action
    await ctx.db.insert("objectActions", {
      organizationId: instance.organizationId,
      objectId: args.instanceId,
      actionType: "checkout_instance_deleted",
      actionData: {
        name: instance.name,
        publicSlug: instance.customProperties?.publicSlug,
        source: "mcp",
      },
      performedBy: args.userId,
      performedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * PUBLISH CHECKOUT INSTANCE (Internal)
 * Publishes a draft checkout instance
 */
export const publishCheckoutInstanceInternal = internalMutation({
  args: {
    instanceId: v.id("objects"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const instance = await ctx.db.get(args.instanceId);
    if (!instance || instance.type !== "checkout_instance") {
      throw new Error("Checkout instance not found");
    }

    // Validate checkout has required configuration
    const props = instance.customProperties as Record<string, unknown>;

    if (!props.linkedProducts || (props.linkedProducts as string[]).length === 0) {
      throw new Error("Checkout must have at least one linked product");
    }

    if (!props.publicSlug) {
      throw new Error("Checkout must have a public slug");
    }

    await ctx.db.patch(args.instanceId, {
      status: "published",
      customProperties: {
        ...props,
        publishedAt: Date.now(),
      },
      updatedAt: Date.now(),
    });

    // Log action
    await ctx.db.insert("objectActions", {
      organizationId: instance.organizationId,
      objectId: args.instanceId,
      actionType: "checkout_instance_published",
      actionData: {
        publicSlug: props.publicSlug,
        linkedProductCount: (props.linkedProducts as string[]).length,
        source: "mcp",
      },
      performedBy: args.userId,
      performedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * UNPUBLISH CHECKOUT INSTANCE (Internal)
 * Reverts a published checkout to draft
 */
export const unpublishCheckoutInstanceInternal = internalMutation({
  args: {
    instanceId: v.id("objects"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const instance = await ctx.db.get(args.instanceId);
    if (!instance || instance.type !== "checkout_instance") {
      throw new Error("Checkout instance not found");
    }

    await ctx.db.patch(args.instanceId, {
      status: "draft",
      updatedAt: Date.now(),
    });

    // Log action
    await ctx.db.insert("objectActions", {
      organizationId: instance.organizationId,
      objectId: args.instanceId,
      actionType: "checkout_instance_unpublished",
      actionData: {
        publicSlug: instance.customProperties?.publicSlug,
        source: "mcp",
      },
      performedBy: args.userId,
      performedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * ADD PRODUCT TO CHECKOUT (Internal)
 * Adds a product to a checkout instance
 */
export const addProductToCheckoutInternal = internalMutation({
  args: {
    instanceId: v.id("objects"),
    userId: v.id("users"),
    productId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const instance = await ctx.db.get(args.instanceId);
    if (!instance || instance.type !== "checkout_instance") {
      throw new Error("Checkout instance not found");
    }

    // Verify product exists
    const product = await ctx.db.get(args.productId);
    if (!product || product.type !== "product") {
      throw new Error("Product not found");
    }

    const linkedProducts = (instance.customProperties?.linkedProducts as string[]) || [];

    if (linkedProducts.includes(args.productId)) {
      throw new Error("Product is already linked to this checkout");
    }

    await ctx.db.patch(args.instanceId, {
      customProperties: {
        ...instance.customProperties,
        linkedProducts: [...linkedProducts, args.productId],
      },
      updatedAt: Date.now(),
    });

    // Log action
    await ctx.db.insert("objectActions", {
      organizationId: instance.organizationId,
      objectId: args.instanceId,
      actionType: "checkout_product_added",
      actionData: {
        productId: args.productId,
        productName: product.name,
        source: "mcp",
      },
      performedBy: args.userId,
      performedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * REMOVE PRODUCT FROM CHECKOUT (Internal)
 * Removes a product from a checkout instance
 */
export const removeProductFromCheckoutInternal = internalMutation({
  args: {
    instanceId: v.id("objects"),
    userId: v.id("users"),
    productId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const instance = await ctx.db.get(args.instanceId);
    if (!instance || instance.type !== "checkout_instance") {
      throw new Error("Checkout instance not found");
    }

    const linkedProducts = (instance.customProperties?.linkedProducts as string[]) || [];

    if (!linkedProducts.includes(args.productId)) {
      throw new Error("Product is not linked to this checkout");
    }

    await ctx.db.patch(args.instanceId, {
      customProperties: {
        ...instance.customProperties,
        linkedProducts: linkedProducts.filter((id) => id !== args.productId),
      },
      updatedAt: Date.now(),
    });

    // Get product name for logging
    const product = await ctx.db.get(args.productId);

    // Log action
    await ctx.db.insert("objectActions", {
      organizationId: instance.organizationId,
      objectId: args.instanceId,
      actionType: "checkout_product_removed",
      actionData: {
        productId: args.productId,
        productName: product?.name || "Unknown",
        source: "mcp",
      },
      performedBy: args.userId,
      performedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * DUPLICATE CHECKOUT INSTANCE (Internal)
 * Creates a copy of an existing checkout instance
 */
export const duplicateCheckoutInstanceInternal = internalMutation({
  args: {
    instanceId: v.id("objects"),
    userId: v.id("users"),
    newName: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ instanceId: Id<"objects">; name: string; publicSlug: string }> => {
    const sourceInstance = await ctx.db.get(args.instanceId);
    if (!sourceInstance || sourceInstance.type !== "checkout_instance") {
      throw new Error("Checkout instance not found");
    }

    // Check license limit
    await checkResourceLimit(ctx, sourceInstance.organizationId, "checkout_instance", "maxCheckoutInstances");

    const newName = args.newName || `Copy of ${sourceInstance.name}`;
    const newSlug = newName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") +
      "-" +
      Math.random().toString(36).substring(2, 8);

    const sourceProps = sourceInstance.customProperties as Record<string, unknown>;

    // Create duplicate
    const newInstanceId = await ctx.db.insert("objects", {
      organizationId: sourceInstance.organizationId,
      type: "checkout_instance",
      subtype: sourceInstance.subtype,
      name: newName,
      description: sourceInstance.description,
      status: "draft",
      customProperties: {
        ...sourceProps,
        publicSlug: newSlug,
        publishedAt: null,
      },
      createdBy: args.userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Copy template link
    if (sourceProps.templateId) {
      await ctx.db.insert("objectLinks", {
        organizationId: sourceInstance.organizationId,
        fromObjectId: newInstanceId,
        toObjectId: sourceProps.templateId as Id<"objects">,
        linkType: "uses_template",
        createdBy: args.userId,
        createdAt: Date.now(),
      });
    }

    // Log action
    await ctx.db.insert("objectActions", {
      organizationId: sourceInstance.organizationId,
      objectId: newInstanceId,
      actionType: "checkout_instance_duplicated",
      actionData: {
        sourceInstanceId: args.instanceId,
        sourceInstanceName: sourceInstance.name,
        newSlug,
        source: "mcp",
      },
      performedBy: args.userId,
      performedAt: Date.now(),
    });

    return { instanceId: newInstanceId, name: newName, publicSlug: newSlug };
  },
});
