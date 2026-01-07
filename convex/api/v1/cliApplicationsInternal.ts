/**
 * CLI APPLICATIONS INTERNAL
 *
 * Internal queries and mutations for CLI applications API.
 * These are called by the HTTP handlers and should not be exposed publicly.
 */

import { internalQuery, internalMutation } from "../../_generated/server";
import { v } from "convex/values";
import type { Id } from "../../_generated/dataModel";

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

/**
 * Link API Key to Application (Internal)
 *
 * Links an API key to a connected application.
 */
export const linkApiKeyToApplication = internalMutation({
  args: {
    applicationId: v.id("objects"),
    apiKeyId: v.id("apiKeys"),
  },
  handler: async (ctx, args): Promise<void> => {
    const app = await ctx.db.get(args.applicationId);
    if (!app) {
      throw new Error("Application not found");
    }

    const currentProps = (app.customProperties || {}) as Record<string, unknown>;
    const connection = (currentProps.connection || {}) as Record<string, unknown>;

    await ctx.db.patch(args.applicationId, {
      customProperties: {
        ...currentProps,
        connection: {
          ...connection,
          apiKeyId: args.apiKeyId,
        },
      },
      updatedAt: Date.now(),
    });

    // Create object link for the API key relationship
    await ctx.db.insert("objectLinks", {
      organizationId: app.organizationId,
      fromObjectId: args.applicationId,
      toObjectId: args.applicationId, // Self-link, API key ID in properties
      linkType: "uses_api_key",
      properties: {
        apiKeyId: args.apiKeyId,
      },
      createdAt: Date.now(),
    });
  },
});

/**
 * Get Application with API Key (Internal)
 *
 * Gets an application with its linked API key info (without the actual key).
 */
export const getApplicationWithApiKey = internalQuery({
  args: {
    applicationId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const app = await ctx.db.get(args.applicationId);
    if (!app || app.type !== "connected_application") {
      return null;
    }

    const props = app.customProperties as any;
    let apiKeyInfo = null;

    if (props?.connection?.apiKeyId) {
      const apiKey = await ctx.db.get(props.connection.apiKeyId);
      if (apiKey && "keyPrefix" in apiKey) {
        const key = apiKey as {
          _id: typeof apiKey._id;
          name: string;
          keyPrefix: string;
          status: string;
          scopes: string[];
        };
        apiKeyInfo = {
          id: key._id,
          name: key.name,
          keyPrefix: key.keyPrefix,
          status: key.status,
          scopes: key.scopes,
        };
      }
    }

    return {
      ...app,
      apiKeyInfo,
    };
  },
});

/**
 * Update Application Activity (Internal)
 *
 * Updates the lastActivityAt timestamp for an application.
 * Called on any CLI interaction.
 */
export const updateApplicationActivity = internalMutation({
  args: {
    applicationId: v.id("objects"),
  },
  handler: async (ctx, args): Promise<void> => {
    const app = await ctx.db.get(args.applicationId);
    if (!app || app.type !== "connected_application") {
      return;
    }

    const currentProps = (app.customProperties || {}) as Record<string, unknown>;
    const cli = (currentProps.cli || {}) as Record<string, unknown>;

    await ctx.db.patch(args.applicationId, {
      customProperties: {
        ...currentProps,
        cli: {
          ...cli,
          lastActivityAt: Date.now(),
        },
      },
      updatedAt: Date.now(),
    });
  },
});

/**
 * Record Sync Event (Internal)
 *
 * Records a sync event for an application.
 */
export const recordSyncEvent = internalMutation({
  args: {
    applicationId: v.id("objects"),
    direction: v.union(v.literal("push"), v.literal("pull"), v.literal("bidirectional")),
    status: v.union(v.literal("success"), v.literal("partial"), v.literal("failed")),
    recordsProcessed: v.number(),
    recordsCreated: v.number(),
    recordsUpdated: v.number(),
    errors: v.number(),
  },
  handler: async (ctx, args): Promise<void> => {
    const app = await ctx.db.get(args.applicationId);
    if (!app || app.type !== "connected_application") {
      throw new Error("Application not found");
    }

    const currentProps = (app.customProperties || {}) as Record<string, unknown>;
    const currentSync = (currentProps.sync || {}) as Record<string, unknown>;
    const currentStats = (currentSync.stats || {
      totalPushed: 0,
      totalPulled: 0,
      lastPushCount: 0,
      lastPullCount: 0,
    }) as {
      totalPushed: number;
      totalPulled: number;
      lastPushCount: number;
      lastPullCount: number;
    };

    // Update stats based on direction
    const newStats = { ...currentStats };
    if (args.direction === "push" || args.direction === "bidirectional") {
      newStats.totalPushed += args.recordsCreated + args.recordsUpdated;
      newStats.lastPushCount = args.recordsCreated + args.recordsUpdated;
    }
    if (args.direction === "pull" || args.direction === "bidirectional") {
      newStats.totalPulled += args.recordsCreated + args.recordsUpdated;
      newStats.lastPullCount = args.recordsCreated + args.recordsUpdated;
    }

    await ctx.db.patch(args.applicationId, {
      customProperties: {
        ...currentProps,
        sync: {
          ...currentSync,
          enabled: true,
          lastSyncAt: Date.now(),
          lastSyncStatus: args.status,
          stats: newStats,
        },
        cli: {
          ...(currentProps.cli as Record<string, unknown> || {}),
          lastActivityAt: Date.now(),
        },
      },
      updatedAt: Date.now(),
    });

    // Log sync action
    await ctx.db.insert("objectActions", {
      organizationId: app.organizationId,
      objectId: args.applicationId,
      actionType: "sync_completed",
      actionData: {
        direction: args.direction,
        status: args.status,
        recordsProcessed: args.recordsProcessed,
        recordsCreated: args.recordsCreated,
        recordsUpdated: args.recordsUpdated,
        errors: args.errors,
      },
      performedAt: Date.now(),
    });
  },
});
