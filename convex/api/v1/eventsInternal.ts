/**
 * INTERNAL EVENTS FUNCTIONS
 *
 * Internal queries and mutations used by the MCP server and API endpoints.
 * These bypass session authentication since API keys are used instead.
 *
 * Follows the same patterns as crmInternal.ts for consistency.
 */

import { internalQuery, internalMutation } from "../../_generated/server";
import { v } from "convex/values";
import { Id } from "../../_generated/dataModel";

/**
 * GET EVENTS INTERNAL
 * Returns events without requiring session authentication
 */
export const getEventsInternal = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    subtype: v.optional(v.string()),
    status: v.optional(v.string()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Query events
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

    if (args.startDate) {
      events = events.filter((e) => {
        const customProps = e.customProperties as Record<string, unknown> | undefined;
        return (customProps?.startDate as number | undefined) ?? 0 >= args.startDate!;
      });
    }

    if (args.endDate) {
      events = events.filter((e) => {
        const customProps = e.customProperties as Record<string, unknown> | undefined;
        return (customProps?.startDate as number | undefined) ?? 0 <= args.endDate!;
      });
    }

    // Transform for API response (remove internal fields)
    return events.map((event) => {
      const customProps = event.customProperties as Record<string, unknown> | undefined;
      return {
        id: event._id,
        name: event.name,
        description: event.description,
        subtype: event.subtype,
        status: event.status,
        startDate: customProps?.startDate as number | undefined,
        endDate: customProps?.endDate as number | undefined,
        location: customProps?.location as string | undefined,
        capacity: customProps?.maxCapacity as number | undefined,
        agenda: customProps?.agenda as string | undefined,
        metadata: customProps?.metadata as Record<string, unknown> | undefined,
      };
    });
  },
});

/**
 * GET EVENT BY SLUG INTERNAL
 * Returns a single event by slug without requiring session authentication
 */
export const getEventBySlugInternal = internalQuery({
  args: {
    slug: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    // Query events by organization and type
    const events = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "event")
      )
      .collect();

    // Find event with matching slug (slug is in customProperties)
    const event = events.find((e) => {
      const customProps = e.customProperties as Record<string, unknown> | undefined;
      return customProps?.slug === args.slug;
    });

    if (!event) {
      return null;
    }

    // Parse customProperties to get event-specific data
    const customProps = event.customProperties as Record<string, unknown> | undefined;
    const registration = customProps?.registration as Record<string, unknown> | undefined;
    const workflow = customProps?.workflow as Record<string, unknown> | undefined;

    // Return full event details matching the documentation format
    return {
      _id: event._id,
      organizationId: event.organizationId, // ✅ Added for frontend
      type: event.type,
      subtype: event.subtype,
      name: event.name,
      slug: customProps?.slug as string | undefined,
      description: event.description,
      eventDetails: customProps?.eventDetails as Record<string, unknown> | undefined,
      registration,
      registrationFormId: registration?.formId as string | undefined, // ✅ Added for frontend
      checkoutInstanceId: workflow?.checkoutInstanceId as string | undefined, // ✅ Added for frontend
      workflow,
      publishedAt: customProps?.publishedAt as string | undefined,
      status: event.status,
    };
  },
});

/**
 * GET EVENT BY ID INTERNAL
 * Returns a single event by ID without requiring session authentication
 */
export const getEventByIdInternal = internalQuery({
  args: {
    eventId: v.id("objects"),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    // Get event by ID
    const event = await ctx.db.get(args.eventId);

    if (!event) {
      return null;
    }

    // Verify event belongs to organization
    if (event.organizationId !== args.organizationId) {
      return null;
    }

    // Verify it's an event type
    if (event.type !== "event") {
      return null;
    }

    // Parse customProperties to get event-specific data
    const customProps = event.customProperties as Record<string, unknown> | undefined;
    const registration = customProps?.registration as Record<string, unknown> | undefined;
    const workflow = customProps?.workflow as Record<string, unknown> | undefined;

    // Return full event details matching the documentation format
    return {
      _id: event._id,
      organizationId: event.organizationId, // ✅ Added for frontend
      type: event.type,
      subtype: event.subtype,
      name: event.name,
      slug: customProps?.slug as string | undefined,
      description: event.description,
      eventDetails: customProps?.eventDetails as Record<string, unknown> | undefined,
      registration,
      registrationFormId: registration?.formId as string | undefined, // ✅ Added for frontend
      checkoutInstanceId: workflow?.checkoutInstanceId as string | undefined, // ✅ Added for frontend
      workflow,
      publishedAt: customProps?.publishedAt as string | undefined,
      status: event.status,
    };
  },
});

/**
 * GET EVENT PRODUCTS INTERNAL
 * Returns all products associated with a specific event
 */
export const getEventProductsInternal = internalQuery({
  args: {
    eventId: v.id("objects"),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    // First verify event exists and belongs to organization
    const event = await ctx.db.get(args.eventId);

    if (!event || event.organizationId !== args.organizationId || event.type !== "event") {
      return [];
    }

    // Query products associated with this event
    // Products have a relationship to events via customProperties.eventId
    const products = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "product")
      )
      .collect();

    // Filter products that are linked to this event
    const eventProducts = products.filter((product) => {
      const customProps = product.customProperties as Record<string, unknown> | undefined;
      return customProps?.eventId === args.eventId;
    });

    // Transform for API response - keep customProperties nested for frontend compatibility
    return eventProducts.map((product) => {
      const customProps = product.customProperties as Record<string, unknown> | undefined;
      return {
        id: product._id,
        name: product.name,
        description: product.description,
        status: product.status,
        customProperties: {
          price: customProps?.price as number | undefined,
          currency: customProps?.currency as string | undefined,
          category: customProps?.category as string | undefined,
          categoryLabel: customProps?.categoryLabel as string | undefined,
          addons: (customProps?.addons as Array<unknown> | undefined) || [],
          inventory: customProps?.inventory as Record<string, unknown> | undefined,
          metadata: customProps?.metadata as Record<string, unknown> | undefined,
          eventId: customProps?.eventId,
        },
      };
    });
  },
});

// ============================================================================
// EVENT MUTATION OPERATIONS (FOR MCP SERVER)
// ============================================================================

/**
 * CREATE EVENT INTERNAL
 *
 * Creates a new event without requiring session authentication.
 * Used by MCP server for AI-driven event creation.
 */
export const createEventInternal = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    subtype: v.string(), // "conference" | "workshop" | "concert" | "meetup" | "seminar"
    name: v.string(),
    description: v.optional(v.string()),
    startDate: v.number(), // Unix timestamp
    endDate: v.number(), // Unix timestamp
    location: v.string(),
    timezone: v.optional(v.string()),
    maxCapacity: v.optional(v.number()),
    customProperties: v.optional(v.record(v.string(), v.any())),
    performedBy: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    // Validate subtype
    const validSubtypes = ["conference", "workshop", "concert", "meetup", "seminar"];
    if (!validSubtypes.includes(args.subtype)) {
      throw new Error(
        `Invalid event subtype. Must be one of: ${validSubtypes.join(", ")}`
      );
    }

    // Validate dates
    if (args.endDate < args.startDate) {
      throw new Error("End date must be after start date");
    }

    // Generate slug from event name
    const slug = args.name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    // Build customProperties with event data
    const customProperties = {
      slug,
      startDate: args.startDate,
      endDate: args.endDate,
      location: args.location,
      timezone: args.timezone || "America/Los_Angeles",
      agenda: [],
      maxCapacity: args.maxCapacity || null,
      ...(args.customProperties || {}),
    };

    // Create event object
    const eventId = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "event",
      subtype: args.subtype,
      name: args.name,
      description: args.description,
      status: "draft",
      customProperties,
      createdBy: args.performedBy,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Log creation action
    if (args.performedBy) {
      await ctx.db.insert("objectActions", {
        organizationId: args.organizationId,
        objectId: eventId,
        actionType: "created",
        actionData: {
          source: "mcp",
          subtype: args.subtype,
        },
        performedBy: args.performedBy,
        performedAt: Date.now(),
      });
    }

    return {
      eventId,
      slug,
    };
  },
});

/**
 * UPDATE EVENT INTERNAL
 *
 * Updates an existing event without requiring session authentication.
 * Used by MCP server for AI-driven event updates.
 */
export const updateEventInternal = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    eventId: v.string(),
    updates: v.object({
      name: v.optional(v.string()),
      description: v.optional(v.string()),
      subtype: v.optional(v.string()),
      status: v.optional(v.string()), // "draft" | "published" | "in_progress" | "completed" | "cancelled"
      startDate: v.optional(v.number()),
      endDate: v.optional(v.number()),
      location: v.optional(v.string()),
      timezone: v.optional(v.string()),
      maxCapacity: v.optional(v.number()),
      customProperties: v.optional(v.record(v.string(), v.any())),
    }),
    performedBy: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    // 1. Get event
    const event = await ctx.db.get(args.eventId as Id<"objects">);

    if (!event) {
      throw new Error("Event not found");
    }

    // 2. Verify organization access
    if (event.organizationId !== args.organizationId) {
      throw new Error("Event not found");
    }

    // 3. Verify it's an event
    if (event.type !== "event") {
      throw new Error("Event not found");
    }

    // 4. Validate subtype if provided
    if (args.updates.subtype !== undefined) {
      const validSubtypes = ["conference", "workshop", "concert", "meetup", "seminar"];
      if (!validSubtypes.includes(args.updates.subtype)) {
        throw new Error(
          `Invalid event subtype. Must be one of: ${validSubtypes.join(", ")}`
        );
      }
    }

    // 5. Validate status if provided
    if (args.updates.status !== undefined) {
      const validStatuses = ["draft", "published", "in_progress", "completed", "cancelled"];
      if (!validStatuses.includes(args.updates.status)) {
        throw new Error(
          `Invalid status. Must be one of: ${validStatuses.join(", ")}`
        );
      }
    }

    // 6. Build update object
    const dbUpdates: Record<string, unknown> = {
      updatedAt: Date.now(),
    };

    // Update top-level fields
    if (args.updates.name !== undefined) dbUpdates.name = args.updates.name;
    if (args.updates.description !== undefined) dbUpdates.description = args.updates.description;
    if (args.updates.subtype !== undefined) dbUpdates.subtype = args.updates.subtype;
    if (args.updates.status !== undefined) dbUpdates.status = args.updates.status;

    // 7. Update customProperties
    const currentProps = (event.customProperties || {}) as Record<string, unknown>;
    const updatedProps: Record<string, unknown> = { ...currentProps };

    // Regenerate slug if name changed
    if (args.updates.name !== undefined) {
      updatedProps.slug = args.updates.name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
    }

    if (args.updates.startDate !== undefined) updatedProps.startDate = args.updates.startDate;
    if (args.updates.endDate !== undefined) updatedProps.endDate = args.updates.endDate;
    if (args.updates.location !== undefined) updatedProps.location = args.updates.location;
    if (args.updates.timezone !== undefined) updatedProps.timezone = args.updates.timezone;
    if (args.updates.maxCapacity !== undefined) updatedProps.maxCapacity = args.updates.maxCapacity;

    // Merge additional customProperties
    if (args.updates.customProperties) {
      Object.assign(updatedProps, args.updates.customProperties);
    }

    // Validate dates
    const newStartDate = args.updates.startDate ?? currentProps.startDate;
    const newEndDate = args.updates.endDate ?? currentProps.endDate;
    if (typeof newStartDate === "number" && typeof newEndDate === "number" && newEndDate < newStartDate) {
      throw new Error("End date must be after start date");
    }

    dbUpdates.customProperties = updatedProps;

    // 8. Apply updates
    await ctx.db.patch(event._id, dbUpdates);

    // 9. Log update action
    if (args.performedBy) {
      await ctx.db.insert("objectActions", {
        organizationId: args.organizationId,
        objectId: event._id,
        actionType: "updated_via_mcp",
        actionData: {
          source: "mcp",
          fieldsUpdated: Object.keys(args.updates).filter(
            (k) => args.updates[k as keyof typeof args.updates] !== undefined
          ),
        },
        performedBy: args.performedBy,
        performedAt: Date.now(),
      });
    }

    return { success: true, eventId: event._id };
  },
});

/**
 * DELETE EVENT INTERNAL
 *
 * Permanently deletes an event and all associated links.
 * Used by MCP server for AI-driven event deletion.
 */
export const deleteEventInternal = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    eventId: v.string(),
    performedBy: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    // 1. Get event
    const event = await ctx.db.get(args.eventId as Id<"objects">);

    if (!event) {
      throw new Error("Event not found");
    }

    // 2. Verify organization access
    if (event.organizationId !== args.organizationId) {
      throw new Error("Event not found");
    }

    // 3. Verify it's an event
    if (event.type !== "event") {
      throw new Error("Event not found");
    }

    // 4. Log deletion action BEFORE deleting (so we have the data)
    if (args.performedBy) {
      await ctx.db.insert("objectActions", {
        organizationId: args.organizationId,
        objectId: event._id,
        actionType: "deleted_via_mcp",
        actionData: {
          eventName: event.name,
          eventType: event.subtype,
          source: "mcp",
        },
        performedBy: args.performedBy,
        performedAt: Date.now(),
      });
    }

    // 5. Delete all links involving this event
    const linksFrom = await ctx.db
      .query("objectLinks")
      .withIndex("by_from_object", (q) => q.eq("fromObjectId", event._id))
      .collect();

    const linksTo = await ctx.db
      .query("objectLinks")
      .withIndex("by_to_object", (q) => q.eq("toObjectId", event._id))
      .collect();

    for (const link of [...linksFrom, ...linksTo]) {
      await ctx.db.delete(link._id);
    }

    // 6. Permanently delete the event
    await ctx.db.delete(event._id);

    return { success: true };
  },
});

/**
 * CANCEL EVENT INTERNAL
 *
 * Soft delete - sets event status to "cancelled".
 * Used by MCP server for AI-driven event cancellation.
 */
export const cancelEventInternal = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    eventId: v.string(),
    performedBy: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    // 1. Get event
    const event = await ctx.db.get(args.eventId as Id<"objects">);

    if (!event) {
      throw new Error("Event not found");
    }

    // 2. Verify organization access
    if (event.organizationId !== args.organizationId) {
      throw new Error("Event not found");
    }

    // 3. Verify it's an event
    if (event.type !== "event") {
      throw new Error("Event not found");
    }

    // 4. Update status to cancelled
    await ctx.db.patch(event._id, {
      status: "cancelled",
      updatedAt: Date.now(),
    });

    // 5. Log cancellation action
    if (args.performedBy) {
      await ctx.db.insert("objectActions", {
        organizationId: args.organizationId,
        objectId: event._id,
        actionType: "cancelled_via_mcp",
        actionData: {
          eventName: event.name,
          source: "mcp",
        },
        performedBy: args.performedBy,
        performedAt: Date.now(),
      });
    }

    return { success: true };
  },
});

/**
 * PUBLISH EVENT INTERNAL
 *
 * Sets event status to "published" (make it public).
 * Used by MCP server for AI-driven event publishing.
 */
export const publishEventInternal = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    eventId: v.string(),
    performedBy: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    // 1. Get event
    const event = await ctx.db.get(args.eventId as Id<"objects">);

    if (!event) {
      throw new Error("Event not found");
    }

    // 2. Verify organization access
    if (event.organizationId !== args.organizationId) {
      throw new Error("Event not found");
    }

    // 3. Verify it's an event
    if (event.type !== "event") {
      throw new Error("Event not found");
    }

    // 4. Update status to published
    const currentProps = (event.customProperties || {}) as Record<string, unknown>;
    await ctx.db.patch(event._id, {
      status: "published",
      customProperties: {
        ...currentProps,
        publishedAt: Date.now(),
      },
      updatedAt: Date.now(),
    });

    // 5. Log publish action
    if (args.performedBy) {
      await ctx.db.insert("objectActions", {
        organizationId: args.organizationId,
        objectId: event._id,
        actionType: "published_via_mcp",
        actionData: {
          eventName: event.name,
          source: "mcp",
        },
        performedBy: args.performedBy,
        performedAt: Date.now(),
      });
    }

    return { success: true };
  },
});

/**
 * LIST EVENTS INTERNAL
 *
 * Lists events with filtering and pagination.
 * Used by MCP server for AI-driven event listing.
 */
export const listEventsInternal = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    subtype: v.optional(v.string()),
    status: v.optional(v.string()),
    startDateAfter: v.optional(v.number()),
    startDateBefore: v.optional(v.number()),
    limit: v.number(),
    offset: v.number(),
  },
  handler: async (ctx, args) => {
    // 1. Query all events for organization
    const query = ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "event")
      );

    const allEvents = await query.collect();

    // 2. Apply filters
    let filteredEvents = allEvents;

    if (args.subtype) {
      filteredEvents = filteredEvents.filter((e) => e.subtype === args.subtype);
    }

    if (args.status) {
      filteredEvents = filteredEvents.filter((e) => e.status === args.status);
    }

    if (args.startDateAfter) {
      filteredEvents = filteredEvents.filter((e) => {
        const customProps = e.customProperties as Record<string, unknown> | undefined;
        const startDate = customProps?.startDate as number | undefined;
        return startDate !== undefined && startDate >= args.startDateAfter!;
      });
    }

    if (args.startDateBefore) {
      filteredEvents = filteredEvents.filter((e) => {
        const customProps = e.customProperties as Record<string, unknown> | undefined;
        const startDate = customProps?.startDate as number | undefined;
        return startDate !== undefined && startDate <= args.startDateBefore!;
      });
    }

    // 3. Sort by start date (nearest first)
    filteredEvents.sort((a, b) => {
      const aProps = a.customProperties as Record<string, unknown> | undefined;
      const bProps = b.customProperties as Record<string, unknown> | undefined;
      const aStart = (aProps?.startDate as number) || 0;
      const bStart = (bProps?.startDate as number) || 0;
      return aStart - bStart;
    });

    // 4. Apply pagination
    const total = filteredEvents.length;
    const paginatedEvents = filteredEvents.slice(args.offset, args.offset + args.limit);

    // 5. Format response
    const events = paginatedEvents.map((event) => {
      const customProps = event.customProperties as Record<string, unknown> | undefined;
      return {
        id: event._id,
        organizationId: event.organizationId,
        name: event.name,
        description: event.description,
        subtype: event.subtype,
        status: event.status,
        slug: customProps?.slug as string | undefined,
        startDate: customProps?.startDate as number | undefined,
        endDate: customProps?.endDate as number | undefined,
        location: customProps?.location as string | undefined,
        timezone: customProps?.timezone as string | undefined,
        maxCapacity: customProps?.maxCapacity as number | undefined,
        createdAt: event.createdAt,
        updatedAt: event.updatedAt,
      };
    });

    return {
      events,
      total,
      limit: args.limit,
      offset: args.offset,
    };
  },
});

/**
 * REGISTER ATTENDEE INTERNAL
 *
 * Registers a contact as an attendee for an event.
 * Creates a link between the contact and the event.
 * Used by MCP server for AI-driven attendee registration.
 */
export const registerAttendeeInternal = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    eventId: v.string(),
    contactId: v.string(),
    ticketType: v.optional(v.string()), // "general", "vip", "speaker", etc.
    registrationData: v.optional(v.record(v.string(), v.any())),
    performedBy: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    // 1. Verify event exists
    const event = await ctx.db.get(args.eventId as Id<"objects">);
    if (!event || event.type !== "event") {
      throw new Error("Event not found");
    }

    if (event.organizationId !== args.organizationId) {
      throw new Error("Event not found");
    }

    // 2. Verify contact exists
    const contact = await ctx.db.get(args.contactId as Id<"objects">);
    if (!contact || contact.type !== "crm_contact") {
      throw new Error("Contact not found");
    }

    if (contact.organizationId !== args.organizationId) {
      throw new Error("Contact not found");
    }

    // 3. Check if already registered
    const existingLinks = await ctx.db
      .query("objectLinks")
      .withIndex("by_from_object", (q) => q.eq("fromObjectId", contact._id))
      .collect();

    const existingRegistration = existingLinks.find(
      (link) => link.toObjectId === event._id && link.linkType === "registered_for"
    );

    if (existingRegistration) {
      throw new Error("Contact is already registered for this event");
    }

    // 4. Create registration link
    const linkId = await ctx.db.insert("objectLinks", {
      organizationId: args.organizationId,
      fromObjectId: contact._id,
      toObjectId: event._id,
      linkType: "registered_for",
      properties: {
        ticketType: args.ticketType || "general",
        registeredAt: Date.now(),
        registrationData: args.registrationData || {},
        source: "mcp",
      },
      createdBy: args.performedBy,
      createdAt: Date.now(),
    });

    // 5. Log registration action
    if (args.performedBy) {
      await ctx.db.insert("objectActions", {
        organizationId: args.organizationId,
        objectId: event._id,
        actionType: "attendee_registered_via_mcp",
        actionData: {
          contactId: contact._id,
          contactName: contact.name,
          ticketType: args.ticketType || "general",
          source: "mcp",
        },
        performedBy: args.performedBy,
        performedAt: Date.now(),
      });
    }

    return {
      success: true,
      linkId,
      eventId: event._id,
      contactId: contact._id,
    };
  },
});

/**
 * GET EVENT ATTENDEES INTERNAL
 *
 * Gets all attendees registered for an event.
 * Used by MCP server for AI-driven attendee listing.
 */
export const getEventAttendeesInternal = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    eventId: v.string(),
    ticketType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // 1. Verify event exists
    const event = await ctx.db.get(args.eventId as Id<"objects">);
    if (!event || event.type !== "event") {
      return { attendees: [], total: 0 };
    }

    if (event.organizationId !== args.organizationId) {
      return { attendees: [], total: 0 };
    }

    // 2. Get all registration links for this event
    const links = await ctx.db
      .query("objectLinks")
      .withIndex("by_to_link_type", (q) =>
        q.eq("toObjectId", event._id).eq("linkType", "registered_for")
      )
      .collect();

    // 3. Filter by ticket type if specified
    let filteredLinks = links;
    if (args.ticketType) {
      filteredLinks = links.filter(
        (link) => link.properties?.ticketType === args.ticketType
      );
    }

    // 4. Get attendee details
    const attendees = [];
    for (const link of filteredLinks) {
      const contact = await ctx.db.get(link.fromObjectId);
      if (contact && contact.type === "crm_contact") {
        const customProps = contact.customProperties as Record<string, unknown> | undefined;
        attendees.push({
          id: contact._id,
          name: contact.name,
          email: customProps?.email as string | undefined,
          phone: customProps?.phone as string | undefined,
          company: customProps?.company as string | undefined,
          ticketType: link.properties?.ticketType as string | undefined,
          registeredAt: link.properties?.registeredAt as number | undefined,
          registrationData: link.properties?.registrationData as Record<string, unknown> | undefined,
        });
      }
    }

    return {
      attendees,
      total: attendees.length,
    };
  },
});
