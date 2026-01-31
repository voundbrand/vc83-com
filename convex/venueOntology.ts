/**
 * VENUE ONTOLOGY (Simplified)
 *
 * Manages event seat tracking for event-bound seating products.
 * Uses the universal ontology system (objects table).
 *
 * Simplified model:
 * - A product has totalSeats (configured in bookableConfig)
 * - Events linked to the product get an "event_seat_map" that tracks bookedCount
 * - No sections, rows, or individual seat tracking — just a count
 *
 * Object Types:
 * - "event_seat_map" — per-event seat counter (bookedCount, heldCount)
 *
 * Link Types:
 * - "has_seat_map" — event -> event_seat_map
 */

import { query, mutation, internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { requireAuthenticatedUser } from "./rbacHelpers";

// ============================================================================
// QUERIES
// ============================================================================

/**
 * GET EVENT SEAT STATUS
 * Returns seat availability for a specific event
 */
export const getEventSeatStatus = query({
  args: {
    sessionId: v.string(),
    eventId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const seatMap = await findSeatMap(ctx, args.eventId);
    if (!seatMap) return null;

    const props = seatMap.customProperties as Record<string, unknown>;
    const totalSeats = (props.totalSeats as number) || 0;
    const bookedCount = (props.bookedCount as number) || 0;
    const heldCount = countActiveHolds(props);

    return {
      _id: seatMap._id,
      eventId: props.eventId,
      totalSeats,
      bookedCount,
      heldCount,
      availableCount: Math.max(0, totalSeats - bookedCount - heldCount),
    };
  },
});

/**
 * GET EVENT SEAT AVAILABILITY (INTERNAL)
 * Used by availability dispatcher
 */
export const getEventSeatAvailabilityInternal = internalQuery({
  args: {
    eventId: v.id("objects"),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const seatMap = await findSeatMap(ctx, args.eventId);
    if (!seatMap) return null;

    const props = seatMap.customProperties as Record<string, unknown>;
    const totalSeats = (props.totalSeats as number) || 0;
    const bookedCount = (props.bookedCount as number) || 0;
    const heldCount = countActiveHolds(props);

    return {
      seatMapId: seatMap._id,
      totalSeats,
      bookedCount,
      heldCount,
      availableCount: Math.max(0, totalSeats - bookedCount - heldCount),
    };
  },
});

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * CREATE EVENT SEAT MAP
 * Initialize seat tracking for an event. Takes totalSeats from the product config.
 */
export const createEventSeatMap = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    eventId: v.id("objects"),
    totalSeats: v.number(),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const event = await ctx.db.get(args.eventId);
    if (!event || event.type !== "event") {
      throw new Error("Event not found");
    }

    // Check if seat map already exists
    const existing = await findSeatMap(ctx, args.eventId);
    if (existing) {
      throw new Error("Event already has a seat map");
    }

    const seatMapId = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "event_seat_map",
      subtype: "seat_map",
      name: `Seats: ${event.name}`,
      status: "active",
      customProperties: {
        eventId: args.eventId,
        totalSeats: args.totalSeats,
        bookedCount: 0,
        holds: {}, // { sessionId: { count, expiresAt } }
      },
      createdBy: userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    await ctx.db.insert("objectLinks", {
      organizationId: args.organizationId,
      fromObjectId: args.eventId,
      toObjectId: seatMapId,
      linkType: "has_seat_map",
      createdBy: userId,
      createdAt: Date.now(),
    });

    return { seatMapId };
  },
});

/**
 * HOLD SEATS
 * Temporarily hold N seats during checkout
 */
export const holdSeats = mutation({
  args: {
    sessionId: v.string(),
    seatMapId: v.id("objects"),
    seatCount: v.number(),
    holdDurationMinutes: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const seatMap = await ctx.db.get(args.seatMapId);
    if (!seatMap || seatMap.type !== "event_seat_map") {
      throw new Error("Seat map not found");
    }

    const props = seatMap.customProperties as Record<string, unknown>;
    const totalSeats = (props.totalSeats as number) || 0;
    const bookedCount = (props.bookedCount as number) || 0;
    const heldCount = countActiveHolds(props);
    const available = totalSeats - bookedCount - heldCount;

    if (args.seatCount > available) {
      throw new Error(`Only ${available} seats available, requested ${args.seatCount}`);
    }

    const holdDuration = (args.holdDurationMinutes || 15) * 60 * 1000;
    const expiresAt = Date.now() + holdDuration;

    const holds = { ...((props.holds as Record<string, { count: number; expiresAt: number }>) || {}) };
    holds[args.sessionId] = { count: args.seatCount, expiresAt };

    await ctx.db.patch(args.seatMapId, {
      customProperties: { ...props, holds },
      updatedAt: Date.now(),
    });

    return { heldCount: args.seatCount, expiresAt };
  },
});

/**
 * RELEASE SEATS
 * Release held seats (when user leaves checkout)
 */
export const releaseSeats = mutation({
  args: {
    sessionId: v.string(),
    seatMapId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const seatMap = await ctx.db.get(args.seatMapId);
    if (!seatMap || seatMap.type !== "event_seat_map") {
      throw new Error("Seat map not found");
    }

    const props = seatMap.customProperties as Record<string, unknown>;
    const holds = { ...((props.holds as Record<string, { count: number; expiresAt: number }>) || {}) };
    delete holds[args.sessionId];

    await ctx.db.patch(args.seatMapId, {
      customProperties: { ...props, holds },
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * BOOK SEATS (INTERNAL)
 * Atomically claim N seats for a booking. Used by booking creation.
 */
export const bookSeatsInternal = internalMutation({
  args: {
    seatMapId: v.id("objects"),
    seatCount: v.number(),
    bookingId: v.id("objects"),
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const seatMap = await ctx.db.get(args.seatMapId);
    if (!seatMap || seatMap.type !== "event_seat_map") {
      throw new Error("Seat map not found");
    }

    const props = seatMap.customProperties as Record<string, unknown>;
    const totalSeats = (props.totalSeats as number) || 0;
    const bookedCount = (props.bookedCount as number) || 0;

    if (bookedCount + args.seatCount > totalSeats) {
      throw new Error(`Not enough seats. Available: ${totalSeats - bookedCount}, Requested: ${args.seatCount}`);
    }

    // Remove hold for this session if it exists
    const holds = { ...((props.holds as Record<string, { count: number; expiresAt: number }>) || {}) };
    if (args.sessionId && holds[args.sessionId]) {
      delete holds[args.sessionId];
    }

    await ctx.db.patch(args.seatMapId, {
      customProperties: {
        ...props,
        bookedCount: bookedCount + args.seatCount,
        holds,
      },
      updatedAt: Date.now(),
    });

    return { success: true, newBookedCount: bookedCount + args.seatCount };
  },
});

/**
 * UNBOOK SEATS (INTERNAL)
 * Release booked seats when a booking is cancelled.
 */
export const unbookSeatsInternal = internalMutation({
  args: {
    seatMapId: v.id("objects"),
    seatCount: v.number(),
  },
  handler: async (ctx, args) => {
    const seatMap = await ctx.db.get(args.seatMapId);
    if (!seatMap || seatMap.type !== "event_seat_map") {
      throw new Error("Seat map not found");
    }

    const props = seatMap.customProperties as Record<string, unknown>;
    const bookedCount = (props.bookedCount as number) || 0;

    await ctx.db.patch(args.seatMapId, {
      customProperties: {
        ...props,
        bookedCount: Math.max(0, bookedCount - args.seatCount),
      },
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * CLEANUP EXPIRED HOLDS
 * Scheduled function to clean up expired seat holds
 */
export const cleanupExpiredHolds = internalMutation({
  args: {
    organizationId: v.optional(v.id("organizations")),
  },
  handler: async (ctx, args) => {
    let seatMaps;
    if (args.organizationId) {
      seatMaps = await ctx.db
        .query("objects")
        .withIndex("by_org_type", (q: any) =>
          q.eq("organizationId", args.organizationId).eq("type", "event_seat_map")
        )
        .collect();
    } else {
      seatMaps = await ctx.db
        .query("objects")
        .filter((q) => q.eq(q.field("type"), "event_seat_map"))
        .collect();
    }

    const now = Date.now();
    let totalCleaned = 0;

    for (const seatMap of seatMaps) {
      const props = seatMap.customProperties as Record<string, unknown>;
      const holds = (props.holds as Record<string, { count: number; expiresAt: number }>) || {};

      const activeHolds: Record<string, { count: number; expiresAt: number }> = {};
      let cleaned = 0;

      for (const [sessionId, hold] of Object.entries(holds)) {
        if (hold.expiresAt > now) {
          activeHolds[sessionId] = hold;
        } else {
          cleaned += hold.count;
        }
      }

      if (cleaned > 0) {
        await ctx.db.patch(seatMap._id, {
          customProperties: { ...props, holds: activeHolds },
          updatedAt: Date.now(),
        });
        totalCleaned += cleaned;
      }
    }

    return { totalCleaned };
  },
});

// ============================================================================
// HELPERS
// ============================================================================

async function findSeatMap(ctx: any, eventId: Id<"objects">) {
  const links = await ctx.db
    .query("objectLinks")
    .withIndex("by_from_link_type", (q: any) =>
      q.eq("fromObjectId", eventId).eq("linkType", "has_seat_map")
    )
    .collect();

  if (links.length === 0) return null;

  const seatMap = await ctx.db.get(links[0].toObjectId);
  if (!seatMap || seatMap.type !== "event_seat_map") return null;
  return seatMap;
}

function countActiveHolds(props: Record<string, unknown>): number {
  const holds = (props.holds as Record<string, { count: number; expiresAt: number }>) || {};
  const now = Date.now();
  let count = 0;
  for (const hold of Object.values(holds)) {
    if (hold.expiresAt > now) {
      count += hold.count;
    }
  }
  return count;
}
