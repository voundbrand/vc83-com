/**
 * ACTIVITY PROTOCOL
 *
 * Real-time data flow tracing for connected applications.
 * Provides debugging visibility into sync operations and data transformations.
 *
 * Features:
 * - Event logging with severity levels
 * - Rolling window retention (auto-cleanup)
 * - Debug mode vs Simple mode queries
 * - Correlation tracking across event chains
 * - Page detection and object binding management
 */

import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAuthenticatedUser } from "./rbacHelpers";
import type { Id } from "./_generated/dataModel";

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_RETENTION_DAYS = 7;
const MAX_RETENTION_DAYS = 30;
const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;

// ============================================================================
// ACTIVITY EVENTS - LOGGING
// ============================================================================

/**
 * Log an activity event (internal use - called from other modules)
 */
export const logEvent = internalMutation({
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
    details: v.optional(v.object({
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
      parentEventId: v.optional(v.id("activityEvents")),
      correlationId: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    // Get retention settings for organization
    const settings = await ctx.db
      .query("activityProtocolSettings")
      .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId))
      .first();

    const retentionDays = settings?.retentionDays ?? DEFAULT_RETENTION_DAYS;
    const now = Date.now();
    const expiresAt = now + retentionDays * 24 * 60 * 60 * 1000;

    // Check if we should log this event based on settings
    if (settings) {
      if (args.severity === "debug" && !settings.logDebugEvents) return null;
      if (args.category === "api" && !settings.logApiRequests) return null;
      if (args.category === "sync" && !settings.logSyncEvents) return null;
      if (args.category === "object" && !settings.logObjectChanges) return null;
      if (args.category === "webhook" && !settings.logWebhooks) return null;
    }

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

    return eventId;
  },
});

/**
 * Log event from API (called by external applications)
 */
export const logEventFromApi = mutation({
  args: {
    sessionId: v.string(),
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
    details: v.optional(v.object({
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
      sourceFile: v.optional(v.string()),
      sourceLine: v.optional(v.number()),
      correlationId: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    // Get the application to find organization
    const app = await ctx.db.get(args.applicationId);
    if (!app || app.type !== "connected_application") {
      throw new Error("Invalid application ID");
    }

    // Get retention settings
    const settings = await ctx.db
      .query("activityProtocolSettings")
      .withIndex("by_org", (q) => q.eq("organizationId", app.organizationId))
      .first();

    const retentionDays = settings?.retentionDays ?? DEFAULT_RETENTION_DAYS;
    const now = Date.now();
    const expiresAt = now + retentionDays * 24 * 60 * 60 * 1000;

    // Check if we should log this event
    if (settings) {
      if (args.severity === "debug" && !settings.logDebugEvents) return null;
      if (args.category === "api" && !settings.logApiRequests) return null;
      if (args.category === "sync" && !settings.logSyncEvents) return null;
      if (args.category === "object" && !settings.logObjectChanges) return null;
      if (args.category === "webhook" && !settings.logWebhooks) return null;
    }

    const eventId = await ctx.db.insert("activityEvents", {
      organizationId: app.organizationId,
      applicationId: args.applicationId,
      eventType: args.eventType,
      severity: args.severity,
      category: args.category,
      summary: args.summary,
      details: args.details,
      timestamp: now,
      expiresAt,
    });

    return eventId;
  },
});

// ============================================================================
// ACTIVITY EVENTS - QUERYING
// ============================================================================

/**
 * Get activity events for an application (paginated)
 */
export const getActivityEvents = query({
  args: {
    sessionId: v.string(),
    applicationId: v.id("objects"),
    // Filtering
    severity: v.optional(v.union(
      v.literal("debug"),
      v.literal("info"),
      v.literal("warning"),
      v.literal("error")
    )),
    category: v.optional(v.string()),
    eventType: v.optional(v.string()),
    // Time range
    startTime: v.optional(v.number()),
    endTime: v.optional(v.number()),
    // Debug mode - includes full details
    debugMode: v.optional(v.boolean()),
    // Pagination
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const limit = Math.min(args.limit ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);

    // Build query
    let query = ctx.db
      .query("activityEvents")
      .withIndex("by_app_timestamp", (q) => q.eq("applicationId", args.applicationId))
      .order("desc");

    // Apply cursor for pagination
    if (args.cursor) {
      const cursorTime = parseInt(args.cursor, 10);
      query = ctx.db
        .query("activityEvents")
        .withIndex("by_app_timestamp", (q) =>
          q.eq("applicationId", args.applicationId).lt("timestamp", cursorTime)
        )
        .order("desc");
    }

    // Fetch events
    const events = await query.take(limit + 1);

    // Filter in memory (additional filters)
    let filtered = events;

    if (args.severity) {
      filtered = filtered.filter((e) => e.severity === args.severity);
    }
    if (args.category) {
      filtered = filtered.filter((e) => e.category === args.category);
    }
    if (args.eventType) {
      filtered = filtered.filter((e) => e.eventType === args.eventType);
    }
    if (args.startTime) {
      filtered = filtered.filter((e) => e.timestamp >= args.startTime!);
    }
    if (args.endTime) {
      filtered = filtered.filter((e) => e.timestamp <= args.endTime!);
    }

    // Don't show debug events unless debug mode is on
    if (!args.debugMode) {
      filtered = filtered.filter((e) => e.severity !== "debug");
    }

    // Check for more results
    const hasMore = filtered.length > limit;
    const results = filtered.slice(0, limit);
    const nextCursor = hasMore && results.length > 0
      ? results[results.length - 1].timestamp.toString()
      : null;

    // Map results - hide details in simple mode
    const mappedResults = results.map((event) => ({
      _id: event._id,
      eventType: event.eventType,
      severity: event.severity,
      category: event.category,
      summary: event.summary,
      timestamp: event.timestamp,
      // Only include details in debug mode
      details: args.debugMode ? event.details : undefined,
    }));

    return {
      events: mappedResults,
      nextCursor,
      hasMore,
    };
  },
});

/**
 * Get activity event by ID (with full details)
 */
export const getActivityEvent = query({
  args: {
    sessionId: v.string(),
    eventId: v.id("activityEvents"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const event = await ctx.db.get(args.eventId);
    return event;
  },
});

/**
 * Get events by correlation ID (trace a request chain)
 */
export const getEventsByCorrelation = query({
  args: {
    sessionId: v.string(),
    applicationId: v.id("objects"),
    correlationId: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const events = await ctx.db
      .query("activityEvents")
      .withIndex("by_app_timestamp", (q) => q.eq("applicationId", args.applicationId))
      .order("asc")
      .collect();

    // Filter by correlation ID
    return events.filter((e) => e.details?.correlationId === args.correlationId);
  },
});

/**
 * Get activity summary stats for an application
 */
export const getActivityStats = query({
  args: {
    sessionId: v.string(),
    applicationId: v.id("objects"),
    hours: v.optional(v.number()), // Last N hours, default 24
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const hours = args.hours ?? 24;
    const since = Date.now() - hours * 60 * 60 * 1000;

    const events = await ctx.db
      .query("activityEvents")
      .withIndex("by_app_timestamp", (q) =>
        q.eq("applicationId", args.applicationId).gte("timestamp", since)
      )
      .collect();

    // Aggregate stats
    const stats = {
      total: events.length,
      bySeverity: {
        debug: 0,
        info: 0,
        warning: 0,
        error: 0,
      },
      byCategory: {} as Record<string, number>,
      byEventType: {} as Record<string, number>,
      errorsLast1h: 0,
    };

    const oneHourAgo = Date.now() - 60 * 60 * 1000;

    for (const event of events) {
      stats.bySeverity[event.severity]++;
      stats.byCategory[event.category] = (stats.byCategory[event.category] ?? 0) + 1;
      stats.byEventType[event.eventType] = (stats.byEventType[event.eventType] ?? 0) + 1;

      if (event.severity === "error" && event.timestamp >= oneHourAgo) {
        stats.errorsLast1h++;
      }
    }

    return stats;
  },
});

// ============================================================================
// ACTIVITY EVENTS - CLEANUP
// ============================================================================

/**
 * Clean up expired events (called by cron)
 */
export const cleanupExpiredEvents = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Find expired events
    const expired = await ctx.db
      .query("activityEvents")
      .withIndex("by_expires_at", (q) => q.lt("expiresAt", now))
      .take(500); // Process in batches

    // Delete them
    for (const event of expired) {
      await ctx.db.delete(event._id);
    }

    return { deleted: expired.length };
  },
});

// ============================================================================
// APPLICATION PAGES - MANAGEMENT (Using Ontology)
// ============================================================================

// Type definitions for application_page customProperties
interface ObjectBinding {
  objectType: string;
  accessMode: "read" | "write" | "read_write";
  boundObjectIds?: Id<"objects">[];
  syncEnabled: boolean;
  syncDirection?: "push" | "pull" | "bidirectional";
}

interface ApplicationPageProperties {
  path: string;
  detectionMethod: "cli_auto" | "manual" | "runtime";
  pageType?: string;
  objectBindings: ObjectBinding[];
  lastDetectedAt?: number;
  lastActivityAt?: number;
}

/**
 * Register a page (called by CLI or manually)
 * Pages are stored in the objects table with type="application_page"
 * and linked to their parent connected_application via objectLinks
 */
export const registerPage = mutation({
  args: {
    sessionId: v.string(),
    applicationId: v.id("objects"),
    path: v.string(),
    name: v.string(),
    detectionMethod: v.union(
      v.literal("cli_auto"),
      v.literal("manual"),
      v.literal("runtime")
    ),
    pageType: v.optional(v.string()),
    objectBindings: v.optional(v.array(v.object({
      objectType: v.string(),
      accessMode: v.union(
        v.literal("read"),
        v.literal("write"),
        v.literal("read_write")
      ),
      boundObjectIds: v.optional(v.array(v.id("objects"))),
      syncEnabled: v.boolean(),
      syncDirection: v.optional(v.union(
        v.literal("push"),
        v.literal("pull"),
        v.literal("bidirectional")
      )),
    }))),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    // Get application to find organization
    const app = await ctx.db.get(args.applicationId);
    if (!app || app.type !== "connected_application") {
      throw new Error("Invalid application ID");
    }

    const now = Date.now();

    // Find existing page by looking for objectLinks from this application
    const existingLinks = await ctx.db
      .query("objectLinks")
      .withIndex("by_from_link_type", (q) =>
        q.eq("fromObjectId", args.applicationId).eq("linkType", "has_page")
      )
      .collect();

    // Check each linked page to find one with matching path
    let existingPageId: Id<"objects"> | null = null;
    for (const link of existingLinks) {
      const page = await ctx.db.get(link.toObjectId);
      if (page && page.type === "application_page") {
        const props = page.customProperties as ApplicationPageProperties | undefined;
        if (props?.path === args.path) {
          existingPageId = page._id;
          break;
        }
      }
    }

    if (existingPageId) {
      // Update existing page
      const existingPage = await ctx.db.get(existingPageId);
      const existingProps = existingPage?.customProperties as ApplicationPageProperties | undefined;

      await ctx.db.patch(existingPageId, {
        name: args.name,
        customProperties: {
          ...existingProps,
          path: args.path,
          detectionMethod: args.detectionMethod,
          pageType: args.pageType,
          objectBindings: args.objectBindings ?? existingProps?.objectBindings ?? [],
          lastDetectedAt: args.detectionMethod === "cli_auto" ? now : existingProps?.lastDetectedAt,
        },
        updatedAt: now,
      });
      return existingPageId;
    }

    // Create new page in objects table
    const pageId = await ctx.db.insert("objects", {
      organizationId: app.organizationId,
      type: "application_page",
      name: args.name,
      description: args.path, // Store path in description for searchability
      status: "active",
      customProperties: {
        path: args.path,
        detectionMethod: args.detectionMethod,
        pageType: args.pageType,
        objectBindings: args.objectBindings ?? [],
        lastDetectedAt: args.detectionMethod === "cli_auto" ? now : undefined,
      } as ApplicationPageProperties,
      createdAt: now,
      updatedAt: now,
    });

    // Create link from application to page
    await ctx.db.insert("objectLinks", {
      organizationId: app.organizationId,
      fromObjectId: args.applicationId,
      toObjectId: pageId,
      linkType: "has_page",
      createdAt: now,
    });

    return pageId;
  },
});

/**
 * Bulk register pages (for CLI auto-detection)
 */
export const bulkRegisterPages = mutation({
  args: {
    sessionId: v.string(),
    applicationId: v.id("objects"),
    pages: v.array(v.object({
      path: v.string(),
      name: v.string(),
      pageType: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const app = await ctx.db.get(args.applicationId);
    if (!app || app.type !== "connected_application") {
      throw new Error("Invalid application ID");
    }

    const now = Date.now();

    // Get all existing page links for this application
    const existingLinks = await ctx.db
      .query("objectLinks")
      .withIndex("by_from_link_type", (q) =>
        q.eq("fromObjectId", args.applicationId).eq("linkType", "has_page")
      )
      .collect();

    // Build a map of path -> pageId for existing pages
    const existingPagesByPath = new Map<string, Id<"objects">>();
    for (const link of existingLinks) {
      const page = await ctx.db.get(link.toObjectId);
      if (page && page.type === "application_page") {
        const props = page.customProperties as ApplicationPageProperties | undefined;
        if (props?.path) {
          existingPagesByPath.set(props.path, page._id);
        }
      }
    }

    const results: { path: string; pageId: Id<"objects">; created: boolean }[] = [];

    for (const page of args.pages) {
      const existingPageId = existingPagesByPath.get(page.path);

      if (existingPageId) {
        // Update existing page
        const existingPage = await ctx.db.get(existingPageId);
        const existingProps = existingPage?.customProperties as ApplicationPageProperties | undefined;

        await ctx.db.patch(existingPageId, {
          name: page.name,
          customProperties: {
            ...existingProps,
            pageType: page.pageType,
            lastDetectedAt: now,
          },
          updatedAt: now,
        });
        results.push({ path: page.path, pageId: existingPageId, created: false });
      } else {
        // Create new page
        const pageId = await ctx.db.insert("objects", {
          organizationId: app.organizationId,
          type: "application_page",
          name: page.name,
          description: page.path,
          status: "active",
          customProperties: {
            path: page.path,
            detectionMethod: "cli_auto",
            pageType: page.pageType,
            objectBindings: [],
            lastDetectedAt: now,
          } as ApplicationPageProperties,
          createdAt: now,
          updatedAt: now,
        });

        // Create link
        await ctx.db.insert("objectLinks", {
          organizationId: app.organizationId,
          fromObjectId: args.applicationId,
          toObjectId: pageId,
          linkType: "has_page",
          createdAt: now,
        });

        results.push({ path: page.path, pageId, created: true });
      }
    }

    return results;
  },
});

/**
 * Get pages for an application
 */
export const getApplicationPages = query({
  args: {
    sessionId: v.string(),
    applicationId: v.id("objects"),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    // Get all page links for this application
    const pageLinks = await ctx.db
      .query("objectLinks")
      .withIndex("by_from_link_type", (q) =>
        q.eq("fromObjectId", args.applicationId).eq("linkType", "has_page")
      )
      .collect();

    // Fetch all pages
    const pages = [];
    for (const link of pageLinks) {
      const page = await ctx.db.get(link.toObjectId);
      if (page && page.type === "application_page") {
        // Filter by status if provided
        if (args.status && page.status !== args.status) {
          continue;
        }
        pages.push(page);
      }
    }

    return pages;
  },
});

/**
 * Update page object bindings
 */
export const updatePageBindings = mutation({
  args: {
    sessionId: v.string(),
    pageId: v.id("objects"),
    objectBindings: v.array(v.object({
      objectType: v.string(),
      accessMode: v.union(
        v.literal("read"),
        v.literal("write"),
        v.literal("read_write")
      ),
      boundObjectIds: v.optional(v.array(v.id("objects"))),
      syncEnabled: v.boolean(),
      syncDirection: v.optional(v.union(
        v.literal("push"),
        v.literal("pull"),
        v.literal("bidirectional")
      )),
    })),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const page = await ctx.db.get(args.pageId);
    if (!page || page.type !== "application_page") {
      throw new Error("Invalid page ID");
    }

    const existingProps = page.customProperties as ApplicationPageProperties | undefined;

    await ctx.db.patch(args.pageId, {
      customProperties: {
        ...existingProps,
        objectBindings: args.objectBindings,
      },
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Update page status
 */
export const updatePageStatus = mutation({
  args: {
    sessionId: v.string(),
    pageId: v.id("objects"),
    status: v.union(
      v.literal("active"),
      v.literal("inactive"),
      v.literal("archived")
    ),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const page = await ctx.db.get(args.pageId);
    if (!page || page.type !== "application_page") {
      throw new Error("Invalid page ID");
    }

    await ctx.db.patch(args.pageId, {
      status: args.status,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Delete a page (and its link to the application)
 */
export const deletePage = mutation({
  args: {
    sessionId: v.string(),
    pageId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const page = await ctx.db.get(args.pageId);
    if (!page || page.type !== "application_page") {
      throw new Error("Invalid page ID");
    }

    // Find and delete the link
    const links = await ctx.db
      .query("objectLinks")
      .withIndex("by_to_link_type", (q) =>
        q.eq("toObjectId", args.pageId).eq("linkType", "has_page")
      )
      .collect();

    for (const link of links) {
      await ctx.db.delete(link._id);
    }

    // Delete the page object
    await ctx.db.delete(args.pageId);

    return { success: true };
  },
});

// ============================================================================
// ACTIVITY PROTOCOL SETTINGS
// ============================================================================

/**
 * Get activity protocol settings for an organization
 */
export const getSettings = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const settings = await ctx.db
      .query("activityProtocolSettings")
      .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId))
      .first();

    // Return defaults if no settings exist
    if (!settings) {
      return {
        organizationId: args.organizationId,
        retentionDays: DEFAULT_RETENTION_DAYS,
        logApiRequests: true,
        logSyncEvents: true,
        logObjectChanges: true,
        logWebhooks: true,
        logDebugEvents: false,
        redactPII: true,
      };
    }

    return settings;
  },
});

/**
 * Update activity protocol settings
 */
export const updateSettings = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    retentionDays: v.optional(v.number()),
    logApiRequests: v.optional(v.boolean()),
    logSyncEvents: v.optional(v.boolean()),
    logObjectChanges: v.optional(v.boolean()),
    logWebhooks: v.optional(v.boolean()),
    logDebugEvents: v.optional(v.boolean()),
    redactPII: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const existing = await ctx.db
      .query("activityProtocolSettings")
      .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId))
      .first();

    const retentionDays = args.retentionDays
      ? Math.min(Math.max(1, args.retentionDays), MAX_RETENTION_DAYS)
      : DEFAULT_RETENTION_DAYS;

    if (existing) {
      await ctx.db.patch(existing._id, {
        retentionDays: args.retentionDays !== undefined ? retentionDays : existing.retentionDays,
        logApiRequests: args.logApiRequests ?? existing.logApiRequests,
        logSyncEvents: args.logSyncEvents ?? existing.logSyncEvents,
        logObjectChanges: args.logObjectChanges ?? existing.logObjectChanges,
        logWebhooks: args.logWebhooks ?? existing.logWebhooks,
        logDebugEvents: args.logDebugEvents ?? existing.logDebugEvents,
        redactPII: args.redactPII ?? existing.redactPII,
        updatedAt: Date.now(),
      });
      return existing._id;
    }

    const settingsId = await ctx.db.insert("activityProtocolSettings", {
      organizationId: args.organizationId,
      retentionDays,
      logApiRequests: args.logApiRequests ?? true,
      logSyncEvents: args.logSyncEvents ?? true,
      logObjectChanges: args.logObjectChanges ?? true,
      logWebhooks: args.logWebhooks ?? true,
      logDebugEvents: args.logDebugEvents ?? false,
      redactPII: args.redactPII ?? true,
      updatedAt: Date.now(),
    });

    return settingsId;
  },
});
