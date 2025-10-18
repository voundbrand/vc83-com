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
 * Event Features:
 * - ✅ Agenda/Schedule management (customProperties.agenda)
 * - ✅ Sponsor management (objectLinks with linkType "sponsors")
 * - ✅ Product/Ticket offerings (objectLinks with linkType "offers")
 * - ⏳ Capacity limits (add when events fill up)
 * - ⏳ Attendee management (add when needed)
 */

import { query, mutation, internalQuery } from "./_generated/server";
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
      agenda: [], // Event schedule/agenda array
      maxCapacity: null, // Optional capacity limit
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

/**
 * LINK SPONSOR TO EVENT
 * Create objectLink: event --[sponsored_by]--> crm_organization
 * Allows marking CRM organizations as sponsors for an event
 */
export const linkSponsorToEvent = mutation({
  args: {
    sessionId: v.string(),
    eventId: v.id("objects"),
    crmOrganizationId: v.id("objects"),
    sponsorLevel: v.optional(v.string()), // "platinum", "gold", "silver", "bronze", "community"
    displayOrder: v.optional(v.number()),
    logoUrl: v.optional(v.string()),
    websiteUrl: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    // Validate event exists
    const event = await ctx.db.get(args.eventId);
    if (!event || !("type" in event) || event.type !== "event") {
      throw new Error("Event not found");
    }

    // Validate CRM organization exists
    const crmOrg = await ctx.db.get(args.crmOrganizationId);
    if (!crmOrg || !("type" in crmOrg) || crmOrg.type !== "crm_organization") {
      throw new Error("CRM organization not found");
    }

    // Check if link already exists
    const existingLinks = await ctx.db
      .query("objectLinks")
      .withIndex("by_from_object", (q) => q.eq("fromObjectId", args.eventId))
      .collect();

    const existingLink = existingLinks.find(
      (link) => link.toObjectId === args.crmOrganizationId && link.linkType === "sponsored_by"
    );

    if (existingLink) {
      throw new Error("This organization is already a sponsor for this event");
    }

    // Update CRM organization's sponsor level to stay consistent
    const sponsorLevelValue = args.sponsorLevel ?? "community";
    await ctx.db.patch(args.crmOrganizationId, {
      customProperties: {
        ...crmOrg.customProperties,
        sponsorLevel: sponsorLevelValue,
      },
      updatedAt: Date.now(),
    });

    // Create sponsor link
    const linkId = await ctx.db.insert("objectLinks", {
      organizationId: event.organizationId,
      fromObjectId: args.eventId,
      toObjectId: args.crmOrganizationId,
      linkType: "sponsored_by",
      properties: {
        sponsorLevel: sponsorLevelValue,
        displayOrder: args.displayOrder ?? 0,
        logoUrl: args.logoUrl,
        websiteUrl: args.websiteUrl,
        description: args.description,
      },
      createdAt: Date.now(),
    });

    return linkId;
  },
});

/**
 * GET SPONSORS BY EVENT
 * Get all CRM organizations sponsoring an event
 */
export const getSponsorsByEvent = query({
  args: {
    sessionId: v.string(),
    eventId: v.id("objects"),
    sponsorLevel: v.optional(v.string()), // Filter by sponsor level
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    // Get all sponsor links for this event
    const links = await ctx.db
      .query("objectLinks")
      .withIndex("by_from_link_type", (q) =>
        q.eq("fromObjectId", args.eventId).eq("linkType", "sponsored_by")
      )
      .collect();

    // Filter by sponsor level if specified
    let filteredLinks = links;
    if (args.sponsorLevel) {
      filteredLinks = links.filter(
        (link) => link.properties?.sponsorLevel === args.sponsorLevel
      );
    }

    // Get sponsor organizations
    const sponsors = [];
    for (const link of filteredLinks) {
      const sponsor = await ctx.db.get(link.toObjectId);
      if (sponsor && ("type" in sponsor) && sponsor.type === "crm_organization") {
        sponsors.push({
          ...sponsor,
          sponsorshipProperties: link.properties,
        });
      }
    }

    // Sort by displayOrder
    sponsors.sort((a, b) => {
      const orderA = a.sponsorshipProperties?.displayOrder ?? 999;
      const orderB = b.sponsorshipProperties?.displayOrder ?? 999;
      return orderA - orderB;
    });

    return sponsors;
  },
});

/**
 * UNLINK SPONSOR FROM EVENT
 * Remove a sponsor relationship from an event
 */
export const unlinkSponsorFromEvent = mutation({
  args: {
    sessionId: v.string(),
    eventId: v.id("objects"),
    crmOrganizationId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    // Find the sponsor link
    const links = await ctx.db
      .query("objectLinks")
      .withIndex("by_from_link_type", (q) =>
        q.eq("fromObjectId", args.eventId).eq("linkType", "sponsored_by")
      )
      .collect();

    const sponsorLink = links.find(
      (link) => link.toObjectId === args.crmOrganizationId
    );

    if (!sponsorLink) {
      throw new Error("Sponsor link not found");
    }

    await ctx.db.delete(sponsorLink._id);

    return { success: true };
  },
});

/**
 * UPDATE EVENT SPONSOR
 * Update sponsor level and other properties for an event sponsor
 * This also syncs the sponsor level to the CRM organization for consistency
 */
export const updateEventSponsor = mutation({
  args: {
    sessionId: v.string(),
    eventId: v.id("objects"),
    crmOrganizationId: v.id("objects"),
    sponsorLevel: v.optional(v.string()),
    displayOrder: v.optional(v.number()),
    logoUrl: v.optional(v.string()),
    websiteUrl: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    // Find the sponsor link
    const links = await ctx.db
      .query("objectLinks")
      .withIndex("by_from_link_type", (q) =>
        q.eq("fromObjectId", args.eventId).eq("linkType", "sponsored_by")
      )
      .collect();

    const sponsorLink = links.find(
      (link) => link.toObjectId === args.crmOrganizationId
    );

    if (!sponsorLink) {
      throw new Error("Sponsor link not found");
    }

    // Get the CRM organization
    const crmOrg = await ctx.db.get(args.crmOrganizationId);
    if (!crmOrg || !("type" in crmOrg) || crmOrg.type !== "crm_organization") {
      throw new Error("CRM organization not found");
    }

    // Update the sponsor link with new properties
    const updatedProperties = {
      ...sponsorLink.properties,
      ...(args.sponsorLevel && { sponsorLevel: args.sponsorLevel }),
      ...(args.displayOrder !== undefined && { displayOrder: args.displayOrder }),
      ...(args.logoUrl !== undefined && { logoUrl: args.logoUrl }),
      ...(args.websiteUrl !== undefined && { websiteUrl: args.websiteUrl }),
      ...(args.description !== undefined && { description: args.description }),
    };

    await ctx.db.patch(sponsorLink._id, {
      properties: updatedProperties,
    });

    // If sponsor level changed, update the CRM organization to stay consistent
    if (args.sponsorLevel) {
      await ctx.db.patch(args.crmOrganizationId, {
        customProperties: {
          ...crmOrg.customProperties,
          sponsorLevel: args.sponsorLevel,
        },
        updatedAt: Date.now(),
      });
    }

    return { success: true };
  },
});

/**
 * UPDATE EVENT AGENDA
 * Update the event's agenda/schedule
 */
export const updateEventAgenda = mutation({
  args: {
    sessionId: v.string(),
    eventId: v.id("objects"),
    agenda: v.array(
      v.object({
        time: v.string(), // "09:00 AM" or ISO timestamp
        title: v.string(),
        description: v.optional(v.string()),
        speaker: v.optional(v.string()),
        location: v.optional(v.string()), // Room/venue within event
        duration: v.optional(v.number()), // In minutes
      })
    ),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const event = await ctx.db.get(args.eventId);

    if (!event || !("type" in event) || event.type !== "event") {
      throw new Error("Event not found");
    }

    const currentProps = event.customProperties || {};

    await ctx.db.patch(args.eventId, {
      customProperties: {
        ...currentProps,
        agenda: args.agenda,
      },
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * GET EVENT INTERNAL
 * Internal query for use in actions - get event by ID
 */
export const getEventInternal = internalQuery({
  args: {
    eventId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.eventId);
  },
});
