/**
 * INTERNAL EVENTS QUERIES
 *
 * Internal queries used by the API endpoints.
 * These bypass the session authentication since API keys are used instead.
 */

import { internalQuery } from "../../_generated/server";
import { v } from "convex/values";

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
        capacity: customProps?.capacity as number | undefined,
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

    // Return full event details matching the documentation format
    return {
      _id: event._id,
      type: event.type,
      subtype: event.subtype,
      name: event.name,
      slug: customProps?.slug as string | undefined,
      description: event.description,
      eventDetails: customProps?.eventDetails as Record<string, unknown> | undefined,
      registration: customProps?.registration as Record<string, unknown> | undefined,
      workflow: customProps?.workflow as Record<string, unknown> | undefined,
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

    // Return full event details matching the documentation format
    return {
      _id: event._id,
      type: event.type,
      subtype: event.subtype,
      name: event.name,
      slug: customProps?.slug as string | undefined,
      description: event.description,
      eventDetails: customProps?.eventDetails as Record<string, unknown> | undefined,
      registration: customProps?.registration as Record<string, unknown> | undefined,
      workflow: customProps?.workflow as Record<string, unknown> | undefined,
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
