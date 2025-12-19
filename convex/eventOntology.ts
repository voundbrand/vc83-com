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
import { Id } from "./_generated/dataModel";
import { requireAuthenticatedUser } from "./rbacHelpers";
import { checkResourceLimit, checkFeatureAccess } from "./licensing/helpers";

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

    // CHECK LICENSE LIMIT: Enforce event limit for organization's tier
    // Free: 3, Starter: 20, Pro: 100, Agency: Unlimited, Enterprise: Unlimited
    await checkResourceLimit(ctx, args.organizationId, "event", "maxEvents");

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
      .replace(/[^a-z0-9]+/g, "-") // Replace non-alphanumeric with dashes
      .replace(/^-+|-+$/g, ""); // Remove leading/trailing dashes

    // Build customProperties with event data
    const customProperties = {
      slug, // Add slug for URL-friendly event access
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
    subtype: v.optional(v.string()), // Allow updating event type
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

    // If name is being updated, regenerate slug
    let newSlug: string | undefined;
    if (args.name !== undefined) {
      updates.name = args.name;
      newSlug = args.name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-") // Replace non-alphanumeric with dashes
        .replace(/^-+|-+$/g, ""); // Remove leading/trailing dashes
    }
    if (args.description !== undefined) updates.description = args.description;
    if (args.subtype !== undefined) {
      const validSubtypes = ["conference", "workshop", "concert", "meetup", "seminar"];
      if (!validSubtypes.includes(args.subtype)) {
        throw new Error(
          `Invalid event subtype. Must be one of: ${validSubtypes.join(", ")}`
        );
      }
      updates.subtype = args.subtype;
    }
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
    if (args.startDate !== undefined || args.endDate !== undefined || args.location !== undefined || args.customProperties || newSlug) {
      const currentProps = event.customProperties || {};

      // Validate date changes
      const newStartDate = args.startDate ?? currentProps.startDate;
      const newEndDate = args.endDate ?? currentProps.endDate;
      if (newEndDate < newStartDate) {
        throw new Error("End date must be after start date");
      }

      updates.customProperties = {
        ...currentProps,
        ...(newSlug && { slug: newSlug }), // Update slug if name changed
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
 * CANCEL EVENT
 * Soft delete an event (set status to cancelled)
 * Renamed from deleteEvent for clarity
 */
export const cancelEvent = mutation({
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
 * DELETE EVENT
 * Permanently delete an event (hard delete)
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

    // Delete the event permanently
    await ctx.db.delete(args.eventId);

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

    // CHECK LICENSE LIMIT: Enforce sponsor limit per event
    const { checkNestedResourceLimit } = await import("./licensing/helpers");
    await checkNestedResourceLimit(
      ctx,
      event.organizationId,
      args.eventId,
      "sponsored_by",
      "maxSponsorsPerEvent"
    );

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

/**
 * LINK MEDIA TO EVENT
 * Store media IDs in event's customProperties instead of using objectLinks
 * (since objectLinks only works between objects table items)
 */
export const linkMediaToEvent = mutation({
  args: {
    sessionId: v.string(),
    eventId: v.id("objects"),
    mediaId: v.id("organizationMedia"),
    isPrimary: v.optional(v.boolean()),
    displayOrder: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    // Validate event exists
    const event = await ctx.db.get(args.eventId);
    if (!event || !("type" in event) || event.type !== "event") {
      throw new Error("Event not found");
    }

    // CHECK FEATURE ACCESS: Media gallery requires Starter+
    const { checkFeatureAccess } = await import("./licensing/helpers");
    await checkFeatureAccess(ctx, event.organizationId, "mediaGalleryEnabled");

    // Validate media exists
    const media = await ctx.db.get(args.mediaId);
    if (!media) {
      throw new Error("Media not found");
    }

    const currentProps = event.customProperties || {};
    const currentMediaLinks = (currentProps.mediaLinks as Array<{
      mediaId: string;
      isPrimary: boolean;
      displayOrder: number;
    }>) || [];

    // Check if media is already linked
    const existingIndex = currentMediaLinks.findIndex(
      (link) => link.mediaId === args.mediaId
    );

    if (existingIndex !== -1) {
      // Update existing link
      currentMediaLinks[existingIndex] = {
        mediaId: args.mediaId,
        isPrimary: args.isPrimary ?? currentMediaLinks[existingIndex].isPrimary,
        displayOrder: args.displayOrder ?? currentMediaLinks[existingIndex].displayOrder,
      };
    } else {
      // Add new link
      currentMediaLinks.push({
        mediaId: args.mediaId,
        isPrimary: args.isPrimary ?? false,
        displayOrder: args.displayOrder ?? currentMediaLinks.length,
      });
    }

    // If this is marked as primary, un-primary all others
    if (args.isPrimary) {
      currentMediaLinks.forEach((link) => {
        if (link.mediaId !== args.mediaId) {
          link.isPrimary = false;
        }
      });
    }

    await ctx.db.patch(args.eventId, {
      customProperties: {
        ...currentProps,
        mediaLinks: currentMediaLinks,
      },
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * UNLINK MEDIA FROM EVENT
 * Remove media link from event's customProperties
 */
export const unlinkMediaFromEvent = mutation({
  args: {
    sessionId: v.string(),
    eventId: v.id("objects"),
    mediaId: v.id("organizationMedia"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const event = await ctx.db.get(args.eventId);
    if (!event || !("type" in event) || event.type !== "event") {
      throw new Error("Event not found");
    }

    const currentProps = event.customProperties || {};
    const currentMediaLinks = (currentProps.mediaLinks as Array<{
      mediaId: string;
      isPrimary: boolean;
      displayOrder: number;
    }>) || [];

    // Filter out the media link
    const updatedMediaLinks = currentMediaLinks.filter(
      (link) => link.mediaId !== args.mediaId
    );

    await ctx.db.patch(args.eventId, {
      customProperties: {
        ...currentProps,
        mediaLinks: updatedMediaLinks,
      },
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * GET EVENT MEDIA
 * Get all media linked to an event from customProperties
 */
export const getEventMedia = query({
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

    const currentProps = event.customProperties || {};
    const mediaLinks = (currentProps.mediaLinks as Array<{
      mediaId: string;
      isPrimary: boolean;
      displayOrder: number;
    }>) || [];

    // Get media objects with their URLs
    const mediaItems = [];
    for (const link of mediaLinks) {
      const media = await ctx.db.get(link.mediaId as Id<"organizationMedia">);
      if (media && "_id" in media && "_creationTime" in media) {
        // Type guard to ensure we have an organizationMedia document
        const url = await ctx.storage.getUrl(media.storageId as Id<"_storage">);
        mediaItems.push({
          _id: media._id,
          organizationId: media.organizationId,
          uploadedBy: media.uploadedBy,
          storageId: media.storageId,
          filename: media.filename,
          mimeType: media.mimeType,
          sizeBytes: media.sizeBytes,
          width: media.width,
          height: media.height,
          category: media.category,
          tags: media.tags,
          description: media.description,
          usageCount: media.usageCount,
          lastUsedAt: media.lastUsedAt,
          createdAt: media.createdAt,
          updatedAt: media.updatedAt,
          url,
          isPrimary: link.isPrimary,
          displayOrder: link.displayOrder,
        });
      }
    }

    // Sort by displayOrder, with primary first
    mediaItems.sort((a, b) => {
      if (a.isPrimary && !b.isPrimary) return -1;
      if (!a.isPrimary && b.isPrimary) return 1;
      return a.displayOrder - b.displayOrder;
    });

    return mediaItems;
  },
});

/**
 * UPDATE EVENT DETAILED DESCRIPTION
 * Update the event's rich HTML description
 */
export const updateEventDetailedDescription = mutation({
  args: {
    sessionId: v.string(),
    eventId: v.id("objects"),
    detailedDescription: v.string(),
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
        detailedDescription: args.detailedDescription,
      },
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * UPDATE EVENT LOCATION WITH VALIDATION
 * Updates event location and stores validated address data from Radar
 */
export const updateEventLocationWithValidation = mutation({
  args: {
    sessionId: v.string(),
    eventId: v.id("objects"),
    location: v.string(),
    formattedAddress: v.optional(v.string()),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    directionsUrl: v.optional(v.string()),
    googleMapsUrl: v.optional(v.string()),
    confidence: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const event = await ctx.db.get(args.eventId);

    if (!event || !("type" in event) || event.type !== "event") {
      throw new Error("Event not found");
    }

    const currentProps = event.customProperties || {};

    // Store validated address information
    const locationData: Record<string, unknown> = {
      location: args.location,
    };

    if (args.formattedAddress) {
      locationData.formattedAddress = args.formattedAddress;
      locationData.latitude = args.latitude;
      locationData.longitude = args.longitude;
      locationData.directionsUrl = args.directionsUrl;
      locationData.googleMapsUrl = args.googleMapsUrl;
      locationData.addressConfidence = args.confidence;
      locationData.addressValidatedAt = Date.now();
    }

    await ctx.db.patch(args.eventId, {
      customProperties: {
        ...currentProps,
        ...locationData,
      },
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * UPDATE EVENT MEDIA
 * Update the event's media collection (images and videos)
 */
export const updateEventMedia = mutation({
  args: {
    sessionId: v.string(),
    eventId: v.id("objects"),
    media: v.object({
      items: v.array(v.object({
        id: v.string(),
        type: v.union(v.literal('image'), v.literal('video')),
        // Image fields
        storageId: v.optional(v.string()),
        filename: v.optional(v.string()),
        mimeType: v.optional(v.string()),
        focusPoint: v.optional(v.object({
          x: v.number(),
          y: v.number(),
        })),
        // Video fields
        videoUrl: v.optional(v.string()),
        videoProvider: v.optional(v.union(
          v.literal('youtube'),
          v.literal('vimeo'),
          v.literal('other')
        )),
        loop: v.optional(v.boolean()),
        autostart: v.optional(v.boolean()),
        thumbnailStorageId: v.optional(v.string()),
        // Common fields
        caption: v.optional(v.string()),
        order: v.number(),
      })),
      primaryImageId: v.optional(v.string()),
      showVideoFirst: v.optional(v.boolean()),
      enableAnalytics: v.optional(v.boolean()), // ⚡ Professional+ feature: track media views/clicks
    }),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const event = await ctx.db.get(args.eventId);

    if (!event || !("type" in event) || event.type !== "event") {
      throw new Error("Event not found");
    }

    // CHECK FEATURE ACCESS: Media gallery requires Starter+
    await checkFeatureAccess(ctx, event.organizationId, "mediaGalleryEnabled");

    // ⚡ PROFESSIONAL TIER: Event Analytics
    // Professional+ can enable analytics tracking on event media (views, interactions)
    if (args.media.enableAnalytics) {
      await checkFeatureAccess(ctx, event.organizationId, "eventAnalyticsEnabled");
    }

    const currentProps = event.customProperties || {};

    await ctx.db.patch(args.eventId, {
      customProperties: {
        ...currentProps,
        media: args.media,
      },
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * GET EVENT ATTENDEES
 * Fetch all attendees (ticket holders) for an event
 * Returns tickets that are linked to this event via productId
 */
export const getEventAttendees = query({
  args: {
    eventId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    // Get the event to verify it exists and get organizationId
    const event = await ctx.db.get(args.eventId);

    if (!event || !("type" in event) || event.type !== "event") {
      throw new Error("Event not found");
    }

    // Find products linked to this event via objectLinks
    const productLinks = await ctx.db
      .query("objectLinks")
      .withIndex("by_from_object", (q) => q.eq("fromObjectId", args.eventId))
      .filter((q) => q.eq(q.field("linkType"), "offers"))
      .collect();

    const productIds = productLinks.map(link => link.toObjectId);

    if (productIds.length === 0) {
      return [];
    }

    // Find all ticket instances for this event
    // Ticket instances have type="ticket" (NOT type="product")
    const allTickets = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", event.organizationId).eq("type", "ticket")
      )
      .collect();

    // Filter for tickets that match the product IDs and are not cancelled
    const tickets = allTickets.filter(ticket => {
      const props = ticket.customProperties || {};
      const ticketProductId = props.productId as string | undefined;
      const ticketStatus = ticket.status;

      // Check if this ticket is for one of the event's products
      // and is not cancelled
      return ticketProductId &&
             productIds.some(id => id === ticketProductId) &&
             ticketStatus !== "cancelled";
    });

    // Map to attendee format
    return tickets.map(ticket => {
      const props = ticket.customProperties || {};
      return {
        _id: ticket._id,
        holderName: props.holderName as string || "Unknown",
        holderEmail: props.holderEmail as string || "",
        holderPhone: props.holderPhone as string || "",
        ticketNumber: props.ticketNumber as string || "",
        ticketType: ticket.subtype || "standard",
        status: ticket.status || "issued",
        purchaseDate: props.purchaseDate as number || ticket.createdAt,
        pricePaid: props.pricePaid as number || 0,
        formResponses: props.formResponses as Record<string, unknown> || {},
      };
    });
  },
});
