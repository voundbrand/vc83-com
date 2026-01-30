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
import { api, internal } from "./_generated/api";

// ============================================================================
// RETRY HELPERS
// ============================================================================

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

/**
 * Calculate exponential backoff delay with jitter.
 */
function getRetryDelay(attempt: number): number {
  const exponentialDelay = BASE_DELAY_MS * Math.pow(2, attempt);
  const jitter = Math.random() * BASE_DELAY_MS;
  return exponentialDelay + jitter;
}

/**
 * Check if an error is retryable (rate limits, transient network errors).
 */
function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    // Rate limited
    if (msg.includes("429") || msg.includes("rate limit")) return true;
    // Server errors
    if (msg.includes("500") || msg.includes("502") || msg.includes("503") || msg.includes("504")) return true;
    // Network errors
    if (msg.includes("network") || msg.includes("timeout") || msg.includes("econnreset")) return true;
  }
  return false;
}

/**
 * Sleep helper for retry delays.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get external calendar events for a date range, filtered by resource.
 * Looks up objectLinks where the resource is the target of "blocks_resource" links.
 */
export const getExternalEvents = query({
  args: {
    sessionId: v.string(),
    resourceId: v.id("objects"),
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId as Id<"sessions">);
    if (!session || session.expiresAt < Date.now()) return [];

    const links = await ctx.db
      .query("objectLinks")
      .withIndex("by_to_object", (q) => q.eq("toObjectId", args.resourceId))
      .filter((q) => q.eq(q.field("linkType"), "blocks_resource"))
      .collect();

    if (links.length === 0) return [];

    const eventIds = links.map((l) => l.fromObjectId);
    const startMs = new Date(args.startDate).getTime();
    const endMs = new Date(args.endDate).getTime();

    const events = [];
    for (const eventId of eventIds) {
      const event = await ctx.db.get(eventId);
      if (
        !event ||
        event.type !== "calendar_event" ||
        event.status === "deleted"
      )
        continue;

      const cp = (event.customProperties || {}) as Record<string, unknown>;
      const eventStart = cp.startDateTime as number | undefined;
      const eventEnd = cp.endDateTime as number | undefined;

      if (
        eventStart &&
        eventEnd &&
        eventStart < endMs &&
        eventEnd > startMs
      ) {
        events.push({
          _id: event._id,
          name: event.name,
          startDateTime: eventStart,
          endDateTime: eventEnd,
          isBusy: cp.isBusy !== false,
          isAllDay: cp.isAllDay === true,
          organizer: cp.organizer as string | undefined,
          location: cp.location as string | undefined,
          syncDirection: cp.syncDirection as string | undefined,
          provider: event.subtype, // "external_google" or "external_microsoft"
        });
      }
    }

    return events;
  },
});

/**
 * Get sync status for a specific OAuth connection.
 */
export const getSyncStatus = query({
  args: {
    sessionId: v.string(),
    connectionId: v.id("oauthConnections"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId as Id<"sessions">);
    if (!session || session.expiresAt < Date.now()) return null;

    const connection = await ctx.db.get(args.connectionId);
    if (!connection) return null;

    const events = await ctx.db
      .query("objects")
      .withIndex("by_type", (q) => q.eq("type", "calendar_event"))
      .filter((q) =>
        q.and(
          q.neq(q.field("status"), "deleted"),
          q.eq(q.field("organizationId"), connection.organizationId)
        )
      )
      .collect();

    const connectionEvents = events.filter((e) => {
      const cp = (e.customProperties || {}) as Record<string, unknown>;
      return cp.connectionId === args.connectionId;
    });

    const syncSettings = (connection.syncSettings || {}) as Record<
      string,
      unknown
    >;

    return {
      calendarSyncEnabled: syncSettings.calendar === true,
      lastSyncAt: (connection as Record<string, unknown>)
        .lastCalendarSyncAt as number | undefined,
      lastSyncError: connection.lastSyncError || null,
      totalEventsSync: connectionEvents.length,
      connectionStatus: connection.status,
    };
  },
});

/**
 * Get which resources are linked to calendar connections for an organization.
 */
export const getCalendarResourceLinks = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId as Id<"sessions">);
    if (!session || session.expiresAt < Date.now()) return [];

    const links = await ctx.db
      .query("objectLinks")
      .withIndex("by_org_link_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("linkType", "calendar_linked_to")
      )
      .collect();

    return links.map((l) => ({
      connectionId: (l.properties as Record<string, unknown> | undefined)
        ?.connectionId as string | undefined,
      resourceId: l.toObjectId,
    }));
  },
});

// ============================================================================
// INTERNAL QUERY
// ============================================================================

/**
 * Find all active OAuth connections that have calendar sync enabled.
 * Used by the syncAllConnections cron action.
 */
export const getActiveSyncConnections = internalQuery({
  args: {},
  handler: async (ctx) => {
    const connections = await ctx.db
      .query("oauthConnections")
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    return connections.filter((c) => {
      const settings = (c.syncSettings || {}) as Record<string, unknown>;
      return settings.calendar === true;
    });
  },
});

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create or update an external calendar event in the objects table.
 * Matches on externalEventId + connectionId to determine upsert behavior.
 */
export const upsertExternalEvent = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    connectionId: v.id("oauthConnections"),
    externalEventId: v.string(),
    provider: v.union(
      v.literal("external_google"),
      v.literal("external_microsoft")
    ),
    name: v.string(),
    startDateTime: v.number(),
    endDateTime: v.number(),
    isAllDay: v.optional(v.boolean()),
    isBusy: v.optional(v.boolean()),
    organizer: v.optional(v.string()),
    location: v.optional(v.string()),
    providerUpdatedAt: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("objects")
      .withIndex("by_type", (q) => q.eq("type", "calendar_event"))
      .filter((q) =>
        q.and(
          q.eq(q.field("organizationId"), args.organizationId),
          q.eq(q.field("subtype"), args.provider)
        )
      )
      .collect();

    const match = existing.find((e) => {
      const cp = (e.customProperties || {}) as Record<string, unknown>;
      return (
        cp.externalEventId === args.externalEventId &&
        cp.connectionId === args.connectionId
      );
    });

    const customProperties = {
      externalEventId: args.externalEventId,
      connectionId: args.connectionId,
      startDateTime: args.startDateTime,
      endDateTime: args.endDateTime,
      isAllDay: args.isAllDay || false,
      isBusy: args.isBusy !== false, // default true
      organizer: args.organizer || null,
      location: args.location || null,
      syncDirection: "inbound",
      lastSyncedAt: Date.now(),
      providerUpdatedAt: args.providerUpdatedAt || null,
    };

    if (match) {
      await ctx.db.patch(match._id, {
        name: args.name,
        customProperties,
        status: "active",
        updatedAt: Date.now(),
      });
      return match._id;
    }

    return await ctx.db.insert("objects", {
      type: "calendar_event",
      subtype: args.provider,
      name: args.name,
      status: "active",
      organizationId: args.organizationId,
      customProperties,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

/**
 * Soft-delete events that no longer exist in the external calendar.
 * Compares current external event IDs against the provided active list.
 */
export const deleteStaleEvents = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    connectionId: v.id("oauthConnections"),
    provider: v.union(
      v.literal("external_google"),
      v.literal("external_microsoft")
    ),
    activeExternalEventIds: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const events = await ctx.db
      .query("objects")
      .withIndex("by_type", (q) => q.eq("type", "calendar_event"))
      .filter((q) =>
        q.and(
          q.eq(q.field("organizationId"), args.organizationId),
          q.eq(q.field("subtype"), args.provider),
          q.neq(q.field("status"), "deleted")
        )
      )
      .collect();

    let deletedCount = 0;
    for (const event of events) {
      const cp = (event.customProperties || {}) as Record<string, unknown>;
      if (cp.connectionId !== args.connectionId) continue;

      const externalId = cp.externalEventId as string;
      if (!args.activeExternalEventIds.includes(externalId)) {
        await ctx.db.patch(event._id, {
          status: "deleted",
          updatedAt: Date.now(),
        });
        deletedCount++;
      }
    }

    return { deletedCount };
  },
});

/**
 * Map a connection's calendar to a bookable resource.
 * Removes any existing link for the same connection before creating a new one.
 */
export const linkCalendarToResource = mutation({
  args: {
    sessionId: v.string(),
    connectionId: v.id("oauthConnections"),
    resourceId: v.id("objects"),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId as Id<"sessions">);
    if (!session || session.expiresAt < Date.now())
      throw new Error("Invalid session");

    // Remove existing link for this connection
    const existingLinks = await ctx.db
      .query("objectLinks")
      .withIndex("by_org_link_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("linkType", "calendar_linked_to")
      )
      .collect();

    for (const link of existingLinks) {
      const cp = (link.properties || {}) as Record<string, unknown>;
      if (cp.connectionId === args.connectionId) {
        await ctx.db.delete(link._id);
      }
    }

    // Create new link
    return await ctx.db.insert("objectLinks", {
      linkType: "calendar_linked_to",
      fromObjectId: args.resourceId,
      toObjectId: args.resourceId,
      organizationId: args.organizationId,
      properties: { connectionId: args.connectionId },
      createdAt: Date.now(),
    });
  },
});

/**
 * Update the last sync timestamp on an OAuth connection.
 * Optionally records an error message if the sync failed.
 */
export const updateSyncTimestamp = internalMutation({
  args: {
    connectionId: v.id("oauthConnections"),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const update: Record<string, unknown> = {
      lastCalendarSyncAt: Date.now(),
      updatedAt: Date.now(),
    };
    if (args.error) {
      update.lastSyncError = args.error;
    } else {
      update.lastSyncError = null;
    }
    await ctx.db.patch(args.connectionId, update);
  },
});

/**
 * Link a synced external event to a resource for availability blocking.
 * Creates a "blocks_resource" link if one does not already exist.
 */
export const linkExternalEventToResource = internalMutation({
  args: {
    eventId: v.id("objects"),
    resourceId: v.id("objects"),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("objectLinks")
      .withIndex("by_from_link_type", (q) =>
        q.eq("fromObjectId", args.eventId).eq("linkType", "blocks_resource")
      )
      .filter((q) =>
        q.eq(q.field("toObjectId"), args.resourceId)
      )
      .first();

    if (existing) return existing._id;

    return await ctx.db.insert("objectLinks", {
      linkType: "blocks_resource",
      fromObjectId: args.eventId,
      toObjectId: args.resourceId,
      organizationId: args.organizationId,
      createdAt: Date.now(),
    });
  },
});

// ============================================================================
// INTERNAL ACTIONS (Sync Operations)
// ============================================================================

/**
 * Pull events from Google Calendar for a specific OAuth connection.
 * Syncs a 30-day window: 7 days in the past through 23 days in the future.
 */
export const syncFromGoogle = internalAction({
  args: { connectionId: v.id("oauthConnections") },
  handler: async (ctx, args) => {
    const connection = await ctx.runQuery(
      internal.oauth.google.getConnection,
      { connectionId: args.connectionId }
    );
    if (!connection || connection.status !== "active")
      return { success: false, error: "Invalid connection" };

    try {
      const now = new Date();
      const timeMin = new Date(
        now.getTime() - 7 * 24 * 60 * 60 * 1000
      ).toISOString();
      const timeMax = new Date(
        now.getTime() + 23 * 24 * 60 * 60 * 1000
      ).toISOString();

      let result: Record<string, unknown> | null = null;
      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          result = await ctx.runAction(
            api.oauth.googleClient.getCalendarEvents,
            {
              connectionId: args.connectionId,
              timeMin,
              timeMax,
              maxResults: 250,
            }
          ) as Record<string, unknown> | null;
          break; // Success, exit retry loop
        } catch (apiError) {
          if (attempt < MAX_RETRIES && isRetryableError(apiError)) {
            await sleep(getRetryDelay(attempt));
            continue;
          }
          throw apiError; // Non-retryable or max retries exceeded
        }
      }

      if (!result) {
        await ctx.runMutation(
          internal.calendarSyncOntology.updateSyncTimestamp,
          {
            connectionId: args.connectionId,
            error: "No response from Google Calendar API",
          }
        );
        return { success: false, error: "No response" };
      }

      const items =
        ((result as Record<string, unknown>).items as Array<
          Record<string, unknown>
        >) || [];
      const activeIds: string[] = [];

      for (const item of items) {
        const eventId = item.id as string;
        if (!eventId) continue;

        activeIds.push(eventId);

        const start = item.start as Record<string, unknown> | undefined;
        const end = item.end as Record<string, unknown> | undefined;

        let startDateTime: number;
        let endDateTime: number;
        let isAllDay = false;

        if (start?.dateTime) {
          startDateTime = new Date(start.dateTime as string).getTime();
          endDateTime = new Date(
            (end?.dateTime || start.dateTime) as string
          ).getTime();
        } else if (start?.date) {
          startDateTime = new Date(start.date as string).getTime();
          endDateTime = new Date(
            (end?.date || start.date) as string
          ).getTime();
          isAllDay = true;
        } else {
          continue;
        }

        const transparency = item.transparency as string;
        const isBusy = transparency !== "transparent";

        await ctx.runMutation(
          internal.calendarSyncOntology.upsertExternalEvent,
          {
            organizationId: connection.organizationId,
            connectionId: args.connectionId,
            externalEventId: eventId,
            provider: "external_google",
            name: (item.summary as string) || "Untitled Event",
            startDateTime,
            endDateTime,
            isAllDay,
            isBusy,
            organizer: (item.organizer as Record<string, unknown>)?.email as
              | string
              | undefined,
            location: item.location as string | undefined,
            providerUpdatedAt: item.updated as string | undefined,
          }
        );
      }

      await ctx.runMutation(
        internal.calendarSyncOntology.deleteStaleEvents,
        {
          organizationId: connection.organizationId,
          connectionId: args.connectionId,
          provider: "external_google",
          activeExternalEventIds: activeIds,
        }
      );

      await ctx.runMutation(
        internal.calendarSyncOntology.updateSyncTimestamp,
        { connectionId: args.connectionId }
      );

      return { success: true, syncedCount: items.length };
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : "Unknown sync error";
      await ctx.runMutation(
        internal.calendarSyncOntology.updateSyncTimestamp,
        {
          connectionId: args.connectionId,
          error: errorMsg,
        }
      );
      return { success: false, error: errorMsg };
    }
  },
});

/**
 * Pull events from Microsoft Calendar for a specific OAuth connection.
 * Syncs a 30-day window: 7 days in the past through 23 days in the future.
 */
export const syncFromMicrosoft = internalAction({
  args: { connectionId: v.id("oauthConnections") },
  handler: async (ctx, args) => {
    const connection = await ctx.runQuery(
      internal.oauth.google.getConnection,
      { connectionId: args.connectionId }
    );
    if (!connection || connection.status !== "active")
      return { success: false, error: "Invalid connection" };

    try {
      const now = new Date();
      const startDateTime = new Date(
        now.getTime() - 7 * 24 * 60 * 60 * 1000
      ).toISOString();
      const endDateTime = new Date(
        now.getTime() + 23 * 24 * 60 * 60 * 1000
      ).toISOString();

      let result: Record<string, unknown> | null = null;
      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          result = await ctx.runAction(
            internal.oauth.graphClient.graphRequest,
            {
              connectionId: args.connectionId,
              endpoint: `/me/calendarView?startDateTime=${startDateTime}&endDateTime=${endDateTime}&$top=250`,
            }
          ) as Record<string, unknown> | null;
          break;
        } catch (apiError) {
          if (attempt < MAX_RETRIES && isRetryableError(apiError)) {
            await sleep(getRetryDelay(attempt));
            continue;
          }
          throw apiError;
        }
      }

      if (!result) {
        await ctx.runMutation(
          internal.calendarSyncOntology.updateSyncTimestamp,
          {
            connectionId: args.connectionId,
            error: "No response from Microsoft Calendar API",
          }
        );
        return { success: false, error: "No response" };
      }

      const items =
        ((result as Record<string, unknown>).value as Array<
          Record<string, unknown>
        >) || [];
      const activeIds: string[] = [];

      for (const item of items) {
        const eventId = item.id as string;
        if (!eventId) continue;

        activeIds.push(eventId);

        const start = item.start as Record<string, unknown> | undefined;
        const end = item.end as Record<string, unknown> | undefined;

        let startMs: number;
        let endMs: number;
        const isAllDay = item.isAllDay === true;

        if (start?.dateTime) {
          startMs = new Date(start.dateTime as string).getTime();
          endMs = new Date(
            (end?.dateTime || start.dateTime) as string
          ).getTime();
        } else {
          continue;
        }

        const showAs = item.showAs as string;
        const isBusy = showAs !== "free" && showAs !== "tentative";

        await ctx.runMutation(
          internal.calendarSyncOntology.upsertExternalEvent,
          {
            organizationId: connection.organizationId,
            connectionId: args.connectionId,
            externalEventId: eventId,
            provider: "external_microsoft",
            name: (item.subject as string) || "Untitled Event",
            startDateTime: startMs,
            endDateTime: endMs,
            isAllDay,
            isBusy,
            organizer: (
              (item.organizer as Record<string, unknown>)
                ?.emailAddress as Record<string, unknown>
            )?.address as string | undefined,
            location: (item.location as Record<string, unknown>)
              ?.displayName as string | undefined,
            providerUpdatedAt: item.lastModifiedDateTime as
              | string
              | undefined,
          }
        );
      }

      await ctx.runMutation(
        internal.calendarSyncOntology.deleteStaleEvents,
        {
          organizationId: connection.organizationId,
          connectionId: args.connectionId,
          provider: "external_microsoft",
          activeExternalEventIds: activeIds,
        }
      );

      await ctx.runMutation(
        internal.calendarSyncOntology.updateSyncTimestamp,
        { connectionId: args.connectionId }
      );

      return { success: true, syncedCount: items.length };
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : "Unknown sync error";
      await ctx.runMutation(
        internal.calendarSyncOntology.updateSyncTimestamp,
        {
          connectionId: args.connectionId,
          error: errorMsg,
        }
      );
      return { success: false, error: errorMsg };
    }
  },
});

/**
 * Cron target: iterate all active OAuth connections with calendar sync enabled
 * and trigger the appropriate provider-specific sync action.
 */
export const syncAllConnections = internalAction({
  args: {},
  handler: async (ctx): Promise<{ successCount: number; errorCount: number; total: number }> => {
    const connections = await ctx.runQuery(
      internal.calendarSyncOntology.getActiveSyncConnections,
      {}
    );

    let successCount = 0;
    let errorCount = 0;

    for (const conn of connections) {
      try {
        if (conn.provider === "google") {
          await ctx.runAction(
            internal.calendarSyncOntology.syncFromGoogle,
            { connectionId: conn._id }
          );
        } else if (conn.provider === "microsoft") {
          await ctx.runAction(
            internal.calendarSyncOntology.syncFromMicrosoft,
            { connectionId: conn._id }
          );
        }
        successCount++;
      } catch (error) {
        errorCount++;
        console.error(
          `Calendar sync failed for connection ${conn._id} (${conn.provider}):`,
          error instanceof Error ? error.message : error
        );
      }
    }

    return { successCount, errorCount, total: connections.length };
  },
});

// ============================================================================
// OUTBOUND PUSH (Internal -> External Calendars)
// ============================================================================

/**
 * Find calendar connections linked to a resource.
 * Returns connection IDs for all providers that have calendar sync enabled
 * and are linked to the given resource.
 */
export const getResourceCalendarConnections = internalQuery({
  args: {
    resourceId: v.id("objects"),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    // Find calendar_linked_to links for this resource
    const links = await ctx.db
      .query("objectLinks")
      .withIndex("by_org_link_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("linkType", "calendar_linked_to")
      )
      .collect();

    const resourceLinks = links.filter((l) => l.toObjectId === args.resourceId);

    const connections: Array<{
      connectionId: Id<"oauthConnections">;
      provider: string;
    }> = [];

    for (const link of resourceLinks) {
      const cp = (link.properties || {}) as Record<string, unknown>;
      const connectionId = cp.connectionId as string | undefined;
      if (!connectionId) continue;

      const connection = await ctx.db.get(connectionId as Id<"oauthConnections">);
      if (!connection || connection.status !== "active") continue;

      const syncSettings = (connection.syncSettings || {}) as Record<string, unknown>;
      if (syncSettings.calendar !== true) continue;

      connections.push({
        connectionId: connection._id,
        provider: connection.provider,
      });
    }

    return connections;
  },
});

/**
 * Store the external event ID on a booking after pushing to external calendar.
 */
export const storeExternalEventId = internalMutation({
  args: {
    bookingId: v.id("objects"),
    provider: v.string(),
    externalEventId: v.string(),
    connectionId: v.id("oauthConnections"),
  },
  handler: async (ctx, args) => {
    const booking = await ctx.db.get(args.bookingId);
    if (!booking) return;

    const currentProps = (booking.customProperties || {}) as Record<string, unknown>;
    const externalCalendarEvents = (currentProps.externalCalendarEvents || {}) as Record<string, unknown>;

    await ctx.db.patch(args.bookingId, {
      customProperties: {
        ...currentProps,
        externalCalendarEvents: {
          ...externalCalendarEvents,
          [args.provider]: {
            externalEventId: args.externalEventId,
            connectionId: args.connectionId,
            pushedAt: Date.now(),
          },
        },
      },
      updatedAt: Date.now(),
    });
  },
});

/**
 * Push a confirmed booking to all linked external calendars.
 * Called after booking confirmation.
 */
export const pushBookingToCalendar = internalAction({
  args: {
    bookingId: v.id("objects"),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    // Get booking details
    const booking = await ctx.runQuery(
      internal.bookingOntology.getBookingInternal,
      { bookingId: args.bookingId, organizationId: args.organizationId }
    );

    if (!booking) return { success: false, error: "Booking not found" };

    const bookingProps = (booking.customProperties || {}) as Record<string, unknown>;
    const startDateTime = bookingProps.startDateTime as number | undefined;
    const endDateTime = bookingProps.endDateTime as number | undefined;

    if (!startDateTime || !endDateTime) {
      return { success: false, error: "Booking has no date/time" };
    }

    // Get linked resources
    const resourceIds = (bookingProps.resourceIds || []) as string[];
    if (resourceIds.length === 0) {
      // Try to get from objectLinks
      const links = await ctx.runQuery(
        internal.calendarSyncOntology.getBookingResourceLinks,
        { bookingId: args.bookingId }
      );
      resourceIds.push(...links.map((l: { resourceId: string }) => l.resourceId));
    }

    if (resourceIds.length === 0) {
      return { success: false, error: "No linked resources" };
    }

    let pushCount = 0;

    for (const resourceId of resourceIds) {
      // Get calendar connections for this resource
      const connections = await ctx.runQuery(
        internal.calendarSyncOntology.getResourceCalendarConnections,
        {
          resourceId: resourceId as Id<"objects">,
          organizationId: booking.organizationId,
        }
      );

      for (const conn of connections) {
        try {
          const startISO = new Date(startDateTime).toISOString();
          const endISO = new Date(endDateTime).toISOString();
          const eventTitle = `Booking: ${booking.name || "Untitled"}`;
          const eventDescription = [
            bookingProps.customerName && `Customer: ${bookingProps.customerName}`,
            bookingProps.customerEmail && `Email: ${bookingProps.customerEmail}`,
            booking.subtype && `Type: ${booking.subtype}`,
          ]
            .filter(Boolean)
            .join("\n");

          let externalEventId: string | null = null;

          if (conn.provider === "google") {
            const result = await ctx.runAction(
              internal.oauth.googleClient.googleRequest,
              {
                connectionId: conn.connectionId,
                endpoint: "/calendars/primary/events",
                method: "POST",
                body: {
                  summary: eventTitle,
                  description: eventDescription,
                  start: { dateTime: startISO, timeZone: "UTC" },
                  end: { dateTime: endISO, timeZone: "UTC" },
                  status: "confirmed",
                },
              }
            );
            if (result) {
              externalEventId = (result as Record<string, unknown>).id as string;
            }
          } else if (conn.provider === "microsoft") {
            const result = await ctx.runAction(
              internal.oauth.graphClient.graphRequest,
              {
                connectionId: conn.connectionId,
                endpoint: "/me/events",
                method: "POST",
                body: {
                  subject: eventTitle,
                  body: { contentType: "text", content: eventDescription },
                  start: { dateTime: startISO, timeZone: "UTC" },
                  end: { dateTime: endISO, timeZone: "UTC" },
                  showAs: "busy",
                },
              }
            );
            if (result) {
              externalEventId = (result as Record<string, unknown>).id as string;
            }
          }

          if (externalEventId) {
            await ctx.runMutation(
              internal.calendarSyncOntology.storeExternalEventId,
              {
                bookingId: args.bookingId,
                provider: conn.provider,
                externalEventId,
                connectionId: conn.connectionId,
              }
            );
            pushCount++;
          }
        } catch (error) {
          console.error(
            `Failed to push booking to ${conn.provider}:`,
            error instanceof Error ? error.message : error
          );
        }
      }
    }

    return { success: true, pushCount };
  },
});

/**
 * Get resource links for a booking (internal helper).
 */
export const getBookingResourceLinks = internalQuery({
  args: {
    bookingId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const links = await ctx.db
      .query("objectLinks")
      .withIndex("by_from_link_type", (q) =>
        q.eq("fromObjectId", args.bookingId).eq("linkType", "books_resource")
      )
      .collect();

    return links.map((l) => ({ resourceId: l.toObjectId }));
  },
});

/**
 * Delete/cancel a booking from all linked external calendars.
 * Called when a booking is cancelled.
 */
export const deleteBookingFromCalendar = internalAction({
  args: {
    bookingId: v.id("objects"),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const booking = await ctx.runQuery(
      internal.bookingOntology.getBookingInternal,
      { bookingId: args.bookingId, organizationId: args.organizationId }
    );

    if (!booking) return { success: false, error: "Booking not found" };

    const bookingProps = (booking.customProperties || {}) as Record<string, unknown>;
    const externalEvents = (bookingProps.externalCalendarEvents || {}) as Record<
      string,
      { externalEventId: string; connectionId: string }
    >;

    let deleteCount = 0;

    for (const [provider, eventInfo] of Object.entries(externalEvents)) {
      try {
        if (provider === "google") {
          await ctx.runAction(
            internal.oauth.googleClient.googleRequest,
            {
              connectionId: eventInfo.connectionId as Id<"oauthConnections">,
              endpoint: `/calendars/primary/events/${eventInfo.externalEventId}`,
              method: "DELETE",
            }
          );
          deleteCount++;
        } else if (provider === "microsoft") {
          await ctx.runAction(
            internal.oauth.graphClient.graphRequest,
            {
              connectionId: eventInfo.connectionId as Id<"oauthConnections">,
              endpoint: `/me/events/${eventInfo.externalEventId}`,
              method: "DELETE",
            }
          );
          deleteCount++;
        }
      } catch (error) {
        console.error(
          `Failed to delete booking from ${provider}:`,
          error instanceof Error ? error.message : error
        );
      }
    }

    return { success: true, deleteCount };
  },
});
