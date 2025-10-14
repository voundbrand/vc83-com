/**
 * EVENT ONTOLOGY
 *
 * Manages events as containers/aggregators that reference other objects.
 * Uses the universal ontology system (objects table).
 *
 * Event Types (subtype):
 * - "conference" - Multi-day conferences
 * - "workshop" - Single or multi-session workshops
 * - "concert" - Music/performance events
 * - "meetup" - Casual networking events
 *
 * Status Workflow:
 * - "draft" - Being planned
 * - "published" - Public and accepting registrations
 * - "in_progress" - Event is happening now
 * - "completed" - Event has ended
 * - "cancelled" - Event was cancelled
 *
 * GRAVEL ROAD APPROACH:
 * - Start simple: name, dates, location, description
 * - NO agenda yet (add when users need scheduling)
 * - NO sponsors yet (add when events have sponsors)
 * - NO capacity limits yet (add when events fill up)
 * - NO attendee management yet (add when needed)
 */

import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAuthenticatedUser } from "./rbacHelpers";

/**
 * GET EVENTS
 * Returns all events for an organization
 */
export const getEvents = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    subtype: v.optional(v.string()), // Filter by event type
    status: v.optional(v.string()),  // Filter by status
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const q = ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "event")
      );

    let events = await q.collect();

    // Apply filters
    if (args.subtype) {
      events = events.filter((e) => e.subtype === args.subtype);
    }

    if (args.status) {
      events = events.filter((e) => e.status === args.status);
    }

    return events;
  },
});

/**
 * GET EVENT
 * Get a single event by ID
 */
export const getEvent = query({
  args: {
    sessionId: v.string(),
    eventId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const event = await ctx.db.get(args.eventId);

    if (!event || !("type" in event) || event.type !== "event") {
      throw new Error("Event not found");
    }

    return event;
  },
});

/**
 * CREATE EVENT
 * Create a new event
 */
export const createEvent = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    subtype: v.string(), // "conference" | "workshop" | "concert" | "meetup"
    name: v.string(),
    description: v.optional(v.string()),
    startDate: v.number(), // Unix timestamp
    endDate: v.number(),   // Unix timestamp
    location: v.string(),  // "San Francisco Convention Center"
    customProperties: v.optional(v.record(v.string(), v.any())),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // Validate subtype
    const validSubtypes = ["conference", "workshop", "concert", "meetup"];
    if (!validSubtypes.includes(args.subtype)) {
      throw new Error(
        `Invalid event subtype. Must be one of: ${validSubtypes.join(", ")}`
      );
    }

    // Validate dates
    if (args.endDate < args.startDate) {
      throw new Error("End date must be after start date");
    }

    // Build customProperties with event data
    const customProperties = {
      startDate: args.startDate,
      endDate: args.endDate,
      location: args.location,
      timezone: "America/Los_Angeles", // Default timezone (gravel road)
      // GRAVEL ROAD: No capacity, agenda, sponsors, etc. yet
      ...(args.customProperties || {}),
    };

    // Create event object
    const eventId = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "event",
      subtype: args.subtype,
      name: args.name,
      description: args.description,
      status: "draft", // Start as draft
      customProperties,
      createdBy: userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return eventId;
  },
});

/**
 * UPDATE EVENT
 * Update an existing event
 */
export const updateEvent = mutation({
  args: {
    sessionId: v.string(),
    eventId: v.id("objects"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    location: v.optional(v.string()),
    status: v.optional(v.string()), // "draft" | "published" | "in_progress" | "completed" | "cancelled"
    customProperties: v.optional(v.record(v.string(), v.any())),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const event = await ctx.db.get(args.eventId);

    if (!event || !("type" in event) || event.type !== "event") {
      throw new Error("Event not found");
    }

    // Build update object
    const updates: Record<string, unknown> = {
      updatedAt: Date.now(),
    };

    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;
    if (args.status !== undefined) {
      const validStatuses = ["draft", "published", "in_progress", "completed", "cancelled"];
      if (!validStatuses.includes(args.status)) {
        throw new Error(
          `Invalid status. Must be one of: ${validStatuses.join(", ")}`
        );
      }
      updates.status = args.status;
    }

    // Update customProperties
    if (args.startDate !== undefined || args.endDate !== undefined || args.location !== undefined || args.customProperties) {
      const currentProps = event.customProperties || {};

      // Validate date changes
      const newStartDate = args.startDate ?? currentProps.startDate;
      const newEndDate = args.endDate ?? currentProps.endDate;
      if (newEndDate < newStartDate) {
        throw new Error("End date must be after start date");
      }

      updates.customProperties = {
        ...currentProps,
        ...(args.startDate !== undefined && { startDate: args.startDate }),
        ...(args.endDate !== undefined && { endDate: args.endDate }),
        ...(args.location !== undefined && { location: args.location }),
        ...(args.customProperties || {}),
      };
    }

    await ctx.db.patch(args.eventId, updates);

    return args.eventId;
  },
});

/**
 * DELETE EVENT
 * Soft delete an event (set status to cancelled)
 */
export const deleteEvent = mutation({
  args: {
    sessionId: v.string(),
    eventId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const event = await ctx.db.get(args.eventId);

    if (!event || !("type" in event) || event.type !== "event") {
      throw new Error("Event not found");
    }

    await ctx.db.patch(args.eventId, {
      status: "cancelled",
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * PUBLISH EVENT
 * Set event status to "published" (make it public)
 */
export const publishEvent = mutation({
  args: {
    sessionId: v.string(),
    eventId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const event = await ctx.db.get(args.eventId);

    if (!event || !("type" in event) || event.type !== "event") {
      throw new Error("Event not found");
    }

    await ctx.db.patch(args.eventId, {
      status: "published",
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * LINK PRODUCT TO EVENT
 * Create objectLink: event --[offers]--> product
 */
export const linkProductToEvent = mutation({
  args: {
    sessionId: v.string(),
    eventId: v.id("objects"),
    productId: v.id("objects"),
    displayOrder: v.optional(v.number()),
    isFeatured: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    // Validate event exists
    const event = await ctx.db.get(args.eventId);
    if (!event || !("type" in event) || event.type !== "event") {
      throw new Error("Event not found");
    }

    // Validate product exists
    const product = await ctx.db.get(args.productId);
    if (!product || !("type" in product) || product.type !== "product") {
      throw new Error("Product not found");
    }

    // Check if link already exists
    const existingLinks = await ctx.db
      .query("objectLinks")
      .withIndex("by_from_object", (q) => q.eq("fromObjectId", args.eventId))
      .collect();

    const existingLink = existingLinks.find(
      (link) => link.toObjectId === args.productId && link.linkType === "offers"
    );

    if (existingLink) {
      throw new Error("Product is already linked to this event");
    }

    // Create link
    const linkId = await ctx.db.insert("objectLinks", {
      organizationId: event.organizationId,
      fromObjectId: args.eventId,
      toObjectId: args.productId,
      linkType: "offers",
      properties: {
        displayOrder: args.displayOrder ?? 0,
        isFeatured: args.isFeatured ?? false,
      },
      createdAt: Date.now(),
    });

    return linkId;
  },
});

/**
 * GET PRODUCTS BY EVENT
 * Get all products offered by an event
 */
export const getProductsByEvent = query({
  args: {
    sessionId: v.string(),
    eventId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    // Get all links where event is the source with linkType "offers"
    const links = await ctx.db
      .query("objectLinks")
      .withIndex("by_from_link_type", (q) =>
        q.eq("fromObjectId", args.eventId).eq("linkType", "offers")
      )
      .collect();

    // Get all products from these links
    const products = [];
    for (const link of links) {
      const product = await ctx.db.get(link.toObjectId);
      if (product && ("type" in product) && product.type === "product") {
        products.push({
          ...product,
          linkProperties: link.properties,
        });
      }
    }

    // Sort by displayOrder
    products.sort((a, b) => {
      const orderA = a.linkProperties?.displayOrder ?? 0;
      const orderB = b.linkProperties?.displayOrder ?? 0;
      return orderA - orderB;
    });

    return products;
  },
});

/**
 * GET TICKETS BY EVENT
 * Get all tickets that admit to a specific event
 * (Uses the ticketOntology's linkType "admits_to")
 */
export const getTicketsByEvent = query({
  args: {
    sessionId: v.string(),
    eventId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    // Get all links where event is the target with linkType "admits_to"
    const links = await ctx.db
      .query("objectLinks")
      .withIndex("by_to_link_type", (q) =>
        q.eq("toObjectId", args.eventId).eq("linkType", "admits_to")
      )
      .collect();

    // Get all tickets from these links
    const tickets = [];
    for (const link of links) {
      const ticket = await ctx.db.get(link.fromObjectId);
      if (ticket && ("type" in ticket) && ticket.type === "ticket") {
        tickets.push({
          ...ticket,
          linkProperties: link.properties,
        });
      }
    }

    return tickets;
  },
});
