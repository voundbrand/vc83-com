/**
 * BEHAVIOR: UPDATE STATISTICS (Behavior 11)
 *
 * Updates event and product statistics after a successful registration.
 * Maintains registration counts and analytics data.
 *
 * Priority: 20
 *
 * Updates:
 * - Event registration statistics
 * - Product sales statistics
 * - Revenue tracking
 *
 * Returns:
 * - updatedStats: object with new statistics
 */

import { action, internalMutation } from "../../_generated/server";
import { v } from "convex/values";
import { internal, api } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";

/**
 * Internal mutation to update object statistics
 */
export const updateObjectStatsInternal = internalMutation({
  args: {
    objectId: v.id("objects"),
    newStats: v.any(),
    statsKey: v.string(), // e.g., "registrationStats" or "salesStats"
  },
  handler: async (ctx, args) => {
    const object = await ctx.db.get(args.objectId);
    if (!object) {
      throw new Error("Object not found");
    }

    const updatedProps = {
      ...object.customProperties,
      [args.statsKey]: args.newStats,
    };

    await ctx.db.patch(args.objectId, {
      customProperties: updatedProps,
      updatedAt: Date.now(),
    });
  },
});

export const executeUpdateStatistics = action({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    config: v.any(),
    context: v.any(),
  },
  handler: async (ctx, args) => {
    console.log("✓ [Behavior 11/12] Update Statistics");

    const context = args.context as {
      eventId?: string;
      products?: Array<{
        productId: string;
        quantity: number;
      }>;
      finalPrice?: number;
      billingMethod?: string;
    };

    if (!context.eventId || !context.products || context.products.length === 0) {
      return {
        success: false,
        error: "Event ID and at least one product are required",
      };
    }

    // Get current event
    const event = await ctx.runQuery(api.ontologyHelpers.getObject, {
      objectId: context.eventId as Id<"objects">,
    });

    if (!event) {
      return {
        success: false,
        error: "Event not found",
      };
    }

    const eventCustomProps = event.customProperties as {
      registrationStats?: {
        totalRegistrations?: number;
        confirmedRegistrations?: number;
        pendingRegistrations?: number;
        revenue?: number;
      };
    };

    // Calculate new event statistics
    const currentStats = eventCustomProps.registrationStats || {
      totalRegistrations: 0,
      confirmedRegistrations: 0,
      pendingRegistrations: 0,
      revenue: 0,
    };

    const newEventStats = {
      totalRegistrations: (currentStats.totalRegistrations || 0) + 1,
      confirmedRegistrations:
        context.billingMethod === "employer_invoice"
          ? (currentStats.confirmedRegistrations || 0) // Wait for invoice payment
          : (currentStats.confirmedRegistrations || 0) + 1, // Paid or free
      pendingRegistrations:
        context.billingMethod === "employer_invoice"
          ? (currentStats.pendingRegistrations || 0) + 1
          : currentStats.pendingRegistrations || 0,
      revenue: (currentStats.revenue || 0) + (context.finalPrice || 0),
    };

    // DRY-RUN MODE: Skip actual database write
    if (args.config?.dryRun) {
      console.log(`🧪 [DRY RUN] Would update event statistics:`, newEventStats);
    } else {
      // Update event statistics (PRODUCTION)
      await ctx.runMutation(internal.workflows.behaviors.updateStatistics.updateObjectStatsInternal, {
        objectId: context.eventId as Id<"objects">,
        newStats: newEventStats,
        statsKey: "registrationStats",
      });
    }

    // Update statistics for ALL products
    const productStatsUpdates: Array<{
      productId: string;
      productName?: string;
      newStats: {
        totalSales: number;
        revenue: number;
      };
    }> = [];

    for (const productItem of context.products) {
      // Skip addon products (they're not in the database)
      if (productItem.productId.startsWith("addon-")) {
        console.log(`⚠️ Skipping statistics update for addon: ${productItem.productId}`);
        continue;
      }

      const product = await ctx.runQuery(api.ontologyHelpers.getObject, {
        objectId: productItem.productId as Id<"objects">,
      });

      if (product) {
        const productCustomProps = product.customProperties as {
          salesStats?: {
            totalSales?: number;
            revenue?: number;
          };
          price?: number;
        };

        const currentProductStats = productCustomProps.salesStats || {
          totalSales: 0,
          revenue: 0,
        };

        // Calculate revenue for this product (price × quantity)
        const productPrice = productCustomProps.price || 0;
        const productRevenue = productPrice * productItem.quantity;

        const newProductStats = {
          totalSales: (currentProductStats.totalSales || 0) + productItem.quantity,
          revenue: (currentProductStats.revenue || 0) + productRevenue,
        };

        // Store for logging
        productStatsUpdates.push({
          productId: productItem.productId,
          productName: product.name,
          newStats: newProductStats,
        });

        // DRY-RUN MODE: Skip actual database write
        if (args.config?.dryRun) {
          console.log(`🧪 [DRY RUN] Would update ${product.name} statistics:`, newProductStats);
        } else {
          // Update product statistics (PRODUCTION)
          await ctx.runMutation(internal.workflows.behaviors.updateStatistics.updateObjectStatsInternal, {
            objectId: productItem.productId as Id<"objects">,
            newStats: newProductStats,
            statsKey: "salesStats",
          });
        }
      }
    }

    console.log(`${args.config?.dryRun ? '🧪 [DRY RUN]' : '✅'} Statistics updated:`);
    console.log(`   Event: ${newEventStats.totalRegistrations} total, ${newEventStats.confirmedRegistrations} confirmed`);
    productStatsUpdates.forEach((update) => {
      console.log(`   ${update.productName}: ${update.newStats.totalSales} sales, €${(update.newStats.revenue / 100).toFixed(2)} revenue`);
    });

    return {
      success: true,
      message: `Statistics updated for event and ${context.products.length} product(s)${args.config?.dryRun ? ' (dry run)' : ''}`,
      data: {
        eventStats: newEventStats,
        productStatsUpdates,
      },
    };
  },
});
