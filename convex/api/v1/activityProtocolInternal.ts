/**
 * ACTIVITY PROTOCOL INTERNAL
 *
 * Internal queries and mutations for Activity Protocol API.
 * These are called by the HTTP handlers and should not be exposed publicly.
 *
 * Features:
 * - Event logging with rolling window retention
 * - Page/screen detection and management
 * - Object binding configuration
 * - Activity statistics
 */

import { internalQuery, internalMutation } from "../../_generated/server";
import { v } from "convex/values";
import type { Id } from "../../_generated/dataModel";

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate CLI Token (Internal)
 *
 * Validates a CLI session token and returns user context.
 */
export const validateCliTokenInternal = internalQuery({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args): Promise<{
    userId: Id<"users">;
    email: string;
    organizationId: Id<"organizations">;
  } | null> => {
    // Find CLI session by token
    const session = await ctx.db
      .query("cliSessions")
      .withIndex("by_token", (q) => q.eq("cliToken", args.token))
      .first();

    if (!session) {
      return null;
    }

    // Check expiration
    if (session.expiresAt < Date.now()) {
      return null;
    }

    return {
      userId: session.userId,
      email: session.email,
      organizationId: session.organizationId,
    };
  },
});

/**
 * Check Organization Access (Internal)
 *
 * Verifies that a user has access to an organization.
 */
export const checkOrgAccessInternal = internalQuery({
  args: {
    userId: v.id("users"),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args): Promise<boolean> => {
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_user_and_org", (q) =>
        q.eq("userId", args.userId).eq("organizationId", args.organizationId)
      )
      .first();

    return membership !== null && membership.isActive === true;
  },
});

// ============================================================================
// ACTIVITY EVENTS
// ============================================================================

/**
 * Log Activity Event (Internal)
 *
 * Creates a new activity event with rolling window expiration.
 */
export const logActivityEventInternal = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    applicationId: v.id("objects"),
    eventType: v.string(),
    severity: v.union(
      v.literal("debug"),
      v.literal("info"),
      v.literal("warning"),
      v.literal("error")
    ),
    category: v.string(),
    summary: v.string(),
    details: v.optional(
      v.object({
        requestId: v.optional(v.string()),
        method: v.optional(v.string()),
        endpoint: v.optional(v.string()),
        statusCode: v.optional(v.number()),
        objectType: v.optional(v.string()),
        objectId: v.optional(v.id("objects")),
        objectName: v.optional(v.string()),
        inputSummary: v.optional(v.string()),
        outputSummary: v.optional(v.string()),
        syncDirection: v.optional(v.string()),
        recordsAffected: v.optional(v.number()),
        durationMs: v.optional(v.number()),
        errorCode: v.optional(v.string()),
        errorMessage: v.optional(v.string()),
        stackTrace: v.optional(v.string()),
        sourceFile: v.optional(v.string()),
        sourceLine: v.optional(v.number()),
        correlationId: v.optional(v.string()),
      })
    ),
    pageId: v.optional(v.id("objects")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Get retention settings (default 7 days)
    const settings = await ctx.db
      .query("activityProtocolSettings")
      .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId))
      .first();

    const retentionDays = settings?.retentionDays ?? 7;
    const expiresAt = now + retentionDays * 24 * 60 * 60 * 1000;

    // Create event
    const eventId = await ctx.db.insert("activityEvents", {
      organizationId: args.organizationId,
      applicationId: args.applicationId,
      eventType: args.eventType,
      severity: args.severity,
      category: args.category,
      summary: args.summary,
      details: args.details,
      timestamp: now,
      expiresAt,
    });

    return { eventId, timestamp: now };
  },
});

/**
 * Get Activity Events (Internal)
 *
 * Retrieves activity events for an application with filtering.
 */
export const getActivityEventsInternal = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    applicationId: v.id("objects"),
    severity: v.optional(
      v.union(
        v.literal("debug"),
        v.literal("info"),
        v.literal("warning"),
        v.literal("error")
      )
    ),
    category: v.optional(v.string()),
    debugMode: v.optional(v.boolean()),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit ?? 50, 200);
    const now = Date.now();

    // Build query
    let events = await ctx.db
      .query("activityEvents")
      .withIndex("by_app_timestamp", (q) =>
        q.eq("applicationId", args.applicationId)
      )
      .order("desc")
      .collect();

    // Filter out expired events
    events = events.filter((e) => e.expiresAt > now);

    // Filter by severity (exclude debug unless in debug mode)
    if (!args.debugMode) {
      events = events.filter((e) => e.severity !== "debug");
    }

    // Filter by specific severity if requested
    if (args.severity) {
      events = events.filter((e) => e.severity === args.severity);
    }

    // Filter by category if requested
    if (args.category) {
      events = events.filter((e) => e.category === args.category);
    }

    // Check if there are more
    const hasMore = events.length > limit;
    const limitedEvents = events.slice(0, limit);

    return {
      events: limitedEvents,
      hasMore,
      nextCursor: hasMore ? limitedEvents[limitedEvents.length - 1]._id : null,
    };
  },
});

/**
 * Get Activity Statistics (Internal)
 *
 * Returns activity statistics for an application.
 */
export const getActivityStatsInternal = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    applicationId: v.id("objects"),
    timeRange: v.optional(v.union(v.literal("1h"), v.literal("24h"), v.literal("7d"))),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const timeRange = args.timeRange ?? "24h";

    // Calculate time range in ms
    const rangeMs: Record<string, number> = {
      "1h": 60 * 60 * 1000,
      "24h": 24 * 60 * 60 * 1000,
      "7d": 7 * 24 * 60 * 60 * 1000,
    };
    const startTime = now - rangeMs[timeRange];

    // Get events within time range
    const events = await ctx.db
      .query("activityEvents")
      .withIndex("by_app_timestamp", (q) =>
        q.eq("applicationId", args.applicationId)
      )
      .filter((q) => q.gte(q.field("timestamp"), startTime))
      .collect();

    // Calculate statistics
    const stats = {
      total: events.length,
      bySeverity: {
        debug: 0,
        info: 0,
        warning: 0,
        error: 0,
      },
      byCategory: {} as Record<string, number>,
      recentErrors: [] as Array<{
        _id: Id<"activityEvents">;
        summary: string;
        timestamp: number;
        errorMessage?: string;
      }>,
    };

    for (const event of events) {
      // Count by severity
      stats.bySeverity[event.severity]++;

      // Count by category
      if (!stats.byCategory[event.category]) {
        stats.byCategory[event.category] = 0;
      }
      stats.byCategory[event.category]++;

      // Collect recent errors
      if (event.severity === "error" && stats.recentErrors.length < 5) {
        stats.recentErrors.push({
          _id: event._id,
          summary: event.summary,
          timestamp: event.timestamp,
          errorMessage: event.details?.errorMessage,
        });
      }
    }

    return stats;
  },
});

// ============================================================================
// PAGE/SCREEN MANAGEMENT
// ============================================================================

/**
 * Register Page (Internal)
 *
 * Creates or updates an application page in the ontology.
 */
export const registerPageInternal = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    applicationId: v.id("objects"),
    path: v.string(),
    name: v.string(),
    detectionMethod: v.union(
      v.literal("cli_auto"),
      v.literal("manual"),
      v.literal("runtime")
    ),
    pageType: v.optional(v.string()),
    objectBindings: v.optional(
      v.array(
        v.object({
          objectType: v.string(),
          accessMode: v.union(
            v.literal("read"),
            v.literal("write"),
            v.literal("read_write")
          ),
          boundObjectIds: v.optional(v.array(v.id("objects"))),
          syncEnabled: v.boolean(),
          syncDirection: v.optional(
            v.union(
              v.literal("push"),
              v.literal("pull"),
              v.literal("bidirectional")
            )
          ),
        })
      )
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Check if page already exists
    const existingPages = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "application_page")
      )
      .collect();

    // Find by path in customProperties
    const existingPage = existingPages.find((p) => {
      const props = p.customProperties as { path?: string } | undefined;
      return props?.path === args.path;
    });

    if (existingPage) {
      // Update existing page
      await ctx.db.patch(existingPage._id, {
        name: args.name,
        customProperties: {
          ...((existingPage.customProperties as object) || {}),
          path: args.path,
          detectionMethod: args.detectionMethod,
          pageType: args.pageType,
          objectBindings: args.objectBindings || [],
          lastDetectedAt: now,
        },
        updatedAt: now,
      });

      return { pageId: existingPage._id, created: false };
    }

    // Create new page
    const pageId = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "application_page",
      name: args.name,
      status: "active",
      customProperties: {
        path: args.path,
        detectionMethod: args.detectionMethod,
        pageType: args.pageType,
        objectBindings: args.objectBindings || [],
        lastDetectedAt: now,
      },
      createdAt: now,
      updatedAt: now,
    });

    // Create link to application
    await ctx.db.insert("objectLinks", {
      organizationId: args.organizationId,
      fromObjectId: pageId,
      toObjectId: args.applicationId,
      linkType: "page_of_application",
      properties: {},
      createdAt: now,
    });

    return { pageId, created: true };
  },
});

/**
 * Bulk Register Pages (Internal)
 *
 * Registers multiple pages at once (for CLI auto-detection).
 */
export const bulkRegisterPagesInternal = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    applicationId: v.id("objects"),
    pages: v.array(
      v.object({
        path: v.string(),
        name: v.string(),
        pageType: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const results: Array<{
      path: string;
      pageId: Id<"objects">;
      created: boolean;
    }> = [];

    const now = Date.now();

    // Get existing pages for this application
    const existingPages = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "application_page")
      )
      .collect();

    // Get links to filter by application
    const links = await ctx.db
      .query("objectLinks")
      .withIndex("by_org_link_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("linkType", "page_of_application")
      )
      .filter((q) => q.eq(q.field("toObjectId"), args.applicationId))
      .collect();

    const linkedPageIds = new Set(links.map((l) => l.fromObjectId));
    const appPages = existingPages.filter((p) => linkedPageIds.has(p._id));

    for (const page of args.pages) {
      // Check if this path already exists
      const existing = appPages.find((p) => {
        const props = p.customProperties as { path?: string } | undefined;
        return props?.path === page.path;
      });

      if (existing) {
        // Update
        await ctx.db.patch(existing._id, {
          name: page.name,
          customProperties: {
            ...((existing.customProperties as object) || {}),
            path: page.path,
            pageType: page.pageType,
            lastDetectedAt: now,
          },
          updatedAt: now,
        });

        results.push({ path: page.path, pageId: existing._id, created: false });
      } else {
        // Create
        const pageId = await ctx.db.insert("objects", {
          organizationId: args.organizationId,
          type: "application_page",
          name: page.name,
          status: "active",
          customProperties: {
            path: page.path,
            detectionMethod: "cli_auto",
            pageType: page.pageType,
            objectBindings: [],
            lastDetectedAt: now,
          },
          createdAt: now,
          updatedAt: now,
        });

        // Create link
        await ctx.db.insert("objectLinks", {
          organizationId: args.organizationId,
          fromObjectId: pageId,
          toObjectId: args.applicationId,
          linkType: "page_of_application",
          properties: {},
          createdAt: now,
        });

        results.push({ path: page.path, pageId, created: true });
      }
    }

    return { results, total: results.length };
  },
});

/**
 * Get Application Pages (Internal)
 *
 * Retrieves all pages for an application.
 */
export const getApplicationPagesInternal = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    applicationId: v.id("objects"),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get links to find pages for this application
    const links = await ctx.db
      .query("objectLinks")
      .withIndex("by_org_link_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("linkType", "page_of_application")
      )
      .filter((q) => q.eq(q.field("toObjectId"), args.applicationId))
      .collect();

    const pageIds = links.map((l) => l.fromObjectId);

    // Get page objects
    const pages = await Promise.all(
      pageIds.map((id) => ctx.db.get(id))
    );

    // Filter and format
    let filteredPages = pages.filter(
      (p): p is NonNullable<typeof p> => p !== null && p.type === "application_page"
    );

    if (args.status) {
      filteredPages = filteredPages.filter((p) => p.status === args.status);
    }

    return filteredPages.sort(
      (a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0)
    );
  },
});

/**
 * Update Page Bindings (Internal)
 *
 * Updates the object bindings for a page.
 */
export const updatePageBindingsInternal = internalMutation({
  args: {
    pageId: v.id("objects"),
    objectBindings: v.array(
      v.object({
        objectType: v.string(),
        accessMode: v.union(
          v.literal("read"),
          v.literal("write"),
          v.literal("read_write")
        ),
        boundObjectIds: v.optional(v.array(v.id("objects"))),
        syncEnabled: v.boolean(),
        syncDirection: v.optional(
          v.union(
            v.literal("push"),
            v.literal("pull"),
            v.literal("bidirectional")
          )
        ),
      })
    ),
  },
  handler: async (ctx, args) => {
    const page = await ctx.db.get(args.pageId);
    if (!page || page.type !== "application_page") {
      throw new Error("Page not found");
    }

    await ctx.db.patch(args.pageId, {
      customProperties: {
        ...((page.customProperties as object) || {}),
        objectBindings: args.objectBindings,
      },
      updatedAt: Date.now(),
    });

    return { success: true, pageId: args.pageId };
  },
});

/**
 * Update Page Status (Internal)
 *
 * Updates the status of a page.
 */
export const updatePageStatusInternal = internalMutation({
  args: {
    pageId: v.id("objects"),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    const page = await ctx.db.get(args.pageId);
    if (!page || page.type !== "application_page") {
      throw new Error("Page not found");
    }

    await ctx.db.patch(args.pageId, {
      status: args.status,
      updatedAt: Date.now(),
    });

    return { success: true, pageId: args.pageId };
  },
});

/**
 * Delete Page (Internal)
 *
 * Permanently deletes a page and its links.
 */
export const deletePageInternal = internalMutation({
  args: {
    pageId: v.id("objects"),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const page = await ctx.db.get(args.pageId);
    if (!page || page.type !== "application_page") {
      throw new Error("Page not found");
    }

    // Delete links
    const links = await ctx.db
      .query("objectLinks")
      .withIndex("by_from_object", (q) =>
        q.eq("fromObjectId", args.pageId)
      )
      .collect();

    for (const link of links) {
      await ctx.db.delete(link._id);
    }

    // Delete page
    await ctx.db.delete(args.pageId);

    return { success: true };
  },
});

// ============================================================================
// SETTINGS
// ============================================================================

/**
 * Get Activity Protocol Settings (Internal)
 *
 * Note: Settings are per-organization, not per-application.
 * The applicationId is passed for future extension but not used for filtering.
 */
export const getSettingsInternal = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    applicationId: v.id("objects"), // Reserved for future use
  },
  handler: async (ctx, args) => {
    const settings = await ctx.db
      .query("activityProtocolSettings")
      .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId))
      .first();

    return settings || {
      retentionDays: 7,
      logApiRequests: true,
      logSyncEvents: true,
      logObjectChanges: true,
      logWebhooks: true,
      logDebugEvents: false,
      redactPII: true,
    };
  },
});

/**
 * Update Activity Protocol Settings (Internal)
 *
 * Note: Settings are per-organization, not per-application.
 */
export const updateSettingsInternal = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    applicationId: v.id("objects"), // Reserved for future use
    enabled: v.optional(v.boolean()),
    debugModeDefault: v.optional(v.boolean()),
    retentionDays: v.optional(v.number()),
    alertsEnabled: v.optional(v.boolean()),
    alertThresholds: v.optional(
      v.object({
        errorCount: v.optional(v.number()),
        warningCount: v.optional(v.number()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("activityProtocolSettings")
      .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId))
      .first();

    // Map our API args to the schema fields
    const updates: {
      retentionDays?: number;
      logDebugEvents?: boolean;
      updatedAt: number;
    } = {
      updatedAt: Date.now(),
    };

    if (args.retentionDays !== undefined) {
      updates.retentionDays = args.retentionDays;
    }
    if (args.debugModeDefault !== undefined) {
      updates.logDebugEvents = args.debugModeDefault;
    }

    if (existing) {
      await ctx.db.patch(existing._id, updates);
      return { success: true, settingsId: existing._id };
    }

    const settingsId = await ctx.db.insert("activityProtocolSettings", {
      organizationId: args.organizationId,
      retentionDays: args.retentionDays ?? 7,
      logApiRequests: true,
      logSyncEvents: true,
      logObjectChanges: true,
      logWebhooks: true,
      logDebugEvents: args.debugModeDefault ?? false,
      redactPII: true,
      updatedAt: Date.now(),
    });

    return { success: true, settingsId };
  },
});

// ============================================================================
// CLEANUP
// ============================================================================

/**
 * Cleanup Expired Events (Internal)
 *
 * Deletes events that have passed their expiration time.
 * Should be called by a cron job.
 */
export const cleanupExpiredEventsInternal = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    let deleted = 0;

    // Get expired events in batches
    const expiredEvents = await ctx.db
      .query("activityEvents")
      .filter((q) => q.lt(q.field("expiresAt"), now))
      .take(500);

    for (const event of expiredEvents) {
      await ctx.db.delete(event._id);
      deleted++;
    }

    return { deleted, hasMore: expiredEvents.length === 500 };
  },
});
