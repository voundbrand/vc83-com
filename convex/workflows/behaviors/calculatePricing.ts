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
      taxRate: number; // Add taxRate to product details
      taxAmount: number; // Add taxAmount to product details
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
          const taxRate = addonFromBreakdown.taxRate || 19;
          const taxAmount = Math.round((total * taxRate) / 100);

          productDetails.push({
            productId: productItem.productId,
            productName: addonFromBreakdown.name,
            quantity: productItem.quantity,
            pricePerUnit: addonFromBreakdown.pricePerUnit,
            total,
            taxRate,
            taxAmount,
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
      const taxRate = customProps.taxRate !== undefined ? customProps.taxRate : 19; // Get tax rate per product
      const total = pricePerUnit * productItem.quantity;
      const taxAmount = Math.round((total * taxRate) / 100); // Calculate tax per product

      // Store product details with individual tax info
      productDetails.push({
        productId: productItem.productId,
        productName: product.name,
        quantity: productItem.quantity,
        pricePerUnit,
        total,
        taxRate,
        taxAmount,
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

    // Group products and taxes by tax rate
    const taxGroups = new Map<number, {
      rate: number;
      subtotal: number;
      taxAmount: number;
      products: typeof productDetails;
    }>();

    // Apply discount proportionally across all products
    const discountRatio = discountAmount / subtotal;

    for (const product of productDetails) {
      // Apply proportional discount to this product
      const productDiscount = Math.round(product.total * discountRatio);
      const productPriceAfterDiscount = product.total - productDiscount;

      // Recalculate tax on discounted price
      const productTaxAfterDiscount = Math.round((productPriceAfterDiscount * product.taxRate) / 100);

      // Group by tax rate
      const existing = taxGroups.get(product.taxRate);
      if (existing) {
        existing.subtotal += productPriceAfterDiscount;
        existing.taxAmount += productTaxAfterDiscount;
        existing.products.push(product);
      } else {
        taxGroups.set(product.taxRate, {
          rate: product.taxRate,
          subtotal: productPriceAfterDiscount,
          taxAmount: productTaxAfterDiscount,
          products: [product],
        });
      }
    }

    // Calculate totals from tax groups
    const priceAfterDiscount = subtotal - discountAmount;
    const taxGroupsArray = Array.from(taxGroups.values()).sort((a, b) => a.rate - b.rate);
    const totalTaxAmount = taxGroupsArray.reduce((sum, group) => sum + group.taxAmount, 0);
    const finalPrice = priceAfterDiscount + totalTaxAmount;

    console.log(`${args.config?.dryRun ? '🧪 [DRY RUN]' : '✅'} Pricing calculated:`);
    console.log(`   Products: ${productDetails.length}`);
    productDetails.forEach((p) => {
      console.log(`     - ${p.productName}: ${p.pricePerUnit} × ${p.quantity} = ${p.total} cents (Tax: ${p.taxRate}%)`);
    });
    console.log(`   Subtotal: ${subtotal} cents`);
    console.log(`   Discount: -${discountAmount} cents`);
    console.log(`   After Discount: ${priceAfterDiscount} cents`);
    console.log(`   Tax breakdown by rate:`);
    taxGroupsArray.forEach((group) => {
      console.log(`     - ${group.rate}%: ${group.taxAmount} cents on ${group.subtotal} cents`);
    });
    console.log(`   Total Tax: ${totalTaxAmount} cents`);
    console.log(`   Final: ${finalPrice} cents (${(finalPrice / 100).toFixed(2)} ${currency})`);

    return {
      success: true,
      message: `Price calculated: ${(finalPrice / 100).toFixed(2)} ${currency} for ${productDetails.length} product(s)${args.config?.dryRun ? ' (dry run)' : ''}`,
      data: {
        // Legacy format (for backwards compatibility)
        products: productDetails,
        subtotal,
        discountAmount,
        discountApplied,
        priceAfterDiscount,
        taxRate: taxGroupsArray.length > 0 ? taxGroupsArray[0].rate : 19, // Use first tax rate for legacy compat
        taxAmount: totalTaxAmount,
        finalPrice,
        currency,

        // NEW: Tax groups (for multi-tax-rate support)
        taxGroups: taxGroupsArray.map(group => ({
          rate: group.rate,
          subtotal: group.subtotal,
          taxAmount: group.taxAmount,
        })),
        hasMultipleTaxRates: taxGroupsArray.length > 1,

        // Transaction data format (for createTransaction behavior)
        transactionData: {
          price: finalPrice,
          currency,
          breakdown: {
            products: productDetails,
            subtotal,
            discountAmount,
            priceAfterDiscount,
            taxAmount: totalTaxAmount,
            taxGroups: taxGroupsArray.map(group => ({
              rate: group.rate,
              subtotal: group.subtotal,
              taxAmount: group.taxAmount,
            })),
            total: finalPrice,
          },
        },
      },
    };
  },
});
