/**
 * ActiveCampaign Sync Infrastructure
 *
 * Handles bidirectional sync between platform CRM and ActiveCampaign.
 * Uses Convex scheduler for recurring syncs.
 *
 * Sync Types:
 * - Platform → ActiveCampaign: Push CRM contacts to AC
 * - ActiveCampaign → Platform: Pull AC contacts to CRM (future)
 */

import { action, mutation, query, internalMutation, internalAction, internalQuery } from "../_generated/server";
import { v } from "convex/values";
const generatedApi: any = require("../_generated/api");
import type { Id } from "../_generated/dataModel";
import type { ActionCtx } from "../_generated/server";

// Sync configuration schema stored in objects table
interface ActiveCampaignSyncConfig {
  enabled: boolean;
  direction: "to_activecampaign" | "from_activecampaign" | "bidirectional";
  syncIntervalMinutes: number; // 0 = manual only
  lastSyncAt?: number;
  nextSyncAt?: number;
  syncFilters?: {
    tags?: string[];
    contactTypes?: string[];
    createdAfter?: number;
  };
  listMappings?: Array<{
    platformTag: string;
    activeCampaignListId: string;
  }>;
  tagMappings?: Array<{
    platformTag: string;
    activeCampaignTagId: string;
  }>;
  fieldMappings?: Array<{
    platformField: string;
    activeCampaignField: string;
  }>;
}

/**
 * Get sync configuration for an organization
 */
export const getSyncConfig = query({
  args: {
    sessionId: v.optional(v.string()),
    organizationId: v.optional(v.id("organizations")),
  },
  handler: async (ctx, args): Promise<ActiveCampaignSyncConfig | null> => {
    let orgId: Id<"organizations"> | undefined = args.organizationId;

    // If sessionId provided, get org from session
    if (!orgId && args.sessionId) {
      const session = await ctx.db.get(args.sessionId as Id<"sessions">);
      if (session) {
        const user = await ctx.db.get(session.userId);
        orgId = user?.defaultOrgId;
      }
    }

    if (!orgId) {
      return null;
    }

    // Get sync config from objects table
    const configObject = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", orgId!).eq("type", "activecampaign_sync_config")
      )
      .first();

    if (!configObject) {
      // Return default config
      return {
        enabled: false,
        direction: "to_activecampaign",
        syncIntervalMinutes: 0,
      };
    }

    return configObject.customProperties as unknown as ActiveCampaignSyncConfig;
  },
});

/**
 * Save sync configuration
 */
export const saveSyncConfig = mutation({
  args: {
    sessionId: v.string(),
    config: v.object({
      enabled: v.boolean(),
      direction: v.union(
        v.literal("to_activecampaign"),
        v.literal("from_activecampaign"),
        v.literal("bidirectional")
      ),
      syncIntervalMinutes: v.number(),
      syncFilters: v.optional(v.object({
        tags: v.optional(v.array(v.string())),
        contactTypes: v.optional(v.array(v.string())),
        createdAfter: v.optional(v.number()),
      })),
      listMappings: v.optional(v.array(v.object({
        platformTag: v.string(),
        activeCampaignListId: v.string(),
      }))),
      tagMappings: v.optional(v.array(v.object({
        platformTag: v.string(),
        activeCampaignTagId: v.string(),
      }))),
      fieldMappings: v.optional(v.array(v.object({
        platformField: v.string(),
        activeCampaignField: v.string(),
      }))),
    }),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId as Id<"sessions">);
    if (!session || session.expiresAt < Date.now()) {
      throw new Error("Invalid session");
    }

    const user = await ctx.db.get(session.userId);
    if (!user?.defaultOrgId) {
      throw new Error("No organization");
    }

    const orgId = user.defaultOrgId;

    // Check existing config
    const existing = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", orgId).eq("type", "activecampaign_sync_config")
      )
      .first();

    const configData = {
      ...args.config,
      lastSyncAt: existing?.customProperties?.lastSyncAt,
      nextSyncAt: args.config.enabled && args.config.syncIntervalMinutes > 0
        ? Date.now() + (args.config.syncIntervalMinutes * 60 * 1000)
        : undefined,
    };

    if (existing) {
      await ctx.db.patch(existing._id, {
        customProperties: configData,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("objects", {
        organizationId: orgId,
        type: "activecampaign_sync_config",
        name: "ActiveCampaign Sync Configuration",
        status: "active",
        customProperties: configData,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    // Schedule next sync if enabled
    if (args.config.enabled && args.config.syncIntervalMinutes > 0) {
      await (ctx.scheduler as any).runAfter(
        args.config.syncIntervalMinutes * 60 * 1000,
        generatedApi.internal.oauth.activecampaignSync.executeScheduledSync,
        { organizationId: orgId }
      );
    }

    return { success: true };
  },
});

/**
 * Execute a scheduled sync
 */
export const executeScheduledSync = internalAction({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    console.log(`[ActiveCampaign Sync] Starting scheduled sync for org: ${args.organizationId}`);

    // Get sync config
    const configObject = await (ctx as any).runQuery(generatedApi.internal.oauth.activecampaignSync.getSyncConfigInternal, {
      organizationId: args.organizationId,
    });

    if (!configObject?.enabled) {
      console.log("[ActiveCampaign Sync] Sync is disabled, skipping");
      return;
    }

    // Get ActiveCampaign connection
    const connection = await (ctx as any).runQuery(generatedApi.internal.oauth.activecampaign.getConnectionByOrg, {
      organizationId: args.organizationId,
    });

    if (!connection) {
      console.log("[ActiveCampaign Sync] No ActiveCampaign connection");
      return;
    }

    try {
      // Execute sync based on direction
      if (configObject.direction === "to_activecampaign" || configObject.direction === "bidirectional") {
        await syncPlatformToActiveCampaign(ctx, args.organizationId, connection._id, configObject);
      }

      // Update last sync time
      await (ctx as any).runMutation(generatedApi.internal.oauth.activecampaignSync.updateLastSync, {
        organizationId: args.organizationId,
        lastSyncAt: Date.now(),
      });

      // Schedule next sync
      if (configObject.syncIntervalMinutes > 0) {
        await (ctx.scheduler as any).runAfter(
          configObject.syncIntervalMinutes * 60 * 1000,
          generatedApi.internal.oauth.activecampaignSync.executeScheduledSync,
          { organizationId: args.organizationId }
        );
      }

      console.log("[ActiveCampaign Sync] Sync completed successfully");
    } catch (error) {
      console.error("[ActiveCampaign Sync] Sync failed:", error);
    }
  },
});

/**
 * Internal query to get sync config
 */
export const getSyncConfigInternal = internalQuery({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args): Promise<ActiveCampaignSyncConfig | null> => {
    const configObject = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "activecampaign_sync_config")
      )
      .first();

    if (!configObject) {
      return null;
    }

    return configObject.customProperties as unknown as ActiveCampaignSyncConfig;
  },
});

/**
 * Update last sync timestamp
 */
export const updateLastSync = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    lastSyncAt: v.number(),
  },
  handler: async (ctx, args) => {
    const configObject = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "activecampaign_sync_config")
      )
      .first();

    if (configObject) {
      const currentConfig = configObject.customProperties as Record<string, unknown>;
      await ctx.db.patch(configObject._id, {
        customProperties: {
          ...currentConfig,
          lastSyncAt: args.lastSyncAt,
        },
        updatedAt: Date.now(),
      });
    }
  },
});

/**
 * Manual sync trigger
 */
export const triggerManualSync = action({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    syncedCount?: number;
    error?: string;
  }> => {
    // Get current user from session
    const user = await (ctx as any).runQuery(generatedApi.api.auth.getCurrentUser, { sessionId: args.sessionId }) as {
      _id: Id<"users">;
      defaultOrgId?: Id<"organizations">;
    } | null;

    if (!user?.defaultOrgId) {
      return { success: false, error: "Invalid session or no organization" };
    }

    const orgId = user.defaultOrgId;

    // Check connection
    const connection = await (ctx as any).runQuery(generatedApi.internal.oauth.activecampaign.getConnectionByOrg, {
      organizationId: orgId,
    });

    if (!connection) {
      return { success: false, error: "ActiveCampaign not connected" };
    }

    // Get config
    const config = await (ctx as any).runQuery(generatedApi.internal.oauth.activecampaignSync.getSyncConfigInternal, {
      organizationId: orgId,
    });

    try {
      const result = await syncPlatformToActiveCampaign(ctx, orgId, connection._id, config || {
        enabled: true,
        direction: "to_activecampaign",
        syncIntervalMinutes: 0,
      });

      // Update last sync
      await (ctx as any).runMutation(generatedApi.internal.oauth.activecampaignSync.updateLastSync, {
        organizationId: orgId,
        lastSyncAt: Date.now(),
      });

      return {
        success: true,
        syncedCount: result.syncedCount,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Sync failed",
      };
    }
  },
});

/**
 * Sync platform contacts to ActiveCampaign
 */
async function syncPlatformToActiveCampaign(
  ctx: ActionCtx,
  organizationId: Id<"organizations">,
  connectionId: Id<"oauthConnections">,
  config: Partial<ActiveCampaignSyncConfig>
): Promise<{ syncedCount: number }> {
  // Get CRM contacts from platform
  const contacts = await (ctx as any).runQuery(generatedApi.api.ontologyHelpers.getObjects, {
    organizationId,
    type: "crm_contact",
  });

  let syncedCount = 0;

  for (const contact of contacts) {
    const email = contact.customProperties?.email;
    if (!email) continue;

    // Apply filters
    if (config.syncFilters?.createdAfter && contact.createdAt < config.syncFilters.createdAfter) {
      continue;
    }

    try {
      // Sync contact to ActiveCampaign
      const acContact = await (ctx as any).runAction(generatedApi.internal.oauth.activecampaign.upsertContact, {
        connectionId,
        email,
        firstName: contact.customProperties?.firstName,
        lastName: contact.customProperties?.lastName,
        phone: contact.customProperties?.phone,
      });

      // Apply list mappings
      if (config.listMappings && contact.customProperties?.tags) {
        for (const mapping of config.listMappings) {
          if (contact.customProperties.tags.includes(mapping.platformTag)) {
            await (ctx as any).runAction(generatedApi.internal.oauth.activecampaign.subscribeToList, {
              connectionId,
              contactId: acContact.id,
              listId: mapping.activeCampaignListId,
            });
          }
        }
      }

      // Apply tag mappings
      if (config.tagMappings && contact.customProperties?.tags) {
        for (const mapping of config.tagMappings) {
          if (contact.customProperties.tags.includes(mapping.platformTag)) {
            await (ctx as any).runAction(generatedApi.internal.oauth.activecampaign.addTagToContact, {
              connectionId,
              contactId: acContact.id,
              tagId: mapping.activeCampaignTagId,
            });
          }
        }
      }

      syncedCount++;
    } catch (error) {
      console.error(`[ActiveCampaign Sync] Failed to sync contact ${email}:`, error);
    }
  }

  return { syncedCount };
}
