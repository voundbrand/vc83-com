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
      productId?: string;
      finalPrice?: number;
      billingMethod?: string;
    };

    if (!context.eventId || !context.productId) {
      return {
        success: false,
        error: "Event ID and Product ID are required",
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

    // Update event statistics
    await ctx.runMutation(internal.workflows.behaviors.updateStatistics.updateObjectStatsInternal, {
      objectId: context.eventId as Id<"objects">,
      newStats: newEventStats,
      statsKey: "registrationStats",
    });

    // Get current product
    const product = await ctx.runQuery(api.ontologyHelpers.getObject, {
      objectId: context.productId as Id<"objects">,
    });

    if (product) {
      const productCustomProps = product.customProperties as {
        salesStats?: {
          totalSales?: number;
          revenue?: number;
        };
      };

      const currentProductStats = productCustomProps.salesStats || {
        totalSales: 0,
        revenue: 0,
      };

      const newProductStats = {
        totalSales: (currentProductStats.totalSales || 0) + 1,
        revenue: (currentProductStats.revenue || 0) + (context.finalPrice || 0),
      };

      // Update product statistics
      await ctx.runMutation(internal.workflows.behaviors.updateStatistics.updateObjectStatsInternal, {
        objectId: context.productId as Id<"objects">,
        newStats: newProductStats,
        statsKey: "salesStats",
      });

      console.log(`✅ Statistics updated:`);
      console.log(`   Event: ${newEventStats.totalRegistrations} total, ${newEventStats.confirmedRegistrations} confirmed`);
      console.log(`   Product: ${newProductStats.totalSales} sales, €${(newProductStats.revenue / 100).toFixed(2)} revenue`);

      return {
        success: true,
        message: "Statistics updated successfully",
        data: {
          eventStats: newEventStats,
          productStats: newProductStats,
        },
      };
    }

    console.log(`✅ Event statistics updated: ${newEventStats.totalRegistrations} total registrations`);

    return {
      success: true,
      message: "Event statistics updated successfully",
      data: {
        eventStats: newEventStats,
      },
    };
  },
});
