/**
 * ONTOLOGY ADMIN - Convex Backend
 *
 * Super admin interface for managing ontology objects, links, and configurations.
 * This provides CRUD operations and advanced querying for the ontology system.
 */

import { v } from "convex/values";
import { query, mutation, QueryCtx, MutationCtx } from "./_generated/server";
import { requireAuthenticatedUser } from "./rbacHelpers";

/**
 * Check if user is a super admin
 */
async function requireSuperAdmin(ctx: QueryCtx | MutationCtx, sessionId: string) {
  const { userId } = await requireAuthenticatedUser(ctx, sessionId);

  const user = await ctx.db.get(userId);
  if (!user) {
    throw new Error("User not found");
  }

  // Check if user has global super admin role
  let isSuperAdmin = false;
  if (user.global_role_id) {
    const role = await ctx.db.get(user.global_role_id);
    if (role && role.name === "super_admin") {
      isSuperAdmin = true;
    }
  }

  if (!isSuperAdmin) {
    throw new Error("Access denied: Super admin privileges required");
  }

  return { userId, user };
}

/**
 * Get all objects with filtering and pagination
 */
export const getAllObjects = query({
  args: {
    sessionId: v.string(),
    organizationId: v.optional(v.id("organizations")),
    type: v.optional(v.string()),
    subtype: v.optional(v.string()),
    status: v.optional(v.string()),
    search: v.optional(v.string()),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx, args.sessionId);

    // Build query - filter by organization first if specified
    let results;
    if (args.organizationId) {
      results = await ctx.db
        .query("objects")
        .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId!))
        .collect();
    } else if (args.type && args.subtype) {
      results = await ctx.db
        .query("objects")
        .withIndex("by_type_subtype", (q) =>
          q.eq("type", args.type!).eq("subtype", args.subtype!)
        )
        .collect();
    } else if (args.type) {
      results = await ctx.db
        .query("objects")
        .withIndex("by_type", (q) => q.eq("type", args.type!))
        .collect();
    } else {
      results = await ctx.db.query("objects").collect();
    }

    // Filter by status if specified
    if (args.status) {
      results = results.filter((obj) => obj.status === args.status);
    }

    // Search in name and description if specified
    if (args.search) {
      const searchLower = args.search.toLowerCase();
      results = results.filter(
        (obj) =>
          obj.name.toLowerCase().includes(searchLower) ||
          obj.description?.toLowerCase().includes(searchLower)
      );
    }

    // Sort by creation date (newest first)
    results.sort((a, b) => b.createdAt - a.createdAt);

    // Apply pagination
    const offset = args.offset || 0;
    const limit = args.limit || 50;
    const total = results.length;
    const paginatedResults = results.slice(offset, offset + limit);

    // Enrich with organization data
    const enrichedResults = await Promise.all(
      paginatedResults.map(async (obj) => {
        const org = await ctx.db.get(obj.organizationId);
        const creator = await ctx.db.get(obj.createdBy);
        return {
          ...obj,
          organization: org ? { id: org._id, name: org.name, slug: org.slug } : null,
          creator: creator ? { id: creator._id, email: creator.email, firstName: creator.firstName, lastName: creator.lastName } : null,
        };
      })
    );

    return {
      objects: enrichedResults,
      total,
      offset,
      limit,
      hasMore: offset + limit < total,
    };
  },
});

/**
 * Get a single object by ID with full details
 */
export const getObjectById = query({
  args: {
    sessionId: v.string(),
    objectId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx, args.sessionId);

    const object = await ctx.db.get(args.objectId);
    if (!object) {
      throw new Error("Object not found");
    }

    // Get organization
    const org = await ctx.db.get(object.organizationId);

    // Get creator
    const creator = await ctx.db.get(object.createdBy);

    // Get links
    const outgoingLinks = await ctx.db
      .query("objectLinks")
      .withIndex("by_from_object", (q) => q.eq("fromObjectId", args.objectId))
      .collect();

    const incomingLinks = await ctx.db
      .query("objectLinks")
      .withIndex("by_to_object", (q) => q.eq("toObjectId", args.objectId))
      .collect();

    // Enrich links with target object data
    const enrichedOutgoingLinks = await Promise.all(
      outgoingLinks.map(async (link) => {
        const targetObject = await ctx.db.get(link.toObjectId);
        return {
          ...link,
          targetObject: targetObject
            ? { id: targetObject._id, name: targetObject.name, type: targetObject.type, subtype: targetObject.subtype }
            : null,
        };
      })
    );

    const enrichedIncomingLinks = await Promise.all(
      incomingLinks.map(async (link) => {
        const sourceObject = await ctx.db.get(link.fromObjectId);
        return {
          ...link,
          sourceObject: sourceObject
            ? { id: sourceObject._id, name: sourceObject.name, type: sourceObject.type, subtype: sourceObject.subtype }
            : null,
        };
      })
    );

    // Get recent actions
    const actions = await ctx.db
      .query("objectActions")
      .withIndex("by_object", (q) => q.eq("objectId", args.objectId))
      .order("desc")
      .take(10);

    // Enrich actions with performer data
    const enrichedActions = await Promise.all(
      actions.map(async (action) => {
        const performer = await ctx.db.get(action.performedBy);
        return {
          ...action,
          performer: performer
            ? { id: performer._id, email: performer.email, firstName: performer.firstName, lastName: performer.lastName }
            : null,
        };
      })
    );

    return {
      ...object,
      organization: org ? { id: org._id, name: org.name, slug: org.slug } : null,
      creator: creator ? { id: creator._id, email: creator.email, firstName: creator.firstName, lastName: creator.lastName } : null,
      outgoingLinks: enrichedOutgoingLinks,
      incomingLinks: enrichedIncomingLinks,
      recentActions: enrichedActions,
    };
  },
});

/**
 * Get all unique object types and subtypes with counts
 */
export const getObjectTypes = query({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx, args.sessionId);

    const allObjects = await ctx.db.query("objects").collect();

    // Count by type and subtype, collect sample fields
    const typeData: Record<
      string,
      { count: number; subtypes: Set<string>; sampleFields: Set<string> }
    > = {};

    allObjects.forEach((obj) => {
      if (!typeData[obj.type]) {
        typeData[obj.type] = {
          count: 0,
          subtypes: new Set(),
          sampleFields: new Set(),
        };
      }
      typeData[obj.type].count++;

      if (obj.subtype) {
        typeData[obj.type].subtypes.add(obj.subtype);
      }

      // Collect field names from customProperties
      if (obj.customProperties) {
        Object.keys(obj.customProperties).forEach((key) => {
          typeData[obj.type].sampleFields.add(key);
        });
      }
    });

    // Convert to array format for frontend
    return Object.entries(typeData).map(([type, data]) => ({
      type,
      count: data.count,
      subtypes: Array.from(data.subtypes),
      sampleFields: Array.from(data.sampleFields),
    }));
  },
});

/**
 * Get statistics about objects
 */
export const getObjectStats = query({
  args: {
    sessionId: v.string(),
    organizationId: v.optional(v.id("organizations")),
  },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx, args.sessionId);

    const objects = args.organizationId
      ? await ctx.db
          .query("objects")
          .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId!))
          .collect()
      : await ctx.db.query("objects").collect();

    const stats = {
      total: objects.length,
      byStatus: {} as Record<string, number>,
      byType: {} as Record<string, number>,
      totalTypes: new Set(objects.map((o) => o.type)).size,
    };

    objects.forEach((obj) => {
      // Count by status
      if (!stats.byStatus[obj.status]) {
        stats.byStatus[obj.status] = 0;
      }
      stats.byStatus[obj.status]++;

      // Count by type
      if (!stats.byType[obj.type]) {
        stats.byType[obj.type] = 0;
      }
      stats.byType[obj.type]++;
    });

    return stats;
  },
});

/**
 * Get all organizations for filter dropdown
 */
export const getAllOrganizations = query({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx, args.sessionId);

    const organizations = await ctx.db.query("organizations").collect();

    return organizations.map((org) => ({
      id: org._id,
      name: org.name,
      slug: org.slug,
    }));
  },
});

/**
 * Create a new object
 */
export const createObject = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    type: v.string(),
    subtype: v.optional(v.string()),
    name: v.string(),
    description: v.optional(v.string()),
    status: v.string(),
    locale: v.optional(v.string()),
    value: v.optional(v.string()),
    customProperties: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireSuperAdmin(ctx, args.sessionId);

    const now = Date.now();

    const objectId = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: args.type,
      subtype: args.subtype,
      name: args.name,
      description: args.description,
      status: args.status,
      locale: args.locale,
      value: args.value,
      customProperties: args.customProperties,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    });

    // Log action
    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId,
      actionType: "create",
      actionData: { objectType: args.type },
      performedBy: userId,
      performedAt: now,
    });

    return { objectId };
  },
});

/**
 * Update an existing object
 */
export const updateObject = mutation({
  args: {
    sessionId: v.string(),
    objectId: v.id("objects"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(v.string()),
    locale: v.optional(v.string()),
    value: v.optional(v.string()),
    customProperties: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireSuperAdmin(ctx, args.sessionId);

    const object = await ctx.db.get(args.objectId);
    if (!object) {
      throw new Error("Object not found");
    }

    const updates: Record<string, unknown> = {
      updatedAt: Date.now(),
    };

    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;
    if (args.status !== undefined) updates.status = args.status;
    if (args.locale !== undefined) updates.locale = args.locale;
    if (args.value !== undefined) updates.value = args.value;
    if (args.customProperties !== undefined) updates.customProperties = args.customProperties;

    await ctx.db.patch(args.objectId, updates);

    // Log action
    await ctx.db.insert("objectActions", {
      organizationId: object.organizationId,
      objectId: args.objectId,
      actionType: "update",
      actionData: { updatedFields: Object.keys(updates) },
      performedBy: userId,
      performedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Delete an object (soft delete by setting status)
 */
export const deleteObject = mutation({
  args: {
    sessionId: v.string(),
    objectId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireSuperAdmin(ctx, args.sessionId);

    const object = await ctx.db.get(args.objectId);
    if (!object) {
      throw new Error("Object not found");
    }

    // Soft delete by updating status
    await ctx.db.patch(args.objectId, {
      status: "deleted",
      updatedAt: Date.now(),
    });

    // Log action
    await ctx.db.insert("objectActions", {
      organizationId: object.organizationId,
      objectId: args.objectId,
      actionType: "delete",
      actionData: {},
      performedBy: userId,
      performedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Create a link between two objects
 */
export const createLink = mutation({
  args: {
    sessionId: v.string(),
    fromObjectId: v.id("objects"),
    toObjectId: v.id("objects"),
    linkType: v.string(),
    properties: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireSuperAdmin(ctx, args.sessionId);

    const fromObject = await ctx.db.get(args.fromObjectId);
    const toObject = await ctx.db.get(args.toObjectId);

    if (!fromObject || !toObject) {
      throw new Error("One or both objects not found");
    }

    const linkId = await ctx.db.insert("objectLinks", {
      organizationId: fromObject.organizationId,
      fromObjectId: args.fromObjectId,
      toObjectId: args.toObjectId,
      linkType: args.linkType,
      properties: args.properties,
      createdBy: userId,
      createdAt: Date.now(),
    });

    // Log action
    await ctx.db.insert("objectActions", {
      organizationId: fromObject.organizationId,
      objectId: args.fromObjectId,
      actionType: "create_link",
      actionData: { linkType: args.linkType, toObjectId: args.toObjectId },
      performedBy: userId,
      performedAt: Date.now(),
    });

    return { linkId };
  },
});

/**
 * Delete a link between objects
 */
export const deleteLink = mutation({
  args: {
    sessionId: v.string(),
    linkId: v.id("objectLinks"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireSuperAdmin(ctx, args.sessionId);

    const link = await ctx.db.get(args.linkId);
    if (!link) {
      throw new Error("Link not found");
    }

    await ctx.db.delete(args.linkId);

    // Log action
    await ctx.db.insert("objectActions", {
      organizationId: link.organizationId,
      objectId: link.fromObjectId,
      actionType: "delete_link",
      actionData: { linkType: link.linkType, toObjectId: link.toObjectId },
      performedBy: userId,
      performedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Get field configuration for an object type
 */
export const getFieldConfiguration = query({
  args: {
    sessionId: v.string(),
    objectType: v.string(),
    organizationId: v.optional(v.id("organizations")),
  },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx, args.sessionId);

    // Look for a field_config object for this type + org combo
    const configObject = await ctx.db
      .query("objects")
      .filter((q) =>
        q.and(
          q.eq(q.field("type"), "organization_settings"),
          q.eq(q.field("subtype"), "field_config"),
          q.eq(q.field("name"), args.objectType),
          args.organizationId
            ? q.eq(q.field("organizationId"), args.organizationId)
            : q.eq(q.field("organizationId"), undefined) // Global config has no org
        )
      )
      .first();

    if (!configObject) {
      return {
        objectType: args.objectType,
        organizationId: args.organizationId || null,
        visibleFields: [], // Default: no fields configured yet
        hiddenFields: [],
      };
    }

    const visibleFields = (configObject.customProperties?.visibleFields as string[]) || [];
    const hiddenFields = (configObject.customProperties?.hiddenFields as string[]) || [];

    return {
      objectType: args.objectType,
      organizationId: args.organizationId || null,
      visibleFields,
      hiddenFields,
      configObjectId: configObject._id,
    };
  },
});

/**
 * Save field configuration for an object type
 */
export const saveFieldConfiguration = mutation({
  args: {
    sessionId: v.string(),
    objectType: v.string(),
    organizationId: v.optional(v.id("organizations")),
    visibleFields: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireSuperAdmin(ctx, args.sessionId);

    // Check if config object already exists
    const existingConfig = await ctx.db
      .query("objects")
      .filter((q) =>
        q.and(
          q.eq(q.field("type"), "organization_settings"),
          q.eq(q.field("subtype"), "field_config"),
          q.eq(q.field("name"), args.objectType),
          args.organizationId
            ? q.eq(q.field("organizationId"), args.organizationId)
            : q.eq(q.field("organizationId"), undefined)
        )
      )
      .first();

    const configData = {
      visibleFields: args.visibleFields,
      hiddenFields: [], // Can calculate this later if needed
      scope: args.organizationId ? "organization" : "global",
    };

    if (existingConfig) {
      // Update existing config
      await ctx.db.patch(existingConfig._id, {
        customProperties: configData,
        updatedAt: Date.now(),
      });

      // Log action (only if we have an organizationId)
      if (existingConfig.organizationId) {
        await ctx.db.insert("objectActions", {
          organizationId: existingConfig.organizationId,
          objectId: existingConfig._id,
          actionType: "update",
          actionData: { updatedFields: ["customProperties"] },
          performedBy: userId,
          performedAt: Date.now(),
        });
      }

      return { success: true, configObjectId: existingConfig._id };
    } else {
      // Create new config object
      // Need to determine which org to assign (global = system org)
      let targetOrgId = args.organizationId;

      if (!targetOrgId) {
        // Global config - use system org
        const systemOrg = await ctx.db
          .query("organizations")
          .filter((q) => q.eq(q.field("slug"), "system"))
          .first();

        if (!systemOrg) {
          throw new Error("System organization not found - run seedOntologyData first");
        }
        targetOrgId = systemOrg._id;
      }

      const configObjectId = await ctx.db.insert("objects", {
        organizationId: targetOrgId,
        type: "organization_settings",
        subtype: "field_config",
        name: args.objectType,
        description: `Field configuration for ${args.objectType}`,
        status: "active",
        locale: "en",
        customProperties: configData,
        createdBy: userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Log action
      await ctx.db.insert("objectActions", {
        organizationId: targetOrgId,
        objectId: configObjectId,
        actionType: "create",
        actionData: { objectType: args.objectType },
        performedBy: userId,
        performedAt: Date.now(),
      });

      return { success: true, configObjectId };
    }
  },
});
