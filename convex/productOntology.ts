/**
 * PRODUCT ONTOLOGY
 *
 * Manages products for event management (tickets, merchandise, services).
 * Uses the universal ontology system (objects table).
 *
 * Product Types (subtype):
 * - "ticket" - Event tickets (VIP, standard, early-bird)
 * - "physical" - Physical goods (merchandise, swag)
 * - "digital" - Digital products (downloads, access codes)
 *
 * Status Workflow:
 * - "draft" - Being created
 * - "active" - Available for sale
 * - "sold_out" - No more inventory
 * - "archived" - No longer offered
 */

import { query, mutation } from "./_generated/server";
import { internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { requireAuthenticatedUser } from "./rbacHelpers";

/**
 * GET PRODUCTS
 * Returns all products for an organization
 */
export const getProducts = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    subtype: v.optional(v.string()), // Filter by product type
    status: v.optional(v.string()),  // Filter by status
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const q = ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "product")
      );

    let products = await q.collect();

    // Apply filters
    if (args.subtype) {
      products = products.filter((p) => p.subtype === args.subtype);
    }

    if (args.status) {
      products = products.filter((p) => p.status === args.status);
    }

    return products;
  },
});

/**
 * GET PRODUCTS WITH FORMS
 * Returns all products for an organization with linked form data included
 */
export const getProductsWithForms = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    subtype: v.optional(v.string()), // Filter by product type
    status: v.optional(v.string()),  // Filter by status
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const q = ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "product")
      );

    let products = await q.collect();

    // Apply filters
    if (args.subtype) {
      products = products.filter((p) => p.subtype === args.subtype);
    }

    if (args.status) {
      products = products.filter((p) => p.status === args.status);
    }

    // For each product, fetch linked form
    const productsWithForms = await Promise.all(
      products.map(async (product) => {
        // Find linked form via objectLinks
        const formLinks = await ctx.db
          .query("objectLinks")
          .withIndex("by_from_object", (q) => q.eq("fromObjectId", product._id))
          .collect();

        const formLink = formLinks.find((link) => link.linkType === "requiresForm");

        if (formLink) {
          // Fetch the form
          const form = await ctx.db.get(formLink.toObjectId);
          if (form && form.type === "form") {
            // Add form data to customProperties
            return {
              ...product,
              customProperties: {
                ...product.customProperties,
                formId: form._id,
                formTiming: formLink.properties?.timing || "duringCheckout",
                formRequired: formLink.properties?.required ?? true,
              },
            };
          }
        }

        return product;
      })
    );

    return productsWithForms;
  },
});

/**
 * GET PRODUCT
 * Get a single product by ID
 */
export const getProduct = query({
  args: {
    sessionId: v.string(),
    productId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const product = await ctx.db.get(args.productId);

    if (!product || product.type !== "product") {
      throw new Error("Product not found");
    }

    return product;
  },
});

/**
 * GET PRODUCT WITH FORM
 * Get a single product by ID with linked form data included
 */
export const getProductWithForm = query({
  args: {
    sessionId: v.string(),
    productId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const product = await ctx.db.get(args.productId);

    if (!product || product.type !== "product") {
      throw new Error("Product not found");
    }

    // Find linked form via objectLinks
    const formLinks = await ctx.db
      .query("objectLinks")
      .withIndex("by_from_object", (q) => q.eq("fromObjectId", args.productId))
      .collect();

    const formLink = formLinks.find((link) => link.linkType === "requiresForm");

    if (formLink) {
      // Fetch the form
      const form = await ctx.db.get(formLink.toObjectId);
      if (form && form.type === "form") {
        // Add form data to customProperties
        return {
          ...product,
          customProperties: {
            ...product.customProperties,
            formId: form._id,
            formTiming: formLink.properties?.timing || "duringCheckout",
            formRequired: formLink.properties?.required ?? true,
          },
        };
      }
    }

    return product;
  },
});

/**
 * CREATE PRODUCT
 * Create a new product with optional event association
 */
export const createProduct = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    subtype: v.string(), // "ticket" | "physical" | "digital"
    name: v.string(),
    description: v.optional(v.string()),
    price: v.number(), // Price in cents (e.g., 49900 = $499.00)
    currency: v.optional(v.string()), // Default: "USD"
    inventory: v.optional(v.number()), // Available quantity
    eventId: v.optional(v.id("objects")), // Optional: Link product to event (event->product "offers")
    customProperties: v.optional(v.record(v.string(), v.any())),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // Validate subtype
    const validSubtypes = ["ticket", "physical", "digital"];
    if (!validSubtypes.includes(args.subtype)) {
      throw new Error(
        `Invalid product subtype. Must be one of: ${validSubtypes.join(", ")}`
      );
    }

    // Validate event if provided
    if (args.eventId) {
      const event = await ctx.db.get(args.eventId);
      if (!event || event.type !== "event") {
        throw new Error("Invalid event ID");
      }
    }

    // Build customProperties with product data
    const customProperties = {
      price: args.price,
      currency: args.currency || "USD",
      inventory: args.inventory ?? null,
      sold: 0, // Track sales count
      eventId: args.eventId, // Store event link for easy access
      ...(args.customProperties || {}),
    };

    // Create product object
    const productId = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "product",
      subtype: args.subtype,
      name: args.name,
      description: args.description,
      status: "draft", // Start as draft
      customProperties,
      createdBy: userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Create event->product link if eventId provided
    // This creates an "offers" relationship: event offers this product
    if (args.eventId) {
      await ctx.db.insert("objectLinks", {
        organizationId: args.organizationId,
        fromObjectId: args.eventId,
        toObjectId: productId,
        linkType: "offers",
        properties: {
          displayOrder: 0,
          isFeatured: false,
        },
        createdAt: Date.now(),
      });
    }

    return productId;
  },
});

/**
 * UPDATE PRODUCT
 * Update an existing product
 */
export const updateProduct = mutation({
  args: {
    sessionId: v.string(),
    productId: v.id("objects"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    price: v.optional(v.number()),
    inventory: v.optional(v.number()),
    status: v.optional(v.string()), // "draft" | "active" | "sold_out" | "archived"
    customProperties: v.optional(v.record(v.string(), v.any())),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const product = await ctx.db.get(args.productId);

    if (!product || product.type !== "product") {
      throw new Error("Product not found");
    }

    // Build update object
    const updates: Record<string, unknown> = {
      updatedAt: Date.now(),
    };

    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;
    if (args.status !== undefined) {
      const validStatuses = ["draft", "active", "sold_out", "archived"];
      if (!validStatuses.includes(args.status)) {
        throw new Error(
          `Invalid status. Must be one of: ${validStatuses.join(", ")}`
        );
      }
      updates.status = args.status;
    }

    // Update customProperties
    if (args.price !== undefined || args.inventory !== undefined || args.customProperties) {
      const currentProps = product.customProperties || {};

      updates.customProperties = {
        ...currentProps,
        ...(args.price !== undefined && { price: args.price }),
        ...(args.inventory !== undefined && { inventory: args.inventory }),
        ...(args.customProperties || {}),
      };
    }

    await ctx.db.patch(args.productId, updates);

    return args.productId;
  },
});

/**
 * DELETE PRODUCT
 * Soft delete a product (set status to archived)
 */
export const deleteProduct = mutation({
  args: {
    sessionId: v.string(),
    productId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const product = await ctx.db.get(args.productId);

    if (!product || product.type !== "product") {
      throw new Error("Product not found");
    }

    await ctx.db.patch(args.productId, {
      status: "archived",
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * PUBLISH PRODUCT
 * Set product status to "active" (make it available for sale)
 */
export const publishProduct = mutation({
  args: {
    sessionId: v.string(),
    productId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const product = await ctx.db.get(args.productId);

    if (!product || product.type !== "product") {
      throw new Error("Product not found");
    }

    await ctx.db.patch(args.productId, {
      status: "active",
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * UNLINK FORM FROM PRODUCT
 * Remove form link from a product (clears customProperties.formId)
 */
export const unlinkFormFromProduct = mutation({
  args: {
    sessionId: v.string(),
    productId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const product = await ctx.db.get(args.productId);
    if (!product || product.type !== "product") {
      throw new Error("Product not found");
    }

    // Remove form data from customProperties
    const updatedCustomProperties = { ...product.customProperties };
    delete updatedCustomProperties.formId;
    delete updatedCustomProperties.formTiming;
    delete updatedCustomProperties.formRequired;

    await ctx.db.patch(args.productId, {
      customProperties: updatedCustomProperties,
      updatedAt: Date.now(),
    });

    // Also delete any objectLinks with requiresForm (if they exist)
    const formLinks = await ctx.db
      .query("objectLinks")
      .withIndex("by_from_object", (q) => q.eq("fromObjectId", args.productId))
      .collect();

    for (const link of formLinks) {
      if (link.linkType === "requiresForm") {
        await ctx.db.delete(link._id);
      }
    }

    // Log the action
    await ctx.db.insert("objectActions", {
      organizationId: product.organizationId,
      objectId: args.productId,
      actionType: "form_unlinked",
      performedBy: userId,
      performedAt: Date.now(),
      actionData: {},
    });

    return { success: true };
  },
});

/**
 * INCREMENT SOLD COUNT
 * Track product sales (called after successful purchase)
 */
export const incrementSold = mutation({
  args: {
    sessionId: v.string(),
    productId: v.id("objects"),
    quantity: v.optional(v.number()), // Default: 1
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const product = await ctx.db.get(args.productId);

    if (!product || product.type !== "product") {
      throw new Error("Product not found");
    }

    const currentProps = product.customProperties || {};
    const currentSold = currentProps.sold || 0;
    const currentInventory = currentProps.inventory;
    const quantity = args.quantity || 1;

    // Check inventory
    if (currentInventory !== null && currentInventory !== undefined) {
      if (currentInventory < quantity) {
        throw new Error("Insufficient inventory");
      }
    }

    // Update sold count and inventory
    const newSold = currentSold + quantity;
    const newInventory =
      currentInventory !== null && currentInventory !== undefined
        ? currentInventory - quantity
        : null;

    await ctx.db.patch(args.productId, {
      customProperties: {
        ...currentProps,
        sold: newSold,
        inventory: newInventory,
      },
      updatedAt: Date.now(),
      // Auto-mark as sold_out if inventory reaches 0
      ...(newInventory === 0 && { status: "sold_out" }),
    });

    return { newSold, newInventory };
  },
});

/**
 * GET PRODUCTS BY IDS
 * Batch fetch multiple products by their IDs
 * Used for displaying products linked to checkout instances
 */
export const getProductsByIds = query({
  args: {
    sessionId: v.string(),
    productIds: v.array(v.id("objects")),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    // Fetch all products in parallel
    const products = await Promise.all(
      args.productIds.map(async (id) => {
        const product = await ctx.db.get(id);
        if (!product || product.type !== "product") {
          return null;
        }
        return product;
      })
    );

    // Filter out null values (products that don't exist or aren't products)
    return products.filter((p) => p !== null);
  },
});

/**
 * GET PRODUCT INTERNAL
 * Internal query for getting a product without auth check
 * Used by actions that have their own auth/validation logic
 */
export const getProductInternal = internalQuery({
  args: {
    productId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.productId);

    if (!product || product.type !== "product") {
      return null;
    }

    return product;
  },
});
