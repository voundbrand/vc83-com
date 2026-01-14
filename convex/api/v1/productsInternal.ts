/**
 * INTERNAL PRODUCTS FUNCTIONS
 *
 * Internal queries and mutations used by the MCP server and API endpoints.
 * These bypass session authentication since API keys are used instead.
 *
 * Follows the same patterns as eventsInternal.ts and crmInternal.ts.
 */

import { internalQuery, internalMutation } from "../../_generated/server";
import { v } from "convex/values";
import { Id } from "../../_generated/dataModel";

/**
 * GET PRODUCT INTERNAL
 * Returns product details without requiring session authentication
 */
export const getProductInternal = internalQuery({
  args: {
    productId: v.id("objects"),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    // Get product
    const product = await ctx.db.get(args.productId);

    if (!product || product.type !== "product") {
      return null;
    }

    // Verify organization ownership
    if (product.organizationId !== args.organizationId) {
      return null;
    }

    const customProps = product.customProperties as Record<string, unknown> | undefined;

    // Get linked form if exists
    const formLinks = await ctx.db
      .query("objectLinks")
      .withIndex("by_from_object", (q) => q.eq("fromObjectId", args.productId))
      .filter((q) => q.eq(q.field("linkType"), "registration_form"))
      .collect();

    const linkedFormId = formLinks.length > 0 ? formLinks[0].toObjectId : null;

    // Transform for API response
    return {
      id: product._id,
      name: product.name,
      description: product.description,
      subtype: product.subtype,
      status: product.status,
      pricing: {
        basePrice: (customProps?.basePrice as number) || 0,
        currency: (customProps?.currency as string) || "EUR",
        taxInclusive: (customProps?.taxInclusive as boolean) || false,
        taxRate: (customProps?.taxRate as number) || 0,
      },
      metadata: (customProps?.metadata as Record<string, unknown>) || {},
      invoiceConfig: (customProps?.invoiceConfig as Record<string, unknown>) || null,
      linkedFormId,
    };
  },
});

// ============================================================================
// PRODUCT MUTATION OPERATIONS (FOR MCP SERVER)
// ============================================================================

/**
 * CREATE PRODUCT INTERNAL
 *
 * Creates a new product without requiring session authentication.
 * Used by MCP server for AI-driven product creation.
 */
export const createProductInternal = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    subtype: v.string(), // "ticket" | "physical" | "digital"
    name: v.string(),
    description: v.optional(v.string()),
    price: v.number(), // Price in cents
    currency: v.optional(v.string()),
    inventory: v.optional(v.number()),
    eventId: v.optional(v.id("objects")), // Optional: Link product to event
    customProperties: v.optional(v.record(v.string(), v.any())),
    performedBy: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    // Validate subtype
    const validSubtypes = [
      // Standard product types
      "ticket", "physical", "digital",
      // Bookable resource types
      "room", "staff", "equipment", "space",
      // Bookable service types
      "appointment", "class", "treatment",
    ];
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
      currency: args.currency || "EUR",
      inventory: args.inventory ?? null,
      sold: 0,
      eventId: args.eventId,
      ...(args.customProperties || {}),
    };

    // Create product object
    const productId = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "product",
      subtype: args.subtype,
      name: args.name,
      description: args.description,
      status: "draft",
      customProperties,
      createdBy: args.performedBy,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Create event->product link if eventId provided
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
        createdBy: args.performedBy,
        createdAt: Date.now(),
      });
    }

    // Log creation action
    if (args.performedBy) {
      await ctx.db.insert("objectActions", {
        organizationId: args.organizationId,
        objectId: productId,
        actionType: "created",
        actionData: {
          source: "mcp",
          subtype: args.subtype,
        },
        performedBy: args.performedBy,
        performedAt: Date.now(),
      });
    }

    return { productId };
  },
});

/**
 * UPDATE PRODUCT INTERNAL
 *
 * Updates an existing product without requiring session authentication.
 * Used by MCP server for AI-driven product updates.
 */
export const updateProductInternal = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    productId: v.string(),
    updates: v.object({
      name: v.optional(v.string()),
      description: v.optional(v.string()),
      subtype: v.optional(v.string()),
      status: v.optional(v.string()), // "draft" | "active" | "sold_out" | "archived"
      price: v.optional(v.number()),
      currency: v.optional(v.string()),
      inventory: v.optional(v.number()),
      eventId: v.optional(v.union(v.id("objects"), v.null())),
      customProperties: v.optional(v.record(v.string(), v.any())),
    }),
    performedBy: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    // 1. Get product
    const product = await ctx.db.get(args.productId as Id<"objects">);

    if (!product) {
      throw new Error("Product not found");
    }

    // 2. Verify organization access
    if (product.organizationId !== args.organizationId) {
      throw new Error("Product not found");
    }

    // 3. Verify it's a product
    if (product.type !== "product") {
      throw new Error("Product not found");
    }

    // 4. Validate subtype if provided
    if (args.updates.subtype !== undefined) {
      const validSubtypes = ["ticket", "physical", "digital"];
      if (!validSubtypes.includes(args.updates.subtype)) {
        throw new Error(
          `Invalid product subtype. Must be one of: ${validSubtypes.join(", ")}`
        );
      }
    }

    // 5. Validate status if provided
    if (args.updates.status !== undefined) {
      const validStatuses = ["draft", "active", "sold_out", "archived"];
      if (!validStatuses.includes(args.updates.status)) {
        throw new Error(
          `Invalid status. Must be one of: ${validStatuses.join(", ")}`
        );
      }
    }

    // 6. Validate event if provided
    if (args.updates.eventId !== undefined && args.updates.eventId !== null) {
      const event = await ctx.db.get(args.updates.eventId);
      if (!event || event.type !== "event") {
        throw new Error("Invalid event ID");
      }
    }

    // 7. Build update object
    const dbUpdates: Record<string, unknown> = {
      updatedAt: Date.now(),
    };

    if (args.updates.name !== undefined) dbUpdates.name = args.updates.name;
    if (args.updates.description !== undefined) dbUpdates.description = args.updates.description;
    if (args.updates.subtype !== undefined) dbUpdates.subtype = args.updates.subtype;
    if (args.updates.status !== undefined) dbUpdates.status = args.updates.status;

    // 8. Update customProperties
    const currentProps = (product.customProperties || {}) as Record<string, unknown>;
    const updatedProps: Record<string, unknown> = { ...currentProps };

    if (args.updates.price !== undefined) updatedProps.price = args.updates.price;
    if (args.updates.currency !== undefined) updatedProps.currency = args.updates.currency;
    if (args.updates.inventory !== undefined) updatedProps.inventory = args.updates.inventory;
    if (args.updates.eventId !== undefined) updatedProps.eventId = args.updates.eventId;

    // Merge additional customProperties
    if (args.updates.customProperties) {
      Object.assign(updatedProps, args.updates.customProperties);
    }

    dbUpdates.customProperties = updatedProps;

    // 9. Apply updates
    await ctx.db.patch(product._id, dbUpdates);

    // 10. Handle event link updates
    if (args.updates.eventId !== undefined) {
      // Find existing event link (event->product "offers")
      const allEventLinks = await ctx.db
        .query("objectLinks")
        .withIndex("by_to_object", (q) => q.eq("toObjectId", product._id))
        .collect();

      const existingEventLink = allEventLinks.find(
        (link) => link.linkType === "offers"
      );

      if (args.updates.eventId === null) {
        // Remove event link if exists
        if (existingEventLink) {
          await ctx.db.delete(existingEventLink._id);
        }
      } else {
        // Update or create event link
        if (existingEventLink) {
          await ctx.db.patch(existingEventLink._id, {
            fromObjectId: args.updates.eventId,
          });
        } else {
          await ctx.db.insert("objectLinks", {
            organizationId: args.organizationId,
            fromObjectId: args.updates.eventId,
            toObjectId: product._id,
            linkType: "offers",
            properties: {
              displayOrder: 0,
              isFeatured: false,
            },
            createdBy: args.performedBy,
            createdAt: Date.now(),
          });
        }
      }
    }

    // 11. Log update action
    if (args.performedBy) {
      await ctx.db.insert("objectActions", {
        organizationId: args.organizationId,
        objectId: product._id,
        actionType: "updated_via_mcp",
        actionData: {
          source: "mcp",
          fieldsUpdated: Object.keys(args.updates).filter(
            (k) => args.updates[k as keyof typeof args.updates] !== undefined
          ),
        },
        performedBy: args.performedBy,
        performedAt: Date.now(),
      });
    }

    return { success: true, productId: product._id };
  },
});

/**
 * DELETE PRODUCT INTERNAL
 *
 * Permanently deletes a product and all associated links.
 * Used by MCP server for AI-driven product deletion.
 */
export const deleteProductInternal = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    productId: v.string(),
    performedBy: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    // 1. Get product
    const product = await ctx.db.get(args.productId as Id<"objects">);

    if (!product) {
      throw new Error("Product not found");
    }

    // 2. Verify organization access
    if (product.organizationId !== args.organizationId) {
      throw new Error("Product not found");
    }

    // 3. Verify it's a product
    if (product.type !== "product") {
      throw new Error("Product not found");
    }

    // 4. Log deletion action BEFORE deleting
    if (args.performedBy) {
      await ctx.db.insert("objectActions", {
        organizationId: args.organizationId,
        objectId: product._id,
        actionType: "deleted_via_mcp",
        actionData: {
          productName: product.name,
          productType: product.subtype,
          source: "mcp",
        },
        performedBy: args.performedBy,
        performedAt: Date.now(),
      });
    }

    // 5. Delete all links involving this product
    const linksFrom = await ctx.db
      .query("objectLinks")
      .withIndex("by_from_object", (q) => q.eq("fromObjectId", product._id))
      .collect();

    const linksTo = await ctx.db
      .query("objectLinks")
      .withIndex("by_to_object", (q) => q.eq("toObjectId", product._id))
      .collect();

    for (const link of [...linksFrom, ...linksTo]) {
      await ctx.db.delete(link._id);
    }

    // 6. Permanently delete the product
    await ctx.db.delete(product._id);

    return { success: true };
  },
});

/**
 * ARCHIVE PRODUCT INTERNAL
 *
 * Soft delete - sets product status to "archived".
 * Used by MCP server for AI-driven product archiving.
 */
export const archiveProductInternal = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    productId: v.string(),
    performedBy: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    // 1. Get product
    const product = await ctx.db.get(args.productId as Id<"objects">);

    if (!product) {
      throw new Error("Product not found");
    }

    // 2. Verify organization access
    if (product.organizationId !== args.organizationId) {
      throw new Error("Product not found");
    }

    // 3. Verify it's a product
    if (product.type !== "product") {
      throw new Error("Product not found");
    }

    // 4. Update status to archived
    await ctx.db.patch(product._id, {
      status: "archived",
      updatedAt: Date.now(),
    });

    // 5. Log archive action
    if (args.performedBy) {
      await ctx.db.insert("objectActions", {
        organizationId: args.organizationId,
        objectId: product._id,
        actionType: "archived_via_mcp",
        actionData: {
          productName: product.name,
          source: "mcp",
        },
        performedBy: args.performedBy,
        performedAt: Date.now(),
      });
    }

    return { success: true };
  },
});

/**
 * PUBLISH PRODUCT INTERNAL
 *
 * Sets product status to "active" (make it available for sale).
 * Used by MCP server for AI-driven product publishing.
 */
export const publishProductInternal = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    productId: v.string(),
    performedBy: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    // 1. Get product
    const product = await ctx.db.get(args.productId as Id<"objects">);

    if (!product) {
      throw new Error("Product not found");
    }

    // 2. Verify organization access
    if (product.organizationId !== args.organizationId) {
      throw new Error("Product not found");
    }

    // 3. Verify it's a product
    if (product.type !== "product") {
      throw new Error("Product not found");
    }

    // 4. Update status to active
    await ctx.db.patch(product._id, {
      status: "active",
      updatedAt: Date.now(),
    });

    // 5. Log publish action
    if (args.performedBy) {
      await ctx.db.insert("objectActions", {
        organizationId: args.organizationId,
        objectId: product._id,
        actionType: "published_via_mcp",
        actionData: {
          productName: product.name,
          source: "mcp",
        },
        performedBy: args.performedBy,
        performedAt: Date.now(),
      });
    }

    return { success: true };
  },
});

/**
 * LIST PRODUCTS INTERNAL
 *
 * Lists products with filtering and pagination.
 * Used by MCP server for AI-driven product listing.
 */
export const listProductsInternal = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    subtype: v.optional(v.string()),
    status: v.optional(v.string()),
    eventId: v.optional(v.id("objects")),
    limit: v.number(),
    offset: v.number(),
  },
  handler: async (ctx, args) => {
    // 1. Query all products for organization
    const query = ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "product")
      );

    const allProducts = await query.collect();

    // 2. Apply filters
    let filteredProducts = allProducts;

    if (args.subtype) {
      filteredProducts = filteredProducts.filter((p) => p.subtype === args.subtype);
    }

    if (args.status) {
      filteredProducts = filteredProducts.filter((p) => p.status === args.status);
    }

    if (args.eventId) {
      filteredProducts = filteredProducts.filter((p) => {
        const customProps = p.customProperties as Record<string, unknown> | undefined;
        return customProps?.eventId === args.eventId;
      });
    }

    // 3. Sort by creation date (newest first)
    filteredProducts.sort((a, b) => b.createdAt - a.createdAt);

    // 4. Apply pagination
    const total = filteredProducts.length;
    const paginatedProducts = filteredProducts.slice(args.offset, args.offset + args.limit);

    // 5. Format response
    const products = paginatedProducts.map((product) => {
      const customProps = product.customProperties as Record<string, unknown> | undefined;
      return {
        id: product._id,
        organizationId: product.organizationId,
        name: product.name,
        description: product.description,
        subtype: product.subtype,
        status: product.status,
        price: customProps?.price as number | undefined,
        currency: customProps?.currency as string | undefined,
        inventory: customProps?.inventory as number | undefined,
        sold: customProps?.sold as number | undefined,
        eventId: customProps?.eventId as string | undefined,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
      };
    });

    return {
      products,
      total,
      limit: args.limit,
      offset: args.offset,
    };
  },
});

/**
 * SET PRODUCT PRICE INTERNAL
 *
 * Updates only the price of a product.
 * Used by MCP server for AI-driven price updates.
 */
export const setProductPriceInternal = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    productId: v.string(),
    price: v.number(),
    currency: v.optional(v.string()),
    performedBy: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    // 1. Get product
    const product = await ctx.db.get(args.productId as Id<"objects">);

    if (!product) {
      throw new Error("Product not found");
    }

    // 2. Verify organization access
    if (product.organizationId !== args.organizationId) {
      throw new Error("Product not found");
    }

    // 3. Verify it's a product
    if (product.type !== "product") {
      throw new Error("Product not found");
    }

    // 4. Update price
    const currentProps = (product.customProperties || {}) as Record<string, unknown>;
    const oldPrice = currentProps.price;

    await ctx.db.patch(product._id, {
      customProperties: {
        ...currentProps,
        price: args.price,
        ...(args.currency && { currency: args.currency }),
      },
      updatedAt: Date.now(),
    });

    // 5. Log price change action
    if (args.performedBy) {
      await ctx.db.insert("objectActions", {
        organizationId: args.organizationId,
        objectId: product._id,
        actionType: "price_updated_via_mcp",
        actionData: {
          oldPrice,
          newPrice: args.price,
          currency: args.currency || currentProps.currency,
          source: "mcp",
        },
        performedBy: args.performedBy,
        performedAt: Date.now(),
      });
    }

    return { success: true, oldPrice, newPrice: args.price };
  },
});

/**
 * INCREMENT SOLD INTERNAL
 *
 * Track product sales (called after successful purchase).
 * Used by MCP server and checkout flow.
 */
export const incrementSoldInternal = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    productId: v.string(),
    quantity: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // 1. Get product
    const product = await ctx.db.get(args.productId as Id<"objects">);

    if (!product) {
      throw new Error("Product not found");
    }

    // 2. Verify organization access
    if (product.organizationId !== args.organizationId) {
      throw new Error("Product not found");
    }

    // 3. Verify it's a product
    if (product.type !== "product") {
      throw new Error("Product not found");
    }

    const currentProps = (product.customProperties || {}) as Record<string, unknown>;
    const currentSold = (currentProps.sold as number) || 0;
    const currentInventory = currentProps.inventory as number | null | undefined;
    const quantity = args.quantity || 1;

    // 4. Check inventory
    if (currentInventory !== null && currentInventory !== undefined) {
      if (currentInventory < quantity) {
        throw new Error("Insufficient inventory");
      }
    }

    // 5. Update sold count and inventory
    const newSold = currentSold + quantity;
    const newInventory =
      currentInventory !== null && currentInventory !== undefined
        ? currentInventory - quantity
        : null;

    await ctx.db.patch(product._id, {
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
