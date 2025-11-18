/**
 * BEHAVIOR: CALCULATE PRICING (Behavior 3)
 *
 * Calculates the final price for the registration based on product pricing,
 * discounts, and any special pricing rules.
 *
 * Priority: 90
 *
 * Calculates:
 * - Base price from product
 * - Any applicable discounts
 * - Tax calculations
 * - Final amount in cents
 *
 * Returns:
 * - basePrice: number (in cents)
 * - discount: number (in cents)
 * - finalPrice: number (in cents)
 * - taxAmount: number (in cents)
 * - currency: string
 */

import { action } from "../../_generated/server";
import { v } from "convex/values";
import { api } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";

export const executeCalculatePricing = action({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    config: v.any(),
    context: v.any(),
  },
  handler: async (ctx, args) => {
    console.log(`${args.config?.dryRun ? '🧪 [DRY RUN]' : '✓'} [Behavior 3/12] Calculate Pricing`);

    const context = args.context as {
      products?: Array<{
        productId: string;
        quantity: number;
      }>;
      discountCode?: string;
    };

    if (!context.products || context.products.length === 0) {
      return {
        success: false,
        error: "At least one product is required",
      };
    }

    // Process each product
    const productDetails: Array<{
      productId: string;
      productName: string;
      quantity: number;
      pricePerUnit: number;
      total: number;
    }> = [];

    let subtotal = 0;
    let currency = "EUR";

    for (const productItem of context.products) {
      // Skip addon products (they have IDs like "addon-123" instead of Convex IDs)
      if (productItem.productId.startsWith("addon-")) {
        // For addons, use data from transactionData.breakdown if available
        const addonFromBreakdown = (context as any).transactionData?.breakdown?.addons?.find(
          (a: any) => a.id === productItem.productId
        );

        if (addonFromBreakdown) {
          const total = addonFromBreakdown.total || addonFromBreakdown.pricePerUnit * productItem.quantity;

          productDetails.push({
            productId: productItem.productId,
            productName: addonFromBreakdown.name,
            quantity: productItem.quantity,
            pricePerUnit: addonFromBreakdown.pricePerUnit,
            total,
          });

          subtotal += total;
          continue;
        } else {
          // Skip this addon if not in breakdown
          console.warn(`⚠️ Addon ${productItem.productId} not found in transaction breakdown, skipping`);
          continue;
        }
      }

      // Get product pricing from database
      const product = await ctx.runQuery(api.ontologyHelpers.getObject, {
        objectId: productItem.productId as Id<"objects">,
      });

      if (!product) {
        return {
          success: false,
          error: `Product not found: ${productItem.productId}`,
        };
      }

      const customProps = product.customProperties as {
        price?: number;
        currency?: string;
        taxRate?: number;
      };

      const pricePerUnit = customProps.price || 0;
      const productCurrency = customProps.currency || "EUR";
      const total = pricePerUnit * productItem.quantity;

      // Store product details
      productDetails.push({
        productId: productItem.productId,
        productName: product.name,
        quantity: productItem.quantity,
        pricePerUnit,
        total,
      });

      // Add to subtotal
      subtotal += total;

      // Use currency from first product
      if (currency === "EUR") {
        currency = productCurrency;
      }
    }

    // Calculate discount if code provided (applied to total)
    let discountAmount = 0;
    let discountApplied = false;

    if (context.discountCode) {
      // Get discount from first product (could be enhanced to support global discounts)
      const firstProduct = await ctx.runQuery(api.ontologyHelpers.getObject, {
        objectId: context.products[0].productId as Id<"objects">,
      });

      const customProps = firstProduct?.customProperties as {
        discounts?: Array<{
          code: string;
          type: "percentage" | "fixed";
          value: number;
          validUntil?: number;
        }>;
      };

      if (customProps?.discounts) {
        const discount = customProps.discounts.find(
          (d) => d.code === context.discountCode &&
                 (!d.validUntil || d.validUntil > Date.now())
        );

        if (discount) {
          if (discount.type === "percentage") {
            discountAmount = Math.round((subtotal * discount.value) / 100);
          } else {
            discountAmount = discount.value;
          }
          discountApplied = true;
          console.log(`✅ Discount applied: ${discount.code} = ${discountAmount} cents`);
        }
      }
    }

    // Get tax rate from first product
    const firstProduct: { customProperties?: { taxRate?: number } } | null = await ctx.runQuery(api.ontologyHelpers.getObject, {
      objectId: context.products[0].productId as Id<"objects">,
    });
    const taxRate: number = (firstProduct?.customProperties as { taxRate?: number })?.taxRate || 19;

    // Calculate totals
    const priceAfterDiscount = subtotal - discountAmount;
    const taxAmount = Math.round((priceAfterDiscount * taxRate) / 100);
    const finalPrice = priceAfterDiscount + taxAmount;

    console.log(`${args.config?.dryRun ? '🧪 [DRY RUN]' : '✅'} Pricing calculated:`);
    console.log(`   Products: ${productDetails.length}`);
    productDetails.forEach((p) => {
      console.log(`     - ${p.productName}: ${p.pricePerUnit} × ${p.quantity} = ${p.total} cents`);
    });
    console.log(`   Subtotal: ${subtotal} cents`);
    console.log(`   Discount: -${discountAmount} cents`);
    console.log(`   After Discount: ${priceAfterDiscount} cents`);
    console.log(`   Tax (${taxRate}%): +${taxAmount} cents`);
    console.log(`   Final: ${finalPrice} cents (${(finalPrice / 100).toFixed(2)} ${currency})`);

    return {
      success: true,
      message: `Price calculated: ${(finalPrice / 100).toFixed(2)} ${currency} for ${productDetails.length} product(s)${args.config?.dryRun ? ' (dry run)' : ''}`,
      data: {
        products: productDetails,
        subtotal,
        discountAmount,
        discountApplied,
        priceAfterDiscount,
        taxRate,
        taxAmount,
        finalPrice,
        currency,
      },
    };
  },
});
