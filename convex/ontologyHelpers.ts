/**
 * ONTOLOGY HELPERS
 *
 * Universal CRUD operations that work for ANY object type.
 * This is the foundation for all data operations in the system.
 */

import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * GET OBJECTS
 * Query objects by type/subtype with optional filters
 */
export const getObjects = query({
  args: {
    organizationId: v.id("organizations"),
    type: v.string(),
    subtype: v.optional(v.string()),
    filters: v.optional(v.record(v.string(), v.any())),
  },
  handler: async (ctx, args) => {
    const baseQuery = ctx.db
      .query("objects")
      .withIndex("by_org_type", q =>
        q.eq("organizationId", args.organizationId)
         .eq("type", args.type)
      );

    const q = args.subtype
      ? baseQuery.filter(q => q.eq(q.field("subtype"), args.subtype))
      : baseQuery;

    const objects = await q.collect();

    // Apply custom filters
    if (args.filters) {
      return objects.filter(obj => {
        return Object.entries(args.filters!).every(([key, value]) => {
          // Check top-level fields first
          if (obj[key as keyof typeof obj] !== undefined) {
            return obj[key as keyof typeof obj] === value;
          }
          // Then check customProperties
          return obj.customProperties?.[key] === value;
        });
      });
    }

    return objects;
  },
});

/**
 * GET OBJECT
 * Get a single object by ID
 */
export const getObject = query({
  args: { objectId: v.id("objects") },
  handler: async (ctx, { objectId }) => {
    return await ctx.db.get(objectId);
  },
});

/**
 * CREATE OBJECT
 * Create a new object of any type
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
    customProperties: v.optional(v.record(v.string(), v.any())),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .filter(q => q.eq(q.field("_id"), args.sessionId))
      .first();

    if (!session) throw new Error("Invalid session");

    return await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: args.type,
      subtype: args.subtype,
      name: args.name,
      description: args.description,
      status: args.status,
      locale: args.locale,
      value: args.value,
      customProperties: args.customProperties,
      createdBy: session.userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

/**
 * UPDATE OBJECT
 * Update an existing object
 */
export const updateObject = mutation({
  args: {
    sessionId: v.string(),
    objectId: v.id("objects"),
    updates: v.object({
      name: v.optional(v.string()),
      description: v.optional(v.string()),
      status: v.optional(v.string()),
      value: v.optional(v.string()),
      customProperties: v.optional(v.record(v.string(), v.any())),
    }),
  },
  handler: async (ctx, { objectId, updates }) => {
    await ctx.db.patch(objectId, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});

/**
 * DELETE OBJECT
 * Delete an object and all its links
 */
export const deleteObject = mutation({
  args: {
    sessionId: v.string(),
    objectId: v.id("objects"),
  },
  handler: async (ctx, { objectId }) => {
    // Delete all links involving this object
    const fromLinks = await ctx.db
      .query("objectLinks")
      .withIndex("by_from_object", q => q.eq("fromObjectId", objectId))
      .collect();

    const toLinks = await ctx.db
      .query("objectLinks")
      .withIndex("by_to_object", q => q.eq("toObjectId", objectId))
      .collect();

    for (const link of [...fromLinks, ...toLinks]) {
      await ctx.db.delete(link._id);
    }

    // Delete the object
    await ctx.db.delete(objectId);
  },
});

/**
 * GET LINKED OBJECTS
 * Find all objects linked to a given object
 */
export const getLinkedObjects = query({
  args: {
    objectId: v.id("objects"),
    linkType: v.optional(v.string()),
    direction: v.union(v.literal("from"), v.literal("to"), v.literal("both")),
  },
  handler: async (ctx, { objectId, linkType, direction }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const links: any[] = [];

    if (direction === "from" || direction === "both") {
      const fromLinks = await ctx.db
        .query("objectLinks")
        .withIndex("by_from_object", q => q.eq("fromObjectId", objectId))
        .collect();

      if (linkType) {
        links.push(...fromLinks.filter(l => l.linkType === linkType));
      } else {
        links.push(...fromLinks);
      }
    }

    if (direction === "to" || direction === "both") {
      const toLinks = await ctx.db
        .query("objectLinks")
        .withIndex("by_to_object", q => q.eq("toObjectId", objectId))
        .collect();

      if (linkType) {
        links.push(...toLinks.filter(l => l.linkType === linkType));
      } else {
        links.push(...toLinks);
      }
    }

    // Resolve linked objects
    return await Promise.all(
      links.map(async link => {
        const targetId = link.fromObjectId === objectId
          ? link.toObjectId
          : link.fromObjectId;

        const targetObject = await ctx.db.get(targetId);

        return {
          link,
          object: targetObject,
        };
      })
    );
  },
});

/**
 * CREATE LINK
 * Create a relationship between two objects
 */
export const createLink = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    fromObjectId: v.id("objects"),
    toObjectId: v.id("objects"),
    linkType: v.string(),
    properties: v.optional(v.record(v.string(), v.any())),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .filter(q => q.eq(q.field("_id"), args.sessionId))
      .first();

    if (!session) throw new Error("Invalid session");

    return await ctx.db.insert("objectLinks", {
      organizationId: args.organizationId,
      fromObjectId: args.fromObjectId,
      toObjectId: args.toObjectId,
      linkType: args.linkType,
      properties: args.properties,
      createdBy: session.userId,
      createdAt: Date.now(),
    });
  },
});

/**
 * DELETE LINK
 * Remove a relationship between objects
 */
export const deleteLink = mutation({
  args: {
    sessionId: v.string(),
    linkId: v.id("objectLinks"),
  },
  handler: async (ctx, { linkId }) => {
    await ctx.db.delete(linkId);
  },
});

/**
 * LOG ACTION
 * Record an action performed on an object
 */
export const logAction = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    objectId: v.id("objects"),
    actionType: v.string(),
    actionData: v.optional(v.record(v.string(), v.any())),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .filter(q => q.eq(q.field("_id"), args.sessionId))
      .first();

    if (!session) throw new Error("Invalid session");

    return await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: args.objectId,
      actionType: args.actionType,
      actionData: args.actionData,
      performedBy: session.userId,
      performedAt: Date.now(),
    });
  },
});

/**
 * GET ACTIONS
 * Get action history for an object
 */
export const getActions = query({
  args: {
    objectId: v.id("objects"),
    actionType: v.optional(v.string()),
  },
  handler: async (ctx, { objectId, actionType }) => {
    const q = ctx.db
      .query("objectActions")
      .withIndex("by_object", q => q.eq("objectId", objectId));

    const actions = await q.collect();

    if (actionType) {
      return actions.filter(a => a.actionType === actionType);
    }

    return actions;
  },
});
