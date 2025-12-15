/**
 * DEPLOYMENT ONTOLOGY
 *
 * Manages deployment configurations, targets, environment variables, and history
 * using the ontology system (objects, objectLinks, objectActions).
 *
 * Object Types:
 * - deployment_configuration: Main config linking page to source repo
 * - deployment_target: Deployment destination (Vercel, Netlify, etc.)
 * - deployment_env_var: Environment variable for a target
 * - deployment_history: Record of deployment execution
 *
 * Links:
 * - deploys: deployment_configuration → published_page
 * - target_of: deployment_target → deployment_configuration
 * - env_var_for: deployment_env_var → deployment_target
 * - deployment_of: deployment_history → deployment_target
 * - uses_oauth: config/target → oauthConnections
 */

import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Source repository configuration
 */
export const sourceConfigValidator = v.object({
  type: v.literal("github"),
  repositoryId: v.string(),
  repositoryUrl: v.string(),
  repositoryName: v.string(),
  branch: v.string(),
  directory: v.optional(v.string()),
  autoSync: v.boolean(),
});

/**
 * Build settings for deployment target
 */
export const buildSettingsValidator = v.object({
  framework: v.optional(v.string()),
  buildCommand: v.optional(v.string()),
  outputDirectory: v.optional(v.string()),
  installCommand: v.optional(v.string()),
  nodeVersion: v.optional(v.string()),
});

/**
 * Commit information for deployment
 */
export const commitInfoValidator = v.object({
  sha: v.string(),
  message: v.string(),
  author: v.string(),
  authorEmail: v.string(),
  timestamp: v.number(),
});

// ============================================================================
// DEPLOYMENT CONFIGURATION (Main Config)
// ============================================================================

/**
 * Create a deployment configuration for a published page
 */
export const createDeploymentConfiguration = mutation({
  args: {
    sessionId: v.string(),
    pageId: v.id("objects"), // published_page object
    name: v.string(),
    description: v.optional(v.string()),
    source: sourceConfigValidator,
  },
  handler: async (ctx, args) => {
    // Get session and verify permissions
    const session = await ctx.db.get(args.sessionId as Id<"sessions">);
    if (!session || session.expiresAt < Date.now()) {
      throw new Error("Invalid or expired session");
    }

    const user = await ctx.db.get(session.userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Verify page exists and belongs to organization
    const page = await ctx.db.get(args.pageId);
    if (!page) {
      throw new Error("Published page not found");
    }

    if (page.organizationId !== session.organizationId) {
      throw new Error("Page does not belong to your organization");
    }

    if (page.type !== "published_page") {
      throw new Error("Object is not a published page");
    }

    // Check if config already exists for this page
    const existingLink = await ctx.db
      .query("objectLinks")
      .withIndex("by_to_link_type", (q) =>
        q.eq("toObjectId", args.pageId).eq("linkType", "deploys")
      )
      .first();

    if (existingLink) {
      throw new Error("Deployment configuration already exists for this page");
    }

    // Create deployment_configuration object
    const configId = await ctx.db.insert("objects", {
      organizationId: session.organizationId,
      type: "deployment_configuration",
      subtype: "active",
      name: args.name,
      description: args.description,
      status: "active",
      customProperties: {
        pageId: args.pageId,
        source: args.source,
        createdBy: user._id,
        lastDeployedAt: undefined,
      },
      createdBy: user._id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Link to published page
    await ctx.db.insert("objectLinks", {
      organizationId: session.organizationId,
      fromObjectId: configId,
      toObjectId: args.pageId,
      linkType: "deploys",
      createdBy: user._id,
      createdAt: Date.now(),
    });

    // Log action
    await ctx.db.insert("objectActions", {
      organizationId: session.organizationId,
      objectId: configId,
      actionType: "created",
      actionData: {
        pageId: args.pageId,
        pageName: page.name,
      },
      performedBy: user._id,
      performedAt: Date.now(),
    });

    return {
      configId,
      message: "Deployment configuration created successfully",
    };
  },
});

/**
 * Get deployment configuration for a published page
 */
export const getDeploymentConfigForPage = query({
  args: {
    sessionId: v.string(),
    pageId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    // Verify session
    const session = await ctx.db.get(args.sessionId as Id<"sessions">);
    if (!session || session.expiresAt < Date.now()) {
      return null;
    }

    // Find link from config to page
    const link = await ctx.db
      .query("objectLinks")
      .withIndex("by_to_link_type", (q) =>
        q.eq("toObjectId", args.pageId).eq("linkType", "deploys")
      )
      .first();

    if (!link) {
      return null;
    }

    // Get the config object
    const config = await ctx.db.get(link.fromObjectId);
    if (!config || config.organizationId !== session.organizationId) {
      return null;
    }

    return config;
  },
});

/**
 * Update deployment configuration
 */
export const updateDeploymentConfiguration = mutation({
  args: {
    sessionId: v.string(),
    configId: v.id("objects"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    source: v.optional(sourceConfigValidator),
    status: v.optional(v.union(v.literal("active"), v.literal("paused"), v.literal("archived"))),
  },
  handler: async (ctx, args) => {
    // Verify session
    const session = await ctx.db.get(args.sessionId as Id<"sessions">);
    if (!session || session.expiresAt < Date.now()) {
      throw new Error("Invalid or expired session");
    }

    const user = await ctx.db.get(session.userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Get config
    const config = await ctx.db.get(args.configId);
    if (!config) {
      throw new Error("Deployment configuration not found");
    }

    if (config.organizationId !== session.organizationId) {
      throw new Error("Configuration does not belong to your organization");
    }

    if (config.type !== "deployment_configuration") {
      throw new Error("Object is not a deployment configuration");
    }

    // Build update object
    const updates: any = {
      updatedAt: Date.now(),
    };

    if (args.name !== undefined) {
      updates.name = args.name;
    }

    if (args.description !== undefined) {
      updates.description = args.description;
    }

    if (args.status !== undefined) {
      updates.status = args.status;
      updates.subtype = args.status; // Keep subtype in sync
    }

    if (args.source !== undefined) {
      updates.customProperties = {
        ...config.customProperties,
        source: args.source,
      };
    }

    // Update config
    await ctx.db.patch(args.configId, updates);

    // Log action
    await ctx.db.insert("objectActions", {
      organizationId: session.organizationId,
      objectId: args.configId,
      actionType: "updated",
      actionData: {
        updatedFields: Object.keys(updates),
      },
      performedBy: user._id,
      performedAt: Date.now(),
    });

    return {
      success: true,
      message: "Deployment configuration updated successfully",
    };
  },
});

/**
 * Delete deployment configuration (and all related objects)
 */
export const deleteDeploymentConfiguration = mutation({
  args: {
    sessionId: v.string(),
    configId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    // Verify session
    const session = await ctx.db.get(args.sessionId as Id<"sessions">);
    if (!session || session.expiresAt < Date.now()) {
      throw new Error("Invalid or expired session");
    }

    const user = await ctx.db.get(session.userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Get config
    const config = await ctx.db.get(args.configId);
    if (!config) {
      throw new Error("Deployment configuration not found");
    }

    if (config.organizationId !== session.organizationId) {
      throw new Error("Configuration does not belong to your organization");
    }

    if (config.type !== "deployment_configuration") {
      throw new Error("Object is not a deployment configuration");
    }

    // Get all targets for this config
    const targetLinks = await ctx.db
      .query("objectLinks")
      .withIndex("by_to_link_type", (q) =>
        q.eq("toObjectId", args.configId).eq("linkType", "target_of")
      )
      .collect();

    // Delete each target (which will cascade delete env vars and history)
    for (const link of targetLinks) {
      await ctx.runMutation(internal.deploymentOntology.deleteDeploymentTargetInternal, {
        targetId: link.fromObjectId,
        organizationId: session.organizationId,
      });
    }

    // Delete all links involving this config
    const configLinks = await ctx.db
      .query("objectLinks")
      .withIndex("by_from_object", (q) => q.eq("fromObjectId", args.configId))
      .collect();

    for (const link of configLinks) {
      await ctx.db.delete(link._id);
    }

    const configLinksTo = await ctx.db
      .query("objectLinks")
      .withIndex("by_to_object", (q) => q.eq("toObjectId", args.configId))
      .collect();

    for (const link of configLinksTo) {
      await ctx.db.delete(link._id);
    }

    // Delete the config object
    await ctx.db.delete(args.configId);

    // Log action
    await ctx.db.insert("objectActions", {
      organizationId: session.organizationId,
      objectId: args.configId,
      actionType: "deleted",
      actionData: {
        configName: config.name,
        deletedTargets: targetLinks.length,
      },
      performedBy: user._id,
      performedAt: Date.now(),
    });

    return {
      success: true,
      message: "Deployment configuration deleted successfully",
    };
  },
});

// ============================================================================
// DEPLOYMENT TARGET (Vercel, Netlify, etc.)
// ============================================================================

/**
 * Create a deployment target for a configuration
 */
export const createDeploymentTarget = mutation({
  args: {
    sessionId: v.string(),
    configId: v.id("objects"),
    name: v.string(),
    description: v.optional(v.string()),
    provider: v.union(v.literal("vercel"), v.literal("netlify"), v.literal("cloudflare"), v.literal("custom")),
    projectId: v.string(),
    projectName: v.string(),
    productionUrl: v.optional(v.string()),
    buildSettings: v.optional(buildSettingsValidator),
  },
  handler: async (ctx, args) => {
    // Verify session
    const session = await ctx.db.get(args.sessionId as Id<"sessions">);
    if (!session || session.expiresAt < Date.now()) {
      throw new Error("Invalid or expired session");
    }

    const user = await ctx.db.get(session.userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Verify config exists
    const config = await ctx.db.get(args.configId);
    if (!config) {
      throw new Error("Deployment configuration not found");
    }

    if (config.organizationId !== session.organizationId) {
      throw new Error("Configuration does not belong to your organization");
    }

    if (config.type !== "deployment_configuration") {
      throw new Error("Object is not a deployment configuration");
    }

    // Create deployment_target object
    const targetId = await ctx.db.insert("objects", {
      organizationId: session.organizationId,
      type: "deployment_target",
      subtype: args.provider,
      name: args.name,
      description: args.description,
      status: "enabled",
      customProperties: {
        configurationId: args.configId,
        provider: args.provider,
        projectId: args.projectId,
        projectName: args.projectName,
        productionUrl: args.productionUrl,
        buildSettings: args.buildSettings || {},
        lastDeploymentId: undefined,
        lastDeployedAt: undefined,
        lastDeploymentStatus: undefined,
        lastDeploymentUrl: undefined,
        deploymentCount: 0,
      },
      createdBy: user._id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Link to deployment configuration
    await ctx.db.insert("objectLinks", {
      organizationId: session.organizationId,
      fromObjectId: targetId,
      toObjectId: args.configId,
      linkType: "target_of",
      createdBy: user._id,
      createdAt: Date.now(),
    });

    // Log action
    await ctx.db.insert("objectActions", {
      organizationId: session.organizationId,
      objectId: targetId,
      actionType: "created",
      actionData: {
        provider: args.provider,
        projectId: args.projectId,
      },
      performedBy: user._id,
      performedAt: Date.now(),
    });

    return {
      targetId,
      message: "Deployment target created successfully",
    };
  },
});

/**
 * Get all deployment targets for a configuration
 */
export const getDeploymentTargets = query({
  args: {
    sessionId: v.string(),
    configId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    // Verify session
    const session = await ctx.db.get(args.sessionId as Id<"sessions">);
    if (!session || session.expiresAt < Date.now()) {
      return [];
    }

    // Find all links from targets to this config
    const links = await ctx.db
      .query("objectLinks")
      .withIndex("by_to_link_type", (q) =>
        q.eq("toObjectId", args.configId).eq("linkType", "target_of")
      )
      .collect();

    // Get all target objects
    const targets = await Promise.all(
      links.map((link) => ctx.db.get(link.fromObjectId))
    );

    // Filter out nulls and verify organization
    return targets.filter(
      (t) => t !== null && t.organizationId === session.organizationId
    );
  },
});

/**
 * Update deployment target
 */
export const updateDeploymentTarget = mutation({
  args: {
    sessionId: v.string(),
    targetId: v.id("objects"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    productionUrl: v.optional(v.string()),
    buildSettings: v.optional(buildSettingsValidator),
    status: v.optional(v.union(v.literal("enabled"), v.literal("disabled"))),
  },
  handler: async (ctx, args) => {
    // Verify session
    const session = await ctx.db.get(args.sessionId as Id<"sessions">);
    if (!session || session.expiresAt < Date.now()) {
      throw new Error("Invalid or expired session");
    }

    const user = await ctx.db.get(session.userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Get target
    const target = await ctx.db.get(args.targetId);
    if (!target) {
      throw new Error("Deployment target not found");
    }

    if (target.organizationId !== session.organizationId) {
      throw new Error("Target does not belong to your organization");
    }

    if (target.type !== "deployment_target") {
      throw new Error("Object is not a deployment target");
    }

    // Build update object
    const updates: any = {
      updatedAt: Date.now(),
    };

    if (args.name !== undefined) {
      updates.name = args.name;
    }

    if (args.description !== undefined) {
      updates.description = args.description;
    }

    if (args.status !== undefined) {
      updates.status = args.status;
    }

    // Update customProperties
    const customProps = { ...target.customProperties };

    if (args.productionUrl !== undefined) {
      customProps.productionUrl = args.productionUrl;
    }

    if (args.buildSettings !== undefined) {
      customProps.buildSettings = {
        ...customProps.buildSettings,
        ...args.buildSettings,
      };
    }

    updates.customProperties = customProps;

    // Update target
    await ctx.db.patch(args.targetId, updates);

    // Log action
    await ctx.db.insert("objectActions", {
      organizationId: session.organizationId,
      objectId: args.targetId,
      actionType: "updated",
      actionData: {
        updatedFields: Object.keys(updates),
      },
      performedBy: user._id,
      performedAt: Date.now(),
    });

    return {
      success: true,
      message: "Deployment target updated successfully",
    };
  },
});

/**
 * Delete deployment target (internal, called from deleteDeploymentConfiguration)
 */
export const deleteDeploymentTargetInternal = internalMutation({
  args: {
    targetId: v.id("objects"),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    // Get all env vars for this target
    const envVarLinks = await ctx.db
      .query("objectLinks")
      .withIndex("by_to_link_type", (q) =>
        q.eq("toObjectId", args.targetId).eq("linkType", "env_var_for")
      )
      .collect();

    // Delete env vars
    for (const link of envVarLinks) {
      await ctx.db.delete(link.fromObjectId);
      await ctx.db.delete(link._id);
    }

    // Get all deployment history for this target
    const historyLinks = await ctx.db
      .query("objectLinks")
      .withIndex("by_to_link_type", (q) =>
        q.eq("toObjectId", args.targetId).eq("linkType", "deployment_of")
      )
      .collect();

    // Delete history
    for (const link of historyLinks) {
      await ctx.db.delete(link.fromObjectId);
      await ctx.db.delete(link._id);
    }

    // Delete all links involving this target
    const targetLinks = await ctx.db
      .query("objectLinks")
      .withIndex("by_from_object", (q) => q.eq("fromObjectId", args.targetId))
      .collect();

    for (const link of targetLinks) {
      await ctx.db.delete(link._id);
    }

    // Delete the target object
    await ctx.db.delete(args.targetId);
  },
});

/**
 * Delete deployment target (public API)
 */
export const deleteDeploymentTarget = mutation({
  args: {
    sessionId: v.string(),
    targetId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    // Verify session
    const session = await ctx.db.get(args.sessionId as Id<"sessions">);
    if (!session || session.expiresAt < Date.now()) {
      throw new Error("Invalid or expired session");
    }

    const user = await ctx.db.get(session.userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Get target
    const target = await ctx.db.get(args.targetId);
    if (!target) {
      throw new Error("Deployment target not found");
    }

    if (target.organizationId !== session.organizationId) {
      throw new Error("Target does not belong to your organization");
    }

    if (target.type !== "deployment_target") {
      throw new Error("Object is not a deployment target");
    }

    // Delete target and related objects
    await ctx.runMutation(internal.deploymentOntology.deleteDeploymentTargetInternal, {
      targetId: args.targetId,
      organizationId: session.organizationId,
    });

    // Log action
    await ctx.db.insert("objectActions", {
      organizationId: session.organizationId,
      objectId: args.targetId,
      actionType: "deleted",
      actionData: {
        targetName: target.name,
      },
      performedBy: user._id,
      performedAt: Date.now(),
    });

    return {
      success: true,
      message: "Deployment target deleted successfully",
    };
  },
});

// ============================================================================
// ENVIRONMENT VARIABLES
// ============================================================================

/**
 * Create an environment variable for a deployment target
 */
export const createEnvironmentVariable = mutation({
  args: {
    sessionId: v.string(),
    targetId: v.id("objects"),
    key: v.string(),
    value: v.string(),
    target: v.union(v.literal("production"), v.literal("preview"), v.literal("development")),
    description: v.optional(v.string()),
    encrypted: v.boolean(),
    required: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Verify session
    const session = await ctx.db.get(args.sessionId as Id<"sessions">);
    if (!session || session.expiresAt < Date.now()) {
      throw new Error("Invalid or expired session");
    }

    const user = await ctx.db.get(session.userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Verify target exists
    const target = await ctx.db.get(args.targetId);
    if (!target) {
      throw new Error("Deployment target not found");
    }

    if (target.organizationId !== session.organizationId) {
      throw new Error("Target does not belong to your organization");
    }

    if (target.type !== "deployment_target") {
      throw new Error("Object is not a deployment target");
    }

    // Check if env var with same key already exists for this target
    const existingLinks = await ctx.db
      .query("objectLinks")
      .withIndex("by_to_link_type", (q) =>
        q.eq("toObjectId", args.targetId).eq("linkType", "env_var_for")
      )
      .collect();

    for (const link of existingLinks) {
      const existingVar = await ctx.db.get(link.fromObjectId);
      if (existingVar && existingVar.name === args.key) {
        throw new Error(`Environment variable ${args.key} already exists for this target`);
      }
    }

    // Encrypt value if needed
    // Note: Encryption must be done in an action, so we'll store plaintext for now
    // TODO: Create an action wrapper that encrypts before calling this mutation
    const storedValue = args.value;

    // Create deployment_env_var object
    const envVarId = await ctx.db.insert("objects", {
      organizationId: session.organizationId,
      type: "deployment_env_var",
      subtype: args.target,
      name: args.key,
      description: args.description || "",
      status: "active",
      customProperties: {
        targetId: args.targetId,
        key: args.key,
        value: storedValue,
        encrypted: args.encrypted,
        target: args.target,
        required: args.required || false,
      },
      createdBy: user._id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Link to deployment target
    await ctx.db.insert("objectLinks", {
      organizationId: session.organizationId,
      fromObjectId: envVarId,
      toObjectId: args.targetId,
      linkType: "env_var_for",
      properties: {
        environment: args.target,
      },
      createdBy: user._id,
      createdAt: Date.now(),
    });

    // Log action
    await ctx.db.insert("objectActions", {
      organizationId: session.organizationId,
      objectId: envVarId,
      actionType: "created",
      actionData: {
        key: args.key,
        target: args.target,
        encrypted: args.encrypted,
      },
      performedBy: user._id,
      performedAt: Date.now(),
    });

    return {
      envVarId,
      message: "Environment variable created successfully",
    };
  },
});

/**
 * Get all environment variables for a deployment target
 */
export const getEnvironmentVariables = query({
  args: {
    sessionId: v.string(),
    targetId: v.id("objects"),
    includeValues: v.optional(v.boolean()), // Include decrypted values
  },
  handler: async (ctx, args) => {
    // Verify session
    const session = await ctx.db.get(args.sessionId as Id<"sessions">);
    if (!session || session.expiresAt < Date.now()) {
      return [];
    }

    // Find all links from env vars to this target
    const links = await ctx.db
      .query("objectLinks")
      .withIndex("by_to_link_type", (q) =>
        q.eq("toObjectId", args.targetId).eq("linkType", "env_var_for")
      )
      .collect();

    // Get all env var objects
    const envVars = await Promise.all(
      links.map((link) => ctx.db.get(link.fromObjectId))
    );

    // Filter out nulls and verify organization
    const filtered = envVars.filter(
      (v) => v !== null && v.organizationId === session.organizationId
    );

    // If not including values, mask them
    if (!args.includeValues) {
      return filtered.map((v) => {
        if (!v) return null;
        const props = v.customProperties as any;
        return {
          ...v,
          customProperties: {
            ...props,
            value: props?.encrypted ? "••••••••" : props?.value,
          },
        };
      }).filter(v => v !== null);
    }

    return filtered;
  },
});

/**
 * Update environment variable
 */
export const updateEnvironmentVariable = mutation({
  args: {
    sessionId: v.string(),
    envVarId: v.id("objects"),
    value: v.optional(v.string()),
    description: v.optional(v.string()),
    required: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Verify session
    const session = await ctx.db.get(args.sessionId as Id<"sessions">);
    if (!session || session.expiresAt < Date.now()) {
      throw new Error("Invalid or expired session");
    }

    const user = await ctx.db.get(session.userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Get env var
    const envVar = await ctx.db.get(args.envVarId);
    if (!envVar) {
      throw new Error("Environment variable not found");
    }

    if (envVar.organizationId !== session.organizationId) {
      throw new Error("Environment variable does not belong to your organization");
    }

    if (envVar.type !== "deployment_env_var") {
      throw new Error("Object is not an environment variable");
    }

    // Build update object
    const customProps = { ...envVar.customProperties };

    if (args.value !== undefined) {
      // Note: Encryption must be done in an action
      // TODO: Create an action wrapper that encrypts before calling this mutation
      customProps.value = args.value;
    }

    if (args.description !== undefined) {
      customProps.description = args.description;
    }

    if (args.required !== undefined) {
      customProps.required = args.required;
    }

    // Update env var
    await ctx.db.patch(args.envVarId, {
      description: args.description || envVar.description,
      customProperties: customProps,
      updatedAt: Date.now(),
    });

    // Log action
    await ctx.db.insert("objectActions", {
      organizationId: session.organizationId,
      objectId: args.envVarId,
      actionType: "updated",
      actionData: {
        key: envVar.name,
        updatedValue: args.value !== undefined,
      },
      performedBy: user._id,
      performedAt: Date.now(),
    });

    return {
      success: true,
      message: "Environment variable updated successfully",
    };
  },
});

/**
 * Delete environment variable
 */
export const deleteEnvironmentVariable = mutation({
  args: {
    sessionId: v.string(),
    envVarId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    // Verify session
    const session = await ctx.db.get(args.sessionId as Id<"sessions">);
    if (!session || session.expiresAt < Date.now()) {
      throw new Error("Invalid or expired session");
    }

    const user = await ctx.db.get(session.userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Get env var
    const envVar = await ctx.db.get(args.envVarId);
    if (!envVar) {
      throw new Error("Environment variable not found");
    }

    if (envVar.organizationId !== session.organizationId) {
      throw new Error("Environment variable does not belong to your organization");
    }

    if (envVar.type !== "deployment_env_var") {
      throw new Error("Object is not an environment variable");
    }

    // Delete all links
    const links = await ctx.db
      .query("objectLinks")
      .withIndex("by_from_object", (q) => q.eq("fromObjectId", args.envVarId))
      .collect();

    for (const link of links) {
      await ctx.db.delete(link._id);
    }

    // Delete the env var object
    await ctx.db.delete(args.envVarId);

    // Log action
    await ctx.db.insert("objectActions", {
      organizationId: session.organizationId,
      objectId: args.envVarId,
      actionType: "deleted",
      actionData: {
        key: envVar.name,
      },
      performedBy: user._id,
      performedAt: Date.now(),
    });

    return {
      success: true,
      message: "Environment variable deleted successfully",
    };
  },
});

// ============================================================================
// DEPLOYMENT HISTORY
// ============================================================================

/**
 * Record a deployment execution
 */
export const recordDeployment = mutation({
  args: {
    sessionId: v.string(),
    targetId: v.id("objects"),
    deploymentId: v.string(),
    deploymentUrl: v.string(),
    commit: v.optional(commitInfoValidator),
    triggeredBy: v.union(v.literal("manual"), v.literal("webhook"), v.literal("schedule")),
  },
  handler: async (ctx, args) => {
    // Verify session
    const session = await ctx.db.get(args.sessionId as Id<"sessions">);
    if (!session || session.expiresAt < Date.now()) {
      throw new Error("Invalid or expired session");
    }

    const user = await ctx.db.get(session.userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Verify target exists
    const target = await ctx.db.get(args.targetId);
    if (!target) {
      throw new Error("Deployment target not found");
    }

    if (target.organizationId !== session.organizationId) {
      throw new Error("Target does not belong to your organization");
    }

    if (target.type !== "deployment_target") {
      throw new Error("Object is not a deployment target");
    }

    const provider = (target.customProperties as any)?.provider || target.subtype;

    // Create deployment_history object
    const historyId = await ctx.db.insert("objects", {
      organizationId: session.organizationId,
      type: "deployment_history",
      subtype: "pending",
      name: `Deployment #${((target.customProperties as any)?.deploymentCount || 0) + 1}`,
      description: args.commit?.message || "Manual deployment",
      status: "queued",
      customProperties: {
        targetId: args.targetId,
        deploymentId: args.deploymentId,
        deploymentUrl: args.deploymentUrl,
        provider,
        commit: args.commit,
        queuedAt: Date.now(),
        triggeredBy: args.triggeredBy,
        triggeredByUser: user._id,
      },
      createdBy: user._id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Link to deployment target
    await ctx.db.insert("objectLinks", {
      organizationId: session.organizationId,
      fromObjectId: historyId,
      toObjectId: args.targetId,
      linkType: "deployment_of",
      properties: {
        deploymentNumber: ((target.customProperties as any)?.deploymentCount || 0) + 1,
      },
      createdBy: user._id,
      createdAt: Date.now(),
    });

    // Update target with latest deployment info
    const targetProps = target.customProperties as any || {};
    await ctx.db.patch(args.targetId, {
      customProperties: {
        ...targetProps,
        lastDeploymentId: args.deploymentId,
        lastDeployedAt: Date.now(),
        lastDeploymentStatus: "queued",
        lastDeploymentUrl: args.deploymentUrl,
        deploymentCount: (targetProps.deploymentCount || 0) + 1,
      },
      updatedAt: Date.now(),
    });

    // Log action
    await ctx.db.insert("objectActions", {
      organizationId: session.organizationId,
      objectId: historyId,
      actionType: "deployment_started",
      actionData: {
        deploymentId: args.deploymentId,
        provider,
        triggeredBy: args.triggeredBy,
      },
      performedBy: user._id,
      performedAt: Date.now(),
    });

    return {
      historyId,
      message: "Deployment recorded successfully",
    };
  },
});

/**
 * Update deployment status
 */
export const updateDeploymentStatus = mutation({
  args: {
    sessionId: v.string(),
    historyId: v.id("objects"),
    status: v.union(
      v.literal("queued"),
      v.literal("building"),
      v.literal("ready"),
      v.literal("error"),
      v.literal("canceled")
    ),
    error: v.optional(v.string()),
    buildDurationMs: v.optional(v.number()),
    buildLogUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Verify session
    const session = await ctx.db.get(args.sessionId as Id<"sessions">);
    if (!session || session.expiresAt < Date.now()) {
      throw new Error("Invalid or expired session");
    }

    const user = await ctx.db.get(session.userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Get history
    const history = await ctx.db.get(args.historyId);
    if (!history) {
      throw new Error("Deployment history not found");
    }

    if (history.organizationId !== session.organizationId) {
      throw new Error("Deployment does not belong to your organization");
    }

    if (history.type !== "deployment_history") {
      throw new Error("Object is not a deployment history");
    }

    // Build update object
    const customProps = { ...history.customProperties };

    if (args.status === "building" && !customProps.startedAt) {
      customProps.startedAt = Date.now();
    }

    if (["ready", "error", "canceled"].includes(args.status) && !customProps.completedAt) {
      customProps.completedAt = Date.now();
    }

    if (args.error) {
      customProps.error = args.error;
    }

    if (args.buildDurationMs) {
      customProps.buildDurationMs = args.buildDurationMs;
    }

    if (args.buildLogUrl) {
      customProps.buildLogUrl = args.buildLogUrl;
    }

    const subtype = args.status === "ready" ? "success" : args.status === "error" ? "failed" : "pending";

    // Update history
    await ctx.db.patch(args.historyId, {
      status: args.status,
      subtype,
      customProperties: customProps,
      updatedAt: Date.now(),
    });

    // Update target with latest status
    const targetId = customProps.targetId as Id<"objects">;
    const target = await ctx.db.get(targetId);
    if (target) {
      await ctx.db.patch(targetId, {
        customProperties: {
          ...target.customProperties,
          lastDeploymentStatus: args.status,
        },
        updatedAt: Date.now(),
      });
    }

    // Log action
    await ctx.db.insert("objectActions", {
      organizationId: session.organizationId,
      objectId: args.historyId,
      actionType: `deployment_${args.status}`,
      actionData: {
        status: args.status,
        hasError: !!args.error,
      },
      performedBy: user._id,
      performedAt: Date.now(),
    });

    return {
      success: true,
      message: `Deployment status updated to ${args.status}`,
    };
  },
});

/**
 * Get deployment history for a target
 */
export const getDeploymentHistory = query({
  args: {
    sessionId: v.string(),
    targetId: v.id("objects"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Verify session
    const session = await ctx.db.get(args.sessionId as Id<"sessions">);
    if (!session || session.expiresAt < Date.now()) {
      return [];
    }

    // Find all links from history to this target
    const links = await ctx.db
      .query("objectLinks")
      .withIndex("by_to_link_type", (q) =>
        q.eq("toObjectId", args.targetId).eq("linkType", "deployment_of")
      )
      .collect();

    // Get all history objects
    const history = await Promise.all(
      links.map((link) => ctx.db.get(link.fromObjectId))
    );

    // Filter out nulls and verify organization
    const filtered = history.filter(
      (h): h is NonNullable<typeof h> => h !== null && h.organizationId === session.organizationId
    );

    // Sort by creation time (newest first)
    const sorted = filtered.sort((a, b) => b.createdAt - a.createdAt);

    // Apply limit
    if (args.limit && args.limit > 0) {
      return sorted.slice(0, args.limit);
    }

    return sorted;
  },
});
