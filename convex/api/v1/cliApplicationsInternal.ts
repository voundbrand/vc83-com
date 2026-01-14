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
 * Check if API Key is Already Linked (Internal)
 *
 * Checks if an API key is already linked to another application.
 * Enforces the "one API key = one application" constraint.
 *
 * Returns:
 * - { linked: false } if the API key is available
 * - { linked: true, applicationId, applicationName } if already linked
 */
export const checkApiKeyAlreadyLinked = internalQuery({
  args: {
    apiKeyId: v.id("apiKeys"),
    excludeApplicationId: v.optional(v.id("objects")), // Exclude this app (for re-linking same app)
  },
  handler: async (ctx, args): Promise<{
    linked: boolean;
    applicationId?: Id<"objects">;
    applicationName?: string;
  }> => {
    // Find any application that has this API key linked
    const apps = await ctx.db
      .query("objects")
      .filter((q) => q.eq(q.field("type"), "connected_application"))
      .collect();

    for (const app of apps) {
      // Skip the excluded application (useful when updating an existing link)
      if (args.excludeApplicationId && app._id === args.excludeApplicationId) {
        continue;
      }

      // Skip archived applications
      if (app.status === "archived") {
        continue;
      }

      const props = app.customProperties as { connection?: { apiKeyId?: Id<"apiKeys"> } } | undefined;
      if (props?.connection?.apiKeyId === args.apiKeyId) {
        return {
          linked: true,
          applicationId: app._id,
          applicationName: app.name,
        };
      }
    }

    return { linked: false };
  },
});

/**
 * Link API Key to Application (Internal)
 *
 * Links an API key to a connected application.
 * Enforces "one API key = one application" constraint.
 *
 * @throws Error with code API_KEY_ALREADY_LINKED if the key is connected elsewhere
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

    // Check if this API key is already linked to another application
    // We need to scan all connected_applications to enforce the constraint
    const allApps = await ctx.db
      .query("objects")
      .filter((q) => q.eq(q.field("type"), "connected_application"))
      .collect();

    for (const existingApp of allApps) {
      // Skip the current application being linked
      if (existingApp._id === args.applicationId) {
        continue;
      }

      // Skip archived applications
      if (existingApp.status === "archived") {
        continue;
      }

      const props = existingApp.customProperties as { connection?: { apiKeyId?: Id<"apiKeys"> } } | undefined;
      if (props?.connection?.apiKeyId === args.apiKeyId) {
        // Create a structured error that can be caught and returned to CLI
        const error = new Error(
          `This API key is already connected to another application: "${existingApp.name}". ` +
          `Each API key can only be linked to one application.`
        );
        (error as any).code = "API_KEY_ALREADY_LINKED";
        (error as any).linkedApplicationId = existingApp._id;
        (error as any).linkedApplicationName = existingApp.name;
        (error as any).suggestion = "Generate a new API key for this application, or disconnect the existing application first.";
        throw error;
      }
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
