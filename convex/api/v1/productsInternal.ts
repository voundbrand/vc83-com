/**
 * INTERNAL PRODUCTS QUERIES
 *
 * Internal queries used by the products API endpoints.
 */

import { internalQuery } from "../../_generated/server";
import { v } from "convex/values";

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
