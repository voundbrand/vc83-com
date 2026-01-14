/**
 * AI Activity Protocol Tool
 *
 * Comprehensive tool for managing connected application activity monitoring,
 * page detection, and event logging through natural language.
 *
 * Features:
 * - Log and query activity events
 * - View activity statistics
 * - Manage detected pages/screens
 * - Configure object bindings per page
 * - Manage activity settings
 */

import { action } from "../../_generated/server";
import type { ActionCtx } from "../../_generated/server";
import { v } from "convex/values";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";

// ============================================================================
// TOOL DEFINITION
// ============================================================================

export const activityProtocolToolDefinition = {
  type: "function" as const,
  function: {
    name: "manage_activity_protocol",
    description: `Manage activity monitoring for connected applications: view events, check statistics, manage pages, configure bindings.

USE THIS TOOL WHEN USER ASKS ABOUT:
- Activity events from connected apps
- Data flow or synchronization status
- Detected pages/screens in an application
- Object bindings for pages
- Activity protocol settings
- Debugging connected application issues

AVAILABLE ACTIONS:
- get_events: View recent activity events for an application
- get_stats: Get activity statistics (error counts, event distribution)
- list_pages: List detected pages/screens for an application
- register_page: Register a new page manually
- update_bindings: Configure which objects a page can access
- get_settings: View activity protocol settings
- update_settings: Change retention period, debug mode, alerts

IMPORTANT:
- Always specify applicationId for all operations
- For debugging issues, use severity='error' filter to find problems
- Use debugMode=true for detailed technical information`,
    parameters: {
      type: "object" as const,
      properties: {
        action: {
          type: "string",
          enum: [
            "get_events",
            "get_stats",
            "list_pages",
            "register_page",
            "update_bindings",
            "get_settings",
            "update_settings"
          ],
          description: "Action to perform"
        },
        // Common fields
        applicationId: {
          type: "string",
          description: "ID of the connected application (required for all actions)"
        },
        // Event filters
        severity: {
          type: "string",
          enum: ["debug", "info", "warning", "error"],
          description: "Filter events by severity level (for get_events)"
        },
        category: {
          type: "string",
          enum: ["api", "sync", "object", "webhook", "transform"],
          description: "Filter events by category (for get_events)"
        },
        debugMode: {
          type: "boolean",
          description: "Include debug-level events and detailed information (for get_events, get_stats)"
        },
        timeRange: {
          type: "string",
          enum: ["1h", "24h", "7d"],
          description: "Time range for statistics (for get_stats). Default: 24h"
        },
        limit: {
          type: "number",
          description: "Maximum number of events to return (for get_events). Default: 50, max: 200"
        },
        // Page fields
        pageId: {
          type: "string",
          description: "Page ID (for update_bindings)"
        },
        path: {
          type: "string",
          description: "Page route path like '/dashboard' or '/users/[id]' (for register_page)"
        },
        pageName: {
          type: "string",
          description: "Human-readable page name (for register_page)"
        },
        pageType: {
          type: "string",
          enum: ["static", "dynamic", "api_route"],
          description: "Type of page (for register_page)"
        },
        // Binding configuration
        objectBindings: {
          type: "array",
          items: {
            type: "object",
            properties: {
              objectType: { type: "string", description: "Type of object (e.g., 'contact', 'order')" },
              accessMode: { type: "string", enum: ["read", "write", "read_write"], description: "How the page accesses this object type" },
              syncEnabled: { type: "boolean", description: "Whether sync is enabled for this binding" },
              syncDirection: { type: "string", enum: ["push", "pull", "bidirectional"], description: "Direction of data sync" }
            }
          },
          description: "Object binding configurations (for update_bindings, register_page)"
        },
        // Settings fields
        enabled: {
          type: "boolean",
          description: "Enable/disable activity protocol (for update_settings)"
        },
        debugModeDefault: {
          type: "boolean",
          description: "Show debug info by default (for update_settings)"
        },
        retentionDays: {
          type: "number",
          description: "Days to keep activity events (for update_settings). Default: 7"
        },
        alertsEnabled: {
          type: "boolean",
          description: "Enable error alerts (for update_settings)"
        }
      },
      required: ["action", "applicationId"]
    }
  }
};

// ============================================================================
// MAIN TOOL HANDLER
// ============================================================================

export const executeManageActivityProtocol = action({
  args: {
    sessionId: v.optional(v.string()),
    organizationId: v.optional(v.id("organizations")),
    userId: v.optional(v.id("users")),
    action: v.string(),
    applicationId: v.string(),
    // Event filters
    severity: v.optional(v.string()),
    category: v.optional(v.string()),
    debugMode: v.optional(v.boolean()),
    timeRange: v.optional(v.string()),
    limit: v.optional(v.number()),
    // Page fields
    pageId: v.optional(v.string()),
    path: v.optional(v.string()),
    pageName: v.optional(v.string()),
    pageType: v.optional(v.string()),
    // Bindings
    objectBindings: v.optional(v.array(v.object({
      objectType: v.string(),
      accessMode: v.union(v.literal("read"), v.literal("write"), v.literal("read_write")),
      boundObjectIds: v.optional(v.array(v.id("objects"))),
      syncEnabled: v.boolean(),
      syncDirection: v.optional(v.union(v.literal("push"), v.literal("pull"), v.literal("bidirectional"))),
    }))),
    // Settings
    enabled: v.optional(v.boolean()),
    debugModeDefault: v.optional(v.boolean()),
    retentionDays: v.optional(v.number()),
    alertsEnabled: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<ToolResult> => {
    // Validate we have org context
    if (!args.organizationId) {
      return {
        success: false,
        error: "MISSING_CONTEXT",
        message: "Organization context is required"
      };
    }

    const appId = args.applicationId as Id<"objects">;

    switch (args.action) {
      case "get_events":
        return await getActivityEvents(ctx, args.organizationId, appId, {
          severity: args.severity as "debug" | "info" | "warning" | "error" | undefined,
          category: args.category,
          debugMode: args.debugMode,
          limit: args.limit,
        });

      case "get_stats":
        return await getActivityStats(ctx, args.organizationId, appId, {
          timeRange: args.timeRange as "1h" | "24h" | "7d" | undefined,
        });

      case "list_pages":
        return await listApplicationPages(ctx, args.organizationId, appId);

      case "register_page":
        if (!args.path || !args.pageName) {
          return {
            success: false,
            error: "VALIDATION_ERROR",
            message: "Both path and pageName are required to register a page"
          };
        }
        return await registerPage(ctx, args.organizationId, appId, {
          path: args.path,
          name: args.pageName,
          pageType: args.pageType,
          objectBindings: args.objectBindings,
        });

      case "update_bindings":
        if (!args.pageId || !args.objectBindings) {
          return {
            success: false,
            error: "VALIDATION_ERROR",
            message: "Both pageId and objectBindings are required"
          };
        }
        return await updatePageBindings(ctx, args.pageId as Id<"objects">, args.objectBindings);

      case "get_settings":
        return await getSettings(ctx, args.organizationId, appId);

      case "update_settings":
        return await updateSettings(ctx, args.organizationId, appId, {
          enabled: args.enabled,
          debugModeDefault: args.debugModeDefault,
          retentionDays: args.retentionDays,
          alertsEnabled: args.alertsEnabled,
        });

      default:
        return {
          success: false,
          error: "UNKNOWN_ACTION",
          message: `Unknown action: ${args.action}. Valid actions: get_events, get_stats, list_pages, register_page, update_bindings, get_settings, update_settings`
        };
    }
  }
});

// ============================================================================
// TYPES
// ============================================================================

interface ToolResult {
  success: boolean;
  message?: string;
  error?: string;
  [key: string]: unknown;
}

interface EventFilters {
  severity?: "debug" | "info" | "warning" | "error";
  category?: string;
  debugMode?: boolean;
  limit?: number;
}

interface StatsFilters {
  timeRange?: "1h" | "24h" | "7d";
}

interface RegisterPageParams {
  path: string;
  name: string;
  pageType?: string;
  objectBindings?: Array<{
    objectType: string;
    accessMode: "read" | "write" | "read_write";
    boundObjectIds?: Id<"objects">[];
    syncEnabled: boolean;
    syncDirection?: "push" | "pull" | "bidirectional";
  }>;
}

interface UpdateSettingsParams {
  enabled?: boolean;
  debugModeDefault?: boolean;
  retentionDays?: number;
  alertsEnabled?: boolean;
}

// ============================================================================
// ACTION HANDLERS
// ============================================================================

async function getActivityEvents(
  ctx: ActionCtx,
  orgId: Id<"organizations">,
  appId: Id<"objects">,
  filters: EventFilters
): Promise<ToolResult> {
  try {
    const result = await ctx.runQuery(
      internal.api.v1.activityProtocolInternal.getActivityEventsInternal,
      {
        organizationId: orgId,
        applicationId: appId,
        severity: filters.severity,
        category: filters.category,
        debugMode: filters.debugMode,
        limit: filters.limit || 50,
      }
    );

    // Format events for AI response
    type EventResult = {
      _id: Id<"activityEvents">;
      eventType: string;
      severity: string;
      category: string;
      summary: string;
      timestamp: number;
      details?: {
        durationMs?: number;
        errorMessage?: string;
      };
    };

    const events = (result.events as EventResult[]).map((e: EventResult) => ({
      id: e._id,
      type: e.eventType,
      severity: e.severity,
      category: e.category,
      summary: e.summary,
      timestamp: new Date(e.timestamp).toISOString(),
      durationMs: e.details?.durationMs,
      errorMessage: e.details?.errorMessage,
    }));

    // Generate summary
    const errorCount = events.filter((e: { severity: string }) => e.severity === "error").length;
    const warningCount = events.filter((e: { severity: string }) => e.severity === "warning").length;

    let message = `Found ${events.length} activity event(s)`;
    if (errorCount > 0) {
      message += ` (⚠️ ${errorCount} error${errorCount !== 1 ? "s" : ""})`;
    }
    if (warningCount > 0) {
      message += ` (${warningCount} warning${warningCount !== 1 ? "s" : ""})`;
    }

    return {
      success: true,
      message,
      events,
      hasMore: result.hasMore as boolean,
      nextCursor: result.nextCursor as string | null,
      summary: {
        total: events.length,
        errors: errorCount,
        warnings: warningCount,
      }
    };
  } catch (error) {
    return {
      success: false,
      error: "QUERY_ERROR",
      message: `Failed to get events: ${error instanceof Error ? error.message : "Unknown error"}`
    };
  }
}

async function getActivityStats(
  ctx: ActionCtx,
  orgId: Id<"organizations">,
  appId: Id<"objects">,
  filters: StatsFilters
): Promise<ToolResult> {
  try {
    type StatsResult = {
      total: number;
      bySeverity: {
        debug: number;
        info: number;
        warning: number;
        error: number;
      };
      byCategory: Record<string, number>;
      recentErrors: Array<{
        _id: Id<"activityEvents">;
        summary: string;
        timestamp: number;
        errorMessage?: string;
      }>;
    };

    const stats = await ctx.runQuery(
      internal.api.v1.activityProtocolInternal.getActivityStatsInternal,
      {
        organizationId: orgId,
        applicationId: appId,
        timeRange: filters.timeRange,
      }
    ) as StatsResult;

    // Determine health status
    let healthStatus = "healthy";
    let healthEmoji = "✅";
    if (stats.bySeverity.error > 0) {
      healthStatus = "unhealthy";
      healthEmoji = "❌";
    } else if (stats.bySeverity.warning > 5) {
      healthStatus = "degraded";
      healthEmoji = "⚠️";
    }

    const timeRangeLabel = filters.timeRange === "1h" ? "last hour" :
                          filters.timeRange === "7d" ? "last 7 days" : "last 24 hours";

    return {
      success: true,
      message: `${healthEmoji} Application is ${healthStatus}. ${stats.total} events in ${timeRangeLabel}.`,
      health: healthStatus,
      stats: {
        total: stats.total,
        bySeverity: stats.bySeverity,
        byCategory: stats.byCategory,
        recentErrors: stats.recentErrors.map((e: { summary: string; errorMessage?: string; timestamp: number }) => ({
          summary: e.summary,
          errorMessage: e.errorMessage,
          timestamp: new Date(e.timestamp).toISOString(),
        })),
      },
      timeRange: timeRangeLabel,
    };
  } catch (error) {
    return {
      success: false,
      error: "QUERY_ERROR",
      message: `Failed to get stats: ${error instanceof Error ? error.message : "Unknown error"}`
    };
  }
}

async function listApplicationPages(
  ctx: ActionCtx,
  orgId: Id<"organizations">,
  appId: Id<"objects">
): Promise<ToolResult> {
  try {
    type PageResult = {
      _id: Id<"objects">;
      name: string;
      status: string;
      customProperties?: {
        path?: string;
        detectionMethod?: string;
        pageType?: string;
        objectBindings?: unknown[];
        lastDetectedAt?: number;
      };
    };

    const pages = await ctx.runQuery(
      internal.api.v1.activityProtocolInternal.getApplicationPagesInternal,
      {
        organizationId: orgId,
        applicationId: appId,
      }
    ) as PageResult[];

    const formattedPages = pages.map((p: PageResult) => ({
      id: p._id,
      name: p.name,
      path: p.customProperties?.path,
      detectionMethod: p.customProperties?.detectionMethod,
      pageType: p.customProperties?.pageType,
      status: p.status,
      bindingCount: p.customProperties?.objectBindings?.length || 0,
      lastDetected: p.customProperties?.lastDetectedAt
        ? new Date(p.customProperties.lastDetectedAt).toISOString()
        : null,
    }));

    // Group by detection method
    const cliDetected = formattedPages.filter((p: { detectionMethod?: string }) => p.detectionMethod === "cli_auto").length;
    const manuallyAdded = formattedPages.filter((p: { detectionMethod?: string }) => p.detectionMethod === "manual").length;

    return {
      success: true,
      message: `Found ${pages.length} page(s): ${cliDetected} auto-detected, ${manuallyAdded} manually added`,
      pages: formattedPages,
      total: pages.length,
      summary: {
        cliAutoDetected: cliDetected,
        manuallyAdded,
        runtimeDetected: formattedPages.filter((p: { detectionMethod?: string }) => p.detectionMethod === "runtime").length,
      }
    };
  } catch (error) {
    return {
      success: false,
      error: "QUERY_ERROR",
      message: `Failed to list pages: ${error instanceof Error ? error.message : "Unknown error"}`
    };
  }
}

async function registerPage(
  ctx: ActionCtx,
  orgId: Id<"organizations">,
  appId: Id<"objects">,
  params: RegisterPageParams
): Promise<ToolResult> {
  try {
    const result = await ctx.runMutation(
      internal.api.v1.activityProtocolInternal.registerPageInternal,
      {
        organizationId: orgId,
        applicationId: appId,
        path: params.path,
        name: params.name,
        detectionMethod: "manual",
        pageType: params.pageType,
        objectBindings: params.objectBindings,
      }
    );

    return {
      success: true,
      message: result.created
        ? `✅ Page "${params.name}" registered at ${params.path}`
        : `✅ Page "${params.name}" updated at ${params.path}`,
      pageId: result.pageId,
      created: result.created,
    };
  } catch (error) {
    return {
      success: false,
      error: "MUTATION_ERROR",
      message: `Failed to register page: ${error instanceof Error ? error.message : "Unknown error"}`
    };
  }
}

async function updatePageBindings(
  ctx: ActionCtx,
  pageId: Id<"objects">,
  objectBindings: Array<{
    objectType: string;
    accessMode: "read" | "write" | "read_write";
    boundObjectIds?: Id<"objects">[];
    syncEnabled: boolean;
    syncDirection?: "push" | "pull" | "bidirectional";
  }>
): Promise<ToolResult> {
  try {
    await ctx.runMutation(
      internal.api.v1.activityProtocolInternal.updatePageBindingsInternal,
      {
        pageId,
        objectBindings,
      }
    );

    return {
      success: true,
      message: `✅ Updated ${objectBindings.length} object binding(s) for page`,
      pageId,
      bindings: objectBindings.map((b: { objectType: string; accessMode: string; syncEnabled: boolean; syncDirection?: string }) => ({
        objectType: b.objectType,
        accessMode: b.accessMode,
        syncEnabled: b.syncEnabled,
        syncDirection: b.syncDirection,
      })),
    };
  } catch (error) {
    return {
      success: false,
      error: "MUTATION_ERROR",
      message: `Failed to update bindings: ${error instanceof Error ? error.message : "Unknown error"}`
    };
  }
}

async function getSettings(
  ctx: ActionCtx,
  orgId: Id<"organizations">,
  appId: Id<"objects">
): Promise<ToolResult> {
  try {
    type SettingsResult = {
      retentionDays?: number;
      logDebugEvents?: boolean;
    };

    const settings = await ctx.runQuery(
      internal.api.v1.activityProtocolInternal.getSettingsInternal,
      {
        organizationId: orgId,
        applicationId: appId,
      }
    ) as SettingsResult;

    const enabled = true; // Always enabled if we got here
    const retentionDays = settings.retentionDays || 7;

    return {
      success: true,
      message: enabled
        ? `Activity Protocol is enabled (${retentionDays} day retention)`
        : "Activity Protocol is disabled",
      settings: {
        enabled,
        debugModeDefault: settings.logDebugEvents ?? false,
        retentionDays,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: "QUERY_ERROR",
      message: `Failed to get settings: ${error instanceof Error ? error.message : "Unknown error"}`
    };
  }
}

async function updateSettings(
  ctx: ActionCtx,
  orgId: Id<"organizations">,
  appId: Id<"objects">,
  params: UpdateSettingsParams
): Promise<ToolResult> {
  try {
    await ctx.runMutation(
      internal.api.v1.activityProtocolInternal.updateSettingsInternal,
      {
        organizationId: orgId,
        applicationId: appId,
        enabled: params.enabled,
        debugModeDefault: params.debugModeDefault,
        retentionDays: params.retentionDays,
        alertsEnabled: params.alertsEnabled,
      }
    );

    const changes: string[] = [];
    if (params.enabled !== undefined) changes.push(`enabled=${params.enabled}`);
    if (params.debugModeDefault !== undefined) changes.push(`debugMode=${params.debugModeDefault}`);
    if (params.retentionDays !== undefined) changes.push(`retention=${params.retentionDays}d`);
    if (params.alertsEnabled !== undefined) changes.push(`alerts=${params.alertsEnabled}`);

    return {
      success: true,
      message: `✅ Settings updated: ${changes.join(", ")}`,
      updatedFields: changes,
    };
  } catch (error) {
    return {
      success: false,
      error: "MUTATION_ERROR",
      message: `Failed to update settings: ${error instanceof Error ? error.message : "Unknown error"}`
    };
  }
}
