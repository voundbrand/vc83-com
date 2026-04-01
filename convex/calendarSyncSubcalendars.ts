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
const generatedApi: any = require("./_generated/api");

const GOOGLE_CALENDAR_READ_SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.events.readonly",
];

const GOOGLE_CALENDAR_WRITE_SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/calendar.events",
];

type StoredSubCalendar = {
  calendarId: string;
  summary: string;
  backgroundColor: string;
  accessRole: string;
  primary: boolean;
  lastFetchedAt: number;
};

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeStringArray(values: unknown): string[] {
  if (!Array.isArray(values)) {
    return [];
  }
  const normalized = new Set<string>();
  for (const value of values) {
    const normalizedValue = normalizeOptionalString(value);
    if (normalizedValue) {
      normalized.add(normalizedValue);
    }
  }
  return Array.from(normalized);
}

function getStoredSubCalendars(connection: {
  customProperties?: unknown;
} | null): StoredSubCalendar[] {
  const cp = (connection?.customProperties || {}) as Record<string, unknown>;
  return Array.isArray(cp.subCalendars)
    ? (cp.subCalendars as StoredSubCalendar[])
    : [];
}

function getPrimaryCalendarId(connection: {
  customProperties?: unknown;
} | null): string | undefined {
  return getStoredSubCalendars(connection).find((calendar) => calendar.primary)
    ?.calendarId;
}

function normalizeGoogleCalendarIdForConnection(
  connection: { customProperties?: unknown } | null,
  value: unknown
): string | undefined {
  const normalizedValue = normalizeOptionalString(value);
  if (!normalizedValue) {
    return undefined;
  }

  const subCalendars = getStoredSubCalendars(connection);
  const primaryCalendarId = getPrimaryCalendarId(connection);
  if (normalizedValue === "primary" && primaryCalendarId) {
    return primaryCalendarId;
  }
  if (primaryCalendarId && normalizedValue === primaryCalendarId) {
    return primaryCalendarId;
  }
  if (subCalendars.length === 0) {
    return normalizedValue;
  }

  const knownCalendarIds = new Set(
    subCalendars.map((calendar) => normalizeOptionalString(calendar.calendarId)).filter(
      (calendarId): calendarId is string => Boolean(calendarId)
    )
  );
  return knownCalendarIds.has(normalizedValue) ? normalizedValue : undefined;
}

function getDefaultBlockingCalendarIds(connection: {
  customProperties?: unknown;
} | null): string[] {
  return [getPrimaryCalendarId(connection) || "primary"];
}

function normalizeBlockingCalendarIdsForConnection(
  connection: { customProperties?: unknown } | null,
  values: unknown
): string[] {
  const normalizedIds = new Set<string>();
  for (const value of normalizeStringArray(values)) {
    const normalizedCalendarId = normalizeGoogleCalendarIdForConnection(
      connection,
      value
    );
    if (normalizedCalendarId) {
      normalizedIds.add(normalizedCalendarId);
    }
  }
  return Array.from(normalizedIds);
}

function normalizePushCalendarIdForConnection(
  connection: { customProperties?: unknown } | null,
  value: unknown
): string | null {
  const normalizedCalendarId = normalizeGoogleCalendarIdForConnection(
    connection,
    value
  );
  return normalizedCalendarId || null;
}

function hasAnyScope(
  scopes: string[] | undefined,
  requiredScopes: readonly string[]
): boolean {
  if (!Array.isArray(scopes) || scopes.length === 0) {
    return false;
  }
  return scopes.some((scope) => requiredScopes.includes(scope));
}

function getGoogleCalendarScopeReadiness(scopes: string[] | undefined) {
  return {
    canAccessCalendar: hasAnyScope(scopes, GOOGLE_CALENDAR_READ_SCOPES),
    canWriteCalendar: hasAnyScope(scopes, GOOGLE_CALENDAR_WRITE_SCOPES),
  };
}

async function upsertCalendarLinkSettingsRecord(
  ctx: any,
  args: {
    organizationId: Id<"organizations">;
    connectionId: Id<"oauthConnections">;
    resourceId?: Id<"objects">;
    blockingCalendarIds?: string[];
    pushCalendarId?: string;
  }
) {
  const connection = await ctx.db.get(args.connectionId);
  if (!connection) {
    throw new Error("Google calendar connection not found");
  }
  if (
    connection.organizationId !== args.organizationId ||
    connection.provider !== "google"
  ) {
    throw new Error("Invalid Google calendar connection");
  }

  const nextBlockingCalendarIds =
    args.blockingCalendarIds !== undefined
      ? (() => {
          const normalizedIds = normalizeBlockingCalendarIdsForConnection(
            connection,
            args.blockingCalendarIds
          );
          return normalizedIds.length > 0
            ? normalizedIds
            : getDefaultBlockingCalendarIds(connection);
        })()
      : undefined;
  const nextPushCalendarId =
    args.pushCalendarId !== undefined
      ? normalizePushCalendarIdForConnection(connection, args.pushCalendarId)
      : undefined;

  let resourceId = args.resourceId;
  if (!resourceId) {
    const existing = await ctx.db
      .query("objects")
      .withIndex("by_type", (q: any) => q.eq("type", "calendar_settings"))
      .filter((q: any) => q.eq(q.field("organizationId"), args.organizationId))
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
    .withIndex("by_org_link_type", (q: any) =>
      q
        .eq("organizationId", args.organizationId)
        .eq("linkType", "calendar_linked_to")
    )
    .collect();

  const link = links.find((candidate: any) => {
    const cp = (candidate.properties || {}) as Record<string, unknown>;
    return (
      cp.connectionId === args.connectionId &&
      candidate.toObjectId === resourceId
    );
  });

  if (link) {
    const existingProps = (link.properties || {}) as Record<string, unknown>;
    await ctx.db.patch(link._id, {
      properties: {
        ...existingProps,
        ...(nextBlockingCalendarIds !== undefined
          ? { blockingCalendarIds: nextBlockingCalendarIds }
          : {}),
        ...(nextPushCalendarId !== undefined
          ? { pushCalendarId: nextPushCalendarId }
          : {}),
      },
    });
    return {
      success: true as const,
      resourceId,
      linkId: link._id,
      created: false,
    };
  }

  const linkId = await ctx.db.insert("objectLinks", {
    linkType: "calendar_linked_to",
    fromObjectId: resourceId,
    toObjectId: resourceId,
    organizationId: args.organizationId,
    properties: {
      connectionId: args.connectionId,
      blockingCalendarIds:
        nextBlockingCalendarIds || getDefaultBlockingCalendarIds(connection),
      pushCalendarId: nextPushCalendarId || null,
    },
    createdAt: Date.now(),
  });

  return {
    success: true as const,
    resourceId,
    linkId,
    created: true,
  };
}

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

    return getStoredSubCalendars(connection);
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

    const connection = await ctx.db.get(args.connectionId);
    if (!connection) {
      return {
        blockingCalendarIds: ["primary"] as string[],
        pushCalendarId: null as string | null,
        explicitBlockingConfigured: false,
        calendarSyncEnabled: false,
        canAccessCalendar: false,
        canWriteCalendar: false,
        connectionStatus: "missing" as const,
        lastSyncError: null as string | null,
        primaryCalendarId: null as string | null,
        subCalendarCacheReady: false,
      };
    }

    const links = await ctx.db
      .query("objectLinks")
      .withIndex("by_org_link_type", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("linkType", "calendar_linked_to")
      )
      .collect();

    let fallbackLink: (typeof links)[number] | undefined;
    let link: (typeof links)[number] | undefined;
    for (const candidate of links) {
      const cp = (candidate.properties || {}) as Record<string, unknown>;
      if (cp.connectionId !== args.connectionId) continue;
      if (args.resourceId) {
        if (candidate.toObjectId === args.resourceId) {
          link = candidate;
          break;
        }
        continue;
      }

      fallbackLink = fallbackLink || candidate;
      const linkedObject = await ctx.db.get(candidate.toObjectId);
      if (
        linkedObject?.type === "calendar_settings" &&
        linkedObject.subtype === "org_default"
      ) {
        link = candidate;
        break;
      }
    }

    if (!link) {
      link = fallbackLink;
    }

    const cp = ((link?.properties || {}) as Record<string, unknown>) || {};
    const storedBlockingCalendarIds = normalizeBlockingCalendarIdsForConnection(
      connection,
      cp.blockingCalendarIds
    );
    const blockingCalendarIds =
      storedBlockingCalendarIds.length > 0
        ? storedBlockingCalendarIds
        : getDefaultBlockingCalendarIds(connection);
    const scopeReadiness = getGoogleCalendarScopeReadiness(connection.scopes);
    const syncSettings = (connection.syncSettings || {}) as Record<string, unknown>;

    return {
      blockingCalendarIds,
      pushCalendarId: normalizePushCalendarIdForConnection(
        connection,
        cp.pushCalendarId
      ),
      explicitBlockingConfigured: storedBlockingCalendarIds.length > 0,
      calendarSyncEnabled: syncSettings.calendar === true,
      canAccessCalendar: scopeReadiness.canAccessCalendar,
      canWriteCalendar: scopeReadiness.canWriteCalendar,
      connectionStatus: connection.status,
      lastSyncError: connection.lastSyncError || null,
      primaryCalendarId: getPrimaryCalendarId(connection) || null,
      subCalendarCacheReady: getStoredSubCalendars(connection).length > 0,
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
      const blocking = normalizeBlockingCalendarIdsForConnection(
        connection,
        cp.blockingCalendarIds
      );
      for (const id of blocking) calendarIds.add(id);
    }

    return calendarIds.size > 0
      ? Array.from(calendarIds)
      : getDefaultBlockingCalendarIds(connection);
  },
});

/**
 * Return deterministic blocking-calendar scope for a connection.
 * Falls back to `primary` when no explicit blocking selection exists.
 */
export const getConnectionBlockingCalendarSnapshot = internalQuery({
  args: { connectionId: v.id("oauthConnections") },
  handler: async (ctx, args) => {
    const connection = await ctx.db.get(args.connectionId);
    if (!connection) {
      return {
        exists: false,
        blockingCalendarIds: [] as string[],
        explicitBlockingConfigured: false,
      };
    }

    const links = await ctx.db
      .query("objectLinks")
      .withIndex("by_org_link_type", (q) =>
        q
          .eq("organizationId", connection.organizationId)
          .eq("linkType", "calendar_linked_to")
      )
      .collect();

    const calendarIds = new Set<string>();
    let explicitBlockingConfigured = false;
    for (const link of links) {
      const cp = (link.properties || {}) as Record<string, unknown>;
      if (cp.connectionId !== args.connectionId) continue;
      const blocking = normalizeBlockingCalendarIdsForConnection(
        connection,
        cp.blockingCalendarIds
      );
      if (blocking.length > 0) {
        explicitBlockingConfigured = true;
      }
      for (const id of blocking) {
        if (id) {
          calendarIds.add(id);
        }
      }
    }

    const blockingCalendarIds = Array.from(calendarIds);
    return {
      exists: true,
      blockingCalendarIds:
        blockingCalendarIds.length > 0
          ? blockingCalendarIds
          : getDefaultBlockingCalendarIds(connection),
      explicitBlockingConfigured,
    };
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
    const result = await upsertCalendarLinkSettingsRecord(ctx, {
      organizationId: args.organizationId,
      connectionId: args.connectionId,
      resourceId: args.resourceId,
      blockingCalendarIds: args.blockingCalendarIds,
      pushCalendarId: args.pushCalendarId,
    });
    return { success: result.success, resourceId: result.resourceId, linkId: result.linkId };
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

export const upsertCalendarLinkSettingsInternal = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    connectionId: v.id("oauthConnections"),
    resourceId: v.optional(v.id("objects")),
    blockingCalendarIds: v.optional(v.array(v.string())),
    pushCalendarId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await upsertCalendarLinkSettingsRecord(ctx, args);
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
    const connection = await (ctx as any).runQuery(
      generatedApi.internal.oauth.google.getConnection,
      { connectionId: args.connectionId }
    );
    if (!connection || connection.status !== "active") {
      throw new Error("Invalid or inactive connection");
    }

    return await (ctx as any).runAction(
      generatedApi.internal.calendarSyncSubcalendars.fetchAndStoreSubCalendars,
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
    const connection = await (ctx as any).runQuery(
      generatedApi.internal.oauth.google.getConnection,
      { connectionId: args.connectionId }
    );
    if (!connection || connection.status !== "active") {
      throw new Error("Invalid or inactive connection");
    }

    return await (ctx as any).runAction(
      generatedApi.internal.calendarSyncSubcalendars.ensureBookingsCalendar,
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
    const connection = await (ctx as any).runQuery(
      generatedApi.internal.oauth.google.getConnection,
      { connectionId: args.connectionId }
    );
    if (!connection || connection.status !== "active") {
      return { success: false, error: "Invalid connection" };
    }

    try {
      const result = (await (ctx as any).runAction(
        generatedApi.internal.oauth.googleClient.googleRequest,
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

      await (ctx as any).runMutation(
        generatedApi.internal.calendarSyncSubcalendars.storeSubCalendars,
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
    const connection = await (ctx as any).runQuery(
      generatedApi.internal.oauth.google.getConnection,
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
      const result = (await (ctx as any).runAction(
        generatedApi.internal.oauth.googleClient.googleRequest,
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

      await (ctx as any).runMutation(
        generatedApi.internal.calendarSyncSubcalendars.storeBookingsCalendarId,
        {
          connectionId: args.connectionId,
          calendarId,
        }
      );

      // Refresh sub-calendar list to include the new one
      await (ctx as any).runAction(
        generatedApi.internal.calendarSyncSubcalendars.fetchAndStoreSubCalendars,
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
