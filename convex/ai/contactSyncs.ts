/**
 * AI Contact Sync Management
 *
 * Handles contact synchronization records for tracking sync operations
 * between external providers (Microsoft, Google) and internal CRM.
 */

import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { Id } from "../_generated/dataModel";

/**
 * CREATE SYNC RECORD
 *
 * Creates a new contact sync record for tracking synchronization progress.
 * Called when previewing or executing contact syncs.
 */
export const createSyncRecord = mutation({
  args: {
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    provider: v.string(),
    connectionId: v.string(),
    syncType: v.union(v.literal("manual"), v.literal("scheduled"), v.literal("automatic")),
    status: v.union(v.literal("preview"), v.literal("pending"), v.literal("syncing"), v.literal("completed"), v.literal("failed")),
    totalContacts: v.number(),
    previewData: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const syncId = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "contact_sync",
      subtype: args.provider,
      name: `Contact Sync - ${args.provider} - ${new Date().toISOString()}`,
      status: args.status as "draft" | "active" | "completed",
      customProperties: {
        provider: args.provider,
        connectionId: args.connectionId,
        syncType: args.syncType,
        totalContacts: args.totalContacts,
        created: 0,
        updated: 0,
        skipped: 0,
        failed: 0,
        previewData: args.previewData,
        startedAt: now,
        completedAt: null,
        errors: [],
      },
      createdBy: args.userId,
      createdAt: now,
      updatedAt: now,
    });

    return syncId;
  },
});

/**
 * UPDATE SYNC RECORD
 *
 * Updates sync record with progress and final statistics.
 */
export const updateSyncRecord = mutation({
  args: {
    syncId: v.id("objects"),
    status: v.union(v.literal("preview"), v.literal("pending"), v.literal("syncing"), v.literal("completed"), v.literal("failed")),
    stats: v.object({
      created: v.number(),
      updated: v.number(),
      skipped: v.number(),
      failed: v.number(),
      errors: v.optional(v.array(v.any())),
    }),
  },
  handler: async (ctx, args) => {
    const sync = await ctx.db.get(args.syncId);
    if (!sync) {
      throw new Error("Sync record not found");
    }

    await ctx.db.patch(args.syncId, {
      status: args.status as "draft" | "active" | "completed",
      customProperties: {
        ...sync.customProperties,
        created: args.stats.created,
        updated: args.stats.updated,
        skipped: args.stats.skipped,
        failed: args.stats.failed,
        errors: args.stats.errors || sync.customProperties?.errors || [],
        completedAt: args.status === "completed" || args.status === "failed" ? Date.now() : sync.customProperties?.completedAt,
      },
      updatedAt: Date.now(),
    });
  },
});

/**
 * GET SYNC RECORD
 *
 * Retrieves a sync record by ID.
 */
export const getSyncRecord = query({
  args: {
    syncId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const sync = await ctx.db.get(args.syncId);
    if (!sync || sync.type !== "contact_sync") {
      return null;
    }
    return sync;
  },
});

/**
 * LIST SYNC RECORDS
 *
 * Lists all sync records for an organization.
 */
export const listSyncRecords = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const syncs = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "contact_sync")
      )
      .order("desc")
      .collect();

    return syncs;
  },
});
