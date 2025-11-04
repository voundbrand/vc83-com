/**
 * INTERNAL EVENTS QUERIES
 *
 * Internal queries used by the API endpoints.
 * These bypass the session authentication since API keys are used instead.
 */

import { internalQuery } from "../../_generated/server";
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
        const customProps = e.customProperties as any;
        return customProps.startDate >= args.startDate!;
      });
    }

    if (args.endDate) {
      events = events.filter((e) => {
        const customProps = e.customProperties as any;
        return customProps.startDate <= args.endDate!;
      });
    }

    // Transform for API response (remove internal fields)
    return events.map((event) => ({
      id: event._id,
      name: event.name,
      description: event.description,
      subtype: event.subtype,
      status: event.status,
      startDate: (event.customProperties as any).startDate,
      endDate: (event.customProperties as any).endDate,
      location: (event.customProperties as any).location,
      capacity: (event.customProperties as any).capacity,
      agenda: (event.customProperties as any).agenda,
      metadata: (event.customProperties as any).metadata,
    }));
  },
});
