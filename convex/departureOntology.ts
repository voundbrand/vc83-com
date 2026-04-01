/**
 * DEPARTURE ONTOLOGY (Simplified)
 *
 * Manages fleets, routes, vessels, and departures for departure-bound products
 * (ferries, buses, trains, aircraft, tours).
 * Uses the universal ontology system (objects table).
 *
 * Simplified model:
 * - A product (vehicle) can act as a vessel/transport asset
 * - A fleet can own many vessels
 * - Routes define origin/destination
 * - Departures are scheduled instances on a route with a simple seat counter
 * - No fare classes — just totalSeats and bookedCount per departure
 *
 * Object Types:
 * - "fleet" (subtypes: marine, ground, air, tour)
 * - "route" (subtypes: one_way, round_trip, multi_leg)
 * - "departure" (subtypes: scheduled, charter)
 *
 * Link Types:
 * - "has_vessel" — fleet -> vessel product
 * - "has_route" — product -> route
 * - "has_departure" — route -> departure
 * - "operates_departure" — vessel product -> departure
 */

import { query, mutation, internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { requireAuthenticatedUser } from "./rbacHelpers";

async function getFleetLinkForVessel(
  ctx: any,
  vesselId: Id<"objects">
) {
  const fleetLinks = await ctx.db
    .query("objectLinks")
    .withIndex("by_to_link_type", (q: any) =>
      q.eq("toObjectId", vesselId).eq("linkType", "has_vessel")
    )
    .collect();

  return fleetLinks[0] || null;
}

async function validateVesselProduct(
  ctx: any,
  vesselId: Id<"objects">
) {
  const vessel = await ctx.db.get(vesselId);
  if (!vessel || vessel.type !== "product" || vessel.subtype !== "vehicle") {
    throw new Error("Vessel must reference an active vehicle product");
  }
  return vessel;
}

async function attachVesselToDeparture(args: {
  ctx: any;
  organizationId: Id<"organizations">;
  vesselId: Id<"objects">;
  departureId: Id<"objects">;
  createdBy?: Id<"users">;
}) {
  const fleetLink = await getFleetLinkForVessel(args.ctx, args.vesselId);
  const fleetId = fleetLink?.fromObjectId || null;

  const existingLinks = await args.ctx.db
    .query("objectLinks")
    .withIndex("by_to_link_type", (q: any) =>
      q.eq("toObjectId", args.departureId).eq("linkType", "operates_departure")
    )
    .collect();

  for (const link of existingLinks) {
    await args.ctx.db.delete(link._id);
  }

  await args.ctx.db.insert("objectLinks", {
    organizationId: args.organizationId,
    fromObjectId: args.vesselId,
    toObjectId: args.departureId,
    linkType: "operates_departure",
    createdBy: args.createdBy,
    createdAt: Date.now(),
  });

  const departure = await args.ctx.db.get(args.departureId);
  const currentProps = (departure?.customProperties || {}) as Record<string, unknown>;
  await args.ctx.db.patch(args.departureId, {
    customProperties: {
      ...currentProps,
      vehicleProductId: args.vesselId,
      vesselId: args.vesselId,
      fleetId,
    },
    updatedAt: Date.now(),
  });

  return {
    fleetId,
  };
}

function isDepartureWithinDateRange(
  departureDateTime: number,
  range?: {
    startDate?: number;
    endDate?: number;
  }
) {
  if (range?.startDate && departureDateTime < range.startDate) {
    return false;
  }
  if (range?.endDate && departureDateTime > range.endDate) {
    return false;
  }
  return true;
}

function summarizeDepartureRecord(departure: any) {
  const props = (departure.customProperties || {}) as Record<string, unknown>;
  const totalSeats = (props.totalSeats as number) || 0;
  const bookedCount = (props.bookedCount as number) || 0;

  return {
    _id: departure._id,
    name: departure.name,
    subtype: departure.subtype,
    status: departure.status,
    routeId: (props.routeId as string | null) || null,
    vehicleProductId: (props.vehicleProductId as string | null) || null,
    vesselId:
      (props.vesselId as string | null)
      || (props.vehicleProductId as string | null)
      || null,
    fleetId: (props.fleetId as string | null) || null,
    departureDateTime: (props.departureDateTime as number) || 0,
    arrivalDateTime: (props.arrivalDateTime as number) || 0,
    totalSeats,
    bookedCount,
    availableSeats: totalSeats - bookedCount,
    priceCentsPerSeat: (props.priceCentsPerSeat as number) || 0,
  };
}

async function listDeparturesForLinks(
  ctx: any,
  links: Array<{ toObjectId: Id<"objects"> }>,
  range?: {
    startDate?: number;
    endDate?: number;
  }
) {
  const departures = [];
  const seenDepartureIds = new Set<string>();

  for (const link of links) {
    const departure = await ctx.db.get(link.toObjectId);
    if (!departure || departure.type !== "departure" || departure.status === "cancelled") {
      continue;
    }

    const summary = summarizeDepartureRecord(departure);
    if (!isDepartureWithinDateRange(summary.departureDateTime, range)) {
      continue;
    }

    const summaryId = String(summary._id);
    if (seenDepartureIds.has(summaryId)) {
      continue;
    }

    seenDepartureIds.add(summaryId);
    departures.push(summary);
  }

  departures.sort((a, b) => a.departureDateTime - b.departureDateTime);
  return departures;
}

// ============================================================================
// FLEET QUERIES / MUTATIONS
// ============================================================================

export const getFleet = query({
  args: {
    sessionId: v.string(),
    fleetId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const fleet = await ctx.db.get(args.fleetId);
    if (!fleet || fleet.type !== "fleet") {
      throw new Error("Fleet not found");
    }

    const props = (fleet.customProperties || {}) as Record<string, unknown>;
    const vesselLinks = await ctx.db
      .query("objectLinks")
      .withIndex("by_from_link_type", (q: any) =>
        q.eq("fromObjectId", args.fleetId).eq("linkType", "has_vessel")
      )
      .collect();

    return {
      _id: fleet._id,
      name: fleet.name,
      subtype: fleet.subtype,
      status: fleet.status,
      transportMode: (props.transportMode as string) || "",
      vesselCount: vesselLinks.length,
    };
  },
});

export const getFleets = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const fleets = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q: any) =>
        q.eq("organizationId", args.organizationId).eq("type", "fleet")
      )
      .collect();

    return fleets
      .filter((fleet) => fleet.status !== "archived")
      .map((fleet) => {
        const props = (fleet.customProperties || {}) as Record<string, unknown>;
        return {
          _id: fleet._id,
          name: fleet.name,
          subtype: fleet.subtype,
          status: fleet.status,
          transportMode: (props.transportMode as string) || "",
        };
      });
  },
});

export const createFleet = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    name: v.string(),
    subtype: v.union(
      v.literal("marine"),
      v.literal("ground"),
      v.literal("air"),
      v.literal("tour")
    ),
    transportMode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const fleetId = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "fleet",
      subtype: args.subtype,
      name: args.name,
      status: "active",
      customProperties: {
        transportMode: args.transportMode || args.subtype,
      },
      createdBy: userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return { fleetId };
  },
});

export const assignVesselToFleet = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    fleetId: v.id("objects"),
    vesselId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const fleet = await ctx.db.get(args.fleetId);
    if (!fleet || fleet.type !== "fleet") {
      throw new Error("Fleet not found");
    }
    if (fleet.organizationId !== args.organizationId) {
      throw new Error("Fleet organization mismatch");
    }

    const vessel = await validateVesselProduct(ctx, args.vesselId);
    if (vessel.organizationId !== args.organizationId) {
      throw new Error("Vessel organization mismatch");
    }

    const currentFleetLinks = await ctx.db
      .query("objectLinks")
      .withIndex("by_to_link_type", (q: any) =>
        q.eq("toObjectId", args.vesselId).eq("linkType", "has_vessel")
      )
      .collect();

    for (const link of currentFleetLinks) {
      if (link.fromObjectId !== args.fleetId) {
        await ctx.db.delete(link._id);
      }
    }

    const alreadyLinked = currentFleetLinks.some(
      (link) => link.fromObjectId === args.fleetId
    );
    if (!alreadyLinked) {
      await ctx.db.insert("objectLinks", {
        organizationId: args.organizationId,
        fromObjectId: args.fleetId,
        toObjectId: args.vesselId,
        linkType: "has_vessel",
        createdBy: userId,
        createdAt: Date.now(),
      });
    }

    await ctx.db.patch(args.vesselId, {
      customProperties: {
        ...((vessel.customProperties || {}) as Record<string, unknown>),
        fleetId: args.fleetId,
      },
      updatedAt: Date.now(),
    });

    return {
      fleetId: args.fleetId,
      vesselId: args.vesselId,
      linked: true,
    };
  },
});

export const getFleetVessels = query({
  args: {
    sessionId: v.string(),
    fleetId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const fleet = await ctx.db.get(args.fleetId);
    if (!fleet || fleet.type !== "fleet") {
      throw new Error("Fleet not found");
    }

    const links = await ctx.db
      .query("objectLinks")
      .withIndex("by_from_link_type", (q: any) =>
        q.eq("fromObjectId", args.fleetId).eq("linkType", "has_vessel")
      )
      .collect();

    const vessels = [];
    for (const link of links) {
      const vessel = await ctx.db.get(link.toObjectId);
      if (!vessel || vessel.type !== "product" || vessel.subtype !== "vehicle") {
        continue;
      }
      vessels.push({
        _id: vessel._id,
        name: vessel.name,
        status: vessel.status,
        customProperties: vessel.customProperties,
      });
    }

    return vessels;
  },
});

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
    const vesselId =
      (props.vesselId as Id<"objects"> | null)
      || (props.vehicleProductId as Id<"objects"> | null)
      || null;
    const fleetId = (props.fleetId as Id<"objects"> | null) || null;

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

    let vesselInfo = null;
    if (vesselId) {
      const vessel = await ctx.db.get(vesselId);
      if (vessel && vessel.type === "product" && vessel.subtype === "vehicle") {
        vesselInfo = {
          _id: vessel._id,
          name: vessel.name,
          status: vessel.status,
        };
      }
    }

    let fleetInfo = null;
    if (fleetId) {
      const fleet = await ctx.db.get(fleetId);
      if (fleet && fleet.type === "fleet") {
        fleetInfo = {
          _id: fleet._id,
          name: fleet.name,
          subtype: fleet.subtype,
          status: fleet.status,
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
      vesselId,
      fleetId,
      departureDateTime: (props.departureDateTime as number) || 0,
      arrivalDateTime: (props.arrivalDateTime as number) || 0,
      totalSeats,
      bookedCount,
      availableSeats: totalSeats - bookedCount,
      route: routeInfo,
      vessel: vesselInfo,
      fleet: fleetInfo,
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

    return await listDeparturesForLinks(ctx, links, {
      startDate: args.startDate,
      endDate: args.endDate,
    });
  },
});

export const getDeparturesForVessel = query({
  args: {
    sessionId: v.string(),
    vesselId: v.id("objects"),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);
    await validateVesselProduct(ctx, args.vesselId);

    const links = await ctx.db
      .query("objectLinks")
      .withIndex("by_from_link_type", (q: any) =>
        q.eq("fromObjectId", args.vesselId).eq("linkType", "operates_departure")
      )
      .collect();

    return await listDeparturesForLinks(ctx, links, {
      startDate: args.startDate,
      endDate: args.endDate,
    });
  },
});

export const getFleetDepartures = query({
  args: {
    sessionId: v.string(),
    fleetId: v.id("objects"),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const fleet = await ctx.db.get(args.fleetId);
    if (!fleet || fleet.type !== "fleet") {
      throw new Error("Fleet not found");
    }

    const vesselLinks = await ctx.db
      .query("objectLinks")
      .withIndex("by_from_link_type", (q: any) =>
        q.eq("fromObjectId", args.fleetId).eq("linkType", "has_vessel")
      )
      .collect();

    const allDepartureLinks = [];
    for (const vesselLink of vesselLinks) {
      const departureLinks = await ctx.db
        .query("objectLinks")
        .withIndex("by_from_link_type", (q: any) =>
          q.eq("fromObjectId", vesselLink.toObjectId).eq("linkType", "operates_departure")
        )
        .collect();
      allDepartureLinks.push(...departureLinks);
    }

    return await listDeparturesForLinks(ctx, allDepartureLinks, {
      startDate: args.startDate,
      endDate: args.endDate,
    });
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
    vesselId: v.optional(v.id("objects")),
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

    const effectiveVesselId = args.vesselId || args.vehicleProductId || null;
    if (
      args.vesselId
      && args.vehicleProductId
      && args.vesselId !== args.vehicleProductId
    ) {
      throw new Error("vesselId must match vehicleProductId when both are provided");
    }
    if (effectiveVesselId) {
      const vessel = await validateVesselProduct(ctx, effectiveVesselId);
      if (vessel.organizationId !== args.organizationId) {
        throw new Error("Vessel organization mismatch");
      }
    }

    const fleetLink = effectiveVesselId
      ? await getFleetLinkForVessel(ctx, effectiveVesselId)
      : null;
    const fleetId = fleetLink?.fromObjectId || null;

    const departureId = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "departure",
      subtype: args.subtype,
      name: args.name,
      status: "scheduled",
      customProperties: {
        routeId: args.routeId,
        vehicleProductId: effectiveVesselId || null,
        vesselId: effectiveVesselId || null,
        fleetId,
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

    if (effectiveVesselId) {
      await attachVesselToDeparture({
        ctx,
        organizationId: args.organizationId,
        vesselId: effectiveVesselId,
        departureId,
        createdBy: userId,
      });
    }

    return { departureId };
  },
});

export const assignVesselToDeparture = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    departureId: v.id("objects"),
    vesselId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const departure = await ctx.db.get(args.departureId);
    if (!departure || departure.type !== "departure") {
      throw new Error("Departure not found");
    }
    if (departure.organizationId !== args.organizationId) {
      throw new Error("Departure organization mismatch");
    }

    const vessel = await validateVesselProduct(ctx, args.vesselId);
    if (vessel.organizationId !== args.organizationId) {
      throw new Error("Vessel organization mismatch");
    }

    const attachResult = await attachVesselToDeparture({
      ctx,
      organizationId: args.organizationId,
      vesselId: args.vesselId,
      departureId: args.departureId,
      createdBy: userId,
    });

    return {
      departureId: args.departureId,
      vesselId: args.vesselId,
      fleetId: attachResult.fleetId,
    };
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
