/**
 * INTERNAL PRODUCTS QUERIES
 *
 * Internal queries used by the products API endpoints.
 */

import { internalQuery } from "../../_generated/server";
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

    const customProps = product.customProperties as any;

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
        basePrice: customProps.basePrice || 0,
        currency: customProps.currency || "EUR",
        taxInclusive: customProps.taxInclusive || false,
        taxRate: customProps.taxRate || 0,
      },
      metadata: customProps.metadata || {},
      invoiceConfig: customProps.invoiceConfig || null,
      linkedFormId,
    };
  },
});
