/**
 * APPLICATION ONTOLOGY
 *
 * Manages connected_application objects for CLI-connected external applications.
 * This bridges external apps (Next.js, Remix, etc.) to the L4YERCAK3 backend.
 *
 * Application Source Types:
 * - "cli" - Connected via CLI tool (l4yercak3 init)
 * - "boilerplate" - Created from L4YERCAK3 template
 * - "manual" - Manually configured (API key only)
 *
 * Status Workflow:
 * - "connecting" - Initial registration in progress
 * - "active" - Application is connected and working
 * - "paused" - Temporarily paused by user
 * - "disconnected" - Connection lost or API key revoked
 * - "archived" - Soft deleted
 */

import { query, mutation, internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAuthenticatedUser } from "./rbacHelpers";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Connected Application custom properties schema
 */
const applicationPropertiesValidator = v.object({
  // Source information
  source: v.object({
    type: v.union(v.literal("cli"), v.literal("boilerplate"), v.literal("manual")),
    projectPathHash: v.optional(v.string()), // SHA256 of absolute path (for CLI)
    cliVersion: v.optional(v.string()),
    framework: v.string(), // "nextjs", "remix", "astro", etc.
    frameworkVersion: v.optional(v.string()),
    hasTypeScript: v.optional(v.boolean()),
    routerType: v.optional(v.string()), // "app" or "pages" for Next.js
  }),

  // Connection configuration
  connection: v.object({
    apiKeyId: v.optional(v.id("apiKeys")),
    backendUrl: v.string(), // Convex site URL
    features: v.array(v.string()), // ["crm", "events", "checkout", etc.]
    hasFrontendDatabase: v.optional(v.boolean()),
    frontendDatabaseType: v.optional(v.string()), // "convex", "prisma", "drizzle"
  }),

  // Model mappings (local models → L4YERCAK3 types)
  modelMappings: v.optional(v.array(v.object({
    localModel: v.string(), // "User", "Event", etc.
    layerCakeType: v.string(), // "contact", "event", etc.
    syncDirection: v.union(
      v.literal("push"),
      v.literal("pull"),
      v.literal("bidirectional"),
      v.literal("none")
    ),
    confidence: v.number(), // 0-100
    isAutoDetected: v.boolean(),
    fieldMappings: v.optional(v.array(v.object({
      localField: v.string(),
      layerCakeField: v.string(),
      transform: v.optional(v.string()),
    }))),
  }))),

  // Deployment info (if connected to Web Publishing)
  deployment: v.optional(v.object({
    configurationId: v.optional(v.id("objects")), // deployment_configuration
    productionUrl: v.optional(v.string()),
    stagingUrl: v.optional(v.string()),
    lastDeployedAt: v.optional(v.number()),
  })),

  // Associated pages
  pageIds: v.optional(v.array(v.id("objects"))),

  // Sync status
  sync: v.optional(v.object({
    enabled: v.boolean(),
    lastSyncAt: v.optional(v.number()),
    lastSyncStatus: v.optional(v.union(
      v.literal("success"),
      v.literal("partial"),
      v.literal("failed")
    )),
    stats: v.optional(v.object({
      totalPushed: v.number(),
      totalPulled: v.number(),
      lastPushCount: v.number(),
      lastPullCount: v.number(),
    })),
  })),

  // CLI metadata
  cli: v.optional(v.object({
    registeredAt: v.number(),
    lastActivityAt: v.number(),
    generatedFiles: v.optional(v.array(v.object({
      path: v.string(),
      type: v.string(),
      generatedAt: v.number(),
    }))),
  })),
});

// ============================================================================
// PUBLIC QUERIES
// ============================================================================

/**
 * Get all connected applications for an organization
 */
export const getApplications = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const apps = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "connected_application")
      )
      .collect();

    // Filter by status if provided
    if (args.status) {
      return apps.filter((app) => app.status === args.status);
    }

    return apps;
  },
});

/**
 * Get a single application by ID
 */
export const getApplication = query({
  args: {
    sessionId: v.string(),
    applicationId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const app = await ctx.db.get(args.applicationId);
    if (!app || app.type !== "connected_application") {
      return null;
    }

    return app;
  },
});

/**
 * Get application by project path hash (for CLI deduplication)
 */
export const getApplicationByPathHash = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    projectPathHash: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const apps = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "connected_application")
      )
      .collect();

    // Find by projectPathHash in customProperties
    const app = apps.find((a) => {
      const props = a.customProperties as { source?: { projectPathHash?: string } } | undefined;
      return props?.source?.projectPathHash === args.projectPathHash;
    });

    return app || null;
  },
});

// ============================================================================
// PUBLIC MUTATIONS
// ============================================================================

/**
 * Register a new connected application (called by CLI)
 */
export const registerApplication = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    name: v.string(),
    description: v.optional(v.string()),
    source: v.object({
      type: v.union(v.literal("cli"), v.literal("boilerplate"), v.literal("manual")),
      projectPathHash: v.optional(v.string()),
      cliVersion: v.optional(v.string()),
      framework: v.string(),
      frameworkVersion: v.optional(v.string()),
      hasTypeScript: v.optional(v.boolean()),
      routerType: v.optional(v.string()),
    }),
    connection: v.object({
      features: v.array(v.string()),
      hasFrontendDatabase: v.optional(v.boolean()),
      frontendDatabaseType: v.optional(v.string()),
    }),
    modelMappings: v.optional(v.array(v.object({
      localModel: v.string(),
      layerCakeType: v.string(),
      syncDirection: v.union(
        v.literal("push"),
        v.literal("pull"),
        v.literal("bidirectional"),
        v.literal("none")
      ),
      confidence: v.number(),
      isAutoDetected: v.boolean(),
    }))),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // Check if application already exists with this path hash
    if (args.source.projectPathHash) {
      const existingApps = await ctx.db
        .query("objects")
        .withIndex("by_org_type", (q) =>
          q.eq("organizationId", args.organizationId).eq("type", "connected_application")
        )
        .collect();

      const existing = existingApps.find((a) => {
        const props = a.customProperties as { source?: { projectPathHash?: string } } | undefined;
        return props?.source?.projectPathHash === args.source.projectPathHash;
      });

      if (existing) {
        // Return existing application instead of creating duplicate
        return {
          applicationId: existing._id,
          existingApplication: true,
          message: "Application already registered for this project",
        };
      }
    }

    // Get backend URL from environment
    const backendUrl = process.env.CONVEX_SITE_URL || "https://agreeable-lion-828.convex.site";

    // Build custom properties
    const customProperties = {
      source: args.source,
      connection: {
        ...args.connection,
        backendUrl,
      },
      modelMappings: args.modelMappings || [],
      sync: {
        enabled: false,
      },
      cli: {
        registeredAt: Date.now(),
        lastActivityAt: Date.now(),
        generatedFiles: [],
      },
    };

    // Create application object
    const applicationId = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "connected_application",
      subtype: args.source.framework,
      name: args.name,
      description: args.description,
      status: "active",
      customProperties,
      createdBy: userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Log activity
    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: applicationId,
      actionType: "application_registered",
      actionData: {
        source: args.source.type,
        framework: args.source.framework,
        features: args.connection.features,
      },
      performedBy: userId,
      performedAt: Date.now(),
    });

    return {
      applicationId,
      existingApplication: false,
      backendUrl,
    };
  },
});

/**
 * Update an existing connected application
 */
export const updateApplication = mutation({
  args: {
    sessionId: v.string(),
    applicationId: v.id("objects"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(v.union(
      v.literal("active"),
      v.literal("paused"),
      v.literal("disconnected"),
      v.literal("archived")
    )),
    connection: v.optional(v.object({
      features: v.optional(v.array(v.string())),
      apiKeyId: v.optional(v.id("apiKeys")),
    })),
    modelMappings: v.optional(v.array(v.object({
      localModel: v.string(),
      layerCakeType: v.string(),
      syncDirection: v.union(
        v.literal("push"),
        v.literal("pull"),
        v.literal("bidirectional"),
        v.literal("none")
      ),
      confidence: v.number(),
      isAutoDetected: v.boolean(),
      fieldMappings: v.optional(v.array(v.object({
        localField: v.string(),
        layerCakeField: v.string(),
        transform: v.optional(v.string()),
      }))),
    }))),
    deployment: v.optional(v.object({
      configurationId: v.optional(v.id("objects")),
      productionUrl: v.optional(v.string()),
      stagingUrl: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const app = await ctx.db.get(args.applicationId);
    if (!app || app.type !== "connected_application") {
      throw new Error("Application not found");
    }

    const currentProps = (app.customProperties || {}) as Record<string, unknown>;
    const updates: Record<string, unknown> = {
      updatedAt: Date.now(),
    };

    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;
    if (args.status !== undefined) updates.status = args.status;

    // Update customProperties
    const newProps = { ...currentProps };

    if (args.connection) {
      newProps.connection = {
        ...(currentProps.connection as Record<string, unknown> || {}),
        ...args.connection,
      };
    }

    if (args.modelMappings !== undefined) {
      newProps.modelMappings = args.modelMappings;
    }

    if (args.deployment !== undefined) {
      newProps.deployment = {
        ...(currentProps.deployment as Record<string, unknown> || {}),
        ...args.deployment,
      };
    }

    // Update CLI activity timestamp
    if (newProps.cli) {
      (newProps.cli as Record<string, unknown>).lastActivityAt = Date.now();
    }

    updates.customProperties = newProps;

    await ctx.db.patch(args.applicationId, updates);

    // Log activity
    await ctx.db.insert("objectActions", {
      organizationId: app.organizationId,
      objectId: args.applicationId,
      actionType: "application_updated",
      actionData: {
        updatedFields: Object.keys(args).filter(k => k !== "sessionId" && k !== "applicationId"),
      },
      performedBy: userId,
      performedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Link API key to application
 */
export const linkApiKey = mutation({
  args: {
    sessionId: v.string(),
    applicationId: v.id("objects"),
    apiKeyId: v.id("apiKeys"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const app = await ctx.db.get(args.applicationId);
    if (!app || app.type !== "connected_application") {
      throw new Error("Application not found");
    }

    // Verify API key exists and belongs to same org
    const apiKey = await ctx.db.get(args.apiKeyId);
    if (!apiKey || apiKey.organizationId !== app.organizationId) {
      throw new Error("Invalid API key");
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

    // Create object link
    await ctx.db.insert("objectLinks", {
      organizationId: app.organizationId,
      fromObjectId: args.applicationId,
      toObjectId: args.applicationId, // Self-link with API key in properties
      linkType: "uses_api_key",
      properties: {
        apiKeyId: args.apiKeyId,
      },
      createdBy: userId,
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Archive application (soft delete)
 */
export const archiveApplication = mutation({
  args: {
    sessionId: v.string(),
    applicationId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const app = await ctx.db.get(args.applicationId);
    if (!app || app.type !== "connected_application") {
      throw new Error("Application not found");
    }

    await ctx.db.patch(args.applicationId, {
      status: "archived",
      updatedAt: Date.now(),
    });

    // Log activity
    await ctx.db.insert("objectActions", {
      organizationId: app.organizationId,
      objectId: args.applicationId,
      actionType: "application_archived",
      actionData: {},
      performedBy: userId,
      performedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Record generated file (for tracking what CLI generated)
 */
export const recordGeneratedFile = mutation({
  args: {
    sessionId: v.string(),
    applicationId: v.id("objects"),
    filePath: v.string(),
    fileType: v.string(), // "api-client", "types", "env", etc.
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const app = await ctx.db.get(args.applicationId);
    if (!app || app.type !== "connected_application") {
      throw new Error("Application not found");
    }

    const currentProps = (app.customProperties || {}) as Record<string, unknown>;
    const cli = (currentProps.cli || {}) as Record<string, unknown>;
    const generatedFiles = (cli.generatedFiles || []) as Array<{
      path: string;
      type: string;
      generatedAt: number;
    }>;

    // Update or add file record
    const existingIndex = generatedFiles.findIndex((f) => f.path === args.filePath);
    const newFile = {
      path: args.filePath,
      type: args.fileType,
      generatedAt: Date.now(),
    };

    if (existingIndex >= 0) {
      generatedFiles[existingIndex] = newFile;
    } else {
      generatedFiles.push(newFile);
    }

    await ctx.db.patch(args.applicationId, {
      customProperties: {
        ...currentProps,
        cli: {
          ...cli,
          generatedFiles,
          lastActivityAt: Date.now(),
        },
      },
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// ============================================================================
// INTERNAL QUERIES (for HTTP endpoints)
// ============================================================================

/**
 * Get application by path hash (internal - no session required)
 */
export const getApplicationByPathHashInternal = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    projectPathHash: v.string(),
  },
  handler: async (ctx, args) => {
    const apps = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "connected_application")
      )
      .collect();

    const app = apps.find((a) => {
      const props = a.customProperties as { source?: { projectPathHash?: string } } | undefined;
      return props?.source?.projectPathHash === args.projectPathHash;
    });

    if (!app) return null;

    return {
      id: app._id,
      name: app.name,
      status: app.status,
      features: ((app.customProperties as any)?.connection?.features || []) as string[],
      lastActivityAt: ((app.customProperties as any)?.cli?.lastActivityAt || app.updatedAt) as number,
    };
  },
});

/**
 * Get application by ID (internal)
 */
export const getApplicationInternal = internalQuery({
  args: {
    applicationId: v.id("objects"),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const app = await ctx.db.get(args.applicationId);
    if (!app || app.type !== "connected_application" || app.organizationId !== args.organizationId) {
      return null;
    }
    return app;
  },
});

/**
 * List applications for organization (internal)
 */
export const listApplicationsInternal = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    status: v.optional(v.string()),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let apps = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "connected_application")
      )
      .collect();

    // Filter by status
    if (args.status) {
      apps = apps.filter((app) => app.status === args.status);
    }

    const total = apps.length;

    // Apply pagination
    const offset = args.offset || 0;
    const limit = args.limit || 50;
    apps = apps.slice(offset, offset + limit);

    return {
      applications: apps,
      total,
      hasMore: offset + apps.length < total,
    };
  },
});

// ============================================================================
// INTERNAL MUTATIONS (for HTTP endpoints)
// ============================================================================

/**
 * Register application (internal - API key auth)
 */
export const registerApplicationInternal = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    name: v.string(),
    description: v.optional(v.string()),
    source: v.object({
      type: v.union(v.literal("cli"), v.literal("boilerplate"), v.literal("manual")),
      projectPathHash: v.optional(v.string()),
      cliVersion: v.optional(v.string()),
      framework: v.string(),
      frameworkVersion: v.optional(v.string()),
      hasTypeScript: v.optional(v.boolean()),
      routerType: v.optional(v.string()),
    }),
    connection: v.object({
      features: v.array(v.string()),
      hasFrontendDatabase: v.optional(v.boolean()),
      frontendDatabaseType: v.optional(v.string()),
    }),
    modelMappings: v.optional(v.array(v.object({
      localModel: v.string(),
      layerCakeType: v.string(),
      syncDirection: v.string(),
      confidence: v.number(),
      isAutoDetected: v.boolean(),
    }))),
  },
  handler: async (ctx, args) => {
    // Check for existing application with same path hash
    if (args.source.projectPathHash) {
      const existingApps = await ctx.db
        .query("objects")
        .withIndex("by_org_type", (q) =>
          q.eq("organizationId", args.organizationId).eq("type", "connected_application")
        )
        .collect();

      const existing = existingApps.find((a) => {
        const props = a.customProperties as { source?: { projectPathHash?: string } } | undefined;
        return props?.source?.projectPathHash === args.source.projectPathHash;
      });

      if (existing) {
        return {
          applicationId: existing._id,
          existingApplication: true,
        };
      }
    }

    const backendUrl = process.env.CONVEX_SITE_URL || "https://agreeable-lion-828.convex.site";

    const customProperties = {
      source: args.source,
      connection: {
        ...args.connection,
        backendUrl,
      },
      modelMappings: args.modelMappings || [],
      sync: { enabled: false },
      cli: {
        registeredAt: Date.now(),
        lastActivityAt: Date.now(),
        generatedFiles: [],
      },
    };

    const applicationId = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "connected_application",
      subtype: args.source.framework,
      name: args.name,
      description: args.description,
      status: "active",
      customProperties,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return {
      applicationId,
      existingApplication: false,
      backendUrl,
    };
  },
});

/**
 * Update application (internal - API key auth)
 */
export const updateApplicationInternal = internalMutation({
  args: {
    applicationId: v.id("objects"),
    organizationId: v.id("organizations"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(v.string()),
    connection: v.optional(v.object({
      features: v.optional(v.array(v.string())),
      hasFrontendDatabase: v.optional(v.boolean()),
      frontendDatabaseType: v.optional(v.string()),
    })),
    deployment: v.optional(v.object({
      githubRepo: v.optional(v.string()),
      productionUrl: v.optional(v.string()),
      stagingUrl: v.optional(v.string()),
    })),
    modelMappings: v.optional(v.array(v.any())),
  },
  handler: async (ctx, args) => {
    const app = await ctx.db.get(args.applicationId);
    if (!app || app.type !== "connected_application" || app.organizationId !== args.organizationId) {
      throw new Error("Application not found");
    }

    const currentProps = (app.customProperties || {}) as Record<string, unknown>;
    const updates: Record<string, unknown> = { updatedAt: Date.now() };

    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;
    if (args.status !== undefined) updates.status = args.status;

    const newProps = { ...currentProps };

    if (args.connection) {
      newProps.connection = {
        ...(currentProps.connection as Record<string, unknown> || {}),
        ...args.connection,
      };
    }

    if (args.deployment) {
      newProps.deployment = {
        ...(currentProps.deployment as Record<string, unknown> || {}),
        ...args.deployment,
      };
    }

    if (args.modelMappings !== undefined) {
      newProps.modelMappings = args.modelMappings;
    }

    if (newProps.cli) {
      (newProps.cli as Record<string, unknown>).lastActivityAt = Date.now();
    }

    updates.customProperties = newProps;

    await ctx.db.patch(args.applicationId, updates);

    return { success: true };
  },
});
