/**
 * TICKET ONTOLOGY
 *
 * Manages tickets for event management (instances of products).
 * Uses the universal ontology system (objects table).
 *
 * Ticket Types (subtype):
 * - "standard" - Standard admission tickets
 * - "vip" - VIP/premium tickets
 * - "early-bird" - Early bird discount tickets
 * - "student" - Student discount tickets
 *
 * Status Workflow:
 * - "issued" - Ticket has been created/issued
 * - "redeemed" - Ticket has been used/checked in
 * - "cancelled" - Ticket has been cancelled
 * - "transferred" - Ticket has been transferred to another person
 *
 * GRAVEL ROAD APPROACH:
 * - Start simple: holderName, holderEmail, productId
 * - NO QR codes yet (add when check-in is needed)
 * - NO transfer mechanism yet (add when users request)
 * - NO check-in system yet (add when events need it)
 */

import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { requireAuthenticatedUser } from "./rbacHelpers";

/**
 * GET TICKETS
 * Returns all tickets for an organization
 */
export const getTickets = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    subtype: v.optional(v.string()), // Filter by ticket type
    status: v.optional(v.string()),  // Filter by status
    productId: v.optional(v.id("objects")), // Filter by product
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const q = ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "ticket")
      );

    let tickets = await q.collect();

    // Apply filters
    if (args.subtype) {
      tickets = tickets.filter((t) => t.subtype === args.subtype);
    }

    if (args.status) {
      tickets = tickets.filter((t) => t.status === args.status);
    }

    if (args.productId) {
      tickets = tickets.filter(
        (t) => t.customProperties?.productId === args.productId
      );
    }

    return tickets;
  },
});

/**
 * GET TICKET
 * Get a single ticket by ID
 */
export const getTicket = query({
  args: {
    sessionId: v.string(),
    ticketId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const ticket = await ctx.db.get(args.ticketId);

    if (!ticket || ticket.type !== "ticket") {
      throw new Error("Ticket not found");
    }

    return ticket;
  },
});

/**
 * GET TICKETS BY PRODUCT
 * Get all tickets issued from a specific product
 * Uses objectLinks to find tickets linked to a product
 */
export const getTicketsByProduct = query({
  args: {
    sessionId: v.string(),
    productId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    // Get all tickets that have this product in customProperties.productId
    const tickets = await ctx.db
      .query("objects")
      .collect();

    const matchingTickets = tickets.filter(
      (t) => t.type === "ticket" && t.customProperties?.productId === args.productId
    );

    return matchingTickets;
  },
});

/**
 * GET PRODUCT BY TICKET
 * Get the product that a ticket was issued from
 */
export const getProductByTicket = query({
  args: {
    sessionId: v.string(),
    ticketId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const ticket = await ctx.db.get(args.ticketId);

    if (!ticket || ticket.type !== "ticket") {
      throw new Error("Ticket not found");
    }

    const productId = ticket.customProperties?.productId;
    if (!productId) {
      throw new Error("Ticket has no associated product");
    }

    const product = await ctx.db.get(productId as Id<"objects">);

    if (!product) {
      throw new Error("Product not found");
    }

    // Type guard: check it's actually an object (not org/user/etc)
    if (!("type" in product) || product.type !== "product") {
      throw new Error("Invalid product - not an object type");
    }

    return product;
  },
});

/**
 * CREATE TICKET
 * Issue a new ticket from a product
 */
export const createTicket = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    productId: v.id("objects"), // Product this ticket is issued from
    eventId: v.optional(v.id("objects")), // Optional event to link ticket to
    holderName: v.string(),
    holderEmail: v.string(),
    customProperties: v.optional(v.record(v.string(), v.any())),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // Validate product exists
    const product = await ctx.db.get(args.productId);
    if (!product || product.type !== "product") {
      throw new Error("Product not found");
    }

    // Validate event exists if provided
    if (args.eventId) {
      const event = await ctx.db.get(args.eventId);
      if (!event || event.type !== "event") {
        throw new Error("Event not found");
      }
    }

    // Build customProperties with ticket data
    const customProperties = {
      productId: args.productId,
      holderName: args.holderName,
      holderEmail: args.holderEmail,
      purchaseDate: Date.now(),
      // GRAVEL ROAD: No QR codes, check-in system, or transfer mechanism yet
      ...(args.customProperties || {}),
    };

    // Create ticket object - subtype removed, inherit from product
    const ticketId = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "ticket",
      subtype: "ticket", // Generic subtype, actual type comes from product
      name: `${product.name} - ${args.holderName}`,
      description: `Ticket for ${args.holderName}`,
      status: "issued",
      customProperties,
      createdBy: userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Create objectLink: ticket --[issued_from]--> product
    await ctx.db.insert("objectLinks", {
      organizationId: args.organizationId,
      fromObjectId: ticketId,
      toObjectId: args.productId,
      linkType: "issued_from",
      properties: {
        purchaseDate: Date.now(),
      },
      createdAt: Date.now(),
    });

    // Create objectLink: ticket --[admits_to]--> event (if event provided)
    if (args.eventId) {
      await ctx.db.insert("objectLinks", {
        organizationId: args.organizationId,
        fromObjectId: ticketId,
        toObjectId: args.eventId,
        linkType: "admits_to",
        properties: {
          checkInStatus: null,
          checkInDate: null,
        },
        createdAt: Date.now(),
      });
    }

    return ticketId;
  },
});

/**
 * UPDATE TICKET
 * Update an existing ticket (for status changes, transfers, etc.)
 */
export const updateTicket = mutation({
  args: {
    sessionId: v.string(),
    ticketId: v.id("objects"),
    holderName: v.optional(v.string()),
    holderEmail: v.optional(v.string()),
    status: v.optional(v.string()), // "issued" | "redeemed" | "cancelled" | "transferred"
    customProperties: v.optional(v.record(v.string(), v.any())),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const ticket = await ctx.db.get(args.ticketId);

    if (!ticket || ticket.type !== "ticket") {
      throw new Error("Ticket not found");
    }

    // Build update object
    const updates: Record<string, unknown> = {
      updatedAt: Date.now(),
    };

    if (args.status !== undefined) {
      const validStatuses = ["issued", "redeemed", "cancelled", "transferred"];
      if (!validStatuses.includes(args.status)) {
        throw new Error(
          `Invalid status. Must be one of: ${validStatuses.join(", ")}`
        );
      }
      updates.status = args.status;
    }

    // Update customProperties
    if (args.holderName !== undefined || args.holderEmail !== undefined || args.customProperties) {
      const currentProps = ticket.customProperties || {};

      updates.customProperties = {
        ...currentProps,
        ...(args.holderName !== undefined && { holderName: args.holderName }),
        ...(args.holderEmail !== undefined && { holderEmail: args.holderEmail }),
        ...(args.customProperties || {}),
      };
    }

    // Update ticket name if holder name changed
    if (args.holderName !== undefined) {
      updates.name = `${ticket.name.split(" - ")[0]} - ${args.holderName}`;
    }

    await ctx.db.patch(args.ticketId, updates);

    return args.ticketId;
  },
});

/**
 * CANCEL TICKET
 * Mark a ticket as cancelled (soft delete)
 */
export const cancelTicket = mutation({
  args: {
    sessionId: v.string(),
    ticketId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const ticket = await ctx.db.get(args.ticketId);

    if (!ticket || ticket.type !== "ticket") {
      throw new Error("Ticket not found");
    }

    await ctx.db.patch(args.ticketId, {
      status: "cancelled",
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * REDEEM TICKET
 * Mark a ticket as redeemed (checked in)
 * GRAVEL ROAD: Simple status change only - no check-in system yet
 */
export const redeemTicket = mutation({
  args: {
    sessionId: v.string(),
    ticketId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const ticket = await ctx.db.get(args.ticketId);

    if (!ticket || ticket.type !== "ticket") {
      throw new Error("Ticket not found");
    }

    if (ticket.status === "redeemed") {
      throw new Error("Ticket has already been redeemed");
    }

    if (ticket.status === "cancelled") {
      throw new Error("Cannot redeem a cancelled ticket");
    }

    const currentProps = ticket.customProperties || {};

    await ctx.db.patch(args.ticketId, {
      status: "redeemed",
      customProperties: {
        ...currentProps,
        redeemedAt: Date.now(),
        redeemedBy: userId,
        // GRAVEL ROAD: No check-in location, QR scan, etc. yet
      },
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * LINK TICKET TO EVENT
 * Create objectLink: ticket --[admits_to]--> event
 */
export const linkTicketToEvent = mutation({
  args: {
    sessionId: v.string(),
    ticketId: v.id("objects"),
    eventId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    // Validate ticket exists
    const ticket = await ctx.db.get(args.ticketId);
    if (!ticket || ticket.type !== "ticket") {
      throw new Error("Ticket not found");
    }

    // Validate event exists
    const event = await ctx.db.get(args.eventId);
    if (!event || event.type !== "event") {
      throw new Error("Event not found");
    }

    // Check if link already exists
    const existingLinks = await ctx.db
      .query("objectLinks")
      .withIndex("by_from_object", (q) => q.eq("fromObjectId", args.ticketId))
      .collect();

    const existingLink = existingLinks.find(
      (link) => link.toObjectId === args.eventId && link.linkType === "admits_to"
    );

    if (existingLink) {
      throw new Error("Ticket is already linked to this event");
    }

    // Create link
    const linkId = await ctx.db.insert("objectLinks", {
      organizationId: ticket.organizationId,
      fromObjectId: args.ticketId,
      toObjectId: args.eventId,
      linkType: "admits_to",
      properties: {
        checkInStatus: null, // null = not checked in yet
        checkInDate: null,
      },
      createdAt: Date.now(),
    });

    return linkId;
  },
});

/**
 * GET TICKETS BY EVENT
 * Get all tickets that admit to a specific event
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
      if (ticket && ticket.type === "ticket") {
        tickets.push(ticket);
      }
    }

    return tickets;
  },
});
