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
    console.log("✓ [Behavior 3/12] Calculate Pricing");

    const context = args.context as {
      productId?: string;
      quantity?: number;
      discountCode?: string;
    };

    if (!context.productId) {
      return {
        success: false,
        error: "Product ID is required",
      };
    }

    // Get product pricing
    const product = await ctx.runQuery(api.ontologyHelpers.getObject, {
      objectId: context.productId as Id<"objects">,
    });

    if (!product) {
      return {
        success: false,
        error: "Product not found",
      };
    }

    const customProps = product.customProperties as {
      price?: number;
      currency?: string;
      taxRate?: number;
      discounts?: Array<{
        code: string;
        type: "percentage" | "fixed";
        value: number;
        validUntil?: number;
      }>;
    };

    const basePrice = customProps.price || 0;
    const currency = customProps.currency || "EUR";
    const taxRate = customProps.taxRate || 19; // German VAT default
    const quantity = context.quantity || 1;

    // Calculate discount if code provided
    let discountAmount = 0;
    let discountApplied = false;

    if (context.discountCode && customProps.discounts) {
      const discount = customProps.discounts.find(
        (d) => d.code === context.discountCode &&
               (!d.validUntil || d.validUntil > Date.now())
      );

      if (discount) {
        if (discount.type === "percentage") {
          discountAmount = Math.round((basePrice * quantity * discount.value) / 100);
        } else {
          discountAmount = discount.value * quantity;
        }
        discountApplied = true;
        console.log(`✅ Discount applied: ${discount.code} = ${discountAmount} cents`);
      }
    }

    // Calculate totals
    const subtotal = basePrice * quantity;
    const priceAfterDiscount = subtotal - discountAmount;
    const taxAmount = Math.round((priceAfterDiscount * taxRate) / 100);
    const finalPrice = priceAfterDiscount + taxAmount;

    console.log(`✅ Pricing calculated:`);
    console.log(`   Base: ${basePrice} cents × ${quantity} = ${subtotal} cents`);
    console.log(`   Discount: -${discountAmount} cents`);
    console.log(`   Subtotal: ${priceAfterDiscount} cents`);
    console.log(`   Tax (${taxRate}%): +${taxAmount} cents`);
    console.log(`   Final: ${finalPrice} cents (${(finalPrice / 100).toFixed(2)} ${currency})`);

    return {
      success: true,
      message: `Price calculated: ${(finalPrice / 100).toFixed(2)} ${currency}`,
      data: {
        basePrice,
        quantity,
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
