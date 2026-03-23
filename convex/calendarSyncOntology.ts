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
// Lazy-load `api` and `internal` to avoid TS2589 deep type instantiation.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _apiModule: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getApiModule(): any {
  if (!_apiModule) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    _apiModule = require("./_generated/api");
  }
  return _apiModule;
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getInternal(): any { return getApiModule().internal; }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getApi(): any { return getApiModule().api; }

// ============================================================================
// RETRY HELPERS
// ============================================================================

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

const MICROSOFT_CALENDAR_READ_SCOPES = [
  "Calendars.Read",
  "Calendars.ReadWrite",
  "Calendars.Read.Shared",
  "Calendars.ReadWrite.Shared",
];

const MICROSOFT_CALENDAR_WRITE_SCOPES = [
  "Calendars.ReadWrite",
  "Calendars.ReadWrite.Shared",
];

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

function hasAnyScope(
  scopes: string[] | undefined,
  requiredScopes: readonly string[]
): boolean {
  if (!Array.isArray(scopes) || scopes.length === 0) {
    return false;
  }
  return scopes.some((scope) => requiredScopes.includes(scope));
}

function getCalendarScopeReadiness(provider: string, scopes: string[] | undefined) {
  if (provider === "microsoft") {
    return {
      canAccessCalendar: hasAnyScope(scopes, MICROSOFT_CALENDAR_READ_SCOPES),
      canWriteCalendar: hasAnyScope(scopes, MICROSOFT_CALENDAR_WRITE_SCOPES),
    };
  }

  if (provider === "google") {
    return {
      canAccessCalendar: hasAnyScope(scopes, GOOGLE_CALENDAR_READ_SCOPES),
      canWriteCalendar: hasAnyScope(scopes, GOOGLE_CALENDAR_WRITE_SCOPES),
    };
  }

  return {
    canAccessCalendar: false,
    canWriteCalendar: false,
  };
}

function normalizeCalendarId(value: unknown): string | undefined {
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
    const normalizedValue = normalizeCalendarId(value);
    if (normalizedValue) {
      normalized.add(normalizedValue);
    }
  }
  return Array.from(normalized);
}

type StoredSubCalendar = {
  calendarId: string;
  primary?: boolean;
};

function getStoredSubCalendars(connection: {
  customProperties?: unknown;
} | null): StoredSubCalendar[] {
  const cp = (connection?.customProperties || {}) as Record<string, unknown>;
  return Array.isArray(cp.subCalendars)
    ? (cp.subCalendars as StoredSubCalendar[])
    : [];
}

function getGooglePrimaryCalendarId(connection: {
  customProperties?: unknown;
} | null): string | undefined {
  return getStoredSubCalendars(connection).find((calendar) => calendar.primary)
    ?.calendarId;
}

function normalizeGoogleCalendarIdForConnection(
  connection: { customProperties?: unknown } | null,
  value: unknown
): string | undefined {
  const normalizedValue = normalizeCalendarId(value);
  if (!normalizedValue) {
    return undefined;
  }

  const primaryCalendarId = getGooglePrimaryCalendarId(connection);
  if (normalizedValue === "primary" && primaryCalendarId) {
    return primaryCalendarId;
  }
  if (primaryCalendarId && normalizedValue === primaryCalendarId) {
    return primaryCalendarId;
  }

  const subCalendars = getStoredSubCalendars(connection);
  if (subCalendars.length === 0) {
    return normalizedValue;
  }

  const knownCalendarIds = new Set(
    subCalendars
      .map((calendar) => normalizeCalendarId(calendar.calendarId))
      .filter((calendarId): calendarId is string => Boolean(calendarId))
  );
  return knownCalendarIds.has(normalizedValue) ? normalizedValue : undefined;
}

function getDefaultGoogleBlockingCalendarIds(connection: {
  customProperties?: unknown;
} | null): string[] {
  return [getGooglePrimaryCalendarId(connection) || "primary"];
}

function resolveGoogleBlockingCalendarIds(
  connection: { customProperties?: unknown } | null,
  requestedCalendarIds: unknown
): string[] {
  const normalizedIds = new Set<string>();
  for (const calendarId of normalizeStringArray(requestedCalendarIds)) {
    const normalizedCalendarId = normalizeGoogleCalendarIdForConnection(
      connection,
      calendarId
    );
    if (normalizedCalendarId) {
      normalizedIds.add(normalizedCalendarId);
    }
  }
  return normalizedIds.size > 0
    ? Array.from(normalizedIds)
    : getDefaultGoogleBlockingCalendarIds(connection);
}

function normalizeStoredSourceCalendarId(
  connection: { customProperties?: unknown } | null,
  provider: "external_google" | "external_microsoft",
  value: unknown
): string | undefined {
  if (provider === "external_google") {
    return normalizeGoogleCalendarIdForConnection(connection, value)
      || getDefaultGoogleBlockingCalendarIds(connection)[0];
  }
  return normalizeCalendarId(value) || "primary";
}

function buildExternalCalendarEventRecordKey(
  provider: string,
  connectionId: string,
  calendarId?: string | null
): string {
  return `${provider}:${connectionId}:${normalizeCalendarId(calendarId) || "default"}`;
}

type ExternalCalendarEventRecord = {
  key: string;
  originalKey: string;
  provider: "google" | "microsoft";
  connectionId: string;
  externalEventId: string;
  calendarId: string | null;
};

function readExternalCalendarEventRecords(
  value: unknown
): ExternalCalendarEventRecord[] {
  if (!value || typeof value !== "object") {
    return [];
  }

  const records: ExternalCalendarEventRecord[] = [];
  for (const [key, rawValue] of Object.entries(
    value as Record<string, unknown>
  )) {
    if (!rawValue || typeof rawValue !== "object") {
      continue;
    }
    const rawRecord = rawValue as Record<string, unknown>;
    const provider = (() => {
      const explicitProvider = normalizeCalendarId(rawRecord.provider);
      if (explicitProvider === "google" || explicitProvider === "microsoft") {
        return explicitProvider;
      }
      if (key === "google" || key === "microsoft") {
        return key;
      }
      const derivedProvider = key.split(":")[0];
      return derivedProvider === "google" || derivedProvider === "microsoft"
        ? derivedProvider
        : null;
    })();
    const connectionId = normalizeCalendarId(rawRecord.connectionId);
    const externalEventId = normalizeCalendarId(rawRecord.externalEventId);
    if (!provider || !connectionId || !externalEventId) {
      continue;
    }

    const rawCalendarId =
      provider === "google"
        ? normalizeCalendarId(rawRecord.calendarId) || "primary"
        : normalizeCalendarId(rawRecord.calendarId) || null;
    records.push({
      key:
        key === "google" || key === "microsoft"
          ? buildExternalCalendarEventRecordKey(
              provider,
              connectionId,
              rawCalendarId
            )
          : key,
      originalKey: key,
      provider,
      connectionId,
      externalEventId,
      calendarId: rawCalendarId,
    });
  }

  return records;
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

/**
 * Planner-facing calendar readiness for OAuth-backed write operations.
 * Exposes mode-aware readiness (work/private) without changing OAuth/token contracts.
 */
export const getPlannerCalendarWriteReadiness = query({
  args: {
    sessionId: v.string(),
    provider: v.optional(v.union(v.literal("google"), v.literal("microsoft"))),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId as Id<"sessions">);
    if (!session || session.expiresAt < Date.now()) return null;

    const user = await ctx.db.get(session.userId);
    if (!user || !user.defaultOrgId) return null;

    const providers: Array<"google" | "microsoft"> = args.provider
      ? [args.provider]
      : ["google", "microsoft"];
    const readiness: Record<string, unknown> = {};

    for (const provider of providers) {
      const providerConnections = await ctx.db
        .query("oauthConnections")
        .withIndex("by_org_and_provider", (q) =>
          q.eq("organizationId", user.defaultOrgId as Id<"organizations">).eq("provider", provider)
        )
        .filter((q) => q.neq(q.field("status"), "revoked"))
        .collect();

      const personal = providerConnections.find(
        (conn) => conn.connectionType === "personal" && conn.userId === user._id
      );
      const organizational = providerConnections.find(
        (conn) => conn.connectionType === "organizational"
      );

      const workConnection = organizational || personal || null;
      const privateConnection = personal || organizational || null;

      const buildModeReadiness = (connection: typeof personal | null) => {
        if (!connection) {
          return {
            hasConnection: false,
            connectionId: null,
            connectionType: null,
            email: null,
            status: null,
            syncEnabled: false,
            scopes: [],
            canAccessCalendar: false,
            canWriteCalendar: false,
            calendarWriteReady: false,
            lastSyncAt: null,
            lastSyncError: null,
          };
        }

        const scopeReadiness = getCalendarScopeReadiness(
          provider,
          connection.scopes
        );
        const syncEnabled =
          ((connection.syncSettings || {}) as Record<string, unknown>).calendar ===
          true;
        const isActive = connection.status === "active";

        return {
          hasConnection: true,
          connectionId: connection._id,
          connectionType: connection.connectionType,
          email: connection.providerEmail,
          status: connection.status,
          syncEnabled,
          scopes: connection.scopes,
          canAccessCalendar: scopeReadiness.canAccessCalendar,
          canWriteCalendar: scopeReadiness.canWriteCalendar,
          calendarWriteReady:
            isActive && syncEnabled && scopeReadiness.canWriteCalendar,
          lastSyncAt: connection.lastSyncAt || null,
          lastSyncError: connection.lastSyncError || null,
        };
      };

      readiness[provider] = {
        provider,
        hasPersonalConnection: Boolean(personal),
        hasOrganizationalConnection: Boolean(organizational),
        recommendedWorkConnectionType: organizational
          ? "organizational"
          : personal
            ? "personal"
            : "none",
        recommendedPrivateConnectionType: personal
          ? "personal"
          : organizational
            ? "organizational"
            : "none",
        work: buildModeReadiness(workConnection),
        private: buildModeReadiness(privateConnection),
      };
    }

    return {
      generatedAt: Date.now(),
      providerFilter: args.provider || "all",
      readiness,
    };
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

/**
 * Return concrete resource IDs linked to a calendar connection.
 * Excludes org-level calendar settings sentinel objects.
 */
export const getConnectionLinkedResourceIds = internalQuery({
  args: {
    connectionId: v.id("oauthConnections"),
  },
  handler: async (ctx, args) => {
    const connection = await ctx.db.get(args.connectionId);
    if (!connection) {
      return [] as Id<"objects">[];
    }

    const links = await ctx.db
      .query("objectLinks")
      .withIndex("by_org_link_type", (q) =>
        q
          .eq("organizationId", connection.organizationId)
          .eq("linkType", "calendar_linked_to")
      )
      .collect();

    const resourceIds = new Set<Id<"objects">>();
    for (const link of links) {
      const cp = (link.properties || {}) as Record<string, unknown>;
      if (String(cp.connectionId || "") !== String(args.connectionId)) {
        continue;
      }

      const linkedObject = await ctx.db.get(link.toObjectId);
      if (!linkedObject || linkedObject.type === "calendar_settings") {
        continue;
      }
      resourceIds.add(link.toObjectId);
    }

    return Array.from(resourceIds);
  },
});

/**
 * Resolve Google calendar readiness and busy-event overlaps for a date range.
 * Used by pharmacist vacation policy evaluation.
 */
export const getGoogleCalendarConflictSnapshotInternal = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    connectionId: v.id("oauthConnections"),
    startDateTime: v.number(),
    endDateTime: v.number(),
    blockingCalendarIds: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const blockedReasons: string[] = [];
    const connection = await ctx.db.get(args.connectionId);
    if (!connection) {
      blockedReasons.push("missing_google_calendar_connection");
      return {
        status: "blocked" as const,
        blockedReasons,
        conflicts: [] as Array<{
          eventId: string;
          calendarId: string;
          startDateTime: number;
          endDateTime: number;
          source: "external_calendar";
        }>,
      };
    }

    if (connection.organizationId !== args.organizationId) {
      blockedReasons.push("google_calendar_connection_org_mismatch");
    }
    if (connection.provider !== "google") {
      blockedReasons.push("google_calendar_provider_mismatch");
    }
    if (connection.status !== "active") {
      blockedReasons.push("google_calendar_connection_inactive");
    }

    const syncSettings = (connection.syncSettings || {}) as Record<string, unknown>;
    if (syncSettings.calendar !== true) {
      blockedReasons.push("google_calendar_sync_disabled");
    }

    const scopeReadiness = getCalendarScopeReadiness("google", connection.scopes);
    if (!scopeReadiness.canAccessCalendar) {
      blockedReasons.push("missing_google_calendar_read_scope");
    }

    const blockingCalendarIds = resolveGoogleBlockingCalendarIds(
      connection,
      args.blockingCalendarIds
    );

    if (blockedReasons.length > 0) {
      return {
        status: "blocked" as const,
        blockedReasons,
        conflicts: [] as Array<{
          eventId: string;
          calendarId: string;
          startDateTime: number;
          endDateTime: number;
          source: "external_calendar";
        }>,
      };
    }

    const events = await ctx.db
      .query("objects")
      .withIndex("by_type", (q) => q.eq("type", "calendar_event"))
      .filter((q) =>
        q.and(
          q.eq(q.field("organizationId"), args.organizationId),
          q.eq(q.field("subtype"), "external_google"),
          q.neq(q.field("status"), "deleted")
        )
      )
      .collect();

    const conflicts: Array<{
      eventId: string;
      calendarId: string;
      startDateTime: number;
      endDateTime: number;
      source: "external_calendar";
    }> = [];

    for (const event of events) {
      const cp = (event.customProperties || {}) as Record<string, unknown>;
      if (String(cp.connectionId || "") !== String(args.connectionId)) {
        continue;
      }
      if (cp.isBusy === false) {
        continue;
      }

      const startDateTime =
        typeof cp.startDateTime === "number" ? cp.startDateTime : undefined;
      const endDateTime =
        typeof cp.endDateTime === "number" ? cp.endDateTime : undefined;
      if (!startDateTime || !endDateTime) {
        continue;
      }
      if (startDateTime >= args.endDateTime || endDateTime <= args.startDateTime) {
        continue;
      }

      const sourceCalendarId =
        normalizeStoredSourceCalendarId(
          connection,
          "external_google",
          cp.sourceCalendarId
        ) || getDefaultGoogleBlockingCalendarIds(connection)[0];
      if (!blockingCalendarIds.includes(sourceCalendarId)) {
        continue;
      }

      conflicts.push({
        eventId: String(event._id),
        calendarId: sourceCalendarId,
        startDateTime,
        endDateTime,
        source: "external_calendar",
      });
    }

    return {
      status: "resolved" as const,
      blockedReasons: [] as string[],
      conflicts,
      blockingCalendarIds,
      scopeReadiness,
    };
  },
});

/**
 * Resolve busy windows for a single OAuth calendar connection across providers.
 * Supports Google + Microsoft synced calendar_event mirrors for overlap checks.
 */
export const getConnectionBusyWindowsInternal = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    connectionId: v.id("oauthConnections"),
    startDateTime: v.number(),
    endDateTime: v.number(),
    blockingCalendarIds: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const blockedReasons: string[] = [];
    const connection = await ctx.db.get(args.connectionId);
    if (!connection) {
      blockedReasons.push("missing_calendar_connection");
      return {
        status: "blocked" as const,
        blockedReasons,
        busyWindows: [] as Array<{
          eventId: string;
          startDateTime: number;
          endDateTime: number;
          provider: "google" | "microsoft";
          sourceCalendarId?: string;
        }>,
      };
    }

    if (connection.organizationId !== args.organizationId) {
      blockedReasons.push("calendar_connection_org_mismatch");
    }
    const provider =
      connection.provider === "google" || connection.provider === "microsoft"
        ? connection.provider
        : null;
    if (!provider) {
      blockedReasons.push("calendar_provider_not_supported");
    }
    if (connection.status !== "active") {
      blockedReasons.push("calendar_connection_inactive");
    }

    const syncSettings = (connection.syncSettings || {}) as Record<string, unknown>;
    if (syncSettings.calendar !== true) {
      blockedReasons.push("calendar_sync_disabled");
    }

    const scopeReadiness = getCalendarScopeReadiness(
      provider || "",
      connection.scopes
    );
    if (!scopeReadiness.canAccessCalendar) {
      blockedReasons.push("missing_calendar_read_scope");
    }

    const blockingCalendarIds =
      provider === "google"
        ? resolveGoogleBlockingCalendarIds(connection, args.blockingCalendarIds)
        : [];

    if (blockedReasons.length > 0) {
      return {
        status: "blocked" as const,
        blockedReasons,
        busyWindows: [] as Array<{
          eventId: string;
          startDateTime: number;
          endDateTime: number;
          provider: "google" | "microsoft";
          sourceCalendarId?: string;
        }>,
      };
    }

    const resolvedProvider = provider as "google" | "microsoft";

    const subtype = resolvedProvider === "google"
      ? "external_google"
      : "external_microsoft";

    const events = await ctx.db
      .query("objects")
      .withIndex("by_type", (q) => q.eq("type", "calendar_event"))
      .filter((q) =>
        q.and(
          q.eq(q.field("organizationId"), args.organizationId),
          q.eq(q.field("subtype"), subtype),
          q.neq(q.field("status"), "deleted")
        )
      )
      .collect();

    const busyWindows: Array<{
      eventId: string;
      startDateTime: number;
      endDateTime: number;
      provider: "google" | "microsoft";
      sourceCalendarId?: string;
    }> = [];

    for (const event of events) {
      const cp = (event.customProperties || {}) as Record<string, unknown>;
      if (String(cp.connectionId || "") !== String(args.connectionId)) {
        continue;
      }
      if (cp.isBusy === false) {
        continue;
      }

      const startDateTime =
        typeof cp.startDateTime === "number" ? cp.startDateTime : undefined;
      const endDateTime =
        typeof cp.endDateTime === "number" ? cp.endDateTime : undefined;
      if (!startDateTime || !endDateTime) {
        continue;
      }
      if (startDateTime >= args.endDateTime || endDateTime <= args.startDateTime) {
        continue;
      }

      const sourceCalendarId =
        resolvedProvider === "google"
          ? normalizeStoredSourceCalendarId(
              connection,
              "external_google",
              cp.sourceCalendarId
            ) || getDefaultGoogleBlockingCalendarIds(connection)[0]
          : undefined;
      if (
        resolvedProvider === "google" &&
        blockingCalendarIds.length > 0 &&
        (!sourceCalendarId || !blockingCalendarIds.includes(sourceCalendarId))
      ) {
        continue;
      }

      busyWindows.push({
        eventId: String(event._id),
        startDateTime,
        endDateTime,
        provider: resolvedProvider,
        sourceCalendarId,
      });
    }

    return {
      status: "resolved" as const,
      blockedReasons: [] as string[],
      provider: resolvedProvider,
      busyWindows,
      blockingCalendarIds:
        resolvedProvider === "google" ? blockingCalendarIds : undefined,
      scopeReadiness,
    };
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
    sourceCalendarId: v.optional(v.string()),
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
    const connection =
      args.provider === "external_google"
        ? await ctx.db.get(args.connectionId)
        : null;
    const normalizedSourceCalendarId = normalizeStoredSourceCalendarId(
      connection,
      args.provider,
      args.sourceCalendarId
    ) || "primary";
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
      const existingCalendarId =
        normalizeStoredSourceCalendarId(connection, args.provider, cp.sourceCalendarId)
        || "primary";
      return (
        cp.externalEventId === args.externalEventId &&
        cp.connectionId === args.connectionId &&
        existingCalendarId === normalizedSourceCalendarId
      );
    });

    const customProperties = {
      externalEventId: args.externalEventId,
      connectionId: args.connectionId,
      sourceCalendarId: normalizedSourceCalendarId,
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
    sourceCalendarId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const connection =
      args.provider === "external_google"
        ? await ctx.db.get(args.connectionId)
        : null;
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
    const requestedSourceCalendarId =
      args.provider === "external_google"
        ? normalizeStoredSourceCalendarId(
            connection,
            args.provider,
            args.sourceCalendarId
          ) || undefined
        : normalizeCalendarId(args.sourceCalendarId) || undefined;
    for (const event of events) {
      const cp = (event.customProperties || {}) as Record<string, unknown>;
      if (cp.connectionId !== args.connectionId) continue;
      const eventSourceCalendarId =
        normalizeStoredSourceCalendarId(connection, args.provider, cp.sourceCalendarId)
        || "primary";
      if (
        requestedSourceCalendarId &&
        eventSourceCalendarId !== requestedSourceCalendarId
      ) {
        continue;
      }

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
 * Soft-delete Google events that belong to calendars no longer selected as blockers.
 */
export const deactivateExternalEventsOutsideBlockingSelection = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    connectionId: v.id("oauthConnections"),
    activeSourceCalendarIds: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const connection = await ctx.db.get(args.connectionId);
    const allowedCalendarIds = new Set(
      resolveGoogleBlockingCalendarIds(connection, args.activeSourceCalendarIds)
    );
    const events = await ctx.db
      .query("objects")
      .withIndex("by_type", (q) => q.eq("type", "calendar_event"))
      .filter((q) =>
        q.and(
          q.eq(q.field("organizationId"), args.organizationId),
          q.eq(q.field("subtype"), "external_google"),
          q.neq(q.field("status"), "deleted")
        )
      )
      .collect();

    let deletedCount = 0;
    for (const event of events) {
      const cp = (event.customProperties || {}) as Record<string, unknown>;
      if (String(cp.connectionId || "") !== String(args.connectionId)) {
        continue;
      }
      const sourceCalendarId =
        normalizeStoredSourceCalendarId(
          connection,
          "external_google",
          cp.sourceCalendarId
        ) || getDefaultGoogleBlockingCalendarIds(connection)[0];
      if (allowedCalendarIds.has(sourceCalendarId)) {
        continue;
      }
      await ctx.db.patch(event._id, {
        status: "deleted",
        updatedAt: Date.now(),
      });
      deletedCount++;
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
      getInternal().oauth.google.getConnection,
      { connectionId: args.connectionId }
    );
    if (!connection || connection.status !== "active")
      return { success: false, error: "Invalid connection" };

    try {
      const syncSettings = (connection.syncSettings || {}) as Record<string, unknown>;
      if (syncSettings.calendar !== true) {
        const error = "Google Calendar sync is disabled for this connection";
        await ctx.runMutation(
          getInternal().calendarSyncOntology.updateSyncTimestamp,
          {
            connectionId: args.connectionId,
            error,
          }
        );
        return { success: false, error };
      }

      const scopeReadiness = getCalendarScopeReadiness(
        "google",
        connection.scopes
      );
      if (!scopeReadiness.canAccessCalendar) {
        const error = "Google Calendar read scope missing";
        await ctx.runMutation(
          getInternal().calendarSyncOntology.updateSyncTimestamp,
          {
            connectionId: args.connectionId,
            error,
          }
        );
        return { success: false, error };
      }

      const now = new Date();
      const timeMin = new Date(
        now.getTime() - 7 * 24 * 60 * 60 * 1000
      ).toISOString();
      const timeMax = new Date(
        now.getTime() + 23 * 24 * 60 * 60 * 1000
      ).toISOString();

      const blockingSnapshot = await ctx.runQuery(
        getInternal().calendarSyncSubcalendars.getConnectionBlockingCalendarSnapshot,
        { connectionId: args.connectionId }
      );
      const calendarIdsToSync = resolveGoogleBlockingCalendarIds(
        connection,
        (blockingSnapshot?.blockingCalendarIds as string[] | undefined) || [
          "primary",
        ]
      );
      const linkedResourceIds = await ctx.runQuery(
        getInternal().calendarSyncOntology.getConnectionLinkedResourceIds,
        { connectionId: args.connectionId }
      );

      let syncedCount = 0;
      for (const calendarId of calendarIdsToSync) {
        let result: Record<string, unknown> | null = null;
        for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
          try {
            result = (await ctx.runAction(getApi().oauth.googleClient.getCalendarEvents, {
              connectionId: args.connectionId,
              calendarId,
              timeMin,
              timeMax,
              maxResults: 250,
            })) as Record<string, unknown> | null;
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
            getInternal().calendarSyncOntology.updateSyncTimestamp,
            {
              connectionId: args.connectionId,
              error: `No response from Google Calendar API for ${calendarId}`,
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

          const syncedEventId = await ctx.runMutation(
            getInternal().calendarSyncOntology.upsertExternalEvent,
            {
              organizationId: connection.organizationId,
              connectionId: args.connectionId,
              externalEventId: eventId,
              sourceCalendarId: calendarId,
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

          for (const resourceId of linkedResourceIds as Id<"objects">[]) {
            await ctx.runMutation(
              getInternal().calendarSyncOntology.linkExternalEventToResource,
              {
                eventId: syncedEventId,
                resourceId,
                organizationId: connection.organizationId,
              }
            );
          }
        }

        await ctx.runMutation(
          getInternal().calendarSyncOntology.deleteStaleEvents,
          {
            organizationId: connection.organizationId,
            connectionId: args.connectionId,
            provider: "external_google",
            activeExternalEventIds: activeIds,
            sourceCalendarId: calendarId,
          }
        );
        syncedCount += items.length;
      }

      await ctx.runMutation(
        getInternal().calendarSyncOntology.deactivateExternalEventsOutsideBlockingSelection,
        {
          organizationId: connection.organizationId,
          connectionId: args.connectionId,
          activeSourceCalendarIds: calendarIdsToSync,
        }
      );

      await ctx.runMutation(
        getInternal().calendarSyncOntology.updateSyncTimestamp,
        { connectionId: args.connectionId }
      );

      return { success: true, syncedCount };
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : "Unknown sync error";
      await ctx.runMutation(
        getInternal().calendarSyncOntology.updateSyncTimestamp,
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
      getInternal().oauth.google.getConnection,
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
            getInternal().oauth.graphClient.graphRequest,
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
          getInternal().calendarSyncOntology.updateSyncTimestamp,
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
          getInternal().calendarSyncOntology.upsertExternalEvent,
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
        getInternal().calendarSyncOntology.deleteStaleEvents,
        {
          organizationId: connection.organizationId,
          connectionId: args.connectionId,
          provider: "external_microsoft",
          activeExternalEventIds: activeIds,
        }
      );

      await ctx.runMutation(
        getInternal().calendarSyncOntology.updateSyncTimestamp,
        { connectionId: args.connectionId }
      );

      return { success: true, syncedCount: items.length };
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : "Unknown sync error";
      await ctx.runMutation(
        getInternal().calendarSyncOntology.updateSyncTimestamp,
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
      getInternal().calendarSyncOntology.getActiveSyncConnections,
      {}
    );

    let successCount = 0;
    let errorCount = 0;

    for (const conn of connections) {
      try {
        let result: { success?: boolean; error?: string } | null = null;
        if (conn.provider === "google") {
          result = await ctx.runAction(
            getInternal().calendarSyncOntology.syncFromGoogle,
            { connectionId: conn._id }
          );
        } else if (conn.provider === "microsoft") {
          result = await ctx.runAction(
            getInternal().calendarSyncOntology.syncFromMicrosoft,
            { connectionId: conn._id }
          );
        }

        if (result?.success === false) {
          errorCount++;
          console.error(
            `Calendar sync failed for connection ${conn._id} (${conn.provider}): ${result.error || "Unknown sync failure"}`
          );
          continue;
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

    const connections: Array<{
      connectionId: Id<"oauthConnections">;
      provider: string;
      pushCalendarId: string | null;
    }> = [];
    const orgDefaultLinks = new Map<
      string,
      { pushCalendarId: string | null }
    >();
    const resourceLinks = new Map<
      string,
      { pushCalendarId: string | null | undefined }
    >();

    for (const link of links) {
      const cp = (link.properties || {}) as Record<string, unknown>;
      const connectionId = normalizeCalendarId(cp.connectionId);
      if (!connectionId) continue;

      const linkedObject = await ctx.db.get(link.toObjectId);
      const normalizedPushCalendarId = normalizeCalendarId(cp.pushCalendarId) || null;
      const hasExplicitPushCalendarId = Object.prototype.hasOwnProperty.call(
        cp,
        "pushCalendarId"
      );

      if (link.toObjectId === args.resourceId) {
        resourceLinks.set(connectionId, {
          pushCalendarId: hasExplicitPushCalendarId
            ? normalizedPushCalendarId
            : undefined,
        });
        continue;
      }

      if (
        linkedObject?.type === "calendar_settings" &&
        linkedObject.subtype === "org_default"
      ) {
        orgDefaultLinks.set(connectionId, {
          pushCalendarId: normalizedPushCalendarId,
        });
      }
    }

    const candidateConnectionIds = new Set<string>([
      ...Array.from(resourceLinks.keys()),
      ...Array.from(orgDefaultLinks.keys()),
    ]);

    for (const connectionId of candidateConnectionIds) {
      const connection = await ctx.db.get(connectionId as Id<"oauthConnections">);
      if (!connection || connection.status !== "active") continue;

      const syncSettings = (connection.syncSettings || {}) as Record<string, unknown>;
      if (syncSettings.calendar !== true) continue;

      const resourceLink = resourceLinks.get(connectionId);
      const orgDefaultLink = orgDefaultLinks.get(connectionId);
      const pushCalendarId =
        resourceLink && resourceLink.pushCalendarId !== undefined
          ? resourceLink.pushCalendarId
          : orgDefaultLink?.pushCalendarId || null;
      const normalizedPushCalendarId =
        connection.provider === "google"
          ? normalizeGoogleCalendarIdForConnection(connection, pushCalendarId) || null
          : null;

      connections.push({
        connectionId: connection._id,
        provider: connection.provider,
        pushCalendarId: normalizedPushCalendarId,
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
    provider: v.union(v.literal("google"), v.literal("microsoft")),
    externalEventId: v.string(),
    connectionId: v.id("oauthConnections"),
    calendarId: v.optional(v.string()),
    legacyKeyToRemove: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const booking = await ctx.db.get(args.bookingId);
    if (!booking) return;

    const currentProps = (booking.customProperties || {}) as Record<string, unknown>;
    const externalCalendarEvents = {
      ...((currentProps.externalCalendarEvents || {}) as Record<string, unknown>),
    };
    const calendarId =
      args.provider === "google"
        ? normalizeCalendarId(args.calendarId) || "primary"
        : null;
    const recordKey = buildExternalCalendarEventRecordKey(
      args.provider,
      String(args.connectionId),
      calendarId
    );
    if (args.legacyKeyToRemove && args.legacyKeyToRemove !== recordKey) {
      delete externalCalendarEvents[args.legacyKeyToRemove];
    }

    await ctx.db.patch(args.bookingId, {
      customProperties: {
        ...currentProps,
        externalCalendarEvents: {
          ...externalCalendarEvents,
          [recordKey]: {
            provider: args.provider,
            externalEventId: args.externalEventId,
            connectionId: args.connectionId,
            calendarId,
            pushedAt: Date.now(),
          },
        },
      },
      updatedAt: Date.now(),
    });
  },
});

export const removeStoredExternalEventId = internalMutation({
  args: {
    bookingId: v.id("objects"),
    recordKey: v.string(),
    legacyKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const booking = await ctx.db.get(args.bookingId);
    if (!booking) return;

    const currentProps = (booking.customProperties || {}) as Record<string, unknown>;
    const externalCalendarEvents = {
      ...((currentProps.externalCalendarEvents || {}) as Record<string, unknown>),
    };
    delete externalCalendarEvents[args.recordKey];
    if (args.legacyKey) {
      delete externalCalendarEvents[args.legacyKey];
    }

    await ctx.db.patch(args.bookingId, {
      customProperties: {
        ...currentProps,
        externalCalendarEvents,
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
      getInternal().bookingOntology.getBookingInternal,
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
        getInternal().calendarSyncOntology.getBookingResourceLinks,
        { bookingId: args.bookingId }
      );
      resourceIds.push(...links.map((l: { resourceId: string }) => l.resourceId));
    }

    if (resourceIds.length === 0) {
      return { success: false, error: "No linked resources" };
    }

    const desiredTargets = new Map<
      string,
      {
        provider: "google" | "microsoft";
        connectionId: Id<"oauthConnections">;
        calendarId: string | null;
      }
    >();
    const uniqueResourceIds = Array.from(new Set(resourceIds.map((resourceId) => String(resourceId))));

    for (const resourceId of uniqueResourceIds) {
      const connections = await ctx.runQuery(
        getInternal().calendarSyncOntology.getResourceCalendarConnections,
        {
          resourceId: resourceId as Id<"objects">,
          organizationId: booking.organizationId,
        }
      );

      for (const conn of connections as Array<{
        connectionId: Id<"oauthConnections">;
        provider: string;
        pushCalendarId: string | null;
      }>) {
        if (conn.provider !== "google" && conn.provider !== "microsoft") {
          continue;
        }

        const calendarId =
          conn.provider === "google"
            ? normalizeCalendarId(conn.pushCalendarId)
            : null;
        if (conn.provider === "google" && !calendarId) {
          continue;
        }

        desiredTargets.set(
          buildExternalCalendarEventRecordKey(
            conn.provider,
            String(conn.connectionId),
            calendarId
          ),
          {
            provider: conn.provider,
            connectionId: conn.connectionId,
            calendarId: calendarId || null,
          }
        );
      }
    }

    const existingRecords = readExternalCalendarEventRecords(
      bookingProps.externalCalendarEvents
    );
    const existingRecordByKey = new Map(
      existingRecords.map((record) => [record.key, record])
    );

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

    let pushCount = 0;
    let deleteCount = 0;

    for (const record of existingRecords) {
      if (desiredTargets.has(record.key)) {
        continue;
      }
      try {
        if (record.provider === "google") {
          await ctx.runAction(getApi().oauth.googleClient.deleteCalendarEvent, {
            connectionId: record.connectionId as Id<"oauthConnections">,
            eventId: record.externalEventId,
            calendarId: record.calendarId || "primary",
          });
        } else {
          await ctx.runAction(getApi().oauth.graphClient.deleteCalendarEvent, {
            connectionId: record.connectionId as Id<"oauthConnections">,
            eventId: record.externalEventId,
          });
        }

        await ctx.runMutation(
          getInternal().calendarSyncOntology.removeStoredExternalEventId,
          {
            bookingId: args.bookingId,
            recordKey: record.key,
            legacyKey: record.originalKey !== record.key ? record.originalKey : undefined,
          }
        );
        deleteCount++;
      } catch (error) {
        console.error(
          `Failed to reconcile stale ${record.provider} calendar event:`,
          error instanceof Error ? error.message : error
        );
      }
    }

    for (const [recordKey, target] of desiredTargets.entries()) {
      try {
        const connection = await ctx.runQuery(
          getInternal().oauth.google.getConnection,
          { connectionId: target.connectionId }
        );
        if (!connection) {
          continue;
        }

        const syncSettings = (connection.syncSettings || {}) as Record<string, unknown>;
        const scopeReadiness = getCalendarScopeReadiness(
          target.provider,
          connection.scopes
        );
        if (
          connection.status !== "active" ||
          syncSettings.calendar !== true ||
          !scopeReadiness.canWriteCalendar
        ) {
          console.error(
            `Skipping ${target.provider} calendar write for ${target.connectionId}: connection not write-ready`
          );
          continue;
        }

        const existingRecord = existingRecordByKey.get(recordKey);
        let externalEventId: string | null = existingRecord?.externalEventId || null;

        if (target.provider === "google") {
          const calendarId =
            normalizeGoogleCalendarIdForConnection(connection, target.calendarId) ||
            "primary";
          const eventData = {
            summary: eventTitle,
            description: eventDescription,
            start: { dateTime: startISO, timeZone: "UTC" },
            end: { dateTime: endISO, timeZone: "UTC" },
            status: "confirmed",
          };

          if (existingRecord?.externalEventId) {
            const result = await ctx.runAction(
              getApi().oauth.googleClient.updateCalendarEvent,
              {
                connectionId: target.connectionId,
                calendarId,
                eventId: existingRecord.externalEventId,
                eventData,
              }
            );
            externalEventId =
              normalizeCalendarId((result as Record<string, unknown> | null)?.id) ||
              existingRecord.externalEventId;
          } else {
            const result = await ctx.runAction(
              getApi().oauth.googleClient.createCalendarEvent,
              {
                connectionId: target.connectionId,
                calendarId,
                eventData,
              }
            );
            externalEventId =
              normalizeCalendarId(
                (result as Record<string, unknown> | null)?.id
              ) || null;
          }

          if (externalEventId) {
            await ctx.runMutation(
              getInternal().calendarSyncOntology.storeExternalEventId,
              {
                bookingId: args.bookingId,
                provider: "google",
                externalEventId,
                connectionId: target.connectionId,
                calendarId,
                legacyKeyToRemove:
                  existingRecord && existingRecord.originalKey !== existingRecord.key
                    ? existingRecord.originalKey
                    : undefined,
              }
            );
            pushCount++;
          }
          continue;
        }

        const eventData = {
          subject: eventTitle,
          body: { contentType: "text", content: eventDescription },
          start: { dateTime: startISO, timeZone: "UTC" },
          end: { dateTime: endISO, timeZone: "UTC" },
          showAs: "busy",
        };
        if (existingRecord?.externalEventId) {
          const result = await ctx.runAction(
            getApi().oauth.graphClient.updateCalendarEvent,
            {
              connectionId: target.connectionId,
              eventId: existingRecord.externalEventId,
              eventData,
            }
          );
          externalEventId =
            normalizeCalendarId((result as Record<string, unknown> | null)?.id) ||
            existingRecord.externalEventId;
        } else {
          const result = await ctx.runAction(
            getApi().oauth.graphClient.createCalendarEvent,
            {
              connectionId: target.connectionId,
              eventData,
            }
          );
          externalEventId =
            normalizeCalendarId(
              (result as Record<string, unknown> | null)?.id
            ) || null;
        }

        if (externalEventId) {
          await ctx.runMutation(
            getInternal().calendarSyncOntology.storeExternalEventId,
            {
              bookingId: args.bookingId,
              provider: "microsoft",
              externalEventId,
              connectionId: target.connectionId,
              legacyKeyToRemove:
                existingRecord && existingRecord.originalKey !== existingRecord.key
                  ? existingRecord.originalKey
                  : undefined,
            }
          );
          pushCount++;
        }
      } catch (error) {
        console.error(
          `Failed to reconcile booking calendar push for ${target.provider}:`,
          error instanceof Error ? error.message : error
        );
      }
    }

    return {
      success: true,
      pushCount,
      deleteCount,
      targetCount: desiredTargets.size,
    };
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
      getInternal().bookingOntology.getBookingInternal,
      { bookingId: args.bookingId, organizationId: args.organizationId }
    );

    if (!booking) return { success: false, error: "Booking not found" };

    const bookingProps = (booking.customProperties || {}) as Record<string, unknown>;
    const externalEvents = readExternalCalendarEventRecords(
      bookingProps.externalCalendarEvents
    );

    let deleteCount = 0;

    for (const eventInfo of externalEvents) {
      try {
        if (eventInfo.provider === "google") {
          await ctx.runAction(
            getApi().oauth.googleClient.deleteCalendarEvent,
            {
              connectionId: eventInfo.connectionId as Id<"oauthConnections">,
              eventId: eventInfo.externalEventId,
              calendarId: eventInfo.calendarId || "primary",
            }
          );
          deleteCount++;
        } else if (eventInfo.provider === "microsoft") {
          await ctx.runAction(
            getApi().oauth.graphClient.deleteCalendarEvent,
            {
              connectionId: eventInfo.connectionId as Id<"oauthConnections">,
              eventId: eventInfo.externalEventId,
            }
          );
          deleteCount++;
        }
        await ctx.runMutation(
          getInternal().calendarSyncOntology.removeStoredExternalEventId,
          {
            bookingId: args.bookingId,
            recordKey: eventInfo.key,
            legacyKey:
              eventInfo.originalKey !== eventInfo.key
                ? eventInfo.originalKey
                : undefined,
          }
        );
      } catch (error) {
        console.error(
          `Failed to delete booking from ${eventInfo.provider}:`,
          error instanceof Error ? error.message : error
        );
      }
    }

    return { success: true, deleteCount };
  },
});
