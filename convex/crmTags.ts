/**
 * CRM TAGS SYSTEM
 *
 * Manages tags for CRM contacts and organizations.
 * Tags are separate from pipeline stages and provide flexible classification.
 *
 * Use Cases:
 * - "Sponsor" tag for organizations that might become sponsors
 * - "VIP" tag for high-value contacts
 * - "Newsletter" tag for contacts who opted in
 * - Custom categories for filtering and segmentation
 *
 * Implementation:
 * - Tags are stored in customProperties.tags as string arrays
 * - No separate tags table - tags are ad-hoc and user-defined
 * - Filtering happens via array intersection queries
 */

import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAuthenticatedUser } from "./rbacHelpers";

// ============================================================================
// TAG QUERIES
// ============================================================================

/**
 * GET ALL TAGS
 * Returns all unique tags used across contacts and organizations
 */
export const getAllTags = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    entityType: v.optional(v.union(v.literal("contact"), v.literal("organization"), v.literal("both"))),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const entityType = args.entityType || "both";
    const tagSet = new Set<string>();

    // Get tags from contacts
    if (entityType === "contact" || entityType === "both") {
      const contacts = await ctx.db
        .query("objects")
        .withIndex("by_org_type", (q) =>
          q.eq("organizationId", args.organizationId).eq("type", "crm_contact")
        )
        .collect();

      for (const contact of contacts) {
        const tags = (contact.customProperties as { tags?: string[] })?.tags || [];
        tags.forEach((tag) => tagSet.add(tag));
      }
    }

    // Get tags from organizations
    if (entityType === "organization" || entityType === "both") {
      const organizations = await ctx.db
        .query("objects")
        .withIndex("by_org_type", (q) =>
          q.eq("organizationId", args.organizationId).eq("type", "crm_organization")
        )
        .collect();

      for (const org of organizations) {
        const tags = (org.customProperties as { tags?: string[] })?.tags || [];
        tags.forEach((tag) => tagSet.add(tag));
      }
    }

    // Convert set to sorted array
    return Array.from(tagSet).sort((a, b) => a.localeCompare(b));
  },
});

/**
 * GET ENTITIES BY TAG
 * Returns all contacts or organizations with a specific tag
 */
export const getEntitiesByTag = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    tag: v.string(),
    entityType: v.union(v.literal("contact"), v.literal("organization")),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const type = args.entityType === "contact" ? "crm_contact" : "crm_organization";

    const entities = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", type)
      )
      .collect();

    // Filter by tag
    return entities.filter((entity) => {
      const tags = (entity.customProperties as { tags?: string[] })?.tags || [];
      return tags.includes(args.tag);
    });
  },
});

/**
 * GET TAG STATISTICS
 * Returns tag usage counts for analytics
 */
export const getTagStatistics = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    entityType: v.optional(v.union(v.literal("contact"), v.literal("organization"), v.literal("both"))),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const entityType = args.entityType || "both";
    const tagCounts = new Map<string, { contacts: number; organizations: number }>();

    // Count tags from contacts
    if (entityType === "contact" || entityType === "both") {
      const contacts = await ctx.db
        .query("objects")
        .withIndex("by_org_type", (q) =>
          q.eq("organizationId", args.organizationId).eq("type", "crm_contact")
        )
        .collect();

      for (const contact of contacts) {
        const tags = (contact.customProperties as { tags?: string[] })?.tags || [];
        tags.forEach((tag) => {
          const current = tagCounts.get(tag) || { contacts: 0, organizations: 0 };
          current.contacts++;
          tagCounts.set(tag, current);
        });
      }
    }

    // Count tags from organizations
    if (entityType === "organization" || entityType === "both") {
      const organizations = await ctx.db
        .query("objects")
        .withIndex("by_org_type", (q) =>
          q.eq("organizationId", args.organizationId).eq("type", "crm_organization")
        )
        .collect();

      for (const org of organizations) {
        const tags = (org.customProperties as { tags?: string[] })?.tags || [];
        tags.forEach((tag) => {
          const current = tagCounts.get(tag) || { contacts: 0, organizations: 0 };
          current.organizations++;
          tagCounts.set(tag, current);
        });
      }
    }

    // Convert to array with totals
    return Array.from(tagCounts.entries())
      .map(([tag, counts]) => ({
        tag,
        contactCount: counts.contacts,
        organizationCount: counts.organizations,
        totalCount: counts.contacts + counts.organizations,
      }))
      .sort((a, b) => b.totalCount - a.totalCount);
  },
});

// ============================================================================
// TAG MUTATIONS
// ============================================================================

/**
 * ADD TAGS TO ENTITY
 * Adds one or more tags to a contact or organization
 */
export const addTags = mutation({
  args: {
    sessionId: v.string(),
    entityId: v.id("objects"),
    tags: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .filter((q) => q.eq(q.field("_id"), args.sessionId))
      .first();

    if (!session) throw new Error("Invalid session");

    const entity = await ctx.db.get(args.entityId);
    if (!entity || (entity.type !== "crm_contact" && entity.type !== "crm_organization")) {
      throw new Error("Entity not found");
    }

    // Get current tags
    const currentTags = (entity.customProperties as { tags?: string[] })?.tags || [];

    // Merge with new tags (deduplicate)
    const newTagsSet = new Set([...currentTags, ...args.tags]);
    const newTags = Array.from(newTagsSet).sort((a, b) => a.localeCompare(b));

    // Update entity
    await ctx.db.patch(args.entityId, {
      customProperties: {
        ...entity.customProperties,
        tags: newTags,
      },
      updatedAt: Date.now(),
    });

    // Log action
    await ctx.db.insert("objectActions", {
      organizationId: entity.organizationId,
      objectId: args.entityId,
      actionType: "tags_added",
      actionData: {
        addedTags: args.tags,
        previousTags: currentTags,
        newTags,
      },
      performedBy: session.userId,
      performedAt: Date.now(),
    });

    return newTags;
  },
});

/**
 * REMOVE TAGS FROM ENTITY
 * Removes one or more tags from a contact or organization
 */
export const removeTags = mutation({
  args: {
    sessionId: v.string(),
    entityId: v.id("objects"),
    tags: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .filter((q) => q.eq(q.field("_id"), args.sessionId))
      .first();

    if (!session) throw new Error("Invalid session");

    const entity = await ctx.db.get(args.entityId);
    if (!entity || (entity.type !== "crm_contact" && entity.type !== "crm_organization")) {
      throw new Error("Entity not found");
    }

    // Get current tags
    const currentTags = (entity.customProperties as { tags?: string[] })?.tags || [];

    // Remove specified tags
    const newTags = currentTags.filter((tag) => !args.tags.includes(tag));

    // Update entity
    await ctx.db.patch(args.entityId, {
      customProperties: {
        ...entity.customProperties,
        tags: newTags,
      },
      updatedAt: Date.now(),
    });

    // Log action
    await ctx.db.insert("objectActions", {
      organizationId: entity.organizationId,
      objectId: args.entityId,
      actionType: "tags_removed",
      actionData: {
        removedTags: args.tags,
        previousTags: currentTags,
        newTags,
      },
      performedBy: session.userId,
      performedAt: Date.now(),
    });

    return newTags;
  },
});

/**
 * SET TAGS ON ENTITY
 * Replaces all tags on a contact or organization
 */
export const setTags = mutation({
  args: {
    sessionId: v.string(),
    entityId: v.id("objects"),
    tags: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .filter((q) => q.eq(q.field("_id"), args.sessionId))
      .first();

    if (!session) throw new Error("Invalid session");

    const entity = await ctx.db.get(args.entityId);
    if (!entity || (entity.type !== "crm_contact" && entity.type !== "crm_organization")) {
      throw new Error("Entity not found");
    }

    // Get current tags
    const currentTags = (entity.customProperties as { tags?: string[] })?.tags || [];

    // Deduplicate and sort new tags
    const newTags = Array.from(new Set(args.tags)).sort((a, b) => a.localeCompare(b));

    // Update entity
    await ctx.db.patch(args.entityId, {
      customProperties: {
        ...entity.customProperties,
        tags: newTags,
      },
      updatedAt: Date.now(),
    });

    // Log action
    await ctx.db.insert("objectActions", {
      organizationId: entity.organizationId,
      objectId: args.entityId,
      actionType: "tags_updated",
      actionData: {
        previousTags: currentTags,
        newTags,
      },
      performedBy: session.userId,
      performedAt: Date.now(),
    });

    return newTags;
  },
});

/**
 * RENAME TAG
 * Renames a tag across all entities in an organization
 */
export const renameTag = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    oldTag: v.string(),
    newTag: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .filter((q) => q.eq(q.field("_id"), args.sessionId))
      .first();

    if (!session) throw new Error("Invalid session");

    let updatedCount = 0;

    // Update contacts
    const contacts = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "crm_contact")
      )
      .collect();

    for (const contact of contacts) {
      const tags = (contact.customProperties as { tags?: string[] })?.tags || [];
      if (tags.includes(args.oldTag)) {
        const newTags = tags.map((tag) => (tag === args.oldTag ? args.newTag : tag));
        await ctx.db.patch(contact._id, {
          customProperties: {
            ...contact.customProperties,
            tags: newTags,
          },
          updatedAt: Date.now(),
        });
        updatedCount++;
      }
    }

    // Update organizations
    const organizations = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "crm_organization")
      )
      .collect();

    for (const org of organizations) {
      const tags = (org.customProperties as { tags?: string[] })?.tags || [];
      if (tags.includes(args.oldTag)) {
        const newTags = tags.map((tag) => (tag === args.oldTag ? args.newTag : tag));
        await ctx.db.patch(org._id, {
          customProperties: {
            ...org.customProperties,
            tags: newTags,
          },
          updatedAt: Date.now(),
        });
        updatedCount++;
      }
    }

    return { updatedCount };
  },
});

/**
 * DELETE TAG
 * Removes a tag from all entities in an organization
 */
export const deleteTag = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    tag: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .filter((q) => q.eq(q.field("_id"), args.sessionId))
      .first();

    if (!session) throw new Error("Invalid session");

    let updatedCount = 0;

    // Remove from contacts
    const contacts = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "crm_contact")
      )
      .collect();

    for (const contact of contacts) {
      const tags = (contact.customProperties as { tags?: string[] })?.tags || [];
      if (tags.includes(args.tag)) {
        const newTags = tags.filter((t) => t !== args.tag);
        await ctx.db.patch(contact._id, {
          customProperties: {
            ...contact.customProperties,
            tags: newTags,
          },
          updatedAt: Date.now(),
        });
        updatedCount++;
      }
    }

    // Remove from organizations
    const organizations = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "crm_organization")
      )
      .collect();

    for (const org of organizations) {
      const tags = (org.customProperties as { tags?: string[] })?.tags || [];
      if (tags.includes(args.tag)) {
        const newTags = tags.filter((t) => t !== args.tag);
        await ctx.db.patch(org._id, {
          customProperties: {
            ...org.customProperties,
            tags: newTags,
          },
          updatedAt: Date.now(),
        });
        updatedCount++;
      }
    }

    return { updatedCount };
  },
});
