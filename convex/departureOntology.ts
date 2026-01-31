/**
 * DEPARTURE ONTOLOGY (Simplified)
 *
 * Manages routes and departures for departure-bound products
 * (ferries, buses, trains, aircraft).
 * Uses the universal ontology system (objects table).
 *
 * Simplified model:
 * - A product (vehicle) has totalPassengerSeats (configured in bookableConfig)
 * - Routes define origin/destination
 * - Departures are scheduled instances on a route with a simple seat counter
 * - No fare classes — just totalSeats and bookedCount per departure
 *
 * Object Types:
 * - "route" (subtypes: one_way, round_trip, multi_leg)
 * - "departure" (subtypes: scheduled, charter)
 *
 * Link Types:
 * - "has_route" — product -> route
 * - "has_departure" — route -> departure
 */

import { query, mutation, internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { requireAuthenticatedUser } from "./rbacHelpers";

// ============================================================================
// ROUTE QUERIES
// ============================================================================

/**
 * GET ROUTE
 */
export const getRoute = query({
  args: {
    sessionId: v.string(),
    routeId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const route = await ctx.db.get(args.routeId);
    if (!route || route.type !== "route") {
      throw new Error("Route not found");
    }

    const props = route.customProperties as Record<string, unknown>;
    return {
      _id: route._id,
      name: route.name,
      subtype: route.subtype,
      status: route.status,
      originName: (props.originName as string) || "",
      destinationName: (props.destinationName as string) || "",
      estimatedDurationMinutes: (props.estimatedDurationMinutes as number) || 0,
    };
  },
});

/**
 * GET ROUTES
 */
export const getRoutes = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const routes = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q: any) =>
        q.eq("organizationId", args.organizationId).eq("type", "route")
      )
      .collect();

    return routes
      .filter((r) => r.status !== "archived")
      .map((route) => {
        const props = route.customProperties as Record<string, unknown>;
        return {
          _id: route._id,
          name: route.name,
          subtype: route.subtype,
          originName: (props.originName as string) || "",
          destinationName: (props.destinationName as string) || "",
          estimatedDurationMinutes: (props.estimatedDurationMinutes as number) || 0,
          status: route.status,
        };
      });
  },
});

// ============================================================================
// ROUTE MUTATIONS
// ============================================================================

/**
 * CREATE ROUTE
 */
export const createRoute = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    name: v.string(),
    subtype: v.union(
      v.literal("one_way"),
      v.literal("round_trip"),
      v.literal("multi_leg")
    ),
    originName: v.string(),
    destinationName: v.string(),
    estimatedDurationMinutes: v.number(),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const routeId = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "route",
      subtype: args.subtype,
      name: args.name,
      status: "active",
      customProperties: {
        originName: args.originName,
        destinationName: args.destinationName,
        estimatedDurationMinutes: args.estimatedDurationMinutes,
      },
      createdBy: userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return { routeId };
  },
});

/**
 * UPDATE ROUTE
 */
export const updateRoute = mutation({
  args: {
    sessionId: v.string(),
    routeId: v.id("objects"),
    name: v.optional(v.string()),
    originName: v.optional(v.string()),
    destinationName: v.optional(v.string()),
    estimatedDurationMinutes: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const route = await ctx.db.get(args.routeId);
    if (!route || route.type !== "route") {
      throw new Error("Route not found");
    }

    const props = route.customProperties as Record<string, unknown>;
    const updatedProps = { ...props };

    if (args.originName !== undefined) updatedProps.originName = args.originName;
    if (args.destinationName !== undefined) updatedProps.destinationName = args.destinationName;
    if (args.estimatedDurationMinutes !== undefined) updatedProps.estimatedDurationMinutes = args.estimatedDurationMinutes;

    await ctx.db.patch(args.routeId, {
      ...(args.name !== undefined && { name: args.name }),
      customProperties: updatedProps,
      updatedAt: Date.now(),
    });

    return { routeId: args.routeId };
  },
});

/**
 * DELETE ROUTE
 */
export const deleteRoute = mutation({
  args: {
    sessionId: v.string(),
    routeId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const route = await ctx.db.get(args.routeId);
    if (!route || route.type !== "route") {
      throw new Error("Route not found");
    }

    // Check if any products reference this route
    const productLinks = await ctx.db
      .query("objectLinks")
      .withIndex("by_to_link_type", (q: any) =>
        q.eq("toObjectId", args.routeId).eq("linkType", "has_route")
      )
      .collect();

    if (productLinks.length > 0) {
      throw new Error("Cannot delete route: it is referenced by products");
    }

    // Delete departures linked to this route
    const departureLinks = await ctx.db
      .query("objectLinks")
      .withIndex("by_from_link_type", (q: any) =>
        q.eq("fromObjectId", args.routeId).eq("linkType", "has_departure")
      )
      .collect();

    for (const link of departureLinks) {
      const departure = await ctx.db.get(link.toObjectId);
      if (departure) await ctx.db.delete(departure._id);
      await ctx.db.delete(link._id);
    }

    await ctx.db.delete(args.routeId);
    return { success: true };
  },
});

// ============================================================================
// DEPARTURE QUERIES
// ============================================================================

/**
 * GET DEPARTURE
 */
export const getDeparture = query({
  args: {
    sessionId: v.string(),
    departureId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const departure = await ctx.db.get(args.departureId);
    if (!departure || departure.type !== "departure") {
      throw new Error("Departure not found");
    }

    const props = departure.customProperties as Record<string, unknown>;
    const totalSeats = (props.totalSeats as number) || 0;
    const bookedCount = (props.bookedCount as number) || 0;

    // Get route info
    let routeInfo = null;
    const routeId = props.routeId as string;
    if (routeId) {
      const route = await ctx.db.get(routeId as Id<"objects">);
      if (route && route.type === "route") {
        const rp = route.customProperties as Record<string, unknown>;
        routeInfo = {
          _id: route._id,
          name: route.name,
          originName: rp.originName,
          destinationName: rp.destinationName,
        };
      }
    }

    return {
      _id: departure._id,
      name: departure.name,
      subtype: departure.subtype,
      status: departure.status,
      routeId: props.routeId,
      vehicleProductId: props.vehicleProductId,
      departureDateTime: (props.departureDateTime as number) || 0,
      arrivalDateTime: (props.arrivalDateTime as number) || 0,
      totalSeats,
      bookedCount,
      availableSeats: totalSeats - bookedCount,
      route: routeInfo,
      priceCentsPerSeat: (props.priceCentsPerSeat as number) || 0,
    };
  },
});

/**
 * GET DEPARTURES FOR ROUTE
 */
export const getDeparturesForRoute = query({
  args: {
    sessionId: v.string(),
    routeId: v.id("objects"),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const links = await ctx.db
      .query("objectLinks")
      .withIndex("by_from_link_type", (q: any) =>
        q.eq("fromObjectId", args.routeId).eq("linkType", "has_departure")
      )
      .collect();

    const departures = [];

    for (const link of links) {
      const departure = await ctx.db.get(link.toObjectId);
      if (!departure || departure.type !== "departure") continue;
      if (departure.status === "cancelled") continue;

      const props = departure.customProperties as Record<string, unknown>;
      const departureDateTime = (props.departureDateTime as number) || 0;

      if (args.startDate && departureDateTime < args.startDate) continue;
      if (args.endDate && departureDateTime > args.endDate) continue;

      const totalSeats = (props.totalSeats as number) || 0;
      const bookedCount = (props.bookedCount as number) || 0;

      departures.push({
        _id: departure._id,
        name: departure.name,
        subtype: departure.subtype,
        status: departure.status,
        departureDateTime,
        arrivalDateTime: (props.arrivalDateTime as number) || 0,
        totalSeats,
        bookedCount,
        availableSeats: totalSeats - bookedCount,
        priceCentsPerSeat: (props.priceCentsPerSeat as number) || 0,
      });
    }

    departures.sort((a, b) => a.departureDateTime - b.departureDateTime);
    return departures;
  },
});

// ============================================================================
// DEPARTURE MUTATIONS
// ============================================================================

/**
 * CREATE DEPARTURE
 */
export const createDeparture = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    routeId: v.id("objects"),
    name: v.string(),
    subtype: v.union(v.literal("scheduled"), v.literal("charter")),
    vehicleProductId: v.optional(v.id("objects")),
    departureDateTime: v.number(),
    arrivalDateTime: v.number(),
    totalSeats: v.number(),
    priceCentsPerSeat: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const route = await ctx.db.get(args.routeId);
    if (!route || route.type !== "route") {
      throw new Error("Route not found");
    }

    if (args.arrivalDateTime <= args.departureDateTime) {
      throw new Error("Arrival time must be after departure time");
    }

    const departureId = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "departure",
      subtype: args.subtype,
      name: args.name,
      status: "scheduled",
      customProperties: {
        routeId: args.routeId,
        vehicleProductId: args.vehicleProductId || null,
        departureDateTime: args.departureDateTime,
        arrivalDateTime: args.arrivalDateTime,
        totalSeats: args.totalSeats,
        bookedCount: 0,
        priceCentsPerSeat: args.priceCentsPerSeat || 0,
      },
      createdBy: userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    await ctx.db.insert("objectLinks", {
      organizationId: args.organizationId,
      fromObjectId: args.routeId,
      toObjectId: departureId,
      linkType: "has_departure",
      createdBy: userId,
      createdAt: Date.now(),
    });

    return { departureId };
  },
});

/**
 * UPDATE DEPARTURE
 */
export const updateDeparture = mutation({
  args: {
    sessionId: v.string(),
    departureId: v.id("objects"),
    name: v.optional(v.string()),
    departureDateTime: v.optional(v.number()),
    arrivalDateTime: v.optional(v.number()),
    status: v.optional(v.string()),
    totalSeats: v.optional(v.number()),
    priceCentsPerSeat: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const departure = await ctx.db.get(args.departureId);
    if (!departure || departure.type !== "departure") {
      throw new Error("Departure not found");
    }

    const props = departure.customProperties as Record<string, unknown>;
    const updatedProps = { ...props };

    if (args.departureDateTime !== undefined) updatedProps.departureDateTime = args.departureDateTime;
    if (args.arrivalDateTime !== undefined) updatedProps.arrivalDateTime = args.arrivalDateTime;
    if (args.totalSeats !== undefined) updatedProps.totalSeats = args.totalSeats;
    if (args.priceCentsPerSeat !== undefined) updatedProps.priceCentsPerSeat = args.priceCentsPerSeat;

    const validStatuses = ["scheduled", "boarding", "departed", "arrived", "cancelled"];
    if (args.status !== undefined && !validStatuses.includes(args.status)) {
      throw new Error(`Invalid status. Must be one of: ${validStatuses.join(", ")}`);
    }

    await ctx.db.patch(args.departureId, {
      ...(args.name !== undefined && { name: args.name }),
      ...(args.status !== undefined && { status: args.status }),
      customProperties: updatedProps,
      updatedAt: Date.now(),
    });

    return { departureId: args.departureId };
  },
});

/**
 * DELETE DEPARTURE
 */
export const deleteDeparture = mutation({
  args: {
    sessionId: v.string(),
    departureId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const departure = await ctx.db.get(args.departureId);
    if (!departure || departure.type !== "departure") {
      throw new Error("Departure not found");
    }

    const props = departure.customProperties as Record<string, unknown>;
    const bookedCount = (props.bookedCount as number) || 0;

    if (bookedCount > 0) {
      throw new Error("Cannot delete departure with existing bookings. Cancel bookings first.");
    }

    const links = await ctx.db
      .query("objectLinks")
      .withIndex("by_to_link_type", (q: any) =>
        q.eq("toObjectId", args.departureId)
      )
      .collect();

    for (const link of links) {
      await ctx.db.delete(link._id);
    }

    await ctx.db.delete(args.departureId);
    return { success: true };
  },
});

// ============================================================================
// INTERNAL QUERIES / MUTATIONS (for availability + booking dispatchers)
// ============================================================================

/**
 * GET DEPARTURE AVAILABILITY (INTERNAL)
 * Used by availability dispatcher
 */
export const getDepartureAvailabilityInternal = internalQuery({
  args: {
    routeId: v.id("objects"),
    startDate: v.number(),
    endDate: v.number(),
  },
  handler: async (ctx, args) => {
    const links = await ctx.db
      .query("objectLinks")
      .withIndex("by_from_link_type", (q: any) =>
        q.eq("fromObjectId", args.routeId).eq("linkType", "has_departure")
      )
      .collect();

    const route = await ctx.db.get(args.routeId);
    if (!route || route.type !== "route") return null;

    const routeProps = route.customProperties as Record<string, unknown>;
    const departures = [];

    for (const link of links) {
      const departure = await ctx.db.get(link.toObjectId);
      if (!departure || departure.type !== "departure") continue;
      if (departure.status === "cancelled") continue;

      const props = departure.customProperties as Record<string, unknown>;
      const departureDateTime = (props.departureDateTime as number) || 0;

      if (departureDateTime < args.startDate || departureDateTime > args.endDate) continue;

      const totalSeats = (props.totalSeats as number) || 0;
      const bookedCount = (props.bookedCount as number) || 0;

      departures.push({
        _id: departure._id,
        departureDateTime,
        arrivalDateTime: (props.arrivalDateTime as number) || 0,
        status: departure.status,
        totalSeats,
        bookedCount,
        availableSeats: Math.max(0, totalSeats - bookedCount),
        priceCentsPerSeat: (props.priceCentsPerSeat as number) || 0,
      });
    }

    departures.sort((a, b) => a.departureDateTime - b.departureDateTime);

    return {
      route: {
        _id: route._id,
        name: route.name,
        originName: routeProps.originName,
        destinationName: routeProps.destinationName,
        estimatedDurationMinutes: routeProps.estimatedDurationMinutes,
      },
      departures,
    };
  },
});

/**
 * BOOK DEPARTURE SEATS (INTERNAL)
 * Atomically book seats on a departure. Used by booking creation.
 */
export const bookDepartureSeatsInternal = internalMutation({
  args: {
    departureId: v.id("objects"),
    passengerCount: v.number(),
    bookingId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const departure = await ctx.db.get(args.departureId);
    if (!departure || departure.type !== "departure") {
      throw new Error("Departure not found");
    }

    const props = departure.customProperties as Record<string, unknown>;
    const totalSeats = (props.totalSeats as number) || 0;
    const bookedCount = (props.bookedCount as number) || 0;

    if (bookedCount + args.passengerCount > totalSeats) {
      throw new Error(
        `Not enough seats. Available: ${totalSeats - bookedCount}, Requested: ${args.passengerCount}`
      );
    }

    await ctx.db.patch(args.departureId, {
      customProperties: {
        ...props,
        bookedCount: bookedCount + args.passengerCount,
      },
      updatedAt: Date.now(),
    });

    return {
      success: true,
      priceCents: ((props.priceCentsPerSeat as number) || 0) * args.passengerCount,
    };
  },
});

/**
 * UNBOOK DEPARTURE SEATS (INTERNAL)
 * Release booked seats when a booking is cancelled.
 */
export const unbookDepartureSeatsInternal = internalMutation({
  args: {
    departureId: v.id("objects"),
    passengerCount: v.number(),
  },
  handler: async (ctx, args) => {
    const departure = await ctx.db.get(args.departureId);
    if (!departure || departure.type !== "departure") {
      throw new Error("Departure not found");
    }

    const props = departure.customProperties as Record<string, unknown>;
    const bookedCount = (props.bookedCount as number) || 0;

    await ctx.db.patch(args.departureId, {
      customProperties: {
        ...props,
        bookedCount: Math.max(0, bookedCount - args.passengerCount),
      },
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});
