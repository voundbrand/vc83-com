/**
 * AUDIT LOG EXPORT
 *
 * Professional+ tier feature for exporting audit logs to CSV/JSON
 * Implements checkFeatureAccess for auditLogExportEnabled
 */

import { query } from "./_generated/server";
import { v } from "convex/values";
import { requireAuthenticatedUser } from "./rbacHelpers";
import { checkFeatureAccess } from "./licensing/helpers";

/**
 * GET AUDIT LOGS FOR EXPORT
 *
 * Returns audit logs for an organization within a date range.
 * ⚡ PROFESSIONAL TIER: Only Professional+ can export audit logs.
 */
export const getAuditLogsForExport = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    startDate: v.optional(v.number()), // Unix timestamp
    endDate: v.optional(v.number()),   // Unix timestamp
    action: v.optional(v.string()),    // Filter by action type
    userId: v.optional(v.id("users")), // Filter by user
    limit: v.optional(v.number()),     // Max records (default: 1000)
  },
  handler: async (ctx, args) => {
    // Authenticate user
    await requireAuthenticatedUser(ctx, args.sessionId);

    // ⚡ PROFESSIONAL TIER: Audit Log Export
    // Professional+ can export audit logs to CSV/JSON
    await checkFeatureAccess(ctx, args.organizationId, "auditLogExportEnabled");

    // Build query
    const query = ctx.db
      .query("auditLogs")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .order("desc"); // Most recent first

    // Collect logs with filters
    let logs = await query.collect();

    // Apply filters
    if (args.startDate) {
      logs = logs.filter((log) => log.createdAt >= args.startDate!);
    }

    if (args.endDate) {
      logs = logs.filter((log) => log.createdAt <= args.endDate!);
    }

    if (args.action) {
      logs = logs.filter((log) => log.action === args.action);
    }

    if (args.userId) {
      logs = logs.filter((log) => log.userId === args.userId);
    }

    // Apply limit (default: 1000, max: 10000)
    const limit = Math.min(args.limit || 1000, 10000);
    logs = logs.slice(0, limit);

    // Enrich logs with user and resource details
    const enrichedLogs = await Promise.all(
      logs.map(async (log) => {
        // Get user details
        let userName = "Unknown";
        if (log.userId) {
          const user = await ctx.db.get(log.userId);
          if (user) {
            // Users have firstName, lastName, and email fields
            const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ");
            userName = fullName || user.email || "Unknown";
          }
        }

        // Get resource details if available
        let resourceName = log.resource || "Unknown";
        if (log.resourceId && typeof log.resourceId === "string") {
          try {
            // Try to get the resource object
            const resource = await ctx.db.get(log.resourceId as any);
            if (resource && "name" in resource) {
              resourceName = (resource as any).name || resourceName;
            }
          } catch {
            // Resource might not exist or be accessible
          }
        }

        return {
          timestamp: new Date(log.createdAt).toISOString(),
          action: log.action,
          resource: log.resource,
          resourceName,
          userId: log.userId,
          userName,
          success: log.success,
          errorMessage: log.errorMessage || null,
          metadata: log.metadata || {},
        };
      })
    );

    return {
      logs: enrichedLogs,
      total: enrichedLogs.length,
      dateRange: {
        start: args.startDate ? new Date(args.startDate).toISOString() : null,
        end: args.endDate ? new Date(args.endDate).toISOString() : null,
      },
      exportedAt: new Date().toISOString(),
    };
  },
});

/**
 * GET AVAILABLE AUDIT LOG ACTIONS
 *
 * Returns list of unique actions in audit logs for filtering
 */
export const getAvailableAuditActions = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    // Authenticate user
    await requireAuthenticatedUser(ctx, args.sessionId);

    // ⚡ PROFESSIONAL TIER: Audit Log Export
    await checkFeatureAccess(ctx, args.organizationId, "auditLogExportEnabled");

    // Get all logs for this organization
    const logs = await ctx.db
      .query("auditLogs")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    // Extract unique actions
    const actions = new Set(logs.map((log) => log.action));

    return {
      actions: Array.from(actions).sort(),
      total: actions.size,
    };
  },
});

/**
 * GET AUDIT LOG STATISTICS
 *
 * Returns statistics about audit logs (counts by action, user, etc.)
 */
export const getAuditLogStatistics = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Authenticate user
    await requireAuthenticatedUser(ctx, args.sessionId);

    // ⚡ PROFESSIONAL TIER: Audit Log Export
    await checkFeatureAccess(ctx, args.organizationId, "auditLogExportEnabled");

    // Get logs within date range
    let logs = await ctx.db
      .query("auditLogs")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    // Apply date filters
    if (args.startDate) {
      logs = logs.filter((log) => log.createdAt >= args.startDate!);
    }

    if (args.endDate) {
      logs = logs.filter((log) => log.createdAt <= args.endDate!);
    }

    // Calculate statistics
    const byAction: Record<string, number> = {};
    const byUser: Record<string, number> = {};
    const byResource: Record<string, number> = {};
    let successCount = 0;
    let failureCount = 0;

    for (const log of logs) {
      // Count by action
      byAction[log.action] = (byAction[log.action] || 0) + 1;

      // Count by user
      if (log.userId) {
        const userId = log.userId.toString();
        byUser[userId] = (byUser[userId] || 0) + 1;
      }

      // Count by resource
      if (log.resource) {
        byResource[log.resource] = (byResource[log.resource] || 0) + 1;
      }

      // Count success/failure
      if (log.success) {
        successCount++;
      } else {
        failureCount++;
      }
    }

    return {
      total: logs.length,
      successCount,
      failureCount,
      successRate: logs.length > 0 ? (successCount / logs.length) * 100 : 0,
      byAction,
      byResource,
      topActions: Object.entries(byAction)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([action, count]) => ({ action, count })),
      topResources: Object.entries(byResource)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([resource, count]) => ({ resource, count })),
      dateRange: {
        start: args.startDate ? new Date(args.startDate).toISOString() : null,
        end: args.endDate ? new Date(args.endDate).toISOString() : null,
      },
    };
  },
});
