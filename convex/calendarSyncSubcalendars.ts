/**
 * Google Calendar Sub-Calendar Management
 *
 * Handles fetching, storing, and managing individual sub-calendars
 * within a Google Calendar connection. Each sub-calendar can be
 * independently toggled as a "blocker" for conflict checking,
 * and a specific sub-calendar can be selected for outbound booking pushes.
 */

import {
  action,
  mutation,
  query,
  internalAction,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get sub-calendars for a Google OAuth connection.
 * Returns the cached list of sub-calendars stored on the connection.
 */
export const getSubCalendars = query({
  args: {
    sessionId: v.string(),
    connectionId: v.id("oauthConnections"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId as Id<"sessions">);
    if (!session || session.expiresAt < Date.now()) return [];

    const connection = await ctx.db.get(args.connectionId);
    if (!connection) return [];

    const cp = (connection.customProperties || {}) as Record<string, unknown>;
    return (cp.subCalendars || []) as Array<{
      calendarId: string;
      summary: string;
      backgroundColor: string;
      accessRole: string;
      primary: boolean;
      lastFetchedAt: number;
    }>;
  },
});

/**
 * Get calendar link settings for a connection + resource pair.
 * Returns which sub-calendars are blocking and which is the push target.
 */
export const getCalendarLinkSettings = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    connectionId: v.id("oauthConnections"),
    resourceId: v.optional(v.id("objects")),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId as Id<"sessions">);
    if (!session || session.expiresAt < Date.now()) return null;

    const links = await ctx.db
      .query("objectLinks")
      .withIndex("by_org_link_type", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("linkType", "calendar_linked_to")
      )
      .collect();

    const link = links.find((l) => {
      const cp = (l.properties || {}) as Record<string, unknown>;
      if (cp.connectionId !== args.connectionId) return false;
      if (args.resourceId && l.toObjectId !== args.resourceId) return false;
      return true;
    });

    if (!link) {
      return {
        blockingCalendarIds: [] as string[],
        pushCalendarId: null as string | null,
      };
    }

    const cp = (link.properties || {}) as Record<string, unknown>;
    return {
      blockingCalendarIds: (cp.blockingCalendarIds || []) as string[],
      pushCalendarId: (cp.pushCalendarId as string) || null,
    };
  },
});

// ============================================================================
// INTERNAL QUERIES
// ============================================================================

/**
 * Aggregate all blocking calendar IDs across all resources for a connection.
 * Used by syncFromGoogle to know which sub-calendars to pull events from.
 */
export const getBlockingCalendarIdsForConnection = internalQuery({
  args: { connectionId: v.id("oauthConnections") },
  handler: async (ctx, args) => {
    const connection = await ctx.db.get(args.connectionId);
    if (!connection) return [];

    const links = await ctx.db
      .query("objectLinks")
      .withIndex("by_org_link_type", (q) =>
        q
          .eq("organizationId", connection.organizationId)
          .eq("linkType", "calendar_linked_to")
      )
      .collect();

    const calendarIds = new Set<string>();
    for (const link of links) {
      const cp = (link.properties || {}) as Record<string, unknown>;
      if (cp.connectionId !== args.connectionId) continue;
      const blocking = (cp.blockingCalendarIds || []) as string[];
      for (const id of blocking) calendarIds.add(id);
    }

    return Array.from(calendarIds);
  },
});

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Update which sub-calendars block bookings and/or the push target calendar
 * for a given connection + resource pair.
 */
export const updateCalendarLinkSettings = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    connectionId: v.id("oauthConnections"),
    resourceId: v.optional(v.id("objects")),
    blockingCalendarIds: v.optional(v.array(v.string())),
    pushCalendarId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId as Id<"sessions">);
    if (!session || session.expiresAt < Date.now())
      throw new Error("Invalid session");

    // If no resourceId provided, find or create an org-level sentinel object
    let resourceId = args.resourceId;
    if (!resourceId) {
      const existing = await ctx.db
        .query("objects")
        .withIndex("by_type", (q) => q.eq("type", "calendar_settings"))
        .filter((q) => q.eq(q.field("organizationId"), args.organizationId))
        .first();

      if (existing) {
        resourceId = existing._id;
      } else {
        resourceId = await ctx.db.insert("objects", {
          type: "calendar_settings",
          subtype: "org_default",
          name: "Calendar Settings",
          organizationId: args.organizationId,
          status: "active",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }
    }

    const links = await ctx.db
      .query("objectLinks")
      .withIndex("by_org_link_type", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("linkType", "calendar_linked_to")
      )
      .collect();

    const link = links.find((l) => {
      const cp = (l.properties || {}) as Record<string, unknown>;
      return (
        cp.connectionId === args.connectionId &&
        l.toObjectId === resourceId
      );
    });

    if (link) {
      const existingProps = (link.properties || {}) as Record<string, unknown>;
      await ctx.db.patch(link._id, {
        properties: {
          ...existingProps,
          ...(args.blockingCalendarIds !== undefined
            ? { blockingCalendarIds: args.blockingCalendarIds }
            : {}),
          ...(args.pushCalendarId !== undefined
            ? { pushCalendarId: args.pushCalendarId }
            : {}),
        },
      });
    } else {
      // Create new link if none exists
      await ctx.db.insert("objectLinks", {
        linkType: "calendar_linked_to",
        fromObjectId: resourceId,
        toObjectId: resourceId,
        organizationId: args.organizationId,
        properties: {
          connectionId: args.connectionId,
          blockingCalendarIds: args.blockingCalendarIds || [],
          pushCalendarId: args.pushCalendarId || null,
        },
        createdAt: Date.now(),
      });
    }

    return { success: true };
  },
});

// ============================================================================
// INTERNAL MUTATIONS
// ============================================================================

/**
 * Store fetched sub-calendar list on the OAuth connection.
 */
export const storeSubCalendars = internalMutation({
  args: {
    connectionId: v.id("oauthConnections"),
    subCalendars: v.array(
      v.object({
        calendarId: v.string(),
        summary: v.string(),
        backgroundColor: v.string(),
        accessRole: v.string(),
        primary: v.boolean(),
        lastFetchedAt: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const connection = await ctx.db.get(args.connectionId);
    if (!connection) return;

    const existing = (connection.customProperties || {}) as Record<
      string,
      unknown
    >;
    await ctx.db.patch(args.connectionId, {
      customProperties: {
        ...existing,
        subCalendars: args.subCalendars,
      },
      updatedAt: Date.now(),
    });
  },
});

/**
 * Store the auto-created bookings calendar ID on the connection.
 */
export const storeBookingsCalendarId = internalMutation({
  args: {
    connectionId: v.id("oauthConnections"),
    calendarId: v.string(),
  },
  handler: async (ctx, args) => {
    const connection = await ctx.db.get(args.connectionId);
    if (!connection) return;

    const existing = (connection.customProperties || {}) as Record<
      string,
      unknown
    >;
    await ctx.db.patch(args.connectionId, {
      customProperties: {
        ...existing,
        bookingsCalendarId: args.calendarId,
      },
      updatedAt: Date.now(),
    });
  },
});

// ============================================================================
// ACTIONS
// ============================================================================

/**
 * Public action to refresh sub-calendar list from Google.
 * Called from the UI when the user clicks "Refresh calendars".
 */
export const refreshSubCalendars = action({
  args: {
    sessionId: v.string(),
    connectionId: v.id("oauthConnections"),
  },
  handler: async (ctx, args): Promise<{ success: boolean; count?: number; error?: string }> => {
    // Verify session
    const connection = await ctx.runQuery(
      internal.oauth.google.getConnection,
      { connectionId: args.connectionId }
    );
    if (!connection || connection.status !== "active") {
      throw new Error("Invalid or inactive connection");
    }

    return await ctx.runAction(
      internal.calendarSyncSubcalendars.fetchAndStoreSubCalendars,
      { connectionId: args.connectionId }
    ) as { success: boolean; count?: number; error?: string };
  },
});

/**
 * Public action to create a dedicated "Bookings" calendar in Google
 * and set it as the push target.
 */
export const createBookingsCalendar = action({
  args: {
    sessionId: v.string(),
    connectionId: v.id("oauthConnections"),
  },
  handler: async (ctx, args): Promise<{ success: boolean; calendarId: string | null; error?: string }> => {
    const connection = await ctx.runQuery(
      internal.oauth.google.getConnection,
      { connectionId: args.connectionId }
    );
    if (!connection || connection.status !== "active") {
      throw new Error("Invalid or inactive connection");
    }

    return await ctx.runAction(
      internal.calendarSyncSubcalendars.ensureBookingsCalendar,
      { connectionId: args.connectionId }
    ) as { success: boolean; calendarId: string | null; error?: string };
  },
});

// ============================================================================
// INTERNAL ACTIONS
// ============================================================================

/**
 * Fetch sub-calendar list from Google Calendar API and store it.
 * Called on initial connection and when user refreshes.
 */
export const fetchAndStoreSubCalendars = internalAction({
  args: { connectionId: v.id("oauthConnections") },
  handler: async (ctx, args) => {
    const connection = await ctx.runQuery(
      internal.oauth.google.getConnection,
      { connectionId: args.connectionId }
    );
    if (!connection || connection.status !== "active") {
      return { success: false, error: "Invalid connection" };
    }

    try {
      const result = (await ctx.runAction(
        internal.oauth.googleClient.googleRequest,
        {
          connectionId: args.connectionId,
          endpoint: "/users/me/calendarList",
        }
      )) as Record<string, unknown> | null;

      if (!result) {
        return { success: false, error: "No response from Google" };
      }

      const items =
        ((result as Record<string, unknown>).items as Array<
          Record<string, unknown>
        >) || [];

      const subCalendars = items.map((item) => ({
        calendarId: item.id as string,
        summary: (item.summary as string) || "Untitled",
        backgroundColor: (item.backgroundColor as string) || "#4285f4",
        accessRole: (item.accessRole as string) || "reader",
        primary: item.primary === true,
        lastFetchedAt: Date.now(),
      }));

      await ctx.runMutation(
        internal.calendarSyncSubcalendars.storeSubCalendars,
        {
          connectionId: args.connectionId,
          subCalendars,
        }
      );

      return { success: true, count: subCalendars.length };
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : "Unknown error";
      return { success: false, error: errorMsg };
    }
  },
});

/**
 * Create a dedicated "Bookings" sub-calendar in Google Calendar.
 * If one was already created, returns the existing ID.
 */
export const ensureBookingsCalendar = internalAction({
  args: { connectionId: v.id("oauthConnections") },
  handler: async (ctx, args) => {
    const connection = await ctx.runQuery(
      internal.oauth.google.getConnection,
      { connectionId: args.connectionId }
    );
    if (!connection) return { success: false, calendarId: null };

    const cp = (connection.customProperties || {}) as Record<string, unknown>;
    if (cp.bookingsCalendarId) {
      return {
        success: true,
        calendarId: cp.bookingsCalendarId as string,
      };
    }

    try {
      const result = (await ctx.runAction(
        internal.oauth.googleClient.googleRequest,
        {
          connectionId: args.connectionId,
          endpoint: "/calendars",
          method: "POST",
          body: {
            summary: "Bookings",
            description: "Auto-created calendar for booking events",
          },
        }
      )) as Record<string, unknown> | null;

      if (!result) {
        return { success: false, calendarId: null };
      }

      const calendarId = (result as Record<string, unknown>).id as string;

      await ctx.runMutation(
        internal.calendarSyncSubcalendars.storeBookingsCalendarId,
        {
          connectionId: args.connectionId,
          calendarId,
        }
      );

      // Refresh sub-calendar list to include the new one
      await ctx.runAction(
        internal.calendarSyncSubcalendars.fetchAndStoreSubCalendars,
        { connectionId: args.connectionId }
      );

      return { success: true, calendarId };
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : "Unknown error";
      return { success: false, calendarId: null, error: errorMsg };
    }
  },
});
