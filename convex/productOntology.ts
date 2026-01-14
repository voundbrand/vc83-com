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
 * BOOKABLE RESOURCE TYPES (subtype):
 * - "room" - Hotel rooms, meeting rooms, studios
 * - "staff" - Therapists, consultants, instructors
 * - "equipment" - Vehicles, projectors, tools
 * - "space" - Desks, parking spots, lockers
 *
 * BOOKABLE SERVICE TYPES (subtype):
 * - "appointment" - 1:1 meetings, consultations
 * - "class" - Group sessions with max participants
 * - "treatment" - Spa, medical (may require multiple resources)
 *
 * Bookable Resource customProperties:
 * - bookingMode: "calendar" | "date-range" | "both"
 * - minDuration: number (minutes or days)
 * - maxDuration: number
 * - durationUnit: "minutes" | "hours" | "days" | "nights"
 * - slotIncrement: number (15, 30, 60 minutes)
 * - bufferBefore: number (minutes before booking)
 * - bufferAfter: number (minutes after booking)
 * - capacity: number (1 for staff, 10 for room)
 * - confirmationRequired: boolean (false = auto-confirm)
 * - pricePerUnit: number (cents)
 * - priceUnit: "hour" | "day" | "night" | "session" | "flat"
 * - depositRequired: boolean
 * - depositAmountCents: number
 * - depositPercent: number (alternative: 20% of total)
 * - locationId: Id<"objects"> (link to location object)
 * - amenities: string[] (["wifi", "ac", "projector"])
 * - maxOccupancy: number (for rooms)
 * - specialties: string[] (for staff: ["massage", "facial"])
 *
 * Status Workflow:
 * - "draft" - Being created
 * - "active" - Available for sale
 * - "sold_out" - No more inventory
 * - "archived" - No longer offered
 *
 * Tax Behavior (customProperties.taxBehavior):
 * Product-level override for tax calculation. Overrides organization default.
 * - "inclusive" - Price INCLUDES VAT (gross pricing) - VAT extracted from price
 * - "exclusive" - Price EXCLUDES VAT (net pricing) - VAT added on top
 * - "automatic" - Let system decide (currently defaults to exclusive)
 * - undefined/null - Use organization default (from organization_legal.defaultTaxBehavior)
 *
 * Example: Product with €119 price and 19% VAT rate:
 * - taxBehavior: "inclusive" → €119 total (€100 net + €19 VAT)
 * - taxBehavior: "exclusive" → €119 net + €22.61 VAT = €141.61 total
 *
 * B2B Invoicing Configuration (customProperties.invoiceConfig):
 * Used when checkout has invoice payment provider enabled.
 * - employerSourceField: string - Form field ID containing employer/organization info
 * - employerMapping: Record<string, string | null> - Maps form values to CRM organization names
 * - defaultPaymentTerms: "net30" | "net60" | "net90" - Default invoice payment terms
 *
 * Example invoiceConfig:
 * {
 *   employerSourceField: "attendee_category",
 *   employerMapping: {
 *     "ameos": "AMEOS Klinikum Ueckermünde",
 *     "haffnet": "HaffNet e.V.",
 *     "external": null // No invoice for external attendees
 *   },
 *   defaultPaymentTerms: "net30"
 * }
 *
 * Template Set Override (customProperties.templateSetId):
 * Products can override the default template set (ticket + invoice + email).
 * This is useful for VIP tickets that need premium branding.
 * - templateSetId: Id<"objects"> - Reference to template_set object
 *
 * Example:
 * {
 *   customProperties: {
 *     templateSetId: "templateSetId123", // VIP-specific templates
 *     ...
 *   }
 * }
 */

import { query, mutation } from "./_generated/server";
import { internalQuery } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { Id } from "./_generated/dataModel";
import { requireAuthenticatedUser } from "./rbacHelpers";
import { checkResourceLimit, checkFeatureAccess, getLicenseInternal } from "./licensing/helpers";

/**
 * PRODUCT AVAILABILITY VALIDATION
 * 
 * Shared validation function to check if a product is available for purchase.
 * This is the single source of truth for product availability logic.
 * 
 * Checks:
 * - Product status must be "active"
 * - startSaleDateTime (if set) must be <= current date
 * - endSaleDateTime (if set) must be >= current date
 * - earlyBirdEndDate (if ticketTier === "earlybird") must be >= current date
 * - Inventory limits (if applicable)
 */
export function isProductAvailableForPurchase(
  product: {
    status: string;
    customProperties?: Record<string, unknown>;
  },
  currentDate: number = Date.now()
): { available: boolean; reason?: string } {
  // 1. Check product status
  if (product.status !== "active") {
    return {
      available: false,
      reason: `Product status is "${product.status}". Only active products can be purchased.`,
    };
  }

  const customProps = product.customProperties || {};

  // 2. Check sale start date
  const startSaleDateTime = customProps.startSaleDateTime;
  if (startSaleDateTime && typeof startSaleDateTime === "number") {
    if (currentDate < startSaleDateTime) {
      return {
        available: false,
        reason: `Sales for this product have not started yet. Sales begin on ${new Date(startSaleDateTime).toLocaleString()}.`,
      };
    }
  }

  // 3. Check sale end date
  const endSaleDateTime = customProps.endSaleDateTime;
  if (endSaleDateTime && typeof endSaleDateTime === "number") {
    if (currentDate > endSaleDateTime) {
      return {
        available: false,
        reason: `Sales for this product have ended. Sales ended on ${new Date(endSaleDateTime).toLocaleString()}.`,
      };
    }
  }

  // 4. Check early bird end date (for early bird tickets)
  const ticketTier = customProps.ticketTier as string | undefined;
  if (ticketTier === "earlybird" || ticketTier === "early-bird") {
    const earlyBirdEndDate = customProps.earlyBirdEndDate;
    if (earlyBirdEndDate) {
      // Handle both string and number formats
      let endDate: number;
      if (typeof earlyBirdEndDate === "string") {
        endDate = new Date(earlyBirdEndDate).getTime();
      } else if (typeof earlyBirdEndDate === "number") {
        endDate = earlyBirdEndDate;
      } else {
        // Invalid format, skip check
        endDate = Infinity;
      }

      if (!isNaN(endDate) && currentDate > endDate) {
        return {
          available: false,
          reason: `Early bird pricing has ended. The early bird period ended on ${new Date(endDate).toLocaleString()}.`,
        };
      }
    }
  }

  // 5. Check inventory (if inventory tracking is enabled)
  const inventory = customProps.inventory;
  if (inventory !== undefined && inventory !== null && typeof inventory === "number") {
    if (inventory <= 0) {
      return {
        available: false,
        reason: "This product is sold out.",
      };
    }
  }

  // All checks passed
  return { available: true };
}

// Helper function for tier upgrade path (duplicated from helpers.ts for local use)
function getNextTier(
  currentTier: "free" | "starter" | "professional" | "agency" | "enterprise"
): string {
  const tierUpgradePath: Record<string, string> = {
    free: "Starter (€199/month)",
    starter: "Professional (€399/month)",
    professional: "Agency (€599/month)",
    agency: "Enterprise (€1,500+/month)",
    enterprise: "Enterprise (contact sales)",
  };
  return tierUpgradePath[currentTier] || "a higher tier";
}

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

    // For each product, fetch linked form AND event data
    const productsWithForms = await Promise.all(
      products.map(async (product) => {
        // Find all objectLinks FROM this product (product->form)
        const linksFromProduct = await ctx.db
          .query("objectLinks")
          .withIndex("by_from_object", (q) => q.eq("fromObjectId", product._id))
          .collect();

        // Find all objectLinks TO this product (event->product)
        const linksToProduct = await ctx.db
          .query("objectLinks")
          .withIndex("by_to_object", (q) => q.eq("toObjectId", product._id))
          .collect();

        // Extract form link (product->form "requiresForm")
        const formLink = linksFromProduct.find((link) => link.linkType === "requiresForm");
        let formData = {};
        if (formLink) {
          const form = await ctx.db.get(formLink.toObjectId);
          if (form && form.type === "form") {
            formData = {
              formId: form._id,
              formTiming: formLink.properties?.timing || "duringCheckout",
              formRequired: formLink.properties?.required ?? true,
            };
          }
        }

        // 🎯 Extract event link (event->product "offers")
        const eventLink = linksToProduct.find((link) => link.linkType === "offers");
        let eventData = {};
        if (eventLink) {
          const event = await ctx.db.get(eventLink.fromObjectId);
          if (event && event.type === "event") {
            eventData = {
              eventId: event._id,
              eventName: event.name,
            };
          }
        }

        // Add both form AND event data to customProperties
        return {
          ...product,
          customProperties: {
            ...product.customProperties,
            ...formData,
            ...eventData, // ✅ Add event info
          },
        };
      })
    );

    return productsWithForms;
  },
});

/**
 * GET PRODUCT
 * Get a single product by ID with linked form and event data
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

    // Find all links for this product
    const allLinks = await ctx.db
      .query("objectLinks")
      .collect();

    // Find form link (product->form "requiresForm")
    const formLink = allLinks.find(
      (link) =>
        link.fromObjectId === args.productId && link.linkType === "requiresForm"
    );

    // Find event link (event->product "offers")
    const eventLink = allLinks.find(
      (link) =>
        link.toObjectId === args.productId && link.linkType === "offers"
    );

    // Build customProperties with form and event data
    let enrichedCustomProperties = { ...product.customProperties };

    // Add form data if exists
    if (formLink) {
      const form = await ctx.db.get(formLink.toObjectId);
      if (form && form.type === "form") {
        enrichedCustomProperties = {
          ...enrichedCustomProperties,
          formId: form._id,
          formTiming: formLink.properties?.timing || "duringCheckout",
          formRequired: formLink.properties?.required ?? true,
        };
      }
    }

    // Add event data if exists
    if (eventLink) {
      const event = await ctx.db.get(eventLink.fromObjectId);
      if (event && event.type === "event") {
        enrichedCustomProperties = {
          ...enrichedCustomProperties,
          eventId: event._id, // Store eventId for the form
          eventName: event.name,
        };
      }
    }

    return {
      ...product,
      customProperties: enrichedCustomProperties,
    };
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

    // CHECK LICENSE LIMIT: Enforce product limit for organization's tier
    // Free: 5, Starter: 50, Pro: 200, Agency: Unlimited, Enterprise: Unlimited
    await checkResourceLimit(ctx, args.organizationId, "product", "maxProducts");

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
    currency: v.optional(v.string()), // Currency code (e.g., "USD", "EUR")
    inventory: v.optional(v.number()),
    status: v.optional(v.string()), // "draft" | "active" | "sold_out" | "archived"
    eventId: v.optional(v.union(v.id("objects"), v.null())), // Optional: Update event link (null to remove)
    customProperties: v.optional(v.record(v.string(), v.any())),
    // B2B Invoicing configuration (optional) - used when checkout has invoice payment enabled
    invoiceConfig: v.optional(v.object({
      employerSourceField: v.string(), // Form field ID
      employerMapping: v.record(v.string(), v.union(v.string(), v.null())), // form value -> org name
      defaultPaymentTerms: v.optional(v.union(v.literal("net30"), v.literal("net60"), v.literal("net90"))),
    })),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const product = await ctx.db.get(args.productId);

    if (!product || product.type !== "product") {
      throw new Error("Product not found");
    }

    // Validate event if provided
    if (args.eventId !== undefined && args.eventId !== null) {
      const event = await ctx.db.get(args.eventId);
      if (!event || event.type !== "event") {
        throw new Error("Invalid event ID");
      }
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
    if (args.price !== undefined || args.currency !== undefined || args.inventory !== undefined || args.eventId !== undefined || args.customProperties || args.invoiceConfig !== undefined) {
      const currentProps = product.customProperties || {};

      // ⚠️ CRITICAL FIX: When args.customProperties is provided, it should COMPLETELY
      // replace the nested properties, not merge them. This is especially important
      // for arrays like 'addons' where deletions need to persist.
      // CHECK FEATURE ACCESS: Inventory tracking requires Starter tier or higher
      if (args.inventory !== undefined && args.inventory !== null) {
        await checkFeatureAccess(ctx, product.organizationId, "inventoryTrackingEnabled");
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updatedCustomProperties: Record<string, any> = {
        ...currentProps,
        ...(args.price !== undefined && { price: args.price }),
        ...(args.currency !== undefined && { currency: args.currency }),
        ...(args.inventory !== undefined && { inventory: args.inventory }),
        ...(args.eventId !== undefined && { eventId: args.eventId }),
      };

      // If customProperties provided, merge them but REPLACE arrays completely
      if (args.customProperties) {
        for (const [key, value] of Object.entries(args.customProperties)) {
          // Always replace the value directly (don't merge arrays)
          updatedCustomProperties[key] = value;
        }

        // CHECK LICENSE LIMIT: Enforce addon limit per product
        if (args.customProperties.addons && Array.isArray(args.customProperties.addons)) {
          const addonsCount = args.customProperties.addons.length;
          const license = await getLicenseInternal(ctx, product.organizationId);
          const limit = license.limits.maxAddonsPerProduct;

          if (limit !== -1 && addonsCount > limit) {
            throw new ConvexError({
              code: "LIMIT_EXCEEDED",
              message: `You've reached your maxAddonsPerProduct limit (${limit}). ` +
                `Upgrade to ${getNextTier(license.planTier)} for more capacity.`,
              limitKey: "maxAddonsPerProduct",
              currentCount: addonsCount,
              limit,
              planTier: license.planTier,
              nextTier: getNextTier(license.planTier),
              isNested: true,
              parentId: args.productId,
            });
          }
        }
      }

      // Handle invoiceConfig updates
      if (args.invoiceConfig !== undefined) {
        // CHECK FEATURE ACCESS: B2B invoicing requires Starter tier or higher
        await checkFeatureAccess(ctx, product.organizationId, "b2bInvoicingEnabled");
        updatedCustomProperties.invoiceConfig = args.invoiceConfig;
      }

      updates.customProperties = updatedCustomProperties;
    }

    await ctx.db.patch(args.productId, updates);

    // Handle event link updates
    if (args.eventId !== undefined) {
      // Find existing event link (event->product "offers")
      const allEventLinks = await ctx.db
        .query("objectLinks")
        .withIndex("by_to_object", (q) => q.eq("toObjectId", args.productId))
        .collect();

      const existingEventLink = allEventLinks.find(
        (link) => link.linkType === "offers"
      );

      if (args.eventId === null) {
        // Remove event link if exists
        if (existingEventLink) {
          await ctx.db.delete(existingEventLink._id);
        }
      } else {
        // Update or create event link
        if (existingEventLink) {
          // Update existing link to point to new event
          await ctx.db.patch(existingEventLink._id, {
            fromObjectId: args.eventId,
          });
        } else {
          // Create new event link
          await ctx.db.insert("objectLinks", {
            organizationId: product.organizationId,
            fromObjectId: args.eventId,
            toObjectId: args.productId,
            linkType: "offers",
            properties: {
              displayOrder: 0,
              isFeatured: false,
            },
            createdAt: Date.now(),
          });
        }
      }
    }

    return args.productId;
  },
});

/**
 * ARCHIVE PRODUCT
 * Soft delete a product (set status to archived)
 * Products can be restored from archive or permanently deleted
 */
export const archiveProduct = mutation({
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

    const previousStatus = product.status;

    await ctx.db.patch(args.productId, {
      status: "archived",
      customProperties: {
        ...product.customProperties,
        archivedAt: Date.now(),
        previousStatus, // Store previous status for restore
      },
      updatedAt: Date.now(),
    });

    // Log the action
    await ctx.db.insert("objectActions", {
      organizationId: product.organizationId,
      objectId: args.productId,
      actionType: "archived",
      performedBy: userId,
      performedAt: Date.now(),
      actionData: { previousStatus },
    });

    return { success: true };
  },
});

/**
 * RESTORE PRODUCT
 * Restore a product from archive to its previous status (or draft)
 */
export const restoreProduct = mutation({
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

    if (product.status !== "archived") {
      throw new Error("Product is not archived");
    }

    // Restore to previous status or default to draft
    const previousStatus = (product.customProperties?.previousStatus as string) || "draft";

    await ctx.db.patch(args.productId, {
      status: previousStatus,
      customProperties: {
        ...product.customProperties,
        archivedAt: undefined,
        previousStatus: undefined,
        restoredAt: Date.now(),
      },
      updatedAt: Date.now(),
    });

    // Log the action
    await ctx.db.insert("objectActions", {
      organizationId: product.organizationId,
      objectId: args.productId,
      actionType: "restored",
      performedBy: userId,
      performedAt: Date.now(),
      actionData: { restoredTo: previousStatus },
    });

    return { success: true, restoredTo: previousStatus };
  },
});

/**
 * DELETE PRODUCT (Permanent)
 * Permanently delete a product - only allowed for archived products
 * This removes the product and all associated links from the database
 */
export const deleteProduct = mutation({
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

    // Only allow permanent delete of archived products
    if (product.status !== "archived") {
      throw new Error("Only archived products can be permanently deleted. Archive the product first.");
    }

    // Delete associated objectLinks (product -> form, event -> product)
    const linksFromProduct = await ctx.db
      .query("objectLinks")
      .withIndex("by_from_object", (q) => q.eq("fromObjectId", args.productId))
      .collect();

    const linksToProduct = await ctx.db
      .query("objectLinks")
      .withIndex("by_to_object", (q) => q.eq("toObjectId", args.productId))
      .collect();

    for (const link of [...linksFromProduct, ...linksToProduct]) {
      await ctx.db.delete(link._id);
    }

    // Log before deletion (so we have a record)
    await ctx.db.insert("objectActions", {
      organizationId: product.organizationId,
      objectId: args.productId,
      actionType: "permanently_deleted",
      performedBy: userId,
      performedAt: Date.now(),
      actionData: {
        productName: product.name,
        productSubtype: product.subtype,
      },
    });

    // Permanently delete the product
    await ctx.db.delete(args.productId);

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
 * DUPLICATE PRODUCT
 * Create a copy of an existing product with "Copy X" naming
 */
export const duplicateProduct = mutation({
  args: {
    sessionId: v.string(),
    productId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // Get the original product
    const originalProduct = await ctx.db.get(args.productId);
    if (!originalProduct || originalProduct.type !== "product") {
      throw new Error("Product not found");
    }

    // Find all products with similar names to determine copy number
    const allProducts = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", originalProduct.organizationId).eq("type", "product")
      )
      .collect();

    // Find highest copy number for this product name
    const baseName = originalProduct.name.replace(/ Copy \d+$/, ""); // Remove existing "Copy X" suffix
    const copyPattern = new RegExp(`^${baseName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} Copy (\\d+)$`);

    let highestCopyNumber = 0;
    for (const product of allProducts) {
      const match = product.name.match(copyPattern);
      if (match) {
        const copyNumber = parseInt(match[1], 10);
        if (copyNumber > highestCopyNumber) {
          highestCopyNumber = copyNumber;
        }
      }
    }

    // Generate new name
    const newName = `${baseName} Copy ${highestCopyNumber + 1}`;

    // Create the duplicated product
    const newProductId = await ctx.db.insert("objects", {
      organizationId: originalProduct.organizationId,
      type: "product",
      subtype: originalProduct.subtype,
      name: newName,
      description: originalProduct.description,
      status: "draft", // Always create copies as draft
      customProperties: {
        ...originalProduct.customProperties,
        sold: 0, // Reset sold count for the copy
      },
      createdBy: userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Copy objectLinks (form associations, event links, etc.)
    const originalLinks = await ctx.db
      .query("objectLinks")
      .withIndex("by_from_object", (q) => q.eq("fromObjectId", args.productId))
      .collect();

    for (const link of originalLinks) {
      await ctx.db.insert("objectLinks", {
        organizationId: link.organizationId,
        fromObjectId: newProductId,
        toObjectId: link.toObjectId,
        linkType: link.linkType,
        properties: link.properties,
        createdAt: Date.now(),
      });
    }

    return newProductId;
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

        // Enrich product with event data if product is linked to an event
        if (product.customProperties?.eventId) {
          const eventId = product.customProperties.eventId;

          // Only process if eventId is a valid Id type
          if (typeof eventId === 'string' && eventId.startsWith('j')) {
            const eventRecord = await ctx.db.get(eventId as unknown as Parameters<typeof ctx.db.get>[0]);

            // Type guard to check if this is an event object
            if (eventRecord && 'type' in eventRecord && eventRecord.type === "event") {
              // Type assertion: we've verified this is from the objects table
              const event = eventRecord as typeof eventRecord & {
                _id: Id<"objects">;
                type: "event";
                customProperties?: Record<string, unknown>;
              };

              // Fetch ALL sponsors from objectLinks (sponsored_by relationship)
              const eventSponsors: Array<{ name: string; level?: string }> = [];

              try {
                const sponsorLinks = await ctx.db
                  .query("objectLinks")
                  .withIndex("by_from_link_type", (q) =>
                    q.eq("fromObjectId", event._id)
                     .eq("linkType", "sponsored_by")
                  )
                  .collect();

                // Fetch all sponsor organizations
                for (const link of sponsorLinks) {
                  const sponsorOrg = await ctx.db.get(link.toObjectId);
                  if (sponsorOrg && 'name' in sponsorOrg) {
                    eventSponsors.push({
                      name: sponsorOrg.name as string,
                      level: link.properties?.sponsorLevel as string | undefined,
                    });
                  }
                }
              } catch (e) {
                // If sponsor fetch fails, continue without sponsors
                console.warn("Failed to fetch event sponsors:", e);
              }

              // Add event information to product customProperties
              return {
                ...product,
                customProperties: {
                  ...product.customProperties,
                  eventName: 'name' in event ? event.name as string : undefined,
                  eventSponsors: eventSponsors.length > 0 ? eventSponsors : undefined,
                  eventDate: event.customProperties?.startDate as number | undefined,
                  location: event.customProperties?.location as string | undefined,
                },
              };
            }
          }
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

/**
 * CHECK PRODUCT AVAILABILITY (INTERNAL)
 * Internal query wrapper for product availability validation
 * Used by other queries/actions to check if a product can be purchased
 */
export const checkProductAvailability = internalQuery({
  args: {
    productId: v.id("objects"),
    currentDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.productId);

    if (!product || product.type !== "product") {
      return {
        available: false,
        reason: "Product not found",
      };
    }

    return isProductAvailableForPurchase(
      product,
      args.currentDate ?? Date.now()
    );
  },
});
