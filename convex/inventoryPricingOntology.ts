/**
 * INVENTORY PRICING ONTOLOGY
 *
 * Manages per-date and seasonal pricing for date-range inventory products
 * (e.g., hotel rooms, vacation rentals, equipment rentals by day).
 * Uses the universal ontology system (objects table).
 *
 * Pricing Types (subtype):
 * - "date_rate" - Per-date rate/inventory override
 * - "seasonal_rate" - Date-range rate with label (e.g., "Peak Season")
 *
 * Link Types:
 * - "has_pricing" - product -> inventory_pricing
 *
 * Priority (highest to lowest):
 * 1. date_rate (specific date override)
 * 2. seasonal_rate (date range)
 * 3. product.customProperties.baseNightlyRateCents (default)
 */

import { query, mutation, internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { requireAuthenticatedUser } from "./rbacHelpers";

// ============================================================================
// QUERIES
// ============================================================================

/**
 * GET RESOURCE PRICING
 * Returns all pricing records for a resource (date rates + seasonal rates)
 */
export const getResourcePricing = query({
  args: {
    sessionId: v.string(),
    resourceId: v.id("objects"),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    // Get all pricing links for this resource
    const links = await ctx.db
      .query("objectLinks")
      .withIndex("by_from_link_type", (q: any) =>
        q.eq("fromObjectId", args.resourceId).eq("linkType", "has_pricing")
      )
      .collect();

    const dateRates: Array<{
      _id: Id<"objects">;
      date: number;
      rateCents: number;
      availableCount?: number;
      minimumStayNights?: number;
    }> = [];

    const seasonalRates: Array<{
      _id: Id<"objects">;
      startDate: number;
      endDate: number;
      rateCents: number;
      label: string;
    }> = [];

    for (const link of links) {
      const pricing = await ctx.db.get(link.toObjectId);
      if (!pricing || pricing.type !== "inventory_pricing") continue;

      const props = pricing.customProperties as Record<string, unknown>;

      if (pricing.subtype === "date_rate") {
        const date = props.date as number;
        // Filter by date range if provided
        if (args.startDate && date < args.startDate) continue;
        if (args.endDate && date > args.endDate) continue;

        dateRates.push({
          _id: pricing._id,
          date,
          rateCents: (props.rateCents as number) || 0,
          availableCount: props.availableCount as number | undefined,
          minimumStayNights: props.minimumStayNights as number | undefined,
        });
      } else if (pricing.subtype === "seasonal_rate") {
        const startDate = props.startDate as number;
        const endDate = props.endDate as number;
        // Filter by date range overlap if provided
        if (args.startDate && endDate < args.startDate) continue;
        if (args.endDate && startDate > args.endDate) continue;

        seasonalRates.push({
          _id: pricing._id,
          startDate,
          endDate,
          rateCents: (props.rateCents as number) || 0,
          label: (props.label as string) || "",
        });
      }
    }

    // Sort date rates by date
    dateRates.sort((a, b) => a.date - b.date);
    // Sort seasonal rates by start date
    seasonalRates.sort((a, b) => a.startDate - b.startDate);

    return { dateRates, seasonalRates };
  },
});

/**
 * GET RATE FOR DATE
 * Returns the effective rate for a specific date, applying priority rules:
 * 1. date_rate override
 * 2. seasonal_rate
 * 3. base rate from product
 */
export const getRateForDate = internalQuery({
  args: {
    resourceId: v.id("objects"),
    date: v.number(),
  },
  handler: async (ctx, args) => {
    // Get the resource for base rate
    const resource = await ctx.db.get(args.resourceId);
    if (!resource) return null;

    const resourceProps = resource.customProperties as Record<string, unknown>;
    const baseRate = (resourceProps.baseNightlyRateCents as number) || 0;

    // Get all pricing links
    const links = await ctx.db
      .query("objectLinks")
      .withIndex("by_from_link_type", (q: any) =>
        q.eq("fromObjectId", args.resourceId).eq("linkType", "has_pricing")
      )
      .collect();

    let dateRate: number | null = null;
    let seasonalRate: number | null = null;
    let availableCountOverride: number | null = null;
    let minimumStayOverride: number | null = null;

    for (const link of links) {
      const pricing = await ctx.db.get(link.toObjectId);
      if (!pricing || pricing.type !== "inventory_pricing") continue;

      const props = pricing.customProperties as Record<string, unknown>;

      if (pricing.subtype === "date_rate") {
        const pricingDate = props.date as number;
        if (isSameDay(pricingDate, args.date)) {
          dateRate = (props.rateCents as number) || 0;
          if (props.availableCount !== undefined) {
            availableCountOverride = props.availableCount as number;
          }
          if (props.minimumStayNights !== undefined) {
            minimumStayOverride = props.minimumStayNights as number;
          }
          break; // date_rate is highest priority
        }
      } else if (pricing.subtype === "seasonal_rate") {
        const start = props.startDate as number;
        const end = props.endDate as number;
        if (args.date >= start && args.date <= end) {
          seasonalRate = (props.rateCents as number) || 0;
        }
      }
    }

    return {
      rateCents: dateRate ?? seasonalRate ?? baseRate,
      source: dateRate !== null ? "date_rate" : seasonalRate !== null ? "seasonal_rate" : "base",
      availableCountOverride,
      minimumStayOverride,
    };
  },
});

/**
 * GET RATES FOR DATE RANGE
 * Returns rates for each date in a range (used by availability calculation)
 */
export const getRatesForDateRange = internalQuery({
  args: {
    resourceId: v.id("objects"),
    startDate: v.number(),
    endDate: v.number(),
  },
  handler: async (ctx, args) => {
    const resource = await ctx.db.get(args.resourceId);
    if (!resource) return [];

    const resourceProps = resource.customProperties as Record<string, unknown>;
    const baseRate = (resourceProps.baseNightlyRateCents as number) || 0;
    const baseInventory = (resourceProps.inventoryCount as number) || 1;

    // Get all pricing links
    const links = await ctx.db
      .query("objectLinks")
      .withIndex("by_from_link_type", (q: any) =>
        q.eq("fromObjectId", args.resourceId).eq("linkType", "has_pricing")
      )
      .collect();

    // Fetch all pricing objects
    const dateRateMap = new Map<string, { rateCents: number; availableCount?: number; minimumStayNights?: number }>();
    const seasonalRates: Array<{ startDate: number; endDate: number; rateCents: number }> = [];

    for (const link of links) {
      const pricing = await ctx.db.get(link.toObjectId);
      if (!pricing || pricing.type !== "inventory_pricing") continue;

      const props = pricing.customProperties as Record<string, unknown>;

      if (pricing.subtype === "date_rate") {
        const dateKey = formatDateKey(props.date as number);
        dateRateMap.set(dateKey, {
          rateCents: (props.rateCents as number) || 0,
          availableCount: props.availableCount as number | undefined,
          minimumStayNights: props.minimumStayNights as number | undefined,
        });
      } else if (pricing.subtype === "seasonal_rate") {
        seasonalRates.push({
          startDate: props.startDate as number,
          endDate: props.endDate as number,
          rateCents: (props.rateCents as number) || 0,
        });
      }
    }

    // Generate rates for each date in range
    const DAY_MS = 24 * 60 * 60 * 1000;
    const rates: Array<{
      date: number;
      dateKey: string;
      rateCents: number;
      source: string;
      inventoryCount: number;
      minimumStayNights?: number;
    }> = [];

    for (let dayTs = startOfDay(args.startDate); dayTs <= args.endDate; dayTs += DAY_MS) {
      const dateKey = formatDateKey(dayTs);

      // Check date_rate first
      const dateOverride = dateRateMap.get(dateKey);
      if (dateOverride) {
        rates.push({
          date: dayTs,
          dateKey,
          rateCents: dateOverride.rateCents,
          source: "date_rate",
          inventoryCount: dateOverride.availableCount ?? baseInventory,
          minimumStayNights: dateOverride.minimumStayNights,
        });
        continue;
      }

      // Check seasonal_rate
      const seasonal = seasonalRates.find(
        (sr) => dayTs >= sr.startDate && dayTs <= sr.endDate
      );
      if (seasonal) {
        rates.push({
          date: dayTs,
          dateKey,
          rateCents: seasonal.rateCents,
          source: "seasonal_rate",
          inventoryCount: baseInventory,
        });
        continue;
      }

      // Default base rate
      rates.push({
        date: dayTs,
        dateKey,
        rateCents: baseRate,
        source: "base",
        inventoryCount: baseInventory,
      });
    }

    return rates;
  },
});

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * SET DATE RATE
 * Set or update rate for a specific date
 */
export const setDateRate = mutation({
  args: {
    sessionId: v.string(),
    resourceId: v.id("objects"),
    date: v.number(),
    rateCents: v.number(),
    availableCount: v.optional(v.number()),
    minimumStayNights: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const resource = await ctx.db.get(args.resourceId);
    if (!resource || resource.type !== "product") {
      throw new Error("Resource not found");
    }

    // Check for existing date rate on this date
    const links = await ctx.db
      .query("objectLinks")
      .withIndex("by_from_link_type", (q: any) =>
        q.eq("fromObjectId", args.resourceId).eq("linkType", "has_pricing")
      )
      .collect();

    for (const link of links) {
      const existing = await ctx.db.get(link.toObjectId);
      if (!existing || existing.type !== "inventory_pricing" || existing.subtype !== "date_rate") continue;

      const props = existing.customProperties as Record<string, unknown>;
      if (isSameDay(props.date as number, args.date)) {
        // Update existing
        await ctx.db.patch(existing._id, {
          customProperties: {
            ...props,
            rateCents: args.rateCents,
            ...(args.availableCount !== undefined && { availableCount: args.availableCount }),
            ...(args.minimumStayNights !== undefined && { minimumStayNights: args.minimumStayNights }),
          },
          updatedAt: Date.now(),
        });
        return { dateRateId: existing._id };
      }
    }

    // Create new date rate
    const dateRateId = await ctx.db.insert("objects", {
      organizationId: resource.organizationId,
      type: "inventory_pricing",
      subtype: "date_rate",
      name: `Rate: ${formatDateKey(args.date)}`,
      status: "active",
      customProperties: {
        resourceId: args.resourceId,
        date: args.date,
        rateCents: args.rateCents,
        ...(args.availableCount !== undefined && { availableCount: args.availableCount }),
        ...(args.minimumStayNights !== undefined && { minimumStayNights: args.minimumStayNights }),
      },
      createdBy: userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Link to resource
    await ctx.db.insert("objectLinks", {
      organizationId: resource.organizationId,
      fromObjectId: args.resourceId,
      toObjectId: dateRateId,
      linkType: "has_pricing",
      createdBy: userId,
      createdAt: Date.now(),
    });

    return { dateRateId };
  },
});

/**
 * SET DATE RATES BULK
 * Set rates for multiple dates at once
 */
export const setDateRatesBulk = mutation({
  args: {
    sessionId: v.string(),
    resourceId: v.id("objects"),
    rates: v.array(
      v.object({
        date: v.number(),
        rateCents: v.number(),
        availableCount: v.optional(v.number()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const resource = await ctx.db.get(args.resourceId);
    if (!resource || resource.type !== "product") {
      throw new Error("Resource not found");
    }

    const createdIds: Id<"objects">[] = [];

    for (const rate of args.rates) {
      // Check for existing
      const links = await ctx.db
        .query("objectLinks")
        .withIndex("by_from_link_type", (q: any) =>
          q.eq("fromObjectId", args.resourceId).eq("linkType", "has_pricing")
        )
        .collect();

      let updated = false;
      for (const link of links) {
        const existing = await ctx.db.get(link.toObjectId);
        if (!existing || existing.type !== "inventory_pricing" || existing.subtype !== "date_rate") continue;

        const props = existing.customProperties as Record<string, unknown>;
        if (isSameDay(props.date as number, rate.date)) {
          await ctx.db.patch(existing._id, {
            customProperties: {
              ...props,
              rateCents: rate.rateCents,
              ...(rate.availableCount !== undefined && { availableCount: rate.availableCount }),
            },
            updatedAt: Date.now(),
          });
          createdIds.push(existing._id);
          updated = true;
          break;
        }
      }

      if (!updated) {
        const id = await ctx.db.insert("objects", {
          organizationId: resource.organizationId,
          type: "inventory_pricing",
          subtype: "date_rate",
          name: `Rate: ${formatDateKey(rate.date)}`,
          status: "active",
          customProperties: {
            resourceId: args.resourceId,
            date: rate.date,
            rateCents: rate.rateCents,
            ...(rate.availableCount !== undefined && { availableCount: rate.availableCount }),
          },
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        await ctx.db.insert("objectLinks", {
          organizationId: resource.organizationId,
          fromObjectId: args.resourceId,
          toObjectId: id,
          linkType: "has_pricing",
          createdBy: userId,
          createdAt: Date.now(),
        });

        createdIds.push(id);
      }
    }

    return { dateRateIds: createdIds };
  },
});

/**
 * DELETE DATE RATE
 * Remove a date-specific rate override
 */
export const deleteDateRate = mutation({
  args: {
    sessionId: v.string(),
    dateRateId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const dateRate = await ctx.db.get(args.dateRateId);
    if (!dateRate || dateRate.type !== "inventory_pricing" || dateRate.subtype !== "date_rate") {
      throw new Error("Date rate not found");
    }

    // Delete links
    const links = await ctx.db
      .query("objectLinks")
      .withIndex("by_to_link_type", (q: any) =>
        q.eq("toObjectId", args.dateRateId).eq("linkType", "has_pricing")
      )
      .collect();

    for (const link of links) {
      await ctx.db.delete(link._id);
    }

    await ctx.db.delete(args.dateRateId);
    return { success: true };
  },
});

/**
 * CREATE SEASONAL RATE
 * Create a date-range seasonal rate
 */
export const createSeasonalRate = mutation({
  args: {
    sessionId: v.string(),
    resourceId: v.id("objects"),
    label: v.string(),
    startDate: v.number(),
    endDate: v.number(),
    rateCents: v.number(),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const resource = await ctx.db.get(args.resourceId);
    if (!resource || resource.type !== "product") {
      throw new Error("Resource not found");
    }

    if (args.endDate <= args.startDate) {
      throw new Error("End date must be after start date");
    }

    const seasonalRateId = await ctx.db.insert("objects", {
      organizationId: resource.organizationId,
      type: "inventory_pricing",
      subtype: "seasonal_rate",
      name: `Season: ${args.label}`,
      status: "active",
      customProperties: {
        resourceId: args.resourceId,
        label: args.label,
        startDate: args.startDate,
        endDate: args.endDate,
        rateCents: args.rateCents,
      },
      createdBy: userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    await ctx.db.insert("objectLinks", {
      organizationId: resource.organizationId,
      fromObjectId: args.resourceId,
      toObjectId: seasonalRateId,
      linkType: "has_pricing",
      createdBy: userId,
      createdAt: Date.now(),
    });

    return { seasonalRateId };
  },
});

/**
 * UPDATE SEASONAL RATE
 */
export const updateSeasonalRate = mutation({
  args: {
    sessionId: v.string(),
    seasonalRateId: v.id("objects"),
    label: v.optional(v.string()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    rateCents: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const rate = await ctx.db.get(args.seasonalRateId);
    if (!rate || rate.type !== "inventory_pricing" || rate.subtype !== "seasonal_rate") {
      throw new Error("Seasonal rate not found");
    }

    const props = rate.customProperties as Record<string, unknown>;
    const updatedProps = { ...props };

    if (args.label !== undefined) updatedProps.label = args.label;
    if (args.startDate !== undefined) updatedProps.startDate = args.startDate;
    if (args.endDate !== undefined) updatedProps.endDate = args.endDate;
    if (args.rateCents !== undefined) updatedProps.rateCents = args.rateCents;

    // Validate dates
    const startDate = (updatedProps.startDate as number) || 0;
    const endDate = (updatedProps.endDate as number) || 0;
    if (endDate <= startDate) {
      throw new Error("End date must be after start date");
    }

    await ctx.db.patch(args.seasonalRateId, {
      name: `Season: ${updatedProps.label}`,
      customProperties: updatedProps,
      updatedAt: Date.now(),
    });

    return { seasonalRateId: args.seasonalRateId };
  },
});

/**
 * DELETE SEASONAL RATE
 */
export const deleteSeasonalRate = mutation({
  args: {
    sessionId: v.string(),
    seasonalRateId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const rate = await ctx.db.get(args.seasonalRateId);
    if (!rate || rate.type !== "inventory_pricing" || rate.subtype !== "seasonal_rate") {
      throw new Error("Seasonal rate not found");
    }

    const links = await ctx.db
      .query("objectLinks")
      .withIndex("by_to_link_type", (q: any) =>
        q.eq("toObjectId", args.seasonalRateId).eq("linkType", "has_pricing")
      )
      .collect();

    for (const link of links) {
      await ctx.db.delete(link._id);
    }

    await ctx.db.delete(args.seasonalRateId);
    return { success: true };
  },
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function isSameDay(ts1: number, ts2: number): boolean {
  const d1 = new Date(ts1);
  const d2 = new Date(ts2);
  return (
    d1.getUTCFullYear() === d2.getUTCFullYear() &&
    d1.getUTCMonth() === d2.getUTCMonth() &&
    d1.getUTCDate() === d2.getUTCDate()
  );
}

function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setUTCHours(0, 0, 0, 0);
  return d.getTime();
}

function formatDateKey(ts: number): string {
  const d = new Date(ts);
  return d.toISOString().split("T")[0];
}
