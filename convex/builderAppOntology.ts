/**
 * BUILDER APP ONTOLOGY
 *
 * Manages v0-generated deployable Next.js applications.
 * Uses the universal ontology system (objects table).
 *
 * Builder App Types (subtype):
 * - "v0_generated" - Generated via v0 Platform API
 * - "template_based" - Created from a pre-built template
 * - "custom" - Manually created/imported
 *
 * Status Workflow:
 * - "draft" - Initial creation, not yet complete
 * - "generating" - v0 is actively generating code
 * - "ready" - Code generation complete, ready for deployment
 * - "deploying" - Deployment in progress
 * - "deployed" - Successfully deployed and live
 * - "failed" - Generation or deployment failed
 * - "archived" - Soft deleted
 *
 * Features:
 * - v0 chat integration (chat ID, web URL, demo URL)
 * - Generated file storage
 * - GitHub repository creation
 * - Vercel deployment pipeline
 * - SDK integration with linked objects
 * - Environment variable management
 */

import { mutation, query, action, internalMutation, type MutationCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { requireAuthenticatedUser, checkPermission, getUserContext } from "./rbacHelpers";
import { checkResourceLimit } from "./licensing/helpers";
import { generateVercelDeployUrl } from "./publishingHelpers";

// ============================================================================
// FILE SYSTEM HELPERS (inline writes to builderFiles table)
// ============================================================================

function simpleHash(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return hash.toString(36);
}

async function upsertBuilderFiles(
  ctx: MutationCtx,
  appId: Id<"objects">,
  files: Array<{ path: string; content: string; language: string }>,
  modifiedBy: "v0" | "user" | "self-heal" | "scaffold"
) {
  const now = Date.now();
  const isScaffold = modifiedBy === "scaffold";

  const existing = await ctx.db
    .query("builderFiles")
    .withIndex("by_app", (q) => q.eq("appId", appId))
    .collect();

  const existingByPath = new Map(existing.map((f) => [f.path, f]));

  for (const file of files) {
    const contentHash = simpleHash(file.content);
    const existingFile = existingByPath.get(file.path);

    if (existingFile) {
      if (existingFile.contentHash !== contentHash) {
        await ctx.db.patch(existingFile._id, {
          content: file.content,
          language: file.language,
          contentHash,
          lastModifiedAt: now,
          lastModifiedBy: modifiedBy,
        });
      }
    } else {
      await ctx.db.insert("builderFiles", {
        appId,
        path: file.path,
        content: file.content,
        language: file.language,
        contentHash,
        lastModifiedAt: now,
        lastModifiedBy: modifiedBy,
        isScaffold,
      });
    }
  }
}

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Generated file from v0
 */
const generatedFileValidator = v.object({
  path: v.string(),
  content: v.string(),
  language: v.string(),
});

/**
 * Environment variable definition
 */
const envVarValidator = v.object({
  key: v.string(),
  description: v.string(),
  required: v.boolean(),
  defaultValue: v.optional(v.string()),
  // Value is NOT stored here for security - only metadata
});

/**
 * Deployment status
 */
const deploymentStatusValidator = v.union(
  v.literal("not_deployed"),
  v.literal("deploying"),
  v.literal("deployed"),
  v.literal("failed")
);

// ============================================================================
// QUERIES
// ============================================================================

/**
 * GET BUILDER APPS
 * Returns all builder apps for an organization
 */
export const getBuilderApps = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    status: v.optional(v.string()),
    subtype: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // Check permission
    const hasPermission = await checkPermission(
      ctx,
      userId,
      "view_published_pages",
      args.organizationId
    );
    if (!hasPermission) {
      throw new Error("Permission denied: view_published_pages required");
    }

    let apps = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "builder_app")
      )
      .collect();

    // Apply filters
    if (args.status) {
      apps = apps.filter((app) => app.status === args.status);
    }
    if (args.subtype) {
      apps = apps.filter((app) => app.subtype === args.subtype);
    }

    return apps;
  },
});

/**
 * GET BUILDER APP
 * Get a single builder app by ID
 */
export const getBuilderApp = query({
  args: {
    sessionId: v.string(),
    appId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const app = await ctx.db.get(args.appId);
    if (!app || app.type !== "builder_app") {
      throw new Error("Builder app not found");
    }

    // Check permission
    const hasPermission = await checkPermission(
      ctx,
      userId,
      "view_published_pages",
      app.organizationId
    );
    if (!hasPermission) {
      throw new Error("Permission denied: view_published_pages required");
    }

    return app;
  },
});

/**
 * GET BUILDER APP BY V0 CHAT ID
 * Find a builder app by its v0 chat ID
 */
export const getBuilderAppByV0ChatId = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    v0ChatId: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const apps = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "builder_app")
      )
      .collect();

    const app = apps.find(
      (a) => (a.customProperties as { v0ChatId?: string })?.v0ChatId === args.v0ChatId
    );

    return app || null;
  },
});

/**
 * GET BUILDER APP BY CONVERSATION ID
 * Find a builder app linked to a specific AI conversation
 */
export const getBuilderAppByConversationId = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    conversationId: v.id("aiConversations"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const apps = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "builder_app")
      )
      .collect();

    const app = apps.find(
      (a) => (a.customProperties as { conversationId?: string })?.conversationId === args.conversationId
    );

    return app || null;
  },
});

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * CREATE BUILDER APP
 * Create a new builder app from v0 generation
 */
export const createBuilderApp = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    name: v.string(),
    description: v.optional(v.string()),
    subtype: v.union(
      v.literal("v0_generated"),
      v.literal("template_based"),
      v.literal("custom")
    ),
    // v0 generation data
    v0ChatId: v.optional(v.string()),
    v0WebUrl: v.optional(v.string()),
    v0DemoUrl: v.optional(v.string()),
    // Generated files
    files: v.optional(v.array(generatedFileValidator)),
    // Linked conversation (for chat history)
    conversationId: v.optional(v.id("aiConversations")),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // Check permission
    const hasPermission = await checkPermission(
      ctx,
      userId,
      "create_published_pages",
      args.organizationId
    );
    if (!hasPermission) {
      throw new Error("Permission denied: create_published_pages required");
    }

    // Check resource limit
    await checkResourceLimit(ctx, args.organizationId, "builder_app", "maxBuilderApps");

    // Generate app code: APP-YYYY-###
    const year = new Date().getFullYear();
    const existingApps = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "builder_app")
      )
      .collect();

    const thisYearApps = existingApps.filter((a) => {
      const props = a.customProperties as { appCode?: string };
      return props?.appCode?.startsWith(`APP-${year}-`);
    });
    const nextNumber = (thisYearApps.length + 1).toString().padStart(3, "0");
    const appCode = `APP-${year}-${nextNumber}`;

    // Build customProperties
    const customProperties = {
      appCode,
      // v0 generation
      v0ChatId: args.v0ChatId,
      v0WebUrl: args.v0WebUrl,
      v0DemoUrl: args.v0DemoUrl,
      // SDK integration
      sdkVersion: "1.0.0",
      requiredEnvVars: [
        {
          key: "NEXT_PUBLIC_L4YERCAK3_API_KEY",
          description: "Your l4yercak3 API key",
          required: true,
        },
        {
          key: "NEXT_PUBLIC_L4YERCAK3_URL",
          description: "l4yercak3 API URL",
          required: false,
          defaultValue: "https://agreeable-lion-828.convex.site",
        },
        {
          key: "L4YERCAK3_ORG_ID",
          description: "Your organization ID",
          required: true,
        },
      ],
      // Linked objects
      linkedObjects: {
        events: [] as Id<"objects">[],
        products: [] as Id<"objects">[],
        forms: [] as Id<"objects">[],
        contacts: [] as Id<"objects">[],
      },
      // Deployment
      deployment: {
        githubRepo: null as string | null,
        githubBranch: "main",
        vercelProjectId: null as string | null,
        vercelDeployUrl: null as string | null,
        productionUrl: null as string | null,
        status: "not_deployed" as const,
        lastDeployedAt: null as number | null,
        deploymentError: null as string | null,
      },
      // Conversation link
      conversationId: args.conversationId,
    };

    // Create builder app object
    const appId = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "builder_app",
      subtype: args.subtype,
      name: args.name,
      description: args.description,
      status: args.v0ChatId ? "ready" : "draft",
      customProperties,
      createdBy: userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Store files in builderFiles table (VFS)
    if (args.files && args.files.length > 0) {
      await upsertBuilderFiles(ctx, appId, args.files, "v0");
    }

    // Audit log
    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: appId,
      actionType: "created",
      actionData: {
        appCode,
        subtype: args.subtype,
        hasV0Chat: !!args.v0ChatId,
        fileCount: args.files?.length || 0,
      },
      performedBy: userId,
      performedAt: Date.now(),
    });

    return { appId, appCode };
  },
});

/**
 * UPDATE BUILDER APP
 * Update builder app details
 */
export const updateBuilderApp = mutation({
  args: {
    sessionId: v.string(),
    appId: v.id("objects"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(v.string()),
    // v0 generation data
    v0ChatId: v.optional(v.string()),
    v0WebUrl: v.optional(v.string()),
    v0DemoUrl: v.optional(v.string()),
    // Generated files
    files: v.optional(v.array(generatedFileValidator)),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const app = await ctx.db.get(args.appId);
    if (!app || app.type !== "builder_app") {
      throw new Error("Builder app not found");
    }

    // Check permission
    const hasPermission = await checkPermission(
      ctx,
      userId,
      "edit_published_pages",
      app.organizationId
    );
    if (!hasPermission) {
      throw new Error("Permission denied: edit_published_pages required");
    }

    const updates: Record<string, unknown> = {
      updatedAt: Date.now(),
    };

    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;
    if (args.status !== undefined) updates.status = args.status;

    // Update customProperties if needed
    const currentProps = (app.customProperties || {}) as Record<string, unknown>;
    const propsUpdates: Record<string, unknown> = {};

    if (args.v0ChatId !== undefined) propsUpdates.v0ChatId = args.v0ChatId;
    if (args.v0WebUrl !== undefined) propsUpdates.v0WebUrl = args.v0WebUrl;
    if (args.v0DemoUrl !== undefined) propsUpdates.v0DemoUrl = args.v0DemoUrl;
    // Files are now stored in builderFiles table, not in customProperties

    if (Object.keys(propsUpdates).length > 0) {
      updates.customProperties = {
        ...currentProps,
        ...propsUpdates,
      };
    }

    await ctx.db.patch(args.appId, updates);

    // Upsert files in builderFiles table if provided
    if (args.files !== undefined) {
      await upsertBuilderFiles(ctx, args.appId, args.files, "v0");
    }

    // Audit log
    await ctx.db.insert("objectActions", {
      organizationId: app.organizationId,
      objectId: args.appId,
      actionType: "updated",
      actionData: {
        updatedFields: Object.keys(args).filter(
          (k) => k !== "sessionId" && k !== "appId" && args[k as keyof typeof args] !== undefined
        ),
      },
      performedBy: userId,
      performedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * LINK OBJECTS TO BUILDER APP
 * Connect real database records to a builder app
 */
export const linkObjectsToBuilderApp = mutation({
  args: {
    sessionId: v.string(),
    appId: v.id("objects"),
    events: v.optional(v.array(v.id("objects"))),
    products: v.optional(v.array(v.id("objects"))),
    forms: v.optional(v.array(v.id("objects"))),
    contacts: v.optional(v.array(v.id("objects"))),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const app = await ctx.db.get(args.appId);
    if (!app || app.type !== "builder_app") {
      throw new Error("Builder app not found");
    }

    // Check permission
    const hasPermission = await checkPermission(
      ctx,
      userId,
      "edit_published_pages",
      app.organizationId
    );
    if (!hasPermission) {
      throw new Error("Permission denied: edit_published_pages required");
    }

    const currentProps = (app.customProperties || {}) as Record<string, unknown>;
    const currentLinkedObjects = (currentProps.linkedObjects || {}) as Record<string, Id<"objects">[]>;

    const updatedLinkedObjects = {
      events: args.events !== undefined ? args.events : (currentLinkedObjects.events || []),
      products: args.products !== undefined ? args.products : (currentLinkedObjects.products || []),
      forms: args.forms !== undefined ? args.forms : (currentLinkedObjects.forms || []),
      contacts: args.contacts !== undefined ? args.contacts : (currentLinkedObjects.contacts || []),
    };

    await ctx.db.patch(args.appId, {
      customProperties: {
        ...currentProps,
        linkedObjects: updatedLinkedObjects,
      },
      updatedAt: Date.now(),
    });

    // Create objectLinks for tracking
    const allLinkedIds = [
      ...(args.events || []),
      ...(args.products || []),
      ...(args.forms || []),
      ...(args.contacts || []),
    ];

    for (const linkedId of allLinkedIds) {
      // Check if link already exists
      const existingLink = await ctx.db
        .query("objectLinks")
        .withIndex("by_from_link_type", (q) =>
          q.eq("fromObjectId", args.appId).eq("linkType", "uses")
        )
        .filter((q) => q.eq(q.field("toObjectId"), linkedId))
        .first();

      if (!existingLink) {
        await ctx.db.insert("objectLinks", {
          organizationId: app.organizationId,
          fromObjectId: args.appId,
          toObjectId: linkedId,
          linkType: "uses",
          createdBy: userId,
          createdAt: Date.now(),
        });
      }
    }

    // Audit log
    await ctx.db.insert("objectActions", {
      organizationId: app.organizationId,
      objectId: args.appId,
      actionType: "objects_linked",
      actionData: {
        events: args.events?.length || 0,
        products: args.products?.length || 0,
        forms: args.forms?.length || 0,
        contacts: args.contacts?.length || 0,
      },
      performedBy: userId,
      performedAt: Date.now(),
    });

    return { success: true, linkedObjects: updatedLinkedObjects };
  },
});

/**
 * UPDATE DEPLOYMENT INFO
 * Update deployment status and URLs
 */
export const updateBuilderAppDeployment = mutation({
  args: {
    sessionId: v.string(),
    appId: v.id("objects"),
    githubRepo: v.optional(v.string()),
    githubBranch: v.optional(v.string()),
    vercelProjectId: v.optional(v.string()),
    vercelDeployUrl: v.optional(v.string()),
    productionUrl: v.optional(v.string()),
    status: v.optional(deploymentStatusValidator),
    deploymentError: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const app = await ctx.db.get(args.appId);
    if (!app || app.type !== "builder_app") {
      throw new Error("Builder app not found");
    }

    // Check permission
    const hasPermission = await checkPermission(
      ctx,
      userId,
      "edit_published_pages",
      app.organizationId
    );
    if (!hasPermission) {
      throw new Error("Permission denied: edit_published_pages required");
    }

    const currentProps = (app.customProperties || {}) as Record<string, unknown>;
    const currentDeployment = (currentProps.deployment || {}) as Record<string, unknown>;

    const updatedDeployment = {
      ...currentDeployment,
    };

    if (args.githubRepo !== undefined) updatedDeployment.githubRepo = args.githubRepo;
    if (args.githubBranch !== undefined) updatedDeployment.githubBranch = args.githubBranch;
    if (args.vercelProjectId !== undefined) updatedDeployment.vercelProjectId = args.vercelProjectId;
    if (args.vercelDeployUrl !== undefined) updatedDeployment.vercelDeployUrl = args.vercelDeployUrl;
    if (args.productionUrl !== undefined) updatedDeployment.productionUrl = args.productionUrl;
    if (args.deploymentError !== undefined) updatedDeployment.deploymentError = args.deploymentError;

    if (args.status !== undefined) {
      updatedDeployment.status = args.status;
      if (args.status === "deployed") {
        updatedDeployment.lastDeployedAt = Date.now();
        updatedDeployment.deploymentError = null;
      }
    }

    // Update app status based on deployment
    let appStatus = app.status;
    if (args.status === "deploying") appStatus = "deploying";
    if (args.status === "deployed") appStatus = "deployed";
    if (args.status === "failed") appStatus = "failed";

    await ctx.db.patch(args.appId, {
      status: appStatus,
      customProperties: {
        ...currentProps,
        deployment: updatedDeployment,
      },
      updatedAt: Date.now(),
    });

    // Audit log
    await ctx.db.insert("objectActions", {
      organizationId: app.organizationId,
      objectId: args.appId,
      actionType: "deployment_updated",
      actionData: {
        status: args.status,
        githubRepo: args.githubRepo,
        productionUrl: args.productionUrl,
      },
      performedBy: userId,
      performedAt: Date.now(),
    });

    return { success: true, deployment: updatedDeployment };
  },
});

/**
 * GENERATE VERCEL DEPLOY URL
 * Generate a Vercel deploy button URL for a builder app
 */
export const generateBuilderAppDeployUrl = mutation({
  args: {
    sessionId: v.string(),
    appId: v.id("objects"),
    githubRepo: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const app = await ctx.db.get(args.appId);
    if (!app || app.type !== "builder_app") {
      throw new Error("Builder app not found");
    }

    // Check permission
    const hasPermission = await checkPermission(
      ctx,
      userId,
      "edit_published_pages",
      app.organizationId
    );
    if (!hasPermission) {
      throw new Error("Permission denied: edit_published_pages required");
    }

    const currentProps = (app.customProperties || {}) as Record<string, unknown>;
    const envVars = (currentProps.requiredEnvVars || []) as Array<{
      key: string;
      description: string;
      required: boolean;
      defaultValue?: string;
    }>;

    // Generate project name from app name
    const projectName = app.name.toLowerCase().replace(/\s+/g, "-");

    // Generate Vercel deploy URL
    let vercelDeployUrl: string;
    try {
      vercelDeployUrl = generateVercelDeployUrl(
        args.githubRepo,
        envVars.length > 0 ? envVars : undefined,
        projectName
      );
    } catch (error) {
      throw new Error(`Failed to generate Vercel URL: ${error instanceof Error ? error.message : "Unknown error"}`);
    }

    // Update deployment info
    const currentDeployment = (currentProps.deployment || {}) as Record<string, unknown>;
    const updatedDeployment = {
      ...currentDeployment,
      githubRepo: args.githubRepo,
      vercelDeployUrl,
    };

    await ctx.db.patch(args.appId, {
      customProperties: {
        ...currentProps,
        deployment: updatedDeployment,
      },
      updatedAt: Date.now(),
    });

    // Audit log
    await ctx.db.insert("objectActions", {
      organizationId: app.organizationId,
      objectId: args.appId,
      actionType: "deploy_url_generated",
      actionData: {
        githubRepo: args.githubRepo,
        vercelDeployUrl,
      },
      performedBy: userId,
      performedAt: Date.now(),
    });

    return {
      success: true,
      githubRepo: args.githubRepo,
      vercelDeployUrl,
    };
  },
});

/**
 * ARCHIVE BUILDER APP
 * Soft delete a builder app
 */
export const archiveBuilderApp = mutation({
  args: {
    sessionId: v.string(),
    appId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const app = await ctx.db.get(args.appId);
    if (!app || app.type !== "builder_app") {
      throw new Error("Builder app not found");
    }

    // Check permission
    const hasPermission = await checkPermission(
      ctx,
      userId,
      "delete_published_pages",
      app.organizationId
    );
    if (!hasPermission) {
      throw new Error("Permission denied: delete_published_pages required");
    }

    await ctx.db.patch(args.appId, {
      status: "archived",
      updatedAt: Date.now(),
    });

    // Audit log
    await ctx.db.insert("objectActions", {
      organizationId: app.organizationId,
      objectId: args.appId,
      actionType: "archived",
      performedBy: userId,
      performedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * DELETE BUILDER APP
 * Permanently delete a builder app (only draft status)
 */
export const deleteBuilderApp = mutation({
  args: {
    sessionId: v.string(),
    appId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const app = await ctx.db.get(args.appId);
    if (!app || app.type !== "builder_app") {
      throw new Error("Builder app not found");
    }

    // Check permission
    const hasPermission = await checkPermission(
      ctx,
      userId,
      "delete_published_pages",
      app.organizationId
    );
    if (!hasPermission) {
      throw new Error("Permission denied: delete_published_pages required");
    }

    // Only allow deleting draft apps
    if (app.status !== "draft" && app.status !== "archived") {
      throw new Error("Only draft or archived apps can be permanently deleted");
    }

    // Delete all links
    const links = await ctx.db
      .query("objectLinks")
      .withIndex("by_from_link_type", (q) => q.eq("fromObjectId", args.appId))
      .collect();

    for (const link of links) {
      await ctx.db.delete(link._id);
    }

    // Delete the app
    await ctx.db.delete(args.appId);

    // Audit log (kept for history)
    await ctx.db.insert("objectActions", {
      organizationId: app.organizationId,
      objectId: args.appId,
      actionType: "deleted_permanently",
      performedBy: userId,
      performedAt: Date.now(),
    });

    return { success: true };
  },
});

// ============================================================================
// ACTIONS (for external API calls)
// ============================================================================

/**
 * CONNECT V0 APP TO PLATFORM
 * Creates a builder app record, generates a scoped API key,
 * and returns the connection config for the v0 app.
 *
 * Called from the V0ConnectionPanel when user selects API categories
 * and clicks "Connect".
 */
export const connectV0App = action({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    name: v.string(),
    description: v.optional(v.string()),
    v0ChatId: v.optional(v.string()),
    v0WebUrl: v.optional(v.string()),
    v0DemoUrl: v.optional(v.string()),
    conversationId: v.optional(v.id("aiConversations")),
    /** Selected API category IDs (e.g. ["forms", "crm"]) */
    selectedCategories: v.array(v.string()),
    /** Computed scopes from selected categories */
    scopes: v.array(v.string()),
  },
  handler: async (ctx, args): Promise<{
    appId: Id<"objects">;
    appCode: string;
    apiKey: string;
    apiKeyId: Id<"apiKeys">;
    baseUrl: string;
    selectedCategories: string[];
    scopes: string[];
    envFileId: string | null;
  }> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { api } = await import("./_generated/api") as any;

    // 1. Create the builder app record
    const appResult = await ctx.runMutation(api.builderAppOntology.createBuilderApp, {
      sessionId: args.sessionId,
      organizationId: args.organizationId,
      name: args.name,
      description: args.description || `Connected v0 app with: ${args.selectedCategories.join(", ")}`,
      subtype: "v0_generated" as const,
      v0ChatId: args.v0ChatId,
      v0WebUrl: args.v0WebUrl,
      v0DemoUrl: args.v0DemoUrl,
      conversationId: args.conversationId,
    });

    // 2. Generate a scoped API key for this app
    const keyResult = await ctx.runAction(api.actions.apiKeys.generateApiKey, {
      sessionId: args.sessionId,
      organizationId: args.organizationId,
      name: `v0-app-${appResult.appCode}`,
      scopes: args.scopes,
    });

    // 3. Store connection config on the builder app
    await ctx.runMutation(api.builderAppOntology.updateBuilderApp, {
      sessionId: args.sessionId,
      appId: appResult.appId,
      status: "ready",
    });

    // 3b. Auto-register as a connected_application so it appears in Applications
    let applicationId: Id<"objects"> | null = null;
    try {
      const regResult = await ctx.runMutation(
        internal.applicationOntology.registerApplicationInternal,
        {
          organizationId: args.organizationId,
          name: args.name,
          description: args.description || `Builder app: ${args.selectedCategories.join(", ")}`,
          source: {
            type: "boilerplate" as const,
            framework: "nextjs",
            hasTypeScript: true,
          },
          connection: {
            features: args.selectedCategories,
          },
        }
      );
      applicationId = regResult.applicationId;

      // Link the API key to the registered application
      await ctx.runMutation(api.applicationOntology.linkApiKey, {
        sessionId: args.sessionId,
        applicationId: regResult.applicationId,
        apiKeyId: keyResult.id,
      });
    } catch (e) {
      // Non-fatal — app is still connected even if registration fails
      console.error("[connectV0App] Failed to auto-register application:", e);
    }

    // 4. Create .env.example file in the media library
    const envContent = [
      `# Generated by l4yercak3 Builder — ${appResult.appCode}`,
      `# Connected APIs: ${args.selectedCategories.join(", ")}`,
      `# Scopes: ${args.scopes.join(", ")}`,
      ``,
      `NEXT_PUBLIC_L4YERCAK3_API_KEY=${keyResult.key}`,
      `NEXT_PUBLIC_L4YERCAK3_URL=https://agreeable-lion-828.convex.site`,
      `L4YERCAK3_ORG_ID=${args.organizationId}`,
    ].join("\n");

    let envFileId: string | null = null;
    try {
      const envDoc = await ctx.runMutation(
        api.organizationMedia.createLayerCakeDocument,
        {
          sessionId: args.sessionId,
          organizationId: args.organizationId,
          filename: `.env.example`,
          documentContent: envContent,
          description: `Environment variables for v0 app ${appResult.appCode}`,
          tags: ["builder-app", "env", appResult.appCode],
        }
      );
      envFileId = envDoc.docId;
    } catch (e) {
      // Non-fatal — app is still connected even if env file creation fails
      console.error("[connectV0App] Failed to create .env.example document:", e);
    }

    // Store connectionConfig via a direct internal mutation
    await ctx.runMutation(internal.builderAppOntology.patchAppConnectionConfig, {
      appId: appResult.appId,
      connectionConfig: {
        apiKeyId: keyResult.id,
        apiKeyPrefix: keyResult.keyPrefix,
        baseUrl: "https://agreeable-lion-828.convex.site",
        selectedCategories: args.selectedCategories,
        scopes: args.scopes,
        connectedAt: Date.now(),
        ...(envFileId && { envFileId }),
        ...(applicationId && { applicationId }),
      },
    });

    return {
      appId: appResult.appId,
      appCode: appResult.appCode,
      apiKey: keyResult.key,
      apiKeyId: keyResult.id,
      baseUrl: "https://agreeable-lion-828.convex.site",
      selectedCategories: args.selectedCategories,
      scopes: args.scopes,
      envFileId,
    };
  },
});

/**
 * PATCH APP CONNECTION CONFIG (Internal)
 * Stores connection config on a builder app's customProperties.
 */
export const patchAppConnectionConfig = internalMutation({
  args: {
    appId: v.id("objects"),
    connectionConfig: v.object({
      apiKeyId: v.id("apiKeys"),
      apiKeyPrefix: v.string(),
      baseUrl: v.string(),
      selectedCategories: v.array(v.string()),
      scopes: v.array(v.string()),
      connectedAt: v.number(),
      envFileId: v.optional(v.string()),
      applicationId: v.optional(v.id("objects")),
    }),
  },
  handler: async (ctx, args) => {
    const app = await ctx.db.get(args.appId);
    if (!app) throw new Error("Builder app not found");

    const currentProps = (app.customProperties || {}) as Record<string, unknown>;
    await ctx.db.patch(args.appId, {
      customProperties: {
        ...currentProps,
        connectionConfig: args.connectionConfig,
      },
      updatedAt: Date.now(),
    });
  },
});

/**
 * UPDATE CONNECTION CATEGORIES (Public)
 * Updates selectedCategories and scopes on an existing connectionConfig
 * without regenerating the API key.
 */
export const updateConnectionCategories = mutation({
  args: {
    sessionId: v.string(),
    appId: v.id("objects"),
    selectedCategories: v.array(v.string()),
    scopes: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const app = await ctx.db.get(args.appId);
    if (!app || app.type !== "builder_app") {
      throw new Error("Builder app not found");
    }

    const currentProps = (app.customProperties || {}) as Record<string, unknown>;
    const currentConfig = currentProps.connectionConfig as Record<string, unknown> | undefined;
    if (!currentConfig) {
      throw new Error("App is not connected yet. Use Connect first.");
    }

    await ctx.db.patch(args.appId, {
      customProperties: {
        ...currentProps,
        connectionConfig: {
          ...currentConfig,
          selectedCategories: args.selectedCategories,
          scopes: args.scopes,
        },
      },
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * SAVE PUBLISH CONFIG
 * Persist the publish wizard configuration on the builder app object
 * so it survives navigation away and back.
 */
export const savePublishConfig = mutation({
  args: {
    sessionId: v.string(),
    appId: v.id("objects"),
    publishConfig: v.object({
      appName: v.string(),
      repoName: v.string(),
      description: v.string(),
      isPrivate: v.boolean(),
      architecture: v.union(
        v.literal("thin-client"),
        v.literal("full-stack"),
        v.literal("hybrid")
      ),
      backend: v.union(
        v.literal("convex"),
        v.literal("supabase"),
        v.literal("neon-drizzle"),
        v.literal("none")
      ),
      auth: v.union(
        v.literal("none"),
        v.literal("l4yercak3-oauth"),
        v.literal("nextauth"),
        v.literal("clerk"),
        v.literal("supabase-auth")
      ),
      payments: v.object({
        stripe: v.boolean(),
        l4yercak3Invoicing: v.boolean(),
      }),
      selectedCategories: v.array(v.string()),
      scopes: v.array(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const app = await ctx.db.get(args.appId);
    if (!app || app.type !== "builder_app") {
      throw new Error("Builder app not found");
    }

    const hasPermission = await checkPermission(
      ctx,
      userId,
      "edit_published_pages",
      app.organizationId
    );
    if (!hasPermission) {
      throw new Error("Permission denied: edit_published_pages required");
    }

    const currentProps = (app.customProperties || {}) as Record<string, unknown>;
    await ctx.db.patch(args.appId, {
      customProperties: {
        ...currentProps,
        publishConfig: args.publishConfig,
      },
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * GET PUBLISH CONFIG
 * Load persisted publish config from a builder app object
 */
export const getPublishConfig = query({
  args: {
    sessionId: v.string(),
    appId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const app = await ctx.db.get(args.appId);
    if (!app || app.type !== "builder_app") {
      return null;
    }

    const hasPermission = await checkPermission(
      ctx,
      userId,
      "view_published_pages",
      app.organizationId
    );
    if (!hasPermission) {
      return null;
    }

    const props = (app.customProperties || {}) as Record<string, unknown>;
    return (props.publishConfig as Record<string, unknown>) || null;
  },
});

/**
 * CREATE BUILDER APP FROM V0 CHAT
 * Creates a builder app directly from a v0 chat result
 * (Called after v0.builderChat returns successfully)
 */
export const createFromV0Chat = action({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    name: v.string(),
    description: v.optional(v.string()),
    v0ChatId: v.string(),
    v0WebUrl: v.string(),
    v0DemoUrl: v.optional(v.string()),
    files: v.optional(v.array(generatedFileValidator)),
    conversationId: v.optional(v.id("aiConversations")),
  },
  handler: async (ctx, args): Promise<{ appId: Id<"objects">; appCode: string }> => {
    // Import the API reference
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { api } = await import("./_generated/api") as any;

    // Use the public mutation to create the app
    const result = await ctx.runMutation(api.builderAppOntology.createBuilderApp, {
      sessionId: args.sessionId,
      organizationId: args.organizationId,
      name: args.name,
      description: args.description,
      subtype: "v0_generated" as const,
      v0ChatId: args.v0ChatId,
      v0WebUrl: args.v0WebUrl,
      v0DemoUrl: args.v0DemoUrl,
      files: args.files,
      conversationId: args.conversationId,
    });

    return result as { appId: Id<"objects">; appCode: string };
  },
});

/**
 * GET BUILDER APP ENV VARS
 * Returns all environment variables needed by the builder app:
 * 1. Platform env vars from requiredEnvVars (with values from .env.example document)
 * 2. Additional env vars detected in builderFiles (process.env.* references)
 */
export const getBuilderAppEnvVars = query({
  args: {
    sessionId: v.string(),
    appId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const app = await ctx.db.get(args.appId);
    if (!app || app.type !== "builder_app") return { envVars: [] };

    const props = (app.customProperties || {}) as Record<string, unknown>;
    const connectionConfig = props.connectionConfig as {
      envFileId?: string;
      apiKeyPrefix?: string;
      baseUrl?: string;
    } | undefined;

    // 1. Parse values from .env.example document (contains the full API key)
    const envValues: Record<string, string> = {};
    if (connectionConfig?.envFileId) {
      try {
        const envDoc = await ctx.db.get(
          connectionConfig.envFileId as Id<"organizationMedia">
        );
        if (envDoc && envDoc.documentContent) {
          for (const line of envDoc.documentContent.split("\n")) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith("#")) continue;
            const eqIdx = trimmed.indexOf("=");
            if (eqIdx > 0) {
              envValues[trimmed.substring(0, eqIdx)] = trimmed.substring(eqIdx + 1);
            }
          }
        }
      } catch {
        // envFileId may be invalid or deleted — non-fatal
      }
    }

    // 2. Build platform env vars from requiredEnvVars metadata + parsed values
    const requiredEnvVars = (props.requiredEnvVars || []) as Array<{
      key: string;
      description: string;
      required: boolean;
      defaultValue?: string;
    }>;

    const envVarMap = new Map<string, {
      key: string;
      value: string;
      description: string;
      sensitive: boolean;
      source: "platform" | "codebase";
      required: boolean;
    }>();

    for (const envDef of requiredEnvVars) {
      const value = envValues[envDef.key] || envDef.defaultValue || "";
      envVarMap.set(envDef.key, {
        key: envDef.key,
        value,
        description: envDef.description,
        sensitive: envDef.key.includes("API_KEY") || envDef.key.includes("SECRET"),
        source: "platform",
        required: envDef.required,
      });
    }

    // 3. Scan builderFiles for additional process.env references
    const builderFiles = await ctx.db
      .query("builderFiles")
      .withIndex("by_app", (q) => q.eq("appId", args.appId))
      .collect();

    const envPattern = /process\.env\.([A-Z][A-Z0-9_]*)/g;
    const nextPublicPattern = /NEXT_PUBLIC_([A-Z][A-Z0-9_]*)/g;

    for (const file of builderFiles) {
      const content = file.content || "";
      // Match process.env.VAR_NAME
      let match;
      while ((match = envPattern.exec(content)) !== null) {
        const key = match[1];
        if (!envVarMap.has(key) && !envVarMap.has(`NEXT_PUBLIC_${key}`)) {
          envVarMap.set(key, {
            key,
            value: envValues[key] || "",
            description: `Used in ${file.path}`,
            sensitive: key.includes("SECRET") || key.includes("KEY") || key.includes("TOKEN"),
            source: "codebase",
            required: true,
          });
        }
      }
      // Match NEXT_PUBLIC_ vars that may appear in template literals etc.
      while ((match = nextPublicPattern.exec(content)) !== null) {
        const key = `NEXT_PUBLIC_${match[1]}`;
        if (!envVarMap.has(key)) {
          envVarMap.set(key, {
            key,
            value: envValues[key] || "",
            description: `Used in ${file.path}`,
            sensitive: key.includes("SECRET") || key.includes("KEY") || key.includes("TOKEN"),
            source: "codebase",
            required: true,
          });
        }
      }
    }

    // Sort: platform vars first, then codebase-detected, alphabetically within groups
    const envVars = Array.from(envVarMap.values()).sort((a, b) => {
      if (a.source !== b.source) return a.source === "platform" ? -1 : 1;
      return a.key.localeCompare(b.key);
    });

    return { envVars };
  },
});
